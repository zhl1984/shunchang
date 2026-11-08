<script setup lang="ts">
import { computed, h, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { message, Modal } from "ant-design-vue";
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons-vue";
import {
  deleteRuleApi,
  getRuleDetailApi,
  type Rule,
  type RuleListItem,
} from "@/api/rule";
import { useRuleStore } from "@/stores/rule";
import utils from "@/utils";
import type { DmTableColumn } from "@/components/Table/types";
import RuleModal from "./components/RuleModal.vue";
import type { RuleModalMode } from "./components/RuleModal.vue";

type RuleRecord = RuleListItem;

const { t } = useI18n();
const ruleStore = useRuleStore();
const searchText = ref("");
const filteredRules = ref<RuleRecord[]>([]);
const modalOpen = ref(false);
const modalMode = ref<RuleModalMode>("create");
const activeRule = ref<Rule>();
const detailLoading = ref(false);

function handleCreate(): void {
  modalMode.value = "create";
  activeRule.value = undefined;
  modalOpen.value = true;
}

/** 新增或编辑成功后刷新规则集合，保持列表与服务端数据一致。 */
async function handleRuleSaved(): Promise<void> {
  await ruleStore.refresh();
}
async function handleOpenRule(
  rule: RuleRecord,
  mode: Exclude<RuleModalMode, "create">,
): Promise<void> {
  modalMode.value = mode;
  activeRule.value = undefined;
  modalOpen.value = true;
  detailLoading.value = true;
  try {
    const response = await getRuleDetailApi(rule.id);
    if (response.code !== "0") throw new Error(response.message);
    if (!response.data) throw new Error(t("ruleCenter.feedback.detailFailed"));
    activeRule.value = response.data;
  } catch (error: unknown) {
    modalOpen.value = false;
    message.error(
      error instanceof Error
        ? error.message
        : t("ruleCenter.feedback.detailFailed"),
    );
  } finally {
    detailLoading.value = false;
  }
}

function filterRules(keyword: string): RuleRecord[] {
  const records = ruleStore.rules;
  if (!keyword) return [...records];
  return records.filter((rule) =>
    [
      rule.ruleName,
      rule.ruleDescription,
      rule.labelName,
      rule.conditionSummary,
    ].some((value) => value?.toLocaleLowerCase().includes(keyword)),
  );
}
/** 搜索输入防抖后更新过滤集合，分页重置由 AppTable 统一处理。 */
const handleSearchInput = utils.debounce(() => {
  filteredRules.value = filterRules(
    searchText.value.trim().toLocaleLowerCase(),
  );
}, 100);

watch(
  () => ruleStore.rules,
  () => {
    filteredRules.value = filterRules(
      searchText.value.trim().toLocaleLowerCase(),
    );
  },
  { immediate: true },
);

/** 打开规则删除确认框，接口成功后刷新规则 Store。 */
function handleDeleteRule(rule: RuleRecord): void {
  Modal.confirm({
    title: t("ruleCenter.delete.title"),
    content: t("ruleCenter.delete.confirm", { name: rule.ruleName }),
    icon: h(ExclamationCircleOutlined),
    okText: t("ruleCenter.delete.actions.confirm"),
    cancelText: t("ruleCenter.delete.actions.cancel"),
    okType: "danger",
    centered: true,
    async onOk() {
      try {
        const response = await deleteRuleApi(rule.id);
        if (response.code !== "0") throw new Error(response.message);
      } catch (error: unknown) {
        message.error(
          error instanceof Error
            ? error.message
            : t("ruleCenter.feedback.deleteFailed"),
        );
        return;
      }
      await ruleStore.refresh();
    },
  });
}

const columns = computed<DmTableColumn<RuleRecord>[]>(() => [
  {
    title: t("ruleCenter.table.rule"),
    key: "rule",
    className: "table-bold-cell",
    dataIndex: "ruleName",
    fixed: "left",
    width: 280,
  },
  {
    title: t("ruleCenter.table.label"),
    key: "label",
    dataIndex: "labelName",
    width: 180,
  },
  {
    title: t("ruleCenter.table.conditions"),
    key: "conditions",
    dataIndex: "conditionSummary",
    minWidth: 300,
  },
  {
    title: t("ruleCenter.table.actions"),
    key: "actions",
    className: "table-actions-cell",
    fixed: "right",
    width: 140,
  },
]);

onUnmounted(() => {
  handleSearchInput.cancel();
});
</script>

<template>
  <main class="rule-center-page">
    <a-card class="rule-center-data" :bordered="false">
      <DmAppTable
        row-key="id"
        :table-title="t('ruleCenter.title')"
        :columns="columns"
        :data-source="filteredRules"
        :loading="ruleStore.status === 'loading'"
        :scroll="{ x: 1040 }"
      >
        <template #titleTool>
          <a-input
            v-model:value="searchText"
            class="rc-search"
            :placeholder="t('ruleCenter.searchPlaceholder')"
            size="large"
            allow-clear
            @input="handleSearchInput"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-button type="primary" size="large" @click="handleCreate">
            <template #icon><PlusOutlined /></template>
            {{ t("ruleCenter.actions.create") }}
          </a-button>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <div class="table-actions">
              <a-button
                type="link"
                @click="handleOpenRule(record as RuleRecord, 'view')"
              >
                {{ t("ruleCenter.actions.view") }}
              </a-button>
              <a-button
                type="link"
                @click="handleOpenRule(record as RuleRecord, 'edit')"
              >
                {{ t("ruleCenter.actions.edit") }}
              </a-button>
              <a-button
                type="link"
                danger
                @click="handleDeleteRule(record as RuleRecord)"
              >
                {{ t("ruleCenter.actions.delete") }}
              </a-button>
            </div>
          </template>
        </template>
      </DmAppTable>
    </a-card>
    <RuleModal
      v-model:open="modalOpen"
      :mode="modalMode"
      :rule="activeRule"
      :loading="detailLoading"
      @saved="handleRuleSaved"
    />
  </main>
</template>

<style scoped lang="less">
.rule-center-page {
  height: 100%;
  color: var(--dm-text);
}
.rule-center-data {
  height: 100%;
  background: var(--dm-bg-container);
}
.rule-center-data :deep(.ant-card-body) {
  height: 100%;
}
.rc-row-description,
.rc-conditions {
  color: var(--dm-text-3);
}
.rc-search {
  width: max(15vw, 300px);
}
.rc-rule-name,
.rc-row-description {
  display: block;
}
.rc-rule-name {
  color: var(--dm-text);
}
.rc-row-description {
  margin-top: 4px;
  line-height: 1.5;
}
.rc-conditions {
  display: block;
  line-height: 1.5;
}
</style>
