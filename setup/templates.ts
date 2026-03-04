import * as p from "@clack/prompts";
import { copyFileSync, existsSync } from "fs";
import { join } from "path";

export function createLocalConfigs(home: string, dotfilesDir: string) {
  const templates: [string, string, string][] = [
    ["zshrc.local.example", ".zshrc.local", "machine-specific shell config"],
    ["secrets.example", ".secrets", "your tokens"],
  ];

  for (const [template, target, desc] of templates) {
    const targetPath = join(home, target);
    if (!existsSync(targetPath)) {
      copyFileSync(join(dotfilesDir, "templates", template), targetPath);
      p.log.info(`Created ~/${target} — edit with ${desc}`);
    }
  }
}
