import { formatUtils } from "@/utils/format";
import type { FormatUtils } from "@/utils/format";
import { lodashUtils } from "@/utils/lodash";
import type { LodashUtils } from "@/utils/lodash";
import { treeUtils } from "@/utils/tree";
import type { TreeUtils } from "@/utils/tree";
import { commonUtils } from "@/utils/common";
import type { CommonUtils } from "@/utils/common";

export type AppUtils = LodashUtils & FormatUtils & TreeUtils & CommonUtils;

const utils: AppUtils = {
  ...lodashUtils,
  ...formatUtils,
  ...treeUtils,
  ...commonUtils,
};

export default utils;
