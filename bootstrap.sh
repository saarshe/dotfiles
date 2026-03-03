#!/usr/bin/env bash
set -euo pipefail

# Bootstrap a new macOS machine with dotfiles.
# Usage: ~/.dotfiles/bootstrap.sh

DOTFILES_DIR="$HOME/.dotfiles"

echo "==> Installing Homebrew (if missing)..."
if ! command -v brew &>/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

echo "==> Installing stow..."
brew install stow

echo "==> Installing Oh My Zsh (if missing)..."
if [[ ! -d "$HOME/.oh-my-zsh" ]]; then
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

ZSH_CUSTOM="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"

echo "==> Installing zsh plugins..."
[[ -d "$ZSH_CUSTOM/plugins/zsh-autosuggestions" ]] || \
  git clone https://github.com/zsh-users/zsh-autosuggestions "$ZSH_CUSTOM/plugins/zsh-autosuggestions"

[[ -d "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" ]] || \
  git clone https://github.com/zsh-users/zsh-syntax-highlighting "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting"

[[ -d "$ZSH_CUSTOM/plugins/fzf-tab" ]] || \
  git clone https://github.com/Aloxaf/fzf-tab "$ZSH_CUSTOM/plugins/fzf-tab"

echo "==> Installing Powerlevel10k..."
[[ -d "$ZSH_CUSTOM/themes/powerlevel10k" ]] || \
  git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "$ZSH_CUSTOM/themes/powerlevel10k"

echo "==> Installing CLI tools..."
brew install fnm pyenv zoxide fzf

echo "==> Deploying dotfiles with stow..."
cd "$DOTFILES_DIR"
stow --no-folding -t ~ .

echo "==> Creating local config files from templates (if missing)..."
if [[ ! -f "$HOME/.zshrc.local" ]]; then
  cp "$DOTFILES_DIR/templates/zshrc.local.example" "$HOME/.zshrc.local"
  echo "    Created ~/.zshrc.local — edit with your machine-specific config"
fi

if [[ ! -f "$HOME/.secrets" ]]; then
  cp "$DOTFILES_DIR/templates/secrets.example" "$HOME/.secrets"
  echo "    Created ~/.secrets — fill in your tokens"
fi

echo ""
echo "Done! Open a new terminal to start using your dotfiles."
