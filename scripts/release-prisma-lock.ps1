# Script to release Prisma advisory locks
# This helps when migrations timeout due to advisory locks

param(
    [string]$DatabaseUrl = $env:DATABASE_URL
)

if (-not $DatabaseUrl) {
    Write-Host "Error: DATABASE_URL not found in environment" -ForegroundColor Red
    Write-Host "Please set DATABASE_URL or pass it as a parameter" -ForegroundColor Yellow
    exit 1
}

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
$urlParts = $DatabaseUrl -replace 'postgresql://', '' -split '@'
$userPass = $urlParts[0] -split ':'
$hostDb = $urlParts[1] -split '/'
$hostPort = $hostDb[0] -split ':'

$dbUser = $userPass[0]
$dbPassword = $userPass[1]
$dbHost = $hostPort[0]
$dbPort = if ($hostPort[1]) { $hostPort[1] } else { "5432" }
$dbName = $hostDb[1] -split '\?' | Select-Object -First 1

Write-Host "Connecting to database: $dbName@$dbHost:$dbPort" -ForegroundColor Cyan

# Prisma uses advisory lock ID: 72707369
$lockId = 72707369

# Create SQL to release all advisory locks for this process
$sql = @"
SELECT pg_advisory_unlock_all();
SELECT pid, usename, application_name, state, query_start 
FROM pg_stat_activity 
WHERE application_name LIKE '%prisma%' OR application_name LIKE '%migrate%';
"@

Write-Host "`nAttempting to release advisory locks..." -ForegroundColor Yellow
Write-Host "Lock ID: $lockId" -ForegroundColor Gray

# Try using psql if available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlPath) {
    $env:PGPASSWORD = $dbPassword
    $connectionString = "-h $dbHost -p $dbPort -U $dbUser -d $dbName"
    
    Write-Host "`nReleasing locks via psql..." -ForegroundColor Cyan
    $releaseCommand = "SELECT pg_advisory_unlock_all();"
    echo $releaseCommand | & psql $connectionString -c $releaseCommand
    
    Write-Host "`nChecking for Prisma processes..." -ForegroundColor Cyan
    $checkCommand = "SELECT pid, usename, application_name, state FROM pg_stat_activity WHERE application_name LIKE '%prisma%' OR application_name LIKE '%migrate%';"
    echo $checkCommand | & psql $connectionString -c $checkCommand
    
    Write-Host "`nLock released! You can now run migrations." -ForegroundColor Green
} else {
    Write-Host "`npsql not found. Please run this SQL manually:" -ForegroundColor Yellow
    Write-Host "`n$sql" -ForegroundColor White
    Write-Host "`nOr install PostgreSQL client tools and try again." -ForegroundColor Yellow
}
