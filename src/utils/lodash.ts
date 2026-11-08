import ceil from "lodash-es/ceil";
import cloneDeep from "lodash-es/cloneDeep";
import debounce from "lodash-es/debounce";
import floor from "lodash-es/floor";
import get from "lodash-es/get";
import isEmpty from "lodash-es/isEmpty";
import isEqual from "lodash-es/isEqual";
import merge from "lodash-es/merge";
import round from "lodash-es/round";
import throttle from "lodash-es/throttle";
import toNumber from "lodash-es/toNumber";
import uniqBy from "lodash-es/uniqBy";

export {
  ceil,
  cloneDeep,
  debounce,
  floor,
  get,
  isEmpty,
  isEqual,
  merge,
  round,
  throttle,
  toNumber,
  uniqBy,
};

export const lodashUtils = {
  ceil,
  cloneDeep,
  debounce,
  floor,
  get,
  isEmpty,
  isEqual,
  merge,
  round,
  throttle,
  toNumber,
  uniqBy,
};

export type LodashUtils = typeof lodashUtils;
