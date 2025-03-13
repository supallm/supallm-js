import { SupallmClient } from "./core/client";
import { FlowResponseFactory } from "./core/flow-response";
import { MockFlowResponseFactory } from "./infra/mock-flow-response-factory";
import { SupallmFlowResponseFactory } from "./infra/supallm-flow-response-factory";

/**
 * Initializes the Supallm client with the provided parameters.
 *
 * @param {Object} params - The parameters for initializing the Supallm client.
 * @param {string} params.projectId - The ID of the Supallm project.
 * @param {string} params.publicKey - The public key for the Supallm project.
 * @returns {SupallmClient} The initialized Supallm client.
 */
export const initSupallm = (params: {
  projectId: string;
  publicKey: string;
}, options: {
  mocked: boolean;
  apiUrl: string;
} = {
  mocked: false,
  apiUrl: "https://api.supallm.com",
}) => {
  let flowResponseFactory: FlowResponseFactory;

  if (options.mocked) {
    flowResponseFactory = new MockFlowResponseFactory();
  } else {
    flowResponseFactory = new SupallmFlowResponseFactory();
  }

  const client = new SupallmClient(
    params.projectId,
    params.publicKey,
    options.apiUrl,
    flowResponseFactory,
  );

  return client;
};

export type { 
  FlowEvent, 
  FlowEventData,
  FlowResponse,
  FlowResult,
  FlowEventDataType,
  FlowSubscription,
} from './core/flow-response';

export type { Unsubscribe } from 'nanoevents';