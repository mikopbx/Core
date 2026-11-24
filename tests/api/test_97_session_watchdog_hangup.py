#!/usr/bin/env python3
"""
Regression test for #792: processes of an SSH console session must not survive
a terminal hangup and spin on the dead pty.

Over SSH the kernel sends SIGHUP only to the session leader (/etc/rc/hello),
and dropbear started by monit hands it SIGHUP already ignored. Everything else
in the session (pbx_init, console_menu, sngrep, a console shell and its jobs)
used to keep reading the deleted pty at 100% CPU. /sbin/pbx-session-watchdog,
started by /etc/rc/hello, now terminates the processes still bound to the
terminal and leaves detached ones alone.

The test does not depend on dropbear allocating a pty: a small driver uploaded
over an SSH exec channel runs on the PBX itself. It opens a pty, starts
/etc/rc/hello on it exactly the way a dropbear session would (new session,
controlling tty, SIGHUP ignored), types into the console menu and finally
closes the pty master, which is what a dropped SSH connection does.

Next to the menu chain the driver starts three control processes in the same
session:
  sleep 901 - stdio on /dev/null (like nohup / mwExecBg)   -> must survive
  sleep 902 - own session, fds still on the pty (screen)   -> must survive
  sleep 903 - background process bound to the terminal     -> must be killed

Requires:
  MIKOPBX_SSH_HOST  - target PBX
  MIKOPBX_SSH_USER  - defaults to "root"
The target host must accept the local SSH key non-interactively and have
python3 and sngrep installed.
"""

import json
import os
import re
import shlex
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

REMOTE_DIR = "/tmp/pbx-792-test"

# Runs on the PBX. "run <dir>" drives a pty session, "state <dir>" prints JSON.
DRIVER = r'''
import fcntl, json, os, pty, re, select, signal, struct, sys, termios, time

def run(wd):
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 40, 120, 0, 0))
    pid = os.fork()
    if pid == 0:
        signal.signal(signal.SIGHUP, signal.SIG_IGN)
        os.setsid()
        fcntl.ioctl(slave, termios.TIOCSCTTY, 0)
        for fd in (0, 1, 2):
            os.dup2(slave, fd)
        os.environ.update(TERM='xterm', SSH_CLIENT='192.0.2.1 50000 22')

        def spawn(tag, prepare):
            child = os.fork()
            if child == 0:
                prepare()
                os.execv('/bin/sleep', ['sleep', tag])
            with open('%s/decoy.%s' % (wd, tag), 'w') as f:
                f.write('%d\n' % child)

        def devnull():
            null = os.open('/dev/null', os.O_RDWR)
            for fd in (0, 1, 2):
                os.dup2(null, fd)

        spawn('901', devnull)
        spawn('902', os.setsid)
        spawn('903', lambda: None)
        os.execv('/bin/sh', ['sh', '/etc/rc/hello'])
    os.close(slave)
    with open(wd + '/leader', 'w') as f:
        f.write(str(pid))
    log = open(wd + '/out.log', 'ab', buffering=0)
    while not os.path.exists(wd + '/quit'):
        if master is None:
            time.sleep(0.3)
            continue
        ready, _, _ = select.select([master], [], [], 0.2)
        if ready:
            try:
                log.write(os.read(master, 65536))
            except OSError:
                pass
        if os.path.exists(wd + '/keys'):
            with open(wd + '/keys') as f:
                keys = f.read()
            os.unlink(wd + '/keys')
            os.write(master, keys.encode().decode('unicode_escape').encode('latin-1'))
        if os.path.exists(wd + '/close'):
            os.close(master)
            master = None
    try:
        os.waitpid(pid, os.WNOHANG)
    except ChildProcessError:
        pass

def state(wd):
    leader = open(wd + '/leader').read().strip()
    members = []
    for name in os.listdir('/proc'):
        if not name.isdigit():
            continue
        try:
            stat = open('/proc/%s/stat' % name).read()
            cmd = open('/proc/%s/cmdline' % name, 'rb').read().replace(b'\0', b' ').decode().strip()
        except OSError:
            continue
        fields = stat.rsplit(')', 1)[1].split()
        if fields[3] == leader and fields[0] != 'Z':
            members.append({'pid': int(name), 'cmd': cmd})
    decoys = {}
    for tag in ('901', '902', '903'):
        pid = open('%s/decoy.%s' % (wd, tag)).read().strip()
        alive = os.path.exists('/proc/' + pid)
        if alive:
            alive = open('/proc/%s/stat' % pid).read().rsplit(')', 1)[1].split()[0] != 'Z'
        decoys[tag] = alive
    raw = open(wd + '/out.log', 'rb').read().decode('utf-8', 'replace')[-4000:]
    screen = re.sub(r'\x1b\[[0-9;?]*[A-Za-z]|\x1b[()][0-9A-Za-z]|\x1b[=>]', '', raw)
    print(json.dumps({'members': members, 'decoys': decoys, 'screen': screen}))

{'run': run, 'state': state}[sys.argv[1]](sys.argv[2])
'''


def _ssh_target() -> str:
    host = os.getenv("MIKOPBX_SSH_HOST")
    if not host:
        pytest.skip("MIKOPBX_SSH_HOST not set - session watchdog test requires SSH access")
    user = os.getenv("MIKOPBX_SSH_USER", "root")
    return f"{user}@{host}"


def _ssh(target: str, command: str, stdin: str = None, timeout: int = 20) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["ssh", *SSH_OPTS, target, command],
        input=stdin, capture_output=True, text=True, timeout=timeout,
    )


class ConsoleSession:
    """A console session on a pty driven from the PBX itself."""

    def __init__(self, target: str, name: str):
        self.target = target
        self.dir = f"{REMOTE_DIR}/{name}"
        _ssh(target, f"rm -rf {self.dir} && mkdir -p {self.dir}")
        _ssh(
            target,
            f"setsid nohup python3 {REMOTE_DIR}/driver.py run {self.dir} "
            "</dev/null >/dev/null 2>&1 &",
        )

    def key(self, keys: str, pause: float = 0.8) -> None:
        # cli-menu reads stdin 4 bytes at a time: send escape sequences one by one.
        _ssh(self.target, f"printf '%s' {shlex.quote(keys)} > {self.dir}/keys")
        time.sleep(pause)

    def state(self) -> dict:
        result = _ssh(self.target, f"python3 {REMOTE_DIR}/driver.py state {self.dir}")
        assert result.returncode == 0, result.stderr
        return json.loads(result.stdout)

    def wait_for_screen(self, pattern: str, timeout: float = 40) -> str:
        deadline = time.time() + timeout
        while time.time() < deadline:
            screen = self.state()["screen"]
            if re.search(pattern, screen):
                return screen
            time.sleep(1)
        pytest.fail(f"screen never matched {pattern!r}:\n{self.state()['screen'][-1500:]}")

    def select_item(self, label_pattern: str, first_index: int) -> None:
        """Move the cursor to the menu item '[N] <label>' and press Enter.

        first_index is the item the cursor starts on: 0 for the main menu
        (spacer line above [1]), 1 for submenus.
        """
        item = r"\[(\d+)\]\s+(?i:" + label_pattern + ")"
        screen = self.wait_for_screen(item)
        match = re.findall(item, screen)[-1]
        for _ in range(int(match) - first_index):
            self.key("\\x1b[B")
        self.key("\\r", pause=2)

    def hang_up(self) -> None:
        _ssh(self.target, f"touch {self.dir}/close")

    def processes(self, pattern: str) -> list:
        return [m for m in self.state()["members"] if re.search(pattern, m["cmd"])]

    def destroy(self) -> None:
        state = self.state()
        pids = [str(m["pid"]) for m in state["members"]]
        _ssh(
            self.target,
            f"touch {self.dir}/quit; kill -9 {' '.join(pids)} "
            f"$(cat {self.dir}/decoy.* 2>/dev/null) 2>/dev/null; "
            "pkill -f '^sleep 90[45]$' 2>/dev/null; true",
        )


@pytest.fixture
def target():
    target = _ssh_target()
    check = _ssh(target, "test -x /sbin/pbx-session-watchdog && command -v python3 sngrep")
    if check.returncode != 0:
        pytest.skip(f"{target}: pbx-session-watchdog, python3 or sngrep missing")
    _ssh(target, f"mkdir -p {REMOTE_DIR} && cat > {REMOTE_DIR}/driver.py", stdin=DRIVER)
    sessions = []
    yield target, sessions
    for session in sessions:
        session.destroy()
    _ssh(target, f"rm -rf {REMOTE_DIR}")


def _open_menu(target, sessions, name) -> ConsoleSession:
    session = ConsoleSession(target, name)
    sessions.append(session)
    session.wait_for_screen(r"Press any key|Нажмите любую клавишу")
    session.key("\\r", pause=3)
    # The main menu cursor starts on an empty spacer line above item [1].
    session.wait_for_screen(r"\[1\]")
    return session


def _wait_until(check, timeout: float = 15) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if check():
            return True
        time.sleep(1)
    return check()


def test_hangup_kills_sngrep_started_from_menu(target):
    host, sessions = target
    session = _open_menu(host, sessions, "menu")
    session.select_item(r"Monitoring and Diagnostics|Мониторинг и диагностика", first_index=0)
    session.select_item(r"Asterisk Diagnostics|Диагностика Asterisk", first_index=1)
    session.select_item(r"Sngrep", first_index=1)
    assert _wait_until(lambda: session.processes(r"^/usr/bin/sngrep"), timeout=10), "sngrep did not start"

    session.hang_up()

    assert _wait_until(lambda: not session.processes(r"sngrep|console_menu|pbx_init|/etc/rc/hello")), (
        f"menu chain survived the hangup: {session.state()['members']}"
    )
    decoys = session.state()["decoys"]
    assert decoys == {"901": True, "902": True, "903": False}, decoys


def test_hangup_kills_console_shell_and_its_jobs(target):
    host, sessions = target
    session = _open_menu(host, sessions, "shell")
    session.select_item(r"Console|Консоль", first_index=0)
    session.wait_for_screen(r"[#$]\s*$", timeout=15)
    session.key("sleep 904 &\\r")
    session.key("nohup sleep 905 >/dev/null 2>&1 &\\r")
    session.key("sngrep\\r", pause=3)
    assert _wait_until(lambda: session.processes(r"^sngrep|^/usr/bin/sngrep"), timeout=10), "sngrep did not start"

    session.hang_up()

    assert _wait_until(lambda: not session.processes(r"sngrep|bash|sleep 904|/etc/rc/hello")), (
        f"console shell survived the hangup: {session.state()['members']}"
    )
    assert session.processes(r"^sleep 905$"), "nohup job must survive the hangup"
    assert session.state()["decoys"] == {"901": True, "902": True, "903": False}


def test_normal_logout_stops_watchdog_without_killing(target):
    host, sessions = target
    session = _open_menu(host, sessions, "logout")
    assert session.processes(r"pbx-session-watchdog"), "watchdog was not started"
    session.select_item(r"Console|Консоль", first_index=0)
    session.wait_for_screen(r"[#$]\s*$", timeout=15)
    session.key("exit\\r", pause=3)

    assert _wait_until(lambda: not session.processes(r"pbx-session-watchdog|/sbin/pbx_init|bash"), timeout=10), (
        f"session did not finish after logout: {session.state()['members']}"
    )
    session.hang_up()
    time.sleep(5)
    # The watchdog is gone, so nothing bound to the terminal is touched any more.
    assert session.state()["decoys"] == {"901": True, "902": True, "903": True}
