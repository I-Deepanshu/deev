import * as vscode from 'vscode';
import { ContextData } from './ContextAnalyzer';

/**
 * Privacy modes for controlling data processing
 */
export enum PrivacyMode {
    /**
     * Standard mode - allows processing of all data
     */
    STANDARD = 'standard',
    
    /**
     * Enhanced mode - restricts processing of sensitive data
     */
    ENHANCED = 'enhanced',
    
    /**
     * Maximum mode - highly restrictive, minimal data processing
     */
    MAXIMUM = 'maximum'
}

/**
 * PrivacyManager class for managing privacy settings and enforcing privacy policies
 * Controls what data can be processed by the LLM and other components
 */
export class PrivacyManager {
    private mode: PrivacyMode;
    private sensitivePatterns: RegExp[] = [];
    private excludedFiles: string[] = [];
    private excludedDirectories: string[] = [];
    
    /**
     * Creates a new PrivacyManager instance
     * @param initialMode The initial privacy mode
     */
    constructor(initialMode: PrivacyMode = PrivacyMode.STANDARD) {
        this.mode = initialMode;
        this.initializeSensitivePatterns();
        this.loadExcludedPaths();
    }
    
    /**
     * Checks if a request can be processed based on privacy settings
     * @param request The request to check
     * @returns Whether the request can be processed
     */
    canProcessRequest(request: any): boolean {
        // In standard mode, allow all requests
        if (this.mode === PrivacyMode.STANDARD) {
            return true;
        }
        
        // Check for sensitive data in the request
        if (request.prompt && this.containsSensitiveData(request.prompt)) {
            return false;
        }
        
        // In maximum mode, apply additional restrictions
        if (this.mode === PrivacyMode.MAXIMUM) {
            // Check if context contains excluded files
            if (request.context && request.context.currentFile) {
                if (this.isExcludedFile(request.context.currentFile)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Checks if a context can be processed based on privacy settings
     * @param context The context to check
     * @returns Whether the context can be processed
     */
    canProcessContext(context: ContextData): boolean {
        // In standard mode, allow all contexts
        if (this.mode === PrivacyMode.STANDARD) {
            return true;
        }
        
        // Check if the current file is excluded
        if (context.currentFile && this.isExcludedFile(context.currentFile)) {
            return false;
        }
        
        // Check for sensitive data in the code
        if (context.surroundingCode && this.containsSensitiveData(context.surroundingCode)) {
            return false;
        }
        
        // In maximum mode, apply additional restrictions
        if (this.mode === PrivacyMode.MAXIMUM) {
            // Restrict processing of certain file types
            if (context.currentFile) {
                const lowerCaseFile = context.currentFile.toLowerCase();
                if (lowerCaseFile.includes('secret') || 
                    lowerCaseFile.includes('password') || 
                    lowerCaseFile.includes('credential') ||
                    lowerCaseFile.endsWith('.env')) {
                    return false;
                }
            }
            
            // Restrict processing of error messages (may contain sensitive data)
            // Skip error message check as it's not part of the current ContextData interface
            // if (context.errorMessages && context.errorMessages.length > 0) {
            //     return false;
            // }
        }
        
        return true;
    }
    
    /**
     * Updates the privacy mode
     * @param mode The new privacy mode
     */
    setPrivacyMode(mode: PrivacyMode): void {
        this.mode = mode;
        // Notify any listeners that the mode has changed
        vscode.commands.executeCommand('devmind.privacyModeChanged', mode);
    }
    
    /**
     * Gets the current privacy mode
     * @returns The current privacy mode
     */
    getPrivacyMode(): PrivacyMode {
        return this.mode;
    }
    
    /**
     * Adds a file path to the exclusion list
     * @param filePath The file path to exclude
     */
    addExcludedFile(filePath: string): void {
        if (!this.excludedFiles.includes(filePath)) {
            this.excludedFiles.push(filePath);
            this.saveExcludedPaths();
        }
    }
    
    /**
     * Adds a directory path to the exclusion list
     * @param dirPath The directory path to exclude
     */
    addExcludedDirectory(dirPath: string): void {
        if (!this.excludedDirectories.includes(dirPath)) {
            this.excludedDirectories.push(dirPath);
            this.saveExcludedPaths();
        }
    }
    
    /**
     * Removes a file path from the exclusion list
     * @param filePath The file path to remove
     */
    removeExcludedFile(filePath: string): void {
        const index = this.excludedFiles.indexOf(filePath);
        if (index !== -1) {
            this.excludedFiles.splice(index, 1);
            this.saveExcludedPaths();
        }
    }
    
    /**
     * Removes a directory path from the exclusion list
     * @param dirPath The directory path to remove
     */
    removeExcludedDirectory(dirPath: string): void {
        const index = this.excludedDirectories.indexOf(dirPath);
        if (index !== -1) {
            this.excludedDirectories.splice(index, 1);
            this.saveExcludedPaths();
        }
    }
    
    /**
     * Gets the list of excluded files
     * @returns The list of excluded files
     */
    getExcludedFiles(): string[] {
        return [...this.excludedFiles];
    }
    
    /**
     * Gets the list of excluded directories
     * @returns The list of excluded directories
     */
    getExcludedDirectories(): string[] {
        return [...this.excludedDirectories];
    }
    
    /**
     * Initializes the patterns for detecting sensitive data
     */
    private initializeSensitivePatterns(): void {
        this.sensitivePatterns = [
            // API keys and tokens
            /\b[A-Za-z0-9-_]{24,}\b/g, // Generic API key pattern
            /api[_-]?key[\s:=]+['"]?([\w-]+)['"]?/gi, // API key assignments
            /token[\s:=]+['"]?([\w-]+)['"]?/gi, // Token assignments
            /secret[\s:=]+['"]?([\w-]+)['"]?/gi, // Secret assignments
            
            // Credentials
            /password[\s:=]+['"]?([^'"\s]+)['"]?/gi, // Password assignments
            /passwd[\s:=]+['"]?([^'"\s]+)['"]?/gi, // Passwd assignments
            /credential[\s:=]+['"]?([^'"\s]+)['"]?/gi, // Credential assignments
            
            // Personal data
            /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email addresses
            /\b(?:\d{3}-\d{2}-\d{4}|\d{9})\b/g, // SSN patterns
            /\b(?:\d{4}[- ]?){3}\d{4}\b/g, // Credit card patterns
        ];
    }
    
    /**
     * Checks if text contains sensitive data based on patterns
     * @param text The text to check
     * @returns Whether the text contains sensitive data
     */
    private containsSensitiveData(text: string): boolean {
        return this.sensitivePatterns.some(pattern => pattern.test(text));
    }
    
    /**
     * Checks if a file is in the excluded list or in an excluded directory
     * @param filePath The file path to check
     * @returns Whether the file is excluded
     */
    private isExcludedFile(filePath: string): boolean {
        // Check if the file is directly excluded
        if (this.excludedFiles.includes(filePath)) {
            return true;
        }
        
        // Check if the file is in an excluded directory
        return this.excludedDirectories.some(dir => filePath.startsWith(dir));
    }
    
    /**
     * Loads excluded paths from workspace configuration
     */
    private loadExcludedPaths(): void {
        const config = vscode.workspace.getConfiguration('devmind.privacy');
        this.excludedFiles = config.get<string[]>('excludedFiles', []);
        this.excludedDirectories = config.get<string[]>('excludedDirectories', []);
    }
    
    /**
     * Saves excluded paths to workspace configuration
     */
    private saveExcludedPaths(): void {
        const config = vscode.workspace.getConfiguration('devmind.privacy');
        config.update('excludedFiles', this.excludedFiles, vscode.ConfigurationTarget.Global);
        config.update('excludedDirectories', this.excludedDirectories, vscode.ConfigurationTarget.Global);
    }
}