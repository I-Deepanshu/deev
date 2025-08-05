# DevMind - AI Pair Programmer

![DevMind Logo](https://via.placeholder.com/150x150?text=DevMind)

## Overview

DevMind is a context-aware AI pair programming assistant for VS Code. Unlike traditional AI coding assistants, DevMind understands your codebase at multiple levels of context, from the immediate code you're working on to the broader project architecture.

Powered by Qwen 3 LLM, DevMind offers specialized AI agents for different development tasks, each with deep contextual understanding of your code.

## Features

### 🧠 Context-First Approach

DevMind analyzes your code at multiple levels:

1. **Immediate Code Context**: Understanding the current file, function, and selection
2. **Project Context**: Analyzing repository structure, dependencies, and configurations
3. **Historical Context**: Learning from Git history and team patterns
4. **External Context**: Applying best practices, ecosystem knowledge, and security awareness

### 🤖 Specialized AI Agents

DevMind provides six specialized AI agents, each designed for specific development tasks:

- **🏛️ Architect**: Proposes scalable designs and architecture changes
- **⚒️ CodeSmith**: Generates high-quality, idiomatic code
- **🐞 BugHunter**: Identifies and fixes bugs with root cause analysis
- **📚 DocGuru**: Creates comprehensive documentation
- **🔄 GitMate**: Assists with Git operations and commit management
- **🔄 DevFlow**: Sets up development workflows and automation

### 🔒 Privacy-First Design

DevMind is designed with privacy as a core principle:

- **Local Processing**: All code analysis happens locally
- **Configurable Privacy Modes**: Control what data is processed
- **Excluded Files/Directories**: Specify sensitive files to exclude from analysis

## Getting Started

### Installation

1. Install the DevMind extension from the VS Code Marketplace
2. Configure your Qwen 3 LLM API endpoint in the extension settings
3. Optionally set your API key if required

### Usage

#### Using the Command Palette

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "DevMind" to see available commands
3. Select a specific agent or use "Activate DevMind Agent" for contextual assistance

#### Using the Status Bar

Click the DevMind icon (🧠) in the status bar to activate the contextual agent.

#### Using the DevMind Panel

1. Click the DevMind icon in the Activity Bar
2. Select an agent from the Agents view
3. View context analysis and execution history in the respective views

## Configuration

DevMind can be configured through VS Code settings:

- **Qwen API URL**: Set your Qwen 3 LLM API endpoint
- **API Key**: Your API key (if required)
- **Privacy Mode**: Enable/disable privacy-first mode
- **Context Depth**: Set the depth of context analysis (1-5)
- **Agent Tone**: Choose between mentor, assistant, or critic communication styles
- **Telemetry**: Enable/disable anonymous usage telemetry

## Requirements

- VS Code 1.74.0 or higher
- Access to a Qwen 3 LLM API endpoint

## Privacy & Security

DevMind is designed to respect your privacy and security:

- No code leaves your environment unless explicitly allowed
- Sensitive files can be excluded from analysis
- Privacy modes control what data is processed

## License

MIT

---

"Code is temporary, context is forever." – Dr. FRYDAY, Chief Architect of DevMind