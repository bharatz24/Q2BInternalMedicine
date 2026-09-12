import { describe, it, expect } from "vitest";
import { safeInternalPath } from "@/shared/utils/safeRedirect";

describe("safeInternalPath", () => {
  it("accepts a plain rooted path", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/quote?step=2#top")).toBe("/quote?step=2#top");
    expect(safeInternalPath("/order-details/9001")).toBe("/order-details/9001");
  });

  it("accepts the url-encoded form the interceptor stores", () => {
    const encoded = encodeURIComponent("/payment?flow=abc&x=1");
    expect(safeInternalPath(encoded)).toBe("/payment?flow=abc&x=1");
  });

  it("rejects absolute URLs", () => {
    expect(safeInternalPath("https://evil.com/x")).toBeNull();
    expect(safeInternalPath("http://evil.com")).toBeNull();
    expect(safeInternalPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects protocol-relative and backslash tricks", () => {
    expect(safeInternalPath("//evil.com")).toBeNull();
    expect(safeInternalPath("/\\evil.com")).toBeNull();
    expect(safeInternalPath("\\\\evil.com")).toBeNull();
    expect(safeInternalPath("/%5Cevil.com")).toBeNull();
    expect(safeInternalPath("/%2F%2Fevil.com")).toBeNull();
  });

  it("rejects CRLF / control-character injection", () => {
    expect(safeInternalPath("/foo%0d%0aSet-Cookie:x=1")).toBeNull();
    expect(safeInternalPath("/foo\tbar")).toBeNull();
  });

  it("rejects non-string, empty, and over-long input", () => {
    expect(safeInternalPath(null)).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
    expect(safeInternalPath(42)).toBeNull();
    expect(safeInternalPath("")).toBeNull();
    expect(safeInternalPath("   ")).toBeNull();
    expect(safeInternalPath(`/${"a".repeat(600)}`)).toBeNull();
  });

  it("rejects a relative path with no leading slash", () => {
    expect(safeInternalPath("dashboard")).toBeNull();
    expect(safeInternalPath("../etc/passwd")).toBeNull();
  });

  it("rejects a malformed percent-escape", () => {
    expect(safeInternalPath("/%E0%A4%A")).toBeNull();
  });
});
