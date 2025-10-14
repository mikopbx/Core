# MikoPBX REST API Tests

Comprehensive test suite for MikoPBX REST API v3 using pytest and Schemathesis.

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/nb/PhpstormProjects/mikopbx/Core/tests/api
pip3 install -r requirements.txt
```

### 2. Configure Environment

```bash
export MIKOPBX_API_URL="http://127.0.0.1:8081/pbxcore/api/v3"
export MIKOPBX_LOGIN="admin"
export MIKOPBX_PASSWORD="123456789MikoPBX#1"
```

### 3. Run Tests

```bash
# Run all tests
pytest -v

# Run specific test suite
pytest -v setup/

# Run with coverage
pytest --cov=. --cov-report=html

# Run in parallel
pytest -n auto
```

## Project Structure

```
tests/api/
├── conftest.py              # Pytest configuration and fixtures
├── requirements.txt         # Python dependencies
├── README.md               # This file
│
├── fixtures/               # Test data (JSON)
│   ├── index.json         # Fixture index
│   ├── employee.json      # Extension/Employee test data
│   ├── call_queue.json    # Call Queue test data
│   └── ...                # Other fixtures
│
├── setup/                 # Setup tests (populate MikoPBX)
│   ├── 01_test_setup_pbx_settings.py
│   ├── 02_test_setup_extensions.py
│   ├── 03_test_setup_providers.py
│   └── ...
│
├── crud/                  # CRUD tests per resource
│   ├── test_extensions_crud.py
│   ├── test_call_queues_crud.py
│   └── ...
│
├── schemathesis/         # Property-based tests
│   └── test_api_contracts.py
│
└── tools/                # Utilities
    └── generate_fixtures.py  # PHP -> JSON converter
```

## Test Organization

### Setup Tests (Phase 1)

Sequential tests that populate MikoPBX with test data via REST API.
Replaces Selenium-based data population.

**Order (pytest-order):**
1. PBX Settings (time, general)
2. Extensions/Employees
3. Providers (SIP, IAX)
4. Audio Files
5. Incoming Routes
6. Outgoing Routes
7. Call Queues
8. IVR Menus
9. Conference Rooms
10. Dialplan Applications
11. Out of Work Periods
12. Firewall Rules
13. AMI Users
14. Modules

**Run:**
```bash
pytest -v setup/ --order-dependencies
```

### CRUD Tests (Phase 2)

Comprehensive CRUD tests for each resource covering:
- ✅ Create (POST /resource)
- ✅ Read List (GET /resource)
- ✅ Read Single (GET /resource/{id})
- ✅ Update Full (PUT /resource/{id})
- ✅ Update Partial (PATCH /resource/{id})
- ✅ Delete (DELETE /resource/{id})
- ✅ Custom Methods (e.g., /resource:copy)

**Run:**
```bash
pytest -v crud/
```

### Schemathesis Tests (Phase 3)

Property-based testing using OpenAPI schema:
- Validates all endpoints against OpenAPI spec
- Tests edge cases (boundary values, invalid data)
- Fuzzing with generated test data
- Contract testing

**Run:**
```bash
pytest -v schemathesis/
```

## Fixtures

Test data is loaded from JSON files in `fixtures/` directory.

### Available Fixtures

| Fixture Name | Records | Description |
|-------------|---------|-------------|
| `employee` | 26 | Extensions and employees |
| `s_i_p_provider` | 3 | SIP providers |
| `i_a_x_provider` | 4 | IAX providers |
| `call_queue` | 4 | Call queues |
| `i_v_r_menu` | 2 | IVR menus |
| `incoming_call_rules` | 3 | Incoming routes |
| `outgoing_call_rules` | 4 | Outgoing routes |
| `firewall_rules` | 3 | Firewall rules |
| `ami_user` | 2 | AMI users |
| `conference_rooms` | 9 | Conference rooms |
| `dialplan_applications` | 10 | Dialplan apps |
| `audio_files` | 5 | Custom audio files |
| `m_o_h_audio_files` | 3 | MOH audio files |
| `out_of_work_periods` | 5 | Out of work periods |
| `module` | 8 | PBX modules |
| `p_b_x_settings` | 1 | PBX settings |

### Using Fixtures

```python
def test_create_extension(api_client, employee_fixtures):
    # Get specific employee from fixtures
    employee = employee_fixtures['smith.james']

    # Create extension via API
    response = api_client.post('extensions', employee)

    # Verify success
    assert response['result'] is True
    assert 'id' in response['data']
```

### Regenerating Fixtures

If PHP Data Factories are updated:

```bash
cd tools/
python3 generate_fixtures.py \
  --data-dir ../../AdminCabinet/Tests/Data \
  --output-dir ../fixtures
```

## API Client

The `MikoPBXClient` class provides:

### Features
- ✅ JWT authentication with access token (15 min)
- ✅ Refresh token cookie handling (30 days)
- ✅ Automatic token refresh
- ✅ Retry logic for transient failures
- ✅ Session management
- ✅ Clean logout

### Usage

```python
def test_example(api_client):
    # GET request
    response = api_client.get('extensions', params={'limit': 10})

    # POST request
    response = api_client.post('extensions', data={
        'number': '201',
        'username': 'test',
        'secret': 'password'
    })

    # PUT request (full update)
    response = api_client.put('extensions/EXT-ABC123', data={...})

    # PATCH request (partial update)
    response = api_client.patch('extensions/EXT-ABC123', data={
        'username': 'new_name'
    })

    # DELETE request
    response = api_client.delete('extensions/EXT-ABC123')

    # Custom method
    response = api_client.post('extensions/EXT-ABC123:copy', data={
        'newNumber': '202'
    })
```

## Helper Functions

### assert_api_success

```python
from conftest import assert_api_success

def test_something(api_client):
    response = api_client.post('extensions', data)
    assert_api_success(response, "Failed to create extension")
```

### assert_record_exists

```python
from conftest import assert_record_exists

def test_record_created(api_client):
    record = assert_record_exists(api_client, 'extensions', 'EXT-ABC123')
    assert record['number'] == '201'
```

### assert_record_deleted

```python
from conftest import assert_record_deleted

def test_record_deleted(api_client):
    api_client.delete('extensions/EXT-ABC123')
    assert_record_deleted(api_client, 'extensions', 'EXT-ABC123')
```

## Writing New Tests

### Test Template

```python
#!/usr/bin/env python3
"""
Test suite for [Resource] CRUD operations
"""

import pytest
from conftest import assert_api_success, assert_record_exists


class TestResourceCRUD:
    """CRUD tests for [Resource]"""

    def test_01_create_resource(self, api_client, resource_fixtures):
        """Test POST /resource - Create new resource"""
        test_data = resource_fixtures['test.key']

        response = api_client.post('resource', test_data)
        assert_api_success(response, "Failed to create resource")

        # Store ID for other tests
        resource_id = response['data']['id']
        assert resource_id is not None

        return resource_id

    def test_02_get_list(self, api_client):
        """Test GET /resource - Get list"""
        response = api_client.get('resource', params={'limit': 10})
        assert_api_success(response)
        assert 'items' in response['data']
        assert len(response['data']['items']) > 0

    def test_03_get_record(self, api_client):
        """Test GET /resource/{id} - Get single record"""
        # Use ID from test_01_create_resource
        resource_id = 'RESOURCE-12345678'

        record = assert_record_exists(api_client, 'resource', resource_id)
        assert record['name'] == 'Expected Name'

    def test_04_update_full(self, api_client):
        """Test PUT /resource/{id} - Full update"""
        resource_id = 'RESOURCE-12345678'

        update_data = {
            'id': resource_id,
            'name': 'Updated Name',
            # ... all required fields
        }

        response = api_client.put(f'resource/{resource_id}', update_data)
        assert_api_success(response)

    def test_05_update_partial(self, api_client):
        """Test PATCH /resource/{id} - Partial update"""
        resource_id = 'RESOURCE-12345678'

        patch_data = {
            'id': resource_id,
            'name': 'Patched Name'
        }

        response = api_client.patch(f'resource/{resource_id}', patch_data)
        assert_api_success(response)

    def test_06_delete(self, api_client):
        """Test DELETE /resource/{id}"""
        resource_id = 'RESOURCE-12345678'

        response = api_client.delete(f'resource/{resource_id}')
        assert_api_success(response)

        assert_record_deleted(api_client, 'resource', resource_id)
```

## Best Practices

### 1. Test Independence
- Each test should be able to run independently
- Use fixtures for test data, not hardcoded values
- Clean up created resources in teardown

### 2. Test Naming
- Prefix with number for execution order: `test_01_`, `test_02_`
- Use descriptive names: `test_create_extension_with_voicemail`
- Follow pattern: `test_<action>_<resource>_<scenario>`

### 3. Assertions
- Use helper functions: `assert_api_success()`, `assert_record_exists()`
- Check response structure: `assert 'data' in response`
- Verify data: `assert record['field'] == expected_value`

### 4. Error Handling
- Test both success and failure cases
- Verify error messages: `assert 'error' in response['messages']`
- Check HTTP status codes: `response.status_code == 422`

### 5. Data Management
- Use fixtures for test data
- Don't rely on specific IDs from fixtures
- Create temporary data for tests, clean up after

## CI/CD Integration

### GitHub Actions Example

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mikopbx:
        image: mikopbx/mikopbx:latest
        ports:
          - 8081:80

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd tests/api
          pip install -r requirements.txt

      - name: Run tests
        env:
          MIKOPBX_API_URL: http://localhost:8081/pbxcore/api/v3
        run: |
          cd tests/api
          pytest -v --cov=. --cov-report=xml --cov-report=html

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./tests/api/coverage.xml
```

## Troubleshooting

### Authentication Issues

```bash
# Test authentication manually
python3 -c "
from conftest import MikoPBXClient
client = MikoPBXClient('http://127.0.0.1:8081/pbxcore/api/v3', 'admin', '123456789MikoPBX#1')
client.authenticate()
print('Access Token:', client.access_token[:30] + '...')
"
```

### Fixture Issues

```bash
# Verify fixtures are loaded
pytest -v --fixtures | grep fixtures

# Check specific fixture
python3 -c "
import json
with open('fixtures/employee.json') as f:
    data = json.load(f)
    print(f'Loaded {len(data)} employees')
"
```

### Connection Issues

```bash
# Check API is accessible
curl http://127.0.0.1:8081/pbxcore/api/health

# Check with authentication
TOKEN=$(curl -s -X POST http://127.0.0.1:8081/pbxcore/api/v3/auth:login \
  -d "login=admin&password=123456789MikoPBX%231" | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

curl -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8081/pbxcore/api/v3/extensions | python3 -m json.tool
```

## Resources

- [MikoPBX REST API Documentation](https://docs.mikopbx.com/api)
- [OpenAPI Specification](http://127.0.0.1:8081/pbxcore/api/v3/openapi:getSpecification)
- [Pytest Documentation](https://docs.pytest.org/)
- [Schemathesis Documentation](https://schemathesis.readthedocs.io/)
- [Requests Library](https://requests.readthedocs.io/)
