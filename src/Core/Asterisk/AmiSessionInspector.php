<?php

declare(strict_types=1);

namespace MikoPBX\Core\Asterisk;

/**
 * @phpstan-type TcpEntry array{
 *     localAddress: string,
 *     localPort: int,
 *     remoteAddress: string,
 *     remotePort: int,
 *     state: string,
 *     txQueue: int,
 *     rxQueue: int,
 *     inode: int
 * }
 */
final class AmiSessionInspector
{
    private const TCP_STATES = [
        '01' => 'ESTABLISHED',
        '02' => 'SYN_SENT',
        '03' => 'SYN_RECV',
        '04' => 'FIN_WAIT1',
        '05' => 'FIN_WAIT2',
        '06' => 'TIME_WAIT',
        '07' => 'CLOSE',
        '08' => 'CLOSE_WAIT',
        '09' => 'LAST_ACK',
        '0A' => 'LISTEN',
        '0B' => 'CLOSING',
    ];

    public function __construct(private readonly string $procRoot = '/proc')
    {
    }

    public function findAsteriskPid(): ?int
    {
        foreach (glob(rtrim($this->procRoot, '/') . '/[0-9]*', GLOB_ONLYDIR) ?: [] as $processDir) {
            $comm = trim((string)@file_get_contents($processDir . '/comm'));
            $cmdline = (string)@file_get_contents($processDir . '/cmdline');
            $arguments = array_values(array_filter(
                explode("\0", $cmdline),
                static fn(string $argument): bool => $argument !== ''
            ));
            $argv0 = $arguments[0] ?? '';
            if (
                ($comm === 'asterisk' || basename($argv0) === 'asterisk')
                && !$this->isRemoteConsoleClient($arguments)
            ) {
                return (int)basename($processDir);
            }
        }
        return null;
    }

    /** @param list<string> $arguments */
    private function isRemoteConsoleClient(array $arguments): bool
    {
        foreach (array_slice($arguments, 1) as $argument) {
            if (preg_match('/^-[^-]*[rRx]/', $argument) === 1) {
                return true;
            }
        }
        return false;
    }

    public function hasQueuedAmiSockets(int $asteriskPid, int $amiPort): bool
    {
        $asteriskInodes = array_values($this->socketDescriptorsForPid($asteriskPid));
        if ($asteriskInodes === []) {
            return false;
        }
        $tcpEntries = array_merge(
            $this->parseTcpTable($this->procRoot . '/net/tcp', false),
            $this->parseTcpTable($this->procRoot . '/net/tcp6', true)
        );
        foreach ($tcpEntries as $entry) {
            if (
                $entry['localPort'] === $amiPort
                && $entry['txQueue'] > 0
                && in_array($entry['inode'], $asteriskInodes, true)
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * @return list<AmiSessionSnapshot>
     */
    public function inspect(int $asteriskPid, int $amiPort, string $managerOutput): array
    {
        $asteriskFds = $this->socketDescriptorsForPid($asteriskPid);
        if ($asteriskFds === []) {
            return [];
        }

        $managerSessions = $this->parseManagerSessions($managerOutput);
        $tcpEntries = array_merge(
            $this->parseTcpTable($this->procRoot . '/net/tcp', false),
            $this->parseTcpTable($this->procRoot . '/net/tcp6', true)
        );
        $snapshots = [];

        foreach ($tcpEntries as $serverEntry) {
            if ($serverEntry['localPort'] !== $amiPort) {
                continue;
            }
            $fd = array_search($serverEntry['inode'], $asteriskFds, true);
            if ($fd === false || !isset($managerSessions[$fd])) {
                continue;
            }

            $clientEntry = $this->findReverseEntry($tcpEntries, $serverEntry);
            $clientInode = $clientEntry['inode'] ?? null;
            $ownerPids = [];
            if ($serverEntry['txQueue'] > 0 && is_int($clientInode)) {
                $ownerPids = $this->findSocketOwners($clientInode);
            }
            $managerSession = $managerSessions[$fd];
            $snapshots[] = new AmiSessionSnapshot(
                fd: (int)$fd,
                serverInode: $serverEntry['inode'],
                clientInode: $clientInode,
                serverAddress: $serverEntry['localAddress'],
                serverPort: $serverEntry['localPort'],
                clientAddress: $serverEntry['remoteAddress'],
                clientPort: $serverEntry['remotePort'],
                sendQueueBytes: $serverEntry['txQueue'],
                receiveQueueBytes: $serverEntry['rxQueue'],
                clientSendQueueBytes: $clientEntry['txQueue'] ?? 0,
                clientReceiveQueueBytes: $clientEntry['rxQueue'] ?? 0,
                serverState: $serverEntry['state'],
                clientState: $clientEntry['state'] ?? '',
                ownerPids: $ownerPids,
                username: $managerSession['username'],
                sessionStart: $managerSession['start'],
            );
        }

        usort(
            $snapshots,
            static fn(AmiSessionSnapshot $left, AmiSessionSnapshot $right): int => $left->fd <=> $right->fd
        );
        return $snapshots;
    }

    /** @return array<int, int> fd => inode */
    private function socketDescriptorsForPid(int $pid): array
    {
        $descriptors = [];
        foreach (glob(rtrim($this->procRoot, '/') . "/$pid/fd/*") ?: [] as $fdPath) {
            $target = @readlink($fdPath);
            if ($target !== false && preg_match('/^socket:\[(\d+)]$/', $target, $matches) === 1) {
                $descriptors[(int)basename($fdPath)] = (int)$matches[1];
            }
        }
        return $descriptors;
    }

    /** @return array<int, array{username: string, start: string}> */
    private function parseManagerSessions(string $output): array
    {
        $sessions = [];
        foreach (preg_split('/\R/', $output) ?: [] as $line) {
            if (preg_match('/^\s*(\S+)\s+(\S+)\s+(\d+)\s+\d+\s+(\d+)\s+/', $line, $matches) !== 1) {
                continue;
            }
            $sessions[(int)$matches[4]] = [
                'username' => $matches[1],
                'start' => $matches[3],
            ];
        }
        return $sessions;
    }

    /**
     * @return list<TcpEntry>
     */
    private function parseTcpTable(string $path, bool $ipv6): array
    {
        $entries = [];
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $columns = preg_split('/\s+/', trim($line));
            if ($columns === false || count($columns) < 10 || !str_ends_with($columns[0], ':')) {
                continue;
            }
            [$localAddress, $localPort] = $this->decodeEndpoint($columns[1], $ipv6);
            [$remoteAddress, $remotePort] = $this->decodeEndpoint($columns[2], $ipv6);
            [$txQueue, $rxQueue] = array_map('hexdec', explode(':', $columns[4], 2));
            $entries[] = [
                'localAddress' => $localAddress,
                'localPort' => $localPort,
                'remoteAddress' => $remoteAddress,
                'remotePort' => $remotePort,
                'state' => self::TCP_STATES[strtoupper($columns[3])] ?? strtoupper($columns[3]),
                'txQueue' => (int)$txQueue,
                'rxQueue' => (int)$rxQueue,
                'inode' => (int)$columns[9],
            ];
        }
        return $entries;
    }

    /** @return array{string, int} */
    private function decodeEndpoint(string $encoded, bool $ipv6): array
    {
        [$encodedAddress, $encodedPort] = explode(':', $encoded, 2);
        if ($ipv6) {
            $binary = '';
            foreach (str_split($encodedAddress, 8) as $word) {
                $binary .= strrev((string)hex2bin($word));
            }
        } else {
            $binary = strrev((string)hex2bin($encodedAddress));
        }
        return [inet_ntop($binary) ?: '', (int)hexdec($encodedPort)];
    }

    /**
     * @param list<TcpEntry> $entries
     * @param TcpEntry $serverEntry
     * @return TcpEntry|null
     */
    private function findReverseEntry(array $entries, array $serverEntry): ?array
    {
        foreach ($entries as $entry) {
            if (
                $entry['localAddress'] === $serverEntry['remoteAddress']
                && $entry['localPort'] === $serverEntry['remotePort']
                && $entry['remoteAddress'] === $serverEntry['localAddress']
                && $entry['remotePort'] === $serverEntry['localPort']
            ) {
                return $entry;
            }
        }
        return null;
    }

    /** @return list<int> */
    private function findSocketOwners(int $inode): array
    {
        $owners = [];
        $expectedTarget = "socket:[$inode]";
        foreach (glob(rtrim($this->procRoot, '/') . '/[0-9]*/fd/*') ?: [] as $fdPath) {
            if (@readlink($fdPath) === $expectedTarget) {
                $owners[] = (int)basename(dirname(dirname($fdPath)));
            }
        }
        $owners = array_values(array_unique($owners));
        sort($owners, SORT_NUMERIC);
        return $owners;
    }
}
