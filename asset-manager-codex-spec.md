# 个人资产管理系统（Asset Manager）开发规格与 Codex 执行提示词

> 项目目标：构建一个面向个人与家庭的资产管理系统。  
> 第一阶段优先交付 Web 管理后台，同时在架构上预留 Android、iOS 与微信小程序的扩展能力。  
> 核心价值在于：资产生命周期记录、折旧规则可解释、账面价值可追溯、统计口径清晰，以及后续多端复用。

---

## 目录

1. [项目目标与边界](#1-项目目标与边界)
2. [总体技术路线](#2-总体技术路线)
3. [架构原则](#3-架构原则)
4. [Monorepo 目录结构](#4-monorepo-目录结构)
5. [技术栈](#5-技术栈)
6. [数据库与存储策略](#6-数据库与存储策略)
7. [核心领域模型](#7-核心领域模型)
8. [折旧计算引擎](#8-折旧计算引擎)
9. [后端 API 设计](#9-后端-api-设计)
10. [Web 前端需求](#10-web-前端需求)
11. [移动端与小程序预留](#11-移动端与小程序预留)
12. [Docker 与部署](#12-docker-与部署)
13. [测试与工程质量](#13-测试与工程质量)
14. [实施阶段与验收标准](#14-实施阶段与验收标准)
15. [可直接交给 Codex 的完整提示词](#15-可直接交给-codex-的完整提示词)
16. [推荐的 Codex 分阶段执行提示词](#16-推荐的-codex-分阶段执行提示词)

---

# 1. 项目目标与边界

## 1.1 产品定位

这是一个面向个人及家庭用户的资产管理系统，不是企业 ERP 或固定资产财务系统。

第一阶段重点解决：

- 记录个人资产及其生命周期；
- 管理购入时间、购入价格、品牌型号、附件、保修资料；
- 配置折旧规则并计算账面价值；
- 记录维修、保养、出售、报废、丢失等事件；
- 通过统计看板理解资产总值、折旧趋势和分类分布；
- 为将来的 App、微信小程序、离线使用和家庭共享预留架构。

## 1.2 第一阶段范围

必须实现：

1. 用户注册、登录、刷新 Token、退出登录；
2. 资产分类管理；
3. 资产标签管理；
4. 资产增删改查；
5. 资产图片和附件上传；
6. 折旧规则配置；
7. 当前账面价值、累计折旧、月度折旧计划计算；
8. 维修与保养记录；
9. 出售、报废、丢失、闲置、归档等状态管理；
10. 首页统计看板；
11. 资产筛选、搜索、排序、分页；
12. CSV 导出；
13. 基础数据备份；
14. Swagger / OpenAPI 文档；
15. Docker Compose 本地部署。

暂不实现：

- 多家庭组织；
- 多人共享资产；
- 企业资产审批流；
- 会计凭证；
- OCR；
- AI 自动估值；
- 自动汇率；
- 离线同步；
- 微信登录；
- 支付；
- 消息推送。

## 1.3 多端策略

不要追求“一套 UI 代码完全无差别运行 Web、App、小程序”。

推荐目标：

> 领域模型、折旧计算、接口类型、API SDK 尽量共享；  
> Web、App、小程序的 UI 根据平台特性分别适配。

各端定位建议：

| 平台 | 主要用途 |
|---|---|
| Web | 资产管理、批量编辑、统计图表、导入导出、设置折旧规则 |
| App | 拍照录入、扫码、提醒、离线录入、随手查看 |
| 微信小程序 | 快速查询、快速新增、轻量家庭访问、分享和提醒 |

---

# 2. 总体技术路线

## 2.1 推荐方案

```text
Web 管理端：
Vue 3 + Vite + TypeScript + Naive UI + Pinia + ECharts

移动端 / 微信小程序：
uni-app + Vue 3 + TypeScript

后端：
NestJS + Fastify + TypeScript

数据库：
SQLite（服务端主库，启用 WAL）
未来可迁移 PostgreSQL

ORM：
Drizzle ORM

部署：
Docker Compose + Nginx / Caddy
```

## 2.2 选择该方案的原因

- 已有 Vue、TypeScript、NestJS 技术积累；
- Web 管理后台可使用完整 Vue 生态，复杂表格与统计体验更好；
- uni-app 适合未来覆盖 H5、Android、iOS、微信小程序；
- `packages/domain`、`packages/depreciation`、`packages/api-client` 可被 Web、App、小程序共同复用；
- SQLite 足够支撑个人资产管理系统第一阶段；
- 未来用户规模和并发提升时可迁移 PostgreSQL，而无需重写业务层。

---

# 3. 架构原则

## 3.1 领域逻辑独立

以下包不得依赖 Vue、NestJS、浏览器 API、Node 文件系统、uni-app API：

```text
packages/domain
packages/depreciation
packages/shared
```

折旧计算不能写死在：

- NestJS Service；
- Vue 页面；
- Pinia Store；
- Controller；
- 数据库 SQL 中。

应作为可独立运行、可独立测试的纯 TypeScript 模块。

## 3.2 金额与日期

金额禁止使用浮点数存储。

错误示例：

```ts
purchasePrice: 3999.99
```

正确示例：

```ts
purchasePriceCents: 399999
```

展示时统一格式化：

```text
¥3,999.99
```

日期与时间：

- 后端存储统一使用 UTC；
- API 使用 ISO 时间字符串；
- 前端统一通过日期工具格式化；
- 所有金额、日期、状态、枚举均通过共享工具处理。

## 3.3 附件存储

附件不存 SQLite BLOB。

推荐模式：

```text
SQLite：
- 文件元数据
- 文件名
- MIME 类型
- 大小
- 所属资产
- 存储相对路径

文件系统 / 对象存储：
- 图片
- 发票
- 保修卡
- 说明书
- 其他附件
```

本地开发或单机部署可使用：

```text
/var/lib/asset-manager/uploads/{userId}/{assetId}/{fileId}.jpg
```

未来可平滑迁移至：

- MinIO；
- S3；
- 阿里云 OSS；
- 腾讯云 COS。

## 3.4 数据库演进

第一阶段：

```text
客户端
  ↓ REST API
NestJS
  ↓
SQLite（服务端主库）
```

后续移动端离线能力：

```text
App 本地 SQLite
  ↓
操作队列 / 增量同步
  ↓
服务端数据库
```

第一阶段不要实现全端双向同步和冲突解决。

---

# 4. Monorepo 目录结构

使用 pnpm workspace + Turborepo。

```text
asset-manager/
├─ apps/
│  ├─ web/                    # 第一阶段 Web 管理后台
│  ├─ api/                    # NestJS 后端 API
│  └─ mobile/                 # uni-app 最小骨架
│
├─ packages/
│  ├─ domain/                 # 领域模型、DTO、枚举、共享类型
│  ├─ depreciation/           # 纯 TypeScript 折旧计算引擎
│  ├─ api-client/             # 统一 API 客户端 SDK
│  ├─ shared/                 # 金额、日期、常量、通用工具
│  └─ ui/                     # 设计 token、通用 UI 类型与预留组件
│
├─ docker/
├─ docs/
├─ pnpm-workspace.yaml
├─ turbo.json
├─ package.json
├─ tsconfig.base.json
├─ eslint.config.mjs
├─ prettier.config.mjs
└─ README.md
```

---

# 5. 技术栈

## 5.1 Web

```text
Vue 3
Vite
TypeScript
Vue Router
Pinia
Naive UI
ECharts
VueUse
UnoCSS（优先）或 Tailwind CSS
```

## 5.2 后端

```text
NestJS
Fastify Adapter
TypeScript
SQLite
Drizzle ORM
Zod（输入校验或 DTO 辅助）
JWT Access Token + Refresh Token
Swagger / OpenAPI
@fastify/multipart
Nest Logger
```

## 5.3 移动端

```text
uni-app
Vue 3 Composition API
TypeScript
复用 domain / depreciation / api-client
```

---

# 6. 数据库与存储策略

## 6.1 SQLite

要求：

- 使用 SQLite 作为服务端主数据库；
- 开启 WAL 模式；
- 数据库文件路径由环境变量配置；
- 示例路径：`/data/asset-manager.db`；
- 所有常用查询字段建立索引；
- 通过 Drizzle migration 管理 schema；
- 业务层通过 Repository 或 Service 边界访问数据；
- 保留未来切换 PostgreSQL 的能力。

## 6.2 数据文件

环境变量建议：

```env
DATABASE_URL=/data/asset-manager.db
UPLOAD_DIR=/data/uploads
```

## 6.3 备份

第一阶段至少支持：

- 备份 SQLite 数据库文件；
- 展示历史备份列表；
- 附件目录备份可作为可选项或后续 TODO。

---

# 7. 核心领域模型

以下类型、枚举、DTO 放在 `packages/domain`。

## 7.1 User

```ts
interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 7.2 AssetCategory

```ts
interface AssetCategory {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

建议默认分类：

- 数码电子；
- 家具家电；
- 摄影器材；
- 车辆交通；
- 房屋地产；
- 收藏品；
- 工具设备；
- 运动户外；
- 其他。

## 7.3 AssetTag

```ts
interface AssetTag {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: string;
}
```

资产与标签是多对多关系。

## 7.4 Asset

```ts
interface Asset {
  id: string;
  userId: string;
  categoryId?: string;

  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;

  purchaseDate?: string;
  purchasePriceCents?: number;
  purchaseChannel?: string;
  invoiceNumber?: string;

  residualValueCents?: number;
  usefulLifeMonths?: number;
  depreciationMethod: DepreciationMethod;
  customAnnualDepreciationRate?: number;
  depreciationStartDate?: string;
  currentMarketValueCents?: number;

  status: AssetStatus;
  disposedAt?: string;
  disposalPriceCents?: number;
  disposalNote?: string;

  location?: string;
  ownerName?: string;

  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}
```

## 7.5 AssetStatus

```ts
enum AssetStatus {
  IN_USE = 'IN_USE',
  IDLE = 'IDLE',
  SOLD = 'SOLD',
  SCRAPPED = 'SCRAPPED',
  LOST = 'LOST',
  ARCHIVED = 'ARCHIVED',
}
```

## 7.6 DepreciationMethod

```ts
enum DepreciationMethod {
  NONE = 'NONE',
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  DOUBLE_DECLINING = 'DOUBLE_DECLINING',
  CUSTOM_ANNUAL_RATE = 'CUSTOM_ANNUAL_RATE',
  CUSTOM_SCHEDULE = 'CUSTOM_SCHEDULE',
}
```

## 7.7 AssetAttachment

```ts
interface AssetAttachment {
  id: string;
  userId: string;
  assetId: string;

  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  url?: string;

  type: AttachmentType;
  createdAt: string;
}
```

```ts
enum AttachmentType {
  IMAGE = 'IMAGE',
  INVOICE = 'INVOICE',
  WARRANTY = 'WARRANTY',
  MANUAL = 'MANUAL',
  OTHER = 'OTHER',
}
```

## 7.8 AssetMaintenanceRecord

```ts
interface AssetMaintenanceRecord {
  id: string;
  assetId: string;
  userId: string;

  maintenanceDate: string;
  type: MaintenanceType;
  costCents?: number;
  description?: string;
  serviceProvider?: string;

  createdAt: string;
  updatedAt: string;
}
```

```ts
enum MaintenanceType {
  REPAIR = 'REPAIR',
  MAINTENANCE = 'MAINTENANCE',
  CLEANING = 'CLEANING',
  INSPECTION = 'INSPECTION',
  UPGRADE = 'UPGRADE',
  OTHER = 'OTHER',
}
```

## 7.9 AssetDepreciationProfile

折旧规则必须支持历史追溯。规则发生变更时，不能直接覆盖旧记录，应新增 profile 并递增版本号。

```ts
interface AssetDepreciationProfile {
  id: string;
  assetId: string;

  version: number;
  effectiveFrom: string;

  originalCostCents: number;
  residualValueCents: number;
  usefulLifeMonths?: number;
  depreciationMethod: DepreciationMethod;
  customAnnualDepreciationRate?: number;
  customScheduleJson?: string;

  createdAt: string;
}
```

## 7.10 AssetStatusHistory

```ts
interface AssetStatusHistory {
  id: string;
  assetId: string;

  fromStatus?: AssetStatus;
  toStatus: AssetStatus;
  note?: string;
  occurredAt: string;

  createdAt: string;
}
```

---

# 8. 折旧计算引擎

折旧模块位于：

```text
packages/depreciation
```

要求：

- 纯 TypeScript；
- 不依赖数据库、NestJS、Vue、Node 文件系统；
- 可独立单元测试；
- 所有金额使用整数分；
- 所有计算均应可解释、可追溯。

## 8.1 支持的折旧方式

1. 不折旧：`NONE`
2. 直线法：`STRAIGHT_LINE`
3. 双倍余额递减法：`DOUBLE_DECLINING`
4. 自定义年折旧率：`CUSTOM_ANNUAL_RATE`
5. 自定义月度计划：`CUSTOM_SCHEDULE`

## 8.2 统一输入输出接口

```ts
export interface DepreciationInput {
  originalCostCents: number;
  residualValueCents: number;
  startDate: string;
  usefulLifeMonths?: number;
  method: DepreciationMethod;
  customAnnualDepreciationRate?: number;
  customSchedule?: Array<{
    month: string;
    depreciationCents: number;
  }>;
  asOfDate: string;
}

export interface DepreciationScheduleItem {
  month: string;
  openingBookValueCents: number;
  depreciationCents: number;
  accumulatedDepreciationCents: number;
  closingBookValueCents: number;
}

export interface DepreciationResult {
  originalCostCents: number;
  residualValueCents: number;
  accumulatedDepreciationCents: number;
  currentBookValueCents: number;
  monthlyDepreciationCents?: number;
  schedule: DepreciationScheduleItem[];
}
```

核心函数：

```ts
calculateDepreciation(input: DepreciationInput): DepreciationResult;
```

多个 profile 的追溯计算：

```ts
calculateAssetValueByProfiles(
  profiles: AssetDepreciationProfile[],
  asOfDate: string,
): DepreciationResult;
```

## 8.3 计算规则

- 账面价值不得低于残值；
- 累计折旧不得超过原值减残值；
- 购买日期或折旧起算日晚于统计日期时，折旧结果为 0；
- 直线法按自然月计算；
- 修改折旧规则后，历史值应根据 profile 生效时间与版本连续计算；
- 自定义计划不能导致账面价值低于残值；
- 双倍余额递减法应在接近残值时截断；
- 所有舍入行为必须统一且可测试。

## 8.4 测试要求

必须覆盖：

- 每种折旧算法；
- 边界日期；
- 购买日期在未来；
- 已完全折旧；
- 残值；
- 原值与残值异常输入；
- 修改折旧规则；
- 多 profile 历史追溯；
- 自定义计划总额超限；
- 直线法自然月计算。

---

# 9. 后端 API 设计

统一前缀：

```text
/api
```

所有资源必须：

- 使用 JWT 鉴权；
- 基于 `userId` 隔离；
- 禁止访问、修改、删除他人数据；
- 有明确 DTO；
- 有统一错误结构；
- 不暴露服务端绝对文件路径；
- 在 Swagger 中可查看与调试。

## 9.1 Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

## 9.2 Categories

```text
GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id
```

## 9.3 Tags

```text
GET    /api/tags
POST   /api/tags
PATCH  /api/tags/:id
DELETE /api/tags/:id
```

## 9.4 Assets

```text
GET    /api/assets
POST   /api/assets
GET    /api/assets/:id
PATCH  /api/assets/:id
DELETE /api/assets/:id

POST   /api/assets/:id/archive
POST   /api/assets/:id/restore
POST   /api/assets/:id/status

GET    /api/assets/:id/depreciation
GET    /api/assets/:id/timeline
```

资产列表需要支持：

```text
page
pageSize
keyword
categoryId
tagIds
status
sortBy
sortOrder
minPurchasePriceCents
maxPurchasePriceCents
purchaseDateFrom
purchaseDateTo
includeArchived
```

分页返回结构：

```ts
interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

## 9.5 附件、维修、折旧规则与历史记录

```text
GET    /api/assets/:id/attachments
POST   /api/assets/:id/attachments
DELETE /api/assets/:id/attachments/:attachmentId

GET    /api/assets/:id/maintenance-records
POST   /api/assets/:id/maintenance-records
PATCH  /api/assets/:id/maintenance-records/:recordId
DELETE /api/assets/:id/maintenance-records/:recordId

GET    /api/assets/:id/depreciation-profiles
POST   /api/assets/:id/depreciation-profiles

GET    /api/assets/:id/status-history
```

## 9.6 Dashboard

```text
GET /api/dashboard/overview
GET /api/dashboard/category-distribution
GET /api/dashboard/depreciation-trend
GET /api/dashboard/status-distribution
GET /api/dashboard/recent-assets
```

至少返回：

- 总购置成本；
- 当前账面价值；
- 累计折旧；
- 当前市场估值；
- 资产数量；
- 本月折旧；
- 分类价值占比；
- 资产状态分布；
- 最近 12 个月折旧趋势；
- 最近新增资产。

## 9.7 导出与备份

```text
GET  /api/exports/assets.csv
POST /api/backups/create
GET  /api/backups/list
```

---

# 10. Web 前端需求

Web 位于：

```text
apps/web
```

技术：

```text
Vue 3 + Vite + TypeScript + Naive UI + Pinia + ECharts
```

## 10.1 基础布局

要求：

```text
左侧导航栏
顶部用户区域
内容区域
响应式布局
浅色 / 深色主题切换
```

路由：

```text
/login
/register
/dashboard
/assets
/assets/new
/assets/:id
/assets/:id/edit
/categories
/tags
/settings
```

## 10.2 登录与注册

要求：

- 简洁现代；
- 登录成功后保存 access token；
- 支持 refresh token 自动刷新；
- 未登录访问业务页面时跳转到登录页；
- 登录失效自动清理状态并返回登录页；
- API Client 统一处理授权与刷新。

## 10.3 Dashboard

展示：

- 总购置成本；
- 当前账面价值；
- 累计折旧；
- 当前市场估值；
- 本月折旧；
- 资产数量；
- 分类价值占比饼图；
- 最近 12 个月折旧趋势折线图；
- 资产状态分布图；
- 最近新增资产；
- 快捷新增资产按钮。

## 10.4 资产列表页

要求：

- 表格展示；
- 分页、排序、搜索；
- 分类筛选、标签筛选、状态筛选；
- 支持列显示控制；
- 支持批量归档；
- 支持导出 CSV；
- 点击行进入资产详情。

默认列：

```text
名称
分类
品牌 / 型号
购买日期
购置成本
当前账面价值
当前市场估值
状态
标签
操作
```

## 10.5 新增与编辑资产页

表单分区：

```text
基本信息
购置信息
折旧与估值
位置与归属
标签
附件
```

要求：

- 前端以“元”录入，提交时转换为“分”；
- 清晰的日期选择；
- 根据折旧方式动态显示参数；
- 输入原值、残值、年限、起算日后，实时预览折旧结果；
- 右侧或下方展示折旧计划预览；
- 支持图片、发票、保修卡上传；
- 提交成功后跳转资产详情。

## 10.6 资产详情页

展示：

- 基本资料；
- 当前状态；
- 当前账面价值；
- 当前市场估值；
- 累计折旧；
- 折旧规则；
- 折旧计划表；
- 折旧趋势图；
- 标签；
- 附件预览；
- 维修保养记录；
- 状态变更时间线；
- 编辑、归档、出售、报废、丢失等操作。

状态变更必须：

- 弹出确认框；
- 支持填写备注；
- 支持处置日期；
- 出售时支持输入出售价格。

## 10.7 分类与标签管理

支持：

- 新增；
- 编辑；
- 删除；
- 分类排序；
- 标签颜色；
- 删除前检查关联资产；
- 若有关联资产，提示迁移或解除关联。

## 10.8 设置页

至少包括：

- 个人资料；
- 主题设置；
- 数据导出；
- 数据备份；
- 关于系统。

## 10.9 前端工程约束

1. TypeScript 严格模式；
2. API 类型尽可能来自共享 `domain` 包；
3. 使用统一 API Client；
4. 自动添加 `Authorization`；
5. 自动刷新 Token；
6. 统一错误处理；
7. 所有金额统一通过 `formatMoney`；
8. 所有日期统一通过 `formatDate`；
9. 状态使用统一映射配置；
10. 所有表单字段避免 `any`；
11. 加载、空状态、错误状态完整；
12. UI 文案为中文；
13. Pinia 仅管理认证、全局配置、少量缓存；
14. 数据逻辑使用 composables 封装。

建议 composables：

```text
useAssetList
useAssetDetail
useDashboard
useAuth
useDepreciationPreview
```

---

# 11. 移动端与小程序预留

移动端目录：

```text
apps/mobile
```

第一阶段只创建最小 uni-app 骨架，实现：

```text
登录页占位
首页占位
资产列表占位
使用 packages/api-client 调用 API 的示例
使用 packages/depreciation 进行折旧预览的示例
```

要求：

- Vue 3 Composition API；
- TypeScript；
- 不复制 domain 类型；
- 不依赖 Web 的 Naive UI；
- 预留 H5、Android、iOS、微信小程序编译配置；
- README 说明未来策略：

```text
Web：统计、批量管理、导入导出
App：扫码、拍照、提醒、离线录入
小程序：快速查询、快速录入
```

---

# 12. Docker 与部署

需要提供：

```text
Dockerfile.api
Dockerfile.web
docker-compose.yml
.env.example
```

Docker Compose 至少包含：

```text
api
web
```

要求：

- API 数据库与上传目录使用 volume；
- Web 使用 Nginx 或 Caddy 提供静态文件；
- Web 通过反向代理访问 `/api`；
- 环境变量支持：

```env
PORT=
DATABASE_URL=
UPLOAD_DIR=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
ACCESS_TOKEN_EXPIRES_IN=
REFRESH_TOKEN_EXPIRES_IN=
CORS_ORIGIN=
```

README 必须说明：

- 本地启动；
- 数据库迁移；
- seed；
- 测试；
- Docker 启动；
- 默认测试账户。

---

# 13. 测试与工程质量

必须提供：

1. `packages/depreciation` 完整单元测试；
2. API 集成测试或 e2e 测试；
3. ESLint；
4. Prettier；
5. TypeScript strict；
6. 每个 workspace 包可独立 typecheck；
7. 根目录统一命令。

建议最少 API 测试：

```text
注册登录
新建资产
获取资产列表
用户隔离
折旧计算接口
CSV 导出
```

根目录命令：

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm docker:up
```

---

# 14. 实施阶段与验收标准

## 14.1 实施阶段

### 阶段 1：初始化 Monorepo 和基础工程

- pnpm workspace；
- Turborepo；
- TypeScript base config；
- ESLint / Prettier；
- `web`、`api`、`mobile`、`packages` 骨架。

### 阶段 2：实现 domain 与 depreciation

- 共享类型；
- 枚举；
- DTO；
- 折旧算法；
- 单元测试。

### 阶段 3：实现 API 基础能力

- NestJS + Fastify；
- SQLite + Drizzle；
- migration；
- auth；
- Swagger；
- seed。

### 阶段 4：实现资产核心 API

- 分类；
- 标签；
- 资产 CRUD；
- 折旧 profile；
- 维修记录；
- 状态变更；
- 文件上传；
- Dashboard；
- CSV 导出；
- 备份接口。

### 阶段 5：实现 Web 前端

- 登录注册；
- 主布局；
- Dashboard；
- 资产列表；
- 资产表单；
- 资产详情；
- 分类、标签、设置。

### 阶段 6：Docker、README、测试与完善

- Docker Compose；
- API e2e；
- 示例数据；
- 项目文档；
- mobile 骨架验证。

## 14.2 验收标准

完成后必须满足：

1. `pnpm install` 可正常安装；
2. `pnpm dev` 可启动 Web 与 API；
3. 可注册、登录；
4. 可创建分类、标签、资产；
5. 可配置直线法、双倍余额递减法、自定义年折旧率；
6. 资产详情可显示当前账面价值和月度折旧计划；
7. 首页可显示资产总值、累计折旧、分类占比、折旧趋势；
8. 可上传图片、发票、附件；
9. 可添加维修保养记录；
10. 可将资产标记出售、报废、丢失、归档；
11. 可导出 CSV；
12. 可通过 Docker Compose 启动；
13. 折旧包具备可运行测试；
14. Web、API、mobile 均能通过 typecheck；
15. README 足够让陌生开发者启动项目。

---

# 15. 可直接交给 Codex 的完整提示词

```text
你是一名资深全栈架构师和工程师。请从零开始创建一个“个人资产管理系统”项目，项目代号为 `asset-manager`。

目标：第一阶段优先完成 Web 管理后台，但架构必须为未来兼容 Android、iOS 和微信小程序预留空间。不要为了所谓“一套 UI 跑所有端”牺牲 Web 管理后台体验；要求业务模型、折旧计算、API 类型和客户端 SDK 可复用。

请直接开始创建项目文件、代码、配置、数据库迁移和基础页面。不要只输出方案或伪代码。每完成一个阶段后，简要说明已完成内容、关键文件和下一步建议。

---

# 一、技术栈与总体架构

使用 pnpm workspace + Turborepo monorepo。

目录结构必须按以下方式创建：

asset-manager/
├─ apps/
│  ├─ web/                    # 第一阶段 Web 管理后台
│  ├─ api/                    # NestJS 后端 API
│  └─ mobile/                 # 预留 uni-app 项目骨架，暂不需要完整实现
│
├─ packages/
│  ├─ domain/                 # 领域模型、DTO、枚举、共享类型
│  ├─ depreciation/           # 纯 TypeScript 折旧计算引擎
│  ├─ api-client/             # API 请求 SDK、统一类型
│  ├─ shared/                 # 工具函数、日期金额工具、常量
│  └─ ui/                     # 预留通用设计 token、基础组件类型
│
├─ docker/
├─ docs/
├─ pnpm-workspace.yaml
├─ turbo.json
├─ package.json
├─ tsconfig.base.json
├─ eslint.config.mjs
├─ prettier.config.mjs
└─ README.md

技术选型：

前端 Web：
- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Naive UI
- ECharts
- VueUse
- UnoCSS 或 Tailwind CSS，二选一，优先 UnoCSS
- Axios 或 fetch 封装，优先使用 packages/api-client

后端：
- NestJS
- Fastify Adapter
- TypeScript
- SQLite
- Drizzle ORM
- Zod 用于关键输入校验或 DTO 辅助校验
- JWT Access Token + Refresh Token
- Swagger / OpenAPI
- 文件上传使用 @fastify/multipart
- 日志使用 Nest Logger 即可

数据库：
- SQLite，启用 WAL 模式
- 数据库文件挂载在可配置目录中，例如 `/data/asset-manager.db`
- 使用 Drizzle migration 管理表结构
- 所有金额使用整数分 `xxxCents` 存储，禁止使用浮点数存金额
- 所有时间使用 ISO 字符串或 UTC 时间戳，后端统一使用 UTC
- 附件文件不要存 SQLite BLOB，数据库只存元数据，文件保存到本地目录，未来可迁移到 MinIO / S3

未来移动端：
- `apps/mobile` 创建 uni-app + Vue 3 + TypeScript 的最小骨架
- 暂时不实现完整页面
- 必须能够复用 `packages/domain`、`packages/depreciation`、`packages/api-client`
- 不要让 domain、depreciation 包依赖 Vue、浏览器 API、Node API、uni-app API

---

# 二、产品范围

这是一个面向个人和家庭的资产管理系统，不是企业 ERP。

第一阶段只实现以下功能：

1. 用户注册、登录、刷新 Token、退出登录
2. 资产分类管理
3. 资产增删改查
4. 资产标签管理
5. 资产图片和附件上传
6. 资产折旧规则配置
7. 自动计算当前账面价值、累计折旧和月度折旧计划
8. 资产维修/保养记录
9. 资产出售、报废、丢失、闲置状态管理
10. 首页统计看板
11. 资产列表筛选、搜索、排序、分页
12. CSV 导出资产数据
13. 基础数据备份接口
14. Swagger API 文档
15. Docker Compose 本地部署

暂时不要实现：
- 多家庭组织
- 多用户共享资产
- 企业审批流
- 会计凭证
- OCR
- AI 自动估值
- 多币种自动汇率
- 离线同步
- 微信登录
- 支付
- 消息推送

---

# 三、核心领域模型

请在 `packages/domain` 中定义以下实体、枚举、DTO 和类型。

## 1. 用户 User

字段建议：

- id: string
- email: string
- passwordHash: string
- displayName: string
- avatarUrl?: string
- createdAt: string
- updatedAt: string

## 2. 资产分类 AssetCategory

字段：

- id: string
- userId: string
- name: string
- icon?: string
- sortOrder: number
- createdAt: string
- updatedAt: string

默认分类可以在 seed 中创建：

- 数码电子
- 家具家电
- 摄影器材
- 车辆交通
- 房屋地产
- 收藏品
- 工具设备
- 运动户外
- 其他

## 3. 标签 AssetTag

字段：

- id: string
- userId: string
- name: string
- color?: string
- createdAt: string

资产和标签为多对多关系。

## 4. 资产 Asset

字段至少包括：

- id: string
- userId: string
- categoryId?: string
- name: string
- brand?: string
- model?: string
- serialNumber?: string
- description?: string

购置信息：
- purchaseDate?: string
- purchasePriceCents?: number
- purchaseChannel?: string
- invoiceNumber?: string

估值与折旧：
- residualValueCents?: number
- usefulLifeMonths?: number
- depreciationMethod: DepreciationMethod
- customAnnualDepreciationRate?: number
- depreciationStartDate?: string
- currentMarketValueCents?: number

资产状态：
- status: AssetStatus
- disposedAt?: string
- disposalPriceCents?: number
- disposalNote?: string

归属与位置：
- location?: string
- ownerName?: string

系统字段：
- createdAt: string
- updatedAt: string
- archivedAt?: string

AssetStatus 枚举：

- IN_USE
- IDLE
- SOLD
- SCRAPPED
- LOST
- ARCHIVED

DepreciationMethod 枚举：

- NONE
- STRAIGHT_LINE
- DOUBLE_DECLINING
- CUSTOM_ANNUAL_RATE
- CUSTOM_SCHEDULE

## 5. 资产附件 AssetAttachment

字段：

- id: string
- userId: string
- assetId: string
- fileName: string
- mimeType: string
- fileSize: number
- storagePath: string
- url?: string
- type: AttachmentType
- createdAt: string

AttachmentType：

- IMAGE
- INVOICE
- WARRANTY
- MANUAL
- OTHER

## 6. 资产维修记录 AssetMaintenanceRecord

字段：

- id: string
- assetId: string
- userId: string
- maintenanceDate: string
- type: MaintenanceType
- costCents?: number
- description?: string
- serviceProvider?: string
- createdAt: string
- updatedAt: string

MaintenanceType：

- REPAIR
- MAINTENANCE
- CLEANING
- INSPECTION
- UPGRADE
- OTHER

## 7. 资产折旧规则快照 AssetDepreciationProfile

注意：资产折旧规则必须支持历史追溯。

字段：

- id: string
- assetId: string
- version: number
- effectiveFrom: string
- originalCostCents: number
- residualValueCents: number
- usefulLifeMonths?: number
- depreciationMethod: DepreciationMethod
- customAnnualDepreciationRate?: number
- customScheduleJson?: string
- createdAt: string

规则变更时，不要直接覆盖原规则；新增一条 profile 记录，并递增 version。

## 8. 资产状态变更记录 AssetStatusHistory

字段：

- id: string
- assetId: string
- fromStatus?: AssetStatus
- toStatus: AssetStatus
- note?: string
- occurredAt: string
- createdAt: string

---

# 四、折旧计算引擎要求

在 `packages/depreciation` 中实现纯 TypeScript 折旧计算模块。

禁止依赖数据库、NestJS、Vue、Node 文件系统。

需要实现以下方法：

1. 不折旧 NONE
2. 直线法 STRAIGHT_LINE
3. 双倍余额递减法 DOUBLE_DECLINING
4. 自定义年折旧率 CUSTOM_ANNUAL_RATE
5. 自定义月度计划 CUSTOM_SCHEDULE

请提供统一接口：

```ts
export interface DepreciationInput {
  originalCostCents: number;
  residualValueCents: number;
  startDate: string;
  usefulLifeMonths?: number;
  method: DepreciationMethod;
  customAnnualDepreciationRate?: number;
  customSchedule?: Array<{
    month: string;
    depreciationCents: number;
  }>;
  asOfDate: string;
}

export interface DepreciationScheduleItem {
  month: string;
  openingBookValueCents: number;
  depreciationCents: number;
  accumulatedDepreciationCents: number;
  closingBookValueCents: number;
}

export interface DepreciationResult {
  originalCostCents: number;
  residualValueCents: number;
  accumulatedDepreciationCents: number;
  currentBookValueCents: number;
  monthlyDepreciationCents?: number;
  schedule: DepreciationScheduleItem[];
}
```

规则：

- 账面价值不得低于残值
- 累计折旧不得超过原值减残值
- 资产购买日期晚于统计日期时，折旧结果应为 0
- 直线法按自然月计算
- 所有计算必须基于整数分，避免浮点精度问题
- 对每种算法写单元测试
- 测试用例必须覆盖边界日期、已折旧完成、残值、购买日期未来、修改折旧规则等情况

同时实现：

```ts
calculateDepreciation(input: DepreciationInput): DepreciationResult;
```

以及：

```ts
calculateAssetValueByProfiles(
  profiles: AssetDepreciationProfile[],
  asOfDate: string,
): DepreciationResult;
```

其中多个 profile 需要按 effectiveFrom 和 version 依次处理，保证用户修改折旧规则后，历史值可追溯。

---

# 五、后端 API 设计

请使用 REST API，路径统一以 `/api` 开头。

至少实现以下模块：

```text
/auth
/users
/categories
/tags
/assets
/assets/:id/attachments
/assets/:id/maintenance-records
/assets/:id/depreciation-profiles
/assets/:id/status-history
/dashboard
/exports
/backups
```

接口要求：

## Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

## Categories

```text
GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id
```

## Tags

```text
GET    /api/tags
POST   /api/tags
PATCH  /api/tags/:id
DELETE /api/tags/:id
```

## Assets

```text
GET    /api/assets
POST   /api/assets
GET    /api/assets/:id
PATCH  /api/assets/:id
DELETE /api/assets/:id
POST   /api/assets/:id/archive
POST   /api/assets/:id/restore
POST   /api/assets/:id/status
GET    /api/assets/:id/depreciation
GET    /api/assets/:id/timeline
```

资产列表接口需要支持：

```text
page
pageSize
keyword
categoryId
tagIds
status
sortBy
sortOrder
minPurchasePriceCents
maxPurchasePriceCents
purchaseDateFrom
purchaseDateTo
includeArchived
```

返回统一分页结构：

```ts
{
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

## Dashboard

```text
GET /api/dashboard/overview
GET /api/dashboard/category-distribution
GET /api/dashboard/depreciation-trend
GET /api/dashboard/status-distribution
GET /api/dashboard/recent-assets
```

统计指标至少包括：

- 总购置成本
- 当前账面价值
- 累计折旧
- 当前市场估值
- 资产数量
- 本月折旧
- 各分类资产价值占比
- 各状态资产数量
- 最近 12 个月折旧趋势
- 最近新增资产

## 导出与备份

```text
GET  /api/exports/assets.csv
POST /api/backups/create
GET  /api/backups/list
```

备份至少包含 SQLite 数据库文件；附件目录备份可以先实现为可选项或 TODO。

所有 API：
- 必须有 JWT 鉴权
- 所有资源必须按 userId 隔离
- 用户不能读取、修改、删除其他用户的数据
- 统一错误返回结构
- Swagger 文档可访问
- 输入校验完善
- 不要暴露内部文件系统绝对路径

---

# 六、数据库要求

使用 Drizzle ORM + SQLite。

请创建 migration，并至少包含：

- users
- refresh_tokens
- asset_categories
- asset_tags
- assets
- asset_tag_relations
- asset_attachments
- asset_maintenance_records
- asset_depreciation_profiles
- asset_status_history

要求：

1. 所有主键使用 UUID 或 UUIDv7 风格字符串
2. 外键关系完整
3. 常用查询字段建立索引，例如：
   - assets.user_id
   - assets.category_id
   - assets.status
   - assets.purchase_date
   - asset_tag_relations.asset_id
   - asset_tag_relations.tag_id
   - asset_depreciation_profiles.asset_id
4. 启动时启用 SQLite WAL
5. 支持通过环境变量配置数据库文件位置
6. 创建开发 seed 数据：
   - 一个测试用户
   - 若干默认资产分类
   - 至少 8 条不同类别、不同状态、不同折旧方法的示例资产
   - 为示例资产生成维修记录、附件元数据、折旧规则快照

---

# 七、Web 前端要求

Web 项目位于 `apps/web`。

使用 Vue 3 + TypeScript + Vite + Naive UI + Pinia + ECharts。

页面需要有完整基础布局：

```text
- 左侧导航栏
- 顶部用户区域
- 内容区域
- 响应式布局
- 浅色 / 深色主题切换
```

路由至少包括：

```text
/login
/register
/dashboard
/assets
/assets/new
/assets/:id
/assets/:id/edit
/categories
/tags
/settings
```

## 1. 登录与注册页

要求：

- 简洁现代
- 登录成功后保存 access token
- 支持 refresh token 自动刷新
- 未登录访问业务页面时跳转登录页
- 登录状态失效时自动清理并返回登录页

## 2. Dashboard 首页

展示：

- 总购置成本
- 当前账面价值
- 累计折旧
- 当前市场估值
- 本月折旧
- 资产数量
- 分类价值占比饼图
- 最近 12 个月折旧趋势折线图
- 资产状态分布图
- 最近新增资产列表
- 快捷新增资产按钮

## 3. 资产列表页

要求：

- 表格展示
- 支持分页、排序、搜索、分类筛选、标签筛选、状态筛选
- 默认列：
  - 名称
  - 分类
  - 品牌/型号
  - 购买日期
  - 购置成本
  - 当前账面价值
  - 当前市场估值
  - 状态
  - 标签
  - 操作
- 支持列显示控制
- 支持批量归档
- 支持导出 CSV
- 点击行进入资产详情

## 4. 新增/编辑资产页面

表单分区：

```text
基本信息
购置信息
折旧与估值
位置与归属
标签
附件
```

要求：

- 金额输入以元展示，但提交和存储时转换为分
- 日期选择清晰
- 折旧方式切换时动态显示相应参数
- 输入原值、残值、年限、起算日后，实时展示预计折旧结果
- 可以在右侧或下方展示折旧计划预览
- 支持上传图片、发票、保修卡等文件
- 提交后跳转到资产详情

## 5. 资产详情页

展示：

- 基本资料
- 当前状态
- 当前账面价值
- 当前市场估值
- 累计折旧
- 折旧规则
- 折旧计划表
- 折旧趋势图
- 标签
- 附件预览
- 维修保养记录
- 状态变更时间线
- 编辑、归档、出售、报废、丢失等操作

状态变更要使用确认弹窗，并允许填写备注、处置日期、出售价格。

## 6. 分类和标签管理页

支持：

- 新增、编辑、删除
- 分类排序
- 标签颜色
- 删除前检查是否有关联资产
- 如果有关联资产，提示用户迁移或解除关联

## 7. 设置页

至少包括：

- 个人资料
- 主题设置
- 数据导出
- 数据备份
- 关于系统

---

# 八、前端工程要求

1. 必须开启 TypeScript 严格模式
2. API 类型必须尽量来自共享 domain 包，避免前后端重复定义
3. 封装统一 API client：
   - 自动添加 Authorization
   - 自动 refresh token
   - 统一错误处理
   - 统一响应类型
4. 所有金额显示通过统一 formatMoney 工具
5. 所有日期显示通过统一 formatDate 工具
6. 所有状态显示使用统一映射配置
7. 所有表单字段使用明确类型，避免 any
8. 加载、空状态、错误状态必须完整
9. UI 文案使用中文
10. 代码注释使用中文或英文均可，但必须清晰
11. 不要使用过度复杂的状态管理；Pinia 仅存用户状态、全局配置、少量缓存状态
12. 页面数据以 composables 形式封装，例如：
   - useAssetList
   - useAssetDetail
   - useDashboard
   - useAuth
   - useDepreciationPreview

---

# 九、移动端预留要求

在 `apps/mobile` 创建最小 uni-app 项目。

仅需实现：

```text
- 项目可启动
- 登录页占位
- 首页占位
- 资产列表占位
- 使用 packages/api-client 调用 API 的示例
- 使用 packages/depreciation 的折旧预览示例
```

要求：

- 使用 Vue 3 Composition API
- 不要复制 domain 类型
- 不要让 mobile 依赖 web 的 Naive UI 组件
- 预留未来 H5、iOS、Android、微信小程序编译配置
- README 中说明移动端后续开发策略：
  - Web 侧重统计、批量管理、导入导出
  - App 侧重扫码、拍照、提醒、离线录入
  - 小程序侧重快速查询和快速录入

---

# 十、Docker 与部署要求

请提供：

```text
Dockerfile.api
Dockerfile.web
docker-compose.yml
.env.example
```

Docker Compose 至少包含：

```text
api
web
```

要求：

- API 数据库文件和上传目录挂载 volume
- Web 使用 Nginx 或 Caddy 提供静态文件
- Web 通过反向代理访问 `/api`
- 环境变量可配置：
  - PORT
  - DATABASE_URL
  - UPLOAD_DIR
  - JWT_ACCESS_SECRET
  - JWT_REFRESH_SECRET
  - ACCESS_TOKEN_EXPIRES_IN
  - REFRESH_TOKEN_EXPIRES_IN
  - CORS_ORIGIN
- README 中提供：
  - 本地启动方式
  - 迁移命令
  - seed 命令
  - 测试命令
  - Docker 启动命令
  - 默认测试账户说明

---

# 十一、测试与质量要求

请至少实现：

1. depreciation 包完整单元测试
2. API 至少有以下集成测试或 e2e 测试：
   - 注册登录
   - 新建资产
   - 获取资产列表
   - 用户隔离
   - 折旧计算接口
   - 导出 CSV
3. ESLint
4. Prettier
5. TypeScript strict
6. 所有 workspace 包都可以独立 typecheck
7. 根目录提供统一命令：

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm docker:up
```

---

# 十二、实现顺序

请严格按以下顺序实施，避免一开始堆砌所有页面：

阶段 1：初始化 monorepo 和基础工程
- pnpm workspace
- turbo
- TypeScript base config
- lint / prettier
- web/api/mobile/packages 骨架

阶段 2：实现 packages/domain 和 packages/depreciation
- 类型、枚举、DTO
- 折旧算法
- 单元测试

阶段 3：实现 API 基础能力
- NestJS + Fastify
- SQLite + Drizzle
- migration
- auth
- Swagger
- seed

阶段 4：实现资产核心 API
- 分类、标签
- 资产 CRUD
- 折旧 profile
- 维修记录
- 状态变更
- 文件上传
- dashboard
- CSV 导出

阶段 5：实现 Web 前端
- 登录注册
- 主布局
- Dashboard
- 资产列表
- 资产表单
- 资产详情
- 分类标签设置

阶段 6：Docker、README、测试与完善
- Docker compose
- API e2e
- 使用文档
- 示例数据
- 移动端骨架验证

---

# 十三、额外约束

1. 不要为了速度牺牲领域模型设计。
2. 不要把折旧计算逻辑写死在 NestJS Service 或 Vue 页面中。
3. 不要把金额以浮点数存储。
4. 不要在数据库里存附件二进制。
5. 不要直接使用 `any`。
6. 不要创建无法运行的“演示级”代码。
7. 不要省略 migration、seed、README、Docker 配置。
8. 不要只实现静态页面，必须前后端打通。
9. 所有 API 必须有明确 DTO 和用户隔离。
10. 第一阶段以“单用户可完整使用”为验收标准，但数据模型必须保留 userId。
11. 未来数据库迁移到 PostgreSQL 时，应尽量只替换 Drizzle dialect 和 migration 配置，而不是推翻业务层。
12. 所有关键计算必须可测试、可解释、可追溯。

---

# 十四、验收标准

完成后应满足：

1. 执行 `pnpm install` 后可正常安装。
2. 执行 `pnpm dev` 可启动 Web 与 API。
3. 可注册一个用户并登录。
4. 可创建分类、标签和资产。
5. 可为资产配置直线法、双倍余额递减法、自定义年折旧率。
6. 资产详情可显示当前账面价值和按月折旧计划。
7. 首页可看到资产总值、累计折旧、分类占比和折旧趋势。
8. 可上传资产图片或发票附件。
9. 可添加维修保养记录。
10. 可将资产标记为出售、报废、丢失或归档。
11. 可导出 CSV。
12. 可通过 Docker Compose 启动。
13. 折旧计算包具备可运行的测试。
14. Web、API、mobile 骨架都能通过 typecheck。
15. README 足够让其他开发者在陌生环境运行项目。

请先创建项目并实现阶段 1 到阶段 3。完成后继续实现后续阶段，不需要等待人工确认。每个阶段结束时输出已完成文件清单、运行命令和已知待办项。
```

---

# 16. 推荐的 Codex 分阶段执行提示词

一次性要求 Codex 完成全量项目，容易导致后半部分页面、测试与文档质量下降。更建议先发送完整提示词，再按阶段推进。

## 16.1 阶段 4：资产核心 API

```text
继续执行阶段 4。请先检查现有仓库结构、已存在的 domain 类型、数据库 schema 和 API 风格，不要重复创建或推翻现有实现。

优先完成：
- 分类、标签；
- 资产 CRUD；
- 折旧 profile；
- 维修记录；
- 附件上传；
- 状态变更；
- Dashboard；
- CSV 导出；
- 备份接口。

要求所有资源按 userId 隔离，沿用现有 DTO、错误处理、Drizzle migration 和 Swagger 风格。完成后运行 typecheck、lint、测试，并修复发现的问题。

输出：
1. 已完成接口；
2. 关键文件；
3. 新增 migration；
4. 测试结果；
5. 已知待办项。
```

## 16.2 阶段 5：Web 管理后台

```text
继续执行阶段 5。请先检查当前已经实现的 API、共享 domain 类型、api-client 和前端工程结构，不要使用 mock 数据，也不要重复定义已有类型。

完成 Web 管理后台，要求页面真实调用 API。重点完成：
- 登录与注册；
- 主布局；
- Dashboard；
- 资产列表；
- 资产新增与编辑；
- 资产详情；
- 分类管理；
- 标签管理；
- 设置页。

要求：
- 使用 Vue 3、TypeScript、Naive UI、Pinia、ECharts；
- UI 中文；
- 金额和日期使用统一工具；
- 支持主题切换；
- 完整处理 loading、empty、error 状态；
- 表单支持折旧预览；
- 页面通过 typecheck 和 build。

完成后运行前端构建、typecheck、lint，并修复问题。

输出：
1. 已完成页面与路由；
2. 已完成 composables；
3. 已完成 API 对接；
4. 构建和测试结果；
5. 已知待办项。
```

## 16.3 阶段 6：部署、测试、文档与移动端骨架

```text
继续执行阶段 6。请检查当前仓库状态并完成部署、文档、测试和移动端最小骨架，不要推翻已完成实现。

完成：
- Dockerfile.api；
- Dockerfile.web；
- docker-compose.yml；
- .env.example；
- API e2e 测试；
- README；
- 示例数据说明；
- apps/mobile 的 uni-app 最小骨架；
- mobile 调用 api-client 示例；
- mobile 调用 depreciation 示例；
- 根目录统一脚本验证。

要求：
- docker compose 可启动 web 与 api；
- SQLite 与上传目录使用 volume；
- Web 可反向代理 /api；
- 所有 workspace 均能 typecheck；
- README 足以供陌生开发者启动、迁移、seed、测试和 Docker 部署。

完成后运行：
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

输出完整结果、失败项（如有）和修复建议。
```
