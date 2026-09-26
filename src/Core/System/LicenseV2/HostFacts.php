<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

declare(strict_types=1);

namespace MikoPBX\Core\System\LicenseV2;

use Closure;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;

/**
 * What the licensing server learns about the machine: the environment (a file document never becomes
 * perpetual in a container) and a fingerprint binding a file document to this hardware ("K of N").
 *
 * The sources are fixed: DMI product UUID, board serial, system disk serial, MAC of the first physical NIC.
 * Hashes are salted with the installation id, so the server never sees a serial number.
 *
 * ponytail: the client is open, the check can be cut out; a VM copy with its virtual hardware passes.
 * Accepted in the design: the fingerprint makes a perpetual file harder to copy, not impossible.
 */
class HostFacts
{
    private const array ENVIRONMENTS = ['bare', 'vm', 'container'];
    private const array PLACEHOLDERS = ['', 'to be filled by o.e.m.', 'default string', 'none', '0123456789'];
    private const int MAX_HASHES = 4;

    private Closure $probe;
    /** @var array{environment: string, sources: array<string, string>}|null */
    private ?array $facts = null;

    /**
     * @param Closure(): array{environment: string, sources: array<string, string>}|null $probe
     *     Tests pass fixed facts; production reads the machine once per instance.
     */
    public function __construct(?Closure $probe = null)
    {
        $this->probe = $probe ?? self::probe(...);
    }

    public function environment(): string
    {
        $environment = $this->facts()['environment'];
        return in_array($environment, self::ENVIRONMENTS, true) ? $environment : 'vm';
    }

    /**
     * @return array<int, string> Up to four hashes, placeholders left out.
     */
    public function fingerprint(string $installId): array
    {
        $hashes = [];
        foreach ($this->facts()['sources'] as $name => $value) {
            $value = strtolower(trim($value));
            // Zeros or F with separators: an unset UUID or MAC, the same on every machine.
            if (in_array($value, self::PLACEHOLDERS, true) || preg_match('/^[0f:\-]+$/', $value) === 1) {
                continue;
            }
            $hashes[] = substr(hash('sha256', "$installId|$name|$value"), 0, 16);
        }
        return array_slice(array_values(array_unique($hashes)), 0, self::MAX_HASHES);
    }

    /**
     * @param array{k: int, h: array<int, string>} $documentFingerprint Checked by EntitlementToken already.
     * @param array<int, string> $hashes What fingerprint() says about this machine now.
     */
    public static function matches(array $documentFingerprint, array $hashes): bool
    {
        return count(array_intersect(array_unique($documentFingerprint['h']), array_unique($hashes)))
            >= $documentFingerprint['k'];
    }

    /**
     * @return array{environment: string, sources: array<string, string>}
     */
    private function facts(): array
    {
        return $this->facts ??= ($this->probe)();
    }

    /**
     * Reads the machine. DMI serials are root-only: requests are built by root workers, the web user never
     * builds one, so an empty value there is a missing source, not an error.
     * Plain exec(): Processes::mwExec() only echoes the command in debug mode, losing the environment
     * and the disk serial.
     *
     * @return array{environment: string, sources: array<string, string>}
     */
    private static function probe(): array
    {
        $read = static fn(string $file): string => is_readable($file) ? trim((string)file_get_contents($file)) : '';
        $detected = '';
        if (!System::isContainer() && is_executable('/sbin/pbx-env-detect')) {
            exec('/sbin/pbx-env-detect --type 2>/dev/null', $output);
            $detected = strtolower(trim(implode('', $output ?? [])));
        }
        $environment = match (true) {
            System::isContainer(), in_array($detected, ['docker', 'lxc'], true) => 'container',
            $detected === 'baremetal' => 'bare',
            default => 'vm',
        };

        $diskSerial = '';
        $systemDisk = $read(Directories::getDir(Directories::CORE_VAR_ETC_DIR) . '/cfdevice');
        if (preg_match('/^[a-z0-9]+$/', $systemDisk) === 1) {
            exec(Util::which('lsblk') . " -dno SERIAL /dev/$systemDisk 2>/dev/null", $serial);
            $diskSerial = trim(implode('', $serial ?? []));
        }
        // "First" must not depend on the order the kernel happened to list the NICs in.
        $nics = (new Network())->getInterfacesNames();
        sort($nics);
        $mac = $nics === [] ? '' : $read("/sys/class/net/$nics[0]/address");

        return [
            'environment' => $environment,
            'sources' => [
                'product_uuid' => $read('/sys/class/dmi/id/product_uuid'),
                'board_serial' => $read('/sys/class/dmi/id/board_serial'),
                'disk_serial' => $diskSerial,
                'mac' => $mac,
            ],
        ];
    }
}
