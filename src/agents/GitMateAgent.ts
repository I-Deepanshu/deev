import { IAgent, AgentType, AgentResult, AgentCapability } from './types';
import { ContextData } from '../core/ContextAnalyzer';
import * as vscode from 'vscode';
import { QwenLLMProvider } from '../llm/QwenLLMProvider';

export class GitMateAgent implements IAgent {
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

        if (context.command === 'git.createBranch') {
            const branchName = context.args?.['branch.name'];
            if (typeof branchName === 'string' && branchName.trim() !== '') {
                if (stream) stream.markdown(`Attempting to create branch: ${branchName}...`);
                const success = await this.createBranch(branchName, stream);
                return {
                    success: success,
                    agentType: this.type,
                    executionTime: 0,
                    message: success ? `Branch '${branchName}' created successfully.` : `Failed to create branch '${branchName}'.`,
                    suggestions: []
                };
            } else {
                const message = 'Branch name not provided or invalid for git.createBranch command.';
                if (stream) stream.markdown(message);
                return {
                    success: false,
                    agentType: this.type,
                    executionTime: 0,
                    message: message,
                    suggestions: []
                };
            }
        } else if (context.command === 'git.checkoutBranch') {
            const branchName = context.args?.['branch.name'];
            if (typeof branchName === 'string' && branchName.trim() !== '') {
                if (stream) stream.markdown(`Attempting to check out branch: ${branchName}...`);
                const success = await this.checkoutBranch(branchName, stream);
                return {
                    success: success,
                    agentType: this.type,
                    executionTime: 0,
                    message: success ? `Branch '${branchName}' checked out successfully.` : `Failed to check out branch '${branchName}'.`,
                    suggestions: []
                };
            } else {
                const message = 'Branch name not provided or invalid for git.checkoutBranch command.';
                if (stream) stream.markdown(message);
                return {
                    success: false,
                    agentType: this.type,
                    executionTime: 0,
                    message: message,
                    suggestions: []
                };
            }
        }

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
        const message = 'GitMateAgent is ready. Try staging some changes and asking for a commit message, or request a new branch.';
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
            },
            {
                type: 'git_operations',
                name: 'git.createBranch',
                description: 'Creates a new Git branch and checks it out.',
                supportedLanguages: [],
                supportedFileTypes: [],
                requiresContext: ['branch.name'],
                outputTypes: ['boolean']
            },
            {
                type: 'git_operations',
                name: 'git.checkoutBranch',
                description: 'Checks out an existing Git branch.',
                supportedLanguages: [],
                supportedFileTypes: [],
                requiresContext: ['branch.name'],
                outputTypes: ['boolean']
            }
        ];
    }

    private async generateCommitMessage(gitDiff: string, stream?: vscode.ChatResponseStream): Promise<string> {
        const prompt = `Generate a concise and descriptive Git commit message for the following changes:\n\n${gitDiff}\n\nCommit message:`;
        if (stream) {
            stream.markdown('Calling LLM for commit message...');
        }
        const response = await this.llmProvider.generateResponse({ prompt, stream });
        return response.content || '';
    }

    private async createBranch(branchName: string, stream?: vscode.ChatResponseStream): Promise<boolean> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                if (stream) stream.markdown('No workspace folder open.');
                return false;
            }
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                if (stream) stream.markdown('Git extension not found.');
                return false;
            }
            const git = gitExtension.exports.getAPI(1);
            if (!git) {
                if (stream) stream.markdown('Git API not available.');
                return false;
            }
            const repository = git.repositories[0];
            if (!repository) {
                if (stream) stream.markdown('No Git repository found.');
                return false;
            }

            await repository.createBranch(branchName, true); // true to checkout the new branch
            if (stream) stream.markdown(`Successfully created and checked out branch: ${branchName}`);
            return true;
        } catch (error) {
            console.error('Error creating branch:', error);
            if (stream) stream.markdown(`Failed to create branch: ${branchName}. Error: ${(error as Error).message}`);
            return false;
        }
    }

    private async checkoutBranch(branchName: string, stream?: vscode.ChatResponseStream): Promise<boolean> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                if (stream) stream.markdown('No workspace folder open.');
                return false;
            }
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                if (stream) stream.markdown('Git extension not found.');
                return false;
            }
            const git = gitExtension.exports.getAPI(1);
            if (!git) {
                if (stream) stream.markdown('Git API not available.');
                return false;
            }
            const repository = git.repositories[0];
            if (!repository) {
                if (stream) stream.markdown('No Git repository found.');
                return false;
            }

            await repository.checkout(branchName);
            if (stream) stream.markdown(`Successfully checked out branch: ${branchName}`);
            return true;
        } catch (error) {
            console.error('Error checking out branch:', error);
            if (stream) stream.markdown(`Failed to check out branch: ${branchName}. Error: ${(error as Error).message}`);
            return false;
        }
    }
}

export default GitMateAgent;