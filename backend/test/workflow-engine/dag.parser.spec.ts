import { BadRequestException } from "@nestjs/common";
import {
  DagParser,
  WorkflowDefinition,
} from "../../src/workflow-engine/dag.parser";

describe("DagParser", () => {
  const parser = new DagParser();

  it("parses a valid workflow definition", () => {
    const definition: WorkflowDefinition = {
      steps: [
        { id: "A", type: "delay", next: ["B"], config: { durationMs: 1 } },
        {
          id: "B",
          type: "http",
          next: [],
          config: { url: "https://example.com", method: "GET" },
        },
      ],
    };

    const parsed = parser.parse(definition);

    expect(parsed.rootStepIds).toEqual(["A"]);
    expect(parsed.orderedStepIds).toEqual(["A", "B"]);
    expect(parsed.dependenciesByStepId.B).toEqual(["A"]);
    expect(parsed.nextByStepId.A).toEqual(["B"]);
  });

  it("rejects duplicate step ids", () => {
    const definition: WorkflowDefinition = {
      steps: [
        { id: "A", type: "delay", next: [] },
        { id: "A", type: "http", next: [] },
      ],
    };

    expect(() => parser.parse(definition)).toThrow(BadRequestException);
    expect(() => parser.parse(definition)).toThrow("ID langkah duplikat: A");
  });

  it("rejects unknown next references", () => {
    const definition: WorkflowDefinition = {
      steps: [{ id: "A", type: "delay", next: ["B"] }],
    };

    expect(() => parser.parse(definition)).toThrow(
      "Langkah A merujuk pada langkah berikut yang tidak dikenal: B",
    );
  });

  it("rejects cycles", () => {
    const definition: WorkflowDefinition = {
      steps: [
        { id: "A", type: "delay", next: ["B"] },
        { id: "B", type: "http", next: ["A"] },
      ],
    };

    expect(() => parser.parse(definition)).toThrow(
      "DAG workflow mengandung siklus",
    );
  });

  it("rejects empty workflow definitions", () => {
    expect(() => parser.parse({ steps: [] })).toThrow(
      "Workflow harus memiliki setidaknya satu langkah",
    );
  });
});
