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

namespace MikoPBX\Core\System\Mail;

/**
 * Class EmailTemplateRenderer
 *
 * Helper class for building HTML components used in email templates.
 * Provides methods for common email elements like tables, progress bars, lists, etc.
 * All output is HTML-escaped for security.
 *
 * @package MikoPBX\Core\System\Mail
 */
class EmailTemplateRenderer
{
    /**
     * Build HTML table rows from array of label-value pairs
     *
     * Generates HTML <tr> elements for use in data tables within emails.
     * Each row contains a label (left column) and value (right column).
     * Values are displayed in monospace font for technical data.
     *
     * @param array<int, array{label: string, value: string, escapeValue?: bool}> $rows Array of row data
     * @return string HTML table rows
     *
     * @example
     * $rows = [
     *     ['label' => 'SMTP Server', 'value' => 'smtp.gmail.com'],
     *     ['label' => 'Port', 'value' => '587'],
     *     ['label' => 'Phone', 'value' => '<a href="tel:+1234">+1234</a>', 'escapeValue' => false]
     * ];
     * $html = EmailTemplateRenderer::buildDataTableRows($rows);
     */
    public static function buildDataTableRows(array $rows): string
    {
        $html = '';

        foreach ($rows as $row) {
            if (!isset($row['label']) || !isset($row['value'])) {
                continue;
            }

            $label = self::escapeHtml($row['label']);
            // Allow passing pre-escaped HTML by setting escapeValue to false
            $escapeValue = $row['escapeValue'] ?? true;
            $value = $escapeValue ? self::escapeHtml($row['value']) : $row['value'];

            $html .= '<tr>';

            // Label column
            $html .= '<td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; ';
            $html .= 'font-size: 14px; color: #6c757d; padding: 8px 0; vertical-align: top;">';
            $html .= $label . ':';
            $html .= '</td>';

            // Value column (monospace font for technical data)
            $html .= '<td style="font-family: \'SF Mono\', Monaco, \'Courier New\', monospace; font-size: 14px; color: #212529; ';
            $html .= 'padding: 8px 0; padding-left: 20px; word-break: break-all; vertical-align: top;">';
            $html .= '<strong>' . $value . '</strong>';
            $html .= '</td>';

            $html .= '</tr>';
        }

        return $html;
    }

    /**
     * Build HTML progress bar (e.g., for disk usage)
     *
     * Creates a responsive progress bar with percentage display.
     * Color automatically adjusts based on percentage (green/yellow/red).
     *
     * @param int $percentage Usage percentage (0-100)
     * @param string|null $customColor Optional custom color override
     * @return string HTML progress bar
     *
     * @example
     * $html = EmailTemplateRenderer::buildProgressBar(85);
     * // Returns red progress bar at 85%
     */
    public static function buildProgressBar(int $percentage, ?string $customColor = null): string
    {
        $percentage = max(0, min(100, $percentage)); // Clamp to 0-100

        // Auto-select color based on percentage
        if ($customColor === null) {
            $color = match(true) {
                $percentage >= 90 => '#ff6b6b',  // Red - critical
                $percentage >= 75 => '#ffa502',  // Orange - warning
                default => '#20bf6b'              // Green - ok
            };
        } else {
            $color = self::escapeHtml($customColor);
        }

        $html = '<div style="margin: 20px 0;">';

        // Percentage text above progress bar
        $html .= '<div style="text-align: center; margin-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; ';
        $html .= 'font-size: 24px; font-weight: bold; color: ' . $color . ';">';
        $html .= $percentage . '%';
        $html .= '</div>';

        // Progress bar container
        $html .= '<div style="background-color: #f1f3f5; border-radius: 8px; padding: 4px;">';

        // Inner progress bar (without text)
        $html .= '<div style="background-color: ' . $color . '; width: ' . $percentage . '%; ';
        $html .= 'height: 20px; border-radius: 4px; transition: width 0.3s ease;">';
        $html .= '</div>';

        $html .= '</div>';
        $html .= '</div>';

        return $html;
    }

    /**
     * Build HTML list of updates/modules
     *
     * Creates styled list of software updates with version numbers and descriptions.
     *
     * @param array<int, array{name: string, version: string, description?: string}> $updates Array of update info
     * @return string HTML updates list
     *
     * @example
     * $updates = [
     *     ['name' => 'MikoPBX Core', 'version' => '2024.3.5', 'description' => 'Bug fixes'],
     *     ['name' => 'Module CTI', 'version' => '1.2.3', 'description' => 'New features']
     * ];
     * $html = EmailTemplateRenderer::buildUpdatesList($updates);
     */
    public static function buildUpdatesList(array $updates): string
    {
        if (empty($updates)) {
            return '';
        }

        $html = '<div style="margin: 25px 0;">';
        $html .= '<h3 style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; ';
        $html .= 'font-size: 16px; color: #333333; margin-bottom: 15px;">Available Updates:</h3>';

        foreach ($updates as $update) {
            if (!isset($update['name']) || !isset($update['version'])) {
                continue;
            }

            $name = self::escapeHtml($update['name']);
            $version = self::escapeHtml($update['version']);
            $description = isset($update['description']) ? self::escapeHtml($update['description']) : '';

            $html .= '<div style="background-color: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 6px; border-left: 3px solid #6c5ce7;">';
            $html .= '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">';
            $html .= '<strong style="color: #333333; font-size: 14px;">' . $name . '</strong>';
            $html .= ' <span style="color: #6c757d; font-size: 12px;">v' . $version . '</span><br>';

            if ($description !== '') {
                $html .= '<span style="color: #6c757d; font-size: 13px;">' . $description . '</span>';
            }

            $html .= '</div>';
            $html .= '</div>';
        }

        $html .= '</div>';

        return $html;
    }

    /**
     * Build HTML information box with border accent
     *
     * Creates colored info box for warnings, tips, or additional information.
     *
     * @param string $content Box content (can contain HTML)
     * @param string $borderColor Left border color (hex)
     * @param string $backgroundColor Background color (hex, default light gray)
     * @return string HTML info box
     *
     * @example
     * $html = EmailTemplateRenderer::buildInfoBox(
     *     '<strong>Warning:</strong> Disk space low',
     *     '#ff6b6b'
     * );
     */
    public static function buildInfoBox(
        string $content,
        string $borderColor = '#007bff',
        string $backgroundColor = '#f8f9fa'
    ): string {
        $borderColor = self::escapeHtml($borderColor);
        $backgroundColor = self::escapeHtml($backgroundColor);

        $html = '<div style="background-color: ' . $backgroundColor . '; border-left: 4px solid ' . $borderColor . '; ';
        $html .= 'padding: 20px; margin: 25px 0; border-radius: 4px;">';
        $html .= '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; ';
        $html .= 'font-size: 14px; color: #495057; line-height: 1.6;">';
        $html .= $content;  // Content can contain safe HTML from builder
        $html .= '</div>';
        $html .= '</div>';

        return $html;
    }

    /**
     * Build partitions list for disk space warnings
     *
     * Creates formatted list of disk partitions with usage information.
     *
     * @param array<int, array{name: string, usage: int}> $partitions Array of partition data
     * @return string HTML partitions list
     *
     * @example
     * $partitions = [
     *     ['name' => '/storage/usbdisk1', 'usage' => 85],
     *     ['name' => '/cf', 'usage' => 45]
     * ];
     * $html = EmailTemplateRenderer::buildPartitionsList($partitions);
     */
    public static function buildPartitionsList(array $partitions): string
    {
        if (empty($partitions)) {
            return '';
        }

        $html = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; ';
        $html .= 'font-size: 14px; color: #495057; margin-top: 15px;">';
        $html .= '<strong>Affected Partitions:</strong><br>';

        foreach ($partitions as $partition) {
            if (!isset($partition['name']) || !isset($partition['usage'])) {
                continue;
            }

            $name = self::escapeHtml($partition['name']);
            $usage = (int)$partition['usage'];

            $html .= '• ' . $name . ': ' . $usage . '% used<br>';
        }

        $html .= '</div>';

        return $html;
    }

    /**
     * Escape HTML special characters for security
     *
     * Prevents XSS attacks by converting special characters to HTML entities.
     * Always use this method when outputting user-provided data.
     *
     * @param string $text Text to escape
     * @return string Escaped text safe for HTML output
     */
    public static function escapeHtml(string $text): string
    {
        return htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * Build call-to-action button
     *
     * Creates styled button with link for email templates.
     *
     * @param string $url Button destination URL
     * @param string $text Button text
     * @param string $color Button background color (hex)
     * @return string HTML button
     *
     * @example
     * $html = EmailTemplateRenderer::buildButton(
     *     'https://pbx.example.com/admin',
     *     'Go to Admin Panel',
     *     '#007bff'
     * );
     */
    public static function buildButton(string $url, string $text, string $color = '#007bff'): string
    {
        $url = self::escapeHtml($url);
        $text = self::escapeHtml($text);
        $color = self::escapeHtml($color);

        $html = '<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto;">';
        $html .= '<tr>';
        $html .= '<td class="button-container" align="center">';
        $html .= '<a href="' . $url . '" target="_blank" class="button" ';
        $html .= 'style="display: inline-block; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; ';
        $html .= 'font-size: 16px; font-weight: 600; color: #ffffff; background-color: ' . $color . '; ';
        $html .= 'text-decoration: none; padding: 14px 30px; border-radius: 6px; border: 2px solid ' . $color . ';">';
        $html .= $text;
        $html .= '</a>';
        $html .= '</td>';
        $html .= '</tr>';
        $html .= '</table>';

        return $html;
    }
}
