<script setup lang="ts">
import { computed, nextTick, ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons-vue";
import { storeToRefs } from "pinia";
import { i18n } from "@/locales";
import { useUserStore } from "@/stores/user";
import { useThemeStore } from "@/stores/theme";
import { getPublicImageUrl } from "@/utils/common";
import { MENU_ROUTE, getGroupedMenus, getActiveMenuPath } from "./menu.ts";
import { deepEach } from "@/utils/tree.ts";

const SIDER_WIDTH = 224;
const SIDER_COLLAPSED_WIDTH = 64;
const POPOVER_OFFSET: [number, number] = [20, 0];
const COLLAPSED_STORAGE_KEY = "main-asider-collapsed";
type MenuKey = string | number;

const route = useRoute();
const router = useRouter();
const themeStore = useThemeStore();
const userStore = useUserStore();
const { isDark } = storeToRefs(themeStore);
const { menus } = storeToRefs(userStore);
const collapsed = ref(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true");
const openGroupKeys = ref<string[]>([]);
const logoSrc = getPublicImageUrl("logo/Logo128.png");

const menuGroups = computed(() => {
  // 路由变化时重新读取路由表，确保动态注册完成后菜单立即更新。
  void route.fullPath;
  return getGroupedMenus(menus.value, router.getRoutes(), (key) =>
    i18n.global.t(key),
  );
});
const groupMap = computed(() => {
  const map = new Map();
  deepEach(menuGroups.value, (item) => {
    map.set(item.key, item);
  });
  return map;
});
const activeRouteMenuPath = computed(() =>
  getActiveMenuPath(menuGroups.value, route),
);

const selectedKeys = computed(() =>
  activeRouteMenuPath.value.map((item) => item.key),
);

/** 判断当前分组是否包含正在访问的子菜单。 */
function isGroupActive(group: (typeof menuGroups.value)[number]): boolean {
  return activeRouteMenuPath.value.some(
    (item) => item.permissionKey === group.permissionKey,
  );
}

/** 跳转到用户选择的业务菜单路由，并避免重复导航当前地址。 */
function handleMenuSelect(item: { key: string | number }) {
  const menu = groupMap.value.get(item.key);
  const path = menu?.path;

  // 分组节点的 key 不是路由地址（例如 trigger），避免被菜单事件冒泡误认为路径。
  if (!path || !path.startsWith("/")) {
    return;
  }

  if (route.path !== path) {
    void router.push(path);
  }
}

/** 点击分组时优先进入分组路由，否则进入其第一个可用子菜单。 */
function handleGroupSelect(group: (typeof menuGroups.value)[number]) {
  let targetPath = group.path;
  // 打开之后就不要执行跳转子目录
  if (collapsed.value && !targetPath) {
    targetPath = group.children[0]?.path;
  }
  if (targetPath && route.path !== targetPath) void router.push(targetPath);
}

/** 同步侧栏分组展开状态，展开模式下由用户控制显示的二级菜单。 */
function handleGroupOpenChange(keys: MenuKey[]) {
  if (!collapsed.value) {
    openGroupKeys.value = keys.map((key) => String(key));
  }
}

/** 固定在侧栏底部的用户菜单，负责退出会话并打开上传任务。 */
/* async function handleLogout() {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  try {
    await logoutApi();
    userStore.clearSession();
    await toLogin();
    clearUserRoutes();
  } catch {
    // 请求失败时保留当前会话，交由请求层展示错误提示并允许用户重试。
    return;
  } finally {
    isLoggingOut.value = false;
  }
} */

watch(collapsed, async (value) => {
  localStorage.setItem(COLLAPSED_STORAGE_KEY, String(value));
  if (!value) {
    await nextTick();
    const activeGroup = menuGroups.value.find(
      (group) => group.type !== MENU_ROUTE && isGroupActive(group),
    );
    if (activeGroup) {
      openGroupKeys.value = [...openGroupKeys.value, activeGroup.key];
    }
  }
});

onMounted(() => {
  const activeGroup = menuGroups.value.find(
    (group) => group.type !== MENU_ROUTE && isGroupActive(group),
  );
  if (activeGroup) {
    openGroupKeys.value = [activeGroup.key];
  }
});
</script>

<template>
  <a-layout-sider
    v-model:collapsed="collapsed"
    class="main-asider"
    :collapsed-width="SIDER_COLLAPSED_WIDTH"
    collapsible
    :width="SIDER_WIDTH"
  >
    <template #trigger>
      <div class="main-asider__trigger">
        <MenuUnfoldOutlined v-show="collapsed" />
        <MenuFoldOutlined v-show="!collapsed" />
      </div>
    </template>
    <div class="main-asider__logo">
      <img class="main-asider__logo-mark" :src="logoSrc" />
      <span class="main-asider__logo-title" :class="{ 'is-hidden': collapsed }">
        <p class="font-bold font-base">{{ $t("app.title") }}</p>
      </span>
    </div>

    <a-menu
      class="main-asider__menu"
      mode="inline"
      :theme="isDark ? 'dark' : 'light'"
      :selected-keys="selectedKeys"
      :open-keys="openGroupKeys"
      :inline-indent="24"
      @click="handleMenuSelect"
      @open-change="handleGroupOpenChange"
    >
      <template v-if="collapsed">
        <template v-for="group in menuGroups" :key="group.key">
          <a-popover
            v-if="group.type !== MENU_ROUTE"
            :key="group.key"
            overlay-class-name="main-asider__popover"
            placement="rightTop"
            trigger="hover"
            :arrow="false"
            :align="{ offset: POPOVER_OFFSET }"
          >
            <template #content>
              <div class="main-asider__popover-menu">
                <a-button
                  v-for="item in group.children"
                  :key="item.path"
                  type="text"
                  :class="{ 'is-active': selectedKeys.includes(item.key) }"
                  @click="handleMenuSelect({ key: item.key })"
                >
                  {{ item.title }}
                </a-button>
              </div>
            </template>
            <a-menu-item
              :class="{ 'is-active': isGroupActive(group) }"
              @click="handleGroupSelect(group)"
            >
              <template v-if="group.icon" #icon>
                <component :is="group.icon" />
              </template>
            </a-menu-item>
          </a-popover>
          <a-menu-item
            v-else
            :class="{ 'is-active': isGroupActive(group) }"
            @click="handleGroupSelect(group)"
          >
            <template v-if="group.icon" #icon>
              <component :is="group.icon" />
            </template>
          </a-menu-item>
        </template>
      </template>

      <template v-else>
        <template v-for="group in menuGroups" :key="group.key">
          <a-menu-item
            v-if="group.type === MENU_ROUTE"
            :key="group.key"
            :class="{ 'is-active': isGroupActive(group) }"
            @click="handleGroupSelect(group)"
          >
            <template v-if="group.icon" #icon
              ><component :is="group.icon" class="font-base"
            /></template>
            {{ group.title }}
          </a-menu-item>
          <a-sub-menu
            v-if="group.type !== MENU_ROUTE"
            :key="group.key"
            :class="{ 'is-active': isGroupActive(group) }"
          >
            <template v-if="group.icon" #icon>
              <component :is="group.icon" class="font-base" />
            </template>
            <template #title>
              <span @click.stop="handleGroupSelect(group)">{{
                group.title
              }}</span>
            </template>
            <a-menu-item v-for="item in group.children" :key="item.key">
              {{ item.title }}
            </a-menu-item>
          </a-sub-menu>
        </template>
      </template>
    </a-menu>
    <!-- 用户信息已移动至主布局 Header。 -->
    <!--
    <div class="main-asider__user">
      <a-popover
        overlay-class-name="main-asider__popover"
        placement="rightBottom"
        trigger="hover"
        :arrow="false"
        :align="{ offset: USER_POPOVER_OFFSET }"
      >
        <button class="main-asider__user-button" type="button">
          <a-badge
            :count="unfinishedCount"
            :offset="[-2, 2]"
            :overflow-count="99"
          >
            <a-avatar class="main-asider__avatar"
              ><template #icon><UserOutlined /></template
            ></a-avatar>
          </a-badge>
          <span v-if="!collapsed" class="main-asider__user-text"
            ><span class="font-base">{{ displayName }}</span
            ><span class="font-xs">{{ displayRole }}</span></span
          >
        </button>
        <template #content>
          <div class="main-asider__popover-menu">
            <a-button type="text" @click="handleUserSettingClick">
              {{ $t("header.user.profile") }}
            </a-button>
            <a-button type="text" @click="handleUserSettingClick">
              {{ $t("header.user.accountSettings") }}
            </a-button>
            <a-button
              v-if="unfinishedCount > 0"
              type="text"
              @click="uploadTasksOpen = true"
              >{{
                $t("header.user.uploadTasks", { count: unfinishedCount })
              }}</a-button
            >
            <div class="main-asider__popover-divider" role="separator" />
            <a-button
              type="text"
              :disabled="isLoggingOut"
              @click="handleLogout"
            >
              {{ $t("header.user.logout") }}
            </a-button>
          </div>
        </template>
      </a-popover>
    </div>
    <UploadTasksModal v-model:open="uploadTasksOpen" />
    -->
  </a-layout-sider>
</template>

<style scoped lang="less">
.main-asider {
  background-color: #fff;
  box-shadow: var(--main-layout-shadow);
  z-index: 2;

  :deep(.ant-layout-sider-children) {
    display: flex;
    min-height: 0;
    flex-direction: column;
  }

  :deep(.ant-menu-sub) {
    background-color: var(--dm-bg-layout);
  }

  :deep(.ant-menu-submenu-title),
  :deep(.ant-menu-item) {
    color: var(--dm-text);
  }

  :deep(.ant-menu-item-selected) {
    background-color: var(--dm-primary);
    color: var(--dm-text-bg);
    border-radius: 8px;
  }

  :deep(.ant-menu-item) {
    &.is-active {
      background-color: var(--dm-primary) !important;
      color: var(--dm-text-bg) !important;
    }
  }

  :deep(.ant-menu-item-icon) {
    font-size: 0.16rem;
  }

  :deep(.ant-menu-title-content) {
    font-size: 0.14rem;
  }
}

// 一级菜单
.main-asider__menu {
  :deep(& > .ant-menu-item) {
    & > .ant-menu-title-content {
      margin-inline-start: 8px;
      font-weight: 500;
    }
  }
  :deep(& > .ant-menu-submenu > .ant-menu-submenu-title) {
    & > .ant-menu-title-content {
      margin-inline-start: 8px;
      font-weight: 500;
    }
  }
  :deep(
    .ant-menu-item.ant-menu-item-selected.ant-menu-item-only-child
      > .ant-menu-title-content
  ) {
    font-weight: 600;
  }
}

.main-asider.ant-layout-sider-collapsed {
  .main-asider__logo {
    justify-content: center;
    padding-inline: 0;
    .main-asider__logo-title {
      display: none;
    }
  }

  :deep(.ant-menu-item) {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-inline: 0;
    // margin-block: 0;
    margin-inline: 0;
    width: 100%;
    .ant-menu-item-icon {
      font-size: 0.16rem;
    }

    .ant-menu-title-content {
      display: none;
    }

    &:hover {
      background-color: var(--dm-primary-bg-hover);
      color: var(--dm-primary-hover);
    }
  }
}

.main-asider__logo {
  display: flex;
  height: var(--main-header-height);
  flex: 0 0 var(--main-header-height);
  align-items: center;
  padding: 0;
  box-shadow: var(--main-layout-shadow);
  color: var(--dm-text);
  overflow: hidden;
}

.main-asider__logo-mark {
  display: flex;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  margin: 0 6px 0 6px;
  align-items: center;
  justify-content: center;
}

.main-asider__logo-title {
  min-width: 0;
  opacity: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.2s ease;
  white-space: nowrap;
}

.main-asider__logo-title.is-hidden {
  opacity: 0;
}

.main-asider__logo-subtitle {
  color: var(--dm-text-3);
}

.main-asider__menu {
  min-height: 0;
  flex: 1;
  padding: 0 12px;
  overflow-y: auto;
  border-width: 0 !important;
  background-color: #fff;
  scrollbar-width: none;
}

.main-asider__menu::-webkit-scrollbar {
  display: none;
}

.main-asider__user {
  flex: 0 0 auto;
  border-top: 1px solid var(--dm-border-2);
}
.main-asider__user-button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border: 0;
  background: transparent;
  color: var(--dm-text);
  cursor: pointer;
  text-align: left;
}
.main-asider__avatar {
  background: var(--dm-primary);
  color: var(--dm-text-bg);
}
.main-asider__user-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 1.4;
}
.main-asider__user-text span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.ant-layout-sider-trigger) {
  border-top: 1px solid var(--dm-border-2);
  background-color: var(--dm-bg-container);

  .anticon {
    color: var(--dm-text);
  }
}

.main-asider__popover-menu {
  display: flex;
  min-width: 140px;
  flex-direction: column;
  gap: 4px;
}

.main-asider__popover-menu :deep(.ant-btn) {
  justify-content: flex-start;
  text-align: left;
}

.main-asider__popover-menu .is-active {
  background-color: var(--dm-primary);
  color: var(--dm-text-bg);
}

.main-asider__popover-divider {
  height: 1px;
  margin: 4px 0;
  background-color: var(--dm-border-2);
}
.main-asider__trigger {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: right;
  padding-right: 20px;
}
.main-asider.ant-layout-sider-collapsed .main-asider__trigger {
  justify-content: center;
  padding-right: 0;
}
</style>

<style lang="less">
.main-asider__popover {
  .ant-popover-inner {
    padding: 4px 0;
  }
  .ant-popover-inner-content {
    padding: 0;
  }
  .main-asider__popover-menu .ant-btn {
    margin: 0 4px;
  }
}
</style>
