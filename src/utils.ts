export const ensureServerOnly = () => {
  if (typeof window !== "undefined") {
    throw new Error(`You are trying to use the server-side SDK version of Supallm in a browser,
      which is unsecure and will result in leaking your secretKey.
      Please use the browser version instead: import { initSupallm } from 'supallm/browser'
    `);
  }
};

export const ensureBrowserOnly = () => {
  if (typeof window === "undefined") {
    throw new Error(`You are trying to use the browser-side SDK version of Supallm in a server.      
      Please use the server version instead: import { initSupallm } from 'supallm/server'
    `);
  }
};
