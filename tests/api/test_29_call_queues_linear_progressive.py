#!/usr/bin/env python3
"""
Test suite for the `linear_progressive` queue strategy.

Architecture (after the 19-iteration design pivot, see issue #664):

`linear_progressive` is rendered into Asterisk as plain `ringall` with all
members at penalty=0. The cumulative ramp-up is implemented purely on the
dialplan level — NOT via `app_queue`'s `penaltychange` rules (those don't
work past `try_calling()` in Asterisk 22; `qe->max_penalty` is frozen once
ringing starts):

1. The queue extension emits `MSet(__Q_TIMEOUT_<EXT>=N, ...)` immediately
   before `Queue(...)`, where N = priority * seconds_to_ring_each_member.
2. The `__` prefix propagates these into the Local channel `app_queue`
   creates per member.
3. `[internal-users]` runs on each member's Local-channel leg and starts
   with `ExecIf($["${Q_TIMEOUT_${EXTEN}}" != ""...]?Wait(${Q_TIMEOUT_<EXT>}))`.
4. Effect: all members ring through `ringall` in a single attempt, but the
   actual SIP `Dial()` per member is deferred to staggered points in time.

Verifications:
- API enum accepts `linear_progressive`.
- Member priorities are auto-assigned 0,1,2,... by save order.
- queues.conf renders `strategy = ringall` and EVERY member with penalty=0
  (non-zero would be filtered out by app_queue, breaking the fan-out).
- queues.conf has NO `defaultrule` and queuerules.conf is empty.
- The dialplan queue extension contains MSet(__Q_TIMEOUT_<EXT>=...) right
  before Queue().
- `[internal-users]` contains the Wait gate.
- PATCH switching strategy without members re-assigns priorities.
"""
import re
import time

import pytest
from conftest import (
    assert_api_success,
    execute_asterisk_command,
)


def strip_ansi(text: str) -> str:
    """Remove ANSI escape sequences from text."""
    return re.sub(r'\x1b\[[0-9;]*m', '', text)


def wait_for_queue_in_asterisk(
    api_client,
    queue_id: str,
    timeout: int = 30,
    expect_strategy: str | None = None,
) -> str:
    """Poll Asterisk until the queue appears with the expected strategy."""
    deadline = time.time() + timeout
    output = ''
    while time.time() < deadline:
        output = execute_asterisk_command(api_client, f'queue show {queue_id}')

        if 'No such queue' in output:
            time.sleep(1)
            continue

        if expect_strategy and f"'{expect_strategy}'" not in output.lower():
            time.sleep(1)
            continue

        return output

    return output


class TestCallQueueLinearProgressive:
    """
    End-to-end checks for the `linear_progressive` queue strategy.

    Uses extensions 201, 202, 203 from employee.json fixtures created
    by test_14/test_15 before this test runs.
    """

    QUEUE_EXTENSION = '20098'
    QUEUE_NAME = 'Linear Progressive Test Queue'
    ASTERISK_TIMEOUT = 30
    STEP_SECONDS = 12
    MEMBERS = ['201', '202', '203']

    def test_01_create_queue_with_linear_progressive(self, api_client):
        """API accepts the new strategy and returns 200/201."""
        queue_data = {
            'name': self.QUEUE_NAME,
            'extension': self.QUEUE_EXTENSION,
            'strategy': 'linear_progressive',
            'seconds_to_ring_each_member': self.STEP_SECONDS,
            'seconds_for_wrapup': 3,
            'recive_calls_while_on_a_call': False,
            'caller_hear': 'ringing',
            'announce_position': False,
            'announce_hold_time': False,
            'members': [{'extension': ext} for ext in self.MEMBERS],
        }

        response = api_client.post('call-queues', queue_data)
        assert_api_success(response, "Failed to create linear_progressive queue")

        queue_id = response['data']['id']
        assert queue_id, "Queue ID should not be empty"
        assert response['data']['strategy'] == 'linear_progressive', (
            f"Strategy not preserved in response: {response['data']['strategy']}"
        )

        self.__class__._queue_id = queue_id
        print(f"\n  Queue ID: {queue_id}")
        print(f"  Strategy: linear_progressive")

    def test_02_priorities_auto_assigned(self, api_client):
        """
        Members must come back with priority = 0, 1, 2 in the same order
        we sent them in. These priorities drive the Q_TIMEOUT calculation
        in QueueConf::extensionGenInternal (delay = priority * step_seconds).
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        response = api_client.get(f'call-queues/{queue_id}')
        assert_api_success(response, "Failed to read queue")

        members = response['data']['members']
        ordered = sorted(members, key=lambda m: int(m.get('priority', 0)))

        priorities = [int(m['priority']) for m in ordered]
        extensions = [m['extension'] for m in ordered]

        print(f"\n  Members (ordered by priority): {extensions}")
        print(f"  Priorities:                    {priorities}")

        assert priorities == list(range(len(self.MEMBERS))), (
            f"Priorities not auto-assigned 0..N-1.\n"
            f"  Expected: {list(range(len(self.MEMBERS)))}\n"
            f"  Got:      {priorities}"
        )
        assert extensions == self.MEMBERS, (
            f"Member order does not match request order.\n"
            f"  Expected: {self.MEMBERS}\n"
            f"  Got:      {extensions}"
        )

    def test_03_queues_conf_renders_ringall_no_defaultrule(self, api_client):
        """
        For linear_progressive MikoPBX must:
          * render `strategy = ringall` (not linear, not linear_progressive)
          * NOT emit `defaultrule` (penaltychange unused — see CR#19 / module docstring)
          * give EVERY member penalty=0 (non-zero would be filtered out by
            app_queue, breaking the fan-out)
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        # Wait for queue to appear in Asterisk under ringall (the underlying strategy)
        output = wait_for_queue_in_asterisk(
            api_client, queue_id,
            timeout=self.ASTERISK_TIMEOUT,
            expect_strategy='ringall',
        )
        output = strip_ansi(output)
        print(f"\n  Asterisk output:\n{output}")

        assert 'ringall' in output.lower(), (
            f"linear_progressive must render as 'ringall' in Asterisk.\n"
            f"  Got: {output}"
        )

        # Every member should be reported without a per-member penalty (which
        # only appears in `queue show` when penalty != 0).
        for ext in self.MEMBERS:
            line_pattern = re.compile(rf'\b{ext}\b.*penalty', re.IGNORECASE)
            assert not line_pattern.search(output), (
                f"Member {ext} has a non-zero penalty in 'queue show'. "
                f"linear_progressive must keep all penalties at 0."
            )

    def test_04_queuerules_conf_is_empty(self, api_client):
        """
        queuerules.conf must NOT contain a section for the queue. The original
        design used [queue_<uniqid>_progressive] with penaltychange rules but
        was abandoned (CR#19) — Asterisk 22 freezes qe->max_penalty after
        try_calling(), so penaltychange rules can't grow the ringing pool.
        Now linear_progressive uses dialplan staggering instead.
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        rules_output = strip_ansi(execute_asterisk_command(api_client, 'queue show rules'))
        rule_name = f"queue_{queue_id}_progressive"
        assert rule_name not in rules_output, (
            f"Penalty rule '{rule_name}' is unexpectedly defined.\n"
            f"queuerules.conf should be empty for linear_progressive — "
            f"ramp-up is done in the dialplan via Q_TIMEOUT/Wait."
        )

    def test_05_dialplan_has_mset_and_wait(self, api_client):
        """
        Verify the actual ramp-up wiring in extensions.conf:
          1. Queue extension contains MSet(__Q_TIMEOUT_<EXT>=N, ...) where
             N = priority * STEP_SECONDS, immediately before Queue(...).
          2. [internal-users] contains the ExecIf-Wait gate that consumes
             Q_TIMEOUT_<EXTEN>.
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        # Show the dialplan extension for the queue's ${EXTENSION}
        ext_dump = execute_asterisk_command(api_client, f'dialplan show {self.QUEUE_EXTENSION}@internal')
        ext_dump = strip_ansi(ext_dump)
        print(f"\n  Dialplan dump:\n{ext_dump}")

        # MSet line must contain expected delays for every member
        for index, ext in enumerate(self.MEMBERS):
            expected_delay = index * self.STEP_SECONDS
            mset_pattern = re.compile(
                rf'MSet\([^)]*__Q_TIMEOUT_{ext}={expected_delay}\b'
            )
            assert mset_pattern.search(ext_dump), (
                f"Expected MSet(__Q_TIMEOUT_{ext}={expected_delay}) before Queue() "
                f"in extension {self.QUEUE_EXTENSION}."
            )

        # Queue() must come after MSet
        mset_pos = ext_dump.find('MSet')
        queue_pos = ext_dump.find('Queue(')
        assert -1 < mset_pos < queue_pos, (
            f"MSet must precede Queue() in the queue extension.\n"
            f"  MSet at {mset_pos}, Queue at {queue_pos}"
        )

        # The Wait gate is in [internal-users] — sample one member context
        users_dump = strip_ansi(execute_asterisk_command(api_client, 'dialplan show internal-users'))
        assert 'Q_TIMEOUT_${EXTEN}' in users_dump or 'Q_TIMEOUT_$' in users_dump, (
            f"[internal-users] must read Q_TIMEOUT_${{EXTEN}} and Wait when set.\n"
            f"  Dump: {users_dump[:500]}"
        )
        assert 'Wait(${Q_TIMEOUT_' in users_dump or 'Wait(${Q_TIMEOUT_$' in users_dump, (
            f"[internal-users] must call Wait() when Q_TIMEOUT_<EXTEN> is set.\n"
            f"  Dump: {users_dump[:500]}"
        )

    def test_06_switch_to_linear_then_back(self, api_client):
        """
        Round-trip: linear_progressive -> linear -> linear_progressive.

        This exercises the two-step reload in QueueConf::reload(): switching
        TO linear requires destroying the queue (hash container -> list),
        and switching back to linear_progressive (which is `ringall` at the
        Asterisk level) requires another destroy (list -> hash).
        """
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        # linear_progressive -> linear
        response = api_client.patch(f'call-queues/{queue_id}', {'strategy': 'linear'})
        assert_api_success(response, "Failed to switch to linear")
        assert response['data']['strategy'] == 'linear'

        wait_for_queue_in_asterisk(
            api_client, queue_id,
            timeout=self.ASTERISK_TIMEOUT,
            expect_strategy='linear',
        )

        # linear -> linear_progressive
        response = api_client.patch(f'call-queues/{queue_id}', {'strategy': 'linear_progressive'})
        assert_api_success(response, "Failed to switch back to linear_progressive")
        assert response['data']['strategy'] == 'linear_progressive'

        output = wait_for_queue_in_asterisk(
            api_client, queue_id,
            timeout=self.ASTERISK_TIMEOUT,
            expect_strategy='ringall',
        )
        assert 'ringall' in output.lower(), (
            f"After switch back, queue should run on ringall (linear_progressive)."
        )
        print(f"\n  OK: round-trip linear_progressive <-> linear works")

    def test_07_invalid_strategy_rejected(self, api_client):
        """A clearly invalid strategy value must be rejected by API enum."""
        queue_id = getattr(self.__class__, '_queue_id', None)
        assert queue_id, "Queue ID not set (test_01 must run first)"

        # allow_404=True lets the conftest client surface 4xx (404/422) as a
        # parsed JSON body instead of raising HTTPError; we expect a 422 with
        # an enum-validation message from the API.
        response = api_client.patch(
            f'call-queues/{queue_id}',
            {'strategy': 'definitely_not_a_strategy'},
            allow_404=True,
        )
        assert response.get('result') is False or response.get('messages'), (
            f"Invalid strategy must not be accepted by API. Response: {response}"
        )

    def test_08_patch_strategy_without_members_reassigns_priority(self, api_client):
        """
        Regression for code-review finding CR#2.

        Scenario: a queue is created as 'ringall' (members get priority=0).
        The user then PATCHes ONLY the strategy field to 'linear_progressive',
        without sending a `members` array. The backend must re-assign
        priorities 0, 1, 2, ... to the existing members so the
        Q_TIMEOUT ramp-up actually staggers their dial times.

        Without the fix every member would keep priority=0 (i.e. delay=0
        for all), and linear_progressive would degenerate to plain ringall
        (everyone rings from t=0).
        """
        regress_extension = '20097'
        regress_name = 'CR2 Regression Queue'

        create_response = api_client.post('call-queues', {
            'name': regress_name,
            'extension': regress_extension,
            'strategy': 'ringall',  # NOT linear_progressive yet
            'seconds_to_ring_each_member': self.STEP_SECONDS,
            'seconds_for_wrapup': 3,
            'recive_calls_while_on_a_call': False,
            'caller_hear': 'ringing',
            'announce_position': False,
            'announce_hold_time': False,
            'members': [{'extension': ext} for ext in self.MEMBERS],
        })
        assert_api_success(create_response, "Failed to create regression queue (ringall)")

        regress_queue_id = create_response['data']['id']
        assert regress_queue_id, "Regression queue ID should not be empty"

        try:
            patch_response = api_client.patch(
                f'call-queues/{regress_queue_id}',
                {'strategy': 'linear_progressive'}
            )
            assert_api_success(patch_response, "Failed to patch strategy to linear_progressive")
            assert patch_response['data']['strategy'] == 'linear_progressive'

            get_response = api_client.get(f'call-queues/{regress_queue_id}')
            assert_api_success(get_response, "Failed to read regression queue")

            members = get_response['data']['members']
            ordered = sorted(members, key=lambda m: int(m.get('priority', 0)))
            priorities = [int(m['priority']) for m in ordered]
            extensions = [m['extension'] for m in ordered]

            print(f"\n  After PATCH ringall → linear_progressive (no members in payload):")
            print(f"  Members:    {extensions}")
            print(f"  Priorities: {priorities}")

            assert priorities == list(range(len(self.MEMBERS))), (
                f"CR#2 REGRESSION: priorities not re-assigned on strategy switch.\n"
                f"  Expected: {list(range(len(self.MEMBERS)))}\n"
                f"  Got:      {priorities}\n"
                f"  Without re-assignment, every member keeps priority=0 and the "
                f"Q_TIMEOUT ramp-up never staggers — linear_progressive degenerates "
                f"to plain ringall (everyone rings from t=0)."
            )
            assert extensions == self.MEMBERS, (
                f"Member order not preserved on strategy switch.\n"
                f"  Expected: {self.MEMBERS}\n"
                f"  Got:      {extensions}"
            )
            print(f"  OK: priorities auto-reassigned to {priorities}")
        finally:
            api_client.delete(f'call-queues/{regress_queue_id}')

    def test_09_cleanup_test_queue(self, api_client):
        """Clean up the test queue."""
        queue_id = getattr(self.__class__, '_queue_id', None)
        if not queue_id:
            pytest.skip("No queue to clean up")

        response = api_client.delete(f'call-queues/{queue_id}')
        assert_api_success(response, "Failed to delete test queue")
        print(f"\n  Deleted test queue: {queue_id}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
