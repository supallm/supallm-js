import { EventSource } from "eventsource";
import {
  SSEClient,
  SSEClientEventType,
  SSEEventDataMap,
} from "../core/interfaces";

type BackendDataEvent = {
  type: 'NODE_RESULT',
  workflowId: string;
  triggerId: string;
  sessionId: string;
  data: {
    data: string;
    nodeId: string;
    nodeType: 'llm' | 'result' | 'entrypoint';
    outputField: string;
    type: 'string' | 'image';
  }
}

const IsBackendDataEvent = (event: any): event is BackendDataEvent => {
  return (
    typeof event === 'object' &&
    event !== null &&
    event.type === 'NODE_RESULT' &&
    typeof event.workflowId === 'string' &&
    typeof event.triggerId === 'string' &&
    typeof event.sessionId === 'string' &&
    typeof event.data === 'object' &&
    event.data !== null &&
    typeof event.data.data === 'string' &&
    typeof event.data.nodeId === 'string' &&
    (event.data.nodeType === 'llm' || event.data.nodeType === 'result' || event.data.nodeType === 'entrypoint') &&
    typeof event.data.outputField === 'string' &&
    (event.data.type === 'string' || event.data.type === 'image')
  );
}

export class SupallmSSEClient implements SSEClient {  
  private baseUrl: string;
  private projectId: string;

  constructor(
    private readonly config: {
      projectUrl: string;
      flowId: string;
      externalAccessToken: string | null;
      publicKey: string;
      inputs: Record<string, string | number | boolean>;
    }
  ) {
    const url = new URL(this.config.projectUrl);
    this.baseUrl = `${url.origin}`;
    this.projectId = url.pathname.split('/')[1];
  }

  get workflowId() {
    return this.config.flowId;
  }

  get externalAccessToken() {
    return this.config.externalAccessToken;
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

  private buildListenUrl(subscriptionId: string) {
    return `${this.baseUrl}/projects/${this.projectId}/workflows/${this.workflowId}/listen/${subscriptionId}`;
  }

  async triggerFlow(): Promise<{ sessionId: string }> {
    const url = this.buildTriggerUrl();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.externalAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: this.config.inputs,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger flow. Error status: ${response.status}`);
  }

    const { id } = await response.json() as { id: string };

    return { sessionId: id };
  }

  async listenFlow(subscriptionId: string) {
    const url = this.buildListenUrl(subscriptionId);

    const es = new EventSource(url);

    es.addEventListener("data", (event) => {
      const result = JSON.parse(event.data);

      const isBackendDataEvent = IsBackendDataEvent(result);
      
      if (!isBackendDataEvent) {
        // throw new Error(`Received unrecognized event ${event.data}`);
        console.warn("Received unrecognized event", event.data);
        return;
      }

      this.triggerEvent("data", {
        fieldName: result.data.outputField,
        value: result.data.data,
        type: result.data.type === 'image' ? 'image' : 'text',
        workflowId: result.workflowId,
        nodeId: result.data.nodeId,
      });
    });

    es.addEventListener("error", () => {
      this.triggerEvent("error", new Error('An error occurred while listening to the flow.'));
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
