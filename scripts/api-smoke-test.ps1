<#
.SYNOPSIS
Runs read-only local API liveness, readiness, and catalog checks.

.DESCRIPTION
Refuses non-loopback URLs. Requires PowerShell 7 for -SkipHttpErrorCheck.
The API server must already be running against a local development database.
#>
[CmdletBinding()]
param(
    [Parameter()]
    [string] $BaseUrl = 'http://localhost:3001'
)

$ErrorActionPreference = 'Stop'
$requiredFailure = $false
$baseUri = $null

try {
    $baseUri = [Uri]::new($BaseUrl)
}
catch {
    Write-Host "BLOCKED Base URL is invalid: $BaseUrl"
    exit 2
}

$loopbackHosts = @('localhost', '127.0.0.1', '::1', '[::1]')
if ($baseUri.Scheme -ne 'http' -or $baseUri.Host -notin $loopbackHosts) {
    Write-Host 'BLOCKED Refusing non-loopback or non-HTTP base URL; this script is local-only.'
    exit 2
}

$normalizedBase = $BaseUrl.TrimEnd('/')

function Invoke-RequiredGet {
    param(
        [Parameter(Mandatory)]
        [string] $Path,

        [Parameter(Mandatory)]
        [string] $ExpectedContentType,

        [Parameter()]
        [scriptblock] $ValidateBody
    )

    $uri = "$normalizedBase$Path"
    Write-Host "GET $Path"

    try {
        $response = Invoke-WebRequest `
            -Uri $uri `
            -Method Get `
            -Headers @{ Accept = 'application/json' } `
            -TimeoutSec 10 `
            -SkipHttpErrorCheck
    }
    catch {
        Write-Host "BLOCKED $Path - local API could not be reached."
        $script:requiredFailure = $true
        return $false
    }

    $contentType = [string] $response.Headers['Content-Type']
    if ($response.StatusCode -ne 200) {
        Write-Host "FAIL $Path - HTTP $($response.StatusCode)"
        $script:requiredFailure = $true
        return $false
    }

    if ($contentType -notlike "*$ExpectedContentType*") {
        Write-Host "FAIL $Path - unexpected Content-Type '$contentType'"
        $script:requiredFailure = $true
        return $false
    }

    try {
        $body = $response.Content | ConvertFrom-Json -ErrorAction Stop
        if ($ValidateBody -and -not (& $ValidateBody $body)) {
            Write-Host "FAIL $Path - response body did not match the expected shape."
            $script:requiredFailure = $true
            return $false
        }
    }
    catch {
        Write-Host "FAIL $Path - response was not valid JSON."
        $script:requiredFailure = $true
        return $false
    }

    Write-Host "PASS $Path - HTTP 200"
    return $true
}

$liveCompleted = Invoke-RequiredGet `
    -Path '/api/v1/health/live' `
    -ExpectedContentType 'application/json' `
    -ValidateBody { param($body) $body.status -eq 'HEALTHY' -and $body.components.process.status -eq 'UP' }

if (-not $liveCompleted) {
    Write-Host 'SKIPPED readiness and catalog checks because liveness did not pass.'
    exit 1
}

$readyCompleted = Invoke-RequiredGet `
    -Path '/api/v1/health/ready' `
    -ExpectedContentType 'application/json' `
    -ValidateBody { param($body) $body.status -eq 'HEALTHY' }

if (-not $readyCompleted) {
    Write-Host 'SKIPPED catalog check because readiness did not pass.'
    exit 1
}

$null = Invoke-RequiredGet `
    -Path '/api/v1/taxonomy/metals' `
    -ExpectedContentType 'application/json' `
    -ValidateBody { param($body) $null -ne $body.data }

if ($requiredFailure) {
    exit 1
}

Write-Host 'PASS All required local API smoke checks passed.'
exit 0
