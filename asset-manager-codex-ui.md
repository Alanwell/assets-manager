请对当前 asset-manager 的 Web 前端进行“视觉重构”，不要修改现有后端 API、领域模型、路由语义和业务流程，不要使用 mock 数据。

当前问题：

- 页面过度依赖 Naive UI 默认样式；
- Dashboard 像传统管理后台；
- ECharts 图表过于默认；
- 缺少品牌感、视觉重点和资产管理产品的高级感；
- 希望达到现代 SaaS、个人财富仪表盘、数字资产档案馆的效果。

总体要求：

1. 保留 Vue 3、TypeScript、Pinia、现有 API Client、现有业务逻辑。
2. 保留 ECharts，但重构图表主题、Tooltip、坐标轴、网格、动画、颜色和交互。
3. Naive UI 不再负责页面视觉，只保留复杂交互控件，例如 DatePicker、Select、DataTable、Dialog、Drawer、Upload、Message。
4. 引入 Tailwind CSS、shadcn-vue、Lucide Icons；若引入成本过高，可自行实现等价的基础组件，但不得只靠 Naive UI 默认样式。
5. 新建统一设计系统：
   - colors
   - spacing
   - radius
   - shadows
   - typography
   - dark/light theme
   - status colors
   - chart colors
6. UI 文案保持中文。
7. 页面必须真实调用现有 API，不得使用静态 mock 数据。
8. 保持响应式设计，桌面优先，兼容平板和手机。

视觉方向：

- 风格：轻奢财富仪表盘 + 数字资产档案馆；
- 浅色背景：暖灰白；
- 深色背景：石墨黑；
- 强调色：香槟金；
- 辅助正向色：低饱和墨绿；
- 风险色：低饱和珊瑚红；
- 大量留白、低对比边框、柔和阴影；
- 圆角为 16px 到 24px；
- 避免廉价渐变和大面积高饱和蓝紫色；
- 使用 Lucide Icon，不使用 emoji 作为主要图标；
- 动画克制，hover、展开、数字变化可有 150ms 到 300ms 微动效。

请按以下顺序执行：

第一步：建立设计系统

- 创建 src/styles/tokens.css 或等价文件；
- 定义 light/dark CSS variables；
- 定义字体、字号、间距、圆角、阴影、卡片、状态色；
- 创建 AppShell、PageHeader、MetricCard、SectionCard、StatusBadge、EmptyState、AssetCover 等基础组件；
- 为现有 Naive UI 做必要主题覆盖，但不要继续直接依赖其默认视觉。

第二步：重做应用布局

- 左侧 sidebar 做成现代深色或半透明侧栏；
- 顶部显示当前页面、搜索入口、主题切换、用户菜单；
- 增加页面过渡动画；
- 调整内容最大宽度和留白；
- 首页与资产页避免满屏密集表格。

第三步：重做 Dashboard

- 顶部做欢迎 Hero 区，包含总资产净值、本月变化、资产健康度和“新增资产”主按钮；
- 将普通 KPI 卡重构为更有层级的 MetricCard；
- 使用一个大面积“净资产趋势”主图；
- 使用分类组成图、资产状态分布图；
- 增加“本月关注事项”：保修将到期、高折旧资产、待保养资产；
- 增加最近录入资产卡片列表；
- 图表应有自定义 tooltip、低干扰坐标轴、平滑曲线、渐变面积、hover 高亮。

第四步：重做资产列表

- 默认提供卡片视图，表格视图作为可切换模式；
- 卡片展示封面图、名称、分类、状态、当前账面价值、市场估值、折旧进度、购买日期；
- 支持筛选、搜索、排序；
- 卡片 hover 有轻微上浮和边框高亮；
- 表格视图仍可保留 Naive DataTable，但外层、筛选栏、工具栏必须与新设计系统一致。

第五步：重做资产详情

- 顶部做 AssetDetailHero：大图、名称、分类、状态、当前账面价值、市场估值、累计折旧；
- 中间使用“价值趋势 + 资产档案 + 保修状态”布局；
- 维修记录、附件、状态变更使用时间线和卡片；
- 风险操作例如出售、报废、丢失放在明显但克制的操作区域；
- 图片附件做成有质感的网格画廊。

第六步：图表主题

- 创建统一的 chartTheme 与 chartOptions 工具；
- 统一 Tooltip、Legend、Grid、Axis、Animation、Color；
- 不要默认显示密集网格线；
- 小型趋势使用 Sparkline；
- 大图使用 ECharts；
- 避免饼图过多，分类资产结构优先使用环形图或横向排名条形图。

第七步：验证

- 不修改现有接口契约；
- 不破坏登录、资产创建、编辑、详情、导出等功能；
- 执行 pnpm typecheck；
- 执行 pnpm lint；
- 执行 pnpm build；
- 修复所有错误；
- 输出已修改的主要文件、设计系统说明和后续可优化项。
