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

  const images = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of images) {
    if (!/\balt\s*=\s*(["']).*?\1/i.test(tag)) fail(file, `图片缺少 alt：${tag.slice(0, 100)}`);
    if (!/\bwidth\s*=\s*(["'])\d+\1/i.test(tag) || !/\bheight\s*=\s*(["'])\d+\1/i.test(tag)) {
      fail(file, `图片缺少 width/height：${attr(tag, 'src') || tag.slice(0, 80)}`);
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
