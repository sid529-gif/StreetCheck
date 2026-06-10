# Data Model: StreetCheck v1

**Created**: 2026-06-10 | **Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Entity Relationship Overview

```
road_segments (1) ──────────────── (N) hazard_reports
road_segments (1) ──────────────── (N) data_refresh_log  [via source tag]
```

All relationships are enforced at the database level. There are no user accounts — `hazard_reports` uses an anonymous `reporter_token` (UUID generated client-side).

---

## Table: `road_segments`

The central entity. Represents a single OSM way (or sub-divided section thereof) as a navigable road segment in Hyderabad.

### Schema

```sql
CREATE TABLE road_segments (
  -- Identity
  segment_id            TEXT        PRIMARY KEY,
    -- Format: "hyd_{osm_way_id}_{optional_index}"
    -- Example: "hyd_12345678" or "hyd_12345678_2" for split ways
  osm_way_id            BIGINT,
    -- OSM way ID. NULL for synthetically created segments (e.g., MoRTH geocoded intersections)
  name                  TEXT,
    -- Human-readable road name from OSM name tag. May be NULL.

  -- Spatial
  geometry              GEOMETRY(LINESTRING, 4326)  NOT NULL,
    -- WGS84 LineString. SRID 4326. Required for PostGIS spatial queries.
    -- Indexed via GiST index below.

  -- Safety Score Inputs (all normalised to [0.0, 1.0])
  lighting_score        FLOAT       NOT NULL DEFAULT 0.5,
    -- 0 = no lighting, 1 = fully lit. Derived from OSM lit= tag.
    -- lit=yes → 1.0 | lit=no → 0.0 | absent → 0.5 (neutral default)

  accident_rate         FLOAT       NOT NULL DEFAULT 0.0,
    -- Normalised accident frequency. 0 = no accidents, 1 = maximum in dataset.
    -- Populated from MoRTH seed data. Default 0 (unknown = assume no accident history)

  flood_risk            FLOAT       NOT NULL DEFAULT 0.0,
    -- Flood/waterlogging risk. 0 = no risk, 1 = high risk.
    -- Populated from HYDRAA shapefile ST_Intersects. Default 0.
    -- Overridden temporarily by active waterlogging citizen reports (+0.3, capped at 1.0)

  surface_quality       FLOAT       NOT NULL DEFAULT 0.5,
    -- Road surface condition. 0 = very poor, 1 = excellent.
    -- Derived from OSM surface= tag:
    -- asphalt/paved → 0.9 | concrete → 0.85 | sett → 0.7 | unpaved → 0.3 | absent → 0.5

  walkability_score     FLOAT       NOT NULL DEFAULT 0.5,
    -- Pedestrian accessibility. 0 = no footpath, 1 = continuous footpath.
    -- Derived from OSM footway=, sidewalk= tags.
    -- sidewalk=both → 1.0 | sidewalk=left/right → 0.6 | footway → 0.8 | absent → 0.3

  -- Computed Safety Score (generated columns — do NOT update manually)
  safety_score          FLOAT       GENERATED ALWAYS AS (
                          ROUND((
                            0.30 * lighting_score
                            + 0.25 * (1.0 - accident_rate)
                            + 0.20 * (1.0 - flood_risk)
                            + 0.15 * surface_quality
                            + 0.10 * walkability_score
                          )::NUMERIC, 4)
                        ) STORED,
    -- Range: [0.0000, 1.0000] — multiply by 100 for display score

  safety_band           TEXT        GENERATED ALWAYS AS (
                          CASE
                            WHEN (0.30 * lighting_score + 0.25 * (1.0 - accident_rate) + 0.20 * (1.0 - flood_risk) + 0.15 * surface_quality + 0.10 * walkability_score) >= 0.75 THEN 'green'
                            WHEN (0.30 * lighting_score + 0.25 * (1.0 - accident_rate) + 0.20 * (1.0 - flood_risk) + 0.15 * surface_quality + 0.10 * walkability_score) >= 0.45 THEN 'amber'
                            ELSE 'red'
                          END
                        ) STORED,
    -- Values: 'green' | 'amber' | 'red'

  -- Metadata
  scoring_version       INTEGER     NOT NULL DEFAULT 1,
    -- Incremented when scoring formula changes. Used to invalidate cached scores.

  active_report_count   INTEGER     NOT NULL DEFAULT 0,
    -- Denormalised count of active hazard_reports. Updated transactionally with report insert/expire.

  last_updated          TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Timestamp of last score or geometry update.

  data_sources          TEXT[]      NOT NULL DEFAULT '{}',
    -- Array of source tags that contributed to this segment's scores.
    -- Values: 'osm' | 'morth_2024' | 'hydraa_2026' | 'user_report'
    -- Example: '{"osm", "morth_2024"}'
);

-- GiST spatial index (required for ST_Intersects, ST_DWithin, ST_Within)
CREATE INDEX road_segments_geometry_idx ON road_segments USING GIST(geometry);

-- Index for graphology graph load (full table scan, but ordered by osm_way_id for consistency)
CREATE INDEX road_segments_osm_idx ON road_segments(osm_way_id);
```

### Segment ID Convention

| Scenario | Format | Example |
|---|---|---|
| Normal OSM way | `hyd_{osm_way_id}` | `hyd_12345678` |
| Split OSM way (long road) | `hyd_{osm_way_id}_{index}` | `hyd_12345678_2` |
| MoRTH geocoded black spot | `hyd_morth_{uuid_prefix}` | `hyd_morth_a3f2` |

---

## Table: `hazard_reports`

Citizen-submitted safety hazard reports. Each report is linked to a road segment and carries a temporary score penalty.

### Schema

```sql
CREATE TABLE hazard_reports (
  report_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  segment_id        TEXT        NOT NULL REFERENCES road_segments(segment_id) ON DELETE CASCADE,
    -- May reference a "snap" segment — the nearest segment within 100m of the tap point

  hazard_type       TEXT        NOT NULL,
    -- Enum-like constraint. Exactly one of:
    CONSTRAINT hazard_type_valid CHECK (hazard_type IN (
      'pothole',
      'broken_streetlight',
      'waterlogging',
      'construction_debris',
      'stray_animals',
      'broken_footpath',
      'open_manhole'
    )),

  description       TEXT,
    -- Optional free-text from the user. Max 500 chars. Passed to NLP classifier.

  photo_url         TEXT,
    -- Optional Cloudinary secure URL. Passed to CV pipeline if present.

  ai_suggested_type TEXT,
    -- The hazard type returned by the AI pipeline (NLP or CV) before user confirmation.
    -- NULL if AI was not invoked or returned low confidence.

  confirmed_type    TEXT        NOT NULL,
    -- The type the user actually confirmed (may differ from ai_suggested_type).
    -- This is the authoritative type for score computation.

  severity_weight   FLOAT       NOT NULL DEFAULT 0.5,
    -- Score penalty magnitude. Set based on confirmed_type:
    -- pothole → 0.2 | broken_streetlight → 0.25 | waterlogging → 0.3
    -- construction_debris → 0.175 | stray_animals → 0.1
    -- broken_footpath → 0.25 | open_manhole → 0.3

  reporter_token    TEXT        NOT NULL,
    -- Anonymous UUID from client localStorage. Used for rate limiting only.
    -- NOT stored in any user table. NOT linked to any identity.

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
    -- Set to FALSE by expiry cron job when expires_at < now()

  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
    -- High severity (severity_weight >= 0.8): extended to 72 hours by application logic
);

CREATE INDEX hazard_reports_segment_active_idx ON hazard_reports(segment_id, is_active);
  -- Primary lookup: all active reports for a segment

CREATE INDEX hazard_reports_expires_idx ON hazard_reports(expires_at) WHERE is_active = TRUE;
  -- Used by expiry cron: WHERE is_active = TRUE AND expires_at < now()

CREATE INDEX hazard_reports_bbox_idx ON hazard_reports(created_at DESC);
  -- Used for recent reports listing
```

### Hazard Type → Score Dimension Mapping

| hazard_type | Dimension Penalised | severity_weight | Effect |
|---|---|---|---|
| `pothole` | `surface_quality` | 0.20 | Subtract 0.20 from surface_quality (min 0) |
| `broken_streetlight` | `lighting_score` | 0.25 | Subtract 0.25 from lighting_score (min 0) |
| `waterlogging` | `flood_risk` | 0.30 | Add 0.30 to flood_risk (max 1) |
| `construction_debris` | `surface_quality` + `walkability_score` | 0.15 + 0.10 | Both dimensions penalised |
| `stray_animals` | `walkability_score` | 0.10 | Subtract 0.10 from walkability_score |
| `broken_footpath` | `walkability_score` | 0.25 | Subtract 0.25 from walkability_score |
| `open_manhole` | `surface_quality` | 0.30 | Subtract 0.30 from surface_quality |

> **Important**: Report penalties are computed as **runtime overrides** on base values — base values in `road_segments` are never mutated by citizen reports. The scoring engine computes effective sub-scores as: `effective_score = clamp(base_score + Σ(active_penalties), 0, 1)`

---

## Table: `data_refresh_log`

Audit trail for all automated data ingestion runs.

### Schema

```sql
CREATE TABLE data_refresh_log (
  id                SERIAL      PRIMARY KEY,
  source            TEXT        NOT NULL,
    CONSTRAINT source_valid CHECK (source IN (
      'osm',          -- Overpass API poll
      'telangana',    -- Telangana Open Data portal
      'hydraa',       -- HYDRAA shapefile check
      'morth',        -- MoRTH accident CSV (manual seed)
      'user_report'   -- Score update triggered by citizen report
    )),
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  segments_updated  INTEGER     NOT NULL DEFAULT 0,
  status            TEXT        NOT NULL,
    CONSTRAINT status_valid CHECK (status IN ('success', 'partial', 'failed')),
  error_message     TEXT,
    -- NULL on success; populated with error details on 'partial' or 'failed'
  duration_ms       INTEGER
    -- Duration of the fetch operation in milliseconds
);

CREATE INDEX data_refresh_log_source_idx ON data_refresh_log(source, fetched_at DESC);
```

---

## Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

model RoadSegment {
  segmentId          String   @id @map("segment_id")
  osmWayId           BigInt?  @map("osm_way_id")
  name               String?
  // geometry stored as raw PostGIS type — use $queryRaw for spatial queries
  lightingScore      Float    @default(0.5) @map("lighting_score")
  accidentRate       Float    @default(0.0) @map("accident_rate")
  floodRisk          Float    @default(0.0) @map("flood_risk")
  surfaceQuality     Float    @default(0.5) @map("surface_quality")
  walkabilityScore   Float    @default(0.5) @map("walkability_score")
  // safety_score and safety_band are GENERATED ALWAYS — read-only via Prisma
  scoringVersion     Int      @default(1) @map("scoring_version")
  activeReportCount  Int      @default(0) @map("active_report_count")
  lastUpdated        DateTime @default(now()) @map("last_updated")
  dataSources        String[] @map("data_sources")

  reports HazardReport[]

  @@map("road_segments")
}

model HazardReport {
  reportId        String   @id @default(uuid()) @map("report_id")
  segmentId       String   @map("segment_id")
  hazardType      String   @map("hazard_type")
  description     String?
  photoUrl        String?  @map("photo_url")
  aiSuggestedType String?  @map("ai_suggested_type")
  confirmedType   String   @map("confirmed_type")
  severityWeight  Float    @default(0.5) @map("severity_weight")
  reporterToken   String   @map("reporter_token")
  createdAt       DateTime @default(now()) @map("created_at")
  isActive        Boolean  @default(true) @map("is_active")
  expiresAt       DateTime @default(dbgenerated("now() + INTERVAL '24 hours'")) @map("expires_at")

  segment RoadSegment @relation(fields: [segmentId], references: [segmentId])

  @@index([segmentId, isActive])
  @@map("hazard_reports")
}

model DataRefreshLog {
  id               Int      @id @default(autoincrement())
  source           String
  fetchedAt        DateTime @default(now()) @map("fetched_at")
  segmentsUpdated  Int      @default(0) @map("segments_updated")
  status           String
  errorMessage     String?  @map("error_message")
  durationMs       Int?     @map("duration_ms")

  @@map("data_refresh_log")
}
```

---

## OSM Tag → Score Mapping Reference

| OSM Tag | Value | Dimension | Score |
|---|---|---|---|
| `lit` | `yes` | lighting_score | 1.0 |
| `lit` | `no` | lighting_score | 0.0 |
| `lit` | absent | lighting_score | 0.5 |
| `surface` | `asphalt` | surface_quality | 0.9 |
| `surface` | `concrete` | surface_quality | 0.85 |
| `surface` | `paved` | surface_quality | 0.85 |
| `surface` | `sett` | surface_quality | 0.7 |
| `surface` | `compacted` | surface_quality | 0.6 |
| `surface` | `unpaved` | surface_quality | 0.3 |
| `surface` | `dirt` | surface_quality | 0.2 |
| `surface` | absent | surface_quality | 0.5 |
| `sidewalk` | `both` | walkability_score | 1.0 |
| `sidewalk` | `left` or `right` | walkability_score | 0.6 |
| `sidewalk` | `none` or `no` | walkability_score | 0.1 |
| `footway` | any | walkability_score | 0.8 |
| `sidewalk` | absent, no footway | walkability_score | 0.3 |
