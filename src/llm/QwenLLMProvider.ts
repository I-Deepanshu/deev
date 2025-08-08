import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { PrivacyManager } from '../core/PrivacyManager';
import { ContextData } from '../core/ContextAnalyzer';
import { AgentType } from '../agents/types';
import * as vscode from 'vscode';
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
            const response = await this.makeRequest(payload, !!stream);
            
            const responseTime = Date.now() - startTime;
            
            if (stream) {
                // For streaming, the content is already written to the stream
                return {
                    success: true,
                    completion: 'Streaming response handled by ChatResponseStream',
                    metadata: {
                        model: this.config.model,
                        responseTime: responseTime
                    }
                };
            } else {
                const axiosResponse = response as AxiosResponse;
                const completion = axiosResponse.data.choices[0].message.content;
                const usage = axiosResponse.data.usage;

                return {
                    success: true,
                    content: completion,
                    completion: completion,
                    usage: {
                        promptTokens: usage.prompt_tokens,
                        completionTokens: usage.completion_tokens,
                        totalTokens: usage.total_tokens
                    },
                    metadata: {
                        model: this.config.model,
                        responseTime: responseTime
                    }
                };
            }
            
        } catch (error) {
            console.error('Qwen LLM request failed:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
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
    private async makeRequest(payload: any, stream: boolean): Promise<AxiosResponse | vscode.ChatResponseStream> {
        if (stream) {
            return this.makeStreamingRequest(payload);
        } else {
            return this.makeNonStreamingRequest(payload);
        }
    }

    private async makeNonStreamingRequest(payload: any, retryCount: number = 0): Promise<AxiosResponse> {
        try {
            const response = await this.client.post('/v1/chat/completions', payload);
            this.requestCount++;
            this.requestTimestamps.push(Date.now());
            return response;
        } catch (error) {
            if (retryCount < this.config.retries && this.isRetryableError(error)) {
                const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                await this.sleep(delay);
                return this.makeNonStreamingRequest(payload, retryCount + 1);
            }
            throw error;
        }
    }

    private async makeStreamingRequest(payload: any, retryCount: number = 0): Promise<vscode.ChatResponseStream> {
        const stream = new vscode.ChatResponseStream();
        try {
            const response = await this.client.post('/v1/chat/completions', payload, {
                responseType: 'stream',
                onDownloadProgress: (progressEvent) => {
                    const data = progressEvent.event.currentTarget.responseText;
                    // Process streaming data here and write to 'stream'
                    // This part needs careful implementation based on Qwen's streaming format
                    // For now, a placeholder:
                    stream.write(data);
                }
            });
            this.requestCount++;
            this.requestTimestamps.push(Date.now());
            return stream;
        } catch (error) {
            if (retryCount < this.config.retries && this.isRetryableError(error)) {
                const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                await this.sleep(delay);
                return this.makeStreamingRequest(payload, retryCount + 1);
            }
            stream.reportError(this.getErrorMessage(error));
            throw error;
        }
    }

    private parseQwenResponse(response: AxiosResponse | vscode.ChatResponseStream, responseTime: number, stream?: vscode.ChatResponseStream): LLMResponse {
        if (stream) {
            // For streaming, the content is already written to the stream
            return {
                success: true,
                completion: 'Streaming response handled by ChatResponseStream',
                metadata: {
                    model: this.config.model,
                    responseTime: responseTime
                }
            };
        } else {
            const axiosResponse = response as AxiosResponse;
            const completion = axiosResponse.data.choices[0].message.content;
            const usage = axiosResponse.data.usage;

            return {
                success: true,
                content: completion,
                completion: completion,
                usage: {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens
                },
                metadata: {
                    model: this.config.model,
                    responseTime: responseTime
                }
            };
        }
    }
    
    /**
     * Parses Qwen API response
     */

    
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
    private summarizeContext(context?: ContextData): string {
        if (!context) {
            return 'No specific context provided.';
        }
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