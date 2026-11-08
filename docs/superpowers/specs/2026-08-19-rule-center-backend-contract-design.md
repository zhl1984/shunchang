# 规则中心后端契约对接设计

## 目标

让规则中心前端模型直接遵循 `src/api/rules.md` 的后端字段、枚举和必填约束，逐步完成 API、Store 与 View 的初始化对接，不保留旧字段别名或 API 层转换。

## 范围

- 保留 `/rule-center` 路由和现有菜单配置。
- 类型集中维护在 `src/api/rule.ts`。
- 分四步实施：类型模型、真实接口、规则 Store、规则中心 View。
- 列表与详情按实际消费字段定义独立类型；提交类型不包含服务端展示字段。
- `conditionSummary` 直接使用服务端返回值，移除前端重复摘要生成链路。
- `src/api/rules.md` 仅作为本次对接依据，不纳入运行时代码；不执行 Git 提交。

## 数据模型

- 规则类型使用后端枚举 `WHILE_THEN` 和 `THEN`。
- 规则字段使用 `ruleName`、`ruleType`、`ruleDescription`、`ruleContent`。
- 条件组使用 `logic`、`conditions`；条件项使用 `labelAttributeId`、`operator`、`value`。
- 详情展示可选使用 `labelName`、条件项 `attributeName` 与 `conditionSummary`。
- `ruleDescription` 按后端契约允许 `null`；规则内容和必填条件保持严格非空类型。

## 接口与状态

API 直接请求 `/trusted-rules` 的分页查询、创建、详情、更新和删除接口，统一处理后端响应包装。Store 仅维护规则列表集合、加载状态和刷新动作，不引入前端别名字段。增删改成功后整体刷新列表。

## 页面行为

列表直接展示后端字段和 `conditionSummary`。详情/编辑使用完整 `ruleContent`，提交时仅发送创建/更新契约允许的字段；列表查询和分页参数使用后端的 `pageNo`、`pageSize`。路由地址与菜单保持不变。

## 验证

每一步完成后运行相关单元测试、格式检查、ESLint 和类型检查；未执行的检查不宣称通过。每一步保持独立、最小化改动，由用户决定是否提交。
