import { cloneDeep } from "@/utils/lodash";

/**
 * 将静态对象包装为只读代理；每次读取都基于原始值创建独立深拷贝。
 * @param source 需要保护的静态对象或数组。
 * @returns 可按原对象方式读取的代理值，任何修改都不会影响 source。
 */
export default function createCloneProxy<T extends object>(source: T): T {
  return new Proxy(source, {
    get(_target, property) {
      const copy = cloneDeep(source);
      const value = Reflect.get(copy, property, copy);
      return typeof value === "function" ? value.bind(copy) : value;
    },
    set() {
      return false;
    },
    deleteProperty() {
      return false;
    },
  });
}
