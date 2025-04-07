import { FlowResponseFactory } from "./flow-response";

export type RunFlowParams = {
  flowId: string;
  inputs: Record<string, string | number | boolean>;
  sessionId?: string;
};

export class SupallmBrowserClient {
  private userToken: string | null = null;

  constructor(
    private readonly projectId: string,
    private readonly apiUrl: string,
    private flowResponseFactory: FlowResponseFactory,
    private readonly origin: "dashboard" | "default",
  ) {}

  /**
   * This method allows to authenticate your requests to Supallm
   * using your current authentication provider.
   *
   * @remarks
   * To use this method, you need to have connected your authentication provider to Supallm
   * from your Supallm dashboard.
   *
   * We support various providers such as Supabase.
   * @param userToken
   */
  setUserToken(userToken: string) {
    this.userToken = userToken;
  }

  /**
   /**
   * Runs a flow with the given inputs.
   *
   * @param {RunFlowParams} request - The request object containing the flow ID and flow inputs.
   * @returns {FlowResponse} The response from the flow execution.
   * 
   * @example
   * ```ts
   * const flowResponse = supallm.run({
   *   flowId: "flow-id",
   *   inputs: {
   *     name: "John Doe",
   *   },
   * }).subscribe();
   * 
   * flowResponse.on("data", (data) => {
   *   console.log(data);
   * });
   * 
   * flowResponse.on("error", (error) => {
   *   console.error(error);
   * });
   * 
   * flowResponse.on("end", (result) => {
   *   console.log(result);
   * });
   * ```
   * 
   * @example
   * ```ts
   * const flowResponse = supallm.run({
   *   flowId: "flow-id",
   *   inputs: {
   *     name: "John Doe",
   *   },
   * }).wait();
   * ```
   */
  run(params: RunFlowParams) {
    if (!this.userToken) {
      throw new Error(
        "User Token is required to run a flow securely from the frontend. Please set it using setUserToken method.",
      );
    }

    return this.flowResponseFactory.create({
      apiUrl: this.apiUrl,
      projectId: this.projectId,
      userToken: this.userToken,
      flowId: params.flowId,
      inputs: params.inputs,
      sessionId: params.sessionId,
      origin: this.origin,
    });
  }
}
