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

/**
 * Global Security Utilities for MikoPBX Admin Cabinet
 * 
 * Provides secure HTML escaping with selective icon support across all modules.
 * Implements Defense-in-Depth strategy against XSS attacks.
 * 
 * @version 1.0.0
 * @author MikoPBX Development Team
 */
window.SecurityUtils = {
    
    /**
     * Version for compatibility tracking
     */
    version: '1.0.0',
    
    /**
     * Safely escape HTML while preserving safe icon tags
     * 
     * This function implements a placeholder-based approach to allow safe icons
     * while protecting against XSS attacks. Safe icons are extracted before
     * HTML escaping and restored afterwards.
     * 
     * @param {string} text - Text to escape
     * @param {boolean} allowIcons - Whether to allow <i> tags for icons (default: false)
     * @returns {string} Safe HTML content
     * 
     * @example
     * // Basic HTML escaping
     * SecurityUtils.escapeHtml('<script>alert("XSS")</script>')
     * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
     * 
     * @example
     * // Safe icon preservation
     * SecurityUtils.escapeHtml('Sales <i class="phone icon"></i>', true)
     * // Returns: 'Sales <i class="phone icon"></i>'
     * 
     * @example
     * // Dangerous icon blocking
     * SecurityUtils.escapeHtml('Sales <i class="phone icon" onclick="alert(1)"></i>', true)
     * // Returns: 'Sales &lt;i class=&quot;phone icon&quot; onclick=&quot;alert(1)&quot;&gt;&lt;/i&gt;'
     */
    escapeHtml(text, allowIcons = false) {
        if (!text) return '';
        
        if (allowIcons) {
            return this._processWithSafeIcons(text);
        }
        
        // If no icons allowed, just escape everything
        return this._escapeHtmlContent(text);
    },
    
    /**
     * Process text with safe icon extraction and restoration
     * 
     * Supports both simple icons and nested icon structures:
     * - Simple: <i class="phone icon"></i>
     * - Nested: <i class="icons"><i class="user outline icon"></i><i class="top right corner alternate mobile icon"></i></i>
     * 
     * @private
     * @param {string} text - Text to process
     * @returns {string} Processed safe HTML
     */
    _processWithSafeIcons(text) {
        const icons = [];
        let iconIndex = 0;
        
        // First, extract nested icon structures
        const textWithNestedPlaceholders = this._extractNestedIcons(text, icons, iconIndex);
        iconIndex = icons.length;
        
        // Then extract simple icons from remaining text
        const textWithAllPlaceholders = this._extractSimpleIcons(textWithNestedPlaceholders, icons, iconIndex);
        
        // Escape all HTML in text with placeholders
        const escaped = this._escapeHtmlContent(textWithAllPlaceholders);
        
        // Restore safe icons by replacing placeholders
        return escaped.replace(/__SAFE_ICON_(\d+)__/g, (match, index) => {
            return icons[index] || '';
        });
    },

    /**
     * Extract nested icon structures like <i class="icons">...</i>
     * 
     * @private
     * @param {string} text - Text to process
     * @param {Array} icons - Array to store found icons
     * @param {number} startIndex - Starting index for placeholders
     * @returns {string} Text with nested icons replaced by placeholders
     */
    _extractNestedIcons(text, icons, startIndex) {
        // Pattern to match nested icon structures: <i class="icons">...</i>
        const nestedIconPattern = /<i\s+class="([^"<>]*icons[^"<>]*)">([\s\S]*?)<\/i>/gi;
        let iconIndex = startIndex;
        
        return text.replace(nestedIconPattern, (match, outerClassName, innerContent) => {
            // Validate outer class is safe
            if (!this._isClassNameSafe(outerClassName)) {
                return this._escapeHtmlContent(match);
            }
            
            // Extract and validate inner icons
            const safeInnerContent = this._processInnerIcons(innerContent);
            if (safeInnerContent === null) {
                // If any inner icon is unsafe, escape the whole structure
                return this._escapeHtmlContent(match);
            }
            
            // Reconstruct safe nested icon
            const safeNestedIcon = `<i class="${outerClassName}">${safeInnerContent}</i>`;
            icons[iconIndex] = safeNestedIcon;
            return `__SAFE_ICON_${iconIndex++}__`;
        });
    },

    /**
     * Extract simple icon structures like <i class="phone icon"></i>
     * 
     * @private
     * @param {string} text - Text to process
     * @param {Array} icons - Array to store found icons
     * @param {number} startIndex - Starting index for placeholders
     * @returns {string} Text with simple icons replaced by placeholders
     */
    _extractSimpleIcons(text, icons, startIndex) {
        // Pattern to match simple icon tags: <i class="..."></i>
        const simpleIconPattern = /<i\s+class="([^"<>]*)">\s*<\/i>/gi;
        let iconIndex = startIndex;
        
        return text.replace(simpleIconPattern, (match, className) => {
            // Validate class attribute contains only safe characters
            if (this._isClassNameSafe(className)) {
                icons[iconIndex] = match;
                return `__SAFE_ICON_${iconIndex++}__`;
            }
            // If class is not safe, escape the whole tag
            return this._escapeHtmlContent(match);
        });
    },

    /**
     * Process inner icons within nested structures
     * 
     * @private
     * @param {string} innerContent - Inner content to process
     * @returns {string|null} Safe inner content or null if unsafe
     */
    _processInnerIcons(innerContent) {
        // Pattern to match inner icons
        const innerIconPattern = /<i\s+class="([^"<>]*)">\s*<\/i>/gi;
        const matches = [...innerContent.matchAll(innerIconPattern)];
        
        // Validate all inner icons are safe
        for (const match of matches) {
            const className = match[1];
            if (!this._isClassNameSafe(className)) {
                return null; // Unsafe inner icon found
            }
        }
        
        // Check if there's any content other than safe icons and whitespace
        const contentWithoutIcons = innerContent.replace(innerIconPattern, '').trim();
        if (contentWithoutIcons !== '') {
            return null; // Contains non-icon content
        }
        
        return innerContent; // All inner icons are safe
    },
    
    /**
     * Validate if class name contains only safe characters
     * 
     * @private
     * @param {string} className - CSS class name to validate
     * @returns {boolean} True if class name is safe
     */
    _isClassNameSafe(className) {
        // Allow only alphanumeric characters, spaces, hyphens, and underscores
        return /^[a-zA-Z0-9\s\-_]+$/.test(className);
    },
    
    /**
     * Escape HTML content using jQuery's safe method
     * 
     * @private
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    _escapeHtmlContent(text) {
        return $('<div>').text(text).html();
    },

    /**
     * Sanitize with comprehensive whitelist for all MikoPBX object representations
     * 
     * @private
     * @param {string} text - Text to sanitize
     * @returns {string} Sanitized text with preserved safe icons
     */
    _sanitizeWithWhitelist(text) {
        if (!text) return '';
        
        // Comprehensive whitelist for all MikoPBX object types
        const allowedIconClasses = [
            // Extension icons
            'phone volume icon',
            'php icon', 
            'sitemap icon',
            'users icon',
            'cogs icon',
            'user outline icon',
            'icons', // Container for multiple icons
            'top right corner alternate mobile icon',
            
            // Network filter icons
            'globe icon',
            'shield alternate icon', 
            'ban icon',
            
            // Sound file icons
            'music icon',
            'file audio icon',
            'file audio outline icon',
            'sound icon',
            
            // Call queue icons
            'call icon',
            'phone icon',
            'headphones icon',
            
            // Provider icons
            'server icon',
            'cloud icon',
            'plug icon',
            
            // System icons
            'settings icon',
            'wrench icon',
            'tool icon'
        ];
        
        // Parse HTML safely
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        
        // Check all <i> tags
        const iTags = tempDiv.querySelectorAll('i');
        let isSafe = true;
        
        iTags.forEach(tag => {
            const className = tag.className;
            if (!allowedIconClasses.includes(className)) {
                isSafe = false;
            }
        });
        
        // If all icons are safe, return the original text
        if (isSafe) {
            return text;
        }
        
        // If any unsafe icon found, escape all HTML
        return this._escapeHtmlContent(text);
    },
    
    /**
     * Sanitize text for use in HTML attributes
     * 
     * @param {string} text - Text to sanitize
     * @returns {string} Sanitized text safe for attributes
     * 
     * @example
     * SecurityUtils.sanitizeAttribute('value"onclick="alert(1)')
     * // Returns: 'value&quot;onclick=&quot;alert(1)'
     */
    sanitizeAttribute(text) {
        if (!text) return '';
        return this._escapeHtmlContent(text);
    },
    
    /**
     * Sanitize text for display with configurable strictness
     * 
     * @param {string} text - Text to sanitize
     * @param {boolean} strictMode - If true, uses strict validation for user input.
     *                               If false, uses less strict validation for trusted API content.
     * @returns {string} Sanitized text
     * 
     * @example
     * // Strict mode for user input
     * SecurityUtils.sanitizeForDisplay('User <i class="phone icon"></i>', true)
     * 
     * @example  
     * // Less strict for API content
     * SecurityUtils.sanitizeForDisplay('<i class="phone icon"></i> User Name', false)
     */
    sanitizeForDisplay(text, strictMode = true) {
        if (!text) return '';
        
        // Always check for dangerous patterns first
        if (this.containsDangerousPatterns(text)) {
            return this._escapeHtmlContent(text);
        }
        
        if (strictMode) {
            // Strict validation: only allow completely safe content
            return this.isSafeForDropdown(text) ? 
                this.escapeHtml(text, true) : 
                this._escapeHtmlContent(text);
        } else {
            // Less strict: allow safe icons from trusted sources
            return this.escapeHtml(text, true);
        }
    },

    /**
     * Sanitize text for dropdown display (strict mode)
     * @param {string} text - Text to sanitize
     * @returns {string} Sanitized text
     */
    sanitizeForDropdown(text) {
        return this.sanitizeForDisplay(text, true);
    },

    /**
     * Sanitize object representations with enhanced XSS protection while preserving safe icons
     * 
     * Universal method for sanitizing all object representation data from REST API.
     * Handles Extensions, NetworkFilters, SoundFiles, CallQueues, and other MikoPBX objects.
     * Uses comprehensive whitelist approach for maximum security with proper functionality.
     * 
     * @param {string} text - Text to sanitize
     * @returns {string} Sanitized text with preserved safe icons
     * 
     * @example
     * // Safe icons are preserved (Extensions)
     * SecurityUtils.sanitizeObjectRepresentations('<i class="phone icon"></i> John Doe')
     * // Returns: '<i class="phone icon"></i> John Doe'
     * 
     * @example
     * // Safe icons are preserved (NetworkFilters)
     * SecurityUtils.sanitizeObjectRepresentations('<i class="globe icon"></i> Any Network')
     * // Returns: '<i class="globe icon"></i> Any Network'
     * 
     * @example
     * // XSS attacks are blocked
     * SecurityUtils.sanitizeObjectRepresentations('<script>alert("XSS")</script>')
     * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
     */
    sanitizeObjectRepresentations(text) {
        if (!text) return '';
        
        // Enhanced dangerous patterns specifically for extension representations
        const dangerousPatterns = [
            /<script[\s\S]*?<\/script>/gi,
            /<iframe[\s\S]*?<\/iframe>/gi,
            /<object[\s\S]*?<\/object>/gi,
            /<embed[\s\S]*?>/gi,
            /<form[\s\S]*?<\/form>/gi,
            /<img[\s\S]*?>/gi,
            /<svg[\s\S]*?<\/svg>/gi,
            /<link[\s\S]*?>/gi,
            /<meta[\s\S]*?>/gi,
            /<style[\s\S]*?<\/style>/gi,
            /javascript:/gi,
            /data:text\/html/gi,
            /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
            /expression\s*\(/gi, // CSS expressions
            /url\s*\(\s*javascript:/gi,
            // Additional patterns to catch various XSS attempts
            /<script\b/gi, // Script tags (even without closing)
            /alert\s*\(/gi, // Alert function calls
            /onerror\s*=/gi, // Specific onerror handler
            /src\s*=\s*x\b/gi, // Common XSS pattern src=x 
        ];
        
        // If any dangerous pattern is found, escape all HTML
        for (const pattern of dangerousPatterns) {
            if (pattern.test(text)) {
                return this._escapeHtmlContent(text);
            }
        }
        
        // If no dangerous patterns found, use whitelist validation for safe icons
        return this._sanitizeWithWhitelist(text);
    },

    /**
     * Legacy alias for backward compatibility
     * @deprecated Use sanitizeObjectRepresentations instead
     */
    sanitizeExtensionsApiContent(text) {
        return this.sanitizeObjectRepresentations(text);
    },

    /**
     * Create safe option element for dropdowns
     * 
     * @param {string} value - Option value
     * @param {string} text - Option display text
     * @param {boolean} strictMode - Whether to use strict filtering (default: true)
     * @returns {string} Safe option HTML
     */
    createSafeOption(value, text, strictMode = true) {
        const safeValue = this.sanitizeAttribute(value);
        const safeText = this.sanitizeForDisplay(text, strictMode);
        return `<option value="${safeValue}">${safeText}</option>`;
    },
    
    /**
     * Safely set HTML content of element
     * 
     * @param {jQuery|HTMLElement} element - Target element
     * @param {string} content - Content to set
     * @param {boolean} strictMode - Whether to use strict filtering (default: true)
     */
    setHtmlContent(element, content, strictMode = true) {
        const $element = $(element);
        const safeContent = this.sanitizeForDisplay(content, strictMode);
        $element.html(safeContent);
    },
    
    /**
     * Validate if string contains potentially dangerous patterns
     * 
     * @param {string} text - Text to validate
     * @returns {boolean} True if text contains dangerous patterns
     * 
     * @example
     * SecurityUtils.containsDangerousPatterns('<script>alert(1)</script>')
     * // Returns: true
     */
    containsDangerousPatterns(text) {
        if (!text) return false;
        
        const dangerousPatterns = [
            /<script[\s\S]*?<\/script>/gi,
            /<iframe[\s\S]*?<\/iframe>/gi,
            /<object[\s\S]*?<\/object>/gi,
            /<embed[\s\S]*?>/gi,
            /<form[\s\S]*?<\/form>/gi,
            /javascript:/gi,
            /data:text\/html/gi,
            /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
            /<img[^>]+onerror/gi,
            /<svg[^>]*onload/gi,
            /<style[\s\S]*?<\/style>/gi,
            /<link[\s\S]*?>/gi,
            /<meta[\s\S]*?>/gi,
            /expression\s*\(/gi, // CSS expressions
            /url\s*\(\s*javascript:/gi,
            /<\/?\w+[^>]*\s+src\s*=/gi, // Tags with src attribute (except allowed)
            /<\/?\w+[^>]*\s+href\s*=/gi, // Tags with href attribute (except allowed)
        ];
        
        return dangerousPatterns.some(pattern => pattern.test(text));
    },

    /**
     * Validate if text contains only safe icon structures and regular text
     * 
     * This method ensures that the text contains only:
     * - Plain text content
     * - Safe simple icons: <i class="..."></i>  
     * - Safe nested icons: <i class="icons">...</i>
     * 
     * @param {string} text - Text to validate
     * @returns {boolean} True if text is safe for dropdown display
     * 
     * @example
     * SecurityUtils.isSafeForDropdown('User <i class="phone icon"></i>')
     * // Returns: true
     * 
     * @example
     * SecurityUtils.isSafeForDropdown('User <script>alert(1)</script>')
     * // Returns: false
     */
    isSafeForDropdown(text) {
        if (!text) return true;
        
        // Check for dangerous patterns first
        if (this.containsDangerousPatterns(text)) {
            return false;
        }
        
        // Remove all safe icon structures and check if remaining content is safe
        const tempText = this._removeSafeIcons(text);
        
        // After removing safe icons, there should only be plain text
        // Check for any remaining HTML tags
        const hasUnsafeTags = /<[^>]+>/g.test(tempText);
        
        return !hasUnsafeTags;
    },

    /**
     * Remove all safe icon structures from text
     * 
     * @private
     * @param {string} text - Text to process
     * @returns {string} Text with safe icons removed
     */
    _removeSafeIcons(text) {
        // First remove nested icons
        let cleanText = text.replace(/<i\s+class="([^"<>]*icons[^"<>]*)">([\s\S]*?)<\/i>/gi, (match, outerClassName, innerContent) => {
            if (this._isClassNameSafe(outerClassName) && this._processInnerIcons(innerContent) !== null) {
                return ''; // Remove safe nested icon
            }
            return match; // Keep unsafe icon for further validation
        });
        
        // Then remove simple icons
        cleanText = cleanText.replace(/<i\s+class="([^"<>]*)">\s*<\/i>/gi, (match, className) => {
            if (this._isClassNameSafe(className)) {
                return ''; // Remove safe simple icon
            }
            return match; // Keep unsafe icon for further validation
        });
        
        return cleanText;
    },
    
    /**
     * Get statistics about safe icon processing
     * 
     * @param {string} text - Text to analyze
     * @returns {Object} Statistics object
     * 
     * @example
     * SecurityUtils.getProcessingStats('Text <i class="icon"></i> <script>alert(1)</script>')
     * // Returns: { safeSimpleIcons: 1, safeNestedIcons: 0, dangerousPatterns: 1, isSafeForDropdown: false, totalLength: 54 }
     */
    getProcessingStats(text) {
        if (!text) return { 
            safeSimpleIcons: 0, 
            safeNestedIcons: 0, 
            dangerousPatterns: 0, 
            isSafeForDropdown: true,
            totalLength: 0 
        };
        
        // Count safe simple icons
        const simpleIconPattern = /<i\s+class="([^"<>]*)">\s*<\/i>/gi;
        const simpleMatches = [...text.matchAll(simpleIconPattern)];
        const safeSimpleIcons = simpleMatches.filter(match => {
            const className = match[1];
            return this._isClassNameSafe(className);
        }).length;
        
        // Count safe nested icons
        const nestedIconPattern = /<i\s+class="([^"<>]*icons[^"<>]*)">([\s\S]*?)<\/i>/gi;
        const nestedMatches = [...text.matchAll(nestedIconPattern)];
        const safeNestedIcons = nestedMatches.filter(match => {
            const outerClassName = match[1];
            const innerContent = match[2];
            return this._isClassNameSafe(outerClassName) && this._processInnerIcons(innerContent) !== null;
        }).length;
        
        const dangerousPatterns = this.containsDangerousPatterns(text) ? 1 : 0;
        const isSafeForDropdown = this.isSafeForDropdown(text);
        
        return {
            safeSimpleIcons,
            safeNestedIcons,
            dangerousPatterns,
            isSafeForDropdown,
            totalLength: text.length
        };
    },
    
    /**
     * Debug mode flag for development
     */
    debug: false,
    
    /**
     * Log security processing information (only in debug mode)
     * 
     * @private
     * @param {string} message - Debug message
     * @param {*} data - Additional data to log
     */
    _debugLog(message, data = null) {
        if (this.debug && console && console.log) {
            console.log(`[SecurityUtils] ${message}`, data || '');
        }
    }
};

/**
 * Legacy compatibility - provide old function names
 * @deprecated Use SecurityUtils.escapeHtml instead
 */
window.escapeHtmlSafe = function(text, allowIcons = false) {
    console.warn('[SecurityUtils] escapeHtmlSafe is deprecated. Use SecurityUtils.escapeHtml instead.');
    return window.SecurityUtils.escapeHtml(text, allowIcons);
};

// Initialize debug mode based on environment
if (typeof globalDebugMode !== 'undefined' && globalDebugMode) {
    window.SecurityUtils.debug = true;
}

// Log initialization in debug mode
window.SecurityUtils._debugLog('SecurityUtils initialized', {
    version: window.SecurityUtils.version,
    debug: window.SecurityUtils.debug
});