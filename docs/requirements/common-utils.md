# 公共工作台跳转工具需求

## 功能目标

提供 `goToScenarioWorkbench`，根据 `designerCode` 和任务上下文参数生成对应工作台地址并在新窗口打开。

## 参数与规则

- 入参为 `designerCode` 与 `{ taskId, itemId, qualityTaskId?, status? }`。
- `3D_DY` 使用 `taskId`、`clipId`（由 `itemId` 映射）和状态模式参数；质检任务场景额外传 `qualityTaskId`，普通标注任务不传。
- 其他工作台使用通用 `taskId`、`itemId`，并通过 `GET /annotation-tasks/ohif/{itemId}` 查询 `studyInstanceUID` 后写入 `StudyInstanceUIDs`；查询失败时提示并终止跳转。
- 未配置地址时提示并终止跳转。

## 验收标准

- 地址参数按工作台协议生成并进行 URL 编码。
- 跳转使用新窗口及 `noopener,noreferrer`。
