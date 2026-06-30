# Asset Manager

面向个人与家庭的资产管理系统。项目采用 pnpm workspace + Turborepo，包含 Vue 3 Web 管理端、NestJS API、uni-app 移动端骨架，以及可跨端复用的领域模型、API 客户端和折旧引擎。

## 工程结构

```text
apps/
  api/             NestJS + Fastify + Drizzle + SQLite
  web/             Vue 3 + Vite + Naive UI + ECharts
  mobile/          uni-app + Vue 3 最小可运行骨架
packages/
  domain/          领域类型、枚举与 DTO
  depreciation/    纯 TypeScript 折旧计算引擎
  api-client/      带 Token 刷新的统一 HTTP 客户端
  shared/          金额、日期等通用工具
  ui/              跨端设计 token 预留包
docker/            API/Web 镜像、Nginx 反向代理配置
```

## 环境要求

- Node.js 22.12 或更高版本
- pnpm 11 或更高版本
- 本地开发无需单独安装 SQLite
- Docker 部署需要 Docker Engine 与 Docker Compose v2

## 本地启动

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

默认访问地址：

- Web：<http://localhost:5173>
- API：<http://localhost:3000/api>
- Swagger：<http://localhost:3000/api/docs>
- 健康检查：<http://localhost:3000/api/health>

## 示例数据

执行 `pnpm db:seed` 会幂等创建以下开发数据：

- 登录邮箱：`test@example.com`
- 登录密码：`AssetManager123!`
- 9 个默认资产分类
- 8 条不同分类、状态和折旧方式的示例资产
- 折旧规则快照、状态历史、维修记录和附件元数据示例

附件示例仅包含元数据，不会伪造实际文件。重复执行 seed 不会重复创建测试用户。

## 常用命令

```bash
pnpm dev             # 启动所有支持 dev 的 workspace
pnpm build           # 构建全部应用与包
pnpm test            # 折旧单测与 API e2e
pnpm lint            # ESLint
pnpm typecheck       # 全 workspace 严格类型检查
pnpm format          # Prettier 写入
pnpm format:check    # Prettier 校验
pnpm db:generate     # 生成 Drizzle migration
pnpm db:migrate      # 执行 migration
pnpm db:seed         # 写入开发示例数据
```

API e2e 使用临时 SQLite 数据库，通过 Fastify 注入测试注册登录、新建与查询资产、用户数据隔离、折旧计算和 CSV 导出；不会污染本地开发数据库。

## 环境变量

| 变量                       | 默认值                    | 说明                                 |
| -------------------------- | ------------------------- | ------------------------------------ |
| `PORT`                     | `3000`                    | API 端口                             |
| `DATABASE_URL`             | `./data/asset-manager.db` | SQLite 文件路径                      |
| `UPLOAD_DIR`               | `./data/uploads`          | 上传文件目录                         |
| `JWT_ACCESS_SECRET`        | 无生产默认值              | Access Token 密钥，生产环境必须替换  |
| `JWT_REFRESH_SECRET`       | 无生产默认值              | Refresh Token 密钥，生产环境必须替换 |
| `ACCESS_TOKEN_EXPIRES_IN`  | `15m`                     | Access Token 有效期                  |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d`                      | Refresh Token 有效期                 |
| `CORS_ORIGIN`              | `http://localhost:5173`   | 允许的来源，多个来源用逗号分隔       |
| `WEB_PORT`                 | `8080`                    | Docker Web 暴露端口                  |

## Docker 部署

先创建环境文件并替换两个 JWT 密钥：

```bash
cp .env.example .env
pnpm docker:up
docker compose ps
```

Web 通过 <http://localhost:8080> 访问。Nginx 托管静态文件，并将 `/api` 反向代理到 API 容器。API 容器启动时自动执行数据库 migration；SQLite 数据库与上传目录共同保存在具名卷 `asset_data` 中。

如需给容器数据库写入示例数据：

```bash
docker compose exec api sh -lc "cd /app/apps/api && node --import tsx src/database/seed.ts"
```

停止服务：

```bash
pnpm docker:down
```

彻底删除数据卷需显式执行 `docker compose down -v`，该命令会删除数据库和上传文件，请谨慎使用。

## 数据备份

登录后可通过设置页或 `POST /api/backups/create` 创建 SQLite 备份，并通过 `GET /api/backups/list` 查看历史备份。Docker 环境的数据位于 `asset_data` 卷；执行文件级复制前应先停止写入或使用应用提供的备份接口，避免复制到不一致的 SQLite/WAL 状态。

## 移动端骨架

```bash
pnpm --filter @asset-manager/mobile dev
pnpm --filter @asset-manager/mobile build
```

可通过 `VITE_API_BASE_URL` 指定移动端 API 地址，H5 同源部署时默认使用 `/api`。当前骨架包含登录、首页、资产列表，以及 API Client 和折旧预览示例。

后续端侧分工：Web 侧侧重统计、批量管理和导入导出；App 侧侧重扫码、拍照、提醒和离线录入；微信小程序侧侧重快速查询与快速录入。移动端不依赖 Web 的 Naive UI。
