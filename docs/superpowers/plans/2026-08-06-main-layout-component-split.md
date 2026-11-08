# Main Layout Component Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the existing main-layout header and sider into `header.vue` and `asideMenu.vue` without changing behavior.

**Architecture:** The two new files live directly under `src/layouts/main/`. `header.vue` owns only the existing header markup and styles; `asideMenu.vue` owns all current sider state, menu projection, theme, navigation, markup, and styles; `index.vue` remains the layout composition root.

**Tech Stack:** Vue 3.5, TypeScript 5.8, Vue Router 4.5, Pinia 2.3, Ant Design Vue 4.2.

## Global Constraints

- Use the exact file names `header.vue` and `asideMenu.vue` in `src/layouts/main/`.
- Preserve existing visual output and interactions; do not add features.
- Do not add props, events, stores, dependencies, or Git commits.
- Keep existing dynamic-menu and theme logic unchanged while moving it.

---

### Task 1: Establish the refactor baseline and missing-component failure

**Files:**

- Modify: `src/layouts/main/index.vue`
- Create later: `src/layouts/main/header.vue`
- Create later: `src/layouts/main/asideMenu.vue`

**Interfaces:**

- `header.vue`: no props and no events.
- `asideMenu.vue`: no props and no events.

- [ ] **Step 1: Run the current verification baseline**

Run: `yarn type-check && yarn test`

Expected: both commands exit with code 0 before the refactor.

- [ ] **Step 2: Reduce index.vue to composition imports before creating components**

Import `Header` from `./header.vue` and `AsideMenu` from `./asideMenu.vue`, then replace the inline header and sider blocks with those components while retaining `a-layout`, the body, content, and `RouterView`.

- [ ] **Step 3: Verify the missing-component RED state**

Run: `yarn type-check`

Expected: FAIL because `header.vue` and `asideMenu.vue` do not exist yet.

### Task 2: Create header and aside menu components

**Files:**

- Create: `src/layouts/main/header.vue`
- Create: `src/layouts/main/asideMenu.vue`
- Modify: `src/layouts/main/index.vue`

**Interfaces:**

- `header.vue` renders the existing localized application title.
- `asideMenu.vue` consumes `useRoute`, `useRouter`, `useThemeStore`, `i18n`, `getGroupedMenus`, and `getActiveMenuPath` internally.

- [ ] **Step 1: Create header.vue**

Move the existing `a-layout-header` markup and `main-layout__header` declarations into a scoped `.main-header` style without changing dimensions, spacing, title, or background.

- [ ] **Step 2: Create asideMenu.vue**

Move the collapse state, theme refs, grouped menu computations, selected keys, click handler, complete `a-layout-sider` template, and sider trigger styles. Preserve existing comments and behavior.

- [ ] **Step 3: Remove moved script and style code from index.vue**

Leave only component imports, the layout composition template, and styles for the root layout, body, and content.

- [ ] **Step 4: Verify GREEN after creating components**

Run: `yarn type-check && yarn test`

Expected: type checking exits with code 0 and all 10 tests pass.

### Task 3: Complete project verification

**Files:**

- Verify: `src/layouts/main/index.vue`
- Verify: `src/layouts/main/header.vue`
- Verify: `src/layouts/main/asideMenu.vue`

- [ ] **Step 1: Run scoped formatting**

Run: `yarn prettier --check src/layouts/main/index.vue src/layouts/main/header.vue src/layouts/main/asideMenu.vue docs/requirements/layout/main-layout.md`

Expected: exit code 0.

- [ ] **Step 2: Run ESLint and TypeScript**

Run: `yarn lint && yarn type-check`

Expected: both commands exit with code 0.

- [ ] **Step 3: Run tests and production build**

Run: `yarn test && yarn build`

Expected: all 10 tests pass and the production build exits with code 0; the existing legacy target warning may remain.

- [ ] **Step 4: Inspect the final diff**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and no new commit.
