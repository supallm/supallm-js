import { EventSource } from "eventsource";
import { Result } from "typescript-result";
import {
  HttpFailureError,
  InvalidFlowError,
} from "../core/errors/trigger-flow.errors";
import {
  SSEClient,
  SSEClientEventType,
  SSEEventDataMap,
} from "../core/interfaces";

type BackendDataEvent = {
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

const IsBackendDataEvent = (event: any): event is BackendDataEvent => {
  return (
    typeof event === "object" &&
    event !== null &&
    event.type === "NODE_RESULT" &&
    typeof event.workflowId === "string" &&
    typeof event.triggerId === "string" &&
    typeof event.sessionId === "string" &&
    !!event?.data?.data &&
    typeof event.data.nodeId === "string" &&
    typeof event.data.nodeType === "string" &&
    typeof event.data.outputField === "string" &&
    (event.data.type === "text" ||
      event.data.type === "image" ||
      event.data.type === "any")
  );
};

type BackendCompleteEvent = {
  type: "WORKFLOW_FAILED" | "WORKFLOW_COMPLETED";
  workflowId: string;
  triggerId: string;
  sessionId: string;
};

const IsBackendCompleteEvent = (event: any): event is BackendCompleteEvent => {
  return (
    (typeof event === "object" &&
      event !== null &&
      event.type === "WORKFLOW_FAILED") ||
    event.type === "WORKFLOW_COMPLETED"
  );
};

type BackendWorkflowEvent = {
  type: "NODE_STARTED" | "NODE_COMPLETED" | "WORKFLOW_STARTED";
  workflowId: string;
  triggerId: string;
  sessionId: string;
  data: {
    nodeId: string;
  };
};

const IsBackendWorkflowEvent = (event: any): event is BackendWorkflowEvent => {
  return (
    typeof event === "object" &&
    event !== null &&
    (event.type === "NODE_STARTED" ||
      event.type === "NODE_COMPLETED" ||
      event.type === "WORKFLOW_STARTED") &&
    typeof event.workflowId === "string"
  );
};

type BackendErrorEvent = {
  type: "NODE_FAILED";
  workflowId: string;
  triggerId: string;
  nodeId: string;
  data: {
    error: string;
    nodeId: string;
    nodeType: string;
  };
};

const IsBackendErrorEvent = (event: any): event is BackendErrorEvent => {
  return (
    typeof event === "object" &&
    event !== null &&
    event.type === "NODE_FAILED" &&
    typeof event.workflowId === "string" &&
    typeof event.triggerId === "string" &&
    typeof event.nodeId === "string" &&
    typeof event.data.error === "string" &&
    typeof event.data.nodeId === "string" &&
    typeof event.data.nodeType === "string"
  );
};

export class SupallmBrowserSSEClient implements SSEClient {
  private baseUrl: string;
  private projectId: string;

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

  async triggerFlow(triggerId: string) {
    try {
      const url = this.buildTriggerUrl();

      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          inputs: this.config.inputs,
          triggerId,
        }),
      });

      if (!response.ok) {
        return Result.error(
          new InvalidFlowError("The flow is invalid or does not exist."),
        );
      }

      await response.json();

      return Result.ok();
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
          headers: {
            ...init?.headers,
            ...this.getAuthHeaders(),
          },
        });
      },
    });

    const dataEventCallback = (event: MessageEvent) => {
      const result = JSON.parse(event.data);

      const isBackendDataEvent = IsBackendDataEvent(result);

      if (!isBackendDataEvent) {
        console.warn("Received unrecognized event", event.data);
        return;
      }

      this.triggerEvent("flowResultStream", {
        fieldName: result.data.outputField,
        value: result.data.data,
        type: result.data.type,
        workflowId: result.workflowId,
        nodeId: result.data.nodeId,
      });
    };
    es.addEventListener("data", dataEventCallback);

    const workflowEventCallback = (event: MessageEvent) => {
      const result = JSON.parse(event.data);

      const isBackendWorkflowEvent = IsBackendWorkflowEvent(result);

      if (!isBackendWorkflowEvent) {
        console.warn("Received unrecognized workflow event", event.data);
        return;
      }

      switch (result.type) {
        case "NODE_STARTED":
          this.triggerEvent("nodeStart", {
            nodeId: result.data.nodeId,
          });
          break;
        case "NODE_COMPLETED":
          this.triggerEvent("nodeEnd", { nodeId: result.data.nodeId });
          break;
        case "WORKFLOW_STARTED":
          this.triggerEvent("flowStart", {});
          break;
      }
    };

    es.addEventListener("workflow", workflowEventCallback);

    const errorEventCallback = (event: MessageEvent) => {
      const result = JSON.parse(event.data);

      const isBackendErrorEvent = IsBackendErrorEvent(result);

      if (!isBackendErrorEvent) {
        console.warn("Received unrecognized error event", event.data);
        return;
      }

      this.triggerEvent("nodeFail", {
        nodeId: result.data.nodeId,
        message: result.data.error,
      });
    };

    const removeAllListeners = (es: EventSource) => {
      es.removeEventListener("data", dataEventCallback);
      es.removeEventListener("workflow", workflowEventCallback);
    };

    es.addEventListener(
      "complete",
      (event) => {
        const result = JSON.parse(event.data);
        const isBackendCompleteEvent = IsBackendCompleteEvent(result);

        if (!isBackendCompleteEvent) {
          console.warn("Unrecognized complete event received", event.data);
          return;
        }

        if (result.type === "WORKFLOW_FAILED") {
          this.triggerEvent("flowFail", {
            message: "An error occurred during the flow execution.",
          });
        } else {
          this.triggerEvent("flowEnd", {});
        }

        es.close();
        removeAllListeners(es);
      },
      {
        once: true,
      },
    );

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
