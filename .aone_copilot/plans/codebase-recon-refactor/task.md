### codebase-recon-refactor ###
# MallocMentor 全栈重构 — 任务清单

> 每完成一个顶层任务后，立即更新本文件状态。
> 每阶段最后一个任务必须包含人工 7 步走查。

## 阶段 0 — 准备

- [x] 0.1 创建并切换到分支 `refactor/full-stack-cleanup`
- [x] 0.2 生成 `specs/context-brief.md`（基于本计划文档的"当前架构 + 关键约束 + 风险"章节）

## 阶段 1 — 死代码清理（P0）

- [/] 1.1 删除 `src/lib/mock-data.ts`，并 grep 确认零残留引用
- [ ] 1.2 删除 `src/app/actions/submission.ts` 及空目录 `src/app/actions/`
- [ ] 1.3 删除 `src/lib/auth.ts`，把所有 `from '@/lib/auth'` 改为 `from 'next-auth/react'`
- [ ] 1.4 `pnpm build` 通过 + 提交 commit "chore: remove dead code (mock-data / deprecated action / re-export shim)"
- [ ] 1.5 7 步走查通过

## 阶段 2 — API Route 公共层

- [ ] 2.1 新增 `src/lib/utils/logger.ts`
- [ ] 2.2 新增 `src/lib/utils/api-error.ts`（ApiError 类）
- [ ] 2.3 新增 `src/lib/api/handler.ts`（withAuth + withErrorBoundary）
- [ ] 2.4 迁移 `src/app/api/users/stats/route.ts` 作为示范
- [ ] 2.5 迁移 `src/app/api/code/submit/route.ts` 与 `code/submission-status/route.ts`
- [ ] 2.6 迁移 `src/app/api/code/run/route.ts`（无需 auth，用 withErrorBoundary）
- [ ] 2.7 迁移 `src/app/api/problems/*` 全部 route
- [ ] 2.8 迁移 `src/app/api/interviews/*` 全部 route（注意 message 路由的 SSE 不能被 wrapper 包成 JSON）
- [ ] 2.9 迁移 `src/app/api/learning-paths/*` 全部 route
- [ ] 2.10 迁移 `src/app/api/knowledge/*` 全部 route（注意 chat 是 SSE）
- [ ] 2.11 迁移 `src/app/api/capability-radar` / `activities` / `achievements` / `user/update` / `upload`
- [ ] 2.12 全局 grep 确认无残留 `getCurrentUserId() ... if (!userId)` 样板
- [ ] 2.13 `pnpm build` 通过 + 提交 commit "refactor(api): introduce withAuth handler middleware"
- [ ] 2.14 7 步走查通过

## 阶段 3 — JSON / SSE 收口

- [ ] 3.1 新增 `src/lib/utils/json-fields.ts`（含 parseTags / parseLearningSteps / parseInterviewMessages）
- [ ] 3.2 全仓 grep `JSON.parse(`（限定 src/app/api），逐个替换为 `parseXxx()`
- [ ] 3.3 新增 `src/lib/utils/sse.ts`（client 端 parseSSEStream 异步生成器）
- [ ] 3.4 重构 `src/components/interview/chat-window.tsx` 使用 parseSSEStream
- [ ] 3.5 重构 `src/components/knowledge-assistant/chat-widget.tsx` 使用 parseSSEStream
- [ ] 3.6 移除 `src/app/api/interviews/[id]/message/route.ts` 中的硬编码 mockReplies，未配置时返回明确提示
- [ ] 3.7 `pnpm build` 通过 + 提交 commit "refactor: unify JSON field & SSE parsing"
- [ ] 3.8 7 步走查通过（重点测面试 + 知识助手 SSE）

## 阶段 4 — 数据层统一 + 拆 page

### 4A 数据层

- [ ] 4A.1 扩展 `src/hooks/use-api.ts`：新增 `useApiMutation` + `SWR_KEYS` 常量
- [ ] 4A.2 为缺失的域补 `useXxx` hook（user.update / interview.create / interview.sendMessage 等）
- [ ] 4A.3 全仓 grep `from '@/lib/api'` 与 `from '@/lib/api-client'`，逐文件迁移到 hook
- [ ] 4A.4 全仓 grep `fetch('/api/`（限定 src/app 与 src/components），裸 fetch 全部改用 hook 或 mutation
- [ ] 4A.5 删除 `src/lib/api/index.ts` 与 `src/lib/api-client.ts`
- [ ] 4A.6 `pnpm build` 通过 + 提交 commit "refactor(data): unify data fetching via SWR hooks"
- [ ] 4A.7 7 步走查通过

### 4B 拆 page

- [ ] 4B.1 拆 `src/app/dashboard/page.tsx` → `_components/` + `_lib/`
- [ ] 4B.2 拆 `src/app/learn/page.tsx`
- [ ] 4B.3 拆 `src/app/practice/[id]/page.tsx`
- [ ] 4B.4 拆 `src/app/settings/page.tsx`（按 Tab 拆三个独立组件文件，目前已部分拆但仍 499 行）
- [ ] 4B.5 拆 `src/app/knowledge/page.tsx`
- [ ] 4B.6 （可选）拆 `src/app/interview/page.tsx`
- [ ] 4B.7 `pnpm build` 通过 + 每个 page 拆分独立提交 commit
- [ ] 4B.8 7 步走查通过（每个 page 拆完都走一次）

## 阶段 5 — 测试基建

- [ ] 5.1 安装 `vitest` + 配置 `vitest.config.ts` + 加 npm scripts
- [ ] 5.2 写 `src/lib/utils/__tests__/json-fields.test.ts`
- [ ] 5.3 写 `src/lib/utils/__tests__/sse.test.ts`
- [ ] 5.4 写 `src/lib/__tests__/achievements.test.ts`（覆盖 isConditionMet 全部 case）
- [ ] 5.5 写 `src/lib/ai/__tests__/coze-utils.test.ts`（parseJsonAnswer 边界情况）
- [ ] 5.6 写 `src/app/dashboard/_lib/__tests__/radar-utils.test.ts`
- [ ] 5.7 `pnpm test:run` 全绿 + 提交 commit "test: introduce vitest + cover utility functions"

## 阶段 6 — 收尾

- [ ] 6.1 更新根目录 `README.md` / `CLAUDE.md`，反映新的目录结构与数据层规范
- [ ] 6.2 全量 7 步走查最后一次
- [ ] 6.3 合并到 main 分支（个人项目可选）


updateAtTime: 2026/4/29 15:11:22

planId: d8c2b281-5a9c-4b4e-98c1-4455ab846877