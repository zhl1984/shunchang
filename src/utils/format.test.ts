import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatDateTimeParams,
  formatTime,
} from "@/utils/format";

describe("formatDate", () => {
  it("formats valid values without time", () => {
    expect(formatDate("2026-08-08T10:30:00")).toBe("2026-08-08");
  });

  it("returns the placeholder for invalid values", () => {
    expect(formatDate("invalid-date")).toBe("--");
  });
});

describe("date and time formatters", () => {
  it("formats values with shared formats", () => {
    const value = "2026-08-08T10:30:45+08:00";

    expect(formatDateTime(value)).toBe("2026-08-08 10:30:45");
    expect(formatDateTimeParams(value)).toBe("2026-08-08T10:30:45+08:00");
    expect(formatTime(value)).toBe("10:30:45");
  });

  it("returns the placeholder for empty or invalid values", () => {
    expect(formatDateTime(null)).toBe("--");
    expect(formatDateTimeParams("invalid-date")).toBe("--");
    expect(formatTime("")).toBe("--");
  });
});
