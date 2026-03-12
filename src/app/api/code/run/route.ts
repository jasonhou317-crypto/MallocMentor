import { NextRequest, NextResponse } from 'next/server'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response'
import { executeCode } from '@/lib/sandbox'
import type { RunCodeRequest } from '@/types/api'

/**
 * POST /api/code/run
 *
 * 在沙盒中编译并运行 C/C++ 代码，返回真实的编译输出和运行结果。
 * 默认使用 Piston 公共 API，也支持 Judge0。
 */
export async function POST(request: NextRequest) {
  try {
    const body: RunCodeRequest = await request.json()
    const { code, language, input } = body

    if (!code || !language) {
      return NextResponse.json(createErrorResponse('缺少必要参数'), { status: 400 })
    }

    const lang = language as 'c' | 'cpp'

    const result = await executeCode(code, lang, input)

    let output = ''
    if (!result.compiled) {
      output = `编译错误:\n${result.compileOutput || result.stderr}`
    } else if (result.stderr) {
      output = result.stdout ? `${result.stdout}\n\n[stderr] ${result.stderr}` : result.stderr
    } else {
      output = result.stdout || '(无输出)'
    }

    return NextResponse.json(createSuccessResponse({
      output,
      compiled: result.compiled,
      exitCode: result.exitCode,
      executionTime: result.executionTime,
      compileOutput: result.compileOutput,
      stdout: result.stdout,
      stderr: result.stderr,
    }, result.compiled ? '运行完成' : '编译失败'))
  } catch (error) {
    console.error('Run code error:', error)
    const msg = error instanceof Error ? error.message : '代码执行失败，请稍后重试'
    return NextResponse.json(createErrorResponse(msg), { status: 500 })
  }
}
