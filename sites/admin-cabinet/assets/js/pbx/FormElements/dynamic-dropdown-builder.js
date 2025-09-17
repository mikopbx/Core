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
    } // Fallback to placeholder or default


    currentText = currentText || config.placeholder || 'Select value'; // Build CSS classes with sanitization

    var baseClasses = ['ui', 'selection', 'dropdown'];
    var additionalClasses = config.additionalClasses || [];
    var allClasses = [].concat(baseClasses, _toConsumableArray(additionalClasses)).join(' '); // Build dropdown HTML - FIXED: Create elements with jQuery to properly handle HTML content
    // Only show current value in text display, let API populate menu on click

    var textClass = currentValue ? 'text' : 'text default'; // Sanitize fieldName for use in ID attribute

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


    $dropdown.dropdown(settings);
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
            name: safeText
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
      html += "<div class=\"item\" data-value=\"".concat(DynamicDropdownBuilder.escapeHtml(value), "\">");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsInBsYWNlaG9sZGVyIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiYXBwZW5kIiwiaW5zZXJ0QWZ0ZXIiLCJ2YWwiLCJpbml0aWFsaXplRHJvcGRvd24iLCIkdGV4dEVsZW1lbnQiLCJyZW1vdmVDbGFzcyIsInNldHRpbmdzIiwiYWxsb3dBZGRpdGlvbnMiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInVuZGVmaW5lZCIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJmaWx0ZXJSZW1vdGVEYXRhIiwibWluQ2hhcmFjdGVycyIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImRlZmF1bHRSZXNwb25zZUhhbmRsZXIiLCJvbkZhaWx1cmUiLCJlcnJvciIsImFwaVBhcmFtcyIsInBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImV4aXN0aW5nUGFyYW1zIiwidG9TdHJpbmciLCJxdWVyeUluZGV4Iiwic3Vic3RyaW5nIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsInBvcHVsYXRlU3RhdGljT3B0aW9ucyIsImRyb3Bkb3duIiwicmVzdWx0Iiwic3VjY2VzcyIsIkFycmF5IiwiaXNBcnJheSIsInJlc3VsdHMiLCJtYXAiLCJpdGVtIiwicmF3VGV4dCIsInJlcHJlc2VudCIsInNhZmVUZXh0IiwiZmllbGRzIiwidmFsdWVzIiwiZm9yRWFjaCIsImVzY2FwZUh0bWwiLCJvcHRpb25zIiwicmF3VmFsdWUiLCJzYWZlVmFsdWUiLCJidWlsZE11bHRpcGxlRHJvcGRvd25zIiwiY29uZmlncyIsIk9iamVjdCIsImtleXMiLCJzZXRWYWx1ZSIsImdldFZhbHVlIiwiY2xlYXIiLCJkaXYiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJ0ZXh0Q29udGVudCIsImlubmVySFRNTCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsc0JBQXNCLEdBQUc7QUFFM0I7QUFDSjtB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Q0EsV0FBT2tDLFNBQVMsQ0FBQzdCLE1BQVYsR0FBbUI2QixTQUFTLENBQUNrRCxRQUFWLENBQW1CLFdBQW5CLENBQW5CLEdBQXFELEVBQTVEO0FBQ0gsR0EvVzBCOztBQWlYM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSXdCLEVBQUFBLEtBclgyQixpQkFxWHJCNUcsU0FyWHFCLEVBcVhWO0FBQ2IsUUFBTWtDLFNBQVMsR0FBRzlCLENBQUMsWUFBS0osU0FBTCxlQUFuQjs7QUFDQSxRQUFJa0MsU0FBUyxDQUFDN0IsTUFBZCxFQUFzQjtBQUNsQjZCLE1BQUFBLFNBQVMsQ0FBQ2tELFFBQVYsQ0FBbUIsT0FBbkI7QUFDSDtBQUNKLEdBMVgwQjs7QUE0WDNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWMsRUFBQUEsVUFqWTJCLHNCQWlZaEI1RSxJQWpZZ0IsRUFpWVY7QUFDYixRQUFNdUYsR0FBRyxHQUFHQyxRQUFRLENBQUNDLGFBQVQsQ0FBdUIsS0FBdkIsQ0FBWjtBQUNBRixJQUFBQSxHQUFHLENBQUNHLFdBQUosR0FBa0IxRixJQUFsQjtBQUNBLFdBQU91RixHQUFHLENBQUNJLFNBQVg7QUFDSDtBQXJZMEIsQ0FBL0IsQyxDQXdZQTs7QUFDQSxJQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQnJILHNCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIEZvcm0sIGdsb2JhbFRyYW5zbGF0ZSwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgLSBVbml2ZXJzYWwgZHJvcGRvd24gYnVpbGRlciBmb3IgTWlrb1BCWCBWNS4wXG4gKiBcbiAqIEJ1aWxkcyBkcm9wZG93biBIVE1MIGR5bmFtaWNhbGx5IGJhc2VkIG9uIFJFU1QgQVBJIGRhdGEuXG4gKiBTZXBhcmF0ZXMgY29uY2VybnM6IFBIUCBmb3JtcyBvbmx5IHByb3ZpZGUgaGlkZGVuIGlucHV0cywgXG4gKiBKYXZhU2NyaXB0IGJ1aWxkcyBVSSBhbmQgcG9wdWxhdGVzIHdpdGggZGF0YS5cbiAqIFxuICogVXNhZ2U6XG4gKiBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAqICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjIvbmV0d29yay1maWx0ZXJzL2dldEZvclNlbGVjdCcsXG4gKiAgICAgcGxhY2Vob2xkZXI6ICdTZWxlY3QgbmV0d29yayBmaWx0ZXInXG4gKiB9KTtcbiAqL1xuY29uc3QgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBkcm9wZG93biBmb3IgYSBmaWVsZCBiYXNlZCBvbiBSRVNUIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgKGUuZy4sICduZXR3b3JrZmlsdGVyaWQnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIERyb3Bkb3duIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBidWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnID0ge30pIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEhpZGRlbiBpbnB1dCBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gYWxyZWFkeSBleGlzdHMgLSB1cGRhdGUgaXQgaW5zdGVhZCBvZiBjcmVhdGluZyBkdXBsaWNhdGVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRXhpc3RpbmdEcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlcyBmcm9tIGRhdGFcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gZGF0YVtmaWVsZE5hbWVdIHx8IGNvbmZpZy5kZWZhdWx0VmFsdWUgfHwgJyc7XG4gICAgICAgIGNvbnN0IHJlcHJlc2VudEZpZWxkID0gYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHBvc3NpYmxlIHJlcHJlc2VudCBmaWVsZCBuYW1lcyBmb3IgZmxleGliaWxpdHlcbiAgICAgICAgbGV0IGN1cnJlbnRUZXh0ID0gZGF0YVtyZXByZXNlbnRGaWVsZF07XG4gICAgICAgIFxuICAgICAgICBpZiAoIWN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICAvLyBUcnkgd2l0aG91dCAnaWQnIHN1ZmZpeCAoZS5nLiwgbmV0d29ya2ZpbHRlcl9yZXByZXNlbnQgaW5zdGVhZCBvZiBuZXR3b3JrZmlsdGVyaWRfcmVwcmVzZW50KVxuICAgICAgICAgICAgY29uc3QgYmFzZUZpZWxkTmFtZSA9IGZpZWxkTmFtZS5yZXBsYWNlKC9pZCQvLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkID0gYCR7YmFzZUZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gZGF0YVthbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIHZhbHVlIGJ1dCBubyByZXByZXNlbnQgdGV4dCwgdHJ5IHRvIGZpbmQgaXQgaW4gc3RhdGljIG9wdGlvbnMgZmlyc3RcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiAhY3VycmVudFRleHQgJiYgY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoaW5nT3B0aW9uID0gY29uZmlnLnN0YXRpY09wdGlvbnMuZmluZChvcHRpb24gPT4gb3B0aW9uLnZhbHVlID09PSBjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgaWYgKG1hdGNoaW5nT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFRleHQgPSBtYXRjaGluZ09wdGlvbi50ZXh0IHx8IG1hdGNoaW5nT3B0aW9uLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIEhUTUwgaW4gcmVwcmVzZW50IHRleHQgdXNpbmcgU2VjdXJpdHlVdGlsc1xuICAgICAgICBpZiAoY3VycmVudFRleHQgJiYgdHlwZW9mIGN1cnJlbnRUZXh0ID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIFVzZSBzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyBmb3IgYWxsIF9yZXByZXNlbnQgZmllbGRzIGFzIHRoZXkgY2FuIGNvbnRhaW4gSFRNTCBlbnRpdGllcyBhbmQgaWNvbnNcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhjdXJyZW50VGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIHBsYWNlaG9sZGVyIG9yIGRlZmF1bHRcbiAgICAgICAgY3VycmVudFRleHQgPSBjdXJyZW50VGV4dCB8fCBjb25maWcucGxhY2Vob2xkZXIgfHwgJ1NlbGVjdCB2YWx1ZSc7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBDU1MgY2xhc3NlcyB3aXRoIHNhbml0aXphdGlvblxuICAgICAgICBjb25zdCBiYXNlQ2xhc3NlcyA9IFsndWknLCAnc2VsZWN0aW9uJywgJ2Ryb3Bkb3duJ107XG4gICAgICAgIGNvbnN0IGFkZGl0aW9uYWxDbGFzc2VzID0gY29uZmlnLmFkZGl0aW9uYWxDbGFzc2VzIHx8IFtdO1xuICAgICAgICBjb25zdCBhbGxDbGFzc2VzID0gWy4uLmJhc2VDbGFzc2VzLCAuLi5hZGRpdGlvbmFsQ2xhc3Nlc10uam9pbignICcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gSFRNTCAtIEZJWEVEOiBDcmVhdGUgZWxlbWVudHMgd2l0aCBqUXVlcnkgdG8gcHJvcGVybHkgaGFuZGxlIEhUTUwgY29udGVudFxuICAgICAgICAvLyBPbmx5IHNob3cgY3VycmVudCB2YWx1ZSBpbiB0ZXh0IGRpc3BsYXksIGxldCBBUEkgcG9wdWxhdGUgbWVudSBvbiBjbGlja1xuICAgICAgICBjb25zdCB0ZXh0Q2xhc3MgPSBjdXJyZW50VmFsdWUgPyAndGV4dCcgOiAndGV4dCBkZWZhdWx0JztcbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIGZpZWxkTmFtZSBmb3IgdXNlIGluIElEIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCBzYWZlRmllbGROYW1lID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplQXR0cmlidXRlKGZpZWxkTmFtZSlcbiAgICAgICAgICAgIDogZmllbGROYW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIHN0cnVjdHVyZSB1c2luZyBqUXVlcnkgZm9yIHByb3BlciBIVE1MIGhhbmRsaW5nXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhhbGxDbGFzc2VzKVxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgYCR7c2FmZUZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICR0ZXh0RGl2ID0gJCgnPGRpdj4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKHRleHRDbGFzcylcbiAgICAgICAgICAgIC5odG1sKGN1cnJlbnRUZXh0KTsgLy8gY3VycmVudFRleHQgYWxyZWFkeSBzYW5pdGl6ZWQgYWJvdmVcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRkcm9wZG93bkljb24gPSAkKCc8aT4nKS5hZGRDbGFzcygnZHJvcGRvd24gaWNvbicpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCc8ZGl2PicpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ21lbnUnKVxuICAgICAgICAgICAgLmh0bWwoJzwhLS0gTWVudSBpbnRlbnRpb25hbGx5IGVtcHR5IC0gd2lsbCBiZSBwb3B1bGF0ZWQgYnkgQVBJIG9uIGNsaWNrIC0tPicpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXNzZW1ibGUgZHJvcGRvd25cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dERpdiwgJGRyb3Bkb3duSWNvbiwgJG1lbnUpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5zZXJ0IGRyb3Bkb3duIGFmdGVyIGhpZGRlbiBpbnB1dFxuICAgICAgICAkZHJvcGRvd24uaW5zZXJ0QWZ0ZXIoJGhpZGRlbklucHV0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB2YWx1ZSBpbiBoaWRkZW4gaW5wdXRcbiAgICAgICAgJGhpZGRlbklucHV0LnZhbChjdXJyZW50VmFsdWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZXhpc3RpbmcgZHJvcGRvd24gd2l0aCBuZXcgY29uZmlndXJhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZvciB0aGUgZHJvcGRvd25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gTmV3IGNvbmZpZ3VyYXRpb24gdG8gYXBwbHlcbiAgICAgKi9cbiAgICB1cGRhdGVFeGlzdGluZ0Ryb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYENhbm5vdCB1cGRhdGU6IGRyb3Bkb3duIG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGROYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHZhbHVlIGlmIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGRhdGFbZmllbGROYW1lXSB8fCBjb25maWcuZGVmYXVsdFZhbHVlIHx8ICcnO1xuICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB0ZXh0IGlmIHJlcHJlc2VudCBmaWVsZCBpcyBwcm92aWRlZFxuICAgICAgICBjb25zdCByZXByZXNlbnRGaWVsZCA9IGAke2ZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgbGV0IGN1cnJlbnRUZXh0ID0gZGF0YVtyZXByZXNlbnRGaWVsZF07XG4gICAgICAgIGlmICghY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VGaWVsZE5hbWUgPSBmaWVsZE5hbWUucmVwbGFjZSgvaWQkLywgJycpO1xuICAgICAgICAgICAgY29uc3QgYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZCA9IGAke2Jhc2VGaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IGRhdGFbYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIEhUTUwgaW4gcmVwcmVzZW50IHRleHQgdXNpbmcgU2VjdXJpdHlVdGlscyAoY29uc2lzdGVudCB3aXRoIGJ1aWxkRHJvcGRvd24pXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiB0eXBlb2YgY3VycmVudFRleHQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGZvciBhbGwgX3JlcHJlc2VudCBmaWVsZHMgYXMgdGhleSBjYW4gY29udGFpbiBIVE1MIGVudGl0aWVzIGFuZCBpY29uc1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICBjb25zdCAkdGV4dEVsZW1lbnQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKTtcbiAgICAgICAgICAgICR0ZXh0RWxlbWVudC5odG1sKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgICAgICR0ZXh0RWxlbWVudC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyb3Bkb3duIHdpdGggbmV3IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93biB3aXRoIEFQSSBvciBzdGF0aWMgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYERyb3Bkb3duIG5vdCBmb3VuZDogJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGFsbG93QWRkaXRpb25zOiBmYWxzZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQXV0b21hdGljIHN5bmNocm9uaXphdGlvbiB3aXRoIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9uIGhpZGRlbiBpbnB1dCBmb3IgZm9ybSB2YWxpZGF0aW9uL3Byb2Nlc3NpbmdcbiAgICAgICAgICAgICAgICAkaGlkZGVuSW5wdXQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTm90aWZ5IGZvcm0gb2YgY2hhbmdlc1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBvbkNoYW5nZSBoYW5kbGVyIC0gb25seSBmb3IgZmllbGQtc3BlY2lmaWMgbG9naWNcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLm9uQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5vbkNoYW5nZSh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIEFQSSBzZXR0aW5ncyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoY29uZmlnLmFwaVVybCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gaGFzIHNlYXJjaCBmdW5jdGlvbmFsaXR5IC0gZGV0ZWN0IGJ5IENTUyBjbGFzc2VzIHNpbmNlIHNlYXJjaCBpbnB1dCBpcyBhZGRlZCBieSBGb21hbnRpYyBVSSBsYXRlclxuICAgICAgICAgICAgY29uc3QgaGFzU2VhcmNoSW5wdXQgPSAkZHJvcGRvd24uaGFzQ2xhc3MoJ3NlYXJjaCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsZXQgYXBpVXJsID0gY29uZmlnLmFwaVVybDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBhZGQgcXVlcnkgcGFyYW1ldGVyIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duc1xuICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlVcmwuaW5kZXhPZignPycpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICc/cXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZXR0aW5ncy5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgICAgICB1cmw6IGFwaVVybCxcbiAgICAgICAgICAgICAgICBjYWNoZTogY29uZmlnLmNhY2hlICE9PSB1bmRlZmluZWQgPyBjb25maWcuY2FjaGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgIHRocm90dGxlOiBoYXNTZWFyY2hJbnB1dCA/IDUwMCA6IDAsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGVGaXJzdFJlcXVlc3Q6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICAgICAgbWluQ2hhcmFjdGVyczogaGFzU2VhcmNoSW5wdXQgPyAzIDogMCwgLy8gU2VhcmNoIGRyb3Bkb3ducyBuZWVkIDMgY2hhcmFjdGVycywgc2ltcGxlIGRyb3Bkb3ducyB3b3JrIG9uIGNsaWNrXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb25maWcub25SZXNwb25zZSBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gY29uZmlnLm9uUmVzcG9uc2UocmVzcG9uc2UpIFxuICAgICAgICAgICAgICAgICAgICAgICAgOiB0aGlzLmRlZmF1bHRSZXNwb25zZUhhbmRsZXIocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihg4p2MIEFQSSByZXF1ZXN0IGZhaWxlZCBmb3IgJHtmaWVsZE5hbWV9ICgke2NvbmZpZy5hcGlVcmx9KTpgLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBBUEkgcGFyYW1ldGVycyBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlQYXJhbXMgJiYgdHlwZW9mIGNvbmZpZy5hcGlQYXJhbXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhjb25maWcuYXBpUGFyYW1zKTtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ1BhcmFtcyA9IHBhcmFtcy50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1BhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXBpVXJsLmluZGV4T2YoJz8nKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBxdWVyeUluZGV4ID0gYXBpVXJsLmluZGV4T2YoJ3F1ZXJ5PXtxdWVyeX0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeUluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgPSBhcGlVcmwuc3Vic3RyaW5nKDAsIHF1ZXJ5SW5kZXgpICsgZXhpc3RpbmdQYXJhbXMgKyAnJnF1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyYnICsgZXhpc3RpbmdQYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgaWYgdGhlIGRyb3Bkb3duIGlzIHNlYXJjaGFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNTZWFyY2hJbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcyArICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzLnVybCA9IGFwaVVybDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gdGVtcGxhdGUgdG8gcHJvcGVybHkgcmVuZGVyIEhUTUwgY29udGVudFxuICAgICAgICAgICAgaWYgKCFjb25maWcudGVtcGxhdGVzKSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGVtcGxhdGVzID0ge1xuICAgICAgICAgICAgICAgICAgICBtZW51OiB0aGlzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnRlbXBsYXRlcyA9IGNvbmZpZy50ZW1wbGF0ZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIEZvciBzdGF0aWMgb3B0aW9ucywgcG9wdWxhdGUgbWVudSBpbW1lZGlhdGVseVxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZVN0YXRpY09wdGlvbnMoJGRyb3Bkb3duLCBjb25maWcuc3RhdGljT3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbmF0aXZlIEZvbWFudGljIFVJIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bihzZXR0aW5ncyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IEFQSSByZXNwb25zZSBoYW5kbGVyIGZvciBNaWtvUEJYIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IEZvbWFudGljIFVJIGNvbXBhdGlibGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBkZWZhdWx0UmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmICgocmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlLnN1Y2Nlc3MpICYmIHJlc3BvbnNlLmRhdGEgJiYgQXJyYXkuaXNBcnJheShyZXNwb25zZS5kYXRhKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlc3VsdHM6IHJlc3BvbnNlLmRhdGEubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByYXdUZXh0ID0gaXRlbS5yZXByZXNlbnQgfHwgaXRlbS5uYW1lIHx8IGl0ZW0udGV4dDtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgZGlzcGxheSB0ZXh0IHdoaWxlIHByZXNlcnZpbmcgc2FmZSBIVE1MIChpY29ucylcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMocmF3VGV4dClcbiAgICAgICAgICAgICAgICAgICAgICAgIDogcmF3VGV4dDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHNhZmVUZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogc2FmZVRleHRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLCBcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdIFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGRyb3Bkb3duIG1lbnUgdGVtcGxhdGUgZm9yIHByb3BlciBIVE1MIHJlbmRlcmluZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZpZWxkcyAtIEZpZWxkIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGZvciBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICB2YWx1ZXMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25bZmllbGRzLnZhbHVlXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBvcHRpb25bZmllbGRzLnRleHRdIHx8IG9wdGlvbltmaWVsZHMubmFtZV0gfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7RHluYW1pY0Ryb3Bkb3duQnVpbGRlci5lc2NhcGVIdG1sKHZhbHVlKX1cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSB0ZXh0O1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGRyb3Bkb3duIHdpdGggc3RhdGljIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGRyb3Bkb3duIC0gRHJvcGRvd24gZWxlbWVudFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMgLSBTdGF0aWMgb3B0aW9ucyBhcnJheVxuICAgICAqL1xuICAgIHBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgXG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBvcHRpb24udmFsdWU7XG4gICAgICAgICAgICBjb25zdCByYXdUZXh0ID0gb3B0aW9uLnRleHQgfHwgb3B0aW9uLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNhbml0aXplIHZhbHVlIGZvciBhdHRyaWJ1dGUgYW5kIHRleHQgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUocmF3VmFsdWUpXG4gICAgICAgICAgICAgICAgOiB0aGlzLmVzY2FwZUh0bWwocmF3VmFsdWUpO1xuICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgOiByYXdUZXh0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7c2FmZVRleHR9PC9kaXY+YCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgbXVsdGlwbGUgZHJvcGRvd25zIGZyb20gY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWdzIC0gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZFxuICAgICAqL1xuICAgIGJ1aWxkTXVsdGlwbGVEcm9wZG93bnMoZGF0YSwgY29uZmlncykge1xuICAgICAgICBPYmplY3Qua2V5cyhjb25maWdzKS5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWdzW2ZpZWxkTmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCB2YWx1ZSBpbiBleGlzdGluZyBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICovXG4gICAgc2V0VmFsdWUoZmllbGROYW1lLCB2YWx1ZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRWYWx1ZShmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICByZXR1cm4gJGRyb3Bkb3duLmxlbmd0aCA/ICRkcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgOiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICovXG4gICAgY2xlYXIoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGRpdi50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHJldHVybiBkaXYuaW5uZXJIVE1MO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRHluYW1pY0Ryb3Bkb3duQnVpbGRlcjtcbn0iXX0=