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
            apiUrl += '?' + existingParams + '&query={query}';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsInBsYWNlaG9sZGVyIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiYXBwZW5kIiwiaW5zZXJ0QWZ0ZXIiLCJ2YWwiLCJpbml0aWFsaXplRHJvcGRvd24iLCIkdGV4dEVsZW1lbnQiLCJyZW1vdmVDbGFzcyIsInNldHRpbmdzIiwiYWxsb3dBZGRpdGlvbnMiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInVuZGVmaW5lZCIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJmaWx0ZXJSZW1vdGVEYXRhIiwibWluQ2hhcmFjdGVycyIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImRlZmF1bHRSZXNwb25zZUhhbmRsZXIiLCJvbkZhaWx1cmUiLCJlcnJvciIsImFwaVBhcmFtcyIsInBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImV4aXN0aW5nUGFyYW1zIiwidG9TdHJpbmciLCJxdWVyeUluZGV4Iiwic3Vic3RyaW5nIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsInBvcHVsYXRlU3RhdGljT3B0aW9ucyIsImRyb3Bkb3duIiwicmVzdWx0Iiwic3VjY2VzcyIsIkFycmF5IiwiaXNBcnJheSIsInJlc3VsdHMiLCJtYXAiLCJpdGVtIiwicmF3VGV4dCIsInJlcHJlc2VudCIsInNhZmVUZXh0IiwiZmllbGRzIiwidmFsdWVzIiwiZm9yRWFjaCIsImVzY2FwZUh0bWwiLCJvcHRpb25zIiwicmF3VmFsdWUiLCJzYWZlVmFsdWUiLCJidWlsZE11bHRpcGxlRHJvcGRvd25zIiwiY29uZmlncyIsIk9iamVjdCIsImtleXMiLCJzZXRWYWx1ZSIsImdldFZhbHVlIiwiY2xlYXIiLCJkaXYiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJ0ZXh0Q29udGVudCIsImlubmVySFRNTCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsc0JBQXNCLEdBQUc7QUFFM0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBUjJCLHlCQVFiQyxTQVJhLEVBUUZDLElBUkUsRUFRaUI7QUFBQSxRQUFiQyxNQUFhLHVFQUFKLEVBQUk7QUFDeEMsUUFBTUMsWUFBWSxHQUFHQyxDQUFDLFlBQUtKLFNBQUwsRUFBdEI7O0FBRUEsUUFBSSxDQUFDRyxZQUFZLENBQUNFLE1BQWxCLEVBQTBCO0FBQ3RCQyxNQUFBQSxPQUFPLENBQUNDLElBQVIsNkNBQWtEUCxTQUFsRDtBQUNBO0FBQ0gsS0FOdUMsQ0FReEM7OztBQUNBLFFBQU1RLGlCQUFpQixHQUFHSixDQUFDLFlBQUtKLFNBQUwsZUFBM0I7O0FBQ0EsUUFBSVEsaUJBQWlCLENBQUNILE1BQXRCLEVBQThCO0FBQzFCLFdBQUtJLHNCQUFMLENBQTRCVCxTQUE1QixFQUF1Q0MsSUFBdkMsRUFBNkNDLE1BQTdDO0FBQ0E7QUFDSCxLQWJ1QyxDQWV4Qzs7O0FBQ0EsUUFBTVEsWUFBWSxHQUFHVCxJQUFJLENBQUNELFNBQUQsQ0FBSixJQUFtQkUsTUFBTSxDQUFDUyxZQUExQixJQUEwQyxFQUEvRDtBQUNBLFFBQU1DLGNBQWMsYUFBTVosU0FBTixlQUFwQixDQWpCd0MsQ0FtQnhDOztBQUNBLFFBQUlhLFdBQVcsR0FBR1osSUFBSSxDQUFDVyxjQUFELENBQXRCOztBQUVBLFFBQUksQ0FBQ0MsV0FBTCxFQUFrQjtBQUNkO0FBQ0EsVUFBTUMsYUFBYSxHQUFHZCxTQUFTLENBQUNlLE9BQVYsQ0FBa0IsS0FBbEIsRUFBeUIsRUFBekIsQ0FBdEI7QUFDQSxVQUFNQyx5QkFBeUIsYUFBTUYsYUFBTixlQUEvQjtBQUNBRCxNQUFBQSxXQUFXLEdBQUdaLElBQUksQ0FBQ2UseUJBQUQsQ0FBbEI7QUFDSCxLQTNCdUMsQ0E2QnhDOzs7QUFDQSxRQUFJTixZQUFZLElBQUksQ0FBQ0csV0FBakIsSUFBZ0NYLE1BQU0sQ0FBQ2UsYUFBM0MsRUFBMEQ7QUFDdEQsVUFBTUMsY0FBYyxHQUFHaEIsTUFBTSxDQUFDZSxhQUFQLENBQXFCRSxJQUFyQixDQUEwQixVQUFBQyxNQUFNO0FBQUEsZUFBSUEsTUFBTSxDQUFDQyxLQUFQLEtBQWlCWCxZQUFyQjtBQUFBLE9BQWhDLENBQXZCOztBQUNBLFVBQUlRLGNBQUosRUFBb0I7QUFDaEJMLFFBQUFBLFdBQVcsR0FBR0ssY0FBYyxDQUFDSSxJQUFmLElBQXVCSixjQUFjLENBQUNLLElBQXBEO0FBQ0g7QUFDSixLQW5DdUMsQ0FxQ3hDOzs7QUFDQSxRQUFJVixXQUFXLElBQUksT0FBT0EsV0FBUCxLQUF1QixRQUF0QyxJQUFrRCxPQUFPVyxhQUFQLEtBQXlCLFdBQS9FLEVBQTRGO0FBQ3hGO0FBQ0FYLE1BQUFBLFdBQVcsR0FBR1csYUFBYSxDQUFDQyw2QkFBZCxDQUE0Q1osV0FBNUMsQ0FBZDtBQUNILEtBekN1QyxDQTJDeEM7OztBQUNBQSxJQUFBQSxXQUFXLEdBQUdBLFdBQVcsSUFBSVgsTUFBTSxDQUFDd0IsV0FBdEIsSUFBcUMsY0FBbkQsQ0E1Q3dDLENBOEN4Qzs7QUFDQSxRQUFNQyxXQUFXLEdBQUcsQ0FBQyxJQUFELEVBQU8sV0FBUCxFQUFvQixVQUFwQixDQUFwQjtBQUNBLFFBQU1DLGlCQUFpQixHQUFHMUIsTUFBTSxDQUFDMEIsaUJBQVAsSUFBNEIsRUFBdEQ7QUFDQSxRQUFNQyxVQUFVLEdBQUcsVUFBSUYsV0FBSixxQkFBb0JDLGlCQUFwQixHQUF1Q0UsSUFBdkMsQ0FBNEMsR0FBNUMsQ0FBbkIsQ0FqRHdDLENBbUR4QztBQUNBOztBQUNBLFFBQU1DLFNBQVMsR0FBR3JCLFlBQVksR0FBRyxNQUFILEdBQVksY0FBMUMsQ0FyRHdDLENBdUR4Qzs7QUFDQSxRQUFNc0IsYUFBYSxHQUFHLE9BQU9SLGFBQVAsS0FBeUIsV0FBekIsR0FDaEJBLGFBQWEsQ0FBQ1MsaUJBQWQsQ0FBZ0NqQyxTQUFoQyxDQURnQixHQUVoQkEsU0FGTixDQXhEd0MsQ0E0RHhDOztBQUNBLFFBQU1rQyxTQUFTLEdBQUc5QixDQUFDLENBQUMsT0FBRCxDQUFELENBQ2IrQixRQURhLENBQ0pOLFVBREksRUFFYk8sSUFGYSxDQUVSLElBRlEsWUFFQ0osYUFGRCxlQUFsQjtBQUlBLFFBQU1LLFFBQVEsR0FBR2pDLENBQUMsQ0FBQyxPQUFELENBQUQsQ0FDWitCLFFBRFksQ0FDSEosU0FERyxFQUVaTyxJQUZZLENBRVB6QixXQUZPLENBQWpCLENBakV3QyxDQW1FaEI7O0FBRXhCLFFBQU0wQixhQUFhLEdBQUduQyxDQUFDLENBQUMsS0FBRCxDQUFELENBQVMrQixRQUFULENBQWtCLGVBQWxCLENBQXRCO0FBRUEsUUFBTUssS0FBSyxHQUFHcEMsQ0FBQyxDQUFDLE9BQUQsQ0FBRCxDQUNUK0IsUUFEUyxDQUNBLE1BREEsRUFFVEcsSUFGUyxDQUVKLHVFQUZJLENBQWQsQ0F2RXdDLENBMkV4Qzs7QUFDQUosSUFBQUEsU0FBUyxDQUFDTyxNQUFWLENBQWlCSixRQUFqQixFQUEyQkUsYUFBM0IsRUFBMENDLEtBQTFDLEVBNUV3QyxDQThFeEM7O0FBQ0FOLElBQUFBLFNBQVMsQ0FBQ1EsV0FBVixDQUFzQnZDLFlBQXRCLEVBL0V3QyxDQWlGeEM7O0FBQ0FBLElBQUFBLFlBQVksQ0FBQ3dDLEdBQWIsQ0FBaUJqQyxZQUFqQixFQWxGd0MsQ0FvRnhDOztBQUNBLFNBQUtrQyxrQkFBTCxDQUF3QjVDLFNBQXhCLEVBQW1DRSxNQUFuQztBQUNILEdBOUYwQjs7QUFnRzNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJTyxFQUFBQSxzQkF0RzJCLGtDQXNHSlQsU0F0R0ksRUFzR09DLElBdEdQLEVBc0dhQyxNQXRHYixFQXNHcUI7QUFDNUMsUUFBTWdDLFNBQVMsR0FBRzlCLENBQUMsWUFBS0osU0FBTCxlQUFuQjtBQUNBLFFBQU1HLFlBQVksR0FBR0MsQ0FBQyxZQUFLSixTQUFMLEVBQXRCOztBQUVBLFFBQUksQ0FBQ2tDLFNBQVMsQ0FBQzdCLE1BQWYsRUFBdUI7QUFDbkJDLE1BQUFBLE9BQU8sQ0FBQ0MsSUFBUix3REFBNkRQLFNBQTdEO0FBQ0E7QUFDSCxLQVAyQyxDQVM1Qzs7O0FBQ0EsUUFBTVUsWUFBWSxHQUFHVCxJQUFJLENBQUNELFNBQUQsQ0FBSixJQUFtQkUsTUFBTSxDQUFDUyxZQUExQixJQUEwQyxFQUEvRDs7QUFDQSxRQUFJRCxZQUFKLEVBQWtCO0FBQ2RQLE1BQUFBLFlBQVksQ0FBQ3dDLEdBQWIsQ0FBaUJqQyxZQUFqQjtBQUNILEtBYjJDLENBZTVDOzs7QUFDQSxRQUFNRSxjQUFjLGFBQU1aLFNBQU4sZUFBcEI7QUFDQSxRQUFJYSxXQUFXLEdBQUdaLElBQUksQ0FBQ1csY0FBRCxDQUF0Qjs7QUFDQSxRQUFJLENBQUNDLFdBQUwsRUFBa0I7QUFDZCxVQUFNQyxhQUFhLEdBQUdkLFNBQVMsQ0FBQ2UsT0FBVixDQUFrQixLQUFsQixFQUF5QixFQUF6QixDQUF0QjtBQUNBLFVBQU1DLHlCQUF5QixhQUFNRixhQUFOLGVBQS9CO0FBQ0FELE1BQUFBLFdBQVcsR0FBR1osSUFBSSxDQUFDZSx5QkFBRCxDQUFsQjtBQUNILEtBdEIyQyxDQXdCNUM7OztBQUNBLFFBQUlILFdBQVcsSUFBSSxPQUFPQSxXQUFQLEtBQXVCLFFBQXRDLElBQWtELE9BQU9XLGFBQVAsS0FBeUIsV0FBL0UsRUFBNEY7QUFDeEY7QUFDQVgsTUFBQUEsV0FBVyxHQUFHVyxhQUFhLENBQUNDLDZCQUFkLENBQTRDWixXQUE1QyxDQUFkO0FBQ0g7O0FBRUQsUUFBSUEsV0FBSixFQUFpQjtBQUNiLFVBQU1nQyxZQUFZLEdBQUdYLFNBQVMsQ0FBQ2YsSUFBVixDQUFlLE9BQWYsQ0FBckI7QUFDQTBCLE1BQUFBLFlBQVksQ0FBQ1AsSUFBYixDQUFrQnpCLFdBQWxCO0FBQ0FnQyxNQUFBQSxZQUFZLENBQUNDLFdBQWIsQ0FBeUIsU0FBekI7QUFDSCxLQWxDMkMsQ0FvQzVDOzs7QUFDQSxTQUFLRixrQkFBTCxDQUF3QjVDLFNBQXhCLEVBQW1DRSxNQUFuQztBQUNILEdBNUkwQjs7QUE4STNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTBDLEVBQUFBLGtCQW5KMkIsOEJBbUpSNUMsU0FuSlEsRUFtSkdFLE1BbkpILEVBbUpXO0FBQUE7O0FBQ2xDLFFBQU1nQyxTQUFTLEdBQUc5QixDQUFDLFlBQUtKLFNBQUwsZUFBbkI7QUFDQSxRQUFNRyxZQUFZLEdBQUdDLENBQUMsWUFBS0osU0FBTCxFQUF0Qjs7QUFFQSxRQUFJLENBQUNrQyxTQUFTLENBQUM3QixNQUFmLEVBQXVCO0FBQ25CQyxNQUFBQSxPQUFPLENBQUNDLElBQVIsK0JBQW9DUCxTQUFwQztBQUNBO0FBQ0g7O0FBR0QsUUFBTStDLFFBQVEsR0FBRztBQUNiQyxNQUFBQSxjQUFjLEVBQUUsS0FESDtBQUViQyxNQUFBQSxjQUFjLEVBQUUsSUFGSDtBQUdiQyxNQUFBQSxjQUFjLEVBQUUsS0FISDtBQUtiQyxNQUFBQSxRQUFRLEVBQUUsa0JBQUM5QixLQUFELEVBQVFDLElBQVIsRUFBYzhCLE9BQWQsRUFBMEI7QUFDaEM7QUFDQWpELFFBQUFBLFlBQVksQ0FBQ3dDLEdBQWIsQ0FBaUJ0QixLQUFqQixFQUZnQyxDQUloQzs7QUFDQWxCLFFBQUFBLFlBQVksQ0FBQ2tELE9BQWIsQ0FBcUIsUUFBckIsRUFMZ0MsQ0FPaEM7O0FBQ0EsWUFBSSxPQUFPQyxJQUFQLEtBQWdCLFdBQWhCLElBQStCQSxJQUFJLENBQUNDLFdBQXhDLEVBQXFEO0FBQ2pERCxVQUFBQSxJQUFJLENBQUNDLFdBQUw7QUFDSCxTQVYrQixDQVloQzs7O0FBQ0EsWUFBSXJELE1BQU0sQ0FBQ2lELFFBQVgsRUFBcUI7QUFDakJqRCxVQUFBQSxNQUFNLENBQUNpRCxRQUFQLENBQWdCOUIsS0FBaEIsRUFBdUJDLElBQXZCLEVBQTZCOEIsT0FBN0I7QUFDSDtBQUNKO0FBckJZLEtBQWpCLENBVmtDLENBa0NsQzs7QUFDQSxRQUFJbEQsTUFBTSxDQUFDc0QsTUFBWCxFQUFtQjtBQUNmO0FBQ0EsVUFBTUMsY0FBYyxHQUFHdkIsU0FBUyxDQUFDd0IsUUFBVixDQUFtQixRQUFuQixDQUF2QjtBQUVBLFVBQUlGLE1BQU0sR0FBR3RELE1BQU0sQ0FBQ3NELE1BQXBCLENBSmUsQ0FNZjs7QUFDQSxVQUFJQyxjQUFKLEVBQW9CO0FBQ2hCLFlBQUl2RCxNQUFNLENBQUNzRCxNQUFQLENBQWNHLE9BQWQsQ0FBc0IsR0FBdEIsSUFBNkIsQ0FBQyxDQUFsQyxFQUFxQztBQUNqQ0gsVUFBQUEsTUFBTSxJQUFJLGdCQUFWO0FBQ0gsU0FGRCxNQUVPO0FBQ0hBLFVBQUFBLE1BQU0sSUFBSSxnQkFBVjtBQUNIO0FBQ0o7O0FBRURULE1BQUFBLFFBQVEsQ0FBQ2EsV0FBVCxHQUF1QjtBQUNuQkMsUUFBQUEsR0FBRyxFQUFFTCxNQURjO0FBRW5CTSxRQUFBQSxLQUFLLEVBQUU1RCxNQUFNLENBQUM0RCxLQUFQLEtBQWlCQyxTQUFqQixHQUE2QjdELE1BQU0sQ0FBQzRELEtBQXBDLEdBQTRDLElBRmhDO0FBR25CRSxRQUFBQSxRQUFRLEVBQUVQLGNBQWMsR0FBRyxHQUFILEdBQVMsQ0FIZDtBQUluQlEsUUFBQUEsb0JBQW9CLEVBQUUsS0FKSDtBQUtuQkMsUUFBQUEsZ0JBQWdCLEVBQUUsSUFMQztBQU1uQkMsUUFBQUEsYUFBYSxFQUFFVixjQUFjLEdBQUcsQ0FBSCxHQUFPLENBTmpCO0FBTW9CO0FBRXZDVyxRQUFBQSxVQUFVLEVBQUUsb0JBQUNDLFFBQUQsRUFBYztBQUN0QixpQkFBT25FLE1BQU0sQ0FBQ2tFLFVBQVAsR0FDRGxFLE1BQU0sQ0FBQ2tFLFVBQVAsQ0FBa0JDLFFBQWxCLENBREMsR0FFRCxLQUFJLENBQUNDLHNCQUFMLENBQTRCRCxRQUE1QixDQUZOO0FBR0gsU0Faa0I7QUFjbkJFLFFBQUFBLFNBQVMsRUFBRSxtQkFBQ0YsUUFBRCxFQUFjO0FBQ3JCL0QsVUFBQUEsT0FBTyxDQUFDa0UsS0FBUix5Q0FBMEN4RSxTQUExQyxlQUF3REUsTUFBTSxDQUFDc0QsTUFBL0QsU0FBMkVhLFFBQTNFO0FBQ0g7QUFoQmtCLE9BQXZCLENBZmUsQ0FtQ2Y7O0FBQ0EsVUFBSW5FLE1BQU0sQ0FBQ3VFLFNBQVAsSUFBb0IsUUFBT3ZFLE1BQU0sQ0FBQ3VFLFNBQWQsTUFBNEIsUUFBcEQsRUFBOEQ7QUFDMUQsWUFBTUMsTUFBTSxHQUFHLElBQUlDLGVBQUosQ0FBb0J6RSxNQUFNLENBQUN1RSxTQUEzQixDQUFmO0FBQ0EsWUFBTUcsY0FBYyxHQUFHRixNQUFNLENBQUNHLFFBQVAsRUFBdkI7O0FBRUEsWUFBSUQsY0FBSixFQUFvQjtBQUNoQixjQUFJcEIsTUFBTSxDQUFDRyxPQUFQLENBQWUsR0FBZixJQUFzQixDQUFDLENBQTNCLEVBQThCO0FBQzFCLGdCQUFNbUIsVUFBVSxHQUFHdEIsTUFBTSxDQUFDRyxPQUFQLENBQWUsZUFBZixDQUFuQjs7QUFDQSxnQkFBSW1CLFVBQVUsR0FBRyxDQUFDLENBQWxCLEVBQXFCO0FBQ2pCdEIsY0FBQUEsTUFBTSxHQUFHQSxNQUFNLENBQUN1QixTQUFQLENBQWlCLENBQWpCLEVBQW9CRCxVQUFwQixJQUFrQ0YsY0FBbEMsR0FBbUQsZ0JBQTVEO0FBQ0gsYUFGRCxNQUVPO0FBQ0hwQixjQUFBQSxNQUFNLElBQUksTUFBTW9CLGNBQWhCO0FBQ0g7QUFDSixXQVBELE1BT087QUFDSHBCLFlBQUFBLE1BQU0sSUFBSSxNQUFNb0IsY0FBTixHQUF1QixnQkFBakM7QUFDSDs7QUFFRDdCLFVBQUFBLFFBQVEsQ0FBQ2EsV0FBVCxDQUFxQkMsR0FBckIsR0FBMkJMLE1BQTNCO0FBQ0g7QUFDSixPQXREYyxDQXdEZjs7O0FBQ0EsVUFBSSxDQUFDdEQsTUFBTSxDQUFDOEUsU0FBWixFQUF1QjtBQUNuQmpDLFFBQUFBLFFBQVEsQ0FBQ2lDLFNBQVQsR0FBcUI7QUFDakJDLFVBQUFBLElBQUksRUFBRSxLQUFLQztBQURNLFNBQXJCO0FBR0gsT0FKRCxNQUlPO0FBQ0huQyxRQUFBQSxRQUFRLENBQUNpQyxTQUFULEdBQXFCOUUsTUFBTSxDQUFDOEUsU0FBNUI7QUFDSDtBQUNKLEtBaEVELE1BZ0VPLElBQUk5RSxNQUFNLENBQUNlLGFBQVgsRUFBMEI7QUFDN0I7QUFDQSxXQUFLa0UscUJBQUwsQ0FBMkJqRCxTQUEzQixFQUFzQ2hDLE1BQU0sQ0FBQ2UsYUFBN0M7QUFDSCxLQXRHaUMsQ0F3R2xDOzs7QUFDQWlCLElBQUFBLFNBQVMsQ0FBQ2tELFFBQVYsQ0FBbUJyQyxRQUFuQjtBQUNILEdBN1AwQjs7QUErUDNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXVCLEVBQUFBLHNCQXBRMkIsa0NBb1FKRCxRQXBRSSxFQW9RTTtBQUM3QixRQUFJLENBQUNBLFFBQVEsQ0FBQ2dCLE1BQVQsSUFBbUJoQixRQUFRLENBQUNpQixPQUE3QixLQUF5Q2pCLFFBQVEsQ0FBQ3BFLElBQWxELElBQTBEc0YsS0FBSyxDQUFDQyxPQUFOLENBQWNuQixRQUFRLENBQUNwRSxJQUF2QixDQUE5RCxFQUE0RjtBQUN4RixhQUFPO0FBQ0hxRixRQUFBQSxPQUFPLEVBQUUsSUFETjtBQUVIRyxRQUFBQSxPQUFPLEVBQUVwQixRQUFRLENBQUNwRSxJQUFULENBQWN5RixHQUFkLENBQWtCLFVBQUFDLElBQUksRUFBSTtBQUMvQixjQUFNQyxPQUFPLEdBQUdELElBQUksQ0FBQ0UsU0FBTCxJQUFrQkYsSUFBSSxDQUFDcEUsSUFBdkIsSUFBK0JvRSxJQUFJLENBQUNyRSxJQUFwRCxDQUQrQixDQUUvQjs7QUFDQSxjQUFNd0UsUUFBUSxHQUFHLE9BQU90RSxhQUFQLEtBQXlCLFdBQXpCLEdBQ1hBLGFBQWEsQ0FBQ0MsNkJBQWQsQ0FBNENtRSxPQUE1QyxDQURXLEdBRVhBLE9BRk47QUFJQSxpQkFBTztBQUNIdkUsWUFBQUEsS0FBSyxFQUFFc0UsSUFBSSxDQUFDdEUsS0FEVDtBQUVIQyxZQUFBQSxJQUFJLEVBQUV3RSxRQUZIO0FBR0h2RSxZQUFBQSxJQUFJLEVBQUV1RTtBQUhILFdBQVA7QUFLSCxTQVpRO0FBRk4sT0FBUDtBQWdCSDs7QUFDRCxXQUFPO0FBQ0hSLE1BQUFBLE9BQU8sRUFBRSxLQUROO0FBRUhHLE1BQUFBLE9BQU8sRUFBRTtBQUZOLEtBQVA7QUFJSCxHQTNSMEI7O0FBNlIzQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVAsRUFBQUEsa0JBblMyQiw4QkFtU1JiLFFBblNRLEVBbVNFMEIsTUFuU0YsRUFtU1U7QUFDakMsUUFBTUMsTUFBTSxHQUFHM0IsUUFBUSxDQUFDMEIsTUFBTSxDQUFDQyxNQUFSLENBQVIsSUFBMkIsRUFBMUM7QUFDQSxRQUFJMUQsSUFBSSxHQUFHLEVBQVg7QUFFQTBELElBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxDQUFlLFVBQUE3RSxNQUFNLEVBQUk7QUFDckIsVUFBTUMsS0FBSyxHQUFHRCxNQUFNLENBQUMyRSxNQUFNLENBQUMxRSxLQUFSLENBQU4sSUFBd0IsRUFBdEM7QUFDQSxVQUFNQyxJQUFJLEdBQUdGLE1BQU0sQ0FBQzJFLE1BQU0sQ0FBQ3pFLElBQVIsQ0FBTixJQUF1QkYsTUFBTSxDQUFDMkUsTUFBTSxDQUFDeEUsSUFBUixDQUE3QixJQUE4QyxFQUEzRDtBQUVBZSxNQUFBQSxJQUFJLCtDQUFxQ3hDLHNCQUFzQixDQUFDb0csVUFBdkIsQ0FBa0M3RSxLQUFsQyxDQUFyQyxRQUFKO0FBQ0FpQixNQUFBQSxJQUFJLElBQUloQixJQUFSO0FBQ0FnQixNQUFBQSxJQUFJLElBQUksUUFBUjtBQUNILEtBUEQ7QUFTQSxXQUFPQSxJQUFQO0FBQ0gsR0FqVDBCOztBQW1UM0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJNkMsRUFBQUEscUJBeFQyQixpQ0F3VExqRCxTQXhUSyxFQXdUTWlFLE9BeFROLEVBd1RlO0FBQUE7O0FBQ3RDLFFBQU0zRCxLQUFLLEdBQUdOLFNBQVMsQ0FBQ2YsSUFBVixDQUFlLE9BQWYsQ0FBZDtBQUVBZ0YsSUFBQUEsT0FBTyxDQUFDRixPQUFSLENBQWdCLFVBQUE3RSxNQUFNLEVBQUk7QUFDdEIsVUFBTWdGLFFBQVEsR0FBR2hGLE1BQU0sQ0FBQ0MsS0FBeEI7QUFDQSxVQUFNdUUsT0FBTyxHQUFHeEUsTUFBTSxDQUFDRSxJQUFQLElBQWVGLE1BQU0sQ0FBQ0csSUFBdEMsQ0FGc0IsQ0FJdEI7O0FBQ0EsVUFBTThFLFNBQVMsR0FBRyxPQUFPN0UsYUFBUCxLQUF5QixXQUF6QixHQUNaQSxhQUFhLENBQUNTLGlCQUFkLENBQWdDbUUsUUFBaEMsQ0FEWSxHQUVaLE1BQUksQ0FBQ0YsVUFBTCxDQUFnQkUsUUFBaEIsQ0FGTjtBQUdBLFVBQU1OLFFBQVEsR0FBRyxPQUFPdEUsYUFBUCxLQUF5QixXQUF6QixHQUNYQSxhQUFhLENBQUNDLDZCQUFkLENBQTRDbUUsT0FBNUMsQ0FEVyxHQUVYQSxPQUZOO0FBSUFwRCxNQUFBQSxLQUFLLENBQUNDLE1BQU4sNENBQThDNEQsU0FBOUMsZ0JBQTREUCxRQUE1RDtBQUNILEtBYkQ7QUFjSCxHQXpVMEI7O0FBMlUzQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lRLEVBQUFBLHNCQWhWMkIsa0NBZ1ZKckcsSUFoVkksRUFnVkVzRyxPQWhWRixFQWdWVztBQUFBOztBQUNsQ0MsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlGLE9BQVosRUFBcUJOLE9BQXJCLENBQTZCLFVBQUFqRyxTQUFTLEVBQUk7QUFDdEMsTUFBQSxNQUFJLENBQUNELGFBQUwsQ0FBbUJDLFNBQW5CLEVBQThCQyxJQUE5QixFQUFvQ3NHLE9BQU8sQ0FBQ3ZHLFNBQUQsQ0FBM0M7QUFDSCxLQUZEO0FBR0gsR0FwVjBCOztBQXNWM0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJMEcsRUFBQUEsUUEzVjJCLG9CQTJWbEIxRyxTQTNWa0IsRUEyVlBxQixLQTNWTyxFQTJWQTtBQUN2QixRQUFNYSxTQUFTLEdBQUc5QixDQUFDLFlBQUtKLFNBQUwsZUFBbkI7O0FBQ0EsUUFBSWtDLFNBQVMsQ0FBQzdCLE1BQWQsRUFBc0I7QUFDbEI2QixNQUFBQSxTQUFTLENBQUNrRCxRQUFWLENBQW1CLGNBQW5CLEVBQW1DL0QsS0FBbkM7QUFDSDtBQUNKLEdBaFcwQjs7QUFrVzNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXNGLEVBQUFBLFFBdlcyQixvQkF1V2xCM0csU0F2V2tCLEVBdVdQO0FBQ2hCLFFBQU1rQyxTQUFTLEdBQUc5QixDQUFDLFlBQUtKLFNBQUwsZUFBbkI7QUFDQSxXQUFPa0MsU0FBUyxDQUFDN0IsTUFBVixHQUFtQjZCLFNBQVMsQ0FBQ2tELFFBQVYsQ0FBbUIsV0FBbkIsQ0FBbkIsR0FBcUQsRUFBNUQ7QUFDSCxHQTFXMEI7O0FBNFczQjtBQUNKO0FBQ0E7QUFDQTtBQUNJd0IsRUFBQUEsS0FoWDJCLGlCQWdYckI1RyxTQWhYcUIsRUFnWFY7QUFDYixRQUFNa0MsU0FBUyxHQUFHOUIsQ0FBQyxZQUFLSixTQUFMLGVBQW5COztBQUNBLFFBQUlrQyxTQUFTLENBQUM3QixNQUFkLEVBQXNCO0FBQ2xCNkIsTUFBQUEsU0FBUyxDQUFDa0QsUUFBVixDQUFtQixPQUFuQjtBQUNIO0FBQ0osR0FyWDBCOztBQXVYM0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJYyxFQUFBQSxVQTVYMkIsc0JBNFhoQjVFLElBNVhnQixFQTRYVjtBQUNiLFFBQU11RixHQUFHLEdBQUdDLFFBQVEsQ0FBQ0MsYUFBVCxDQUF1QixLQUF2QixDQUFaO0FBQ0FGLElBQUFBLEdBQUcsQ0FBQ0csV0FBSixHQUFrQjFGLElBQWxCO0FBQ0EsV0FBT3VGLEdBQUcsQ0FBQ0ksU0FBWDtBQUNIO0FBaFkwQixDQUEvQixDLENBbVlBOztBQUNBLElBQUksT0FBT0MsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCckgsc0JBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgRm9ybSwgZ2xvYmFsVHJhbnNsYXRlLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAtIFVuaXZlcnNhbCBkcm9wZG93biBidWlsZGVyIGZvciBNaWtvUEJYIFY1LjBcbiAqIFxuICogQnVpbGRzIGRyb3Bkb3duIEhUTUwgZHluYW1pY2FsbHkgYmFzZWQgb24gUkVTVCBBUEkgZGF0YS5cbiAqIFNlcGFyYXRlcyBjb25jZXJuczogUEhQIGZvcm1zIG9ubHkgcHJvdmlkZSBoaWRkZW4gaW5wdXRzLCBcbiAqIEphdmFTY3JpcHQgYnVpbGRzIFVJIGFuZCBwb3B1bGF0ZXMgd2l0aCBkYXRhLlxuICogXG4gKiBVc2FnZTpcbiAqIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICogICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0Rm9yU2VsZWN0JyxcbiAqICAgICBwbGFjZWhvbGRlcjogJ1NlbGVjdCBuZXR3b3JrIGZpbHRlcidcbiAqIH0pO1xuICovXG5jb25zdCBEeW5hbWljRHJvcGRvd25CdWlsZGVyID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGRyb3Bkb3duIGZvciBhIGZpZWxkIGJhc2VkIG9uIFJFU1QgQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSAoZS5nLiwgJ25ldHdvcmtmaWx0ZXJpZCcpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gRHJvcGRvd24gY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcgPSB7fSkge1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgSGlkZGVuIGlucHV0IG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGROYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBhbHJlYWR5IGV4aXN0cyAtIHVwZGF0ZSBpdCBpbnN0ZWFkIG9mIGNyZWF0aW5nIGR1cGxpY2F0ZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVFeGlzdGluZ0Ryb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWVzIGZyb20gZGF0YVxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBkYXRhW2ZpZWxkTmFtZV0gfHwgY29uZmlnLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgY29uc3QgcmVwcmVzZW50RmllbGQgPSBgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgIFxuICAgICAgICAvLyBUcnkgbXVsdGlwbGUgcG9zc2libGUgcmVwcmVzZW50IGZpZWxkIG5hbWVzIGZvciBmbGV4aWJpbGl0eVxuICAgICAgICBsZXQgY3VycmVudFRleHQgPSBkYXRhW3JlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIC8vIFRyeSB3aXRob3V0ICdpZCcgc3VmZml4IChlLmcuLCBuZXR3b3JrZmlsdGVyX3JlcHJlc2VudCBpbnN0ZWFkIG9mIG5ldHdvcmtmaWx0ZXJpZF9yZXByZXNlbnQpXG4gICAgICAgICAgICBjb25zdCBiYXNlRmllbGROYW1lID0gZmllbGROYW1lLnJlcGxhY2UoL2lkJC8sICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQgPSBgJHtiYXNlRmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBkYXRhW2FsdGVybmF0aXZlUmVwcmVzZW50RmllbGRdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgdmFsdWUgYnV0IG5vIHJlcHJlc2VudCB0ZXh0LCB0cnkgdG8gZmluZCBpdCBpbiBzdGF0aWMgb3B0aW9ucyBmaXJzdFxuICAgICAgICBpZiAoY3VycmVudFZhbHVlICYmICFjdXJyZW50VGV4dCAmJiBjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2hpbmdPcHRpb24gPSBjb25maWcuc3RhdGljT3B0aW9ucy5maW5kKG9wdGlvbiA9PiBvcHRpb24udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICBpZiAobWF0Y2hpbmdPcHRpb24pIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGV4dCA9IG1hdGNoaW5nT3B0aW9uLnRleHQgfHwgbWF0Y2hpbmdPcHRpb24ubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgSFRNTCBpbiByZXByZXNlbnQgdGV4dCB1c2luZyBTZWN1cml0eVV0aWxzXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiB0eXBlb2YgY3VycmVudFRleHQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGZvciBhbGwgX3JlcHJlc2VudCBmaWVsZHMgYXMgdGhleSBjYW4gY29udGFpbiBIVE1MIGVudGl0aWVzIGFuZCBpY29uc1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gcGxhY2Vob2xkZXIgb3IgZGVmYXVsdFxuICAgICAgICBjdXJyZW50VGV4dCA9IGN1cnJlbnRUZXh0IHx8IGNvbmZpZy5wbGFjZWhvbGRlciB8fCAnU2VsZWN0IHZhbHVlJztcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIENTUyBjbGFzc2VzIHdpdGggc2FuaXRpemF0aW9uXG4gICAgICAgIGNvbnN0IGJhc2VDbGFzc2VzID0gWyd1aScsICdzZWxlY3Rpb24nLCAnZHJvcGRvd24nXTtcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbENsYXNzZXMgPSBjb25maWcuYWRkaXRpb25hbENsYXNzZXMgfHwgW107XG4gICAgICAgIGNvbnN0IGFsbENsYXNzZXMgPSBbLi4uYmFzZUNsYXNzZXMsIC4uLmFkZGl0aW9uYWxDbGFzc2VzXS5qb2luKCcgJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biBIVE1MIC0gRklYRUQ6IENyZWF0ZSBlbGVtZW50cyB3aXRoIGpRdWVyeSB0byBwcm9wZXJseSBoYW5kbGUgSFRNTCBjb250ZW50XG4gICAgICAgIC8vIE9ubHkgc2hvdyBjdXJyZW50IHZhbHVlIGluIHRleHQgZGlzcGxheSwgbGV0IEFQSSBwb3B1bGF0ZSBtZW51IG9uIGNsaWNrXG4gICAgICAgIGNvbnN0IHRleHRDbGFzcyA9IGN1cnJlbnRWYWx1ZSA/ICd0ZXh0JyA6ICd0ZXh0IGRlZmF1bHQnO1xuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgZmllbGROYW1lIGZvciB1c2UgaW4gSUQgYXR0cmlidXRlXG4gICAgICAgIGNvbnN0IHNhZmVGaWVsZE5hbWUgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUoZmllbGROYW1lKVxuICAgICAgICAgICAgOiBmaWVsZE5hbWU7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gc3RydWN0dXJlIHVzaW5nIGpRdWVyeSBmb3IgcHJvcGVyIEhUTUwgaGFuZGxpbmdcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnPGRpdj4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKGFsbENsYXNzZXMpXG4gICAgICAgICAgICAuYXR0cignaWQnLCBgJHtzYWZlRmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJHRleHREaXYgPSAkKCc8ZGl2PicpXG4gICAgICAgICAgICAuYWRkQ2xhc3ModGV4dENsYXNzKVxuICAgICAgICAgICAgLmh0bWwoY3VycmVudFRleHQpOyAvLyBjdXJyZW50VGV4dCBhbHJlYWR5IHNhbml0aXplZCBhYm92ZVxuICAgICAgICBcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duSWNvbiA9ICQoJzxpPicpLmFkZENsYXNzKCdkcm9wZG93biBpY29uJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkbWVudSA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnbWVudScpXG4gICAgICAgICAgICAuaHRtbCgnPCEtLSBNZW51IGludGVudGlvbmFsbHkgZW1wdHkgLSB3aWxsIGJlIHBvcHVsYXRlZCBieSBBUEkgb24gY2xpY2sgLS0+Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBc3NlbWJsZSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKCR0ZXh0RGl2LCAkZHJvcGRvd25JY29uLCAkbWVudSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnNlcnQgZHJvcGRvd24gYWZ0ZXIgaGlkZGVuIGlucHV0XG4gICAgICAgICRkcm9wZG93bi5pbnNlcnRBZnRlcigkaGlkZGVuSW5wdXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHZhbHVlIGluIGhpZGRlbiBpbnB1dFxuICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBleGlzdGluZyBkcm9wZG93biB3aXRoIG5ldyBjb25maWd1cmF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZm9yIHRoZSBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBOZXcgY29uZmlndXJhdGlvbiB0byBhcHBseVxuICAgICAqL1xuICAgIHVwZGF0ZUV4aXN0aW5nRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQ2Fubm90IHVwZGF0ZTogZHJvcGRvd24gbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgdmFsdWUgaWYgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gZGF0YVtmaWVsZE5hbWVdIHx8IGNvbmZpZy5kZWZhdWx0VmFsdWUgfHwgJyc7XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHRleHQgaWYgcmVwcmVzZW50IGZpZWxkIGlzIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IHJlcHJlc2VudEZpZWxkID0gYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICBsZXQgY3VycmVudFRleHQgPSBkYXRhW3JlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgaWYgKCFjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgY29uc3QgYmFzZUZpZWxkTmFtZSA9IGZpZWxkTmFtZS5yZXBsYWNlKC9pZCQvLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkID0gYCR7YmFzZUZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gZGF0YVthbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgSFRNTCBpbiByZXByZXNlbnQgdGV4dCB1c2luZyBTZWN1cml0eVV0aWxzIChjb25zaXN0ZW50IHdpdGggYnVpbGREcm9wZG93bilcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0ICYmIHR5cGVvZiBjdXJyZW50VGV4dCA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMgZm9yIGFsbCBfcmVwcmVzZW50IGZpZWxkcyBhcyB0aGV5IGNhbiBjb250YWluIEhUTUwgZW50aXRpZXMgYW5kIGljb25zXG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoY3VycmVudFRleHQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgJHRleHRFbGVtZW50Lmh0bWwoY3VycmVudFRleHQpO1xuICAgICAgICAgICAgJHRleHRFbGVtZW50LnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBuZXcgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyb3Bkb3duIHdpdGggQVBJIG9yIHN0YXRpYyBkYXRhXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgRHJvcGRvd24gbm90IGZvdW5kOiAke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0ge1xuICAgICAgICAgICAgYWxsb3dBZGRpdGlvbnM6IGZhbHNlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQsICRjaG9pY2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBBdXRvbWF0aWMgc3luY2hyb25pemF0aW9uIHdpdGggaGlkZGVuIGlucHV0XG4gICAgICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgb24gaGlkZGVuIGlucHV0IGZvciBmb3JtIHZhbGlkYXRpb24vcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBOb3RpZnkgZm9ybSBvZiBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3VzdG9tIG9uQ2hhbmdlIGhhbmRsZXIgLSBvbmx5IGZvciBmaWVsZC1zcGVjaWZpYyBsb2dpY1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcub25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQVBJIHNldHRpbmdzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChjb25maWcuYXBpVXJsKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBoYXMgc2VhcmNoIGZ1bmN0aW9uYWxpdHkgLSBkZXRlY3QgYnkgQ1NTIGNsYXNzZXMgc2luY2Ugc2VhcmNoIGlucHV0IGlzIGFkZGVkIGJ5IEZvbWFudGljIFVJIGxhdGVyXG4gICAgICAgICAgICBjb25zdCBoYXNTZWFyY2hJbnB1dCA9ICRkcm9wZG93bi5oYXNDbGFzcygnc2VhcmNoJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxldCBhcGlVcmwgPSBjb25maWcuYXBpVXJsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25zXG4gICAgICAgICAgICBpZiAoaGFzU2VhcmNoSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmFwaVVybC5pbmRleE9mKCc/JykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz9xdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgICAgIHVybDogYXBpVXJsLFxuICAgICAgICAgICAgICAgIGNhY2hlOiBjb25maWcuY2FjaGUgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5jYWNoZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGU6IGhhc1NlYXJjaElucHV0ID8gNTAwIDogMCxcbiAgICAgICAgICAgICAgICB0aHJvdHRsZUZpcnN0UmVxdWVzdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiBoYXNTZWFyY2hJbnB1dCA/IDMgOiAwLCAvLyBTZWFyY2ggZHJvcGRvd25zIG5lZWQgMyBjaGFyYWN0ZXJzLCBzaW1wbGUgZHJvcGRvd25zIHdvcmsgb24gY2xpY2tcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbmZpZy5vblJlc3BvbnNlIFxuICAgICAgICAgICAgICAgICAgICAgICAgPyBjb25maWcub25SZXNwb25zZShyZXNwb25zZSkgXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHRoaXMuZGVmYXVsdFJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGDinYwgQVBJIHJlcXVlc3QgZmFpbGVkIGZvciAke2ZpZWxkTmFtZX0gKCR7Y29uZmlnLmFwaVVybH0pOmAsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIEFQSSBwYXJhbWV0ZXJzIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAoY29uZmlnLmFwaVBhcmFtcyAmJiB0eXBlb2YgY29uZmlnLmFwaVBhcmFtcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGNvbmZpZy5hcGlQYXJhbXMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nUGFyYW1zID0gcGFyYW1zLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcGlVcmwuaW5kZXhPZignPycpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHF1ZXJ5SW5kZXggPSBhcGlVcmwuaW5kZXhPZigncXVlcnk9e3F1ZXJ5fScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHF1ZXJ5SW5kZXggPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCA9IGFwaVVybC5zdWJzdHJpbmcoMCwgcXVlcnlJbmRleCkgKyBleGlzdGluZ1BhcmFtcyArICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnJicgKyBleGlzdGluZ1BhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcyArICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzLnVybCA9IGFwaVVybDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gdGVtcGxhdGUgdG8gcHJvcGVybHkgcmVuZGVyIEhUTUwgY29udGVudFxuICAgICAgICAgICAgaWYgKCFjb25maWcudGVtcGxhdGVzKSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGVtcGxhdGVzID0ge1xuICAgICAgICAgICAgICAgICAgICBtZW51OiB0aGlzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnRlbXBsYXRlcyA9IGNvbmZpZy50ZW1wbGF0ZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIEZvciBzdGF0aWMgb3B0aW9ucywgcG9wdWxhdGUgbWVudSBpbW1lZGlhdGVseVxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZVN0YXRpY09wdGlvbnMoJGRyb3Bkb3duLCBjb25maWcuc3RhdGljT3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbmF0aXZlIEZvbWFudGljIFVJIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bihzZXR0aW5ncyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IEFQSSByZXNwb25zZSBoYW5kbGVyIGZvciBNaWtvUEJYIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IEZvbWFudGljIFVJIGNvbXBhdGlibGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBkZWZhdWx0UmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmICgocmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlLnN1Y2Nlc3MpICYmIHJlc3BvbnNlLmRhdGEgJiYgQXJyYXkuaXNBcnJheShyZXNwb25zZS5kYXRhKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlc3VsdHM6IHJlc3BvbnNlLmRhdGEubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByYXdUZXh0ID0gaXRlbS5yZXByZXNlbnQgfHwgaXRlbS5uYW1lIHx8IGl0ZW0udGV4dDtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgZGlzcGxheSB0ZXh0IHdoaWxlIHByZXNlcnZpbmcgc2FmZSBIVE1MIChpY29ucylcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMocmF3VGV4dClcbiAgICAgICAgICAgICAgICAgICAgICAgIDogcmF3VGV4dDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHNhZmVUZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogc2FmZVRleHRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLCBcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdIFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGRyb3Bkb3duIG1lbnUgdGVtcGxhdGUgZm9yIHByb3BlciBIVE1MIHJlbmRlcmluZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZpZWxkcyAtIEZpZWxkIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGZvciBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICB2YWx1ZXMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25bZmllbGRzLnZhbHVlXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBvcHRpb25bZmllbGRzLnRleHRdIHx8IG9wdGlvbltmaWVsZHMubmFtZV0gfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7RHluYW1pY0Ryb3Bkb3duQnVpbGRlci5lc2NhcGVIdG1sKHZhbHVlKX1cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSB0ZXh0O1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGRyb3Bkb3duIHdpdGggc3RhdGljIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGRyb3Bkb3duIC0gRHJvcGRvd24gZWxlbWVudFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMgLSBTdGF0aWMgb3B0aW9ucyBhcnJheVxuICAgICAqL1xuICAgIHBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgXG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBvcHRpb24udmFsdWU7XG4gICAgICAgICAgICBjb25zdCByYXdUZXh0ID0gb3B0aW9uLnRleHQgfHwgb3B0aW9uLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNhbml0aXplIHZhbHVlIGZvciBhdHRyaWJ1dGUgYW5kIHRleHQgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUocmF3VmFsdWUpXG4gICAgICAgICAgICAgICAgOiB0aGlzLmVzY2FwZUh0bWwocmF3VmFsdWUpO1xuICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgOiByYXdUZXh0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7c2FmZVRleHR9PC9kaXY+YCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgbXVsdGlwbGUgZHJvcGRvd25zIGZyb20gY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWdzIC0gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZFxuICAgICAqL1xuICAgIGJ1aWxkTXVsdGlwbGVEcm9wZG93bnMoZGF0YSwgY29uZmlncykge1xuICAgICAgICBPYmplY3Qua2V5cyhjb25maWdzKS5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWdzW2ZpZWxkTmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCB2YWx1ZSBpbiBleGlzdGluZyBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICovXG4gICAgc2V0VmFsdWUoZmllbGROYW1lLCB2YWx1ZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRWYWx1ZShmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICByZXR1cm4gJGRyb3Bkb3duLmxlbmd0aCA/ICRkcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgOiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICovXG4gICAgY2xlYXIoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGRpdi50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHJldHVybiBkaXYuaW5uZXJIVE1MO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRHluYW1pY0Ryb3Bkb3duQnVpbGRlcjtcbn0iXX0=