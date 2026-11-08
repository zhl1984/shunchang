# 标签工具关联 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为标签详情增加工具关联弹窗，支持多选标注工具，并将每个工具固定属性一对一关联到当前标签属性。

**Architecture:** 新增独立 `label-tool` Pinia store，分开维护静态工具定义和按 `labelId` 保存的关联配置。弹窗内部维护可丢弃草稿，通过现有标签属性 API 加载下拉选项，保存时一次性替换当前标签关联；详情面板只负责打开弹窗和传递标签 ID。

**Tech Stack:** Vue 3、TypeScript、Pinia、Ant Design Vue、Vue I18n、Less、Vitest。

## Global Constraints

- 业务编码前先更新 `src/views/label-management/requirements.md`。
- 使用 `<script setup lang="ts">`，不得使用 `any`、`@ts-ignore` 或关闭检查规则。
- 工具可多选或全不选；每个已选工具保留全部属性关联项，未关联使用 `propertyId: null`。
- 工具固定定义与标签关联配置必须分开维护。
- 所有用户可见文案维护在 `src/locales/messages/zh-CN.ts`。
- 弹窗根类使用 `label-tool-association-modal`，内部类使用 `ltam-` 前缀，专属 Less 保留在组件内。
- 页面根布局继续保持无滚动条；弹窗内容区域可按设计图独立处理溢出。
- 单文件以 400 行非空代码为柔性目标，新增或修改函数添加用途注释，必要业务分支添加原因注释，注释比例超过 10%。
- 不新增依赖，不实现工具定义 CRUD，不接入后端持久化。
- 不执行 Git 暂存、提交、推送或分支操作。

---

## File Structure

- Modify: `src/views/label-management/requirements.md` — 补充工具关联字段、交互和验收规则。
- Create: `src/stores/label-tool.ts` — 工具定义、标签关联、初始化和副本隔离。
- Create: `src/stores/label-tool.test.ts` — store 数据模型与读写测试。
- Create: `src/views/label-management/components/label-tool-association.ts` — 弹窗草稿构造和工具选择变更的纯函数。
- Create: `src/views/label-management/components/label-tool-association.test.ts` — 草稿映射规则测试。
- Create: `src/views/label-management/components/LabelToolAssociationModal.vue` — 工具多选和属性关联弹窗。
- Create: `src/views/label-management/components/LabelToolAssociationModal.test.ts` — 弹窗回显、取消、保存和标签切换测试。
- Modify: `src/views/label-management/components/LabelDetailPanel.vue` — 接入工具按钮和弹窗。
- Modify: `src/views/label-management/components/LabelDetailPanel.test.ts` — 覆盖标签/分组入口行为。
- Modify: `src/locales/messages/zh-CN.ts` — 工具与弹窗全部展示文案。

---

### Task 1: 工具定义与标签关联 Store

**Files:**
- Modify: `src/views/label-management/requirements.md`
- Create: `src/stores/label-tool.test.ts`
- Create: `src/stores/label-tool.ts`

**Interfaces:**
- Produces: `AnnotationToolProperty`、`AnnotationTool`、`LabelToolPropertyAssociation`、`LabelToolAssociation`。
- Produces: `useLabelToolStore()`，公开 `tools`、`associations`、`initialize()`、`refresh()`、`getAssociations(labelId)`、`setAssociations(labelId, value)`。

- [ ] **Step 1: 更新页面需求文档**

加入工具支持多选/全不选、固定属性一对一关联、`propertyId: null`、取消不保存、五种工具定义、新 store 和验收标准。明确 `bbox`、`mask`、`recist`、`measure`、`lung_segmentation` 的字段与设计文档完全一致。

- [ ] **Step 2: 编写 store 失败测试**

```ts
it("provides the five fixed annotation tools", () => {
  const store = useLabelToolStore();
  expect(store.tools.map((tool) => tool.value)).toEqual([
    "bbox", "mask", "recist", "measure", "lung_segmentation",
  ]);
  expect(store.tools[0]?.properties.map((item) => item.code)).toEqual([
    "region", "long_diameter", "short_diameter",
  ]);
});

it("stores multiple tools including null property associations", () => {
  const store = useLabelToolStore();
  store.setAssociations("label-a", [{
    toolValue: "bbox",
    properties: [
      { code: "region", propertyId: "prop-region" },
      { code: "long_diameter", propertyId: null },
      { code: "short_diameter", propertyId: null },
    ],
  }]);
  expect(store.getAssociations("label-a")[0]?.properties[1]?.propertyId).toBeNull();
});

it("isolates nested copies and supports an empty selection", () => {
  const store = useLabelToolStore();
  store.setAssociations("label-a", bboxAssociations);
  const result = store.getAssociations("label-a");
  result[0]!.properties[0]!.propertyId = "changed";
  expect(store.getAssociations("label-a")).toEqual(bboxAssociations);
  store.setAssociations("label-a", []);
  expect(store.getAssociations("label-a")).toEqual([]);
});
```

- [ ] **Step 3: 运行测试确认 RED**

Run: `yarn.cmd test src/stores/label-tool.test.ts`

Expected: FAIL，`@/stores/label-tool` 尚不存在。

- [ ] **Step 4: 实现 store 和五种工具定义**

使用 `shallowRef` 保存工具数组与 Map；公开读取方法返回工具关联的深副本，写入方法也复制两层数组。工具定义按设计稿写死，属性 `description` 保持可选。`initialize()` 幂等，`refresh()` 恢复 mock 初始数据，后续可替换为 API。

- [ ] **Step 5: 运行 store 测试确认 GREEN**

Run: `yarn.cmd test src/stores/label-tool.test.ts`

Expected: PASS。

---

### Task 2: 弹窗草稿映射规则

**Files:**
- Create: `src/views/label-management/components/label-tool-association.test.ts`
- Create: `src/views/label-management/components/label-tool-association.ts`

**Interfaces:**
- Consumes: Task 1 的工具和关联类型。
- Produces: `createToolAssociationDraft(tools, saved)`。
- Produces: `syncSelectedToolAssociations(tools, current, selectedValues)`。

- [ ] **Step 1: 编写纯函数失败测试**

```ts
it("builds every fixed property and restores saved property ids", () => {
  expect(createToolAssociationDraft(tools, saved)).toEqual([
    {
      toolValue: "bbox",
      properties: [
        { code: "region", propertyId: "prop-region" },
        { code: "long_diameter", propertyId: null },
        { code: "short_diameter", propertyId: null },
      ],
    },
  ]);
});

it("removes deselected tools and restores a reselected tool", () => {
  expect(syncSelectedToolAssociations(tools, saved, [])).toEqual([]);
  const restored = syncSelectedToolAssociations(
    tools,
    saved,
    ["bbox", "mask"],
  );
  expect(restored.map((item) => item.toolValue)).toEqual(["bbox", "mask"]);
  expect(restored[1]?.properties.every((item) => item.propertyId === null)).toBe(true);
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `yarn.cmd test src/views/label-management/components/label-tool-association.test.ts`

Expected: FAIL，模块和函数尚不存在。

- [ ] **Step 3: 实现最小纯函数**

按静态工具顺序输出已选工具；每个已选工具遍历完整固定属性列表，以同 `toolValue + code` 的旧关联恢复 `propertyId`，找不到时使用 `null`。不得保留静态定义中不存在的工具或属性。

- [ ] **Step 4: 运行测试确认 GREEN**

Run: `yarn.cmd test src/views/label-management/components/label-tool-association.test.ts`

Expected: PASS。

---

### Task 3: 工具关联弹窗

**Files:**
- Modify: `src/locales/messages/zh-CN.ts`
- Create: `src/views/label-management/components/LabelToolAssociationModal.test.ts`
- Create: `src/views/label-management/components/LabelToolAssociationModal.vue`

**Interfaces:**
- Props: `open: boolean`、`labelId: string | number | null`。
- Emits: `update:open`。
- Consumes: `useLabelToolStore()`、`getLabelPropertyListApi(labelId)`、Task 2 纯函数。

- [ ] **Step 1: 增加国际化文案**

新增 `labelManagement.tools`：标题“编辑关联工具”、说明、分区标题“标注工具与几何约束”“工具属性关联”、已选数量、未关联、属性占位、取消、保存修改，以及五种工具和全部属性的名称/描述。组件中不硬编码用户可见文案。

- [ ] **Step 2: 编写弹窗失败测试**

使用真实 Pinia+i18n 和轻量 Ant 桩覆盖：已有多工具回显；按当前 `labelId` 查询属性；工具可全不选；属性下拉只含当前标签属性和“未关联”；取消不修改 store；保存替换关联；切换标签重新加载草稿和属性；旧属性请求不能覆盖新标签。

关键断言：

```ts
expect(readSelectedTools(container)).toEqual(["bbox"]);
expect(readPropertyValue(container, "bbox", "region")).toBe("prop-region");
expect(apiMocks.getLabelPropertyListApi).toHaveBeenCalledWith("label-a");

selectTools(container, []);
clickOk(container);
expect(store.getAssociations("label-a")).toEqual([]);

expect(readPropertyOptions(container)).toEqual([
  { value: null, label: "未关联" },
  { value: "prop-a", label: "尺寸" },
]);
```

- [ ] **Step 3: 运行弹窗测试确认 RED**

Run: `yarn.cmd test src/views/label-management/components/LabelToolAssociationModal.test.ts`

Expected: FAIL，组件尚不存在。

- [ ] **Step 4: 实现弹窗状态和模板**

打开或 `labelId` 变化时重新读取 store 关联并调用属性 API；使用请求版本防止旧标签属性覆盖新标签。工具选择使用 checkbox group，多选值同步到完整关联草稿；每个属性选择器写入对应 `propertyId`。取消只 emit 关闭；保存调用 `setAssociations(labelId, draft)` 后关闭。

模板按参考图实现两列工具网格、已选数量、工具卡片和属性选择器。Modal 内容区域允许在视口不足时内部滚动，页面根容器不受影响。

- [ ] **Step 5: 运行弹窗测试确认 GREEN**

Run: `yarn.cmd test src/views/label-management/components/LabelToolAssociationModal.test.ts`

Expected: PASS。

---

### Task 4: 详情面板接入工具弹窗

**Files:**
- Modify: `src/views/label-management/components/LabelDetailPanel.test.ts`
- Modify: `src/views/label-management/components/LabelDetailPanel.vue`

**Interfaces:**
- Consumes: `LabelToolAssociationModal` 的 `open`/`labelId` 接口。
- Preserves: 分组详情无工具按钮；标签详情现有属性加载和竞态防护不变。

- [ ] **Step 1: 扩展详情组件失败测试**

mock 弹窗组件，点击工具按钮后断言弹窗接收 `{ open: true, labelId: "label-a" }`。分组详情断言没有工具按钮和工具弹窗。

- [ ] **Step 2: 运行测试确认 RED**

Run: `yarn.cmd test src/views/label-management/components/LabelDetailPanel.test.ts`

Expected: FAIL，工具按钮未绑定点击且弹窗未挂载。

- [ ] **Step 3: 实现最小接入**

增加 `toolModalOpen` 和带用途注释的 `handleOpenTools()`；按钮绑定点击。仅在 `selectedNode.type === "label"` 时渲染 `LabelToolAssociationModal`，传递当前 `id`。节点切换为分组/空选择时关闭弹窗，避免旧标签草稿继续显示。

- [ ] **Step 4: 运行测试确认 GREEN**

Run: `yarn.cmd test src/views/label-management/components/LabelDetailPanel.test.ts`

Expected: PASS，原有详情状态和属性竞态测试继续通过。

---

### Task 5: 完整验证

**Files:**
- Verify: all modified files.

- [ ] **Step 1: 运行标签工具相关测试**

Run: `yarn.cmd test src/stores/label-tool.test.ts src/views/label-management/components/label-tool-association.test.ts src/views/label-management/components/LabelToolAssociationModal.test.ts src/views/label-management/components/LabelDetailPanel.test.ts`

Expected: 全部 PASS。

- [ ] **Step 2: 运行全量测试和类型检查**

Run: `yarn.cmd test`

Expected: 全部 PASS。

Run: `yarn.cmd type-check`

Expected: exit code 0。

- [ ] **Step 3: 运行相关 Lint 和格式检查**

Run: `yarn.cmd eslint src/stores/label-tool.ts src/stores/label-tool.test.ts src/locales/messages/zh-CN.ts src/views/label-management/components/label-tool-association.ts src/views/label-management/components/label-tool-association.test.ts src/views/label-management/components/LabelToolAssociationModal.vue src/views/label-management/components/LabelToolAssociationModal.test.ts src/views/label-management/components/LabelDetailPanel.vue src/views/label-management/components/LabelDetailPanel.test.ts`

Expected: exit code 0，无 warning。

Run: `yarn.cmd prettier --check src/views/label-management/requirements.md src/stores/label-tool.ts src/stores/label-tool.test.ts src/locales/messages/zh-CN.ts src/views/label-management/components/label-tool-association.ts src/views/label-management/components/label-tool-association.test.ts src/views/label-management/components/LabelToolAssociationModal.vue src/views/label-management/components/LabelToolAssociationModal.test.ts src/views/label-management/components/LabelDetailPanel.vue src/views/label-management/components/LabelDetailPanel.test.ts`

Expected: 全部格式通过。

- [ ] **Step 4: 运行生产构建**

Run: `yarn.cmd build`

Expected: exit code 0；允许已有 `plugin-legacy overrode 'build.target'` 警告。

- [ ] **Step 5: 人工视觉检查**

在 `/label-management` 选择标签并打开工具弹窗，检查五种工具、多选/全不选、BBox/Mask/RECIST/测距/肺段属性卡片、未关联下拉、取消和保存回显。确认浅色/深色主题、长文案、弹窗内部溢出和页面无滚动条表现符合参考图。

---

## Completion Notes

- 完成后报告 store、纯函数、弹窗和详情接入的修改文件与验证结果。
- 明确报告人工视觉检查是否执行。
- 不执行 Git 操作，等待用户决定提交。
