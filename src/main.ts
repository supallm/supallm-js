import { SupallmClient } from "./core/client";
import { MockFlowResponseFactory } from "./infra/mock-flow-response-factory";

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

import { FlowEvent } from "./core/flow-response";
export type { FlowEvent };
