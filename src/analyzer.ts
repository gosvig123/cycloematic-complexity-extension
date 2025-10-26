import * as vscode from 'vscode';
import { ComplexityResult, LanguageAnalyzer, getSeverity } from './analyzers/base';
import { JavaScriptAnalyzer } from './analyzers/javascript';
import { PythonAnalyzer } from './analyzers/python';

export { ComplexityResult };

interface CachedAnalysis {
    version: number;
    results: ComplexityResult[];
}

export class ComplexityAnalyzer {
    private analyzers: LanguageAnalyzer[];
    private cache: Map<string, CachedAnalysis>;

    constructor() {
        // Register all language analyzers
        this.analyzers = [
            new JavaScriptAnalyzer(),
            new PythonAnalyzer()
        ];
        this.cache = new Map();
    }

    /**
     * Analyzes a document and returns complexity metrics for functions
     */
    async analyzeDocument(document: vscode.TextDocument, cursorPosition?: vscode.Position): Promise<ComplexityResult[]> {
        const uri = document.uri.toString();
        const currentVersion = document.version;
        const cached = this.cache.get(uri);

        // Find the appropriate analyzer for this language
        const analyzer = this.analyzers.find(a => a.canAnalyze(document.languageId));

        if (!analyzer) {
            throw new Error(`No analyzer available for language: ${document.languageId}`);
        }

        // If no cache exists or cache is for a different document, do full analysis
        if (!cached) {
            const results = await analyzer.analyze(document);
            this.cache.set(uri, { version: currentVersion, results });
            return results;
        }

        // If cursor position is provided, try incremental update
        if (cursorPosition && cached.version !== currentVersion) {
            const updatedResults = await this.incrementalAnalyze(document, cached.results, cursorPosition, analyzer);
            if (updatedResults) {
                this.cache.set(uri, { version: currentVersion, results: updatedResults });
                return updatedResults;
            }
        }

        // If no cursor or incremental failed, check if full re-analysis is needed
        if (cached.version !== currentVersion) {
            const results = await analyzer.analyze(document);
            this.cache.set(uri, { version: currentVersion, results });
            return results;
        }

        // Return cached results
        return cached.results;
    }

    /**
     * Performs incremental analysis - only re-analyzes the function being edited
     */
    private async incrementalAnalyze(
        document: vscode.TextDocument,
        cachedResults: ComplexityResult[],
        cursorPosition: vscode.Position,
        analyzer: LanguageAnalyzer
    ): Promise<ComplexityResult[] | null> {
        const cursorOffset = document.offsetAt(cursorPosition);

        // Find which function the cursor is in
        const targetFunction = cachedResults.find(
            result => cursorOffset >= result.startOffset && cursorOffset <= result.endOffset
        );

        if (!targetFunction) {
            // Cursor not in any known function - might be a new function, do full analysis
            return null;
        }

        // Re-analyze just the target function
        const fullResults = await analyzer.analyze(document);
        
        // Find the updated version of the target function by matching position/name
        const updatedFunction = fullResults.find(
            result => 
                result.name === targetFunction.name &&
                Math.abs(result.startOffset - targetFunction.startOffset) < 100 // Allow some drift
        );

        if (!updatedFunction) {
            // Function structure changed significantly, return full analysis
            return fullResults;
        }

        // Merge: replace old function with updated one, keep others from cache
        const mergedResults = cachedResults.map(cached => 
            cached.name === targetFunction.name && cached.startOffset === targetFunction.startOffset
                ? updatedFunction
                : cached
        );

        // Check if any new functions were added or removed
        if (fullResults.length !== cachedResults.length) {
            // Function count changed, use full results
            return fullResults;
        }

        return mergedResults;
    }

    /**
     * Clears cache for a specific document
     */
    clearCache(document: vscode.TextDocument): void {
        this.cache.delete(document.uri.toString());
    }

    /**
     * Clears all cached results
     */
    clearAllCache(): void {
        this.cache.clear();
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
