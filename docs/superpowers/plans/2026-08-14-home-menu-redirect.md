# 首页首个业务菜单重定向 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 登录用户访问根路由 `/` 时，自动替换导航到其有权限访问且按侧边栏展示顺序排在第一位的业务菜单。

**Architecture:** 在路由模块新增无副作用的 `getFirstMenuPath`，只负责过滤并按 `groupOrder`、`order` 选择首个菜单。前置守卫在完成用户初始化和动态路由注册后，仅对根路由调用该函数并返回替换导航目标。

**Tech Stack:** Vue 3、TypeScript、Vue Router 4、Vitest、Yarn 4

## Global Constraints

- 只修改主项目 `D:\Project\fe-management`，不在 Codex worktree 保留实现改动。
- 不新增依赖，不修改权限接口和菜单组件。
- 用户决定 Git 提交，本计划不执行 `git add` 或 `git commit`。
- 新增方法添加用途注释，条件分支说明没有菜单时保留根路由的原因。
- 修改前同步更新 `docs/requirements/navigation/dynamic-menu.md`。

---

### Task 1: 根路由首菜单重定向

**Files:**

- Modify: `docs/requirements/navigation/dynamic-menu.md`
- Modify: `src/router/index.test.ts`
- Modify: `src/router/index.ts`

**Interfaces:**

- Consumes: `getRoutesForUser(user: MemberInfo | null): RouteRecordRaw[]`
- Produces: `getFirstMenuPath(routes: readonly MenuRoute[]): string`

- [ ] **Step 1: 同步需求文档**

在交互规则中增加：登录用户访问 `/` 时，按 `groupOrder`、`order` 的侧边栏最终顺序进入第一个有权限的菜单；没有菜单时保留 `/`。在验收标准中增加相同可验证结果。

- [ ] **Step 2: 写入失败测试**

在 `src/router/index.test.ts` 导入 `getFirstMenuPath`，增加以下测试：

```ts
describe("getFirstMenuPath", () => {
  it("returns the first visible menu in group and item order", () => {
    expect(
      getFirstMenuPath([
        {
          path: "/later-group",
          meta: {
            layout: "main",
            menu: true,
            groupOrder: 20,
            order: 10,
          },
        },
        {
          path: "/detail/1",
          meta: { layout: "main", menu: false },
        },
        {
          path: "/first-menu",
          meta: {
            layout: "main",
            menu: true,
            groupOrder: 10,
            order: 20,
          },
        },
      ]),
    ).toBe("/first-menu");
  });

  it("returns an empty path when no visible menu is available", () => {
    expect(
      getFirstMenuPath([
        {
          path: "/detail/1",
          meta: { layout: "main", menu: false },
        },
      ]),
    ).toBe("");
  });
});
```

- [ ] **Step 3: 运行测试并确认 RED**

Run: `yarn test src/router/index.test.ts`

Expected: FAIL，提示 `getFirstMenuPath` 尚未从 `@/router` 导出。

- [ ] **Step 4: 实现纯函数**

在 `src/router/index.ts` 中增加：

```ts
/** 按侧边栏最终展示顺序返回首个可访问业务菜单路径。 */
export function getFirstMenuPath(routes: readonly MenuRoute[]): string {
  return (
    [...routes]
      .filter(
        (route) => route.meta?.layout === "main" && route.meta.menu === true,
      )
      .sort((left, right) => {
        const groupOrder =
          (left.meta?.groupOrder ?? 0) - (right.meta?.groupOrder ?? 0);

        return groupOrder || (left.meta?.order ?? 0) - (right.meta?.order ?? 0);
      })[0]?.path ?? ""
  );
}
```

- [ ] **Step 5: 接入前置守卫**

将动态路由注册结果保存为局部变量，先保持现有重解析行为；注册稳定后，仅在 `to.name === "home"` 时计算目标路径：

```ts
const routesAdded = registerUserRoutes(userStore.user);
const dynamicNavigationTarget = getDynamicRouteNavigationTarget(
  to,
  routesAdded,
);

if (dynamicNavigationTarget !== true) {
  return dynamicNavigationTarget;
}

if (to.name === "home" && userStore.user) {
  const firstMenuPath = getFirstMenuPath(getRoutesForUser(userStore.user));

  // 没有任何有权限菜单时保留主布局，避免根路由循环重定向。
  if (firstMenuPath) {
    return { path: firstMenuPath, replace: true };
  }
}

return true;
```

- [ ] **Step 6: 运行目标测试并确认 GREEN**

Run: `yarn test src/router/index.test.ts`

Expected: PASS，路由测试全部通过。

- [ ] **Step 7: 执行完整验证**

Run:

```powershell
yarn type-check
yarn lint
yarn format:check
yarn test
git diff --check
```

Expected: 所有命令退出码为 `0`。如仓库存在与本次改动无关的历史失败，记录具体命令与错误，不修改无关代码。
