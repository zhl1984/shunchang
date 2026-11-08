<script setup lang="ts">
import { ExperimentOutlined } from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";

type QueueTask = {
  model: string;
  order: number;
  type: "training" | "preAnnotation";
};

type TrainingRecord = {
  detail: string;
  model: string;
  result: "failed" | "success";
  time: string;
  version: string;
};

const { t } = useI18n();

/** 原型中的等待队列；GPU 调度接口明确后由接口响应替换。 */
const queueTasks: QueueTask[] = [
  { order: 1, type: "training", model: "甲状腺结节分割与征象模型" },
  { order: 2, type: "preAnnotation", model: "点云3D检测模型" },
];

/** 原型中的最近训练记录；训练记录接口明确后由接口响应替换。 */
const trainingRecords: TrainingRecord[] = [
  {
    result: "failed",
    model: "甲状腺结节分割与征象模型",
    version: "已自动回退至 1.0.0",
    detail: "训练服务异常，已保留上一稳定版本",
    time: "2026年7月17日 14:08",
  },
  {
    result: "success",
    model: "甲状腺结节分割与征象模型",
    version: "已自动升级至 1.0.0",
    detail: "",
    time: "2026年7月17日 09:26",
  },
];
</script>

<template>
  <!-- GPU 卡片统一承载运行状态、等待队列和历史记录。 -->
  <a-card :bordered="false" class="gpu-card">
    <!-- 标题区使用轻量图标标识计算资源属性。 -->
    <div class="gpu-heading">
      <span class="gpu-heading__icon"><ExperimentOutlined /></span>
      <strong>{{ t("modelConfig.gpu.title") }}</strong>
    </div>

    <!-- 当前任务未提供详细数据，保留原型中的进行中状态。 -->
    <section class="gpu-section gpu-current">
      <p class="gpu-section__label">{{ t("modelConfig.gpu.running") }}</p>
      <div class="gpu-current__task">
        <span>{{ t("modelConfig.gpu.taskTypes.training") }}</span>
        <strong>甲状腺结节分割与征象模型</strong>
      </div>
    </section>

    <!-- 等待队列按调度顺序展示任务类型和模型名称。 -->
    <section class="gpu-section gpu-queue">
      <p class="gpu-section__label">{{ t("modelConfig.gpu.queue") }}</p>
      <div class="gpu-queue__list">
        <div
          v-for="task in queueTasks"
          :key="task.order"
          class="gpu-queue__item"
        >
          <span class="gpu-queue__order">{{ task.order }}</span>
          <strong :class="['gpu-task-type', task.type]">{{
            t(`modelConfig.gpu.taskTypes.${task.type}`)
          }}</strong>
          <span class="gpu-queue__model">{{ task.model }}</span>
        </div>
      </div>
    </section>

    <!-- 最近记录通过颜色区分成功和失败，时间保持右对齐。 -->
    <section class="gpu-section gpu-history">
      <p class="gpu-section__label">{{ t("modelConfig.gpu.history") }}</p>
      <div class="gpu-history__list">
        <div
          v-for="record in trainingRecords"
          :key="record.time"
          class="gpu-history__item"
        >
          <div class="gpu-history__content">
            <strong :class="['gpu-history__result', record.result]">{{
              t(`modelConfig.gpu.results.${record.result}`)
            }}</strong>
            <strong>{{ record.model }}</strong>
            <span>{{ record.version }}</span>
            <span v-if="record.detail" class="gpu-history__detail">{{
              record.detail
            }}</span>
          </div>
          <time>{{ record.time }}</time>
        </div>
      </div>
    </section>
  </a-card>
</template>

<style scoped lang="less">
/* 卡片保持与页面原型一致的轻边框和白色内容面。 */
.gpu-card {
  border-radius: 0.12rem;
  background: var(--dm-bg-container);
  box-shadow: 0 1px 4px rgb(15 23 42 / 3%);
}
.gpu-card :deep(.ant-card-body) {
  padding: 24px 26px 20px;
}

/* 资源标题采用图标与文字的紧凑横向布局。 */
.gpu-heading {
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--dm-text);
}
.gpu-heading__icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 0.06rem;
  background: var(--dm-primary-bg);
  color: #647cea;
}
.gpu-heading strong {
  font-size: 0.15rem;
}

/* 各状态区域通过分隔线形成清晰的信息层级。 */
.gpu-section {
  padding-top: 18px;
}
.gpu-section + .gpu-section {
  margin-top: 16px;
  border-top: 1px solid var(--dm-border-2);
}
.gpu-section__label {
  margin: 0 0 12px;
  color: var(--dm-text-3);
  font-size: 0.13rem;
}
.gpu-current__task {
  display: flex;
  gap: 14px;
  align-items: center;
  min-height: 24px;
}
.gpu-current__task span {
  color: #cf8b2d;
  font-weight: 700;
}

/* 队列条目使用浅色容器强调顺序，而不抢占主信息权重。 */
.gpu-queue__list {
  display: grid;
  gap: 8px;
}
.gpu-queue__item {
  display: flex;
  gap: 14px;
  align-items: center;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--dm-border-2);
  border-radius: 0.08rem;
  background: var(--dm-fill-4);
}
.gpu-queue__order {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 0.06rem;
  background: var(--dm-primary-bg);
  color: var(--dm-link);
  font-weight: 700;
}
.gpu-task-type {
  color: #cf8b2d;
}
.gpu-task-type.preAnnotation {
  color: #d19a3c;
}
.gpu-queue__model {
  color: var(--dm-text);
  font-weight: 600;
}

/* 历史记录采用左右布局，保证长说明和时间均可读。 */
.gpu-history__list {
  display: grid;
  gap: 12px;
}
.gpu-history__item {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
}
.gpu-history__content {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  min-width: 0;
}
.gpu-history__content span,
.gpu-history__item time {
  color: var(--dm-text-3);
}
.gpu-history__result.failed,
.gpu-history__detail {
  color: var(--dm-error);
}
.gpu-history__result.success {
  color: var(--dm-success);
}
.gpu-history__item time {
  flex-shrink: 0;
}

/* 窄屏允许历史记录时间换到下一行，避免正文被压缩。 */
@media (max-width: 720px) {
  .gpu-history__item {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
