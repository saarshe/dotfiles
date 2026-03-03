# fnm
eval "$(fnm env --use-on-cd --shell zsh)"

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
export PATH="$PATH:$HOME/.local/bin"

# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

ZSH_THEME="powerlevel10k/powerlevel10k"

DISABLE_AUTO_TITLE="true"
ENABLE_CORRECTION="true"

# Enable Zsh's completion system
autoload -U compinit && compinit

ZSH_HIGHLIGHT_HIGHLIGHTERS=(main brackets)

ZSH_AUTOSUGGEST_STRATEGY=(history completion)

# Autocomplete commands, options, and files
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}' 'r:|[._-]=** r:|=**'
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'ls --color $realpath'

plugins=(git zsh-autosuggestions zsh-syntax-highlighting dirhistory macos fzf-tab)

source $ZSH/oh-my-zsh.sh

# --- Aliases ---

# Yarn / Package Management
alias y='yarn'
alias yb="yarn build"
alias yba="yarn build:app"
alias ys="yarn start"
alias ysa="yarn start:app"
alias yt="yarn test"
alias ytw="yarn test:watch"

# Git
alias gc-="git checkout -"
alias gmm="git merge master"
alias gs="git stash"
alias gsp="git stash pop"

# Navigation
alias ..="cd .."
alias ...="cd ../.."
alias e0='exit 0'

# Date/Time
alias now='date "+%Y-%m-%d %H:%M:%S"'
alias ts='date +%s'

# macOS Finder
alias showfiles='defaults write com.apple.finder AppleShowAllFiles -bool true && killall Finder'
alias hidefiles='defaults write com.apple.finder AppleShowAllFiles -bool false && killall Finder'

# Tools
alias c="claude"

# --- Keybindings ---

# Option + Right Arrow: forward-word
bindkey '\ef' forward-word

# Option + Left Arrow: backward-word
bindkey '\eb' backward-word

# Option + Backspace: backward-kill-word
bindkey '\e\x7f' backward-kill-word

# --- Shell integrations ---
eval "$(zoxide init zsh)"

# --- Machine-local config (not committed) ---
[[ -f ~/.zshrc.local ]] && source ~/.zshrc.local
[[ -f ~/.secrets ]] && source ~/.secrets
