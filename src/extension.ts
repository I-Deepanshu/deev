import * as vscode from 'vscode';
import { DevMindManager } from './core/DevMindManager';
import { ContextAnalyzer } from './core/ContextAnalyzer';
import { AgentOrchestrator } from './agents/AgentOrchestrator';
import { QwenLLMProvider } from './llm/QwenLLMProvider';
import { PrivacyManager } from './core/PrivacyManager';
import { AuditTrail } from './core/AuditTrail';
import { PrivacyMode } from './core/PrivacyManager';
import { DevMindViewProvider } from './views/DevMindViewProvider';
import { AgentType } from './agents/types';
import { ContextData } from './core/ContextAnalyzer';

let devMindManager: DevMindManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('🧠 DevMind extension is now active!');
    
    // Initialize core components
    const config = vscode.workspace.getConfiguration('devmind');
    const privacyModeConfig = config.get<boolean>('privacyMode', true);
    const privacyMode = privacyModeConfig ? PrivacyMode.ENHANCED : PrivacyMode.STANDARD;
    const privacyManager = new PrivacyManager(privacyMode);
    const auditTrail = new AuditTrail(context.globalStorageUri);
    const llmProvider = new QwenLLMProvider(
        config.get('qwenApiUrl', 'http://localhost:8000'),
        config.get('apiKey', ''),
        privacyManager
    );
    
    const contextAnalyzer = new ContextAnalyzer();
    const agentOrchestrator = new AgentOrchestrator(llmProvider, contextAnalyzer, auditTrail);
    
    devMindManager = new DevMindManager(
        contextAnalyzer,
        agentOrchestrator,
        privacyManager,
        auditTrail
    );
    
    // Register view providers
    const viewProvider = new DevMindViewProvider(context.extensionUri, devMindManager);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('devmind.chat', viewProvider.getChatView()),
        vscode.window.registerWebviewViewProvider('devmind.context', viewProvider.getContextView()),
        vscode.window.registerWebviewViewProvider('devmind.history', viewProvider.getHistoryView())
    );
    
    // Register commands
    const commands = [
        vscode.commands.registerCommand('devmind.chat', async (prompt: string) => {
            // This command can be triggered by the chat participant
            // and will route the prompt to the appropriate agent.
            // For now, we'll just log it.
            console.log(`Chat command received: ${prompt}`);
            // You can add more sophisticated routing here based on the prompt
        }),
        vscode.commands.registerCommand('devmind.activateAgent', async () => {
            await devMindManager.activateContextualAgent();
        }),
        
        vscode.commands.registerCommand('devmind.architect', async () => {
            await devMindManager.runAgent('architect');
        }),
        
        vscode.commands.registerCommand('devmind.codesmith', async () => {
            await devMindManager.runAgent('codesmith');
        }),
        
        vscode.commands.registerCommand('devmind.bughunter', async () => {
            await devMindManager.runAgent('bughunter');
        }),
        
        vscode.commands.registerCommand('devmind.docguru', async () => {
            await devMindManager.runAgent('docguru');
        }),
        
        vscode.commands.registerCommand('devmind.gitmate', async () => {
            await devMindManager.runAgent('gitmate');
        }),
        
        vscode.commands.registerCommand('devmind.devflow', async () => {
            await devMindManager.runAgent('devflow');
        }),
        
        vscode.commands.registerCommand('devmind.codeReview', async () => {
            await devMindManager.performCodeReview();
        }),
        
        vscode.commands.registerCommand('devmind.refactor', async () => {
            await devMindManager.performRefactoring();
        }),
        
        vscode.commands.registerCommand('devmind.projectSummary', async () => {
            await devMindManager.generateProjectSummary();
        })
    ];
    
    context.subscriptions.push(...commands);

    // Register the chat participant
    context.subscriptions.push(
        vscode.chat.createChatParticipant('devmind.chat', async (request, chatContext, stream, token) => {
            // This is where you'll integrate with your AgentOrchestrator
            // You can parse the request.prompt and route it to the appropriate agent
            // For example, you might have a command like /gitmate to trigger GitMateAgent
            // Or use natural language processing to determine the intent.

            // Example: Simple routing based on a command
            if (request.prompt.startsWith('/gitmate')) {
                stream.markdown('Generating commit message...');
                const result = await devMindManager.runAgent(
                    'gitmate',
                    { git: { diff: request.prompt.substring('/gitmate '.length).trim(), status: '', branch: '', log: '' } },
                    stream // Pass the stream to the agent for direct output
                );
                // The agent should write directly to the stream, so no need to handle result here unless for error handling
            } else {
                stream.markdown('Hello! How can I help you today? Try @devmind /gitmate to generate a commit message.');
            }

            return {}; // Return an empty object or a more detailed ChatResult
        })
    );
    
    // Setup event listeners
    setupEventListeners(context);
    
    // Initialize status bar
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(brain) DevMind';
    statusBarItem.command = 'devmind.activateAgent';
    statusBarItem.tooltip = 'Activate DevMind AI Assistant';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    
    vscode.window.showInformationMessage('🧠 DevMind is ready! Your AI pair programmer is standing by.');
}

function setupEventListeners(context: vscode.ExtensionContext) {
    // Listen for text document changes for context analysis
    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (devMindManager) {
            await devMindManager.onDocumentChange(event);
        }
    });
    
    // Listen for active editor changes
    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (devMindManager && editor) {
            await devMindManager.onActiveEditorChange(editor);
        }
    });
    
    // Listen for configuration changes
    const onDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (event.affectsConfiguration('devmind')) {
            await devMindManager.onConfigurationChange();
        }
    });
    
    context.subscriptions.push(
        onDidChangeTextDocument,
        onDidChangeActiveTextEditor,
        onDidChangeConfiguration
    );
}

export function deactivate() {
    console.log('🧠 DevMind extension is now deactivated.');
    if (devMindManager) {
        devMindManager.dispose();
    }
}