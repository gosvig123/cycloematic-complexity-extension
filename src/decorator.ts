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
            const position = editor.document.positionAt(result.startOffset);
            const range = new vscode.Range(position, position);

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
