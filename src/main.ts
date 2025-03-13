import { SupallmClient } from "./core/client";
import { MockFlowResponseFactory } from "./infra/mock-flow-response-factory";

/**
 * Initializes the Supallm client with the provided parameters.
 *
 * @param {Object} params - The parameters for initializing the Supallm client.
 * @param {string} params.projectUrl - The URL of the Supallm project.
 * @param {string} params.publicKey - The public key for the Supallm project.
 * @returns {SupallmClient} The initialized Supallm client.
 */
export const initSupallm = (params: {
  projectUrl: string;
  publicKey: string;
}) => {
  const flowResponseFactory = new MockFlowResponseFactory();

  const client = new SupallmClient(
    params.projectUrl,
    params.publicKey,
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