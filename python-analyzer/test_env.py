#!/usr/bin/env python3
"""Test Python environment for complexity analyzer"""

import sys
import json

def test_environment():
    """Check Python environment compatibility"""
    result = {
        'success': True,
        'python_version': sys.version,
        'version_info': {
            'major': sys.version_info.major,
            'minor': sys.version_info.minor,
            'micro': sys.version_info.micro
        },
        'executable': sys.executable,
        'compatible': sys.version_info >= (3, 6)
    }
    
    # Check for required modules
    try:
        import ast
        result['has_ast'] = True
    except ImportError:
        result['has_ast'] = False
        result['compatible'] = False
    
    return result

if __name__ == '__main__':
    result = test_environment()
    print(json.dumps(result, indent=2))
    
    if not result['compatible']:
        sys.exit(1)
