import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse, getCurrentUserId } from '@/lib/utils/response'
import { ACHIEVEMENTS } from '@/lib/achievements'

// GET /api/achievements - 返回全量成就定义 + 用户解锁状态
export async function GET(_request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(createErrorResponse('未登录'), { status: 401 })
    }

    const unlocked = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementKey: true, unlockedAt: true },
    })

    const unlockedMap = new Map(
      unlocked.map(u => [u.achievementKey, u.unlockedAt.toISOString()]),
    )

    const list = ACHIEVEMENTS.map(def => ({
      ...def,
      unlocked: unlockedMap.has(def.key),
      unlockedAt: unlockedMap.get(def.key) ?? null,
    }))

    return NextResponse.json(createSuccessResponse({
      achievements: list,
      total: ACHIEVEMENTS.length,
      unlocked: unlocked.length,
    }))
  } catch (error) {
    console.error('Get achievements error:', error)
    return NextResponse.json(createErrorResponse('服务器错误'), { status: 500 })
  }
}
