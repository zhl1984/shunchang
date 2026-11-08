# Scenario Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the `/scenario-config` global scenario list with typed state and a one-row placeholder.

**Architecture:** API types define the frontend model, a Pinia store owns list state and initialization, and the view renders a main-layout table with i18n labels. No CRUD mutations are implemented.

**Tech Stack:** Vue 3, TypeScript, Pinia, Ant Design Vue, Vue Router, vue-i18n.

## Global Constraints

- Use Composition API and explicit types; no `any` or hardcoded user-facing copy.
- Keep requests in `src/api` and global scenario state in `src/stores/scenario.ts`.

### Task 1: Model and store

Create `src/api/scenario.ts` with `Scenario`, `ScenarioLabel`, `ScenarioRule`, `ScenarioProject`, and list API boundary. Create `src/stores/scenario.ts` with initialization, refresh, readonly scenarios, and one placeholder row.

### Task 2: Page and route

Create page requirements and `src/views/scenario-config/index.vue`; update route to load it. Render search, table columns, pagination, empty/loading/error states, and no-op action buttons.

### Task 3: Localization and verification

Add scenario page/menu strings to the locale and run formatter, lint, type-check, and relevant tests.
