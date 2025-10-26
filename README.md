# Cyclomatic Complexity Analyzer

A Visual Studio Code extension for analyzing and visualizing cyclomatic complexity in your code across multiple languages.

## Features

- ✅ **Multi-Language Support**: JavaScript, TypeScript, React (JSX/TSX), and Python
- ✅ **Accurate AST-based Analysis**: Uses proper parsers for each language
- ✅ **Visual Decorations**: Color-coded complexity indicators in the editor
- ✅ **Configurable Thresholds**: Set your own complexity warning levels
- ✅ **Detailed Reports**: View sorted complexity metrics with indicators
- ✅ **McCabe Complexity**: Implements proper cyclomatic complexity calculation

## Supported Languages

| Language | Status | Parser |
|----------|--------|--------|
| JavaScript | ✅ Full Support | TypeScript Compiler API |
| TypeScript | ✅ Full Support | TypeScript Compiler API |
| React (JSX) | ✅ Full Support | TypeScript Compiler API |
| React (TSX) | ✅ Full Support | TypeScript Compiler API |
| Python | ✅ Full Support | Custom AST Parser |

## Commands

- `Analyze Cyclomatic Complexity` - Analyze the current file and show detailed report
- `Show Complexity Report` - Display a complexity report (coming soon)

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `cyclematicComplexity.threshold` | number | 10 | Complexity threshold for warnings |
| `cyclematicComplexity.enableDecorations` | boolean | true | Show complexity decorations in editor |

## Usage

1. Open a supported file (JavaScript, TypeScript, React, or Python)
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Run command: **"Analyze Cyclomatic Complexity"**
4. View results in the Output panel

### Output Example

```
Complexity Analysis for /path/to/file.js
============================================================

⚠️  complexFunction                 Line   65 - Complexity: 12
⚡  multipleConditions              Line   18 - Complexity: 8
✓  withLoops                        Line   25 - Complexity: 3
✓  withCondition                    Line   10 - Complexity: 2
✓  simple                           Line    4 - Complexity: 1

============================================================
Total functions: 5
Average complexity: 5.20
⚠️  High complexity functions: 1
```

## What is Cyclomatic Complexity?

Cyclomatic Complexity is a software metric used to measure the complexity of a program. It was developed by Thomas J. McCabe in 1976.

**Formula**: `Complexity = Decision Points + 1`

**Decision points include**:
- Conditional statements (`if`, `else if`)
- Loops (`for`, `while`, `do-while`)
- Case statements (`case` in `switch`)
- Logical operators (`&&`, `||`, `??`)
- Ternary operators (`? :`)
- Exception handlers (`catch`)

**Complexity Guidelines**:
- **1-10**: Simple, low risk
- **11-15**: Moderate complexity, medium risk
- **16+**: High complexity, high risk - consider refactoring

## Examples

### JavaScript Example

```javascript
// Complexity: 8
function processUser(user, options) {
    if (!user) {                          // +1
        return null;
    }
    
    if (user.age < 18 || !user.verified) { // +2
        return { error: 'Invalid user' };
    }
    
    try {
        if (options.premium && user.credits > 0) { // +2
            return upgradeToPremium(user);
        } else if (options.trial) {        // +1
            return startTrial(user);
        }
    } catch (error) {                      // +1
        console.error(error);
    }
    
    return user;
}
```

### Python Example

```python
# Complexity: 7
def calculate_discount(price, customer):
    if price <= 0:                         # +1
        return 0
    
    discount = 0
    
    if customer.is_premium and customer.points > 100:  # +2
        discount = 0.20
    elif customer.is_member or customer.referrals > 5: # +2
        discount = 0.10
    
    if price > 1000:                       # +1
        discount += 0.05
    
    return price * (1 - discount)
```

## Development

### Project Structure

```
cycloematic-complexity-extension/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── analyzer.ts            # Main analyzer coordinator
│   ├── decorator.ts           # Visual decorations
│   └── analyzers/
│       ├── base.ts            # Common interfaces
│       ├── javascript.ts      # JS/TS/React analyzer
│       └── python.ts          # Python analyzer
├── test-examples/             # Test files for each language
├── out/                       # Compiled output
└── package.json               # Extension manifest
```

### Building

```bash
npm install
npm run compile
```

### Running in Development

1. Open this folder in VS Code
2. Press `F5` to launch Extension Development Host
3. Test with files in `test-examples/`

### Watching for Changes

```bash
npm run watch
```

## Contributing

To add support for a new language:

1. Create a new analyzer in `src/analyzers/your-language.ts`
2. Implement the `LanguageAnalyzer` interface
3. Register it in `src/analyzer.ts`
4. Add activation event in `package.json`

## Future Enhancements

- [ ] Code lens with inline complexity metrics
- [ ] HTML/JSON report export
- [ ] Workspace-wide analysis
- [ ] Integration with VS Code Problems panel
- [ ] Support for more languages (Go, Rust, Java, C#, etc.)
- [ ] Complexity trends over time
- [ ] Custom complexity calculation rules

## License

ISC
