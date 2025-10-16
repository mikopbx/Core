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
    //
    // SECURITY NOTE: We store the token in localStorage ONLY for OpenAPI testing convenience.
    // This is an exception to our security model where tokens are normally kept in memory only.

    try {
      // Update Stoplight Elements storage format
      localStorage.setItem('TryIt_securitySchemeValues', JSON.stringify({
        'bearerAuth': token
      })); // Update our own storage with expiration timestamp

      var tokenData = {
        'bearerAuth': token,
        'expiresAt': Date.now() + expiresIn * 1000
      };
      localStorage.setItem('MikoPBX_OpenAPI_Token', JSON.stringify(tokenData));
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
    } // Clear OpenAPI/Stoplight Elements tokens from localStorage


    try {
      localStorage.removeItem('TryIt_securitySchemeValues');
      localStorage.removeItem('MikoPBX_OpenAPI_Token');
    } catch (e) {
      console.log('Failed to clear OpenAPI tokens from localStorage:', e);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Rva2VuLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJyZWZyZXNoVGltZXIiLCJpc1JlZnJlc2hpbmciLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImNvbnNvbGUiLCJsb2ciLCJoYXNUb2tlbiIsInN0YXJ0dXBSZWZyZXNoIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwicmVzcG9uc2UiLCIkIiwiYWpheCIsInVybCIsIm1ldGhvZCIsImRhdGFUeXBlIiwiaGVhZGVycyIsInJlc3VsdCIsImRhdGEiLCJleHBpcmVzSW4iLCJzZXRBY2Nlc3NUb2tlbiIsImVycm9yIiwic3RhdHVzIiwic3RhdHVzVGV4dCIsInJlc3BvbnNlSlNPTiIsInRva2VuIiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0b2tlbkRhdGEiLCJEYXRlIiwibm93IiwiZSIsImNsZWFyVGltZW91dCIsInJlZnJlc2hBdCIsIk1hdGgiLCJtYXgiLCJzZXRUaW1lb3V0Iiwic2lsZW50UmVmcmVzaCIsImxvZ291dCIsInNldHVwR2xvYmFsQWpheCIsInNlbGYiLCJvcmlnaW5hbEFqYXgiLCJvcHRpb25zIiwidW5kZWZpbmVkIiwicmVxdWVzdFVybCIsImluY2x1ZGVzIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJ0b2tlbk1hbmFnZXJSZWFkeSIsImRlZmVycmVkIiwiRGVmZXJyZWQiLCJ0aGVuIiwiQXV0aG9yaXphdGlvbiIsImpxWEhSIiwiY2FsbCIsImRvbmUiLCJyZXNvbHZlIiwiZmFpbCIsInJlamVjdCIsInByb21pc2UiLCJkb2N1bWVudCIsImFqYXhFcnJvciIsImV2ZW50IiwieGhyIiwic2V0dGluZ3MiLCJpc0xvZ2luUGFnZSIsInBhdGhuYW1lIiwiZm4iLCJhcGkiLCJvcmlnaW5hbEFwaSIsImNvbmZpZyIsIm9yaWdpbmFsQmVmb3JlU2VuZCIsImJlZm9yZVNlbmQiLCJiZWZvcmVYSFIiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiYXN5bmMiLCJzdWNjZXNzIiwiX2pxWEhSIiwicmVtb3ZlSXRlbSIsImRlbGV0ZVJlZnJlc2hUb2tlbkNvb2tpZSIsImNvb2tpZSIsInByb3RvY29sIiwiaXNBdXRoZW50aWNhdGVkIiwiUHJvbWlzZSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxXQUFXLEVBQUUsSUFMSTs7QUFPakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBWEc7O0FBYWpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxLQWpCRzs7QUFtQmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxLQXZCRTs7QUF5QmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ1VDLEVBQUFBLFVBbkNXLDhCQW1DRTtBQUNmQyxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxrQ0FBWixFQURlLENBR2Y7O0FBQ0EsUUFBSSxLQUFLSCxhQUFULEVBQXdCO0FBQ3BCRSxNQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSw0Q0FBWjtBQUNBLGFBQU8sS0FBS04sV0FBTCxLQUFxQixJQUE1QjtBQUNILEtBUGMsQ0FTZjs7O0FBQ0EsUUFBTU8sUUFBUSxHQUFHLE1BQU0sS0FBS0MsY0FBTCxFQUF2QjtBQUVBSCxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSx5QkFBWixFQUF1Q0MsUUFBdkM7O0FBRUEsUUFBSSxDQUFDQSxR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OztBQUNBQSxZQUFZLENBQUM0QyxlQUFiLEcsQ0FFQTtBQUNBO0FBQ0E7O0FBQ0EsSUFBSSxPQUFPbEMsTUFBUCxLQUFrQixXQUF0QixFQUFtQztBQUMvQjtBQUNBLE1BQUksQ0FBQ0EsTUFBTSxDQUFDMkMsaUJBQVosRUFBK0I7QUFDM0IvQyxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxvQ0FBWjtBQUVBLFFBQU0rRCxXQUFXLEdBQUc1RCxNQUFNLENBQUNDLFFBQVAsQ0FBZ0I0RCxRQUFoQixDQUF5QnJCLFFBQXpCLENBQWtDLGdCQUFsQyxLQUNEeEMsTUFBTSxDQUFDQyxRQUFQLENBQWdCNEQsUUFBaEIsQ0FBeUJyQixRQUF6QixDQUFrQyxXQUFsQyxDQURuQjs7QUFHQSxRQUFJLENBQUNvQixXQUFMLEVBQWtCO0FBQ2Q7QUFDQTtBQUNBNUQsTUFBQUEsTUFBTSxDQUFDMkMsaUJBQVAsR0FBMkJyRCxZQUFZLENBQUNLLFVBQWIsRUFBM0I7QUFDSCxLQUpELE1BSU87QUFDSDtBQUNBSyxNQUFBQSxNQUFNLENBQUMyQyxpQkFBUCxHQUEyQm1DLE9BQU8sQ0FBQzNCLE9BQVIsQ0FBZ0IsSUFBaEIsQ0FBM0I7QUFDSDtBQUNKLEdBZEQsTUFjTztBQUNIdkQsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksMkRBQVo7QUFDSDtBQUNKIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwgKi9cblxuLyoqXG4gKiBUb2tlbk1hbmFnZXIgLSBtYW5hZ2VzIEpXVCBhdXRoZW50aWNhdGlvbiB0b2tlbnNcbiAqXG4gKiBTZWN1cml0eSBhcmNoaXRlY3R1cmU6XG4gKiAtIEFjY2VzcyB0b2tlbiAoSldULCAxNSBtaW4pIHN0b3JlZCBpbiBNRU1PUlkgKG5vdCBsb2NhbFN0b3JhZ2UgLSBYU1MgcHJvdGVjdGlvbilcbiAqIC0gUmVmcmVzaCB0b2tlbiAoMzAgZGF5cykgc3RvcmVkIGluIGh0dHBPbmx5IGNvb2tpZSAoWFNTIHByb3RlY3Rpb24pXG4gKiAtIFNpbGVudCByZWZyZXNoIHRpbWVyIHVwZGF0ZXMgYWNjZXNzIHRva2VuIGJlZm9yZSBleHBpcmF0aW9uXG4gKiAtIEFsbCBBSkFYIHJlcXVlc3RzIGF1dG9tYXRpY2FsbHkgaW5jbHVkZSBBdXRob3JpemF0aW9uOiBCZWFyZXIgaGVhZGVyXG4gKlxuICogQG1vZHVsZSBUb2tlbk1hbmFnZXJcbiAqL1xuY29uc3QgVG9rZW5NYW5hZ2VyID0ge1xuICAgIC8qKlxuICAgICAqIEFjY2VzcyB0b2tlbiAoSldUKSBzdG9yZWQgaW4gbWVtb3J5IC0gTkVWRVIgaW4gbG9jYWxTdG9yYWdlL3Nlc3Npb25TdG9yYWdlXG4gICAgICogQHR5cGUge3N0cmluZ3xudWxsfVxuICAgICAqL1xuICAgIGFjY2Vzc1Rva2VuOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGltZXIgZm9yIHNpbGVudCB0b2tlbiByZWZyZXNoXG4gICAgICogQHR5cGUge251bWJlcnxudWxsfVxuICAgICAqL1xuICAgIHJlZnJlc2hUaW1lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBtdWx0aXBsZSBzaW11bHRhbmVvdXMgcmVmcmVzaCBhdHRlbXB0c1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzUmVmcmVzaGluZzogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb25zXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFRva2VuTWFuYWdlclxuICAgICAqIC0gQXR0ZW1wdHMgdG8gcmVmcmVzaCBhY2Nlc3MgdG9rZW4gdXNpbmcgcmVmcmVzaCB0b2tlbiBjb29raWVcbiAgICAgKiAtIFJlZGlyZWN0cyB0byBsb2dpbiBpZiBubyB2YWxpZCByZWZyZXNoIHRva2VuXG4gICAgICpcbiAgICAgKiBOb3RlOiBzZXR1cEdsb2JhbEFqYXgoKSBpcyBjYWxsZWQgYXV0b21hdGljYWxseSBvbiBzY3JpcHQgbG9hZCxcbiAgICAgKiBub3QgaGVyZSwgdG8gZW5zdXJlIGl0J3MgYWN0aXZlIGJlZm9yZSBBTlkgQUpBWCByZXF1ZXN0cyBhcmUgbWFkZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPGJvb2xlYW4+fSB0cnVlIGlmIGF1dGhlbnRpY2F0aW9uIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBhc3luYyBpbml0aWFsaXplKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnVG9rZW5NYW5hZ2VyLmluaXRpYWxpemUoKSBjYWxsZWQnKTtcblxuICAgICAgICAvLyBQcmV2ZW50IG11bHRpcGxlIGluaXRpYWxpemF0aW9uc1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVG9rZW5NYW5hZ2VyIGFscmVhZHkgaW5pdGlhbGl6ZWQsIHNraXBwaW5nJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hY2Nlc3NUb2tlbiAhPT0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyeSB0byBnZXQgYWNjZXNzIHRva2VuIHVzaW5nIHJlZnJlc2ggdG9rZW4gY29va2llXG4gICAgICAgIGNvbnN0IGhhc1Rva2VuID0gYXdhaXQgdGhpcy5zdGFydHVwUmVmcmVzaCgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdTdGFydHVwIHJlZnJlc2ggcmVzdWx0OicsIGhhc1Rva2VuKTtcblxuICAgICAgICBpZiAoIWhhc1Rva2VuKSB7XG4gICAgICAgICAgICAvLyBObyB2YWxpZCByZWZyZXNoIHRva2VuIOKGkiByZWRpcmVjdCB0byBsb2dpblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ05vIHZhbGlkIHRva2VuIC0gcmVkaXJlY3RpbmcgdG8gbG9naW4nKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygnVG9rZW5NYW5hZ2VyIGluaXRpYWxpemVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnR1cCByZWZyZXNoIC0gZ2V0IG5ldyBhY2Nlc3MgdG9rZW4gdXNpbmcgcmVmcmVzaCB0b2tlbiBjb29raWVcbiAgICAgKiBDYWxsZWQgb24gcGFnZSBsb2FkIHRvIHJlc3RvcmUgYXV0aGVudGljYXRpb24gc3RhdGVcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPGJvb2xlYW4+fSB0cnVlIGlmIHJlZnJlc2ggc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGFzeW5jIHN0YXJ0dXBSZWZyZXNoKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnVG9rZW5NYW5hZ2VyLnN0YXJ0dXBSZWZyZXNoKCkgY2FsbGVkJyk7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNSZWZyZXNoaW5nKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQWxyZWFkeSByZWZyZXNoaW5nLCBza2lwcGluZycpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSB0cnVlO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQ2FsbGluZyAvYXV0aDpyZWZyZXNoIHRvIGdldCBhY2Nlc3MgdG9rZW4nKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvYXV0aDpyZWZyZXNoJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgICAgICAgIC8vIERvbid0IHNlbmQgQXV0aG9yaXphdGlvbiBoZWFkZXIgKHVzaW5nIHJlZnJlc2ggY29va2llKVxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHt9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlZnJlc2ggcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdHb3QgYWNjZXNzIHRva2VuLCBleHBpcmVzIGluOicsIHJlc3BvbnNlLmRhdGEuZXhwaXJlc0luKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFjY2Vzc1Rva2VuKFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuLFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmV4cGlyZXNJblxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWZyZXNoIHRva2VuIGV4cGlyZWQgb3IgaW52YWxpZCAtIG5vIGFjY2Vzc1Rva2VuIGluIHJlc3BvbnNlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlZnJlc2ggZmFpbGVkOicsIGVycm9yLnN0YXR1cywgZXJyb3Iuc3RhdHVzVGV4dCwgZXJyb3IucmVzcG9uc2VKU09OKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWZyZXNoaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RvcmUgYWNjZXNzIHRva2VuIGluIG1lbW9yeSBhbmQgc2NoZWR1bGUgc2lsZW50IHJlZnJlc2hcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b2tlbiBKV1QgYWNjZXNzIHRva2VuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGV4cGlyZXNJbiBUb2tlbiBsaWZldGltZSBpbiBzZWNvbmRzXG4gICAgICovXG4gICAgc2V0QWNjZXNzVG9rZW4odG9rZW4sIGV4cGlyZXNJbikge1xuICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZyBhY2Nlc3MgdG9rZW4sIGV4cGlyZXMgaW46JywgZXhwaXJlc0luLCAnc2Vjb25kcycpO1xuICAgICAgICB0aGlzLmFjY2Vzc1Rva2VuID0gdG9rZW47XG5cbiAgICAgICAgLy8gVXBkYXRlIFN0b3BsaWdodCBFbGVtZW50cyBsb2NhbFN0b3JhZ2Ugd2l0aCBuZXcgdG9rZW5cbiAgICAgICAgLy8gV0hZOiBFbGVtZW50cyByZWFkcyBmcm9tIGxvY2FsU3RvcmFnZS5UcnlJdF9zZWN1cml0eVNjaGVtZVZhbHVlcyBmb3IgXCJUcnkgSXRcIiBmdW5jdGlvbmFsaXR5XG4gICAgICAgIC8vIFRoaXMga2VlcHMgdGhlIHRva2VuIGZyZXNoIGFmdGVyIHNpbGVudCByZWZyZXNoIChldmVyeSAxMyBtaW51dGVzKVxuICAgICAgICAvL1xuICAgICAgICAvLyBTRUNVUklUWSBOT1RFOiBXZSBzdG9yZSB0aGUgdG9rZW4gaW4gbG9jYWxTdG9yYWdlIE9OTFkgZm9yIE9wZW5BUEkgdGVzdGluZyBjb252ZW5pZW5jZS5cbiAgICAgICAgLy8gVGhpcyBpcyBhbiBleGNlcHRpb24gdG8gb3VyIHNlY3VyaXR5IG1vZGVsIHdoZXJlIHRva2VucyBhcmUgbm9ybWFsbHkga2VwdCBpbiBtZW1vcnkgb25seS5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBTdG9wbGlnaHQgRWxlbWVudHMgc3RvcmFnZSBmb3JtYXRcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdUcnlJdF9zZWN1cml0eVNjaGVtZVZhbHVlcycsIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAnYmVhcmVyQXV0aCc6IHRva2VuXG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBvdXIgb3duIHN0b3JhZ2Ugd2l0aCBleHBpcmF0aW9uIHRpbWVzdGFtcFxuICAgICAgICAgICAgY29uc3QgdG9rZW5EYXRhID0ge1xuICAgICAgICAgICAgICAgICdiZWFyZXJBdXRoJzogdG9rZW4sXG4gICAgICAgICAgICAgICAgJ2V4cGlyZXNBdCc6IERhdGUubm93KCkgKyAoZXhwaXJlc0luICogMTAwMClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnTWlrb1BCWF9PcGVuQVBJX1Rva2VuJywgSlNPTi5zdHJpbmdpZnkodG9rZW5EYXRhKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGYWlsZWQgdG8gdXBkYXRlIGxvY2FsU3RvcmFnZSBmb3IgU3RvcGxpZ2h0IEVsZW1lbnRzOicsIGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgdGltZXJcbiAgICAgICAgaWYgKHRoaXMucmVmcmVzaFRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5yZWZyZXNoVGltZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2NoZWR1bGUgc2lsZW50IHJlZnJlc2ggMiBtaW51dGVzIGJlZm9yZSBleHBpcmF0aW9uXG4gICAgICAgIC8vIERlZmF1bHQ6IDkwMHMgKDE1IG1pbikgLSAxMjBzID0gNzgwcyAoMTMgbWluKVxuICAgICAgICBjb25zdCByZWZyZXNoQXQgPSBNYXRoLm1heCgoZXhwaXJlc0luIC0gMTIwKSwgNjApICogMTAwMDtcblxuICAgICAgICBjb25zb2xlLmxvZygnU2lsZW50IHJlZnJlc2ggc2NoZWR1bGVkIGluOicsIHJlZnJlc2hBdCAvIDEwMDAsICdzZWNvbmRzJyk7XG5cbiAgICAgICAgdGhpcy5yZWZyZXNoVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2lsZW50UmVmcmVzaCgpO1xuICAgICAgICB9LCByZWZyZXNoQXQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaWxlbnQgcmVmcmVzaCAtIHVwZGF0ZSBhY2Nlc3MgdG9rZW4gYmVmb3JlIGl0IGV4cGlyZXNcbiAgICAgKiBBdXRvbWF0aWNhbGx5IGNhbGxlZCBieSB0aW1lciwgdHJhbnNwYXJlbnQgdG8gdXNlclxuICAgICAqL1xuICAgIGFzeW5jIHNpbGVudFJlZnJlc2goKSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVmcmVzaGluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSB0cnVlO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6cmVmcmVzaCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzZW5kIEF1dGhvcml6YXRpb24gaGVhZGVyICh1c2luZyByZWZyZXNoIGNvb2tpZSlcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7fVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBY2Nlc3NUb2tlbihcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbixcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5leHBpcmVzSW5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZWZyZXNoIGZhaWxlZCDihpIgbG9nb3V0XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dvdXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpbGVudCByZWZyZXNoIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBSZWZyZXNoIGZhaWxlZCDihpIgbG9nb3V0XG4gICAgICAgICAgICB0aGlzLmxvZ291dCgpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgdXAgZ2xvYmFsIEFKQVggaW50ZXJjZXB0b3JcbiAgICAgKiBBdXRvbWF0aWNhbGx5IGFkZHMgQXV0aG9yaXphdGlvbjogQmVhcmVyIGhlYWRlciB0byBhbGwgQUpBWCByZXF1ZXN0c1xuICAgICAqIEhhbmRsZXMgNDAxIGVycm9ycyBieSBsb2dnaW5nIG91dFxuICAgICAqL1xuICAgIHNldHVwR2xvYmFsQWpheCgpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgJC5hamF4XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQWpheCA9ICQuYWpheDtcblxuICAgICAgICAvLyBXcmFwICQuYWpheCB0byB3YWl0IGZvciB0b2tlbiBpbml0aWFsaXphdGlvblxuICAgICAgICAkLmFqYXggPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoICQuYWpheCh1cmwsIG9wdGlvbnMpIGFuZCAkLmFqYXgob3B0aW9ucykgc2lnbmF0dXJlc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB1cmwgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHVybDtcbiAgICAgICAgICAgICAgICB1cmwgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNraXAgYXV0aCBlbmRwb2ludHMgKHRoZXkgdXNlIHJlZnJlc2ggY29va2llLCBub3QgYWNjZXNzIHRva2VuKVxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdFVybCA9IHVybCB8fCBvcHRpb25zLnVybCB8fCAnJztcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0VXJsLmluY2x1ZGVzKCcvYXV0aDpsb2dpbicpIHx8IHJlcXVlc3RVcmwuaW5jbHVkZXMoJy9hdXRoOnJlZnJlc2gnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2FpdCBmb3IgVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIGJlZm9yZSBwcm9jZWVkaW5nXG4gICAgICAgICAgICBpZiAod2luZG93LnRva2VuTWFuYWdlclJlYWR5KSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGpRdWVyeSBEZWZlcnJlZCB0byBtYWludGFpbiBjb21wYXRpYmlsaXR5IHdpdGggalF1ZXJ5IGNvZGVcbiAgICAgICAgICAgICAgICBjb25zdCBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcblxuICAgICAgICAgICAgICAgIHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIEF1dGhvcml6YXRpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnMgfHwge307XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmFjY2Vzc1Rva2VuICYmICFvcHRpb25zLmhlYWRlcnMuQXV0aG9yaXphdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5oZWFkZXJzLkF1dGhvcml6YXRpb24gPSBgQmVhcmVyICR7c2VsZi5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBvcmlnaW5hbCAkLmFqYXggYW5kIGZvcndhcmQgaXRzIHJlc3VsdCB0byBvdXIgZGVmZXJyZWRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QganFYSFIgPSB1cmwgPyBvcmlnaW5hbEFqYXguY2FsbCh0aGlzLCB1cmwsIG9wdGlvbnMpIDogb3JpZ2luYWxBamF4LmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yd2FyZCBhbGwgY2FsbGJhY2tzXG4gICAgICAgICAgICAgICAgICAgIGpxWEhSLmRvbmUoKC4uLmFyZ3MpID0+IGRlZmVycmVkLnJlc29sdmUoLi4uYXJncykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmZhaWwoKC4uLmFyZ3MpID0+IGRlZmVycmVkLnJlamVjdCguLi5hcmdzKSk7XG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUb2tlbk1hbmFnZXIgbm90IGluaXRpYWxpemVkIHlldCAtIHByb2NlZWQgd2l0aG91dCB0b2tlblxuICAgICAgICAgICAgLy8gKHRoaXMgc2hvdWxkIG9ubHkgaGFwcGVuIG9uIGxvZ2luIHBhZ2UpXG4gICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxBamF4LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWxzbyBzZXQgdXAgZXJyb3IgaGFuZGxlclxuICAgICAgICAkKGRvY3VtZW50KS5hamF4RXJyb3IoKGV2ZW50LCB4aHIsIHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdW5hdXRob3JpemVkIGVycm9yc1xuICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIG9uIGxvZ2luIHBhZ2UgLSBkb24ndCB0cmlnZ2VyIGxvZ291dCBsb29wXG4gICAgICAgICAgICAgICAgY29uc3QgaXNMb2dpblBhZ2UgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uL2luZGV4JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi8nKTtcblxuICAgICAgICAgICAgICAgIGlmICghaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVG9rZW4gZXhwaXJlZCBvciBpbnZhbGlkIOKGkiBsb2dvdXRcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dvdXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFdyYXAgU2VtYW50aWMgVUkgJC5hcGkoKSBpZiBhdmFpbGFibGVcbiAgICAgICAgLy8gVGhpcyBpcyBuZWVkZWQgYmVjYXVzZSBzb21lIG1vZHVsZXMgdXNlICQuYXBpKCkgaW5zdGVhZCBvZiAkLmFqYXgoKVxuICAgICAgICBpZiAoJC5mbi5hcGkpIHtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsQXBpID0gJC5mbi5hcGk7XG4gICAgICAgICAgICAkLmZuLmFwaSA9IGZ1bmN0aW9uKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHNldHRpbmdzXG4gICAgICAgICAgICAgICAgY29uc3QgY29uZmlnID0gc2V0dGluZ3MgfHwge307XG5cbiAgICAgICAgICAgICAgICAvLyBTa2lwIGF1dGggZW5kcG9pbnRzXG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gY29uZmlnLnVybCB8fCAnJztcbiAgICAgICAgICAgICAgICBpZiAodXJsLmluY2x1ZGVzKCcvYXV0aDpsb2dpbicpIHx8IHVybC5pbmNsdWRlcygnL2F1dGg6cmVmcmVzaCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEFwaS5jYWxsKHRoaXMsIHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBXcmFwIGJlZm9yZVNlbmQgdG8gYWRkIEF1dGhvcml6YXRpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxCZWZvcmVTZW5kID0gY29uZmlnLmJlZm9yZVNlbmQ7XG4gICAgICAgICAgICAgICAgY29uZmlnLmJlZm9yZVNlbmQgPSBmdW5jdGlvbihzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgICAgICAvLyBXYWl0IGZvciBUb2tlbk1hbmFnZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgIGlmICh3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIEF1dGhvcml6YXRpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuYmVmb3JlWEhSID0gZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHtzZWxmLmFjY2Vzc1Rva2VufWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENhbGwgb3JpZ2luYWwgYmVmb3JlU2VuZCBpZiBleGlzdHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3JpZ2luYWxCZWZvcmVTZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsQmVmb3JlU2VuZC5jYWxsKHRoaXMsIHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBvcmlnaW5hbCBiZWZvcmVTZW5kXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcmlnaW5hbEJlZm9yZVNlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEJlZm9yZVNlbmQuY2FsbCh0aGlzLCBzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxBcGkuY2FsbCh0aGlzLCBjb25maWcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2dvdXQgLSBjbGVhciB0b2tlbnMgYW5kIHJlZGlyZWN0IHRvIGxvZ2luXG4gICAgICogLSBDYWxscyBSRVNUIEFQSSB0byBpbnZhbGlkYXRlIHJlZnJlc2ggdG9rZW5cbiAgICAgKiAtIENsZWFycyBhY2Nlc3MgdG9rZW4gZnJvbSBtZW1vcnlcbiAgICAgKiAtIERlbGV0ZXMgcmVmcmVzaFRva2VuIGNvb2tpZSBmcm9tIGJyb3dzZXJcbiAgICAgKiAtIFJlZGlyZWN0cyB0byBsb2dpbiBwYWdlXG4gICAgICovXG4gICAgYXN5bmMgbG9nb3V0KCkge1xuICAgICAgICBjb25zb2xlLmxvZygnVG9rZW5NYW5hZ2VyLmxvZ291dCgpIGNhbGxlZCcpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgb24gbG9naW4gcGFnZSAtIHByZXZlbnQgcmVkaXJlY3QgbG9vcFxuICAgICAgICBjb25zdCBpc0xvZ2luUGFnZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vaW5kZXgnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi8nKTtcblxuICAgICAgICBpZiAoaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBbHJlYWR5IG9uIGxvZ2luIHBhZ2UgLSBjbGVhcmluZyBzdGF0ZSBhbmQgY29va2llJyk7XG4gICAgICAgICAgICAvLyBBbHJlYWR5IG9uIGxvZ2luIHBhZ2UgLSBjbGVhciBzdGF0ZVxuICAgICAgICAgICAgdGhpcy5hY2Nlc3NUb2tlbiA9IG51bGw7XG4gICAgICAgICAgICBpZiAodGhpcy5yZWZyZXNoVGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5yZWZyZXNoVGltZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaFRpbWVyID0gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ1JJVElDQUw6IENsZWFyIGh0dHBPbmx5IGNvb2tpZSB2aWEgc2VydmVyLXNpZGUgQUpBWCBlbmRwb2ludFxuICAgICAgICAgICAgLy8gVGhpcyBwcmV2ZW50cyBhdXRoZW50aWNhdGlvbiBsb29wIHdoZW4gcmVmcmVzaFRva2VuIGV4aXN0cyBidXQgaXMgZXhwaXJlZFxuICAgICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9lbmRgLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGFzeW5jOiBmYWxzZSwgLy8gU3luY2hyb25vdXMgdG8gZW5zdXJlIGNvb2tpZSBpcyBjbGVhcmVkXG4gICAgICAgICAgICAgICAgc3VjY2VzczogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ29va2llIGNsZWFyZWQgdmlhIC9zZXNzaW9uL2VuZCcpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZXJyb3I6IChfanFYSFIsIHN0YXR1cywgZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yIGNsZWFyaW5nIGNvb2tpZTonLCBzdGF0dXMsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXZlbnQgbXVsdGlwbGUgbG9nb3V0IGNhbGxzXG4gICAgICAgIGlmICghdGhpcy5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05vIGFjY2VzcyB0b2tlbiAtIGNsZWFyaW5nIGNvb2tpZSB2aWEgL3Nlc3Npb24vZW5kJyk7XG4gICAgICAgICAgICAvLyBDUklUSUNBTDogQ2xlYXIgaHR0cE9ubHkgY29va2llIHZpYSBzZXJ2ZXItc2lkZSBlbmRwb2ludCBiZWZvcmUgcmVkaXJlY3RcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vZW5kYCxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jOiBmYWxzZSwgLy8gU3luY2hyb25vdXMgdG8gZW5zdXJlIGNvb2tpZSBpcyBjbGVhcmVkIGJlZm9yZSByZWRpcmVjdFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ29va2llIGNsZWFyZWQgdmlhIC9zZXNzaW9uL2VuZCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yIGNsZWFyaW5nIGNvb2tpZTonLCBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gQ2FsbCBsb2dvdXQgZW5kcG9pbnQgdG8gaW52YWxpZGF0ZSByZWZyZXNoIHRva2VuIGluIFJlZGlzXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQ2FsbGluZyAvYXV0aDpsb2dvdXQgQVBJJyk7XG4gICAgICAgICAgICBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOmxvZ291dCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5hY2Nlc3NUb2tlbn1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTG9nb3V0IEFQSSBjYWxsIHN1Y2Nlc3NmdWwnKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdMb2dvdXQgQVBJIGVycm9yOicsIGVycm9yLnN0YXR1cywgZXJyb3Iuc3RhdHVzVGV4dCk7XG4gICAgICAgICAgICAvLyBJZiBBUEkgZmFpbHMgKGUuZy4sIDQwMSB3aXRoIGV4cGlyZWQgdG9rZW4pLCB3ZSBzdGlsbCBuZWVkIHRvIGNsZWFyIHRoZSBjb29raWVcbiAgICAgICAgICAgIC8vIFVzZSBzZXJ2ZXItc2lkZSBzZXNzaW9uL2VuZCBlbmRwb2ludCBhcyBmYWxsYmFjayB0byBjbGVhciBodHRwT25seSBjb29raWVcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVc2luZyAvc2Vzc2lvbi9lbmQgZmFsbGJhY2sgdG8gY2xlYXIgY29va2llJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciBsb2NhbCBzdGF0ZVxuICAgICAgICB0aGlzLmFjY2Vzc1Rva2VuID0gbnVsbDtcbiAgICAgICAgaWYgKHRoaXMucmVmcmVzaFRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5yZWZyZXNoVGltZXIpO1xuICAgICAgICAgICAgdGhpcy5yZWZyZXNoVGltZXIgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgT3BlbkFQSS9TdG9wbGlnaHQgRWxlbWVudHMgdG9rZW5zIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnVHJ5SXRfc2VjdXJpdHlTY2hlbWVWYWx1ZXMnKTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdNaWtvUEJYX09wZW5BUElfVG9rZW4nKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0ZhaWxlZCB0byBjbGVhciBPcGVuQVBJIHRva2VucyBmcm9tIGxvY2FsU3RvcmFnZTonLCBlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENSSVRJQ0FMOiBSZWRpcmVjdCB0byAvc2Vzc2lvbi9lbmQgd2hpY2ggY2xlYXJzIGh0dHBPbmx5IGNvb2tpZSBzZXJ2ZXItc2lkZVxuICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGF1dGhlbnRpY2F0aW9uIGxvb3Agd2hlbiByZWZyZXNoVG9rZW4gY29va2llIGV4aXN0cyBidXQgaXMgZXhwaXJlZFxuICAgICAgICBjb25zb2xlLmxvZygnUmVkaXJlY3RpbmcgdG8gL3Nlc3Npb24vZW5kIHRvIGNsZWFyIGNvb2tpZScpO1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vZW5kYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJlZnJlc2hUb2tlbiBjb29raWUgZnJvbSBicm93c2VyXG4gICAgICpcbiAgICAgKiBJTVBPUlRBTlQ6IGh0dHBPbmx5IGNvb2tpZXMgQ0FOTk9UIGJlIGRlbGV0ZWQgdmlhIEphdmFTY3JpcHQgKGRvY3VtZW50LmNvb2tpZSkuXG4gICAgICogVGhleSBjYW4gb25seSBiZSBjbGVhcmVkIGJ5IHRoZSBzZXJ2ZXIgdmlhIFNldC1Db29raWUgaGVhZGVyLlxuICAgICAqXG4gICAgICogVGhlIC9hdXRoOmxvZ291dCBlbmRwb2ludCBoYW5kbGVzIGNvb2tpZSBkZWxldGlvbiBvbiBzZXJ2ZXIgc2lkZS5cbiAgICAgKiBUaGlzIG1ldGhvZCBleGlzdHMgZm9yIG5vbi1odHRwT25seSBmYWxsYmFjayBzY2VuYXJpb3Mgb25seS5cbiAgICAgKlxuICAgICAqIEZvciBodHRwT25seSBjb29raWVzLCB3ZSByZWx5IG9uOlxuICAgICAqIDEuIFNlcnZlci1zaWRlIGNvb2tpZSBkZWxldGlvbiBpbiAvYXV0aDpsb2dvdXQgcmVzcG9uc2VcbiAgICAgKiAyLiBTZXNzaW9uQ29udHJvbGxlci5lbmRBY3Rpb24oKSB3aGljaCBhbHNvIGNsZWFycyB0aGUgY29va2llXG4gICAgICovXG4gICAgZGVsZXRlUmVmcmVzaFRva2VuQ29va2llKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnQXR0ZW1wdGluZyB0byBkZWxldGUgcmVmcmVzaFRva2VuIGNvb2tpZSAoY2xpZW50LXNpZGUpJyk7XG5cbiAgICAgICAgLy8gTk9URTogVGhpcyB3b24ndCB3b3JrIGZvciBodHRwT25seSBjb29raWVzLCBidXQgdHJ5IGFueXdheSBmb3Igbm9uLWh0dHBPbmx5IGZhbGxiYWNrXG4gICAgICAgIGRvY3VtZW50LmNvb2tpZSA9ICdyZWZyZXNoVG9rZW49OyBleHBpcmVzPVRodSwgMDEgSmFuIDE5NzAgMDA6MDA6MDAgVVRDOyBwYXRoPS87IFNhbWVTaXRlPVN0cmljdCc7XG5cbiAgICAgICAgLy8gRm9yIEhUVFBTIChzZWN1cmUgZmxhZylcbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmNvb2tpZSA9ICdyZWZyZXNoVG9rZW49OyBleHBpcmVzPVRodSwgMDEgSmFuIDE5NzAgMDA6MDA6MDAgVVRDOyBwYXRoPS87IHNlY3VyZTsgU2FtZVNpdGU9U3RyaWN0JztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdDbGllbnQtc2lkZSBjb29raWUgZGVsZXRpb24gYXR0ZW1wdGVkIChodHRwT25seSBjb29raWVzIHJlcXVpcmUgc2VydmVyLXNpZGUgZGVsZXRpb24pJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHVzZXIgaXMgYXV0aGVudGljYXRlZFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIGFjY2VzcyB0b2tlbiBleGlzdHNcbiAgICAgKi9cbiAgICBpc0F1dGhlbnRpY2F0ZWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFjY2Vzc1Rva2VuICE9PSBudWxsO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbndpbmRvdy5Ub2tlbk1hbmFnZXIgPSBUb2tlbk1hbmFnZXI7XG5cbi8vIENSSVRJQ0FMOiBTZXQgdXAgQUpBWCBpbnRlcmNlcHRvciBJTU1FRElBVEVMWSBvbiBzY3JpcHQgbG9hZFxuLy8gVGhpcyBlbnN1cmVzIEFMTCBBSkFYIHJlcXVlc3RzIHdhaXQgZm9yIFRva2VuTWFuYWdlciBpbml0aWFsaXphdGlvblxuLy8gZXZlbiBpZiB0aGV5J3JlIGZpcmVkIGJlZm9yZSAkKGRvY3VtZW50KS5yZWFkeSgpXG5Ub2tlbk1hbmFnZXIuc2V0dXBHbG9iYWxBamF4KCk7XG5cbi8vIENSSVRJQ0FMOiBDcmVhdGUgdG9rZW5NYW5hZ2VyUmVhZHkgcHJvbWlzZSBJTU1FRElBVEVMWVxuLy8gQ2hlY2sgaWYgd2UncmUgb24gbG9naW4gcGFnZSAtIGlmIG5vdCwgc3RhcnQgaW5pdGlhbGl6YXRpb24gcmlnaHQgYXdheVxuLy8gVGhpcyBlbnN1cmVzIHRoZSBwcm9taXNlIGV4aXN0cyBiZWZvcmUgQU5ZIG90aGVyIHNjcmlwdCBydW5zXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBQcmV2ZW50IG11bHRpcGxlIGluaXRpYWxpemF0aW9ucyBvbiB0aGUgc2FtZSBwYWdlXG4gICAgaWYgKCF3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0NyZWF0aW5nIHRva2VuTWFuYWdlclJlYWR5IHByb21pc2UnKTtcblxuICAgICAgICBjb25zdCBpc0xvZ2luUGFnZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vaW5kZXgnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi8nKTtcblxuICAgICAgICBpZiAoIWlzTG9naW5QYWdlKSB7XG4gICAgICAgICAgICAvLyBOb3QgbG9naW4gcGFnZSAtIHN0YXJ0IFRva2VuTWFuYWdlciBpbml0aWFsaXphdGlvbiBpbW1lZGlhdGVseVxuICAgICAgICAgICAgLy8gVGhpcyBoYXBwZW5zIEJFRk9SRSAkKGRvY3VtZW50KS5yZWFkeSwgZW5zdXJpbmcgdG9rZW4gaXMgcmVhZHkgQVNBUFxuICAgICAgICAgICAgd2luZG93LnRva2VuTWFuYWdlclJlYWR5ID0gVG9rZW5NYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExvZ2luIHBhZ2UgLSByZXNvbHZlIGltbWVkaWF0ZWx5IChubyBhdXRoZW50aWNhdGlvbiBuZWVkZWQpXG4gICAgICAgICAgICB3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkgPSBQcm9taXNlLnJlc29sdmUodHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZygndG9rZW5NYW5hZ2VyUmVhZHkgYWxyZWFkeSBleGlzdHMsIHNraXBwaW5nIGluaXRpYWxpemF0aW9uJyk7XG4gICAgfVxufVxuIl19