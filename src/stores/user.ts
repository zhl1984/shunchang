import { ref, shallowRef } from "vue";
import { defineStore } from "pinia";

import {
  getMemberInfoApi,
  type MemberInfo,
  type MenuTreeNode,
} from "@/api/auth";
import { LOGIN_PLATFORM } from "@/constants/storage";

export type CurrentUser = Omit<MemberInfo, "menuTree">;

/** 复制用户资料并整理菜单树，避免直接修改 API 返回对象。 */
function normalizeMemberInfo(member: MemberInfo): CurrentUser {
  const { menuTree: _menuTree, ...currentUser } = member;
  return currentUser;
}

export const useUserStore = defineStore("user", () => {
  const user = ref<CurrentUser | null>(null);
  const menus = shallowRef<MenuTreeNode[]>([]);
  let initializationPromise: Promise<void> | null = null;

  /** 用户资料为空时通过 HttpOnly Cookie 获取最新用户资料。 */
  function initialize(): Promise<void> {
    if (user.value) {
      return Promise.resolve();
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = getMemberInfoApi()
      .then((member) => {
        user.value = normalizeMemberInfo(member);
        menus.value = member.menuTree;
        window.sessionStorage.setItem(
          LOGIN_PLATFORM,
          member.roleCode === "R0" ? "2" : "1",
        );
      })
      .catch(() => {
        user.value = null;
      })
      .finally(() => {
        initializationPromise = null;
      });

    return initializationPromise;
  }

  /** 登录成功后仅更新内存用户资料，凭证由服务端 Cookie 管理。 */
  function setUser(member: MemberInfo) {
    user.value = normalizeMemberInfo(member);
    menus.value = member.menuTree;
  }

  /** 清理内存中的用户资料，不尝试读取或删除 HttpOnly Cookie。 */
  function clearSession() {
    user.value = null;
    menus.value = [];
  }

  return {
    clearSession,
    initialize,
    setUser,
    user,
    menus,
  };
});
