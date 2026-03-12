import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse, getCurrentUserId } from '@/lib/utils/response'

/**
 * GET /api/code/submission-status
 *
 * 返回当前用户每道题的最终做题状态。
 * 响应格式：{ [problemId]: "passed" | "failed" }
 * 未提交过的题目不在返回结果中（前端默认为 "none"）。
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(createErrorResponse('未登录'), { status: 401 })
    }

    // 取每道题的所有提交，按时间降序
    const submissions = await prisma.codeSubmission.findMany({
      where: { userId },
      select: { problemId: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    // 对每道题取最优状态：只要有一次 Passed 就算 passed，否则 failed
    const statusMap: Record<string, 'passed' | 'failed'> = {}
    for (const sub of submissions) {
      if (statusMap[sub.problemId] === 'passed') continue
      statusMap[sub.problemId] = sub.status === 'Passed' ? 'passed' : 'failed'
    }

    return NextResponse.json(createSuccessResponse(statusMap))
  } catch (error) {
    console.error('Get submission status error:', error)
    return NextResponse.json(createErrorResponse('服务器错误'), { status: 500 })
  }
}
