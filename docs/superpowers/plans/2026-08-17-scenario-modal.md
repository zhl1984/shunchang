# 场景配置弹窗实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `/scenario-config` 实现新增、查看、编辑和复制场景的连续滚动弹窗，并完成标签、规则、质量方案联动及 API Mock 持久化。

**Architecture:** 场景 API 维护 Mock 数据与增改查，Pinia Store 只负责列表初始化和刷新。`ScenarioModal.vue` 组织完整纵向表单，标签和规则两个复杂区域分别由专属组件负责，纯 TypeScript 辅助模块承载草稿转换、规则同步和校验逻辑。

**Tech Stack:** Vue 3、TypeScript 5.8、Pinia 2.3、Ant Design Vue 4.2、Vitest 4.1、vue-i18n 11.1。

## Global Constraints

- 使用 Composition API 和 `<script setup lang="ts">`，不使用 `any`、`@ts-ignore` 或关闭检查规则。
- 所有用户可见文案进入 `src/locales/messages/zh-CN.ts`；固定标注类型 `Lung CT annotation` 按需求保留字面值。
- 弹窗是一个从上到下连续滚动页面，标题和底部固定，不使用步骤条、标签页或折叠面板。
- 页面根类保留完整名称，弹窗内部类使用 `scm-`，标签选择器使用 `sls-`，规则选择器使用 `srs-`。
- 单元测试覆盖 TypeScript 逻辑；Vue 测试仅覆盖关键交互，不断言源码字符串或样式声明。
- 不新增依赖，不实现删除功能，不修改标签、规则和质量方案现有公共 API。

---

### Task 1: 场景 API Mock 与 Store 边界

**Files:**

- Modify: `src/api/scenario.ts`
- Modify: `src/stores/scenario.ts`
- Create: `src/api/scenario.test.ts`
- Modify: `src/stores/scenario.test.ts`

**Interfaces:**

- Produces: `Scenario`（`qualityId: string`）、`ScenarioInput`、`getScenarioListApi()`、`getScenarioDetailApi(id)`、`createScenarioApi(input)`、`updateScenarioApi(id, input)`。
- Preserves: `useScenarioStore().initialize()`、`refresh()`、`scenarios`、`status`。

- [ ] **Step 1: 编写 API 失败测试**

在 `src/api/scenario.test.ts` 覆盖：列表返回深拷贝；详情不存在时抛错；新增生成递增数字 ID；更新保留 ID 并替换内容；修改返回对象不会污染 Mock 数据。测试数据必须使用 `qualityId: "quality-plan-001"`。

- [ ] **Step 2: 运行测试并确认失败**

Run: `yarn.cmd test src/api/scenario.test.ts`

Expected: FAIL，原因是详情、新增、更新 API 和 `ScenarioInput` 尚不存在，且 `qualityId` 仍为数字。

- [ ] **Step 3: 实现场景 API Mock**

在 `src/api/scenario.ts` 定义：

```ts
export type ScenarioInput = Omit<Scenario, "id">;
export async function getScenarioDetailApi(id: number): Promise<Scenario>;
export async function createScenarioApi(
  input: ScenarioInput,
): Promise<Scenario>;
export async function updateScenarioApi(
  id: number,
  input: ScenarioInput,
): Promise<Scenario>;
```

将现有占位记录移入 API 模块，使用 `utils.cloneDeep` 隔离所有入参与返回值；名称为空、标签为空或质量方案为空时抛出明确错误。`nextScenarioId` 从当前最大 ID 加一开始。

- [ ] **Step 4: 简化 Store 数据来源**

删除 `src/stores/scenario.ts` 中的 `placeholderScenario`，将 `scenarios` 初始化为空数组；`initialize()` 成功后始终使用 API 返回列表替换 Store 数据，不再保留占位回退分支。更新 Store 测试，等待 `initialize()` 后断言 API Mock 记录已进入 Store。

- [ ] **Step 5: 运行相关测试**

Run: `yarn.cmd test src/api/scenario.test.ts src/stores/scenario.test.ts`

Expected: PASS。

### Task 2: 场景草稿与标签规则同步逻辑

**Files:**

- Create: `src/views/scenario-config/scenario-form.ts`
- Create: `src/views/scenario-config/scenario-form.test.ts`

**Interfaces:**

- Consumes: `Scenario`、`ScenarioInput`、`ScenarioLabel`、`ScenarioRule`、`Rule`、`LabelTreeStoreNode`。
- Produces: `ScenarioModalMode`、`createScenarioDraft()`、`createCopyScenarioDraft()`、`syncScenarioLabels()`、`syncScenarioRules()`、`validateScenarioDraft()`。

- [ ] **Step 1: 编写纯函数失败测试**

覆盖以下行为：新增草稿使用固定标注类型和空选择；复制草稿名称追加 ` - 副本` 且清空项目；标签同步只保留叶子节点并保留已有 `labelType`，新标签默认 `manual`；规则同步只保留适用规则、保留已有启用状态、新规则默认关闭；校验拒绝空名称、空标签和空质量方案。

- [ ] **Step 2: 运行测试并确认失败**

Run: `yarn.cmd test src/views/scenario-config/scenario-form.test.ts`

Expected: FAIL，原因是辅助模块尚不存在。

- [ ] **Step 3: 实现草稿类型和转换函数**

定义：

```ts
export type ScenarioModalMode = "create" | "view" | "edit" | "copy";
export const SCENARIO_LABELING_TYPE = "Lung CT annotation";
export function createScenarioDraft(source?: Scenario): ScenarioInput;
export function createCopyScenarioDraft(source: Scenario): ScenarioInput;
export function syncScenarioLabels(
  current: readonly ScenarioLabel[],
  selectedNodes: readonly LabelTreeStoreNode[],
): ScenarioLabel[];
export function syncScenarioRules(
  current: readonly ScenarioRule[],
  rules: readonly Rule[],
  selectedLabelIds: readonly number[],
): ScenarioRule[];
export function validateScenarioDraft(draft: ScenarioInput): string[];
```

所有函数返回新对象或新数组，不修改传入值；新增方法添加用途注释，条件分支说明业务原因。

- [ ] **Step 4: 运行辅助逻辑测试**

Run: `yarn.cmd test src/views/scenario-config/scenario-form.test.ts`

Expected: PASS。

### Task 3: 标签树与已选标签卡片

**Files:**

- Create: `src/views/scenario-config/components/ScenarioLabelSelector.vue`
- Create: `src/views/scenario-config/components/ScenarioLabelSelector.test.ts`
- Modify: `src/locales/messages/zh-CN.ts`

**Interfaces:**

- Props: `labels: ScenarioLabel[]`、`readonly: boolean`、`loading: boolean`、`tree: LabelTreeStoreNode[]`。
- Emits: `update:labels`，载荷为 `ScenarioLabel[]`。

- [ ] **Step 1: 编写关键交互失败测试**

挂载组件并断言：勾选父组后只向外发出后代标签；新标签类型默认 `manual`；切换类型发出更新数组；取消标签后从数组移除；只读模式不允许改变选择或类型。

- [ ] **Step 2: 运行组件测试并确认失败**

Run: `yarn.cmd test src/views/scenario-config/components/ScenarioLabelSelector.test.ts`

Expected: FAIL，组件尚不存在。

- [ ] **Step 3: 实现标签选择器**

使用 `a-tree` 的关联勾选行为，不启用 `checkStrictly`。左侧展示标签树，右侧展示已选标签卡片和数量；通过标签 Store 映射将勾选 key 转为叶子节点，再调用 `syncScenarioLabels()`。标签类型使用 `a-select`，选项值为 `manual` 与 `pre-annotation`。只读模式禁用树并将类型显示为徽标。

- [ ] **Step 4: 补充国际化文案并运行测试**

Run: `yarn.cmd test src/views/scenario-config/components/ScenarioLabelSelector.test.ts`

Expected: PASS。

### Task 4: 适用规则选择器

**Files:**

- Create: `src/views/scenario-config/components/ScenarioRuleSelector.vue`
- Create: `src/views/scenario-config/components/ScenarioRuleSelector.test.ts`
- Modify: `src/locales/messages/zh-CN.ts`

**Interfaces:**

- Props: `rules: Rule[]`、`value: ScenarioRule[]`、`selectedLabelIds: number[]`、`readonly: boolean`、`loading: boolean`。
- Emits: `update:value`，载荷为包含全部适用规则的 `ScenarioRule[]`。

- [ ] **Step 1: 编写关键交互失败测试**

断言组件只展示匹配已选标签的规则；每条规则卡片按 `enabled` 勾选；单条切换、全选和全不选都会发出包含全部适用规则的数组；只读模式隐藏批量按钮并禁止切换。

- [ ] **Step 2: 运行测试并确认失败**

Run: `yarn.cmd test src/views/scenario-config/components/ScenarioRuleSelector.test.ts`

Expected: FAIL，组件尚不存在。

- [ ] **Step 3: 实现规则选择器**

使用 `syncScenarioRules()` 生成展示模型。规则卡片显示名称和说明，启用状态通过复选框控制；批量按钮使用普通按钮并保持 `8px` 间距。没有适用规则时显示国际化空态，不将无关规则写入草稿。

- [ ] **Step 4: 运行规则选择器测试**

Run: `yarn.cmd test src/views/scenario-config/components/ScenarioRuleSelector.test.ts`

Expected: PASS。

### Task 5: 连续滚动场景弹窗

**Files:**

- Create: `src/views/scenario-config/components/ScenarioModal.vue`
- Create: `src/views/scenario-config/components/ScenarioModal.test.ts`
- Modify: `src/locales/messages/zh-CN.ts`

**Interfaces:**

- Props: `open`、`mode: ScenarioModalMode`、`scenario: Scenario | null`、`detailLoading`、`submitting`。
- Emits: `update:open`、`submit`；`submit` 载荷为 `ScenarioInput`。
- Consumes: 标签 Store、规则 Store、`getQualityPlanListApi()`、两个选择器组件及场景草稿辅助函数。

- [ ] **Step 1: 编写模式与提交失败测试**

覆盖：新增显示空草稿；查看禁用全部控件且只显示关闭；编辑回填原记录；复制追加副本名称并清空项目；标签变化后规则同步；缺少名称、标签或质量方案时不提交；有效草稿发出深拷贝；提交中禁止关闭。

- [ ] **Step 2: 运行弹窗测试并确认失败**

Run: `yarn.cmd test src/views/scenario-config/components/ScenarioModal.test.ts`

Expected: FAIL，弹窗尚不存在。

- [ ] **Step 3: 实现弹窗结构和加载流程**

使用 `a-modal`，宽度约 `980px`，`wrap-class-name="scenario-modal-wrap"`，中间 `.scm-body` 设置可用视口高度和纵向滚动。四个编号区块依次渲染：基础信息、`ScenarioLabelSelector`、`ScenarioRuleSelector`、质量方案选择。打开弹窗时初始化标签和规则 Store，并加载全部质量方案选项。

- [ ] **Step 4: 实现校验、模式差异和提交**

使用 `a-form` 校验名称和标注类型，额外通过 `validateScenarioDraft()` 校验标签和质量方案。查看模式只显示关闭；新增和复制显示“创建并检查配置”；编辑显示“保存修改”。提交发出深拷贝，不直接调用场景 API。

- [ ] **Step 5: 运行弹窗测试**

Run: `yarn.cmd test src/views/scenario-config/components/ScenarioModal.test.ts`

Expected: PASS。

### Task 6: 页面接入四种模式与 API 提交

**Files:**

- Modify: `src/views/scenario-config/index.vue`
- Modify: `src/locales/messages/zh-CN.ts`
- Modify: `docs/requirements/scenario-config.md`

**Interfaces:**

- Consumes: `ScenarioModal`、场景详情/新增/更新 API、`useScenarioStore().refresh()`。
- Produces: 新增、查看、编辑和复制按钮的完整前端流程。

- [ ] **Step 1: 增加页面模式状态和具名处理函数**

维护 `modalOpen`、`modalMode`、`activeScenario`、`detailLoading`、`submitting`。新增按钮直接打开 `create`；查看、编辑、复制先调用 `getScenarioDetailApi(record.id)`，成功后打开对应模式，失败时使用国际化错误提示。

- [ ] **Step 2: 接入提交编排**

`create` 与 `copy` 调用 `createScenarioApi(input)`，`edit` 调用 `updateScenarioApi(activeScenario.id, input)`；成功后刷新 Store、关闭弹窗并显示成功提示，失败时保留弹窗草稿并显示错误。

- [ ] **Step 3: 绑定列表按钮和弹窗**

为新增、查看、编辑、复制按钮绑定具名处理函数；删除按钮继续无业务行为。挂载 `ScenarioModal` 并传递模式、详情加载和提交状态。

- [ ] **Step 4: 同步文案和需求文档**

在 `scenarioConfig` 命名空间补齐弹窗标题、四个区块、字段、占位符、标签类型、规则批量操作、校验、加载、空态、重试和成功/失败反馈。检查需求文档与最终交互一致。

- [ ] **Step 5: 运行完整验证**

Run:

```powershell
yarn.cmd prettier --check src/api/scenario.ts src/api/scenario.test.ts src/stores/scenario.ts src/stores/scenario.test.ts src/views/scenario-config src/locales/messages/zh-CN.ts docs/requirements/scenario-config.md
yarn.cmd eslint src/api/scenario.ts src/api/scenario.test.ts src/stores/scenario.ts src/stores/scenario.test.ts src/views/scenario-config src/locales/messages/zh-CN.ts --max-warnings=0
yarn.cmd type-check
yarn.cmd test src/api/scenario.test.ts src/stores/scenario.test.ts src/views/scenario-config/scenario-form.test.ts src/views/scenario-config/components/ScenarioLabelSelector.test.ts src/views/scenario-config/components/ScenarioRuleSelector.test.ts src/views/scenario-config/components/ScenarioModal.test.ts
```

Expected: 所有命令退出码为 `0`，测试无失败或警告。

### Task 7: 场景删除与项目引用保护

**Files:**

- Modify: `src/api/scenario.ts`
- Modify: `src/api/scenario.test.ts`
- Modify: `src/views/scenario-config/index.vue`
- Modify: `src/locales/messages/zh-CN.ts`

- [ ] API 更新和删除操作拒绝处理 `projectList` 不为空的场景。
- [ ] 列表禁用已被引用场景的编辑、删除按钮并展示 Tooltip。
- [ ] 删除确认成功后刷新列表，并处理当前页最后一条记录的分页回退。
- [ ] 运行场景 API 测试、类型检查、ESLint 和格式检查。
