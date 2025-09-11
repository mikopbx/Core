"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

/* global $, globalTranslate, DynamicDropdownBuilder, SecurityUtils, Form */

/**
 * ExtensionSelector - Extension-specific wrapper over DynamicDropdownBuilder
 * 
 * This component builds upon DynamicDropdownBuilder to provide extension-specific features:
 * - Support for extension types/categories (routing, internal, all, etc.)
 * - Proper HTML rendering for extension names with icons
 * - Extension exclusion functionality
 * - Optimized caching for extension data
 * - Full-text search capabilities
 * 
 * Usage:
 * ExtensionSelector.init('extension', {
 *     type: 'routing',              // Extension type (routing/internal/all)
 *     excludeExtensions: ['101'],   // Extensions to exclude
 *     includeEmpty: true,           // Include empty option
 *     onChange: (value) => { ... }  // Change callback
 * });
 * 
 * @module ExtensionSelector
 */
var ExtensionSelector = {
  /**
   * Active selector instances
   * @type {Map}
   */
  instances: new Map(),

  /**
   * Default configuration
   * @type {object}
   */
  defaults: {
    type: 'all',
    // Extension type (all/routing/internal/queue/etc.)
    excludeExtensions: [],
    // Extensions to exclude from list
    includeEmpty: false,
    // Include empty/none option
    placeholder: null,
    // Placeholder text (auto-detected)
    additionalClasses: [],
    // Additional CSS classes for dropdown
    onChange: null,
    // Change callback function
    onLoadComplete: null // Load complete callback

  },

  /**
   * Initialize extension selector
   * 
   * @param {string} fieldId - Field ID (e.g., 'extension')
   * @param {object} options - Configuration options
   * @returns {object|null} Selector instance
   */
  init: function init(fieldId) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    // Check if already initialized
    if (this.instances.has(fieldId)) {
      return this.instances.get(fieldId);
    } // Find hidden input element


    var $hiddenInput = $("#".concat(fieldId));

    if (!$hiddenInput.length) {
      console.warn("ExtensionSelector: Hidden input not found for field: ".concat(fieldId));
      return null;
    } // Merge options with defaults


    var config = _objectSpread(_objectSpread({}, this.defaults), options); // Get current value and represent text from data object if provided


    var currentValue = options.data && options.data[fieldId] || $hiddenInput.val() || '';
    var currentText = this.detectInitialText(fieldId, options.data) || config.placeholder; // Build API URL with parameters

    var apiUrl = '/pbxcore/api/extensions/getForSelect';
    var apiParams = {}; // Add type parameter

    if (config.type && config.type !== 'all') {
      apiParams.type = config.type;
    } // Add exclude parameter


    if (config.excludeExtensions && config.excludeExtensions.length > 0) {
      apiParams.exclude = config.excludeExtensions.join(',');
    } // Create dropdown configuration for DynamicDropdownBuilder


    var dropdownConfig = {
      apiUrl: apiUrl,
      apiParams: apiParams,
      placeholder: config.placeholder || this.getPlaceholderByType(config.type),
      // Custom response handler for extension-specific processing
      onResponse: function onResponse(response) {
        return _this.processExtensionResponse(response, config);
      },
      onChange: function onChange(value, text, $choice) {
        _this.handleSelectionChange(fieldId, value, text, $choice, config);
      }
    }; // Add empty option if needed

    if (config.includeEmpty) {
      dropdownConfig.emptyOption = {
        key: '',
        value: globalTranslate.ex_SelectExtension || 'Select extension'
      };
    } // Pass the original data object directly to DynamicDropdownBuilder
    // This ensures proper handling of existing values and their representations


    var dropdownData = options.data || {}; // Override template for proper HTML rendering

    dropdownConfig.templates = {
      menu: this.customDropdownMenu
    }; // Add default classes for extension dropdowns

    dropdownConfig.additionalClasses = ['search'].concat(_toConsumableArray(config.additionalClasses || []));
    DynamicDropdownBuilder.buildDropdown(fieldId, dropdownData, dropdownConfig); // Create instance

    var instance = {
      fieldId: fieldId,
      config: config,
      currentValue: currentValue,
      currentText: currentText,
      $hiddenInput: $hiddenInput
    }; // Store instance

    this.instances.set(fieldId, instance);
    return instance;
  },

  /**
   * Detect initial text from data object or dropdown
   * 
   * @param {string} fieldId - Field ID
   * @param {object} data - Data object with represent fields
   * @returns {string|null} Initial text
   */
  detectInitialText: function detectInitialText(fieldId, data) {
    if (data && data["".concat(fieldId, "_represent")]) {
      return data["".concat(fieldId, "_represent")];
    } // Try to get from existing dropdown text


    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      var $text = $dropdown.find('.text:not(.default)');

      if ($text.length && $text.text().trim()) {
        return $text.html();
      }
    }

    return null;
  },

  /**
   * Get appropriate placeholder text by extension type
   * 
   * @param {string} type - Extension type
   * @returns {string} Placeholder text
   */
  getPlaceholderByType: function getPlaceholderByType(type) {
    switch (type) {
      case 'routing':
        return globalTranslate.ex_SelectExtension || 'Select extension';

      case 'internal':
        return globalTranslate.ex_SelectInternalExtension || 'Select internal extension';

      case 'queue':
        return globalTranslate.ex_SelectQueueExtension || 'Select queue extension';

      default:
        return globalTranslate.ex_SelectExtension || 'Select extension';
    }
  },

  /**
   * Process API response for extension-specific formatting
   * 
   * @param {object} response - API response
   * @param {object} config - Configuration
   * @returns {object} Processed response
   */
  processExtensionResponse: function processExtensionResponse(response, config) {
    if ((response.result || response.success) && response.data && Array.isArray(response.data)) {
      var processedResults = response.data.map(function (item) {
        var displayText = item.represent || item.name || item.text || item.value; // Apply HTML sanitization for extension content with icons

        if (displayText && typeof SecurityUtils !== 'undefined') {
          displayText = SecurityUtils.sanitizeExtensionsApiContent(displayText);
        }

        return {
          value: item.value || item.id,
          text: displayText,
          name: displayText,
          type: item.type || '',
          typeLocalized: item.typeLocalized || '',
          disabled: item.disabled || false
        };
      });
      return {
        success: true,
        results: processedResults
      };
    }

    return {
      success: false,
      results: []
    };
  },

  /**
   * Handle dropdown selection change
   * 
   * @param {string} fieldId - Field ID
   * @param {string} value - Selected value
   * @param {string} text - Selected text
   * @param {jQuery} $choice - Selected choice element
   * @param {object} config - Configuration
   */
  handleSelectionChange: function handleSelectionChange(fieldId, value, text, $choice, config) {
    var instance = this.instances.get(fieldId);
    if (!instance) return; // Update instance state

    instance.currentValue = value;
    instance.currentText = text; // CRITICAL: Update hidden input field to maintain synchronization

    var $hiddenInput = $("#".concat(fieldId));

    if ($hiddenInput.length) {
      $hiddenInput.val(value);
    } // Call custom onChange if provided


    if (typeof config.onChange === 'function') {
      config.onChange(value, text, $choice);
    } // Notify form of changes


    if (typeof Form !== 'undefined' && Form.dataChanged) {
      Form.dataChanged();
    }
  },

  /**
   * Custom dropdown menu template with categories support
   * Synchronized with Extensions.customDropdownMenu logic for compatibility
   * 
   * @param {object} response - Response from API
   * @param {object} fields - Field configuration
   * @returns {string} HTML for dropdown menu
   */
  customDropdownMenu: function customDropdownMenu(response, fields) {
    var values = response[fields.values] || [];
    var html = '';
    var oldType = ''; // Use $.each for compatibility with original Extensions.customDropdownMenu

    $.each(values, function (index, option) {
      var value = option[fields.value] || '';
      var text = option[fields.text] || option[fields.name] || '';
      var type = option.type || '';
      var typeLocalized = option.typeLocalized || ''; // Add category header if type changed - exact same logic as Extensions.customDropdownMenu

      if (type !== oldType) {
        oldType = type;
        html += '<div class="divider"></div>';
        html += '\t<div class="header">';
        html += '\t<i class="tags icon"></i>';
        html += typeLocalized;
        html += '</div>';
      } // For Fomantic UI to work correctly with HTML content, data-text should contain the HTML
      // that will be displayed when the item is selected. Text is already sanitized in processExtensionResponse.


      var maybeText = text ? "data-text=\"".concat(text.replace(/"/g, '&quot;'), "\"") : '';
      var maybeDisabled = option.disabled ? 'disabled ' : '';
      html += "<div class=\"".concat(maybeDisabled, "item\" data-value=\"").concat(ExtensionSelector.escapeHtml(value), "\"").concat(maybeText, ">");
      html += text; // Text is already sanitized in processExtensionResponse

      html += '</div>';
    });
    return html;
  },

  /**
   * Set value programmatically
   * 
   * @param {string} fieldId - Field ID
   * @param {string} value - Value to set
   * @param {string} text - Display text (optional)
   */
  setValue: function setValue(fieldId, value) {
    var text = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var instance = this.instances.get(fieldId);

    if (!instance) {
      console.warn("ExtensionSelector: Instance not found for field: ".concat(fieldId));
      return;
    } // Use DynamicDropdownBuilder to set the value


    DynamicDropdownBuilder.setValue(fieldId, value); // Update instance state

    instance.currentValue = value;
    instance.currentText = text || '';
  },

  /**
   * Get current value
   * 
   * @param {string} fieldId - Field ID
   * @returns {string|null} Current value
   */
  getValue: function getValue(fieldId) {
    var instance = this.instances.get(fieldId);
    return instance ? instance.currentValue : null;
  },

  /**
   * Clear dropdown selection
   * 
   * @param {string} fieldId - Field ID
   */
  clear: function clear(fieldId) {
    var instance = this.instances.get(fieldId);

    if (instance) {
      // Use DynamicDropdownBuilder to clear
      DynamicDropdownBuilder.clear(fieldId); // Update instance state

      instance.currentValue = null;
      instance.currentText = null;
    }
  },

  /**
   * Refresh dropdown data
   * 
   * @param {string} fieldId - Field ID
   */
  refresh: function refresh(fieldId) {
    // Delegate to DynamicDropdownBuilder
    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      $dropdown.dropdown('refresh');
    }
  },

  /**
   * Clear cache for extensions API
   * Call this after extension operations (add/edit/delete)
   * @param {string} type - Optional: specific type to clear ('routing', 'internal', etc.)
   */
  clearCache: function clearCache() {
    var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

    if (type) {
      // Clear cache for specific type
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/extensions/getForSelect', {
        type: type
      });
    } else {
      // Clear all extensions cache
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/extensions/getForSelect');
    }
  },

  /**
   * Refresh all extension dropdowns on the page
   * This will force them to reload data from server
   * @param {string} type - Optional: specific type to refresh ('routing', 'internal', etc.)
   */
  refreshAll: function refreshAll() {
    var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    // Clear cache first
    this.clearCache(type); // Refresh each active instance

    this.instances.forEach(function (instance, fieldId) {
      if (!type || instance.config.type === type) {
        // Clear dropdown and reload
        DynamicDropdownBuilder.clear(fieldId); // Reinitialize dropdown to trigger new API request

        var $dropdown = $("#".concat(fieldId, "-dropdown"));

        if ($dropdown.length) {
          $dropdown.dropdown('refresh');
        }
      }
    });
  },

  /**
   * Update extension exclusion list for existing instance
   * 
   * @param {string} fieldId - Field ID
   * @param {Array} excludeExtensions - Extensions to exclude
   */
  updateExclusions: function updateExclusions(fieldId) {
    var excludeExtensions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var instance = this.instances.get(fieldId);

    if (!instance) {
      console.warn("ExtensionSelector: Instance not found for field: ".concat(fieldId));
      return;
    } // Update configuration


    instance.config.excludeExtensions = excludeExtensions; // Clear cache for this specific configuration

    var cacheKey = this.generateCacheKey(instance.config);
    DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/extensions/getForSelect', cacheKey); // Refresh dropdown

    this.refresh(fieldId);
  },

  /**
   * Generate cache key based on configuration
   * 
   * @param {object} config - Extension selector configuration
   * @returns {object} Cache key parameters
   */
  generateCacheKey: function generateCacheKey(config) {
    var cacheParams = {};

    if (config.type && config.type !== 'all') {
      cacheParams.type = config.type;
    }

    if (config.excludeExtensions && config.excludeExtensions.length > 0) {
      cacheParams.exclude = config.excludeExtensions.join(',');
    }

    return cacheParams;
  },

  /**
   * Destroy instance
   * 
   * @param {string} fieldId - Field ID
   */
  destroy: function destroy(fieldId) {
    var instance = this.instances.get(fieldId);

    if (instance) {
      // Remove from instances
      this.instances["delete"](fieldId);
    }
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml: function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}; // Export for use in other modules

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionSelector;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZXh0ZW5zaW9uLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5zdGFuY2VzIiwiTWFwIiwiZGVmYXVsdHMiLCJ0eXBlIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJpbmNsdWRlRW1wdHkiLCJwbGFjZWhvbGRlciIsImFkZGl0aW9uYWxDbGFzc2VzIiwib25DaGFuZ2UiLCJvbkxvYWRDb21wbGV0ZSIsImluaXQiLCJmaWVsZElkIiwib3B0aW9ucyIsImhhcyIsImdldCIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsImNvbmZpZyIsImN1cnJlbnRWYWx1ZSIsImRhdGEiLCJ2YWwiLCJjdXJyZW50VGV4dCIsImRldGVjdEluaXRpYWxUZXh0IiwiYXBpVXJsIiwiYXBpUGFyYW1zIiwiZXhjbHVkZSIsImpvaW4iLCJkcm9wZG93bkNvbmZpZyIsImdldFBsYWNlaG9sZGVyQnlUeXBlIiwib25SZXNwb25zZSIsInJlc3BvbnNlIiwicHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlIiwidmFsdWUiLCJ0ZXh0IiwiJGNob2ljZSIsImhhbmRsZVNlbGVjdGlvbkNoYW5nZSIsImVtcHR5T3B0aW9uIiwia2V5IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfU2VsZWN0RXh0ZW5zaW9uIiwiZHJvcGRvd25EYXRhIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW5zdGFuY2UiLCJzZXQiLCIkZHJvcGRvd24iLCIkdGV4dCIsImZpbmQiLCJ0cmltIiwiaHRtbCIsImV4X1NlbGVjdEludGVybmFsRXh0ZW5zaW9uIiwiZXhfU2VsZWN0UXVldWVFeHRlbnNpb24iLCJyZXN1bHQiLCJzdWNjZXNzIiwiQXJyYXkiLCJpc0FycmF5IiwicHJvY2Vzc2VkUmVzdWx0cyIsIm1hcCIsIml0ZW0iLCJkaXNwbGF5VGV4dCIsInJlcHJlc2VudCIsIm5hbWUiLCJTZWN1cml0eVV0aWxzIiwic2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCIsImlkIiwidHlwZUxvY2FsaXplZCIsImRpc2FibGVkIiwicmVzdWx0cyIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImZpZWxkcyIsInZhbHVlcyIsIm9sZFR5cGUiLCJlYWNoIiwiaW5kZXgiLCJvcHRpb24iLCJtYXliZVRleHQiLCJyZXBsYWNlIiwibWF5YmVEaXNhYmxlZCIsImVzY2FwZUh0bWwiLCJzZXRWYWx1ZSIsImdldFZhbHVlIiwiY2xlYXIiLCJyZWZyZXNoIiwiZHJvcGRvd24iLCJjbGVhckNhY2hlIiwiY2xlYXJDYWNoZUZvciIsInJlZnJlc2hBbGwiLCJmb3JFYWNoIiwidXBkYXRlRXhjbHVzaW9ucyIsImNhY2hlS2V5IiwiZ2VuZXJhdGVDYWNoZUtleSIsImNhY2hlUGFyYW1zIiwiZGVzdHJveSIsImRpdiIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInRleHRDb250ZW50IiwiaW5uZXJIVE1MIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxpQkFBaUIsR0FBRztBQUV0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsSUFBSUMsR0FBSixFQU5XOztBQVF0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUU7QUFDTkMsSUFBQUEsSUFBSSxFQUFFLEtBREE7QUFDb0I7QUFDMUJDLElBQUFB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c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIGdsb2JhbFRyYW5zbGF0ZSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgU2VjdXJpdHlVdGlscywgRm9ybSAqL1xuXG4vKipcbiAqIEV4dGVuc2lvblNlbGVjdG9yIC0gRXh0ZW5zaW9uLXNwZWNpZmljIHdyYXBwZXIgb3ZlciBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gKiBcbiAqIFRoaXMgY29tcG9uZW50IGJ1aWxkcyB1cG9uIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgdG8gcHJvdmlkZSBleHRlbnNpb24tc3BlY2lmaWMgZmVhdHVyZXM6XG4gKiAtIFN1cHBvcnQgZm9yIGV4dGVuc2lvbiB0eXBlcy9jYXRlZ29yaWVzIChyb3V0aW5nLCBpbnRlcm5hbCwgYWxsLCBldGMuKVxuICogLSBQcm9wZXIgSFRNTCByZW5kZXJpbmcgZm9yIGV4dGVuc2lvbiBuYW1lcyB3aXRoIGljb25zXG4gKiAtIEV4dGVuc2lvbiBleGNsdXNpb24gZnVuY3Rpb25hbGl0eVxuICogLSBPcHRpbWl6ZWQgY2FjaGluZyBmb3IgZXh0ZW5zaW9uIGRhdGFcbiAqIC0gRnVsbC10ZXh0IHNlYXJjaCBjYXBhYmlsaXRpZXNcbiAqIFxuICogVXNhZ2U6XG4gKiBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdleHRlbnNpb24nLCB7XG4gKiAgICAgdHlwZTogJ3JvdXRpbmcnLCAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIHR5cGUgKHJvdXRpbmcvaW50ZXJuYWwvYWxsKVxuICogICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbJzEwMSddLCAgIC8vIEV4dGVuc2lvbnMgdG8gZXhjbHVkZVxuICogICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSwgICAgICAgICAgIC8vIEluY2x1ZGUgZW1wdHkgb3B0aW9uXG4gKiAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4geyAuLi4gfSAgLy8gQ2hhbmdlIGNhbGxiYWNrXG4gKiB9KTtcbiAqIFxuICogQG1vZHVsZSBFeHRlbnNpb25TZWxlY3RvclxuICovXG5jb25zdCBFeHRlbnNpb25TZWxlY3RvciA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBY3RpdmUgc2VsZWN0b3IgaW5zdGFuY2VzXG4gICAgICogQHR5cGUge01hcH1cbiAgICAgKi9cbiAgICBpbnN0YW5jZXM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIHR5cGU6ICdhbGwnLCAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIHR5cGUgKGFsbC9yb3V0aW5nL2ludGVybmFsL3F1ZXVlL2V0Yy4pXG4gICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbXSwgICAgLy8gRXh0ZW5zaW9ucyB0byBleGNsdWRlIGZyb20gbGlzdFxuICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLCAgICAgIC8vIEluY2x1ZGUgZW1wdHkvbm9uZSBvcHRpb25cbiAgICAgICAgcGxhY2Vob2xkZXI6IG51bGwsICAgICAgICAvLyBQbGFjZWhvbGRlciB0ZXh0IChhdXRvLWRldGVjdGVkKVxuICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogW10sICAgIC8vIEFkZGl0aW9uYWwgQ1NTIGNsYXNzZXMgZm9yIGRyb3Bkb3duXG4gICAgICAgIG9uQ2hhbmdlOiBudWxsLCAgICAgICAgICAvLyBDaGFuZ2UgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgb25Mb2FkQ29tcGxldGU6IG51bGwsICAgIC8vIExvYWQgY29tcGxldGUgY2FsbGJhY2tcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRCAoZS5nLiwgJ2V4dGVuc2lvbicpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fG51bGx9IFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdChmaWVsZElkLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbml0aWFsaXplZFxuICAgICAgICBpZiAodGhpcy5pbnN0YW5jZXMuaGFzKGZpZWxkSWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGhpZGRlbiBpbnB1dCBlbGVtZW50XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgIGlmICghJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBFeHRlbnNpb25TZWxlY3RvcjogSGlkZGVuIGlucHV0IG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGRJZH1gKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNZXJnZSBvcHRpb25zIHdpdGggZGVmYXVsdHNcbiAgICAgICAgY29uc3QgY29uZmlnID0geyAuLi50aGlzLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY3VycmVudCB2YWx1ZSBhbmQgcmVwcmVzZW50IHRleHQgZnJvbSBkYXRhIG9iamVjdCBpZiBwcm92aWRlZFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YVtmaWVsZElkXSkgfHwgJGhpZGRlbklucHV0LnZhbCgpIHx8ICcnO1xuICAgICAgICBjb25zdCBjdXJyZW50VGV4dCA9IHRoaXMuZGV0ZWN0SW5pdGlhbFRleHQoZmllbGRJZCwgb3B0aW9ucy5kYXRhKSB8fCBjb25maWcucGxhY2Vob2xkZXI7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBBUEkgVVJMIHdpdGggcGFyYW1ldGVyc1xuICAgICAgICBsZXQgYXBpVXJsID0gJy9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldEZvclNlbGVjdCc7XG4gICAgICAgIGNvbnN0IGFwaVBhcmFtcyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHR5cGUgcGFyYW1ldGVyXG4gICAgICAgIGlmIChjb25maWcudHlwZSAmJiBjb25maWcudHlwZSAhPT0gJ2FsbCcpIHtcbiAgICAgICAgICAgIGFwaVBhcmFtcy50eXBlID0gY29uZmlnLnR5cGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBleGNsdWRlIHBhcmFtZXRlclxuICAgICAgICBpZiAoY29uZmlnLmV4Y2x1ZGVFeHRlbnNpb25zICYmIGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhcGlQYXJhbXMuZXhjbHVkZSA9IGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucy5qb2luKCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBjb25maWd1cmF0aW9uIGZvciBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duQ29uZmlnID0ge1xuICAgICAgICAgICAgYXBpVXJsOiBhcGlVcmwsXG4gICAgICAgICAgICBhcGlQYXJhbXM6IGFwaVBhcmFtcyxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBjb25maWcucGxhY2Vob2xkZXIgfHwgdGhpcy5nZXRQbGFjZWhvbGRlckJ5VHlwZShjb25maWcudHlwZSksXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEN1c3RvbSByZXNwb25zZSBoYW5kbGVyIGZvciBleHRlbnNpb24tc3BlY2lmaWMgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgb25SZXNwb25zZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlKHJlc3BvbnNlLCBjb25maWcpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCwgJGNob2ljZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2VsZWN0aW9uQ2hhbmdlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0LCAkY2hvaWNlLCBjb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlbXB0eSBvcHRpb24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChjb25maWcuaW5jbHVkZUVtcHR5KSB7XG4gICAgICAgICAgICBkcm9wZG93bkNvbmZpZy5lbXB0eU9wdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBrZXk6ICcnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0RXh0ZW5zaW9uIHx8ICdTZWxlY3QgZXh0ZW5zaW9uJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUGFzcyB0aGUgb3JpZ2luYWwgZGF0YSBvYmplY3QgZGlyZWN0bHkgdG8gRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgcHJvcGVyIGhhbmRsaW5nIG9mIGV4aXN0aW5nIHZhbHVlcyBhbmQgdGhlaXIgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duRGF0YSA9IG9wdGlvbnMuZGF0YSB8fCB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIE92ZXJyaWRlIHRlbXBsYXRlIGZvciBwcm9wZXIgSFRNTCByZW5kZXJpbmdcbiAgICAgICAgZHJvcGRvd25Db25maWcudGVtcGxhdGVzID0ge1xuICAgICAgICAgICAgbWVudTogdGhpcy5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkZWZhdWx0IGNsYXNzZXMgZm9yIGV4dGVuc2lvbiBkcm9wZG93bnNcbiAgICAgICAgZHJvcGRvd25Db25maWcuYWRkaXRpb25hbENsYXNzZXMgPSBbJ3NlYXJjaCcsIC4uLihjb25maWcuYWRkaXRpb25hbENsYXNzZXMgfHwgW10pXTtcbiAgICAgICAgXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihmaWVsZElkLCBkcm9wZG93bkRhdGEsIGRyb3Bkb3duQ29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBpbnN0YW5jZVxuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHtcbiAgICAgICAgICAgIGZpZWxkSWQsXG4gICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICBjdXJyZW50VmFsdWUsXG4gICAgICAgICAgICBjdXJyZW50VGV4dCxcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuc2V0KGZpZWxkSWQsIGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERldGVjdCBpbml0aWFsIHRleHQgZnJvbSBkYXRhIG9iamVjdCBvciBkcm9wZG93blxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgb2JqZWN0IHdpdGggcmVwcmVzZW50IGZpZWxkc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gSW5pdGlhbCB0ZXh0XG4gICAgICovXG4gICAgZGV0ZWN0SW5pdGlhbFRleHQoZmllbGRJZCwgZGF0YSkge1xuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhW2Ake2ZpZWxkSWR9X3JlcHJlc2VudGBdKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YVtgJHtmaWVsZElkfV9yZXByZXNlbnRgXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IHRvIGdldCBmcm9tIGV4aXN0aW5nIGRyb3Bkb3duIHRleHRcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Om5vdCguZGVmYXVsdCknKTtcbiAgICAgICAgICAgIGlmICgkdGV4dC5sZW5ndGggJiYgJHRleHQudGV4dCgpLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkdGV4dC5odG1sKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGFwcHJvcHJpYXRlIHBsYWNlaG9sZGVyIHRleHQgYnkgZXh0ZW5zaW9uIHR5cGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIEV4dGVuc2lvbiB0eXBlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUGxhY2Vob2xkZXIgdGV4dFxuICAgICAqL1xuICAgIGdldFBsYWNlaG9sZGVyQnlUeXBlKHR5cGUpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdyb3V0aW5nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdEV4dGVuc2lvbiB8fCAnU2VsZWN0IGV4dGVuc2lvbic7XG4gICAgICAgICAgICBjYXNlICdpbnRlcm5hbCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFRyYW5zbGF0ZS5leF9TZWxlY3RJbnRlcm5hbEV4dGVuc2lvbiB8fCAnU2VsZWN0IGludGVybmFsIGV4dGVuc2lvbic7XG4gICAgICAgICAgICBjYXNlICdxdWV1ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFRyYW5zbGF0ZS5leF9TZWxlY3RRdWV1ZUV4dGVuc2lvbiB8fCAnU2VsZWN0IHF1ZXVlIGV4dGVuc2lvbic7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0RXh0ZW5zaW9uIHx8ICdTZWxlY3QgZXh0ZW5zaW9uJztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBBUEkgcmVzcG9uc2UgZm9yIGV4dGVuc2lvbi1zcGVjaWZpYyBmb3JtYXR0aW5nXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBQcm9jZXNzZWQgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBwcm9jZXNzRXh0ZW5zaW9uUmVzcG9uc2UocmVzcG9uc2UsIGNvbmZpZykge1xuICAgICAgICBpZiAoKHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZS5zdWNjZXNzKSAmJiByZXNwb25zZS5kYXRhICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NlZFJlc3VsdHMgPSByZXNwb25zZS5kYXRhLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZGlzcGxheVRleHQgPSBpdGVtLnJlcHJlc2VudCB8fCBpdGVtLm5hbWUgfHwgaXRlbS50ZXh0IHx8IGl0ZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgSFRNTCBzYW5pdGl6YXRpb24gZm9yIGV4dGVuc2lvbiBjb250ZW50IHdpdGggaWNvbnNcbiAgICAgICAgICAgICAgICBpZiAoZGlzcGxheVRleHQgJiYgdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGRpc3BsYXlUZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUgfHwgaXRlbS5pZCxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZGlzcGxheVRleHQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGRpc3BsYXlUZXh0LFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGUgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGl0ZW0uZGlzYWJsZWQgfHwgZmFsc2VcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZXN1bHRzOiBwcm9jZXNzZWRSZXN1bHRzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLCBcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdIFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFNlbGVjdGVkIHRleHRcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGNob2ljZSAtIFNlbGVjdGVkIGNob2ljZSBlbGVtZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBoYW5kbGVTZWxlY3Rpb25DaGFuZ2UoZmllbGRJZCwgdmFsdWUsIHRleHQsICRjaG9pY2UsIGNvbmZpZykge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQ7XG4gICAgICAgIFxuICAgICAgICAvLyBDUklUSUNBTDogVXBkYXRlIGhpZGRlbiBpbnB1dCBmaWVsZCB0byBtYWludGFpbiBzeW5jaHJvbml6YXRpb25cbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGRJZH1gKTtcbiAgICAgICAgaWYgKCRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxsIGN1c3RvbSBvbkNoYW5nZSBpZiBwcm92aWRlZFxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vbkNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm90aWZ5IGZvcm0gb2YgY2hhbmdlc1xuICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uZGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGRyb3Bkb3duIG1lbnUgdGVtcGxhdGUgd2l0aCBjYXRlZ29yaWVzIHN1cHBvcnRcbiAgICAgKiBTeW5jaHJvbml6ZWQgd2l0aCBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSBsb2dpYyBmb3IgY29tcGF0aWJpbGl0eVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZpZWxkcyAtIEZpZWxkIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGZvciBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwgW107XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGxldCBvbGRUeXBlID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgJC5lYWNoIGZvciBjb21wYXRpYmlsaXR5IHdpdGggb3JpZ2luYWwgRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gb3B0aW9uW2ZpZWxkcy52YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gb3B0aW9uW2ZpZWxkcy50ZXh0XSB8fCBvcHRpb25bZmllbGRzLm5hbWVdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9IG9wdGlvbi50eXBlIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdHlwZUxvY2FsaXplZCA9IG9wdGlvbi50eXBlTG9jYWxpemVkIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgY2F0ZWdvcnkgaGVhZGVyIGlmIHR5cGUgY2hhbmdlZCAtIGV4YWN0IHNhbWUgbG9naWMgYXMgRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgICAgIGlmICh0eXBlICE9PSBvbGRUeXBlKSB7XG4gICAgICAgICAgICAgICAgb2xkVHlwZSA9IHR5cGU7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1xcdDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1xcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSB0eXBlTG9jYWxpemVkO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZvciBGb21hbnRpYyBVSSB0byB3b3JrIGNvcnJlY3RseSB3aXRoIEhUTUwgY29udGVudCwgZGF0YS10ZXh0IHNob3VsZCBjb250YWluIHRoZSBIVE1MXG4gICAgICAgICAgICAvLyB0aGF0IHdpbGwgYmUgZGlzcGxheWVkIHdoZW4gdGhlIGl0ZW0gaXMgc2VsZWN0ZWQuIFRleHQgaXMgYWxyZWFkeSBzYW5pdGl6ZWQgaW4gcHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlLlxuICAgICAgICAgICAgY29uc3QgbWF5YmVUZXh0ID0gdGV4dCA/IGBkYXRhLXRleHQ9XCIke3RleHQucmVwbGFjZSgvXCIvZywgJyZxdW90OycpfVwiYCA6ICcnO1xuICAgICAgICAgICAgY29uc3QgbWF5YmVEaXNhYmxlZCA9IG9wdGlvbi5kaXNhYmxlZCA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke0V4dGVuc2lvblNlbGVjdG9yLmVzY2FwZUh0bWwodmFsdWUpfVwiJHttYXliZVRleHR9PmA7XG4gICAgICAgICAgICBodG1sICs9IHRleHQ7IC8vIFRleHQgaXMgYWxyZWFkeSBzYW5pdGl6ZWQgaW4gcHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlXG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHZhbHVlIHByb2dyYW1tYXRpY2FsbHlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBEaXNwbGF5IHRleHQgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIHNldFZhbHVlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0ID0gbnVsbCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBFeHRlbnNpb25TZWxlY3RvcjogSW5zdGFuY2Ugbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB0byBzZXQgdGhlIHZhbHVlXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuc2V0VmFsdWUoZmllbGRJZCwgdmFsdWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQgfHwgJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCB2YWx1ZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRWYWx1ZShmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UgPyBpbnN0YW5jZS5jdXJyZW50VmFsdWUgOiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGNsZWFyKGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgLy8gVXNlIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgdG8gY2xlYXJcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXIoZmllbGRJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBpbnN0YW5jZSBzdGF0ZVxuICAgICAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBkcm9wZG93biBkYXRhXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIHJlZnJlc2goZmllbGRJZCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgY2FjaGUgZm9yIGV4dGVuc2lvbnMgQVBJXG4gICAgICogQ2FsbCB0aGlzIGFmdGVyIGV4dGVuc2lvbiBvcGVyYXRpb25zIChhZGQvZWRpdC9kZWxldGUpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBPcHRpb25hbDogc3BlY2lmaWMgdHlwZSB0byBjbGVhciAoJ3JvdXRpbmcnLCAnaW50ZXJuYWwnLCBldGMuKVxuICAgICAqL1xuICAgIGNsZWFyQ2FjaGUodHlwZSA9IG51bGwpIHtcbiAgICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgICAgIC8vIENsZWFyIGNhY2hlIGZvciBzcGVjaWZpYyB0eXBlXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyQ2FjaGVGb3IoJy9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldEZvclNlbGVjdCcsIHsgdHlwZSB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENsZWFyIGFsbCBleHRlbnNpb25zIGNhY2hlXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyQ2FjaGVGb3IoJy9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldEZvclNlbGVjdCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIGFsbCBleHRlbnNpb24gZHJvcGRvd25zIG9uIHRoZSBwYWdlXG4gICAgICogVGhpcyB3aWxsIGZvcmNlIHRoZW0gdG8gcmVsb2FkIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIE9wdGlvbmFsOiBzcGVjaWZpYyB0eXBlIHRvIHJlZnJlc2ggKCdyb3V0aW5nJywgJ2ludGVybmFsJywgZXRjLilcbiAgICAgKi9cbiAgICByZWZyZXNoQWxsKHR5cGUgPSBudWxsKSB7XG4gICAgICAgIC8vIENsZWFyIGNhY2hlIGZpcnN0XG4gICAgICAgIHRoaXMuY2xlYXJDYWNoZSh0eXBlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlZnJlc2ggZWFjaCBhY3RpdmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UsIGZpZWxkSWQpID0+IHtcbiAgICAgICAgICAgIGlmICghdHlwZSB8fCBpbnN0YW5jZS5jb25maWcudHlwZSA9PT0gdHlwZSkge1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIGFuZCByZWxvYWRcbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyKGZpZWxkSWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcm9wZG93biB0byB0cmlnZ2VyIG5ldyBBUEkgcmVxdWVzdFxuICAgICAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBleHRlbnNpb24gZXhjbHVzaW9uIGxpc3QgZm9yIGV4aXN0aW5nIGluc3RhbmNlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGV4Y2x1ZGVFeHRlbnNpb25zIC0gRXh0ZW5zaW9ucyB0byBleGNsdWRlXG4gICAgICovXG4gICAgdXBkYXRlRXhjbHVzaW9ucyhmaWVsZElkLCBleGNsdWRlRXh0ZW5zaW9ucyA9IFtdKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEV4dGVuc2lvblNlbGVjdG9yOiBJbnN0YW5jZSBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBjb25maWd1cmF0aW9uXG4gICAgICAgIGluc3RhbmNlLmNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucyA9IGV4Y2x1ZGVFeHRlbnNpb25zO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgY2FjaGUgZm9yIHRoaXMgc3BlY2lmaWMgY29uZmlndXJhdGlvblxuICAgICAgICBjb25zdCBjYWNoZUtleSA9IHRoaXMuZ2VuZXJhdGVDYWNoZUtleShpbnN0YW5jZS5jb25maWcpO1xuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyQ2FjaGVGb3IoJy9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldEZvclNlbGVjdCcsIGNhY2hlS2V5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlZnJlc2ggZHJvcGRvd25cbiAgICAgICAgdGhpcy5yZWZyZXNoKGZpZWxkSWQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgY2FjaGUga2V5IGJhc2VkIG9uIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gRXh0ZW5zaW9uIHNlbGVjdG9yIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBDYWNoZSBrZXkgcGFyYW1ldGVyc1xuICAgICAqL1xuICAgIGdlbmVyYXRlQ2FjaGVLZXkoY29uZmlnKSB7XG4gICAgICAgIGNvbnN0IGNhY2hlUGFyYW1zID0ge307XG4gICAgICAgIFxuICAgICAgICBpZiAoY29uZmlnLnR5cGUgJiYgY29uZmlnLnR5cGUgIT09ICdhbGwnKSB7XG4gICAgICAgICAgICBjYWNoZVBhcmFtcy50eXBlID0gY29uZmlnLnR5cGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChjb25maWcuZXhjbHVkZUV4dGVuc2lvbnMgJiYgY29uZmlnLmV4Y2x1ZGVFeHRlbnNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNhY2hlUGFyYW1zLmV4Y2x1ZGUgPSBjb25maWcuZXhjbHVkZUV4dGVuc2lvbnMuam9pbignLCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2FjaGVQYXJhbXM7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IGluc3RhbmNlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGRlc3Ryb3koZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAvLyBSZW1vdmUgZnJvbSBpbnN0YW5jZXNcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShmaWVsZElkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgdG8gcHJldmVudCBYU1NcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gZXNjYXBlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgZXNjYXBlSHRtbCh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBkaXYudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgICAgICByZXR1cm4gZGl2LmlubmVySFRNTDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEV4dGVuc2lvblNlbGVjdG9yO1xufSJdfQ==