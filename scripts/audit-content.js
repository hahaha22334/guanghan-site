const fs = require('node:fs');
const path = require('node:path');
const data = require('../content/guide.json');
const today = new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});
const lines = [`# 广汉旅行内容维护清单`, '', `检查日期：${today}`, '', '日期指背景资料的整理时间，不代表票务、花期、交通或门店营业已经实时核验。', '', '| 地点 | 背景资料日期 | 复查入口 | 维护重点 |', '|---|---|---|---|'];
for (const p of data.places) lines.push(`| ${p.name} | ${p.backgroundDate} | [${p.sourceLabel}](${p.source}) | ${p.tip} |`);
lines.push('', '## 每次内容更新', '', '1. 修改 content/guide.json 中的地点、路线、四季或问答；核实后才更新对应背景资料日期。', '2. 景点正文在 content/details/，公共版式在 scripts/build-content.js。', '3. 运行 npm test，再运行 npm run build。', '4. 检查手机、平板、桌面的受影响页面；部署预览后再发布。', '', '## 素材工作流', '', '继续使用工作区中的 guanghan-media-sourcing 流程。新增图片先挑选、登记来源，再生成 AVIF/WebP。已有导入图片复用时保留 .asset-sources.json；该台账不进入公开目录。', '');
fs.writeFileSync(path.join(__dirname,'../内容维护清单.md'),lines.join('\n'),'utf8');
console.log('已更新 内容维护清单.md');
