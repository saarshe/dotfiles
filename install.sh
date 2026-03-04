#!/usr/bin/env bash
set -euo pipefail

DOTFILES="$HOME/.dotfiles"

if [ -d "$DOTFILES" ]; then
  echo "~/.dotfiles already exists — pulling latest and running bootstrap..."
  cd "$DOTFILES" && git pull --ff-only
else
  git clone https://github.com/saarshe/dotfiles.git "$DOTFILES"
  cd "$DOTFILES"
fi

./bootstrap.sh "$@"
