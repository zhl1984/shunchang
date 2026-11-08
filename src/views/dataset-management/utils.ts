import type { Dataset } from "@/api/dataset";
import type { DatasetDisplayRow } from "@/views/dataset-management/types";

/** 将接口集合复制为列表展示行，避免页面意外修改 Store 数据。 */
export function buildDatasetDisplayRows(
  datasets: readonly Dataset[],
): DatasetDisplayRow[] {
  return datasets.map((dataset) => ({
    ...dataset,
    // 说明允许为空，列表统一以短横线表达未填写状态。
    descriptionDisplay: dataset.description?.trim() || "-",
  }));
}

/** 按名称、说明和数据类型筛选数据集，空关键字保留全部数据。 */
export function filterDatasetRows(
  rows: readonly DatasetDisplayRow[],
  keyword: string,
): DatasetDisplayRow[] {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  // 空搜索条件表示恢复完整目录，不改变原行内容。
  if (!normalizedKeyword) return [...rows];
  return rows.filter((row) =>
    [row.name, row.description ?? "", row.dataType].some((value) =>
      value.toLocaleLowerCase().includes(normalizedKeyword),
    ),
  );
}

/** 根据当前页和每页数量截取前端分页数据。 */
export function paginateDatasetRows(
  rows: readonly DatasetDisplayRow[],
  page: number,
  pageSize: number,
): DatasetDisplayRow[] {
  // 非法页码和页大小回退到最小有效值，避免负数切片。
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;
  return rows.slice(start, start + safePageSize);
}
