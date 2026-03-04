import * as p from "@clack/prompts";
import color from "picocolors";
import {
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} from "fs";
import { dirname, join } from "path";
import type { ResultTracker } from "./config.ts";
import { cancelGuard, printAnimated } from "./ui.ts";

// ---------------------------------------------------------------------------
// Individual file actions
// ---------------------------------------------------------------------------

export interface Paths {
  home: string;
  backupDir: string;
  dotfilesDir: string;
}

export function backupFile(file: string, paths: Paths, tracker: ResultTracker) {
  const source = join(paths.home, file);
  const dest = join(paths.backupDir, file);
  mkdirSync(dirname(dest), { recursive: true });
  renameSync(source, dest);
  tracker.backedUp.push(file);
  p.log.info(
    `${color.yellow("◇")} Backed up ~/${file} → ${color.dim(dest)}`
  );
}

export function overwriteFile(file: string, paths: Paths, tracker: ResultTracker) {
  unlinkSync(join(paths.home, file));
  tracker.overwritten.push(file);
  p.log.info(`${color.red("◇")} Overwritten ~/${file}`);
}

export function skipFile(file: string, _paths: Paths, tracker: ResultTracker) {
  tracker.skipped.push(file);
  p.log.info(`${color.dim("◇")} Skipped ~/${file}`);
}

// ---------------------------------------------------------------------------
// Conflict resolution orchestrator
// ---------------------------------------------------------------------------

export async function resolveConflicts(
  conflicts: string[],
  paths: Paths,
  tracker: ResultTracker
) {
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
    for (const file of conflicts) actions[strategy](file, paths, tracker);
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
    actions[action as Action](file, paths, tracker);
  }
}

// ---------------------------------------------------------------------------
// Skip handling — hide/restore skipped files during stow
// ---------------------------------------------------------------------------

export function hideSkippedFiles(skipped: string[], dotfilesDir: string) {
  for (const file of skipped) {
    renameSync(
      join(dotfilesDir, file),
      join(dotfilesDir, `${file}.__skip__`)
    );
  }
}

export function restoreSkippedFiles(skipped: string[], dotfilesDir: string) {
  for (const file of skipped) {
    const skipPath = join(dotfilesDir, `${file}.__skip__`);
    if (existsSync(skipPath)) {
      renameSync(skipPath, join(dotfilesDir, file));
    }
  }
}
