# 全局上传设计

## 方案

采用 Uppy Core + Tus + Golden Retriever。Uppy 实例由独立上传 store/composable 持有，业务页面只通过 `useUpload()` 调度任务；Header 通过只读任务摘要读取状态，不能直接修改上传实例。任务进度 Modal 是 Header 的展示层，控制操作仍回到 composable。

## 生命周期

文件加入后由 Uppy Tus 插件创建上传并管理分片 offset。上传状态同步到 Pinia 或专用 composable 的响应式摘要，并由 Golden Retriever 写入 IndexedDB。页面卸载前检查未完成任务并注册/解除 `beforeunload`。重新加载时恢复任务元数据，要求用户重新选择文件；文件指纹一致后重新绑定 File 并让 Tus HEAD 查询服务端 offset，继续剩余分片。

## Header 交互

Header 用户按钮旁显示红色徽标，徽标数量为未完成任务数。用户下拉菜单仅在数量大于 0 时插入“上传任务（N）”。点击后打开上传任务 Modal；Modal 通过任务摘要渲染列表，每项提供进度、状态和对应操作。没有未完成任务时不渲染菜单项，也不显示空的任务弹窗入口。

## 错误与边界

浏览器只能提供原生 `beforeunload` 离开确认，不能显示自定义文本。IndexedDB 可能因容量或隐私模式失败，上传层需降级为内存状态并在刷新后提示任务无法恢复。文件指纹不一致时不复用原任务。Tus 服务端返回 401、404、409 等错误时转换为任务级错误，不触发无关的全局错误提示。

## 依赖与约束

需要新增 `@uppy/core`、`@uppy/tus` 和 `@uppy/golden-retriever`。不引入 Uppy Dashboard，避免与现有 Ant Design Vue 视觉系统重复。依赖安装和 Tus 服务端地址、鉴权方式须在实现前确认。
