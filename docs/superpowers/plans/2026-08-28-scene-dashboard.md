# 场景看板规范化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 `scene-dashboard` 整理为使用主布局、国际化、主题变量和清晰组件边界的场景看板页面。

**Architecture:** `index.vue` 仅编排 `SceneHero`、`SceneCardRail` 和 `CapabilityGrid` 三个模块。场景/能力静态定义保留稳定 key，文案从语言包读取；Hero 的自动轮播逻辑由 `useSceneCarousel` 管理。路由暂时以前端规则放行，后续再接后端权限。

**Tech Stack:** Vue 3 Composition API、TypeScript、Vue Router、vue-i18n、Ant Design Vue、Vitest、Less/CSS variables。

## Global Constraints

- 页面统一使用现有 `main` layout，不创建页面自有布局壳。
- 用户可见文案、Tooltip、`aria-label`、空状态和消息全部来自国际化语言包。
- 场景看板临时数据不接 API；不得使用 `any`、`unknown` 代替明确组件类型或关闭检查规则。
- 事件处理函数使用 `handleXxx` 命名，页面模板不直接调用 `message` 或书写复杂业务表达式。
- 样式优先使用主题变量、字体工具类和间距工具类；保留已确认的大屏尺寸。
- 不提交 Git；每个任务完成后只运行验证命令并报告结果。

### Task 1: 补齐场景看板需求文档与路由元数据

**Files:**
- Create: `src/views/scene-dashboard/requirements.md`
- Modify: `src/router/index.ts`
- Modify: `src/locales/messages/zh-CN.ts`
- Modify: `src/types/router.d.ts` only if route meta typing needs extension
- Test: `src/router/index.test.ts`

**Interfaces:**
- Route name remains `scene-dashboard` and path remains `/scene-dashboard`.
- Route meta uses `layout: "main"`, configuration group metadata, `AppstoreAddOutlined`, and `navigation.menus.sceneDashboard`.
- Frontend route registration explicitly allows this route while backend permission integration is pending.

- [ ] **Step 1: Document the page contract**

Write `requirements.md` with goals, three sections, temporary static-data boundary, interactions, loading/empty/not-opened states, accessibility requirements, route behavior, and acceptance criteria.

- [ ] **Step 2: Add locale keys and route metadata tests**

Add the route title and scene-dashboard copy namespace to `zh-CN.ts`. Extend router tests to assert the route uses the main layout, configuration group, correct title key, and `AppstoreAddOutlined`.

- [ ] **Step 3: Update route configuration and frontend allowlist**

Import `AppstoreAddOutlined`, move the route to the configuration group, use the dedicated title key, and adjust the permission filtering path so this route is registered for the current frontend-only phase without changing other route permissions.

- [ ] **Step 4: Run focused verification**

Run `yarn.cmd test src/router/index.test.ts` and `yarn.cmd type-check`. Expected: route tests and type checking pass.

### Task 2: Normalize static data and internationalized view models

**Files:**
- Create: `src/views/scene-dashboard/types.ts`
- Modify: `src/views/scene-dashboard/scene.ts`
- Modify: `src/views/scene-dashboard/scenes.ts`
- Modify: `src/locales/messages/zh-CN.ts`

**Interfaces:**
- `SceneDefinition` contains `key`, `titleKey`, `kickerKey`, `descriptionKey`, `image`, and `status`.
- `CapabilityDefinition` contains `key`, `titleKey`, `descriptionKey`, and `icon`.
- Icon type is a finite union of supported icon keys.

- [ ] **Step 1: Add explicit view-model types**

Define the scene and capability types in `types.ts`, including a typed icon component mapping contract.

- [ ] **Step 2: Convert data files to stable keys**

Replace hardcoded Chinese titles/descriptions in `scenes.ts` with locale keys while preserving current images, ordering, and statuses.

- [ ] **Step 3: Add all temporary copy to `zh-CN.ts`**

Move hero, scene rail, capability, action, tooltip, aria-label, search, empty-state, and message text into `sceneDashboard` locale sections.

- [ ] **Step 4: Run type checking**

Run `yarn.cmd type-check`. Expected: all data definitions and locale imports type-check without `any` or `unknown` placeholders.

### Task 3: Extract Hero carousel and lifecycle logic

**Files:**
- Create: `src/views/scene-dashboard/composables/useSceneCarousel.ts`
- Create: `src/views/scene-dashboard/components/SceneHero.vue`
- Test: `src/views/scene-dashboard/composables/useSceneCarousel.test.ts`

**Interfaces:**
- `useSceneCarousel(sceneCount: number, delay: number)` exposes `activeIndex`, `isPlaying`, `next`, `previous`, `select`, `start`, `pause`, `toggle` and `dispose`.
- `SceneHero` accepts typed scene definitions and emits `select-scene`.

- [ ] **Step 1: Write carousel behavior tests**

Cover index wrapping, selection, pause/start state, interval cleanup, and zero/one-item boundaries using fake timers.

- [ ] **Step 2: Implement the composable**

Use `setInterval` only while playing, pause on hover/focus, restart on leave/blur, and clear the interval in `dispose`/`onBeforeUnmount`.

- [ ] **Step 3: Build `SceneHero.vue` with Ant Design Vue carousel**

Use the Ant Design Vue carousel component, typed props, named handlers, translated labels, accessible controls, and an internationalized message callback instead of inline `message` calls.

- [ ] **Step 4: Run focused tests**

Run `yarn.cmd test src/views/scene-dashboard/composables/useSceneCarousel.test.ts` and `yarn.cmd type-check`. Expected: PASS.

### Task 4: Extract scene rail and capability grid components

**Files:**
- Create: `src/views/scene-dashboard/components/SceneCardRail.vue`
- Create: `src/views/scene-dashboard/components/CapabilityGrid.vue`
- Test: `src/views/scene-dashboard/components/CapabilityGrid.test.ts`

**Interfaces:**
- `SceneCardRail` accepts scene definitions and emits `select-scene`.
- `CapabilityGrid` accepts capability definitions and exposes local search filtering.

- [ ] **Step 1: Implement `SceneCardRail.vue`**

Move drag scrolling, arrow controls, keyboard activation, disabled coming-soon semantics, Tooltip, and translated `aria-label` values into the component. Use `handlePointerDown`, `handlePointerMove`, `handlePointerUp`, and `handleSceneSelect` names.

- [ ] **Step 2: Implement `CapabilityGrid.vue`**

Move search state and filtering into the component, use a typed `Record<CapabilityIconKey, Component>`, add translated empty state and action messaging, and keep message triggering in named handlers.

- [ ] **Step 3: Test observable capability behavior**

Test that entering a search query filters matching title/description content and that a non-matching query renders the empty state. Do not assert source strings or CSS declarations.

- [ ] **Step 4: Run focused checks**

Run `yarn.cmd test src/views/scene-dashboard/components/CapabilityGrid.test.ts` and `yarn.cmd type-check`. Expected: PASS.

### Task 5: Reduce page entry to orchestration and normalize styles

**Files:**
- Modify: `src/views/scene-dashboard/index.vue`
- Modify: `src/views/scene-dashboard/components/SceneHero.vue`
- Modify: `src/views/scene-dashboard/components/SceneCardRail.vue`
- Modify: `src/views/scene-dashboard/components/CapabilityGrid.vue`

**Interfaces:**
- `index.vue` renders the three extracted components inside the main layout’s routed content and passes locale-aware data/handlers.

- [ ] **Step 1: Remove the invalid layout import**

Delete `PlatformShell` usage and render only the page content expected inside `src/layouts/main/index.vue`.

- [ ] **Step 2: Replace the monolithic template**

Keep only module composition, translated page-level labels, and named scene/capability handlers in `index.vue`.

- [ ] **Step 3: Normalize component styles**

Use complete component root names and short prefixes, existing spacing/font utilities where applicable, `var(--dm-...)` theme variables, and remove duplicate CSS overrides while retaining approved large-screen dimensions.

- [ ] **Step 4: Run formatting and lint**

Run `yarn.cmd prettier --write src/views/scene-dashboard src/router/index.ts src/locales/messages/zh-CN.ts src/views/scene-dashboard/requirements.md` and then `yarn.cmd eslint src/views/scene-dashboard src/router/index.ts --max-warnings=0`.

### Task 6: Full verification and handoff

**Files:**
- Modify only files identified by preceding tasks if verification exposes scoped issues.

- [ ] **Step 1: Run complete project checks**

Run `yarn.cmd type-check`, `yarn.cmd lint`, `yarn.cmd format:check`, and `yarn.cmd build`.

- [ ] **Step 2: Separate pre-existing failures**

If checks fail in unrelated files, record the exact file and command output; do not broaden the scope to fix unrelated issues.

- [ ] **Step 3: Review the final diff**

Run `git diff -- src/views/scene-dashboard src/router/index.ts src/locales/messages/zh-CN.ts src/views/scene-dashboard/requirements.md` and confirm no unrelated files are changed and no commit is created.
