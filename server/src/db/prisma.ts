import { PrismaClient } from '@prisma/client'

// Prevent multiple Prisma client instances in dev hot-reload
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

declare global {
  var __prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  })
}

export const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient()

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__prisma = prisma
}
