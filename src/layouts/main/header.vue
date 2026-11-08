<script setup lang="ts">
import { ref } from "vue";

import {
  CloudUploadOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";

import { logoutApi } from "@/api/auth";
import { toLogin } from "@/router";
import { useUpload } from "@/composables/upload";
import { i18n } from "@/locales";
// import { useThemeStore } from "@/stores/theme";

import UploadTasksModal from "./components/UploadTasksModal.vue";

type BreadcrumbItem = { title: string; path: string };
const props = withDefaults(
  defineProps<{ pathList: BreadcrumbItem[]; showBreadcrumb?: boolean }>(),
  { showBreadcrumb: true },
);

// const themeStore = useThemeStore();
// const { isDark } = storeToRefs(themeStore);
const isLoggingOut = ref(false);
const uploadTasksOpen = ref(false);
const { unfinishedCount } = useUpload();

// 暂时隐藏头像旁的用户名称和角色描述，保留后续恢复展示所需的模板结构。
// const { user } = storeToRefs(userStore);
// const displayName = computed(
//   () =>
//     user.value?.userName ||
//     user.value?.loginName ||
//     i18n.global.t("header.user.unknownName"),
// );
// const displayRole = computed(
//   () => user.value?.roleName || i18n.global.t("header.user.unknownRole"),
// );

// const themeToggleLabel = computed(() =>
//   i18n.global.t(
//     isDark.value ? "header.theme.switchToLight" : "header.theme.switchToDark",
//   ),
// );

/** 在 Header 中将当前实际主题切换为相反的显式主题模式。 */
// function handleToggleTheme() {
//   themeStore.setThemeMode(isDark.value ? "light" : "dark");
// }

/** 退出当前会话，成功后清理用户状态并替换跳转到登录页。 */
async function handleLogout() {
  // 退出请求进行中时忽略重复操作，避免并发清理同一服务端会话。
  if (isLoggingOut.value) {
    return;
  }

  isLoggingOut.value = true;

  try {
    await logoutApi();
    await toLogin();
  } catch {
    // HTTP 层已经展示请求错误，保留当前会话和页面供用户重试。
    return;
  } finally {
    isLoggingOut.value = false;
  }
}

/** Header 中帮助与消息功能尚未开放，禁用入口避免无效交互。 */
function handleUnavailable(): void {
  message.info(i18n.global.t("header.user.comingSoon"));
}

/** 用户中心入口暂未开放，沿用侧栏原有的提示反馈。 */
function handleUserSettingClick(): void {
  message.info(i18n.global.t("header.user.comingSoon"));
}
</script>

<template>
  <a-layout-header class="main-header flex items-center">
    <a-breadcrumb v-if="props.showBreadcrumb" class="main-header__breadcrumb">
      <a-breadcrumb-item v-for="item in props.pathList" :key="item.path">
        <RouterLink :to="item.path">{{ item.title }}</RouterLink>
      </a-breadcrumb-item>
    </a-breadcrumb>
    <div class="main-header__actions">
      <a-tooltip :title="$t('header.help')">
        <a-button
          class="main-header__icon-button"
          type="text"
          :aria-label="$t('header.help')"
          @click="handleUnavailable"
        >
          <QuestionCircleOutlined />
        </a-button>
      </a-tooltip>
      <a-tooltip :title="$t('header.messages')">
        <a-button
          class="main-header__icon-button"
          type="text"
          :aria-label="$t('header.messages')"
          @click="handleUnavailable"
        >
          <BellOutlined />
        </a-button>
      </a-tooltip>
      <!-- <a-tooltip :title="themeToggleLabel">
      <a-button
        :aria-label="themeToggleLabel"
        class="main-header__theme-toggle flex-center font-xl"
        shape="circle"
        type="text"
        @click="handleToggleTheme"
      >
        <dm-icon-font :name="isDark ? 'sun' : 'moon'" />
      </a-button>
      </a-tooltip> -->

      <a-dropdown
        overlay-class-name="main-header__user-dropdown"
        placement="bottomRight"
        :trigger="['click']"
      >
        <button class="main-header__user" type="button">
          <a-badge
            :count="unfinishedCount"
            :offset="[-2, 2]"
            :overflow-count="99"
          >
            <a-avatar class="main-header__avatar">
              <template #icon>
                <UserOutlined />
              </template>
            </a-avatar>
          </a-badge>

          <!-- 暂时注释用户名称和角色文字描述。 -->
          <!--
          <span class="main-header__user-text">
            <span class="main-header__user-name font-base">{{ displayName }}</span>
            <span class="main-header__user-role font-xs">{{ displayRole }}</span>
          </span>
          -->
        </button>

        <template #overlay>
          <a-menu>
            <a-menu-item key="profile" @click="handleUserSettingClick">
              <UserOutlined />
              {{ $t("header.user.profile") }}
            </a-menu-item>
            <a-menu-item key="account-settings" @click="handleUserSettingClick">
              <SettingOutlined />
              {{ $t("header.user.accountSettings") }}
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item
              v-if="unfinishedCount > 0"
              key="upload-tasks"
              @click="uploadTasksOpen = true"
            >
              <CloudUploadOutlined />
              {{ $t("header.user.uploadTasks", { count: unfinishedCount }) }}
            </a-menu-item>
            <a-menu-item
              key="logout"
              :disabled="isLoggingOut"
              @click="handleLogout"
            >
              <LogoutOutlined />
              {{ $t("header.user.logout") }}
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>

    <UploadTasksModal v-model:open="uploadTasksOpen" />
  </a-layout-header>
</template>

<style scoped lang="less">
.main-header {
  height: var(--main-header-height);
  justify-content: flex-end;
  gap: 16px;
  padding: 0 24px;
  background-color: var(--dm-bg-container);
  box-shadow: var(--main-layout-shadow);
  line-height: normal;
  z-index: 1;

  &__theme-toggle {
    flex: 0 0 auto;
    color: var(--dm-text);
  }

  &__breadcrumb {
    margin-right: auto;
  }
  &__breadcrumb :deep(li) {
    .ant-breadcrumb-link {
      font-size: 0.14rem;
    }
    &:last-child .ant-breadcrumb-link a {
      font-weight: bold;
      color: var(--dm-text);
    }
  }
  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  &__icon-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding-inline: 6px;
    color: var(--dm-text-2);
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
    font: inherit;
    text-align: left;
    transition: background-color 0.2s ease;

    &:hover,
    &:focus-visible {
      background: var(--dm-item-hover-bg);
    }
  }

  &__avatar {
    flex: 0 0 auto;
    background: var(--dm-primary);
    color: var(--dm-text-bg);
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

  &__user-name {
    color: var(--dm-text);
    font-weight: 500;
  }

  &__user-role {
    color: var(--dm-text-3);
  }

  &__user-arrow {
    flex: 0 0 auto;
    color: var(--dm-text-3);
    font-size: 11px;
  }
}

// 浮层挂在 body，用全局选择器控制宽度，避免插入 Header 后挤动头像。
:global(.main-header__user-dropdown) {
  min-width: 180px;
}

// 在默认 8px 图标间距上再加宽 8px，与退出登录等菜单项保持一致。
:global(.main-header__user-dropdown .ant-dropdown-menu-item .anticon) {
  margin-right: 6px;
}
</style>
