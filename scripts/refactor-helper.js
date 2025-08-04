#!/usr/bin/env node

/**
 * VaultPilot Refactor Helper Script
 * 
 * Helps identify large files and provides refactor recommendations.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  sourceDir: 'src',
  maxLines: 500,
  extensions: ['.ts', '.js'],
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    '.git',
    'test',
    'spec'
  ]
};

class RefactorAnalyzer {
  constructor() {
    this.results = [];
  }

  async analyze() {
    console.log('🔍 Analyzing VaultPilot codebase for refactor opportunities...\n');
    
    await this.scanDirectory(CONFIG.sourceDir);
    this.generateReport();
    this.generateRecommendations();
  }

  async scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !this.shouldIgnore(item)) {
        await this.scanDirectory(fullPath);
      } else if (stat.isFile() && this.isTargetFile(item)) {
        await this.analyzeFile(fullPath);
      }
    }
  }

  async analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const lineCount = lines.length;
    
    if (lineCount > CONFIG.maxLines) {
      const analysis = this.analyzeFileStructure(content, filePath);
      
      this.results.push({
        path: filePath,
        lines: lineCount,
        analysis,
        priority: this.calculatePriority(lineCount, analysis)
      });
    }
  }

  analyzeFileStructure(content, filePath) {
    const lines = content.split('\n');
    const structure = {
      classes: [],
      interfaces: [],
      functions: [],
      imports: [],
      exports: [],
      complexity: 0
    };

    let currentClass = null;
    let braceLevel = 0;
    let complexity = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Count complexity indicators
      if (line.includes('if (') || line.includes('else if (')) complexity++;
      if (line.includes('for (') || line.includes('while (')) complexity++;
      if (line.includes('switch (')) complexity++;
      if (line.includes('catch (')) complexity++;
      
      // Track brace levels
      braceLevel += (line.match(/{/g) || []).length;
      braceLevel -= (line.match(/}/g) || []).length;
      
      // Find structural elements
      if (line.startsWith('export class ') || line.startsWith('class ')) {
        const className = line.match(/class\s+(\w+)/)?.[1];
        currentClass = { name: className, line: i + 1, methods: [] };
        structure.classes.push(currentClass);
      }
      
      if (line.startsWith('export interface ') || line.startsWith('interface ')) {
        const interfaceName = line.match(/interface\s+(\w+)/)?.[1];
        structure.interfaces.push({ name: interfaceName, line: i + 1 });
      }
      
      if (line.includes('async ') && line.includes('(') || 
          line.match(/^\s*(public|private|protected)?\s*\w+\s*\(/)) {
        const functionName = line.match(/(\w+)\s*\(/)?.[1];
        if (functionName && currentClass) {
          currentClass.methods.push({ name: functionName, line: i + 1 });
        } else if (functionName) {
          structure.functions.push({ name: functionName, line: i + 1 });
        }
      }
      
      if (line.startsWith('import ')) {
        structure.imports.push(line);
      }
      
      if (line.startsWith('export ')) {
        structure.exports.push(line);
      }
    }
    
    structure.complexity = complexity;
    return structure;
  }

  calculatePriority(lineCount, analysis) {
    let score = 0;
    
    // Size factor
    if (lineCount > 2000) score += 10;
    else if (lineCount > 1500) score += 8;
    else if (lineCount > 1000) score += 6;
    else if (lineCount > 500) score += 4;
    
    // Complexity factor
    if (analysis.complexity > 100) score += 5;
    else if (analysis.complexity > 50) score += 3;
    else if (analysis.complexity > 25) score += 1;
    
    // Structure factor (multiple large classes indicate good refactor targets)
    if (analysis.classes.length > 3) score += 3;
    if (analysis.functions.length > 20) score += 2;
    
    if (score >= 15) return 'CRITICAL';
    if (score >= 10) return 'HIGH';
    if (score >= 6) return 'MEDIUM';
    return 'LOW';
  }

  shouldIgnore(item) {
    return CONFIG.ignorePatterns.some(pattern => item.includes(pattern));
  }

  isTargetFile(filename) {
    return CONFIG.extensions.some(ext => filename.endsWith(ext));
  }

  generateReport() {
    console.log('📊 REFACTOR ANALYSIS REPORT\n');
    console.log('=' * 50);
    
    // Sort by priority and line count
    const sorted = this.results.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : b.lines - a.lines;
    });

    sorted.forEach((result, index) => {
      const priority = result.priority;
      const emoji = {
        CRITICAL: '🚨',
        HIGH: '⚠️',
        MEDIUM: '💡',
        LOW: 'ℹ️'
      }[priority];
      
      console.log(`${index + 1}. ${emoji} ${priority} PRIORITY`);
      console.log(`   File: ${result.path}`);
      console.log(`   Lines: ${result.lines}`);
      console.log(`   Classes: ${result.analysis.classes.length}`);
      console.log(`   Functions: ${result.analysis.functions.length}`);
      console.log(`   Complexity: ${result.analysis.complexity}`);
      console.log('');
    });
  }

  generateRecommendations() {
    console.log('🎯 REFACTOR RECOMMENDATIONS\n');
    console.log('=' * 50);
    
    const critical = this.results.filter(r => r.priority === 'CRITICAL');
    const high = this.results.filter(r => r.priority === 'HIGH');
    
    if (critical.length > 0) {
      console.log('🚨 CRITICAL: Immediate attention needed');
      critical.forEach(result => {
        console.log(`   • ${result.path} (${result.lines} lines)`);
        this.generateFileRecommendations(result);
      });
      console.log('');
    }
    
    if (high.length > 0) {
      console.log('⚠️ HIGH: Should be addressed soon');
      high.forEach(result => {
        console.log(`   • ${result.path} (${result.lines} lines)`);
      });
      console.log('');
    }
    
    console.log('💡 GENERAL RECOMMENDATIONS:');
    console.log('   • Extract classes into separate files');
    console.log('   • Create utility modules for shared functions');
    console.log('   • Use barrel exports for clean imports');
    console.log('   • Consider breaking large interfaces into smaller ones');
    console.log('   • Move types to dedicated type files');
    console.log('');
    
    console.log('🔧 TOOLS TO HELP:');
    console.log('   • Use VSCode "Go to Symbol" to navigate large files');
    console.log('   • Run `npx madge --circular src/` to check for circular deps');
    console.log('   • Use `npm run build -- --analyze` to check bundle impact');
  }

  generateFileRecommendations(result) {
    const { analysis, path: filePath } = result;
    
    if (analysis.classes.length > 1) {
      console.log(`     → Extract ${analysis.classes.length} classes into separate files`);
    }
    
    if (analysis.interfaces.length > 3) {
      console.log(`     → Move ${analysis.interfaces.length} interfaces to types file`);
    }
    
    if (analysis.functions.length > 10) {
      console.log(`     → Extract utility functions to utils module`);
    }
    
    if (analysis.complexity > 50) {
      console.log(`     → High complexity (${analysis.complexity}) - consider breaking down logic`);
    }
  }
}

// Run the analyzer
if (require.main === module) {
  const analyzer = new RefactorAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = RefactorAnalyzer;