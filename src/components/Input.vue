<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { CloseCircleFilled } from "@ant-design/icons-vue";
import antInputProps from "ant-design-vue/es/input/inputProps";

defineOptions({ name: "DmInput", inheritAttrs: false });

const props = defineProps(antInputProps());
const emit = defineEmits<{ (event: "clear"): void }>();
const attrs = useAttrs();
const inputProps = computed(() => {
  const { allowClear: _allowClear, ...restProps } = props;
  return { ...attrs, ...restProps };
});
const hasValue = computed(() => Boolean(props.value));

/** 将输入值同步给父组件，保持 a-input 的 v-model:value 契约。 */
/** 清空当前输入并通知业务层；仅在启用 allowClear 且存在内容时执行。 */
function handleClear() {
  if (!props.allowClear || !hasValue.value) return;
  const updateValue = props["onUpdate:value"];
  if (typeof updateValue === "function") updateValue("");
  emit("clear");
}
</script>

<template>
  <a-input v-bind="inputProps">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot v-if="name !== 'suffix'" :name="name" v-bind="slotData" />
    </template>
    <template #suffix>
      <CloseCircleFilled
        v-if="props.allowClear && hasValue"
        class="dm-input-clear"
        role="button"
        tabindex="0"
        @mousedown.prevent
        @click="handleClear"
      />
      <slot v-else name="suffix" />
    </template>
  </a-input>
</template>

<style scoped>
.dm-input-clear {
  cursor: pointer;
  font-size: 0.12rem;
  color: var(--dm-text-4);
  margin: 0 4px;
  transition: color 0.3s;
}

.dm-input-clear:hover {
  color: var(--dm-text-3);
}
</style>
