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

namespace MikoPBX\PBXCoreREST\Lib\Common;

/**
 * Trait for generating search index field for DataTable search functionality
 * 
 * This trait provides methods to generate a unified search index from multiple fields,
 * making DataTable search more reliable and efficient, especially for fields with
 * special formatting like <000063> or HTML content.
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Common
 */
trait SearchIndexTrait
{
    /**
     * Generate search index automatically from all available fields
     * Prioritizes _represent fields and intelligently processes all data
     * 
     * @param array $data - Complete data array
     * @return string - Generated search index
     */
    protected static function generateAutoSearchIndex(array $data): string
    {
        $searchParts = [];
        $processedFields = [];
        
        // First, collect all _represent fields as they contain the most user-friendly text
        foreach ($data as $field => $value) {
            if (substr($field, -10) === '_represent' && !empty($value)) {
                // Strip HTML tags and add to search parts
                $cleanValue = strip_tags($value);
                if (!empty($cleanValue)) {
                    $searchParts[] = $cleanValue;
                    // Mark base field as processed
                    $baseField = substr($field, 0, -10);
                    $processedFields[$baseField] = true;
                }
            }
        }
        
        // Add main fields that don't have _represent versions
        $mainFields = ['name', 'extension', 'description', 'number', 'username', 'email'];
        foreach ($mainFields as $field) {
            if (isset($data[$field]) && !isset($processedFields[$field])) {
                $value = self::valueToSearchString($data[$field]);
                if (!empty($value)) {
                    $searchParts[] = $value;
                    $processedFields[$field] = true;
                }
            }
        }
        
        // Process arrays (like actions in IVR menu)
        foreach ($data as $field => $value) {
            if (is_array($value) && !isset($processedFields[$field])) {
                $arrayParts = self::processArrayForSearch($value);
                if (!empty($arrayParts)) {
                    $searchParts[] = $arrayParts;
                }
            }
        }
        
        // Join and normalize
        $searchIndex = implode(' ', $searchParts);
        return self::normalizeSearchIndex($searchIndex);
    }
    
    /**
     * Process array data for search index
     * 
     * @param array $array - Array to process
     * @return string
     */
    private static function processArrayForSearch(array $array): string
    {
        $parts = [];
        
        foreach ($array as $item) {
            if (is_array($item)) {
                // For nested arrays (like actions), extract represent fields
                if (isset($item['represent'])) {
                    $representText = strip_tags($item['represent']);
                    $parts[] = $representText;
                    
                    // Extract extension numbers from represent field
                    // Pattern matches numbers in angle brackets like <000064> or <2200100>
                    if (preg_match_all('/<(\d+)>/', $item['represent'], $matches)) {
                        foreach ($matches[1] as $number) {
                            $parts[] = $number; // Add plain number
                            $parts[] = '<' . $number . '>'; // Add with brackets
                        }
                    }
                }
                // Also add any extension numbers found in other fields
                if (isset($item['extension'])) {
                    $parts[] = $item['extension'];
                    $parts[] = '<' . $item['extension'] . '>';
                }
                // Process other string fields but skip represent since we already handled it
                foreach ($item as $key => $value) {
                    if ($key !== 'represent' && $key !== 'extension' && !empty($value) && is_string($value)) {
                        $parts[] = self::valueToSearchString($value);
                    }
                }
            } else {
                $parts[] = self::valueToSearchString($item);
            }
        }
        
        return implode(' ', array_filter($parts));
    }
    /**
     * Generate search index from specified fields
     * 
     * @param array $data - Data array containing fields
     * @param array $searchableFields - List of field names to include in search index
     * @param array $customFormatters - Optional custom formatters for specific fields
     * @return string - Generated search index
     */
    protected static function generateSearchIndex(array $data, array $searchableFields, array $customFormatters = []): string
    {
        $searchParts = [];
        
        foreach ($searchableFields as $field) {
            if (!isset($data[$field])) {
                continue;
            }
            
            $value = $data[$field];
            
            // Apply custom formatter if exists
            if (isset($customFormatters[$field]) && is_callable($customFormatters[$field])) {
                $value = $customFormatters[$field]($value);
            }
            
            // Convert value to searchable string
            $searchableValue = self::valueToSearchString($value);
            
            if (!empty($searchableValue)) {
                $searchParts[] = $searchableValue;
            }
        }
        
        // Join all parts with space and normalize
        $searchIndex = implode(' ', $searchParts);
        
        // Normalize the search index
        return self::normalizeSearchIndex($searchIndex);
    }
    
    /**
     * Convert value to searchable string
     * 
     * @param mixed $value - Value to convert
     * @return string
     */
    private static function valueToSearchString($value): string
    {
        if (is_null($value)) {
            return '';
        }
        
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        
        if (is_array($value)) {
            // Recursively process array values
            $parts = [];
            foreach ($value as $item) {
                $parts[] = self::valueToSearchString($item);
            }
            return implode(' ', $parts);
        }
        
        if (is_object($value)) {
            // Try to convert object to string
            if (method_exists($value, '__toString')) {
                return (string)$value;
            }
            return '';
        }
        
        // Convert to string and clean
        $stringValue = (string)$value;
        
        // Strip HTML tags but preserve text content
        $stringValue = strip_tags($stringValue);
        
        // Decode HTML entities
        $stringValue = html_entity_decode($stringValue, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        // Extract extension numbers in angle brackets and add them separately
        // This ensures <000063> is searchable as both "000063" and "<000063>"
        if (preg_match_all('/<(\d+)>/', $stringValue, $matches)) {
            $extraParts = [];
            foreach ($matches[1] as $number) {
                $extraParts[] = $number; // Plain number
                $extraParts[] = '<' . $number . '>'; // With brackets
            }
            $stringValue .= ' ' . implode(' ', $extraParts);
        }
        
        return $stringValue;
    }
    
    /**
     * Normalize search index for consistent searching
     * 
     * @param string $text - Text to normalize
     * @return string
     */
    private static function normalizeSearchIndex(string $text): string
    {
        // Convert to lowercase for case-insensitive search
        $text = mb_strtolower($text, 'UTF-8');
        
        // Remove extra whitespace
        $text = preg_replace('/\s+/', ' ', $text);
        
        // Keep special characters that might be important for search (like < > digits)
        // but remove common punctuation that doesn't help with search
        $text = preg_replace('/[.,;:!?\'"()\[\]{}]/', ' ', $text);
        
        // Handle angle brackets specially for extension numbers
        // Don't add spaces around brackets when they contain numbers
        // This preserves formats like <000063> as searchable units
        $text = preg_replace('/<(\d+)>/', ' <$1> ', $text);
        
        // For other angle brackets, add spaces
        $text = preg_replace('/<(?!\d)/', ' < ', $text);
        $text = preg_replace('/(?<!\d)>/', ' > ', $text);
        
        // Remove extra spaces created by replacements
        $text = preg_replace('/\s+/', ' ', $text);
        
        return trim($text);
    }
    
    /**
     * Add search index to data array
     * 
     * @param array &$data - Data array to modify (passed by reference)
     * @param array $searchableFields - Fields to include in search index
     * @param array $customFormatters - Optional custom formatters
     */
    protected static function addSearchIndex(array &$data, array $searchableFields, array $customFormatters = []): void
    {
        $data['search_index'] = self::generateSearchIndex($data, $searchableFields, $customFormatters);
    }
    
    /**
     * Add search index to multiple records
     * 
     * @param array &$records - Array of records to modify (passed by reference)
     * @param array $searchableFields - Fields to include in search index
     * @param array $customFormatters - Optional custom formatters
     */
    protected static function addSearchIndexToRecords(array &$records, array $searchableFields, array $customFormatters = []): void
    {
        foreach ($records as &$record) {
            self::addSearchIndex($record, $searchableFields, $customFormatters);
        }
    }
}