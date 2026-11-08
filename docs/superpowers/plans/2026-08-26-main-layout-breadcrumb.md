# Main Layout Breadcrumb Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add route-driven breadcrumbs to every main-layout page and provide a typed callback API that lets child pages replace the complete breadcrumb list using the current route, previous list, and new default list.

**Architecture:** Keep rendering and route watching in `src/layouts/main/index.vue`, while moving breadcrumb types, the injection key, default-list projection, and callback application into a focused `breadcrumb.ts` module. The pure functions are covered by Vitest before the layout consumes them; breadcrumb state stays local to the layout and is exposed only through Vue `provide/inject`.

**Tech Stack:** Vue 3 Composition API, TypeScript 5.8, Vue Router 4.5, vue-i18n 11, Ant Design Vue 4.2, Vitest 4.

## Global Constraints

- Preserve unrelated uncommitted changes in `src/layouts/main/header.vue`, `src/types/components.d.ts`, and `src/views/rule-center/**`.
- Preserve the user's in-progress breadcrumb markup in `src/layouts/main/index.vue`, modifying only what is required to make the agreed behavior correct.
- Update both `src/layouts/main/requirements.md` and `docs/requirements/layout/main-layout.md` before production code.
- Do not add dependencies, Pinia state, backend APIs, or fullscreen-route changes.
- New and changed functions require concise purpose comments; meaningful conditional branches require reason comments.
- Use complete-array replacement for breadcrumb state and do not mutate callback input arrays.

---

### Task 1: Document the approved breadcrumb contract

**Files:**
- Modify: `src/layouts/main/requirements.md`
- Modify: `docs/requirements/layout/main-layout.md`

**Interfaces:**
- Consumes: approved design in `docs/superpowers/specs/2026-08-26-main-layout-breadcrumb-design.md`
- Produces: synchronized acceptance criteria for Tasks 2 and 3

- [ ] **Step 1: Add the functional and interaction requirements**

Add equivalent requirements to both documents covering:

```markdown
- 主布局内容区在路由页面之前统一显示面包屑；全屏路由不显示。
- 路由变化时保存旧的完整路径列表，并根据 `route.matched`、`meta.title` 与 `meta.titleKey` 生成新的完整默认列表。
- 动态 `meta.title` 优先于 `meta.titleKey` 的国际化标题；没有标题的匹配记录不生成路径项。
- 主布局通过具名 injection key 提供 `addPath(callback)`。
- callback 接收当前 route、oldPathList 和 newPathList，并返回用于整体替换的完整列表。
- callback 入参数组是快照，调用方不能通过原地修改入参改变布局状态。
```

- [ ] **Step 2: Add state, dependency, and acceptance details**

State explicitly that no API or new dependency is required, empty callback results clear the breadcrumb, stable route paths are used as keys, and relevant tests plus format/lint/type/build checks must pass.

- [ ] **Step 3: Check both documents remain synchronized**

Run:

```powershell
rg -n "面包屑|addPath|oldPathList|newPathList" src/layouts/main/requirements.md docs/requirements/layout/main-layout.md
```

Expected: both files describe the same callback and route-change behavior.

- [ ] **Step 4: Commit the documentation update**

```powershell
git add src/layouts/main/requirements.md docs/requirements/layout/main-layout.md
git commit -m "docs(layout): define breadcrumb behavior"
```

### Task 2: Build and test the typed breadcrumb state helpers

**Files:**
- Create: `src/layouts/main/breadcrumb.ts`
- Create: `src/layouts/main/breadcrumb.test.ts`

**Interfaces:**
- Consumes: `RouteLocationNormalizedLoaded`, `RouteRecordNormalized`, Vue `InjectionKey`, and a translation function `(key: string) => string`
- Produces: `BreadcrumbPath`, `BreadcrumbPathList`, `BreadcrumbUpdateCallback`, `BreadcrumbContext`, `breadcrumbContextKey`, `createDefaultPathList(route, translate)`, and `applyPathListUpdate(callback, route, oldPathList, newPathList)`

- [ ] **Step 1: Write failing tests for complete default path projection**

Create tests with minimal route fixtures that assert:

```ts
expect(createDefaultPathList(route, translate)).toEqual([
  { active: false, path: "/", title: "translated:navigation.pages.home" },
  {
    active: true,
    path: "/annotation-task/12",
    title: "任务 A",
  },
]);
```

Also assert that `meta.title` wins over `titleKey`, records without either title are skipped, and only the last produced item is active.

- [ ] **Step 2: Run the tests and verify the expected RED state**

Run:

```powershell
yarn.cmd test src/layouts/main/breadcrumb.test.ts
```

Expected: FAIL because `breadcrumb.ts` and its exports do not exist.

- [ ] **Step 3: Implement the minimal typed projection API**

Define the shared contract:

```ts
export interface BreadcrumbPath {
  active: boolean;
  path: string;
  title: string;
}

export type BreadcrumbPathList = BreadcrumbPath[];

export type BreadcrumbUpdateCallback = (
  route: RouteLocationNormalizedLoaded,
  oldPathList: BreadcrumbPathList,
  newPathList: BreadcrumbPathList,
) => BreadcrumbPathList;

export interface BreadcrumbContext {
  addPath: (callback: BreadcrumbUpdateCallback) => void;
}
```

Implement `createDefaultPathList` by iterating `route.matched`, preferring a non-empty `record.meta.title`, translating `record.meta.titleKey` otherwise, and skipping untitled records. Use `route.path` for the last matched record so dynamic parameters are resolved; use the normalized record path for earlier ancestors. After filtering, mark only the final produced item active. Export `breadcrumbContextKey` as a typed `InjectionKey<BreadcrumbContext>`.

- [ ] **Step 4: Run the projection tests and verify GREEN**

Run:

```powershell
yarn.cmd test src/layouts/main/breadcrumb.test.ts
```

Expected: PASS for default projection and title fallback tests.

- [ ] **Step 5: Write a failing test for callback replacement and immutable snapshots**

Add a test that captures the callback arguments, returns a custom complete array, and asserts:

```ts
expect(result).toEqual(customPathList);
expect(receivedOldPathList).not.toBe(oldPathList);
expect(receivedNewPathList).not.toBe(newPathList);
expect(oldPathList).toEqual(originalOldPathList);
expect(newPathList).toEqual(originalNewPathList);
```

- [ ] **Step 6: Run the callback test and verify RED**

Run:

```powershell
yarn.cmd test src/layouts/main/breadcrumb.test.ts
```

Expected: FAIL because `applyPathListUpdate` has not been implemented.

- [ ] **Step 7: Implement callback application with copied inputs and output**

Implement:

```ts
export function applyPathListUpdate(
  callback: BreadcrumbUpdateCallback,
  route: RouteLocationNormalizedLoaded,
  oldPathList: BreadcrumbPathList,
  newPathList: BreadcrumbPathList,
): BreadcrumbPathList {
  return [...callback(route, [...oldPathList], [...newPathList])];
}
```

Add the required purpose comment and keep the implementation limited to complete-list replacement semantics.

- [ ] **Step 8: Run helper tests and static checks**

Run:

```powershell
yarn.cmd test src/layouts/main/breadcrumb.test.ts
yarn.cmd eslint src/layouts/main/breadcrumb.ts src/layouts/main/breadcrumb.test.ts --max-warnings=0
yarn.cmd prettier --check src/layouts/main/breadcrumb.ts src/layouts/main/breadcrumb.test.ts
```

Expected: all commands pass without warnings.

- [ ] **Step 9: Commit the tested helper contract**

```powershell
git add src/layouts/main/breadcrumb.ts src/layouts/main/breadcrumb.test.ts
git commit -m "feat(layout): add breadcrumb state helpers"
```

### Task 3: Connect route changes, rendering, and provide/inject in the main layout

**Files:**
- Modify: `src/layouts/main/index.vue`

**Interfaces:**
- Consumes: `breadcrumbContextKey`, `createDefaultPathList`, `applyPathListUpdate`, `BreadcrumbPathList`
- Produces: route-watched `pathList` and provided `addPath(callback)` available to descendant pages

- [ ] **Step 1: Confirm the layout test boundary**

The repository does not include `@vue/test-utils` or another Vue component mounting utility. Do not add a dependency for this change. Cover state transformation through `breadcrumb.test.ts`, then verify the SFC integration with ESLint, `vue-tsc`, and the production build.

- [ ] **Step 2: Replace the in-progress local types and push implementation**

Import `watch` and `useI18n`, then import the shared breadcrumb helpers. Remove the local `RouteInfo`, `RouteInfoList`, and `addPath(info)` declarations.

Maintain three local refs:

```ts
const pathList = ref<BreadcrumbPathList>([]);
const oldPathList = ref<BreadcrumbPathList>([]);
const newPathList = ref<BreadcrumbPathList>([]);
```

- [ ] **Step 3: Watch the route and reset complete path snapshots**

Add an immediate watcher on `route.fullPath`. Its named handler must copy the current list into `oldPathList`, generate the complete new list through `createDefaultPathList(route, t)`, copy it into `newPathList`, and replace `pathList` with a fresh copy.

```ts
function handleRouteChange(): void {
  oldPathList.value = [...pathList.value];
  newPathList.value = createDefaultPathList(route, t);
  pathList.value = [...newPathList.value];
}
```

- [ ] **Step 4: Provide the callback-based replacement API**

Implement a commented `addPath(callback)` that calls `applyPathListUpdate` with the current route and saved snapshots, then provide it with the typed key:

```ts
provide(breadcrumbContextKey, { addPath });
```

- [ ] **Step 5: Finish breadcrumb rendering behavior**

Use `item.path` as the loop key. Render active items as plain text and inactive items with `RouterLink :to="item.path"`. Add only the minimal existing utility class or scoped prefixed class needed to separate the breadcrumb from `RouterView`; keep `<keep-alive>` unchanged because it is part of the user's in-progress edit.

- [ ] **Step 6: Run focused verification**

Run:

```powershell
yarn.cmd test src/layouts/main/breadcrumb.test.ts
yarn.cmd eslint src/layouts/main/index.vue src/layouts/main/breadcrumb.ts src/layouts/main/breadcrumb.test.ts --max-warnings=0
yarn.cmd prettier --check src/layouts/main/index.vue src/layouts/main/breadcrumb.ts src/layouts/main/breadcrumb.test.ts src/layouts/main/requirements.md docs/requirements/layout/main-layout.md
yarn.cmd type-check
```

Expected: all commands pass without errors or warnings.

- [ ] **Step 7: Run repository-level regression checks**

Run:

```powershell
yarn.cmd test
yarn.cmd build
```

Expected: all tests pass and the production build succeeds. If failures originate from unrelated dirty files, preserve those files and report the exact failing command and evidence instead of modifying unrelated work.

- [ ] **Step 8: Review the final diff for scope and user-change preservation**

Run:

```powershell
git diff --check
git status --short
git diff -- src/layouts/main/index.vue src/layouts/main/breadcrumb.ts src/layouts/main/breadcrumb.test.ts src/layouts/main/requirements.md docs/requirements/layout/main-layout.md
```

Expected: only the planned breadcrumb changes appear in scoped files, while unrelated user modifications remain untouched.

- [ ] **Step 9: Commit the layout integration**

```powershell
git add src/layouts/main/index.vue src/layouts/main/breadcrumb.ts src/layouts/main/breadcrumb.test.ts
git commit -m "feat(layout): add route breadcrumbs"
```
