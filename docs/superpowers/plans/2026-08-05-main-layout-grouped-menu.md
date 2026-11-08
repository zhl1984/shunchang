# Main Layout Grouped Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the dynamically registered routes as grouped icon menus inside the existing main layout.

**Architecture:** `src/layouts/main/index.vue` consumes `getGroupedMenus` and `getActiveMenuPath` from the router module. Expanded navigation renders Ant Design Vue menu groups; collapsed navigation flattens the same data so every icon remains directly clickable.

**Tech Stack:** Vue 3.5, TypeScript 5.8, Vue Router 4.5, Ant Design Vue 4.2, Vitest.

## Global Constraints

- Preserve the existing `a-layout`, `a-layout-sider`, header, content, theme, and collapse behavior.
- Do not recreate or depend on `AppSidebar.vue`.
- Do not duplicate route filtering, grouping, sorting, translation, or permission rules in the layout.
- Do not create Git commits.

---

### Task 1: Render grouped dynamic menus in the main layout

**Files:**

- Modify: `src/layouts/main/index.vue`
- Verify: `src/router/index.test.ts`

**Interfaces:**

- Consumes: `getGroupedMenus(routes, translate)` and `getActiveMenuPath(path, groups)` from `@/router`.
- Produces: grouped `a-menu-item-group` entries when expanded and flat `a-menu-item` entries when collapsed.

- [ ] **Step 1: Verify the existing menu projection tests**

Run: `yarn test src/router/index.test.ts`

Expected: 10 tests pass, proving route registration, grouping, ordering, active paths, and 404 behavior before the template changes.

- [ ] **Step 2: Replace the legacy flat route projection**

Import `i18n`, `getGroupedMenus`, and `getActiveMenuPath`. Compute groups from `router.getRoutes()` and recompute when `route.fullPath` changes so newly registered routes are included.

- [ ] **Step 3: Render expanded and collapsed menu states**

Use `a-menu-item-group` plus nested `a-menu-item` for expanded mode. Use a flattened child list for collapsed mode. Render `meta.icon` through `<component :is="item.icon" />` and preserve titles as tooltip text.

- [ ] **Step 4: Preserve navigation behavior**

Use `getActiveMenuPath` for the selected key and keep `handleMenuSelect` responsible only for avoiding duplicate navigation and pushing the clicked path.

- [ ] **Step 5: Verify the layout and project**

Run: `yarn prettier --check src/layouts/main/index.vue`

Run: `yarn lint`

Run: `yarn type-check`

Run: `yarn test`

Run: `yarn build`

Expected: every command exits with code 0; the existing legacy build-target warning may remain.
