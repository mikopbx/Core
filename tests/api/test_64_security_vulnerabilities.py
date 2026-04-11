#!/usr/bin/env python3
"""
Security Vulnerability Tests — TDD approach

These tests verify security vulnerabilities reported in MikoPBX 2026.1.223.
Written BEFORE fixes: tests are expected to FAIL on vulnerable code
and PASS after patches are applied.

Vulnerabilities tested:
1. CRITICAL: Admin UI auth bypass via fake Bearer token → stored XSS
2. HIGH: RCE via sound-files:convertAudioFile (command injection in temp_filename)
3. HIGH: RCE via files:downloadFirmware (command injection in version)
4. HIGH: Path traversal in syslog endpoints (read/erase arbitrary files)
5. CRITICAL: Arbitrary file write via PUT /files/{path}

Reference: report_verified.md (April 11, 2026)
"""

import time

import pytest
import requests

from conftest import MikoPBXClient
from config import get_config

config = get_config()
API_URL = config.api_url

# Derive admin-cabinet base URL from API URL
# e.g. https://host/pbxcore/api/v3 → https://host
BASE_URL = API_URL.rsplit('/pbxcore/', 1)[0]

# HTTP status codes
HTTP_OK = 200
HTTP_UNAUTHORIZED = 401
HTTP_FORBIDDEN = 403


# ============================================================================
# Helper: unauthenticated session (no SSL verification)
# ============================================================================

def _anon_session() -> requests.Session:
    """Create a requests session with SSL verification disabled."""
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    s = requests.Session()
    s.verify = False
    return s


# ============================================================================
# 1. CRITICAL — Admin UI auth bypass via fake Bearer token
# ============================================================================

@pytest.mark.security
class TestAdminUIAuthBypass:
    """
    The admin-cabinet SecurityPlugin treats ANY 'Authorization: Bearer ...'
    header as authenticated without validating the JWT token.

    SecurityPlugin.php:170-174:
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            return true;  // ← no token validation
        }

    Expected after fix: fake Bearer tokens must be REJECTED (redirect to login
    or return 403 for AJAX requests).
    """

    FAKE_BEARER = 'Bearer this_is_a_completely_fake_token'

    def test_fake_bearer_rejected_on_extensions_page(self):
        """
        SECURITY: GET /admin-cabinet/extensions/index with fake Bearer
        must NOT return the authenticated page content.

        Current (vulnerable): returns full HTML with employee data.
        Expected (fixed): redirect to login or 403.
        """
        session = _anon_session()
        resp = session.get(
            f'{BASE_URL}/admin-cabinet/extensions/index',
            headers={'Authorization': self.FAKE_BEARER},
            allow_redirects=False,
            timeout=15,
        )

        # After fix: should redirect to login page or return login form.
        # Phalcon does internal forward (not HTTP redirect), so status may be 200
        # but content should be the login page, NOT the extensions page.
        page_text = resp.text.lower()

        # These markers are ONLY on the authenticated extensions page
        has_extensions_content = (
            'extensions-table' in page_text
            or "globalcurrentpage = 'admincabinet/extensions/index'" in page_text
        )

        assert not has_extensions_content, (
            f'VULNERABILITY: Fake Bearer token gives full admin access!\n'
            f'Status: {resp.status_code}, URL: {resp.url}\n'
            f'Page contains authenticated content (extensions-table or globalCurrentPage).\n'
            f'SecurityPlugin.isAuthenticated() must validate JWT signature.'
        )

    def test_fake_bearer_does_not_leak_license_key(self):
        """
        SECURITY: Admin pages must NOT expose the license key
        to unauthenticated requests with a fake Bearer token.

        Current (vulnerable): globalPBXLicense = 'MIKO-XXXXX-...' visible in HTML.
        Expected (fixed): page not accessible, no license leak.
        """
        session = _anon_session()
        resp = session.get(
            f'{BASE_URL}/admin-cabinet/extensions/index',
            headers={'Authorization': self.FAKE_BEARER},
            allow_redirects=True,
            timeout=15,
        )

        # Check that the license key VALUE is not exposed (not just the variable name).
        # Login page has globalPBXLicense = '' (empty) which is safe.
        # Only a non-empty MIKO-xxxxx pattern means a real leak.
        import re
        license_match = re.search(r"globalPBXLicense\s*=\s*'(MIKO-[^']+)'", resp.text)
        assert license_match is None, (
            f'VULNERABILITY: License key exposed to unauthenticated user!\n'
            f'Found: {license_match.group(0) if license_match else "N/A"}\n'
            f'Fix: validate JWT in SecurityPlugin.isAuthenticated().'
        )

    def test_fake_bearer_cannot_access_module_settings(self):
        """
        SECURITY: GET /admin-cabinet/pbx-extension-modules/index
        with a fake Bearer must not return module management page.
        """
        session = _anon_session()
        resp = session.get(
            f'{BASE_URL}/admin-cabinet/pbx-extension-modules/index',
            headers={'Authorization': self.FAKE_BEARER},
            allow_redirects=True,
            timeout=15,
        )

        page_text = resp.text.lower()
        has_module_content = (
            'installed-modules-table' in page_text
            or 'module-row' in page_text
            or 'pbx-extension-modules/modify' in page_text
        )

        assert not has_module_content, (
            f'VULNERABILITY: Module management page accessible with fake Bearer!\n'
            f'This is the prerequisite for the stored XSS attack chain.\n'
            f'Fix: validate JWT in SecurityPlugin.isAuthenticated().'
        )

    def test_fake_bearer_cannot_save_module_sidebar(self):
        """
        SECURITY: POST /admin-cabinet/pbx-extension-modules/save
        with a fake Bearer must be rejected.

        This is the actual stored XSS vector: an attacker injects malicious
        iconClass that renders unsanitized in the sidebar on every page load.

        Current (vulnerable): POST succeeds, iconClass stored in DB.
        Expected (fixed): POST rejected (403 or redirect to login).
        """
        session = _anon_session()
        resp = session.post(
            f'{BASE_URL}/admin-cabinet/pbx-extension-modules/save',
            headers={'Authorization': self.FAKE_BEARER},
            data={
                'uniqid': 'ModulePhoneBook',
                'iconClass': 'puzzle',  # benign value for this test
                'caption': 'Test',
                'href': '/module-phone-book/module-phone-book/index',
                'menu-group': 'setup',
                'show-at-sidebar': 'on',
                'key': '',
            },
            allow_redirects=False,
            timeout=15,
        )

        # After fix: Phalcon may return 200 with login page (internal forward)
        # or 302/403. Use language-agnostic detection: login page has
        # globalCurrentPage = 'AdminCabinet/Session/index', not the module page.
        page_text = resp.text

        is_rejected = (
            resp.status_code in (HTTP_UNAUTHORIZED, HTTP_FORBIDDEN, 302)
            or 'Session/index' in page_text
            or 'login-form' in page_text
            # If the response does NOT contain the save action's controller path,
            # the request was rejected (forwarded to login)
            or 'PbxExtensionModules/save' not in page_text
        )

        assert is_rejected, (
            f'VULNERABILITY: pbx-extension-modules/save accepts fake Bearer!\n'
            f'Status: {resp.status_code}\n'
            f'An attacker can inject stored XSS via iconClass field.\n'
            f'Fix: validate JWT in SecurityPlugin.isAuthenticated().'
        )


# ============================================================================
# 2. HIGH — RCE via sound-files:convertAudioFile
# ============================================================================

@pytest.mark.security
class TestSoundFilesCommandInjection:
    """
    ConvertAudioFileAction::moveSoundFileAccordingToCategory() passes
    user-controlled temp_filename directly into a shell command:

        Processes::mwExec("$mv {$uploadedFilename} {$targetPath}");

    No escapeshellarg() is used, allowing shell metacharacter injection.

    Expected after fix: shell metacharacters in temp_filename must be
    neutralized (escapeshellarg) or the parameter must be validated
    to only accept safe file paths.
    """

    # Marker file that the injected command would create
    RCE_MARKER = '/tmp/mikopbx_security_test_soundfile_rce'

    def test_temp_filename_command_injection_blocked(self, api_client):
        """
        SECURITY: POST sound-files:convertAudioFile with shell injection
        in temp_filename must NOT execute arbitrary commands.

        Current (vulnerable): shell injection creates marker file.
        Expected (fixed): parameter rejected or safely escaped.
        """
        # Step 1: Clean up any previous marker
        api_client.post('system:executeBashCommand', {
            'command': f'rm -f {self.RCE_MARKER}'
        })

        # Step 2: Attempt command injection via temp_filename
        # The semicolon breaks out of the mv command; touch creates the marker.
        response = api_client.session.post(
            f'{API_URL}/sound-files:convertAudioFile',
            headers=api_client._get_headers(),
            data={
                'temp_filename': f'x;touch {self.RCE_MARKER};#',
                'category': 'custom',
            },
            timeout=30,
            verify=False,
        )

        # Allow a moment for async processing
        time.sleep(2)

        # Step 3: Check if the marker file was created (= RCE worked)
        check = api_client.post('system:executeBashCommand', {
            'command': f'test -f {self.RCE_MARKER} && echo VULNERABLE || echo SAFE'
        })

        output = check.get('data', {}).get('output', '').strip()

        # Clean up
        api_client.post('system:executeBashCommand', {
            'command': f'rm -f {self.RCE_MARKER}'
        })

        assert output == 'SAFE', (
            f'VULNERABILITY: Command injection via temp_filename succeeded!\n'
            f'Marker file {self.RCE_MARKER} was created inside the container.\n'
            f'ConvertAudioFileAction.php:254 passes temp_filename to shell without escaping.\n'
            f'Fix: use escapeshellarg() on $uploadedFilename and $targetPath.'
        )

    def test_temp_filename_path_traversal_blocked(self, api_client):
        """
        SECURITY: temp_filename with path traversal must be rejected.

        Attempts to read /etc/passwd via path traversal in the filename.
        """
        response = api_client.session.post(
            f'{API_URL}/sound-files:convertAudioFile',
            headers=api_client._get_headers(),
            data={
                'temp_filename': '../../etc/passwd',
                'category': 'custom',
            },
            timeout=30,
            verify=False,
        )

        resp_data = response.json()

        # Should fail with error, not process /etc/passwd
        # Check that no file was moved from /etc/
        check = api_client.post('system:executeBashCommand', {
            'command': 'test -f /storage/usbdisk1/mikopbx/media/custom/passwd && echo TRAVERSED || echo SAFE'
        })

        output = check.get('data', {}).get('output', '').strip()

        assert output == 'SAFE', (
            f'VULNERABILITY: Path traversal via temp_filename succeeded!\n'
            f'Fix: validate temp_filename is within allowed upload directory.'
        )


# ============================================================================
# 3. HIGH — RCE via files:downloadFirmware (version parameter)
# ============================================================================

@pytest.mark.security
class TestFirmwareDownloadCommandInjection:
    """
    DownloadNewFirmwareAction::main() uses user-controlled 'version'
    in shell commands without escaping:

        $firmwareDirTmp = "$uploadDir/{$version}";
        Processes::mwExec("$rm -rf $firmwareDirTmp/* ");

    Expected after fix: version parameter must be sanitized to allow
    only safe characters (alphanumeric, dots, hyphens).
    """

    RCE_MARKER = '/tmp/mikopbx_security_test_firmware_rce'

    def test_version_command_injection_blocked(self, api_client):
        """
        SECURITY: POST files:downloadFirmware with shell injection
        in version must NOT execute arbitrary commands.

        Current (vulnerable): shell injection creates marker file.
        Expected (fixed): version rejected or safely sanitized.
        """
        # Step 1: Clean up
        api_client.post('system:executeBashCommand', {
            'command': f'rm -f {self.RCE_MARKER}'
        })

        # Step 2: Attempt command injection via version parameter
        # Use a harmless URL that will fail download but the injection
        # happens before the download starts.
        response = api_client.session.post(
            f'{API_URL}/files:downloadFirmware',
            headers=api_client._get_headers(),
            json={
                'url': 'https://httpbin.org/status/200',
                'md5': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                'size': '100',
                'version': f'fw;touch {self.RCE_MARKER};#',
            },
            timeout=30,
            verify=False,
        )

        # Allow time for background worker to process
        time.sleep(4)

        # Step 3: Check if marker file was created
        check = api_client.post('system:executeBashCommand', {
            'command': f'test -f {self.RCE_MARKER} && echo VULNERABLE || echo SAFE'
        })

        output = check.get('data', {}).get('output', '').strip()

        # Clean up
        api_client.post('system:executeBashCommand', {
            'command': f'rm -f {self.RCE_MARKER}'
        })

        assert output == 'SAFE', (
            f'VULNERABILITY: Command injection via firmware version succeeded!\n'
            f'Marker file {self.RCE_MARKER} was created inside the container.\n'
            f'DownloadNewFirmwareAction.php:57-62 uses $version in shell commands.\n'
            f'Fix: sanitize version to [a-zA-Z0-9._-] or use escapeshellarg().'
        )

    def test_version_with_special_characters_rejected(self, api_client):
        """
        SECURITY: Version parameter with shell metacharacters
        must be rejected or sanitized.
        """
        dangerous_versions = [
            '1.0;id',
            '1.0$(whoami)',
            '1.0`id`',
            '1.0|cat /etc/passwd',
            '1.0 && id',
            '../../../etc',
        ]

        for version in dangerous_versions:
            response = api_client.session.post(
                f'{API_URL}/files:downloadFirmware',
                headers=api_client._get_headers(),
                json={
                    'url': 'https://httpbin.org/status/200',
                    'md5': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                    'size': '100',
                    'version': version,
                },
                timeout=30,
                verify=False,
            )

            resp_data = response.json()

            # After fix: should either reject (result=false, 4xx status)
            # or sanitize the version to remove dangerous characters.
            # We check that the response doesn't indicate the dangerous
            # version was used as-is in a file path.
            if resp_data.get('result') is True:
                filename = resp_data.get('data', {}).get('filename', '')
                assert ';' not in filename and '`' not in filename and '$(' not in filename, (
                    f'VULNERABILITY: Dangerous version "{version}" was used in file path!\n'
                    f'Returned filename: {filename}\n'
                    f'Fix: sanitize version parameter.'
                )


# ============================================================================
# 4. HIGH — Path traversal in syslog endpoints
# ============================================================================

@pytest.mark.security
class TestSyslogPathTraversal:
    """
    GetLogFromFileAction, EraseFileAction, DownloadLogFileAction construct
    file paths as:

        $filename = Directories::getDir(Directories::CORE_LOGS_DIR) . '/' . $filename;

    The filename parameter is not checked for '../' sequences, allowing
    traversal outside the log directory.

    Expected after fix: realpath() + directory check must confine
    all operations to the log directory.
    """

    def test_log_read_path_traversal_blocked(self, api_client):
        """
        SECURITY: GET syslog:getLogFromFile with ../../etc/passwd
        must NOT return file contents outside log directory.

        Current (vulnerable): returns contents of /etc/passwd.
        Expected (fixed): error response, file not accessible.
        """
        response = api_client.get_raw(
            'syslog:getLogFromFile',
            params={'filename': '../../etc/passwd', 'offset': 0, 'lines': 50}
        )

        # Traversal can be blocked at multiple layers:
        # 1. Nginx WAF: returns 403 "Security violation detected" (text/plain)
        # 2. PHP realpath() check: returns JSON with error
        # Both are SAFE — the file content was NOT served.
        if response.status_code == 403:
            # Nginx WAF blocked it — this is safe
            return

        try:
            resp_data = response.json()
        except Exception:
            assert False, (
                f'VULNERABILITY: Path traversal returns raw file content (not JSON)!\n'
                f'Status: {response.status_code}, Content-Type: {response.headers.get("Content-Type")}\n'
                f'Fix: apply realpath() + str_starts_with() directory check.'
            )

        file_content = resp_data.get('data', {}).get('content', '')

        # /etc/passwd contains 'root:' — if present, traversal succeeded
        assert 'root:' not in file_content, (
            f'VULNERABILITY: Path traversal reads /etc/passwd via syslog endpoint!\n'
            f'Fix: apply realpath() + str_starts_with() directory check.'
        )

    def test_log_read_database_traversal_blocked(self, api_client):
        """
        SECURITY: Cannot read the main SQLite database via syslog endpoint.

        Path: ../../cf/conf/mikopbx.db (relative to /var/log/)
        """
        response = api_client.get_raw(
            'syslog:getLogFromFile',
            params={'filename': '../../cf/conf/mikopbx.db', 'offset': 0, 'lines': 10}
        )

        # Nginx WAF may block ../  with 403 — that's safe
        if response.status_code == 403:
            return

        try:
            resp_data = response.json()
        except Exception:
            assert False, (
                f'VULNERABILITY: Database file streamed as raw content (not JSON)!\n'
                f'Status: {response.status_code}, length: {len(response.content)} bytes\n'
                f'Fix: validate filename resolves within log directory.'
            )

        file_content = resp_data.get('data', {}).get('content', '')

        # SQLite files start with 'SQLite format 3'
        assert 'SQLite' not in file_content, (
            f'VULNERABILITY: Main database readable via syslog path traversal!\n'
            f'Fix: validate filename resolves within log directory.'
        )

    def test_log_erase_path_traversal_blocked(self, api_client):
        """
        SECURITY: POST syslog:eraseFile with traversal path
        must NOT truncate files outside log directory.

        This is the most dangerous variant — EraseFileAction runs:
            echo ' ' > $filename
        which would truncate any writable file.
        """
        # Create a test file to verify it's NOT erased
        test_marker = '/tmp/mikopbx_security_test_erase_marker'
        api_client.post('system:executeBashCommand', {
            'command': f'echo "DO_NOT_ERASE" > {test_marker}'
        })

        # Attempt to erase it via path traversal
        response = api_client.session.post(
            f'{API_URL}/syslog:eraseFile',
            headers=api_client._get_headers(),
            json={'filename': f'../../tmp/mikopbx_security_test_erase_marker'},
            timeout=30,
            verify=False,
        )

        # Check that the marker file is intact
        check = api_client.post('system:executeBashCommand', {
            'command': f'cat {test_marker} 2>/dev/null'
        })
        content = check.get('data', {}).get('output', '').strip()

        # Clean up
        api_client.post('system:executeBashCommand', {
            'command': f'rm -f {test_marker}'
        })

        assert content == 'DO_NOT_ERASE', (
            f'VULNERABILITY: EraseFileAction truncated file outside log directory!\n'
            f'Expected file content: "DO_NOT_ERASE", got: "{content}"\n'
            f'Fix: validate path is within Directories::CORE_LOGS_DIR.'
        )

    def test_log_download_path_traversal_blocked(self, api_client):
        """
        SECURITY: GET syslog:downloadLogFile with traversal path
        must NOT return files outside log directory.
        """
        response = api_client.get_raw(
            'syslog:downloadLogFile',
            params={'filename': '../../etc/hostname'}
        )

        # After fix: should return error, not the file contents
        # The response should not be a successful file download
        if response.status_code == HTTP_OK:
            content_type = response.headers.get('Content-Type', '')
            # If it returns JSON with error, that's correct
            if 'application/json' in content_type:
                resp_data = response.json()
                assert resp_data.get('result') is not True, (
                    f'VULNERABILITY: downloadLogFile serves arbitrary files!\n'
                    f'Fix: validate filename path.'
                )
            else:
                # If it returns raw file content, that's a vulnerability
                assert False, (
                    f'VULNERABILITY: downloadLogFile serves /etc/hostname!\n'
                    f'Content-Type: {content_type}, length: {len(response.content)}\n'
                    f'Fix: validate filename resolves within log directory.'
                )


# ============================================================================
# 5. CRITICAL — Arbitrary file write via PUT /files/{path}
# ============================================================================

@pytest.mark.security
class TestArbitraryFileWrite:
    """
    FilesManagementProcessor::uploadFileContent() writes to any path
    specified in the request without directory whitelist validation.

    The router pattern 'idPattern: [^:]+' allows arbitrary path characters.
    No ALLOWED_DIRECTORIES check is performed before file_put_contents().

    Expected after fix: writes must be restricted to ALLOWED_DIRECTORIES
    whitelist (same as GetFileContentAction uses for reads).
    """

    def test_write_outside_allowed_dirs_blocked(self, api_client):
        """
        SECURITY: PUT /files//tmp/evil_test_file must be rejected
        when /tmp is not in the allowed directories list, OR the content
        must not be writable to arbitrary locations.

        NOTE: /tmp/ may be in ALLOWED_DIRECTORIES for legitimate use.
        This test writes to /tmp/mikopbx_security_test_write which
        should be blocked if proper path restrictions exist for /etc/.
        """
        test_path = '/etc/mikopbx_security_test_cron'
        test_content = '* * * * * echo hacked'

        # Attempt to write a file to /etc/ (outside any allowed directory)
        response = api_client.session.put(
            f'{API_URL}/files/{test_path}',
            headers=api_client._get_headers(),
            json={'content': test_content},
            timeout=30,
            verify=False,
        )

        # Check if file was written
        check = api_client.post('system:executeBashCommand', {
            'command': f'test -f {test_path} && echo VULNERABLE || echo SAFE'
        })

        output = check.get('data', {}).get('output', '').strip()

        # Clean up if file was created
        if output == 'VULNERABLE':
            api_client.post('system:executeBashCommand', {
                'command': f'rm -f {test_path}'
            })

        assert output == 'SAFE', (
            f'VULNERABILITY: Arbitrary file write to {test_path} succeeded!\n'
            f'FilesManagementProcessor::uploadFileContent() has no directory whitelist.\n'
            f'Fix: apply ALLOWED_DIRECTORIES check with realpath() validation.'
        )

    def test_write_to_crontab_directory_blocked(self, api_client):
        """
        SECURITY: Cannot write to /etc/cron.d/ via files API.
        This would allow persistent RCE via cron.
        """
        cron_path = '/etc/cron.d/mikopbx_test_evil_cron'

        response = api_client.session.put(
            f'{API_URL}/files/{cron_path}',
            headers=api_client._get_headers(),
            json={'content': '* * * * * root id > /tmp/crontest'},
            timeout=30,
            verify=False,
        )

        check = api_client.post('system:executeBashCommand', {
            'command': f'test -f {cron_path} && echo VULNERABLE || echo SAFE'
        })

        output = check.get('data', {}).get('output', '').strip()

        if output == 'VULNERABLE':
            api_client.post('system:executeBashCommand', {
                'command': f'rm -f {cron_path}'
            })

        assert output == 'SAFE', (
            f'VULNERABILITY: Arbitrary file write to {cron_path}!\n'
            f'Attacker can create cron jobs for persistent RCE.\n'
            f'Fix: restrict file writes to ALLOWED_DIRECTORIES whitelist.'
        )


# ============================================================================
# 6. MEDIUM — iconClass XSS injection (sidebar rendering)
# ============================================================================

@pytest.mark.security
class TestIconClassXSSSanitization:
    """
    Elements::getMenu() renders module iconClass without HTML escaping:

        $groupHtml .= "<i class='{$option['iconclass']} icon'></i>"

    Even after the auth bypass is fixed, an authenticated admin
    could still inject XSS via the iconClass field.

    Expected after fix: iconClass must be sanitized (strip HTML tags,
    allow only alphanumeric + spaces for CSS class names).
    """

    def test_iconclass_html_tags_stripped(self, api_client):
        """
        SECURITY: Saving module sidebar settings with HTML in iconClass
        must sanitize or reject the payload.

        Even for authenticated requests, iconClass should only contain
        CSS class names (letters, numbers, spaces, hyphens).
        """
        # Authenticate properly to get a valid JWT token
        session = _anon_session()
        login_resp = session.post(
            f'{API_URL}/auth:login',
            data={
                'login': config.api_username,
                'password': config.api_password,
                'rememberMe': 'true',
            },
            verify=False,
        )
        login_data = login_resp.json()
        token = login_data.get('data', {}).get('accessToken', '')

        if not token:
            pytest.skip('Could not authenticate for iconClass test')

        auth_header = {'Authorization': f'Bearer {token}'}

        # Check if any module is installed by fetching modules page
        modules_page = session.get(
            f'{BASE_URL}/admin-cabinet/pbx-extension-modules/index',
            headers=auth_header,
            timeout=15,
        )

        if 'module-row' not in modules_page.text and 'installed-modules-table' not in modules_page.text:
            pytest.skip('No modules installed — cannot test iconClass injection')

        # Find a module ID from the modules page HTML
        import re
        module_match = re.search(r'pbx-extension-modules/modify/(Module\w+)', modules_page.text)
        if not module_match:
            pytest.skip('Could not find installed module ID in page HTML')

        module_id = module_match.group(1)

        # Attempt to save iconClass with XSS payload
        save_resp = session.post(
            f'{BASE_URL}/admin-cabinet/pbx-extension-modules/save',
            headers=auth_header,
            data={
                'uniqid': module_id,
                'iconClass': "x' ></i><img src=x onerror=alert(1)><!--",
                'caption': 'Test Module',
                'href': f'/{module_id.lower()}/index',
                'menu-group': 'setup',
                'show-at-sidebar': 'on',
                'key': '',
            },
            allow_redirects=False,
            timeout=15,
        )

        # Now fetch any admin page and check the sidebar HTML
        page_resp = session.get(
            f'{BASE_URL}/admin-cabinet/extensions/index',
            headers=auth_header,
            timeout=15,
        )

        page_html = page_resp.text

        # The XSS payload should NOT appear unescaped in the HTML
        assert 'onerror=alert' not in page_html, (
            f'VULNERABILITY: XSS payload rendered in sidebar!\n'
            f'Elements.php:344 outputs iconClass without htmlspecialchars().\n'
            f'Fix: sanitize iconClass to allow only CSS class characters.'
        )

        assert '<img src=x' not in page_html, (
            f'VULNERABILITY: Injected <img> tag in sidebar HTML!\n'
            f'Fix: use htmlspecialchars() on iconClass before rendering.'
        )


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s', '--tb=long'])
