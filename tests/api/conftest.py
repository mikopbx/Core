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

# Import centralized configuration
from config import get_config

# Load configuration (validates .env existence and required vars)
config = get_config()

# Backward compatibility: expose as module-level variables
API_BASE_URL = config.api_url
API_LOGIN = config.api_username
API_PASSWORD = config.api_password

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

    def __init__(self, base_url: str, login: str = None, password: str = None, auth_token: str = None):
        self.base_url = base_url.rstrip('/')
        self.login = login
        self.password = password
        self.access_token: Optional[str] = auth_token  # Can be set directly for API keys
        self.session = self._create_session()
        self.verify_ssl = False  # Store for compatibility

    def _create_session(self) -> requests.Session:
        """Create session with retry logic"""
        session = requests.Session()

        # Disable SSL verification for self-signed certificates
        session.verify = False

        # Suppress InsecureRequestWarning
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        # Retry strategy for transient failures and connection errors
        # Increased retries and backoff for server restarts
        retry_strategy = Retry(
            total=10,  # Increased from 3 to 10
            backoff_factor=2,  # Increased from 1 to 2 (2, 4, 8, 16, 32 seconds...)
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
            raise_on_status=False  # Don't raise on status errors, let us handle them
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

    def get_raw(self, path: str, params: Optional[Dict] = None) -> requests.Response:
        """
        GET request returning raw Response object (for testing status codes, headers, etc.)

        Returns:
            requests.Response object with status_code, headers, text, json() methods
        """
        import time
        max_attempts = 5
        base_delay = 3

        for attempt in range(max_attempts):
            try:
                response = self.session.get(
                    f"{self.base_url}/{path.lstrip('/')}",
                    params=params,
                    headers=self._get_headers(),
                    timeout=30
                )
                # Don't raise for status - let caller check status_code
                return response
            except (requests.exceptions.ConnectionError,
                    requests.exceptions.Timeout) as e:
                if attempt < max_attempts - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"\n⚠️  Connection failed (attempt {attempt + 1}/{max_attempts}), "
                          f"retrying in {delay}s... ({type(e).__name__})")
                    time.sleep(delay)
                else:
                    raise

    def get(self, path: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """GET request with connection retry, returns parsed JSON"""
        response = self.get_raw(path, params)
        response.raise_for_status()
        return response.json()

    def post(self, path: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """POST request with connection retry"""
        import time
        max_attempts = 5
        base_delay = 3
        
        for attempt in range(max_attempts):
            try:
                response = self.session.post(
                    f"{self.base_url}/{path.lstrip('/')}",
                    json=data,
                    headers=self._get_headers(),
                    timeout=30
                )
                response.raise_for_status()
                return response.json()
            except (requests.exceptions.ConnectionError, 
                    requests.exceptions.Timeout) as e:
                if attempt < max_attempts - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"\n⚠️  Connection failed (attempt {attempt + 1}/{max_attempts}), "
                          f"retrying in {delay}s... ({type(e).__name__})")
                    time.sleep(delay)
                else:
                    raise
            except requests.exceptions.HTTPError as e:
                # Try to extract error message from JSON response
                try:
                    error_data = response.json()
                    error_msg = f"{e}. API Messages: {error_data.get('messages', {})}"
                    raise requests.exceptions.HTTPError(error_msg, response=response)
                except (ValueError, KeyError):
                    raise e

    def put(self, path: str, data: Dict, allow_404: bool = False) -> Dict[str, Any]:
        """PUT request (full update) with connection retry

        Args:
            path: API endpoint path
            data: Request data
            allow_404: If True, don't raise exception on 404/422 response (for testing non-existent resources)
        """
        import time
        max_attempts = 5
        base_delay = 3

        for attempt in range(max_attempts):
            try:
                response = self.session.put(
                    f"{self.base_url}/{path.lstrip('/')}",
                    json=data,
                    headers=self._get_headers(),
                    timeout=30
                )
                # Allow 404/422 for testing non-existent resources
                if not (allow_404 and response.status_code in [404, 422]):
                    response.raise_for_status()
                return response.json()
            except (requests.exceptions.ConnectionError,
                    requests.exceptions.Timeout) as e:
                if attempt < max_attempts - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"\n⚠️  Connection failed (attempt {attempt + 1}/{max_attempts}), "
                          f"retrying in {delay}s... ({type(e).__name__})")
                    time.sleep(delay)
                else:
                    raise
            except requests.exceptions.HTTPError as e:
                # Try to extract error message from JSON response
                try:
                    error_data = response.json()
                    error_msg = f"{e}. API Messages: {error_data.get('messages', {})}"
                    raise requests.exceptions.HTTPError(error_msg, response=response)
                except (ValueError, KeyError):
                    raise e

    def patch(self, path: str, data: Dict, allow_404: bool = False) -> Dict[str, Any]:
        """PATCH request (partial update) with connection retry

        Args:
            path: API endpoint path
            data: Request data
            allow_404: If True, don't raise exception on 404/422 response (for testing non-existent resources)
        """
        import time
        max_attempts = 5
        base_delay = 3

        for attempt in range(max_attempts):
            try:
                response = self.session.patch(
                    f"{self.base_url}/{path.lstrip('/')}",
                    json=data,
                    headers=self._get_headers(),
                    timeout=30
                )
                # Allow 404/422 for testing non-existent resources
                if not (allow_404 and response.status_code in [404, 422]):
                    response.raise_for_status()
                return response.json()
            except (requests.exceptions.ConnectionError,
                    requests.exceptions.Timeout) as e:
                if attempt < max_attempts - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"\n⚠️  Connection failed (attempt {attempt + 1}/{max_attempts}), "
                          f"retrying in {delay}s... ({type(e).__name__})")
                    time.sleep(delay)
                else:
                    raise
            except requests.exceptions.HTTPError as e:
                # Try to extract error message from JSON response
                try:
                    error_data = response.json()
                    error_msg = f"{e}. API Messages: {error_data.get('messages', {})}"
                    raise requests.exceptions.HTTPError(error_msg, response=response)
                except (ValueError, KeyError):
                    raise e

    def delete(self, path: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """DELETE request with connection retry

        Args:
            path: API endpoint path
            data: Optional data to send with DELETE request (e.g., deleteRecording flag)
        """
        import time
        max_attempts = 5
        base_delay = 3

        for attempt in range(max_attempts):
            try:
                kwargs = {
                    'headers': self._get_headers(),
                    'timeout': 30
                }
                if data:
                    kwargs['json'] = data

                response = self.session.delete(
                    f"{self.base_url}/{path.lstrip('/')}",
                    **kwargs
                )
                response.raise_for_status()
                return response.json()
            except (requests.exceptions.ConnectionError, 
                    requests.exceptions.Timeout) as e:
                if attempt < max_attempts - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"\n⚠️  Connection failed (attempt {attempt + 1}/{max_attempts}), "
                          f"retrying in {delay}s... ({type(e).__name__})")
                    time.sleep(delay)
                else:
                    raise

    def upload_file(self, path: str, file_path: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Upload file using Resumable.js protocol (chunked upload)

        Args:
            path: API endpoint path (e.g., 'files:upload' or 'sound-files:uploadFile')
            file_path: Absolute path to file to upload
            params: Optional additional parameters

        Returns:
            API response dictionary

        Example:
            response = client.upload_file(
                'files:upload',
                '/path/to/sample.wav',
                params={'category': 'sound'}
            )
        """
        import os
        import hashlib

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_size = os.path.getsize(file_path)
        file_name = os.path.basename(file_path)

        # Generate unique upload ID
        upload_id = hashlib.md5(f"{file_path}{file_size}".encode()).hexdigest()

        # Detect MIME type based on file extension
        import mimetypes
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = 'application/octet-stream'

        # Prepare resumable.js parameters (single chunk for simplicity)
        upload_params = {
            'resumableIdentifier': upload_id,
            'resumableFilename': file_name,
            'resumableTotalSize': file_size,
            'resumableChunkNumber': 1,
            'resumableTotalChunks': 1,
            'resumableChunkSize': file_size,
            'resumableCurrentChunkSize': file_size,
            'file_mime_type': mime_type,
        }

        # Add any additional parameters
        if params:
            upload_params.update(params)

        # Prepare multipart upload
        with open(file_path, 'rb') as f:
            files = {
                'file': (file_name, f, 'application/octet-stream')
            }

            # For multipart, we need to omit Content-Type header (let requests set it)
            headers = {
                'Authorization': f'Bearer {self.access_token}'
            }

            response = self.session.post(
                f"{self.base_url}/{path.lstrip('/')}",
                files=files,
                data=upload_params,
                headers=headers
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


def read_file_from_container(api_client: MikoPBXClient, file_path: str) -> str:
    """
    Read file content from MikoPBX container using REST API

    Args:
        api_client: Authenticated API client
        file_path: Absolute path to file (e.g., '/etc/asterisk/pjsip.conf')

    Returns:
        File content as string

    Raises:
        RuntimeError: If file cannot be read

    Usage:
        config = read_file_from_container(api_client, '/etc/asterisk/pjsip.conf')
    """
    # Use files API endpoint - path should be encoded in URL
    # Remove leading slash for API call
    path_param = file_path.lstrip('/')

    try:
        response = api_client.get(f'files/{path_param}')
        if not response.get('result'):
            raise RuntimeError(f"Failed to read file {file_path}: {response.get('messages')}")

        # Extract content from response
        content = response.get('data', {}).get('content', '')
        return content
    except Exception as e:
        raise RuntimeError(f"Error reading file {file_path}: {e}")


def execute_asterisk_command(api_client: MikoPBXClient, command: str) -> str:
    """
    Execute Asterisk CLI command using REST API

    Args:
        api_client: Authenticated API client
        command: Asterisk CLI command (e.g., 'pjsip show endpoints')

    Returns:
        Command output as string

    Raises:
        RuntimeError: If command fails

    Usage:
        output = execute_asterisk_command(api_client, 'pjsip show endpoints')
    """
    # Use system:executeBashCommand endpoint
    bash_command = f'asterisk -rx "{command}"'

    try:
        response = api_client.post('system:executeBashCommand', {'command': bash_command})
        if not response.get('result'):
            raise RuntimeError(f"Failed to execute command '{command}': {response.get('messages')}")

        # Extract output from response
        output = response.get('data', {}).get('output', '')
        return output
    except Exception as e:
        raise RuntimeError(f"Error executing command '{command}': {e}")


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


# ============================================================================
# Sample Data Fixtures for test_03_get_by_id Tests
# ============================================================================

@pytest.fixture(scope='function')
def sample_sip_provider(api_client, provider_sip_fixtures):
    """
    Create a sample SIP provider for testing GET by ID operations

    This fixture creates a SIP provider at the class level and cleans it up
    after all tests in the class complete. Used by test_03_get_by_id tests.

    Yields:
        str: The ID of the created SIP provider

    Usage:
        def test_03_get_by_id(self, api_client, sample_sip_provider):
            response = api_client.get(f'sip-providers/{sample_sip_provider}')
            assert_api_success(response)
    """
    # Get first SIP provider from fixtures
    fixture_key = list(provider_sip_fixtures.keys())[0]
    provider_data = provider_sip_fixtures[fixture_key].copy()

    # Convert fixture format: password -> secret
    if 'password' in provider_data and 'secret' not in provider_data:
        provider_data['secret'] = provider_data.pop('password')

    # Create the provider
    response = api_client.post('sip-providers', provider_data)
    assert response['result'] is True, f"Failed to create sample SIP provider: {response.get('messages')}"

    provider_id = response['data']['id']
    print(f"\n✓ Created sample SIP provider: {provider_id}")

    yield provider_id

    # Cleanup
    try:
        api_client.delete(f'sip-providers/{provider_id}')
        print(f"✓ Cleaned up sample SIP provider: {provider_id}")
    except Exception as e:
        print(f"⚠️  Failed to cleanup SIP provider {provider_id}: {e}")


@pytest.fixture(scope='function')
def sample_iax_provider(api_client, provider_iax_fixtures):
    """
    Create a sample IAX provider for testing GET by ID operations

    Yields:
        str: The ID of the created IAX provider
    """
    # Get first IAX provider from fixtures
    fixture_key = list(provider_iax_fixtures.keys())[0]
    provider_data = provider_iax_fixtures[fixture_key].copy()

    # Convert fixture format: password -> secret
    if 'password' in provider_data and 'secret' not in provider_data:
        provider_data['secret'] = provider_data.pop('password')

    # Create the provider
    response = api_client.post('iax-providers', provider_data)
    assert response['result'] is True, f"Failed to create sample IAX provider: {response.get('messages')}"

    provider_id = response['data']['id']
    print(f"\n✓ Created sample IAX provider: {provider_id}")

    yield provider_id

    # Cleanup
    try:
        api_client.delete(f'iax-providers/{provider_id}')
        print(f"✓ Cleaned up sample IAX provider: {provider_id}")
    except Exception as e:
        print(f"⚠️  Failed to cleanup IAX provider {provider_id}: {e}")


@pytest.fixture(scope='function')
def sample_incoming_route(api_client, incoming_route_fixtures):
    """
    Create a sample incoming route for testing GET by ID operations

    Yields:
        str: The ID of the created incoming route
    """
    # Get first incoming route from fixtures
    fixture_key = list(incoming_route_fixtures.keys())[0]
    route_data = incoming_route_fixtures[fixture_key].copy()

    # Create the route
    response = api_client.post('incoming-routes', route_data)
    assert response['result'] is True, f"Failed to create sample incoming route: {response.get('messages')}"

    route_id = response['data']['id']
    print(f"\n✓ Created sample incoming route: {route_id}")

    yield route_id

    # Cleanup
    try:
        api_client.delete(f'incoming-routes/{route_id}')
        print(f"✓ Cleaned up sample incoming route: {route_id}")
    except Exception as e:
        print(f"⚠️  Failed to cleanup incoming route {route_id}: {e}")


@pytest.fixture(scope='function')
def sample_outbound_route(api_client, outgoing_route_fixtures, sample_sip_provider):
    """
    Create a sample outbound route for testing GET by ID operations

    Outbound routes require a provider, so we use the sample_sip_provider fixture.

    WHY: Using fixture dependency instead of creating provider inline prevents
         race conditions and ensures proper cleanup order (route before provider).

    Args:
        sample_sip_provider: Fixture that creates a SIP provider (dependency)

    Yields:
        str: The ID of the created outbound route
    """
    # Use the provider created by sample_sip_provider fixture
    provider_id = sample_sip_provider

    # Get first outbound route from fixtures
    fixture_key = list(outgoing_route_fixtures.keys())[0]
    route_data = outgoing_route_fixtures[fixture_key].copy()

    # Update provider ID to the one from fixture
    route_data['providerid'] = provider_id

    # Create the route
    response = api_client.post('outbound-routes', route_data)
    assert response['result'] is True, f"Failed to create sample outbound route: {response.get('messages')}"

    route_id = response['data']['id']
    print(f"\n✓ Created sample outbound route: {route_id} (using provider {provider_id})")

    yield route_id

    # Cleanup (provider will be cleaned up by sample_sip_provider fixture)
    try:
        api_client.delete(f'outbound-routes/{route_id}')
        print(f"✓ Cleaned up sample outbound route: {route_id}")
    except Exception as e:
        print(f"⚠️  Failed to cleanup outbound route {route_id}: {e}")


@pytest.fixture(scope='function')
def sample_conference_room(api_client, conference_room_fixtures):
    """
    Create a sample conference room for testing GET by ID operations

    Yields:
        str: The ID of the created conference room
    """
    # Get first conference room from fixtures
    fixture_key = list(conference_room_fixtures.keys())[0]
    room_data = conference_room_fixtures[fixture_key].copy()

    # Create the conference room
    response = api_client.post('conference-rooms', room_data)
    assert response['result'] is True, f"Failed to create sample conference room: {response.get('messages')}"

    room_id = response['data']['id']
    print(f"\n✓ Created sample conference room: {room_id}")

    yield room_id

    # Cleanup
    try:
        api_client.delete(f'conference-rooms/{room_id}')
        print(f"✓ Cleaned up sample conference room: {room_id}")
    except Exception as e:
        print(f"⚠️  Failed to cleanup conference room {room_id}: {e}")


@pytest.fixture(scope='function')
def sample_call_queue(api_client, call_queue_fixtures):
    """
    Create a sample call queue for testing GET by ID operations

    Yields:
        str: The ID of the created call queue
    """
    # Get first call queue from fixtures
    fixture_key = list(call_queue_fixtures.keys())[0]
    queue_data = call_queue_fixtures[fixture_key].copy()

    # Convert fixture format to API format if needed
    queue_data = convert_call_queue_fixture_to_api_format(queue_data)

    # Create the call queue
    response = api_client.post('call-queues', queue_data)
    assert response['result'] is True, f"Failed to create sample call queue: {response.get('messages')}"

    queue_id = response['data']['id']
    print(f"\n✓ Created sample call queue: {queue_id}")

    yield queue_id

    # Cleanup
    try:
        api_client.delete(f'call-queues/{queue_id}')
        print(f"✓ Cleaned up sample call queue: {queue_id}")
    except Exception as e:
        print(f"⚠️  Failed to cleanup call queue {queue_id}: {e}")


@pytest.fixture(scope='function')
def sample_ivr_menu(api_client, ivr_menu_fixtures):
    """
    Create a sample IVR menu for testing GET by ID operations

    Yields:
        str: The ID of the created IVR menu
    """
    # Get first IVR menu from fixtures
    fixture_key = list(ivr_menu_fixtures.keys())[0]
    ivr_data = ivr_menu_fixtures[fixture_key].copy()

    # Add required extension field if missing (IVR menus need an extension number)
    if 'extension' not in ivr_data:
        ivr_data['extension'] = '4000'  # Use extension 4000 for test IVR menu

    # Create the IVR menu
    response = api_client.post('ivr-menu', ivr_data)
    assert response['result'] is True, f"Failed to create sample IVR menu: {response.get('messages')}"

    ivr_id = response['data']['id']
    print(f"\n✓ Created sample IVR menu: {ivr_id}")

    yield ivr_id

    # Cleanup
    try:
        api_client.delete(f'ivr-menu/{ivr_id}')
        print(f"✓ Cleaned up sample IVR menu: {ivr_id}")
    except Exception as e:
        print(f"⚠️  Failed to cleanup IVR menu {ivr_id}: {e}")


@pytest.fixture(scope='function')
def test_sound_file(tmp_path):
    """
    Generate a test WAV file for upload testing

    Creates a minimal valid WAV file (1 second of silence, 8kHz mono)
    suitable for testing sound file upload functionality.

    Yields:
        Path: Absolute path to the generated WAV file

    Usage:
        def test_upload_sound(api_client, test_sound_file):
            response = api_client.upload_file(
                'sound-files:uploadFile',
                str(test_sound_file)
            )
    """
    import wave
    import struct

    # Create test WAV file path
    file_path = tmp_path / "test_predefined_id.wav"

    # WAV file parameters
    sample_rate = 8000  # 8kHz (standard for telephony)
    duration = 1  # 1 second
    num_channels = 1  # Mono
    sample_width = 2  # 16-bit
    num_frames = sample_rate * duration

    # Create WAV file
    with wave.open(str(file_path), 'wb') as wav_file:
        wav_file.setnchannels(num_channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)

        # Generate 1 second of silence (all zeros)
        for _ in range(num_frames):
            # Write 16-bit signed integer (little-endian)
            wav_file.writeframes(struct.pack('<h', 0))

    print(f"\n✓ Generated test WAV file: {file_path} ({file_path.stat().st_size} bytes)")

    yield file_path

    # Cleanup is automatic via tmp_path (pytest temp directory)


@pytest.fixture(scope='function')
def test_uploaded_file(api_client):
    """
    Create and upload a test file for Files API testing

    WHY: Provides isolated test file for GET/DELETE operations.
         Each test gets a fresh file to avoid shared state issues.

    Yields:
        str: The path to the uploaded file on the server (WITHOUT leading slash)
             Use as: api_client.get(f'files/{test_uploaded_file}')

    Usage:
        def test_get_file(api_client, test_uploaded_file):
            response = api_client.get(f'files/{test_uploaded_file}')
    """
    # Use temp path that should be writable on server
    # WHY: Remove leading slash to avoid double slashes in URL (files//tmp)
    file_path = 'tmp/mikopbx_test_file.txt'
    file_content = "Test file content for MikoPBX Files API\nLine 2\nLine 3"

    # Upload file content via PUT
    upload_data = {
        'filename': f'/{file_path}',  # API expects full path with leading slash
        'content': file_content
    }

    try:
        response = api_client.put(f'files/{file_path}', upload_data)
        assert response['result'] is True, f"Failed to upload test file: {response.get('messages')}"
        print(f"\n✓ Created test file for API testing: /{file_path}")

        yield file_path

    except Exception as e:
        # WHY: If upload fails (not implemented, path validation), skip dependent tests
        if '422' in str(e) or '501' in str(e) or '404' in str(e):
            print(f"\n⚠ File upload not available, skipping dependent tests")
            pytest.skip(f"File upload not available: {e}")
        raise

    finally:
        # Cleanup: try to delete the file
        try:
            api_client.delete(f'files/{file_path}')
            print(f"✓ Cleaned up test file: /{file_path}")
        except Exception as cleanup_error:
            # Cleanup failures are non-critical
            print(f"⚠️ Failed to cleanup test file /{file_path}: {cleanup_error}")


# ============================================================================
# CDR Database Seeding
# ============================================================================

# ============================================================================
# CDR Database Seeding - MOVED TO test_00a_cdr_seed.py
# ============================================================================
#
# CDR seeding is now implemented as a regular test (test_00a_cdr_seed.py)
# that runs EARLY before all CDR tests. This ensures:
# 1. Database lock is released before other tests run
# 2. Clear test execution order via file naming (test_00a runs after test_00 but before test_01)
# 3. Explicit dependency chain (instead of autouse fixture)
# 4. Better debugging and error reporting
#
# Test execution order:
#   1. test_00_setup_clean_system.py (optional factory reset)
#   2. test_00a_cdr_seed.py (CDR data population)
#   3. test_01_auth.py and other regular tests
#   4. test_43_cdr*.py (CDR-specific tests using seeded data)
#
# The cdr_test_ids fixture is now provided by test_00a_cdr_seed.py
#
# See: test_00a_cdr_seed.py for CDR seeding implementation
# ============================================================================
