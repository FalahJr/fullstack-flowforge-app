import axios from "axios";
import { AiService } from "../../src/ai/ai.service";
import { WorkflowStepDefinition } from "../../src/workflow-engine/dag.parser";

describe("AiService", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
  });

  it("formats structured JSON response", async () => {
    const service = new AiService();
    jest.spyOn(axios, "post").mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                issue: "Request timeout",
                rootCause: "The endpoint is slow",
                suggestion: "Increase timeout or retry.",
                confidence: 0.86,
              }),
            },
          },
        ],
      },
    } as any);

    const step: WorkflowStepDefinition = {
      id: "http-1",
      type: "http",
      next: [],
      config: { url: "https://example.com", method: "GET" },
    };

    const result = await service.generateFailureHint(step, "timeout");

    expect(result).toContain("Masalah: Request timeout");
    expect(result).toContain("Akar masalah: The endpoint is slow");
    expect(result).toContain("Saran: Increase timeout or retry.");
    expect(result).toContain("Confidence: 0.86");
  });

  it("falls back to raw text when response is not JSON", async () => {
    const service = new AiService();
    jest.spyOn(axios, "post").mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: "  Inspect the external API and retry.  ",
            },
          },
        ],
      },
    } as any);

    const step: WorkflowStepDefinition = {
      id: "http-2",
      type: "http",
      next: [],
      config: { url: "https://example.com", method: "GET" },
    };

    const result = await service.generateFailureHint(step, "timeout");

    expect(result).toBe("Inspect the external API and retry.");
  });
});
