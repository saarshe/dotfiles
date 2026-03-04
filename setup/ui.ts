import * as p from "@clack/prompts";
import color from "picocolors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Print lines one-by-one with a short delay for readability. */
export async function printAnimated(
  lines: string[],
  { delay = 40, indent = "  " } = {}
) {
  for (const line of lines) {
    process.stdout.write(`${indent}${line}\n`);
    await sleep(delay);
  }
}

/** Check if user cancelled a clack prompt and exit if so. */
export function cancelGuard<T>(value: T | symbol): asserts value is T {
  if (p.isCancel(value)) {
    p.cancel("Aborted.");
    process.exit(1);
  }
}

/** Run an async task wrapped in a clack spinner. */
export async function withSpinner<T>(
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

/**
 * In-place toggle selector. Redraws on the same lines.
 * - ↑/↓ or j/k to navigate
 * - Enter to toggle an item (or submit when on the submit row)
 * - s to submit from anywhere
 * - Ctrl+C to cancel
 * Returns the set of selected IDs.
 */
export async function toggleSelect(
  items: { id: string; label: string; hint: string; required?: boolean }[],
  initialSelected: Set<string>
): Promise<Set<string>> {
  const selected = new Set(initialSelected);
  let cursor = 0;
  // items + 1 for the submit row
  const rowCount = items.length + 2; // header + items + submit

  function render(initial = false) {
    // Move cursor up to redraw (skip on first render)
    if (!initial) {
      process.stdout.write(`\x1b[${rowCount}A`);
    }

    const title = color.cyan("◆") + "  Select tools to install " +
      color.dim("(↑↓ navigate, enter toggle, s submit)");
    process.stdout.write(`\x1b[2K${title}\n`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const isSelected = selected.has(item.id);
      const isCursor = cursor === i;
      const box = isSelected ? color.green("[✓]") : color.dim("[ ]");
      const pointer = isCursor ? color.cyan("►") : " ";
      const label = item.required
        ? `${item.label} ${color.red("(required)")}`
        : item.label;
      const line = `${color.gray("│")}  ${pointer} ${box} ${isCursor ? color.bold(label) : label} ${color.dim(`— ${item.hint}`)}`;
      process.stdout.write(`\x1b[2K${line}\n`);
    }

    // Submit row
    const isSubmitCursor = cursor === items.length;
    const pointer = isSubmitCursor ? color.cyan("►") : " ";
    const submitLabel = selected.size > 0
      ? color.green(`Install ${selected.size} tool(s)`)
      : color.dim("Nothing selected");
    process.stdout.write(
      `\x1b[2K${color.gray("│")}  ${pointer} ${submitLabel}\n`
    );
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    render(true);

    function cleanup() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    }

    function submit() {
      cleanup();
      // Print final state as a clack-style log
      const names = items
        .filter((i) => selected.has(i.id))
        .map((i) => i.label);
      // Clear the interactive block and print settled state
      process.stdout.write(`\x1b[${rowCount}A`);
      for (let i = 0; i < rowCount; i++) {
        process.stdout.write(`\x1b[2K\n`);
      }
      process.stdout.write(`\x1b[${rowCount}A`);
      if (names.length > 0) {
        process.stdout.write(
          `${color.green("◇")}  Selected: ${names.join(", ")}\n`
        );
      } else {
        process.stdout.write(
          `${color.dim("◇")}  No tools selected\n`
        );
      }
      resolve(selected);
    }

    function onData(key: string) {
      // Ctrl+C
      if (key === "\x03") {
        cleanup();
        // Clear the interactive block
        process.stdout.write(`\x1b[${rowCount}A`);
        for (let i = 0; i < rowCount; i++) {
          process.stdout.write(`\x1b[2K\n`);
        }
        process.stdout.write(`\x1b[${rowCount}A`);
        p.cancel("Aborted.");
        process.exit(1);
      }

      // s/S to submit
      if (key === "s" || key === "S") {
        submit();
        return;
      }

      // Arrow up / k
      if (key === "\x1b[A" || key === "k") {
        cursor = Math.max(0, cursor - 1);
      }
      // Arrow down / j
      else if (key === "\x1b[B" || key === "j") {
        cursor = Math.min(items.length, cursor + 1);
      }
      // Enter
      else if (key === "\r") {
        if (cursor === items.length) {
          // Submit row
          submit();
          return;
        }
        const item = items[cursor]!;
        if (selected.has(item.id)) {
          if (item.required) {
            // flash — don't deselect
          } else {
            selected.delete(item.id);
          }
        } else {
          selected.add(item.id);
        }
      }

      render();
    }

    stdin.on("data", onData);
  });
}

/** Build a summary section: colored header + indented item list. */
export function summarySection(
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
