# Label Tree Node Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hover edit/delete actions to label-tree nodes, reuse the existing forms for create and edit modes, and enforce the confirmed group deletion rules.

**Architecture:** Rename the two create-only modals into mode-aware node modals and keep their form, API call, store refresh, and feedback responsibilities inside each modal. Keep node action orchestration in `LabelTreePanel.vue`; extend the mock API so deletion can cascade through group-only subtrees while rejecting any subtree that contains a label.

**Tech Stack:** Vue 3 Composition API, TypeScript, Pinia, Ant Design Vue, Vue I18n, Vitest, Less.

## Global Constraints

- Do not introduce new dependencies.
- Do not validate group-move cycles in the UI; the backend is the final safeguard.
- Preserve the fixed no-scroll page layout.
- Keep component-specific Less inside the Vue components.
- Keep source files near 400 non-empty lines where practical; slightly exceeding is acceptable.
- Add purposeful comments to new or changed functions and business-condition branches.
- Do not stage or commit changes; the user decides Git actions.

---

### Task 1: Extend label deletion API semantics

**Files:**

- Modify: `src/api/label.test.ts`
- Modify: `src/api/label.ts`

**Interfaces:**

- Consumes: `deleteLabelTreeNodeApi(id: string | number): Promise<void>`
- Produces: The same public signature with group-only subtree cascading and label-descendant rejection.

- [ ] **Step 1: Replace the old non-empty-group test with explicit subtree cases**

Add tests that create:

```ts
const root = await createLabelTreeNodeApi({
  pid: null,
  type: "group",
  name: "待删除根分组",
  description: "",
});
const child = await createLabelTreeNodeApi({
  pid: root.id,
  type: "group",
  name: "待删除子分组",
  description: "",
});
```

Assert that deleting `root.id` removes both IDs. Add a second test with a label under a nested child and assert:

```ts
await expect(deleteLabelTreeNodeApi(root.id)).rejects.toThrow(
  `Label group contains labels: ${String(root.id)}`,
);
```

- [ ] **Step 2: Run the API test and verify the cascade case fails**

Run:

```powershell
yarn.cmd vitest run src/api/label.test.ts
```

Expected: the group-only subtree test fails because the current API rejects any group with a direct child.

- [ ] **Step 3: Implement descendant collection without changing the public API**

Inside `deleteLabelTreeNodeApi()`, collect the target group and all descendants by repeatedly matching `pid`. If any collected descendant has `type === "label"`, throw the explicit error. Otherwise remove every collected group ID:

```ts
const deletingIds = new Set<string | number>([id]);
let foundDescendant = true;

while (foundDescendant) {
  foundDescendant = false;
  for (const item of mockLabelTreeNodes) {
    if (
      item.pid !== null &&
      deletingIds.has(item.pid) &&
      !deletingIds.has(item.id)
    ) {
      deletingIds.add(item.id);
      foundDescendant = true;
    }
  }
}

const containsLabel = mockLabelTreeNodes.some(
  (item) => item.type === "label" && deletingIds.has(item.id),
);
```

Keep label deletion as a single-ID removal. Comment why a group-only subtree can cascade and why labels block the operation.

- [ ] **Step 4: Run the API test and verify all cases pass**

Run:

```powershell
yarn.cmd vitest run src/api/label.test.ts
```

Expected: all label API tests pass.

---

### Task 2: Generalize shared modal form helpers

**Files:**

- Modify: `src/views/label-management/components/create-label-group.test.ts`
- Modify: `src/views/label-management/components/create-label-group.ts`

**Interfaces:**

- Produces: `type LabelModalMode = "create" | "edit"`
- Produces: `resolveNodeParentPath(node: LabelTreeNode, mapping: ReadonlyMap<...>): Array<string | number>`
- Produces: update-input builders returning `LabelTreeNodeUpdate`.

- [ ] **Step 1: Add failing helper tests for edit paths and update payloads**

Cover:

```ts
expect(resolveNodeParentPath(groupNode, mapping)).toEqual(["root-group"]);
expect(resolveNodeParentPath(rootNode, mapping)).toEqual([NO_PARENT_VALUE]);
expect(buildLabelGroupUpdate(formValues)).toEqual({
  name: "新分组名",
  description: "新说明",
  pid: "root-group",
});
expect(buildLabelUpdate(labelFormValues)).toEqual({
  name: "新标签名",
  description: "新说明",
  pid: "root-group",
  code: "NEW_CODE",
});
```

- [ ] **Step 2: Run the helper test and verify the new exports are missing**

Run:

```powershell
yarn.cmd vitest run src/views/label-management/components/create-label-group.test.ts
```

Expected: FAIL because the edit helper exports do not exist.

- [ ] **Step 3: Add the minimal typed helper exports**

Reuse the existing parent-value conversion in one private function:

```ts
function resolveParentId(parentPath: readonly (string | number)[]) {
  const parentValue = parentPath[parentPath.length - 1];
  return parentValue === undefined || parentValue === NO_PARENT_VALUE
    ? null
    : parentValue;
}
```

Use it from both create and update builders. Keep the existing filename for minimal scope even though the modal components are renamed.

- [ ] **Step 4: Run the helper test and verify it passes**

Run:

```powershell
yarn.cmd vitest run src/views/label-management/components/create-label-group.test.ts
```

Expected: all helper tests pass.

---

### Task 3: Rename and generalize the group modal

**Files:**

- Rename: `src/views/label-management/components/CreateLabelGroupModal.vue` to `src/views/label-management/components/LabelGroupModal.vue`
- Rename: `src/views/label-management/components/CreateLabelGroupModal.test.ts` to `src/views/label-management/components/LabelGroupModal.test.ts`
- Modify: `src/views/label-management/components/LabelGroupModal.vue`
- Modify: `src/views/label-management/components/LabelGroupModal.test.ts`

**Interfaces:**

- Props: `mode: LabelModalMode`, `groupVisible: boolean`, `nodeId: string | number | null`
- Emits: `saved: [node: LabelGroupTreeNode]`, `"update:groupVisible": [visible: boolean]`

- [ ] **Step 1: Rename the files and update the test import only**

Use a filesystem rename that preserves history. Update the test to import `LabelGroupModal.vue` and verify the renamed component still exposes the existing create behavior.

- [ ] **Step 2: Add failing tests for edit title, form backfill, and update API**

Mock `updateLabelTreeNodeApi`. Mount with:

```ts
{
  mode: "edit",
  groupVisible: true,
  nodeId: "group-a",
}
```

Assert the title contains “编辑分组”, the fields contain the mapping node values, and submit calls:

```ts
updateLabelTreeNodeApi("group-a", {
  name: "编辑后的分组",
  description: "编辑后的说明",
  pid: "group-b",
});
```

Also assert the component emits `saved` and closes with `update:groupVisible`.

- [ ] **Step 3: Run the group modal test and verify edit mode fails**

Run:

```powershell
yarn.cmd vitest run src/views/label-management/components/LabelGroupModal.test.ts
```

Expected: FAIL because mode-aware copy, backfill, and update submission are not implemented.

- [ ] **Step 4: Implement mode-aware form initialization and submission**

Define:

```ts
const isEditMode = computed(() => props.mode === "edit");
```

In `resetForm()`, edit mode reads the group from `labelStore.mapping`, copies `name` and `description`, and resolves the current parent path. Create mode keeps the existing selected-node default-parent behavior.

In `handleSubmit()`, call `updateLabelTreeNodeApi(props.nodeId, buildLabelGroupUpdate(formModel))` for edit mode and the existing create API otherwise. Validate that the returned node is a group, refresh the store, emit `saved`, and use mode-specific success/error messages.

- [ ] **Step 5: Update component names and style wrapper names**

Use `defineOptions({ name: "LabelGroupModal" })`, `label-group-modal`, and keep the existing `lgm-` or current stable short-prefix style convention consistently within the component.

- [ ] **Step 6: Run the group modal test and verify create/edit modes pass**

Run:

```powershell
yarn.cmd vitest run src/views/label-management/components/LabelGroupModal.test.ts
```

Expected: all group modal tests pass.

---

### Task 4: Rename and generalize the label modal

**Files:**

- Rename: `src/views/label-management/components/CreateLabelModal.vue` to `src/views/label-management/components/LabelModal.vue`
- Rename: `src/views/label-management/components/CreateLabelModal.test.ts` to `src/views/label-management/components/LabelModal.test.ts`
- Modify: `src/views/label-management/components/LabelModal.vue`
- Modify: `src/views/label-management/components/LabelModal.test.ts`

**Interfaces:**

- Props: `mode: LabelModalMode`, `labelVisible: boolean`, `nodeId: string | number | null`
- Emits: `saved: [node: LabelTreeLeafNode]`, `"update:labelVisible": [visible: boolean]`

- [ ] **Step 1: Rename files and add failing edit-mode tests**

Mount with an existing label ID and assert “编辑标签”, name, parent path, code, and description are backfilled.

- [ ] **Step 2: Assert the edit payload**

After changing form values, assert:

```ts
updateLabelTreeNodeApi("label-a", {
  name: "编辑后的标签",
  description: "编辑后的说明",
  pid: "group-b",
  code: "EDITED_LABEL",
});
```

Assert `saved` emits the updated label and `update:labelVisible` emits `false`.

- [ ] **Step 3: Run the label modal test and verify edit mode fails**

Run:

```powershell
yarn.cmd vitest run src/views/label-management/components/LabelModal.test.ts
```

Expected: FAIL because the renamed modal does not yet support edit mode.

- [ ] **Step 4: Implement mode-aware reset and submit logic**

Edit mode reads only a `type === "label"` node from mapping, copies all editable fields, and resolves the current parent path. Create mode preserves existing behavior. Submit through create or update API according to mode, refresh the store, emit `saved`, and show mode-specific feedback.

- [ ] **Step 5: Run the label modal test and verify both modes pass**

Run:

```powershell
yarn.cmd vitest run src/views/label-management/components/LabelModal.test.ts
```

Expected: all label modal tests pass.

---

### Task 5: Add hover actions and deletion orchestration to the tree panel

**Files:**

- Modify: `src/views/label-management/components/LabelTreePanel.test.ts`
- Modify: `src/views/label-management/components/LabelTreePanel.vue`

**Interfaces:**

- Consumes: `LabelGroupModal`, `LabelModal`, `deleteLabelTreeNodeApi()`
- Uses: Ant Design Vue `Modal.confirm`, `message.warning`, `EditOutlined`, `DeleteOutlined`

- [ ] **Step 1: Update modal mocks and add failing node-action tests**

Rename modal mocks and expose `mode`, `nodeId`, and visibility through data attributes. Add tests that click action buttons carrying the node ID and assert:

- Group edit opens `LabelGroupModal` with `mode="edit"`.
- Label edit opens `LabelModal` with `mode="edit"`.
- Action clicks do not emit tree selection.
- Each rendered node has edit and delete controls.

- [ ] **Step 2: Add failing deletion-flow tests**

Mock `Modal.confirm`, `message.warning`, and `deleteLabelTreeNodeApi`. Cover:

- Label: confirm opens with “删除标签”; `onOk` deletes and refreshes.
- Empty group: confirm opens with “删除分组”.
- Group with a nested label: warning equals `"${groupName} 分组下面有标签，不能删除！"`; no confirm and no API call.
- Group-only subtree: no confirm; delete API is called immediately.

- [ ] **Step 3: Run the tree panel test and verify action/deletion tests fail**

Run:

```powershell
yarn.cmd vitest run src/views/label-management/components/LabelTreePanel.test.ts
```

Expected: FAIL because action controls and deletion orchestration are absent.

- [ ] **Step 4: Add edit state and reusable saved-state synchronization**

Replace create-only visible refs with modal mode and target state:

```ts
const groupModalVisible = ref(false);
const labelModalVisible = ref(false);
const groupModalMode = ref<LabelModalMode>("create");
const labelModalMode = ref<LabelModalMode>("create");
const modalNodeId = ref<LabelNodeId | null>(null);
```

Extract the existing post-create path/selection behavior into a saved-node handler that also supports edited nodes and their new parent paths.

- [ ] **Step 5: Render the hover operation controls**

Inside `.ltp-node`, keep the icon/name area flexible and append:

```vue
<span class="ltp-node-actions">
  <a-button type="text" :aria-label="..." @click.stop="handleEditNode(node)">
    <EditOutlined />
  </a-button>
  <a-button type="text" danger :aria-label="..." @click.stop="handleDeleteNode(node)">
    <DeleteOutlined />
  </a-button>
</span>
```

Use opacity/visibility and `:hover` plus `:focus-within` so keyboard focus also reveals the actions. Ensure the name block can shrink and ellipsize without moving the buttons outside the fixed panel.

- [ ] **Step 6: Implement descendant-label detection and delete branching**

Use the current tree node children rather than adding a global utility:

```ts
function containsDescendantLabel(node: LabelTreeStoreNode): boolean {
  return (node.children ?? []).some(
    (child) =>
      child.type === "label" ||
      (child.type === "group" && containsDescendantLabel(child)),
  );
}
```

For groups:

- descendant label → `message.warning(...)`
- at least one child but no descendant label → call delete immediately
- no children → open confirm

For labels, always open confirm. Confirm `onOk` awaits delete, refreshes store, and relies on the existing watcher to recover invalid selection.

- [ ] **Step 7: Run the tree panel test and verify all cases pass**

Run:

```powershell
yarn.cmd vitest run src/views/label-management/components/LabelTreePanel.test.ts
```

Expected: all tree panel tests pass.

---

### Task 6: Update requirements and internationalized copy

**Files:**

- Modify: `src/locales/messages/zh-CN.ts`
- Modify: `src/views/label-management/requirements.md`

**Interfaces:**

- Produces translation keys under `labelManagement.tree.actions`, `labelManagement.editGroup`, `labelManagement.editLabel`, and `labelManagement.delete`.

- [ ] **Step 1: Add exact user-facing copy**

Include:

```ts
editGroup: "编辑分组",
editLabel: "编辑标签",
deleteGroup: "删除分组",
deleteLabel: "删除标签",
groupContainsLabel: "{name} 分组下面有标签，不能删除！",
confirmGroup: "确认删除 {name} 吗？",
confirmLabel: "确认删除 {name} 吗？",
```

Add mode-specific modal descriptions, submit labels, success messages, and error messages without hardcoding them in components.

- [ ] **Step 2: Update the page requirements before final verification**

Document hover actions, edit field backfill/movement, all four deletion branches, API cascade semantics, refreshed selection behavior, and the absence of cycle validation.

- [ ] **Step 3: Run formatting checks for documentation and locale files**

Run:

```powershell
yarn.cmd prettier --check src/locales/messages/zh-CN.ts src/views/label-management/requirements.md
```

Expected: both files match Prettier style.

---

### Task 7: Full verification

**Files:**

- Verify all files modified in Tasks 1–6.

- [ ] **Step 1: Run focused tests**

```powershell
yarn.cmd vitest run src/api/label.test.ts src/views/label-management/components/create-label-group.test.ts src/views/label-management/components/LabelGroupModal.test.ts src/views/label-management/components/LabelModal.test.ts src/views/label-management/components/LabelTreePanel.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 2: Run type checking**

```powershell
yarn.cmd type-check
```

Expected: exit code 0.

- [ ] **Step 3: Run ESLint and formatting**

```powershell
yarn.cmd lint
yarn.cmd format:check
```

Expected: both commands exit with code 0 and no warnings.

- [ ] **Step 4: Run the complete test suite**

```powershell
yarn.cmd test
```

Expected: all project tests pass.

- [ ] **Step 5: Run the production build**

```powershell
yarn.cmd build
```

Expected: build exits with code 0. The existing `plugin-legacy overrode 'build.target'` warning may remain and is outside this feature.

- [ ] **Step 6: Review the final diff without staging or committing**

```powershell
git status --short
git diff --check
```

Confirm no unrelated user changes were overwritten and leave all Git actions to the user.

---

### Task 8: Unify node selection IDs and remove automatic selection

**Files:**

- Modify: `src/views/label-management/components/LabelTreePanel.test.ts`
- Modify: `src/views/label-management/components/LabelTreePanel.vue`
- Modify: `src/views/label-management/requirements.md`

- [ ] Assert initial loading keeps `selectedKeys` empty and emits no selection.
- [ ] Assert selecting a group emits the group ID rather than `null`.
- [ ] Assert saving a group selects and emits the saved group ID.
- [ ] Assert deleting the selected node clears selection and emits `null` without selecting the first remaining label.
- [ ] Remove first-label lookup and automatic-selection behavior from the tree watcher.
- [ ] Run focused tests, type checking, formatting, ESLint, the full suite, and the production build.

---

### Task 9: Enable label creation for any selected node

**Files:**

- Modify: `src/views/label-management/components/LabelTreePanel.test.ts`
- Modify: `src/views/label-management/components/LabelTreePanel.vue`
- Modify: `src/views/label-management/requirements.md`

- [ ] Assert the create-label button remains disabled without a selection.
- [ ] Assert selecting either a group or a label enables the button.
- [ ] Assert opening from a selected label passes that label ID to `LabelModal`, allowing the existing path resolver to choose its direct parent or `pid: null`.
- [ ] Replace the group-type predicate with a selected-node existence predicate.
- [ ] Run focused and full verification.
