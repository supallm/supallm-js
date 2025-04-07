import { FlowResponse, FlowResponseFactory } from "../core/flow-response";
import { SupallmBrowserSSEClient } from "./supallm-browser-sse-client";

export class SupallmBrowserFlowResponseFactory implements FlowResponseFactory {
  create(params: {
    projectId: string;
    apiUrl: string;
    apiKey?: string | undefined;
    userToken?: string | undefined;
    flowId: string;
    inputs: Record<string, string | number | boolean>;
    origin: "dashboard" | "default";
    sessionId?: string;
  }): FlowResponse {
    if (!params.userToken?.length) {
      throw new Error(
        `User token is required when using Supallm from the browser. Use the setUserToken method to set your token.`,
      );
    }

    const sseClient = new SupallmBrowserSSEClient({
      projectId: params.projectId,
      apiUrl: params.apiUrl,
      flowId: params.flowId,
      userToken: params.userToken,
      inputs: params.inputs,
      origin: params.origin,
    });

    return new FlowResponse(sseClient, params.sessionId);
  }
}
