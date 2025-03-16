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
  complete: void;
  error: { message: string };
  data: {
    fieldName: string;
    value: string;
    type: "image" | "text";
    workflowId: string;
    nodeId: string;
  };
}

export interface SSEClient {
  generateTriggerId(): string;
  triggerFlow(triggerId: string): Promise<void>;
  listenFlow(triggerId: string): void;
  addEventListener<K extends SSEClientEventType>(
    event: K,
    callback: (data: SSEEventDataMap[K]) => void,
  ): void;
  close(): void;
}
