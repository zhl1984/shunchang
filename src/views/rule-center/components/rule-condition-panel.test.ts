import { describe, expect, it } from "vitest";
import {
  createConditionGroupFromRule,
  createConditionValueModel,
  createConditionGroup,
  isConditionGroupValid,
  resetConditionItem,
} from "./rule-condition-panel";
import type { LabelAttribute } from "@/api/label";

describe("rule condition panel helpers", () => {
  it("initializes one empty item with equals operator", () => {
    expect(createConditionGroup()).toEqual({
      logic: "AND",
      conditions: [
        {
          labelAttributeId: undefined,
          operator: "EQUALS",
          valueModel: undefined,
        },
      ],
    });
  });

  it("creates a discriminated value model when an attribute changes", () => {
    expect(resetConditionItem(2, "NUMBER")).toEqual({
      labelAttributeId: 2,
      operator: "EQUALS",
      valueModel: { kind: "number", value: undefined },
    });
    expect(createConditionValueModel("BOOLEAN")).toEqual({
      kind: "boolean",
      value: undefined,
    });
  });

  it("requires at least one complete item and accepts zero or false", () => {
    expect(isConditionGroupValid({ logic: "AND", conditions: [] })).toBe(false);
    expect(
      isConditionGroupValid({
        logic: "AND",
        conditions: [
          {
            labelAttributeId: 1,
            operator: "EQUALS",
            valueModel: { kind: "number", value: 0 },
          },
        ],
      }),
    ).toBe(true);
    expect(
      isConditionGroupValid({
        logic: "AND",
        conditions: [
          {
            labelAttributeId: 1,
            operator: "EQUALS",
            valueModel: { kind: "boolean", value: "false" },
          },
        ],
      }),
    ).toBe(true);
    expect(
      isConditionGroupValid({
        logic: "AND",
        conditions: [
          {
            labelAttributeId: 1,
            operator: "IN",
            valueModel: { kind: "enum", value: [] },
          },
        ],
      }),
    ).toBe(false);
  });

  it("converts API conditions into discriminated UI value models", () => {
    const properties: LabelAttribute[] = [
      {
        id: 1,
        attributeName: "数量",
        config: {
          valueType: "NUMBER",
          defaultValue: null,
          readOnly: false,
          required: false,
          constraint: {},
        },
        sortOrder: 1,
        toolBindings: [],
      },
      {
        id: 2,
        attributeName: "是否可见",
        config: {
          valueType: "BOOLEAN",
          defaultValue: null,
          readOnly: false,
          required: false,
          constraint: {},
        },
        sortOrder: 2,
        toolBindings: [],
      },
      {
        id: 3,
        attributeName: "等级",
        config: {
          valueType: "ENUM",
          defaultValue: null,
          readOnly: false,
          required: false,
          constraint: { options: ["A", "B"] },
        },
        sortOrder: 3,
        toolBindings: [],
      },
    ];

    expect(
      createConditionGroupFromRule(
        {
          logic: "OR",
          conditions: [
            { labelAttributeId: 1, operator: "EQUALS", value: 0 },
            { labelAttributeId: 2, operator: "IN", value: [true, false] },
            { labelAttributeId: 3, operator: "IN", value: ["A", "B"] },
          ],
        },
        properties,
      ),
    ).toEqual({
      logic: "OR",
      conditions: [
        {
          labelAttributeId: 1,
          operator: "EQUALS",
          valueModel: { kind: "number", value: 0 },
        },
        {
          labelAttributeId: 2,
          operator: "IN",
          valueModel: { kind: "boolean", value: ["true", "false"] },
        },
        {
          labelAttributeId: 3,
          operator: "IN",
          valueModel: { kind: "enum", value: ["A", "B"] },
        },
      ],
    });
  });
});
