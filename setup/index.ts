import { $ } from "bun";
import * as p from "@clack/prompts";
import color from "picocolors";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  unlinkSync,
} from "fs";
import { dirname, join, resolve } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HOME = process.env.HOME!;
const DOTFILES_DIR = join(HOME, ".dotfiles");
const BACKUP_DIR = join(
  HOME,
  ".dotfiles-backup",
  new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)
);
const LINK_ONLY = process.argv.includes("--link-only");

// Tracking arrays for the summary
const backedUp: string[] = [];
const overwritten: string[] = [];
const skipped: string[] = [];
const alreadyLinked: string[] = [];
const toolsInstalled: string[] = [];
const toolsAlreadyPresent: string[] = [];
const toolsFailed: string[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Print lines one-by-one with a short delay for readability. */
async function printAnimated(
  lines: string[],
  { delay = 40, indent = "  " } = {}
) {
  for (const line of lines) {
    process.stdout.write(`${indent}${line}\n`);
    await sleep(delay);
  }
}

/** Check if user cancelled a clack prompt and exit if so. */
function cancelGuard<T>(value: T | symbol): asserts value is T {
  if (p.isCancel(value)) {
    p.cancel("Aborted.");
    process.exit(1);
  }
}

/** Run an async task wrapped in a clack spinner. */
async function withSpinner<T>(
  message: string,
  fn: () => Promise<T>
): Promise<T> {
  const s = p.spinner();
  s.start(message);
  try {
    const result = await fn();
    s.stop(`${color.green("✓")} ${message}`);
    return result;
  } catch (err) {
    s.stop(`${color.red("✗")} ${message}`);
    throw err;
  }
}

/** Build a summary section: colored header + indented item list. */
function summarySection(
  header: string,
  items: string[],
  colorFn: (s: string) => string,
  symbol = "✓",
  suffix?: string
): string {
  let out =
    colorFn(`${header}:\n`) +
    items.map((t) => colorFn(`  ${symbol} ${t}`)).join("\n");
  if (suffix) out += `\n  ${suffix}`;
  return out;
}

// ---------------------------------------------------------------------------
// Step registry
// ---------------------------------------------------------------------------

interface Step {
  id: string;
  label: string;
  description: string;
  check: () => boolean;
  install: () => Promise<void>;
  required?: boolean;
}

const ZSH_CUSTOM = () =>
  process.env.ZSH_CUSTOM || join(HOME, ".oh-my-zsh/custom");

const steps: Step[] = [
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
    check: () => existsSync(join(HOME, ".oh-my-zsh")),
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

async function installDeps() {
  // 1. Check all steps
  const installed: Step[] = [];
  const notInstalled: Step[] = [];

  for (const step of steps) {
    if (step.check()) {
      installed.push(step);
    } else {
      notInstalled.push(step);
    }
  }

  // 2. Show already-installed items animated
  if (installed.length > 0) {
    p.log.step(color.dim("Already installed:"));
    await printAnimated(
      installed.map(
        (s) => color.dim(`${color.green("✓")} ${s.label} — ${s.description}`)
      )
    );
  }

  toolsAlreadyPresent.push(...installed.map((s) => s.label));

  // 3. If nothing to install, we're done
  if (notInstalled.length === 0) {
    p.log.success("All tools already installed");
    return;
  }

  // 4. Multiselect for items to install
  const requiredIds = new Set(
    notInstalled.filter((s) => s.required).map((s) => s.id)
  );

  const selected = await p.multiselect({
    message: `Select tools to install (${notInstalled.length} available)`,
    options: notInstalled.map((s) => ({
      value: s.id,
      label: s.required ? `${s.label} ${color.red("(required)")}` : s.label,
      hint: s.description,
    })),
    initialValues: notInstalled.map((s) => s.id),
    required: true,
  });

  cancelGuard(selected);

  // Ensure required items are included
  const selectedSet = new Set(selected as string[]);
  for (const id of requiredIds) {
    if (!selectedSet.has(id)) {
      selectedSet.add(id);
      p.log.warn(
        `${steps.find((s) => s.id === id)!.label} is required and was re-added`
      );
    }
  }

  // 5. Install selected items with spinners
  const toInstall = notInstalled.filter((s) => selectedSet.has(s.id));

  for (const step of toInstall) {
    try {
      await withSpinner(
        `Installing ${step.label} — ${step.description}`,
        () => step.install()
      );
      toolsInstalled.push(step.label);
    } catch (err) {
      toolsFailed.push(step.label);
      if (step.required) {
        p.cancel(`Required tool ${step.label} failed to install.`);
        console.error(err);
        process.exit(1);
      }
      p.log.warn(`Skipping ${step.label}: ${err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// .stow-local-ignore parsing
// ---------------------------------------------------------------------------

interface IgnoreRule {
  pattern: string;
  regex: RegExp;
  componentRegex: RegExp;
  anchored: boolean;
}

function getIgnorePatterns(): IgnoreRule[] {
  const ignoreFile = join(DOTFILES_DIR, ".stow-local-ignore");
  if (!existsSync(ignoreFile)) return [];

  return readFileSync(ignoreFile, "utf-8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((pattern) => ({
      pattern,
      regex: new RegExp(pattern),
      componentRegex: new RegExp(`^(?:${pattern})$`),
      anchored: pattern.startsWith("^/"),
    }));
}

function isIgnored(relPath: string, rules: IgnoreRule[]): boolean {
  for (const { regex, componentRegex, anchored } of rules) {
    if (anchored) {
      if (regex.test("/" + relPath)) return true;
    } else {
      for (const component of relPath.split("/")) {
        if (componentRegex.test(component)) return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function getStowFiles(): string[] {
  const patterns = getIgnorePatterns();
  const files: string[] = [];

  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!isIgnored(rel, patterns)) walk(join(dir, entry.name), rel);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        if (!isIgnored(rel, patterns)) files.push(rel);
      }
    }
  }

  walk(DOTFILES_DIR, "");
  return files.sort();
}

// ---------------------------------------------------------------------------
// Symlink check
// ---------------------------------------------------------------------------

function isOurSymlink(file: string): boolean {
  const target = join(HOME, file);
  try {
    const stat = lstatSync(target);
    if (!stat.isSymbolicLink()) return false;

    let linkTarget = readlinkSync(target);
    if (!linkTarget.startsWith("/")) {
      linkTarget = resolve(dirname(target), linkTarget);
    }
    return linkTarget === join(DOTFILES_DIR, file);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Conflict resolution
// ---------------------------------------------------------------------------

function backupFile(file: string) {
  const source = join(HOME, file);
  const dest = join(BACKUP_DIR, file);
  mkdirSync(dirname(dest), { recursive: true });
  renameSync(source, dest);
  backedUp.push(file);
  p.log.info(
    `${color.yellow("◇")} Backed up ~/${file} → ${color.dim(dest)}`
  );
}

function overwriteFile(file: string) {
  unlinkSync(join(HOME, file));
  overwritten.push(file);
  p.log.info(`${color.red("◇")} Overwritten ~/${file}`);
}

function skipFile(file: string) {
  skipped.push(file);
  p.log.info(`${color.dim("◇")} Skipped ~/${file}`);
}

async function resolveConflicts(conflicts: string[]) {
  if (conflicts.length === 0) return;

  p.log.warn(`${conflicts.length} conflicting file(s):`);
  await printAnimated(
    conflicts.map((f) => color.yellow(`~/${f}`)),
    { delay: 30 }
  );

  const strategy = await p.select({
    message: "How would you like to handle these?",
    options: [
      {
        value: "backup",
        label: "Backup all",
        hint: "move originals to ~/.dotfiles-backup/",
      },
      { value: "overwrite", label: "Overwrite all", hint: "delete originals" },
      { value: "ask", label: "Ask per file", hint: "decide individually" },
      { value: "quit", label: "Quit", hint: "abort without changes" },
    ],
  });

  cancelGuard(strategy);
  if (strategy === "quit") {
    p.cancel("Aborted.");
    process.exit(1);
  }

  const actions = {
    backup: backupFile,
    overwrite: overwriteFile,
    skip: skipFile,
  } as const;

  type Action = keyof typeof actions;

  if (strategy === "backup" || strategy === "overwrite") {
    for (const file of conflicts) actions[strategy](file);
    return;
  }

  // Per-file prompts
  for (const file of conflicts) {
    const action = await p.select({
      message: `~/${file}`,
      options: [
        {
          value: "backup",
          label: "Backup",
          hint: "move to ~/.dotfiles-backup/",
        },
        { value: "overwrite", label: "Overwrite", hint: "delete original" },
        { value: "skip", label: "Skip", hint: "leave as-is" },
      ],
    });

    cancelGuard(action);
    actions[action as Action](file);
  }
}

// ---------------------------------------------------------------------------
// Skip handling
// ---------------------------------------------------------------------------

function hideSkippedFiles() {
  for (const file of skipped) {
    renameSync(
      join(DOTFILES_DIR, file),
      join(DOTFILES_DIR, `${file}.__skip__`)
    );
  }
}

function restoreSkippedFiles() {
  for (const file of skipped) {
    const skipPath = join(DOTFILES_DIR, `${file}.__skip__`);
    if (existsSync(skipPath)) {
      renameSync(skipPath, join(DOTFILES_DIR, file));
    }
  }
}

// ---------------------------------------------------------------------------
// Template files
// ---------------------------------------------------------------------------

function createLocalConfigs() {
  const templates: [string, string, string][] = [
    ["zshrc.local.example", ".zshrc.local", "machine-specific shell config"],
    ["secrets.example", ".secrets", "your tokens"],
  ];

  for (const [template, target, desc] of templates) {
    const targetPath = join(HOME, target);
    if (!existsSync(targetPath)) {
      copyFileSync(join(DOTFILES_DIR, "templates", template), targetPath);
      p.log.info(`Created ~/${target} — edit with ${desc}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

async function printSummary(stowFiles: string[]) {
  const sections: string[] = [];

  if (toolsInstalled.length > 0) {
    sections.push(
      summarySection("Tools installed", toolsInstalled, color.green)
    );
  }
  if (toolsAlreadyPresent.length > 0) {
    sections.push(
      summarySection("Tools already present", toolsAlreadyPresent, color.dim)
    );
  }
  if (toolsFailed.length > 0) {
    sections.push(
      summarySection("Tools failed", toolsFailed, color.red, "✗")
    );
  }
  const skippedSet = new Set(skipped);
  const alreadySet = new Set(alreadyLinked);
  const newlyLinked = stowFiles.filter(
    (f) => !alreadySet.has(f) && !skippedSet.has(f)
  );

  if (newlyLinked.length > 0) {
    sections.push(
      summarySection(
        "Dotfiles linked",
        newlyLinked.map((f) => `~/${f}`),
        color.green,
        "→"
      )
    );
  }
  if (alreadyLinked.length > 0) {
    sections.push(
      summarySection(
        "Dotfiles already linked",
        alreadyLinked.map((f) => `~/${f}`),
        color.dim,
        "→"
      )
    );
  }
  if (backedUp.length > 0) {
    sections.push(
      summarySection(
        "Backed up",
        backedUp.map((f) => `~/${f}`),
        color.yellow,
        "→",
        color.dim(`→ ${BACKUP_DIR}`)
      )
    );
  }
  if (overwritten.length > 0) {
    sections.push(
      summarySection(
        "Overwritten",
        overwritten.map((f) => `~/${f}`),
        color.red,
        "✗"
      )
    );
  }
  if (skipped.length > 0) {
    sections.push(
      summarySection(
        "Skipped",
        skipped.map((f) => `~/${f}`),
        color.dim,
        "–"
      )
    );
  }

  if (sections.length > 0) {
    console.log(); // breathing room before summary
    p.log.step(color.bold("Summary"));
    await printAnimated(sections.flatMap((s) => [...s.split("\n"), ""]), {
      delay: 25,
    });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  p.intro(color.bgCyan(color.black(" dotfiles bootstrap ")));

  if (LINK_ONLY) {
    p.log.info(color.dim("--link-only: skipping dependency installation"));
  } else {
    await installDeps();
  }

  const stowFiles = getStowFiles();

  const conflicts: string[] = [];
  for (const file of stowFiles) {
    const target = join(HOME, file);
    if (isOurSymlink(file)) {
      alreadyLinked.push(file);
    } else {
      try {
        lstatSync(target);
        conflicts.push(file);
      } catch {
        // No conflict
      }
    }
  }

  await resolveConflicts(conflicts);

  // Hide skipped files, run stow, restore — with cleanup on failure
  hideSkippedFiles();
  try {
    await withSpinner("Deploying dotfiles with stow", () =>
      $`cd ${DOTFILES_DIR} && stow --no-folding -t ${HOME} .`.then(() => {})
    );
  } finally {
    restoreSkippedFiles();
  }

  createLocalConfigs();
  await printSummary(stowFiles);

  p.outro(
    color.green("Done! Open a new terminal to start using your dotfiles.")
  );
}

main().catch((err) => {
  restoreSkippedFiles();
  p.cancel("Bootstrap failed.");
  console.error(err);
  process.exit(1);
});
