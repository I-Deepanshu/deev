import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { PrivacyManager } from '../core/PrivacyManager';
import { ContextData } from '../core/ContextAnalyzer';
import { AgentType } from '../agents/types';
import * as vscode from 'vscode';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface LLMRequest {
    prompt: string;
    context?: ContextData; // Make context optional as it might not always be needed for simple requests
    agentType?: string; // Make agentType optional
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
}

export interface LLMResponse {
    success: boolean;
    content?: string;
    error?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    metadata?: {
        model: string;
        responseTime: number;
        reasoning?: string;
    };
    completion?: string;
}

export interface QwenConfig {
    apiUrl: string;
    apiKey: string;
    model: string;
    timeout: number;
    retries: number;
}

export class QwenLLMProvider {
    private client: AxiosInstance;
    private config: QwenConfig;
    private requestCount: number = 0;
    private readonly MAX_REQUESTS_PER_MINUTE = 60;
    private requestTimestamps: number[] = [];
    
    constructor(
        apiUrl: string,
        apiKey: string,
        private privacyManager: PrivacyManager
    ) {
        this.config = {
            apiUrl: apiUrl || 'http://localhost:8000',
            apiKey: apiKey || '',
            model: 'qwen-3-7b-instruct', // Default Qwen 3 model
            timeout: 30000, // 30 seconds
            retries: 3
        };
        
        this.client = axios.create({
            baseURL: this.config.apiUrl,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'DevMind-VSCode-Extension/1.0.0',
                ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
            }
        });
        
        this.setupInterceptors();
    }
    
    /**
     * Sends a request to Qwen 3 LLM
     */
    async sendRequest(prompt: string, stream?: vscode.ChatResponseStream): Promise<LLMResponse> {
        // For now, we'll use a simplified request for chat streaming
        // In a real scenario, you'd construct a more detailed LLMRequest
        const request: LLMRequest = { prompt, stream: !!stream };

        try {
            // Privacy check
            if (!this.privacyManager.canProcessRequest(request)) {
                return {
                    success: false,
                    error: 'Request blocked by privacy settings'
                };
            }
            
            // Rate limiting check
            if (!this.checkRateLimit()) {
                return {
                    success: false,
                    error: 'Rate limit exceeded. Please wait before making more requests.'
                };
            }
            
            const startTime = Date.now();
            
            // Prepare the request payload for Qwen 3
            const payload = this.prepareQwenPayload(request);
            
            // Make the API call
            const response = await this.makeRequest(payload, stream);
            
            const responseTime = Date.now() - startTime;
            
            return this.parseQwenResponse(response, responseTime, stream);
            
        } catch (error) {
            console.error('Qwen LLM request failed:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    // Helper methods for building prompts and parsing responses would go here
    // For now, we'll keep it simple for streaming.

    private async makeRequest(payload: any, stream?: vscode.ChatResponseStream): Promise<AxiosResponse> {
        if (stream) {
            // Handle streaming response
            return new Promise((resolve, reject) => {
                this.client.post('/generate', payload, { responseType: 'stream' })
                    .then(response => {
                        let completionContent = '';
                        response.data.on('data', (chunk: Buffer) => {
                            const text = chunk.toString();
                            // Assuming the LLM sends plain text or simple JSON chunks
                            // You might need more sophisticated parsing for SSE or other formats
                            completionContent += text;
                            stream.markdown(text); // Stream directly to VS Code chat
                        });

                        response.data.on('end', () => {
                            resolve({ data: { completion: completionContent }, status: 200 } as AxiosResponse);
                        });

                        response.data.on('error', (err: any) => {
                            reject(err);
                        });
                    })
                    .catch(reject);
            });
        } else {
            // Handle non-streaming response
            return this.client.post('/generate', payload);
        }
    }

    private parseQwenResponse(response: AxiosResponse, responseTime: number, stream?: vscode.ChatResponseStream): LLMResponse {
        // If streaming, the content is already sent to the stream
        const completion = stream ? '' : response.data.completion || response.data.choices?.[0]?.message?.content || '';

        return {
            success: true,
            content: completion,
            usage: {
                promptTokens: response.data.usage?.prompt_tokens || 0,
                completionTokens: response.data.usage?.completion_tokens || 0,
                totalTokens: response.data.usage?.total_tokens || 0,
            },
            metadata: {
                model: this.config.model,
                responseTime: responseTime,
            },
            completion: completion // Add completion for non-streaming case
        };
    }

    private prepareQwenPayload(request: LLMRequest): any {
        // This is a simplified payload. Adjust according to your Qwen API's requirements.
        return {
            model: this.config.model,
            prompt: request.prompt,
            max_tokens: request.maxTokens || 1024,
            temperature: request.temperature || 0.7,
            stream: request.stream || false,
        };
    }

    private getErrorMessage(error: any): string {
        if (axios.isAxiosError(error)) {
            return error.response?.data?.message || error.message;
        } else if (error instanceof Error) {
            return error.message;
        }
        return 'An unknown error occurred.';
    }

    private checkRateLimit(): boolean {
        const now = Date.now();
        // Filter out requests older than 1 minute
        this.requestTimestamps = this.requestTimestamps.filter(timestamp => now - timestamp < 60 * 1000);
        if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
            return false;
        }
        this.requestTimestamps.push(now);
        return true;
    }

    updateConfig(newConfig: Partial<QwenConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // Update axios instance
        this.client.defaults.baseURL = this.config.apiUrl;
        this.client.defaults.timeout = this.config.timeout;
        
        if (this.config.apiKey) {
            this.client.defaults.headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
    }
    
    /**
     * Tests connection to Qwen API
     */
    async testConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
        try {
            const response = await this.client.get('/health');
            return {
                success: true,
                model: response.data?.model || this.config.model
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }
    
    /**
     * Prepares payload for Qwen 3 API
     */
    private prepareQwenPayload(request: LLMRequest): any {
        const contextSummary = this.summarizeContext(request.context);
        
        return {
            model: this.config.model,
            messages: [
                {
                    role: 'system',
                    content: this.getSystemPrompt(request.agentType as AgentType)
                },
                {
                    role: 'user',
                    content: `Context: ${contextSummary}\n\nRequest: ${request.prompt}`
                }
            ],
            max_tokens: request.maxTokens || 1024,
            temperature: request.temperature || 0.3,
            stream: request.stream || false,
            top_p: 0.9,
            frequency_penalty: 0.1,
            presence_penalty: 0.1
        };
    }
    
    /**
     * Makes the actual HTTP request with retries
     */
    private async makeRequest(payload: any, retryCount: number = 0): Promise<AxiosResponse> {
        try {
            const response = await this.client.post('/v1/chat/completions', payload);
            this.requestCount++;
            this.requestTimestamps.push(Date.now());
            return response;
        } catch (error) {
            if (retryCount < this.config.retries && this.isRetryableError(error)) {
                const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                await this.sleep(delay);
                return this.makeRequest(payload, retryCount + 1);
            }
            throw error;
        }
    }
    
    /**
     * Parses Qwen API response
     */
    private parseQwenResponse(response: AxiosResponse, responseTime: number): LLMResponse {
        try {
            const data = response.data;
            
            if (!data.choices || data.choices.length === 0) {
                return {
                    success: false,
                    error: 'No response choices returned from Qwen API'
                };
            }
            
            const choice = data.choices[0];
            const content = choice.message?.content || choice.text || '';
            
            return {
                success: true,
                content: content.trim(),
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0
                },
                metadata: {
                    model: data.model || this.config.model,
                    responseTime,
                    reasoning: choice.finish_reason
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to parse Qwen response: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    
    /**
     * Builds system prompts for different agents
     */
    private getSystemPrompt(agentType: AgentType): string {
        const basePrompt = `You are DevMind, an expert AI pair programmer. You think in context, not just code. Always provide:
1. Clear explanations of your reasoning
2. Context-aware solutions
3. Best practices and alternatives
4. Performance and security considerations

`;
        
        const agentPrompts: Record<AgentType, string> = {
            default: basePrompt,
            architect: `${basePrompt}As the Architect agent, you specialize in:
- System design and architecture patterns
- Scalability and maintainability
- Technology stack recommendations
- Code organization and structure`,
            
            codesmith: `${basePrompt}As the CodeSmith agent, you specialize in:
- Writing clean, efficient, and tested code
- Following language-specific best practices
- Implementing design patterns appropriately
- Optimizing for performance and readability`,
            
            bughunter: `${basePrompt}As the BugHunter agent, you specialize in:
- Identifying bugs and potential issues
- Root cause analysis
- Security vulnerability detection
- Performance bottleneck identification`,
            
            docguru: `${basePrompt}As the DocGuru agent, you specialize in:
- Writing clear, comprehensive documentation
- Creating helpful code comments
- Generating API documentation
- Explaining complex concepts simply`,
            
            gitmate: `${basePrompt}As the GitMate agent, you specialize in:
- Git workflow optimization
- Commit message best practices
- Branch management strategies
- Code review processes`,
            
            devflow: `${basePrompt}As the DevFlow agent, you specialize in:
- CI/CD pipeline setup
- Development workflow optimization
- Tool configuration and automation
- Infrastructure as code`
        };
        
        return agentPrompts[agentType] || basePrompt;
    }
    
    /**
     * Builds prompts for specific tasks
     */
    private buildCodeGenerationPrompt(instruction: string, context: ContextData, language: string): string {
        return `Generate ${language} code for the following requirement:

${instruction}

Current context:
- File: ${context.currentFile}
- Function: ${context.currentFunction || 'N/A'}
- Class: ${context.currentClass || 'N/A'}

Surrounding code:
\`\`\`${language}
${context.surroundingCode}
\`\`\`

Please provide:
1. The complete code implementation
2. Explanation of the approach
3. Any necessary imports or dependencies
4. Usage examples if applicable`;
    }
    
    private buildCodeAnalysisPrompt(code: string, context: ContextData, analysisType: string): string {
        return `Analyze the following code for ${analysisType}:

\`\`\`
${code}
\`\`\`

Context:
- File: ${context.currentFile}
- Project type: ${this.detectProjectType(context)}
- Complexity: ${context.complexity}

Please provide:
1. Identified issues and their severity
2. Root cause analysis
3. Specific fix recommendations
4. Prevention strategies for the future`;
    }
    
    private buildDocumentationPrompt(code: string, context: ContextData, docType: string): string {
        return `Generate ${docType} documentation for:

\`\`\`
${code}
\`\`\`

Context:
- File: ${context.currentFile}
- Function: ${context.currentFunction || 'N/A'}
- Class: ${context.currentClass || 'N/A'}

Please provide:
1. Clear and comprehensive documentation
2. Parameter descriptions (if applicable)
3. Return value descriptions (if applicable)
4. Usage examples
5. Any important notes or warnings`;
    }
    
    private buildArchitecturePrompt(context: ContextData, requirements: string): string {
        return `Suggest architectural improvements for the following requirements:

${requirements}

Current project context:
- Root: ${context.projectRoot || 'Not specified'}
- Patterns: ${context.architecturalPatterns?.join(', ') || 'None'}
- Dependencies: ${context.dependencies?.production ? Object.keys(context.dependencies.production).join(', ') : 'None'}

Please provide:
1. Architectural recommendations
2. Design patterns to consider
3. Technology stack suggestions
4. Implementation roadmap
5. Potential challenges and mitigation strategies`;
    }
    
    /**
     * Helper methods
     */
    private summarizeContext(context: ContextData): string {
        const summary = [];
        
        if (context.currentFile) {
            summary.push(`File: ${context.currentFile}`);
        }
        
        if (context.currentFunction) {
            summary.push(`Function: ${context.currentFunction}`);
        }
        
        if (context.currentClass) {
            summary.push(`Class: ${context.currentClass}`);
        }
        
        if (context.hasErrors) {
            summary.push('Has compilation errors');
        }
        
        if (context.hasWarnings) {
            summary.push('Has warnings');
        }
        
        if (context.complexity && context.complexity > 10) {
            summary.push(`High complexity (${context.complexity})`);
        }
        
        return summary.join(', ') || 'No specific context';
    }
    
    private detectProjectType(context: ContextData): string {
        if (!context.dependencies?.production) return 'Unknown';
        
        const deps = Object.keys(context.dependencies.production);
        
        if (deps.includes('react')) return 'React';
        if (deps.includes('vue')) return 'Vue';
        if (deps.includes('angular')) return 'Angular';
        if (deps.includes('express')) return 'Node.js/Express';
        if (deps.includes('next')) return 'Next.js';
        if (deps.includes('nuxt')) return 'Nuxt.js';
        
        return 'JavaScript/TypeScript';
    }
    
    private checkRateLimit(): boolean {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Remove timestamps older than 1 minute
        this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
        
        return this.requestTimestamps.length < this.MAX_REQUESTS_PER_MINUTE;
    }
    
    private isRetryableError(error: any): boolean {
        if (!error.response) return true; // Network errors are retryable
        
        const status = error.response.status;
        return status >= 500 || status === 429; // Server errors and rate limits
    }
    
    private getErrorMessage(error: any): string {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            if (status === 401) {
                return 'Authentication failed. Please check your API key.';
            }
            
            if (status === 429) {
                return 'Rate limit exceeded. Please wait before making more requests.';
            }
            
            if (status >= 500) {
                return 'Qwen API server error. Please try again later.';
            }
            
            return data?.error?.message || data?.message || `HTTP ${status} error`;
        }
        
        if (error.code === 'ECONNREFUSED') {
            return 'Cannot connect to Qwen API. Please check the API URL and ensure the service is running.';
        }
        
        if (error.code === 'ETIMEDOUT') {
            return 'Request timed out. The Qwen API may be overloaded.';
        }
        
        return error.message || 'Unknown error occurred';
    }
    
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    private setupInterceptors(): void {
        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                console.log(`Making Qwen API request to ${config.url}`);
                return config;
            },
            (error) => {
                console.error('Request interceptor error:', error);
                return Promise.reject(error);
            }
        );
        
        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                console.log(`Qwen API response received (${response.status})`);
                return response;
            },
            (error) => {
                console.error('Response interceptor error:', error.response?.status, error.message);
                return Promise.reject(error);
            }
        );
    }
}