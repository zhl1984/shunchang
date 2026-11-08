<script setup lang="ts">
import { computed, ref } from "vue";
import { message } from "ant-design-vue";
import { ArrowRightOutlined, SearchOutlined } from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";
import type { CapabilityDefinition, CapabilityIconMap } from "../types";

const props = defineProps<{
  capabilities: readonly CapabilityDefinition[];
  icons: CapabilityIconMap;
}>();
const { t } = useI18n();
const query = ref("");
const searchOpen = ref(false);
const filteredCapabilities = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase("zh-CN");
  if (!keyword) return props.capabilities;
  return props.capabilities.filter((item) =>
    `${item.title}${item.description}`
      .toLocaleLowerCase("zh-CN")
      .includes(keyword),
  );
});

/** 显示专业能力入口提示。 */
function handleCapabilityEnter(capability: CapabilityDefinition): void {
  message.info(
    t("sceneDashboard.messages.capabilityEntered", { title: capability.title }),
  );
}
</script>

<template>
  <section
    class="capability-grid"
    :aria-label="t('sceneDashboard.capabilities.ariaLabel')"
  >
    <div class="capability-grid__toolbar">
      <div class="capability-grid__heading">
        <h2 class="capability-grid__title">
          {{ t("sceneDashboard.capabilities.title") }}
        </h2>
        <span class="capability-grid__subtitle">
          {{ t("sceneDashboard.capabilities.subtitle") }}
        </span>
      </div>
      <div
        class="capability-grid__search"
        :class="{ 'capability-grid__search--open': searchOpen }"
        @mouseenter="searchOpen = true"
        @mouseleave="searchOpen = false"
      >
        <a-input
          v-model:value="query"
          class="capability-grid__input"
          allow-clear
          :placeholder="t('sceneDashboard.capabilities.searchPlaceholder')"
          :aria-label="t('sceneDashboard.capabilities.searchPlaceholder')"
        />
        <a-button
          class="capability-grid__search-button"
          type="text"
          :aria-label="t('sceneDashboard.capabilities.searchLabel')"
          @focus="searchOpen = true"
          @blur="searchOpen = false"
        >
          <SearchOutlined />
        </a-button>
      </div>
    </div>
    <div v-if="filteredCapabilities.length" class="capability-grid__items">
      <a-card
        v-for="capability in filteredCapabilities"
        :key="capability.key"
        class="capability-grid__card"
      >
        <span class="capability-grid__icon">
          <component :is="icons[capability.icon]" />
        </span>
        <h3 class="capability-grid__card-title">{{ capability.title }}</h3>
        <p class="capability-grid__card-description">
          {{ capability.description }}
        </p>
        <a-button
          class="capability-grid__card-action"
          type="link"
          @click="handleCapabilityEnter(capability)"
          >{{ t("sceneDashboard.actions.enterCapability") }}
          <ArrowRightOutlined class="capability-grid__card-action-icon" />
        </a-button>
      </a-card>
    </div>
    <a-empty
      v-else
      class="capability-grid__empty"
      :description="t('sceneDashboard.capabilities.empty')"
    />
  </section>
</template>

<style scoped>
.capability-grid {
  box-sizing: border-box;
  padding: 0 24px;
  margin: 42px auto 0;
  margin-top: 56px;
}
.capability-grid__toolbar {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}
.capability-grid__heading {
  display: flex;
  align-items: baseline;
  gap: 14px;
}
.capability-grid__title {
  font-size: 20px;
  line-height: 32px;
  font-weight: 600;
  margin: 0;
  color: #182944;
}
.capability-grid__subtitle {
  color: #8490a3;
  font-size: 12px;
  font-weight: 400;
}
.capability-grid__search {
  position: relative;
  display: flex;
  align-items: center;
  width: 36px;
  overflow: hidden;
  transition: width 0.24s ease;
}
.capability-grid__search--open {
  width: 280px;
}
.capability-grid__input {
  width: 100%;
  padding-right: 36px;
  opacity: 0;
  transition: opacity 0.24s ease;
}
.capability-grid__search--open .capability-grid__input {
  opacity: 1;
}
.capability-grid__search-button {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  width: 36px;
  height: 32px;
  padding: 0;
  background-color: transparent !important;
}
.capability-grid__items {
  display: grid;
  grid-template-columns: repeat(4, 282px);
  gap: 24px;
}
.capability-grid__icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  color: #066bff;
  background: #eaf3ff;
  border-radius: 5px;
  font-size: 19px;
  transition: 0.18s;
}
.capability-grid__card {
  width: 282px;
  height: 296px;
  border: 0;
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(27, 49, 77, 0.035);
  transition: background-color 0.18s ease;
}
.capability-grid__card-title {
  margin: 32px 0 16px;
  color: #20334f;
  font-size: 16px;
  transition: 0.18s;
  font-weight: 600;
}
.capability-grid__card-description {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: #69778c;
  font-size: 12px;
  line-height: 20px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  transition: 0.18s;
  font-weight: 400;
}
.capability-grid__card-action {
  align-self: flex-start;
  height: auto;
  margin-top: 48px;
  padding: 0;
  font-weight: 500;
  font-size: 12px;
}
.capability-grid__card-action-icon {
  margin-left: 6px;
  color: inherit;
  font-size: 12px;
}
.capability-grid__card:hover,
.capability-grid__card:focus-within {
  background: #066bff;
  box-shadow: none;
  .capability-grid__icon {
    color: #fff;
    background: rgba(255, 255, 255, 0.16);
  }
  .capability-grid__card-title {
    color: #fff;
  }
  .capability-grid__card-description {
    color: rgba(255, 255, 255, 0.82);
  }
  .capability-grid__card-action {
    color: #fff !important;
  }
}
</style>
