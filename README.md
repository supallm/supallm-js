<p align="center">
  <a href="https://github.com/supallm/supallm"><img src="https://github.com/user-attachments/assets/a848e92f-8f20-43d5-a1e1-e89e68772945" alt="Supallm"></a>
</p>

<p align="center">
    <em>.</em>
</p>

<p align=center>
Supallm is an open-source ecosystem allowing to use AI models directly in your frontend.
</p>

<p align="center">
Ship AI apps in minutes, scale to millions.
</p>

<p align="center">
<a href="" target="_blank">
    <img src="https://img.shields.io/badge/License-Apache 2.0-blue.svg" alt="License version">
</a>
<a href="" target="_blank">
    <img src="https://img.shields.io/badge/Status-Under Active Development-green.svg" alt="Docker Image CI">
</a>
</p>

<p align="center">
.
</p>

<h3 align="center">
🌟 Give us some love by starring this repository! 🌟  
</h3>

<p align="center">
.
</p>

## Quick Start

Before you start, make sure you have a Supallm instance running and a flow created.

### Install the SDK

```bash
npm install supallm
```

### Server VS Browser

Our SDK package contains both a browser and a server version.

The main difference between the two is how you will authenticate your requests and what information you will have access to.

For instance, the browser version is designed to be exposed to the client side, it will not have access to the `secretKey`.

The backend version is imported by default when you use the `import { initSupallm } from "supallm"` statement.

To import the frontend version, you can use `import { initSupallm } from "supallm/browser"` statement.

### Server Version

```ts
import { initSupallm } from "supallm/server";

const supallm = initSupallm({
  projectId: "<your-project-id>",
  secretKey: "<your-secret-key>",
});
```

### Browser Version

```ts
import { initSupallm } from "supallm/browser";

const supallm = initSupallm({
  projectId: "<your-project-id>",
});

// Set the user token to authenticate your requests
// Note: this requires to configure the Supallm authentication feature from your dashboard.
supallm.setUserToken("<your-user-token>");
```

### Trigger a flow and listen for events

```ts
const sub = supallm
  .run({
    flowId: "<your-flow-id>",
    inputs: {
      name: "John Doe",
    },
  })
  .subscribe();

sub.on("flowResultStream", (event) => {
  console.log("Partial result receieved", event);
});

result.on("flowEnd", (event) => {
  console.log("Final concatenated result:", event.result);
});

result.on("flowFail", (event) => {
  console.error("An error occurred while running the flow:", event.message);
});

result.on("nodeStart", (event) => {
  console.log("Node started:", event);
});

result.on("nodeFail", (event) => {
  console.error("An error occurred while running the node:", event);
});

result.on("nodeLog", (event) => {
  console.log("Node log:", event);
});

result.on("nodeEnd", (event) => {
  console.log("Node ended:", event);
});
```

### Trigger a flow and wait for the result

```ts
const response = await supallm
  .run({
    flowId: "<your-flow-id>",
    inputs: {
      name: "John Doe",
    },
  })
  .wait();

if (response.isSuccess) {
  console.log("result:", response.result);
} else {
  console.error(
    "An error occurred while running the flow:",
    response.result.message,
  );
}

console.log("result:", result);
```
