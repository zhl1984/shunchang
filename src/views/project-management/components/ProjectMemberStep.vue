<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { message } from "ant-design-vue";
import { AuditOutlined, FormOutlined } from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";
import { getQualityPlanDetailApi, type QualityPlan } from "@/api/quality-plan";
import { useMemberStore, type MemberTreeNode } from "@/stores/member";
import { useScenarioStore } from "@/stores/scenario";
import type {
  ProjectFormDraft,
  ProjectMemberForm,
  ProjectModalMode,
  ProjectStepExpose,
} from "../types";

type MemberSelectTreeNode = {
  children?: MemberSelectTreeNode[];
  disableCheckbox?: boolean;
  key: number | string;
  title: string;
};

const props = defineProps<{
  mode: ProjectModalMode;
  modelValue: ProjectMemberForm;
  draft: ProjectFormDraft;
}>();
const { t } = useI18n();
const memberStore = useMemberStore();
const scenarioStore = useScenarioStore();
const loading = ref(false);
const qualityPlan = ref<QualityPlan | null>(null);
const activeFlow = ref("annotator");
const form = reactive({
  annotatorUserIds: [...props.modelValue.annotatorUserIds],
  qualityUserIds: { ...props.modelValue.qualityUserIds },
});
watch(
  () => props.modelValue,
  (value) => {
    form.annotatorUserIds = [...value.annotatorUserIds];
    form.qualityUserIds = { ...value.qualityUserIds };
  },
  { immediate: true, deep: true },
);
const qualityLevels = computed(() => qualityPlan.value?.levels ?? []);
const activeQualityLevel = computed(() =>
  qualityLevels.value.find(
    (level) => `quality-${level.levelOrder}` === activeFlow.value,
  ),
);
const activeIds = computed<Array<string | number>>({
  get: () =>
    activeFlow.value === "annotator"
      ? form.annotatorUserIds
      : (form.qualityUserIds[
          String(activeQualityLevel.value?.levelOrder ?? 0)
        ] ?? []),
  set: (value) => {
    const memberIds = value.filter(
      (key): key is number => typeof key === "number",
    );
    if (activeFlow.value === "annotator") form.annotatorUserIds = memberIds;
    else if (activeQualityLevel.value)
      form.qualityUserIds[String(activeQualityLevel.value.levelOrder)] =
        memberIds;
  },
});
/** 将成员 Store 树转成 a-tree 数据，分组 key 加前缀避免与成员 ID 冲突。 */
function toSelectTreeData(nodes: MemberTreeNode[]): MemberSelectTreeNode[] {
  return nodes.map((node) => {
    if (node.nodeType === "group") {
      return {
        children: toSelectTreeData(node.children),
        disableCheckbox: true,
        key: `group-${node.key}`,
        title: node.label,
      };
    }

    return {
      key: node.key,
      title: node.label,
    };
  });
}
const treeData = computed(() =>
  toSelectTreeData(
    activeFlow.value === "annotator"
      ? memberStore.annotatorTree
      : memberStore.qualityTree,
  ),
);
const qualitySelectedCount = computed(() =>
  Object.values(form.qualityUserIds).reduce(
    (total, ids) => total + ids.length,
    0,
  ),
);
const flowItems = computed(() => [
  { key: "annotator", label: t("projectManagement.modal.members.annotators") },
  ...qualityLevels.value.map((level) => ({
    key: `quality-${level.levelOrder}`,
    label: level.name,
  })),
]);
const summaryLevels = computed(() =>
  qualityLevels.value.map((level) => ({
    level: level.levelOrder,
    name: level.name,
    count: form.qualityUserIds[String(level.levelOrder)]?.length ?? 0,
  })),
);
/** 等待成员选择树就绪，并按当前场景查询质量方案详情。 */
async function loadMemberContext(): Promise<void> {
  loading.value = true;
  try {
    const scene = scenarioStore.scenarios.find(
      (item) => item.sceneId === props.draft.scene.sceneId,
    );
    const [, plan] = await Promise.all([
      memberStore.initialize(),
      scene?.qualityPlanId
        ? getQualityPlanDetailApi(scene.qualityPlanId)
        : Promise.resolve(null),
    ]);
    qualityPlan.value = plan;
    qualityPlan.value?.levels.forEach((level) => {
      const key = String(level.levelOrder);
      form.qualityUserIds[key] ??= [];
    });
  } catch {
    qualityPlan.value = null;
    message.error(t("projectManagement.modal.members.loadFailed"));
  } finally {
    loading.value = false;
  }
}
/** 校验标注人员及质量方案中的每个质检层级至少选择一人。 */
async function validate(): Promise<void> {
  if (!form.annotatorUserIds.length) {
    const error = t("projectManagement.modal.members.annotatorRequired");
    message.error(error);
    throw new Error(error);
  }
  const emptyLevel = qualityLevels.value.find(
    (level) => !form.qualityUserIds[String(level.levelOrder)]?.length,
  );
  if (emptyLevel) {
    const error = t("projectManagement.modal.members.qualityRequired", {
      levelName: emptyLevel.name,
    });
    message.error(error);
    throw new Error(error);
  }
}
/** 返回团队成员步骤的独立快照。 */
function getForm(): ProjectMemberForm {
  return {
    annotatorUserIds: [...form.annotatorUserIds],
    qualityUserIds: { ...form.qualityUserIds },
  };
}
defineExpose<ProjectStepExpose<ProjectMemberForm>>({ validate, getForm });
watch(() => props.draft.scene.sceneId, loadMemberContext);
onMounted(loadMemberContext);
</script>
<template>
  <a-spin class="pm-members-container" :spinning="loading">
    <div class="pm-members">
      <nav class="pm-flow" aria-label="成员流程">
        <button
          v-for="(item, index) in flowItems"
          :key="item.key"
          type="button"
          class="pm-flow-item"
          :class="{
            'pm-flow-item--active': activeFlow === item.key,
            'pm-flow-item--error':
              item.key === 'annotator'
                ? !form.annotatorUserIds.length
                : !form.qualityUserIds[item.key.replace('quality-', '')]
                    ?.length,
          }"
          @click="activeFlow = item.key"
        >
          <span class="pm-flow-dot">
            <FormOutlined v-if="index === 0" />
            <AuditOutlined v-else />
          </span>
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <section class="pm-member-tree-panel">
        <header class="pm-tree-header">
          <h3>
            {{
              activeFlow === "annotator"
                ? t("projectManagement.modal.members.annotators")
                : t("projectManagement.modal.members.qualityCurrent", {
                    level: activeQualityLevel?.levelOrder ?? 0,
                  })
            }}
          </h3>
        </header>
        <a-tree
          v-model:checked-keys="activeIds"
          checkable
          :tree-data="treeData"
          :disabled="mode === 'view'"
          default-expand-all
        />
      </section>
    </div>
    <div class="pm-member-summary">
      <span>{{ t("projectManagement.modal.members.summaryPrefix") }}</span>
      <strong
        :class="[
          'm-x-4',
          form.annotatorUserIds.length ? 'pm-count--ok' : 'pm-count--error',
        ]"
        >{{ form.annotatorUserIds.length }}</strong
      >
      <span>
        {{ t("projectManagement.modal.members.annotatorUnit") }}；{{
          t("projectManagement.modal.members.qualityTotalPrefix")
        }}
      </span>
      <strong
        :class="[
          'm-x-4',
          qualitySelectedCount ? 'pm-count--ok' : 'pm-count--error',
        ]"
        >{{ qualitySelectedCount }}</strong
      >
      <span>{{ t("projectManagement.modal.members.qualityTotalSuffix") }}</span>
      <template v-for="item in summaryLevels" :key="item.level">
        <span>，{{ item.name }} </span>
        <strong
          :class="['m-x-4', item.count ? 'pm-count--ok' : 'pm-count--error']"
        >
          {{ item.count }}
        </strong>
        <span>{{ t("projectManagement.modal.members.personUnit") }}</span>
      </template>
      <span>。</span>
    </div>
  </a-spin>
</template>
<style scoped>
.pm-members-container {
  height: 100%;
  overflow: hidden;
}
.pm-members {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  grid-template-rows: 300px;
  gap: 24px;
}
.pm-flow {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--dm-border);
  border-radius: 8px;
  overflow-y: auto;
}
.pm-flow-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  color: var(--dm-text-2);
  padding: 10px 12px;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  border: 1px solid var(--dm-border-2);
}
.pm-flow-item:hover {
  background: color-mix(in srgb, var(--dm-primary) 8%, transparent);
  border-color: var(--dm-primary-border);
}
.pm-flow-item--active {
  background: color-mix(in srgb, var(--dm-primary) 14%, transparent);
  color: var(--dm-primary);
  font-weight: 600;
  border-color: var(--dm-primary-border);
}
.pm-flow-item--error {
  border-color: var(--dm-error);
}
.pm-flow-dot {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--dm-bg-layout);
  font-size: 12px;
}
.pm-member-tree-panel {
  min-width: 300px;
  height: 100%;
  border: 1px solid var(--dm-border);
  border-radius: 8px;
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
}
.pm-tree-header h3 {
  margin: 0 0 16px;
}
.pm-member-tree-panel :deep(.ant-tree) {
  flex: 1;
  height: 0;
  overflow-y: auto;
}
.pm-member-summary {
  margin-top: 16px;
  color: var(--dm-text-2);
}
.pm-count--ok {
  color: var(--dm-primary);
}
.pm-count--error {
  color: var(--dm-error);
}
@media (width <= 640px) {
  .pm-members {
    grid-template-columns: 1fr;
  }
  .pm-flow {
    flex-direction: row;
    overflow-x: auto;
  }
}
</style>
