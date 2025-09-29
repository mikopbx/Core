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
    var currentText = this.detectInitialText(fieldId, options.data) || config.placeholder; // Build API URL with parameters using v3 API

    var apiUrl = '/pbxcore/api/v3/extensions:getForSelect';
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
        value: globalTranslate.ex_SelectExtension
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
        return globalTranslate.ex_SelectExtension;

      case 'internal':
        return globalTranslate.ex_SelectInternalExtension;

      case 'queue':
        return globalTranslate.ex_SelectQueueExtension;

      default:
        return globalTranslate.ex_SelectExtension;
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
   * Synchronized with ExtensionsAPI.customDropdownMenu logic for compatibility
   * 
   * @param {object} response - Response from API
   * @param {object} fields - Field configuration
   * @returns {string} HTML for dropdown menu
   */
  customDropdownMenu: function customDropdownMenu(response, fields) {
    var values = response[fields.values] || [];
    var html = '';
    var oldType = ''; // Use $.each for compatibility with original ExtensionsAPI.customDropdownMenu

    $.each(values, function (index, option) {
      var value = option[fields.value] || '';
      var text = option[fields.text] || option[fields.name] || '';
      var type = option.type || '';
      var typeLocalized = option.typeLocalized || ''; // Add category header if type changed - exact same logic as ExtensionsAPI.customDropdownMenu

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
   * Set value programmatically with optional text
   * V5.0: Enhanced to support setting both value and display text
   *
   * @param {string} fieldId - Field ID
   * @param {string} value - Value to set
   * @param {string} text - Display text (optional, if provided will update display)
   */
  setValue: function setValue(fieldId, value) {
    var text = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var instance = this.instances.get(fieldId);

    if (!instance) {
      console.warn("ExtensionSelector: Instance not found for field: ".concat(fieldId));
      return;
    } // Update hidden input value


    var $hiddenInput = $("#".concat(fieldId));

    if ($hiddenInput.length) {
      $hiddenInput.val(value);
    } // Update dropdown display


    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      // Handle empty value specially
      if (value === '' || value === null) {
        // Clear the dropdown
        $dropdown.dropdown('clear');
        var $textElement = $dropdown.find('.text');

        if ($textElement.length) {
          // Add default class for placeholder style
          $textElement.addClass('default');
        }
      } // If text is provided, update both value and text
      else if (text !== null && text !== '') {
        // Create temporary menu item with the new text if it doesn't exist
        var $menu = $dropdown.find('.menu');
        var existingItem = $menu.find(".item[data-value=\"".concat(value, "\"]"));

        if (!existingItem.length && value !== '') {
          // Add temporary item for mobile number or other dynamic values
          var safeValue = this.escapeHtml(value);
          var safeText = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeExtensionsApiContent(text) : text;
          $menu.append("<div class=\"item\" data-value=\"".concat(safeValue, "\" data-text=\"").concat(safeText.replace(/"/g, '&quot;'), "\">").concat(safeText, "</div>"));
        } // Set selected value in dropdown


        $dropdown.dropdown('set selected', value); // Force text update if Semantic UI didn't pick it up

        var _$textElement = $dropdown.find('.text');

        if (_$textElement.length) {
          _$textElement.html(text); // Remove default class to show text as selected, not placeholder


          _$textElement.removeClass('default');
        }
      } else {
        // Just set the value, let dropdown handle text
        $dropdown.dropdown('set selected', value); // Remove default class if value is set

        var _$textElement2 = $dropdown.find('.text');

        if (_$textElement2.length) {
          _$textElement2.removeClass('default');
        }
      }
    } // Update instance state


    instance.currentValue = value;
    instance.currentText = text || ''; // Trigger change event for form processing

    $hiddenInput.trigger('change'); // Notify form of changes

    if (typeof Form !== 'undefined' && Form.dataChanged) {
      Form.dataChanged();
    }
  },

  /**
   * Set display text without changing value
   * V5.0: New method for updating display text only
   *
   * @param {string} fieldId - Field ID
   * @param {string} text - Display text to set
   */
  setText: function setText(fieldId, text) {
    var instance = this.instances.get(fieldId);

    if (!instance) {
      console.warn("ExtensionSelector: Instance not found for field: ".concat(fieldId));
      return;
    }

    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      var $textElement = $dropdown.find('.text');

      if ($textElement.length) {
        // Sanitize text before setting
        var safeText = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeExtensionsApiContent(text) : text;
        $textElement.html(safeText); // Remove default class to show text as selected, not placeholder

        $textElement.removeClass('default');
        instance.currentText = text;
      }
    }
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
      DynamicDropdownBuilder.clear(fieldId); // Add default class to show placeholder style

      var $dropdown = $("#".concat(fieldId, "-dropdown"));

      if ($dropdown.length) {
        var $textElement = $dropdown.find('.text');

        if ($textElement.length) {
          $textElement.addClass('default');
        }
      } // Update instance state


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
    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      // Check if dropdown is still attached to DOM before refreshing
      if ($.contains(document, $dropdown[0])) {
        // Temporarily disable animations to prevent DOM errors
        $dropdown.dropdown('hide');
        $dropdown.dropdown({
          silent: true
        });
        $dropdown.dropdown('refresh');
      }
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
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v3/extensions:getForSelect', {
        type: type
      });
    } else {
      // Clear all extensions cache
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v3/extensions:getForSelect');
    }
  },

  /**
   * Refresh all extension dropdowns on the page
   * This will force them to reload data from server
   * @param {string} type - Optional: specific type to refresh ('routing', 'internal', etc.)
   */
  refreshAll: function refreshAll() {
    var _this2 = this;

    var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    // Clear cache first
    this.clearCache(type); // Refresh each active instance

    this.instances.forEach(function (instance, fieldId) {
      if (!type || instance.config.type === type) {
        // Clear dropdown and reload
        DynamicDropdownBuilder.clear(fieldId); // Safely refresh dropdown

        _this2.refresh(fieldId);
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
    DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v3/extensions:getForSelect', cacheKey); // Refresh dropdown

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZXh0ZW5zaW9uLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5zdGFuY2VzIiwiTWFwIiwiZGVmYXVsdHMiLCJ0eXBlIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJpbmNsdWRlRW1wdHkiLCJwbGFjZWhvbGRlciIsImFkZGl0aW9uYWxDbGFzc2VzIiwib25DaGFuZ2UiLCJvbkxvYWRDb21wbGV0ZSIsImluaXQiLCJmaWVsZElkIiwib3B0aW9ucyIsImhhcyIsImdldCIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsImNvbmZpZyIsImN1cnJlbnRWYWx1ZSIsImRhdGEiLCJ2YWwiLCJjdXJyZW50VGV4dCIsImRldGVjdEluaXRpYWxUZXh0IiwiYXBpVXJsIiwiYXBpUGFyYW1zIiwiZXhjbHVkZSIsImpvaW4iLCJkcm9wZG93bkNvbmZpZyIsImdldFBsYWNlaG9sZGVyQnlUeXBlIiwib25SZXNwb25zZSIsInJlc3BvbnNlIiwicHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlIiwidmFsdWUiLCJ0ZXh0IiwiJGNob2ljZSIsImhhbmRsZVNlbGVjdGlvbkNoYW5nZSIsImVtcHR5T3B0aW9uIiwia2V5IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfU2VsZWN0RXh0ZW5zaW9uIiwiZHJvcGRvd25EYXRhIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW5zdGFuY2UiLCJzZXQiLCIkZHJvcGRvd24iLCIkdGV4dCIsImZpbmQiLCJ0cmltIiwiaHRtbCIsImV4X1NlbGVjdEludGVybmFsRXh0ZW5zaW9uIiwiZXhfU2VsZWN0UXVldWVFeHRlbnNpb24iLCJyZXN1bHQiLCJzdWNjZXNzIiwiQXJyYXkiLCJpc0FycmF5IiwicHJvY2Vzc2VkUmVzdWx0cyIsIm1hcCIsIml0ZW0iLCJkaXNwbGF5VGV4dCIsInJlcHJlc2VudCIsIm5hbWUiLCJTZWN1cml0eVV0aWxzIiwic2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCIsImlkIiwidHlwZUxvY2FsaXplZCIsImRpc2FibGVkIiwicmVzdWx0cyIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImZpZWxkcyIsInZhbHVlcyIsIm9sZFR5cGUiLCJlYWNoIiwiaW5kZXgiLCJvcHRpb24iLCJtYXliZVRleHQiLCJyZXBsYWNlIiwibWF5YmVEaXNhYmxlZCIsImVzY2FwZUh0bWwiLCJzZXRWYWx1ZSIsImRyb3Bkb3duIiwiJHRleHRFbGVtZW50IiwiYWRkQ2xhc3MiLCIkbWVudSIsImV4aXN0aW5nSXRlbSIsInNhZmVWYWx1ZSIsInNhZmVUZXh0IiwiYXBwZW5kIiwicmVtb3ZlQ2xhc3MiLCJ0cmlnZ2VyIiwic2V0VGV4dCIsImdldFZhbHVlIiwiY2xlYXIiLCJyZWZyZXNoIiwiY29udGFpbnMiLCJkb2N1bWVudCIsInNpbGVudCIsImNsZWFyQ2FjaGUiLCJjbGVhckNhY2hlRm9yIiwicmVmcmVzaEFsbCIsImZvckVhY2giLCJ1cGRhdGVFeGNsdXNpb25zIiwiY2FjaGVLZXkiLCJnZW5lcmF0ZUNhY2hlS2V5IiwiY2FjaGVQYXJhbXMiLCJkZXN0cm95IiwiZGl2IiwiY3JlYXRlRWxlbWVudCIsInRleHRDb250ZW50IiwiaW5uZXJIVE1MIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxpQkFBaUIsR0FBRztBQUV0QjtBQUNKO0FB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QUNDLE9BQVAsR0FBaUJ2SCxpQkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxUcmFuc2xhdGUsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIFNlY3VyaXR5VXRpbHMsIEZvcm0gKi9cblxuLyoqXG4gKiBFeHRlbnNpb25TZWxlY3RvciAtIEV4dGVuc2lvbi1zcGVjaWZpYyB3cmFwcGVyIG92ZXIgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICogXG4gKiBUaGlzIGNvbXBvbmVudCBidWlsZHMgdXBvbiBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHRvIHByb3ZpZGUgZXh0ZW5zaW9uLXNwZWNpZmljIGZlYXR1cmVzOlxuICogLSBTdXBwb3J0IGZvciBleHRlbnNpb24gdHlwZXMvY2F0ZWdvcmllcyAocm91dGluZywgaW50ZXJuYWwsIGFsbCwgZXRjLilcbiAqIC0gUHJvcGVyIEhUTUwgcmVuZGVyaW5nIGZvciBleHRlbnNpb24gbmFtZXMgd2l0aCBpY29uc1xuICogLSBFeHRlbnNpb24gZXhjbHVzaW9uIGZ1bmN0aW9uYWxpdHlcbiAqIC0gT3B0aW1pemVkIGNhY2hpbmcgZm9yIGV4dGVuc2lvbiBkYXRhXG4gKiAtIEZ1bGwtdGV4dCBzZWFyY2ggY2FwYWJpbGl0aWVzXG4gKiBcbiAqIFVzYWdlOlxuICogRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uJywge1xuICogICAgIHR5cGU6ICdyb3V0aW5nJywgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiB0eXBlIChyb3V0aW5nL2ludGVybmFsL2FsbClcbiAqICAgICBleGNsdWRlRXh0ZW5zaW9uczogWycxMDEnXSwgICAvLyBFeHRlbnNpb25zIHRvIGV4Y2x1ZGVcbiAqICAgICBpbmNsdWRlRW1wdHk6IHRydWUsICAgICAgICAgICAvLyBJbmNsdWRlIGVtcHR5IG9wdGlvblxuICogICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHsgLi4uIH0gIC8vIENoYW5nZSBjYWxsYmFja1xuICogfSk7IFxuICogXG4gKiBAbW9kdWxlIEV4dGVuc2lvblNlbGVjdG9yXG4gKi9cbmNvbnN0IEV4dGVuc2lvblNlbGVjdG9yID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEFjdGl2ZSBzZWxlY3RvciBpbnN0YW5jZXNcbiAgICAgKiBAdHlwZSB7TWFwfVxuICAgICAqL1xuICAgIGluc3RhbmNlczogbmV3IE1hcCgpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgdHlwZTogJ2FsbCcsICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gdHlwZSAoYWxsL3JvdXRpbmcvaW50ZXJuYWwvcXVldWUvZXRjLilcbiAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtdLCAgICAvLyBFeHRlbnNpb25zIHRvIGV4Y2x1ZGUgZnJvbSBsaXN0XG4gICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsICAgICAgLy8gSW5jbHVkZSBlbXB0eS9ub25lIG9wdGlvblxuICAgICAgICBwbGFjZWhvbGRlcjogbnVsbCwgICAgICAgIC8vIFBsYWNlaG9sZGVyIHRleHQgKGF1dG8tZGV0ZWN0ZWQpXG4gICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbXSwgICAgLy8gQWRkaXRpb25hbCBDU1MgY2xhc3NlcyBmb3IgZHJvcGRvd25cbiAgICAgICAgb25DaGFuZ2U6IG51bGwsICAgICAgICAgIC8vIENoYW5nZSBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICBvbkxvYWRDb21wbGV0ZTogbnVsbCwgICAgLy8gTG9hZCBjb21wbGV0ZSBjYWxsYmFja1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEIChlLmcuLCAnZXh0ZW5zaW9uJylcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R8bnVsbH0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0KGZpZWxkSWQsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluaXRpYWxpemVkXG4gICAgICAgIGlmICh0aGlzLmluc3RhbmNlcy5oYXMoZmllbGRJZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgaGlkZGVuIGlucHV0IGVsZW1lbnRcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGRJZH1gKTtcbiAgICAgICAgaWYgKCEkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEV4dGVuc2lvblNlbGVjdG9yOiBIaWRkZW4gaW5wdXQgbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE1lcmdlIG9wdGlvbnMgd2l0aCBkZWZhdWx0c1xuICAgICAgICBjb25zdCBjb25maWcgPSB7IC4uLnRoaXMuZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlIGFuZCByZXByZXNlbnQgdGV4dCBmcm9tIGRhdGEgb2JqZWN0IGlmIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhW2ZpZWxkSWRdKSB8fCAkaGlkZGVuSW5wdXQudmFsKCkgfHwgJyc7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gdGhpcy5kZXRlY3RJbml0aWFsVGV4dChmaWVsZElkLCBvcHRpb25zLmRhdGEpIHx8IGNvbmZpZy5wbGFjZWhvbGRlcjtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIEFQSSBVUkwgd2l0aCBwYXJhbWV0ZXJzIHVzaW5nIHYzIEFQSVxuICAgICAgICBsZXQgYXBpVXJsID0gJy9wYnhjb3JlL2FwaS92My9leHRlbnNpb25zOmdldEZvclNlbGVjdCc7XG4gICAgICAgIGNvbnN0IGFwaVBhcmFtcyA9IHt9O1xuXG4gICAgICAgIC8vIEFkZCB0eXBlIHBhcmFtZXRlclxuICAgICAgICBpZiAoY29uZmlnLnR5cGUgJiYgY29uZmlnLnR5cGUgIT09ICdhbGwnKSB7XG4gICAgICAgICAgICBhcGlQYXJhbXMudHlwZSA9IGNvbmZpZy50eXBlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGV4Y2x1ZGUgcGFyYW1ldGVyXG4gICAgICAgIGlmIChjb25maWcuZXhjbHVkZUV4dGVuc2lvbnMgJiYgY29uZmlnLmV4Y2x1ZGVFeHRlbnNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGFwaVBhcmFtcy5leGNsdWRlID0gY29uZmlnLmV4Y2x1ZGVFeHRlbnNpb25zLmpvaW4oJywnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIGNvbmZpZ3VyYXRpb24gZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgY29uc3QgZHJvcGRvd25Db25maWcgPSB7XG4gICAgICAgICAgICBhcGlVcmw6IGFwaVVybCxcbiAgICAgICAgICAgIGFwaVBhcmFtczogYXBpUGFyYW1zLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGNvbmZpZy5wbGFjZWhvbGRlciB8fCB0aGlzLmdldFBsYWNlaG9sZGVyQnlUeXBlKGNvbmZpZy50eXBlKSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3VzdG9tIHJlc3BvbnNlIGhhbmRsZXIgZm9yIGV4dGVuc2lvbi1zcGVjaWZpYyBwcm9jZXNzaW5nXG4gICAgICAgICAgICBvblJlc3BvbnNlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzRXh0ZW5zaW9uUmVzcG9uc2UocmVzcG9uc2UsIGNvbmZpZyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTZWxlY3Rpb25DaGFuZ2UoZmllbGRJZCwgdmFsdWUsIHRleHQsICRjaG9pY2UsIGNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGVtcHR5IG9wdGlvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGNvbmZpZy5pbmNsdWRlRW1wdHkpIHtcbiAgICAgICAgICAgIGRyb3Bkb3duQ29uZmlnLmVtcHR5T3B0aW9uID0ge1xuICAgICAgICAgICAgICAgIGtleTogJycsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWxlY3RFeHRlbnNpb25cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBhc3MgdGhlIG9yaWdpbmFsIGRhdGEgb2JqZWN0IGRpcmVjdGx5IHRvIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHByb3BlciBoYW5kbGluZyBvZiBleGlzdGluZyB2YWx1ZXMgYW5kIHRoZWlyIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICBjb25zdCBkcm9wZG93bkRhdGEgPSBvcHRpb25zLmRhdGEgfHwge307XG4gICAgICAgIFxuICAgICAgICAvLyBPdmVycmlkZSB0ZW1wbGF0ZSBmb3IgcHJvcGVyIEhUTUwgcmVuZGVyaW5nXG4gICAgICAgIGRyb3Bkb3duQ29uZmlnLnRlbXBsYXRlcyA9IHtcbiAgICAgICAgICAgIG1lbnU6IHRoaXMuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZGVmYXVsdCBjbGFzc2VzIGZvciBleHRlbnNpb24gZHJvcGRvd25zXG4gICAgICAgIGRyb3Bkb3duQ29uZmlnLmFkZGl0aW9uYWxDbGFzc2VzID0gWydzZWFyY2gnLCAuLi4oY29uZmlnLmFkZGl0aW9uYWxDbGFzc2VzIHx8IFtdKV07XG4gICAgICAgIFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZmllbGRJZCwgZHJvcGRvd25EYXRhLCBkcm9wZG93bkNvbmZpZyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2VcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB7XG4gICAgICAgICAgICBmaWVsZElkLFxuICAgICAgICAgICAgY29uZmlnLFxuICAgICAgICAgICAgY3VycmVudFZhbHVlLFxuICAgICAgICAgICAgY3VycmVudFRleHQsXG4gICAgICAgICAgICAkaGlkZGVuSW5wdXRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGluc3RhbmNlXG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLnNldChmaWVsZElkLCBpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXRlY3QgaW5pdGlhbCB0ZXh0IGZyb20gZGF0YSBvYmplY3Qgb3IgZHJvcGRvd25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIG9iamVjdCB3aXRoIHJlcHJlc2VudCBmaWVsZHNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IEluaXRpYWwgdGV4dFxuICAgICAqL1xuICAgIGRldGVjdEluaXRpYWxUZXh0KGZpZWxkSWQsIGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEgJiYgZGF0YVtgJHtmaWVsZElkfV9yZXByZXNlbnRgXSkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFbYCR7ZmllbGRJZH1fcmVwcmVzZW50YF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRyeSB0byBnZXQgZnJvbSBleGlzdGluZyBkcm9wZG93biB0ZXh0XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkdGV4dCA9ICRkcm9wZG93bi5maW5kKCcudGV4dDpub3QoLmRlZmF1bHQpJyk7XG4gICAgICAgICAgICBpZiAoJHRleHQubGVuZ3RoICYmICR0ZXh0LnRleHQoKS50cmltKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHRleHQuaHRtbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBhcHByb3ByaWF0ZSBwbGFjZWhvbGRlciB0ZXh0IGJ5IGV4dGVuc2lvbiB0eXBlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBFeHRlbnNpb24gdHlwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFBsYWNlaG9sZGVyIHRleHRcbiAgICAgKi9cbiAgICBnZXRQbGFjZWhvbGRlckJ5VHlwZSh0eXBlKSB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSAncm91dGluZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFRyYW5zbGF0ZS5leF9TZWxlY3RFeHRlbnNpb247XG4gICAgICAgICAgICBjYXNlICdpbnRlcm5hbCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFRyYW5zbGF0ZS5leF9TZWxlY3RJbnRlcm5hbEV4dGVuc2lvbjtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXVlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdFF1ZXVlRXh0ZW5zaW9uO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdEV4dGVuc2lvbjtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBBUEkgcmVzcG9uc2UgZm9yIGV4dGVuc2lvbi1zcGVjaWZpYyBmb3JtYXR0aW5nXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBQcm9jZXNzZWQgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBwcm9jZXNzRXh0ZW5zaW9uUmVzcG9uc2UocmVzcG9uc2UsIGNvbmZpZykge1xuICAgICAgICBpZiAoKHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZS5zdWNjZXNzKSAmJiByZXNwb25zZS5kYXRhICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NlZFJlc3VsdHMgPSByZXNwb25zZS5kYXRhLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZGlzcGxheVRleHQgPSBpdGVtLnJlcHJlc2VudCB8fCBpdGVtLm5hbWUgfHwgaXRlbS50ZXh0IHx8IGl0ZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgSFRNTCBzYW5pdGl6YXRpb24gZm9yIGV4dGVuc2lvbiBjb250ZW50IHdpdGggaWNvbnNcbiAgICAgICAgICAgICAgICBpZiAoZGlzcGxheVRleHQgJiYgdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGRpc3BsYXlUZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUgfHwgaXRlbS5pZCxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZGlzcGxheVRleHQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGRpc3BsYXlUZXh0LFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGUgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGl0ZW0uZGlzYWJsZWQgfHwgZmFsc2VcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZXN1bHRzOiBwcm9jZXNzZWRSZXN1bHRzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLCBcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdIFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFNlbGVjdGVkIHRleHRcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGNob2ljZSAtIFNlbGVjdGVkIGNob2ljZSBlbGVtZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBoYW5kbGVTZWxlY3Rpb25DaGFuZ2UoZmllbGRJZCwgdmFsdWUsIHRleHQsICRjaG9pY2UsIGNvbmZpZykge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQ7XG4gICAgICAgIFxuICAgICAgICAvLyBDUklUSUNBTDogVXBkYXRlIGhpZGRlbiBpbnB1dCBmaWVsZCB0byBtYWludGFpbiBzeW5jaHJvbml6YXRpb25cbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGRJZH1gKTtcbiAgICAgICAgaWYgKCRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxsIGN1c3RvbSBvbkNoYW5nZSBpZiBwcm92aWRlZFxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vbkNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm90aWZ5IGZvcm0gb2YgY2hhbmdlc1xuICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uZGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGRyb3Bkb3duIG1lbnUgdGVtcGxhdGUgd2l0aCBjYXRlZ29yaWVzIHN1cHBvcnRcbiAgICAgKiBTeW5jaHJvbml6ZWQgd2l0aCBFeHRlbnNpb25zQVBJLmN1c3RvbURyb3Bkb3duTWVudSBsb2dpYyBmb3IgY29tcGF0aWJpbGl0eVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZpZWxkcyAtIEZpZWxkIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGZvciBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwgW107XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGxldCBvbGRUeXBlID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgJC5lYWNoIGZvciBjb21wYXRpYmlsaXR5IHdpdGggb3JpZ2luYWwgRXh0ZW5zaW9uc0FQSS5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gb3B0aW9uW2ZpZWxkcy52YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gb3B0aW9uW2ZpZWxkcy50ZXh0XSB8fCBvcHRpb25bZmllbGRzLm5hbWVdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9IG9wdGlvbi50eXBlIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdHlwZUxvY2FsaXplZCA9IG9wdGlvbi50eXBlTG9jYWxpemVkIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgY2F0ZWdvcnkgaGVhZGVyIGlmIHR5cGUgY2hhbmdlZCAtIGV4YWN0IHNhbWUgbG9naWMgYXMgRXh0ZW5zaW9uc0FQSS5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgICAgIGlmICh0eXBlICE9PSBvbGRUeXBlKSB7XG4gICAgICAgICAgICAgICAgb2xkVHlwZSA9IHR5cGU7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1xcdDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1xcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSB0eXBlTG9jYWxpemVkO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZvciBGb21hbnRpYyBVSSB0byB3b3JrIGNvcnJlY3RseSB3aXRoIEhUTUwgY29udGVudCwgZGF0YS10ZXh0IHNob3VsZCBjb250YWluIHRoZSBIVE1MXG4gICAgICAgICAgICAvLyB0aGF0IHdpbGwgYmUgZGlzcGxheWVkIHdoZW4gdGhlIGl0ZW0gaXMgc2VsZWN0ZWQuIFRleHQgaXMgYWxyZWFkeSBzYW5pdGl6ZWQgaW4gcHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlLlxuICAgICAgICAgICAgY29uc3QgbWF5YmVUZXh0ID0gdGV4dCA/IGBkYXRhLXRleHQ9XCIke3RleHQucmVwbGFjZSgvXCIvZywgJyZxdW90OycpfVwiYCA6ICcnO1xuICAgICAgICAgICAgY29uc3QgbWF5YmVEaXNhYmxlZCA9IG9wdGlvbi5kaXNhYmxlZCA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke0V4dGVuc2lvblNlbGVjdG9yLmVzY2FwZUh0bWwodmFsdWUpfVwiJHttYXliZVRleHR9PmA7XG4gICAgICAgICAgICBodG1sICs9IHRleHQ7IC8vIFRleHQgaXMgYWxyZWFkeSBzYW5pdGl6ZWQgaW4gcHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlXG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHZhbHVlIHByb2dyYW1tYXRpY2FsbHkgd2l0aCBvcHRpb25hbCB0ZXh0XG4gICAgICogVjUuMDogRW5oYW5jZWQgdG8gc3VwcG9ydCBzZXR0aW5nIGJvdGggdmFsdWUgYW5kIGRpc3BsYXkgdGV4dFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFZhbHVlIHRvIHNldFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gRGlzcGxheSB0ZXh0IChvcHRpb25hbCwgaWYgcHJvdmlkZWQgd2lsbCB1cGRhdGUgZGlzcGxheSlcbiAgICAgKi9cbiAgICBzZXRWYWx1ZShmaWVsZElkLCB2YWx1ZSwgdGV4dCA9IG51bGwpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgRXh0ZW5zaW9uU2VsZWN0b3I6IEluc3RhbmNlIG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGRJZH1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgdmFsdWVcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGRJZH1gKTtcbiAgICAgICAgaWYgKCRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIGRpc3BsYXlcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBlbXB0eSB2YWx1ZSBzcGVjaWFsbHlcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gJycgfHwgdmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgZHJvcGRvd25cbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRleHRFbGVtZW50ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCR0ZXh0RWxlbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGRlZmF1bHQgY2xhc3MgZm9yIHBsYWNlaG9sZGVyIHN0eWxlXG4gICAgICAgICAgICAgICAgICAgICR0ZXh0RWxlbWVudC5hZGRDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHRleHQgaXMgcHJvdmlkZWQsIHVwZGF0ZSBib3RoIHZhbHVlIGFuZCB0ZXh0XG4gICAgICAgICAgICBlbHNlIGlmICh0ZXh0ICE9PSBudWxsICYmIHRleHQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRlbXBvcmFyeSBtZW51IGl0ZW0gd2l0aCB0aGUgbmV3IHRleHQgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdJdGVtID0gJG1lbnUuZmluZChgLml0ZW1bZGF0YS12YWx1ZT1cIiR7dmFsdWV9XCJdYCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWV4aXN0aW5nSXRlbS5sZW5ndGggJiYgdmFsdWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCB0ZW1wb3JhcnkgaXRlbSBmb3IgbW9iaWxlIG51bWJlciBvciBvdGhlciBkeW5hbWljIHZhbHVlc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlVmFsdWUgPSB0aGlzLmVzY2FwZUh0bWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQodGV4dClcbiAgICAgICAgICAgICAgICAgICAgICAgIDogdGV4dDtcbiAgICAgICAgICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke3NhZmVWYWx1ZX1cIiBkYXRhLXRleHQ9XCIke3NhZmVUZXh0LnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKX1cIj4ke3NhZmVUZXh0fTwvZGl2PmApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCBzZWxlY3RlZCB2YWx1ZSBpbiBkcm9wZG93blxuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgdmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgLy8gRm9yY2UgdGV4dCB1cGRhdGUgaWYgU2VtYW50aWMgVUkgZGlkbid0IHBpY2sgaXQgdXBcbiAgICAgICAgICAgICAgICBjb25zdCAkdGV4dEVsZW1lbnQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHRleHRFbGVtZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkdGV4dEVsZW1lbnQuaHRtbCh0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRlZmF1bHQgY2xhc3MgdG8gc2hvdyB0ZXh0IGFzIHNlbGVjdGVkLCBub3QgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAgICAgJHRleHRFbGVtZW50LnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBKdXN0IHNldCB0aGUgdmFsdWUsIGxldCBkcm9wZG93biBoYW5kbGUgdGV4dFxuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgdmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkZWZhdWx0IGNsYXNzIGlmIHZhbHVlIGlzIHNldFxuICAgICAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgICAgIGlmICgkdGV4dEVsZW1lbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ZXh0RWxlbWVudC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBpbnN0YW5jZSBzdGF0ZVxuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgaW5zdGFuY2UuY3VycmVudFRleHQgPSB0ZXh0IHx8ICcnO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IGZvciBmb3JtIHByb2Nlc3NpbmdcbiAgICAgICAgJGhpZGRlbklucHV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuXG4gICAgICAgIC8vIE5vdGlmeSBmb3JtIG9mIGNoYW5nZXNcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IGRpc3BsYXkgdGV4dCB3aXRob3V0IGNoYW5naW5nIHZhbHVlXG4gICAgICogVjUuMDogTmV3IG1ldGhvZCBmb3IgdXBkYXRpbmcgZGlzcGxheSB0ZXh0IG9ubHlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIERpc3BsYXkgdGV4dCB0byBzZXRcbiAgICAgKi9cbiAgICBzZXRUZXh0KGZpZWxkSWQsIHRleHQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgRXh0ZW5zaW9uU2VsZWN0b3I6IEluc3RhbmNlIG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGRJZH1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkdGV4dEVsZW1lbnQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKTtcbiAgICAgICAgICAgIGlmICgkdGV4dEVsZW1lbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgdGV4dCBiZWZvcmUgc2V0dGluZ1xuICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnXG4gICAgICAgICAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KHRleHQpXG4gICAgICAgICAgICAgICAgICAgIDogdGV4dDtcbiAgICAgICAgICAgICAgICAkdGV4dEVsZW1lbnQuaHRtbChzYWZlVGV4dCk7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRlZmF1bHQgY2xhc3MgdG8gc2hvdyB0ZXh0IGFzIHNlbGVjdGVkLCBub3QgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAkdGV4dEVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IHZhbHVlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gQ3VycmVudCB2YWx1ZVxuICAgICAqL1xuICAgIGdldFZhbHVlKGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIHJldHVybiBpbnN0YW5jZSA/IGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA6IG51bGw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciBkcm9wZG93biBzZWxlY3Rpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBjbGVhcihmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIC8vIFVzZSBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHRvIGNsZWFyXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyKGZpZWxkSWQpO1xuXG4gICAgICAgICAgICAvLyBBZGQgZGVmYXVsdCBjbGFzcyB0byBzaG93IHBsYWNlaG9sZGVyIHN0eWxlXG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZElkfS1kcm9wZG93bmApO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGV4dEVsZW1lbnQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHRleHRFbGVtZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkdGV4dEVsZW1lbnQuYWRkQ2xhc3MoJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBpbnN0YW5jZSBzdGF0ZVxuICAgICAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBkcm9wZG93biBkYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICovXG4gICAgcmVmcmVzaChmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBpcyBzdGlsbCBhdHRhY2hlZCB0byBET00gYmVmb3JlIHJlZnJlc2hpbmdcbiAgICAgICAgICAgIGlmICgkLmNvbnRhaW5zKGRvY3VtZW50LCAkZHJvcGRvd25bMF0pKSB7XG4gICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBhbmltYXRpb25zIHRvIHByZXZlbnQgRE9NIGVycm9yc1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignaGlkZScpO1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgICAgIHNpbGVudDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciBjYWNoZSBmb3IgZXh0ZW5zaW9ucyBBUElcbiAgICAgKiBDYWxsIHRoaXMgYWZ0ZXIgZXh0ZW5zaW9uIG9wZXJhdGlvbnMgKGFkZC9lZGl0L2RlbGV0ZSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIE9wdGlvbmFsOiBzcGVjaWZpYyB0eXBlIHRvIGNsZWFyICgncm91dGluZycsICdpbnRlcm5hbCcsIGV0Yy4pXG4gICAgICovXG4gICAgY2xlYXJDYWNoZSh0eXBlID0gbnVsbCkge1xuICAgICAgICBpZiAodHlwZSkge1xuICAgICAgICAgICAgLy8gQ2xlYXIgY2FjaGUgZm9yIHNwZWNpZmljIHR5cGVcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXJDYWNoZUZvcignL3BieGNvcmUvYXBpL3YzL2V4dGVuc2lvbnM6Z2V0Rm9yU2VsZWN0JywgeyB0eXBlIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2xlYXIgYWxsIGV4dGVuc2lvbnMgY2FjaGVcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXJDYWNoZUZvcignL3BieGNvcmUvYXBpL3YzL2V4dGVuc2lvbnM6Z2V0Rm9yU2VsZWN0Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggYWxsIGV4dGVuc2lvbiBkcm9wZG93bnMgb24gdGhlIHBhZ2VcbiAgICAgKiBUaGlzIHdpbGwgZm9yY2UgdGhlbSB0byByZWxvYWQgZGF0YSBmcm9tIHNlcnZlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gT3B0aW9uYWw6IHNwZWNpZmljIHR5cGUgdG8gcmVmcmVzaCAoJ3JvdXRpbmcnLCAnaW50ZXJuYWwnLCBldGMuKVxuICAgICAqL1xuICAgIHJlZnJlc2hBbGwodHlwZSA9IG51bGwpIHtcbiAgICAgICAgLy8gQ2xlYXIgY2FjaGUgZmlyc3RcbiAgICAgICAgdGhpcy5jbGVhckNhY2hlKHR5cGUpO1xuXG4gICAgICAgIC8vIFJlZnJlc2ggZWFjaCBhY3RpdmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UsIGZpZWxkSWQpID0+IHtcbiAgICAgICAgICAgIGlmICghdHlwZSB8fCBpbnN0YW5jZS5jb25maWcudHlwZSA9PT0gdHlwZSkge1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIGFuZCByZWxvYWRcbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyKGZpZWxkSWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2FmZWx5IHJlZnJlc2ggZHJvcGRvd25cbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goZmllbGRJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGV4dGVuc2lvbiBleGNsdXNpb24gbGlzdCBmb3IgZXhpc3RpbmcgaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtBcnJheX0gZXhjbHVkZUV4dGVuc2lvbnMgLSBFeHRlbnNpb25zIHRvIGV4Y2x1ZGVcbiAgICAgKi9cbiAgICB1cGRhdGVFeGNsdXNpb25zKGZpZWxkSWQsIGV4Y2x1ZGVFeHRlbnNpb25zID0gW10pIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgRXh0ZW5zaW9uU2VsZWN0b3I6IEluc3RhbmNlIG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGRJZH1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaW5zdGFuY2UuY29uZmlnLmV4Y2x1ZGVFeHRlbnNpb25zID0gZXhjbHVkZUV4dGVuc2lvbnM7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBjYWNoZSBmb3IgdGhpcyBzcGVjaWZpYyBjb25maWd1cmF0aW9uXG4gICAgICAgIGNvbnN0IGNhY2hlS2V5ID0gdGhpcy5nZW5lcmF0ZUNhY2hlS2V5KGluc3RhbmNlLmNvbmZpZyk7XG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXJDYWNoZUZvcignL3BieGNvcmUvYXBpL3YzL2V4dGVuc2lvbnM6Z2V0Rm9yU2VsZWN0JywgY2FjaGVLZXkpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVmcmVzaCBkcm9wZG93blxuICAgICAgICB0aGlzLnJlZnJlc2goZmllbGRJZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBjYWNoZSBrZXkgYmFzZWQgb24gY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBFeHRlbnNpb24gc2VsZWN0b3IgY29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IENhY2hlIGtleSBwYXJhbWV0ZXJzXG4gICAgICovXG4gICAgZ2VuZXJhdGVDYWNoZUtleShjb25maWcpIHtcbiAgICAgICAgY29uc3QgY2FjaGVQYXJhbXMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb25maWcudHlwZSAmJiBjb25maWcudHlwZSAhPT0gJ2FsbCcpIHtcbiAgICAgICAgICAgIGNhY2hlUGFyYW1zLnR5cGUgPSBjb25maWcudHlwZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucyAmJiBjb25maWcuZXhjbHVkZUV4dGVuc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY2FjaGVQYXJhbXMuZXhjbHVkZSA9IGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucy5qb2luKCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjYWNoZVBhcmFtcztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICovXG4gICAgZGVzdHJveShmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBmcm9tIGluc3RhbmNlc1xuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZXMuZGVsZXRlKGZpZWxkSWQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGRpdi50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHJldHVybiBkaXYuaW5uZXJIVE1MO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXh0ZW5zaW9uU2VsZWN0b3I7XG59Il19