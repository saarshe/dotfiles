import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
} from "fs";
import { dirname, join, resolve } from "path";

// ---------------------------------------------------------------------------
// .stow-local-ignore parsing
// ---------------------------------------------------------------------------

export interface IgnoreRule {
  pattern: string;
  regex: RegExp;
  componentRegex: RegExp;
  anchored: boolean;
}

export function getIgnorePatterns(dotfilesDir: string): IgnoreRule[] {
  const ignoreFile = join(dotfilesDir, ".stow-local-ignore");
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

export function isIgnored(relPath: string, rules: IgnoreRule[]): boolean {
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

export function getStowFiles(dotfilesDir: string): string[] {
  const patterns = getIgnorePatterns(dotfilesDir);
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

  walk(dotfilesDir, "");
  return files.sort();
}

// ---------------------------------------------------------------------------
// Symlink check
// ---------------------------------------------------------------------------

export function isOurSymlink(
  file: string,
  home: string,
  dotfilesDir: string
): boolean {
  const target = join(home, file);
  try {
    const stat = lstatSync(target);
    if (!stat.isSymbolicLink()) return false;

    let linkTarget = readlinkSync(target);
    if (!linkTarget.startsWith("/")) {
      linkTarget = resolve(dirname(target), linkTarget);
    }
    return linkTarget === join(dotfilesDir, file);
  } catch {
    return false;
  }
}
