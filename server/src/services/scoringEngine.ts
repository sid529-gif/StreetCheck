import { prisma } from '../db/prisma.js'
import { computeSafetyScore, getSafetyBand, SCORING_VERSION } from '@streetcheck/shared'

// ── Score recalculation ───────────────────────────────────────────────────────

/**
 * Recalculates and persists safety_score + safety_band for a single segment.
 * Called after:
 *   - New hazard report submitted
 *   - OSM data refresh completes
 *   - Manual admin override of score inputs
 */
export async function recalculateSegmentScore(segmentId: string): Promise<void> {
  const segment = await prisma.roadSegment.findUniqueOrThrow({
    where: { id: segmentId },
    select: {
      lightingScore: true,
      accidentRate: true,
      floodRisk: true,
      surfaceQuality: true,
      walkabilityScore: true,
      activeReports: true,
    },
  })

  // Apply a small active-report penalty: each active report reduces score by 0.02 (capped at 0.2)
  const reportPenalty = Math.min(segment.activeReports * 0.02, 0.2)

  const rawScore = computeSafetyScore({
    lightingScore: segment.lightingScore,
    accidentRate: segment.accidentRate,
    floodRisk: segment.floodRisk,
    surfaceQuality: segment.surfaceQuality,
    walkabilityScore: segment.walkabilityScore,
  })

  const safetyScore = Math.max(0, rawScore - reportPenalty)
  const safetyBand = getSafetyBand(safetyScore)

  await prisma.roadSegment.update({
    where: { id: segmentId },
    data: {
      safetyScore,
      safetyBand,
      scoringVersion: SCORING_VERSION,
    },
  })
}

/**
 * Batch recalculate scores for all segments.
 * Used after a full OSM refresh.
 */
export async function recalculateAllScores(): Promise<void> {
  const segments = await prisma.roadSegment.findMany({
    select: { id: true },
  })

  // Process in batches to avoid overloading the DB
  const BATCH_SIZE = 500
  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map((s) => recalculateSegmentScore(s.id)))
  }
}

/**
 * Convenience alias — classify a 0–1 score into a safety band string.
 * Exported from scoring weights; re-exported here for router convenience.
 */
export { getSafetyBand }
