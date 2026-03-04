import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, symlinkSync, rmSync } from "fs";
import { join } from "path";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import {
  getIgnorePatterns,
  isIgnored,
  getStowFiles,
  isOurSymlink,
} from "../stow.ts";
import type { IgnoreRule } from "../stow.ts";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "stow-test-"));
}

describe("getIgnorePatterns", () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("returns empty array when no ignore file exists", () => {
    expect(getIgnorePatterns(dir)).toEqual([]);
  });

  test("parses ignore file, skipping comments and empty lines", () => {
    writeFileSync(
      join(dir, ".stow-local-ignore"),
      "# comment\n\nnode_modules\n\\.git\n^/setup\n"
    );
    const rules = getIgnorePatterns(dir);
    expect(rules).toHaveLength(3);
    expect(rules[0]!.pattern).toBe("node_modules");
    expect(rules[0]!.anchored).toBe(false);
    expect(rules[2]!.pattern).toBe("^/setup");
    expect(rules[2]!.anchored).toBe(true);
  });
});

describe("isIgnored", () => {
  const rules: IgnoreRule[] = [
    {
      pattern: "node_modules",
      regex: new RegExp("node_modules"),
      componentRegex: new RegExp("^(?:node_modules)$"),
      anchored: false,
    },
    {
      pattern: "^/setup",
      regex: new RegExp("^/setup"),
      componentRegex: new RegExp("^(?:^/setup)$"),
      anchored: true,
    },
    {
      pattern: "\\.git",
      regex: new RegExp("\\.git"),
      componentRegex: new RegExp("^(?:\\.git)$"),
      anchored: false,
    },
  ];

  test("matches component pattern", () => {
    expect(isIgnored("node_modules", rules)).toBe(true);
    expect(isIgnored("foo/node_modules/bar.js", rules)).toBe(true);
  });

  test("matches anchored pattern", () => {
    expect(isIgnored("setup", rules)).toBe(true);
    expect(isIgnored("setup/index.ts", rules)).toBe(true);
  });

  test("does not match non-matching paths", () => {
    expect(isIgnored(".zshrc", rules)).toBe(false);
    expect(isIgnored(".config/foo", rules)).toBe(false);
  });

  test("matches .git component", () => {
    expect(isIgnored(".git", rules)).toBe(true);
    expect(isIgnored(".gitignore", rules)).toBe(false); // componentRegex requires exact match
  });
});

describe("getStowFiles", () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("discovers files recursively", () => {
    mkdirSync(join(dir, ".config", "sub"), { recursive: true });
    writeFileSync(join(dir, ".zshrc"), "");
    writeFileSync(join(dir, ".config", "sub", "conf"), "");

    const files = getStowFiles(dir);
    expect(files).toEqual([".config/sub/conf", ".zshrc"]);
  });

  test("respects ignore rules", () => {
    mkdirSync(join(dir, "node_modules"), { recursive: true });
    writeFileSync(join(dir, ".zshrc"), "");
    writeFileSync(join(dir, "node_modules", "pkg.js"), "");
    writeFileSync(
      join(dir, ".stow-local-ignore"),
      "node_modules\n"
    );

    const files = getStowFiles(dir);
    // .stow-local-ignore itself is not ignored unless listed
    expect(files).toContain(".zshrc");
    expect(files).not.toContain("node_modules/pkg.js");
  });
});

describe("isOurSymlink", () => {
  let home: string;
  let dotfiles: string;

  beforeEach(() => {
    home = makeTempDir();
    dotfiles = makeTempDir();
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(dotfiles, { recursive: true, force: true });
  });

  test("returns true for symlink pointing to dotfiles dir", () => {
    writeFileSync(join(dotfiles, ".zshrc"), "content");
    symlinkSync(join(dotfiles, ".zshrc"), join(home, ".zshrc"));

    expect(isOurSymlink(".zshrc", home, dotfiles)).toBe(true);
  });

  test("returns false for regular file", () => {
    writeFileSync(join(home, ".zshrc"), "content");
    expect(isOurSymlink(".zshrc", home, dotfiles)).toBe(false);
  });

  test("returns false for symlink pointing elsewhere", () => {
    const other = makeTempDir();
    writeFileSync(join(other, ".zshrc"), "content");
    symlinkSync(join(other, ".zshrc"), join(home, ".zshrc"));

    expect(isOurSymlink(".zshrc", home, dotfiles)).toBe(false);
    rmSync(other, { recursive: true, force: true });
  });

  test("returns false for missing file", () => {
    expect(isOurSymlink(".zshrc", home, dotfiles)).toBe(false);
  });
});
