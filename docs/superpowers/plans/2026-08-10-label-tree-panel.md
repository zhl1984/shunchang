# Label Tree Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the label tree placeholder with a searchable, expandable and label-selectable Ant Design Vue tree backed by `useLabelStore()`.

**Architecture:** `LabelTreePanel.vue` owns search, expanded-key, selected-key and load-error state. It consumes the store’s already sorted full tree, uses a local subtree-match helper plus the shared `deepFilter()` for searching, and emits selected label IDs. No page utility module or CRUD implementation is added.

**Tech Stack:** Vue 3 Composition API, TypeScript, Pinia, Ant Design Vue Tree, vue-i18n, Vitest and jsdom.

## Global Constraints

- Use the existing `useLabelStore()`; do not fetch or mutate API data directly in the component.
- Use `deepFilter()` from `@/utils/tree` for the final search filtering operation.
- Groups expand/collapse but cannot become the selected label.
- Labels emit `select` with `string | number` IDs.
- Automatically select the first label after initial load or when the prior selection disappears after refresh.
- Search keeps label ancestors, does not keep unmatched descendants of a matching group, throttles filtering by 300ms, expands retained groups, and restores previous expansion when cleared.
- Keep CRUD buttons disabled and do not implement create, edit or delete behavior.
- Keep the fixed no-scroll layout and existing `label-tree-panel` / `ltp-*` class naming convention.
- Do not add dependencies or create Git commits.
- Keep `deepEach()` and `deepEach2()` mutable; all other tree helpers must accept nodes whose `children` arrays are readonly without changing their runtime algorithms.

---

### Task 1: Update requirements and locale copy

**Files:**
- Modify: `src/views/label-management/requirements.md`
- Modify: `src/locales/messages/zh-CN.ts`

**Interfaces:**
- Produces `labelManagement.tree` locale keys for title, total count, actions, search, loading/empty/error states and retry.

- [ ] **Step 1: Update the page requirements**

  Replace the obsolete static-left-panel statements with the approved browse behavior: store-backed tree, group-only expansion, label selection, automatic initial selection, `deepFilter()` search rules, disabled CRUD buttons and state handling.

- [ ] **Step 2: Add minimal locale keys**

  Add keys under `labelManagement.tree` for `title`, `total`, `actions.createGroup`, `actions.createLabel`, `searchPlaceholder`, `empty.default`, `empty.search`, `error.description` and `actions.retry`. Do not hardcode visible Chinese copy in the component.

### Task 2: Write failing component behavior tests

**Files:**
- Create: `src/views/label-management/components/LabelTreePanel.test.ts`

**Interfaces:**
- Tests the public `select` event and rendered/stubbed tree props without introducing Vue Test Utils.

- [ ] **Step 1: Build a minimal Vue test harness**

  Use Vue `createApp`, `h`, `nextTick`, Pinia `createPinia`, and jsdom. Register lightweight stubs for `a-card`, `a-button`, `a-input`, `a-tree`, `a-spin`, `a-empty` and any icons needed by the component. Mock `getLabelTreeNodeListApi()` before importing the component.

- [ ] **Step 2: Add failing behavior cases**

  Cover automatic first-label selection; group select not emitting; label select emitting the correct ID; label-name search retaining its ancestor; group-name search retaining descendants; clearing search restoring expanded keys; loading, API error, default empty and search-empty rendering.

- [ ] **Step 3: Run the test and verify RED**

  Run `yarn vitest run src/views/label-management/components/LabelTreePanel.test.ts`. Expected: failures because the component still renders placeholder rows and exposes none of the required behavior.

### Task 3: Implement the real label tree panel

**Files:**
- Modify: `src/views/label-management/components/LabelTreePanel.vue`

**Interfaces:**
- Consumes `useLabelStore()`, `deepFilter()`, `LabelTreeNode` and `TreeNode<LabelTreeNode>`.
- Emits `select(id: string | number)` only for label nodes.

- [ ] **Step 1: Add typed component state and store integration**

  Define `keyword`, `expandedKeys`, `selectedKeys`, `expandedKeysBeforeSearch`, and `loadFailed`. Await `store.initialize()` from component initialization while preserving the store’s automatic request sharing.

- [ ] **Step 2: Add local search helpers**

  Add commented local functions that normalize names, collect all descendant IDs for a matching group, determine whether a subtree contains a match, and call `deepFilter()` with the resulting keep set. Keep these functions inside the component as requested.

- [ ] **Step 3: Add automatic selection and expansion watchers**

  Watch store initialization/tree changes. Preserve an existing label selection when possible; otherwise locate the first label in tree order, update `selectedKeys`, and emit its ID. During search expand all retained groups; when keyword becomes empty restore the saved expansion keys.

- [ ] **Step 4: Replace placeholders with Ant Design Vue controls**

  Render the title and label count, two disabled buttons, searchable input, loading/error/empty states and `a-tree`. Use `fieldNames` for `id`, `name`, `children`; use the title slot for folder icons and label color dots. Handle expand and select events with typed functions.

- [ ] **Step 5: Update scoped styles**

  Retain `.label-tree-panel`, use only `ltp-*` internal classes, theme variables and existing spacing/font helpers. Keep the panel and tree viewport clipped without introducing scrollbars.

- [ ] **Step 6: Run component tests and verify GREEN**

  Run `yarn vitest run src/views/label-management/components/LabelTreePanel.test.ts`. Expected: all component behavior cases pass.

### Task 4: Run complete verification

**Files:**
- Verify all changed files; do not alter unrelated generated declarations.

**Interfaces:**
- Confirms the completed panel integrates with the project.

- [ ] **Step 1: Run formatting and targeted ESLint**

  Run Prettier on the component, test, requirements and locale files, then ESLint on the component and test. Expected: zero changed-file errors or warnings.

- [ ] **Step 2: Run full tests and type-check**

  Run `yarn test` and `yarn type-check`. Expected: all tests and Vue type checking pass.

- [ ] **Step 3: Run production build**

  Run `yarn build`. Expected: build succeeds; report the existing plugin-legacy warning separately if present.

### Task 5: Support deeply readonly tree inputs

**Files:**
- Modify: `src/utils/tree.ts`
- Modify: `src/utils/tree.test.ts`
- Modify: `src/views/label-management/components/LabelTreePanel.vue`

**Interfaces:**
- `deepMap*`, `deepFilter*` and `deepSort*` accept recursive nodes with `readonly children?: readonly T[]`.
- `deepEach()` and `deepEach2()` retain their existing mutable-node signatures.
- `LabelTreePanel.vue` consumes the deeply readonly `labelStore.tree` without assertions.

- [ ] **Step 1: Add a readonly compatibility type test**

  Define a deeply readonly tree fixture containing a readonly business array and pass it to `deepMap`, `deepFilter` and `deepSort`. Also call the panel-facing helper path through component type checking. The production change that makes this test compile is accepting readonly child arrays instead of requiring mutable `TreeNode<LabelTreeNode>` values.

- [ ] **Step 2: Verify RED with TypeScript**

  Run `yarn type-check`. Expected: the readonly fixture is rejected because current helper constraints require mutable `children` or mutable nested arrays.

- [ ] **Step 3: Widen non-mutating helper constraints**

  Change the generic constraints and callback input types used by `deepMap*`, `deepFilter*` and `deepSort*` from mutable child arrays to `readonly children?: readonly T[]`. Do not change traversal order, filtering rules, sorting behavior or returned values. Leave `deepEach*` unchanged.

- [ ] **Step 4: Remove mutable assumptions from the panel**

  Derive the source-node type from `labelStore.tree`, update recursive read helpers to consume that type, and build `LabelDisplayNode` values explicitly from `id`, `pid`, `type`, `name`, `code`, `description` and `color`. Do not copy or cast readonly `tools` and `props` because the tree does not render them.

- [ ] **Step 5: Verify GREEN**

  Run `yarn vitest run src/utils/tree.test.ts src/views/label-management/components/LabelTreePanel.test.ts`, `yarn type-check` and targeted ESLint. Expected: readonly inputs compile, existing behavior tests pass, and no warnings are introduced.
