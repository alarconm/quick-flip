# TradeUp Development Makefile
# Usage: make <command>

.PHONY: help validate test dev install-hooks push deploy logs status verify

# Default target
help:
	@echo "TradeUp Development Commands"
	@echo "============================"
	@echo ""
	@echo "  make validate     - Run pre-deployment validation"
	@echo "  make push         - Validate and push to main"
	@echo "  make push-verify  - Push and wait to verify deployment"
	@echo "  make status       - Quick check of production health"
	@echo "  make verify       - Full deployment verification"
	@echo ""
	@echo "  make dev          - Start local development server"
	@echo "  make test         - Run tests"
	@echo "  make install-hooks - Install git pre-push hook"
	@echo "  make logs         - View Railway logs"
	@echo ""

# Run validation before deploy
validate:
	@python scripts/validate.py

# Run tests
test:
	@pytest -v

# Start local dev server
dev:
	@cp -n .env.local.example .env 2>/dev/null || true
	@echo "Starting local server on http://localhost:5000"
	@flask run --port 5000 --reload

# Install git hooks
install-hooks:
	@echo "Installing git hooks..."
	@cp scripts/pre-push .git/hooks/pre-push
	@chmod +x .git/hooks/pre-push
	@echo "Pre-push hook installed!"

# Validate and push to main
push: validate
	@echo ""
	@echo "Validation passed! Pushing to main..."
	@git push origin main
	@echo ""
	@echo "Pushed! Railway will auto-deploy."
	@echo "Run 'make status' or 'make verify' to check deployment."

# Push and wait to verify
push-verify: validate
	@echo ""
	@echo "Validation passed! Pushing to main..."
	@git push origin main
	@echo ""
	@python scripts/verify_deploy.py

# Alias for push
deploy: push

# View Railway logs (requires railway CLI login)
logs:
	@railway logs

# Quick status check
status:
	@python scripts/verify_deploy.py --quick --retries 1

# Full deployment verification with retries
verify:
	@python scripts/verify_deploy.py --quick
