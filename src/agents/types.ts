import * as vscode from 'vscode';
import { ContextData } from '../core/ContextAnalyzer';

/**
 * Available agent types in DevMind
 */
export type AgentType = 'default' | 'architect' | 'codesmith' | 'bughunter' | 'docguru' | 'gitmate' | 'devflow';

/**
 * Agent capability categories
 */
export type AgentCapabilityType = 
    | 'code_generation' 
    | 'code_analysis' 
    | 'documentation' 
    | 'architecture' 
    | 'debugging' 
    | 'git_operations' 
    | 'workflow_setup'
    | 'optimization'
    | 'test_generation'
    | 'function_implementation'
    | 'class_implementation'
    | 'code_completion'
    | 'boilerplate'
    | 'general'
    | 'refactoring'
    | 'testing'
    | 'security_analysis'
    | 'performance_optimization';

/**
 * Agent execution result
 */
export interface AgentResult {
    success: boolean;
    agentType: AgentType;
    executionTime: number;
    error?: string;
    
    // Output data
    message?: string;
    suggestions?: string[];
    codeChanges?: CodeChange[];
    documentation?: DocumentationOutput[];
    gitOperations?: GitOperation[];
    workflowFiles?: WorkflowFile[];
    analysisResults?: AnalysisResult[];
    
    // Context updates for chaining
    contextUpdates?: Partial<ContextData>;
    
    // Metadata
    confidence?: number;
    reasoning?: string;
    alternatives?: Alternative[];
    warnings?: string[];
    nextSteps?: string[];
}

/**
 * Agent capability definition
 */
export interface AgentCapability {
    type: AgentCapabilityType;
    name: string;
    description: string;
    supportedLanguages: string[];
    supportedFileTypes: string[];
    requiresContext: string[];
    outputTypes: string[];
}

/**
 * Code change representation
 */
export interface CodeChange {
    type: 'replace' | 'insert' | 'delete' | 'create_file' | 'rename_file';
    filePath: string;
    range?: vscode.Range;
    position?: vscode.Position;
    oldText?: string;
    newText?: string;
    description: string;
    confidence: number;
    reasoning?: string;
}

/**
 * Documentation output
 */
export interface DocumentationOutput {
    type: 'function' | 'class' | 'module' | 'api' | 'readme' | 'changelog';
    path: string;
    content: string;
    format: 'markdown' | 'jsdoc' | 'typescript' | 'plain';
    metadata?: {
        title?: string;
        author?: string;
        version?: string;
        lastUpdated?: Date;
    };
}

/**
 * Git operation
 */
export interface GitOperation {
    type: 'commit' | 'branch' | 'merge' | 'tag' | 'push' | 'pull' | 'stash';
    command: string;
    description: string;
    parameters?: Record<string, any>;
    requiresConfirmation: boolean;
    riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Workflow file (CI/CD, configs, etc.)
 */
export interface WorkflowFile {
    type: 'github_action' | 'gitlab_ci' | 'docker' | 'makefile' | 'npm_script' | 'config';
    path: string;
    content: string;
    description: string;
    dependencies?: string[];
    environment?: string[];
}

/**
 * Analysis result
 */
export type AnalysisCategory = 'bug' | 'performance' | 'security' | 'maintainability' | 'style' | 'architecture';

export interface AnalysisResult {
    category: AnalysisCategory;
    severity: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    description: string;
    location?: {
        file: string;
        line?: number;
        column?: number;
        range?: vscode.Range;
    };
    suggestion?: string;
    fixCommand?: string;
    references?: string[];
    tags?: string[];
}

/**
 * Alternative solution
 */
export interface Alternative {
    title: string;
    description: string;
    pros: string[];
    cons: string[];
    complexity: 'low' | 'medium' | 'high';
    timeEstimate?: string;
    implementation?: string;
}


/**
 * Interface for all agents in DevMind
 */
export interface IAgent {
    readonly type: AgentType;
    readonly name: string;
    readonly description: string;
    activate?(): Promise<void>;
    deactivate?(): Promise<void>;
    execute(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult>;
    getCapabilities(): AgentCapability[];
    updateConfiguration?(config: vscode.WorkspaceConfiguration): Promise<void>;
    validateContext?(context: ContextData, capabilityType: AgentCapabilityType): { valid: boolean; reason?: string };
    getStatus?(): AgentStatus;
}

/**
 * Agent status
 */
export interface AgentStatus {
    isReady: boolean;
    isExecuting: boolean;
    lastExecution?: Date;
    errorCount: number;
    successCount: number;
    averageExecutionTime: number;
    currentTask?: string;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
    enabled: boolean;
    priority: number;
    maxExecutionTime: number;
    retryCount: number;
    customPrompts?: Record<string, string>;
    parameters?: Record<string, any>;
}

/**
 * Agent execution context
 */
export interface AgentExecutionContext {
    workspaceRoot: string;
    activeDocument?: vscode.TextDocument;
    selection?: vscode.Selection;
    userInput?: string;
    previousResults?: AgentResult[];
    chainContext?: any;
}

/**
 * Agent prompt template
 */
export interface AgentPromptTemplate {
    system: string;
    user: string;
    examples?: PromptExample[];
    variables?: Record<string, string>;
}

/**
 * Prompt example for few-shot learning
 */
export interface PromptExample {
    input: string;
    output: string;
    explanation?: string;
}

/**
 * Agent metrics
 */
export interface AgentMetrics {
    executionCount: number;
    successRate: number;
    averageExecutionTime: number;
    averageConfidence: number;
    userSatisfactionScore?: number;
    commonFailureReasons: string[];
    performanceOverTime: PerformanceDataPoint[];
}

/**
 * Performance data point for metrics
 */
export interface PerformanceDataPoint {
    timestamp: Date;
    executionTime: number;
    success: boolean;
    confidence: number;
    contextComplexity: number;
}

/**
 * Agent learning data
 */
export interface AgentLearningData {
    userFeedback: UserFeedback[];
    successPatterns: Pattern[];
    failurePatterns: Pattern[];
    contextPreferences: ContextPreference[];
}

/**
 * User feedback on agent performance
 */
export interface UserFeedback {
    agentType: AgentType;
    executionId: string;
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    timestamp: Date;
    context: Partial<ContextData>;
}

/**
 * Pattern recognition for agent learning
 */
export interface Pattern {
    description: string;
    frequency: number;
    contextFeatures: string[];
    outcome: 'success' | 'failure';
    confidence: number;
}

/**
 * Context preference for personalization
 */
export interface ContextPreference {
    contextType: string;
    preferredAgent: AgentType;
    weight: number;
    userDefined: boolean;
}

/**
 * Agent communication message
 */
export interface AgentMessage {
    from: AgentType;
    to: AgentType | 'user' | 'system';
    type: 'request' | 'response' | 'notification' | 'error';
    content: any;
    timestamp: Date;
    correlationId?: string;
}

/**
 * Agent collaboration context
 */
export interface AgentCollaborationContext {
    primaryAgent: AgentType;
    supportingAgents: AgentType[];
    sharedContext: Record<string, any>;
    communicationLog: AgentMessage[];
    collaborationGoal: string;
}

/**
 * Agent registry entry
 */
export interface AgentRegistryEntry {
    type: AgentType;
    name: string;
    description: string;
    version: string;
    capabilities: AgentCapability[];
    dependencies: string[];
    configuration: AgentConfig;
    status: AgentStatus;
    metrics: AgentMetrics;
}

/**
 * Agent factory interface
 */
export interface IAgentFactory {
    createAgent(type: AgentType, config?: AgentConfig): IAgent;
    getAvailableAgents(): AgentType[];
    registerAgent(entry: AgentRegistryEntry): void;
    unregisterAgent(type: AgentType): void;
}

/**
 * Agent event types
 */
export type AgentEventType = 
    | 'agent_started'
    | 'agent_completed'
    | 'agent_failed'
    | 'agent_cancelled'
    | 'context_updated'
    | 'configuration_changed'
    | 'collaboration_started'
    | 'collaboration_ended';

/**
 * Agent event
 */
export interface AgentEvent {
    type: AgentEventType;
    agentType: AgentType;
    timestamp: Date;
    data?: any;
    correlationId?: string;
}

/**
 * Agent event listener
 */
export type AgentEventListener = (event: AgentEvent) => void | Promise<void>;

/**
 * Agent event emitter interface
 */
export interface IAgentEventEmitter {
    on(eventType: AgentEventType, listener: AgentEventListener): void;
    off(eventType: AgentEventType, listener: AgentEventListener): void;
    emit(event: AgentEvent): Promise<void>;
}

/**
 * Agent validation result
 */
export interface AgentValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}

/**
 * Agent health check result
 */
export interface AgentHealthCheck {
    healthy: boolean;
    issues: HealthIssue[];
    lastCheck: Date;
    nextCheck: Date;
}

/**
 * Health issue
 */
export interface HealthIssue {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'performance' | 'connectivity' | 'configuration' | 'resource';
    description: string;
    suggestion?: string;
    autoFixable: boolean;
}

/**
 * Agent resource usage
 */
export interface AgentResourceUsage {
    memoryUsage: number; // MB
    cpuUsage: number; // percentage
    networkRequests: number;
    diskIO: number; // MB
    executionTime: number; // ms
    timestamp: Date;
}