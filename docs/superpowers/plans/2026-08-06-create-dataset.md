# Create Dataset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a page-specific create-dataset button and modal that validates a single local file, calls the existing create API, and refreshes the dataset list.

**Architecture:** `CreateDataset.vue` owns the trigger button, Modal, typed form state, Upload file list, validation, API call, and success event. A pure payload builder isolates the API mapping for TDD; the list page only handles the `created` event by refreshing the dataset store.

**Tech Stack:** Vue 3.5, TypeScript 5.8, Ant Design Vue 4.2, Vue I18n 11, Vitest 4.

## Global Constraints

- Do not add dependencies or implement real file transfer, chunking, or resume support.
- Use Composition API and `<script setup lang="ts">`; do not use `any`.
- Use `src/styles/components/font.css` classes for font sizes; do not add local `font-size` declarations.
- Keep API calls in `src/api/`; the component may call the existing exported business function.
- User-visible copy must come from the locale bundle.
- Do not commit or stage changes.

---

### Task 1: Typed Create Payload Mapping

**Files:**

- Create: `src/views/dataset-management/components/create-dataset.ts`
- Test: `src/views/dataset-management/components/create-dataset.test.ts`

**Interfaces:**

- Produces: `DatasetType = "3d-point-cloud" | "dicom"`.
- Produces: `CreateDatasetFormValues` with `name`, `description`, and `type`.
- Produces: `buildDatasetInput(values, timestamp): DatasetInput`.

- [ ] Write failing tests proving the builder trims name/description, maps the selected type, emits `code: dataset-<timestamp>`, and fixes `status` to `enabled`.
- [ ] Run `yarn test src/views/dataset-management/components/create-dataset.test.ts` and confirm failure because the module is absent.
- [ ] Implement the minimal typed builder with a purpose comment.
- [ ] Run the focused test and confirm it passes.

### Task 2: Create Dataset Component

**Files:**

- Create: `src/views/dataset-management/components/CreateDataset.vue`
- Modify: `src/locales/messages/zh-CN.ts`

**Interfaces:**

- Emits: `created` after `createDatasetApi` resolves successfully.
- Consumes: `buildDatasetInput`, `createDatasetApi`.
- Owns: Modal visibility, form state, one-file Upload list, form validation, submission state.

- [ ] Add locale keys for modal title/description, fields, placeholders, type labels, upload help, validation, cancel, submit, and success/error feedback.
- [ ] Implement a primary trigger button and a 632px Modal matching the approved visual hierarchy.
- [ ] Use Ant Design Vue Form rules: trimmed name required, type required, file list validated as one required file; description optional.
- [ ] Configure Upload with `max-count="1"`, `:before-upload="() => false"`, and controlled `fileList`; do not call an upload endpoint.
- [ ] On submit, validate, call `createDatasetApi(buildDatasetInput(values, Date.now()))`, guard duplicate submission, show success, reset/close, and emit `created`; on failure keep state and show an error message.
- [ ] Run `yarn type-check` and focused ESLint.

### Task 3: List Page Integration

**Files:**

- Modify: `src/views/dataset-management/index.vue`
- Modify: `src/views/dataset-management/index.style.test.ts`

**Interfaces:**

- Imports and renders `CreateDataset` in place of the inert create button.
- Handles `created` through `handleDatasetCreated(): void`, which starts `datasetStore.refresh()`.

- [ ] Extend the page regression test to require `<CreateDataset @created="handleDatasetCreated" />` and confirm it fails against the inert button.
- [ ] Replace the button and remove the no-longer-used plus icon import.
- [ ] Add the documented refresh handler with error containment delegated to the existing store/page loading behavior.
- [ ] Run the page regression test, type check, and ESLint.

### Task 4: Full Verification

**Files:** Verify all files changed by Tasks 1-3.

- [ ] Format only the changed files with Prettier.
- [ ] Run `yarn lint`, `yarn type-check`, `yarn test`, and `yarn build`.
- [ ] Run `git diff --check` and inspect `git status --short`; do not stage or commit.
