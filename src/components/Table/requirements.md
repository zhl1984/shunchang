# Table 通用表格组件需求

## 功能目标

提供兼容 Ant Design Vue `a-table` 的平台级表格包装组件，统一查询状态、分页和可选字段管理能力。

平台标题使用 `tableTitle`，保留原生 `title` 属性用于透传 Ant Design Vue 的标题渲染能力。

## 使用场景

- `mode="client"`：前端数据集执行过滤、排序和分页。
- `mode="service"`：组件仅维护查询状态，页面通过 API 获取数据。
- `mode` 默认使用 `client`；client 模式由组件统一执行筛选、排序和分页，service 模式仅抛出查询状态。
- 两种模式统一通过 `filter` 事件对外通知查询变化，payload 使用`filters`、`sort` 和 `paginate`。
- `sorter: true` 按列 `dataIndex` 执行默认排序；传入排序函数时复用调用方比较函数。
- 不再支持 Ant Design Vue 原生查询事件；开发环境传入 `onChange`、`onFilter`、`onSort`、`onPageChange` 或 `onPaginationChange` 时抛出错误。

## 字段与展示

- 组件根容器默认使用完整宽度和高度，铺满调用方提供的可用空间。
- Pagination 和字段管理器默认开启，分别传入 `pagination: false` 或 `columnManager: false` 可关闭。
- 字段管理器使用拖拽调整列顺序；采用原生 HTML5 Drag and Drop，不新增第三方依赖。
- `fixed` 列不可取消展示；恢复默认同时恢复初始显隐和列顺序。
- 未显式关闭 `showHeader` 时，保持 Ant Design Vue 默认展示列标题行。
- 表格数据区默认在剩余高度内滚动，表头固定展示，分页固定在组件底部。
- 横向滚动条位于表体底部、分页上方，不得被分页遮挡或挤出组件容器。
- 表体内容未超过可用高度时不展示纵向滚动条，超出后再按需展示。
- 空数据且非加载状态使用 a-table 原生 `emptyText` 行展示空态，表头和空态保持在同一个表格内部；调用方可通过 `emptyText` Slot 自定义内容，原生 `locale` 不被改写，列头和分页继续展示且保持可交互。
- 调用方传入的 `scroll.x` 和显式 `scroll.y` 保持优先，组件仅补充缺省的容器高度滚动。
- `columns` 兼容 Ant Design Vue 原生列配置。
- 列可使用 `visible` 控制默认显隐，使用 `configurable` 控制字段管理器是否允许修改。
- 过滤类型支持 `text`、`enum`、`number`、`date` 和 `dateRange`。
- 枚举选项由调用方通过 `options` 提供，组件不负责异步加载。

## 交互规则

- 过滤、排序和页大小变化默认回到第一页。
- 非受控分页在 `dataSource` 引用变化时自动回到第一页；显式传入 `pagination.current` 时由调用方管理页码。
- 外部搜索、过滤、排序和分页使用 Ant Design Vue `a-table` 原生能力。
- `setPage` 只修改当前页。
- 所有原生 Table Props、事件和 Slot 必须继续透传。
- 组件新增 `query-change`、`filter-change`、`sort-change`、`page-change` 和 `column-change` 事件。

## 状态处理

- 支持加载、空数据和服务端 total 透传。
- service 模式不执行前端过滤、排序和分页切片。
- client 模式按过滤、排序、分页切片顺序处理数据。
- 不在组件内调用 API 或 Axios。

## 验收标准

- 原生 `a-table` 调用方无需修改即可迁移到 `Table`。
- 查询状态具有明确 TypeScript 类型。
- 字段显隐规则和分页重置规则可通过单元测试验证。
