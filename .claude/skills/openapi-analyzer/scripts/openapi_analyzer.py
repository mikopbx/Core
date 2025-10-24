#!/usr/bin/env python3
"""
OpenAPI Specification Analyzer for MikoPBX
Extracts endpoint details from OpenAPI 3.1.0 specification
"""

import json
import sys
from typing import Dict, List, Optional

class MikoPBXOpenAPIAnalyzer:
    """Analyze MikoPBX OpenAPI specification"""

    def __init__(self, spec_path: str = '/tmp/mikopbx_openapi.json'):
        """Load OpenAPI specification"""
        with open(spec_path, 'r', encoding='utf-8') as f:
            self.spec = json.load(f)

        self.paths = self.spec.get('paths', {})
        self.schemas = self.spec.get('components', {}).get('schemas', {})

    def get_info(self) -> Dict:
        """Get API information"""
        return {
            'title': self.spec['info']['title'],
            'version': self.spec['info']['version'],
            'openapi_version': self.spec['openapi'],
            'total_paths': len(self.paths),
            'total_schemas': len(self.schemas)
        }

    def list_paths(self, pattern: Optional[str] = None) -> List[str]:
        """List all API paths, optionally filtered by pattern"""
        paths = list(self.paths.keys())
        if pattern:
            paths = [p for p in paths if pattern in p]
        return sorted(paths)

    def get_endpoint(self, path: str, method: str = 'GET') -> Optional[Dict]:
        """Extract endpoint details"""
        if path not in self.paths:
            return None

        endpoint = self.paths[path].get(method.lower())
        if not endpoint:
            return None

        result = {
            'path': path,
            'method': method.upper(),
            'summary': endpoint.get('summary', ''),
            'description': endpoint.get('description', ''),
            'operationId': endpoint.get('operationId', ''),
            'tags': endpoint.get('tags', []),
            'parameters': [],
            'requestBody': None,
            'responses': {}
        }

        # Path parameters (from path definition)
        path_params = self.paths[path].get('parameters', [])
        for param in path_params:
            result['parameters'].append(self._extract_parameter(param))

        # Operation parameters
        for param in endpoint.get('parameters', []):
            result['parameters'].append(self._extract_parameter(param))

        # Request body
        if 'requestBody' in endpoint:
            result['requestBody'] = self._extract_request_body(endpoint['requestBody'])

        # Responses
        for status, response in endpoint.get('responses', {}).items():
            result['responses'][status] = self._extract_response(response)

        return result

    def _extract_parameter(self, param: Dict) -> Dict:
        """Extract parameter details"""
        return {
            'name': param.get('name'),
            'in': param.get('in'),  # path, query, header
            'required': param.get('required', False),
            'description': param.get('description', ''),
            'schema': param.get('schema', {}),
            'example': param.get('schema', {}).get('example')
        }

    def _extract_request_body(self, body: Dict) -> Optional[Dict]:
        """Extract request body schema"""
        content = body.get('content', {})
        if 'application/json' not in content:
            return None

        schema = content['application/json'].get('schema', {})
        return self._resolve_schema(schema)

    def _extract_response(self, response: Dict) -> Dict:
        """Extract response details"""
        result = {
            'description': response.get('description', ''),
            'schema': None
        }

        content = response.get('content', {})
        if 'application/json' in content:
            schema = content['application/json'].get('schema', {})
            result['schema'] = self._resolve_schema(schema)

        return result

    def _resolve_schema(self, schema: Dict) -> Dict:
        """Resolve schema, following $ref if present"""
        if '$ref' in schema:
            ref_path = schema['$ref']  # e.g., "#/components/schemas/Extension"
            ref_name = ref_path.split('/')[-1]
            if ref_name in self.schemas:
                return self.schemas[ref_name]
        return schema

    def get_schema(self, name: str) -> Optional[Dict]:
        """Get component schema by name"""
        return self.schemas.get(name)

    def compare_with_code(self, endpoint_info: Dict, code_params: List[str]) -> Dict:
        """Compare OpenAPI spec with actual code parameters"""
        spec_params = set()

        # From request body
        if endpoint_info['requestBody']:
            props = endpoint_info['requestBody'].get('properties', {})
            spec_params.update(props.keys())

        # From parameters
        for param in endpoint_info['parameters']:
            spec_params.add(param['name'])

        code_params_set = set(code_params)

        return {
            'in_spec_only': spec_params - code_params_set,
            'in_code_only': code_params_set - spec_params,
            'in_both': spec_params & code_params_set,
            'compliance': len(spec_params & code_params_set) / len(spec_params | code_params_set) if spec_params | code_params_set else 1.0
        }

    def generate_test_data(self, endpoint_info: Dict) -> Dict:
        """Generate test data from schema examples"""
        test_data = {}

        if endpoint_info['requestBody']:
            props = endpoint_info['requestBody'].get('properties', {})
            required = endpoint_info['requestBody'].get('required', [])

            for name, schema in props.items():
                if 'example' in schema:
                    test_data[name] = schema['example']
                elif name in required:
                    # Generate default based on type
                    test_data[name] = self._generate_default(schema)

        return test_data

    def _generate_default(self, schema: Dict):
        """Generate default value based on schema type"""
        type_defaults = {
            'string': 'test_value',
            'integer': 1,
            'number': 1.0,
            'boolean': True,
            'array': [],
            'object': {}
        }

        schema_type = schema.get('type', 'string')

        # Check enum
        if 'enum' in schema:
            return schema['enum'][0]

        return type_defaults.get(schema_type, None)

    def validate_endpoint_compliance(self, path: str, method: str) -> Dict:
        """Validate endpoint compliance with OpenAPI standard"""
        endpoint = self.get_endpoint(path, method)
        if not endpoint:
            return {'valid': False, 'error': 'Endpoint not found in OpenAPI spec'}

        issues = []
        warnings = []

        # Check required fields
        if not endpoint['summary']:
            issues.append('Missing summary')
        if not endpoint['description']:
            warnings.append('Missing description')
        if not endpoint['operationId']:
            issues.append('Missing operationId')

        # Check request body for POST/PUT/PATCH
        if method in ['POST', 'PUT', 'PATCH']:
            if not endpoint['requestBody']:
                issues.append(f'{method} endpoint missing requestBody schema')
            else:
                if 'required' not in endpoint['requestBody']:
                    warnings.append('requestBody missing required field list')

        # Check responses
        if not endpoint['responses']:
            issues.append('No responses defined')
        else:
            expected_codes = {
                'GET': ['200', '404'],
                'POST': ['201', '400'],
                'PUT': ['200', '400', '404'],
                'PATCH': ['200', '400', '404'],
                'DELETE': ['200', '204', '404']
            }

            for code in expected_codes.get(method, []):
                if code not in endpoint['responses']:
                    warnings.append(f'Missing {code} response')

        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings,
            'score': 100 - (len(issues) * 20 + len(warnings) * 5)
        }


def main():
    """CLI interface"""
    if len(sys.argv) < 2:
        print("Usage: python3 openapi_analyzer.py <command> [args]")
        print("Commands:")
        print("  info                           - Show API info")
        print("  list [pattern]                 - List all paths")
        print("  get <path> <method>            - Get endpoint details")
        print("  schema <name>                  - Get schema details")
        print("  validate <path> <method>       - Validate endpoint")
        return

    analyzer = MikoPBXOpenAPIAnalyzer()
    command = sys.argv[1]

    if command == 'info':
        info = analyzer.get_info()
        print(json.dumps(info, indent=2))

    elif command == 'list':
        pattern = sys.argv[2] if len(sys.argv) > 2 else None
        paths = analyzer.list_paths(pattern)
        for path in paths:
            print(path)

    elif command == 'get':
        if len(sys.argv) < 4:
            print("Usage: get <path> <method>")
            return
        path, method = sys.argv[2], sys.argv[3]
        endpoint = analyzer.get_endpoint(path, method)
        if endpoint:
            print(json.dumps(endpoint, indent=2, ensure_ascii=False))
        else:
            print(f"Endpoint {method} {path} not found")

    elif command == 'schema':
        if len(sys.argv) < 3:
            print("Usage: schema <name>")
            return
        name = sys.argv[2]
        schema = analyzer.get_schema(name)
        if schema:
            print(json.dumps(schema, indent=2, ensure_ascii=False))
        else:
            print(f"Schema {name} not found")

    elif command == 'validate':
        if len(sys.argv) < 4:
            print("Usage: validate <path> <method>")
            return
        path, method = sys.argv[2], sys.argv[3]
        result = analyzer.validate_endpoint_compliance(path, method)
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
