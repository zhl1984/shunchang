import {
  ApartmentOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
} from "@ant-design/icons-vue";
import type { Component } from "vue";

export type RoleKey = "admin" | "manager" | "annotator" | "reviewer";
export interface RoleSummary {
  color: string;
  icon: Component;
  key: RoleKey;
}
export interface MemberRecord {
  account: string;
  email: string;
  group: string;
  id: string;
  name: string;
  phone: string;
  role: RoleKey;
  responsibility?: string;
  status: "active" | "busy";
}
export interface PermissionRecord {
  allowed: boolean;
  moduleKey: string;
  nameKey: string;
}

/** 提供与原型一致的角色摘要，成员数由当前成员列表实时计算。 */
export const roles: RoleSummary[] = [
  { key: "admin", icon: SafetyCertificateOutlined, color: "violet" },
  { key: "manager", icon: ApartmentOutlined, color: "amber" },
  { key: "annotator", icon: SolutionOutlined, color: "green" },
  { key: "reviewer", icon: CheckCircleOutlined, color: "rose" },
];

/** 提供原型画板中的只读成员数据；接口协议确定后改由 API 层获取。 */
export const members: MemberRecord[] = [
  {
    id: "m1",
    name: "孟晓",
    account: "r2-admin",
    email: "r2-admin@datamark.pro",
    phone: "138 0000 0021",
    group: "平台管理组",
    role: "admin",
    status: "active",
  },
  {
    id: "m2",
    name: "钟洁",
    account: "r2-pm",
    email: "r2-pm@datamark.pro",
    phone: "138 0000 1844",
    group: "交付管理组",
    role: "manager",
    status: "active",
  },
  {
    id: "m3",
    name: "许安",
    account: "r4-annotator",
    email: "r4-annotator@datamark.pro",
    phone: "138 0000 0889",
    group: "医学标注一组",
    role: "annotator",
    status: "busy",
  },
  {
    id: "m4",
    name: "罗航",
    account: "r4-urban-a",
    email: "r4-urban-a@datamark.pro",
    phone: "138 0000 1195",
    group: "自动驾驶标注组",
    role: "annotator",
    status: "active",
  },
  {
    id: "m5",
    name: "宋宁",
    account: "r4-thyroid-b",
    email: "r4-thyroid-b@datamark.pro",
    phone: "138 0000 1876",
    group: "医学标注二组",
    role: "annotator",
    status: "active",
  },
  {
    id: "m6",
    name: "周敏",
    account: "r5-reviewer-a",
    email: "r5-reviewer-a@datamark.pro",
    phone: "138 0000 2056",
    group: "医学质检组",
    role: "reviewer",
    status: "active",
  },
  {
    id: "m7",
    name: "顾言",
    account: "r5-reviewer-b",
    email: "r5-reviewer-b@datamark.pro",
    phone: "138 0000 2318",
    group: "驾驶质检组",
    role: "reviewer",
    status: "active",
  },
  {
    id: "m8",
    name: "方晴",
    account: "r5-reviewer-c",
    email: "r5-reviewer-c@datamark.pro",
    phone: "138 0000 2671",
    group: "综合质检组",
    role: "reviewer",
    status: "active",
  },
];

/** 添加成员时可选的工作分组，顺序与原型下拉菜单保持一致。 */
export const memberGroups = [
  "医学标注一组",
  "自动驾驶标注组",
  "核心质检组",
  "平台管理组",
  "交付管理组",
  "医学标注二组",
] as const;

export type WorkGroup = {
  description: string;
  memberIds?: string[];
  members: string[];
  name: (typeof memberGroups)[number];
  status: "active" | "inUse";
  usage: "annotation" | "quality";
};

/** 提供工作分组页签的原型展示数据，后续由分组接口替换。 */
export const workGroups: WorkGroup[] = [
  {
    name: "医学标注一组",
    usage: "annotation",
    status: "active",
    description: "承接甲状腺 B 超生产标注。",
    members: ["许安"],
  },
  {
    name: "自动驾驶标注组",
    usage: "annotation",
    status: "active",
    description: "承接相机与点云融合标注。",
    members: ["罗航"],
  },
  {
    name: "核心质检组",
    usage: "quality",
    status: "inUse",
    description: "承担医学影像与三维融合结果质检。",
    members: ["韩真", "赵珂", "李芮"],
  },
];

const permissionSeeds: Omit<PermissionRecord, "allowed">[] = [
  { nameKey: "projectManagement", moduleKey: "production" },
  { nameKey: "annotationTask", moduleKey: "production" },
  { nameKey: "qualityTask", moduleKey: "production" },
  { nameKey: "datasetManagement", moduleKey: "production" },
  { nameKey: "developmentConfig", moduleKey: "configuration" },
  { nameKey: "modelConfig", moduleKey: "configuration" },
  { nameKey: "labelManagement", moduleKey: "configuration" },
  { nameKey: "ruleCenter", moduleKey: "configuration" },
  { nameKey: "qualityPlan", moduleKey: "configuration" },
  { nameKey: "scenarioConfig", moduleKey: "configuration" },
  { nameKey: "memberManagement", moduleKey: "members" },
];

/** 根据角色返回原型中的菜单权限投影。 */
export function getPermissions(role: RoleKey): PermissionRecord[] {
  return permissionSeeds.map((item) => ({
    ...item,
    allowed:
      role === "admin" ||
      (role === "manager" &&
        ["projectManagement", "datasetManagement", "memberManagement"].includes(
          item.nameKey,
        )) ||
      (role === "annotator" && item.nameKey === "annotationTask") ||
      (role === "reviewer" && item.nameKey === "qualityTask"),
  }));
}
