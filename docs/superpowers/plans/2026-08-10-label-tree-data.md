# Label Tree Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a typed mock CRUD API and automatically initialized read-only Pinia store for the flat label tree node list.

**Architecture:** `src/api/label.ts` owns node types, mock records, cloning, default values, CRUD behavior, and non-empty group deletion protection. `src/stores/label.ts` mirrors the dataset store lifecycle and exposes only list loading and refresh capabilities. The existing page requirements document is updated before implementation to reflect the new data dependency.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest, existing tree utilities and project API/store conventions.

## Global Constraints

- Expose label collections without Vue `readonly()` wrappers.
- Store collection snapshots in `shallowRef` so Vue does not deeply proxy label data.
- Keep `mapping` mutable in `shallowRef` without `readonly`, `freeze` or `markRaw` wrappers.

- Keep nodes flat with `id` and `pid`; do not persist `children` in the API or store.
- `type` is fixed at creation and cannot be updated.
- `code` and `description` apply to all nodes; `color`, `tools`, and `props` are label-only optional fields.
- Use `#1677ff` when a created label has no color.
- Do not validate parent type, circular references, or movement targets in the mock API.
- Reject deletion of a group that has child nodes.
- Do not add dependencies or modify the current label tree panel UI.
- Do not create Git commits; the user decides when to commit.

---

### Task 1: Update label management requirements

**Files:**

- Modify: `src/views/label-management/requirements.md`

**Interfaces:**

- Produces the authoritative page requirements for the label mock API and label store.

- [ ] **Step 1: Replace obsolete data constraints**

  Remove statements that the page has no API or Pinia dependency. Document the flat node fields, label-only fields, default color, immutable type, non-empty group deletion restriction, automatic store initialization, refresh behavior, and the fact that the UI remains unchanged in this phase.

- [ ] **Step 2: Check requirements consistency**

  Confirm the document no longer contradicts the approved design and still states that tree CRUD interactions are outside this phase.

### Task 2: Implement the label node mock CRUD API with tests

**Files:**

- Create: `src/api/label.ts`
- Create: `src/api/label.test.ts`

**Interfaces:**

- Produces `LabelProperty`, `LabelTreeNode`, `LabelTreeNodeInput`, and `LabelTreeNodeUpdate`.
- Produces `getLabelTreeNodeListApi`, `createLabelTreeNodeApi`, `updateLabelTreeNodeApi`, and `deleteLabelTreeNodeApi`.

- [ ] **Step 1: Write failing API tests**

  Cover deep-cloned query results, nested mock data convertible with `flatToTree`, default label color, group creation, updates without a `type` field, deletion of labels/empty groups, rejection of non-empty group deletion, and not-found update/delete errors.

- [ ] **Step 2: Run the API test file and verify failure**

  Run `yarn vitest run src/api/label.test.ts`. Expected: failure because `@/api/label` does not exist.

- [ ] **Step 3: Implement types, clone helpers, mock data, and CRUD**

  Define `LabelTreeNodeInput` as `Omit<LabelTreeNode, "id">` and `LabelTreeNodeUpdate` as `Partial<Omit<LabelTreeNodeInput, "type">>`. Clone `tools`, every property, and every property `options` array on input and output. Generate IDs with a stable module-local sequence or timestamp suffix. For label creation, apply `#1677ff` only when `color` is absent. Before group deletion, reject when any record has `pid === id`.

- [ ] **Step 4: Run API tests**

  Run `yarn vitest run src/api/label.test.ts`. Expected: all API tests pass.

### Task 3: Implement the automatically initialized label store with tests

**Files:**

- Create: `src/stores/label.ts`
- Create: `src/stores/label.test.ts`

**Interfaces:**

- Consumes `getLabelTreeNodeListApi` and `LabelTreeNode` from `@/api/label`.
- Produces `useLabelStore`, readonly `nodes`, readonly `status`, `initialize()`, and `refresh()`.

- [ ] **Step 1: Write failing store tests**

  Mock `@/api/label` and cover automatic initialization after store creation, concurrent `initialize()` calls sharing one request, `refresh()` forcing another request, and a failed initialization returning to `uninitialized` before a successful retry.

- [ ] **Step 2: Run the store test file and verify failure**

  Run `yarn vitest run src/stores/label.test.ts`. Expected: failure because `@/stores/label` does not exist.

- [ ] **Step 3: Implement the store lifecycle**

  Mirror `src/stores/dataset.ts`: use `readonly`, `ref`, `defineStore`, a module-local `loadingPromise`, `initialize()`, `refresh()`, and an automatic `void initialize().catch(() => undefined)` call.

- [ ] **Step 4: Run store and API tests**

  Run `yarn vitest run src/api/label.test.ts src/stores/label.test.ts`. Expected: all tests pass.

### Task 4: Run project verification

**Files:**

- Verify only; do not modify unrelated files.

**Interfaces:**

- Confirms the API/store addition integrates with the existing project.

- [ ] **Step 1: Run targeted formatting and lint checks**

  Run Prettier and ESLint against the modified requirements, API, store, and test files. Expected: no errors or warnings in changed source files.

- [ ] **Step 2: Run type-check and build**

  Run `yarn type-check` and `yarn build`. Expected: both pass; report existing unrelated warnings separately.
