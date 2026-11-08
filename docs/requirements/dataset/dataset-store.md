# 数据集 Store 需求

## 功能目标

提供全局共享的完整数据集摘要集合，首次使用时自动加载，数据变更后统一刷新，供列表、下拉框、筛选器和其他业务页面复用。

## 使用场景

- 业务组件首次获取数据集 Store 时自动触发查询。
- 多个组件等待同一次初始化请求，避免重复加载完整集合。
- 异步导入启动成功后刷新 Store，使所有使用方读取最新数据。

## 字段与展示内容

Store 中每条 `Dataset` 仅对应后端分页项的 `dataset`：

- `id: number`
- `name: string`
- `dataType: string`
- `status: "SUCCESS" | "FAILED" | null`
- `itemCount: number`
- `projectReferenceCount: number`
- `description: string | null`
- `isDeleted: boolean`
- `createdAt: string | null`
- `updatedAt: string | null`

Store 不保存 `importRecord`、后端页码、页大小或总数。

## 交互规则

- Store 默认数据为空数组，首次实例化时自动初始化。
- 只有 `status === "initialized"` 时，业务组件才可以认为完整集合已经加载成功。
- 同时发生多个首次加载请求时复用同一个 Promise。
- API 层使用 `pageNo: 1` 和 `pageSize: 10000` 单次查询，并将分页项转换为 `Dataset[]`。
- 查询成功后使用 `datasets.value = result` 整体替换集合，不执行原地增删或排序。
- API 返回 `hasRunningImport: true` 表示仍有导入任务运行，Store 在 30 秒后自动强制刷新。
- 自动刷新执行前若外部调用 `initialize()` 或 `refresh()`，立即取消定时器并执行刷新；已有请求进行中时仍复用该请求。
- 刷新结果仍为 `hasRunningImport: true` 时重新计时，返回 `false` 或请求失败时停止自动刷新。
- 异步导入启动成功后调用 `refresh()` 获取最新完整集合。

## 状态处理

- `uninitialized`：尚未完成初始化，或最近一次请求失败。
- `loading`：正在请求完整数据集集合。
- `initialized`：已成功获取完整数据集集合。
- 请求失败时恢复为 `uninitialized` 并继续向调用方抛出错误，下一次允许重试。

## 接口依赖

- Store 只调用 `getDatasetListApi()`，并消费其 `{ list, hasRunningImport }` 返回结果。
- API 层负责统一响应解包、后端分页参数和 `list[].dataset` 转换。
- 创建导入、浏览器直传和启动导入不属于 Store 职责。
- 单次大分页策略依赖后端当前只校验 `pageSize > 0`；后端增加上限时应只调整 API 层实现。

## 验收标准

- 首次实例化自动发起一次真实查询，默认列表为空数组。
- 并发初始化复用请求，成功后状态为 `initialized`。
- Store 暴露的集合仅包含后端数据集摘要，不包含分页包装或导入记录。
- 查询失败后状态回到 `uninitialized`，后续调用可以重试。
- `refresh()` 重新加载并整体替换完整集合。
- 格式检查、ESLint、TypeScript 检查、相关测试和生产构建通过。
