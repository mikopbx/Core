#!/usr/bin/env python3
"""
Provider secret handling on partial updates (issue #1347).

PATCH with `secret` but without the optional `registration_type` used to fail with
"Undefined array key registration_type". The suite covers SIP and IAX:
- a password-only PATCH succeeds and keeps every other field (including note);
- the masked secret returned by GET keeps the stored password, also when the same
  request switches the provider away from outbound registration;
- a PATCH that would leave an outbound provider without password or host is rejected.

GET masks the secret of outbound providers only, so the stored password is read back
by switching the provider to registration_type=none first.
"""

import time

import pytest

from conftest import assert_api_success

MASK = 'XXXXXXXX'
ORIGINAL_SECRET = 'OrigSecret1347'

PROVIDER_KINDS = [
    pytest.param(('sip-providers', 5060), id='SIP'),
    pytest.param(('iax-providers', 4569), id='IAX'),
]


@pytest.fixture(params=PROVIDER_KINDS)
def outbound_provider(request, api_client):
    """Create an outbound provider with a known password; yield (resource, id)."""
    resource, port = request.param
    suffix = f"{int(time.time() * 1000) % 100000000}"
    payload = {
        'description': f'Test 1347 {suffix}',
        'note': 'note-must-survive',
        'host': 'patch-1347.example.com',
        'port': port,
        'username': f'u1347{suffix}',
        'secret': ORIGINAL_SECRET,
        'registration_type': 'outbound',
    }
    response = api_client.post(resource, payload)
    assert_api_success(response, f'Failed to create {resource} provider')
    provider_id = response['data']['id']

    yield resource, provider_id, payload

    try:
        api_client.delete(f'{resource}/{provider_id}')
    except Exception as e:  # cleanup must not mask the test result
        print(f'⚠️  Failed to clean up {resource}/{provider_id}: {e}')


def get_provider(api_client, resource, provider_id):
    response = api_client.get(f'{resource}/{provider_id}')
    assert_api_success(response, f'Failed to read {resource}/{provider_id}')
    return response['data']


def assert_rejected(response, what):
    """A business-rule rejection: result false with a validation error, not a 404."""
    assert response.get('result') is False, f'{what} was accepted'
    errors = (response.get('messages') or {}).get('error') or []
    assert errors, f'{what}: rejected without a validation error: {response}'
    assert not any('not found' in str(e).lower() for e in errors), f'{what}: {errors}'


def stored_secret(api_client, resource, provider_id):
    """Read the stored password: switch to registration_type=none, where GET does not mask it."""
    response = api_client.patch(f'{resource}/{provider_id}', {'registration_type': 'none'})
    assert_api_success(response, 'Failed to switch provider to registration_type=none')
    return get_provider(api_client, resource, provider_id)['secret']


class TestProviderSecretPatch:

    def test_01_patch_secret_without_registration_type(self, api_client, outbound_provider):
        resource, provider_id, created = outbound_provider

        response = api_client.patch(f'{resource}/{provider_id}', {'secret': 'NewSecret1347'})
        assert_api_success(response, 'PATCH with secret only failed')

        data = get_provider(api_client, resource, provider_id)
        assert data['registration_type'] == 'outbound'
        assert data['secret'] == MASK
        for field in ('description', 'note', 'host', 'username'):
            assert data[field] == created[field], f'{field} changed by password-only PATCH'

        assert stored_secret(api_client, resource, provider_id) == 'NewSecret1347'

    def test_02_patch_masked_secret_keeps_password(self, api_client, outbound_provider):
        resource, provider_id, _ = outbound_provider

        response = api_client.patch(f'{resource}/{provider_id}', {'secret': MASK})
        assert_api_success(response, 'PATCH with masked secret failed')

        assert stored_secret(api_client, resource, provider_id) == ORIGINAL_SECRET

    def test_03_masked_secret_with_switch_to_inbound(self, api_client, outbound_provider):
        resource, provider_id, _ = outbound_provider

        response = api_client.patch(
            f'{resource}/{provider_id}',
            {'registration_type': 'inbound', 'secret': MASK}
        )
        assert_api_success(response, 'PATCH outbound->inbound with masked secret failed')

        # Inbound secrets are not masked by GET
        data = get_provider(api_client, resource, provider_id)
        assert data['registration_type'] == 'inbound'
        assert data['secret'] == ORIGINAL_SECRET, 'mask was stored as the inbound password'

    def test_04_patch_empty_secret_rejected_for_outbound(self, api_client, outbound_provider):
        resource, provider_id, _ = outbound_provider

        response = api_client.patch(f'{resource}/{provider_id}', {'secret': ''}, allow_404=True)
        assert_rejected(response, 'empty password on an outbound provider')

        assert stored_secret(api_client, resource, provider_id) == ORIGINAL_SECRET

    def test_05_patch_empty_host_rejected_for_outbound(self, api_client, outbound_provider):
        resource, provider_id, created = outbound_provider

        response = api_client.patch(f'{resource}/{provider_id}', {'host': ''}, allow_404=True)
        assert_rejected(response, 'empty host on an outbound provider')

        assert get_provider(api_client, resource, provider_id)['host'] == created['host']

    def test_06_patch_without_note_keeps_note(self, api_client, outbound_provider):
        resource, provider_id, created = outbound_provider

        response = api_client.patch(f'{resource}/{provider_id}', {'description': 'Renamed 1347'})
        assert_api_success(response, 'PATCH of description failed')

        data = get_provider(api_client, resource, provider_id)
        assert data['description'] == 'Renamed 1347'
        assert data['note'] == created['note']

    def test_07_full_update_still_validated_and_saved(self, api_client, outbound_provider):
        resource, provider_id, created = outbound_provider

        # The provider is still outbound here: stored_secret() switches it to none
        response = api_client.put(f'{resource}/{provider_id}', dict(created, secret=''), allow_404=True)
        assert_rejected(response, 'PUT of an outbound provider without password')

        response = api_client.put(f'{resource}/{provider_id}', dict(created, secret='PutSecret1347'))
        assert_api_success(response, 'PUT with full payload failed')
        assert stored_secret(api_client, resource, provider_id) == 'PutSecret1347'

    def test_08_copy_of_outbound_provider_has_no_mask(self, api_client, outbound_provider):
        resource, provider_id, _ = outbound_provider

        response = api_client.get(f'{resource}/{provider_id}:copy')
        assert_api_success(response, 'Copy of outbound provider failed')
        # A copy is saved as a new record, where the mask would be stored literally
        assert response['data']['secret'] == '', 'copy returned the mask as the password'


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
