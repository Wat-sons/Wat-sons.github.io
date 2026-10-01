<#
.SYNOPSIS
    构建、自检、并把主页与奖项归档发布到 GitHub。

.DESCRIPTION
    1) 校验 PAT 身份
    2) 需要时创建 Wat-sons.github.io（公开）与 awards（私有）
    3) 跑 build.mjs 生成 index.html，跑 tools/check.mjs（**含隐私闸门**）
    4) 提交并推送当前目录（= Wat-sons.github.io 的工作区）
    5) 推送 awards-repo/ 到私有仓库 awards
    6) 为 Wat-sons.github.io 开启 GitHub Pages

    注意：本目录就是公开仓库的工作区，.gitignore 里挡着 awards-repo/、_rendered/、
    _archive/、预览/ 等含个人信息的目录。推送前 check.mjs 会再验一遍。

.EXAMPLE
    .\publish.ps1 -Token ghp_xxxxxxxxxxxx

.NOTES
    用完请到 https://github.com/settings/tokens 撤销这个 token。
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Token,
    [string]$Owner = "Wat-sons",
    [string]$PublicRepo = "Wat-sons.github.io",
    [string]$PrivateRepo = "awards",
    [switch]$SkipCheck,
    [switch]$SkipPages
)

$ErrorActionPreference = "Stop"
$Git = "D:\Git\cmd\git.exe"
$Base = $PSScriptRoot
$Api = "https://api.github.com"
$Headers = @{
    Authorization          = "token $Token"
    "User-Agent"           = "quchen-homepage-publisher"
    Accept                 = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

function Invoke-Gh {
    param([string]$Method, [string]$Path, [object]$Body, [switch]$AllowFail)
    $req = @{
        Method      = $Method
        Uri         = "$Api$Path"
        Headers     = $Headers
        ContentType = "application/json; charset=utf-8"
        TimeoutSec  = 60
    }
    if ($Body) { $req.Body = ($Body | ConvertTo-Json -Depth 6 -Compress) }
    try {
        return Invoke-RestMethod @req
    } catch {
        if ($AllowFail) {
            Write-Host "   (API $Method $Path -> $($_.Exception.Response.StatusCode.value__)，忽略)" -ForegroundColor DarkYellow
            return $null
        }
        throw
    }
}

function Invoke-Git {
    param([string]$WorkDir, [string[]]$GitArgs, [string]$Label)
    Push-Location $WorkDir
    try {
        # git 往 stderr 写东西会被 $ErrorActionPreference='Stop' 当成致命错误，这里临时放宽
        $prev = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        & $Git @GitArgs 2>&1 | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
        $code = $LASTEXITCODE
        $ErrorActionPreference = $prev
        if ($code -ne 0) { throw "$Label 失败（git exit $code）" }
    } finally { Pop-Location }
}

Write-Host "`n=== 1/6 校验 token ===" -ForegroundColor Cyan
$me = Invoke-Gh GET "/user"
Write-Host "   已登录：$($me.login)" -ForegroundColor Green
if ($me.login -ne $Owner) {
    Write-Host "   !! token 属于 $($me.login)，与预期 Owner=$Owner 不一致，已停止。" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 2/6 创建仓库 ===" -ForegroundColor Cyan
foreach ($r in @(
    @{ n = $PublicRepo;  p = $false; d = "quchen 的个人主页 — 算法竞赛奖项 / Codeforces 战绩 / 项目" },
    @{ n = $PrivateRepo; p = $true;  d = "quchen — 获奖证书原件与简历归档（私有，含个人信息）" }
)) {
    if (Invoke-Gh GET "/repos/$Owner/$($r.n)" -AllowFail) {
        Write-Host "   仓库 $($r.n) 已存在，跳过创建" -ForegroundColor DarkGray
    } else {
        Write-Host "   创建仓库 $($r.n) (private=$($r.p)) ..." -ForegroundColor Yellow
        Invoke-Gh POST "/user/repos" @{
            name = $r.n; private = $r.p; description = $r.d
            has_issues = $false; has_wiki = $false; has_projects = $false; auto_init = $false
        } | Out-Null
        Start-Sleep -Seconds 3
    }
}

Write-Host "`n=== 3/6 构建 + 自检 ===" -ForegroundColor Cyan
if ($SkipCheck) {
    Write-Host "   -SkipCheck 已指定，跳过" -ForegroundColor DarkYellow
} else {
    # PowerShell 5.1 没有 ?. 运算符，老实写
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    $nodeExe = if ($cmd) { $cmd.Source } else { $null }
    if (-not $nodeExe) {
        $nodeExe = Get-ChildItem "D:\Claude Code project\projects\个人主页\_archive" -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    }
    if (-not $nodeExe) {
        # 本机 node 不在 PATH，用 DSH 自带的
        $nodeExe = "C:\Users\$env:USERNAME\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
    }
    if (-not (Test-Path $nodeExe)) { throw "找不到 node，请先装 Node >= 20 或手动跑 npm run build" }
    Push-Location $Base
    try {
        & $nodeExe build.mjs
        if ($LASTEXITCODE -ne 0) { throw "build.mjs 失败" }
        & $nodeExe tools/check.mjs
        if ($LASTEXITCODE -ne 0) { throw "自检未通过（含隐私闸门），已中止推送" }
    } finally { Pop-Location }
}

Write-Host "`n=== 4/6 推送公开主页 ===" -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $Base ".git"))) {
    Write-Host "   初始化 git 仓库 ..." -ForegroundColor Yellow
    Invoke-Git -WorkDir $Base -GitArgs @("init", "-b", "main") -Label "git init"
}
Invoke-Git -WorkDir $Base -GitArgs @("add", "-A") -Label "git add"
Invoke-Git -WorkDir $Base -GitArgs @("-c", "user.name=$Owner", "-c", "user.email=2673052046@qq.com",
                                     "commit", "-m", "更新主页数据与构建结果") -Label "git commit"
$url = "git@github.com:$Owner/${PublicRepo}.git"
Push-Location $Base
try {
    if (@(& $Git remote) -contains "origin") { Invoke-Git -WorkDir $Base -GitArgs @("remote", "set-url", "origin", $url) -Label "set-url" }
    else { Invoke-Git -WorkDir $Base -GitArgs @("remote", "add", "origin", $url) -Label "add remote" }
} finally { Pop-Location }
Invoke-Git -WorkDir $Base -GitArgs @("push", "-u", "origin", "main", "--force") -Label "推送公开主页"

Write-Host "`n=== 5/6 推送私有奖项归档 ===" -ForegroundColor Cyan
$aw = Join-Path $Base "awards-repo"
if (Test-Path $aw) {
    if (-not (Test-Path (Join-Path $aw ".git"))) { Invoke-Git -WorkDir $aw -GitArgs @("init", "-b", "main") -Label "git init" }
    Invoke-Git -WorkDir $aw -GitArgs @("add", "-A") -Label "git add"
    Invoke-Git -WorkDir $aw -GitArgs @("-c", "user.name=$Owner", "-c", "user.email=2673052046@qq.com",
                                       "commit", "-m", "更新证书归档") -Label "git commit"
    $aurl = "git@github.com:$Owner/${PrivateRepo}.git"
    Push-Location $aw
    try {
        if (@(& $Git remote) -contains "origin") { Invoke-Git -WorkDir $aw -GitArgs @("remote", "set-url", "origin", $aurl) -Label "set-url" }
        else { Invoke-Git -WorkDir $aw -GitArgs @("remote", "add", "origin", $aurl) -Label "add remote" }
    } finally { Pop-Location }
    Invoke-Git -WorkDir $aw -GitArgs @("push", "-u", "origin", "main", "--force") -Label "推送私有归档"
} else {
    Write-Host "   没找到 awards-repo/，跳过" -ForegroundColor DarkYellow
}

if (-not $SkipPages) {
    Write-Host "`n=== 6/6 开启 GitHub Pages ===" -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    $pages = Invoke-Gh GET "/repos/$Owner/$PublicRepo/pages" -AllowFail
    if ($pages) {
        Write-Host "   Pages 已启用：$($pages.html_url)" -ForegroundColor Green
    } else {
        try {
            $r = Invoke-Gh POST "/repos/$Owner/$PublicRepo/pages" @{ source = @{ branch = "main"; path = "/" } }
            Write-Host "   Pages 已开启：$($r.html_url)" -ForegroundColor Green
        } catch {
            Write-Host "   自动开启失败，请去 Settings -> Pages 手动选 main / (root)。" -ForegroundColor Yellow
        }
    }
    Invoke-Gh PATCH "/repos/$Owner/$PublicRepo" @{
        homepage    = "https://$($Owner.ToLower()).github.io/"
        description = "quchen 的个人主页 — 算法竞赛奖项 / Codeforces 战绩 / 项目"
        topics      = @("personal-website", "github-pages", "competitive-programming", "resume")
    } -AllowFail | Out-Null
}

Write-Host "`n全部完成" -ForegroundColor Green
Write-Host "主页：https://$($Owner.ToLower()).github.io/  （首次部署等 1-2 分钟）" -ForegroundColor Green
Write-Host "私有归档：https://github.com/$Owner/$PrivateRepo" -ForegroundColor Green
Write-Host "`n别忘了撤销 token：https://github.com/settings/tokens" -ForegroundColor Yellow
