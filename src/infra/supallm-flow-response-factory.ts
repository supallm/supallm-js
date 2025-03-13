import { FlowResponse } from "../core/flow-response";
import { FlowResponseFactory } from "../core/interfaces";
import { SupallmSSEClient } from "./supallm-sse-client";

export class SupallmFlowResponseFactory implements FlowResponseFactory {
  create(params: {
    projectUrl: string;
    publicKey: string;
    externalAccessToken: string | null;
    flowId: string;
    inputs: Record<string, string | number | boolean>
  }): FlowResponse {
    const sseClient = new SupallmSSEClient({
      projectUrl: params.projectUrl,      
      flowId: params.flowId,
      externalAccessToken: params.externalAccessToken,
      publicKey: params.publicKey,
      inputs: params.inputs,
    });

    return new FlowResponse(sseClient);
  }
}
