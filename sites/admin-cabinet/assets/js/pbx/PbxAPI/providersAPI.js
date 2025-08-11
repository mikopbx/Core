"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global Config, SecurityUtils, PbxApi */

/**
 * ProvidersAPI - REST API v2 for providers management
 * 
 * Provides centralized API methods with built-in security features:
 * - Input sanitization for display
 * - XSS protection
 * - Consistent error handling
 * - CSRF protection through session cookies
 */
var ProvidersAPI = {
  /**
   * API endpoints configuration
   */
  endpoints: {
    getList: '/pbxcore/api/v2/providers/getList',
    getRecord: '/pbxcore/api/v2/providers/getRecord',
    saveRecord: '/pbxcore/api/v2/providers/saveRecord',
    deleteRecord: '/pbxcore/api/v2/providers/deleteRecord',
    getStatuses: '/pbxcore/api/v2/providers/getStatuses',
    updateStatus: '/pbxcore/api/v2/providers/updateStatus'
  },

  /**
   * Get record by ID with security processing
   * 
   * @param {string} id - Record ID or empty string for new
   * @param {string} type - Provider type (SIP or IAX)
   * @param {function} callback - Callback function
   */
  getRecord: function getRecord(id, type, callback) {
    var _this = this;

    var recordId = !id || id === '' ? 'new' : id; // Use RESTful URL with path parameters: /getRecord/SIP/SIP-TRUNK-123
    // Fall back to query parameters for 'new' records

    var url;

    if (recordId === 'new') {
      // For new records, use query parameters
      url = this.endpoints.getRecord + (type ? '?type=' + type : '');
    } else {
      // For existing records, use RESTful path: /getRecord/SIP/SIP-TRUNK-123
      url = this.endpoints.getRecord + '/' + type + '/' + recordId;
    }

    $.api({
      url: url,
      method: 'GET',
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result && response.data) {
          // Sanitize data for display
          response.data = _this.sanitizeProviderData(response.data);
        }

        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          messages: {
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Get list of all providers with security processing
   * 
   * @param {function} callback - Callback function
   */
  getList: function getList(callback) {
    var _this2 = this;

    $.api({
      url: this.endpoints.getList,
      method: 'GET',
      data: {
        includeDisabled: 'true' // Always include disabled providers in admin panel

      },
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result && response.data) {
          // Sanitize array of providers
          response.data = response.data.map(function (item) {
            return this.sanitizeProviderData(item);
          }.bind(_this2));
        }

        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          data: []
        });
      }
    });
  },

  /**
   * Save provider record with validation and security
   * 
   * @param {object} data - Data to save
   * @param {function} callback - Callback function
   */
  saveRecord: function saveRecord(data, callback) {
    var _this3 = this;

    // Client-side validation
    if (!this.validateProviderData(data)) {
      callback({
        result: false,
        messages: {
          error: ['Client-side validation failed']
        }
      });
      return;
    } // Convert boolean fields to 1/0 for form-encoded transmission


    var booleanFields = ['disabled', 'qualify', 'disablefromuser', 'noregister', 'receive_calls_without_auth'];

    var processedData = _objectSpread({}, data);

    booleanFields.forEach(function (field) {
      if (processedData.hasOwnProperty(field)) {
        // Convert boolean to 1/0 for server
        processedData[field] = processedData[field] ? '1' : '0';
      }
    });
    var method = processedData.id ? 'PUT' : 'POST';
    var url = processedData.id ? this.endpoints.saveRecord + '/' + processedData.id : this.endpoints.saveRecord;
    $.api({
      url: url,
      method: method,
      data: processedData,
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result && response.data) {
          response.data = _this3.sanitizeProviderData(response.data);
        }

        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          messages: {
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Delete provider record
   * 
   * @param {string} id - Record ID
   * @param {function} callback - Callback function
   */
  deleteRecord: function deleteRecord(id, callback) {
    $.api({
      url: this.endpoints.deleteRecord + '/' + id,
      on: 'now',
      method: 'DELETE',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Get provider statuses
   * 
   * @param {function} callback - Callback function
   */
  getStatuses: function getStatuses(callback) {
    $.api({
      url: this.endpoints.getStatuses,
      method: 'GET',
      on: 'now',
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          data: {}
        });
      }
    });
  },

  /**
   * Update provider status (enable/disable)
   * 
   * @param {object} data - Data with id, type, and disabled status
   * @param {function} callback - Callback function
   */
  updateStatus: function updateStatus(data, callback) {
    // Validate required fields
    if (!data.id || !data.type) {
      callback({
        result: false,
        messages: {
          error: ['Provider ID and type are required']
        }
      });
      return;
    } // Convert data to proper format


    var updateData = {
      id: data.id,
      type: data.type.toUpperCase(),
      disabled: !!data.disabled
    };
    $.api({
      url: this.endpoints.updateStatus,
      method: 'POST',
      data: updateData,
      on: 'now',
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          messages: {
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Sanitize provider data for secure display
   * 
   * @param {object} data - Provider data from API
   * @return {object} Data ready for display
   */
  sanitizeProviderData: function sanitizeProviderData(data) {
    if (!data) return data;
    var sanitized = {
      id: data.id,
      uniqid: data.uniqid,
      type: data.type || 'SIP',
      note: data.note || '',
      disabled: !!data.disabled
    }; // SIP-specific fields

    if (data.type === 'SIP' || data.sipuid) {
      Object.assign(sanitized, {
        sipuid: data.sipuid || '',
        username: data.username || '',
        secret: data.secret || '',
        host: data.host || '',
        port: parseInt(data.port) || 5060,
        transport: data.transport || 'UDP',
        qualify: !!data.qualify,
        qualifyfreq: parseInt(data.qualifyfreq) || 60,
        registration_type: data.registration_type || 'outbound',
        extension: data.extension || '',
        description: data.description || '',
        networkfilterid: data.networkfilterid || '',
        manualattributes: data.manualattributes || '',
        dtmfmode: data.dtmfmode || 'auto',
        nat: data.nat || 'auto_force',
        fromuser: data.fromuser || '',
        fromdomain: data.fromdomain || '',
        outbound_proxy: data.outbound_proxy || '',
        disablefromuser: !!data.disablefromuser,
        noregister: !!data.noregister,
        receive_calls_without_auth: !!data.receive_calls_without_auth,
        additionalHosts: data.additionalHosts || []
      });
    } // IAX-specific fields


    if (data.type === 'IAX' || data.iaxuid) {
      Object.assign(sanitized, {
        iaxuid: data.iaxuid || '',
        username: data.username || '',
        secret: data.secret || '',
        host: data.host || '',
        qualify: !!data.qualify,
        registration_type: data.registration_type || 'none',
        description: data.description || '',
        manualattributes: data.manualattributes || '',
        noregister: !!data.noregister,
        networkfilterid: data.networkfilterid || '',
        port: data.port || '',
        receive_calls_without_auth: !!data.receive_calls_without_auth
      });
    }

    return sanitized;
  },

  /**
   * Client-side validation
   * 
   * @param {object} data - Data to validate
   * @return {boolean} Validation result
   */
  validateProviderData: function validateProviderData(data) {
    // Check if this is a status-only update (contains only id, type, disabled)
    var isStatusUpdate = data.id && data.type && data.hasOwnProperty('disabled') && Object.keys(data).length === 3;

    if (isStatusUpdate) {
      // Minimal validation for status updates
      return data.type && ['SIP', 'IAX'].includes(data.type);
    } // Type validation


    if (!data.type || !['SIP', 'IAX'].includes(data.type)) {
      return false;
    } // Username validation (alphanumeric and basic symbols)


    if (data.username && !/^[a-zA-Z0-9._-]*$/.test(data.username)) {
      return false;
    } // Host validation (domain or IP)


    if (data.host) {
      var hostPattern = /^([a-zA-Z0-9.-]+|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;

      if (!hostPattern.test(data.host)) {
        return false;
      }
    } // Port validation


    if (data.port !== undefined && data.port !== null && data.port !== '') {
      var port = parseInt(data.port);

      if (isNaN(port) || port < 1 || port > 65535) {
        return false;
      }
    } // Transport validation for SIP


    if (data.type === 'SIP' && data.transport) {
      if (!['UDP', 'TCP', 'TLS'].includes(data.transport)) {
        return false;
      }
    } // Extension validation (numeric only)


    if (data.extension && !/^[0-9]*$/.test(data.extension)) {
      return false;
    }

    return true;
  },

  /**
   * Get dropdown settings for provider selection - BACKWARD COMPATIBILITY
   * This method maintains compatibility with existing forms that use the old API
   * 
   * @param {function|object} onChangeCallback - Callback when selection changes OR options object
   * @param {object} options - Additional options (when first param is callback)
   * @return {object} Semantic UI dropdown settings object
   */
  getDropdownSettings: function getDropdownSettings(onChangeCallback, options) {
    // Handle different parameter combinations
    var callback = onChangeCallback;
    var settings = options || {}; // If first parameter is an object, treat it as options

    if (_typeof(onChangeCallback) === 'object' && onChangeCallback !== null) {
      settings = onChangeCallback;
      callback = settings.onChange;
    } // Default values


    var includeNone = settings.includeNone !== undefined ? settings.includeNone : true;
    var forceSelection = settings.forceSelection !== undefined ? settings.forceSelection : false;
    return {
      apiSettings: {
        // Use the new REST API v2 endpoint
        url: this.endpoints.getList,
        method: 'GET',
        cache: false,
        data: {
          includeDisabled: 'false' // Only show enabled providers in dropdowns

        },
        onResponse: function onResponse(response) {
          if (!response || !response.result || !response.data) {
            return {
              success: false,
              results: []
            };
          } // Transform API response to dropdown format


          var results = response.data.map(function (provider) {
            // Use the 'name' field from server as-is, it already contains the icon
            // Server sends: "<i class=\"server icon\"></i> IAX: Test IAX Provider"
            return {
              value: provider.uniqid,
              // Use uniqid as the value
              name: provider.name,
              // Use server's name field as-is
              text: provider.name,
              // Same for text display
              // Store additional data for future use
              providerType: provider.type,
              providerId: provider.id,
              host: provider.host || '',
              username: provider.username || ''
            };
          }); // Add 'None' option at the beginning only if includeNone is true

          if (includeNone) {
            results.unshift({
              value: 'none',
              name: globalTranslate.ir_AnyProvider_v2 || 'Any provider',
              text: globalTranslate.ir_AnyProvider_v2 || 'Any provider'
            });
          }

          return {
            success: true,
            results: results
          };
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: true,
      allowCategorySelection: false,
      forceSelection: forceSelection,
      // Use the forceSelection parameter
      hideDividers: 'empty',
      direction: 'downward',
      onChange: function onChange(value, text, $choice) {
        // Update hidden input fields for provider
        $('input[name="provider"], input[name="providerid"]').val(value).trigger('change'); // Call the provided callback if it exists

        if (typeof callback === 'function') {
          callback(value, text, $choice);
        }
      }
    };
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcHJvdmlkZXJzQVBJLmpzIl0sIm5hbWVzIjpbIlByb3ZpZGVyc0FQSSIsImVuZHBvaW50cyIsImdldExpc3QiLCJnZXRSZWNvcmQiLCJzYXZlUmVjb3JkIiwiZGVsZXRlUmVjb3JkIiwiZ2V0U3RhdHVzZXMiLCJ1cGRhdGVTdGF0dXMiLCJpZCIsInR5cGUiLCJjYWxsYmFjayIsInJlY29yZElkIiwidXJsIiwiJCIsImFwaSIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwic2FuaXRpemVQcm92aWRlckRhdGEiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsImluY2x1ZGVEaXNhYmxlZCIsIm1hcCIsIml0ZW0iLCJiaW5kIiwidmFsaWRhdGVQcm92aWRlckRhdGEiLCJib29sZWFuRmllbGRzIiwicHJvY2Vzc2VkRGF0YSIsImZvckVhY2giLCJmaWVsZCIsImhhc093blByb3BlcnR5Iiwic3VjY2Vzc1Rlc3QiLCJQYnhBcGkiLCJ1cGRhdGVEYXRhIiwidG9VcHBlckNhc2UiLCJkaXNhYmxlZCIsInNhbml0aXplZCIsInVuaXFpZCIsIm5vdGUiLCJzaXB1aWQiLCJPYmplY3QiLCJhc3NpZ24iLCJ1c2VybmFtZSIsInNlY3JldCIsImhvc3QiLCJwb3J0IiwicGFyc2VJbnQiLCJ0cmFuc3BvcnQiLCJxdWFsaWZ5IiwicXVhbGlmeWZyZXEiLCJyZWdpc3RyYXRpb25fdHlwZSIsImV4dGVuc2lvbiIsImRlc2NyaXB0aW9uIiwibmV0d29ya2ZpbHRlcmlkIiwibWFudWFsYXR0cmlidXRlcyIsImR0bWZtb2RlIiwibmF0IiwiZnJvbXVzZXIiLCJmcm9tZG9tYWluIiwib3V0Ym91bmRfcHJveHkiLCJkaXNhYmxlZnJvbXVzZXIiLCJub3JlZ2lzdGVyIiwicmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgiLCJhZGRpdGlvbmFsSG9zdHMiLCJpYXh1aWQiLCJpc1N0YXR1c1VwZGF0ZSIsImtleXMiLCJsZW5ndGgiLCJpbmNsdWRlcyIsInRlc3QiLCJob3N0UGF0dGVybiIsInVuZGVmaW5lZCIsImlzTmFOIiwiZ2V0RHJvcGRvd25TZXR0aW5ncyIsIm9uQ2hhbmdlQ2FsbGJhY2siLCJvcHRpb25zIiwic2V0dGluZ3MiLCJvbkNoYW5nZSIsImluY2x1ZGVOb25lIiwiZm9yY2VTZWxlY3Rpb24iLCJhcGlTZXR0aW5ncyIsImNhY2hlIiwib25SZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHJvdmlkZXIiLCJ2YWx1ZSIsIm5hbWUiLCJ0ZXh0IiwicHJvdmlkZXJUeXBlIiwicHJvdmlkZXJJZCIsInVuc2hpZnQiLCJnbG9iYWxUcmFuc2xhdGUiLCJpcl9BbnlQcm92aWRlcl92MiIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJoaWRlRGl2aWRlcnMiLCJkaXJlY3Rpb24iLCIkY2hvaWNlIiwidmFsIiwidHJpZ2dlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFO0FBQ1BDLElBQUFBLE9BQU8sRUFBRSxtQ0FERjtBQUVQQyxJQUFBQSxTQUFTLEVBQUUscUNBRko7QUFHUEMsSUFBQUEsVUFBVSxFQUFFLHNDQUhMO0FBSVBDLElBQUFBLFlBQVksRUFBRSx3Q0FKUDtBQUtQQyxJQUFBQSxXQUFXLEVBQUUsdUNBTE47QUFNUEMsSUFBQUEsWUFBWSxFQUFFO0FBTlAsR0FKTTs7QUFhakI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUosRUFBQUEsU0FBUyxFQUFFLG1CQUFTSyxFQUFULEVBQWFDLElBQWIs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QjtBQUNiTSxZQUFBQSxPQUFPLENBQUNPLE9BQVIsQ0FBZ0I7QUFDWkwsY0FBQUEsS0FBSyxFQUFFLE1BREs7QUFFWkMsY0FBQUEsSUFBSSxFQUFFSyxlQUFlLENBQUNDLGlCQUFoQixJQUFxQyxjQUYvQjtBQUdaTCxjQUFBQSxJQUFJLEVBQUVJLGVBQWUsQ0FBQ0MsaUJBQWhCLElBQXFDO0FBSC9CLGFBQWhCO0FBS0g7O0FBRUQsaUJBQU87QUFDSFYsWUFBQUEsT0FBTyxFQUFFLElBRE47QUFFSEMsWUFBQUEsT0FBTyxFQUFFQTtBQUZOLFdBQVA7QUFJSDtBQTlDUSxPQURWO0FBaURIVSxNQUFBQSxVQUFVLEVBQUUsSUFqRFQ7QUFrREhDLE1BQUFBLGNBQWMsRUFBRSxJQWxEYjtBQW1ESEMsTUFBQUEsZ0JBQWdCLEVBQUUsSUFuRGY7QUFvREhDLE1BQUFBLGNBQWMsRUFBRSxJQXBEYjtBQXFESEMsTUFBQUEsc0JBQXNCLEVBQUUsS0FyRHJCO0FBc0RIbkIsTUFBQUEsY0FBYyxFQUFFQSxjQXREYjtBQXNEOEI7QUFDakNvQixNQUFBQSxZQUFZLEVBQUUsT0F2RFg7QUF3REhDLE1BQUFBLFNBQVMsRUFBRSxVQXhEUjtBQXlESHZCLE1BQUFBLFFBQVEsRUFBRSxrQkFBU1MsS0FBVCxFQUFnQkUsSUFBaEIsRUFBc0JhLE9BQXRCLEVBQStCO0FBQ3JDO0FBQ0E3RixRQUFBQSxDQUFDLENBQUMsa0RBQUQsQ0FBRCxDQUFzRDhGLEdBQXRELENBQTBEaEIsS0FBMUQsRUFBaUVpQixPQUFqRSxDQUF5RSxRQUF6RSxFQUZxQyxDQUlyQzs7QUFDQSxZQUFJLE9BQU9sRyxRQUFQLEtBQW9CLFVBQXhCLEVBQW9DO0FBQ2hDQSxVQUFBQSxRQUFRLENBQUNpRixLQUFELEVBQVFFLElBQVIsRUFBY2EsT0FBZCxDQUFSO0FBQ0g7QUFDSjtBQWpFRSxLQUFQO0FBbUVIO0FBbmJnQixDQUFyQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBTZWN1cml0eVV0aWxzLCBQYnhBcGkgKi9cblxuLyoqXG4gKiBQcm92aWRlcnNBUEkgLSBSRVNUIEFQSSB2MiBmb3IgcHJvdmlkZXJzIG1hbmFnZW1lbnRcbiAqIFxuICogUHJvdmlkZXMgY2VudHJhbGl6ZWQgQVBJIG1ldGhvZHMgd2l0aCBidWlsdC1pbiBzZWN1cml0eSBmZWF0dXJlczpcbiAqIC0gSW5wdXQgc2FuaXRpemF0aW9uIGZvciBkaXNwbGF5XG4gKiAtIFhTUyBwcm90ZWN0aW9uXG4gKiAtIENvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmdcbiAqIC0gQ1NSRiBwcm90ZWN0aW9uIHRocm91Z2ggc2Vzc2lvbiBjb29raWVzXG4gKi9cbmNvbnN0IFByb3ZpZGVyc0FQSSA9IHtcbiAgICAvKipcbiAgICAgKiBBUEkgZW5kcG9pbnRzIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBlbmRwb2ludHM6IHtcbiAgICAgICAgZ2V0TGlzdDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0TGlzdCcsXG4gICAgICAgIGdldFJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0UmVjb3JkJyxcbiAgICAgICAgc2F2ZVJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvc2F2ZVJlY29yZCcsXG4gICAgICAgIGRlbGV0ZVJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZGVsZXRlUmVjb3JkJyxcbiAgICAgICAgZ2V0U3RhdHVzZXM6ICcvcGJ4Y29yZS9hcGkvdjIvcHJvdmlkZXJzL2dldFN0YXR1c2VzJyxcbiAgICAgICAgdXBkYXRlU3RhdHVzOiAnL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy91cGRhdGVTdGF0dXMnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEIHdpdGggc2VjdXJpdHkgcHJvY2Vzc2luZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ld1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gUHJvdmlkZXIgdHlwZSAoU0lQIG9yIElBWClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UmVjb3JkOiBmdW5jdGlvbihpZCwgdHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAoIWlkIHx8IGlkID09PSAnJykgPyAnbmV3JyA6IGlkO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIFJFU1RmdWwgVVJMIHdpdGggcGF0aCBwYXJhbWV0ZXJzOiAvZ2V0UmVjb3JkL1NJUC9TSVAtVFJVTkstMTIzXG4gICAgICAgIC8vIEZhbGwgYmFjayB0byBxdWVyeSBwYXJhbWV0ZXJzIGZvciAnbmV3JyByZWNvcmRzXG4gICAgICAgIGxldCB1cmw7XG4gICAgICAgIGlmIChyZWNvcmRJZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgdXNlIHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICAgICAgICAgIHVybCA9IHRoaXMuZW5kcG9pbnRzLmdldFJlY29yZCArICh0eXBlID8gJz90eXBlPScgKyB0eXBlIDogJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMsIHVzZSBSRVNUZnVsIHBhdGg6IC9nZXRSZWNvcmQvU0lQL1NJUC1UUlVOSy0xMjNcbiAgICAgICAgICAgIHVybCA9IHRoaXMuZW5kcG9pbnRzLmdldFJlY29yZCArICcvJyArIHR5cGUgKyAnLycgKyByZWNvcmRJZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgZGF0YSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgYWxsIHByb3ZpZGVycyB3aXRoIHNlY3VyaXR5IHByb2Nlc3NpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0TGlzdDogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBpbmNsdWRlRGlzYWJsZWQ6ICd0cnVlJyAgLy8gQWx3YXlzIGluY2x1ZGUgZGlzYWJsZWQgcHJvdmlkZXJzIGluIGFkbWluIHBhbmVsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgYXJyYXkgb2YgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSByZXNwb25zZS5kYXRhLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogW119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIHByb3ZpZGVyIHJlY29yZCB3aXRoIHZhbGlkYXRpb24gYW5kIHNlY3VyaXR5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNhdmVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZDogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIXRoaXMudmFsaWRhdGVQcm92aWRlckRhdGEoZGF0YSkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ0NsaWVudC1zaWRlIHZhbGlkYXRpb24gZmFpbGVkJ119XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBib29sZWFuIGZpZWxkcyB0byAxLzAgZm9yIGZvcm0tZW5jb2RlZCB0cmFuc21pc3Npb25cbiAgICAgICAgY29uc3QgYm9vbGVhbkZpZWxkcyA9IFsnZGlzYWJsZWQnLCAncXVhbGlmeScsICdkaXNhYmxlZnJvbXVzZXInLCAnbm9yZWdpc3RlcicsICdyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCddO1xuICAgICAgICBjb25zdCBwcm9jZXNzZWREYXRhID0gey4uLmRhdGF9O1xuICAgICAgICBcbiAgICAgICAgYm9vbGVhbkZpZWxkcy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgIGlmIChwcm9jZXNzZWREYXRhLmhhc093blByb3BlcnR5KGZpZWxkKSkge1xuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgYm9vbGVhbiB0byAxLzAgZm9yIHNlcnZlclxuICAgICAgICAgICAgICAgIHByb2Nlc3NlZERhdGFbZmllbGRdID0gcHJvY2Vzc2VkRGF0YVtmaWVsZF0gPyAnMScgOiAnMCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbWV0aG9kID0gcHJvY2Vzc2VkRGF0YS5pZCA/ICdQVVQnIDogJ1BPU1QnO1xuICAgICAgICBjb25zdCB1cmwgPSBwcm9jZXNzZWREYXRhLmlkID8gXG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50cy5zYXZlUmVjb3JkICsgJy8nICsgcHJvY2Vzc2VkRGF0YS5pZCA6IFxuICAgICAgICAgICAgdGhpcy5lbmRwb2ludHMuc2F2ZVJlY29yZDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICBkYXRhOiBwcm9jZXNzZWREYXRhLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IHRoaXMuc2FuaXRpemVQcm92aWRlckRhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBwcm92aWRlciByZWNvcmRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZWNvcmQgSURcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkOiBmdW5jdGlvbihpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5kZWxldGVSZWNvcmQgKyAnLycgKyBpZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcHJvdmlkZXIgc3RhdHVzZXNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0U3RhdHVzZXM6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuZ2V0U3RhdHVzZXMsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiB7fX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwcm92aWRlciBzdGF0dXMgKGVuYWJsZS9kaXNhYmxlKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB3aXRoIGlkLCB0eXBlLCBhbmQgZGlzYWJsZWQgc3RhdHVzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1czogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgICAgIGlmICghZGF0YS5pZCB8fCAhZGF0YS50eXBlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IHtlcnJvcjogWydQcm92aWRlciBJRCBhbmQgdHlwZSBhcmUgcmVxdWlyZWQnXX1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGRhdGEgdG8gcHJvcGVyIGZvcm1hdFxuICAgICAgICBjb25zdCB1cGRhdGVEYXRhID0ge1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgICAgICB0eXBlOiBkYXRhLnR5cGUudG9VcHBlckNhc2UoKSxcbiAgICAgICAgICAgIGRpc2FibGVkOiAhIWRhdGEuZGlzYWJsZWRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMudXBkYXRlU3RhdHVzLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB1cGRhdGVEYXRhLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3InXX19KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYW5pdGl6ZSBwcm92aWRlciBkYXRhIGZvciBzZWN1cmUgZGlzcGxheVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gRGF0YSByZWFkeSBmb3IgZGlzcGxheVxuICAgICAqL1xuICAgIHNhbml0aXplUHJvdmlkZXJEYXRhOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YSkgcmV0dXJuIGRhdGE7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzYW5pdGl6ZWQgPSB7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgICAgIHVuaXFpZDogZGF0YS51bmlxaWQsXG4gICAgICAgICAgICB0eXBlOiBkYXRhLnR5cGUgfHwgJ1NJUCcsXG4gICAgICAgICAgICBub3RlOiBkYXRhLm5vdGUgfHwgJycsXG4gICAgICAgICAgICBkaXNhYmxlZDogISFkYXRhLmRpc2FibGVkXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIGlmIChkYXRhLnR5cGUgPT09ICdTSVAnIHx8IGRhdGEuc2lwdWlkKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHNhbml0aXplZCwge1xuICAgICAgICAgICAgICAgIHNpcHVpZDogZGF0YS5zaXB1aWQgfHwgJycsXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6IGRhdGEudXNlcm5hbWUgfHwgJycsXG4gICAgICAgICAgICAgICAgc2VjcmV0OiBkYXRhLnNlY3JldCB8fCAnJyxcbiAgICAgICAgICAgICAgICBob3N0OiBkYXRhLmhvc3QgfHwgJycsXG4gICAgICAgICAgICAgICAgcG9ydDogcGFyc2VJbnQoZGF0YS5wb3J0KSB8fCA1MDYwLFxuICAgICAgICAgICAgICAgIHRyYW5zcG9ydDogZGF0YS50cmFuc3BvcnQgfHwgJ1VEUCcsXG4gICAgICAgICAgICAgICAgcXVhbGlmeTogISFkYXRhLnF1YWxpZnksXG4gICAgICAgICAgICAgICAgcXVhbGlmeWZyZXE6IHBhcnNlSW50KGRhdGEucXVhbGlmeWZyZXEpIHx8IDYwLFxuICAgICAgICAgICAgICAgIHJlZ2lzdHJhdGlvbl90eXBlOiBkYXRhLnJlZ2lzdHJhdGlvbl90eXBlIHx8ICdvdXRib3VuZCcsXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBkYXRhLmV4dGVuc2lvbiB8fCAnJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvbiB8fCAnJyxcbiAgICAgICAgICAgICAgICBuZXR3b3JrZmlsdGVyaWQ6IGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICcnLFxuICAgICAgICAgICAgICAgIG1hbnVhbGF0dHJpYnV0ZXM6IGRhdGEubWFudWFsYXR0cmlidXRlcyB8fCAnJyxcbiAgICAgICAgICAgICAgICBkdG1mbW9kZTogZGF0YS5kdG1mbW9kZSB8fCAnYXV0bycsXG4gICAgICAgICAgICAgICAgbmF0OiBkYXRhLm5hdCB8fCAnYXV0b19mb3JjZScsXG4gICAgICAgICAgICAgICAgZnJvbXVzZXI6IGRhdGEuZnJvbXVzZXIgfHwgJycsXG4gICAgICAgICAgICAgICAgZnJvbWRvbWFpbjogZGF0YS5mcm9tZG9tYWluIHx8ICcnLFxuICAgICAgICAgICAgICAgIG91dGJvdW5kX3Byb3h5OiBkYXRhLm91dGJvdW5kX3Byb3h5IHx8ICcnLFxuICAgICAgICAgICAgICAgIGRpc2FibGVmcm9tdXNlcjogISFkYXRhLmRpc2FibGVmcm9tdXNlcixcbiAgICAgICAgICAgICAgICBub3JlZ2lzdGVyOiAhIWRhdGEubm9yZWdpc3RlcixcbiAgICAgICAgICAgICAgICByZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aDogISFkYXRhLnJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxIb3N0czogZGF0YS5hZGRpdGlvbmFsSG9zdHMgfHwgW11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJQVgtc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIGlmIChkYXRhLnR5cGUgPT09ICdJQVgnIHx8IGRhdGEuaWF4dWlkKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHNhbml0aXplZCwge1xuICAgICAgICAgICAgICAgIGlheHVpZDogZGF0YS5pYXh1aWQgfHwgJycsXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6IGRhdGEudXNlcm5hbWUgfHwgJycsXG4gICAgICAgICAgICAgICAgc2VjcmV0OiBkYXRhLnNlY3JldCB8fCAnJyxcbiAgICAgICAgICAgICAgICBob3N0OiBkYXRhLmhvc3QgfHwgJycsXG4gICAgICAgICAgICAgICAgcXVhbGlmeTogISFkYXRhLnF1YWxpZnksXG4gICAgICAgICAgICAgICAgcmVnaXN0cmF0aW9uX3R5cGU6IGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgJ25vbmUnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkYXRhLmRlc2NyaXB0aW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIG1hbnVhbGF0dHJpYnV0ZXM6IGRhdGEubWFudWFsYXR0cmlidXRlcyB8fCAnJyxcbiAgICAgICAgICAgICAgICBub3JlZ2lzdGVyOiAhIWRhdGEubm9yZWdpc3RlcixcbiAgICAgICAgICAgICAgICBuZXR3b3JrZmlsdGVyaWQ6IGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICcnLFxuICAgICAgICAgICAgICAgIHBvcnQ6IGRhdGEucG9ydCB8fCAnJyxcbiAgICAgICAgICAgICAgICByZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aDogISFkYXRhLnJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHNhbml0aXplZDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsaWVudC1zaWRlIHZhbGlkYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gdmFsaWRhdGVcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufSBWYWxpZGF0aW9uIHJlc3VsdFxuICAgICAqL1xuICAgIHZhbGlkYXRlUHJvdmlkZXJEYXRhOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBzdGF0dXMtb25seSB1cGRhdGUgKGNvbnRhaW5zIG9ubHkgaWQsIHR5cGUsIGRpc2FibGVkKVxuICAgICAgICBjb25zdCBpc1N0YXR1c1VwZGF0ZSA9IGRhdGEuaWQgJiYgZGF0YS50eXBlICYmIGRhdGEuaGFzT3duUHJvcGVydHkoJ2Rpc2FibGVkJykgJiYgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhKS5sZW5ndGggPT09IDM7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNTdGF0dXNVcGRhdGUpIHtcbiAgICAgICAgICAgIC8vIE1pbmltYWwgdmFsaWRhdGlvbiBmb3Igc3RhdHVzIHVwZGF0ZXNcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnR5cGUgJiYgWydTSVAnLCAnSUFYJ10uaW5jbHVkZXMoZGF0YS50eXBlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHlwZSB2YWxpZGF0aW9uXG4gICAgICAgIGlmICghZGF0YS50eXBlIHx8ICFbJ1NJUCcsICdJQVgnXS5pbmNsdWRlcyhkYXRhLnR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZXJuYW1lIHZhbGlkYXRpb24gKGFscGhhbnVtZXJpYyBhbmQgYmFzaWMgc3ltYm9scylcbiAgICAgICAgaWYgKGRhdGEudXNlcm5hbWUgJiYgIS9eW2EtekEtWjAtOS5fLV0qJC8udGVzdChkYXRhLnVzZXJuYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIb3N0IHZhbGlkYXRpb24gKGRvbWFpbiBvciBJUClcbiAgICAgICAgaWYgKGRhdGEuaG9zdCkge1xuICAgICAgICAgICAgY29uc3QgaG9zdFBhdHRlcm4gPSAvXihbYS16QS1aMC05Li1dK3xcXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfSkkLztcbiAgICAgICAgICAgIGlmICghaG9zdFBhdHRlcm4udGVzdChkYXRhLmhvc3QpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQb3J0IHZhbGlkYXRpb25cbiAgICAgICAgaWYgKGRhdGEucG9ydCAhPT0gdW5kZWZpbmVkICYmIGRhdGEucG9ydCAhPT0gbnVsbCAmJiBkYXRhLnBvcnQgIT09ICcnKSB7XG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gcGFyc2VJbnQoZGF0YS5wb3J0KTtcbiAgICAgICAgICAgIGlmIChpc05hTihwb3J0KSB8fCBwb3J0IDwgMSB8fCBwb3J0ID4gNjU1MzUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRyYW5zcG9ydCB2YWxpZGF0aW9uIGZvciBTSVBcbiAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gJ1NJUCcgJiYgZGF0YS50cmFuc3BvcnQpIHtcbiAgICAgICAgICAgIGlmICghWydVRFAnLCAnVENQJywgJ1RMUyddLmluY2x1ZGVzKGRhdGEudHJhbnNwb3J0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXh0ZW5zaW9uIHZhbGlkYXRpb24gKG51bWVyaWMgb25seSlcbiAgICAgICAgaWYgKGRhdGEuZXh0ZW5zaW9uICYmICEvXlswLTldKiQvLnRlc3QoZGF0YS5leHRlbnNpb24pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGRyb3Bkb3duIHNldHRpbmdzIGZvciBwcm92aWRlciBzZWxlY3Rpb24gLSBCQUNLV0FSRCBDT01QQVRJQklMSVRZXG4gICAgICogVGhpcyBtZXRob2QgbWFpbnRhaW5zIGNvbXBhdGliaWxpdHkgd2l0aCBleGlzdGluZyBmb3JtcyB0aGF0IHVzZSB0aGUgb2xkIEFQSVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258b2JqZWN0fSBvbkNoYW5nZUNhbGxiYWNrIC0gQ2FsbGJhY2sgd2hlbiBzZWxlY3Rpb24gY2hhbmdlcyBPUiBvcHRpb25zIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQWRkaXRpb25hbCBvcHRpb25zICh3aGVuIGZpcnN0IHBhcmFtIGlzIGNhbGxiYWNrKVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gU2VtYW50aWMgVUkgZHJvcGRvd24gc2V0dGluZ3Mgb2JqZWN0XG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nczogZnVuY3Rpb24ob25DaGFuZ2VDYWxsYmFjaywgb3B0aW9ucykge1xuICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IHBhcmFtZXRlciBjb21iaW5hdGlvbnNcbiAgICAgICAgbGV0IGNhbGxiYWNrID0gb25DaGFuZ2VDYWxsYmFjaztcbiAgICAgICAgbGV0IHNldHRpbmdzID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGZpcnN0IHBhcmFtZXRlciBpcyBhbiBvYmplY3QsIHRyZWF0IGl0IGFzIG9wdGlvbnNcbiAgICAgICAgaWYgKHR5cGVvZiBvbkNoYW5nZUNhbGxiYWNrID09PSAnb2JqZWN0JyAmJiBvbkNoYW5nZUNhbGxiYWNrICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZXR0aW5ncyA9IG9uQ2hhbmdlQ2FsbGJhY2s7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHNldHRpbmdzLm9uQ2hhbmdlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEZWZhdWx0IHZhbHVlc1xuICAgICAgICBjb25zdCBpbmNsdWRlTm9uZSA9IHNldHRpbmdzLmluY2x1ZGVOb25lICE9PSB1bmRlZmluZWQgPyBzZXR0aW5ncy5pbmNsdWRlTm9uZSA6IHRydWU7XG4gICAgICAgIGNvbnN0IGZvcmNlU2VsZWN0aW9uID0gc2V0dGluZ3MuZm9yY2VTZWxlY3Rpb24gIT09IHVuZGVmaW5lZCA/IHNldHRpbmdzLmZvcmNlU2VsZWN0aW9uIDogZmFsc2U7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgbmV3IFJFU1QgQVBJIHYyIGVuZHBvaW50XG4gICAgICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVkZURpc2FibGVkOiAnZmFsc2UnICAvLyBPbmx5IHNob3cgZW5hYmxlZCBwcm92aWRlcnMgaW4gZHJvcGRvd25zXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQgfHwgIXJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogW11cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyYW5zZm9ybSBBUEkgcmVzcG9uc2UgdG8gZHJvcGRvd24gZm9ybWF0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSByZXNwb25zZS5kYXRhLm1hcChmdW5jdGlvbihwcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHRoZSAnbmFtZScgZmllbGQgZnJvbSBzZXJ2ZXIgYXMtaXMsIGl0IGFscmVhZHkgY29udGFpbnMgdGhlIGljb25cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlcnZlciBzZW5kczogXCI8aSBjbGFzcz1cXFwic2VydmVyIGljb25cXFwiPjwvaT4gSUFYOiBUZXN0IElBWCBQcm92aWRlclwiXG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb3ZpZGVyLnVuaXFpZCwgICAgICAvLyBVc2UgdW5pcWlkIGFzIHRoZSB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHByb3ZpZGVyLm5hbWUsICAgICAgICAgIC8vIFVzZSBzZXJ2ZXIncyBuYW1lIGZpZWxkIGFzLWlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogcHJvdmlkZXIubmFtZSwgICAgICAgICAgLy8gU2FtZSBmb3IgdGV4dCBkaXNwbGF5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgYWRkaXRpb25hbCBkYXRhIGZvciBmdXR1cmUgdXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJUeXBlOiBwcm92aWRlci50eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3ZpZGVySWQ6IHByb3ZpZGVyLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3Q6IHByb3ZpZGVyLmhvc3QgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IHByb3ZpZGVyLnVzZXJuYW1lIHx8ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCAnTm9uZScgb3B0aW9uIGF0IHRoZSBiZWdpbm5pbmcgb25seSBpZiBpbmNsdWRlTm9uZSBpcyB0cnVlXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlTm9uZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy51bnNoaWZ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ25vbmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5pcl9BbnlQcm92aWRlcl92MiB8fCAnQW55IHByb3ZpZGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuaXJfQW55UHJvdmlkZXJfdjIgfHwgJ0FueSBwcm92aWRlcidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IHJlc3VsdHNcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgYWxsb3dDYXRlZ29yeVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZm9yY2VTZWxlY3Rpb24sICAvLyBVc2UgdGhlIGZvcmNlU2VsZWN0aW9uIHBhcmFtZXRlclxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCBmaWVsZHMgZm9yIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInByb3ZpZGVyXCJdLCBpbnB1dFtuYW1lPVwicHJvdmlkZXJpZFwiXScpLnZhbCh2YWx1ZSkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FsbCB0aGUgcHJvdmlkZWQgY2FsbGJhY2sgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbn07Il19