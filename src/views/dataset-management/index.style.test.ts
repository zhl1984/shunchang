import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  "src/views/dataset-management/index.vue",
  "utf8",
);

describe("dataset management page styles", () => {
  it("uses shared font classes instead of local font-size declarations", () => {
    expect(pageSource).not.toMatch(/font-size\s*:/);
  });

  it("does not use rem for non-font dimensions", () => {
    expect(pageSource).not.toMatch(/[\d.]+rem/);
  });
});

describe("dataset management table states", () => {
  it("delegates loading and empty rendering to the table", () => {
    expect(pageSource).toContain(
      ":loading=\"datasetStore.status === 'loading'\"",
    );
    expect(pageSource).toContain("#emptyText");
    expect(pageSource).not.toContain("<DmLoading");
  });
});

describe("dataset management creation", () => {
  it("delegates the create trigger and modal to the page component", () => {
    expect(pageSource).toContain(
      '<CreateDataset @created="handleDatasetCreated" />',
    );
  });
});
