<script setup lang="ts">
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
} from "@ant-design/icons-vue";
import type { Component } from "vue";

type FormHeaderMode = "create" | "read" | "update" | "delete";

withDefaults(
  defineProps<{
    mode?: FormHeaderMode;
  }>(),
  { mode: "create" },
);

defineOptions({ name: "AppFormHeader" });

const modeIcons: Record<FormHeaderMode, Component> = {
  create: PlusOutlined,
  delete: DeleteOutlined,
  read: EyeOutlined,
  update: EditOutlined,
};
</script>

<template>
  <div class="app-form-header">
    <span class="afh-icon" aria-hidden="true">
      <slot name="icon">
        <component :is="modeIcons[mode]" />
      </slot>
    </span>
    <div class="afh-content">
      <div v-if="$slots.title" class="afh-title">
        <slot name="title" />
      </div>
      <div v-if="$slots.subtitle" class="afh-subtitle">
        <slot name="subtitle" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.app-form-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.afh-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 6px;
  color: var(--dm-primary);
  background: var(--dm-primary-bg);
  font-size: 20px;
}

.afh-content {
  min-width: 0;
}

.afh-title,
.afh-subtitle {
  overflow-wrap: anywhere;
}

.afh-title {
  color: var(--dm-text);
  font-size: 0.18rem;
  color: var(--dm-text);
  font-weight: 600;
}

.afh-subtitle {
  margin-top: 4px;
  color: var(--dm-text-3);
  font-size: 0.13rem;
}
</style>
