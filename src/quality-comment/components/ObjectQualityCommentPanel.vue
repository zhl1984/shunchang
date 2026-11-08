<template>
  <section class="quality-comment-panel">
    <QualityCommentEditor
      :content="content"
      :severity="severity"
      :submitting="submitting"
      :error-message="errorMessage"
      placeholder="请输入标签评论"
      @update:content="emit('update:content', $event)"
      @update:severity="emit('update:severity', $event)"
      @submit="emit('submit')"
    />
  </section>
</template>

<script setup lang="ts">
import QualityCommentEditor from "./QualityCommentEditor.vue";
import type { QualityCommentContext, QualityCommentSeverity } from "../types";

defineProps<{
  context: QualityCommentContext;
  content: string;
  severity: QualityCommentSeverity;
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  (event: "update:content", value: string): void;
  (event: "update:severity", value: QualityCommentSeverity): void;
  (event: "submit"): void;
}>();
</script>

<style scoped lang="less">
.quality-comment-panel {
  display: block;
}
</style>
