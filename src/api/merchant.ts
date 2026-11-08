import http from "./http";
import { i18n } from "@/locales";

export interface Merchant {
  id: number;
  merchantName: string;
  expireDate: string;
  contact: string;
  contactWay: string;
  loginName: string;
  loginPassword: string | null;
}
export interface MerchantListQuery {
  keyword?: string;
  sortField?: string;
  ascSort?: boolean;
  pageNo: number;
  pageSize: number;
}
export interface MerchantListResult {
  pageNo: number;
  pageSize: number;
  total: number;
  list: Merchant[];
}
export type MerchantForm = Omit<Merchant, "id" | "loginPassword"> & {
  loginPassword: string;
};
interface ApiResponse<T> {
  code: string | number;
  message?: string;
  data?: T | null;
}
function ensure<T>(response: { data: ApiResponse<T> }, fallback: string): T {
  if (String(response.data.code) !== "0" || response.data.data == null)
    throw new Error(response.data.message || fallback);
  return response.data.data;
}
/** 分页查询商户列表。 */
export async function getMerchantListApi(
  query: MerchantListQuery,
): Promise<MerchantListResult> {
  const data = ensure(
    await http.get<ApiResponse<MerchantListResult>>("/merchants", {
      params: query,
    }),
    i18n.global.t("merchantManagement.feedback.loadFailed"),
  );
  return { ...data, list: data.list ?? [] };
}
/** 查询商户详情。 */
export async function getMerchantDetailApi(id: number): Promise<Merchant> {
  return ensure(
    await http.get<ApiResponse<Merchant>>(`/merchants/${id}`),
    i18n.global.t("merchantManagement.feedback.detailFailed"),
  );
}
/** 创建商户。 */
export async function createMerchantApi(params: MerchantForm): Promise<void> {
  ensure(
    await http.post<ApiResponse<unknown>>("/merchants", params),
    i18n.global.t("merchantManagement.feedback.saveFailed"),
  );
}
/** 更新商户。 */
export async function updateMerchantApi(
  id: number,
  params: MerchantForm,
): Promise<void> {
  ensure(
    await http.put<ApiResponse<unknown>>(`/merchants/${id}`, params),
    i18n.global.t("merchantManagement.feedback.saveFailed"),
  );
}
/** 删除商户。 */
export async function deleteMerchantApi(id: number): Promise<void> {
  ensure(
    await http.delete<ApiResponse<unknown>>(`/merchants/${id}`),
    i18n.global.t("merchantManagement.feedback.deleteFailed"),
  );
}
