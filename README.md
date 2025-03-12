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

### Initialize the SDK

```ts
import { initSupallm } from "supallm";

const supallm = initSupallm({
  projectUrl: "<your-project-url>",
  publicKey: "<your-public-key>",
});

supallm.setAccessToken("<your-access-token>");
```

### Trigger a flow and listen for events

```ts
const result = supallm
  .runFlow({
    flowId: "<your-flow-id>",
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
```

### Trigger a flow and wait for the result

```ts
const result = await supallm
  .runFlow({
    flowId: "<your-flow-id>",
    inputs: {
      name: "John Doe",
    },
  })
  .wait();

console.log("result:", result);
```
