# Table 通用表格组件实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏 Ant Design Vue `a-table` API 的前提下，建立统一的 `Table` 组件、`useTableQuery` 查询状态 composable、字段管理器和表格规范。

**Architecture:** `Table` 通过 `$attrs`、事件合并和 `$slots` 全量透传 `a-table`；平台增强字段仅扩展 `columns`、分页和字段管理器配置。`useTableQuery` 对外统一出口，内部按过滤、排序、分页、列状态拆分为可测试模块；API 请求仍由页面和 `src/api` 负责。

**Tech Stack:** Vue 3、TypeScript、Ant Design Vue 4、Pinia（不新增依赖）、Vitest/现有测试工具、Less。

## Global Constraints

- 使用 Vue Composition API 和 `<script setup lang="ts">`。
- 不使用 `any`、`@ts-ignore` 或关闭检查规则。
- 所有请求继续托管在 `src/api/`，组件不直接调用 Axios。
- 全量透传 Ant Design Vue Table Props、原生事件和 Slot。
- `visible: false` 表示默认隐藏但可配置；对象形式使用 `configurable` 控制是否可配置。
- `mode` 仅支持 `'client' | 'service'`；service 模式不执行前端过滤、排序和分页切片。
- 过滤、排序、页大小变化默认回到第一页；外部搜索必须通过查询 composable 更新条件。

## 文件结构

- Create: `src/components/Table/index.vue` — Table 组件入口、属性和插槽/事件透传。
- Create: `src/components/Table/types.ts` — 列、过滤、分页、字段管理器和查询类型。
- Create: `src/components/Table/ColumnManager.vue` — 字段显隐和恢复默认 UI。
- Create: `src/components/Table/index.ts` — 公共导出。
- Create: `src/composables/table/useTableQuery.ts` — 对外查询 composable。
- Create: `src/composables/table/useTableFilterState.ts` — 过滤状态内部实现。
- Create: `src/composables/table/useTableSortState.ts` — 排序状态内部实现。
- Create: `src/composables/table/useTablePaginationState.ts` — 分页状态内部实现。
- Create: `src/composables/table/table-query-utils.ts` — 查询更新、分页重置和参数转换纯函数。
- Create: `src/composables/table/useTableQuery.test.ts` — 查询行为测试。
- Create: `src/components/Table/index.test.ts` — 关键组件行为测试。
- Create: `src/components/Table/requirements.md` — 组件需求文档，包含透传和验收规则。
- Modify: `src/styles/ant-design/table.less` — 仅补充确有需要的 Table 级通用样式。
- Modify: `src/components/index.ts` — 注册和导出 Table。

### Task 1: 建立类型契约和需求文档

**Interfaces:** 产出 `DmTableColumn`、`DmTableFilterConfig`、`DmTablePaginationConfig`、`DmTableColumnManagerConfig`、`TableQueryState` 类型，供后续组件和 composable 使用。

- [ ] 编写 `src/components/Table/requirements.md`，明确功能目标、字段、透传规则、状态处理、接口边界和验收标准。
- [ ] 在 `types.ts` 中定义 `DmTableFilterType = 'text' | 'enum' | 'number' | 'date' | 'dateRange'`，枚举选项支持外部 `options` 和 `multiple`，不加入 `placeholder` 或异步加载字段。
- [ ] 定义 `visible?: boolean | { value: boolean; configurable: boolean }`，并定义服务端多条件 `filters`、`sorters` 数组类型。
- [ ] 为所有公开类型补充用途注释。
- [ ] 运行 `yarn.cmd type-check`，确认类型文件无独立错误。

### Task 2: 实现查询状态 composable

**Interfaces:** `useTableQuery()` 对外提供 `setFilter`、`setFilters`、`resetFilters`、`getFilters`、`setSorter`、`setSorters`、`resetSort`、`getSorters`、`setPage`、`setPageSize`、`resetPage`、`resetQuery`、`getQuery`。

- [ ] 先在 `useTableQuery.test.ts` 编写失败测试：过滤变化重置页码、排序变化重置页码、页大小变化重置页码、`setPage` 保留过滤排序、重置查询清空全部条件、多条件数组保持顺序。
- [ ] 运行 `yarn.cmd test src/composables/table/useTableQuery.test.ts`，确认测试因实现缺失失败。
- [ ] 实现内部过滤、排序、分页状态模块和纯工具函数；默认页码为 1，默认页大小为 10。
- [ ] 让更新方法支持 `{ resetPage?: boolean }`，默认开启，供特殊场景显式关闭。
- [ ] 运行同一测试，确认全部通过。

### Task 3: 实现 Table 组件透传和模式处理

**Interfaces:** `Table` 接收完整增强 Props，继续透传未接管属性；新增 `query-change`、`filter-change`、`sort-change`、`page-change`、`column-change` 事件，同时保留原生事件签名和原生 Slot。

- [ ] 先编写组件测试：原生 Slot 可见、原生事件继续触发、过滤事件派发统一事件、service 模式不改变传入数据、client 模式按查询状态处理数据。
- [ ] 运行组件测试，确认缺少组件实现时失败。
- [ ] 使用 `useAttrs`/模板属性透传和 `$slots` 转发实现 `a-table` 包装；对查询相关事件采用“内部状态更新后继续调用外部监听”的合并策略。
- [ ] 实现 `client` 模式的过滤、排序、分页切片；`service` 模式仅派发查询状态并使用外部 `dataSource` 与 `total`。
- [ ] 保留 `columns` 原始列配置，渲染前仅根据 `visible` 生成可见列，不修改调用方对象。
- [ ] 运行组件测试和 `yarn.cmd type-check`。

### Task 4: 实现字段管理器

**Interfaces:** `columnManager?: DmTableColumnManagerConfig | false`；列管理器输出 `column-change`，只能修改 `configurable !== false` 的列。

- [ ] 编写测试：默认显隐解析、不可配置列不能隐藏、恢复默认、列变更事件携带稳定 key 和显隐结果。
- [ ] 实现 `ColumnManager.vue`，使用 Ant Design Vue 表单控件，文案通过项目 i18n 处理。
- [ ] 在 `Table` 中接入管理器入口和可选 Slot，不持久化完整列定义；暂不实现拖拽排序、后端持久化和固定列管理。
- [ ] 运行字段管理器测试和组件测试。

### Task 5: 对齐项目级样式与文档

- [ ] 检查 `src/styles/ant-design/table.less`，复用现有 `table-actions-cell` 和 `table-actions`，只补充表格容器占满剩余空间、分页区域等确有需要的通用规则。
- [ ] 更新 `docs/requirements/styles/table-actions.md`，补充 Table 组件透传边界、操作列固定和禁用 Tooltip 规则。
- [ ] 检查现有表格页面，记录迁移要求但不在本任务中批量重构业务页面。
- [ ] 运行 `yarn.cmd prettier --write` 处理新增文件，再运行 `yarn.cmd lint`、`yarn.cmd type-check` 和相关测试。

### Task 6: 导出、回归和交付

- [ ] 从 `src/components/index.ts` 和 composable 入口导出公共 API，确认路径别名使用 `@/`。
- [ ] 运行 `yarn.cmd format:check`、`yarn.cmd lint`、`yarn.cmd type-check`、`yarn.cmd build` 及 Table 相关测试。
- [ ] 检查 service 模式的事件参数与 API 层分页结构映射，确认组件没有网络请求依赖。
- [ ] 汇总修改文件、验证结果和未迁移页面，按 Conventional Commits 创建提交。
