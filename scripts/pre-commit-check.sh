#!/bin/bash
# Pre-commit hook to check for migration drift
# 
# To install: 
#   cp scripts/pre-commit-check.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Or use husky: npx husky add .husky/pre-commit "npm run db:check"

echo "🔍 Checking for migration drift before commit..."

# Check if schema.prisma or migrations changed
if git diff --cached --name-only | grep -q "prisma/schema.prisma\|prisma/migrations/"; then
  echo "⚠️  Database schema or migrations changed - checking for drift..."
  
  if ! npm run db:check; then
    echo ""
    echo "❌ Migration drift detected! Please fix before committing."
    echo "   Run: npm run db:generate"
    exit 1
  fi
  
  echo "✅ Migration check passed"
fi

exit 0
