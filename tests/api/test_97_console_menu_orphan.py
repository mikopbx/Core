#!/usr/bin/env python3
"""
Regression test for the console_menu / welcome_banner SSH-disconnect orphan bug.

Bug: when an SSH session that has reached the console menu is killed abruptly
(TCP RST, kill -9 of the client, network drop), the PHP /etc/rc/console_menu
process used to survive as an orphan and burn 100% CPU forever because:

  - shell `hello` / `pbx_init` inherited SIG_IGN for SIGHUP from dropbear,
    so the parent shell chain ignored the controlling-pty hangup;
  - PHP `php-school/cli-menu` `display()` calls `fread(STDIN, 4)` without an
    `feof()` guard — on a deleted pty fread returns '' instantly and the
    `while (isOpen()) { ... continue; }` loop spins.

Symptoms on the broken host (proven on a real prod box):
  - one CPU pegged at 100% for days
  - /proc/<pid>/io shows 200 000+ read syscalls/sec returning 0 bytes
  - voluntary_ctxt_switches stays near zero, nonvoluntary climbs by millions/min

Fix being regression-tested:
  - SIGALRM watchdog in /etc/rc/console_menu and /etc/rc/welcome_banner that
    polls feof(STDIN) every 2 s and exits on EOF / pty deletion;
  - explicit pcntl SIGHUP / SIGTERM handlers calling exit(0);
  - shell `trap 'kill 0' HUP TERM` in /etc/rc/hello and /sbin/pbx_init that
    tears down the whole process group when SIGHUP arrives.

This test connects over SSH, drives the menu to fully start, then forcibly
kills the SSH client and asserts that no PHP/shell process from the
console-menu chain survives 6 s later.

Requires:
  MIKOPBX_SSH_HOST  — target PBX, e.g. 172.16.32.94
  MIKOPBX_SSH_USER  — defaults to "root"
The target host must accept the local SSH key non-interactively.
"""

import os
import re
import subprocess
import time

import pytest


SSH_OPTS = [
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=no",
    "-o", "ConnectTimeout=5",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "LogLevel=ERROR",
]

# Patterns that identify processes belonging to a console-menu chain
# spawned from a *user* SSH session. The physical-console pbx_init lives on
# tty1 and must be excluded so we only flag SSH-spawned orphans.
CHAIN_PATTERN = (
    r"/etc/rc/console_menu|/sbin/pbx_init|/etc/rc/welcome_banner|/etc/rc/hello"
)


def _ssh_target() -> str:
    host = os.getenv("MIKOPBX_SSH_HOST")
    if not host:
        pytest.skip(
            "MIKOPBX_SSH_HOST not set — orphan regression test requires SSH access"
        )
    user = os.getenv("MIKOPBX_SSH_USER", "root")
    return f"{user}@{host}"


def _ssh(target: str, command: str, timeout: int = 15) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["ssh", *SSH_OPTS, target, command],
        capture_output=True, text=True, timeout=timeout,
    )


def _list_orphan_chain_pids(target: str) -> list[int]:
    """Return PIDs of console-menu chain members NOT bound to tty1.

    The physical-console pbx_init is intentionally excluded — only chains
    spawned from interactive SSH sessions can become orphans. Parsing is done
    in Python (rather than awk) to avoid double-shell escaping over SSH.

    The matcher checks argv[1] (the script path passed to the interpreter),
    not the full cmdline — dropbear itself is invoked as
    `/usr/sbin/dropbear ... -c /etc/rc/hello` and would otherwise be a false
    positive on the chain regex.
    """
    result = _ssh(target, "ps -e -o pid,tty,args")
    if result.returncode != 0:
        pytest.fail(f"ps over SSH failed: {result.stderr.strip()}")

    chain_re = re.compile(CHAIN_PATTERN)
    interpreters = {"/usr/bin/php", "/bin/sh", "/bin/bash"}

    pids: list[int] = []
    for line in result.stdout.splitlines()[1:]:  # skip header
        parts = line.split()
        if len(parts) < 3:
            continue
        pid_str, tty = parts[0], parts[1]
        argv = parts[2:]
        if tty == "tty1":
            continue  # physical-console pbx_init — never an orphan
        if argv[0] not in interpreters:
            continue  # dropbear, monit, asterisk, etc. — not us
        # Look at argv[1..] for the script path; PHP may use -f flag in front.
        script_args = [a for a in argv[1:] if not a.startswith("-")]
        if not script_args:
            continue
        if not chain_re.search(script_args[0]):
            continue
        try:
            pids.append(int(pid_str))
        except ValueError:
            continue
    return pids


def _cleanup_chain(target: str, pids: list[int]) -> None:
    """Best-effort SIGKILL of leftover chain processes (used in fixtures)."""
    if pids:
        _ssh(target, f"kill -9 {' '.join(map(str, pids))} 2>/dev/null || true")
        time.sleep(2)


def _wait_for_chain_drain(target: str, timeout: float) -> list[int]:
    """Poll until no orphan chain processes remain, or until timeout.

    Returns whatever chain PIDs are left at the end (empty list = success).
    Polling interval (1 s) is short enough to catch a 2 s SIGALRM tick.
    """
    deadline = time.monotonic() + timeout
    leftovers: list[int] = []
    while time.monotonic() < deadline:
        leftovers = _list_orphan_chain_pids(target)
        if not leftovers:
            return []
        time.sleep(1)
    return leftovers


def _describe_chain(target: str, pids: list[int]) -> str:
    """Render `ps` rows for failure messages so the regression is debuggable."""
    if not pids:
        return ""
    pid_args = ",".join(map(str, pids))
    result = _ssh(
        target,
        f"ps -o pid,ppid,sid,tty,stat,etime,pcpu,cmd -p {pid_args}; "
        f"for p in {' '.join(map(str, pids))}; do "
        f"  echo --- /proc/$p/fd/0 ---; readlink /proc/$p/fd/0 2>/dev/null; "
        f"done",
    )
    return result.stdout.rstrip()


@pytest.fixture
def ssh_target():
    target = _ssh_target()

    sanity = _ssh(target, "echo ok")
    if sanity.returncode != 0:
        pytest.skip(f"SSH to {target} failed: {sanity.stderr.strip()}")

    # If a previous failed run left a chain behind, clean it up first so the
    # before/after assertion is meaningful.
    _cleanup_chain(target, _list_orphan_chain_pids(target))

    yield target

    # Belt-and-suspenders: never leave the test box with an orphan, even if
    # the assertion in the test itself failed.
    _cleanup_chain(target, _list_orphan_chain_pids(target))


def _spawn_ssh_with_input(target: str, stdin_script: str) -> subprocess.Popen:
    """Open an interactive SSH (PTY) feeding stdin from a small bash script.

    start_new_session=True puts the SSH client in its own process group so
    that os.killpg can deliver SIGKILL to the whole client tree (mirroring
    a `kill -9` from the wild).
    """
    ssh_cmd = "ssh -tt " + " ".join(SSH_OPTS) + " " + target
    return subprocess.Popen(
        ["bash", "-c", f"({stdin_script}) | {ssh_cmd}"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        start_new_session=True,
    )


def _hard_kill(proc: subprocess.Popen) -> None:
    try:
        os.killpg(os.getpgid(proc.pid), 9)
    except ProcessLookupError:
        pass
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=5)


@pytest.mark.security
@pytest.mark.slow
def test_console_menu_no_orphan_after_ssh_kill_inside_menu(ssh_target):
    """Kill SSH while user is inside CliMenu — no orphan, no CPU burn."""
    # Open SSH, send Enter after 5 s to leave the welcome banner and enter the
    # main CliMenu, then keep the pty alive with a long sleep so we can yank
    # the connection ourselves at a controlled moment.
    proc = _spawn_ssh_with_input(
        ssh_target,
        "sleep 5; printf '\\n'; sleep 60",
    )

    try:
        # 12 s is enough on the test box for: dropbear → hello → pbx_init →
        # welcome_banner → key event → MainMenu::show() → CliMenu::open().
        time.sleep(12)

        running_before = _list_orphan_chain_pids(ssh_target)
        assert running_before, (
            "Setup failure: no console-menu chain detected over SSH. "
            "Either dropbear is not configured to launch /etc/rc/hello, "
            "or the menu did not advance past the welcome banner. "
            "Cannot validate the regression."
        )

        _hard_kill(proc)
    finally:
        if proc.poll() is None:
            _hard_kill(proc)

    # Watchdog ticks every 2 s; shell-trap may need a few hundred ms to
    # propagate through dropbear → kernel-SIGHUP → hello → kill-0. Poll up to
    # 20 s so the test is not flaky on slower hardware (KVM/Proxmox/etc.) but
    # still fails fast on a real regression.
    leftovers = _wait_for_chain_drain(ssh_target, timeout=20)
    assert not leftovers, (
        f"Orphan console-menu chain survived SSH kill after 20 s.\n"
        f"PIDs: {leftovers}\n"
        f"{_describe_chain(ssh_target, leftovers)}\n"
        f"Expected SIGALRM watchdog (every 2 s) or shell trap on HUP/TERM "
        f"to terminate the chain."
    )


@pytest.mark.security
@pytest.mark.slow
def test_console_menu_no_orphan_after_ssh_kill_in_banner(ssh_target):
    """Kill SSH BEFORE keypress — welcome_banner must not leak either."""
    # No keypress sent: chain stays in /etc/rc/welcome_banner's auto-refresh loop.
    proc = _spawn_ssh_with_input(ssh_target, "sleep 30")

    try:
        time.sleep(8)  # let welcome_banner fully start

        running_before = _list_orphan_chain_pids(ssh_target)
        assert running_before, (
            "Setup failure: welcome_banner did not start over SSH."
        )

        _hard_kill(proc)
    finally:
        if proc.poll() is None:
            _hard_kill(proc)

    leftovers = _wait_for_chain_drain(ssh_target, timeout=20)
    assert not leftovers, (
        f"Orphan welcome_banner chain survived disconnect-before-keypress "
        f"after 20 s.\nPIDs: {leftovers}\n"
        f"{_describe_chain(ssh_target, leftovers)}"
    )
