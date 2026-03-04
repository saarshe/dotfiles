import { $ } from "bun";
import * as p from "@clack/prompts";
import color from "picocolors";
import gradient from "gradient-string";
import { lstatSync } from "fs";
import { join } from "path";
import {
  HOME,
  DOTFILES_DIR,
  BACKUP_DIR,
  LINK_ONLY,
  createTracker,
} from "./config.ts";
import { withSpinner } from "./ui.ts";
import { getStowFiles, isOurSymlink } from "./stow.ts";
import { resolveConflicts, hideSkippedFiles, restoreSkippedFiles } from "./conflicts.ts";
import { installDeps } from "./steps.ts";
import { printSummary } from "./summary.ts";
import { createLocalConfigs } from "./templates.ts";

const BANNER = `██████╗  ██████╗ ████████╗███████╗██╗██╗     ███████╗███████╗
██╔══██╗██╔═══██╗╚══██╔══╝██╔════╝██║██║     ██╔════╝██╔════╝
██║  ██║██║   ██║   ██║   █████╗  ██║██║     █████╗  ███████╗
██║  ██║██║   ██║   ██║   ██╔══╝  ██║██║     ██╔══╝  ╚════██║
██████╔╝╚██████╔╝   ██║   ██║     ██║███████╗███████╗███████║
╚═════╝  ╚═════╝    ╚═╝   ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝`;

const RAINBOW: [string, ...string[]] = [
  "#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0077ff", "#4b0082", "#8b00ff",
];

const tracker = createTracker();
const paths = { home: HOME, backupDir: BACKUP_DIR, dotfilesDir: DOTFILES_DIR };

async function main() {
  const PAD = "    ";
  console.log();
  const colored = gradient(RAINBOW).multiline(BANNER);
  for (const line of colored.split("\n")) {
    console.log(PAD + line);
  }
  console.log();
  p.intro(color.bgCyan(color.black(" dotfiles bootstrap ")));

  if (LINK_ONLY) {
    p.log.info(color.dim("--link-only: skipping dependency installation"));
  } else {
    await installDeps(tracker);
  }

  const stowFiles = getStowFiles(DOTFILES_DIR);

  const conflicts: string[] = [];
  for (const file of stowFiles) {
    const target = join(HOME, file);
    if (isOurSymlink(file, HOME, DOTFILES_DIR)) {
      tracker.alreadyLinked.push(file);
    } else {
      try {
        lstatSync(target);
        conflicts.push(file);
      } catch {
        // No conflict
      }
    }
  }

  await resolveConflicts(conflicts, paths, tracker);

  // Hide skipped files, run stow, restore — with cleanup on failure
  hideSkippedFiles(tracker.skipped, DOTFILES_DIR);
  try {
    await withSpinner("Deploying dotfiles with stow", () =>
      $`cd ${DOTFILES_DIR} && stow --no-folding -t ${HOME} .`.then(() => {})
    );
  } finally {
    restoreSkippedFiles(tracker.skipped, DOTFILES_DIR);
  }

  createLocalConfigs(HOME, DOTFILES_DIR);
  await printSummary(stowFiles, tracker, BACKUP_DIR);

  p.outro(
    color.green("Done! Open a new terminal to start using your dotfiles.")
  );
}

main().catch((err) => {
  restoreSkippedFiles(tracker.skipped, DOTFILES_DIR);
  p.cancel("Bootstrap failed.");
  console.error(err);
  process.exit(1);
});
