# Asset Manager

面向个人与家庭的资产管理系统 Monorepo。

## 工程结构

- `apps/web`：Vue 3 + Vite Web 管理端
- `apps/api`：NestJS + Fastify API
- `apps/mobile`：uni-app 预留骨架
- `packages/*`：跨端共享领域、折旧、API 客户端、工具与 UI 包

## 本地开发

要求 Node.js 22.12+、pnpm 11+。

```bash
pnpm install
pnpm dev
```

常用质量命令：

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm format:check
```
