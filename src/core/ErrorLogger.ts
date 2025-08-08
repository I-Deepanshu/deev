import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class ErrorLogger {
    private logFilePath: string;

    constructor(context: vscode.ExtensionContext) {
        this.logFilePath = path.join(context.globalStorageUri.fsPath, 'devmind_errors.log');
        // Ensure the directory exists
        fs.mkdirSync(path.dirname(this.logFilePath), { recursive: true });
    }

    public logError(errorMessage: string, contextData?: any): void {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ERROR: ${errorMessage}\nContext: ${JSON.stringify(contextData, null, 2)}\n---\n`;

        fs.appendFile(this.logFilePath, logEntry, (err) => {
            if (err) {
                console.error('Failed to write to error log file:', err);
            }
        });
    }

    public getLogFilePath(): string {
        return this.logFilePath;
    }
}