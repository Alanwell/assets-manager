# Asset Manager Mobile

基于 uni-app + Vue 3 的最小移动端骨架，可构建 H5，并为 Android、iOS 和微信小程序保留配置入口。

```bash
pnpm --filter @asset-manager/mobile dev
pnpm --filter @asset-manager/mobile build
pnpm --filter @asset-manager/mobile typecheck
```

页面包括首页、登录和资产列表。`src/services/api.ts` 演示复用 `@asset-manager/api-client`，`src/services/depreciation-example.ts` 演示复用 `@asset-manager/depreciation`；领域类型直接来自 `@asset-manager/domain`。

H5 默认请求同源 `/api`，也可设置 `VITE_API_BASE_URL`。后续 App 侧优先实现扫码、拍照、提醒和离线录入，小程序侧优先实现快速查询与快速录入。
