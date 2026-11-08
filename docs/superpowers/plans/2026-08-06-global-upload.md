# Global Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a global Uppy/Tus upload manager with refresh protection, resumable-task recovery, and a conditional Header progress entry.

**Architecture:** A singleton `useUpload()` composable owns Uppy and publishes immutable task summaries. Header components consume summaries and dispatch actions through the composable; Uppy Core, Tus, and Golden Retriever remain hidden behind this boundary.

**Tech Stack:** Vue 3.5, TypeScript 5.8, Uppy Core 5.2, Uppy Tus 5.1, Golden Retriever 5.2, Ant Design Vue 4.2, Vitest 4.

## Global Constraints

- Read the Tus endpoint from `VITE_TUS_ENDPOINT`; do not hardcode or mock a backend URL.
- Do not implement a custom chunk protocol.
- Count only uploading, paused, error, and needs-file tasks as unfinished.
- Use Ant Design Vue for the Header badge, menu entry, Modal, progress, and actions.
- No local `font-size`; use `font.css` classes.
- Do not stage or commit changes.

---

### Task 1: Upload Task Projection

**Files:** Create `src/composables/upload/types.ts`, `src/composables/upload/task.ts`; test `src/composables/upload/task.test.ts`.

- [ ] Write failing tests for status projection, percent calculation, unfinished counting, and restored files mapping to `needs-file`.
- [ ] Run the focused test and confirm the module is absent.
- [ ] Implement typed pure projection functions from Uppy files to `UploadTask`.
- [ ] Run the focused test and confirm pass.

### Task 2: Global Uppy Manager

**Files:** Create `src/composables/upload/useUpload.ts`, `src/composables/upload/index.ts`; modify `src/types/vite-env.d.ts` or create it if absent.

- [ ] Create one lazy Uppy instance with Tus and Golden Retriever, configured from `VITE_TUS_ENDPOINT`.
- [ ] Synchronize Uppy state updates to readonly Vue task summaries.
- [ ] Expose add, pause/resume, retry, cancel, and reselect-file actions; reselect validates name, size, type, and lastModified before replacing restored data.
- [ ] Register `beforeunload` only while unfinished tasks exist and release listeners when none remain.
- [ ] Surface a typed configuration error when endpoint is absent.
- [ ] Run type check and focused tests.

### Task 3: Upload Task Modal

**Files:** Create `src/layouts/main/components/UploadTasksModal.vue`; modify locale bundle.

- [ ] Add upload task/status/action/recovery translations.
- [ ] Render Ant Modal with task name, size, progress, status, errors, and status-appropriate operations.
- [ ] For `needs-file`, use an invisible single-file input and call reselect-file.
- [ ] Emit/update open state without owning upload data.
- [ ] Run type check and ESLint.

### Task 4: Header Integration

**Files:** Modify `src/layouts/main/header.vue`, `src/layouts/main/requirements.md`; test `src/layouts/main/header-upload.test.ts`.

- [ ] Write a failing projection/structure test for conditional menu visibility and unfinished count.
- [ ] Add a visible red `Badge` around the user avatar when unfinished count is positive.
- [ ] Insert “上传任务（N）” before logout only when count is positive; open the task Modal on click.
- [ ] Update Header requirements and verify responsive overflow.

### Task 5: Verification

- [ ] Format changed files only.
- [ ] Run `yarn lint`, `yarn type-check`, `yarn test`, `yarn build`, and `git diff --check`.
- [ ] Keep the branch and worktree unchanged; do not commit.
