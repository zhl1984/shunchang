# 标签工具关联设计

## 目标

在标签详情面板中实现“工具”按钮：打开工具关联弹窗，允许当前标签多选标注工具，并将每个已选工具的固定属性一对一关联到当前标签的属性。工具可以全部不选；分组详情不提供工具入口。

## 数据模型

### 静态工具定义

工具定义描述系统支持的标注工具及其固定属性，不属于某个标签：

```ts
export type AnnotationToolProperty = {
  code: string;
  name: string;
  description?: string;
};

export type AnnotationTool = {
  value: string;
  name: string;
  description: string;
  properties: AnnotationToolProperty[];
};
```

- `value` 是工具稳定编码，例如 `bbox`、`mask`、`polyline`。
- `name` 和 `description` 用于界面展示。
- `properties` 是工具固定属性；每个属性的 `code` 在同一工具内唯一。
- 工具属性 `description` 为可选字段。
- 静态工具定义先以内置 mock 数据维护，暂不提供增删改查界面。

### 标签工具关联

标签关联只保存当前标签选择了哪些工具，以及工具属性映射到哪个标签属性：

```ts
export type LabelToolPropertyAssociation = {
  code: string;
  propertyId: string | number | null;
};

export type LabelToolAssociation = {
  toolValue: string;
  properties: LabelToolPropertyAssociation[];
};
```

- 一个标签可以关联多个工具，也可以关联零个工具。
- 每个已选工具保留其全部固定属性关联项。
- `propertyId: null` 表示工具属性尚未关联标签属性，不删除该配置项。
- 保存时只允许关联当前标签的属性 ID；界面选项只展示当前标签属性。
- 静态工具属性的 `code` 作为关联项的稳定键，不复制工具属性名称和描述。

## Store

新增 `src/stores/label-tool.ts`，只负责工具定义和标签关联状态，不直接请求 Axios：

- `tools`：浅层响应式的 `AnnotationTool[]`，加载时提供内置 mock 工具。
- `associations`：浅层响应式的 `Map<string | number, LabelToolAssociation[]>`。
- `getAssociations(labelId)`：返回指定标签的关联副本；没有关联时返回空数组。
- `setAssociations(labelId, associations)`：替换指定标签的关联，输入会复制，避免弹窗草稿引用泄漏。
- `initialize()`：初始化静态工具与关联数据；重复调用复用同一结果。
- `refresh()`：重新恢复/读取 mock 数据，供后续接入 API 时保持调用契约。

Store 不负责属性 API 查询；弹窗由 `label.ts` 属性查询接口获取当前标签属性选项，避免重复维护属性数据。

## 组件与数据流

### `LabelDetailPanel.vue`

- 仅标签节点显示并启用“工具”按钮。
- 点击按钮打开 `LabelToolAssociationModal`，传入当前标签 `labelId`。
- 分组节点不渲染工具按钮，因此不会打开工具弹窗。
- 弹窗保存成功后，详情面板不需要重新加载标签基础信息或属性列表。

### `LabelToolAssociationModal.vue`

- 接收 `open`、`labelId`；通过 `update:open` 支持关闭。
- 读取工具 store 的静态工具定义和当前标签已有关联。
- 使用多选控件选择工具，允许空选择。
- 选中工具后展示工具描述和固定属性列表。
- 每个工具属性使用级联或普通选择控件关联当前标签属性，默认显示“未关联”，对应 `propertyId: null`。
- 取消/关闭丢弃草稿，不修改 store。
- 保存时根据已选工具重新生成完整 `LabelToolAssociation[]`，保留每个工具的全部属性项，并调用 store 的 `setAssociations`。
- 工具选项变更时移除未选工具；重新选中工具时从静态定义重新补齐其全部属性，并优先恢复已有同工具同属性 `propertyId`。

## 交互状态

- 初始打开：加载当前标签已有关联；未关联工具时所有工具复选框为空。
- 多选工具：勾选一个或多个工具，工具属性区按选择顺序或静态定义顺序展示。
- 取消所有工具：允许保存，结果为 `[]`。
- 工具属性未关联：允许保存并保留 `propertyId: null`。
- 标签无属性：工具仍可选择，但所有工具属性下拉框只有“未关联”选项。
- 切换标签后关闭旧弹窗草稿，重新打开时只读取新标签关联。
- 保存成功后关闭弹窗；本阶段不调用后端 API，不显示持久化请求状态。

## 内置工具数据

提供以下 mock 工具定义，以覆盖弹窗布局：

- `bbox` / `BBox` / `画矩形框住病灶。只记大概在哪，不勾轮廓。`：属性 `region`（目标区域）、`long_diameter`（长径）、`short_diameter`（短径）。
- `mask` / `Mask` / `把病灶像素涂出来，像描边填色。AI 训练通常要这个。`：属性 `outline`（轮廓）、`volume`（体积）、`segmentation`（分割范围）。
- `recist` / `RECIST双线` / `画互相垂直的两条线，记录长径和短径。`：属性 `long_line`（长径线）、`short_line`（短径线）。
- `measure` / `测距工具` / `用于纵隔淋巴结短径记录。`：属性 `distance`（距离）。
- `lung_segmentation` / `肺段分割` / `用于肺段等解剖结构分割和定位参考。`：属性 `segment_name`（段名）、`lobe`（肺叶）。

工具属性描述可以为空；所有用户可见名称和描述通过国际化语言包维护，mock 数据保存语言键或使用已有项目约定的本地化结构。

## 样式与布局

- 弹窗采用 Ant Design Vue Modal/Card/Form 控件，视觉层级参考用户提供的设计图。
- 保持 `label-tool-association-modal` 根类，内部使用 `ltam-` 前缀。
- 工具列表使用两列网格，工具属性关联区域按已选工具分组展示。
- 弹窗内容超过视口时只允许弹窗内容区域按现有项目约定处理，不影响页面根布局；页面本身不产生滚动条。
- 颜色、间距、字号使用现有设计令牌和工具类，兼容浅色/深色主题。

## 国际化

新增工具弹窗标题、说明、工具属性关联标题、未关联、取消、保存、选中数量、属性名称和错误提示到 `src/locales/messages/zh-CN.ts`。工具定义中的展示文案使用语言包键，不在组件中硬编码。

## 测试与验收

### Store 测试

- 初始化提供工具定义和空关联。
- `setAssociations` 支持多个工具和空数组。
- 返回值与内部 Map 隔离，调用方修改嵌套属性不会污染 store。
- 未关联工具属性保留 `propertyId: null`。

### 组件测试

- 标签详情点击工具按钮打开弹窗；分组不显示按钮。
- 弹窗初始回显当前标签的多工具关联。
- 选择/取消工具正确生成关联列表。
- 取消不修改 store。
- 保存空工具列表得到空数组。
- 工具属性下拉只展示当前标签属性，并支持未关联状态。
- 切换标签后不复用旧标签草稿。

### 验收标准

1. 标签详情点击“工具”可打开关联弹窗，分组详情没有该按钮。
2. 工具支持多选和全不选。
3. 已选工具展示固定属性，每个属性可关联一个当前标签属性或保持未关联。
4. 保存后重新打开弹窗，工具选择和属性关联保持一致。
5. 取消不会改变已保存关联。
6. 页面保持固定布局，主题和内容溢出表现符合项目规则。

## 非目标

- 不实现工具定义的增删改查界面。
- 不实现标签属性的新增、编辑、删除功能。
- 不接入后端持久化接口；store 保留未来接 API 的边界。
- 不实现工具属性与多个标签属性的多对多关联；当前严格一对一。
