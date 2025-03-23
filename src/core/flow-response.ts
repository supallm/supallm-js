import { createNanoEvents, Unsubscribe } from "nanoevents";
import { SSEClient, SSEEventDataMap } from "../core/interfaces";

export type FlowResultValueType = "text" | "image" | "any";

export type FlowResultStreamEvent = {
  fieldName: string;
  value: string;
  type: FlowResultValueType;
  nodeId: string;
  workflowId: string;
};

export type FlowResult = {
  [fieldName: string]: {
    value: string;
    type: FlowResultValueType;
  };
};

export type FlowFailEvent = {
  message: string;
};

export type FlowEndEvent = {
  result: FlowResult;
};

export type NodeStartEvent = {
  nodeId: string;
};

export type NodeEndEvent = {
  nodeId: string;
};

export type NodeFailEvent = {
  nodeId: string;
  message: string;
};

export type NodeLogEvent = {
  nodeId: string;
  content: string;
};

export interface FlowEvent {
  flowResultStream: (event: FlowResultStreamEvent) => void;
  flowFail: (event: FlowFailEvent) => void;
  flowEnd: (event: FlowEndEvent) => void;
  nodeStart: (event: NodeStartEvent) => void;
  nodeEnd: (event: NodeEndEvent) => void;
  nodeFail: (event: NodeFailEvent) => void;
  nodeLog: (event: NodeLogEvent) => void;
}

export type FlowAwaitedResponse =
  | {
      isError: false;
      isSuccess: true;
      result: FlowResult;
    }
  | {
      isError: true;
      isSuccess: false;
      result: FlowFailEvent;
    };

export type CreateFlowResponseParams = {
  projectId: string;
  apiUrl: string;
  apiKey?: string | undefined;
  userToken?: string | undefined;
  flowId: string;
  inputs: Record<string, string | number | boolean>;
  origin: "dashboard" | "default";
};

export interface FlowResponseFactory {
  create(params: CreateFlowResponseParams): FlowResponse;
}

export interface FlowSubscription {
  on<K extends keyof FlowEvent>(
    this: this,
    event: K,
    cb: FlowEvent[K],
  ): Unsubscribe;
}

type FlowResponseStatus = "pending" | "running" | "complete" | "error";

export class FlowResponse {
  private emitter = createNanoEvents<FlowEvent>();

  private result: FlowResult = {};
  private status: FlowResponseStatus = "pending";

  constructor(private readonly sseClient: SSEClient) {}

  private concatResult(data: FlowResultStreamEvent) {
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

  private onFlowResult(data: SSEEventDataMap["flowResultStream"]) {
    this.status = "running";

    this.emitter.emit("flowResultStream", {
      fieldName: data.fieldName,
      value: data.value,
      type: data.type,
      nodeId: data.nodeId,
      workflowId: data.workflowId,
    });

    this.updateStatus("running");
    this.concatResult(data);
  }

  private onFlowFail(error: SSEEventDataMap["flowFail"]) {
    this.emitter.emit("flowFail", new Error(error.message));
    this.updateStatus("error");
  }

  private onEnd() {
    this.emitter.emit("flowEnd", {
      result: this.result,
    });
    this.updateStatus("complete");
  }

  private onNodeStart(nodeId: string) {
    this.emitter.emit("nodeStart", {
      nodeId,
    });
  }

  private onNodeEnd(nodeId: string) {
    this.emitter.emit("nodeEnd", {
      nodeId,
    });
  }

  private onNodeFail(nodeId: string, message: string) {
    this.emitter.emit("nodeFail", {
      nodeId,
      message,
    });
  }

  private onNodeLog(nodeId: string, content: string) {
    this.emitter.emit("nodeLog", {
      nodeId,
      content,
    });
  }

  private async startSSE() {
    this.sseClient.addEventListener("flowResultStream", (event) => {
      this.onFlowResult(event);
    });
    this.sseClient.addEventListener("flowFail", (event) => {
      this.onFlowFail(event);
    });
    this.sseClient.addEventListener("flowEnd", () => {
      this.onEnd();
    });
    this.sseClient.addEventListener("nodeStart", (event) => {
      this.onNodeStart(event.nodeId);
    });
    this.sseClient.addEventListener("nodeEnd", (event) => {
      this.onNodeEnd(event.nodeId);
    });
    this.sseClient.addEventListener("nodeFail", (event) => {
      this.onNodeFail(event.nodeId, event.message);
    });
    this.sseClient.addEventListener("nodeLog", (event) => {
      this.onNodeLog(event.nodeId, event.content);
    });

    const triggerId = this.sseClient.generateTriggerId();
    const unsubscribe = await this.sseClient.listenFlow(triggerId);
    const triggerResult = await this.sseClient.triggerFlow(triggerId);

    if (triggerResult.isError()) {
      unsubscribe();
      throw triggerResult.error;
    }
  }

  public subscribe(): FlowSubscription {
    this.startSSE();
    return this.emitter;
  }

  public wait(): Promise<FlowAwaitedResponse> {
    this.startSSE();

    return new Promise((resolve) => {
      this.subscribe().on("flowEnd", () => {
        resolve({
          isError: false,
          isSuccess: true,
          result: this.result,
        });
      });
      this.subscribe().on("flowFail", () => {
        resolve({
          isError: true,
          isSuccess: false,
          result: {
            message: "Flow failed",
          },
        });
      });
    });
  }
}
