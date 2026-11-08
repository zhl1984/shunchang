import type { CreateDatasetImportInput, UploadTarget } from "@/api/dataset";

export type CreateDatasetFormValues = {
  name: string;
  description: string;
  dataType?: string;
  dataFormat?: string;
};

export type DatasetFormatSelectOption = { label: string; value: string };

/** 获取所选数据类型的默认导入格式，无可用格式时返回空值。 */
export function getDefaultDatasetFormat(
  options: readonly DatasetFormatSelectOption[],
): string | undefined {
  return options[0]?.value;
}

/** 判断文件名扩展名是否满足后端格式限制，空限制列表表示允许全部。 */
export function isDatasetFileExtensionAllowed(
  fileName: string,
  fileExtensions: readonly string[],
): boolean {
  if (fileExtensions.length === 0) return false;
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  if (!extension) return false;
  const normalizedExtension = extension.toLocaleLowerCase();
  return fileExtensions.some(
    (allowed) => allowed.toLocaleLowerCase() === normalizedExtension,
  );
}

/** 将已校验的表单和文件转换为创建导入记录的请求参数。 */
export function buildDatasetImportInput(
  values: CreateDatasetFormValues & { dataType: string; dataFormat: string },
  file: File,
): CreateDatasetImportInput {
  return {
    datasetName: values.name.trim(),
    description: values.description.trim() || null,
    dataType: values.dataType,
    dataFormat: values.dataFormat,
    source: { fileName: file.name, sizeBytes: file.size },
  };
}

/** 按后端预签名指令直传文件，非成功响应视为上传失败。 */
export async function uploadDatasetSource(
  target: UploadTarget,
  file: File,
): Promise<void> {
  const response = await fetch(target.url, {
    method: target.method,
    headers: target.headers,
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Dataset source upload failed: ${response.status}`);
  }
}
