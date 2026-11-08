# 质检评论管理端页面与 pc-tool iframe 集成方案

> 2026-09-04 架构调整：质检评论不再作为独立构建子应用，而是 fe-management 普通路由页面；pc-tool 仅通过同域 iframe 调用。以下历史章节保留作为迁移记录，独立构建配置与 standalone 方案不再作为当前实现基准。

## 当前实现基准（2026-09-04）

- 路由入口：`/tool/quality-comment`，使用管理端主应用路由和全屏布局，不配置业务权限；默认复用管理端登录态。
- 页面入口：`src/views/quality-comment/index.vue`，复用管理端主题、全局样式和 API 层。
- 管理端页面先由 `QualityCommentEntry` 顶级承接组件按 URL `entry=clip|object|history` 分发，再渲染样本评论、对象评论或独立历史列表；非法入口显示错误，不默认回退样本评论。
- `taskId` 只表示标注任务；`qualityTaskId` 只表示质检任务。质检接口缺少 `qualityTaskId` 时直接阻止请求，禁止回退到 `taskId`。
- pc-tool 仅生成同域 iframe URL、传递上下文、处理关闭和历史定位；评论新增与历史查询由管理端页面调用 `/quality-tasks/{qualityTaskId}/quality-issues` 和 `/quality-tasks/{qualityTaskId}/quality-records`。`qualityTaskId` 由 `label-config` 返回并写入 pc-tool 工作台全局状态，禁止使用 URL 或 `taskId` 降级替代。
- iframe 边界仅保留 `channel=quality-comment` 的轻量消息：`SUBMIT_SUCCESS`、`SUBMIT_ERROR`、`LOCATE`、`CLOSE`；旧 bridge、session、MessageChannel 和独立 resize 机制不再作为新页面依赖。
- `mode=qc`、`mode=re` 的工作台行为由 pc-tool 控制；管理端质检页面只消费 URL 上下文。

### 本次迁移文件记录

新增：

- `src/views/quality-comment/index.vue`
- `src/views/quality-comment/components/QualityCommentEntry.vue`
- `src/api/quality-comment.ts`

修改：

- `src/router/index.ts`
- `src/locales/messages/zh-CN.ts`
- `src/quality-comment/types.ts`
- `src/quality-comment/validation.ts`
- `vite.config.ts`
- `package.json`
- `xtreme-frontend/pc-tool/src/components/QualityCommentIframe.vue`
- `xtreme-frontend/pc-tool/src/components/QualityCommentLayer.vue`
- `xtreme-frontend/pc-tool/src/api/common.ts`
- `xtreme-frontend/pc-tool/src/hook/useTool.ts`
- `xtreme-frontend/pc-tool/src/state.ts`
- `xtreme-frontend/pc-tool/src/type.ts`

删除：

- `quality-comment/index.html`
- `quality-comment/main.ts`
- `vite.config.quality-comment.ts`

迁移期间保留的 `src/quality-comment/` bridge/protocol 文件仅用于旧测试和过渡代码，后续确认所有调用方切换到路由页面后应删除，不得继续新增依赖。

## 1. 文档信息

| 项目     | 内容                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------- |
| 文档名称 | 质检评论 iframe 子应用实施基准                                                                 |
| 适用范围 | `fe-management`、`xtreme-frontend/pc-tool` 及未来同域工作台                                    |
| 关联 PRD | `.prototype/4D点云标注与质检工作台V1.1_PRD.docx`                                               |
| 文档状态 | 开发基准方案                                                                                   |
| 目标版本 | V1.0                                                                                           |
| 方案结论 | 由 `fe-management` 提供普通路由页面，pc-tool 通过同域 iframe 调用；接口由管理端 API 层统一处理 |

本文是开发、联调和验收的基准文档。若后端接口、入口协议或 PRD 发生变化，应先更新本文，再修改实现。

## 2. 背景与目标

当前 4D 点云标注与质检工作台需要支持两类质检评论：

1. Clip/样本级评论：关联当前 3D 样本或 4D Clip，与是否选中对象无关。
2. 对象级评论：关联对象、标签；4D 额外关联帧和 `tracingID`。

评论能力未来会被当前两个项目之外的其他前端工作台调用。为降低多项目重复开发和发布成本，评论 UI 统一维护在 `fe-management` 的普通路由页面中，并通过同域 iframe 嵌入所有工作台。

核心目标：

- 一套评论 UI 支持多个工作台和不同前端框架。
- 页面复用管理端 API 层处理评论接口，不读取 pc-tool Pinia 或编辑器实例。
- 工作台负责权限、上下文、对象定位和任务状态。
- Clip 级评论与对象级评论在同一子应用中实现为两个明确的组件入口。
- 质检历史同时展示 Clip 级和对象级记录。
- 保留版本化、可扩展的跨窗口通信能力。

## 3. 已确认要求与待确认项

### 3.1 已确认要求

- 所有前端项目部署在同一域名下。
- 评论子应用由 `fe-management` 维护和部署。
- 子应用通过 iframe 供工作台调用。
- 页面根据 URL 上下文渲染；提交成功/失败和定位操作通过轻量消息回传工作台。
- Clip 级评论不依赖当前对象选中状态。
- Clip 级和对象级评论是同一子应用下的两个不同评论组件。
- 历史记录同时展示 Clip 级和对象级评论。
- 当前入口参数尚未由后端最终确定。

### 3.2 PRD 已确认的业务规则

- 评论内容去除首尾空格后不得为空，最大 1000 个字符。
- 评论性质为“必须修改”和“建议修改”，默认“必须修改”。
- 提交期间按钮显示加载状态并禁止重复点击。
- 保存成功提示“质检意见已保存”。
- 保存失败提示“质检意见保存失败，请重试”，并保留弹窗和已输入内容。
- 历史按创建时间倒序展示时间、质检人员、目标范围、意见性质和内容。
- 已删除对象的历史仍然展示，并提示关联对象已不存在。
- 4D 对象级历史支持切换到对应帧并选中对象。
- 3D 对象级历史支持选中对应对象。
- 工作台不提供质检通过/退回按钮，也不因保存评论自动改变任务状态。

### 3.3 待确认项

以下内容不得在前端代码中自行假设：

- 正式入口参数及入口版本。
- 评论新增、历史查询接口路径、请求参数和响应包装。
- 是否支持评论编辑、删除或撤回。
- 评论分页和单次最大返回数量。
- `platformSource` 的正式枚举。
- 评论权限与任务状态限制。
- 4D 的 `frameId`、`frameNo` 和 `tracingID` 的权威字段。
- 后端时间格式、时区和排序规则。
- 网关、Nginx 和 CSP 的最终配置。

## 4. 总体架构

```text
┌──────────────────────────────────────────────────────────┐
│ 工作台宿主：pc-tool / 其他同域工作台                      │
│                                                          │
│ 任务、Clip、帧、对象、权限、对象定位、iframe 生命周期       │
│                                                          │
│ 1. 组装上下文                                              │
│ 2. 打开评论组件                                             │
│ 3. 处理管理端页面的成功/失败和关闭消息                       │
│ 4. 处理对象定位和任务状态                                   │
└─────────────────────────┬────────────────────────────────┘
                          │ postMessage / MessageChannel
┌─────────────────────────▼────────────────────────────────┐
│ fe-management 提供的 quality-comment iframe 子应用         │
│                                                          │
│ ClipCommentModal / ObjectCommentModal / HistoryDrawer      │
│ 表单校验、加载状态、展示状态、用户意图回传                  │
│                                                          │
│ 复用管理端登录态和 API 层，不持有 pc-tool 编辑器对象           │
└──────────────────────────────────────────────────────────┘
```

### 4.1 数据所有权

| 数据或能力               | 所属方                  | 规则                                 |
| ------------------------ | ----------------------- | ------------------------------------ |
| 当前任务、Clip、帧、对象 | 工作台                  | iframe 只接收展示快照                |
| 当前用户和质检权限       | 工作台/后端             | iframe 不自行判断权限                |
| 评论历史真实数据         | 后端，经管理端 API 获取 | 页面直接展示管理端 API 结果          |
| 评论输入草稿             | iframe                  | 提交失败时保留，成功后由宿主确认结果 |
| 评论新增请求             | 页面产生，管理端执行    | 成功/失败结果通过消息通知工作台      |
| 对象定位                 | 工作台                  | iframe 只发出定位请求                |
| 任务通过/退回            | 任务页或工作台          | 评论子应用不处理                     |
| 认证信息                 | 宿主请求层              | 不放入 URL 或消息 payload            |

## 5. 路由页面与 iframe 部署

建议目录：

```text
fe-management/
├─ src/views/quality-comment/index.vue
├─ src/views/quality-comment/components/QualityCommentEntry.vue
├─ src/api/quality-comment.ts
└─ src/quality-comment/components/
   ├─ ClipQualityCommentPanel.vue
   ├─ ObjectQualityCommentPanel.vue
   ├─ QualityCommentEditor.vue
   └─ QualityCommentHistoryList.vue
```

构建输出：

```text
dist/（管理端主应用构建产物）
```

生产访问地址：

```text
https://<host>/tool/quality-comment/
```

质检页面注册在管理端主 Router 的 `/tool/quality-comment` 全屏路由中，不进入菜单；pc-tool 通过同域 iframe 访问该路由。管理端页面复用登录态、主题和 API 层，不再维护独立构建入口。

所有工作台优先使用同源相对地址：

```ts
const qualityCommentUrl = "/tool/quality-comment/";
```

如需临时切换到其他已部署地址，可通过环境变量覆盖；默认不配置时使用同域路径：

```text
VITE_QUALITY_COMMENT_URL=/tool/quality-comment/
```

## 6. 组件设计

### 6.1 Clip 级评论组件

组件：`ClipQualityCommentPanel.vue`

输入：

- 当前任务名称（可选）。
- 当前样本或 Clip 名称。
- 当前作业单元类型：`SAMPLE` 或 `CLIP`。
- 当前作业单元 ID。
- 当前工作台来源。

约束：

- 不读取当前对象选中状态。
- 不显示对象 ID、标签或 `tracingID`。
- 提交目标固定为当前作业单元。

### 6.2 对象级评论组件

组件：`ObjectQualityCommentPanel.vue`

输入：

- 当前任务和作业单元。
- 对象 ID。
- 标签 ID/编码/名称快照。
- 当前帧 ID/帧号（4D）。
- `tracingID`（4D）。

约束：

- 关联字段自动带入且只读。
- 3D 不展示 `tracingID` 和帧信息。
- 4D 必须保留帧信息和 `tracingID`。
- iframe 不允许用户修改关联目标。

### 6.3 统一表单组件

组件：`QualityCommentEditor.vue`

负责：

- 多行文本输入。
- 评论性质选择。
- 首尾空格校验。
- 1000 字符限制。
- 提交中状态。
- 错误状态和重试。

表单只产生提交意图，不直接发请求。

### 6.4 历史抽屉

组件：`QualityCommentHistoryDrawer.vue`

历史记录统一展示：

- Clip/样本级记录。
- 对象级记录。
- 创建时间倒序。
- 质检人。
- 评论性质。
- 评论内容。
- 关联对象和帧信息。
- 已删除对象状态。

对象级历史项可以点击定位；Clip 级历史项不触发对象定位。

## 7. 统一数据模型

### 7.1 工作台上下文

```ts
type QualityCommentContext = {
  taskId: string;
  unit: {
    type: "SAMPLE" | "CLIP";
    id: string;
    name?: string;
  };
  frame?: {
    id: string;
    no?: number;
  };
  platformSource: string;
  hostAppId?: string;
  taskName?: string;
  /** 工作台模式，不表示评论范围；评论范围由 OPEN_* 事件或 openScope 指定。 */
  mode: "ANNOTATION" | "QUALITY";
  openScope?: "CLIP" | "OBJECT";
  selectedObject?: {
    id: string;
    labelId?: string;
    labelCode?: string;
    labelName?: string;
    tracingId?: string;
  };
  capabilities: {
    canCreateComment: boolean;
    canViewHistory: boolean;
    canLocateObject: boolean;
  };
};
```

`selectedObject` 只用于对象级入口的展示快照，不用于推断 Clip 级评论范围。

### 7.2 评论目标

```ts
type QualityCommentTarget = {
  taskId: string;
  unitType: "SAMPLE" | "CLIP";
  unitId: string;
  frameId?: string;
  frameNo?: number;
  objectId?: string;
  labelId?: string;
  labelCode?: string;
  labelName?: string;
  tracingId?: string;
  platformSource: string;
};
```

### 7.3 历史记录

```ts
type QualityCommentHistoryItem = {
  id: string;
  scope: "CLIP" | "OBJECT";
  content: string;
  severity: "MUST_FIX" | "SUGGESTION";
  reviewerName: string;
  createdAt: string;
  target: QualityCommentTarget;
  objectExists?: boolean;
};
```

历史关联应优先依赖稳定的 `labelId` 或 `labelCode`，`labelName` 仅作为展示快照，不能作为唯一关联键。

## 8. 通信协议

### 8.1 消息 envelope

```ts
type QualityCommentMessage<T = unknown> = {
  channel: "quality-comment";
  protocolVersion: "1.0";
  event: string;
  requestId: string;
  sessionId: string;
  revision?: number;
  payload?: T;
};
```

`sessionId` 用于识别当前 iframe 实例，`requestId` 用于匹配异步响应，`revision` 用于丢弃过期上下文消息。

### 8.2 宿主发送事件

| 事件                  | 用途                               |
| --------------------- | ---------------------------------- |
| `INIT_CONTEXT`        | 发送工作台、权限、能力和当前上下文 |
| `OPEN_CLIP_COMMENT`   | 打开 Clip/样本级评论组件           |
| `OPEN_OBJECT_COMMENT` | 打开对象级评论组件                 |
| `SET_HISTORY`         | 发送当前作业单元的全部评论历史     |
| `SUBMIT_RESULT`       | 返回评论新增成功或失败             |
| `LOCATE_RESULT`       | 返回对象定位成功、失败或对象已删除 |
| `HOST_ERROR`          | 通知宿主侧异常                     |
| `CLOSE`               | 关闭当前弹窗或抽屉                 |

### 8.3 iframe 发送事件

| 事件                      | 用途                     |
| ------------------------- | ------------------------ |
| `READY`                   | 子应用准备完成           |
| `COMMENT_SUBMIT_REQUEST`  | 请求宿主新增评论         |
| `HISTORY_REFRESH_REQUEST` | 请求宿主重新查询历史     |
| `LOCATE_REQUEST`          | 请求宿主定位历史关联对象 |
| `CLOSE_REQUEST`           | 请求关闭当前窗口         |
| `RESIZE`                  | 通知内容高度变化         |
| `ERROR`                   | 报告协议或渲染错误       |

### 8.4 评论提交消息

```ts
type CommentSubmitRequest = {
  scope: "CLIP" | "OBJECT";
  target: QualityCommentTarget;
  content: string;
  severity: "MUST_FIX" | "SUGGESTION";
};
```

宿主必须重新以当前工作台状态校验 `target`，不能直接信任 iframe 回传的任务、帧或对象 ID。

### 8.5 历史定位消息

```ts
type LocateRequest = {
  commentId: string;
  target: QualityCommentTarget;
};
```

宿主处理规则：

- 3D：校验对象归属后直接选中对象。
- 4D：先切换到 `frameId`/`frameNo`，再选中对象或轨迹。
- 对象不存在：返回不可定位结果，但不得阻止历史查看。
- 目标不属于当前任务：拒绝定位并记录安全日志。

### 8.6 通道策略

1. 首次握手使用 `window.postMessage`。
2. 当前 Demo 已预留 `MessageChannel` 端口接管能力，宿主确认后可将 `MessagePort` 作为后续主通道。
3. `window.postMessage` 保留为降级通道。
4. `BroadcastChannel` 仅作为未来多窗口刷新通知能力，不承载评论新增主流程。
5. 不直接访问 `window.parent` 的 DOM、Store 或全局业务对象。

同域不等于可以跳过来源校验。生产环境仍然必须使用明确的 `targetOrigin`，禁止长期使用 `"*"`。

## 9. 接口与鉴权边界

### 9.1 V1 推荐模式

质检评论 iframe 不直接调用接口。

以 `pc-tool` 为例：

```text
用户操作
  -> iframe COMMENT_SUBMIT_REQUEST
  -> pc-tool 校验上下文和权限
  -> pc-tool/src/api/quality-comment.ts 调用接口
  -> pc-tool 返回 SUBMIT_RESULT
  -> pc-tool 重新查询历史并发送 SET_HISTORY
```

其他工作台采用相同协议，但可以使用自己的 API 模块、鉴权方式和后端地址。`fe-management` 中的子应用不放置具体业务评论 API。

pc-tool 宿主通过 `POST /api/quality-tasks/{qualityTaskId}/quality-issues` 保存样本级或标签级质检问题，保存成功后调用
`GET /api/quality-tasks/{qualityTaskId}/quality-records?itemId={itemId}` 重新查询历史。iframe 子应用仍不直接调用接口。

### 9.2 接口适配器职责

每个宿主实现自己的适配层，至少包含：

```ts
interface QualityCommentHostAdapter {
  getContext(): QualityCommentContext;
  createComment(input: CommentSubmitRequest): Promise<void>;
  getHistory(unitId: string): Promise<QualityCommentHistoryItem[]>;
  locate(
    target: QualityCommentTarget,
  ): Promise<"located" | "missing" | "rejected">;
}
```

该接口是宿主内部约定，不通过 iframe 暴露函数。

### 9.3 鉴权原则

- iframe URL 不携带 Token。
- `postMessage` payload 不携带 Token、Cookie 或密码。
- 子应用不读取 `document.cookie`、localStorage 中的业务 Token 或主站 Pinia。
- 宿主使用自己的请求实例和会话信息调用 API。
- 后端必须重新校验评论权限、任务归属和对象归属。
- 质检模式下标注写接口仍由服务端拒绝，不能只依赖前端禁用按钮。

### 9.4 未来接口扩展

如果未来子应用确实需要请求只读接口，优先使用同源相对路径和浏览器自动携带的 HttpOnly Cookie。新增写请求前必须补充 CSRF、401、403、超时和重试策略。本阶段不提前实现。

## 10. Demo 入口协议

后端正式入口尚未确定，Demo 阶段允许宿主侧临时接收：

```text
taskId
unitId
sampleId
clipId
frameId
sortNo
mode
platformSource
```

必须明确标记为：

> Demo 入口协议，待后端正式入口确认后替换；不作为长期兼容策略。

推荐做法：

1. 由宿主将 Demo URL 参数转换为 `QualityCommentContext`。
2. iframe 本身不解析这些业务参数。
3. 正式入口确认后，只替换宿主入口转换逻辑。
4. 删除 Demo 参数别名和旧入口分支，不保留长期兼容代码。

## 11. 关键业务流程

### 11.1 Clip 级评论

```text
工作台点击顶部“填写质检意见”
  -> 发送 OPEN_CLIP_COMMENT
  -> iframe 打开 ClipQualityCommentModal
  -> 用户输入内容和评论性质
  -> iframe 发送 COMMENT_SUBMIT_REQUEST(scope=CLIP)
  -> 工作台调用评论新增接口
  -> 返回 SUBMIT_RESULT
  -> 成功后刷新并发送 SET_HISTORY
```

该流程与当前是否选中特定对象无关。

### 11.2 对象级评论

```text
工作台选中对象并点击“质检评论”
  -> 工作台组装对象快照
  -> 发送 OPEN_OBJECT_COMMENT
  -> iframe 展示只读关联信息
  -> 用户输入内容和评论性质
  -> iframe 发送 COMMENT_SUBMIT_REQUEST(scope=OBJECT)
  -> 工作台校验对象仍属于当前帧/Clip
  -> 工作台调用评论新增接口
  -> 返回 SUBMIT_RESULT
```

### 11.3 查看历史

```text
工作台打开质检历史
  -> 工作台查询当前样本/Clip 的全部评论
  -> 发送 SET_HISTORY
  -> iframe 同时展示 Clip 级和对象级记录
```

### 11.4 历史定位

```text
用户点击对象级历史
  -> iframe 发送 LOCATE_REQUEST
  -> 工作台验证任务、Clip、帧和对象归属
  -> 4D 先切帧，再选中对象
  -> 返回 LOCATE_RESULT
```

## 12. 工作台集成建议

### 12.1 pc-tool

建议新增：

```text
pc-tool/src/api/quality-comment.ts
pc-tool/src/components/QualityCommentIframe.vue
pc-tool/src/protocol/quality-comment.ts
```

工作台适配逻辑应：

- 从 `editor.bsState`、当前帧和 `editor.pc.selection` 组装上下文。
- Clip 级入口不读取 selection 作为判断依据。
- 对象级入口读取当前对象的 `uuid`、标签和 `trackId/tracingID`。
- 4D 定位复用现有帧切换和对象选中能力。
- 评论接口不接入标注对象保存链路。
- 评论提交成功后只刷新评论历史，不自动修改任务状态。

### 12.2 其他工作台

其他项目只需要实现：

- iframe 容器。
- 上下文转换。
- 评论新增和历史查询。
- 能力声明。
- 对象定位（如果支持）。

工作台可以是 Vue、React 或其他框架，不能依赖子应用内部组件实现。

## 13. 错误、并发与可靠性

### 13.1 错误处理

| 场景                | 处理                                             |
| ------------------- | ------------------------------------------------ |
| iframe 加载失败     | 宿主展示不可用提示，不影响工作台其他功能         |
| READY 超时          | 记录 URL、协议版本和宿主版本                     |
| schema/context 无效 | iframe 发送 `ERROR`，不提交数据                  |
| 提交失败            | iframe 保留内容，允许重新提交                    |
| 401/403             | 宿主统一处理会话或权限，不在 iframe 内嵌套登录页 |
| 对象已删除          | 历史仍展示，定位返回 `missing`                   |
| 非法消息来源        | 丢弃消息并记录安全日志                           |
| revision 过期       | 丢弃消息，避免写入新对象或新 Clip                |

### 13.2 并发控制

- 每个 iframe 实例生成唯一 `sessionId`。
- 每次上下文切换递增 `revision`。
- 每次提交生成唯一 `requestId`。
- 提交中禁止重复点击。
- 宿主在卸载 iframe 时取消或忽略未完成请求的回调。
- 历史刷新以最后一次请求结果为准，旧结果不得覆盖新上下文。

### 13.3 权限控制

`capabilities` 只用于界面能力控制，不能替代后端权限校验。以下动作必须由宿主和服务端共同保护：

- 新增评论。
- 查看其他任务历史。
- 定位不属于当前任务的对象。
- 质检模式下的任何标注写操作。

## 14. 构建与部署

推荐构建顺序：

```bash
yarn build
yarn build:quality-comment
```

主站构建可能清理 `dist`，因此必须先构建主站，再构建 quality-comment 子应用。子应用构建不得清空整个 `dist`。

部署目录：

```text
dist/
├─ index.html
├─ assets/
└─ tool/
   └─ quality-comment/
      ├─ index.html
      └─ assets/
```

Nginx 必须为 `/tool/quality-comment/` 配置更具体的静态资源 location，避免被主站 `/index.html` fallback 接管。

发布时应保证：

- 子应用 HTML 和 chunk 版本一致。
- 旧 HTML 引用的静态资源不会立即删除。
- pc-tool 与子应用协议版本可互通。
- 发布后完成实际 iframe 加载和 READY 握手检查。

## 15. 测试与验收

### 15.1 子应用单元测试

- Clip 级入口不受对象选中状态影响。
- 对象级入口展示正确的只读关联信息。
- 空格内容不可提交。
- 1000 字符限制正确。
- 默认性质为 `MUST_FIX`。
- 提交失败保留输入内容。
- 历史同时展示 Clip 和 Object 两种 scope。
- 历史按创建时间倒序展示。
- 已删除对象显示不可定位状态。
- 非法消息、错误协议版本和过期 revision 被拒绝。

### 15.2 宿主集成测试

- iframe 能收到 READY 并完成初始化。
- `OPEN_CLIP_COMMENT` 能打开 Clip 级评论。
- `OPEN_OBJECT_COMMENT` 能打开对象级评论。
- 提交事件能被宿主接收并调用宿主 API。
- 宿主 API 成功/失败结果能正确回传。
- 历史刷新不会混入其他任务或 Clip 的记录。
- 4D 历史定位先切帧后选中对象。
- 3D 历史定位能选中对象。
- 旧对象或旧 revision 消息不会污染当前上下文。
- 评论操作不会触发标注保存或任务状态变更。

### 15.3 发布验证

- `/tool/quality-comment/` 返回子应用 HTML。
- 子应用 JS/CSS 路径正确。
- 主站 fallback 不会替代子应用入口。
- DevTools 中看不到 Token 出现在 iframe URL 或消息 payload。
- 非法 origin/source 消息不会触发 UI 或接口调用。
- 401/403 能由宿主统一处理。

## 16. 实施阶段

### 阶段一：子应用骨架与协议

- 创建独立入口和构建配置。
- 定义 `types.ts`、`protocol.ts` 和消息校验。
- 实现 Clip 级、对象级弹窗和统一历史抽屉静态渲染。
- 使用静态 Demo 上下文完成握手、打开、关闭和尺寸同步。

### 阶段二：pc-tool 宿主适配

- 新增 iframe 容器。
- 组装 3D/4D 工作台上下文。
- 接入 Clip 级和对象级打开入口。
- 接入对象定位回调。
- 保证评论链路不进入标注保存逻辑。

### 阶段三：真实接口联调

- 在 pc-tool 宿主侧新增评论 API 适配。
- 接入历史查询和新增评论。
- 完成错误、权限、分页和重试处理。
- 验证 3D/4D 历史定位和已删除对象历史。

### 阶段四：正式入口切换

- 后端确认正式入口协议。
- 宿主替换 Demo 参数转换逻辑。
- 删除 Demo 别名和旧入口分支。
- 不保留未来不需要的兼容代码。

### 阶段五：其他工作台接入

- 提供协议说明和集成示例。
- 各工作台实现本地 Host Adapter。
- 根据自身能力声明 `canCreateComment`、`canViewHistory` 和 `canLocateObject`。
- 进行跨框架联调。

## 17. 风险与控制措施

| 风险                           | 等级 | 控制措施                                       |
| ------------------------------ | ---- | ---------------------------------------------- |
| 子应用误调用业务接口           | 高   | V1 不提供 API 模块；通过代码审查和构建检查约束 |
| iframe 回传过期对象            | 高   | `sessionId`、`requestId`、`revision` 三层校验  |
| Clip 级评论错误依赖选中对象    | 高   | 使用独立 `OPEN_CLIP_COMMENT` 事件和明确 scope  |
| 评论历史跨任务混入             | 高   | 宿主以当前 task/unit 查询并重新校验目标        |
| 入口协议未确认导致长期兼容代码 | 中   | Demo 参数只在宿主转换，正式入口确认后删除      |
| 同域导致误以为无需消息安全校验 | 中   | 仍校验 origin、source、channel 和版本          |
| 子应用静态资源被主 SPA 接管    | 中   | Nginx 专用 location 和发布后入口验证           |
| API 失败导致用户输入丢失       | 中   | `SUBMIT_RESULT` 明确失败状态，iframe 保留草稿  |
| 不同工作台能力差异             | 中   | INIT 中传递 capabilities，定位等能力可选       |

## 18. 结论

本方案将质检评论定义为一个纯交互、跨工作台复用的 iframe 子应用：

```text
fe-management：维护 UI、协议和部署产物
工作台：维护上下文、权限、接口和定位
后端：维护评论数据和最终权限
postMessage：维护跨应用边界
同域 Cookie：仅服务于宿主请求，暂不暴露给 iframe
```

Clip 级评论和对象级评论必须通过显式入口区分，历史统一展示；子应用只回传用户意图，宿主重新确认业务上下文后调用接口。当前入口仅按 Demo 协议实现，后端正式入口确认后直接切换，不保留长期兼容层。

## 19. 参考资料

- `.prototype/4D点云标注与质检工作台V1.1_PRD.docx`
- `docs/architecture/dynamic-form-iframe-design.md`
- `docs/architecture/dynamic-form-demo-development.md`
- `src/dynamic-form/protocol.ts`
- `D:/document/code/xtreme-frontend/pc-tool/src/components/EditClass/DynamicFormIframe.vue`
- `D:/document/code/xtreme-frontend/pc-tool/src/pages/execute.ts`
- `D:/document/code/xtreme-frontend/pc-tool/src/hook/useTool.ts`

## 20. 本轮实现记录（2026-08-28）

本轮按本文方案完成第一版纯前端 Demo，暂不接入任何质检业务 API。

### 20.1 新增文件

| 文件                                                             | 用途                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| `quality-comment/index.html`                                     | 独立子应用 HTML 入口                                    |
| `quality-comment/main.ts`                                        | 连接独立 HTML 与 `src/quality-comment/main.ts` 的薄入口 |
| `vite.config.quality-comment.ts`                                 | `/tool/quality-comment/` 独立构建配置                   |
| `src/quality-comment/main.ts`                                    | Vue 子应用启动入口                                      |
| `src/quality-comment/App.vue`                                    | Clip/对象评论 Demo、历史展示、消息收发和提交意图回传    |
| `src/quality-comment/bridge.ts`                                  | postMessage/MessageChannel 桥接、请求状态和生命周期     |
| `src/quality-comment/types.ts`                                   | 上下文、评论目标、历史记录和提交请求类型                |
| `src/quality-comment/protocol.ts`                                | 版本化 `quality-comment` 消息协议和消息校验             |
| `src/quality-comment/styles.less`                                | 子应用基础主题和布局样式                                |
| `src/quality-comment/validation.ts`                              | 评论内容校验和提交目标构造                              |
| `src/quality-comment/components/ClipQualityCommentPanel.vue`     | 样本级评论展示与编辑入口                                |
| `src/quality-comment/components/ObjectQualityCommentPanel.vue`   | 对象级评论展示与编辑入口                                |
| `src/quality-comment/components/QualityCommentEditor.vue`        | 通用评论编辑器、性质选择和提交按钮                      |
| `src/quality-comment/components/QualityCommentHistoryDrawer.vue` | 统一历史抽屉与定位请求入口                              |
| `src/quality-comment/protocol.test.ts`                           | 协议构造和载荷解析测试                                  |
| `src/quality-comment/validation.test.ts`                         | 评论内容校验测试                                        |

### 20.2 修改文件

| 文件                                                              | 修改内容                                      |
| ----------------------------------------------------------------- | --------------------------------------------- |
| `vite.config.ts`                                                  | 管理端开发服务器托管 `/tool/quality-comment/` |
| `xtreme-frontend/pc-tool/vite.config.ts`                          | 工作台代理质检页面及管理端编译模块请求        |
| `xtreme-frontend/pc-tool/src/components/QualityCommentIframe.vue` | 默认使用同域质检路径                          |
| `docs/requirements/quality-comment/quality-comment-iframe.md`     | 同步记录本轮实现范围、文件清单和验证结果      |

### 20.3 当前已实现范围

- 独立访问 `/tool/quality-comment/` 时显示可运行 Demo。
- Clip 级和对象级评论使用同一子应用，通过不同消息事件切换。
- Clip 级评论不依赖对象选中状态。
- 评论内容首尾空格校验、1000 字符限制和默认“必须修改”。
- 质检历史同时展示 Clip 级和对象级记录。
- 对象历史支持向宿主发送 `LOCATE_REQUEST`。
- 子应用通过 `READY`、`INIT_CONTEXT`、`OPEN_*`、`COMMENT_SUBMIT_REQUEST`、`SET_HISTORY`、`SUBMIT_RESULT`、`LOCATE_REQUEST`、`RESIZE` 等事件通信。
- 首次握手使用 `window.postMessage`；宿主在初始化消息中转移 `MessagePort` 后，后续消息优先走 `MessageChannel`，并保留 `postMessage` 降级通道。
- 入站消息校验 channel、协议版本、sessionId、来源 origin 和 revision；过期 revision 不再更新当前上下文。
- 子应用不调用 Axios、不读取 Token/Cookie、不修改工作台或标注对象。
- 当前 Demo 上下文由宿主传入，历史通过 pc-tool Mock 查询并在提交后更新，用于 UI、通信和最小业务闭环联调。

### 20.4 当前未实现范围

- 真实评论新增和历史查询 API。
- 3D/4D 对象定位的工作台逻辑。
- 后端正式入口参数转换。
- 生产环境 Nginx/CSP 联调。

### 20.5 pc-tool 本地质检 Mock 适配（2026-08-28，修正版）

为便于当前联调，已在 `xtreme-frontend/pc-tool` 增加临时 Mock 宿主适配。`mode=qc` 只改变工作台能力，不替换 Editor：完整点云场景仍按正常流程加载，质检模式额外显示入口并将标注操作切换为只读。

| 文件                                                                         | 用途                                                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pc-tool/src/App.vue`                                                        | 识别 URL `mode=qc`，在完整 Editor 上提供顶部样本级评论、质检历史入口，并监听标签评论事件 |
| `pc-tool/src/pages/execute.ts`                                               | `mode=qc` 下仍执行完整场景加载并保持 `execute` 模式                                      |
| `pc-tool/src/components/Editor/index.vue`                                    | `mode=qc` 下仅禁用左侧工具栏，保留对象选择、标签详情和编辑能力                           |
| `pc-tool/src/components/QualityCommentLayer.vue`                             | 透明蒙版中间层，统一承载居中评论窗和上下贴边窄历史抽屉                                   |
| `pc-tool/src/components/QualityCommentIframe.vue`                            | 接收入口类型和标签快照，创建同源 iframe，处理协议、Mock 提交/历史/定位回传               |
| `pc-tool/src/components/EditClass/index.vue`                                 | 质检模式下在标签详情窗口提供“标签评论”，传递当前标签及帧快照                             |
| `pc-tool/vite.config.ts`                                                     | 代理管理端质检入口、源码及 `/@id`、`/@fs`、`/@vite` 等 Vite 内部模块请求                 |
| `fe-management/src/quality-comment/components/QualityCommentHistoryList.vue` | 独立质检历史列表、滚动展示与对象定位                                                     |

本地访问方式：

```text
1. fe-management: `yarn dev`（管理端 3000 端口同时托管 `/tool/quality-comment/`）
2. xtreme-frontend/pc-tool: `npm run dev`（3200 端口代理 `/tool/quality-comment/` 到管理端）
3. 打开 `http://localhost:3200/tool/pc/index.html?mode=qc&taskId=qc-demo-task&clipId=qc-demo-clip&sortNo=8`
```

`pc-tool` 不再依赖独立的 `3310` 质检开发服务。若管理端不是 3000 端口，设置
`VITE_MANAGEMENT_TARGET` 后重启 `pc-tool` Dev Server。

`mode=qc` 是当前联调 Mock 入口，不是后端正式入口协议；正式入口确认后按宿主转换逻辑替换，不保留长期兼容分支。

质检模式仍渲染原有点云场景，且不切换为全局 `view` 模式。工作台有三个明确入口：

1. 顶部“样本级评论”：与当前是否选中对象无关，打开居中的 Clip 级评论窗口。
2. 顶部“质检历史”：打开同一子应用中的历史视图，宿主使用上下贴边的窄右侧抽屉承载。
3. 标签详情窗口“标签评论”：只在当前标签详情存在对象时可用，将当前对象、标签和帧快照传入，打开居中的 Object 级评论窗口。

三入口均由工作台透明蒙版中间层控制，iframe 子应用不再重复提供工作台主入口。iframe 只负责前端渲染、校验和意图回传；评论新增、历史查询和定位仍由宿主工作台处理。当前数据为显式 Demo Mock，后端正式入口待确认后直接替换，不保留长期兼容分支。

### 20.6 入口内容修正版（2026-08-29）

- 评论入口不再显示子应用内部的 Clip/Object 切换 Tab；宿主打开哪个入口，子应用就只渲染对应评论窗口。
- 历史入口改为独立的 `QualityCommentHistoryList`，展示样本级与标签级全部历史记录，列表区域固定可滚动。
- 增加多条显式 Mock 历史，覆盖样本级、标签级、必须修改、建议修改和关联对象已删除状态。
- 评论窗口保留输入、性质选择和提交操作；提交按钮仅在内容为空或提交中时禁用，权限由宿主 `capabilities` 控制。
- 历史入口通过 `OPEN_HISTORY` 事件切换为独立历史视图，不再复用评论窗口内容。
- 外层蒙版、iframe 和子应用根节点统一采用 viewport 高度约束；评论内容超出窗口时在面板内滚动，避免底部操作被裁切。
- iframe 文档自身禁止滚动，评论内容高度通过 `RESIZE` 回传给宿主，仅由工作台窗口层承接评论窗口滚动；
  历史视图仍保留列表区域独立滚动。
- 同域嵌入时改由宿主直接观察 iframe 内容尺寸并实时更新高度，`RESIZE` 仅作为无法访问 iframe 文档时的兼容兜底。
- 评论 iframe 不承担入口权限控制，评论输入、性质选择和查看历史均不因权限字段置灰；pc-tool 外层依据 `modeConfig.ui.qualityComment` 决定是否渲染质检入口。
- 修复嵌入场景下桥接 `Ref` 未解包导致历史列表收到对象而非数组的问题；同域宿主直接观察 iframe 内容并按最终高度调整 iframe，由中间层统一滚动，`RESIZE` 仅作兼容兜底。
- 顶部“质检历史”入口不受 `mode=qc` 限制；只要工作台具备 `qualityComment` 能力位，普通标注模式也应展示并可打开历史视图。样本级评论和标签评论仍仅在质检模式展示。

### 20.7 历史抽屉与提交闭环修正（2026-08-31）

- 删除 iframe 子应用顶部 `quality-comment-app__hero` 调试区；宿主上下文、连接状态和历史数量改为 `console.info` 调试输出，不占用业务窗口空间。
- 删除历史列表、历史抽屉和评论编辑器中的“刷新历史”按钮；历史由初始化、提交成功回传或宿主主动发送 `SET_HISTORY` 更新，不再要求用户手工刷新。
- `HISTORY` 入口仅调整宿主 `QualityCommentLayer` 的外层布局为右侧窄抽屉：宽度 `min(440px, 86vw)`、高度 `100vh`、上下贴边；Clip/Object 评论仍保持居中弹窗。
- 提交状态不再展示“等待宿主处理”或其他顶部提示。宿主调用 Mock 新增接口后通过 `SUBMIT_RESULT` 返回结果；成功响应携带最新历史，工作台关闭评论窗口，失败则保留输入内容。
- 提交成功后由工作台使用默认 3 秒 `message.success` 展示“质检意见已保存”，并在成功回包后关闭评论窗口；提交失败由工作台使用 `message.error` 提示且不关闭窗口，iframe 保留 textarea 内容供用户重试。
- 历史入口由宿主提供唯一 header；历史列表不再展示重复的标题、说明或统计摘要。历史卡片按“时间、质检员-姓名、目标/意见性质、评论内容”排版；可定位的标签级卡片整卡点击触发定位，不额外显示“定位”按钮。
- 桥接层发送消息前会将响应式数据转换为可结构化克隆的 JSON 快照，避免历史定位或提交时触发 `DataCloneError`；消息发送异常会释放提交 loading 状态。
- 提交请求增加 15 秒超时兜底；宿主无回包或网络悬挂时自动释放 loading，并记录控制台错误，允许用户重新提交。
- 当前闭环链路：`COMMENT_SUBMIT_REQUEST → pc-tool/src/api/quality-comment.ts → POST quality-issues → GET quality-records → SUBMIT_RESULT(history) → iframe history state`。

### 20.8 本轮修改文件

| 文件                                                                               | 修改内容                                                                          |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/quality-comment/App.vue`                                                      | 删除调试 Hero、顶部状态提示和刷新事件；处理失败回包并保留草稿；打印上下文调试信息 |
| `D:/document/code/xtreme-frontend/pc-tool/src/components/QualityCommentIframe.vue` | 工作台处理成功/失败提示；成功回包后关闭评论窗口                                   |
| `src/quality-comment/components/QualityCommentHistoryList.vue`                     | 移除重复历史 header；按原型重排卡片；整卡触发标签定位                             |
| `src/quality-comment/components/QualityCommentHistoryDrawer.vue`                   | 同步历史卡片排版并移除定位按钮、统计摘要                                          |
| `src/quality-comment/App.vue`                                                      | 历史视图去除内层卡片容器，避免宿主与 iframe 产生多余内边距                        |
| `src/quality-comment/bridge.ts`                                                    | 消息 payload 转换为可克隆快照；发送失败时释放提交状态                             |
| `src/quality-comment/components/QualityCommentEditor.vue`                          | 删除刷新历史按钮及事件                                                            |
| `src/quality-comment/components/ClipQualityCommentPanel.vue`                       | 移除刷新事件转发                                                                  |
| `src/quality-comment/components/ObjectQualityCommentPanel.vue`                     | 移除刷新事件转发                                                                  |
| `src/quality-comment/components/QualityCommentHistoryList.vue`                     | 删除刷新历史按钮及事件声明                                                        |
| `src/quality-comment/components/QualityCommentHistoryDrawer.vue`                   | 删除刷新事件声明                                                                  |
| `D:/document/code/xtreme-frontend/pc-tool/src/components/QualityCommentLayer.vue`  | 仅历史入口改为上下贴边窄抽屉，普通评论窗布局不变                                  |

### 20.9 验证记录

- `yarn type-check`：通过。
- `yarn vitest run src/quality-comment/protocol.test.ts src/quality-comment/validation.test.ts`：2 个测试文件、4 个用例全部通过。
- `yarn eslint src/quality-comment vite.config.quality-comment.ts --max-warnings=0`：通过。
- `yarn prettier --check src/quality-comment vite.config.quality-comment.ts quality-comment/index.html docs/requirements/quality-comment/quality-comment-iframe.md package.json`：通过。
- `yarn build:quality-comment`：通过，产物输出到 `dist/tool/quality-comment/`。
- `npm run build`（`xtreme-frontend/pc-tool`）：通过。
- Playwright 本地冒烟：打开样本级评论、提交 Mock 评论后 loading 释放、输入清空、顶部状态模块数量为 0，页面无 `pageerror`。
- `git diff --check`：通过。
- 开发托管链路：重启 Dev Server 后，`3000/tool/quality-comment/`、`3200/tool/quality-comment/` 及其质检模块请求均返回 200。
- `yarn test`：未执行全仓测试；本轮仅执行质检评论相关测试，避免将无关模块环境问题混入验收结论。

### 20.10 提交链路调试日志（2026-08-31）

为定位提交按钮 loading 未释放问题，临时增强以下日志。日志前缀固定为
`[quality-comment]`（iframe）和 `[quality-comment-host]`（pc-tool）：

```text
用户点击保存
  → iframe bridge 记录提交请求与 requestId
  → iframe 发送 COMMENT_SUBMIT_REQUEST
  → pc-tool 收到消息
  → pc-tool 调用质检评论 Mock 接口
  → Mock 返回 comment/history 或异常
  → pc-tool 发送 SUBMIT_RESULT
  → iframe 校验 requestId 并释放 submitPending
```

日志仅输出目标摘要和评论长度，不输出评论正文；同时记录请求 ID 不匹配、载荷无效、消息发送异常和 15 秒超时分支。

本轮根据实际日志修复一处宿主竞态：`QualityCommentIframe` 的 `load` 回调不再清空
`sessionId`。iframe 可能在宿主 `load` 回调之前发送 `READY`，此时清空会话会导致后续
`COMMENT_SUBMIT_REQUEST` 在宿主会话校验处被直接丢弃；现在由 `READY` 作为新 iframe 会话
的唯一建立入口。

### 20.11 质检问题正式接口接入（2026-09-03）

- 删除 `pc-tool/mock/quality-comment.js` 及其 Mock 注册，质检评论请求改为透传现有 `/api` 代理。
- 样本级和标签级评论统一调用 `POST /api/quality-tasks/{qualityTaskId}/quality-issues`；标签级额外传入 `annotationObjectId` 和 `annotationObjectName`。
- 质检历史调用 `GET /api/quality-tasks/{qualityTaskId}/quality-records?itemId={itemId}`，并将提交记录中的 `samples[].issues[]` 展开成 iframe 使用的单条历史卡片。
- `POST quality-issues` 仅返回问题 ID，工作台以该 ID 判断保存成功，随后重新查询历史，再关闭评论窗口并提示成功。
- 当前入口由 pc-tool 从 `label-config` 读取 `qualityTaskId` 后写入工作台全局状态，再写入 iframe URL；管理端质检接口仅消费该字段，严禁以 `taskId` 兼容替代。
- `quality-records` 暂未返回单条问题 ID、帧 ID、帧序号和 tracing ID；当前使用“提交记录 ID + 样本 ID + 问题序号”生成前端历史键，对象历史定位能力以后端补齐定位字段为准。

本轮修改文件：

| 文件                                                                               | 修改内容                                              |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `D:/document/code/xtreme-frontend/pc-tool/src/api/quality-comment.ts`              | 接入质检问题新增、历史查询及响应转换                  |
| `D:/document/code/xtreme-frontend/pc-tool/src/components/QualityCommentIframe.vue` | 使用工作台真实任务/样本上下文提交，成功后重新查询历史 |
| `D:/document/code/xtreme-frontend/pc-tool/tests/unit/api/quality-comment.spec.ts`  | 覆盖历史展开和新增问题请求映射                        |
| `D:/document/code/xtreme-frontend/pc-tool/mock/index.js`                           | 移除质检评论 Mock 注册                                |
| `D:/document/code/xtreme-frontend/pc-tool/mock/quality-comment.js`                 | 删除可剥离的进程内 Demo Mock                          |
| `D:/document/code/xtreme-frontend/pc-tool/mock/README.md`                          | 更新质检接口边界说明                                  |
| `D:/document/code/xtreme-frontend/pc-tool/mock/PENDING.md`                         | 移除已对接的质检评论待办                              |
