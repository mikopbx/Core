<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/*
 * A registered phone that has stopped answering calls, e.g. one that lost its network after
 * registering: its contact on the PBX stays valid and reachable (OPTIONS are answered), but
 * INVITEs get no response at all, so a call to it rings into the void until the caller gives up.
 *
 * Usage: php hung-phone.php <extension> <secret> [<pbx host> [<pbx port>]]
 * Prints "READY" once registered, runs until its stdin is closed, then unregisters.
 */

[, $extension, $secret] = $argv;
$pbxHost = $argv[3] ?? '127.0.0.1';
$pbxPort = (int)($argv[4] ?? 5060);

$socket = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
socket_bind($socket, '127.0.0.1', 0);
socket_getsockname($socket, $localHost, $localPort);
socket_set_option($socket, SOL_SOCKET, SO_RCVTIMEO, ['sec' => 1, 'usec' => 0]);

$callId = bin2hex(random_bytes(8));
$fromTag = bin2hex(random_bytes(4));
$cseq = 0;

/**
 * Sends a REGISTER (authenticating on a 401 challenge) and returns the final status line.
 */
$register = static function (int $expires) use (
    $socket,
    $pbxHost,
    $pbxPort,
    $localPort,
    $extension,
    $secret,
    $callId,
    $fromTag,
    &$cseq
): string {
    $authorization = '';
    for ($attempt = 0; $attempt < 2; $attempt++) {
        $cseq++;
        $request = "REGISTER sip:$pbxHost SIP/2.0\r\n"
            . "Via: SIP/2.0/UDP 127.0.0.1:$localPort;branch=z9hG4bK" . bin2hex(random_bytes(6)) . ";rport\r\n"
            . "Max-Forwards: 70\r\n"
            . "From: <sip:$extension@$pbxHost>;tag=$fromTag\r\n"
            . "To: <sip:$extension@$pbxHost>\r\n"
            . "Call-ID: $callId\r\n"
            . "CSeq: $cseq REGISTER\r\n"
            . "Contact: <sip:$extension@127.0.0.1:$localPort>\r\n"
            . "Expires: $expires\r\n"
            . "User-Agent: mikopbx-test-hung-phone\r\n"
            . $authorization
            . "Content-Length: 0\r\n\r\n";
        socket_sendto($socket, $request, strlen($request), 0, $pbxHost, $pbxPort);
        // Skip requests the PBX may send meanwhile (the qualify OPTIONS right after registering).
        do {
            $response = '';
            if (@socket_recvfrom($socket, $response, 65535, 0, $fromHost, $fromPort) === false) {
                return 'no response';
            }
        } while (!str_starts_with($response, 'SIP/2.0') || !str_contains($response, "CSeq: $cseq REGISTER"));
        $status = strtok($response, "\r\n");
        if (
            !str_starts_with($status, 'SIP/2.0 401')
            || !preg_match('/WWW-Authenticate:\s*Digest\s+([^\r\n]+)/i', $response, $challenge)
        ) {
            return $status;
        }
        preg_match_all('/(\w+)="?([^",]*)"?/', $challenge[1], $pairs, PREG_SET_ORDER);
        $params = array_column($pairs, 2, 1);
        $uri = "sip:$pbxHost";
        $ha1 = md5("$extension:{$params['realm']}:$secret");
        $ha2 = md5("REGISTER:$uri");
        $cnonce = bin2hex(random_bytes(4));
        $digest = isset($params['qop'])
            ? md5("$ha1:{$params['nonce']}:00000001:$cnonce:auth:$ha2")
            : md5("$ha1:{$params['nonce']}:$ha2");
        $authorization = "Authorization: Digest username=\"$extension\", realm=\"{$params['realm']}\", "
            . "nonce=\"{$params['nonce']}\", uri=\"$uri\", response=\"$digest\", algorithm=MD5"
            . (isset($params['qop']) ? ", qop=auth, nc=00000001, cnonce=\"$cnonce\"" : '')
            . (isset($params['opaque']) ? ", opaque=\"{$params['opaque']}\"" : '')
            . "\r\n";
    }
    return 'authentication failed';
};

$status = $register(600);
if (!str_starts_with($status, 'SIP/2.0 200')) {
    fwrite(STDERR, "REGISTER $extension: $status\n");
    exit(1);
}
echo "READY\n";

stream_set_blocking(STDIN, false);
while (!feof(STDIN)) {
    fread(STDIN, 1024);
    $request = '';
    if (@socket_recvfrom($socket, $request, 65535, 0, $fromHost, $fromPort) === false) {
        continue;
    }
    if (!str_starts_with($request, 'OPTIONS ')) {
        // INVITE, CANCEL, ...: the hung phone never answers.
        continue;
    }
    $headers = [];
    foreach (explode("\r\n", $request) as $line) {
        if (preg_match('/^(Via|From|To|Call-ID|CSeq):/i', $line)) {
            $headers[] = $line;
        }
    }
    $response = "SIP/2.0 200 OK\r\n" . implode("\r\n", $headers) . "\r\nContent-Length: 0\r\n\r\n";
    socket_sendto($socket, $response, strlen($response), 0, $fromHost, $fromPort);
}

$register(0);
socket_close($socket);
