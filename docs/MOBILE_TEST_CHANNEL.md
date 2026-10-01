# 手机测试通道

Android 原生壳使用固定的 `app/channel.json` 通道地址，启动时查询版本，再打开该指针指定的工作室页面。网页内容只有在 `main` 上通过检查并完成 Pages 发布后才成为最新版；本地尚未提交、只存在开发分支或检查失败的改动不会送到手机。

浏览器也可通过固定的 `app/` 入口检查同一通道。网页入口与 Android 壳都指向同一已发布版本；Android 直接请求通道 JSON，不依赖该跳转页。

## 内容与安装包的边界

- 游戏场景、界面、素材、交互和光影属于网页内容，发布后由 App 检查并加载。
- Android 权限、系统兼容性和原生壳代码属于安装包；修改这些内容仍需重新安装 APK。
- 没有网络时无法取得新发布内容。旧版本是否能够完整离线使用，由 App 的缓存与恢复实现决定，不能仅凭浏览器缓存承诺离线运行。
- 每次发布标识是完整 Git 提交号，工作室的 `build-info.json` 与通道指针使用同一个版本号和时间。

## 源码目录

| 路径 | 用途 |
| --- | --- |
| `android-app/` | Android 安装包、通道检查与原生更新界面 |
| 源码 `app/index.html` | 浏览器的固定测试入口，校验通道后打开最新页面 |
| 线上 `app/` | 工作流生成的版本指针与不可变网页快照 |
| `studio/` | 实际运行的重构工作室与游戏代码 |
| `tools/build-mobile-release.mjs` | 无额外依赖的不可变版本打包器 |
| `tests/mobile-release.test.mjs` | 发布完整性、路径、版本与失败保护测试 |
| `.github/workflows/mobile-preview.yml` | 主分支检查、版本生成、历史保存和 Pages 发布 |
| `mobile-releases` Git 分支 | 工作流管理的生成文件；不放进 `main` 源码 |

## 发布目录

```text
app/
  index.html                  浏览器的固定测试入口
  channel.json                最新通过检查的版本指针
  releases/
    <完整提交号>/
      manifest.json           文件大小与 SHA-256 校验值
      studio/
        index.html
        app.js
        build-info.json
        ...
      vendor/three/...
      assets/player/...
      visual-demo.html
```

版本目录保留原来的相对路径关系。同一提交号下的文件不会被覆盖，因此一次加载不会混用不同版本的脚本与图片。现阶段工作流保留全部已发布版本，不自动删除；持续发布后应依据实际站点体积制定保留策略，再调整旧版本回退范围。

通道格式：

```json
{
  "schemaVersion": 1,
  "version": "0123456789abcdef0123456789abcdef01234567",
  "entry": "releases/0123456789abcdef0123456789abcdef01234567/studio/index.html",
  "publishedAt": "2026-10-01T08:00:00.000Z",
  "minShellVersion": 5
}
```

`entry` 始终相对 `app/`。壳必须校验版本、入口目录与自身版本，并对通道检查使用网络请求与缓存失效机制；不能把任意远程地址当作工作室入口。

## 自动发布

1. 把验收过的重构改动合并或提交到 `main`。
2. `Publish Mobile Test Channel` 检查原主站、新工作室和移动端测试。任一失败即停止发布。
3. 工作流保留当前 `main` 的完整网站，并从 `mobile-releases` 分支取回以前的不可变版本。
4. 打包器先复制全部必需内容，再核对静态模块、样式、图片与 Demo 引用，生成逐文件校验清单，最后原子替换 `channel.json`。
5. 工作流把生成的 `app/` 保存到 `mobile-releases`，通过官方 Pages artifact 部署完整网站。根目录旧主站继续保留。
6. 手机下次检查通道时获取最新成功部署的版本。发布完成前继续使用已发布版本。

发布工作流只从 `main` 执行；`mobile-releases` 不触发自身。发布任务串行且不中途取消；排队时已经过时的提交会跳过。GitHub Pages 必须使用 **GitHub Actions** 发布来源，且 `github-pages` 部署环境须允许 `main`。

选择显式 Pages artifact 部署是因为 `GITHUB_TOKEN` 推送产生的提交不会自动触发分支式 Pages 构建。不要依赖生成分支的提交来间接触发上线。

## 本地检查

```sh
node --test tests/mobile-*.test.mjs
node tools/build-mobile-release.mjs --output /absolute/path/to/site-staging --version <提交号>
```

可选参数 `--source <源码目录>` 和 `--published-at <ISO时间>` 用于 CI 与确定性测试。输出必须是独立站点目录，不能写进 `studio/`、`vendor/three/` 或 `assets/player/`。已有版本必须字节一致才能再次使用；缺失文件、越界依赖、符号链接或并发发布锁都会中止，保留原通道。

## 回退与诊断

- 先查看 Actions 中最近一次 `Publish Mobile Test Channel` 是否成功，再比较线上 `app/channel.json` 与工作室显示的版本。
- 页面报缺失资源时检查该版本的 `manifest.json`，不要把旧文件覆盖进现有版本目录。
- 正常回退方式是在 `main` 撤销有问题的修改，生成新的通过测试的提交并重新发布。历史资源继续保留。
- 仅在确定没有发布任务运行时，才可清理本地残留的 `.mobile-release.lock`；正常工作流会自动释放锁。

## 官方依据

- GitHub Pages 自定义工作流与部署权限：<https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>
- GitHub Pages 发布来源与 `GITHUB_TOKEN` 触发限制：<https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>
