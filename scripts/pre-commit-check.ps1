# Pre-commit hook to check for migration drift (PowerShell version)
# 
# To install on Windows:
#   Copy this file to .git/hooks/pre-commit (remove .ps1 extension)
#   Or use husky: npx husky add .husky/pre-commit "npm run db:check"

Write-Host "🔍 Checking for migration drift before commit..." -ForegroundColor Cyan

# Check if schema.prisma or migrations changed
$stagedFiles = git diff --cached --name-only
$schemaChanged = $stagedFiles | Select-String -Pattern "prisma/schema.prisma|prisma/migrations/"

if ($schemaChanged) {
  Write-Host "⚠️  Database schema or migrations changed - checking for drift..." -ForegroundColor Yellow
  
  $result = npm run db:check
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Migration drift detected! Please fix before committing." -ForegroundColor Red
    Write-Host "   Run: npm run db:generate" -ForegroundColor Yellow
    exit 1
  }
  
  Write-Host "✅ Migration check passed" -ForegroundColor Green
}

exit 0
