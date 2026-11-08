/** 后端统一响应结构。 */
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}
