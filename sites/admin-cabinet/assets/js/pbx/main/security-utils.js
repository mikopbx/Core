"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

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
  escapeHtml: function escapeHtml(text) {
    var allowIcons = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    if (!text) return '';

    if (allowIcons) {
      return this._processWithSafeIcons(text);
    } // If no icons allowed, just escape everything


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
  _processWithSafeIcons: function _processWithSafeIcons(text) {
    var icons = [];
    var iconIndex = 0; // First, extract nested icon structures

    var textWithNestedPlaceholders = this._extractNestedIcons(text, icons, iconIndex);

    iconIndex = icons.length; // Then extract simple icons from remaining text

    var textWithAllPlaceholders = this._extractSimpleIcons(textWithNestedPlaceholders, icons, iconIndex); // Escape all HTML in text with placeholders


    var escaped = this._escapeHtmlContent(textWithAllPlaceholders); // Restore safe icons by replacing placeholders


    return escaped.replace(/__SAFE_ICON_(\d+)__/g, function (match, index) {
      return icons[index] || '';
    });
  },

  /**
   * Build the pattern for nested icon structures like <i class="icons">...</i>
   *
   * Matches an outer <i class="...icons..."> wrapping one or more empty inner
   * <i class="..."></i> tags. Inner tags are matched explicitly, so the first
   * inner </i> does not terminate the outer match.
   * Group 1 - outer class name, group 2 - inner icons markup.
   *
   * @private
   * @returns {RegExp} New global, case-insensitive pattern
   */
  _getNestedIconPattern: function _getNestedIconPattern() {
    return /<i\s+class="([^"<>]*icons[^"<>]*)">((?:\s*<i\s+class="[^"<>]*">\s*<\/i>)+)\s*<\/i>/gi;
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
  _extractNestedIcons: function _extractNestedIcons(text, icons, startIndex) {
    var _this = this;

    var nestedIconPattern = this._getNestedIconPattern();

    var iconIndex = startIndex;
    return text.replace(nestedIconPattern, function (match, outerClassName, innerContent) {
      // Validate outer class name and all inner icons
      var safeInnerContent = _this._isClassNameSafe(outerClassName) ? _this._processInnerIcons(innerContent) : null;

      if (safeInnerContent === null) {
        // Rejected fragment: keep it out of later passes and escape it exactly once
        icons[iconIndex] = _this._escapeHtmlContent(match);
        return "__SAFE_ICON_".concat(iconIndex++, "__");
      } // Reconstruct safe nested icon


      icons[iconIndex] = "<i class=\"".concat(outerClassName, "\">").concat(safeInnerContent, "</i>");
      return "__SAFE_ICON_".concat(iconIndex++, "__");
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
  _extractSimpleIcons: function _extractSimpleIcons(text, icons, startIndex) {
    var _this2 = this;

    // Pattern to match simple icon tags: <i class="..."></i>
    var simpleIconPattern = /<i\s+class="([^"<>]*)">\s*<\/i>/gi;
    var iconIndex = startIndex;
    return text.replace(simpleIconPattern, function (match, className) {
      // Validate class attribute contains only safe characters
      if (_this2._isClassNameSafe(className)) {
        icons[iconIndex] = match;
        return "__SAFE_ICON_".concat(iconIndex++, "__");
      } // Rejected fragment: escape it exactly once via placeholder,
      // the surrounding text is escaped later by _processWithSafeIcons()


      icons[iconIndex] = _this2._escapeHtmlContent(match);
      return "__SAFE_ICON_".concat(iconIndex++, "__");
    });
  },

  /**
   * Process inner icons within nested structures
   * 
   * @private
   * @param {string} innerContent - Inner content to process
   * @returns {string|null} Safe inner content or null if unsafe
   */
  _processInnerIcons: function _processInnerIcons(innerContent) {
    // Pattern to match inner icons
    var innerIconPattern = /<i\s+class="([^"<>]*)">\s*<\/i>/gi;

    var matches = _toConsumableArray(innerContent.matchAll(innerIconPattern)); // Validate all inner icons are safe


    var _iterator = _createForOfIteratorHelper(matches),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var match = _step.value;
        var className = match[1];

        if (!this._isClassNameSafe(className)) {
          return null; // Unsafe inner icon found
        }
      } // Check if there's any content other than safe icons and whitespace

    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    var contentWithoutIcons = innerContent.replace(innerIconPattern, '').trim();

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
  _isClassNameSafe: function _isClassNameSafe(className) {
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
  _escapeHtmlContent: function _escapeHtmlContent(text) {
    return $('<div>').text(text).html();
  },

  /**
   * Sanitize with comprehensive whitelist for all MikoPBX object representations
   * 
   * @private
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text with preserved safe icons
   */
  _sanitizeWithWhitelist: function _sanitizeWithWhitelist(text) {
    if (!text) return ''; // Comprehensive whitelist for all MikoPBX object types
    // Synchronized with RecordRepresentationTrait.php icon classes

    var allowedIconClasses = [// Extension icons
    'phone volume icon', 'php icon', 'sitemap icon', 'users icon', 'cogs icon', 'user outline icon', 'icons', // Container for multiple icons
    'top right corner alternate mobile icon', // Module icons
    'puzzle piece icon', // API & Manager icons
    'key icon', 'asterisk icon', // File icons
    'file icon', // Routing icons
    'map signs icon', 'random icon', // Schedule/time icons
    'time icon', 'icon outline calendar alternate', 'icon outline calendar minus', 'icon clock outline', // Network filter icons
    'globe icon', 'home icon', 'shield alternate icon', 'ban icon', // Sound file icons
    'music icon', 'file audio icon', 'file audio outline icon', 'sound icon', // Call queue icons
    'call icon', 'phone icon', 'headphones icon', // Provider icons
    'server icon', 'cloud icon', 'plug icon', // System icons
    'settings icon', 'wrench icon', 'tool icon']; // Parse HTML safely

    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = text; // Check all <i> tags

    var iTags = tempDiv.querySelectorAll('i');
    var isSafe = true;
    iTags.forEach(function (tag) {
      var className = tag.className; // Check if class is in whitelist or is a Fomantic UI flag

      var isFlagIcon = /^flag\s+[\w\s]+$/.test(className.trim());

      if (!allowedIconClasses.includes(className) && !isFlagIcon) {
        isSafe = false;
      }
    }); // If all icons are safe, return the original text

    if (isSafe) {
      return text;
    } // If any unsafe icon found, escape all HTML


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
  sanitizeAttribute: function sanitizeAttribute(text) {
    if (!text) return '';
    return this._escapeHtmlContent(text);
  },

  /**
   * Escape every string value of a placeholder map before it is substituted into an
   * HTML translation template, e.g. i18n(messageTpl, messageParams) for advice messages.
   * Quotes are escaped as well because placeholders such as %url% sit inside attributes.
   *
   * @param {Object|null} params - Placeholder values
   * @returns {Object|null} Copy of params with HTML-escaped string values
   *
   * @example
   * SecurityUtils.escapeTemplateParams({record: '<img src=x onerror=alert(1)> <201>'})
   * // Returns: {record: '&lt;img src=x onerror=alert(1)&gt; &lt;201&gt;'}
   */
  escapeTemplateParams: function escapeTemplateParams(params) {
    if (params === null || _typeof(params) !== 'object') {
      return params;
    }

    var escaped = {};
    Object.keys(params).forEach(function (key) {
      var value = params[key];
      escaped[key] = typeof value === 'string' ? value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : value;
    });
    return escaped;
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
  sanitizeForDisplay: function sanitizeForDisplay(text) {
    var strictMode = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    if (!text) return ''; // Always check for dangerous patterns first

    if (this.containsDangerousPatterns(text)) {
      return this._escapeHtmlContent(text);
    }

    if (strictMode) {
      // Strict validation: only allow completely safe content
      return this.isSafeForDropdown(text) ? this.escapeHtml(text, true) : this._escapeHtmlContent(text);
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
  sanitizeForDropdown: function sanitizeForDropdown(text) {
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
  sanitizeObjectRepresentations: function sanitizeObjectRepresentations(text) {
    if (!text) return ''; // Enhanced dangerous patterns specifically for extension representations

    var dangerousPatterns = [/<script[\s\S]*?<\/script>/gi, /<iframe[\s\S]*?<\/iframe>/gi, /<object[\s\S]*?<\/object>/gi, /<embed[\s\S]*?>/gi, /<form[\s\S]*?<\/form>/gi, /<img[\s\S]*?>/gi, /<svg[\s\S]*?<\/svg>/gi, /<link[\s\S]*?>/gi, /<meta[\s\S]*?>/gi, /<style[\s\S]*?<\/style>/gi, /javascript:/gi, /data:text\/html/gi, /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
    /expression\s*\(/gi, // CSS expressions
    /url\s*\(\s*javascript:/gi, // Additional patterns to catch various XSS attempts
    /<script\b/gi, // Script tags (even without closing)
    /alert\s*\(/gi, // Alert function calls
    /onerror\s*=/gi, // Specific onerror handler
    /src\s*=\s*x\b/gi // Common XSS pattern src=x 
    ]; // If any dangerous pattern is found, escape all HTML

    for (var _i = 0, _dangerousPatterns = dangerousPatterns; _i < _dangerousPatterns.length; _i++) {
      var pattern = _dangerousPatterns[_i];

      if (pattern.test(text)) {
        return this._escapeHtmlContent(text);
      }
    } // If no dangerous patterns found, use whitelist validation for safe icons


    return this._sanitizeWithWhitelist(text);
  },

  /**
   * Legacy alias for backward compatibility
   * @deprecated Use sanitizeObjectRepresentations instead
   */
  sanitizeExtensionsApiContent: function sanitizeExtensionsApiContent(text) {
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
  createSafeOption: function createSafeOption(value, text) {
    var strictMode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    var safeValue = this.sanitizeAttribute(value);
    var safeText = this.sanitizeForDisplay(text, strictMode);
    return "<option value=\"".concat(safeValue, "\">").concat(safeText, "</option>");
  },

  /**
   * Safely set HTML content of element
   * 
   * @param {jQuery|HTMLElement} element - Target element
   * @param {string} content - Content to set
   * @param {boolean} strictMode - Whether to use strict filtering (default: true)
   */
  setHtmlContent: function setHtmlContent(element, content) {
    var strictMode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    var $element = $(element);
    var safeContent = this.sanitizeForDisplay(content, strictMode);
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
  containsDangerousPatterns: function containsDangerousPatterns(text) {
    if (!text) return false;
    var dangerousPatterns = [/<script[\s\S]*?<\/script>/gi, /<iframe[\s\S]*?<\/iframe>/gi, /<object[\s\S]*?<\/object>/gi, /<embed[\s\S]*?>/gi, /<form[\s\S]*?<\/form>/gi, /javascript:/gi, /data:text\/html/gi, /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
    /<img[^>]+onerror/gi, /<svg[^>]*onload/gi, /<style[\s\S]*?<\/style>/gi, /<link[\s\S]*?>/gi, /<meta[\s\S]*?>/gi, /expression\s*\(/gi, // CSS expressions
    /url\s*\(\s*javascript:/gi, /<\/?\w+[^>]*\s+src\s*=/gi, // Tags with src attribute (except allowed)
    /<\/?\w+[^>]*\s+href\s*=/gi // Tags with href attribute (except allowed)
    ];
    return dangerousPatterns.some(function (pattern) {
      return pattern.test(text);
    });
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
  isSafeForDropdown: function isSafeForDropdown(text) {
    if (!text) return true; // Check for dangerous patterns first

    if (this.containsDangerousPatterns(text)) {
      return false;
    } // Remove all safe icon structures and check if remaining content is safe


    var tempText = this._removeSafeIcons(text); // After removing safe icons, there should only be plain text
    // Check for any remaining HTML tags


    var hasUnsafeTags = /<[^>]+>/g.test(tempText);
    return !hasUnsafeTags;
  },

  /**
   * Remove all safe icon structures from text
   * 
   * @private
   * @param {string} text - Text to process
   * @returns {string} Text with safe icons removed
   */
  _removeSafeIcons: function _removeSafeIcons(text) {
    var _this3 = this;

    // First remove nested icons
    var cleanText = text.replace(this._getNestedIconPattern(), function (match, outerClassName, innerContent) {
      if (_this3._isClassNameSafe(outerClassName) && _this3._processInnerIcons(innerContent) !== null) {
        return ''; // Remove safe nested icon
      }

      return match; // Keep unsafe icon for further validation
    }); // Then remove simple icons

    cleanText = cleanText.replace(/<i\s+class="([^"<>]*)">\s*<\/i>/gi, function (match, className) {
      if (_this3._isClassNameSafe(className)) {
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
  getProcessingStats: function getProcessingStats(text) {
    var _this4 = this;

    if (!text) return {
      safeSimpleIcons: 0,
      safeNestedIcons: 0,
      dangerousPatterns: 0,
      isSafeForDropdown: true,
      totalLength: 0
    }; // Count safe simple icons

    var simpleIconPattern = /<i\s+class="([^"<>]*)">\s*<\/i>/gi;

    var simpleMatches = _toConsumableArray(text.matchAll(simpleIconPattern));

    var safeSimpleIcons = simpleMatches.filter(function (match) {
      var className = match[1];
      return _this4._isClassNameSafe(className);
    }).length; // Count safe nested icons

    var nestedMatches = _toConsumableArray(text.matchAll(this._getNestedIconPattern()));

    var safeNestedIcons = nestedMatches.filter(function (match) {
      var outerClassName = match[1];
      var innerContent = match[2];
      return _this4._isClassNameSafe(outerClassName) && _this4._processInnerIcons(innerContent) !== null;
    }).length;
    var dangerousPatterns = this.containsDangerousPatterns(text) ? 1 : 0;
    var isSafeForDropdown = this.isSafeForDropdown(text);
    return {
      safeSimpleIcons: safeSimpleIcons,
      safeNestedIcons: safeNestedIcons,
      dangerousPatterns: dangerousPatterns,
      isSafeForDropdown: isSafeForDropdown,
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
  _debugLog: function _debugLog(message) {
    var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    if (this.debug && console && console.log) {
      console.log("[SecurityUtils] ".concat(message), data || '');
    }
  }
};
/**
 * Legacy compatibility - provide old function names
 * @deprecated Use SecurityUtils.escapeHtml instead
 */

window.escapeHtmlSafe = function (text) {
  var allowIcons = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  console.warn('[SecurityUtils] escapeHtmlSafe is deprecated. Use SecurityUtils.escapeHtml instead.');
  return window.SecurityUtils.escapeHtml(text, allowIcons);
}; // Initialize debug mode based on environment


if (typeof globalDebugMode !== 'undefined' && globalDebugMode) {
  window.SecurityUtils.debug = true;
} // Log initialization in debug mode


window.SecurityUtils._debugLog('SecurityUtils initialized', {
  version: window.SecurityUtils.version,
  debug: window.SecurityUtils.debug
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3NlY3VyaXR5LXV0aWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIlNlY3VyaXR5VXRpbHMiLCJ2ZXJzaW9uIiwiZXNjYXBlSHRtbCIsInRleHQiLCJhbGxvd0ljb25zIiwiX3Byb2Nlc3NXaXRoU2FmZUljb25zIiwiX2VzY2FwZUh0bWxDb250ZW50IiwiaWNvbnMiLCJpY29uSW5kZXgiLCJ0ZXh0V2l0aE5lc3RlZFBsYWNlaG9sZGVycyIsIl9leHRyYWN0TmVzdGVkSWNvbnMiLCJsZW5ndGgiLCJ0ZXh0V2l0aEFsbFBsYWNlaG9sZGVycyIsIl9leHRyYWN0U2ltcGxlSWNvbnMiLCJlc2NhcGVkIiwicmVwbGFjZSIsIm1hdGNoIiwiaW5kZXgiLCJfZ2V0TmVzdGVkSWNvblBhdHRlcm4iLCJzdGFydEluZGV4IiwibmVzdGVkSWNvblBhdHRlcm4iLCJvdXRlckNsYXNzTmFtZSIsImlubmVyQ29udGVudCIsInNhZmVJbm5lckNvbnRlbnQiLCJfaXNDbGFzc05hbWVTYWZlIiwiX3Byb2Nlc3NJbm5lckljb25zIiwic2ltcGxlSWNvblBhdHRlcm4iLCJjbGFzc05hbWUiLCJpbm5lckljb25QYXR0ZXJuIiwibWF0Y2hlcyIsIm1hdGNoQWxsIiwiY29udGVudFdpdGhvdXRJY29ucyIsInRyaW0iLCJ0ZXN0IiwiJCIsImh0bWwiLCJfc2FuaXRpemVXaXRoV2hpdGVsaXN0IiwiYWxsb3dlZEljb25DbGFzc2VzIiwidGVtcERpdiIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImlubmVySFRNTCIsImlUYWdzIiwicXVlcnlTZWxlY3RvckFsbCIsImlzU2FmZSIsImZvckVhY2giLCJ0YWciLCJpc0ZsYWdJY29uIiwiaW5jbHVkZXMiLCJzYW5pdGl6ZUF0dHJpYnV0ZSIsImVzY2FwZVRlbXBsYXRlUGFyYW1zIiwicGFyYW1zIiwiT2JqZWN0Iiwia2V5cyIsImtleSIsInZhbHVlIiwic2FuaXRpemVGb3JEaXNwbGF5Iiwic3RyaWN0TW9kZSIsImNvbnRhaW5zRGFuZ2Vyb3VzUGF0dGVybnMiLCJpc1NhZmVGb3JEcm9wZG93biIsInNhbml0aXplRm9yRHJvcGRvd24iLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImRhbmdlcm91c1BhdHRlcm5zIiwicGF0dGVybiIsInNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQiLCJjcmVhdGVTYWZlT3B0aW9uIiwic2FmZVZhbHVlIiwic2FmZVRleHQiLCJzZXRIdG1sQ29udGVudCIsImVsZW1lbnQiLCJjb250ZW50IiwiJGVsZW1lbnQiLCJzYWZlQ29udGVudCIsInNvbWUiLCJ0ZW1wVGV4dCIsIl9yZW1vdmVTYWZlSWNvbnMiLCJoYXNVbnNhZmVUYWdzIiwiY2xlYW5UZXh0IiwiZ2V0UHJvY2Vzc2luZ1N0YXRzIiwic2FmZVNpbXBsZUljb25zIiwic2FmZU5lc3RlZEljb25zIiwidG90YWxMZW5ndGgiLCJzaW1wbGVNYXRjaGVzIiwiZmlsdGVyIiwibmVzdGVkTWF0Y2hlcyIsImRlYnVnIiwiX2RlYnVnTG9nIiwibWVzc2FnZSIsImRhdGEiLCJjb25zb2xlIiwibG9nIiwiZXNjYXBlSHRtbFNhZmUiLCJ3YXJuIiwiZ2xvYmFsRGVidWdNb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBQSxNQUFNLENBQUNDLGFBQVAsR0FBdUI7QUFFbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLE9BQU8sRUFBRSxPQUxVOztBQU9uQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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LE9BQU8sQ0FBQ0MsR0FBckMsRUFBMEM7QUFDdENELE1BQUFBLE9BQU8sQ0FBQ0MsR0FBUiwyQkFBK0JILE9BQS9CLEdBQTBDQyxJQUFJLElBQUksRUFBbEQ7QUFDSDtBQUNKO0FBdG9Ca0IsQ0FBdkI7QUF5b0JBO0FBQ0E7QUFDQTtBQUNBOztBQUNBekYsTUFBTSxDQUFDNEYsY0FBUCxHQUF3QixVQUFTeEYsSUFBVCxFQUFtQztBQUFBLE1BQXBCQyxVQUFvQix1RUFBUCxLQUFPO0FBQ3ZEcUYsRUFBQUEsT0FBTyxDQUFDRyxJQUFSLENBQWEscUZBQWI7QUFDQSxTQUFPN0YsTUFBTSxDQUFDQyxhQUFQLENBQXFCRSxVQUFyQixDQUFnQ0MsSUFBaEMsRUFBc0NDLFVBQXRDLENBQVA7QUFDSCxDQUhELEMsQ0FLQTs7O0FBQ0EsSUFBSSxPQUFPeUYsZUFBUCxLQUEyQixXQUEzQixJQUEwQ0EsZUFBOUMsRUFBK0Q7QUFDM0Q5RixFQUFBQSxNQUFNLENBQUNDLGFBQVAsQ0FBcUJxRixLQUFyQixHQUE2QixJQUE3QjtBQUNILEMsQ0FFRDs7O0FBQ0F0RixNQUFNLENBQUNDLGFBQVAsQ0FBcUJzRixTQUFyQixDQUErQiwyQkFBL0IsRUFBNEQ7QUFDeERyRixFQUFBQSxPQUFPLEVBQUVGLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQkMsT0FEMEI7QUFFeERvRixFQUFBQSxLQUFLLEVBQUV0RixNQUFNLENBQUNDLGFBQVAsQ0FBcUJxRjtBQUY0QixDQUE1RCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qKlxuICogR2xvYmFsIFNlY3VyaXR5IFV0aWxpdGllcyBmb3IgTWlrb1BCWCBBZG1pbiBDYWJpbmV0XG4gKiBcbiAqIFByb3ZpZGVzIHNlY3VyZSBIVE1MIGVzY2FwaW5nIHdpdGggc2VsZWN0aXZlIGljb24gc3VwcG9ydCBhY3Jvc3MgYWxsIG1vZHVsZXMuXG4gKiBJbXBsZW1lbnRzIERlZmVuc2UtaW4tRGVwdGggc3RyYXRlZ3kgYWdhaW5zdCBYU1MgYXR0YWNrcy5cbiAqIFxuICogQHZlcnNpb24gMS4wLjBcbiAqIEBhdXRob3IgTWlrb1BCWCBEZXZlbG9wbWVudCBUZWFtXG4gKi9cbndpbmRvdy5TZWN1cml0eVV0aWxzID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIFZlcnNpb24gZm9yIGNvbXBhdGliaWxpdHkgdHJhY2tpbmdcbiAgICAgKi9cbiAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhZmVseSBlc2NhcGUgSFRNTCB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgaWNvbiB0YWdzXG4gICAgICogXG4gICAgICogVGhpcyBmdW5jdGlvbiBpbXBsZW1lbnRzIGEgcGxhY2Vob2xkZXItYmFzZWQgYXBwcm9hY2ggdG8gYWxsb3cgc2FmZSBpY29uc1xuICAgICAqIHdoaWxlIHByb3RlY3RpbmcgYWdhaW5zdCBYU1MgYXR0YWNrcy4gU2FmZSBpY29ucyBhcmUgZXh0cmFjdGVkIGJlZm9yZVxuICAgICAqIEhUTUwgZXNjYXBpbmcgYW5kIHJlc3RvcmVkIGFmdGVyd2FyZHMuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gYWxsb3dJY29ucyAtIFdoZXRoZXIgdG8gYWxsb3cgPGk+IHRhZ3MgZm9yIGljb25zIChkZWZhdWx0OiBmYWxzZSlcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTYWZlIEhUTUwgY29udGVudFxuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gQmFzaWMgSFRNTCBlc2NhcGluZ1xuICAgICAqIFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbCgnPHNjcmlwdD5hbGVydChcIlhTU1wiKTwvc2NyaXB0PicpXG4gICAgICogLy8gUmV0dXJuczogJyZsdDtzY3JpcHQmZ3Q7YWxlcnQoJnF1b3Q7WFNTJnF1b3Q7KSZsdDsvc2NyaXB0Jmd0OydcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFNhZmUgaWNvbiBwcmVzZXJ2YXRpb25cbiAgICAgKiBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoJ1NhbGVzIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4nLCB0cnVlKVxuICAgICAqIC8vIFJldHVybnM6ICdTYWxlcyA8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+J1xuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gRGFuZ2Vyb3VzIGljb24gYmxvY2tpbmdcbiAgICAgKiBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoJ1NhbGVzIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiIG9uY2xpY2s9XCJhbGVydCgxKVwiPjwvaT4nLCB0cnVlKVxuICAgICAqIC8vIFJldHVybnM6ICdTYWxlcyAmbHQ7aSBjbGFzcz0mcXVvdDtwaG9uZSBpY29uJnF1b3Q7IG9uY2xpY2s9JnF1b3Q7YWxlcnQoMSkmcXVvdDsmZ3Q7Jmx0Oy9pJmd0OydcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQsIGFsbG93SWNvbnMgPSBmYWxzZSkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIGlmIChhbGxvd0ljb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJvY2Vzc1dpdGhTYWZlSWNvbnModGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIG5vIGljb25zIGFsbG93ZWQsIGp1c3QgZXNjYXBlIGV2ZXJ5dGhpbmdcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KHRleHQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyB0ZXh0IHdpdGggc2FmZSBpY29uIGV4dHJhY3Rpb24gYW5kIHJlc3RvcmF0aW9uXG4gICAgICogXG4gICAgICogU3VwcG9ydHMgYm90aCBzaW1wbGUgaWNvbnMgYW5kIG5lc3RlZCBpY29uIHN0cnVjdHVyZXM6XG4gICAgICogLSBTaW1wbGU6IDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT5cbiAgICAgKiAtIE5lc3RlZDogPGkgY2xhc3M9XCJpY29uc1wiPjxpIGNsYXNzPVwidXNlciBvdXRsaW5lIGljb25cIj48L2k+PGkgY2xhc3M9XCJ0b3AgcmlnaHQgY29ybmVyIGFsdGVybmF0ZSBtb2JpbGUgaWNvblwiPjwvaT48L2k+XG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gcHJvY2Vzc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFByb2Nlc3NlZCBzYWZlIEhUTUxcbiAgICAgKi9cbiAgICBfcHJvY2Vzc1dpdGhTYWZlSWNvbnModGV4dCkge1xuICAgICAgICBjb25zdCBpY29ucyA9IFtdO1xuICAgICAgICBsZXQgaWNvbkluZGV4ID0gMDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpcnN0LCBleHRyYWN0IG5lc3RlZCBpY29uIHN0cnVjdHVyZXNcbiAgICAgICAgY29uc3QgdGV4dFdpdGhOZXN0ZWRQbGFjZWhvbGRlcnMgPSB0aGlzLl9leHRyYWN0TmVzdGVkSWNvbnModGV4dCwgaWNvbnMsIGljb25JbmRleCk7XG4gICAgICAgIGljb25JbmRleCA9IGljb25zLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIC8vIFRoZW4gZXh0cmFjdCBzaW1wbGUgaWNvbnMgZnJvbSByZW1haW5pbmcgdGV4dFxuICAgICAgICBjb25zdCB0ZXh0V2l0aEFsbFBsYWNlaG9sZGVycyA9IHRoaXMuX2V4dHJhY3RTaW1wbGVJY29ucyh0ZXh0V2l0aE5lc3RlZFBsYWNlaG9sZGVycywgaWNvbnMsIGljb25JbmRleCk7XG4gICAgICAgIFxuICAgICAgICAvLyBFc2NhcGUgYWxsIEhUTUwgaW4gdGV4dCB3aXRoIHBsYWNlaG9sZGVyc1xuICAgICAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQodGV4dFdpdGhBbGxQbGFjZWhvbGRlcnMpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVzdG9yZSBzYWZlIGljb25zIGJ5IHJlcGxhY2luZyBwbGFjZWhvbGRlcnNcbiAgICAgICAgcmV0dXJuIGVzY2FwZWQucmVwbGFjZSgvX19TQUZFX0lDT05fKFxcZCspX18vZywgKG1hdGNoLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGljb25zW2luZGV4XSB8fCAnJztcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRoZSBwYXR0ZXJuIGZvciBuZXN0ZWQgaWNvbiBzdHJ1Y3R1cmVzIGxpa2UgPGkgY2xhc3M9XCJpY29uc1wiPi4uLjwvaT5cbiAgICAgKlxuICAgICAqIE1hdGNoZXMgYW4gb3V0ZXIgPGkgY2xhc3M9XCIuLi5pY29ucy4uLlwiPiB3cmFwcGluZyBvbmUgb3IgbW9yZSBlbXB0eSBpbm5lclxuICAgICAqIDxpIGNsYXNzPVwiLi4uXCI+PC9pPiB0YWdzLiBJbm5lciB0YWdzIGFyZSBtYXRjaGVkIGV4cGxpY2l0bHksIHNvIHRoZSBmaXJzdFxuICAgICAqIGlubmVyIDwvaT4gZG9lcyBub3QgdGVybWluYXRlIHRoZSBvdXRlciBtYXRjaC5cbiAgICAgKiBHcm91cCAxIC0gb3V0ZXIgY2xhc3MgbmFtZSwgZ3JvdXAgMiAtIGlubmVyIGljb25zIG1hcmt1cC5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHJldHVybnMge1JlZ0V4cH0gTmV3IGdsb2JhbCwgY2FzZS1pbnNlbnNpdGl2ZSBwYXR0ZXJuXG4gICAgICovXG4gICAgX2dldE5lc3RlZEljb25QYXR0ZXJuKCkge1xuICAgICAgICByZXR1cm4gLzxpXFxzK2NsYXNzPVwiKFteXCI8Pl0qaWNvbnNbXlwiPD5dKilcIj4oKD86XFxzKjxpXFxzK2NsYXNzPVwiW15cIjw+XSpcIj5cXHMqPFxcL2k+KSspXFxzKjxcXC9pPi9naTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBuZXN0ZWQgaWNvbiBzdHJ1Y3R1cmVzIGxpa2UgPGkgY2xhc3M9XCJpY29uc1wiPi4uLjwvaT5cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBwcm9jZXNzXG4gICAgICogQHBhcmFtIHtBcnJheX0gaWNvbnMgLSBBcnJheSB0byBzdG9yZSBmb3VuZCBpY29uc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydEluZGV4IC0gU3RhcnRpbmcgaW5kZXggZm9yIHBsYWNlaG9sZGVyc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRleHQgd2l0aCBuZXN0ZWQgaWNvbnMgcmVwbGFjZWQgYnkgcGxhY2Vob2xkZXJzXG4gICAgICovXG4gICAgX2V4dHJhY3ROZXN0ZWRJY29ucyh0ZXh0LCBpY29ucywgc3RhcnRJbmRleCkge1xuICAgICAgICBjb25zdCBuZXN0ZWRJY29uUGF0dGVybiA9IHRoaXMuX2dldE5lc3RlZEljb25QYXR0ZXJuKCk7XG4gICAgICAgIGxldCBpY29uSW5kZXggPSBzdGFydEluZGV4O1xuXG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UobmVzdGVkSWNvblBhdHRlcm4sIChtYXRjaCwgb3V0ZXJDbGFzc05hbWUsIGlubmVyQ29udGVudCkgPT4ge1xuICAgICAgICAgICAgLy8gVmFsaWRhdGUgb3V0ZXIgY2xhc3MgbmFtZSBhbmQgYWxsIGlubmVyIGljb25zXG4gICAgICAgICAgICBjb25zdCBzYWZlSW5uZXJDb250ZW50ID0gdGhpcy5faXNDbGFzc05hbWVTYWZlKG91dGVyQ2xhc3NOYW1lKVxuICAgICAgICAgICAgICAgID8gdGhpcy5fcHJvY2Vzc0lubmVySWNvbnMoaW5uZXJDb250ZW50KVxuICAgICAgICAgICAgICAgIDogbnVsbDtcbiAgICAgICAgICAgIGlmIChzYWZlSW5uZXJDb250ZW50ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVqZWN0ZWQgZnJhZ21lbnQ6IGtlZXAgaXQgb3V0IG9mIGxhdGVyIHBhc3NlcyBhbmQgZXNjYXBlIGl0IGV4YWN0bHkgb25jZVxuICAgICAgICAgICAgICAgIGljb25zW2ljb25JbmRleF0gPSB0aGlzLl9lc2NhcGVIdG1sQ29udGVudChtYXRjaCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGBfX1NBRkVfSUNPTl8ke2ljb25JbmRleCsrfV9fYDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVjb25zdHJ1Y3Qgc2FmZSBuZXN0ZWQgaWNvblxuICAgICAgICAgICAgaWNvbnNbaWNvbkluZGV4XSA9IGA8aSBjbGFzcz1cIiR7b3V0ZXJDbGFzc05hbWV9XCI+JHtzYWZlSW5uZXJDb250ZW50fTwvaT5gO1xuICAgICAgICAgICAgcmV0dXJuIGBfX1NBRkVfSUNPTl8ke2ljb25JbmRleCsrfV9fYDtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3Qgc2ltcGxlIGljb24gc3RydWN0dXJlcyBsaWtlIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT5cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBwcm9jZXNzXG4gICAgICogQHBhcmFtIHtBcnJheX0gaWNvbnMgLSBBcnJheSB0byBzdG9yZSBmb3VuZCBpY29uc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydEluZGV4IC0gU3RhcnRpbmcgaW5kZXggZm9yIHBsYWNlaG9sZGVyc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRleHQgd2l0aCBzaW1wbGUgaWNvbnMgcmVwbGFjZWQgYnkgcGxhY2Vob2xkZXJzXG4gICAgICovXG4gICAgX2V4dHJhY3RTaW1wbGVJY29ucyh0ZXh0LCBpY29ucywgc3RhcnRJbmRleCkge1xuICAgICAgICAvLyBQYXR0ZXJuIHRvIG1hdGNoIHNpbXBsZSBpY29uIHRhZ3M6IDxpIGNsYXNzPVwiLi4uXCI+PC9pPlxuICAgICAgICBjb25zdCBzaW1wbGVJY29uUGF0dGVybiA9IC88aVxccytjbGFzcz1cIihbXlwiPD5dKilcIj5cXHMqPFxcL2k+L2dpO1xuICAgICAgICBsZXQgaWNvbkluZGV4ID0gc3RhcnRJbmRleDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2Uoc2ltcGxlSWNvblBhdHRlcm4sIChtYXRjaCwgY2xhc3NOYW1lKSA9PiB7XG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBjbGFzcyBhdHRyaWJ1dGUgY29udGFpbnMgb25seSBzYWZlIGNoYXJhY3RlcnNcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc0NsYXNzTmFtZVNhZmUoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIGljb25zW2ljb25JbmRleF0gPSBtYXRjaDtcbiAgICAgICAgICAgICAgICByZXR1cm4gYF9fU0FGRV9JQ09OXyR7aWNvbkluZGV4Kyt9X19gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUmVqZWN0ZWQgZnJhZ21lbnQ6IGVzY2FwZSBpdCBleGFjdGx5IG9uY2UgdmlhIHBsYWNlaG9sZGVyLFxuICAgICAgICAgICAgLy8gdGhlIHN1cnJvdW5kaW5nIHRleHQgaXMgZXNjYXBlZCBsYXRlciBieSBfcHJvY2Vzc1dpdGhTYWZlSWNvbnMoKVxuICAgICAgICAgICAgaWNvbnNbaWNvbkluZGV4XSA9IHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KG1hdGNoKTtcbiAgICAgICAgICAgIHJldHVybiBgX19TQUZFX0lDT05fJHtpY29uSW5kZXgrK31fX2A7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGlubmVyIGljb25zIHdpdGhpbiBuZXN0ZWQgc3RydWN0dXJlc1xuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlubmVyQ29udGVudCAtIElubmVyIGNvbnRlbnQgdG8gcHJvY2Vzc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gU2FmZSBpbm5lciBjb250ZW50IG9yIG51bGwgaWYgdW5zYWZlXG4gICAgICovXG4gICAgX3Byb2Nlc3NJbm5lckljb25zKGlubmVyQ29udGVudCkge1xuICAgICAgICAvLyBQYXR0ZXJuIHRvIG1hdGNoIGlubmVyIGljb25zXG4gICAgICAgIGNvbnN0IGlubmVySWNvblBhdHRlcm4gPSAvPGlcXHMrY2xhc3M9XCIoW15cIjw+XSopXCI+XFxzKjxcXC9pPi9naTtcbiAgICAgICAgY29uc3QgbWF0Y2hlcyA9IFsuLi5pbm5lckNvbnRlbnQubWF0Y2hBbGwoaW5uZXJJY29uUGF0dGVybildO1xuICAgICAgICBcbiAgICAgICAgLy8gVmFsaWRhdGUgYWxsIGlubmVyIGljb25zIGFyZSBzYWZlXG4gICAgICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbWF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gbWF0Y2hbMV07XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2lzQ2xhc3NOYW1lU2FmZShjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7IC8vIFVuc2FmZSBpbm5lciBpY29uIGZvdW5kXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZXJlJ3MgYW55IGNvbnRlbnQgb3RoZXIgdGhhbiBzYWZlIGljb25zIGFuZCB3aGl0ZXNwYWNlXG4gICAgICAgIGNvbnN0IGNvbnRlbnRXaXRob3V0SWNvbnMgPSBpbm5lckNvbnRlbnQucmVwbGFjZShpbm5lckljb25QYXR0ZXJuLCAnJykudHJpbSgpO1xuICAgICAgICBpZiAoY29udGVudFdpdGhvdXRJY29ucyAhPT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsOyAvLyBDb250YWlucyBub24taWNvbiBjb250ZW50XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbm5lckNvbnRlbnQ7IC8vIEFsbCBpbm5lciBpY29ucyBhcmUgc2FmZVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgaWYgY2xhc3MgbmFtZSBjb250YWlucyBvbmx5IHNhZmUgY2hhcmFjdGVyc1xuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNsYXNzTmFtZSAtIENTUyBjbGFzcyBuYW1lIHRvIHZhbGlkYXRlXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgY2xhc3MgbmFtZSBpcyBzYWZlXG4gICAgICovXG4gICAgX2lzQ2xhc3NOYW1lU2FmZShjbGFzc05hbWUpIHtcbiAgICAgICAgLy8gQWxsb3cgb25seSBhbHBoYW51bWVyaWMgY2hhcmFjdGVycywgc3BhY2VzLCBoeXBoZW5zLCBhbmQgdW5kZXJzY29yZXNcbiAgICAgICAgcmV0dXJuIC9eW2EtekEtWjAtOVxcc1xcLV9dKyQvLnRlc3QoY2xhc3NOYW1lKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIGNvbnRlbnQgdXNpbmcgalF1ZXJ5J3Mgc2FmZSBtZXRob2RcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBFc2NhcGVkIEhUTUxcbiAgICAgKi9cbiAgICBfZXNjYXBlSHRtbENvbnRlbnQodGV4dCkge1xuICAgICAgICByZXR1cm4gJCgnPGRpdj4nKS50ZXh0KHRleHQpLmh0bWwoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgd2l0aCBjb21wcmVoZW5zaXZlIHdoaXRlbGlzdCBmb3IgYWxsIE1pa29QQlggb2JqZWN0IHJlcHJlc2VudGF0aW9uc1xuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIHNhbml0aXplXG4gICAgICogQHJldHVybnMge3N0cmluZ30gU2FuaXRpemVkIHRleHQgd2l0aCBwcmVzZXJ2ZWQgc2FmZSBpY29uc1xuICAgICAqL1xuICAgIF9zYW5pdGl6ZVdpdGhXaGl0ZWxpc3QodGV4dCkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIENvbXByZWhlbnNpdmUgd2hpdGVsaXN0IGZvciBhbGwgTWlrb1BCWCBvYmplY3QgdHlwZXNcbiAgICAgICAgLy8gU3luY2hyb25pemVkIHdpdGggUmVjb3JkUmVwcmVzZW50YXRpb25UcmFpdC5waHAgaWNvbiBjbGFzc2VzXG4gICAgICAgIGNvbnN0IGFsbG93ZWRJY29uQ2xhc3NlcyA9IFtcbiAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBpY29uc1xuICAgICAgICAgICAgJ3Bob25lIHZvbHVtZSBpY29uJyxcbiAgICAgICAgICAgICdwaHAgaWNvbicsXG4gICAgICAgICAgICAnc2l0ZW1hcCBpY29uJyxcbiAgICAgICAgICAgICd1c2VycyBpY29uJyxcbiAgICAgICAgICAgICdjb2dzIGljb24nLFxuICAgICAgICAgICAgJ3VzZXIgb3V0bGluZSBpY29uJyxcbiAgICAgICAgICAgICdpY29ucycsIC8vIENvbnRhaW5lciBmb3IgbXVsdGlwbGUgaWNvbnNcbiAgICAgICAgICAgICd0b3AgcmlnaHQgY29ybmVyIGFsdGVybmF0ZSBtb2JpbGUgaWNvbicsXG5cbiAgICAgICAgICAgIC8vIE1vZHVsZSBpY29uc1xuICAgICAgICAgICAgJ3B1enpsZSBwaWVjZSBpY29uJyxcblxuICAgICAgICAgICAgLy8gQVBJICYgTWFuYWdlciBpY29uc1xuICAgICAgICAgICAgJ2tleSBpY29uJyxcbiAgICAgICAgICAgICdhc3RlcmlzayBpY29uJyxcblxuICAgICAgICAgICAgLy8gRmlsZSBpY29uc1xuICAgICAgICAgICAgJ2ZpbGUgaWNvbicsXG5cbiAgICAgICAgICAgIC8vIFJvdXRpbmcgaWNvbnNcbiAgICAgICAgICAgICdtYXAgc2lnbnMgaWNvbicsXG4gICAgICAgICAgICAncmFuZG9tIGljb24nLFxuXG4gICAgICAgICAgICAvLyBTY2hlZHVsZS90aW1lIGljb25zXG4gICAgICAgICAgICAndGltZSBpY29uJyxcbiAgICAgICAgICAgICdpY29uIG91dGxpbmUgY2FsZW5kYXIgYWx0ZXJuYXRlJyxcbiAgICAgICAgICAgICdpY29uIG91dGxpbmUgY2FsZW5kYXIgbWludXMnLFxuICAgICAgICAgICAgJ2ljb24gY2xvY2sgb3V0bGluZScsXG5cbiAgICAgICAgICAgIC8vIE5ldHdvcmsgZmlsdGVyIGljb25zXG4gICAgICAgICAgICAnZ2xvYmUgaWNvbicsXG4gICAgICAgICAgICAnaG9tZSBpY29uJyxcbiAgICAgICAgICAgICdzaGllbGQgYWx0ZXJuYXRlIGljb24nLFxuICAgICAgICAgICAgJ2JhbiBpY29uJyxcblxuICAgICAgICAgICAgLy8gU291bmQgZmlsZSBpY29uc1xuICAgICAgICAgICAgJ211c2ljIGljb24nLFxuICAgICAgICAgICAgJ2ZpbGUgYXVkaW8gaWNvbicsXG4gICAgICAgICAgICAnZmlsZSBhdWRpbyBvdXRsaW5lIGljb24nLFxuICAgICAgICAgICAgJ3NvdW5kIGljb24nLFxuXG4gICAgICAgICAgICAvLyBDYWxsIHF1ZXVlIGljb25zXG4gICAgICAgICAgICAnY2FsbCBpY29uJyxcbiAgICAgICAgICAgICdwaG9uZSBpY29uJyxcbiAgICAgICAgICAgICdoZWFkcGhvbmVzIGljb24nLFxuXG4gICAgICAgICAgICAvLyBQcm92aWRlciBpY29uc1xuICAgICAgICAgICAgJ3NlcnZlciBpY29uJyxcbiAgICAgICAgICAgICdjbG91ZCBpY29uJyxcbiAgICAgICAgICAgICdwbHVnIGljb24nLFxuXG4gICAgICAgICAgICAvLyBTeXN0ZW0gaWNvbnNcbiAgICAgICAgICAgICdzZXR0aW5ncyBpY29uJyxcbiAgICAgICAgICAgICd3cmVuY2ggaWNvbicsXG4gICAgICAgICAgICAndG9vbCBpY29uJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gUGFyc2UgSFRNTCBzYWZlbHlcbiAgICAgICAgY29uc3QgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0ZW1wRGl2LmlubmVySFRNTCA9IHRleHQ7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBhbGwgPGk+IHRhZ3NcbiAgICAgICAgY29uc3QgaVRhZ3MgPSB0ZW1wRGl2LnF1ZXJ5U2VsZWN0b3JBbGwoJ2knKTtcbiAgICAgICAgbGV0IGlzU2FmZSA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICBpVGFncy5mb3JFYWNoKHRhZyA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGFzc05hbWUgPSB0YWcuY2xhc3NOYW1lO1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY2xhc3MgaXMgaW4gd2hpdGVsaXN0IG9yIGlzIGEgRm9tYW50aWMgVUkgZmxhZ1xuICAgICAgICAgICAgY29uc3QgaXNGbGFnSWNvbiA9IC9eZmxhZ1xccytbXFx3XFxzXSskLy50ZXN0KGNsYXNzTmFtZS50cmltKCkpO1xuICAgICAgICAgICAgaWYgKCFhbGxvd2VkSWNvbkNsYXNzZXMuaW5jbHVkZXMoY2xhc3NOYW1lKSAmJiAhaXNGbGFnSWNvbikge1xuICAgICAgICAgICAgICAgIGlzU2FmZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGFsbCBpY29ucyBhcmUgc2FmZSwgcmV0dXJuIHRoZSBvcmlnaW5hbCB0ZXh0XG4gICAgICAgIGlmIChpc1NhZmUpIHtcbiAgICAgICAgICAgIHJldHVybiB0ZXh0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBhbnkgdW5zYWZlIGljb24gZm91bmQsIGVzY2FwZSBhbGwgSFRNTFxuICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQodGV4dCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYW5pdGl6ZSB0ZXh0IGZvciB1c2UgaW4gSFRNTCBhdHRyaWJ1dGVzXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIHNhbml0aXplXG4gICAgICogQHJldHVybnMge3N0cmluZ30gU2FuaXRpemVkIHRleHQgc2FmZSBmb3IgYXR0cmlidXRlc1xuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUF0dHJpYnV0ZSgndmFsdWVcIm9uY2xpY2s9XCJhbGVydCgxKScpXG4gICAgICogLy8gUmV0dXJuczogJ3ZhbHVlJnF1b3Q7b25jbGljaz0mcXVvdDthbGVydCgxKSdcbiAgICAgKi9cbiAgICBzYW5pdGl6ZUF0dHJpYnV0ZSh0ZXh0KSB7XG4gICAgICAgIGlmICghdGV4dCkgcmV0dXJuICcnO1xuICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQodGV4dCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBldmVyeSBzdHJpbmcgdmFsdWUgb2YgYSBwbGFjZWhvbGRlciBtYXAgYmVmb3JlIGl0IGlzIHN1YnN0aXR1dGVkIGludG8gYW5cbiAgICAgKiBIVE1MIHRyYW5zbGF0aW9uIHRlbXBsYXRlLCBlLmcuIGkxOG4obWVzc2FnZVRwbCwgbWVzc2FnZVBhcmFtcykgZm9yIGFkdmljZSBtZXNzYWdlcy5cbiAgICAgKiBRdW90ZXMgYXJlIGVzY2FwZWQgYXMgd2VsbCBiZWNhdXNlIHBsYWNlaG9sZGVycyBzdWNoIGFzICV1cmwlIHNpdCBpbnNpZGUgYXR0cmlidXRlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fG51bGx9IHBhcmFtcyAtIFBsYWNlaG9sZGVyIHZhbHVlc1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R8bnVsbH0gQ29weSBvZiBwYXJhbXMgd2l0aCBIVE1MLWVzY2FwZWQgc3RyaW5nIHZhbHVlc1xuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBTZWN1cml0eVV0aWxzLmVzY2FwZVRlbXBsYXRlUGFyYW1zKHtyZWNvcmQ6ICc8aW1nIHNyYz14IG9uZXJyb3I9YWxlcnQoMSk+IDwyMDE+J30pXG4gICAgICogLy8gUmV0dXJuczoge3JlY29yZDogJyZsdDtpbWcgc3JjPXggb25lcnJvcj1hbGVydCgxKSZndDsgJmx0OzIwMSZndDsnfVxuICAgICAqL1xuICAgIGVzY2FwZVRlbXBsYXRlUGFyYW1zKHBhcmFtcykge1xuICAgICAgICBpZiAocGFyYW1zID09PSBudWxsIHx8IHR5cGVvZiBwYXJhbXMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVzY2FwZWQgPSB7fTtcbiAgICAgICAgT2JqZWN0LmtleXMocGFyYW1zKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcGFyYW1zW2tleV07XG4gICAgICAgICAgICBlc2NhcGVkW2tleV0gPSB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICAgICAgPyB2YWx1ZS5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgJyZxdW90OycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpXG4gICAgICAgICAgICAgICAgOiB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBlc2NhcGVkO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYW5pdGl6ZSB0ZXh0IGZvciBkaXNwbGF5IHdpdGggY29uZmlndXJhYmxlIHN0cmljdG5lc3NcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gc2FuaXRpemVcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN0cmljdE1vZGUgLSBJZiB0cnVlLCB1c2VzIHN0cmljdCB2YWxpZGF0aW9uIGZvciB1c2VyIGlucHV0LlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIElmIGZhbHNlLCB1c2VzIGxlc3Mgc3RyaWN0IHZhbGlkYXRpb24gZm9yIHRydXN0ZWQgQVBJIGNvbnRlbnQuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gU2FuaXRpemVkIHRleHRcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFN0cmljdCBtb2RlIGZvciB1c2VyIGlucHV0XG4gICAgICogU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUZvckRpc3BsYXkoJ1VzZXIgPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPicsIHRydWUpXG4gICAgICogXG4gICAgICogQGV4YW1wbGUgIFxuICAgICAqIC8vIExlc3Mgc3RyaWN0IGZvciBBUEkgY29udGVudFxuICAgICAqIFNlY3VyaXR5VXRpbHMuc2FuaXRpemVGb3JEaXNwbGF5KCc8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+IFVzZXIgTmFtZScsIGZhbHNlKVxuICAgICAqL1xuICAgIHNhbml0aXplRm9yRGlzcGxheSh0ZXh0LCBzdHJpY3RNb2RlID0gdHJ1ZSkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFsd2F5cyBjaGVjayBmb3IgZGFuZ2Vyb3VzIHBhdHRlcm5zIGZpcnN0XG4gICAgICAgIGlmICh0aGlzLmNvbnRhaW5zRGFuZ2Vyb3VzUGF0dGVybnModGV4dCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9lc2NhcGVIdG1sQ29udGVudCh0ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHN0cmljdE1vZGUpIHtcbiAgICAgICAgICAgIC8vIFN0cmljdCB2YWxpZGF0aW9uOiBvbmx5IGFsbG93IGNvbXBsZXRlbHkgc2FmZSBjb250ZW50XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc1NhZmVGb3JEcm9wZG93bih0ZXh0KSA/IFxuICAgICAgICAgICAgICAgIHRoaXMuZXNjYXBlSHRtbCh0ZXh0LCB0cnVlKSA6IFxuICAgICAgICAgICAgICAgIHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KHRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGVzcyBzdHJpY3Q6IGFsbG93IHNhZmUgaWNvbnMgZnJvbSB0cnVzdGVkIHNvdXJjZXNcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVzY2FwZUh0bWwodGV4dCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgdGV4dCBmb3IgZHJvcGRvd24gZGlzcGxheSAoc3RyaWN0IG1vZGUpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIHNhbml0aXplXG4gICAgICogQHJldHVybnMge3N0cmluZ30gU2FuaXRpemVkIHRleHRcbiAgICAgKi9cbiAgICBzYW5pdGl6ZUZvckRyb3Bkb3duKHRleHQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2FuaXRpemVGb3JEaXNwbGF5KHRleHQsIHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYW5pdGl6ZSBvYmplY3QgcmVwcmVzZW50YXRpb25zIHdpdGggZW5oYW5jZWQgWFNTIHByb3RlY3Rpb24gd2hpbGUgcHJlc2VydmluZyBzYWZlIGljb25zXG4gICAgICogXG4gICAgICogVW5pdmVyc2FsIG1ldGhvZCBmb3Igc2FuaXRpemluZyBhbGwgb2JqZWN0IHJlcHJlc2VudGF0aW9uIGRhdGEgZnJvbSBSRVNUIEFQSS5cbiAgICAgKiBIYW5kbGVzIEV4dGVuc2lvbnMsIE5ldHdvcmtGaWx0ZXJzLCBTb3VuZEZpbGVzLCBDYWxsUXVldWVzLCBhbmQgb3RoZXIgTWlrb1BCWCBvYmplY3RzLlxuICAgICAqIFVzZXMgY29tcHJlaGVuc2l2ZSB3aGl0ZWxpc3QgYXBwcm9hY2ggZm9yIG1heGltdW0gc2VjdXJpdHkgd2l0aCBwcm9wZXIgZnVuY3Rpb25hbGl0eS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gc2FuaXRpemVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTYW5pdGl6ZWQgdGV4dCB3aXRoIHByZXNlcnZlZCBzYWZlIGljb25zXG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBTYWZlIGljb25zIGFyZSBwcmVzZXJ2ZWQgKEV4dGVuc2lvbnMpXG4gICAgICogU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucygnPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPiBKb2huIERvZScpXG4gICAgICogLy8gUmV0dXJuczogJzxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4gSm9obiBEb2UnXG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBTYWZlIGljb25zIGFyZSBwcmVzZXJ2ZWQgKE5ldHdvcmtGaWx0ZXJzKVxuICAgICAqIFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoJzxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4gQW55IE5ldHdvcmsnKVxuICAgICAqIC8vIFJldHVybnM6ICc8aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+IEFueSBOZXR3b3JrJ1xuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gWFNTIGF0dGFja3MgYXJlIGJsb2NrZWRcbiAgICAgKiBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKCc8c2NyaXB0PmFsZXJ0KFwiWFNTXCIpPC9zY3JpcHQ+JylcbiAgICAgKiAvLyBSZXR1cm5zOiAnJmx0O3NjcmlwdCZndDthbGVydCgmcXVvdDtYU1MmcXVvdDspJmx0Oy9zY3JpcHQmZ3Q7J1xuICAgICAqL1xuICAgIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHRleHQpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmhhbmNlZCBkYW5nZXJvdXMgcGF0dGVybnMgc3BlY2lmaWNhbGx5IGZvciBleHRlbnNpb24gcmVwcmVzZW50YXRpb25zXG4gICAgICAgIGNvbnN0IGRhbmdlcm91c1BhdHRlcm5zID0gW1xuICAgICAgICAgICAgLzxzY3JpcHRbXFxzXFxTXSo/PFxcL3NjcmlwdD4vZ2ksXG4gICAgICAgICAgICAvPGlmcmFtZVtcXHNcXFNdKj88XFwvaWZyYW1lPi9naSxcbiAgICAgICAgICAgIC88b2JqZWN0W1xcc1xcU10qPzxcXC9vYmplY3Q+L2dpLFxuICAgICAgICAgICAgLzxlbWJlZFtcXHNcXFNdKj8+L2dpLFxuICAgICAgICAgICAgLzxmb3JtW1xcc1xcU10qPzxcXC9mb3JtPi9naSxcbiAgICAgICAgICAgIC88aW1nW1xcc1xcU10qPz4vZ2ksXG4gICAgICAgICAgICAvPHN2Z1tcXHNcXFNdKj88XFwvc3ZnPi9naSxcbiAgICAgICAgICAgIC88bGlua1tcXHNcXFNdKj8+L2dpLFxuICAgICAgICAgICAgLzxtZXRhW1xcc1xcU10qPz4vZ2ksXG4gICAgICAgICAgICAvPHN0eWxlW1xcc1xcU10qPzxcXC9zdHlsZT4vZ2ksXG4gICAgICAgICAgICAvamF2YXNjcmlwdDovZ2ksXG4gICAgICAgICAgICAvZGF0YTp0ZXh0XFwvaHRtbC9naSxcbiAgICAgICAgICAgIC9vblxcdytcXHMqPS9naSwgLy8gRXZlbnQgaGFuZGxlcnMgbGlrZSBvbmNsaWNrLCBvbmxvYWQsIGV0Yy5cbiAgICAgICAgICAgIC9leHByZXNzaW9uXFxzKlxcKC9naSwgLy8gQ1NTIGV4cHJlc3Npb25zXG4gICAgICAgICAgICAvdXJsXFxzKlxcKFxccypqYXZhc2NyaXB0Oi9naSxcbiAgICAgICAgICAgIC8vIEFkZGl0aW9uYWwgcGF0dGVybnMgdG8gY2F0Y2ggdmFyaW91cyBYU1MgYXR0ZW1wdHNcbiAgICAgICAgICAgIC88c2NyaXB0XFxiL2dpLCAvLyBTY3JpcHQgdGFncyAoZXZlbiB3aXRob3V0IGNsb3NpbmcpXG4gICAgICAgICAgICAvYWxlcnRcXHMqXFwoL2dpLCAvLyBBbGVydCBmdW5jdGlvbiBjYWxsc1xuICAgICAgICAgICAgL29uZXJyb3JcXHMqPS9naSwgLy8gU3BlY2lmaWMgb25lcnJvciBoYW5kbGVyXG4gICAgICAgICAgICAvc3JjXFxzKj1cXHMqeFxcYi9naSwgLy8gQ29tbW9uIFhTUyBwYXR0ZXJuIHNyYz14IFxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgYW55IGRhbmdlcm91cyBwYXR0ZXJuIGlzIGZvdW5kLCBlc2NhcGUgYWxsIEhUTUxcbiAgICAgICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIGRhbmdlcm91c1BhdHRlcm5zKSB7XG4gICAgICAgICAgICBpZiAocGF0dGVybi50ZXN0KHRleHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KHRleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBubyBkYW5nZXJvdXMgcGF0dGVybnMgZm91bmQsIHVzZSB3aGl0ZWxpc3QgdmFsaWRhdGlvbiBmb3Igc2FmZSBpY29uc1xuICAgICAgICByZXR1cm4gdGhpcy5fc2FuaXRpemVXaXRoV2hpdGVsaXN0KHRleHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMZWdhY3kgYWxpYXMgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2Ugc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMgaW5zdGVhZFxuICAgICAqL1xuICAgIHNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQodGV4dCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyh0ZXh0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHNhZmUgb3B0aW9uIGVsZW1lbnQgZm9yIGRyb3Bkb3duc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIE9wdGlvbiB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gT3B0aW9uIGRpc3BsYXkgdGV4dFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3RyaWN0TW9kZSAtIFdoZXRoZXIgdG8gdXNlIHN0cmljdCBmaWx0ZXJpbmcgKGRlZmF1bHQ6IHRydWUpXG4gICAgICogQHJldHVybnMge3N0cmluZ30gU2FmZSBvcHRpb24gSFRNTFxuICAgICAqL1xuICAgIGNyZWF0ZVNhZmVPcHRpb24odmFsdWUsIHRleHQsIHN0cmljdE1vZGUgPSB0cnVlKSB7XG4gICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHRoaXMuc2FuaXRpemVBdHRyaWJ1dGUodmFsdWUpO1xuICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHRoaXMuc2FuaXRpemVGb3JEaXNwbGF5KHRleHQsIHN0cmljdE1vZGUpO1xuICAgICAgICByZXR1cm4gYDxvcHRpb24gdmFsdWU9XCIke3NhZmVWYWx1ZX1cIj4ke3NhZmVUZXh0fTwvb3B0aW9uPmA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYWZlbHkgc2V0IEhUTUwgY29udGVudCBvZiBlbGVtZW50XG4gICAgICogXG4gICAgICogQHBhcmFtIHtqUXVlcnl8SFRNTEVsZW1lbnR9IGVsZW1lbnQgLSBUYXJnZXQgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50IC0gQ29udGVudCB0byBzZXRcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN0cmljdE1vZGUgLSBXaGV0aGVyIHRvIHVzZSBzdHJpY3QgZmlsdGVyaW5nIChkZWZhdWx0OiB0cnVlKVxuICAgICAqL1xuICAgIHNldEh0bWxDb250ZW50KGVsZW1lbnQsIGNvbnRlbnQsIHN0cmljdE1vZGUgPSB0cnVlKSB7XG4gICAgICAgIGNvbnN0ICRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICAgICAgY29uc3Qgc2FmZUNvbnRlbnQgPSB0aGlzLnNhbml0aXplRm9yRGlzcGxheShjb250ZW50LCBzdHJpY3RNb2RlKTtcbiAgICAgICAgJGVsZW1lbnQuaHRtbChzYWZlQ29udGVudCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSBpZiBzdHJpbmcgY29udGFpbnMgcG90ZW50aWFsbHkgZGFuZ2Vyb3VzIHBhdHRlcm5zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIHZhbGlkYXRlXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGV4dCBjb250YWlucyBkYW5nZXJvdXMgcGF0dGVybnNcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIFNlY3VyaXR5VXRpbHMuY29udGFpbnNEYW5nZXJvdXNQYXR0ZXJucygnPHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0PicpXG4gICAgICogLy8gUmV0dXJuczogdHJ1ZVxuICAgICAqL1xuICAgIGNvbnRhaW5zRGFuZ2Vyb3VzUGF0dGVybnModGV4dCkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRhbmdlcm91c1BhdHRlcm5zID0gW1xuICAgICAgICAgICAgLzxzY3JpcHRbXFxzXFxTXSo/PFxcL3NjcmlwdD4vZ2ksXG4gICAgICAgICAgICAvPGlmcmFtZVtcXHNcXFNdKj88XFwvaWZyYW1lPi9naSxcbiAgICAgICAgICAgIC88b2JqZWN0W1xcc1xcU10qPzxcXC9vYmplY3Q+L2dpLFxuICAgICAgICAgICAgLzxlbWJlZFtcXHNcXFNdKj8+L2dpLFxuICAgICAgICAgICAgLzxmb3JtW1xcc1xcU10qPzxcXC9mb3JtPi9naSxcbiAgICAgICAgICAgIC9qYXZhc2NyaXB0Oi9naSxcbiAgICAgICAgICAgIC9kYXRhOnRleHRcXC9odG1sL2dpLFxuICAgICAgICAgICAgL29uXFx3K1xccyo9L2dpLCAvLyBFdmVudCBoYW5kbGVycyBsaWtlIG9uY2xpY2ssIG9ubG9hZCwgZXRjLlxuICAgICAgICAgICAgLzxpbWdbXj5dK29uZXJyb3IvZ2ksXG4gICAgICAgICAgICAvPHN2Z1tePl0qb25sb2FkL2dpLFxuICAgICAgICAgICAgLzxzdHlsZVtcXHNcXFNdKj88XFwvc3R5bGU+L2dpLFxuICAgICAgICAgICAgLzxsaW5rW1xcc1xcU10qPz4vZ2ksXG4gICAgICAgICAgICAvPG1ldGFbXFxzXFxTXSo/Pi9naSxcbiAgICAgICAgICAgIC9leHByZXNzaW9uXFxzKlxcKC9naSwgLy8gQ1NTIGV4cHJlc3Npb25zXG4gICAgICAgICAgICAvdXJsXFxzKlxcKFxccypqYXZhc2NyaXB0Oi9naSxcbiAgICAgICAgICAgIC88XFwvP1xcdytbXj5dKlxccytzcmNcXHMqPS9naSwgLy8gVGFncyB3aXRoIHNyYyBhdHRyaWJ1dGUgKGV4Y2VwdCBhbGxvd2VkKVxuICAgICAgICAgICAgLzxcXC8/XFx3K1tePl0qXFxzK2hyZWZcXHMqPS9naSwgLy8gVGFncyB3aXRoIGhyZWYgYXR0cmlidXRlIChleGNlcHQgYWxsb3dlZClcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkYW5nZXJvdXNQYXR0ZXJucy5zb21lKHBhdHRlcm4gPT4gcGF0dGVybi50ZXN0KHRleHQpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgaWYgdGV4dCBjb250YWlucyBvbmx5IHNhZmUgaWNvbiBzdHJ1Y3R1cmVzIGFuZCByZWd1bGFyIHRleHRcbiAgICAgKiBcbiAgICAgKiBUaGlzIG1ldGhvZCBlbnN1cmVzIHRoYXQgdGhlIHRleHQgY29udGFpbnMgb25seTpcbiAgICAgKiAtIFBsYWluIHRleHQgY29udGVudFxuICAgICAqIC0gU2FmZSBzaW1wbGUgaWNvbnM6IDxpIGNsYXNzPVwiLi4uXCI+PC9pPiAgXG4gICAgICogLSBTYWZlIG5lc3RlZCBpY29uczogPGkgY2xhc3M9XCJpY29uc1wiPi4uLjwvaT5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gdmFsaWRhdGVcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0ZXh0IGlzIHNhZmUgZm9yIGRyb3Bkb3duIGRpc3BsYXlcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIFNlY3VyaXR5VXRpbHMuaXNTYWZlRm9yRHJvcGRvd24oJ1VzZXIgPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPicpXG4gICAgICogLy8gUmV0dXJuczogdHJ1ZVxuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogU2VjdXJpdHlVdGlscy5pc1NhZmVGb3JEcm9wZG93bignVXNlciA8c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+JylcbiAgICAgKiAvLyBSZXR1cm5zOiBmYWxzZVxuICAgICAqL1xuICAgIGlzU2FmZUZvckRyb3Bkb3duKHRleHQpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBkYW5nZXJvdXMgcGF0dGVybnMgZmlyc3RcbiAgICAgICAgaWYgKHRoaXMuY29udGFpbnNEYW5nZXJvdXNQYXR0ZXJucyh0ZXh0KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgYWxsIHNhZmUgaWNvbiBzdHJ1Y3R1cmVzIGFuZCBjaGVjayBpZiByZW1haW5pbmcgY29udGVudCBpcyBzYWZlXG4gICAgICAgIGNvbnN0IHRlbXBUZXh0ID0gdGhpcy5fcmVtb3ZlU2FmZUljb25zKHRleHQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWZ0ZXIgcmVtb3Zpbmcgc2FmZSBpY29ucywgdGhlcmUgc2hvdWxkIG9ubHkgYmUgcGxhaW4gdGV4dFxuICAgICAgICAvLyBDaGVjayBmb3IgYW55IHJlbWFpbmluZyBIVE1MIHRhZ3NcbiAgICAgICAgY29uc3QgaGFzVW5zYWZlVGFncyA9IC88W14+XSs+L2cudGVzdCh0ZW1wVGV4dCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gIWhhc1Vuc2FmZVRhZ3M7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSBhbGwgc2FmZSBpY29uIHN0cnVjdHVyZXMgZnJvbSB0ZXh0XG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gcHJvY2Vzc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRleHQgd2l0aCBzYWZlIGljb25zIHJlbW92ZWRcbiAgICAgKi9cbiAgICBfcmVtb3ZlU2FmZUljb25zKHRleHQpIHtcbiAgICAgICAgLy8gRmlyc3QgcmVtb3ZlIG5lc3RlZCBpY29uc1xuICAgICAgICBsZXQgY2xlYW5UZXh0ID0gdGV4dC5yZXBsYWNlKHRoaXMuX2dldE5lc3RlZEljb25QYXR0ZXJuKCksIChtYXRjaCwgb3V0ZXJDbGFzc05hbWUsIGlubmVyQ29udGVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzQ2xhc3NOYW1lU2FmZShvdXRlckNsYXNzTmFtZSkgJiYgdGhpcy5fcHJvY2Vzc0lubmVySWNvbnMoaW5uZXJDb250ZW50KSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJzsgLy8gUmVtb3ZlIHNhZmUgbmVzdGVkIGljb25cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtYXRjaDsgLy8gS2VlcCB1bnNhZmUgaWNvbiBmb3IgZnVydGhlciB2YWxpZGF0aW9uXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVGhlbiByZW1vdmUgc2ltcGxlIGljb25zXG4gICAgICAgIGNsZWFuVGV4dCA9IGNsZWFuVGV4dC5yZXBsYWNlKC88aVxccytjbGFzcz1cIihbXlwiPD5dKilcIj5cXHMqPFxcL2k+L2dpLCAobWF0Y2gsIGNsYXNzTmFtZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzQ2xhc3NOYW1lU2FmZShjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnOyAvLyBSZW1vdmUgc2FmZSBzaW1wbGUgaWNvblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1hdGNoOyAvLyBLZWVwIHVuc2FmZSBpY29uIGZvciBmdXJ0aGVyIHZhbGlkYXRpb25cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2xlYW5UZXh0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXRpc3RpY3MgYWJvdXQgc2FmZSBpY29uIHByb2Nlc3NpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gYW5hbHl6ZVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFN0YXRpc3RpY3Mgb2JqZWN0XG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBTZWN1cml0eVV0aWxzLmdldFByb2Nlc3NpbmdTdGF0cygnVGV4dCA8aSBjbGFzcz1cImljb25cIj48L2k+IDxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD4nKVxuICAgICAqIC8vIFJldHVybnM6IHsgc2FmZVNpbXBsZUljb25zOiAxLCBzYWZlTmVzdGVkSWNvbnM6IDAsIGRhbmdlcm91c1BhdHRlcm5zOiAxLCBpc1NhZmVGb3JEcm9wZG93bjogZmFsc2UsIHRvdGFsTGVuZ3RoOiA1NCB9XG4gICAgICovXG4gICAgZ2V0UHJvY2Vzc2luZ1N0YXRzKHRleHQpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4geyBcbiAgICAgICAgICAgIHNhZmVTaW1wbGVJY29uczogMCwgXG4gICAgICAgICAgICBzYWZlTmVzdGVkSWNvbnM6IDAsIFxuICAgICAgICAgICAgZGFuZ2Vyb3VzUGF0dGVybnM6IDAsIFxuICAgICAgICAgICAgaXNTYWZlRm9yRHJvcGRvd246IHRydWUsXG4gICAgICAgICAgICB0b3RhbExlbmd0aDogMCBcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvdW50IHNhZmUgc2ltcGxlIGljb25zXG4gICAgICAgIGNvbnN0IHNpbXBsZUljb25QYXR0ZXJuID0gLzxpXFxzK2NsYXNzPVwiKFteXCI8Pl0qKVwiPlxccyo8XFwvaT4vZ2k7XG4gICAgICAgIGNvbnN0IHNpbXBsZU1hdGNoZXMgPSBbLi4udGV4dC5tYXRjaEFsbChzaW1wbGVJY29uUGF0dGVybildO1xuICAgICAgICBjb25zdCBzYWZlU2ltcGxlSWNvbnMgPSBzaW1wbGVNYXRjaGVzLmZpbHRlcihtYXRjaCA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGFzc05hbWUgPSBtYXRjaFsxXTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc0NsYXNzTmFtZVNhZmUoY2xhc3NOYW1lKTtcbiAgICAgICAgfSkubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgLy8gQ291bnQgc2FmZSBuZXN0ZWQgaWNvbnNcbiAgICAgICAgY29uc3QgbmVzdGVkTWF0Y2hlcyA9IFsuLi50ZXh0Lm1hdGNoQWxsKHRoaXMuX2dldE5lc3RlZEljb25QYXR0ZXJuKCkpXTtcbiAgICAgICAgY29uc3Qgc2FmZU5lc3RlZEljb25zID0gbmVzdGVkTWF0Y2hlcy5maWx0ZXIobWF0Y2ggPT4ge1xuICAgICAgICAgICAgY29uc3Qgb3V0ZXJDbGFzc05hbWUgPSBtYXRjaFsxXTtcbiAgICAgICAgICAgIGNvbnN0IGlubmVyQ29udGVudCA9IG1hdGNoWzJdO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzQ2xhc3NOYW1lU2FmZShvdXRlckNsYXNzTmFtZSkgJiYgdGhpcy5fcHJvY2Vzc0lubmVySWNvbnMoaW5uZXJDb250ZW50KSAhPT0gbnVsbDtcbiAgICAgICAgfSkubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGFuZ2Vyb3VzUGF0dGVybnMgPSB0aGlzLmNvbnRhaW5zRGFuZ2Vyb3VzUGF0dGVybnModGV4dCkgPyAxIDogMDtcbiAgICAgICAgY29uc3QgaXNTYWZlRm9yRHJvcGRvd24gPSB0aGlzLmlzU2FmZUZvckRyb3Bkb3duKHRleHQpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNhZmVTaW1wbGVJY29ucyxcbiAgICAgICAgICAgIHNhZmVOZXN0ZWRJY29ucyxcbiAgICAgICAgICAgIGRhbmdlcm91c1BhdHRlcm5zLFxuICAgICAgICAgICAgaXNTYWZlRm9yRHJvcGRvd24sXG4gICAgICAgICAgICB0b3RhbExlbmd0aDogdGV4dC5sZW5ndGhcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlYnVnIG1vZGUgZmxhZyBmb3IgZGV2ZWxvcG1lbnRcbiAgICAgKi9cbiAgICBkZWJ1ZzogZmFsc2UsXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9nIHNlY3VyaXR5IHByb2Nlc3NpbmcgaW5mb3JtYXRpb24gKG9ubHkgaW4gZGVidWcgbW9kZSlcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gRGVidWcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSB7Kn0gZGF0YSAtIEFkZGl0aW9uYWwgZGF0YSB0byBsb2dcbiAgICAgKi9cbiAgICBfZGVidWdMb2cobWVzc2FnZSwgZGF0YSA9IG51bGwpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVidWcgJiYgY29uc29sZSAmJiBjb25zb2xlLmxvZykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTZWN1cml0eVV0aWxzXSAke21lc3NhZ2V9YCwgZGF0YSB8fCAnJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIExlZ2FjeSBjb21wYXRpYmlsaXR5IC0gcHJvdmlkZSBvbGQgZnVuY3Rpb24gbmFtZXNcbiAqIEBkZXByZWNhdGVkIFVzZSBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwgaW5zdGVhZFxuICovXG53aW5kb3cuZXNjYXBlSHRtbFNhZmUgPSBmdW5jdGlvbih0ZXh0LCBhbGxvd0ljb25zID0gZmFsc2UpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tTZWN1cml0eVV0aWxzXSBlc2NhcGVIdG1sU2FmZSBpcyBkZXByZWNhdGVkLiBVc2UgU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sIGluc3RlYWQuJyk7XG4gICAgcmV0dXJuIHdpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwodGV4dCwgYWxsb3dJY29ucyk7XG59O1xuXG4vLyBJbml0aWFsaXplIGRlYnVnIG1vZGUgYmFzZWQgb24gZW52aXJvbm1lbnRcbmlmICh0eXBlb2YgZ2xvYmFsRGVidWdNb2RlICE9PSAndW5kZWZpbmVkJyAmJiBnbG9iYWxEZWJ1Z01vZGUpIHtcbiAgICB3aW5kb3cuU2VjdXJpdHlVdGlscy5kZWJ1ZyA9IHRydWU7XG59XG5cbi8vIExvZyBpbml0aWFsaXphdGlvbiBpbiBkZWJ1ZyBtb2RlXG53aW5kb3cuU2VjdXJpdHlVdGlscy5fZGVidWdMb2coJ1NlY3VyaXR5VXRpbHMgaW5pdGlhbGl6ZWQnLCB7XG4gICAgdmVyc2lvbjogd2luZG93LlNlY3VyaXR5VXRpbHMudmVyc2lvbixcbiAgICBkZWJ1Zzogd2luZG93LlNlY3VyaXR5VXRpbHMuZGVidWdcbn0pOyJdfQ==