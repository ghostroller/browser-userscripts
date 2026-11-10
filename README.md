# browser-userscripts

用于管理、版本控制与 ScriptCat 订阅更新的浏览器用户脚本合集。

> 当前仅完成仓库初始化，尚未收录实际脚本。订阅清单为空，不会安装任何脚本。

## 使用

- **整包订阅：** [安装或订阅全部脚本](https://raw.githubusercontent.com/ghostroller/browser-userscripts/main/subscriptions/all.user.sub.js)
- **查看订阅清单：** [all.user.sub.js](subscriptions/all.user.sub.js)
- **单独安装：** 后续可打开 `scripts/` 中具体的 `.user.js` 文件，点击 GitHub 的 **Raw** 按钮进行安装。

先在浏览器安装 [ScriptCat](https://docs.scriptcat.org/docs/use/use/)，再打开上面的订阅直链并确认。如果只显示源码，可在 ScriptCat 的订阅管理中添加该链接。

## 目录

```text
browser-userscripts/
├── README.md
├── .gitignore
├── scripts/
│   └── README.md
└── subscriptions/
    └── all.user.sub.js
```

`scripts/` 存放可直接安装的脚本；`subscriptions/` 存放 ScriptCat 订阅清单。每个脚本保持独立文件与版本，不需要构建工具。

## 添加脚本

1. 将已检查的脚本放入 `scripts/<脚本名>.user.js`，使用稳定的英文小写文件名。
2. 根据 [脚本维护说明](scripts/README.md) 配置元数据、运行范围和最小权限。
3. 在 `subscriptions/all.user.sub.js` 的元数据块内增加一行 `@scriptUrl`，填入该文件的完整 HTTPS Raw 地址。
4. 如果脚本确实需要 `@connect` 权限，在订阅头中逐项补充需要访问的域名。订阅声明会覆盖成员脚本自己的 `@connect`；不要默认授予所有域名权限。
5. 提高订阅的 `@version`，将脚本和清单一起提交到 `main`。

公开仓库不应包含密码、Cookie、访问令牌、个人配置或浏览器导出备份。收录第三方脚本前检查其许可证并保留来源和必要声明。

## 更新与删除

- **修改脚本内容：** 提高该脚本的 `@version`，提交到 `main`。未改动订阅清单时，不必提高订阅版本。
- **新增、移除脚本或修改订阅权限：** 修改订阅清单，并提高订阅的 `@version`。
- **保持链接稳定：** 尽量不要移动、重命名已发布文件或更改默认分支。清单按 URL 识别成员。
- **删除须谨慎：** 从清单移除脚本后，ScriptCat 会卸载由该订阅安装的对应脚本；删除整个订阅也会卸载其管理的脚本。操作前先备份需要保留的本地数据。
- **更新不是即时推送：** 浏览器按 ScriptCat 设置的检查间隔拉取更新，也可手动检查。远端版本必须递增，单纯改动代码不等于发布新版本。

首次安装订阅需要确认。后续成员变动和更新通常静默执行；订阅新增 `@connect` 域名时会再次要求确认。仅订阅自己信任的来源。

## 同步范围

这份仓库负责 **GitHub → ScriptCat 的脚本发布与订阅更新**。在浏览器编辑脚本不会自动写回 GitHub，也不会通过这份清单同步各设备的脚本设置或运行数据。

多设备备份和同步需单独配置 ScriptCat 的 [同步与备份](https://docs.scriptcat.org/docs/use/sync/)。

## 参考

- [ScriptCat 订阅格式](https://docs.scriptcat.org/docs/dev/subscribe/)
- [脚本元数据与更新地址](https://docs.scriptcat.org/docs/dev/meta/)
- [VSCode 保存后同步到浏览器](https://docs.scriptcat.org/docs/use/vscode/)

## 许可

本仓库暂未指定统一开源许可证。公开可见不等于授予任意复用许可；后续收录脚本时应明确各文件的授权和来源。
