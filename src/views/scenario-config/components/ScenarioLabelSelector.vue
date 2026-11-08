<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  getScenarioLabelModelsApi,
  type ScenarioLabelModelMapping,
} from "@/api/scenario";
import type { ScenarioLabelModelDraft } from "../scenario-form";
import { useLabelStore, type LabelTreeStoreNode } from "@/stores/label";
import utils from "@/utils";

const props = defineProps<{
  labels: ScenarioLabelModelDraft[];
  readonly: boolean;
}>();
const emit = defineEmits<{
  (event: "update:labels", value: ScenarioLabelModelDraft[]): void;
}>();
const labelStore = useLabelStore();
const loading = ref(false);
const { t } = useI18n();
const annotationTypeLabels: Record<string, string> = {
  PRE_ANNOTATION: t("scenarioConfig.modal.labelType.pre-annotation"),
  MANUAL: t("scenarioConfig.modal.labelType.manual"),
};
let checkRequestId = 0;
const checkedKeys = computed(() => props.labels.map((item) => item.labelId));

/** 统一组装标签草稿，合并当前配置与接口返回的模型映射。 */
function buildLabelDraft(
  labelIds: number[],
  current: Map<number, ScenarioLabelModelDraft>,
  mappings: ScenarioLabelModelMapping[] = [],
): ScenarioLabelModelDraft[] {
  const mappingMap = new Map(mappings.map((item) => [item.labelId, item]));
  return labelIds.map((labelId) => {
    const mapping = mappingMap.get(labelId);
    const previous = current.get(labelId);
    return {
      labelId,
      labelName: mapping?.labelName ?? previous?.labelName,
      annotationType: mapping?.annotationType ?? previous?.annotationType ?? "MANUAL",
      modelId: mapping?.modelId ?? previous?.modelId ?? null,
      modelVersionId: mapping?.modelVersionId ?? previous?.modelVersionId ?? null,
    };
  });
}

/** 递归收集标签树中的实际标签节点。 */
function collectLabels(
  nodes: readonly LabelTreeStoreNode[],
): LabelTreeStoreNode[] {
  return nodes.flatMap((node) =>
    node.nodeType === "LABEL" ? [node] : collectLabels(node.children ?? []),
  );
}

/** 将树勾选结果转换为场景标签关联，新标签默认使用手动类型。 */
async function handleCheckImmediate(
  keys: Array<string | number>,
): Promise<void> {
  const current = new Map(props.labels.map((item) => [item.labelId, item]));
  const labelIds = collectLabels(labelStore.tree)
    .filter((node) => keys.includes(node.id))
    .flatMap((node) => (typeof node.id === "number" ? [node.id] : []));
  const requestId = ++checkRequestId;
  emit("update:labels", buildLabelDraft(labelIds, current));
  loading.value = true;
  try {
    const mappings = await getScenarioLabelModelsApi(labelIds);
    if (requestId !== checkRequestId) return;
    const nextLabels = buildLabelDraft(labelIds, current, mappings);
    emit("update:labels", nextLabels);
    if (requestId === checkRequestId) loading.value = false;
  } catch {
    loading.value = false;
    return;
    // 自动取消或请求失败时保留当前选择，避免树操作被错误提示打断。
  } finally {
    if (requestId === checkRequestId) loading.value = false;
  }
}

const handleCheck = utils.debounce(handleCheckImmediate, 250);
</script>

<template>
  <div class="scenario-label-selector">
    <h3 class="sls-title">{{ $t("scenarioConfig.modal.labels.title") }}</h3>
    <div class="sls-grid">
      <a-card
        class="sls-panel"
        size="small"
        :title="$t('scenarioConfig.modal.labels.treeTitle')"
      >
        <template #extra>
          <a-tag color="blue">
            {{
              $t("scenarioConfig.modal.labels.selectedCount", {
                count: labels.length,
              })
            }}
          </a-tag>
        </template>
        <a-spin :spinning="labelStore.status === 'loading'">
          <a-tree
            class="sls-tree"
            :tree-data="labelStore.tree"
            :checked-keys="checkedKeys"
            checkable
            block-node
            :selectable="false"
            :disabled="readonly"
            :field-names="{
              title: 'nodeName',
              key: 'id',
              children: 'children',
            }"
            @check="handleCheck($event as Array<string | number>)"
          />
        </a-spin>
      </a-card>
      <a-card
        class="sls-panel"
        size="small"
        :title="$t('scenarioConfig.modal.labels.selectedTitle')"
      >
        <template #extra>
          <a-tag color="blue">
            {{
              $t("scenarioConfig.modal.labels.count", { count: labels.length })
            }}
          </a-tag>
        </template>
        <a-spin :spinning="loading">
          <a-empty
            v-if="labels.length === 0"
            :description="$t('scenarioConfig.modal.labels.empty')"
          />
          <div v-else class="sls-cards">
            <div
              v-for="label in labels"
              :key="label.labelId"
              class="sls-card flex-between gap-8"
            >
              <strong>{{ label.labelName ?? label.labelId }}</strong>
              <a-tag
                class="sls-type-tag"
                :color="
                  label.annotationType === 'PRE_ANNOTATION'
                    ? 'success'
                    : 'default'
                "
                :role="readonly ? undefined : 'button'"
                :tabindex="readonly ? undefined : 0"
              >
                {{ annotationTypeLabels[label.annotationType] }}
              </a-tag>
            </div>
          </div>
        </a-spin>
      </a-card>
    </div>
  </div>
</template>

<style scoped lang="less">
.sls-title {
  margin: 0 0 16px;
  color: var(--dm-text);
}
.sls-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: 300px;
}
.sls-panel {
  height: 100%;
  overflow: hidden;

  :deep(.sls-tree) {
    .ant-tree-treenode {
      height: 36px;
      align-items: center;
      .ant-tree-switcher {
        line-height: 32px;
      }
      .ant-tree-checkbox {
        margin-top: 0;
      }

      &.ant-tree-treenode-checkbox-checked .ant-tree-node-content-wrapper {
        padding: 4px 8px;
        font-weight: bold;
        color: var(--dm-primary);
        background-color: var(--dm-primary-bg);
      }
    }
  }
}
.sls-panel :deep(.ant-card-body) {
  height: calc(100% - 39px);
  overflow-y: auto;
}
.sls-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.sls-card {
  padding: 8px 10px;
  border: 1px solid var(--dm-border-2);
  background-color: var(--dm-bg-layout);
  border-radius: 8px;
}
.sls-card strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sls-type-tag {
  flex: none;
  margin: 0;
  user-select: none;
  width: 54px;
  text-align: center;
  font-weight: bold;
  cursor: not-allowed;
  color: var(--dm-text-disabled);
  background: var(--dm-bg-disabled);
  border-color: var(--dm-border-disabled);
}
@media (width <= 48rem) {
  .sls-grid {
    grid-template-columns: 1fr;
    height: 640px;
  }
  .sls-cards {
    grid-template-columns: 1fr;
  }
}
</style>
