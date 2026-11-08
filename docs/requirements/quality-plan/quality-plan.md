# 质量方案模块需求与开发方案

## 文档信息

| 项目     | 内容                                                        |
| -------- | ----------------------------------------------------------- |
| 模块     | 质量方案                                                    |
| 方案日期 | 2026-08-07                                                  |
| 当前阶段 | 阶段 4：真实接口联调                                        |
| 原型来源 | `.prototype/顺昌标注原型-08061523.html`                     |
| 分析来源 | `.temp/quality-view-20260806/README.md`                     |
| 数据方式 | 通过 `src/api/http.ts` 调用 `/api/quality-schemes` 真实接口 |

## 方案结论

首期按原型已经明确的交互完成质量方案维护闭环：表格列表、关键词搜索、表格字段筛选、新建、查看、编辑、删除，以及质检层级的增加、删除和检查范围配置。

接口文档现已确定，页面继续只调用稳定的业务 API 函数，`src/api/quality-plan.ts` 负责页面业务模型与后端 DTO 的双向转换，并通过 `src/api/http.ts` 调用真实接口；页面不直接依赖后端字段。

本期不扩展原型中没有形成规则的版本发布、人员分配、交叉质检、引用保护和质检任务闭环，避免把演示文案或占位字段误做成正式业务。

## 设计依据

### 原型与验证结果

- `.temp/quality-view-20260806/README.md:29` 至 `:41` 已验证列表、新建、查看、编辑、层级增删、范围切换、删除确认和只读字段。
- `.temp/quality-view-20260806/README.md:43` 至 `:49` 已确认至少保留一级、全量固定 100%、按比例抽检为 1～100 整数等规则。
- `.temp/quality-view-20260806/README.md:63` 至 `:79` 记录了搜索空壳、内存保存、版本占位、人员配置缺失和跨模块引用不一致等风险。
- 原型默认层级为“初检 + 全量检查 + 100% + 单人质检 + 自动分配”。原型新增层级也复用该默认值，本期保持一致。

### 正式接口文档

- `docs/apilist/质量方案.json` 已定义质量方案列表、详情、新增、整体更新和逻辑删除接口。
- 列表查询参数使用 `keyword`、`pageNo`、`pageSize`；产品约定默认每页 20 条，因此前端请求必须显式携带 `pageSize=20`，不依赖接口文档中的后端默认 10。
- 接口响应统一为 `{ code, message, data }`。公共 HTTP 层未定义业务响应解包，因此由质量方案 API 模块负责解包；未纳入项目错误码映射的错误直接使用后端 `message` 展示。
- 方案名称、层级名称和层级顺序等服务端规则以接口文档为准；抽样比例继续按需求文档处理为 1～100 的整数。

### 仓库约束与复用点

- `src/api/http.ts` 统一提供 Axios 实例、认证凭证、HTTP 错误和响应状态处理；质量方案模块复用该请求层，不新增 Mock.js、MSW 或 Vite Mock 插件。
- `src/api/quality-plan.ts` 是页面唯一数据入口；页面、组件不得直接导入 Mock 数组、Axios 或 `src/api/http.ts`。
- `src/router/index.ts:179` 已预留 `/quality-plan`，当前只需把 404 占位组件替换为真实页面，保留既有 `meta`。
- `src/locales/messages/zh-CN.ts:36` 已有菜单标题，模块新增文案继续归入国际化语言包。
- `src/styles/theme.css` 已提供浅色、深色主题的 `--dm-*` 变量。
- `src/styles/components/display.less` 和 `src/styles/components/spacing.less` 已提供布局、尺寸和间距工具类。
- 已安装 Ant Design Vue `4.2.6`。其 `Form` 未导出 React 原型使用的 `Form.List`，动态层级必须用响应式数组、`v-for` 和嵌套 `name` 路径实现。

## 功能目标

1. 提供可查询的质量方案列表，展示方案名称、描述、质检层级摘要和操作入口。
2. 支持在弹窗内新建、查看和编辑质量方案。
3. 支持维护有顺序的质检层级，并保证至少存在一个层级。
4. 实现检查范围与抽样比例联动，阻止无效数据提交。
5. 通过真实 API 形成完整 CRUD，页面不依赖硬编码数据。
6. 保留未来替换真实接口的清晰边界，不提前设计未确认业务。

## 首期范围

### 必须实现

- 质量方案列表和记录数。
- 按方案名称、方案描述、层级名称搜索。
- 新建、查看、编辑、删除方案。
- 新建默认包含一个“初检”层级。
- 增加层级、删除层级，至少保留一级；新增层级的默认名称与当前顺序一致，例如第2级默认名称为“第2级”。
- 删除方案和删除层级前二次确认。
- 全量检查与按比例抽检切换。
- 服务端式分页，默认每页 20 条。
- 查询结果存在数据时始终展示分页组件，包括仅有一页的场景；分页显示当前范围和总记录数。
- 加载、空数据、失败、提交中和删除中状态。
- 浅色、深色主题和窄屏内容溢出处理。

### 当前交互展示

- 当前字典只展示“单人质检”，控件禁用；不代表接口模型永久固定该值。
- 当前字典只展示“自动分配”，控件禁用；不代表接口模型永久固定该值。
- 层级按数组顺序执行，页面通过“第 N 级”明确顺序，不提供拖拽排序。
- 层级配置第二排的执行方式、分配方式与第一排字段保持相同固定栅格宽度，不自动横向撑开；“增加一级”使用实线边框按钮。
- 弹窗说明固定为“逐级约定检查范围、人员分配、返修和放行责任。”；层级说明采用原型中交叉质检抽样与逐级放行的表述。
- 方案名称和描述按两行展示，描述使用两行文本域；查看模式下所有字段（含抽样比例）均禁用。
- 编辑模式的“删除本级”使用带提示的垃圾桶图标，至少保留一级时禁用该操作。
- 弹窗正文最大高度以 `90vh` 为基准计算，为视口底部保留间距；层级较多时仅正文区域纵向滚动，标题、关闭入口和底部操作按钮保持可见。

### 本期不实现

- 版本、草稿、发布、生效、停用和回滚。
- 人员、角色或分组选择。
- 交叉质检人数、通过阈值和冲突处理。
- 返修与放行责任配置。
- 项目直接绑定质量方案。
- 被场景或质检任务引用时的删除保护规则。
- 质检任务提交、Rubric、证据和个人结论闭环。
- 批量操作、复制方案、导入导出。

## 使用场景

1. 管理员进入“质量方案”，浏览当前方案及其层级数量。
2. 管理员输入关键词并执行搜索，快速定位名称、描述或层级名称匹配的方案。
3. 管理员新建方案，配置一个或多个顺序执行的质检层级。
4. 管理员查看方案详情，所有表单控件只读。
5. 管理员编辑已有方案并保存，列表重新查询并展示最新数据。
6. 管理员删除方案或层级，在确认危险操作后完成删除。

## 页面结构

```text
质量方案页面
├─ 质量方案表格卡片（DmAppTable）
│  ├─ 标题“质量方案”
│  ├─ 关键词搜索框，支持清除
│  ├─ “新建质量方案”主按钮
│  └─ 方案表格
│     ├─ 方案名称
│     ├─ 方案描述
│     ├─ 质检层级（启用内置数字筛选）
│     └─ 查看 / 修改 / 删除
└─ 方案弹窗
   ├─ 方案名称、方案描述
   ├─ 质检层级与顺序说明
   ├─ 一个或多个层级配置区
   └─ 关闭 / 取消 / 新建方案 / 保存
```

## 字段与展示内容

### 页面业务模型

页面只使用以下业务字段，不直接依赖后端协议字段：

| 字段          | 类型                 | 展示或输入               | 规则                                                             |
| ------------- | -------------------- | ------------------------ | ---------------------------------------------------------------- |
| `id`          | `number`             | 不直接展示               | 后端正整数 ID；新建草稿使用独立前端 `draftKey`，不提交给接口     |
| `name`        | `string`             | 名称输入框、列表主标题   | 对应后端 `schemeName`，必填，1～50 字符，未删除方案内全局唯一    |
| `description` | `string`             | 多行输入框、列表次要文本 | 对应后端 `schemeDescription`，页面空字符串由 API 层转换为 `null` |
| `levels`      | `QualityPlanLevel[]` | 有序层级配置             | 至少一项，提交时由数组顺序生成连续 `levelOrder`                  |

列表页单独使用 `QualityPlanListItem`，通过 `levelCount` 展示层级数量，不假设列表接口返回完整 `levels`。

### 质检层级

| 字段             | 类型                  | 展示或输入           | 规则                                                   |
| ---------------- | --------------------- | -------------------- | ------------------------------------------------------ |
| `id`             | `number \| undefined` | 不直接展示           | 编辑已有层级时保留；新增层级不提交                     |
| `draftKey`       | `string`              | 仅作为 Vue `key`     | 仅前端临时字段，禁止进入请求 DTO                       |
| `name`           | `string`              | 层级名称输入框       | 对应 `levelName`，必填，1～50 字符，同一方案内不可重复 |
| `levelOrder`     | `number`              | 由数组顺序维护       | 提交时必须连续为 1～N                                  |
| `scope`          | `"full" \| "sample"`  | 检查范围选择框       | 映射为 `FULL` / `SAMPLED`，不设置表单必填校验          |
| `sampleRate`     | `number \| undefined` | 数字输入框，后缀 `%` | 全量固定 100；抽样必填 1～100 整数                     |
| `executionMode`  | `string`              | 禁用选择框           | 映射为后端 `executionType`，当前展示“单人质检”         |
| `assignmentMode` | `string`              | 禁用选择框           | 映射为后端 `assignmentType`，当前展示“自动分配”        |

### TypeScript 模型与 API DTO 边界

`src/api/quality-plan.ts` 同时维护页面模型、后端 DTO 和字典选项，但三者必须明确分开：

```ts
export type QualityPlanScope = "full" | "sample";
export type QualityExecutionMode = string;
export type QualityAssignmentMode = string;

export type QualityPlanDictionaryOption = {
  value: string;
  labelKey: string;
};

export const QUALITY_PLAN_DEFAULT_PAGE = 1;
export const QUALITY_PLAN_DEFAULT_PAGE_SIZE = 20;

export type QualityPlanLevel = {
  id?: number;
  draftKey: string;
  name: string;
  levelOrder: number;
  scope: QualityPlanScope;
  sampleRate?: number;
  executionMode: QualityExecutionMode;
  assignmentMode: QualityAssignmentMode;
};

export type QualityPlanListItem = {
  id: number;
  name: string;
  description: string;
  levelCount: number;
};

export type QualityPlan = {
  id: number;
  name: string;
  description: string;
  levels: QualityPlanLevel[];
};

export type QualityPlanInput = Omit<QualityPlan, "id">;

export type QualityPlanListParams = {
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type QualityPlanListResult = {
  list: QualityPlanListItem[];
  total: number;
  page: number;
  pageSize: number;
};

// 后端 DTO：schemeName/schemeDescription、levelName/levelOrder、
// checkScope/samplingRatio、executionType/assignmentType。
```

检查范围、执行方式和分配方式选项仍放在 TypeScript 模型文件内，组件不内联选项数组。当前字典值可以继续服务页面交互，但 API 层必须负责与 `FULL`、`SAMPLED`、`SINGLE`、`AUTO` 双向转换；未来接入外部字典时只替换字典来源和转换表，不改变组件交互。

暂不加入 `version`、`status`、`type`、创建时间和更新时间。它们虽然出现在原型演示数据中，但页面没有对应业务操作或验收规则。

## 真实接口契约

### 组织方式

- `src/api/quality-plan.ts` 在同一文件内维护页面模型、后端 DTO、转换函数和业务 API 函数；页面只能调用这些业务函数。
- 请求统一通过 `src/api/http.ts` 发送，基础地址由 `.env` 的 `VITE_API_BASE_URL=/api` 提供，开发环境由 Vite 代理转发到 `VITE_PROXY_URL`。
- API 返回页面业务模型的深拷贝，复用 `@/utils` 已有 `cloneDeep`，避免弹窗编辑直接污染详情响应对象。
- 列表请求固定传递 `pageNo/pageSize`，页面默认 `pageSize=20`；接口返回的 `pageSize` 作为最终展示数据回传页面。
- 统一响应 `{ code, message, data }` 在本模块解包；`code !== "0"` 直接抛出保留 code/message 的业务错误，成功但 data 缺失时按无效响应处理。
- 公共 HTTP 层对 400 保留原始响应，质量方案 API 模块自行处理业务错误；未定义错误码直接透传后端 `message`。

### API 列表

| 函数                      | 参数                           | 返回                    | 行为                                                                                                      |
| ------------------------- | ------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `getQualityPlanListApi`   | `QualityPlanListParams`        | `QualityPlanListResult` | GET `/quality-schemes`，关键词去除首尾空格后传递；API 层转换为 `pageNo/pageSize`，返回列表项 `levelCount` |
| `getQualityPlanDetailApi` | `id: number`                   | `QualityPlan`           | GET `/quality-schemes/{schemeId}`，解包详情 DTO 并按 `levelOrder` 返回完整层级；不存在时转换业务错误      |
| `createQualityPlanApi`    | `QualityPlanInput`             | `QualityPlan`           | POST `/quality-schemes`；新增层级不传 `id`，转换并提交请求 DTO                                            |
| `updateQualityPlanApi`    | `id: number, QualityPlanInput` | `QualityPlan`           | PUT `/quality-schemes/{schemeId}`；保留已有层级 `id`，按 `levelOrder` 整体提交                            |
| `deleteQualityPlanApi`    | `id: number`                   | `void`                  | DELETE `/quality-schemes/{schemeId}`；成功响应 `data=null`，失败时转换业务错误                            |

### API 层校验

- `name.trim()` 不能为空且长度为 1～50；未删除方案内不可重复。
- `description` 最长 200；页面空字符串转换为后端允许的 `null`。
- `levels.length` 不得小于 1。
- 每个层级的 `name.trim()` 不能为空且长度为 1～50，同一方案内不可重复。
- 提交前按数组顺序生成连续的 `levelOrder=1..N`；已有层级保留正整数 `id`，新增层级不传 `id`。
- `scope === "full"` 时统一将 `sampleRate` 规范为 `100`。
- `scope === "sample"` 时，`sampleRate` 必须是 1～100 的整数；这是需求确认后的前端和 Mock 规则。
- `executionMode` 和 `assignmentMode` 不在页面层做未来值限制，但 API 层将当前值转换为 `SINGLE` / `AUTO`，并保留未知字典值的透传能力。
- `page` 最小为 `1`，`pageSize` 默认 `20`；请求 DTO 使用 `pageNo/pageSize`，服务端负责过滤和分页并返回完整 `total`。
- `keyword` 最长 100 个字符，搜索范围为方案名称、描述和层级名称。
- 统一响应 `{ code, message, data }` 在本模块解包；已知错误码使用模块文案，未定义错误码直接展示 `message`。

## 交互规则

### 列表加载与搜索

1. 页面挂载后调用 `getQualityPlanListApi({ keyword: "", page: QUALITY_PLAN_DEFAULT_PAGE, pageSize: QUALITY_PLAN_DEFAULT_PAGE_SIZE })`；API 层将 `page` 转换为后端 `pageNo`。
2. 搜索框使用普通 `a-input`，搜索图标只作为前置视觉提示，不承担点击搜索语义。
3. 用户按 Enter 或输入框失去焦点时提交搜索；Enter 后紧接着 blur 不重复请求相同关键词。
4. 搜索范围为方案名称、方案描述和所有层级名称。
5. 提交新关键词或清除关键词时将页码重置为 `QUALITY_PLAN_DEFAULT_PAGE`，保留 `QUALITY_PLAN_DEFAULT_PAGE_SIZE`。
6. 搜索结果记录数使用 API 返回的 `total`，不使用当前页数组长度兜底。
7. 表格使用公共 `DmAppTable`，服务端分页默认每页 20 条，分页器显示每页条数选择器并提供 `10/20/50` 选项。列表层级数量使用接口返回的 `levelCount`；“质检层级”列启用 `DmAppTable` 内置数字筛选项。
8. 删除当前页最后一条记录后，如果当前页码大于 `1`，先回退到上一页再重新查询，避免停留在空白页。

### 新建方案

1. 点击“新建质量方案”打开 `create` 模式弹窗。
2. 初始方案名称和描述为空。
3. 默认包含一个层级：名称“初检”、全量检查、100%、单人质检、自动分配。
4. 点击“新建方案”先校验表单；通过后调用创建 API。
5. 提交期间按钮显示加载并禁止重复提交。
6. 成功后关闭弹窗、提示成功并重新查询列表；失败时保留当前输入。

### 查看方案

1. 点击“查看”后调用详情 API，再打开或填充 `view` 模式弹窗。
2. 所有输入、选择、增加和删除层级操作禁用。
3. 底部只保留“关闭”，不显示提交按钮。

### 编辑方案

1. 点击“修改”后调用详情 API，使用深拷贝回填表单。
2. 点击“保存”执行与新建相同的校验和防重复提交逻辑。
3. 成功后关闭弹窗并刷新列表；失败时保留当前输入。

### 增加和删除层级

1. 点击“增加一级”向数组末尾追加原型默认层级。
2. 层级标题根据数组位置展示“第 N 级”；提交时将数组位置转换为后端要求的 `levelOrder`。
3. 只剩一级时删除按钮禁用。
4. 删除前显示标题“删除质检层级”和正文“确认删除第 N 级吗？”。
5. 确认后从表单数组移除该项，后续层级自动重新编号。

### 检查范围联动

1. 层级名称必填，仅输入空白字符视为未填写。
2. 检查范围不设置表单必填校验，保留已有默认值和选项。
3. 切换为 `full` 时立即把 `sampleRate` 设为 `100` 并禁用数字输入框。
4. 切换为 `sample` 时清空 `sampleRate`，要求用户重新填写。
5. 数字输入框设置 `min=1`、`max=100`、`precision=0` 和 `%` 后缀。
6. 查看模式下无论范围为何，所有控件都禁用。

### 删除方案

1. 点击“删除”显示危险操作确认，不直接修改列表。
2. 确认后调用删除 API，当前行进入删除中状态并禁止重复点击。
3. 成功后提示并重新查询当前关键词下的列表。
4. 失败时保留该行并展示错误提示。
5. 本期不实现任务模块引用保护；接口已确定逻辑删除语义，任务模块接入后再补充引用校验。

## 校验与状态处理

| 状态             | 页面行为                                               |
| ---------------- | ------------------------------------------------------ |
| 首次加载         | `DmAppTable` 使用 loading，保留标题、搜索框和新建按钮  |
| 加载成功且有数据 | 使用 `DmAppTable` 展示记录并保留服务端分页             |
| 加载成功但无数据 | 表格空状态使用 `a-empty`；按是否存在关键词提供对应提示 |
| 有多页数据       | `DmAppTable` 内置分页显示当前页、总数和每页条数选择器  |
| 加载失败         | 使用 `a-result` 或 `a-alert` 展示失败和“重试”按钮      |
| 详情加载中       | 弹窗内容显示加载态，避免先展示旧数据                   |
| 提交中           | 确认按钮 loading，取消、关闭和重复提交受控             |
| 删除中           | 只禁用当前记录的删除操作，不阻塞查看其他记录           |
| 表单失败         | Ant Design 表单显示字段错误并滚动至首个错误项          |
| API 失败         | 保留当前页面或表单数据，展示明确错误，不吞掉异常       |

## 组件与文件设计

### 首期文件面

```text
src/
├─ api/
│  ├─ quality-plan.ts
│  └─ quality-plan.test.ts
├─ views/
│  └─ quality-plan/
│     ├─ index.vue
│     └─ components/
│        └─ QualityPlanModal.vue
├─ locales/messages/zh-CN.ts
└─ router/index.ts
```

### 职责划分

#### `src/api/quality-plan.ts`

- 定义质量方案相关类型和字典选项结构/当前默认选项。
- 维护页面模型、后端 DTO、请求参数和响应转换。
- 调用质量方案列表、详情、新增、更新和逻辑删除真实接口。
- 对外返回深拷贝，隔离页面表单与接口响应对象。

#### `src/views/quality-plan/index.vue`

- 负责页面头部、搜索、列表和空/错/加载状态。
- 维护当前关键词、页码、固定 `pageSize=20`、列表和当前操作记录。
- 调用 API，协调弹窗模式和 CRUD 后刷新。
- 维护删除方案确认状态。

#### `QualityPlanModal.vue`

- 负责 `create | view | edit` 三种模式。
- 维护表单副本、校验、层级增删和范围联动。
- 只通过 `props` 接收模式和详情，通过事件通知关闭和保存成功。
- 不直接维护列表，不直接修改父组件记录。

质量方案列表由 `useQualityPlanStore` 全局缓存，首次使用时懒加载完整集合；质量方案新增、修改或删除成功后主动刷新 Store，供场景配置等其他模块复用。

## Ant Design Vue 组件映射

| 原型元素           | 实现组件                                                   |
| ------------------ | ---------------------------------------------------------- |
| 搜索               | `a-input` + `prefix` 搜索图标                              |
| 页面信息与数据容器 | `a-card`                                                   |
| 方案列表           | `DmAppTable`、Typography                                   |
| 列表分页           | `DmAppTable` 服务端分页，默认 `pageSize=20`，支持 10/20/50 |
| 字段筛选           | `DmAppTable` 内置数字筛选（质检层级）                      |
| 操作按钮           | `a-button type="link"`，删除保留 danger 状态               |
| 新建/查看/编辑     | 受控 `a-modal`，使用 `open` / `v-model:open`               |
| 表单               | `a-form`、`a-form-item`                                    |
| 名称/描述          | `a-input`、`a-textarea`                                    |
| 层级布局           | `a-card size="small"`、`a-row`、`a-col`                    |
| 检查范围和固定方式 | `a-select`                                                 |
| 抽样比例           | `a-input-number`                                           |
| 状态               | `a-spin`、`a-empty`、`a-alert` 或 `a-result`               |
| 图标               | `@ant-design/icons-vue` 已有图标                           |

动态层级不使用不存在的 `Form.List`。建议采用：

```vue
<template v-for="(level, index) in formModel.levels" :key="level.id">
  <a-form-item :name="['levels', index, 'sampleRate']">
    <!-- 字段控件 -->
  </a-form-item>
</template>
```

## 样式方案

- 优先保留 Ant Design Vue 默认尺寸、圆角、阴影、禁用态和反馈态，不自绘基础控件。
- 页面使用一个 Ant Design `a-card` 承载 `DmAppTable`，标题区放置搜索框和“新建质量方案”按钮；表格内部结构复用公共组件的布局和分页样式。
- 页面专属列表摘要、层级标题和窄屏规则保留在组件 `scoped less` 中。
- 文字、边框和背景分别使用 `--dm-text*`、`--dm-border*`、`--dm-bg-*`，不复制浅色主题色值。
- 层级配置使用 Ant Design `a-card`，不在信息卡片、数据卡片和层级卡片之外继续嵌套无业务意义的卡片。
- 表格操作按钮沿用规则中心的文字链接样式，删除按钮保留 danger 状态。
- 表单采用响应式栅格：桌面端基础字段三列、固定方式两列；窄屏统一单列。
- 长名称、长描述和多层级需允许换行或省略，操作区不得被挤出可视区域。

## 路由与国际化

### 路由

- 将 `src/router/index.ts` 中 `/quality-plan` 的 `component: notFoundComponent` 替换为懒加载 `@/views/quality-plan/index.vue`。
- 保留现有 `layout: "main"`、`menu: true`、`requiresAuth: true`、`titleKey`、分组、顺序和图标配置。
- 不新增重复路由或在页面内复制主布局。

### 国际化

- 在 `src/locales/messages/zh-CN.ts` 增加 `qualityPlan` 命名空间，覆盖标题、描述、按钮、字段、枚举、确认、校验、加载、空数据和错误文案。
- API 数据保存英文枚举值，页面通过语言包映射中文，不把中文展示值当接口枚举。
- 原型中的固定说明文案可以保留，但“交叉质检员共享抽样、全部通过才进入下一层”应标记为说明，不由当前数据模型执行。

## 分阶段实施计划

### 阶段 1：API 模型与 Mock 验证（已完成）

涉及文件：

- `src/api/quality-plan.ts`
- `src/api/quality-plan.test.ts`

实施内容：

1. 定义页面业务模型、后端 DTO、统一响应类型和双向转换函数。
2. 按正式接口字段建立 DTO 映射和页面模型。
3. 通过 HTTP Mock 测试覆盖深拷贝、分页参数、详情和 CRUD 请求。
4. 在 API 边界执行名称长度、层级顺序、层级数和抽样比例校验。
5. 用 Vitest 覆盖 DTO 映射、请求路径、统一响应解包、抽检边界和后端 message 透传。

完成证据：

- `corepack yarn vitest run src/api/quality-plan.test.ts` 通过，7 个测试通过。
- API 测试使用 HTTP 方法 Mock，不依赖页面、浏览器存储或内存业务数据。

禁止事项：

- 不增加通用 Repository 或 Mock 服务框架；仅在质量方案 API 模块内定义本接口所需的响应包装和错误转换。
- 不加入当前页面未使用的版本和状态字段。

### 阶段 2：页面列表、搜索和路由

涉及文件：

- `src/views/quality-plan/index.vue`
- `src/router/index.ts`
- `src/locales/messages/zh-CN.ts`
- `src/components/Table/index.vue`

实施内容：

1. 替换路由占位页面。
2. 使用 Ant Design Vue 原生组件和公共 `DmAppTable` 搭建搜索、表格和分页。
3. 接入列表 API，处理加载、空数据、错误和重试。
4. 实现 Enter/失焦搜索、清除、翻页和搜索结果记录数。
5. 在“质检层级”列启用 `DmAppTable` 内置数字筛选，并在分页、每页条数切换和筛选事件中保持当前关键词和服务端分页状态。
6. 预留查看、修改、删除事件入口，不在页面硬编码详情。

补充：`DmAppTable` 初始化查询状态时沿用调用方传入的分页页码和页大小，确保质量方案默认每页 20 条不会被组件默认值覆盖；不改变既有组件属性和事件接口。

完成证据：

- `/quality-plan` 可通过菜单和直接 URL 进入。
- 搜索名称、描述和层级名称均可命中，Enter/失焦触发，清除后回到第 1 页并恢复全量。
- 默认每页 20 条，翻页请求携带当前关键词、页码和 `pageSize`，由 API 层转换为后端 `pageNo`。
- 列表按图1拆分为方案名称、方案描述、质检层级和操作四列；质检层级列显示内置数字筛选入口。
- 加载、空数据和错误状态均有可见反馈。

禁止事项：

- 不复制主布局、菜单或主题控制。
- 不为单页列表增加 Pinia。
- 不用手写 CSS 模拟 Ant Design 的按钮、列表或输入框。

### 阶段 3：方案弹窗和 CRUD 交互

涉及文件：

- `src/views/quality-plan/components/QualityPlanModal.vue`
- `src/views/quality-plan/index.vue`
- `src/locales/messages/zh-CN.ts`

实施内容：

1. 实现 `create | view | edit` 三种模式和表单重置。
2. 使用响应式 `levels` 数组实现动态层级。
3. 实现层级增加、删除确认、至少一级和自动重编号；提交时由数组顺序生成连续 `levelOrder`。
4. 实现检查范围与抽样比例联动。
5. 从 TypeScript 模型文件导入检查范围、执行方式和分配方式选项；组件不内联选项数组。
6. 接入详情、创建、更新和删除 API；页面只传业务模型，字段映射、统一响应解包和错误信息处理均在质量方案 API 模块内完成。
7. 加入提交、删除防重复和成功/失败反馈。

完成证据：

- 原型交互矩阵中的列表、新建、查看、编辑、层级增删、范围切换和删除确认全部通过。
- 查看模式无可编辑入口；新建和编辑失败时表单内容不丢失。
- 全量始终提交 100；抽检只接受 1～100 整数。
- 执行方式和分配方式只在 UI 上禁用，不由 API 层限制未来字典取值。

禁止事项：

- 不照搬 React 原型的 `Form.List`。
- 不通过 `watch` 批量同步所有表单字段；范围联动在明确的 `handleScopeChange` 中完成。
- 不在子组件中直接修改父组件对象或列表。

### 阶段 4：真实接口联调（已完成接入）

涉及文件：

- 本阶段不预设新增业务文件，仅修复验证发现的问题。

验证内容：

1. 运行 `yarn format:check`、`yarn lint`、`yarn type-check`、`yarn test` 和 `yarn build`。
2. 在浅色和深色主题下验证列表、弹窗、确认框、禁用态和错误态。
3. 在常用桌面宽度和窄屏下验证表单换行、长文本和多层级滚动。
4. 按 `.temp/quality-view-20260806/README.md` 的交互矩阵逐项复测。
5. 确认 `.env` 中 `VITE_API_BASE_URL=/api` 与开发代理配置可将 `/api/quality-schemes` 转发到后端。

真实接口到位后的替换点：

- 保留 `QualityPlan*` 页面业务类型和 API 函数名称；在模块内保留后端 DTO 与双向映射，不让页面改用 `schemeName` 等协议字段。
- 已把模块内存 Mock 实现替换为 `src/api/http.ts` 请求，并在质量方案 API 模块内解包 `{ code, message, data }`。
- 已知错误码映射到模块文案；遇到未定义错误码直接展示后端 `message`。
- 根据后端状态、版本和引用校验规则更新文档后再扩展页面；分页默认仍以产品确认的 20 条为准并显式传参。

## 验收标准

### 功能验收

- 质量方案菜单进入真实页面，不再显示 404 占位。
- 列表使用 `schemeName/schemeDescription/levelCount` 的 DTO 映射结果，通过 `DmAppTable` 展示方案名称、方案描述、质检层级数量和查看、修改、删除。
- 搜索可匹配方案名称、描述和层级名称，Enter 或失焦触发，清除后回到第 1 页并恢复全部数据。
- 列表默认每页 20 条，分页器与规则中心一致支持切换 10/20/50 条，并在翻页或切换条数时保留当前关键词。
- 新建弹窗默认一个“初检”层级。
- 查看弹窗全部只读，编辑弹窗正确回填。
- 多层级内容超过视口时弹窗正文出现纵向滚动条，底部操作按钮无需滚动页面即可访问。
- 增加一级后出现在末尾，层级序号连续。
- 只剩一级时不能删除；删除层级和方案均有二次确认。
- 全量检查固定 100% 且禁用输入；按比例抽检必须输入 1～100 整数。
- 层级名称必填；检查范围不显示必填标记，继续使用默认值和范围联动。
- 执行方式和分配方式当前分别展示“单人质检”和“自动分配”并禁用；页面不对未来字典值做校验限制，API 适配层仅负责当前协议值映射。
- 检查范围、执行方式和分配方式的选项由 TypeScript 模型文件导出，组件不内联选项数组。
- 创建、更新、删除成功后列表重新查询并刷新质量方案全局 Store；失败时不丢失当前数据，已知错误使用模块文案，未定义错误码直接展示后端 `message`。
- 列表操作列使用全局表格操作样式：普通图标按钮横向排列并保持 8px 间距，删除按钮保留危险态。

### 技术验收

- 页面和组件不直接导入 Mock 数据、Axios 或 `src/api/http.ts`。
- 不使用 `any`、`@ts-ignore`、空 `catch` 或硬编码业务结果掩盖问题。
- 新增和修改的方法具备用途注释，分支说明业务原因和边界。
- 样式复用 Ant Design Vue、现有布局工具类和 `--dm-*` 变量。
- 浅色、深色主题和内容溢出显示正常。
- API 的 DTO 映射、请求路径、分页参数、关键校验和错误处理规则有 Vitest 覆盖。
- 格式化、ESLint、类型检查、测试和生产构建全部通过；无法运行的检查必须如实记录。

## 待确认项

以下事项没有足够原型或接口依据，确认前不进入首期实现：

1. 新建方案后是草稿、直接生效还是需要发布。
2. 生效中的方案能否直接编辑，是否需要版本复制和回滚。
3. 任务模块接入后，被场景或质检任务引用时是否需要额外阻止删除；当前接口已确定方案及层级采用逻辑删除。
4. 跨模块是否统一使用 `qualityPlanId`，以及现有名称字符串如何迁移。
5. 人员/分组来源、自动分配算法和交叉质检人数。
6. 多人质检的通过阈值、冲突处理、返修和放行责任。
7. 是否需要展示创建人、更新时间、适用标注类型和引用数量。

## 主要风险

- 联调依赖后端环境可用及 `.env` 中 `VITE_PROXY_URL` 配置正确；当前未执行真实后端端到端请求。
- 原型中的方案主数据与场景/质检任务引用不一致，本期不能据此实现可靠的引用保护。
- 真实接口错误码仍可能增加；未定义错误码统一展示后端 `message`，避免页面静默失败。
- 原型说明提到交叉质检，但当前固定“单人质检”，说明文案与可配置能力存在时间差，验收时需明确首期边界。
