# 会话存储需求

## 功能目标

使用服务端 HttpOnly Cookie 保存登录凭证，前端仅在 Pinia 内存中维护当前用户资料和会话状态。

## 使用场景

- 登录成功后，浏览器自动保存服务端设置的 Cookie。
- 页面刷新或重新打开应用时，通过用户信息接口重新确认会话并获取最新资料。
- 退出或会话失效时清理前端内存状态，Cookie 的删除由服务端接口负责。

## 交互规则

- Axios 实例必须启用 `withCredentials`，使跨域请求携带 Cookie。
- 用户信息接口使用 `{ code, message, data }` 统一响应结构，API 层负责解包 `data`，Store 和页面不得直接依赖响应信封。
- 用户资料使用后端返回的 `id`、账号、姓名、联系方式、角色、工作组、岗位描述和菜单树结构；工作组字段允许为空。
- 菜单树节点包含 `id`、`parentId`、`menuName`、`menuType`、`permissionKey` 和递归 `children`。
- 前端不得读取、写入或删除 Token 和用户资料 localStorage 项。
- 首次用户资料探测得到 401 时视为未登录，不显示重复的全局错误弹框。

## 验收标准

- 登录、刷新和路由守卫流程均使用 Cookie 会话。
- `src/stores/user.ts` 不访问 Web Storage。
- 路由守卫仅根据内存中的 `MemberInfo` 是否存在判断登录状态；为空时先请求用户资料。
- 用户资料刷新后来自接口最新响应，而非历史缓存。
- user store 保存解包后的完整用户资料，不保存统一响应结构中的 `code` 和 `message`。
