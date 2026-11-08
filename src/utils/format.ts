import { round, toNumber } from "@/utils/lodash";
import dayjs from "dayjs";
import {
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  DATE_TIME_PARAMS_FORMAT,
  TIME_FORMAT,
} from "@/constants/date";
import { DEFAULT_EMPTY_TEXT } from "@/constants/format";

export type FormatValue = number | string | null | undefined;
export type DateFormatValue = Date | number | string | null | undefined;

const MAX_FRACTION_DIGITS = 20;
const AUTO_NUMBER_UNITS = [
  { divisor: 100_000_000, suffix: "亿" },
  { divisor: 10_000, suffix: "万" },
] as const;

/** 将数字或数字字符串转换为有限数值，无效值返回 null。 */
function getFiniteNumber(value: FormatValue): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = toNumber(value);
  return Number.isFinite(number) ? number : null;
}

/** 将小数位限制在 Intl.NumberFormat 支持的 0 到 20 范围内。 */
function normalizeFractionDigits(fractionDigits: number): number {
  return Math.min(Math.max(Math.trunc(fractionDigits), 0), MAX_FRACTION_DIGITS);
}

/** 使用 Intl.NumberFormat 格式化数字，默认输出千分位。 */
export function formatNumber(
  value: FormatValue,
  options?: Intl.NumberFormatOptions,
  locale = "zh-CN",
): string {
  const number = getFiniteNumber(value);

  return number === null
    ? DEFAULT_EMPTY_TEXT
    : new Intl.NumberFormat(locale, options).format(number);
}

/** 按指定小数位格式化数字，不添加千分位。 */
export function formatDecimal(
  value: FormatValue,
  fractionDigits = 2,
  locale = "zh-CN",
): string {
  const digits = normalizeFractionDigits(fractionDigits);

  return formatNumber(
    value,
    {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
      useGrouping: false,
    },
    locale,
  );
}

/** 将小数值转换并格式化为百分数，例如 0.125 输出 12.50%。 */
export function formatPercent(
  value: FormatValue,
  fractionDigits = 2,
  locale = "zh-CN",
): string {
  const number = getFiniteNumber(value);

  return number === null
    ? DEFAULT_EMPTY_TEXT
    : `${formatDecimal(number * 100, fractionDigits, locale)}%`;
}

/** 按指定小数位格式化数字并添加千分位。 */
export function formatThousands(
  value: FormatValue,
  fractionDigits = 2,
  locale = "zh-CN",
): string {
  const digits = normalizeFractionDigits(fractionDigits);

  return formatNumber(
    value,
    {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
      useGrouping: true,
    },
    locale,
  );
}

/** 自动转换为万或亿，并对转换后的数字应用千分位和小数位格式。 */
export function formatAutoUnit(
  value: FormatValue,
  fractionDigits = 2,
  locale = "zh-CN",
): string {
  const number = getFiniteNumber(value);

  if (number === null) {
    return DEFAULT_EMPTY_TEXT;
  }

  const unit = AUTO_NUMBER_UNITS.find(
    (item) => Math.abs(number) >= item.divisor,
  );

  return unit
    ? `${formatThousands(number / unit.divisor, fractionDigits, locale)}${unit.suffix}`
    : formatThousands(number, fractionDigits, locale);
}

/** 使用统一日期格式格式化日期时间，无效日期返回占位符。 */
export function formatDateTime(
  value: DateFormatValue,
  format: string | undefined = DATE_TIME_FORMAT,
): string {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_EMPTY_TEXT;
  }

  const date = dayjs(value);

  return date.isValid() ? date.format(format) : DEFAULT_EMPTY_TEXT;
}

/** 仅格式化年月日，无效日期返回占位符。 */
export function formatDate(value: DateFormatValue): string {
  return formatDateTime(value, DATE_FORMAT);
}

/** 按接口参数约定格式化日期时间，保留时区偏移。 */
export function formatDateTimeParams(value: DateFormatValue): string {
  return formatDateTime(value, DATE_TIME_PARAMS_FORMAT);
}

/** 仅格式化时间部分，无效值返回占位符。 */
export function formatTime(value: DateFormatValue): string {
  return formatDateTime(value, TIME_FORMAT);
}

/** 将字节数格式化为易读的文件大小。 */
export function formatFileSize(value: FormatValue, fractionDigits = 2): string {
  const bytes = getFiniteNumber(value);

  if (bytes === null || bytes < 0) {
    return DEFAULT_EMPTY_TEXT;
  }

  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const size = round(bytes / 1024 ** unitIndex, fractionDigits);

  return `${size} ${units[unitIndex]}`;
}

export const formatUtils = {
  formatAutoUnit,
  formatDate,
  formatDateTime,
  formatDateTimeParams,
  formatDecimal,
  formatFileSize,
  formatNumber,
  formatPercent,
  formatThousands,
  formatTime,
};

export type FormatUtils = typeof formatUtils;
