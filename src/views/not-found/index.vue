<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

/** 返回浏览器上一页；没有可返回记录时进入首页。 */
function handleBack() {
  if (router.options.history.state.back) {
    router.back();
    return;
  }

  void router.push("/");
}

/** 返回平台首页。 */
function handleHome() {
  void router.push("/");
}
</script>

<template>
  <main class="not-found-page flex-center pd-24">
    <a-result status="404" title="404" :sub-title="$t('notFound.description')">
      <template #extra>
        <div class="flex-center gap-12 flex-wrap">
          <a-button @click="handleBack">
            {{ $t("notFound.back") }}
          </a-button>
          <a-button type="primary" @click="handleHome">
            {{ $t("notFound.home") }}
          </a-button>
        </div>
      </template>
    </a-result>
  </main>
</template>

<style scoped lang="less">
.not-found-page {
  min-height: 100vh;
}
</style>
