import { SupallmBrowserClient } from "./core/browser-client";
import { FlowResponseFactory } from "./core/flow-response";
import { MockFlowResponseFactory } from "./infra/mock-flow-response-factory";
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
 * @param {string} params.secretKey - The secret key for the Supallm project.
 * @returns {SupallmClient} The initialized Supallm client.
 */
export const initSupallm = (
  params: {
    projectId: string;
  },
  options: {
    /**
     * The URL where the Supallm backend is hosted.
     *
     * If you are using the cloud version, do not change this value.
     * If you are using the Supallm self-hosted version set this value to http://localhost:3001
     * If you changed the backend url, set this value to your backend url.
     *
     * Default value is https://api.supall.com for the cloud version.
     */
    apiUrl: string;
  },
  /**
   * If you are not developing at Supallm, you most likely don't need to use this option.
   */
  devOptions: {
    mocked: boolean;
    origin: "dashboard" | "default";
  } = {
    mocked: false,
    origin: "default",
  },
) => {
  let flowResponseFactory: FlowResponseFactory;

  if (devOptions.mocked) {
    flowResponseFactory = new MockFlowResponseFactory();
  } else {
    flowResponseFactory = new SupallmBrowserFlowResponseFactory();
  }

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
