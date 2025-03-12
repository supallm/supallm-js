import { FlowResponse } from "../core/flow-response";
import { FlowResponseFactory } from "../core/interfaces";
import { MockSSEClient } from "./mock-sse-client";

export class MockFlowResponseFactory implements FlowResponseFactory {
  create(): FlowResponse {
    const sseClient = new MockSSEClient();

    return new FlowResponse(sseClient);
  }
}
