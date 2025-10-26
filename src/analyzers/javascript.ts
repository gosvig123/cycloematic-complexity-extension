import * as vscode from 'vscode';
import * as ts from 'typescript';
import { ComplexityResult, LanguageAnalyzer } from './base';

export class JavaScriptAnalyzer implements LanguageAnalyzer {
    canAnalyze(languageId: string): boolean {
        return ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(languageId);
    }

    async analyze(document: vscode.TextDocument): Promise<ComplexityResult[]> {
        const text = document.getText();
        const results: ComplexityResult[] = [];

        // Determine script kind based on file extension
        const scriptKind = this.getScriptKind(document.fileName, document.languageId);
        
        try {
            // Parse the source file into an AST
            const sourceFile = ts.createSourceFile(
                document.fileName,
                text,
                ts.ScriptTarget.Latest,
                true,
                scriptKind
            );

            // Visit all nodes and find function-like declarations
            const visit = (node: ts.Node) => {
                if (this.isFunctionLike(node)) {
                    const complexity = this.calculateComplexity(node);
                    const name = this.getFunctionName(node);
                    const start = node.getStart(sourceFile);
                    const position = document.positionAt(start);

                    results.push({
                        name: name,
                        line: position.line + 1,
                        complexity: complexity,
                        startOffset: start,
                        endOffset: node.getEnd()
                    });
                }

                ts.forEachChild(node, visit);
            };

            visit(sourceFile);
        } catch (error) {
            console.error('Error parsing JavaScript/TypeScript:', error);
            throw new Error(`Failed to parse ${document.languageId} file: ${error}`);
        }

        return results;
    }

    private getScriptKind(fileName: string, languageId: string): ts.ScriptKind {
        if (languageId === 'typescriptreact' || fileName.endsWith('.tsx')) {
            return ts.ScriptKind.TSX;
        } else if (languageId === 'typescript' || fileName.endsWith('.ts')) {
            return ts.ScriptKind.TS;
        } else if (languageId === 'javascriptreact' || fileName.endsWith('.jsx')) {
            return ts.ScriptKind.JSX;
        } else {
            return ts.ScriptKind.JS;
        }
    }

    private isFunctionLike(node: ts.Node): boolean {
        return (
            ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node) ||
            ts.isMethodDeclaration(node) ||
            ts.isGetAccessorDeclaration(node) ||
            ts.isSetAccessorDeclaration(node) ||
            ts.isConstructorDeclaration(node)
        );
    }

    private getFunctionName(node: ts.Node): string {
        if (ts.isFunctionDeclaration(node) && node.name) {
            return node.name.text;
        } else if (ts.isMethodDeclaration(node) && node.name) {
            return ts.isIdentifier(node.name) ? node.name.text : '<computed>';
        } else if (ts.isConstructorDeclaration(node)) {
            return 'constructor';
        } else if (ts.isGetAccessorDeclaration(node) && node.name) {
            return `get ${ts.isIdentifier(node.name) ? node.name.text : '<computed>'}`;
        } else if (ts.isSetAccessorDeclaration(node) && node.name) {
            return `set ${ts.isIdentifier(node.name) ? node.name.text : '<computed>'}`;
        } else if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
            return node.parent.name.text;
        } else if (ts.isPropertyAssignment(node.parent) && ts.isIdentifier(node.parent.name)) {
            return node.parent.name.text;
        } else {
            return '<anonymous>';
        }
    }

    private calculateComplexity(node: ts.Node): number {
        let complexity = 1; // Base complexity

        const countDecisionPoints = (n: ts.Node) => {
            switch (n.kind) {
                // Conditional statements
                case ts.SyntaxKind.IfStatement:
                    complexity++;
                    break;

                // Loops
                case ts.SyntaxKind.WhileStatement:
                case ts.SyntaxKind.DoStatement:
                case ts.SyntaxKind.ForStatement:
                case ts.SyntaxKind.ForInStatement:
                case ts.SyntaxKind.ForOfStatement:
                    complexity++;
                    break;

                // Switch cases
                case ts.SyntaxKind.CaseClause:
                    complexity++;
                    break;

                // Exception handling
                case ts.SyntaxKind.CatchClause:
                    complexity++;
                    break;

                // Logical operators
                case ts.SyntaxKind.BinaryExpression:
                    const binaryExpr = n as ts.BinaryExpression;
                    if (
                        binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                        binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
                        binaryExpr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
                    ) {
                        complexity++;
                    }
                    break;

                // Ternary operator
                case ts.SyntaxKind.ConditionalExpression:
                    complexity++;
                    break;
            }

            ts.forEachChild(n, countDecisionPoints);
        };

        // Count decision points within the function body
        if (ts.isFunctionDeclaration(node) || 
            ts.isFunctionExpression(node) || 
            ts.isMethodDeclaration(node) ||
            ts.isConstructorDeclaration(node) ||
            ts.isGetAccessorDeclaration(node) ||
            ts.isSetAccessorDeclaration(node)) {
            if (node.body) {
                countDecisionPoints(node.body);
            }
        } else if (ts.isArrowFunction(node)) {
            countDecisionPoints(node.body);
        }

        return complexity;
    }
}
