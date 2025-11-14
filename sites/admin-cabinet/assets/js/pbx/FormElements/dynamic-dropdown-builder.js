"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global $, Form, globalTranslate, SecurityUtils */

/**
 * DynamicDropdownBuilder - Universal dropdown builder for MikoPBX V5.0
 * 
 * Builds dropdown HTML dynamically based on REST API data.
 * Separates concerns: PHP forms only provide hidden inputs, 
 * JavaScript builds UI and populates with data.
 * 
 * Usage:
 * DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
 *     apiUrl: '/pbxcore/api/v2/network-filters/getForSelect',
 *     placeholder: 'Select network filter'
 * });
 */
var DynamicDropdownBuilder = {
  /**
   * Build dropdown for a field based on REST API data
   * @param {string} fieldName - Field name (e.g., 'networkfilterid')
   * @param {object} data - Data from REST API
   * @param {object} config - Dropdown configuration
   */
  buildDropdown: function buildDropdown(fieldName, data) {
    var config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var $hiddenInput = $("#".concat(fieldName));

    if (!$hiddenInput.length) {
      console.warn("Hidden input not found for field: ".concat(fieldName));
      return;
    } // Check if dropdown already exists - update it instead of creating duplicate


    var $existingDropdown = $("#".concat(fieldName, "-dropdown"));

    if ($existingDropdown.length) {
      this.updateExistingDropdown(fieldName, data, config);
      return;
    } // Get current values from data


    var currentValue = data[fieldName] || config.defaultValue || '';
    var representField = "".concat(fieldName, "_represent"); // Try multiple possible represent field names for flexibility

    var currentText = data[representField];

    if (!currentText) {
      // Try without 'id' suffix (e.g., networkfilter_represent instead of networkfilterid_represent)
      var baseFieldName = fieldName.replace(/id$/, '');
      var alternativeRepresentField = "".concat(baseFieldName, "_represent");
      currentText = data[alternativeRepresentField];
    } // If we have a value but no represent text, try to find it in static options first


    if (currentValue && !currentText && config.staticOptions) {
      var matchingOption = config.staticOptions.find(function (option) {
        return option.value === currentValue;
      });

      if (matchingOption) {
        currentText = matchingOption.text || matchingOption.name;
      }
    } // Sanitize HTML in represent text using SecurityUtils


    if (currentText && typeof currentText === 'string' && typeof SecurityUtils !== 'undefined') {
      // Use sanitizeObjectRepresentations for all _represent fields as they can contain HTML entities and icons
      currentText = SecurityUtils.sanitizeObjectRepresentations(currentText);
    } // Check if we're using placeholder text


    var isUsingPlaceholder = !currentText; // Fallback to placeholder or default

    currentText = currentText || config.placeholder || 'Select value'; // Build CSS classes with sanitization
    // Allow custom base classes or use default with 'selection'

    var defaultBaseClasses = ['ui', 'selection', 'dropdown'];
    var baseClasses = config.baseClasses || defaultBaseClasses;
    var additionalClasses = config.additionalClasses || [];
    var allClasses = [].concat(_toConsumableArray(baseClasses), _toConsumableArray(additionalClasses)).join(' '); // Build dropdown HTML - FIXED: Create elements with jQuery to properly handle HTML content
    // Only show current value in text display, let API populate menu on click
    // Use 'default' class when showing placeholder, even if there's a value

    var textClass = isUsingPlaceholder ? 'text default' : 'text'; // Sanitize fieldName for use in ID attribute

    var safeFieldName = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeAttribute(fieldName) : fieldName; // Create dropdown structure using jQuery for proper HTML handling

    var $dropdown = $('<div>').addClass(allClasses).attr('id', "".concat(safeFieldName, "-dropdown"));
    var $textDiv = $('<div>').addClass(textClass).html(currentText); // currentText already sanitized above

    var $dropdownIcon = $('<i>').addClass('dropdown icon');
    var $menu = $('<div>').addClass('menu').html('<!-- Menu intentionally empty - will be populated by API on click -->'); // Assemble dropdown

    $dropdown.append($textDiv, $dropdownIcon, $menu); // Insert dropdown after hidden input

    $dropdown.insertAfter($hiddenInput); // Set value in hidden input

    $hiddenInput.val(currentValue); // Initialize dropdown

    this.initializeDropdown(fieldName, config);
  },

  /**
   * Update existing dropdown with new configuration
   * @param {string} fieldName - Field name
   * @param {object} data - Data for the dropdown
   * @param {object} config - New configuration to apply
   */
  updateExistingDropdown: function updateExistingDropdown(fieldName, data, config) {
    var $dropdown = $("#".concat(fieldName, "-dropdown"));
    var $hiddenInput = $("#".concat(fieldName));

    if (!$dropdown.length) {
      console.warn("Cannot update: dropdown not found for field: ".concat(fieldName));
      return;
    } // Update hidden input value if provided


    var currentValue = data[fieldName] || config.defaultValue || '';

    if (currentValue) {
      $hiddenInput.val(currentValue);
    } // Update dropdown text if represent field is provided


    var representField = "".concat(fieldName, "_represent");
    var currentText = data[representField];

    if (!currentText) {
      var baseFieldName = fieldName.replace(/id$/, '');
      var alternativeRepresentField = "".concat(baseFieldName, "_represent");
      currentText = data[alternativeRepresentField];
    } // Sanitize HTML in represent text using SecurityUtils (consistent with buildDropdown)


    if (currentText && typeof currentText === 'string' && typeof SecurityUtils !== 'undefined') {
      // Use sanitizeObjectRepresentations for all _represent fields as they can contain HTML entities and icons
      currentText = SecurityUtils.sanitizeObjectRepresentations(currentText);
    }

    if (currentText) {
      var $textElement = $dropdown.find('.text');
      $textElement.html(currentText);
      $textElement.removeClass('default');
    } // Re-initialize dropdown with new configuration


    this.initializeDropdown(fieldName, config);
  },

  /**
   * Initialize dropdown with API or static data
   * @param {string} fieldName - Field name
   * @param {object} config - Configuration object
   */
  initializeDropdown: function initializeDropdown(fieldName, config) {
    var _this = this;

    var $dropdown = $("#".concat(fieldName, "-dropdown"));
    var $hiddenInput = $("#".concat(fieldName));

    if (!$dropdown.length) {
      console.warn("Dropdown not found: ".concat(fieldName, "-dropdown"));
      return;
    }

    var settings = {
      allowAdditions: false,
      fullTextSearch: true,
      forceSelection: false,
      preserveHTML: true,
      // Allow HTML in dropdown text (for icons, flags, etc.)
      onChange: function onChange(value, text, $choice) {
        // Automatic synchronization with hidden input
        $hiddenInput.val(value); // Trigger change event on hidden input for form validation/processing

        $hiddenInput.trigger('change'); // Notify form of changes

        if (typeof Form !== 'undefined' && Form.dataChanged) {
          Form.dataChanged();
        } // Custom onChange handler - only for field-specific logic


        if (config.onChange) {
          config.onChange(value, text, $choice);
        }
      }
    }; // Add API settings if provided

    if (config.apiUrl) {
      // Check if dropdown has search functionality - detect by CSS classes since search input is added by Fomantic UI later
      var hasSearchInput = $dropdown.hasClass('search');
      var apiUrl = config.apiUrl; // Only add query parameter for searchable dropdowns

      if (hasSearchInput) {
        if (config.apiUrl.indexOf('?') > -1) {
          apiUrl += '&query={query}';
        } else {
          apiUrl += '?query={query}';
        }
      }

      settings.apiSettings = {
        url: apiUrl,
        cache: config.cache !== undefined ? config.cache : true,
        throttle: hasSearchInput ? 500 : 0,
        throttleFirstRequest: false,
        filterRemoteData: true,
        minCharacters: hasSearchInput ? 3 : 0,
        // Search dropdowns need 3 characters, simple dropdowns work on click
        onResponse: function onResponse(response) {
          return config.onResponse ? config.onResponse(response) : _this.defaultResponseHandler(response);
        },
        onFailure: function onFailure(response) {
          console.error("\u274C API request failed for ".concat(fieldName, " (").concat(config.apiUrl, "):"), response);
        }
      }; // Add additional API parameters if provided

      if (config.apiParams && _typeof(config.apiParams) === 'object') {
        var params = new URLSearchParams(config.apiParams);
        var existingParams = params.toString();

        if (existingParams) {
          if (apiUrl.indexOf('?') > -1) {
            var queryIndex = apiUrl.indexOf('query={query}');

            if (queryIndex > -1) {
              apiUrl = apiUrl.substring(0, queryIndex) + existingParams + '&query={query}';
            } else {
              apiUrl += '&' + existingParams;
            }
          } else {
            // Only add query parameter if the dropdown is searchable
            if (hasSearchInput) {
              apiUrl += '?' + existingParams + '&query={query}';
            } else {
              apiUrl += '?' + existingParams;
            }
          }

          settings.apiSettings.url = apiUrl;
        }
      } // Use custom template to properly render HTML content


      if (!config.templates) {
        settings.templates = {
          menu: this.customDropdownMenu
        };
      } else {
        settings.templates = config.templates;
      }
    } else if (config.staticOptions) {
      // For static options, populate menu immediately
      this.populateStaticOptions($dropdown, config.staticOptions);
    } // Initialize native Fomantic UI dropdown


    $dropdown.dropdown(settings); // Set selected value for static options after initialization

    if (config.staticOptions) {
      var currentValue = $hiddenInput.val();

      if (currentValue) {
        // Use setTimeout to ensure dropdown is fully initialized
        setTimeout(function () {
          $dropdown.dropdown('set selected', currentValue);
        }, 10);
      }
    }
  },

  /**
   * Default API response handler for MikoPBX format
   * @param {object} response - API response
   * @returns {object} Fomantic UI compatible response
   */
  defaultResponseHandler: function defaultResponseHandler(response) {
    if ((response.result || response.success) && response.data && Array.isArray(response.data)) {
      return {
        success: true,
        results: response.data.map(function (item) {
          var rawText = item.represent || item.name || item.text; // Sanitize display text while preserving safe HTML (icons)

          var safeText = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeObjectRepresentations(rawText) : rawText;
          return {
            value: item.value,
            text: safeText,
            name: safeText,
            disabled: item.disabled || false
          };
        })
      };
    }

    return {
      success: false,
      results: []
    };
  },

  /**
   * Custom dropdown menu template for proper HTML rendering
   * @param {object} response - Response from API
   * @param {object} fields - Field configuration
   * @returns {string} HTML for dropdown menu
   */
  customDropdownMenu: function customDropdownMenu(response, fields) {
    var values = response[fields.values] || {};
    var html = '';
    values.forEach(function (option) {
      var value = option[fields.value] || '';
      var text = option[fields.text] || option[fields.name] || '';
      var isDisabled = option.disabled || false; // Use 'inactive' class for visual styling without blocking selection

      var visualClass = isDisabled ? ' inactive' : '';
      html += "<div class=\"item".concat(visualClass, "\" data-value=\"").concat(DynamicDropdownBuilder.escapeHtml(value), "\">");
      html += text;
      html += '</div>';
    });
    return html;
  },

  /**
   * Populate dropdown with static options
   * @param {jQuery} $dropdown - Dropdown element
   * @param {Array} options - Static options array
   */
  populateStaticOptions: function populateStaticOptions($dropdown, options) {
    var _this2 = this;

    var $menu = $dropdown.find('.menu');
    options.forEach(function (option) {
      var rawValue = option.value;
      var rawText = option.text || option.name; // Sanitize value for attribute and text for display

      var safeValue = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeAttribute(rawValue) : _this2.escapeHtml(rawValue);
      var safeText = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeObjectRepresentations(rawText) : rawText;
      $menu.append("<div class=\"item\" data-value=\"".concat(safeValue, "\">").concat(safeText, "</div>"));
    });
  },

  /**
   * Build multiple dropdowns from configuration object
   * @param {object} data - Data from REST API
   * @param {object} configs - Configuration for each field
   */
  buildMultipleDropdowns: function buildMultipleDropdowns(data, configs) {
    var _this3 = this;

    Object.keys(configs).forEach(function (fieldName) {
      _this3.buildDropdown(fieldName, data, configs[fieldName]);
    });
  },

  /**
   * Set value in existing dropdown
   * @param {string} fieldName - Field name
   * @param {string} value - Value to set
   */
  setValue: function setValue(fieldName, value) {
    var $dropdown = $("#".concat(fieldName, "-dropdown"));

    if ($dropdown.length) {
      $dropdown.dropdown('set selected', value);
    }
  },

  /**
   * Get current dropdown value
   * @param {string} fieldName - Field name
   * @returns {string} Current value
   */
  getValue: function getValue(fieldName) {
    var $dropdown = $("#".concat(fieldName, "-dropdown"));
    return $dropdown.length ? $dropdown.dropdown('get value') : '';
  },

  /**
   * Clear dropdown selection
   * @param {string} fieldName - Field name
   */
  clear: function clear(fieldName) {
    var $dropdown = $("#".concat(fieldName, "-dropdown"));

    if ($dropdown.length) {
      $dropdown.dropdown('clear');
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
  module.exports = DynamicDropdownBuilder;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImlzVXNpbmdQbGFjZWhvbGRlciIsInBsYWNlaG9sZGVyIiwiZGVmYXVsdEJhc2VDbGFzc2VzIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiYXBwZW5kIiwiaW5zZXJ0QWZ0ZXIiLCJ2YWwiLCJpbml0aWFsaXplRHJvcGRvd24iLCIkdGV4dEVsZW1lbnQiLCJyZW1vdmVDbGFzcyIsInNldHRpbmdzIiwiYWxsb3dBZGRpdGlvbnMiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwicHJlc2VydmVIVE1MIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInVuZGVmaW5lZCIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJmaWx0ZXJSZW1vdGVEYXRhIiwibWluQ2hhcmFjdGVycyIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImRlZmF1bHRSZXNwb25zZUhhbmRsZXIiLCJvbkZhaWx1cmUiLCJlcnJvciIsImFwaVBhcmFtcyIsInBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImV4aXN0aW5nUGFyYW1zIiwidG9TdHJpbmciLCJxdWVyeUluZGV4Iiwic3Vic3RyaW5nIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsInBvcHVsYXRlU3RhdGljT3B0aW9ucyIsImRyb3Bkb3duIiwic2V0VGltZW91dCIsInJlc3VsdCIsInN1Y2Nlc3MiLCJBcnJheSIsImlzQXJyYXkiLCJyZXN1bHRzIiwibWFwIiwiaXRlbSIsInJhd1RleHQiLCJyZXByZXNlbnQiLCJzYWZlVGV4dCIsImRpc2FibGVkIiwiZmllbGRzIiwidmFsdWVzIiwiZm9yRWFjaCIsImlzRGlzYWJsZWQiLCJ2aXN1YWxDbGFzcyIsImVzY2FwZUh0bWwiLCJvcHRpb25zIiwicmF3VmFsdWUiLCJzYWZlVmFsdWUiLCJidWlsZE11bHRpcGxlRHJvcGRvd25zIiwiY29uZmlncyIsIk9iamVjdCIsImtleXMiLCJzZXRWYWx1ZSIsImdldFZhbHVlIiwiY2xlYXIiLCJkaXYiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJ0ZXh0Q29udGVudCIsImlubmVySFRNTCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUlvQyxTQUFTLENBQUMvQixNQUFkLEVBQXNCO0FBQ2xCK0IsTUFBQUEsU0FBUyxDQUFDbUQsUUFBVixDQUFtQixPQUFuQjtBQUNIO0FBQ0osR0FoWjBCOztBQWtaM0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJa0IsRUFBQUEsVUF2WjJCLHNCQXVaaEJuRixJQXZaZ0IsRUF1WlY7QUFDYixRQUFNOEYsR0FBRyxHQUFHQyxRQUFRLENBQUNDLGFBQVQsQ0FBdUIsS0FBdkIsQ0FBWjtBQUNBRixJQUFBQSxHQUFHLENBQUNHLFdBQUosR0FBa0JqRyxJQUFsQjtBQUNBLFdBQU84RixHQUFHLENBQUNJLFNBQVg7QUFDSDtBQTNaMEIsQ0FBL0IsQyxDQThaQTs7QUFDQSxJQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjVILHNCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIEZvcm0sIGdsb2JhbFRyYW5zbGF0ZSwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgLSBVbml2ZXJzYWwgZHJvcGRvd24gYnVpbGRlciBmb3IgTWlrb1BCWCBWNS4wXG4gKiBcbiAqIEJ1aWxkcyBkcm9wZG93biBIVE1MIGR5bmFtaWNhbGx5IGJhc2VkIG9uIFJFU1QgQVBJIGRhdGEuXG4gKiBTZXBhcmF0ZXMgY29uY2VybnM6IFBIUCBmb3JtcyBvbmx5IHByb3ZpZGUgaGlkZGVuIGlucHV0cywgXG4gKiBKYXZhU2NyaXB0IGJ1aWxkcyBVSSBhbmQgcG9wdWxhdGVzIHdpdGggZGF0YS5cbiAqIFxuICogVXNhZ2U6XG4gKiBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAqICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjIvbmV0d29yay1maWx0ZXJzL2dldEZvclNlbGVjdCcsXG4gKiAgICAgcGxhY2Vob2xkZXI6ICdTZWxlY3QgbmV0d29yayBmaWx0ZXInXG4gKiB9KTtcbiAqL1xuY29uc3QgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBkcm9wZG93biBmb3IgYSBmaWVsZCBiYXNlZCBvbiBSRVNUIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgKGUuZy4sICduZXR3b3JrZmlsdGVyaWQnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIERyb3Bkb3duIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBidWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnID0ge30pIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEhpZGRlbiBpbnB1dCBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gYWxyZWFkeSBleGlzdHMgLSB1cGRhdGUgaXQgaW5zdGVhZCBvZiBjcmVhdGluZyBkdXBsaWNhdGVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRXhpc3RpbmdEcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlcyBmcm9tIGRhdGFcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gZGF0YVtmaWVsZE5hbWVdIHx8IGNvbmZpZy5kZWZhdWx0VmFsdWUgfHwgJyc7XG4gICAgICAgIGNvbnN0IHJlcHJlc2VudEZpZWxkID0gYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHBvc3NpYmxlIHJlcHJlc2VudCBmaWVsZCBuYW1lcyBmb3IgZmxleGliaWxpdHlcbiAgICAgICAgbGV0IGN1cnJlbnRUZXh0ID0gZGF0YVtyZXByZXNlbnRGaWVsZF07XG4gICAgICAgIFxuICAgICAgICBpZiAoIWN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICAvLyBUcnkgd2l0aG91dCAnaWQnIHN1ZmZpeCAoZS5nLiwgbmV0d29ya2ZpbHRlcl9yZXByZXNlbnQgaW5zdGVhZCBvZiBuZXR3b3JrZmlsdGVyaWRfcmVwcmVzZW50KVxuICAgICAgICAgICAgY29uc3QgYmFzZUZpZWxkTmFtZSA9IGZpZWxkTmFtZS5yZXBsYWNlKC9pZCQvLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkID0gYCR7YmFzZUZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gZGF0YVthbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIHZhbHVlIGJ1dCBubyByZXByZXNlbnQgdGV4dCwgdHJ5IHRvIGZpbmQgaXQgaW4gc3RhdGljIG9wdGlvbnMgZmlyc3RcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiAhY3VycmVudFRleHQgJiYgY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoaW5nT3B0aW9uID0gY29uZmlnLnN0YXRpY09wdGlvbnMuZmluZChvcHRpb24gPT4gb3B0aW9uLnZhbHVlID09PSBjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgaWYgKG1hdGNoaW5nT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFRleHQgPSBtYXRjaGluZ09wdGlvbi50ZXh0IHx8IG1hdGNoaW5nT3B0aW9uLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIEhUTUwgaW4gcmVwcmVzZW50IHRleHQgdXNpbmcgU2VjdXJpdHlVdGlsc1xuICAgICAgICBpZiAoY3VycmVudFRleHQgJiYgdHlwZW9mIGN1cnJlbnRUZXh0ID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIFVzZSBzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyBmb3IgYWxsIF9yZXByZXNlbnQgZmllbGRzIGFzIHRoZXkgY2FuIGNvbnRhaW4gSFRNTCBlbnRpdGllcyBhbmQgaWNvbnNcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhjdXJyZW50VGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIHVzaW5nIHBsYWNlaG9sZGVyIHRleHRcbiAgICAgICAgY29uc3QgaXNVc2luZ1BsYWNlaG9sZGVyID0gIWN1cnJlbnRUZXh0O1xuXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIHBsYWNlaG9sZGVyIG9yIGRlZmF1bHRcbiAgICAgICAgY3VycmVudFRleHQgPSBjdXJyZW50VGV4dCB8fCBjb25maWcucGxhY2Vob2xkZXIgfHwgJ1NlbGVjdCB2YWx1ZSc7XG5cbiAgICAgICAgLy8gQnVpbGQgQ1NTIGNsYXNzZXMgd2l0aCBzYW5pdGl6YXRpb25cbiAgICAgICAgLy8gQWxsb3cgY3VzdG9tIGJhc2UgY2xhc3NlcyBvciB1c2UgZGVmYXVsdCB3aXRoICdzZWxlY3Rpb24nXG4gICAgICAgIGNvbnN0IGRlZmF1bHRCYXNlQ2xhc3NlcyA9IFsndWknLCAnc2VsZWN0aW9uJywgJ2Ryb3Bkb3duJ107XG4gICAgICAgIGNvbnN0IGJhc2VDbGFzc2VzID0gY29uZmlnLmJhc2VDbGFzc2VzIHx8IGRlZmF1bHRCYXNlQ2xhc3NlcztcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbENsYXNzZXMgPSBjb25maWcuYWRkaXRpb25hbENsYXNzZXMgfHwgW107XG4gICAgICAgIGNvbnN0IGFsbENsYXNzZXMgPSBbLi4uYmFzZUNsYXNzZXMsIC4uLmFkZGl0aW9uYWxDbGFzc2VzXS5qb2luKCcgJyk7XG5cbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gSFRNTCAtIEZJWEVEOiBDcmVhdGUgZWxlbWVudHMgd2l0aCBqUXVlcnkgdG8gcHJvcGVybHkgaGFuZGxlIEhUTUwgY29udGVudFxuICAgICAgICAvLyBPbmx5IHNob3cgY3VycmVudCB2YWx1ZSBpbiB0ZXh0IGRpc3BsYXksIGxldCBBUEkgcG9wdWxhdGUgbWVudSBvbiBjbGlja1xuICAgICAgICAvLyBVc2UgJ2RlZmF1bHQnIGNsYXNzIHdoZW4gc2hvd2luZyBwbGFjZWhvbGRlciwgZXZlbiBpZiB0aGVyZSdzIGEgdmFsdWVcbiAgICAgICAgY29uc3QgdGV4dENsYXNzID0gaXNVc2luZ1BsYWNlaG9sZGVyID8gJ3RleHQgZGVmYXVsdCcgOiAndGV4dCc7XG4gICAgICAgIFxuICAgICAgICAvLyBTYW5pdGl6ZSBmaWVsZE5hbWUgZm9yIHVzZSBpbiBJRCBhdHRyaWJ1dGVcbiAgICAgICAgY29uc3Qgc2FmZUZpZWxkTmFtZSA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUF0dHJpYnV0ZShmaWVsZE5hbWUpXG4gICAgICAgICAgICA6IGZpZWxkTmFtZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBzdHJ1Y3R1cmUgdXNpbmcgalF1ZXJ5IGZvciBwcm9wZXIgSFRNTCBoYW5kbGluZ1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoYWxsQ2xhc3NlcylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGAke3NhZmVGaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkdGV4dERpdiA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0ZXh0Q2xhc3MpXG4gICAgICAgICAgICAuaHRtbChjdXJyZW50VGV4dCk7IC8vIGN1cnJlbnRUZXh0IGFscmVhZHkgc2FuaXRpemVkIGFib3ZlXG4gICAgICAgIFxuICAgICAgICBjb25zdCAkZHJvcGRvd25JY29uID0gJCgnPGk+JykuYWRkQ2xhc3MoJ2Ryb3Bkb3duIGljb24nKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnPGRpdj4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdtZW51JylcbiAgICAgICAgICAgIC5odG1sKCc8IS0tIE1lbnUgaW50ZW50aW9uYWxseSBlbXB0eSAtIHdpbGwgYmUgcG9wdWxhdGVkIGJ5IEFQSSBvbiBjbGljayAtLT4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFzc2VtYmxlIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5hcHBlbmQoJHRleHREaXYsICRkcm9wZG93bkljb24sICRtZW51KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluc2VydCBkcm9wZG93biBhZnRlciBoaWRkZW4gaW5wdXRcbiAgICAgICAgJGRyb3Bkb3duLmluc2VydEFmdGVyKCRoaWRkZW5JbnB1dCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdmFsdWUgaW4gaGlkZGVuIGlucHV0XG4gICAgICAgICRoaWRkZW5JbnB1dC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGV4aXN0aW5nIGRyb3Bkb3duIHdpdGggbmV3IGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIE5ldyBjb25maWd1cmF0aW9uIHRvIGFwcGx5XG4gICAgICovXG4gICAgdXBkYXRlRXhpc3RpbmdEcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZykge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBDYW5ub3QgdXBkYXRlOiBkcm9wZG93biBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB2YWx1ZSBpZiBwcm92aWRlZFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBkYXRhW2ZpZWxkTmFtZV0gfHwgY29uZmlnLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbChjdXJyZW50VmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gdGV4dCBpZiByZXByZXNlbnQgZmllbGQgaXMgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgcmVwcmVzZW50RmllbGQgPSBgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgIGxldCBjdXJyZW50VGV4dCA9IGRhdGFbcmVwcmVzZW50RmllbGRdO1xuICAgICAgICBpZiAoIWN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICBjb25zdCBiYXNlRmllbGROYW1lID0gZmllbGROYW1lLnJlcGxhY2UoL2lkJC8sICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQgPSBgJHtiYXNlRmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBkYXRhW2FsdGVybmF0aXZlUmVwcmVzZW50RmllbGRdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTYW5pdGl6ZSBIVE1MIGluIHJlcHJlc2VudCB0ZXh0IHVzaW5nIFNlY3VyaXR5VXRpbHMgKGNvbnNpc3RlbnQgd2l0aCBidWlsZERyb3Bkb3duKVxuICAgICAgICBpZiAoY3VycmVudFRleHQgJiYgdHlwZW9mIGN1cnJlbnRUZXh0ID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIFVzZSBzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyBmb3IgYWxsIF9yZXByZXNlbnQgZmllbGRzIGFzIHRoZXkgY2FuIGNvbnRhaW4gSFRNTCBlbnRpdGllcyBhbmQgaWNvbnNcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhjdXJyZW50VGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgY29uc3QgJHRleHRFbGVtZW50ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Jyk7XG4gICAgICAgICAgICAkdGV4dEVsZW1lbnQuaHRtbChjdXJyZW50VGV4dCk7XG4gICAgICAgICAgICAkdGV4dEVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkcm9wZG93biB3aXRoIG5ldyBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBBUEkgb3Igc3RhdGljIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZykge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBEcm9wZG93biBub3QgZm91bmQ6ICR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBhbGxvd0FkZGl0aW9uczogZmFsc2UsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIHByZXNlcnZlSFRNTDogdHJ1ZSwgLy8gQWxsb3cgSFRNTCBpbiBkcm9wZG93biB0ZXh0IChmb3IgaWNvbnMsIGZsYWdzLCBldGMuKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQXV0b21hdGljIHN5bmNocm9uaXphdGlvbiB3aXRoIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9uIGhpZGRlbiBpbnB1dCBmb3IgZm9ybSB2YWxpZGF0aW9uL3Byb2Nlc3NpbmdcbiAgICAgICAgICAgICAgICAkaGlkZGVuSW5wdXQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTm90aWZ5IGZvcm0gb2YgY2hhbmdlc1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBvbkNoYW5nZSBoYW5kbGVyIC0gb25seSBmb3IgZmllbGQtc3BlY2lmaWMgbG9naWNcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLm9uQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5vbkNoYW5nZSh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIEFQSSBzZXR0aW5ncyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoY29uZmlnLmFwaVVybCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gaGFzIHNlYXJjaCBmdW5jdGlvbmFsaXR5IC0gZGV0ZWN0IGJ5IENTUyBjbGFzc2VzIHNpbmNlIHNlYXJjaCBpbnB1dCBpcyBhZGRlZCBieSBGb21hbnRpYyBVSSBsYXRlclxuICAgICAgICAgICAgY29uc3QgaGFzU2VhcmNoSW5wdXQgPSAkZHJvcGRvd24uaGFzQ2xhc3MoJ3NlYXJjaCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsZXQgYXBpVXJsID0gY29uZmlnLmFwaVVybDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBhZGQgcXVlcnkgcGFyYW1ldGVyIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duc1xuICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlVcmwuaW5kZXhPZignPycpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICc/cXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZXR0aW5ncy5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgICAgICB1cmw6IGFwaVVybCxcbiAgICAgICAgICAgICAgICBjYWNoZTogY29uZmlnLmNhY2hlICE9PSB1bmRlZmluZWQgPyBjb25maWcuY2FjaGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgIHRocm90dGxlOiBoYXNTZWFyY2hJbnB1dCA/IDUwMCA6IDAsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGVGaXJzdFJlcXVlc3Q6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICAgICAgbWluQ2hhcmFjdGVyczogaGFzU2VhcmNoSW5wdXQgPyAzIDogMCwgLy8gU2VhcmNoIGRyb3Bkb3ducyBuZWVkIDMgY2hhcmFjdGVycywgc2ltcGxlIGRyb3Bkb3ducyB3b3JrIG9uIGNsaWNrXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb25maWcub25SZXNwb25zZSBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gY29uZmlnLm9uUmVzcG9uc2UocmVzcG9uc2UpIFxuICAgICAgICAgICAgICAgICAgICAgICAgOiB0aGlzLmRlZmF1bHRSZXNwb25zZUhhbmRsZXIocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihg4p2MIEFQSSByZXF1ZXN0IGZhaWxlZCBmb3IgJHtmaWVsZE5hbWV9ICgke2NvbmZpZy5hcGlVcmx9KTpgLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBBUEkgcGFyYW1ldGVycyBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlQYXJhbXMgJiYgdHlwZW9mIGNvbmZpZy5hcGlQYXJhbXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhjb25maWcuYXBpUGFyYW1zKTtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ1BhcmFtcyA9IHBhcmFtcy50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1BhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXBpVXJsLmluZGV4T2YoJz8nKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBxdWVyeUluZGV4ID0gYXBpVXJsLmluZGV4T2YoJ3F1ZXJ5PXtxdWVyeX0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeUluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgPSBhcGlVcmwuc3Vic3RyaW5nKDAsIHF1ZXJ5SW5kZXgpICsgZXhpc3RpbmdQYXJhbXMgKyAnJnF1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyYnICsgZXhpc3RpbmdQYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgaWYgdGhlIGRyb3Bkb3duIGlzIHNlYXJjaGFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNTZWFyY2hJbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcyArICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzLnVybCA9IGFwaVVybDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gdGVtcGxhdGUgdG8gcHJvcGVybHkgcmVuZGVyIEhUTUwgY29udGVudFxuICAgICAgICAgICAgaWYgKCFjb25maWcudGVtcGxhdGVzKSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGVtcGxhdGVzID0ge1xuICAgICAgICAgICAgICAgICAgICBtZW51OiB0aGlzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnRlbXBsYXRlcyA9IGNvbmZpZy50ZW1wbGF0ZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIEZvciBzdGF0aWMgb3B0aW9ucywgcG9wdWxhdGUgbWVudSBpbW1lZGlhdGVseVxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZVN0YXRpY09wdGlvbnMoJGRyb3Bkb3duLCBjb25maWcuc3RhdGljT3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIG5hdGl2ZSBGb21hbnRpYyBVSSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oc2V0dGluZ3MpO1xuXG4gICAgICAgIC8vIFNldCBzZWxlY3RlZCB2YWx1ZSBmb3Igc3RhdGljIG9wdGlvbnMgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgaWYgKGNvbmZpZy5zdGF0aWNPcHRpb25zKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkaGlkZGVuSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIGRyb3Bkb3duIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgQVBJIHJlc3BvbnNlIGhhbmRsZXIgZm9yIE1pa29QQlggZm9ybWF0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICogQHJldHVybnMge29iamVjdH0gRm9tYW50aWMgVUkgY29tcGF0aWJsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGRlZmF1bHRSZXNwb25zZUhhbmRsZXIocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKChyZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2Uuc3VjY2VzcykgJiYgcmVzcG9uc2UuZGF0YSAmJiBBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVzdWx0czogcmVzcG9uc2UuZGF0YS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJhd1RleHQgPSBpdGVtLnJlcHJlc2VudCB8fCBpdGVtLm5hbWUgfHwgaXRlbS50ZXh0O1xuICAgICAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSBkaXNwbGF5IHRleHQgd2hpbGUgcHJlc2VydmluZyBzYWZlIEhUTUwgKGljb25zKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHJhd1RleHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogc2FmZVRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBzYWZlVGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBpdGVtLmRpc2FibGVkIHx8IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW11cbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBkcm9wZG93biBtZW51IHRlbXBsYXRlIGZvciBwcm9wZXIgSFRNTCByZW5kZXJpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmaWVsZHMgLSBGaWVsZCBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9wdGlvbltmaWVsZHMudmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9IG9wdGlvbltmaWVsZHMudGV4dF0gfHwgb3B0aW9uW2ZpZWxkcy5uYW1lXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSBvcHRpb24uZGlzYWJsZWQgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIFVzZSAnaW5hY3RpdmUnIGNsYXNzIGZvciB2aXN1YWwgc3R5bGluZyB3aXRob3V0IGJsb2NraW5nIHNlbGVjdGlvblxuICAgICAgICAgICAgY29uc3QgdmlzdWFsQ2xhc3MgPSBpc0Rpc2FibGVkID8gJyBpbmFjdGl2ZScgOiAnJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtJHt2aXN1YWxDbGFzc31cIiBkYXRhLXZhbHVlPVwiJHtEeW5hbWljRHJvcGRvd25CdWlsZGVyLmVzY2FwZUh0bWwodmFsdWUpfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9IHRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGRyb3Bkb3duIHdpdGggc3RhdGljIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGRyb3Bkb3duIC0gRHJvcGRvd24gZWxlbWVudFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMgLSBTdGF0aWMgb3B0aW9ucyBhcnJheVxuICAgICAqL1xuICAgIHBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgXG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBvcHRpb24udmFsdWU7XG4gICAgICAgICAgICBjb25zdCByYXdUZXh0ID0gb3B0aW9uLnRleHQgfHwgb3B0aW9uLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNhbml0aXplIHZhbHVlIGZvciBhdHRyaWJ1dGUgYW5kIHRleHQgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUocmF3VmFsdWUpXG4gICAgICAgICAgICAgICAgOiB0aGlzLmVzY2FwZUh0bWwocmF3VmFsdWUpO1xuICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgOiByYXdUZXh0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7c2FmZVRleHR9PC9kaXY+YCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgbXVsdGlwbGUgZHJvcGRvd25zIGZyb20gY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWdzIC0gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZFxuICAgICAqL1xuICAgIGJ1aWxkTXVsdGlwbGVEcm9wZG93bnMoZGF0YSwgY29uZmlncykge1xuICAgICAgICBPYmplY3Qua2V5cyhjb25maWdzKS5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWdzW2ZpZWxkTmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCB2YWx1ZSBpbiBleGlzdGluZyBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICovXG4gICAgc2V0VmFsdWUoZmllbGROYW1lLCB2YWx1ZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRWYWx1ZShmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICByZXR1cm4gJGRyb3Bkb3duLmxlbmd0aCA/ICRkcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgOiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICovXG4gICAgY2xlYXIoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGRpdi50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHJldHVybiBkaXYuaW5uZXJIVE1MO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRHluYW1pY0Ryb3Bkb3duQnVpbGRlcjtcbn0iXX0=