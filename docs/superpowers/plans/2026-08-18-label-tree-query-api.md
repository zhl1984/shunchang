# Label Tree Query API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对接 `GET /label-nodes/tree`，并让标签查询数据在 API、Store 和读取组件中统一使用后端字段名。

**Architecture:** `src/api/label.ts` 定义统一响应与后端标签树节点类型并负责 HTTP 解包。标签 Store 直接消费树形响应，递归生成扁平列表、增强树、简化树和映射；调用方只读取 Store 派生结果，不处理后端响应包络。

**Tech Stack:** Vue 3、TypeScript、Pinia、Axios、Vitest

## Global Constraints

- 本次只对接 `GET /label-nodes/tree`，不接入标签节点新增、更新、删除和属性接口。
- 节点字段使用 `parentId`、`nodeType`、`nodeName`、`nodeDescription`、`sortOrder`、`children`。
- 不引入新依赖，不在页面或 Store 中直接使用 Axios。
- 保留 Store 的 `list`、`tree`、`simpleTree`、`mapping`、`initialize()` 和 `refresh()` 公共职责。

---

### Task 1: Query the backend label tree

**Files:**

- Modify: `src/api/label.ts`
- Create: `src/api/label-tree-query.test.ts`

**Interfaces:**

- Produces: `getLabelTreeNodeListApi(): Promise<LabelTreeNode[]>`
- Consumes: `GET /label-nodes/tree` response `{ code, message, data }`

- [x] **Step 1: Write a failing HTTP contract test**
- [x] **Step 2: Run the test and confirm the mock implementation does not call HTTP**
- [x] **Step 3: Define backend node types and implement response unwrapping**
- [x] **Step 4: Run the API test and confirm it passes**

### Task 2: Adapt the label Store and consumers

**Files:**

- Modify: `src/stores/label.ts`
- Modify: `src/stores/label.test.ts`
- Modify: label-management, scenario-config, and model-config consumers of label nodes
- Modify: related TypeScript tests and fixtures

**Interfaces:**

- Consumes: `LabelTreeNode[]` with nested `children`
- Produces: flat `list`, enhanced `tree`, `simpleTree`, and `mapping`

- [x] **Step 1: Update Store tests to use backend-shaped fixtures**
- [x] **Step 2: Run Store tests and confirm old flat-field implementation fails**
- [x] **Step 3: Implement recursive flattening and enhanced tree derivation**
- [x] **Step 4: Rename consumer field reads to backend names and enums**
- [x] **Step 5: Run related tests, ESLint, and type checking**
