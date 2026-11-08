# 动态表单 iframe 化技术设计方案

## 1. 文档信息

| 项目     | 内容                                                           |
| -------- | -------------------------------------------------------------- |
| 文档名称 | 动态表单 iframe 化技术设计方案                                 |
| 适用范围 | `fe-management`、`xtreme-frontend/pc-tool` 及未来 React 工作台 |
| 文档状态 | 方案评审稿                                                     |
| 目标版本 | V1.0                                                           |
| 编写日期 | 2026-08-25                                                     |
| 方案结论 | 采用管理端普通组件 + 隐藏路由，通过 iframe 嵌入工作台          |

## 2. 摘要

当前 `pc-tool` 已具备标签动态表单能力，但动态表单的接口归一化、控件渲染、校验和编辑器状态更新均位于点云工作台内部。未来工作台可能采用 React 实现，如果继续将动态表单作为 pc-tool 内部 Vue 组件维护，将导致动态表单能力与具体工作台框架、编辑器状态模型和组件库产生较强耦合。

本方案在 `fe-management` 仓库中维护 dynamic-form 普通组件，并通过隐藏的 `/tool/dynamic-form/` 路由提供 iframe 页面。它不作为独立构建和独立部署的子应用，不进入管理端菜单，不负责业务数据持久化、对象状态管理或鉴权。工作台作为唯一业务数据源，负责请求标签信息和动态表单定义，向 iframe 传递渲染所需的纯 JSON 数据；dynamic-form 负责控件渲染、局部联动、前端校验和尺寸通知，并通过标准化消息协议向工作台返回字段变化和校验结果。

生产环境中，主站、pc-tool 和 dynamic-form 通过同一公开域名和不同路径提供服务：

```text
https://<host>/                         # 管理端主应用
https://<host>/tool/pc/                 # pc-tool
https://<host>/tool/dynamic-form/       # dynamic-form iframe 子应用
https://<host>/api/                     # 后端接口
```

由于 iframe 和 API 使用同一公开 origin，未来 dynamic-form 如确需请求接口，可通过相对路径访问 `/api/*`，由浏览器自动携带主站 HttpOnly Cookie。dynamic-form 不读取、不传递认证 Token，也不保存独立登录态。

## 3. 背景与现状

### 3.1 业务背景

需求构思中的工作台右侧区域用于展示标签属性动态表单。当前 pc-tool 已存在标签属性编辑区域，未来需要将该渲染能力独立出来，以便：

1. 复用动态表单能力；
2. 降低动态表单与点云编辑器内部实现的耦合；
3. 兼容 Vue、React 等不同工作台技术栈；
4. 允许动态表单独立演进控件类型、布局和局部联动能力；
5. 维持工作台对标注对象数据和保存时机的统一控制。

### 3.2 当前 pc-tool 实现依据

当前 pc-tool 的动态表单链路如下：

```text
标签接口
  -> 动态表单接口
  -> API 层归一化
  -> editor.state.classTypes
  -> 当前对象 userData.attrs 回填
  -> ObjectAttr / AttrValue 渲染
  -> update-object-user-data
  -> 现有保存链路
```

相关实现包括：

- `pc-tool/src/api/common.ts`：按 `labelId` 获取动态表单并归一化属性定义；
- `pc-tool/src/components/EditClass/index.vue`：组织固定属性和自定义属性区域；
- `pc-tool/src/components/EditClass/ObjectAttr.vue`：遍历动态属性并触发字段变化；
- `pc-tool/src/components/EditClass/AttrValue.vue`：根据属性类型选择控件；
- `pc-tool/src/components/EditClass/useEditClass.ts`：从当前对象回填属性、更新编辑器对象并触发保存相关链路；
- `pc-tool/src/components/EditClass/dynamicForm.ts`：执行必填、类型、枚举和范围校验。

当前动态表单定义按 `labelId` 获取，属性值存储在当前对象的 `userData.attrs` 中，现有需求文档明确要求属性变化继续沿用对象更新和保存链路。

### 3.3 当前工程与部署依据

`fe-management` 当前是一个带 Vue Router、Pinia、全局主题和鉴权守卫的单页应用。普通路由会进入主应用生命周期，不适合作为最终 iframe 子应用入口。

`pc-tool` 已采用独立构建和路径部署方式，构建基础路径为 `/tool/pc/`。xtreme-frontend 也已形成多个工具分别构建、再按路径组合部署的模式。

`fe-management` 当前 Docker 构建会将 `dist` 复制到 Nginx 根目录，适合在同一个静态资源目录下增加 `tool/dynamic-form/` 子目录。

## 4. 设计目标与非目标

### 4.1 设计目标

1. 将动态表单渲染能力从 pc-tool 内部组件中解耦出来。
2. 支持 Vue 工作台和未来 React 工作台复用同一个动态表单子应用。
3. 保证工作台是标签、对象、属性值、权限和保存状态的唯一正确数据源。
4. 通过稳定、版本化、框架无关的消息协议实现组件通信。
5. dynamic-form 复用管理端构建，不单独生成或部署业务站点。
6. 生产环境通过同一公开 origin 简化 Cookie 鉴权和 API 访问。
7. dynamic-form 在接口未使用阶段保持纯渲染器特性，不引入不必要的认证和业务依赖。
8. 复用管理端主应用的构建、Ant Design 依赖、主题变量和 API 基础设施，不再维护独立 dynamic-form 构建入口。

### 4.2 非目标

本方案不包含以下内容：

- 不重构点云编辑器、对象模型或保存接口；
- 不将对象、帧、轨道或编辑器实例传入 iframe；
- 不让 dynamic-form 直接保存标注对象或提交任务；
- 不把 dynamic-form 注册为 fe-management 主业务路由；
- 不在 iframe 内复制主站登录、权限或用户状态管理；
- 不通过 Token URL 参数或 `postMessage` 传递认证信息；
- 不在本阶段引入 Module Federation、qiankun 等微前端框架；
- 不同时维护新旧两套长期动态表单渲染实现。

## 5. 总体架构

### 5.1 逻辑架构

```text
┌─────────────────────────────────────────────────────────────┐
│ 工作台：pc-tool / 未来 React Workbench                       │
│                                                             │
│  任务、标签、对象、权限、属性值、保存、提交、状态管理         │
│                                                             │
│  1. 请求标签和动态表单定义                                   │
│  2. 根据当前对象生成 values                                  │
│  3. 创建 iframe 并发送 INIT                                  │
│  4. 接收字段变更并更新工作台状态                              │
│  5. 继续执行现有保存和提交链路                                │
└──────────────────────────────┬──────────────────────────────┘
                               │ window.postMessage
                               │ 纯 JSON、版本化协议
┌──────────────────────────────▼──────────────────────────────┐
│ dynamic-form iframe 子应用                                   │
│                                                             │
│  schema 归一化后的控件渲染                                   │
│  局部联动、局部校验、错误展示、尺寸通知                       │
│                                                             │
│  不持有业务数据最终副本                                       │
│  不访问 Editor、Box、trackObject                              │
│  不负责标注对象保存                                           │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 核心数据所有权原则

| 数据或能力                  | 所属方                  | 说明                         |
| --------------------------- | ----------------------- | ---------------------------- |
| 当前对象、对象 ID、trackId  | 工作台                  | iframe 只接收展示上下文      |
| labelId、标签名称、标签定义 | 工作台                  | 工作台负责请求、缓存和适配   |
| 动态表单 schema             | 工作台                  | 传递给 iframe 的纯 JSON DTO  |
| 当前属性值                  | 工作台                  | 工作台是唯一正确来源         |
| 输入过程中的临时控件状态    | iframe                  | 仅用于渲染和交互             |
| 字段变化                    | iframe 产生，工作台确认 | iframe 通过消息返回 patch    |
| 对象更新和保存              | 工作台                  | 继续沿用现有编辑器命令和 API |
| 权限和只读状态              | 工作台决定，iframe 执行 | iframe 不自行判断业务权限    |
| 认证 Cookie                 | 浏览器和主站            | dynamic-form 不读取 Cookie   |

## 6. dynamic-form 子应用设计

### 6.1 组件与路由入口

dynamic-form 在 `fe-management` 仓库中作为普通组件维护，由管理端 Vue Router 提供 iframe 入口：

```text
fe-management/
├─ src/
│  ├─ components/dynamic-form/
│  │  ├─ DynamicFormPanel.vue
│  │  └─ requirements.md
│  ├─ views/dynamic-form/
│  │  ├─ index.vue
│  │  └─ requirements.md
│  └─ dynamic-form/
│     ├─ LegacyDateTimePicker.vue
│     ├─ protocol.ts
│     ├─ types.ts
│     └─ validation.ts
```

`/tool/dynamic-form/` 是隐藏的 `fullscreen` 路由，不进入主布局、菜单和面包屑。它渲染 `DynamicFormPanel` 并负责 `postMessage` 协议适配。主站使用一次 `yarn build` 即可产出该路由所需的懒加载资源；阶段 4 起不再维护独立 dynamic-form 入口和配置。

### 6.2 功能范围

V1 dynamic-form 负责：

- 文本输入；
- 数字输入；
- 日期/时间输入；
- 布尔值选择；
- 枚举单选；
- 枚举多选；
- 必填、类型、枚举、数值和日期范围校验；
- 只读字段展示；
- 单位、说明、提示信息展示；
- 已确认的简单字段联动和显示条件；
- 深色/浅色主题适配；
- 内容高度变化通知；
- 加载、协议不兼容和通信错误状态展示。

V1 不负责：

- 对象选择；
- 标签切换；
- 跨帧轨道同步；
- 标注保存；
- 任务提交；
- 工作台固定属性；
- 工作台业务权限计算；
- 直接读取主站 Pinia、localStorage 或编辑器内部对象。

### 6.3 框架无关数据模型

dynamic-form 不直接暴露 pc-tool 的 `IAttr`、`IClassType` 等内部模型。建议定义独立 DTO：

```ts
type DynamicFormSchema = {
  schemaVersion: string;
  formId?: string;
  labelId: string | number;
  fields: DynamicFormField[];
};

type DynamicFormField = {
  code: string;
  label: string;
  valueType: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "ENUM";
  required?: boolean;
  readOnly?: boolean;
  defaultValue?: unknown;
  unit?: string;
  description?: string;
  minValue?: number | string;
  maxValue?: number | string;
  multipleEnabled?: boolean;
  options?: DynamicFormOption[];
  visibleWhen?: DynamicFormCondition;
};

type DynamicFormOption = {
  value: string | number | boolean;
  label: string;
  description?: string;
};
```

字段唯一标识必须使用稳定的 `code`，不能使用展示名称。工作台与 dynamic-form 之间只传输纯 JSON 值，禁止传输 Vue Ref、函数、类实例、Three.js 对象或循环引用对象。

## 7. 通信协议设计

### 7.1 通信原则

1. 使用 `window.postMessage`，不依赖 Vue 或 React 组件实例。
2. 所有消息使用统一 envelope。
3. 所有消息携带协议版本。
4. 所有业务上下文携带 `objectId` 和 `revision`。
5. 父页面只接受来自目标 iframe 的消息。
6. 父页面只允许已配置的 `targetOrigin`。
7. 父页面与 iframe 通过握手后再传输初始化数据。

### 7.2 消息 envelope

```ts
type DynamicFormMessage<T = unknown> = {
  channel: "dynamic-form";
  protocolVersion: "1.0";
  type: string;
  requestId: string;
  objectId?: string;
  revision?: number;
  payload?: T;
};
```

### 7.3 工作台发送的消息

#### `INIT`

iframe 发送 `READY` 后，工作台发送完整初始化数据：

```ts
{
  channel: "dynamic-form",
  protocolVersion: "1.0",
  type: "INIT",
  requestId: "req-001",
  objectId: "object-001",
  revision: 1,
  payload: {
    labelId: 1001,
    schema: {...},
    values: {
      vehicleSpeed: 36,
      isMoving: false
    },
    readonly: false,
    locale: "zh-CN",
    theme: "dark"
  }
}
```

`theme` 由宿主显式传入，仅允许 `dark` 或 `light`。dynamic-form 未收到该字段时默认使用 `dark`，不得读取宿主应用 Store、宿主 DOM 主题类或系统主题状态。子应用通过管理端现有 Ant Design 主题算法与公共主题变量完成两套皮肤切换，避免为具体控件和浮层维护零散颜色覆盖。

#### `SET_CONTEXT`

对象切换、标签切换或属性值由工作台重新确认后，发送新的上下文：

```ts
{
  type: "SET_CONTEXT",
  objectId: "object-002",
  revision: 2,
  payload: {
    labelId: 1002,
    schema: {...},
    values: {...},
    readonly: false
  }
}
```

#### `REQUEST_VALIDATE`

工作台主动请求 iframe 执行校验：

```ts
{
  type: "REQUEST_VALIDATE",
  objectId: "object-002",
  revision: 2
}
```

### 7.4 iframe 发送的消息

#### `READY`

子应用完成启动并准备接收初始化数据：

```ts
{
  type: "READY",
  payload: {
    protocolVersion: "1.0",
    supportedFeatures: ["enum", "multi-select", "validation", "resize"]
  }
}
```

#### `CHANGE`

字段变化只返回增量 patch，不返回完整对象：

```ts
{
  type: "CHANGE",
  objectId: "object-002",
  revision: 2,
  payload: {
    fieldCode: "vehicleSpeed",
    value: 36
  }
}
```

工作台收到后，将变化合并到自己的属性值中，再继续执行现有对象更新和保存链路。

#### `VALIDATE_RESULT`

```ts
{
  type: "VALIDATE_RESULT",
  objectId: "object-002",
  revision: 2,
  payload: {
    valid: false,
    errors: {
      vehicleSpeed: "数值不能小于 0"
    }
  }
}
```

#### `RESIZE`

```ts
{
  type: "RESIZE",
  payload: {
    height: 640
  }
}
```

#### `AUTH_REQUIRED` 与 `ERROR`

如果未来 dynamic-form 直接请求接口并收到 401，不在 iframe 内跳转登录页，而是通知父页面：

```ts
{
  type: "AUTH_REQUIRED",
  payload: {
    source: "dynamic-form",
    status: 401
  }
}
```

父页面负责统一处理登录失效、刷新或跳转。

### 7.5 消息安全校验

父页面接收消息时必须同时校验：

```ts
event.origin === allowedOrigin;
event.source === iframe.contentWindow;
event.data.channel === "dynamic-form";
event.data.protocolVersion === "1.0";
```

禁止使用 `*` 作为生产环境 `targetOrigin`。消息 payload 还需要进行运行时结构校验，不能只依赖 TypeScript 编译期类型。

## 8. 数据同步与状态流转

### 8.1 初始化流程

```text
工作台加载
  -> 创建 iframe
  -> iframe 加载 dynamic-form 静态资源
  -> iframe 发送 READY
  -> 工作台发送 INIT
  -> dynamic-form 根据 schema 和 values 渲染
  -> iframe 发送 RESIZE
```

### 8.2 字段修改流程

```text
用户修改字段
  -> dynamic-form 更新局部控件状态
  -> 发送 CHANGE(fieldCode, value, objectId, revision)
  -> 工作台校验消息上下文
  -> 工作台更新当前对象属性值
  -> 继续现有 update-object-user-data 链路
  -> 按工作台原有策略保存或标记未保存
```

### 8.3 对象切换流程

```text
工作台切换对象
  -> revision + 1
  -> 根据新对象生成 values
  -> 发送 SET_CONTEXT
  -> dynamic-form 清理旧字段状态
  -> 根据新 schema 和 values 重新渲染
```

工作台必须丢弃 `objectId` 或 `revision` 不匹配的旧消息，避免异步事件误写入新对象。

### 8.4 空值规则

以下值必须保持原始语义：

- `0` 是有效数字；
- `false` 是有效布尔值；
- `[]` 表示多选为空；
- `null`、`undefined` 和空字符串的含义必须由字段协议明确；
- 日期统一使用约定的字符串格式；
- 枚举值保存实际 `value`，不保存展示 `label`。

## 9. 鉴权与接口访问设计

### 9.1 V1：dynamic-form 不请求接口

V1 由工作台负责：

- 请求任务标签；
- 请求动态表单定义；
- 处理后端响应归一化；
- 将 schema 和 values 传给 dynamic-form。

dynamic-form 不需要：

- Axios 请求实例；
- Token 读取逻辑；
- Cookie 读取逻辑；
- 用户信息初始化；
- 登录路由；
- 权限菜单和 Pinia 用户状态。

这是当前推荐的最小实现范围。

### 9.2 未来需要请求接口时

如果后续 dynamic-form 需要请求选项、远程校验或其他只读接口，应使用同源相对路径：

```ts
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});
```

浏览器会自动携带当前站点的 HttpOnly Cookie。dynamic-form 不需要、也不应该通过 `document.cookie` 获取 Cookie。

推荐的请求路径：

```text
/api/labelCenter/label/{labelId}/dynamic-form
/api/labelCenter/options/{optionId}
```

不要使用跨域后端绝对地址，也不要把 Token 放入 iframe URL 或 `postMessage`。

### 9.3 Cookie 配置要求

认证 Cookie 至少应满足：

```http
Set-Cookie: SESSION=xxx; Path=/; HttpOnly; Secure; SameSite=Lax
```

其中：

- `Path=/` 确保 `/api/` 和 `/tool/dynamic-form/` 都能使用；
- `HttpOnly` 防止前端脚本读取敏感 Cookie；
- `Secure` 仅允许 HTTPS 发送；
- `SameSite=Lax` 适用于同站点路径访问；
- 只有在未来出现跨站 iframe 时，才需要评估 `SameSite=None; Secure`。

### 9.4 401 和会话失效

dynamic-form 如果未来收到 401：

1. 停止当前接口请求后的继续处理；
2. 发送 `AUTH_REQUIRED` 给父页面；
3. 不在 iframe 内加载完整登录页面；
4. 由父页面统一刷新会话或跳转登录。

### 9.5 CSRF

未来如果 dynamic-form 发送写请求，不能只依赖 Cookie 认证，应沿用后端已有的 CSRF 防护策略，包括 Origin/Referer 校验或 CSRF Token。V1 不建议让 dynamic-form 直接承担任何业务写操作。

## 10. 路由与部署设计

### 10.1 路径规划

| 路径                  | 用途                       | 归属                    |
| --------------------- | -------------------------- | ----------------------- |
| `/`                   | fe-management 主应用       | fe-management           |
| `/tool/pc/`           | 点云工作台                 | xtreme-frontend/pc-tool |
| `/tool/dynamic-form/` | 管理端动态表单 iframe 路由 | fe-management           |
| `/api/`               | 后端接口代理               | 网关/Nginx              |

### 10.2 单镜像一起部署

本方案采用一起部署方式：dynamic-form 源码和构建流程位于 fe-management，主应用和动态表单路由共同由同一个管理端 SPA 提供，使用当前 fe-management Nginx 镜像统一发布。dynamic-form 不再生成独立 `dist/tool/dynamic-form/index.html`。

目标结构：

```text
dist/
├─ index.html
└─ assets/                 # 含 dynamic-form 路由懒加载 chunk
```

pc-tool 仍由 xtreme-frontend 按 `/tool/pc/` 提供，外部网关将 `/tool/pc/` 和 `/tool/dynamic-form/` 暴露到同一个公开 host 下。

### 10.3 主 SPA fallback 处理

Nginx 只需保证 `/tool/dynamic-form/` 回退到管理端 `index.html`，由 Vue Router 匹配隐藏全屏路由；同时不得将该路径转发给 pc-tool。

### 10.4 发布一致性

由于 pc-tool 和管理端可能来自不同仓库，发布时需要保证：

- 消息协议版本兼容；
- 管理端主 SPA 及其 dynamic-form 懒加载 chunk 版本一致；
- 不删除仍可能被旧 HTML 引用的静态资源；
- 发布后进行实际 iframe 加载和 `READY` 握手检查。

## 11. 安全设计

### 11.1 消息安全

- 使用固定 `targetOrigin`；
- 校验 `event.origin`；
- 校验 `event.source`；
- 校验协议版本；
- 校验 payload 结构；
- 不传递 Token、Cookie、用户密码或完整后端响应对象；
- 不使用 `v-html` 直接渲染接口返回的标签文案。

### 11.2 页面嵌入安全

生产环境应配置：

- 父页面 `frame-src` 允许 `/tool/dynamic-form/`；
- 子应用使用 `Content-Security-Policy: frame-ancestors` 限制允许的宿主；
- 不将 dynamic-form 静态资源暴露到不受信任的外部域名；
- 生产环境关闭调试 Token 和 Mock Token。

### 11.3 API 安全

未来 dynamic-form 请求接口时：

- 使用同源相对地址；
- 依赖 HttpOnly Cookie 自动携带；
- 统一处理 401、403 和业务错误；
- 写请求遵守 CSRF 防护；
- 不将认证信息放入 URL、localStorage 或消息 payload。

## 12. 可靠性与可观测性

虽然本方案不保留旧版动态表单业务兜底，但仍需提供明确的运行状态：

| 状态                 | 展示或处理                               |
| -------------------- | ---------------------------------------- |
| iframe 加载中        | 显示加载状态，暂不允许编辑               |
| iframe ready         | 允许工作台发送 INIT                      |
| READY 超时           | 显示 dynamic-form 不可用提示，并记录错误 |
| 协议不兼容           | 显示版本不匹配信息并阻止继续交互         |
| 子应用主动报错       | 展示错误信息并记录上下文                 |
| API 401              | 发送 AUTH_REQUIRED，由父页面统一处理     |
| 父子消息上下文不一致 | 丢弃消息并记录 objectId/revision         |

建议记录以下监控字段：

- dynamic-form 构建版本；
- 协议版本；
- pc-tool 版本；
- iframe 加载耗时；
- `READY` 握手耗时；
- schema 字段数量；
- `ERROR` 类型；
- 401、403、网络错误数量；
- 父子 revision 不匹配次数。

## 13. 测试与验收方案

### 13.1 单元测试

dynamic-form 应覆盖：

- schema 到控件类型的映射；
- 默认值处理；
- `0`、`false`、空数组的值语义；
- 枚举单选和多选；
- 必填、类型、范围校验；
- 条件显示；
- `CHANGE`、`VALIDATE_RESULT` 消息构造；
- 非法消息拒绝；
- 协议版本判断。

### 13.2 集成测试

至少验证：

1. pc-tool 能加载 `/tool/dynamic-form/`；
2. iframe 能发送 `READY`；
3. 工作台能发送 `INIT`；
4. schema 和 values 能正确渲染；
5. 字段变化能返回正确的 `fieldCode` 和 value；
6. 快速切换对象时旧 revision 消息不会污染新对象；
7. iframe 高度变化能同步到宿主；
8. iframe 未来请求 `/api` 时浏览器会携带 Cookie；
9. 401 会触发 `AUTH_REQUIRED`，不会在 iframe 内嵌套登录页；
10. 主 SPA fallback 不会接管 dynamic-form 入口。

### 13.3 发布验证

发布后应使用浏览器验证：

- `/tool/dynamic-form/` 返回管理端 `index.html` 并匹配正确的 dynamic-form 路由；
- 路由懒加载的 JS/CSS chunk 可从管理端 `assets/` 正常加载；
- pc-tool iframe 加载成功；
- `READY` 和 `INIT` 完成握手；
- DevTools Network 中未来 API 请求包含 Cookie；
- 401、协议版本不兼容和资源 404 可观察。

## 14. 风险评估

| 风险                                 | 等级 | 影响                           | 控制措施                                        |
| ------------------------------------ | ---- | ------------------------------ | ----------------------------------------------- |
| 父子状态不一致                       | 高   | 字段值错写到其他对象           | 工作台单一数据源；消息携带 objectId/revision    |
| iframe 路径被主 SPA fallback 接管    | 高   | 页面白屏或加载错误应用         | 配置 `/tool/dynamic-form/` 专用 Nginx location  |
| 协议版本不兼容                       | 高   | 子应用无法初始化或字段变化丢失 | protocolVersion、READY 协商、发布前联调         |
| 同机但不同 origin 导致 Cookie 不发送 | 高   | 未来接口请求未鉴权             | 生产使用同一 host/scheme/port；API 使用相对路径 |
| dynamic-form 误持有业务状态          | 高   | 多份状态互相覆盖               | 只发送字段 patch，不保存完整业务对象            |
| 输入频繁触发大量消息                 | 中   | 性能下降、保存抖动             | 字段 patch、合理 debounce、revision 控制        |
| iframe 高度和主题不一致              | 中   | 双滚动条、视觉不一致           | `RESIZE` 消息、theme/locale 初始化参数          |
| 子应用资源发布不完整                 | 中   | chunk 404、线上白屏            | 原子发布、资源版本保留、发布后握手检查          |
| 子应用接口 401 后嵌套登录页          | 中   | 用户操作中断                   | `AUTH_REQUIRED` 交由父页面处理                  |
| 写接口缺少 CSRF 防护                 | 中   | Cookie 被滥用                  | V1 不做业务写入；后续沿用后端 CSRF 方案         |
| 动态表单字段协议漂移                 | 中   | 不同工作台渲染异常             | 使用独立 DTO 和 schemaVersion                   |

## 15. 分阶段实施建议

### 阶段一：组件和路由骨架

- 建立 `DynamicFormPanel` 普通组件和 `/tool/dynamic-form/` 隐藏路由；
- 完成主站构建和路由访问验证；
- 实现 `READY`、`INIT`、`RESIZE`、`ERROR`；
- 使用固定 schema 和 values 完成独立渲染验证。

### 阶段二：pc-tool 嵌入

- 在 pc-tool 属性区域挂载 iframe；
- 工作台传递真实 schema 和当前对象 values；
- 接收 `CHANGE` 并接入现有对象状态更新链路；
- 接入对象切换和 revision 控制。

### 阶段三：功能完整性（当前交付）

- 补齐动态控件类型；
- 补齐联动和校验；
- 同步主题、语言、只读权限和尺寸；
- 完成父子应用集成测试；
- 保留旧版独立 Demo 和构建配置，待方案验证通过后再清理。

### 阶段四：入口收敛与废弃清理（当前交付）

- 删除独立 `dynamic-form/index.html`、独立入口 `main.ts`、独立 Vite 配置及旧 Demo 页面；
- 删除 `dev:dynamic-form`、`build:dynamic-form` 构建脚本；
- pc-tool 只允许加载管理端 `/tool/dynamic-form/` 路由，不再读取旧入口或可覆盖地址；
- 保留协议、类型、校验和日期控件等可复用模块，继续由管理端组件使用。

### 阶段五：接口扩展

- 只有在业务确认需要时，才允许 dynamic-form 使用同源 `/api`；
- 复用主站 Cookie 鉴权；
- 增加 401、403、CSRF 和接口错误处理；
- 不改变工作台对业务状态和保存链路的所有权。

## 16. 待确认事项

在进入编码前，需要由产品、后端和前端共同确认：

1. 动态表单最终字段协议和 `schemaVersion`；
2. 日期、时间、枚举、多选和空值的后端存储格式；
3. V1 是否包含条件显示和联动；
4. 固定属性是否始终由工作台展示；
5. dynamic-form 是否需要主动校验，还是仅响应工作台校验请求；
6. 生产环境公共域名、Nginx/Ingress 路由和 CSP 配置；
7. 主站 Cookie 的 `Path`、`SameSite`、`Secure` 和会话失效策略；
8. 未来写接口的 CSRF 防护方式；
9. pc-tool 与 dynamic-form 的发布节奏和协议兼容策略；
10. 是否需要为未来 React 工作台保留同一协议的独立适配层。

## 17. 结论

在“工作台维护唯一业务数据、dynamic-form 只负责渲染和简单联动、两个应用一起部署并通过同一站点访问”的前提下，管理端路由 iframe 是当前较稳妥的跨框架集成方案。

该方案的核心不是把动态表单做成另一个业务系统，而是把它做成一个有明确输入输出协议的渲染子应用：

```text
工作台负责事实和业务时机
dynamic-form 负责界面和局部交互
postMessage 负责边界通信
同站点 Cookie 负责未来接口鉴权
管理端隐藏路由负责入口隔离
```

只要严格执行数据单一所有权、同源路径部署、协议版本控制和 Nginx 路由隔离，dynamic-form 可以在不依赖 pc-tool 内部 Vue 实现的情况下，为当前 Vue 工作台和未来 React 工作台提供统一的动态表单能力。
