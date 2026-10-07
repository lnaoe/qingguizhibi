import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const pageStyles = readFileSync(
  new URL("./page.module.css", import.meta.url),
  "utf8",
);

describe("design tokens", () => {
  it("defines the UI palette", () => {
    const expectedColors = [
      ["paper", "#f8f5ef"],
      ["paper-deep", "#f1ece3"],
      ["white", "#fffdfc"],
      ["ink", "#3b3632"],
      ["ink-light", "#6b655e"],
      ["seal", "#9a5145"],
      ["seal-dark", "#7c3f36"],
      ["green", "#657a68"],
      ["blue", "#657486"],
      ["gold", "#b29563"],
      ["border", "#ded8ce"],
      ["secondary-border", "#d8d1c7"],
    ];

    for (const [name, value] of expectedColors) {
      expect(tokens).toContain(`--color-${name}: ${value};`);
    }
  });

  it("defines the typography scale", () => {
    expect(tokens).toContain("--font-family-sans:");
    expect(tokens).toContain("--font-family-serif:");
    expect(tokens).toContain("--font-size-display: 32px;");
    expect(tokens).toContain("--font-size-h1: 26px;");
    expect(tokens).toContain("--font-size-h2: 20px;");
    expect(tokens).toContain("--font-size-body: 16px;");
    expect(tokens).toContain("--font-size-small: 14px;");
    expect(tokens).toContain("--font-size-caption: 12px;");
    expect(tokens).toContain("--font-size-letter: 17px;");
    expect(tokens).toContain("--line-height-letter: 1.9;");
  });

  it("defines spacing, radius, and shadow scales", () => {
    const expectedSpacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80];

    for (const value of expectedSpacing) {
      expect(tokens).toContain(`--space-`);
      expect(tokens).toMatch(new RegExp(`--space-\\d+: ${value}px;`));
    }

    expect(tokens).toContain("--radius-sm: 6px;");
    expect(tokens).toContain("--radius-md: 10px;");
    expect(tokens).toContain("--radius-lg: 14px;");
    expect(tokens).toContain("--radius-button: 8px;");
    expect(tokens).toContain(
      "--shadow-card: 0 2px 8px rgba(59, 54, 50, 0.06);",
    );
  });

  it("defines the responsive breakpoints", () => {
    expect(tokens).toContain(
      "@custom-media --bp-mobile-xs (min-width: 320px);",
    );
    expect(tokens).toContain(
      "@custom-media --bp-mobile-sm (min-width: 375px);",
    );
    expect(tokens).toContain(
      "@custom-media --bp-mobile-md (min-width: 390px);",
    );
    expect(tokens).toContain(
      "@custom-media --bp-mobile-lg (min-width: 430px);",
    );
    expect(tokens).toContain("@custom-media --bp-desktop (min-width: 1100px);");
  });

  it("keeps page styles free from raw design values", () => {
    expect(pageStyles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(/i);
    expect(pageStyles).not.toMatch(/\b\d+(?:\.\d+)?px\b/);
  });
});
