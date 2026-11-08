# Dynamic Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add grouped menu route definitions and register all business routes once when a current user exists.

**Architecture:** Keep the route catalog and dynamic registration entry in `src/router/index.ts`, as requested. Expose pure helpers for user-based route selection and menu projection so Vitest can verify behavior without mounting Vue components; the sidebar consumes the projected grouped menu model.

**Tech Stack:** Vue 3.5, TypeScript 5.8, Vue Router 4.5, Pinia 2.3, Ant Design Vue 4.2, Vitest.

## Global Constraints

- Do not create concrete business pages; every new business route renders the existing not-found component inside the main layout.
- A non-null `MemberInfo` currently receives all twelve routes; a null user receives none.
- Keep menu text in `src/locales/messages/zh-CN.ts` and use existing Ant Design Vue icons.
- Preserve all unrelated working-tree changes and do not create Git commits.
- New and changed functions require concise purpose comments; do not use `any` or disable checks.

---

### Task 1: Add Vitest and test the route/menu contracts

**Files:**

- Modify: `package.json`
- Modify: `yarn.lock`
- Create: `src/router/index.test.ts`

**Interfaces:**

- Consumes: `MemberInfo` from `@/api/auth`.
- Produces expectations for `getRoutesForUser(user)`, `getGroupedMenus(routes, translate)`, and `getActiveMenuPath(path, groups)`.

- [ ] **Step 1: Install Vitest as a development dependency**

Run: `yarn add -D vitest`

Expected: `package.json` and `yarn.lock` contain Vitest, without other intentional dependency changes.

- [ ] **Step 2: Add the test script**

Add `"test": "vitest run"` under `scripts` in `package.json`.

- [ ] **Step 3: Write failing route selection tests**

Create tests asserting that a complete literal `MemberInfo` yields exactly twelve named routes in documented order, while `null` yields an empty array.

- [ ] **Step 4: Write failing grouped menu tests**

Assert four literal groups, their translated titles, item paths, and the active path result for an exact route and an unknown route.

- [ ] **Step 5: Run tests and verify RED**

Run: `yarn test src/router/index.test.ts`

Expected: FAIL because the exported helpers do not yet exist.

### Task 2: Implement route definitions and dynamic registration

**Files:**

- Modify: `src/router/index.ts`
- Modify: `src/types/router.d.ts`
- Modify: `src/locales/messages/zh-CN.ts`

**Interfaces:**

- `getRoutesForUser(user: MemberInfo | null): RouteRecordRaw[]`
- `registerUserRoutes(user: MemberInfo | null): boolean`
- Route metadata fields: `groupKey`, `groupOrder`, `icon`, `order`.

- [ ] **Step 1: Define the twelve typed business route records**

Add the documented names, paths, lazy not-found component, main-layout metadata, group metadata, ordering, authentication flag, and Ant Design Vue icon component for each route.

- [ ] **Step 2: Implement user route selection**

Return an empty array for a null user and all business routes for any current user. Keep this function pure so future permission filtering stays isolated.

- [ ] **Step 3: Implement idempotent child-route registration**

For each selected route, check `router.hasRoute(route.name)` before calling `router.addRoute("home", route)` and return whether at least one route was added.

- [ ] **Step 4: Register routes in the navigation guard**

After user initialization and authentication handling, call `registerUserRoutes`. When routes were added, return `to.fullPath` so Vue Router resolves the original target against the new matcher.

- [ ] **Step 5: Add internationalized menu and group titles**

Add `navigation.groups` and `navigation.menus` keys for all visible labels.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `yarn test src/router/index.test.ts`

Expected: all route selection tests pass.

### Task 3: Project registered routes into grouped sidebar items

**Files:**

- Modify: `src/router/index.ts`
- Modify: `src/router/index.test.ts`
- Modify: `src/layouts/main/components/AppSidebar.vue`

**Interfaces:**

- `MenuGroup` contains `key`, `title`, `order`, and `children`.
- `getGroupedMenus(routes: RouteRecordNormalized[], translate: (key: string) => string): MenuGroup[]`
- `getActiveMenuPath(path: string, groups: MenuGroup[]): string`

- [ ] **Step 1: Verify grouped menu tests fail for missing implementation**

Run: `yarn test src/router/index.test.ts`

Expected: route selection passes and grouped projection fails.

- [ ] **Step 2: Implement grouped menu projection**

Filter registered main-layout menu routes, translate group and item keys, sort groups and children numerically, and retain icon components from metadata.

- [ ] **Step 3: Implement active path lookup**

Return the matching menu path for exact or descendant paths; return an empty string when no menu matches.

- [ ] **Step 4: Update the sidebar to render item groups**

Use `router.getRoutes()`, `i18n.global.t`, and the grouped helper. Convert each group to an Ant Design Vue item group when expanded; when collapsed, flatten children so icon navigation remains available.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `yarn test src/router/index.test.ts`

Expected: all route and menu helper tests pass.

### Task 4: Verify the integrated change

**Files:**

- Verify all modified files; make only scoped corrections required by failing checks.

- [ ] **Step 1: Run formatting check**

Run: `yarn format:check`

Expected: exit code 0. Format only files changed for this task if needed.

- [ ] **Step 2: Run ESLint**

Run: `yarn lint`

Expected: exit code 0 with zero warnings.

- [ ] **Step 3: Run TypeScript checking**

Run: `yarn type-check`

Expected: exit code 0.

- [ ] **Step 4: Run all tests**

Run: `yarn test`

Expected: exit code 0 with all tests passing.

- [ ] **Step 5: Run the production build**

Run: `yarn build`

Expected: exit code 0.

- [ ] **Step 6: Inspect the final diff**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; report both task files and preserved pre-existing changes without committing.
