import * as vscode from "vscode";
import { ContextAnalyzer, ContextData } from "./ContextAnalyzer";
import { AgentOrchestrator } from "../agents/AgentOrchestrator";
import { PrivacyManager, PrivacyMode } from "./PrivacyManager";
import { AuditTrail } from "./AuditTrail";
import { AgentType } from "../agents/types";
import { ErrorLogger } from "./ErrorLogger";

export class DevMindManager {
  private contextCache: Map<string, ContextData> = new Map();
  private lastAnalysisTime = 0;
  private readonly ANALYSIS_THROTTLE_MS = 200; // Performance target <200ms
  private webview: vscode.Webview | undefined;
  private errorLogger: ErrorLogger;

  constructor(
    private contextAnalyzer: ContextAnalyzer,
    private agentOrchestrator: AgentOrchestrator,
    private privacyManager: PrivacyManager,
    private auditTrail: AuditTrail,
    private extensionContext: vscode.ExtensionContext,
  ) {
    this.errorLogger = new ErrorLogger(this.extensionContext);
  }

  public setWebview(webview: vscode.Webview) {
    this.webview = webview;
  }

  private postMessageToWebview(command: string, text: string) {
    if (this.webview) {
      this.webview.postMessage({
        command: command,
        text: text,
      });
    }
  }

  public async handleChatMessage(
    message: string,
    agentType: AgentType = "default",
  ): Promise<void> {
    this.postMessageToWebview(
      "addMessage",
      `DevMind: Processing your request...`,
    );

    if (agentType && agentType !== "default") {
      this.postMessageToWebview(
        "addMessage",
        `DevMind: Activating ${agentType} agent with message: "${message}"`,
      );
      try {
        await this.runAgent(agentType);
        this.postMessageToWebview(
          "addMessage",
          `DevMind: ${agentType} agent activated successfully.`,
        );
      } catch (error) {
        this.postMessageToWebview(
          "addMessage",
          `DevMind: Failed to activate ${agentType} agent. Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      this.postMessageToWebview(
        "addMessage",
        `DevMind: Received message: "${message}".`,
      );
      // Handle default agent behavior or prompt for agent selection if needed
    }
  }

  /**
   * Activates the most appropriate agent based on current context
   */
  async activateContextualAgent(): Promise<void> {
    try {
      const context = await this.getCurrentContext();
      const suggestedAgent = this.determineBestAgent(context);

      const selection = await vscode.window.showQuickPick(
        [
          {
            label: `🧠 ${suggestedAgent.toUpperCase()} (Recommended)`,
            value: suggestedAgent,
          },
          { label: "🧠 Architect - Design & Architecture", value: "architect" },
          { label: "🛠 CodeSmith - Generate Code", value: "codesmith" },
          { label: "🔍 BugHunter - Debug & Fix", value: "bughunter" },
          { label: "📄 DocGuru - Documentation", value: "docguru" },
          { label: "🔧 GitMate - Git Operations", value: "gitmate" },
          { label: "🤖 DevFlow - Workflows", value: "devflow" },
        ],
        {
          placeHolder: "Select an AI agent to assist you",
          title: "DevMind - Context-Aware AI Assistant",
        },
      );

      if (selection) {
        await this.runAgent(selection.value as AgentType, context);
      }
    } catch (error) {
      this.handleError("Failed to activate contextual agent", error);
    }
  }

  /**
   * Runs a specific agent with current context
   */
  async runAgent(
    agentType: AgentType,
    context?: ContextData,
    stream?: vscode.ChatResponseStream,
  ): Promise<void> {
    try {
      let currentContext = await this.getCurrentContext();
    if (context) {
      currentContext = { ...currentContext, ...context };
    }

      // Privacy check
      if (!this.privacyManager.canProcessContext(currentContext)) {
        vscode.window.showWarningMessage(
          "Privacy mode prevents processing this context.",
        );
        return;
      }

      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `🧠 DevMind ${agentType.toUpperCase()} is thinking...`,
          cancellable: true,
        },
        async (progress, token) => {
          progress.report({ increment: 0, message: "Analyzing context..." });

          const result = await this.agentOrchestrator.executeAgent(
            agentType,
            currentContext,
            token,
            stream,
          );

          progress.report({ increment: 50, message: "Generating response..." });

          if (result.success) {
            await this.handleAgentResult(agentType, result, currentContext);
            progress.report({ increment: 100, message: "Complete!" });
          } else {
            throw new Error(result.error || "Agent execution failed");
          }
        },
      );
    } catch (error) {
      this.handleError(`Agent ${agentType} execution failed`, error);
    }
  }

  /**
   * Performs code quality review on selected text or current file
   */
  async performCodeReview(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor found.");
      return;
    }

    const selection = editor.selection;
    const text = selection.isEmpty
      ? editor.document.getText()
      : editor.document.getText(selection);

    if (!text.trim()) {
      vscode.window.showErrorMessage("No code selected for review.");
      return;
    }

    const context = await this.getCurrentContext();
    context.selectedText = text;
    context.selectionRange = selection;

    context.command = "bug.review";
    await this.runAgent("bughunter", context);
  }

  /**
   * Performs AI-powered refactoring
   */
  async performRefactoring(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor found.");
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showErrorMessage("Please select code to refactor.");
      return;
    }

    const context = await this.getCurrentContext();
    context.selectedText = editor.document.getText(selection);
    context.selectionRange = selection;
    context.refactorIntent = await this.getRefactorIntent();

    await this.runAgent("codesmith", context);
  }

  /**
   * Generates comprehensive project summary
   */
  async generateProjectSummary(): Promise<void> {
    const context = await this.getCurrentContext();
    context.includeProjectStructure = true;
    context.includeGitHistory = true;
    context.command = "doc.generate";

    await this.runAgent("docguru", context);
  }

  /**
   * Handles document change events for context analysis
   */
  async onDocumentChange(event: vscode.TextDocumentChangeEvent): Promise<void> {
    const now = Date.now();
    if (now - this.lastAnalysisTime < this.ANALYSIS_THROTTLE_MS) {
      return; // Throttle analysis for performance
    }

    this.lastAnalysisTime = now;

    // Update context cache
    const uri = event.document.uri.toString();
    const context = await this.contextAnalyzer.analyzeDocument(event.document);
    this.contextCache.set(uri, context);
  }

  /**
   * Handles active editor change events
   */
  async onActiveEditorChange(editor: vscode.TextEditor): Promise<void> {
    const context = await this.contextAnalyzer.analyzeDocument(editor.document);
    const uri = editor.document.uri.toString();
    this.contextCache.set(uri, context);
  }

  /**
   * Handles configuration changes
   */
  async onConfigurationChange(): Promise<void> {
    const config = vscode.workspace.getConfiguration("devmind");
    const privacyMode = config.get("privacyMode", true)
      ? PrivacyMode.ENHANCED
      : PrivacyMode.STANDARD;
    this.privacyManager.setPrivacyMode(privacyMode);

    // Reinitialize LLM provider if needed
    await this.agentOrchestrator.updateConfiguration(config);
  }

  /**
   * Gets current context with caching
   */
  private async getCurrentContext(): Promise<ContextData> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return this.contextAnalyzer.getEmptyContext();
    }

    const uri = editor.document.uri.toString();
    let context = this.contextCache.get(uri);

    if (!context) {
      context = await this.contextAnalyzer.analyzeFullContext(editor.document);
      this.contextCache.set(uri, context);
    }

    return context;
  }

  /**
   * Determines the best agent based on context
   */
  private determineBestAgent(context: ContextData): AgentType {
    // Simple heuristics - can be enhanced with ML
    if (context.hasErrors || context.hasWarnings) {
      return "bughunter";
    }

    if (context.missingDocumentation) {
      return "docguru";
    }

    if (context.hasGitChanges) {
      return "gitmate";
    }

    if (context.isConfigFile) {
      return "devflow";
    }

    if (context.isArchitecturalFile) {
      return "architect";
    }

    return "codesmith"; // Default
  }

  /**
   * Handles agent execution results
   */
  private async handleAgentResult(
    agentType: AgentType,
    result: any,
    context: ContextData,
  ): Promise<void> {
    // Log to audit trail
    await this.auditTrail.logAgentAction(agentType, context, result);

    // Handle different result types
    if (result.codeChanges) {
      await this.applyCodeChanges(result.codeChanges);
    }

    if (result.documentation) {
      await this.createDocumentation(result.documentation);
    }

    if (result.gitOperations) {
      await this.performGitOperations(result.gitOperations);
    }

    // Show result to user
    if (result.message) {
      vscode.window.showInformationMessage(result.message);
    }

    if (result.suggestions && result.suggestions.length > 0) {
      await this.showSuggestions(result.suggestions);
    }
  }

  /**
   * Gets refactor intent from user
   */
  private async getRefactorIntent(): Promise<string> {
    const intent = await vscode.window.showInputBox({
      prompt:
        'What would you like to refactor? (e.g., "extract method", "improve performance", "add error handling")',
      placeHolder: "Describe your refactoring goal...",
    });

    return intent || "general refactoring";
  }

  /**
   * Applies code changes to the editor
   */
  private async applyCodeChanges(changes: any[]): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    await editor.edit((editBuilder) => {
      changes.forEach((change) => {
        if (change.type === "replace") {
          editBuilder.replace(change.range, change.newText);
        } else if (change.type === "insert") {
          editBuilder.insert(change.position, change.text);
        } else if (change.type === "delete") {
          editBuilder.delete(change.range);
        }
      });
    });
  }

  /**
   * Creates documentation files
   */
  private async createDocumentation(docs: any[]): Promise<void> {
    for (const doc of docs) {
      const uri = vscode.Uri.file(doc.path);
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(doc.content, "utf8"),
      );
    }
  }

  /**
   * Performs git operations
   */
  private async performGitOperations(operations: any[]): Promise<void> {
    // Implementation would use simple-git library
    // This is a placeholder for git operations
    console.log("Git operations:", operations);
  }

  /**
   * Shows suggestions to user
   */
  private async showSuggestions(suggestions: string[]): Promise<void> {
    const selection = await vscode.window.showQuickPick(suggestions, {
      placeHolder: "DevMind suggestions - select to apply",
      canPickMany: false,
    });

    if (selection) {
      // Handle suggestion selection
      console.log("Selected suggestion:", selection);
    }
  }

  /**
   * Handles errors with user-friendly messages
   */
  private handleError(message: string, error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`${message}: ${errorMessage}`);
    console.error(message, error);
    this.errorLogger.logError(message, { error: errorMessage, stack: error.stack });
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.contextCache.clear();
  }
}
