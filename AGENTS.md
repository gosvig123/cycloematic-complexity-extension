# Agent Guidelines for Cyclomatic Complexity VSCode Extension

## Build/Run Commands
- `npm run compile` - Compile TypeScript to out/
- `npm run watch` - Watch mode for development
- `npm run lint` - Run ESLint on src/ files
- `F5` in VSCode - Launch Extension Development Host
- Test files are in `test-examples/` directory

## Code Style
- **TypeScript**: Strict mode enabled, target ES2020, CommonJS modules
- **Imports**: Group by external libs, vscode, local modules; use named imports
- **Naming**: camelCase for functions/variables, PascalCase for classes/interfaces
- **Formatting**: Semi-colons required (@typescript-eslint/semi), curly braces for control flow
- **Types**: Explicit return types for public methods, interfaces in analyzers/base.ts
- **Error Handling**: Use try-catch for async operations, throw descriptive Error objects
- **Architecture**: Analyzers implement LanguageAnalyzer interface from analyzers/base.ts
- **Python Integration**: Python scripts in python-analyzer/ called via child_process.exec
- **Config**: Read user settings via vscode.workspace.getConfiguration('cyclematicComplexity')
- **Output**: Use vscode.window.createOutputChannel() for user-facing logs, console.log for debug
