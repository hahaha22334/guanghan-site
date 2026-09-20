param(
    [string]$Message = "Update Guanghan site",
    [switch]$SkipGit,
    [switch]$SkipDeploy,
    [switch]$Preview
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding
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

Step "验证站点结构、资源与元数据"
node "$PSScriptRoot\validate-site.js"
Ensure-Success "站点验证失败"

Step "准备干净的 Cloudflare 上传目录"
$DeployDir = Join-Path $PSScriptRoot "dist"
Remove-Item $DeployDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item $DeployDir -ItemType Directory -Force | Out-Null

Get-ChildItem $PSScriptRoot -Filter "*.html" -File | Copy-Item -Destination $DeployDir -Force
Copy-Item (Join-Path $PSScriptRoot "images") -Destination $DeployDir -Recurse -Force
Copy-Item (Join-Path $PSScriptRoot "assets") -Destination $DeployDir -Recurse -Force
foreach ($SpecialFile in @("_headers", "_redirects")) {
    $SourceFile = Join-Path $PSScriptRoot $SpecialFile
    if (Test-Path $SourceFile) {
        Copy-Item $SourceFile -Destination $DeployDir -Force
    }
}

$RequiredPages = @(
    "404.html",
    "index.html",
    "fanghu-park.html",
    "jinyan-lake.html",
    "lianshan-peach.html",
    "luocheng-ruins.html",
    "sanxingdui-museum.html"
)
$RequiredFiles = $RequiredPages + @(
    "assets/css/tokens.css",
    "assets/css/site.css",
    "assets/css/detail.css",
    "assets/js/site.js",
    "assets/icons.svg"
)
foreach ($RequiredFile in $RequiredFiles) {
    if (-not (Test-Path (Join-Path $DeployDir $RequiredFile))) {
        throw "上传目录缺少文件：$RequiredFile"
    }
}
Write-Host "上传目录已生成：$DeployDir" -ForegroundColor Green

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

    $DeployBranch = if ($Preview) { "preview" } else { "master" }
    $DeployTarget = if ($Preview) { "预览环境" } else { "生产环境" }
    Step "部署到 Cloudflare Pages $DeployTarget"
    Remove-Item Env:WRANGLER_LOG -ErrorAction SilentlyContinue
    Remove-Item Env:NPM_CONFIG_CACHE -ErrorAction SilentlyContinue

    npx --yes wrangler@latest pages deploy "$DeployDir" --project-name=guanghan-site --branch=$DeployBranch --commit-dirty=true
    Ensure-Success "Cloudflare 部署失败"
}

Step "完成"
Write-Host "GitHub: https://github.com/hahaha22334/guanghan-site" -ForegroundColor Green
Write-Host "网站:   https://guanghan-site.pages.dev" -ForegroundColor Green
