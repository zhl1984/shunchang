import type { Component } from "vue";

export type SceneStatus = "available" | "coming-soon";

export type CapabilityIconKey =
  | "fusion"
  | "cube"
  | "timeline"
  | "vision"
  | "multimodal"
  | "instruction"
  | "alignment"
  | "agent"
  | "expert"
  | "collaboration"
  | "mining"
  | "benchmark";

export interface SceneDefinition {
  key: string;
  title: string;
  kicker: string;
  description: string;
  image: string;
  status: SceneStatus;
}

export interface CapabilityDefinition {
  key: string;
  title: string;
  description: string;
  icon: CapabilityIconKey;
}

export type CapabilityIconMap = Record<CapabilityIconKey, Component>;
