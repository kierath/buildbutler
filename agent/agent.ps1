<#
.SYNOPSIS
    Build Butler agent: installs every build queued for this PC, reports each result, then exits.

.DESCRIPTION
    Normally run by the "Build Butler Agent" scheduled task (see install-agent.ps1),
    but you can also run it by hand to test.

    No passwords are stored or needed. The PC proves who it is with the agent token in
    config.json, and the scheduled task runs as the built-in SYSTEM account, which already
    has the admin rights needed to replace files under C:\Builds.
#>

$ErrorActionPreference = 'Stop'           # turn every error into an exception, so try/catch sees it
$ProgressPreference = 'SilentlyContinue'  # the progress bar makes downloads many times slower in Windows PowerShell 5.1

$ConfigPath = Join-Path $PSScriptRoot 'config.json'
$AgentLogPath = Join-Path $PSScriptRoot 'agent.log'

# ---------- Helpers ----------

function Write-AgentLog([string]$Message) {
    # A scheduled task runs with no window, so this file is the only way to see what happened.
    $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Write-Host $line
    Add-Content -Path $AgentLogPath -Value $line
}

function Read-Config {
    if (-not (Test-Path $ConfigPath)) { throw 'No config.json next to agent.ps1. Run install-agent.ps1 first.' }
    $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    if (-not $config.serverUrl -or -not $config.token) { throw 'config.json needs serverUrl and token.' }
    if (-not $config.installRoot) {
        $config | Add-Member -NotePropertyName installRoot -NotePropertyValue 'C:\Builds'
    }
    $config.serverUrl = $config.serverUrl.TrimEnd('/')
    return $config
}

function Invoke-Api([string]$Method, [string]$Path, $Body) {
    $params = @{
        Uri             = "$($Config.serverUrl)/api/agent$Path"
        Method          = $Method
        Headers         = @{ 'X-Agent-Token' = $Config.token }
        UseBasicParsing = $true   # older Windows otherwise needs Internet Explorer's engine
    }
    if ($Body) {
        $params.ContentType = 'application/json; charset=utf-8'
        # Send UTF-8 bytes so log text survives Windows PowerShell's older default encoding.
        $params.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json))
    }
    $response = Invoke-WebRequest @params
    if ($response.StatusCode -eq 204) { return $null }   # 204 = no job waiting
    return $response.Content | ConvertFrom-Json
}

function Send-Report($InstallId, [string]$Status, [string[]]$Log) {
    $body = @{ install_id = $InstallId; status = $Status; log = ($Log -join "`n") }
    Invoke-Api -Method POST -Path '/report' -Body $body | Out-Null
}

function Get-SafeFolderName([string]$Name) {
    # The project name comes from the server, and the folder it names gets deleted.
    # Allowing only plain characters (no dots or slashes) means a name like "..\Windows"
    # can never point outside installRoot.
    $safe = ($Name -replace '[^A-Za-z0-9 _-]', '_').Trim()
    if (-not $safe -or $safe -match '^_+$') { throw "Project name '$Name' can't be used as a folder name." }
    return $safe
}

function Invoke-Step($Log, [string]$Label, [scriptblock]$Action) {
    # Runs one install step and records "OK" or "FAILED", so the log on the
    # status board shows exactly where an install stopped.
    try {
        & $Action
        $Log.Add("$Label... OK")
    } catch {
        $Log.Add("$Label... FAILED")
        throw
    }
}

# ---------- Installing one build ----------

function Install-Build($Job) {
    $log = New-Object System.Collections.Generic.List[string]
    $zipPath = Join-Path ([IO.Path]::GetTempPath()) "buildbutler-$($Job.install_id).zip"
    # file_url can be a full URL (a file share or storage bucket) or a path on the Build Butler server.
    $url = if ($Job.file_url -match '^https?://') { $Job.file_url } else { "$($Config.serverUrl)$($Job.file_url)" }

    # Tell the server first, so the status board turns amber while we work.
    Send-Report $Job.install_id 'installing' @('Starting install...')
    try {
        $folder = Join-Path $Config.installRoot (Get-SafeFolderName $Job.project_name)
        Invoke-Step $log "[1/4] Downloading $(Split-Path $Job.file_url -Leaf)" { Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing }
        Invoke-Step $log "[2/4] Removing $folder" { if (Test-Path $folder) { Remove-Item $folder -Recurse -Force } }
        Invoke-Step $log "[3/4] Extracting to $folder" { Expand-Archive -Path $zipPath -DestinationPath $folder -Force }
        $log.Add("[4/4] Done. $($Job.project_name) $($Job.version) installed.")
        Send-Report $Job.install_id 'success' $log
        Write-AgentLog 'Success.'
    } catch {
        $log.Add("ERROR: $($_.Exception.Message)")
        Send-Report $Job.install_id 'failed' $log
        Write-AgentLog "Failed: $($_.Exception.Message)"
    } finally {
        Remove-Item $zipPath -ErrorAction SilentlyContinue   # don't leave large zips in the temp folder
    }
}

# ---------- Main ----------

try {
    $Config = Read-Config
    Write-AgentLog "Agent started. Checking $($Config.serverUrl) for jobs."
    $count = 0
    # Keep asking until the server says there's nothing left, so several queued builds all install in one run.
    while ($job = Invoke-Api -Method GET -Path '/next') {
        Write-AgentLog "Installing $($job.project_name) $($job.version) (install $($job.install_id))."
        Install-Build $job
        $count++
    }
    Write-AgentLog "No more jobs. Handled $count this run."
} catch {
    # Reaching here means the server couldn't be reached or rejected us; stop rather than loop.
    Write-AgentLog "Agent stopped: $($_.Exception.Message)"
    exit 1
}
