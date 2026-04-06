#!/usr/bin/env python3
"""
pycalltests Helper Module

Provides Python wrapper classes for pycalltests (CI PBX) - a minimalistic VoIP
testing tool for automating SIP call tests.

Classes:
    CipbxServer: Manages pycalltests server lifecycle (start/stop/health check)
    SipEndpoint: Represents a SIP endpoint (register/call/answer/hangup)
    SipProvider: Simulates external SIP provider/trunk

Usage:
    server = CipbxServer(host="0.0.0.0", port=5090, mikopbx_ip="192.168.117.2")
    await server.start()
    await server.health_check()
    await server.stop()
"""

import asyncio
import os
import signal
import subprocess
import time
from pathlib import Path
from typing import Optional, Dict, Any


class CipbxServer:
    """
    pycalltests server manager for MikoPBX testing

    Features:
    - Automatic start/stop of pycalltests process
    - Health check to verify server is running
    - Log file management
    - Support for multiple transports (UDP/TCP/TLS/WebSocket)

    Example:
        server = CipbxServer(host="0.0.0.0", port=5090, mikopbx_ip="192.168.117.2")
        await server.start()
        # Run tests...
        await server.stop()
    """

    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 5090,
        mikopbx_ip: str = "192.168.117.2",
        transport: str = "udp",
        timeout: int = 60,
        pycalltest_dir: Optional[str] = None
    ):
        """
        Initialize pycalltests server configuration

        Args:
            host: IP address to listen on (default: 0.0.0.0)
            port: Port to listen on (default: 5090)
            mikopbx_ip: MikoPBX container IP address (default: 192.168.117.2)
            transport: Transport protocol (udp|tcp|tls|ws|wss) (default: udp)
            timeout: Call timeout in seconds (default: 60)
            pycalltest_dir: Path to pycalltests directory (auto-detected if None)
        """
        self.host = host
        self.port = port
        self.mikopbx_ip = mikopbx_ip
        self.transport = transport
        self.timeout = timeout

        # Auto-detect pycalltests directory
        if pycalltest_dir is None:
            current_file = Path(__file__).resolve()
            # From tests/api/helpers/pycalltest_helper.py -> tests/pycalltests/
            self.pycalltest_dir = current_file.parent.parent.parent / "pycalltests"
        else:
            self.pycalltest_dir = Path(pycalltest_dir)

        self.pycalltest_bin = self.pycalltest_dir / "pycalltests"
        self.log_file = self.pycalltest_dir / "logs" / "pycalltests.log"
        self.pid_file = self.pycalltest_dir / "pycalltests.pid"

        self.process: Optional[subprocess.Popen] = None
        self.pid: Optional[int] = None

    async def start(self) -> None:
        """
        Start pycalltests server

        Raises:
            FileNotFoundError: If pycalltests binary not found
            RuntimeError: If pycalltests fails to start
        """
        # Check if already running
        if self.is_running():
            print(f"✓ pycalltests already running (PID: {self.pid})")
            return

        # Verify binary exists
        if not self.pycalltest_bin.exists():
            raise FileNotFoundError(
                f"pycalltests binary not found at {self.pycalltest_bin}. "
                "Please run tests/pycalltests/install.sh first"
            )

        # Create logs directory
        self.log_file.parent.mkdir(parents=True, exist_ok=True)

        # Build command
        cmd = [
            str(self.pycalltest_bin),
            "server",
            "-l", self.host,
            "-p", str(self.port),
            "--transport", self.transport,
            "-t", str(self.timeout),
        ]

        print(f"Starting pycalltests server...")
        print(f"  Listen: {self.host}:{self.port}")
        print(f"  Transport: {self.transport}")
        print(f"  Timeout: {self.timeout}s")
        print(f"  MikoPBX: {self.mikopbx_ip}")
        print(f"  Log: {self.log_file}")

        # Start process
        with open(self.log_file, "w") as log_f:
            self.process = subprocess.Popen(
                cmd,
                stdout=log_f,
                stderr=subprocess.STDOUT,
                cwd=str(self.pycalltest_dir)
            )

        self.pid = self.process.pid

        # Save PID to file
        self.pid_file.write_text(str(self.pid))

        # Wait for startup
        await asyncio.sleep(2)

        # Verify process is running
        if self.process.poll() is not None:
            # Process died
            error_log = self.log_file.read_text() if self.log_file.exists() else "No log file"
            raise RuntimeError(
                f"pycalltests failed to start. Exit code: {self.process.returncode}\n"
                f"Log:\n{error_log}"
            )

        print(f"✓ pycalltests started successfully (PID: {self.pid})")

    async def stop(self) -> None:
        """
        Stop pycalltests server gracefully
        """
        if not self.is_running():
            print("pycalltests is not running")
            return

        print(f"Stopping pycalltests (PID: {self.pid})...")

        if self.process:
            # Graceful shutdown
            self.process.terminate()

            # Wait for process to stop (max 5 seconds)
            try:
                self.process.wait(timeout=5)
                print("✓ pycalltests stopped successfully")
            except subprocess.TimeoutExpired:
                # Force kill
                print("Force killing pycalltests...")
                self.process.kill()
                self.process.wait()
                print("✓ pycalltests force killed")

            self.process = None
        else:
            # Process started by another script, kill by PID
            try:
                os.kill(self.pid, signal.SIGTERM)
                await asyncio.sleep(1)

                # Check if still running
                try:
                    os.kill(self.pid, 0)  # Check if process exists
                    # Still running, force kill
                    os.kill(self.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass  # Already dead

                print("✓ pycalltests stopped successfully")
            except ProcessLookupError:
                print("pycalltests process not found")

        # Clean up PID file
        if self.pid_file.exists():
            self.pid_file.unlink()

        self.pid = None

    def is_running(self) -> bool:
        """
        Check if pycalltests server is running

        Returns:
            True if running, False otherwise
        """
        # Check if PID file exists
        if self.pid_file.exists():
            try:
                pid = int(self.pid_file.read_text().strip())
                # Check if process is alive
                os.kill(pid, 0)
                self.pid = pid
                return True
            except (ProcessLookupError, ValueError, OSError):
                # PID file is stale
                return False

        # Check if we have a process object
        if self.process and self.process.poll() is None:
            return True

        return False

    async def health_check(self) -> bool:
        """
        Verify pycalltests server is healthy and accessible

        Returns:
            True if healthy, False otherwise
        """
        if not self.is_running():
            print("✗ Health check failed: pycalltests not running")
            return False

        # TODO: Implement actual SIP health check (e.g., OPTIONS request)
        # For now, just check if process is running
        print(f"✓ Health check passed (PID: {self.pid})")
        return True

    async def get_logs(self, lines: int = 50) -> str:
        """
        Get last N lines from pycalltests log file

        Args:
            lines: Number of lines to retrieve (default: 50)

        Returns:
            Log content as string
        """
        if not self.log_file.exists():
            return "No log file found"

        # Read last N lines
        with open(self.log_file, "r") as f:
            all_lines = f.readlines()
            return "".join(all_lines[-lines:])


class SipEndpoint:
    """
    Represents a SIP endpoint for testing using gophone CLI

    Features:
    - Register to MikoPBX
    - Initiate calls
    - Answer incoming calls
    - Hangup
    - Send DTMF
    - Get call status

    Example:
        endpoint = SipEndpoint(extension="201", secret="pass123", server_ip="192.168.107.3")
        await endpoint.register()
        await endpoint.call("202")
        await asyncio.sleep(10)
        await endpoint.hangup()
    """

    def __init__(
        self,
        extension: str,
        secret: str,
        server_ip: str = "192.168.107.3",
        listen_ip: str = "192.168.139.3",
        server_port: int = 5060,
        pycalltest_server: Optional[CipbxServer] = None
    ):
        """
        Initialize SIP endpoint

        Args:
            extension: Extension number (e.g., "201")
            secret: SIP password
            server_ip: MikoPBX server IP address (default: 192.168.107.3)
            listen_ip: Local IP address to bind (default: 192.168.139.3)
            server_port: MikoPBX SIP port (default: 5060)
            pycalltest_server: Reference to CipbxServer instance (optional)
        """
        self.extension = extension
        self.secret = secret
        self.server_ip = server_ip
        self.listen_ip = listen_ip
        self.server_port = server_port
        self.pycalltest_server = pycalltest_server

        # Find gophone binary
        current_file = Path(__file__).resolve()
        self.gophone_bin = current_file.parent.parent.parent / "pycalltests" / "gophone"

        self.is_registered = False
        self.active_calls: Dict[str, Any] = {}
        self.register_process: Optional[subprocess.Popen] = None
        self.call_process: Optional[subprocess.Popen] = None

    async def register(self) -> bool:
        """
        Register SIP endpoint to MikoPBX using gophone

        Returns:
            True if successful, False otherwise

        Raises:
            FileNotFoundError: If gophone binary not found
            RuntimeError: If registration fails
        """
        if self.is_registered:
            print(f"✓ Endpoint {self.extension} already registered")
            return True

        if not self.gophone_bin.exists():
            raise FileNotFoundError(
                f"gophone binary not found at {self.gophone_bin}. "
                "Please run tests/pycalltests/install-gophone.sh first"
            )

        # Build gophone register command
        cmd = [
            str(self.gophone_bin),
            "register",
            "-username", self.extension,
            "-password", self.secret,
            "-l", f"{self.listen_ip}:0",  # :0 = random port
            f"sip:{self.server_ip}:{self.server_port}"
        ]

        print(f"Registering SIP endpoint {self.extension} @ {self.server_ip}:{self.server_port}")

        # Start gophone register process in background
        self.register_process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )

        # Wait a bit for registration to complete
        await asyncio.sleep(2)

        # Check if process is still running (registration keeps connection alive)
        if self.register_process.poll() is not None:
            # Process died - registration failed
            output = self.register_process.stdout.read() if self.register_process.stdout else "No output"
            raise RuntimeError(
                f"gophone registration failed for {self.extension}\n"
                f"Output:\n{output}"
            )

        self.is_registered = True
        print(f"✓ Endpoint {self.extension} registered successfully")
        return True

    async def unregister(self) -> bool:
        """
        Unregister SIP endpoint from MikoPBX

        Returns:
            True if successful, False otherwise
        """
        if not self.is_registered:
            return True

        # Kill register process
        if self.register_process and self.register_process.poll() is None:
            self.register_process.terminate()
            try:
                self.register_process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.register_process.kill()

        self.is_registered = False
        self.register_process = None
        print(f"✓ Endpoint {self.extension} unregistered")
        return True

    async def call(self, target: str, duration: int = 10) -> str:
        """
        Initiate call to target extension/number using gophone

        Args:
            target: Target extension or phone number
            duration: Call duration in seconds (default: 10)

        Returns:
            Call ID

        Raises:
            RuntimeError: If call fails
        """
        if not self.gophone_bin.exists():
            raise FileNotFoundError(f"gophone binary not found at {self.gophone_bin}")

        call_id = f"{self.extension}_{target}_{int(time.time())}"

        # Build gophone dial command
        cmd = [
            str(self.gophone_bin),
            "dial",
            "-username", self.extension,
            "-password", self.secret,
            "-l", f"{self.listen_ip}:0",
            "-media", "audio",  # Use audio media (will need audio file eventually)
            f"sip:{target}@{self.server_ip}:{self.server_port}"
        ]

        print(f"Calling {self.extension} → {target} (duration: {duration}s, call_id: {call_id})")

        # Start call process in background
        self.call_process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )

        self.active_calls[call_id] = {
            "target": target,
            "status": "calling",
            "start_time": time.time(),
            "process": self.call_process,
            "duration": duration
        }

        # Wait briefly for call setup
        await asyncio.sleep(1)

        # Check if call is still active
        if self.call_process.poll() is not None:
            output = self.call_process.stdout.read() if self.call_process.stdout else "No output"
            raise RuntimeError(
                f"gophone dial failed for {self.extension}→{target}\n"
                f"Output:\n{output}"
            )

        print(f"✓ Call initiated: {call_id}")
        return call_id

    async def answer(self, duration: int = 10) -> bool:
        """
        Answer incoming calls using gophone answer mode

        Args:
            duration: How long to stay in answer mode (seconds)

        Returns:
            True if successful, False otherwise

        Note:
            This runs gophone in answer mode which automatically answers incoming calls
        """
        if not self.gophone_bin.exists():
            raise FileNotFoundError(f"gophone binary not found at {self.gophone_bin}")

        # Build gophone answer command
        cmd = [
            str(self.gophone_bin),
            "answer",
            "-username", self.extension,
            "-password", self.secret,
            "-register", f"{self.server_ip}:{self.server_port}",
            "-l", f"{self.listen_ip}:0",
            "-media", "audio"
        ]

        print(f"Starting answer mode for {self.extension} (duration: {duration}s)")

        # Start answer process
        answer_process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )

        # Wait for answer mode to run
        await asyncio.sleep(duration)

        # Stop answer process
        if answer_process.poll() is None:
            answer_process.terminate()
            try:
                answer_process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                answer_process.kill()

        print(f"✓ Answer mode stopped for {self.extension}")
        return True

    async def hangup(self, call_id: Optional[str] = None) -> bool:
        """
        Hangup call by terminating gophone process

        Args:
            call_id: Specific call ID to hangup (None = all active calls)

        Returns:
            True if successful, False otherwise
        """
        if call_id:
            if call_id in self.active_calls:
                call_info = self.active_calls[call_id]
                process = call_info.get("process")

                if process and process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        process.kill()

                print(f"✓ Hung up call {call_id}")
                del self.active_calls[call_id]
                return True
            return False
        else:
            # Hangup all calls
            for call_id in list(self.active_calls.keys()):
                await self.hangup(call_id)

            # Also kill call_process if it exists
            if self.call_process and self.call_process.poll() is None:
                self.call_process.terminate()
                try:
                    self.call_process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    self.call_process.kill()
                self.call_process = None

            print(f"✓ Hung up all calls on {self.extension}")
            return True

    async def send_dtmf(self, digits: str) -> bool:
        """
        Send DTMF tones (RFC 2833)

        Args:
            digits: DTMF digits to send (e.g., "1", "123", "#")

        Returns:
            True if successful, False otherwise
        """
        # TODO: Implement actual DTMF via RTP
        print(f"Sending DTMF: {digits}")
        return True

    async def wait_for_audio(self, timeout: int = 5) -> bool:
        """
        Wait for audio to be played (e.g., IVR prompt)

        Args:
            timeout: Maximum wait time in seconds

        Returns:
            True if audio detected, False on timeout
        """
        # TODO: Implement actual RTP audio detection
        print(f"Waiting for audio (timeout: {timeout}s)")
        await asyncio.sleep(1)
        return True

    async def get_call_status(self, call_id: str) -> Optional[Dict[str, Any]]:
        """
        Get current call status

        Args:
            call_id: Call ID to query

        Returns:
            Call status dictionary or None if not found
        """
        return self.active_calls.get(call_id)


class SipProvider:
    """
    Simulates external SIP provider/trunk

    Features:
    - Accept REGISTER from MikoPBX
    - Send inbound calls (DID)
    - Receive outbound calls from MikoPBX
    - Simulate failover scenarios (503, timeout, etc.)

    Example:
        provider = SipProvider(host="0.0.0.0", username="trunk123", password="secret")
        await provider.start()
        await provider.send_inbound_call(did="+74951234567", destination="201")
        await provider.stop()
    """

    def __init__(
        self,
        host: str,
        username: str,
        password: str,
        pycalltest_server: Optional[CipbxServer] = None
    ):
        """
        Initialize SIP provider simulator

        Args:
            host: IP address to listen on
            username: Provider username
            password: Provider password
            pycalltest_server: Reference to CipbxServer instance (optional)
        """
        self.host = host
        self.username = username
        self.password = password
        self.pycalltest_server = pycalltest_server

        self.is_running = False

    async def start(self) -> None:
        """
        Start SIP provider simulator
        """
        # TODO: Implement pycalltests provider mode
        print(f"Starting SIP provider {self.username}@{self.host}")
        self.is_running = True

    async def stop(self) -> None:
        """
        Stop SIP provider simulator
        """
        print(f"Stopping SIP provider {self.username}")
        self.is_running = False

    async def accept_registration(self) -> bool:
        """
        Accept REGISTER from MikoPBX

        Returns:
            True if successful, False otherwise
        """
        # TODO: Implement SIP 200 OK to REGISTER
        print(f"Accepting registration from MikoPBX")
        return True

    async def send_inbound_call(self, did: str, destination: str) -> str:
        """
        Simulate inbound call from provider to MikoPBX

        Args:
            did: DID number being called (e.g., +74951234567)
            destination: Internal destination (e.g., "201")

        Returns:
            Call ID
        """
        # TODO: Implement SIP INVITE to MikoPBX
        call_id = f"provider_{did}_{int(time.time())}"
        print(f"Sending inbound call: {did} → {destination} (call_id: {call_id})")
        return call_id

    async def receive_outbound_call(self) -> Optional[Dict[str, Any]]:
        """
        Receive outbound call from MikoPBX

        Returns:
            Call information dictionary or None
        """
        # TODO: Implement listening for INVITE from MikoPBX
        print(f"Waiting for outbound call from MikoPBX")
        return None
