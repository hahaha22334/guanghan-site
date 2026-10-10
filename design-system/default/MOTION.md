# 广汉动态体验 · 2026-10-11

用户要求在保持清晰大字排版的基础上加入动态展示、转场、轮播与创意小功能。实现使用本站既有照片、色彩与原生浏览器能力，没有复制第三方代码或引入第三方运行时。

## 案例研究与取舍

| 一手资料 | 借鉴方向 | 本站处理 |
|---|---|---|
| [Swup](https://github.com/swup/swup) | 页面离开与进入的连贯节奏 | 使用原生跨文档转场，保留正常导航、历史记录及每页脚本初始化 |
| [Embla Carousel](https://github.com/davidjerleke/embla-carousel) / [Autoplay](https://www.embla-carousel.com/docs/v8/plugins/autoplay) | 触屏切换、焦点与交互时暂停 | 自有轻量轮播，固定文字，8 秒间隔，1.4 秒淡化，图片缓慢缩放 |
| [Codrops Slideshow Animations](https://github.com/codrops/SlideshowAnimations) | 大幅摄影切换、图像的运动节奏 | 舒缓叠化与抽卡转动，不使用强烈扭曲或遮挡标题的复杂转场 |
| [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using) | 多页面站点的渐进增强转场 | 同源浏览器支持时启用，旧浏览器正常跳转 |

## 组件边界

- 首页轮播：只轮换三星堆、黑塔街、金丝面的场景，主标题、介绍和探索按钮稳定。切换前解码目标图片，失败时保留上一张；暂停状态不播报自动更新。
- 动效层：滚动渐入仅执行一次；地图路径只在视口中循环；页面、选项卡、图片与卡片使用短暂的透明度和位移。无需 JavaScript 的静态内容仍可访问。
- 灵感卡：所有地点内容静态生成，未启用 JavaScript 时展示黑塔街卡片。主题由统一地点分类生成，不改变行程规则。连山卡保留季节说明。
- 图片浏览：正文 `figure > picture` 增加明确的放大按钮；已有跳转链接保留。照片分组依所属 section，浏览器原生 dialog 负责焦点约束与 Escape；图下署名、日期、链接与许可完整复制。
- 阅读护照：主动盖章，七地点使用统一内容数据。`guanghan-reading-passport-v1` 仅保存合法地点 ID，过滤损坏数据、重复和已删除的 ID。`guanghan-motion` 保存动效开关，独立于行程的 `guanghan-field-notes-v3`。
- 首页主视觉在视口中时暂时隐藏护照悬浮入口，向下阅读后出现，避免较矮窗口中遮挡轮播控制。景点页入口上移以避开移动底栏。
- 动效关闭：系统 `prefers-reduced-motion` 优先；用户关闭后不会自动轮播，仍可手动切换、抽卡、看图与盖章。浏览器存储不可用时工具在当前页面仍可使用，并说明印章无法持久保存。

## 验证与维护

修改生成器或共享壳后运行 `npm test`，再按 375、768、1440px 检查所有 13 页。新增测试覆盖损坏印章记录、主题抽卡与不重复、轮播暂停条件。人工检查轮播点击、暂停/恢复、灵感卡到详情、加入行程、盖章后刷新、看图方向键/Escape、开关保存、手机底栏避让、照片署名。发布仍只上传 allowlist 的 `dist/`。
