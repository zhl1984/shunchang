<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AnnotationDesigner } from "@/api/development-config";

const { t } = useI18n();
const props = withDefaults(
  defineProps<{ designers: AnnotationDesigner[]; loading?: boolean }>(),
  { loading: false },
);

/** 将接口的逗号分隔格式转换为卡片标签，并过滤空白配置。 */
function splitFormats(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 支持工具最多展示两个，其余工具合并为数量提示，避免卡片内容横向溢出。 */
function visibleTools(
  tools: AnnotationDesigner["tools"],
): AnnotationDesigner["tools"] {
  return tools.slice(0, 2);
}

/** 返回超出展示上限的工具数量，未超出时不显示更多提示。 */
function hiddenToolCount(tools: AnnotationDesigner["tools"]): number {
  return Math.max(tools.length - 2, 0);
}
</script>

<template>
  <section class="designer-panel" aria-labelledby="designer-panel-title">
    <!-- 区域标题明确当前设计器只允许查看。 -->
    <div class="designer-panel__heading">
      <h2 id="designer-panel-title">
        {{ t("developmentConfig.designer.title") }}
      </h2>
      <span class="designer-panel__readonly">
        {{ t("developmentConfig.designer.readonly") }}
      </span>
    </div>

    <a-spin :spinning="props.loading">
      <div v-if="props.designers.length" class="designer-panel__grid">
        <article
          v-for="designer in props.designers"
          :key="designer.designerId"
          class="designer-card"
        >
          <!-- 卡片上半区展示设计器定位和平台归属。 -->
          <div class="designer-card__header">
            <div class="designer-card__copy">
              <h3>{{ designer.designerName }}</h3>
              <p>{{ designer.designerDesc }}</p>
            </div>
            <span class="designer-card__preset">
              {{ t("developmentConfig.designer.platformPreset") }}
            </span>
          </div>

          <!-- 三列能力信息与原型顺序一致，标签颜色区分类别。 -->
          <dl class="designer-card__details">
            <div>
              <dt>
                {{ t("developmentConfig.designer.fields.supportedTools") }}
              </dt>
              <dd>
                <span
                  v-for="tool in visibleTools(designer.tools)"
                  :key="tool.toolId"
                  class="designer-tag designer-tag--blue"
                >
                  {{ tool.toolName }}
                </span>
                <span
                  v-if="hiddenToolCount(designer.tools) > 0"
                  class="designer-tag designer-tag--blue"
                >
                  {{
                    t("developmentConfig.designer.items.ct.moreTools", {
                      count: hiddenToolCount(designer.tools),
                    })
                  }}
                </span>
              </dd>
            </div>
            <div>
              <dt>{{ t("developmentConfig.designer.fields.inputFormat") }}</dt>
              <dd>
                <span
                  v-for="format in splitFormats(designer.inputFormats)"
                  :key="format"
                  class="designer-tag designer-tag--neutral"
                >
                  {{ format }}
                </span>
              </dd>
            </div>
            <div>
              <dt>
                {{ t("developmentConfig.designer.fields.deliveryFormat") }}
              </dt>
              <dd>
                <span
                  v-for="format in splitFormats(designer.outputFormats)"
                  :key="format"
                  class="designer-tag designer-tag--green"
                >
                  {{ format }}
                </span>
              </dd>
            </div>
          </dl>
        </article>
      </div>
      <a-empty
        v-else-if="!props.loading"
        :description="t('developmentConfig.designer.empty')"
      />
    </a-spin>
  </section>
</template>

<style scoped lang="less">
/* 标题与卡片之间保留紧凑的信息层级。 */
.designer-panel {
  display: grid;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
}

.designer-panel :deep(.ant-spin-nested-loading),
.designer-panel :deep(.ant-spin-container) {
  min-width: 0;
  max-width: 100%;
}

.designer-panel__heading {
  display: flex;
  gap: 10px;
  align-items: center;
}

.designer-panel__heading h2 {
  margin: 0;
  font-size: 0.16rem;
  line-height: 1.5;
}

.designer-panel__readonly,
.designer-card__preset {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 9px;
  border: 1px solid var(--dm-border-2);
  border-radius: 12px;
  background: var(--dm-bg-container);
  color: var(--dm-text-2);
  font-size: 0.12rem;
  white-space: nowrap;
}

/* 桌面端固定两列，确保两张设计器卡片等宽。 */
.designer-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(680px, 1fr));
  gap: 16px;
  width: 100%;
  min-width: 0;
  align-items: start;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
}

.designer-card {
  min-width: 0;
  box-sizing: border-box;
  padding: 20px;
  border: 1px solid var(--dm-border-2);
  border-radius: 0.08rem;
  background: var(--dm-bg-container);
  box-shadow: 0 1px 4px rgb(15 23 42 / 3%);
}

.designer-card__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.designer-card__copy {
  min-width: 0;
}

.designer-card h3 {
  margin: 0;
  font-size: 0.16rem;
  line-height: 1.5;
}

.designer-card p {
  margin: 8px 0 0;
  color: var(--dm-text-3);
  line-height: 1.5;
}

/* 能力字段使用三等分网格，标签内容可在列内换行。 */
.designer-card__details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 18px 0 0;
}

.designer-card__details dt {
  margin-bottom: 7px;
  color: var(--dm-text-3);
  font-size: 0.12rem;
}

.designer-card__details dd {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  min-width: 0;
  margin: 0;
}

.designer-tag {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 1px 9px;
  border-radius: 11px;
  font-size: 0.12rem;
  line-height: 18px;
  white-space: nowrap;
}

/* 标签色使用主题变量，兼容深浅主题。 */
.designer-tag--blue {
  background: var(--dm-info-bg);
  color: var(--dm-link);
}

.designer-tag--green {
  background: var(--dm-success-bg);
  color: var(--dm-success);
}

.designer-tag--neutral {
  background: var(--dm-border-2);
  color: var(--dm-text-2);
}

/* 中等宽度先压缩卡片内部字段，避免标签溢出。 */

/* 移动端切换为单列卡片，保持内容可读。 */
</style>
