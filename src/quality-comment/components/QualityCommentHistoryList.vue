<template>
  <section class="quality-comment-history-list">
    <div class="quality-comment-history-list__scroll">
      <a-empty v-if="history.length === 0" description="当前没有历史记录" />
      <a-list v-else :data-source="history" item-layout="vertical">
        <template #renderItem="{ item }">
          <a-list-item
            class="quality-comment-history-list__item"
            :class="{
              'quality-comment-history-list__item--locatable': canLocate(item),
              'quality-comment-history-list__item--locating':
                locatePendingCommentId === item.id,
            }"
            :aria-busy="locatePendingCommentId === item.id"
            @click="handleLocate(item)"
          >
            <div class="quality-comment-history-list__topline">
              <time>{{ formatCreatedAt(item.createdAt) }}</time>
              <span class="quality-comment-history-list__reviewer">
                质检员-{{ item.reviewerName }}
              </span>
            </div>
            <div class="quality-comment-history-list__targetline">
              <div class="quality-comment-history-list__target">
                目标：{{ formatTarget(item) }}
              </div>
              <a-tag :color="item.severity === 'MUST_FIX' ? 'red' : 'gold'">
                {{ item.severity === "MUST_FIX" ? "必须修改" : "建议修改" }}
              </a-tag>
            </div>
            <div class="quality-comment-history-list__content">
              {{ item.content }}
            </div>
            <div
              v-if="item.objectExists === false"
              class="quality-comment-history-list__deleted"
            >
              关联对象已不存在
            </div>
          </a-list-item>
        </template>
      </a-list>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { QualityCommentHistoryItem } from "../types";

defineProps<{
  history: QualityCommentHistoryItem[];
  locatePendingCommentId?: string;
}>();

const emit = defineEmits<{
  (event: "locate", item: QualityCommentHistoryItem): void;
}>();

/** 只允许对象级且对象仍存在的记录发起定位。 */
function canLocate(item: QualityCommentHistoryItem) {
  return Boolean(
    item.scope === "OBJECT" &&
      item.target.objectId &&
      item.objectExists !== false,
  );
}

/** 把历史目标整理成一行，保证长 ID 不破坏列表布局。 */
function formatTarget(item: QualityCommentHistoryItem) {
  if (item.scope === "CLIP") {
    return item.target.unitName || "Clip";
  }
  return [
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
  ]
    .filter(Boolean)
    .join(" · ");
}

/** 将接口时间压缩为原型中的本地年月日时分格式。 */
function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function handleLocate(item: QualityCommentHistoryItem) {
  if (canLocate(item)) emit("locate", item);
}
</script>

<style scoped lang="less">
.quality-comment-history-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 16px;
}

.quality-comment-history-list__scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 0 14px;
}

.quality-comment-history-list__item {
  position: relative;
  margin-bottom: 12px;
  padding: 14px 16px;
  border: 1px solid var(--dm-border-2);
  border-radius: 14px;
  background: var(--dm-bg-container);
}

.quality-comment-history-list__item--locatable {
  cursor: pointer;
}

.quality-comment-history-list__item--locatable:hover {
  border-color: var(--dm-primary-border);
}

.quality-comment-history-list__item--locating {
  opacity: 0.72;
  cursor: progress;
}

.quality-comment-history-list__topline,
.quality-comment-history-list__targetline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quality-comment-history-list__topline {
  color: var(--dm-text-3);
  font-size: 12px;
}

.quality-comment-history-list__reviewer {
  color: var(--dm-primary);
}

.quality-comment-history-list__target,
.quality-comment-history-list__content {
  color: var(--dm-text);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.quality-comment-history-list__targetline {
  margin-top: 10px;
}

.quality-comment-history-list__content {
  margin-top: 10px;
}

.quality-comment-history-list__targetline :deep(.ant-tag) {
  flex: 0 0 auto;
  margin-inline-end: 0;
}

.quality-comment-history-list__content {
  white-space: pre-wrap;
}

.quality-comment-history-list__deleted {
  margin-top: 8px;
  color: var(--dm-warning);
  font-size: 12px;
}
</style>
