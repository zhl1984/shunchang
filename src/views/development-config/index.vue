<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import {
  createAnnotationTypeApi,
  getAnnotationDesignerListApi,
  updateAnnotationTypeApi,
  type AnnotationDesigner,
} from "@/api/development-config";
import AnnotationDesignerPanel from "./components/AnnotationDesignerPanel.vue";
import AnnotationTypeTable from "./components/AnnotationTypeTable.vue";
import CreateAnnotationTypeModal from "./components/CreateAnnotationTypeModal.vue";
import type {
  CreateAnnotationTypeForm,
  EditableAnnotationType,
} from "./components/CreateAnnotationTypeModal.vue";
import { useAnnotationTypeStore } from "@/stores/annotation-type";

const { t } = useI18n();
const createAnnotationTypeModalOpen = ref(false);
const editAnnotationTypeModalOpen = ref(false);
const editingAnnotationType = ref<EditableAnnotationType | null>(null);
const designers = ref<AnnotationDesigner[]>([]);
const designersLoading = ref(false);
const annotationTypeStore = useAnnotationTypeStore();
const submitting = ref(false);

/** 加载启用的标注设计器，供只读卡片和标注类型表单共同使用。 */
async function loadDesigners(): Promise<void> {
  designersLoading.value = true;
  try {
    const result = await getAnnotationDesignerListApi({ status: "ENABLED" });
    designers.value = Array.isArray(result) ? result : [];
  } catch {
    // 设计器接口失败时保留页面骨架，避免请求异常阻断整页渲染。
    designers.value = [];
  } finally {
    designersLoading.value = false;
  }
}
onMounted(loadDesigners);

/** 将新建表单转换为接口参数，成功后刷新列表并提示结果。 */
async function handleCreateAnnotationType(
  form: CreateAnnotationTypeForm,
): Promise<void> {
  submitting.value = true;
  try {
    await createAnnotationTypeApi({
      annotationTypeName: form.name,
      annotationTypeDesc: form.description || undefined,
      designerId: form.designer,
      dataFormat: form.dataType,
    });
    message.success(t("developmentConfig.annotationType.feedback.created"));
    createAnnotationTypeModalOpen.value = false;
    await annotationTypeStore.refresh();
  } catch (error: unknown) {
    message.error(
      error instanceof Error && error.message
        ? error.message
        : t("developmentConfig.annotationType.feedback.operationFailed"),
    );
  } finally {
    submitting.value = false;
  }
}

/** 接收列表当前记录并打开编辑弹窗，保留接口记录 ID 供更新使用。 */
function handleOpenEditAnnotationType(record: EditableAnnotationType): void {
  editingAnnotationType.value = record;
  editAnnotationTypeModalOpen.value = true;
}

/** 将编辑表单提交到接口，成功后关闭弹窗并刷新列表。 */
async function handleEditAnnotationType(
  form: CreateAnnotationTypeForm,
): Promise<void> {
  if (!editingAnnotationType.value) return;
  submitting.value = true;
  try {
    await updateAnnotationTypeApi(editingAnnotationType.value.key, {
      annotationTypeName: form.name,
      annotationTypeDesc: form.description,
      designerId: form.designer,
      dataFormat: form.dataType,
    });
    message.success(t("developmentConfig.annotationType.feedback.updated"));
    editAnnotationTypeModalOpen.value = false;
    editingAnnotationType.value = null;
    await annotationTypeStore.refresh();
  } catch (error: unknown) {
    message.error(
      error instanceof Error && error.message
        ? error.message
        : t("developmentConfig.annotationType.feedback.operationFailed"),
    );
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="development-config-page">
    <!-- 页面头部只说明开发配置的用途，业务区域在后续需求中实现。 -->
    <AnnotationDesignerPanel
      :designers="designers"
      :loading="designersLoading"
    />
    <AnnotationTypeTable
      @create="createAnnotationTypeModalOpen = true"
      @edit="handleOpenEditAnnotationType"
    />
    <CreateAnnotationTypeModal
      v-model:open="createAnnotationTypeModalOpen"
      :designers="designers"
      :submitting="submitting"
      @submit="handleCreateAnnotationType"
    />
    <CreateAnnotationTypeModal
      v-model:open="editAnnotationTypeModalOpen"
      :record="editingAnnotationType"
      :designers="designers"
      :submitting="submitting"
      @submit="handleEditAnnotationType"
    />
  </div>
</template>

<style scoped lang="less">
/* 页面容器沿用配置中心页面的主题文字色。 */
.development-config-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 18px;
  height: calc(100vh - 88px);
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  color: var(--dm-text);
}

/* 头部卡片与成员管理、模型配置页面保持相同尺寸和视觉层级。 */
.development-config-hero {
  border-radius: 0.12rem;
  background: var(--dm-bg-container);
  box-shadow: 0 1px 4px rgb(15 23 42 / 3%);
}

.development-config-hero :deep(.ant-card-body) {
  display: flex;
  justify-content: center;
  flex-direction: column;
  height: 142px;
  padding: 24px 26px;
}

/* Ant Design 的清除浮动伪元素会干扰纵向布局，页面无需保留。 */
.development-config-hero :deep(.ant-card-body)::before,
.development-config-hero :deep(.ant-card-body)::after {
  display: none;
}

.development-config-hero__eyebrow {
  color: var(--dm-link);
  font-weight: 600;
}

.development-config-hero h1 {
  margin: 8px 0 0;
  font-size: 0.28rem;
  line-height: 1.2;
}

.development-config-hero p {
  margin: 10px 0 0;
  color: var(--dm-text-2);
}

/* 窄屏取消固定高度，让长说明文字自然换行。 */
@media (max-width: 720px) {
  .development-config-hero :deep(.ant-card-body) {
    height: auto;
    min-height: 142px;
  }
}
</style>
