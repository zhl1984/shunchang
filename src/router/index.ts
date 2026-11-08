import {
  createRouter,
  createWebHistory,
  type Router,
  type RouteRecordNormalized,
  type RouteRecordRaw,
  type RouteLocationNormalizedLoaded,
} from "vue-router";

import type { MemberInfo } from "@/api/auth";
import { useUserStore } from "@/stores/user";
import { deepEach } from "@/utils/tree";
import {
  ApartmentOutlined,
  AppstoreAddOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  FolderOpenOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  TeamOutlined,
} from "@ant-design/icons-vue";
import { LOGIN_PLATFORM } from "@/constants/storage";

export type MenuRoute = RouteRecordRaw | RouteRecordNormalized;

const memberManagementComponent = () =>
  import("@/views/member-management/index.vue");
const modelConfigComponent = () => import("@/views/model-config/index.vue");
const developmentConfigComponent = () =>
  import("@/views/development-config/index.vue");

const businessRoutes: RouteRecordRaw[] = [
  // {
  //   path: "/workbench",
  //   name: "workbench",
  //   component: notFoundComponent,
  //   meta: {
  //     layout: "main",
  //     menu: true,
  //     requiresAuth: true,
  //     titleKey: "navigation.menus.workbench",
  //     groupKey: "navigation.groups.workspace",
  //     groupOrder: 10,
  //     order: 10,
  //     icon: AppstoreOutlined,
  //   },
  // },
  {
    path: "/project-management",
    name: "project-management",
    component: () => import("@/views/project-management/index.vue"),
    meta: {
      layout: "main",
      menu: true,
      requiresAuth: true,
      titleKey: "navigation.menus.projectManagement",
      groupKey: "navigation.groups.production",
      groupOrder: 20,
      order: 10,
      icon: FolderOpenOutlined,
    },
  },
  {
    path: "/project-management/:id",
    name: "project-detail",
    component: () => import("@/views/project-details/index.vue"),
    meta: {
      layout: "main",
      menu: false,
      permissionKeys: ["project-management"],
      requiresAuth: true,
      titleKey: "navigation.pages.projectDetail",
    },
  },
  {
    path: "/annotation-task",
    name: "annotation-task",
    component: () => import("@/views/annotation-task/index.vue"),
    meta: {
      layout: "main",
      menu: true,
      developing: false,
      requiresAuth: true,
      titleKey: "navigation.menus.annotationTask",
      groupKey: "navigation.groups.production",
      groupOrder: 20,
      order: 20,
      icon: TagsOutlined,
    },
  },
  {
    path: "/annotation-task/:id",
    name: "annotation-task-detail",
    component: () => import("@/views/annotation-task/detail/index.vue"),
    meta: {
      layout: "main",
      menu: false,
      permissionKeys: ["annotation-task"],
      requiresAuth: true,
      titleKey: "navigation.pages.annotationTaskDetail",
    },
  },
  {
    path: "/quality-task",
    name: "quality-task",
    component: () => import("@/views/quality-task/index.vue"),
    meta: {
      layout: "main",
      menu: true,
      developing: false,
      requiresAuth: true,
      titleKey: "navigation.menus.qualityTask",
      groupKey: "navigation.groups.production",
      groupOrder: 20,
      order: 30,
      icon: CheckCircleOutlined,
    },
  },
  {
    path: "/quality-task/:id",
    name: "quality-task-detail",
    component: () => import("@/views/quality-task/detail/index.vue"),
    meta: {
      layout: "main",
      menu: false,
      permissionKeys: ["quality-task"],
      requiresAuth: true,
      titleKey: "navigation.pages.qualityTaskDetail",
    },
  },
  {
    path: "/dataset-management",
    name: "dataset-management",
    component: () => import("@/views/dataset-management/index.vue"),
    meta: {
      layout: "main",
      menu: true,
      requiresAuth: true,
      titleKey: "navigation.menus.datasetManagement",
      groupKey: "navigation.groups.production",
      groupOrder: 20,
      order: 40,
      icon: DatabaseOutlined,
    },
  },
  {
    path: "/dataset-management/:id",
    name: "dataset-detail",
    component: () => import("@/views/dataset-management/detail/index.vue"),
    meta: {
      layout: "main",
      menu: false,
      // 详情页沿用列表页的权限键，否则动态注册时无法从菜单树匹配到该路由。
      permissionKeys: ["dataset-management"],
      requiresAuth: true,
      titleKey: "navigation.pages.datasetDetail",
    },
  },
  {
    path: "/development-config",
    name: "development-config",
    component: developmentConfigComponent,
    meta: {
      layout: "main",
      menu: true,
      developing: false,
      requiresAuth: true,
      titleKey: "navigation.menus.developmentConfig",
      groupKey: "navigation.groups.configuration",
      groupOrder: 30,
      order: 10,
      icon: CodeOutlined,
    },
  },
  {
    path: "/model-config",
    name: "model-config",
    component: modelConfigComponent,
    meta: {
      layout: "main",
      menu: true,
      developing: false,
      requiresAuth: true,
      titleKey: "navigation.menus.modelConfig",
      groupKey: "navigation.groups.configuration",
      groupOrder: 30,
      order: 20,
      icon: DeploymentUnitOutlined,
    },
  },
  {
    path: "/label-management",
    name: "label-management",
    component: () => import("@/views/label-management/index.vue"),
    meta: {
      layout: "main",
      menu: true,
      requiresAuth: true,
      titleKey: "navigation.menus.labelManagement",
      groupKey: "navigation.groups.configuration",
      groupOrder: 30,
      order: 30,
      icon: TagsOutlined,
    },
  },
  {
    path: "/rule-center",
    name: "rule-center",
    component: () => import("@/views/rule-center/index.vue"),
    meta: {
      layout: "main",
      menu: true,
      requiresAuth: true,
      titleKey: "navigation.menus.ruleCenter",
      groupKey: "navigation.groups.configuration",
      groupOrder: 30,
      order: 40,
      icon: CheckCircleOutlined,
    },
  },
  {
    path: "/quality-plan",
    name: "quality-plan",
    component: () => import("@/views/quality-plan/index.vue"),
    meta: {
      layout: "main",
      menu: true,
      developing: false,
      requiresAuth: true,
      titleKey: "navigation.menus.qualityPlan",
      groupKey: "navigation.groups.configuration",
      groupOrder: 30,
      order: 50,
      icon: SafetyCertificateOutlined,
    },
  },
  {
    path: "/scenario-config",
    name: "scenario-config",
    component: () => import("@/views/scenario-config/index.vue"),
    meta: {
      layout: "main",
      menu: true,
      requiresAuth: true,
      titleKey: "navigation.menus.scenarioConfig",
      groupKey: "navigation.groups.configuration",
      groupOrder: 30,
      order: 60,
      icon: ApartmentOutlined,
    },
  },
  {
    path: "/member-management",
    name: "member-management",
    component: memberManagementComponent,
    meta: {
      layout: "main",
      menu: true,
      developing: false,
      requiresAuth: true,
      titleKey: "navigation.menus.memberManagement",
      groupKey: "navigation.groups.members",
      groupOrder: 40,
      order: 10,
      icon: TeamOutlined,
    },
  },
  {
    path: "/group-management",
    name: "group-management",
    component: () => import("@/views/group-management/index.vue"),
    meta: {
      layout: "main",
      menu: true,
      developing: false,
      requiresAuth: true,
      permissionKeys: ["group-management"],
      titleKey: "navigation.menus.groupManagement",
      groupKey: "navigation.groups.members",
      groupOrder: 40,
      order: 20,
      icon: ApartmentOutlined,
    },
  },
  {
    path: "/role-management",
    name: "role-management",
    component: () => import("@/views/role-management/index.vue"),
    meta: {
      layout: "main",
      menu: true,
      developing: false,
      requiresAuth: true,
      permissionKeys: ["permission-management"],
      titleKey: "navigation.menus.roleManagement",
      groupKey: "navigation.groups.members",
      groupOrder: 40,
      order: 30,
      icon: SafetyCertificateOutlined,
    },
  },
  {
    path: "/merchant-management",
    name: "merchant-management",
    component: () => import("@/views/merchant-management/index.vue"),
    meta: {
      layout: "main",
      menu: true,
      requiresAuth: true,
      titleKey: "navigation.menus.merchantManagement",
      groupKey: "navigation.groups.merchant",
      groupOrder: 50,
      order: 10,
      icon: TeamOutlined,
    },
  },
  {
    path: "/scene-dashboard",
    name: "scene-dashboard",
    component: () => import("@/views/scene-dashboard/index.vue"),
    meta: {
      layout: "main",
      contentClass: "",
      menu: true,
      showPath: false,
      developing: false,
      requiresAuth: true,
      titleKey: "navigation.menus.sceneDashboard",
      groupKey: "navigation.groups.configuration",
      groupOrder: 30,
      order: 70,
      icon: AppstoreAddOutlined,
    },
  },
  {
    path: "/executive-dashboard",
    name: "executive-dashboard",
    component: () => import("@/views/executive-dashboard/index.vue"),
    meta: {
      layout: "main",
      contentClass: "",
      menu: true,
      showPath: false,
      developing: false,
      requiresAuth: true,
      titleKey: "navigation.menus.executiveDashboard",
      groupKey: "navigation.groups.overview",
      groupOrder: 10,
      order: 1,
      icon: BarChartOutlined,
    },
  },
];

export const router: Router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/tool/dynamic-form",
      name: "embedded-dynamic-form",
      component: () => import("@/views/dynamic-form/index.vue"),
      meta: {
        layout: "fullscreen",
        menu: false,
        requiresAuth: false,
        showPath: false,
        titleKey: "navigation.pages.dynamicForm",
      },
    },
    {
      path: "/tool/quality-comment",
      name: "embedded-quality-comment",
      component: () => import("@/views/quality-comment/index.vue"),
      meta: {
        layout: "fullscreen",
        menu: false,
        requiresAuth: false,
        showPath: false,
        titleKey: "navigation.pages.qualityComment",
      },
    },
    {
      path: "/",
      name: "home",
      component: () => import("@/layouts/main/index.vue"),
      meta: {
        layout: "main",
        menu: false,
        requiresAuth: true,
        titleKey: "navigation.pages.home",
      },
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/login/index.vue"),
      meta: {
        layout: "fullscreen",
        requiresAuth: false,
        titleKey: "navigation.pages.login",
      },
    },
    {
      path: "/admin/login",
      name: "admin-login",
      component: () => import("@/views/login/index.vue"),
      meta: {
        layout: "fullscreen",
        requiresAuth: false,
        titleKey: "navigation.pages.login",
      },
    },
    {
      path: "/404",
      name: "not-found",
      component: () => import("@/views/not-found/index.vue"),
      meta: {
        layout: "fullscreen",
        requiresAuth: false,
        titleKey: "navigation.pages.notFound",
      },
    },
    // {
    //   path: "/:pathMatch(.*)*",
    //   name: "not-found-catch-all",
    //   component: notFoundComponent,
    //   meta: {
    //     layout: "fullscreen",
    //     requiresAuth: false,
    //     titleKey: "navigation.pages.notFound",
    //   },
    // },
  ],
});

let loginRedirectPromise: Promise<void> | null = null;

/** 跳转到对应平台的登录页，并保留安全的站内返回地址。 */
export async function toLogin(toFullPath?: string): Promise<void> {
  if (loginRedirectPromise) {
    await loginRedirectPromise;
    return;
  }

  loginRedirectPromise = redirectToLogin(toFullPath);
  try {
    await loginRedirectPromise;
  } finally {
    loginRedirectPromise = null;
  }
}

/** 执行单次登录页整页跳转，供并发失效请求共享并销毁内存状态。 */
async function redirectToLogin(toFullPath?: string): Promise<void> {
  const platform = window.sessionStorage.getItem(LOGIN_PLATFORM);
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const currentRoute = router.resolve(currentPath);

  if (currentRoute.name === "login" || currentRoute.name === "admin-login") {
    return;
  }

  const loginLocation = router.resolve({
    name: platform === "2" ? "admin-login" : "login",
    query: { redirect: toFullPath || currentPath },
  });

  // 通过整页刷新重建 Vue/Pinia 实例，统一清理所有会话级 Store 缓存。
  window.location.replace(loginLocation.href);
}

export function getPermissionKeys(
  route: Pick<MenuRoute | RouteLocationNormalizedLoaded, "meta" | "name">,
): string[] {
  if (!route) return [];
  return route.meta?.permissionKeys ?? (route.name ? [String(route.name)] : []);
}

/** 根据当前用户返回允许动态注册的业务路由。 */
export function getRoutes(
  menuTree: MemberInfo["menuTree"] | null,
): RouteRecordRaw[] {
  if (!menuTree) {
    return [];
  }

  const routeMap = new Map<string, RouteRecordRaw[]>();
  businessRoutes.forEach((route) => {
    const keys = route.meta?.permissionKeys ?? [String(route.name)];
    keys.forEach((key) => {
      routeMap.set(key, (routeMap.get(key) || []).concat(route));
    });
  });
  const routes: RouteRecordRaw[] = [];
  deepEach(menuTree, (item) => {
    // 不用区分类型，只要能匹配上就视为有效
    // 所以 permissionKey 要唯一
    // 设计理由：menuType 3 设计上是button，但也可能是路由的吐口的button
    if (item.permissionKey) {
      routes.push(...(routeMap.get(item.permissionKey) ?? []));
    }
  });
  return routes;
}

/** 为当前用户幂等注册主布局的动态业务子路由。 */
export function registerUserRoutes(routes: MenuRoute[]): boolean {
  let routesAdded = false;
  const permittedRouteNames = new Set(
    routes.flatMap((route) => (route.name ? [String(route.name)] : [])),
  );

  // 同一页面切换账号时移除上一角色的路由，侧栏会随路由表同步更新。
  businessRoutes.forEach((route) => {
    const routeName = route.name ? String(route.name) : "";
    if (
      routeName &&
      router.hasRoute(routeName) &&
      !permittedRouteNames.has(routeName)
    ) {
      router.removeRoute(routeName);
    }
  });

  routes.forEach((route) => {
    // 路由名称是动态注册的稳定标识，避免重复导航时重复添加。
    if (route.name && !router.hasRoute(route.name)) {
      router.addRoute("home", route);
      routesAdded = true;
    }
  });

  return routesAdded;
}

/** 清空所有动态业务路由，供退出登录和会话失效时隔离用户权限。 */
export function clearUserRoutes(): void {
  businessRoutes.forEach((route) => {
    if (route.name && router.hasRoute(route.name)) {
      router.removeRoute(route.name);
    }
  });
}

router.beforeEach(async (to) => {
  const userStore = useUserStore();

  // 公共页面无需探测用户会话，避免每次访问登录页或 404 都请求用户信息。
  const requiresAuth = to.meta.requiresAuth ?? true;
  if (!requiresAuth) {
    return true;
  }

  await userStore.initialize();

  if (!userStore.user) {
    return toLogin(to.fullPath);
  }

  const currentRoutes = getRoutes(userStore.menus);
  const routesAdded = registerUserRoutes(currentRoutes);

  // 动态路由加入后重新解析原地址，使首次直达业务地址可以匹配新路由。
  if (routesAdded) {
    return { path: to.fullPath, replace: true };
  }

  // 根路径没有实际页面，进入当前用户有权限的第一个菜单。
  const firstMenuPath = currentRoutes.find(
    (route) => route.meta?.menu === true,
  )?.path;

  // 根路径没有实际页面，进入当前用户有权限的第一个菜单。
  // 如果找不到也兜底去第一个菜单吧。
  if (firstMenuPath && (to.path === "/" || !to.matched.length)) {
    return { path: firstMenuPath, replace: true };
  }

  // 动态路由处理完成后仍没有匹配记录，才确认目标地址不存在。
  if (!to.matched.length) {
    return {
      path: "/404",
      query: { from: to.fullPath },
      replace: true,
    };
  }

  return true;
});
