<template>
  <div ref="rootRef" class="legacy-date-picker">
    <div
      class="legacy-date-picker__input"
      :class="{ 'legacy-date-picker__input--disabled': disabled }"
      @click="handleToggle"
    >
      <span>{{ displayValue || "Select date" }}</span>
      <span class="legacy-date-picker__icon">▣</span>
    </div>

    <div v-if="open" class="legacy-date-picker__popup">
      <div class="legacy-date-picker__value">{{ displayValue }}</div>
      <template v-if="panel === 'time'">
        <div class="legacy-date-picker__date-title">{{ dateTitle }}</div>
        <div class="legacy-date-picker__time-grid">
          <div
            v-for="(items, index) in timeColumns"
            :key="index"
            class="legacy-date-picker__time-column"
          >
            <button
              v-for="item in items"
              :key="item"
              type="button"
              :class="{ selected: item === selectedTime[index] }"
              @click="handleTimeSelect(index, item)"
            >
              {{ item }}
            </button>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="legacy-date-picker__calendar-head">
          <button type="button" @click="changeMonth(-1)">‹</button>
          <strong>{{ calendarDate.format("MMM YYYY") }}</strong>
          <button type="button" @click="changeMonth(1)">›</button>
        </div>
        <div class="legacy-date-picker__weekdays">
          <span v-for="day in weekdays" :key="day">{{ day }}</span>
        </div>
        <div class="legacy-date-picker__calendar-grid">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            type="button"
            :class="{ muted: !day.currentMonth, selected: day.selected }"
            @click="handleDateSelect(day.value)"
          >
            {{ day.value.date() }}
          </button>
        </div>
      </template>
      <div class="legacy-date-picker__footer">
        <button type="button" class="link" @click="handleNow">Now</button>
        <button
          type="button"
          class="link"
          @click="panel = panel === 'time' ? 'date' : 'time'"
        >
          {{ panel === "time" ? "选择日期" : "选择时间" }}
        </button>
        <button
          type="button"
          class="confirm"
          @mousedown.stop
          @click.stop.prevent="handleConfirm"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs, { type Dayjs } from "dayjs";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{ value?: string; disabled?: boolean }>();
const emit = defineEmits<{
  (event: "change", value: string): void;
  (event: "open-change", open: boolean): void;
}>();
const rootRef = ref<HTMLElement>();
const open = ref(false);
const panel = ref<"time" | "date">("time");
const selected = ref<Dayjs>(parseValue(props.value));
const calendarDate = ref(selected.value.startOf("month"));
const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const displayValue = computed(() =>
  selected.value.format("YYYY-MM-DD HH:mm:ss"),
);
const dateTitle = computed(() => selected.value.format("YYYY年 MMM D日"));
const selectedTime = computed(() =>
  [selected.value.hour(), selected.value.minute(), selected.value.second()].map(
    formatPart,
  ),
);
const timeColumns = computed(() => [
  Array.from({ length: 24 }, (_, index) => formatPart(index)),
  Array.from({ length: 60 }, (_, index) => formatPart(index)),
  Array.from({ length: 60 }, (_, index) => formatPart(index)),
]);
const calendarDays = computed(() => {
  const start = calendarDate.value.startOf("month").startOf("week");
  return Array.from({ length: 42 }, (_, index) => {
    const value = start.add(index, "day");
    return {
      key: value.format("YYYY-MM-DD"),
      value,
      currentMonth: value.month() === calendarDate.value.month(),
      selected: value.isSame(selected.value, "day"),
    };
  });
});

watch(
  () => props.value,
  (value) => {
    selected.value = parseValue(value);
  },
);

function parseValue(value?: string) {
  const parsed = value ? dayjs(value) : dayjs();
  return parsed.isValid() ? parsed : dayjs();
}

function formatPart(value: number) {
  return String(value).padStart(2, "0");
}

function handleToggle() {
  if (props.disabled) return;
  open.value = !open.value;
  emit("open-change", open.value);
}

function handleTimeSelect(index: number, value: string) {
  const values = [
    selected.value.hour(),
    selected.value.minute(),
    selected.value.second(),
  ];
  values[index] = Number(value);
  selected.value = selected.value
    .hour(values[0])
    .minute(values[1])
    .second(values[2]);
}

function handleDateSelect(value: Dayjs) {
  selected.value = value
    .hour(selected.value.hour())
    .minute(selected.value.minute())
    .second(selected.value.second());
}
function changeMonth(offset: number) {
  calendarDate.value = calendarDate.value.add(offset, "month");
}
function handleNow() {
  selected.value = dayjs();
  calendarDate.value = selected.value.startOf("month");
}
function handleConfirm() {
  open.value = false;
  emit("open-change", false);
  emit("change", selected.value.format("YYYY-MM-DD HH:mm:ss"));
}

/** 点击控件外部关闭浮层，组件销毁时移除全局监听。 */
function handleDocumentClick(event: MouseEvent) {
  if (
    rootRef.value &&
    !rootRef.value.contains(event.target as Node) &&
    open.value
  ) {
    open.value = false;
    emit("open-change", false);
  }
}

onMounted(() => document.addEventListener("mousedown", handleDocumentClick));
onBeforeUnmount(() =>
  document.removeEventListener("mousedown", handleDocumentClick),
);
</script>

<style scoped lang="less">
.legacy-date-picker {
  position: relative;
  width: 100%;
  color: var(--dm-text);
  font-size: 14px;
}
.legacy-date-picker__input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--dm-border);
  border-radius: 6px;
  background: var(--dm-bg-container);
  cursor: pointer;
}
.legacy-date-picker__input--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.legacy-date-picker__icon {
  color: var(--dm-text-3);
  font-size: 12px;
}
.legacy-date-picker__popup {
  position: absolute;
  z-index: 1000;
  top: 38px;
  left: 0;
  width: min(330px, calc(100vw - 8px));
  overflow: hidden;
  border: 1px solid var(--dm-border);
  border-radius: 3px;
  background: var(--dm-bg-elevated);
  box-shadow: 0 4px 12px rgb(0 0 0 / 45%);
}
.legacy-date-picker__value,
.legacy-date-picker__date-title {
  padding: 8px 12px;
  text-align: center;
  border-bottom: 1px solid var(--dm-border-2);
  font-weight: 600;
}
.legacy-date-picker__value {
  text-align: left;
  font-weight: 400;
}
.legacy-date-picker__time-grid {
  display: flex;
  max-height: 240px;
  overflow: hidden;
}
.legacy-date-picker__time-column {
  flex: 1;
  overflow-y: auto;
  border-right: 1px solid var(--dm-border-2);
}
.legacy-date-picker__time-column:last-child {
  border-right: 0;
}
.legacy-date-picker__time-column button,
.legacy-date-picker__calendar-grid button {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--dm-text);
  cursor: pointer;
}
.legacy-date-picker__time-column button {
  height: 28px;
  font-size: 14px;
}
.legacy-date-picker__time-column button:hover,
.legacy-date-picker__time-column button.selected {
  background: var(--dm-fill-2);
  color: var(--dm-text-bg);
}
.legacy-date-picker__calendar-head,
.legacy-date-picker__weekdays {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
}
.legacy-date-picker__calendar-head button {
  border: 0;
  background: transparent;
  color: var(--dm-text);
  font-size: 20px;
  cursor: pointer;
}
.legacy-date-picker__weekdays span {
  width: 14%;
  text-align: center;
  color: var(--dm-text-2);
}
.legacy-date-picker__calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 4px 10px 10px;
}
.legacy-date-picker__calendar-grid button {
  height: 28px;
  border-radius: 4px;
}
.legacy-date-picker__calendar-grid button:hover,
.legacy-date-picker__calendar-grid button.selected {
  background: var(--dm-primary);
  color: #fff;
}
.legacy-date-picker__calendar-grid button.muted {
  color: var(--dm-text-4);
}
.legacy-date-picker__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  padding: 0 10px;
  border-top: 1px solid var(--dm-border-2);
}
.legacy-date-picker__footer button {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
}
.legacy-date-picker__footer .link {
  color: var(--dm-link);
}
.legacy-date-picker__footer .confirm {
  padding: 4px 10px;
  border-radius: 3px;
  background: var(--dm-primary);
  color: #fff;
}
</style>
