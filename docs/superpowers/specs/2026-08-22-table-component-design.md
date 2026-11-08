# Table 通用表格组件设计

## 1. 目标

建立平台级 `Table` 通用表格组件和配套查询 composable，在保持 Ant Design Vue `a-table` API 兼容的前提下，统一表格查询、过滤、排序、分页和字段管理能力。

组件不推断业务字段含义，不强制状态 Tag、数字对齐或操作列样式；这些属于项目级 UI 规范，由业务列配置和全局样式约束。

## 2. 组件边界

`Table` 负责：

- 全量透传 Ant Design Vue Table Props、原生事件和 Slot。
- 对 `columns` 增加 `visible` 和 `filter` 等平台扩展配置。
- 支持 `client` 和 `service` 两种查询模式。
- 统一管理过滤、排序、分页状态。
- 提供可选的分页配置和字段管理器配置。
- 对查询相关事件进行内部处理后继续向外派发。

`Table` 不负责：

- 直接调用 API 或 Axios。
- 猜测业务字段类型或自动决定 Tag 颜色。
- 管理异步枚举选项加载。
- 替换 Ant Design Vue 原生事件签名和插槽参数。

## 3. Props 设计

组件对外使用 `Table` 命名。TypeScript 类型以 Ant Design Vue `TableProps` 为基础，通过 `Omit` 排除被增强的 `columns` 和 `pagination` 字段，再增加平台配置。

```ts
interface DmTableProps<RecordType extends object>
  extends Omit<AntTableProps<RecordType>, 'columns' | 'pagination'> {
  columns: DmTableColumn<RecordType>[]
  mode?: 'client' | 'service'
  pagination?: DmTablePaginationConfig | false
  columnManager?: DmTableColumnManagerConfig | false
}
```

除 `columns`、`pagination` 和平台新增字段外，其余 Props 原样传给 `a-table`。

## 4. 列配置

列配置保持兼容 Ant Design Vue 原生列类型，仅增加平台扩展字段：

```ts
interface DmTableColumn<RecordType extends object>
  extends AntTableColumn<RecordType> {
  visible?: boolean | {
    value: boolean
    configurable: boolean
  }
  filter?: DmTableFilterConfig
}
```

`visible` 规则：

- `true`：默认显示，允许字段管理器修改。
- `false`：默认隐藏，允许字段管理器开启。
- `{ value, configurable }`：分别表示初始显隐状态和是否允许字段管理器修改。

`filter.type` 支持：

```ts
type DmTableFilterType =
  | 'text'
  | 'enum'
  | 'number'
  | 'date'
  | 'dateRange'
```

枚举过滤由调用方提供选项，组件不负责加载：

```ts
interface DmTableFilterConfig {
  type: DmTableFilterType
  options?: DmTableFilterOption[]
  multiple?: boolean
}
```

## 5. 全量透传要求

### Props

除增强字段外，所有 Ant Design Vue Table Props 通过 `$attrs` 或显式属性原样传递。

### 事件

所有 Ant Design Vue Table 原生事件必须保留原始事件名称、参数和触发时机。内部劫持查询相关事件时，需要先更新内部状态，再继续调用外部监听器。

组件可新增独立的 Vue 事件：

- `query-change`
- `filter-change`
- `sort-change`
- `page-change`
- `column-change`

这些事件不替换原生 `change` 事件，避免破坏已有调用方。

### Slot

所有 `a-table` Slot 原样转发，包括表头、单元格、展开行、空状态和自定义摘要等插槽。插槽名称和参数保持 Ant Design Vue 原始约定，不进行二次包装。

## 6. 查询模式

### Client

组件使用本地 `dataSource` 完成过滤、排序和分页，处理顺序为：

```text
原始数据 → 过滤 → 排序 → 分页切片 → a-table
```

### Service

组件不在前端执行过滤、排序和分页切片，只维护查询状态并通过事件向页面提供查询条件。页面负责调用 API，并将结果和服务端 `total` 重新传入组件。

## 7. useTableQuery

对外只暴露 `useTableQuery`，内部逻辑按职责拆分为过滤状态、排序状态、分页状态、列状态和查询工具模块，以便独立测试。

```ts
const {
  query,
  setFilter,
  setFilters,
  resetFilters,
  getFilters,
  setSorter,
  setSorters,
  resetSort,
  getSorters,
  setPage,
  setPageSize,
  resetPage,
  resetQuery,
  getQuery,
} = useTableQuery()
```

查询状态使用数组保存过滤和排序条件，以支持多条件过滤、同字段多条件以及多列排序。

过滤、排序和页大小变化默认重置到第一页；`setPage` 只修改当前页。外部搜索框必须通过 `setFilter` 或 `setFilters` 修改条件，不能直接修改页码状态。

## 8. 分页与字段管理器

分页配置归纳到 `Table` 的 `pagination`，继续透传 Ant Design Vue Pagination 属性。默认页大小选项为 `10`、`20`、`50`、`100`，具体默认值由项目规范确定。

字段管理器配置归纳到 `Table` 的 `columnManager`，第一阶段支持列显隐和恢复默认；列顺序、持久化和固定列管理作为后续扩展能力。

操作列等关键列建议通过 `configurable: false` 禁止隐藏。

## 9. 项目级视觉规范

- 表头字体加粗并居中。
- 普通列表内容默认左对齐；数字列由业务列显式设置 `align: 'right'`。
- 首个主要业务列通常加粗。
- 状态字段由业务列使用 Tag 展示。
- 操作列通常位于最后，固定在右侧，使用普通文字按钮。
- 删除等高风险操作使用 `danger`。
- 禁用操作提供说明原因的 Tooltip。
- 操作列使用既有 `table-actions-cell` 和 `table-actions` 样式规范。
- 表格占据页面剩余空间，分页支持页大小切换。

## 10. 验收标准

- 现有 `a-table` Props、事件和 Slot 在 `Table` 中保持兼容。
- client 模式正确执行过滤、排序和分页。
- service 模式只派发查询状态，不重复执行前端数据处理。
- 过滤、排序、页大小变化以及外部搜索均能重置到第一页。
- `visible` 和 `configurable` 规则可正确驱动字段管理器。
- 分页和字段管理器均可关闭或通过配置调整。
- 查询状态、字段显隐和事件参数具有明确 TypeScript 类型。
- 不引入 API 层依赖，不在组件内直接发起请求。

## 11. dmFilter 内置过滤器

`Table` 支持在列配置中声明 `dmFilter`，将简单配置转换为 Ant Design Vue 原生列过滤面板。组件不替换调用方显式提供的 `filterDropdown`、`onFilter` 等原生配置。

```ts
type DmFilterType = "text" | "number" | "enum" | "date" | "dateRange";

interface DmFilterConfig {
  type: DmFilterType;
  strict?: boolean;
  options?: DmFilterOption[];
  multiple?: boolean;
}

interface DmFilterOption {
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
}
```

面板规则：

- `text` 使用文本输入。
- `number` 使用最小值和最大值输入，`strict` 默认 `true`。
- `enum` 使用枚举选项，`multiple` 控制单选或多选。
- `date` 使用单日期选择。
- `dateRange` 使用开始日期和结束日期，`strict` 默认 `true`。
- `strict: true` 使用闭区间，`strict: false` 使用开区间。

client 模式由 Table 使用统一过滤值执行本地过滤；service 模式只生成面板并通过 Ant Design Vue 原生 `change` 事件交给调用方。空的过滤值视为未过滤，日期比较使用统一的日期字符串格式和闭/开区间规则。

过滤器实现放在 `src/components/Table/filters/`，转换和过滤逻辑放在 `src/components/Table/utils/dm-filter.ts`。过滤器文案通过 i18n 管理，组件不直接写业务文案。
