# 数据集后端接口对接设计

## 目标

以 `src/api/dataset.md` 为唯一后端契约，分阶段调整数据集模块的字段类型、API、Store、路由和页面。列表接口在 API 层隐藏后端分页及 `importRecord` 包装，Store 和页面继续消费完整的数据集摘要集合；创建流程按“创建导入记录、浏览器直传、启动导入、刷新列表”的顺序执行。

## 范围与约束

- 修改数据集需求文档、`src/api/dataset.ts`、`src/stores/dataset.ts`、数据集路由和 `src/views/dataset-management/` 内相关文件。
- 后端字段名、可空性、数字类型和枚举值优先，不保留旧 `code`、`type`、`enabled` 等兼容字段。
- 不改变 `/dataset-management` 路径、路由名称或权限键，只移除该菜单的开发中标识。
- 不新增依赖，不执行 Git 提交；所有提交由用户决定。
- 保留工作区中用户对 `src/views/dataset-management/index.vue` 的现有未提交修改。

## 数据模型边界

对外 `Dataset` 类型仅表示分页响应中 `list[].dataset`：

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

API 层同时定义后端分页响应和 `importRecord` 的协议类型，以准确描述传输数据。转换函数只提取 `list[].dataset`；`importRecord` 不进入 Store，也不成为页面展示模型的一部分。创建导入、上传目标和启动确认分别使用独立类型，不复用列表数据模型。

## API 设计

`GET /datasets` 使用 `pageNo: 1` 和 `pageSize: Number.MAX_SAFE_INTEGER` 发起单次请求。API 层解包统一响应与分页结构，返回 `Dataset[]`。这一实现依赖当前后端仅校验 `pageSize > 0` 且完整请求链路接受该数值；若后端以后增加上限，应改为循环分页，而不改变 Store 和 View 接口。

四个业务方法分别负责：

1. 查询 `GET /dataset-types`，返回创建表单的数据类型及其导入格式选项。
2. 调用 `POST /dataset-imports`，根据表单和源文件元数据创建导入记录，返回 `importId` 与 `uploadTarget`。
3. 调用 `POST /dataset-imports/{importId}/start`，校验已上传源文件并异步启动导入。
4. 调用 `GET /datasets`，返回解包后的完整数据集摘要数组。

预签名地址的文件上传不属于项目业务 API。页面使用原生 `fetch`，严格采用 `uploadTarget.method`、`uploadTarget.url` 和 `uploadTarget.headers`，不经过项目 Axios，避免追加平台鉴权头或执行统一响应转换。

## Store 设计

Store 继续使用 `shallowRef<Dataset[]>([])` 保存完整数据集集合，并保留 `uninitialized`、`loading`、`initialized` 三态、并发初始化 Promise 复用和 `refresh()` 整体替换机制。API 同时返回分页响应中的 `hasRunningImport`；其为 `true` 时 Store 在 30 秒后强制刷新。定时器执行前若外部调用 `initialize()` 或 `refresh()`，立即取消定时器并请求；若请求已在进行则复用现有 Promise。刷新结果仍为 `true` 时重新计时，为 `false` 或失败时停止计时。Store 不保存后端分页信息，不处理创建或上传流程。

首次加载或刷新失败时，状态回到 `uninitialized` 并向调用方抛出错误，以便页面显示失败反馈并允许重试。成功时以 API 返回数组整体替换 `datasets.value`。

## 页面与创建流程

列表页面继续执行前端搜索和分页。展示与筛选改用 `name`、`description` 和 `dataType`；项目引用数和数据单元数直接使用后端的 `projectReferenceCount` 与 `itemCount`；状态仅识别后端 `SUCCESS`、`FAILED` 和空值。

创建弹窗打开时加载数据类型。导入格式不展示；用户选择数据类型后自动使用该类型 `formats` 的首项，切换类型时同步更新，无可用格式时禁止提交。源文件扩展名按默认格式的 `fileExtensions` 忽略大小写校验；空列表不限制格式，切换类型后重新校验已选文件。表单提交顺序为：

1. 校验名称、说明、数据类型、导入格式和单个源文件。
2. 使用文件的 `name` 与 `size` 创建导入记录。
3. 按上传目标原样直传文件，并检查 HTTP 响应是否成功。
4. 使用返回的 `importId` 启动异步导入。
5. 启动成功后关闭并重置弹窗、显示成功消息、触发页面调用 Store `refresh()`。

启动接口成功只表示任务已受理，页面不轮询导入进度。任一步失败都保留弹窗、表单和已选文件，解除提交锁并显示失败消息，允许用户重新执行完整流程。创建期间禁止重复提交和关闭弹窗。

## 文档与测试

实现前同步更新页面就近需求文档、集中页面需求文档和 Store 需求文档，删除假数据及旧字段约定，写明真实接口、单次大分页请求和上传流程。

测试重点包括：

- API 请求参数、统一响应解包、分页列表到 `Dataset[]` 的转换。
- 创建导入和启动导入的请求结构及路径参数。
- Store 初始化、并发复用、失败重试和整体刷新。
- 表单数据到创建导入请求的转换、类型与格式联动、直传失败时不调用启动接口、启动成功后触发刷新。
- 列表展示模型、搜索和前端分页使用新的后端字段。

完成各阶段后运行对应单元测试，最终运行 Prettier 检查、ESLint、TypeScript 类型检查和生产构建。未执行或受环境阻塞的检查需明确报告。

## 验收标准

- 数据集前端模型的字段名和类型与后端 `dataset` 摘要一致。
- 列表 API 单次获取全量分页数据并仅向 Store 返回 `Dataset[]`。
- Store 对所有使用方提供完整集合，页面继续前端搜索和分页。
- 创建弹窗的类型和格式来自后端，文件按预签名指令上传。
- 上传成功后才启动导入，启动成功后刷新全量数据集列表。
- 任一步失败均不误报成功，并保留用户输入以便重试。
- 数据集菜单不再显示开发中状态，现有路由标识保持兼容。
- 不产生未经用户决定的 Git 提交。
