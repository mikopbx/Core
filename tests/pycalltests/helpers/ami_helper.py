"""AMI Event Watcher - Async AMI client for simulating external CTI module behavior.

Connects to Asterisk Manager Interface and watches for specific events.
Used to reproduce race conditions caused by external AMI clients (like cti_amid_client)
that send Hangup commands during attended transfer completion.

AMI Protocol:
- Text-based, lines separated by \\r\\n
- Messages separated by \\r\\n\\r\\n (blank line)
- Login: Action: Login\\r\\nUsername: ...\\r\\nSecret: ...\\r\\n\\r\\n
- Events arrive as multi-line blocks ending with blank line
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Optional, Callable, Awaitable

logger = logging.getLogger(__name__)


class AMIEventWatcher:
    """Async AMI client that watches for events and can take actions.

    Simulates external AMI clients like cti_amid_client that connect to
    Asterisk and react to events by sending AMI actions.

    Usage:
        watcher = AMIEventWatcher(host='127.0.0.1', port=5038)
        await watcher.start()

        async with watcher.hangup_on_attended_transfer() as ctx:
            # ... perform attended transfer ...
            pass

        # ctx.hangup_sent tells if the Hangup was fired
        # ctx.hangup_channel tells which channel was targeted
        # ctx.transfer_event contains the full AttendedTransfer event

        await watcher.stop()
    """

    def __init__(
        self,
        host: str = '127.0.0.1',
        port: int = 5038,
        username: str = 'phpagi',
        secret: str = 'phpagi',
    ):
        self.host = host
        self.port = port
        self.username = username
        self.secret = secret
        self._reader: Optional[asyncio.StreamReader] = None
        self._writer: Optional[asyncio.StreamWriter] = None
        self._event_task: Optional[asyncio.Task] = None
        self._event_handlers: list[Callable[[dict], Awaitable[None]]] = []
        self._connected = False
        self._action_id_counter = 0

    async def start(self) -> None:
        """Connect to AMI, login, and start event listener loop."""
        logger.info(f"AMI: Connecting to {self.host}:{self.port}...")
        self._reader, self._writer = await asyncio.open_connection(
            self.host, self.port
        )

        # Read AMI banner (e.g. "Asterisk Call Manager/6.0.0")
        banner = await self._reader.readline()
        logger.info(f"AMI: Banner: {banner.decode().strip()}")

        # Login
        await self._send_action({
            'Action': 'Login',
            'Username': self.username,
            'Secret': self.secret,
        })

        response = await self._read_message()
        if response.get('Response') != 'Success':
            raise ConnectionError(
                f"AMI login failed: {response.get('Message', 'unknown error')}"
            )

        logger.info("AMI: Login successful")
        self._connected = True

        # Start background event reader
        self._event_task = asyncio.create_task(self._event_loop())

    async def stop(self) -> None:
        """Logoff and disconnect from AMI."""
        if not self._connected:
            return

        self._connected = False

        if self._event_task:
            self._event_task.cancel()
            try:
                await self._event_task
            except asyncio.CancelledError:
                pass
            self._event_task = None

        try:
            await self._send_action({'Action': 'Logoff'})
        except Exception:
            pass

        if self._writer:
            self._writer.close()
            try:
                await self._writer.wait_closed()
            except Exception:
                pass

        self._reader = None
        self._writer = None
        logger.info("AMI: Disconnected")

    async def send_hangup(self, channel: str) -> dict:
        """Send AMI Hangup action for a channel.

        Args:
            channel: Asterisk channel name (e.g. 'PJSIP/201-00000003')

        Returns:
            AMI response dict
        """
        logger.info(f"AMI: Sending Hangup for channel: {channel}")
        self._action_id_counter += 1
        action_id = f"cti_hangup_{self._action_id_counter}"

        await self._send_action({
            'Action': 'Hangup',
            'Channel': channel,
            'ActionID': action_id,
        })

        return {'ActionID': action_id, 'Channel': channel}

    @asynccontextmanager
    async def hangup_on_attended_transfer(self, delay_ms: int = 0):
        """Context manager that watches for AttendedTransfer and fires Hangup.

        Simulates cti_amid_client behavior: when AttendedTransfer event
        arrives with Result:Success, immediately sends Hangup on the
        OrigTransfererChannel. This creates the race condition that causes
        the transferred call to drop.

        Args:
            delay_ms: Optional delay in milliseconds before sending Hangup.
                      0 = immediate (matches cti_amid_client behavior of ~15ms).

        Yields:
            TransferHangupContext with results after the block completes.

        Usage:
            async with watcher.hangup_on_attended_transfer() as ctx:
                # ... do the transfer ...
                pass
            print(f"Hangup sent: {ctx.hangup_sent}")
            print(f"Channel: {ctx.hangup_channel}")
        """
        ctx = TransferHangupContext()

        async def on_attended_transfer(event: dict):
            if ctx.hangup_sent:
                return  # Only fire once

            result = event.get('Result', '')
            if result != 'Success':
                logger.info(f"AMI: AttendedTransfer with Result={result}, ignoring")
                return

            channel = event.get('OrigTransfererChannel', '')
            if not channel:
                logger.warning("AMI: AttendedTransfer without OrigTransfererChannel")
                return

            ctx.transfer_event = event
            ctx.transfer_timestamp = time.time()

            if delay_ms > 0:
                await asyncio.sleep(delay_ms / 1000.0)

            logger.info(
                f"AMI: AttendedTransfer detected! "
                f"Sending Hangup on {channel} "
                f"(delay={delay_ms}ms)"
            )

            await self.send_hangup(channel)
            ctx.hangup_sent = True
            ctx.hangup_channel = channel
            ctx.hangup_timestamp = time.time()

            elapsed_ms = (ctx.hangup_timestamp - ctx.transfer_timestamp) * 1000
            logger.info(f"AMI: Hangup sent {elapsed_ms:.1f}ms after transfer event")

        self._event_handlers.append(on_attended_transfer)
        try:
            yield ctx
        finally:
            self._event_handlers.remove(on_attended_transfer)

    async def _send_action(self, action: dict) -> None:
        """Send an AMI action (dict of key-value pairs)."""
        lines = [f"{key}: {value}" for key, value in action.items()]
        message = '\r\n'.join(lines) + '\r\n\r\n'

        logger.debug(f"AMI TX: {action}")
        self._writer.write(message.encode())
        await self._writer.drain()

    async def _read_message(self) -> dict:
        """Read one AMI message (terminated by blank line).

        Returns:
            Dict of key-value pairs from the message.
        """
        lines = []
        while True:
            line = await self._reader.readline()
            if not line:
                raise ConnectionError("AMI connection closed")

            decoded = line.decode().rstrip('\r\n')
            if decoded == '':
                break
            lines.append(decoded)

        message = {}
        for line in lines:
            if ': ' in line:
                key, value = line.split(': ', 1)
                message[key] = value

        return message

    async def _event_loop(self) -> None:
        """Background loop that reads AMI events and dispatches to handlers."""
        logger.debug("AMI: Event loop started")
        try:
            while self._connected:
                try:
                    message = await self._read_message()
                except ConnectionError:
                    logger.info("AMI: Connection closed during event loop")
                    break
                except asyncio.CancelledError:
                    raise
                except Exception as e:
                    logger.error(f"AMI: Error reading message: {e}")
                    break

                event_name = message.get('Event', '')
                if not event_name:
                    continue

                logger.debug(f"AMI Event: {event_name}")

                if event_name == 'AttendedTransfer':
                    logger.info(
                        f"AMI: AttendedTransfer event received: "
                        f"Result={message.get('Result')}, "
                        f"OrigTransfererChannel={message.get('OrigTransfererChannel')}"
                    )

                # Dispatch to handlers
                for handler in list(self._event_handlers):
                    if event_name == 'AttendedTransfer':
                        try:
                            await handler(message)
                        except Exception as e:
                            logger.error(f"AMI: Handler error: {e}")

        except asyncio.CancelledError:
            logger.debug("AMI: Event loop cancelled")
            raise


class TransferHangupContext:
    """Result context from hangup_on_attended_transfer().

    Attributes:
        hangup_sent: True if Hangup was sent in response to AttendedTransfer
        hangup_channel: Channel name that was hung up
        transfer_event: Full AttendedTransfer event dict
        transfer_timestamp: time.time() when transfer event arrived
        hangup_timestamp: time.time() when Hangup was sent
    """

    def __init__(self):
        self.hangup_sent: bool = False
        self.hangup_channel: str = ''
        self.transfer_event: dict = {}
        self.transfer_timestamp: float = 0.0
        self.hangup_timestamp: float = 0.0

    @property
    def race_delay_ms(self) -> float:
        """Milliseconds between transfer event and hangup send."""
        if self.transfer_timestamp and self.hangup_timestamp:
            return (self.hangup_timestamp - self.transfer_timestamp) * 1000
        return 0.0
