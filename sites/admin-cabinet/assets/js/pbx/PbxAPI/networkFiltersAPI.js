"use strict";

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

/* global globalRootUrl, PbxApi */

/**
 * NetworkFiltersAPI module for working with network filters.
 * 
 * @module NetworkFiltersAPI
 */
var NetworkFiltersAPI = {
  /**
   * Get all network filters for dropdown select (simplified)
   * 
   * @param {Function} callback - Callback function
   */
  getNetworksForSelect: function getNetworksForSelect(callback) {
    var url = "".concat(globalRootUrl, "pbxcore/api/v2/network-filters/getNetworksForSelect");
    $.api({
      url: url,
      on: 'now',
      method: 'GET',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure(response) {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Get network filters for dropdown select
   * 
   * @param {Function} callback - Callback function
   * @param {Array|string} categories - Filter categories (default: ['SIP'])
   */
  getForSelect: function getForSelect(callback) {
    var categories = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ['SIP'];
    var url = "".concat(globalRootUrl, "pbxcore/api/v2/network-filters/getForSelect");
    $.api({
      url: url,
      on: 'now',
      method: 'GET',
      data: {
        categories: categories
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure(response) {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Get network filters allowed for providers
   * 
   * @param {Function} callback - Callback function
   * @param {Array|string} categories - Filter categories (default: ['SIP'])
   */
  getAllowedForProviders: function getAllowedForProviders(callback) {
    var categories = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ['SIP'];
    var url = "/pbxcore/api/v2/network-filters/getAllowedForProviders";
    $.api({
      url: url,
      on: 'now',
      method: 'POST',
      data: {
        categories: Array.isArray(categories) ? categories : [categories]
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure(response) {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Get dropdown settings for Semantic UI dropdown (simplified)
   * 
   * @param {Function} onChange - On change callback
   * @returns {Object} Dropdown settings
   */
  getDropdownSettings: function getDropdownSettings() {
    var onChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return {
      apiSettings: {
        url: "".concat(globalRootUrl, "pbxcore/api/v2/network-filters/getNetworksForSelect"),
        cache: true,
        throttle: 400,
        successTest: function successTest(response) {
          return response && response.result === true;
        },
        onResponse: function onResponse(response) {
          if (!response || !response.data) {
            return {
              success: false,
              results: []
            };
          }

          var results = response.data.map(function (filter) {
            return {
              value: filter.value,
              name: filter.name,
              text: filter.text
            };
          });
          return {
            success: true,
            results: results
          };
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: false,
      saveRemoteData: true,
      forceSelection: false,
      direction: 'downward',
      hideDividers: 'empty',
      onChange: onChange
    };
  },

  /**
   * Initialize network filter dropdown
   * 
   * @param {jQuery|string} selector - Dropdown selector or jQuery element
   * @param {Object} options - Configuration options
   * @param {string} options.currentValue - Current selected value
   * @param {Array|string} options.categories - Filter categories (default: ['SIP'])
   * @param {string} options.providerType - Provider type ('SIP' or 'IAX')
   * @param {Function} options.onChange - On change callback
   * @returns {jQuery} Initialized dropdown element
   */
  initializeDropdown: function initializeDropdown(selector) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var $element = typeof selector === 'string' ? $(selector) : selector;
    if (!$element || $element.length === 0) return $element; // Default options

    var settings = {
      currentValue: options.currentValue || 'none',
      categories: options.categories || (options.providerType === 'IAX' ? ['IAX'] : ['SIP']),
      onChange: options.onChange || null
    }; // If it's a select element, work with it directly

    var $dropdown = $element; // Show loading state

    $dropdown.addClass('loading'); // Initialize dropdown with basic settings

    var dropdownSettings = {
      forceSelection: false,
      direction: 'downward',
      onChange: function onChange(value) {
        // Make sure the select element value is updated
        if ($dropdown.is('select')) {
          $dropdown.val(value);
        } // Call custom onChange if provided


        if (typeof settings.onChange === 'function') {
          settings.onChange(value);
        }
      }
    }; // Initialize dropdown - this will convert select to Semantic UI dropdown

    $dropdown.dropdown(dropdownSettings); // Load and populate data

    this.getAllowedForProviders(function (data) {
      if (!data) {
        console.warn('Failed to load network filters'); // Set default "none" option if API fails

        _this.setDefaultOption($dropdown, settings.currentValue);
      } else {
        // Populate dropdown
        _this.populateDropdown($dropdown, data, settings.currentValue);
      } // Always remove loading class after processing


      $dropdown.removeClass('loading'); // Also remove from parent dropdown wrapper if exists

      if ($dropdown.parent().hasClass('ui') && $dropdown.parent().hasClass('dropdown')) {
        $dropdown.parent().removeClass('loading');
      }
    }, settings.categories);
    return $dropdown;
  },

  /**
   * Populate dropdown with data
   * 
   * @param {jQuery} $dropdown - Dropdown element
   * @param {Array} data - Options data
   * @param {string} currentValue - Value to select
   */
  populateDropdown: function populateDropdown($dropdown, data, currentValue) {
    if (!$dropdown || $dropdown.length === 0 || !Array.isArray(data)) return; // Always work with the original select element

    var $select = $dropdown.is('select') ? $dropdown : $dropdown.find('select');

    if ($select.length > 0) {
      // Clear existing options
      $select.empty(); // Add options from API data

      data.forEach(function (filter) {
        $select.append("<option value=\"".concat(filter.value, "\">").concat(filter.text || filter.name, "</option>"));
      }); // Set current value on the select element

      if (currentValue && $select.find("option[value=\"".concat(currentValue, "\"]")).length > 0) {
        $select.val(currentValue);
      } // If this is a Semantic UI dropdown, refresh it to show the new options


      if ($dropdown.hasClass('ui') && $dropdown.hasClass('dropdown')) {
        $dropdown.dropdown('refresh');

        if (currentValue) {
          $dropdown.dropdown('set selected', currentValue);
        }
      }
    } else {
      // Fallback for pure Semantic UI dropdowns without select element
      var $menu = $dropdown.find('.menu');
      $menu.empty();
      data.forEach(function (filter) {
        $menu.append("<div class=\"item\" data-value=\"".concat(filter.value, "\">").concat(filter.text || filter.name, "</div>"));
      }); // Refresh dropdown

      $dropdown.dropdown('refresh'); // Set current value

      if (currentValue) {
        $dropdown.dropdown('set selected', currentValue);
      }
    }
  },

  /**
   * Set default "none" option when API fails
   * 
   * @param {jQuery} $dropdown - Dropdown element
   * @param {string} currentValue - Current value
   */
  setDefaultOption: function setDefaultOption($dropdown, currentValue) {
    var noneText = globalTranslate.ex_NoNetworkFilter || 'None';
    var valueToSet = currentValue || 'none'; // Always work with the original select element

    var $select = $dropdown.is('select') ? $dropdown : $dropdown.find('select');

    if ($select.length > 0) {
      // Add default option to select element
      $select.empty().append("<option value=\"none\">".concat(noneText, "</option>"));
      $select.val(valueToSet); // If this is a Semantic UI dropdown, refresh it

      if ($dropdown.hasClass('ui') && $dropdown.hasClass('dropdown')) {
        $dropdown.dropdown('refresh');
        $dropdown.dropdown('set selected', valueToSet);
      }
    } else {
      // Fallback for pure Semantic UI dropdowns
      var $menu = $dropdown.find('.menu');
      $menu.empty().append("<div class=\"item\" data-value=\"none\">".concat(noneText, "</div>"));
      $dropdown.dropdown('refresh');
      $dropdown.dropdown('set selected', valueToSet);
    }
  }
}; // Export as part of window object for use in other modules

window.NetworkFiltersAPI = NetworkFiltersAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvbmV0d29ya0ZpbHRlcnNBUEkuanMiXSwibmFtZXMiOlsiTmV0d29ya0ZpbHRlcnNBUEkiLCJnZXROZXR3b3Jrc0ZvclNlbGVjdCIsImNhbGxiYWNrIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIiQiLCJhcGkiLCJvbiIsIm1ldGhvZCIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJkYXRhIiwib25GYWlsdXJlIiwib25FcnJvciIsImdldEZvclNlbGVjdCIsImNhdGVnb3JpZXMiLCJnZXRBbGxvd2VkRm9yUHJvdmlkZXJzIiwiQXJyYXkiLCJpc0FycmF5IiwiZ2V0RHJvcGRvd25TZXR0aW5ncyIsIm9uQ2hhbmdlIiwiYXBpU2V0dGluZ3MiLCJjYWNoZSIsInRocm90dGxlIiwicmVzdWx0Iiwib25SZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwibWFwIiwiZmlsdGVyIiwidmFsdWUiLCJuYW1lIiwidGV4dCIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiZGlyZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwiaW5pdGlhbGl6ZURyb3Bkb3duIiwic2VsZWN0b3IiLCJvcHRpb25zIiwiJGVsZW1lbnQiLCJsZW5ndGgiLCJzZXR0aW5ncyIsImN1cnJlbnRWYWx1ZSIsInByb3ZpZGVyVHlwZSIsIiRkcm9wZG93biIsImFkZENsYXNzIiwiZHJvcGRvd25TZXR0aW5ncyIsImlzIiwidmFsIiwiZHJvcGRvd24iLCJjb25zb2xlIiwid2FybiIsInNldERlZmF1bHRPcHRpb24iLCJwb3B1bGF0ZURyb3Bkb3duIiwicmVtb3ZlQ2xhc3MiLCJwYXJlbnQiLCJoYXNDbGFzcyIsIiRzZWxlY3QiLCJmaW5kIiwiZW1wdHkiLCJmb3JFYWNoIiwiYXBwZW5kIiwiJG1lbnUiLCJub25lVGV4dCIsImdsb2Jh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ZSxPQUFPLEdBQUdiLFNBQVMsQ0FBQ0csRUFBVixDQUFhLFFBQWIsSUFBeUJILFNBQXpCLEdBQXFDQSxTQUFTLENBQUNjLElBQVYsQ0FBZSxRQUFmLENBQXJEOztBQUVBLFFBQUlELE9BQU8sQ0FBQ2pCLE1BQVIsR0FBaUIsQ0FBckIsRUFBd0I7QUFDcEI7QUFDQWlCLE1BQUFBLE9BQU8sQ0FBQ0UsS0FBUixHQUFnQkUsTUFBaEIsa0NBQStDRSxRQUEvQztBQUNBTixNQUFBQSxPQUFPLENBQUNULEdBQVIsQ0FBWWtCLFVBQVosRUFIb0IsQ0FLcEI7O0FBQ0EsVUFBSXRCLFNBQVMsQ0FBQ1ksUUFBVixDQUFtQixJQUFuQixLQUE0QlosU0FBUyxDQUFDWSxRQUFWLENBQW1CLFVBQW5CLENBQWhDLEVBQWdFO0FBQzVEWixRQUFBQSxTQUFTLENBQUNLLFFBQVYsQ0FBbUIsU0FBbkI7QUFDQUwsUUFBQUEsU0FBUyxDQUFDSyxRQUFWLENBQW1CLGNBQW5CLEVBQW1DaUIsVUFBbkM7QUFDSDtBQUNKLEtBVkQsTUFVTztBQUNIO0FBQ0EsVUFBTUosS0FBSyxHQUFHbEIsU0FBUyxDQUFDYyxJQUFWLENBQWUsT0FBZixDQUFkO0FBQ0FJLE1BQUFBLEtBQUssQ0FBQ0gsS0FBTixHQUFjRSxNQUFkLG1EQUE0REUsUUFBNUQ7QUFDQW5CLE1BQUFBLFNBQVMsQ0FBQ0ssUUFBVixDQUFtQixTQUFuQjtBQUNBTCxNQUFBQSxTQUFTLENBQUNLLFFBQVYsQ0FBbUIsY0FBbkIsRUFBbUNpQixVQUFuQztBQUNIO0FBQ0o7QUE3UnFCLENBQTFCLEMsQ0FnU0E7O0FBQ0FDLE1BQU0sQ0FBQ3pFLGlCQUFQLEdBQTJCQSxpQkFBM0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpICovXG5cbi8qKlxuICogTmV0d29ya0ZpbHRlcnNBUEkgbW9kdWxlIGZvciB3b3JraW5nIHdpdGggbmV0d29yayBmaWx0ZXJzLlxuICogXG4gKiBAbW9kdWxlIE5ldHdvcmtGaWx0ZXJzQVBJXG4gKi9cbmNvbnN0IE5ldHdvcmtGaWx0ZXJzQVBJID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgbmV0d29yayBmaWx0ZXJzIGZvciBkcm9wZG93biBzZWxlY3QgKHNpbXBsaWZpZWQpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldE5ldHdvcmtzRm9yU2VsZWN0KGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHVybCA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4Y29yZS9hcGkvdjIvbmV0d29yay1maWx0ZXJzL2dldE5ldHdvcmtzRm9yU2VsZWN0YDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IG5ldHdvcmsgZmlsdGVycyBmb3IgZHJvcGRvd24gc2VsZWN0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBjYXRlZ29yaWVzIC0gRmlsdGVyIGNhdGVnb3JpZXMgKGRlZmF1bHQ6IFsnU0lQJ10pXG4gICAgICovXG4gICAgZ2V0Rm9yU2VsZWN0KGNhbGxiYWNrLCBjYXRlZ29yaWVzID0gWydTSVAnXSkge1xuICAgICAgICBjb25zdCB1cmwgPSBgJHtnbG9iYWxSb290VXJsfXBieGNvcmUvYXBpL3YyL25ldHdvcmstZmlsdGVycy9nZXRGb3JTZWxlY3RgO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3JpZXNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBuZXR3b3JrIGZpbHRlcnMgYWxsb3dlZCBmb3IgcHJvdmlkZXJzXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBjYXRlZ29yaWVzIC0gRmlsdGVyIGNhdGVnb3JpZXMgKGRlZmF1bHQ6IFsnU0lQJ10pXG4gICAgICovXG4gICAgZ2V0QWxsb3dlZEZvclByb3ZpZGVycyhjYWxsYmFjaywgY2F0ZWdvcmllcyA9IFsnU0lQJ10pIHtcbiAgICAgICAgY29uc3QgdXJsID0gYC9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0QWxsb3dlZEZvclByb3ZpZGVyc2A7XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IEFycmF5LmlzQXJyYXkoY2F0ZWdvcmllcykgPyBjYXRlZ29yaWVzIDogW2NhdGVnb3JpZXNdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgZHJvcGRvd24gc2V0dGluZ3MgZm9yIFNlbWFudGljIFVJIGRyb3Bkb3duIChzaW1wbGlmaWVkKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IG9uQ2hhbmdlIC0gT24gY2hhbmdlIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge09iamVjdH0gRHJvcGRvd24gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzKG9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9cGJ4Y29yZS9hcGkvdjIvbmV0d29yay1maWx0ZXJzL2dldE5ldHdvcmtzRm9yU2VsZWN0YCxcbiAgICAgICAgICAgICAgICBjYWNoZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogW11cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSByZXNwb25zZS5kYXRhLm1hcChmaWx0ZXIgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBmaWx0ZXIudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBmaWx0ZXIubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGZpbHRlci50ZXh0XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogcmVzdWx0c1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2U6IG9uQ2hhbmdlXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duXG4gICAgICogXG4gICAgICogQHBhcmFtIHtqUXVlcnl8c3RyaW5nfSBzZWxlY3RvciAtIERyb3Bkb3duIHNlbGVjdG9yIG9yIGpRdWVyeSBlbGVtZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5jdXJyZW50VmFsdWUgLSBDdXJyZW50IHNlbGVjdGVkIHZhbHVlXG4gICAgICogQHBhcmFtIHtBcnJheXxzdHJpbmd9IG9wdGlvbnMuY2F0ZWdvcmllcyAtIEZpbHRlciBjYXRlZ29yaWVzIChkZWZhdWx0OiBbJ1NJUCddKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLnByb3ZpZGVyVHlwZSAtIFByb3ZpZGVyIHR5cGUgKCdTSVAnIG9yICdJQVgnKVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMub25DaGFuZ2UgLSBPbiBjaGFuZ2UgY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJucyB7alF1ZXJ5fSBJbml0aWFsaXplZCBkcm9wZG93biBlbGVtZW50XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duKHNlbGVjdG9yLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgY29uc3QgJGVsZW1lbnQgPSB0eXBlb2Ygc2VsZWN0b3IgPT09ICdzdHJpbmcnID8gJChzZWxlY3RvcikgOiBzZWxlY3RvcjtcbiAgICAgICAgaWYgKCEkZWxlbWVudCB8fCAkZWxlbWVudC5sZW5ndGggPT09IDApIHJldHVybiAkZWxlbWVudDtcbiAgICAgICAgXG4gICAgICAgIC8vIERlZmF1bHQgb3B0aW9uc1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZTogb3B0aW9ucy5jdXJyZW50VmFsdWUgfHwgJ25vbmUnLFxuICAgICAgICAgICAgY2F0ZWdvcmllczogb3B0aW9ucy5jYXRlZ29yaWVzIHx8IChvcHRpb25zLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcgPyBbJ0lBWCddIDogWydTSVAnXSksXG4gICAgICAgICAgICBvbkNoYW5nZTogb3B0aW9ucy5vbkNoYW5nZSB8fCBudWxsXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBpdCdzIGEgc2VsZWN0IGVsZW1lbnQsIHdvcmsgd2l0aCBpdCBkaXJlY3RseVxuICAgICAgICBsZXQgJGRyb3Bkb3duID0gJGVsZW1lbnQ7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgJGRyb3Bkb3duLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIHdpdGggYmFzaWMgc2V0dGluZ3NcbiAgICAgICAgY29uc3QgZHJvcGRvd25TZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhlIHNlbGVjdCBlbGVtZW50IHZhbHVlIGlzIHVwZGF0ZWRcbiAgICAgICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmlzKCdzZWxlY3QnKSkge1xuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24udmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FsbCBjdXN0b20gb25DaGFuZ2UgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNldHRpbmdzLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLm9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIC0gdGhpcyB3aWxsIGNvbnZlcnQgc2VsZWN0IHRvIFNlbWFudGljIFVJIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bihkcm9wZG93blNldHRpbmdzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgYW5kIHBvcHVsYXRlIGRhdGFcbiAgICAgICAgdGhpcy5nZXRBbGxvd2VkRm9yUHJvdmlkZXJzKChkYXRhKSA9PiB7XG4gICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byBsb2FkIG5ldHdvcmsgZmlsdGVycycpO1xuICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IFwibm9uZVwiIG9wdGlvbiBpZiBBUEkgZmFpbHNcbiAgICAgICAgICAgICAgICB0aGlzLnNldERlZmF1bHRPcHRpb24oJGRyb3Bkb3duLCBzZXR0aW5ncy5jdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBkcm9wZG93blxuICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVEcm9wZG93bigkZHJvcGRvd24sIGRhdGEsIHNldHRpbmdzLmN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFsd2F5cyByZW1vdmUgbG9hZGluZyBjbGFzcyBhZnRlciBwcm9jZXNzaW5nXG4gICAgICAgICAgICAkZHJvcGRvd24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIC8vIEFsc28gcmVtb3ZlIGZyb20gcGFyZW50IGRyb3Bkb3duIHdyYXBwZXIgaWYgZXhpc3RzXG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLnBhcmVudCgpLmhhc0NsYXNzKCd1aScpICYmICRkcm9wZG93bi5wYXJlbnQoKS5oYXNDbGFzcygnZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5wYXJlbnQoKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0sIHNldHRpbmdzLmNhdGVnb3JpZXMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuICRkcm9wZG93bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGRyb3Bkb3duIHdpdGggZGF0YVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZHJvcGRvd24gLSBEcm9wZG93biBlbGVtZW50XG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIE9wdGlvbnMgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjdXJyZW50VmFsdWUgLSBWYWx1ZSB0byBzZWxlY3RcbiAgICAgKi9cbiAgICBwb3B1bGF0ZURyb3Bkb3duKCRkcm9wZG93biwgZGF0YSwgY3VycmVudFZhbHVlKSB7XG4gICAgICAgIGlmICghJGRyb3Bkb3duIHx8ICRkcm9wZG93bi5sZW5ndGggPT09IDAgfHwgIUFycmF5LmlzQXJyYXkoZGF0YSkpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEFsd2F5cyB3b3JrIHdpdGggdGhlIG9yaWdpbmFsIHNlbGVjdCBlbGVtZW50XG4gICAgICAgIGNvbnN0ICRzZWxlY3QgPSAkZHJvcGRvd24uaXMoJ3NlbGVjdCcpID8gJGRyb3Bkb3duIDogJGRyb3Bkb3duLmZpbmQoJ3NlbGVjdCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRzZWxlY3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQ2xlYXIgZXhpc3Rpbmcgb3B0aW9uc1xuICAgICAgICAgICAgJHNlbGVjdC5lbXB0eSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgb3B0aW9ucyBmcm9tIEFQSSBkYXRhXG4gICAgICAgICAgICBkYXRhLmZvckVhY2goZmlsdGVyID0+IHtcbiAgICAgICAgICAgICAgICAkc2VsZWN0LmFwcGVuZChgPG9wdGlvbiB2YWx1ZT1cIiR7ZmlsdGVyLnZhbHVlfVwiPiR7ZmlsdGVyLnRleHQgfHwgZmlsdGVyLm5hbWV9PC9vcHRpb24+YCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IGN1cnJlbnQgdmFsdWUgb24gdGhlIHNlbGVjdCBlbGVtZW50XG4gICAgICAgICAgICBpZiAoY3VycmVudFZhbHVlICYmICRzZWxlY3QuZmluZChgb3B0aW9uW3ZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCJdYCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRzZWxlY3QudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgYSBTZW1hbnRpYyBVSSBkcm9wZG93biwgcmVmcmVzaCBpdCB0byBzaG93IHRoZSBuZXcgb3B0aW9uc1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5oYXNDbGFzcygndWknKSAmJiAkZHJvcGRvd24uaGFzQ2xhc3MoJ2Ryb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayBmb3IgcHVyZSBTZW1hbnRpYyBVSSBkcm9wZG93bnMgd2l0aG91dCBzZWxlY3QgZWxlbWVudFxuICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgICAgICRtZW51LmVtcHR5KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRhdGEuZm9yRWFjaChmaWx0ZXIgPT4ge1xuICAgICAgICAgICAgICAgICRtZW51LmFwcGVuZChgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtmaWx0ZXIudmFsdWV9XCI+JHtmaWx0ZXIudGV4dCB8fCBmaWx0ZXIubmFtZX08L2Rpdj5gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWZyZXNoIGRyb3Bkb3duXG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IGN1cnJlbnQgdmFsdWVcbiAgICAgICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCBkZWZhdWx0IFwibm9uZVwiIG9wdGlvbiB3aGVuIEFQSSBmYWlsc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZHJvcGRvd24gLSBEcm9wZG93biBlbGVtZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGN1cnJlbnRWYWx1ZSAtIEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBzZXREZWZhdWx0T3B0aW9uKCRkcm9wZG93biwgY3VycmVudFZhbHVlKSB7XG4gICAgICAgIGNvbnN0IG5vbmVUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X05vTmV0d29ya0ZpbHRlciB8fCAnTm9uZSc7XG4gICAgICAgIGNvbnN0IHZhbHVlVG9TZXQgPSBjdXJyZW50VmFsdWUgfHwgJ25vbmUnO1xuICAgICAgICBcbiAgICAgICAgLy8gQWx3YXlzIHdvcmsgd2l0aCB0aGUgb3JpZ2luYWwgc2VsZWN0IGVsZW1lbnRcbiAgICAgICAgY29uc3QgJHNlbGVjdCA9ICRkcm9wZG93bi5pcygnc2VsZWN0JykgPyAkZHJvcGRvd24gOiAkZHJvcGRvd24uZmluZCgnc2VsZWN0Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJHNlbGVjdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBBZGQgZGVmYXVsdCBvcHRpb24gdG8gc2VsZWN0IGVsZW1lbnRcbiAgICAgICAgICAgICRzZWxlY3QuZW1wdHkoKS5hcHBlbmQoYDxvcHRpb24gdmFsdWU9XCJub25lXCI+JHtub25lVGV4dH08L29wdGlvbj5gKTtcbiAgICAgICAgICAgICRzZWxlY3QudmFsKHZhbHVlVG9TZXQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgU2VtYW50aWMgVUkgZHJvcGRvd24sIHJlZnJlc2ggaXRcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24uaGFzQ2xhc3MoJ3VpJykgJiYgJGRyb3Bkb3duLmhhc0NsYXNzKCdkcm9wZG93bicpKSB7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZVRvU2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIGZvciBwdXJlIFNlbWFudGljIFVJIGRyb3Bkb3duc1xuICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgICAgICRtZW51LmVtcHR5KCkuYXBwZW5kKGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCJub25lXCI+JHtub25lVGV4dH08L2Rpdj5gKTtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZVRvU2V0KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBhcyBwYXJ0IG9mIHdpbmRvdyBvYmplY3QgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuTmV0d29ya0ZpbHRlcnNBUEkgPSBOZXR3b3JrRmlsdGVyc0FQSTsiXX0=