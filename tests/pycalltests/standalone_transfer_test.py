#!/usr/bin/env python3
"""
Standalone Attended Transfer Race Condition Test

Pure Python (stdlib only) — no pjsua2, no pytest, no pip dependencies.
Runs directly on a physical MikoPBX machine.

Tests:
1. Registers 3 SIP phones (204, 205, 206) with auto-answer
2. Uses AMI Originate to create call 204->205
3. Uses AMI Atxfer to initiate attended transfer to 206
4. Sends AMI Hangup on 204 to complete transfer
5. Simulated cti_amid_client sends AMI Hangup on AttendedTransfer event
6. Monitors if 205<->206 bridge survives

Usage:
    python3 standalone_transfer_test.py [--server-ip 127.0.0.1]
"""

import asyncio
import hashlib
import logging
import random
import re
import socket
import struct
import sys
import time
import uuid
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d %(name)-12s %(levelname)-5s %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger('transfer_test')


# ============================================================
# Minimal SIP UA — pure Python, no dependencies
# ============================================================

class SIPPhone:
    """Minimal SIP UA for registration and auto-answer.

    Supports REGISTER (digest auth), auto-answer INVITE, handle BYE.
    Uses asyncio UDP transport.
    """

    def __init__(self, server_ip: str, extension: str, password: str):
        self.server_ip = server_ip
        self.server_port = 5060
        self.ext = extension
        self.password = password
        self.local_ip = self._detect_local_ip()
        self.sip_port = random.randint(11000, 19999)
        self.rtp_port = random.randint(20000, 29999)
        self.tag = uuid.uuid4().hex[:8]
        self.reg_call_id = f"reg-{uuid.uuid4().hex[:12]}"
        self.cseq = 0
        self.registered = False

        self._transport = None
        self._protocol = None
        self._response_queue: asyncio.Queue = asyncio.Queue()
        self._rtp_transport = None

    def _detect_local_ip(self) -> str:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect((self.server_ip, self.server_port))
            return s.getsockname()[0]
        finally:
            s.close()

    async def start(self):
        """Bind UDP socket and start listening."""
        loop = asyncio.get_event_loop()

        class SIPProtocol(asyncio.DatagramProtocol):
            def __init__(self, phone):
                self.phone = phone

            def datagram_received(self, data, addr):
                asyncio.ensure_future(self.phone._handle_message(data.decode(errors='replace'), addr))

            def error_received(self, exc):
                logger.error(f"SIP {self.phone.ext}: UDP error: {exc}")

        self._transport, self._protocol = await loop.create_datagram_endpoint(
            lambda: SIPProtocol(self),
            local_addr=(self.local_ip, self.sip_port)
        )

        # RTP socket (just need the port for SDP, won't send real audio)
        class DummyRTP(asyncio.DatagramProtocol):
            pass

        self._rtp_transport, _ = await loop.create_datagram_endpoint(
            DummyRTP,
            local_addr=(self.local_ip, self.rtp_port)
        )

        logger.info(f"SIP {self.ext}: listening on {self.local_ip}:{self.sip_port}, RTP:{self.rtp_port}")

    async def stop(self):
        """Close transports."""
        if self._transport:
            self._transport.close()
        if self._rtp_transport:
            self._rtp_transport.close()
        logger.info(f"SIP {self.ext}: stopped")

    async def register(self) -> bool:
        """Register with digest authentication."""
        # First attempt — expect 401
        self.cseq += 1
        msg = self._make_register()
        self._send_sip(msg)

        resp = await self._wait_response(timeout=5)
        if not resp:
            logger.error(f"SIP {self.ext}: no response to REGISTER")
            return False

        code = _sip_status(resp)
        if code == 200:
            self.registered = True
            return True

        if code != 401:
            logger.error(f"SIP {self.ext}: unexpected {code} to REGISTER")
            return False

        # Parse WWW-Authenticate and build digest
        www_auth = _sip_header(resp, 'WWW-Authenticate')
        if not www_auth:
            logger.error(f"SIP {self.ext}: no WWW-Authenticate in 401")
            return False

        self.cseq += 1
        auth_line = self._digest_auth(www_auth, 'REGISTER',
                                      f"sip:{self.server_ip}:{self.server_port}")
        msg = self._make_register(authorization=auth_line)
        self._send_sip(msg)

        resp = await self._wait_response(timeout=5)
        if resp and _sip_status(resp) == 200:
            self.registered = True
            logger.info(f"SIP {self.ext}: registered OK")
            return True

        logger.error(f"SIP {self.ext}: registration failed ({_sip_status(resp) if resp else 'timeout'})")
        return False

    # ---- SIP message builders ----

    def _make_register(self, authorization: str = '') -> str:
        auth_hdr = f"Authorization: {authorization}\r\n" if authorization else ''
        return (
            f"REGISTER sip:{self.server_ip}:{self.server_port} SIP/2.0\r\n"
            f"Via: SIP/2.0/UDP {self.local_ip}:{self.sip_port};rport;"
            f"branch=z9hG4bK{uuid.uuid4().hex[:16]}\r\n"
            f"Max-Forwards: 70\r\n"
            f"From: \"{self.ext}\" <sip:{self.ext}@{self.server_ip}>;tag={self.tag}\r\n"
            f"To: \"{self.ext}\" <sip:{self.ext}@{self.server_ip}>\r\n"
            f"Call-ID: {self.reg_call_id}\r\n"
            f"CSeq: {self.cseq} REGISTER\r\n"
            f"Contact: <sip:{self.ext}@{self.local_ip}:{self.sip_port};ob>\r\n"
            f"Expires: 120\r\n"
            f"{auth_hdr}"
            f"Allow: INVITE,ACK,CANCEL,BYE,OPTIONS,NOTIFY\r\n"
            f"Content-Length: 0\r\n"
            f"\r\n"
        )

    def _make_sdp(self) -> str:
        session_id = random.randint(100000, 999999)
        return (
            f"v=0\r\n"
            f"o=- {session_id} {session_id} IN IP4 {self.local_ip}\r\n"
            f"s=call\r\n"
            f"c=IN IP4 {self.local_ip}\r\n"
            f"t=0 0\r\n"
            f"m=audio {self.rtp_port} RTP/AVP 8 0\r\n"
            f"a=rtpmap:8 PCMA/8000\r\n"
            f"a=rtpmap:0 PCMU/8000\r\n"
            f"a=sendrecv\r\n"
        )

    def _make_response(self, request: str, code: int, reason: str,
                       body: str = '') -> str:
        """Build SIP response from request headers."""
        via = _sip_header(request, 'Via')
        from_h = _sip_header(request, 'From')
        to_h = _sip_header(request, 'To')
        call_id = _sip_header(request, 'Call-ID')
        cseq = _sip_header(request, 'CSeq')

        # Add tag to To if not present
        if ';tag=' not in to_h:
            to_h += f";tag={uuid.uuid4().hex[:8]}"

        content_type = ''
        if body:
            content_type = "Content-Type: application/sdp\r\n"

        return (
            f"SIP/2.0 {code} {reason}\r\n"
            f"Via: {via}\r\n"
            f"From: {from_h}\r\n"
            f"To: {to_h}\r\n"
            f"Call-ID: {call_id}\r\n"
            f"CSeq: {cseq}\r\n"
            f"Contact: <sip:{self.ext}@{self.local_ip}:{self.sip_port}>\r\n"
            f"{content_type}"
            f"Content-Length: {len(body)}\r\n"
            f"\r\n"
            f"{body}"
        )

    # ---- digest auth ----

    def _digest_auth(self, www_auth: str, method: str, uri: str) -> str:
        realm = _extract_param(www_auth, 'realm')
        nonce = _extract_param(www_auth, 'nonce')
        opaque = _extract_param(www_auth, 'opaque')

        ha1 = hashlib.md5(f"{self.ext}:{realm}:{self.password}".encode()).hexdigest()
        ha2 = hashlib.md5(f"{method}:{uri}".encode()).hexdigest()
        response = hashlib.md5(f"{ha1}:{nonce}:{ha2}".encode()).hexdigest()

        result = (
            f'Digest username="{self.ext}", realm="{realm}", nonce="{nonce}", '
            f'uri="{uri}", response="{response}", algorithm=MD5'
        )
        if opaque:
            result += f', opaque="{opaque}"'
        return result

    # ---- transport ----

    def _send_sip(self, msg: str):
        self._transport.sendto(msg.encode(), (self.server_ip, self.server_port))

    async def _handle_message(self, data: str, addr):
        """Handle incoming SIP message (request or response)."""
        first_line = data.split('\r\n', 1)[0] if '\r\n' in data else data.split('\n', 1)[0]

        if first_line.startswith('SIP/2.0'):
            # Response — put in queue for register/invite waiters
            await self._response_queue.put(data)
            return

        # Request
        method = first_line.split(' ', 1)[0]

        if method == 'INVITE':
            await self._handle_invite(data, addr)
        elif method == 'ACK':
            pass  # Nothing to do
        elif method == 'BYE':
            await self._handle_bye(data, addr)
        elif method == 'OPTIONS':
            resp = self._make_response(data, 200, 'OK')
            self._send_sip(resp)
        elif method == 'CANCEL':
            resp = self._make_response(data, 200, 'OK')
            self._send_sip(resp)
        elif method == 'NOTIFY':
            resp = self._make_response(data, 200, 'OK')
            self._send_sip(resp)

    async def _handle_invite(self, data: str, addr):
        """Auto-answer incoming INVITE."""
        logger.info(f"SIP {self.ext}: incoming INVITE — auto-answering")

        # Send 100 Trying
        trying = self._make_response(data, 100, 'Trying')
        self._send_sip(trying)

        # Send 200 OK with SDP
        sdp = self._make_sdp()
        ok = self._make_response(data, 200, 'OK', body=sdp)
        self._send_sip(ok)

    async def _handle_bye(self, data: str, addr):
        """Respond to BYE."""
        logger.info(f"SIP {self.ext}: received BYE")
        resp = self._make_response(data, 200, 'OK')
        self._send_sip(resp)

    async def _wait_response(self, timeout: float = 5) -> Optional[str]:
        try:
            return await asyncio.wait_for(self._response_queue.get(), timeout=timeout)
        except asyncio.TimeoutError:
            return None


# ============================================================
# AMI Client — async, pure Python
# ============================================================

class AMIClient:
    """Async AMI client using asyncio streams."""

    def __init__(self, host: str = '127.0.0.1', port: int = 5038,
                 username: str = 'phpagi', secret: str = 'phpagi'):
        self.host = host
        self.port = port
        self.username = username
        self.secret = secret
        self._reader: Optional[asyncio.StreamReader] = None
        self._writer: Optional[asyncio.StreamWriter] = None
        self._event_queue: asyncio.Queue = asyncio.Queue()
        self._response_queue: asyncio.Queue = asyncio.Queue()
        self._reader_task: Optional[asyncio.Task] = None
        self._connected = False

    async def connect(self):
        self._reader, self._writer = await asyncio.open_connection(self.host, self.port)
        banner = await self._reader.readline()
        logger.info(f"AMI: {banner.decode().strip()}")

        await self._send({'Action': 'Login', 'Username': self.username, 'Secret': self.secret})
        self._reader_task = asyncio.create_task(self._read_loop())
        resp = await self._get_response(timeout=5)
        if resp.get('Response') != 'Success':
            raise ConnectionError(f"AMI login failed: {resp}")
        self._connected = True
        logger.info("AMI: connected")

    async def disconnect(self):
        self._connected = False
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass
        if self._writer:
            self._writer.close()

    async def _send(self, action: dict):
        lines = ''.join(f"{k}: {v}\r\n" for k, v in action.items()) + '\r\n'
        self._writer.write(lines.encode())
        await self._writer.drain()

    async def _read_loop(self):
        """Read AMI messages and dispatch to queues."""
        buf = ''
        try:
            while True:
                data = await self._reader.read(4096)
                if not data:
                    break
                buf += data.decode(errors='replace')
                while '\r\n\r\n' in buf:
                    msg_text, buf = buf.split('\r\n\r\n', 1)
                    msg = {}
                    for line in msg_text.split('\r\n'):
                        if ': ' in line:
                            k, v = line.split(': ', 1)
                            msg[k] = v
                    if 'Event' in msg:
                        await self._event_queue.put(msg)
                    elif 'Response' in msg:
                        await self._response_queue.put(msg)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"AMI read error: {e}")

    async def _get_response(self, timeout=10) -> dict:
        try:
            return await asyncio.wait_for(self._response_queue.get(), timeout=timeout)
        except asyncio.TimeoutError:
            return {}

    async def get_event(self, timeout=1) -> Optional[dict]:
        try:
            return await asyncio.wait_for(self._event_queue.get(), timeout=timeout)
        except asyncio.TimeoutError:
            return None

    async def originate(self, channel: str, context: str, exten: str, priority: int = 1):
        """Originate an async call."""
        await self._send({
            'Action': 'Originate',
            'Channel': channel,
            'Context': context,
            'Exten': exten,
            'Priority': str(priority),
            'Async': 'true',
            'Timeout': '30000',
        })
        return await self._get_response(timeout=10)

    async def atxfer(self, channel: str, exten: str, context: str = 'internal-users'):
        """Initiate attended transfer."""
        await self._send({
            'Action': 'Atxfer',
            'Channel': channel,
            'Exten': exten,
            'Context': context,
        })
        return await self._get_response(timeout=10)

    async def play_dtmf(self, channel: str, digit: str, duration: int = 250,
                        receive: bool = True):
        """Send DTMF digit on channel. receive=True emulates receiving DTMF."""
        await self._send({
            'Action': 'PlayDTMF',
            'Channel': channel,
            'Digit': digit,
            'Duration': str(duration),
            'Receive': '1' if receive else '0',
        })
        return await self._get_response(timeout=5)

    async def send_dtmf_string(self, channel: str, digits: str,
                               inter_digit_delay: float = 0.3):
        """Send a string of DTMF digits with delay between each."""
        for digit in digits:
            await self.play_dtmf(channel, digit)
            await asyncio.sleep(inter_digit_delay)

    async def hangup(self, channel: str):
        """Hangup a channel."""
        await self._send({
            'Action': 'Hangup',
            'Channel': channel,
        })
        return await self._get_response(timeout=5)

    async def get_channels(self) -> list:
        """Get active channels via CoreShowChannels."""
        await self._send({'Action': 'CoreShowChannels'})
        channels = []
        while True:
            evt = await self.get_event(timeout=5)
            if not evt:
                break
            if evt.get('Event') == 'CoreShowChannel':
                channels.append({
                    'channel': evt.get('Channel', ''),
                    'state': evt.get('ChannelStateDesc', ''),
                    'application': evt.get('Application', ''),
                    'bridgeid': evt.get('BridgeId', ''),
                    'context': evt.get('Context', ''),
                })
            elif evt.get('Event') == 'CoreShowChannelsComplete':
                break
        return channels

    async def drain_events(self, timeout=0.5):
        """Read and discard pending events."""
        while True:
            evt = await self.get_event(timeout=timeout)
            if not evt:
                break


# ============================================================
# SIP header helpers
# ============================================================

def _sip_status(response: str) -> int:
    first = response.split('\r\n', 1)[0] if '\r\n' in response else response.split('\n', 1)[0]
    parts = first.split(' ', 2)
    return int(parts[1]) if len(parts) >= 2 else 0

def _sip_header(msg: str, name: str) -> str:
    for line in msg.split('\r\n'):
        if line.lower().startswith(name.lower() + ':'):
            return line.split(':', 1)[1].strip()
    return ''

def _extract_param(header: str, param: str) -> str:
    m = re.search(rf'{param}="([^"]*)"', header)
    return m.group(1) if m else ''


# ============================================================
# Test flow
# ============================================================

async def run_test(server_ip: str):
    print(f"\n{'='*70}")
    print(f"Attended Transfer Race Condition Test (Physical Machine)")
    print(f"  Server: {server_ip}")
    print(f"  Simulates cti_amid_client AMI Hangup on AttendedTransfer")
    print(f"{'='*70}\n")

    # Extension credentials (from DB)
    extensions = {
        '204': 'db534355c1990233fdddbc8f52c693cc',
        '205': 'MEhlUjNUNllvTlE9',
        '206': '98c428bd0172794c409826eaa8adebbe',
    }

    phones = {}
    ami = AMIClient(host=server_ip)
    cti_ami = AMIClient(host=server_ip)  # Simulates cti_amid_client

    try:
        # ============================================================
        # STEP 1: Connect AMI clients
        # ============================================================
        print(f"{'—'*70}")
        print(f"STEP 1: Connect AMI clients")
        print(f"{'—'*70}")

        await ami.connect()
        await cti_ami.connect()
        print(f"  Main AMI: connected")
        print(f"  CTI AMI (simulated cti_amid_client): connected")

        # ============================================================
        # STEP 2: Register SIP phones
        # ============================================================
        print(f"\n{'—'*70}")
        print(f"STEP 2: Register SIP phones (auto-answer)")
        print(f"{'—'*70}")

        for ext, secret in extensions.items():
            phone = SIPPhone(server_ip, ext, secret)
            await phone.start()
            ok = await phone.register()
            if not ok:
                print(f"  FATAL: {ext} registration failed!")
                return False
            phones[ext] = phone
            print(f"  {ext}: registered")

        await asyncio.sleep(2)

        # ============================================================
        # STEP 3: Originate call 204 -> 205
        # ============================================================
        print(f"\n{'—'*70}")
        print(f"STEP 3: Originate call 204 -> 205")
        print(f"{'—'*70}")

        await ami.drain_events()
        resp = await ami.originate('PJSIP/204', 'internal-users', '205')
        print(f"  Originate response: {resp.get('Response', 'no response')}")

        # Wait for call to establish
        await asyncio.sleep(5)

        # Find 204's channel
        channels = await ami.get_channels()
        ch_204 = [c for c in channels if '/204-' in c['channel']]
        ch_205 = [c for c in channels if '/205-' in c['channel']]

        print(f"  204 channels: {[c['channel'] for c in ch_204]}")
        print(f"  205 channels: {[c['channel'] for c in ch_205]}")

        if not ch_204 or not ch_205:
            print(f"  FATAL: Call not established!")
            print(f"  All channels: {[(c['channel'], c['state']) for c in channels]}")
            return False

        transferor_channel = ch_204[0]['channel']
        print(f"  Transferor channel: {transferor_channel}")

        # ============================================================
        # STEP 4: Attended Transfer to 206 via DTMF ##
        # ============================================================
        print(f"\n{'—'*70}")
        print(f"STEP 4: Attended Transfer to 206 (DTMF ##)")
        print(f"{'—'*70}")

        # Start CTI watcher — monitors for AttendedTransfer, fires Hangup
        cti_hangup_sent = False
        cti_hangup_channel = ''
        cti_hangup_delay_ms = 0.0
        transfer_event_time = 0.0

        async def cti_watcher():
            """Simulate cti_amid_client: on AttendedTransfer, send Hangup."""
            nonlocal cti_hangup_sent, cti_hangup_channel, cti_hangup_delay_ms, transfer_event_time
            while True:
                evt = await cti_ami.get_event(timeout=60)
                if not evt:
                    break
                if evt.get('Event') == 'AttendedTransfer' and evt.get('Result') == 'Success':
                    transfer_event_time = time.time()
                    channel = evt.get('OrigTransfererChannel', '')
                    logger.info(f"CTI: AttendedTransfer! Sending Hangup on {channel}")
                    await cti_ami.hangup(channel)
                    cti_hangup_sent = True
                    cti_hangup_channel = channel
                    cti_hangup_delay_ms = (time.time() - transfer_event_time) * 1000
                    logger.info(f"CTI: Hangup sent in {cti_hangup_delay_ms:.1f}ms")
                    break

        watcher_task = asyncio.create_task(cti_watcher())

        # Send ## DTMF to trigger attended transfer feature on 204
        await ami.drain_events()
        print(f"  Sending DTMF ## on {transferor_channel} to start transfer...")
        await ami.send_dtmf_string(transferor_channel, '##', inter_digit_delay=0.15)

        # Wait for transfer prompt to play and Asterisk to collect digits
        await asyncio.sleep(2)

        # Send target extension digits: 206
        print(f"  Sending DTMF 206 to dial transfer target...")
        await ami.send_dtmf_string(transferor_channel, '206', inter_digit_delay=0.3)

        # Wait for 206 to answer (consultation call)
        print(f"  Waiting for 206 to answer consultation call...")
        for attempt in range(10):
            await asyncio.sleep(1)
            channels = await ami.get_channels()
            ch_206 = [c for c in channels if '/206-' in c['channel'] and c['state'] == 'Up']
            if ch_206:
                break

        channels = await ami.get_channels()
        ch_206 = [c for c in channels if '/206-' in c['channel']]
        print(f"  206 channels: {[c['channel'] for c in ch_206]}")

        if not ch_206:
            print(f"  FATAL: 206 did not answer consultation call — cannot complete transfer")
            print(f"  All channels: {[(c['channel'], c['state']) for c in channels]}")
            return False

        print(f"  Consultation call established with 206!")

        # ============================================================
        # STEP 5: Complete transfer — Send ## to 204
        # ============================================================
        print(f"\n{'—'*70}")
        print(f"STEP 5: Complete Transfer — DTMF ## on 204")
        print(f"{'—'*70}")
        print(f"  Sending ## on {transferor_channel} to complete transfer...")
        print(f"  CTI watcher armed — will send racing Hangup on AttendedTransfer")

        await ami.send_dtmf_string(transferor_channel, '##', inter_digit_delay=0.15)
        print(f"  ## sent — transfer completing...")

        # Wait for transfer completion and CTI watcher to fire
        await asyncio.sleep(5)

        # Cancel watcher if not fired
        if not watcher_task.done():
            watcher_task.cancel()
            try:
                await watcher_task
            except asyncio.CancelledError:
                pass

        # ============================================================
        # STEP 6: CTI Watcher Results
        # ============================================================
        print(f"\n{'—'*70}")
        print(f"STEP 6: CTI Watcher Results")
        print(f"{'—'*70}")

        if cti_hangup_sent:
            print(f"  CTI Hangup SENT on: {cti_hangup_channel}")
            print(f"  Race delay: {cti_hangup_delay_ms:.1f}ms after AttendedTransfer")
        else:
            print(f"  WARNING: CTI watcher did NOT detect AttendedTransfer")

        # ============================================================
        # STEP 7: Verify 205 <-> 206 Bridge Survives
        # ============================================================
        print(f"\n{'—'*70}")
        print(f"STEP 7: Verify 205 <-> 206 Bridge Survival")
        print(f"{'—'*70}")

        transfer_alive = False
        check_times = [0, 3, 5, 8, 12, 15]

        for t in check_times:
            if t > 0:
                wait = t - check_times[check_times.index(t) - 1]
                await asyncio.sleep(wait)

            channels = await ami.get_channels()
            ch_205 = [c for c in channels if '/205-' in c['channel']]
            ch_206 = [c for c in channels if '/206-' in c['channel']]

            if ch_205 and ch_206:
                print(f"  t={t}s: ALIVE — 205:{[c['channel'] for c in ch_205]}, "
                      f"206:{[c['channel'] for c in ch_206]}")
                transfer_alive = True
            else:
                if t == 0 and not ch_205 and not ch_206:
                    # Bridge might still be forming
                    print(f"  t={t}s: no channels yet (bridge may be forming)")
                    continue
                print(f"  t={t}s: DROPPED!")
                if not ch_205:
                    print(f"    205: NO active channels")
                if not ch_206:
                    print(f"    206: NO active channels")
                all_ch = [(c['channel'], c['state']) for c in channels]
                print(f"    All channels: {all_ch}")
                transfer_alive = False
                break

        # ============================================================
        # Cleanup
        # ============================================================
        print(f"\n{'—'*70}")
        print(f"Cleanup")
        print(f"{'—'*70}")

        for ext in ['204', '205', '206']:
            try:
                channels = await ami.get_channels()
                for c in channels:
                    if f'/{ext}-' in c['channel']:
                        await ami.hangup(c['channel'])
            except Exception:
                pass

        await asyncio.sleep(1)

        # ============================================================
        # RESULT
        # ============================================================
        print(f"\n{'='*70}")
        print(f"TEST RESULT")
        print(f"{'='*70}")

        if cti_hangup_sent:
            print(f"  CTI Race: Hangup sent {cti_hangup_delay_ms:.1f}ms after AttendedTransfer")

        if transfer_alive:
            print(f"  PASSED: 205 <-> 206 bridge survived 15+ seconds")
            print(f"  Bug NOT reproduced (bridge is resilient)")
        else:
            print(f"  FAILED: 205 <-> 206 bridge dropped!")
            if cti_hangup_sent:
                print(f"  BUG REPRODUCED! CTI Hangup caused bridge collapse!")
            else:
                print(f"  Bridge dropped (possibly without CTI trigger)")

        return transfer_alive

    except Exception as e:
        logger.error(f"Test error: {e}", exc_info=True)
        return False

    finally:
        # Stop phones
        for phone in phones.values():
            await phone.stop()
        # Disconnect AMI
        await ami.disconnect()
        await cti_ami.disconnect()


# ============================================================
# Main
# ============================================================

def main():
    server_ip = '127.0.0.1'
    if len(sys.argv) > 1:
        if sys.argv[1] == '--server-ip' and len(sys.argv) > 2:
            server_ip = sys.argv[2]
        elif not sys.argv[1].startswith('-'):
            server_ip = sys.argv[1]

    print(f"Server IP: {server_ip}")
    result = asyncio.run(run_test(server_ip))
    sys.exit(0 if result else 1)


if __name__ == '__main__':
    main()
