import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';
import simpleGit, { SimpleGit } from 'simple-git';

export interface ContextData {
    // Immediate Context
    currentFile?: string;
    currentFunction?: string;
    currentClass?: string;
    selectedText?: string;
    selectionRange?: vscode.Range;
    cursorPosition?: vscode.Position;
    surroundingCode?: string;
    
    // Project Context
    projectRoot?: string;
    projectStructure?: ProjectStructure;
    dependencies?: Dependencies;
    configFiles?: ConfigFile[];
    architecturalPatterns?: string[];
    
    // Historical Context
    gitHistory?: GitContext;
    recentChanges?: FileChange[];
    teamPatterns?: CodingPattern[];
    
    // External Context
    libraryVersions?: LibraryInfo[];
    securityIssues?: SecurityIssue[];
    bestPractices?: BestPractice[];
    
    // Analysis Results
    hasErrors?: boolean;
    hasWarnings?: boolean;
    missingDocumentation?: boolean;
    hasGitChanges?: boolean;
    isConfigFile?: boolean;
    isArchitecturalFile?: boolean;
    complexity?: number;
    
    // Additional Context
    refactorIntent?: string;
    includeProjectStructure?: boolean;
    includeGitHistory?: boolean;
    errorMessages?: string[];
    diff?: string;
    filePath?: string;
    language?: string;
    projectName?: string;
    problemStatement?: string;
    command?: string;
    args?: Record<string, any>;
}

export interface ProjectStructure {
    directories: string[];
    files: FileInfo[];
    entryPoints: string[];
    testFiles: string[];
    configFiles: string[];
}

export interface Dependencies {
    production: Record<string, string>;
    development: Record<string, string>;
    peerDependencies: Record<string, string>;
}

export interface ConfigFile {
    path: string;
    type: string;
    content: any;
}

export interface GitContext {
    currentBranch: string;
    recentCommits: CommitInfo[];
    uncommittedChanges: string[];
    remoteUrl?: string;
}

export interface FileChange {
    file: string;
    type: 'added' | 'modified' | 'deleted';
    timestamp: Date;
    author: string;
}

export interface CodingPattern {
    pattern: string;
    frequency: number;
    context: string;
}

export interface LibraryInfo {
    name: string;
    version: string;
    latestVersion: string;
    deprecated: boolean;
}

export interface SecurityIssue {
    library: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    fix: string;
}

export interface BestPractice {
    category: string;
    description: string;
    applicable: boolean;
}

export interface FileInfo {
    path: string;
    size: number;
    type: string;
    lastModified: Date;
}

export interface CommitInfo {
    hash: string;
    message: string;
    author: string;
    date: Date;
    files: string[];
}

export class ContextAnalyzer {
    private git: SimpleGit;
    private projectRoot: string;
    
    constructor() {
        this.projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.git = simpleGit(this.projectRoot);
    }
    
    /**
     * Analyzes full context for a document
     */
    async analyzeFullContext(document: vscode.TextDocument): Promise<ContextData> {
        const immediateContext = await this.analyzeImmediateContext(document);
        const projectContext = await this.analyzeProjectContext();
        const historicalContext = await this.analyzeHistoricalContext();
        const externalContext = await this.analyzeExternalContext(projectContext.dependencies || { production: {}, development: {}, peerDependencies: {} });
        
        return {
            ...immediateContext,
            ...projectContext,
            ...historicalContext,
            ...externalContext,
            ...this.analyzeCodeQuality(document)
        };
    }
    
    /**
     * Analyzes document-level context only (for performance)
     */
    async analyzeDocument(document: vscode.TextDocument): Promise<ContextData> {
        const immediateContext = await this.analyzeImmediateContext(document);
        const basicProjectContext = await this.getBasicProjectContext();
        
        return {
            ...immediateContext,
            ...basicProjectContext,
            ...this.getEmptyHistoricalContext(),
            ...this.getEmptyExternalContext(),
            ...this.analyzeCodeQuality(document)
        };
    }
    
    /**
     * Analyzes immediate context (current file, function, selection)
     */
    private async analyzeImmediateContext(document: vscode.TextDocument): Promise<Partial<ContextData>> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== document) {
            return this.getEmptyImmediateContext();
        }
        
        const position = editor.selection.active;
        const currentFunction = this.getCurrentFunction(document, position);
        const currentClass = this.getCurrentClass(document, position);
        const surroundingCode = this.getSurroundingCode(document, position);
        
        return {
            currentFile: document.fileName,
            currentFunction,
            currentClass,
            cursorPosition: position,
            surroundingCode,
            selectedText: editor.selection.isEmpty ? undefined : document.getText(editor.selection),
            selectionRange: editor.selection.isEmpty ? undefined : editor.selection
        };
    }
    
    /**
     * Analyzes project-level context
     */
    private async analyzeProjectContext(): Promise<Partial<ContextData>> {
        const projectStructure = await this.getProjectStructure();
        const dependencies = await this.getDependencies();
        const configFiles = await this.getConfigFiles();
        const architecturalPatterns = this.detectArchitecturalPatterns(projectStructure);
        
        return {
            projectRoot: this.projectRoot,
            projectStructure,
            dependencies,
            configFiles,
            architecturalPatterns
        };
    }
    
    /**
     * Analyzes historical context (git history, recent changes)
     */
    private async analyzeHistoricalContext(): Promise<Partial<ContextData>> {
        try {
            const gitHistory = await this.getGitContext();
            const recentChanges = await this.getRecentChanges();
            const teamPatterns = await this.analyzeTeamPatterns();
            
            return {
                gitHistory,
                recentChanges,
                teamPatterns
            };
        } catch (error) {
            console.warn('Git analysis failed:', error);
            return this.getEmptyHistoricalContext();
        }
    }
    
    /**
     * Analyzes external context (libraries, security, best practices)
     */
    private async analyzeExternalContext(dependencies: Dependencies): Promise<Partial<ContextData>> {
        // This would typically involve API calls to check for updates, security issues, etc.
        // For now, we'll return mock data
        return {
            libraryVersions: await this.getLibraryVersions(dependencies),
            securityIssues: await this.getSecurityIssues(dependencies),
            bestPractices: this.getBestPractices()
        };
    }
    
    /**
     * Analyzes code quality indicators
     */
    private analyzeCodeQuality(document: vscode.TextDocument): Partial<ContextData> {
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        const hasErrors = diagnostics.some(d => d.severity === vscode.DiagnosticSeverity.Error);
        const hasWarnings = diagnostics.some(d => d.severity === vscode.DiagnosticSeverity.Warning);
        
        const text = document.getText();
        const missingDocumentation = this.checkMissingDocumentation(text);
        const complexity = this.calculateComplexity(text);
        
        const fileName = path.basename(document.fileName);
        const isConfigFile = this.isConfigurationFile(fileName);
        const isArchitecturalFile = this.isArchitecturalFile(fileName);
        
        return {
            hasErrors,
            hasWarnings,
            missingDocumentation,
            hasGitChanges: false, // Will be updated by git analysis
            isConfigFile,
            isArchitecturalFile,
            complexity
        };
    }
    
    /**
     * Gets current function name at cursor position
     */
    private getCurrentFunction(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        const text = document.getText();
        const lines = text.split('\n');
        
        // Simple regex-based function detection (can be enhanced)
        for (let i = position.line; i >= 0; i--) {
            const line = lines[i];
            const functionMatch = line.match(/(?:function|def|async\s+function|const\s+\w+\s*=\s*(?:async\s+)?\(|class\s+\w+|interface\s+\w+)\s+(\w+)/i);
            if (functionMatch) {
                return functionMatch[1];
            }
        }
        
        return undefined;
    }
    
    /**
     * Gets current class name at cursor position
     */
    private getCurrentClass(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        const text = document.getText();
        const lines = text.split('\n');
        
        for (let i = position.line; i >= 0; i--) {
            const line = lines[i];
            const classMatch = line.match(/class\s+(\w+)/i);
            if (classMatch) {
                return classMatch[1];
            }
        }
        
        return undefined;
    }
    
    /**
     * Gets surrounding code context
     */
    private getSurroundingCode(document: vscode.TextDocument, position: vscode.Position): string {
        const startLine = Math.max(0, position.line - 10);
        const endLine = Math.min(document.lineCount - 1, position.line + 10);
        
        const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
        return document.getText(range);
    }
    
    /**
     * Gets project structure
     */
    private async getProjectStructure(): Promise<ProjectStructure> {
        if (!this.projectRoot) {
            return { directories: [], files: [], entryPoints: [], testFiles: [], configFiles: [] };
        }
        
        try {
            const files = await glob('**/*', { 
                cwd: this.projectRoot, 
                ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
                nodir: false
            }) as string[];
            
            const directories = files.filter((f: string) => {
                const fullPath = path.join(this.projectRoot, f);
                return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
            });
            
            const fileInfos: FileInfo[] = files
                .filter((f: string) => {
                    const fullPath = path.join(this.projectRoot, f);
                    return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
                })
                .map((f: string) => {
                    const fullPath = path.join(this.projectRoot, f);
                    const stats = fs.statSync(fullPath);
                    return {
                        path: f,
                        size: stats.size,
                        type: path.extname(f),
                        lastModified: stats.mtime
                    };
                });
            
            const entryPoints = this.detectEntryPoints(fileInfos);
            const testFiles = fileInfos.filter(f => this.isTestFile(f.path)).map(f => f.path);
            const configFiles = fileInfos.filter(f => this.isConfigurationFile(f.path)).map(f => f.path);
            
            return {
                directories,
                files: fileInfos,
                entryPoints,
                testFiles,
                configFiles
            };
        } catch (error) {
            console.error('Failed to analyze project structure:', error);
            return { directories: [], files: [], entryPoints: [], testFiles: [], configFiles: [] };
        }
    }
    
    /**
     * Gets project dependencies
     */
    private async getDependencies(): Promise<Dependencies> {
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            return { production: {}, development: {}, peerDependencies: {} };
        }
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            return {
                production: packageJson.dependencies || {},
                development: packageJson.devDependencies || {},
                peerDependencies: packageJson.peerDependencies || {}
            };
        } catch (error) {
            console.error('Failed to parse package.json:', error);
            return { production: {}, development: {}, peerDependencies: {} };
        }
    }
    
    /**
     * Gets configuration files
     */
    private async getConfigFiles(): Promise<ConfigFile[]> {
        const configPatterns = [
            'package.json', 'tsconfig.json', '.eslintrc*', '.prettierrc*',
            'webpack.config.*', 'vite.config.*', '.env*', 'docker*',
            '.gitignore', '.gitattributes', 'README.md'
        ];
        
        const configFiles: ConfigFile[] = [];
        
        for (const pattern of configPatterns) {
            try {
                const files = await glob(pattern, { cwd: this.projectRoot });
                for (const file of files) {
                    const fullPath = path.join(this.projectRoot, file);
                    if (fs.existsSync(fullPath)) {
                        let content: any = null;
                        try {
                            const text = fs.readFileSync(fullPath, 'utf8');
                            if (file.endsWith('.json')) {
                                content = JSON.parse(text);
                            } else {
                                content = text;
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                        
                        configFiles.push({
                            path: file,
                            type: this.getConfigFileType(file),
                            content
                        });
                    }
                }
            } catch (error) {
                // Ignore glob errors
            }
        }
        
        return configFiles;
    }
    
    /**
     * Gets git context
     */
    private async getGitContext(): Promise<GitContext> {
        const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
        const log = await this.git.log({ maxCount: 10 });
        const status = await this.git.status();
        
        const recentCommits: CommitInfo[] = log.all.map(commit => ({
            hash: commit.hash,
            message: commit.message,
            author: commit.author_name,
            date: new Date(commit.date),
            files: [] // Would need additional git command to get files
        }));
        
        const uncommittedChanges = [
            ...status.modified,
            ...status.created,
            ...status.deleted
        ];
        
        return {
            currentBranch: currentBranch.trim(),
            recentCommits,
            uncommittedChanges
        };
    }
    
    /**
     * Helper methods
     */
    private detectArchitecturalPatterns(structure: ProjectStructure): string[] {
        const patterns: string[] = [];
        
        // Detect common patterns based on folder structure
        const dirs = structure.directories;
        
        if (dirs.includes('src') && dirs.includes('components')) {
            patterns.push('Component-based Architecture');
        }
        
        if (dirs.includes('controllers') && dirs.includes('models') && dirs.includes('views')) {
            patterns.push('MVC Pattern');
        }
        
        if (dirs.includes('services') && dirs.includes('repositories')) {
            patterns.push('Service Layer Pattern');
        }
        
        if (dirs.some(d => d.includes('micro'))) {
            patterns.push('Microservices Architecture');
        }
        
        return patterns;
    }
    
    private detectEntryPoints(files: FileInfo[]): string[] {
        const entryPatterns = ['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts', 'server.js', 'server.ts'];
        return files
            .filter(f => entryPatterns.includes(path.basename(f.path)))
            .map(f => f.path);
    }
    
    private isTestFile(filePath: string): boolean {
        const testPatterns = ['.test.', '.spec.', '__tests__', '/tests/'];
        return testPatterns.some(pattern => filePath.includes(pattern));
    }
    
    private isConfigurationFile(fileName: string): boolean {
        const configPatterns = [
            'package.json', 'tsconfig.json', '.eslintrc', '.prettierrc',
            'webpack.config', 'vite.config', '.env', 'docker', '.git'
        ];
        return configPatterns.some(pattern => fileName.includes(pattern));
    }
    
    private isArchitecturalFile(fileName: string): boolean {
        const archPatterns = ['architecture', 'design', 'schema', 'model', 'interface', 'type'];
        return archPatterns.some(pattern => fileName.toLowerCase().includes(pattern));
    }
    
    private getConfigFileType(fileName: string): string {
        if (fileName.includes('package.json')) return 'npm';
        if (fileName.includes('tsconfig')) return 'typescript';
        if (fileName.includes('eslint')) return 'linting';
        if (fileName.includes('prettier')) return 'formatting';
        if (fileName.includes('webpack') || fileName.includes('vite')) return 'bundler';
        if (fileName.includes('.env')) return 'environment';
        if (fileName.includes('docker')) return 'containerization';
        return 'other';
    }
    
    private checkMissingDocumentation(text: string): boolean {
        // Simple heuristic: check for functions without comments
        const functionMatches = text.match(/(?:function|def|class)\s+\w+/g) || [];
        const commentMatches = text.match(/\/\*\*|\*\/|\/\/|#/g) || [];
        
        return functionMatches.length > 0 && commentMatches.length < functionMatches.length * 0.5;
    }
    
    private calculateComplexity(text: string): number {
        // Simple cyclomatic complexity calculation
        const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||'];
        let complexity = 1; // Base complexity
        
        for (const keyword of complexityKeywords) {
            const matches = text.match(new RegExp(`\\b${keyword}\\b`, 'g'));
            if (matches) {
                complexity += matches.length;
            }
        }
        
        return complexity;
    }
    
    // Placeholder methods for external context analysis
    private async getLibraryVersions(dependencies: Dependencies): Promise<LibraryInfo[]> {
        // Would typically make API calls to npm registry
        return [];
    }
    
    private async getSecurityIssues(dependencies: Dependencies): Promise<SecurityIssue[]> {
        // Would typically use security databases
        return [];
    }
    
    private getBestPractices(): BestPractice[] {
        // Would be based on current context and language
        return [];
    }
    
    private async getRecentChanges(): Promise<FileChange[]> {
        // Would analyze git log for recent changes
        return [];
    }
    
    private async analyzeTeamPatterns(): Promise<CodingPattern[]> {
        // Would analyze commit patterns and code style
        return [];
    }
    
    private async getBasicProjectContext(): Promise<Partial<ContextData>> {
        return {
            projectRoot: this.projectRoot,
            projectStructure: { directories: [], files: [], entryPoints: [], testFiles: [], configFiles: [] },
            dependencies: { production: {}, development: {}, peerDependencies: {} },
            configFiles: [],
            architecturalPatterns: []
        };
    }
    
    // Empty context methods
    getEmptyContext(): ContextData {
        return {
            ...this.getEmptyImmediateContext(),
            ...this.getEmptyProjectContext(),
            ...this.getEmptyHistoricalContext(),
            ...this.getEmptyExternalContext(),
            hasErrors: false,
            hasWarnings: false,
            missingDocumentation: false,
            hasGitChanges: false,
            isConfigFile: false,
            isArchitecturalFile: false,
            complexity: 1
        };
    }
    
    private getEmptyImmediateContext(): Partial<ContextData> {
        return {
            currentFile: undefined,
            cursorPosition: new vscode.Position(0, 0),
            surroundingCode: ''
        };
    }
    
    private getEmptyProjectContext(): Partial<ContextData> {
        return {
            projectRoot: this.projectRoot,
            projectStructure: { directories: [], files: [], entryPoints: [], testFiles: [], configFiles: [] },
            dependencies: { production: {}, development: {}, peerDependencies: {} },
            configFiles: [],
            architecturalPatterns: []
        };
    }
    
    private getEmptyHistoricalContext(): Partial<ContextData> {
        return {
            gitHistory: {
                currentBranch: '',
                recentCommits: [],
                uncommittedChanges: []
            },
            recentChanges: [],
            teamPatterns: []
        };
    }
    
    private getEmptyExternalContext(): Partial<ContextData> {
        return {
            libraryVersions: [],
            securityIssues: [],
            bestPractices: []
        };
    }
}

function isValidDependencies(deps?: Dependencies): deps is Dependencies {
  return !!deps && 'production' in deps && 'development' in deps;
}