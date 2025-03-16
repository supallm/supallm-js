import { FlowResponseFactory } from "./flow-response";

export type RunFlowParams = {
  flowId: string;
  inputs: Record<string, string | number | boolean>;
};

export class SupallmServerClient {
  constructor(
    private readonly projectId: string,
    private readonly secretKey: string,
    private readonly apiUrl: string,
    private flowResponseFactory: FlowResponseFactory,
  ) {}

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
      apiKey: this.secretKey,
      flowId: params.flowId,
      inputs: params.inputs,
      origin: "default",
    });
  }
}
