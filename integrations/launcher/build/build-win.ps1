$ErrorActionPreference = "Stop"

# --------------------------------------------------
# config
# --------------------------------------------------
$RootDir = Resolve-Path "$PSScriptRoot\.."
$OutDir  = Join-Path $RootDir "installers\win"
$AppName = "videoreview-launcher.exe"

$Platform = "Windows"
$Arch     = "amd64"

# --------------------------------------------------
# build
# --------------------------------------------------
Write-Host "== build $Platform ($Arch) =="

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Set-Location $RootDir

$env:GOOS   = "windows"
$env:GOARCH = "amd64"

go build `
    -trimpath `
    -ldflags "-s -w" `
    -o (Join-Path $OutDir $AppName) .

Write-Host "output: $(Join-Path $OutDir $AppName)"
Write-Host "done"
