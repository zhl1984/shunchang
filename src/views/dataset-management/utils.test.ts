import { describe, expect, it } from "vitest";
import type { Dataset } from "@/api/dataset";
import {
  buildDatasetDisplayRows,
  filterDatasetRows,
  paginateDatasetRows,
} from "@/views/dataset-management/utils";

const datasets: Dataset[] = [
  {
    id: 1,
    name: "城市点云",
    dataType: "LIDAR",
    status: "SUCCESS",
    itemCount: 81,
    projectReferenceCount: 2,
    description: "道路采集",
    isDeleted: false,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 2,
    name: "无说明",
    dataType: "DICOM",
    status: null,
    itemCount: 0,
    projectReferenceCount: 0,
    description: null,
    isDeleted: false,
    createdAt: null,
    updatedAt: null,
  },
];

describe("dataset display utilities", () => {
  const rows = buildDatasetDisplayRows(datasets);
  it("copies backend summaries without synthetic fields", () => {
    expect(rows[0]).toMatchObject(datasets[0]);
    expect(rows[0].descriptionDisplay).toBe("道路采集");
    expect(rows[0]).not.toBe(datasets[0]);
  });
  it("uses a dash when the description is not filled", () => {
    expect(rows[1].descriptionDisplay).toBe("-");
  });
  it.each([
    ["城市", 1],
    ["道路", 1],
    [" dicom ", 2],
  ])("filters nullable rows with %s", (keyword, id) => {
    expect(filterDatasetRows(rows, keyword).map((row) => row.id)).toEqual([id]);
  });
  it("paginates and normalizes an invalid page", () => {
    expect(paginateDatasetRows(rows, 2, 1)).toEqual([rows[1]]);
    expect(paginateDatasetRows(rows, 0, 1)).toEqual([rows[0]]);
  });
});
