import type { SelectValue } from "ant-design-vue/es/select";
import type { DmFilterConfig, DmFilterOption } from "../types";

const DATE_PATTERN = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[T\s])/;
export const OPTION_NULL = "OPTION_NULL";

export type DmFilterValue =
  | SelectValue
  | { min?: number; max?: number; strict?: boolean }
  | { start?: string; end?: string; strict?: boolean };

/** 判断单条记录是否符合 dmFilter 产生的过滤条件。 */
export function matchesDmFilter(
  value: unknown,
  filter: DmFilterConfig,
  input: Array<DmFilterValue | undefined | null>,
): boolean {
  const currentInput = input[0];
  if (isEmptyFilterInput(currentInput, filter.type)) return true;
  if (filter.type === "enum") {
    return (filter.multiple ?? true)
      ? Array.isArray(currentInput) && currentInput.includes(value as never)
      : !Array.isArray(currentInput) && value === currentInput;
  }
  if (filter.type === "text")
    return String(value ?? "").includes(String(currentInput));
  if (filter.type === "number") {
    return matchesNumberRange(
      value,
      currentInput as { min?: number; max?: number; strict?: boolean },
    );
  }
  if (filter.type === "date") return isSameDate(value, currentInput);
  return matchesDateRange(
    value,
    currentInput as { start?: string; end?: string; strict?: boolean },
  );
}

/** 判断筛选输入是否为空；空值统一表示不启用筛选。 */
export function isEmptyFilterInput(
  input: unknown,
  type: DmFilterConfig["type"],
): boolean {
  if (input === undefined || input === null || input === "") return true;
  if (Array.isArray(input)) return input.length === 0;
  if (typeof input === "object") {
    const range = input as Record<string, unknown>;
    return type === "number"
      ? (range.min === undefined || range.min === "") &&
          (range.max === undefined || range.max === "")
      : (range.start === undefined || range.start === "") &&
          (range.end === undefined || range.end === "");
  }
  return false;
}

/** 判断记录值是否位于数字范围内。 */
function matchesNumberRange(
  value: unknown,
  range: { min?: number; max?: number; strict?: boolean },
): boolean {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return false;
  const strict = range.strict ?? true;
  return (
    (range.min === undefined ||
      (strict ? number >= range.min : number > range.min)) &&
    (range.max === undefined ||
      (strict ? number <= range.max : number < range.max))
  );
}

/** 提取完整日期字符串，时间值或无法识别的值不参与 date 筛选。 */
function getDateKey(value: unknown): number | undefined {
  const text = typeof value === "string" ? value : undefined;
  const match = text?.match(DATE_PATTERN);
  return match
    ? Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3])
    : undefined;
}

/** 判断记录日期与筛选日期是否为同一天。 */
function isSameDate(value: unknown, input: unknown): boolean {
  const valueDate = getDateKey(value);
  const inputDate = getDateKey(input);
  return (
    valueDate !== undefined &&
    inputDate !== undefined &&
    valueDate === inputDate
  );
}

/** 判断记录日期是否位于日期范围内。 */
function matchesDateRange(
  value: unknown,
  range: { start?: string; end?: string; strict?: boolean },
): boolean {
  const date = getDateKey(value);
  const start = getDateKey(range.start);
  const end = getDateKey(range.end);
  if (!date) return false;
  const strict = range.strict ?? true;
  return (
    (!start || (strict ? date >= start : date > start)) &&
    (!end || (strict ? date <= end : date < end))
  );
}

/** 将枚举选项转换为 a-table 原生 filters 配置。 */
export function toAntTableFilters(options: DmFilterOption[] = []) {
  return options.map((option) => ({ ...option }));
}
