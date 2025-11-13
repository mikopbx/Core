"""
CipBX SIP Provider Helper for MikoPBX Testing

This module provides Python wrapper for cipbx CLI tool to enable
automated SIP provider/trunk simulation in pytest.

CipBX runs locally on the host system (not in container).

CipBX Repository: https://github.com/arthur-s/cipbx
"""

import asyncio
import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, List

logger = logging.getLogger(__name__)


@dataclass
class CipBXConfig:
    """Configuration for CipBX provider instance"""

    listen_ip: str = "0.0.0.0"
    listen_port: int = 5070
    transport: str = "udp"
    username: Optional[str] = None  # For digest authentication
    password: Optional[str] = None
    timeout: Optional[int] = None  # Auto-hangup after N seconds
    expect_payload: Optional[str] = None  # RTP payload validation (e.g., "0x55")


class CipBXProvider:
    """
    Represents a SIP provider/trunk using cipbx CLI tool.

    cipbx is a minimalistic VoIP echo server for CI/CD testing.
    Use this to simulate external SIP providers/trunks.

    Features:
    - Echo server (routes calls to echo@domain)
    - Digest authentication support
    - Auto-hangup timeout
    - RTP payload validation
    - Multiple transports: UDP, TCP, TLS, WebSocket

    cipbx always runs locally on the host system.
    """

    def __init__(self, config: CipBXConfig, cipbx_path: str = "./cipbx"):
        """
        Initialize CipBX provider.

        Args:
            config: CipBXConfig with provider settings
            cipbx_path: Path to cipbx binary on local system
        """
        self.config = config
        self.cipbx_path = cipbx_path
        self.process: Optional[subprocess.Popen] = None
        self.is_running = False
        self._output_buffer: List[str] = []

    async def start(self, timeout: int = 3) -> bool:
        """
        Start cipbx as SIP provider/trunk simulator on local host.

        cipbx runs as an echo server that automatically answers calls
        and echoes back RTP media. Perfect for testing provider connectivity.

        Args:
            timeout: Startup timeout in seconds

        Returns:
            True if provider started successfully, False otherwise

        Example:
            # Provider with authentication
            config = CipBXConfig(
                listen_ip="0.0.0.0",
                listen_port=5070,
                username="trunk_user",
                password="trunk_pass",
                timeout=60  # Auto-hangup after 60s
            )
            provider = CipBXProvider(config, cipbx_path="./cipbx")
            success = await provider.start()

            # Provider without authentication (IP-based trust)
            config = CipBXConfig(listen_ip="0.0.0.0", listen_port=5070)
            provider = CipBXProvider(config, cipbx_path="./cipbx")
            success = await provider.start()
        """
        if self.is_running:
            logger.warning(f"CipBX provider already running on {self.config.listen_port}")
            return True

        # Build cipbx command for local execution
        cmd = [
            self.cipbx_path,
            "-l", self.config.listen_ip,
            "-p", str(self.config.listen_port),
        ]

        # Add authentication if configured
        if self.config.username and self.config.password:
            cmd.extend([
                "-u", self.config.username,
                "-w", self.config.password,
            ])

        # Add timeout if configured
        if self.config.timeout:
            cmd.extend(["-t", str(self.config.timeout)])

        # Add transport if not UDP
        if self.config.transport != "udp":
            cmd.extend(["--transport", self.config.transport])

        # Add RTP payload validation if configured
        if self.config.expect_payload:
            cmd.extend(["--expect", self.config.expect_payload])

        logger.info(f"Starting CipBX provider locally on {self.config.listen_port}: {' '.join(cmd)}")

        try:
            # Start cipbx locally on host
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            # Wait for startup
            await asyncio.sleep(timeout)

            # Check if process is still running
            if self.process.poll() is None:
                self.is_running = True
                logger.info(f"CipBX provider started locally on {self.config.listen_ip}:{self.config.listen_port} (PID: {self.process.pid})")
                return True
            else:
                stderr = self.process.stderr.read() if self.process.stderr else ""
                logger.error(f"CipBX process terminated immediately: {stderr}")
                return False

        except Exception as e:
            logger.error(f"Failed to start CipBX provider: {e}")
            return False

    async def stop(self) -> bool:
        """
        Stop cipbx provider process.

        Returns:
            True if stop successful
        """
        if not self.is_running:
            logger.warning("CipBX provider not running")
            return True

        try:
            # Stop cipbx locally
            if self.process:
                self.process.terminate()
                try:
                    self.process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.process.kill()
                    self.process.wait()

                self.is_running = False
                logger.info(f"CipBX provider stopped locally (port {self.config.listen_port})")
                return True
            else:
                logger.warning("No process to stop")
                return False

        except Exception as e:
            logger.error(f"Failed to stop CipBX provider: {e}")
            return False

    async def get_status(self) -> dict:
        """
        Get provider status and statistics.

        Returns:
            Dict with status information
        """
        if not self.is_running:
            return {"running": False, "port": self.config.listen_port}

        try:
            # Check if process is still running
            if self.process and self.process.poll() is None:
                return {
                    "running": True,
                    "port": self.config.listen_port,
                    "listen_ip": self.config.listen_ip,
                    "auth_enabled": bool(self.config.username),
                    "timeout": self.config.timeout,
                    "pid": self.process.pid
                }
            else:
                self.is_running = False
                return {"running": False, "port": self.config.listen_port}

        except Exception as e:
            logger.error(f"Failed to get provider status: {e}")
            return {"running": False, "error": str(e)}

    def __del__(self):
        """Cleanup on deletion"""
        if self.is_running and self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=2)
            except:
                pass


class CipBXManager:
    """
    Manager for multiple CipBX provider instances.

    Simplifies testing with multiple SIP providers/trunks.
    All providers run locally on the host system.
    """

    def __init__(self, cipbx_path: str = "./cipbx"):
        """
        Initialize CipBX manager.

        Args:
            cipbx_path: Path to cipbx binary on local system
        """
        self.cipbx_path = cipbx_path
        self.providers: dict[int, CipBXProvider] = {}

    async def create_provider(
        self,
        port: int,
        username: Optional[str] = None,
        password: Optional[str] = None,
        timeout: Optional[int] = None,
        auto_start: bool = True
    ) -> CipBXProvider:
        """
        Create and optionally start SIP provider.

        Args:
            port: Listen port for provider
            username: Username for digest authentication (optional)
            password: Password for digest authentication (optional)
            timeout: Auto-hangup timeout in seconds (optional)
            auto_start: Auto-start provider after creation

        Returns:
            CipBXProvider instance

        Example:
            manager = CipBXManager(cipbx_path="./cipbx")

            # Provider with authentication
            provider1 = await manager.create_provider(
                port=5070,
                username="trunk1",
                password="pass123",
                timeout=60
            )

            # Provider without authentication
            provider2 = await manager.create_provider(port=5071)
        """
        config = CipBXConfig(
            listen_ip="0.0.0.0",
            listen_port=port,
            username=username,
            password=password,
            timeout=timeout
        )

        provider = CipBXProvider(config, self.cipbx_path)

        if auto_start:
            success = await provider.start()
            if not success:
                raise RuntimeError(f"Failed to start provider on port {port}")

        self.providers[port] = provider
        logger.info(f"Created provider on port {port}")

        return provider

    async def cleanup_all(self):
        """Cleanup all managed providers"""
        for port, provider in self.providers.items():
            try:
                await provider.stop()
            except Exception as e:
                logger.error(f"Failed to cleanup provider on port {port}: {e}")

        self.providers.clear()
        logger.info("All providers cleaned up")

    def get_provider(self, port: int) -> Optional[CipBXProvider]:
        """Get provider by port number"""
        return self.providers.get(port)
