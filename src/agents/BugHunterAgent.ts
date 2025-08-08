import * as vscode from 'vscode';
import { QwenLLMProvider } from '../llm/QwenLLMProvider';
import { ContextAnalyzer, ContextData } from '../core/ContextAnalyzer';
import { IAgent, AgentType, AgentResult, AgentCapability, AgentStatus, CodeChange, AnalysisResult, Alternative, AnalysisCategory } from './types';

export class BugHunterAgent implements IAgent {
    readonly type: AgentType = 'bughunter';
    readonly name: string = 'BugHunter';
    readonly description: string = 'Debugs contextually and explains root causes';
    
    private status: AgentStatus = {
        isReady: true,
        isExecuting: false,
        errorCount: 0,
        successCount: 0,
        averageExecutionTime: 0
    };
    
    constructor(
        private llmProvider: QwenLLMProvider,
        private contextAnalyzer: ContextAnalyzer
    ) {}
    
    async execute(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const startTime = Date.now();
        this.status.isExecuting = true;
        this.status.currentTask = 'Analyzing bugs';
        
        try {
            // Determine the type of debugging needed
            const debugType = this.determineDebugType(context);
            
            let result: AgentResult;
            
            switch (debugType) {
                case 'runtime_error':
                    result = await this.analyzeRuntimeError(context, cancellationToken);
                    break;
                case 'logic_error':
                    result = await this.analyzeLogicError(context, cancellationToken);
                    break;
                case 'performance_issue':
                    result = await this.analyzePerformanceIssue(context, cancellationToken);
                    break;
                case 'memory_leak':
                    result = await this.analyzeMemoryLeak(context, cancellationToken);
                    break;
                case 'async_issue':
                    result = await this.analyzeAsyncIssue(context, cancellationToken);
                    break;
                case 'type_error':
                    result = await this.analyzeTypeError(context, cancellationToken);
                    break;
                case 'integration_issue':
                    result = await this.analyzeIntegrationIssue(context, cancellationToken);
                    break;
                case 'security_vulnerability':
                    result = await this.analyzeSecurityVulnerability(context, cancellationToken);
                    break;
                default:
                    result = await this.performGeneralDebugging(context, cancellationToken);
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
                error: error instanceof Error ? error.message : 'Bug analysis failed'
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
                type: 'debugging',
                name: 'Runtime Error Analysis',
                description: 'Analyzes runtime errors and exceptions with stack trace analysis',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'csharp', 'go'],
                supportedFileTypes: ['.ts', '.js', '.py', '.java', '.cs', '.go'],
                requiresContext: ['surroundingCode', 'errorMessages'],
                outputTypes: ['analysisResults', 'codeChanges', 'suggestions']
            },
            {
                type: 'debugging',
                name: 'Logic Error Detection',
                description: 'Identifies logical errors and incorrect program behavior',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'csharp'],
                supportedFileTypes: ['.ts', '.js', '.py', '.java', '.cs'],
                requiresContext: ['currentFunction', 'surroundingCode', 'expectedBehavior'],
                outputTypes: ['analysisResults', 'codeChanges', 'alternatives']
            },
            {
                type: 'performance_optimization',
                name: 'Performance Issue Analysis',
                description: 'Identifies performance bottlenecks and optimization opportunities',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go'],
                supportedFileTypes: ['.ts', '.js', '.py', '.java', '.go'],
                requiresContext: ['surroundingCode', 'performanceMetrics'],
                outputTypes: ['analysisResults', 'suggestions', 'alternatives']
            },
            {
                type: 'debugging',
                name: 'Memory Leak Detection',
                description: 'Identifies potential memory leaks and resource management issues',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'csharp'],
                supportedFileTypes: ['.ts', '.js', '.py', '.java', '.cs'],
                requiresContext: ['surroundingCode', 'memoryUsage'],
                outputTypes: ['analysisResults', 'codeChanges']
            },
            {
                type: 'debugging',
                name: 'Async/Concurrency Issues',
                description: 'Analyzes asynchronous code and concurrency problems',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go'],
                supportedFileTypes: ['.ts', '.js', '.py', '.java', '.go'],
                requiresContext: ['surroundingCode', 'asyncPatterns'],
                outputTypes: ['analysisResults', 'codeChanges', 'suggestions']
            },
            {
                type: 'debugging',
                name: 'Type Error Analysis',
                description: 'Analyzes type-related errors and type safety issues',
                supportedLanguages: ['typescript', 'python', 'java', 'csharp'],
                supportedFileTypes: ['.ts', '.py', '.java', '.cs'],
                requiresContext: ['surroundingCode', 'typeDefinitions'],
                outputTypes: ['analysisResults', 'codeChanges']
            },
            {
                type: 'code_analysis',
                name: 'Security Vulnerability Detection',
                description: 'Identifies potential security vulnerabilities and unsafe practices',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'csharp'],
                supportedFileTypes: ['*'],
                requiresContext: ['surroundingCode', 'dependencies', 'securityContext'],
                outputTypes: ['analysisResults', 'suggestions', 'alternatives']
            }
        ];
    }
    
    validateContext(context: ContextData): { valid: boolean; reason?: string } {
        if (!context.currentFile) {
            return { valid: false, reason: 'No current file context available' };
        }
        
        if (!context.surroundingCode || context.surroundingCode.trim().length === 0) {
            return { valid: false, reason: 'No code available for analysis' };
        }
        
        return { valid: true };
    }
    
    getStatus(): AgentStatus {
        return { ...this.status };
    }
    
    private determineDebugType(context: ContextData): string {
        // Analyze context to determine the most likely type of bug
        
        // Check for error indicators in the code or context
        const code = context.surroundingCode?.toLowerCase() || '';
        const errorMessages = context.errorMessages || [];
        
        // Runtime errors
        if (errorMessages.some(msg => msg.includes('Error:') || msg.includes('Exception:'))) {
            return 'runtime_error';
        }
        
        // Type errors
        if (errorMessages.some(msg => msg.includes('Type') || msg.includes('type')) || 
            code.includes('typescript') || context.language === 'typescript') {
            return 'type_error';
        }
        
        // Performance issues
        if ((context.complexity && context.complexity > 15) || code.includes('performance') || code.includes('slow')) {
            return 'performance_issue';
        }
        
        // Memory leaks
        if (code.includes('memory') || code.includes('leak') || code.includes('gc')) {
            return 'memory_leak';
        }
        
        // Async issues
        if (code.includes('async') || code.includes('await') || code.includes('promise') || 
            code.includes('callback') || code.includes('settimeout')) {
            return 'async_issue';
        }
        
        // Security vulnerabilities
        if (code.includes('sql') || code.includes('eval') || code.includes('innerhtml') || 
            code.includes('password') || code.includes('token')) {
            return 'security_vulnerability';
        }
        
        // Integration issues
        if (code.includes('api') || code.includes('fetch') || code.includes('http') || 
            code.includes('request') || (context.dependencies?.production && Object.keys(context.dependencies.production).length > 10)) {
            return 'integration_issue';
        }
        
        // Default to logic error
        return 'logic_error';
    }
    
    private async analyzeRuntimeError(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildRuntimeErrorPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({ prompt, stream });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseDebuggingResponse(llmResponse.content!, 'runtime_error', context);
    }
    
    private async analyzeLogicError(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildLogicErrorPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseDebuggingResponse(llmResponse.content!, 'logic_error', context);
    }
    
    private async analyzePerformanceIssue(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildPerformancePrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseDebuggingResponse(llmResponse.content!, 'performance_issue', context);
    }
    
    private async analyzeMemoryLeak(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildMemoryLeakPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            stream: stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseDebuggingResponse(llmResponse.content!, 'memory_leak', context);
    }
    
    private async analyzeAsyncIssue(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildAsyncIssuePrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseDebuggingResponse(llmResponse.content!, 'async_issue', context);
    }
    
    private async analyzeTypeError(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildTypeErrorPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            maxTokens: 1536,
            temperature: 0.2,
            stream: stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseDebuggingResponse(llmResponse.content!, 'type_error', context);
    }
    
    private async analyzeIntegrationIssue(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildIntegrationIssuePrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseDebuggingResponse(llmResponse.content!, 'integration_issue', context);
    }
    
    private async analyzeSecurityVulnerability(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildSecurityPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            maxTokens: 2048,
            temperature: 0.3,
            stream: stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseDebuggingResponse(llmResponse.content!, 'security_vulnerability', context);
    }
    
    private async performGeneralDebugging(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildGeneralDebuggingPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            maxTokens: 2048,
            temperature: 0.5,
            stream: stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseDebuggingResponse(llmResponse.content!, 'general', context);
    }
    
    private buildRuntimeErrorPrompt(context: ContextData): string {
        return `Analyze the runtime error and provide debugging assistance:

**Error Context:**
- File: ${context.currentFile}
- Language: ${context.language}
- Function: ${context.currentFunction || 'Unknown'}

**Error Messages:**
${(context.errorMessages || []).join('\n')}

**Code with Error:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Analysis Required:**
1. Identify the root cause of the runtime error
2. Explain why the error occurs
3. Provide step-by-step debugging approach
4. Suggest specific fixes
5. Recommend preventive measures
6. Identify related potential issues

**Stack Trace Analysis:**
- Trace the execution flow
- Identify the exact failure point
- Analyze variable states at failure

Provide detailed debugging guidance with actionable solutions.`;
    }
    
    private buildLogicErrorPrompt(context: ContextData): string {
        return `Analyze the code for logical errors and incorrect behavior:

**Code Context:**
- File: ${context.currentFile}
- Function: ${context.currentFunction || 'Unknown'}
- Expected behavior: Not specified

**Code to Analyze:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Logic Analysis Required:**
1. Identify logical inconsistencies
2. Check for incorrect assumptions
3. Analyze control flow issues
4. Identify edge cases not handled
5. Check for off-by-one errors
6. Validate algorithm correctness
7. Analyze data flow problems

**Common Logic Error Patterns:**
- Incorrect loop conditions
- Wrong comparison operators
- Missing null/undefined checks
- Incorrect variable updates
- Faulty conditional logic

Provide specific fixes for identified logical errors.`;
    }
    
    private buildPerformancePrompt(context: ContextData): string {
        return `Analyze performance issues and bottlenecks:

**Performance Context:**
- File: ${context.currentFile}
- Complexity: ${context.complexity}
- Function: ${context.currentFunction || 'Unknown'}

**Code to Analyze:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Performance Analysis Required:**
1. Identify computational bottlenecks
2. Analyze time complexity issues
3. Check for inefficient algorithms
4. Identify memory usage problems
5. Analyze I/O operations
6. Check for unnecessary computations
7. Identify caching opportunities

**Performance Metrics to Consider:**
- Execution time
- Memory usage
- CPU utilization
- I/O operations
- Network requests

**Dependencies:**
${this.formatDependencies(context.dependencies)}

Provide specific optimization recommendations with performance impact estimates.`;
    }
    
    private buildMemoryLeakPrompt(context: ContextData): string {
        return `Analyze potential memory leaks and resource management issues:

**Memory Context:**
- File: ${context.currentFile}
- Language: ${context.language}
- Function: ${context.currentFunction || 'Unknown'}

**Code to Analyze:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Memory Analysis Required:**
1. Identify potential memory leaks
2. Check for unreleased resources
3. Analyze object lifecycle management
4. Check for circular references
5. Identify event listener leaks
6. Analyze closure-related memory issues
7. Check for DOM element retention

**Common Memory Leak Patterns:**
- Unclosed file handles
- Unremoved event listeners
- Circular object references
- Retained DOM elements
- Uncanceled timers/intervals
- Large object accumulation

Provide specific fixes for memory management issues.`;
    }
    
    private buildAsyncIssuePrompt(context: ContextData): string {
        return `Analyze asynchronous code issues and concurrency problems:

**Async Context:**
- File: ${context.currentFile}
- Language: ${context.language}
- Function: ${context.currentFunction || 'Unknown'}

**Code to Analyze:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Async Analysis Required:**
1. Identify race conditions
2. Check for deadlocks
3. Analyze promise chain issues
4. Check for unhandled rejections
5. Identify callback hell patterns
6. Analyze async/await usage
7. Check for blocking operations

**Common Async Issues:**
- Missing await keywords
- Incorrect promise handling
- Race conditions in shared state
- Unhandled promise rejections
- Blocking the event loop
- Incorrect error propagation

Provide specific fixes for asynchronous code issues.`;
    }
    
    private buildTypeErrorPrompt(context: ContextData): string {
        return `Analyze type-related errors and type safety issues:

**Type Context:**
- File: ${context.currentFile}
- Language: ${context.language}
- Function: ${context.currentFunction || 'Unknown'}

**Code to Analyze:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Type Analysis Required:**
1. Identify type mismatches
2. Check for missing type annotations
3. Analyze type casting issues
4. Check for null/undefined handling
5. Identify generic type problems
6. Analyze interface compliance
7. Check for type assertion safety

**Type Safety Checks:**
- Proper type annotations
- Null safety
- Type guards
- Interface implementations
- Generic constraints

Provide specific type fixes and safety improvements.`;
    }
    
    private buildIntegrationIssuePrompt(context: ContextData): string {
        return `Analyze integration and API-related issues:

**Integration Context:**
- File: ${context.currentFile}
- Dependencies: ${context.dependencies?.production ? Object.keys(context.dependencies.production).length : 0}

**Code to Analyze:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Integration Analysis Required:**
1. Identify API communication issues
2. Check for network error handling
3. Analyze data serialization problems
4. Check for authentication issues
5. Identify timeout and retry logic
6. Analyze dependency conflicts
7. Check for version compatibility

**Dependencies:**
${this.formatDependencies(context.dependencies)}

**Common Integration Issues:**
- Missing error handling
- Incorrect API endpoints
- Authentication failures
- Data format mismatches
- Network timeouts
- CORS issues

Provide specific fixes for integration problems.`;
    }
    
    private buildSecurityPrompt(context: ContextData): string {
        return `Analyze security vulnerabilities and unsafe practices:

**Security Context:**
- File: ${context.currentFile}
- Language: ${context.language}

**Code to Analyze:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Security Analysis Required:**
1. Identify injection vulnerabilities
2. Check for XSS vulnerabilities
3. Analyze authentication weaknesses
4. Check for data exposure risks
5. Identify insecure dependencies
6. Analyze input validation issues
7. Check for cryptographic weaknesses

**Security Vulnerability Patterns:**
- SQL injection
- Cross-site scripting (XSS)
- Insecure direct object references
- Missing authentication
- Weak cryptography
- Insecure deserialization

**Dependencies Security:**
${this.formatDependencies(context.dependencies)}

Provide specific security fixes and best practices.`;
    }
    
    private buildGeneralDebuggingPrompt(context: ContextData): string {
        return `Perform general debugging analysis:

**Context:**
- File: ${context.currentFile}
- Language: ${context.language}
- Complexity: ${context.complexity}

**Code to Debug:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**General Debugging Analysis:**
1. Identify potential issues
2. Check for common anti-patterns
3. Analyze code quality issues
4. Check for maintainability problems
5. Identify testing gaps
6. Analyze error handling
7. Check for documentation needs

Provide comprehensive debugging guidance and improvement suggestions.`;
    }
    
    private parseDebuggingResponse(content: string, debugType: string, context: ContextData): AgentResult {
        const analysisResults: AnalysisResult[] = [];
        const codeChanges: CodeChange[] = [];
        const suggestions: string[] = [];
        const alternatives: Alternative[] = [];
        
        const lines = content.split('\n');
        let currentIssue: Partial<AnalysisResult> = {};
        let currentFix: Partial<CodeChange> = {};
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Detect issues
            if (trimmedLine.toLowerCase().includes('issue:') || trimmedLine.toLowerCase().includes('bug:') || 
                trimmedLine.toLowerCase().includes('problem:')) {
                if (currentIssue.title) {
                    analysisResults.push(currentIssue as AnalysisResult);
                }
                currentIssue = {
                    category: this.mapDebugTypeToCategory(debugType) as AnalysisCategory,
                    severity: this.determineSeverity(trimmedLine),
                    title: trimmedLine.replace(/^(issue:|bug:|problem:)/i, '').trim()
                };
            }
            
            // Detect fixes
            else if (trimmedLine.toLowerCase().includes('fix:') || trimmedLine.toLowerCase().includes('solution:')) {
                suggestions.push(trimmedLine.replace(/^(fix:|solution:)/i, '').trim());
            }
            
            // Detect code blocks
            else if (trimmedLine.startsWith('```') && trimmedLine.length > 3) {
                // Code block detected - this would need more sophisticated parsing
                // For now, we'll create a placeholder code change
                if (currentFix.description) {
                    codeChanges.push(currentFix as CodeChange);
                }
                currentFix = {
                    type: 'replace',
                    filePath: context.currentFile!,
                    description: 'Bug fix based on analysis',
                    confidence: 0.8,
                    newText: '',
                };
            }
            
            // Add description to current issue
            else if (currentIssue.title && !currentIssue.description && trimmedLine) {
                currentIssue.description = trimmedLine;
            }
        }
        
        // Add any remaining items
        if (currentIssue.title) {
            analysisResults.push(currentIssue as AnalysisResult);
        }
        if (currentFix.description) {
            codeChanges.push(currentFix as CodeChange);
        }
        
        // Generate alternatives based on debug type
        if (debugType === 'performance_issue') {
            alternatives.push({
                title: 'Quick Performance Fix',
                description: 'Apply immediate optimizations with minimal code changes',
                pros: ['Fast implementation', 'Low risk', 'Immediate improvement'],
                cons: ['Limited impact', 'May not address root cause'],
                complexity: 'low',
                timeEstimate: 'low'
            });
            
            alternatives.push({
                title: 'Comprehensive Optimization',
                description: 'Redesign algorithm for optimal performance',
                pros: ['Maximum performance gain', 'Long-term solution', 'Better maintainability'],
                cons: ['Higher complexity', 'More testing required', 'Longer implementation'],
                complexity: 'high',
                timeEstimate: 'high'
            });
        }
        
        const confidence = this.calculateDebuggingConfidence(analysisResults, debugType);
        
        return {
            success: true,
            agentType: this.type,
            executionTime: 0, // Will be set by caller
            message: `Debugging analysis complete. Found ${analysisResults.length} issues and ${suggestions.length} potential fixes.`,
            analysisResults,
            codeChanges,
            suggestions,
            alternatives,
            confidence,
            reasoning: `Performed ${debugType} analysis using contextual debugging techniques`,
            nextSteps: this.generateDebuggingNextSteps(debugType, analysisResults)
        };
    }
    
    private formatDependencies(dependencies: any): string {
        const prod = Object.keys(dependencies.production || {}).slice(0, 5);
        const dev = Object.keys(dependencies.development || {}).slice(0, 3);
        return `Production: ${prod.join(', ')}\nDevelopment: ${dev.join(', ')}`;
    }
    
    private mapDebugTypeToCategory(debugType: string): string {
        switch (debugType) {
            case 'runtime_error':
            case 'logic_error':
            case 'type_error':
                return 'bug';
            case 'performance_issue':
                return 'performance';
            case 'memory_leak':
                return 'memory';
            case 'async_issue':
                return 'concurrency';
            case 'security_vulnerability':
                return 'security';
            case 'integration_issue':
                return 'integration';
            default:
                return 'general';
        }
    }
    
    private determineSeverity(text: string): 'info' | 'warning' | 'error' | 'critical' {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('critical') || lowerText.includes('severe') || lowerText.includes('security')) {
            return 'critical';
        }
        if (lowerText.includes('error') || lowerText.includes('major') || lowerText.includes('crash')) {
            return 'error';
        }
        if (lowerText.includes('warning') || lowerText.includes('minor') || lowerText.includes('performance')) {
            return 'warning';
        }
        return 'info';
    }
    
    private calculateDebuggingConfidence(analysisResults: AnalysisResult[], debugType: string): number {
        let confidence = 0.7; // Base confidence
        
        // Adjust based on number of findings
        if (analysisResults.length > 0) confidence += 0.1;
        if (analysisResults.length > 2) confidence += 0.1;
        
        // Adjust based on debug type specificity
        switch (debugType) {
            case 'runtime_error':
            case 'type_error':
                confidence += 0.1; // More deterministic
                break;
            case 'logic_error':
            case 'performance_issue':
                confidence += 0.05; // Somewhat deterministic
                break;
            case 'security_vulnerability':
                confidence += 0.15; // High confidence in security analysis
                break;
            default:
                break; // No adjustment
        }
        
        return Math.max(0.3, Math.min(0.95, confidence));
    }
    
    private generateDebuggingNextSteps(debugType: string, analysisResults: AnalysisResult[]): string[] {
        const steps: string[] = [];
        
        // Common first steps
        if (analysisResults.length > 0) {
            steps.push('Review identified issues in order of severity');
        }
        
        // Type-specific steps
        switch (debugType) {
            case 'runtime_error':
                steps.push('Reproduce the error in a controlled environment');
                steps.push('Add logging to trace execution flow');
                steps.push('Implement error handling');
                break;
            case 'logic_error':
                steps.push('Write unit tests to verify expected behavior');
                steps.push('Use debugger to step through logic');
                steps.push('Add assertions for assumptions');
                break;
            case 'performance_issue':
                steps.push('Profile the application to measure impact');
                steps.push('Implement performance monitoring');
                steps.push('Benchmark before and after optimizations');
                break;
            case 'memory_leak':
                steps.push('Use memory profiling tools');
                steps.push('Monitor memory usage over time');
                steps.push('Implement proper resource cleanup');
                break;
            case 'async_issue':
                steps.push('Add proper error handling for async operations');
                steps.push('Test with different timing scenarios');
                steps.push('Implement timeout mechanisms');
                break;
            case 'security_vulnerability':
                steps.push('Prioritize security fixes immediately');
                steps.push('Conduct security testing');
                steps.push('Update dependencies to secure versions');
                break;
        }
        
        // Common final steps
        steps.push('Test fixes thoroughly');
        steps.push('Update documentation if needed');
        
        return steps;
    }
    
    private updateAverageExecutionTime(executionTime: number): void {
        const totalExecutions = this.status.successCount + this.status.errorCount;
        this.status.averageExecutionTime = 
            (this.status.averageExecutionTime * (totalExecutions - 1) + executionTime) / totalExecutions;
    }
}