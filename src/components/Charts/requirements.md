# 通用 ECharts 组件需求

## 功能目标

提供可跨页面复用的 Vue ECharts 容器，统一处理实例创建、配置更新、事件绑定、尺寸自适应和销毁释放，业务页只负责组装 `option` 与事件回调。

不使用 `vue-echarts`。组件内部全量引入 `echarts`，以同时支持折线、柱状、饼图等多种图表类型。

## 使用场景

- 经营看板趋势图、进度分布图等需要自适应容器尺寸的统计图。
- 项目详情模型迭代准确率折线图。
- 后续业务页在 Tab 切换、`keep-alive` 缓存或侧栏折叠后仍需正确重绘的图表。

## 字段与展示内容

- 默认配置按类型拆在 `option/`：`base`（含 `axisOption`）、`line`、`bar`、`pie`；类型识别与 merge 辅助函数在 `option/index.ts`。
- `option`：业务侧 ECharts 配置。组件先按 `series.type` 识别图表类型，再用 lodash `merge` 按 `baseOption` → 图表特定 option（`line` / `bar` / `pie`）→ 业务 `option` 的顺序合并；再按类型把系列默认值 merge 到每一条 series（折线 `symbolSize` / `lineStyle` / `itemStyle`，柱状 `barWidth`，饼图 `radius` / `center` / `avoidLabelOverlap` / `silent` / `labelLine` / `emphasis` / `label`（不含 `formatter`））。业务字段覆盖同名默认值。引用变化时对合并结果执行 `setOption`，默认整份替换（`notMerge: true`），不做深度监听。无 series、无 type 或未登记类型时只合并 `baseOption` 与业务配置。饼图默认将 tooltip `trigger` 覆盖为 `item`。
- `showEmpty`：可选，默认 `false`。为 `true` 时展示组件内空状态（插图与文案分两行水平居中）；为 `false` 时渲染图表画布，即使业务 `option` 数据为空。
- `emptyText`：可选。空状态文案，默认「暂无数据」（`components.charts.empty`）。
- `events`：可选。key 仅允许 ECharts 图形事件、常用组件事件和 `rendered` / `finished`；value 按事件类别收窄 payload。引用变化时先解绑旧回调再绑定新回调。
- 组件根节点铺满父级宽高，由调用方控制图表区域尺寸。
- 通过 `defineExpose` 暴露 `getInstance` 与 `resize`，避免业务页重复持有实例或自行监听窗口尺寸。

## 交互规则

- 同一 DOM 节点只创建一次 ECharts 实例：初始化前通过 `getInstanceByDom` 复用未销毁实例。
- 使用 `ResizeObserver` 观察容器尺寸变化并调用 `resize`；尺寸为 0 时跳过，避免隐藏态把画布压成空白。
- 使用 `IntersectionObserver` 在图表重新进入可视区域时补一次 `resize`，覆盖 `display: none` 的 Tab 面板等场景。
- 位于 `keep-alive` 中时，`activated` 后在下一帧 `resize`；`deactivated` 时断开 Observer，但不 `dispose`，以便恢复缓存状态。
- 组件卸载时解绑事件、断开 Observer 并 `dispose` 实例。

## 状态处理

- 容器尚未挂载或实例已销毁时，忽略 `setOption` / `resize`。
- `option` 就地修改嵌套字段不会触发更新；调用方需替换整个 `option` 对象（例如使用 `computed` 返回新对象）。合并结果是新对象，不改写模块级默认配置，也不向业务 option 回写坐标轴等默认字段。
- 组件在 `showEmpty` 为 `true` 时展示空状态；默认仍渲染图表，空数据由业务 `option` 决定。

## 接口依赖

- 不请求业务接口，不依赖具体页面模块。
- 依赖 `echarts` 官方包的全量入口。

## 验收标准

- 不声明组件 `name`，避免被 `components` 目录的 eager 全局注册打进主包；业务页通过 `import DmCharts` 按需引用。
- 业务页只需传入 `option` / `events`，不必重复 `init`、监听 `resize` 或在卸载时 `dispose`。
- 同一容器多次进入初始化逻辑不会重复 `echarts.init`。
- `option` 引用变化后先按 series 类型与公共默认配置 merge，再按整份配置更新图表。
- 容器尺寸变化、Tab 重新显示、`keep-alive` 激活后图表能铺满当前区域。
- 卸载后事件回调不再触发，实例已销毁。
- 格式检查、ESLint、类型检查和相关测试通过。
