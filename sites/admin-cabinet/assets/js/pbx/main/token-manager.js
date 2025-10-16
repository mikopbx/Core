"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global globalRootUrl */

/**
 * TokenManager - manages JWT authentication tokens
 *
 * Security architecture:
 * - Access token (JWT, 15 min) stored in MEMORY (not localStorage - XSS protection)
 * - Refresh token (30 days) stored in httpOnly cookie (XSS protection)
 * - Silent refresh timer updates access token before expiration
 * - All AJAX requests automatically include Authorization: Bearer header
 *
 * @module TokenManager
 */
var TokenManager = {
  /**
   * Access token (JWT) stored in memory - NEVER in localStorage/sessionStorage
   * @type {string|null}
   */
  accessToken: null,

  /**
   * Timer for silent token refresh
   * @type {number|null}
   */
  refreshTimer: null,

  /**
   * Flag to prevent multiple simultaneous refresh attempts
   * @type {boolean}
   */
  isRefreshing: false,

  /**
   * Flag to prevent multiple initializations
   * @type {boolean}
   */
  isInitialized: false,

  /**
   * Initialize TokenManager
   * - Attempts to refresh access token using refresh token cookie
   * - Redirects to login if no valid refresh token
   *
   * Note: setupGlobalAjax() is called automatically on script load,
   * not here, to ensure it's active before ANY AJAX requests are made.
   *
   * @returns {Promise<boolean>} true if authentication successful
   */
  initialize: async function initialize() {
    console.log('TokenManager.initialize() called'); // Prevent multiple initializations

    if (this.isInitialized) {
      console.log('TokenManager already initialized, skipping');
      return this.accessToken !== null;
    } // Try to get access token using refresh token cookie


    var hasToken = await this.startupRefresh();
    console.log('Startup refresh result:', hasToken);

    if (!hasToken) {
      // No valid refresh token → redirect to login
      console.log('No valid token - redirecting to login');
      window.location = "".concat(globalRootUrl, "session/index");
      return false;
    }

    console.log('TokenManager initialized successfully');
    this.isInitialized = true;
    return true;
  },

  /**
   * Startup refresh - get new access token using refresh token cookie
   * Called on page load to restore authentication state
   *
   * @returns {Promise<boolean>} true if refresh successful
   */
  startupRefresh: async function startupRefresh() {
    console.log('TokenManager.startupRefresh() called');

    if (this.isRefreshing) {
      console.log('Already refreshing, skipping');
      return false;
    }

    this.isRefreshing = true;

    try {
      console.log('Calling /auth:refresh to get access token');
      var response = await $.ajax({
        url: '/pbxcore/api/v3/auth:refresh',
        method: 'POST',
        dataType: 'json',
        // Don't send Authorization header (using refresh cookie)
        headers: {}
      });
      console.log('Refresh response:', response);

      if (response.result && response.data && response.data.accessToken) {
        console.log('Got access token, expires in:', response.data.expiresIn);
        this.setAccessToken(response.data.accessToken, response.data.expiresIn);
        return true;
      } else {
        console.log('Refresh token expired or invalid - no accessToken in response');
        return false;
      }
    } catch (error) {
      console.log('Refresh failed:', error.status, error.statusText, error.responseJSON);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  },

  /**
   * Store access token in memory and schedule silent refresh
   *
   * @param {string} token JWT access token
   * @param {number} expiresIn Token lifetime in seconds
   */
  setAccessToken: function setAccessToken(token, expiresIn) {
    var _this = this;

    console.log('Setting access token, expires in:', expiresIn, 'seconds');
    this.accessToken = token; // Update Stoplight Elements localStorage with new token
    // WHY: Elements reads from localStorage.TryIt_securitySchemeValues for "Try It" functionality
    // This keeps the token fresh after silent refresh (every 13 minutes)

    try {
      localStorage.setItem('TryIt_securitySchemeValues', JSON.stringify({
        'bearerAuth': token
      }));
    } catch (e) {
      console.log('Failed to update localStorage for Stoplight Elements:', e);
    } // Clear existing timer


    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    } // Schedule silent refresh 2 minutes before expiration
    // Default: 900s (15 min) - 120s = 780s (13 min)


    var refreshAt = Math.max(expiresIn - 120, 60) * 1000;
    console.log('Silent refresh scheduled in:', refreshAt / 1000, 'seconds');
    this.refreshTimer = setTimeout(function () {
      _this.silentRefresh();
    }, refreshAt);
  },

  /**
   * Silent refresh - update access token before it expires
   * Automatically called by timer, transparent to user
   */
  silentRefresh: async function silentRefresh() {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;

    try {
      var response = await $.ajax({
        url: '/pbxcore/api/v3/auth:refresh',
        method: 'POST',
        dataType: 'json',
        // Don't send Authorization header (using refresh cookie)
        headers: {}
      });

      if (response.result && response.data && response.data.accessToken) {
        this.setAccessToken(response.data.accessToken, response.data.expiresIn);
      } else {
        // Refresh failed → logout
        this.logout();
      }
    } catch (error) {
      console.error('Silent refresh failed:', error); // Refresh failed → logout

      this.logout();
    } finally {
      this.isRefreshing = false;
    }
  },

  /**
   * Set up global AJAX interceptor
   * Automatically adds Authorization: Bearer header to all AJAX requests
   * Handles 401 errors by logging out
   */
  setupGlobalAjax: function setupGlobalAjax() {
    var self = this; // Store original $.ajax

    var originalAjax = $.ajax; // Wrap $.ajax to wait for token initialization

    $.ajax = function (url, options) {
      var _this2 = this;

      // Handle both $.ajax(url, options) and $.ajax(options) signatures
      if (_typeof(url) === 'object') {
        options = url;
        url = undefined;
      } // Skip auth endpoints (they use refresh cookie, not access token)


      var requestUrl = url || options.url || '';

      if (requestUrl.includes('/auth:login') || requestUrl.includes('/auth:refresh')) {
        return originalAjax.apply(this, arguments);
      } // Wait for TokenManager initialization before proceeding


      if (window.tokenManagerReady) {
        // Create jQuery Deferred to maintain compatibility with jQuery code
        var deferred = $.Deferred();
        window.tokenManagerReady.then(function () {
          // Add Authorization header
          options = options || {};
          options.headers = options.headers || {};

          if (self.accessToken && !options.headers.Authorization) {
            options.headers.Authorization = "Bearer ".concat(self.accessToken);
          } // Call original $.ajax and forward its result to our deferred


          var jqXHR = url ? originalAjax.call(_this2, url, options) : originalAjax.call(_this2, options); // Forward all callbacks

          jqXHR.done(function () {
            return deferred.resolve.apply(deferred, arguments);
          }).fail(function () {
            return deferred.reject.apply(deferred, arguments);
          });
        })["catch"](function (error) {
          console.error('TokenManager initialization failed:', error);
          deferred.reject(error);
        });
        return deferred.promise();
      } // TokenManager not initialized yet - proceed without token
      // (this should only happen on login page)


      return originalAjax.apply(this, arguments);
    }; // Also set up error handler


    $(document).ajaxError(function (event, xhr, settings) {
      // Handle unauthorized errors
      if (xhr.status === 401) {
        // Check if we're on login page - don't trigger logout loop
        var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

        if (!isLoginPage) {
          // Token expired or invalid → logout
          self.logout();
        }
      }
    }); // Wrap Semantic UI $.api() if available
    // This is needed because some modules use $.api() instead of $.ajax()

    if ($.fn.api) {
      var originalApi = $.fn.api;

      $.fn.api = function (settings) {
        // Get settings
        var config = settings || {}; // Skip auth endpoints

        var url = config.url || '';

        if (url.includes('/auth:login') || url.includes('/auth:refresh')) {
          return originalApi.call(this, settings);
        } // Wrap beforeSend to add Authorization header


        var originalBeforeSend = config.beforeSend;

        config.beforeSend = function (settings) {
          var _this3 = this;

          // Wait for TokenManager if available
          if (window.tokenManagerReady) {
            var deferred = $.Deferred();
            window.tokenManagerReady.then(function () {
              // Add Authorization header
              settings.beforeXHR = function (xhr) {
                if (self.accessToken) {
                  xhr.setRequestHeader('Authorization', "Bearer ".concat(self.accessToken));
                }
              }; // Call original beforeSend if exists


              if (originalBeforeSend) {
                originalBeforeSend.call(_this3, settings);
              }

              deferred.resolve(settings);
            });
            return deferred.promise();
          } // Call original beforeSend


          if (originalBeforeSend) {
            return originalBeforeSend.call(this, settings);
          }

          return settings;
        };

        return originalApi.call(this, config);
      };
    }
  },

  /**
   * Logout - clear tokens and redirect to login
   * - Calls REST API to invalidate refresh token
   * - Clears access token from memory
   * - Deletes refreshToken cookie from browser
   * - Redirects to login page
   */
  logout: async function logout() {
    console.log('TokenManager.logout() called'); // Check if already on login page - prevent redirect loop

    var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

    if (isLoginPage) {
      console.log('Already on login page - clearing state and cookie'); // Already on login page - clear state

      this.accessToken = null;

      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      } // CRITICAL: Clear httpOnly cookie via server-side AJAX endpoint
      // This prevents authentication loop when refreshToken exists but is expired


      $.ajax({
        url: "".concat(globalRootUrl, "session/end"),
        method: 'POST',
        async: false,
        // Synchronous to ensure cookie is cleared
        success: function success() {
          console.log('Cookie cleared via /session/end');
        },
        error: function error(_jqXHR, status, _error) {
          console.log('Error clearing cookie:', status, _error);
        }
      });
      return;
    } // Prevent multiple logout calls


    if (!this.accessToken) {
      console.log('No access token - clearing cookie via /session/end'); // CRITICAL: Clear httpOnly cookie via server-side endpoint before redirect

      try {
        $.ajax({
          url: "".concat(globalRootUrl, "session/end"),
          method: 'POST',
          async: false,
          // Synchronous to ensure cookie is cleared before redirect
          success: function success() {
            console.log('Cookie cleared via /session/end');
          }
        });
      } catch (e) {
        console.log('Error clearing cookie:', e);
      }

      window.location = "".concat(globalRootUrl, "session/index");
      return;
    }

    try {
      // Call logout endpoint to invalidate refresh token in Redis
      console.log('Calling /auth:logout API');
      await $.ajax({
        url: '/pbxcore/api/v3/auth:logout',
        method: 'POST',
        headers: {
          Authorization: "Bearer ".concat(this.accessToken)
        }
      });
      console.log('Logout API call successful');
    } catch (error) {
      console.log('Logout API error:', error.status, error.statusText); // If API fails (e.g., 401 with expired token), we still need to clear the cookie
      // Use server-side session/end endpoint as fallback to clear httpOnly cookie

      console.log('Using /session/end fallback to clear cookie');
    } // Clear local state


    this.accessToken = null;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    } // CRITICAL: Redirect to /session/end which clears httpOnly cookie server-side
    // This prevents authentication loop when refreshToken cookie exists but is expired


    console.log('Redirecting to /session/end to clear cookie');
    window.location = "".concat(globalRootUrl, "session/end");
  },

  /**
   * Delete refreshToken cookie from browser
   *
   * IMPORTANT: httpOnly cookies CANNOT be deleted via JavaScript (document.cookie).
   * They can only be cleared by the server via Set-Cookie header.
   *
   * The /auth:logout endpoint handles cookie deletion on server side.
   * This method exists for non-httpOnly fallback scenarios only.
   *
   * For httpOnly cookies, we rely on:
   * 1. Server-side cookie deletion in /auth:logout response
   * 2. SessionController.endAction() which also clears the cookie
   */
  deleteRefreshTokenCookie: function deleteRefreshTokenCookie() {
    console.log('Attempting to delete refreshToken cookie (client-side)'); // NOTE: This won't work for httpOnly cookies, but try anyway for non-httpOnly fallback

    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict'; // For HTTPS (secure flag)

    if (window.location.protocol === 'https:') {
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict';
    }

    console.log('Client-side cookie deletion attempted (httpOnly cookies require server-side deletion)');
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} true if access token exists
   */
  isAuthenticated: function isAuthenticated() {
    return this.accessToken !== null;
  }
}; // Export for use in other modules

window.TokenManager = TokenManager; // CRITICAL: Set up AJAX interceptor IMMEDIATELY on script load
// This ensures ALL AJAX requests wait for TokenManager initialization
// even if they're fired before $(document).ready()

TokenManager.setupGlobalAjax(); // CRITICAL: Create tokenManagerReady promise IMMEDIATELY
// Check if we're on login page - if not, start initialization right away
// This ensures the promise exists before ANY other script runs

if (typeof window !== 'undefined') {
  // Prevent multiple initializations on the same page
  if (!window.tokenManagerReady) {
    console.log('Creating tokenManagerReady promise');
    var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

    if (!isLoginPage) {
      // Not login page - start TokenManager initialization immediately
      // This happens BEFORE $(document).ready, ensuring token is ready ASAP
      window.tokenManagerReady = TokenManager.initialize();
    } else {
      // Login page - resolve immediately (no authentication needed)
      window.tokenManagerReady = Promise.resolve(true);
    }
  } else {
    console.log('tokenManagerReady already exists, skipping initialization');
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Rva2VuLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJyZWZyZXNoVGltZXIiLCJpc1JlZnJlc2hpbmciLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImNvbnNvbGUiLCJsb2ciLCJoYXNUb2tlbiIsInN0YXJ0dXBSZWZyZXNoIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwicmVzcG9uc2UiLCIkIiwiYWpheCIsInVybCIsIm1ldGhvZCIsImRhdGFUeXBlIiwiaGVhZGVycyIsInJlc3VsdCIsImRhdGEiLCJleHBpcmVzSW4iLCJzZXRBY2Nlc3NUb2tlbiIsImVycm9yIiwic3RhdHVzIiwic3RhdHVzVGV4dCIsInJlc3BvbnNlSlNPTiIsInRva2VuIiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsIkpTT04iLCJzdHJpbmdpZnkiLCJlIiwiY2xlYXJUaW1lb3V0IiwicmVmcmVzaEF0IiwiTWF0aCIsIm1heCIsInNldFRpbWVvdXQiLCJzaWxlbnRSZWZyZXNoIiwibG9nb3V0Iiwic2V0dXBHbG9iYWxBamF4Iiwic2VsZiIsIm9yaWdpbmFsQWpheCIsIm9wdGlvbnMiLCJ1bmRlZmluZWQiLCJyZXF1ZXN0VXJsIiwiaW5jbHVkZXMiLCJhcHBseSIsImFyZ3VtZW50cyIsInRva2VuTWFuYWdlclJlYWR5IiwiZGVmZXJyZWQiLCJEZWZlcnJlZCIsInRoZW4iLCJBdXRob3JpemF0aW9uIiwianFYSFIiLCJjYWxsIiwiZG9uZSIsInJlc29sdmUiLCJmYWlsIiwicmVqZWN0IiwicHJvbWlzZSIsImRvY3VtZW50IiwiYWpheEVycm9yIiwiZXZlbnQiLCJ4aHIiLCJzZXR0aW5ncyIsImlzTG9naW5QYWdlIiwicGF0aG5hbWUiLCJmbiIsImFwaSIsIm9yaWdpbmFsQXBpIiwiY29uZmlnIiwib3JpZ2luYWxCZWZvcmVTZW5kIiwiYmVmb3JlU2VuZCIsImJlZm9yZVhIUiIsInNldFJlcXVlc3RIZWFkZXIiLCJhc3luYyIsInN1Y2Nlc3MiLCJfanFYSFIiLCJkZWxldGVSZWZyZXNoVG9rZW5Db29raWUiLCJjb29raWUiLCJwcm90b2NvbCIsImlzQXV0aGVudGljYXRlZCIsIlByb21pc2UiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFLElBTEk7O0FBT2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQVhHOztBQWFqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsS0FqQkc7O0FBbUJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsS0F2QkU7O0FBeUJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNVQyxFQUFBQSxVQW5DVyw4QkFtQ0U7QUFDZkMsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksa0NBQVosRUFEZSxDQUdmOztBQUNBLFFBQUksS0FBS0gsYUFBVCxFQUF3QjtBQUNwQkUsTUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksNENBQVo7QUFDQSxhQUFPLEtBQUtOLFdBQUwsS0FBcUIsSUFBNUI7QUFDSCxLQVBjLENBU2Y7OztBQUNBLFFBQU1PLFFBQVEsR0FBRyxNQUFNLEtBQUtDLGNBQUwsRUFBdkI7QUFFQUgsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVkseUJBQVosRUFBdUNDLFFBQXZDOztBQUVBLFFBQUksQ0FBQ0EsUUFBTCxFQUFlO0FBQ1g7QUFDQUYsTUFBQUEsT0FBTyxDQUFDQyxH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QUEsTUFBTSxDQUFDd0MsaUJBQVAsR0FBMkJrQyxPQUFPLENBQUMxQixPQUFSLENBQWdCLElBQWhCLENBQTNCO0FBQ0g7QUFDSixHQWRELE1BY087QUFDSHBELElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLDJEQUFaO0FBQ0g7QUFDSiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsICovXG5cbi8qKlxuICogVG9rZW5NYW5hZ2VyIC0gbWFuYWdlcyBKV1QgYXV0aGVudGljYXRpb24gdG9rZW5zXG4gKlxuICogU2VjdXJpdHkgYXJjaGl0ZWN0dXJlOlxuICogLSBBY2Nlc3MgdG9rZW4gKEpXVCwgMTUgbWluKSBzdG9yZWQgaW4gTUVNT1JZIChub3QgbG9jYWxTdG9yYWdlIC0gWFNTIHByb3RlY3Rpb24pXG4gKiAtIFJlZnJlc2ggdG9rZW4gKDMwIGRheXMpIHN0b3JlZCBpbiBodHRwT25seSBjb29raWUgKFhTUyBwcm90ZWN0aW9uKVxuICogLSBTaWxlbnQgcmVmcmVzaCB0aW1lciB1cGRhdGVzIGFjY2VzcyB0b2tlbiBiZWZvcmUgZXhwaXJhdGlvblxuICogLSBBbGwgQUpBWCByZXF1ZXN0cyBhdXRvbWF0aWNhbGx5IGluY2x1ZGUgQXV0aG9yaXphdGlvbjogQmVhcmVyIGhlYWRlclxuICpcbiAqIEBtb2R1bGUgVG9rZW5NYW5hZ2VyXG4gKi9cbmNvbnN0IFRva2VuTWFuYWdlciA9IHtcbiAgICAvKipcbiAgICAgKiBBY2Nlc3MgdG9rZW4gKEpXVCkgc3RvcmVkIGluIG1lbW9yeSAtIE5FVkVSIGluIGxvY2FsU3RvcmFnZS9zZXNzaW9uU3RvcmFnZVxuICAgICAqIEB0eXBlIHtzdHJpbmd8bnVsbH1cbiAgICAgKi9cbiAgICBhY2Nlc3NUb2tlbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRpbWVyIGZvciBzaWxlbnQgdG9rZW4gcmVmcmVzaFxuICAgICAqIEB0eXBlIHtudW1iZXJ8bnVsbH1cbiAgICAgKi9cbiAgICByZWZyZXNoVGltZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgbXVsdGlwbGUgc2ltdWx0YW5lb3VzIHJlZnJlc2ggYXR0ZW1wdHNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc1JlZnJlc2hpbmc6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byBwcmV2ZW50IG11bHRpcGxlIGluaXRpYWxpemF0aW9uc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBUb2tlbk1hbmFnZXJcbiAgICAgKiAtIEF0dGVtcHRzIHRvIHJlZnJlc2ggYWNjZXNzIHRva2VuIHVzaW5nIHJlZnJlc2ggdG9rZW4gY29va2llXG4gICAgICogLSBSZWRpcmVjdHMgdG8gbG9naW4gaWYgbm8gdmFsaWQgcmVmcmVzaCB0b2tlblxuICAgICAqXG4gICAgICogTm90ZTogc2V0dXBHbG9iYWxBamF4KCkgaXMgY2FsbGVkIGF1dG9tYXRpY2FsbHkgb24gc2NyaXB0IGxvYWQsXG4gICAgICogbm90IGhlcmUsIHRvIGVuc3VyZSBpdCdzIGFjdGl2ZSBiZWZvcmUgQU5ZIEFKQVggcmVxdWVzdHMgYXJlIG1hZGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxib29sZWFuPn0gdHJ1ZSBpZiBhdXRoZW50aWNhdGlvbiBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1Rva2VuTWFuYWdlci5pbml0aWFsaXplKCkgY2FsbGVkJyk7XG5cbiAgICAgICAgLy8gUHJldmVudCBtdWx0aXBsZSBpbml0aWFsaXphdGlvbnNcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Rva2VuTWFuYWdlciBhbHJlYWR5IGluaXRpYWxpemVkLCBza2lwcGluZycpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWNjZXNzVG9rZW4gIT09IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcnkgdG8gZ2V0IGFjY2VzcyB0b2tlbiB1c2luZyByZWZyZXNoIHRva2VuIGNvb2tpZVxuICAgICAgICBjb25zdCBoYXNUb2tlbiA9IGF3YWl0IHRoaXMuc3RhcnR1cFJlZnJlc2goKTtcblxuICAgICAgICBjb25zb2xlLmxvZygnU3RhcnR1cCByZWZyZXNoIHJlc3VsdDonLCBoYXNUb2tlbik7XG5cbiAgICAgICAgaWYgKCFoYXNUb2tlbikge1xuICAgICAgICAgICAgLy8gTm8gdmFsaWQgcmVmcmVzaCB0b2tlbiDihpIgcmVkaXJlY3QgdG8gbG9naW5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdObyB2YWxpZCB0b2tlbiAtIHJlZGlyZWN0aW5nIHRvIGxvZ2luJyk7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1Rva2VuTWFuYWdlciBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0dXAgcmVmcmVzaCAtIGdldCBuZXcgYWNjZXNzIHRva2VuIHVzaW5nIHJlZnJlc2ggdG9rZW4gY29va2llXG4gICAgICogQ2FsbGVkIG9uIHBhZ2UgbG9hZCB0byByZXN0b3JlIGF1dGhlbnRpY2F0aW9uIHN0YXRlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxib29sZWFuPn0gdHJ1ZSBpZiByZWZyZXNoIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBhc3luYyBzdGFydHVwUmVmcmVzaCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1Rva2VuTWFuYWdlci5zdGFydHVwUmVmcmVzaCgpIGNhbGxlZCcpO1xuXG4gICAgICAgIGlmICh0aGlzLmlzUmVmcmVzaGluZykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0FscmVhZHkgcmVmcmVzaGluZywgc2tpcHBpbmcnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNSZWZyZXNoaW5nID0gdHJ1ZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0NhbGxpbmcgL2F1dGg6cmVmcmVzaCB0byBnZXQgYWNjZXNzIHRva2VuJyk7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6cmVmcmVzaCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzZW5kIEF1dGhvcml6YXRpb24gaGVhZGVyICh1c2luZyByZWZyZXNoIGNvb2tpZSlcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7fVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWZyZXNoIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnR290IGFjY2VzcyB0b2tlbiwgZXhwaXJlcyBpbjonLCByZXNwb25zZS5kYXRhLmV4cGlyZXNJbik7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBY2Nlc3NUb2tlbihcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbixcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5leHBpcmVzSW5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUmVmcmVzaCB0b2tlbiBleHBpcmVkIG9yIGludmFsaWQgLSBubyBhY2Nlc3NUb2tlbiBpbiByZXNwb25zZScpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWZyZXNoIGZhaWxlZDonLCBlcnJvci5zdGF0dXMsIGVycm9yLnN0YXR1c1RleHQsIGVycm9yLnJlc3BvbnNlSlNPTik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVmcmVzaGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0b3JlIGFjY2VzcyB0b2tlbiBpbiBtZW1vcnkgYW5kIHNjaGVkdWxlIHNpbGVudCByZWZyZXNoXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG9rZW4gSldUIGFjY2VzcyB0b2tlblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBleHBpcmVzSW4gVG9rZW4gbGlmZXRpbWUgaW4gc2Vjb25kc1xuICAgICAqL1xuICAgIHNldEFjY2Vzc1Rva2VuKHRva2VuLCBleHBpcmVzSW4pIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1NldHRpbmcgYWNjZXNzIHRva2VuLCBleHBpcmVzIGluOicsIGV4cGlyZXNJbiwgJ3NlY29uZHMnKTtcbiAgICAgICAgdGhpcy5hY2Nlc3NUb2tlbiA9IHRva2VuO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBTdG9wbGlnaHQgRWxlbWVudHMgbG9jYWxTdG9yYWdlIHdpdGggbmV3IHRva2VuXG4gICAgICAgIC8vIFdIWTogRWxlbWVudHMgcmVhZHMgZnJvbSBsb2NhbFN0b3JhZ2UuVHJ5SXRfc2VjdXJpdHlTY2hlbWVWYWx1ZXMgZm9yIFwiVHJ5IEl0XCIgZnVuY3Rpb25hbGl0eVxuICAgICAgICAvLyBUaGlzIGtlZXBzIHRoZSB0b2tlbiBmcmVzaCBhZnRlciBzaWxlbnQgcmVmcmVzaCAoZXZlcnkgMTMgbWludXRlcylcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdUcnlJdF9zZWN1cml0eVNjaGVtZVZhbHVlcycsIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAnYmVhcmVyQXV0aCc6IHRva2VuXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGYWlsZWQgdG8gdXBkYXRlIGxvY2FsU3RvcmFnZSBmb3IgU3RvcGxpZ2h0IEVsZW1lbnRzOicsIGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgdGltZXJcbiAgICAgICAgaWYgKHRoaXMucmVmcmVzaFRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5yZWZyZXNoVGltZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2NoZWR1bGUgc2lsZW50IHJlZnJlc2ggMiBtaW51dGVzIGJlZm9yZSBleHBpcmF0aW9uXG4gICAgICAgIC8vIERlZmF1bHQ6IDkwMHMgKDE1IG1pbikgLSAxMjBzID0gNzgwcyAoMTMgbWluKVxuICAgICAgICBjb25zdCByZWZyZXNoQXQgPSBNYXRoLm1heCgoZXhwaXJlc0luIC0gMTIwKSwgNjApICogMTAwMDtcblxuICAgICAgICBjb25zb2xlLmxvZygnU2lsZW50IHJlZnJlc2ggc2NoZWR1bGVkIGluOicsIHJlZnJlc2hBdCAvIDEwMDAsICdzZWNvbmRzJyk7XG5cbiAgICAgICAgdGhpcy5yZWZyZXNoVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2lsZW50UmVmcmVzaCgpO1xuICAgICAgICB9LCByZWZyZXNoQXQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaWxlbnQgcmVmcmVzaCAtIHVwZGF0ZSBhY2Nlc3MgdG9rZW4gYmVmb3JlIGl0IGV4cGlyZXNcbiAgICAgKiBBdXRvbWF0aWNhbGx5IGNhbGxlZCBieSB0aW1lciwgdHJhbnNwYXJlbnQgdG8gdXNlclxuICAgICAqL1xuICAgIGFzeW5jIHNpbGVudFJlZnJlc2goKSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVmcmVzaGluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSB0cnVlO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6cmVmcmVzaCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzZW5kIEF1dGhvcml6YXRpb24gaGVhZGVyICh1c2luZyByZWZyZXNoIGNvb2tpZSlcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7fVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBY2Nlc3NUb2tlbihcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbixcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5leHBpcmVzSW5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZWZyZXNoIGZhaWxlZCDihpIgbG9nb3V0XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dvdXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpbGVudCByZWZyZXNoIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBSZWZyZXNoIGZhaWxlZCDihpIgbG9nb3V0XG4gICAgICAgICAgICB0aGlzLmxvZ291dCgpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgdXAgZ2xvYmFsIEFKQVggaW50ZXJjZXB0b3JcbiAgICAgKiBBdXRvbWF0aWNhbGx5IGFkZHMgQXV0aG9yaXphdGlvbjogQmVhcmVyIGhlYWRlciB0byBhbGwgQUpBWCByZXF1ZXN0c1xuICAgICAqIEhhbmRsZXMgNDAxIGVycm9ycyBieSBsb2dnaW5nIG91dFxuICAgICAqL1xuICAgIHNldHVwR2xvYmFsQWpheCgpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgJC5hamF4XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQWpheCA9ICQuYWpheDtcblxuICAgICAgICAvLyBXcmFwICQuYWpheCB0byB3YWl0IGZvciB0b2tlbiBpbml0aWFsaXphdGlvblxuICAgICAgICAkLmFqYXggPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoICQuYWpheCh1cmwsIG9wdGlvbnMpIGFuZCAkLmFqYXgob3B0aW9ucykgc2lnbmF0dXJlc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB1cmwgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHVybDtcbiAgICAgICAgICAgICAgICB1cmwgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNraXAgYXV0aCBlbmRwb2ludHMgKHRoZXkgdXNlIHJlZnJlc2ggY29va2llLCBub3QgYWNjZXNzIHRva2VuKVxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdFVybCA9IHVybCB8fCBvcHRpb25zLnVybCB8fCAnJztcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0VXJsLmluY2x1ZGVzKCcvYXV0aDpsb2dpbicpIHx8IHJlcXVlc3RVcmwuaW5jbHVkZXMoJy9hdXRoOnJlZnJlc2gnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2FpdCBmb3IgVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIGJlZm9yZSBwcm9jZWVkaW5nXG4gICAgICAgICAgICBpZiAod2luZG93LnRva2VuTWFuYWdlclJlYWR5KSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGpRdWVyeSBEZWZlcnJlZCB0byBtYWludGFpbiBjb21wYXRpYmlsaXR5IHdpdGggalF1ZXJ5IGNvZGVcbiAgICAgICAgICAgICAgICBjb25zdCBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcblxuICAgICAgICAgICAgICAgIHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIEF1dGhvcml6YXRpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnMgfHwge307XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmFjY2Vzc1Rva2VuICYmICFvcHRpb25zLmhlYWRlcnMuQXV0aG9yaXphdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5oZWFkZXJzLkF1dGhvcml6YXRpb24gPSBgQmVhcmVyICR7c2VsZi5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBvcmlnaW5hbCAkLmFqYXggYW5kIGZvcndhcmQgaXRzIHJlc3VsdCB0byBvdXIgZGVmZXJyZWRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QganFYSFIgPSB1cmwgPyBvcmlnaW5hbEFqYXguY2FsbCh0aGlzLCB1cmwsIG9wdGlvbnMpIDogb3JpZ2luYWxBamF4LmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yd2FyZCBhbGwgY2FsbGJhY2tzXG4gICAgICAgICAgICAgICAgICAgIGpxWEhSLmRvbmUoKC4uLmFyZ3MpID0+IGRlZmVycmVkLnJlc29sdmUoLi4uYXJncykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmZhaWwoKC4uLmFyZ3MpID0+IGRlZmVycmVkLnJlamVjdCguLi5hcmdzKSk7XG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUb2tlbk1hbmFnZXIgbm90IGluaXRpYWxpemVkIHlldCAtIHByb2NlZWQgd2l0aG91dCB0b2tlblxuICAgICAgICAgICAgLy8gKHRoaXMgc2hvdWxkIG9ubHkgaGFwcGVuIG9uIGxvZ2luIHBhZ2UpXG4gICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxBamF4LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWxzbyBzZXQgdXAgZXJyb3IgaGFuZGxlclxuICAgICAgICAkKGRvY3VtZW50KS5hamF4RXJyb3IoKGV2ZW50LCB4aHIsIHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdW5hdXRob3JpemVkIGVycm9yc1xuICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIG9uIGxvZ2luIHBhZ2UgLSBkb24ndCB0cmlnZ2VyIGxvZ291dCBsb29wXG4gICAgICAgICAgICAgICAgY29uc3QgaXNMb2dpblBhZ2UgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uL2luZGV4JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi8nKTtcblxuICAgICAgICAgICAgICAgIGlmICghaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVG9rZW4gZXhwaXJlZCBvciBpbnZhbGlkIOKGkiBsb2dvdXRcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dvdXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFdyYXAgU2VtYW50aWMgVUkgJC5hcGkoKSBpZiBhdmFpbGFibGVcbiAgICAgICAgLy8gVGhpcyBpcyBuZWVkZWQgYmVjYXVzZSBzb21lIG1vZHVsZXMgdXNlICQuYXBpKCkgaW5zdGVhZCBvZiAkLmFqYXgoKVxuICAgICAgICBpZiAoJC5mbi5hcGkpIHtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsQXBpID0gJC5mbi5hcGk7XG4gICAgICAgICAgICAkLmZuLmFwaSA9IGZ1bmN0aW9uKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHNldHRpbmdzXG4gICAgICAgICAgICAgICAgY29uc3QgY29uZmlnID0gc2V0dGluZ3MgfHwge307XG5cbiAgICAgICAgICAgICAgICAvLyBTa2lwIGF1dGggZW5kcG9pbnRzXG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gY29uZmlnLnVybCB8fCAnJztcbiAgICAgICAgICAgICAgICBpZiAodXJsLmluY2x1ZGVzKCcvYXV0aDpsb2dpbicpIHx8IHVybC5pbmNsdWRlcygnL2F1dGg6cmVmcmVzaCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEFwaS5jYWxsKHRoaXMsIHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBXcmFwIGJlZm9yZVNlbmQgdG8gYWRkIEF1dGhvcml6YXRpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxCZWZvcmVTZW5kID0gY29uZmlnLmJlZm9yZVNlbmQ7XG4gICAgICAgICAgICAgICAgY29uZmlnLmJlZm9yZVNlbmQgPSBmdW5jdGlvbihzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgICAgICAvLyBXYWl0IGZvciBUb2tlbk1hbmFnZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgIGlmICh3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIEF1dGhvcml6YXRpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuYmVmb3JlWEhSID0gZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHtzZWxmLmFjY2Vzc1Rva2VufWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENhbGwgb3JpZ2luYWwgYmVmb3JlU2VuZCBpZiBleGlzdHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3JpZ2luYWxCZWZvcmVTZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsQmVmb3JlU2VuZC5jYWxsKHRoaXMsIHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBvcmlnaW5hbCBiZWZvcmVTZW5kXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcmlnaW5hbEJlZm9yZVNlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEJlZm9yZVNlbmQuY2FsbCh0aGlzLCBzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxBcGkuY2FsbCh0aGlzLCBjb25maWcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2dvdXQgLSBjbGVhciB0b2tlbnMgYW5kIHJlZGlyZWN0IHRvIGxvZ2luXG4gICAgICogLSBDYWxscyBSRVNUIEFQSSB0byBpbnZhbGlkYXRlIHJlZnJlc2ggdG9rZW5cbiAgICAgKiAtIENsZWFycyBhY2Nlc3MgdG9rZW4gZnJvbSBtZW1vcnlcbiAgICAgKiAtIERlbGV0ZXMgcmVmcmVzaFRva2VuIGNvb2tpZSBmcm9tIGJyb3dzZXJcbiAgICAgKiAtIFJlZGlyZWN0cyB0byBsb2dpbiBwYWdlXG4gICAgICovXG4gICAgYXN5bmMgbG9nb3V0KCkge1xuICAgICAgICBjb25zb2xlLmxvZygnVG9rZW5NYW5hZ2VyLmxvZ291dCgpIGNhbGxlZCcpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgb24gbG9naW4gcGFnZSAtIHByZXZlbnQgcmVkaXJlY3QgbG9vcFxuICAgICAgICBjb25zdCBpc0xvZ2luUGFnZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vaW5kZXgnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi8nKTtcblxuICAgICAgICBpZiAoaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBbHJlYWR5IG9uIGxvZ2luIHBhZ2UgLSBjbGVhcmluZyBzdGF0ZSBhbmQgY29va2llJyk7XG4gICAgICAgICAgICAvLyBBbHJlYWR5IG9uIGxvZ2luIHBhZ2UgLSBjbGVhciBzdGF0ZVxuICAgICAgICAgICAgdGhpcy5hY2Nlc3NUb2tlbiA9IG51bGw7XG4gICAgICAgICAgICBpZiAodGhpcy5yZWZyZXNoVGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5yZWZyZXNoVGltZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaFRpbWVyID0gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ1JJVElDQUw6IENsZWFyIGh0dHBPbmx5IGNvb2tpZSB2aWEgc2VydmVyLXNpZGUgQUpBWCBlbmRwb2ludFxuICAgICAgICAgICAgLy8gVGhpcyBwcmV2ZW50cyBhdXRoZW50aWNhdGlvbiBsb29wIHdoZW4gcmVmcmVzaFRva2VuIGV4aXN0cyBidXQgaXMgZXhwaXJlZFxuICAgICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9lbmRgLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGFzeW5jOiBmYWxzZSwgLy8gU3luY2hyb25vdXMgdG8gZW5zdXJlIGNvb2tpZSBpcyBjbGVhcmVkXG4gICAgICAgICAgICAgICAgc3VjY2VzczogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ29va2llIGNsZWFyZWQgdmlhIC9zZXNzaW9uL2VuZCcpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZXJyb3I6IChfanFYSFIsIHN0YXR1cywgZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yIGNsZWFyaW5nIGNvb2tpZTonLCBzdGF0dXMsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXZlbnQgbXVsdGlwbGUgbG9nb3V0IGNhbGxzXG4gICAgICAgIGlmICghdGhpcy5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05vIGFjY2VzcyB0b2tlbiAtIGNsZWFyaW5nIGNvb2tpZSB2aWEgL3Nlc3Npb24vZW5kJyk7XG4gICAgICAgICAgICAvLyBDUklUSUNBTDogQ2xlYXIgaHR0cE9ubHkgY29va2llIHZpYSBzZXJ2ZXItc2lkZSBlbmRwb2ludCBiZWZvcmUgcmVkaXJlY3RcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vZW5kYCxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jOiBmYWxzZSwgLy8gU3luY2hyb25vdXMgdG8gZW5zdXJlIGNvb2tpZSBpcyBjbGVhcmVkIGJlZm9yZSByZWRpcmVjdFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ29va2llIGNsZWFyZWQgdmlhIC9zZXNzaW9uL2VuZCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yIGNsZWFyaW5nIGNvb2tpZTonLCBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gQ2FsbCBsb2dvdXQgZW5kcG9pbnQgdG8gaW52YWxpZGF0ZSByZWZyZXNoIHRva2VuIGluIFJlZGlzXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQ2FsbGluZyAvYXV0aDpsb2dvdXQgQVBJJyk7XG4gICAgICAgICAgICBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOmxvZ291dCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5hY2Nlc3NUb2tlbn1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTG9nb3V0IEFQSSBjYWxsIHN1Y2Nlc3NmdWwnKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdMb2dvdXQgQVBJIGVycm9yOicsIGVycm9yLnN0YXR1cywgZXJyb3Iuc3RhdHVzVGV4dCk7XG4gICAgICAgICAgICAvLyBJZiBBUEkgZmFpbHMgKGUuZy4sIDQwMSB3aXRoIGV4cGlyZWQgdG9rZW4pLCB3ZSBzdGlsbCBuZWVkIHRvIGNsZWFyIHRoZSBjb29raWVcbiAgICAgICAgICAgIC8vIFVzZSBzZXJ2ZXItc2lkZSBzZXNzaW9uL2VuZCBlbmRwb2ludCBhcyBmYWxsYmFjayB0byBjbGVhciBodHRwT25seSBjb29raWVcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVc2luZyAvc2Vzc2lvbi9lbmQgZmFsbGJhY2sgdG8gY2xlYXIgY29va2llJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciBsb2NhbCBzdGF0ZVxuICAgICAgICB0aGlzLmFjY2Vzc1Rva2VuID0gbnVsbDtcbiAgICAgICAgaWYgKHRoaXMucmVmcmVzaFRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5yZWZyZXNoVGltZXIpO1xuICAgICAgICAgICAgdGhpcy5yZWZyZXNoVGltZXIgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ1JJVElDQUw6IFJlZGlyZWN0IHRvIC9zZXNzaW9uL2VuZCB3aGljaCBjbGVhcnMgaHR0cE9ubHkgY29va2llIHNlcnZlci1zaWRlXG4gICAgICAgIC8vIFRoaXMgcHJldmVudHMgYXV0aGVudGljYXRpb24gbG9vcCB3aGVuIHJlZnJlc2hUb2tlbiBjb29raWUgZXhpc3RzIGJ1dCBpcyBleHBpcmVkXG4gICAgICAgIGNvbnNvbGUubG9nKCdSZWRpcmVjdGluZyB0byAvc2Vzc2lvbi9lbmQgdG8gY2xlYXIgY29va2llJyk7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9lbmRgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgcmVmcmVzaFRva2VuIGNvb2tpZSBmcm9tIGJyb3dzZXJcbiAgICAgKlxuICAgICAqIElNUE9SVEFOVDogaHR0cE9ubHkgY29va2llcyBDQU5OT1QgYmUgZGVsZXRlZCB2aWEgSmF2YVNjcmlwdCAoZG9jdW1lbnQuY29va2llKS5cbiAgICAgKiBUaGV5IGNhbiBvbmx5IGJlIGNsZWFyZWQgYnkgdGhlIHNlcnZlciB2aWEgU2V0LUNvb2tpZSBoZWFkZXIuXG4gICAgICpcbiAgICAgKiBUaGUgL2F1dGg6bG9nb3V0IGVuZHBvaW50IGhhbmRsZXMgY29va2llIGRlbGV0aW9uIG9uIHNlcnZlciBzaWRlLlxuICAgICAqIFRoaXMgbWV0aG9kIGV4aXN0cyBmb3Igbm9uLWh0dHBPbmx5IGZhbGxiYWNrIHNjZW5hcmlvcyBvbmx5LlxuICAgICAqXG4gICAgICogRm9yIGh0dHBPbmx5IGNvb2tpZXMsIHdlIHJlbHkgb246XG4gICAgICogMS4gU2VydmVyLXNpZGUgY29va2llIGRlbGV0aW9uIGluIC9hdXRoOmxvZ291dCByZXNwb25zZVxuICAgICAqIDIuIFNlc3Npb25Db250cm9sbGVyLmVuZEFjdGlvbigpIHdoaWNoIGFsc28gY2xlYXJzIHRoZSBjb29raWVcbiAgICAgKi9cbiAgICBkZWxldGVSZWZyZXNoVG9rZW5Db29raWUoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdBdHRlbXB0aW5nIHRvIGRlbGV0ZSByZWZyZXNoVG9rZW4gY29va2llIChjbGllbnQtc2lkZSknKTtcblxuICAgICAgICAvLyBOT1RFOiBUaGlzIHdvbid0IHdvcmsgZm9yIGh0dHBPbmx5IGNvb2tpZXMsIGJ1dCB0cnkgYW55d2F5IGZvciBub24taHR0cE9ubHkgZmFsbGJhY2tcbiAgICAgICAgZG9jdW1lbnQuY29va2llID0gJ3JlZnJlc2hUb2tlbj07IGV4cGlyZXM9VGh1LCAwMSBKYW4gMTk3MCAwMDowMDowMCBVVEM7IHBhdGg9LzsgU2FtZVNpdGU9U3RyaWN0JztcblxuICAgICAgICAvLyBGb3IgSFRUUFMgKHNlY3VyZSBmbGFnKVxuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSAnaHR0cHM6Jykge1xuICAgICAgICAgICAgZG9jdW1lbnQuY29va2llID0gJ3JlZnJlc2hUb2tlbj07IGV4cGlyZXM9VGh1LCAwMSBKYW4gMTk3MCAwMDowMDowMCBVVEM7IHBhdGg9Lzsgc2VjdXJlOyBTYW1lU2l0ZT1TdHJpY3QnO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ0NsaWVudC1zaWRlIGNvb2tpZSBkZWxldGlvbiBhdHRlbXB0ZWQgKGh0dHBPbmx5IGNvb2tpZXMgcmVxdWlyZSBzZXJ2ZXItc2lkZSBkZWxldGlvbiknKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdXNlciBpcyBhdXRoZW50aWNhdGVkXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgYWNjZXNzIHRva2VuIGV4aXN0c1xuICAgICAqL1xuICAgIGlzQXV0aGVudGljYXRlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWNjZXNzVG9rZW4gIT09IG51bGw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LlRva2VuTWFuYWdlciA9IFRva2VuTWFuYWdlcjtcblxuLy8gQ1JJVElDQUw6IFNldCB1cCBBSkFYIGludGVyY2VwdG9yIElNTUVESUFURUxZIG9uIHNjcmlwdCBsb2FkXG4vLyBUaGlzIGVuc3VyZXMgQUxMIEFKQVggcmVxdWVzdHMgd2FpdCBmb3IgVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uXG4vLyBldmVuIGlmIHRoZXkncmUgZmlyZWQgYmVmb3JlICQoZG9jdW1lbnQpLnJlYWR5KClcblRva2VuTWFuYWdlci5zZXR1cEdsb2JhbEFqYXgoKTtcblxuLy8gQ1JJVElDQUw6IENyZWF0ZSB0b2tlbk1hbmFnZXJSZWFkeSBwcm9taXNlIElNTUVESUFURUxZXG4vLyBDaGVjayBpZiB3ZSdyZSBvbiBsb2dpbiBwYWdlIC0gaWYgbm90LCBzdGFydCBpbml0aWFsaXphdGlvbiByaWdodCBhd2F5XG4vLyBUaGlzIGVuc3VyZXMgdGhlIHByb21pc2UgZXhpc3RzIGJlZm9yZSBBTlkgb3RoZXIgc2NyaXB0IHJ1bnNcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIFByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb25zIG9uIHRoZSBzYW1lIHBhZ2VcbiAgICBpZiAoIXdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSkge1xuICAgICAgICBjb25zb2xlLmxvZygnQ3JlYXRpbmcgdG9rZW5NYW5hZ2VyUmVhZHkgcHJvbWlzZScpO1xuXG4gICAgICAgIGNvbnN0IGlzTG9naW5QYWdlID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi9pbmRleCcpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uLycpO1xuXG4gICAgICAgIGlmICghaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgIC8vIE5vdCBsb2dpbiBwYWdlIC0gc3RhcnQgVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAvLyBUaGlzIGhhcHBlbnMgQkVGT1JFICQoZG9jdW1lbnQpLnJlYWR5LCBlbnN1cmluZyB0b2tlbiBpcyByZWFkeSBBU0FQXG4gICAgICAgICAgICB3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkgPSBUb2tlbk1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTG9naW4gcGFnZSAtIHJlc29sdmUgaW1tZWRpYXRlbHkgKG5vIGF1dGhlbnRpY2F0aW9uIG5lZWRlZClcbiAgICAgICAgICAgIHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSA9IFByb21pc2UucmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd0b2tlbk1hbmFnZXJSZWFkeSBhbHJlYWR5IGV4aXN0cywgc2tpcHBpbmcgaW5pdGlhbGl6YXRpb24nKTtcbiAgICB9XG59XG4iXX0=