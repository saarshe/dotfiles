import { join } from "path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const HOME = process.env.HOME!;
export const DOTFILES_DIR = join(HOME, ".dotfiles");
export const BACKUP_DIR = join(
  HOME,
  ".dotfiles-backup",
  new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)
);
export const LINK_ONLY = process.argv.includes("--link-only");

// ---------------------------------------------------------------------------
// Result tracker — replaces module-level mutable arrays
// ---------------------------------------------------------------------------

export interface ResultTracker {
  backedUp: string[];
  overwritten: string[];
  skipped: string[];
  alreadyLinked: string[];
  toolsInstalled: string[];
  toolsAlreadyPresent: string[];
  toolsFailed: string[];
}

export function createTracker(): ResultTracker {
  return {
    backedUp: [],
    overwritten: [],
    skipped: [],
    alreadyLinked: [],
    toolsInstalled: [],
    toolsAlreadyPresent: [],
    toolsFailed: [],
  };
}
