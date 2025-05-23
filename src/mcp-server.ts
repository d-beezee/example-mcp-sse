import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { scanViolations } from "./accessibilityChecker";

const mcpServer = new McpServer(
  {
    name: "ExampleMCPServer",
    version: "1.0.0",
  },
  {
    capabilities: {},
  }
);

mcpServer.tool(
  "scan_accessibility",
  {
    url: z.string().url(),
    violationsTag: z.array(z.string()),
    viewport: z
      .object({
        width: z.number().default(1920),
        height: z.number().default(1080),
      })
      .optional(),
    shouldRunInHeadless: z.boolean().default(true),
  },
  async ({ url, violationsTag, viewport, shouldRunInHeadless }) => {
    const { report, screenshots } = await scanViolations(
      url,
      violationsTag,
      viewport,
      shouldRunInHeadless
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              message: "The image has been saved to your downloads.",
              ...report,
            },
            null,
            2
          ),
        },
        ...screenshots.map((screenshot) => ({
          type: "image" as const,
          data: screenshot.screenshot,
          mimeType: "image/jpeg",
        })),
      ],
      isError: false,
    };
  }
);
export { mcpServer };
