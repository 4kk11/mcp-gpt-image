#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./imagen.js";

async function main() {
  const transport = new StdioServerTransport();
  const { server } = await createServer();

  await server.connect(transport);

  // Cleanup on exit
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});