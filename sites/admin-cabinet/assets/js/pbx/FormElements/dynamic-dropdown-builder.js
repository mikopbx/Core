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
    var $menu = $('<div>').addClass('menu'); // Pre-populate menu with empty option ONLY for search dropdowns
    // so it is visible before the user types (minCharacters>0 won't trigger API).
    // For non-search dropdowns, skip pre-population so the menu starts empty
    // and Fomantic UI calls queryRemote() on first open.

    if (config.emptyOption) {
      var willBeSearch = [].concat(_toConsumableArray(baseClasses), _toConsumableArray(additionalClasses)).includes('search');

      if (willBeSearch) {
        var safeValue = this.escapeHtml(config.emptyOption.key || '');
        $menu.html("<div class=\"item\" data-value=\"".concat(safeValue, "\">").concat(config.emptyOption.value || '', "</div>"));
      }
    } // Assemble dropdown


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
      clearable: false,
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
        onResponse: function onResponse(response) {
          var result = config.onResponse ? config.onResponse(response) : _this.defaultResponseHandler(response); // Prepend empty option if configured

          if (config.emptyOption && result && result.results) {
            result.results.unshift({
              value: config.emptyOption.key || '',
              text: config.emptyOption.value || '',
              name: config.emptyOption.value || '',
              type: '',
              typeLocalized: ''
            });
          }

          return result;
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
      } // Fix: Clicking the dropdown icon opens the menu without triggering API query.
      // Fomantic UI only calls queryRemote() in show() when can.show() is false (no items).
      // When setValue() adds a pre-selected item, can.show() returns true and API is skipped.
      // This onShow callback detects an under-populated menu and triggers a search via
      // the input event, which goes through module.search() -> filter() -> queryRemote().


      if (hasSearchInput) {
        settings.onShow = function () {
          var $drp = $(this);
          var $menu = $drp.find('.menu');

          if ($menu.find('.item').length <= 1) {
            var $searchInput = $drp.find('input.search');

            if ($searchInput.length) {
              $searchInput.trigger('input');
            }
          }
        };
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImlzVXNpbmdQbGFjZWhvbGRlciIsInBsYWNlaG9sZGVyIiwiZGVmYXVsdEJhc2VDbGFzc2VzIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiZW1wdHlPcHRpb24iLCJ3aWxsQmVTZWFyY2giLCJpbmNsdWRlcyIsInNhZmVWYWx1ZSIsImVzY2FwZUh0bWwiLCJrZXkiLCJhcHBlbmQiLCJpbnNlcnRBZnRlciIsInZhbCIsImluaXRpYWxpemVEcm9wZG93biIsIiR0ZXh0RWxlbWVudCIsInJlbW92ZUNsYXNzIiwic2V0dGluZ3MiLCJhbGxvd0FkZGl0aW9ucyIsImZ1bGxUZXh0U2VhcmNoIiwiZm9yY2VTZWxlY3Rpb24iLCJwcmVzZXJ2ZUhUTUwiLCJjbGVhcmFibGUiLCJvbkNoYW5nZSIsIiRjaG9pY2UiLCJ0cmlnZ2VyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiYXBpVXJsIiwiaGFzU2VhcmNoSW5wdXQiLCJoYXNDbGFzcyIsImluZGV4T2YiLCJhcGlTZXR0aW5ncyIsInVybCIsImNhY2hlIiwidW5kZWZpbmVkIiwidGhyb3R0bGUiLCJ0aHJvdHRsZUZpcnN0UmVxdWVzdCIsImZpbHRlclJlbW90ZURhdGEiLCJvblJlc3BvbnNlIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkZWZhdWx0UmVzcG9uc2VIYW5kbGVyIiwicmVzdWx0cyIsInVuc2hpZnQiLCJ0eXBlIiwidHlwZUxvY2FsaXplZCIsIm9uRmFpbHVyZSIsImVycm9yIiwiYXBpUGFyYW1zIiwicGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiZXhpc3RpbmdQYXJhbXMiLCJ0b1N0cmluZyIsInF1ZXJ5SW5kZXgiLCJzdWJzdHJpbmciLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51Iiwib25TaG93IiwiJGRycCIsIiRzZWFyY2hJbnB1dCIsInBvcHVsYXRlU3RhdGljT3B0aW9ucyIsImRyb3Bkb3duIiwic2V0VGltZW91dCIsInN1Y2Nlc3MiLCJBcnJheSIsImlzQXJyYXkiLCJtYXAiLCJpdGVtIiwicmF3VGV4dCIsInJlcHJlc2VudCIsInNhZmVUZXh0IiwiZGlzYWJsZWQiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJmb3JFYWNoIiwiaXNEaXNhYmxlZCIsInZpc3VhbENsYXNzIiwib3B0aW9ucyIsInJhd1ZhbHVlIiwiYnVpbGRNdWx0aXBsZURyb3Bkb3ducyIsImNvbmZpZ3MiLCJPYmplY3QiLCJrZXlzIiwic2V0VmFsdWUiLCJnZXRWYWx1ZSIsImNsZWFyIiwiZGl2IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwidGV4dENvbnRlbnQiLCJpbm5lckhUTUwiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBp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Q2lFLFFBQVYsQ0FBbUIsY0FBbkIsRUFBbUNoRixLQUFuQztBQUNIO0FBQ0osR0FwYTBCOztBQXNhM0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJdUcsRUFBQUEsUUEzYTJCLG9CQTJhbEI1SCxTQTNha0IsRUEyYVA7QUFDaEIsUUFBTW9DLFNBQVMsR0FBR2hDLENBQUMsWUFBS0osU0FBTCxlQUFuQjtBQUNBLFdBQU9vQyxTQUFTLENBQUMvQixNQUFWLEdBQW1CK0IsU0FBUyxDQUFDaUUsUUFBVixDQUFtQixXQUFuQixDQUFuQixHQUFxRCxFQUE1RDtBQUNILEdBOWEwQjs7QUFnYjNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0l3QixFQUFBQSxLQXBiMkIsaUJBb2JyQjdILFNBcGJxQixFQW9iVjtBQUNiLFFBQU1vQyxTQUFTLEdBQUdoQyxDQUFDLFlBQUtKLFNBQUwsZUFBbkI7O0FBQ0EsUUFBSW9DLFNBQVMsQ0FBQy9CLE1BQWQsRUFBc0I7QUFDbEIrQixNQUFBQSxTQUFTLENBQUNpRSxRQUFWLENBQW1CLE9BQW5CO0FBQ0g7QUFDSixHQXpiMEI7O0FBMmIzQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0l0RCxFQUFBQSxVQWhjMkIsc0JBZ2NoQnpCLElBaGNnQixFQWdjVjtBQUNiLFFBQU13RyxHQUFHLEdBQUdDLFFBQVEsQ0FBQ0MsYUFBVCxDQUF1QixLQUF2QixDQUFaO0FBQ0FGLElBQUFBLEdBQUcsQ0FBQ0csV0FBSixHQUFrQjNHLElBQWxCO0FBQ0EsV0FBT3dHLEdBQUcsQ0FBQ0ksU0FBWDtBQUNIO0FBcGMwQixDQUEvQixDLENBdWNBOztBQUNBLElBQUksT0FBT0MsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCdEksc0JBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgRm9ybSwgZ2xvYmFsVHJhbnNsYXRlLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAtIFVuaXZlcnNhbCBkcm9wZG93biBidWlsZGVyIGZvciBNaWtvUEJYIFY1LjBcbiAqIFxuICogQnVpbGRzIGRyb3Bkb3duIEhUTUwgZHluYW1pY2FsbHkgYmFzZWQgb24gUkVTVCBBUEkgZGF0YS5cbiAqIFNlcGFyYXRlcyBjb25jZXJuczogUEhQIGZvcm1zIG9ubHkgcHJvdmlkZSBoaWRkZW4gaW5wdXRzLCBcbiAqIEphdmFTY3JpcHQgYnVpbGRzIFVJIGFuZCBwb3B1bGF0ZXMgd2l0aCBkYXRhLlxuICogXG4gKiBVc2FnZTpcbiAqIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICogICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0Rm9yU2VsZWN0JyxcbiAqICAgICBwbGFjZWhvbGRlcjogJ1NlbGVjdCBuZXR3b3JrIGZpbHRlcidcbiAqIH0pO1xuICovXG5jb25zdCBEeW5hbWljRHJvcGRvd25CdWlsZGVyID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGRyb3Bkb3duIGZvciBhIGZpZWxkIGJhc2VkIG9uIFJFU1QgQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSAoZS5nLiwgJ25ldHdvcmtmaWx0ZXJpZCcpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gRHJvcGRvd24gY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcgPSB7fSkge1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgSGlkZGVuIGlucHV0IG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGROYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBhbHJlYWR5IGV4aXN0cyAtIHVwZGF0ZSBpdCBpbnN0ZWFkIG9mIGNyZWF0aW5nIGR1cGxpY2F0ZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVFeGlzdGluZ0Ryb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWVzIGZyb20gZGF0YVxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBkYXRhW2ZpZWxkTmFtZV0gfHwgY29uZmlnLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgY29uc3QgcmVwcmVzZW50RmllbGQgPSBgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgIFxuICAgICAgICAvLyBUcnkgbXVsdGlwbGUgcG9zc2libGUgcmVwcmVzZW50IGZpZWxkIG5hbWVzIGZvciBmbGV4aWJpbGl0eVxuICAgICAgICBsZXQgY3VycmVudFRleHQgPSBkYXRhW3JlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIC8vIFRyeSB3aXRob3V0ICdpZCcgc3VmZml4IChlLmcuLCBuZXR3b3JrZmlsdGVyX3JlcHJlc2VudCBpbnN0ZWFkIG9mIG5ldHdvcmtmaWx0ZXJpZF9yZXByZXNlbnQpXG4gICAgICAgICAgICBjb25zdCBiYXNlRmllbGROYW1lID0gZmllbGROYW1lLnJlcGxhY2UoL2lkJC8sICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQgPSBgJHtiYXNlRmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBkYXRhW2FsdGVybmF0aXZlUmVwcmVzZW50RmllbGRdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgdmFsdWUgYnV0IG5vIHJlcHJlc2VudCB0ZXh0LCB0cnkgdG8gZmluZCBpdCBpbiBzdGF0aWMgb3B0aW9ucyBmaXJzdFxuICAgICAgICBpZiAoY3VycmVudFZhbHVlICYmICFjdXJyZW50VGV4dCAmJiBjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2hpbmdPcHRpb24gPSBjb25maWcuc3RhdGljT3B0aW9ucy5maW5kKG9wdGlvbiA9PiBvcHRpb24udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICBpZiAobWF0Y2hpbmdPcHRpb24pIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGV4dCA9IG1hdGNoaW5nT3B0aW9uLnRleHQgfHwgbWF0Y2hpbmdPcHRpb24ubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgSFRNTCBpbiByZXByZXNlbnQgdGV4dCB1c2luZyBTZWN1cml0eVV0aWxzXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiB0eXBlb2YgY3VycmVudFRleHQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGZvciBhbGwgX3JlcHJlc2VudCBmaWVsZHMgYXMgdGhleSBjYW4gY29udGFpbiBIVE1MIGVudGl0aWVzIGFuZCBpY29uc1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgdXNpbmcgcGxhY2Vob2xkZXIgdGV4dFxuICAgICAgICBjb25zdCBpc1VzaW5nUGxhY2Vob2xkZXIgPSAhY3VycmVudFRleHQ7XG5cbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gcGxhY2Vob2xkZXIgb3IgZGVmYXVsdFxuICAgICAgICBjdXJyZW50VGV4dCA9IGN1cnJlbnRUZXh0IHx8IGNvbmZpZy5wbGFjZWhvbGRlciB8fCAnU2VsZWN0IHZhbHVlJztcblxuICAgICAgICAvLyBCdWlsZCBDU1MgY2xhc3NlcyB3aXRoIHNhbml0aXphdGlvblxuICAgICAgICAvLyBBbGxvdyBjdXN0b20gYmFzZSBjbGFzc2VzIG9yIHVzZSBkZWZhdWx0IHdpdGggJ3NlbGVjdGlvbidcbiAgICAgICAgY29uc3QgZGVmYXVsdEJhc2VDbGFzc2VzID0gWyd1aScsICdzZWxlY3Rpb24nLCAnZHJvcGRvd24nXTtcbiAgICAgICAgY29uc3QgYmFzZUNsYXNzZXMgPSBjb25maWcuYmFzZUNsYXNzZXMgfHwgZGVmYXVsdEJhc2VDbGFzc2VzO1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsQ2xhc3NlcyA9IGNvbmZpZy5hZGRpdGlvbmFsQ2xhc3NlcyB8fCBbXTtcbiAgICAgICAgY29uc3QgYWxsQ2xhc3NlcyA9IFsuLi5iYXNlQ2xhc3NlcywgLi4uYWRkaXRpb25hbENsYXNzZXNdLmpvaW4oJyAnKTtcblxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biBIVE1MIC0gRklYRUQ6IENyZWF0ZSBlbGVtZW50cyB3aXRoIGpRdWVyeSB0byBwcm9wZXJseSBoYW5kbGUgSFRNTCBjb250ZW50XG4gICAgICAgIC8vIE9ubHkgc2hvdyBjdXJyZW50IHZhbHVlIGluIHRleHQgZGlzcGxheSwgbGV0IEFQSSBwb3B1bGF0ZSBtZW51IG9uIGNsaWNrXG4gICAgICAgIC8vIFVzZSAnZGVmYXVsdCcgY2xhc3Mgd2hlbiBzaG93aW5nIHBsYWNlaG9sZGVyLCBldmVuIGlmIHRoZXJlJ3MgYSB2YWx1ZVxuICAgICAgICBjb25zdCB0ZXh0Q2xhc3MgPSBpc1VzaW5nUGxhY2Vob2xkZXIgPyAndGV4dCBkZWZhdWx0JyA6ICd0ZXh0JztcbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIGZpZWxkTmFtZSBmb3IgdXNlIGluIElEIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCBzYWZlRmllbGROYW1lID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplQXR0cmlidXRlKGZpZWxkTmFtZSlcbiAgICAgICAgICAgIDogZmllbGROYW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIHN0cnVjdHVyZSB1c2luZyBqUXVlcnkgZm9yIHByb3BlciBIVE1MIGhhbmRsaW5nXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhhbGxDbGFzc2VzKVxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgYCR7c2FmZUZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICR0ZXh0RGl2ID0gJCgnPGRpdj4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKHRleHRDbGFzcylcbiAgICAgICAgICAgIC5odG1sKGN1cnJlbnRUZXh0KTsgLy8gY3VycmVudFRleHQgYWxyZWFkeSBzYW5pdGl6ZWQgYWJvdmVcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRkcm9wZG93bkljb24gPSAkKCc8aT4nKS5hZGRDbGFzcygnZHJvcGRvd24gaWNvbicpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCc8ZGl2PicpLmFkZENsYXNzKCdtZW51Jyk7XG5cbiAgICAgICAgLy8gUHJlLXBvcHVsYXRlIG1lbnUgd2l0aCBlbXB0eSBvcHRpb24gT05MWSBmb3Igc2VhcmNoIGRyb3Bkb3duc1xuICAgICAgICAvLyBzbyBpdCBpcyB2aXNpYmxlIGJlZm9yZSB0aGUgdXNlciB0eXBlcyAobWluQ2hhcmFjdGVycz4wIHdvbid0IHRyaWdnZXIgQVBJKS5cbiAgICAgICAgLy8gRm9yIG5vbi1zZWFyY2ggZHJvcGRvd25zLCBza2lwIHByZS1wb3B1bGF0aW9uIHNvIHRoZSBtZW51IHN0YXJ0cyBlbXB0eVxuICAgICAgICAvLyBhbmQgRm9tYW50aWMgVUkgY2FsbHMgcXVlcnlSZW1vdGUoKSBvbiBmaXJzdCBvcGVuLlxuICAgICAgICBpZiAoY29uZmlnLmVtcHR5T3B0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCB3aWxsQmVTZWFyY2ggPSBbLi4uYmFzZUNsYXNzZXMsIC4uLmFkZGl0aW9uYWxDbGFzc2VzXS5pbmNsdWRlcygnc2VhcmNoJyk7XG4gICAgICAgICAgICBpZiAod2lsbEJlU2VhcmNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdGhpcy5lc2NhcGVIdG1sKGNvbmZpZy5lbXB0eU9wdGlvbi5rZXkgfHwgJycpO1xuICAgICAgICAgICAgICAgICRtZW51Lmh0bWwoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7Y29uZmlnLmVtcHR5T3B0aW9uLnZhbHVlIHx8ICcnfTwvZGl2PmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBc3NlbWJsZSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKCR0ZXh0RGl2LCAkZHJvcGRvd25JY29uLCAkbWVudSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnNlcnQgZHJvcGRvd24gYWZ0ZXIgaGlkZGVuIGlucHV0XG4gICAgICAgICRkcm9wZG93bi5pbnNlcnRBZnRlcigkaGlkZGVuSW5wdXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHZhbHVlIGluIGhpZGRlbiBpbnB1dFxuICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBleGlzdGluZyBkcm9wZG93biB3aXRoIG5ldyBjb25maWd1cmF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZm9yIHRoZSBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBOZXcgY29uZmlndXJhdGlvbiB0byBhcHBseVxuICAgICAqL1xuICAgIHVwZGF0ZUV4aXN0aW5nRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQ2Fubm90IHVwZGF0ZTogZHJvcGRvd24gbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgdmFsdWUgaWYgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gZGF0YVtmaWVsZE5hbWVdIHx8IGNvbmZpZy5kZWZhdWx0VmFsdWUgfHwgJyc7XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHRleHQgaWYgcmVwcmVzZW50IGZpZWxkIGlzIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IHJlcHJlc2VudEZpZWxkID0gYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICBsZXQgY3VycmVudFRleHQgPSBkYXRhW3JlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgaWYgKCFjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgY29uc3QgYmFzZUZpZWxkTmFtZSA9IGZpZWxkTmFtZS5yZXBsYWNlKC9pZCQvLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkID0gYCR7YmFzZUZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gZGF0YVthbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgSFRNTCBpbiByZXByZXNlbnQgdGV4dCB1c2luZyBTZWN1cml0eVV0aWxzIChjb25zaXN0ZW50IHdpdGggYnVpbGREcm9wZG93bilcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0ICYmIHR5cGVvZiBjdXJyZW50VGV4dCA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMgZm9yIGFsbCBfcmVwcmVzZW50IGZpZWxkcyBhcyB0aGV5IGNhbiBjb250YWluIEhUTUwgZW50aXRpZXMgYW5kIGljb25zXG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoY3VycmVudFRleHQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgJHRleHRFbGVtZW50Lmh0bWwoY3VycmVudFRleHQpO1xuICAgICAgICAgICAgJHRleHRFbGVtZW50LnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBuZXcgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyb3Bkb3duIHdpdGggQVBJIG9yIHN0YXRpYyBkYXRhXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgRHJvcGRvd24gbm90IGZvdW5kOiAke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0ge1xuICAgICAgICAgICAgYWxsb3dBZGRpdGlvbnM6IGZhbHNlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBwcmVzZXJ2ZUhUTUw6IHRydWUsIC8vIEFsbG93IEhUTUwgaW4gZHJvcGRvd24gdGV4dCAoZm9yIGljb25zLCBmbGFncywgZXRjLilcbiAgICAgICAgICAgIGNsZWFyYWJsZTogZmFsc2UsXG5cbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQsICRjaG9pY2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBBdXRvbWF0aWMgc3luY2hyb25pemF0aW9uIHdpdGggaGlkZGVuIGlucHV0XG4gICAgICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgb24gaGlkZGVuIGlucHV0IGZvciBmb3JtIHZhbGlkYXRpb24vcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBOb3RpZnkgZm9ybSBvZiBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3VzdG9tIG9uQ2hhbmdlIGhhbmRsZXIgLSBvbmx5IGZvciBmaWVsZC1zcGVjaWZpYyBsb2dpY1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcub25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQVBJIHNldHRpbmdzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChjb25maWcuYXBpVXJsKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBoYXMgc2VhcmNoIGZ1bmN0aW9uYWxpdHkgLSBkZXRlY3QgYnkgQ1NTIGNsYXNzZXMgc2luY2Ugc2VhcmNoIGlucHV0IGlzIGFkZGVkIGJ5IEZvbWFudGljIFVJIGxhdGVyXG4gICAgICAgICAgICBjb25zdCBoYXNTZWFyY2hJbnB1dCA9ICRkcm9wZG93bi5oYXNDbGFzcygnc2VhcmNoJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxldCBhcGlVcmwgPSBjb25maWcuYXBpVXJsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25zXG4gICAgICAgICAgICBpZiAoaGFzU2VhcmNoSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmFwaVVybC5pbmRleE9mKCc/JykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz9xdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgICAgIHVybDogYXBpVXJsLFxuICAgICAgICAgICAgICAgIGNhY2hlOiBjb25maWcuY2FjaGUgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5jYWNoZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGU6IGhhc1NlYXJjaElucHV0ID8gNTAwIDogMCxcbiAgICAgICAgICAgICAgICB0aHJvdHRsZUZpcnN0UmVxdWVzdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcblxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBjb25maWcub25SZXNwb25zZVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBjb25maWcub25SZXNwb25zZShyZXNwb25zZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIDogdGhpcy5kZWZhdWx0UmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBQcmVwZW5kIGVtcHR5IG9wdGlvbiBpZiBjb25maWd1cmVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25maWcuZW1wdHlPcHRpb24gJiYgcmVzdWx0ICYmIHJlc3VsdC5yZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucmVzdWx0cy51bnNoaWZ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogY29uZmlnLmVtcHR5T3B0aW9uLmtleSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBjb25maWcuZW1wdHlPcHRpb24udmFsdWUgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY29uZmlnLmVtcHR5T3B0aW9uLnZhbHVlIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGDinYwgQVBJIHJlcXVlc3QgZmFpbGVkIGZvciAke2ZpZWxkTmFtZX0gKCR7Y29uZmlnLmFwaVVybH0pOmAsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIEFQSSBwYXJhbWV0ZXJzIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAoY29uZmlnLmFwaVBhcmFtcyAmJiB0eXBlb2YgY29uZmlnLmFwaVBhcmFtcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGNvbmZpZy5hcGlQYXJhbXMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nUGFyYW1zID0gcGFyYW1zLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcGlVcmwuaW5kZXhPZignPycpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHF1ZXJ5SW5kZXggPSBhcGlVcmwuaW5kZXhPZigncXVlcnk9e3F1ZXJ5fScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHF1ZXJ5SW5kZXggPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCA9IGFwaVVybC5zdWJzdHJpbmcoMCwgcXVlcnlJbmRleCkgKyBleGlzdGluZ1BhcmFtcyArICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnJicgKyBleGlzdGluZ1BhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgYWRkIHF1ZXJ5IHBhcmFtZXRlciBpZiB0aGUgZHJvcGRvd24gaXMgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICc/JyArIGV4aXN0aW5nUGFyYW1zICsgJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICc/JyArIGV4aXN0aW5nUGFyYW1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuYXBpU2V0dGluZ3MudXJsID0gYXBpVXJsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSB0ZW1wbGF0ZSB0byBwcm9wZXJseSByZW5kZXIgSFRNTCBjb250ZW50XG4gICAgICAgICAgICBpZiAoIWNvbmZpZy50ZW1wbGF0ZXMpIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy50ZW1wbGF0ZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1lbnU6IHRoaXMuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGVtcGxhdGVzID0gY29uZmlnLnRlbXBsYXRlcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRml4OiBDbGlja2luZyB0aGUgZHJvcGRvd24gaWNvbiBvcGVucyB0aGUgbWVudSB3aXRob3V0IHRyaWdnZXJpbmcgQVBJIHF1ZXJ5LlxuICAgICAgICAgICAgLy8gRm9tYW50aWMgVUkgb25seSBjYWxscyBxdWVyeVJlbW90ZSgpIGluIHNob3coKSB3aGVuIGNhbi5zaG93KCkgaXMgZmFsc2UgKG5vIGl0ZW1zKS5cbiAgICAgICAgICAgIC8vIFdoZW4gc2V0VmFsdWUoKSBhZGRzIGEgcHJlLXNlbGVjdGVkIGl0ZW0sIGNhbi5zaG93KCkgcmV0dXJucyB0cnVlIGFuZCBBUEkgaXMgc2tpcHBlZC5cbiAgICAgICAgICAgIC8vIFRoaXMgb25TaG93IGNhbGxiYWNrIGRldGVjdHMgYW4gdW5kZXItcG9wdWxhdGVkIG1lbnUgYW5kIHRyaWdnZXJzIGEgc2VhcmNoIHZpYVxuICAgICAgICAgICAgLy8gdGhlIGlucHV0IGV2ZW50LCB3aGljaCBnb2VzIHRocm91Z2ggbW9kdWxlLnNlYXJjaCgpIC0+IGZpbHRlcigpIC0+IHF1ZXJ5UmVtb3RlKCkuXG4gICAgICAgICAgICBpZiAoaGFzU2VhcmNoSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5vblNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRkcnAgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkbWVudSA9ICRkcnAuZmluZCgnLm1lbnUnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRtZW51LmZpbmQoJy5pdGVtJykubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0ICRzZWFyY2hJbnB1dCA9ICRkcnAuZmluZCgnaW5wdXQuc2VhcmNoJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHNlYXJjaElucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzZWFyY2hJbnB1dC50cmlnZ2VyKCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgLy8gRm9yIHN0YXRpYyBvcHRpb25zLCBwb3B1bGF0ZSBtZW51IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIGNvbmZpZy5zdGF0aWNPcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgbmF0aXZlIEZvbWFudGljIFVJIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bihzZXR0aW5ncyk7XG5cbiAgICAgICAgLy8gU2V0IHNlbGVjdGVkIHZhbHVlIGZvciBzdGF0aWMgb3B0aW9ucyBhZnRlciBpbml0aWFsaXphdGlvblxuICAgICAgICBpZiAoY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRoaWRkZW5JbnB1dC52YWwoKTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBBUEkgcmVzcG9uc2UgaGFuZGxlciBmb3IgTWlrb1BCWCBmb3JtYXRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBGb21hbnRpYyBVSSBjb21wYXRpYmxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZGVmYXVsdFJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAoKHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZS5zdWNjZXNzKSAmJiByZXNwb25zZS5kYXRhICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZXN1bHRzOiByZXNwb25zZS5kYXRhLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmF3VGV4dCA9IGl0ZW0ucmVwcmVzZW50IHx8IGl0ZW0ubmFtZSB8fCBpdGVtLnRleHQ7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNhbml0aXplIGRpc3BsYXkgdGV4dCB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgSFRNTCAoaWNvbnMpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMocmF3VGV4dClcbiAgICAgICAgICAgICAgICAgICAgICAgIDogcmF3VGV4dDtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBzYWZlVGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHNhZmVUZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGl0ZW0uZGlzYWJsZWQgfHwgZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICByZXN1bHRzOiBbXVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGRyb3Bkb3duIG1lbnUgdGVtcGxhdGUgZm9yIHByb3BlciBIVE1MIHJlbmRlcmluZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZpZWxkcyAtIEZpZWxkIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGZvciBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgdmFsdWVzLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gb3B0aW9uW2ZpZWxkcy52YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gb3B0aW9uW2ZpZWxkcy50ZXh0XSB8fCBvcHRpb25bZmllbGRzLm5hbWVdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaXNEaXNhYmxlZCA9IG9wdGlvbi5kaXNhYmxlZCB8fCBmYWxzZTtcblxuICAgICAgICAgICAgLy8gVXNlICdpbmFjdGl2ZScgY2xhc3MgZm9yIHZpc3VhbCBzdHlsaW5nIHdpdGhvdXQgYmxvY2tpbmcgc2VsZWN0aW9uXG4gICAgICAgICAgICBjb25zdCB2aXN1YWxDbGFzcyA9IGlzRGlzYWJsZWQgPyAnIGluYWN0aXZlJyA6ICcnO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW0ke3Zpc3VhbENsYXNzfVwiIGRhdGEtdmFsdWU9XCIke0R5bmFtaWNEcm9wZG93bkJ1aWxkZXIuZXNjYXBlSHRtbCh2YWx1ZSl9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gdGV4dDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZHJvcGRvd24gd2l0aCBzdGF0aWMgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZHJvcGRvd24gLSBEcm9wZG93biBlbGVtZW50XG4gICAgICogQHBhcmFtIHtBcnJheX0gb3B0aW9ucyAtIFN0YXRpYyBvcHRpb25zIGFycmF5XG4gICAgICovXG4gICAgcG9wdWxhdGVTdGF0aWNPcHRpb25zKCRkcm9wZG93biwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCAkbWVudSA9ICRkcm9wZG93bi5maW5kKCcubWVudScpO1xuICAgICAgICBcbiAgICAgICAgb3B0aW9ucy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICAgICAgICBjb25zdCByYXdWYWx1ZSA9IG9wdGlvbi52YWx1ZTtcbiAgICAgICAgICAgIGNvbnN0IHJhd1RleHQgPSBvcHRpb24udGV4dCB8fCBvcHRpb24ubmFtZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2FuaXRpemUgdmFsdWUgZm9yIGF0dHJpYnV0ZSBhbmQgdGV4dCBmb3IgZGlzcGxheVxuICAgICAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUF0dHJpYnV0ZShyYXdWYWx1ZSlcbiAgICAgICAgICAgICAgICA6IHRoaXMuZXNjYXBlSHRtbChyYXdWYWx1ZSk7XG4gICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMocmF3VGV4dClcbiAgICAgICAgICAgICAgICA6IHJhd1RleHQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRtZW51LmFwcGVuZChgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtzYWZlVmFsdWV9XCI+JHtzYWZlVGV4dH08L2Rpdj5gKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBtdWx0aXBsZSBkcm9wZG93bnMgZnJvbSBjb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZ3MgLSBDb25maWd1cmF0aW9uIGZvciBlYWNoIGZpZWxkXG4gICAgICovXG4gICAgYnVpbGRNdWx0aXBsZURyb3Bkb3ducyhkYXRhLCBjb25maWdzKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGNvbmZpZ3MpLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIHRoaXMuYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZ3NbZmllbGROYW1lXSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHZhbHVlIGluIGV4aXN0aW5nIGRyb3Bkb3duXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBWYWx1ZSB0byBzZXRcbiAgICAgKi9cbiAgICBzZXRWYWx1ZShmaWVsZE5hbWUsIHZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBkcm9wZG93biB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQ3VycmVudCB2YWx1ZVxuICAgICAqL1xuICAgIGdldFZhbHVlKGZpZWxkTmFtZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIHJldHVybiAkZHJvcGRvd24ubGVuZ3RoID8gJGRyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKSA6ICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKi9cbiAgICBjbGVhcihmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIHRvIHByZXZlbnQgWFNTXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZGl2LnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgcmV0dXJuIGRpdi5pbm5lckhUTUw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBEeW5hbWljRHJvcGRvd25CdWlsZGVyO1xufSJdfQ==