import * as vscode from 'vscode';
import { QwenLLMProvider } from '../llm/QwenLLMProvider';
import { ContextAnalyzer, ContextData } from '../core/ContextAnalyzer';
import { IAgent, AgentType, AgentResult, AgentCapability, AgentStatus, CodeChange, AnalysisResult, Alternative } from './types';

export class CodeSmithAgent implements IAgent {
    readonly type: AgentType = 'codesmith';
    readonly name: string = 'CodeSmith';
    readonly description: string = 'Generates clean, tested, and optimized code';
    
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
        this.status.currentTask = 'Generating code';
        
        try {
            // Determine the type of code generation needed
            const generationType = this.determineGenerationType(context);
            
            let result: AgentResult;
            
            switch (generationType) {
                case 'function_implementation':
                    result = await this.generateFunction(context, cancellationToken);
                    break;
                case 'class_implementation':
                    result = await this.generateClass(context, cancellationToken);
                    break;
                case 'test_generation':
                    result = await this.generateTests(context, cancellationToken);
                    break;
                case 'code_completion':
                    result = await this.completeCode(context, cancellationToken);
                    break;
                case 'optimization':
                    result = await this.optimizeCode(context, cancellationToken);
                    break;
                case 'refactoring':
                    result = await this.refactorCode(context, cancellationToken);
                    break;
                case 'boilerplate':
                    result = await this.generateBoilerplate(context, cancellationToken);
                    break;
                default:
                    result = await this.performGeneralCodeGeneration(context, cancellationToken);
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
                error: error instanceof Error ? error.message : 'Code generation failed'
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
                type: 'code_generation',
                name: 'Function Implementation',
                description: 'Generates complete function implementations with proper typing and error handling',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'csharp', 'go'],
                supportedFileTypes: ['.ts', '.js', '.py', '.java', '.cs', '.go'],
                requiresContext: ['currentFunction', 'surroundingCode'],
                outputTypes: ['codeChanges', 'analysisResults']
            },
            {
                type: 'code_generation',
                name: 'Class Implementation',
                description: 'Creates complete class structures with methods, properties, and documentation',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'csharp'],
                supportedFileTypes: ['.ts', '.js', '.py', '.java', '.cs'],
                requiresContext: ['currentClass', 'projectStructure'],
                outputTypes: ['codeChanges', 'documentation']
            },
            {
                type: 'testing',
                name: 'Test Generation',
                description: 'Generates comprehensive unit tests with edge cases and mocking',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java'],
                supportedFileTypes: ['.test.ts', '.spec.js', '.test.py', '.java'],
                requiresContext: ['currentFunction', 'currentClass', 'dependencies'],
                outputTypes: ['codeChanges', 'suggestions']
            },
            {
                type: 'code_completion',
                name: 'Smart Code Completion',
                description: 'Provides context-aware code completion and suggestions',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'csharp', 'go'],
                supportedFileTypes: ['*'],
                requiresContext: ['cursorPosition', 'surroundingCode'],
                outputTypes: ['codeChanges', 'suggestions']
            },
            {
                type: 'optimization',
                name: 'Code Optimization',
                description: 'Optimizes code for performance, readability, and maintainability',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go'],
                supportedFileTypes: ['.ts', '.js', '.py', '.java', '.go'],
                requiresContext: ['surroundingCode', 'dependencies'],
                outputTypes: ['codeChanges', 'analysisResults', 'alternatives']
            },
            {
                type: 'refactoring',
                name: 'Code Refactoring',
                description: 'Refactors code to improve structure while preserving functionality',
                supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'csharp'],
                supportedFileTypes: ['.ts', '.js', '.py', '.java', '.cs'],
                requiresContext: ['currentFunction', 'currentClass', 'surroundingCode'],
                outputTypes: ['codeChanges', 'analysisResults']
            }
        ];
    }
    
    validateContext(context: ContextData): { valid: boolean; reason?: string } {
        if (!context.currentFile) {
            return { valid: false, reason: 'No current file context available' };
        }
        
        if (!context.language) {
            return { valid: false, reason: 'Programming language not detected' };
        }
        
        return { valid: true };
    }
    
    getStatus(): AgentStatus {
        return { ...this.status };
    }
    
    private determineGenerationType(context: ContextData): string {
        // Determine what type of code generation is most appropriate
        
        if (context.currentFile?.includes('.test.') || context.currentFile?.includes('.spec.')) {
            return 'test_generation';
        }
        
        if (context.selectedText && context.selectedText.trim()) {
            if (context.selectedText.includes('TODO') || context.selectedText.includes('FIXME')) {
                return 'function_implementation';
            }
            return 'optimization';
        }
        
        if (context.currentFunction && !context.currentFunction.includes('{')) {
            return 'function_implementation';
        }
        
        if (context.currentClass && context.surroundingCode?.includes('class')) {
            return 'class_implementation';
        }
        
        if ((context.complexity || 0) > 10) {
            return 'refactoring';
        }
        
        if (context.cursorPosition && context.surroundingCode) {
            return 'code_completion';
        }
        
        if (context.projectStructure?.files.length && context.projectStructure.files.length < 5) {
            return 'boilerplate';
        }
        
        return 'general';
    }
    
    private async generateFunction(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildFunctionGenerationPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({ prompt, stream });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseCodeGenerationResponse(llmResponse.content!, 'function', context);
    }
    
    private async generateClass(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildClassGenerationPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseCodeGenerationResponse(llmResponse.content!, 'class', context);
    }
    
    private async generateTests(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildTestGenerationPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseCodeGenerationResponse(llmResponse.content!, 'test', context);
    }
    
    private async completeCode(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildCodeCompletionPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            maxTokens: 512,
            temperature: 0.1,
            stream: stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseCodeGenerationResponse(llmResponse.content!, 'completion', context);
    }
    
    private async optimizeCode(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildOptimizationPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseCodeGenerationResponse(llmResponse.content!, 'optimization', context);
    }
    
    private async refactorCode(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildRefactoringPrompt(context);
        
        const llmResponse = await this.llmProvider.generateResponse({
            prompt,
            context,
            agentType: this.type,
            stream
        });
        
        if (!llmResponse.success) {
            throw new Error(llmResponse.error);
        }
        
        return this.parseCodeGenerationResponse(llmResponse.content!, 'refactoring', context);
    }
    
    private async generateBoilerplate(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildBoilerplatePrompt(context);
        
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
        
        return this.parseCodeGenerationResponse(llmResponse.content!, 'boilerplate', context);
    }
    
    private buildFunctionGenerationPrompt(context: ContextData): string {
        return `Generate a complete function implementation:

**Context:**
- File: ${context.currentFile}
- Language: ${context.language}
- Function: ${context.currentFunction || 'New function'}

**Current Code:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Requirements:**
1. Generate a complete, working function
2. Include proper type annotations (if applicable)
3. Add comprehensive error handling
4. Include JSDoc/docstring comments
5. Follow language best practices
6. Ensure the function is testable
7. Consider edge cases and validation

**Dependencies Available:**
${this.formatDependencies(context.dependencies)}

Generate clean, production-ready code with proper documentation.`
    }
    
    private buildClassGenerationPrompt(context: ContextData): string {
        return `Generate a complete class implementation:

**Context:**
- File: ${context.currentFile}
- Language: ${context.language}
- Class: ${context.currentClass || 'New class'}

**Current Code:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Requirements:**
1. Generate a complete class with proper structure
2. Include constructor with parameter validation
3. Add public/private methods as appropriate
4. Include proper type annotations
5. Add comprehensive documentation
6. Follow SOLID principles
7. Include error handling
8. Make the class testable

**Project Patterns:**
${context.architecturalPatterns?.join(', ') || 'N/A'}

Generate a well-structured, maintainable class.`
    }
    
    private buildTestGenerationPrompt(context: ContextData): string {
        return `Generate comprehensive unit tests:

**Code to Test:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Context:**
- File: ${context.currentFile}
- Function/Class: ${context.currentFunction || context.currentClass}
- Language: ${context.language}

**Test Requirements:**
1. Generate complete test suite
2. Cover happy path scenarios
3. Include edge cases and error conditions
4. Add proper test descriptions
5. Use appropriate mocking where needed
6. Follow testing best practices
7. Include setup and teardown if needed
8. Test both positive and negative cases

**Testing Framework:**
${this.detectTestingFramework(context)}

Generate thorough, maintainable tests.`
    }
    
    private buildCodeCompletionPrompt(context: ContextData): string {
        return `Provide smart code completion:

**Current Context:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Cursor Position:** ${context.cursorPosition}
**Selected Text:** ${context.selectedText || 'None'}

**Completion Requirements:**
1. Analyze the current context
2. Provide the most likely completion
3. Ensure type safety
4. Follow established patterns
5. Consider available imports and dependencies
6. Maintain code style consistency

**Available Dependencies:**
${this.formatDependencies(context.dependencies)}

Provide the most appropriate code completion.`
    }
    
    private buildOptimizationPrompt(context: ContextData): string {
        return `Optimize the following code:

**Code to Optimize:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Context:**
- File: ${context.currentFile}
- Complexity: ${context.complexity}
- Performance concerns: ${(context.complexity || 0) > 15 ? 'High' : 'Medium'}

**Optimization Goals:**
1. Improve performance and efficiency
2. Enhance readability and maintainability
3. Reduce complexity where possible
4. Follow language-specific best practices
5. Maintain existing functionality
6. Consider memory usage
7. Optimize for the target environment

**Constraints:**
- Preserve existing API/interface
- Maintain backward compatibility
- Keep the same functionality

Provide optimized code with explanations for changes.`
    }
    
    private buildRefactoringPrompt(context: ContextData): string {
        return `Refactor the following code:

**Code to Refactor:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Context:**
- File: ${context.currentFile}
- Function: ${context.currentFunction}
- Class: ${context.currentClass}
- Complexity: ${context.complexity}

**Refactoring Goals:**
1. Improve code structure and organization
2. Extract reusable components
3. Reduce code duplication
4. Improve naming and clarity
5. Apply design patterns where appropriate
6. Enhance testability
7. Follow SOLID principles

**Architectural Patterns:**
${context.architecturalPatterns?.join(', ') || 'N/A'}

Provide refactored code that maintains functionality while improving structure.`
    }
    
    private buildBoilerplatePrompt(context: ContextData): string {
        return `Generate project boilerplate code:

**Project Context:**
- Root: ${context.projectRoot}
- Language: ${context.language}
- Files: ${context.projectStructure?.files.length}
- Type: ${this.detectProjectType(context)}

**Current Structure:**
${context.projectStructure?.directories?.join(', ') || 'N/A'}

**Boilerplate Requirements:**
1. Generate essential project files
2. Include proper configuration
3. Add basic folder structure
4. Include development dependencies
5. Add scripts and build configuration
6. Include linting and formatting setup
7. Add basic documentation
8. Follow industry standards

**Dependencies:**
${this.formatDependencies(context.dependencies)}

Generate a complete, production-ready project structure.`
    }
    
    private buildGeneralCodePrompt(context: ContextData): string {
        return `Generate appropriate code for the current context:

**Context:**
- File: ${context.currentFile}
- Language: ${context.language}
- Position: ${context.cursorPosition}

**Current Code:**
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

**Requirements:**
1. Analyze the current context
2. Generate appropriate code
3. Follow best practices
4. Ensure type safety
5. Add proper documentation
6. Consider error handling
7. Make code maintainable

Provide contextually appropriate code generation.`
    }
    
    private parseCodeGenerationResponse(content: string, generationType: string, context: ContextData): AgentResult {
        const codeChanges: CodeChange[] = [];
        const analysisResults: AnalysisResult[] = [];
        const suggestions: string[] = [];
        const alternatives: Alternative[] = [];
        
        // Extract code blocks from the response
        const codeBlockRegex = /```(?:${context.language})?\n([\s\S]*?)\n```/g;
        let match;
        let codeIndex = 0;
        
        while ((match = codeBlockRegex.exec(content)) !== null) {
            const code = match[1].trim();
            if (code) {
                codeChanges.push({
                    type: this.determineChangeType(generationType),
                    filePath: context.currentFile!,
                    position: new vscode.Position(context.cursorPosition?.line || 1, context.cursorPosition?.character || 0),
                    newText: code,
                    description: `Generated ${generationType} code`,
                    confidence: this.calculateCodeConfidence(code, context)
                });
                codeIndex++;
            }
        }
        
        // Extract suggestions and analysis
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.toLowerCase().includes('suggestion:') || trimmedLine.toLowerCase().includes('tip:')) {
                suggestions.push(trimmedLine.replace(/^(suggestion:|tip:)/i, '').trim());
            } else if (trimmedLine.toLowerCase().includes('note:') || trimmedLine.toLowerCase().includes('important:')) {
                analysisResults.push({
                    category: 'maintainability',
                    severity: 'info',
                    title: 'Code Generation Note',
                    description: trimmedLine.replace(/^(note:|important:)/i, '').trim()
                });
            }
        }
        
        // Generate alternatives for optimization and refactoring
        if (generationType === 'optimization' || generationType === 'refactoring') {
            alternatives.push({
                title: 'Conservative Approach',
                description: 'Minimal changes with maximum compatibility',
                pros: ['Lower risk', 'Easier to review', 'Maintains existing patterns'],
                cons: ['Limited improvement', 'May not address all issues'],
                complexity: 'low',
                timeEstimate: 'high'
            });
        }
        
        const confidence = this.calculateOverallConfidence(codeChanges, generationType);
        
        return {
            success: true,
            agentType: this.type,
            executionTime: 0, // Will be set by caller
            message: `Code generation complete. Generated ${codeChanges.length} code changes for ${generationType}.`,
            codeChanges,
            analysisResults,
            suggestions,
            alternatives,
            confidence,
            reasoning: `Generated ${generationType} code based on context analysis and best practices`,
            nextSteps: this.generateNextSteps(generationType, codeChanges)
        };
    }
    
    private formatDependencies(dependencies: any): string {
        const prod = Object.keys(dependencies.production || {}).slice(0, 5);
        const dev = Object.keys(dependencies.development || {}).slice(0, 5);
        return `Production: ${prod.join(', ')}\nDevelopment: ${dev.join(', ')}`;
    }
    
    private detectTestingFramework(context: ContextData): string {
        const deps = { ...(context.dependencies?.production || {}), ...(context.dependencies?.development || {}) };
        
        if (deps.jest) return 'Jest';
        if (deps.mocha) return 'Mocha';
        if (deps.vitest) return 'Vitest';
        if (deps.pytest) return 'PyTest';
        if (deps.junit) return 'JUnit';
        
        // Default based on language
        switch (context.language) {
            case 'typescript':
            case 'javascript':
                return 'Jest';
            case 'python':
                return 'PyTest';
            case 'java':
                return 'JUnit';
            default:
                return 'Standard testing framework';
        }
    }
    
    private detectProjectType(context: ContextData): string {
        const files = context.projectStructure?.files || [];
        
        if (files.some(f => f.path.includes('package.json'))) {
            if (files.some(f => f.path.includes('next.config'))) return 'Next.js';
            if (files.some(f => f.path.includes('vite.config'))) return 'Vite';
            if (files.some(f => f.path.includes('webpack.config'))) return 'Webpack';
            return 'Node.js';
        }
        
        if (files.some(f => f.path.includes('requirements.txt') || f.path.includes('pyproject.toml'))) {
            return 'Python';
        }
        
        if (files.some(f => f.path.includes('pom.xml') || f.path.includes('build.gradle'))) {
            return 'Java';
        }
        
        if (files.some(f => f.path.includes('go.mod'))) {
            return 'Go';
        }
        
        return 'Generic';
    }
    
    private determineChangeType(generationType: string): 'replace' | 'insert' | 'delete' | 'create_file' | 'rename_file' {
        switch (generationType) {
            case 'function_implementation':
            case 'class_implementation':
            case 'boilerplate':
                return 'insert';
            case 'optimization':
            case 'refactoring':
                return 'replace';
            case 'test_generation':
                return 'create_file';
            default:
                return 'replace'; // Default to replace for unknown types
        }
    }
    
    private calculateCodeConfidence(code: string, context: ContextData): number {
        let confidence = 0.7; // Base confidence
        
        // Increase confidence based on code quality indicators
        if (code.includes('/**') || code.includes('"""')) confidence += 0.1; // Documentation
        if (code.includes('try') || code.includes('catch') || code.includes('except')) confidence += 0.1; // Error handling
        if (code.includes('test') || code.includes('expect') || code.includes('assert')) confidence += 0.1; // Tests
        if (code.includes('interface') || code.includes('type') || code.includes(':')) confidence += 0.05; // Type safety
        
        // Decrease confidence for potential issues
        if (code.includes('any') || code.includes('TODO') || code.includes('FIXME')) confidence -= 0.1;
        if (code.length < 50) confidence -= 0.1; // Too short
        if (code.length > 2000) confidence -= 0.05; // Very long
        
        return Math.max(0.3, Math.min(0.95, confidence));
    }
    
    private calculateOverallConfidence(codeChanges: CodeChange[], generationType: string): number {
        if (codeChanges.length === 0) return 0.3;
        
        const avgConfidence = codeChanges.reduce((sum, change) => sum + change.confidence, 0) / codeChanges.length;
        
        // Adjust based on generation type
        switch (generationType) {
            case 'completion':
                return Math.min(0.9, avgConfidence + 0.1);
            case 'test_generation':
                return Math.min(0.85, avgConfidence);
            case 'optimization':
            case 'refactoring':
                return Math.min(0.8, avgConfidence);
            default:
                return avgConfidence;
        }
    }
    
    private generateNextSteps(generationType: string, codeChanges: CodeChange[]): string[] {
        const steps: string[] = [];
        
        if (codeChanges.length > 0) {
            steps.push('Review generated code for accuracy');
        }
        
        switch (generationType) {
            case 'function_implementation':
            case 'class_implementation':
                steps.push('Add unit tests for new code');
                steps.push('Update documentation');
                break;
            case 'test_generation':
                steps.push('Run tests to verify they pass');
                steps.push('Check test coverage');
                break;
            case 'optimization':
                steps.push('Benchmark performance improvements');
                steps.push('Verify functionality is preserved');
                break;
            case 'refactoring':
                steps.push('Run existing tests');
                steps.push('Update related documentation');
                break;
            case 'boilerplate':
                steps.push('Install dependencies');
                steps.push('Configure development environment');
                break;
        }
        
        return steps;
    }
    
    private updateAverageExecutionTime(executionTime: number): void {
        const totalExecutions = this.status.successCount + this.status.errorCount;
        this.status.averageExecutionTime = 
            (this.status.averageExecutionTime * (totalExecutions - 1) + executionTime) / totalExecutions;
    }

    private async performGeneralCodeGeneration(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        const prompt = this.buildGeneralCodePrompt(context);
        
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
        
        return this.parseCodeGenerationResponse(llmResponse.content!, 'general', context);
    }
}