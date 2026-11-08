import { createApp, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/locales";
import ProjectManagement from "./index.vue";

const { getProjectListApi, getProjectStatisticsApi } = vi.hoisted(() => ({
  getProjectListApi: vi.fn(),
  getProjectStatisticsApi: vi.fn(),
}));
vi.mock("@/api/project", () => ({
  getProjectListApi,
  getProjectStatisticsApi,
}));
vi.mock("@/components/Table/index.vue", async () => {
  const { defineComponent } = await import("vue");
  return {
    default: defineComponent({
      emits: ["filter"],
      template: `<button class="paginate" @click="$emit('filter', { filters: {}, sorter: {}, pagination: { current: 2, pageSize: 20 } })" /><button class="sort-deadline" @click="$emit('filter', { filters: {}, sorter: { field: 'deadline', order: 'ascend' }, pagination: { current: 2, pageSize: 20 } })" />`,
    }),
  };
});

const mountedApps: Array<() => void> = [];
describe("ProjectManagement", () => {
  beforeEach(() => {
    getProjectListApi.mockResolvedValue({
      pageNo: 1,
      pageSize: 10,
      total: 0,
      list: [],
    });
    getProjectStatisticsApi.mockResolvedValue({
      total: 0,
      PROCESSING: 0,
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
    });
  });
  afterEach(() => mountedApps.splice(0).forEach((unmount) => unmount()));

  it("loads statistics once while pagination only refreshes the project list", async () => {
    const container = document.createElement("div");
    const app = createApp(ProjectManagement);
    app.use(i18n);
    app.mount(container);
    mountedApps.push(() => app.unmount());
    await nextTick();
    await Promise.resolve();
    expect(getProjectStatisticsApi).toHaveBeenCalledTimes(1);
    expect(getProjectListApi).toHaveBeenCalledTimes(1);

    container.querySelector<HTMLButtonElement>(".paginate")?.click();
    await nextTick();
    await Promise.resolve();
    expect(getProjectStatisticsApi).toHaveBeenCalledTimes(1);
    expect(getProjectListApi).toHaveBeenCalledTimes(2);
    expect(getProjectListApi).toHaveBeenLastCalledWith({
      pageNo: 2,
      pageSize: 20,
    });
  });

  it("requests server-side deadline sorting from the first page", async () => {
    const container = document.createElement("div");
    const app = createApp(ProjectManagement);
    app.use(i18n);
    app.mount(container);
    mountedApps.push(() => app.unmount());
    await nextTick();
    await Promise.resolve();

    container.querySelector<HTMLButtonElement>(".sort-deadline")?.click();
    await nextTick();
    await Promise.resolve();
    expect(getProjectListApi).toHaveBeenLastCalledWith({
      ascSort: true,
      pageNo: 1,
      pageSize: 20,
      sortField: "deadline",
    });
  });
});
