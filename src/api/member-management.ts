import http from "./http";
import type { AxiosResponse } from "axios";

/** OpenAPI 统一响应包装，业务数据位于 data 字段。 */
export interface MemberApiResponse<T> {
  code: string;
  data: T;
  message: string;
}

export type MemberRoleCode = "R1" | "R2" | "R3" | "R4" | string;
export type WorkGroupType = "ANNOTATION" | "QUALITY";

export interface MemberListParams {
  keyword?: string;
  pageNo?: number;
  pageSize?: number;
  roleId?: number;
  workGroupId?: number;
  sortField?: string;
  sortOrder?: "ascend" | "descend";
}

export interface MemberRecordDto {
  createdAt?: string;
  email: string;
  id: number;
  jobDescription?: string;
  lastLoginAt?: string;
  loginName: string;
  phone: string;
  roleCode: MemberRoleCode;
  roleId: number;
  roleName: string;
  userName: string;
  workGroupId: number | null;
  workGroupName: string | null;
}

export interface MemberStatistics {
  annotatorNum: number;
  projectManagerNum: number;
  qualityInspectorNum: number;
  systemAdminNum: number;
  totalMemberNum: number;
}

export interface MemberListData {
  list: MemberRecordDto[];
  pageNo: number;
  pageSize: number;
  stat: MemberStatistics;
  total: number;
}

export interface CreateMemberInput {
  email: string;
  jobDescription?: string;
  loginName: string;
  loginPassword: string;
  phone?: string;
  roleId: number;
  userName: string;
  workGroupId?: number;
}

export interface RoleDto {
  createdAt?: string;
  description?: string;
  id: number;
  roleCode: MemberRoleCode;
  roleName: string;
  userCount?: number;
}

export interface RoleMenuNode {
  children: RoleMenuNode[];
  id: number;
  menuName: string;
  menuType: number;
  parentId: number;
  permissionKey: string;
}

export interface RolePermissionsDto extends RoleDto {
  menuTree: RoleMenuNode[];
}

export interface WorkGroupMemberDto {
  id: number;
  roleName: string;
  userName: string;
}

export interface WorkGroupDto {
  createdAt?: string;
  description?: string;
  groupName: string;
  groupType: WorkGroupType;
  id: number;
  memberCount: number;
  members: WorkGroupMemberDto[];
}

export interface WorkGroupListParams {
  groupType?: WorkGroupType;
  keyword?: string;
}

export interface CreateWorkGroupInput {
  description?: string;
  groupName: string;
  groupType: WorkGroupType;
}

export interface UpdateWorkGroupInput extends CreateWorkGroupInput {
  memberIds?: number[];
}

const MEMBER_API = {
  list: "/members",
  roles: "/roles",
  workGroups: "/work-groups",
} as const;

/** 从统一响应中提取业务数据，避免页面依赖后端包装结构。 */
function unwrap<T>(response: MemberApiResponse<T>): T {
  return response.data;
}

/** 校验成员管理写接口的业务状态，400 时透传后端 message。 */
function unwrapMutation<T>(response: AxiosResponse<MemberApiResponse<T>>): T {
  const payload = response.data;
  if (response.status === 400 || String(payload.code) === "400") {
    throw new Error(payload.message || "请求处理失败");
  }
  return unwrap(payload);
}

/** 分页查询成员，支持关键字、角色和分页条件。 */
export async function getMemberListApi(
  params: MemberListParams = {},
): Promise<MemberListData> {
  const response = await http.get<MemberApiResponse<MemberListData>>(
    MEMBER_API.list,
    { params },
  );
  return unwrap(response.data);
}

/** 创建成员；可选工作分组通过 workGroupId 传递所属分组。 */
export async function createMemberApi(
  data: CreateMemberInput,
): Promise<MemberRecordDto> {
  const response = await http.post<MemberApiResponse<MemberRecordDto>>(
    MEMBER_API.list,
    data,
  );
  return unwrapMutation(response);
}

/** 查询全部角色，为角色卡片和成员表单提供后端角色 ID。 */
export async function getRoleListApi(): Promise<RoleDto[]> {
  const response = await http.get<MemberApiResponse<RoleDto[]>>(
    MEMBER_API.roles,
  );
  return unwrap(response.data);
}

/** 查询指定角色的菜单权限树。 */
export async function getRolePermissionsApi(
  roleId: number,
): Promise<RolePermissionsDto> {
  const response = await http.get<MemberApiResponse<RolePermissionsDto>>(
    `${MEMBER_API.roles}/${roleId}/permissions`,
  );
  return unwrap(response.data);
}

/** 按名称关键字和用途查询工作分组列表。 */
export async function getWorkGroupListApi(
  params: WorkGroupListParams = {},
): Promise<WorkGroupDto[]> {
  const response = await http.get<MemberApiResponse<WorkGroupDto[]>>(
    MEMBER_API.workGroups,
    { params },
  );
  const payload = unwrap(response.data);
  // 后端部分环境将列表包装为 { list }，统一转换为数组供页面使用。
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "list" in payload) {
    const list = (payload as { list?: unknown }).list;
    return Array.isArray(list) ? (list as WorkGroupDto[]) : [];
  }
  return [];
}

/** 创建工作分组。 */
export async function createWorkGroupApi(
  data: CreateWorkGroupInput,
): Promise<WorkGroupDto> {
  const response = await http.post<MemberApiResponse<WorkGroupDto>>(
    MEMBER_API.workGroups,
    data,
  );
  return unwrapMutation(response);
}

/** 查询指定工作分组详情。 */
export async function getWorkGroupDetailApi(
  groupId: number,
): Promise<WorkGroupDto> {
  const response = await http.get<MemberApiResponse<WorkGroupDto>>(
    `${MEMBER_API.workGroups}/${groupId}`,
  );
  return unwrap(response.data);
}

/** 编辑工作分组基础信息及完整成员集合。 */
export async function updateWorkGroupApi(
  groupId: number,
  data: UpdateWorkGroupInput,
): Promise<WorkGroupDto> {
  const response = await http.put<MemberApiResponse<WorkGroupDto>>(
    `${MEMBER_API.workGroups}/${groupId}`,
    data,
  );
  return unwrapMutation(response);
}

/** 删除工作分组；存在有效成员时由后端拒绝删除。 */
export async function deleteWorkGroupApi(groupId: number): Promise<void> {
  const response = await http.delete<MemberApiResponse<null>>(
    `${MEMBER_API.workGroups}/${groupId}`,
  );
  unwrapMutation(response);
}
