# Run after: gh auth login
$ErrorActionPreference = "Stop"
$git = "C:\Program Files\Git\bin\git.exe"
$gh = "C:\Program Files\GitHub CLI\gh.exe"
Set-Location $PSScriptRoot

& $gh auth status
& $gh repo create medical-chat-expert-evaluation --public --source=. --remote=origin --push --description "Expert doctor evaluation interface for multi-agent medical chatbot conversations"

Write-Host ""
Write-Host "Done. Repository URL:"
& $gh repo view --web 2>$null
& $gh repo view --json url -q .url
