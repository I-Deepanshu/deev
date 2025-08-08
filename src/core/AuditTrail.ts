import * as vscode from "vscode";
import { AgentType } from "../agents/types";
import { ContextData } from "./ContextAnalyzer";
import { AgentExecution } from "../agents/AgentOrchestrator";
import * as fs from "fs";
import * as path from "path";

/**
 * AuditTrail class for logging agent executions and actions
 * Provides a comprehensive audit trail for all agent activities
 */
export class AuditTrail {
  private readonly LOG_FILE_NAME = "devmind-audit.log";
  private logFilePath: string;
  private enabled = true;

  /**
   * Creates a new AuditTrail instance
   * @param storageUri The URI for global storage provided by VS Code extension context
   */
  constructor(private storageUri: vscode.Uri) {
    this.logFilePath = path.join(storageUri.fsPath, this.LOG_FILE_NAME);
    this.ensureLogFileExists();
  }

  /**
   * Logs an agent execution to the audit trail
   * @param execution The agent execution details to log
   */
  async logAgentExecution(execution: AgentExecution): Promise<void> {
    if (!this.enabled) return;

    const logEntry = {
      type: "agent_execution",
      timestamp: new Date().toISOString(),
      agentType: execution.agentType,
      executionTime: execution.executionTime,
      success: execution.success,
      error: execution.error,
      contextSummary: this.summarizeContext(execution.context),
    };

    await this.writeLogEntry(logEntry);
  }

  /**
   * Logs an agent action to the audit trail
   * @param agentType The type of agent performing the action
   * @param context The context in which the action was performed
   * @param result The result of the action
   */
  async logAgentAction(
    agentType: AgentType,
    context: ContextData,
    result: any,
  ): Promise<void> {
    if (!this.enabled) return;

    const logEntry = {
      type: "agent_action",
      timestamp: new Date().toISOString(),
      agentType,
      actionType: this.determineActionType(result),
      success: result.success === undefined ? true : result.success,
      contextSummary: this.summarizeContext(context),
      resultSummary: this.summarizeResult(result),
    };

    await this.writeLogEntry(logEntry);
  }

  /**
   * Enables or disables audit logging
   * @param enabled Whether audit logging should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Gets the current audit log contents
   * @param limit Maximum number of entries to retrieve
   * @returns The audit log entries as an array of objects
   */
  async getAuditLog(limit?: number): Promise<any[]> {
    try {
      const content = await fs.promises.readFile(this.logFilePath, "utf8");
      const lines = content
        .split("\n")
        .filter((line) => line.trim().length > 0);
      const entries = lines.map((line) => JSON.parse(line));

      // Sort by timestamp (newest first)
      entries.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      return limit ? entries.slice(0, limit) : entries;
    } catch (error) {
      console.error("Error reading audit log:", error);
      return [];
    }
  }

  /**
   * Clears the audit log
   */
  async clearAuditLog(): Promise<void> {
    try {
      await fs.promises.writeFile(this.logFilePath, "", "utf8");
    } catch (error) {
      console.error("Error clearing audit log:", error);
    }
  }

  /**
   * Ensures the log file exists
   */
  private async ensureLogFileExists(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(this.logFilePath), {
        recursive: true,
      });

      // Check if file exists, create if not
      try {
        await fs.promises.access(this.logFilePath);
      } catch {
        await fs.promises.writeFile(this.logFilePath, "", "utf8");
      }
    } catch (error) {
      console.error("Error ensuring log file exists:", error);
    }
  }

  /**
   * Writes a log entry to the audit log file
   * @param entry The log entry to write
   */
  private async writeLogEntry(entry: any): Promise<void> {
    try {
      const line = JSON.stringify(entry) + "\n";
      await fs.promises.appendFile(this.logFilePath, line, "utf8");
    } catch (error) {
      console.error("Error writing to audit log:", error);
    }
  }

  /**
   * Summarizes context data for logging
   * @param context The context data to summarize
   * @returns A summary of the context data
   */
  private summarizeContext(context: ContextData): any {
    return {
      currentFile: context.currentFile,
      language: context.language,
      projectName: context.projectName,
      hasErrorMessages:
        Array.isArray(context.errorMessages) &&
        context.errorMessages.length > 0,
    };
  }

  /**
   * Summarizes result data for logging
   * @param result The result data to summarize
   * @returns A summary of the result data
   */
  private summarizeResult(result: any): any {
    return {
      hasCodeChanges: result.codeChanges && result.codeChanges.length > 0,
      hasDocumentation: result.documentation && result.documentation.length > 0,
      hasGitOperations: result.gitOperations && result.gitOperations.length > 0,
      hasSuggestions: result.suggestions && result.suggestions.length > 0,
      hasAnalysisResults:
        result.analysisResults && result.analysisResults.length > 0,
    };
  }

  /**
   * Determines the type of action from the result
   * @param result The result to analyze
   * @returns The determined action type
   */
  private determineActionType(result: any): string {
    if (result.codeChanges && result.codeChanges.length > 0) {
      return "code_change";
    }

    if (result.documentation && result.documentation.length > 0) {
      return "documentation";
    }

    if (result.gitOperations && result.gitOperations.length > 0) {
      return "git_operation";
    }

    if (result.analysisResults && result.analysisResults.length > 0) {
      return "analysis";
    }

    return "other";
  }
}
