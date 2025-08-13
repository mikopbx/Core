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
   * Get status for a specific provider by ID
   * 
   * @param {string} providerId - Provider unique ID
   * @param {string} providerType - Provider type (SIP or IAX)
   * @param {function} callback - Callback function
   */
  getStatusById: function getStatusById(providerId, providerType, callback) {
    // Build URL with type if provided for better performance
    var url = '/pbxcore/api/v2/providers/getStatus/';

    if (providerType) {
      url += providerType.toUpperCase() + '/' + providerId;
    } else {
      url += providerId;
    }

    $.api({
      url: url,
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
          data: null
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcHJvdmlkZXJzQVBJLmpzIl0sIm5hbWVzIjpbIlByb3ZpZGVyc0FQSSIsImVuZHBvaW50cyIsImdldExpc3QiLCJnZXRSZWNvcmQiLCJzYXZlUmVjb3JkIiwiZGVsZXRlUmVjb3JkIiwiZ2V0U3RhdHVzZXMiLCJ1cGRhdGVTdGF0dXMiLCJpZCIsInR5cGUiLCJjYWxsYmFjayIsInJlY29yZElkIiwidXJsIiwiJCIsImFwaSIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwic2FuaXRpemVQcm92aWRlckRhdGEiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsImluY2x1ZGVEaXNhYmxlZCIsIm1hcCIsIml0ZW0iLCJiaW5kIiwidmFsaWRhdGVQcm92aWRlckRhdGEiLCJib29sZWFuRmllbGRzIiwicHJvY2Vzc2VkRGF0YSIsImZvckVhY2giLCJmaWVsZCIsImhhc093blByb3BlcnR5Iiwic3VjY2Vzc1Rlc3QiLCJQYnhBcGkiLCJnZXRTdGF0dXNCeUlkIiwicHJvdmlkZXJJZCIsInByb3ZpZGVyVHlwZSIsInRvVXBwZXJDYXNlIiwidXBkYXRlRGF0YSIsImRpc2FibGVkIiwic2FuaXRpemVkIiwidW5pcWlkIiwibm90ZSIsInNpcHVpZCIsIk9iamVjdCIsImFzc2lnbiIsInVzZXJuYW1lIiwic2VjcmV0IiwiaG9zdCIsInBvcnQiLCJwYXJzZUludCIsInRyYW5zcG9ydCIsInF1YWxpZnkiLCJxdWFsaWZ5ZnJlcSIsInJlZ2lzdHJhdGlvbl90eXBlIiwiZXh0ZW5zaW9uIiwiZGVzY3JpcHRpb24iLCJuZXR3b3JrZmlsdGVyaWQiLCJtYW51YWxhdHRyaWJ1dGVzIiwiZHRtZm1vZGUiLCJuYXQiLCJmcm9tdXNlciIsImZyb21kb21haW4iLCJvdXRib3VuZF9wcm94eSIsImRpc2FibGVmcm9tdXNlciIsIm5vcmVnaXN0ZXIiLCJyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCIsImFkZGl0aW9uYWxIb3N0cyIsImlheHVpZCIsImlzU3RhdHVzVXBkYXRlIiwia2V5cyIsImxlbmd0aCIsImluY2x1ZGVzIiwidGVzdCIsImhvc3RQYXR0ZXJuIiwidW5kZWZpbmVkIiwiaXNOYU4iLCJnZXREcm9wZG93blNldHRpbmdzIiwib25DaGFuZ2VDYWxsYmFjayIsIm9wdGlvbnMiLCJzZXR0aW5ncyIsIm9uQ2hhbmdlIiwiaW5jbHVkZU5vbmUiLCJmb3JjZVNlbGVjdGlvbiIsImFwaVNldHRpbmdzIiwiY2FjaGUiLCJvblJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwcm92aWRlciIsInZhbHVlIiwibmFtZSIsInRleHQiLCJ1bnNoaWZ0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXJfQW55UHJvdmlkZXJfdjIiLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJhbGxvd0NhdGVnb3J5U2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwiZGlyZWN0aW9uIiwiJGNob2ljZSIsInZhbCIsInRyaWdnZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRTtBQUNQQyxJQUFBQSxPQUFPLEVBQUUsbUNBREY7QUFFUEMsSUFBQUEsU0FBUyxFQUFFLHFDQUZKO0FBR1BDLElBQUFBLFVBQVUsRUFBRSxzQ0FITDtBQUlQQyxJQUFBQSxZQUFZLEVBQUUsd0NBSlA7QUFLUEMsSUFBQUEsV0FBVyxFQUFFLHVDQUxOO0FBTVBDLElBQUFBLFlBQVksRUFBRTtBQU5QLEdBSk07O0FBYWpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lKLEVBQUFBLFNBQVMsRUFBRSxtQkFBU0ss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QUFLSDs7QUFFRCxpQkFBTztBQUNIUixZQUFBQSxPQUFPLEVBQUUsSUFETjtBQUVIQyxZQUFBQSxPQUFPLEVBQUVBO0FBRk4sV0FBUDtBQUlIO0FBOUNRLE9BRFY7QUFpREhRLE1BQUFBLFVBQVUsRUFBRSxJQWpEVDtBQWtESEMsTUFBQUEsY0FBYyxFQUFFLElBbERiO0FBbURIQyxNQUFBQSxnQkFBZ0IsRUFBRSxJQW5EZjtBQW9ESEMsTUFBQUEsY0FBYyxFQUFFLElBcERiO0FBcURIQyxNQUFBQSxzQkFBc0IsRUFBRSxLQXJEckI7QUFzREhqQixNQUFBQSxjQUFjLEVBQUVBLGNBdERiO0FBc0Q4QjtBQUNqQ2tCLE1BQUFBLFlBQVksRUFBRSxPQXZEWDtBQXdESEMsTUFBQUEsU0FBUyxFQUFFLFVBeERSO0FBeURIckIsTUFBQUEsUUFBUSxFQUFFLGtCQUFTUyxLQUFULEVBQWdCRSxJQUFoQixFQUFzQlcsT0FBdEIsRUFBK0I7QUFDckM7QUFDQTlGLFFBQUFBLENBQUMsQ0FBQyxrREFBRCxDQUFELENBQXNEK0YsR0FBdEQsQ0FBMERkLEtBQTFELEVBQWlFZSxPQUFqRSxDQUF5RSxRQUF6RSxFQUZxQyxDQUlyQzs7QUFDQSxZQUFJLE9BQU9uRyxRQUFQLEtBQW9CLFVBQXhCLEVBQW9DO0FBQ2hDQSxVQUFBQSxRQUFRLENBQUNvRixLQUFELEVBQVFFLElBQVIsRUFBY1csT0FBZCxDQUFSO0FBQ0g7QUFDSjtBQWpFRSxLQUFQO0FBbUVIO0FBbmRnQixDQUFyQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBTZWN1cml0eVV0aWxzLCBQYnhBcGkgKi9cblxuLyoqXG4gKiBQcm92aWRlcnNBUEkgLSBSRVNUIEFQSSB2MiBmb3IgcHJvdmlkZXJzIG1hbmFnZW1lbnRcbiAqIFxuICogUHJvdmlkZXMgY2VudHJhbGl6ZWQgQVBJIG1ldGhvZHMgd2l0aCBidWlsdC1pbiBzZWN1cml0eSBmZWF0dXJlczpcbiAqIC0gSW5wdXQgc2FuaXRpemF0aW9uIGZvciBkaXNwbGF5XG4gKiAtIFhTUyBwcm90ZWN0aW9uXG4gKiAtIENvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmdcbiAqIC0gQ1NSRiBwcm90ZWN0aW9uIHRocm91Z2ggc2Vzc2lvbiBjb29raWVzXG4gKi9cbmNvbnN0IFByb3ZpZGVyc0FQSSA9IHtcbiAgICAvKipcbiAgICAgKiBBUEkgZW5kcG9pbnRzIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBlbmRwb2ludHM6IHtcbiAgICAgICAgZ2V0TGlzdDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0TGlzdCcsXG4gICAgICAgIGdldFJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0UmVjb3JkJyxcbiAgICAgICAgc2F2ZVJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvc2F2ZVJlY29yZCcsXG4gICAgICAgIGRlbGV0ZVJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZGVsZXRlUmVjb3JkJyxcbiAgICAgICAgZ2V0U3RhdHVzZXM6ICcvcGJ4Y29yZS9hcGkvdjIvcHJvdmlkZXJzL2dldFN0YXR1c2VzJyxcbiAgICAgICAgdXBkYXRlU3RhdHVzOiAnL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy91cGRhdGVTdGF0dXMnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEIHdpdGggc2VjdXJpdHkgcHJvY2Vzc2luZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ld1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gUHJvdmlkZXIgdHlwZSAoU0lQIG9yIElBWClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UmVjb3JkOiBmdW5jdGlvbihpZCwgdHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAoIWlkIHx8IGlkID09PSAnJykgPyAnbmV3JyA6IGlkO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIFJFU1RmdWwgVVJMIHdpdGggcGF0aCBwYXJhbWV0ZXJzOiAvZ2V0UmVjb3JkL1NJUC9TSVAtVFJVTkstMTIzXG4gICAgICAgIC8vIEZhbGwgYmFjayB0byBxdWVyeSBwYXJhbWV0ZXJzIGZvciAnbmV3JyByZWNvcmRzXG4gICAgICAgIGxldCB1cmw7XG4gICAgICAgIGlmIChyZWNvcmRJZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgdXNlIHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICAgICAgICAgIHVybCA9IHRoaXMuZW5kcG9pbnRzLmdldFJlY29yZCArICh0eXBlID8gJz90eXBlPScgKyB0eXBlIDogJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMsIHVzZSBSRVNUZnVsIHBhdGg6IC9nZXRSZWNvcmQvU0lQL1NJUC1UUlVOSy0xMjNcbiAgICAgICAgICAgIHVybCA9IHRoaXMuZW5kcG9pbnRzLmdldFJlY29yZCArICcvJyArIHR5cGUgKyAnLycgKyByZWNvcmRJZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgZGF0YSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgYWxsIHByb3ZpZGVycyB3aXRoIHNlY3VyaXR5IHByb2Nlc3NpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0TGlzdDogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBpbmNsdWRlRGlzYWJsZWQ6ICd0cnVlJyAgLy8gQWx3YXlzIGluY2x1ZGUgZGlzYWJsZWQgcHJvdmlkZXJzIGluIGFkbWluIHBhbmVsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgYXJyYXkgb2YgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSByZXNwb25zZS5kYXRhLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogW119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIHByb3ZpZGVyIHJlY29yZCB3aXRoIHZhbGlkYXRpb24gYW5kIHNlY3VyaXR5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNhdmVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZDogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIXRoaXMudmFsaWRhdGVQcm92aWRlckRhdGEoZGF0YSkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ0NsaWVudC1zaWRlIHZhbGlkYXRpb24gZmFpbGVkJ119XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBib29sZWFuIGZpZWxkcyB0byAxLzAgZm9yIGZvcm0tZW5jb2RlZCB0cmFuc21pc3Npb25cbiAgICAgICAgY29uc3QgYm9vbGVhbkZpZWxkcyA9IFsnZGlzYWJsZWQnLCAncXVhbGlmeScsICdkaXNhYmxlZnJvbXVzZXInLCAnbm9yZWdpc3RlcicsICdyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCddO1xuICAgICAgICBjb25zdCBwcm9jZXNzZWREYXRhID0gey4uLmRhdGF9O1xuICAgICAgICBcbiAgICAgICAgYm9vbGVhbkZpZWxkcy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgIGlmIChwcm9jZXNzZWREYXRhLmhhc093blByb3BlcnR5KGZpZWxkKSkge1xuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgYm9vbGVhbiB0byAxLzAgZm9yIHNlcnZlclxuICAgICAgICAgICAgICAgIHByb2Nlc3NlZERhdGFbZmllbGRdID0gcHJvY2Vzc2VkRGF0YVtmaWVsZF0gPyAnMScgOiAnMCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbWV0aG9kID0gcHJvY2Vzc2VkRGF0YS5pZCA/ICdQVVQnIDogJ1BPU1QnO1xuICAgICAgICBjb25zdCB1cmwgPSBwcm9jZXNzZWREYXRhLmlkID8gXG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50cy5zYXZlUmVjb3JkICsgJy8nICsgcHJvY2Vzc2VkRGF0YS5pZCA6IFxuICAgICAgICAgICAgdGhpcy5lbmRwb2ludHMuc2F2ZVJlY29yZDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICBkYXRhOiBwcm9jZXNzZWREYXRhLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IHRoaXMuc2FuaXRpemVQcm92aWRlckRhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBwcm92aWRlciByZWNvcmRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZWNvcmQgSURcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkOiBmdW5jdGlvbihpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5kZWxldGVSZWNvcmQgKyAnLycgKyBpZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcHJvdmlkZXIgc3RhdHVzZXNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0U3RhdHVzZXM6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuZ2V0U3RhdHVzZXMsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiB7fX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzdGF0dXMgZm9yIGEgc3BlY2lmaWMgcHJvdmlkZXIgYnkgSURcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXJJZCAtIFByb3ZpZGVyIHVuaXF1ZSBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlclR5cGUgLSBQcm92aWRlciB0eXBlIChTSVAgb3IgSUFYKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRTdGF0dXNCeUlkOiBmdW5jdGlvbihwcm92aWRlcklkLCBwcm92aWRlclR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIEJ1aWxkIFVSTCB3aXRoIHR5cGUgaWYgcHJvdmlkZWQgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICBsZXQgdXJsID0gJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0U3RhdHVzLyc7XG4gICAgICAgIGlmIChwcm92aWRlclR5cGUpIHtcbiAgICAgICAgICAgIHVybCArPSBwcm92aWRlclR5cGUudG9VcHBlckNhc2UoKSArICcvJyArIHByb3ZpZGVySWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmwgKz0gcHJvdmlkZXJJZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiBudWxsfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHByb3ZpZGVyIHN0YXR1cyAoZW5hYmxlL2Rpc2FibGUpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHdpdGggaWQsIHR5cGUsIGFuZCBkaXNhYmxlZCBzdGF0dXNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzOiBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgaWYgKCFkYXRhLmlkIHx8ICFkYXRhLnR5cGUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ1Byb3ZpZGVyIElEIGFuZCB0eXBlIGFyZSByZXF1aXJlZCddfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgZGF0YSB0byBwcm9wZXIgZm9ybWF0XG4gICAgICAgIGNvbnN0IHVwZGF0ZURhdGEgPSB7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgICAgIHR5cGU6IGRhdGEudHlwZS50b1VwcGVyQ2FzZSgpLFxuICAgICAgICAgICAgZGlzYWJsZWQ6ICEhZGF0YS5kaXNhYmxlZFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy51cGRhdGVTdGF0dXMsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHVwZGF0ZURhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhbml0aXplIHByb3ZpZGVyIGRhdGEgZm9yIHNlY3VyZSBkaXNwbGF5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBEYXRhIHJlYWR5IGZvciBkaXNwbGF5XG4gICAgICovXG4gICAgc2FuaXRpemVQcm92aWRlckRhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgaWYgKCFkYXRhKSByZXR1cm4gZGF0YTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNhbml0aXplZCA9IHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdW5pcWlkOiBkYXRhLnVuaXFpZCxcbiAgICAgICAgICAgIHR5cGU6IGRhdGEudHlwZSB8fCAnU0lQJyxcbiAgICAgICAgICAgIG5vdGU6IGRhdGEubm90ZSB8fCAnJyxcbiAgICAgICAgICAgIGRpc2FibGVkOiAhIWRhdGEuZGlzYWJsZWRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gJ1NJUCcgfHwgZGF0YS5zaXB1aWQpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oc2FuaXRpemVkLCB7XG4gICAgICAgICAgICAgICAgc2lwdWlkOiBkYXRhLnNpcHVpZCB8fCAnJyxcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogZGF0YS51c2VybmFtZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBzZWNyZXQ6IGRhdGEuc2VjcmV0IHx8ICcnLFxuICAgICAgICAgICAgICAgIGhvc3Q6IGRhdGEuaG9zdCB8fCAnJyxcbiAgICAgICAgICAgICAgICBwb3J0OiBwYXJzZUludChkYXRhLnBvcnQpIHx8IDUwNjAsXG4gICAgICAgICAgICAgICAgdHJhbnNwb3J0OiBkYXRhLnRyYW5zcG9ydCB8fCAnVURQJyxcbiAgICAgICAgICAgICAgICBxdWFsaWZ5OiAhIWRhdGEucXVhbGlmeSxcbiAgICAgICAgICAgICAgICBxdWFsaWZ5ZnJlcTogcGFyc2VJbnQoZGF0YS5xdWFsaWZ5ZnJlcSkgfHwgNjAsXG4gICAgICAgICAgICAgICAgcmVnaXN0cmF0aW9uX3R5cGU6IGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgJ291dGJvdW5kJyxcbiAgICAgICAgICAgICAgICBleHRlbnNpb246IGRhdGEuZXh0ZW5zaW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkYXRhLmRlc2NyaXB0aW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIG5ldHdvcmtmaWx0ZXJpZDogZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJycsXG4gICAgICAgICAgICAgICAgbWFudWFsYXR0cmlidXRlczogZGF0YS5tYW51YWxhdHRyaWJ1dGVzIHx8ICcnLFxuICAgICAgICAgICAgICAgIGR0bWZtb2RlOiBkYXRhLmR0bWZtb2RlIHx8ICdhdXRvJyxcbiAgICAgICAgICAgICAgICBuYXQ6IGRhdGEubmF0IHx8ICdhdXRvX2ZvcmNlJyxcbiAgICAgICAgICAgICAgICBmcm9tdXNlcjogZGF0YS5mcm9tdXNlciB8fCAnJyxcbiAgICAgICAgICAgICAgICBmcm9tZG9tYWluOiBkYXRhLmZyb21kb21haW4gfHwgJycsXG4gICAgICAgICAgICAgICAgb3V0Ym91bmRfcHJveHk6IGRhdGEub3V0Ym91bmRfcHJveHkgfHwgJycsXG4gICAgICAgICAgICAgICAgZGlzYWJsZWZyb211c2VyOiAhIWRhdGEuZGlzYWJsZWZyb211c2VyLFxuICAgICAgICAgICAgICAgIG5vcmVnaXN0ZXI6ICEhZGF0YS5ub3JlZ2lzdGVyLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoOiAhIWRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbEhvc3RzOiBkYXRhLmFkZGl0aW9uYWxIb3N0cyB8fCBbXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gJ0lBWCcgfHwgZGF0YS5pYXh1aWQpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oc2FuaXRpemVkLCB7XG4gICAgICAgICAgICAgICAgaWF4dWlkOiBkYXRhLmlheHVpZCB8fCAnJyxcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogZGF0YS51c2VybmFtZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBzZWNyZXQ6IGRhdGEuc2VjcmV0IHx8ICcnLFxuICAgICAgICAgICAgICAgIGhvc3Q6IGRhdGEuaG9zdCB8fCAnJyxcbiAgICAgICAgICAgICAgICBxdWFsaWZ5OiAhIWRhdGEucXVhbGlmeSxcbiAgICAgICAgICAgICAgICByZWdpc3RyYXRpb25fdHlwZTogZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCAnbm9uZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgbWFudWFsYXR0cmlidXRlczogZGF0YS5tYW51YWxhdHRyaWJ1dGVzIHx8ICcnLFxuICAgICAgICAgICAgICAgIG5vcmVnaXN0ZXI6ICEhZGF0YS5ub3JlZ2lzdGVyLFxuICAgICAgICAgICAgICAgIG5ldHdvcmtmaWx0ZXJpZDogZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJycsXG4gICAgICAgICAgICAgICAgcG9ydDogZGF0YS5wb3J0IHx8ICcnLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoOiAhIWRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGhcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2FuaXRpemVkO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byB2YWxpZGF0ZVxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICovXG4gICAgdmFsaWRhdGVQcm92aWRlckRhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIHN0YXR1cy1vbmx5IHVwZGF0ZSAoY29udGFpbnMgb25seSBpZCwgdHlwZSwgZGlzYWJsZWQpXG4gICAgICAgIGNvbnN0IGlzU3RhdHVzVXBkYXRlID0gZGF0YS5pZCAmJiBkYXRhLnR5cGUgJiYgZGF0YS5oYXNPd25Qcm9wZXJ0eSgnZGlzYWJsZWQnKSAmJiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCA9PT0gMztcbiAgICAgICAgXG4gICAgICAgIGlmIChpc1N0YXR1c1VwZGF0ZSkge1xuICAgICAgICAgICAgLy8gTWluaW1hbCB2YWxpZGF0aW9uIGZvciBzdGF0dXMgdXBkYXRlc1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudHlwZSAmJiBbJ1NJUCcsICdJQVgnXS5pbmNsdWRlcyhkYXRhLnR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUeXBlIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKCFkYXRhLnR5cGUgfHwgIVsnU0lQJywgJ0lBWCddLmluY2x1ZGVzKGRhdGEudHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlcm5hbWUgdmFsaWRhdGlvbiAoYWxwaGFudW1lcmljIGFuZCBiYXNpYyBzeW1ib2xzKVxuICAgICAgICBpZiAoZGF0YS51c2VybmFtZSAmJiAhL15bYS16QS1aMC05Ll8tXSokLy50ZXN0KGRhdGEudXNlcm5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhvc3QgdmFsaWRhdGlvbiAoZG9tYWluIG9yIElQKVxuICAgICAgICBpZiAoZGF0YS5ob3N0KSB7XG4gICAgICAgICAgICBjb25zdCBob3N0UGF0dGVybiA9IC9eKFthLXpBLVowLTkuLV0rfFxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9KSQvO1xuICAgICAgICAgICAgaWYgKCFob3N0UGF0dGVybi50ZXN0KGRhdGEuaG9zdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBvcnQgdmFsaWRhdGlvblxuICAgICAgICBpZiAoZGF0YS5wb3J0ICE9PSB1bmRlZmluZWQgJiYgZGF0YS5wb3J0ICE9PSBudWxsICYmIGRhdGEucG9ydCAhPT0gJycpIHtcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBwYXJzZUludChkYXRhLnBvcnQpO1xuICAgICAgICAgICAgaWYgKGlzTmFOKHBvcnQpIHx8IHBvcnQgPCAxIHx8IHBvcnQgPiA2NTUzNSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHJhbnNwb3J0IHZhbGlkYXRpb24gZm9yIFNJUFxuICAgICAgICBpZiAoZGF0YS50eXBlID09PSAnU0lQJyAmJiBkYXRhLnRyYW5zcG9ydCkge1xuICAgICAgICAgICAgaWYgKCFbJ1VEUCcsICdUQ1AnLCAnVExTJ10uaW5jbHVkZXMoZGF0YS50cmFuc3BvcnQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gdmFsaWRhdGlvbiAobnVtZXJpYyBvbmx5KVxuICAgICAgICBpZiAoZGF0YS5leHRlbnNpb24gJiYgIS9eWzAtOV0qJC8udGVzdChkYXRhLmV4dGVuc2lvbikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHByb3ZpZGVyIHNlbGVjdGlvbiAtIEJBQ0tXQVJEIENPTVBBVElCSUxJVFlcbiAgICAgKiBUaGlzIG1ldGhvZCBtYWludGFpbnMgY29tcGF0aWJpbGl0eSB3aXRoIGV4aXN0aW5nIGZvcm1zIHRoYXQgdXNlIHRoZSBvbGQgQVBJXG4gICAgICogXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbnxvYmplY3R9IG9uQ2hhbmdlQ2FsbGJhY2sgLSBDYWxsYmFjayB3aGVuIHNlbGVjdGlvbiBjaGFuZ2VzIE9SIG9wdGlvbnMgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBBZGRpdGlvbmFsIG9wdGlvbnMgKHdoZW4gZmlyc3QgcGFyYW0gaXMgY2FsbGJhY2spXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBTZW1hbnRpYyBVSSBkcm9wZG93biBzZXR0aW5ncyBvYmplY3RcbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzOiBmdW5jdGlvbihvbkNoYW5nZUNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgICAgIC8vIEhhbmRsZSBkaWZmZXJlbnQgcGFyYW1ldGVyIGNvbWJpbmF0aW9uc1xuICAgICAgICBsZXQgY2FsbGJhY2sgPSBvbkNoYW5nZUNhbGxiYWNrO1xuICAgICAgICBsZXQgc2V0dGluZ3MgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgZmlyc3QgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCwgdHJlYXQgaXQgYXMgb3B0aW9uc1xuICAgICAgICBpZiAodHlwZW9mIG9uQ2hhbmdlQ2FsbGJhY2sgPT09ICdvYmplY3QnICYmIG9uQ2hhbmdlQ2FsbGJhY2sgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHNldHRpbmdzID0gb25DaGFuZ2VDYWxsYmFjaztcbiAgICAgICAgICAgIGNhbGxiYWNrID0gc2V0dGluZ3Mub25DaGFuZ2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlZmF1bHQgdmFsdWVzXG4gICAgICAgIGNvbnN0IGluY2x1ZGVOb25lID0gc2V0dGluZ3MuaW5jbHVkZU5vbmUgIT09IHVuZGVmaW5lZCA/IHNldHRpbmdzLmluY2x1ZGVOb25lIDogdHJ1ZTtcbiAgICAgICAgY29uc3QgZm9yY2VTZWxlY3Rpb24gPSBzZXR0aW5ncy5mb3JjZVNlbGVjdGlvbiAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuZm9yY2VTZWxlY3Rpb24gOiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBuZXcgUkVTVCBBUEkgdjIgZW5kcG9pbnRcbiAgICAgICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmdldExpc3QsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRGlzYWJsZWQ6ICdmYWxzZScgIC8vIE9ubHkgc2hvdyBlbmFibGVkIHByb3ZpZGVycyBpbiBkcm9wZG93bnNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCB8fCAhcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJhbnNmb3JtIEFQSSByZXNwb25zZSB0byBkcm9wZG93biBmb3JtYXRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IHJlc3BvbnNlLmRhdGEubWFwKGZ1bmN0aW9uKHByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVc2UgdGhlICduYW1lJyBmaWVsZCBmcm9tIHNlcnZlciBhcy1pcywgaXQgYWxyZWFkeSBjb250YWlucyB0aGUgaWNvblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VydmVyIHNlbmRzOiBcIjxpIGNsYXNzPVxcXCJzZXJ2ZXIgaWNvblxcXCI+PC9pPiBJQVg6IFRlc3QgSUFYIFByb3ZpZGVyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvdmlkZXIudW5pcWlkLCAgICAgIC8vIFVzZSB1bmlxaWQgYXMgdGhlIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcHJvdmlkZXIubmFtZSwgICAgICAgICAgLy8gVXNlIHNlcnZlcidzIG5hbWUgZmllbGQgYXMtaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBwcm92aWRlci5uYW1lLCAgICAgICAgICAvLyBTYW1lIGZvciB0ZXh0IGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBhZGRpdGlvbmFsIGRhdGEgZm9yIGZ1dHVyZSB1c2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlclR5cGU6IHByb3ZpZGVyLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJJZDogcHJvdmlkZXIuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9zdDogcHJvdmlkZXIuaG9zdCB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogcHJvdmlkZXIudXNlcm5hbWUgfHwgJydcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkICdOb25lJyBvcHRpb24gYXQgdGhlIGJlZ2lubmluZyBvbmx5IGlmIGluY2x1ZGVOb25lIGlzIHRydWVcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVOb25lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnVuc2hpZnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnbm9uZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogZ2xvYmFsVHJhbnNsYXRlLmlyX0FueVByb3ZpZGVyX3YyIHx8ICdBbnkgcHJvdmlkZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pcl9BbnlQcm92aWRlcl92MiB8fCAnQW55IHByb3ZpZGVyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogcmVzdWx0c1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmb3JjZVNlbGVjdGlvbiwgIC8vIFVzZSB0aGUgZm9yY2VTZWxlY3Rpb24gcGFyYW1ldGVyXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRjaG9pY2UpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IGZpZWxkcyBmb3IgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwicHJvdmlkZXJcIl0sIGlucHV0W25hbWU9XCJwcm92aWRlcmlkXCJdJykudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBwcm92aWRlZCBjYWxsYmFjayBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxufTsiXX0=