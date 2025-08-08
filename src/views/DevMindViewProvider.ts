import * as vscode from "vscode";
import { DevMindManager } from "../core/DevMindManager";

/**
 * DevMindViewProvider class for managing the extension's webview panels
 * Provides views for agents, context analysis, and audit history
 */
export class DevMindViewProvider {
  private chatView: ChatViewProvider;
  private contextView: ContextViewProvider;
  private historyView: HistoryViewProvider;

  /**
   * Creates a new DevMindViewProvider instance
   * @param extensionUri The extension's URI
   * @param devMindManager The DevMindManager instance
   */
  constructor(
    private extensionUri: vscode.Uri,
    private devMindManager: DevMindManager,
  ) {
    this.chatView = new ChatViewProvider(extensionUri, devMindManager);
    this.contextView = new ContextViewProvider(extensionUri, devMindManager);
    this.historyView = new HistoryViewProvider(extensionUri, devMindManager);
  }

  /**
   * Gets the agents view provider
   * @returns The agents view provider
   */
  getChatView(): vscode.WebviewViewProvider {
    return this.chatView;
  }

  /**
   * Gets the context view provider
   * @returns The context view provider
   */
  getContextView(): vscode.WebviewViewProvider {
    return this.contextView;
  }

  /**
   * Gets the history view provider
   * @returns The history view provider
   */
  getHistoryView(): vscode.WebviewViewProvider {
    return this.historyView;
  }
}

/**
 * ChatViewProvider class for displaying the chat interface
 */
class ChatViewProvider implements vscode.WebviewViewProvider {
  /**
   * Creates a new AgentsViewProvider instance
   * @param extensionUri The extension's URI
   * @param devMindManager The DevMindManager instance
   */
  constructor(
    private extensionUri: vscode.Uri,
    private devMindManager: DevMindManager,
  ) {}

  /**
   * Resolves the webview view
   * @param webviewView The webview view to resolve
   * @param context The webview view resolution context
   * @param token A cancellation token
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    this.devMindManager.setWebview(webviewView.webview);
    webviewView.webview.html = this.getChatViewHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "sendMessage":
          await this.devMindManager.handleChatMessage(message.text);
          break;
      }
    });
  }

  /**
   * Gets the HTML for the chat view
   * @param webview The webview to get HTML for
   * @returns The HTML for the chat view
   */
  private getChatViewHtml(webview: vscode.Webview): string {
    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>DevMind Chat</title>
                <style>
                    .header {
                        display: flex;
                        align-items: center;
                        padding-bottom: 10px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        margin-bottom: 10px;
                    }
                    .logo {
                        height: 30px;
                        margin-right: 10px;
                    }
                    .title {
                        font-size: 1.5em;
                        font-weight: bold;
                    }
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        padding: 10px;
                        margin: 0;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    .chat-container {
                        display: flex;
                        flex-direction: column;
                        flex-grow: 1;
                    }
                    .messages {
                        flex-grow: 1;
                        overflow-y: auto;
                        border: 1px solid var(--vscode-panel-border);
                        padding: 10px;
                        margin-bottom: 10px;
                        border-radius: 5px;
                        background-color: var(--vscode-editor-background);
                    }
                    .message-input-container {
                        display: flex;
                        padding-top: 10px;
                        border-top: 1px solid var(--vscode-panel-border);
                    }
                    .message-input {
                        flex-grow: 1;
                        padding: 8px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 3px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                    }
                    .send-button {
                        margin-left: 5px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 12px;
                        border-radius: 3px;
                        cursor: pointer;
                    }
                    .button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .chat-container {
                        display: flex;
                        flex-direction: column;
                        height: calc(100vh - 20px); /* Adjust based on padding */
                    }
                    .messages {
                        flex-grow: 1;
                        overflow-y: auto;
                        border: 1px solid var(--vscode-panel-border);
                        padding: 10px;
                        margin-bottom: 10px;
                        border-radius: 5px;
                    }
                    .message-input-container {
                        display: flex;
                    }
                    .message-input {
                        flex-grow: 1;
                        padding: 8px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 3px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                    }
                    .send-button {
                        margin-left: 5px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 12px;
                        border-radius: 3px;
                        cursor: pointer;
                    }
                    .send-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${webview.asWebviewUri(
                      this.extensionUri.with({
                        path:
                          this.extensionUri.path + "/media/devmind-logo.svg",
                      }),
                    )}" class="logo" alt="DevMind Logo">
                    <div class="title">DevMind Chat</div>
                </div>
                <div class="chat-container">
                    <div class="messages" id="messages"></div>
                    <div class="message-input-container">
                        <select class="agent-select" id="agentSelect">
                            <option value="default">Default Agent</option>
                            <option value="architect">Architect Agent</option>
                            <option value="bughunter">BugHunter Agent</option>
                            <option value="codesmith">CodeSmith Agent</option>
                            <option value="devflow">DevFlow Agent</option>
                            <option value="docguru">DocGuru Agent</option>
                            <option value="gitmate">GitMate Agent</option>
                        </select>
                        <input type="text" class="message-input" id="messageInput" placeholder="Type your message...">
                        <button class="send-button" id="sendButton">Send</button>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const messageInput = document.getElementById('messageInput');
                    const sendButton = document.getElementById('sendButton');
                    const messagesContainer = document.getElementById('messages');
                    const agentSelect = document.getElementById('agentSelect');

                    sendButton.addEventListener('click', () => {
                        const text = messageInput.value;
                        const selectedAgent = agentSelect.value;
                        if (text.trim()) {
                            vscode.postMessage({
                                command: 'sendMessage',
                                text: text,
                                agent: selectedAgent
                            });
                            messageInput.value = '';
                            // Display user message immediately
                            messagesContainer.innerHTML += '<p><strong>You:</strong> ' + text + '</p>';
                            messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
                        }
                    });

                    messageInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            sendButton.click();
                        }
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'response':
                                messagesContainer.innerHTML += '<p><strong>DevMind:</strong> ' + message.text + '</p>';
                                messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
  }
}

/**
 * ContextViewProvider class for displaying context analysis results
 */
class ContextViewProvider implements vscode.WebviewViewProvider {
  /**
   * Creates a new ContextViewProvider instance
   * @param extensionUri The extension's URI
   * @param devMindManager The DevMindManager instance
   */
  constructor(
    private extensionUri: vscode.Uri,
    private devMindManager: DevMindManager,
  ) {}

  /**
   * Resolves the webview view
   * @param webviewView The webview view to resolve
   * @param context The webview view resolution context
   * @param token A cancellation token
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getContextViewHtml(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "refreshContext":
          webviewView.webview.html = this.getContextViewHtml(
            webviewView.webview,
          );
          break;
      }
    });

    // Refresh view when active editor changes
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(
      () => {
        if (webviewView.visible) {
          webviewView.webview.html = this.getContextViewHtml(
            webviewView.webview,
          );
        }
      },
    );

    // Clear disposables when view is disposed
    webviewView.onDidDispose(() => {
      editorChangeDisposable.dispose();
    });
  }

  /**
   * Gets the HTML for the context view
   * @param webview The webview to get HTML for
   * @returns The HTML for the context view
   */
  private getContextViewHtml(webview: vscode.Webview): string {
    // In a real implementation, this would get context data from DevMindManager
    const editor = vscode.window.activeTextEditor;
    const fileName = editor
      ? editor.document.fileName.split(/[\\/]/).pop()
      : "No file open";
    const language = editor ? editor.document.languageId : "unknown";

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Context Analysis</title>
                <style>
                    .header {
                        display: flex;
                        align-items: center;
                        padding-bottom: 10px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        margin-bottom: 10px;
                    }
                    .logo {
                        height: 30px;
                        margin-right: 10px;
                    }
                    .title {
                        font-size: 1.5em;
                        font-weight: bold;
                    }
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        padding: 10px;
                    }
                    .context-section {
                        margin-bottom: 15px;
                    }
                    .context-header {
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .context-item {
                        display: flex;
                        margin-bottom: 5px;
                    }
                    .context-label {
                        font-weight: bold;
                        margin-right: 5px;
                        min-width: 100px;
                    }
                    .context-value {
                        flex: 1;
                    }
                    .button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 5px 10px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 0.9em;
                        margin-top: 10px;
                    }
                    .button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${webview.asWebviewUri(
                      this.extensionUri.with({
                        path:
                          this.extensionUri.path + "/media/devmind-logo.svg",
                      }),
                    )}" class="logo" alt="DevMind Logo">
                    <div class="title">Context Analysis</div>
                </div>
                
                <div class="context-section">
                    <div class="context-header">Current File</div>
                    <div class="context-item">
                        <div class="context-label">File:</div>
                        <div class="context-value">${fileName}</div>
                    </div>
                    <div class="context-item">
                        <div class="context-label">Language:</div>
                        <div class="context-value">${language}</div>
                    </div>
                </div>
                
                <div class="context-section">
                    <div class="context-header">Code Understanding</div>
                    <div class="context-item">
                        <div class="context-label">Function:</div>
                        <div class="context-value">getCurrentFunction()</div>
                    </div>
                    <div class="context-item">
                        <div class="context-label">Scope:</div>
                        <div class="context-value">Global</div>
                    </div>
                </div>
                
                <div class="context-section">
                    <div class="context-header">Project Context</div>
                    <div class="context-item">
                        <div class="context-label">Project:</div>
                        <div class="context-value">DevMind</div>
                    </div>
                    <div class="context-item">
                        <div class="context-label">Dependencies:</div>
                        <div class="context-value">5 production, 5 development</div>
                    </div>
                </div>
                
                <button class="button" id="refresh-button">Refresh Context</button>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('refresh-button').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'refreshContext'
                        });
                    });
                </script>
            </body>
            </html>
        `;
  }
}

/**
 * HistoryViewProvider class for displaying audit trail history
 */
class HistoryViewProvider implements vscode.WebviewViewProvider {
  /**
   * Creates a new HistoryViewProvider instance
   * @param extensionUri The extension's URI
   * @param devMindManager The DevMindManager instance
   */
  constructor(
    private extensionUri: vscode.Uri,
    private devMindManager: DevMindManager,
  ) {}

  /**
   * Resolves the webview view
   * @param webviewView The webview view to resolve
   * @param context The webview view resolution context
   * @param token A cancellation token
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHistoryViewHtml(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "refreshHistory":
          webviewView.webview.html = this.getHistoryViewHtml(
            webviewView.webview,
          );
          break;
        case "clearHistory":
          // In a real implementation, this would call a method on DevMindManager
          webviewView.webview.html = this.getHistoryViewHtml(
            webviewView.webview,
          );
          break;
      }
    });
  }

  /**
   * Gets the HTML for the history view
   * @param webview The webview to get HTML for
   * @returns The HTML for the history view
   */
  private getHistoryViewHtml(webview: vscode.Webview): string {
    // In a real implementation, this would get history data from DevMindManager
    const historyEntries = [
      {
        timestamp: new Date().toLocaleString(),
        agent: "BugHunter",
        action: "Analyzed runtime error",
        success: true,
      },
      {
        timestamp: new Date(Date.now() - 3600000).toLocaleString(),
        agent: "CodeSmith",
        action: "Generated utility function",
        success: true,
      },
      {
        timestamp: new Date(Date.now() - 7200000).toLocaleString(),
        agent: "Architect",
        action: "Reviewed project structure",
        success: true,
      },
    ];

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Audit Trail</title>
                <style>
                    .header {
                        display: flex;
                        align-items: center;
                        padding-bottom: 10px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        margin-bottom: 10px;
                    }
                    .logo {
                        height: 30px;
                        margin-right: 10px;
                    }
                    .title {
                        font-size: 1.5em;
                        font-weight: bold;
                    }
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        padding: 10px;
                    }
                    .history-entry {
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 5px;
                        margin-bottom: 10px;
                        padding: 10px;
                    }
                    .history-header {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 5px;
                    }
                    .history-agent {
                        font-weight: bold;
                    }
                    .history-timestamp {
                        font-size: 0.8em;
                        opacity: 0.8;
                    }
                    .history-action {
                        margin-bottom: 5px;
                    }
                    .history-success {
                        font-size: 0.8em;
                        color: var(--vscode-terminal-ansiGreen);
                    }
                    .history-failure {
                        font-size: 0.8em;
                        color: var(--vscode-terminal-ansiRed);
                    }
                    .button-container {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 10px;
                    }
                    .button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 5px 10px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 0.9em;
                    }
                    .button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .danger-button {
                        background-color: var(--vscode-errorForeground);
                    }
                    .danger-button:hover {
                        opacity: 0.8;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${webview.asWebviewUri(
                      this.extensionUri.with({
                        path:
                          this.extensionUri.path + "/media/devmind-logo.svg",
                      }),
                    )}" class="logo" alt="DevMind Logo">
                    <div class="title">Audit Trail</div>
                </div>
                
                <div class="history-container">
                    ${historyEntries
                      .map(
                        (entry) => `
                        <div class="history-entry">
                            <div class="history-header">
                                <div class="history-agent">${entry.agent}</div>
                                <div class="history-timestamp">${entry.timestamp}</div>
                            </div>
                            <div class="history-action">${entry.action}</div>
                            <div class="${entry.success ? "history-success" : "history-failure"}">
                                ${entry.success ? "✓ Success" : "✗ Failed"}
                            </div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
                
                <div class="button-container">
                    <button class="button" id="refresh-button">Refresh</button>
                    <button class="button danger-button" id="clear-button">Clear History</button>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('refresh-button').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'refreshHistory'
                        });
                    });
                    
                    document.getElementById('clear-button').addEventListener('click', () => {
                        if (confirm('Are you sure you want to clear the audit history?')) {
                            vscode.postMessage({
                                command: 'clearHistory'
                            });
                        }
                    });
                </script>
            </body>
            </html>
        `;
  }
}
