import { FlowResponseFactory } from "./core/flow-response";
import { SupallmServerClient } from "./core/server-client";
import { MockFlowResponseFactory } from "./infra/mock-flow-response-factory";
import { SupallmServerFlowResponseFactory } from "./infra/supallm-server-flow-response-factory";
import { ensureServerOnly } from "./utils";

/**
 * Initializes the Supallm client with the provided parameters.
 * This method is intended to be used server-side since it contains your private key.
 *
 * @param {Object} params - The parameters for initializing the Supallm client.
 * @param {string} params.projectId - The ID of the Supallm project.
 * @param {string} params.secretKey - The secret key for the Supallm project.
 * @returns {SupallmClient} The initialized Supallm client.
 */
export const initSupallm = (
  params: {
    projectId: string;
    secretKey: string;
  },
  options: {
    mocked: boolean;
    apiUrl: string;
  } = {
    apiUrl: "https://api.supall.com",
    mocked: false,
  },
) => {
  let flowResponseFactory: FlowResponseFactory;

  if (options.mocked) {
    flowResponseFactory = new MockFlowResponseFactory();
  } else {
    flowResponseFactory = new SupallmServerFlowResponseFactory();
  }

  ensureServerOnly();

  const client = new SupallmServerClient(
    params.projectId,
    params.secretKey,
    options.apiUrl,
    flowResponseFactory,
  );

  return client;
};

export type {
  FlowEvent,
  FlowEventData,
  FlowEventDataType,
  FlowResponse,
  FlowResult,
  FlowSubscription,
} from "./core/flow-response";

export type { Unsubscribe } from "nanoevents";
