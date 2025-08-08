import * as vscode from "vscode";
import { QwenLLMProvider } from "../llm/QwenLLMProvider";
import { ContextData } from "../core/ContextAnalyzer";
import {
  AgentResult,
  AgentCapability,
  AgentCapabilityType,
  CodeChange,
  AnalysisResult,
  Alternative,
  IAgent,
  AgentType,
} from "./types";

export class DevFlowAgent implements IAgent {
  readonly type: AgentType = "devflow";
  readonly name: string = "DevFlow";
  readonly description: string =
    "Automates development workflows and generates scripts.";
  constructor(private llmProvider: QwenLLMProvider) {}

  getCapabilities(): AgentCapability[] {
    return [
      {
        type: "workflow_setup",
        name: "Workflow Automation",
        description: "Automates repetitive development workflows.",
        supportedLanguages: ["*"],
        supportedFileTypes: ["*"],
        requiresContext: ["problemStatement", "filePath", "surroundingCode"],
        outputTypes: ["message"],
      },
      {
        type: "workflow_setup",
        name: "Script Generation",
        description: "Generates scripts for various development tasks.",
        supportedLanguages: ["*"],
        supportedFileTypes: ["*"],
        requiresContext: ["problemStatement", "filePath", "surroundingCode"],
        outputTypes: ["message"],
      },
      {
        type: "workflow_setup",
        name: "CI/CD Pipeline Suggestion",
        description:
          "Suggests improvements or new CI/CD pipeline configurations.",
        supportedLanguages: ["*"],
        supportedFileTypes: ["*"],
        requiresContext: ["problemStatement", "filePath", "surroundingCode"],
        outputTypes: ["message"],
      },
    ];
  }

  private async automateWorkflow(
    context: ContextData,
    cancellationToken?: vscode.CancellationToken,
    stream?: vscode.ChatResponseStream,
  ): Promise<AgentResult> {
    try {
      const prompt = this.createWorkflowAutomationPrompt(context);
      const llmResponse = await this.llmProvider.generateResponse({
        prompt,
        stream,
      });

      if (llmResponse.success && llmResponse.content) {
        return {
          success: true,
          message: llmResponse.content,
          agentType: "devflow",
          executionTime: llmResponse.metadata?.responseTime || 0,
        };
      } else {
        return {
          success: false,
          error: llmResponse.error || "Workflow automation failed",
          agentType: "devflow",
          executionTime: llmResponse.metadata?.responseTime || 0,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error:
          error.message ||
          "An unexpected error occurred during workflow automation",
        agentType: "devflow",
        executionTime: 0,
      };
    }
  }

  private async generateScript(
    context: ContextData,
    cancellationToken?: vscode.CancellationToken,
    stream?: vscode.ChatResponseStream,
  ): Promise<AgentResult> {
    try {
      const prompt = this.createScriptGenerationPrompt(context);
      const llmResponse = await this.llmProvider.generateResponse({
        prompt,
        stream,
      });

      if (llmResponse.success && llmResponse.content) {
        return {
          success: true,
          message: llmResponse.content,
          agentType: "devflow",
          executionTime: llmResponse.metadata?.responseTime || 0,
        };
      } else {
        return {
          success: false,
          error: llmResponse.error || "Script generation failed",
          agentType: "devflow",
          executionTime: llmResponse.metadata?.responseTime || 0,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error:
          error.message ||
          "An unexpected error occurred during script generation",
        agentType: "devflow",
        executionTime: 0,
      };
    }
  }

  private createWorkflowAutomationPrompt(context: ContextData): string {
    let prompt = `Generate a workflow automation script (e.g., GitHub Actions, GitLab CI, Jenkinsfile) based on the following requirements and context:

`;
    if (context.problemStatement) {
      prompt += `Requirements: ${context.problemStatement}
`;
    }
    if (context.filePath) {
      prompt += `Relevant file: ${context.filePath}
`;
    }
    if (context.surroundingCode) {
      prompt += `Relevant code context:
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`
`;
    }
    prompt += `
Provide the script in YAML format.`;
    return prompt;
  }

  private createScriptGenerationPrompt(context: ContextData): string {
    let prompt = `Generate a script (e.g., Bash, Python, PowerShell) for the following task, considering the provided context:

`;
    if (context.problemStatement) {
      prompt += `Task: ${context.problemStatement}
`;
    }
    if (context.filePath) {
      prompt += `Relevant file: ${context.filePath}
`;
    }
    if (context.surroundingCode) {
      prompt += `Relevant code context:
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`
`;
    }
    prompt += `
Provide the script.`;
    return prompt;
  }

  async execute(
    context: ContextData,
    cancellationToken?: vscode.CancellationToken,
    stream?: vscode.ChatResponseStream,
  ): Promise<AgentResult> {
    if (context.command === "devflow.automate") {
      return this.automateWorkflow(context, cancellationToken, stream);
    } else if (context.command === "devflow.script") {
      return this.generateScript(context, cancellationToken, stream);
    } else {
      return {
        success: false,
        agentType: this.type,
        executionTime: 0,
        error: "Unsupported command for DevFlowAgent",
      };
    }
  }
}
