# Paperchalk Demo Lab

这是 **完全独立于正式 `main/studio` 的功能实验室**。

基线来源：`b052a0ea410610d7d73acbfcb63c72eb823973a4`

## 硬规则

1. 新玩法、新建筑系统、新交互、新渲染方案先在本目录验证。
2. Demo Lab 不允许 import `studio/`、旧 `src/`、正式 `app/` 或正式 `styles/` 的业务代码。
3. 可以共享仓库里的第三方 Three.js vendor 和只读公共素材；实验状态与正式游戏存档必须分离。
4. `demo-lab` 分支不触发正式 Mobile Test Channel、APK 发布或主站发布。
5. **禁止把 `demo-lab` 分支直接 merge 到 `main`。**
6. 功能验收后，从最新 `main` 新开 promotion 分支，只移植通过验收的功能到 `studio/`，然后运行正式 Studio、Mobile、浏览器回归；通过后才进入主项目。

## 开发方式

Demo Lab 是当前 Studio 的完整快照，目录结构保持一致，方便在真实游戏环境中测试，而不是用脱离实际项目的小玩具页面验证。

实验代码只改：

```
demo-lab/
```

实验测试只改：

```
tests/demo-lab-*.mjs
```

正式项目仍然是：

```
main: studio/
```

## 晋级流程

```
idea
  ↓
demo-lab branch / demo-lab/
  ↓
Demo Lab CI
  ↓
人工画面/手机验收
  ↓
从最新 main 新开 promote/<feature>
  ↓
只移植已通过代码到 studio/
  ↓
npm run test:studio + mobile tests + browser smoke
  ↓
main
  ↓
Mobile Test Channel
```

Demo Lab 自己的 localStorage 使用 `paperworld.demo-lab.*`，不会覆盖正式 Studio 的进度。
