<script setup lang="ts">
import { computed, watch } from "vue";
import type { ScenarioRuleMappingInput } from "@/api/scenario";
import type { RuleListItem } from "@/api/rule";
import { useRuleStore } from "@/stores/rule";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  value: ScenarioRuleMappingInput[];
  selectedLabelIds: number[];
  readonly: boolean;
}>();
const emit = defineEmits<{
  (event: "update:value", value: ScenarioRuleMappingInput[]): void;
}>();
const ruleStore = useRuleStore();
const { t } = useI18n();
/** 返回规则描述，无描述时使用统一空值文案。 */
function getRuleDescription(rule: RuleListItem): string {
  return rule.ruleDescription ?? t("scenarioConfig.modal.rules.noDescription");
}
const applicableRules = computed<RuleListItem[]>(() =>
  ruleStore.rules.filter(
    (rule) => rule.id !== null && props.selectedLabelIds.includes(rule.labelId),
  ),
);
const selectedRules = computed<Array<RuleListItem & { enabled: boolean }>>(
  () => {
    const enabledMap = new Map(
      props.value.map((item) => [item.ruleId, item.status === "ENABLED"]),
    );

    return applicableRules.value.map((rule) => ({
      ...rule,
      enabled: enabledMap.get(rule.id!) ?? false,
    }));
  },
);

/** 切换单条适用规则的启用状态。 */
function handleToggle(id: number): void {
  if (props.readonly) return;
  emit(
    "update:value",
    selectedRules.value.map((item) => ({
      ruleId: item.id,
      status: item.id === id ? (item.enabled ? "DISABLED" : "ENABLED") : (item.enabled ? "ENABLED" : "DISABLED"),
    })),
  );
}
/** 批量设置全部适用规则。 */
function handleToggleAll(enabled: boolean): void {
  if (props.readonly) return;
  emit(
    "update:value",
    selectedRules.value.map((item) => ({ ruleId: item.id, status: enabled ? "ENABLED" : "DISABLED" })),
  );
}

watch(applicableRules, (rules) => {
  const nextValue: ScenarioRuleMappingInput[] = rules.map((rule) => ({
    ruleId: rule.id!,
    status: "ENABLED",
  }));
  const unchanged =
    nextValue.length === props.value.length &&
    nextValue.every(
      (item, index) =>
        item.ruleId === props.value[index]?.ruleId &&
        item.status === props.value[index]?.status,
    );

  // 标签变化后默认启用全部适用规则，相同结果不重复同步以避免父子组件循环更新。
  if (!unchanged) emit("update:value", nextValue);
});
</script>

<template>
  <div class="scenario-rule-selector">
    <div class="srs-toolbar flex justify-end gap-8 m-b-12">
      <h3 class="srs-title flex-1">
        {{ $t("scenarioConfig.modal.rules.title") }}
      </h3>
      <a-button
        v-if="!readonly"
        class="font-bold"
        @click="handleToggleAll(true)"
        >{{ $t("scenarioConfig.modal.rules.selectAll") }}</a-button
      >
      <a-button
        v-if="!readonly"
        class="font-bold"
        @click="handleToggleAll(false)"
        >{{ $t("scenarioConfig.modal.rules.selectNone") }}</a-button
      >
    </div>
    <a-spin :spinning="ruleStore.status === 'loading'">
      <a-empty
        v-if="selectedRules.length === 0"
        :description="$t('scenarioConfig.modal.rules.empty')"
      />
      <div v-else class="srs-grid">
        <div
          v-for="rule in selectedRules"
          :key="rule.id"
          class="srs-card items-center"
          :class="{ checked: rule.enabled, pointer: !readonly }"
          @click="handleToggle(rule.id)"
        >
          <a-checkbox :checked="rule.enabled" :disabled="readonly">
          </a-checkbox>

          <div class="m-l-12">
            <strong>{{ rule.ruleName }}</strong>
            <p class="font-xs" :title="getRuleDescription(rule)">
              {{ getRuleDescription(rule) }}
            </p>
          </div>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<style scoped lang="less">
.srs-title {
  margin: 0 0 16px;
  color: var(--dm-text);
}
.srs-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  max-height: 280px;
  overflow-y: auto;
  padding-bottom: 2px;
}
.srs-card {
  padding: 12px 16px;
  border: 1px solid var(--dm-border-2);
  border-radius: 8px;
  &.checked {
    border-color: var(--dm-primary-border);
  }
}
.srs-card p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--dm-text-3);
  height: 2.4em;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
@media (width <= 48rem) {
  .srs-grid {
    grid-template-columns: 1fr;
  }
}
</style>
