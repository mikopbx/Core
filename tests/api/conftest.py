#!/usr/bin/env python3
"""
Pytest configuration for MikoPBX REST API tests

This module provides:
- JWT authentication fixtures
- Test data fixtures from JSON files
- API client configuration
- Common utilities for all tests
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional

import pytest
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# Configuration
API_BASE_URL = os.getenv('MIKOPBX_API_URL', 'http://127.0.0.1:8081/pbxcore/api/v3')
API_LOGIN = os.getenv('MIKOPBX_LOGIN', 'admin')
API_PASSWORD = os.getenv('MIKOPBX_PASSWORD', '123456789MikoPBX#1')
FIXTURES_DIR = Path(__file__).parent / 'fixtures'


class MikoPBXClient:
    """
    MikoPBX REST API client with JWT authentication

    Features:
    - Automatic JWT token management
    - Token refresh before expiration
    - Retry logic for transient failures
    - Session cookie handling (refreshToken)
    """

    def __init__(self, base_url: str, login: str, password: str):
        self.base_url = base_url.rstrip('/')
        self.login = login
        self.password = password
        self.access_token: Optional[str] = None
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        """Create session with retry logic"""
        session = requests.Session()

        # Disable SSL verification for self-signed certificates
        session.verify = False

        # Suppress InsecureRequestWarning
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        # Retry strategy for transient failures
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        return session

    def authenticate(self) -> None:
        """
        Authenticate and get JWT access token

        Sets:
        - self.access_token: JWT bearer token (15 min lifetime)
        - self.session.cookies: refreshToken cookie (30 days lifetime)
        """
        response = self.session.post(
            f"{self.base_url}/auth:login",
            data={
                'login': self.login,
                'password': self.password,
                'rememberMe': 'true'
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )

        response.raise_for_status()
        data = response.json()

        if not data.get('result'):
            raise RuntimeError(f"Authentication failed: {data.get('messages')}")

        self.access_token = data['data']['accessToken']
        # refreshToken cookie is automatically saved in session

    def refresh_token(self) -> None:
        """
        Refresh access token using refreshToken cookie

        This should be called when access token is close to expiration (15 min)
        """
        response = self.session.post(f"{self.base_url}/auth:refresh")
        response.raise_for_status()
        data = response.json()

        if not data.get('result'):
            # If refresh fails, re-authenticate
            self.authenticate()
            return

        self.access_token = data['data']['accessToken']
        # New refreshToken cookie is automatically saved

    def _get_headers(self) -> Dict[str, str]:
        """Get headers with current access token"""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }

    def get(self, path: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """GET request"""
        response = self.session.get(
            f"{self.base_url}/{path.lstrip('/')}",
            params=params,
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()

    def post(self, path: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """POST request"""
        response = self.session.post(
            f"{self.base_url}/{path.lstrip('/')}",
            json=data,
            headers=self._get_headers()
        )
        try:
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            # Try to extract error message from JSON response
            try:
                error_data = response.json()
                error_msg = f"{e}. API Messages: {error_data.get('messages', {})}"
                raise requests.exceptions.HTTPError(error_msg, response=response)
            except (ValueError, KeyError):
                raise e

    def put(self, path: str, data: Dict) -> Dict[str, Any]:
        """PUT request (full update)"""
        response = self.session.put(
            f"{self.base_url}/{path.lstrip('/')}",
            json=data,
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()

    def patch(self, path: str, data: Dict) -> Dict[str, Any]:
        """PATCH request (partial update)"""
        response = self.session.patch(
            f"{self.base_url}/{path.lstrip('/')}",
            json=data,
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()

    def delete(self, path: str) -> Dict[str, Any]:
        """DELETE request"""
        response = self.session.delete(
            f"{self.base_url}/{path.lstrip('/')}",
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()

    def logout(self) -> None:
        """Logout and invalidate tokens"""
        if self.access_token:
            try:
                self.session.post(
                    f"{self.base_url}/auth:logout",
                    headers=self._get_headers()
                )
            except Exception:
                pass  # Ignore logout errors
            finally:
                self.access_token = None
                self.session.cookies.clear()


# ============================================================================
# Pytest Fixtures
# ============================================================================

@pytest.fixture(scope='session')
def api_client() -> MikoPBXClient:
    """
    Session-scoped authenticated API client

    Usage:
        def test_something(api_client):
            response = api_client.get('extensions')
            assert response['result'] is True

    Note: If ENABLE_SYSTEM_RESET=1, this client will be re-authenticated
    after test_00_setup_clean_system.py runs (via pytest hook).
    """
    client = MikoPBXClient(API_BASE_URL, API_LOGIN, API_PASSWORD)
    client.authenticate()

    yield client

    # Cleanup: logout after all tests
    client.logout()


@pytest.fixture(scope='session')
def fixtures() -> Dict[str, Dict[str, Any]]:
    """
    Load all test fixtures from JSON files

    Returns:
        Dictionary with fixture name as key and fixture data as value

    Usage:
        def test_create_extension(api_client, fixtures):
            employee = fixtures['employee']['smith.james']
            response = api_client.post('extensions', employee)
    """
    fixtures_data = {}

    # Load index to get all available fixtures
    index_file = FIXTURES_DIR / 'index.json'
    if not index_file.exists():
        raise FileNotFoundError(f"Fixtures index not found: {index_file}")

    with open(index_file, 'r', encoding='utf-8') as f:
        index = json.load(f)

    # Load each fixture file
    for fixture_name, metadata in index.items():
        fixture_file = FIXTURES_DIR / metadata['file']

        if not fixture_file.exists():
            print(f"Warning: Fixture file not found: {fixture_file}")
            continue

        with open(fixture_file, 'r', encoding='utf-8') as f:
            fixtures_data[fixture_name] = json.load(f)

    return fixtures_data


@pytest.fixture
def employee_fixtures(fixtures) -> Dict[str, Any]:
    """Employee test data"""
    return fixtures.get('employee', {})


@pytest.fixture
def extension_fixtures(employee_fixtures) -> Dict[str, Any]:
    """Extension test data (alias for employee)"""
    return employee_fixtures


@pytest.fixture
def provider_sip_fixtures(fixtures) -> Dict[str, Any]:
    """SIP Provider test data"""
    return fixtures.get('s_i_p_provider', {})


@pytest.fixture
def provider_iax_fixtures(fixtures) -> Dict[str, Any]:
    """IAX Provider test data"""
    return fixtures.get('i_a_x_provider', {})


@pytest.fixture
def call_queue_fixtures(fixtures) -> Dict[str, Any]:
    """Call Queue test data"""
    return fixtures.get('call_queue', {})


@pytest.fixture
def ivr_menu_fixtures(fixtures) -> Dict[str, Any]:
    """IVR Menu test data"""
    return fixtures.get('i_v_r_menu', {})


@pytest.fixture
def incoming_route_fixtures(fixtures) -> Dict[str, Any]:
    """Incoming Call Rules test data"""
    return fixtures.get('incoming_call_rules', {})


@pytest.fixture
def outgoing_route_fixtures(fixtures) -> Dict[str, Any]:
    """Outgoing Call Rules test data"""
    return fixtures.get('outgoing_call_rules', {})


@pytest.fixture
def firewall_fixtures(fixtures) -> Dict[str, Any]:
    """Firewall Rules test data"""
    return fixtures.get('firewall_rules', {})


@pytest.fixture
def ami_user_fixtures(fixtures) -> Dict[str, Any]:
    """AMI User test data"""
    return fixtures.get('ami_user', {})


@pytest.fixture
def conference_room_fixtures(fixtures) -> Dict[str, Any]:
    """Conference Room test data"""
    return fixtures.get('conference_rooms', {})


@pytest.fixture
def dialplan_app_fixtures(fixtures) -> Dict[str, Any]:
    """Dialplan Application test data"""
    return fixtures.get('dialplan_applications', {})


@pytest.fixture
def audio_file_fixtures(fixtures) -> Dict[str, Any]:
    """Audio File test data"""
    return fixtures.get('audio_files', {})


@pytest.fixture
def moh_file_fixtures(fixtures) -> Dict[str, Any]:
    """MOH Audio File test data"""
    return fixtures.get('m_o_h_audio_files', {})


@pytest.fixture
def out_of_work_period_fixtures(fixtures) -> Dict[str, Any]:
    """Out of Work Period test data"""
    return fixtures.get('out_of_work_periods', {})


@pytest.fixture
def module_fixtures(fixtures) -> Dict[str, Any]:
    """Module test data"""
    return fixtures.get('module', {})


@pytest.fixture
def pbx_settings_fixtures(fixtures) -> Dict[str, Any]:
    """PBX Settings test data"""
    return fixtures.get('p_b_x_settings', {})


# ============================================================================
# Helper Functions
# ============================================================================

def convert_employee_fixture_to_api_format(fixture_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert employee fixture data from PHP format to REST API format

    PHP fixtures use simple field names, but API expects prefixed fields:
    - username → user_username
    - email → user_email
    - secret → sip_secret
    - mobile → mobile_number
    - etc.

    Args:
        fixture_data: Raw data from employee.json fixture

    Returns:
        Formatted data ready for POST /employees

    Example:
        >>> fixture = {"username": "John Doe", "number": 201, "secret": "pass123"}
        >>> api_data = convert_employee_fixture_to_api_format(fixture)
        >>> api_data
        {'user_username': 'John Doe', 'number': '201', 'sip_secret': 'pass123', ...}
    """
    api_data = {}

    # Required fields
    api_data['user_username'] = fixture_data.get('username', '')
    api_data['number'] = str(fixture_data.get('number', ''))

    # SIP password - required for creation
    # Note: fixture might have 'secret' or 'sip_secret'
    api_data['sip_secret'] = fixture_data.get('sip_secret') or fixture_data.get('secret', '')

    # Optional user fields
    if 'email' in fixture_data:
        api_data['user_email'] = fixture_data['email']

    if 'avatar' in fixture_data:
        api_data['user_avatar'] = fixture_data['avatar']

    # Mobile phone
    if 'mobile' in fixture_data:
        mobile = fixture_data['mobile']
        # Ensure mobile number has + prefix if it's international
        if mobile and not mobile.startswith('+'):
            mobile = '+' + mobile
        api_data['mobile_number'] = mobile

    if 'mobile_dialstring' in fixture_data:
        api_data['mobile_dialstring'] = fixture_data['mobile_dialstring']

    # SIP settings
    sip_fields = {
        'sip_enableRecording': fixture_data.get('sip_enableRecording', False),
        'sip_dtmfmode': fixture_data.get('sip_dtmfmode', 'auto'),
        'sip_networkfilterid': fixture_data.get('sip_networkfilterid', 'none'),
        'sip_manualattributes': fixture_data.get('sip_manualattributes', ''),
    }

    # Fix transport field - remove leading quote if present
    transport = fixture_data.get('sip_transport', 'udp')
    if transport.startswith("'"):
        transport = transport[1:]  # Remove leading quote
    sip_fields['sip_transport'] = transport

    api_data.update(sip_fields)

    # Forwarding settings
    if 'fwd_ringlength' in fixture_data:
        api_data['fwd_ringlength'] = int(fixture_data['fwd_ringlength'])

    if 'fwd_forwarding' in fixture_data:
        api_data['fwd_forwarding'] = fixture_data['fwd_forwarding']

    if 'fwd_forwardingonbusy' in fixture_data:
        api_data['fwd_forwardingonbusy'] = fixture_data['fwd_forwardingonbusy']

    if 'fwd_forwardingonunavailable' in fixture_data:
        api_data['fwd_forwardingonunavailable'] = fixture_data['fwd_forwardingonunavailable']

    return api_data


def convert_conference_room_fixture_to_api_format(fixture_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert conference room fixture data to REST API format

    Conference rooms have simpler structure than employees.
    Fields are mostly 1:1 mapping with API.

    Args:
        fixture_data: Raw data from conference_rooms.json fixture

    Returns:
        Formatted data ready for POST /conference-rooms

    Example:
        >>> fixture = {"name": "Sales Conf", "extension": "400", "pinCode": "1234"}
        >>> api_data = convert_conference_room_fixture_to_api_format(fixture)
        >>> api_data
        {'name': 'Sales Conf', 'extension': '400', 'pinCode': '1234'}
    """
    api_data = {}

    # Required fields
    api_data['name'] = fixture_data.get('name', '')
    api_data['extension'] = str(fixture_data.get('extension', ''))

    # Optional fields
    if 'pinCode' in fixture_data:
        api_data['pinCode'] = str(fixture_data['pinCode'])

    if 'description' in fixture_data:
        api_data['description'] = fixture_data['description']

    return api_data


def convert_dialplan_app_fixture_to_api_format(fixture_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert dialplan application fixture data to REST API format

    Dialplan applications have several types:
    - php: PHP AGI script
    - plaintext: Plain Asterisk dialplan
    - python3: Python AGI script
    - lua: Lua script
    - ael: Asterisk Extension Language
    - none: No logic

    Args:
        fixture_data: Raw data from dialplan_applications.json fixture

    Returns:
        Formatted data ready for POST /dialplan-applications

    Example:
        >>> fixture = {"name": "Echo Test", "extension": "999", "type": "plaintext",
        ...            "applicationlogic": "Answer()\\nEcho()"}
        >>> api_data = convert_dialplan_app_fixture_to_api_format(fixture)
        >>> api_data
        {'name': 'Echo Test', 'extension': '999', 'type': 'plaintext',
         'applicationlogic': 'Answer()\\nEcho()'}
    """
    api_data = {}

    # Required fields
    api_data['name'] = fixture_data.get('name', '')
    api_data['extension'] = str(fixture_data.get('extension', ''))
    api_data['type'] = fixture_data.get('type', 'php')

    # Fix type - remove 'self::TYPE_' prefix if present
    if api_data['type'].startswith('self::TYPE_'):
        type_map = {
            'self::TYPE_PHP_AGI': 'php',
            'self::TYPE_PLAINTEXT': 'plaintext',
            'self::TYPE_PYTHON3_AGI': 'python3',
            'self::TYPE_LUA': 'lua',
            'self::TYPE_AEL': 'ael',
            'self::TYPE_NONE': 'none'
        }
        api_data['type'] = type_map.get(api_data['type'], 'php')

    # Optional fields
    if 'applicationlogic' in fixture_data:
        api_data['applicationlogic'] = fixture_data['applicationlogic']

    if 'description' in fixture_data:
        api_data['description'] = fixture_data['description']

    if 'hint' in fixture_data:
        api_data['hint'] = fixture_data['hint']

    return api_data


def convert_call_queue_fixture_to_api_format(fixture_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert call queue fixture data to REST API format

    Call queues are complex with many fields:
    - Basic info: name, extension, description
    - Strategy and timings
    - Audio settings
    - Redirect destinations
    - Members

    Args:
        fixture_data: Raw data from call_queue.json fixture

    Returns:
        Formatted data ready for POST /call-queues

    Example:
        >>> fixture = {"name": "Support Queue", "extension": 2200, "strategy": "ringall"}
        >>> api_data = convert_call_queue_fixture_to_api_format(fixture)
        >>> api_data
        {'name': 'Support Queue', 'extension': '2200', 'strategy': 'ringall', ...}
    """
    api_data = {}

    # Required fields
    api_data['name'] = fixture_data.get('name', '')
    api_data['extension'] = str(fixture_data.get('extension', ''))
    api_data['strategy'] = fixture_data.get('strategy', 'ringall')

    # Optional description
    if 'description' in fixture_data:
        # Remove leading quote if present (from fixture format)
        description = fixture_data['description']
        if description.startswith("'"):
            description = description[1:]
        api_data['description'] = description

    # Timing settings
    if 'seconds_to_ring_each_member' in fixture_data:
        api_data['seconds_to_ring_each_member'] = int(fixture_data['seconds_to_ring_each_member'])

    if 'seconds_for_wrapup' in fixture_data:
        api_data['seconds_for_wrapup'] = int(fixture_data['seconds_for_wrapup'])

    # Call handling
    if 'recive_calls_while_on_a_call' in fixture_data:
        api_data['recive_calls_while_on_a_call'] = bool(fixture_data['recive_calls_while_on_a_call'])

    # Caller experience
    if 'caller_hear' in fixture_data:
        api_data['caller_hear'] = fixture_data['caller_hear']

    if 'moh_sound_id' in fixture_data:
        api_data['moh_sound_id'] = str(fixture_data['moh_sound_id'])

    # Announcements
    if 'announce_position' in fixture_data:
        api_data['announce_position'] = bool(fixture_data['announce_position'])

    if 'announce_hold_time' in fixture_data:
        api_data['announce_hold_time'] = bool(fixture_data['announce_hold_time'])

    if 'periodic_announce_sound_id' in fixture_data:
        api_data['periodic_announce_sound_id'] = str(fixture_data['periodic_announce_sound_id'])

    if 'periodic_announce_frequency' in fixture_data:
        api_data['periodic_announce_frequency'] = int(fixture_data['periodic_announce_frequency'])

    # Redirect settings
    if 'timeout_to_redirect_to_extension' in fixture_data:
        api_data['timeout_to_redirect_to_extension'] = int(fixture_data['timeout_to_redirect_to_extension'])

    if 'timeout_extension' in fixture_data:
        api_data['timeout_extension'] = str(fixture_data['timeout_extension'])

    if 'redirect_to_extension_if_empty' in fixture_data:
        api_data['redirect_to_extension_if_empty'] = str(fixture_data['redirect_to_extension_if_empty'])

    if 'redirect_to_extension_if_unanswered' in fixture_data:
        api_data['redirect_to_extension_if_unanswered'] = str(fixture_data['redirect_to_extension_if_unanswered'])

    if 'number_unanswered_calls_to_redirect' in fixture_data:
        api_data['number_unanswered_calls_to_redirect'] = int(fixture_data['number_unanswered_calls_to_redirect'])

    if 'redirect_to_extension_if_repeat_exceeded' in fixture_data:
        api_data['redirect_to_extension_if_repeat_exceeded'] = str(fixture_data['redirect_to_extension_if_repeat_exceeded'])

    if 'number_repeat_unanswered_to_redirect' in fixture_data:
        api_data['number_repeat_unanswered_to_redirect'] = int(fixture_data['number_repeat_unanswered_to_redirect'])

    if 'callerid_prefix' in fixture_data:
        api_data['callerid_prefix'] = fixture_data['callerid_prefix']

    # Members (if not using "ARRAY" placeholder)
    if 'agents' in fixture_data and fixture_data['agents'] != "ARRAY":
        api_data['members'] = fixture_data['agents']

    return api_data


def assert_api_success(response: Dict[str, Any], message: str = "API request failed") -> None:
    """
    Assert that API response indicates success

    Args:
        response: API response dictionary
        message: Custom error message

    Raises:
        AssertionError: If response.result is not True
    """
    assert response.get('result') is True, \
        f"{message}. Messages: {response.get('messages', {})}"


def assert_record_exists(api_client: MikoPBXClient, resource: str, record_id: str) -> Dict[str, Any]:
    """
    Assert that a record exists and return it

    Args:
        api_client: Authenticated API client
        resource: Resource name (e.g., 'extensions', 'call-queues')
        record_id: Record ID

    Returns:
        Record data

    Raises:
        AssertionError: If record doesn't exist
    """
    response = api_client.get(f"{resource}/{record_id}")
    assert_api_success(response, f"Record {record_id} not found in {resource}")
    return response['data']


def assert_record_deleted(api_client: MikoPBXClient, resource: str, record_id: str) -> None:
    """
    Assert that a record has been deleted

    Args:
        api_client: Authenticated API client
        resource: Resource name
        record_id: Record ID

    Raises:
        AssertionError: If record still exists (no 404 or 422)
    """
    try:
        response = api_client.get(f"{resource}/{record_id}")
        # If we get here with success, record still exists
        if response.get('result') is True:
            pytest.fail(f"Record {record_id} in {resource} should have been deleted but still exists")
    except requests.exceptions.HTTPError as e:
        # Should get 404 or 422 for deleted/not found records
        assert e.response.status_code in [404, 422], \
            f"Expected 404 or 422 for deleted record, got {e.response.status_code}"


# ============================================================================
# Pytest Hooks
# ============================================================================

def pytest_runtest_makereport(item, call):
    """
    Pytest hook to re-authenticate api_client after system reset

    This hook runs after each test completes. If the test that just finished
    is test_00_setup_clean_system::test_03_execute_system_restore_default,
    we re-authenticate the session-scoped api_client fixture because the
    system reset invalidated all tokens.
    """
    if call.when == 'call' and call.excinfo is None:
        # Check if this is the system reset test
        if 'test_00_setup_clean_system' in item.nodeid and 'test_03_execute_system_restore_default' in item.nodeid:
            # Get the api_client fixture from the session
            if hasattr(item.session, '_fixture_cache'):
                for key, value in item.session._fixture_cache.items():
                    if 'api_client' in str(key):
                        client = value
                        if isinstance(client, MikoPBXClient):
                            print("\n⚠️  System reset detected - re-authenticating api_client...")
                            try:
                                client.authenticate()
                                print("✓ api_client re-authenticated successfully")
                            except Exception as e:
                                print(f"✗ Failed to re-authenticate: {e}")
                        break
