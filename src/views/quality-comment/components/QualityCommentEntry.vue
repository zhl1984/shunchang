<template>
  <QualityCommentHistoryList
    v-if="entry === 'history'"
    :history="history"
    @locate="emit('locate', $event)"
  />
  <a-card
    v-else-if="entry === 'clip' || entry === 'object'"
    :bordered="false"
    class="quality-comment-entry__surface"
  >
    <ObjectQualityCommentPanel
      v-if="entry === 'object'"
      :context="context"
      :content="content"
      :severity="severity"
      :submitting="submitting"
      :error-message="errorMessage"
      @update:content="emit('update:content', $event)"
      @update:severity="emit('update:severity', $event)"
      @submit="emit('submit')"
    />
    <ClipQualityCommentPanel
      v-else
      :context="context"
      :content="content"
      :severity="severity"
      :submitting="submitting"
      :error-message="errorMessage"
      @update:content="emit('update:content', $event)"
      @update:severity="emit('update:severity', $event)"
      @submit="emit('submit')"
    />
  </a-card>
  <a-alert v-else type="error" show-icon message="不支持的质检入口" />
</template>

<script setup lang="ts">
import ClipQualityCommentPanel from "@/quality-comment/components/ClipQualityCommentPanel.vue";
import ObjectQualityCommentPanel from "@/quality-comment/components/ObjectQualityCommentPanel.vue";
import QualityCommentHistoryList from "@/quality-comment/components/QualityCommentHistoryList.vue";
import type {
  QualityCommentContext,
  QualityCommentHistoryItem,
  QualityCommentSeverity,
} from "@/quality-comment/types";

type Entry = "clip" | "object" | "history" | "invalid";
defineProps<{
  entry: Entry;
  context: QualityCommentContext;
  history: QualityCommentHistoryItem[];
  content: string;
  severity: QualityCommentSeverity;
  submitting?: boolean;
  errorMessage?: string;
}>();
const emit = defineEmits<{
  (event: "update:content", value: string): void;
  (event: "update:severity", value: QualityCommentSeverity): void;
  (event: "submit"): void;
  (event: "locate", value: QualityCommentHistoryItem): void;
}>();
</script>

<style scoped lang="less">
.quality-comment-entry__surface {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  background: transparent;
}
</style>
