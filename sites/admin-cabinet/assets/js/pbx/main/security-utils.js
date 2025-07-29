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
   * Sanitize Extensions API content with enhanced XSS protection while preserving safe icons
   * 
   * This method combines advanced XSS pattern detection with Extensions.sanitizeExtensionRepresent
   * to provide the best balance between security and functionality for extension representations.
   * 
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text with preserved safe icons
   * 
   * @example
   * // Safe icons are preserved
   * SecurityUtils.sanitizeExtensionsApiContent('<i class="phone icon"></i> John Doe')
   * // Returns: '<i class="phone icon"></i> John Doe'
   * 
   * @example
   * // XSS attacks are blocked
   * SecurityUtils.sanitizeExtensionsApiContent('<script>alert("XSS")</script>')
   * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
   */
  sanitizeExtensionsApiContent: function sanitizeExtensionsApiContent(text) {
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
    } // If no dangerous patterns found, use Extensions.sanitizeExtensionRepresent
    // which properly handles HTML entities and preserves safe icons


    if (typeof Extensions !== 'undefined' && Extensions.sanitizeExtensionRepresent) {
      return Extensions.sanitizeExtensionRepresent(text, true);
    } // Fallback: if Extensions is not available, use strict escaping with icons


    return this.escapeHtml(text, true);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3NlY3VyaXR5LXV0aWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIlNlY3VyaXR5VXRpbHMiLCJ2ZXJzaW9uIiwiZXNjYXBlSHRtbCIsInRleHQiLCJhbGxvd0ljb25zIiwiX3Byb2Nlc3NXaXRoU2FmZUljb25zIiwiX2VzY2FwZUh0bWxDb250ZW50IiwiaWNvbnMiLCJpY29uSW5kZXgiLCJ0ZXh0V2l0aE5lc3RlZFBsYWNlaG9sZGVycyIsIl9leHRyYWN0TmVzdGVkSWNvbnMiLCJsZW5ndGgiLCJ0ZXh0V2l0aEFsbFBsYWNlaG9sZGVycyIsIl9leHRyYWN0U2ltcGxlSWNvbnMiLCJlc2NhcGVkIiwicmVwbGFjZSIsIm1hdGNoIiwiaW5kZXgiLCJzdGFydEluZGV4IiwibmVzdGVkSWNvblBhdHRlcm4iLCJvdXRlckNsYXNzTmFtZSIsImlubmVyQ29udGVudCIsIl9pc0NsYXNzTmFtZVNhZmUiLCJzYWZlSW5uZXJDb250ZW50IiwiX3Byb2Nlc3NJbm5lckljb25zIiwic2FmZU5lc3RlZEljb24iLCJzaW1wbGVJY29uUGF0dGVybiIsImNsYXNzTmFtZSIsImlubmVySWNvblBhdHRlcm4iLCJtYXRjaGVzIiwibWF0Y2hBbGwiLCJjb250ZW50V2l0aG91dEljb25zIiwidHJpbSIsInRlc3QiLCIkIiwiaHRtbCIsInNhbml0aXplQXR0cmlidXRlIiwic2FuaXRpemVGb3JEaXNwbGF5Iiwic3RyaWN0TW9kZSIsImNvbnRhaW5zRGFuZ2Vyb3VzUGF0dGVybnMiLCJpc1NhZmVGb3JEcm9wZG93biIsInNhbml0aXplRm9yRHJvcGRvd24iLCJzYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50IiwiZGFuZ2Vyb3VzUGF0dGVybnMiLCJwYXR0ZXJuIiwiRXh0ZW5zaW9ucyIsInNhbml0aXplRXh0ZW5zaW9uUmVwcmVzZW50IiwiY3JlYXRlU2FmZU9wdGlvbiIsInZhbHVlIiwic2FmZVZhbHVlIiwic2FmZVRleHQiLCJzZXRIdG1sQ29udGVudCIsImVsZW1lbnQiLCJjb250ZW50IiwiJGVsZW1lbnQiLCJzYWZlQ29udGVudCIsInNvbWUiLCJ0ZW1wVGV4dCIsIl9yZW1vdmVTYWZlSWNvbnMiLCJoYXNVbnNhZmVUYWdzIiwiY2xlYW5UZXh0IiwiZ2V0UHJvY2Vzc2luZ1N0YXRzIiwic2FmZVNpbXBsZUljb25zIiwic2FmZU5lc3RlZEljb25zIiwidG90YWxMZW5ndGgiLCJzaW1wbGVNYXRjaGVzIiwiZmlsdGVyIiwibmVzdGVkTWF0Y2hlcyIsImRlYnVnIiwiX2RlYnVnTG9nIiwibWVzc2FnZSIsImRhdGEiLCJjb25zb2xlIiwibG9nIiwiZXNjYXBlSHRtbFNhZmUiLCJ3YXJuIiwiZ2xvYmFsRGVidWdNb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQUEsTUFBTSxDQUFDQyxhQUFQLEdBQXVCO0FBRW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsT0FMVTs7QUFPbkI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQWpDbUIsc0JBaUNSQyxJQWpDUSxFQWlDa0I7QUFBQSxRQUFwQkMsVUFBb0IsdUVBQVAsS0FBTztBQUNqQyxRQUFJLENBQUNELElBQUwsRUFBVyxPQUFPLEVBQVA7O0FBRVgsUUFBSUMsVUFBSixFQUFnQjtBQUNaLGFBQU8sS0FBS0MscUJBQUwsQ0FBMkJGLElBQTNCLENBQVA7QUFDSCxLQUxnQyxDQU9qQzs7O0FBQ0EsV0FBTyxLQUFLRyxrQkFBTCxDQUF3QkgsSUFB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QixRQUFJLEtBQUtILEtBQUwsSUFBY0ksT0FBZCxJQUF5QkEsT0FBTyxDQUFDQyxHQUFyQyxFQUEwQztBQUN0Q0QsTUFBQUEsT0FBTyxDQUFDQyxHQUFSLDJCQUErQkgsT0FBL0IsR0FBMENDLElBQUksSUFBSSxFQUFsRDtBQUNIO0FBQ0o7QUFuZmtCLENBQXZCO0FBc2ZBO0FBQ0E7QUFDQTtBQUNBOztBQUNBeEUsTUFBTSxDQUFDMkUsY0FBUCxHQUF3QixVQUFTdkUsSUFBVCxFQUFtQztBQUFBLE1BQXBCQyxVQUFvQix1RUFBUCxLQUFPO0FBQ3ZEb0UsRUFBQUEsT0FBTyxDQUFDRyxJQUFSLENBQWEscUZBQWI7QUFDQSxTQUFPNUUsTUFBTSxDQUFDQyxhQUFQLENBQXFCRSxVQUFyQixDQUFnQ0MsSUFBaEMsRUFBc0NDLFVBQXRDLENBQVA7QUFDSCxDQUhELEMsQ0FLQTs7O0FBQ0EsSUFBSSxPQUFPd0UsZUFBUCxLQUEyQixXQUEzQixJQUEwQ0EsZUFBOUMsRUFBK0Q7QUFDM0Q3RSxFQUFBQSxNQUFNLENBQUNDLGFBQVAsQ0FBcUJvRSxLQUFyQixHQUE2QixJQUE3QjtBQUNILEMsQ0FFRDs7O0FBQ0FyRSxNQUFNLENBQUNDLGFBQVAsQ0FBcUJxRSxTQUFyQixDQUErQiwyQkFBL0IsRUFBNEQ7QUFDeERwRSxFQUFBQSxPQUFPLEVBQUVGLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQkMsT0FEMEI7QUFFeERtRSxFQUFBQSxLQUFLLEVBQUVyRSxNQUFNLENBQUNDLGFBQVAsQ0FBcUJvRTtBQUY0QixDQUE1RCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qKlxuICogR2xvYmFsIFNlY3VyaXR5IFV0aWxpdGllcyBmb3IgTWlrb1BCWCBBZG1pbiBDYWJpbmV0XG4gKiBcbiAqIFByb3ZpZGVzIHNlY3VyZSBIVE1MIGVzY2FwaW5nIHdpdGggc2VsZWN0aXZlIGljb24gc3VwcG9ydCBhY3Jvc3MgYWxsIG1vZHVsZXMuXG4gKiBJbXBsZW1lbnRzIERlZmVuc2UtaW4tRGVwdGggc3RyYXRlZ3kgYWdhaW5zdCBYU1MgYXR0YWNrcy5cbiAqIFxuICogQHZlcnNpb24gMS4wLjBcbiAqIEBhdXRob3IgTWlrb1BCWCBEZXZlbG9wbWVudCBUZWFtXG4gKi9cbndpbmRvdy5TZWN1cml0eVV0aWxzID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIFZlcnNpb24gZm9yIGNvbXBhdGliaWxpdHkgdHJhY2tpbmdcbiAgICAgKi9cbiAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhZmVseSBlc2NhcGUgSFRNTCB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgaWNvbiB0YWdzXG4gICAgICogXG4gICAgICogVGhpcyBmdW5jdGlvbiBpbXBsZW1lbnRzIGEgcGxhY2Vob2xkZXItYmFzZWQgYXBwcm9hY2ggdG8gYWxsb3cgc2FmZSBpY29uc1xuICAgICAqIHdoaWxlIHByb3RlY3RpbmcgYWdhaW5zdCBYU1MgYXR0YWNrcy4gU2FmZSBpY29ucyBhcmUgZXh0cmFjdGVkIGJlZm9yZVxuICAgICAqIEhUTUwgZXNjYXBpbmcgYW5kIHJlc3RvcmVkIGFmdGVyd2FyZHMuXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gYWxsb3dJY29ucyAtIFdoZXRoZXIgdG8gYWxsb3cgPGk+IHRhZ3MgZm9yIGljb25zIChkZWZhdWx0OiBmYWxzZSlcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTYWZlIEhUTUwgY29udGVudFxuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gQmFzaWMgSFRNTCBlc2NhcGluZ1xuICAgICAqIFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbCgnPHNjcmlwdD5hbGVydChcIlhTU1wiKTwvc2NyaXB0PicpXG4gICAgICogLy8gUmV0dXJuczogJyZsdDtzY3JpcHQmZ3Q7YWxlcnQoJnF1b3Q7WFNTJnF1b3Q7KSZsdDsvc2NyaXB0Jmd0OydcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFNhZmUgaWNvbiBwcmVzZXJ2YXRpb25cbiAgICAgKiBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoJ1NhbGVzIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4nLCB0cnVlKVxuICAgICAqIC8vIFJldHVybnM6ICdTYWxlcyA8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+J1xuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gRGFuZ2Vyb3VzIGljb24gYmxvY2tpbmdcbiAgICAgKiBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoJ1NhbGVzIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiIG9uY2xpY2s9XCJhbGVydCgxKVwiPjwvaT4nLCB0cnVlKVxuICAgICAqIC8vIFJldHVybnM6ICdTYWxlcyAmbHQ7aSBjbGFzcz0mcXVvdDtwaG9uZSBpY29uJnF1b3Q7IG9uY2xpY2s9JnF1b3Q7YWxlcnQoMSkmcXVvdDsmZ3Q7Jmx0Oy9pJmd0OydcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQsIGFsbG93SWNvbnMgPSBmYWxzZSkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIGlmIChhbGxvd0ljb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJvY2Vzc1dpdGhTYWZlSWNvbnModGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIG5vIGljb25zIGFsbG93ZWQsIGp1c3QgZXNjYXBlIGV2ZXJ5dGhpbmdcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KHRleHQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyB0ZXh0IHdpdGggc2FmZSBpY29uIGV4dHJhY3Rpb24gYW5kIHJlc3RvcmF0aW9uXG4gICAgICogXG4gICAgICogU3VwcG9ydHMgYm90aCBzaW1wbGUgaWNvbnMgYW5kIG5lc3RlZCBpY29uIHN0cnVjdHVyZXM6XG4gICAgICogLSBTaW1wbGU6IDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT5cbiAgICAgKiAtIE5lc3RlZDogPGkgY2xhc3M9XCJpY29uc1wiPjxpIGNsYXNzPVwidXNlciBvdXRsaW5lIGljb25cIj48L2k+PGkgY2xhc3M9XCJ0b3AgcmlnaHQgY29ybmVyIGFsdGVybmF0ZSBtb2JpbGUgaWNvblwiPjwvaT48L2k+XG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gcHJvY2Vzc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFByb2Nlc3NlZCBzYWZlIEhUTUxcbiAgICAgKi9cbiAgICBfcHJvY2Vzc1dpdGhTYWZlSWNvbnModGV4dCkge1xuICAgICAgICBjb25zdCBpY29ucyA9IFtdO1xuICAgICAgICBsZXQgaWNvbkluZGV4ID0gMDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpcnN0LCBleHRyYWN0IG5lc3RlZCBpY29uIHN0cnVjdHVyZXNcbiAgICAgICAgY29uc3QgdGV4dFdpdGhOZXN0ZWRQbGFjZWhvbGRlcnMgPSB0aGlzLl9leHRyYWN0TmVzdGVkSWNvbnModGV4dCwgaWNvbnMsIGljb25JbmRleCk7XG4gICAgICAgIGljb25JbmRleCA9IGljb25zLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIC8vIFRoZW4gZXh0cmFjdCBzaW1wbGUgaWNvbnMgZnJvbSByZW1haW5pbmcgdGV4dFxuICAgICAgICBjb25zdCB0ZXh0V2l0aEFsbFBsYWNlaG9sZGVycyA9IHRoaXMuX2V4dHJhY3RTaW1wbGVJY29ucyh0ZXh0V2l0aE5lc3RlZFBsYWNlaG9sZGVycywgaWNvbnMsIGljb25JbmRleCk7XG4gICAgICAgIFxuICAgICAgICAvLyBFc2NhcGUgYWxsIEhUTUwgaW4gdGV4dCB3aXRoIHBsYWNlaG9sZGVyc1xuICAgICAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQodGV4dFdpdGhBbGxQbGFjZWhvbGRlcnMpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVzdG9yZSBzYWZlIGljb25zIGJ5IHJlcGxhY2luZyBwbGFjZWhvbGRlcnNcbiAgICAgICAgcmV0dXJuIGVzY2FwZWQucmVwbGFjZSgvX19TQUZFX0lDT05fKFxcZCspX18vZywgKG1hdGNoLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGljb25zW2luZGV4XSB8fCAnJztcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgbmVzdGVkIGljb24gc3RydWN0dXJlcyBsaWtlIDxpIGNsYXNzPVwiaWNvbnNcIj4uLi48L2k+XG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gcHJvY2Vzc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGljb25zIC0gQXJyYXkgdG8gc3RvcmUgZm91bmQgaWNvbnNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnRJbmRleCAtIFN0YXJ0aW5nIGluZGV4IGZvciBwbGFjZWhvbGRlcnNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUZXh0IHdpdGggbmVzdGVkIGljb25zIHJlcGxhY2VkIGJ5IHBsYWNlaG9sZGVyc1xuICAgICAqL1xuICAgIF9leHRyYWN0TmVzdGVkSWNvbnModGV4dCwgaWNvbnMsIHN0YXJ0SW5kZXgpIHtcbiAgICAgICAgLy8gUGF0dGVybiB0byBtYXRjaCBuZXN0ZWQgaWNvbiBzdHJ1Y3R1cmVzOiA8aSBjbGFzcz1cImljb25zXCI+Li4uPC9pPlxuICAgICAgICBjb25zdCBuZXN0ZWRJY29uUGF0dGVybiA9IC88aVxccytjbGFzcz1cIihbXlwiPD5dKmljb25zW15cIjw+XSopXCI+KFtcXHNcXFNdKj8pPFxcL2k+L2dpO1xuICAgICAgICBsZXQgaWNvbkluZGV4ID0gc3RhcnRJbmRleDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UobmVzdGVkSWNvblBhdHRlcm4sIChtYXRjaCwgb3V0ZXJDbGFzc05hbWUsIGlubmVyQ29udGVudCkgPT4ge1xuICAgICAgICAgICAgLy8gVmFsaWRhdGUgb3V0ZXIgY2xhc3MgaXMgc2FmZVxuICAgICAgICAgICAgaWYgKCF0aGlzLl9pc0NsYXNzTmFtZVNhZmUob3V0ZXJDbGFzc05hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KG1hdGNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRXh0cmFjdCBhbmQgdmFsaWRhdGUgaW5uZXIgaWNvbnNcbiAgICAgICAgICAgIGNvbnN0IHNhZmVJbm5lckNvbnRlbnQgPSB0aGlzLl9wcm9jZXNzSW5uZXJJY29ucyhpbm5lckNvbnRlbnQpO1xuICAgICAgICAgICAgaWYgKHNhZmVJbm5lckNvbnRlbnQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBhbnkgaW5uZXIgaWNvbiBpcyB1bnNhZmUsIGVzY2FwZSB0aGUgd2hvbGUgc3RydWN0dXJlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KG1hdGNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVjb25zdHJ1Y3Qgc2FmZSBuZXN0ZWQgaWNvblxuICAgICAgICAgICAgY29uc3Qgc2FmZU5lc3RlZEljb24gPSBgPGkgY2xhc3M9XCIke291dGVyQ2xhc3NOYW1lfVwiPiR7c2FmZUlubmVyQ29udGVudH08L2k+YDtcbiAgICAgICAgICAgIGljb25zW2ljb25JbmRleF0gPSBzYWZlTmVzdGVkSWNvbjtcbiAgICAgICAgICAgIHJldHVybiBgX19TQUZFX0lDT05fJHtpY29uSW5kZXgrK31fX2A7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IHNpbXBsZSBpY29uIHN0cnVjdHVyZXMgbGlrZSA8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+XG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gcHJvY2Vzc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGljb25zIC0gQXJyYXkgdG8gc3RvcmUgZm91bmQgaWNvbnNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnRJbmRleCAtIFN0YXJ0aW5nIGluZGV4IGZvciBwbGFjZWhvbGRlcnNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUZXh0IHdpdGggc2ltcGxlIGljb25zIHJlcGxhY2VkIGJ5IHBsYWNlaG9sZGVyc1xuICAgICAqL1xuICAgIF9leHRyYWN0U2ltcGxlSWNvbnModGV4dCwgaWNvbnMsIHN0YXJ0SW5kZXgpIHtcbiAgICAgICAgLy8gUGF0dGVybiB0byBtYXRjaCBzaW1wbGUgaWNvbiB0YWdzOiA8aSBjbGFzcz1cIi4uLlwiPjwvaT5cbiAgICAgICAgY29uc3Qgc2ltcGxlSWNvblBhdHRlcm4gPSAvPGlcXHMrY2xhc3M9XCIoW15cIjw+XSopXCI+XFxzKjxcXC9pPi9naTtcbiAgICAgICAgbGV0IGljb25JbmRleCA9IHN0YXJ0SW5kZXg7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGV4dC5yZXBsYWNlKHNpbXBsZUljb25QYXR0ZXJuLCAobWF0Y2gsIGNsYXNzTmFtZSkgPT4ge1xuICAgICAgICAgICAgLy8gVmFsaWRhdGUgY2xhc3MgYXR0cmlidXRlIGNvbnRhaW5zIG9ubHkgc2FmZSBjaGFyYWN0ZXJzXG4gICAgICAgICAgICBpZiAodGhpcy5faXNDbGFzc05hbWVTYWZlKGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgICAgICBpY29uc1tpY29uSW5kZXhdID0gbWF0Y2g7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGBfX1NBRkVfSUNPTl8ke2ljb25JbmRleCsrfV9fYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIGNsYXNzIGlzIG5vdCBzYWZlLCBlc2NhcGUgdGhlIHdob2xlIHRhZ1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KG1hdGNoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgaW5uZXIgaWNvbnMgd2l0aGluIG5lc3RlZCBzdHJ1Y3R1cmVzXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW5uZXJDb250ZW50IC0gSW5uZXIgY29udGVudCB0byBwcm9jZXNzXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBTYWZlIGlubmVyIGNvbnRlbnQgb3IgbnVsbCBpZiB1bnNhZmVcbiAgICAgKi9cbiAgICBfcHJvY2Vzc0lubmVySWNvbnMoaW5uZXJDb250ZW50KSB7XG4gICAgICAgIC8vIFBhdHRlcm4gdG8gbWF0Y2ggaW5uZXIgaWNvbnNcbiAgICAgICAgY29uc3QgaW5uZXJJY29uUGF0dGVybiA9IC88aVxccytjbGFzcz1cIihbXlwiPD5dKilcIj5cXHMqPFxcL2k+L2dpO1xuICAgICAgICBjb25zdCBtYXRjaGVzID0gWy4uLmlubmVyQ29udGVudC5tYXRjaEFsbChpbm5lckljb25QYXR0ZXJuKV07XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGF0ZSBhbGwgaW5uZXIgaWNvbnMgYXJlIHNhZmVcbiAgICAgICAgZm9yIChjb25zdCBtYXRjaCBvZiBtYXRjaGVzKSB7XG4gICAgICAgICAgICBjb25zdCBjbGFzc05hbWUgPSBtYXRjaFsxXTtcbiAgICAgICAgICAgIGlmICghdGhpcy5faXNDbGFzc05hbWVTYWZlKGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDsgLy8gVW5zYWZlIGlubmVyIGljb24gZm91bmRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUncyBhbnkgY29udGVudCBvdGhlciB0aGFuIHNhZmUgaWNvbnMgYW5kIHdoaXRlc3BhY2VcbiAgICAgICAgY29uc3QgY29udGVudFdpdGhvdXRJY29ucyA9IGlubmVyQ29udGVudC5yZXBsYWNlKGlubmVySWNvblBhdHRlcm4sICcnKS50cmltKCk7XG4gICAgICAgIGlmIChjb250ZW50V2l0aG91dEljb25zICE9PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7IC8vIENvbnRhaW5zIG5vbi1pY29uIGNvbnRlbnRcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGlubmVyQ29udGVudDsgLy8gQWxsIGlubmVyIGljb25zIGFyZSBzYWZlXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSBpZiBjbGFzcyBuYW1lIGNvbnRhaW5zIG9ubHkgc2FmZSBjaGFyYWN0ZXJzXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2xhc3NOYW1lIC0gQ1NTIGNsYXNzIG5hbWUgdG8gdmFsaWRhdGVcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBjbGFzcyBuYW1lIGlzIHNhZmVcbiAgICAgKi9cbiAgICBfaXNDbGFzc05hbWVTYWZlKGNsYXNzTmFtZSkge1xuICAgICAgICAvLyBBbGxvdyBvbmx5IGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzLCBzcGFjZXMsIGh5cGhlbnMsIGFuZCB1bmRlcnNjb3Jlc1xuICAgICAgICByZXR1cm4gL15bYS16QS1aMC05XFxzXFwtX10rJC8udGVzdChjbGFzc05hbWUpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgY29udGVudCB1c2luZyBqUXVlcnkncyBzYWZlIG1ldGhvZFxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEVzY2FwZWQgSFRNTFxuICAgICAqL1xuICAgIF9lc2NhcGVIdG1sQ29udGVudCh0ZXh0KSB7XG4gICAgICAgIHJldHVybiAkKCc8ZGl2PicpLnRleHQodGV4dCkuaHRtbCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgdGV4dCBmb3IgdXNlIGluIEhUTUwgYXR0cmlidXRlc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBzYW5pdGl6ZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhbml0aXplZCB0ZXh0IHNhZmUgZm9yIGF0dHJpYnV0ZXNcbiAgICAgKiBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUoJ3ZhbHVlXCJvbmNsaWNrPVwiYWxlcnQoMSknKVxuICAgICAqIC8vIFJldHVybnM6ICd2YWx1ZSZxdW90O29uY2xpY2s9JnF1b3Q7YWxlcnQoMSknXG4gICAgICovXG4gICAgc2FuaXRpemVBdHRyaWJ1dGUodGV4dCkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiAnJztcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VzY2FwZUh0bWxDb250ZW50KHRleHQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgdGV4dCBmb3IgZGlzcGxheSB3aXRoIGNvbmZpZ3VyYWJsZSBzdHJpY3RuZXNzXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIHNhbml0aXplXG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdHJpY3RNb2RlIC0gSWYgdHJ1ZSwgdXNlcyBzdHJpY3QgdmFsaWRhdGlvbiBmb3IgdXNlciBpbnB1dC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJZiBmYWxzZSwgdXNlcyBsZXNzIHN0cmljdCB2YWxpZGF0aW9uIGZvciB0cnVzdGVkIEFQSSBjb250ZW50LlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhbml0aXplZCB0ZXh0XG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBTdHJpY3QgbW9kZSBmb3IgdXNlciBpbnB1dFxuICAgICAqIFNlY3VyaXR5VXRpbHMuc2FuaXRpemVGb3JEaXNwbGF5KCdVc2VyIDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4nLCB0cnVlKVxuICAgICAqIFxuICAgICAqIEBleGFtcGxlICBcbiAgICAgKiAvLyBMZXNzIHN0cmljdCBmb3IgQVBJIGNvbnRlbnRcbiAgICAgKiBTZWN1cml0eVV0aWxzLnNhbml0aXplRm9yRGlzcGxheSgnPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPiBVc2VyIE5hbWUnLCBmYWxzZSlcbiAgICAgKi9cbiAgICBzYW5pdGl6ZUZvckRpc3BsYXkodGV4dCwgc3RyaWN0TW9kZSA9IHRydWUpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgY2hlY2sgZm9yIGRhbmdlcm91cyBwYXR0ZXJucyBmaXJzdFxuICAgICAgICBpZiAodGhpcy5jb250YWluc0Rhbmdlcm91c1BhdHRlcm5zKHRleHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlSHRtbENvbnRlbnQodGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChzdHJpY3RNb2RlKSB7XG4gICAgICAgICAgICAvLyBTdHJpY3QgdmFsaWRhdGlvbjogb25seSBhbGxvdyBjb21wbGV0ZWx5IHNhZmUgY29udGVudFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNTYWZlRm9yRHJvcGRvd24odGV4dCkgPyBcbiAgICAgICAgICAgICAgICB0aGlzLmVzY2FwZUh0bWwodGV4dCwgdHJ1ZSkgOiBcbiAgICAgICAgICAgICAgICB0aGlzLl9lc2NhcGVIdG1sQ29udGVudCh0ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExlc3Mgc3RyaWN0OiBhbGxvdyBzYWZlIGljb25zIGZyb20gdHJ1c3RlZCBzb3VyY2VzXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lc2NhcGVIdG1sKHRleHQsIHRydWUpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhbml0aXplIHRleHQgZm9yIGRyb3Bkb3duIGRpc3BsYXkgKHN0cmljdCBtb2RlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBzYW5pdGl6ZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhbml0aXplZCB0ZXh0XG4gICAgICovXG4gICAgc2FuaXRpemVGb3JEcm9wZG93bih0ZXh0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNhbml0aXplRm9yRGlzcGxheSh0ZXh0LCB0cnVlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgRXh0ZW5zaW9ucyBBUEkgY29udGVudCB3aXRoIGVuaGFuY2VkIFhTUyBwcm90ZWN0aW9uIHdoaWxlIHByZXNlcnZpbmcgc2FmZSBpY29uc1xuICAgICAqIFxuICAgICAqIFRoaXMgbWV0aG9kIGNvbWJpbmVzIGFkdmFuY2VkIFhTUyBwYXR0ZXJuIGRldGVjdGlvbiB3aXRoIEV4dGVuc2lvbnMuc2FuaXRpemVFeHRlbnNpb25SZXByZXNlbnRcbiAgICAgKiB0byBwcm92aWRlIHRoZSBiZXN0IGJhbGFuY2UgYmV0d2VlbiBzZWN1cml0eSBhbmQgZnVuY3Rpb25hbGl0eSBmb3IgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9ucy5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gc2FuaXRpemVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTYW5pdGl6ZWQgdGV4dCB3aXRoIHByZXNlcnZlZCBzYWZlIGljb25zXG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBTYWZlIGljb25zIGFyZSBwcmVzZXJ2ZWRcbiAgICAgKiBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQoJzxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4gSm9obiBEb2UnKVxuICAgICAqIC8vIFJldHVybnM6ICc8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+IEpvaG4gRG9lJ1xuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gWFNTIGF0dGFja3MgYXJlIGJsb2NrZWRcbiAgICAgKiBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQoJzxzY3JpcHQ+YWxlcnQoXCJYU1NcIik8L3NjcmlwdD4nKVxuICAgICAqIC8vIFJldHVybnM6ICcmbHQ7c2NyaXB0Jmd0O2FsZXJ0KCZxdW90O1hTUyZxdW90OykmbHQ7L3NjcmlwdCZndDsnXG4gICAgICovXG4gICAgc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCh0ZXh0KSB7XG4gICAgICAgIGlmICghdGV4dCkgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5oYW5jZWQgZGFuZ2Vyb3VzIHBhdHRlcm5zIHNwZWNpZmljYWxseSBmb3IgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICBjb25zdCBkYW5nZXJvdXNQYXR0ZXJucyA9IFtcbiAgICAgICAgICAgIC88c2NyaXB0W1xcc1xcU10qPzxcXC9zY3JpcHQ+L2dpLFxuICAgICAgICAgICAgLzxpZnJhbWVbXFxzXFxTXSo/PFxcL2lmcmFtZT4vZ2ksXG4gICAgICAgICAgICAvPG9iamVjdFtcXHNcXFNdKj88XFwvb2JqZWN0Pi9naSxcbiAgICAgICAgICAgIC88ZW1iZWRbXFxzXFxTXSo/Pi9naSxcbiAgICAgICAgICAgIC88Zm9ybVtcXHNcXFNdKj88XFwvZm9ybT4vZ2ksXG4gICAgICAgICAgICAvPGltZ1tcXHNcXFNdKj8+L2dpLFxuICAgICAgICAgICAgLzxzdmdbXFxzXFxTXSo/PFxcL3N2Zz4vZ2ksXG4gICAgICAgICAgICAvPGxpbmtbXFxzXFxTXSo/Pi9naSxcbiAgICAgICAgICAgIC88bWV0YVtcXHNcXFNdKj8+L2dpLFxuICAgICAgICAgICAgLzxzdHlsZVtcXHNcXFNdKj88XFwvc3R5bGU+L2dpLFxuICAgICAgICAgICAgL2phdmFzY3JpcHQ6L2dpLFxuICAgICAgICAgICAgL2RhdGE6dGV4dFxcL2h0bWwvZ2ksXG4gICAgICAgICAgICAvb25cXHcrXFxzKj0vZ2ksIC8vIEV2ZW50IGhhbmRsZXJzIGxpa2Ugb25jbGljaywgb25sb2FkLCBldGMuXG4gICAgICAgICAgICAvZXhwcmVzc2lvblxccypcXCgvZ2ksIC8vIENTUyBleHByZXNzaW9uc1xuICAgICAgICAgICAgL3VybFxccypcXChcXHMqamF2YXNjcmlwdDovZ2ksXG4gICAgICAgICAgICAvLyBBZGRpdGlvbmFsIHBhdHRlcm5zIHRvIGNhdGNoIHZhcmlvdXMgWFNTIGF0dGVtcHRzXG4gICAgICAgICAgICAvPHNjcmlwdFxcYi9naSwgLy8gU2NyaXB0IHRhZ3MgKGV2ZW4gd2l0aG91dCBjbG9zaW5nKVxuICAgICAgICAgICAgL2FsZXJ0XFxzKlxcKC9naSwgLy8gQWxlcnQgZnVuY3Rpb24gY2FsbHNcbiAgICAgICAgICAgIC9vbmVycm9yXFxzKj0vZ2ksIC8vIFNwZWNpZmljIG9uZXJyb3IgaGFuZGxlclxuICAgICAgICAgICAgL3NyY1xccyo9XFxzKnhcXGIvZ2ksIC8vIENvbW1vbiBYU1MgcGF0dGVybiBzcmM9eCBcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGFueSBkYW5nZXJvdXMgcGF0dGVybiBpcyBmb3VuZCwgZXNjYXBlIGFsbCBIVE1MXG4gICAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBkYW5nZXJvdXNQYXR0ZXJucykge1xuICAgICAgICAgICAgaWYgKHBhdHRlcm4udGVzdCh0ZXh0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9lc2NhcGVIdG1sQ29udGVudCh0ZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gZGFuZ2Vyb3VzIHBhdHRlcm5zIGZvdW5kLCB1c2UgRXh0ZW5zaW9ucy5zYW5pdGl6ZUV4dGVuc2lvblJlcHJlc2VudFxuICAgICAgICAvLyB3aGljaCBwcm9wZXJseSBoYW5kbGVzIEhUTUwgZW50aXRpZXMgYW5kIHByZXNlcnZlcyBzYWZlIGljb25zXG4gICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgRXh0ZW5zaW9ucy5zYW5pdGl6ZUV4dGVuc2lvblJlcHJlc2VudCkge1xuICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuc2FuaXRpemVFeHRlbnNpb25SZXByZXNlbnQodGV4dCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZhbGxiYWNrOiBpZiBFeHRlbnNpb25zIGlzIG5vdCBhdmFpbGFibGUsIHVzZSBzdHJpY3QgZXNjYXBpbmcgd2l0aCBpY29uc1xuICAgICAgICByZXR1cm4gdGhpcy5lc2NhcGVIdG1sKHRleHQsIHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgc2FmZSBvcHRpb24gZWxlbWVudCBmb3IgZHJvcGRvd25zXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gT3B0aW9uIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBPcHRpb24gZGlzcGxheSB0ZXh0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdHJpY3RNb2RlIC0gV2hldGhlciB0byB1c2Ugc3RyaWN0IGZpbHRlcmluZyAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTYWZlIG9wdGlvbiBIVE1MXG4gICAgICovXG4gICAgY3JlYXRlU2FmZU9wdGlvbih2YWx1ZSwgdGV4dCwgc3RyaWN0TW9kZSA9IHRydWUpIHtcbiAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdGhpcy5zYW5pdGl6ZUF0dHJpYnV0ZSh2YWx1ZSk7XG4gICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gdGhpcy5zYW5pdGl6ZUZvckRpc3BsYXkodGV4dCwgc3RyaWN0TW9kZSk7XG4gICAgICAgIHJldHVybiBgPG9wdGlvbiB2YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7c2FmZVRleHR9PC9vcHRpb24+YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhZmVseSBzZXQgSFRNTCBjb250ZW50IG9mIGVsZW1lbnRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2pRdWVyeXxIVE1MRWxlbWVudH0gZWxlbWVudCAtIFRhcmdldCBlbGVtZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRlbnQgLSBDb250ZW50IHRvIHNldFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3RyaWN0TW9kZSAtIFdoZXRoZXIgdG8gdXNlIHN0cmljdCBmaWx0ZXJpbmcgKGRlZmF1bHQ6IHRydWUpXG4gICAgICovXG4gICAgc2V0SHRtbENvbnRlbnQoZWxlbWVudCwgY29udGVudCwgc3RyaWN0TW9kZSA9IHRydWUpIHtcbiAgICAgICAgY29uc3QgJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgICAgICBjb25zdCBzYWZlQ29udGVudCA9IHRoaXMuc2FuaXRpemVGb3JEaXNwbGF5KGNvbnRlbnQsIHN0cmljdE1vZGUpO1xuICAgICAgICAkZWxlbWVudC5odG1sKHNhZmVDb250ZW50KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIGlmIHN0cmluZyBjb250YWlucyBwb3RlbnRpYWxseSBkYW5nZXJvdXMgcGF0dGVybnNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gdmFsaWRhdGVcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0ZXh0IGNvbnRhaW5zIGRhbmdlcm91cyBwYXR0ZXJuc1xuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogU2VjdXJpdHlVdGlscy5jb250YWluc0Rhbmdlcm91c1BhdHRlcm5zKCc8c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+JylcbiAgICAgKiAvLyBSZXR1cm5zOiB0cnVlXG4gICAgICovXG4gICAgY29udGFpbnNEYW5nZXJvdXNQYXR0ZXJucyh0ZXh0KSB7XG4gICAgICAgIGlmICghdGV4dCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGFuZ2Vyb3VzUGF0dGVybnMgPSBbXG4gICAgICAgICAgICAvPHNjcmlwdFtcXHNcXFNdKj88XFwvc2NyaXB0Pi9naSxcbiAgICAgICAgICAgIC88aWZyYW1lW1xcc1xcU10qPzxcXC9pZnJhbWU+L2dpLFxuICAgICAgICAgICAgLzxvYmplY3RbXFxzXFxTXSo/PFxcL29iamVjdD4vZ2ksXG4gICAgICAgICAgICAvPGVtYmVkW1xcc1xcU10qPz4vZ2ksXG4gICAgICAgICAgICAvPGZvcm1bXFxzXFxTXSo/PFxcL2Zvcm0+L2dpLFxuICAgICAgICAgICAgL2phdmFzY3JpcHQ6L2dpLFxuICAgICAgICAgICAgL2RhdGE6dGV4dFxcL2h0bWwvZ2ksXG4gICAgICAgICAgICAvb25cXHcrXFxzKj0vZ2ksIC8vIEV2ZW50IGhhbmRsZXJzIGxpa2Ugb25jbGljaywgb25sb2FkLCBldGMuXG4gICAgICAgICAgICAvPGltZ1tePl0rb25lcnJvci9naSxcbiAgICAgICAgICAgIC88c3ZnW14+XSpvbmxvYWQvZ2ksXG4gICAgICAgICAgICAvPHN0eWxlW1xcc1xcU10qPzxcXC9zdHlsZT4vZ2ksXG4gICAgICAgICAgICAvPGxpbmtbXFxzXFxTXSo/Pi9naSxcbiAgICAgICAgICAgIC88bWV0YVtcXHNcXFNdKj8+L2dpLFxuICAgICAgICAgICAgL2V4cHJlc3Npb25cXHMqXFwoL2dpLCAvLyBDU1MgZXhwcmVzc2lvbnNcbiAgICAgICAgICAgIC91cmxcXHMqXFwoXFxzKmphdmFzY3JpcHQ6L2dpLFxuICAgICAgICAgICAgLzxcXC8/XFx3K1tePl0qXFxzK3NyY1xccyo9L2dpLCAvLyBUYWdzIHdpdGggc3JjIGF0dHJpYnV0ZSAoZXhjZXB0IGFsbG93ZWQpXG4gICAgICAgICAgICAvPFxcLz9cXHcrW14+XSpcXHMraHJlZlxccyo9L2dpLCAvLyBUYWdzIHdpdGggaHJlZiBhdHRyaWJ1dGUgKGV4Y2VwdCBhbGxvd2VkKVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGRhbmdlcm91c1BhdHRlcm5zLnNvbWUocGF0dGVybiA9PiBwYXR0ZXJuLnRlc3QodGV4dCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSBpZiB0ZXh0IGNvbnRhaW5zIG9ubHkgc2FmZSBpY29uIHN0cnVjdHVyZXMgYW5kIHJlZ3VsYXIgdGV4dFxuICAgICAqIFxuICAgICAqIFRoaXMgbWV0aG9kIGVuc3VyZXMgdGhhdCB0aGUgdGV4dCBjb250YWlucyBvbmx5OlxuICAgICAqIC0gUGxhaW4gdGV4dCBjb250ZW50XG4gICAgICogLSBTYWZlIHNpbXBsZSBpY29uczogPGkgY2xhc3M9XCIuLi5cIj48L2k+ICBcbiAgICAgKiAtIFNhZmUgbmVzdGVkIGljb25zOiA8aSBjbGFzcz1cImljb25zXCI+Li4uPC9pPlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byB2YWxpZGF0ZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRleHQgaXMgc2FmZSBmb3IgZHJvcGRvd24gZGlzcGxheVxuICAgICAqIFxuICAgICAqIEBleGFtcGxlXG4gICAgICogU2VjdXJpdHlVdGlscy5pc1NhZmVGb3JEcm9wZG93bignVXNlciA8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+JylcbiAgICAgKiAvLyBSZXR1cm5zOiB0cnVlXG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBTZWN1cml0eVV0aWxzLmlzU2FmZUZvckRyb3Bkb3duKCdVc2VyIDxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD4nKVxuICAgICAqIC8vIFJldHVybnM6IGZhbHNlXG4gICAgICovXG4gICAgaXNTYWZlRm9yRHJvcGRvd24odGV4dCkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGRhbmdlcm91cyBwYXR0ZXJucyBmaXJzdFxuICAgICAgICBpZiAodGhpcy5jb250YWluc0Rhbmdlcm91c1BhdHRlcm5zKHRleHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBhbGwgc2FmZSBpY29uIHN0cnVjdHVyZXMgYW5kIGNoZWNrIGlmIHJlbWFpbmluZyBjb250ZW50IGlzIHNhZmVcbiAgICAgICAgY29uc3QgdGVtcFRleHQgPSB0aGlzLl9yZW1vdmVTYWZlSWNvbnModGV4dCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZnRlciByZW1vdmluZyBzYWZlIGljb25zLCB0aGVyZSBzaG91bGQgb25seSBiZSBwbGFpbiB0ZXh0XG4gICAgICAgIC8vIENoZWNrIGZvciBhbnkgcmVtYWluaW5nIEhUTUwgdGFnc1xuICAgICAgICBjb25zdCBoYXNVbnNhZmVUYWdzID0gLzxbXj5dKz4vZy50ZXN0KHRlbXBUZXh0KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiAhaGFzVW5zYWZlVGFncztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGFsbCBzYWZlIGljb24gc3RydWN0dXJlcyBmcm9tIHRleHRcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBwcm9jZXNzXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGV4dCB3aXRoIHNhZmUgaWNvbnMgcmVtb3ZlZFxuICAgICAqL1xuICAgIF9yZW1vdmVTYWZlSWNvbnModGV4dCkge1xuICAgICAgICAvLyBGaXJzdCByZW1vdmUgbmVzdGVkIGljb25zXG4gICAgICAgIGxldCBjbGVhblRleHQgPSB0ZXh0LnJlcGxhY2UoLzxpXFxzK2NsYXNzPVwiKFteXCI8Pl0qaWNvbnNbXlwiPD5dKilcIj4oW1xcc1xcU10qPyk8XFwvaT4vZ2ksIChtYXRjaCwgb3V0ZXJDbGFzc05hbWUsIGlubmVyQ29udGVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzQ2xhc3NOYW1lU2FmZShvdXRlckNsYXNzTmFtZSkgJiYgdGhpcy5fcHJvY2Vzc0lubmVySWNvbnMoaW5uZXJDb250ZW50KSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJzsgLy8gUmVtb3ZlIHNhZmUgbmVzdGVkIGljb25cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtYXRjaDsgLy8gS2VlcCB1bnNhZmUgaWNvbiBmb3IgZnVydGhlciB2YWxpZGF0aW9uXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVGhlbiByZW1vdmUgc2ltcGxlIGljb25zXG4gICAgICAgIGNsZWFuVGV4dCA9IGNsZWFuVGV4dC5yZXBsYWNlKC88aVxccytjbGFzcz1cIihbXlwiPD5dKilcIj5cXHMqPFxcL2k+L2dpLCAobWF0Y2gsIGNsYXNzTmFtZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzQ2xhc3NOYW1lU2FmZShjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnOyAvLyBSZW1vdmUgc2FmZSBzaW1wbGUgaWNvblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1hdGNoOyAvLyBLZWVwIHVuc2FmZSBpY29uIGZvciBmdXJ0aGVyIHZhbGlkYXRpb25cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2xlYW5UZXh0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXRpc3RpY3MgYWJvdXQgc2FmZSBpY29uIHByb2Nlc3NpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gYW5hbHl6ZVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFN0YXRpc3RpY3Mgb2JqZWN0XG4gICAgICogXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBTZWN1cml0eVV0aWxzLmdldFByb2Nlc3NpbmdTdGF0cygnVGV4dCA8aSBjbGFzcz1cImljb25cIj48L2k+IDxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD4nKVxuICAgICAqIC8vIFJldHVybnM6IHsgc2FmZVNpbXBsZUljb25zOiAxLCBzYWZlTmVzdGVkSWNvbnM6IDAsIGRhbmdlcm91c1BhdHRlcm5zOiAxLCBpc1NhZmVGb3JEcm9wZG93bjogZmFsc2UsIHRvdGFsTGVuZ3RoOiA1NCB9XG4gICAgICovXG4gICAgZ2V0UHJvY2Vzc2luZ1N0YXRzKHRleHQpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4geyBcbiAgICAgICAgICAgIHNhZmVTaW1wbGVJY29uczogMCwgXG4gICAgICAgICAgICBzYWZlTmVzdGVkSWNvbnM6IDAsIFxuICAgICAgICAgICAgZGFuZ2Vyb3VzUGF0dGVybnM6IDAsIFxuICAgICAgICAgICAgaXNTYWZlRm9yRHJvcGRvd246IHRydWUsXG4gICAgICAgICAgICB0b3RhbExlbmd0aDogMCBcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvdW50IHNhZmUgc2ltcGxlIGljb25zXG4gICAgICAgIGNvbnN0IHNpbXBsZUljb25QYXR0ZXJuID0gLzxpXFxzK2NsYXNzPVwiKFteXCI8Pl0qKVwiPlxccyo8XFwvaT4vZ2k7XG4gICAgICAgIGNvbnN0IHNpbXBsZU1hdGNoZXMgPSBbLi4udGV4dC5tYXRjaEFsbChzaW1wbGVJY29uUGF0dGVybildO1xuICAgICAgICBjb25zdCBzYWZlU2ltcGxlSWNvbnMgPSBzaW1wbGVNYXRjaGVzLmZpbHRlcihtYXRjaCA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGFzc05hbWUgPSBtYXRjaFsxXTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc0NsYXNzTmFtZVNhZmUoY2xhc3NOYW1lKTtcbiAgICAgICAgfSkubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgLy8gQ291bnQgc2FmZSBuZXN0ZWQgaWNvbnNcbiAgICAgICAgY29uc3QgbmVzdGVkSWNvblBhdHRlcm4gPSAvPGlcXHMrY2xhc3M9XCIoW15cIjw+XSppY29uc1teXCI8Pl0qKVwiPihbXFxzXFxTXSo/KTxcXC9pPi9naTtcbiAgICAgICAgY29uc3QgbmVzdGVkTWF0Y2hlcyA9IFsuLi50ZXh0Lm1hdGNoQWxsKG5lc3RlZEljb25QYXR0ZXJuKV07XG4gICAgICAgIGNvbnN0IHNhZmVOZXN0ZWRJY29ucyA9IG5lc3RlZE1hdGNoZXMuZmlsdGVyKG1hdGNoID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG91dGVyQ2xhc3NOYW1lID0gbWF0Y2hbMV07XG4gICAgICAgICAgICBjb25zdCBpbm5lckNvbnRlbnQgPSBtYXRjaFsyXTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc0NsYXNzTmFtZVNhZmUob3V0ZXJDbGFzc05hbWUpICYmIHRoaXMuX3Byb2Nlc3NJbm5lckljb25zKGlubmVyQ29udGVudCkgIT09IG51bGw7XG4gICAgICAgIH0pLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRhbmdlcm91c1BhdHRlcm5zID0gdGhpcy5jb250YWluc0Rhbmdlcm91c1BhdHRlcm5zKHRleHQpID8gMSA6IDA7XG4gICAgICAgIGNvbnN0IGlzU2FmZUZvckRyb3Bkb3duID0gdGhpcy5pc1NhZmVGb3JEcm9wZG93bih0ZXh0KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzYWZlU2ltcGxlSWNvbnMsXG4gICAgICAgICAgICBzYWZlTmVzdGVkSWNvbnMsXG4gICAgICAgICAgICBkYW5nZXJvdXNQYXR0ZXJucyxcbiAgICAgICAgICAgIGlzU2FmZUZvckRyb3Bkb3duLFxuICAgICAgICAgICAgdG90YWxMZW5ndGg6IHRleHQubGVuZ3RoXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWJ1ZyBtb2RlIGZsYWcgZm9yIGRldmVsb3BtZW50XG4gICAgICovXG4gICAgZGVidWc6IGZhbHNlLFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvZyBzZWN1cml0eSBwcm9jZXNzaW5nIGluZm9ybWF0aW9uIChvbmx5IGluIGRlYnVnIG1vZGUpXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIERlYnVnIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0geyp9IGRhdGEgLSBBZGRpdGlvbmFsIGRhdGEgdG8gbG9nXG4gICAgICovXG4gICAgX2RlYnVnTG9nKG1lc3NhZ2UsIGRhdGEgPSBudWxsKSB7XG4gICAgICAgIGlmICh0aGlzLmRlYnVnICYmIGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbU2VjdXJpdHlVdGlsc10gJHttZXNzYWdlfWAsIGRhdGEgfHwgJycpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBMZWdhY3kgY29tcGF0aWJpbGl0eSAtIHByb3ZpZGUgb2xkIGZ1bmN0aW9uIG5hbWVzXG4gKiBAZGVwcmVjYXRlZCBVc2UgU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sIGluc3RlYWRcbiAqL1xud2luZG93LmVzY2FwZUh0bWxTYWZlID0gZnVuY3Rpb24odGV4dCwgYWxsb3dJY29ucyA9IGZhbHNlKSB7XG4gICAgY29uc29sZS53YXJuKCdbU2VjdXJpdHlVdGlsc10gZXNjYXBlSHRtbFNhZmUgaXMgZGVwcmVjYXRlZC4gVXNlIFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbCBpbnN0ZWFkLicpO1xuICAgIHJldHVybiB3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHRleHQsIGFsbG93SWNvbnMpO1xufTtcblxuLy8gSW5pdGlhbGl6ZSBkZWJ1ZyBtb2RlIGJhc2VkIG9uIGVudmlyb25tZW50XG5pZiAodHlwZW9mIGdsb2JhbERlYnVnTW9kZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZ2xvYmFsRGVidWdNb2RlKSB7XG4gICAgd2luZG93LlNlY3VyaXR5VXRpbHMuZGVidWcgPSB0cnVlO1xufVxuXG4vLyBMb2cgaW5pdGlhbGl6YXRpb24gaW4gZGVidWcgbW9kZVxud2luZG93LlNlY3VyaXR5VXRpbHMuX2RlYnVnTG9nKCdTZWN1cml0eVV0aWxzIGluaXRpYWxpemVkJywge1xuICAgIHZlcnNpb246IHdpbmRvdy5TZWN1cml0eVV0aWxzLnZlcnNpb24sXG4gICAgZGVidWc6IHdpbmRvdy5TZWN1cml0eVV0aWxzLmRlYnVnXG59KTsiXX0=