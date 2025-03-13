import { FlowResponse, FlowResponseFactory } from "../core/flow-response";
import { SupallmSSEClient } from "./supallm-sse-client";

export class SupallmFlowResponseFactory implements FlowResponseFactory {
  create(params: {
    projectId: string;
    apiUrl: string;
    publicKey: string;
    externalAccessToken: string | null;
    flowId: string;
    inputs: Record<string, string | number | boolean>
  }): FlowResponse {
    const sseClient = new SupallmSSEClient({
      projectId: params.projectId,
      apiUrl: params.apiUrl,
      flowId: params.flowId,
      externalAccessToken: params.externalAccessToken,
      publicKey: params.publicKey,
      inputs: params.inputs,
    });

    return new FlowResponse(sseClient);
  }
}
