<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";

import { PlusOutlined } from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import { useI18n } from "vue-i18n";

import {
  getLabelPropertyListApi,
  deleteLabelPropertyApi,
  type LabelAttribute,
  type LabelAttributeValueType,
  type LabelDetail,
} from "@/api/label";
import { useLabelStore } from "@/stores/label";

import LabelPropertyToolAssociationModal from "./LabelPropertyToolAssociationModal.vue";
import LabelPropertyModal from "./LabelPropertyModal.vue";
import type { LabelPropertyModalMode } from "./label-property-modal";

const props = defineProps<{
  nodeId: string | number | null;
}>();

const { t } = useI18n();
const labelStore = useLabelStore();

/**
 * 属性列表属于当前详情选择的临时状态，不进入全局 store。
 * shallowRef 避免 Vue 深层代理 API 返回的属性和枚举选项。
 * loading 只控制属性区域，不能遮挡标签自身的基础信息。
 */
const properties = shallowRef<LabelAttribute[]>([]);
const propertiesLoading = ref(false);
const propertyToolModalOpen = ref(false);
const propertyModalOpen = ref(false);
const propertyModalMode = ref<LabelPropertyModalMode>("create");
const editingProperty = ref<LabelAttribute>();
const toolProperty = ref<LabelAttribute>();
const deletingPropertyId = ref<number | null>(null);

/** 优先提取接口返回的业务错误文案，缺失时回退到模块提示。 */
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
// 每次有效选择变化都递增版本，异步请求只认领自己的版本。
let requestVersion = 0;

/**
 * 节点信息统一来自 label store 映射，页面只需要传递节点 ID。
 * 当 store 刷新替换 mapping 时，computed 会重新解析最新节点对象。
 */
const selectedNode = computed(() =>
  props.nodeId === null ? undefined : labelStore.mapping.get(props.nodeId),
);

/** 打开指定标签属性的工具关联弹窗，并记录本次配置目标。 */
function handleOpenPropertyTools(property: LabelAttribute): void {
  toolProperty.value = property;
  propertyToolModalOpen.value = true;
}

/** 打开新增属性弹窗，并清除上一次编辑目标。 */
function handleCreateProperty(): void {
  propertyModalMode.value = "create";
  editingProperty.value = undefined;
  propertyModalOpen.value = true;
}

/** 打开编辑属性弹窗并复制当前属性作为回填来源。 */
function handleEditProperty(property: LabelAttribute): void {
  propertyModalMode.value = "edit";
  editingProperty.value = property;
  propertyModalOpen.value = true;
}

/** 保存后直接使用接口返回详情中的属性列表，保持顺序与服务端一致。 */
function handlePropertySaved(detail: LabelDetail): void {
  properties.value = detail.attributes ?? [];
}

/** 保存工具关联后重新查询当前标签详情，确保展示以后端最新数据为准。 */
async function getLabelProperty(): Promise<void> {
  const node = selectedNode.value;
  const currentVersion = ++requestVersion;
  properties.value = [];

  // 分组、空选择和失效选择都没有属性，请求状态应立即结束。
  if (!node || node.nodeType !== "LABEL") {
    propertiesLoading.value = false;
    return;
  }
  propertiesLoading.value = true;
  try {
    const nextProperties = await getLabelPropertyListApi(node.id);

    if (currentVersion === requestVersion) {
      properties.value = nextProperties;
    }
  } catch {
    // 属性加载失败只回退属性空态，标签基础信息仍保持可见。
    if (currentVersion === requestVersion) {
      properties.value = [];
    }
  } finally {
    // 旧请求完成时不得关闭新请求的 loading 状态。
    if (currentVersion === requestVersion) {
      propertiesLoading.value = false;
    }
  }
}

/** 删除属性前展示确认框，确认后调用删除接口并移除当前卡片。 */
function handleDeleteProperty(property: LabelAttribute): void {
  if (deletingPropertyId.value !== null) return;

  Modal.confirm({
    title: t("labelManagement.property.delete.title"),
    content: t("labelManagement.property.delete.confirm", {
      name: property.attributeName,
    }),
    okText: t("labelManagement.property.delete.actions.confirm"),
    cancelText: t("labelManagement.property.delete.actions.cancel"),
    okButtonProps: { danger: true },
    async onOk() {
      deletingPropertyId.value = property.id;
      try {
        const labelId = selectedNode.value?.id;
        if (labelId === undefined) return;
        await deleteLabelPropertyApi(labelId, property.id);
        properties.value = properties.value.filter(
          (item) => item.id !== property.id,
        );
        message.success(t("labelManagement.property.delete.success"));
      } catch (error: unknown) {
        message.error(
          getErrorMessage(error, t("labelManagement.property.delete.error")),
        );
        throw error;
      } finally {
        deletingPropertyId.value = null;
      }
    },
  });
}

/** 将属性默认值格式化为适合详情卡片展示的文本。 */
function formatPropertyValue(property: LabelAttribute): string {
  const value = property.config.defaultValue;
  // null 和空字符串都表示业务上没有默认值，统一展示空值文案。
  if (value === null || value === undefined || value === "") {
    return t("labelManagement.detail.emptyValue");
  }

  const options = property.config.constraint.options ?? [];
  const getLabel = (item: unknown): string =>
    options.find((option) => option.value === item)?.label ?? String(item);
  return Array.isArray(value)
    ? value.map(getLabel).join("、")
    : getLabel(value);
}

/** 将枚举选项按展示文案合并，缺少 label 时回退到 value。 */
function formatPropertyOptions(property: LabelAttribute): string {
  const optionText = property.config.constraint.options
    ?.map((option) => option.label)
    .filter(Boolean)
    .join("、");

  return optionText || t("labelManagement.detail.emptyValue");
}

/** 格式化属性已关联的工具名称，未关联时展示空态文案。 */
function formatPropertyTools(property: LabelAttribute): string {
  const names = property.toolBindings
    ?.map((binding) => binding.toolName)
    .filter(Boolean)
    .join("、");
  return names || t("labelManagement.detail.emptyValue");
}

/** 获取属性类型对应的国际化文案。 */
function getPropertyTypeText(type: LabelAttributeValueType): string {
  return t(`labelManagement.detail.property.types.${type.toLowerCase()}`);
}

/** 枚举默认值为数组时视为多选，仅用于界面展示。 */
function isMultipleEnum(property: LabelAttribute): boolean {
  return Array.isArray(property.config.defaultValue);
}

/** 根据当前节点加载标签属性，并通过版本号阻止过期请求覆盖新选择。 */
watch(selectedNode, getLabelProperty, { immediate: true });

watch(selectedNode, (node) => {
  if (!node || node.nodeType !== "LABEL") {
    propertyToolModalOpen.value = false;
    toolProperty.value = undefined;
    propertyModalOpen.value = false;
  }
});
</script>

<template>
  <a-card :bordered="false" class="label-detail-panel">
    <!-- 空选择和失效 ID 共用同一空态，不暴露内部映射差异。 -->
    <a-empty
      v-if="!selectedNode"
      class="ldp-state"
      :description="t('labelManagement.detail.emptySelection')"
    />

    <template v-else>
      <!-- 分组与标签共用基础信息头部，标签额外展示编码和工具入口。 -->
      <div class="ldp-header items-center gap-16">
        <div class="ldp-heading">
          <h2 class="ldp-title font-lg" :title="selectedNode.nodeName">
            {{ selectedNode.nodeName }}
          </h2>
        </div>

        <div class="flex-1"></div>
      </div>

      <p class="ldp-description font-sm">
        {{
          selectedNode.nodeDescription || t("labelManagement.detail.emptyValue")
        }}
      </p>

      <template v-if="selectedNode.nodeType === 'LABEL'">
        <!-- 分组分支在此结束，确保其没有任何操作按钮和属性内容。 -->
        <!-- 属性操作按钮仅保留视觉入口，本阶段不绑定点击行为。 -->
        <div class="ldp-section-header flex-between gap-12">
          <h3 class="ldp-section-title font-base">
            {{ t("labelManagement.detail.actions.addProperty") }}
          </h3>
          <a-button class="ldp-add-button" @click="handleCreateProperty">
            <template #icon><PlusOutlined /></template>
            {{ t("labelManagement.detail.actions.addProperty") }}
          </a-button>
        </div>

        <div class="ldp-properties">
          <!-- 加载、空数据和属性卡片为互斥状态，避免布局叠加。 -->
          <a-spin v-if="propertiesLoading" class="ldp-state" :spinning="true" />
          <a-empty
            v-else-if="properties.length === 0"
            class="ldp-state"
            :description="t('labelManagement.detail.property.empty')"
          />

          <article
            v-for="property in properties"
            v-else
            :key="property.id"
            class="ldp-property-card"
          >
            <div class="ldp-property-header flex-between gap-12">
              <!-- 状态标签只在对应布尔字段启用时出现。 -->
              <div class="ldp-property-heading flex items-center gap-8">
                <h4
                  class="ldp-property-name font-base"
                  :title="property.attributeName"
                >
                  {{ property.attributeName || "-" }}
                </h4>
                <a-tag class="ldp-property-tag" color="default">{{
                  getPropertyTypeText(property.config.valueType)
                }}</a-tag>
                <a-tag
                  v-if="property.config.required"
                  class="ldp-property-tag error"
                  color="error"
                >
                  {{ t("labelManagement.detail.property.required") }}
                </a-tag>
                <a-tag
                  v-if="
                    property.config.valueType !== 'JSON' &&
                    property.config.readOnly
                  "
                  class="ldp-property-tag warning"
                  color="warning"
                >
                  {{ t("labelManagement.detail.property.readonly") }}
                </a-tag>
              </div>

              <div class="ldp-property-actions items-center gap-8">
                <a-button
                  class="ldp-property-action ldp-property-tool-action"
                  type="link"
                  size="small"
                  @click="handleOpenPropertyTools(property)"
                >
                  {{ t("labelManagement.detail.actions.tools") }}
                </a-button>
                <a-button
                  class="ldp-property-action"
                  type="link"
                  size="small"
                  @click="handleEditProperty(property)"
                >
                  {{ t("labelManagement.detail.actions.editProperty") }}
                </a-button>
                <a-button
                  class="ldp-property-action"
                  danger
                  :loading="deletingPropertyId === property.id"
                  type="link"
                  size="small"
                  @click="handleDeleteProperty(property)"
                >
                  {{ t("labelManagement.detail.actions.deleteProperty") }}
                </a-button>
              </div>
            </div>

            <p class="ldp-property-description font-sm">
              <!-- 空描述使用统一空值文案，避免卡片高度因字段缺失而跳变。 -->
              {{
                property.attributeDescription ||
                t("labelManagement.detail.emptyValue")
              }}
            </p>

            <div class="ldp-property-meta font-xs">
              <span>
                {{ t("labelManagement.detail.fields.tools") }}：{{
                  formatPropertyTools(property)
                }}
              </span>
              <!-- 类型专属字段遵循 API 规范化后的存在性展示。 -->
              <span v-if="property.config.valueType !== 'JSON'">
                {{ t("labelManagement.detail.fields.defaultValue") }}：{{
                  formatPropertyValue(property)
                }}
              </span>
              <span
                v-if="
                  property.config.valueType === 'NUMBER' &&
                  property.config.constraint.min !== undefined
                "
              >
                {{ t("labelManagement.detail.fields.min") }}：{{
                  property.config.constraint.min ?? "-"
                }}
              </span>
              <span
                v-if="
                  property.config.valueType === 'NUMBER' &&
                  property.config.constraint.max !== undefined
                "
              >
                {{ t("labelManagement.detail.fields.max") }}：{{
                  property.config.constraint.max ?? "-"
                }}
              </span>
              <span
                v-if="
                  property.config.valueType === 'NUMBER' &&
                  property.config.constraint.unit
                "
              >
                {{ t("labelManagement.detail.fields.unit") }}：{{
                  property.config.constraint.unit ?? "-"
                }}
              </span>
              <span v-if="property.config.valueType === 'ENUM'">
                {{ t("labelManagement.detail.fields.options") }}：{{
                  formatPropertyOptions(property)
                }}
              </span>
              <span v-if="property.config.valueType === 'ENUM'">
                {{
                  t(
                    isMultipleEnum(property)
                      ? "labelManagement.detail.property.multiple"
                      : "labelManagement.detail.property.single",
                  )
                }}
              </span>
            </div>
          </article>
        </div>
      </template>
    </template>

    <LabelPropertyToolAssociationModal
      v-if="selectedNode?.id && toolProperty && propertyToolModalOpen"
      v-model:open="propertyToolModalOpen"
      :property="toolProperty"
      :label-id="selectedNode?.id"
      @saved="getLabelProperty"
    />
    <LabelPropertyModal
      v-if="selectedNode?.nodeType === 'LABEL' && propertyModalOpen"
      v-model:open="propertyModalOpen"
      :label-id="selectedNode.id"
      :mode="propertyModalMode"
      :property="editingProperty"
      @saved="handlePropertySaved"
    />
  </a-card>
</template>

<style scoped lang="less">
.label-detail-panel {
  // 根卡片锁定可用高度，页面画布不产生额外滚动容器。
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--dm-border-2);
  background: var(--dm-bg-container);

  :deep(.ant-card-body) {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    padding: 20px;
    overflow: hidden;
  }

  .ldp-state {
    // 空态和加载态占满剩余空间并保持视觉居中。
    display: flex;
    min-height: 0;
    flex: 1;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    overflow: hidden;
  }

  .ldp-header {
    // 头部不参与剩余高度伸缩，属性区域承担主要空间分配。
    flex-shrink: 0;
    min-height: 40px;
  }

  .ldp-heading {
    min-width: 0;
  }

  .ldp-title,
  .ldp-section-title,
  .ldp-property-name {
    margin: 0;
    color: var(--dm-text);
    font-weight: 600;
  }

  .ldp-title,
  .ldp-property-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ldp-add-button,
  .ldp-property-action {
    flex-shrink: 0;
  }

  .ldp-description,
  .ldp-property-description {
    // 描述使用行数裁切，长业务文本不能撑高固定画布。
    display: -webkit-box;
    overflow: hidden;
    color: var(--dm-text-2);
    -webkit-box-orient: vertical;
  }

  .ldp-description {
    margin: 12px 0 0;
    -webkit-line-clamp: 2;
  }

  .ldp-section-header {
    // 属性标题与新增入口保持固定高度，不随卡片数量变化。
    flex-shrink: 0;
    margin-top: 24px;
  }

  .ldp-properties {
    // 属性过多时按需求裁切，不在本阶段引入内部滚动。
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    margin-top: 12px;
    overflow-y: auto;
  }

  .ldp-property-card {
    // 卡片禁止收缩，保证首屏可见属性的信息密度稳定。
    flex-shrink: 0;
    padding: 14px;
    overflow: hidden;
    border: 1px solid var(--dm-border-2);
    border-radius: 8px;
    background: var(--dm-bg-container);
  }

  .ldp-property-heading {
    min-width: 0;
    overflow: hidden;
  }

  .ldp-property-name {
    max-width: 180px;
  }

  .ldp-property-tag {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    margin: 0;
    border-radius: 10px;
    font-weight: 600;
    line-height: 16px;
    border-width: 0;
    color: var(--dm-muted);
    background-color: var(--dm-muted-bg);
    &.error {
      color: var(--dm-error);
      background-color: var(--dm-error-bg);
    }
    &.warning {
      color: var(--dm-warning);
      background-color: var(--dm-warning-bg);
    }
  }

  .ldp-property-actions {
    // 操作区固定在右侧，长属性名称只压缩标题区域。
    flex-shrink: 0;
  }

  .ldp-property-action {
    font-size: 0.13rem;
    padding: 0;
  }

  .ldp-property-description {
    margin: 8px 0 0;
    -webkit-line-clamp: 1;
  }

  .ldp-property-meta {
    // 元数据允许卡片内部换行，但由外层属性容器负责整体裁切。
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin-top: 10px;
    color: var(--dm-text-3);
  }
}
</style>
