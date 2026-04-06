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

declare(strict_types=1);

namespace MikoPBX\AdminCabinet\Library;

/**
 * Security utility class for XSS prevention and data sanitization
 * 
 * Provides context-aware escaping methods following OWASP guidelines:
 * - HTML context: escapeHtml()
 * - JavaScript context: escapeJs()
 * - URL context: escapeUrl()
 * - CSS context: escapeCss()
 * 
 * @example
 * // In Volt templates:
 * {{ variable|e }}                    // HTML context (recommended)
 * 
 * // In PHP code:
 * SecurityHelper::escapeHtml($data)   // HTML context
 * SecurityHelper::escapeJs($data)     // JavaScript strings
 * SecurityHelper::escapeUrl($data)    // URL parameters
 * SecurityHelper::escapeCss($data)    // CSS values
 */
class SecurityHelper
{
    /**
     * Escape data for HTML context
     * 
     * Converts special characters to HTML entities to prevent XSS.
     * Use for data that will be displayed in HTML content.
     * 
     * @param string|null $data Data to escape
     * @return string Escaped HTML-safe string
     * 
     * @example
     * echo SecurityHelper::escapeHtml('<script>alert("xss")</script>');
     * // Output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
     */
    public static function escapeHtml(?string $data): string
    {
        if ($data === null) {
            return '';
        }
        
        return htmlspecialchars($data, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    }
    
    /**
     * Escape data for JavaScript string context
     * 
     * Properly escapes data for use inside JavaScript strings.
     * Use when embedding data in JavaScript code.
     * 
     * @param string|null $data Data to escape
     * @return string Escaped JavaScript-safe string
     * 
     * @example
     * $jsData = SecurityHelper::escapeJs($userInput);
     * echo "var message = '{$jsData}';";
     */
    public static function escapeJs(?string $data): string
    {
        if ($data === null) {
            return '';
        }
        
        // Use JSON encoding for proper JavaScript escaping
        $encoded = json_encode($data, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
        
        // Remove surrounding quotes added by json_encode
        return trim($encoded, '"');
    }
    
    /**
     * Escape data for URL context
     * 
     * URL-encodes data for safe use in URLs and query parameters.
     * Use when building URLs with user data.
     * 
     * @param string|null $data Data to escape
     * @return string URL-encoded string
     * 
     * @example
     * $safeParam = SecurityHelper::escapeUrl($userInput);
     * $url = "https://example.com/search?q={$safeParam}";
     */
    public static function escapeUrl(?string $data): string
    {
        if ($data === null) {
            return '';
        }
        
        return urlencode($data);
    }
    
    /**
     * Escape data for CSS context
     * 
     * Escapes data for safe use in CSS values.
     * Use when dynamically generating CSS with user data.
     * 
     * @param string|null $data Data to escape
     * @return string CSS-safe string
     * 
     * @example
     * $safeColor = SecurityHelper::escapeCss($userColor);
     * echo "color: {$safeColor};";
     */
    public static function escapeCss(?string $data): string
    {
        if ($data === null) {
            return '';
        }
        
        // CSS escaping: escape dangerous characters
        $search = ['\\', '"', "'", '/', '<', '>', '&', "\n", "\r", "\t", "\f", "\v", "\0"];
        $replace = ['\\\\', '\\"', "\\'", '\\/', '\\<', '\\>', '\\&', '\\A', '\\D', '\\9', '\\C', '\\B', '\\0'];
        
        return str_replace($search, $replace, $data);
    }
    
    /**
     * Escape data for HTML attribute context
     * 
     * Special escaping for HTML attributes (data-*, id, class, etc.)
     * More restrictive than general HTML escaping.
     * 
     * @param string|null $data Data to escape
     * @return string Attribute-safe string
     * 
     * @example
     * $safeId = SecurityHelper::escapeAttribute($userId);
     * echo "<div id='{$safeId}'>Content</div>";
     */
    public static function escapeAttribute(?string $data): string
    {
        if ($data === null) {
            return '';
        }
        
        // More restrictive escaping for attributes
        return htmlspecialchars($data, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    }
    
    /**
     * Check if string contains potentially dangerous content
     * 
     * Utility method to detect common XSS patterns.
     * Not a replacement for proper escaping!
     * 
     * @param string|null $data Data to check
     * @return bool True if potentially dangerous content detected
     * 
     * @example
     * if (SecurityHelper::containsDangerousContent($input)) {
     *     // Additional validation or logging
     * }
     */
    public static function containsDangerousContent(?string $data): bool
    {
        if ($data === null) {
            return false;
        }
        
        $dangerousPatterns = [
            '/<script\b/i',                                         // Script tags (any script tag)
            '/javascript:/i',                                        // JavaScript protocol
            '/on\w+\s*[=!]/i',                                      // Event handlers (including onload!)
            '/<iframe\b/i',                                         // Iframe tags
            '/<object\b/i',                                         // Object tags
            '/<embed\b/i',                                          // Embed tags
            '/data:\s*text\/html/i',                               // Data URLs with HTML
        ];
        
        foreach ($dangerousPatterns as $pattern) {
            if (preg_match($pattern, $data)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Sanitize filename for safe filesystem operations
     * 
     * Removes or replaces characters that could be dangerous in filenames.
     * 
     * @param string|null $filename Filename to sanitize
     * @return string Safe filename
     * 
     * @example
     * $safeFile = SecurityHelper::sanitizeFilename($userFilename);
     * file_put_contents("/uploads/{$safeFile}", $content);
     */
    public static function sanitizeFilename(?string $filename): string
    {
        if ($filename === null || trim($filename) === '') {
            return 'unnamed_file';
        }
        
        // Remove path separators and dangerous characters
        $filename = preg_replace('/[\/\\\\:*?"<>|]/', '', $filename);
        
        // Remove control characters
        $filename = preg_replace('/[\x00-\x1f\x7f]/', '', $filename);
        
        // Trim dots and spaces from ends
        $filename = trim($filename, '. ');
        
        // Ensure filename is not empty after cleaning
        if (empty($filename)) {
            return 'unnamed_file';
        }
        
        // Check against reserved Windows filenames (case insensitive)
        $baseName = pathinfo($filename, PATHINFO_FILENAME);
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        
        $reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        if (in_array(strtoupper($baseName), $reserved)) {
            $filename = '_' . $filename;
        }
        
        return $filename;
    }
}