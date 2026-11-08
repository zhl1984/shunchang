/** 判断地址是否已经是可直接使用的绝对地址或协议相对地址。 */
function isAbsoluteUrl(value: string): boolean {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(value) || value.startsWith("//");
}

/**
 * 将接口返回的样本图片地址解析为可直接用于 img 的地址。
 *
 * 接口未约定 imagePath 的具体形态，按以下规则处理：
 * 绝对地址与协议相对地址原样透传，其余地址前缀接口基础路径。
 *
 * @param imagePath 接口返回的图片地址，允许为空。
 * @param baseUrl 接口基础路径，默认取环境变量，便于测试注入。
 * @returns 可直接使用的地址；空值与纯空白返回空字符串，由展示层渲染占位块。
 */
export function resolveSampleImageUrl(
  imagePath: string | null | undefined,
  baseUrl: string = import.meta.env.VITE_API_BASE_URL,
): string {
  const normalized = imagePath?.trim() ?? "";
  // 空地址无法构成有效图片，返回空字符串让调用方走占位分支。
  if (!normalized) return "";
  if (isAbsoluteUrl(normalized)) return normalized;

  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = normalized.replace(/^\/+/, "");
  // 基础路径为空时退化为站内相对地址，避免拼出多余的前导斜杠。
  return normalizedBase
    ? `${normalizedBase}/${normalizedPath}`
    : `/${normalizedPath}`;
}

/**
 * 按分页位置推导样本在数据集内的全局编号，保证跨页连续。
 *
 * @param index 样本在当前页内的下标，从 0 开始。
 * @param page 当前页码，从 1 开始。
 * @param pageSize 每页数量。
 * @returns 从 1 开始的全局编号；页码或页大小非法时按最小有效值兜底。
 */
export function buildSampleNo(
  index: number,
  page: number,
  pageSize: number,
): number {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const safeIndex = Math.max(0, index);
  return (safePage - 1) * safePageSize + safeIndex + 1;
}

/**
 * 在桌面端 4～6 列中选择末行空位最少的列数。
 *
 * @param total 样本总数；接口异常值按 0 处理。
 * @returns 建议的桌面端列数。6 条以内保持 6 列槽位，避免少量卡片被过度拉宽。
 */
export function getBalancedSampleColumnCount(total: number): number {
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  // 6 条以内沿用一行 6 列的卡片尺寸，6 条时正好铺满一行。
  if (safeTotal <= 6) return 6;

  let bestColumns = 6;
  let fewestEmptyCells = 6;
  for (let columns = 4; columns <= 6; columns += 1) {
    const emptyCells = (columns - (safeTotal % columns)) % columns;
    // 空位相同时优先更多列，在同等整齐程度下保持更紧凑的卡片尺寸。
    if (
      emptyCells < fewestEmptyCells ||
      (emptyCells === fewestEmptyCells && columns > bestColumns)
    ) {
      bestColumns = columns;
      fewestEmptyCells = emptyCells;
    }
  }
  return bestColumns;
}
