# DevMind Extension Usage Guide

## Table of Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Getting Started](#getting-started)
4. [DevMind Chat Interface](#devmind-chat-interface)
5. [Using DevMind Agents](#using-devmind-agents)
6. [Context Analysis](#context-analysis)
7. [Privacy Controls](#privacy-controls)
8. [Audit Trail](#audit-trail)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Troubleshooting](#troubleshooting)

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Click on the Extensions icon in the Activity Bar (or press `Ctrl+Shift+X`)
3. Search for "DevMind"
4. Click "Install" on the DevMind extension

### Manual Installation

1. Download the `.vsix` file from the [releases page](https://github.com/devmind/releases)
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X)
4. Click on the "..." menu (top-right of Extensions view)
5. Select "Install from VSIX..."
6. Navigate to and select the downloaded `.vsix` file

## Configuration

After installation, you need to configure DevMind to connect to your Qwen 3 LLM API:

1. Open VS Code Settings (`Ctrl+,` or File > Preferences > Settings)
2. Search for "DevMind"
3. Configure the following settings:

   - **Qwen API URL**: Set your Qwen 3 LLM API endpoint
   - **API Key**: Your API key (if required)
   - **Privacy Mode**: Choose between:
     - `strict`: No code leaves your environment
     - `balanced`: Only non-sensitive code is processed
     - `permissive`: All code is processed
   - **Context Depth**: Set the depth of context analysis (1-5)
   - **Agent Tone**: Choose between mentor, assistant, or critic communication styles
   - **Telemetry**: Enable/disable anonymous usage telemetry

## Getting Started

### DevMind Status Bar

After installation, you'll notice the DevMind icon (🧠) in the status bar. Clicking this icon activates the contextually appropriate agent based on your current task.

### DevMind Activity Bar

DevMind adds an icon to your Activity Bar. Clicking it reveals three views:

1. **DevMind Chat**: Interact with DevMind using a chat interface.
2. **Context Analysis**: View what DevMind understands about your code
3. **Audit Trail**: Review past agent interactions and actions

## DevMind Chat Interface

The DevMind Chat Interface provides a natural language way to interact with DevMind's capabilities. You can mention specific agents and reference files directly within your chat messages.

### Accessing the Chat

1.  Click on the DevMind icon in the Activity Bar.
2.  Select the "DevMind Chat" view.

### Interacting with Agents (`@agent`)

To direct your query to a specific DevMind agent, use the `@` symbol followed by the agent's name. This will route your message to the designated agent for processing.

**Example Usage**:
- `@ArchitectAgent How should I structure this new module?`
- `@BugHunterAgent Please analyze this error log for potential issues.`
- `@CodeSmithAgent Generate a Python function to reverse a string.`

### Referencing Context Files (`#file`)

To provide specific code context to DevMind, use the `#` symbol followed by the relative path to the file. This allows DevMind to analyze the content of the specified file when responding to your query.

**Example Usage**:
- `#src/extension.ts Explain the activation process in this file.`
- `#README.md What are the main features described here?`
- `@DocGuruAgent #src/core/DevMindManager.ts Generate JSDoc comments for the methods in this file.`

You can combine both `@agent` and `#file` in a single message to provide both a target agent and relevant context.

## Using DevMind Agents

DevMind provides six specialized AI agents, each designed for specific development tasks. You can access any agent through the Command Palette, keyboard shortcuts, or by mentioning them in the DevMind Chat Interface:

### 🏛️ Architect

**Purpose**: Proposes scalable designs and architecture changes

**When to use**:
- Planning new features or modules
- Refactoring existing code
- Evaluating architectural decisions
- Understanding design patterns
- Analyzing code organization

**How to Use**:
1. Open the Command Palette (`Ctrl+Shift+P`)
2. Type "DevMind: Architect"
3. Ask about system design, architecture patterns, or code organization

**Example Prompts**:
- "How should I structure this application for better scalability?"
- "Suggest a design pattern for this authentication system"
- "Review my current architecture and suggest improvements"
- "Analyze the dependencies in this module"
- "Help me understand the architecture of this codebase"

**Access methods:
- Command: `DevMind: Architect`
- Shortcut: `Ctrl+Shift+D A`
- Activity Bar > DevMind > Agents > Architect
- DevMind Chat: `@ArchitectAgent`

### ⚒️ CodeSmith

**Purpose**: Generates high-quality, idiomatic code

**When to use**:
- Generating new code
- Improving existing code
- Implementing algorithms
- Converting between languages
- Writing tests

**How to Use**:
1. Open the Command Palette (`Ctrl+Shift+P`)
2. Type "DevMind: CodeSmith"
3. Request code generation or improvements

**Example Prompts**:
- "Generate a React component for a user profile page"
- "Refactor this function to be more efficient"
- "Implement unit tests for this class"
- "Convert this JavaScript code to TypeScript"
- "Create a utility function to parse this data format"

**Access methods:
- Command: `DevMind: CodeSmith`
- Shortcut: `Ctrl+Shift+D C`
- Activity Bar > DevMind > Agents > CodeSmith
- DevMind Chat: `@CodeSmithAgent`

### 🐞 BugHunter

**Purpose**: Identifies and fixes bugs with root cause analysis

**When to use**:
- Fixing bugs
- Resolving errors
- Security vulnerability scanning
- Performance troubleshooting
- Code quality improvement

**How to Use**:
1. Open the Command Palette (`Ctrl+Shift+P`)
2. Type "DevMind: BugHunter"
3. Describe the bug or issue you're experiencing

**Example Prompts**:
- "Why is this function returning undefined?"
- "Debug this API call that's failing"
- "Find potential memory leaks in this code"
- "Identify security vulnerabilities in this authentication code"
- "Fix the race condition in this async function"

**Access methods:
- Command: `DevMind: BugHunter`
- Shortcut: `Ctrl+Shift+D B`
- Activity Bar > DevMind > Agents > BugHunter
- DevMind Chat: `@BugHunterAgent`

### 📚 DocGuru

**Purpose**: Creates comprehensive documentation

**When to use**:
- Creating documentation
- Improving existing documentation
- Generating code comments
- Creating README files
- Documenting APIs

**How to Use**:
1. Open the Command Palette (`Ctrl+Shift+P`)
2. Type "DevMind: DocGuru"
3. Request documentation for your code

**Example Prompts**:
- "Generate JSDoc comments for this function"
- "Create a README for this project"
- "Document the API endpoints in this file"
- "Improve the comments in this complex algorithm"
- "Create user documentation for this feature"

**Access methods:
- Command: `DevMind: DocGuru`
- Shortcut: `Ctrl+Shift+D D`
- Activity Bar > DevMind > DocGuru
- DevMind Chat: `@DocGuruAgent`

### 🔄 GitMate

**Purpose**: Assists with Git operations and commit management

**When to use**:
- Understanding Git history
- Crafting commit messages
- Resolving merge conflicts
- Planning branch strategies
- Analyzing code changes

**How to Use**:
1. Open the Command Palette (`Ctrl+Shift+P`)
2. Type "DevMind: GitMate"
3. Ask for help with Git operations

**Example Prompts**:
- "Help me write a good commit message for these changes"
- "Explain what changed in the last 5 commits"
- "Suggest a branching strategy for this feature"
- "Help me resolve this merge conflict"
- "Analyze the impact of these code changes"

**Access methods:
- Command: `DevMind: GitMate`
- Shortcut: `Ctrl+Shift+D G`
- Activity Bar > DevMind > GitMate
- DevMind Chat: `@GitMateAgent`

### 🔄 DevFlow

**Purpose**: Sets up development workflows and automation

**When to use**:
- Setting up development environments
- Configuring build tools
- Optimizing CI/CD pipelines
- Managing dependencies
- Automating development tasks

**How to Use**:
1. Open the Command Palette (`Ctrl+Shift+P`)
2. Type "DevMind: DevFlow"
3. Request help with development workflows

**Example Prompts**:
- "Set up a CI/CD pipeline for this project"
- "Create a GitHub Actions workflow for testing"
- "Suggest a development workflow for our team"
- "Help me configure webpack for this project"
- "Optimize my npm scripts for better development experience"

**Access methods**:
- Command: `DevMind: DevFlow`
- Shortcut: `Ctrl+Shift+D F`
- Activity Bar > DevMind > Agents > DevFlow

## Context Analysis

DevMind analyzes your code at multiple levels to provide context-aware assistance:

### Layers of Context

1. **Immediate Code Context**: Understanding the current file, function, and selection
   - Current file content and structure
   - Active function or method
   - Selected code block
   - Surrounding code context

2. **Project Context**: Analyzing repository structure, dependencies, and configurations
   - Project structure and organization
   - Dependencies and libraries
   - Configuration files
   - Build systems and tools

3. **Historical Context**: Learning from Git history and team patterns
   - Recent changes and commits
   - Code ownership and authorship
   - Common patterns and practices
   - Issue and PR history

4. **External Context**: Applying best practices, ecosystem knowledge, and security awareness
   - Language best practices
   - Framework conventions
   - Security vulnerabilities
   - Performance considerations

### Viewing Context Analysis

To view what DevMind understands about your code:

1. Click the DevMind icon in the Activity Bar
2. Select the "Context Analysis" view
3. Review the different levels of context that DevMind has analyzed

### Using Context in Queries

DevMind automatically incorporates context in your interactions, but you can explicitly reference it:

- "Explain this function in the context of the entire module"
- "How does this component fit into the project architecture?"
- "Is this implementation consistent with the rest of the codebase?"

## Privacy Controls

DevMind is designed with privacy as a core principle. You can control what data is processed:

### Privacy Modes

Configure your preferred privacy mode in settings:

- **Strict Mode**: 
  - No code leaves your environment
  - All processing happens locally
  - Limited to local context analysis
  - Maximum privacy, but potentially less powerful assistance

- **Balanced Mode**: 
  - Only non-sensitive code is processed
  - Automatic detection of sensitive information
  - Redaction of secrets, keys, and personal data
  - Good balance between privacy and assistance quality

- **Permissive Mode**: 
  - All code is processed (except explicitly excluded files)
  - Maximum context available to AI agents
  - Most powerful assistance, but less privacy

### Excluded Files/Directories

To exclude sensitive files from analysis:

1. Open VS Code Settings
2. Search for "DevMind: Excluded Paths"
3. Add file paths or patterns to exclude (e.g., `**/secrets.js`, `**/node_modules/**`)

### Temporary Privacy Override

You can temporarily override privacy settings for a specific interaction:

1. Start a conversation with an agent
2. Click the privacy icon (🔒) in the chat interface
3. Select a temporary privacy level for this conversation

### Data Retention

DevMind's privacy features include:

- No persistent storage of your code on external servers
- Automatic redaction of sensitive information
- Local processing when possible
- Compliance with data protection regulations

## Audit Trail

DevMind maintains a comprehensive audit trail of all interactions to provide transparency and accountability.

### Viewing the Audit Trail

1. Click the DevMind icon in the Activity Bar
2. Select the "Audit Trail" view
3. Browse through past interactions, organized by date and agent

### Audit Trail Information

Each entry in the audit trail includes:

- Timestamp of the interaction
- Agent used (Architect, CodeSmith, etc.)
- Query/prompt sent to the agent
- Response received from the agent
- Code context that was shared
- Privacy mode used for the interaction
- Actions taken (e.g., code changes, file creations)

### Managing the Audit Trail

You can manage your audit trail with these features:

- **Search**: Filter the audit trail by date, agent, or content
- **Export**: Export the audit trail as JSON, CSV, or Markdown
- **Clear**: Remove old entries to manage storage
- **Filter**: Show only specific types of interactions

### Compliance and Governance

The audit trail helps with:

- Compliance with organizational policies
- Tracking AI usage in your development process
- Understanding how AI is influencing your codebase
- Providing accountability for AI-assisted changes

## Keyboard Shortcuts

DevMind provides keyboard shortcuts for quick access to its features:

### Agent Activation Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Activate Architect | `Ctrl+Shift+D A` | `Cmd+Shift+D A` |
| Activate CodeSmith | `Ctrl+Shift+D C` | `Cmd+Shift+D C` |
| Activate BugHunter | `Ctrl+Shift+D B` | `Cmd+Shift+D B` |
| Activate DocGuru | `Ctrl+Shift+D D` | `Cmd+Shift+D D` |
| Activate GitMate | `Ctrl+Shift+D G` | `Cmd+Shift+D G` |
| Activate DevFlow | `Ctrl+Shift+D F` | `Cmd+Shift+D F` |
| Activate Contextual Agent | `Ctrl+Shift+D X` | `Cmd+Shift+D X` |

### Interface Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Open DevMind Panel | `Ctrl+Shift+D` | `Cmd+Shift+D` |
| Clear Conversation | `Ctrl+Shift+D Escape` | `Cmd+Shift+D Escape` |
| Toggle Privacy Mode | `Ctrl+Shift+D P` | `Cmd+Shift+D P` |
| Show Context Analysis | `Ctrl+Shift+D K` | `Cmd+Shift+D K` |
| Show Audit Trail | `Ctrl+Shift+D H` | `Cmd+Shift+D H` |

### Customizing Shortcuts

You can customize these keyboard shortcuts to match your preferences:

1. Open VS Code settings
2. Go to Keyboard Shortcuts (Ctrl+K Ctrl+S)
3. Search for "DevMind"
4. Click on a shortcut to edit it
5. Press the desired key combination
6. Press Enter to save

## Troubleshooting

### Common Issues

#### API Connection Issues

**Symptoms**: "Unable to connect to API" error, no response from agents

**Solutions**:
1. Verify your API URL and key in settings
2. Check your internet connection
3. Ensure your firewall isn't blocking the connection
4. Check if the API service is operational
5. Try restarting VS Code

#### High Latency

**Symptoms**: Slow responses from agents

**Solutions**:
1. Check your internet connection
2. Reduce the context depth in settings
3. Exclude large directories from analysis
4. Close other resource-intensive applications
5. Switch to a lighter model in settings

#### Incorrect Context

**Symptoms**: Agent responses don't match your current context

**Solutions**:
1. Save all open files
2. Refresh the DevMind panel
3. Explicitly mention the relevant files in your query
4. Check if the files are excluded in privacy settings
5. Try using a more specific query

#### Memory Issues

**Symptoms**: VS Code becomes unresponsive or crashes

**Solutions**:
1. Reduce the context depth in settings
2. Exclude large directories from analysis
3. Close unused editors and terminals
4. Restart VS Code
5. Update to the latest version of DevMind

### Logs and Diagnostics

1. Open the Output panel in VS Code (Ctrl+Shift+U)
2. Select "DevMind" from the dropdown
3. Review the logs for errors or warnings
4. Copy relevant logs when reporting issues

### Resetting the Extension

If you encounter persistent issues:

1. Open VS Code settings
2. Search for "DevMind"
3. Click "Reset All DevMind Settings"
4. Restart VS Code

### Getting Support

If you continue to experience issues:

1. Check the [GitHub repository](https://github.com/devmind/devmind) for known issues
2. Submit a bug report with detailed information
3. Contact support at support@devmind.ai

---

"Code is temporary, context is forever." – Dr. FRYDAY, Chief Architect of DevMind