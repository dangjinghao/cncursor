# cncursor

基于nodejieba，为VS Code提供基于中文分词的光标移动支持。

## Features

- 基于中文分词的左右移动
- 基于中文分词的左右选择
- 基于中文分词的左右分词删除

## Requirements

原则上，在[nodejieba的releases](https://github.com/yanyiwu/nodejieba/releases)中列出的所有平台均受支持。

### Passed Platform

- Linux-x64
- darwin-arm(macOS M1)

## Extension Setting

本拓展会自动覆盖`ctrl+箭头`、`ctrl+shift+箭头`、`ctrl+backspace`等`cursorWord*`基础操作的按键绑定（mac上`ctrl`替换为`cmd`），如果出现问题，禁止插件后重启VS Code即可。

## Known Issues

VS Code所携带的node运行时可能过新，导致无法匹配到可从nodejieba的releases中下载的二进制文件。

此时会弹出一个警告弹窗，并尝试下载可下载的最新ABI版本的二进制文件，如果之后的操作**没有闪退**并成功开启中文分词功能，则说明ABI兼容，无需在意警告弹窗。

## Release Notes

- 0.1.0 提供可替换`cursorWord*`的基础功能，并默认自动覆盖这些功能，区分`darwin`和其他的环境的按键绑定配置。


## TODO List

- 支持工作区级的用户字典
- 支持清空与重新下载功能
- 支持导入字典
- 完善测试用例
- 上传到市场
- 自动构建
