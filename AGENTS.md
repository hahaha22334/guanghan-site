# AGENTS.md

Single-page static site about Guanghan/Sanxingdui. Pure HTML/CSS/JS in `index.html` (~60KB). Chinese (zh-CN).

## Deployment

```bash
# Every time after changing files:
npx wrangler pages deploy . --project-name=guanghan-site
```

**Do NOT use Git-integrated Cloudflare Pages** — the build environment generates a `workerd` binary (~119MB) inside `node_modules/` that exceeds the 25MB asset limit. Project already exists on Cloudflare; no `project create` needed.

## Image Rules

- Source JPGs in `images/`. After adding one, run `npm run optimize-images`
- All `<img>` tags for local images must use `<picture>` (AVIF → WebP → JPG fallback)
- First hero slide: omit `loading="lazy"` (eager for LCP)
- `images/external/` holds local copies of formerly-remote images. Never reference remote URLs.
- **CRITICAL**: `optimize-images.js` skips widths >= source image width (`if (width >= metadata.width) continue`). `城市概况.jpg` is 1080px wide, so only 400w/800w variants exist (1200w skipped). The `<picture>` srcset must only reference sizes that actually exist, or images will 404.

## CSS Gotchas

- **Hero arrow z-index**: `.hero-arrow` must have `z-index: 20` (or >10). `.hero-content` has `z-index: 10` and comes later in DOM, so it overlaps the arrows on narrow screens when both are 10.
- Hero arrows on mobile: use smaller size (40px) and tighter edge distance (10px) at `@media (max-width: 768px)`.
- CSS custom properties in `:root`: `--bronze*` (primary), `--gold*` (accent), `--cream*` (backgrounds), `--text-*` (text). No new color families.

## JS Gotchas

- **Touch swipe listener must bind to `.hero`, not `.hero-slider`** — `.hero-overlay` and `.hero-content` are absolutely positioned over the slider and intercept touch events otherwise.
- Scroll animations: `IntersectionObserver` on `.fade-in`, `.fade-in-left`, `.fade-in-right`.
- Hero slider: 5s auto-advance + arrow buttons + touch swipe.
- Mobile nav: hamburger toggle on `.nav-links`.

## Responsive Breakpoints

Mobile-first: default → 768px (tablet) → 1024px (desktop). Test all three.

## Dependencies

- `sharp` in `node_modules/` (gitignored). Run `npm install` if missing.
- External CDN: Google Fonts + Font Awesome 6.4.0 only. No new CDN dependencies.
- No frameworks or bundlers.

## Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Local preview via `npx serve .` |
| `npm run optimize-images` | Regenerate WebP/AVIF variants |
| `npx wrangler pages deploy . --project-name=guanghan-site` | Deploy to production |
