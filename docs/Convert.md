## 1. 接口描述

接口请求域名： ai3d.tencentcloudapi.com 。

输入3D模型文件后，可进行3D模型文件格式转换。

默认接口请求频率限制：20次/秒。

<div class="rno-api-explorer">
    <div class="rno-api-explorer-inner">
        <div class="rno-api-explorer-hd">
            <div class="rno-api-explorer-title">
                推荐使用 API Explorer
            </div>
            <a href="https://console.cloud.tencent.com/api/explorer?Product=ai3d&Version=2025-05-13&Action=Convert3DFormat" class="rno-api-explorer-btn" hotrep="doc.api.explorerbtn"><i class="rno-icon-explorer"></i>点击调试</a>
        </div>
        <div class="rno-api-explorer-body">
            <div class="rno-api-explorer-cont">
                API Explorer 提供了在线调用、签名验证、SDK 代码生成和快速检索接口等能力。您可查看每次调用的请求内容和返回结果以及自动生成 SDK 调用示例。
            </div>
        </div>
    </div>
</div>

## 2. 输入参数

以下请求参数列表仅列出了接口请求参数和部分公共参数，完整公共参数列表见 [公共请求参数](/document/api/1804/120832)。

| 参数名称 | 必选 | 类型 | 描述 |
|---------|---------|---------|---------|
| Action | 是 | String | [公共参数](/document/api/1804/120832)，本接口取值：Convert3DFormat。 |
| Version | 是 | String | [公共参数](/document/api/1804/120832)，本接口取值：2025-05-13。 |
| Region | 是 | String | [公共参数](/document/api/1804/120832)，详见产品支持的 [地域列表](/document/api/1804/120832#.E5.9C.B0.E5.9F.9F.E5.88.97.E8.A1.A8)。 |
| File3D | 是 | String | 3D文件url地址，模型文件大小≤60m，支持fbx，obj，glb格式3D文件输入。<br/>示例值：url |
| Format | 是 | String | 返回的3D文件格式，参考值：STL, USDZ, FBX, MP4, GIF。<br/>示例值：STL |

## 3. 输出参数

| 参数名称 | 类型 | 描述 |
|---------|---------|---------|
| ResultFile3D | String | 3D文件地址<br/>示例值：url|
| RequestId | String | 唯一请求 ID，由服务端生成，每次请求都会返回（若请求因其他原因未能抵达服务端，则该次请求不会获得 RequestId）。定位问题时需要提供该次请求的 RequestId。|

## 4. 示例

### 示例1 调用请求示例

#### 输入示例

```
POST / HTTP/1.1
Host: ai3d.tencentcloudapi.com
Content-Type: application/json
X-TC-Action: Convert3DFormat
<公共请求参数>

{
    "Format": "STL",
    "File3D": "https://cos.ap-guangzhou.tencentcos.cn/xxx.zip"
}
```

#### 输出示例

```json
{
    "Response": {
        "RequestId": "78722611-9e48-43fd-8e27-2672bae39d7b",
        "ResultFile3D": "https://cos.ap-guangzhou.tencentcos.cn/xxx.stl"
    }
}
```


## 5. 开发者资源

### 腾讯云 API 平台

[腾讯云 API 平台](https://cloud.tencent.com/api) 是综合 API 文档、错误码、API Explorer 及 SDK 等资源的统一查询平台，方便您从同一入口查询及使用腾讯云提供的所有 API 服务。

### API Inspector

用户可通过 [API Inspector](https://cloud.tencent.com/document/product/1278/49361) 查看控制台每一步操作关联的 API 调用情况，并自动生成各语言版本的 API 代码，也可前往 [API Explorer](https://cloud.tencent.com/document/product/1278/46697) 进行在线调试。

### SDK

云 API 3.0 提供了配套的开发工具集（SDK），支持多种编程语言，能更方便的调用 API。
* Tencent Cloud SDK 3.0 for Python: [CNB](https://cnb.cool/tencent/cloud/api/sdk/tencentcloud-sdk-python/-/blob/master/tencentcloud/ai3d/v20250513/ai3d_client.py), [GitHub](https://github.com/TencentCloud/tencentcloud-sdk-python/blob/master/tencentcloud/ai3d/v20250513/ai3d_client.py), [Gitee](https://gitee.com/TencentCloud/tencentcloud-sdk-python/blob/master/tencentcloud/ai3d/v20250513/ai3d_client.py)
* Tencent Cloud SDK 3.0 for Java: [CNB](https://cnb.cool/tencent/cloud/api/sdk/tencentcloud-sdk-java/-/blob/master/src/main/java/com/tencentcloudapi/ai3d/v20250513/Ai3dClient.java), [GitHub](https://github.com/TencentCloud/tencentcloud-sdk-java/blob/master/src/main/java/com/tencentcloudapi/ai3d/v20250513/Ai3dClient.java), [Gitee](https://gitee.com/TencentCloud/tencentcloud-sdk-java/blob/master/src/main/java/com/tencentcloudapi/ai3d/v20250513/Ai3dClient.java)
* Tencent Cloud SDK 3.0 for PHP: [CNB](https://cnb.cool/tencent/cloud/api/sdk/tencentcloud-sdk-php/-/blob/master/src/TencentCloud/Ai3d/V20250513/Ai3dClient.php), [GitHub](https://github.com/TencentCloud/tencentcloud-sdk-php/blob/master/src/TencentCloud/Ai3d/V20250513/Ai3dClient.php), [Gitee](https://gitee.com/TencentCloud/tencentcloud-sdk-php/blob/master/src/TencentCloud/Ai3d/V20250513/Ai3dClient.php)
* Tencent Cloud SDK 3.0 for Go: [CNB](https://cnb.cool/tencent/cloud/api/sdk/tencentcloud-sdk-go/-/blob/master/tencentcloud/ai3d/v20250513/client.go), [GitHub](https://github.com/TencentCloud/tencentcloud-sdk-go/blob/master/tencentcloud/ai3d/v20250513/client.go), [Gitee](https://gitee.com/TencentCloud/tencentcloud-sdk-go/blob/master/tencentcloud/ai3d/v20250513/client.go)
* Tencent Cloud SDK 3.0 for Node.js: [CNB](https://cnb.cool/tencent/cloud/api/sdk/tencentcloud-sdk-nodejs/-/blob/master/src/services/ai3d/v20250513/ai3d_client.ts), [GitHub](https://github.com/TencentCloud/tencentcloud-sdk-nodejs/blob/master/src/services/ai3d/v20250513/ai3d_client.ts), [Gitee](https://gitee.com/TencentCloud/tencentcloud-sdk-nodejs/blob/master/src/services/ai3d/v20250513/ai3d_client.ts)
* Tencent Cloud SDK 3.0 for .NET: [CNB](https://cnb.cool/tencent/cloud/api/sdk/tencentcloud-sdk-dotnet/-/blob/master/TencentCloud/Ai3d/V20250513/Ai3dClient.cs), [GitHub](https://github.com/TencentCloud/tencentcloud-sdk-dotnet/blob/master/TencentCloud/Ai3d/V20250513/Ai3dClient.cs), [Gitee](https://gitee.com/TencentCloud/tencentcloud-sdk-dotnet/blob/master/TencentCloud/Ai3d/V20250513/Ai3dClient.cs)
* Tencent Cloud SDK 3.0 for C++: [CNB](https://cnb.cool/tencent/cloud/api/sdk/tencentcloud-sdk-cpp/-/blob/master/ai3d/src/v20250513/Ai3dClient.cpp), [GitHub](https://github.com/TencentCloud/tencentcloud-sdk-cpp/blob/master/ai3d/src/v20250513/Ai3dClient.cpp), [Gitee](https://gitee.com/TencentCloud/tencentcloud-sdk-cpp/blob/master/ai3d/src/v20250513/Ai3dClient.cpp)
* Tencent Cloud SDK 3.0 for Ruby: [CNB](https://cnb.cool/tencent/cloud/api/sdk/tencentcloud-sdk-ruby/-/blob/master/tencentcloud-sdk-ai3d/lib/v20250513/client.rb), [GitHub](https://github.com/TencentCloud/tencentcloud-sdk-ruby/blob/master/tencentcloud-sdk-ai3d/lib/v20250513/client.rb), [Gitee](https://gitee.com/TencentCloud/tencentcloud-sdk-ruby/blob/master/tencentcloud-sdk-ai3d/lib/v20250513/client.rb)

### 命令行工具

* [Tencent Cloud CLI 3.0](https://cloud.tencent.com/document/product/440/6176)

## 6. 错误码

该接口暂无业务逻辑相关的错误码，其他错误码详见 [公共错误码](/document/api/1804/120837#.E5.85.AC.E5.85.B1.E9.94.99.E8.AF.AF.E7.A0.81)。
