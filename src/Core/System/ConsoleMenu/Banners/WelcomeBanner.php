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
use MikoPBX\Core\System\ConsoleMenu\Utilities\EnvironmentHelper;
use MikoPBX\Core\System\ConsoleMenu\Utilities\MenuStyleConfig;
use Phalcon\Di\Di;

/**
 * ESXi-style welcome banner for console display
 *
 * Supports two display modes:
 * - Compact: For serial consoles (ttyS*, ttyAMA*) - simple text format
 * - Fullscreen: For VM/SSH consoles - ASCII art logo with box drawing
 *
 * Displays system information including:
 * - Version and build information
 * - PBX name and description
 * - Web interface and SSH URLs
 * - Service status indicators (7 services)
 * - System uptime and load average
 * - Storage usage
 *
 * Supports auto-refresh and terminal width adaptation.
 */
class WelcomeBanner implements BannerInterface
{
    private const int MIN_WIDTH = 60;
    private const int FULLSCREEN_MIN_WIDTH = 80;
    // Compact fullscreen renders ~25 lines (with all warnings & description),
    // so anything below this threshold falls back to the small compact banner
    private const int FULLSCREEN_MIN_HEIGHT = 25;
    // Width of horizontal `-----` section separators in compact mode
    private const int COMPACT_SEPARATOR_WIDTH = 71;
    private const int STARTUP_GRACE_PERIOD = 120; // seconds - services shown as "starting" if uptime < this

    // Adaptive refresh settings
    private const int FREQUENT_REFRESH_PERIOD = 300;  // 5 minutes - period of frequent refresh after activity
    private const int FREQUENT_INTERVAL = 10;          // 10 seconds - refresh interval during active period
    private const int INFREQUENT_INTERVAL = 300;       // 5 minutes - refresh interval when idle

    // ASCII art logo for MikoPBX (7 lines)
    private const array ASCII_LOGO = [
        '███╗   ███╗██╗██╗  ██╗ ██████╗ ██████╗ ██████╗ ██╗  ██╗',
        '████╗ ████║██║██║ ██╔╝██╔═══██╗██╔══██╗██╔══██╗╚██╗██╔╝',
        '██╔████╔██║██║█████╔╝ ██║   ██║██████╔╝██████╔╝ ╚███╔╝ ',
        '██║╚██╔╝██║██║██╔═██╗ ██║   ██║██╔═══╝ ██╔══██╗ ██╔██╗ ',
        '██║ ╚═╝ ██║██║██║  ██╗╚██████╔╝██║     ██████╔╝██╔╝ ██╗',
        '╚═╝     ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═════╝ ╚═╝  ╚═╝',
    ];

    // Box drawing characters for fullscreen mode
    private const string BOX_TOP_LEFT = '╔';
    private const string BOX_TOP_RIGHT = '╗';
    private const string BOX_BOTTOM_LEFT = '╚';
    private const string BOX_BOTTOM_RIGHT = '╝';
    private const string BOX_HORIZONTAL = '═';
    private const string BOX_VERTICAL = '║';
    private const string BOX_T_LEFT = '╠';
    private const string BOX_T_RIGHT = '╣';

    private BannerDataCollector $dataCollector;
    private MenuStyleConfig $styleConfig;
    private EnvironmentHelper $envHelper;

    public function __construct()
    {
        $this->dataCollector = new BannerDataCollector();
        $this->styleConfig = new MenuStyleConfig();
        $this->envHelper = new EnvironmentHelper();
    }

    /**
     * Render compact banner for serial consoles
     *
     * Simple text format without box drawing, suitable for serial consoles
     * (ttyS, ttyAMA, ttyUSB). Shows all essential information in a condensed format.
     *
     * @return string Rendered banner text
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
        $lines[] = "    Built: $buildTime ($arch)";
        $lines[] = $this->compactSeparator();

        // Warnings section
        if ($this->dataCollector->hasCorruptedFiles()) {
            $lines[] = '    ' . MenuStyleConfig::colorize(
                '⚠ ' . $translation->_('cm_SystemIntegrityBroken'),
                MenuStyleConfig::COLOR_RED
            );
        }
        if ($this->dataCollector->isLiveCd()) {
            $lines[] = '    ' . MenuStyleConfig::colorize(
                '⚠ ' . $translation->_('cm_PbxLiveModeWarning'),
                MenuStyleConfig::COLOR_RED
            );
        }
        if ($this->dataCollector->isFirewallDisabled()) {
            $lines[] = '    ' . MenuStyleConfig::colorize(
                '⚠ ' . $translation->_('cm_FirewallIsDisabled'),
                MenuStyleConfig::COLOR_RED
            );
        }

        // PBX Name (if customized)
        $pbxName = $this->dataCollector->getPbxName();
        if (!empty($pbxName) && $pbxName !== 'PBX system') {
            $lines[] = '    Station: ' . MenuStyleConfig::colorize($pbxName, MenuStyleConfig::COLOR_CYAN);
        }

        $lines[] = $this->compactSeparator();

        // Collect endpoints (Web/SSH) data — rendered later so its `|` can be
        // aligned with the metrics block below.
        $webInfo = $this->dataCollector->getWebInterfaceInfo();
        $hasExternal = !empty($webInfo['externalUrl']);
        $sshLogin = $this->dataCollector->getSshLogin();
        $sshPort = $this->dataCollector->getSshPort();

        // Drop the `https://` prefix when the URL pair would overflow the current
        // terminal width. Fixed framing per row: 4 indent + 3 label + 3 ' | ' + 3 ' | '
        // = 13 chars, so URL budget = terminalWidth - 13. Floor at 20 chars to keep the
        // strip threshold meaningful even on a tiny terminal. Both URLs stripped
        // symmetrically — the `Web` label still implies the protocol.
        $webExternal = $webInfo['externalUrl'] ?? '';
        $webLocal = $webInfo['url'] ?? '';
        $urlBudget = max(20, $this->styleConfig->getTerminalWidth() - 13);
        if ((mb_strlen($webExternal) + mb_strlen($webLocal)) > $urlBudget) {
            $webExternal = preg_replace('#^https?://#', '', $webExternal);
            $webLocal = preg_replace('#^https?://#', '', $webLocal);
        }

        $endpointRows = [];
        if ($hasExternal) {
            $endpointRows[] = ['Web', $webExternal, $webLocal];
            $extSsh = $this->buildSshArgs($sshLogin, $webInfo['externalHost'], $sshPort);
            $localSsh = !empty($webInfo['ip']) ? $this->buildSshArgs($sshLogin, $webInfo['ip'], $sshPort) : '';
            $endpointRows[] = ['SSH', $extSsh, $localSsh];
        } elseif (!empty($webLocal)) {
            $endpointRows[] = ['Web', $webLocal, ''];
            $endpointRows[] = ['SSH', $this->buildSshArgs($sshLogin, $webInfo['ip'], $sshPort), ''];
        }

        // Collect metrics block data — same reason: align `|` with endpoints.
        $uptimeSeconds = $this->dataCollector->getUptimeSeconds();
        $uptime = $this->dataCollector->getUptime();
        $isStarting = $uptimeSeconds > 0 && $uptimeSeconds < self::STARTUP_GRACE_PERIOD;

        $loadAvg = $this->dataCollector->getLoadAverage();
        $memInfo = $this->dataCollector->getMemoryInfo();
        $storageInfo = $this->dataCollector->getStorageInfo();

        $metricsLeft = ['', '', ''];
        if (!empty($uptime)) {
            $metricsLeft[0] = $translation->_('cm_Uptime') . ': ' . $uptime;
        }
        if ($loadAvg !== null) {
            $cpuCores = $this->dataCollector->getCpuCores();
            $metricsLeft[2] = 'Load: '
                . MenuStyleConfig::formatLoadValue($loadAvg['load1']) . ' '
                . MenuStyleConfig::formatLoadValue($loadAvg['load5']) . ' '
                . MenuStyleConfig::formatLoadValue($loadAvg['load15'])
                . " ($cpuCores cores)";
        }

        $metricsRight = ['', '', ''];
        if ($memInfo !== null) {
            $memColor = $memInfo['mem_percent'] > 90
                ? MenuStyleConfig::COLOR_RED
                : ($memInfo['mem_percent'] > 70 ? MenuStyleConfig::COLOR_YELLOW : MenuStyleConfig::COLOR_GREEN);
            $metricsRight[0] = 'Mem:     ' . MenuStyleConfig::colorize(
                "{$memInfo['mem_used']} / {$memInfo['mem_total']} ({$memInfo['mem_percent']}%)",
                $memColor
            );
            if ($memInfo['swap_percent'] > 0) {
                $swapColor = $memInfo['swap_percent'] > 90
                    ? MenuStyleConfig::COLOR_RED
                    : ($memInfo['swap_percent'] > 70 ? MenuStyleConfig::COLOR_YELLOW : MenuStyleConfig::COLOR_GREEN);
                $metricsRight[1] = 'Swap:    ' . MenuStyleConfig::colorize(
                    "{$memInfo['swap_used']} / {$memInfo['swap_total']} ({$memInfo['swap_percent']}%)",
                    $swapColor
                );
            }
        }
        if ($storageInfo !== null) {
            $storageColor = $storageInfo['percent'] > 90
                ? MenuStyleConfig::COLOR_RED
                : ($storageInfo['percent'] > 70 ? MenuStyleConfig::COLOR_YELLOW : MenuStyleConfig::COLOR_GREEN);
            $metricsRight[2] = $translation->_('cm_Storage') . ': ' . MenuStyleConfig::colorize(
                "{$storageInfo['used']} / {$storageInfo['total']} ({$storageInfo['percent']}%)",
                $storageColor
            );
        }

        // Compute the column position where the divider `|` lives.
        // Endpoint row before `|`: '    Web | <primary>' → indent(4) + label(3) + ' | '(3) + len(primary).
        // Metrics row before `|`:  '    <left>'         → indent(4) + len(left).
        // We pick the maximum so both blocks share one vertical line.
        $endpointPrimaryMax = 0;
        foreach ($endpointRows as [, $primary]) {
            $endpointPrimaryMax = max($endpointPrimaryMax, $this->visibleWidth($primary));
        }
        $metricsLeftMax = 0;
        foreach ($metricsLeft as $left) {
            $metricsLeftMax = max($metricsLeftMax, $this->visibleWidth($left));
        }
        $endpointPipeCol = $endpointRows ? (4 + 3 + 3 + $endpointPrimaryMax) : 0;
        $metricsPipeCol = ($metricsLeftMax > 0) ? (4 + $metricsLeftMax) : 0;
        $pipeCol = max($endpointPipeCol, $metricsPipeCol);

        // Render endpoints block
        foreach ($endpointRows as [$label, $primary, $secondary]) {
            $primaryColored = MenuStyleConfig::colorize($primary, MenuStyleConfig::COLOR_CYAN);
            $line = '    ' . $label . ' | ' . $primaryColored;
            if ($secondary !== '') {
                // 4 indent + 3 label + 3 ' | ' + visibleWidth(primary) = current visible length
                $visibleLen = 4 + 3 + 3 + $this->visibleWidth($primary);
                $line .= str_repeat(' ', max(1, $pipeCol - $visibleLen + 1)) . '| '
                    . MenuStyleConfig::colorize($secondary, MenuStyleConfig::COLOR_GRAY);
            }
            $lines[] = $line;
        }

        // Last login info
        $lastLogin = $this->dataCollector->getLastLogin();
        if ($lastLogin !== null) {
            $loginStr = '    ' . $translation->_('cm_LastLogin') . ': ' . $lastLogin['datetime'];
            if (!empty($lastLogin['source'])) {
                $loginStr .= ' ' . $translation->_('cm_From') . ' ' . $lastLogin['source'];
            } else {
                $loginStr .= ' ' . $translation->_('cm_OnConsole');
            }
            $lines[] = $loginStr;
        }

        $lines[] = $this->compactSeparator();

        // Render metrics block — 3×2 grid using the shared $pipeCol
        for ($i = 0; $i < 3; $i++) {
            if ($metricsLeft[$i] === '' && $metricsRight[$i] === '') {
                continue;
            }
            $visibleLen = 4 + $this->visibleWidth($metricsLeft[$i]);
            $pad = str_repeat(' ', max(1, $pipeCol - $visibleLen + 1));
            $lines[] = '    ' . $metricsLeft[$i] . $pad . '| ' . $metricsRight[$i];
        }

        $lines[] = $this->compactSeparator();

        // Service status - all 7 services in one line
        // During startup (uptime < 2 min), show stopped services as yellow instead of red
        $services = $this->dataCollector->getServiceStatuses();
        $statusParts = [];
        foreach ($services as $name => $isRunning) {
            $statusParts[] = $name . ' ' . MenuStyleConfig::formatServiceStatus($isRunning, $isStarting);
        }
        $lines[] = '    ' . $translation->_('cm_Services') . ': ' . implode(' ', $statusParts);

        $lines[] = '';

        // Press any key hint
        $lines[] = '    ' . MenuStyleConfig::colorize(
            $translation->_('cm_PressAnyKey') . ', Ctrl+C ' . $translation->_('cm_ForShell'),
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
     * Render fullscreen banner for VM/SSH consoles
     *
     * ASCII art logo with box drawing characters, dark background.
     * Displays all system information in a professional ESXi-style layout.
     *
     * @return string Rendered fullscreen banner
     */
    public function renderFullscreen(): string
    {
        $di = Di::getDefault();
        $translation = $di->getShared(TranslationProvider::SERVICE_NAME);

        $width = $this->styleConfig->getTerminalWidth();
        $innerWidth = $width - 2; // Account for box borders

        $lines = [];

        // Top border
        $lines[] = self::BOX_TOP_LEFT . str_repeat(self::BOX_HORIZONTAL, $innerWidth) . self::BOX_TOP_RIGHT;

        // ASCII Logo (centered) — top padding dropped to keep the banner ≤25 lines
        foreach (self::ASCII_LOGO as $logoLine) {
            $lines[] = $this->boxLine($this->centerText($logoLine, $innerWidth), $innerWidth);
        }

        // Slogan
        $slogan = 'Free phone system for small business';
        $lines[] = $this->boxLine($this->centerText($slogan, $innerWidth), $innerWidth);

        // PBX Name and Description section (if set)
        $pbxName = $this->dataCollector->getPbxName();
        $description = $this->dataCollector->getDescription();

        if ((!empty($pbxName) && $pbxName !== 'PBX system') || !empty($description)) {
            // Separator
            $lines[] = $this->boxSeparator($innerWidth);

            if (!empty($pbxName) && $pbxName !== 'PBX system') {
                $nameDisplay = '★ ' . $pbxName . ' ★';
                $lines[] = $this->boxLine(
                    $this->centerText(MenuStyleConfig::colorize($nameDisplay, MenuStyleConfig::COLOR_CYAN), $innerWidth),
                    $innerWidth,
                    true
                );
            }
            if (!empty($description)) {
                $lines[] = $this->boxLine($this->centerText($description, $innerWidth), $innerWidth);
            }
        }

        // Warnings section (if any)
        $hasWarnings = $this->dataCollector->hasCorruptedFiles()
            || $this->dataCollector->isLiveCd()
            || $this->dataCollector->isFirewallDisabled();
        if ($hasWarnings) {
            $lines[] = $this->boxSeparator($innerWidth);

            if ($this->dataCollector->hasCorruptedFiles()) {
                $warning = '⚠ ' . $translation->_('cm_SystemIntegrityBroken');
                $lines[] = $this->boxLine(
                    '  ' . MenuStyleConfig::colorize($warning, MenuStyleConfig::COLOR_RED),
                    $innerWidth,
                    true
                );
            }
            if ($this->dataCollector->isLiveCd()) {
                $warning = '⚠ ' . $translation->_('cm_PbxLiveModeWarning');
                $lines[] = $this->boxLine(
                    '  ' . MenuStyleConfig::colorize($warning, MenuStyleConfig::COLOR_RED),
                    $innerWidth,
                    true
                );
            }
            if ($this->dataCollector->isFirewallDisabled()) {
                $warning = '⚠ ' . $translation->_('cm_FirewallIsDisabled');
                $lines[] = $this->boxLine(
                    '  ' . MenuStyleConfig::colorize($warning, MenuStyleConfig::COLOR_RED),
                    $innerWidth,
                    true
                );
            }
        }

        // System info section
        $lines[] = $this->boxSeparator($innerWidth);

        $version = $this->dataCollector->getVersion();
        $virtualType = $this->dataCollector->getVirtualHardwareType();
        $arch = $this->dataCollector->getArchitecture();
        $buildTime = $this->dataCollector->getBuildTime();

        // Get uptime for display and service status logic
        $uptimeSeconds = $this->dataCollector->getUptimeSeconds();
        $uptime = $this->dataCollector->getUptime();
        $isStarting = $uptimeSeconds > 0 && $uptimeSeconds < self::STARTUP_GRACE_PERIOD;

        $versionStr = "MikoPBX v.$version";
        if (!empty($virtualType)) {
            $versionStr .= " in $virtualType";
        }
        $versionStr .= " ($arch)";

        // Row 1: Version only (full width)
        $lines[] = $this->boxLine(
            '  Version: ' . MenuStyleConfig::colorize($versionStr, MenuStyleConfig::COLOR_GREEN),
            $innerWidth,
            true
        );

        // System info block — semantically grouped 3×2 grid:
        //   Left column  (system/time): Built | Load | Uptime
        //   Right column (resources):   Mem   | Swap | Storage
        // Skip swap row entirely when swap_percent == 0 (no swap configured/used).
        $loadAvg = $this->dataCollector->getLoadAverage();
        $memInfo = $this->dataCollector->getMemoryInfo();
        $storageInfo = $this->dataCollector->getStorageInfo();

        $rowLeft = ['', '', ''];
        $rowRight = ['', '', ''];

        $rowLeft[0] = "  Built: $buildTime";
        if ($loadAvg !== null) {
            $cpuCores = $this->dataCollector->getCpuCores();
            $rowLeft[1] = '  Load: '
                . MenuStyleConfig::formatLoadValue($loadAvg['load1']) . ' '
                . MenuStyleConfig::formatLoadValue($loadAvg['load5']) . ' '
                . MenuStyleConfig::formatLoadValue($loadAvg['load15'])
                . " ($cpuCores cores)";
        }
        $rowLeft[2] = '  ' . $translation->_('cm_Uptime') . ': ' . $uptime;

        if ($memInfo !== null) {
            $memColor = $memInfo['mem_percent'] > 90
                ? MenuStyleConfig::COLOR_RED
                : ($memInfo['mem_percent'] > 70 ? MenuStyleConfig::COLOR_YELLOW : MenuStyleConfig::COLOR_GREEN);
            $rowRight[0] = 'Mem: ' . MenuStyleConfig::colorize(
                "{$memInfo['mem_used']} / {$memInfo['mem_total']} ({$memInfo['mem_percent']}%)",
                $memColor
            );
            if ($memInfo['swap_percent'] > 0) {
                $swapColor = $memInfo['swap_percent'] > 90
                    ? MenuStyleConfig::COLOR_RED
                    : ($memInfo['swap_percent'] > 70 ? MenuStyleConfig::COLOR_YELLOW : MenuStyleConfig::COLOR_GREEN);
                $rowRight[1] = 'Swap: ' . MenuStyleConfig::colorize(
                    "{$memInfo['swap_used']} / {$memInfo['swap_total']} ({$memInfo['swap_percent']}%)",
                    $swapColor
                );
            }
        }
        if ($storageInfo !== null) {
            $storageColor = $storageInfo['percent'] > 90
                ? MenuStyleConfig::COLOR_RED
                : ($storageInfo['percent'] > 70 ? MenuStyleConfig::COLOR_YELLOW : MenuStyleConfig::COLOR_GREEN);
            $rowRight[2] = $translation->_('cm_Storage') . ': ' . MenuStyleConfig::colorize(
                "{$storageInfo['used']} / {$storageInfo['total']} ({$storageInfo['percent']}%)",
                $storageColor
            );
        }

        // When swap row is empty on both sides, collapse it (Storage moves up to align with Load)
        for ($i = 0; $i < 3; $i++) {
            if ($rowLeft[$i] === '' && $rowRight[$i] === '') {
                continue;
            }
            $lines[] = $this->boxLineTwoCol($rowLeft[$i], $rowRight[$i], $innerWidth);
        }

        // Network section
        $lines[] = $this->boxSeparator($innerWidth);

        // Web Interface — single line; when behind NAT show external (cyan, primary)
        // and local (gray, secondary) side-by-side as two columns
        $webInfo = $this->dataCollector->getWebInterfaceInfo();
        $hasExternal = !empty($webInfo['externalUrl']);
        if ($hasExternal) {
            $left = '  Web : ' . MenuStyleConfig::colorize($webInfo['externalUrl'], MenuStyleConfig::COLOR_CYAN);
            $right = !empty($webInfo['url'])
                ? MenuStyleConfig::colorize($webInfo['url'], MenuStyleConfig::COLOR_GRAY)
                : '';
            $lines[] = $this->boxLineTwoCol($left, $right, $innerWidth);
        } elseif (!empty($webInfo['url'])) {
            $lines[] = $this->boxLine(
                '  ' . $translation->_('cm_WebInterfaceUrl') . ': '
                . MenuStyleConfig::colorize($webInfo['url'], MenuStyleConfig::COLOR_CYAN),
                $innerWidth,
                true
            );
        }

        // SSH access — same two-column layout when external address is configured
        $sshPort = $this->dataCollector->getSshPort();
        $sshLogin = $this->dataCollector->getSshLogin();
        if ($hasExternal) {
            $left = '  SSH : ' . $this->buildSshCommand($sshLogin, $webInfo['externalHost'], $sshPort);
            $right = !empty($webInfo['ip'])
                ? MenuStyleConfig::colorize(
                    $this->buildSshCommand($sshLogin, $webInfo['ip'], $sshPort),
                    MenuStyleConfig::COLOR_GRAY
                )
                : '';
            $lines[] = $this->boxLineTwoCol($left, $right, $innerWidth);
        } elseif (!empty($webInfo['ip'])) {
            $lines[] = $this->boxLine(
                '  SSH Access:    ' . $this->buildSshCommand($sshLogin, $webInfo['ip'], $sshPort),
                $innerWidth
            );
        }

        // Last login info
        $lastLogin = $this->dataCollector->getLastLogin();
        if ($lastLogin !== null) {
            $loginStr = '  ' . $translation->_('cm_LastLogin') . ':  ' . $lastLogin['datetime'];
            if (!empty($lastLogin['source'])) {
                $loginStr .= ' ' . $translation->_('cm_From') . ' ' . $lastLogin['source'];
            } else {
                $loginStr .= ' ' . $translation->_('cm_OnConsole');
            }
            $lines[] = $this->boxLine($loginStr, $innerWidth);
        }

        // Services section (two rows)
        // During startup (uptime < 2 min), show stopped services as yellow instead of red
        $lines[] = $this->boxSeparator($innerWidth);

        // Services in a single row (Core + System merged with a separator) to save space
        $services = $this->dataCollector->getServiceStatuses();
        $serviceParts = [];
        foreach ($services as $name => $running) {
            $serviceParts[] = $name . ' ' . MenuStyleConfig::formatServiceStatus($running, $isStarting);
        }
        $lines[] = $this->boxLine(
            '  ' . implode('  ', $serviceParts),
            $innerWidth,
            true
        );

        // Footer — single hint line combines "any key for menu" and "Ctrl+C to shell"
        $lines[] = $this->boxSeparator($innerWidth);

        $hint = MenuStyleConfig::colorize(
            $translation->_('cm_PressAnyKey'),
            MenuStyleConfig::COLOR_YELLOW
        ) . '  •  Ctrl+C ' . $translation->_('cm_ForShell');
        $lines[] = $this->boxLine($this->centerText($hint, $innerWidth), $innerWidth, true);

        // Bottom border
        $lines[] = self::BOX_BOTTOM_LEFT . str_repeat(self::BOX_HORIZONTAL, $innerWidth) . self::BOX_BOTTOM_RIGHT;

        return implode(PHP_EOL, $lines);
    }

    /**
     * Create a boxed line with content
     *
     * @param string $content Line content
     * @param int $innerWidth Inner width (without borders)
     * @param bool $hasAnsiCodes If true, content has ANSI codes that don't count toward visible length
     * @return string Boxed line
     */
    private function boxLine(string $content, int $innerWidth, bool $hasAnsiCodes = false): string
    {
        if ($hasAnsiCodes) {
            // Strip ANSI codes to calculate visible length
            $visibleContent = preg_replace('/\033\[[0-9;]*m/', '', $content);
            $visibleLen = mb_strlen($visibleContent);
            $padding = max(0, $innerWidth - $visibleLen);
            return self::BOX_VERTICAL . $content . str_repeat(' ', $padding) . self::BOX_VERTICAL;
        }

        $contentLen = mb_strlen($content);
        $padding = max(0, $innerWidth - $contentLen);
        return self::BOX_VERTICAL . $content . str_repeat(' ', $padding) . self::BOX_VERTICAL;
    }

    /**
     * Create a boxed line with two columns
     *
     * @param string $left Left column content
     * @param string $right Right column content
     * @param int $innerWidth Inner width
     * @return string Boxed two-column line
     */
    private function boxLineTwoCol(string $left, string $right, int $innerWidth): string
    {
        // Strip ANSI for length calculation
        $leftVisible = preg_replace('/\033\[[0-9;]*m/', '', $left);
        $rightVisible = preg_replace('/\033\[[0-9;]*m/', '', $right);

        $leftLen = mb_strlen($leftVisible);
        $rightLen = mb_strlen($rightVisible);

        $halfWidth = (int)($innerWidth / 2);
        $leftPadding = max(0, $halfWidth - $leftLen);
        $rightPadding = max(0, $innerWidth - $halfWidth - $rightLen);

        return self::BOX_VERTICAL . $left . str_repeat(' ', $leftPadding) . $right . str_repeat(' ', $rightPadding) . self::BOX_VERTICAL;
    }

    /**
     * Create a box separator line
     *
     * @param int $innerWidth Inner width
     * @return string Separator line
     */
    private function boxSeparator(int $innerWidth): string
    {
        return self::BOX_T_LEFT . str_repeat(self::BOX_HORIZONTAL, $innerWidth) . self::BOX_T_RIGHT;
    }

    /**
     * Render a horizontal `-----` section separator for the compact banner.
     * Indented to match the 4-space content margin.
     */
    private function compactSeparator(): string
    {
        return '    ' . str_repeat('-', self::COMPACT_SEPARATOR_WIDTH);
    }

    /**
     * Visible character width — strips ANSI escape sequences before counting.
     * Used for column alignment math where padding must account for color codes.
     */
    private function visibleWidth(string $s): int
    {
        return mb_strlen(preg_replace('/\033\[[0-9;]*m/', '', $s));
    }

    /**
     * Build SSH connection arguments "user@host[ -p port]" — valid OpenSSH syntax,
     * port omitted when default 22. Use buildSshCommand() to prepend the `ssh` binary.
     *
     * Note: `user@host:port` is NOT valid SSH command syntax (OpenSSH parses
     * `host:port` as a literal hostname). The `-p` flag is the canonical form.
     */
    private function buildSshArgs(string $login, string $host, string $port): string
    {
        $args = $login . '@' . $host;
        if ($port !== '' && $port !== '22') {
            $args .= ' -p ' . $port;
        }
        return $args;
    }

    /**
     * Build full "ssh user@host[ -p port]" command string for fullscreen banner.
     */
    private function buildSshCommand(string $login, string $host, string $port): string
    {
        return 'ssh ' . $this->buildSshArgs($login, $host, $port);
    }

    /**
     * Center text within given width
     *
     * @param string $text Text to center
     * @param int $width Total width
     * @return string Centered text with padding
     */
    private function centerText(string $text, int $width): string
    {
        // Strip ANSI codes for length calculation
        $visibleText = preg_replace('/\033\[[0-9;]*m/', '', $text);
        $textLen = mb_strlen($visibleText);

        if ($textLen >= $width) {
            return $text;
        }

        $leftPad = (int)(($width - $textLen) / 2);
        return str_repeat(' ', $leftPad) . $text;
    }

    /**
     * Run the banner with auto-refresh loop
     *
     * Uses adaptive refresh intervals to reduce system load:
     * - First 5 minutes after user activity: refresh every 10 seconds
     * - After 5 minutes idle on banner: refresh every 5 minutes
     * - When user returns from menu: resets to frequent refresh mode
     *
     * Automatically selects display mode based on console type:
     * - Serial console (ttyS*, ttyAMA*): compact text banner
     * - VM/SSH console: fullscreen banner with ASCII art and dark background
     *
     * Uses cursor repositioning instead of screen clear to reduce flicker.
     *
     * Exits on any key press, returning the key pressed.
     *
     * @return string|null The key pressed to exit, or null if Ctrl+C
     */
    public function runWithAutoRefresh(): ?string
    {
        // Static flag to prevent multiple shutdown handler registrations
        static $shutdownRegistered = false;

        // Determine display mode based on console type and terminal size.
        // Width and height are both checked — narrow OR short terminals get the
        // compact (~10-line) banner so the menu prompt stays visible without scroll.
        $useFullscreen = $this->envHelper->supportsFullscreenBanner()
            && $this->styleConfig->getTerminalWidth() >= self::FULLSCREEN_MIN_WIDTH
            && $this->styleConfig->getTerminalHeight() >= self::FULLSCREEN_MIN_HEIGHT;

        // Set terminal to non-blocking mode for key detection
        system('stty -icanon -echo');

        // Ensure terminal is restored on exit (register only once)
        if (!$shutdownRegistered) {
            register_shutdown_function(static function () {
                system('stty sane');
                MenuStyleConfig::resetTerminal();
            });
            $shutdownRegistered = true;
        }

        $lastRefresh = 0;
        $firstDraw = true;
        $activityTime = time(); // Track when user became active (entering banner = activity)

        while (true) {
            $now = time();
            $elapsedSinceActivity = $now - $activityTime;

            // Adaptive refresh interval:
            // - First 5 minutes after activity: refresh every 10 seconds
            // - After 5 minutes idle: refresh every 5 minutes
            $refreshInterval = ($elapsedSinceActivity < self::FREQUENT_REFRESH_PERIOD)
                ? self::FREQUENT_INTERVAL
                : self::INFREQUENT_INTERVAL;

            $timeSinceRefresh = $now - $lastRefresh;

            // Refresh banner based on adaptive interval
            if ($firstDraw || $timeSinceRefresh >= $refreshInterval) {
                if ($firstDraw) {
                    // First draw - set up background
                    if ($useFullscreen) {
                        $this->styleConfig->fillScreenBackground(MenuStyleConfig::BG_DARK);
                    } else {
                        MenuStyleConfig::clearScreen();
                    }
                    $firstDraw = false;
                } else {
                    // Subsequent draws - just move cursor to top (no clear = less flicker)
                    echo MenuStyleConfig::CURSOR_HOME;
                }

                if ($useFullscreen) {
                    echo MenuStyleConfig::COLOR_WHITE;
                    echo $this->renderFullscreen();
                } else {
                    echo $this->render();
                }
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
                MenuStyleConfig::resetTerminal();
                MenuStyleConfig::clearScreen();

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

        // PBX Name (only if customized)
        $pbxName = $this->dataCollector->getPbxName();
        if (!empty($pbxName) && $pbxName !== 'PBX system') {
            $lines[] = '    ' . MenuStyleConfig::colorize($pbxName, MenuStyleConfig::COLOR_CYAN);
        }

        // Description (if not empty)
        $description = $this->dataCollector->getDescription();
        if (!empty($description)) {
            $lines[] = '    ' . $description;
        }

        // LiveCD warning
        if ($this->dataCollector->isLiveCd()) {
            $lines[] = '    ' . MenuStyleConfig::colorize(
                $translation->_('cm_PbxLiveModeWarning'),
                MenuStyleConfig::COLOR_RED
            );
        }

        // Firewall disabled warning
        if ($this->dataCollector->isFirewallDisabled()) {
            $lines[] = '    ' . MenuStyleConfig::colorize(
                $translation->_('cm_FirewallIsDisabled'),
                MenuStyleConfig::COLOR_RED
            );
        }

        return implode(PHP_EOL, $lines);
    }
}
