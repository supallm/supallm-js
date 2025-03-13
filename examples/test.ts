import { initSupallm } from "supallm";

const supallm = initSupallm({
  projectUrl: "http://localhost:3001/3ac02582-79ae-40fe-92b0-26e72383a564",
  publicKey: "public-key",
});

supallm.setAccessToken("access-token");

/**
 * Subscribe to the flow result to get the result streams as they come in
 */
const result = supallm
  .runFlow({
    flowId: "f641cf81-5f51-4da9-b08a-504f15834351",
    inputs: {
      prompt: "Write a short story about a cat"
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
    flowId: "f641cf81-5f51-4da9-b08a-504f15834351",
    inputs: {
      prompt: "answer shot because I am running out of money",
    },
  })
  .wait()
  .then((result) => {
    console.log("final result:", result);
  });
