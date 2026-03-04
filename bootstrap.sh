#!/usr/bin/env bash
set -euo pipefail

# Thin wrapper: ensure Homebrew + Bun exist, install deps, then hand off to TypeScript.

DOTFILES_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v brew &>/dev/null; then
  echo "==> Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

if ! command -v bun &>/dev/null; then
  echo "==> Installing Bun..."
  brew install oven-sh/bun/bun
fi

cd "$DOTFILES_DIR"
bun install --frozen-lockfile 2>/dev/null || bun install
exec bun run setup/index.ts "$@"
