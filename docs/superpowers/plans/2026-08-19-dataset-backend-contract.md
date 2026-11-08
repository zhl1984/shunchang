# 数据集后端接口对接实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 `src/api/dataset.md` 对接数据集类型、导入、直传、启动和列表接口，同时让 Store 提供全量数据集集合。

**Architecture:** API 层定义后端协议类型，使用统一 Axios 完成业务请求，并将分页列表解包为 `Dataset[]`；浏览器直传只使用预签名目标进行原生 `fetch`。Store 维护全量 `shallowRef` 集合，页面负责前端搜索、分页和创建流程编排。

**Tech Stack:** Vue 3、TypeScript、Pinia、Axios、Vue Router、Ant Design Vue、Vitest、原生 Fetch。

## Global Constraints

- 后端字段名、可空性、数字类型和枚举值优先，不保留旧 `code`、`type`、`enabled` 兼容字段。
- 列表 API 使用单次 `pageNo: 1`、`pageSize: Number.MAX_SAFE_INTEGER` 请求并只返回 `list[].dataset`。
- 预签名上传使用原生 `fetch`，严格采用后端返回的 method、url、headers。
- Store 使用 `shallowRef` 整体替换集合，不保存后端分页包装或 `importRecord`。
- 保留用户对 `src/views/dataset-management/index.vue` 的既有未提交修改，不执行 Git 提交。
- 所有新增或修改函数添加用途注释，用户可见文案走国际化语言包。

---

### Task 1: 重建数据集 API 契约

**Files:**

- Modify: `src/api/dataset.ts`
- Create: `src/api/dataset.test.ts`
- Reference: `src/api/dataset.md`, `src/api/http.ts`

**Interfaces:**

- Produces `Dataset`, `DatasetTypeOption`, `DatasetFormatOption`, `CreateDatasetImportInput`, `CreateDatasetImportResult`, `StartDatasetImportResult`, `getDatasetTypesApi()`, `createDatasetImportApi()`, `startDatasetImportApi()`, `getDatasetListApi()`.
- `getDatasetListApi(): Promise<Dataset[]>` sends `GET /datasets` with `{ pageNo: 1, pageSize: Number.MAX_SAFE_INTEGER }` and extracts `data.list[].dataset`.

- [ ] **Step 1: Write failing API contract tests**

Mock the `@/api/http` default export and assert exact URLs, methods, request bodies, list unwrapping, and `importRecord` omission. Cover the `description: null` and `status: null` dataset fields.

- [ ] **Step 2: Run focused tests and verify failure**

Run `yarn test src/api/dataset.test.ts`.
Expected: FAIL because the backend contract functions and types do not exist.

- [ ] **Step 3: Implement typed protocol and API functions**

Define the backend response envelope and nested list response types, use `number` IDs and nullable fields, remove in-memory CRUD data, and add concise comments describing each endpoint's purpose, input, and output. Keep `importRecord` protocol typing private to the API module if it is not needed by consumers.

- [ ] **Step 4: Run focused tests and type-check**

Run `yarn test src/api/dataset.test.ts` and `yarn type-check`.
Expected: PASS with no type errors.

- [ ] **Step 5: Leave changes unstaged**

Do not run `git add` or `git commit`; the user controls commits.

### Task 2: Align Store with full collection API

**Files:**

- Modify: `src/stores/dataset.ts`
- Create or Modify: `src/stores/dataset.test.ts`
- Modify: `docs/requirements/dataset/dataset-store.md` (already synchronized; verify implementation matches it)

**Interfaces:**

- Consumes `getDatasetListApi(): Promise<Dataset[]>` from Task 1.
- Produces `datasets: shallowRef<Dataset[]>`, `initialize(): Promise<void>`, `refresh(): Promise<void>`, and read-only load status.

- [ ] **Step 1: Add Store lifecycle tests**

Mock `getDatasetListApi` and test initial automatic loading, concurrent `initialize()` Promise reuse, full-array replacement, failure reset to `uninitialized`, and `refresh()` reloading.

- [ ] **Step 2: Run Store tests and verify failure**

Run `yarn test src/stores/dataset.test.ts`.
Expected: FAIL for missing or outdated mocked lifecycle assertions.

- [ ] **Step 3: Implement minimal Store changes**

Retain the existing state machine and `shallowRef` behavior, but remove assumptions about mock CRUD and ensure the Store only calls the new full-list API. Preserve error propagation and retry behavior.

- [ ] **Step 4: Run Store tests and type-check**

Run `yarn test src/stores/dataset.test.ts` and `yarn type-check`.
Expected: PASS.

### Task 3: Update dataset route metadata

**Files:**

- Modify: `src/router/index.ts`
- Modify: `src/router/index.test.ts` if metadata assertions exist

**Interfaces:**

- Keeps path `/dataset-management`, name `dataset-management`, `meta.layout: "main"`, menu flag, title key, group, order, icon, and permission behavior unchanged.
- Removes only `meta.developing: true` from the dataset management route.

- [ ] **Step 1: Add or update route metadata assertion**

Assert the route remains a main-layout menu route and `developing` is absent.

- [ ] **Step 2: Run focused router tests**

Run `yarn test src/router/index.test.ts`.
Expected: PASS.

- [ ] **Step 3: Leave route change unstaged**

Do not commit.

### Task 4: Replace create form with four-step import flow

**Files:**

- Modify: `src/views/dataset-management/components/create-dataset.ts`
- Modify: `src/views/dataset-management/components/CreateDataset.vue`
- Create or Modify: `src/views/dataset-management/components/create-dataset.test.ts`
- Modify: `src/locales/messages/zh-CN.ts` for loading, upload, start, and error copy

**Interfaces:**

- Consumes API option and import methods from Task 1.
- Produces a form that submits `datasetName`, `description`, `dataType`, `dataFormat`, and `source.fileName/source.sizeBytes`.
- Emits `created` only after upload and `startDatasetImportApi()` both succeed.

- [ ] **Step 1: Add failing form and sequencing tests**

Cover backend option rendering, data type/format filtering, invalid format clearing, request payload mapping, no start call when upload fails, start call after successful upload, and `created` emission only after start success.

- [ ] **Step 2: Run focused component tests and verify failure**

Run `yarn test src/views/dataset-management/components/create-dataset.test.ts`.
Expected: FAIL because the current form uses hard-coded types and the old CRUD API.

- [ ] **Step 3: Implement option loading and form state**

Load options when the modal opens, derive format options from the selected data type, clear incompatible formats on type changes, validate one file, and prevent closing or duplicate submission while active.

- [ ] **Step 4: Implement create, direct upload, and start sequence**

Call `createDatasetImportApi`, upload the selected file with `fetch(uploadTarget.url, { method: uploadTarget.method, headers: uploadTarget.headers, body: file })`, reject non-2xx responses, then call `startDatasetImportApi(importId)`. Preserve state on any error and emit only after start succeeds.

- [ ] **Step 5: Run focused tests and type-check**

Run `yarn test src/views/dataset-management/components/create-dataset.test.ts` and `yarn type-check`.
Expected: PASS.

### Task 5: Align list view and display utilities

**Files:**

- Modify: `src/views/dataset-management/index.vue`
- Modify: `src/views/dataset-management/types.ts`
- Modify: `src/views/dataset-management/utils.ts`
- Modify: `src/views/dataset-management/utils.test.ts`
- Modify: `src/views/dataset-management/index.style.test.ts` only if behavior-facing selectors change

**Interfaces:**

- Consumes `Dataset[]` from the Store with backend fields.
- Produces display rows using `dataType`, `description`, `itemCount`, `projectReferenceCount`, and nullable `status`.

- [ ] **Step 1: Update utility tests for backend fields**

Replace fixtures using `code/type/enabled` with `dataType`, numeric IDs, nullable descriptions, backend statuses, and real item counts. Assert filtering includes `dataType` and handles `description: null` without throwing.

- [ ] **Step 2: Run utility tests and verify failure**

Run `yarn test src/views/dataset-management/utils.test.ts`.
Expected: FAIL against the old `row.type` and synthetic `sampleCount` assumptions.

- [ ] **Step 3: Implement display model and table bindings**

Remove synthetic version/sample fields, bind item count and project references to backend fields, map `SUCCESS`/`FAILED`/null to localized status text, and preserve current user edits in `index.vue` while changing only required field references.

- [ ] **Step 4: Refresh after successful import and handle failures**

Keep the existing `created` handler calling `datasetStore.refresh()`, report refresh failure, and ensure page search/pagination remains client-side over the complete Store collection.

- [ ] **Step 5: Run focused view tests and type-check**

Run `yarn test src/views/dataset-management/utils.test.ts` and `yarn type-check`.
Expected: PASS.

### Task 6: Run final verification

**Files:**

- Verify all modified dataset files and synchronized requirement/design documents.

- [ ] **Step 1: Run dataset-focused test suite**

Run `yarn test src/api/dataset.test.ts src/stores/dataset.test.ts src/views/dataset-management/utils.test.ts src/views/dataset-management/components/create-dataset.test.ts src/router/index.test.ts`.
Expected: PASS.

- [ ] **Step 2: Run formatting, lint, type, and build checks**

Run `yarn format:check`, `yarn lint`, `yarn type-check`, and `yarn build`.
Expected: all commands complete successfully.

- [ ] **Step 3: Inspect diff and report status**

Run `git diff --check` and `git status --short`; verify no unrelated files changed and no Git commit was created. Report any check that could not run instead of claiming success.
