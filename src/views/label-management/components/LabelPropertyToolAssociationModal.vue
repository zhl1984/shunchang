<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { LinkOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { useI18n } from "vue-i18n";

import {
  saveLabelPropertyToolBindingsApi,
  type LabelAttribute,
} from "@/api/label";
import type { AnnotationTool } from "@/api/development-config";
import { useAnnotationToolStore } from "@/stores/annotation-tool";

type PropertyToolDraftItem = {
  toolCode: string;
  checked: boolean;
  toolPropertyCode?: string;
};

type PropertyToolRow = AnnotationTool & PropertyToolDraftItem;

const props = defineProps<{
  open: boolean;
  property: LabelAttribute | undefined;
  labelId: number;
}>();
const emit = defineEmits<{
  "update:open": [value: boolean];
  saved: [];
}>();
const { t } = useI18n();
const draft = ref<PropertyToolDraftItem[]>([]);
const annotationToolStore = useAnnotationToolStore();

/** 组件创建时加载固定工具列表；组件由 v-if 控制，仅在打开弹窗时创建。 */
// 工具定义与草稿按 value 合并，模板无需执行查找或类型兼容逻辑。
const toolRows = computed<PropertyToolRow[]>(() =>
  annotationToolStore.tools.map((tool) => ({
    ...tool,
    toolProperties: tool.toolProperties,
    ...(draft.value.find((item) => item.toolCode === tool.toolCode) ?? {
      toolCode: tool.toolCode,
      checked: false,
    }),
  })),
);

function createDraft(): PropertyToolDraftItem[] {
  const saved = props.property?.toolBindings ?? [];
  return annotationToolStore.tools.map((tool) => {
    const binding = saved.find(
      (item) =>
        item.toolCode === tool.toolCode &&
        tool.toolProperties.some(
          (property) => property.code === item.toolPropertyCode,
        ),
    );
    return {
      toolCode: tool.toolCode,
      checked: Boolean(binding),
      toolPropertyCode: binding?.toolPropertyCode,
    };
  });
}

/** 根据当前属性重新创建完整工具草稿，避免不同属性共享临时状态。 */
watch(
  () => [props.open, props.property?.id, annotationToolStore.tools] as const,
  ([open, propertyId]) => {
    if (!open || propertyId === undefined) return;
    draft.value = createDraft();
  },
  { immediate: true },
);

/** 更新工具勾选状态；取消勾选时由草稿函数同步清除工具属性。 */
function handleToolChecked(toolCode: string): void {
  draft.value = draft.value.map((item) =>
    item.toolCode === toolCode
      ? {
          ...item,
          checked: !item.checked,
          toolPropertyCode: !item.checked ? item.toolPropertyCode : undefined,
        }
      : item,
  );
}

/** 接收 Select 的宽泛值，并仅保留有效字符串工具属性编码。 */
function handleToolPropertyChange(toolCode: string, value: unknown): void {
  draft.value = draft.value.map((item) =>
    item.toolCode === toolCode
      ? {
          ...item,
          toolPropertyCode: typeof value === "string" ? value : undefined,
        }
      : item,
  );
}

/** 关闭弹窗并丢弃尚未写入 store 的本地草稿。 */
function handleCancel(): void {
  emit("update:open", false);
}

/** 过滤不完整关联后整体保存当前标签属性的工具配置。 */
async function handleSubmit(): Promise<void> {
  if (props.property) {
    const bindings = annotationToolStore.tools.flatMap((tool) => {
      const item = draft.value.find(
        (draftItem) => draftItem.toolCode === tool.toolCode,
      );
      const property = tool.toolProperties.find(
        (candidate) => candidate.code === item?.toolPropertyCode,
      );
      return item?.checked && property
        ? [
            {
              toolId: tool.toolId,
              toolCode: tool.toolCode,
              toolName: tool.toolName,
              toolDescription: null,
              toolPropertyCode: property.code,
              toolPropertyName: property.name,
              toolPropertyType: property.type,
            },
          ]
        : [];
    });
    try {
      await saveLabelPropertyToolBindingsApi(
        props.labelId,
        props.property.id,
        bindings,
      );
      emit("saved");
      message.success(t("labelManagement.tools.feedback.success"));
    } catch (error: unknown) {
      message.error(
        error instanceof Error && error.message
          ? error.message
          : t("labelManagement.tools.feedback.error"),
      );
      throw error;
    }
  }
  emit("update:open", false);
}
</script>

<template>
  <a-modal
    :open="open"
    :width="780"
    :ok-text="t('labelManagement.tools.actions.submit')"
    :cancel-text="t('labelManagement.tools.actions.cancel')"
    class="label-property-tool-association-modal"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <template #title>
      <div class="lptam-heading flex items-center gap-16">
        <span class="lptam-icon flex-center"><LinkOutlined /></span>
        <div class="lptam-title">
          <div class="font-xl">{{ t("labelManagement.tools.title") }}</div>
          <p class="lptam-description font-sm">
            {{
              t("labelManagement.tools.description", {
                name: property?.attributeName,
              })
            }}
          </p>
        </div>
      </div>
    </template>

    <div class="lptam-section-heading flex-between font-sm">
      <span>{{ t("labelManagement.tools.sections.definitions") }}</span>
      <span>{{
        t("labelManagement.tools.total", { count: toolRows.length })
      }}</span>
    </div>

    <div class="lptam-tools">
      <article
        v-for="tool in toolRows"
        :key="tool.toolCode"
        class="lptam-tool-row"
        :class="tool.checked ? 'checked' : ''"
      >
        <a-checkbox
          :checked="tool.checked"
          @change="handleToolChecked(tool.toolCode)"
        />
        <div
          class="lptam-tool-info pointer"
          @click="handleToolChecked(tool.toolCode)"
        >
          <strong class="font-base">{{ tool.toolName }}</strong>
        </div>
        <a-select
          class="lptam-tool-select"
          :data-tool-value="tool.toolCode"
          :value="tool.toolPropertyCode"
          :disabled="!tool.checked || tool.toolProperties.length === 0"
          :placeholder="t('labelManagement.tools.propertyPlaceholder')"
          @change="handleToolPropertyChange(tool.toolCode, $event)"
        >
          <a-select-option
            v-for="toolProperty in tool.toolProperties"
            :key="toolProperty.code"
            :value="toolProperty.code"
          >
            {{ toolProperty.name }}
          </a-select-option>
        </a-select>
      </article>
    </div>
  </a-modal>
</template>

<style scoped lang="less">
.label-property-tool-association-modal {
  .lptam-heading {
    padding-bottom: 20px;
    border-bottom: 1px solid var(--dm-border-2);
  }

  .lptam-icon {
    flex: 0 0 42px;
    height: 42px;
    border-radius: 8px;
    color: var(--dm-primary);
    background: var(--dm-primary-bg);
  }

  .lptam-description {
    margin: 0;
    color: var(--dm-text-3);
  }

  .lptam-section-heading {
    padding: 8px 0;
    color: var(--dm-text-3);
  }

  .lptam-tools {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: max(480px, 60vh);
    overflow-y: auto;
  }

  .lptam-tool-row {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) minmax(240px, 340px);
    gap: 16px;
    align-items: center;
    padding: 14px 16px;
    border: 1px solid var(--dm-border-2);
    border-radius: 8px;
    background: var(--dm-bg-container);
    &.checked {
      border-color: var(--dm-primary-border);
    }
  }

  .lptam-tool-info {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;

    span {
      overflow: hidden;
      color: var(--dm-text-3);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .lptam-tool-select {
    width: 100%;
  }
}
</style>
