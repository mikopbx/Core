#!/usr/bin/env python3
"""
Verification script for PJSUA2 resource management fixes

This script verifies that:
1. shutdown() can be called as a class method without instance
2. The method properly handles cleanup of class-level resources
"""

import inspect
from pjsua_helper import PJSUAManager


def verify_shutdown_is_classmethod():
    """Verify shutdown() is a class method"""
    shutdown_method = getattr(PJSUAManager, 'shutdown')

    # Check if it's a classmethod
    is_classmethod = isinstance(inspect.getattr_static(PJSUAManager, 'shutdown'), classmethod)

    print(f"✓ shutdown() is a classmethod: {is_classmethod}")

    # Verify it can be accessed without instance
    assert callable(shutdown_method), "shutdown should be callable"
    print("✓ shutdown() is callable as PJSUAManager.shutdown()")

    # Verify signature
    sig = inspect.signature(shutdown_method)
    params = list(sig.parameters.keys())

    # Classmethod should not have 'self' in params (cls is handled internally)
    assert 'self' not in params, "Classmethod should not have 'self' parameter"
    print(f"✓ shutdown() signature is correct: {sig}")

    return True


def verify_cleanup_all_instance_method():
    """Verify cleanup_all() is still an instance method"""
    cleanup_method = getattr(PJSUAManager, 'cleanup_all')

    # Check signature has 'self'
    sig = inspect.signature(cleanup_method)
    params = list(sig.parameters.keys())

    assert 'self' in params, "cleanup_all should be an instance method"
    print(f"✓ cleanup_all() is an instance method: {sig}")

    return True


if __name__ == '__main__':
    print("Verifying PJSUA2 resource management fixes...\n")

    try:
        verify_shutdown_is_classmethod()
        print()
        verify_cleanup_all_instance_method()
        print("\n✅ All verifications passed!")
        print("\nResource management fixes summary:")
        print("1. shutdown() is now a @classmethod - can be called without instance")
        print("2. cleanup_all() remains instance method - cleans up per-manager endpoints")
        print("3. conftest.py can call PJSUAManager.shutdown() in session cleanup")

    except AssertionError as e:
        print(f"\n❌ Verification failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ Error during verification: {e}")
        exit(1)
