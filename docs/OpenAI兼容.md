混元生3D  API 兼容了 OpenAI 的接口规范，这意味着您可以在 OpenAI 中使用 cURL 来调用混元大模型。您仅需要将 base_url 和 api_key 替换成混元的相关配置，不需要对应用做额外修改，即可无缝将您的应用切换到混元生3D（专业版）。
- base_url：`https://api.ai3d.cloud.tencent.com`。

- api_key：需在控制台 [API KEY 页面](https://console.cloud.tencent.com/hunyuan/start) 进行创建，操作步骤请参见 [API Key 管理](https://cloud.tencent.com/document/product/1729/111008)。

- 提交生成接口请求地址完整路径：`https://api.ai3d.cloud.tencent.com/v1/ai3d/submit`。

- 提交查询接口请求地址完整路径：`https://api.ai3d.cloud.tencent.com/v1/ai3d/query`。


# 混元生3D（专业版）
- 目前接口仅支持混元生3D（专业版），您可通过输入图片或文本，输出完整的3D 模型，详情请参见 [提交混元生3D专业版任务](https://cloud.tencent.com/document/product/1804/123447) 。

- **【Model】**为混元生3D模型版本，可选值：3.0，3.1，选择3.1版本时，LowPoly，Sketch参数不可用，默认为3.0**。**

- `ImageUrl.Url` 支持**图片链接**和**图片 base64**两种方式。其中**图片 base64**的格式为："data:image/jpeg;base64,xxxxxxx"（注意：`data:image/jpeg;base64`之后的逗号需使用英文逗号）。


   提交3D 生成任务，示例如下：


   


【cURL】
``` java
curl --location 'https://api.ai3d.cloud.tencent.com/v1/ai3d/submit' \
--header 'Authorization: sk-A*******ZZZ' \
--header 'Content-Type: application/json' \
--data '{
    "Prompt":" 小狗"
}'
```


   获取 JobID 后，可使用 JobID 查询对应生成任务，示例如下：


   


【cURL】
``` java
curl --location 'https://api.ai3d.cloud.tencent.com/v1/ai3d/query' \
--header 'Authorization: sk-A******ZZZ' \
--header 'Content-Type: application/json' \
--data '{
    "JobId":"1387416933258346496"
}'
```


key for test: sk-PLkcoiQRToXZzf6au5eJQMzGbEbS4cJzwSnclJQtWGJUyhz4


