import { IAgent, AgentType, AgentResult, AgentCapability } from './types';
import { ContextData } from '../core/ContextAnalyzer';
import * as vscode from 'vscode';
import { QwenLLMProvider } from '../llm/QwenLLMProvider';

class GitMateAgent implements IAgent {
    readonly type: AgentType = 'gitmate';
    readonly name: string = 'GitMate Agent';
    readonly description: string = 'Assists with Git operations like commit message generation and branch management.';
    constructor(private llmProvider: QwenLLMProvider) {
        // The LLMProvider is now passed in the constructor
    }

    async activate(): Promise<void> {
        console.log('GitMateAgent activated');
    }

    async deactivate(): Promise<void> {
        console.log('GitMateAgent deactivated');
    }

    private async getGitDiff(): Promise<string | undefined> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return undefined;
            }
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                console.warn('Git extension not found.');
                return undefined;
            }
            const git = gitExtension.exports.getAPI(1);
            if (!git) {
                console.warn('Git API not available.');
                return undefined;
            }
            const repository = git.repositories[0]; // Assuming one repository for simplicity
            if (!repository) {
                return undefined;
            }
            // Get diff for staged changes
            const diff = await repository.diff(true); // true for cached (staged) changes
            return diff;
        } catch (error) {
            console.error('Error getting Git diff:', error);
            return undefined;
        }
    }

    async execute(context: ContextData, cancellationToken?: vscode.CancellationToken, stream?: vscode.ChatResponseStream): Promise<AgentResult> {
        console.log('GitMateAgent executing with context:', context);

        const gitDiff = await this.getGitDiff();

        if (gitDiff) {
            if (stream) {
                stream.markdown('Analyzing staged changes to generate commit message...');
            }
            const commitMessage = await this.generateCommitMessage(gitDiff, stream);
            return {
                success: true,
                agentType: this.type,
                executionTime: 0,
                message: `Generated commit message: ${commitMessage}`,
                suggestions: [`Consider committing with message: ${commitMessage}`]
            };
        }

        // If no specific action was taken, return a default message
        const message = 'GitMateAgent is ready. Try staging some changes and asking for a commit message.';
        if (stream) {
            stream.markdown(message);
        }
        return {
            success: true,
            agentType: this.type,
            executionTime: 0,
            message: message,
            suggestions: []
        };
    }

    getCapabilities(): AgentCapability[] {
        return [
            {
                type: 'git_operations',
                name: 'git.commitMessage',
                description: 'Generates a Git commit message based on staged changes.',
                supportedLanguages: [],
                supportedFileTypes: [],
                requiresContext: ['git.diff'],
                outputTypes: ['text']
            }
        ];
    }

    private async generateCommitMessage(gitDiff: string, stream?: vscode.ChatResponseStream): Promise<string> {
        const prompt = `Generate a concise and descriptive Git commit message for the following changes:\n\n${gitDiff}\n\nCommit message:`;
        if (stream) {
            stream.markdown('Calling LLM for commit message...');
        }
        const response = await this.llmProvider.sendRequest(prompt, stream);
        return response.content || '';
    }
}

export default GitMateAgent;