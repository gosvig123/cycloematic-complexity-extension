import * as vscode from 'vscode';
import { ComplexityAnalyzer } from './analyzer';
import { ComplexityDecorator } from './decorator';

export function activate(context: vscode.ExtensionContext) {
    console.log('Cyclomatic Complexity extension is now active');

    const analyzer = new ComplexityAnalyzer();
    const decorator = new ComplexityDecorator();

    // Register command to analyze current file
    const analyzeCommand = vscode.commands.registerCommand(
        'cyclematicComplexity.analyze',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            const document = editor.document;
            
            // Check if file type is supported
            const supportedLanguages = analyzer.getSupportedLanguages();
            if (!supportedLanguages.includes(document.languageId)) {
                vscode.window.showWarningMessage(
                    `Cyclomatic complexity analysis is not supported for ${document.languageId}. Supported languages: ${supportedLanguages.join(', ')}`
                );
                return;
            }

            try {
                const results = await analyzer.analyzeDocument(document);
                
                if (results.length === 0) {
                    vscode.window.showInformationMessage('No functions found in the current file');
                    return;
                }
                
                // Show results in output channel
                const outputChannel = vscode.window.createOutputChannel('Cyclomatic Complexity');
                outputChannel.clear();
                outputChannel.appendLine(`Complexity Analysis for ${document.fileName}`);
                outputChannel.appendLine('='.repeat(60));
                outputChannel.appendLine('');
                
                // Sort by complexity (highest first)
                const sortedResults = [...results].sort((a, b) => b.complexity - a.complexity);
                
                // Get threshold for severity calculation
                const config = vscode.workspace.getConfiguration('cyclematicComplexity');
                const threshold = config.get<number>('threshold', 10);
                
                sortedResults.forEach(result => {
                    const severity = analyzer.getSeverity(result.complexity, threshold);
                    const indicator = severity === 'high' ? '⚠️' : severity === 'medium' ? '⚡' : '✓';
                    
                    outputChannel.appendLine(
                        `${indicator} ${result.name.padEnd(30)} Line ${String(result.line).padStart(4)} - Complexity: ${result.complexity}`
                    );
                });
                
                outputChannel.appendLine('');
                outputChannel.appendLine('='.repeat(60));
                outputChannel.appendLine(`Total functions: ${results.length}`);
                
                const avgComplexity = (results.reduce((sum, r) => sum + r.complexity, 0) / results.length).toFixed(2);
                outputChannel.appendLine(`Average complexity: ${avgComplexity}`);
                
                const highComplexity = results.filter(r => analyzer.getSeverity(r.complexity, threshold) === 'high').length;
                if (highComplexity > 0) {
                    outputChannel.appendLine(`⚠️  High complexity functions: ${highComplexity}`);
                }
                
                outputChannel.show();
                
                // Apply decorations
                if (config.get('enableDecorations')) {
                    decorator.applyDecorations(editor, results);
                }
                
                vscode.window.showInformationMessage(
                    `Analysis complete: ${results.length} functions analyzed (Avg: ${avgComplexity})`
                );
            } catch (error) {
                console.error('Error analyzing complexity:', error);
                vscode.window.showErrorMessage(
                    `Error analyzing complexity: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
    );

    // Register command to show complexity report
    const reportCommand = vscode.commands.registerCommand(
        'cyclematicComplexity.showReport',
        () => {
            vscode.window.showInformationMessage('Complexity report feature coming soon!');
        }
    );

    // Update decorations when file changes
    let updateTimeout: NodeJS.Timeout | undefined;
    const changeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
        const config = vscode.workspace.getConfiguration('cyclematicComplexity');
        const enableDecorations = config.get('enableDecorations', true);
        
        if (!enableDecorations) {
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === event.document) {
            // Debounce updates to avoid analyzing on every keystroke
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            
            updateTimeout = setTimeout(async () => {
                const supportedLanguages = analyzer.getSupportedLanguages();
                if (supportedLanguages.includes(event.document.languageId)) {
                    try {
                        // Pass cursor position for incremental analysis
                        const cursorPosition = editor.selection.active;
                        const results = await analyzer.analyzeDocument(event.document, cursorPosition);
                        decorator.applyDecorations(editor, results);
                    } catch (error) {
                        console.error('Error updating complexity decorations:', error);
                    }
                }
            }, 500); // Wait 500ms after typing stops
        }
    });

    // Auto-analyze on file save
    const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('cyclematicComplexity');
        const enableOnSave = config.get('analyzeOnSave', false);
        
        if (enableOnSave) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document === document) {
                const results = await analyzer.analyzeDocument(document);
                decorator.applyDecorations(editor, results);
            }
        }
    });

    // Update decorations when switching editors
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        const config = vscode.workspace.getConfiguration('cyclematicComplexity');
        const enableDecorations = config.get('enableDecorations', true);
        
        if (!enableDecorations || !editor) {
            return;
        }

        const supportedLanguages = analyzer.getSupportedLanguages();
        if (supportedLanguages.includes(editor.document.languageId)) {
            try {
                const results = await analyzer.analyzeDocument(editor.document);
                decorator.applyDecorations(editor, results);
            } catch (error) {
                console.error('Error analyzing complexity on editor change:', error);
            }
        }
    });

    // Clear cache when document is closed to free memory
    const closeListener = vscode.workspace.onDidCloseTextDocument((document) => {
        analyzer.clearCache(document);
    });

    context.subscriptions.push(analyzeCommand, reportCommand, saveListener, changeListener, editorChangeListener, closeListener);
}

export function deactivate() {
    console.log('Cyclomatic Complexity extension is now deactivated');
}
