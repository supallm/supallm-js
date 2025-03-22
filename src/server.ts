import { FlowResponseFactory } from "./core/flow-response";
import { SupallmServerClient } from "./core/server-client";
import { SupallmServerFlowResponseFactory } from "./infra/supallm-server-flow-response-factory";
import { ensureServerOnly } from "./utils";

/**
 * Initializes the Supallm client with the provided parameters.
 * This method is intended to be used server-side since it contains your private key.
 * If you want to use it browser-side, use `import { initSupallm } from "supallm/browser"` instead.
 *
 * @param {Object} params - The parameters for initializing the Supallm client.
 * @param {string} params.projectId - The ID of the Supallm project.
 * @param {string} params.secretKey - The secret key for the Supallm project.
 *
 * @param {Object} options - The options for initializing the Supallm client.
 * @param {string} options.apiUrl - The URL where the Supallm backend is hosted. Don't change this value if you are using the cloud version.
 *
 * @param {Object} devOptions - You most likely don't need to use this option unless you are developing at Supallm.
 * @param {boolean} devOptions.mocked - Whether to use mocked data.
 *
 * @returns {SupallmClient} The initialized Supallm client.
 */
export const initSupallm = (
  params: {
    projectId: string;
    secretKey: string;
  },
  options: {
    apiUrl: string;
  } = {
    apiUrl: "https://api.supall.com",
  },
) => {
  let flowResponseFactory: FlowResponseFactory;

  flowResponseFactory = new SupallmServerFlowResponseFactory();

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
