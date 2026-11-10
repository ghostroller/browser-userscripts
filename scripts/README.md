# 脚本维护说明

每个脚本使用独立的 `.user.js` 文件。默认订阅成员、可单独安装的脚本和本地模板见[脚本目录](../README.md#脚本)。

## 元数据

脚本开头使用 `// ==UserScript==` 与 `// ==/UserScript==` 元数据块，至少检查以下项目：

- `@name`：明确的脚本名称，发布后尽量保持稳定。
- `@namespace`：新脚本建议使用 `https://github.com/ghostroller/browser-userscripts`。名称与命名空间共同标识脚本，迁入的脚本保留原有标识。
- `@version`：采用递增版本，例如 `0.1.0`、`0.1.1`。
- `@description`：说明具体用途。
- `@match`：仅匹配实际需要运行的网站和页面，不默认匹配所有网站。
- `@grant`：仅声明实际使用的 API；不需要 GM API 时可用 `none`。
- `@updateURL` 和 `@downloadURL`：需要显式配置更新地址时，两者使用同一个 HTTPS Raw 地址。订阅成员由 `@scriptUrl` 指定来源。本地模板由使用者复制和配置。
- `@connect`：仅在确实需要对应网络访问能力时声明具体域名，并同步更新订阅的域名声明。
- `@license`：按实际授权填写，第三方代码须保留原有许可证和来源。

Raw 地址格式为：

```text
https://raw.githubusercontent.com/ghostroller/browser-userscripts/main/scripts/<脚本名>.user.js
```

将 `<脚本名>` 替换为已提交的实际文件名。不要使用 GitHub 的 `blob/` 网页地址作为下载地址。

## 本地开发与验证

在 Windows 上安装 [sctl](https://docs.scriptcat.org/docs/use/sctl/) 并启动本地服务。首次连接时，在 PowerShell 运行以下命令，将一次性配对码填入 ScriptCat 的「工具 → 外部接入 → 接入 sctl」。

```powershell
$scriptCatCli = Join-Path $env:LOCALAPPDATA 'sctl\bin\sctl.exe'
& $scriptCatCli connect
& $scriptCatCli status
& $scriptCatCli get
```

1. 在仓库修改脚本，并用 `node --check` 检查语法。
2. 测试订阅成员时，把工作副本放在被 Git 忽略的 `.local/` 下，使用单独的 `@name` 或 `@namespace`，并移除指向正式版的更新和下载地址。运行 `& $scriptCatCli install .\.local\demo.user.js`，将示例路径替换为开发副本的路径，再在浏览器中确认安装或更新。
3. 用 `@Chrome` 在已配对的 Chrome 配置中打开或刷新目标页，检查实际运行效果。如果同一配置中同时安装了开发副本和订阅版，测试时只启用一个。Chrome DevTools MCP 默认使用独立浏览器配置，使用它验收前需要在该配置中安装并配对 ScriptCat。
4. 发布时递增脚本版本。订阅成员或权限有变化时，再更新订阅清单并递增订阅版本。开发副本留在本机。

[ScriptCat 外部接入命令和确认流程](https://docs.scriptcat.org/docs/use/external-access/)

## 来源

- 高级倍速脚本来自 TheBszk，保留原有 AGPL 声明。[原作者发布页](https://greasyfork.org/scripts/479080)
- 评论属地脚本保留了 Archeb 的作者和命名空间信息。上游发布页未标注许可证。[原作者发布页](https://greasyfork.org/scripts/462151)

## 发布检查

1. 确认脚本没有密码、Cookie、令牌或个人数据。
2. 检查语法，并在目标网页和 ScriptCat 中实际测试。
3. 提高脚本版本，确保 Raw 地址可访问且返回脚本正文。
4. 新增或移除订阅成员时，同时修改订阅清单并提高订阅版本。
5. 提交后在 ScriptCat 中手动检查一次更新，确认运行范围与功能。
