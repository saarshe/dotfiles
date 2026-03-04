# dotfiles

My macOS development environment — shell, window manager, and tools config. This is a living repo that reflects what I actually use day-to-day; it updates as my workflow evolves.

Feel free to fork it, gut what you don't need, and make it yours.

Managed with [GNU Stow](https://www.gnu.org/software/stow/) — a simple tool that creates symlinks from a source directory into a target directory, mirroring the folder structure. Instead of copying config files around, stow links them so edits in the repo are immediately live.

Everything lives in a single flat stow package — one command symlinks all files into `~`:

```bash
cd ~/.dotfiles && stow --no-folding -t ~ .
```

`--no-folding` creates individual file symlinks (not directory symlinks), so `~/.config/` can hold other non-managed files alongside these.

The bootstrap script automatically detects conflicts with existing files and lets you choose how to handle each one — backup, overwrite, or skip.

## What's included

### Zsh (`.zshrc`)

<details>
<summary>Oh My Zsh with Powerlevel10k, plugins, aliases, and keybindings</summary>

#### Theme

[Powerlevel10k](https://github.com/romkatv/powerlevel10k) with instant prompt enabled.

#### Plugins

| Plugin | Description |
|--------|-------------|
| `git` | Built-in — aliases and functions for git |
| `zsh-autosuggestions` | Fish-like autosuggestions from history and completions |
| `zsh-syntax-highlighting` | Real-time command syntax highlighting (with `main` and `brackets` highlighters) |
| `dirhistory` | Navigate directory history with `Alt+Up/Down/Left/Right` |
| `macos` | Helpers for macOS (e.g. `ofd` to open Finder, `cdf` to cd to Finder dir) |
| `fzf-tab` | Replace default completion with fzf — includes directory preview on `cd` |

#### Completion

- Case-insensitive matching (`m:{a-z}={A-Za-z}`)
- Fuzzy substring matching on `.`, `_`, and `-`
- Autosuggestion strategy: `history` then `completion`

#### Aliases

| Alias | Command | Category |
|-------|---------|----------|
| `y` | `yarn` | Package management |
| `yb` | `yarn build` | Package management |
| `yba` | `yarn build:app` | Package management |
| `ys` | `yarn start` | Package management |
| `ysa` | `yarn start:app` | Package management |
| `yt` | `yarn test` | Package management |
| `ytw` | `yarn test:watch` | Package management |
| `gc-` | `git checkout -` | Git |
| `gmm` | `git merge master` | Git |
| `gs` | `git stash` | Git |
| `gsp` | `git stash pop` | Git |
| `..` | `cd ..` | Navigation |
| `...` | `cd ../..` | Navigation |
| `e0` | `exit 0` | Navigation |
| `now` | `date "+%Y-%m-%d %H:%M:%S"` | Date/Time |
| `ts` | `date +%s` | Date/Time |
| `showfiles` | Show hidden files in Finder | macOS |
| `hidefiles` | Hide hidden files in Finder | macOS |
| `c` | `claude` | Tools |

#### Keybindings

| Key | Action |
|-----|--------|
| `Option + Right` | Forward word |
| `Option + Left` | Backward word |
| `Option + Backspace` | Backward kill word |

#### Shell integrations

- [fnm](https://github.com/Schniz/fnm) — fast Node.js version manager (auto-switches on `cd`)
- [pyenv](https://github.com/pyenv/pyenv) — Python version manager
- [zoxide](https://github.com/ajeetdsouza/zoxide) — smarter `cd` (jump to frecent directories with `z`)

#### Machine-local overrides

Sources `~/.zshrc.local` and `~/.secrets` if they exist.

</details>

### Zsh Profile (`.zprofile`)

Sets up Homebrew shell environment (`/opt/homebrew/bin/brew shellenv`) and adds Python 2.7 to `PATH`.

### Powerlevel10k (`.p10k.zsh`)

Auto-generated prompt configuration. Run `p10k configure` to customize interactively.

### AeroSpace (`.config/aerospace/aerospace.toml`)

<details>
<summary>i3-like tiling window manager for macOS</summary>

#### Differences from the [default config](https://nikitabobko.github.io/AeroSpace/guide#default-config)

| Setting | Default | This config |
|---------|---------|-------------|
| `after-startup-command` | `[]` | Launches [JankyBorders](#jankyborders-configbordersbordersrc) |
| `start-at-login` | `false` | `true` |
| `automatically-unhide-macos-hidden-apps` | `false` | `true` |
| `gaps.inner.horizontal` | `0` | `8` |
| `gaps.inner.vertical` | `0` | `8` |
| `on-focused-monitor-changed` | `['move-mouse monitor-lazy-center']` | _removed_ (mouse stays put) |
| `alt-tab` | `workspace-back-and-forth` | _removed_ |
| `alt-shift-tab` | `move-workspace-to-monitor --wrap-around next` | _removed_ |
| `cmd-alt-left/right` | _(unbound)_ | Move workspace to monitor left / right (wrap-around) |
| `alt-shift-f` | _(unbound)_ | Toggle fullscreen |
| Service mode: `down/up` | _(unbound)_ | Volume down / up |
| Service mode: `shift-down` | _(unbound)_ | Mute (volume 0) |
| `on-window-detected` | _(none)_ | Auto-assigns 9 apps to named workspaces (see below) |

Everything else (layout, orientation, accordion-padding, keybindings for focus/move/resize/layout/workspaces/service-mode) matches the defaults.

#### Auto-assign rules

Apps are automatically moved to dedicated workspaces on launch:

| App | Workspace |
|-----|-----------|
| iTerm2 | **T** (terminal) |
| Spotify | **M** (music) |
| Zoom | **Z** |
| Slack | **S** |
| Obsidian | **N** (notes) |
| WhatsApp | **W** |
| GitHub Desktop | **G** |
| Xcode | **X** |
| IntelliJ IDEA | **I** |

#### Keybindings quick reference

**Main mode** — vim-style navigation with `Alt` as the modifier:

| Key | Action |
|-----|--------|
| `Alt + H/J/K/L` | Focus left / down / up / right |
| `Alt + Shift + H/J/K/L` | Move window left / down / up / right |
| `Alt + /` | Toggle tiles layout (horizontal / vertical) |
| `Alt + ,` | Toggle accordion layout (horizontal / vertical) |
| `Alt + -` / `Alt + =` | Resize window -50 / +50 |
| `Alt + Shift + F` | Toggle fullscreen |
| `Alt + 1-9` / `Alt + A-Z` | Switch to workspace |
| `Alt + Shift + 1-9` / `Alt + Shift + A-Z` | Move window to workspace |
| `Cmd + Alt + Left/Right` | Move workspace to adjacent monitor |
| `Alt + Shift + ;` | Enter service mode |

**Service mode** (`Alt + Shift + ;` to enter):

| Key | Action |
|-----|--------|
| `Esc` | Reload config and return to main mode |
| `R` | Flatten workspace tree (reset layout) |
| `F` | Toggle floating / tiling |
| `Backspace` | Close all windows except current |
| `Alt + Shift + H/J/K/L` | Join with adjacent window |
| `Up` / `Down` | Volume up / down |
| `Shift + Down` | Mute and return to main mode |

</details>

### JankyBorders (`.config/borders/bordersrc`)

<details>
<summary>Window border styling for AeroSpace</summary>

| Setting | Value |
|---------|-------|
| Style | `round` |
| Width | `6.0` |
| HiDPI | `on` |
| Active color | `#e2e2e3` (light gray) |
| Inactive color | `#414550` (dark gray) |

</details>

## Machine-local files (not committed)

| File | Purpose |
|------|---------|
| `~/.gitconfig` | Personal git identity and settings |
| `~/.zshrc.local` | Machine-specific shell config (sourced by `.zshrc`) |
| `~/.secrets` | API tokens and secrets (sourced by `.zshrc`) |

Templates for `.zshrc.local` and `.secrets` are in [`templates/`](templates/).

## Bootstrap a new machine

```bash
git clone https://github.com/saarshe/dotfiles.git ~/.dotfiles
~/.dotfiles/bootstrap.sh
```

The bootstrap script installs:

- [Homebrew](https://brew.sh)
- [GNU Stow](https://www.gnu.org/software/stow/)
- [Oh My Zsh](https://ohmyz.sh)
- Zsh plugins: zsh-autosuggestions, zsh-syntax-highlighting, fzf-tab
- [Powerlevel10k](https://github.com/romkatv/powerlevel10k) theme
- CLI tools: [fnm](https://github.com/Schniz/fnm), [pyenv](https://github.com/pyenv/pyenv), [zoxide](https://github.com/ajeetdsouza/zoxide), [fzf](https://github.com/junegunn/fzf)

Then deploys dotfiles via `stow` and copies template files for local config.

## Adding a new dotfile

1. Move the file into `~/.dotfiles/` at the same relative path it would have under `~`
2. Re-run `stow --no-folding -t ~ .`
3. Commit and push
