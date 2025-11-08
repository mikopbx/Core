<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\{CustomFiles, NetworkStaticRoutes};
use MikoPBX\Core\System\{SystemMessages, Upgrade\UpgradeSystemConfigInterface};
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer20250114
 *
 * Migrates static routes from CustomFiles (/etc/static-routes) to NetworkStaticRoutes table.
 * Parses legacy route format and creates database records with proper priority.
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer20250114 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2025.1.14';

    /**
     * Main update method
     *
     * @return void
     */
    public function processUpdate(): void
    {
        $this->migrateStaticRoutesFromCustomFiles();

        // Step 2: Enable PBXSplitAudioThread by default
        $this->enableSplitAudioThreadByDefault();
    }

    /**
     * Migrate static routes from CustomFiles to NetworkStaticRoutes table
     *
     * @return void
     */
    private function migrateStaticRoutesFromCustomFiles(): void
    {
        // Find /etc/static-routes in CustomFiles
        $customFile = CustomFiles::findFirst([
            'conditions' => 'filepath = :filepath:',
            'bind' => ['filepath' => '/etc/static-routes']
        ]);

        if ($customFile === null) {
            echo "No /etc/static-routes found in CustomFiles, skipping migration\n";
            return;
        }

        SystemMessages::sysLogMsg(
            __METHOD__,
            "Found /etc/static-routes in CustomFiles, migrating to NetworkStaticRoutes table",
            LOG_INFO
        );

        // Parse routes from file content (getContent() decodes base64)
        $routes = $this->parseStaticRoutesFile($customFile->getContent());

        if (count($routes) === 0) {
            echo "No valid routes found in /etc/static-routes\n";
            // Delete the custom file even if empty
            $this->deleteCustomFile($customFile);
            return;
        }

        // Migrate routes to database
        $migratedCount = 0;
        $priority = 1;

        foreach ($routes as $route) {
            $newRoute = new NetworkStaticRoutes();
            $newRoute->network = $route['network'];
            $newRoute->subnet = $route['subnet'];
            $newRoute->gateway = $route['gateway'];
            $newRoute->interface = $route['interface'] ?? '';
            $newRoute->description = $route['description'] ?? 'Migrated from /etc/static-routes';
            $newRoute->priority = $priority++;

            if ($newRoute->save()) {
                $migratedCount++;
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Migrated route: {$route['network']}/{$route['subnet']} via {$route['gateway']}",
                    LOG_INFO
                );
            } else {
                $messages = implode(', ', $newRoute->getMessages());
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Failed to migrate route {$route['network']}: {$messages}",
                    LOG_WARNING
                );
            }
        }

        echo "Migrated $migratedCount static routes from /etc/static-routes to database\n";

        // Delete the custom file after successful migration
        $this->deleteCustomFile($customFile);
    }

    /**
     * Parse static routes from file content
     *
     * Expected format examples:
     * - route add -net 192.168.10.0/24 gw 192.168.1.1;
     * - route add -net 10.0.0.0/8 gw 192.168.1.254 dev eth0;
     * - route add -net 172.16.0.0 netmask 255.255.0.0 gw 192.168.1.1;
     *
     * @param string $content File content
     * @return array Array of parsed routes
     */
    private function parseStaticRoutesFile(string $content): array
    {
        $routes = [];

        if (empty($content)) {
            return $routes;
        }

        // Split by lines and filter out empty lines and comments
        $lines = array_filter(
            array_map('trim', explode("\n", $content)),
            fn($line) => !empty($line) && !str_starts_with($line, '#')
        );

        foreach ($lines as $line) {
            $route = $this->parseRouteLine($line);
            if ($route !== null) {
                $routes[] = $route;
            }
        }

        return $routes;
    }

    /**
     * Parse a single route line
     *
     * @param string $line Route command line
     * @return array|null Parsed route or null if invalid
     */
    private function parseRouteLine(string $line): ?array
    {
        // Remove trailing semicolon and extra spaces
        $line = trim($line, "; \t\n\r\0\x0B");

        // Expected pattern: route add -net <network>[/<cidr>] [netmask <mask>] gw <gateway> [dev <interface>]
        if (!preg_match('/^route\s+add\s+/i', $line)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Skipping invalid route line (no 'route add'): $line",
                LOG_WARNING
            );
            return null;
        }

        $route = [
            'network' => '',
            'subnet' => '24',
            'gateway' => '',
            'interface' => '',
            'description' => ''
        ];

        // Extract network with CIDR notation: -net 192.168.10.0/24
        if (preg_match('/-net\s+([\d\.]+)\/(\d+)/i', $line, $matches)) {
            $route['network'] = $matches[1];
            $route['subnet'] = $matches[2];
        }
        // Extract network without CIDR: -net 192.168.10.0
        elseif (preg_match('/-net\s+([\d\.]+)/i', $line, $matches)) {
            $route['network'] = $matches[1];

            // Check for netmask: netmask 255.255.255.0
            if (preg_match('/netmask\s+([\d\.]+)/i', $line, $maskMatches)) {
                $route['subnet'] = (string)$this->netmaskToCidr($maskMatches[1]);
            }
        } else {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Skipping invalid route line (no network): $line",
                LOG_WARNING
            );
            return null;
        }

        // Extract gateway: gw 192.168.1.1
        if (preg_match('/gw\s+([\d\.]+)/i', $line, $matches)) {
            $route['gateway'] = $matches[1];
        } else {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Skipping invalid route line (no gateway): $line",
                LOG_WARNING
            );
            return null;
        }

        // Extract interface (optional): dev eth0
        if (preg_match('/dev\s+(\S+)/i', $line, $matches)) {
            $route['interface'] = $matches[1];
        }

        // Validate IP addresses
        if (!filter_var($route['network'], FILTER_VALIDATE_IP)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Invalid network IP: {$route['network']}",
                LOG_WARNING
            );
            return null;
        }

        if (!filter_var($route['gateway'], FILTER_VALIDATE_IP)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Invalid gateway IP: {$route['gateway']}",
                LOG_WARNING
            );
            return null;
        }

        // Validate subnet (CIDR notation)
        $subnet = (int)$route['subnet'];
        if ($subnet < 0 || $subnet > 32) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Invalid subnet CIDR: {$route['subnet']}",
                LOG_WARNING
            );
            return null;
        }

        return $route;
    }

    /**
     * Convert netmask to CIDR notation
     *
     * @param string $netmask Netmask (e.g., 255.255.255.0)
     * @return int CIDR notation (e.g., 24)
     */
    private function netmaskToCidr(string $netmask): int
    {
        $bits = 0;
        $netmaskParts = explode(".", $netmask);

        foreach ($netmaskParts as $octet) {
            $bits += strlen(str_replace("0", "", decbin((int)$octet)));
        }

        return $bits;
    }

    /**
     * Delete custom file from database
     *
     * @param CustomFiles $customFile Custom file record
     * @return void
     */
    private function deleteCustomFile(CustomFiles $customFile): void
    {
        if ($customFile->delete()) {
            echo "Deleted /etc/static-routes from CustomFiles table\n";
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Deleted /etc/static-routes from CustomFiles table",
                LOG_INFO
            );
        } else {
            $messages = implode(', ', $customFile->getMessages());
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Failed to delete /etc/static-routes from CustomFiles: {$messages}",
                LOG_WARNING
            );
            echo "Warning: Could not delete /etc/static-routes from CustomFiles: {$messages}\n";
        }
    }

    /**
     * Enable PBXSplitAudioThread by default for stereo recording mode.
     *
     * This setting controls whether call recordings are saved in stereo mode (each participant
     * in separate audio channels) or mono mode (both participants mixed in one channel).
     * Stereo mode is now the default for better call analysis capabilities.
     *
     * @return void
     */
    private function enableSplitAudioThreadByDefault(): void
    {
        PbxSettings::setValue(PbxSettings::PBX_SPLIT_AUDIO_THREAD, '1');
    }
}
