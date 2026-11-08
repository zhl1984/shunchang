# Dynamic Form iframe 第一阶段 Demo 开发方案

## 1. 文档目的

本文用于指导 `fe-management` 与 `xtreme-frontend/pc-tool` 的动态表单联调开发。阶段 4 已完成入口收敛：动态表单仅通过管理端普通组件和隐藏路由提供，pc-tool 只加载管理端 `/tool/dynamic-form/`，独立 dynamic-form 子应用入口和构建配置已删除。

## 2. 第一阶段目标

### 2.1 必须验证的内容

1. `fe-management` 通过 `/tool/dynamic-form/` 隐藏路由提供 dynamic-form，不进入主布局和菜单。
2. pc-tool 可以在标签属性区域加载 dynamic-form iframe。
3. 工作台仍然是 schema、字段值和对象上下文的唯一业务数据源。
4. iframe 能够根据当前 schema/value 渲染现有动态表单支持的全部字段类型：单选、多选、下拉、文本、数字、日期和布尔值。
5. iframe 内字段变更可以通过 `postMessage` 返回 pc-tool，并继续复用现有 `onAttChange -> update-object-user-data` 保存链路。
6. iframe 可以执行局部表单校验，并将校验结果返回宿主页面。
7. 切换对象、切换渲染模式和调整字段值时，不会因为旧 iframe 消息晚到而污染当前对象。

### 2.2 明确不包含的内容

- 保留 pc-tool 现有 `ObjectAttr`、`AttrValue`、动态表单 Mock 和保存链路作为业务兼容层；不再将旧独立 dynamic-form 子应用作为 iframe 入口。
- 不把 dynamic-form 注册到 `fe-management` 主 Router、菜单或主站权限守卫。
- 第一阶段 dynamic-form 不直接请求业务接口，不实现独立登录、鉴权和保存接口。
- 不实现生产兜底渲染、独立发布流水线、跨域部署和 React 宿主适配。

## 3. 代码组织

```text
fe-management/
├─ dynamic-form/
│  └─ index.html                    # 独立开发入口
├─ src/dynamic-form/                 # iframe 协议、类型、校验与日期控件
│  ├─ protocol.ts                   # postMessage 协议常量和类型
│  ├─ types.ts                      # schema/value 类型
│  ├─ validation.ts                 # Demo 局部校验
└─ LegacyDateTimePicker.vue         # 复用旧版日期控件样式

xtreme-frontend/pc-tool/
└─ src/components/EditClass/
   ├─ DynamicFormIframe.vue          # iframe bridge
   └─ index.vue                      # 旧版/iframe 快速切换入口
```

dynamic-form 组件使用主站现有依赖、主题变量和构建流程；iframe 页面由主站 Router 提供，不新增独立构建产物。

## 4. 渲染模式切换

pc-tool 属性面板默认使用 iframe；固定属性始终由 pc-tool 主页面渲染，动态属性区域由管理端路由中的 `DynamicFormPanel` 负责。

同时支持 URL 参数快速打开实验模式：

```text
?dynamicFormMode=legacy
```

iframe 产生的字段变更会先同步回 `state.attrs`，再调用原有 `onAttChange`，不改变后端数据格式、保存、撤销和对象切换链路。

主题由工作台在 `INIT` / `SET_CONTEXT` 上下文中显式传入 `theme: "dark" | "light"`。dynamic-form 默认使用 `dark`，不读取宿主 Store、宿主 DOM 类名或系统主题；内部直接复用管理端 Ant Design `darkAlgorithm` / `defaultAlgorithm` 与公共主题变量。日期时间弹层沿用旧版的紧凑横向布局，并在 iframe 宽度内压缩日历与时分秒列。

## 5. 通信协议

### 5.1 消息安全约束

所有消息必须同时满足以下条件才处理：

- `channel = "dynamic-form"`；
- `version = 1`；
- `event` 属于白名单；
- pc-tool 校验 `event.source === iframe.contentWindow`；
- pc-tool 根据 iframe URL 校验 `event.origin`；
- 消息携带当前 `objectId` 和 `revision`，旧对象或旧版本消息直接丢弃。

### 5.2 消息方向

| 方向              | 事件               | 用途                                |
| ----------------- | ------------------ | ----------------------------------- |
| iframe -> pc-tool | `READY`            | iframe 初始化完成，可以接收上下文   |
| pc-tool -> iframe | `INIT`             | 首次发送 schema、values、对象上下文 |
| pc-tool -> iframe | `SET_CONTEXT`      | 对象或字段值变化后刷新 iframe       |
| iframe -> pc-tool | `CHANGE`           | 返回字段 id 和新值                  |
| pc-tool -> iframe | `REQUEST_VALIDATE` | 请求 iframe 执行局部校验            |
| iframe -> pc-tool | `VALIDATE_RESULT`  | 返回校验结果和字段错误              |
| iframe -> pc-tool | `RESIZE`           | 通知内容高度，减少滚动嵌套          |
| iframe -> pc-tool | `ERROR`            | 报告协议或 schema 错误              |

值传递采用结构化数据，不传递 editor 实例、Axios 实例、Cookie 或函数。dynamic-form 只根据传入的 schema/value 渲染，并将变化事件返回宿主。

## 6. 数据流

```text
pc-tool editor.state.attrs
        │
        ├─ INIT / SET_CONTEXT ──> dynamic-form iframe
        │                              │
        │                              ├─ 根据 parent/parentValue 做简单联动
        │                              ├─ 执行必填、类型、范围、枚举校验
        │                              └─ CHANGE / VALIDATE_RESULT / RESIZE
        │
        └─ CHANGE -> state.attrs -> onAttChange
                         -> update-object-user-data
                         -> 现有保存链路
```

工作台维护唯一值源，iframe 不建立第二份业务状态。iframe 内部只保留当前渲染快照，用于控件展示和联动计算。

## 7. 启动与构建

### 7.1 本地启动

在 `fe-management` 中分别执行：

```bash
yarn dev                         # 主站，默认 http://localhost:3000
```

pc-tool 开发环境和生产环境统一加载管理端路由：`http://localhost:3000/tool/dynamic-form/` 或同源 `/tool/dynamic-form/`。

### 7.2 构建产物

```bash
yarn build                       # 主站产物 dist/
```

部署时将两个构建结果放在同一 Nginx 站点：

```text
/tool/pc/                        # pc-tool
/tool/dynamic-form/              # 管理端 SPA fallback + Vue Router 隐藏路由
/api/                            # 后端代理
```

阶段 4 起只执行主站 `yarn build`，dynamic-form 路由随主站懒加载资源一起产出。

## 8. Demo 预期效果

1. 打开 pc-tool 的对象属性区域，默认加载管理端 dynamic-form iframe。
2. iframe 直接展示与当前 Mock/schema 对应的动态表单。
3. Demo 页面显示与当前 Mock/schema 对应的全部控件，包含必填标记、单位、描述、父子字段联动和校验提示。
4. 修改字段后，pc-tool 的对象状态立即更新并继续复用原有保存链路。
5. 点击校验按钮，iframe 返回字段级错误；通过校验时返回成功状态，不触发额外保存请求。

## 9. 验收标准

- 主站菜单无 dynamic-form 路由；Router 保留隐藏 `/tool/dynamic-form/` 入口。
- pc-tool 不再引用旧独立 dynamic-form 入口；动态表单 Mock、业务属性模型和保存测试仍可独立回归。
- iframe 模式能完成全部字段类型的展示和修改。
- `theme` 未传时使用深色，显式传入 `light` 时切换为管理端浅色主题；两种主题下浮层与表单主体保持一致。
- 日期时间弹层能够正常打开，日历与时分秒列完整可见，并回传日期时间值。
- `CHANGE` 消息能够驱动现有对象属性更新；不新增另一套保存 API。
- 对象切换后，旧 iframe 的延迟消息不会更新新对象。
- 直接刷新 `/tool/dynamic-form/` 可用；`yarn build` 和 pc-tool 相关检查结果已记录。

## 10. 后续演进边界

如果未来 dynamic-form 需要请求接口，应继续使用同站点相对路径，并由浏览器自动携带主站 Cookie。Cookie 必须保持 HttpOnly、Secure、SameSite 策略；接口权限仍由后端按当前会话校验，不能把 token 通过 `postMessage` 或 URL 传给 iframe。届时需要补充接口白名单、CSRF 防护、错误回传和超时策略，本阶段不提前实现。

## 11. 第一阶段风险

- 管理端 SPA fallback 或懒加载 chunk 发布不完整时，可能出现路由白屏；验收时必须检查 `/tool/dynamic-form/` 返回主站入口且所有 `assets/` chunk 可加载。
- iframe 高度依赖 `RESIZE` 消息；消息丢失时只影响展示高度，不得影响数据保存。
- 父子窗口 origin 配置错误会导致 iframe 看似加载成功但没有数据；开发环境和生产环境必须分别验证 origin 白名单。
- schema 字段类型或值类型不符合约定时，iframe 只能返回 `ERROR`/校验错误，不应擅自修改业务数据。
- pc-tool 仍保留业务属性组件和 Mock 作为兼容层；后续如确认无需回退，再单独评估删除旧版业务渲染代码。
