import * as vscode from 'vscode';

export interface ComplexityResult {
    name: string;
    line: number;
    complexity: number;
    startOffset: number;
    endOffset: number;
}

export interface LanguageAnalyzer {
    canAnalyze(languageId: string): boolean;
    analyze(document: vscode.TextDocument): Promise<ComplexityResult[]>;
}

export function getSeverity(complexity: number, threshold: number): 'low' | 'medium' | 'high' {
    if (complexity <= threshold) {
        return 'low';
    } else if (complexity <= threshold * 1.5) {
        return 'medium';
    } else {
        return 'high';
    }
}
