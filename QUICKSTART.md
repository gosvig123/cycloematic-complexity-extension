# Quick Start Guide

## Extension Overview

**Cyclomatic Complexity Analyzer** - A VS Code extension template for analyzing code complexity.

## Setup & Run (3 steps)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Press F5 in VS Code**
   - Opens Extension Development Host
   - Your extension is loaded automatically

3. **Test it**
   - Create a test `.js` file in the new window
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Run: "Analyze Cyclomatic Complexity"
   - Check the Output panel for results

## What's Included

✅ **Working template** with:
- Command registration
- Configuration settings
- Editor decorations
- Output channel for results

❌ **Not yet implemented**:
- Actual complexity calculation (currently uses placeholders)
- AST parsing
- Multiple language support

## File Structure

```
vscode-cyclematic-complexity/
├── src/
│   ├── extension.ts      # Entry point, commands
│   ├── analyzer.ts       # Complexity logic (TODO)
│   └── decorator.ts      # Visual indicators
├── package.json          # Extension manifest
└── tsconfig.json         # TypeScript config
```

## Next Steps

See `DEVELOPMENT.md` for implementation details.

## Commands Available

- `Analyze Cyclomatic Complexity` - Analyze current file
- `Show Complexity Report` - Coming soon

## Settings

- `cyclematicComplexity.threshold`: Warning threshold (default: 10)
- `cyclematicComplexity.enableDecorations`: Show decorations (default: true)
