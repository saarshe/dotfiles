import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  rmSync,
  mkdtempSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createTracker } from "../config.ts";
import {
  backupFile,
  overwriteFile,
  skipFile,
  hideSkippedFiles,
  restoreSkippedFiles,
} from "../conflicts.ts";
import type { Paths } from "../conflicts.ts";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "conflicts-test-"));
}

describe("backupFile", () => {
  let home: string;
  let backupDir: string;
  let paths: Paths;

  beforeEach(() => {
    home = makeTempDir();
    backupDir = makeTempDir();
    paths = { home, backupDir, dotfilesDir: "" };
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(backupDir, { recursive: true, force: true });
  });

  test("moves file to backup dir and updates tracker", () => {
    writeFileSync(join(home, ".zshrc"), "original");
    const tracker = createTracker();

    backupFile(".zshrc", paths, tracker);

    expect(existsSync(join(home, ".zshrc"))).toBe(false);
    expect(readFileSync(join(backupDir, ".zshrc"), "utf-8")).toBe("original");
    expect(tracker.backedUp).toEqual([".zshrc"]);
  });

  test("creates nested backup directories", () => {
    mkdirSync(join(home, ".config"), { recursive: true });
    writeFileSync(join(home, ".config", "foo"), "data");
    const tracker = createTracker();

    backupFile(".config/foo", paths, tracker);

    expect(existsSync(join(backupDir, ".config", "foo"))).toBe(true);
    expect(tracker.backedUp).toEqual([".config/foo"]);
  });
});

describe("overwriteFile", () => {
  let home: string;
  let paths: Paths;

  beforeEach(() => {
    home = makeTempDir();
    paths = { home, backupDir: "", dotfilesDir: "" };
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  test("deletes file and updates tracker", () => {
    writeFileSync(join(home, ".zshrc"), "content");
    const tracker = createTracker();

    overwriteFile(".zshrc", paths, tracker);

    expect(existsSync(join(home, ".zshrc"))).toBe(false);
    expect(tracker.overwritten).toEqual([".zshrc"]);
  });
});

describe("skipFile", () => {
  test("updates tracker without touching filesystem", () => {
    const tracker = createTracker();
    const paths: Paths = { home: "", backupDir: "", dotfilesDir: "" };

    skipFile(".zshrc", paths, tracker);

    expect(tracker.skipped).toEqual([".zshrc"]);
  });
});

describe("hideSkippedFiles / restoreSkippedFiles", () => {
  let dotfilesDir: string;

  beforeEach(() => {
    dotfilesDir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dotfilesDir, { recursive: true, force: true });
  });

  test("roundtrips: hide then restore", () => {
    writeFileSync(join(dotfilesDir, ".zshrc"), "content");
    const skipped = [".zshrc"];

    hideSkippedFiles(skipped, dotfilesDir);
    expect(existsSync(join(dotfilesDir, ".zshrc"))).toBe(false);
    expect(existsSync(join(dotfilesDir, ".zshrc.__skip__"))).toBe(true);

    restoreSkippedFiles(skipped, dotfilesDir);
    expect(existsSync(join(dotfilesDir, ".zshrc"))).toBe(true);
    expect(existsSync(join(dotfilesDir, ".zshrc.__skip__"))).toBe(false);
  });

  test("restore is safe when skip file is already gone", () => {
    restoreSkippedFiles([".nonexistent"], dotfilesDir);
    // should not throw
  });
});
