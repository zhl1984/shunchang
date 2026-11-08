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

# 标签管理

## GET 查询标签树

GET /label-nodes/tree

查询全部未删除标签节点并组装树。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|Authorization|header|string| 否 |none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": [
        {
            "id": 1,
            "parentId": 0,
            "nodeType": "GROUP",
            "nodeName": "肺部 CT 标签组",
            "nodeDescription": null,
            "sortOrder": 1,
            "children": [
                {
                    "id": 101,
                    "parentId": 1,
                    "nodeType": "LABEL",
                    "nodeName": "肺结节",
                    "nodeDescription": "通用肺结节",
                    "sortOrder": 1,
                    "children": []
                }
            ]
        }
    ]
}
```

> 400 Response

```json
{
    "code": "100001",
    "message": "请求参数错误",
    "data": null
}
```

> 401 Response

```json
{
    "code": "100102",
    "message": "登录状态已失效",
    "data": null
}
```

> 403 Response

```json
{
    "code": "100103",
    "message": "无权访问",
    "data": null
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功响应。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|业务错误响应。|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|业务错误响应。|Inline|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|业务错误响应。|Inline|

### 返回数据结构

状态码 **200**

*统一响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务响应码；成功固定为 "0"。|
|» message|string|true|none||响应消息；成功固定为 "success"。|
|» data|[object]|true|none||标签树根节点列表。|
|»» id|integer(int64)|true|none||节点 ID。|
|»» parentId|integer(int64)|true|none||父节点 ID；根节点为 0。|
|»» nodeType|string|true|none||节点类型；创建后不可修改。|
|»» nodeName|string|true|none||节点名称；同级未删除节点名称唯一。|
|»» nodeDescription|string¦null|false|none||节点说明。|
|»» sortOrder|integer|true|none||同级排序号，由服务端生成。|
|»» children|[object]|true|none||子节点列表。|

#### 枚举值

|属性|值|
|---|---|
|nodeType|GROUP|
|nodeType|LABEL|

状态码 **400**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **401**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **403**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

## POST 创建标签节点

POST /label-nodes

创建 GROUP 或 LABEL 节点，服务端计算排序号。

> Body 请求参数

```json
{
    "parentId": 1,
    "nodeType": "LABEL",
    "nodeName": "肺结节",
    "nodeDescription": "通用肺结节"
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|Authorization|header|string| 否 |none|
|body|body|object| 是 |none|
|» parentId|body|integer(int64)| 是 |父节点 ID；根节点传 0，非根节点必须为 GROUP。|
|» nodeType|body|string| 是 |节点类型；更新时不可改变。|
|» nodeName|body|string| 是 |节点名称，必填。|
|» nodeDescription|body|string¦null| 否 |节点说明。|

#### 枚举值

|属性|值|
|---|---|
|» nodeType|GROUP|
|» nodeType|LABEL|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "id": 101,
        "parentId": 1,
        "nodeType": "LABEL",
        "nodeName": "肺结节",
        "nodeDescription": "通用肺结节",
        "sortOrder": 1,
        "children": []
    }
}
```

> 400 Response

```json
{
    "code": "100001",
    "message": "请求参数错误",
    "data": null
}
```

> 401 Response

```json
{
    "code": "100102",
    "message": "登录状态已失效",
    "data": null
}
```

> 403 Response

```json
{
    "code": "100103",
    "message": "无权访问",
    "data": null
}
```

> 409 Response

```json
{
    "code": "160002",
    "message": "同级标签节点名称已存在",
    "data": null
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功响应。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|业务错误响应。|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|业务错误响应。|Inline|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|业务错误响应。|Inline|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|业务错误响应。|Inline|

### 返回数据结构

状态码 **200**

*统一响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务响应码；成功固定为 "0"。|
|» message|string|true|none||响应消息；成功固定为 "success"。|
|» data|object|true|none||标签树节点。LABEL 节点 children 固定为空数组。|
|»» id|integer(int64)|true|none||节点 ID。|
|»» parentId|integer(int64)|true|none||父节点 ID；根节点为 0。|
|»» nodeType|string|true|none||节点类型；创建后不可修改。|
|»» nodeName|string|true|none||节点名称；同级未删除节点名称唯一。|
|»» nodeDescription|string¦null|false|none||节点说明。|
|»» sortOrder|integer|true|none||同级排序号，由服务端生成。|
|»» children|[object]|true|none||子节点列表。|

#### 枚举值

|属性|值|
|---|---|
|nodeType|GROUP|
|nodeType|LABEL|

状态码 **400**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **401**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **403**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **409**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

## PUT 更新标签节点

PUT /label-nodes/{labelNodeId}

节点类型不可修改，不能移动到自身或子孙节点。

> Body 请求参数

```json
{
    "parentId": 1,
    "nodeType": "LABEL",
    "nodeName": "肺结节",
    "nodeDescription": "通用肺结节"
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|labelNodeId|path|integer(int64)| 是 |标签节点 ID，必须为正整数。|
|Authorization|header|string| 否 |none|
|body|body|object| 是 |none|
|» parentId|body|integer(int64)| 是 |父节点 ID；根节点传 0，非根节点必须为 GROUP。|
|» nodeType|body|string| 是 |节点类型；更新时不可改变。|
|» nodeName|body|string| 是 |节点名称，必填。|
|» nodeDescription|body|string¦null| 否 |节点说明。|

#### 枚举值

|属性|值|
|---|---|
|» nodeType|GROUP|
|» nodeType|LABEL|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "id": 101,
        "parentId": 1,
        "nodeType": "LABEL",
        "nodeName": "肺结节",
        "nodeDescription": "通用肺结节",
        "sortOrder": 1,
        "children": []
    }
}
```

> 400 Response

```json
{
    "code": "100001",
    "message": "请求参数错误",
    "data": null
}
```

> 401 Response

```json
{
    "code": "100102",
    "message": "登录状态已失效",
    "data": null
}
```

> 403 Response

```json
{
    "code": "100103",
    "message": "无权访问",
    "data": null
}
```

> 409 Response

```json
{
    "code": "160005",
    "message": "标签节点类型不可修改",
    "data": null
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功响应。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|业务错误响应。|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|业务错误响应。|Inline|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|业务错误响应。|Inline|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|业务错误响应。|Inline|

### 返回数据结构

状态码 **200**

*统一响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务响应码；成功固定为 "0"。|
|» message|string|true|none||响应消息；成功固定为 "success"。|
|» data|object|true|none||标签树节点。LABEL 节点 children 固定为空数组。|
|»» id|integer(int64)|true|none||节点 ID。|
|»» parentId|integer(int64)|true|none||父节点 ID；根节点为 0。|
|»» nodeType|string|true|none||节点类型；创建后不可修改。|
|»» nodeName|string|true|none||节点名称；同级未删除节点名称唯一。|
|»» nodeDescription|string¦null|false|none||节点说明。|
|»» sortOrder|integer|true|none||同级排序号，由服务端生成。|
|»» children|[object]|true|none||子节点列表。|

#### 枚举值

|属性|值|
|---|---|
|nodeType|GROUP|
|nodeType|LABEL|

状态码 **400**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **401**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **403**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **409**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

## DELETE 删除标签节点

DELETE /label-nodes/{labelNodeId}

逻辑删除；GROUP 有子节点或 LABEL 被引用时禁止删除。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|labelNodeId|path|integer(int64)| 是 |标签节点 ID，必须为正整数。|
|Authorization|header|string| 否 |none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": null
}
```

> 400 Response

```json
{
    "code": "100001",
    "message": "请求参数错误",
    "data": null
}
```

> 401 Response

```json
{
    "code": "100102",
    "message": "登录状态已失效",
    "data": null
}
```

> 403 Response

```json
{
    "code": "100103",
    "message": "无权访问",
    "data": null
}
```

> 409 Response

```json
{
    "code": "160006",
    "message": "标签组存在子节点，不能删除",
    "data": null
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功响应。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|业务错误响应。|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|业务错误响应。|Inline|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|业务错误响应。|Inline|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|业务错误响应。|Inline|

### 返回数据结构

状态码 **200**

*统一响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务响应码；成功固定为 "0"。|
|» message|string|true|none||响应消息；成功固定为 "success"。|
|» data|null|true|none||成功时固定为 null。|

状态码 **400**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **401**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **403**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **409**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

## GET 查询标签详情

GET /labels/{labelId}

查询 LABEL 节点、未删除属性及工具绑定。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|labelId|path|integer(int64)| 是 |LABEL 节点 ID。|
|Authorization|header|string| 否 |none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "id": 101,
        "labelName": "肺结节",
        "labelDescription": "通用肺结节",
        "attributes": [
            {
                "id": 1002,
                "attributeName": "长径",
                "config": {
                    "valueType": "NUMBER",
                    "defaultValue": 1,
                    "readOnly": false,
                    "required": true,
                    "constraint": {
                        "min": 0.1,
                        "max": 300,
                        "unit": "mm"
                    }
                },
                "attributeDescription": "RECIST 靶病灶最长径",
                "sortOrder": 1,
                "toolBindings": [
                    {
                        "toolCode": "bbox",
                        "toolName": "BBox",
                        "toolDescription": "画矩形框住目标区域。",
                        "toolPropertyCode": "long_diameter",
                        "toolPropertyName": "长径"
                    }
                ]
            }
        ]
    }
}
```

> 400 Response

```json
{
    "code": "100001",
    "message": "请求参数错误",
    "data": null
}
```

> 401 Response

```json
{
    "code": "100102",
    "message": "登录状态已失效",
    "data": null
}
```

> 403 Response

```json
{
    "code": "100103",
    "message": "无权访问",
    "data": null
}
```

> 409 Response

```json
{
    "code": "160012",
    "message": "标签不存在",
    "data": null
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功响应。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|业务错误响应。|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|业务错误响应。|Inline|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|业务错误响应。|Inline|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|业务错误响应。|Inline|

### 返回数据结构

状态码 **200**

*统一响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务响应码；成功固定为 "0"。|
|» message|string|true|none||响应消息；成功固定为 "success"。|
|» data|object|true|none||标签详情响应。|
|»» id|integer(int64)|true|none||标签节点 ID。|
|»» labelName|string|true|none||标签名称。|
|»» labelDescription|string¦null|false|none||标签说明。|
|»» attributes|[object]|true|none||未删除标签属性列表，可为空数组。|
|»»» id|integer(int64)|true|none||标签属性 ID。|
|»»» attributeName|string|true|none||标签属性名称。|
|»»» config|object|true|none||标签属性动态配置。服务端校验 valueType、defaultValue、readOnly、required、constraint。|
|»»»» valueType|string|true|none||属性值类型。|
|»»»» defaultValue|any|true|none||属性默认值，必须符合值类型与约束。NUMBER 为数值，BOOLEAN 为布尔值，DATE 为 yyyy-MM-dd 字符串。|
|»»»» readOnly|boolean|true|none||是否只读；true 表示标注端不可编辑。|
|»»»» required|boolean|true|none||是否必填；true 表示标注结果必须提供该属性。|
|»»»» constraint|object|true|none||类型约束。NUMBER 支持 min、max、unit；TEXT 支持 maxLength、pattern；DATE 支持 minDate、maxDate；ENUM 支持 options。|
|»»»»» min|number¦null|false|none||NUMBER 最小值。|
|»»»»» max|number¦null|false|none||NUMBER 最大值。|
|»»»»» unit|string¦null|false|none||NUMBER 展示单位。|
|»»»»» maxLength|integer¦null|false|none||TEXT 最大长度。|
|»»»»» pattern|string¦null|false|none||TEXT 正则表达式。|
|»»»»» minDate|string(date)¦null|false|none||DATE 最小日期。|
|»»»»» maxDate|string(date)¦null|false|none||DATE 最大日期。|
|»»»»» options|[any]|false|none||ENUM 可选项，选项值不得重复。|
|»»» attributeDescription|string¦null|false|none||标签属性说明。|
|»»» sortOrder|integer|true|none||标签属性排序号，数值越小越靠前。|
|»»» toolBindings|[object]|true|none||工具属性绑定列表，可为空数组。|
|»»»» toolCode|string|true|none||工具稳定编码。|
|»»»» toolName|string|true|none||工具名称快照。|
|»»»» toolDescription|string¦null|false|none||工具说明快照。|
|»»»» toolPropertyCode|string|true|none||工具属性稳定编码。|
|»»»» toolPropertyName|string|true|none||工具属性名称快照。|

#### 枚举值

|属性|值|
|---|---|
|valueType|NUMBER|
|valueType|TEXT|
|valueType|DATE|
|valueType|BOOLEAN|
|valueType|ENUM|
|valueType|JSON|

状态码 **400**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **401**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **403**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **409**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

## POST 创建标签属性

POST /labels/{labelId}/attributes

创建属性并校验动态配置，服务端生成排序号。

> Body 请求参数

```json
{
    "attributeName": "长径",
    "config": {
        "valueType": "NUMBER",
        "defaultValue": 1,
        "readOnly": false,
        "required": true,
        "constraint": {
            "min": 0.1,
            "max": 300,
            "unit": "mm"
        }
    },
    "attributeDescription": "RECIST 靶病灶最长径"
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|labelId|path|integer(int64)| 是 |LABEL 节点 ID。|
|Authorization|header|string| 否 |none|
|body|body|object| 是 |none|
|» attributeName|body|string| 是 |属性名称，必填。|
|» config|body|object| 是 |标签属性动态配置。服务端校验 valueType、defaultValue、readOnly、required、constraint。|
|»» valueType|body|string| 是 |属性值类型。|
|»» defaultValue|body|any| 是 |属性默认值，必须符合值类型与约束。NUMBER 为数值，BOOLEAN 为布尔值，DATE 为 yyyy-MM-dd 字符串。|
|»» readOnly|body|boolean| 是 |是否只读；true 表示标注端不可编辑。|
|»» required|body|boolean| 是 |是否必填；true 表示标注结果必须提供该属性。|
|»» constraint|body|object| 是 |类型约束。NUMBER 支持 min、max、unit；TEXT 支持 maxLength、pattern；DATE 支持 minDate、maxDate；ENUM 支持 options。|
|»»» min|body|number¦null| 否 |NUMBER 最小值。|
|»»» max|body|number¦null| 否 |NUMBER 最大值。|
|»»» unit|body|string¦null| 否 |NUMBER 展示单位。|
|»»» maxLength|body|integer¦null| 否 |TEXT 最大长度。|
|»»» pattern|body|string¦null| 否 |TEXT 正则表达式。|
|»»» minDate|body|string(date)¦null| 否 |DATE 最小日期。|
|»»» maxDate|body|string(date)¦null| 否 |DATE 最大日期。|
|»»» options|body|[any]| 否 |ENUM 可选项，选项值不得重复。|
|» attributeDescription|body|string¦null| 否 |属性说明。|

#### 枚举值

|属性|值|
|---|---|
|»» valueType|NUMBER|
|»» valueType|TEXT|
|»» valueType|DATE|
|»» valueType|BOOLEAN|
|»» valueType|ENUM|
|»» valueType|JSON|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "id": 101,
        "labelName": "肺结节",
        "labelDescription": "通用肺结节",
        "attributes": [
            {
                "id": 1002,
                "attributeName": "长径",
                "config": {
                    "valueType": "NUMBER",
                    "defaultValue": 1,
                    "readOnly": false,
                    "required": true,
                    "constraint": {
                        "min": 0.1,
                        "max": 300,
                        "unit": "mm"
                    }
                },
                "attributeDescription": "RECIST 靶病灶最长径",
                "sortOrder": 1,
                "toolBindings": [
                    {
                        "toolCode": "bbox",
                        "toolName": "BBox",
                        "toolDescription": "画矩形框住目标区域。",
                        "toolPropertyCode": "long_diameter",
                        "toolPropertyName": "长径"
                    }
                ]
            }
        ]
    }
}
```

> 400 Response

```json
{
    "code": "100001",
    "message": "请求参数错误",
    "data": null
}
```

> 401 Response

```json
{
    "code": "100102",
    "message": "登录状态已失效",
    "data": null
}
```

> 403 Response

```json
{
    "code": "100103",
    "message": "无权访问",
    "data": null
}
```

> 409 Response

```json
{
    "code": "160008",
    "message": "同一标签下属性名称已存在",
    "data": null
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功响应。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|业务错误响应。|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|业务错误响应。|Inline|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|业务错误响应。|Inline|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|业务错误响应。|Inline|

### 返回数据结构

状态码 **200**

*统一响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务响应码；成功固定为 "0"。|
|» message|string|true|none||响应消息；成功固定为 "success"。|
|» data|object|true|none||标签详情响应。|
|»» id|integer(int64)|true|none||标签节点 ID。|
|»» labelName|string|true|none||标签名称。|
|»» labelDescription|string¦null|false|none||标签说明。|
|»» attributes|[object]|true|none||未删除标签属性列表，可为空数组。|
|»»» id|integer(int64)|true|none||标签属性 ID。|
|»»» attributeName|string|true|none||标签属性名称。|
|»»» config|object|true|none||标签属性动态配置。服务端校验 valueType、defaultValue、readOnly、required、constraint。|
|»»»» valueType|string|true|none||属性值类型。|
|»»»» defaultValue|any|true|none||属性默认值，必须符合值类型与约束。NUMBER 为数值，BOOLEAN 为布尔值，DATE 为 yyyy-MM-dd 字符串。|
|»»»» readOnly|boolean|true|none||是否只读；true 表示标注端不可编辑。|
|»»»» required|boolean|true|none||是否必填；true 表示标注结果必须提供该属性。|
|»»»» constraint|object|true|none||类型约束。NUMBER 支持 min、max、unit；TEXT 支持 maxLength、pattern；DATE 支持 minDate、maxDate；ENUM 支持 options。|
|»»»»» min|number¦null|false|none||NUMBER 最小值。|
|»»»»» max|number¦null|false|none||NUMBER 最大值。|
|»»»»» unit|string¦null|false|none||NUMBER 展示单位。|
|»»»»» maxLength|integer¦null|false|none||TEXT 最大长度。|
|»»»»» pattern|string¦null|false|none||TEXT 正则表达式。|
|»»»»» minDate|string(date)¦null|false|none||DATE 最小日期。|
|»»»»» maxDate|string(date)¦null|false|none||DATE 最大日期。|
|»»»»» options|[any]|false|none||ENUM 可选项，选项值不得重复。|
|»»» attributeDescription|string¦null|false|none||标签属性说明。|
|»»» sortOrder|integer|true|none||标签属性排序号，数值越小越靠前。|
|»»» toolBindings|[object]|true|none||工具属性绑定列表，可为空数组。|
|»»»» toolCode|string|true|none||工具稳定编码。|
|»»»» toolName|string|true|none||工具名称快照。|
|»»»» toolDescription|string¦null|false|none||工具说明快照。|
|»»»» toolPropertyCode|string|true|none||工具属性稳定编码。|
|»»»» toolPropertyName|string|true|none||工具属性名称快照。|

#### 枚举值

|属性|值|
|---|---|
|valueType|NUMBER|
|valueType|TEXT|
|valueType|DATE|
|valueType|BOOLEAN|
|valueType|ENUM|
|valueType|JSON|

状态码 **400**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **401**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **403**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **409**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

## PUT 更新标签属性

PUT /labels/{labelId}/attributes/{attributeId}

更新属性名称、动态配置和说明。

> Body 请求参数

```json
{
    "attributeName": "长径",
    "config": {
        "valueType": "NUMBER",
        "defaultValue": 1,
        "readOnly": false,
        "required": true,
        "constraint": {
            "min": 0.1,
            "max": 300,
            "unit": "mm"
        }
    },
    "attributeDescription": "RECIST 靶病灶最长径"
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|labelId|path|integer(int64)| 是 |LABEL 节点 ID。|
|attributeId|path|integer(int64)| 是 |标签属性 ID，必须属于标签。|
|Authorization|header|string| 否 |none|
|body|body|object| 是 |none|
|» attributeName|body|string| 是 |属性名称，必填。|
|» config|body|object| 是 |标签属性动态配置。服务端校验 valueType、defaultValue、readOnly、required、constraint。|
|»» valueType|body|string| 是 |属性值类型。|
|»» defaultValue|body|any| 是 |属性默认值，必须符合值类型与约束。NUMBER 为数值，BOOLEAN 为布尔值，DATE 为 yyyy-MM-dd 字符串。|
|»» readOnly|body|boolean| 是 |是否只读；true 表示标注端不可编辑。|
|»» required|body|boolean| 是 |是否必填；true 表示标注结果必须提供该属性。|
|»» constraint|body|object| 是 |类型约束。NUMBER 支持 min、max、unit；TEXT 支持 maxLength、pattern；DATE 支持 minDate、maxDate；ENUM 支持 options。|
|»»» min|body|number¦null| 否 |NUMBER 最小值。|
|»»» max|body|number¦null| 否 |NUMBER 最大值。|
|»»» unit|body|string¦null| 否 |NUMBER 展示单位。|
|»»» maxLength|body|integer¦null| 否 |TEXT 最大长度。|
|»»» pattern|body|string¦null| 否 |TEXT 正则表达式。|
|»»» minDate|body|string(date)¦null| 否 |DATE 最小日期。|
|»»» maxDate|body|string(date)¦null| 否 |DATE 最大日期。|
|»»» options|body|[any]| 否 |ENUM 可选项，选项值不得重复。|
|» attributeDescription|body|string¦null| 否 |属性说明。|

#### 枚举值

|属性|值|
|---|---|
|»» valueType|NUMBER|
|»» valueType|TEXT|
|»» valueType|DATE|
|»» valueType|BOOLEAN|
|»» valueType|ENUM|
|»» valueType|JSON|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "id": 101,
        "labelName": "肺结节",
        "labelDescription": "通用肺结节",
        "attributes": [
            {
                "id": 1002,
                "attributeName": "长径",
                "config": {
                    "valueType": "NUMBER",
                    "defaultValue": 1,
                    "readOnly": false,
                    "required": true,
                    "constraint": {
                        "min": 0.1,
                        "max": 300,
                        "unit": "mm"
                    }
                },
                "attributeDescription": "RECIST 靶病灶最长径",
                "sortOrder": 1,
                "toolBindings": [
                    {
                        "toolCode": "bbox",
                        "toolName": "BBox",
                        "toolDescription": "画矩形框住目标区域。",
                        "toolPropertyCode": "long_diameter",
                        "toolPropertyName": "长径"
                    }
                ]
            }
        ]
    }
}
```

> 400 Response

```json
{
    "code": "100001",
    "message": "请求参数错误",
    "data": null
}
```

> 401 Response

```json
{
    "code": "100102",
    "message": "登录状态已失效",
    "data": null
}
```

> 403 Response

```json
{
    "code": "100103",
    "message": "无权访问",
    "data": null
}
```

> 409 Response

```json
{
    "code": "160008",
    "message": "同一标签下属性名称已存在",
    "data": null
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功响应。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|业务错误响应。|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|业务错误响应。|Inline|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|业务错误响应。|Inline|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|业务错误响应。|Inline|

### 返回数据结构

状态码 **200**

*统一响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务响应码；成功固定为 "0"。|
|» message|string|true|none||响应消息；成功固定为 "success"。|
|» data|object|true|none||标签详情响应。|
|»» id|integer(int64)|true|none||标签节点 ID。|
|»» labelName|string|true|none||标签名称。|
|»» labelDescription|string¦null|false|none||标签说明。|
|»» attributes|[object]|true|none||未删除标签属性列表，可为空数组。|
|»»» id|integer(int64)|true|none||标签属性 ID。|
|»»» attributeName|string|true|none||标签属性名称。|
|»»» config|object|true|none||标签属性动态配置。服务端校验 valueType、defaultValue、readOnly、required、constraint。|
|»»»» valueType|string|true|none||属性值类型。|
|»»»» defaultValue|any|true|none||属性默认值，必须符合值类型与约束。NUMBER 为数值，BOOLEAN 为布尔值，DATE 为 yyyy-MM-dd 字符串。|
|»»»» readOnly|boolean|true|none||是否只读；true 表示标注端不可编辑。|
|»»»» required|boolean|true|none||是否必填；true 表示标注结果必须提供该属性。|
|»»»» constraint|object|true|none||类型约束。NUMBER 支持 min、max、unit；TEXT 支持 maxLength、pattern；DATE 支持 minDate、maxDate；ENUM 支持 options。|
|»»»»» min|number¦null|false|none||NUMBER 最小值。|
|»»»»» max|number¦null|false|none||NUMBER 最大值。|
|»»»»» unit|string¦null|false|none||NUMBER 展示单位。|
|»»»»» maxLength|integer¦null|false|none||TEXT 最大长度。|
|»»»»» pattern|string¦null|false|none||TEXT 正则表达式。|
|»»»»» minDate|string(date)¦null|false|none||DATE 最小日期。|
|»»»»» maxDate|string(date)¦null|false|none||DATE 最大日期。|
|»»»»» options|[any]|false|none||ENUM 可选项，选项值不得重复。|
|»»» attributeDescription|string¦null|false|none||标签属性说明。|
|»»» sortOrder|integer|true|none||标签属性排序号，数值越小越靠前。|
|»»» toolBindings|[object]|true|none||工具属性绑定列表，可为空数组。|
|»»»» toolCode|string|true|none||工具稳定编码。|
|»»»» toolName|string|true|none||工具名称快照。|
|»»»» toolDescription|string¦null|false|none||工具说明快照。|
|»»»» toolPropertyCode|string|true|none||工具属性稳定编码。|
|»»»» toolPropertyName|string|true|none||工具属性名称快照。|

#### 枚举值

|属性|值|
|---|---|
|valueType|NUMBER|
|valueType|TEXT|
|valueType|DATE|
|valueType|BOOLEAN|
|valueType|ENUM|
|valueType|JSON|

状态码 **400**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **401**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **403**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **409**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

## DELETE 删除标签属性

DELETE /labels/{labelId}/attributes/{attributeId}

逻辑删除属性与其工具绑定；被可信规则引用时禁止删除。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|labelId|path|integer(int64)| 是 |LABEL 节点 ID。|
|attributeId|path|integer(int64)| 是 |标签属性 ID，必须属于标签。|
|Authorization|header|string| 否 |none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": null
}
```

> 400 Response

```json
{
    "code": "100001",
    "message": "请求参数错误",
    "data": null
}
```

> 401 Response

```json
{
    "code": "100102",
    "message": "登录状态已失效",
    "data": null
}
```

> 403 Response

```json
{
    "code": "100103",
    "message": "无权访问",
    "data": null
}
```

> 409 Response

```json
{
    "code": "160010",
    "message": "标签属性已被引用，不能删除",
    "data": null
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功响应。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|业务错误响应。|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|业务错误响应。|Inline|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|业务错误响应。|Inline|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|业务错误响应。|Inline|

### 返回数据结构

状态码 **200**

*统一响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务响应码；成功固定为 "0"。|
|» message|string|true|none||响应消息；成功固定为 "success"。|
|» data|null|true|none||成功时固定为 null。|

状态码 **400**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **401**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **403**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **409**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

## PUT 整体保存标签属性工具绑定

PUT /labels/{labelId}/attributes/{attributeId}/tool-bindings

整体覆盖保存。未提交的旧绑定逻辑删除；请求内重复组合会失败。

> Body 请求参数

```json
{
    "bindings": [
        {
            "toolCode": "bbox",
            "toolName": "BBox",
            "toolDescription": "画矩形框住目标区域。",
            "toolPropertyCode": "long_diameter",
            "toolPropertyName": "长径"
        }
    ]
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|labelId|path|integer(int64)| 是 |LABEL 节点 ID。|
|attributeId|path|integer(int64)| 是 |标签属性 ID，必须属于标签。|
|Authorization|header|string| 否 |none|
|body|body|object| 是 |none|
|» bindings|body|[object]| 是 |完整保留绑定列表；相同工具编码和属性编码组合不能重复。|
|»» toolCode|body|string| 是 |工具编码。|
|»» toolPropertyCode|body|string| 是 |工具属性编码。|
|»» toolName|body|string| 是 |工具名称快照。|
|»» toolDescription|body|string¦null| 否 |工具说明快照。|
|»» toolPropertyName|body|string| 是 |工具属性名称快照。|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "id": 101,
        "labelName": "肺结节",
        "labelDescription": "通用肺结节",
        "attributes": [
            {
                "id": 1002,
                "attributeName": "长径",
                "config": {
                    "valueType": "NUMBER",
                    "defaultValue": 1,
                    "readOnly": false,
                    "required": true,
                    "constraint": {
                        "min": 0.1,
                        "max": 300,
                        "unit": "mm"
                    }
                },
                "attributeDescription": "RECIST 靶病灶最长径",
                "sortOrder": 1,
                "toolBindings": [
                    {
                        "toolCode": "bbox",
                        "toolName": "BBox",
                        "toolDescription": "画矩形框住目标区域。",
                        "toolPropertyCode": "long_diameter",
                        "toolPropertyName": "长径"
                    }
                ]
            }
        ]
    }
}
```

> 400 Response

```json
{
    "code": "100001",
    "message": "请求参数错误",
    "data": null
}
```

> 401 Response

```json
{
    "code": "100102",
    "message": "登录状态已失效",
    "data": null
}
```

> 403 Response

```json
{
    "code": "100103",
    "message": "无权访问",
    "data": null
}
```

> 409 Response

```json
{
    "code": "160013",
    "message": "工具属性绑定不合法",
    "data": null
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|成功响应。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|业务错误响应。|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|业务错误响应。|Inline|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|业务错误响应。|Inline|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|业务错误响应。|Inline|

### 返回数据结构

状态码 **200**

*统一响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务响应码；成功固定为 "0"。|
|» message|string|true|none||响应消息；成功固定为 "success"。|
|» data|object|true|none||标签详情响应。|
|»» id|integer(int64)|true|none||标签节点 ID。|
|»» labelName|string|true|none||标签名称。|
|»» labelDescription|string¦null|false|none||标签说明。|
|»» attributes|[object]|true|none||未删除标签属性列表，可为空数组。|
|»»» id|integer(int64)|true|none||标签属性 ID。|
|»»» attributeName|string|true|none||标签属性名称。|
|»»» config|object|true|none||标签属性动态配置。服务端校验 valueType、defaultValue、readOnly、required、constraint。|
|»»»» valueType|string|true|none||属性值类型。|
|»»»» defaultValue|any|true|none||属性默认值，必须符合值类型与约束。NUMBER 为数值，BOOLEAN 为布尔值，DATE 为 yyyy-MM-dd 字符串。|
|»»»» readOnly|boolean|true|none||是否只读；true 表示标注端不可编辑。|
|»»»» required|boolean|true|none||是否必填；true 表示标注结果必须提供该属性。|
|»»»» constraint|object|true|none||类型约束。NUMBER 支持 min、max、unit；TEXT 支持 maxLength、pattern；DATE 支持 minDate、maxDate；ENUM 支持 options。|
|»»»»» min|number¦null|false|none||NUMBER 最小值。|
|»»»»» max|number¦null|false|none||NUMBER 最大值。|
|»»»»» unit|string¦null|false|none||NUMBER 展示单位。|
|»»»»» maxLength|integer¦null|false|none||TEXT 最大长度。|
|»»»»» pattern|string¦null|false|none||TEXT 正则表达式。|
|»»»»» minDate|string(date)¦null|false|none||DATE 最小日期。|
|»»»»» maxDate|string(date)¦null|false|none||DATE 最大日期。|
|»»»»» options|[string]|false|none||ENUM 可选项，选项值不得重复。|
|»»» attributeDescription|string¦null|false|none||标签属性说明。|
|»»» sortOrder|integer|true|none||标签属性排序号，数值越小越靠前。|
|»»» toolBindings|[object]|true|none||工具属性绑定列表，可为空数组。|
|»»»» toolCode|string|true|none||工具稳定编码。|
|»»»» toolName|string|true|none||工具名称快照。|
|»»»» toolDescription|string¦null|false|none||工具说明快照。|
|»»»» toolPropertyCode|string|true|none||工具属性稳定编码。|
|»»»» toolPropertyName|string|true|none||工具属性名称快照。|

#### 枚举值

|属性|值|
|---|---|
|valueType|NUMBER|
|valueType|TEXT|
|valueType|DATE|
|valueType|BOOLEAN|
|valueType|ENUM|
|valueType|JSON|

状态码 **400**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **401**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **403**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

状态码 **409**

*统一错误响应对象。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码。|
|» message|string|true|none||中文业务错误消息。|
|» data|null|true|none||业务失败时固定为 null。|

# 数据模型

