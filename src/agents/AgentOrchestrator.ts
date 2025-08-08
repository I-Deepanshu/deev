import * as vscode from 'vscode';
import { QwenLLMProvider, LLMResponse } from '../llm/QwenLLMProvider';
import { ContextAnalyzer, ContextData } from '../core/ContextAnalyzer';
import { AuditTrail } from '../core/AuditTrail';
import { AgentType, AgentResult, AgentCapability } from './types';
import { ArchitectAgent } from './ArchitectAgent';
import { CodeSmithAgent } from './CodeSmithAgent';
import { BugHunterAgent } from './BugHunterAgent';
import { DocGuruAgent } from './DocGuruAgent';
import GitMateAgent from './GitMateAgent';
import { DevFlowAgent } from './DevFlowAgent';

export class AgentOrchestrator {
    private agents: Map<AgentType, any> = new Map();
    private activeAgent: AgentType | null = null;
    private executionHistory: AgentExecution[] = [];
    
    constructor(
        private llmProvider: QwenLLMProvider,
        private contextAnalyzer: ContextAnalyzer,
        private auditTrail: AuditTrail
    ) {
        this.initializeAgents();
        this.activateAgents();
    }

    public async dispose(): Promise<void> {
        await this.deactivateAgents();
    }
    
    /**
     * Executes a specific agent with given context
     */
    async executeAgent(
        agentType: AgentType,
        context: ContextData,
        cancellationToken?: vscode.CancellationToken,
        stream?: vscode.ChatResponseStream
    ): Promise<AgentResult> {
        const startTime = Date.now();
        this.activeAgent = agentType;
        
        try {
            // Check if agent exists
            const agent = this.agents.get(agentType);
            if (!agent) {
                throw new Error(`Agent ${agentType} not found`);
            }
            
            // Check cancellation
            if (cancellationToken?.isCancellationRequested) {
                return {
                    success: false,
                    error: 'Operation was cancelled',
                    agentType,
                    executionTime: Date.now() - startTime
                };
            }
            
            // Validate agent capabilities against context
            const validation = this.validateAgentCapabilities(agentType, context);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.reason,
                    agentType,
                    executionTime: Date.now() - startTime
                };
            }
            
            // Execute the agent
            const result = await agent.execute(context, cancellationToken, stream);
            
            // Record execution
            const execution: AgentExecution = {
                agentType,
                context,
                result,
                timestamp: new Date(),
                executionTime: Date.now() - startTime,
                success: result.success
            };
            
            this.executionHistory.push(execution);
            await this.auditTrail.logAgentExecution(execution);
            
            return result;
            
        } catch (error) {
            const errorResult: AgentResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                agentType,
                executionTime: Date.now() - startTime
            };
            
            // Log error execution
            const execution: AgentExecution = {
                agentType,
                context,
                result: errorResult,
                timestamp: new Date(),
                executionTime: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
            
            this.executionHistory.push(execution);
            await this.auditTrail.logAgentExecution(execution);
            
            return errorResult;
        } finally {
            this.activeAgent = null;
        }
    }
    
    /**
     * Executes multiple agents in sequence
     */
    async executeAgentChain(
        agentChain: AgentType[],
        context: ContextData,
        cancellationToken?: vscode.CancellationToken
    ): Promise<AgentResult[]> {
        const results: AgentResult[] = [];
        let currentContext = { ...context };
        
        for (const agentType of agentChain) {
            if (cancellationToken?.isCancellationRequested) {
                break;
            }
            
            const result = await this.executeAgent(agentType, currentContext, cancellationToken);
            results.push(result);
            
            // Update context with previous agent's output
            if (result.success && result.contextUpdates) {
                currentContext = { ...currentContext, ...result.contextUpdates };
            }
            
            // Stop chain if an agent fails
            if (!result.success) {
                break;
            }
        }
        
        return results;
    }
    
    /**
     * Suggests the best agent for given context
     */
    suggestAgent(context: ContextData): { agentType: AgentType; confidence: number; reasoning: string } {
        const suggestions = this.getAllAgentSuggestions(context);
        const bestSuggestion = suggestions.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );
        
        return bestSuggestion;
    }
    
    /**
     * Gets all agent suggestions ranked by confidence
     */
    getAllAgentSuggestions(context: ContextData): Array<{ agentType: AgentType; confidence: number; reasoning: string }> {
        const suggestions: Array<{ agentType: AgentType; confidence: number; reasoning: string }> = [];
        
        // Architect Agent
        let confidence = 0;
        let reasoning = '';
        
        if (context.isArchitecturalFile) {
            confidence += 0.4;
            reasoning += 'Architectural file detected. ';
        }
        
        if ((context.architecturalPatterns?.length || 0) === 0 && (context.projectStructure?.files.length || 0) > 10) {
            confidence += 0.3;
            reasoning += 'Large project without clear architecture. ';
        }
        
        if ((context.complexity || 0) > 15) {
            confidence += 0.2;
            reasoning += 'High complexity suggests architectural review needed. ';
        }
        
        suggestions.push({ agentType: 'architect', confidence, reasoning: reasoning.trim() });
        
        // CodeSmith Agent
        confidence = 0;
        reasoning = '';
        
        if (context.selectedText && context.selectedText.length > 0) {
            confidence += 0.3;
            reasoning += 'Code selection suggests generation/modification need. ';
        }
        
        if (!context.hasErrors && !context.hasWarnings) {
            confidence += 0.2;
            reasoning += 'Clean code base ready for enhancement. ';
        }
        
        if (context.currentFunction) {
            confidence += 0.2;
            reasoning += 'Function context available for targeted code generation. ';
        }
        
        suggestions.push({ agentType: 'codesmith', confidence, reasoning: reasoning.trim() });
        
        // BugHunter Agent
        confidence = 0;
        reasoning = '';
        
        if (context.hasErrors) {
            confidence += 0.5;
            reasoning += 'Compilation errors detected. ';
        }
        
        if (context.hasWarnings) {
            confidence += 0.3;
            reasoning += 'Warnings present that need attention. ';
        }
        
        if ((context.complexity || 0) > 20) {
            confidence += 0.2;
            reasoning += 'Very high complexity may indicate bugs. ';
        }
        
        suggestions.push({ agentType: 'bughunter', confidence, reasoning: reasoning.trim() });
        
        // DocGuru Agent
        confidence = 0;
        reasoning = '';
        
        if (context.missingDocumentation) {
            confidence += 0.4;
            reasoning += 'Missing documentation detected. ';
        }
        
        if (context.currentFunction && !(context.surroundingCode?.includes('/**'))) {
            confidence += 0.3;
            reasoning += 'Function lacks proper documentation. ';
        }
        
        if (context.currentClass && !(context.surroundingCode?.includes('/**'))) {
            confidence += 0.3;
            reasoning += 'Class lacks proper documentation. ';
        }
        
        suggestions.push({ agentType: 'docguru', confidence, reasoning: reasoning.trim() });
        
        // GitMate Agent
        confidence = 0;
        reasoning = '';
        
        if (context.hasGitChanges) {
            confidence += 0.4;
            reasoning += 'Uncommitted changes detected. ';
        }
        
        if ((context.gitHistory?.uncommittedChanges.length || 0) > 5) {
            confidence += 0.3;
            reasoning += 'Many uncommitted files suggest need for git management. ';
        }
        
        if ((context.gitHistory?.recentCommits.length || 0) === 0) {
            confidence += 0.2;
            reasoning += 'No recent commits, may need git workflow setup. ';
        }
        
        suggestions.push({ agentType: 'gitmate', confidence, reasoning: reasoning.trim() });
        
        // DevFlow Agent
        confidence = 0;
        reasoning = '';
        
        if (context.isConfigFile) {
            confidence += 0.4;
            reasoning += 'Configuration file context suggests workflow setup. ';
        }
        
        if ((context.configFiles?.length || 0) === 0) {
            confidence += 0.3;
            reasoning += 'Missing configuration files. ';
        }
        
        if (!(context.configFiles?.some(f => f.type === 'ci/cd'))) {
            confidence += 0.2;
            reasoning += 'No CI/CD configuration detected. ';
        }
        
        suggestions.push({ agentType: 'devflow', confidence, reasoning: reasoning.trim() });
        
        // Sort by confidence
        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }
    
    /**
     * Gets agent capabilities
     */
    getAgentCapabilities(agentType: AgentType): AgentCapability[] {
        const agent = this.agents.get(agentType);
        return agent ? agent.getCapabilities() : [];
    }
    
    /**
     * Gets execution history
     */
    getExecutionHistory(limit?: number): AgentExecution[] {
        const history = [...this.executionHistory].reverse(); // Most recent first
        return limit ? history.slice(0, limit) : history;
    }
    
    /**
     * Gets execution statistics
     */
    getExecutionStats(): ExecutionStats {
        const total = this.executionHistory.length;
        const successful = this.executionHistory.filter(e => e.success).length;
        const failed = total - successful;
        
        const agentUsage = new Map<AgentType, number>();
        this.executionHistory.forEach(e => {
            agentUsage.set(e.agentType, (agentUsage.get(e.agentType) || 0) + 1);
        });
        
        const avgExecutionTime = total > 0 
            ? this.executionHistory.reduce((sum, e) => sum + e.executionTime, 0) / total 
            : 0;
        
        return {
            totalExecutions: total,
            successfulExecutions: successful,
            failedExecutions: failed,
            successRate: total > 0 ? (successful / total) * 100 : 0,
            averageExecutionTime: avgExecutionTime,
            agentUsage: Object.fromEntries(agentUsage),
            lastExecution: this.executionHistory[this.executionHistory.length - 1]?.timestamp
        };
    }
    
    /**
     * Updates configuration for all agents
     */
    async updateConfiguration(config: vscode.WorkspaceConfiguration): Promise<void> {
        // Update LLM provider
        this.llmProvider.updateConfig({
            apiUrl: config.get('qwenApiUrl', 'http://localhost:8000'),
            apiKey: config.get('apiKey', ''),
            timeout: config.get('timeout', 30000)
        });
        
        // Update each agent
        for (const [agentType, agent] of this.agents) {
            if (agent.updateConfiguration) {
                await agent.updateConfiguration(config);
            }
        }
    }
    
    /**
     * Clears execution history
     */
    clearHistory(): void {
        this.executionHistory = [];
    }
    
    /**
     * Gets currently active agent
     */
    getActiveAgent(): AgentType | null {
        return this.activeAgent;
    }
    
    /**
     * Initializes all agents
     */
    private async activateAgents(): Promise<void> {
        for (const [agentType, agent] of this.agents.entries()) {
            if (agent.activate) {
                await agent.activate();
            }
        }
    }

    private async deactivateAgents(): Promise<void> {
        for (const [agentType, agent] of this.agents.entries()) {
            if (agent.deactivate) {
                await agent.deactivate();
            }
        }
    }

    private initializeAgents(): void {
        this.agents.set('architect', new ArchitectAgent(this.llmProvider, this.contextAnalyzer));
        this.agents.set('codesmith', new CodeSmithAgent(this.llmProvider, this.contextAnalyzer));
        this.agents.set('bughunter', new BugHunterAgent(this.llmProvider, this.contextAnalyzer));
        this.agents.set('docguru', new DocGuruAgent(this.llmProvider));
        this.agents.set('gitmate', new GitMateAgent(this.llmProvider));
        this.agents.set('devflow', new DevFlowAgent(this.llmProvider));
    }
    
    /**
     * Validates agent capabilities against context
     */
    private validateAgentCapabilities(agentType: AgentType, context: ContextData): { valid: boolean; reason?: string } {
        const agent = this.agents.get(agentType);
        if (!agent) {
            return { valid: false, reason: `Agent ${agentType} not found` };
        }
        
        // Check if agent can handle the current context
        if (agent.validateContext) {
            return agent.validateContext(context);
        }
        
        return { valid: true };
    }
}

// Types and interfaces
export interface AgentExecution {
    agentType: AgentType;
    context: ContextData;
    result: AgentResult;
    timestamp: Date;
    executionTime: number;
    success: boolean;
    error?: string;
}

export interface ExecutionStats {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    agentUsage: Record<string, number>;
    lastExecution?: Date;
}