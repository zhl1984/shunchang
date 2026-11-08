# 项目新建与查看弹窗第一阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成项目新建/查看四步弹窗骨架、统一步骤组件协议、KeepAlive 会话状态和分步表单转换边界，不接入具体业务字段接口或创建请求。

**Architecture:** 在项目管理页面内新增 `ProjectModal` 编排组件和四个步骤组件。外层以 `ProjectFormDraft` 保存四段快照，动态组件通过 `defineExpose` 暴露 `validate`/`getForm`，并使用 `KeepAlive` 保持切换状态。后端详情 DTO 与前端分步模型之间通过独立转换工具隔离。

**Tech Stack:** Vue 3 Composition API、TypeScript、Ant Design Vue、Vue Test Utils/Vitest、Vue I18n。

## Global Constraints

- 遵循 `AGENTS.md`、`docs/requirements/form-modal-guidelines.md` 及项目现有样式工具类。
- 所有组件使用 `<script setup lang="ts">`，不使用 `any`、`@ts-ignore` 或硬编码模拟业务数据。
- 表单弹窗居中，最大高度 `90vh`，Body 内部滚动，采用标准 Header/Body/Footer；按钮提交时显示 Loading。
- 新建模式步骤条不可点击且下一步必须校验；查看模式步骤条可点击且不校验。
- 关闭弹窗必须清理草稿、详情、校验状态和 KeepAlive 缓存；不提交代码。

## 文件结构

- Create: `src/views/project-management/components/ProjectModal.vue` — 弹窗编排、步骤条、导航、模式和会话生命周期。
- Create: `src/views/project-management/components/ProjectBasicInfoStep.vue` — 基础信息步骤外壳与步骤协议。
- Create: `src/views/project-management/components/ProjectSceneStep.vue` — 标注场景步骤外壳与步骤协议。
- Create: `src/views/project-management/components/ProjectMemberStep.vue` — 团队成员步骤外壳与步骤协议。
- Create: `src/views/project-management/components/ProjectDataSourceStep.vue` — 数据来源步骤外壳与步骤协议。
- Create: `src/views/project-management/types.ts` — 模式、步骤、四段表单模型及公开接口类型。
- Create: `src/views/project-management/utils.ts` — `fromProjectDetail`、`toCreateProjectParams` 和安全默认值转换。
- Modify: `src/views/project-management/index.vue` — 接入新建/查看按钮、弹窗开关和刷新回调。
- Modify: `src/api/project.ts` — 补齐创建参数/详情类型与 API 函数，但第一阶段不在 UI 中发起创建。
- Modify: `src/locales/messages/zh-CN.ts` — 增加弹窗标题、步骤、导航、加载和错误文案。
- Test: `src/views/project-management/utils.test.ts` — 转换函数测试。
- Test: `src/views/project-management/project-modal.test.ts` — 导航、校验、KeepAlive 和模式行为测试。

### Task 1: 定义分步类型与转换边界

**Files:** `types.ts`, `utils.ts`, `utils.test.ts`, `src/api/project.ts`

- [ ] 定义 `ProjectModalMode`、`ProjectStepKey`、`ProjectStepExpose<TForm>`、`ProjectFormDraft` 及四个步骤表单类型。
- [ ] 在 API 层定义 `CreateProjectParams`、`ProjectDetail` 和迭代配置类型，并实现 `getProjectDetailApi`、`createProjectApi` 的统一响应码检查；允许 UI 暂不调用创建函数。
- [ ] 编写转换测试，覆盖详情字段完整、`iterationConfig` 缺失、成员数组缺失和空值安全默认值。
- [ ] 实现 `fromProjectDetail(detail): ProjectFormDraft` 与 `toCreateProjectParams(draft): CreateProjectParams`，确保步骤组件不依赖后端 DTO。
- [ ] 运行 `yarn test src/views/project-management/utils.test.ts`，确认转换行为通过。

### Task 2: 建立四个步骤组件协议

**Files:** 四个 `*Step.vue`, `types.ts`

- [ ] 每个组件接收 `mode` 与本步骤 `modelValue`，内部使用独立响应式状态，并通过 `defineExpose` 暴露 `validate(): Promise<void>` 与 `getForm()`。
- [ ] 新建模式提供可被后续字段替换的表单容器；查看模式统一只读且不执行校验。
- [ ] `getForm()` 返回浅拷贝/结构化副本，避免外层修改内部状态。
- [ ] 保持每个文件职责单一，使用稳定组件前缀和 scoped 样式；第一阶段只显示结构占位，不填充模拟业务选项。
- [ ] 运行 `yarn type-check`，确认四组件公开接口与泛型类型一致。

### Task 3: 实现 ProjectModal 编排与 KeepAlive 会话

**Files:** `ProjectModal.vue`, `types.ts`, locales

- [ ] 实现 `open(mode, projectCode?)` 所需的 props/emit 约定、当前步骤、步骤状态、四段草稿和详情加载状态。
- [ ] 使用动态组件 + `<KeepAlive :key="sessionKey">` 缓存步骤；关闭时递增 session key 并重置草稿/详情。
- [ ] 新建模式下一步按 `validate -> getForm -> merge snapshot -> next` 执行；校验失败保持当前步骤。
- [ ] 查看模式允许步骤条点击，导航不调用 `validate`；底部继续显示上一步/下一步，最后一步提供关闭。
- [ ] 第四步创建按钮只完成最后一步校验、快照和 `toCreateProjectParams` 汇总，并通过 emit 暴露待提交参数，不发送请求。
- [ ] 处理详情 Loading/失败状态、提交 Loading 状态和按钮禁用状态。

### Task 4: 接入项目管理页面

**Files:** `src/views/project-management/index.vue`

- [ ] 启用新建按钮，打开 create 模式；查看按钮传入 `projectCode` 打开 view 模式。
- [ ] 监听弹窗的 created/closed 事件；第一阶段 created 仅保留刷新回调入口，实际请求保持关闭。
- [ ] 保持现有列表查询、统计和删除逻辑不变，不混入无关重构。

### Task 5: 编写交互测试并执行验证

**Files:** `project-modal.test.ts`, 如需补充四组件测试文件

- [ ] 测试新建模式步骤条不可点击，当前步骤 `validate` reject 时不切换且不采集快照。
- [ ] 测试成功前进会调用 `validate`、`getForm` 并覆盖对应步骤快照；返回修改后再次前进使用最新数据。
- [ ] 测试查看模式可点击任意步骤且不调用校验。
- [ ] 测试 KeepAlive 切换保留状态，关闭后重新打开状态清空。
- [ ] 运行 `yarn test src/views/project-management/project-modal.test.ts src/views/project-management/utils.test.ts`。
- [ ] 运行 `yarn format:check`、`yarn lint`、`yarn type-check`；记录未执行或环境阻塞项，不声称未运行的检查已通过。

## 交付检查

- [ ] 对照设计文档逐项确认模式、步骤、转换、异常和测试覆盖。
- [ ] 确认工作区仅包含本计划涉及的文件及用户已有改动，不提交代码。
