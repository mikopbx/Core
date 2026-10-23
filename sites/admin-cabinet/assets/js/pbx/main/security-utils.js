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

    // Pattern to match nested icon structures: <i class="icons">...</i>
    var nestedIconPattern = /<i\s+class="([^"<>]*icons[^"<>]*)">([\s\S]*?)<\/i>/gi;
    var iconIndex = startIndex;
    return text.replace(nestedIconPattern, function (match, outerClassName, innerContent) {
      // Validate outer class is safe
      if (!_this._isClassNameSafe(outerClassName)) {
        return _this._escapeHtmlContent(match);
      } // Extract and validate inner icons


      var safeInnerContent = _this._processInnerIcons(innerContent);

      if (safeInnerContent === null) {
        // If any inner icon is unsafe, escape the whole structure
        return _this._escapeHtmlContent(match);
      } // Reconstruct safe nested icon


      var safeNestedIcon = "<i class=\"".concat(outerClassName, "\">").concat(safeInnerContent, "</i>");
      icons[iconIndex] = safeNestedIcon;
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
      } // If class is not safe, escape the whole tag


      return _this2._escapeHtmlContent(match);
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
    var cleanText = text.replace(/<i\s+class="([^"<>]*icons[^"<>]*)">([\s\S]*?)<\/i>/gi, function (match, outerClassName, innerContent) {
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

    var nestedIconPattern = /<i\s+class="([^"<>]*icons[^"<>]*)">([\s\S]*?)<\/i>/gi;

    var nestedMatches = _toConsumableArray(text.matchAll(nestedIconPattern));

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3NlY3VyaXR5LXV0aWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIlNlY3VyaXR5VXRpbHMiLCJ2ZXJzaW9uIiwiZXNjYXBlSHRtbCIsInRleHQiLCJhbGxvd0ljb25zIiwiX3Byb2Nlc3NXaXRoU2FmZUljb25zIiwiX2VzY2FwZUh0bWxDb250ZW50IiwiaWNvbnMiLCJpY29uSW5kZXgiLCJ0ZXh0V2l0aE5lc3RlZFBsYWNlaG9sZGVycyIsIl9leHRyYWN0TmVzdGVkSWNvbnMiLCJsZW5ndGgiLCJ0ZXh0V2l0aEFsbFBsYWNlaG9sZGVycyIsIl9leHRyYWN0U2ltcGxlSWNvbnMiLCJlc2NhcGVkIiwicmVwbGFjZSIsIm1hdGNoIiwiaW5kZXgiLCJzdGFydEluZGV4IiwibmVzdGVkSWNvblBhdHRlcm4iLCJvdXRlckNsYXNzTmFtZSIsImlubmVyQ29udGVudCIsIl9pc0NsYXNzTmFtZVNhZmUiLCJzYWZlSW5uZXJDb250ZW50IiwiX3Byb2Nlc3NJbm5lckljb25zIiwic2FmZU5lc3RlZEljb24iLCJzaW1wbGVJY29uUGF0dGVybiIsImNsYXNzTmFtZSIsImlubmVySWNvblBhdHRlcm4iLCJtYXRjaGVzIiwibWF0Y2hBbGwiLCJjb250ZW50V2l0aG91dEljb25zIiwidHJpbSIsInRlc3QiLCIkIiwiaHRtbCIsIl9zYW5pdGl6ZVdpdGhXaGl0ZWxpc3QiLCJhbGxvd2VkSWNvbkNsYXNzZXMiLCJ0ZW1wRGl2IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiaW5uZXJIVE1MIiwiaVRhZ3MiLCJxdWVyeVNlbGVjdG9yQWxsIiwiaXNTYWZlIiwiZm9yRWFjaCIsInRhZyIsImlzRmxhZ0ljb24iLCJpbmNsdWRlcyIsInNhbml0aXplQXR0cmlidXRlIiwiZXNjYXBlVGVtcGxhdGVQYXJhbXMiLCJwYXJhbXMiLCJPYmplY3QiLCJrZXlzIiwia2V5IiwidmFsdWUiLCJzYW5pdGl6ZUZvckRpc3BsYXkiLCJzdHJpY3RNb2RlIiwiY29udGFpbnNEYW5nZXJvdXNQYXR0ZXJucyIsImlzU2FmZUZvckRyb3Bkb3duIiwic2FuaXRpemVGb3JEcm9wZG93biIsInNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIiwiZGFuZ2Vyb3VzUGF0dGVybnMiLCJwYXR0ZXJuIiwic2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCIsImNyZWF0ZVNhZmVPcHRpb24iLCJzYWZlVmFsdWUiLCJzYWZlVGV4dCIsInNldEh0bWxDb250ZW50IiwiZWxlbWVudCIsImNvbnRlbnQiLCIkZWxlbWVudCIsInNhZmVDb250ZW50Iiwic29tZSIsInRlbXBUZXh0IiwiX3JlbW92ZVNhZmVJY29ucyIsImhhc1Vuc2FmZVRhZ3MiLCJjbGVhblRleHQiLCJnZXRQcm9jZXNzaW5nU3RhdHMiLCJzYWZlU2ltcGxlSWNvbnMiLCJzYWZlTmVzdGVkSWNvbnMiLCJ0b3RhbExlbmd0aCIsInNpbXBsZU1hdGNoZXMiLCJmaWx0ZXIiLCJuZXN0ZWRNYXRjaGVzIiwiZGVidWciLCJfZGVidWdMb2ciLCJtZXNzYWdlIiwiZGF0YSIsImNvbnNvbGUiLCJsb2ciLCJlc2NhcGVIdG1sU2FmZSIsIndhcm4iLCJnbG9iYWxEZWJ1Z01vZGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0FBLE1BQU0sQ0FBQ0MsYUFBUCxHQUF1QjtBQUVuQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLE9BTFU7O0FBT25CO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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Q0gsQyxDQUVEOzs7QUFDQXRGLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQnNGLFNBQXJCLENBQStCLDJCQUEvQixFQUE0RDtBQUN4RHJGLEVBQUFBLE9BQU8sRUFBRUYsTUFBTSxDQUFDQyxhQUFQLENBQXFCQyxPQUQwQjtBQUV4RG9GLEVBQUFBLEtBQUssRUFBRXRGLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQnFGO0FBRjRCLENBQTVEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBHbG9iYWwgU2VjdXJpdHkgVXRpbGl0aWVzIGZvciBNaWtvUEJYIEFkbWluIENhYmluZXRcbiAqIFxuICogUHJvdmlkZXMgc2VjdXJlIEhUTUwgZXNjYXBpbmcgd2l0aCBzZWxlY3RpdmUgaWNvbiBzdXBwb3J0IGFjcm9zcyBhbGwgbW9kdWxlcy5cbiAqIEltcGxlbWVudHMgRGVmZW5zZS1pbi1EZXB0aCBzdHJhdGVneSBhZ2FpbnN0IFhTUyBhdHRhY2tzLlxuICogXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogQGF1dGhvciBNaWtvUEJYIERldmVsb3BtZW50IFRlYW1cbiAqL1xud2luZG93LlNlY3VyaXR5VXRpbHMgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogVmVyc2lvbiBmb3IgY29tcGF0aWJpbGl0eSB0cmFja2luZ1xuICAgICAqL1xuICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgXG4gICAgLyoqXG4gICAgICogU2FmZWx5IGVzY2FwZSBIVE1MIHdoaWxlIHByZXNlcnZpbmcgc2FmZSBpY29uIHRhZ3NcbiAgICAgKiBcbiAgICAgKiBUaGlzIGZ1bmN0aW9uIGltcGxlbWVudHMgYSBwbGFjZWhvbGRlci1iYXNlZCBhcHByb2FjaCB0byBhbGxvdyBzYWZlIGljb25zXG4gICAgICogd2hpbGUgcHJvdGVjdGluZyBhZ2FpbnN0IFhTUyBhdHRhY2tzLiBTYWZlIGljb25zIGFyZSBleHRyYWN0ZWQgYmVmb3JlXG4gICAgICogSFRNTCBlc2NhcGluZyBhbmQgcmVzdG9yZWQgYWZ0ZXJ3YXJkcy5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gZXNjYXBlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBhbGxvd0ljb25zIC0gV2hldGhlciB0byBhbGxvdyA8aT4gdGFncyBmb3IgaWNvbnMgKGRlZmF1bHQ6IGZhbHNlKVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhZmUgSFRNTCBjb250ZW50XG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBCYXNpYyBIVE1MIGVzY2FwaW5nXG4gICAgICogU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKCc8c2NyaXB0PmFsZXJ0KFwiWFNTXCIpPC9zY3JpcHQ+JylcbiAgICAgKiAvLyBSZXR1cm5zOiAnJmx0O3NjcmlwdCZndDthbGVydCgmcXVvdDtYU1MmcXVvdDspJmx0Oy9zY3JpcHQmZ3Q7J1xuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gU2FmZSBpY29uIHByZXNlcnZhdGlvblxuICAgICAqIFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbCgnU2FsZXMgPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPicsIHRydWUpXG4gICAgICogLy8gUmV0dXJuczogJ1NhbGVzIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4nXG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBEYW5nZXJvdXMgaWNvbiBibG9ja2luZ1xuICAgICAqIFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbCgnU2FsZXMgPGkgY2xhc3M9XCJwaG9uZSBpY29uXCIgb25jbGljaz1cImFsZXJ0KDEpXCI+PC9pPicsIHRydWUpXG4gICAgICogLy8gUmV0dXJuczogJ1NhbGVzICZsdDtpIGNsYXNzPSZxdW90O3Bob25lIGljb24mcXVvdDsgb25jbGljaz0mcXVvdDthbGVydCgxKSZxdW90OyZndDsmbHQ7L2kmZ3Q7J1xuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCwgYWxsb3dJY29ucyA9IGZhbHNlKSB7XG4gICAgICAgIGlmICghdGV4dCkgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFsbG93SWNvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcm9jZXNzV2l0aFNhZmVJY29ucyh0ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gaWNvbnMgYWxsb3dlZCwganVzdCBlc2NhcGUgZXZlcnl0aGluZ1xuICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQodGV4dCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIHRleHQgd2l0aCBzYWZlIGljb24gZXh0cmFjdGlvbiBhbmQgcmVzdG9yYXRpb25cbiAgICAgKiBcbiAgICAgKiBTdXBwb3J0cyBib3RoIHNpbXBsZSBpY29ucyBhbmQgbmVzdGVkIGljb24gc3RydWN0dXJlczpcbiAgICAgKiAtIFNpbXBsZTogPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPlxuICAgICAqIC0gTmVzdGVkOiA8aSBjbGFzcz1cImljb25zXCI+PGkgY2xhc3M9XCJ1c2VyIG91dGxpbmUgaWNvblwiPjwvaT48aSBjbGFzcz1cInRvcCByaWdodCBjb3JuZXIgYWx0ZXJuYXRlIG1vYmlsZSBpY29uXCI+PC9pPjwvaT5cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBwcm9jZXNzXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUHJvY2Vzc2VkIHNhZmUgSFRNTFxuICAgICAqL1xuICAgIF9wcm9jZXNzV2l0aFNhZmVJY29ucyh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IGljb25zID0gW107XG4gICAgICAgIGxldCBpY29uSW5kZXggPSAwO1xuICAgICAgICBcbiAgICAgICAgLy8gRmlyc3QsIGV4dHJhY3QgbmVzdGVkIGljb24gc3RydWN0dXJlc1xuICAgICAgICBjb25zdCB0ZXh0V2l0aE5lc3RlZFBsYWNlaG9sZGVycyA9IHRoaXMuX2V4dHJhY3ROZXN0ZWRJY29ucyh0ZXh0LCBpY29ucywgaWNvbkluZGV4KTtcbiAgICAgICAgaWNvbkluZGV4ID0gaWNvbnMubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgLy8gVGhlbiBleHRyYWN0IHNpbXBsZSBpY29ucyBmcm9tIHJlbWFpbmluZyB0ZXh0XG4gICAgICAgIGNvbnN0IHRleHRXaXRoQWxsUGxhY2Vob2xkZXJzID0gdGhpcy5fZXh0cmFjdFNpbXBsZUljb25zKHRleHRXaXRoTmVzdGVkUGxhY2Vob2xkZXJzLCBpY29ucywgaWNvbkluZGV4KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEVzY2FwZSBhbGwgSFRNTCBpbiB0ZXh0IHdpdGggcGxhY2Vob2xkZXJzXG4gICAgICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLl9lc2NhcGVIdG1sQ29udGVudCh0ZXh0V2l0aEFsbFBsYWNlaG9sZGVycyk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZXN0b3JlIHNhZmUgaWNvbnMgYnkgcmVwbGFjaW5nIHBsYWNlaG9sZGVyc1xuICAgICAgICByZXR1cm4gZXNjYXBlZC5yZXBsYWNlKC9fX1NBRkVfSUNPTl8oXFxkKylfXy9nLCAobWF0Y2gsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gaWNvbnNbaW5kZXhdIHx8ICcnO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBuZXN0ZWQgaWNvbiBzdHJ1Y3R1cmVzIGxpa2UgPGkgY2xhc3M9XCJpY29uc1wiPi4uLjwvaT5cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBwcm9jZXNzXG4gICAgICogQHBhcmFtIHtBcnJheX0gaWNvbnMgLSBBcnJheSB0byBzdG9yZSBmb3VuZCBpY29uc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydEluZGV4IC0gU3RhcnRpbmcgaW5kZXggZm9yIHBsYWNlaG9sZGVyc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRleHQgd2l0aCBuZXN0ZWQgaWNvbnMgcmVwbGFjZWQgYnkgcGxhY2Vob2xkZXJzXG4gICAgICovXG4gICAgX2V4dHJhY3ROZXN0ZWRJY29ucyh0ZXh0LCBpY29ucywgc3RhcnRJbmRleCkge1xuICAgICAgICAvLyBQYXR0ZXJuIHRvIG1hdGNoIG5lc3RlZCBpY29uIHN0cnVjdHVyZXM6IDxpIGNsYXNzPVwiaWNvbnNcIj4uLi48L2k+XG4gICAgICAgIGNvbnN0IG5lc3RlZEljb25QYXR0ZXJuID0gLzxpXFxzK2NsYXNzPVwiKFteXCI8Pl0qaWNvbnNbXlwiPD5dKilcIj4oW1xcc1xcU10qPyk8XFwvaT4vZ2k7XG4gICAgICAgIGxldCBpY29uSW5kZXggPSBzdGFydEluZGV4O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZShuZXN0ZWRJY29uUGF0dGVybiwgKG1hdGNoLCBvdXRlckNsYXNzTmFtZSwgaW5uZXJDb250ZW50KSA9PiB7XG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBvdXRlciBjbGFzcyBpcyBzYWZlXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2lzQ2xhc3NOYW1lU2FmZShvdXRlckNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQobWF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFeHRyYWN0IGFuZCB2YWxpZGF0ZSBpbm5lciBpY29uc1xuICAgICAgICAgICAgY29uc3Qgc2FmZUlubmVyQ29udGVudCA9IHRoaXMuX3Byb2Nlc3NJbm5lckljb25zKGlubmVyQ29udGVudCk7XG4gICAgICAgICAgICBpZiAoc2FmZUlubmVyQ29udGVudCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIElmIGFueSBpbm5lciBpY29uIGlzIHVuc2FmZSwgZXNjYXBlIHRoZSB3aG9sZSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQobWF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWNvbnN0cnVjdCBzYWZlIG5lc3RlZCBpY29uXG4gICAgICAgICAgICBjb25zdCBzYWZlTmVzdGVkSWNvbiA9IGA8aSBjbGFzcz1cIiR7b3V0ZXJDbGFzc05hbWV9XCI+JHtzYWZlSW5uZXJDb250ZW50fTwvaT5gO1xuICAgICAgICAgICAgaWNvbnNbaWNvbkluZGV4XSA9IHNhZmVOZXN0ZWRJY29uO1xuICAgICAgICAgICAgcmV0dXJuIGBfX1NBRkVfSUNPTl8ke2ljb25JbmRleCsrfV9fYDtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3Qgc2ltcGxlIGljb24gc3RydWN0dXJlcyBsaWtlIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT5cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBwcm9jZXNzXG4gICAgICogQHBhcmFtIHtBcnJheX0gaWNvbnMgLSBBcnJheSB0byBzdG9yZSBmb3VuZCBpY29uc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydEluZGV4IC0gU3RhcnRpbmcgaW5kZXggZm9yIHBsYWNlaG9sZGVyc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRleHQgd2l0aCBzaW1wbGUgaWNvbnMgcmVwbGFjZWQgYnkgcGxhY2Vob2xkZXJzXG4gICAgICovXG4gICAgX2V4dHJhY3RTaW1wbGVJY29ucyh0ZXh0LCBpY29ucywgc3RhcnRJbmRleCkge1xuICAgICAgICAvLyBQYXR0ZXJuIHRvIG1hdGNoIHNpbXBsZSBpY29uIHRhZ3M6IDxpIGNsYXNzPVwiLi4uXCI+PC9pPlxuICAgICAgICBjb25zdCBzaW1wbGVJY29uUGF0dGVybiA9IC88aVxccytjbGFzcz1cIihbXlwiPD5dKilcIj5cXHMqPFxcL2k+L2dpO1xuICAgICAgICBsZXQgaWNvbkluZGV4ID0gc3RhcnRJbmRleDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2Uoc2ltcGxlSWNvblBhdHRlcm4sIChtYXRjaCwgY2xhc3NOYW1lKSA9PiB7XG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBjbGFzcyBhdHRyaWJ1dGUgY29udGFpbnMgb25seSBzYWZlIGNoYXJhY3RlcnNcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc0NsYXNzTmFtZVNhZmUoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIGljb25zW2ljb25JbmRleF0gPSBtYXRjaDtcbiAgICAgICAgICAgICAgICByZXR1cm4gYF9fU0FGRV9JQ09OXyR7aWNvbkluZGV4Kyt9X19gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgY2xhc3MgaXMgbm90IHNhZmUsIGVzY2FwZSB0aGUgd2hvbGUgdGFnXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQobWF0Y2gpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBpbm5lciBpY29ucyB3aXRoaW4gbmVzdGVkIHN0cnVjdHVyZXNcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbm5lckNvbnRlbnQgLSBJbm5lciBjb250ZW50IHRvIHByb2Nlc3NcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IFNhZmUgaW5uZXIgY29udGVudCBvciBudWxsIGlmIHVuc2FmZVxuICAgICAqL1xuICAgIF9wcm9jZXNzSW5uZXJJY29ucyhpbm5lckNvbnRlbnQpIHtcbiAgICAgICAgLy8gUGF0dGVybiB0byBtYXRjaCBpbm5lciBpY29uc1xuICAgICAgICBjb25zdCBpbm5lckljb25QYXR0ZXJuID0gLzxpXFxzK2NsYXNzPVwiKFteXCI8Pl0qKVwiPlxccyo8XFwvaT4vZ2k7XG4gICAgICAgIGNvbnN0IG1hdGNoZXMgPSBbLi4uaW5uZXJDb250ZW50Lm1hdGNoQWxsKGlubmVySWNvblBhdHRlcm4pXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIGFsbCBpbm5lciBpY29ucyBhcmUgc2FmZVxuICAgICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIG1hdGNoZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IG1hdGNoWzFdO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9pc0NsYXNzTmFtZVNhZmUoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsOyAvLyBVbnNhZmUgaW5uZXIgaWNvbiBmb3VuZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSdzIGFueSBjb250ZW50IG90aGVyIHRoYW4gc2FmZSBpY29ucyBhbmQgd2hpdGVzcGFjZVxuICAgICAgICBjb25zdCBjb250ZW50V2l0aG91dEljb25zID0gaW5uZXJDb250ZW50LnJlcGxhY2UoaW5uZXJJY29uUGF0dGVybiwgJycpLnRyaW0oKTtcbiAgICAgICAgaWYgKGNvbnRlbnRXaXRob3V0SWNvbnMgIT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDsgLy8gQ29udGFpbnMgbm9uLWljb24gY29udGVudFxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaW5uZXJDb250ZW50OyAvLyBBbGwgaW5uZXIgaWNvbnMgYXJlIHNhZmVcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIGlmIGNsYXNzIG5hbWUgY29udGFpbnMgb25seSBzYWZlIGNoYXJhY3RlcnNcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjbGFzc05hbWUgLSBDU1MgY2xhc3MgbmFtZSB0byB2YWxpZGF0ZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGNsYXNzIG5hbWUgaXMgc2FmZVxuICAgICAqL1xuICAgIF9pc0NsYXNzTmFtZVNhZmUoY2xhc3NOYW1lKSB7XG4gICAgICAgIC8vIEFsbG93IG9ubHkgYWxwaGFudW1lcmljIGNoYXJhY3RlcnMsIHNwYWNlcywgaHlwaGVucywgYW5kIHVuZGVyc2NvcmVzXG4gICAgICAgIHJldHVybiAvXlthLXpBLVowLTlcXHNcXC1fXSskLy50ZXN0KGNsYXNzTmFtZSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCBjb250ZW50IHVzaW5nIGpRdWVyeSdzIHNhZmUgbWV0aG9kXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gZXNjYXBlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRXNjYXBlZCBIVE1MXG4gICAgICovXG4gICAgX2VzY2FwZUh0bWxDb250ZW50KHRleHQpIHtcbiAgICAgICAgcmV0dXJuICQoJzxkaXY+JykudGV4dCh0ZXh0KS5odG1sKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhbml0aXplIHdpdGggY29tcHJlaGVuc2l2ZSB3aGl0ZWxpc3QgZm9yIGFsbCBNaWtvUEJYIG9iamVjdCByZXByZXNlbnRhdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBzYW5pdGl6ZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhbml0aXplZCB0ZXh0IHdpdGggcHJlc2VydmVkIHNhZmUgaWNvbnNcbiAgICAgKi9cbiAgICBfc2FuaXRpemVXaXRoV2hpdGVsaXN0KHRleHQpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBDb21wcmVoZW5zaXZlIHdoaXRlbGlzdCBmb3IgYWxsIE1pa29QQlggb2JqZWN0IHR5cGVzXG4gICAgICAgIC8vIFN5bmNocm9uaXplZCB3aXRoIFJlY29yZFJlcHJlc2VudGF0aW9uVHJhaXQucGhwIGljb24gY2xhc3Nlc1xuICAgICAgICBjb25zdCBhbGxvd2VkSWNvbkNsYXNzZXMgPSBbXG4gICAgICAgICAgICAvLyBFeHRlbnNpb24gaWNvbnNcbiAgICAgICAgICAgICdwaG9uZSB2b2x1bWUgaWNvbicsXG4gICAgICAgICAgICAncGhwIGljb24nLFxuICAgICAgICAgICAgJ3NpdGVtYXAgaWNvbicsXG4gICAgICAgICAgICAndXNlcnMgaWNvbicsXG4gICAgICAgICAgICAnY29ncyBpY29uJyxcbiAgICAgICAgICAgICd1c2VyIG91dGxpbmUgaWNvbicsXG4gICAgICAgICAgICAnaWNvbnMnLCAvLyBDb250YWluZXIgZm9yIG11bHRpcGxlIGljb25zXG4gICAgICAgICAgICAndG9wIHJpZ2h0IGNvcm5lciBhbHRlcm5hdGUgbW9iaWxlIGljb24nLFxuXG4gICAgICAgICAgICAvLyBNb2R1bGUgaWNvbnNcbiAgICAgICAgICAgICdwdXp6bGUgcGllY2UgaWNvbicsXG5cbiAgICAgICAgICAgIC8vIEFQSSAmIE1hbmFnZXIgaWNvbnNcbiAgICAgICAgICAgICdrZXkgaWNvbicsXG4gICAgICAgICAgICAnYXN0ZXJpc2sgaWNvbicsXG5cbiAgICAgICAgICAgIC8vIEZpbGUgaWNvbnNcbiAgICAgICAgICAgICdmaWxlIGljb24nLFxuXG4gICAgICAgICAgICAvLyBSb3V0aW5nIGljb25zXG4gICAgICAgICAgICAnbWFwIHNpZ25zIGljb24nLFxuICAgICAgICAgICAgJ3JhbmRvbSBpY29uJyxcblxuICAgICAgICAgICAgLy8gU2NoZWR1bGUvdGltZSBpY29uc1xuICAgICAgICAgICAgJ3RpbWUgaWNvbicsXG4gICAgICAgICAgICAnaWNvbiBvdXRsaW5lIGNhbGVuZGFyIGFsdGVybmF0ZScsXG4gICAgICAgICAgICAnaWNvbiBvdXRsaW5lIGNhbGVuZGFyIG1pbnVzJyxcbiAgICAgICAgICAgICdpY29uIGNsb2NrIG91dGxpbmUnLFxuXG4gICAgICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciBpY29uc1xuICAgICAgICAgICAgJ2dsb2JlIGljb24nLFxuICAgICAgICAgICAgJ2hvbWUgaWNvbicsXG4gICAgICAgICAgICAnc2hpZWxkIGFsdGVybmF0ZSBpY29uJyxcbiAgICAgICAgICAgICdiYW4gaWNvbicsXG5cbiAgICAgICAgICAgIC8vIFNvdW5kIGZpbGUgaWNvbnNcbiAgICAgICAgICAgICdtdXNpYyBpY29uJyxcbiAgICAgICAgICAgICdmaWxlIGF1ZGlvIGljb24nLFxuICAgICAgICAgICAgJ2ZpbGUgYXVkaW8gb3V0bGluZSBpY29uJyxcbiAgICAgICAgICAgICdzb3VuZCBpY29uJyxcblxuICAgICAgICAgICAgLy8gQ2FsbCBxdWV1ZSBpY29uc1xuICAgICAgICAgICAgJ2NhbGwgaWNvbicsXG4gICAgICAgICAgICAncGhvbmUgaWNvbicsXG4gICAgICAgICAgICAnaGVhZHBob25lcyBpY29uJyxcblxuICAgICAgICAgICAgLy8gUHJvdmlkZXIgaWNvbnNcbiAgICAgICAgICAgICdzZXJ2ZXIgaWNvbicsXG4gICAgICAgICAgICAnY2xvdWQgaWNvbicsXG4gICAgICAgICAgICAncGx1ZyBpY29uJyxcblxuICAgICAgICAgICAgLy8gU3lzdGVtIGljb25zXG4gICAgICAgICAgICAnc2V0dGluZ3MgaWNvbicsXG4gICAgICAgICAgICAnd3JlbmNoIGljb24nLFxuICAgICAgICAgICAgJ3Rvb2wgaWNvbidcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBhcnNlIEhUTUwgc2FmZWx5XG4gICAgICAgIGNvbnN0IHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgdGVtcERpdi5pbm5lckhUTUwgPSB0ZXh0O1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgYWxsIDxpPiB0YWdzXG4gICAgICAgIGNvbnN0IGlUYWdzID0gdGVtcERpdi5xdWVyeVNlbGVjdG9yQWxsKCdpJyk7XG4gICAgICAgIGxldCBpc1NhZmUgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgaVRhZ3MuZm9yRWFjaCh0YWcgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gdGFnLmNsYXNzTmFtZTtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNsYXNzIGlzIGluIHdoaXRlbGlzdCBvciBpcyBhIEZvbWFudGljIFVJIGZsYWdcbiAgICAgICAgICAgIGNvbnN0IGlzRmxhZ0ljb24gPSAvXmZsYWdcXHMrW1xcd1xcc10rJC8udGVzdChjbGFzc05hbWUudHJpbSgpKTtcbiAgICAgICAgICAgIGlmICghYWxsb3dlZEljb25DbGFzc2VzLmluY2x1ZGVzKGNsYXNzTmFtZSkgJiYgIWlzRmxhZ0ljb24pIHtcbiAgICAgICAgICAgICAgICBpc1NhZmUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBhbGwgaWNvbnMgYXJlIHNhZmUsIHJldHVybiB0aGUgb3JpZ2luYWwgdGV4dFxuICAgICAgICBpZiAoaXNTYWZlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGV4dDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgYW55IHVuc2FmZSBpY29uIGZvdW5kLCBlc2NhcGUgYWxsIEhUTUxcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KHRleHQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgdGV4dCBmb3IgdXNlIGluIEhUTUwgYXR0cmlidXRlc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBzYW5pdGl6ZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhbml0aXplZCB0ZXh0IHNhZmUgZm9yIGF0dHJpYnV0ZXNcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUoJ3ZhbHVlXCJvbmNsaWNrPVwiYWxlcnQoMSknKVxuICAgICAqIC8vIFJldHVybnM6ICd2YWx1ZSZxdW90O29uY2xpY2s9JnF1b3Q7YWxlcnQoMSknXG4gICAgICovXG4gICAgc2FuaXRpemVBdHRyaWJ1dGUodGV4dCkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiAnJztcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KHRleHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFc2NhcGUgZXZlcnkgc3RyaW5nIHZhbHVlIG9mIGEgcGxhY2Vob2xkZXIgbWFwIGJlZm9yZSBpdCBpcyBzdWJzdGl0dXRlZCBpbnRvIGFuXG4gICAgICogSFRNTCB0cmFuc2xhdGlvbiB0ZW1wbGF0ZSwgZS5nLiBpMThuKG1lc3NhZ2VUcGwsIG1lc3NhZ2VQYXJhbXMpIGZvciBhZHZpY2UgbWVzc2FnZXMuXG4gICAgICogUXVvdGVzIGFyZSBlc2NhcGVkIGFzIHdlbGwgYmVjYXVzZSBwbGFjZWhvbGRlcnMgc3VjaCBhcyAldXJsJSBzaXQgaW5zaWRlIGF0dHJpYnV0ZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdHxudWxsfSBwYXJhbXMgLSBQbGFjZWhvbGRlciB2YWx1ZXNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fG51bGx9IENvcHkgb2YgcGFyYW1zIHdpdGggSFRNTC1lc2NhcGVkIHN0cmluZyB2YWx1ZXNcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogU2VjdXJpdHlVdGlscy5lc2NhcGVUZW1wbGF0ZVBhcmFtcyh7cmVjb3JkOiAnPGltZyBzcmM9eCBvbmVycm9yPWFsZXJ0KDEpPiA8MjAxPid9KVxuICAgICAqIC8vIFJldHVybnM6IHtyZWNvcmQ6ICcmbHQ7aW1nIHNyYz14IG9uZXJyb3I9YWxlcnQoMSkmZ3Q7ICZsdDsyMDEmZ3Q7J31cbiAgICAgKi9cbiAgICBlc2NhcGVUZW1wbGF0ZVBhcmFtcyhwYXJhbXMpIHtcbiAgICAgICAgaWYgKHBhcmFtcyA9PT0gbnVsbCB8fCB0eXBlb2YgcGFyYW1zICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlc2NhcGVkID0ge307XG4gICAgICAgIE9iamVjdC5rZXlzKHBhcmFtcykuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHBhcmFtc1trZXldO1xuICAgICAgICAgICAgZXNjYXBlZFtrZXldID0gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgID8gdmFsdWUucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCAnJiMzOTsnKVxuICAgICAgICAgICAgICAgIDogdmFsdWU7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZXNjYXBlZDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgdGV4dCBmb3IgZGlzcGxheSB3aXRoIGNvbmZpZ3VyYWJsZSBzdHJpY3RuZXNzXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIHNhbml0aXplXG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdHJpY3RNb2RlIC0gSWYgdHJ1ZSwgdXNlcyBzdHJpY3QgdmFsaWRhdGlvbiBmb3IgdXNlciBpbnB1dC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJZiBmYWxzZSwgdXNlcyBsZXNzIHN0cmljdCB2YWxpZGF0aW9uIGZvciB0cnVzdGVkIEFQSSBjb250ZW50LlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhbml0aXplZCB0ZXh0XG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBTdHJpY3QgbW9kZSBmb3IgdXNlciBpbnB1dFxuICAgICAqIFNlY3VyaXR5VXRpbHMuc2FuaXRpemVGb3JEaXNwbGF5KCdVc2VyIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4nLCB0cnVlKVxuICAgICAqIFxuICAgICAqIEBleGFtcGxlICBcbiAgICAgKiAvLyBMZXNzIHN0cmljdCBmb3IgQVBJIGNvbnRlbnRcbiAgICAgKiBTZWN1cml0eVV0aWxzLnNhbml0aXplRm9yRGlzcGxheSgnPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPiBVc2VyIE5hbWUnLCBmYWxzZSlcbiAgICAgKi9cbiAgICBzYW5pdGl6ZUZvckRpc3BsYXkodGV4dCwgc3RyaWN0TW9kZSA9IHRydWUpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgY2hlY2sgZm9yIGRhbmdlcm91cyBwYXR0ZXJucyBmaXJzdFxuICAgICAgICBpZiAodGhpcy5jb250YWluc0Rhbmdlcm91c1BhdHRlcm5zKHRleHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQodGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChzdHJpY3RNb2RlKSB7XG4gICAgICAgICAgICAvLyBTdHJpY3QgdmFsaWRhdGlvbjogb25seSBhbGxvdyBjb21wbGV0ZWx5IHNhZmUgY29udGVudFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNTYWZlRm9yRHJvcGRvd24odGV4dCkgPyBcbiAgICAgICAgICAgICAgICB0aGlzLmVzY2FwZUh0bWwodGV4dCwgdHJ1ZSkgOiBcbiAgICAgICAgICAgICAgICB0aGlzLl9lc2NhcGVIdG1sQ29udGVudCh0ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExlc3Mgc3RyaWN0OiBhbGxvdyBzYWZlIGljb25zIGZyb20gdHJ1c3RlZCBzb3VyY2VzXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lc2NhcGVIdG1sKHRleHQsIHRydWUpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhbml0aXplIHRleHQgZm9yIGRyb3Bkb3duIGRpc3BsYXkgKHN0cmljdCBtb2RlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBzYW5pdGl6ZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhbml0aXplZCB0ZXh0XG4gICAgICovXG4gICAgc2FuaXRpemVGb3JEcm9wZG93bih0ZXh0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNhbml0aXplRm9yRGlzcGxheSh0ZXh0LCB0cnVlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgb2JqZWN0IHJlcHJlc2VudGF0aW9ucyB3aXRoIGVuaGFuY2VkIFhTUyBwcm90ZWN0aW9uIHdoaWxlIHByZXNlcnZpbmcgc2FmZSBpY29uc1xuICAgICAqIFxuICAgICAqIFVuaXZlcnNhbCBtZXRob2QgZm9yIHNhbml0aXppbmcgYWxsIG9iamVjdCByZXByZXNlbnRhdGlvbiBkYXRhIGZyb20gUkVTVCBBUEkuXG4gICAgICogSGFuZGxlcyBFeHRlbnNpb25zLCBOZXR3b3JrRmlsdGVycywgU291bmRGaWxlcywgQ2FsbFF1ZXVlcywgYW5kIG90aGVyIE1pa29QQlggb2JqZWN0cy5cbiAgICAgKiBVc2VzIGNvbXByZWhlbnNpdmUgd2hpdGVsaXN0IGFwcHJvYWNoIGZvciBtYXhpbXVtIHNlY3VyaXR5IHdpdGggcHJvcGVyIGZ1bmN0aW9uYWxpdHkuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIHNhbml0aXplXG4gICAgICogQHJldHVybnMge3N0cmluZ30gU2FuaXRpemVkIHRleHQgd2l0aCBwcmVzZXJ2ZWQgc2FmZSBpY29uc1xuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gU2FmZSBpY29ucyBhcmUgcHJlc2VydmVkIChFeHRlbnNpb25zKVxuICAgICAqIFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoJzxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4gSm9obiBEb2UnKVxuICAgICAqIC8vIFJldHVybnM6ICc8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+IEpvaG4gRG9lJ1xuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gU2FmZSBpY29ucyBhcmUgcHJlc2VydmVkIChOZXR3b3JrRmlsdGVycylcbiAgICAgKiBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKCc8aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+IEFueSBOZXR3b3JrJylcbiAgICAgKiAvLyBSZXR1cm5zOiAnPGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPiBBbnkgTmV0d29yaydcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFhTUyBhdHRhY2tzIGFyZSBibG9ja2VkXG4gICAgICogU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucygnPHNjcmlwdD5hbGVydChcIlhTU1wiKTwvc2NyaXB0PicpXG4gICAgICogLy8gUmV0dXJuczogJyZsdDtzY3JpcHQmZ3Q7YWxlcnQoJnF1b3Q7WFNTJnF1b3Q7KSZsdDsvc2NyaXB0Jmd0OydcbiAgICAgKi9cbiAgICBzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyh0ZXh0KSB7XG4gICAgICAgIGlmICghdGV4dCkgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5oYW5jZWQgZGFuZ2Vyb3VzIHBhdHRlcm5zIHNwZWNpZmljYWxseSBmb3IgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICBjb25zdCBkYW5nZXJvdXNQYXR0ZXJucyA9IFtcbiAgICAgICAgICAgIC88c2NyaXB0W1xcc1xcU10qPzxcXC9zY3JpcHQ+L2dpLFxuICAgICAgICAgICAgLzxpZnJhbWVbXFxzXFxTXSo/PFxcL2lmcmFtZT4vZ2ksXG4gICAgICAgICAgICAvPG9iamVjdFtcXHNcXFNdKj88XFwvb2JqZWN0Pi9naSxcbiAgICAgICAgICAgIC88ZW1iZWRbXFxzXFxTXSo/Pi9naSxcbiAgICAgICAgICAgIC88Zm9ybVtcXHNcXFNdKj88XFwvZm9ybT4vZ2ksXG4gICAgICAgICAgICAvPGltZ1tcXHNcXFNdKj8+L2dpLFxuICAgICAgICAgICAgLzxzdmdbXFxzXFxTXSo/PFxcL3N2Zz4vZ2ksXG4gICAgICAgICAgICAvPGxpbmtbXFxzXFxTXSo/Pi9naSxcbiAgICAgICAgICAgIC88bWV0YVtcXHNcXFNdKj8+L2dpLFxuICAgICAgICAgICAgLzxzdHlsZVtcXHNcXFNdKj88XFwvc3R5bGU+L2dpLFxuICAgICAgICAgICAgL2phdmFzY3JpcHQ6L2dpLFxuICAgICAgICAgICAgL2RhdGE6dGV4dFxcL2h0bWwvZ2ksXG4gICAgICAgICAgICAvb25cXHcrXFxzKj0vZ2ksIC8vIEV2ZW50IGhhbmRsZXJzIGxpa2Ugb25jbGljaywgb25sb2FkLCBldGMuXG4gICAgICAgICAgICAvZXhwcmVzc2lvblxccypcXCgvZ2ksIC8vIENTUyBleHByZXNzaW9uc1xuICAgICAgICAgICAgL3VybFxccypcXChcXHMqamF2YXNjcmlwdDovZ2ksXG4gICAgICAgICAgICAvLyBBZGRpdGlvbmFsIHBhdHRlcm5zIHRvIGNhdGNoIHZhcmlvdXMgWFNTIGF0dGVtcHRzXG4gICAgICAgICAgICAvPHNjcmlwdFxcYi9naSwgLy8gU2NyaXB0IHRhZ3MgKGV2ZW4gd2l0aG91dCBjbG9zaW5nKVxuICAgICAgICAgICAgL2FsZXJ0XFxzKlxcKC9naSwgLy8gQWxlcnQgZnVuY3Rpb24gY2FsbHNcbiAgICAgICAgICAgIC9vbmVycm9yXFxzKj0vZ2ksIC8vIFNwZWNpZmljIG9uZXJyb3IgaGFuZGxlclxuICAgICAgICAgICAgL3NyY1xccyo9XFxzKnhcXGIvZ2ksIC8vIENvbW1vbiBYU1MgcGF0dGVybiBzcmM9eCBcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGFueSBkYW5nZXJvdXMgcGF0dGVybiBpcyBmb3VuZCwgZXNjYXBlIGFsbCBIVE1MXG4gICAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBkYW5nZXJvdXNQYXR0ZXJucykge1xuICAgICAgICAgICAgaWYgKHBhdHRlcm4udGVzdCh0ZXh0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9lc2NhcGVIdG1sQ29udGVudCh0ZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gZGFuZ2Vyb3VzIHBhdHRlcm5zIGZvdW5kLCB1c2Ugd2hpdGVsaXN0IHZhbGlkYXRpb24gZm9yIHNhZmUgaWNvbnNcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Nhbml0aXplV2l0aFdoaXRlbGlzdCh0ZXh0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTGVnYWN5IGFsaWFzIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGluc3RlYWRcbiAgICAgKi9cbiAgICBzYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KHRleHQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnModGV4dCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBzYWZlIG9wdGlvbiBlbGVtZW50IGZvciBkcm9wZG93bnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBPcHRpb24gdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIE9wdGlvbiBkaXNwbGF5IHRleHRcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN0cmljdE1vZGUgLSBXaGV0aGVyIHRvIHVzZSBzdHJpY3QgZmlsdGVyaW5nIChkZWZhdWx0OiB0cnVlKVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhZmUgb3B0aW9uIEhUTUxcbiAgICAgKi9cbiAgICBjcmVhdGVTYWZlT3B0aW9uKHZhbHVlLCB0ZXh0LCBzdHJpY3RNb2RlID0gdHJ1ZSkge1xuICAgICAgICBjb25zdCBzYWZlVmFsdWUgPSB0aGlzLnNhbml0aXplQXR0cmlidXRlKHZhbHVlKTtcbiAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0aGlzLnNhbml0aXplRm9yRGlzcGxheSh0ZXh0LCBzdHJpY3RNb2RlKTtcbiAgICAgICAgcmV0dXJuIGA8b3B0aW9uIHZhbHVlPVwiJHtzYWZlVmFsdWV9XCI+JHtzYWZlVGV4dH08L29wdGlvbj5gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2FmZWx5IHNldCBIVE1MIGNvbnRlbnQgb2YgZWxlbWVudFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fEhUTUxFbGVtZW50fSBlbGVtZW50IC0gVGFyZ2V0IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGVudCAtIENvbnRlbnQgdG8gc2V0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdHJpY3RNb2RlIC0gV2hldGhlciB0byB1c2Ugc3RyaWN0IGZpbHRlcmluZyAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKi9cbiAgICBzZXRIdG1sQ29udGVudChlbGVtZW50LCBjb250ZW50LCBzdHJpY3RNb2RlID0gdHJ1ZSkge1xuICAgICAgICBjb25zdCAkZWxlbWVudCA9ICQoZWxlbWVudCk7XG4gICAgICAgIGNvbnN0IHNhZmVDb250ZW50ID0gdGhpcy5zYW5pdGl6ZUZvckRpc3BsYXkoY29udGVudCwgc3RyaWN0TW9kZSk7XG4gICAgICAgICRlbGVtZW50Lmh0bWwoc2FmZUNvbnRlbnQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgaWYgc3RyaW5nIGNvbnRhaW5zIHBvdGVudGlhbGx5IGRhbmdlcm91cyBwYXR0ZXJuc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byB2YWxpZGF0ZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRleHQgY29udGFpbnMgZGFuZ2Vyb3VzIHBhdHRlcm5zXG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBTZWN1cml0eVV0aWxzLmNvbnRhaW5zRGFuZ2Vyb3VzUGF0dGVybnMoJzxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD4nKVxuICAgICAqIC8vIFJldHVybnM6IHRydWVcbiAgICAgKi9cbiAgICBjb250YWluc0Rhbmdlcm91c1BhdHRlcm5zKHRleHQpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkYW5nZXJvdXNQYXR0ZXJucyA9IFtcbiAgICAgICAgICAgIC88c2NyaXB0W1xcc1xcU10qPzxcXC9zY3JpcHQ+L2dpLFxuICAgICAgICAgICAgLzxpZnJhbWVbXFxzXFxTXSo/PFxcL2lmcmFtZT4vZ2ksXG4gICAgICAgICAgICAvPG9iamVjdFtcXHNcXFNdKj88XFwvb2JqZWN0Pi9naSxcbiAgICAgICAgICAgIC88ZW1iZWRbXFxzXFxTXSo/Pi9naSxcbiAgICAgICAgICAgIC88Zm9ybVtcXHNcXFNdKj88XFwvZm9ybT4vZ2ksXG4gICAgICAgICAgICAvamF2YXNjcmlwdDovZ2ksXG4gICAgICAgICAgICAvZGF0YTp0ZXh0XFwvaHRtbC9naSxcbiAgICAgICAgICAgIC9vblxcdytcXHMqPS9naSwgLy8gRXZlbnQgaGFuZGxlcnMgbGlrZSBvbmNsaWNrLCBvbmxvYWQsIGV0Yy5cbiAgICAgICAgICAgIC88aW1nW14+XStvbmVycm9yL2dpLFxuICAgICAgICAgICAgLzxzdmdbXj5dKm9ubG9hZC9naSxcbiAgICAgICAgICAgIC88c3R5bGVbXFxzXFxTXSo/PFxcL3N0eWxlPi9naSxcbiAgICAgICAgICAgIC88bGlua1tcXHNcXFNdKj8+L2dpLFxuICAgICAgICAgICAgLzxtZXRhW1xcc1xcU10qPz4vZ2ksXG4gICAgICAgICAgICAvZXhwcmVzc2lvblxccypcXCgvZ2ksIC8vIENTUyBleHByZXNzaW9uc1xuICAgICAgICAgICAgL3VybFxccypcXChcXHMqamF2YXNjcmlwdDovZ2ksXG4gICAgICAgICAgICAvPFxcLz9cXHcrW14+XSpcXHMrc3JjXFxzKj0vZ2ksIC8vIFRhZ3Mgd2l0aCBzcmMgYXR0cmlidXRlIChleGNlcHQgYWxsb3dlZClcbiAgICAgICAgICAgIC88XFwvP1xcdytbXj5dKlxccytocmVmXFxzKj0vZ2ksIC8vIFRhZ3Mgd2l0aCBocmVmIGF0dHJpYnV0ZSAoZXhjZXB0IGFsbG93ZWQpXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGFuZ2Vyb3VzUGF0dGVybnMuc29tZShwYXR0ZXJuID0+IHBhdHRlcm4udGVzdCh0ZXh0KSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIGlmIHRleHQgY29udGFpbnMgb25seSBzYWZlIGljb24gc3RydWN0dXJlcyBhbmQgcmVndWxhciB0ZXh0XG4gICAgICogXG4gICAgICogVGhpcyBtZXRob2QgZW5zdXJlcyB0aGF0IHRoZSB0ZXh0IGNvbnRhaW5zIG9ubHk6XG4gICAgICogLSBQbGFpbiB0ZXh0IGNvbnRlbnRcbiAgICAgKiAtIFNhZmUgc2ltcGxlIGljb25zOiA8aSBjbGFzcz1cIi4uLlwiPjwvaT4gIFxuICAgICAqIC0gU2FmZSBuZXN0ZWQgaWNvbnM6IDxpIGNsYXNzPVwiaWNvbnNcIj4uLi48L2k+XG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIHZhbGlkYXRlXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGV4dCBpcyBzYWZlIGZvciBkcm9wZG93biBkaXNwbGF5XG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBTZWN1cml0eVV0aWxzLmlzU2FmZUZvckRyb3Bkb3duKCdVc2VyIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4nKVxuICAgICAqIC8vIFJldHVybnM6IHRydWVcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIFNlY3VyaXR5VXRpbHMuaXNTYWZlRm9yRHJvcGRvd24oJ1VzZXIgPHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0PicpXG4gICAgICogLy8gUmV0dXJuczogZmFsc2VcbiAgICAgKi9cbiAgICBpc1NhZmVGb3JEcm9wZG93bih0ZXh0KSB7XG4gICAgICAgIGlmICghdGV4dCkgcmV0dXJuIHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgZGFuZ2Vyb3VzIHBhdHRlcm5zIGZpcnN0XG4gICAgICAgIGlmICh0aGlzLmNvbnRhaW5zRGFuZ2Vyb3VzUGF0dGVybnModGV4dCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGFsbCBzYWZlIGljb24gc3RydWN0dXJlcyBhbmQgY2hlY2sgaWYgcmVtYWluaW5nIGNvbnRlbnQgaXMgc2FmZVxuICAgICAgICBjb25zdCB0ZW1wVGV4dCA9IHRoaXMuX3JlbW92ZVNhZmVJY29ucyh0ZXh0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFmdGVyIHJlbW92aW5nIHNhZmUgaWNvbnMsIHRoZXJlIHNob3VsZCBvbmx5IGJlIHBsYWluIHRleHRcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGFueSByZW1haW5pbmcgSFRNTCB0YWdzXG4gICAgICAgIGNvbnN0IGhhc1Vuc2FmZVRhZ3MgPSAvPFtePl0rPi9nLnRlc3QodGVtcFRleHQpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuICFoYXNVbnNhZmVUYWdzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgYWxsIHNhZmUgaWNvbiBzdHJ1Y3R1cmVzIGZyb20gdGV4dFxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIHByb2Nlc3NcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUZXh0IHdpdGggc2FmZSBpY29ucyByZW1vdmVkXG4gICAgICovXG4gICAgX3JlbW92ZVNhZmVJY29ucyh0ZXh0KSB7XG4gICAgICAgIC8vIEZpcnN0IHJlbW92ZSBuZXN0ZWQgaWNvbnNcbiAgICAgICAgbGV0IGNsZWFuVGV4dCA9IHRleHQucmVwbGFjZSgvPGlcXHMrY2xhc3M9XCIoW15cIjw+XSppY29uc1teXCI8Pl0qKVwiPihbXFxzXFxTXSo/KTxcXC9pPi9naSwgKG1hdGNoLCBvdXRlckNsYXNzTmFtZSwgaW5uZXJDb250ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5faXNDbGFzc05hbWVTYWZlKG91dGVyQ2xhc3NOYW1lKSAmJiB0aGlzLl9wcm9jZXNzSW5uZXJJY29ucyhpbm5lckNvbnRlbnQpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnOyAvLyBSZW1vdmUgc2FmZSBuZXN0ZWQgaWNvblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1hdGNoOyAvLyBLZWVwIHVuc2FmZSBpY29uIGZvciBmdXJ0aGVyIHZhbGlkYXRpb25cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBUaGVuIHJlbW92ZSBzaW1wbGUgaWNvbnNcbiAgICAgICAgY2xlYW5UZXh0ID0gY2xlYW5UZXh0LnJlcGxhY2UoLzxpXFxzK2NsYXNzPVwiKFteXCI8Pl0qKVwiPlxccyo8XFwvaT4vZ2ksIChtYXRjaCwgY2xhc3NOYW1lKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5faXNDbGFzc05hbWVTYWZlKGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7IC8vIFJlbW92ZSBzYWZlIHNpbXBsZSBpY29uXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2g7IC8vIEtlZXAgdW5zYWZlIGljb24gZm9yIGZ1cnRoZXIgdmFsaWRhdGlvblxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjbGVhblRleHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc3RhdGlzdGljcyBhYm91dCBzYWZlIGljb24gcHJvY2Vzc2luZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBhbmFseXplXG4gICAgICogQHJldHVybnMge09iamVjdH0gU3RhdGlzdGljcyBvYmplY3RcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIFNlY3VyaXR5VXRpbHMuZ2V0UHJvY2Vzc2luZ1N0YXRzKCdUZXh0IDxpIGNsYXNzPVwiaWNvblwiPjwvaT4gPHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0PicpXG4gICAgICogLy8gUmV0dXJuczogeyBzYWZlU2ltcGxlSWNvbnM6IDEsIHNhZmVOZXN0ZWRJY29uczogMCwgZGFuZ2Vyb3VzUGF0dGVybnM6IDEsIGlzU2FmZUZvckRyb3Bkb3duOiBmYWxzZSwgdG90YWxMZW5ndGg6IDU0IH1cbiAgICAgKi9cbiAgICBnZXRQcm9jZXNzaW5nU3RhdHModGV4dCkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiB7IFxuICAgICAgICAgICAgc2FmZVNpbXBsZUljb25zOiAwLCBcbiAgICAgICAgICAgIHNhZmVOZXN0ZWRJY29uczogMCwgXG4gICAgICAgICAgICBkYW5nZXJvdXNQYXR0ZXJuczogMCwgXG4gICAgICAgICAgICBpc1NhZmVGb3JEcm9wZG93bjogdHJ1ZSxcbiAgICAgICAgICAgIHRvdGFsTGVuZ3RoOiAwIFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ291bnQgc2FmZSBzaW1wbGUgaWNvbnNcbiAgICAgICAgY29uc3Qgc2ltcGxlSWNvblBhdHRlcm4gPSAvPGlcXHMrY2xhc3M9XCIoW15cIjw+XSopXCI+XFxzKjxcXC9pPi9naTtcbiAgICAgICAgY29uc3Qgc2ltcGxlTWF0Y2hlcyA9IFsuLi50ZXh0Lm1hdGNoQWxsKHNpbXBsZUljb25QYXR0ZXJuKV07XG4gICAgICAgIGNvbnN0IHNhZmVTaW1wbGVJY29ucyA9IHNpbXBsZU1hdGNoZXMuZmlsdGVyKG1hdGNoID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IG1hdGNoWzFdO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzQ2xhc3NOYW1lU2FmZShjbGFzc05hbWUpO1xuICAgICAgICB9KS5sZW5ndGg7XG4gICAgICAgIFxuICAgICAgICAvLyBDb3VudCBzYWZlIG5lc3RlZCBpY29uc1xuICAgICAgICBjb25zdCBuZXN0ZWRJY29uUGF0dGVybiA9IC88aVxccytjbGFzcz1cIihbXlwiPD5dKmljb25zW15cIjw+XSopXCI+KFtcXHNcXFNdKj8pPFxcL2k+L2dpO1xuICAgICAgICBjb25zdCBuZXN0ZWRNYXRjaGVzID0gWy4uLnRleHQubWF0Y2hBbGwobmVzdGVkSWNvblBhdHRlcm4pXTtcbiAgICAgICAgY29uc3Qgc2FmZU5lc3RlZEljb25zID0gbmVzdGVkTWF0Y2hlcy5maWx0ZXIobWF0Y2ggPT4ge1xuICAgICAgICAgICAgY29uc3Qgb3V0ZXJDbGFzc05hbWUgPSBtYXRjaFsxXTtcbiAgICAgICAgICAgIGNvbnN0IGlubmVyQ29udGVudCA9IG1hdGNoWzJdO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzQ2xhc3NOYW1lU2FmZShvdXRlckNsYXNzTmFtZSkgJiYgdGhpcy5fcHJvY2Vzc0lubmVySWNvbnMoaW5uZXJDb250ZW50KSAhPT0gbnVsbDtcbiAgICAgICAgfSkubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGFuZ2Vyb3VzUGF0dGVybnMgPSB0aGlzLmNvbnRhaW5zRGFuZ2Vyb3VzUGF0dGVybnModGV4dCkgPyAxIDogMDtcbiAgICAgICAgY29uc3QgaXNTYWZlRm9yRHJvcGRvd24gPSB0aGlzLmlzU2FmZUZvckRyb3Bkb3duKHRleHQpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNhZmVTaW1wbGVJY29ucyxcbiAgICAgICAgICAgIHNhZmVOZXN0ZWRJY29ucyxcbiAgICAgICAgICAgIGRhbmdlcm91c1BhdHRlcm5zLFxuICAgICAgICAgICAgaXNTYWZlRm9yRHJvcGRvd24sXG4gICAgICAgICAgICB0b3RhbExlbmd0aDogdGV4dC5sZW5ndGhcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlYnVnIG1vZGUgZmxhZyBmb3IgZGV2ZWxvcG1lbnRcbiAgICAgKi9cbiAgICBkZWJ1ZzogZmFsc2UsXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9nIHNlY3VyaXR5IHByb2Nlc3NpbmcgaW5mb3JtYXRpb24gKG9ubHkgaW4gZGVidWcgbW9kZSlcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gRGVidWcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSB7Kn0gZGF0YSAtIEFkZGl0aW9uYWwgZGF0YSB0byBsb2dcbiAgICAgKi9cbiAgICBfZGVidWdMb2cobWVzc2FnZSwgZGF0YSA9IG51bGwpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVidWcgJiYgY29uc29sZSAmJiBjb25zb2xlLmxvZykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTZWN1cml0eVV0aWxzXSAke21lc3NhZ2V9YCwgZGF0YSB8fCAnJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIExlZ2FjeSBjb21wYXRpYmlsaXR5IC0gcHJvdmlkZSBvbGQgZnVuY3Rpb24gbmFtZXNcbiAqIEBkZXByZWNhdGVkIFVzZSBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwgaW5zdGVhZFxuICovXG53aW5kb3cuZXNjYXBlSHRtbFNhZmUgPSBmdW5jdGlvbih0ZXh0LCBhbGxvd0ljb25zID0gZmFsc2UpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tTZWN1cml0eVV0aWxzXSBlc2NhcGVIdG1sU2FmZSBpcyBkZXByZWNhdGVkLiBVc2UgU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sIGluc3RlYWQuJyk7XG4gICAgcmV0dXJuIHdpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwodGV4dCwgYWxsb3dJY29ucyk7XG59O1xuXG4vLyBJbml0aWFsaXplIGRlYnVnIG1vZGUgYmFzZWQgb24gZW52aXJvbm1lbnRcbmlmICh0eXBlb2YgZ2xvYmFsRGVidWdNb2RlICE9PSAndW5kZWZpbmVkJyAmJiBnbG9iYWxEZWJ1Z01vZGUpIHtcbiAgICB3aW5kb3cuU2VjdXJpdHlVdGlscy5kZWJ1ZyA9IHRydWU7XG59XG5cbi8vIExvZyBpbml0aWFsaXphdGlvbiBpbiBkZWJ1ZyBtb2RlXG53aW5kb3cuU2VjdXJpdHlVdGlscy5fZGVidWdMb2coJ1NlY3VyaXR5VXRpbHMgaW5pdGlhbGl6ZWQnLCB7XG4gICAgdmVyc2lvbjogd2luZG93LlNlY3VyaXR5VXRpbHMudmVyc2lvbixcbiAgICBkZWJ1Zzogd2luZG93LlNlY3VyaXR5VXRpbHMuZGVidWdcbn0pOyJdfQ==