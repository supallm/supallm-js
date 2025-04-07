import { v4 as uuidv4 } from "uuid";

import { EventSource, FetchLikeResponse } from "eventsource";
import fetch from "node-fetch";
import { assertUnreachable, Result } from "typescript-result";
import {
  HttpFailureError,
  InvalidFlowError,
} from "../core/errors/trigger-flow.errors";
import {
  SSEClient,
  SSEClientEventType,
  SSEEventDataMap,
} from "../core/interfaces";
const DataEventTypes = [
  "NODE_STARTED",
  "NODE_COMPLETED",
  "NODE_FAILED",
  "NODE_RESULT",
  "WORKFLOW_STARTED",
  "WORKFLOW_COMPLETED",
  "WORKFLOW_FAILED",
  "TOOL_STARTED",
  "TOOL_COMPLETED",
  "TOOL_FAILED",
  "AGENT_NOTIFICATION",
  "NODE_LOG",
] as const;

export type DataEventType = (typeof DataEventTypes)[number];

type NodeStartedEvent = {
  type: "NODE_STARTED";
  workflowId: string;
  triggerId: string;
  sessionId: string;
  data: {
    nodeId: string;
  };
};

type NodeCompletedEvent = {
  type: "NODE_COMPLETED";
  workflowId: string;
  triggerId: string;
  sessionId: string;
  data: {
    nodeId: string;
    inputs: Record<string, unknown>;
    output: Record<string, unknown>;
  };
};

type NodeFailedEvent = {
  type: "NODE_FAILED";
  workflowId: string;
  triggerId: string;
  sessionId: string;
  data: {
    error: string;
    nodeId: string;
    nodeType: string;
    inputs: Record<string, unknown>;
  };
};

type NodeResultEvent = {
  type: "NODE_RESULT";
  workflowId: string;
  triggerId: string;
  sessionId: string;
  data: {
    data: string;
    nodeId: string;
    nodeType: string;
    outputField: string;
    type: "text" | "image" | "any";
  };
};

type WorkflowStartedEvent = {
  type: "WORKFLOW_STARTED";
  workflowId: string;
  triggerId: string;
  sessionId: string;
};

type WorkflowFailedEvent = {
  type: "WORKFLOW_FAILED";
  workflowId: string;
  triggerId: string;
  sessionId: string;
};

type WorkflowCompletedEvent = {
  type: "WORKFLOW_COMPLETED";
  workflowId: string;
  triggerId: string;
  sessionId: string;
};

type ToolStartedEvent = {
  type: "TOOL_STARTED";
  workflowId: string;
  triggerId: string;
  sessionId: string;
  data: {
    nodeId: string;
    agentName: string;
    inputs: Record<string, unknown>;
  };
};

type ToolCompletedEvent = {
  type: "TOOL_COMPLETED";
  workflowId: string;
  triggerId: string;
  data: {
    nodeId: string;
    agentName: string;
    inputs: Record<string, unknown>;
    output: Record<string, unknown>;
  };
};

type ToolFailedEvent = {
  type: "TOOL_FAILED";
  workflowId: string;
  triggerId: string;
  sessionId: string;
  data: {
    nodeId: string;
    agentName: string;
    inputs: Record<string, unknown>;
  };
};

type AgentNotificationEvent = {
  type: "AGENT_NOTIFICATION";
  workflowId: string;
  triggerId: string;
  sessionId: string;
  data: {
    data: string;
    nodeId: string;
    nodeType: string;
    type: "any";
    outputField: string;
  };
};

type NodeLogEvent = {
  type: "NODE_LOG";
  workflowId: string;
  triggerId: string;
  sessionId: string;
  data: {
    nodeId: string;
    nodeType: string;
    message: string;
  };
};

type DataEvent =
  | NodeStartedEvent
  | NodeCompletedEvent
  | NodeFailedEvent
  | NodeResultEvent
  | WorkflowStartedEvent
  | WorkflowFailedEvent
  | WorkflowCompletedEvent
  | ToolStartedEvent
  | ToolCompletedEvent
  | ToolFailedEvent
  | AgentNotificationEvent
  | NodeLogEvent;

const IsDataEvent = (event: any): event is DataEvent => {
  return DataEventTypes.includes(event.type);
};

export class SupallmServerSSEClient implements SSEClient {
  private baseUrl: string;
  private projectId: string;

  constructor(
    private readonly config: {
      apiUrl: string;
      projectId: string;
      flowId: string;
      apiKey: string;
      inputs: Record<string, string | number | boolean>;
    },
  ) {
    this.baseUrl = config.apiUrl;
    this.projectId = config.projectId;
  }

  get workflowId() {
    return this.config.flowId;
  }

  private events: {
    event: SSEClientEventType;
    callback: (data: SSEEventDataMap[SSEClientEventType]) => void;
  }[] = [];

  private triggerEvent<K extends SSEClientEventType>(
    event: K,
    data: SSEEventDataMap[K],
  ): void {
    const eventCallback = this.events.find((e) => e.event === event)?.callback;

    if (eventCallback) {
      eventCallback(data);
    }
  }

  private buildTriggerUrl() {
    return `${this.baseUrl}/projects/${this.projectId}/workflows/${this.workflowId}/trigger`;
  }

  private buildListenUrl(triggerId: string) {
    return `${this.baseUrl}/projects/${this.projectId}/workflows/${this.workflowId}/listen/${triggerId}`;
  }

  public generateTriggerId() {
    return uuidv4();
  }

  public generateSessionId() {
    return uuidv4();
  }

  private getAuthHeaders() {
    return {
      "X-Secret-Key": this.config.apiKey,
    };
  }

  private getHeaders() {
    return {
      ...this.getAuthHeaders(),
      "Content-Type": "application/json",
    };
  }

  async triggerFlow(triggerId: string, _sessionId?: string) {
    try {
      const url = this.buildTriggerUrl();

      const sessionId = _sessionId ?? this.generateSessionId();

      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          inputs: this.config.inputs,
          triggerId,
          sessionId,
        }),
      });

      if (!response.ok) {
        return Result.error(
          new InvalidFlowError("The flow is invalid or does not exist."),
        );
      }

      await response.json();

      return Result.ok({
        sessionId,
      });
    } catch (error) {
      return Result.error(
        new HttpFailureError(
          "An unknown error occurred while triggering the flow.",
        ),
      );
    }
  }

  async listenFlow(triggerId: string) {
    const url = this.buildListenUrl(triggerId);

    const es = new EventSource(url, {
      fetch: (input, init) => {
        return fetch(input, {
          ...init,
          headers: this.getHeaders(),
        }) as Promise<FetchLikeResponse>;
      },
    });

    const removeAllListeners = (es: EventSource) => {
      es.removeEventListener("data", dataEventCallback);
    };

    const dataEventCallback = (event: MessageEvent) => {
      const result = JSON.parse(event.data);

      const isDataEvent = IsDataEvent(result);

      if (!isDataEvent) {
        console.warn("Received unrecognized event", event.data);
        return;
      }

      switch (result.type) {
        case "NODE_RESULT":
          this.triggerEvent("flowResultStream", {
            fieldName: result.data.outputField,
            value: result.data.data,
            type: result.data.type,
            workflowId: result.workflowId,
            nodeId: result.data.nodeId,
          });
          break;
        case "NODE_STARTED":
          this.triggerEvent("nodeStart", {
            nodeId: result.data.nodeId,
          });
          break;
        case "NODE_COMPLETED":
          this.triggerEvent("nodeEnd", {
            nodeId: result.data.nodeId,
            input: result.data.inputs,
            output: result.data.output,
          });
          break;
        case "NODE_FAILED":
          this.triggerEvent("nodeFail", {
            nodeId: result.data.nodeId,
            message: result.data.error,
            input: result.data.inputs,
          });
          break;
        case "WORKFLOW_STARTED":
          this.triggerEvent("flowStart", {});
          break;
        case "WORKFLOW_FAILED":
          this.triggerEvent("flowFail", {
            message: "An error occurred during the flow execution.",
          });
          removeAllListeners(es);
          break;
        case "WORKFLOW_COMPLETED":
          this.triggerEvent("flowEnd", {});
          removeAllListeners(es);
          break;
        case "TOOL_STARTED":
          this.triggerEvent("toolStart", {
            nodeId: result.data.nodeId,
            agentName: result.data.agentName,
          });
          break;
        case "TOOL_COMPLETED":
          this.triggerEvent("toolEnd", {
            nodeId: result.data.nodeId,
            agentName: result.data.agentName,
            input: result.data.inputs,
            output: result.data.output,
          });
          break;
        case "TOOL_FAILED":
          this.triggerEvent("toolFail", {
            nodeId: result.data.nodeId,
            agentName: result.data.agentName,
            input: result.data.inputs,
          });
          break;
        case "AGENT_NOTIFICATION":
          this.triggerEvent("agentNotification", {
            nodeId: result.data.nodeId,
            nodeType: result.data.nodeType,
            type: result.data.type,
            outputField: result.data.outputField,
            data: result.data.data,
          });
          break;
        case "NODE_LOG":
          this.triggerEvent("nodeLog", {
            nodeId: result.data.nodeId,
            nodeType: result.data.nodeType,
            message: result.data.message,
          });
          break;
        default:
          assertUnreachable(result);
      }
    };
    es.addEventListener("data", dataEventCallback);

    return () => {
      es.close();
      removeAllListeners(es);
    };
  }

  addEventListener<K extends SSEClientEventType>(
    event: K,
    callback: (data: SSEEventDataMap[K]) => void,
  ): void {
    // @ts-expect-error
    this.events.push({ event, callback });
  }

  close(): void {
    this.events = [];
  }
}
