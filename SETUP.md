# Setup Guide

## Quick Start

### 1. Check Python Installation

```bash
python3 --version
```

Should output: `Python 3.6+`

If using pyenv:
```bash
pyenv shell 3.12.11  # Or your preferred version
python3 --version
```

### 2. Test Python Environment

```bash
python3 python-analyzer/test_env.py
```

Expected output:
```json
{
  "success": true,
  "python_version": "3.12.11 ...",
  "compatible": true,
  "has_ast": true
}
```

### 3. Test Analyzer

```bash
python3 python-analyzer/complexity_analyzer.py test-examples/debug_test.py
```

Should show JSON with function complexities.

### 4. Launch Extension

```bash
# In VS Code
code .
# Press F5 to launch Extension Development Host
```

## Python Version Requirements

- **Minimum**: Python 3.6
- **Recommended**: Python 3.8+
- **Fully Supported**: Python 3.10-3.12

### Using pyenv

```bash
# List available versions
pyenv versions

# Set version for current shell
pyenv shell 3.12.11

# Set version globally
pyenv global 3.12.11

# Set version for project directory
cd your-project
pyenv local 3.12.11
```

### Using System Python

```bash
# macOS (with Homebrew)
brew install python3

# Ubuntu/Debian
sudo apt install python3

# Verify
which python3
python3 --version
```

## Configuration

### Configure Python Path in VS Code

**Option 1: Use default (recommended)**
```json
{
  "cyclematicComplexity.python.pythonPath": "python3"
}
```

**Option 2: Use specific pyenv version**
```json
{
  "cyclematicComplexity.python.pythonPath": "/Users/yourname/.pyenv/versions/3.12.11/bin/python3"
}
```

**Option 3: Use Python from PATH**
```json
{
  "cyclematicComplexity.python.pythonPath": "/usr/local/bin/python3"
}
```

### Find Your Python Path

```bash
# Show Python executable path
which python3

# Show pyenv Python path
pyenv which python3

# Show Python version info
python3 -c "import sys; print(sys.executable)"
```

## Troubleshooting

### "Python 3 not found"

**Symptoms:**
- Extension shows "AST analyzer failed, falling back to regex"
- Console shows "python3: command not found"

**Solutions:**

1. **Install Python 3:**
   ```bash
   # macOS
   brew install python3
   
   # Ubuntu/Debian
   sudo apt install python3
   ```

2. **Add Python to PATH:**
   ```bash
   # Add to ~/.zshrc or ~/.bashrc
   export PATH="/usr/local/bin:$PATH"
   ```

3. **Configure full path in VS Code:**
   ```json
   {
     "cyclematicComplexity.python.pythonPath": "/usr/local/bin/python3"
   }
   ```

### "Module 'ast' not found"

**Symptoms:**
- Test environment shows `"has_ast": false`

**Solution:**
This shouldn't happen with Python 3.6+. Update Python:
```bash
python3 --version  # Check version
brew upgrade python3  # macOS
```

### "Syntax error at line X"

**Symptoms:**
- Extension shows syntax error for valid Python code

**Causes:**
1. Python file has actual syntax errors
2. Using Python 3.10+ syntax with Python 3.6-3.9

**Solutions:**
1. Fix syntax errors in the file
2. Update Python version:
   ```bash
   pyenv shell 3.12.11
   ```

### Extension Uses Regex Instead of AST

**Check Developer Console:**

1. Open Extension Development Host
2. `Cmd+Shift+P` → "Developer: Toggle Developer Tools"
3. Look for messages:
   ```
   [Python AST] Analyzing file: /path/to/file.py
   [Python AST] Python executable: python3
   ```

**If you see:**
```
[Python] AST analyzer failed, falling back to regex
```

**Fix:**
1. Test Python environment: `python3 python-analyzer/test_env.py`
2. Test analyzer: `python3 python-analyzer/complexity_analyzer.py test-examples/debug_test.py`
3. Configure Python path in VS Code settings

## Advanced Configuration

### Use Different Python for Different Projects

**Project A** (needs Python 3.8):
```json
// .vscode/settings.json in Project A
{
  "cyclematicComplexity.python.pythonPath": "/Users/you/.pyenv/versions/3.8.18/bin/python3"
}
```

**Project B** (needs Python 3.12):
```json
// .vscode/settings.json in Project B
{
  "cyclematicComplexity.python.pythonPath": "/Users/you/.pyenv/versions/3.12.11/bin/python3"
}
```

### Use Virtual Environment

```bash
# Create venv
python3 -m venv .venv
source .venv/bin/activate

# Get path
which python3

# Configure in VS Code
{
  "cyclematicComplexity.python.pythonPath": "/path/to/project/.venv/bin/python3"
}
```

### Use Conda Environment

```bash
# Activate conda env
conda activate myenv

# Get path
which python3

# Configure in VS Code
{
  "cyclematicComplexity.python.pythonPath": "/path/to/conda/envs/myenv/bin/python3"
}
```

## Verification Commands

### Quick Test Suite

```bash
# 1. Test Python
python3 --version

# 2. Test environment
python3 python-analyzer/test_env.py

# 3. Test analyzer
python3 python-analyzer/complexity_analyzer.py test-examples/debug_test.py

# 4. Test with details
python3 python-analyzer/complexity_analyzer.py test-examples/debug_test.py --details

# 5. Test comparison
python3 python-analyzer/compare_methods.py test-examples/debug_test.py
```

All commands should succeed without errors.

### Expected Outputs

**Test Environment:**
```json
{
  "success": true,
  "compatible": true,
  "has_ast": true
}
```

**Test Analyzer:**
```json
{
  "success": true,
  "functions": [
    {
      "name": "merge_individual_analysis_data",
      "complexity": 18
    }
  ]
}
```

## Platform-Specific Notes

### macOS

**With Homebrew:**
```bash
brew install python3
which python3
# /usr/local/bin/python3 or /opt/homebrew/bin/python3
```

**With pyenv:**
```bash
brew install pyenv
pyenv install 3.12.11
pyenv shell 3.12.11
```

### Linux

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3 python3-pip
```

**Fedora:**
```bash
sudo dnf install python3 python3-pip
```

### Windows

**With Python.org installer:**
- Download from python.org
- Add to PATH during installation
- Use `python` instead of `python3`

**Configure in VS Code:**
```json
{
  "cyclematicComplexity.python.pythonPath": "python"
}
```

## Performance Notes

### Python 3.6-3.7
- ✅ Compatible
- ⚠️ Slower AST parsing
- ❌ No match/case support

### Python 3.8-3.9
- ✅ Recommended minimum
- ✅ Good performance
- ❌ No match/case support

### Python 3.10+
- ✅ Best performance
- ✅ match/case support
- ✅ Better error messages

## Summary

✅ **Python 3.6+** required
✅ **Python 3.10-3.12** recommended
✅ **pyenv** supported
✅ **venv/conda** supported
✅ **Configurable** per project
✅ **Automatic fallback** if Python unavailable

For your setup with `pyenv shell 3.12.11`, everything should work perfectly!
