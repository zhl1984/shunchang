# 标签树数据层设计

## 目标

为标签管理左侧树建立可替换为真实后端接口的数据基础。本阶段新增扁平节点 CRUD mock API 和自动初始化的只读 Pinia store，不实现树形界面、表单或 CRUD 交互。

## 数据模型

标签树统一使用扁平节点结构，通过 `pid` 表达父子关系：

```ts
type LabelProperty = {
  id: string | number;
  name: string;
  code: string;
  description: string;
  type: "text" | "number";
  defaultValue: string | number | null;
  min: number | null;
  max: number | null;
  unit: string;
  readonly: boolean;
  required: boolean;
  options: Array<string | number>;
};

type LabelTreeNode = {
  pid: string | number | null;
  id: string | number;
  type: "group" | "label";
  name: string;
  code: string;
  description: string;
  color?: string;
  tools?: string[];
  props?: LabelProperty[];
};
```

`code` 和 `description` 适用于所有节点；`color`、`tools` 和 `props` 仅供标签节点使用。

## API

新增 `src/api/label.ts`，提供统一节点 CRUD：

- `getLabelTreeNodeListApi()`
- `createLabelTreeNodeApi(input)`
- `updateLabelTreeNodeApi(id, input)`
- `deleteLabelTreeNodeApi(id)`

节点类型在创建时确定，更新输入不允许修改 `id` 或 `type`。mock API 不校验父节点类型、循环关系或移动目标，这些由界面过滤和真实后端最终保障。

删除分组时，只要存在以该分组为直接父节点的节点就拒绝删除。由于非空后代路径必然包含直接子节点，该检查能够禁止删除所有非空分组。

API 返回节点时复制节点对象和 `tools`、`props`、`options` 等嵌套数组，避免调用方直接修改模块内 mock 数据。

## Store

标签 store 不再通过 Vue `readonly()` 暴露派生数据。`list`、`tree` 和 `simpleTree` 使用 `shallowRef` 保存，避免 Vue 深层代理，同时保持对 Ant Design Vue 组件友好的可变 TypeScript 类型。刷新时整体替换新的数据引用，内部直接修改不负责触发响应式更新。

`mapping` 使用 `shallowRef(new Map())`，Map 本身允许调用方执行 `set`、`delete` 和 `clear`，且不会被深层代理。`status` 继续使用普通 `ref`。

`simpleTree` 从排序后的完整树通过 `deepMap()` 派生，每个节点仅包含 `value`、`label` 和 `children`；`value` 使用原节点 `id`，`label` 使用原节点 `name`。

新增 `src/stores/label.ts`，参考 dataset store，暴露：

- 只读 `nodes`
- 只读 `status`
- `initialize()`
- `refresh()`

首次获取 store 时自动初始化；并发初始化共享同一个 Promise；失败后状态恢复为 `uninitialized`，允许重试。新增、修改和删除仍由 API 层提供，调用方完成操作后通过 `refresh()` 同步 store。

## Mock 数据

mock 列表包含根分组、嵌套分组和标签节点。标签示例包含颜色、工具及属性数据，所有关系仅通过 `pid` 表达，不在 API 数据中保存 `children`。

界面后续使用现有 `flatToTree(nodes, "id", "pid")` 转换展示树。

## 文档与测试

同步更新 `src/views/label-management/requirements.md`，将数据依赖由“无 API/store”改为本次 mock API 和标签 store。

API 测试覆盖：

- 查询返回深层副本。
- 创建标签时补充默认颜色。
- 创建分组不强制写入标签专属字段。
- 更新节点但不允许修改类型。
- 删除标签或空分组。
- 禁止删除包含子节点的分组。
- 操作不存在的节点时抛出明确错误。

Store 测试覆盖：

- 获取 store 后自动初始化。
- 并发初始化合并。
- `refresh()` 强制重新加载。
- 加载失败后允许重试。

## 验收标准

1. 标签节点类型完整且不使用 `any`。
2. API 提供统一扁平节点 CRUD，并满足默认颜色和删除限制。
3. store 自动加载、只读暴露数据并提供 `refresh()`。
4. mock 数据可通过现有 `flatToTree` 转换成正确树结构。
5. 不修改左侧面板的当前视觉和交互。
6. 相关测试、格式化、ESLint、类型检查和构建通过；已有无关问题需单独说明。
