<script setup lang="ts">
import { computed, h, inject, ref } from "vue";
import { useI18n } from "vue-i18n";
import { message, Modal } from "ant-design-vue";
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons-vue";
import { useScenarioStore } from "@/stores/scenario";
import { useUserStore } from "@/stores/user";
import { useRouter } from "vue-router";
import {
  deleteScenarioApi,
  getScenarioDetailApi,
  type Scenario,
} from "@/api/scenario";
import { getPermissionKeys } from "@/router/index.ts";
import ScenarioModal from "./components/ScenarioModal.vue";
import type { ScenarioModalMode } from "./scenario-form";
import type { DmTableColumn } from "@/components/Table/types";
import {
  MAIN_LAYOUT_BREADCRUMB,
  type MainLayoutBreadcrumbSetter,
} from "@/constants/inject";

const { t } = useI18n();
const store = useScenarioStore();
const router = useRouter();
const userStore = useUserStore();
const setLayoutPath = inject<MainLayoutBreadcrumbSetter>(
  MAIN_LAYOUT_BREADCRUMB,
);
const keyword = ref("");
const modalOpen = ref(false);
const detailLoading = ref(false);

/** 解析场景扩展按钮，并将开发配置入口置于首位。 */
const scenarioButtons = computed(() => {
  const scenarioMenu = userStore.menus
    .flatMap((group) => group.children)
    .find((menu) => menu.permissionKey === "scenario-config");
  const buttons = (scenarioMenu?.children || []).filter(
    (item) => item.menuType === 3,
  );
  const routes = router.getRoutes();
  return buttons
    .map((button) => {
      const route = routes.find((record) =>
        getPermissionKeys(record).includes(button.permissionKey),
      );
      return {
        ...button,
        path: route?.path,
        icon: route?.meta?.icon,
        title: route?.meta?.titleKey
          ? t(route?.meta?.titleKey)
          : button.menuName,
      };
    })
    .filter((button) => button.path)
    .sort((left, right) => {
      // 开发配置入口是首要的扩展操作，应优先展示。
      const leftPriority = left.permissionKey === "development-config" ? 0 : 1;
      const rightPriority =
        right.permissionKey === "development-config" ? 0 : 1;
      return leftPriority - rightPriority;
    });
});

/** 跳转到场景配置菜单授权的扩展功能页面。 */
function handleScenarioButtonClick(scenarioButton: {
  path?: string;
  title: string;
}): void {
  const path = scenarioButton.path;
  if (!path) return;

  setLayoutPath?.((pathList) => {
    return [...pathList, { path, title: scenarioButton.title }];
  });

  void router.push(path);
}
const modalMode = ref<ScenarioModalMode>("create");
const activeScenario = ref<Scenario | null>(null);
const filteredScenarios = computed<Scenario[]>(() => {
  const value = keyword.value.trim().toLowerCase();
  // 无搜索条件时返回列表快照，避免表格内部操作影响 store 中的顺序。
  if (!value) return [...store.scenarios];
  return store.scenarios.filter((scenario) =>
    [scenario.sceneName, scenario.sceneDesc]
      .join(" ")
      .toLowerCase()
      .includes(value),
  );
});
const columns = computed<DmTableColumn<Scenario>[]>(() => [
  {
    title: t("scenarioConfig.table.name"),
    dataIndex: "sceneName",
    key: "sceneName",
    width: 280,
  },
  {
    title: t("scenarioConfig.table.labelingType"),
    dataIndex: "annotationTypeName",
    key: "annotationTypeName",
  },
  { title: t("scenarioConfig.table.labels"), key: "labels" },
  {
    title: t("scenarioConfig.table.qualityPlan"),
    dataIndex: "qualityPlanName",
    key: "qualityPlanName",
  },
  {
    title: t("scenarioConfig.table.actions"),
    key: "actions",
    className: "table-actions-cell",
    fixed: "right",
    width: 188,
  },
]);

/** 格式化关联名称，以便在表格中紧凑展示。 */
function formatNames(
  items: readonly { labelName?: string; name?: string }[],
): string {
  return (
    items
      .map((item) => item.labelName ?? item.name ?? "")
      .filter(Boolean)
      .join(", ") || t("scenarioConfig.empty.related")
  );
}

/** 根据搜索条件过滤场景列表。 */
/** 打开新增场景弹窗。 */
function handleCreate(): void {
  modalMode.value = "create";
  activeScenario.value = null;
  modalOpen.value = true;
}

/** 使用列表行数据打开查看、编辑或复制模式。 */
async function handleOpenScenario(
  scenario: Scenario,
  mode: Exclude<ScenarioModalMode, "create">,
): Promise<void> {
  if (detailLoading.value) return;
  detailLoading.value = true;
  try {
    const detail = await getScenarioDetailApi(String(scenario.sceneId));
    activeScenario.value = detail;
    modalMode.value = mode;
    modalOpen.value = true;
  } catch {
    message.error(t("scenarioConfig.feedback.detailFailed"));
  } finally {
    detailLoading.value = false;
  }
}

/** 弹窗保存完成后刷新全局场景列表。 */
function handleSaved(): void {
  void store.refresh();
}

/** 删除未被项目引用的场景，并在当前页清空时回退上一页。 */
function handleDeleteScenario(scenario: Scenario): void {
  Modal.confirm({
    title: t("scenarioConfig.delete.title"),
    content: t("scenarioConfig.delete.confirm", { name: scenario.sceneName }),
    icon: h(ExclamationCircleOutlined),
    okText: t("scenarioConfig.delete.actions.confirm"),
    cancelText: t("scenarioConfig.delete.actions.cancel"),
    okType: "danger",
    centered: true,
    async onOk() {
      try {
        await deleteScenarioApi(String(scenario.sceneId));
        await store.refresh();
        message.success(t("scenarioConfig.feedback.deleteSuccess"));
      } catch {
        message.error(t("scenarioConfig.feedback.deleteFailed"));
        throw new Error("Scenario deletion failed");
      }
    },
  });
}
</script>

<template>
  <main class="scenario-config-page">
    <a-card class="scp-data" :bordered="false">
      <DmAppTable
        row-key="sceneId"
        :table-title="t('scenarioConfig.title')"
        :columns="columns"
        :data-source="filteredScenarios"
        :loading="store.status === 'loading'"
        :scroll="{ x: 1120 }"
      >
        <template #titleTool>
          <a-input
            v-model:value="keyword"
            class="scp-search"
            size="large"
            :placeholder="t('scenarioConfig.searchPlaceholder')"
            allow-clear
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-button type="primary" size="large" @click="handleCreate"
            ><template #icon><PlusOutlined /></template
            >{{ t("scenarioConfig.actions.create") }}</a-button
          >
          <a-tooltip
            v-for="button in scenarioButtons"
            :key="button.permissionKey"
            :title="button.title"
          >
            <a-button
              size="large"
              :aria-label="button.title"
              @click="handleScenarioButtonClick(button)"
            >
              <template #icon><component :is="button.icon" /></template>
            </a-button>
          </a-tooltip>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sceneName'">
            <strong class="scp-name">{{ record.sceneName }}</strong>
          </template>
          <template v-else-if="column.key === 'labels'">{{
            formatNames(record.labelModelMappings)
          }}</template>
          <template v-else-if="column.key === 'actions'">
            <div class="table-actions">
              <a-button type="link" @click="handleOpenScenario(record, 'view')">
                {{ t("scenarioConfig.actions.view") }}
              </a-button>
              <a-button type="link" @click="handleOpenScenario(record, 'edit')">
                {{ t("scenarioConfig.actions.edit") }}
              </a-button>
              <a-button
                type="link"
                danger
                @click="handleDeleteScenario(record)"
              >
                {{ t("scenarioConfig.actions.delete") }}
              </a-button>
              <a-button type="link" @click="handleOpenScenario(record, 'copy')">
                {{ t("scenarioConfig.actions.copy") }}
              </a-button>
            </div>
          </template>
        </template>
        <template #emptyText>
          <a-empty :description="t('scenarioConfig.empty.default')" />
        </template>
      </DmAppTable>
    </a-card>
    <ScenarioModal
      v-model:open="modalOpen"
      :mode="modalMode"
      :scenario="activeScenario"
      @saved="handleSaved"
    />
  </main>
</template>

<style scoped lang="less">
.scenario-config-page {
  color: var(--dm-text);
}
.scp-data {
  height: 100%;
  background: var(--dm-bg-container);
}
.scp-data :deep(.ant-card-body) {
  height: 100%;
}
.scp-search {
  width: max(20vw, 200px);
}
.scp-name {
  display: block;
}
.scp-name {
  color: var(--dm-text);
}
</style>
