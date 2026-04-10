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

    this.initializeDropdown(fieldName, config); // Restore value and display text after Fomantic UI initialization
    // Fomantic may reset text to placeholder during dropdown setup

    if (currentValue) {
      $hiddenInput.val(currentValue);
      $dropdown.find('> .text').html(currentText).removeClass('default');
    }
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


    this.initializeDropdown(fieldName, config); // Restore value and display text after Fomantic UI re-initialization

    if (currentValue) {
      $hiddenInput.val(currentValue);
    }

    if (currentText) {
      $dropdown.find('> .text').html(currentText).removeClass('default');
    }
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
      allowAdditions: config.allowAdditions || false,
      fullTextSearch: true,
      forceSelection: config.forceSelection || false,
      preserveHTML: true,
      // Allow HTML in dropdown text (for icons, flags, etc.)
      clearable: config.clearable || false,
      filterRemoteData: true,
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


    $dropdown.dropdown(settings); // For allowAdditions dropdowns: commit typed text when search input loses focus.
    // Fomantic UI does not auto-commit custom values on blur with forceSelection:false.
    // Solution: use Fomantic's own 'set selected' API which properly adds the value
    // to the dropdown, updates text, fires onChange, and maintains internal state.

    if (config.allowAdditions) {
      var $searchInput = $dropdown.find('input.search');

      if ($searchInput.length) {
        $searchInput.off('blur.ddbAdditions').on('blur.ddbAdditions', function () {
          var $si = $(this); // Delay lets Fomantic process menu item clicks first.
          // If user selected from menu, search input is already cleared.

          setTimeout(function () {
            var searchText = $si.val().trim();

            if (searchText) {
              // Use Fomantic API to add and select the custom value.
              // This updates text, hidden input, and internal state consistently.
              $dropdown.dropdown('set selected', searchText);
            }
          }, 150);
        });
      }
    } // Set selected value for static options after initialization


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImlzVXNpbmdQbGFjZWhvbGRlciIsInBsYWNlaG9sZGVyIiwiZGVmYXVsdEJhc2VDbGFzc2VzIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiZW1wdHlPcHRpb24iLCJ3aWxsQmVTZWFyY2giLCJpbmNsdWRlcyIsInNhZmVWYWx1ZSIsImVzY2FwZUh0bWwiLCJrZXkiLCJhcHBlbmQiLCJpbnNlcnRBZnRlciIsInZhbCIsImluaXRpYWxpemVEcm9wZG93biIsInJlbW92ZUNsYXNzIiwiJHRleHRFbGVtZW50Iiwic2V0dGluZ3MiLCJhbGxvd0FkZGl0aW9ucyIsImZ1bGxUZXh0U2VhcmNoIiwiZm9yY2VTZWxlY3Rpb24iLCJwcmVzZXJ2ZUhUTUwiLCJjbGVhcmFibGUiLCJmaWx0ZXJSZW1vdGVEYXRhIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInVuZGVmaW5lZCIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJvblJlc3BvbnNlIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkZWZhdWx0UmVzcG9uc2VIYW5kbGVyIiwicmVzdWx0cyIsInVuc2hpZnQiLCJ0eXBlIiwidHlwZUxvY2FsaXplZCIsIm9uRmFpbHVyZSIsImVycm9yIiwiYXBpUGFyYW1zIiwicGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiZXhpc3RpbmdQYXJhbXMiLCJ0b1N0cmluZyIsInF1ZXJ5SW5kZXgiLCJzdWJzdHJpbmciLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51Iiwib25TaG93IiwiJGRycCIsIiRzZWFyY2hJbnB1dCIsInBvcHVsYXRlU3RhdGljT3B0aW9ucyIsImRyb3Bkb3duIiwib2ZmIiwib24iLCIkc2kiLCJzZXRUaW1lb3V0Iiwic2VhcmNoVGV4dCIsInRyaW0iLCJzdWNjZXNzIiwiQXJyYXkiLCJpc0FycmF5IiwibWFwIiwiaXRlbSIsInJhd1RleHQiLCJyZXByZXNlbnQiLCJzYWZlVGV4dCIsImRpc2FibGVkIiwiZmllbGRzIiwidmFsdWVzIiwiZm9yRWFjaCIsImlzRGlzYWJsZWQiLCJ2aXN1YWxDbGFzcyIsIm9wdGlvbnMiLCJyYXdWYWx1ZSIsImJ1aWxkTXVsdGlwbGVEcm9wZG93bnMiLCJjb25maWdzIiwiT2JqZWN0Iiwia2V5cyIsInNldFZhbHVlIiwiZ2V0VmFsdWUiLCJjbGVhciIsImRpdiIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInRleHRDb250ZW50Iiwi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REQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCM0ksc0JBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgRm9ybSwgZ2xvYmFsVHJhbnNsYXRlLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAtIFVuaXZlcnNhbCBkcm9wZG93biBidWlsZGVyIGZvciBNaWtvUEJYIFY1LjBcbiAqIFxuICogQnVpbGRzIGRyb3Bkb3duIEhUTUwgZHluYW1pY2FsbHkgYmFzZWQgb24gUkVTVCBBUEkgZGF0YS5cbiAqIFNlcGFyYXRlcyBjb25jZXJuczogUEhQIGZvcm1zIG9ubHkgcHJvdmlkZSBoaWRkZW4gaW5wdXRzLCBcbiAqIEphdmFTY3JpcHQgYnVpbGRzIFVJIGFuZCBwb3B1bGF0ZXMgd2l0aCBkYXRhLlxuICogXG4gKiBVc2FnZTpcbiAqIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICogICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0Rm9yU2VsZWN0JyxcbiAqICAgICBwbGFjZWhvbGRlcjogJ1NlbGVjdCBuZXR3b3JrIGZpbHRlcidcbiAqIH0pO1xuICovXG5jb25zdCBEeW5hbWljRHJvcGRvd25CdWlsZGVyID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGRyb3Bkb3duIGZvciBhIGZpZWxkIGJhc2VkIG9uIFJFU1QgQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSAoZS5nLiwgJ25ldHdvcmtmaWx0ZXJpZCcpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gRHJvcGRvd24gY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcgPSB7fSkge1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgSGlkZGVuIGlucHV0IG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGROYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBhbHJlYWR5IGV4aXN0cyAtIHVwZGF0ZSBpdCBpbnN0ZWFkIG9mIGNyZWF0aW5nIGR1cGxpY2F0ZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVFeGlzdGluZ0Ryb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWVzIGZyb20gZGF0YVxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBkYXRhW2ZpZWxkTmFtZV0gfHwgY29uZmlnLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgY29uc3QgcmVwcmVzZW50RmllbGQgPSBgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgIFxuICAgICAgICAvLyBUcnkgbXVsdGlwbGUgcG9zc2libGUgcmVwcmVzZW50IGZpZWxkIG5hbWVzIGZvciBmbGV4aWJpbGl0eVxuICAgICAgICBsZXQgY3VycmVudFRleHQgPSBkYXRhW3JlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIC8vIFRyeSB3aXRob3V0ICdpZCcgc3VmZml4IChlLmcuLCBuZXR3b3JrZmlsdGVyX3JlcHJlc2VudCBpbnN0ZWFkIG9mIG5ldHdvcmtmaWx0ZXJpZF9yZXByZXNlbnQpXG4gICAgICAgICAgICBjb25zdCBiYXNlRmllbGROYW1lID0gZmllbGROYW1lLnJlcGxhY2UoL2lkJC8sICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQgPSBgJHtiYXNlRmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBkYXRhW2FsdGVybmF0aXZlUmVwcmVzZW50RmllbGRdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgdmFsdWUgYnV0IG5vIHJlcHJlc2VudCB0ZXh0LCB0cnkgdG8gZmluZCBpdCBpbiBzdGF0aWMgb3B0aW9ucyBmaXJzdFxuICAgICAgICBpZiAoY3VycmVudFZhbHVlICYmICFjdXJyZW50VGV4dCAmJiBjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2hpbmdPcHRpb24gPSBjb25maWcuc3RhdGljT3B0aW9ucy5maW5kKG9wdGlvbiA9PiBvcHRpb24udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICBpZiAobWF0Y2hpbmdPcHRpb24pIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGV4dCA9IG1hdGNoaW5nT3B0aW9uLnRleHQgfHwgbWF0Y2hpbmdPcHRpb24ubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgSFRNTCBpbiByZXByZXNlbnQgdGV4dCB1c2luZyBTZWN1cml0eVV0aWxzXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiB0eXBlb2YgY3VycmVudFRleHQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGZvciBhbGwgX3JlcHJlc2VudCBmaWVsZHMgYXMgdGhleSBjYW4gY29udGFpbiBIVE1MIGVudGl0aWVzIGFuZCBpY29uc1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgdXNpbmcgcGxhY2Vob2xkZXIgdGV4dFxuICAgICAgICBjb25zdCBpc1VzaW5nUGxhY2Vob2xkZXIgPSAhY3VycmVudFRleHQ7XG5cbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gcGxhY2Vob2xkZXIgb3IgZGVmYXVsdFxuICAgICAgICBjdXJyZW50VGV4dCA9IGN1cnJlbnRUZXh0IHx8IGNvbmZpZy5wbGFjZWhvbGRlciB8fCAnU2VsZWN0IHZhbHVlJztcblxuICAgICAgICAvLyBCdWlsZCBDU1MgY2xhc3NlcyB3aXRoIHNhbml0aXphdGlvblxuICAgICAgICAvLyBBbGxvdyBjdXN0b20gYmFzZSBjbGFzc2VzIG9yIHVzZSBkZWZhdWx0IHdpdGggJ3NlbGVjdGlvbidcbiAgICAgICAgY29uc3QgZGVmYXVsdEJhc2VDbGFzc2VzID0gWyd1aScsICdzZWxlY3Rpb24nLCAnZHJvcGRvd24nXTtcbiAgICAgICAgY29uc3QgYmFzZUNsYXNzZXMgPSBjb25maWcuYmFzZUNsYXNzZXMgfHwgZGVmYXVsdEJhc2VDbGFzc2VzO1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsQ2xhc3NlcyA9IGNvbmZpZy5hZGRpdGlvbmFsQ2xhc3NlcyB8fCBbXTtcbiAgICAgICAgY29uc3QgYWxsQ2xhc3NlcyA9IFsuLi5iYXNlQ2xhc3NlcywgLi4uYWRkaXRpb25hbENsYXNzZXNdLmpvaW4oJyAnKTtcblxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biBIVE1MIC0gRklYRUQ6IENyZWF0ZSBlbGVtZW50cyB3aXRoIGpRdWVyeSB0byBwcm9wZXJseSBoYW5kbGUgSFRNTCBjb250ZW50XG4gICAgICAgIC8vIE9ubHkgc2hvdyBjdXJyZW50IHZhbHVlIGluIHRleHQgZGlzcGxheSwgbGV0IEFQSSBwb3B1bGF0ZSBtZW51IG9uIGNsaWNrXG4gICAgICAgIC8vIFVzZSAnZGVmYXVsdCcgY2xhc3Mgd2hlbiBzaG93aW5nIHBsYWNlaG9sZGVyLCBldmVuIGlmIHRoZXJlJ3MgYSB2YWx1ZVxuICAgICAgICBjb25zdCB0ZXh0Q2xhc3MgPSBpc1VzaW5nUGxhY2Vob2xkZXIgPyAndGV4dCBkZWZhdWx0JyA6ICd0ZXh0JztcbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIGZpZWxkTmFtZSBmb3IgdXNlIGluIElEIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCBzYWZlRmllbGROYW1lID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplQXR0cmlidXRlKGZpZWxkTmFtZSlcbiAgICAgICAgICAgIDogZmllbGROYW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIHN0cnVjdHVyZSB1c2luZyBqUXVlcnkgZm9yIHByb3BlciBIVE1MIGhhbmRsaW5nXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhhbGxDbGFzc2VzKVxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgYCR7c2FmZUZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICR0ZXh0RGl2ID0gJCgnPGRpdj4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKHRleHRDbGFzcylcbiAgICAgICAgICAgIC5odG1sKGN1cnJlbnRUZXh0KTsgLy8gY3VycmVudFRleHQgYWxyZWFkeSBzYW5pdGl6ZWQgYWJvdmVcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRkcm9wZG93bkljb24gPSAkKCc8aT4nKS5hZGRDbGFzcygnZHJvcGRvd24gaWNvbicpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCc8ZGl2PicpLmFkZENsYXNzKCdtZW51Jyk7XG5cbiAgICAgICAgLy8gUHJlLXBvcHVsYXRlIG1lbnUgd2l0aCBlbXB0eSBvcHRpb24gT05MWSBmb3Igc2VhcmNoIGRyb3Bkb3duc1xuICAgICAgICAvLyBzbyBpdCBpcyB2aXNpYmxlIGJlZm9yZSB0aGUgdXNlciB0eXBlcyAobWluQ2hhcmFjdGVycz4wIHdvbid0IHRyaWdnZXIgQVBJKS5cbiAgICAgICAgLy8gRm9yIG5vbi1zZWFyY2ggZHJvcGRvd25zLCBza2lwIHByZS1wb3B1bGF0aW9uIHNvIHRoZSBtZW51IHN0YXJ0cyBlbXB0eVxuICAgICAgICAvLyBhbmQgRm9tYW50aWMgVUkgY2FsbHMgcXVlcnlSZW1vdGUoKSBvbiBmaXJzdCBvcGVuLlxuICAgICAgICBpZiAoY29uZmlnLmVtcHR5T3B0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCB3aWxsQmVTZWFyY2ggPSBbLi4uYmFzZUNsYXNzZXMsIC4uLmFkZGl0aW9uYWxDbGFzc2VzXS5pbmNsdWRlcygnc2VhcmNoJyk7XG4gICAgICAgICAgICBpZiAod2lsbEJlU2VhcmNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdGhpcy5lc2NhcGVIdG1sKGNvbmZpZy5lbXB0eU9wdGlvbi5rZXkgfHwgJycpO1xuICAgICAgICAgICAgICAgICRtZW51Lmh0bWwoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7Y29uZmlnLmVtcHR5T3B0aW9uLnZhbHVlIHx8ICcnfTwvZGl2PmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBc3NlbWJsZSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKCR0ZXh0RGl2LCAkZHJvcGRvd25JY29uLCAkbWVudSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnNlcnQgZHJvcGRvd24gYWZ0ZXIgaGlkZGVuIGlucHV0XG4gICAgICAgICRkcm9wZG93bi5pbnNlcnRBZnRlcigkaGlkZGVuSW5wdXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHZhbHVlIGluIGhpZGRlbiBpbnB1dFxuICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZyk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSB2YWx1ZSBhbmQgZGlzcGxheSB0ZXh0IGFmdGVyIEZvbWFudGljIFVJIGluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIEZvbWFudGljIG1heSByZXNldCB0ZXh0IHRvIHBsYWNlaG9sZGVyIGR1cmluZyBkcm9wZG93biBzZXR1cFxuICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICAkZHJvcGRvd24uZmluZCgnPiAudGV4dCcpLmh0bWwoY3VycmVudFRleHQpLnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBleGlzdGluZyBkcm9wZG93biB3aXRoIG5ldyBjb25maWd1cmF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZm9yIHRoZSBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBOZXcgY29uZmlndXJhdGlvbiB0byBhcHBseVxuICAgICAqL1xuICAgIHVwZGF0ZUV4aXN0aW5nRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQ2Fubm90IHVwZGF0ZTogZHJvcGRvd24gbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgdmFsdWUgaWYgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gZGF0YVtmaWVsZE5hbWVdIHx8IGNvbmZpZy5kZWZhdWx0VmFsdWUgfHwgJyc7XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHRleHQgaWYgcmVwcmVzZW50IGZpZWxkIGlzIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IHJlcHJlc2VudEZpZWxkID0gYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICBsZXQgY3VycmVudFRleHQgPSBkYXRhW3JlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgaWYgKCFjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgY29uc3QgYmFzZUZpZWxkTmFtZSA9IGZpZWxkTmFtZS5yZXBsYWNlKC9pZCQvLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkID0gYCR7YmFzZUZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gZGF0YVthbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgSFRNTCBpbiByZXByZXNlbnQgdGV4dCB1c2luZyBTZWN1cml0eVV0aWxzIChjb25zaXN0ZW50IHdpdGggYnVpbGREcm9wZG93bilcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0ICYmIHR5cGVvZiBjdXJyZW50VGV4dCA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMgZm9yIGFsbCBfcmVwcmVzZW50IGZpZWxkcyBhcyB0aGV5IGNhbiBjb250YWluIEhUTUwgZW50aXRpZXMgYW5kIGljb25zXG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoY3VycmVudFRleHQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgJHRleHRFbGVtZW50Lmh0bWwoY3VycmVudFRleHQpO1xuICAgICAgICAgICAgJHRleHRFbGVtZW50LnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBuZXcgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZyk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSB2YWx1ZSBhbmQgZGlzcGxheSB0ZXh0IGFmdGVyIEZvbWFudGljIFVJIHJlLWluaXRpYWxpemF0aW9uXG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5maW5kKCc+IC50ZXh0JykuaHRtbChjdXJyZW50VGV4dCkucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93biB3aXRoIEFQSSBvciBzdGF0aWMgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYERyb3Bkb3duIG5vdCBmb3VuZDogJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGFsbG93QWRkaXRpb25zOiBjb25maWcuYWxsb3dBZGRpdGlvbnMgfHwgZmFsc2UsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBjb25maWcuZm9yY2VTZWxlY3Rpb24gfHwgZmFsc2UsXG4gICAgICAgICAgICBwcmVzZXJ2ZUhUTUw6IHRydWUsIC8vIEFsbG93IEhUTUwgaW4gZHJvcGRvd24gdGV4dCAoZm9yIGljb25zLCBmbGFncywgZXRjLilcbiAgICAgICAgICAgIGNsZWFyYWJsZTogY29uZmlnLmNsZWFyYWJsZSB8fCBmYWxzZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQsICRjaG9pY2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBBdXRvbWF0aWMgc3luY2hyb25pemF0aW9uIHdpdGggaGlkZGVuIGlucHV0XG4gICAgICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgb24gaGlkZGVuIGlucHV0IGZvciBmb3JtIHZhbGlkYXRpb24vcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBOb3RpZnkgZm9ybSBvZiBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3VzdG9tIG9uQ2hhbmdlIGhhbmRsZXIgLSBvbmx5IGZvciBmaWVsZC1zcGVjaWZpYyBsb2dpY1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcub25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQVBJIHNldHRpbmdzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChjb25maWcuYXBpVXJsKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBoYXMgc2VhcmNoIGZ1bmN0aW9uYWxpdHkgLSBkZXRlY3QgYnkgQ1NTIGNsYXNzZXMgc2luY2Ugc2VhcmNoIGlucHV0IGlzIGFkZGVkIGJ5IEZvbWFudGljIFVJIGxhdGVyXG4gICAgICAgICAgICBjb25zdCBoYXNTZWFyY2hJbnB1dCA9ICRkcm9wZG93bi5oYXNDbGFzcygnc2VhcmNoJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxldCBhcGlVcmwgPSBjb25maWcuYXBpVXJsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25zXG4gICAgICAgICAgICBpZiAoaGFzU2VhcmNoSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmFwaVVybC5pbmRleE9mKCc/JykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz9xdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgICAgIHVybDogYXBpVXJsLFxuICAgICAgICAgICAgICAgIGNhY2hlOiBjb25maWcuY2FjaGUgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5jYWNoZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGU6IGhhc1NlYXJjaElucHV0ID8gNTAwIDogMCxcbiAgICAgICAgICAgICAgICB0aHJvdHRsZUZpcnN0UmVxdWVzdDogZmFsc2UsXG5cbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gY29uZmlnLm9uUmVzcG9uc2VcbiAgICAgICAgICAgICAgICAgICAgICAgID8gY29uZmlnLm9uUmVzcG9uc2UocmVzcG9uc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHRoaXMuZGVmYXVsdFJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUHJlcGVuZCBlbXB0eSBvcHRpb24gaWYgY29uZmlndXJlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmVtcHR5T3B0aW9uICYmIHJlc3VsdCAmJiByZXN1bHQucmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnJlc3VsdHMudW5zaGlmdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNvbmZpZy5lbXB0eU9wdGlvbi5rZXkgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogY29uZmlnLmVtcHR5T3B0aW9uLnZhbHVlIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbmZpZy5lbXB0eU9wdGlvbi52YWx1ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihg4p2MIEFQSSByZXF1ZXN0IGZhaWxlZCBmb3IgJHtmaWVsZE5hbWV9ICgke2NvbmZpZy5hcGlVcmx9KTpgLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBBUEkgcGFyYW1ldGVycyBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlQYXJhbXMgJiYgdHlwZW9mIGNvbmZpZy5hcGlQYXJhbXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhjb25maWcuYXBpUGFyYW1zKTtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ1BhcmFtcyA9IHBhcmFtcy50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1BhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXBpVXJsLmluZGV4T2YoJz8nKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBxdWVyeUluZGV4ID0gYXBpVXJsLmluZGV4T2YoJ3F1ZXJ5PXtxdWVyeX0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeUluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgPSBhcGlVcmwuc3Vic3RyaW5nKDAsIHF1ZXJ5SW5kZXgpICsgZXhpc3RpbmdQYXJhbXMgKyAnJnF1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyYnICsgZXhpc3RpbmdQYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgaWYgdGhlIGRyb3Bkb3duIGlzIHNlYXJjaGFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNTZWFyY2hJbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcyArICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzLnVybCA9IGFwaVVybDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gdGVtcGxhdGUgdG8gcHJvcGVybHkgcmVuZGVyIEhUTUwgY29udGVudFxuICAgICAgICAgICAgaWYgKCFjb25maWcudGVtcGxhdGVzKSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGVtcGxhdGVzID0ge1xuICAgICAgICAgICAgICAgICAgICBtZW51OiB0aGlzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnRlbXBsYXRlcyA9IGNvbmZpZy50ZW1wbGF0ZXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZpeDogQ2xpY2tpbmcgdGhlIGRyb3Bkb3duIGljb24gb3BlbnMgdGhlIG1lbnUgd2l0aG91dCB0cmlnZ2VyaW5nIEFQSSBxdWVyeS5cbiAgICAgICAgICAgIC8vIEZvbWFudGljIFVJIG9ubHkgY2FsbHMgcXVlcnlSZW1vdGUoKSBpbiBzaG93KCkgd2hlbiBjYW4uc2hvdygpIGlzIGZhbHNlIChubyBpdGVtcykuXG4gICAgICAgICAgICAvLyBXaGVuIHNldFZhbHVlKCkgYWRkcyBhIHByZS1zZWxlY3RlZCBpdGVtLCBjYW4uc2hvdygpIHJldHVybnMgdHJ1ZSBhbmQgQVBJIGlzIHNraXBwZWQuXG4gICAgICAgICAgICAvLyBUaGlzIG9uU2hvdyBjYWxsYmFjayBkZXRlY3RzIGFuIHVuZGVyLXBvcHVsYXRlZCBtZW51IGFuZCB0cmlnZ2VycyBhIHNlYXJjaCB2aWFcbiAgICAgICAgICAgIC8vIHRoZSBpbnB1dCBldmVudCwgd2hpY2ggZ29lcyB0aHJvdWdoIG1vZHVsZS5zZWFyY2goKSAtPiBmaWx0ZXIoKSAtPiBxdWVyeVJlbW90ZSgpLlxuICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3Mub25TaG93ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZHJwID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJwLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkbWVudS5maW5kKCcuaXRlbScpLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkc2VhcmNoSW5wdXQgPSAkZHJwLmZpbmQoJ2lucHV0LnNlYXJjaCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzZWFyY2hJbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2VhcmNoSW5wdXQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgLy8gRm9yIHN0YXRpYyBvcHRpb25zLCBwb3B1bGF0ZSBtZW51IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIGNvbmZpZy5zdGF0aWNPcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgbmF0aXZlIEZvbWFudGljIFVJIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bihzZXR0aW5ncyk7XG5cbiAgICAgICAgLy8gRm9yIGFsbG93QWRkaXRpb25zIGRyb3Bkb3duczogY29tbWl0IHR5cGVkIHRleHQgd2hlbiBzZWFyY2ggaW5wdXQgbG9zZXMgZm9jdXMuXG4gICAgICAgIC8vIEZvbWFudGljIFVJIGRvZXMgbm90IGF1dG8tY29tbWl0IGN1c3RvbSB2YWx1ZXMgb24gYmx1ciB3aXRoIGZvcmNlU2VsZWN0aW9uOmZhbHNlLlxuICAgICAgICAvLyBTb2x1dGlvbjogdXNlIEZvbWFudGljJ3Mgb3duICdzZXQgc2VsZWN0ZWQnIEFQSSB3aGljaCBwcm9wZXJseSBhZGRzIHRoZSB2YWx1ZVxuICAgICAgICAvLyB0byB0aGUgZHJvcGRvd24sIHVwZGF0ZXMgdGV4dCwgZmlyZXMgb25DaGFuZ2UsIGFuZCBtYWludGFpbnMgaW50ZXJuYWwgc3RhdGUuXG4gICAgICAgIGlmIChjb25maWcuYWxsb3dBZGRpdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWFyY2hJbnB1dCA9ICRkcm9wZG93bi5maW5kKCdpbnB1dC5zZWFyY2gnKTtcbiAgICAgICAgICAgIGlmICgkc2VhcmNoSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHNlYXJjaElucHV0Lm9mZignYmx1ci5kZGJBZGRpdGlvbnMnKS5vbignYmx1ci5kZGJBZGRpdGlvbnMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRzaSA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIERlbGF5IGxldHMgRm9tYW50aWMgcHJvY2VzcyBtZW51IGl0ZW0gY2xpY2tzIGZpcnN0LlxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB1c2VyIHNlbGVjdGVkIGZyb20gbWVudSwgc2VhcmNoIGlucHV0IGlzIGFscmVhZHkgY2xlYXJlZC5cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hUZXh0ID0gJHNpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWFyY2hUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlIEZvbWFudGljIEFQSSB0byBhZGQgYW5kIHNlbGVjdCB0aGUgY3VzdG9tIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgdXBkYXRlcyB0ZXh0LCBoaWRkZW4gaW5wdXQsIGFuZCBpbnRlcm5hbCBzdGF0ZSBjb25zaXN0ZW50bHkuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZWFyY2hUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgMTUwKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBzZWxlY3RlZCB2YWx1ZSBmb3Igc3RhdGljIG9wdGlvbnMgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgaWYgKGNvbmZpZy5zdGF0aWNPcHRpb25zKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkaGlkZGVuSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIGRyb3Bkb3duIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgQVBJIHJlc3BvbnNlIGhhbmRsZXIgZm9yIE1pa29QQlggZm9ybWF0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICogQHJldHVybnMge29iamVjdH0gRm9tYW50aWMgVUkgY29tcGF0aWJsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGRlZmF1bHRSZXNwb25zZUhhbmRsZXIocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKChyZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2Uuc3VjY2VzcykgJiYgcmVzcG9uc2UuZGF0YSAmJiBBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVzdWx0czogcmVzcG9uc2UuZGF0YS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJhd1RleHQgPSBpdGVtLnJlcHJlc2VudCB8fCBpdGVtLm5hbWUgfHwgaXRlbS50ZXh0O1xuICAgICAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSBkaXNwbGF5IHRleHQgd2hpbGUgcHJlc2VydmluZyBzYWZlIEhUTUwgKGljb25zKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHJhd1RleHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogc2FmZVRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBzYWZlVGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBpdGVtLmRpc2FibGVkIHx8IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW11cbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBkcm9wZG93biBtZW51IHRlbXBsYXRlIGZvciBwcm9wZXIgSFRNTCByZW5kZXJpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmaWVsZHMgLSBGaWVsZCBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9wdGlvbltmaWVsZHMudmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9IG9wdGlvbltmaWVsZHMudGV4dF0gfHwgb3B0aW9uW2ZpZWxkcy5uYW1lXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSBvcHRpb24uZGlzYWJsZWQgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIFVzZSAnaW5hY3RpdmUnIGNsYXNzIGZvciB2aXN1YWwgc3R5bGluZyB3aXRob3V0IGJsb2NraW5nIHNlbGVjdGlvblxuICAgICAgICAgICAgY29uc3QgdmlzdWFsQ2xhc3MgPSBpc0Rpc2FibGVkID8gJyBpbmFjdGl2ZScgOiAnJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtJHt2aXN1YWxDbGFzc31cIiBkYXRhLXZhbHVlPVwiJHtEeW5hbWljRHJvcGRvd25CdWlsZGVyLmVzY2FwZUh0bWwodmFsdWUpfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9IHRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGRyb3Bkb3duIHdpdGggc3RhdGljIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGRyb3Bkb3duIC0gRHJvcGRvd24gZWxlbWVudFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMgLSBTdGF0aWMgb3B0aW9ucyBhcnJheVxuICAgICAqL1xuICAgIHBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgXG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBvcHRpb24udmFsdWU7XG4gICAgICAgICAgICBjb25zdCByYXdUZXh0ID0gb3B0aW9uLnRleHQgfHwgb3B0aW9uLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNhbml0aXplIHZhbHVlIGZvciBhdHRyaWJ1dGUgYW5kIHRleHQgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUocmF3VmFsdWUpXG4gICAgICAgICAgICAgICAgOiB0aGlzLmVzY2FwZUh0bWwocmF3VmFsdWUpO1xuICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgOiByYXdUZXh0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7c2FmZVRleHR9PC9kaXY+YCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgbXVsdGlwbGUgZHJvcGRvd25zIGZyb20gY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWdzIC0gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZFxuICAgICAqL1xuICAgIGJ1aWxkTXVsdGlwbGVEcm9wZG93bnMoZGF0YSwgY29uZmlncykge1xuICAgICAgICBPYmplY3Qua2V5cyhjb25maWdzKS5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWdzW2ZpZWxkTmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCB2YWx1ZSBpbiBleGlzdGluZyBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICovXG4gICAgc2V0VmFsdWUoZmllbGROYW1lLCB2YWx1ZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRWYWx1ZShmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICByZXR1cm4gJGRyb3Bkb3duLmxlbmd0aCA/ICRkcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgOiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICovXG4gICAgY2xlYXIoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGRpdi50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHJldHVybiBkaXYuaW5uZXJIVE1MO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRHluYW1pY0Ryb3Bkb3duQnVpbGRlcjtcbn0iXX0=