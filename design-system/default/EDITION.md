# 广汉旅行画册 · 2026-10-11

## 方向与边界

面向第一次到访、周末停留和文化旅行的人。首屏以青铜人头像与宋体标题建立古蜀辨识度，正文用不对称摄影、纸张底色、细线与适量留白组织城市故事。重点是读故事、选路线、查出行、保存行程。沿用 MASTER.md 的青铜、金、米白与中文系统字体，不增加字体服务或 JavaScript 框架。

`scripts/build-home.js` 生成策展式首页；`scripts/edition-shell.js` 在构建时为五个工具/总览页生成摄影题页。`assets/css/edition.css` 是共享画册样式的唯一入口，最后加载；`assets/js/edition.js` 只增强首页路线匹配。事实、预约提示、路线与地点仍来自原有内容文件，收藏和行程仍共用原状态。

## 选定的组件与具体落点

| 上游 | 使用方式 | 落点 |
|---|---|---|
| HyperUI / application/timelines/1 | 将连续竖线、独立里程点与时间正文结构转为本站 CSS，保留本来的语义内容 | 路线页 `.route-schedule`、`.schedule-stop` |
| HyperUI / application/steps/2 | 采用细轨道与已完成段的进度呈现，改为有标签的原生 progress | 我的行程 `.checklist-meter`，由原清单状态更新 |
| HyperUI / marketing/blog-cards/4 | 参考元数据、标题、补充标签的层次，重新设计摄影推荐结果 | 首页 `.route-match__copy`，并非照搬整卡 |
| Uiverse / cssbuttons-io / mean-dolphin-24 | 改编轨道和滑块的几何样式；保留原有 button role=switch 和键盘操作，移除隐藏 checkbox、金属纹理与颜色外观 | 阅读护照的动态效果开关 |
| Codrops / SlideshowAnimations | 仅参考摄影帧切换与稳定文字的节奏；采用自有 opacity/transform，不引入 GSAP、Observer 或滚轮劫持 | 首页独立摄影窗口、场景题注与既有暂停轮播 |

固定提交、样例与 SHA256 见 `design-system/references/sources.lock.json`；上游示例只用于开发，不进入 dist。改编组件的许可全文随站点发布于 `assets/third-party-notices.txt`。

## Skills 配置

项目内 `.agents/skills/` 固定安装 frontend-design、web-design-guidelines，以及原有 UI/UX Pro Max 的完整副本。固定来源见 `.agents/skill-sources.lock.json`。

- frontend-design：建立明确摄影画册方向，检查布局与主题表达；没有安装其任何运行时。
- UI/UX Pro Max：检索叙事、可访问性和焦点建议。通用配色和英文字体推荐与本站不符，没有覆盖 MASTER.md。
- web-design-guidelines：用当次获取的官方规则检查标签、焦点、动画、图像尺寸和触屏目标；规则快照位于 references/vercel/command.md。

这些 Skills 是开发辅助资料，不是发送给访客的组件，也不进入公开部署。

## 交互与降级

路线匹配用原生 radio，支持方向键与可见焦点；URL 保留选择。情境优先于天数：亲子/雨天/花季保留专用路线，两天的选择显示如何组合的说明，不伪造新路线。花季明确是春季收藏路线。无脚本时显示完整静态首页与一日经典入口。

摄影轮播仍为 8 秒，鼠标停留、键盘焦点、页面隐藏和离开视口时暂停；支持暂停按钮、前后按钮、触屏滑动与减少动态。文字题注随摄影变化，主标题稳定。原旅行书翻页、阅读护照、堆堆问答、收藏、联游合并、行程导出与分享继续使用原交互。

首页主视觉在视口内时，暂时隐藏堆堆悬浮入口，避免手机上遮住摄影题注与轮播按钮；向下阅读后恢复。减少动态和打印样式均有对应处理。

## 验证

运行 npm test 与 npm run build；浏览器检查 375/768/1024/1440px 的页面溢出、首屏和正文。检查路线匹配/深链接、筛选、路线切换、加入行程、清单进度、旅行书、向导与护照。发布仅使用原有 allowlist 的 dist。
