# dotfiles

Personal dotfiles managed with [GNU Stow](https://www.gnu.org/software/stow/).

## Structure

A single flat stow package — all dotfiles live at the repo root. One command deploys everything:

```bash
cd ~/.dotfiles && stow --no-folding -t ~ .
```

`--no-folding` creates individual file symlinks (not directory symlinks), so `~/.config/` can contain other non-managed files.

### Managed files

| File | Description |
|------|-------------|
| `.zshrc` | Portable shell config with inlined aliases |
| `.zprofile` | Homebrew + Python PATH |
| `.p10k.zsh` | Powerlevel10k theme |
| `.config/aerospace/aerospace.toml` | Tiling window manager |
| `.config/borders/bordersrc` | Window border styling |

### Not managed (machine-local)

| File | Description |
|------|-------------|
| `~/.gitconfig` | Personal git config |
| `~/.zshrc.local` | Machine-specific config (sourced conditionally) |
| `~/.secrets` | API tokens and secrets |

Templates for `~/.zshrc.local` and `~/.secrets` are in `templates/`.

## Bootstrap a new machine

```bash
git clone https://github.com/saarshe/dotfiles.git ~/.dotfiles
~/.dotfiles/bootstrap.sh
```

This installs Homebrew, stow, Oh My Zsh, plugins, Powerlevel10k, CLI tools, and deploys the dotfiles.

## Adding a new dotfile

1. Move the file into `~/.dotfiles/` at the same relative path it would have under `~`
2. Re-run `stow --no-folding -t ~ .`
3. Commit and push
