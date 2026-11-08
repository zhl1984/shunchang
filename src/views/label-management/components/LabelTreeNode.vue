<script setup lang="ts">
import {
  FolderOpenOutlined,
  FolderOutlined,
  TagOutlined,
} from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";

import type { LabelTreeStoreNode } from "@/stores/label";

defineOptions({ name: "LabelTreeNode" });

defineProps<{
  expanded: boolean;
  node: LabelTreeStoreNode;
  count?: number;
}>();

const emit = defineEmits<{
  delete: [node: LabelTreeStoreNode];
  edit: [node: LabelTreeStoreNode];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="label-tree-node">
    <template v-if="node.nodeType === 'GROUP'">
      <FolderOpenOutlined
        v-if="expanded"
        class="ltn-type-icon"
        aria-hidden="true"
      />
      <FolderOutlined v-else class="ltn-type-icon" aria-hidden="true" />
    </template>
    <TagOutlined v-else class="ltn-type-icon" aria-hidden="true" />

    <div class="ltn-name pd-y-6">
      <div class="font-base font-bold">{{ node.nodeName }}</div>
      <div class="ltn-description font-xs">{{ node.nodeDescription }}</div>
    </div>

    <span v-if="node.nodeType === 'GROUP'" class="ltn-count font-xs">
      {{ count ?? 0 }}个标签
    </span>
    <span class="ltn-actions">
      <a-button
        :aria-label="
          t('labelManagement.tree.actions.editNode', { name: node.nodeName })
        "
        :data-node-id="node.id"
        data-node-action="edit"
        type="link"
        size="small"
        @click.stop="emit('edit', node)"
      >
        {{ t("labelManagement.tree.actions.edit") }}
      </a-button>
      <a-button
        :aria-label="
          t('labelManagement.tree.actions.deleteNode', { name: node.nodeName })
        "
        danger
        :data-node-id="node.id"
        data-node-action="delete"
        type="link"
        size="small"
        @click.stop="emit('delete', node)"
      >
        {{ t("labelManagement.tree.actions.delete") }}
      </a-button>
    </span>
  </div>
</template>

<style scoped lang="less">
.label-tree-node {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  position: relative;

  .ltn-type-icon {
    display: grid;
    width: 24px;
    height: 24px;
    place-items: center;
    flex-shrink: 0;
    border-radius: 6px;
    color: var(--dm-primary);
    background-color: var(--dm-primary-bg);
    font-size: 16px;
  }

  .ltn-name {
    height: 60px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--dm-text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ltn-description {
    color: var(--dm-text-3);
  }

  .ltn-actions {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    z-index: 1;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    opacity: 0;
    visibility: hidden;
    gap: 8px;
  }

  .ltn-count {
    flex-shrink: 0;
    color: var(--dm-text-3);
  }

  &:hover .ltn-actions,
  &:focus-within .ltn-actions {
    opacity: 1;
    visibility: visible;
  }

  &:hover .ltn-count,
  &:focus-within .ltn-count {
    opacity: 0;
    visibility: hidden;
  }
}
</style>
