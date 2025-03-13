import { FlowResponse, FlowResponseFactory } from "../core/flow-response";

import { MockSSEClient } from "./mock-sse-client";

export class MockFlowResponseFactory implements FlowResponseFactory {
  create(): FlowResponse {
    const sseClient = new MockSSEClient();

    return new FlowResponse(sseClient);
  }
}
