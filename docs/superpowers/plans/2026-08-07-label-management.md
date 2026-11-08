# Label Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static `/label-management` page with a fixed minimum canvas, a top summary card, and two independently structured placeholder panels.

**Architecture:** Add a route-backed view at `src/views/label-management/index.vue`. Keep page orchestration and fixed overflow rules in the view, while `LabelTreePanel.vue` and `LabelDetailPanel.vue` own the left and right card skeletons respectively. No API, store, or interaction layer is introduced.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vue Router, Ant Design Vue, Less/CSS variables, existing layout and i18n conventions.

## Global Constraints

- Use `<script setup lang="ts">` and explicit types; do not use `any` or ignored checks.
- Keep user-visible copy in the existing locale system; use empty/placeholder content for business data.
- Use existing `main` layout and route metadata conventions.
- Do not add dependencies, API calls, Pinia state, or interactive behavior.
- Prevent page-level horizontal and vertical scrollbars; small viewports may clip the fixed canvas.
- Add concise purpose comments for new methods; avoid methods unless required by the static layout.

---

### Task 1: Document page requirements

**Files:**

- Create: `src/views/label-management/requirements.md`

**Interfaces:**

- Produces the page-local requirements reference required by repository conventions.

- [ ] **Step 1: Write the requirements document**

  Include feature goal, usage scenario, displayed regions, static interaction rules, fixed-canvas behavior, data/API dependency (none), and acceptance criteria. State that both lower panels are intentionally placeholders for later requirements.

- [ ] **Step 2: Review the document against the approved design**

  Confirm the route, three-region layout, no-interaction constraint, and no-scrollbar constraint are all explicit and consistent.

### Task 2: Add the route and locale keys

**Files:**

- Modify: `src/router/index.ts`
- Modify: `src/locales/messages/zh-CN.ts`

**Interfaces:**

- Produces a route named `labelManagement` at `/label-management` using `meta.layout: 'main'`.
- Produces only the minimal title/menu locale keys needed by the route and page shell.

- [ ] **Step 1: Add the route following the existing main-layout child route pattern**

  Lazy-load `@/views/label-management/index.vue`, give it a unique name, and set the same menu metadata shape used by `dataset-management`.

- [ ] **Step 2: Add locale entries for the page shell**

  Add keys for the page title and any structural labels that are visible in the static shell. Do not add sample tag or property business data.

- [ ] **Step 3: Run route tests and type-check**

  Run `yarn type-check` and the existing router test command if available. Expected result: no route typing or locale import errors.

### Task 3: Build the left static label-tree panel

**Files:**

- Create: `src/views/label-management/components/LabelTreePanel.vue`

**Interfaces:**

- Consumes no props and emits no events in this static phase.
- Produces a fixed-height card skeleton with header controls, search-field appearance, and non-interactive empty tree rows.

- [ ] **Step 1: Implement the card structure with typed `<script setup lang="ts">`**

  Keep script logic empty unless a typed constant is needed for repeated placeholder rows. Render Ant Design Vue buttons and input in disabled/presentation-only form so no handler is attached.

- [ ] **Step 2: Add scoped styles using existing spacing/display utilities and CSS variables**

  Match the screenshot’s bordered white card, compact header, search row, and tree-row spacing while keeping overflow hidden inside the panel.

- [ ] **Step 3: Run formatting and lint for the component**

  Run the project formatter check and lint command. Expected result: the new component passes without rule suppression.

### Task 4: Build the right static detail panel

**Files:**

- Create: `src/views/label-management/components/LabelDetailPanel.vue`

**Interfaces:**

- Consumes no props and emits no events in this static phase.
- Produces a fixed-height detail card skeleton with header/tool positions, section heading, and repeated empty property cards.

- [ ] **Step 1: Implement the static detail card structure**

  Render only layout placeholders for title, tag badge, tool button, section heading, and property cards. Do not attach click handlers or draw concrete property names/values.

- [ ] **Step 2: Add scoped styles and clipped overflow**

  Reuse project tokens/utilities, preserve the two-column card proportions, and ensure the panel itself does not create a scrollbar.

- [ ] **Step 3: Run formatting and lint for the component**

  Run the project formatter check and lint command. Expected result: the component passes with no disabled rules.

### Task 5: Compose the page and verify the fixed canvas

**Files:**

- Create: `src/views/label-management/index.vue`
- Modify: any page-local style file only if the existing project convention requires a separate style entry.

**Interfaces:**

- Consumes `LabelTreePanel` and `LabelDetailPanel`.
- Produces the complete route-rendered page with top summary card and fixed, clipped canvas.

- [ ] **Step 1: Compose the three regions**

  Import both child panels with `@/` aliases. Keep the page component responsible only for layout composition and the approved empty shell labels.

- [ ] **Step 2: Implement fixed minimum dimensions and overflow policy**

  Set the page canvas min-width/min-height to the desktop design baseline, use `overflow: hidden` at the page shell, and avoid nested scroll containers. Ensure the main layout’s content area does not reintroduce scrolling for this route.

- [ ] **Step 3: Run the full verification commands**

  Run `yarn format:check`, `yarn lint`, `yarn type-check`, and `yarn build`. Expected result: all commands pass; if an existing command is unavailable, report that explicitly.

- [ ] **Step 4: Perform a manual route smoke check**

  Start the existing dev server, open `/label-management`, and verify the three regions render, the lower panels are independent components, no controls respond, and no page scrollbar appears at the target desktop viewport.
