import {
  SSEClient,
  SSEClientEventType,
  SSEEventDataMap,
} from "../core/interfaces";

export interface SSEClientFactory {
  create(
    flowId: string,
    params: Record<string, any>,
    externalAccessToken: string,
  ): SSEClient;
}

export class MockSSEClientFactory implements SSEClientFactory {
  create(): SSEClient {
    return new MockSSEClient();
  }
}

export class MockSSEClient implements SSEClient {
  private events: {
    event: SSEClientEventType;
    callback: (data: SSEEventDataMap[SSEClientEventType]) => void;
  }[] = [];

  constructor() {
    setTimeout(() => {
      this.triggerEvent("data", {
        fieldName: "result",
        value: "how",
        type: "text",
        workflowId: "123",
        nodeId: "123",
      });
      setTimeout(() => {
        this.triggerEvent("data", {
          fieldName: "result",
          value: " can I",
          type: "text",
          workflowId: "123",
          nodeId: "123",
        });
        setTimeout(() => {
          this.triggerEvent("data", {
            fieldName: "result",
            value: " help you",
            type: "text",
            workflowId: "123",
            nodeId: "123",
          });
          setTimeout(() => {
            this.triggerEvent("data", {
              fieldName: "result",
              value: " today?",
              type: "text",
              workflowId: "123",
              nodeId: "123",
            });
            this.triggerEvent("complete", undefined);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }

  private triggerEvent<K extends SSEClientEventType>(
    event: K,
    data: SSEEventDataMap[K],
  ): void {
    const eventCallback = this.events.find((e) => e.event === event)?.callback;

    if (eventCallback) {
      eventCallback(data);
    }
  }

  triggerFlow(): Promise<{ sessionId: string }> {
    return Promise.resolve({ sessionId: "123" });
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
