import * as vscode from 'vscode';
import { ComplexityResult } from './analyzer';

export class ComplexityDecorator {
    private lowComplexityDecoration: vscode.TextEditorDecorationType;
    private mediumComplexityDecoration: vscode.TextEditorDecorationType;
    private highComplexityDecoration: vscode.TextEditorDecorationType;

    constructor() {
        // Define decoration styles for different complexity levels
        this.lowComplexityDecoration = vscode.window.createTextEditorDecorationType({
            after: {
                color: '#00ff00',
                margin: '0 0 0 1em'
            }
        });

        this.mediumComplexityDecoration = vscode.window.createTextEditorDecorationType({
            after: {
                color: '#ffaa00',
                margin: '0 0 0 1em'
            },
            backgroundColor: 'rgba(255, 170, 0, 0.1)'
        });

        this.highComplexityDecoration = vscode.window.createTextEditorDecorationType({
            after: {
                color: '#ff0000',
                margin: '0 0 0 1em'
            },
            backgroundColor: 'rgba(255, 0, 0, 0.1)'
        });
    }

    /**
     * Applies complexity decorations to the editor
     */
    applyDecorations(editor: vscode.TextEditor, results: ComplexityResult[]): void {
        const config = vscode.workspace.getConfiguration('cyclematicComplexity');
        const threshold = config.get<number>('threshold', 10);

        const lowDecorations: vscode.DecorationOptions[] = [];
        const mediumDecorations: vscode.DecorationOptions[] = [];
        const highDecorations: vscode.DecorationOptions[] = [];

        results.forEach(result => {
            // Get the line where the function is defined
            const startPosition = editor.document.positionAt(result.startOffset);
            let currentLine = startPosition.line;
            let decorationPosition = editor.document.lineAt(currentLine).range.end;
            
            // Search for the end of the function signature (may span multiple lines)
            // Look for opening brace { or colon : that marks the start of function body
            let found = false;
            const maxLinesToSearch = 10; // Limit search to avoid performance issues
            
            for (let i = 0; i < maxLinesToSearch && currentLine + i < editor.document.lineCount; i++) {
                const line = editor.document.lineAt(currentLine + i);
                const lineText = line.text;
                
                // For JavaScript/TypeScript, find the opening brace
                const braceIndex = lineText.indexOf('{');
                if (braceIndex !== -1) {
                    decorationPosition = new vscode.Position(currentLine + i, braceIndex);
                    found = true;
                    break;
                }
                
                // For Python, find the colon (but skip type hints with colons)
                // Look for the last colon on the line, which should be the function definition colon
                const colonIndex = lineText.lastIndexOf(':');
                if (colonIndex !== -1) {
                    // Make sure it's not a type hint colon (which would have text after it like ": int")
                    const afterColon = lineText.substring(colonIndex + 1).trim();
                    // If nothing after colon except maybe comments, it's the function definition
                    if (afterColon === '' || afterColon.startsWith('#')) {
                        decorationPosition = new vscode.Position(currentLine + i, colonIndex);
                        found = true;
                        break;
                    }
                }
                
                // For arrow functions, find =>
                const arrowIndex = lineText.indexOf('=>');
                if (arrowIndex !== -1) {
                    decorationPosition = new vscode.Position(currentLine + i, arrowIndex + 2);
                    found = true;
                    break;
                }
            }
            
            // If we didn't find a marker, just use the end of the first line
            if (!found) {
                decorationPosition = editor.document.lineAt(startPosition.line).range.end;
            }

            const range = new vscode.Range(decorationPosition, decorationPosition);

            const decoration: vscode.DecorationOptions = {
                range,
                renderOptions: {
                    after: {
                        contentText: ` Complexity: ${result.complexity}`
                    }
                }
            };

            if (result.complexity <= threshold) {
                lowDecorations.push(decoration);
            } else if (result.complexity <= threshold * 1.5) {
                mediumDecorations.push(decoration);
            } else {
                highDecorations.push(decoration);
            }
        });

        editor.setDecorations(this.lowComplexityDecoration, lowDecorations);
        editor.setDecorations(this.mediumComplexityDecoration, mediumDecorations);
        editor.setDecorations(this.highComplexityDecoration, highDecorations);
    }

    /**
     * Clears all decorations
     */
    clearDecorations(editor: vscode.TextEditor): void {
        editor.setDecorations(this.lowComplexityDecoration, []);
        editor.setDecorations(this.mediumComplexityDecoration, []);
        editor.setDecorations(this.highComplexityDecoration, []);
    }

    /**
     * Disposes all decoration types
     */
    dispose(): void {
        this.lowComplexityDecoration.dispose();
        this.mediumComplexityDecoration.dispose();
        this.highComplexityDecoration.dispose();
    }
}
