import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse, getCurrentUserId } from '@/lib/utils/response'

// GET /api/knowledge/favorites - 获取当前用户的收藏文章列表
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(createErrorResponse('未登录'), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const [favorites, total] = await Promise.all([
      prisma.userFavorite.findMany({
        where: { userId },
        include: { article: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.userFavorite.count({ where: { userId } }),
    ])

    const articles = favorites.map(f => ({
      ...f.article,
      tags: JSON.parse(f.article.tags),
      favoritedAt: f.createdAt,
    }))

    return NextResponse.json(createSuccessResponse({
      data: articles,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }))
  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json(createErrorResponse('服务器错误'), { status: 500 })
  }
}
