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

namespace MikoPBX\Core\System\ConsoleMenu\Utilities;

use PhpSchool\CliMenu\Builder\CliMenuBuilder;
use PhpSchool\CliMenu\MenuStyle;
use PhpSchool\CliMenu\Style\SelectableStyle;

/**
 * Centralized menu styling configuration
 *
 * Provides consistent styling across all console menus with
 * terminal width detection and color scheme definitions.
 */
class MenuStyleConfig
{
    // Terminal width constraints
    private const int MIN_WIDTH = 60;
    private const int MAX_WIDTH = 160;
    private const int DEFAULT_WIDTH = 80;

    // ANSI color codes
    public const string COLOR_GREEN = "\033[01;32m";
    public const string COLOR_RED = "\033[01;31m";
    public const string COLOR_YELLOW = "\033[01;33m";
    public const string COLOR_CYAN = "\033[01;36m";
    public const string COLOR_BLUE = "\033[01;34m";
    public const string COLOR_RESET = "\033[39m";
    public const string COLOR_BOLD = "\033[1m";
    public const string COLOR_RESET_ALL = "\033[0m";

    // Service status indicators
    public const string STATUS_OK = '●';
    public const string STATUS_FAIL = '○';

    private int $terminalWidth;

    public function __construct()
    {
        $this->terminalWidth = $this->detectTerminalWidth();
    }

    /**
     * Detect terminal width using tput
     *
     * @return int Terminal width in characters
     */
    private function detectTerminalWidth(): int
    {
        $width = 0;
        exec('tput cols 2>/dev/null', $output, $exitCode);

        if ($exitCode === 0 && !empty($output[0])) {
            $width = (int)$output[0];
        }

        // Apply constraints
        if ($width < self::MIN_WIDTH) {
            return self::DEFAULT_WIDTH;
        }

        return min($width, self::MAX_WIDTH);
    }

    /**
     * Get the detected terminal width
     *
     * @return int Terminal width in characters
     */
    public function getTerminalWidth(): int
    {
        return $this->terminalWidth;
    }

    /**
     * Get the menu width (terminal width minus padding)
     *
     * @return int Menu width in characters
     */
    public function getMenuWidth(): int
    {
        return max(self::MIN_WIDTH, $this->terminalWidth - 4);
    }

    /**
     * Check if terminal is too narrow for banner display
     *
     * @return bool True if terminal is narrower than minimum width
     */
    public function isNarrowTerminal(): bool
    {
        return $this->terminalWidth < self::MIN_WIDTH;
    }

    /**
     * Apply standard menu styling to a menu builder
     *
     * @param CliMenuBuilder $builder The menu builder to configure
     * @return CliMenuBuilder The configured builder
     */
    public function applyMenuStyle(CliMenuBuilder $builder): CliMenuBuilder
    {
        return $builder
            ->setWidth($this->getMenuWidth())
            ->setPadding(0)
            ->setMarginAuto()
            ->setForegroundColour('white', 'white')
            ->setBackgroundColour('black', 'black')
            ->enableAutoShortcuts()
            ->modifySelectableStyle(function (SelectableStyle $style) {
                $style->setSelectedMarker(' ')
                    ->setUnselectedMarker(' ');
            });
    }

    /**
     * Apply submenu styling to a menu builder
     *
     * @param CliMenuBuilder $builder The menu builder to configure
     * @return CliMenuBuilder The configured builder
     */
    public function applySubmenuStyle(CliMenuBuilder $builder): CliMenuBuilder
    {
        return $builder
            ->setWidth($this->getMenuWidth())
            ->setBackgroundColour('black', 'black')
            ->setForegroundColour('white', 'white')
            ->enableAutoShortcuts()
            ->disableDefaultItems()
            ->modifySelectableStyle(function (SelectableStyle $style) {
                $style->setSelectedMarker('> ')
                    ->setUnselectedMarker('  ');
            });
    }

    /**
     * Get input dialog style
     *
     * @return MenuStyle Style for input dialogs
     */
    public function getInputStyle(): MenuStyle
    {
        return (new MenuStyle())
            ->setBg('white')
            ->setFg('black');
    }

    /**
     * Format text with color
     *
     * @param string $text Text to format
     * @param string $color ANSI color code
     * @return string Formatted text
     */
    public static function colorize(string $text, string $color): string
    {
        return $color . $text . self::COLOR_RESET;
    }

    /**
     * Format service status indicator
     *
     * @param bool $isRunning Service running status
     * @return string Colored status indicator
     */
    public static function formatServiceStatus(bool $isRunning): string
    {
        $useAscii = self::shouldUseAsciiSymbols();

        if ($isRunning) {
            $symbol = $useAscii ? '*' : self::STATUS_OK;
            return self::colorize($symbol, self::COLOR_GREEN);
        }

        $symbol = $useAscii ? 'x' : self::STATUS_FAIL;
        return self::colorize($symbol, self::COLOR_RED);
    }

    /**
     * Check if ASCII symbols should be used instead of Unicode
     *
     * VGA console and system console don't support Unicode symbols,
     * so we use ASCII alternatives for status indicators.
     *
     * @return bool True if ASCII symbols should be used
     */
    private static function shouldUseAsciiSymbols(): bool
    {
        $tty = @exec('tty 2>/dev/null');

        // System console or VGA virtual console - use ASCII
        if ($tty === '/dev/console' || preg_match('#/dev/tty\d+$#', $tty)) {
            return true;
        }

        return false;
    }

    /**
     * Create a horizontal line separator
     *
     * @param int $width Line width
     * @param string $char Character to use
     * @return string The separator line
     */
    public function createSeparator(int $width = 0, string $char = '-'): string
    {
        if ($width === 0) {
            $width = $this->getMenuWidth();
        }
        return str_repeat($char, $width);
    }
}
