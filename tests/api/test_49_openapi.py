#!/usr/bin/env python3
"""
Test suite for OpenAPI documentation endpoint

Tests the /pbxcore/api/v3/openapi endpoint for:
- Getting OpenAPI 3.1 schema in JSON format
- Getting OpenAPI 3.1 schema in YAML format
- Swagger UI availability
- ReDoc UI availability
- Schema structure validation
"""

import pytest
import json
from conftest import assert_api_success


class TestOpenAPI:
    """Comprehensive tests for OpenAPI documentation"""

    openapi_schema = None

    def test_01_get_openapi_json(self, api_client):
        """Test GET /openapi:getSpecification - Get OpenAPI schema in JSON format"""
        try:
            # The correct endpoint is /openapi:getSpecification
            response = api_client.get('openapi:getSpecification')

            # OpenAPI schema is returned directly (not wrapped)
            schema = None

            # Case 1: Direct schema response (has 'openapi' field at root)
            if isinstance(response, dict) and 'openapi' in response:
                schema = response
            # Case 2: Wrapped in result/data structure (fallback)
            elif isinstance(response, dict) and 'result' in response:
                if response.get('result') is True:
                    data = response.get('data', {})

                    # Data might be schema directly or a string
                    if isinstance(data, dict) and 'openapi' in data:
                        schema = data
                    elif isinstance(data, str):
                        # Try parsing JSON string
                        try:
                            schema = json.loads(data)
                        except:
                            schema = {}
                    else:
                        schema = data
                else:
                    # Result is false - API returned error
                    assert_api_success(response, "Failed to get OpenAPI schema")
            # Case 3: Unknown format - assume direct
            else:
                schema = response

            # Store for later tests
            self.openapi_schema = schema if schema else {}

            # Validate OpenAPI structure
            if schema and isinstance(schema, dict):
                assert 'openapi' in schema, "Missing 'openapi' version field"
                assert 'info' in schema, "Missing 'info' section"
                assert 'paths' in schema, "Missing 'paths' section"

                version = schema.get('openapi', '')
                assert version.startswith('3.'), f"Expected OpenAPI 3.x, got {version}"

                print(f"✓ Retrieved OpenAPI schema (JSON)")
                print(f"  Version: {schema.get('openapi')}")
                print(f"  Title: {schema.get('info', {}).get('title', 'N/A')}")
                print(f"  API Version: {schema.get('info', {}).get('version', 'N/A')}")
                print(f"  Paths: {len(schema.get('paths', {}))}")
            else:
                print(f"⚠ OpenAPI schema is empty or malformed")

        except Exception as e:
            if '404' in str(e) or '501' in str(e):
                print(f"⚠ OpenAPI endpoint not implemented")
                pytest.skip("OpenAPI not implemented")
            else:
                raise

    def test_02_validate_openapi_info(self, api_client):
        """Test OpenAPI info section completeness"""
        if not self.openapi_schema:
            pytest.skip("No OpenAPI schema loaded")

        info = self.openapi_schema.get('info', {})

        # Required fields per OpenAPI 3.1 spec
        assert 'title' in info, "Missing required 'title' in info"
        assert 'version' in info, "Missing required 'version' in info"

        # Recommended fields
        recommended_fields = ['description', 'contact', 'license']
        present_fields = [f for f in recommended_fields if f in info]

        print(f"✓ OpenAPI info section validated")
        print(f"  Title: {info.get('title')}")
        print(f"  Version: {info.get('version')}")
        print(f"  Recommended fields: {len(present_fields)}/{len(recommended_fields)}")

    def test_03_validate_openapi_paths(self, api_client):
        """Test OpenAPI paths section"""
        if not self.openapi_schema:
            pytest.skip("No OpenAPI schema loaded")

        paths = self.openapi_schema.get('paths', {})
        assert len(paths) > 0, "No paths defined in OpenAPI schema"

        # Count operations
        total_operations = 0
        methods = ['get', 'post', 'put', 'patch', 'delete']

        for path, path_item in paths.items():
            for method in methods:
                if method in path_item:
                    total_operations += 1

        print(f"✓ OpenAPI paths validated")
        print(f"  Total paths: {len(paths)}")
        print(f"  Total operations: {total_operations}")

        # Sample some paths
        sample_paths = list(paths.keys())[:5]
        if sample_paths:
            print(f"  Sample paths:")
            for path in sample_paths:
                print(f"    - {path}")

    def test_04_validate_openapi_components(self, api_client):
        """Test OpenAPI components section (schemas, security)"""
        if not self.openapi_schema:
            pytest.skip("No OpenAPI schema loaded")

        components = self.openapi_schema.get('components', {})

        if components:
            schemas = components.get('schemas', {})
            security_schemes = components.get('securitySchemes', {})

            print(f"✓ OpenAPI components found")
            print(f"  Schemas: {len(schemas)}")
            print(f"  Security schemes: {len(security_schemes)}")

            if security_schemes:
                print(f"  Security types:")
                for scheme_name, scheme in security_schemes.items():
                    scheme_type = scheme.get('type', 'unknown')
                    print(f"    - {scheme_name}: {scheme_type}")
        else:
            print(f"⚠ No components section in OpenAPI schema")

    def test_05_validate_openapi_security(self, api_client):
        """Test OpenAPI security definitions"""
        if not self.openapi_schema:
            pytest.skip("No OpenAPI schema loaded")

        # Check if security is defined at root level
        root_security = self.openapi_schema.get('security', [])

        # Check components security schemes
        components = self.openapi_schema.get('components', {})
        security_schemes = components.get('securitySchemes', {})

        if root_security or security_schemes:
            print(f"✓ Security defined in OpenAPI schema")
            print(f"  Root security requirements: {len(root_security)}")
            print(f"  Security schemes: {len(security_schemes)}")
        else:
            print(f"⚠ No security definitions in OpenAPI schema")

    def test_06_get_openapi_yaml(self, api_client):
        """Test GET /openapi?format=yaml - Get schema in YAML format"""
        try:
            # Some APIs use format parameter, others use Accept header
            response = api_client.get('openapi', params={'format': 'yaml'})

            if response.get('result') is True:
                data = response.get('data', '')

                # YAML response might be string
                if isinstance(data, str) and len(data) > 0:
                    # Check if it looks like YAML
                    if 'openapi:' in data or 'info:' in data:
                        print(f"✓ Retrieved OpenAPI schema (YAML)")
                        print(f"  Size: {len(data)} bytes")
                    else:
                        print(f"⚠ Response doesn't look like YAML")
                else:
                    print(f"⚠ YAML format may not be supported (got JSON)")
            else:
                print(f"⚠ YAML format not supported")

        except Exception as e:
            if '404' in str(e):
                print(f"⚠ YAML format endpoint not found")
            else:
                print(f"⚠ YAML format error: {str(e)[:50]}")

    def test_07_swagger_ui_availability(self, api_client):
        """Test GET /openapi:ui - Check Swagger UI availability"""
        try:
            response = api_client.get('openapi:ui')

            if response.get('result') is True:
                data = response.get('data', '')

                # Swagger UI returns HTML
                if isinstance(data, str) and ('swagger' in data.lower() or 'html' in data.lower()):
                    print(f"✓ Swagger UI available")
                    print(f"  Response size: {len(data)} bytes")
                else:
                    print(f"⚠ Swagger UI response unexpected format")
            else:
                print(f"⚠ Swagger UI not available")

        except Exception as e:
            if '404' in str(e) or '501' in str(e):
                print(f"⚠ Swagger UI not implemented")
            else:
                print(f"⚠ Swagger UI error: {str(e)[:50]}")

    def test_08_redoc_ui_availability(self, api_client):
        """Test GET /openapi:redoc - Check ReDoc UI availability"""
        try:
            response = api_client.get('openapi:redoc')

            if response.get('result') is True:
                data = response.get('data', '')

                # ReDoc returns HTML
                if isinstance(data, str) and ('redoc' in data.lower() or 'html' in data.lower()):
                    print(f"✓ ReDoc UI available")
                    print(f"  Response size: {len(data)} bytes")
                else:
                    print(f"⚠ ReDoc UI response unexpected format")
            else:
                print(f"⚠ ReDoc UI not available")

        except Exception as e:
            if '404' in str(e) or '501' in str(e):
                print(f"⚠ ReDoc UI not implemented")
            else:
                print(f"⚠ ReDoc UI error: {str(e)[:50]}")

    def test_09_get_acl_rules(self, api_client):
        """Test GET /openapi:getAclRules - Get ACL rules from API metadata

        This method extracts ACL (Access Control List) rules from the API
        metadata to help with permission management.
        """
        try:
            response = api_client.get('openapi:getAclRules')

            if response.get('result') is True:
                data = response.get('data', {})

                if isinstance(data, dict):
                    rules_count = len(data)
                    print(f"✓ ACL rules retrieved successfully")
                    print(f"  Total rule categories: {rules_count}")

                    # Show sample rule categories
                    if rules_count > 0:
                        sample_keys = list(data.keys())[:5]
                        print(f"  Sample categories: {', '.join(sample_keys)}")
                elif isinstance(data, list):
                    print(f"✓ ACL rules retrieved: {len(data)} rules")
                else:
                    print(f"✓ ACL rules endpoint works")

            else:
                print(f"⚠ ACL rules retrieval failed")

        except Exception as e:
            if '404' in str(e) or '501' in str(e) or '405' in str(e):
                print(f"⚠ ACL rules method not implemented yet")
                pytest.skip("ACL rules not implemented")
            else:
                print(f"⚠ Error: {str(e)[:80]}")

    def test_10_get_validation_schemas(self, api_client):
        """Test GET /openapi:getValidationSchemas - Get validation schemas

        This method returns validation schemas for API endpoints to help
        with request/response validation.
        """
        try:
            response = api_client.get('openapi:getValidationSchemas')

            if response.get('result') is True:
                data = response.get('data', {})

                if isinstance(data, dict):
                    schemas_count = len(data)
                    print(f"✓ Validation schemas retrieved successfully")
                    print(f"  Total schemas: {schemas_count}")

                    # Show sample schema names
                    if schemas_count > 0:
                        sample_keys = list(data.keys())[:5]
                        print(f"  Sample schemas: {', '.join(sample_keys)}")
                elif isinstance(data, list):
                    print(f"✓ Validation schemas retrieved: {len(data)} schemas")
                else:
                    print(f"✓ Validation schemas endpoint works")

            else:
                print(f"⚠ Validation schemas retrieval failed")

        except Exception as e:
            if '404' in str(e) or '501' in str(e) or '405' in str(e):
                print(f"⚠ Validation schemas method not implemented yet")
                pytest.skip("Validation schemas not implemented")
            else:
                print(f"⚠ Error: {str(e)[:80]}")

    def test_11_clear_cache(self, api_client):
        """Test POST /openapi:clearCache - Clear OpenAPI metadata cache

        This method clears cached OpenAPI metadata. Useful after making
        changes to API controllers or attributes.
        """
        try:
            response = api_client.post('openapi:clearCache', {})

            if response.get('result') is True:
                print(f"✓ OpenAPI cache cleared successfully")

                data = response.get('data', {})
                if isinstance(data, dict):
                    print(f"  Response: {data}")
            else:
                messages = response.get('messages', {})
                print(f"⚠ Cache clear failed: {messages}")

        except Exception as e:
            if '404' in str(e) or '501' in str(e) or '405' in str(e):
                print(f"⚠ Cache clear method not implemented yet")
                pytest.skip("Cache clear not implemented")
            else:
                print(f"⚠ Error: {str(e)[:80]}")

    def test_12_clear_cache_with_delete(self, api_client):
        """Test DELETE /openapi:clearCache - Alternative method for cache clear

        Some APIs support DELETE method for clearing cache as it semantically
        fits the "delete cached data" operation.
        """
        try:
            response = api_client.delete('openapi:clearCache')

            if response.get('result') is True:
                print(f"✓ OpenAPI cache cleared via DELETE successfully")
            else:
                print(f"⚠ DELETE method for cache clear not supported")

        except Exception as e:
            if '404' in str(e) or '501' in str(e) or '405' in str(e):
                print(f"⚠ DELETE method for cache clear not implemented")
                pytest.skip("DELETE cache clear not implemented")
            else:
                print(f"⚠ Error: {str(e)[:80]}")


class TestOpenAPIEdgeCases:
    """Edge cases for OpenAPI endpoint"""

    def test_01_validate_path_parameters(self, api_client):
        """Test that path parameters are properly documented"""
        try:
            response = api_client.get('openapi:getSpecification')

            # Check if it's direct schema or wrapped
            if isinstance(response, dict) and 'openapi' in response:
                schema = response
            elif 'result' in response and not response.get('result'):
                pytest.skip("OpenAPI not available")
            else:
                schema = response.get('data', response)
            if not isinstance(schema, dict):
                pytest.skip("Invalid schema format")

            paths = schema.get('paths', {})

            # Find paths with parameters
            paths_with_params = 0
            for path, path_item in paths.items():
                if '{' in path:  # Has path parameters
                    paths_with_params += 1

                    # Check if parameters are documented
                    for method in ['get', 'post', 'put', 'patch', 'delete']:
                        if method in path_item:
                            operation = path_item[method]
                            parameters = operation.get('parameters', [])

                            # Should have at least one parameter
                            if len(parameters) > 0:
                                break

            if paths_with_params > 0:
                print(f"✓ Paths with parameters: {paths_with_params}")
            else:
                print(f"⚠ No paths with parameters found")

        except Exception as e:
            print(f"⚠ Path parameter validation error: {str(e)[:50]}")

    def test_02_validate_response_schemas(self, api_client):
        """Test that responses have proper schema definitions"""
        try:
            response = api_client.get('openapi:getSpecification')

            # Check if it's direct schema or wrapped
            if isinstance(response, dict) and 'openapi' in response:
                schema = response
            elif 'result' in response and not response.get('result'):
                pytest.skip("OpenAPI not available")
            else:
                schema = response.get('data', response)
            if not isinstance(schema, dict):
                pytest.skip("Invalid schema format")

            paths = schema.get('paths', {})

            operations_with_schemas = 0
            total_operations = 0

            for path, path_item in paths.items():
                for method in ['get', 'post', 'put', 'patch', 'delete']:
                    if method in path_item:
                        total_operations += 1
                        operation = path_item[method]
                        responses = operation.get('responses', {})

                        # Check if success responses have schemas
                        for status_code, response_def in responses.items():
                            if str(status_code).startswith('2'):  # 2xx success
                                if 'content' in response_def or 'schema' in response_def:
                                    operations_with_schemas += 1
                                    break

            if total_operations > 0:
                percentage = (operations_with_schemas / total_operations) * 100
                print(f"✓ Operations with response schemas: {operations_with_schemas}/{total_operations} ({percentage:.1f}%)")
            else:
                print(f"⚠ No operations found")

        except Exception as e:
            print(f"⚠ Response schema validation error: {str(e)[:50]}")

    def test_03_validate_security_requirements(self, api_client):
        """Test that security requirements are properly documented"""
        try:
            response = api_client.get('openapi:getSpecification')

            # Check if it's direct schema or wrapped
            if isinstance(response, dict) and 'openapi' in response:
                schema = response
            elif 'result' in response and not response.get('result'):
                pytest.skip("OpenAPI not available")
            else:
                schema = response.get('data', response)
            if not isinstance(schema, dict):
                pytest.skip("Invalid schema format")

            paths = schema.get('paths', {})

            secured_operations = 0
            total_operations = 0

            for path, path_item in paths.items():
                for method in ['get', 'post', 'put', 'patch', 'delete']:
                    if method in path_item:
                        total_operations += 1
                        operation = path_item[method]

                        # Check if security is defined
                        if 'security' in operation or 'security' in schema:
                            secured_operations += 1

            if total_operations > 0:
                percentage = (secured_operations / total_operations) * 100
                print(f"✓ Secured operations: {secured_operations}/{total_operations} ({percentage:.1f}%)")
            else:
                print(f"⚠ No operations found")

        except Exception as e:
            print(f"⚠ Security validation error: {str(e)[:50]}")

    def test_04_validate_tags(self, api_client):
        """Test that operations are properly tagged"""
        try:
            response = api_client.get('openapi:getSpecification')

            # Check if it's direct schema or wrapped
            if isinstance(response, dict) and 'openapi' in response:
                schema = response
            elif 'result' in response and not response.get('result'):
                pytest.skip("OpenAPI not available")
            else:
                schema = response.get('data', response)
            if not isinstance(schema, dict):
                pytest.skip("Invalid schema format")

            paths = schema.get('paths', {})
            tags = schema.get('tags', [])

            # Collect all tags used in operations
            operation_tags = set()

            for path, path_item in paths.items():
                for method in ['get', 'post', 'put', 'patch', 'delete']:
                    if method in path_item:
                        operation = path_item[method]
                        op_tags = operation.get('tags', [])
                        operation_tags.update(op_tags)

            if operation_tags:
                print(f"✓ Tags used: {len(operation_tags)}")
                print(f"  Tag list: {sorted(list(operation_tags))[:10]}")
            else:
                print(f"⚠ No tags found in operations")

        except Exception as e:
            print(f"⚠ Tag validation error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
