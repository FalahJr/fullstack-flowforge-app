import axios from "axios";
import { StepExecutor } from "../../src/workflow-engine/step.executor";
import { WorkflowStepDefinition } from "../../src/workflow-engine/dag.parser";

describe("StepExecutor", () => {
  const executor = new StepExecutor();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("executes http steps and returns response data", async () => {
    jest.spyOn(axios, "request").mockResolvedValue({
      status: 200,
      data: { ok: true },
    } as any);

    const step: WorkflowStepDefinition = {
      id: "fetch-data",
      type: "http",
      next: [],
      config: {
        url: "https://example.com/api",
        method: "POST",
      },
    };

    const result = await executor.execute(step);

    expect(axios.request).toHaveBeenCalledWith({
      url: "https://example.com/api",
      method: "post",
    });
    expect(result).toEqual({
      success: true,
      output: {
        status: 200,
        data: { ok: true },
      },
    });
  });

  it("executes delay steps", async () => {
    jest.spyOn(global, "setTimeout").mockImplementation(((
      callback: () => void,
    ) => {
      callback();
      return 0 as any;
    }) as any);

    const step: WorkflowStepDefinition = {
      id: "wait-step",
      type: "delay",
      next: [],
      config: {
        durationMs: 25,
      },
    };

    const result = await executor.execute(step);

    expect(result).toEqual({
      success: true,
      output: { waitedMs: 25 },
    });
  });
});
