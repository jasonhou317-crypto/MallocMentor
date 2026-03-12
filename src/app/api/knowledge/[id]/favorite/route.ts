import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse, getCurrentUserId } from '@/lib/utils/response'

// POST /api/knowledge/[id]/favorite - 切换收藏状态
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(createErrorResponse('未登录'), { status: 401 })
    }

    const article = await prisma.knowledgeArticle.findUnique({ where: { id } })
    if (!article) {
      return NextResponse.json(createErrorResponse('文章不存在'), { status: 404 })
    }

    const existing = await prisma.userFavorite.findUnique({
      where: { userId_articleId: { userId, articleId: id } },
    })

    if (existing) {
      // 取消收藏
      await prisma.userFavorite.delete({ where: { id: existing.id } })
      await prisma.knowledgeArticle.update({
        where: { id },
        data: { likes: { decrement: 1 } },
      })
      return NextResponse.json(createSuccessResponse({ favorited: false }, '已取消收藏'))
    }

    // 添加收藏
    await prisma.userFavorite.create({
      data: { userId, articleId: id },
    })
    await prisma.knowledgeArticle.update({
      where: { id },
      data: { likes: { increment: 1 } },
    })
    return NextResponse.json(createSuccessResponse({ favorited: true }, '收藏成功'))
  } catch (error) {
    console.error('Toggle favorite error:', error)
    return NextResponse.json(createErrorResponse('服务器错误'), { status: 500 })
  }
}

// GET /api/knowledge/[id]/favorite - 查询当前用户是否已收藏
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(createSuccessResponse({ favorited: false }))
    }

    const existing = await prisma.userFavorite.findUnique({
      where: { userId_articleId: { userId, articleId: id } },
    })
    return NextResponse.json(createSuccessResponse({ favorited: !!existing }))
  } catch (error) {
    console.error('Get favorite status error:', error)
    return NextResponse.json(createErrorResponse('服务器错误'), { status: 500 })
  }
}
