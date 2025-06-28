/**
 * AI Agent Debugging Utilities for VaultPilot
 * Provides systematic debugging functions for autonomous code analysis
 */

export class VaultPilotDebugAgent {
  private workspace: string;
  
  constructor(workspacePath: string) {
    this.workspace = workspacePath;
  }

  /**
   * Core Analysis Capabilities
   * Systematic approach to codebase investigation
   */
  
  // 1. Workspace Navigation & Search
  async analyzeWorkspaceStructure() {
    const searchStrategies = {
      // Look for error messages in logs or console outputs
      errorMessages: "search 'error|Error|ERROR' in *.ts,*.js,*.md",
      
      // Search for API endpoint definitions
      apiEndpoints: "search '/api/|@app.route|@router|app.post|app.get' in *.ts,*.js",
      
      // Find configuration files
      configFiles: "search '.env|config|settings|manifest' in *.*",
      
      // Locate test files to understand expected behavior
      testFiles: "search 'test|spec|__tests__|describe|it(' in *.ts,*.js"
    };
    
    return searchStrategies;
  }

  // 2. Error Analysis Workflow
  async identifyErrorType(errorMessage: string) {
    const errorPatterns = {
      // HTTP status codes
      clientErrors: /4\d{2}/, // 4xx = client/request issue
      serverErrors: /5\d{2}/, // 5xx = server issue
      
      // Frontend errors
      frontendErrors: /TypeError|ReferenceError|Cannot read property/,
      
      // Backend errors  
      backendErrors: /CORS|Internal Server Error|Connection refused/,
      
      // Database errors
      databaseErrors: /SQL|Database|Connection timeout/
    };
    
    const analysis: {
      type: string;
      priority: string;
      searchCommands: string[];
    } = {
      type: 'unknown',
      priority: 'medium',
      searchCommands: []
    };
    
    if (errorPatterns.clientErrors.test(errorMessage)) {
      analysis.type = 'client_error';
      analysis.priority = 'high';
      analysis.searchCommands = [
        "@workspace search 'ChatRequest|CopilotRequest|WorkflowRequest' in types.ts",
        "@workspace search 'makeRequest.*POST|PUT|PATCH' in api-client.ts",
        "@workspace search 'validation|required|missing' in *.ts"
      ];
    }
    
    if (errorPatterns.serverErrors.test(errorMessage)) {
      analysis.type = 'server_error';
      analysis.priority = 'critical';
      analysis.searchCommands = [
        "@workspace search 'baseUrl|backendUrl|localhost' in *.ts",
        "@workspace search 'healthCheck|testConnection' in *.ts",
        "@workspace search 'try.*catch|error.*handling' in *.ts"
      ];
    }
    
    return analysis;
  }

  // 3. Code Investigation Patterns
  async investigateBackendIssues() {
    const searchPriority = {
      // Route definitions
      routes: [
        "@workspace search '@app.post|@router.post|app.post(' in *.ts,*.js",
        "@workspace search '/api/obsidian' in *.ts"
      ],
      
      // Request models
      models: [
        "@workspace search 'interface.*Request|interface.*Response' in types.ts",
        "@workspace search 'BaseModel|@dataclass|interface' in *.ts"
      ],
      
      // Validation logic
      validation: [
        "@workspace search 'validate|schema|required|optional' in *.ts",
        "@workspace search 'body.*JSON|JSON.stringify' in *.ts"
      ],
      
      // Error handling
      errorHandling: [
        "@workspace search 'try.*catch|error.*message' in *.ts",
        "@workspace search 'APIResponse.*error|success.*false' in *.ts"
      ]
    };
    
    return searchPriority;
  }

  async investigateFrontendIssues() {
    const searchPriority = {
      // HTTP requests
      requests: [
        "@workspace search 'fetch|axios|XMLHttpRequest|makeRequest' in *.ts",
        "@workspace search 'method.*POST|PUT|PATCH' in *.ts"
      ],
      
      // Event handlers
      events: [
        "@workspace search 'onClick|onSubmit|addEventListener|callback' in *.ts",
        "@workspace search 'addCommand|registerCommand' in *.ts"
      ],
      
      // State management
      state: [
        "@workspace search 'settings|state|websocketConnected' in *.ts",
        "@workspace search 'loadSettings|saveSettings' in *.ts"
      ],
      
      // Error boundaries
      errors: [
        "@workspace search 'new Notice.*error|Notice.*Error' in *.ts",
        "@workspace search 'console.error|console.warn' in *.ts"
      ]
    };
    
    return searchPriority;
  }

  // 4. Debugging Commands for Agents
  async generateVSCodeCommands() {
    return {
      gitHistory: "git log --oneline -10",
      recentChanges: "git diff HEAD~1",
      dependencyCheck: "npm list --depth=0",
      typeCheck: "npx tsc --noEmit",
      buildCheck: "npm run build"
    };
  }

  // 5. Systematic Investigation Template
  async investigateHTTP422Error() {
    return {
      step1: {
        description: "Find the endpoint handler",
        commands: ["@workspace search '/api/obsidian/conversation/history' in *.ts"]
      },
      
      step2: {
        description: "Locate request model/schema", 
        commands: [
          "@workspace search 'ConversationHistory|ChatRequest' in types.ts",
          "@workspace search 'conversation.*history' in *.ts"
        ]
      },
      
      step3: {
        description: "Find frontend request code",
        commands: [
          "@workspace search 'fetch.*conversation/history' in *.ts", 
          "@workspace search 'conversation.*history.*POST' in *.ts"
        ]
      },
      
      step4: {
        description: "Compare payload structure",
        analysis: [
          "Check what the backend expects (schema/model definition)",
          "Check what the frontend sends (request body)",
          "Identify mismatches in field names, types, or required fields"
        ]
      },
      
      step5: {
        description: "Test hypothesis",
        suggestions: [
          "Add console.log to inspect payload before sending",
          "Add backend logging to see received data", 
          "Propose schema validation fixes"
        ]
      }
    };
  }

  // 6. Agent Communication Protocol
  generateReport(findings: any) {
    return {
      problemType: "This is a [backend validation/frontend request/configuration] issue",
      evidence: "Quote relevant code snippets from files",
      mismatch: "Backend expects X, but frontend sends Y", 
      specificFix: "Provide exact code changes needed",
      verification: "Test this by [specific action]"
    };
  }

  // 7. Tool-Specific Commands for VaultPilot
  async getVaultPilotSpecificCommands() {
    return {
      obsidianPlugin: {
        commands: [
          "@workspace search 'Plugin|addCommand|registerView' in main.ts",
          "@workspace search 'Notice|Modal|MarkdownView' in *.ts",
          "@workspace search 'manifest.json|package.json' in *.json"
        ]
      },
      
      evoAgentX: {
        commands: [
          "@workspace search 'EvoAgentXClient|makeRequest' in api-client.ts",
          "@workspace search '/api/obsidian' in *.ts",
          "@workspace search 'WebSocket|connectWebSocket' in *.ts"
        ]
      },
      
      typeScript: {
        commands: [
          "@workspace search 'interface|type|enum' in types.ts",
          "@workspace search 'export.*class|export.*function' in *.ts",
          "@workspace search 'tsconfig.json|rollup.config.js' in *.json,*.js"
        ]
      }
    };
  }

  // Emergency Debugging Patterns
  async emergencyDiagnostics() {
    return {
      criticalIssues: [
        "@workspace search 'TODO|FIXME|BUG|HACK' in *.ts,*.js",
        "@workspace search 'localhost|127.0.0.1|8000' in *.ts",
        "@workspace search 'hardcoded|temporary|debug' in *.ts"
      ],
      
      asyncErrors: [
        "@workspace search 'await.*(' in *.ts --regex",
        "@workspace search 'Promise.*reject|throw.*Error' in *.ts",
        "@workspace search 'async.*function.*{' in *.ts --regex"
      ],
      
      configurationIssues: [
        "@workspace search 'undefined|null|empty' in settings.ts",
        "@workspace search 'default.*settings|DEFAULT_SETTINGS' in *.ts",
        "@workspace search 'backendUrl|apiKey|enableWebSocket' in *.ts"
      ]
    };
  }

  // Validation and Testing Helpers
  async generateValidationChecklist() {
    return {
      compilation: "npm run build",
      typeChecking: "npx tsc --noEmit", 
      apiConsistency: "Compare interfaces in types.ts with actual usage",
      errorHandling: "Ensure all async operations have try-catch",
      userFeedback: "Check Notice messages for errors", 
      debugLogging: "Verify console messages for troubleshooting",
      settingsIntegration: "Test new options in settings panel"
    };
  }
}

// Example usage:
// const debugAgent = new VaultPilotDebugAgent('/Users/malachiledbetter/Documents/GitHub/VaultPilot');
// const investigation = await debugAgent.investigateHTTP422Error();
// const commands = await debugAgent.getVaultPilotSpecificCommands();
