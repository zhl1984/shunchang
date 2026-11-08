# Dynamic Form 内嵌路由需求

## 功能目标

通过管理端 Vue Router 提供 `/tool/dynamic-form/` 页面，作为 pc-tool 或其他工作台的 iframe 宿主入口，不再维护独立页面构建产物。

## 使用场景

- pc-tool 在标签属性区域创建 iframe，加载本路由并传入当前对象的动态表单上下文。
- 未来 React 工作台复用相同 URL 和消息协议。

## 字段与展示内容

页面渲染 `DynamicFormPanel`，字段和值全部来自宿主发送的 `INIT` / `SET_CONTEXT` 消息。

## 交互规则

- iframe 启动后发送 `READY`。
- 接收 `INIT`、`SET_CONTEXT` 更新表单上下文；接收 `REQUEST_VALIDATE` 执行校验。
- 将变化、校验、尺寸和错误通过 `postMessage` 返回宿主。
- 仅允许 `window.parent` 发送的 dynamic-form 协议消息。

## 状态处理

- 未收到上下文时展示空表单。
- 上下文无效时回传 `ERROR`，不执行业务请求。
- theme 缺省为 `dark`，由宿主参数显式切换，不读取管理端主题 store。

## 接口依赖

首期不请求业务接口；工作台负责标签和动态表单数据请求、权限判断、对象保存及最终状态维护。

## 验收标准

- 访问 `/tool/dynamic-form/` 可返回管理端 SPA 并匹配该路由。
- pc-tool 可完成 `READY -> INIT -> CHANGE / VALIDATE_RESULT / RESIZE` 握手。
- 路由不出现在主菜单，不进入主布局 Header、侧栏和面包屑。
- 不删除现有独立 Demo、日期组件、协议和独立构建配置。
