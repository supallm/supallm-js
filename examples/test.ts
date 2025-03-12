import { initSupallm } from "supallm";

const supallm = initSupallm({
  projectUrl: "https://supallm.com/project-id",
  publicKey: "public-key",
});

supallm.setAccessToken("access-token");

/**
 * Subscribe to the flow result to get the result streams as they come in
 */
const result = supallm
  .runFlow({
    flowId: "flow-id",
    inputs: {
      name: "John Doe",
    },
  })
  .subscribe();

result.on("complete", (event) => {
  console.log("complete:", event);
});

result.on("data", (event) => {
  console.log("data:", event);
});

result.on("error", (event) => {
  console.log("error:", event);
});

/**
 * Wait for the flow to complete before logging the result
 */
supallm
  .runFlow({
    flowId: "flow-id",
    inputs: {
      name: "John Doe",
    },
  })
  .wait()
  .then((result) => {
    console.log("final result:", result);
  });
