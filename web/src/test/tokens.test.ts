import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const TOKENS = ["bg", "panel", "panel-2", "line", "ink", "muted", "pos", "neg", "accent", "info"];

describe("design tokens", () => {
  const css = readFileSync(path.join(SRC, "app/globals.css"), "utf8");

  it.each(TOKENS)("defines --color-%s for both the dark and light theme", (token) => {
    const found = css.match(new RegExp(`--color-${token}:`, "g")) ?? [];
    expect(found).toHaveLength(2);
  });

  it("components never hard-code hex colours", () => {
    const dir = path.join(SRC, "components");
    const files = existsSync(dir) ? (readdirSync(dir, { recursive: true }) as string[]) : [];
    const offenders = files.filter(
      (f) =>
        /\.tsx?$/.test(f) &&
        !/\.test\.tsx?$/.test(f) &&
        /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(path.join(dir, f), "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
