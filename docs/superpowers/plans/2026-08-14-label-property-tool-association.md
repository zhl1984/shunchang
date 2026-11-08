# Label Property Tool Association Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace label-level tool association with a property-level modal where each label property can select multiple tools and one concrete tool property per selected tool.

**Architecture:** Keep immutable annotation-tool definitions in the existing Pinia store, but key saved associations by label property ID. A new property-specific modal owns its editable draft and writes a normalized association list back to the store; `LabelDetailPanel` only selects the target property and opens the modal.

**Tech Stack:** Vue 3, TypeScript, Pinia, Ant Design Vue, vue-i18n, Vitest

## Global Constraints

- Do not retain label-level tool association behavior or compatibility structures.
- Do not modify or commit unrelated user changes.
- Do not perform Git commits; the user decides when code is committed.
- Update `src/views/label-management/requirements.md` before component implementation.
- Keep user-visible copy in `src/locales/messages/zh-CN.ts`.
- Keep TypeScript narrowing and non-trivial JavaScript out of Vue templates.
- Use `<script setup lang="ts">`, named `handleXxx` event handlers, scoped component styles, and `ldp-*` / `lptam-*` class prefixes.

---

### Task 1: Replace the label-level data model with property-level associations

**Files:**

- Modify: `src/views/label-management/requirements.md`
- Modify: `src/api/label.ts`
- Modify: `src/api/label.test.ts`
- Modify: `src/stores/label-tool.ts`
- Modify: `src/stores/label-tool.test.ts`
- Delete: `src/views/label-management/components/label-tool-association.ts`
- Delete: `src/views/label-management/components/label-tool-association.test.ts`
- Delete: `src/views/label-management/components/LabelToolAssociationModal.vue`

**Interfaces:**

- Produces: `LabelPropertyToolAssociation = { toolValue: string; toolPropertyCode: string }`
- Produces: `getPropertyAssociations(propertyId: string | number): LabelPropertyToolAssociation[]`
- Produces: `setPropertyAssociations(propertyId: string | number, value: readonly LabelPropertyToolAssociation[]): void`
- Removes: `LabelTreeLeafNode.tools`, `LabelToolAssociation`, `getAssociations`, and `setAssociations`

- [ ] **Step 1: Update the page requirements before implementation**

Replace the requirements that describe a label-level tool button with these rules:

```markdown
- 标签本身不关联工具，标签节点不维护 `tools` 字段。
- 每张属性卡片在编辑按钮左侧提供“关联工具”入口。
- 一个标签属性可以关联多个工具；同一工具只能选择一个具体工具属性。
- 未勾选工具时禁用工具属性下拉框，取消勾选时清空该工具属性。
- 保存时过滤未选择工具属性的记录，允许保存空关联。
```

- [ ] **Step 2: Rewrite store tests to express the new property-level contract**

Use a fixture shaped as:

```ts
const propertyAssociations: LabelPropertyToolAssociation[] = [
  { toolValue: "bbox", toolPropertyCode: "long_diameter" },
  { toolValue: "mask", toolPropertyCode: "volume" },
];
```

Assert that the store keeps five fixed tools, stores multiple tools under `prop-size`, returns defensive array copies, supports an empty selection, and clears property associations during `refresh()`.

- [ ] **Step 3: Run the focused store test and verify it fails**

Run: `yarn.cmd test src/stores/label-tool.test.ts --run`

Expected: FAIL because `LabelPropertyToolAssociation`, `getPropertyAssociations`, and `setPropertyAssociations` do not exist.

- [ ] **Step 4: Implement the property-level store model**

Use this public shape in `src/stores/label-tool.ts`:

```ts
export type LabelPropertyToolAssociation = {
  toolValue: string;
  toolPropertyCode: string;
};

const propertyAssociations = shallowRef<
  Map<string | number, LabelPropertyToolAssociation[]>
>(new Map());
```

`getPropertyAssociations` must return cloned entries. `setPropertyAssociations` must replace the map instance and clone incoming entries. `refresh` must restore tool definitions and clear the map.

- [ ] **Step 5: Remove label-level structures**

Remove `tools?: string[]` from `LabelTreeLeafNode`, remove `tools` from label mock nodes and cloning logic, update affected API fixtures, and delete the old modal/helper/test files listed above.

- [ ] **Step 6: Run the focused API and store tests**

Run: `yarn.cmd test src/api/label.test.ts src/stores/label-tool.test.ts --run`

Expected: PASS with no label `tools` fixtures and property-keyed association assertions passing.

### Task 2: Build and test the property tool association draft behavior

**Files:**

- Create: `src/views/label-management/components/label-property-tool-association.ts`
- Create: `src/views/label-management/components/label-property-tool-association.test.ts`

**Interfaces:**

- Consumes: `AnnotationTool`, `LabelPropertyToolAssociation`
- Produces: `PropertyToolDraftItem = { toolValue: string; checked: boolean; toolPropertyCode?: string }`
- Produces: `createPropertyToolDraft(tools, saved): PropertyToolDraftItem[]`
- Produces: `updatePropertyToolChecked(draft, toolValue, checked): PropertyToolDraftItem[]`
- Produces: `updatePropertyToolCode(draft, toolValue, toolPropertyCode): PropertyToolDraftItem[]`
- Produces: `normalizePropertyToolAssociations(tools, draft): LabelPropertyToolAssociation[]`

- [ ] **Step 1: Write failing helper tests**

Cover these exact behaviors:

```ts
expect(createPropertyToolDraft(tools, saved)).toEqual([
  { toolValue: "bbox", checked: true, toolPropertyCode: "long_diameter" },
  { toolValue: "mask", checked: false, toolPropertyCode: undefined },
]);
```

Also assert that deselecting `bbox` clears `toolPropertyCode`, selecting `mask` preserves an empty code until the user chooses one, and normalization drops unchecked, empty, unknown-tool, and unknown-tool-property entries.

- [ ] **Step 2: Run the helper test and verify it fails**

Run: `yarn.cmd test src/views/label-management/components/label-property-tool-association.test.ts --run`

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement immutable draft helpers**

Each update helper must return a new array and a new object for the changed row. `createPropertyToolDraft` must render one row per current tool definition and only restore a saved code when that code still exists in the corresponding tool definition. `normalizePropertyToolAssociations` must preserve tool display order.

- [ ] **Step 4: Run the helper test**

Run: `yarn.cmd test src/views/label-management/components/label-property-tool-association.test.ts --run`

Expected: PASS.

### Task 3: Add the new property-level modal

**Files:**

- Create: `src/views/label-management/components/LabelPropertyToolAssociationModal.vue`
- Create: `src/views/label-management/components/LabelPropertyToolAssociationModal.test.ts`
- Modify: `src/locales/messages/zh-CN.ts`

**Interfaces:**

- Props: `{ open: boolean; property: LabelProperty | undefined }`
- Emits: `{ "update:open": [value: boolean] }`
- Consumes: property-level store methods and draft helpers from Tasks 1 and 2

- [ ] **Step 1: Add failing component tests**

Mount the modal with Pinia and Chinese i18n. Stub only Ant Design components needed to expose disabled state and emitted changes. Assert:

1. The title is “编辑关联工具” and the description contains the property name.
2. Every store tool renders as one row.
3. An unchecked tool select is disabled.
4. Checking a tool enables its select.
5. Unchecking clears its selected tool property.
6. Confirm saves only checked rows with valid tool properties under the current property ID.
7. Cancel closes without changing the store.

- [ ] **Step 2: Run the modal test and verify it fails**

Run: `yarn.cmd test src/views/label-management/components/LabelPropertyToolAssociationModal.test.ts --run`

Expected: FAIL because the modal does not exist.

- [ ] **Step 3: Add internationalized modal copy**

Add keys under `labelManagement.tools`, including title, property-target description, section title, tool count, select placeholder, cancel, and save labels. Reuse existing tool definition and tool-property translation keys.

- [ ] **Step 4: Implement the modal**

Watch `[props.open, props.property?.id]`. When opening with a property, rebuild the complete draft from store definitions and saved property associations. Use named handlers for checkbox, select, cancel, and submit events. Submit normalized associations through `setPropertyAssociations(props.property.id, normalized)` and close.

The template must render a row shaped like the approved reference: checkbox and tool details on the left, one single-select tool-property control on the right. The content region must remain bounded and scroll internally rather than growing the page.

- [ ] **Step 5: Run the modal and helper tests**

Run: `yarn.cmd test src/views/label-management/components/LabelPropertyToolAssociationModal.test.ts src/views/label-management/components/label-property-tool-association.test.ts --run`

Expected: PASS.

### Task 4: Integrate the property-level entry into the detail panel

**Files:**

- Modify: `src/views/label-management/components/LabelDetailPanel.vue`
- Modify: `src/views/label-management/components/LabelDetailPanel.test.ts`

**Interfaces:**

- Consumes: `LabelPropertyToolAssociationModal` with `open` and `property`
- Removes: detail-header invocation of `LabelToolAssociationModal`

- [ ] **Step 1: Update detail-panel tests first**

Replace the old modal mock with a `LabelPropertyToolAssociationModal` mock that exposes `data-property-id`. Assert that:

1. A label with no properties has no property tool entry.
2. Each rendered property card has one `.ldp-property-tool-action` before its edit action.
3. Clicking the first property tool action opens the modal for `prop-number`.
4. The label header no longer contains `.ldp-tool-button` or label-level “工具” action text.

- [ ] **Step 2: Run the detail-panel test and verify it fails**

Run: `yarn.cmd test src/views/label-management/components/LabelDetailPanel.test.ts --run`

Expected: FAIL because the old header entry still exists and property cards do not open the new modal.

- [ ] **Step 3: Implement the detail-panel integration**

Add `toolProperty` state and a documented `handleOpenPropertyTools(property: LabelProperty)` handler. Remove `handleOpenTools`, the header button, old modal import, old label ID modal prop, and obsolete `.ldp-tool-button` styling. Add a compact property action before edit, using the existing tools internationalization key and a named click handler.

Render the new modal only while a target property exists and the modal is open:

```vue
<LabelPropertyToolAssociationModal
  v-if="toolProperty && toolModalOpen"
  v-model:open="toolModalOpen"
  :property="toolProperty"
/>
```

- [ ] **Step 4: Run the detail-panel test**

Run: `yarn.cmd test src/views/label-management/components/LabelDetailPanel.test.ts --run`

Expected: PASS.

### Task 5: Verify the complete change

**Files:**

- Review all files modified in Tasks 1–4

**Interfaces:**

- Validates the complete property-level flow and confirms the old flow is absent

- [ ] **Step 1: Format only the touched files**

Run Prettier against the explicit changed-file list from Tasks 1–4. Do not format unrelated files.

- [ ] **Step 2: Run focused tests**

Run:

```powershell
yarn.cmd test src/api/label.test.ts src/stores/label-tool.test.ts src/views/label-management/components/label-property-tool-association.test.ts src/views/label-management/components/LabelPropertyToolAssociationModal.test.ts src/views/label-management/components/LabelDetailPanel.test.ts --run
```

Expected: PASS.

- [ ] **Step 3: Run project type checking**

Run: `yarn.cmd type-check`

Expected: exit code 0.

- [ ] **Step 4: Run ESLint on touched TypeScript and Vue files**

Run ESLint with the explicit changed-file list and `--max-warnings=0`.

Expected: exit code 0.

- [ ] **Step 5: Review the diff**

Confirm that `LabelToolAssociationModal.vue`, `label-tool-association.ts`, and their old tests are deleted; no `LabelTreeLeafNode.tools` field remains; only property cards expose the tool entry; and no unrelated files changed.
