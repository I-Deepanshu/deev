import * as vscode from 'vscode';
import { QwenLLMProvider } from '../llm/QwenLLMProvider';
import { ContextData } from '../core/ContextAnalyzer';
import { AgentResult, AgentCapability, AgentCapabilityType, CodeChange, AnalysisResult, Alternative } from './types';

export class DocGuruAgent {
    constructor(private llmProvider: QwenLLMProvider) {}

    public getCapabilities(): AgentCapability[] {
        return [
            {
                type: 'documentation',
                name: 'Documentation Generation',
                description: 'Generates documentation for code.',
                supportedLanguages: ['*'],
                supportedFileTypes: ['*'],
                requiresContext: ['surroundingCode', 'selectedText', 'filePath'],
                outputTypes: ['documentation']
            },
            {
                type: 'documentation',
                name: 'Code Explanation',
                description: 'Explains complex code snippets.',
                supportedLanguages: ['*'],
                supportedFileTypes: ['*'],
                requiresContext: ['surroundingCode', 'selectedText', 'filePath'],
                outputTypes: ['message']
            }
        ];
    }

    public async generateDocumentation(context: ContextData, cancellationToken?: vscode.CancellationToken): Promise<AgentResult> {
        try {
            const prompt = this.createDocumentationPrompt(context);
            const llmResponse = await this.llmProvider.generateCode(prompt, context, context.language!);

            if (llmResponse.success && llmResponse.content) {
                return {
                    success: true,
                    documentation: [{
                        type: 'module',
                        path: context.filePath || 'unknown',
                        content: llmResponse.content,
                        format: 'markdown'
                    }],
                    agentType: 'docguru',
                    executionTime: llmResponse.metadata?.responseTime || 0,
                };
            } else {
                return {
                    success: false,
                    error: llmResponse.error || 'Documentation generation failed',
                    agentType: 'docguru',
                    executionTime: llmResponse.metadata?.responseTime || 0,
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'An unexpected error occurred during documentation generation',
                agentType: 'docguru',
                executionTime: 0,

            };
        }
    }

    public async explainCode(context: ContextData, cancellationToken?: vscode.CancellationToken): Promise<AgentResult> {
        try {
            const prompt = this.createExplanationPrompt(context);
            const llmResponse = await this.llmProvider.generateCode(prompt, context, context.language!);

            if (llmResponse.success && llmResponse.content) {
                return {
                    success: true,
                    message: llmResponse.content,
                    agentType: 'docguru',
                    executionTime: llmResponse.metadata?.responseTime || 0,
                };
            } else {
                return {
                    success: false,
                    error: llmResponse.error || 'Code explanation failed',
                    agentType: 'docguru',
                    executionTime: llmResponse.metadata?.responseTime || 0,
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'An unexpected error occurred during code explanation',
                agentType: 'docguru',
                executionTime: 0,
            };
        }
    }

    private createDocumentationPrompt(context: ContextData): string {
        let prompt = `Generate comprehensive documentation for the following ${context.language || 'code'}:

`;
        if (context.filePath) {
            prompt += `File: ${context.filePath}
`;
        }
        if (context.surroundingCode) {
            prompt += `\`\`\`${context.language}
${context.surroundingCode}
\`\`\`
`;
        }
        if (context.selectedText) {
            prompt += `Selected code:
\`\`\`${context.language}
${context.selectedText}
\`\`\`
`;
        }
        if (context.problemStatement) {
            prompt += `
Consider the following problem/request: ${context.problemStatement}
`;
        }
        prompt += `
The documentation should include:
- A brief overview of the code's purpose.
- Detailed explanation of functions/classes, their parameters, and return values.
- Usage examples if applicable.
- Any important considerations or dependencies.

Provide the documentation in Markdown format.`;
        return prompt;
    }

    private createExplanationPrompt(context: ContextData): string {
        let prompt = `Explain the following ${context.language || 'code'} in detail, focusing on its functionality, purpose, and any complex parts:

`;
        if (context.filePath) {
            prompt += `File: ${context.filePath}
`;
        }
        if (context.surroundingCode) {
            prompt += `\`\`\`${context.language}
${context.surroundingCode}
\`\`\`
`;
        }
        if (context.selectedText) {
            prompt += `Selected code:
\`\`\`${context.language}
${context.selectedText}
\`\`\`
`;
        }
        if (context.problemStatement) {
            prompt += `
Consider the following question/request: ${context.problemStatement}
`;
        }
        prompt += `
Provide a clear and concise explanation, suitable for a developer who might be unfamiliar with this specific code.`;
        return prompt;
    }
}