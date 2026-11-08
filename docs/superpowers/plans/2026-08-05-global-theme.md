# Global Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Ant Design Vue light/dark algorithms and runtime color variables as the platform-wide theme foundation.

**Architecture:** Keep persisted theme selection in Pinia and derive the Ant Design configuration at the root provider. Map runtime Ant variables to a small project semantic variable layer and make the main menu consume the resolved theme.

**Tech Stack:** Vue 3.5, TypeScript 5.8, Pinia 2.3, Ant Design Vue 4.2, Less/CSS

## Global Constraints

- Do not add dependencies.
- Preserve the existing `light | dark | system` theme mode contract.
- Use Ant Design tokens or CSS variables instead of new hardcoded theme colors.

---

### Task 1: Root theme provider

**Files:**

- Modify: `src/App.vue`
- Create: `src/styles/theme.css`

- [x] Keep the existing Ant Design light/dark algorithms for library components.
- [x] Synchronize `theme-light` or `theme-dark` on the document root.
- [x] Declare the commonly used `--dm-*` colors in the static theme stylesheet.

### Task 2: Theme-aware main menu

**Files:**

- Modify: `src/layouts/main/index.vue`
- Modify: `src/layouts/main/requirements.md`

- [x] Read the resolved theme from the existing theme store.
- [x] Select the Ant Design menu theme dynamically.
- [x] Update the layout requirement and run all repository verification commands.
