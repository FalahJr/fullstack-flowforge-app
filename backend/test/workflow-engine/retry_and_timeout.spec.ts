import { ExecutionService } from "../../src/workflow-engine/execution.service";
import { StepExecutor } from "../../src/workflow-engine/step.executor";
import { WorkflowStepDefinition } from "../../src/workflow-engine/dag.parser";

describe("ExecutionService - retry and timeout", () => {
  let svc: ExecutionService;
  let stepExecutor: StepExecutor;

  beforeEach(() => {
    stepExecutor = new StepExecutor();
    svc = new ExecutionService({} as any, {} as any, stepExecutor as any, {} as any, {} as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("retries failed executions up to maxRetries", async () => {
    const step: WorkflowStepDefinition = {
      id: "r1",
      type: "http",
      next: [],
      config: { maxRetries: 3 },
    };

    const execMock = jest.spyOn(stepExecutor, "execute");

    execMock
      .mockRejectedValueOnce(new Error("network error 1"))
      .mockRejectedValueOnce(new Error("network error 2"))
      .mockResolvedValue({ success: true, output: { ok: true } });

    const result = await (svc as any).executeWithRetry(step);

    expect(execMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ ok: true });
  });

  it("throws on timeout before step completes", async () => {
    const step: WorkflowStepDefinition = {
      id: "t1",
      type: "delay",
      next: [],
      config: { timeoutMs: 10, maxRetries: 1 },
    };

    jest.spyOn(stepExecutor, "execute").mockImplementation(async () => {
      // simulate long running task
      await new Promise((r) => setTimeout(r, 50));
      return { success: true, output: { done: true } };
    });

    await expect((svc as any).executeWithRetry(step)).rejects.toThrow(
      /timed out/i,
    );
  });
});
