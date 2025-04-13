import { EventSource } from "eventsource";
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
    inputs: Record<string, unknown>;
  };
};

type NodeCompletedEvent = {
  type: "NODE_COMPLETED";
  workflowId: string;
  triggerId: string;
  sessionId: string;
  data: {
    nodeId: string;
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
    ioType: "text" | "image" | "any";
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
    error: string;
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
    ioType: "any";
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

export class SupallmBrowserSSEClient implements SSEClient {
  private baseUrl: string;
  private projectId: string;
  private missedEventQueue: DataEvent[] = [];
  private eventQueue: DataEvent[] = [];
  private missedEventsHandled = false;
  private isDispatchingMissedEvents = false;

  constructor(
    private readonly config: {
      apiUrl: string;
      projectId: string;
      flowId: string;
      userToken: string;
      inputs: Record<string, string | number | boolean>;
      /**
       * This field is used internally to identify the origin of the request.
       * dashboard: the request is coming from the Supallm dashboard.
       * In this case, the userToken is verified using the backend Authentication service.
       *
       * default: the request is coming from a custom frontend or backend.
       * In this case, the userToken is verified using the configured auth provider
       * (e.g. Supabase, Auth0, etc.)
       */
      origin: "dashboard" | "default";
      sessionId?: string;
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
    return crypto.randomUUID();
  }

  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.config.userToken}`,
      "X-Request-Origin": this.config.origin,
    };
  }

  private getHeaders() {
    return {
      ...this.getAuthHeaders(),
      "Content-Type": "application/json",
    };
  }

  private generateSessionId() {
    return crypto.randomUUID();
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

  private async dispatchEvent(result: DataEvent, unsubscribe: () => void) {
    switch (result.type) {
      case "NODE_RESULT":
        this.triggerEvent("flowResultStream", {
          fieldName: result.data.outputField,
          value: result.data.data,
          type: result.data.ioType,
          workflowId: result.workflowId,
          nodeId: result.data.nodeId,
        });
        break;
      case "NODE_STARTED":
        this.triggerEvent("nodeStart", {
          nodeId: result.data.nodeId,
          input: result.data.inputs,
        });
        break;
      case "NODE_COMPLETED":
        this.triggerEvent("nodeEnd", {
          nodeId: result.data.nodeId,
          output: result.data.output,
        });
        break;
      case "NODE_FAILED":
        this.triggerEvent("nodeFail", {
          nodeId: result.data.nodeId,
          error: result.data.error,
        });
        break;
      case "WORKFLOW_STARTED":
        this.triggerEvent("flowStart", {});
        break;
      case "WORKFLOW_FAILED":
        this.triggerEvent("flowFail", {
          message: "An error occurred during the flow execution.",
        });
        unsubscribe();
        break;
      case "WORKFLOW_COMPLETED":
        this.triggerEvent("flowEnd", {});
        unsubscribe();
        break;
      case "TOOL_STARTED":
        this.triggerEvent("toolStart", {
          nodeId: result.data.nodeId,
          agentName: result.data.agentName,
          input: result.data.inputs,
        });
        break;
      case "TOOL_COMPLETED":
        this.triggerEvent("toolEnd", {
          nodeId: result.data.nodeId,
          agentName: result.data.agentName,
          output: result.data.output,
        });
        break;
      case "TOOL_FAILED":
        this.triggerEvent("toolFail", {
          nodeId: result.data.nodeId,
          agentName: result.data.agentName,
          error: result.data.error,
        });
        break;
      case "AGENT_NOTIFICATION":
        this.triggerEvent("agentNotification", {
          nodeId: result.data.nodeId,
          nodeType: result.data.nodeType,
          type: result.data.ioType,
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
  }

  private dispatchMissedEventsOnce(unsubscribe: () => void) {
    if (this.isDispatchingMissedEvents || this.missedEventsHandled) {
      return;
    }

    this.isDispatchingMissedEvents = true;

    while (this.missedEventQueue.length) {
      const event = this.missedEventQueue.shift();

      if (!event) {
        continue;
      }

      this.dispatchEvent(event, unsubscribe);
    }

    this.isDispatchingMissedEvents = false;
    this.dispatchQueueEvents(unsubscribe);
  }

  private dispatchQueueEvents(unsubscribe: () => void) {
    while (this.eventQueue.length) {
      const event = this.eventQueue.shift();

      if (!event) {
        continue;
      }

      this.dispatchEvent(event, unsubscribe);
    }
  }

  async listenFlow(triggerId: string) {
    const url = this.buildListenUrl(triggerId);

    const es = new EventSource(url, {
      fetch: (input, init) => {
        return fetch(input, {
          ...init,
          headers: {
            ...init?.headers,
            ...this.getAuthHeaders(),
          },
        });
      },
    });

    const removeAllListeners = (es: EventSource) => {
      es.removeEventListener("data", dataEventCallback);
      es.removeEventListener("resume", resumeEventCallback);
    };

    const unsubscribe = () => {
      console.log("Unsubscribing from flow");
      es.close();
      removeAllListeners(es);
    };

    const resumeEventCallback = (event: MessageEvent) => {
      const result = JSON.parse(event.data);

      if (!Array.isArray(result)) {
        console.warn("Received non-array data in resume event");
        return;
      }

      this.missedEventQueue = result;

      this.dispatchMissedEventsOnce(unsubscribe);
    };

    const dataEventCallback = (event: MessageEvent) => {
      const result = JSON.parse(event.data);

      const isDataEvent = IsDataEvent(result);

      if (!isDataEvent) {
        console.warn("Received unrecognized event", event.data);
        return;
      }

      /**
       * If the missed events have not been handled yet, we need to add the event to the queue
       * so that it can be dispatched later.
       */
      if (!this.missedEventsHandled) {
        this.eventQueue.push(result);
        return;
      }

      /**
       * In the case where the missed events have been handled but there are still events in the queue,
       * it means the queue is currently being dispatched, so we need to add the event to the queue
       * so that it can be dispatched last.
       */
      if (this.missedEventsHandled && this.eventQueue.length) {
        this.eventQueue.push(result);
        return;
      }

      /**
       * If we're here, it means the missed events have been handled and there are no events in the queue.
       * So we can dispatch the event immediately.
       */
      return this.dispatchEvent(result, unsubscribe);
    };

    es.addEventListener("resume", resumeEventCallback, {
      once: true,
    });

    es.addEventListener("data", dataEventCallback);

    return unsubscribe;
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
    this.missedEventQueue = [];
    this.eventQueue = [];
  }
}
