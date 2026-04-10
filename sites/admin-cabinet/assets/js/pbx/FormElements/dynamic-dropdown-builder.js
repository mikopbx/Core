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
    // We attach directly to the search input (created by Fomantic during init)
    // instead of using onHide, which depends on animation state.

    if (config.allowAdditions) {
      var $searchInput = $dropdown.find('input.search');

      if ($searchInput.length) {
        $searchInput.on('blur.ddbAdditions', function () {
          var $si = $(this); // Delay to let Fomantic process menu item clicks first.
          // If user selected from menu, Fomantic clears search input
          // before our timeout fires, so searchText will be empty.

          setTimeout(function () {
            var searchText = $si.val().trim();

            if (searchText && searchText !== $hiddenInput.val()) {
              $hiddenInput.val(searchText);
              $hiddenInput.trigger('change');

              if (typeof Form !== 'undefined' && Form.dataChanged) {
                Form.dataChanged();
              }

              if (config.onChange) {
                config.onChange(searchText, searchText, null);
              }

              $dropdown.find('> .text').html(DynamicDropdownBuilder.escapeHtml(searchText)).removeClass('default');
              $si.val('');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImlzVXNpbmdQbGFjZWhvbGRlciIsInBsYWNlaG9sZGVyIiwiZGVmYXVsdEJhc2VDbGFzc2VzIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiZW1wdHlPcHRpb24iLCJ3aWxsQmVTZWFyY2giLCJpbmNsdWRlcyIsInNhZmVWYWx1ZSIsImVzY2FwZUh0bWwiLCJrZXkiLCJhcHBlbmQiLCJpbnNlcnRBZnRlciIsInZhbCIsImluaXRpYWxpemVEcm9wZG93biIsInJlbW92ZUNsYXNzIiwiJHRleHRFbGVtZW50Iiwic2V0dGluZ3MiLCJhbGxvd0FkZGl0aW9ucyIsImZ1bGxUZXh0U2VhcmNoIiwiZm9yY2VTZWxlY3Rpb24iLCJwcmVzZXJ2ZUhUTUwiLCJjbGVhcmFibGUiLCJmaWx0ZXJSZW1vdGVEYXRhIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInVuZGVmaW5lZCIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJvblJlc3BvbnNlIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkZWZhdWx0UmVzcG9uc2VIYW5kbGVyIiwicmVzdWx0cyIsInVuc2hpZnQiLCJ0eXBlIiwidHlwZUxvY2FsaXplZCIsIm9uRmFpbHVyZSIsImVycm9yIiwiYXBpUGFyYW1zIiwicGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiZXhpc3RpbmdQYXJhbXMiLCJ0b1N0cmluZyIsInF1ZXJ5SW5kZXgiLCJzdWJzdHJpbmciLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51Iiwib25TaG93IiwiJGRycCIsIiRzZWFyY2hJbnB1dCIsInBvcHVsYXRlU3RhdGljT3B0aW9ucyIsImRyb3Bkb3duIiwib24iLCIkc2kiLCJzZXRUaW1lb3V0Iiwic2VhcmNoVGV4dCIsInRyaW0iLCJzdWNjZXNzIiwiQXJyYXkiLCJpc0FycmF5IiwibWFwIiwiaXRlbSIsInJhd1RleHQiLCJyZXByZXNlbnQiLCJzYWZlVGV4dCIsImRpc2FibGVkIiwiZmllbGRzIiwidmFsdWVzIiwiZm9yRWFjaCIsImlzRGlzYWJsZWQiLCJ2aXN1YWxDbGFzcyIsIm9wdGlvbnMiLCJyYXdWYWx1ZSIsImJ1aWxkTXVsdGlwbGVEcm9wZG93bnMiLCJjb25maWdzIiwiT2JqZWN0Iiwia2V5cyIsInNldFZhbHVlIiwiZ2V0VmFsdWUiLCJjbGVhciIsImRpdiIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInRleHRDb250ZW50IiwiaW5uZXJI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UyxHQUFHaEMsQ0FBQyxZQUFLSixTQUFMLGVBQW5COztBQUNBLFFBQUlvQyxTQUFTLENBQUMvQixNQUFkLEVBQXNCO0FBQ2xCK0IsTUFBQUEsU0FBUyxDQUFDaUUsUUFBVixDQUFtQixPQUFuQjtBQUNIO0FBQ0osR0ExZTBCOztBQTRlM0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJdEQsRUFBQUEsVUFqZjJCLHNCQWlmaEJ6QixJQWpmZ0IsRUFpZlY7QUFDYixRQUFNNEcsR0FBRyxHQUFHQyxRQUFRLENBQUNDLGFBQVQsQ0FBdUIsS0FBdkIsQ0FBWjtBQUNBRixJQUFBQSxHQUFHLENBQUNHLFdBQUosR0FBa0IvRyxJQUFsQjtBQUNBLFdBQU80RyxHQUFHLENBQUNJLFNBQVg7QUFDSDtBQXJmMEIsQ0FBL0IsQyxDQXdmQTs7QUFDQSxJQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjFJLHNCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIEZvcm0sIGdsb2JhbFRyYW5zbGF0ZSwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgLSBVbml2ZXJzYWwgZHJvcGRvd24gYnVpbGRlciBmb3IgTWlrb1BCWCBWNS4wXG4gKiBcbiAqIEJ1aWxkcyBkcm9wZG93biBIVE1MIGR5bmFtaWNhbGx5IGJhc2VkIG9uIFJFU1QgQVBJIGRhdGEuXG4gKiBTZXBhcmF0ZXMgY29uY2VybnM6IFBIUCBmb3JtcyBvbmx5IHByb3ZpZGUgaGlkZGVuIGlucHV0cywgXG4gKiBKYXZhU2NyaXB0IGJ1aWxkcyBVSSBhbmQgcG9wdWxhdGVzIHdpdGggZGF0YS5cbiAqIFxuICogVXNhZ2U6XG4gKiBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAqICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjIvbmV0d29yay1maWx0ZXJzL2dldEZvclNlbGVjdCcsXG4gKiAgICAgcGxhY2Vob2xkZXI6ICdTZWxlY3QgbmV0d29yayBmaWx0ZXInXG4gKiB9KTtcbiAqL1xuY29uc3QgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBkcm9wZG93biBmb3IgYSBmaWVsZCBiYXNlZCBvbiBSRVNUIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgKGUuZy4sICduZXR3b3JrZmlsdGVyaWQnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIERyb3Bkb3duIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBidWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnID0ge30pIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEhpZGRlbiBpbnB1dCBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gYWxyZWFkeSBleGlzdHMgLSB1cGRhdGUgaXQgaW5zdGVhZCBvZiBjcmVhdGluZyBkdXBsaWNhdGVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRXhpc3RpbmdEcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlcyBmcm9tIGRhdGFcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gZGF0YVtmaWVsZE5hbWVdIHx8IGNvbmZpZy5kZWZhdWx0VmFsdWUgfHwgJyc7XG4gICAgICAgIGNvbnN0IHJlcHJlc2VudEZpZWxkID0gYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHBvc3NpYmxlIHJlcHJlc2VudCBmaWVsZCBuYW1lcyBmb3IgZmxleGliaWxpdHlcbiAgICAgICAgbGV0IGN1cnJlbnRUZXh0ID0gZGF0YVtyZXByZXNlbnRGaWVsZF07XG4gICAgICAgIFxuICAgICAgICBpZiAoIWN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICAvLyBUcnkgd2l0aG91dCAnaWQnIHN1ZmZpeCAoZS5nLiwgbmV0d29ya2ZpbHRlcl9yZXByZXNlbnQgaW5zdGVhZCBvZiBuZXR3b3JrZmlsdGVyaWRfcmVwcmVzZW50KVxuICAgICAgICAgICAgY29uc3QgYmFzZUZpZWxkTmFtZSA9IGZpZWxkTmFtZS5yZXBsYWNlKC9pZCQvLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkID0gYCR7YmFzZUZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gZGF0YVthbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIHZhbHVlIGJ1dCBubyByZXByZXNlbnQgdGV4dCwgdHJ5IHRvIGZpbmQgaXQgaW4gc3RhdGljIG9wdGlvbnMgZmlyc3RcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiAhY3VycmVudFRleHQgJiYgY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoaW5nT3B0aW9uID0gY29uZmlnLnN0YXRpY09wdGlvbnMuZmluZChvcHRpb24gPT4gb3B0aW9uLnZhbHVlID09PSBjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgaWYgKG1hdGNoaW5nT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFRleHQgPSBtYXRjaGluZ09wdGlvbi50ZXh0IHx8IG1hdGNoaW5nT3B0aW9uLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIEhUTUwgaW4gcmVwcmVzZW50IHRleHQgdXNpbmcgU2VjdXJpdHlVdGlsc1xuICAgICAgICBpZiAoY3VycmVudFRleHQgJiYgdHlwZW9mIGN1cnJlbnRUZXh0ID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIFVzZSBzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyBmb3IgYWxsIF9yZXByZXNlbnQgZmllbGRzIGFzIHRoZXkgY2FuIGNvbnRhaW4gSFRNTCBlbnRpdGllcyBhbmQgaWNvbnNcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhjdXJyZW50VGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIHVzaW5nIHBsYWNlaG9sZGVyIHRleHRcbiAgICAgICAgY29uc3QgaXNVc2luZ1BsYWNlaG9sZGVyID0gIWN1cnJlbnRUZXh0O1xuXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIHBsYWNlaG9sZGVyIG9yIGRlZmF1bHRcbiAgICAgICAgY3VycmVudFRleHQgPSBjdXJyZW50VGV4dCB8fCBjb25maWcucGxhY2Vob2xkZXIgfHwgJ1NlbGVjdCB2YWx1ZSc7XG5cbiAgICAgICAgLy8gQnVpbGQgQ1NTIGNsYXNzZXMgd2l0aCBzYW5pdGl6YXRpb25cbiAgICAgICAgLy8gQWxsb3cgY3VzdG9tIGJhc2UgY2xhc3NlcyBvciB1c2UgZGVmYXVsdCB3aXRoICdzZWxlY3Rpb24nXG4gICAgICAgIGNvbnN0IGRlZmF1bHRCYXNlQ2xhc3NlcyA9IFsndWknLCAnc2VsZWN0aW9uJywgJ2Ryb3Bkb3duJ107XG4gICAgICAgIGNvbnN0IGJhc2VDbGFzc2VzID0gY29uZmlnLmJhc2VDbGFzc2VzIHx8IGRlZmF1bHRCYXNlQ2xhc3NlcztcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbENsYXNzZXMgPSBjb25maWcuYWRkaXRpb25hbENsYXNzZXMgfHwgW107XG4gICAgICAgIGNvbnN0IGFsbENsYXNzZXMgPSBbLi4uYmFzZUNsYXNzZXMsIC4uLmFkZGl0aW9uYWxDbGFzc2VzXS5qb2luKCcgJyk7XG5cbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gSFRNTCAtIEZJWEVEOiBDcmVhdGUgZWxlbWVudHMgd2l0aCBqUXVlcnkgdG8gcHJvcGVybHkgaGFuZGxlIEhUTUwgY29udGVudFxuICAgICAgICAvLyBPbmx5IHNob3cgY3VycmVudCB2YWx1ZSBpbiB0ZXh0IGRpc3BsYXksIGxldCBBUEkgcG9wdWxhdGUgbWVudSBvbiBjbGlja1xuICAgICAgICAvLyBVc2UgJ2RlZmF1bHQnIGNsYXNzIHdoZW4gc2hvd2luZyBwbGFjZWhvbGRlciwgZXZlbiBpZiB0aGVyZSdzIGEgdmFsdWVcbiAgICAgICAgY29uc3QgdGV4dENsYXNzID0gaXNVc2luZ1BsYWNlaG9sZGVyID8gJ3RleHQgZGVmYXVsdCcgOiAndGV4dCc7XG4gICAgICAgIFxuICAgICAgICAvLyBTYW5pdGl6ZSBmaWVsZE5hbWUgZm9yIHVzZSBpbiBJRCBhdHRyaWJ1dGVcbiAgICAgICAgY29uc3Qgc2FmZUZpZWxkTmFtZSA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUF0dHJpYnV0ZShmaWVsZE5hbWUpXG4gICAgICAgICAgICA6IGZpZWxkTmFtZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBzdHJ1Y3R1cmUgdXNpbmcgalF1ZXJ5IGZvciBwcm9wZXIgSFRNTCBoYW5kbGluZ1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoYWxsQ2xhc3NlcylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGAke3NhZmVGaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkdGV4dERpdiA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0ZXh0Q2xhc3MpXG4gICAgICAgICAgICAuaHRtbChjdXJyZW50VGV4dCk7IC8vIGN1cnJlbnRUZXh0IGFscmVhZHkgc2FuaXRpemVkIGFib3ZlXG4gICAgICAgIFxuICAgICAgICBjb25zdCAkZHJvcGRvd25JY29uID0gJCgnPGk+JykuYWRkQ2xhc3MoJ2Ryb3Bkb3duIGljb24nKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnPGRpdj4nKS5hZGRDbGFzcygnbWVudScpO1xuXG4gICAgICAgIC8vIFByZS1wb3B1bGF0ZSBtZW51IHdpdGggZW1wdHkgb3B0aW9uIE9OTFkgZm9yIHNlYXJjaCBkcm9wZG93bnNcbiAgICAgICAgLy8gc28gaXQgaXMgdmlzaWJsZSBiZWZvcmUgdGhlIHVzZXIgdHlwZXMgKG1pbkNoYXJhY3RlcnM+MCB3b24ndCB0cmlnZ2VyIEFQSSkuXG4gICAgICAgIC8vIEZvciBub24tc2VhcmNoIGRyb3Bkb3ducywgc2tpcCBwcmUtcG9wdWxhdGlvbiBzbyB0aGUgbWVudSBzdGFydHMgZW1wdHlcbiAgICAgICAgLy8gYW5kIEZvbWFudGljIFVJIGNhbGxzIHF1ZXJ5UmVtb3RlKCkgb24gZmlyc3Qgb3Blbi5cbiAgICAgICAgaWYgKGNvbmZpZy5lbXB0eU9wdGlvbikge1xuICAgICAgICAgICAgY29uc3Qgd2lsbEJlU2VhcmNoID0gWy4uLmJhc2VDbGFzc2VzLCAuLi5hZGRpdGlvbmFsQ2xhc3Nlc10uaW5jbHVkZXMoJ3NlYXJjaCcpO1xuICAgICAgICAgICAgaWYgKHdpbGxCZVNlYXJjaCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHRoaXMuZXNjYXBlSHRtbChjb25maWcuZW1wdHlPcHRpb24ua2V5IHx8ICcnKTtcbiAgICAgICAgICAgICAgICAkbWVudS5odG1sKGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke3NhZmVWYWx1ZX1cIj4ke2NvbmZpZy5lbXB0eU9wdGlvbi52YWx1ZSB8fCAnJ308L2Rpdj5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXNzZW1ibGUgZHJvcGRvd25cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dERpdiwgJGRyb3Bkb3duSWNvbiwgJG1lbnUpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5zZXJ0IGRyb3Bkb3duIGFmdGVyIGhpZGRlbiBpbnB1dFxuICAgICAgICAkZHJvcGRvd24uaW5zZXJ0QWZ0ZXIoJGhpZGRlbklucHV0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB2YWx1ZSBpbiBoaWRkZW4gaW5wdXRcbiAgICAgICAgJGhpZGRlbklucHV0LnZhbChjdXJyZW50VmFsdWUpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgdmFsdWUgYW5kIGRpc3BsYXkgdGV4dCBhZnRlciBGb21hbnRpYyBVSSBpbml0aWFsaXphdGlvblxuICAgICAgICAvLyBGb21hbnRpYyBtYXkgcmVzZXQgdGV4dCB0byBwbGFjZWhvbGRlciBkdXJpbmcgZHJvcGRvd24gc2V0dXBcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbChjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgJGRyb3Bkb3duLmZpbmQoJz4gLnRleHQnKS5odG1sKGN1cnJlbnRUZXh0KS5yZW1vdmVDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZXhpc3RpbmcgZHJvcGRvd24gd2l0aCBuZXcgY29uZmlndXJhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZvciB0aGUgZHJvcGRvd25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gTmV3IGNvbmZpZ3VyYXRpb24gdG8gYXBwbHlcbiAgICAgKi9cbiAgICB1cGRhdGVFeGlzdGluZ0Ryb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYENhbm5vdCB1cGRhdGU6IGRyb3Bkb3duIG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGROYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHZhbHVlIGlmIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGRhdGFbZmllbGROYW1lXSB8fCBjb25maWcuZGVmYXVsdFZhbHVlIHx8ICcnO1xuICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB0ZXh0IGlmIHJlcHJlc2VudCBmaWVsZCBpcyBwcm92aWRlZFxuICAgICAgICBjb25zdCByZXByZXNlbnRGaWVsZCA9IGAke2ZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgbGV0IGN1cnJlbnRUZXh0ID0gZGF0YVtyZXByZXNlbnRGaWVsZF07XG4gICAgICAgIGlmICghY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VGaWVsZE5hbWUgPSBmaWVsZE5hbWUucmVwbGFjZSgvaWQkLywgJycpO1xuICAgICAgICAgICAgY29uc3QgYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZCA9IGAke2Jhc2VGaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IGRhdGFbYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIEhUTUwgaW4gcmVwcmVzZW50IHRleHQgdXNpbmcgU2VjdXJpdHlVdGlscyAoY29uc2lzdGVudCB3aXRoIGJ1aWxkRHJvcGRvd24pXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiB0eXBlb2YgY3VycmVudFRleHQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGZvciBhbGwgX3JlcHJlc2VudCBmaWVsZHMgYXMgdGhleSBjYW4gY29udGFpbiBIVE1MIGVudGl0aWVzIGFuZCBpY29uc1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICBjb25zdCAkdGV4dEVsZW1lbnQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKTtcbiAgICAgICAgICAgICR0ZXh0RWxlbWVudC5odG1sKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgICAgICR0ZXh0RWxlbWVudC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyb3Bkb3duIHdpdGggbmV3IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgdmFsdWUgYW5kIGRpc3BsYXkgdGV4dCBhZnRlciBGb21hbnRpYyBVSSByZS1pbml0aWFsaXphdGlvblxuICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZmluZCgnPiAudGV4dCcpLmh0bWwoY3VycmVudFRleHQpLnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBBUEkgb3Igc3RhdGljIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZykge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBEcm9wZG93biBub3QgZm91bmQ6ICR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBhbGxvd0FkZGl0aW9uczogY29uZmlnLmFsbG93QWRkaXRpb25zIHx8IGZhbHNlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogY29uZmlnLmZvcmNlU2VsZWN0aW9uIHx8IGZhbHNlLFxuICAgICAgICAgICAgcHJlc2VydmVIVE1MOiB0cnVlLCAvLyBBbGxvdyBIVE1MIGluIGRyb3Bkb3duIHRleHQgKGZvciBpY29ucywgZmxhZ3MsIGV0Yy4pXG4gICAgICAgICAgICBjbGVhcmFibGU6IGNvbmZpZy5jbGVhcmFibGUgfHwgZmFsc2UsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQXV0b21hdGljIHN5bmNocm9uaXphdGlvbiB3aXRoIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9uIGhpZGRlbiBpbnB1dCBmb3IgZm9ybSB2YWxpZGF0aW9uL3Byb2Nlc3NpbmdcbiAgICAgICAgICAgICAgICAkaGlkZGVuSW5wdXQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTm90aWZ5IGZvcm0gb2YgY2hhbmdlc1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBvbkNoYW5nZSBoYW5kbGVyIC0gb25seSBmb3IgZmllbGQtc3BlY2lmaWMgbG9naWNcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLm9uQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5vbkNoYW5nZSh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIEFQSSBzZXR0aW5ncyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoY29uZmlnLmFwaVVybCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gaGFzIHNlYXJjaCBmdW5jdGlvbmFsaXR5IC0gZGV0ZWN0IGJ5IENTUyBjbGFzc2VzIHNpbmNlIHNlYXJjaCBpbnB1dCBpcyBhZGRlZCBieSBGb21hbnRpYyBVSSBsYXRlclxuICAgICAgICAgICAgY29uc3QgaGFzU2VhcmNoSW5wdXQgPSAkZHJvcGRvd24uaGFzQ2xhc3MoJ3NlYXJjaCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsZXQgYXBpVXJsID0gY29uZmlnLmFwaVVybDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBhZGQgcXVlcnkgcGFyYW1ldGVyIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duc1xuICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlVcmwuaW5kZXhPZignPycpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICc/cXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZXR0aW5ncy5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgICAgICB1cmw6IGFwaVVybCxcbiAgICAgICAgICAgICAgICBjYWNoZTogY29uZmlnLmNhY2hlICE9PSB1bmRlZmluZWQgPyBjb25maWcuY2FjaGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgIHRocm90dGxlOiBoYXNTZWFyY2hJbnB1dCA/IDUwMCA6IDAsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGVGaXJzdFJlcXVlc3Q6IGZhbHNlLFxuXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGNvbmZpZy5vblJlc3BvbnNlXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGNvbmZpZy5vblJlc3BvbnNlKHJlc3BvbnNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiB0aGlzLmRlZmF1bHRSZXNwb25zZUhhbmRsZXIocmVzcG9uc2UpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFByZXBlbmQgZW1wdHkgb3B0aW9uIGlmIGNvbmZpZ3VyZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5lbXB0eU9wdGlvbiAmJiByZXN1bHQgJiYgcmVzdWx0LnJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5yZXN1bHRzLnVuc2hpZnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBjb25maWcuZW1wdHlPcHRpb24ua2V5IHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGNvbmZpZy5lbXB0eU9wdGlvbi52YWx1ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjb25maWcuZW1wdHlPcHRpb24udmFsdWUgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogJydcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYOKdjCBBUEkgcmVxdWVzdCBmYWlsZWQgZm9yICR7ZmllbGROYW1lfSAoJHtjb25maWcuYXBpVXJsfSk6YCwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgQVBJIHBhcmFtZXRlcnMgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmIChjb25maWcuYXBpUGFyYW1zICYmIHR5cGVvZiBjb25maWcuYXBpUGFyYW1zID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoY29uZmlnLmFwaVBhcmFtcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdQYXJhbXMgPSBwYXJhbXMudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFwaVVybC5pbmRleE9mKCc/JykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcXVlcnlJbmRleCA9IGFwaVVybC5pbmRleE9mKCdxdWVyeT17cXVlcnl9Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocXVlcnlJbmRleCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsID0gYXBpVXJsLnN1YnN0cmluZygwLCBxdWVyeUluZGV4KSArIGV4aXN0aW5nUGFyYW1zICsgJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICcmJyArIGV4aXN0aW5nUGFyYW1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25seSBhZGQgcXVlcnkgcGFyYW1ldGVyIGlmIHRoZSBkcm9wZG93biBpcyBzZWFyY2hhYmxlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFzU2VhcmNoSW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz8nICsgZXhpc3RpbmdQYXJhbXMgKyAnJnF1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz8nICsgZXhpc3RpbmdQYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5hcGlTZXR0aW5ncy51cmwgPSBhcGlVcmw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2UgY3VzdG9tIHRlbXBsYXRlIHRvIHByb3Blcmx5IHJlbmRlciBIVE1MIGNvbnRlbnRcbiAgICAgICAgICAgIGlmICghY29uZmlnLnRlbXBsYXRlcykge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnRlbXBsYXRlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbWVudTogdGhpcy5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy50ZW1wbGF0ZXMgPSBjb25maWcudGVtcGxhdGVzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaXg6IENsaWNraW5nIHRoZSBkcm9wZG93biBpY29uIG9wZW5zIHRoZSBtZW51IHdpdGhvdXQgdHJpZ2dlcmluZyBBUEkgcXVlcnkuXG4gICAgICAgICAgICAvLyBGb21hbnRpYyBVSSBvbmx5IGNhbGxzIHF1ZXJ5UmVtb3RlKCkgaW4gc2hvdygpIHdoZW4gY2FuLnNob3coKSBpcyBmYWxzZSAobm8gaXRlbXMpLlxuICAgICAgICAgICAgLy8gV2hlbiBzZXRWYWx1ZSgpIGFkZHMgYSBwcmUtc2VsZWN0ZWQgaXRlbSwgY2FuLnNob3coKSByZXR1cm5zIHRydWUgYW5kIEFQSSBpcyBza2lwcGVkLlxuICAgICAgICAgICAgLy8gVGhpcyBvblNob3cgY2FsbGJhY2sgZGV0ZWN0cyBhbiB1bmRlci1wb3B1bGF0ZWQgbWVudSBhbmQgdHJpZ2dlcnMgYSBzZWFyY2ggdmlhXG4gICAgICAgICAgICAvLyB0aGUgaW5wdXQgZXZlbnQsIHdoaWNoIGdvZXMgdGhyb3VnaCBtb2R1bGUuc2VhcmNoKCkgLT4gZmlsdGVyKCkgLT4gcXVlcnlSZW1vdGUoKS5cbiAgICAgICAgICAgIGlmIChoYXNTZWFyY2hJbnB1dCkge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLm9uU2hvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGRycCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gJGRycC5maW5kKCcubWVudScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJG1lbnUuZmluZCgnLml0ZW0nKS5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJHNlYXJjaElucHV0ID0gJGRycC5maW5kKCdpbnB1dC5zZWFyY2gnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2VhcmNoSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNlYXJjaElucHV0LnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIEZvciBzdGF0aWMgb3B0aW9ucywgcG9wdWxhdGUgbWVudSBpbW1lZGlhdGVseVxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZVN0YXRpY09wdGlvbnMoJGRyb3Bkb3duLCBjb25maWcuc3RhdGljT3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIG5hdGl2ZSBGb21hbnRpYyBVSSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oc2V0dGluZ3MpO1xuXG4gICAgICAgIC8vIEZvciBhbGxvd0FkZGl0aW9ucyBkcm9wZG93bnM6IGNvbW1pdCB0eXBlZCB0ZXh0IHdoZW4gc2VhcmNoIGlucHV0IGxvc2VzIGZvY3VzLlxuICAgICAgICAvLyBGb21hbnRpYyBVSSBkb2VzIG5vdCBhdXRvLWNvbW1pdCBjdXN0b20gdmFsdWVzIG9uIGJsdXIgd2l0aCBmb3JjZVNlbGVjdGlvbjpmYWxzZS5cbiAgICAgICAgLy8gV2UgYXR0YWNoIGRpcmVjdGx5IHRvIHRoZSBzZWFyY2ggaW5wdXQgKGNyZWF0ZWQgYnkgRm9tYW50aWMgZHVyaW5nIGluaXQpXG4gICAgICAgIC8vIGluc3RlYWQgb2YgdXNpbmcgb25IaWRlLCB3aGljaCBkZXBlbmRzIG9uIGFuaW1hdGlvbiBzdGF0ZS5cbiAgICAgICAgaWYgKGNvbmZpZy5hbGxvd0FkZGl0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgJHNlYXJjaElucHV0ID0gJGRyb3Bkb3duLmZpbmQoJ2lucHV0LnNlYXJjaCcpO1xuICAgICAgICAgICAgaWYgKCRzZWFyY2hJbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkc2VhcmNoSW5wdXQub24oJ2JsdXIuZGRiQWRkaXRpb25zJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkc2kgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAvLyBEZWxheSB0byBsZXQgRm9tYW50aWMgcHJvY2VzcyBtZW51IGl0ZW0gY2xpY2tzIGZpcnN0LlxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB1c2VyIHNlbGVjdGVkIGZyb20gbWVudSwgRm9tYW50aWMgY2xlYXJzIHNlYXJjaCBpbnB1dFxuICAgICAgICAgICAgICAgICAgICAvLyBiZWZvcmUgb3VyIHRpbWVvdXQgZmlyZXMsIHNvIHNlYXJjaFRleHQgd2lsbCBiZSBlbXB0eS5cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hUZXh0ID0gJHNpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWFyY2hUZXh0ICYmIHNlYXJjaFRleHQgIT09ICRoaWRkZW5JbnB1dC52YWwoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwoc2VhcmNoVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGhpZGRlbklucHV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb25maWcub25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHNlYXJjaFRleHQsIHNlYXJjaFRleHQsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24uZmluZCgnPiAudGV4dCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuZXNjYXBlSHRtbChzZWFyY2hUZXh0KSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNpLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIDE1MCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgc2VsZWN0ZWQgdmFsdWUgZm9yIHN0YXRpYyBvcHRpb25zIGFmdGVyIGluaXRpYWxpemF0aW9uXG4gICAgICAgIGlmIChjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGhpZGRlbklucHV0LnZhbCgpO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBkcm9wZG93biBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfSwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IEFQSSByZXNwb25zZSBoYW5kbGVyIGZvciBNaWtvUEJYIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IEZvbWFudGljIFVJIGNvbXBhdGlibGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBkZWZhdWx0UmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmICgocmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlLnN1Y2Nlc3MpICYmIHJlc3BvbnNlLmRhdGEgJiYgQXJyYXkuaXNBcnJheShyZXNwb25zZS5kYXRhKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlc3VsdHM6IHJlc3BvbnNlLmRhdGEubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByYXdUZXh0ID0gaXRlbS5yZXByZXNlbnQgfHwgaXRlbS5uYW1lIHx8IGl0ZW0udGV4dDtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgZGlzcGxheSB0ZXh0IHdoaWxlIHByZXNlcnZpbmcgc2FmZSBIVE1MIChpY29ucylcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgICAgICAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhyYXdUZXh0KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiByYXdUZXh0O1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHNhZmVUZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogc2FmZVRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogaXRlbS5kaXNhYmxlZCB8fCBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXN0b20gZHJvcGRvd24gbWVudSB0ZW1wbGF0ZSBmb3IgcHJvcGVyIEhUTUwgcmVuZGVyaW5nXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZmllbGRzIC0gRmllbGQgY29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgZm9yIGRyb3Bkb3duIG1lbnVcbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcblxuICAgICAgICB2YWx1ZXMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25bZmllbGRzLnZhbHVlXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBvcHRpb25bZmllbGRzLnRleHRdIHx8IG9wdGlvbltmaWVsZHMubmFtZV0gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gb3B0aW9uLmRpc2FibGVkIHx8IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBVc2UgJ2luYWN0aXZlJyBjbGFzcyBmb3IgdmlzdWFsIHN0eWxpbmcgd2l0aG91dCBibG9ja2luZyBzZWxlY3Rpb25cbiAgICAgICAgICAgIGNvbnN0IHZpc3VhbENsYXNzID0gaXNEaXNhYmxlZCA/ICcgaW5hY3RpdmUnIDogJyc7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbSR7dmlzdWFsQ2xhc3N9XCIgZGF0YS12YWx1ZT1cIiR7RHluYW1pY0Ryb3Bkb3duQnVpbGRlci5lc2NhcGVIdG1sKHZhbHVlKX1cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSB0ZXh0O1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBkcm9wZG93biB3aXRoIHN0YXRpYyBvcHRpb25zXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRkcm9wZG93biAtIERyb3Bkb3duIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBvcHRpb25zIC0gU3RhdGljIG9wdGlvbnMgYXJyYXlcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVN0YXRpY09wdGlvbnMoJGRyb3Bkb3duLCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgIFxuICAgICAgICBvcHRpb25zLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gb3B0aW9uLnZhbHVlO1xuICAgICAgICAgICAgY29uc3QgcmF3VGV4dCA9IG9wdGlvbi50ZXh0IHx8IG9wdGlvbi5uYW1lO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTYW5pdGl6ZSB2YWx1ZSBmb3IgYXR0cmlidXRlIGFuZCB0ZXh0IGZvciBkaXNwbGF5XG4gICAgICAgICAgICBjb25zdCBzYWZlVmFsdWUgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplQXR0cmlidXRlKHJhd1ZhbHVlKVxuICAgICAgICAgICAgICAgIDogdGhpcy5lc2NhcGVIdG1sKHJhd1ZhbHVlKTtcbiAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhyYXdUZXh0KVxuICAgICAgICAgICAgICAgIDogcmF3VGV4dDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke3NhZmVWYWx1ZX1cIj4ke3NhZmVUZXh0fTwvZGl2PmApO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIG11bHRpcGxlIGRyb3Bkb3ducyBmcm9tIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlncyAtIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGRcbiAgICAgKi9cbiAgICBidWlsZE11bHRpcGxlRHJvcGRvd25zKGRhdGEsIGNvbmZpZ3MpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoY29uZmlncykuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgdGhpcy5idWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnc1tmaWVsZE5hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgdmFsdWUgaW4gZXhpc3RpbmcgZHJvcGRvd25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFZhbHVlIHRvIHNldFxuICAgICAqL1xuICAgIHNldFZhbHVlKGZpZWxkTmFtZSwgdmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDdXJyZW50IHZhbHVlXG4gICAgICovXG4gICAgZ2V0VmFsdWUoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgcmV0dXJuICRkcm9wZG93bi5sZW5ndGggPyAkZHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpIDogJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciBkcm9wZG93biBzZWxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqL1xuICAgIGNsZWFyKGZpZWxkTmFtZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgdG8gcHJldmVudCBYU1NcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gZXNjYXBlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgZXNjYXBlSHRtbCh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBkaXYudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgICAgICByZXR1cm4gZGl2LmlubmVySFRNTDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IER5bmFtaWNEcm9wZG93bkJ1aWxkZXI7XG59Il19