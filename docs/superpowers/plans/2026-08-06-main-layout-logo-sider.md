# Main Layout Logo Sider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the SQ Logo into the Ant Design Vue Sider, rename the component to `asider.vue`, and align the Logo and Header through an inherited CSS height variable.

**Architecture:** `index.vue` becomes a horizontal root layout with the Sider on the left and a nested right layout containing Header and content. The root declares `--main-header-height: 64px`; `header.vue` and the Logo inside `asider.vue` consume it, while `asider.vue` privately owns its collapsed state and `192px / 80px` widths.

**Tech Stack:** Vue 3.5, TypeScript 5.8, Vue Router 4.5, Pinia 2.3, Ant Design Vue 4.2, Less.

## Global Constraints

- Rename `asideMenu.vue` to the exact file name `asider.vue`.
- Keep `SQ` as the temporary Logo; show `SQ + app.title` expanded and only `SQ` collapsed.
- Use pixel dimensions and inherited CSS variables; do not pass height or width props.
- Reuse the Sider's built-in width transition and do not add a duplicate width animation.
- Preserve all menu, theme, routing, selection, and collapse behavior.
- Do not create Git commits.

---

### Task 1: Establish the missing-renamed-component RED state

**Files:**

- Modify: `src/layouts/main/index.vue`
- Rename later: `src/layouts/main/asideMenu.vue` to `src/layouts/main/asider.vue`

**Interfaces:**

- `index.vue` imports `Asider` from `./asider.vue`.
- `asider.vue` and `header.vue` consume `--main-header-height` through CSS inheritance.

- [ ] **Step 1: Run the existing baseline**

Run: `yarn type-check && yarn test && yarn build`

Expected: type checking and 10 tests pass; the current production build succeeds.

- [ ] **Step 2: Point index.vue to asider.vue before renaming the file**

Change the import from `./asideMenu.vue` to `./asider.vue`, rename the local component to `Asider`, and keep the rest of the layout temporarily unchanged.

- [ ] **Step 3: Verify RED with the production builder**

Run: `yarn build`

Expected: FAIL because Vite cannot resolve `./asider.vue`.

### Task 2: Implement the new left-right layout

**Files:**

- Modify: `src/layouts/main/index.vue`
- Create: `src/layouts/main/asider.vue`
- Delete: `src/layouts/main/asideMenu.vue`
- Modify: `src/layouts/main/header.vue`

**Interfaces:**

- `index.vue` declares `--main-header-height: 64px` on `.main-layout`.
- `asider.vue` owns `collapsed`, `SIDER_WIDTH = 192`, and `SIDER_COLLAPSED_WIDTH = 80`.
- Neither child component receives props or emits events.

- [ ] **Step 1: Restructure index.vue**

Render `<Asider />` as the first child of the horizontal root `a-layout`. Render a nested right-side `a-layout` containing `<Header />` and the content `RouterView`. Add `min-width: 0` and declare `--main-header-height: 64px` on the root.

- [ ] **Step 2: Create asider.vue from asideMenu.vue**

Keep all current menu logic. Set `:width="192"` and `:collapsed-width="80"`. Place a fixed-height Logo block as the first child inside `a-layout-sider`, followed by a flexing, scrollable menu.

- [ ] **Step 3: Implement Logo states and visual boundaries**

Render `SQ` in both states and the localized application title only when expanded. Use the inherited header-height variable, a bottom border on Logo, a right border and lightweight shadow on the Sider, and a short opacity transition for the title.

- [ ] **Step 4: Update header.vue**

Use `var(--main-header-height)` for height and line-height. Add a bottom border and lightweight shadow without changing the current title content.

- [ ] **Step 5: Remove asideMenu.vue**

Delete the old file only after `asider.vue` contains all menu behavior.

- [ ] **Step 6: Verify GREEN**

Run: `yarn type-check && yarn test && yarn build`

Expected: type checking passes, all 10 tests pass, and the production build succeeds.

### Task 3: Complete project verification

**Files:**

- Verify: `src/layouts/main/index.vue`
- Verify: `src/layouts/main/header.vue`
- Verify: `src/layouts/main/asider.vue`
- Verify: `docs/requirements/layout/main-layout.md`

- [ ] **Step 1: Run scoped formatting**

Run: `yarn prettier --check src/layouts/main/index.vue src/layouts/main/header.vue src/layouts/main/asider.vue docs/requirements/layout/main-layout.md`

Expected: exit code 0.

- [ ] **Step 2: Run ESLint and TypeScript**

Run: `yarn lint && yarn type-check`

Expected: both commands exit with code 0.

- [ ] **Step 3: Run tests and production build**

Run: `yarn test && yarn build`

Expected: all 10 tests pass and the production build exits with code 0; the existing legacy target warning may remain.

- [ ] **Step 4: Inspect the final workspace**

Run: `git diff --check && git status --short`

Expected: no whitespace errors, `asideMenu.vue` absent, `asider.vue` present, and no new commit.
