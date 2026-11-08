<script setup lang="ts">
import { computed } from "vue";
import {
  AlertFilled,
  CalendarFilled,
  ClockCircleFilled,
  FieldTimeOutlined,
} from "@ant-design/icons-vue";
import type { Component } from "vue";
import { formatThousands } from "@/utils/format";
import type { DashboardRisks } from "@/views/executive-dashboard/types";
const props = defineProps<{ data: DashboardRisks | null }>();
type Key = "risk" | "overdue" | "dueSoon" | "stale";
const metrics: { key: Key; icon: Component }[] = [
  { key: "risk", icon: AlertFilled },
  { key: "overdue", icon: CalendarFilled },
  { key: "dueSoon", icon: ClockCircleFilled },
  { key: "stale", icon: FieldTimeOutlined },
];
/** 风险计数变化时生成展示值，缺失指标交给统一格式化方法显示占位。 */
const items = computed(() =>
  metrics.map((item) => ({
    ...item,
    label: `executiveDashboard.riskOverview.metrics.${item.key}`,
    value: formatThousands(props.data?.[item.key], 0),
  })),
);
</script>
<template>
  <section class="executive-risk-overview">
    <div class="ero-heading">
      <h2>{{ $t("executiveDashboard.riskOverview.title") }}</h2>
      <span>{{ $t("executiveDashboard.riskOverview.subtitle") }}</span>
    </div>
    <div class="ero-card">
      <div
        v-for="(item, index) in items"
        :key="item.key"
        class="ero-metric"
        :class="{ 'ero-metric--divided': index > 0 }"
      >
        <div class="ero-icon"><component :is="item.icon" /></div>
        <div>
          <div class="ero-label">{{ $t(item.label) }}</div>
          <div class="ero-value">{{ item.value }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped lang="less">
.executive-risk-overview {
  padding: 22px 24px 24px;
}
.ero-heading {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 18px;
}
.ero-heading h2 {
  margin: 0;
  color: var(--dm-text);
  font-size: 20px;
}
.ero-heading span,
.ero-label {
  color: var(--dm-text-2);
  font-size: 12px;
}
.ero-card {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 56px 28px;
  border-radius: 6px;
  background: var(--dm-bg-container);
}
.ero-metric {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.ero-metric--divided {
  border-left: 1px solid var(--dm-border-2);
}
.ero-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  color: #1677ff;
  background: #edf5ff;
  font-size: 20px;
}
.ero-label {
  color: var(--dm-text-1);
  margin-bottom: 12px;
}
.ero-value {
  color: var(--dm-text);
  font-size: 24px;
  line-height: 1;
}
@media (max-width: 900px) {
  .ero-card {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
  .ero-metric--divided {
    border-left: 0;
  }
}
</style>
