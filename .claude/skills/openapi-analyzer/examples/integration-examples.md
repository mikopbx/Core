# Integration Examples

How to integrate OpenAPI analyzer with other MikoPBX skills.

## Integration 1: mikopbx-endpoint-validator

Enhance endpoint validation with OpenAPI compliance checking.

### Complete Validation Workflow

```bash
#!/bin/bash
# Enhanced endpoint validation with OpenAPI

set -e

RESOURCE="Extensions"
PATH="/pbxcore/api/v3/extensions"
METHOD="POST"
CONTAINER_ID=$(docker ps -q -f name=mikopbx)

echo "=== OpenAPI-Enhanced Endpoint Validation ==="
echo "Resource: $RESOURCE"
echo "Endpoint: $METHOD $PATH"
echo ""

# Step 1: Fetch OpenAPI spec
echo "📥 Fetching OpenAPI specification..."
docker exec $CONTAINER_ID curl -s http://mikopbx-php83.localhost:8081/pbxcore/api/v3/openapi:getSpecification > /tmp/openapi.json
echo "✅ Spec downloaded ($(du -h /tmp/openapi.json | cut -f1))"
echo ""

# Step 2: Get OpenAPI endpoint definition
echo "🔍 Extracting endpoint from OpenAPI..."
python3 scripts/openapi_analyzer.py get "$PATH" "$METHOD" > /tmp/openapi_endpoint.json
echo "✅ Endpoint extracted"
echo ""

# Step 3: Validate OpenAPI compliance
echo "📋 Validating OpenAPI compliance..."
validation=$(python3 scripts/openapi_analyzer.py validate "$PATH" "$METHOD")
valid=$(echo "$validation" | jq -r '.valid')
score=$(echo "$validation" | jq -r '.score')

if [ "$valid" == "true" ]; then
    echo "✅ OpenAPI compliant (score: $score/100)"
else
    echo "❌ OpenAPI violations found (score: $score/100)"
    echo "$validation" | jq -r '.issues[]' | sed 's/^/  - /'
fi
echo ""

# Step 4: Extract code parameters from DataStructure
echo "🔍 Extracting parameters from DataStructure.php..."
php << 'EOPHP'
<?php
require_once 'Globals.php';

$className = "MikoPBX\\PBXCoreREST\\Lib\\Extensions\\DataStructure";
$defs = $className::getParameterDefinitions();
echo json_encode(array_keys($defs['request']));
EOPHP
> /tmp/code_params.json
echo "✅ Code parameters extracted"
echo ""

# Step 5: Compare OpenAPI with code
echo "📊 Comparing OpenAPI spec with code..."
comparison=$(python3 << 'EOF'
import json
import sys
sys.path.insert(0, 'scripts')
from openapi_analyzer import MikoPBXOpenAPIAnalyzer

analyzer = MikoPBXOpenAPIAnalyzer('/tmp/openapi.json')
endpoint = analyzer.get_endpoint('/pbxcore/api/v3/extensions', 'POST')

with open('/tmp/code_params.json') as f:
    code_params = json.load(f)

result = analyzer.compare_with_code(endpoint, code_params)
print(json.dumps(result, indent=2))
EOF
)

compliance=$(echo "$comparison" | jq -r '.compliance')
compliance_pct=$(echo "$compliance * 100" | bc -l | xargs printf "%.1f")

echo "Compliance: $compliance_pct%"
echo ""

in_both=$(echo "$comparison" | jq -r '.in_both[]' 2>/dev/null | wc -l | tr -d ' ')
in_spec_only=$(echo "$comparison" | jq -r '.in_spec_only[]' 2>/dev/null | wc -l | tr -d ' ')
in_code_only=$(echo "$comparison" | jq -r '.in_code_only[]' 2>/dev/null | wc -l | tr -d ' ')

echo "✅ In both ($in_both parameters):"
echo "$comparison" | jq -r '.in_both[]' | sed 's/^/  - /'
echo ""

if [ "$in_spec_only" -gt 0 ]; then
    echo "⚠️  In OpenAPI only ($in_spec_only parameters) - Add to DataStructure:"
    echo "$comparison" | jq -r '.in_spec_only[]' | sed 's/^/  - /'
    echo ""
fi

if [ "$in_code_only" -gt 0 ]; then
    echo "⚠️  In code only ($in_code_only parameters) - Add to OpenAPI:"
    echo "$comparison" | jq -r '.in_code_only[]' | sed 's/^/  - /'
    echo ""
fi

# Step 6: Generate compliance report
echo "=== Compliance Report ==="
echo "OpenAPI Score: $score/100"
echo "Parameter Sync: $compliance_pct%"

if [ "$valid" == "true" ] && (( $(echo "$compliance > 0.95" | bc -l) )); then
    echo "Status: ✅ PASS - Endpoint is compliant"
    exit 0
else
    echo "Status: ❌ FAIL - Endpoint needs fixes"
    exit 1
fi
```

### Output Example

```
=== OpenAPI-Enhanced Endpoint Validation ===
Resource: Extensions
Endpoint: POST /pbxcore/api/v3/extensions

📥 Fetching OpenAPI specification...
✅ Spec downloaded (9.1M)

🔍 Extracting endpoint from OpenAPI...
✅ Endpoint extracted

📋 Validating OpenAPI compliance...
✅ OpenAPI compliant (score: 100/100)

🔍 Extracting parameters from DataStructure.php...
✅ Code parameters extracted

📊 Comparing OpenAPI spec with code...
Compliance: 92.3%

✅ In both (12 parameters):
  - number
  - type
  - callerid
  - userid
  - show_in_phonebook

⚠️  In OpenAPI only (2 parameters) - Add to DataStructure:
  - mobile_number
  - email

⚠️  In code only (1 parameters) - Add to OpenAPI:
  - internal_extension_id

=== Compliance Report ===
OpenAPI Score: 100/100
Parameter Sync: 92.3%
Status: ❌ FAIL - Endpoint needs fixes
```

---

## Integration 2: mikopbx-api-test-generator

Generate pytest tests from OpenAPI specification.

### Test Generation Workflow

```python
#!/usr/bin/env python3
"""
Generate pytest tests from OpenAPI specification
Integrated with mikopbx-api-test-generator
"""

import sys
sys.path.insert(0, 'scripts')
from openapi_analyzer import MikoPBXOpenAPIAnalyzer

def generate_test_from_openapi(path: str, method: str, resource: str):
    """Generate comprehensive test from OpenAPI endpoint"""

    analyzer = MikoPBXOpenAPIAnalyzer('/tmp/mikopbx_openapi.json')
    endpoint = analyzer.get_endpoint(path, method)

    if not endpoint:
        print(f"Endpoint {method} {path} not found")
        return

    # Generate test data from OpenAPI examples
    test_data = analyzer.generate_test_data(endpoint)

    # Extract validation info
    required = endpoint['requestBody'].get('required', []) if endpoint['requestBody'] else []
    properties = endpoint['requestBody'].get('properties', {}) if endpoint['requestBody'] else {}

    # Generate test code
    test_code = f'''
def test_create_{resource.lower()}_from_openapi(headers):
    """
    Test {method} {path}
    Auto-generated from OpenAPI specification

    Operation: {endpoint['operationId']}
    Summary: {endpoint['summary']}
    """

    # Test data from OpenAPI examples
    valid_payload = {repr(test_data)}

    # Test successful creation
    response = requests.{method.lower()}(
        f"{{BASE_URL}}{path}",
        json=valid_payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == {list(endpoint['responses'].keys())[0]}
    data = response.json()
    assert "data" in data

    # Validate response structure
    result = data["data"]
'''

    # Add field validation
    for field in required:
        if field in test_data:
            test_code += f'''    assert result["{field}"] == valid_payload["{field}"]\n'''

    # Generate negative tests for required fields
    for field in required:
        field_schema = properties.get(field, {})
        field_type = field_schema.get('type', 'unknown')

        test_code += f'''

def test_create_{resource.lower()}_missing_{field}(headers):
    """
    Test {method} {path} with missing required field: {field}
    Type: {field_type}
    """

    payload = {repr({k: v for k, v in test_data.items() if k != field})}

    response = requests.{method.lower()}(
        f"{{BASE_URL}}{path}",
        json=payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    # Should mention missing field
    assert "{field}" in str(data).lower()
'''

    # Generate enum validation tests
    for field, schema in properties.items():
        if 'enum' in schema and field in required:
            test_code += f'''

def test_create_{resource.lower()}_invalid_{field}_enum(headers):
    """
    Test {method} {path} with invalid enum value for {field}
    Valid values: {schema['enum']}
    """

    payload = {repr(test_data.copy())}
    payload["{field}"] = "INVALID_VALUE"

    response = requests.{method.lower()}(
        f"{{BASE_URL}}{path}",
        json=payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 400
    data = response.json()
    assert "error" in data
'''

    return test_code


# Generate test
if __name__ == '__main__':
    test_code = generate_test_from_openapi(
        '/pbxcore/api/v3/extensions',
        'POST',
        'Extension'
    )

    # Write to test file
    with open('tests/api/test_extensions_openapi.py', 'w') as f:
        f.write('import requests\n')
        f.write('import pytest\n\n')
        f.write('BASE_URL = "https://mikopbx-php83.localhost:8445"\n\n')
        f.write(test_code)

    print("✅ Test generated: tests/api/test_extensions_openapi.py")
```

### Generated Test Example

```python
import requests
import pytest

BASE_URL = "https://mikopbx-php83.localhost:8445"

def test_create_extension_from_openapi(headers):
    """
    Test POST /pbxcore/api/v3/extensions
    Auto-generated from OpenAPI specification

    Operation: createExtension
    Summary: Создать новый добавочный
    """

    # Test data from OpenAPI examples
    valid_payload = {
        'number': '201',
        'type': 'SIP',
        'callerid': 'Test User',
        'userid': '1'
    }

    # Test successful creation
    response = requests.post(
        f"{BASE_URL}/pbxcore/api/v3/extensions",
        json=valid_payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 201
    data = response.json()
    assert "data" in data

    # Validate response structure
    result = data["data"]
    assert result["number"] == valid_payload["number"]
    assert result["type"] == valid_payload["type"]


def test_create_extension_missing_number(headers):
    """
    Test POST /pbxcore/api/v3/extensions with missing required field: number
    Type: string
    """

    payload = {'type': 'SIP', 'callerid': 'Test User', 'userid': '1'}

    response = requests.post(
        f"{BASE_URL}/pbxcore/api/v3/extensions",
        json=payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "number" in str(data).lower()


def test_create_extension_invalid_type_enum(headers):
    """
    Test POST /pbxcore/api/v3/extensions with invalid enum value for type
    Valid values: ['SIP', 'IAX', 'QUEUE', 'IVR', 'CONFERENCE', 'EXTERNAL']
    """

    payload = {
        'number': '201',
        'type': 'INVALID_VALUE',
        'callerid': 'Test User',
        'userid': '1'
    }

    response = requests.post(
        f"{BASE_URL}/pbxcore/api/v3/extensions",
        json=payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 400
    data = response.json()
    assert "error" in data
```

---

## Integration 3: Documentation Generation

Generate API documentation from OpenAPI spec.

### Markdown Documentation Generator

```python
#!/usr/bin/env python3
"""Generate Markdown documentation from OpenAPI spec"""

import sys
sys.path.insert(0, 'scripts')
from openapi_analyzer import MikoPBXOpenAPIAnalyzer

def generate_endpoint_docs(path: str, method: str) -> str:
    """Generate markdown documentation for endpoint"""

    analyzer = MikoPBXOpenAPIAnalyzer()
    endpoint = analyzer.get_endpoint(path, method)

    if not endpoint:
        return ""

    # Header
    docs = f"## {method} {path}\n\n"
    docs += f"**Operation**: `{endpoint['operationId']}`\n\n"
    docs += f"{endpoint['summary']}\n\n"

    if endpoint['description']:
        docs += f"{endpoint['description']}\n\n"

    # Path parameters
    path_params = [p for p in endpoint['parameters'] if p['in'] == 'path']
    if path_params:
        docs += "### Path Parameters\n\n"
        docs += "| Name | Type | Required | Description |\n"
        docs += "|------|------|----------|-------------|\n"
        for p in path_params:
            req = "✓" if p['required'] else " "
            ptype = p['schema'].get('type', 'unknown')
            desc = p.get('description', '')
            docs += f"| `{p['name']}` | {ptype} | {req} | {desc} |\n"
        docs += "\n"

    # Query parameters
    query_params = [p for p in endpoint['parameters'] if p['in'] == 'query']
    if query_params:
        docs += "### Query Parameters\n\n"
        docs += "| Name | Type | Required | Description |\n"
        docs += "|------|------|----------|-------------|\n"
        for p in query_params:
            req = "✓" if p['required'] else " "
            ptype = p['schema'].get('type', 'unknown')
            desc = p.get('description', '')
            docs += f"| `{p['name']}` | {ptype} | {req} | {desc} |\n"
        docs += "\n"

    # Request body
    if endpoint['requestBody']:
        docs += "### Request Body\n\n"
        docs += "```json\n"
        docs += "{\n"
        props = endpoint['requestBody'].get('properties', {})
        required = endpoint['requestBody'].get('required', [])
        for name, schema in props.items():
            req_marker = " // required" if name in required else ""
            example = schema.get('example', '...')
            if isinstance(example, str):
                example = f'"{example}"'
            docs += f'  "{name}": {example}{req_marker}\n'
        docs += "}\n"
        docs += "```\n\n"

        # Required fields table
        if required:
            docs += "**Required fields**:\n"
            for field in required:
                schema = props.get(field, {})
                ftype = schema.get('type', 'unknown')
                desc = schema.get('description', '')
                docs += f"- `{field}` ({ftype}): {desc}\n"
            docs += "\n"

    # Responses
    docs += "### Responses\n\n"
    for status, response in endpoint['responses'].items():
        docs += f"#### {status} {response['description']}\n\n"

    # Example
    if endpoint['requestBody']:
        test_data = analyzer.generate_test_data(endpoint)
        docs += "### Example\n\n"
        docs += "```bash\n"
        docs += f"curl -X {method} \\\n"
        docs += f"  https://api.example.com{path} \\\n"
        docs += "  -H 'Content-Type: application/json' \\\n"
        docs += "  -H 'Authorization: Bearer $TOKEN' \\\n"
        docs += "  -d '" + str(test_data).replace("'", '"') + "'\n"
        docs += "```\n\n"

    docs += "---\n\n"
    return docs


# Generate documentation for all endpoints
analyzer = MikoPBXOpenAPIAnalyzer()

with open('docs/API_REFERENCE.md', 'w') as f:
    f.write("# MikoPBX REST API Reference\n\n")
    f.write("Auto-generated from OpenAPI specification\n\n")

    # Group by tags
    tags = {}
    for path in analyzer.list_paths():
        for method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']:
            endpoint = analyzer.get_endpoint(path, method)
            if endpoint:
                tag = endpoint['tags'][0] if endpoint['tags'] else 'Other'
                if tag not in tags:
                    tags[tag] = []
                tags[tag].append((path, method, endpoint))

    # Write by tag
    for tag, endpoints in sorted(tags.items()):
        f.write(f"# {tag}\n\n")
        for path, method, endpoint in endpoints:
            docs = generate_endpoint_docs(path, method)
            f.write(docs)

print("✅ Documentation generated: docs/API_REFERENCE.md")
```

---

## Integration 4: Compliance Dashboard

Create a compliance dashboard showing endpoint quality.

```python
#!/usr/bin/env python3
"""Generate OpenAPI compliance dashboard"""

import sys
sys.path.insert(0, 'scripts')
from openapi_analyzer import MikoPBXOpenAPIAnalyzer

analyzer = MikoPBXOpenAPIAnalyzer()

# Collect stats
total = 0
valid = 0
total_score = 0
issues_by_type = {}

for path in analyzer.list_paths():
    for method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']:
        result = analyzer.validate_endpoint_compliance(path, method)
        if 'error' not in result:
            total += 1
            total_score += result['score']
            if result['valid']:
                valid += 1

            # Track issue types
            for issue in result['issues']:
                issues_by_type[issue] = issues_by_type.get(issue, 0) + 1

# Generate dashboard
print("# OpenAPI Compliance Dashboard\n")
print(f"**Total Endpoints**: {total}")
print(f"**Valid**: {valid} ({valid * 100 // total}%)")
print(f"**Average Score**: {total_score // total}/100\n")

print("## Common Issues\n")
for issue, count in sorted(issues_by_type.items(), key=lambda x: -x[1])[:10]:
    print(f"- {issue}: {count} occurrences")

print("\n## Recommendations\n")
if 'Missing summary' in issues_by_type:
    print("- Add summary to all endpoints")
if 'Missing operationId' in issues_by_type:
    print("- Add operationId to all endpoints")
```

---

## Cache Strategy for Integration

When integrating with multiple skills, cache the OpenAPI spec:

```bash
#!/bin/bash
# Shared OpenAPI spec cache

SPEC_FILE="/tmp/mikopbx_openapi.json"
CACHE_TTL=3600  # 1 hour

# Function to get fresh spec
fetch_openapi_spec() {
    echo "Fetching fresh OpenAPI spec..." >&2
    CONTAINER_ID=$(docker ps -q -f name=mikopbx)
    docker exec $CONTAINER_ID curl -s http://mikopbx-php83.localhost:8081/pbxcore/api/v3/openapi:getSpecification > "$SPEC_FILE"
}

# Check cache
if [ ! -f "$SPEC_FILE" ]; then
    fetch_openapi_spec
else
    SPEC_AGE=$(($(date +%s) - $(stat -f %m "$SPEC_FILE" 2>/dev/null || echo 0)))
    if [ $SPEC_AGE -gt $CACHE_TTL ]; then
        echo "Cache expired (age: ${SPEC_AGE}s), fetching fresh spec..." >&2
        fetch_openapi_spec
    else
        echo "Using cached spec (age: ${SPEC_AGE}s)" >&2
    fi
fi

# Now all scripts can use /tmp/mikopbx_openapi.json
```
