<script
  setup
  lang="ts"
  generic="RecordType extends object = Record<string, unknown>"
>
import { computed, h, ref, useAttrs, useSlots, watch } from "vue";
import { useI18n } from "vue-i18n";
import ATable from "ant-design-vue/es/table";
import AEmpty from "ant-design-vue/es/empty";
import ColumnManager from "./ColumnManager.vue";
import utils from "@/utils";
import { deepMap } from "@/utils/tree";
import type { TableProps, TablePaginationConfig } from "ant-design-vue";
import type {
  DmAppTableProps,
  DmTableColumn,
  DmTableQuery,
  DmTableProps,
  DmTableRuntimeColumn,
} from "./types";
import DmFilterDropdown from "./filters/DmFilterDropdown.vue";
import {
  matchesDmFilter,
  isEmptyFilterInput,
  OPTION_NULL,
  type DmFilterValue,
} from "./utils/dm-filter.ts";
import { TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "@/constants/table.ts";

// 全局注册器会统一增加 Dm 前缀，因此组件自身只声明业务名称。
defineOptions({ name: "AppTable", inheritAttrs: false });

const props = withDefaults(defineProps<DmTableProps<RecordType>>(), {
  tableTitle: false,
  pagination: true,
  columnManager: true,
  // Vue 会把缺省 Boolean Prop 解析为 false，这里恢复 a-table 的原生默认值。
  showHeader: true,
  mode: "client",
});

const { t } = useI18n();
const attrs = useAttrs();
const slots = useSlots();
const initialPagination =
  props.pagination && typeof props.pagination === "object"
    ? props.pagination
    : undefined;
const appTablePropsKeys = [
  "columns",
  "mode",
  "pagination",
  "tableTitle",
  "columnManager",
] as const satisfies ReadonlyArray<keyof DmAppTableProps>;
const deprecatedATableProps = [
  "onChange",
  "onFilter",
  "onSort",
  "onPageChange",
  "onPaginationChange",
] as const;
const currentColumns = ref<DmTableRuntimeColumn[]>([]);
const currentDataSource = ref<RecordType[]>([]);
const displaySourceData = ref<RecordType[]>([]);
const query = ref<DmTableQuery>({
  filters: {},
  sorter: {},
  pagination: {
    current: initialPagination?.current ?? 1,
    pageSize: initialPagination?.pageSize ?? TABLE_PAGE_SIZE,
  },
});
const filterConfigMap = ref(new Map());

/** 受控分页变化时同步内部查询状态，避免外部重置页码后控件仍停留在旧页。 */
watch(
  () => props.pagination,
  (pagination) => {
    if (!pagination || typeof pagination !== "object") return;
    query.value.pagination = {
      current: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? query.value.pagination.pageSize,
    };
  },
  { deep: true },
);

/** 默认让表体使用容器剩余高度滚动，同时保留调用方的横向滚动配置。 */
const resolvedScroll = computed<TableProps["scroll"]>(() => ({
  ...props.scroll,
  y: props.scroll?.y ?? "100%",
}));

/** 仅补充分页默认值，调用方显式传入的配置和回调保持优先。 */
const resolvedPagination = computed<false | TablePaginationConfig>(() => {
  if (props.pagination === false) {
    return false;
  }

  // Vue 的布尔属性推断可能产生 true；原生 a-table 中 true 等价于默认配置。
  const pagination: TablePaginationConfig =
    props.pagination && typeof props.pagination === "object"
      ? props.pagination
      : {};
  const defaultShowTotal = (total: number, range: [number, number]): string =>
    t("ruleCenter.pagination", {
      start: range[0],
      end: range[1],
      total,
    });

  return {
    ...pagination,
    current: pagination.current ?? 1,
    pageSize: pagination.pageSize ?? TABLE_PAGE_SIZE,
    total:
      props.mode === "client"
        ? currentDataSource.value.length
        : pagination.total,
    showSizeChanger: pagination.showSizeChanger ?? true,
    pageSizeOptions: pagination.pageSizeOptions ?? TABLE_PAGE_SIZE_OPTIONS,
    showTotal: pagination.showTotal ?? defaultShowTotal,
  } satisfies TablePaginationConfig;
});

/** 递归把所有叶子列的 dmFilter 转换成 a-table 原生过滤配置。 */
const resolvedColumns = computed(() => {
  filterConfigMap.value.clear();
  const columnKeys = new Set<string>();
  return deepMap<DmTableRuntimeColumn, DmTableRuntimeColumn>(
    props.columns as unknown as DmTableRuntimeColumn[],
    (column) => {
      let rawKey = column.key;
      if (rawKey === null || rawKey === undefined) {
        const dataIndex = column.dataIndex;
        if (Array.isArray(dataIndex)) {
          rawKey = JSON.stringify(dataIndex);
        } else if (
          typeof dataIndex === "string" ||
          typeof dataIndex === "number"
        ) {
          rawKey = dataIndex;
        }
      }
      if (props.columnManager && import.meta.env.DEV) {
        if (rawKey === undefined || rawKey === null || String(rawKey) === "") {
          throw new Error(
            `ColumnManager requires a unique key or dataIndex. Column: ${JSON.stringify(column)}`,
          );
        }
        const normalizedKey = String(rawKey);
        if (columnKeys.has(normalizedKey)) {
          throw new Error(
            `ColumnManager found duplicate column key "${normalizedKey}". Column: ${JSON.stringify(column)}`,
          );
        }
        columnKeys.add(normalizedKey);
      }
      const normalizedColumn =
        rawKey === undefined ? column : { ...column, key: rawKey };
      if (
        normalizedColumn.children?.length ||
        !normalizedColumn.dmFilter ||
        normalizedColumn.filterDropdown
      ) {
        return { ...normalizedColumn, filteredValue: undefined };
      }
      const dmFilter = { ...normalizedColumn.dmFilter };
      filterConfigMap.value.set(rawKey, normalizedColumn);
      if (props.mode === "client" && dmFilter.type === "enum") {
        if (!dmFilter.options?.length) {
          const allUniqueValues = Array.from(
            new Set(
              normalizedColumn.dataIndex === undefined
                ? []
                : (props.dataSource ?? []).map((record) =>
                    getRecordValue(record, normalizedColumn.dataIndex!),
                  ),
            ),
          );
          const withoutNullValues = allUniqueValues.filter(
            (value): value is string | number =>
              (typeof value === "string" && value.length > 0) ||
              typeof value === "number",
          );
          dmFilter.options = withoutNullValues.map((value) => ({
            value,
            label: String(value),
          }));
          if (allUniqueValues.length > withoutNullValues.length) {
            dmFilter.options.unshift({
              value: OPTION_NULL,
              label: t("components.table.filter.emptyOption"),
            });
          }
        }
      }

      return {
        ...normalizedColumn,
        dmFilter: dmFilter,
        filterDropdown: (scope: Record<string, unknown>) =>
          h(DmFilterDropdown, {
            config: dmFilter,
            ...scope,
          }),
      };
    },
  );
});

/** `$attrs` 主要承载未声明属性和原生事件监听器，必须继续透传。 */
/** 将查询状态映射为 a-table 列的受控过滤与排序属性。 */
function syncQueryToColumns(
  columns: DmTableRuntimeColumn[],
): DmTableRuntimeColumn[] {
  const sorter = query.value.sorter;
  const sorterKey = String(sorter?.field ?? sorter?.columnKey ?? "");
  return deepMap<DmTableRuntimeColumn, DmTableRuntimeColumn>(
    columns,
    (column) => {
      const columnKey = String(column.key ?? column.dataIndex ?? "");
      const filterValue = query.value.filters[columnKey];
      const filterType = column.dmFilter?.type;
      return {
        ...column,
        filteredValue:
          filterValue === undefined ||
          (filterType && isEmptyFilterInput(filterValue, filterType))
            ? undefined
            : Array.isArray(filterValue)
              ? filterValue
              : [filterValue],
        sortOrder:
          sorterKey === columnKey ||
          sorterKey === String(column.dataIndex ?? "")
            ? sorter?.order
            : undefined,
      };
    },
  );
}

/** 将查询状态中的当前页和页大小同步到 a-table 分页配置。 */
function syncQueryToPagination(
  pagination: false | TablePaginationConfig,
): false | TablePaginationConfig {
  if (pagination === false) return false;
  return {
    ...pagination,
    current: query.value.pagination.current,
    pageSize: query.value.pagination.pageSize,
  };
}

const mergedTableProps = computed<Partial<TableProps>>(() => {
  /** 过滤平台自有 Props，保留所有原生 Table Props 交给 a-table。 */
  const forwarded = { ...props, ...attrs } as Partial<TableProps> &
    Record<string, unknown>;
  // 去掉不需要的属性
  const keys = [...appTablePropsKeys, ...deprecatedATableProps];
  keys.forEach((key) => {
    delete forwarded[key];
  });
  return {
    ...forwarded,
    // 如果关闭了字段管理功能，columnManager组件就无法同步数据，就需要用原始数据
    columns: syncQueryToColumns(
      props.columnManager ? currentColumns.value : resolvedColumns.value,
    ),
    dataSource: displaySourceData.value,
    pagination: syncQueryToPagination(resolvedPagination.value),
    scroll: resolvedScroll.value,
    tableLayout: forwarded.tableLayout ?? "fixed",
    onChange: handleTableChange,
  } as Partial<TableProps>;
});

const forwardedSlotNames = computed(() =>
  Object.keys(slots).filter(
    (slotName) => slotName !== "titleTool" && slotName !== "emptyText",
  ),
);

/** 统一接管表格查询事件，避免外部同时使用 Ant Table 原生事件。 */
function handleTableChange(
  pagination: TablePaginationConfig,
  filters: Record<string, unknown>,
  sorter: unknown,
): void {
  query.value = {
    filters,
    sorter: normalizeSorter(sorter),
    pagination: {
      current: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? query.value.pagination.pageSize,
    },
  };
  onFilter();
}

/** 将 Ant Table 的单列或多列排序结果统一为当前查询使用的排序项。 */
function normalizeSorter(sorter: unknown): DmTableQuery["sorter"] {
  const candidate = Array.isArray(sorter)
    ? sorter.find((item) => item && typeof item === "object" && "order" in item)
    : sorter;
  if (!candidate || typeof candidate !== "object") return {};
  const value = candidate as Record<string, unknown>;
  return {
    field:
      typeof value.field === "string"
        ? value.field
        : typeof value.columnKey === "string"
          ? value.columnKey
          : undefined,
    order:
      value.order === "ascend" || value.order === "descend"
        ? value.order
        : undefined,
    columnKey:
      typeof value.columnKey === "string" || typeof value.columnKey === "number"
        ? value.columnKey
        : undefined,
  };
}

/** 根据来源更新查询状态；client 模式由 computed 本地处理，service 模式仅向外通知。 */
function onFilter(queryValue: DmTableQuery = query.value): void {
  const { filters, sorter, pagination } = queryValue;
  if (props.mode === "client") {
    // 条件过滤
    let dataSource = handleFilter(props.dataSource ?? [], filters);
    // 排序
    dataSource = handleSort(dataSource, sorter);
    currentDataSource.value = dataSource;
    // 分页
    displaySourceData.value = handlePage(dataSource, pagination);
  } else {
    // 外部处理
    emit("filter", queryValue);
  }
}

/* 根据规则过滤数据 */
function handleFilter(
  data: RecordType[],
  filters: Record<string, unknown>,
): RecordType[] {
  const filterRules = Object.entries(filters).reduce<
    Array<{
      dataIndex: string;
      config: NonNullable<ReturnType<typeof filterConfigMap.value.get>>;
      value: DmFilterValue[];
    }>
  >((s, [key, value]) => {
    const { dataIndex, dmFilter } = filterConfigMap.value.get(key);
    if (dmFilter && !isEmptyFilterInput(value, dmFilter)) {
      return s.concat([
        { dataIndex, config: dmFilter, value: value as DmFilterValue[] },
      ]);
    }
    return s;
  }, []);
  if (filterRules.length) {
    return data.filter((item) =>
      filterRules.every(({ dataIndex, config, value }) =>
        matchesDmFilter(getRecordValue(item, dataIndex), config, value),
      ),
    );
  }
  return data;
}

/* 对数据进行排序 */
function handleSort(
  data: RecordType[],
  sorter: DmTableQuery["sorter"],
): RecordType[] {
  const { field, order } = sorter ?? {};
  if (field && order) {
    const direction = order === "descend" ? -1 : 1;
    return [...data].sort((left, right) => {
      const leftValue = getRecordValue(left, field);
      const rightValue = getRecordValue(right, field);
      if (leftValue === rightValue) return 0;
      return (
        (leftValue == null
          ? -1
          : rightValue == null
            ? 1
            : leftValue > rightValue
              ? 1
              : -1) * direction
      );
    });
  }
  return data;
}

/** 读取普通字段或 Ant Table 支持的嵌套 dataIndex 路径。 */
function getRecordValue(
  record: RecordType,
  dataIndex: string | number | readonly (string | number)[],
): unknown {
  if (Array.isArray(dataIndex)) {
    let result: unknown = record;
    for (let i = 0; i < dataIndex.length; i++) {
      if (typeof result !== "object" || result === null) return undefined;
      result = (result as Record<string, unknown>)[String(dataIndex[i])];
      if (result === null || result === undefined) {
        return result;
      }
    }
    return result;
  }
  return (record as Record<string, unknown>)[String(dataIndex)];
}

/* 对数据进行分页 */
function handlePage(
  data: RecordType[],
  pagination: DmTableQuery["pagination"],
): RecordType[] {
  const { current = 1, pageSize } = pagination || {};
  if (current && pageSize) {
    return data.slice(pageSize * (current - 1), pageSize * current);
  }
  return data;
}

/** 字段显隐变更只更新列配置，并向外派发完整列快照。 */
function handleColumnChange(columns: DmTableRuntimeColumn[]) {
  currentColumns.value = utils.cloneDeep(columns);
  emit("column-change", columns as unknown as DmTableColumn<RecordType>[]);
}

const emit = defineEmits<{
  (event: "column-change", columns: DmTableColumn<RecordType>[]): void;
  (event: "filter", payload: DmTableQuery): void;
}>();

/** 开发环境禁止继续传入会与统一 filter 事件冲突的原生查询监听器。 */
watch(props, () => {
  if (!import.meta.env.DEV) return;
  const propRecord = props as unknown as Record<string, unknown>;
  const attrRecord = attrs as Record<string, unknown>;
  const found = deprecatedATableProps.find(
    (name) => propRecord[name] !== undefined || attrRecord[name] !== undefined,
  );
  if (found)
    throw new Error(`DmAppTable 已弃用 ${found}，请统一使用 filter 事件。`);
});

/* 更新数据源 */
watch(
  () => props.dataSource,
  () => {
    if (props.mode === "client") {
      // 非受控客户端表格在数据集替换后回到第一页，避免旧页码超出新数据范围。
      const isControlledPage =
        props.pagination !== false &&
        typeof props.pagination === "object" &&
        props.pagination.current !== undefined;
      if (!isControlledPage) {
        query.value.pagination.current = 1;
      }
      onFilter();
    } else {
      displaySourceData.value = props.dataSource ?? [];
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="dm-table">
    <header
      v-if="
        props.tableTitle !== false ||
        $slots.titleTool ||
        props.columnManager !== false
      "
      class="dm-table__header"
    >
      <h3 v-if="props.tableTitle" class="dm-table__title font-xl">
        {{ props.tableTitle }}
      </h3>
      <div class="dm-table__tools">
        <slot name="titleTool" />
        <ColumnManager
          v-if="props.columnManager !== false"
          :columns="resolvedColumns"
          :config="props.columnManager"
          @change="handleColumnChange"
        />
      </div>
    </header>
    <div class="dm-table__content">
      <ATable v-if="mergedTableProps.columns?.length" v-bind="mergedTableProps">
        <template #emptyText>
          <slot name="emptyText">
            <AEmpty :description="t('components.table.empty')" />
          </slot>
        </template>
        <template
          v-for="slotName in forwardedSlotNames"
          #[slotName]="slotProps"
        >
          <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
      </ATable>
    </div>
  </section>
</template>

<style scoped>
.dm-table {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}
.dm-table__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.dm-table__title {
  display: flex;
  align-items: center;
  margin: 0;
  font-weight: 600;
}
/* .dm-table__title::before {
  display: inline-block;
  width: 4px;
  height: 20px;
  border-radius: 1px;
  margin-right: 10px;
  background: var(--dm-primary);
  content: "";
} */
.dm-table__tools {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-left: auto;
}
.dm-table__column-manager-label {
  margin-left: 4px;
}
.dm-table__content {
  display: flex;
  flex: 1;
  position: relative;
  min-height: 0;
}
.dm-table :deep(.ant-table-wrapper),
.dm-table :deep(.ant-spin-nested-loading),
.dm-table :deep(.ant-spin-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}
.dm-table :deep(.ant-table),
.dm-table :deep(.ant-table-container),
.dm-table :deep(.ant-table-body) {
  flex: 1;
  min-height: 0;
}
.dm-table :deep(.ant-table-container) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.dm-table :deep(.ant-table-header) {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  background: var(--dm-bg-container);
}
.dm-table :deep(.ant-table-body) {
  /* Ant 的内联 max-height: 100% 未扣除表头，会把横向滚动条挤到分页下方。 */
  height: 0;
  max-height: none !important;
  /* Ant 固定表头默认强制使用 scroll，内容不足时也会保留右侧滚动条。 */
  /* overflow-y: auto !important; */
}
.dm-table :deep(.ant-table-wrapper .ant-table-thead > tr > th) {
  padding: 10px 16px;
}
.dm-table :deep(.ant-spin-nested-loading > div > .ant-spin) {
  max-height: 100%;
}
.dm-table :deep(.ant-pagination) {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  margin-bottom: 0;
  background: var(--dm-bg-container);
}

/* 支持样式 */
.dm-table :deep(.ant-table-wrapper .ant-table-tbody > tr > td) {
  &.table-bold-cell {
    font-weight: bold;
  }
}
</style>
