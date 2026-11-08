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

# 规则中心

## GET 分页查询可信规则

GET /trusted-rules

按规则名称或说明关键字、规则类型分页查询未逻辑删除的可信规则。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|keyword|query|string| 否 |规则名称或规则说明的模糊查询关键字，最长 100 个字符。|
|ruleType|query|string| 否 |规则类型筛选，不传则查询全部类型。|
|pageNo|query|integer| 否 |页码，从 1 开始；不传默认 1。|
|pageSize|query|integer| 否 |每页条数；不传默认 10。|
|Authorization|header|string| 否 |none|

#### 枚举值

|属性|值|
|---|---|
|ruleType|WHILE_THEN|
|ruleType|THEN|

> 返回示例

> 400 Response

```json
{
    "code": "100001",
    "message": "可信规则关键字长度不能超过 100 个字符",
    "data": null
}
```

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
        "id": 1,
        "ruleName": "肺结节 Lung-RADS 分级规则",
        "ruleType": "WHILE_THEN",
        "labelId": 5,
        "labelName": "演示肺结节",
        "ruleDescription": "密度为实性且长径小于 6 mm 时，Lung-RADS 分级必须为 1 或 2。",
        "conditionSummary": "演示肺结节 / 密度类型 EQUALS \"SOLID\" 且 长径 LESS_THAN 6 -> Lung-RADS 分级 IN [\"1\",\"2\"]"
      }
    ]
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|请求处理成功。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|查询参数校验失败。|Inline|

### 返回数据结构

状态码 **200**

*统一成功响应。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||成功响应码，固定为 0。|
|» message|string|true|none||成功响应说明，固定为 success。|
|» data|object|true|none||可信规则分页数据。|
|»» pageNo|integer(int64)|true|none||当前页码，从 1 开始。|
|»» pageSize|integer(int64)|true|none||每页条数。|
|»» total|integer(int64)|true|none||满足当前筛选条件的规则总数。|
|»» list|[object]|true|none||当前页可信规则列表。|
|»»» id|integer(int64)|true|none||可信规则主键 ID。|
|»»» ruleName|string|true|none||规则名称。|
|»»» ruleType|string|true|none||规则类型。|
|»»» labelId|integer(int64)|true|none||规则所属标签 ID。|
|»»» labelName|string|true|none||规则所属标签名称，由服务端根据 labelId 查询。|
|»»» ruleDescription|string¦null|false|none||规则说明，未设置时为 null。|
|»»» conditionSummary|string|true|none||服务端组装的条件摘要，仅用于列表和详情展示，不保存为独立字段。|

#### 枚举值

|属性|值|
|---|---|
|ruleType|WHILE_THEN|
|ruleType|THEN|

状态码 **400**

*统一错误响应。HTTP 状态码仍为 200，通过 code 区分错误类型。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码；参数校验失败为 100001，可信规则业务错误为 160014 至 160020。|
|» message|string|true|none||面向调用方的中文错误说明。|
|» data|null|true|none||错误响应数据，固定为 null。|

## POST 新增可信规则

POST /trusted-rules

校验标签、属性归属、属性约束和条件树后，由后端编译并校验 QLExpress 违规判定表达式，事务保存规则。

> Body 请求参数

```json
{
    "ruleName": "肺结节 Lung-RADS 分级规则",
    "ruleType": "WHILE_THEN",
    "labelId": 5,
    "ruleDescription": "密度为实性且长径小于 6 mm 时，Lung-RADS 分级必须为 1 或 2。",
    "ruleContent": {
        "while": {
            "logic": "AND",
            "conditions": [
                {
                    "labelAttributeId": 5,
                    "operator": "EQUALS",
                    "value": "SOLID"
                },
                {
                    "labelAttributeId": 4,
                    "operator": "LESS_THAN",
                    "value": 6
                }
            ]
        },
        "then": {
            "logic": "AND",
            "conditions": [
                {
                    "labelAttributeId": 6,
                    "operator": "IN",
                    "value": [
                        "1",
                        "2"
                    ]
                }
            ]
        }
    }
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|Authorization|header|string| 否 |none|
|body|body|object| 是 |none|
|» ruleName|body|string| 是 |规则名称，未删除规则范围内唯一。|
|» ruleType|body|string| 是 |规则类型。WHILE_THEN 表示 while 满足且 then 不满足时违规；THEN 表示 then 不满足时违规。|
|» labelId|body|integer(int64)| 是 |规则所属标签节点 ID，必须是未删除的 LABEL 节点。|
|» ruleDescription|body|string¦null| 否 |规则说明，可不传或传 null。|
|» ruleContent|body|object| 是 |可信规则条件树。数据库仅保存 while、then 和叶子条件的 labelAttributeId、operator、value。|
|»» then|body|object| 是 |后置条件组。所有规则类型均必填；规则执行时该组不满足即为违规。|
|»»» logic|body|string| 是 |组内连接逻辑：AND 表示全部满足，OR 表示任一满足。|
|»»» conditions|body|[object]| 是 |条件叶子列表，至少包含一项。|
|»»»» labelAttributeId|body|integer(int64)| 是 |标签属性 ID，必须属于当前请求的 labelId 且未逻辑删除。|
|»»»» operator|body|string| 是 |比较运算符。IN、NOT_IN 仅适用于 ENUM；GREATER_THAN、LESS_THAN 仅适用于 NUMBER、DATE。|
|»»»» value|body|any| 是 |比较值。普通运算符传单值；IN、NOT_IN 传非空数组；值类型、范围及枚举选项必须满足标签属性 configJson 约束。|
|»» while|body|object| 否 |前置条件组。ruleType 为 WHILE_THEN 时必填；ruleType 为 THEN 时不得传入。|
|»»» logic|body|string| 是 |组内连接逻辑：AND 表示全部满足，OR 表示任一满足。|
|»»» conditions|body|[object]| 是 |条件叶子列表，至少包含一项。|
|»»»» labelAttributeId|body|integer(int64)| 是 |标签属性 ID，必须属于当前请求的 labelId 且未逻辑删除。|
|»»»» operator|body|string| 是 |比较运算符。IN、NOT_IN 仅适用于 ENUM；GREATER_THAN、LESS_THAN 仅适用于 NUMBER、DATE。|
|»»»» value|body|any| 是 |比较值。普通运算符传单值；IN、NOT_IN 传非空数组；值类型、范围及枚举选项必须满足标签属性 configJson 约束。|

#### 枚举值

|属性|值|
|---|---|
|» ruleType|WHILE_THEN|
|» ruleType|THEN|
|»»» logic|AND|
|»»» logic|OR|
|»»»» operator|EQUALS|
|»»»» operator|NOT_EQUALS|
|»»»» operator|IN|
|»»»» operator|NOT_IN|
|»»»» operator|GREATER_THAN|
|»»»» operator|LESS_THAN|
|»»» logic|AND|
|»»» logic|OR|
|»»»» operator|EQUALS|
|»»»» operator|NOT_EQUALS|
|»»»» operator|IN|
|»»»» operator|NOT_IN|
|»»»» operator|GREATER_THAN|
|»»»» operator|LESS_THAN|

> 返回示例

> 400 Response

```json
{
    "code": "160020",
    "message": "可信规则比较值不合法",
    "data": null
}
```

> 404 Response

```json
{
    "code": "160017",
    "message": "可信规则所属标签不合法",
    "data": null
}
```

> 200 Response

```json
{
  "code": "0",
  "message": "success",
  "data": {
    "id": 1,
    "ruleName": "肺结节 Lung-RADS 分级规则",
    "ruleType": "WHILE_THEN",
    "labelId": 5,
    "labelName": "演示肺结节",
    "ruleDescription": "密度为实性且长径小于 6 mm 时，Lung-RADS 分级必须为 1 或 2。",
    "ruleContent": {
      "while": {
        "logic": "AND",
        "conditions": [
          {
            "labelAttributeId": 5,
            "attributeName": "密度类型",
            "operator": "EQUALS",
            "value": "SOLID"
          },
          {
            "labelAttributeId": 4,
            "attributeName": "长径",
            "operator": "LESS_THAN",
            "value": 6
          }
        ]
      },
      "then": {
        "logic": "AND",
        "conditions": [
          {
            "labelAttributeId": 6,
            "attributeName": "Lung-RADS 分级",
            "operator": "IN",
            "value": [
              "1",
              "2"
            ]
          }
        ]
      }
    },
    "conditionSummary": "演示肺结节 / 密度类型 EQUALS \"SOLID\" 且 长径 LESS_THAN 6 -> Lung-RADS 分级 IN [\"1\",\"2\"]"
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|请求处理成功。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|请求字段或可信规则业务校验失败。|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|所属标签或引用属性不存在。|Inline|

### 返回数据结构

状态码 **200**

*统一成功响应。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||成功响应码，固定为 0。|
|» message|string|true|none||成功响应说明，固定为 success。|
|» data|object|true|none||可信规则详情。|
|»» id|integer(int64)|true|none||可信规则主键 ID。|
|»» ruleName|string|true|none||规则名称。|
|»» ruleType|string|true|none||规则类型。|
|»» labelId|integer(int64)|true|none||规则所属标签 ID。|
|»» labelName|string|true|none||规则所属标签名称，由服务端根据 labelId 查询。|
|»» ruleDescription|string¦null|false|none||规则说明，未设置时为 null。|
|»» ruleContent|object|true|none||可信规则条件树。数据库仅保存 while、then 和叶子条件的 labelAttributeId、operator、value。|
|»»» then|object|true|none||后置条件组。所有规则类型均必填；规则执行时该组不满足即为违规。|
|»»»» logic|string|true|none||组内连接逻辑：AND 表示全部满足，OR 表示任一满足。|
|»»»» conditions|[object]|true|none||条件叶子列表，至少包含一项。|
|»»»»» labelAttributeId|integer(int64)|true|none||标签属性 ID，必须属于当前请求的 labelId 且未逻辑删除。|
|»»»»» operator|string|true|none||比较运算符。IN、NOT_IN 仅适用于 ENUM；GREATER_THAN、LESS_THAN 仅适用于 NUMBER、DATE。|
|»»»»» value|any|true|none||比较值。普通运算符传单值；IN、NOT_IN 传非空数组；值类型、范围及枚举选项必须满足标签属性 configJson 约束。|
|»»»»» attributeName|string|false|none||标签属性名称，仅详情响应补充展示，不保存到 rule_content_json，编辑请求不得传入。|
|»»» while|object¦null|false|none||前置条件组。仅 WHILE_THEN 规则返回；THEN 规则不包含该字段。|
|»»»» logic|string|true|none||组内连接逻辑：AND 表示全部满足，OR 表示任一满足。|
|»»»» conditions|[object]|true|none||条件叶子列表，至少包含一项。|
|»»»»» labelAttributeId|integer(int64)|true|none||标签属性 ID，必须属于当前请求的 labelId 且未逻辑删除。|
|»»»»» operator|string|true|none||比较运算符。IN、NOT_IN 仅适用于 ENUM；GREATER_THAN、LESS_THAN 仅适用于 NUMBER、DATE。|
|»»»»» value|any|true|none||比较值。普通运算符传单值；IN、NOT_IN 传非空数组；值类型、范围及枚举选项必须满足标签属性 configJson 约束。|
|»»»»» attributeName|string|false|none||标签属性名称，仅详情响应补充展示，不保存到 rule_content_json，编辑请求不得传入。|
|»» conditionSummary|string|true|none||服务端组装的条件摘要，仅用于列表和详情展示，不保存为独立字段。|

#### 枚举值

|属性|值|
|---|---|
|ruleType|WHILE_THEN|
|ruleType|THEN|
|logic|AND|
|logic|OR|
|operator|EQUALS|
|operator|NOT_EQUALS|
|operator|IN|
|operator|NOT_IN|
|operator|GREATER_THAN|
|operator|LESS_THAN|
|logic|AND|
|logic|OR|
|operator|EQUALS|
|operator|NOT_EQUALS|
|operator|IN|
|operator|NOT_IN|
|operator|GREATER_THAN|
|operator|LESS_THAN|

状态码 **400**

*统一错误响应。HTTP 状态码仍为 200，通过 code 区分错误类型。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码；参数校验失败为 100001，可信规则业务错误为 160014 至 160020。|
|» message|string|true|none||面向调用方的中文错误说明。|
|» data|null|true|none||错误响应数据，固定为 null。|

状态码 **404**

*统一错误响应。HTTP 状态码仍为 200，通过 code 区分错误类型。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码；参数校验失败为 100001，可信规则业务错误为 160014 至 160020。|
|» message|string|true|none||面向调用方的中文错误说明。|
|» data|null|true|none||错误响应数据，固定为 null。|

## GET 查询可信规则详情

GET /trusted-rules/{ruleId}

查询未删除规则；响应 ruleContent 的每个条件叶子由服务端补充只读 attributeName。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|ruleId|path|integer(int64)| 是 |可信规则 ID，必须为正整数。|
|Authorization|header|string| 否 |none|

> 返回示例

> 404 Response

```json
{
    "code": "160015",
    "message": "可信规则不存在",
    "data": null
}
```

> 200 Response

```json
{
  "code": "0",
  "message": "success",
  "data": {
    "id": 1,
    "ruleName": "肺结节 Lung-RADS 分级规则",
    "ruleType": "WHILE_THEN",
    "labelId": 5,
    "labelName": "演示肺结节",
    "ruleDescription": "密度为实性且长径小于 6 mm 时，Lung-RADS 分级必须为 1 或 2。",
    "ruleContent": {
      "while": {
        "logic": "AND",
        "conditions": [
          {
            "labelAttributeId": 5,
            "attributeName": "密度类型",
            "operator": "EQUALS",
            "value": "SOLID"
          },
          {
            "labelAttributeId": 4,
            "attributeName": "长径",
            "operator": "LESS_THAN",
            "value": 6
          }
        ]
      },
      "then": {
        "logic": "AND",
        "conditions": [
          {
            "labelAttributeId": 6,
            "attributeName": "Lung-RADS 分级",
            "operator": "IN",
            "value": [
              "1",
              "2"
            ]
          }
        ]
      }
    },
    "conditionSummary": "演示肺结节 / 密度类型 EQUALS \"SOLID\" 且 长径 LESS_THAN 6 -> Lung-RADS 分级 IN [\"1\",\"2\"]"
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|请求处理成功。|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|可信规则不存在或已逻辑删除。|Inline|

### 返回数据结构

状态码 **200**

*统一成功响应。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||成功响应码，固定为 0。|
|» message|string|true|none||成功响应说明，固定为 success。|
|» data|object|true|none||可信规则详情。|
|»» id|integer(int64)|true|none||可信规则主键 ID。|
|»» ruleName|string|true|none||规则名称。|
|»» ruleType|string|true|none||规则类型。|
|»» labelId|integer(int64)|true|none||规则所属标签 ID。|
|»» labelName|string|true|none||规则所属标签名称，由服务端根据 labelId 查询。|
|»» ruleDescription|string¦null|false|none||规则说明，未设置时为 null。|
|»» ruleContent|object|true|none||可信规则条件树。数据库仅保存 while、then 和叶子条件的 labelAttributeId、operator、value。|
|»»» then|object|true|none||后置条件组。所有规则类型均必填；规则执行时该组不满足即为违规。|
|»»»» logic|string|true|none||组内连接逻辑：AND 表示全部满足，OR 表示任一满足。|
|»»»» conditions|[object]|true|none||条件叶子列表，至少包含一项。|
|»»»»» labelAttributeId|integer(int64)|true|none||标签属性 ID，必须属于当前请求的 labelId 且未逻辑删除。|
|»»»»» operator|string|true|none||比较运算符。IN、NOT_IN 仅适用于 ENUM；GREATER_THAN、LESS_THAN 仅适用于 NUMBER、DATE。|
|»»»»» value|any|true|none||比较值。普通运算符传单值；IN、NOT_IN 传非空数组；值类型、范围及枚举选项必须满足标签属性 configJson 约束。|
|»»»»» attributeName|string|false|none||标签属性名称，仅详情响应补充展示，不保存到 rule_content_json，编辑请求不得传入。|
|»»» while|object¦null|false|none||前置条件组。仅 WHILE_THEN 规则返回；THEN 规则不包含该字段。|
|»»»» logic|string|true|none||组内连接逻辑：AND 表示全部满足，OR 表示任一满足。|
|»»»» conditions|[object]|true|none||条件叶子列表，至少包含一项。|
|»»»»» labelAttributeId|integer(int64)|true|none||标签属性 ID，必须属于当前请求的 labelId 且未逻辑删除。|
|»»»»» operator|string|true|none||比较运算符。IN、NOT_IN 仅适用于 ENUM；GREATER_THAN、LESS_THAN 仅适用于 NUMBER、DATE。|
|»»»»» value|any|true|none||比较值。普通运算符传单值；IN、NOT_IN 传非空数组；值类型、范围及枚举选项必须满足标签属性 configJson 约束。|
|»»»»» attributeName|string|false|none||标签属性名称，仅详情响应补充展示，不保存到 rule_content_json，编辑请求不得传入。|
|»» conditionSummary|string|true|none||服务端组装的条件摘要，仅用于列表和详情展示，不保存为独立字段。|

#### 枚举值

|属性|值|
|---|---|
|ruleType|WHILE_THEN|
|ruleType|THEN|
|logic|AND|
|logic|OR|
|operator|EQUALS|
|operator|NOT_EQUALS|
|operator|IN|
|operator|NOT_IN|
|operator|GREATER_THAN|
|operator|LESS_THAN|
|logic|AND|
|logic|OR|
|operator|EQUALS|
|operator|NOT_EQUALS|
|operator|IN|
|operator|NOT_IN|
|operator|GREATER_THAN|
|operator|LESS_THAN|

状态码 **404**

*统一错误响应。HTTP 状态码仍为 200，通过 code 区分错误类型。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码；参数校验失败为 100001，可信规则业务错误为 160014 至 160020。|
|» message|string|true|none||面向调用方的中文错误说明。|
|» data|null|true|none||错误响应数据，固定为 null。|

## PUT 更新可信规则

PUT /trusted-rules/{ruleId}

整体更新规则基础字段和条件树；前端不得提交 expression，服务端重新编译并校验表达式。

> Body 请求参数

```json
{
    "ruleName": "肺结节 Lung-RADS 分级规则",
    "ruleType": "WHILE_THEN",
    "labelId": 5,
    "ruleDescription": "密度为实性且长径小于 6 mm 时，Lung-RADS 分级必须为 1 或 2。",
    "ruleContent": {
        "while": {
            "logic": "AND",
            "conditions": [
                {
                    "labelAttributeId": 5,
                    "operator": "EQUALS",
                    "value": "SOLID"
                },
                {
                    "labelAttributeId": 4,
                    "operator": "LESS_THAN",
                    "value": 6
                }
            ]
        },
        "then": {
            "logic": "AND",
            "conditions": [
                {
                    "labelAttributeId": 6,
                    "operator": "IN",
                    "value": [
                        "1",
                        "2"
                    ]
                }
            ]
        }
    }
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|ruleId|path|integer(int64)| 是 |可信规则 ID，必须为正整数。|
|Authorization|header|string| 否 |none|
|body|body|object| 是 |none|
|» ruleName|body|string| 是 |规则名称，未删除规则范围内唯一。|
|» ruleType|body|string| 是 |规则类型。WHILE_THEN 表示 while 满足且 then 不满足时违规；THEN 表示 then 不满足时违规。|
|» labelId|body|integer(int64)| 是 |规则所属标签节点 ID，必须是未删除的 LABEL 节点。|
|» ruleDescription|body|string¦null| 否 |规则说明，可不传或传 null。|
|» ruleContent|body|object| 是 |可信规则条件树。数据库仅保存 while、then 和叶子条件的 labelAttributeId、operator、value。|
|»» then|body|object| 是 |后置条件组。所有规则类型均必填；规则执行时该组不满足即为违规。|
|»»» logic|body|string| 是 |组内连接逻辑：AND 表示全部满足，OR 表示任一满足。|
|»»» conditions|body|[object]| 是 |条件叶子列表，至少包含一项。|
|»»»» labelAttributeId|body|integer(int64)| 是 |标签属性 ID，必须属于当前请求的 labelId 且未逻辑删除。|
|»»»» operator|body|string| 是 |比较运算符。IN、NOT_IN 仅适用于 ENUM；GREATER_THAN、LESS_THAN 仅适用于 NUMBER、DATE。|
|»»»» value|body|any| 是 |比较值。普通运算符传单值；IN、NOT_IN 传非空数组；值类型、范围及枚举选项必须满足标签属性 configJson 约束。|
|»» while|body|object| 否 |前置条件组。ruleType 为 WHILE_THEN 时必填；ruleType 为 THEN 时不得传入。|
|»»» logic|body|string| 是 |组内连接逻辑：AND 表示全部满足，OR 表示任一满足。|
|»»» conditions|body|[object]| 是 |条件叶子列表，至少包含一项。|
|»»»» labelAttributeId|body|integer(int64)| 是 |标签属性 ID，必须属于当前请求的 labelId 且未逻辑删除。|
|»»»» operator|body|string| 是 |比较运算符。IN、NOT_IN 仅适用于 ENUM；GREATER_THAN、LESS_THAN 仅适用于 NUMBER、DATE。|
|»»»» value|body|any| 是 |比较值。普通运算符传单值；IN、NOT_IN 传非空数组；值类型、范围及枚举选项必须满足标签属性 configJson 约束。|

#### 枚举值

|属性|值|
|---|---|
|» ruleType|WHILE_THEN|
|» ruleType|THEN|
|»»» logic|AND|
|»»» logic|OR|
|»»»» operator|EQUALS|
|»»»» operator|NOT_EQUALS|
|»»»» operator|IN|
|»»»» operator|NOT_IN|
|»»»» operator|GREATER_THAN|
|»»»» operator|LESS_THAN|
|»»» logic|AND|
|»»» logic|OR|
|»»»» operator|EQUALS|
|»»»» operator|NOT_EQUALS|
|»»»» operator|IN|
|»»»» operator|NOT_IN|
|»»»» operator|GREATER_THAN|
|»»»» operator|LESS_THAN|

> 返回示例

> 400 Response

```json
{
    "code": "160016",
    "message": "可信规则条件配置不合法",
    "data": null
}
```

> 404 Response

```json
{
    "code": "160015",
    "message": "可信规则不存在",
    "data": null
}
```

> 200 Response

```json
{
  "code": "0",
  "message": "success",
  "data": {
    "id": 1,
    "ruleName": "肺结节 Lung-RADS 分级规则",
    "ruleType": "WHILE_THEN",
    "labelId": 5,
    "labelName": "演示肺结节",
    "ruleDescription": "密度为实性且长径小于 6 mm 时，Lung-RADS 分级必须为 1 或 2。",
    "ruleContent": {
      "while": {
        "logic": "AND",
        "conditions": [
          {
            "labelAttributeId": 5,
            "attributeName": "密度类型",
            "operator": "EQUALS",
            "value": "SOLID"
          },
          {
            "labelAttributeId": 4,
            "attributeName": "长径",
            "operator": "LESS_THAN",
            "value": 6
          }
        ]
      },
      "then": {
        "logic": "AND",
        "conditions": [
          {
            "labelAttributeId": 6,
            "attributeName": "Lung-RADS 分级",
            "operator": "IN",
            "value": [
              "1",
              "2"
            ]
          }
        ]
      }
    },
    "conditionSummary": "演示肺结节 / 密度类型 EQUALS \"SOLID\" 且 长径 LESS_THAN 6 -> Lung-RADS 分级 IN [\"1\",\"2\"]"
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|请求处理成功。|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|规则名称重复、条件树、运算符或比较值不合法。|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|待更新规则不存在。|Inline|

### 返回数据结构

状态码 **200**

*统一成功响应。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||成功响应码，固定为 0。|
|» message|string|true|none||成功响应说明，固定为 success。|
|» data|object|true|none||可信规则详情。|
|»» id|integer(int64)|true|none||可信规则主键 ID。|
|»» ruleName|string|true|none||规则名称。|
|»» ruleType|string|true|none||规则类型。|
|»» labelId|integer(int64)|true|none||规则所属标签 ID。|
|»» labelName|string|true|none||规则所属标签名称，由服务端根据 labelId 查询。|
|»» ruleDescription|string¦null|false|none||规则说明，未设置时为 null。|
|»» ruleContent|object|true|none||可信规则条件树。数据库仅保存 while、then 和叶子条件的 labelAttributeId、operator、value。|
|»»» then|object|true|none||后置条件组。所有规则类型均必填；规则执行时该组不满足即为违规。|
|»»»» logic|string|true|none||组内连接逻辑：AND 表示全部满足，OR 表示任一满足。|
|»»»» conditions|[object]|true|none||条件叶子列表，至少包含一项。|
|»»»»» labelAttributeId|integer(int64)|true|none||标签属性 ID，必须属于当前请求的 labelId 且未逻辑删除。|
|»»»»» operator|string|true|none||比较运算符。IN、NOT_IN 仅适用于 ENUM；GREATER_THAN、LESS_THAN 仅适用于 NUMBER、DATE。|
|»»»»» value|any|true|none||比较值。普通运算符传单值；IN、NOT_IN 传非空数组；值类型、范围及枚举选项必须满足标签属性 configJson 约束。|
|»»»»» attributeName|string|false|none||标签属性名称，仅详情响应补充展示，不保存到 rule_content_json，编辑请求不得传入。|
|»»» while|object¦null|false|none||前置条件组。仅 WHILE_THEN 规则返回；THEN 规则不包含该字段。|
|»»»» logic|string|true|none||组内连接逻辑：AND 表示全部满足，OR 表示任一满足。|
|»»»» conditions|[object]|true|none||条件叶子列表，至少包含一项。|
|»»»»» labelAttributeId|integer(int64)|true|none||标签属性 ID，必须属于当前请求的 labelId 且未逻辑删除。|
|»»»»» operator|string|true|none||比较运算符。IN、NOT_IN 仅适用于 ENUM；GREATER_THAN、LESS_THAN 仅适用于 NUMBER、DATE。|
|»»»»» value|any|true|none||比较值。普通运算符传单值；IN、NOT_IN 传非空数组；值类型、范围及枚举选项必须满足标签属性 configJson 约束。|
|»»»»» attributeName|string|false|none||标签属性名称，仅详情响应补充展示，不保存到 rule_content_json，编辑请求不得传入。|
|»» conditionSummary|string|true|none||服务端组装的条件摘要，仅用于列表和详情展示，不保存为独立字段。|

#### 枚举值

|属性|值|
|---|---|
|ruleType|WHILE_THEN|
|ruleType|THEN|
|logic|AND|
|logic|OR|
|operator|EQUALS|
|operator|NOT_EQUALS|
|operator|IN|
|operator|NOT_IN|
|operator|GREATER_THAN|
|operator|LESS_THAN|
|logic|AND|
|logic|OR|
|operator|EQUALS|
|operator|NOT_EQUALS|
|operator|IN|
|operator|NOT_IN|
|operator|GREATER_THAN|
|operator|LESS_THAN|

状态码 **400**

*统一错误响应。HTTP 状态码仍为 200，通过 code 区分错误类型。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码；参数校验失败为 100001，可信规则业务错误为 160014 至 160020。|
|» message|string|true|none||面向调用方的中文错误说明。|
|» data|null|true|none||错误响应数据，固定为 null。|

状态码 **404**

*统一错误响应。HTTP 状态码仍为 200，通过 code 区分错误类型。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码；参数校验失败为 100001，可信规则业务错误为 160014 至 160020。|
|» message|string|true|none||面向调用方的中文错误说明。|
|» data|null|true|none||错误响应数据，固定为 null。|

## DELETE 删除可信规则

DELETE /trusted-rules/{ruleId}

逻辑删除可信规则，将 is_deleted 更新为 1。

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|ruleId|path|integer(int64)| 是 |可信规则 ID，必须为正整数。|
|Authorization|header|string| 否 |none|

> 返回示例

> 404 Response

```json
{
    "code": "160015",
    "message": "可信规则不存在",
    "data": null
}
```

> 200 Response

```json
{
  "code": "0",
  "message": "success",
  "data": null
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|请求处理成功。|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|待删除规则不存在或已逻辑删除。|Inline|

### 返回数据结构

状态码 **200**

*统一成功响应。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||成功响应码，固定为 0。|
|» message|string|true|none||成功响应说明，固定为 success。|
|» data|null|true|none||删除成功后无业务数据，固定为 null。|

状态码 **404**

*统一错误响应。HTTP 状态码仍为 200，通过 code 区分错误类型。*

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|string|true|none||业务错误码；参数校验失败为 100001，可信规则业务错误为 160014 至 160020。|
|» message|string|true|none||面向调用方的中文错误说明。|
|» data|null|true|none||错误响应数据，固定为 null。|

# 数据模型

