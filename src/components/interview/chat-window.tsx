"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatWindowProps {
  sessionId?: string
}

export function ChatWindow({ sessionId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是你的 AI 面试官。今天我们将进行一场关于 C++ 的技术面试。我会问你一些问题，请你认真思考后回答。准备好了吗？',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string | undefined>(undefined)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  /**
   * 发送消息并处理回复
   * 自动适配两种响应格式：
   *  - text/event-stream → 流式逐字渲染
   *  - application/json  → 一次性渲染（mock 模式）
   */
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const aiMessageId = (Date.now() + 1).toString()

    try {
      const res = await fetch(`/api/interviews/${sessionId ?? 'default'}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionIdRef.current && { 'x-session-id': sessionIdRef.current }),
        },
        body: JSON.stringify({ sessionId: sessionId ?? 'default', message: input }),
      })

      const contentType = res.headers.get('content-type') ?? ''

      if (contentType.includes('text/event-stream')) {
        // ---- 流式模式：逐字追加 ----
        setMessages(prev => [...prev, {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date()
        }])

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''

          for (const chunk of lines) {
            const dataLine = chunk.split('\n').find(l => l.startsWith('data: '))
            if (!dataLine) continue

            const raw = dataLine.slice(6)
            if (raw === '[DONE]') break

            try {
              const parsed = JSON.parse(raw)
              // session 事件：保存 sessionId 用于多轮对话
              if (parsed && typeof parsed === 'object' && parsed.type === 'session') {
                sessionIdRef.current = parsed.sessionId
              } else if (typeof parsed === 'string') {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === aiMessageId ? { ...m, content: m.content + parsed } : m
                  )
                )
              }
            } catch {
              // 非 JSON 片段，跳过
            }
          }
        }
      } else {
        // ---- JSON 模式（mock fallback） ----
        const data = await res.json()
        if (data.success && data.data) {
          setMessages(prev => [...prev, {
            id: data.data.id ?? aiMessageId,
            role: 'assistant',
            content: data.data.content,
            timestamp: new Date(data.data.timestamp ?? Date.now())
          }])
        }
      }
    } catch (err) {
      console.error('Interview message error:', err)
      setMessages(prev => [...prev, {
        id: aiMessageId,
        role: 'assistant',
        content: '抱歉，AI 面试官暂时无法回复，请稍后重试。',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className={
                message.role === 'assistant'
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-blue-100 text-blue-600'
              }>
                {message.role === 'assistant' ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>

            <Card className={`max-w-[80%] p-3 ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-white'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
              }`}>
                {message.timestamp.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </Card>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-purple-100 text-purple-600">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">AI 正在思考...</span>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的回答..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  )
}
