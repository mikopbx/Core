# Pytest Patterns for MikoPBX API Testing

Complete reference for pytest patterns, fixtures, and best practices for testing MikoPBX REST API endpoints.

## Table of Contents

1. [Test Organization](#test-organization)
2. [Fixtures](#fixtures)
3. [Parametrized Tests](#parametrized-tests)
4. [Test Markers](#test-markers)
5. [Assertions](#assertions)
6. [Test Data Management](#test-data-management)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Test Organization

### Test Class Structure

Organize tests by HTTP method and functionality:

```python
class TestCreateExtensions:
    """All tests for POST /extensions"""
    pass

class TestGetExtensions:
    """All tests for GET /extensions"""
    pass

class TestUpdateExtensions:
    """All tests for PUT/PATCH /extensions"""
    pass

class TestDeleteExtensions:
    """All tests for DELETE /extensions"""
    pass

class TestEdgeCasesExtensions:
    """Edge cases and boundary tests"""
    pass
```

### File Naming Convention

```
tests/api/
├── test_extensions_api.py          # Extensions endpoint
├── test_providers_api.py            # Providers endpoint
├── test_incoming_routes_api.py      # Incoming routes endpoint
└── conftest.py                      # Shared fixtures
```

---

## Fixtures

### Session-scoped Fixtures

Use for expensive operations that can be shared across all tests:

```python
@pytest.fixture(scope="session")
def api_base_url():
    """Base URL for API - session scoped"""
    return "https://mikopbx-php83.localhost:8445"

@pytest.fixture(scope="session")
def admin_credentials():
    """Admin credentials - session scoped"""
    return {
        "login": "admin",
        "password": "123456789MikoPBX#1"
    }
```

### Function-scoped Fixtures

Use for resources that need fresh state for each test:

```python
@pytest.fixture
def auth_token(api_base_url, admin_credentials):
    """Get fresh auth token for each test"""
    response = requests.post(
        f"{api_base_url}/pbxcore/api/v3/auth/login",
        json=admin_credentials,
        verify=False
    )
    return response.json()["data"]["access_token"]

@pytest.fixture
def headers(auth_token):
    """Standard headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
```

### Cleanup Fixtures

Use `yield` for setup/teardown:

```python
@pytest.fixture
def created_extension(api_base_url, headers):
    """Create extension, yield it, then clean up"""
    # Setup
    payload = {"number": "1001", "user_id": "1"}
    response = requests.post(
        f"{api_base_url}/pbxcore/api/v3/extensions",
        json=payload,
        headers=headers,
        verify=False
    )
    extension_id = response.json()["data"]["id"]

    # Provide to test
    yield extension_id

    # Cleanup
    requests.delete(
        f"{api_base_url}/pbxcore/api/v3/extensions/{extension_id}",
        headers=headers,
        verify=False
    )
```

---

## Parametrized Tests

### Testing Multiple Values

```python
@pytest.mark.parametrize("status", ["enabled", "disabled", "pending"])
def test_create_with_status(status, api_base_url, headers):
    """Test creating extension with different status values"""
    payload = {
        "number": "1001",
        "status": status
    }
    response = requests.post(
        f"{api_base_url}/pbxcore/api/v3/extensions",
        json=payload,
        headers=headers,
        verify=False
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == status
```

### Testing Invalid Inputs

```python
@pytest.mark.parametrize("invalid_number,expected_error", [
    ("", "Number cannot be empty"),
    ("abc", "Number must be numeric"),
    ("1" * 100, "Number too long"),
])
def test_create_with_invalid_number(invalid_number, expected_error, api_base_url, headers):
    """Test validation of extension number field"""
    payload = {"number": invalid_number}
    response = requests.post(
        f"{api_base_url}/pbxcore/api/v3/extensions",
        json=payload,
        headers=headers,
        verify=False
    )
    assert response.status_code == 400
    assert expected_error in response.json()["messages"]
```

### Combining Multiple Parameters

```python
@pytest.mark.parametrize("method,expected_status", [
    ("GET", 200),
    ("POST", 200),
    ("PUT", 200),
    ("DELETE", 200),
    ("PATCH", 200),
])
def test_http_methods(method, expected_status, api_base_url, headers):
    """Test all HTTP methods on endpoint"""
    response = requests.request(
        method,
        f"{api_base_url}/pbxcore/api/v3/extensions",
        headers=headers,
        verify=False
    )
    assert response.status_code == expected_status
```

---

## Test Markers

### Custom Markers

Define in `pytest.ini`:

```ini
[pytest]
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
    smoke: marks tests as smoke tests
    crud: marks tests as CRUD operation tests
```

Use in tests:

```python
@pytest.mark.slow
def test_bulk_import_1000_extensions(api_base_url, headers):
    """Test importing 1000 extensions"""
    pass

@pytest.mark.smoke
def test_api_health_check(api_base_url):
    """Quick health check of API"""
    response = requests.get(f"{api_base_url}/pbxcore/api/v3/system/ping")
    assert response.status_code == 200
```

### Skip and XFail

```python
@pytest.mark.skip(reason="Feature not yet implemented")
def test_future_feature():
    pass

@pytest.mark.skipif(
    not os.getenv("SCHEMA_VALIDATION_STRICT"),
    reason="Schema validation not enabled"
)
def test_schema_validation():
    pass

@pytest.mark.xfail(reason="Known bug in v1.2.3")
def test_known_bug():
    pass
```

---

## Assertions

### Basic Assertions

```python
# Status code
assert response.status_code == 200

# Response structure
assert "data" in response.json()
assert isinstance(response.json()["data"], list)

# Field presence
assert "id" in response.json()["data"]

# Field values
assert response.json()["data"]["name"] == "test"
```

### Custom Assertion Messages

```python
assert response.status_code == 200, \
    f"Expected 200, got {response.status_code}: {response.text}"

assert "id" in data, \
    f"Response missing 'id' field. Got: {list(data.keys())}"
```

### Assertions with Helpers

```python
def assert_valid_extension(data):
    """Helper to validate extension structure"""
    required_fields = ["id", "number", "user_id"]
    for field in required_fields:
        assert field in data, f"Missing required field: {field}"

    assert isinstance(data["id"], str), "ID must be string"
    assert isinstance(data["number"], str), "Number must be string"

# Use in tests
def test_create_extension(api_base_url, headers):
    response = requests.post(...)
    assert_valid_extension(response.json()["data"])
```

---

## Test Data Management

### External Test Data Files

```python
# test_data/extensions.json
{
    "valid_extension": {
        "number": "1001",
        "user_id": "1",
        "type": "SIP"
    },
    "invalid_extension": {
        "number": ""
    }
}

# In test file
import json

@pytest.fixture
def test_data():
    with open("test_data/extensions.json") as f:
        return json.load(f)

def test_with_external_data(test_data, api_base_url, headers):
    payload = test_data["valid_extension"]
    response = requests.post(...)
```

### Data Builders

```python
class ExtensionBuilder:
    """Builder pattern for extension test data"""

    def __init__(self):
        self.data = {
            "number": "1001",
            "user_id": "1",
            "type": "SIP"
        }

    def with_number(self, number):
        self.data["number"] = number
        return self

    def with_user(self, user_id):
        self.data["user_id"] = user_id
        return self

    def build(self):
        return self.data

# Usage
def test_extension_creation():
    extension = ExtensionBuilder().with_number("1002").build()
    response = requests.post(..., json=extension)
```

---

## Error Handling

### Testing Error Responses

```python
def test_invalid_request_returns_error(api_base_url, headers):
    """Test that invalid requests return proper error structure"""
    response = requests.post(
        f"{api_base_url}/pbxcore/api/v3/extensions",
        json={},  # Missing required fields
        headers=headers,
        verify=False
    )

    assert response.status_code == 400

    error_data = response.json()
    assert "messages" in error_data
    assert isinstance(error_data["messages"], list)
    assert len(error_data["messages"]) > 0
```

### Handling Connection Errors

```python
def test_api_connection():
    """Test graceful handling of connection errors"""
    try:
        response = requests.get(
            "https://invalid-url.localhost",
            timeout=5
        )
    except requests.exceptions.ConnectionError:
        pytest.fail("API not reachable")
    except requests.exceptions.Timeout:
        pytest.fail("API timeout")
```

---

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests:

```python
# ❌ Bad - depends on previous test
def test_create_extension():
    global extension_id
    extension_id = create_extension()

def test_update_extension():
    update_extension(extension_id)  # Depends on previous test

# ✅ Good - independent tests
def test_create_extension(headers):
    extension_id = create_extension(headers)
    assert extension_id is not None

def test_update_extension(headers):
    extension_id = create_extension(headers)
    update_extension(extension_id, headers)
```

### 2. Clear Test Names

```python
# ❌ Bad
def test_1():
    pass

# ✅ Good
def test_create_extension_with_valid_data_returns_200():
    pass

def test_create_extension_without_number_returns_400():
    pass
```

### 3. One Assertion Per Test (when practical)

```python
# ✅ Good - single assertion
def test_response_has_data_field():
    response = make_request()
    assert "data" in response.json()

def test_response_has_id_field():
    response = make_request()
    assert "id" in response.json()["data"]

# ⚠️ Acceptable - related assertions
def test_response_structure():
    response = make_request()
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], dict)
    assert "id" in data["data"]
```

### 4. Use Descriptive Docstrings

```python
def test_create_extension_with_duplicate_number(headers):
    """
    Test that creating an extension with a duplicate number returns 409 Conflict

    Steps:
    1. Create extension with number 1001
    2. Attempt to create another extension with number 1001

    Expected: Second request returns 409 with conflict message
    """
    pass
```

### 5. Clean Up After Tests

```python
# ✅ Use fixtures for automatic cleanup
@pytest.fixture
def extension(headers):
    ext_id = create_extension(headers)
    yield ext_id
    delete_extension(ext_id, headers)

# ✅ Or explicit cleanup
def test_extension_update(headers):
    ext_id = create_extension(headers)
    try:
        # Test logic
        update_extension(ext_id, headers)
    finally:
        delete_extension(ext_id, headers)
```

### 6. Test Both Success and Failure Paths

```python
# Success path
def test_create_extension_with_valid_data(headers):
    response = create_extension({"number": "1001"}, headers)
    assert response.status_code == 200

# Failure paths
def test_create_extension_without_number(headers):
    response = create_extension({}, headers)
    assert response.status_code == 400

def test_create_extension_with_invalid_number(headers):
    response = create_extension({"number": "abc"}, headers)
    assert response.status_code == 400
```

### 7. Use conftest.py for Shared Fixtures

```python
# conftest.py
@pytest.fixture(scope="session")
def api_base_url():
    return "https://mikopbx-php83.localhost:8445"

@pytest.fixture
def headers(auth_token):
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
```

### 8. Log Important Information

```python
import logging

def test_create_extension(headers, caplog):
    """Test with logging"""
    with caplog.at_level(logging.INFO):
        logging.info("Creating extension with number 1001")
        response = create_extension({"number": "1001"}, headers)
        logging.info(f"Response: {response.status_code}")

    assert response.status_code == 200
```

### 9. Run Tests in Parallel (when appropriate)

```bash
# Install pytest-xdist
pip install pytest-xdist

# Run tests in parallel
pytest -n auto tests/api/
```

### 10. Use pytest Plugins

Useful plugins:
- `pytest-cov` - Code coverage
- `pytest-xdist` - Parallel execution
- `pytest-timeout` - Timeout tests
- `pytest-html` - HTML reports
- `pytest-json-report` - JSON reports
