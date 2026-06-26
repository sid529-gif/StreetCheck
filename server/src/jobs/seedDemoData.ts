import { SCORING_VERSION, computeSafetyScore, getSafetyBand } from '@streetcheck/shared'
import { computeBbox } from '../db/geoQueries.js'
import { prisma } from '../db/prisma.js'

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
    // 5 Red Segments: low proximity to amenities / no footpaths
    {
      osmWayId: BigInt(-10001),
      name: '[DEMO] Tolichowki Underpass',
      coordinates: [
        [78.41, 17.4],
        [78.412, 17.402],
      ] as [number, number][],
      school: 15,
      hospital: 20,
      park: 10,
      bus_stop: 25,
      footpath: 10,
    },
    {
      osmWayId: BigInt(-10002),
      name: '[DEMO] Mehdipatnam Bridge Approach',
      coordinates: [
        [78.43, 17.39],
        [78.432, 17.392],
      ] as [number, number][],
      school: 20,
      hospital: 25,
      park: 15,
      bus_stop: 30,
      footpath: 15,
    },
    {
      osmWayId: BigInt(-10003),
      name: '[DEMO] Masab Tank Underpass',
      coordinates: [
        [78.45, 17.4],
        [78.452, 17.402],
      ] as [number, number][],
      school: 10,
      hospital: 15,
      park: 10,
      bus_stop: 20,
      footpath: 10,
    },
    {
      osmWayId: BigInt(-10004),
      name: '[DEMO] Attapur Ring Road Junction',
      coordinates: [
        [78.44, 17.37],
        [78.442, 17.372],
      ] as [number, number][],
      school: 20,
      hospital: 20,
      park: 15,
      bus_stop: 25,
      footpath: 15,
    },
    {
      osmWayId: BigInt(-10005),
      name: '[DEMO] Rethibowli Intersection',
      coordinates: [
        [78.42, 17.39],
        [78.422, 17.392],
      ] as [number, number][],
      school: 15,
      hospital: 15,
      park: 10,
      bus_stop: 20,
      footpath: 10,
    },
    // 5 Amber Segments: moderate proximity — Jubilee Hills, Film Nagar
    {
      osmWayId: BigInt(-10006),
      name: '[DEMO] Jubilee Hills Road No. 10',
      coordinates: [
        [78.405, 17.43],
        [78.407, 17.432],
      ] as [number, number][],
      school: 55,
      hospital: 50,
      park: 55,
      bus_stop: 60,
      footpath: 50,
    },
    {
      osmWayId: BigInt(-10007),
      name: '[DEMO] Film Nagar Main Road',
      coordinates: [
        [78.41, 17.415],
        [78.412, 17.417],
      ] as [number, number][],
      school: 60,
      hospital: 55,
      park: 60,
      bus_stop: 65,
      footpath: 55,
    },
    {
      osmWayId: BigInt(-10008),
      name: '[DEMO] Jubilee Hills Checkpost',
      coordinates: [
        [78.412, 17.425],
        [78.414, 17.427],
      ] as [number, number][],
      school: 55,
      hospital: 55,
      park: 55,
      bus_stop: 60,
      footpath: 55,
    },
    {
      osmWayId: BigInt(-10009),
      name: '[DEMO] Film Nagar Road No. 3',
      coordinates: [
        [78.418, 17.41],
        [78.42, 17.412],
      ] as [number, number][],
      school: 55,
      hospital: 50,
      park: 55,
      bus_stop: 60,
      footpath: 50,
    },
    {
      osmWayId: BigInt(-10010),
      name: '[DEMO] Jubilee Hills Road No. 5',
      coordinates: [
        [78.408, 17.428],
        [78.41, 17.43],
      ] as [number, number][],
      school: 60,
      hospital: 55,
      park: 60,
      bus_stop: 65,
      footpath: 60,
    },
    // 3 Green Segments: high proximity — Banjara Hills, Madhapur
    {
      osmWayId: BigInt(-10011),
      name: '[DEMO] Banjara Hills Road No. 12',
      coordinates: [
        [78.43, 17.41],
        [78.432, 17.412],
      ] as [number, number][],
      school: 85,
      hospital: 90,
      park: 85,
      bus_stop: 90,
      footpath: 85,
    },
    {
      osmWayId: BigInt(-10012),
      name: '[DEMO] Jubilee Hills Road No. 36',
      coordinates: [
        [78.4, 17.43],
        [78.402, 17.432],
      ] as [number, number][],
      school: 90,
      hospital: 92,
      park: 88,
      bus_stop: 92,
      footpath: 90,
    },
    {
      osmWayId: BigInt(-10013),
      name: '[DEMO] Banjara Hills Road No. 3',
      coordinates: [
        [78.435, 17.42],
        [78.437, 17.422],
      ] as [number, number][],
      school: 85,
      hospital: 88,
      park: 85,
      bus_stop: 90,
      footpath: 85,
    },
  ]

  const createdSegments: any[] = []
  for (const s of demoSegments) {
    const rawScore = computeSafetyScore({
      school: s.school,
      hospital: s.hospital,
      park: s.park,
      bus_stop: s.bus_stop,
      footpath: s.footpath,
    })
    const safetyBand = getSafetyBand(rawScore)
    const bbox = computeBbox(s.coordinates)

    const created = await prisma.roadSegment.create({
      data: {
        osmWayId: s.osmWayId,
        name: s.name,
        geometry: { type: 'LineString', coordinates: s.coordinates },
        bbox: bbox as any,
        school: s.school,
        hospital: s.hospital,
        park: s.park,
        bus_stop: s.bus_stop,
        footpath: s.footpath,
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
