import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { WorkflowStepDefinition } from "../workflow-engine/dag.parser";

interface FailureAnalysisResult {
  issue: string;
  rootCause: string;
  suggestion: string;
  raw?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private readonly apiUrl =
    process.env.OPENAI_API_URL ?? "https://api.openai.com/v1/chat/completions";
  private readonly model = process.env.OPENAI_MODEL ?? "gpt-3.5-turbo";

  async generateFailureHint(
    step: WorkflowStepDefinition,
    error: Error | string,
  ): Promise<string> {
    if (!this.apiKey) {
      this.logger.warn(
        "OPENAI_API_KEY is missing, using local failure hint fallback.",
      );
      return this.localFallback(step, error);
    }

    const prompt = this.buildPrompt(step, error);

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "Anda adalah asisten yang membantu mendiagnosis kegagalan langkah workflow. Jawab dalam Bahasa Indonesia.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 180,
          temperature: 0.3,
          top_p: 1,
          n: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      );

      const raw = response.data?.choices?.[0]?.message?.content;
      const hint = this.parseResponse(raw);

      return hint;
    } catch (err) {
      this.logger.warn(
        "OpenAI analysis failed, falling back to local hint.",
        err as any,
      );
      return this.localFallback(step, error);
    }
  }

  private buildPrompt(step: WorkflowStepDefinition, error: Error | string) {
    const message = error instanceof Error ? error.message : String(error);
    const config = JSON.stringify(step.config ?? {}, null, 2);

    return `A workflow step failed. Respond with a short diagnosis and a practical fix recommendation. Return the answer as plain text.\n\nStep ID: ${step.id}\nStep type: ${step.type}\nStep config: ${config}\nError: ${message}\n\nPlease provide:\n- issue\n- likely root cause\n- next step to fix it\n\nKeep it concise and actionable.`;
  }

  private parseResponse(raw?: string): string {
    if (!raw) {
      return "AI analysis returned no useful output.";
    }

    const trimmed = raw.trim();

    try {
      const parsed = JSON.parse(trimmed);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        (parsed.issue || parsed.suggestion)
      ) {
        const issue = parsed.issue ? String(parsed.issue).trim() : undefined;
        const rootCause = parsed.rootCause
          ? String(parsed.rootCause).trim()
          : undefined;
        const suggestion = parsed.suggestion
          ? String(parsed.suggestion).trim()
          : undefined;

        return [issue, rootCause, suggestion]
          .filter(Boolean)
          .join(" \n")
          .trim();
      }
    } catch {
      // not JSON, continue with raw text fallback
    }

    return trimmed;
  }

  private localFallback(step: WorkflowStepDefinition, error: Error | string) {
    const message = error instanceof Error ? error.message : String(error);
    const base = `Step ${step.id} failed with error: ${message}`;

    if (step.type === "http") {
      return `${base}. Periksa URL permintaan, metode, dan ketersediaan layanan eksternal, lalu coba lagi.`;
    }

    if (step.type === "delay") {
      return `${base}. Pastikan durasi delay valid lalu coba jalankan kembali workflow.`;
    }

    return `${base}. Periksa konfigurasi langkah lalu coba lagi.`;
  }
}
