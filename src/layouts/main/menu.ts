import type { Component } from "vue";
import {
  AppstoreOutlined,
  BarChartOutlined,
  DeploymentUnitOutlined,
  ClusterOutlined,
  TeamOutlined,
  MenuOutlined,
} from "@ant-design/icons-vue";
import { getPermissionKeys, type MenuRoute } from "@/router/index";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import { deepEach2, deepMap, deepFilter } from "@/utils/tree";
import type { MemberInfo } from "@/api/auth";

export type MenuItem = {
  icon?: Component;
  order: number;
  path: string;
  permissionKey: string;
  title: string;
};

export type MenuGroup = {
  children: MenuGroup[];
  type: string;
  path?: string;
  permissionKey: string;
  key: string;
  icon?: Component;
  order: number;
  title: string;
};

export const menuGroupIcons: Record<string, Component> = {
  dashboard: BarChartOutlined,
  config: AppstoreOutlined,
  project: DeploymentUnitOutlined,
  member: TeamOutlined,
  "system-management": ClusterOutlined,
};

export const MENU_GROUP = "GROUP";
export const MENU_ROUTE = "ROUTE";
export const MENU_BTN = "BUTTON";

export const menuTypeMap: Map<number, string> = new Map([
  [1, MENU_GROUP],
  [2, MENU_ROUTE],
  [3, MENU_BTN],
]);

/** 将可见路由转换为按顺序排列的国际化菜单分组。 */
export function getGroupedMenus(
  menuTree: readonly MemberInfo["menuTree"][number][],
  routes: readonly MenuRoute[],
  translate: (key: string) => string,
): MenuGroup[] {
  const routeMap = new Map<string, MenuRoute>();
  routes.forEach((route) => {
    const keys = route.meta?.permissionKeys ?? [String(route.name)];
    keys.forEach((key) => {
      // 同一权限可能对应页面和详情等多个路由，菜单只绑定一个可展示入口。
      if (route.meta?.menu === true && !routeMap.has(key)) {
        routeMap.set(key, route);
      }
    });
  });

  const groupTree = deepMap(menuTree, (item, index) => {
    const route = routeMap.get(item.permissionKey);
    const type = menuTypeMap.get(item.menuType);
    const isRoute = type === MENU_ROUTE;
    return {
      type,
      path: route?.path,
      permissionKey: item.permissionKey,
      key: String(item.id),
      icon: isRoute
        ? route?.meta?.icon
        : menuGroupIcons[item.permissionKey] || MenuOutlined,
      order: index,
      title: route?.meta?.titleKey
        ? translate(route?.meta?.titleKey)
        : item.menuName,
    };
  });
  return deepFilter(groupTree, (item) =>
    Boolean(item.path || item.children?.length),
  ) as MenuGroup[];
}

/* 根据当前路由获取激活的菜单 */
export function getActiveMenuPath(
  groupTree: readonly MenuGroup[],
  route: MenuRoute | RouteLocationNormalizedLoaded,
): MenuGroup[] {
  let path: MenuGroup[] = [];
  const permissionKeys = getPermissionKeys(route);
  if (!permissionKeys.length) return path;
  let isFind = false;
  deepEach2(groupTree, (item, index, parent, depth) => {
    path = path.slice(0, depth).concat(item);
    // 代表已经找到对应权限
    if (permissionKeys.includes(item.permissionKey)) {
      isFind = true;
      return false;
    }
  });
  return isFind ? path : [];
}
