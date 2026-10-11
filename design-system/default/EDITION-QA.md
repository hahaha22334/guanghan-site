# 旅行画册更新验证 · 2026-10-11

自动检查：`npm test` 16/16 通过；`npm run build` 通过。14 个内容页完成资源、SEO、JSON-LD、图片尺寸与关键无障碍校验。允许清单生成的 dist 只含公开 HTML、images、assets 和站点配置；不包含 .agents、设计参考、scripts、content、tests。

浏览器：14 页逐页检查 375、768、1024、1440px，无页面横向溢出。手机路线标签改为换行，首页首屏隐藏堆堆悬浮入口，解决遮挡。桌面/手机截图检查首屏、摄影题页、路线、行程、旅行书及护照。

交互：路线情境匹配、键盘 radio、URL 刷新恢复；场景切换与题注；目的地搜索和无结果状态；亲子路线载入三站；清单勾选与日期刷新保留；PNG 下载、删除/撤销和分享链接；旅行书切章；阅读护照动态开关及关闭后轮播暂停；图片放大/关闭；向导联游问答；手机菜单/Escape。浏览器错误日志为空。

Vercel Web Interface Guidelines 审阅（本次获取的官方规则快照见 references/vercel/command.md）：

- scripts/build-home.js:1 — 通过：层级标题、原生单选组、标签、图片尺寸、延迟加载及明确链接。
- scripts/edition-shell.js:1 — 通过：构建时语义图文题页，保留主标题及图注。
- assets/js/edition.js:1 — 通过：合法路线、花期/预约限制、键盘选择、URL 状态和静态降级。
- assets/css/edition.css:1 — 通过：焦点、触屏尺寸、减少动态、弹窗滚动边界及响应式检查；必要注释最小 14px。
- assets/js/experience.js:229 — 通过：清单文字与原生 progress 一起更新，保留原状态。
- assets/js/motion.js:107 — 通过：摄影切换同步题注，继续使用已有暂停条件。

边界：未用浏览器工具模拟禁用 JavaScript 或系统级减少动态；前者按生成的静态 HTML/CSS 审阅，后者由现有自动测试和 CSS 媒体规则检查。实际浏览器验证了用户关闭动态后的暂停状态。

已有提醒：站主旧图 `images/external/连山桃花山.jpg` 尚未补录来源台账，本轮未新增或修改该图片。保留原有校验提醒，不虚构署名与许可。
