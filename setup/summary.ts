import * as p from "@clack/prompts";
import color from "picocolors";
import type { ResultTracker } from "./config.ts";
import { printAnimated, summarySection } from "./ui.ts";

export async function printSummary(
  stowFiles: string[],
  tracker: ResultTracker,
  backupDir: string
) {
  const sections: string[] = [];

  if (tracker.toolsInstalled.length > 0) {
    sections.push(
      summarySection("Tools installed", tracker.toolsInstalled, color.green)
    );
  }
  if (tracker.toolsAlreadyPresent.length > 0) {
    sections.push(
      summarySection("Tools already present", tracker.toolsAlreadyPresent, color.dim)
    );
  }
  if (tracker.toolsFailed.length > 0) {
    sections.push(
      summarySection("Tools failed", tracker.toolsFailed, color.red, "✗")
    );
  }

  const skippedSet = new Set(tracker.skipped);
  const alreadySet = new Set(tracker.alreadyLinked);
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
  if (tracker.alreadyLinked.length > 0) {
    sections.push(
      summarySection(
        "Dotfiles already linked",
        tracker.alreadyLinked.map((f) => `~/${f}`),
        color.dim,
        "→"
      )
    );
  }
  if (tracker.backedUp.length > 0) {
    sections.push(
      summarySection(
        "Backed up",
        tracker.backedUp.map((f) => `~/${f}`),
        color.yellow,
        "→",
        color.dim(`→ ${backupDir}`)
      )
    );
  }
  if (tracker.overwritten.length > 0) {
    sections.push(
      summarySection(
        "Overwritten",
        tracker.overwritten.map((f) => `~/${f}`),
        color.red,
        "✗"
      )
    );
  }
  if (tracker.skipped.length > 0) {
    sections.push(
      summarySection(
        "Skipped",
        tracker.skipped.map((f) => `~/${f}`),
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
