import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { getSegmentCount } from '../db/geoQueries.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const segmentCount = await getSegmentCount()
    const activeReports = await prisma.hazardReport.count({
      where: { expiresAt: { gt: new Date() } },
    })

    // Find the latest refresh log or default to now
    const lastLog = await prisma.dataRefreshLog.findFirst({
      orderBy: { createdAt: 'desc' },
    })
    const lastRefreshed = lastLog ? lastLog.createdAt.toISOString() : new Date().toISOString()

    res.json({
      segmentCount,
      activeReports,
      lastRefreshed,
    })
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

export default router
