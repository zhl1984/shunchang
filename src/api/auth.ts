import http from "./http";

import type { ApiResponse } from "@/types/api";

export type LoginPayload = {
  loginName: string;
  loginPassword: string;
  platform?: number;
};

export type LoginResult = {
  user?: MemberInfo;
};

export type MemberRoleCode = string;

export type MenuTreeNode = {
  id: number;
  parentId: number;
  menuName: string;
  menuType: number;
  permissionKey: string;
  children: MenuTreeNode[];
};

export type MemberInfo = {
  id: number;
  loginName: string;
  userName: string;
  phone?: string | null;
  email?: string | null;
  roleId: number;
  roleCode: MemberRoleCode;
  roleName: string;
  workGroupId: number | null;
  workGroupName: string | null;
  jobDescription: string | null;
  menuTree: MenuTreeNode[];
};

const AUTH_API = {
  login: "/auth/login",
  info: "/users/me",
  logout: "/auth/logout",
} as const;

/** 使用账号和密码登录，由服务端写入 HttpOnly Cookie 并返回可选用户资料。 */
export async function loginApi(data: LoginPayload): Promise<LoginResult> {
  const response = await http.post<ApiResponse<LoginResult>>(
    AUTH_API.login,
    data,
    {
      skipAuth: true,
    },
  );
  const result = response.data;
  if (result.code !== "0") {
    throw new Error(result.message);
  }
  return result.data ?? {};
}

/** 获取当前登录用户的完整资料。 */
export async function getMemberInfoApi(): Promise<MemberInfo> {
  const response = await http.get<ApiResponse<MemberInfo>>(AUTH_API.info, {
    skipError: true,
  });
  return response.data.data;
}

/** 退出当前登录会话。 */
export async function logoutApi(): Promise<void> {
  await http.delete<null>(AUTH_API.logout);
}
