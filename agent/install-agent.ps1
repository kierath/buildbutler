<#
.SYNOPSIS
    One-time setup of the Build Butler agent on a Windows test PC.

.DESCRIPTION
    Run once, as administrator, from the folder that holds agent.ps1. It:
      1. writes config.json (server URL + this PC's agent token) and locks it down
      2. checks the server accepts the token
      3. registers a scheduled task that runs agent.ps1 every Thursday at 09:00

    The task runs as the built-in SYSTEM account with highest privileges, so no
    admin password is typed or stored anywhere.

.EXAMPLE
    .\install-agent.ps1 -ServerUrl http://192.168.1.50:3001 -Token 3f9c...e1
#>

#Requires -RunAsAdministrator

param(
    [Parameter(Mandatory)] [string]$ServerUrl,
    [Parameter(Mandatory)] [string]$Token,
    [string]$InstallRoot = 'C:\Builds'
)

$ErrorActionPreference = 'Stop'
$TaskName = 'Build Butler Agent'
$AgentPath = Join-Path $PSScriptRoot 'agent.ps1'
$ConfigPath = Join-Path $PSScriptRoot 'config.json'
$ServerUrl = $ServerUrl.TrimEnd('/')

if (-not (Test-Path $AgentPath)) { throw "agent.ps1 must be in the same folder as this script ($PSScriptRoot)." }

# ---------- 1. Config ----------

@{ serverUrl = $ServerUrl; token = $Token; installRoot = $InstallRoot } |
    ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8

# The token is a secret, so only SYSTEM (which runs the task) and Administrators may read the file.
# SIDs are used instead of names because account names change with the Windows language.
icacls $ConfigPath /inheritance:r /grant:r '*S-1-5-18:(R)' '*S-1-5-32-544:(F)' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not set permissions on config.json.' }
Write-Host "Wrote $ConfigPath (readable by SYSTEM and Administrators only)."

# ---------- 2. Check the token ----------

# Asking for the next job changes nothing on the server except "last seen",
# so it's a safe way to prove the URL and token both work before scheduling anything.
try {
    Invoke-WebRequest -Uri "$ServerUrl/api/agent/next" -Headers @{ 'X-Agent-Token' = $Token } -UseBasicParsing | Out-Null
    Write-Host 'Server accepted the token.'
} catch {
    throw "Could not check in with $ServerUrl. Check the URL, the token, and that the server is running. ($($_.Exception.Message))"
}

# ---------- 3. Scheduled task ----------

# -ExecutionPolicy Bypass is needed because agent.ps1 isn't code-signed.
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$AgentPath`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At '09:00'
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
# StartWhenAvailable: if the PC was off at 09:00, run as soon as it's switched on.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# -Force replaces an existing task, so re-running this script is a safe way to change settings.
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force | Out-Null

Write-Host ''
Write-Host "Done. '$TaskName' will run every Thursday at 09:00." -ForegroundColor Green
Write-Host ''
Write-Host 'Run it now (e.g. right after a deploy):'
Write-Host "    Start-ScheduledTask -TaskName '$TaskName'"
Write-Host 'See what it did:'
Write-Host "    Get-Content '$(Join-Path $PSScriptRoot 'agent.log')' -Tail 20"
Write-Host 'Uninstall:'
Write-Host "    Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
Write-Host "    then delete this folder ($PSScriptRoot)"
