# 标签详情面板设计

## 目标与范围

在 `/label-management` 页面实现右侧详情面板，使其根据左侧标签树当前选中节点展示分组信息或标签信息，并为标签展示独立维护的属性列表。

本阶段只实现详情查看。工具、属性新增、属性编辑和属性删除按钮保留正常视觉状态，但不绑定交互；不新增属性 Pinia store，不改变页面固定画布和无滚动条约束。

## 页面状态

### 未选择节点

- 详情面板展示 Ant Design Vue 暂无数据图标。
- 提示文案为“选择分组或者标签查看详情”。
- 不展示名称、描述、标签编码、工具按钮或属性区域。

### 选择分组

- 展示分组名称和描述。
- 不展示标签编码。
- 不展示工具按钮、属性标题、属性按钮或属性列表。
- 分组描述为空时仍保留稳定的信息布局，并使用统一空值文案展示。

### 选择标签

- 头部展示标签名称、描述和标签编码。
- 展示“工具”按钮，但本阶段不绑定交互。
- 展示属性区域及属性新增按钮，按钮本阶段不绑定交互。
- 属性为空时展示暂无数据状态。
- 属性存在时按接口顺序展示属性卡片；属性编辑和删除按钮保持正常视觉状态，但不绑定交互。

## 组件与数据流

### `src/views/label-management/index.vue`

- 保存 `LabelTreePanel` 发出的选中节点 ID，初始值为 `null`。
- 将选中节点 ID 通过 `nodeId` prop 传给 `LabelDetailPanel`。
- 页面仅负责编排，不复制节点查询或属性查询逻辑。

### `src/views/label-management/components/LabelDetailPanel.vue`

- 接收 `nodeId: string | number | null`。
- 使用 label store 的 `mapping` 按 ID 获取节点并判断其类型。
- `nodeId` 为空或映射中不存在节点时展示未选择空态。
- 选择分组时只渲染分组详情。
- 选择标签时调用属性列表 API，并展示标签详情及属性状态。
- 节点快速切换时，只接受当前标签对应请求的结果，避免旧请求覆盖新选择。
- 属性请求失败时清空当前属性列表并展示属性空态，不影响标签基础信息展示。

### `src/api/label.ts`

- 从 `LabelTreeLeafNode` 移除 `props` 字段，标签树只维护节点自身信息与 `tools`。
- 新增独立的 mock 属性列表，以 `labelId` 关联标签。
- 提供属性查询、新增、修改和删除 API。
- 删除标签节点时同步删除该标签关联的所有属性；删除分组的既有规则保持不变。
- 所有 API 返回与 mock 数据隔离的副本，避免调用方直接修改数据源。

## 属性数据模型

```ts
export type LabelPropertyType =
  | "number"
  | "text"
  | "date"
  | "boolean"
  | "enum";

export type LabelPropertyValue =
  | string
  | number
  | boolean
  | Array<string | number>
  | null;

export type LabelPropertyOption = {
  value?: string | number;
  label?: string;
  description?: string;
};

export type LabelProperty = {
  id: string | number;
  labelId: string | number;
  code: string;
  name: string;
  description?: string;
  type: LabelPropertyType;
  defaultValue: LabelPropertyValue;
  unit?: string;
  readonly: boolean;
  required: boolean;
  min?: number;
  max?: number;
  options?: LabelPropertyOption[];
  optionsMultiple?: boolean;
};
```

字段规则：

- `id` 由创建属性 API 自动生成。
- `labelId` 必须关联一个标签节点。
- 日期默认值使用 ISO 日期字符串。
- 枚举多选默认值使用 `Array<string | number>`。
- `min`、`max` 仅对 `number` 类型生效。
- `options`、`optionsMultiple` 仅对 `enum` 类型生效。
- 枚举选项的 `value` 和 `label` 都为空时过滤该项。
- 枚举选项只填写 `value` 时，将字符串化后的 `value` 补入 `label`。
- 枚举选项只填写 `label` 时，将 `label` 补入 `value`。
- 枚举选项同时填写 `value` 和 `label` 时保持原值。

## API 接口

```ts
getLabelPropertyListApi(labelId: string | number): Promise<LabelProperty[]>

createLabelPropertyApi(
  input: Omit<LabelProperty, "id">,
): Promise<LabelProperty>

updateLabelPropertyApi(
  id: string | number,
  input: Partial<Omit<LabelProperty, "id" | "labelId">>,
): Promise<LabelProperty>

deleteLabelPropertyApi(id: string | number): Promise<void>
```

- 查询接口仅返回指定标签的属性。
- 创建和修改时统一规范化枚举选项，并清理与当前类型无关的字段。
- 修改属性时不允许通过更新参数改变 `id` 或 `labelId`。
- 修改或删除不存在的属性时沿用标签 API 当前的错误处理方式抛出错误；查询没有属性的标签时返回空数组。

## 属性卡片展示

- 展示属性名称、编码和描述。
- 展示中文类型标签，对应 `number`、`text`、`date`、`boolean`、`enum`。
- `required` 为 `true` 时展示“必填”标记。
- `readonly` 为 `true` 时展示“只读”标记。
- 数值属性展示最小值、最大值和单位；缺失的约束不渲染。
- 枚举属性展示规范化后的选项内容和单选/多选信息。
- 默认值按属性类型格式化展示；空默认值使用统一空值文案。

## 样式与布局

- 保留 `label-detail-panel` 根类，内部类使用 `ldp-` 短前缀。
- 组件专属 Less 保留在 `LabelDetailPanel.vue` 的 `<style scoped lang="less">` 中。
- 优先复用项目已有布局、间距和字号工具类。
- 颜色使用现有 CSS 变量或 Ant Design Vue 设计令牌，并兼容浅色、深色主题。
- 页面整体不产生横向或纵向滚动条。
- 详情面板和属性容器保持 `overflow: hidden`；属性数量超过可用高度时裁切，不在本阶段增加滚动。
- 长名称、编码和描述使用省略或多行裁切，不能撑破固定布局。

## 国际化

所有用户可见文案维护在 `src/locales/messages/zh-CN.ts`，包括：

- 未选择节点提示。
- 工具、属性及暂无数据文案。
- 标签编码、属性编码、默认值、最小值、最大值、单位等字段名。
- 属性类型、“必填”、“只读”、“单选”和“多选”文案。
- 通用空值文案。

## 测试与验收

### API 测试

- 查询属性时只返回目标 `labelId` 的数据副本。
- 创建属性时生成 ID，并正确规范化枚举选项。
- 修改属性时保留 `labelId`，并清理类型不适用字段。
- 删除属性后无法再次查询到该属性。
- 删除标签后，其关联属性同步删除。

### 组件测试

- `nodeId` 为空或无效时展示未选择空态。
- 选择分组时只展示名称和描述。
- 选择标签时展示名称、描述、编码和静态按钮。
- 标签无属性时展示属性空态。
- 标签有属性时完整展示类型、状态标记及适用的约束字段。
- 节点切换后展示内容与最新选中节点一致。

### 页面验收

- 左侧选择事件能够驱动右侧详情切换。
- 固定画布下页面和详情面板均不出现滚动条。
- 浅色和深色主题下信息层级清晰。
- 现有标签树创建、编辑、删除、搜索和选择行为不回归。

## 非目标

- 不实现工具配置。
- 不实现属性新增、编辑或删除界面交互。
- 不新增属性 Pinia store。
- 不实现属性区域滚动、分页或虚拟列表。
- 不改动左侧标签树既有交互规则。
