import { SupallmBrowserClient } from "./core/browser-client";
import { FlowResponseFactory } from "./core/flow-response";
import { SupallmBrowserFlowResponseFactory } from "./infra/supallm-browser-flow-response-factory";
import { ensureBrowserOnly } from "./utils";

/**
 * Initializes the Supallm client with the provided parameters.
 * This method is intended to be used browser-side only.
 *
 * If you want to use it server-side, use `import { initSupallm } from "supallm/server"` instead.
 *
 * @param {Object} params - The parameters for initializing the Supallm client.
 * @param {string} params.projectId - The ID of the Supallm project.
 *
 * @param {Object} options - The options for initializing the Supallm client.
 * @param {string} options.apiUrl - The URL where the Supallm backend is hosted. Don't change this value if you are using the cloud version.
 *
 * @param {Object} devOptions - You most likely don't need to use this option unless you are developing at Supallm.
 * @param {boolean} devOptions.mocked - Whether to use mocked data.
 * @param {string} devOptions.origin - The origin of the Supallm client.
 *
 * @returns {SupallmClient} The initialized Supallm client.
 */
export const initSupallm = (
  params: {
    projectId: string;
  },
  options: {
    apiUrl: string;
  },
  devOptions: {
    origin: "dashboard" | "default";
  } = {
    origin: "default",
  },
) => {
  let flowResponseFactory: FlowResponseFactory;

  flowResponseFactory = new SupallmBrowserFlowResponseFactory();

  ensureBrowserOnly();

  const client = new SupallmBrowserClient(
    params.projectId,
    options.apiUrl,
    flowResponseFactory,
    devOptions.origin,
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
