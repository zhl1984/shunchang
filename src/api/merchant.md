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

# 商户管理

## GET 商户分页查询

GET /merchants

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|access_token|cookie|string| 否 |none|
|keyword|query|string| 否 |搜索商户名称|
|sortField|query|string| 否 |截止日期排序字段|
|ascSort|query|boolean| 否 |顺序还是倒序，true-顺序 false-倒序|
|pageNo|query|string| 否 |none|
|pageSize|query|string| 否 |none|
|Authorization|header|string| 否 |none|

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
                "id": 5,
                "merchantName": "果汁9",
                "expireDate": "2026-09-18",
                "contact": "yank3",
                "contactWay": "15271940027",
                "loginName": "yankgz3",
                "loginPassword": null
            },
            {
                "id": 6,
                "merchantName": "果汁4",
                "expireDate": "2026-09-15",
                "contact": "yank4",
                "contactWay": "15271940023",
                "loginName": "yankgz4",
                "loginPassword": null
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
|»» pageNo|integer|true|none||none|
|»» pageSize|integer|true|none||none|
|»» total|integer|true|none||none|
|»» list|[object]|true|none||none|
|»»» id|integer|true|none||none|
|»»» merchantName|string|true|none|商户名称|none|
|»»» expireDate|string|true|none|授权过期日期|none|
|»»» contact|string|true|none|联系人|none|
|»»» contactWay|string|true|none|联系方式|none|
|»»» loginName|string|true|none|登陆账号|none|
|»»» loginPassword|null|true|none|登陆账号密码|none|

## POST 新增商户

POST /merchants

> Body 请求参数

```json
{}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|merchantName|query|string| 是 |商户名|
|expireDate|query|string| 是 |到期时间 精确到天 yyyy-MM-dd|
|loginName|query|string| 是 |登录账号，最长 50 个字符|
|loginPassword|query|string| 是 |初始登录密码，长度为 8 至 32 个字符,允许英文大小写字母、数字及半角特殊字符,至少包含大写字母、小写字母、数字三类中的两类|
|contact|query|string| 是 |商户联系人名称，最长 50 个字符|
|contactWay|query|string| 是 |邮箱或者 11 位中国大陆手机号|
|Authorization|header|string| 否 |none|
|body|body|object| 是 |none|
|» merchantName|body|string| 是 |none|
|» expireDate|body|string| 是 |none|
|» loginName|body|string| 是 |none|
|» loginPassword|body|string| 是 |none|
|» contact|body|string| 是 |none|
|» contactWay|body|string| 是 |none|

> 返回示例

> 200 Response

```json
{}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

## GET 商户编辑回显

GET /merchants/{merchantId}

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|merchantId|path|string| 是 |none|
|Authorization|header|string| 否 |none|

> 返回示例

> 200 Response

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "id": 5,
        "merchantName": "果汁9",
        "expireDate": "2026-09-18",
        "contact": "yank3",
        "contactWay": "15271940027",
        "loginName": "yankgz3",
        "loginPassword": "******"
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
|» data|object|true|none||和列表接口结构一致|
|»» id|integer|true|none||none|
|»» merchantName|string|true|none||none|
|»» expireDate|string|true|none||none|
|»» contact|string|true|none||none|
|»» contactWay|string|true|none||none|
|»» loginName|string|true|none||none|
|»» loginPassword|string|true|none||none|

## PUT 编辑商户信息

PUT /merchants/{merchantId}

> Body 请求参数

```json
{
    "loginName": "test",
    "loginPassword": "Root123456",
    "merchantName": "testMerchant2",
    "contact": "张三",
    "contactWay": "13587452541",
    "expireDate": "2026-09-03"
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|merchantId|path|string| 是 |商户ID|
|merchantName|query|string| 是 |商户名称，最长 50 个字符|
|expireDate|query|string| 是 |商户授权截止日期|
|loginName|query|string| 是 |登录账号，最长 50 个字符|
|loginPassword|query|string| 是 |初始登录密码，长度为 8 至 32 个字符，仅允许英文大小写字母、数字及半角特殊字符，至少包含大写字母、小写字母、数字三类中的两类，且不允许连续 3 位及以上相同字符|
|contact|query|string| 是 |商户联系人名称，最长 50 个字符|
|contactWay|query|string| 是 |联系方式，邮箱或者 11 位中国大陆手机号|
|Authorization|header|string| 否 |none|
|body|body|object| 是 |none|
|» loginName|body|string| 是 |none|
|» loginPassword|body|string| 是 |none|
|» merchantName|body|string| 是 |none|
|» contact|body|string| 是 |none|
|» contactWay|body|string| 是 |none|
|» expireDate|body|string| 是 |none|

> 返回示例

> 200 Response

```json
{}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

## DELETE 删除商户

DELETE /merchants/{merchantId}

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|merchantId|path|string| 是 |商户ID|
|Authorization|header|string| 否 |none|

> 返回示例

> 200 Response

```json
{}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

# 数据模型

