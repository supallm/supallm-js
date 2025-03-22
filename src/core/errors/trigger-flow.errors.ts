export class HttpFailureError extends Error {
  type = "http-failure-error";
}

export class InvalidFlowError extends Error {
  type = "invalid-flow-error";
}

export type TriggerFlowError = HttpFailureError | InvalidFlowError;
