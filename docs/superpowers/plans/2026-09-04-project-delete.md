# 项目删除功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为项目管理列表增加带确认弹窗的项目删除能力。

**Architecture:** 复用现有项目 API、项目管理页面加载方法和 Ant Design Vue `Modal.confirm`。删除确认成功后整体刷新列表与统计数据，并通过国际化文案反馈结果。

**Tech Stack:** Vue 3、TypeScript、Ant Design Vue、Vitest、Yarn。

## Global Constraints

- 所有请求继续通过 `src/api/` 暴露的业务函数完成。
- 不新增依赖，不使用 `any`，用户可见文案使用国际化语言包。
- 修改已有功能前同步更新页面需求文档。

---

### Task 1: 接入删除确认与刷新流程

**Files:**
- Modify: `src/views/project-management/index.vue`
- Modify: `src/views/project-management/requirements.md`

- [ ] 引入 `Modal` 与 `deleteProjectApi`，为删除按钮绑定 `handleDeleteProject(record)`。
- [ ] 在处理函数中以项目名称构造确认内容，确认后调用删除 API；成功时调用 `initializePage()` 并提示成功，失败时提示失败并抛出错误让确认弹窗保持失败状态。
- [ ] 更新需求文档，明确删除确认、成功刷新和失败反馈规则。
- [ ] 运行 `yarn.cmd prettier --check src/views/project-management/index.vue src/views/project-management/requirements.md`。
- [ ] 运行 `yarn.cmd eslint src/views/project-management/index.vue --max-warnings=0`。

### Task 2: 验证项目列表行为

**Files:**
- Test: `src/views/project-management/index.test.ts`

- [ ] 为删除 API、Modal 和页面刷新流程补充可观察行为测试；至少验证确认回调调用删除 API，并在成功后刷新列表与统计。
- [ ] 运行 `yarn.cmd test src/views/project-management/index.test.ts`。
- [ ] 根据测试结果修正类型或交互实现，不改变无关页面行为。
