import http from "@/api/http";

export type QualityCommentScope = "CLIP" | "OBJECT";
export type QualityCommentSeverity = "MUST_FIX" | "SUGGESTION";

export interface QualityCommentHistoryItem {
  id: string;
  scope: QualityCommentScope;
  content: string;
  severity: QualityCommentSeverity;
  reviewerName: string;
  createdAt: string;
  target: {
    qualityTaskId: string;
    unitType: "SAMPLE" | "CLIP";
    unitId: string;
    unitName?: string;
    frameId?: string;
    frameNo?: number;
    objectId?: string;
    labelName?: string;
    platformSource: string;
  };
  objectExists?: boolean;
}

export interface CreateQualityCommentInput {
  qualityTaskId: string;
  itemId: string;
  itemName?: string;
  annotationObjectId?: string | null;
  annotationObjectName?: string | null;
  issueLevel: QualityCommentSeverity;
  description: string;
}

type ApiResponse<T> = {
  code: string | number;
  message?: string;
  data?: T | null;
};
type QualityIssue = {
  issueLevel?: string;
  annotationObjectId?: string | number | null;
  annotationObjectName?: string | null;
  description?: string;
};
type QualityRecord = {
  id?: string | number;
  createdAt?: string;
  submitterName?: string | null;
  inspectorName?: string | null;
  samples?: Array<{
    itemId?: string | number;
    itemName?: string;
    issues?: QualityIssue[];
  }>;
};

function unwrap<T>(response: ApiResponse<T>, emptyMessage: string): T {
  if (String(response.code) !== "0")
    throw new Error(response.message || emptyMessage);
  if (response.data === null || response.data === undefined)
    throw new Error(emptyMessage);
  return response.data;
}

function normalizeId(value: string | number | null | undefined) {
  return value === null || value === undefined || value === ""
    ? undefined
    : String(value);
}

/** 按 URL 是否携带 qualityTaskId 选择质检或标注任务历史接口。 */
export async function getQualityCommentHistoryApi(
  annotationTaskId: string,
  itemId: string | undefined,
  unitType: "SAMPLE" | "CLIP",
  platformSource: string,
  qualityTaskId?: string,
) {
  const validQualityTaskId = qualityTaskId?.trim();
  const path = validQualityTaskId
    ? `/quality-tasks/${encodeURIComponent(validQualityTaskId)}/quality-records`
    : `/annotation-tasks/${encodeURIComponent(annotationTaskId)}/quality-records`;
  const response = await http.get<ApiResponse<{ list?: QualityRecord[] }>>(
    path,
    { params: itemId ? { itemId } : undefined },
  );
  const page = unwrap(response.data, "质检历史数据为空");
  return (page.list ?? []).flatMap((record) =>
    (record.samples ?? []).flatMap((sample) => {
      const sampleId = normalizeId(sample.itemId) ?? itemId ?? "";
      return (sample.issues ?? []).map((issue, index) => {
        const objectId = normalizeId(issue.annotationObjectId);
        return {
          id: `${normalizeId(record.id) ?? "quality-record"}-${sampleId}-${index}`,
          scope: objectId ? "OBJECT" : "CLIP",
          content: issue.description ?? "",
          severity:
            issue.issueLevel === "SUGGESTION" ? "SUGGESTION" : "MUST_FIX",
          reviewerName: record.inspectorName || record.submitterName || "",
          createdAt: record.createdAt ?? "",
          target: {
            unitType,
            unitId: sampleId,
            unitName: sample.itemName ?? undefined,
            objectId,
            labelName: issue.annotationObjectName ?? undefined,
            platformSource,
          },
        } satisfies QualityCommentHistoryItem;
      });
    }),
  );
}

/** 新增样本级或标签级质检评论。路径中的 ID 必须是 qualityTaskId。 */
export async function createQualityCommentApi(
  input: CreateQualityCommentInput,
): Promise<string> {
  if (!input.qualityTaskId) throw new Error("缺少质检任务 ID");
  const response = await http.post<ApiResponse<string | number>>(
    `/quality-tasks/${encodeURIComponent(input.qualityTaskId)}/quality-issues`,
    {
      itemId: Number.isSafeInteger(Number(input.itemId))
        ? Number(input.itemId)
        : input.itemId,
      itemName: input.itemName,
      annotationObjectId: input.annotationObjectId
        ? input.annotationObjectId
        : null,
      annotationObjectName: input.annotationObjectName ?? null,
      issueLevel: input.issueLevel,
      description: input.description,
    },
  );
  return String(unwrap(response.data, "质检评论保存失败"));
}
