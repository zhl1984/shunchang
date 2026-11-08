import type { InjectionKey } from "vue";
import type { RouteLocationNormalizedLoaded } from "vue-router";

/** 主布局面包屑的单个路径项。 */
export interface MainLayoutBreadcrumbPath {
  path: string;
  title: string;
}

export type MainLayoutBreadcrumbPathList = MainLayoutBreadcrumbPath[];

/** 页面基于当前路由及前后路径列表定制完整面包屑。 */
export type MainLayoutBreadcrumbCallback = (
  pathList: MainLayoutBreadcrumbPathList,
  route: RouteLocationNormalizedLoaded,
) => MainLayoutBreadcrumbPathList;

export type MainLayoutBreadcrumbSetter = (
  callback: MainLayoutBreadcrumbCallback,
) => void;

export const MAIN_LAYOUT_BREADCRUMB: InjectionKey<MainLayoutBreadcrumbSetter> =
  Symbol("main-layout-breadcrumb");
