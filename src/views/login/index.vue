<template>
  <main class="login-page">
    <div class="login-bg"></div>
    <div class="login-grid"></div>
    <div class="login-scan"></div>
    <div class="orb orb-primary"></div>
    <div class="orb orb-success"></div>
    <div class="top-line"></div>

    <section class="form-panel">
      <div class="card-brand">
        <img class="card-logo" :src="logoSrc" alt="" />
        <h1 class="card-title">{{ t("login.platformName") }}</h1>
        <p class="card-subtitle">
          {{ isAdmin ? t("login.adminSubtitle") : t("login.subtitle") }}
        </p>
      </div>
      <a-form
        class="login-form"
        :model="loginForm"
        layout="vertical"
        @finish="submit"
      >
        <a-form-item
          class="form-field"
          :label="t('login.accountLabel')"
          name="account"
        >
          <a-input
            v-model:value="loginForm.account"
            class="login-input"
            :maxlength="100"
            :placeholder="t('login.accountPlaceholder')"
          >
            <template #prefix>
              <MailOutlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item
          class="form-field"
          :label="t('login.passwordLabel')"
          name="password"
        >
          <a-input-password
            v-model:value="loginForm.password"
            class="login-input"
            :maxlength="32"
            :placeholder="t('login.passwordPlaceholder')"
          >
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>

        <div :class="['error-message', { 'is-visible': error }]">
          {{ error }}
        </div>

        <a-form-item class="submit-item">
          <a-button
            class="submit-button"
            type="primary"
            html-type="submit"
            block
            :loading="submitting"
          >
            <span class="button-shine"></span>
            <span>{{ t("login.submit") }}</span>
          </a-button>
        </a-form-item>
      </a-form>
    </section>
    <footer class="login-footer">
      <div>{{ t("login.copyright") }}</div>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { getPublicImageUrl } from "@/utils/common";

const logoSrc = getPublicImageUrl("logo/Logo512.png");
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import { loginApi } from "@/api/auth";
import { message } from "ant-design-vue";
import { useUserStore } from "@/stores/user";
import { LockOutlined, MailOutlined } from "@ant-design/icons-vue";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const userStore = useUserStore();
const isAdmin = route.name === "admin-login";

const loginForm = reactive({
  account: "",
  password: "",
});
const error = ref("");
const submitting = ref(false);

/** 从未知异常中提取适合登录页展示的错误信息。 */
function getLoginErrorMessage(err: unknown) {
  if (typeof err === "object" && err !== null) {
    const data = err as { msg?: string; message?: string };
    return data.msg || data.message || t("login.errors.default");
  }

  return t("login.errors.default");
}

/** 校验并返回安全的站内登录后跳转地址。 */
function getRedirectPath(value: unknown) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/";
}

/** 提交登录表单，保存用户会话并进入目标业务页面。 */
async function submit() {
  if (!loginForm.account.trim() || !loginForm.password.trim()) {
    error.value = t("login.validation.credentialsRequired");
    return;
  }

  error.value = "";
  submitting.value = true;

  try {
    await loginApi({
      loginName: loginForm.account.trim(),
      loginPassword: loginForm.password,
      platform: isAdmin ? 2 : 1,
    });

    message.success(t("login.feedback.success"));
    await router.replace(getRedirectPath(route.query.redirect));
  } catch (err) {
    userStore.clearSession();
    error.value = getLoginErrorMessage(err);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped lang="less">
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: #0f172a;
  background: #f8fafc;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;
}

.login-bg,
.login-grid,
.login-scan {
  position: absolute;
  inset: 0;
}

.login-bg {
  background:
    radial-gradient(circle at 18% 16%, rgb(37 99 235 / 22%), transparent 28%),
    radial-gradient(circle at 78% 18%, rgb(16 185 129 / 16%), transparent 24%),
    radial-gradient(circle at 50% 88%, rgb(139 92 246 / 14%), transparent 30%),
    linear-gradient(135deg, #f8fafc 0%, #eff6ff 48%, #f8fafc 100%);
}

.login-grid {
  opacity: 0.55;
  background-image:
    linear-gradient(rgb(96 165 250 / 12%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(96 165 250 / 12%) 1px, transparent 1px);
  background-size: 52px 52px;
  animation: grid-flow 18s linear infinite;
}

.login-scan {
  background: linear-gradient(
    115deg,
    transparent 0%,
    rgb(96 165 250 / 16%) 45%,
    transparent 60%
  );
  animation: login-scan 8s ease-in-out infinite;
}

.orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(64px);
}

.orb-primary {
  top: 12%;
  left: -12%;
  width: 288px;
  height: 288px;
  background: rgb(96 165 250 / 35%);
  animation: orb-float 9s ease-in-out infinite;
}

.orb-success {
  right: -10%;
  bottom: 10%;
  width: 320px;
  height: 320px;
  background: rgb(52 211 153 / 26%);
  animation: orb-float-delayed 11s ease-in-out infinite;
}

.top-line {
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(96 165 250 / 70%),
    transparent
  );
}

.form-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  width: 450px;
  // height: 480px;
  border-radius: 10px;
  background: rgb(255 255 255 / 82%);
  box-shadow: 0 18px 48px rgb(37 99 235 / 14%);
  backdrop-filter: blur(40px);
}

.login-footer {
  position: absolute;
  right: 0;
  bottom: 24px;
  left: 0;
  z-index: 20;
  font-size: 12px;
  color: #64748b;
  text-align: center;
}

.card-brand {
  margin-top: 38px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  // text-align: center;
}

.card-logo {
  width: 74px;
  height: 74px;
  display: block;
}

.card-title {
  margin-top: 18px;
  font-size: 28px;
  line-height: 1em;
  font-weight: 600;
}

.card-subtitle {
  margin-top: 10px;
  padding: 8px;
  color: var(--dm-text-3);
  font-size: 14px;
  line-height: 1em;
  font-weight: 400;
}

.login-form {
  padding: 30px 40px;
}

.login-form :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.login-form :deep(.ant-form-item-label) {
  display: none;
}

.login-form :deep(.ant-form-item-label > label) {
  height: auto;
  font-size: 13px;
  // font-weight: 500;
  color: #64748b;
}

.login-form :deep(.ant-form-item-label > label::after) {
  display: none;
}

.login-form :deep(.login-input.ant-input-affix-wrapper) {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 10px;
  font-size: 16px;
  background: rgb(255 255 255 / 72%);
  border: 1px solid #dbeafe;
  border-radius: 8px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.login-form :deep(.ant-input-prefix .anticon) {
  color: var(--dm-primary);
}

.login-form :deep(.ant-input-suffix .anticon) {
  font-size: 20px;
  color: var(--dm-primary);
}

.login-form :deep(.login-input .ant-input) {
  width: 100%;
  min-width: 0;
  font-size: 14px;
  color: #0f172a;
  background: transparent;
  border: 0;
  outline: 0;
}

.login-form :deep(.login-input .ant-input::placeholder) {
  color: #94a3b8;
}

.login-form :deep(.ant-input-password-icon:hover) {
  color: #2563eb;
}

.error-message {
  position: absolute;
  bottom: 100px;
  left: 42px;
  height: 18px;
  line-height: 18px;
  font-size: 12px;
  color: #ef4444;
  border-radius: 12px;
  visibility: hidden;
}

.error-message.is-visible {
  visibility: visible;
}

.submit-button {
  margin-top: 8px;
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  border-radius: 8px;
  box-shadow: 0 18px 42px rgb(37 99 235 / 32%);
}

.button-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(255 255 255 / 25%),
    transparent
  );
  transform: translateX(-100%);
  transition: transform 0.7s ease;
}

.submit-button:hover .button-shine {
  transform: translateX(100%);
}

.submit-button > span:not(.button-shine),
.submit-button .anticon {
  position: relative;
}

@keyframes grid-flow {
  from {
    transform: translate3d(0, 0, 0);
  }

  to {
    transform: translate3d(52px, 52px, 0);
  }
}

@keyframes login-scan {
  0% {
    opacity: 0;
    transform: translateX(-80%) skew(-12deg);
  }

  18% {
    opacity: 1;
  }

  50% {
    opacity: 0.65;
  }

  100% {
    opacity: 0;
    transform: translateX(90%) skew(-12deg);
  }
}

@keyframes orb-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  50% {
    transform: translate3d(34px, -26px, 0) scale(1.12);
  }
}

@keyframes orb-float-delayed {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  50% {
    transform: translate3d(-30px, 22px, 0) scale(1.08);
  }
}
</style>
