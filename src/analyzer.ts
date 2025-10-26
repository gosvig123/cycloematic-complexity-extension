import * as vscode from 'vscode';
import { ComplexityResult, LanguageAnalyzer, getSeverity } from './analyzers/base';
import { JavaScriptAnalyzer } from './analyzers/javascript';
import { PythonAnalyzer } from './analyzers/python';

export { ComplexityResult };

export class ComplexityAnalyzer {
    private analyzers: LanguageAnalyzer[];

    constructor() {
        // Register all language analyzers
        this.analyzers = [
            new JavaScriptAnalyzer(),
            new PythonAnalyzer()
        ];
    }

    /**
     * Analyzes a document and returns complexity metrics for functions
     */
    async analyzeDocument(document: vscode.TextDocument): Promise<ComplexityResult[]> {
        // Find the appropriate analyzer for this language
        const analyzer = this.analyzers.find(a => a.canAnalyze(document.languageId));

        if (!analyzer) {
            throw new Error(`No analyzer available for language: ${document.languageId}`);
        }

        return await analyzer.analyze(document);
    }

    /**
     * Gets complexity severity level based on threshold
     */
    getSeverity(complexity: number, threshold: number): 'low' | 'medium' | 'high' {
        return getSeverity(complexity, threshold);
    }

    /**
     * Returns list of supported language IDs
     */
    getSupportedLanguages(): string[] {
        const languages: string[] = [];
        const testLanguages = [
            'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
            'python'
        ];

        for (const lang of testLanguages) {
            if (this.analyzers.some(a => a.canAnalyze(lang))) {
                languages.push(lang);
            }
        }

        return languages;
    }
}
