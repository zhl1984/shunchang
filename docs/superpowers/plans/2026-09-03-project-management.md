# Project Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the `/project-management` list page shown in the reference image with service-side pagination.

**Architecture:** Add a typed project-management API adapter, a page-local requirements document and Vue page using `DmAppTable` in service mode. Replace the placeholder route component while preserving existing layout and navigation metadata.

**Tech Stack:** Vue 3, TypeScript, Ant Design Vue, Axios API wrapper, DmAppTable.

## Global Constraints

- Use Composition API with `<script setup lang="ts">` and explicit types.
- All requests live under `src/api/`; pages must not call Axios directly.
- User-facing text should use existing i18n conventions where available.
- Table actions follow `table-actions-cell` and `table-actions` requirements.

### Task 1: Requirements and API contract

**Files:**
- Create: `src/views/project-management/requirements.md`
- Create: `src/api/project-management.ts`

- [ ] Document goals, fields, service pagination, states, error handling and acceptance criteria.
- [ ] Define `ProjectListItem`, `ProjectListQuery`, `ProjectListResult`, `ProjectSummary` and typed API functions for list and summary retrieval.

### Task 2: Project management page

**Files:**
- Create: `src/views/project-management/index.vue`

- [ ] Render title, five summary cards, search box, disabled-scope “新建项目” entry, and `DmAppTable` columns matching the reference.
- [ ] Maintain query/page state and reload through the API on search and pagination events.
- [ ] Handle loading, empty, API business errors and safe fallback data.

### Task 3: Route and verification

**Files:**
- Modify: `src/router/index.ts`

- [ ] Point `/project-management` to the new page component.
- [ ] Run formatting, lint, type-check and focused tests/build checks; fix only task-related issues.
