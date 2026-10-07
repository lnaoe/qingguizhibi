import { describe, expect, it } from "vitest";
import { getAppUrl } from "./env";

describe("getAppUrl", () => {
  it("uses the local development URL by default", () => {
    expect(getAppUrl(undefined)).toBe("http://localhost:3000");
  });

  it("returns the origin of a valid app URL", () => {
    expect(getAppUrl("https://example.com/path?source=test")).toBe(
      "https://example.com",
    );
  });

  it("rejects invalid app URLs", () => {
    expect(() => getAppUrl("not-a-url")).toThrow(
      "NEXT_PUBLIC_APP_URL must be an absolute HTTP(S) URL.",
    );
  });
});
