import {
  SSEClient,
  SSEClientEventType,
  SSEEventDataMap,
} from "../core/interfaces";

const veryLongText = `Hello! I am your AI assistant. I'm here to help you with a variety of tasks. Whether you need assistance with coding, writing, or just need someone to talk to, I'm here for you. Let's get started!

First, let me tell you a bit about myself. I am powered by advanced machine learning algorithms that allow me to understand and generate human-like text. This means I can help you draft emails, write reports, and even create content for your blog. Just give me a topic, and I'll get to work!

I can also assist with coding tasks. If you're stuck on a piece of code or need help debugging, just let me know. I can provide code snippets, explain concepts, and even help you optimize your code for better performance.

But that's not all! I can also help you stay organized. Need to create a to-do list or set reminders for important tasks? I've got you covered. Just tell me what you need to remember, and I'll make sure you stay on track.

Feeling stressed or overwhelmed? Sometimes, all you need is a friendly chat. I'm here to listen and provide support. Whether you want to talk about your day, share your thoughts, or just need a virtual friend, I'm here for you.

So, what can I help you with today? The possibilities are endless, and I'm excited to assist you in any way I can. Let's make your tasks easier and more enjoyable together!`;

export class MockSSEClient implements SSEClient {
  private events: {
    event: SSEClientEventType;
    callback: (data: SSEEventDataMap[SSEClientEventType]) => void;
  }[] = [];

  constructor() {
    this.streamText(veryLongText);
  }

  private streamText(text: string) {
    let index = 0;

    function getRandomChunkSize() {
      return Math.floor(Math.random() * 3) + 2;
    }

    function getRandomDelay() {
      return Math.floor(Math.random() * 51) + 50;
    }

    const sendNextChunk = () => {
      if (index < text.length) {
        const chunkSize = getRandomChunkSize();
        const chunk = text.slice(index, index + chunkSize);
        index += chunkSize;

        this.triggerEvent("data", {
          fieldName: "result",
          value: chunk,
          type: "text",
          workflowId: "123",
          nodeId: "123",
        });

        setTimeout(sendNextChunk.bind(this), getRandomDelay());
      } else {
        this.triggerEvent("complete", undefined);
      }
    };

    sendNextChunk.call(this);
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

  generateTriggerId(): string {
    return crypto.randomUUID();
  }

  triggerFlow(): Promise<void> {
    return Promise.resolve();
  }

  listenFlow(sessionId: string): void {
    console.log("Listening to flow at mock", sessionId);
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
