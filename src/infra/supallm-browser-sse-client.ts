import { EventSource } from "eventsource";
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
    nodeType: "llm" | "result" | "entrypoint";
    outputField: string;
    type: "text" | "image";
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
    typeof event.data === "object" &&
    event.data !== null &&
    typeof event.data.data === "string" &&
    typeof event.data.nodeId === "string" &&
    (event.data.nodeType === "llm" ||
      event.data.nodeType === "result" ||
      event.data.nodeType === "entrypoint") &&
    typeof event.data.outputField === "string" &&
    (event.data.type === "text" || event.data.type === "image")
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
      throw new Error(
        `Failed to trigger flow. Error status: ${response.status}`,
      );
    }

    await response.json();
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

    es.addEventListener("data", (event) => {
      const result = JSON.parse(event.data);

      const isBackendDataEvent = IsBackendDataEvent(result);

      if (!isBackendDataEvent) {
        console.warn("Received unrecognized event", event.data);
        return;
      }

      this.triggerEvent("data", {
        fieldName: result.data.outputField,
        value: result.data.data,
        type: result.data.type,
        workflowId: result.workflowId,
        nodeId: result.data.nodeId,
      });
    });

    es.addEventListener("error", () => {
      this.triggerEvent(
        "error",
        new Error("An error occurred while listening to the flow."),
      );
    });

    es.addEventListener("complete", () => {
      this.triggerEvent("complete", undefined);
      es.close();
    });
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
