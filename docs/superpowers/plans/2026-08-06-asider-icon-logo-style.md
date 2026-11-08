# Asider Icon and Logo Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the collapsed sidebar presentation by enlarging menu icons during the existing collapse animation and styling the temporary `SQ` logo with the theme primary color.

**Architecture:** Keep all behavior and state ownership inside the existing `asider.vue`. Apply scoped Less rules to the logo mark and Ant Design Vue menu icon wrapper, using the Sider collapsed class as the state selector so no new JavaScript state or component API is introduced.

**Tech Stack:** Vue 3, TypeScript, Ant Design Vue, scoped Less, Yarn

## Global Constraints

- Modify only `src/layouts/main/asider.vue` for implementation.
- Keep expanded menu icons at `18px` and collapsed menu icons at `24px`.
- Use `font-size` with `0.3s cubic-bezier(0.2, 0, 0, 1)`; do not use transforms.
- Keep the `SQ` logo at `48px × 48px`, with `var(--dm-primary)` background, white text, and `6px` radius.
- Preserve routing, menu grouping, theme, selection, navigation, and collapse behavior.
- Do not add dependencies and do not create a Git commit.

---

### Task 1: Style the collapsed menu icons and temporary logo

**Files:**

- Modify: `src/layouts/main/asider.vue`
- Verify: `docs/requirements/layout/main-layout.md`

**Interfaces:**

- Consumes: Ant Design Vue's `.ant-menu-item-icon` and `.ant-layout-sider-collapsed` classes.
- Produces: Visual-only styling; no component props, events, routes, or TypeScript interfaces change.

- [ ] **Step 1: Confirm the existing requirement covers the visual states**

Check that `docs/requirements/layout/main-layout.md` specifies the `18px`/`24px` icon sizes, the `0.3s cubic-bezier(0.2, 0, 0, 1)` transition, and the primary `SQ` logo treatment.

- [ ] **Step 2: Add the minimal scoped Less implementation**

Add the logo rules to `.main-asider__logo-mark`:

```less
height: 48px;
border-radius: 6px;
background: var(--dm-primary);
color: #fff;
```

Add the icon rules inside `.main-asider`:

```less
:deep(.ant-menu-item-icon) {
  font-size: 18px;
  transition: font-size 0.3s cubic-bezier(0.2, 0, 0, 1);
}

&.ant-layout-sider-collapsed {
  :deep(.ant-menu-item-icon) {
    font-size: 24px;
  }
}
```

- [ ] **Step 3: Format and statically verify the change**

Run:

```powershell
yarn.cmd prettier --write src/layouts/main/asider.vue
yarn.cmd prettier --check src/layouts/main/asider.vue docs/requirements/layout/main-layout.md
yarn.cmd lint
yarn.cmd type-check
```

Expected: every command exits with code `0`.

- [ ] **Step 4: Run regression tests and production build**

Run:

```powershell
yarn.cmd test
yarn.cmd build
git diff --check
git status --short
```

Expected: tests and build exit with code `0`; `git diff --check` reports no whitespace errors; status shows only intended uncommitted changes.
