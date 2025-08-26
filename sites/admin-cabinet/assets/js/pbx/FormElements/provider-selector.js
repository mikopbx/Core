"use strict";

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

/* global $, globalTranslate, ProvidersAPI, Form */

/**
 * ProviderSelector - Universal component for provider dropdown selection
 * 
 * Provides consistent provider selection functionality across the application:
 * - Unified initialization and configuration
 * - REST API integration for loading providers
 * - Standard field naming (providerid)
 * - Support for various dropdown behaviors
 * 
 * Usage:
 * ProviderSelector.init('#provider-dropdown', {
 *     includeNone: true,           // Show "None" option
 *     forceSelection: false,        // Require selection
 *     onChange: (value) => { ... }  // Change callback
 * });
 * 
 * @module ProviderSelector
 */
var ProviderSelector = {
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
    includeNone: true,
    // Include "None/Any" option
    forceSelection: false,
    // Force user to select a provider
    clearable: false,
    // Don't allow clearing selection
    fullTextSearch: true,
    // Enable full text search
    allowAdditions: false,
    // Don't allow custom values
    onChange: null,
    // Change callback function
    hiddenFieldId: 'providerid',
    // ID of hidden field to update
    noneText: null,
    // Text for "None" option (auto-detected)
    placeholder: null // Placeholder text (auto-detected)

  },

  /**
   * Initialize provider selector
   * 
   * @param {string|jQuery} selector - Dropdown selector or jQuery object
   * @param {object} options - Configuration options
   * @param {string} options.currentValue - Current provider ID value
   * @param {string} options.currentText - Current provider display text
   * @returns {object|null} Selector instance
   */
  init: function init(selector) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var $dropdown = $(selector);

    if ($dropdown.length === 0) {
      return null;
    } // Generate unique ID for instance


    var instanceId = $dropdown.attr('id') || Math.random().toString(36).substr(2, 9); // Check if already initialized

    if (this.instances.has(instanceId)) {
      return this.instances.get(instanceId);
    } // Merge options with defaults


    var config = _objectSpread(_objectSpread({}, this.defaults), options); // Auto-detect texts based on context


    if (!config.noneText) {
      config.noneText = this.detectNoneText($dropdown);
    }

    if (!config.placeholder) {
      config.placeholder = this.detectPlaceholder($dropdown);
    } // Create instance


    var instance = {
      id: instanceId,
      $dropdown: $dropdown,
      config: config,
      $hiddenField: $("#".concat(config.hiddenFieldId)),
      initialized: false,
      currentValue: config.currentValue || null,
      currentText: config.currentText || null
    }; // Initialize dropdown

    this.initializeDropdown(instance); // Store instance

    this.instances.set(instanceId, instance);
    return instance;
  },

  /**
   * Detect appropriate "None" text based on context
   * 
   * @param {jQuery} $dropdown - Dropdown element
   * @returns {string} Detected text
   */
  detectNoneText: function detectNoneText($dropdown) {
    // Check for incoming routes context
    if ($dropdown.closest('#incoming-route-form').length > 0) {
      return globalTranslate.ir_AnyProvider_v2 || 'Any provider';
    } // Default for outbound routes


    return globalTranslate.or_SelectProvider || 'Select provider';
  },

  /**
   * Detect appropriate placeholder text
   * 
   * @param {jQuery} $dropdown - Dropdown element
   * @returns {string} Detected text
   */
  detectPlaceholder: function detectPlaceholder($dropdown) {
    // Check existing default text
    var $defaultText = $dropdown.find('.default.text');

    if ($defaultText.length > 0) {
      return $defaultText.text();
    }

    return this.detectNoneText($dropdown);
  },

  /**
   * Initialize dropdown with provider data
   * 
   * @param {object} instance - Selector instance
   */
  initializeDropdown: function initializeDropdown(instance) {
    var $dropdown = instance.$dropdown,
        config = instance.config,
        $hiddenField = instance.$hiddenField,
        currentValue = instance.currentValue,
        currentText = instance.currentText; // Get dropdown settings from ProvidersAPI

    var apiSettings = ProvidersAPI.getDropdownSettings({
      includeNone: config.includeNone,
      forceSelection: config.forceSelection,
      onChange: function onChange(value, text, $selectedItem) {
        // Update hidden field
        if ($hiddenField.length > 0) {
          $hiddenField.val(value).trigger('change');
        } // Call custom onChange if provided


        if (typeof config.onChange === 'function') {
          config.onChange(value, text, $selectedItem);
        } // Mark form as changed if Form object exists


        if (typeof Form !== 'undefined' && Form.dataChanged) {
          Form.dataChanged();
        }
      }
    }); // Apply additional settings

    var dropdownSettings = _objectSpread(_objectSpread({}, apiSettings), {}, {
      clearable: config.clearable,
      fullTextSearch: config.fullTextSearch,
      allowAdditions: config.allowAdditions,
      placeholder: config.placeholder
    }); // Clear any existing initialization


    $dropdown.dropdown('destroy'); // If we have initial value and text, pre-populate the dropdown

    if (currentValue && currentText) {
      // Set the hidden field value
      if ($hiddenField.length > 0) {
        $hiddenField.val(currentValue);
      } // Create initial option in the dropdown


      var $menu = $dropdown.find('.menu');

      if ($menu.length === 0) {
        $dropdown.append('<div class="menu"></div>');
      } // Add the current provider as an option


      $dropdown.find('.menu').html("<div class=\"item\" data-value=\"".concat(currentValue, "\">").concat(currentText, "</div>")); // Set the display text

      var $defaultText = $dropdown.find('.default.text');

      if ($defaultText.length > 0) {
        $defaultText.removeClass('default').html(currentText);
      } else {
        $dropdown.prepend("<div class=\"text\">".concat(currentText, "</div>"));
      }
    } // Initialize dropdown with lazy loading - data will be loaded on first interaction


    $dropdown.dropdown(_objectSpread(_objectSpread({}, dropdownSettings), {}, {
      apiSettings: _objectSpread(_objectSpread({}, dropdownSettings.apiSettings), {}, {
        cache: false,
        // No caching - always get fresh data
        throttle: 0 // Load immediately on interaction

      })
    })); // If we have a value, mark it as selected

    if (currentValue) {
      $dropdown.dropdown('set selected', currentValue, null, true); // Last param = preventChangeTrigger
    }

    instance.initialized = true;
  },

  /**
   * Refresh provider list for a selector
   * 
   * @param {string} instanceId - Instance ID
   */
  refresh: function refresh(instanceId) {
    var instance = this.instances.get(instanceId);

    if (!instance) {
      return;
    } // Clear cache and reinitialize


    instance.$dropdown.dropdown('clear');
    this.initializeDropdown(instance);
  },

  /**
   * Set value for a selector
   * 
   * @param {string} instanceId - Instance ID
   * @param {string} value - Provider ID to select
   */
  setValue: function setValue(instanceId, value) {
    var instance = this.instances.get(instanceId);

    if (!instance) {
      return;
    }

    instance.$dropdown.dropdown('set selected', value);

    if (instance.$hiddenField.length > 0) {
      instance.$hiddenField.val(value).trigger('change');
    }
  },

  /**
   * Get value from a selector
   * 
   * @param {string} instanceId - Instance ID
   * @returns {string|null} Selected provider ID
   */
  getValue: function getValue(instanceId) {
    var instance = this.instances.get(instanceId);

    if (!instance) {
      return null;
    }

    return instance.$dropdown.dropdown('get value') || null;
  },

  /**
   * Clear selection
   * 
   * @param {string} instanceId - Instance ID
   */
  clear: function clear(instanceId) {
    var instance = this.instances.get(instanceId);

    if (!instance) {
      return;
    }

    instance.$dropdown.dropdown('clear');

    if (instance.$hiddenField.length > 0) {
      instance.$hiddenField.val('').trigger('change');
    }
  },

  /**
   * Destroy selector instance
   * 
   * @param {string} instanceId - Instance ID
   */
  destroy: function destroy(instanceId) {
    var instance = this.instances.get(instanceId);

    if (!instance) {
      return;
    }

    instance.$dropdown.dropdown('destroy');
    this.instances["delete"](instanceId);
  },

  /**
   * Initialize all provider selectors on the page
   * 
   * @param {string} containerSelector - Container to search within
   */
  initializeAll: function initializeAll() {
    var _this = this;

    var containerSelector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'body';
    var $container = $(containerSelector); // Find all provider dropdowns

    $container.find('#providerid-dropdown').each(function (index, element) {
      var $dropdown = $(element); // Skip if already initialized

      if ($dropdown.data('provider-selector-initialized')) {
        return;
      } // Initialize with standard field ID


      _this.init($dropdown, {
        hiddenFieldId: 'providerid'
      }); // Mark as initialized


      $dropdown.data('provider-selector-initialized', true);
    });
  }
}; // Export for use in other modules

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProviderSelector;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvcHJvdmlkZXItc2VsZWN0b3IuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJTZWxlY3RvciIsImluc3RhbmNlcyIsIk1hcCIsImRlZmF1bHRzIiwiaW5jbHVkZU5vbmUiLCJmb3JjZVNlbGVjdGlvbiIsImNsZWFyYWJsZSIsImZ1bGxUZXh0U2VhcmNoIiwiYWxsb3dBZGRpdGlvbnMiLCJvbkNoYW5nZSIsImhpZGRlbkZpZWxkSWQiLCJub25lVGV4dCIsInBsYWNlaG9sZGVyIiwiaW5pdCIsInNlbGVjdG9yIiwib3B0aW9ucyIsIiRkcm9wZG93biIsIiQiLCJsZW5ndGgiLCJpbnN0YW5jZUlkIiwiYXR0ciIsIk1hdGgiLCJyYW5kb20iLCJ0b1N0cmluZyIsInN1YnN0ciIsImhhcyIsImdldCIsImNvbmZpZyIsImRldGVjdE5vbmVUZXh0IiwiZGV0ZWN0UGxhY2Vob2xkZXIiLCJpbnN0YW5jZSIsImlkIiwiJGhpZGRlbkZpZWxkIiwiaW5pdGlhbGl6ZWQiLCJjdXJyZW50VmFsdWUiLCJjdXJyZW50VGV4dCIsImluaXRpYWxpemVEcm9wZG93biIsInNldCIsImNsb3Nlc3QiLCJnbG9iYWxUcmFuc2xhdGUiLCJpcl9BbnlQcm92aWRlcl92MiIsIm9yX1NlbGVjdFByb3ZpZGVyIiwiJGRlZmF1bHRUZXh0IiwiZmluZCIsInRleHQiLCJhcGlTZXR0aW5ncyIsIlByb3ZpZGVyc0FQSSIsImdldERyb3Bkb3duU2V0dGluZ3MiLCJ2YWx1ZSIsIiRzZWxlY3RlZEl0ZW0iLCJ2YWwiLCJ0cmlnZ2VyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiZHJvcGRvd25TZXR0aW5ncyIsImRyb3Bkb3duIiwiJG1lbnUiLCJhcHBlbmQiLCJodG1sIiwicmVtb3ZlQ2xhc3MiLCJwcmVwZW5kIiwiY2FjaGUiLCJ0aHJvdHRsZSIsInJlZnJlc2giLCJzZXRWYWx1ZSIsImdldFZhbHVlIiwiY2xlYXIiLCJkZXN0cm95IiwiaW5pdGlhbGl6ZUFsbCIsImNvbnRhaW5lclNlbGVjdG9yIiwiJGNvbnRhaW5lciIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCJkYXRhIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGdCQUFnQixHQUFHO0FBRXJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQUFJQyxHQUFKLEVBTlU7O0FBUXJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRTtBQUNOQyxJQUFBQSxXQUFXLEVBQUUsSUFEUDtBQUNvQjtBQUMxQkMsSUFBQUEsY0FBYyxFQUFFLEtBRlY7QUFFb0I7QUFDMUJDLElBQUFBLFNBQVMsRUFBRSxLQUhMO0FBR29CO0FBQzFCQyxJQUFBQSxjQUFjLEVBQUUsSUFKVjtBQUlvQjtBQUMxQkMsSUFBQUEsY0FBYyxFQUFFLEtBTFY7QUFLb0I7QUFDMUJDLElBQUFBLFFBQVEsRUFBRSxJQU5KO0FBTW9CO0FBQzFCQyxJQUFBQSxhQUFhLEVBQUUsWUFQVDtBQU91QjtBQUM3QkMsSUFBQUEsUUFBUSxFQUFFLElBUko7QUFRb0I7QUFDMUJDLElBQUFBLFdBQVcsRUFBRSxJQVRQLENBU29COztBQVRwQixHQVpXOztBQXdCckI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLElBakNxQixnQkFpQ2hCQyxRQWpDZ0IsRUFpQ1E7QUFBQSxRQUFkQyxPQUFjLHVFQUFKLEVBQUk7QUFDekIsUUFBTUMsU0FBUyxHQUFHQyxDQUFDLENBQUNILFFBQUQsQ0FBbkI7O0FBQ0EsUUFBSUUs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QTRCLFNBQTVCO0FBQ0EsU0FBS3RELFNBQUwsV0FBc0JrQixVQUF0QjtBQUNILEdBbFJvQjs7QUFvUnJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWlELEVBQUFBLGFBelJxQiwyQkF5UnFCO0FBQUE7O0FBQUEsUUFBNUJDLGlCQUE0Qix1RUFBUixNQUFRO0FBQ3RDLFFBQU1DLFVBQVUsR0FBR3JELENBQUMsQ0FBQ29ELGlCQUFELENBQXBCLENBRHNDLENBR3RDOztBQUNBQyxJQUFBQSxVQUFVLENBQUMzQixJQUFYLENBQWdCLHNCQUFoQixFQUF3QzRCLElBQXhDLENBQTZDLFVBQUNDLEtBQUQsRUFBUUMsT0FBUixFQUFvQjtBQUM3RCxVQUFNekQsU0FBUyxHQUFHQyxDQUFDLENBQUN3RCxPQUFELENBQW5CLENBRDZELENBRzdEOztBQUNBLFVBQUl6RCxTQUFTLENBQUMwRCxJQUFWLENBQWUsK0JBQWYsQ0FBSixFQUFxRDtBQUNqRDtBQUNILE9BTjRELENBUTdEOzs7QUFDQSxNQUFBLEtBQUksQ0FBQzdELElBQUwsQ0FBVUcsU0FBVixFQUFxQjtBQUNqQk4sUUFBQUEsYUFBYSxFQUFFO0FBREUsT0FBckIsRUFUNkQsQ0FhN0Q7OztBQUNBTSxNQUFBQSxTQUFTLENBQUMwRCxJQUFWLENBQWUsK0JBQWYsRUFBZ0QsSUFBaEQ7QUFDSCxLQWZEO0FBZ0JIO0FBN1NvQixDQUF6QixDLENBZ1RBOztBQUNBLElBQUksT0FBT0MsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCNUUsZ0JBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgZ2xvYmFsVHJhbnNsYXRlLCBQcm92aWRlcnNBUEksIEZvcm0gKi9cblxuLyoqXG4gKiBQcm92aWRlclNlbGVjdG9yIC0gVW5pdmVyc2FsIGNvbXBvbmVudCBmb3IgcHJvdmlkZXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gKiBcbiAqIFByb3ZpZGVzIGNvbnNpc3RlbnQgcHJvdmlkZXIgc2VsZWN0aW9uIGZ1bmN0aW9uYWxpdHkgYWNyb3NzIHRoZSBhcHBsaWNhdGlvbjpcbiAqIC0gVW5pZmllZCBpbml0aWFsaXphdGlvbiBhbmQgY29uZmlndXJhdGlvblxuICogLSBSRVNUIEFQSSBpbnRlZ3JhdGlvbiBmb3IgbG9hZGluZyBwcm92aWRlcnNcbiAqIC0gU3RhbmRhcmQgZmllbGQgbmFtaW5nIChwcm92aWRlcmlkKVxuICogLSBTdXBwb3J0IGZvciB2YXJpb3VzIGRyb3Bkb3duIGJlaGF2aW9yc1xuICogXG4gKiBVc2FnZTpcbiAqIFByb3ZpZGVyU2VsZWN0b3IuaW5pdCgnI3Byb3ZpZGVyLWRyb3Bkb3duJywge1xuICogICAgIGluY2x1ZGVOb25lOiB0cnVlLCAgICAgICAgICAgLy8gU2hvdyBcIk5vbmVcIiBvcHRpb25cbiAqICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsICAgICAgICAvLyBSZXF1aXJlIHNlbGVjdGlvblxuICogICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHsgLi4uIH0gIC8vIENoYW5nZSBjYWxsYmFja1xuICogfSk7XG4gKiBcbiAqIEBtb2R1bGUgUHJvdmlkZXJTZWxlY3RvclxuICovXG5jb25zdCBQcm92aWRlclNlbGVjdG9yID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEFjdGl2ZSBzZWxlY3RvciBpbnN0YW5jZXNcbiAgICAgKiBAdHlwZSB7TWFwfVxuICAgICAqL1xuICAgIGluc3RhbmNlczogbmV3IE1hcCgpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgaW5jbHVkZU5vbmU6IHRydWUsICAgICAgICAvLyBJbmNsdWRlIFwiTm9uZS9BbnlcIiBvcHRpb25cbiAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLCAgICAvLyBGb3JjZSB1c2VyIHRvIHNlbGVjdCBhIHByb3ZpZGVyXG4gICAgICAgIGNsZWFyYWJsZTogZmFsc2UsICAgICAgICAgLy8gRG9uJ3QgYWxsb3cgY2xlYXJpbmcgc2VsZWN0aW9uXG4gICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLCAgICAgLy8gRW5hYmxlIGZ1bGwgdGV4dCBzZWFyY2hcbiAgICAgICAgYWxsb3dBZGRpdGlvbnM6IGZhbHNlLCAgICAvLyBEb24ndCBhbGxvdyBjdXN0b20gdmFsdWVzXG4gICAgICAgIG9uQ2hhbmdlOiBudWxsLCAgICAgICAgICAgLy8gQ2hhbmdlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgIGhpZGRlbkZpZWxkSWQ6ICdwcm92aWRlcmlkJywgLy8gSUQgb2YgaGlkZGVuIGZpZWxkIHRvIHVwZGF0ZVxuICAgICAgICBub25lVGV4dDogbnVsbCwgICAgICAgICAgIC8vIFRleHQgZm9yIFwiTm9uZVwiIG9wdGlvbiAoYXV0by1kZXRlY3RlZClcbiAgICAgICAgcGxhY2Vob2xkZXI6IG51bGwsICAgICAgICAvLyBQbGFjZWhvbGRlciB0ZXh0IChhdXRvLWRldGVjdGVkKVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwcm92aWRlciBzZWxlY3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGpRdWVyeX0gc2VsZWN0b3IgLSBEcm9wZG93biBzZWxlY3RvciBvciBqUXVlcnkgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5jdXJyZW50VmFsdWUgLSBDdXJyZW50IHByb3ZpZGVyIElEIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMuY3VycmVudFRleHQgLSBDdXJyZW50IHByb3ZpZGVyIGRpc3BsYXkgdGV4dFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R8bnVsbH0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0KHNlbGVjdG9yLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChzZWxlY3Rvcik7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2VuZXJhdGUgdW5pcXVlIElEIGZvciBpbnN0YW5jZVxuICAgICAgICBjb25zdCBpbnN0YW5jZUlkID0gJGRyb3Bkb3duLmF0dHIoJ2lkJykgfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbml0aWFsaXplZFxuICAgICAgICBpZiAodGhpcy5pbnN0YW5jZXMuaGFzKGluc3RhbmNlSWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlSWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNZXJnZSBvcHRpb25zIHdpdGggZGVmYXVsdHNcbiAgICAgICAgY29uc3QgY29uZmlnID0geyAuLi50aGlzLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLWRldGVjdCB0ZXh0cyBiYXNlZCBvbiBjb250ZXh0XG4gICAgICAgIGlmICghY29uZmlnLm5vbmVUZXh0KSB7XG4gICAgICAgICAgICBjb25maWcubm9uZVRleHQgPSB0aGlzLmRldGVjdE5vbmVUZXh0KCRkcm9wZG93bik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb25maWcucGxhY2Vob2xkZXIpIHtcbiAgICAgICAgICAgIGNvbmZpZy5wbGFjZWhvbGRlciA9IHRoaXMuZGV0ZWN0UGxhY2Vob2xkZXIoJGRyb3Bkb3duKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGluc3RhbmNlXG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0ge1xuICAgICAgICAgICAgaWQ6IGluc3RhbmNlSWQsXG4gICAgICAgICAgICAkZHJvcGRvd24sXG4gICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICAkaGlkZGVuRmllbGQ6ICQoYCMke2NvbmZpZy5oaWRkZW5GaWVsZElkfWApLFxuICAgICAgICAgICAgaW5pdGlhbGl6ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgY3VycmVudFZhbHVlOiBjb25maWcuY3VycmVudFZhbHVlIHx8IG51bGwsXG4gICAgICAgICAgICBjdXJyZW50VGV4dDogY29uZmlnLmN1cnJlbnRUZXh0IHx8IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHJvcGRvd24oaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuc2V0KGluc3RhbmNlSWQsIGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERldGVjdCBhcHByb3ByaWF0ZSBcIk5vbmVcIiB0ZXh0IGJhc2VkIG9uIGNvbnRleHRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGRyb3Bkb3duIC0gRHJvcGRvd24gZWxlbWVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IERldGVjdGVkIHRleHRcbiAgICAgKi9cbiAgICBkZXRlY3ROb25lVGV4dCgkZHJvcGRvd24pIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGluY29taW5nIHJvdXRlcyBjb250ZXh0XG4gICAgICAgIGlmICgkZHJvcGRvd24uY2xvc2VzdCgnI2luY29taW5nLXJvdXRlLWZvcm0nKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLmlyX0FueVByb3ZpZGVyX3YyIHx8ICdBbnkgcHJvdmlkZXInO1xuICAgICAgICB9XG4gICAgICAgIC8vIERlZmF1bHQgZm9yIG91dGJvdW5kIHJvdXRlc1xuICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLm9yX1NlbGVjdFByb3ZpZGVyIHx8ICdTZWxlY3QgcHJvdmlkZXInO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGV0ZWN0IGFwcHJvcHJpYXRlIHBsYWNlaG9sZGVyIHRleHRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGRyb3Bkb3duIC0gRHJvcGRvd24gZWxlbWVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IERldGVjdGVkIHRleHRcbiAgICAgKi9cbiAgICBkZXRlY3RQbGFjZWhvbGRlcigkZHJvcGRvd24pIHtcbiAgICAgICAgLy8gQ2hlY2sgZXhpc3RpbmcgZGVmYXVsdCB0ZXh0XG4gICAgICAgIGNvbnN0ICRkZWZhdWx0VGV4dCA9ICRkcm9wZG93bi5maW5kKCcuZGVmYXVsdC50ZXh0Jyk7XG4gICAgICAgIGlmICgkZGVmYXVsdFRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuICRkZWZhdWx0VGV4dC50ZXh0KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZGV0ZWN0Tm9uZVRleHQoJGRyb3Bkb3duKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBwcm92aWRlciBkYXRhXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZHJvcGRvd24sIGNvbmZpZywgJGhpZGRlbkZpZWxkLCBjdXJyZW50VmFsdWUsIGN1cnJlbnRUZXh0IH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBkcm9wZG93biBzZXR0aW5ncyBmcm9tIFByb3ZpZGVyc0FQSVxuICAgICAgICBjb25zdCBhcGlTZXR0aW5ncyA9IFByb3ZpZGVyc0FQSS5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIGluY2x1ZGVOb25lOiBjb25maWcuaW5jbHVkZU5vbmUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogY29uZmlnLmZvcmNlU2VsZWN0aW9uLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCwgJHNlbGVjdGVkSXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gZmllbGRcbiAgICAgICAgICAgICAgICBpZiAoJGhpZGRlbkZpZWxkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJGhpZGRlbkZpZWxkLnZhbCh2YWx1ZSkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENhbGwgY3VzdG9tIG9uQ2hhbmdlIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub25DaGFuZ2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkc2VsZWN0ZWRJdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgaWYgRm9ybSBvYmplY3QgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgYWRkaXRpb25hbCBzZXR0aW5nc1xuICAgICAgICBjb25zdCBkcm9wZG93blNldHRpbmdzID0ge1xuICAgICAgICAgICAgLi4uYXBpU2V0dGluZ3MsXG4gICAgICAgICAgICBjbGVhcmFibGU6IGNvbmZpZy5jbGVhcmFibGUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogY29uZmlnLmZ1bGxUZXh0U2VhcmNoLFxuICAgICAgICAgICAgYWxsb3dBZGRpdGlvbnM6IGNvbmZpZy5hbGxvd0FkZGl0aW9ucyxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBjb25maWcucGxhY2Vob2xkZXIsXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdkZXN0cm95Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGluaXRpYWwgdmFsdWUgYW5kIHRleHQsIHByZS1wb3B1bGF0ZSB0aGUgZHJvcGRvd25cbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiBjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgLy8gU2V0IHRoZSBoaWRkZW4gZmllbGQgdmFsdWVcbiAgICAgICAgICAgIGlmICgkaGlkZGVuRmllbGQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRoaWRkZW5GaWVsZC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIGluaXRpYWwgb3B0aW9uIGluIHRoZSBkcm9wZG93blxuICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgICAgIGlmICgkbWVudS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uYXBwZW5kKCc8ZGl2IGNsYXNzPVwibWVudVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgdGhlIGN1cnJlbnQgcHJvdmlkZXIgYXMgYW4gb3B0aW9uXG4gICAgICAgICAgICAkZHJvcGRvd24uZmluZCgnLm1lbnUnKS5odG1sKFxuICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIj4ke2N1cnJlbnRUZXh0fTwvZGl2PmBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCB0aGUgZGlzcGxheSB0ZXh0XG4gICAgICAgICAgICBjb25zdCAkZGVmYXVsdFRleHQgPSAkZHJvcGRvd24uZmluZCgnLmRlZmF1bHQudGV4dCcpO1xuICAgICAgICAgICAgaWYgKCRkZWZhdWx0VGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGRlZmF1bHRUZXh0LnJlbW92ZUNsYXNzKCdkZWZhdWx0JykuaHRtbChjdXJyZW50VGV4dCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5wcmVwZW5kKGA8ZGl2IGNsYXNzPVwidGV4dFwiPiR7Y3VycmVudFRleHR9PC9kaXY+YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBsYXp5IGxvYWRpbmcgLSBkYXRhIHdpbGwgYmUgbG9hZGVkIG9uIGZpcnN0IGludGVyYWN0aW9uXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAuLi5kcm9wZG93blNldHRpbmdzLFxuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICAuLi5kcm9wZG93blNldHRpbmdzLmFwaVNldHRpbmdzLFxuICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSwgIC8vIE5vIGNhY2hpbmcgLSBhbHdheXMgZ2V0IGZyZXNoIGRhdGFcbiAgICAgICAgICAgICAgICB0aHJvdHRsZTogMCAgICAvLyBMb2FkIGltbWVkaWF0ZWx5IG9uIGludGVyYWN0aW9uXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIHZhbHVlLCBtYXJrIGl0IGFzIHNlbGVjdGVkXG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlLCBudWxsLCB0cnVlKTsgIC8vIExhc3QgcGFyYW0gPSBwcmV2ZW50Q2hhbmdlVHJpZ2dlclxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpbnN0YW5jZS5pbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIHByb3ZpZGVyIGxpc3QgZm9yIGEgc2VsZWN0b3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW5zdGFuY2VJZCAtIEluc3RhbmNlIElEXG4gICAgICovXG4gICAgcmVmcmVzaChpbnN0YW5jZUlkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGNhY2hlIGFuZCByZWluaXRpYWxpemVcbiAgICAgICAgaW5zdGFuY2UuJGRyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihpbnN0YW5jZSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgdmFsdWUgZm9yIGEgc2VsZWN0b3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW5zdGFuY2VJZCAtIEluc3RhbmNlIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gUHJvdmlkZXIgSUQgdG8gc2VsZWN0XG4gICAgICovXG4gICAgc2V0VmFsdWUoaW5zdGFuY2VJZCwgdmFsdWUpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaW5zdGFuY2UuJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS4kaGlkZGVuRmllbGQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuJGhpZGRlbkZpZWxkLnZhbCh2YWx1ZSkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCB2YWx1ZSBmcm9tIGEgc2VsZWN0b3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW5zdGFuY2VJZCAtIEluc3RhbmNlIElEXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBTZWxlY3RlZCBwcm92aWRlciBJRFxuICAgICAqL1xuICAgIGdldFZhbHVlKGluc3RhbmNlSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaW5zdGFuY2UuJGRyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKSB8fCBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgc2VsZWN0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGluc3RhbmNlSWQgLSBJbnN0YW5jZSBJRFxuICAgICAqL1xuICAgIGNsZWFyKGluc3RhbmNlSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaW5zdGFuY2UuJGRyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuJGhpZGRlbkZpZWxkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLiRoaWRkZW5GaWVsZC52YWwoJycpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IHNlbGVjdG9yIGluc3RhbmNlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGluc3RhbmNlSWQgLSBJbnN0YW5jZSBJRFxuICAgICAqL1xuICAgIGRlc3Ryb3koaW5zdGFuY2VJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZUlkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpbnN0YW5jZS4kZHJvcGRvd24uZHJvcGRvd24oJ2Rlc3Ryb3knKTtcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZGVsZXRlKGluc3RhbmNlSWQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgcHJvdmlkZXIgc2VsZWN0b3JzIG9uIHRoZSBwYWdlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRhaW5lclNlbGVjdG9yIC0gQ29udGFpbmVyIHRvIHNlYXJjaCB3aXRoaW5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWxsKGNvbnRhaW5lclNlbGVjdG9yID0gJ2JvZHknKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkKGNvbnRhaW5lclNlbGVjdG9yKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgYWxsIHByb3ZpZGVyIGRyb3Bkb3duc1xuICAgICAgICAkY29udGFpbmVyLmZpbmQoJyNwcm92aWRlcmlkLWRyb3Bkb3duJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNraXAgaWYgYWxyZWFkeSBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5kYXRhKCdwcm92aWRlci1zZWxlY3Rvci1pbml0aWFsaXplZCcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgZmllbGQgSURcbiAgICAgICAgICAgIHRoaXMuaW5pdCgkZHJvcGRvd24sIHtcbiAgICAgICAgICAgICAgICBoaWRkZW5GaWVsZElkOiAncHJvdmlkZXJpZCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBNYXJrIGFzIGluaXRpYWxpemVkXG4gICAgICAgICAgICAkZHJvcGRvd24uZGF0YSgncHJvdmlkZXItc2VsZWN0b3ItaW5pdGlhbGl6ZWQnLCB0cnVlKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBQcm92aWRlclNlbGVjdG9yO1xufSJdfQ==