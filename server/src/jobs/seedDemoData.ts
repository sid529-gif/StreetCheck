import { prisma } from '../db/prisma.js'
import { computeSafetyScore, getSafetyBand, SCORING_VERSION } from '@streetcheck/shared'
import { computeBbox } from '../db/geoQueries.js'

async function seedDemoData() {
  console.log('[seed-demo] Checking for existing demo data...')
  const existing = await prisma.roadSegment.findFirst({
    where: { name: { startsWith: '[DEMO]' } },
  })

  if (existing) {
    console.log('[seed-demo] Demo data already exists. Skipping seed.')
    return
  }

  console.log('[seed-demo] Seeding demo road segments...')

  const demoSegments = [
    // 5 Red Segments: unlit roads, broken surface, high accident rate
    {
      osmWayId: BigInt(-10001),
      name: '[DEMO] Tolichowki Underpass',
      coordinates: [
        [78.41, 17.4],
        [78.412, 17.402],
      ] as [number, number][],
      lightingScore: 0.1,
      accidentRate: 0.8,
      floodRisk: 0.9,
      surfaceQuality: 0.2,
      walkabilityScore: 0.1,
    },
    {
      osmWayId: BigInt(-10002),
      name: '[DEMO] Mehdipatnam Bridge Approach',
      coordinates: [
        [78.43, 17.39],
        [78.432, 17.392],
      ] as [number, number][],
      lightingScore: 0.2,
      accidentRate: 0.7,
      floodRisk: 0.6,
      surfaceQuality: 0.3,
      walkabilityScore: 0.2,
    },
    {
      osmWayId: BigInt(-10003),
      name: '[DEMO] Masab Tank Underpass',
      coordinates: [
        [78.45, 17.4],
        [78.452, 17.402],
      ] as [number, number][],
      lightingScore: 0.1,
      accidentRate: 0.85,
      floodRisk: 0.8,
      surfaceQuality: 0.15,
      walkabilityScore: 0.1,
    },
    {
      osmWayId: BigInt(-10004),
      name: '[DEMO] Attapur Ring Road Junction',
      coordinates: [
        [78.44, 17.37],
        [78.442, 17.372],
      ] as [number, number][],
      lightingScore: 0.2,
      accidentRate: 0.8,
      floodRisk: 0.7,
      surfaceQuality: 0.2,
      walkabilityScore: 0.15,
    },
    {
      osmWayId: BigInt(-10005),
      name: '[DEMO] Rethibowli Intersection',
      coordinates: [
        [78.42, 17.39],
        [78.422, 17.392],
      ] as [number, number][],
      lightingScore: 0.15,
      accidentRate: 0.75,
      floodRisk: 0.85,
      surfaceQuality: 0.25,
      walkabilityScore: 0.1,
    },
    // 5 Amber Segments: mixed conditions near Jubilee Hills, Film Nagar
    {
      osmWayId: BigInt(-10006),
      name: '[DEMO] Jubilee Hills Road No. 10',
      coordinates: [
        [78.405, 17.43],
        [78.407, 17.432],
      ] as [number, number][],
      lightingScore: 0.5,
      accidentRate: 0.4,
      floodRisk: 0.3,
      surfaceQuality: 0.6,
      walkabilityScore: 0.5,
    },
    {
      osmWayId: BigInt(-10007),
      name: '[DEMO] Film Nagar Main Road',
      coordinates: [
        [78.41, 17.415],
        [78.412, 17.417],
      ] as [number, number][],
      lightingScore: 0.6,
      accidentRate: 0.3,
      floodRisk: 0.2,
      surfaceQuality: 0.7,
      walkabilityScore: 0.4,
    },
    {
      osmWayId: BigInt(-10008),
      name: '[DEMO] Jubilee Hills Checkpost',
      coordinates: [
        [78.412, 17.425],
        [78.414, 17.427],
      ] as [number, number][],
      lightingScore: 0.55,
      accidentRate: 0.45,
      floodRisk: 0.35,
      surfaceQuality: 0.65,
      walkabilityScore: 0.55,
    },
    {
      osmWayId: BigInt(-10009),
      name: '[DEMO] Film Nagar Road No. 3',
      coordinates: [
        [78.418, 17.41],
        [78.42, 17.412],
      ] as [number, number][],
      lightingScore: 0.5,
      accidentRate: 0.35,
      floodRisk: 0.25,
      surfaceQuality: 0.55,
      walkabilityScore: 0.5,
    },
    {
      osmWayId: BigInt(-10010),
      name: '[DEMO] Jubilee Hills Road No. 5',
      coordinates: [
        [78.408, 17.428],
        [78.41, 17.43],
      ] as [number, number][],
      lightingScore: 0.6,
      accidentRate: 0.4,
      floodRisk: 0.3,
      surfaceQuality: 0.6,
      walkabilityScore: 0.6,
    },
    // 3 Green Segments: well-lit, smooth surface on Road No. 12, Road No. 36, Banjara Hills
    {
      osmWayId: BigInt(-10011),
      name: '[DEMO] Banjara Hills Road No. 12',
      coordinates: [
        [78.43, 17.41],
        [78.432, 17.412],
      ] as [number, number][],
      lightingScore: 0.9,
      accidentRate: 0.1,
      floodRisk: 0.1,
      surfaceQuality: 0.9,
      walkabilityScore: 0.8,
    },
    {
      osmWayId: BigInt(-10012),
      name: '[DEMO] Jubilee Hills Road No. 36',
      coordinates: [
        [78.4, 17.43],
        [78.402, 17.432],
      ] as [number, number][],
      lightingScore: 0.95,
      accidentRate: 0.05,
      floodRisk: 0.05,
      surfaceQuality: 0.95,
      walkabilityScore: 0.9,
    },
    {
      osmWayId: BigInt(-10013),
      name: '[DEMO] Banjara Hills Road No. 3',
      coordinates: [
        [78.435, 17.42],
        [78.437, 17.422],
      ] as [number, number][],
      lightingScore: 0.9,
      accidentRate: 0.1,
      floodRisk: 0.1,
      surfaceQuality: 0.9,
      walkabilityScore: 0.8,
    },
  ]

  const createdSegments: any[] = []
  for (const s of demoSegments) {
    const rawScore = computeSafetyScore({
      lightingScore: s.lightingScore,
      accidentRate: s.accidentRate,
      floodRisk: s.floodRisk,
      surfaceQuality: s.surfaceQuality,
      walkabilityScore: s.walkabilityScore,
    })
    const safetyBand = getSafetyBand(rawScore)
    const bbox = computeBbox(s.coordinates)

    const created = await prisma.roadSegment.create({
      data: {
        osmWayId: s.osmWayId,
        name: s.name,
        geometry: { type: 'LineString', coordinates: s.coordinates },
        bbox: bbox as any,
        lightingScore: s.lightingScore,
        accidentRate: s.accidentRate,
        floodRisk: s.floodRisk,
        surfaceQuality: s.surfaceQuality,
        walkabilityScore: s.walkabilityScore,
        safetyScore: rawScore,
        safetyBand,
        scoringVersion: SCORING_VERSION,
        activeReports: 0,
      },
    })
    createdSegments.push(created)
  }

  console.log(`[seed-demo] Created ${createdSegments.length} demo segments.`)

  // Find the created red segments for reports
  const tolichowki = createdSegments.find((s) => s.name === '[DEMO] Tolichowki Underpass')
  const mehdipatnam = createdSegments.find((s) => s.name === '[DEMO] Mehdipatnam Bridge Approach')

  if (tolichowki && mehdipatnam) {
    console.log('[seed-demo] Seeding active hazard reports on red segments...')

    // Pothole on Tolichowki
    const tolichowkiCentroid = {
      lat: (tolichowki.bbox.minLat + tolichowki.bbox.maxLat) / 2,
      lng: (tolichowki.bbox.minLng + tolichowki.bbox.maxLng) / 2,
    }
    await prisma.hazardReport.create({
      data: {
        anonymousToken: '00000000-0000-0000-0000-000000000001',
        segmentId: tolichowki.id,
        hazardType: 'pothole',
        severityWeight: 0.8,
        description: '[DEMO] Large deep pothole in middle of underpass lane.',
        lat: tolichowkiCentroid.lat,
        lng: tolichowkiCentroid.lng,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    })

    // Waterlogging on Mehdipatnam
    const mehdipatnamCentroid = {
      lat: (mehdipatnam.bbox.minLat + mehdipatnam.bbox.maxLat) / 2,
      lng: (mehdipatnam.bbox.minLng + mehdipatnam.bbox.maxLng) / 2,
    }
    await prisma.hazardReport.create({
      data: {
        anonymousToken: '00000000-0000-0000-0000-000000000002',
        segmentId: mehdipatnam.id,
        hazardType: 'waterlogging',
        severityWeight: 0.9,
        description: '[DEMO] Heavy waterlogging near bridge approach after rains.',
        lat: mehdipatnamCentroid.lat,
        lng: mehdipatnamCentroid.lng,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      },
    })

    // Update activeReports count on segments and recalculate their scores
    const { recalculateSegmentScore } = await import('../services/scoringEngine.js')

    await prisma.roadSegment.update({
      where: { id: tolichowki.id },
      data: { activeReports: 1 },
    })
    await recalculateSegmentScore(tolichowki.id)

    await prisma.roadSegment.update({
      where: { id: mehdipatnam.id },
      data: { activeReports: 1 },
    })
    await recalculateSegmentScore(mehdipatnam.id)

    console.log('[seed-demo] Demo hazard reports seeded and scores recalculated.')
  }

  console.log('[seed-demo] Demo seeding completed successfully.')
  await prisma.$disconnect()
}

seedDemoData().catch((err) => {
  console.error('[seed-demo] Error seeding demo data:', err)
  prisma.$disconnect().catch(() => null)
  process.exit(1)
})
