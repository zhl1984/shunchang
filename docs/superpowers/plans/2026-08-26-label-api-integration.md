# Label API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the label API mock implementation with typed HTTP integrations matching `src/api/label.md`.

**Architecture:** Use the backend request and response fields from `src/api/label.md` throughout the label module without maintaining a second renamed frontend model. API methods unwrap the common response, reject non-zero business codes, guard missing success data, and return the documented data structures directly.

**Tech Stack:** Vue 3, TypeScript, Axios, Vitest, Yarn.

## Global Constraints

- Interface field requiredness and primitive types follow `src/api/label.md`.
- No mock data or mutable in-memory API state remains in `src/api/label.ts`.
- IDs exposed by the label API are numbers.
- No new dependency and no Git commit.

---

### Task 1: Document and test the real API contract

- [ ] Replace mock-oriented requirements with the documented HTTP contracts.
- [ ] Replace in-memory mock tests with HTTP adapter tests.
- [ ] Run the API tests and verify they fail because the mock implementation does not issue the documented requests.

### Task 2: Implement documented label APIs

- [ ] Define backend DTOs matching required and optional fields in `label.md`.
- [ ] Define documented request and response types with numeric IDs.
- [ ] Add typed response validation without renaming or flattening fields.
- [ ] Replace all mock functions with HTTP requests.
- [ ] Run API tests and verify they pass.

### Task 3: Adapt consumers and verify the project

- [ ] Update the store to consume the unwrapped tree list.
- [ ] Update form-to-API conversion and CRUD call signatures.
- [ ] Run focused tests, type checking, linting, formatting checks, and build verification.
