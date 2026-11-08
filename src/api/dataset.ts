import http from "@/api/http";
import { i18n } from "@/locales";

export type DatasetStatus = "SUCCESS" | "FAILED";
export type DatasetImportStatus = "WAITING_UPLOAD" | "RUNNING" | DatasetStatus;
export type DatasetImportPhase =
  | "PREPARING_SOURCE"
  | "PARSING"
  | "STORING"
  | "COMPLETED";

export type Dataset = {
  id: number;
  name: string;
  dataType: string;
  status: DatasetStatus | null;
  itemCount: number;
  projectReferenceCount: number;
  description: string | null;
  isDeleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DatasetFormatOption = {
  code: string;
  name: string;
  sourceKinds: string[];
  fileExtensions: string[];
};

export type DatasetTypeOption = {
  code: string;
  name: string;
  itemUnit: string;
  formats: DatasetFormatOption[];
};

export type CreateDatasetImportInput = {
  datasetName: string;
  description?: string | null;
  dataType: string;
  dataFormat: string;
  source: {
    fileName: string;
    sizeBytes: number;
  };
};

export type UploadTarget = {
  method: string;
  url: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
};

export type CreateDatasetImportResult = {
  datasetId: number;
  importId: number;
  uploadTarget: UploadTarget;
};

export type StartDatasetImportResult = {
  importId: number;
  status: DatasetImportStatus;
  phase: DatasetImportPhase | null;
};

type DatasetImportRecord = {
  id: number;
  datasetId: number;
  dataFormat: string;
  sourceFileName: string;
  status: DatasetImportStatus;
  phase: DatasetImportPhase | null;
  processedItemCount: number;
  committedItemCount: number;
  failedItemCount: number;
  warningCount: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type DatasetListItem = {
  dataset: Dataset;
  importRecord: DatasetImportRecord | null;
};

type DatasetListResponse = {
  pageNo: number;
  pageSize: number;
  total: number;
  hasRunningImport: boolean;
  list: DatasetListItem[];
};

export type DatasetListResult = {
  list: Dataset[];
  hasRunningImport: boolean;
};

type ApiResponse<T> = {
  code: string | number;
  message?: string | null;
  data?: T | null;
};

/** 查询创建表单可用的数据类型及其导入格式选项。 */
export async function getDatasetTypesApi(): Promise<
  ApiResponse<DatasetTypeOption[]>
> {
  return (await http.get<ApiResponse<DatasetTypeOption[]>>("/dataset-types"))
    .data;
}

/** 创建导入记录，返回导入 ID 和浏览器直传所需的预签名目标。 */
export async function createDatasetImportApi(
  input: CreateDatasetImportInput,
): Promise<ApiResponse<CreateDatasetImportResult>> {
  return (
    await http.post<ApiResponse<CreateDatasetImportResult>>(
      "/dataset-imports",
      input,
    )
  ).data;
}

/** 校验已上传源文件并异步启动指定导入记录。 */
export async function startDatasetImportApi(
  importId: number,
): Promise<ApiResponse<StartDatasetImportResult>> {
  return (
    await http.post<ApiResponse<StartDatasetImportResult>>(
      `/dataset-imports/${importId}/start`,
    )
  ).data;
}

/** 分页查询数据集并返回摘要集合及后端的新鲜度标记。 */
export async function getDatasetListApi(): Promise<
  ApiResponse<DatasetListResult | null>
> {
  const response = await http.get<ApiResponse<DatasetListResponse>>(
    "/datasets",
    {
      params: { pageNo: 1, pageSize: 10000 },
    },
  );

  // 分页数据整体可能缺失，读取前统一兜底为空集合。
  const data = response.data.data ?? null;
  const datasetList =
    data?.list?.flatMap(({ dataset }) => (dataset ? [dataset] : [])) || [];
  const successDatasetList = datasetList.filter(
    (dataset) => dataset.status === "SUCCESS",
  );
  return {
    ...response.data,
    data: {
      list: successDatasetList,
      hasRunningImport: data?.hasRunningImport === true,
    },
  };
}

/** 详情页样本图库默认每页展示 10 条。 */
export const DATASET_SAMPLE_DEFAULT_PAGE_SIZE = 10;

/** 详情页使用的样本模型；名称与图片地址按接口契约允许为空。 */
export type DatasetSample = {
  id: number;
  name: string | null;
  imagePath: string | null;
};

export type DatasetSampleListParams = {
  datasetId: number;
  page?: number;
  pageSize?: number;
};

export type DatasetSampleListResult = {
  list: DatasetSample[];
  total: number;
  page: number;
  pageSize: number;
};

type DatasetSampleDto = {
  itemId: number;
  imagePath?: string | null;
  name?: string | null;
};

type DatasetSamplePageDto = {
  pageNo: number;
  pageSize: number;
  total: number;
  list?: DatasetSampleDto[] | null;
};

/**
 * 校验统一响应包装的业务码。
 * HTTP 200/400 都不能代表业务成功，必须先判断 code；失败时优先使用后端 message。
 */
function assertSuccess<T>(response: ApiResponse<T> | undefined): void {
  if (String(response?.code) !== "0") {
    throw new Error(
      response?.message ||
        i18n.global.t("datasetManagement.error.samplesTitle"),
    );
  }
}

/** 在业务码校验通过后取出响应数据，数据缺失时抛出模块兜底提示。 */
function unwrapRequired<T>(
  response: ApiResponse<T> | undefined,
  message: string,
): T {
  assertSuccess(response);
  // 即使业务码成功也不无条件信任 data 一定存在，读取前统一兜底。
  if (response?.data === null || response?.data === undefined) {
    throw new Error(message);
  }
  return response.data;
}

/** 将接口样本项转换为页面模型，空值原样保留交由展示层处理。 */
function toDatasetSample(dto: DatasetSampleDto): DatasetSample {
  return {
    id: dto.itemId,
    name: dto.name ?? null,
    imagePath: dto.imagePath ?? null,
  };
}

/**
 * 分页查询指定数据集下的样本列表。
 *
 * @param params.datasetId 数据集 ID。
 * @param params.page 页码，从 1 开始，默认第一页。
 * @param params.pageSize 每页数量，默认 DATASET_SAMPLE_DEFAULT_PAGE_SIZE。
 * @returns 样本集合、总数以及后端确认的页码与页大小；分页由后端处理。
 * 样本资源返回 404 时由详情页展示统一空状态，避免全局拦截器将整个页面跳走。
 */
export async function getDatasetSamplesApi(
  params: DatasetSampleListParams,
): Promise<DatasetSampleListResult> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DATASET_SAMPLE_DEFAULT_PAGE_SIZE;
  const response = await http.get<ApiResponse<DatasetSamplePageDto>>(
    "/datasets/samples/pageList",
    {
      // 仅此请求接管 404；401 和其他异常继续遵循全局鉴权及错误处理。
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 404,
      // 契约中三个查询参数均声明为字符串，按原样发送避免后端解析差异。
      params: {
        pageNo: String(page),
        pageSize: String(pageSize),
        datasetId: String(params.datasetId),
      },
    },
  );

  // HTTP 404 即使附带成功业务码也不是有效样本结果，必须进入图库失败态。
  if (response.status === 404) {
    throw new Error(
      response.data?.message ||
        i18n.global.t("datasetManagement.error.samplesDescription"),
    );
  }

  const data = unwrapRequired(
    response.data,
    i18n.global.t("datasetManagement.error.samplesDescription"),
  );
  return {
    list: (data.list ?? []).map(toDatasetSample),
    total: data.total ?? 0,
    page: data.pageNo ?? page,
    pageSize: data.pageSize ?? pageSize,
  };
}
