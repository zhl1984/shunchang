# DmInput 通用输入框

## 功能目标

封装 Ant Design Vue 输入框，透传其属性、事件和常用具名插槽，并提供统一的可控清空交互。

## 使用场景

用于需要统一输入框行为、同时保留 Ant Design Vue 原生能力的表单和查询页面。

## 交互规则

- 组件名称为 `DmInput`，支持 `v-model:value`。
- `allowClear` 开启且输入框有内容时显示清空图标。
- 有内容时优先显示组件清空图标；无内容时显示调用方传入的 `suffix` 插槽。
- 点击清空图标会同步空字符串并触发 `clear` 事件。
- Ant Design Vue 的其他属性、事件及 `addonBefore`、`addonAfter`、`prefix`、`suffix` 插槽保持可用。

## 验收标准

输入框行为与 `a-input` 兼容，清空图标按内容和 `allowClear` 状态正确显示，清空后值同步为空且触发 `clear`。
