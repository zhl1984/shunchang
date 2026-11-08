# Create Label Group Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add group selection and a create-label-group modal with cascaded parent selection.

**Architecture:** Model group and label nodes as a discriminated union. Keep tree-only selection and expansion state in `LabelTreePanel.vue`; let `CreateLabelGroupModal.vue` derive its parent path and group-only options from the label store, own creation and refresh, and emit the created node for tree UI synchronization.

**Tech Stack:** Vue 3, TypeScript, Pinia, Ant Design Vue, Vitest, Less.

## Global Constraints

- Do not add dependencies or commit code.
- Preserve the fixed page layout and existing label-tree search behavior.
- Use `<script setup lang="ts">`, explicit types, i18n copy, scoped styles, and component-prefixed classes.

---

### Task 1: Refine label node types

**Files:**

- Modify: `src/api/label.ts`
- Test: `src/api/label.test.ts`

- [ ] Change API tests so group creation omits `code` and labels still require it.
- [ ] Run `yarn vitest run src/api/label.test.ts` and verify the type or assertion failure.
- [ ] Introduce discriminated group and label node types and remove `code` from mock groups.
- [ ] Run the API tests and type check.

### Task 2: Add create group modal

**Files:**

- Create: `src/views/label-management/components/CreateLabelGroupModal.vue`
- Create: `src/views/label-management/components/create-label-group-modal.less`
- Create: `src/views/label-management/components/CreateLabelGroupModal.test.ts`
- Modify: `src/locales/messages/zh-CN.ts`

- [ ] Write tests for default parent, group-only cascader options, root creation, validation and successful creation.
- [ ] Run the modal test and verify it fails because the component does not exist.
- [ ] Implement the typed modal form and create API call.
- [ ] Run modal tests, type check and ESLint.

### Task 3: Integrate modal with tree selection

**Files:**

- Modify: `src/views/label-management/components/LabelTreePanel.vue`
- Modify: `src/views/label-management/components/label-tree-panel.less`
- Modify: `src/views/label-management/components/LabelTreePanel.test.ts`
- Modify: `src/views/label-management/requirements.md`

- [ ] Update tests for selectable groups, `select(null)`, modal defaults and post-create refresh/selection.
- [ ] Run the panel test and verify the new expectations fail.
- [ ] Enable the group button, derive group cascader data, integrate modal and update selection orchestration.
- [ ] Run component tests, full tests, type check, ESLint and build.

### Task 4: Aggregate create-group context in the modal

**Files:**

- Modify: `src/views/label-management/components/CreateLabelGroupModal.vue`
- Modify: `src/views/label-management/components/CreateLabelGroupModal.test.ts`
- Modify: `src/views/label-management/components/LabelTreePanel.vue`
- Modify: `src/views/label-management/components/LabelTreePanel.test.ts`
- Modify: `src/views/label-management/requirements.md`

- [ ] Change component tests to require only `createGroupVisible` and `nodeId` props and verify that the modal derives the selected group or label parent internally.
- [ ] Run the two component test files and verify they fail against the old prop contract.
- [ ] Move group options, default parent path, creation refresh, and related store dependencies into `CreateLabelGroupModal.vue`.
- [ ] Reduce `LabelTreePanel.vue` to modal visibility, selected node ID, and post-create tree selection/expansion synchronization.
- [ ] Run component tests, type check, ESLint and build; do not stage or commit the changes.

### Task 5: Derive label paths in the store

**Files:**

- Modify: `src/utils/tree.ts`
- Modify: `src/utils/tree.test.ts`
- Modify: `src/stores/label.ts`
- Modify: `src/stores/label.test.ts`
- Modify: `src/views/label-management/components/create-label-group.ts`
- Modify: `src/views/label-management/components/create-label-group.test.ts`
- Modify: `src/views/label-management/components/CreateLabelGroupModal.vue`
- Modify: `src/views/label-management/components/LabelTreePanel.vue`
- Modify: `src/views/label-management/requirements.md`

- [ ] Add failing tests proving `deepMap2` receives the mapped parent and label store nodes expose complete root-to-node paths.
- [ ] Change `deepMap2` to pass its mapped callback result as the child callback's parent.
- [ ] Generate `path` while building `nextTree` and rebuild `mapping` from the enhanced tree nodes.
- [ ] Remove `findGroupPath` and consume store node paths in the modal and tree panel.
- [ ] Run utility, store and component tests, followed by type check, ESLint and build; do not stage or commit changes.

### Task 6: Create labels from the selected group

**Files:**

- Create: `src/views/label-management/components/CreateLabelModal.vue`
- Create: `src/views/label-management/components/CreateLabelModal.test.ts`
- Modify: `src/views/label-management/components/create-label-group.ts`
- Modify: `src/views/label-management/components/create-label-group.test.ts`
- Modify: `src/views/label-management/components/LabelTreePanel.vue`
- Modify: `src/views/label-management/components/LabelTreePanel.test.ts`
- Modify: `src/locales/messages/zh-CN.ts`
- Modify: `src/views/label-management/requirements.md`

- [ ] Add failing tests for shared default group paths and label creation request mapping.
- [ ] Add a label modal test covering default group selection, editable group cascader, required fields, API creation and store refresh.
- [ ] Add panel tests proving the label button is enabled only for a selected group and a created label becomes selected.
- [ ] Implement `CreateLabelModal.vue`, shared path helpers, i18n copy and panel integration.
- [ ] Run related tests, full tests, type check, ESLint, formatting and build; do not stage or commit changes.

### Task 7: Remove label colors

**Files:**

- Modify: `src/api/label.ts`
- Modify: `src/api/label.test.ts`
- Modify: `src/stores/label.test.ts`
- Modify: `src/views/label-management/components/CreateLabelModal.test.ts`
- Modify: `src/views/label-management/components/LabelTreePanel.vue`
- Modify: `src/views/label-management/components/LabelTreePanel.test.ts`
- Modify: `src/views/label-management/requirements.md`

- [x] Change tests so labels no longer expose colors and tree labels render `TagOutlined`.
- [x] Run API and tree panel tests and verify the existing color behavior fails.
- [x] Remove color from label types, mock data, create/update behavior and UI rendering.
- [x] Run full tests, type check, ESLint, formatting and build; do not stage or commit changes.
