import type { TablePaginationConfig, TableProps } from "ant-design-vue";
import type { SelectValue } from "ant-design-vue/es/select";
import type { ColumnType } from "ant-design-vue/es/table/interface";

export type DmTableFilterType =
  | "text"
  | "enum"
  | "number"
  | "date"
  | "dateRange";

export interface DmFilterOption {
  label: string;
  value: SelectValue;
  disabled?: boolean;
}

export interface DmFilterConfig {
  type: DmTableFilterType;
  strict?: boolean;
  options?: DmFilterOption[];
  multiple?: boolean;
}

export interface FilterForm {
  text?: string;
  enum?: string | number | Array<string | number>;
  date?: string;
  numberMin?: number;
  numberMax?: number;
  dateStart?: string;
  dateEnd?: string;
  strict?: boolean;
}

/** 在 Ant Design Vue 原生列配置上增加平台级显隐和筛选能力。 */
export interface DmTableColumn<
  RecordType extends object = Record<string, unknown>,
> extends ColumnType<RecordType> {
  visible?: boolean;
  dmFilter?: DmFilterConfig;
}

/** 组件内部使用的轻量列结构，避免 Vue 反复展开原生递归泛型。 */
export type DmTableRuntimeColumn = Record<string, unknown> & {
  key?: string | number;
  dataIndex?: string | number | readonly (string | number)[];
  visible?: boolean;
  dmFilter?: DmFilterConfig;
  filterDropdown?: unknown;
  children?: DmTableRuntimeColumn[];
};

/** 字段管理器的表格级开关和展示配置。 */
export interface DmTableColumnManagerConfig {
  title?: string;
  resettable?: boolean;
}

export type DmTableMode = "client" | "service";
// export type DmTableFilterAction = "filter" | "sort" | "paginate";
export interface DmTableQuery {
  // action: DmTableFilterAction;
  filters: Record<string, unknown>;
  sorter?: {
    field?: string;
    order?: "ascend" | "descend";
    columnKey?: string | number;
  };
  pagination: { current: number; pageSize: number };
}

export interface DmAppTableProps<
  RecordType extends object = Record<string, unknown>,
> {
  columns: DmTableColumn<RecordType>[];
  mode?: DmTableMode;
  pagination?: boolean | TablePaginationConfig;
  tableTitle?: string | false;
  columnManager?: boolean | DmTableColumnManagerConfig;
}

/** 原生 Table Props 加上平台标题、列显隐和字段管理器配置。 */
export type DmTableProps<RecordType extends object = Record<string, unknown>> =
  Omit<TableProps<RecordType>, "columns" | "pagination"> &
    DmAppTableProps<RecordType>;
