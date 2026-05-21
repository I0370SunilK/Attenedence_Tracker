$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }

        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
}

$mongoUri = [System.Environment]::GetEnvironmentVariable("MONGODB_URI", "Process")
if (-not $mongoUri) {
    Write-Error "MONGODB_URI is required. Copy .env.example to .env in the project root with your MongoDB Atlas connection string."
}
if ($mongoUri -match "localhost|127\.0\.0\.1") {
    Write-Error "Local MongoDB is disabled. Use MongoDB Atlas (mongodb+srv://...@cluster0.ivqu5bo.mongodb.net/attendance_tracker)."
}
if ($mongoUri -notmatch "ivqu5bo\.mongodb\.net") {
    Write-Error "MONGODB_URI must target cluster0.ivqu5bo.mongodb.net"
}

[System.Environment]::SetEnvironmentVariable("SPRING_DATA_MONGODB_URI", $mongoUri, "Process")
Write-Host "[INFO] MongoDB Atlas: cluster0.ivqu5bo.mongodb.net / attendance_tracker"

mvn spring-boot:run
