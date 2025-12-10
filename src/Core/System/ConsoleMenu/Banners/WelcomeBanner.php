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

namespace MikoPBX\Core\System\ConsoleMenu\Banners;

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\ConsoleMenu\Utilities\MenuStyleConfig;
use Phalcon\Di\Di;

/**
 * ESXi-style welcome banner for console display
 *
 * Displays system information including:
 * - Version and build information
 * - PBX name
 * - Web interface and SSH URLs
 * - Service status indicators
 * - System uptime
 *
 * Supports auto-refresh and terminal width adaptation.
 */
class WelcomeBanner implements BannerInterface
{
    private const int MIN_WIDTH = 60;
    private const int AUTO_REFRESH_INTERVAL = 60; // seconds

    private BannerDataCollector $dataCollector;
    private MenuStyleConfig $styleConfig;

    public function __construct()
    {
        $this->dataCollector = new BannerDataCollector();
        $this->styleConfig = new MenuStyleConfig();
    }

    /**
     * {@inheritdoc}
     */
    public function render(): string
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $lines = [];

        // Version line with environment
        $version = $this->dataCollector->getVersion();
        $virtualType = $this->dataCollector->getVirtualHardwareType();
        $arch = $this->dataCollector->getArchitecture();
        $buildTime = $this->dataCollector->getBuildTime();

        $versionSuffix = '';
        if (!empty($virtualType)) {
            $versionSuffix = " in $virtualType";
        }

        $lines[] = '*** ' . $translation->_('cm_ThisIs') . ' '
            . MenuStyleConfig::colorize("MikoPBX v.$version$versionSuffix", MenuStyleConfig::COLOR_GREEN);
        $lines[] = "    built on $buildTime ($arch)";

        // Copyright
        $lines[] = '    MikoPBX is Copyright © 2017-2025. All rights reserved.';

        // LiveCD warning
        if ($this->dataCollector->isLiveCd()) {
            $lines[] = '    ' . MenuStyleConfig::colorize(
                $translation->_('cm_PbxLiveModeWarning'),
                MenuStyleConfig::COLOR_RED
            );
        }

        // System integrity warning
        if ($this->dataCollector->hasCorruptedFiles()) {
            $lines[] = '    ' . MenuStyleConfig::colorize(
                $translation->_('cm_SystemIntegrityBroken'),
                MenuStyleConfig::COLOR_RED
            );
        }

        $lines[] = ''; // Empty line

        // PBX Name
        $pbxName = $this->dataCollector->getPbxName();
        $lines[] = '    ' . $translation->_('cm_PbxName') . ': '
            . MenuStyleConfig::colorize($pbxName, MenuStyleConfig::COLOR_CYAN);

        // Web Interface URL
        $webInfo = $this->dataCollector->getWebInterfaceInfo();
        if (!empty($webInfo['url'])) {
            $lines[] = '    ' . $translation->_('cm_WebInterfaceUrl') . ': '
                . MenuStyleConfig::colorize($webInfo['url'], MenuStyleConfig::COLOR_CYAN);
        }

        // SSH access
        $sshPort = $this->dataCollector->getSshPort();
        $sshDisplay = 'SSH';
        if ($sshPort !== '22') {
            $sshDisplay .= " (port $sshPort)";
        }
        if (!empty($webInfo['ip'])) {
            $lines[] = '    ' . $sshDisplay . ': ssh root@' . $webInfo['ip']
                . ($sshPort !== '22' ? " -p $sshPort" : '');
        }

        // Uptime
        $uptime = $this->dataCollector->getUptime();
        if (!empty($uptime)) {
            $lines[] = '    ' . $translation->_('cm_Uptime') . ': ' . $uptime;
        }

        // Storage info
        $storageInfo = $this->dataCollector->getStorageInfo();
        if ($storageInfo !== null) {
            $storageColor = $storageInfo['percent'] > 90
                ? MenuStyleConfig::COLOR_RED
                : ($storageInfo['percent'] > 70 ? MenuStyleConfig::COLOR_YELLOW : MenuStyleConfig::COLOR_GREEN);
            $lines[] = '    ' . $translation->_('cm_Storage') . ': '
                . MenuStyleConfig::colorize(
                    "{$storageInfo['used']} / {$storageInfo['total']} ({$storageInfo['percent']}%)",
                    $storageColor
                );
        }

        $lines[] = ''; // Empty line

        // Service status
        $services = $this->dataCollector->getServiceStatuses();
        $statusParts = [];
        foreach ($services as $name => $isRunning) {
            $statusParts[] = $name . ' ' . MenuStyleConfig::formatServiceStatus($isRunning);
        }
        $lines[] = '    ' . $translation->_('cm_Services') . ': ' . implode(' | ', $statusParts);

        $lines[] = ''; // Empty line

        // Press any key hint
        $lines[] = '    ' . MenuStyleConfig::colorize(
            $translation->_('cm_PressAnyKey'),
            MenuStyleConfig::COLOR_YELLOW
        );

        return implode(PHP_EOL, $lines);
    }

    /**
     * {@inheritdoc}
     */
    public function getMinWidth(): int
    {
        return self::MIN_WIDTH;
    }

    /**
     * {@inheritdoc}
     */
    public function shouldDisplay(): bool
    {
        return !$this->styleConfig->isNarrowTerminal();
    }

    /**
     * Run the banner with auto-refresh loop
     *
     * Displays the banner and refreshes it every AUTO_REFRESH_INTERVAL seconds.
     * Exits on any key press, returning the key pressed.
     *
     * @return string|null The key pressed to exit, or null if Ctrl+C
     */
    public function runWithAutoRefresh(): ?string
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        // Set terminal to non-blocking mode for key detection
        system('stty -icanon -echo');

        // Ensure terminal is restored on exit
        register_shutdown_function(function () {
            system('stty sane');
        });

        $lastRefresh = 0;

        while (true) {
            $now = time();

            // Refresh banner if needed
            if ($now - $lastRefresh >= self::AUTO_REFRESH_INTERVAL || $lastRefresh === 0) {
                // Clear screen and move cursor to top
                echo "\033[2J\033[H";
                echo $this->render();
                echo PHP_EOL;
                $lastRefresh = $now;
            }

            // Check for keypress (non-blocking)
            $read = [STDIN];
            $write = null;
            $except = null;

            if (stream_select($read, $write, $except, 0, 100000) > 0) {
                $key = fread(STDIN, 1);

                // Restore terminal
                system('stty sane');

                // Ctrl+C returns null (exit to shell)
                if ($key === "\x03") {
                    return null;
                }

                // Any other key returns to menu
                return $key;
            }

            // Small sleep to prevent CPU spinning
            usleep(50000);
        }
    }

    /**
     * Render a compact version of the banner for menu title
     *
     * Used when displaying the banner as a menu title (not standalone).
     *
     * @return string Compact banner text
     */
    public function renderCompact(): string
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $lines = [];

        // Version line: MikoPBX v.2025.1.1 in DOCKER (arm64)
        $version = $this->dataCollector->getVersion();
        $virtualType = $this->dataCollector->getVirtualHardwareType();
        $arch = $this->dataCollector->getArchitecture();

        $versionSuffix = '';
        if (!empty($virtualType)) {
            $versionSuffix = " in $virtualType";
        }

        $lines[] = '*** ' . MenuStyleConfig::colorize(
            "MikoPBX v.$version$versionSuffix ($arch)",
            MenuStyleConfig::COLOR_GREEN
        );

        // PBX Name
        $pbxName = $this->dataCollector->getPbxName();
        $lines[] = '    ' . MenuStyleConfig::colorize($pbxName, MenuStyleConfig::COLOR_CYAN);

        // Description (if not empty)
        $description = $this->dataCollector->getDescription();
        if (!empty($description)) {
            $lines[] = '    ' . $description;
        }

        // Copyright
        $lines[] = '    MikoPBX is Copyright © 2017-2025. All rights reserved.';

        // LiveCD warning
        if ($this->dataCollector->isLiveCd()) {
            $lines[] = '    ' . MenuStyleConfig::colorize(
                $translation->_('cm_PbxLiveModeWarning'),
                MenuStyleConfig::COLOR_RED
            );
        }

        // System integrity warning
        if ($this->dataCollector->hasCorruptedFiles()) {
            $lines[] = '    ' . MenuStyleConfig::colorize(
                $translation->_('cm_SystemIntegrityBroken'),
                MenuStyleConfig::COLOR_RED
            );
        }

        return implode(PHP_EOL, $lines);
    }
}
