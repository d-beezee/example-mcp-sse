import { mcpServer } from "./mcp-server.js";
import { createSSEServer } from "./sse-server.js";

const sseServer = createSSEServer(mcpServer);

sseServer.listen(3000, () => {
  console.log("SSE server is running on http://localhost:3000/sse");
});
