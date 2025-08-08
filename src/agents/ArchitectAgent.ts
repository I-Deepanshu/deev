import * as vscode from "vscode";
import { QwenLLMProvider } from "../llm/QwenLLMProvider";
import { ContextAnalyzer, ContextData } from "../core/ContextAnalyzer";
import {
  IAgent,
  AgentType,
  AgentResult,
  AgentCapability,
  AgentStatus,
  AnalysisResult,
  Alternative,
  DocumentationOutput,
} from "./types";

export class ArchitectAgent implements IAgent {
  readonly type: AgentType = "architect";
  readonly name: string = "Architect";
  readonly description: string =
    "Proposes scalable designs and architecture changes";

  private status: AgentStatus = {
    isReady: true,
    isExecuting: false,
    errorCount: 0,
    successCount: 0,
    averageExecutionTime: 0,
  };

  constructor(
    private llmProvider: QwenLLMProvider,
    private contextAnalyzer: ContextAnalyzer,
  ) {}

  async execute(
    context: ContextData,
    cancellationToken?: vscode.CancellationToken,
    stream?: vscode.ChatResponseStream,
  ): Promise<AgentResult> {
    const startTime = Date.now();
    this.status.isExecuting = true;
    this.status.currentTask = "Analyzing architecture";

    try {
      // Determine the type of architectural analysis needed
      const analysisType = this.determineAnalysisType(context);

      let result: AgentResult;

      switch (analysisType) {
        case "project_structure":
          result = await this.analyzeProjectStructure(
            context,
            cancellationToken,
          );
          break;
        case "design_patterns":
          result = await this.analyzeDesignPatterns(context, cancellationToken);
          break;
        case "scalability":
          result = await this.analyzeScalability(context, cancellationToken);
          break;
        case "technology_stack":
          result = await this.analyzeTechnologyStack(
            context,
            cancellationToken,
          );
          break;
        case "architecture_review":
          result = await this.performArchitectureReview(
            context,
            cancellationToken,
          );
          break;
        default:
          result = await this.performGeneralArchitecturalAnalysis(
            context,
            cancellationToken,
          );
      }

      const executionTime = Date.now() - startTime;
      result.executionTime = executionTime;

      // Update status
      this.status.successCount++;
      this.updateAverageExecutionTime(executionTime);

      return result;
    } catch (error) {
      this.status.errorCount++;
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        agentType: this.type,
        executionTime,
        error:
          error instanceof Error
            ? error.message
            : "Architecture analysis failed",
      };
    } finally {
      this.status.isExecuting = false;
      this.status.currentTask = undefined;
      this.status.lastExecution = new Date();
    }
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        type: "architecture",
        name: "Project Architecture Analysis",
        description:
          "Analyzes and suggests improvements to project structure and organization",
        supportedLanguages: [
          "typescript",
          "javascript",
          "python",
          "java",
          "csharp",
          "go",
        ],
        supportedFileTypes: [
          ".ts",
          ".js",
          ".py",
          ".java",
          ".cs",
          ".go",
          ".json",
          ".yaml",
          ".md",
        ],
        requiresContext: ["projectStructure", "dependencies"],
        outputTypes: ["analysisResults", "documentation", "suggestions"],
      },
      {
        type: "architecture",
        name: "Design Pattern Recognition",
        description: "Identifies and suggests appropriate design patterns",
        supportedLanguages: [
          "typescript",
          "javascript",
          "python",
          "java",
          "csharp",
        ],
        supportedFileTypes: [".ts", ".js", ".py", ".java", ".cs"],
        requiresContext: ["currentClass", "currentFunction", "surroundingCode"],
        outputTypes: ["analysisResults", "codeChanges", "alternatives"],
      },
      {
        type: "architecture",
        name: "Scalability Assessment",
        description:
          "Evaluates and suggests improvements for system scalability",
        supportedLanguages: [
          "typescript",
          "javascript",
          "python",
          "java",
          "go",
        ],
        supportedFileTypes: [".ts", ".js", ".py", ".java", ".go"],
        requiresContext: [
          "projectStructure",
          "dependencies",
          "architecturalPatterns",
        ],
        outputTypes: ["analysisResults", "documentation", "alternatives"],
      },
      {
        type: "architecture",
        name: "Technology Stack Optimization",
        description: "Reviews and suggests improvements to technology choices",
        supportedLanguages: ["*"],
        supportedFileTypes: [
          "package.json",
          "requirements.txt",
          "pom.xml",
          "go.mod",
        ],
        requiresContext: ["dependencies", "configFiles"],
        outputTypes: ["analysisResults", "suggestions", "alternatives"],
      },
    ];
  }

  validateContext(context: ContextData): { valid: boolean; reason?: string } {
    if (!context.projectRoot) {
      return { valid: false, reason: "No project root found" };
    }

    if (
      !context.projectStructure ||
      context.projectStructure.files.length === 0
    ) {
      return {
        valid: false,
        reason: "No project structure available for analysis",
      };
    }

    return { valid: true };
  }

  getStatus(): AgentStatus {
    return { ...this.status };
  }

  private determineAnalysisType(context: ContextData): string {
    // Determine what type of architectural analysis is most appropriate

    if ((context.projectStructure?.files.length || 0) < 5) {
      return "project_structure";
    }

    if (context.currentClass || context.currentFunction) {
      return "design_patterns";
    }

    if (
      (context.complexity || 0) > 15 ||
      (context.projectStructure?.files.length || 0) > 50
    ) {
      return "scalability";
    }

    if (
      context.dependencies?.production &&
      Object.keys(context.dependencies.production).length > 10
    ) {
      return "technology_stack";
    }

    if (
      context.architecturalPatterns?.length &&
      context.projectStructure?.files.length
    ) {
      return "architecture_review";
    }

    return "general";
  }

  private async analyzeProjectStructure(
    context: ContextData,
    cancellationToken?: vscode.CancellationToken,
    stream?: vscode.ChatResponseStream,
  ): Promise<AgentResult> {
    const prompt = this.buildProjectStructurePrompt(context);

    const llmResponse = await this.llmProvider.generateResponse({
      prompt,
      stream,
    });

    if (!llmResponse.success) {
      throw new Error(llmResponse.error);
    }

    return this.parseArchitecturalResponse(
      llmResponse.content!,
      "project_structure",
      context,
    );
  }

  private async analyzeDesignPatterns(
    context: ContextData,
    cancellationToken?: vscode.CancellationToken,
    stream?: vscode.ChatResponseStream,
  ): Promise<AgentResult> {
    const prompt = this.buildDesignPatternsPrompt(context);

    const llmResponse = await this.llmProvider.generateResponse({
      prompt,
      context,
      agentType: this.type,
      maxTokens: 1536,
      temperature: 0.2,
      stream: stream,
    });

    if (!llmResponse.success) {
      throw new Error(llmResponse.error);
    }

    return this.parseArchitecturalResponse(
      llmResponse.content!,
      "design_patterns",
      context,
    );
  }

  private async analyzeScalability(
    context: ContextData,
    cancellationToken?: vscode.CancellationToken,
    stream?: vscode.ChatResponseStream,
  ): Promise<AgentResult> {
    const prompt = this.buildScalabilityPrompt(context);

    const llmResponse = await this.llmProvider.generateResponse({
      prompt,
      context,
      agentType: this.type,
      maxTokens: 1536,
      temperature: 0.2,
      stream: stream,
    });

    if (!llmResponse.success) {
      throw new Error(llmResponse.error);
    }

    return this.parseArchitecturalResponse(
      llmResponse.content!,
      "scalability",
      context,
    );
  }

  private async analyzeTechnologyStack(
    context: ContextData,
    cancellationToken?: vscode.CancellationToken,
    stream?: vscode.ChatResponseStream,
  ): Promise<AgentResult> {
    const prompt = this.buildTechnologyStackPrompt(context);

    const llmResponse = await this.llmProvider.generateResponse({
      prompt,
      context,
      agentType: this.type,
      maxTokens: 1536,
      temperature: 0.2,
      stream: stream,
    });

    if (!llmResponse.success) {
      throw new Error(llmResponse.error);
    }

    return this.parseArchitecturalResponse(
      llmResponse.content!,
      "technology_stack",
      context,
    );
  }

  private async performArchitectureReview(
    context: ContextData,
    cancellationToken?: vscode.CancellationToken,
    stream?: vscode.ChatResponseStream,
  ): Promise<AgentResult> {
    const prompt = this.buildArchitectureReviewPrompt(context);

    const llmResponse = await this.llmProvider.generateResponse({
      prompt,
      context,
      agentType: this.type,
      maxTokens: 2048,
      temperature: 0.5,
      stream: stream,
    });

    if (!llmResponse.success) {
      throw new Error(llmResponse.error);
    }

    return this.parseArchitecturalResponse(
      llmResponse.content!,
      "architecture_review",
      context,
    );
  }

  private async performGeneralArchitecturalAnalysis(
    context: ContextData,
    cancellationToken?: vscode.CancellationToken,
    stream?: vscode.ChatResponseStream,
  ): Promise<AgentResult> {
    const prompt = this.buildGeneralArchitecturalPrompt(context);

    const llmResponse = await this.llmProvider.generateResponse({
      prompt,
      context,
      agentType: this.type,
      maxTokens: 2048,
      temperature: 0.5,
      stream: stream,
    });

    if (!llmResponse.success) {
      throw new Error(llmResponse.error);
    }

    return this.parseArchitecturalResponse(
      llmResponse.content!,
      "general",
      context,
    );
  }

  private buildProjectStructurePrompt(context: ContextData): string {
    return `Analyze the project structure and suggest improvements:

**Project Overview:**
- Root: ${context.projectRoot}
- Total files: ${context.projectStructure?.files.length || 0}
- Directories: ${context.projectStructure?.directories.join(", ") || "N/A"}
- Entry points: ${context.projectStructure?.entryPoints.join(", ") || "N/A"}
- Test files: ${context.projectStructure?.testFiles.length || 0}

**Current Dependencies:**
${this.formatDependencies(context.dependencies)}

**Analysis Required:**
1. Evaluate current folder structure
2. Suggest organizational improvements
3. Identify missing architectural components
4. Recommend best practices for project organization
5. Suggest separation of concerns improvements

Provide specific, actionable recommendations with reasoning.`;
  }

  private buildDesignPatternsPrompt(context: ContextData): string {
    return `Analyze the code for design pattern opportunities:

**Current Context:**
- File: ${context.currentFile}
- Class: ${context.currentClass || "N/A"}
- Function: ${context.currentFunction || "N/A"}
- Complexity: ${context.complexity}

**Code to Analyze:**
\`\`\`
${context.surroundingCode}
\`\`\`

**Analysis Required:**
1. Identify current design patterns in use
2. Suggest appropriate design patterns for improvement
3. Highlight code smells and anti-patterns
4. Recommend refactoring opportunities
5. Provide implementation examples

Focus on maintainability, extensibility, and SOLID principles.`;
  }

  private buildScalabilityPrompt(context: ContextData): string {
    return `Assess the project's scalability and suggest improvements:

**Project Metrics:**
- Files: ${context.projectStructure?.files.length || 0}
- Complexity: ${context.complexity}
- Dependencies: ${context.dependencies?.production ? Object.keys(context.dependencies.production).length : 0}
- Architectural patterns: ${context.architecturalPatterns?.join(", ") || "N/A"}

**Current Architecture:**
${this.formatProjectStructure(context.projectStructure)}

**Scalability Analysis Required:**
1. Identify potential bottlenecks
2. Suggest architectural patterns for scale
3. Recommend performance optimization strategies
4. Evaluate data flow and state management
5. Suggest infrastructure considerations
6. Identify areas for microservices decomposition

Provide both immediate and long-term scalability recommendations.`;
  }

  private buildTechnologyStackPrompt(context: ContextData): string {
    return `Review and optimize the technology stack:

**Current Stack:**
${this.formatDependencies(context.dependencies)}

**Configuration Files:**
${context.configFiles?.map((f) => `- ${f.path} (${f.type})`).join("\n") || "N/A"}

**Stack Analysis Required:**
1. Evaluate current technology choices
2. Identify outdated or problematic dependencies
3. Suggest modern alternatives and upgrades
4. Recommend additional tools and libraries
5. Assess security implications
6. Consider performance and bundle size impact

Provide migration strategies and risk assessments for suggested changes.`;
  }

  private buildArchitectureReviewPrompt(context: ContextData): string {
    return `Perform a comprehensive architecture review:

**Current Architecture:**
- Patterns: ${context.architecturalPatterns?.join(", ") || "N/A"}
- Structure: ${context.projectStructure?.directories.length || 0} directories, ${context.projectStructure?.files.length || 0} files
- Dependencies: ${context.dependencies?.production ? Object.keys(context.dependencies.production).length : 0} production dependencies

**Project Structure:**
${this.formatProjectStructure(context.projectStructure)}

**Review Areas:**
1. Architecture pattern adherence
2. Separation of concerns
3. Dependency management
4. Code organization
5. Testability and maintainability
6. Security architecture
7. Performance considerations

Provide a comprehensive assessment with prioritized recommendations.`;
  }

  private buildGeneralArchitecturalPrompt(context: ContextData): string {
    return `Provide general architectural guidance:

**Context:**
- File: ${context.currentFile}
- Project size: ${context.projectStructure?.files.length || 0} files
- Complexity: ${context.complexity}

**Current Code:**
\`\`\`
${context.surroundingCode}
\`\`\`

**Guidance Needed:**
1. Architectural best practices for this context
2. Code organization suggestions
3. Design principle applications
4. Future-proofing recommendations
5. Common pitfalls to avoid

Provide practical, context-aware architectural advice.`;
  }

  private parseArchitecturalResponse(
    content: string,
    analysisType: string,
    context: ContextData,
  ): AgentResult {
    // Parse the LLM response and extract structured information
    const lines = content.split("\n");
    const analysisResults: AnalysisResult[] = [];
    const suggestions: string[] = [];
    const alternatives: Alternative[] = [];
    const documentation: DocumentationOutput[] = [];

    const currentSection = "";
    let currentAnalysis: Partial<AnalysisResult> = {};
    let currentAlternative: Partial<Alternative> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Detect sections
      if (
        trimmedLine.toLowerCase().includes("issue:") ||
        trimmedLine.toLowerCase().includes("problem:")
      ) {
        if (currentAnalysis.title) {
          analysisResults.push(currentAnalysis as AnalysisResult);
        }
        currentAnalysis = {
          category: "architecture",
          severity: this.determineSeverity(trimmedLine),
          title: trimmedLine.replace(/^(issue:|problem:)/i, "").trim(),
        };
      } else if (
        trimmedLine.toLowerCase().includes("recommendation:") ||
        trimmedLine.toLowerCase().includes("suggestion:")
      ) {
        suggestions.push(
          trimmedLine.replace(/^(recommendation:|suggestion:)/i, "").trim(),
        );
      } else if (trimmedLine.toLowerCase().includes("alternative:")) {
        if (currentAlternative.title) {
          alternatives.push(currentAlternative as Alternative);
        }
        currentAlternative = {
          title: trimmedLine.replace(/^alternative:/i, "").trim(),
          pros: [],
          cons: [],
          complexity: "medium",
        };
      } else if (
        currentAnalysis.title &&
        !currentAnalysis.description &&
        trimmedLine
      ) {
        currentAnalysis.description = trimmedLine;
      }
    }

    // Add any remaining items
    if (currentAnalysis.title) {
      analysisResults.push(currentAnalysis as AnalysisResult);
    }
    if (currentAlternative.title) {
      alternatives.push(currentAlternative as Alternative);
    }

    // Generate architecture documentation
    if (
      analysisType === "architecture_review" ||
      analysisType === "project_structure"
    ) {
      documentation.push({
        type: "readme",
        path: "ARCHITECTURE.md",
        content: this.generateArchitectureDoc(content, context),
        format: "markdown",
        metadata: {
          title: "Architecture Analysis",
          author: "DevMind Architect Agent",
          lastUpdated: new Date(),
        },
      });
    }

    const confidence = this.calculateConfidence(analysisResults, suggestions);

    return {
      success: true,
      agentType: this.type,
      executionTime: 0, // Will be set by caller
      message: `Architecture analysis complete. Found ${analysisResults.length} issues and ${suggestions.length} recommendations.`,
      analysisResults,
      suggestions,
      alternatives,
      documentation,
      confidence,
      reasoning: `Performed ${analysisType} analysis based on project context and best practices`,
      nextSteps: this.generateNextSteps(analysisType, analysisResults),
    };
  }

  private formatDependencies(dependencies: any): string {
    const prod = Object.entries(dependencies.production || {}).map(
      ([name, version]) => `  ${name}: ${version}`,
    );
    const dev = Object.entries(dependencies.development || {}).map(
      ([name, version]) => `  ${name}: ${version}`,
    );

    return `Production:\n${prod.join("\n")}\n\nDevelopment:\n${dev.join("\n")}`;
  }

  private formatProjectStructure(structure: any): string {
    return `Directories: ${structure.directories.join(", ")}\nEntry points: ${structure.entryPoints.join(", ")}\nTest files: ${structure.testFiles.length}`;
  }

  private determineSeverity(
    text: string,
  ): "info" | "warning" | "error" | "critical" {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("critical") || lowerText.includes("severe"))
      return "critical";
    if (lowerText.includes("error") || lowerText.includes("major"))
      return "error";
    if (lowerText.includes("warning") || lowerText.includes("minor"))
      return "warning";
    return "info";
  }

  private calculateConfidence(
    analysisResults: AnalysisResult[],
    suggestions: string[],
  ): number {
    // Simple confidence calculation based on number of findings
    const totalFindings = analysisResults.length + suggestions.length;
    if (totalFindings === 0) return 0.3;
    if (totalFindings < 3) return 0.6;
    if (totalFindings < 6) return 0.8;
    return 0.9;
  }

  private generateArchitectureDoc(
    content: string,
    context: ContextData,
  ): string {
    return `# Architecture Analysis\n\n## Project Overview\n\n- **Root:** ${context.projectRoot}\n- **Files:** ${context.projectStructure?.files.length || 0}\n- **Patterns:** ${context.architecturalPatterns?.join(", ") || "N/A"}\n\n## Analysis Results\n\n${content}\n\n## Generated by DevMind Architect Agent\n\n*Last updated: ${new Date().toISOString()}*`;
  }

  private generateNextSteps(
    analysisType: string,
    analysisResults: AnalysisResult[],
  ): string[] {
    const steps: string[] = [];

    if (analysisType === "project_structure") {
      steps.push("Review and reorganize folder structure");
      steps.push("Implement suggested architectural patterns");
    }

    if (analysisType === "design_patterns") {
      steps.push("Refactor code to implement suggested patterns");
      steps.push("Add unit tests for refactored components");
    }

    if (analysisType === "scalability") {
      steps.push("Implement performance monitoring");
      steps.push("Plan for horizontal scaling");
    }

    const criticalIssues = analysisResults.filter(
      (r) => r.severity === "critical",
    );
    if (criticalIssues.length > 0) {
      steps.unshift("Address critical architectural issues immediately");
    }

    return steps;
  }

  private updateAverageExecutionTime(executionTime: number): void {
    const totalExecutions = this.status.successCount + this.status.errorCount;
    this.status.averageExecutionTime =
      (this.status.averageExecutionTime * (totalExecutions - 1) +
        executionTime) /
      totalExecutions;
  }
}
