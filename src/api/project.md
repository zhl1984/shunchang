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

# 项目管理

## GET 项目列表

GET /projects

> Body 请求参数

```yaml
string

```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|keyword|query|string| 是 |搜索关键词|
|status|query|string| 是 |状态枚举：PROCESSING-系统处理中，RUNNING-进行中，COMPLETED-已完成，FAILED-异常|
|iterationEnabled|query|string| 是 |none|
|pageNo|query|string| 是 |none|
|pageSize|query|string| 是 |none|
|Content-Type|header|string| 是 |none|
|Authorization|header|string| 否 |none|
|body|body|string(binary)| 否 |none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "pageNo": 1,
        "pageSize": 10,
        "total": 4,
        "list": [
            {
                "createdBy": 1,
                "createdAt": "2026-08-29T10:23:02.131+08:00",
                "updatedBy": 1,
                "updatedAt": "2026-08-29T10:23:02.131+08:00",
                "projectId": 5,
                "projectCode": "PJ202608290001",
                "projectName": "项目88",
                "projectDesc": "项目88",
                "ownerUserId": 2,
                "ownerUserName": "项目经理",
                "deadline": "2026-09-23",
                "annotationTypeId": 1,
                "sceneId": 3,
                "sceneName": null,
                "datasetId": 1,
                "dataType": "NUSCENES",
                "dataCount": 2,
                "batchSize": 2,
                "projectStatus": "RUNNING",
                "errorMessage": "algorithm job submission failed",
                "iterationEnabled": true,
                "iterationConfig": {
                    "targetAccuracy": 90,
                    "maxRounds": 3
                }
            },
            {
                "createdBy": 1,
                "createdAt": "2026-08-22T15:05:37.005+08:00",
                "updatedBy": 1,
                "updatedAt": "2026-08-22T15:05:37.005+08:00",
                "projectId": 3,
                "projectCode": "PJ202608220003",
                "projectName": "项目333",
                "projectDesc": "项目1333",
                "ownerUserId": 2,
                "ownerUserName": "项目经理",
                "deadline": "2026-08-24",
                "annotationTypeId": 1,
                "sceneId": 2,
                "sceneName": null,
                "datasetId": 1,
                "dataType": "KITTI",
                "dataCount": 2,
                "batchSize": 2,
                "projectStatus": "COMPLETED",
                "errorMessage": null,
                "iterationEnabled": true,
                "iterationConfig": {
                    "targetAccuracy": 89,
                    "maxRounds": 4
                }
            },
            {
                "createdBy": 1,
                "createdAt": "2026-08-22T15:05:15.728+08:00",
                "updatedBy": 1,
                "updatedAt": "2026-08-22T15:05:15.728+08:00",
                "projectId": 2,
                "projectCode": "PJ202608220002",
                "projectName": "项目222",
                "projectDesc": "项目1222",
                "ownerUserId": 2,
                "ownerUserName": "项目经理",
                "deadline": "2026-08-24",
                "annotationTypeId": 1,
                "sceneId": 2,
                "sceneName": null,
                "datasetId": 1,
                "dataType": "KITTI",
                "dataCount": 2,
                "batchSize": 2,
                "projectStatus": "RUNNING",
                "errorMessage": null,
                "iterationEnabled": true,
                "iterationConfig": {
                    "targetAccuracy": 89,
                    "maxRounds": 4
                }
            },
            {
                "createdBy": 1,
                "createdAt": "2026-08-22T14:38:20.673+08:00",
                "updatedBy": 1,
                "updatedAt": "2026-08-22T14:38:20.673+08:00",
                "projectId": 1,
                "projectCode": "PJ202608220001",
                "projectName": "项目1",
                "projectDesc": "项目1",
                "ownerUserId": 2,
                "ownerUserName": "项目经理",
                "deadline": "2026-08-23",
                "annotationTypeId": 1,
                "sceneId": 3,
                "sceneName": null,
                "datasetId": 1,
                "dataType": "KITTI",
                "dataCount": 2,
                "batchSize": 2,
                "projectStatus": "PROCESSING",
                "errorMessage": null,
                "iterationEnabled": true,
                "iterationConfig": {
                    "targetAccuracy": 90,
                    "maxRounds": 4
                }
            }
        ]
    }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||none|
|» message|string|true|none||none|
|» data|object|true|none||none|
|»» pageNo|integer|true|none|页码|none|
|»» pageSize|integer|true|none|分页大小|none|
|»» total|integer|true|none|总数量|none|
|»» list|[object]|true|none|数据列表|none|
|»»» createdBy|integer|true|none|创建人id|none|
|»»» createdAt|string|true|none|创建时间|接入时间使用此字段|
|»»» updatedBy|integer|true|none|更新人id|none|
|»»» updatedAt|string|true|none|更新时间|none|
|»»» projectId|integer|true|none|项目id|none|
|»»» projectCode|string|true|none|项目code|唯一业务主键|
|»»» projectName|string|true|none|项目名称|none|
|»»» projectDesc|string|true|none|项目描述|none|
|»»» ownerUserId|integer|true|none|项目负责人id|none|
|»»» ownerUserName|string|true|none|项目负责人name|none|
|»»» deadline|string|true|none|截止日期|none|
|»»» annotationTypeId|integer|true|none|标注类型id|none|
|»»» sceneId|integer|true|none|场景id|none|
|»»» sceneName|null|true|none|场景名称|none|
|»»» datasetId|integer|true|none|数据集id|none|
|»»» dataType|string|true|none|数据类型|none|
|»»» dataCount|integer|true|none|样本数量|none|
|»»» batchSize|integer|true|none|分片数量|none|
|»»» projectStatus|string|true|none|项目状态|通搜索条件中的状态枚举定义|
|»»» errorMessage|string¦null|true|none|异常时的错误信息|none|
|»»» iterationEnabled|boolean|true|none|是否开启自迭代|none|
|»»» iterationConfig|object|true|none|自迭代配置|none|
|»»»» targetAccuracy|integer|true|none|目标准确率阈值|none|
|»»»» maxRounds|integer|true|none|最大迭代次数|none|

## POST 创建项目

POST /projects

> Body 请求参数

```json
{
  "projectName": "项目1",
  "projectDesc": "项目1",
  "ownerUserId": 2,
  "deadline": "2026-08-23",
  "annotationTypeId": 1,
  "sceneId": 3,
  "datasetId": 1,
  "dataType": "KITTI",
  "batchSize": 2,
  "annotatorUserIds": [
    3
  ],
  "qualityUserIds": {
    "1": [
      4
    ]
  },
  "iterationEnabled": true,
  "iterationConfig": {
    "targetAccuracy": 90,
    "maxRounds": 4
  }
}
```

### 请求参数

|名称|位置|类型|必选|中文名|说明|
|---|---|---|---|---|---|
|Content-Type|header|string| 否 ||none|
|Authorization|header|string| 否 ||none|
|body|body|object| 否 ||none|
|» projectName|body|string| 是 | 项目名称|none|
|» projectDesc|body|string| 是 | 项目描述|none|
|» ownerUserId|body|integer| 是 | 负责人id|none|
|» deadline|body|string| 是 | 截止日期|none|
|» annotationTypeId|body|integer| 是 | 标注类型id|none|
|» sceneId|body|integer| 是 | 场景id|none|
|» datasetId|body|integer| 是 | 数据集id|none|
|» dataType|body|string| 是 | 数据类型|none|
|» batchSize|body|integer| 是 | 分片id|none|
|» annotatorUserIds|body|[integer]| 是 | 标注员id列表|none|
|» qualityUserIds|body|object| 是 | 质检员列表|是一个map结构，key是质检层级，value是质检员id数组|
|»» 1|body|[integer]| 是 | 质检层级|none|
|» iterationEnabled|body|boolean| 是 | 是否开启自迭代|none|
|» iterationConfig|body|object| 是 | 自迭代配置|none|
|»» targetAccuracy|body|integer| 是 | 目标准确率阈值|none|
|»» maxRounds|body|integer| 是 | 最大迭代次数|none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": true
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||none|
|» message|string|true|none||none|
|» data|boolean|true|none|结果状态|true-成功|

## DELETE 删除项目

DELETE /projects/{projectCode}

> Body 请求参数

```yaml
string

```

### 请求参数

|名称|位置|类型|必选|中文名|说明|
|---|---|---|---|---|---|
|projectCode|path|string| 是 ||项目编码|
|Content-Type|header|string| 是 ||none|
|Authorization|header|string| 否 ||none|
|body|body|string(binary)| 否 ||none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": true
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||none|
|» message|string|true|none||none|
|» data|boolean|true|none|结果状态|true-成功|

## GET 项目详情

GET /projects/{projectCode}

> Body 请求参数

```yaml
string

```

### 请求参数

|名称|位置|类型|必选|中文名|说明|
|---|---|---|---|---|---|
|projectCode|path|string| 是 ||项目编码|
|Content-Type|header|string| 是 ||none|
|Authorization|header|string| 否 ||none|
|body|body|string(binary)| 否 ||none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "createdBy": 1,
        "createdAt": "2026-08-22T14:38:20.673+08:00",
        "updatedBy": 1,
        "updatedAt": "2026-08-22T14:38:20.673+08:00",
        "projectId": 1,
        "projectCode": "PJ202608220001",
        "projectName": "项目1",
        "projectDesc": "项目1",
        "ownerUserId": 2,
        "ownerUserName": "项目经理",
        "deadline": "2026-08-23",
        "annotationTypeId": 1,
        "sceneId": 3,
        "sceneName": "场景2",
        "datasetId": 1,
        "dataType": "KITTI",
        "dataCount": 2,
        "batchSize": 2,
        "projectStatus": "PROCESSING",
        "errorMessage": null,
        "iterationEnabled": true,
        "iterationConfig": {
            "targetAccuracy": 90,
            "maxRounds": 4
        }
    }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||none|
|» message|string|true|none||none|
|» data|object|true|none||返回详情结构和列表一样，参见列表接口|
|»» createdBy|integer|true|none||none|
|»» createdAt|string|true|none||none|
|»» updatedBy|integer|true|none||none|
|»» updatedAt|string|true|none||none|
|»» projectId|integer|true|none||none|
|»» projectCode|string|true|none||none|
|»» projectName|string|true|none||none|
|»» projectDesc|string|true|none||none|
|»» ownerUserId|integer|true|none||none|
|»» ownerUserName|string|true|none||none|
|»» deadline|string|true|none||none|
|»» annotationTypeId|integer|true|none||none|
|»» sceneId|integer|true|none||none|
|»» sceneName|string|true|none||none|
|»» datasetId|integer|true|none||none|
|»» dataType|string|true|none||none|
|»» dataCount|integer|true|none||none|
|»» batchSize|integer|true|none||none|
|»» projectStatus|string|true|none||none|
|»» errorMessage|null|true|none||none|
|»» iterationEnabled|boolean|true|none||none|
|»» iterationConfig|object|true|none||none|
|»»» targetAccuracy|integer|true|none||none|
|»»» maxRounds|integer|true|none||none|

## GET 项目统计数据

GET /projects/statistics

> Body 请求参数

```yaml
string

```

### 请求参数

|名称|位置|类型|必选|中文名|说明|
|---|---|---|---|---|---|
|Content-Type|header|string| 是 ||none|
|Authorization|header|string| 否 ||none|
|body|body|string(binary)| 否 ||none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "total": 4,
        "PROCESSING": 1,
        "RUNNING": 2,
        "COMPLETED": 1,
        "FAILED": 0
    }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||none|
|» message|string|true|none||none|
|» data|object|true|none||none|
|»» total|integer|true|none|全部数量|none|
|»» PROCESSING|integer|true|none|系统处理中数量|none|
|»» RUNNING|integer|true|none|进行中数量|none|
|»» COMPLETED|integer|true|none|完成数量|none|
|»» FAILED|integer|true|none|异常数量|none|

# 数据模型

