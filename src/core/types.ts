export type InitParams = {
  projectUrl: string;
  publicKey: string;
};

export type SSEEventName = "start" | "error" | "end" | "data";
