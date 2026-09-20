const fs = require('fs');
const path = require('path');

const root = __dirname;
const expectedPages = [
  'index.html',
  'sanxingdui-museum.html',
  'luocheng-ruins.html',
  'fanghu-park.html',
  'jinyan-lake.html',
  'lianshan-peach.html'
];
const detailPages = expectedPages.filter((file) => file !== 'index.html');
const errors = [];
const warnings = [];
const htmlByFile = new Map();

const fail = (file, message) => errors.push(`${file}: ${message}`);
const warn = (file, message) => warnings.push(`${file}: ${message}`);
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? match[2] : '';
};

for (const file of expectedPages) {
  if (!exists(file)) {
    fail(file, '缺少必需页面');
    continue;
  }
  htmlByFile.set(file, fs.readFileSync(path.join(root, file), 'utf8'));
}

const bannedText = [
  ['fonts.googleapis.com', '禁止远程 Google Fonts'],
  ['fonts.gstatic.com', '禁止远程字体'],
  ['cdnjs.cloudflare.com', '禁止 cdnjs'],
  ['font-awesome', '禁止 Font Awesome'],
  ['rights-pending', '禁止保留候选素材占位'],
  ['三星堆博物馆新馆外景', '禁止引用旧的带水印三星堆外景'],
  ['images/external/雒城遗址.', '禁止引用错配的旧雒城图片']
];

for (const [file, html] of htmlByFile) {
  if (!/^<!doctype html>/i.test(html.trimStart())) fail(file, '缺少 HTML5 doctype');
  if (!/<html\b[^>]*\blang=["']zh-CN["']/i.test(html)) fail(file, '缺少 lang="zh-CN"');
  if (!/<meta\b[^>]*name=["']viewport["'][^>]*>/i.test(html)) fail(file, '缺少 viewport');
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(file, '缺少 title');
  if (!/<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(html)) fail(file, '缺少 meta description');
  if (!/<link\b[^>]*rel=["']canonical["'][^>]*href=["']https:\/\//i.test(html)) fail(file, '缺少 canonical');
  if (!/<meta\b[^>]*property=["']og:image["'][^>]*content=["']https:\/\//i.test(html)) fail(file, '缺少 og:image');
  if (!/<meta\b[^>]*name=["']theme-color["']/i.test(html)) fail(file, '缺少 theme-color');
  if (!/<a\b[^>]*class=["'][^"']*skip-link/i.test(html)) fail(file, '缺少 skip link');
  if (!/<main\b[^>]*id=["']main["']/i.test(html)) fail(file, '缺少 main#main');
  if (/<style\b/i.test(html)) fail(file, '不应包含内联 style 块');
  if (/<script(?![^>]*type=["']application\/ld\+json["'])(?![^>]*\bsrc=)[^>]*>/i.test(html)) fail(file, '不应包含内联运行脚本');
  if (/href\s*=\s*(["'])#\1/i.test(html)) fail(file, '存在 href="#" 占位链接');

  for (const [needle, message] of bannedText) {
    if (html.includes(needle)) fail(file, message);
  }

  const imageMatches = [...html.matchAll(/<img\b[^>]*>/gi)];
  for (const match of imageMatches) {
    const tag = match[0];
    const src = attr(tag, 'src');
    if (!/\balt\s*=\s*(["']).*?\1/i.test(tag)) fail(file, `图片缺少 alt：${tag.slice(0, 100)}`);
    if (!/\bwidth\s*=\s*(["'])\d+\1/i.test(tag) || !/\bheight\s*=\s*(["'])\d+\1/i.test(tag)) {
      fail(file, `图片缺少 width/height：${src || tag.slice(0, 80)}`);
    }
    if (!src || /^(?:https?:|data:)/i.test(src)) continue;

    const openPicture = html.lastIndexOf('<picture', match.index);
    const previousClose = html.lastIndexOf('</picture>', match.index);
    const closePicture = html.indexOf('</picture>', match.index + tag.length);
    if (openPicture < 0 || openPicture < previousClose || closePicture < 0) {
      fail(file, `本地图片必须位于 picture 内：${src}`);
      continue;
    }

    const loading = attr(tag, 'loading');
    if (!['eager', 'lazy'].includes(loading)) fail(file, `图片 loading 必须为 eager 或 lazy：${src}`);
    if (attr(tag, 'decoding') !== 'async') fail(file, `图片缺少 decoding="async"：${src}`);
    if (loading === 'eager' && attr(tag, 'fetchpriority') !== 'high') fail(file, `首屏图缺少 fetchpriority="high"：${src}`);
    if (loading === 'lazy' && attr(tag, 'fetchpriority') === 'high') fail(file, `懒加载图片不应设置高优先级：${src}`);

    const picture = html.slice(openPicture, closePicture + '</picture>'.length);
    const sources = picture.match(/<source\b[^>]*>/gi) || [];
    if (sources.length < 2) {
      fail(file, `picture 缺少 AVIF/WebP source：${src}`);
      continue;
    }
    if (attr(sources[0], 'type') !== 'image/avif' || attr(sources[1], 'type') !== 'image/webp') {
      fail(file, `picture source 顺序必须为 AVIF → WebP：${src}`);
    }
    for (const source of sources.slice(0, 2)) {
      const srcset = attr(source, 'srcset');
      if (!srcset) fail(file, `source 缺少 srcset：${src}`);
      if (!attr(source, 'sizes')) fail(file, `source 缺少 sizes：${src}`);
      for (const candidate of srcset.split(',')) {
        const [resource, descriptor] = candidate.trim().split(/\s+/);
        if (!resource || !descriptor) {
          fail(file, `srcset 候选缺少宽度描述：${src}`);
          continue;
        }
        const width = descriptor.match(/^(\d+)w$/);
        const filenameWidth = resource.match(/-(\d+)w\.(?:avif|webp)$/i);
        if (!width || !filenameWidth || width[1] !== filenameWidth[1]) fail(file, `srcset 宽度与文件名不一致：${resource} ${descriptor}`);
        if (!exists(path.normalize(path.join(path.dirname(file), decodeURIComponent(resource))))) fail(file, `srcset 引用不存在：${resource}`);
      }
    }
  }

  const ldJsonBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (!ldJsonBlocks.length) fail(file, '缺少 JSON-LD');
  for (const match of ldJsonBlocks) {
    try { JSON.parse(match[1]); } catch (error) { fail(file, `JSON-LD 无效：${error.message}`); }
  }

  const refs = [];
  for (const tag of html.match(/<(?:a|link|script|img|use)\b[^>]*>/gi) || []) {
    for (const name of ['href', 'src']) {
      const value = attr(tag, name);
      if (value) refs.push({ value, kind: name });
    }
  }
  for (const tag of html.match(/<(?:source|img)\b[^>]*\bsrcset\s*=\s*(["']).*?\1[^>]*>/gi) || []) {
    const value = attr(tag, 'srcset');
    for (const candidate of value.split(',')) {
      const resource = candidate.trim().split(/\s+/)[0];
      if (resource) refs.push({ value: resource, kind: 'srcset' });
    }
  }

  for (const { value, kind } of refs) {
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value)) continue;
    const [targetPathRaw, fragment = ''] = value.split('#', 2);
    const targetPath = decodeURIComponent(targetPathRaw || file);
    const resolved = targetPathRaw ? path.normalize(path.join(path.dirname(file), targetPath)) : file;
    if (targetPathRaw && !exists(resolved)) {
      fail(file, `${kind} 引用不存在：${value}`);
      continue;
    }
    if (fragment && /\.html?$/i.test(resolved)) {
      const targetHtml = htmlByFile.get(resolved) || (exists(resolved) ? fs.readFileSync(path.join(root, resolved), 'utf8') : '');
      const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`\\bid=["']${escaped}["']`).test(targetHtml)) fail(file, `锚点不存在：${value}`);
    }
  }

  const symbols = fs.readFileSync(path.join(root, 'assets/icons.svg'), 'utf8');
  for (const match of html.matchAll(/<use\b[^>]*href=["']assets\/icons\.svg#([^"']+)["']/gi)) {
    if (!new RegExp(`<symbol\\b[^>]*id=["']${match[1]}["']`).test(symbols)) fail(file, `图标不存在：${match[1]}`);
  }
}

if (!exists('404.html')) {
  fail('404.html', '缺少自定义 404 页面，Cloudflare 会把未知地址错误地返回为首页');
} else {
  const notFound = fs.readFileSync(path.join(root, '404.html'), 'utf8');
  if (!/<meta\b[^>]*name=["']robots["'][^>]*content=["']noindex,follow["']/i.test(notFound)) fail('404.html', '缺少 noindex,follow');
  if (!/<main\b[^>]*id=["']main["']/i.test(notFound)) fail('404.html', '缺少 main#main');
  for (const [needle, message] of bannedText) if (notFound.includes(needle)) fail('404.html', message);
}

for (const file of detailPages) {
  const html = htmlByFile.get(file) || '';
  for (const asset of ['assets/css/tokens.css', 'assets/css/site.css', 'assets/css/detail.css', 'assets/js/site.js']) {
    if (!html.includes(asset)) fail(file, `未接入共享资源：${asset}`);
  }
  if (!html.includes('class="mobile-action-bar"')) fail(file, '缺少移动端操作栏');
  if (!html.includes('class="trip-facts"')) fail(file, '缺少行程事实条');
}

const requiredEditorialAssets = {
  'index.html': ['heita-alley', 'heita-tea-stilllife', 'heita-tea-yard', 'heita-teahouse-dusk', 'editorial-atlas'],
  'sanxingdui-museum.html': ['museum-bronze-heads', 'museum-bronze-tree', 'museum-standing-figure', 'museum-bronze-bird', 'museum-gold-gallery', 'museum-gold-bronze', 'archive-essay'],
  'luocheng-ruins.html': ['luocheng-wall-detail', 'cinematic-diptych'],
  'fanghu-park.html': ['fanghu-lake-pavilion', 'fanghu-confucian-temple', 'fanghu-wall-path', 'visual-journal'],
  'jinyan-lake.html': ['jinyan-sunset', 'cinematic-diptych'],
  'lianshan-peach.html': ['lianshan-blossom-hillside', 'lianshan-orchard-path', 'lianshan-blossom-close', 'season-sequence']
};
for (const [file, needles] of Object.entries(requiredEditorialAssets)) {
  const html = htmlByFile.get(file) || '';
  for (const needle of needles) if (!html.includes(needle)) fail(file, `缺少 V2 图片叙事资源或模式：${needle}`);
}

for (const file of ['assets/css/tokens.css', 'assets/css/site.css', 'assets/css/detail.css', 'assets/js/site.js']) {
  if (!exists(file)) fail(file, '缺少共享资源');
  const content = exists(file) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
  for (const [needle, message] of bannedText.slice(0, 5)) {
    if (content.includes(needle)) fail(file, message);
  }
}

if (!exists('.asset-sources.json')) {
  fail('.asset-sources.json', '缺少素材来源台账');
} else {
  try {
    const ledger = JSON.parse(fs.readFileSync(path.join(root, '.asset-sources.json'), 'utf8'));
    const recorded = new Set((ledger.assets || []).map((item) => item.sitePath));
    for (const item of ledger.assets || []) {
      for (const optimizedPath of item.optimizedPaths || []) {
        if (!exists(optimizedPath)) fail('.asset-sources.json', `优化文件不存在：${optimizedPath}`);
      }
    }
    const usedExternal = new Set();
    for (const html of htmlByFile.values()) {
      for (const match of html.matchAll(/(?:src|srcset)=["'][^"']*(images\/external\/[^\s,"']+)/gi)) usedExternal.add(match[1]);
    }
    const legacyOwnerAssets = new Set(['images/external/连山桃花山.jpg']);
    for (const resource of usedExternal) {
      if (recorded.has(resource)) continue;
      if (legacyOwnerAssets.has(resource)) warn(resource, '既有站主素材不在本轮来源台账；保留使用但建议补录来源');
      else fail(resource, '正在使用但未登记到 .asset-sources.json');
    }
  } catch (error) {
    fail('.asset-sources.json', `来源台账无效：${error.message}`);
  }
}

if (warnings.length) {
  console.warn('站点验证警告：');
  warnings.forEach((message) => console.warn(`- ${message}`));
}
if (errors.length) {
  console.error('站点验证失败：');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log(`站点验证通过：${expectedPages.length} 个页面，资源、SEO、JSON-LD、图片尺寸与关键无障碍规则均通过。`);
