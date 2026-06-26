import { Router } from 'express'
import { getSegmentCount } from '../db/geoQueries.js'
import { prisma } from '../db/prisma.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const segmentCount = await getSegmentCount()
    const activeReports = await prisma.hazardReport.count({
      where: { expiresAt: { gt: new Date() } },
    })

    const avgSafetyScoreResult = await prisma.roadSegment.aggregate({
      _avg: {
        safetyScore: true,
      },
    })
    const safetyIndex = avgSafetyScoreResult._avg.safetyScore ?? 0.76

    // Find the latest refresh log or default to now
    const lastLog = await prisma.dataRefreshLog.findFirst({
      orderBy: { createdAt: 'desc' },
    })
    const lastRefreshed = lastLog ? lastLog.createdAt.toISOString() : new Date().toISOString()

    res.json({
      segmentCount,
      activeReports,
      safetyIndex,
      lastRefreshed,
    })
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

export default router
