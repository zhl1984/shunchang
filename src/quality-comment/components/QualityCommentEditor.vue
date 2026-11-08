<template>
  <section class="quality-comment-editor">
    <div class="quality-comment-editor__head">
      <div>
        <div class="quality-comment-editor__title">质检意见</div>
        <div class="quality-comment-editor__hint">
          内容去除首尾空格后不能为空，最长 {{ maxLength }} 字符。
        </div>
      </div>
      <a-tag :color="severity === 'MUST_FIX' ? 'red' : 'gold'">
        {{ severityLabel }}
      </a-tag>
    </div>

    <a-textarea
      :value="content"
      :auto-size="{ minRows: 6, maxRows: 10 }"
      :maxlength="maxLength"
      :status="errorMessage ? 'error' : undefined"
      :placeholder="placeholder"
      @update:value="handleContentChange"
    />

    <div class="quality-comment-editor__meta">
      <a-radio-group
        :value="severity"
        option-type="button"
        button-style="solid"
        @update:value="handleSeverityChange"
      >
        <a-radio-button value="MUST_FIX">必须修改</a-radio-button>
        <a-radio-button value="SUGGESTION">建议修改</a-radio-button>
      </a-radio-group>

      <div class="quality-comment-editor__counter">
        {{ trimmedLength }}/{{ maxLength }}
      </div>
    </div>

    <a-alert
      v-if="errorMessage"
      class="quality-comment-editor__alert"
      type="error"
      show-icon
      :message="errorMessage"
    />

    <div class="quality-comment-editor__actions">
      <a-button
        type="primary"
        :loading="submitting"
        :disabled="!canSubmit"
        @click="emit('submit')"
      >
        保存质检意见
      </a-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { QualityCommentSeverity } from "../types";
import {
  QUALITY_COMMENT_MAX_LENGTH,
  trimQualityCommentContent,
} from "../validation";

const props = defineProps<{
  content: string;
  severity: QualityCommentSeverity;
  submitting?: boolean;
  errorMessage?: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (event: "update:content", value: string): void;
  (event: "update:severity", value: QualityCommentSeverity): void;
  (event: "submit"): void;
}>();

const maxLength = QUALITY_COMMENT_MAX_LENGTH;

/** 规范化标题只在当前 severity 变化时切换，不在模板里硬编码判断逻辑。 */
const severityLabel = computed(() =>
  props.severity === "MUST_FIX" ? "必须修改" : "建议修改",
);

/** 提交前先用同一份 trim 规则估算字符数，避免草稿计数和实际提交不一致。 */
const trimmedLength = computed(
  () => trimQualityCommentContent(props.content).length,
);

/** 只有正文有效且没有校验提示时，才允许提交按钮可点。 */
const canSubmit = computed(
  () => trimmedLength.value > 0 && !props.errorMessage,
);

function handleContentChange(value: string) {
  emit("update:content", value);
}

function handleSeverityChange(value: QualityCommentSeverity) {
  emit("update:severity", value);
}
</script>

<style scoped lang="less">
.quality-comment-editor {
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 1px solid var(--dm-border-2);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 2%) 0%, transparent 100%),
    var(--dm-bg-container);
}

.quality-comment-editor__head,
.quality-comment-editor__meta,
.quality-comment-editor__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quality-comment-editor__title {
  color: var(--dm-text);
  font-size: 16px;
  font-weight: 600;
}

.quality-comment-editor__hint,
.quality-comment-editor__counter {
  color: var(--dm-text-3);
  font-size: 12px;
}

.quality-comment-editor__meta {
  flex-wrap: wrap;
}

.quality-comment-editor__alert {
  border-radius: 10px;
}

.quality-comment-editor__actions {
  justify-content: flex-end;
}

:deep(.ant-radio-button-wrapper) {
  height: 32px;
  line-height: 30px;
}

:deep(.ant-input) {
  border-radius: 12px;
}
</style>
