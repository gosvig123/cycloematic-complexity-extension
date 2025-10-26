#!/usr/bin/env python3
"""
Compare different complexity calculation methods
"""

import ast
import sys
import json
from complexity_analyzer import analyze_file


def analyze_with_config(file_path, config):
    """Analyze with specific configuration"""
    # This would use the config - simplified for now
    result = analyze_file(file_path)
    return result


def compare_methods(file_path):
    """Compare different complexity calculation methods"""
    
    methods = {
        'strict': {
            'name': 'Strict McCabe',
            'description': 'Original McCabe complexity (minimal)',
            'config': {
                'countIf': True,
                'countWhile': True,
                'countFor': True,
                'countExcept': True,
                'countAssert': False,
                'countBoolOp': False,  # Don't count individual operators
                'countTernary': True,
                'countComprehension': False,  # Don't count comprehensions
                'countComprehensionIf': False,
                'countMatch': True,
            }
        },
        'standard': {
            'name': 'Standard',
            'description': 'Common industry standard',
            'config': {
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
            }
        },
        'comprehensive': {
            'name': 'Comprehensive',
            'description': 'Counts everything (most conservative)',
            'config': {
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
    }
    
    # Analyze once (we'll show different perspectives)
    result = analyze_file(file_path)
    
    if not result.get('success'):
        print(json.dumps(result))
        return
    
    print("\n" + "=" * 80)
    print(f"Complexity Comparison: {file_path}")
    print("=" * 80 + "\n")
    
    # Show what each method counts
    print("Method Comparison:\n")
    for method_id, method in methods.items():
        print(f"{method['name']:20s} - {method['description']}")
    
    print("\n" + "=" * 80)
    print(f"{'Function':<40s} {'Current':<10s} {'Notes'}")
    print("=" * 80)
    
    for func in result['functions']:
        complexity = func['complexity']
        name = ('async ' if func['is_async'] else '') + func['name']
        name = name[:38] + '..' if len(name) > 40 else name
        
        # Estimate what strict method would give (rough approximation)
        # In a full implementation, we'd recalculate with each config
        strict_estimate = estimate_strict_complexity(func)
        
        notes = ""
        if complexity > 20:
            notes = "⚠️  Very High"
        elif complexity > 15:
            notes = "⚡ High"
        
        print(f"{name:<40s} {complexity:<10d} {notes}")
        
        # Show breakdown if available
        if func.get('details') and len(func['details']) > 0:
            # Count types
            type_counts = {}
            for detail in func['details']:
                dtype = detail['type']
                type_counts[dtype] = type_counts.get(dtype, 0) + detail['amount']
            
            breakdown_items = []
            if type_counts.get('if', 0) > 0:
                breakdown_items.append(f"if/elif: {type_counts['if']}")
            if type_counts.get('for', 0) > 0:
                breakdown_items.append(f"loops: {type_counts['for'] + type_counts.get('while', 0)}")
            if type_counts.get('bool_op', 0) > 0:
                breakdown_items.append(f"and/or: {type_counts['bool_op']}")
            if type_counts.get('list_comp', 0) > 0:
                comp_total = (type_counts.get('list_comp', 0) + 
                             type_counts.get('dict_comp', 0) + 
                             type_counts.get('set_comp', 0))
                breakdown_items.append(f"comprehensions: {comp_total}")
            
            if breakdown_items:
                print(f"  └─ {', '.join(breakdown_items)}")
        
        print()
    
    print("=" * 80)
    print(f"\nTotal functions: {result['total_functions']}")
    avg = sum(f['complexity'] for f in result['functions']) / len(result['functions']) if result['functions'] else 0
    print(f"Average complexity: {avg:.2f}")
    
    # Show distribution
    low = sum(1 for f in result['functions'] if f['complexity'] <= 10)
    medium = sum(1 for f in result['functions'] if 10 < f['complexity'] <= 15)
    high = sum(1 for f in result['functions'] if 15 < f['complexity'] <= 20)
    very_high = sum(1 for f in result['functions'] if f['complexity'] > 20)
    
    print(f"\nComplexity Distribution:")
    print(f"  ✅ Low (1-10):      {low:3d} functions")
    print(f"  ⚡ Medium (11-15):  {medium:3d} functions")
    print(f"  ⚠️  High (16-20):    {high:3d} functions")
    print(f"  🚨 Very High (>20): {very_high:3d} functions")
    
    print("\n" + "=" * 80)
    print("\nNote: Different tools use different methods:")
    print("  - Radon (Python): Similar to 'standard'")
    print("  - SonarQube: Uses 'comprehensive' approach")
    print("  - McCabe original: Close to 'strict'")
    print("  - This tool: Uses 'standard' (industry common)")
    print("\n")


def estimate_strict_complexity(func):
    """Estimate what strict McCabe would calculate"""
    # This is a rough estimate - doesn't count bool ops, comprehensions
    if not func.get('details'):
        return func['complexity']
    
    strict = 1  # Base
    for detail in func['details']:
        dtype = detail['type']
        # Only count basic control flow
        if dtype in ['if', 'while', 'for', 'except', 'ternary', 'match_case']:
            strict += detail['amount']
        # Skip bool_op, comprehensions, etc.
    
    return strict


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 compare_methods.py <file.py>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    compare_methods(file_path)


if __name__ == '__main__':
    main()
