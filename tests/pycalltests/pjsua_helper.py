"""
PJSUA2 SIP Softphone Helper for MikoPBX Testing

This module provides Python wrapper for PJSUA2 library to enable
automated SIP testing in pytest. It provides a robust SIP client
that properly creates CDR records and supports all required features.
"""

import asyncio
import logging
import os
import sys
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Dict

# Detect platform and add appropriate pjsua2 library to path
import platform
system = platform.system().lower()  # 'darwin' or 'linux'
machine = platform.machine().lower()  # 'arm64', 'aarch64', 'x86_64'

# Normalize machine arch
if machine == 'aarch64':
    machine = 'arm64'

pjsua2_lib_path = Path(__file__).parent / "bin" / "pjsua2" / f"{system}-{machine}"
sys.path.insert(0, str(pjsua2_lib_path))

# Set library path for dynamic loading
if system == 'darwin':
    if 'DYLD_LIBRARY_PATH' in os.environ:
        os.environ['DYLD_LIBRARY_PATH'] = f"{pjsua2_lib_path}:{os.environ['DYLD_LIBRARY_PATH']}"
    else:
        os.environ['DYLD_LIBRARY_PATH'] = str(pjsua2_lib_path)
elif system == 'linux':
    if 'LD_LIBRARY_PATH' in os.environ:
        os.environ['LD_LIBRARY_PATH'] = f"{pjsua2_lib_path}:{os.environ['LD_LIBRARY_PATH']}"
    else:
        os.environ['LD_LIBRARY_PATH'] = str(pjsua2_lib_path)

import pjsua2 as pj

# Add parent directory to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
from config import get_config

logger = logging.getLogger(__name__)


@dataclass
class PJSUAConfig:
    """Configuration for PJSUA endpoint"""
    extension: str
    password: str
    server_ip: str
    server_port: int = 5060
    transport: str = "udp"
    listen_ip: str = "0.0.0.0"
    listen_port: int = 0
    media: Optional[str] = None
    auto_answer: bool = False


class PJSUAAccount(pj.Account):
    """Custom Account class with event handlers for PJSUA2"""

    def __init__(self):
        pj.Account.__init__(self)
        self.loop = None
        self.registration_future: Optional[asyncio.Future] = None
        self.auto_answer: bool = False
        self.incoming_calls: list = []  # Store incoming calls to prevent garbage collection
        self.logger = logging.getLogger(f"{__name__}.Account")

    def set_loop(self, loop):
        """Set the asyncio event loop for callbacks"""
        self.loop = loop

    def onRegState(self, prm):
        """Called when registration state changes (CALLBACK - not polling)"""
        try:
            ai = self.getInfo()
            status = ai.regStatus
            # regReason doesn't exist in AccountInfo, use regStatusText instead
            reason = getattr(ai, 'regStatusText', 'Unknown')
            self.logger.info(f"[CALLBACK] onRegState fired: status={status}, reason={reason}")

            # Handle registration errors - log them even if no future waiting
            if status >= 400:
                error = RuntimeError(f"Registration failed: {status} - {reason}")
                if self.registration_future and not self.registration_future.done():
                    self.logger.error(f"[CALLBACK] Registration failed with status {status}, rejecting future")
                    if self.loop:
                        self.loop.call_soon_threadsafe(
                            self.registration_future.set_exception,
                            error
                        )
                else:
                    # Log errors even if no future waiting (race condition or polling mode)
                    self.logger.error(f"[CALLBACK] Registration failed but no future to notify: {error}")
            elif status == 200:
                if self.registration_future and not self.registration_future.done():
                    self.logger.info(f"[CALLBACK] Registration successful, resolving future")
                    if self.loop:
                        self.loop.call_soon_threadsafe(self.registration_future.set_result, True)
                else:
                    self.logger.debug(f"[CALLBACK] Registration successful but future already resolved or not set")
            else:
                self.logger.debug(f"[CALLBACK] onRegState called with status {status} (future state: {'done' if self.registration_future and self.registration_future.done() else 'waiting'})")
        except Exception as e:
            self.logger.error(f"[CALLBACK] Error in onRegState: {e}", exc_info=True)
            if self.registration_future and not self.registration_future.done() and self.loop:
                self.loop.call_soon_threadsafe(self.registration_future.set_exception, e)

    def clear_incoming_calls(self):
        """Clear stored incoming call objects to prevent memory leak"""
        self.incoming_calls.clear()

    def onIncomingCall(self, prm):
        """Called when receiving incoming call - auto-answer if enabled"""
        try:
            call = PJSUACall(self, prm.callId)
            call.set_loop(self.loop)

            # CRITICAL: Store call object to prevent garbage collection
            # Without this, the call object gets destroyed and PJSUA sends 603 Decline automatically
            # Note: Call clear_incoming_calls() after test to prevent memory leak
            self.incoming_calls.append(call)

            call_info = call.getInfo()

            if self.auto_answer:
                self.logger.info(f"Incoming call from {call_info.remoteUri} - auto-answering")
                # Auto-answer the call
                call_op_param = pj.CallOpParam()
                call_op_param.statusCode = 200
                call.answer(call_op_param)
                self.logger.info("Call auto-answered successfully")
            else:
                self.logger.info(f"Incoming call from {call_info.remoteUri} - NOT answering (auto_answer=False)")
        except Exception as e:
            self.logger.error(f"Error handling incoming call: {e}", exc_info=True)


class PJSUACall(pj.Call):
    """Custom Call class with event handlers for PJSUA2"""

    def __init__(self, account, call_id=pj.PJSUA_INVALID_ID):
        pj.Call.__init__(self, account, call_id)
        self.loop = None
        self.call_future: Optional[asyncio.Future] = None
        self.logger = logging.getLogger(f"{__name__}.Call")

    def set_loop(self, loop):
        """Set the asyncio event loop for callbacks"""
        self.loop = loop

    def onCallState(self, prm):
        """Called when call state changes (CALLBACK - not polling)"""
        try:
            ci = self.getInfo()
            state = ci.state
            state_text = ci.stateText
            last_status = ci.lastStatusCode

            # Log authentication challenges for debugging
            if last_status == pj.PJSIP_SC_UNAUTHORIZED:
                self.logger.warning(f"[CALLBACK] Received 401 Unauthorized - PJSUA2 should auto-retry with credentials")
                self.logger.warning(f"[CALLBACK] If call fails, check that realm='*' in AuthCredInfo")

            self.logger.info(f"[CALLBACK] onCallState fired: {state_text} ({state}), lastStatus={last_status}")

            # Handle call states - log important states even if no future waiting
            if state == pj.PJSIP_INV_STATE_CONFIRMED:
                if self.call_future and not self.call_future.done():
                    self.logger.info(f"[CALLBACK] Call confirmed, resolving future")
                    if self.loop:
                        self.loop.call_soon_threadsafe(self.call_future.set_result, True)
                else:
                    self.logger.debug(f"[CALLBACK] Call confirmed but future already resolved or not set")
            elif state == pj.PJSIP_INV_STATE_DISCONNECTED:
                # Log disconnection details even if no future waiting
                disconnect_reason = f"lastStatus={last_status}, state={state_text}"
                if last_status >= 400:
                    # This is an error condition - log as error
                    if self.call_future and not self.call_future.done():
                        self.logger.error(f"[CALLBACK] Call failed: {disconnect_reason}, resolving future with False")
                        if self.loop:
                            self.loop.call_soon_threadsafe(self.call_future.set_result, False)
                    else:
                        # Log errors even if no future waiting (race condition or polling mode)
                        self.logger.error(f"[CALLBACK] Call failed but no future to notify: {disconnect_reason}")
                else:
                    # Normal disconnection
                    if self.call_future and not self.call_future.done():
                        self.logger.info(f"[CALLBACK] Call disconnected, resolving future with False")
                        if self.loop:
                            self.loop.call_soon_threadsafe(self.call_future.set_result, False)
                    else:
                        self.logger.debug(f"[CALLBACK] Call disconnected but future already resolved or not set")
            else:
                self.logger.debug(f"[CALLBACK] onCallState intermediate state: {state_text} (future state: {'done' if self.call_future and self.call_future.done() else 'waiting'})")
        except Exception as e:
            self.logger.error(f"[CALLBACK] Error in onCallState: {e}", exc_info=True)
            if self.call_future and not self.call_future.done() and self.loop:
                self.loop.call_soon_threadsafe(self.call_future.set_exception, e)

    def onCallMediaState(self, prm):
        """Called when media state changes"""
        try:
            ci = self.getInfo()
            for mi in ci.media:
                if mi.type == pj.PJMEDIA_TYPE_AUDIO:
                    if mi.status == pj.PJSUA_CALL_MEDIA_ACTIVE or \
                       mi.status == pj.PJSUA_CALL_MEDIA_REMOTE_HOLD:
                        call_media = self.getMedia(mi.index)
                        aud_media = pj.AudioMedia.typecastFromMedia(call_media)
                        pj.Endpoint.instance().audDevManager().getCaptureDevMedia().startTransmit(aud_media)
                        aud_media.startTransmit(pj.Endpoint.instance().audDevManager().getPlaybackDevMedia())
                        self.logger.info("Media active - audio connected")
        except Exception as e:
            self.logger.error(f"Error in onCallMediaState: {e}")


class PJSUAEndpoint:
    """Represents a SIP endpoint using PJSUA2 library"""

    def __init__(self, config: PJSUAConfig):
        self.config = config
        self.account: Optional[PJSUAAccount] = None
        self.call: Optional[PJSUACall] = None
        self.is_registered = False
        self.call_active = False
        self.loop = asyncio.get_event_loop()
        logger.info(f"PJSUA endpoint created for extension {config.extension}")

    async def register(self, timeout: int = 15) -> bool:
        """Register endpoint using status polling approach

        This method polls account.getInfo().regStatus to determine registration status.
        Polling is more reliable than callbacks for Python PJSIP bindings.
        """
        if self.is_registered:
            logger.info(f"Extension {self.config.extension} already registered")
            return True

        try:
            logger.info(f"Starting polling-based registration for {self.config.extension}@{self.config.server_ip}")

            acc_cfg = pj.AccountConfig()
            # CRITICAL: idUri must include display name AND angle brackets for RFC 3261 compliance
            # Asterisk's PJSIP transport rejects SIP messages with malformed From/To headers
            # Format: "Display Name" <sip:user@host>
            # Without display name, PJSUA strips angle brackets in INVITE From headers
            # causing Asterisk to silently drop authenticated INVITE messages
            acc_cfg.idUri = f'"{self.config.extension}" <sip:{self.config.extension}@{self.config.server_ip}>'
            acc_cfg.regConfig.registrarUri = f"sip:{self.config.server_ip}:{self.config.server_port}"

            # Configure media transport to bind to Docker bridge interface
            if PJSUAManager._local_ip:
                acc_cfg.mediaConfig.transportConfig.boundAddress = PJSUAManager._local_ip
                print(f"[PJSUA_HELPER] Setting account media boundAddress: {PJSUAManager._local_ip}", flush=True)
                logger.info(f"Account {self.config.extension}: media bound to {PJSUAManager._local_ip}")

            # Use "asterisk" realm to match MikoPBX authentication challenges
            # PJSUA2 will automatically handle 401 responses to INVITE with these credentials
            cred = pj.AuthCredInfo("digest", "asterisk", self.config.extension, 0, self.config.password)
            acc_cfg.sipConfig.authCreds.append(cred)

            self.account = PJSUAAccount()
            self.account.set_loop(self.loop)
            self.account.auto_answer = self.config.auto_answer

            # Create account - this will automatically start registration
            self.account.create(acc_cfg)
            logger.debug(f"Account created, polling registration status (timeout={timeout}s)...")

            # Poll registration status until success or timeout
            import time
            start_time = time.monotonic()
            poll_interval = 0.1  # 100ms between checks

            while True:
                elapsed = time.monotonic() - start_time
                if elapsed >= timeout:
                    logger.error(f"✗ Registration timeout after {timeout}s")
                    return False

                try:
                    acc_info = self.account.getInfo()
                    status = acc_info.regStatus
                    status_text = getattr(acc_info, 'regStatusText', 'Unknown')

                    if status == 200:
                        # Registration successful
                        self.is_registered = True
                        logger.info(f"✓ Extension {self.config.extension} registered successfully (status={status})")

                        # Wait briefly to ensure Asterisk has processed the registration
                        # This prevents race conditions where INVITE is sent before Asterisk's
                        # contact database is updated
                        await asyncio.sleep(1.0)
                        logger.debug("Registration stabilization delay complete")

                        return True
                    elif status >= 400:
                        # Registration failed with error
                        logger.error(f"✗ Registration failed: {status} - {status_text}")
                        return False
                    else:
                        # Still in progress (e.g., 0 = not registered yet, 100 = trying)
                        logger.debug(f"Registration in progress: status={status}, elapsed={elapsed:.1f}s")

                except Exception as e:
                    logger.debug(f"Error checking registration status: {e}")

                # Wait before next poll
                await asyncio.sleep(poll_interval)

        except Exception as e:
            logger.error(f"✗ Registration exception: {e}")
            return False

    async def dial(self, destination: str, dtmf: Optional[str] = None,
                   dtmf_delay: int = 3, timeout: int = 30) -> bool:
        if self.call_active or not self.is_registered:
            return False

        try:
            if not destination.startswith("sip:"):
                # Create destination URI matching working SIP clients exactly
                # Working (228): INVITE sip:10003246@192.168.107.2 SIP/2.0
                # Previous failing (201): INVITE sip:10003246@192.168.107.2;transport=udp SIP/2.0
                # Removed both port and transport parameter to match working format
                dest_uri = f"sip:{destination}@{self.config.server_ip}"
            else:
                dest_uri = destination

            logger.info(f"Dialing to {dest_uri}")

            self.call = PJSUACall(self.account)
            self.call.set_loop(self.loop)

            call_prm = pj.CallOpParam()
            call_prm.opt.audioCount = 1
            call_prm.opt.videoCount = 0

            self.call.makeCall(dest_uri, call_prm)

            # Give PJSUA immediate chance to send the INVITE
            # Without this, makeCall() queues the INVITE but doesn't send it immediately
            PJSUAManager._endpoint.libHandleEvents(100)  # Process for up to 100ms
            await asyncio.sleep(0.1)  # Brief pause to allow network transmission
            logger.info("INVITE queued and processed by PJSUA")

            # Poll call state until connected or timeout
            import time
            start_time = time.monotonic()
            poll_interval = 0.1  # 100ms between checks
            early_media_detected = False  # Track if we've seen 183/200 response

            while True:
                # CRITICAL: Process PJSUA events to receive SIP responses (100 Trying, 200 OK, etc.)
                # Without this, incoming SIP messages are queued but not processed, so call state never updates
                PJSUAManager._endpoint.libHandleEvents(10)  # Process for up to 10ms

                elapsed = time.monotonic() - start_time
                if elapsed >= timeout:
                    logger.error(f"✗ Call timeout after {timeout}s")
                    await self.hangup()
                    return False

                try:
                    call_info = self.call.getInfo()
                    state = call_info.state
                    state_text = call_info.stateText
                    last_status = call_info.lastStatusCode

                    # Detect early media (183 Session Progress) or immediate answer (200 OK)
                    # ConfBridge answers immediately with 200 OK, need to wait for media setup
                    if not early_media_detected and last_status in (183, 200):
                        early_media_detected = True
                        logger.info(f"Early media/answer detected (status={last_status}), waiting for media setup...")
                        # Give PJSUA time to process SDP and establish RTP
                        await asyncio.sleep(0.5)
                        # Process more events after delay
                        PJSUAManager._endpoint.libHandleEvents(50)

                    if state == pj.PJSIP_INV_STATE_CONFIRMED:
                        # Call connected
                        self.call_active = True
                        logger.info(f"✓ Call connected ({state_text})")
                        if dtmf:
                            await asyncio.sleep(dtmf_delay)
                            await self.send_dtmf(dtmf)
                        return True
                    elif state == pj.PJSIP_INV_STATE_DISCONNECTED:
                        # Call failed or ended
                        # Note: Even if we saw 200 OK, DISCONNECTED means call is no longer active
                        # Don't set call_active=True for disconnected calls - that causes resource issues
                        if early_media_detected and last_status == 200:
                            logger.warning(f"Call disconnected after 200 OK - call was briefly connected but is now terminated")
                        logger.error(f"✗ Call disconnected ({state_text})")
                        self.call_active = False
                        await self.hangup()
                        return False
                    else:
                        # Call in progress
                        logger.debug(f"Call state: {state_text}, elapsed={elapsed:.1f}s")

                except Exception as e:
                    # Call object may become invalid after disconnect
                    # Don't treat this as success - if call object is invalid, the call has ended
                    if early_media_detected:
                        logger.warning(f"Call info unavailable after 200 OK - call has terminated")
                    logger.debug(f"Error checking call state (call may be terminated): {e}")
                    self.call_active = False
                    return False

                # Wait before next poll
                await asyncio.sleep(poll_interval)

        except Exception as e:
            logger.error(f"Dial failed: {e}")
            return False

    async def hangup(self) -> bool:
        if not self.call_active and not self.call:
            return True

        try:
            if self.call:
                prm = pj.CallOpParam()
                self.call.hangup(prm)
                await asyncio.sleep(0.5)
                self.call = None
                self.call_active = False
            return True
        except Exception as e:
            logger.error(f"Hangup failed: {e}")
            return False

    async def send_dtmf(self, digits: str, delay: int = 0, digit_delay: int = 1) -> bool:
        if not self.call_active or not self.call:
            return False

        try:
            if delay > 0:
                await asyncio.sleep(delay)
            self.call.dialDtmf(digits)
            return True
        except Exception as e:
            logger.error(f"DTMF failed: {e}")
            return False

    async def wait_for_disconnect(self, timeout: int = 15) -> bool:
        """Wait for the call to be disconnected by the remote side.

        Polls call state until DISCONNECTED or timeout.
        Returns True if call disconnected, False if still active after timeout.
        Useful for attended transfer scenarios where Asterisk disconnects the
        transferor's leg after transfer completion.
        """
        if not self.call:
            return True

        import time
        start_time = time.monotonic()
        poll_interval = 0.1

        while True:
            elapsed = time.monotonic() - start_time
            if elapsed >= timeout:
                logger.info(f"wait_for_disconnect: call still active after {timeout}s")
                return False

            try:
                call_info = self.call.getInfo()
                state = call_info.state
                if state == pj.PJSIP_INV_STATE_DISCONNECTED:
                    logger.info(f"wait_for_disconnect: call disconnected after {elapsed:.1f}s")
                    self.call_active = False
                    self.call = None
                    return True
            except Exception:
                # Call object invalid — already disconnected
                self.call_active = False
                self.call = None
                return True

            await asyncio.sleep(poll_interval)

    async def unregister(self) -> bool:
        if not self.is_registered:
            return True

        try:
            if self.call_active:
                await self.hangup()
            if self.account:
                self.account.setRegistration(False)
                await asyncio.sleep(1)
                self.account = None
            self.is_registered = False
            return True
        except Exception as e:
            logger.error(f"Unregister failed: {e}")
            return False

    async def stop(self) -> bool:
        return await self.unregister()


class PJSUAManager:
    """Manager for multiple PJSUA endpoints"""

    _endpoint_initialized = False
    _endpoint_lock = threading.Lock()
    _endpoint: Optional[pj.Endpoint] = None
    _event_handler_task: Optional[asyncio.Task] = None
    _running = False
    _local_ip: Optional[str] = None  # Docker bridge IP for RTP media

    def __init__(self, server_ip: str):
        self.server_ip = server_ip
        self.endpoints: Dict[str, PJSUAEndpoint] = {}
        self._init_endpoint()
        self._initialized = False

    async def initialize(self):
        """Initialize async components (must be called from async context)"""
        # Always check class-level state, not instance state
        # Event handler is shared across all manager instances
        if (PJSUAManager._event_handler_task is None or
            PJSUAManager._event_handler_task.done() or
            not PJSUAManager._running):

            PJSUAManager._running = True
            loop = asyncio.get_running_loop()  # Get the actual running loop
            PJSUAManager._event_handler_task = loop.create_task(self._handle_events())
            logger.info(f"Event handler restarted on loop {id(loop)}")
        else:
            logger.info(f"Event handler already running")

        self._initialized = True

    async def _handle_events(self):
        """Background task to handle PJSIP events (required for callbacks to fire)

        This is NOT status polling - this is the PJSIP event pump that allows
        callbacks like onRegState and onCallState to be invoked.

        IMPORTANT: libHandleEvents() must be called from the main thread (asyncio loop thread),
        NOT from an executor, as PJSIP doesn't allow calls from unknown threads.
        """
        logger.info(f"PJSIP event handler loop starting (_running={PJSUAManager._running})")
        event_count = 0
        while PJSUAManager._running:
            try:
                if event_count == 0:
                    logger.info("First iteration of event handler loop")
                if PJSUAManager._endpoint:
                    # Call libHandleEvents directly (must be from main thread)
                    PJSUAManager._endpoint.libHandleEvents(10)  # 10ms max processing time
                    event_count += 1
                    # Log every 50 iterations (~0.5 second) to confirm event loop is running
                    if event_count % 50 == 0:
                        logger.info(f"Event handler processing: {event_count} iterations")
                await asyncio.sleep(0.01)  # 10ms polling interval
            except Exception as e:
                logger.error(f"Event handler error: {e}")
                await asyncio.sleep(0.1)
        logger.info(f"PJSIP event handler stopped (_running={PJSUAManager._running})")

    def _init_endpoint(self):
        with self._endpoint_lock:
            if not PJSUAManager._endpoint_initialized:
                try:
                    PJSUAManager._endpoint = pj.Endpoint()
                    PJSUAManager._endpoint.libCreate()

                    ep_cfg = pj.EpConfig()
                    ep_cfg.uaConfig.threadCnt = 0
                    ep_cfg.uaConfig.mainThreadOnly = True

                    log_cfg = pj.LogConfig()
                    log_cfg.level = 4
                    log_cfg.consoleLevel = 4
                    ep_cfg.logConfig = log_cfg

                    # Configure media public address for RTP
                    # Determine local IP that routes to MikoPBX server
                    import socket
                    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    try:
                        s.connect((self.server_ip, 5060))
                        local_ip = s.getsockname()[0]
                    finally:
                        s.close()

                    # Store for use in AccountConfig later
                    PJSUAManager._local_ip = local_ip
                    print(f"\n[PJSUA_HELPER] Detected Docker bridge IP for RTP: {local_ip}", flush=True)
                    ep_cfg.medConfig.publicAddress = local_ip
                    logger.info(f"Setting media public address for RTP: {local_ip}")

                    PJSUAManager._endpoint.libInit(ep_cfg)

                    # Configure UDP transport to bind to specific interface
                    # This prevents PJSUA from choosing wrong interface (bridge102)
                    transport_cfg = pj.TransportConfig()
                    transport_cfg.port = 0
                    transport_cfg.boundAddress = local_ip  # Bind to Docker bridge interface
                    print(f"[PJSUA_HELPER] Binding PJSUA transport to interface: {local_ip}", flush=True)
                    logger.info(f"Binding PJSUA transport to interface: {local_ip}")
                    PJSUAManager._endpoint.transportCreate(pj.PJSIP_TRANSPORT_UDP, transport_cfg)

                    PJSUAManager._endpoint.libStart()

                    # Configure null audio device for headless environments (Docker)
                    # This MUST be called AFTER libStart() but BEFORE making calls
                    try:
                        PJSUAManager._endpoint.audDevManager().setNullDev()
                        print(f"[PJSUA_HELPER] Null audio device configured (headless mode)", flush=True)
                        logger.info("Null audio device configured for headless Docker environment")
                    except Exception as audio_err:
                        logger.warning(f"Could not set null audio device: {audio_err}")

                    # Give the endpoint a moment to fully initialize
                    import time
                    time.sleep(0.1)

                    PJSUAManager._endpoint_initialized = True
                    logger.info("PJSUA endpoint initialized")
                except Exception as e:
                    logger.error(f"Init failed: {e}")
                    raise

    async def create_endpoint(self, extension: str, password: str,
                            auto_register: bool = True, auto_answer: bool = False) -> PJSUAEndpoint:
        config = PJSUAConfig(
            extension=extension,
            password=password,
            server_ip=self.server_ip,
            auto_answer=auto_answer
        )

        endpoint = PJSUAEndpoint(config)

        # Give event handler time to start processing
        await asyncio.sleep(0.1)

        if auto_register:
            success = await endpoint.register()
            if not success:
                raise RuntimeError(f"Failed to register {extension}")

        self.endpoints[extension] = endpoint
        return endpoint

    async def cleanup_all(self):
        logger.info("cleanup_all() called - unregistering endpoints (keeping event handler running)")
        for ext, endpoint in list(self.endpoints.items()):
            try:
                # Clear incoming calls list to prevent memory leak
                if endpoint.account:
                    endpoint.account.clear_incoming_calls()
                await endpoint.unregister()
            except Exception as e:
                logger.error(f"Cleanup {ext} failed: {e}")
        self.endpoints.clear()

        # Don't stop event handler - let it run for the entire session
        # The event handler is shared across all tests and stopping it breaks subsequent tests
        logger.info("Event handler will continue running for other tests")

    def get_endpoint(self, extension: str) -> Optional[PJSUAEndpoint]:
        return self.endpoints.get(extension)

    @classmethod
    async def shutdown(cls):
        """Stop event handler and cleanup PJSIP endpoint

        This is a class method that can be called without creating a manager instance.
        It should be called at the end of the entire test session to properly release
        PJSIP resources (threads, sockets, memory pools).

        IMPORTANT: This is a class-level cleanup that affects all manager instances.
        Only call this when ALL tests are complete.

        Usage:
            await PJSUAManager.shutdown()
        """
        logger.info("shutdown() called - stopping event handler and destroying endpoint")

        # Stop the event handler task
        cls._running = False
        if cls._event_handler_task:
            logger.info("Waiting for event handler task to complete...")
            try:
                await asyncio.wait_for(cls._event_handler_task, timeout=5.0)
                logger.info("Event handler task completed gracefully")
            except asyncio.TimeoutError:
                logger.warning("Event handler task did not complete within timeout, forcing cancellation")
                cls._event_handler_task.cancel()
                try:
                    await cls._event_handler_task
                except asyncio.CancelledError:
                    logger.info("Event handler task cancelled successfully")
            except Exception as e:
                logger.error(f"Error waiting for event handler task: {e}")
            finally:
                cls._event_handler_task = None

        # Destroy the PJSIP endpoint
        if cls._endpoint:
            logger.info("Destroying PJSIP endpoint with libDestroy()")
            try:
                cls._endpoint.libDestroy()
                logger.info("PJSIP endpoint destroyed successfully")
            except Exception as e:
                logger.error(f"Error destroying PJSIP endpoint: {e}")
            finally:
                cls._endpoint = None
                cls._endpoint_initialized = False

        logger.info("PJSUA2 shutdown complete")


async def get_mikopbx_ip() -> str:
    """Get MikoPBX IP address for SIP registration

    Returns actual IP address by:
    - If running inside Docker container: use Docker DNS name resolution
    - If running outside Docker: inspect container to get IP
    """
    import subprocess
    import socket
    config = get_config()

    # Check if we're running inside a Docker container
    # If MIKOPBX_CONTAINER_NAME env var is set, we're in a container
    mikopbx_container = os.environ.get('MIKOPBX_CONTAINER_NAME', config.container_name)

    try:
        # Try to resolve container name via Docker DNS (works inside container)
        # Docker provides automatic DNS resolution for container names
        try:
            ip = socket.gethostbyname(mikopbx_container)
            logger.info(f"Resolved MikoPBX container '{mikopbx_container}' via Docker DNS: {ip}")
            return ip
        except socket.gaierror:
            # DNS resolution failed - we're probably outside Docker
            logger.debug(f"Docker DNS resolution failed, trying docker inspect...")

        # Fallback to docker inspect (works outside container on host)
        result = subprocess.run(
            ['docker', 'inspect', '-f',
             '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',
             mikopbx_container],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            ip = result.stdout.strip()
            logger.info(f"Got MikoPBX IP from docker inspect {mikopbx_container}: {ip}")
            return ip
    except Exception as e:
        logger.error(f"Failed to get MikoPBX IP: {e}")
        raise RuntimeError(f"Cannot determine MikoPBX IP address")

    raise RuntimeError(f"Cannot determine MikoPBX IP address")
