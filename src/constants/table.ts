import createCloneProxy from "./clone-proxy";

export const TABLE_PAGE_SIZE = 20;
export const TABLE_PAGE_SIZE_OPTIONS = createCloneProxy(["10", "20", "50"]);
