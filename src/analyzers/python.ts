import * as vscode from 'vscode';
import * as path from 'path';
import * as child_process from 'child_process';
import { ComplexityResult, LanguageAnalyzer } from './base';

export class PythonAnalyzer implements LanguageAnalyzer {
    private usePythonAST: boolean = true;

    canAnalyze(languageId: string): boolean {
        return languageId === 'python';
    }

    async analyze(document: vscode.TextDocument): Promise<ComplexityResult[]> {
        // Try Python AST analyzer first
        if (this.usePythonAST) {
            try {
                return await this.analyzeWithPythonAST(document);
            } catch (error) {
                console.warn('[Python] AST analyzer failed, falling back to regex:', error);
                this.usePythonAST = false; // Disable for future calls if it fails
            }
        }

        // Fallback to regex-based analyzer
        return await this.analyzeWithRegex(document);
    }

    private async analyzeWithPythonAST(document: vscode.TextDocument): Promise<ComplexityResult[]> {
        const results: ComplexityResult[] = [];

        // Save document to a temp file (or use existing file path)
        const filePath = document.uri.fsPath;

        // Find the Python script path
        const extensionPath = path.join(__dirname, '..', '..');
        const scriptPath = path.join(extensionPath, 'python-analyzer', 'complexity_analyzer.py');

        // Get Python path from settings
        const config = vscode.workspace.getConfiguration('cyclematicComplexity');
        const pythonPath = config.get<string>('python.pythonPath', 'python3');

        console.log(`[Python AST] Analyzing file: ${filePath}`);
        console.log(`[Python AST] Script path: ${scriptPath}`);
        console.log(`[Python AST] Python executable: ${pythonPath}`);

        return new Promise((resolve, reject) => {
            // Execute the Python script
            child_process.exec(
                `"${pythonPath}" "${scriptPath}" "${filePath}"`,
                { maxBuffer: 10 * 1024 * 1024 }, // 10MB buffer
                (error, stdout, stderr) => {
                    if (error) {
                        console.error('[Python AST] Execution error:', error);
                        reject(error);
                        return;
                    }

                    if (stderr) {
                        console.warn('[Python AST] Warning:', stderr);
                    }

                    try {
                        const result = JSON.parse(stdout);
                        
                        if (!result.success) {
                            console.error('[Python AST] Analysis failed:', result.error);
                            reject(new Error(result.error));
                            return;
                        }

                        console.log(`[Python AST] Found ${result.total_functions} functions`);

                        // Convert Python results to ComplexityResult format
                        for (const func of result.functions) {
                            // Calculate offset from line/col
                            const position = new vscode.Position(func.line - 1, func.col);
                            const startOffset = document.offsetAt(position);
                            
                            const endPosition = new vscode.Position(func.end_line - 1, func.end_col);
                            const endOffset = document.offsetAt(endPosition);

                            const funcName = func.is_async ? `async ${func.name}` : func.name;

                            results.push({
                                name: funcName,
                                line: func.line,
                                complexity: func.complexity,
                                startOffset: startOffset,
                                endOffset: endOffset
                            });

                            console.log(`[Python AST] ${funcName}: complexity=${func.complexity}`);
                        }

                        resolve(results);
                    } catch (parseError) {
                        console.error('[Python AST] JSON parse error:', parseError);
                        console.error('[Python AST] Output was:', stdout);
                        reject(parseError);
                    }
                }
            );
        });
    }

    private async analyzeWithRegex(document: vscode.TextDocument): Promise<ComplexityResult[]> {
        const text = document.getText();
        const results: ComplexityResult[] = [];

        console.log('[Python Regex] Using fallback regex analyzer');

        try {
            const lines = text.split('\n');
            const functions = this.findFunctions(lines);

            for (const func of functions) {
                const complexity = this.calculateComplexity(lines, func.startLine, func.endLine);
                const position = document.positionAt(func.startOffset);

                console.log(`[Python Regex] ${func.name}: lines ${func.startLine}-${func.endLine}, complexity=${complexity}`);

                results.push({
                    name: func.name,
                    line: position.line + 1,
                    complexity: complexity,
                    startOffset: func.startOffset,
                    endOffset: func.endOffset
                });
            }
        } catch (error) {
            console.error('[Python Regex] Error:', error);
            throw new Error(`Failed to parse Python file: ${error}`);
        }

        return results;
    }

    private findFunctions(lines: string[]): Array<{
        name: string;
        startLine: number;
        endLine: number;
        startOffset: number;
        endOffset: number;
        indent: number;
    }> {
        const functions: Array<{
            name: string;
            startLine: number;
            endLine: number;
            startOffset: number;
            endOffset: number;
            indent: number;
        }> = [];

        let currentOffset = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Match function definitions: def function_name(...):
            // This can span multiple lines, so we need to check for the pattern
            const funcMatch = trimmed.match(/^def\s+(\w+)\s*\(/);
            const asyncFuncMatch = trimmed.match(/^async\s+def\s+(\w+)\s*\(/);
            
            const match = funcMatch || asyncFuncMatch;
            
            if (match) {
                const functionName = match[1];
                const indent = line.length - line.trimStart().length;
                let startLine = i;
                const startOffset = currentOffset;

                // Handle multi-line function signatures
                // Find the line with the colon that ends the signature
                let signatureEndLine = i;
                for (let j = i; j < lines.length; j++) {
                    if (lines[j].includes(':')) {
                        signatureEndLine = j;
                        break;
                    }
                }

                // Start analysis from the line after the signature
                startLine = signatureEndLine;

                // Skip docstring if present (starts right after function definition)
                let actualStartLine = startLine + 1;
                if (actualStartLine < lines.length) {
                    const firstBodyLine = lines[actualStartLine].trim();
                    if (firstBodyLine.startsWith('"""') || firstBodyLine.startsWith("'''")) {
                        // Skip to end of docstring
                        const docstringDelim = firstBodyLine.startsWith('"""') ? '"""' : "'''";
                        
                        // Check if docstring is single-line
                        if (firstBodyLine.endsWith(docstringDelim) && firstBodyLine.length > 6) {
                            actualStartLine++;
                        } else {
                            // Multi-line docstring
                            for (let j = actualStartLine + 1; j < lines.length; j++) {
                                if (lines[j].trim().includes(docstringDelim)) {
                                    actualStartLine = j + 1;
                                    break;
                                }
                            }
                        }
                    }
                }

                // Find the end of the function (next function or dedent)
                let endLine = actualStartLine;
                let inStringBlock = false;
                
                for (let j = actualStartLine; j < lines.length; j++) {
                    const nextLine = lines[j];
                    const nextTrimmed = nextLine.trim();
                    
                    // Track triple-quoted strings to avoid false positives
                    if (nextTrimmed.includes('"""') || nextTrimmed.includes("'''")) {
                        const quoteCount = (nextTrimmed.match(/"""|'''/g) || []).length;
                        if (quoteCount % 2 === 1) {
                            inStringBlock = !inStringBlock;
                        }
                    }

                    // Skip empty lines and comments
                    if (nextTrimmed === '' || nextTrimmed.startsWith('#')) {
                        endLine = j;
                        continue;
                    }

                    // Don't check indentation if we're in a string block
                    if (inStringBlock) {
                        endLine = j;
                        continue;
                    }

                    const nextIndent = nextLine.length - nextLine.trimStart().length;

                    // If we find code at same or lower indentation level, function ends
                    if (nextIndent <= indent && nextTrimmed !== '') {
                        break;
                    }

                    endLine = j;
                }

                // Calculate end offset
                let endOffset = startOffset;
                for (let j = i; j <= endLine; j++) {
                    endOffset += lines[j].length + 1; // +1 for newline
                }

                functions.push({
                    name: functionName,
                    startLine: actualStartLine,
                    endLine,
                    startOffset,
                    endOffset,
                    indent
                });
            }

            currentOffset += line.length + 1; // +1 for newline
        }

        return functions;
    }

    private calculateComplexity(lines: string[], startLine: number, endLine: number): number {
        let complexity = 1; // Base complexity
        let debugInfo: string[] = [];

        for (let i = startLine; i <= endLine; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Skip comments and empty lines
            if (trimmed.startsWith('#') || trimmed === '' || trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
                continue;
            }

            // Count decision points on this line
            const lineComplexity = this.countLineComplexity(trimmed);
            if (lineComplexity > 0) {
                debugInfo.push(`  Line ${i + 1}: +${lineComplexity} "${trimmed.substring(0, 50)}..."`);
            }
            complexity += lineComplexity;
        }

        if (debugInfo.length > 0) {
            console.log(`[Python] Complexity breakdown (${startLine}-${endLine}):\n${debugInfo.join('\n')}`);
        }

        return complexity;
    }

    private countLineComplexity(line: string): number {
        let points = 0;

        // Remove string literals to avoid false positives
        const cleanLine = this.removeStringLiterals(line);

        // 1. Conditional statements: if, elif (not else - else doesn't add a decision point)
        if (/^\bif\b/.test(cleanLine)) {
            points++;
        }
        if (/^\belif\b/.test(cleanLine)) {
            points++;
        }

        // 2. Loops: for, while
        if (/^\bfor\b/.test(cleanLine)) {
            points++;
        }
        if (/^\bwhile\b/.test(cleanLine)) {
            points++;
        }

        // 3. Exception handling: except, finally with condition
        if (/^\bexcept\b/.test(cleanLine)) {
            points++;
        }

        // 4. Boolean operators: and, or
        // Count each occurrence as they create decision paths
        const andMatches = cleanLine.match(/\band\b/g);
        const orMatches = cleanLine.match(/\bor\b/g);
        
        if (andMatches) {
            points += andMatches.length;
        }
        if (orMatches) {
            points += orMatches.length;
        }

        // 5. Ternary expressions: x if condition else y
        // Look for pattern where 'if' and 'else' are both present (not statement)
        if (!cleanLine.startsWith('if') && !cleanLine.startsWith('elif')) {
            // Match inline conditional expressions
            const ternaryPattern = /\S+\s+if\s+.+\s+else\s+\S+/g;
            const ternaryMatches = cleanLine.match(ternaryPattern);
            if (ternaryMatches) {
                points += ternaryMatches.length;
            }
        }

        // 6. List/Dict/Set comprehensions with if
        // Pattern: [x for x in y if condition]
        const comprehensionPattern = /\[.*for\s+\w+\s+in\s+.*\s+if\s+.*\]|\{.*for\s+\w+\s+in\s+.*\s+if\s+.*\}|\(.*for\s+\w+\s+in\s+.*\s+if\s+.*\)/g;
        const comprehensionMatches = cleanLine.match(comprehensionPattern);
        if (comprehensionMatches) {
            // Count 'if' keywords within comprehensions
            comprehensionMatches.forEach(comp => {
                const ifCount = (comp.match(/\bif\b/g) || []).length;
                points += ifCount;
            });
        }

        // 7. Match/case statements (Python 3.10+)
        // Each case adds a decision point (except default case _)
        if (/^\bcase\b/.test(cleanLine) && !/^\bcase\s+_\s*:/.test(cleanLine)) {
            points++;
        }

        // 8. Walrus operator with conditions: if (x := value)
        if (/:\s*=/.test(cleanLine) && /^\b(if|elif|while)\b/.test(cleanLine)) {
            // Already counted by if/elif/while
        }

        // 9. Assert statements with conditions can be considered decision points
        // (optional - some tools count these, some don't)
        if (/^\bassert\b/.test(cleanLine) && cleanLine.includes(',')) {
            // assert condition, message - the condition is a decision point
            points++;
        }

        // 10. Chained comparisons: a < b < c creates multiple decision points
        // Python allows: if 0 < x < 10 which is really: if 0 < x and x < 10
        const comparisonOperators = cleanLine.match(/[<>!=]=?/g);
        if (comparisonOperators && comparisonOperators.length > 1) {
            // Multiple comparisons in a chain add complexity
            // But only count if they're chained (not in different expressions)
            const chainedComparison = /\w+\s*[<>!=]=?\s*\w+\s*[<>!=]=?\s*\w+/;
            if (chainedComparison.test(cleanLine)) {
                points += (comparisonOperators.length - 1);
            }
        }

        return points;
    }

    /**
     * Remove string literals to avoid counting keywords inside strings
     */
    private removeStringLiterals(line: string): string {
        // Remove triple-quoted strings
        let cleaned = line.replace(/"""[\s\S]*?"""/g, '""');
        cleaned = cleaned.replace(/'''[\s\S]*?'''/g, "''");
        
        // Remove regular strings
        cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, '""');
        cleaned = cleaned.replace(/'(?:[^'\\]|\\.)*'/g, "''");
        
        // Remove f-strings
        cleaned = cleaned.replace(/f"(?:[^"\\]|\\.)*"/g, '""');
        cleaned = cleaned.replace(/f'(?:[^'\\]|\\.)*'/g, "''");
        
        return cleaned;
    }
}
