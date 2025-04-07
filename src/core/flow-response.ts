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
  input: Record<string, unknown>;
};

export type NodeEndEvent = {
  nodeId: string;
  output: Record<string, unknown>;
};

export type NodeFailEvent = {
  nodeId: string;
  message: string;
};

export type NodeLogEvent = {
  nodeId: string;
  message: string;
};

export type ToolStartEvent = {
  nodeId: string;
  agentName: string;
  input: Record<string, unknown>;
};

export type ToolEndEvent = {
  nodeId: string;
  agentName: string;
  output: Record<string, unknown>;
};

export type ToolFailEvent = {
  nodeId: string;
  agentName: string;
};

export type AgentNotificationEvent = {
  nodeId: string;
  nodeType: string;
  type: string;
  outputField: string;
  data: string;
};

export interface FlowEvent {
  flowStart: (event: {}) => void;
  flowResultStream: (event: FlowResultStreamEvent) => void;
  flowFail: (event: FlowFailEvent) => void;
  flowEnd: (event: FlowEndEvent) => void;
  nodeStart: (event: NodeStartEvent) => void;
  nodeEnd: (event: NodeEndEvent) => void;
  nodeFail: (event: NodeFailEvent) => void;
  nodeLog: (event: NodeLogEvent) => void;
  toolStart: (event: ToolStartEvent) => void;
  toolEnd: (event: ToolEndEvent) => void;
  toolFail: (event: ToolFailEvent) => void;
  agentNotification: (event: AgentNotificationEvent) => void;
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
  sessionId?: string;
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

  constructor(
    private readonly sseClient: SSEClient,
    public _sessionId?: string,
  ) {}

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

  private onFlowStart() {
    this.updateStatus("running");
    this.emitter.emit("flowStart", {});
  }

  private onFlowResult(data: SSEEventDataMap["flowResultStream"]) {
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

  private onNodeStart(nodeId: string, input: Record<string, unknown>) {
    this.emitter.emit("nodeStart", {
      nodeId,
      input,
    });
  }

  private onNodeEnd(nodeId: string, output: Record<string, unknown>) {
    this.emitter.emit("nodeEnd", {
      nodeId,
      output,
    });
  }

  private onNodeFail(nodeId: string, message: string) {
    this.emitter.emit("nodeFail", {
      nodeId,
      message,
    });
  }

  private onNodeLog(nodeId: string, message: string) {
    this.emitter.emit("nodeLog", {
      nodeId,
      message,
    });
  }

  private onToolStart(
    nodeId: string,
    agentName: string,
    input: Record<string, unknown>,
  ) {
    this.emitter.emit("toolStart", {
      nodeId,
      agentName,
      input,
    });
  }

  private onToolEnd(nodeId: string, agentName: string) {
    this.emitter.emit("toolEnd", {
      nodeId,
      agentName,
    });
  }

  private onToolFail(nodeId: string, agentName: string) {
    this.emitter.emit("toolFail", {
      nodeId,
      agentName,
    });
  }

  private onAgentNotification(
    nodeId: string,
    nodeType: string,
    type: string,
    outputField: string,
    data: string,
  ) {
    this.emitter.emit("agentNotification", {
      nodeId,
      nodeType,
      type,
      outputField,
      data,
    });
  }

  private async startSSE() {
    this.sseClient.addEventListener("flowStart", () => {
      this.onFlowStart();
    });

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
      this.onNodeStart(event.nodeId, event.input);
    });

    this.sseClient.addEventListener("nodeEnd", (event) => {
      this.onNodeEnd(event.nodeId, event.output);
    });

    this.sseClient.addEventListener("nodeFail", (event) => {
      this.onNodeFail(event.nodeId, event.message);
    });

    this.sseClient.addEventListener("nodeLog", (event) => {
      this.onNodeLog(event.nodeId, event.message);
    });

    this.sseClient.addEventListener("toolStart", (event) => {
      this.onToolStart(event.nodeId, event.agentName, event.input);
    });

    this.sseClient.addEventListener("toolEnd", (event) => {
      this.onToolEnd(event.nodeId, event.agentName);
    });

    this.sseClient.addEventListener("toolFail", (event) => {
      this.onToolFail(event.nodeId, event.agentName);
    });

    this.sseClient.addEventListener("agentNotification", (event) => {
      this.onAgentNotification(
        event.nodeId,
        event.nodeType,
        event.type,
        event.outputField,
        event.data,
      );
    });

    const triggerId = this.sseClient.generateTriggerId();
    const unsubscribe = await this.sseClient.listenFlow(triggerId);

    const triggerResult = await this.sseClient.triggerFlow(
      triggerId,
      this._sessionId,
    );

    const [result, error] = triggerResult.toTuple();

    if (error) {
      unsubscribe();
      throw error;
    }

    this._sessionId = result.sessionId;

    return { sessionId: this._sessionId };
  }

  public get sessionId() {
    if (!this._sessionId) {
      throw new Error(
        "Session ID is not set. Please use the run method before calling this getter.",
      );
    }

    return this._sessionId;
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
