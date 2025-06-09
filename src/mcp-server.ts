import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { scanViolations } from "./accessibilityChecker";
import { scrape } from "./scraper";
import { upload } from "./upload-bug";

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
  "scrape",
  "Scrape links from a website. Will return a list of links found on the page.",
  {
    url: z.string().url(),
  },
  async ({ url }) => {
    const { result } = await scrape(url, 2);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              message: "The links have been scraped successfully.",
              links: result,
            },
            null,
            2
          ),
        },
      ],
      isError: false,
    };
  }
);

const validCriteria: string[] = [
  "1.1 - Text Alternatives",
  "1.1.1 - Non-text Content",
  "1.2 - Time-based Media",
  "1.2.1 - Audio-only and Video-only (Prerecorded)",
  "1.2.2 - Captions (Prerecorded)",
  "1.2.3 - Audio Description or Media Alternative (Prerecorded)",
  "1.2.4 - Captions (Live)",
  "1.2.5 - Audio Description (Prerecorded)",
  "1.2.6 - Sign Language (Prerecorded)",
  "1.2.7 - Extended Audio Description (Prerecorded)",
  "1.2.8- Media Alternative (Prerecorded)",
  "1.2.9 - Audio-only (Live)",
  "1.3 - Adaptable",
  "1.3.1 - Info and Relationships",
  "1.3.2 - Meaningful Sequence",
  "1.3.3 - Sensory Characteristics",
  "1.3.4 - Orientation",
  "1.3.5 - Identify Input Purpose",
  "1.3.6 - Identify Purpose",
  "1.4 - Distinguishable",
  "1.4.1 - Use of Color",
  "1.4.2 - Audio Control",
  "1.4.3 - Contrast (Minimum)",
  "1.4.4 - Resize Text",
  "1.4.5 - Images of Text",
  "1.4.6 - Contrast (Enhanced)",
  "1.4.7 - Low or No Background Audio",
  "1.4.8 - Visual Presentation",
  "1.4.9 - Images of Text (No Exception)",
  "1.4.10 - Reflow",
  "1.4.11 Non-text Contrast",
  "1.4.12 - Text Spacing",
  "1.4.13 - Content on Hover or Focus",
  "2.1 - Keyboard Accessible",
  "2.1.1 - Keyboard",
  "2.1.2 - No Keyboard Trap",
  "2.1.3 - Keyboard (No Exception)",
  "2.1.4 - Character Key Shortcuts",
  "2.2 - Enough Time",
  "2.2.1 - Timing Adjustable",
  "2.2.2 - Pause, Stop, Hide",
  "2.2.3 - No Timing",
  "2.2.4 - Interruptions",
  "2.2.5 - Re-authenticating",
  "2.2.6 - Timeouts",
  "2.3 - Seizures and Physical Reactions",
  "2.3.1 - Three Flashes or Below Threshold",
  "2.3.2 - Three Flashes",
  "2.3.3 - Animation from Interactions",
  "2.4 - Navigable",
  "2.4.1 - Bypass Blocks",
  "2.4.2 - Page Titled",
  "2.4.3 - Focus Order",
  "2.4.4 - Link Purpose (In Context)",
  "2.4.5 - Multiple Ways",
  "2.4.6 - Headings and Labels",
  "2.4.7 - Focus Visible",
  "2.4.8 - Location",
  "2.4.9 - Link Purpose (Link Only)",
  "2.4.10 - Section Headings",
  "2.5 - Input Modalities",
  "2.5.1 - Pointer Gestures",
  "2.5.2 - Pointer Cancellation",
  "2.5.3 - Label in Name",
  "2.5.4 - Motion Actuation",
  "2.5.5 - Target Size",
  "2.5.6 - Concurrent Input Mechanisms",
  "3.1 - Readable",
  "3.1.1 - Language of Page",
  "3.1.2 - Language of Parts",
  "3.1.3 - Unusual Words",
  "3.1.4 - Abbreviations",
  "3.1.5 - Reading Level",
  "3.1.6 - Pronunciation",
  "3.2 - Predictable",
  "3.2.1 - On Focus",
  "3.2.2 - On Input",
  "3.2.3 - Consistent Navigation",
  "3.2.4 - Consistent Identification",
  "3.2.5 - Change on Request",
  "3.3 - Input Assistance",
  "3.3.1 - Error Identification",
  "3.3.2 - Labels or Instructions",
  "3.3.3 - Error Suggestion",
  "3.3.4 - Error Prevention (Legal, Financial, Data)",
  "3.3.5 - Help",
  "3.3.6 - Error Prevention (All)",
  "4.1 - Compatible",
  "4.1.2 - Name, Role, Value",
  "4.1.3 - Status Messages",
];

mcpServer.tool(
  "upload_bug",
  "Upload a bug report to the system. The valid criteria are exactly: " +
    validCriteria.map((c) => `\`${c}\``).join(", "),
  {
    cp_id: z
      .number()
      .describe("L'ID della campagna a cui il bug deve essere associato."),
    title: z.string().regex(/^\[.+\] - .+$/, {
      message: "Il formato deve essere [TITOLO] - Descrizione",
    }),
    bugType: z
      .enum(["PERCEIVABLE", "OPERABLE", "UNDERSTANDABLE", "ROBUST"])
      .describe(
        "Il tipo di bug. Deve essere uno tra `PERCEIVABLE`, `OPERABLE`, `UNDERSTANDABLE`, `ROBUST`."
      ),
    severity: z
      .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
      .describe(
        "Il livello di severità del bug. Deve essere uno tra `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`."
      ),
    description: z.string(),
    url: z.string().url(),
    element: z.string(),
    notes: z.string().optional(),
    criteria: z
      .enum(["1.1 - Text Alternatives", ...validCriteria])
      .describe(
        `Uno dei criteri WCAG. Deve essere esattamente uno tra ${validCriteria
          .map((c) => `\`${c}\``)
          .join(", ")} .`
      ),
    level: z.enum(["A", "AA", "AAA"]),
  },
  async ({
    cp_id,
    title,
    bugType,
    url,
    element,
    severity,
    description,
    notes = "",
    criteria = "",
    level = "info",
  }) => {
    // Simulate a successful upload
    console.log("Uploading bug report...");
    await upload({
      cp_id,
      title,
      bugType,
      severity,
      url,
      element,
      description,
      notes,
      criteria,
      level,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { message: "Bug report uploaded successfully." },
            null,
            2
          ),
        },
      ],
      isError: false,
    };
  }
);

mcpServer.tool(
  "scan_accessibility",
  "Scan a link for accessibility violations. Will return the number of violations found and details about each violation.",
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
    const { report } = await scanViolations(
      url,
      [],
      viewport,
      shouldRunInHeadless
    );

    return {
      content: [
        {
          type: "text" as const,
          text: `Trovate ${report.length} violazioni di accessibilità per ${url}.`,
        },
        ...report.map((violation) => ({
          type: "text" as const,
          text: JSON.stringify({ ...violation, url }, null, 2),
        })),
      ],

      isError: false,
    };
  }
);
export { mcpServer };
