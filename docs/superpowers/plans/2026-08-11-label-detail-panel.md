# 标签详情面板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在标签管理页面根据左侧选中节点展示分组或标签详情，并通过独立 mock API 展示标签属性。

**Architecture:** 页面入口只保存选中节点 ID 并向下传递；`LabelDetailPanel` 使用 label store 的 `mapping` 解析节点，通过 `src/api/label.ts` 按 `labelId` 加载属性。标签属性与标签树节点解耦，不新增 Pinia store，标签删除时由 API 层级联清理属性。

**Tech Stack:** Vue 3、TypeScript、Pinia、Ant Design Vue、Vue I18n、Less、Vitest、Vue Test Utils 风格的原生 `createApp` 测试挂载。

## Global Constraints

- 开始业务编码前，先同步更新 `src/views/label-management/requirements.md`。
- 使用 Vue Composition API 和 `<script setup lang="ts">`，不得使用 `any`、`@ts-ignore` 或关闭检查规则。
- 所有用户可见文案维护在 `src/locales/messages/zh-CN.ts`。
- 组件专属 Less 保留在组件的 `<style scoped lang="less">` 中；根类使用 `label-detail-panel`，内部类使用 `ldp-` 前缀。
- 页面保持固定画布且不产生滚动条；属性超出可用高度时裁切。
- 单文件以 400 行非空代码为柔性目标，新增或修改函数添加用途注释，必要业务分支添加原因注释，注释比例超过 10%。
- 不引入新依赖，不新增属性 Pinia store，不实现属性按钮交互。
- 不执行 Git 暂存、提交、推送或分支操作，Git 操作由用户决定。

---

## File Structure

- Modify: `src/views/label-management/requirements.md` — 记录详情面板、属性字段、状态和接口验收规则。
- Modify: `src/api/label.ts` — 维护属性类型、独立 mock 列表、CRUD、枚举规范化和标签删除级联。
- Modify: `src/api/label.test.ts` — 覆盖属性 CRUD、数据隔离、类型字段清理和标签删除级联。
- Modify: `src/locales/messages/zh-CN.ts` — 增加详情、字段、类型、状态标记和空值文案。
- Replace: `src/views/label-management/components/LabelDetailPanel.vue` — 实现未选择、分组、标签及属性列表状态。
- Create: `src/views/label-management/components/LabelDetailPanel.test.ts` — 覆盖详情组件的数据加载和渲染分支。
- Modify: `src/views/label-management/index.vue` — 保存树选择并传递 `nodeId`。
- Create: `src/views/label-management/index.test.ts` — 覆盖树选择到详情面板的页面编排。

---

### Task 1: 同步页面需求文档并定义属性 API 契约

**Files:**
- Modify: `src/views/label-management/requirements.md`
- Modify: `src/api/label.test.ts`
- Modify: `src/api/label.ts`

**Interfaces:**
- Produces: `LabelPropertyType`、`LabelPropertyValue`、`LabelPropertyOption`、`LabelProperty`。
- Produces: `getLabelPropertyListApi(labelId)`、`createLabelPropertyApi(input)`、`updateLabelPropertyApi(id, input)`、`deleteLabelPropertyApi(id)`。
- Changes: `LabelTreeLeafNode` 不再包含 `props`。

- [ ] **Step 1: 更新需求文档**

在 `src/views/label-management/requirements.md` 中将右侧占位描述替换为已确认的三种详情状态，并补充：

```md
- 未选择节点时展示“选择分组或者标签查看详情”。
- 选择分组时只展示名称和描述，不展示任何操作按钮。
- 选择标签时展示名称、描述、标签编码、静态工具按钮和属性区域。
- 标签属性独立于标签树数据，以 labelId 关联；删除标签时级联删除属性。
- 页面及详情属性区域不产生滚动条，超出固定高度的内容裁切。
```

同时在字段、接口依赖和验收标准中写入设计文档定义的属性类型、枚举规范化规则和 CRUD 签名。

- [ ] **Step 2: 先修改 API 测试表达新契约**

将旧的 `label.props` 断言改为节点不含 `props`，并新增以下测试结构：

```ts
it("maintains label properties separately from tree nodes", async () => {
  const { getLabelPropertyListApi, getLabelTreeNodeListApi } =
    await loadLabelApi();
  const nodes = await getLabelTreeNodeListApi();
  const label = nodes.find((node) => node.type === "label");

  expect(label).toBeDefined();
  expect(label).not.toHaveProperty("props");

  const properties = await getLabelPropertyListApi(label!.id);
  expect(properties.every((item) => item.labelId === label!.id)).toBe(true);
});

it("normalizes enum options and keeps returned values isolated", async () => {
  const { createLabelPropertyApi, getLabelPropertyListApi } =
    await loadLabelApi();
  const created = await createLabelPropertyApi({
    labelId: "label-nodule",
    code: "LEVEL",
    name: "等级",
    description: "枚举规范化",
    type: "enum",
    defaultValue: ["high"],
    readonly: false,
    required: true,
    optionsMultiple: true,
    options: [
      { value: "high" },
      { label: "低" },
      { value: "", label: "" },
    ],
  });

  expect(created.options).toEqual([
    { value: "high", label: "high" },
    { value: "低", label: "低" },
  ]);
  created.options?.push({ value: "external", label: "external" });
  const queried = await getLabelPropertyListApi("label-nodule");
  expect(queried.find((item) => item.id === created.id)?.options).not.toContainEqual(
    { value: "external", label: "external" },
  );
});

it("clears fields that do not apply to the updated type", async () => {
  const { createLabelPropertyApi, updateLabelPropertyApi } =
    await loadLabelApi();
  const created = await createLabelPropertyApi({
    labelId: "label-nodule",
    code: "SIZE",
    name: "尺寸",
    type: "number",
    defaultValue: 1,
    min: 0,
    max: 10,
    unit: "mm",
    readonly: false,
    required: false,
  });
  const updated = await updateLabelPropertyApi(created.id, {
    type: "text",
    defaultValue: "正常",
  });

  expect(updated.labelId).toBe("label-nodule");
  expect(updated).not.toHaveProperty("min");
  expect(updated).not.toHaveProperty("max");
  expect(updated).not.toHaveProperty("unit");
});

it("deletes properties directly and when their label is deleted", async () => {
  const {
    createLabelPropertyApi,
    createLabelTreeNodeApi,
    deleteLabelPropertyApi,
    deleteLabelTreeNodeApi,
    getLabelPropertyListApi,
  } = await loadLabelApi();
  const label = await createLabelTreeNodeApi({
    pid: null,
    type: "label",
    name: "级联测试标签",
    code: "CASCADE_LABEL",
    description: "",
  });
  const first = await createLabelPropertyApi({
    labelId: label.id,
    code: "FIRST",
    name: "属性一",
    type: "boolean",
    defaultValue: false,
    readonly: false,
    required: false,
  });
  await deleteLabelPropertyApi(first.id);
  expect(await getLabelPropertyListApi(label.id)).toEqual([]);

  await createLabelPropertyApi({
    labelId: label.id,
    code: "SECOND",
    name: "属性二",
    type: "text",
    defaultValue: null,
    readonly: false,
    required: false,
  });
  await deleteLabelTreeNodeApi(label.id);
  expect(await getLabelPropertyListApi(label.id)).toEqual([]);
});
```

- [ ] **Step 3: 运行 API 测试并确认失败**

Run: `yarn test src/api/label.test.ts`

Expected: FAIL，原因包括属性 API 尚未导出，以及旧节点仍包含 `props`。

- [ ] **Step 4: 实现属性类型和 mock 数据**

在 `src/api/label.ts` 中定义设计稿的公开类型，并将叶子节点改为：

```ts
export type LabelTreeLeafNode = LabelTreeNodeBase & {
  type: "label";
  code: string;
  tools?: string[];
};
```

新增独立属性数据：

```ts
let mockLabelProperties: LabelProperty[] = [
  {
    id: "prop-component",
    labelId: "label-nodule",
    code: "COMPONENT",
    name: "成分",
    description: "甲状腺结节的成分属性",
    type: "enum",
    defaultValue: null,
    readonly: false,
    required: true,
    options: [
      { value: "solid", label: "实性" },
      { value: "mixed", label: "囊实性" },
      { value: "cystic", label: "囊性" },
    ],
    optionsMultiple: false,
  },
];
```

同步删除标签 mock 节点中的 `props`，并简化 `cloneLabelTreeNode()`，只克隆 `tools`。

- [ ] **Step 5: 实现属性规范化与 CRUD**

使用明确的输入类型：

```ts
export type LabelPropertyInput = Omit<LabelProperty, "id">;
export type LabelPropertyUpdate = Partial<
  Omit<LabelProperty, "id" | "labelId">
>;
```

实现私有辅助函数：

```ts
function normalizeLabelPropertyOptions(
  options: LabelPropertyOption[] | undefined,
): LabelPropertyOption[] | undefined;

function normalizeLabelProperty(property: LabelProperty): LabelProperty;

function cloneLabelProperty(property: LabelProperty): LabelProperty;
```

`normalizeLabelProperty()` 必须执行：

- `number` 保留 `min`、`max`、`unit`，清除枚举字段。
- `enum` 保留规范化后的 `options`、`optionsMultiple`，清除数值字段。
- 其他类型清除数值和枚举专属字段。
- 枚举空选项过滤；单边填写时补齐另一边。

实现四个公开 API，并在删除标签分支追加：

```ts
mockLabelProperties = mockLabelProperties.filter(
  (property) => property.labelId !== id,
);
```

- [ ] **Step 6: 运行 API 测试并确认通过**

Run: `yarn test src/api/label.test.ts`

Expected: PASS，且原有分组删除规则测试继续通过。

---

### Task 2: 实现详情面板的三种状态和属性渲染

**Files:**
- Modify: `src/locales/messages/zh-CN.ts`
- Create: `src/views/label-management/components/LabelDetailPanel.test.ts`
- Replace: `src/views/label-management/components/LabelDetailPanel.vue`

**Interfaces:**
- Consumes: `nodeId: string | number | null`。
- Consumes: `useLabelStore().mapping`、`getLabelPropertyListApi(labelId)`。
- Produces: 未选择、分组、标签和属性空态/列表视图。

- [ ] **Step 1: 增加国际化文案**

在 `labelManagement` 下新增：

```ts
detail: {
  emptySelection: "选择分组或者标签查看详情",
  emptyValue: "暂无",
  actions: {
    tools: "工具",
    addProperty: "属性",
    editProperty: "编辑属性",
    deleteProperty: "删除属性",
  },
  fields: {
    labelCode: "标签编码",
    propertyCode: "属性编码",
    defaultValue: "默认值",
    min: "最小值",
    max: "最大值",
    unit: "单位",
    options: "选项",
  },
  property: {
    empty: "暂无属性",
    required: "必填",
    readonly: "只读",
    single: "单选",
    multiple: "多选",
    types: {
      number: "数值",
      text: "文本",
      date: "日期",
      boolean: "布尔",
      enum: "枚举",
    },
  },
},
```

- [ ] **Step 2: 编写详情组件失败测试**

在新测试文件中 mock `getLabelTreeNodeListApi` 和 `getLabelPropertyListApi`，使用真实 Pinia 和 i18n 挂载组件。至少覆盖：

```ts
it("renders the selection empty state for a null node id", async () => {
  const mounted = mountDetail(null);
  await flushView();
  expect(mounted.container.textContent).toContain(
    "选择分组或者标签查看详情",
  );
  expect(apiMocks.getLabelPropertyListApi).not.toHaveBeenCalled();
});

it("renders only name and description for a group", async () => {
  const mounted = mountDetail("group-a");
  await flushView();
  expect(mounted.container.textContent).toContain("影像标签");
  expect(mounted.container.textContent).toContain("分组描述");
  expect(mounted.container.textContent).not.toContain("标签编码");
  expect(mounted.container.textContent).not.toContain("属性");
});

it("renders label metadata and the property empty state", async () => {
  apiMocks.getLabelPropertyListApi.mockResolvedValue([]);
  const mounted = mountDetail("label-a");
  await flushView();
  expect(mounted.container.textContent).toContain("结节");
  expect(mounted.container.textContent).toContain("LABEL_A");
  expect(mounted.container.textContent).toContain("工具");
  expect(mounted.container.textContent).toContain("暂无属性");
});

it("renders property type, flags, constraints and enum options", async () => {
  apiMocks.getLabelPropertyListApi.mockResolvedValue(propertyFixtures);
  const mounted = mountDetail("label-a");
  await flushView();
  expect(mounted.container.textContent).toContain("数值");
  expect(mounted.container.textContent).toContain("必填");
  expect(mounted.container.textContent).toContain("只读");
  expect(mounted.container.textContent).toContain("mm");
  expect(mounted.container.textContent).toContain("枚举");
  expect(mounted.container.textContent).toContain("多选");
});
```

增加一个延迟 Promise 用例：先选择标签 A，再切换标签 B，最后才完成 A 请求，断言最终只展示 B 的属性。

- [ ] **Step 3: 运行组件测试并确认失败**

Run: `yarn test src/views/label-management/components/LabelDetailPanel.test.ts`

Expected: FAIL，当前组件没有 `nodeId` prop，也没有真实详情和属性请求。

- [ ] **Step 4: 实现节点解析和属性加载**

在 `LabelDetailPanel.vue` 中声明：

```ts
const props = defineProps<{
  nodeId: string | number | null;
}>();

const labelStore = useLabelStore();
const selectedNode = computed(() =>
  props.nodeId === null ? undefined : labelStore.mapping.get(props.nodeId),
);
const properties = shallowRef<LabelProperty[]>([]);
const propertiesLoading = ref(false);
let requestVersion = 0;
```

监听 `selectedNode`：

- 非标签时递增请求版本、清空属性并结束。
- 标签时记录当前版本，调用 `getLabelPropertyListApi(node.id)`。
- 仅当前版本仍有效时写入结果和 loading 状态。
- 请求失败时清空属性，保留标签基础详情。

添加用途注释说明版本号用于避免节点快速切换产生过期结果覆盖。

- [ ] **Step 5: 实现模板和格式化辅助函数**

实现并注释以下函数：

```ts
function formatPropertyValue(property: LabelProperty): string;
function formatPropertyOptions(property: LabelProperty): string;
```

模板使用互斥分支：

```vue
<a-empty v-if="!selectedNode" ... />
<template v-else-if="selectedNode.type === 'group'">...</template>
<template v-else>...</template>
```

标签属性卡片必须展示：名称、编码、描述、类型、默认值；按条件展示必填、只读、数值约束、单位、枚举选项与单选/多选。工具、新增属性、编辑、删除按钮不绑定事件。

- [ ] **Step 6: 实现固定画布样式**

替换占位骨架样式，保持：

```less
.label-detail-panel {
  height: 100%;
  overflow: hidden;

  :deep(.ant-card-body) {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
  }

  .ldp-properties {
    min-height: 0;
    flex: 1;
    overflow: hidden;
  }
}
```

标题和编码使用单行省略，描述使用多行裁切；颜色使用现有 `--dm-*` 变量，字号优先使用全局字体类。

- [ ] **Step 7: 运行详情组件测试并确认通过**

Run: `yarn test src/views/label-management/components/LabelDetailPanel.test.ts`

Expected: PASS。

---

### Task 3: 接通标签树选择与详情面板

**Files:**
- Create: `src/views/label-management/index.test.ts`
- Modify: `src/views/label-management/index.vue`

**Interfaces:**
- Consumes: `LabelTreePanel` 的 `select(id | null)` 事件。
- Produces: `LabelDetailPanel` 的 `nodeId` prop。

- [ ] **Step 1: 编写页面编排失败测试**

mock 两个子组件，使标签树按钮依次发出分组 ID、标签 ID 和 `null`，详情桩通过属性暴露当前值：

```ts
it("passes the latest tree selection to the detail panel", async () => {
  const mounted = mountPage();
  expect(readDetailNodeId(mounted.container)).toBe("");

  clickSelection(mounted.container, "group-a");
  await nextTick();
  expect(readDetailNodeId(mounted.container)).toBe("group-a");

  clickSelection(mounted.container, "label-a");
  await nextTick();
  expect(readDetailNodeId(mounted.container)).toBe("label-a");

  clickClearSelection(mounted.container);
  await nextTick();
  expect(readDetailNodeId(mounted.container)).toBe("");
});
```

- [ ] **Step 2: 运行页面测试并确认失败**

Run: `yarn test src/views/label-management/index.test.ts`

Expected: FAIL，当前页面未监听 `select`，也未传递 `nodeId`。

- [ ] **Step 3: 实现最小页面编排**

在 `index.vue` 中增加：

```ts
type LabelNodeId = string | number;

const selectedNodeId = ref<LabelNodeId | null>(null);

/** 同步标签树当前选择，供右侧详情面板消费。 */
function handleSelectNode(id: LabelNodeId | null): void {
  selectedNodeId.value = id;
}
```

模板改为：

```vue
<LabelTreePanel @select="handleSelectNode" />
<LabelDetailPanel :node-id="selectedNodeId" />
```

- [ ] **Step 4: 运行页面测试并确认通过**

Run: `yarn test src/views/label-management/index.test.ts`

Expected: PASS。

---

### Task 4: 回归验证和格式质量检查

**Files:**
- Verify only: all modified files and existing label management tests.

**Interfaces:**
- Consumes: Tasks 1–3 的最终实现。
- Produces: 可交付的验证证据，不执行 Git 操作。

- [ ] **Step 1: 运行标签模块相关测试**

Run:

```powershell
yarn test src/api/label.test.ts src/stores/label.test.ts src/views/label-management/components/create-label-group.test.ts src/views/label-management/components/LabelGroupModal.test.ts src/views/label-management/components/LabelModal.test.ts src/views/label-management/components/LabelTreePanel.test.ts src/views/label-management/components/LabelDetailPanel.test.ts src/views/label-management/index.test.ts
```

Expected: 全部 PASS，现有标签树 CRUD、搜索、选择和删除行为无回归。

- [ ] **Step 2: 运行全量测试**

Run: `yarn test`

Expected: 全部 PASS。

- [ ] **Step 3: 运行类型检查**

Run: `yarn type-check`

Expected: exit code 0，无 TypeScript 或 Vue 模板类型错误。

- [ ] **Step 4: 运行相关文件 ESLint**

Run:

```powershell
yarn eslint src/api/label.ts src/api/label.test.ts src/locales/messages/zh-CN.ts src/views/label-management/index.vue src/views/label-management/index.test.ts src/views/label-management/components/LabelDetailPanel.vue src/views/label-management/components/LabelDetailPanel.test.ts
```

Expected: exit code 0，无 warning。

- [ ] **Step 5: 检查相关文件格式**

Run:

```powershell
yarn prettier --check src/views/label-management/requirements.md src/api/label.ts src/api/label.test.ts src/locales/messages/zh-CN.ts src/views/label-management/index.vue src/views/label-management/index.test.ts src/views/label-management/components/LabelDetailPanel.vue src/views/label-management/components/LabelDetailPanel.test.ts
```

Expected: 所有文件格式通过。若失败，只对上述相关文件执行 `yarn prettier --write ...`，然后重新检查。

- [ ] **Step 6: 运行生产构建**

Run: `yarn build`

Expected: exit code 0；允许保留项目已有的 `plugin-legacy overrode 'build.target'` 警告，不得出现新增构建错误。

- [ ] **Step 7: 人工检查固定布局**

在 `/label-management` 依次检查未选择、分组、无属性标签和有属性标签：

- 页面和右侧面板不出现横向或纵向滚动条。
- 超量属性被面板裁切，不撑高页面。
- 长名称、描述和编码不溢出卡片。
- 浅色、深色主题下文字、边框和状态标签均清晰。
- 静态按钮可见，但点击后不产生业务行为。

---

## Completion Notes

- 完成后向用户报告修改内容、影响文件、测试数量、类型检查、Lint、格式和构建结果。
- 明确说明人工视觉检查是否执行；未执行时列为剩余验证项。
- 不暂存或提交文件，等待用户决定后续 Git 操作。
