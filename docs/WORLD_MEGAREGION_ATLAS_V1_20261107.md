# 《错位日常》霧湾都市圈｜山海大世界地图与交通系统 V1

> 当前状态：数据、可缩放地图和跨市移动原型已写入网站。地点使用网上临时实景照片。**不是已完成 121 张 Anima 场景，也不是全部 121 条完整可玩的调查任务。** 后续可替换单张照片、制作场景和事件。

## 交通现实性原则

- 城市核心：市内地铁、轻轨、有轨电车；出城线路可与城际/私铁直通。
- 跨市：城际铁路、私铁、区域普通列车；高速巴士和城际道路为补充，**不是只能开高速公路**。
- 乡村与山地：地方铁路、巴士、山路，服务较稀疏；跨海岛屿：定期渡轮。
- 先计算真实可达路线/时间，再变更存档地点。无可用线路则不允许传送。

## 都市地貌与分层地图

- 西北赤樫山脉、幽杉深林及奥沢山区，地势限制铁路和公路的走向；山谷保留村镇、废校与旧林道。
- 北部冲积大平田，稻田、农渠、单线铁路、农庄与农村小站形成疏密不同的乡镇区域。
- 中部霧浜多中心都心，南丘物流园、西部桐原旧城、东部汐凪港各自有完整生活圈。
- 东部不规则内海、河口、人工港、岬崎半岛、外海浦岛群岛；轮渡和沿海公交接驳。
- 水穗湖泊、水库旧村及山麓温泉结合低密度地方线路。
- 全域缩放使用相同世界坐标；近距离才显示 121 个地点的照片及市内各站，避免手机信息爆炸。

## 10 座城市与乡镇

| ID | 城市或乡镇 | 性质 | 世界坐标 | 大致人口（万人，虚构设定） |
|---|---|---|---|---:|
| kirihama | 霧浜市 | 湾岸主都心 | (1080,598) | 860 |
| kirihara | 桐原市 | 西部旧城与学园 | (710,470) | 138 |
| homori | 穗森市 | 北部大平田 | (1290,274) | 94 |
| shiomi | 汐凪市 | 港湾工业新城 | (1540,634) | 112 |
| minamioka | 南丘市 | 物流与旧工业 | (1000,967) | 82 |
| misaki | 岬崎市 | 海岬渔港 | (1652,929) | 29 |
| okuzawa | 奥沢町 | 山麓温泉与水库 | (451,738) | 18 |
| naruba | 鳴羽町 | 山峡与林场 | (378,341) | 12 |
| mizuho | 水穗町 | 湖滨农庄 | (690,999) | 13 |
| urasima | 浦岛村 | 离岛渡船 | (1854,1070) | 3 |

## 14 项区域交通服务

| ID | 交通线 | 方式 | 依次途经城市 |
|---|---|---|---|
| jr-bay | 湾岸本线 | 城际铁路 | 桐原市 → 霧浜市 → 汐凪市 → 岬崎市 |
| jr-north | 北野城际线 | 城际铁路 | 霧浜市 → 穗森市 |
| jr-west | 山麓地方铁路 | 地方铁路 | 鳴羽町 → 桐原市 → 霧浜市 → 南丘市 → 水穗町 |
| jr-west-valley | 奥沢山谷支线 | 地方铁路 | 桐原市 → 奥沢町 → 水穗町 |
| jr-south | 南丘联络线 | 城际铁路 | 霧浜市 → 南丘市 → 汐凪市 |
| express-north | 北环高速巴士 | 高速巴士 | 霧浜市 → 穗森市 → 鳴羽町 |
| express-west | 深山高速巴士 | 高速巴士 | 霧浜市 → 桐原市 → 奥沢町 |
| road-forest | 林道乡村巴士 | 地方巴士 | 鳴羽町 → 奥沢町 → 水穗町 |
| road-coast | 半岛海岸巴士 | 地方巴士 | 汐凪市 → 岬崎市 |
| highway-west | 西湾高速公路 | 高速公路 | 桐原市 → 霧浜市 → 汐凪市 |
| highway-east | 北陆高速公路 | 高速公路 | 鳴羽町 → 穗森市 → 汐凪市 |
| highway-south | 南峡高速公路 | 高速公路 | 奥沢町 → 水穗町 → 南丘市 → 岬崎市 |
| ferry-urasima | 浦岛定期渡轮 | 渡轮 | 汐凪市 → 浦岛村 |
| ferry-peninsula | 海湾客船 | 渡轮 | 岬崎市 → 浦岛村 |

## 市内轨道规划

| 线路 | 所在城市 | 原型车站数 |
|---|---|---:|
| 霧浜南北线 | 霧浜市 | 13 |
| 霧浜东西线 | 霧浜市 | 13 |
| 湾岸新都心线 | 霧浜市 | 13 |
| 环都心线 | 霧浜市 | 12 |
| 学园线 | 霧浜市 | 13 |
| 旧城横贯线 | 桐原市 | 13 |
| 桐原环线 | 桐原市 | 12 |
| 汐凪港湾线 | 汐凪市 | 13 |
| 南丘轻轨 | 南丘市 | 13 |

## 121 处已定位城市与乡村地点

| 地点 ID | 名称 | 所在地 | 类型 | 配图键 | 游戏状态 |
|---|---|---|---|---|---|
| entrance | 家 | 霧浜市 | home | residential | 日常 |
| school | 桐音高中 | 霧浜市 | school | school | 日常 |
| convenience | 街角便利店 | 霧浜市 | convenience | shop | 日常 |
| cafe | 林道咖啡厅 | 霧浜市 | cafe | cafe | 日常 |
| mall | 湾岸购物城 | 霧浜市 | mall | mall | 日常 |
| park | 青柳公园 | 霧浜市 | park | park | 日常 |
| hospital | 市立总医院 | 霧浜市 | hospital | hospital | 未开放 |
| station | 中央总站 | 霧浜市 | station | station | 未开放 |
| police | 霧浜警察署 | 霧浜市 | police | street | 未开放 |
| kirihama-01 | 中央站东口 | 霧浜市 | station | station | 规划 |
| kirihama-02 | 都心地下街 | 霧浜市 | rumor | street | 规划 |
| kirihama-03 | 霞桥高架 | 霧浜市 | rumor | bridge | 规划 |
| kirihama-04 | 市民图书馆 | 霧浜市 | landmark | school | 规划 |
| kirihama-05 | 中央大学 | 霧浜市 | school | school | 规划 |
| kirihama-06 | 西区旧医院 | 霧浜市 | rumor | hospital | 规划 |
| kirihama-07 | 晨雾公寓 | 霧浜市 | rumor | residential | 规划 |
| kirihama-08 | 湾岸电影院 | 霧浜市 | landmark | mall | 规划 |
| kirihama-09 | 灯下电话亭 | 霧浜市 | rumor | street | 规划 |
| kirihama-10 | 梧桐商业街 | 霧浜市 | landmark | street | 规划 |
| kirihama-11 | 北环铁路桥 | 霧浜市 | rumor | bridge | 规划 |
| kirihama-12 | 西仓库列车库 | 霧浜市 | rumor | factory | 规划 |
| kirihama-13 | 花町夜间诊所 | 霧浜市 | hospital | hospital | 规划 |
| kirihama-14 | 香澄河堤 | 霧浜市 | park | park | 规划 |
| kirihama-15 | 新区音乐厅 | 霧浜市 | landmark | mall | 规划 |
| kirihama-16 | 地下调蓄池入口 | 霧浜市 | rumor | tunnel | 规划 |
| kirihama-17 | 榛木神社 | 霧浜市 | shrine | shrine | 规划 |
| kirihama-18 | 郊外巴士总站 | 霧浜市 | station | station | 规划 |
| kirihama-19 | 旧书店二楼 | 霧浜市 | rumor | cafe | 规划 |
| kirihama-20 | 水门公园 | 霧浜市 | park | park | 规划 |
| kirihama-21 | 铁路资料馆 | 霧浜市 | landmark | station | 规划 |
| kirihara-01 | 旧街商店街 | 桐原市 | town | street | 规划 |
| kirihara-02 | 桐原师范学院 | 桐原市 | school | school | 规划 |
| kirihara-03 | 西街旧剧场 | 桐原市 | rumor | street | 规划 |
| kirihara-04 | 枫叶住宅坡 | 桐原市 | home | residential | 规划 |
| kirihara-05 | 旧市民病院 | 桐原市 | rumor | hospital | 规划 |
| kirihara-06 | 赤砖铁桥 | 桐原市 | rumor | bridge | 规划 |
| kirihara-07 | 市立美术馆 | 桐原市 | landmark | mall | 规划 |
| kirihara-08 | 松阴坂隧道 | 桐原市 | tunnel | tunnel | 规划 |
| kirihara-09 | 旧城高中 | 桐原市 | school | school | 规划 |
| kirihara-10 | 朝市广场 | 桐原市 | town | street | 规划 |
| kirihara-11 | 桐原河堤 | 桐原市 | park | park | 规划 |
| kirihara-12 | 未完成地下通道 | 桐原市 | rumor | darktunnel | 规划 |
| homori-01 | 穗森大平田 | 穗森市 | rural | rice | 规划 |
| homori-02 | 东稻原村 | 穗森市 | rural | rice | 规划 |
| homori-03 | 青苗农渠 | 穗森市 | rumor | rice | 规划 |
| homori-04 | 霞稻神社 | 穗森市 | shrine | shrine | 规划 |
| homori-05 | 田间无人站台 | 穗森市 | rumor | ruraltrain | 规划 |
| homori-06 | 平田农机棚 | 穗森市 | rumor | ruraltrain | 规划 |
| homori-07 | 白穗乡道 | 穗森市 | rumor | rice | 规划 |
| homori-08 | 北部道之驿 | 穗森市 | town | village | 规划 |
| homori-09 | 废弃米仓 | 穗森市 | rumor | oldvillage | 规划 |
| homori-10 | 村祭会场 | 穗森市 | landmark | village | 规划 |
| homori-11 | 穗森农贸市集 | 穗森市 | town | rice | 规划 |
| homori-12 | 旧小学讲堂 | 穗森市 | rumor | schoolruin | 规划 |
| shiomi-01 | 港湾国际码头 | 汐凪市 | port | harbor | 规划 |
| shiomi-02 | 东海物流城 | 汐凪市 | factory | factory | 规划 |
| shiomi-03 | 海滨电车总站 | 汐凪市 | station | station | 规划 |
| shiomi-04 | 汐凪海雾仓库 | 汐凪市 | rumor | factory | 规划 |
| shiomi-05 | 中央货运站 | 汐凪市 | station | station | 规划 |
| shiomi-06 | 旧冷藏库 | 汐凪市 | rumor | factory | 规划 |
| shiomi-07 | 临海医院 | 汐凪市 | hospital | hospital | 规划 |
| shiomi-08 | 港桥高架 | 汐凪市 | rumor | bridge | 规划 |
| shiomi-09 | 工业岛栈桥 | 汐凪市 | port | harbor | 规划 |
| shiomi-10 | 码头夜班食堂 | 汐凪市 | cafe | cafe | 规划 |
| shiomi-11 | 第二海底隧道 | 汐凪市 | tunnel | tunnel | 规划 |
| shiomi-12 | 海洋研究中心 | 汐凪市 | landmark | factory | 规划 |
| minamioka-01 | 南丘工业园 | 南丘市 | factory | factory | 规划 |
| minamioka-02 | 西物流高速口 | 南丘市 | landmark | bridge | 规划 |
| minamioka-03 | 旧铸造厂 | 南丘市 | rumor | factory | 规划 |
| minamioka-04 | 青叶住宅城 | 南丘市 | home | residential | 规划 |
| minamioka-05 | 环南医院 | 南丘市 | hospital | hospital | 规划 |
| minamioka-06 | 南丘夜市 | 南丘市 | landmark | street | 规划 |
| minamioka-07 | 废热电厂 | 南丘市 | rumor | factory | 规划 |
| minamioka-08 | 河口雨水泵站 | 南丘市 | rumor | tunnel | 规划 |
| minamioka-09 | 旧教堂路口 | 南丘市 | rumor | street | 规划 |
| minamioka-10 | 南丘巴士中心 | 南丘市 | station | station | 规划 |
| misaki-01 | 岬崎渔港 | 岬崎市 | port | fishing | 规划 |
| misaki-02 | 古海街道 | 岬崎市 | town | village | 规划 |
| misaki-03 | 白灯塔 | 岬崎市 | rumor | coast | 规划 |
| misaki-04 | 第七海蚀洞 | 岬崎市 | rumor | coast | 规划 |
| misaki-05 | 岬崎民宿203室 | 岬崎市 | rumor | village | 规划 |
| misaki-06 | 海滨废酒店 | 岬崎市 | rumor | oldvillage | 规划 |
| misaki-07 | 悬崖公路 | 岬崎市 | rumor | coast | 规划 |
| misaki-08 | 东隧道口 | 岬崎市 | tunnel | tunnel | 规划 |
| misaki-09 | 海角神社 | 岬崎市 | shrine | shrine | 规划 |
| misaki-10 | 最后巴士站 | 岬崎市 | rumor | station | 规划 |
| okuzawa-01 | 奥沢温泉街 | 奥沢町 | town | onsen | 规划 |
| okuzawa-02 | 月影水库管理所 | 奥沢町 | lake | lake | 规划 |
| okuzawa-03 | 旧水没村 | 奥沢町 | rumor | oldvillage | 规划 |
| okuzawa-04 | 疗养院旧馆 | 奥沢町 | rumor | schoolruin | 规划 |
| okuzawa-05 | 深山温泉旅馆 | 奥沢町 | rumor | onsen | 规划 |
| okuzawa-06 | 山腰神社 | 奥沢町 | shrine | shrine | 规划 |
| okuzawa-07 | 环湖步道 | 奥沢町 | forest | forest | 规划 |
| okuzawa-08 | 水位观测站 | 奥沢町 | rumor | lake | 规划 |
| okuzawa-09 | 崩塌的旧县道 | 奥沢町 | rumor | tunnel | 规划 |
| okuzawa-10 | 奥沢索道废站 | 奥沢町 | rumor | forest | 规划 |
| naruba-01 | 鸣羽山脊 | 鳴羽町 | mountain | mountain | 规划 |
| naruba-02 | 赤杉林道 | 鳴羽町 | forest | forest | 规划 |
| naruba-03 | 无名旧隧道 | 鳴羽町 | tunnel | darktunnel | 规划 |
| naruba-04 | 废村雾谷 | 鳴羽町 | rumor | oldvillage | 规划 |
| naruba-05 | 铃鸣野营地 | 鳴羽町 | forest | forest | 规划 |
| naruba-06 | 三十三弯公路 | 鳴羽町 | rumor | tunnel | 规划 |
| naruba-07 | 山间巴士回转场 | 鳴羽町 | station | station | 规划 |
| naruba-08 | 旧护林站 | 鳴羽町 | rumor | oldvillage | 规划 |
| naruba-09 | 森林广播塔 | 鳴羽町 | rumor | forest | 规划 |
| naruba-10 | 山神社遗址 | 鳴羽町 | shrine | shrine | 规划 |
| mizuho-01 | 月影湖畔 | 水穗町 | lake | lake | 规划 |
| mizuho-02 | 水穗梯田 | 水穗町 | rural | rice | 规划 |
| mizuho-03 | 旧水电站 | 水穗町 | rumor | factory | 规划 |
| mizuho-04 | 北湖铁路桥 | 水穗町 | rumor | bridge | 规划 |
| mizuho-05 | 水穗小学旧址 | 水穗町 | rumor | schoolruin | 规划 |
| mizuho-06 | 湖滨民宿 | 水穗町 | town | village | 规划 |
| mizuho-07 | 水库旧环路 | 水穗町 | rumor | tunnel | 规划 |
| mizuho-08 | 河谷温泉 | 水穗町 | town | onsen | 规划 |
| urasima-01 | 浦岛渡船码头 | 浦岛村 | port | harbor | 规划 |
| urasima-02 | 无人岛礁滩 | 浦岛村 | rumor | island | 规划 |
| urasima-03 | 浦岛小学 | 浦岛村 | school | school | 规划 |
| urasima-04 | 离岛神社 | 浦岛村 | shrine | shrine | 规划 |
| urasima-05 | 岛西采石场 | 浦岛村 | rumor | oldvillage | 规划 |
| urasima-06 | 离岛灯塔 | 浦岛村 | rumor | coast | 规划 |
| urasima-07 | 旧海蚀洞 | 浦岛村 | rumor | coast | 规划 |

## 50 条怪谈线索索引（尚待编写案件流程）

| 案件 ID | 标题 | 发生地点 ID | 线索时间 |
|---|---|---|---|
| case-001 | 《都心地下街》 | kirihama-02 | 雨夜 |
| case-002 | 《霞桥高架》 | kirihama-03 | 夜间 |
| case-003 | 《西区旧医院》 | kirihama-06 | 夜间 |
| case-004 | 《晨雾公寓》 | kirihama-07 | 雨夜 |
| case-005 | 《灯下电话亭》 | kirihama-09 | 夜间 |
| case-006 | 《北环铁路桥》 | kirihama-11 | 夜间 |
| case-007 | 《西仓库列车库》 | kirihama-12 | 雨夜 |
| case-008 | 《地下调蓄池入口》 | kirihama-16 | 夜间 |
| case-009 | 《旧书店二楼》 | kirihama-19 | 夜间 |
| case-010 | 《西街旧剧场》 | kirihara-03 | 雨夜 |
| case-011 | 《旧市民病院》 | kirihara-05 | 夜间 |
| case-012 | 《赤砖铁桥》 | kirihara-06 | 夜间 |
| case-013 | 《未完成地下通道》 | kirihara-12 | 雨夜 |
| case-014 | 《青苗农渠》 | homori-03 | 夜间 |
| case-015 | 《田间无人站台》 | homori-05 | 夜间 |
| case-016 | 《平田农机棚》 | homori-06 | 雨夜 |
| case-017 | 《白穗乡道》 | homori-07 | 夜间 |
| case-018 | 《废弃米仓》 | homori-09 | 夜间 |
| case-019 | 《旧小学讲堂》 | homori-12 | 雨夜 |
| case-020 | 《汐凪海雾仓库》 | shiomi-04 | 夜间 |
| case-021 | 《旧冷藏库》 | shiomi-06 | 夜间 |
| case-022 | 《港桥高架》 | shiomi-08 | 雨夜 |
| case-023 | 《旧铸造厂》 | minamioka-03 | 夜间 |
| case-024 | 《废热电厂》 | minamioka-07 | 夜间 |
| case-025 | 《河口雨水泵站》 | minamioka-08 | 雨夜 |
| case-026 | 《旧教堂路口》 | minamioka-09 | 夜间 |
| case-027 | 《白灯塔》 | misaki-03 | 夜间 |
| case-028 | 《第七海蚀洞》 | misaki-04 | 雨夜 |
| case-029 | 《岬崎民宿203室》 | misaki-05 | 夜间 |
| case-030 | 《海滨废酒店》 | misaki-06 | 夜间 |
| case-031 | 《悬崖公路》 | misaki-07 | 雨夜 |
| case-032 | 《最后巴士站》 | misaki-10 | 夜间 |
| case-033 | 《旧水没村》 | okuzawa-03 | 夜间 |
| case-034 | 《疗养院旧馆》 | okuzawa-04 | 雨夜 |
| case-035 | 《深山温泉旅馆》 | okuzawa-05 | 夜间 |
| case-036 | 《水位观测站》 | okuzawa-08 | 夜间 |
| case-037 | 《崩塌的旧县道》 | okuzawa-09 | 雨夜 |
| case-038 | 《奥沢索道废站》 | okuzawa-10 | 夜间 |
| case-039 | 《废村雾谷》 | naruba-04 | 夜间 |
| case-040 | 《三十三弯公路》 | naruba-06 | 雨夜 |
| case-041 | 《旧护林站》 | naruba-08 | 夜间 |
| case-042 | 《森林广播塔》 | naruba-09 | 夜间 |
| case-043 | 《旧水电站》 | mizuho-03 | 雨夜 |
| case-044 | 《北湖铁路桥》 | mizuho-04 | 夜间 |
| case-045 | 《水穗小学旧址》 | mizuho-05 | 夜间 |
| case-046 | 《水库旧环路》 | mizuho-07 | 雨夜 |
| case-047 | 《无人岛礁滩》 | urasima-02 | 夜间 |
| case-048 | 《岛西采石场》 | urasima-05 | 夜间 |
| case-049 | 《离岛灯塔》 | urasima-06 | 雨夜 |
| case-050 | 《旧海蚀洞》 | urasima-07 | 夜间 |

## 资产与替换规范

- 交通图颜色、山海地理和位置与内容数据分离：`site/game/world-atlas.js` → `site/game/world-map-ui.js`/`world-map-ui.css`。
- 临时图库 `PaperWorldAtlas.PHOTOS` 使用公开网络图源，按类别复用（当前共 29 套主题），**并非每地点已拥有唯一的照片**；正式 Anima 完成后应逐张加地点独立引用，替换前须核对来源许可。
- 现有九个原故事地点沿用原 ID；已绘正式场景的地点不会被地图新模块裁剪或替换。
- 城市数据与剧情规划是原创虚构，不代表真实日本城市地理和站名。