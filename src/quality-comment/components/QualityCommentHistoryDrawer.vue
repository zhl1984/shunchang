<template>
  <a-drawer
    :open="open"
    :title="title"
    width="440"
    placement="right"
    destroy-on-close
    @close="emit('close')"
  >
    <div class="quality-comment-history">
      <a-empty v-if="history.length === 0" description="当前没有历史记录" />

      <a-list v-else :data-source="history" item-layout="vertical">
        <template #renderItem="{ item }">
          <a-list-item
            class="quality-comment-history__item"
            :class="{
              'quality-comment-history__item--locatable':
                item.scope === 'OBJECT' && canLocate(item),
              'quality-comment-history__item--locating':
                locatePendingCommentId === item.id,
            }"
            :aria-busy="locatePendingCommentId === item.id"
            @click="handleLocate(item)"
          >
            <div class="quality-comment-history__row">
              <div class="quality-comment-history__topline">
                <time>{{ formatCreatedAt(item.createdAt) }}</time>
                <span class="quality-comment-history__author">
                  质检员-{{ item.reviewerName }}
                </span>
              </div>

              <div class="quality-comment-history__targetline">
                <div class="quality-comment-history__target">
                  目标：{{ formatTarget(item) }}
                </div>
                <a-tag :color="item.severity === 'MUST_FIX' ? 'red' : 'gold'">
                  {{ item.severity === "MUST_FIX" ? "必须修改" : "建议修改" }}
                </a-tag>
              </div>
              <div class="quality-comment-history__content">
                {{ item.content }}
              </div>

              <div
                v-if="item.objectExists === false"
                class="quality-comment-history__deleted"
              >
                关联对象已不存在
              </div>
            </div>
          </a-list-item>
        </template>
      </a-list>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import type { QualityCommentHistoryItem } from "../types";

defineProps<{
  open: boolean;
  title: string;
  history: QualityCommentHistoryItem[];
  locatePendingCommentId?: string;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "locate", item: QualityCommentHistoryItem): void;
}>();

/** 只允许对象级历史触发定位，样本级历史只作为阅读信息展示。 */
function canLocate(item: QualityCommentHistoryItem) {
  return Boolean(
    item.target.objectId &&
      item.scope === "OBJECT" &&
      item.objectExists !== false,
  );
}

/** 把 target 摘成一行，历史项列表只保留最关键的定位信息。 */
function formatTarget(item: QualityCommentHistoryItem) {
  if (item.scope === "CLIP") {
    return item.target.unitName || "Clip";
  }
  const parts = [
    item.target.unitName,
    item.target.frameNo !== undefined
      ? `第 ${item.target.frameNo} 帧`
      : item.target.frameId
        ? `帧 ${item.target.frameId}`
        : undefined,
    item.target.labelName || item.target.labelCode || item.target.objectId,
    item.target.objectId && item.target.labelName
      ? item.target.objectId
      : undefined,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** 将接口时间压缩为原型中的本地年月日时分格式。 */
function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function handleLocate(item: QualityCommentHistoryItem) {
  if (!canLocate(item)) return;
  emit("locate", item);
}
</script>

<style scoped lang="less">
.quality-comment-history {
  display: grid;
  gap: 16px;
}

.quality-comment-history__item {
  position: relative;
  margin-bottom: 12px;
  padding: 14px 16px;
  border: 1px solid var(--dm-border-2);
  border-radius: 14px;
  background: var(--dm-bg-container);
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;
}

.quality-comment-history__item--locatable {
  cursor: pointer;
}

.quality-comment-history__item--locatable:hover {
  border-color: var(--dm-primary-border);
  box-shadow: 0 8px 18px rgb(22 119 255 / 12%);
  transform: translateY(-1px);
}

.quality-comment-history__item--locating {
  opacity: 0.72;
  cursor: progress;
}

.quality-comment-history__row {
  display: grid;
  gap: 10px;
}

.quality-comment-history__topline,
.quality-comment-history__targetline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quality-comment-history__topline {
  color: var(--dm-text-3);
  font-size: 12px;
}

.quality-comment-history__author {
  color: var(--dm-text);
  font-weight: 600;
}

.quality-comment-history__targetline {
  margin-top: 10px;
}

.quality-comment-history__targetline :deep(.ant-tag) {
  flex: 0 0 auto;
  margin-inline-end: 0;
}

.quality-comment-history__target,
.quality-comment-history__content {
  color: var(--dm-text);
  font-size: 13px;
  line-height: 1.6;
}

.quality-comment-history__content {
  white-space: pre-wrap;
}

.quality-comment-history__deleted {
  color: var(--dm-warning);
  font-size: 12px;
}
</style>
