/**
 * Report expiry cron job — runs every hour.
 * Marks expired reports inactive, decrements activeReports on segments,
 * and triggers score recalculation.
 */

import cron from 'node-cron'
import { prisma } from '../db/prisma.js'
import { recalculateSegmentScore } from '../services/scoringEngine.js'

async function expireReports(): Promise<void> {
  const now = new Date()

  // Find all expired reports that haven't been cleaned yet
  const expired = await prisma.hazardReport.findMany({
    where: { expiresAt: { lte: now } },
    select: { id: true, segmentId: true },
  })

  if (expired.length === 0) return

  console.log(`[reportExpiryJob] Expiring ${expired.length} reports…`)

  // Group by segment to batch decrements
  const bySegment = new Map<string, string[]>()
  for (const r of expired) {
    const list = bySegment.get(r.segmentId) ?? []
    list.push(r.id)
    bySegment.set(r.segmentId, list)
  }

  // Delete expired reports and update segments
  await prisma.hazardReport.deleteMany({
    where: { id: { in: expired.map((r) => r.id) } },
  })

  const affectedSegments = [...bySegment.keys()]

  // Decrement activeReports and recalculate scores
  await Promise.all(
    affectedSegments.map(async (segmentId) => {
      const count = bySegment.get(segmentId)?.length ?? 0
      await prisma.roadSegment.update({
        where: { id: segmentId },
        data: { activeReports: { decrement: count } },
      })
      await recalculateSegmentScore(segmentId)
    })
  )

  await prisma.dataRefreshLog.create({
    data: {
      source: 'report_expiry',
      status: 'success',
      recordsIn: expired.length,
      recordsOut: affectedSegments.length,
      durationMs: 0,
    },
  })

  console.log(
    `[reportExpiryJob] Expired ${expired.length} reports across ${affectedSegments.length} segments`
  )
}

export function startReportExpiryJob(): void {
  // Every hour at :00
  cron.schedule('0 * * * *', () => {
    expireReports().catch((err: unknown) => {
      console.error('[reportExpiryJob] Unhandled error:', err)
    })
  })
  console.log('[reportExpiryJob] Scheduled — running every hour')
}
