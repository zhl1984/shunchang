<script setup lang="ts">
import { ref } from "vue";

import LabelDetailPanel from "./components/LabelDetailPanel.vue";
import LabelTreePanel from "./components/LabelTreePanel.vue";

/**
 * 页面只维护左右面板共享的选择 ID。
 * 节点详情和属性请求分别由 store 与详情组件负责。
 * 初始 null 保证首次进入页面时不自动选择任何节点。
 */
const selectedNodeId = ref<string | number | null>(null);

/** 同步标签树当前选择，供右侧详情面板消费。 */
function handleSelectNode(id: string | number | null): void {
  selectedNodeId.value = id;
}
</script>

<template>
  <section class="label-management">
    <div class="label-management__panels">
      <!-- 左侧只发出 ID，右侧只消费 ID，页面负责最小业务编排。 -->
      <LabelTreePanel @select="handleSelectNode" />
      <LabelDetailPanel :node-id="selectedNodeId" />
    </div>
  </section>
</template>

<style scoped lang="less">
.label-management {
  // 固定最小画布允许小视口裁切，但不生成页面滚动条。
  width: 100%;
  height: 100%;
  min-width: 800px;
  min-height: 600px;
  overflow: hidden;

  &__panels {
    // 两个业务面板共享剩余高度，并分别约束内部溢出。
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 16px;
    height: 100%;
    overflow: hidden;

    > * {
      min-width: 0;
      min-height: 0;
    }
  }
}
</style>
