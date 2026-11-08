# 主布局 Header 操作区实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将主布局 Header 改造为包含浅色/深色主题切换和用户退出下拉菜单的右侧操作区。

**Architecture:** 保持 `header.vue` 单组件实现，直接复用现有 theme store、user store、`logoutApi` 和 Vue Router。展示文案统一加入简体中文语言包，主布局需求文档同步记录布局、交互、异常处理和验收规则，不新增组件或依赖。

**Tech Stack:** Vue 3、TypeScript、Pinia、Vue Router、Ant Design Vue、Vue I18n、Less、Vitest

## Global Constraints

- Header 内部不拆分新的主题按钮或用户下拉子组件。
- 主题按钮只在显式 `light` 和 `dark` 模式之间切换；现有 `system` 能力继续保留给其他设置入口。
- 头像固定使用 Ant Design Vue 通用用户图标，不使用头像地址或用户名首字。
- 用户名优先取 `userName`，其次取 `loginName`；角色取 `roleName`，缺失时使用国际化兜底文案。
- 退出成功后清理 user store，并通过 `router.replace("/login")` 跳转登录页；失败时保留当前状态。
- 不新增依赖、不修改路由定义、不提交代码。

---

### Task 1: 更新主布局需求文档和国际化文案

**Files:**

- Modify: `docs/requirements/layout/main-layout.md`
- Modify: `src/locales/messages/zh-CN.ts`

**Interfaces:**

- Consumes: 已确认的 `docs/superpowers/specs/2026-08-06-main-header-actions-design.md`。
- Produces: `header.theme.switchToLight`、`header.theme.switchToDark`、`header.user.unknownName`、`header.user.unknownRole`、`header.user.logout` 国际化键。

- [ ] **Step 1: 在主布局需求文档中补充 Header 操作区规则**

在布局结构、主题与适配、接口依赖和验收标准中明确：

```markdown
- Header 移除平台标题，右侧依次展示主题切换按钮和用户信息下拉模块。
- 用户信息左侧为通用头像，右侧两行展示用户名和角色名称。
- 主题按钮只在浅色和深色间切换；当前为 `system` 时根据实际主题切换为相反的显式模式。
- 退出调用 `logoutApi`，成功后清理 user store 并替换跳转 `/login`；失败时保留当前会话。
```

- [ ] **Step 2: 增加 Header 国际化文案**

在 `src/locales/messages/zh-CN.ts` 中新增：

```ts
header: {
  theme: {
    switchToLight: "切换为浅色主题",
    switchToDark: "切换为深色主题",
  },
  user: {
    unknownName: "未知用户",
    unknownRole: "未知角色",
    logout: "退出登录",
  },
},
```

- [ ] **Step 3: 格式化并检查文档和语言包**

Run:

```powershell
yarn.cmd prettier --write docs/requirements/layout/main-layout.md src/locales/messages/zh-CN.ts
yarn.cmd prettier --check docs/requirements/layout/main-layout.md src/locales/messages/zh-CN.ts
```

Expected: 两条命令退出码均为 `0`。

### Task 2: 实现 Header 主题切换和用户下拉

**Files:**

- Modify: `src/layouts/main/header.vue`

**Interfaces:**

- Consumes: `useThemeStore().isDark`、`useThemeStore().setThemeMode(mode)`、`useUserStore().user`、`useUserStore().clearSession()`、`logoutApi()`、`router.replace("/login")` 和 Task 1 新增的国际化键。
- Produces: Header 右侧主题按钮、用户信息区和退出下拉交互；不新增 props 或 emits。

- [ ] **Step 1: 增加 Header 状态和计算属性**

在 `<script setup lang="ts">` 中引入 Vue、Pinia、Router、API、store 和图标能力，并定义：

```ts
const router = useRouter();
const themeStore = useThemeStore();
const userStore = useUserStore();
const { isDark } = storeToRefs(themeStore);
const { user } = storeToRefs(userStore);
const isLoggingOut = ref(false);

const displayName = computed(
  () =>
    user.value?.userName ||
    user.value?.loginName ||
    i18n.global.t("header.user.unknownName"),
);
const displayRole = computed(
  () => user.value?.roleName || i18n.global.t("header.user.unknownRole"),
);
const themeToggleLabel = computed(() =>
  i18n.global.t(
    isDark.value ? "header.theme.switchToLight" : "header.theme.switchToDark",
  ),
);
```

- [ ] **Step 2: 实现主题切换和退出处理函数**

新增带用途注释的方法：

```ts
/** 在 Header 中将当前实际主题切换为相反的显式主题模式。 */
function handleToggleTheme() {
  themeStore.setThemeMode(isDark.value ? "light" : "dark");
}

/** 退出当前会话，成功后清理用户状态并替换跳转到登录页。 */
async function handleLogout() {
  if (isLoggingOut.value) {
    return;
  }

  isLoggingOut.value = true;

  try {
    await logoutApi();
    userStore.clearSession();
    await router.replace("/login");
  } catch {
    // HTTP 层已统一展示请求错误，此处保留当前会话和页面即可。
  } finally {
    isLoggingOut.value = false;
  }
}
```

- [ ] **Step 3: 替换 Header 模板**

使用右对齐操作区替换现有标题：

```vue
<a-layout-header class="main-header flex items-center justify-end">
  <a-tooltip :title="themeToggleLabel">
    <a-button
      :aria-label="themeToggleLabel"
      class="main-header__theme-toggle"
      shape="circle"
      type="text"
      @click="handleToggleTheme"
    >
      <template #icon>
        <BulbFilled v-if="isDark" />
        <BulbOutlined v-else />
      </template>
    </a-button>
  </a-tooltip>

  <a-dropdown placement="bottomRight" trigger="click">
    <button class="main-header__user" type="button">
      <a-avatar class="main-header__avatar">
        <template #icon><UserOutlined /></template>
      </a-avatar>
      <span class="main-header__user-text">
        <span class="main-header__user-name">{{ displayName }}</span>
        <span class="main-header__user-role">{{ displayRole }}</span>
      </span>
    </button>
    <template #overlay>
      <a-menu>
        <a-menu-item :disabled="isLoggingOut" key="logout" @click="handleLogout">
          <LogoutOutlined />
          {{ $t("header.user.logout") }}
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</a-layout-header>
```

- [ ] **Step 4: 增加 Header 局部样式**

保留 Header 高度、边框、背景和阴影，使用像素值完成当前布局尺寸：

```less
.main-header {
  gap: 12px;
  padding: 0 20px;
  line-height: normal;

  &__theme-toggle {
    flex: 0 0 auto;
    font-size: 20px;
  }

  &__user {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--dm-text);
    cursor: pointer;
  }

  &__user:hover {
    background: var(--dm-item-hover-bg);
  }

  &__user-text {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.4;
  }

  &__user-name,
  &__user-role {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
```

悬停背景复用项目已有的 `--dm-item-hover-bg`，确保浅色和深色主题下均与现有控件状态保持一致。

- [ ] **Step 5: 运行静态检查**

Run:

```powershell
yarn.cmd prettier --write src/layouts/main/header.vue
yarn.cmd lint
yarn.cmd type-check
```

Expected: 所有命令退出码均为 `0`，没有 ESLint warning 或 TypeScript error。

### Task 3: 完整回归验证

**Files:**

- Verify: `src/layouts/main/header.vue`
- Verify: `src/locales/messages/zh-CN.ts`
- Verify: `docs/requirements/layout/main-layout.md`

**Interfaces:**

- Consumes: Task 1 和 Task 2 的最终工作区状态。
- Produces: 可交付且保持未提交的 Header 操作区改动。

- [ ] **Step 1: 运行现有测试和生产构建**

Run:

```powershell
yarn.cmd test
yarn.cmd build
```

Expected: 现有 Vitest 测试全部通过，Vite 构建退出码为 `0`；已知 legacy target 提示不作为失败。

- [ ] **Step 2: 检查格式、空白和工作区范围**

Run:

```powershell
yarn.cmd prettier --check src/layouts/main/header.vue src/locales/messages/zh-CN.ts docs/requirements/layout/main-layout.md docs/superpowers/specs/2026-08-06-main-header-actions-design.md docs/superpowers/plans/2026-08-06-main-header-actions.md
git diff --check
git status --short
```

Expected: Prettier 和 `git diff --check` 退出码为 `0`；Git 状态仅保留用户已有改动和本次 Header 相关未提交文件，不创建提交。
