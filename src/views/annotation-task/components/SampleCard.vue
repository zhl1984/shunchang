<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { CheckOutlined, ExclamationOutlined } from "@ant-design/icons-vue";

import type { AnnotationTaskSample } from "../types";
import { getSampleIssueClass } from "../utils";

const props = withDefaults(
  defineProps<{
    sample: AnnotationTaskSample;
    compact?: boolean;
  }>(),
  { compact: false },
);

const emit = defineEmits<{
  open: [sample: AnnotationTaskSample];
}>();

const { t } = useI18n();
const hasIssue = computed(
  () => props.sample.issueLevel !== "none" && props.sample.issueCount > 0,
);
const isPassed = computed(() => props.sample.issueLevel === "none");
const issueLevelText = computed(() =>
  props.sample.issueLevel === "none"
    ? t("annotationTask.detail.issue.none")
    : t(`annotationTask.detail.issue.${props.sample.issueLevel}`),
);
const sampleCardStatusClass = computed(() => {
  if (props.sample.issueLevel === "mustFix") {
    return "annotation-sample-card--must-fix";
  }
  if (props.sample.issueLevel === "suggestion") {
    return "annotation-sample-card--suggestion";
  }
  // 无需修改：始终使用绿色背景，不再依赖样本状态字段，保证状态色稳定命中。
  return "annotation-sample-card--success";
});

const popoverOverlayStyle = {
  padding: "0",
  background: "var(--dm-bg-mask)",
  color: "#fff",
};

/** 将点击事件连同样本数据交给父页面处理工作台跳转。 */
function handleOpen() {
  emit("open", props.sample);
}

/** 将接口返回的问题处理类型映射为统一的样本等级样式。 */
function getIssueLevel(handling: string) {
  return handling === "必须修改" ? "mustFix" : "suggestion";
}
</script>

<template>
  <a-popover
    overlay-class-name="annotation-sample-popover-overlay"
    :overlay-style="popoverOverlayStyle"
    :trigger="hasIssue ? 'hover' : []"
  >
    <template #title>
      <div class="annotation-sample-popover-title">
        <strong>{{ sample.name.replace(/\s+/g, "") }}</strong>
        <span class="annotation-sample-popover-total">
          {{
            t("annotationTask.detail.issueTotal", { count: sample.issueCount })
          }}
        </span>
      </div>
    </template>
    <template #content>
      <div class="annotation-sample-popover">
        <article
          v-for="(issue, index) in sample.issues ||
          (sample.issueDetail ? [sample.issueDetail] : [])"
          :key="`${sample.id}-issue-${index}`"
          class="annotation-sample-issue"
        >
          <!-- <div v-if="issue.source" class="annotation-sample-issue-source">
            {{ issue.source }}
          </div> -->
          <div class="annotation-sample-issue-head">
            <div class="annotation-sample-issue-target">
              <strong>{{
                issue.objectName ? issue.objectName : sample.name
              }}</strong>
            </div>
            <span
              class="annotation-sample-issue-level"
              :class="`annotation-sample-issue-level--${getIssueLevel(issue.handling)}`"
              >{{ issue.handling }}</span
            >
          </div>
          <div class="annotation-sample-issue-comment">{{ issue.comment }}</div>
          <!-- <div class="annotation-sample-issue-location">
            {{ issue.objectId ? issue.objectId : t("annotationTask.detail.noLocation") }}
          </div> -->
        </article>
        <div
          v-if="!sample.issues?.length && !sample.issueDetail"
          class="annotation-sample-empty"
        >
          {{ sample.issueSummary || t("annotationTask.detail.noIssue") }}
        </div>
      </div>
    </template>
    <a-card
      :hoverable="true"
      :class="[
        'annotation-sample-card',
        { 'annotation-sample-card--compact': compact },
        compact
          ? getSampleIssueClass(sample.issueLevel)
          : sampleCardStatusClass,
      ]"
      @click="handleOpen"
    >
      <template v-if="!compact">
        <div class="annotation-sample-card-status-icon" aria-hidden="true">
          <CheckOutlined v-if="isPassed" />
          <ExclamationOutlined v-else />
        </div>
        <div class="annotation-sample-card-code">{{ sample.code }}</div>
        <div class="annotation-sample-card-name">{{ sample.name }}</div>
        <div class="annotation-sample-card-status">{{ issueLevelText }}</div>
      </template>
      <div v-else class="annotation-sample-card-line">
        <span class="annotation-sample-card-name">{{ sample.name }}</span>
      </div>
    </a-card>
  </a-popover>
</template>

<style scoped lang="less">
.annotation-sample-card {
  position: relative;
  cursor: pointer;
  min-height: 148px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  box-shadow: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    background-color 0.2s;
}
.annotation-sample-card:hover {
  box-shadow: none;
}
.annotation-sample-card :deep(.ant-card-body) {
  background: transparent !important;
  background: transparent;
}
.annotation-sample-card :deep(.ant-card-body) {
  display: flex;
  min-height: 148px;
  flex-direction: column;
  align-items: flex-start;
  padding: 20px;
}
.annotation-sample-card--compact {
  display: inline-block;
  width: auto;
  min-height: 0;
  box-shadow: none;
}
.annotation-sample-card--compact :deep(.ant-card-body) {
  display: block;
  min-height: 0;
  padding: 2px 8px;
}
.annotation-sample-card--success {
  border-color: var(--dm-success-border);
  background: #3fd98e !important;
}
.annotation-sample-card--success:hover {
  border-color: var(--dm-success);
  background: #3fd98e !important;
}
.annotation-sample-card--must-fix {
  border-color: var(--dm-error-border);
  background: #ff4d52;
}
.annotation-sample-card--must-fix:hover {
  border-color: var(--dm-error);
  background: #ff4d52;
}
.annotation-sample-card--suggestion {
  border-color: var(--dm-warning-border);
  background: #ffc02e;
}
.annotation-sample-card--suggestion:hover {
  border-color: var(--dm-warning);
  background: #ffc02e;
}
.annotation-sample-card-status-icon {
  position: absolute;
  top: 16px;
  right: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgb(255 255 255 / 72%);
  color: var(--dm-success);
  font-size: 14px;
}
.annotation-sample-card--must-fix .annotation-sample-card-status-icon,
.annotation-sample-card--suggestion .annotation-sample-card-status-icon {
  color: var(--dm-error);
}
.annotation-sample-card--suggestion .annotation-sample-card-status-icon {
  color: var(--dm-warning);
}
.annotation-sample-card-code {
  color: var(--dm-text-3);
  font-size: 0.12rem;
  line-height: 1.4;
}
.annotation-sample-card-name {
  width: 100%;
  margin-top: 12px;
  overflow: hidden;
  color: var(--dm-text);
  font-size: 0.18rem;
  font-weight: 600;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.annotation-sample-card-status {
  margin-top: auto;
  font-size: 0.2rem;
  font-weight: 400;
  margin-inline-end: 0;
  font-size: 0.12rem;
}
.annotation-task-sample--must-fix {
  border-color: var(--dm-error-border);
  background: var(--dm-error-bg);
}
.annotation-task-sample--must-fix:hover {
  border-color: var(--dm-error);
  background: var(--dm-error-bg);
}
.annotation-task-sample--suggestion {
  border-color: var(--dm-warning-border);
  background: var(--dm-warning-bg);
}
.annotation-task-sample--suggestion:hover {
  border-color: var(--dm-warning);
  background: var(--dm-warning-bg);
}
.annotation-sample-card--compact.annotation-task-sample--must-fix {
  border-color: var(--dm-error-border);
  background: var(--dm-error-bg);
}
.annotation-sample-card--compact.annotation-task-sample--suggestion {
  border-color: var(--dm-warning-border);
  background: var(--dm-warning-bg);
}
.annotation-sample-card-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.annotation-sample-card--compact .annotation-sample-card-name {
  margin-top: 0;
  min-width: 0;
  font-size: 0.13rem;
  color: var(--dm-primary);
  font-weight: 400;
}
.annotation-sample-card--compact.annotation-task-sample--must-fix
  .annotation-sample-card-name {
  color: var(--dm-error);
}
.annotation-sample-card--compact.annotation-task-sample--suggestion
  .annotation-sample-card-name {
  color: var(--dm-warning);
}
.annotation-sample-card-line :deep(.ant-tag) {
  flex: 0 0 auto;
  margin-inline-end: 0;
  padding-inline: 4px;
  font-size: 0.11rem;
  line-height: 18px;
}
:global(.annotation-sample-popover-overlay) {
  background: transparent;
  padding: 0;
  box-shadow: none;
  border: 0;

  &.ant-popover {
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  .ant-popover-inner {
    width: 320px;
    padding: 0;
    overflow: hidden;
    border-radius: 14px;
    border: 1px solid rgb(0 0 0 / 55%);
    background: var(--dm-bg-mask) !important;
    background-color: var(--dm-bg-mask) !important;
    box-shadow:
      0 12px 28px rgb(0 0 0 / 16%),
      0 3px 8px rgb(0 0 0 / 8%);
  }
  .ant-popover-title {
    margin: 0;
    padding: 18px 20px 14px;
    border-bottom: 1px solid rgb(0 0 0 / 55%);
    color: #fff !important;
  }
  .ant-popover-inner-content {
    padding: 16px 20px 18px;
    color: #fff !important;
  }
}
:global(.annotation-sample-popover-overlay .ant-popover-content),
:global(.annotation-sample-popover-overlay .ant-popover-inner),
:global(.annotation-sample-popover-overlay .ant-popover-inner-content) {
  background-color: var(--dm-bg-mask) !important;
  background-image: none !important;
  color: #fff !important;
}
:global(.annotation-sample-popover-overlay .ant-popover-inner) {
  border-color: rgb(0 0 0 / 55%) !important;
}
:global(.annotation-sample-popover-overlay .ant-popover-title) {
  border-bottom-color: rgb(0 0 0 / 55%) !important;
}
:global(.annotation-sample-popover-overlay .ant-popover-arrow::before),
:global(.annotation-sample-popover-overlay .ant-popover-arrow::after) {
  background: var(--dm-bg-mask) !important;
  background-color: var(--dm-bg-mask) !important;
  box-shadow: none !important;
}
/* 标注与质检详情共用该浮层；限制问题区高度，避免大量明细撑出当前视口。 */
.annotation-sample-popover {
  display: grid;
  gap: 12px;
  max-height: clamp(240px, calc(100vh - 240px), 640px);
  padding-right: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  color: #fff;
}
.annotation-sample-popover-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #fff;
  font-size: 0.22rem;
}
.annotation-sample-popover-total {
  padding: 4px 6px;
  border-radius: 4px;
  background: rgb(255 255 255 / 16%);
  color: #fff;
  font-size: 0.14rem;
}
.annotation-sample-issue {
  padding: 8px;
  border-radius: 8px;
  background: rgb(255 255 255 / 10%);
}
.annotation-sample-issue-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #fff;
  font-size: 0.16rem;
}
.annotation-sample-issue-level {
  padding: 4px 6px;
  border-radius: 4px;
  color: #fff;
  font-size: 0.12rem;
  font-weight: 600;
}
.annotation-sample-issue-level--mustFix {
  background: #f5222d;
}
.annotation-sample-issue-level--suggestion {
  background: #d48806;
}
.annotation-sample-issue-comment,
.annotation-sample-issue-location {
  margin-top: 12px;
  color: #fff;
  font-size: 0.14rem;
  line-height: 1.5;
}
.annotation-sample-issue-location {
  margin-top: 8px;
  font-weight: 600;
}
.annotation-sample-empty {
  color: #fff;
}
:global(html.theme-dark .annotation-sample-popover-overlay) {
  .ant-popover-inner {
    background: var(--dm-bg-mask) !important;
    background-color: var(--dm-bg-mask) !important;
  }
  .ant-popover-title {
    border-bottom-color: rgb(0 0 0 / 55%) !important;
    color: #fff !important;
  }
}
:global(
  html.theme-dark .annotation-sample-popover-overlay .ant-popover-arrow::before
) {
  background: var(--dm-bg-mask) !important;
  background-color: var(--dm-bg-mask) !important;
}
:global(html.theme-dark .annotation-sample-popover) {
  color: #fff;
}
:global(html.theme-dark .annotation-sample-popover-total) {
  background: rgb(255 255 255 / 16%);
  color: #fff;
}
:global(html.theme-dark .annotation-sample-issue) {
  background: rgb(255 255 255 / 10%);
}
:global(html.theme-dark .annotation-sample-issue-head) {
  color: #fff;
}
:global(html.theme-dark .annotation-sample-issue-comment),
:global(html.theme-dark .annotation-sample-issue-location),
:global(html.theme-dark .annotation-sample-empty) {
  color: #fff;
}
</style>
