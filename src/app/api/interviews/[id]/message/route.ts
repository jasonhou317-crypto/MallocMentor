import { NextRequest, NextResponse } from 'next/server'
import { createSuccessResponse, createErrorResponse, delay } from '@/lib/mock-data'
import { chatStream, isCozeConfigured } from '@/lib/ai/coze'
import type { SendMessageRequest, InterviewMessage } from '@/types/api'

/**
 * POST /api/interviews/[id]/message
 *
 * 两种模式：
 * 1. Coze 已配置 → 流式 SSE 返回（text/event-stream）
 * 2. Coze 未配置 → Mock 模式，返回固定 JSON
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params
    const body: SendMessageRequest = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json(
        createErrorResponse('消息内容不能为空'),
        { status: 400 }
      )
    }

    // ---- Coze 流式模式 ----
    if (isCozeConfigured('interview')) {
      const sessionId = request.headers.get('x-session-id') || undefined

      const { stream: textStream, sessionId: newSessionId } =
        await chatStream('interview', message, sessionId)

      // 将纯文本流转为标准 SSE 格式，方便前端 fetch 消费
      const encoder = new TextEncoder()
      const sseStream = new ReadableStream({
        async start(controller) {
          // 先告知前端 sessionId，用于后续多轮对话
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'session', sessionId: newSessionId })}\n\n`)
          )

          const reader = textStream.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`))
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (err) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(err) })}\n\n`)
            )
            controller.close()
          }
        },
      })

      return new Response(sseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // ---- Mock 模式（Coze 未配置时） ----
    await delay(1500)

    const mockReplies = [
      '很好的回答！让我们深入一下。你能解释一下智能指针的实现原理吗？特别是 shared_ptr 的引用计数机制是怎么工作的？',
      '不错！那你能说说 unique_ptr 和 shared_ptr 在使用场景上有什么区别吗？什么时候应该用哪个？',
      '嗯，理解得不错。那如果出现循环引用的情况，shared_ptr 会有什么问题？应该怎么解决？',
      '很好！你能说一下 RAII 的核心思想吗？它在 C++ 资源管理中起到了什么作用？',
      '好的，你回答得很全面。最后一个问题：你在实际项目中是如何排查内存泄漏的？用过哪些工具？',
    ]

    const aiResponse: InterviewMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: mockReplies[Math.floor(Math.random() * mockReplies.length)],
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(createSuccessResponse(aiResponse))
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      createErrorResponse('服务器错误'),
      { status: 500 }
    )
  }
}
