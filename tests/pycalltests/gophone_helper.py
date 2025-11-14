"""
GoPhone SIP Softphone Helper for MikoPBX Testing

This module provides Python wrapper for gophone CLI tool to enable
automated SIP testing in pytest.

GoPhone Repository: https://github.com/emiago/gophone
"""

import asyncio
import logging
import os
import re
import signal
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


@dataclass
class GoPhoneConfig:
    """Configuration for GoPhone softphone instance"""

    extension: str
    password: str
    server_ip: str
    server_port: int = 5060
    transport: str = "udp"
    listen_ip: str = "0.0.0.0"
    listen_port: int = 0  # 0 = random port
    media: Optional[str] = None  # audio, mic, speaker, log, none


class GoPhoneEndpoint:
    """
    Represents a SIP endpoint using gophone CLI tool.

    Supports:
    - Registration (REGISTER)
    - Making calls (INVITE)
    - Answering calls
    - Hangup (BYE)
    - DTMF tones
    """

    def __init__(self, config: GoPhoneConfig, gophone_path: str = "./gophone"):
        """
        Initialize GoPhone endpoint.

        Args:
            config: GoPhoneConfig with SIP credentials
            gophone_path: Path to gophone binary
        """
        self.config = config
        self.gophone_path = gophone_path
        self.process: Optional[subprocess.Popen] = None
        self.is_registered = False
        self.call_active = False
        self._output_buffer: List[str] = []

    async def start_as_server(self, require_auth: bool = True, timeout: int = 5) -> bool:
        """
        Start gophone as SIP server (provider simulation).

        Unlike register(), this starts gophone in answer mode WITHOUT the -register flag.
        This makes gophone act as a SIP server that accepts incoming calls.

        Use this for:
        - Simulating external SIP providers/trunks
        - Testing outbound call routing
        - Provider authentication testing

        Args:
            require_auth: If True, require digest authentication (default: True)
            timeout: Startup timeout in seconds

        Returns:
            True if server started successfully, False otherwise

        Example:
            # Simulate provider that requires authentication
            provider = GoPhoneEndpoint(config)
            success = await provider.start_as_server(require_auth=True)

            # Simulate provider without authentication (IP-based trust)
            provider = GoPhoneEndpoint(config)
            success = await provider.start_as_server(require_auth=False)
        """
        if self.process:
            logger.warning(f"GoPhone server already running on {self.config.listen_port}")
            return True

        cmd = [
            self.gophone_path,
            "answer",
            f"-ua={self.config.extension}",  # User agent name
            f"-l={self.config.listen_ip}:{self.config.listen_port}",
        ]

        # Add authentication if required
        if require_auth:
            cmd.extend([
                f"-username={self.config.extension}",
                f"-password={self.config.password}",
            ])

        if self.config.transport != "udp":
            cmd.append(f"-t={self.config.transport}")

        if self.config.media:
            cmd.append(f"-media={self.config.media}")

        logger.info(f"Starting GoPhone as SIP server on {self.config.listen_port}: {' '.join(cmd)}")

        try:
            env = os.environ.copy()
            env["LOG_LEVEL"] = "info"

            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=env,
                cwd=Path(self.gophone_path).parent
            )

            # Wait for server to start
            await asyncio.sleep(timeout)

            if self.process.poll() is not None:
                output = self.process.stdout.read() if self.process.stdout else ""
                logger.error(f"GoPhone server terminated: {output}")
                return False

            logger.info(f"GoPhone SIP server started on {self.config.listen_ip}:{self.config.listen_port}")
            return True

        except Exception as e:
            logger.error(f"Failed to start GoPhone server: {e}")
            return False

    async def register(self, timeout: int = 10) -> bool:
        """
        Register SIP endpoint with MikoPBX.

        Uses 'gophone answer -register' to maintain registration.

        Args:
            timeout: Registration timeout in seconds

        Returns:
            True if registration successful, False otherwise

        Example:
            endpoint = GoPhoneEndpoint(config)
            success = await endpoint.register()
        """
        if self.is_registered:
            logger.warning(f"Extension {self.config.extension} already registered")
            return True

        cmd = [
            self.gophone_path,
            "answer",
            f"-ua={self.config.extension}",
            f"-username={self.config.extension}",
            f"-password={self.config.password}",
            f"-l={self.config.listen_ip}:{self.config.listen_port}",
            "-register",
            f"{self.config.server_ip}:{self.config.server_port}"
        ]

        if self.config.transport != "udp":
            cmd.append(f"-t={self.config.transport}")

        if self.config.media:
            cmd.append(f"-media={self.config.media}")

        logger.info(f"Registering extension {self.config.extension}: {' '.join(cmd)}")

        try:
            # Set environment for debugging
            env = os.environ.copy()
            env["LOG_LEVEL"] = "info"

            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=env,
                cwd=Path(self.gophone_path).parent
            )

            # Wait for registration confirmation
            await asyncio.sleep(2)

            if self.process.poll() is not None:
                output = self.process.stdout.read() if self.process.stdout else ""
                logger.error(f"GoPhone process terminated: {output}")
                return False

            self.is_registered = True
            logger.info(f"Extension {self.config.extension} registered successfully")
            return True

        except Exception as e:
            logger.error(f"Registration failed for {self.config.extension}: {e}")
            return False

    async def stop(self) -> bool:
        """
        Stop gophone process (works for both server and registered endpoint).

        Returns:
            True if stop successful
        """
        if not self.process:
            logger.warning(f"GoPhone process not running")
            return True

        try:
            self.process.terminate()
            try:
                await asyncio.wait_for(
                    asyncio.create_subprocess_exec("wait", str(self.process.pid)),
                    timeout=5.0
                )
            except asyncio.TimeoutError:
                self.process.kill()

            self.process = None
            self.is_registered = False
            self.call_active = False
            logger.info(f"GoPhone process stopped")
            return True

        except Exception as e:
            logger.error(f"Failed to stop GoPhone process: {e}")
            return False

    async def unregister(self) -> bool:
        """
        Unregister SIP endpoint (alias for stop()).

        Returns:
            True if unregistration successful
        """
        if not self.is_registered:
            logger.warning(f"Extension {self.config.extension} not registered")
            return True

        result = await self.stop()
        if result:
            logger.info(f"Extension {self.config.extension} unregistered")
        return result

    async def dial(self, destination: str, dtmf: Optional[str] = None,
                   dtmf_delay: int = 3, timeout: int = 30) -> bool:
        """
        Make outbound call to destination.

        Args:
            destination: SIP URI or extension number
            dtmf: DTMF digits to send after call answer (e.g., "##203" for blind transfer)
            dtmf_delay: Delay in seconds before sending DTMF (default: 3s)
            timeout: Call timeout in seconds

        Returns:
            True if call connected, False otherwise

        Example:
            await endpoint.dial("202")
            await endpoint.dial("202", dtmf="##203")  # Blind transfer to 203
            await endpoint.dial("sip:echo@server:5060")
        """
        if self.call_active:
            logger.warning(f"Extension {self.config.extension} already in call")
            return False

        # Format destination as SIP URI
        if not destination.startswith("sip:"):
            destination = f"sip:{destination}@{self.config.server_ip}:{self.config.server_port}"

        cmd = [
            self.gophone_path,
            "dial",
            f"-ua={self.config.extension}",
            f"-username={self.config.extension}",
            f"-password={self.config.password}",
            f"-ua_host={self.config.server_ip}",  # Critical: Sets From header host correctly
            f"-l={self.config.listen_ip}:{self.config.listen_port}",
            destination
        ]

        if self.config.media:
            cmd.append(f"-media={self.config.media}")

        # Add DTMF support
        if dtmf:
            cmd.append(f"-dtmf={dtmf}")
            cmd.append(f"-dtmf_delay={dtmf_delay}s")
            logger.info(f"Will send DTMF '{dtmf}' after {dtmf_delay}s delay")

        logger.info(f"Dialing from {self.config.extension} to {destination}")

        try:
            env = os.environ.copy()
            env["LOG_LEVEL"] = "info"

            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=env,
                cwd=Path(self.gophone_path).parent
            )

            # Wait for call to connect
            await asyncio.sleep(2)

            if self.process.poll() is not None:
                output = self.process.stdout.read() if self.process.stdout else ""
                logger.error(f"Dial failed: {output}")
                return False

            self.call_active = True
            logger.info(f"Call from {self.config.extension} to {destination} connected")
            return True

        except Exception as e:
            logger.error(f"Dial failed: {e}")
            return False

    async def hangup(self) -> bool:
        """
        Hangup active call.

        Returns:
            True if hangup successful
        """
        if not self.call_active:
            logger.warning(f"Extension {self.config.extension} has no active call")
            return True

        if self.process:
            try:
                self.process.terminate()
                await asyncio.sleep(1)

                if self.process.poll() is None:
                    self.process.kill()

                self.process = None
                self.call_active = False
                logger.info(f"Extension {self.config.extension} hung up")
                return True

            except Exception as e:
                logger.error(f"Hangup failed: {e}")
                return False

        return True

    async def send_dtmf(self, digits: str, delay: int = 8, digit_delay: int = 1) -> bool:
        """
        Send DTMF tones during call.

        Args:
            digits: DTMF digits to send (0-9, *, #)
            delay: Delay before sending DTMF (seconds)
            digit_delay: Delay between digits (seconds)

        Returns:
            True if DTMF sent successfully

        Note:
            Currently requires starting new call with DTMF parameters.
            Interactive mode would be better but requires stdin handling.
        """
        logger.warning("DTMF sending requires -dtmf flag at dial time")
        return False

    def get_output(self) -> str:
        """
        Get captured output from gophone process.

        Returns:
            Process output as string
        """
        if self.process and self.process.stdout:
            try:
                # Non-blocking read
                import select
                if select.select([self.process.stdout], [], [], 0)[0]:
                    output = self.process.stdout.read()
                    self._output_buffer.append(output)
                    return output
            except Exception as e:
                logger.debug(f"Could not read output: {e}")

        return ""

    async def wait_for_call(self, timeout: int = 30) -> bool:
        """
        Wait for incoming call (when in answer mode).

        Args:
            timeout: Wait timeout in seconds

        Returns:
            True if call received and answered
        """
        start_time = asyncio.get_event_loop().time()

        while asyncio.get_event_loop().time() - start_time < timeout:
            output = self.get_output()

            # Look for call indicators in output
            if "INVITE" in output or "Answering" in output:
                self.call_active = True
                logger.info(f"Extension {self.config.extension} answered call")
                return True

            await asyncio.sleep(0.5)

        logger.warning(f"No incoming call received within {timeout}s")
        return False

    def __del__(self):
        """Cleanup on deletion"""
        if self.process:
            try:
                self.process.terminate()
            except:
                pass


class GoPhoneManager:
    """
    Manager for multiple GoPhone endpoints.

    Simplifies testing with multiple SIP endpoints.
    """

    def __init__(self, server_ip: str, gophone_path: str = "./gophone"):
        """
        Initialize GoPhone manager.

        Args:
            server_ip: MikoPBX server IP address
            gophone_path: Path to gophone binary
        """
        self.server_ip = server_ip
        self.gophone_path = gophone_path
        self.endpoints: Dict[str, GoPhoneEndpoint] = {}

    async def create_endpoint(
        self,
        extension: str,
        password: str,
        auto_register: bool = True
    ) -> GoPhoneEndpoint:
        """
        Create and optionally register SIP endpoint.

        Args:
            extension: Extension number
            password: SIP password
            auto_register: Auto-register after creation

        Returns:
            GoPhoneEndpoint instance

        Example:
            manager = GoPhoneManager("192.168.107.3")
            ext201 = await manager.create_endpoint("201", "pass123")
        """
        config = GoPhoneConfig(
            extension=extension,
            password=password,
            server_ip=self.server_ip
        )

        endpoint = GoPhoneEndpoint(config, self.gophone_path)

        if auto_register:
            success = await endpoint.register()
            if not success:
                raise RuntimeError(f"Failed to register extension {extension}")

        self.endpoints[extension] = endpoint
        logger.info(f"Created endpoint {extension}")

        return endpoint

    async def cleanup_all(self):
        """Cleanup all managed endpoints"""
        for ext, endpoint in self.endpoints.items():
            try:
                await endpoint.unregister()
            except Exception as e:
                logger.error(f"Failed to cleanup {ext}: {e}")

        self.endpoints.clear()
        logger.info("All endpoints cleaned up")

    def get_endpoint(self, extension: str) -> Optional[GoPhoneEndpoint]:
        """Get endpoint by extension number"""
        return self.endpoints.get(extension)


# Helper functions for pytest fixtures

async def get_mikopbx_ip() -> str:
    """
    Get MikoPBX container IP address.

    Returns:
        IP address of mikopbx-php83 container
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "inspect", "-f",
            "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
            "mikopbx-php83",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        stdout, stderr = await proc.communicate()

        if proc.returncode == 0:
            ip = stdout.decode().strip()
            logger.info(f"MikoPBX IP: {ip}")
            return ip
        else:
            logger.error(f"Failed to get container IP: {stderr.decode()}")
            return "192.168.107.3"  # fallback

    except Exception as e:
        logger.error(f"Error getting container IP: {e}")
        return "192.168.107.3"  # fallback


async def get_host_ip_for_container() -> str:
    """
    Get host IP address accessible from Docker container.

    On macOS/Windows Docker Desktop, returns resolved IP of 'host.docker.internal'.
    This allows containers to connect to services running on the host system.

    Returns:
        IP address of host accessible from container

    Example:
        host_ip = await get_host_ip_for_container()
        # Use host_ip in provider configuration for MikoPBX to connect to cipbx on host
    """
    try:
        # Try to resolve host.docker.internal from inside container
        proc = await asyncio.create_subprocess_exec(
            "docker", "exec", "mikopbx-php83",
            "getent", "hosts", "host.docker.internal",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        stdout, stderr = await proc.communicate()

        if proc.returncode == 0:
            # Output format: "IP_ADDRESS    hostname"
            output = stdout.decode().strip()
            host_ip = output.split()[0]
            logger.info(f"Host IP (from container): {host_ip}")
            return host_ip
        else:
            logger.error(f"Failed to resolve host.docker.internal: {stderr.decode()}")
            raise RuntimeError(f"Could not resolve host IP: {stderr.decode()}")

    except Exception as e:
        logger.error(f"Error getting host IP: {e}")
        raise


async def get_extension_password(extension: str) -> Optional[str]:
    """
    Get extension password from MikoPBX via API.

    Args:
        extension: Extension number

    Returns:
        Extension password or None if not found
    """
    # This would require API helper integration
    # For now, return None to force manual password specification
    logger.warning("Auto password retrieval not implemented")
    return None
