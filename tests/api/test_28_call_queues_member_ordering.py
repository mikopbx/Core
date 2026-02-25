#!/usr/bin/env python3
"""
Test suite for call queue member ordering after strategy change.

Reproduces the bug: switching from 'ringall' to 'linear' strategy while
adding/reordering members causes Asterisk to show incorrect member order.

Root cause: Asterisk's `queue reload all` has two limitations:
1. LINEAR strategy requires ao2_container_alloc_list (preserves order),
   other strategies use ao2_container_alloc_hash. Switching TO linear
   is rejected during reload.
2. Existing static members preserve their queuepos during reload,
   ignoring new config file order.

Fix: QueueConf::reload() uses two-step process (empty→reload→full→reload)
to destroy and recreate queues with correct container type and ordering.

See: https://community.asterisk.org/t/queue-order-on-queue-reload-all/93833
"""
import re
import time

import pytest
from conftest import (
    assert_api_success,
    execute_asterisk_command,
    convert_call_queue_fixture_to_api_format,
)


def strip_ansi(text: str) -> str:
    """Remove ANSI escape sequences from text."""
    return re.sub(r'\x1b\[[0-9;]*m', '', text)


def wait_for_queue_in_asterisk(
    api_client,
    queue_id: str,
    timeout: int = 15,
    expect_strategy: str | None = None,
    expect_members: list[str] | None = None,
) -> str:
    """
    Poll Asterisk until the queue appears with expected configuration or timeout expires.

    WorkerModelsEvents has a debounce before calling QueueConf::reload(),
    plus ~2 seconds for two 'queue reload all' calls. This function retries
    every second until the queue is visible with the expected state.

    The two-step reload temporarily destroys the queue (empty config → reload →
    full config → reload), so after an update the queue may briefly disappear
    or show stale config. We must poll until the NEW configuration appears.

    Args:
        api_client: Authenticated API client
        queue_id: Asterisk queue ID to wait for
        timeout: Maximum seconds to wait (default 15)
        expect_strategy: If set, keep polling until this strategy appears
            in Asterisk output (e.g. 'linear', 'ringall')
        expect_members: If set, keep polling until Asterisk shows exactly
            these members in this exact order

    Returns:
        Last Asterisk output (whether conditions were met or not)
    """
    deadline = time.time() + timeout
    output = ''
    while time.time() < deadline:
        output = execute_asterisk_command(api_client, f'queue show {queue_id}')

        # Queue must exist first
        if 'No such queue' in output:
            time.sleep(1)
            continue

        # Check optional strategy condition
        if expect_strategy and f"'{expect_strategy}'" not in output.lower():
            time.sleep(1)
            continue

        # Check optional members condition (exact order match)
        if expect_members is not None:
            members = parse_queue_members_from_asterisk(output)
            if members != expect_members:
                time.sleep(1)
                continue

        return output

    return output


def parse_queue_members_from_asterisk(output: str) -> list[str]:
    """
    Parse member extensions from `queue show <ID>` output.

    Asterisk output format (with hints):
        Members:
           203 (Local/203@internal/n from hint:203@internal-hints) (ringinuse disabled) ...
           202 (Local/202@internal/n from hint:202@internal-hints) (ringinuse disabled) ...

    Or without hints:
        Members:
           Local/201@internal/n (ringinuse disabled) (dynamic) (Not in use) has taken 0 calls ...

    Returns list of extension numbers in the order Asterisk reports them.
    """
    # Strip ANSI color codes first
    output = strip_ansi(output)

    members = []
    in_members_section = False

    for line in output.split('\n'):
        stripped = line.strip()

        if stripped.startswith('Members:'):
            in_members_section = True
            continue

        if in_members_section:
            if not stripped or 'No Members' in stripped or 'No Callers' in stripped or 'Callers:' in stripped:
                break

            # Match "Local/<ext>@" anywhere in the line
            match = re.search(r'Local/(\d+)@', stripped)
            if match:
                members.append(match.group(1))

    return members


class TestCallQueueMemberOrdering:
    """
    Tests for queue member ordering, especially after strategy changes.

    These tests verify the two-step reload fix in QueueConf::reload()
    that ensures correct member ordering when switching to linear strategy.
    """

    QUEUE_EXTENSION = '20099'
    QUEUE_NAME = 'Member Ordering Test Queue'
    MEMBERS_INITIAL = ['201', '202', '203']
    MEMBERS_REORDERED = ['203', '201', '202', '204']

    def test_01_create_queue_with_ringall_strategy(self, api_client):
        """
        Step 1: Create a queue with ringall strategy and 3 members.

        This sets up the initial state before the problematic strategy change.
        """
        queue_data = {
            'name': self.QUEUE_NAME,
            'extension': self.QUEUE_EXTENSION,
            'strategy': 'ringall',
            'seconds_to_ring_each_member': 20,
            'seconds_for_wrapup': 3,
            'recive_calls_while_on_a_call': False,
            'caller_hear': 'ringing',
            'announce_position': False,
            'announce_hold_time': False,
            'members': [{'extension': ext} for ext in self.MEMBERS_INITIAL],
        }

        response = api_client.post('call-queues', queue_data)
        assert_api_success(response, "Failed to create queue with ringall strategy")

        queue_id = response['data']['id']
        assert queue_id, "Queue ID should not be empty"

        # Store queue ID for subsequent tests
        self.__class__._queue_id = queue_id

        # Verify members in API response
        api_members = [m['extension'] for m in response['data']['members']]
        print(f"\n  Queue ID: {queue_id}")
        print(f"  Strategy: ringall")
        print(f"  API members: {api_members}")

        assert api_members == self.MEMBERS_INITIAL, (
            f"Initial members mismatch.\n"
            f"  Expected: {self.MEMBERS_INITIAL}\n"
            f"  Got:      {api_members}"
        )
        print(f"  OK: Members match expected order {self.MEMBERS_INITIAL}")

    def test_02_verify_initial_asterisk_queue(self, api_client):
        """
        Step 2: Verify Asterisk loaded the initial queue correctly.

        Check that `queue show <ID>` shows our members.
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        output = wait_for_queue_in_asterisk(api_client, queue_id)
        print(f"\n  Asterisk output:\n{output}")

        ast_members = parse_queue_members_from_asterisk(output)
        print(f"\n  Asterisk members: {ast_members}")

        # For ringall strategy, order doesn't matter functionally,
        # but we verify all members are present
        assert set(ast_members) == set(self.MEMBERS_INITIAL), (
            f"Asterisk members don't match expected set.\n"
            f"  Expected: {set(self.MEMBERS_INITIAL)}\n"
            f"  Got:      {set(ast_members)}"
        )

        # Verify strategy
        assert 'ringall' in output.lower(), (
            f"Expected strategy 'ringall' in Asterisk output"
        )
        print(f"  OK: All {len(ast_members)} members present, strategy is ringall")

    def test_03_switch_to_linear_with_new_member(self, api_client):
        """
        Step 3: Switch strategy to linear and add a new member at the end.

        THIS IS THE BUG SCENARIO:
        - Change from ringall → linear
        - Add new member 204 at the end of the list
        - Expected order: [201, 202, 203, 204]
        - Bug behavior: 204 appears first because Asterisk preserves old queuepos
          and the container type isn't changed from hash to list.
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        expected_members = ['201', '202', '203', '204']

        update_data = {
            'strategy': 'linear',
            'members': [{'extension': ext} for ext in expected_members],
        }

        response = api_client.patch(f'call-queues/{queue_id}', update_data)
        assert_api_success(response, "Failed to switch strategy to linear")

        # Verify API response
        api_members = [m['extension'] for m in response['data']['members']]
        print(f"\n  Strategy changed to: linear")
        print(f"  API members: {api_members}")

        assert api_members == expected_members, (
            f"API members mismatch after strategy change.\n"
            f"  Expected: {expected_members}\n"
            f"  Got:      {api_members}"
        )
        print(f"  OK: API shows correct member order {expected_members}")

    def test_04_verify_asterisk_linear_member_order(self, api_client):
        """
        Step 4: Verify Asterisk reflects the correct linear member order.

        This is the critical assertion. After the two-step reload:
        1. Empty config → reload (destroys queue, releases hash container)
        2. Full config → reload (recreates with list container, correct order)

        Members MUST appear in config file order: [201, 202, 203, 204]
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        expected = ['201', '202', '203', '204']
        output = wait_for_queue_in_asterisk(
            api_client, queue_id,
            expect_strategy='linear',
            expect_members=expected,
        )
        print(f"\n  Asterisk output:\n{output}")

        ast_members = parse_queue_members_from_asterisk(output)
        print(f"\n  Asterisk members (linear order): {ast_members}")
        print(f"  Expected order:                   {expected}")

        # Verify strategy is linear
        assert 'linear' in output.lower(), (
            f"Expected strategy 'linear' in Asterisk output.\n"
            f"  Full output: {output}"
        )

        # CRITICAL: For linear strategy, ORDER MATTERS
        assert ast_members == expected, (
            f"MEMBER ORDERING BUG DETECTED!\n"
            f"  Asterisk member order does not match expected order.\n"
            f"  Expected: {expected}\n"
            f"  Actual:   {ast_members}\n"
            f"  This indicates the two-step reload in QueueConf::reload() "
            f"is not working correctly.\n"
            f"  See: https://community.asterisk.org/t/queue-order-on-queue-reload-all/93833"
        )
        print(f"  OK: Asterisk shows correct linear member order")

    def test_05_reorder_members_in_linear_queue(self, api_client):
        """
        Step 5: Reorder members within an existing linear queue.

        Verify that changing member order in an already-linear queue
        is also applied correctly (tests the queuepos preservation bug).
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        update_data = {
            'members': [{'extension': ext} for ext in self.MEMBERS_REORDERED],
        }

        response = api_client.patch(f'call-queues/{queue_id}', update_data)
        assert_api_success(response, "Failed to reorder members")

        api_members = [m['extension'] for m in response['data']['members']]
        print(f"\n  New member order: {self.MEMBERS_REORDERED}")
        print(f"  API members:      {api_members}")

        assert api_members == self.MEMBERS_REORDERED, (
            f"API member order mismatch after reorder.\n"
            f"  Expected: {self.MEMBERS_REORDERED}\n"
            f"  Got:      {api_members}"
        )
        print(f"  OK: API shows correct reordered members")

    def test_06_verify_asterisk_reordered_members(self, api_client):
        """
        Step 6: Verify Asterisk reflects the reordered members.

        Even within an existing linear queue, the two-step reload
        must apply the new order correctly.
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        output = wait_for_queue_in_asterisk(
            api_client, queue_id,
            expect_strategy='linear',
            expect_members=self.MEMBERS_REORDERED,
        )
        print(f"\n  Asterisk output:\n{output}")

        ast_members = parse_queue_members_from_asterisk(output)
        print(f"\n  Asterisk members: {ast_members}")
        print(f"  Expected order:   {self.MEMBERS_REORDERED}")

        assert ast_members == self.MEMBERS_REORDERED, (
            f"MEMBER REORDER BUG DETECTED!\n"
            f"  Asterisk member order does not match after reorder.\n"
            f"  Expected: {self.MEMBERS_REORDERED}\n"
            f"  Actual:   {ast_members}\n"
            f"  Existing static members may have preserved their old queuepos."
        )
        print(f"  OK: Asterisk shows correct reordered members")

    def test_07_switch_back_to_ringall_and_to_linear_again(self, api_client):
        """
        Step 7: Round-trip test - ringall → linear → verify order.

        Ensures repeated strategy switches work correctly,
        not just the first switch.
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        # Switch back to ringall
        response = api_client.patch(f'call-queues/{queue_id}', {
            'strategy': 'ringall',
            'members': [{'extension': ext} for ext in ['202', '201', '203']],
        })
        assert_api_success(response, "Failed to switch back to ringall")
        print(f"\n  Switched to ringall with members [202, 201, 203]")

        # Switch to linear with specific order (no delay needed between patches)
        expected_linear = ['203', '202', '201']
        response = api_client.patch(f'call-queues/{queue_id}', {
            'strategy': 'linear',
            'members': [{'extension': ext} for ext in expected_linear],
        })
        assert_api_success(response, "Failed to switch to linear again")
        print(f"  Switched to linear with members {expected_linear}")

        output = wait_for_queue_in_asterisk(
            api_client, queue_id,
            expect_strategy='linear',
            expect_members=expected_linear,
        )
        ast_members = parse_queue_members_from_asterisk(output)
        print(f"\n  Asterisk output:\n{output}")
        print(f"\n  Asterisk members: {ast_members}")
        print(f"  Expected order:   {expected_linear}")

        assert ast_members == expected_linear, (
            f"ROUND-TRIP ORDERING BUG!\n"
            f"  After ringall→linear switch, member order is wrong.\n"
            f"  Expected: {expected_linear}\n"
            f"  Actual:   {ast_members}"
        )
        print(f"  OK: Round-trip strategy switch preserves correct order")

    def test_08_cleanup_test_queue(self, api_client):
        """
        Step 8: Clean up the test queue.
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        if not queue_id:
            pytest.skip("No queue to clean up")

        response = api_client.delete(f'call-queues/{queue_id}')
        assert_api_success(response, "Failed to delete test queue")
        print(f"\n  Deleted test queue: {queue_id}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
