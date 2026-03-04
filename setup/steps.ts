import { $ } from "bun";
import * as p from "@clack/prompts";
import color from "picocolors";
import { existsSync } from "fs";
import { join } from "path";
import type { ResultTracker } from "./config.ts";
import { printAnimated, toggleSelect, withSpinner } from "./ui.ts";

// ---------------------------------------------------------------------------
// Step interface + registry
// ---------------------------------------------------------------------------

export interface Step {
  id: string;
  label: string;
  description: string;
  check: () => boolean;
  install: () => Promise<void>;
  required?: boolean;
}

const ZSH_CUSTOM = () =>
  process.env.ZSH_CUSTOM || join(process.env.HOME!, ".oh-my-zsh/custom");

export const steps: Step[] = [
  {
    id: "stow",
    label: "GNU Stow",
    description: "Symlink manager for dotfiles",
    required: true,
    check: () => Bun.spawnSync(["which", "stow"]).success,
    install: async () => {
      await $`brew install stow`.quiet();
    },
  },
  {
    id: "oh-my-zsh",
    label: "Oh My Zsh",
    description: "Zsh configuration framework",
    check: () => existsSync(join(process.env.HOME!, ".oh-my-zsh")),
    install: async () => {
      await $`RUNZSH=no KEEP_ZSHRC=yes sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended`;
    },
  },
  {
    id: "zsh-autosuggestions",
    label: "zsh-autosuggestions",
    description: "Fish-like autosuggestions for Zsh",
    check: () => existsSync(join(ZSH_CUSTOM(), "plugins/zsh-autosuggestions")),
    install: async () => {
      await $`git clone https://github.com/zsh-users/zsh-autosuggestions ${join(ZSH_CUSTOM(), "plugins/zsh-autosuggestions")}`.quiet();
    },
  },
  {
    id: "zsh-syntax-highlighting",
    label: "zsh-syntax-highlighting",
    description: "Fish-like syntax highlighting for Zsh",
    check: () =>
      existsSync(join(ZSH_CUSTOM(), "plugins/zsh-syntax-highlighting")),
    install: async () => {
      await $`git clone https://github.com/zsh-users/zsh-syntax-highlighting ${join(ZSH_CUSTOM(), "plugins/zsh-syntax-highlighting")}`.quiet();
    },
  },
  {
    id: "fzf-tab",
    label: "fzf-tab",
    description: "Fuzzy completion for Zsh using fzf",
    check: () => existsSync(join(ZSH_CUSTOM(), "plugins/fzf-tab")),
    install: async () => {
      await $`git clone https://github.com/Aloxaf/fzf-tab ${join(ZSH_CUSTOM(), "plugins/fzf-tab")}`.quiet();
    },
  },
  {
    id: "powerlevel10k",
    label: "Powerlevel10k",
    description: "Fast and flexible Zsh theme",
    check: () => existsSync(join(ZSH_CUSTOM(), "themes/powerlevel10k")),
    install: async () => {
      await $`git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${join(ZSH_CUSTOM(), "themes/powerlevel10k")}`.quiet();
    },
  },
  {
    id: "fnm",
    label: "fnm",
    description: "Fast Node.js version manager",
    check: () => Bun.spawnSync(["which", "fnm"]).success,
    install: async () => {
      await $`brew install fnm`.quiet();
    },
  },
  {
    id: "pyenv",
    label: "pyenv",
    description: "Python version manager",
    check: () => Bun.spawnSync(["which", "pyenv"]).success,
    install: async () => {
      await $`brew install pyenv`.quiet();
    },
  },
  {
    id: "zoxide",
    label: "zoxide",
    description: "Smarter cd command",
    check: () => Bun.spawnSync(["which", "zoxide"]).success,
    install: async () => {
      await $`brew install zoxide`.quiet();
    },
  },
  {
    id: "fzf",
    label: "fzf",
    description: "Command-line fuzzy finder",
    check: () => Bun.spawnSync(["which", "fzf"]).success,
    install: async () => {
      await $`brew install fzf`.quiet();
    },
  },
];

// ---------------------------------------------------------------------------
// Interactive dependency installation
// ---------------------------------------------------------------------------

export async function installDeps(tracker: ResultTracker) {
  const installed: Step[] = [];
  const notInstalled: Step[] = [];

  for (const step of steps) {
    if (step.check()) {
      installed.push(step);
    } else {
      notInstalled.push(step);
    }
  }

  if (installed.length > 0) {
    p.log.step(color.dim("Already installed:"));
    await printAnimated(
      installed.map(
        (s) => color.dim(`${color.green("✓")} ${s.label} — ${s.description}`)
      )
    );
  }

  tracker.toolsAlreadyPresent.push(...installed.map((s) => s.label));

  if (notInstalled.length === 0) {
    p.log.success("All tools already installed");
    return;
  }

  const selectedSet = await toggleSelect(
    notInstalled.map((s) => ({
      id: s.id,
      label: s.label,
      hint: s.description,
      required: s.required,
    })),
    new Set(notInstalled.map((s) => s.id))
  );

  const toInstall = notInstalled.filter((s) => selectedSet.has(s.id));

  for (const step of toInstall) {
    try {
      await withSpinner(
        `Installing ${step.label} — ${step.description}`,
        () => step.install()
      );
      tracker.toolsInstalled.push(step.label);
    } catch (err) {
      tracker.toolsFailed.push(step.label);
      if (step.required) {
        p.cancel(`Required tool ${step.label} failed to install.`);
        console.error(err);
        process.exit(1);
      }
      p.log.warn(`Skipping ${step.label}: ${err}`);
    }
  }
}
