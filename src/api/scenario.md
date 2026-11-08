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

# 场景配置

## GET 查询场景列表

GET /scenes

> Body 请求参数

```json
{}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|keyword|query|string| 否 |搜索关键词|
|pageNo|query|string| 否 |页码|
|pageSize|query|string| 否 |分页大小|
|Authorization|header|string| 是 |none|
|body|body|object| 否 |none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "pageNo": 1,
        "pageSize": 10,
        "total": 2,
        "list": [
            {
                "sceneId": 2,
                "sceneName": "场景1",
                "sceneDesc": "sceneDesc_1111",
                "annotationTypeId": 1,
                "qualityPlanId": 2,
                "annotationTypeName": "自动驾驶3D点云标注",
                "qualityPlanName": "质量方案2",
                "labelModelMappings": [],
                "ruleMappings": null
            },
            {
                "sceneId": 3,
                "sceneName": "场景2",
                "sceneDesc": "sceneDesc_510081c2ae",
                "annotationTypeId": 1,
                "qualityPlanId": 2,
                "annotationTypeName": "自动驾驶3D点云标注",
                "qualityPlanName": "质量方案2",
                "labelModelMappings": [
                    {
                        "id": 8,
                        "sceneId": 3,
                        "labelId": 2,
                        "labelName": "标签11",
                        "annotationType": "PRE_ANNOTATION",
                        "modelId": 5,
                        "modelVersionId": 2
                    },
                    {
                        "id": 9,
                        "sceneId": 3,
                        "labelId": 3,
                        "labelName": "标签22",
                        "annotationType": "PRE_ANNOTATION",
                        "modelId": 6,
                        "modelVersionId": 3
                    },
                    {
                        "id": 10,
                        "sceneId": 3,
                        "labelId": 4,
                        "labelName": "标签33",
                        "annotationType": "MANUAL",
                        "modelId": null,
                        "modelVersionId": null
                    }
                ],
                "ruleMappings": null
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
|»» total|integer|true|none|总记录数|none|
|»» list|[object]|true|none|数据列表|none|
|»»» sceneId|integer|true|none|场景id|none|
|»»» sceneName|string|true|none|场景名称|none|
|»»» sceneDesc|string|true|none|场景描述|none|
|»»» annotationTypeId|integer|true|none|标注类型id|none|
|»»» qualityPlanId|integer|true|none|质量方案id|none|
|»»» annotationTypeName|string|true|none|标注类型名称|none|
|»»» qualityPlanName|string|true|none|质量方案名称|none|
|»»» labelModelMappings|[object]|true|none|所选标签模型|none|
|»»»» id|integer|true|none|id|none|
|»»»» sceneId|integer|true|none|场景id|none|
|»»»» labelId|integer|true|none|标签id|none|
|»»»» labelName|string|true|none|标签名称|none|
|»»»» annotationType|string|true|none|标注类型|MANUAL-人工，PRE_ANNOTATION-预标注|
|»»»» modelId|integer¦null|true|none|模型id|none|
|»»»» modelVersionId|integer¦null|true|none|模型版本id|none|
|»»» ruleMappings|[object]|true|none|规则映射|none|
|»»»» sceneId|string|true|none|场景id|none|
|»»»» ruleId|string|true|none|规则id|none|
|»»»» ruleName|string|true|none|规则名称|none|
|»»»» status|string|true|none|可用状态|ENABLED-启用，DISABLED-停用|
|»»»» ruleDescription|string|true|none|规则描述|none|

## POST 新建场景

POST /scenes

> Body 请求参数

```json
{
    "sceneName": "场景2",
    "sceneDesc": "sceneDesc_510081c2ae",
    "annotationTypeId": 1,
    "qualityPlanId": 1,
    "labelModels": [
        {
            "labelId": 2,
            "annotationType": "PRE_ANNOTATION",
            "modelId": 7,
            "modelVersionId": 4
        },
        {
            "labelId": 4,
            "annotationType": "MANUAL",
            "modelId": null,
            "modelVersionId": null
        }
    ],
    "ruleMappings": [
        {
            "ruleId": 1,
            "status": "ENABLED"
        },
        {
            "ruleId": 2,
            "status": "DISABLED"
        }
    ]
}
```

### 请求参数

|名称|位置|类型|必选|中文名|说明|
|---|---|---|---|---|---|
|Authorization|header|string| 是 ||none|
|body|body|object| 否 ||none|
|» sceneName|body|string| 是 | 场景名称|none|
|» sceneDesc|body|string| 是 | 场景描述|none|
|» annotationTypeId|body|integer| 是 | 标注类型id|none|
|» qualityPlanId|body|integer| 是 | 质量方案id|none|
|» labelModels|body|[object]| 是 | 选择标签|none|
|»» labelId|body|integer| 是 | 标签id|none|
|»» annotationType|body|string| 是 | 标注类型|和列表枚举定义保持一致|
|»» modelId|body|integer¦null| 是 | 模型id|none|
|»» modelVersionId|body|integer¦null| 是 | 模型版本id|none|
|» ruleMappings|body|[object]| 是 | 规则映射|none|
|»» ruleId|body|integer| 是 | 规则id|none|
|»» status|body|string| 是 | 选择状态|和列表枚举定义保持一致|

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
|» data|boolean|true|none|结果状态|true-新增成功|

## GET 查询场景详情

GET /scenes/{sceneId}

> Body 请求参数

```yaml
{}

```

### 请求参数

|名称|位置|类型|必选|中文名|说明|
|---|---|---|---|---|---|
|sceneId|path|string| 是 ||场景id|
|Authorization|header|string| 是 ||none|
|body|body|object| 否 ||none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "sceneId": 3,
        "sceneName": "场景2",
        "sceneDesc": "sceneDesc_510081c2ae",
        "annotationTypeId": 1,
        "qualityPlanId": 2,
        "annotationTypeName": "自动驾驶3D点云标注",
        "qualityPlanName": "质量方案2",
        "labelModelMappings": [
            {
                "id": 8,
                "sceneId": 3,
                "labelId": 2,
                "labelName": "标签11",
                "annotationType": "PRE_ANNOTATION",
                "modelId": 5,
                "modelVersionId": 2
            },
            {
                "id": 9,
                "sceneId": 3,
                "labelId": 3,
                "labelName": "标签22",
                "annotationType": "PRE_ANNOTATION",
                "modelId": 6,
                "modelVersionId": 3
            },
            {
                "id": 10,
                "sceneId": 3,
                "labelId": 4,
                "labelName": "标签33",
                "annotationType": "MANUAL",
                "modelId": null,
                "modelVersionId": null
            }
        ],
        "ruleMappings": [
            {
                "id": 8,
                "sceneId": 3,
                "ruleId": 1,
                "ruleName": "规则1",
                "status": "ENABLED",
                "ruleDescription": "这是描述"
            },
            {
                "id": 9,
                "sceneId": 3,
                "ruleId": 2,
                "ruleName": "规则2",
                "status": "ENABLED",
                "ruleDescription": "这是描述"
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
|» data|object|true|none||和列表的结果的结构保持一致，参考列表接口|
|»» sceneId|integer|true|none||none|
|»» sceneName|string|true|none||none|
|»» sceneDesc|string|true|none||none|
|»» annotationTypeId|integer|true|none||none|
|»» qualityPlanId|integer|true|none||none|
|»» annotationTypeName|string|true|none||none|
|»» qualityPlanName|string|true|none||none|
|»» labelModelMappings|[object]|true|none||none|
|»»» id|integer|true|none||none|
|»»» sceneId|integer|true|none||none|
|»»» labelId|integer|true|none||none|
|»»» labelName|string|true|none||none|
|»»» annotationType|string|true|none||none|
|»»» modelId|integer¦null|true|none||none|
|»»» modelVersionId|integer¦null|true|none||none|
|»» ruleMappings|[object]|true|none||none|
|»»» id|integer|true|none||none|
|»»» sceneId|integer|true|none||none|
|»»» ruleId|integer|true|none||none|
|»»» ruleName|string|true|none||none|
|»»» status|string|true|none||none|
|»»» ruleDescription|string|true|none||none|

## PUT 更新场景

PUT /scenes/{sceneId}

> Body 请求参数

```json
{
    "sceneName": "场景1",
    "sceneDesc": "sceneDesc_1111",
    "annotationTypeId": 1,
    "qualityPlanId": 1,
    "labelModels": [
        {
            "labelId": 2,
            "annotationType": "PRE_ANNOTATION",
            "modelId": 7,
            "modelVersionId": 4
        },
        {
            "labelId": 4,
            "annotationType": "MANUAL",
            "modelId": null,
            "modelVersionId": null
        }
    ],
    "ruleMappings": [
        {
            "ruleId": 1,
            "status": "ENABLED"
        },
        {
            "ruleId": 2,
            "status": "ENABLED"
        }
    ]
}
```

### 请求参数

|名称|位置|类型|必选|中文名|说明|
|---|---|---|---|---|---|
|sceneId|path|string| 是 ||场景id|
|Authorization|header|string| 是 ||none|
|body|body|object| 否 ||none|
|» sceneName|body|string| 是 ||none|
|» sceneDesc|body|string| 是 ||none|
|» annotationTypeId|body|integer| 是 ||none|
|» qualityPlanId|body|integer| 是 ||none|
|» labelModels|body|[object]| 是 ||none|
|»» labelId|body|integer| 是 ||none|
|»» annotationType|body|string| 是 ||none|
|»» modelId|body|integer¦null| 是 ||none|
|»» modelVersionId|body|integer¦null| 是 ||none|
|» ruleMappings|body|[object]| 是 ||none|
|»» ruleId|body|integer| 是 ||none|
|»» status|body|string| 是 ||none|

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
|» data|boolean|true|none|结果状态|true-更新成功|

## DELETE 删除场景

DELETE /scenes//{sceneId}

> Body 请求参数

```json
{}
```

### 请求参数

|名称|位置|类型|必选|中文名|说明|
|---|---|---|---|---|---|
|sceneId|path|string| 是 ||场景id|
|Authorization|header|string| 是 ||none|
|body|body|object| 否 ||none|

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
|» data|boolean|true|none|删除成功|none|

## GET 标签匹配模型列表

GET /scenes/label-models

> Body 请求参数

```json
{
  "modelName": "string",
  "modelDesc": "string",
  "accuracy": 0,
  "apiProtocol": "string",
  "apiEndpoint": "string",
  "apiKey": "string",
  "selfIterationSupported": true,
  "selfIterationEnabled": true
}
```

### 请求参数

|名称|位置|类型|必选|中文名|说明|
|---|---|---|---|---|---|
|labelIds|query|string| 是 ||选择的标签列表，多个按英文逗号拼接|
|Authorization|header|string| 是 ||none|
|body|body|object| 否 ||none|
|» modelName|body|string| 是 ||none|
|» modelDesc|body|string| 是 ||none|
|» accuracy|body|integer| 是 ||none|
|» apiProtocol|body|string| 是 ||none|
|» apiEndpoint|body|string| 是 ||none|
|» apiKey|body|string| 是 ||none|
|» selfIterationSupported|body|boolean| 是 ||none|
|» selfIterationEnabled|body|boolean| 是 ||none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": [
        {
            "id": null,
            "sceneId": null,
            "labelId": 2,
            "labelName": "标签11",
            "annotationType": "PRE_ANNOTATION",
            "modelId": 5,
            "modelVersionId": 2
        },
        {
            "id": null,
            "sceneId": null,
            "labelId": 3,
            "labelName": "标签22",
            "annotationType": "PRE_ANNOTATION",
            "modelId": 6,
            "modelVersionId": 3
        },
        {
            "id": null,
            "sceneId": null,
            "labelId": 4,
            "labelName": "标签33",
            "annotationType": "MANUAL",
            "modelId": null,
            "modelVersionId": null
        }
    ]
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
|» data|[object]|true|none||none|
|»» id|null|true|none||none|
|»» sceneId|null|true|none|场景id|none|
|»» labelId|integer|true|none|标签id|none|
|»» labelName|string|true|none|标签名称|none|
|»» annotationType|string|true|none|标注类型|MANUAL-人工，PRE_ANNOTATION-预标注|
|»» modelId|integer¦null|true|none|模型id|none|
|»» modelVersionId|integer¦null|true|none|模型版本id|none|

# 数据模型

