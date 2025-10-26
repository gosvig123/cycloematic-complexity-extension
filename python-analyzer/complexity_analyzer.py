#!/usr/bin/env python3
"""
Python Cyclomatic Complexity Analyzer using AST (v2 - Simplified & Dynamic)
This script is called by the VS Code extension to analyze Python files
"""

import ast
import sys
import json
import os
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass, asdict


# Configuration presets
PRESETS = {
    'strict_mccabe': {
        'name': 'Strict McCabe',
        'description': 'Original McCabe complexity (minimal)',
        'countIf': True,
        'countWhile': True,
        'countFor': True,
        'countExcept': True,
        'countAssert': False,
        'countBoolOp': False,  # Strict doesn't count individual operators
        'countTernary': True,
        'countComprehension': False,
        'countComprehensionIf': False,
        'countMatch': True,
        'countWith': False,
    },
    'standard': {
        'name': 'Standard (Industry Common)',
        'description': 'Common industry standard (Radon, ESLint)',
        'countIf': True,
        'countWhile': True,
        'countFor': True,
        'countExcept': True,
        'countAssert': False,
        'countBoolOp': True,
        'countTernary': True,
        'countComprehension': True,
        'countComprehensionIf': True,
        'countMatch': True,
        'countWith': False,
    },
    'comprehensive': {
        'name': 'Comprehensive',
        'description': 'Most conservative (SonarQube-like)',
        'countIf': True,
        'countWhile': True,
        'countFor': True,
        'countExcept': True,
        'countAssert': True,
        'countBoolOp': True,
        'countTernary': True,
        'countComprehension': True,
        'countComprehensionIf': True,
        'countMatch': True,
        'countWith': True,
    }
}


@dataclass
class ComplexityDetail:
    """Detail about a single decision point"""
    type: str
    line: int
    amount: int
    description: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ComplexityVisitor(ast.NodeVisitor):
    """AST visitor that finds and analyzes functions"""
    
    def __init__(self, config: Optional[Dict] = None):
        self.functions = []
        self.current_function = None
        self.config = config or PRESETS['standard']
        
    def visit_FunctionDef(self, node):
        """Visit regular function definition"""
        self._visit_function(node, is_async=False)
        
    def visit_AsyncFunctionDef(self, node):
        """Visit async function definition"""
        self._visit_function(node, is_async=True)
    
    def _visit_function(self, node, is_async: bool):
        """Unified function handler - eliminates duplication!"""
        # Save parent context
        parent_function = self.current_function
        
        # Create function info
        function_info = {
            'name': node.name,
            'line': node.lineno,
            'col': node.col_offset,
            'end_line': node.end_lineno,
            'end_col': node.end_col_offset,
            'is_async': is_async,
            'complexity': 1,  # Will be set by counter
            'details': []
        }
        
        self.current_function = function_info
        
        # Calculate complexity
        counter = ComplexityCounter(self.config, collect_details=True)
        counter.visit(node)
        function_info['complexity'] = counter.complexity
        function_info['details'] = [d.to_dict() for d in counter.details]
        
        # Add to results
        self.functions.append(function_info)
        
        # Restore parent context (for nested functions)
        self.current_function = parent_function


class ComplexityCounter(ast.NodeVisitor):
    """Counts complexity using a registry-based approach"""
    
    # Handler registry: node_type -> (type_name, description, config_key)
    SIMPLE_HANDLERS = {
        ast.If: ('if', 'if statement', 'countIf'),
        ast.While: ('while', 'while loop', 'countWhile'),
        ast.For: ('for', 'for loop', 'countFor'),
        ast.ExceptHandler: ('except', 'exception handler', 'countExcept'),
        ast.Assert: ('assert', 'assert statement', 'countAssert'),
        ast.With: ('with', 'with statement', 'countWith'),
        ast.IfExp: ('ternary', 'ternary expression', 'countTernary'),
    }
    
    def __init__(self, config: Dict, collect_details: bool = True):
        self.complexity = 1  # Base complexity
        self.config = config
        self.collect_details = collect_details
        self.details: List[ComplexityDetail] = []
        
    def _add_complexity(self, amount: int, node_type: str, line: int, description: str = ""):
        """Add complexity and optionally track details"""
        self.complexity += amount
        if self.collect_details:
            self.details.append(ComplexityDetail(node_type, line, amount, description))
    
    def visit(self, node):
        """Override visit to handle simple nodes dynamically"""
        # Check if this is a simple handler
        for node_class, (type_name, desc, config_key) in self.SIMPLE_HANDLERS.items():
            if isinstance(node, node_class):
                if self.config.get(config_key, True):
                    line = getattr(node, 'lineno', 0)
                    self._add_complexity(1, type_name, line, desc)
                break
        
        # Continue traversal
        self.generic_visit(node)
    
    def visit_BoolOp(self, node):
        """Boolean operators (and, or)"""
        if self.config.get('countBoolOp', True):
            if isinstance(node.op, (ast.And, ast.Or)):
                op_name = 'and' if isinstance(node.op, ast.And) else 'or'
                amount = len(node.values) - 1
                self._add_complexity(
                    amount,
                    'bool_op',
                    node.lineno,
                    f'{amount} {op_name} operator(s)'
                )
        self.generic_visit(node)
    
    def visit_ListComp(self, node):
        """List comprehension"""
        self._handle_comprehension(node, 'list_comp', 'list comprehension')
        self.generic_visit(node)
    
    def visit_SetComp(self, node):
        """Set comprehension"""
        self._handle_comprehension(node, 'set_comp', 'set comprehension')
        self.generic_visit(node)
    
    def visit_DictComp(self, node):
        """Dict comprehension"""
        self._handle_comprehension(node, 'dict_comp', 'dict comprehension')
        self.generic_visit(node)
    
    def visit_GeneratorExp(self, node):
        """Generator expression"""
        self._handle_comprehension(node, 'gen_exp', 'generator expression')
        self.generic_visit(node)
    
    def _handle_comprehension(self, node, comp_type: str, description: str):
        """Unified comprehension handler - eliminates duplication!"""
        if not self.config.get('countComprehension', True):
            return
            
        for comp in node.generators:
            self._add_complexity(1, comp_type, node.lineno, description)
            
            # Count if clauses in comprehension
            if self.config.get('countComprehensionIf', True):
                for if_clause in comp.ifs:
                    self._add_complexity(1, 'comp_if', node.lineno, 'comprehension if')
    
    def visit_Match(self, node):
        """Match statement (Python 3.10+)"""
        if self.config.get('countMatch', True):
            for case in node.cases:
                # Don't count default case (_)
                if not isinstance(case.pattern, ast.MatchAs) or case.pattern.name is not None:
                    self._add_complexity(1, 'match_case', node.lineno, 'match case')
        self.generic_visit(node)


def load_config(file_path: str, preset: Optional[str] = None) -> Dict:
    """Load configuration from multiple sources with priority"""
    # 1. Start with preset or default
    if preset and preset in PRESETS:
        config = PRESETS[preset].copy()
    else:
        config = PRESETS['standard'].copy()
    
    # 2. Look for project config file
    project_config = find_project_config(file_path)
    if project_config:
        config.update(project_config)
    
    # 3. Environment variables can override
    if os.getenv('COMPLEXITY_PRESET'):
        preset_name = os.getenv('COMPLEXITY_PRESET')
        if preset_name in PRESETS:
            config.update(PRESETS[preset_name])
    
    return config


def find_project_config(file_path: str) -> Optional[Dict]:
    """Find and load .complexity.json in project directory"""
    current_dir = os.path.dirname(os.path.abspath(file_path))
    
    # Walk up directory tree looking for config
    while current_dir != '/':
        config_path = os.path.join(current_dir, '.complexity.json')
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Warning: Failed to load {config_path}: {e}", file=sys.stderr)
                return None
        
        parent = os.path.dirname(current_dir)
        if parent == current_dir:  # Reached root
            break
        current_dir = parent
    
    return None


def analyze_file(file_path: str, config: Optional[Dict] = None) -> Dict[str, Any]:
    """Analyze a Python file and return complexity metrics"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source = f.read()
        
        # Parse the source code into an AST
        tree = ast.parse(source, filename=file_path)
        
        # Load config if not provided
        if config is None:
            config = load_config(file_path)
        
        # Visit the AST and collect function complexities
        visitor = ComplexityVisitor(config)
        visitor.visit(tree)
        
        return {
            'success': True,
            'functions': visitor.functions,
            'total_functions': len(visitor.functions),
            'config_used': config.get('name', 'custom')
        }
        
    except SyntaxError as e:
        return {
            'success': False,
            'error': f'Syntax error: {e.msg} at line {e.lineno}',
            'error_type': 'syntax',
            'line': e.lineno,
            'functions': []
        }
    except FileNotFoundError:
        return {
            'success': False,
            'error': f'File not found: {file_path}',
            'error_type': 'file_not_found',
            'functions': []
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'error_type': 'unknown',
            'functions': []
        }


def format_detailed_output(result: Dict, file_path: str):
    """Format human-readable detailed output"""
    print("\n" + "=" * 70)
    print(f"Complexity Analysis: {file_path}")
    if 'config_used' in result:
        print(f"Method: {result['config_used']}")
    print("=" * 70 + "\n")
    
    if not result.get('success'):
        print(f"❌ Error: {result.get('error')}")
        return
    
    for func in result['functions']:
        async_marker = "async " if func['is_async'] else ""
        print(f"{async_marker}{func['name']} (Line {func['line']}) - Complexity: {func['complexity']}")
        
        if func.get('details'):
            print(f"  Base complexity: 1")
            for detail in func['details']:
                print(f"  Line {detail['line']:4d}: +{detail['amount']} ({detail['description']})")
            print()
    
    print("=" * 70)
    print(f"Total functions: {result['total_functions']}")
    
    if result['functions']:
        avg = sum(f['complexity'] for f in result['functions']) / len(result['functions'])
        print(f"Average complexity: {avg:.2f}")
        
        high_complexity = sum(1 for f in result['functions'] if f['complexity'] > 15)
        if high_complexity > 0:
            print(f"⚠️  High complexity functions (>15): {high_complexity}")


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'No file path provided',
            'usage': 'python complexity_analyzer.py <file.py> [--details] [--preset=<name>]'
        }))
        sys.exit(1)
    
    file_path = sys.argv[1]
    show_details = '--details' in sys.argv or '-d' in sys.argv
    
    # Check for preset argument
    preset = None
    for arg in sys.argv:
        if arg.startswith('--preset='):
            preset = arg.split('=')[1]
    
    # Load config
    config = load_config(file_path, preset)
    
    # Analyze
    result = analyze_file(file_path, config)
    
    # Output
    if show_details and result.get('success'):
        format_detailed_output(result, file_path)
    else:
        print(json.dumps(result))


if __name__ == '__main__':
    main()
