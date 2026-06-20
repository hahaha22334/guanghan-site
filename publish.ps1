param(
    [string]$Message = "Update Guanghan site",
    [switch]$SkipGit,
    [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Step($Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Ensure-Success($Text) {
    if ($LASTEXITCODE -ne 0) { throw $Text }
}

Step "清理临时缓存，避免 Cloudflare 上传 workerd"
Get-Process workerd -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item "$PSScriptRoot\.npm-cache" -Recurse -Force -ErrorAction SilentlyContinue

Step "检查本地图片目录"
if (-not (Test-Path "$PSScriptRoot\images")) { throw "缺少 images 目录" }
if (-not (Test-Path "$PSScriptRoot\index.html")) { throw "缺少 index.html" }
Write-Host "基础文件检查通过" -ForegroundColor Green

if (-not $SkipGit) {
    Step "提交并推送到 GitHub"
    git status --short
    git add .
    $changes = git diff --cached --name-only
    if ($changes) {
        git commit -m $Message
        Ensure-Success "Git 提交失败"
        git push origin master
        Ensure-Success "GitHub 推送失败，请检查 Git 登录凭据"
    } else {
        Write-Host "没有需要提交的改动，跳过 Git 提交。" -ForegroundColor Yellow
    }
}

if (-not $SkipDeploy) {
    Step "检查 Cloudflare 登录状态"
    npx --yes wrangler@latest whoami
    Ensure-Success "Cloudflare 未登录。请先运行：npx --yes wrangler@latest login"

    Step "部署到 Cloudflare Pages"
        Remove-Item Env:WRANGLER_LOG -ErrorAction SilentlyContinue
    Remove-Item Env:NPM_CONFIG_CACHE -ErrorAction SilentlyContinue

    npx --yes wrangler@latest pages deploy D:\code --project-name=guanghan-site --branch=master --commit-dirty=true
    Ensure-Success "Cloudflare 部署失败"
}

Step "完成"
Write-Host "GitHub: https://github.com/hahaha22334/guanghan-site" -ForegroundColor Green
Write-Host "网站:   https://guanghan-site.pages.dev" -ForegroundColor Green
