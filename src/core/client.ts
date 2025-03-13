import { FlowResponseFactory } from "./flow-response";


export type RunFlowParams = {
  flowId: string;
  inputs: Record<string, string | number | boolean>;
};

export class SupallmClient {
  private externalAccessToken: string | null = null;

  constructor(
    private readonly projectId: string,
    private readonly publicKey: string,
    private readonly apiUrl: string,
    private flowResponseFactory: FlowResponseFactory,
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
   * @param accessToken
   */
  setAccessToken(accessToken: string) {
    this.externalAccessToken = accessToken;
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
   * const flowResponse = supallm.runFlow({
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
   * const flowResponse = supallm.runFlow({
   *   flowId: "flow-id",
   *   inputs: {
   *     name: "John Doe",
   *   },
   * }).wait();
   * ```
   */
  runFlow(params: RunFlowParams) {
    return this.flowResponseFactory.create({
      apiUrl: this.apiUrl,
      projectId: this.projectId,
      publicKey: this.publicKey,
      externalAccessToken: this.externalAccessToken,
      flowId: params.flowId,
      inputs: params.inputs,
    });
  }
}
