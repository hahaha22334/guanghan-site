# AGENTS.md

Single-page static site about Guanghan/Sanxingdui. Pure HTML/CSS/JS in `index.html` (~60KB). Chinese (zh-CN).

## Deployment

```bash
# Every time after changing files:
npx wrangler pages deploy . --project-name=guanghan-site
```

**Do NOT use Git-integrated Cloudflare Pages** — the build environment generates a `workerd` binary (~119MB) inside `node_modules/` that exceeds the 25MB asset limit. Project already exists on Cloudflare; no `project create` needed.


## Publish Script

A helper script exists at `publish.ps1`, with an npm alias:

```powershell
npm run publish
```

Use this for routine updates from the user's own PowerShell session. It will:

1. Stop any `workerd` process that may lock npm cache files.
2. Remove `.npm-cache/` from the project root.
3. Check that `images/` and `index.html` exist.
4. Run `git add .`, commit, and push to `origin master`.
5. Check Cloudflare login with `npx --yes wrangler@latest whoami`.
6. Deploy with `npx --yes wrangler@latest pages deploy $PSScriptRoot --project-name=guanghan-site --branch=master --commit-dirty=true`.

Useful variants:

```powershell
# Custom commit message
powershell -ExecutionPolicy Bypass -File .\publish.ps1 -Message "完善景点详情页"

# Deploy only, skip GitHub
powershell -ExecutionPolicy Bypass -File .\publish.ps1 -SkipGit

# GitHub only, skip Cloudflare deploy
powershell -ExecutionPolicy Bypass -File .\publish.ps1 -SkipDeploy
```

`publish.ps1` must be saved as UTF-8 with BOM for Windows PowerShell 5, otherwise Chinese strings may be parsed as mojibake and the script can fail with bogus quote/brace errors. Keep the BOM.

## GitHub + Cloudflare Update Flow

Correct update flow is:

```powershell
cd D:\code
npm run publish
```

Manual equivalent:

```powershell
cd D:\code
git add .
git commit -m "Update Guanghan site"
git push origin master
npx --yes wrangler@latest pages deploy D:\code --project-name=guanghan-site --branch=master --commit-dirty=true
```

The production URL is `https://guanghan-site.pages.dev`. Wrangler may also print a preview URL like `https://<hash>.guanghan-site.pages.dev`; that preview URL is useful for checking the exact deployment.

Deployment is only successful when Wrangler prints `Success`, `Deploying`, and `Deployment complete`. If the command returns to the prompt with no output, check `npx --yes wrangler@latest --version`, `npx --yes wrangler@latest whoami`, and `$LASTEXITCODE`.

## Windows / Codex Sandbox Gotchas

- Codex may be able to edit files in `D:\code` but still fail to write `.git/index`, causing `git add` or `git commit` to fail with `Unable to create 'D:/code/.git/index.lock': Permission denied`. In that case, ask the user to run `npm run publish` locally.
- Codex may not have the user's GitHub credentials, causing `git push` failures such as `SEC_E_NO_CREDENTIALS`. The user's own PowerShell session usually has the right credentials.
- Codex may not have the user's Cloudflare interactive login. Wrangler may say the OAuth token expired or ask for `CLOUDFLARE_API_TOKEN`. The user should run `npx --yes wrangler@latest login` locally if needed.
- If `npx wrangler` uses a project-local cache (`.npm-cache/`), it may create `workerd` under `.npm-cache/_npx/...`. If that process is still running, deleting the cache can warn with `EBUSY`. Stop it with `Get-Process workerd -ErrorAction SilentlyContinue | Stop-Process -Force`.
- `.cloudflareignore` must include `.npm-cache/` and `.wrangler/`. Otherwise `wrangler pages deploy .` can scan/upload cache files, including `workerd`, leading to large asset or stale deployment problems.
- Do not rely on Cloudflare Git integration for this project. The working production path is still Wrangler CLI deploy.

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
