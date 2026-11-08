import "vue-router";

import type { Component } from "vue";

export type AppLayout = "fullscreen" | "main";

declare module "vue-router" {
  interface RouteMeta {
    layout: AppLayout;
    contentClass?: string;
    showPath?: boolean;
    groupKey?: string;
    groupOrder?: number;
    developing?: boolean;
    icon?: Component;
    menu?: boolean;
    order?: number;
    permissionKeys?: string[];
    requiresAuth?: boolean;
    /** 详情数据加载后设置的动态页面标题，展示时优先于默认国际化标题。 */
    title?: string;
    titleKey?: string;
  }
}

export {};
