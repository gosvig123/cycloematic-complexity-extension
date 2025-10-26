# Test Examples

This directory contains test files to verify the cyclomatic complexity analyzer.

## Files

### `sample.js`
JavaScript test file with various function types and complexity levels.

### `sample.py`
Python test file with various function types and complexity levels.

### `complex_example.py`
Real-world complex Python function that should score ~20 in complexity.

### `complexity_verification.py`
Python functions with known complexity scores for verification:
- `simple()` - Expected: 1
- `one_if(x)` - Expected: 2
- `if_with_and(x, y)` - Expected: 3
- `if_with_multiple_and(x, y, z)` - Expected: 4
- `multiple_elif(x)` - Expected: 4
- `loop_with_condition(items)` - Expected: 3
- `nested_loops(matrix)` - Expected: 4
- `merge_individual_analysis_data(...)` - Expected: 19-20

## How to Test

1. **Open VS Code**: Press F5 to launch Extension Development Host
2. **Open any test file** from this directory
3. **Run command**: Ctrl+Shift+P → "Analyze Cyclomatic Complexity"
4. **Verify results** in Output panel

## Expected Results

### Simple Functions
Functions with low complexity (1-5) should show ✓ green indicator

### Medium Functions  
Functions with medium complexity (6-15) should show ⚡ yellow indicator

### Complex Functions
Functions with high complexity (16+) should show ⚠️ red indicator

## Complexity Breakdown

### Your Real Function: `merge_individual_analysis_data`

```python
async def merge_individual_analysis_data(...):
    # Decision points:
    # 1. if not current.data: +1
    # 2. or operator: +1
    # 3. for new_compound: +1
    # 4. for existing_compound: +1
    # 5. if smiles match: +1
    # 6-9. if/elif chain (4 branches): +4
    # 10-13. if/elif chain (4 branches): +4
    # 14-17. and operators (4 times): +4
    # 18. if all_complete: +1
    # Total: 1 + 18 = 19
```

This matches the expected high complexity for a function that:
- Has nested loops
- Multiple conditional branches
- Complex boolean expressions
- Several elif chains

## Refactoring Suggestions

Functions with complexity > 15 should be considered for refactoring:

1. **Extract methods** - Break into smaller functions
2. **Use strategy pattern** - Replace if/elif chains with dictionaries
3. **Early returns** - Reduce nesting depth
4. **Simplify conditions** - Extract complex boolean expressions

### Example Refactoring

**Before (Complexity: 19):**
```python
async def merge_individual_analysis_data(...):
    # Huge function with many nested conditions
```

**After (Complexity: Lower):**
```python
async def merge_individual_analysis_data(...):
    await validate_and_fetch_data(...)
    await update_compound_data(...)
    await update_completion_status(...)
    await finalize_analysis(...)
```

Each extracted function would have lower complexity, making the code:
- Easier to test
- Easier to understand
- Easier to maintain
- Less prone to bugs
