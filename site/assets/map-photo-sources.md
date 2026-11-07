# 城市地图地点照片（临时素材清单）

本文件记录程序地图中使用的**临时网络实景照片**，以便后续一张张替换为 Anima 正式场景截图。它们只是氛围参考，并不代表游戏中实际学校/商店的身份或地址。

地图图片配置的唯一入口：`site/game/transit-map-ui.js` 文件顶部的 `PHOTO`。

| 地点节点 | 当前临时图片来源 | 游戏本地断网备份 |
| --- | --- | --- |
| 家（entrance） | https://commons.wikimedia.org/wiki/File:Residential_area.jpg | `./assets/scenes/entrance.webp` |
| 学校（school） | https://commons.wikimedia.org/wiki/File:Horikoshi_High_School_(external_appearance).jpg | `./assets/classroom.webp` |
| 便利店（convenience） | https://commons.wikimedia.org/wiki/File:Family-Mart-store_JA-Izumo-Otsu.jpg | `./assets/locations/convenience.svg` |
| 咖啡厅（cafe） | https://commons.wikimedia.org/wiki/File:Cafe_Casa,_Tokyo_2021.jpg | `./assets/locations/cafe.svg` |
| 商场（mall） | https://commons.wikimedia.org/wiki/File:Shinjuku_Keio-Department-store.jpg | `./assets/locations/mall.svg` |
| 公园（park） | https://commons.wikimedia.org/wiki/File:Fuchu-city.Tokyo.Japan.Keyaki.namiki.dori.fuchu.jpg | `./assets/locations/park.svg` |

**版权注意：** 这些图片来自 Wikimedia Commons 等公开图库，但各自授权不同。需要按图片来源页面的许可条款提供署名；替换正式画面后，应清理不用的临时来源和相应署名。不要将这些现实拍摄地点写入游戏设定。

## Anima 替换规则

1. 每个目的地只替换一张**独立纯画面**，不要把线路、文字、菜单、边框或地图背景烘焙进素材。
2. 建议 16:10 左右构图（程序中的照片框为约 1.64:1），留出主体裁切余量。
3. 统一摄影机高度、阴天无强光、低饱和度的现代日式都市悬疑氛围。地图暗色处理由程序执行。
4. 把正式图片存入 `site/assets/locations/map/` 并把上面 `PHOTO` 对应键的第一个 URL 改为本地路径即可。交通节点位置、换乘拓扑和动作菜单完全不用改。
5. 所有站名和选项由程序动态生成。未绘制的中央站、北街口继续使用简洁的轨道节点。
