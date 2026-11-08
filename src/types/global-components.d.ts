declare module "vue" {
  export interface GlobalComponents {
    DmAppTable: (typeof import("@/components/Table/index.vue"))["default"];
    DmAppFormHeader: (typeof import("@/components/Form/FormHeader.vue"))["default"];
    DmIconFont: (typeof import("@/components/IconFont.vue"))["default"];
    DmWatermark: (typeof import("@/components/Watermark.vue"))["default"];
  }
}

export {};
