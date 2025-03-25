import { FlowResponse, FlowResponseFactory } from "../core/flow-response";
import { SupallmServerSSEClient } from "./supallm-server-sse-client";

export class SupallmServerFlowResponseFactory implements FlowResponseFactory {
  create(params: {
    projectId: string;
    apiUrl: string;
    apiKey?: string | undefined;
    userToken?: string | undefined;
    flowId: string;
    inputs: Record<string, string | number | boolean>;
    origin: "dashboard" | "default";
  }): FlowResponse {
    if (!params.apiKey?.length) {
      throw new Error(
        `The secretToken is required when using Supallm from the server. Make sure you pass it when using initSupallm.`,
      );
    }

    const sseClient = new SupallmServerSSEClient({
      projectId: params.projectId,
      apiUrl: params.apiUrl,
      flowId: params.flowId,
      apiKey: params.apiKey,
      inputs: params.inputs,
    });

    return new FlowResponse(sseClient);
  }
}
