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

namespace MikoPBX\PBXCoreREST\Lib\Common;

use MikoPBX\AdminCabinet\Library\SecurityHelper;

/**
 * Unified text field processor for consistent handling of user input across REST API
 * 
 * Implements the "Store Raw, Escape at Edge" principle:
 * - Minimal sanitization on input (only dangerous content removal)
 * - Context-aware escaping on output
 * - No HTML entity decoding to prevent double-escaping issues
 * 
 * This class replaces the problematic BaseActionHelper::decodeHtmlEntities() pattern
 * used in CallQueues and IVR Menu SaveRecordAction classes.
 */
class TextFieldProcessor
{
    /**
     * XSS sanitization for storage - removes dangerous content while preserving safe text
     * 
     * This method is for INPUT sanitization before storage:
     * - Removes dangerous tags (script, iframe, object, embed)
     * - Removes javascript: URLs and event handlers
     * - Preserves quotes, special characters, and emojis
     * - Does NOT HTML-encode (that's for output only)
     *
     * @param string|null $text Input text to sanitize
     * @return string Sanitized text safe for database storage
     */
    public static function sanitizeForStorage(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        // Trim whitespace
        $text = trim($text);
        
        // Remove null bytes that could cause issues
        $text = str_replace("\0", '', $text);
        
        // Remove dangerous tags and their content
        $dangerousTags = ['script', 'iframe', 'object', 'embed', 'applet', 'meta', 'link', 'style'];
        foreach ($dangerousTags as $tag) {
            $text = preg_replace('/<' . $tag . '\b[^<]*(?:(?!<\/' . $tag . '>)<[^<]*)*<\/' . $tag . '>/mi', '', $text);
            // Also remove self-closing variants
            $text = preg_replace('/<' . $tag . '\b[^>]*\/>/mi', '', $text);
        }
        
        // Remove javascript: protocol URLs
        $text = preg_replace('/javascript:[^"\']*["\']?/i', '', $text);
        
        // Remove vbscript: protocol URLs
        $text = preg_replace('/vbscript:[^"\']*["\']?/i', '', $text);
        
        // Remove data: URLs with script content
        $text = preg_replace('/data:text\/html[^"\']*["\']?/i', '', $text);
        
        // Remove on* event handlers (onclick, onload, etc.)
        $text = preg_replace('/\s*on\w+\s*=\s*[^>]*/i', '', $text);
        
        // Remove form tags to prevent form injection
        $text = preg_replace('/<\/?form[^>]*>/i', '', $text);
        
        return $text;
    }
    
    /**
     * Legacy method for backward compatibility - redirects to sanitizeForStorage
     * 
     * @deprecated Use sanitizeForStorage() instead
     * @param string|null $text Input text to sanitize
     * @return string Sanitized text safe for database storage
     */
    public static function sanitizeInput(?string $text): string
    {
        return self::sanitizeForStorage($text);
    }

    /**
     * Escape text for HTML context output
     * 
     * Converts special characters to HTML entities to prevent XSS attacks.
     * Use this when outputting user data in HTML content.
     *
     * @param string|null $text Text to escape for HTML
     * @return string HTML-safe text
     */
    public static function escapeForHtml(?string $text): string
    {
        return SecurityHelper::escapeHtml($text);
    }

    /**
     * Escape text for JSON context output
     * 
     * Properly escapes text for inclusion in JSON responses.
     * Uses JSON encoding to handle quotes and special characters.
     *
     * @param string|null $text Text to escape for JSON
     * @return string JSON-safe text
     */
    public static function escapeForJson(?string $text): string
    {
        if ($text === null) {
            return '';
        }
        
        // Use json_encode to properly escape for JSON context
        $encoded = json_encode($text, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
        
        // Remove surrounding quotes added by json_encode
        return trim($encoded, '"');
    }

    /**
     * Escape text for HTML attribute context
     * 
     * Special escaping for HTML attributes (data-*, id, class, etc.)
     * More restrictive than general HTML escaping.
     *
     * @param string|null $text Text to escape for HTML attributes  
     * @return string Attribute-safe text
     */
    public static function escapeForAttribute(?string $text): string
    {
        return SecurityHelper::escapeAttribute($text);
    }

    /**
     * Check if text contains potentially dangerous content and return threat details
     * 
     * Performs comprehensive security checks for malicious patterns:
     * - Script tags and JavaScript code
     * - SQL injection patterns  
     * - PHP code injection
     * - HTML form elements
     * - External references and data URIs
     *
     * @param string|null $text Text to check
     * @return array Array of detected threats (empty if safe)
     */
    public static function containsDangerousContent(?string $text): array
    {
        if ($text === null || $text === '') {
            return [];
        }
        
        $threats = [];
        
        // Check for script tags
        if (preg_match('/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi', $text)) {
            $threats[] = 'Script tags detected';
        }
        
        // Check for iframe tags
        if (preg_match('/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/mi', $text)) {
            $threats[] = 'Iframe tags detected';
        }
        
        // Check for javascript: URLs
        if (preg_match('/javascript:[^"\']*["\']?/i', $text)) {
            $threats[] = 'JavaScript URLs detected';
        }
        
        // Check for vbscript: URLs
        if (preg_match('/vbscript:[^"\']*["\']?/i', $text)) {
            $threats[] = 'VBScript URLs detected';
        }
        
        // Check for data: URLs with HTML/script content
        if (preg_match('/data:text\/(html|javascript)[^"\']*["\']?/i', $text)) {
            $threats[] = 'Data URLs with script content detected';
        }
        
        // Check for event handlers
        if (preg_match('/\s*on\w+\s*=\s*[^>]*/i', $text)) {
            $threats[] = 'Event handlers detected';
        }
        
        // Check for PHP tags
        if (preg_match('/<\?php|<\?=/i', $text)) {
            $threats[] = 'PHP tags detected';
        }
        
        // Check for SSI (Server Side Includes)
        if (preg_match('/<!--#\w+/i', $text)) {
            $threats[] = 'Server Side Includes detected';
        }
        
        // Basic SQL injection patterns
        if (preg_match('/(\bunion\b.*\bselect\b|\bdelete\b.*\bfrom\b|\binsert\b.*\binto\b|\bupdate\b.*\bset\b)/i', $text)) {
            $threats[] = 'Potential SQL injection patterns detected';
        }
        
        return $threats;
    }

    /**
     * Process array of text fields with XSS sanitization for storage
     * 
     * Applies sanitizeForStorage() to specified fields in a data array.
     * Useful for batch processing of form data before database storage.
     *
     * @param array $data Input data array
     * @param array $textFields List of field names to process
     * @return array Data array with sanitized text fields
     */
    public static function sanitizeTextFields(array $data, array $textFields): array
    {
        $result = $data;
        
        foreach ($textFields as $field) {
            if (isset($result[$field])) {
                $result[$field] = self::sanitizeForStorage($result[$field]);
            }
        }
        
        return $result;
    }

    /**
     * Process array of text fields with HTML escaping for output
     * 
     * Applies escapeForHtml() to specified fields in a data array.
     * Use when preparing data for HTML template output.
     *
     * @param array $data Input data array  
     * @param array $textFields List of field names to escape
     * @return array Data array with HTML-escaped text fields
     */
    public static function escapeTextFieldsForHtml(array $data, array $textFields): array
    {
        $result = $data;
        
        foreach ($textFields as $field) {
            if (isset($result[$field])) {
                $result[$field] = self::escapeForHtml($result[$field]);
            }
        }
        
        return $result;
    }

    /**
     * Validate that text fields don't contain dangerous content
     * 
     * Checks multiple text fields for security issues and returns
     * validation errors for any problematic fields.
     *
     * @param array $data Data array to validate
     * @param array $textFields List of field names to check
     * @return array Array of validation errors (field => threats array)
     */
    public static function validateTextFieldsSecurity(array $data, array $textFields): array
    {
        $errors = [];
        
        foreach ($textFields as $field) {
            if (isset($data[$field])) {
                $threats = self::containsDangerousContent($data[$field]);
                if (!empty($threats)) {
                    $errors[$field] = $threats;
                }
            }
        }
        
        return $errors;
    }

    /**
     * Clean text by removing HTML tags but preserving entities
     * 
     * Strips HTML tags while keeping text content and HTML entities intact.
     * More aggressive than sanitizeInput() but preserves readable content.
     *
     * @param string|null $text Text to clean
     * @return string Cleaned text without HTML tags
     */
    public static function stripHtmlTags(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        // Remove HTML tags but preserve entities
        $text = strip_tags($text);
        
        // Trim and normalize whitespace
        $text = trim(preg_replace('/\s+/', ' ', $text));
        
        return $text;
    }
}