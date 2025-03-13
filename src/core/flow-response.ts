import { createNanoEvents, Unsubscribe } from "nanoevents";
import { SSEClient, SSEEventDataMap } from "../core/interfaces";

export type FlowEventDataType = "text" | "image";

export type FlowEventData = {
  fieldName: string;
  value: string;
  type: FlowEventDataType;
  nodeId: string;
  workflowId: string;
};

export type FlowResult = {
  [fieldName: string]: {
    value: string;
    type: FlowEventDataType;
  };
};

export interface FlowEvent {
  data: (data: FlowEventData) => void;
  error: (error: Error) => void;
  complete: (result: FlowResult) => void;
}

export type CreateFlowResponseParams = {
  projectUrl: string;
  publicKey: string;
  externalAccessToken: string | null;
  flowId: string;
  inputs: Record<string, string | number | boolean>;
};

export interface FlowResponseFactory {
  create(params: CreateFlowResponseParams): FlowResponse;
}

export interface FlowSubscription{
  on<K extends keyof FlowEvent>(this: this, event: K, cb: FlowEvent[K]): Unsubscribe
}

type FlowResponseStatus = "pending" | "running" | "complete" | "error";

export class FlowResponse {
  private emitter = createNanoEvents<FlowEvent>();

  private result: FlowResult = {};
  private status: FlowResponseStatus = "pending";

  constructor(private readonly sseClient: SSEClient) {}

  private concatResult(data: FlowEventData) {
    if (this.result[data.fieldName]) {
      this.result[data.fieldName] = {
        ...this.result[data.fieldName],
        value: this.result[data.fieldName].value + data.value,
      };
    } else {
      this.result[data.fieldName] = {
        value: data.value,
        type: data.type,
      };
    }
  }

  private updateStatus(status: FlowResponseStatus) {
    if (this.status !== "complete" && this.status !== "error") {
      this.status = status;
    }
  }

  private onData(data: SSEEventDataMap["data"]) {
    this.status = "running";

    this.emitter.emit("data", {
      fieldName: data.fieldName,
      value: data.value,
      type: data.type,
      nodeId: data.nodeId,
      workflowId: data.workflowId,
    });

    this.updateStatus("running");
    this.concatResult(data);
  }

  private onError(error: SSEEventDataMap["error"]) {
    this.emitter.emit("error", new Error(error.message));
    this.updateStatus("error");
  }

  private onEnd() {
    this.emitter.emit("complete", this.result);
    this.updateStatus("complete");
  }

  private startSSE() {
    this.sseClient.triggerFlow();

    this.sseClient.addEventListener("data", (event) => {
      this.onData(event);
    });
    this.sseClient.addEventListener("error", (event) => {
      this.onError(event);
    });
    this.sseClient.addEventListener("complete", () => {
      this.onEnd();
    });
  }

  public subscribe(): FlowSubscription {
    this.startSSE();
    return this.emitter;
  }

  public wait() {
    this.startSSE();

    return new Promise((resolve, reject) => {
      this.subscribe().on("complete", () => resolve(this.result));
      this.subscribe().on("error", (error) => reject(error));
    });
  }
}
