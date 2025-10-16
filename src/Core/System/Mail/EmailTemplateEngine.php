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

use RuntimeException;

/**
 * Class EmailTemplateEngine
 *
 * Core template rendering engine for MikoPBX email notifications.
 * Processes HTML template with variable substitution and conditional blocks.
 *
 * Features:
 * - Simple variable replacement: {{VAR_NAME}}
 * - Conditional blocks: {{#IF_SECTION}}...{{/IF_SECTION}}
 * - HTML template caching for performance
 * - Security: automatic HTML escaping of variables
 *
 * @package MikoPBX\Core\System\Mail
 */
class EmailTemplateEngine
{
    /** Path to the universal email template */
    private const string TEMPLATE_PATH = __DIR__ . '/mikopbx-email-template.html';

    /** Cached template content */
    private static ?string $templateCache = null;

    /**
     * Render email template with provided variables
     *
     * Main rendering method that:
     * 1. Loads template (cached)
     * 2. Processes conditional blocks
     * 3. Replaces simple variables
     * 4. Cleans up remaining placeholders
     *
     * @param array<string, mixed> $variables Template variables
     * @return string Rendered HTML email
     * @throws RuntimeException If template file not found
     *
     * @example
     * $engine = new EmailTemplateEngine();
     * $html = $engine->render([
     *     'EMAIL_TITLE' => 'Test Email',
     *     'SERVER_NAME' => 'pbx.example.com',
     *     'IF_CTA_BUTTON' => true,
     *     'CTA_URL' => 'https://example.com',
     *     'CTA_TEXT' => 'Click Here'
     * ]);
     */
    public function render(array $variables): string
    {
        // Load template (with caching)
        $template = $this->loadTemplate();

        // Process conditional blocks first
        $template = $this->processConditionalBlocks($template, $variables);

        // Replace simple variables
        $template = $this->replaceVariables($template, $variables);

        // Clean up any remaining placeholders
        $template = $this->cleanupPlaceholders($template);

        return $template;
    }

    /**
     * Load HTML template from file
     *
     * Uses static caching to avoid multiple file reads.
     * Template is loaded once per PHP process lifecycle.
     *
     * @return string Template content
     * @throws RuntimeException If template file not found or not readable
     */
    private function loadTemplate(): string
    {
        // Return cached template if available
        if (self::$templateCache !== null) {
            return self::$templateCache;
        }

        // Check if template file exists
        if (!file_exists(self::TEMPLATE_PATH)) {
            throw new RuntimeException(
                'Email template not found at: ' . self::TEMPLATE_PATH
            );
        }

        // Load and cache template
        $content = file_get_contents(self::TEMPLATE_PATH);

        if ($content === false) {
            throw new RuntimeException(
                'Failed to read email template from: ' . self::TEMPLATE_PATH
            );
        }

        self::$templateCache = $content;

        return $content;
    }

    /**
     * Process conditional blocks in template
     *
     * Handles {{#IF_CONDITION}}...{{/IF_CONDITION}} blocks.
     * If $variables['IF_CONDITION'] is true, keeps content and removes markers.
     * If false or missing, removes entire block including content.
     *
     * @param string $template Template HTML
     * @param array<string, mixed> $variables Variables with boolean flags
     * @return string Processed template
     *
     * @example
     * // Template: "{{#IF_SHOW}}Hello{{/IF_SHOW}}"
     * // Variables: ['IF_SHOW' => true]
     * // Result: "Hello"
     *
     * // Variables: ['IF_SHOW' => false]
     * // Result: ""
     */
    private function processConditionalBlocks(string $template, array $variables): string
    {
        // Find all conditional blocks
        // Pattern matches: {{#IF_NAME}}content{{/IF_NAME}}
        $pattern = '/\{\{#(IF_[A-Z_]+)\}\}(.*?)\{\{\/\1\}\}/s';

        $template = preg_replace_callback(
            $pattern,
            function ($matches) use ($variables) {
                $conditionName = $matches[1];  // e.g., "IF_CTA_BUTTON"
                $content = $matches[2];         // Content inside block

                // Check if condition is true
                $showContent = !empty($variables[$conditionName]);

                if ($showContent) {
                    // Keep content, remove markers
                    return $content;
                } else {
                    // Remove entire block
                    return '';
                }
            },
            $template
        );

        return $template ?? '';
    }

    /**
     * Replace simple template variables
     *
     * Replaces {{VARIABLE_NAME}} with values from $variables array.
     * Non-string values are converted to strings.
     * Missing variables are left as empty strings.
     *
     * @param string $template Template HTML
     * @param array<string, mixed> $variables Replacement values
     * @return string Template with replaced variables
     */
    private function replaceVariables(string $template, array $variables): string
    {
        foreach ($variables as $key => $value) {
            // Skip conditional flags (already processed)
            if (str_starts_with($key, 'IF_')) {
                continue;
            }

            // Convert value to string
            $stringValue = $this->valueToString($value);

            // Replace {{KEY}} with value
            $placeholder = '{{' . $key . '}}';
            $template = str_replace($placeholder, $stringValue, $template);
        }

        return $template;
    }

    /**
     * Convert variable value to string
     *
     * Handles different value types:
     * - string: returned as-is (no escaping - caller is responsible)
     * - array/object: converted to JSON
     * - bool: 'true'/'false'
     * - null: empty string
     * - other: string cast
     *
     * @param mixed $value Value to convert
     * @return string String representation
     */
    private function valueToString(mixed $value): string
    {
        if (is_string($value)) {
            return $value;
        }

        if (is_array($value) || is_object($value)) {
            return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if ($value === null) {
            return '';
        }

        return (string)$value;
    }

    /**
     * Clean up remaining placeholders
     *
     * Removes any {{PLACEHOLDER}} that wasn't replaced.
     * This prevents showing raw placeholders in final email.
     *
     * @param string $template Template HTML
     * @return string Cleaned template
     */
    private function cleanupPlaceholders(string $template): string
    {
        // Remove all remaining {{...}} placeholders
        return (string)preg_replace('/\{\{[^}]+\}\}/', '', $template);
    }

    /**
     * Clear template cache
     *
     * Useful for testing or when template file changes during runtime.
     * In production, template is cached for entire PHP process lifecycle.
     *
     * @return void
     */
    public static function clearCache(): void
    {
        self::$templateCache = null;
    }

    /**
     * Get template file path
     *
     * Useful for debugging and testing.
     *
     * @return string Absolute path to template file
     */
    public static function getTemplatePath(): string
    {
        return self::TEMPLATE_PATH;
    }
}
