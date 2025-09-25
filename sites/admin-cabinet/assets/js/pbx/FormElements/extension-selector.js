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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZXh0ZW5zaW9uLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5zdGFuY2VzIiwiTWFwIiwiZGVmYXVsdHMiLCJ0eXBlIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJpbmNsdWRlRW1wdHkiLCJwbGFjZWhvbGRlciIsImFkZGl0aW9uYWxDbGFzc2VzIiwib25DaGFuZ2UiLCJvbkxvYWRDb21wbGV0ZSIsImluaXQiLCJmaWVsZElkIiwib3B0aW9ucyIsImhhcyIsImdldCIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsImNvbmZpZyIsImN1cnJlbnRWYWx1ZSIsImRhdGEiLCJ2YWwiLCJjdXJyZW50VGV4dCIsImRldGVjdEluaXRpYWxUZXh0IiwiYXBpVXJsIiwiYXBpUGFyYW1zIiwiZXhjbHVkZSIsImpvaW4iLCJkcm9wZG93bkNvbmZpZyIsImdldFBsYWNlaG9sZGVyQnlUeXBlIiwib25SZXNwb25zZSIsInJlc3BvbnNlIiwicHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlIiwidmFsdWUiLCJ0ZXh0IiwiJGNob2ljZSIsImhhbmRsZVNlbGVjdGlvbkNoYW5nZSIsImVtcHR5T3B0aW9uIiwia2V5IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfU2VsZWN0RXh0ZW5zaW9uIiwiZHJvcGRvd25EYXRhIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW5zdGFuY2UiLCJzZXQiLCIkZHJvcGRvd24iLCIkdGV4dCIsImZpbmQiLCJ0cmltIiwiaHRtbCIsImV4X1NlbGVjdEludGVybmFsRXh0ZW5zaW9uIiwiZXhfU2VsZWN0UXVldWVFeHRlbnNpb24iLCJyZXN1bHQiLCJzdWNjZXNzIiwiQXJyYXkiLCJpc0FycmF5IiwicHJvY2Vzc2VkUmVzdWx0cyIsIm1hcCIsIml0ZW0iLCJkaXNwbGF5VGV4dCIsInJlcHJlc2VudCIsIm5hbWUiLCJTZWN1cml0eVV0aWxzIiwic2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCIsImlkIiwidHlwZUxvY2FsaXplZCIsImRpc2FibGVkIiwicmVzdWx0cyIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImZpZWxkcyIsInZhbHVlcyIsIm9sZFR5cGUiLCJlYWNoIiwiaW5kZXgiLCJvcHRpb24iLCJtYXliZVRleHQiLCJyZXBsYWNlIiwibWF5YmVEaXNhYmxlZCIsImVzY2FwZUh0bWwiLCJzZXRWYWx1ZSIsImRyb3Bkb3duIiwiJHRleHRFbGVtZW50IiwiYWRkQ2xhc3MiLCIkbWVudSIsImV4aXN0aW5nSXRlbSIsInNhZmVWYWx1ZSIsInNhZmVUZXh0IiwiYXBwZW5kIiwicmVtb3ZlQ2xhc3MiLCJ0cmlnZ2VyIiwic2V0VGV4dCIsImdldFZhbHVlIiwiY2xlYXIiLCJyZWZyZXNoIiwiY2xlYXJDYWNoZSIsImNsZWFyQ2FjaGVGb3IiLCJyZWZyZXNoQWxsIiwiZm9yRWFjaCIsInVwZGF0ZUV4Y2x1c2lvbnMiLCJjYWNoZUtleSIsImdlbmVyYXRlQ2FjaGVLZXkiLCJjYWNoZVBhcmFtcyIsImRlc3Ryb3kiLCJkaXYiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJ0ZXh0Q29udGVudCIsImlubmVySFRNTCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFFdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEs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QUFNLENBQUNqQixJQUExQjtBQUNIOztBQUVELFFBQUlpQixNQUFNLENBQUNoQixpQkFBUCxJQUE0QmdCLE1BQU0sQ0FBQ2hCLGlCQUFQLENBQXlCYSxNQUF6QixHQUFrQyxDQUFsRSxFQUFxRTtBQUNqRTJGLE1BQUFBLFdBQVcsQ0FBQ2hGLE9BQVosR0FBc0JSLE1BQU0sQ0FBQ2hCLGlCQUFQLENBQXlCeUIsSUFBekIsQ0FBOEIsR0FBOUIsQ0FBdEI7QUFDSDs7QUFFRCxXQUFPK0UsV0FBUDtBQUNILEdBeGdCcUI7O0FBMGdCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQS9nQnNCLG1CQStnQmRsRyxPQS9nQmMsRUErZ0JMO0FBQ2IsUUFBTXNDLFFBQVEsR0FBRyxLQUFLakQsU0FBTCxDQUFlYyxHQUFmLENBQW1CSCxPQUFuQixDQUFqQjs7QUFDQSxRQUFJc0MsUUFBSixFQUFjO0FBQ1Y7QUFDQSxXQUFLakQsU0FBTCxXQUFzQlcsT0FBdEI7QUFDSDtBQUNKLEdBcmhCcUI7O0FBdWhCdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJMEUsRUFBQUEsVUE1aEJzQixzQkE0aEJYakQsSUE1aEJXLEVBNGhCTDtBQUNiLFFBQU0wRSxHQUFHLEdBQUdDLFFBQVEsQ0FBQ0MsYUFBVCxDQUF1QixLQUF2QixDQUFaO0FBQ0FGLElBQUFBLEdBQUcsQ0FBQ0csV0FBSixHQUFrQjdFLElBQWxCO0FBQ0EsV0FBTzBFLEdBQUcsQ0FBQ0ksU0FBWDtBQUNIO0FBaGlCcUIsQ0FBMUIsQyxDQW1pQkE7O0FBQ0EsSUFBSSxPQUFPQyxNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pERCxFQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUJySCxpQkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxUcmFuc2xhdGUsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIFNlY3VyaXR5VXRpbHMsIEZvcm0gKi9cblxuLyoqXG4gKiBFeHRlbnNpb25TZWxlY3RvciAtIEV4dGVuc2lvbi1zcGVjaWZpYyB3cmFwcGVyIG92ZXIgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICogXG4gKiBUaGlzIGNvbXBvbmVudCBidWlsZHMgdXBvbiBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHRvIHByb3ZpZGUgZXh0ZW5zaW9uLXNwZWNpZmljIGZlYXR1cmVzOlxuICogLSBTdXBwb3J0IGZvciBleHRlbnNpb24gdHlwZXMvY2F0ZWdvcmllcyAocm91dGluZywgaW50ZXJuYWwsIGFsbCwgZXRjLilcbiAqIC0gUHJvcGVyIEhUTUwgcmVuZGVyaW5nIGZvciBleHRlbnNpb24gbmFtZXMgd2l0aCBpY29uc1xuICogLSBFeHRlbnNpb24gZXhjbHVzaW9uIGZ1bmN0aW9uYWxpdHlcbiAqIC0gT3B0aW1pemVkIGNhY2hpbmcgZm9yIGV4dGVuc2lvbiBkYXRhXG4gKiAtIEZ1bGwtdGV4dCBzZWFyY2ggY2FwYWJpbGl0aWVzXG4gKiBcbiAqIFVzYWdlOlxuICogRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uJywge1xuICogICAgIHR5cGU6ICdyb3V0aW5nJywgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiB0eXBlIChyb3V0aW5nL2ludGVybmFsL2FsbClcbiAqICAgICBleGNsdWRlRXh0ZW5zaW9uczogWycxMDEnXSwgICAvLyBFeHRlbnNpb25zIHRvIGV4Y2x1ZGVcbiAqICAgICBpbmNsdWRlRW1wdHk6IHRydWUsICAgICAgICAgICAvLyBJbmNsdWRlIGVtcHR5IG9wdGlvblxuICogICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHsgLi4uIH0gIC8vIENoYW5nZSBjYWxsYmFja1xuICogfSk7XG4gKiBcbiAqIEBtb2R1bGUgRXh0ZW5zaW9uU2VsZWN0b3JcbiAqL1xuY29uc3QgRXh0ZW5zaW9uU2VsZWN0b3IgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogQWN0aXZlIHNlbGVjdG9yIGluc3RhbmNlc1xuICAgICAqIEB0eXBlIHtNYXB9XG4gICAgICovXG4gICAgaW5zdGFuY2VzOiBuZXcgTWFwKCksXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBkZWZhdWx0czoge1xuICAgICAgICB0eXBlOiAnYWxsJywgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiB0eXBlIChhbGwvcm91dGluZy9pbnRlcm5hbC9xdWV1ZS9ldGMuKVxuICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW10sICAgIC8vIEV4dGVuc2lvbnMgdG8gZXhjbHVkZSBmcm9tIGxpc3RcbiAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSwgICAgICAvLyBJbmNsdWRlIGVtcHR5L25vbmUgb3B0aW9uXG4gICAgICAgIHBsYWNlaG9sZGVyOiBudWxsLCAgICAgICAgLy8gUGxhY2Vob2xkZXIgdGV4dCAoYXV0by1kZXRlY3RlZClcbiAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFtdLCAgICAvLyBBZGRpdGlvbmFsIENTUyBjbGFzc2VzIGZvciBkcm9wZG93blxuICAgICAgICBvbkNoYW5nZTogbnVsbCwgICAgICAgICAgLy8gQ2hhbmdlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgIG9uTG9hZENvbXBsZXRlOiBudWxsLCAgICAvLyBMb2FkIGNvbXBsZXRlIGNhbGxiYWNrXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSUQgKGUuZy4sICdleHRlbnNpb24nKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICogQHJldHVybnMge29iamVjdHxudWxsfSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXQoZmllbGRJZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKHRoaXMuaW5zdGFuY2VzLmhhcyhmaWVsZElkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBoaWRkZW4gaW5wdXQgZWxlbWVudFxuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgRXh0ZW5zaW9uU2VsZWN0b3I6IEhpZGRlbiBpbnB1dCBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTWVyZ2Ugb3B0aW9ucyB3aXRoIGRlZmF1bHRzXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWUgYW5kIHJlcHJlc2VudCB0ZXh0IGZyb20gZGF0YSBvYmplY3QgaWYgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGFbZmllbGRJZF0pIHx8ICRoaWRkZW5JbnB1dC52YWwoKSB8fCAnJztcbiAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSB0aGlzLmRldGVjdEluaXRpYWxUZXh0KGZpZWxkSWQsIG9wdGlvbnMuZGF0YSkgfHwgY29uZmlnLnBsYWNlaG9sZGVyO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgQVBJIFVSTCB3aXRoIHBhcmFtZXRlcnMgdXNpbmcgdjMgQVBJXG4gICAgICAgIGxldCBhcGlVcmwgPSAnL3BieGNvcmUvYXBpL3YzL2V4dGVuc2lvbnM6Z2V0Rm9yU2VsZWN0JztcbiAgICAgICAgY29uc3QgYXBpUGFyYW1zID0ge307XG5cbiAgICAgICAgLy8gQWRkIHR5cGUgcGFyYW1ldGVyXG4gICAgICAgIGlmIChjb25maWcudHlwZSAmJiBjb25maWcudHlwZSAhPT0gJ2FsbCcpIHtcbiAgICAgICAgICAgIGFwaVBhcmFtcy50eXBlID0gY29uZmlnLnR5cGU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgZXhjbHVkZSBwYXJhbWV0ZXJcbiAgICAgICAgaWYgKGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucyAmJiBjb25maWcuZXhjbHVkZUV4dGVuc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYXBpUGFyYW1zLmV4Y2x1ZGUgPSBjb25maWcuZXhjbHVkZUV4dGVuc2lvbnMuam9pbignLCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gY29uZmlndXJhdGlvbiBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBkcm9wZG93bkNvbmZpZyA9IHtcbiAgICAgICAgICAgIGFwaVVybDogYXBpVXJsLFxuICAgICAgICAgICAgYXBpUGFyYW1zOiBhcGlQYXJhbXMsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogY29uZmlnLnBsYWNlaG9sZGVyIHx8IHRoaXMuZ2V0UGxhY2Vob2xkZXJCeVR5cGUoY29uZmlnLnR5cGUpLFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDdXN0b20gcmVzcG9uc2UgaGFuZGxlciBmb3IgZXh0ZW5zaW9uLXNwZWNpZmljIHByb2Nlc3NpbmdcbiAgICAgICAgICAgIG9uUmVzcG9uc2U6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NFeHRlbnNpb25SZXNwb25zZShyZXNwb25zZSwgY29uZmlnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQsICRjaG9pY2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNlbGVjdGlvbkNoYW5nZShmaWVsZElkLCB2YWx1ZSwgdGV4dCwgJGNob2ljZSwgY29uZmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZW1wdHkgb3B0aW9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAoY29uZmlnLmluY2x1ZGVFbXB0eSkge1xuICAgICAgICAgICAgZHJvcGRvd25Db25maWcuZW1wdHlPcHRpb24gPSB7XG4gICAgICAgICAgICAgICAga2V5OiAnJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdEV4dGVuc2lvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUGFzcyB0aGUgb3JpZ2luYWwgZGF0YSBvYmplY3QgZGlyZWN0bHkgdG8gRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgcHJvcGVyIGhhbmRsaW5nIG9mIGV4aXN0aW5nIHZhbHVlcyBhbmQgdGhlaXIgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duRGF0YSA9IG9wdGlvbnMuZGF0YSB8fCB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIE92ZXJyaWRlIHRlbXBsYXRlIGZvciBwcm9wZXIgSFRNTCByZW5kZXJpbmdcbiAgICAgICAgZHJvcGRvd25Db25maWcudGVtcGxhdGVzID0ge1xuICAgICAgICAgICAgbWVudTogdGhpcy5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkZWZhdWx0IGNsYXNzZXMgZm9yIGV4dGVuc2lvbiBkcm9wZG93bnNcbiAgICAgICAgZHJvcGRvd25Db25maWcuYWRkaXRpb25hbENsYXNzZXMgPSBbJ3NlYXJjaCcsIC4uLihjb25maWcuYWRkaXRpb25hbENsYXNzZXMgfHwgW10pXTtcbiAgICAgICAgXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihmaWVsZElkLCBkcm9wZG93bkRhdGEsIGRyb3Bkb3duQ29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBpbnN0YW5jZVxuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHtcbiAgICAgICAgICAgIGZpZWxkSWQsXG4gICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICBjdXJyZW50VmFsdWUsXG4gICAgICAgICAgICBjdXJyZW50VGV4dCxcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuc2V0KGZpZWxkSWQsIGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERldGVjdCBpbml0aWFsIHRleHQgZnJvbSBkYXRhIG9iamVjdCBvciBkcm9wZG93blxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgb2JqZWN0IHdpdGggcmVwcmVzZW50IGZpZWxkc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gSW5pdGlhbCB0ZXh0XG4gICAgICovXG4gICAgZGV0ZWN0SW5pdGlhbFRleHQoZmllbGRJZCwgZGF0YSkge1xuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhW2Ake2ZpZWxkSWR9X3JlcHJlc2VudGBdKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YVtgJHtmaWVsZElkfV9yZXByZXNlbnRgXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IHRvIGdldCBmcm9tIGV4aXN0aW5nIGRyb3Bkb3duIHRleHRcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Om5vdCguZGVmYXVsdCknKTtcbiAgICAgICAgICAgIGlmICgkdGV4dC5sZW5ndGggJiYgJHRleHQudGV4dCgpLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkdGV4dC5odG1sKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGFwcHJvcHJpYXRlIHBsYWNlaG9sZGVyIHRleHQgYnkgZXh0ZW5zaW9uIHR5cGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIEV4dGVuc2lvbiB0eXBlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUGxhY2Vob2xkZXIgdGV4dFxuICAgICAqL1xuICAgIGdldFBsYWNlaG9sZGVyQnlUeXBlKHR5cGUpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdyb3V0aW5nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdEV4dGVuc2lvbjtcbiAgICAgICAgICAgIGNhc2UgJ2ludGVybmFsJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdEludGVybmFsRXh0ZW5zaW9uO1xuICAgICAgICAgICAgY2FzZSAncXVldWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0UXVldWVFeHRlbnNpb247XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0RXh0ZW5zaW9uO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIEFQSSByZXNwb25zZSBmb3IgZXh0ZW5zaW9uLXNwZWNpZmljIGZvcm1hdHRpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFByb2Nlc3NlZCByZXNwb25zZVxuICAgICAqL1xuICAgIHByb2Nlc3NFeHRlbnNpb25SZXNwb25zZShyZXNwb25zZSwgY29uZmlnKSB7XG4gICAgICAgIGlmICgocmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlLnN1Y2Nlc3MpICYmIHJlc3BvbnNlLmRhdGEgJiYgQXJyYXkuaXNBcnJheShyZXNwb25zZS5kYXRhKSkge1xuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc2VkUmVzdWx0cyA9IHJlc3BvbnNlLmRhdGEubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGxldCBkaXNwbGF5VGV4dCA9IGl0ZW0ucmVwcmVzZW50IHx8IGl0ZW0ubmFtZSB8fCBpdGVtLnRleHQgfHwgaXRlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBcHBseSBIVE1MIHNhbml0aXphdGlvbiBmb3IgZXh0ZW5zaW9uIGNvbnRlbnQgd2l0aCBpY29uc1xuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5VGV4dCAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheVRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQoZGlzcGxheVRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSB8fCBpdGVtLmlkLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBkaXNwbGF5VGV4dCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogZGlzcGxheVRleHQsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGl0ZW0udHlwZSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogaXRlbS5kaXNhYmxlZCB8fCBmYWxzZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlc3VsdHM6IHByb2Nlc3NlZFJlc3VsdHNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsIFxuICAgICAgICAgICAgcmVzdWx0czogW10gXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBTZWxlY3RlZCB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gU2VsZWN0ZWQgdGV4dFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkY2hvaWNlIC0gU2VsZWN0ZWQgY2hvaWNlIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGhhbmRsZVNlbGVjdGlvbkNoYW5nZShmaWVsZElkLCB2YWx1ZSwgdGV4dCwgJGNob2ljZSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2Ugc3RhdGVcbiAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gdGV4dDtcbiAgICAgICAgXG4gICAgICAgIC8vIENSSVRJQ0FMOiBVcGRhdGUgaGlkZGVuIGlucHV0IGZpZWxkIHRvIG1haW50YWluIHN5bmNocm9uaXphdGlvblxuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICBpZiAoJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENhbGwgY3VzdG9tIG9uQ2hhbmdlIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25maWcub25DaGFuZ2UodmFsdWUsIHRleHQsICRjaG9pY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RpZnkgZm9ybSBvZiBjaGFuZ2VzXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXN0b20gZHJvcGRvd24gbWVudSB0ZW1wbGF0ZSB3aXRoIGNhdGVnb3JpZXMgc3VwcG9ydFxuICAgICAqIFN5bmNocm9uaXplZCB3aXRoIEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51IGxvZ2ljIGZvciBjb21wYXRpYmlsaXR5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZmllbGRzIC0gRmllbGQgY29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgZm9yIGRyb3Bkb3duIG1lbnVcbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCBbXTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgbGV0IG9sZFR5cGUgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSAkLmVhY2ggZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBvcmlnaW5hbCBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25bZmllbGRzLnZhbHVlXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBvcHRpb25bZmllbGRzLnRleHRdIHx8IG9wdGlvbltmaWVsZHMubmFtZV0gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gb3B0aW9uLnR5cGUgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCB0eXBlTG9jYWxpemVkID0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQgfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBjYXRlZ29yeSBoZWFkZXIgaWYgdHlwZSBjaGFuZ2VkIC0gZXhhY3Qgc2FtZSBsb2dpYyBhcyBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgaWYgKHR5cGUgIT09IG9sZFR5cGUpIHtcbiAgICAgICAgICAgICAgICBvbGRUeXBlID0gdHlwZTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXFx0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXFx0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+JztcbiAgICAgICAgICAgICAgICBodG1sICs9IHR5cGVMb2NhbGl6ZWQ7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIEZvbWFudGljIFVJIHRvIHdvcmsgY29ycmVjdGx5IHdpdGggSFRNTCBjb250ZW50LCBkYXRhLXRleHQgc2hvdWxkIGNvbnRhaW4gdGhlIEhUTUxcbiAgICAgICAgICAgIC8vIHRoYXQgd2lsbCBiZSBkaXNwbGF5ZWQgd2hlbiB0aGUgaXRlbSBpcyBzZWxlY3RlZC4gVGV4dCBpcyBhbHJlYWR5IHNhbml0aXplZCBpbiBwcm9jZXNzRXh0ZW5zaW9uUmVzcG9uc2UuXG4gICAgICAgICAgICBjb25zdCBtYXliZVRleHQgPSB0ZXh0ID8gYGRhdGEtdGV4dD1cIiR7dGV4dC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyl9XCJgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gb3B0aW9uLmRpc2FibGVkID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7RXh0ZW5zaW9uU2VsZWN0b3IuZXNjYXBlSHRtbCh2YWx1ZSl9XCIke21heWJlVGV4dH0+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gdGV4dDsgLy8gVGV4dCBpcyBhbHJlYWR5IHNhbml0aXplZCBpbiBwcm9jZXNzRXh0ZW5zaW9uUmVzcG9uc2VcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgdmFsdWUgcHJvZ3JhbW1hdGljYWxseSB3aXRoIG9wdGlvbmFsIHRleHRcbiAgICAgKiBWNS4wOiBFbmhhbmNlZCB0byBzdXBwb3J0IHNldHRpbmcgYm90aCB2YWx1ZSBhbmQgZGlzcGxheSB0ZXh0XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBEaXNwbGF5IHRleHQgKG9wdGlvbmFsLCBpZiBwcm92aWRlZCB3aWxsIHVwZGF0ZSBkaXNwbGF5KVxuICAgICAqL1xuICAgIHNldFZhbHVlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0ID0gbnVsbCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBFeHRlbnNpb25TZWxlY3RvcjogSW5zdGFuY2Ugbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB2YWx1ZVxuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICBpZiAoJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gZGlzcGxheVxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZElkfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gSGFuZGxlIGVtcHR5IHZhbHVlIHNwZWNpYWxseVxuICAgICAgICAgICAgaWYgKHZhbHVlID09PSAnJyB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBkcm9wZG93blxuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGV4dEVsZW1lbnQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHRleHRFbGVtZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZGVmYXVsdCBjbGFzcyBmb3IgcGxhY2Vob2xkZXIgc3R5bGVcbiAgICAgICAgICAgICAgICAgICAgJHRleHRFbGVtZW50LmFkZENsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgdGV4dCBpcyBwcm92aWRlZCwgdXBkYXRlIGJvdGggdmFsdWUgYW5kIHRleHRcbiAgICAgICAgICAgIGVsc2UgaWYgKHRleHQgIT09IG51bGwgJiYgdGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdGVtcG9yYXJ5IG1lbnUgaXRlbSB3aXRoIHRoZSBuZXcgdGV4dCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ0l0ZW0gPSAkbWVudS5maW5kKGAuaXRlbVtkYXRhLXZhbHVlPVwiJHt2YWx1ZX1cIl1gKTtcblxuICAgICAgICAgICAgICAgIGlmICghZXhpc3RpbmdJdGVtLmxlbmd0aCAmJiB2YWx1ZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHRlbXBvcmFyeSBpdGVtIGZvciBtb2JpbGUgbnVtYmVyIG9yIG90aGVyIGR5bmFtaWMgdmFsdWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHRoaXMuZXNjYXBlSHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCh0ZXh0KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiB0ZXh0O1xuICAgICAgICAgICAgICAgICAgICAkbWVudS5hcHBlbmQoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiIGRhdGEtdGV4dD1cIiR7c2FmZVRleHQucmVwbGFjZSgvXCIvZywgJyZxdW90OycpfVwiPiR7c2FmZVRleHR9PC9kaXY+YCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHNlbGVjdGVkIHZhbHVlIGluIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBGb3JjZSB0ZXh0IHVwZGF0ZSBpZiBTZW1hbnRpYyBVSSBkaWRuJ3QgcGljayBpdCB1cFxuICAgICAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgICAgIGlmICgkdGV4dEVsZW1lbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ZXh0RWxlbWVudC5odG1sKHRleHQpO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZGVmYXVsdCBjbGFzcyB0byBzaG93IHRleHQgYXMgc2VsZWN0ZWQsIG5vdCBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICAkdGV4dEVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEp1c3Qgc2V0IHRoZSB2YWx1ZSwgbGV0IGRyb3Bkb3duIGhhbmRsZSB0ZXh0XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRlZmF1bHQgY2xhc3MgaWYgdmFsdWUgaXMgc2V0XG4gICAgICAgICAgICAgICAgY29uc3QgJHRleHRFbGVtZW50ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCR0ZXh0RWxlbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRleHRFbGVtZW50LnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQgfHwgJyc7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgZm9yIGZvcm0gcHJvY2Vzc2luZ1xuICAgICAgICAkaGlkZGVuSW5wdXQudHJpZ2dlcignY2hhbmdlJyk7XG5cbiAgICAgICAgLy8gTm90aWZ5IGZvcm0gb2YgY2hhbmdlc1xuICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uZGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgZGlzcGxheSB0ZXh0IHdpdGhvdXQgY2hhbmdpbmcgdmFsdWVcbiAgICAgKiBWNS4wOiBOZXcgbWV0aG9kIGZvciB1cGRhdGluZyBkaXNwbGF5IHRleHQgb25seVxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gRGlzcGxheSB0ZXh0IHRvIHNldFxuICAgICAqL1xuICAgIHNldFRleHQoZmllbGRJZCwgdGV4dCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBFeHRlbnNpb25TZWxlY3RvcjogSW5zdGFuY2Ugbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgaWYgKCR0ZXh0RWxlbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSB0ZXh0IGJlZm9yZSBzZXR0aW5nXG4gICAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQodGV4dClcbiAgICAgICAgICAgICAgICAgICAgOiB0ZXh0O1xuICAgICAgICAgICAgICAgICR0ZXh0RWxlbWVudC5odG1sKHNhZmVUZXh0KTtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZGVmYXVsdCBjbGFzcyB0byBzaG93IHRleHQgYXMgc2VsZWN0ZWQsIG5vdCBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICR0ZXh0RWxlbWVudC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gdGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgdmFsdWVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBDdXJyZW50IHZhbHVlXG4gICAgICovXG4gICAgZ2V0VmFsdWUoZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlID8gaW5zdGFuY2UuY3VycmVudFZhbHVlIDogbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGNsZWFyKGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgLy8gVXNlIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgdG8gY2xlYXJcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXIoZmllbGRJZCk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBkZWZhdWx0IGNsYXNzIHRvIHNob3cgcGxhY2Vob2xkZXIgc3R5bGVcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgICAgIGlmICgkdGV4dEVsZW1lbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ZXh0RWxlbWVudC5hZGRDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgICAgICBpbnN0YW5jZS5jdXJyZW50VmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgaW5zdGFuY2UuY3VycmVudFRleHQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIGRyb3Bkb3duIGRhdGFcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICovXG4gICAgcmVmcmVzaChmaWVsZElkKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciBjYWNoZSBmb3IgZXh0ZW5zaW9ucyBBUElcbiAgICAgKiBDYWxsIHRoaXMgYWZ0ZXIgZXh0ZW5zaW9uIG9wZXJhdGlvbnMgKGFkZC9lZGl0L2RlbGV0ZSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIE9wdGlvbmFsOiBzcGVjaWZpYyB0eXBlIHRvIGNsZWFyICgncm91dGluZycsICdpbnRlcm5hbCcsIGV0Yy4pXG4gICAgICovXG4gICAgY2xlYXJDYWNoZSh0eXBlID0gbnVsbCkge1xuICAgICAgICBpZiAodHlwZSkge1xuICAgICAgICAgICAgLy8gQ2xlYXIgY2FjaGUgZm9yIHNwZWNpZmljIHR5cGVcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXJDYWNoZUZvcignL3BieGNvcmUvYXBpL3YzL2V4dGVuc2lvbnM6Z2V0Rm9yU2VsZWN0JywgeyB0eXBlIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2xlYXIgYWxsIGV4dGVuc2lvbnMgY2FjaGVcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXJDYWNoZUZvcignL3BieGNvcmUvYXBpL3YzL2V4dGVuc2lvbnM6Z2V0Rm9yU2VsZWN0Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggYWxsIGV4dGVuc2lvbiBkcm9wZG93bnMgb24gdGhlIHBhZ2VcbiAgICAgKiBUaGlzIHdpbGwgZm9yY2UgdGhlbSB0byByZWxvYWQgZGF0YSBmcm9tIHNlcnZlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gT3B0aW9uYWw6IHNwZWNpZmljIHR5cGUgdG8gcmVmcmVzaCAoJ3JvdXRpbmcnLCAnaW50ZXJuYWwnLCBldGMuKVxuICAgICAqL1xuICAgIHJlZnJlc2hBbGwodHlwZSA9IG51bGwpIHtcbiAgICAgICAgLy8gQ2xlYXIgY2FjaGUgZmlyc3RcbiAgICAgICAgdGhpcy5jbGVhckNhY2hlKHR5cGUpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVmcmVzaCBlYWNoIGFjdGl2ZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSwgZmllbGRJZCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0eXBlIHx8IGluc3RhbmNlLmNvbmZpZy50eXBlID09PSB0eXBlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgZHJvcGRvd24gYW5kIHJlbG9hZFxuICAgICAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXIoZmllbGRJZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVpbml0aWFsaXplIGRyb3Bkb3duIHRvIHRyaWdnZXIgbmV3IEFQSSByZXF1ZXN0XG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGV4dGVuc2lvbiBleGNsdXNpb24gbGlzdCBmb3IgZXhpc3RpbmcgaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtBcnJheX0gZXhjbHVkZUV4dGVuc2lvbnMgLSBFeHRlbnNpb25zIHRvIGV4Y2x1ZGVcbiAgICAgKi9cbiAgICB1cGRhdGVFeGNsdXNpb25zKGZpZWxkSWQsIGV4Y2x1ZGVFeHRlbnNpb25zID0gW10pIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgRXh0ZW5zaW9uU2VsZWN0b3I6IEluc3RhbmNlIG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGRJZH1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaW5zdGFuY2UuY29uZmlnLmV4Y2x1ZGVFeHRlbnNpb25zID0gZXhjbHVkZUV4dGVuc2lvbnM7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBjYWNoZSBmb3IgdGhpcyBzcGVjaWZpYyBjb25maWd1cmF0aW9uXG4gICAgICAgIGNvbnN0IGNhY2hlS2V5ID0gdGhpcy5nZW5lcmF0ZUNhY2hlS2V5KGluc3RhbmNlLmNvbmZpZyk7XG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXJDYWNoZUZvcignL3BieGNvcmUvYXBpL3YzL2V4dGVuc2lvbnM6Z2V0Rm9yU2VsZWN0JywgY2FjaGVLZXkpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVmcmVzaCBkcm9wZG93blxuICAgICAgICB0aGlzLnJlZnJlc2goZmllbGRJZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBjYWNoZSBrZXkgYmFzZWQgb24gY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBFeHRlbnNpb24gc2VsZWN0b3IgY29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IENhY2hlIGtleSBwYXJhbWV0ZXJzXG4gICAgICovXG4gICAgZ2VuZXJhdGVDYWNoZUtleShjb25maWcpIHtcbiAgICAgICAgY29uc3QgY2FjaGVQYXJhbXMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb25maWcudHlwZSAmJiBjb25maWcudHlwZSAhPT0gJ2FsbCcpIHtcbiAgICAgICAgICAgIGNhY2hlUGFyYW1zLnR5cGUgPSBjb25maWcudHlwZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucyAmJiBjb25maWcuZXhjbHVkZUV4dGVuc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY2FjaGVQYXJhbXMuZXhjbHVkZSA9IGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucy5qb2luKCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjYWNoZVBhcmFtcztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICovXG4gICAgZGVzdHJveShmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBmcm9tIGluc3RhbmNlc1xuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZXMuZGVsZXRlKGZpZWxkSWQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGRpdi50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHJldHVybiBkaXYuaW5uZXJIVE1MO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXh0ZW5zaW9uU2VsZWN0b3I7XG59Il19