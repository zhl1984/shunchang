---
title: GA0804迭代1
language_tabs:
  - shell: Shell
  - http: HTTP
  - javascript: JavaScript
  - ruby: Ruby
  - python: Python
  - php: PHP
  - java: Java
  - go: Go
toc_footers: []
includes: []
search: true
code_clipboard: true
highlight_theme: darkula
headingLevel: 2
generator: "@tarslib/widdershins v4.0.30"

---

# GA0804迭代1

基于当前 sc 标签模块代码生成；所有 schema 均内联。

Base URLs:

# Authentication

# 数据集/Dataset Import

<a id="opIdlistDatasetTypes"></a>

## GET 查询可选择的数据类型和导入格式

GET /dataset-types

返回前端可选择的数据类型；每个数据类型的 formats 表示它允许的导入格式。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|Authorization|header|string| 是 |调用 Dataset 接口所需的 Bearer 访问令牌，例如 Bearer eyJ...|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": [
        {
            "code": "LIDAR_FUSION_FRAME",
            "name": "3D点云融合单帧",
            "itemUnit": "FRAME",
            "formats": [
                {
                    "code": "XTREME1",
                    "name": "Xtreme1 ZIP",
                    "sourceKinds": [
                        "ARCHIVE"
                    ],
                    "fileExtensions": [
                        "zip"
                    ]
                }
            ]
        }
    ]
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|查询成功，data 是数据类型数组。|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|false|none||统一响应码，成功固定为 0|
|» message|string|false|none||统一响应消息，成功固定为 success|
|» data|[object]|false|none||可选择的数据类型列表。|
|»» code|string|false|none||数据类型编码，创建导入时作为 dataType 传入|
|»» name|string|false|none||数据类型展示名称|
|»» itemUnit|string|false|none||该类型的最小数据单元，例如 FRAME|
|»» formats|[object]|false|none||当前数据类型支持的导入格式列表。|
|»»» code|string|false|none||导入格式编码，创建导入时作为 dataFormat 传入|
|»»» name|string|false|none||导入格式展示名称|
|»»» sourceKinds|[string]|false|none||该格式支持的来源容器类型列表。|
|»»» fileExtensions|[string]|false|none||该格式支持的文件扩展名列表，不带点号。|

<a id="opIdprepareDatasetImport"></a>

## POST 创建导入记录并取得浏览器直传地址

POST /dataset-imports

校验 dataType、dataFormat 和源文件信息，创建 Dataset/Import 记录；contentType 由后端根据格式和扩展名生成。

> Body 请求参数

```json
{
    "datasetName": "xtreme1-demo",
    "description": "用于回归验证的 Xtreme1 示例数据集",
    "dataType": "LIDAR_FUSION_FRAME",
    "dataFormat": "XTREME1",
    "source": {
        "fileName": "xtreme1-demo.zip",
        "sizeBytes": 109647950
    }
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|Authorization|header|string| 是 |调用 Dataset 接口所需的 Bearer 访问令牌，例如 Bearer eyJ...|
|body|body|object| 是 |none|
|» datasetName|body|string| 是 |数据集展示名称，必填，最长 255 个字符|
|» description|body|string¦null| 否 |数据集说明，可选，最长 2000 个字符|
|» dataType|body|string| 是 |数据类型编码，必须来自 GET /dataset-types 的顶层 code|
|» dataFormat|body|string| 是 |导入格式编码，必须来自所选类型 formats[].code|
|» source|body|object| 是 |浏览器准备上传的源文件信息；不传 contentType、对象键或存储地址。|
|»» fileName|body|string| 是 |源文件名，必填，最长 255 个字符|
|»» sizeBytes|body|integer(int64)| 是 |源文件大小，必填，单位为字节且必须大于 0|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "datasetId": 101,
        "importId": 201,
        "uploadTarget": {
            "method": "PUT",
            "url": "https://minio.example.com/bucket/imports/...?X-Amz-Signature=...",
            "headers": {
                "Content-Type": "application/zip"
            },
            "expiresInSeconds": 3600
        }
    }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|创建成功；后端会生成 MIME 类型并放入 uploadTarget.headers。|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|false|none||统一响应码，成功固定为 0|
|» message|string|false|none||统一响应消息，成功固定为 success|
|» data|object|false|none||创建结果和一次性浏览器上传目标。|
|»» datasetId|integer(int64)|false|none||新建数据集 ID|
|»» importId|integer(int64)|false|none||新建导入记录 ID|
|»» uploadTarget|object|false|none||预签名上传指令；前端应按原值发起 PUT 请求。|
|»»» method|string|false|none||上传 HTTP 方法，当前为 PUT|
|»»» url|string(uri)|false|none||一次性预签名上传地址|
|»»» headers|object|false|none||上传时必须原样携带的请求头；键和值均由后端生成|
|»»»» **additionalProperties**|string|false|none||none|
|»»» expiresInSeconds|integer(int64)|false|none||上传地址有效期，单位为秒|

<a id="opIdstartDatasetImport"></a>

## POST 校验源文件并异步启动导入

POST /dataset-imports/{importId}/start

首次调用校验源文件后将 WAITING_UPLOAD 原子切换为 RUNNING 并投递任务；重复调用只返回当前状态，不重复投递。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|importId|path|integer(int64)| 是 |导入记录 ID，必须为正整数，例如 201。|
|Authorization|header|string| 是 |调用 Dataset 接口所需的 Bearer 访问令牌，例如 Bearer eyJ...|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "importId": 201,
        "status": "RUNNING",
        "phase": "PREPARING_SOURCE"
    }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|仅返回启动确认；完整进度通过 GET /dataset-imports/{importId} 查询。|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|false|none||统一响应码，成功固定为 0|
|» message|string|false|none||统一响应消息，成功固定为 success|
|» data|object|false|none||导入启动确认。|
|»» importId|integer(int64)|false|none||导入记录 ID，与路径参数一致|
|»» status|string|false|none||当前导入状态|
|»» phase|string¦null|false|none||当前处理阶段，尚未进入阶段时为空|

#### 枚举值

|属性|值|
|---|---|
|status|WAITING_UPLOAD|
|status|RUNNING|
|status|SUCCESS|
|status|FAILED|
|phase|PREPARING_SOURCE|
|phase|PARSING|
|phase|STORING|
|phase|COMPLETED|

# 数据集/Dataset Query

<a id="opIdlistDatasetSamples"></a>

## GET 分页查询数据集样本列表

GET /datasets/samples/pageList

按数据集分页查询其下的样本；每个样本返回数据单元 ID、图片地址和名称，图片地址与名称允许为空。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|pageNo|query|string| 否 |页码，从 1 开始，默认 1。|
|pageSize|query|string| 否 |每页数量，默认 10。|
|datasetId|query|string| 否 |数据集 ID。|
|Authorization|header|string| 是 |调用 Dataset 接口所需的 Bearer 访问令牌，例如 Bearer eyJ...|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "pageNo": 1,
        "pageSize": 10,
        "total": 1,
        "list": [
            {
                "itemId": 132,
                "imagePath": null,
                "name": null
            }
        ]
    }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|返回指定数据集的样本分页列表。|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|false|none||统一响应码，成功固定为 0|
|» message|string|false|none||统一响应消息，成功固定为 success|
|» data|object|false|none||分页结果。|
|»» pageNo|integer(int64)|false|none||当前页码|
|»» pageSize|integer(int64)|false|none||每页数量|
|»» total|integer(int64)|false|none||样本总数|
|»» list|array|false|none||样本列表。|
|»»» itemId|integer(int64)|false|none||数据单元 ID|
|»»» imagePath|string¦null|false|none||图片地址，可能为空|
|»»» name|string¦null|false|none||样本名称，可能为空|

<a id="opIdlistDatasets"></a>

## GET 分页查询数据集

GET /datasets

按关键词、状态和数据类型筛选数据集；keyword 同时匹配名称、描述和导入记录的数据格式。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|keyword|query|string| 否 |可选搜索词，同时匹配数据集名称、描述和 dataset_import.data_format。|
|status|query|string| 否 |可选数据集业务状态筛选值。|
|dataType|query|string| 否 |可选数据类型编码，例如 LIDAR_FUSION_FRAME。|
|includeDeleted|query|boolean| 否 |是否包含软删除记录，默认 false；删除状态通过 dataset.isDeleted 判断。|
|pageNo|query|integer(int64)| 否 |页码，从 1 开始，默认 1。|
|pageSize|query|integer(int64)| 否 |每页数量，默认 10；当前代码只校验大于 0。|
|Authorization|header|string| 是 |调用 Dataset 接口所需的 Bearer 访问令牌，例如 Bearer eyJ...|

#### 枚举值

|属性|值|
|---|---|
|status|SUCCESS|
|status|FAILED|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "pageNo": 1,
        "pageSize": 10,
        "total": 1,
        "list": [
            {
                "dataset": {
                    "id": 101,
                    "name": "xtreme1-demo",
                    "dataType": "LIDAR_FUSION_FRAME",
                    "status": "SUCCESS",
                    "itemCount": 81,
                    "projectReferenceCount": 0,
                    "description": null,
                    "isDeleted": false,
                    "createdAt": "2026-08-13T10:00:00Z",
                    "updatedAt": "2026-08-13T10:03:00Z"
                },
                "importRecord": {
                    "id": 201,
                    "datasetId": 101,
                    "dataFormat": "XTREME1",
                    "sourceFileName": "xtreme1-demo.zip",
                    "status": "SUCCESS",
                    "phase": "COMPLETED",
                    "processedItemCount": 81,
                    "committedItemCount": 81,
                    "failedItemCount": 0,
                    "warningCount": 4,
                    "errorMessage": null,
                    "startedAt": "2026-08-13T10:00:10Z",
                    "finishedAt": "2026-08-13T10:03:00Z",
                    "createdAt": "2026-08-13T10:00:00Z",
                    "updatedAt": "2026-08-13T10:03:00Z"
                }
            }
        ]
    }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|返回 Dataset 摘要和对应 Import 摘要的分页列表。|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|false|none||统一响应码，成功固定为 0|
|» message|string|false|none||统一响应消息，成功固定为 success|
|» data|object|false|none||分页结果。|
|»» pageNo|integer(int64)|false|none||当前页码|
|»» pageSize|integer(int64)|false|none||当前页大小|
|»» total|integer(int64)|false|none||匹配数据集总数|
|»» list|[object]|false|none||当前页数据集列表。|
|»»» dataset|object|false|none||数据集摘要。|
|»»»» id|integer(int64)|false|none||数据集 ID|
|»»»» name|string|false|none||数据集名称|
|»»»» dataType|string|false|none||数据类型编码|
|»»»» status|string¦null|false|none||数据集业务状态|
|»»»» itemCount|integer|false|none||成功写入的数据单元数量|
|»»»» projectReferenceCount|integer|false|none||当前项目引用数量，首版固定为 0|
|»»»» description|string¦null|false|none||数据集说明|
|»»»» isDeleted|boolean|false|none||是否已软删除|
|»»»» createdAt|string(date-time)¦null|false|none||创建时间，UTC RFC3339 格式|
|»»»» updatedAt|string(date-time)¦null|false|none||更新时间，UTC RFC3339 格式|
|»»» importRecord|object¦null|false|none||对应导入摘要；历史异常数据可能为空。|
|»»»» id|integer(int64)|false|none||导入记录 ID|
|»»»» datasetId|integer(int64)|false|none||所属数据集 ID|
|»»»» dataFormat|string|false|none||导入格式编码|
|»»»» sourceFileName|string|false|none||源文件名|
|»»»» status|string|false|none||导入状态|
|»»»» phase|string¦null|false|none||处理阶段|
|»»»» processedItemCount|integer|false|none||尝试处理数量|
|»»»» committedItemCount|integer|false|none||成功写入数量|
|»»»» failedItemCount|integer|false|none||失败数量|
|»»»» warningCount|integer|false|none||告警数量|
|»»»» errorMessage|string¦null|false|none||导入级失败原因|
|»»»» startedAt|string(date-time)¦null|false|none||开始时间，UTC RFC3339 格式|
|»»»» finishedAt|string(date-time)¦null|false|none||完成时间，UTC RFC3339 格式|
|»»»» createdAt|string(date-time)¦null|false|none||创建时间，UTC RFC3339 格式|
|»»»» updatedAt|string(date-time)¦null|false|none||更新时间，UTC RFC3339 格式|

#### 枚举值

|属性|值|
|---|---|
|status|SUCCESS|
|status|FAILED|
|status|WAITING_UPLOAD|
|status|RUNNING|
|status|SUCCESS|
|status|FAILED|
|phase|PREPARING_SOURCE|
|phase|PARSING|
|phase|STORING|
|phase|COMPLETED|

# 数据模型

