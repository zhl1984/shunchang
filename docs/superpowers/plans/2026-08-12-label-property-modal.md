# Label Property Modal Implementation Plan

> **For agentic workers:** Implement inline with test-driven development. Git commits remain controlled by the user.

**Goal:** Add a create/edit label property modal with type-specific fields and a fixed-height internally scrolling enum editor.

**Architecture:** Keep form-state conversion and submission normalization in a page-local TypeScript module. Keep Ant Design Vue rendering and API orchestration in `LabelPropertyModal.vue`, then let `LabelDetailPanel.vue` own modal visibility and refresh its property list after saves.

**Tech Stack:** Vue 3, TypeScript, Ant Design Vue, Vitest, vue-i18n.

## Global Constraints

- Only property code is required; name and description are optional.
- Changing value type clears the previous default value and all type-specific fields.
- The modal body must not scroll; only the bounded enum-options region may scroll.
- Number inputs accept numeric values; enum empty rows are normalized by the existing API.
- Readonly, required, and enum multiple flags use Ant Design Vue switches.
- Do not stage or commit changes.

---

### Task 1: Property form behavior

**Files:**

- Create: `src/views/label-management/components/label-property-modal.ts`
- Test: `src/views/label-management/components/label-property-modal.test.ts`

- [ ] Write failing tests for initial values, edit hydration, type reset, enum rows, and API payloads.
- [ ] Run the focused test and confirm failure because the helper module is missing.
- [ ] Implement the minimal typed helpers.
- [ ] Run the focused test and confirm it passes.

### Task 2: Property modal and detail integration

**Files:**

- Create: `src/views/label-management/components/LabelPropertyModal.vue`
- Modify: `src/views/label-management/components/LabelDetailPanel.vue`
- Modify: `src/locales/messages/zh-CN.ts`
- Modify: `src/views/label-management/requirements.md`

- [ ] Add a failing detail-panel test for create/edit modal state and save refresh.
- [ ] Implement the modal, dynamic controls, fixed enum region, and API calls.
- [ ] Wire detail buttons to create/edit modes and refresh after save.
- [ ] Run focused tests, type-check, ESLint, and Prettier checks.
