"use strict";

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

    var allowedIconClasses = [// Extension icons
    'phone volume icon', 'php icon', 'sitemap icon', 'users icon', 'cogs icon', 'user outline icon', 'icons', // Container for multiple icons
    'top right corner alternate mobile icon', // Network filter icons
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3NlY3VyaXR5LXV0aWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIlNlY3VyaXR5VXRpbHMiLCJ2ZXJzaW9uIiwiZXNjYXBlSHRtbCIsInRleHQiLCJhbGxvd0ljb25zIiwiX3Byb2Nlc3NXaXRoU2FmZUljb25zIiwiX2VzY2FwZUh0bWxDb250ZW50IiwiaWNvbnMiLCJpY29uSW5kZXgiLCJ0ZXh0V2l0aE5lc3RlZFBsYWNlaG9sZGVycyIsIl9leHRyYWN0TmVzdGVkSWNvbnMiLCJsZW5ndGgiLCJ0ZXh0V2l0aEFsbFBsYWNlaG9sZGVycyIsIl9leHRyYWN0U2ltcGxlSWNvbnMiLCJlc2NhcGVkIiwicmVwbGFjZSIsIm1hdGNoIiwiaW5kZXgiLCJzdGFydEluZGV4IiwibmVzdGVkSWNvblBhdHRlcm4iLCJvdXRlckNsYXNzTmFtZSIsImlubmVyQ29udGVudCIsIl9pc0NsYXNzTmFtZVNhZmUiLCJzYWZlSW5uZXJDb250ZW50IiwiX3Byb2Nlc3NJbm5lckljb25zIiwic2FmZU5lc3RlZEljb24iLCJzaW1wbGVJY29uUGF0dGVybiIsImNsYXNzTmFtZSIsImlubmVySWNvblBhdHRlcm4iLCJtYXRjaGVzIiwibWF0Y2hBbGwiLCJjb250ZW50V2l0aG91dEljb25zIiwidHJpbSIsInRlc3QiLCIkIiwiaHRtbCIsIl9zYW5pdGl6ZVdpdGhXaGl0ZWxpc3QiLCJhbGxvd2VkSWNvbkNsYXNzZXMiLCJ0ZW1wRGl2IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiaW5uZXJIVE1MIiwiaVRhZ3MiLCJxdWVyeVNlbGVjdG9yQWxsIiwiaXNTYWZlIiwiZm9yRWFjaCIsInRhZyIsImlzRmxhZ0ljb24iLCJpbmNsdWRlcyIsInNhbml0aXplQXR0cmlidXRlIiwic2FuaXRpemVGb3JEaXNwbGF5Iiwic3RyaWN0TW9kZSIsImNvbnRhaW5zRGFuZ2Vyb3VzUGF0dGVybnMiLCJpc1NhZmVGb3JEcm9wZG93biIsInNhbml0aXplRm9yRHJvcGRvd24iLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImRhbmdlcm91c1BhdHRlcm5zIiwicGF0dGVybiIsInNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQiLCJjcmVhdGVTYWZlT3B0aW9uIiwidmFsdWUiLCJzYWZlVmFsdWUiLCJzYWZlVGV4dCIsInNldEh0bWxDb250ZW50IiwiZWxlbWVudCIsImNvbnRlbnQiLCIkZWxlbWVudCIsInNhZmVDb250ZW50Iiwic29tZSIsInRlbXBUZXh0IiwiX3JlbW92ZVNhZmVJY29ucyIsImhhc1Vuc2FmZVRhZ3MiLCJjbGVhblRleHQiLCJnZXRQcm9jZXNzaW5nU3RhdHMiLCJzYWZlU2ltcGxlSWNvbnMiLCJzYWZlTmVzdGVkSWNvbnMiLCJ0b3RhbExlbmd0aCIsInNpbXBsZU1hdGNoZXMiLCJmaWx0ZXIiLCJuZXN0ZWRNYXRjaGVzIiwiZGVidWciLCJfZGVidWdMb2ciLCJtZXNzYWdlIiwiZGF0YSIsImNvbnNvbGUiLCJsb2ciLCJlc2NhcGVIdG1sU2FmZSIsIndhcm4iLCJnbG9iYWxEZWJ1Z01vZGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBQSxNQUFNLENBQUNDLGFBQVAsR0FBdUI7QUFFbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLE9BQU8sRUFBRSxPQUxVOztBQU9uQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBakNtQixzQkFpQ1JDLElBakNRLEVBaUNrQjtBQUFBLFFBQXBCQyxVQUFvQix1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LEtBQXJCLEdBQTZCLElBQTdCO0FBQ0gsQyxDQUVEOzs7QUFDQWpGLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQmlGLFNBQXJCLENBQStCLDJCQUEvQixFQUE0RDtBQUN4RGhGLEVBQUFBLE9BQU8sRUFBRUYsTUFBTSxDQUFDQyxhQUFQLENBQXFCQyxPQUQwQjtBQUV4RCtFLEVBQUFBLEtBQUssRUFBRWpGLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQmdGO0FBRjRCLENBQTVEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBHbG9iYWwgU2VjdXJpdHkgVXRpbGl0aWVzIGZvciBNaWtvUEJYIEFkbWluIENhYmluZXRcbiAqIFxuICogUHJvdmlkZXMgc2VjdXJlIEhUTUwgZXNjYXBpbmcgd2l0aCBzZWxlY3RpdmUgaWNvbiBzdXBwb3J0IGFjcm9zcyBhbGwgbW9kdWxlcy5cbiAqIEltcGxlbWVudHMgRGVmZW5zZS1pbi1EZXB0aCBzdHJhdGVneSBhZ2FpbnN0IFhTUyBhdHRhY2tzLlxuICogXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogQGF1dGhvciBNaWtvUEJYIERldmVsb3BtZW50IFRlYW1cbiAqL1xud2luZG93LlNlY3VyaXR5VXRpbHMgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogVmVyc2lvbiBmb3IgY29tcGF0aWJpbGl0eSB0cmFja2luZ1xuICAgICAqL1xuICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgXG4gICAgLyoqXG4gICAgICogU2FmZWx5IGVzY2FwZSBIVE1MIHdoaWxlIHByZXNlcnZpbmcgc2FmZSBpY29uIHRhZ3NcbiAgICAgKiBcbiAgICAgKiBUaGlzIGZ1bmN0aW9uIGltcGxlbWVudHMgYSBwbGFjZWhvbGRlci1iYXNlZCBhcHByb2FjaCB0byBhbGxvdyBzYWZlIGljb25zXG4gICAgICogd2hpbGUgcHJvdGVjdGluZyBhZ2FpbnN0IFhTUyBhdHRhY2tzLiBTYWZlIGljb25zIGFyZSBleHRyYWN0ZWQgYmVmb3JlXG4gICAgICogSFRNTCBlc2NhcGluZyBhbmQgcmVzdG9yZWQgYWZ0ZXJ3YXJkcy5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gZXNjYXBlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBhbGxvd0ljb25zIC0gV2hldGhlciB0byBhbGxvdyA8aT4gdGFncyBmb3IgaWNvbnMgKGRlZmF1bHQ6IGZhbHNlKVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhZmUgSFRNTCBjb250ZW50XG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBCYXNpYyBIVE1MIGVzY2FwaW5nXG4gICAgICogU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKCc8c2NyaXB0PmFsZXJ0KFwiWFNTXCIpPC9zY3JpcHQ+JylcbiAgICAgKiAvLyBSZXR1cm5zOiAnJmx0O3NjcmlwdCZndDthbGVydCgmcXVvdDtYU1MmcXVvdDspJmx0Oy9zY3JpcHQmZ3Q7J1xuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gU2FmZSBpY29uIHByZXNlcnZhdGlvblxuICAgICAqIFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbCgnU2FsZXMgPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPicsIHRydWUpXG4gICAgICogLy8gUmV0dXJuczogJ1NhbGVzIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4nXG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBEYW5nZXJvdXMgaWNvbiBibG9ja2luZ1xuICAgICAqIFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbCgnU2FsZXMgPGkgY2xhc3M9XCJwaG9uZSBpY29uXCIgb25jbGljaz1cImFsZXJ0KDEpXCI+PC9pPicsIHRydWUpXG4gICAgICogLy8gUmV0dXJuczogJ1NhbGVzICZsdDtpIGNsYXNzPSZxdW90O3Bob25lIGljb24mcXVvdDsgb25jbGljaz0mcXVvdDthbGVydCgxKSZxdW90OyZndDsmbHQ7L2kmZ3Q7J1xuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCwgYWxsb3dJY29ucyA9IGZhbHNlKSB7XG4gICAgICAgIGlmICghdGV4dCkgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFsbG93SWNvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcm9jZXNzV2l0aFNhZmVJY29ucyh0ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gaWNvbnMgYWxsb3dlZCwganVzdCBlc2NhcGUgZXZlcnl0aGluZ1xuICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQodGV4dCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIHRleHQgd2l0aCBzYWZlIGljb24gZXh0cmFjdGlvbiBhbmQgcmVzdG9yYXRpb25cbiAgICAgKiBcbiAgICAgKiBTdXBwb3J0cyBib3RoIHNpbXBsZSBpY29ucyBhbmQgbmVzdGVkIGljb24gc3RydWN0dXJlczpcbiAgICAgKiAtIFNpbXBsZTogPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPlxuICAgICAqIC0gTmVzdGVkOiA8aSBjbGFzcz1cImljb25zXCI+PGkgY2xhc3M9XCJ1c2VyIG91dGxpbmUgaWNvblwiPjwvaT48aSBjbGFzcz1cInRvcCByaWdodCBjb3JuZXIgYWx0ZXJuYXRlIG1vYmlsZSBpY29uXCI+PC9pPjwvaT5cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBwcm9jZXNzXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUHJvY2Vzc2VkIHNhZmUgSFRNTFxuICAgICAqL1xuICAgIF9wcm9jZXNzV2l0aFNhZmVJY29ucyh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IGljb25zID0gW107XG4gICAgICAgIGxldCBpY29uSW5kZXggPSAwO1xuICAgICAgICBcbiAgICAgICAgLy8gRmlyc3QsIGV4dHJhY3QgbmVzdGVkIGljb24gc3RydWN0dXJlc1xuICAgICAgICBjb25zdCB0ZXh0V2l0aE5lc3RlZFBsYWNlaG9sZGVycyA9IHRoaXMuX2V4dHJhY3ROZXN0ZWRJY29ucyh0ZXh0LCBpY29ucywgaWNvbkluZGV4KTtcbiAgICAgICAgaWNvbkluZGV4ID0gaWNvbnMubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgLy8gVGhlbiBleHRyYWN0IHNpbXBsZSBpY29ucyBmcm9tIHJlbWFpbmluZyB0ZXh0XG4gICAgICAgIGNvbnN0IHRleHRXaXRoQWxsUGxhY2Vob2xkZXJzID0gdGhpcy5fZXh0cmFjdFNpbXBsZUljb25zKHRleHRXaXRoTmVzdGVkUGxhY2Vob2xkZXJzLCBpY29ucywgaWNvbkluZGV4KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEVzY2FwZSBhbGwgSFRNTCBpbiB0ZXh0IHdpdGggcGxhY2Vob2xkZXJzXG4gICAgICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLl9lc2NhcGVIdG1sQ29udGVudCh0ZXh0V2l0aEFsbFBsYWNlaG9sZGVycyk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZXN0b3JlIHNhZmUgaWNvbnMgYnkgcmVwbGFjaW5nIHBsYWNlaG9sZGVyc1xuICAgICAgICByZXR1cm4gZXNjYXBlZC5yZXBsYWNlKC9fX1NBRkVfSUNPTl8oXFxkKylfXy9nLCAobWF0Y2gsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gaWNvbnNbaW5kZXhdIHx8ICcnO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBuZXN0ZWQgaWNvbiBzdHJ1Y3R1cmVzIGxpa2UgPGkgY2xhc3M9XCJpY29uc1wiPi4uLjwvaT5cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBwcm9jZXNzXG4gICAgICogQHBhcmFtIHtBcnJheX0gaWNvbnMgLSBBcnJheSB0byBzdG9yZSBmb3VuZCBpY29uc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydEluZGV4IC0gU3RhcnRpbmcgaW5kZXggZm9yIHBsYWNlaG9sZGVyc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRleHQgd2l0aCBuZXN0ZWQgaWNvbnMgcmVwbGFjZWQgYnkgcGxhY2Vob2xkZXJzXG4gICAgICovXG4gICAgX2V4dHJhY3ROZXN0ZWRJY29ucyh0ZXh0LCBpY29ucywgc3RhcnRJbmRleCkge1xuICAgICAgICAvLyBQYXR0ZXJuIHRvIG1hdGNoIG5lc3RlZCBpY29uIHN0cnVjdHVyZXM6IDxpIGNsYXNzPVwiaWNvbnNcIj4uLi48L2k+XG4gICAgICAgIGNvbnN0IG5lc3RlZEljb25QYXR0ZXJuID0gLzxpXFxzK2NsYXNzPVwiKFteXCI8Pl0qaWNvbnNbXlwiPD5dKilcIj4oW1xcc1xcU10qPyk8XFwvaT4vZ2k7XG4gICAgICAgIGxldCBpY29uSW5kZXggPSBzdGFydEluZGV4O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZShuZXN0ZWRJY29uUGF0dGVybiwgKG1hdGNoLCBvdXRlckNsYXNzTmFtZSwgaW5uZXJDb250ZW50KSA9PiB7XG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBvdXRlciBjbGFzcyBpcyBzYWZlXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2lzQ2xhc3NOYW1lU2FmZShvdXRlckNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQobWF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFeHRyYWN0IGFuZCB2YWxpZGF0ZSBpbm5lciBpY29uc1xuICAgICAgICAgICAgY29uc3Qgc2FmZUlubmVyQ29udGVudCA9IHRoaXMuX3Byb2Nlc3NJbm5lckljb25zKGlubmVyQ29udGVudCk7XG4gICAgICAgICAgICBpZiAoc2FmZUlubmVyQ29udGVudCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIElmIGFueSBpbm5lciBpY29uIGlzIHVuc2FmZSwgZXNjYXBlIHRoZSB3aG9sZSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQobWF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWNvbnN0cnVjdCBzYWZlIG5lc3RlZCBpY29uXG4gICAgICAgICAgICBjb25zdCBzYWZlTmVzdGVkSWNvbiA9IGA8aSBjbGFzcz1cIiR7b3V0ZXJDbGFzc05hbWV9XCI+JHtzYWZlSW5uZXJDb250ZW50fTwvaT5gO1xuICAgICAgICAgICAgaWNvbnNbaWNvbkluZGV4XSA9IHNhZmVOZXN0ZWRJY29uO1xuICAgICAgICAgICAgcmV0dXJuIGBfX1NBRkVfSUNPTl8ke2ljb25JbmRleCsrfV9fYDtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3Qgc2ltcGxlIGljb24gc3RydWN0dXJlcyBsaWtlIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT5cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBwcm9jZXNzXG4gICAgICogQHBhcmFtIHtBcnJheX0gaWNvbnMgLSBBcnJheSB0byBzdG9yZSBmb3VuZCBpY29uc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydEluZGV4IC0gU3RhcnRpbmcgaW5kZXggZm9yIHBsYWNlaG9sZGVyc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRleHQgd2l0aCBzaW1wbGUgaWNvbnMgcmVwbGFjZWQgYnkgcGxhY2Vob2xkZXJzXG4gICAgICovXG4gICAgX2V4dHJhY3RTaW1wbGVJY29ucyh0ZXh0LCBpY29ucywgc3RhcnRJbmRleCkge1xuICAgICAgICAvLyBQYXR0ZXJuIHRvIG1hdGNoIHNpbXBsZSBpY29uIHRhZ3M6IDxpIGNsYXNzPVwiLi4uXCI+PC9pPlxuICAgICAgICBjb25zdCBzaW1wbGVJY29uUGF0dGVybiA9IC88aVxccytjbGFzcz1cIihbXlwiPD5dKilcIj5cXHMqPFxcL2k+L2dpO1xuICAgICAgICBsZXQgaWNvbkluZGV4ID0gc3RhcnRJbmRleDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2Uoc2ltcGxlSWNvblBhdHRlcm4sIChtYXRjaCwgY2xhc3NOYW1lKSA9PiB7XG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBjbGFzcyBhdHRyaWJ1dGUgY29udGFpbnMgb25seSBzYWZlIGNoYXJhY3RlcnNcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc0NsYXNzTmFtZVNhZmUoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIGljb25zW2ljb25JbmRleF0gPSBtYXRjaDtcbiAgICAgICAgICAgICAgICByZXR1cm4gYF9fU0FGRV9JQ09OXyR7aWNvbkluZGV4Kyt9X19gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgY2xhc3MgaXMgbm90IHNhZmUsIGVzY2FwZSB0aGUgd2hvbGUgdGFnXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQobWF0Y2gpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBpbm5lciBpY29ucyB3aXRoaW4gbmVzdGVkIHN0cnVjdHVyZXNcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbm5lckNvbnRlbnQgLSBJbm5lciBjb250ZW50IHRvIHByb2Nlc3NcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IFNhZmUgaW5uZXIgY29udGVudCBvciBudWxsIGlmIHVuc2FmZVxuICAgICAqL1xuICAgIF9wcm9jZXNzSW5uZXJJY29ucyhpbm5lckNvbnRlbnQpIHtcbiAgICAgICAgLy8gUGF0dGVybiB0byBtYXRjaCBpbm5lciBpY29uc1xuICAgICAgICBjb25zdCBpbm5lckljb25QYXR0ZXJuID0gLzxpXFxzK2NsYXNzPVwiKFteXCI8Pl0qKVwiPlxccyo8XFwvaT4vZ2k7XG4gICAgICAgIGNvbnN0IG1hdGNoZXMgPSBbLi4uaW5uZXJDb250ZW50Lm1hdGNoQWxsKGlubmVySWNvblBhdHRlcm4pXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIGFsbCBpbm5lciBpY29ucyBhcmUgc2FmZVxuICAgICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIG1hdGNoZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IG1hdGNoWzFdO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9pc0NsYXNzTmFtZVNhZmUoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsOyAvLyBVbnNhZmUgaW5uZXIgaWNvbiBmb3VuZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSdzIGFueSBjb250ZW50IG90aGVyIHRoYW4gc2FmZSBpY29ucyBhbmQgd2hpdGVzcGFjZVxuICAgICAgICBjb25zdCBjb250ZW50V2l0aG91dEljb25zID0gaW5uZXJDb250ZW50LnJlcGxhY2UoaW5uZXJJY29uUGF0dGVybiwgJycpLnRyaW0oKTtcbiAgICAgICAgaWYgKGNvbnRlbnRXaXRob3V0SWNvbnMgIT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDsgLy8gQ29udGFpbnMgbm9uLWljb24gY29udGVudFxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaW5uZXJDb250ZW50OyAvLyBBbGwgaW5uZXIgaWNvbnMgYXJlIHNhZmVcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIGlmIGNsYXNzIG5hbWUgY29udGFpbnMgb25seSBzYWZlIGNoYXJhY3RlcnNcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjbGFzc05hbWUgLSBDU1MgY2xhc3MgbmFtZSB0byB2YWxpZGF0ZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGNsYXNzIG5hbWUgaXMgc2FmZVxuICAgICAqL1xuICAgIF9pc0NsYXNzTmFtZVNhZmUoY2xhc3NOYW1lKSB7XG4gICAgICAgIC8vIEFsbG93IG9ubHkgYWxwaGFudW1lcmljIGNoYXJhY3RlcnMsIHNwYWNlcywgaHlwaGVucywgYW5kIHVuZGVyc2NvcmVzXG4gICAgICAgIHJldHVybiAvXlthLXpBLVowLTlcXHNcXC1fXSskLy50ZXN0KGNsYXNzTmFtZSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCBjb250ZW50IHVzaW5nIGpRdWVyeSdzIHNhZmUgbWV0aG9kXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gZXNjYXBlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRXNjYXBlZCBIVE1MXG4gICAgICovXG4gICAgX2VzY2FwZUh0bWxDb250ZW50KHRleHQpIHtcbiAgICAgICAgcmV0dXJuICQoJzxkaXY+JykudGV4dCh0ZXh0KS5odG1sKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhbml0aXplIHdpdGggY29tcHJlaGVuc2l2ZSB3aGl0ZWxpc3QgZm9yIGFsbCBNaWtvUEJYIG9iamVjdCByZXByZXNlbnRhdGlvbnNcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBzYW5pdGl6ZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhbml0aXplZCB0ZXh0IHdpdGggcHJlc2VydmVkIHNhZmUgaWNvbnNcbiAgICAgKi9cbiAgICBfc2FuaXRpemVXaXRoV2hpdGVsaXN0KHRleHQpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBDb21wcmVoZW5zaXZlIHdoaXRlbGlzdCBmb3IgYWxsIE1pa29QQlggb2JqZWN0IHR5cGVzXG4gICAgICAgIGNvbnN0IGFsbG93ZWRJY29uQ2xhc3NlcyA9IFtcbiAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBpY29uc1xuICAgICAgICAgICAgJ3Bob25lIHZvbHVtZSBpY29uJyxcbiAgICAgICAgICAgICdwaHAgaWNvbicsIFxuICAgICAgICAgICAgJ3NpdGVtYXAgaWNvbicsXG4gICAgICAgICAgICAndXNlcnMgaWNvbicsXG4gICAgICAgICAgICAnY29ncyBpY29uJyxcbiAgICAgICAgICAgICd1c2VyIG91dGxpbmUgaWNvbicsXG4gICAgICAgICAgICAnaWNvbnMnLCAvLyBDb250YWluZXIgZm9yIG11bHRpcGxlIGljb25zXG4gICAgICAgICAgICAndG9wIHJpZ2h0IGNvcm5lciBhbHRlcm5hdGUgbW9iaWxlIGljb24nLFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciBpY29uc1xuICAgICAgICAgICAgJ2dsb2JlIGljb24nLFxuICAgICAgICAgICAgJ2hvbWUgaWNvbicsXG4gICAgICAgICAgICAnc2hpZWxkIGFsdGVybmF0ZSBpY29uJywgXG4gICAgICAgICAgICAnYmFuIGljb24nLFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTb3VuZCBmaWxlIGljb25zXG4gICAgICAgICAgICAnbXVzaWMgaWNvbicsXG4gICAgICAgICAgICAnZmlsZSBhdWRpbyBpY29uJyxcbiAgICAgICAgICAgICdmaWxlIGF1ZGlvIG91dGxpbmUgaWNvbicsXG4gICAgICAgICAgICAnc291bmQgaWNvbicsXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENhbGwgcXVldWUgaWNvbnNcbiAgICAgICAgICAgICdjYWxsIGljb24nLFxuICAgICAgICAgICAgJ3Bob25lIGljb24nLFxuICAgICAgICAgICAgJ2hlYWRwaG9uZXMgaWNvbicsXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByb3ZpZGVyIGljb25zXG4gICAgICAgICAgICAnc2VydmVyIGljb24nLFxuICAgICAgICAgICAgJ2Nsb3VkIGljb24nLFxuICAgICAgICAgICAgJ3BsdWcgaWNvbicsXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN5c3RlbSBpY29uc1xuICAgICAgICAgICAgJ3NldHRpbmdzIGljb24nLFxuICAgICAgICAgICAgJ3dyZW5jaCBpY29uJyxcbiAgICAgICAgICAgICd0b29sIGljb24nXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBQYXJzZSBIVE1MIHNhZmVseVxuICAgICAgICBjb25zdCB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRlbXBEaXYuaW5uZXJIVE1MID0gdGV4dDtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGFsbCA8aT4gdGFnc1xuICAgICAgICBjb25zdCBpVGFncyA9IHRlbXBEaXYucXVlcnlTZWxlY3RvckFsbCgnaScpO1xuICAgICAgICBsZXQgaXNTYWZlID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIGlUYWdzLmZvckVhY2godGFnID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IHRhZy5jbGFzc05hbWU7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBjbGFzcyBpcyBpbiB3aGl0ZWxpc3Qgb3IgaXMgYSBGb21hbnRpYyBVSSBmbGFnXG4gICAgICAgICAgICBjb25zdCBpc0ZsYWdJY29uID0gL15mbGFnXFxzK1tcXHdcXHNdKyQvLnRlc3QoY2xhc3NOYW1lLnRyaW0oKSk7XG4gICAgICAgICAgICBpZiAoIWFsbG93ZWRJY29uQ2xhc3Nlcy5pbmNsdWRlcyhjbGFzc05hbWUpICYmICFpc0ZsYWdJY29uKSB7XG4gICAgICAgICAgICAgICAgaXNTYWZlID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgYWxsIGljb25zIGFyZSBzYWZlLCByZXR1cm4gdGhlIG9yaWdpbmFsIHRleHRcbiAgICAgICAgaWYgKGlzU2FmZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIGFueSB1bnNhZmUgaWNvbiBmb3VuZCwgZXNjYXBlIGFsbCBIVE1MXG4gICAgICAgIHJldHVybiB0aGlzLl9lc2NhcGVIdG1sQ29udGVudCh0ZXh0KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhbml0aXplIHRleHQgZm9yIHVzZSBpbiBIVE1MIGF0dHJpYnV0ZXNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gc2FuaXRpemVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTYW5pdGl6ZWQgdGV4dCBzYWZlIGZvciBhdHRyaWJ1dGVzXG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBTZWN1cml0eVV0aWxzLnNhbml0aXplQXR0cmlidXRlKCd2YWx1ZVwib25jbGljaz1cImFsZXJ0KDEpJylcbiAgICAgKiAvLyBSZXR1cm5zOiAndmFsdWUmcXVvdDtvbmNsaWNrPSZxdW90O2FsZXJ0KDEpJ1xuICAgICAqL1xuICAgIHNhbml0aXplQXR0cmlidXRlKHRleHQpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4gJyc7XG4gICAgICAgIHJldHVybiB0aGlzLl9lc2NhcGVIdG1sQ29udGVudCh0ZXh0KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhbml0aXplIHRleHQgZm9yIGRpc3BsYXkgd2l0aCBjb25maWd1cmFibGUgc3RyaWN0bmVzc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBzYW5pdGl6ZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3RyaWN0TW9kZSAtIElmIHRydWUsIHVzZXMgc3RyaWN0IHZhbGlkYXRpb24gZm9yIHVzZXIgaW5wdXQuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSWYgZmFsc2UsIHVzZXMgbGVzcyBzdHJpY3QgdmFsaWRhdGlvbiBmb3IgdHJ1c3RlZCBBUEkgY29udGVudC5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTYW5pdGl6ZWQgdGV4dFxuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gU3RyaWN0IG1vZGUgZm9yIHVzZXIgaW5wdXRcbiAgICAgKiBTZWN1cml0eVV0aWxzLnNhbml0aXplRm9yRGlzcGxheSgnVXNlciA8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+JywgdHJ1ZSlcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZSAgXG4gICAgICogLy8gTGVzcyBzdHJpY3QgZm9yIEFQSSBjb250ZW50XG4gICAgICogU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUZvckRpc3BsYXkoJzxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4gVXNlciBOYW1lJywgZmFsc2UpXG4gICAgICovXG4gICAgc2FuaXRpemVGb3JEaXNwbGF5KHRleHQsIHN0cmljdE1vZGUgPSB0cnVlKSB7XG4gICAgICAgIGlmICghdGV4dCkgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQWx3YXlzIGNoZWNrIGZvciBkYW5nZXJvdXMgcGF0dGVybnMgZmlyc3RcbiAgICAgICAgaWYgKHRoaXMuY29udGFpbnNEYW5nZXJvdXNQYXR0ZXJucyh0ZXh0KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KHRleHQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoc3RyaWN0TW9kZSkge1xuICAgICAgICAgICAgLy8gU3RyaWN0IHZhbGlkYXRpb246IG9ubHkgYWxsb3cgY29tcGxldGVseSBzYWZlIGNvbnRlbnRcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzU2FmZUZvckRyb3Bkb3duKHRleHQpID8gXG4gICAgICAgICAgICAgICAgdGhpcy5lc2NhcGVIdG1sKHRleHQsIHRydWUpIDogXG4gICAgICAgICAgICAgICAgdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQodGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMZXNzIHN0cmljdDogYWxsb3cgc2FmZSBpY29ucyBmcm9tIHRydXN0ZWQgc291cmNlc1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZXNjYXBlSHRtbCh0ZXh0LCB0cnVlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYW5pdGl6ZSB0ZXh0IGZvciBkcm9wZG93biBkaXNwbGF5IChzdHJpY3QgbW9kZSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gc2FuaXRpemVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTYW5pdGl6ZWQgdGV4dFxuICAgICAqL1xuICAgIHNhbml0aXplRm9yRHJvcGRvd24odGV4dCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zYW5pdGl6ZUZvckRpc3BsYXkodGV4dCwgdHJ1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhbml0aXplIG9iamVjdCByZXByZXNlbnRhdGlvbnMgd2l0aCBlbmhhbmNlZCBYU1MgcHJvdGVjdGlvbiB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgaWNvbnNcbiAgICAgKiBcbiAgICAgKiBVbml2ZXJzYWwgbWV0aG9kIGZvciBzYW5pdGl6aW5nIGFsbCBvYmplY3QgcmVwcmVzZW50YXRpb24gZGF0YSBmcm9tIFJFU1QgQVBJLlxuICAgICAqIEhhbmRsZXMgRXh0ZW5zaW9ucywgTmV0d29ya0ZpbHRlcnMsIFNvdW5kRmlsZXMsIENhbGxRdWV1ZXMsIGFuZCBvdGhlciBNaWtvUEJYIG9iamVjdHMuXG4gICAgICogVXNlcyBjb21wcmVoZW5zaXZlIHdoaXRlbGlzdCBhcHByb2FjaCBmb3IgbWF4aW11bSBzZWN1cml0eSB3aXRoIHByb3BlciBmdW5jdGlvbmFsaXR5LlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBzYW5pdGl6ZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhbml0aXplZCB0ZXh0IHdpdGggcHJlc2VydmVkIHNhZmUgaWNvbnNcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFNhZmUgaWNvbnMgYXJlIHByZXNlcnZlZCAoRXh0ZW5zaW9ucylcbiAgICAgKiBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKCc8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+IEpvaG4gRG9lJylcbiAgICAgKiAvLyBSZXR1cm5zOiAnPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPiBKb2huIERvZSdcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFNhZmUgaWNvbnMgYXJlIHByZXNlcnZlZCAoTmV0d29ya0ZpbHRlcnMpXG4gICAgICogU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucygnPGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPiBBbnkgTmV0d29yaycpXG4gICAgICogLy8gUmV0dXJuczogJzxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4gQW55IE5ldHdvcmsnXG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBYU1MgYXR0YWNrcyBhcmUgYmxvY2tlZFxuICAgICAqIFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoJzxzY3JpcHQ+YWxlcnQoXCJYU1NcIik8L3NjcmlwdD4nKVxuICAgICAqIC8vIFJldHVybnM6ICcmbHQ7c2NyaXB0Jmd0O2FsZXJ0KCZxdW90O1hTUyZxdW90OykmbHQ7L3NjcmlwdCZndDsnXG4gICAgICovXG4gICAgc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnModGV4dCkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEVuaGFuY2VkIGRhbmdlcm91cyBwYXR0ZXJucyBzcGVjaWZpY2FsbHkgZm9yIGV4dGVuc2lvbiByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgY29uc3QgZGFuZ2Vyb3VzUGF0dGVybnMgPSBbXG4gICAgICAgICAgICAvPHNjcmlwdFtcXHNcXFNdKj88XFwvc2NyaXB0Pi9naSxcbiAgICAgICAgICAgIC88aWZyYW1lW1xcc1xcU10qPzxcXC9pZnJhbWU+L2dpLFxuICAgICAgICAgICAgLzxvYmplY3RbXFxzXFxTXSo/PFxcL29iamVjdD4vZ2ksXG4gICAgICAgICAgICAvPGVtYmVkW1xcc1xcU10qPz4vZ2ksXG4gICAgICAgICAgICAvPGZvcm1bXFxzXFxTXSo/PFxcL2Zvcm0+L2dpLFxuICAgICAgICAgICAgLzxpbWdbXFxzXFxTXSo/Pi9naSxcbiAgICAgICAgICAgIC88c3ZnW1xcc1xcU10qPzxcXC9zdmc+L2dpLFxuICAgICAgICAgICAgLzxsaW5rW1xcc1xcU10qPz4vZ2ksXG4gICAgICAgICAgICAvPG1ldGFbXFxzXFxTXSo/Pi9naSxcbiAgICAgICAgICAgIC88c3R5bGVbXFxzXFxTXSo/PFxcL3N0eWxlPi9naSxcbiAgICAgICAgICAgIC9qYXZhc2NyaXB0Oi9naSxcbiAgICAgICAgICAgIC9kYXRhOnRleHRcXC9odG1sL2dpLFxuICAgICAgICAgICAgL29uXFx3K1xccyo9L2dpLCAvLyBFdmVudCBoYW5kbGVycyBsaWtlIG9uY2xpY2ssIG9ubG9hZCwgZXRjLlxuICAgICAgICAgICAgL2V4cHJlc3Npb25cXHMqXFwoL2dpLCAvLyBDU1MgZXhwcmVzc2lvbnNcbiAgICAgICAgICAgIC91cmxcXHMqXFwoXFxzKmphdmFzY3JpcHQ6L2dpLFxuICAgICAgICAgICAgLy8gQWRkaXRpb25hbCBwYXR0ZXJucyB0byBjYXRjaCB2YXJpb3VzIFhTUyBhdHRlbXB0c1xuICAgICAgICAgICAgLzxzY3JpcHRcXGIvZ2ksIC8vIFNjcmlwdCB0YWdzIChldmVuIHdpdGhvdXQgY2xvc2luZylcbiAgICAgICAgICAgIC9hbGVydFxccypcXCgvZ2ksIC8vIEFsZXJ0IGZ1bmN0aW9uIGNhbGxzXG4gICAgICAgICAgICAvb25lcnJvclxccyo9L2dpLCAvLyBTcGVjaWZpYyBvbmVycm9yIGhhbmRsZXJcbiAgICAgICAgICAgIC9zcmNcXHMqPVxccyp4XFxiL2dpLCAvLyBDb21tb24gWFNTIHBhdHRlcm4gc3JjPXggXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBhbnkgZGFuZ2Vyb3VzIHBhdHRlcm4gaXMgZm91bmQsIGVzY2FwZSBhbGwgSFRNTFxuICAgICAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgZGFuZ2Vyb3VzUGF0dGVybnMpIHtcbiAgICAgICAgICAgIGlmIChwYXR0ZXJuLnRlc3QodGV4dCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQodGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIG5vIGRhbmdlcm91cyBwYXR0ZXJucyBmb3VuZCwgdXNlIHdoaXRlbGlzdCB2YWxpZGF0aW9uIGZvciBzYWZlIGljb25zXG4gICAgICAgIHJldHVybiB0aGlzLl9zYW5pdGl6ZVdpdGhXaGl0ZWxpc3QodGV4dCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExlZ2FjeSBhbGlhcyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyBpbnN0ZWFkXG4gICAgICovXG4gICAgc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCh0ZXh0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHRleHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgc2FmZSBvcHRpb24gZWxlbWVudCBmb3IgZHJvcGRvd25zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gT3B0aW9uIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBPcHRpb24gZGlzcGxheSB0ZXh0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdHJpY3RNb2RlIC0gV2hldGhlciB0byB1c2Ugc3RyaWN0IGZpbHRlcmluZyAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTYWZlIG9wdGlvbiBIVE1MXG4gICAgICovXG4gICAgY3JlYXRlU2FmZU9wdGlvbih2YWx1ZSwgdGV4dCwgc3RyaWN0TW9kZSA9IHRydWUpIHtcbiAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdGhpcy5zYW5pdGl6ZUF0dHJpYnV0ZSh2YWx1ZSk7XG4gICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gdGhpcy5zYW5pdGl6ZUZvckRpc3BsYXkodGV4dCwgc3RyaWN0TW9kZSk7XG4gICAgICAgIHJldHVybiBgPG9wdGlvbiB2YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7c2FmZVRleHR9PC9vcHRpb24+YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhZmVseSBzZXQgSFRNTCBjb250ZW50IG9mIGVsZW1lbnRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2pRdWVyeXxIVE1MRWxlbWVudH0gZWxlbWVudCAtIFRhcmdldCBlbGVtZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRlbnQgLSBDb250ZW50IHRvIHNldFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3RyaWN0TW9kZSAtIFdoZXRoZXIgdG8gdXNlIHN0cmljdCBmaWx0ZXJpbmcgKGRlZmF1bHQ6IHRydWUpXG4gICAgICovXG4gICAgc2V0SHRtbENvbnRlbnQoZWxlbWVudCwgY29udGVudCwgc3RyaWN0TW9kZSA9IHRydWUpIHtcbiAgICAgICAgY29uc3QgJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgICAgICBjb25zdCBzYWZlQ29udGVudCA9IHRoaXMuc2FuaXRpemVGb3JEaXNwbGF5KGNvbnRlbnQsIHN0cmljdE1vZGUpO1xuICAgICAgICAkZWxlbWVudC5odG1sKHNhZmVDb250ZW50KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIGlmIHN0cmluZyBjb250YWlucyBwb3RlbnRpYWxseSBkYW5nZXJvdXMgcGF0dGVybnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gdmFsaWRhdGVcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0ZXh0IGNvbnRhaW5zIGRhbmdlcm91cyBwYXR0ZXJuc1xuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogU2VjdXJpdHlVdGlscy5jb250YWluc0Rhbmdlcm91c1BhdHRlcm5zKCc8c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+JylcbiAgICAgKiAvLyBSZXR1cm5zOiB0cnVlXG4gICAgICovXG4gICAgY29udGFpbnNEYW5nZXJvdXNQYXR0ZXJucyh0ZXh0KSB7XG4gICAgICAgIGlmICghdGV4dCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGFuZ2Vyb3VzUGF0dGVybnMgPSBbXG4gICAgICAgICAgICAvPHNjcmlwdFtcXHNcXFNdKj88XFwvc2NyaXB0Pi9naSxcbiAgICAgICAgICAgIC88aWZyYW1lW1xcc1xcU10qPzxcXC9pZnJhbWU+L2dpLFxuICAgICAgICAgICAgLzxvYmplY3RbXFxzXFxTXSo/PFxcL29iamVjdD4vZ2ksXG4gICAgICAgICAgICAvPGVtYmVkW1xcc1xcU10qPz4vZ2ksXG4gICAgICAgICAgICAvPGZvcm1bXFxzXFxTXSo/PFxcL2Zvcm0+L2dpLFxuICAgICAgICAgICAgL2phdmFzY3JpcHQ6L2dpLFxuICAgICAgICAgICAgL2RhdGE6dGV4dFxcL2h0bWwvZ2ksXG4gICAgICAgICAgICAvb25cXHcrXFxzKj0vZ2ksIC8vIEV2ZW50IGhhbmRsZXJzIGxpa2Ugb25jbGljaywgb25sb2FkLCBldGMuXG4gICAgICAgICAgICAvPGltZ1tePl0rb25lcnJvci9naSxcbiAgICAgICAgICAgIC88c3ZnW14+XSpvbmxvYWQvZ2ksXG4gICAgICAgICAgICAvPHN0eWxlW1xcc1xcU10qPzxcXC9zdHlsZT4vZ2ksXG4gICAgICAgICAgICAvPGxpbmtbXFxzXFxTXSo/Pi9naSxcbiAgICAgICAgICAgIC88bWV0YVtcXHNcXFNdKj8+L2dpLFxuICAgICAgICAgICAgL2V4cHJlc3Npb25cXHMqXFwoL2dpLCAvLyBDU1MgZXhwcmVzc2lvbnNcbiAgICAgICAgICAgIC91cmxcXHMqXFwoXFxzKmphdmFzY3JpcHQ6L2dpLFxuICAgICAgICAgICAgLzxcXC8/XFx3K1tePl0qXFxzK3NyY1xccyo9L2dpLCAvLyBUYWdzIHdpdGggc3JjIGF0dHJpYnV0ZSAoZXhjZXB0IGFsbG93ZWQpXG4gICAgICAgICAgICAvPFxcLz9cXHcrW14+XSpcXHMraHJlZlxccyo9L2dpLCAvLyBUYWdzIHdpdGggaHJlZiBhdHRyaWJ1dGUgKGV4Y2VwdCBhbGxvd2VkKVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGRhbmdlcm91c1BhdHRlcm5zLnNvbWUocGF0dGVybiA9PiBwYXR0ZXJuLnRlc3QodGV4dCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSBpZiB0ZXh0IGNvbnRhaW5zIG9ubHkgc2FmZSBpY29uIHN0cnVjdHVyZXMgYW5kIHJlZ3VsYXIgdGV4dFxuICAgICAqIFxuICAgICAqIFRoaXMgbWV0aG9kIGVuc3VyZXMgdGhhdCB0aGUgdGV4dCBjb250YWlucyBvbmx5OlxuICAgICAqIC0gUGxhaW4gdGV4dCBjb250ZW50XG4gICAgICogLSBTYWZlIHNpbXBsZSBpY29uczogPGkgY2xhc3M9XCIuLi5cIj48L2k+ICBcbiAgICAgKiAtIFNhZmUgbmVzdGVkIGljb25zOiA8aSBjbGFzcz1cImljb25zXCI+Li4uPC9pPlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byB2YWxpZGF0ZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRleHQgaXMgc2FmZSBmb3IgZHJvcGRvd24gZGlzcGxheVxuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogU2VjdXJpdHlVdGlscy5pc1NhZmVGb3JEcm9wZG93bignVXNlciA8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+JylcbiAgICAgKiAvLyBSZXR1cm5zOiB0cnVlXG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBTZWN1cml0eVV0aWxzLmlzU2FmZUZvckRyb3Bkb3duKCdVc2VyIDxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD4nKVxuICAgICAqIC8vIFJldHVybnM6IGZhbHNlXG4gICAgICovXG4gICAgaXNTYWZlRm9yRHJvcGRvd24odGV4dCkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGRhbmdlcm91cyBwYXR0ZXJucyBmaXJzdFxuICAgICAgICBpZiAodGhpcy5jb250YWluc0Rhbmdlcm91c1BhdHRlcm5zKHRleHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBhbGwgc2FmZSBpY29uIHN0cnVjdHVyZXMgYW5kIGNoZWNrIGlmIHJlbWFpbmluZyBjb250ZW50IGlzIHNhZmVcbiAgICAgICAgY29uc3QgdGVtcFRleHQgPSB0aGlzLl9yZW1vdmVTYWZlSWNvbnModGV4dCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZnRlciByZW1vdmluZyBzYWZlIGljb25zLCB0aGVyZSBzaG91bGQgb25seSBiZSBwbGFpbiB0ZXh0XG4gICAgICAgIC8vIENoZWNrIGZvciBhbnkgcmVtYWluaW5nIEhUTUwgdGFnc1xuICAgICAgICBjb25zdCBoYXNVbnNhZmVUYWdzID0gLzxbXj5dKz4vZy50ZXN0KHRlbXBUZXh0KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiAhaGFzVW5zYWZlVGFncztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGFsbCBzYWZlIGljb24gc3RydWN0dXJlcyBmcm9tIHRleHRcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBwcm9jZXNzXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGV4dCB3aXRoIHNhZmUgaWNvbnMgcmVtb3ZlZFxuICAgICAqL1xuICAgIF9yZW1vdmVTYWZlSWNvbnModGV4dCkge1xuICAgICAgICAvLyBGaXJzdCByZW1vdmUgbmVzdGVkIGljb25zXG4gICAgICAgIGxldCBjbGVhblRleHQgPSB0ZXh0LnJlcGxhY2UoLzxpXFxzK2NsYXNzPVwiKFteXCI8Pl0qaWNvbnNbXlwiPD5dKilcIj4oW1xcc1xcU10qPyk8XFwvaT4vZ2ksIChtYXRjaCwgb3V0ZXJDbGFzc05hbWUsIGlubmVyQ29udGVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzQ2xhc3NOYW1lU2FmZShvdXRlckNsYXNzTmFtZSkgJiYgdGhpcy5fcHJvY2Vzc0lubmVySWNvbnMoaW5uZXJDb250ZW50KSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJzsgLy8gUmVtb3ZlIHNhZmUgbmVzdGVkIGljb25cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtYXRjaDsgLy8gS2VlcCB1bnNhZmUgaWNvbiBmb3IgZnVydGhlciB2YWxpZGF0aW9uXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVGhlbiByZW1vdmUgc2ltcGxlIGljb25zXG4gICAgICAgIGNsZWFuVGV4dCA9IGNsZWFuVGV4dC5yZXBsYWNlKC88aVxccytjbGFzcz1cIihbXlwiPD5dKilcIj5cXHMqPFxcL2k+L2dpLCAobWF0Y2gsIGNsYXNzTmFtZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzQ2xhc3NOYW1lU2FmZShjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnOyAvLyBSZW1vdmUgc2FmZSBzaW1wbGUgaWNvblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1hdGNoOyAvLyBLZWVwIHVuc2FmZSBpY29uIGZvciBmdXJ0aGVyIHZhbGlkYXRpb25cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2xlYW5UZXh0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXRpc3RpY3MgYWJvdXQgc2FmZSBpY29uIHByb2Nlc3NpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gYW5hbHl6ZVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFN0YXRpc3RpY3Mgb2JqZWN0XG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBTZWN1cml0eVV0aWxzLmdldFByb2Nlc3NpbmdTdGF0cygnVGV4dCA8aSBjbGFzcz1cImljb25cIj48L2k+IDxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD4nKVxuICAgICAqIC8vIFJldHVybnM6IHsgc2FmZVNpbXBsZUljb25zOiAxLCBzYWZlTmVzdGVkSWNvbnM6IDAsIGRhbmdlcm91c1BhdHRlcm5zOiAxLCBpc1NhZmVGb3JEcm9wZG93bjogZmFsc2UsIHRvdGFsTGVuZ3RoOiA1NCB9XG4gICAgICovXG4gICAgZ2V0UHJvY2Vzc2luZ1N0YXRzKHRleHQpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4geyBcbiAgICAgICAgICAgIHNhZmVTaW1wbGVJY29uczogMCwgXG4gICAgICAgICAgICBzYWZlTmVzdGVkSWNvbnM6IDAsIFxuICAgICAgICAgICAgZGFuZ2Vyb3VzUGF0dGVybnM6IDAsIFxuICAgICAgICAgICAgaXNTYWZlRm9yRHJvcGRvd246IHRydWUsXG4gICAgICAgICAgICB0b3RhbExlbmd0aDogMCBcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvdW50IHNhZmUgc2ltcGxlIGljb25zXG4gICAgICAgIGNvbnN0IHNpbXBsZUljb25QYXR0ZXJuID0gLzxpXFxzK2NsYXNzPVwiKFteXCI8Pl0qKVwiPlxccyo8XFwvaT4vZ2k7XG4gICAgICAgIGNvbnN0IHNpbXBsZU1hdGNoZXMgPSBbLi4udGV4dC5tYXRjaEFsbChzaW1wbGVJY29uUGF0dGVybildO1xuICAgICAgICBjb25zdCBzYWZlU2ltcGxlSWNvbnMgPSBzaW1wbGVNYXRjaGVzLmZpbHRlcihtYXRjaCA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGFzc05hbWUgPSBtYXRjaFsxXTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc0NsYXNzTmFtZVNhZmUoY2xhc3NOYW1lKTtcbiAgICAgICAgfSkubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgLy8gQ291bnQgc2FmZSBuZXN0ZWQgaWNvbnNcbiAgICAgICAgY29uc3QgbmVzdGVkSWNvblBhdHRlcm4gPSAvPGlcXHMrY2xhc3M9XCIoW15cIjw+XSppY29uc1teXCI8Pl0qKVwiPihbXFxzXFxTXSo/KTxcXC9pPi9naTtcbiAgICAgICAgY29uc3QgbmVzdGVkTWF0Y2hlcyA9IFsuLi50ZXh0Lm1hdGNoQWxsKG5lc3RlZEljb25QYXR0ZXJuKV07XG4gICAgICAgIGNvbnN0IHNhZmVOZXN0ZWRJY29ucyA9IG5lc3RlZE1hdGNoZXMuZmlsdGVyKG1hdGNoID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG91dGVyQ2xhc3NOYW1lID0gbWF0Y2hbMV07XG4gICAgICAgICAgICBjb25zdCBpbm5lckNvbnRlbnQgPSBtYXRjaFsyXTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc0NsYXNzTmFtZVNhZmUob3V0ZXJDbGFzc05hbWUpICYmIHRoaXMuX3Byb2Nlc3NJbm5lckljb25zKGlubmVyQ29udGVudCkgIT09IG51bGw7XG4gICAgICAgIH0pLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRhbmdlcm91c1BhdHRlcm5zID0gdGhpcy5jb250YWluc0Rhbmdlcm91c1BhdHRlcm5zKHRleHQpID8gMSA6IDA7XG4gICAgICAgIGNvbnN0IGlzU2FmZUZvckRyb3Bkb3duID0gdGhpcy5pc1NhZmVGb3JEcm9wZG93bih0ZXh0KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzYWZlU2ltcGxlSWNvbnMsXG4gICAgICAgICAgICBzYWZlTmVzdGVkSWNvbnMsXG4gICAgICAgICAgICBkYW5nZXJvdXNQYXR0ZXJucyxcbiAgICAgICAgICAgIGlzU2FmZUZvckRyb3Bkb3duLFxuICAgICAgICAgICAgdG90YWxMZW5ndGg6IHRleHQubGVuZ3RoXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWJ1ZyBtb2RlIGZsYWcgZm9yIGRldmVsb3BtZW50XG4gICAgICovXG4gICAgZGVidWc6IGZhbHNlLFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvZyBzZWN1cml0eSBwcm9jZXNzaW5nIGluZm9ybWF0aW9uIChvbmx5IGluIGRlYnVnIG1vZGUpXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIERlYnVnIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0geyp9IGRhdGEgLSBBZGRpdGlvbmFsIGRhdGEgdG8gbG9nXG4gICAgICovXG4gICAgX2RlYnVnTG9nKG1lc3NhZ2UsIGRhdGEgPSBudWxsKSB7XG4gICAgICAgIGlmICh0aGlzLmRlYnVnICYmIGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbU2VjdXJpdHlVdGlsc10gJHttZXNzYWdlfWAsIGRhdGEgfHwgJycpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBMZWdhY3kgY29tcGF0aWJpbGl0eSAtIHByb3ZpZGUgb2xkIGZ1bmN0aW9uIG5hbWVzXG4gKiBAZGVwcmVjYXRlZCBVc2UgU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sIGluc3RlYWRcbiAqL1xud2luZG93LmVzY2FwZUh0bWxTYWZlID0gZnVuY3Rpb24odGV4dCwgYWxsb3dJY29ucyA9IGZhbHNlKSB7XG4gICAgY29uc29sZS53YXJuKCdbU2VjdXJpdHlVdGlsc10gZXNjYXBlSHRtbFNhZmUgaXMgZGVwcmVjYXRlZC4gVXNlIFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbCBpbnN0ZWFkLicpO1xuICAgIHJldHVybiB3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHRleHQsIGFsbG93SWNvbnMpO1xufTtcblxuLy8gSW5pdGlhbGl6ZSBkZWJ1ZyBtb2RlIGJhc2VkIG9uIGVudmlyb25tZW50XG5pZiAodHlwZW9mIGdsb2JhbERlYnVnTW9kZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZ2xvYmFsRGVidWdNb2RlKSB7XG4gICAgd2luZG93LlNlY3VyaXR5VXRpbHMuZGVidWcgPSB0cnVlO1xufVxuXG4vLyBMb2cgaW5pdGlhbGl6YXRpb24gaW4gZGVidWcgbW9kZVxud2luZG93LlNlY3VyaXR5VXRpbHMuX2RlYnVnTG9nKCdTZWN1cml0eVV0aWxzIGluaXRpYWxpemVkJywge1xuICAgIHZlcnNpb246IHdpbmRvdy5TZWN1cml0eVV0aWxzLnZlcnNpb24sXG4gICAgZGVidWc6IHdpbmRvdy5TZWN1cml0eVV0aWxzLmRlYnVnXG59KTsiXX0=