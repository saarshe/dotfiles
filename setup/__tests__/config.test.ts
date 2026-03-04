import { describe, expect, test } from "bun:test";
import { createTracker, BACKUP_DIR } from "../config.ts";

describe("createTracker", () => {
  test("returns object with all empty arrays", () => {
    const tracker = createTracker();
    expect(tracker.backedUp).toEqual([]);
    expect(tracker.overwritten).toEqual([]);
    expect(tracker.skipped).toEqual([]);
    expect(tracker.alreadyLinked).toEqual([]);
    expect(tracker.toolsInstalled).toEqual([]);
    expect(tracker.toolsAlreadyPresent).toEqual([]);
    expect(tracker.toolsFailed).toEqual([]);
  });

  test("each call returns a fresh object", () => {
    const a = createTracker();
    const b = createTracker();
    a.backedUp.push("file");
    expect(b.backedUp).toEqual([]);
  });
});

describe("BACKUP_DIR", () => {
  test("contains a 14-character timestamp segment", () => {
    // e.g. ~/.dotfiles-backup/20260304120000
    const segment = BACKUP_DIR.split("/").pop()!;
    expect(segment).toMatch(/^\d{14}$/);
  });
});
