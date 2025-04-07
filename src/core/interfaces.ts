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

export interface SSEEventDataMap {
  flowEnd: {};
  flowFail: { message: string };
  flowResultStream: {
    fieldName: string;
    value: string;
    type: "image" | "text" | "any";
    workflowId: string;
    nodeId: string;
  };
  flowStart: {};
  nodeStart: {
    nodeId: string;
  };
  nodeEnd: {
    nodeId: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  };
  nodeFail: {
    nodeId: string;
    message: string;
    input: Record<string, unknown>;
  };
  nodeLog: {
    nodeId: string;
    nodeType: string;
    message: string;
  };
  toolStart: {
    nodeId: string;
    agentName: string;
  };
  toolEnd: {
    nodeId: string;
    agentName: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  };
  toolFail: {
    nodeId: string;
    agentName: string;
    input: Record<string, unknown>;
  };
  agentNotification: {
    nodeId: string;
    nodeType: string;
    type: string;
    outputField: string;
    data: string;
  };
}

export type SSEClientEventType = keyof SSEEventDataMap;

export interface Unsubscribe {
  (): void;
}

export interface SSEClient {
  generateTriggerId(): string;
  triggerFlow(
    triggerId: string,
    sessionId?: string,
  ): Promise<
    Result<
      {
        sessionId: string;
      },
      TriggerFlowError
    >
  >;
  listenFlow(triggerId: string): Promise<Unsubscribe>;
  addEventListener<K extends SSEClientEventType>(
    event: K,
    callback: (data: SSEEventDataMap[K]) => void,
  ): void;
  close(): void;
}
