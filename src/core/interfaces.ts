import { Result } from "typescript-result";
import { TriggerFlowError } from "./errors/trigger-flow.errors";

export type SSEEventData = {
  fieldName: string;
  value: string;
  type: string;
  workflowId: string;
  sessionId: string;
  nodeId: string;
};

export type TriggerFlowParams = {
  projectUrl: string;
  publicKey: string;
  externalAccessToken: string | null;
  flowId: string;
  inputs: Record<string, string | number | boolean>;
};

export type SSEClientEventType = "complete" | "error" | "data";

export interface SSEEventDataMap {
  complete: { status: "success" | "error" };
  error: { message: string };
  data: {
    fieldName: string;
    value: string;
    type: "image" | "text" | "any";
    workflowId: string;
    nodeId: string;
  };
}

export interface Unsubscribe {
  (): void;
}

export interface SSEClient {
  generateTriggerId(): string;
  triggerFlow(triggerId: string): Promise<Result<void, TriggerFlowError>>;
  listenFlow(triggerId: string): Promise<Unsubscribe>;
  addEventListener<K extends SSEClientEventType>(
    event: K,
    callback: (data: SSEEventDataMap[K]) => void,
  ): void;
  close(): void;
}
