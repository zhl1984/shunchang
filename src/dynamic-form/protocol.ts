import type {
  DynamicFormContext,
  DynamicFormValidationErrors,
  DynamicFormValues,
} from "./types";

export const DYNAMIC_FORM_CHANNEL = "dynamic-form";
export const DYNAMIC_FORM_VERSION = 1;

export type DynamicFormEvent =
  | "READY"
  | "INIT"
  | "SET_CONTEXT"
  | "CHANGE"
  | "REQUEST_VALIDATE"
  | "VALIDATE_RESULT"
  | "RESIZE"
  | "ERROR";

export interface DynamicFormMessage<T = unknown> {
  channel: typeof DYNAMIC_FORM_CHANNEL;
  version: typeof DYNAMIC_FORM_VERSION;
  event: DynamicFormEvent;
  objectId?: string;
  revision?: number;
  payload?: T;
}

export type DynamicFormInitPayload = DynamicFormContext;

export interface DynamicFormChangePayload {
  name: string;
  value: unknown;
  values: DynamicFormValues;
}

export interface DynamicFormValidationPayload {
  valid: boolean;
  errors: DynamicFormValidationErrors;
}

export interface DynamicFormResizePayload {
  height: number;
}

export interface DynamicFormErrorPayload {
  message: string;
}

export function createDynamicFormMessage<T>(
  event: DynamicFormEvent,
  payload?: T,
  context?: Pick<DynamicFormContext, "objectId" | "revision">,
): DynamicFormMessage<T> {
  return {
    channel: DYNAMIC_FORM_CHANNEL,
    version: DYNAMIC_FORM_VERSION,
    event,
    objectId: context?.objectId,
    revision: context?.revision,
    payload,
  };
}

export function isDynamicFormMessage(
  value: unknown,
): value is DynamicFormMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<DynamicFormMessage>;
  return (
    message.channel === DYNAMIC_FORM_CHANNEL &&
    message.version === DYNAMIC_FORM_VERSION &&
    typeof message.event === "string"
  );
}
