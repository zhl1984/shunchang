# Scenario Rule Default Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 当场景的适用规则集合变化时，将当前全部适用规则默认设为启用。

**Architecture:** 保留 `ScenarioRuleSelector.vue` 现有计算属性与事件边界，仅调整 `applicableRules` watcher 的同步结果。初始回显不主动重置；只有适用规则集合发生变化时才向父组件发送全部启用的新值。

**Tech Stack:** Vue 3、TypeScript、Ant Design Vue

## Global Constraints

- 只修改场景规则默认选择行为，不调整样式、组件 API 或键盘交互。
- 不为 `.vue` 文件增加源码字符串测试。
- 修改前同步更新场景配置需求文档。

---

### Task 1: Default-select changed applicable rules

**Files:**

- Modify: `docs/requirements/scenario-config.md`
- Modify: `src/views/scenario-config/components/ScenarioRuleSelector.vue`

**Interfaces:**

- Consumes: `applicableRules: ComputedRef<Rule[]>`
- Produces: `update:value` with `ScenarioRule[]`

- [x] **Step 1: Update the requirement**

在规则交互说明中明确：适用规则集合变化后，当前全部适用规则默认启用。

- [x] **Step 2: Implement the watcher behavior**

在 `watch(applicableRules, ...)` 中直接将当前规则映射为 `{ id, enabled: true }`，并保留相同值不重复发送的判断。

- [x] **Step 3: Verify formatting and static checks**

Run: `yarn.cmd prettier --write docs/requirements/scenario-config.md src/views/scenario-config/components/ScenarioRuleSelector.vue`

Run: `yarn.cmd eslint src/views/scenario-config/components/ScenarioRuleSelector.vue --max-warnings=0`

Run: `yarn.cmd type-check`
