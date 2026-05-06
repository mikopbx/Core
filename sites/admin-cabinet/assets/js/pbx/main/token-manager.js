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
    // Prevent multiple initializations
    if (this.isInitialized) {
      return this.accessToken !== null;
    } // Try to get access token using refresh token cookie


    var hasToken = await this.startupRefresh();

    if (!hasToken) {
      // No valid refresh token → redirect to login
      window.location = "".concat(globalRootUrl, "session/index");
      return false;
    }

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
    if (this.isRefreshing) {
      return false;
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
        return true;
      } else {
        return false;
      }
    } catch (error) {
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

    this.accessToken = token; // Clear existing timer

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    } // Schedule silent refresh 2 minutes before expiration
    // Default: 900s (15 min) - 120s = 780s (13 min)


    var refreshAt = Math.max(expiresIn - 120, 60) * 1000;
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
        // Shallow-clone options (and headers) so our header injection
        // and pre-dispatch setRequestHeader writes don't mutate the
        // caller's object. Eliminates aliasing leaks if the same
        // settings object is reused across multiple $.ajax calls.
        options = options ? Object.assign({}, options, {
          headers: Object.assign({}, options.headers)
        }) : {}; // Create jQuery Deferred to maintain compatibility with jQuery code.
        // We must expose a jqXHR-shaped object: callers (Semantic UI api,
        // dropdown queryRemote) call .abort() / .state() / .setRequestHeader()
        // on the return value. A bare Deferred().promise() lacks .abort()
        // which crashes Semantic UI's abort path with
        // "TypeError: e.abort is not a function" (see Sentry MIKOPBX-MHC).

        var deferred = $.Deferred();
        var pendingJqXHR = null;
        var aborted = false;
        window.tokenManagerReady.then(function () {
          // Caller already aborted before we got a chance to dispatch;
          // abort() has already rejected the deferred — nothing to do.
          if (aborted) {
            return;
          } // Add Authorization header


          if (self.accessToken && !options.headers.Authorization) {
            options.headers.Authorization = "Bearer ".concat(self.accessToken);
          } // Assign pendingJqXHR BEFORE chaining so a synchronous abort()
          // (e.g., from a settled-from-cache jqXHR) routes via the
          // post-dispatch branch instead of re-rejecting the deferred.


          pendingJqXHR = url ? originalAjax.call(_this2, url, options) : originalAjax.call(_this2, options); // Forward all callbacks (preserve `this` and full argument list).
          // Issue #1056: jqXHR.fail occasionally routes a jQuery.Event
          // through errorThrown (third arg) when the request was
          // aborted by an event-driven handler (e.g. DataTables
          // aborting an in-flight search on a new draw). The event
          // would then escape to window.onerror as a non-Error throw
          // and produce a fresh Sentry fingerprint per jQuery22<id>
          // cache id (Sentry MIKOPBX-MHA/MHD/MHE/MHJ/MHP). Replace
          // any jQuery.Event-shaped argument with a real Error so
          // downstream listeners see a stable, groupable value.

          pendingJqXHR.done(function () {
            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            deferred.resolveWith(this, args);
          }).fail(function () {
            for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
              args[_key2] = arguments[_key2];
            }

            // Skip args[0] — by jQuery contract that's the
            // jqXHR object; downstream listeners (Semantic UI
            // api, $(document).ajaxError) call .status / .abort
            // on it and would crash if we replaced it.
            // errorThrown sits at args[2]; we still scan the
            // tail in case third-party plugins shift positions.
            for (var i = 1; i < args.length; i += 1) {
              var a = args[i];

              if (a && _typeof(a) === 'object' && !(a instanceof Error) && ('isTrigger' in a || 'isDefaultPrevented' in a)) {
                var wrapped = new Error("jqXHR.fail received jQuery.Event: ".concat(a.type || 'unknown'));
                wrapped.name = 'JqEventInFail';
                args[i] = wrapped;
              }
            }

            deferred.rejectWith(this, args);
          });
        })["catch"](function (error) {
          console.error('TokenManager initialization failed:', error);
          deferred.reject(error);
        });
        var jqXHRProxy = deferred.promise();

        jqXHRProxy.abort = function (statusText) {
          if (pendingJqXHR && typeof pendingJqXHR.abort === 'function') {
            pendingJqXHR.abort(statusText);
            return jqXHRProxy;
          } // Pre-dispatch abort: mark the request and reject the deferred
          // ourselves; the .then() callback will see `aborted` and skip
          // the originalAjax call entirely. statusText is forwarded to
          // listeners via rejectWith — no need to stash it separately.


          aborted = true;
          deferred.rejectWith(this, [null, 'abort', statusText || 'abort']);
          return jqXHRProxy;
        };

        jqXHRProxy.setRequestHeader = function (name, value) {
          if (pendingJqXHR && typeof pendingJqXHR.setRequestHeader === 'function') {
            pendingJqXHR.setRequestHeader(name, value);
            return jqXHRProxy;
          } // Pre-dispatch: stash header in (cloned) options so it ships
          // with the request once tokenManagerReady resolves.


          options.headers[name] = value;
          return jqXHRProxy;
        };

        jqXHRProxy.getResponseHeader = function (name) {
          return pendingJqXHR && typeof pendingJqXHR.getResponseHeader === 'function' ? pendingJqXHR.getResponseHeader(name) : null;
        };

        jqXHRProxy.getAllResponseHeaders = function () {
          return pendingJqXHR && typeof pendingJqXHR.getAllResponseHeaders === 'function' ? pendingJqXHR.getAllResponseHeaders() : '';
        }; // Defined as non-enumerable getters by design so the proxy
        // doesn't expose extra keys to `for…in` consumers (real jqXHR
        // exposes these as own enumerable properties; the proxy is
        // intentionally a stricter subset).


        Object.defineProperty(jqXHRProxy, 'readyState', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.readyState : 0;
          }
        });
        Object.defineProperty(jqXHRProxy, 'status', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.status : 0;
          }
        });
        Object.defineProperty(jqXHRProxy, 'statusText', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.statusText : '';
          }
        });
        Object.defineProperty(jqXHRProxy, 'responseText', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.responseText : '';
          }
        });
        Object.defineProperty(jqXHRProxy, 'responseJSON', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.responseJSON : undefined;
          }
        });
        Object.defineProperty(jqXHRProxy, 'responseXML', {
          get: function get() {
            return pendingJqXHR ? pendingJqXHR.responseXML : undefined;
          }
        });
        return jqXHRProxy;
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
    }); // Note: we deliberately do NOT wrap $.fn.api here. Semantic UI's
    // $.fn.api uses $.ajax() under the hood, so the wrapper above already
    // injects the Authorization header. A second wrapper that returned a
    // Deferred from beforeSend violates Semantic UI's contract (it expects
    // settings or false) and was the original source of the
    // "TypeError: e.abort is not a function" crashes in dropdown
    // queryRemote (see Sentry MIKOPBX-MHC and related groups).
  },

  /**
   * Logout - clear tokens and redirect to login
   * - Calls REST API to invalidate refresh token
   * - Clears access token from memory
   * - Deletes refreshToken cookie from browser
   * - Redirects to login page
   */
  logout: async function logout() {
    // Check if already on login page - prevent redirect loop
    var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

    if (isLoginPage) {
      // Already on login page - clear state
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
        success: function success() {},
        error: function error(_jqXHR, status, _error) {}
      });
      return;
    } // Prevent multiple logout calls


    if (!this.accessToken) {
      // CRITICAL: Clear httpOnly cookie via server-side endpoint before redirect
      try {
        $.ajax({
          url: "".concat(globalRootUrl, "session/end"),
          method: 'POST',
          async: false,
          // Synchronous to ensure cookie is cleared before redirect
          success: function success() {}
        });
      } catch (e) {}

      window.location = "".concat(globalRootUrl, "session/index");
      return;
    }

    try {
      // Call logout endpoint to invalidate refresh token in Redis
      await $.ajax({
        url: '/pbxcore/api/v3/auth:logout',
        method: 'POST',
        headers: {
          Authorization: "Bearer ".concat(this.accessToken)
        }
      });
    } catch (error) {// If API fails (e.g., 401 with expired token), we still need to clear the cookie
      // Use server-side session/end endpoint as fallback to clear httpOnly cookie
    } // Clear local state


    this.accessToken = null;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    } // CRITICAL: Redirect to /session/end which clears httpOnly cookie server-side
    // This prevents authentication loop when refreshToken cookie exists but is expired


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
    // NOTE: This won't work for httpOnly cookies, but try anyway for non-httpOnly fallback
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict'; // For HTTPS (secure flag)

    if (window.location.protocol === 'https:') {
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict';
    }
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
    var isLoginPage = window.location.pathname.includes('/session/index') || window.location.pathname.includes('/session/');

    if (!isLoginPage) {
      // Not login page - start TokenManager initialization immediately
      // This happens BEFORE $(document).ready, ensuring token is ready ASAP
      window.tokenManagerReady = TokenManager.initialize();
    } else {
      // Login page - resolve immediately (no authentication needed)
      window.tokenManagerReady = Promise.resolve(true);
    }
  } else {}
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Rva2VuLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJyZWZyZXNoVGltZXIiLCJpc1JlZnJlc2hpbmciLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImhhc1Rva2VuIiwic3RhcnR1cFJlZnJlc2giLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJyZXNwb25zZSIsIiQiLCJhamF4IiwidXJsIiwibWV0aG9kIiwiZGF0YVR5cGUiLCJoZWFkZXJzIiwicmVzdWx0IiwiZGF0YSIsInNldEFjY2Vzc1Rva2VuIiwiZXhwaXJlc0luIiwiZXJyb3IiLCJ0b2tlbiIsImNsZWFyVGltZW91dCIsInJlZnJlc2hBdCIsIk1hdGgiLCJtYXgiLCJzZXRUaW1lb3V0Iiwic2lsZW50UmVmcmVzaCIsImxvZ291dCIsImNvbnNvbGUiLCJzZXR1cEdsb2JhbEFqYXgiLCJzZWxmIiwib3JpZ2luYWxBamF4Iiwib3B0aW9ucyIsInVuZGVmaW5lZCIsInJlcXVlc3RVcmwiLCJpbmNsdWRlcyIsImFwcGx5IiwiYXJndW1lbnRzIiwidG9rZW5NYW5hZ2VyUmVhZHkiLCJPYmplY3QiLCJhc3NpZ24iLCJkZWZlcnJlZCIsIkRlZmVycmVkIiwicGVuZGluZ0pxWEhSIiwiYWJvcnRlZCIsInRoZW4iLCJBdXRob3JpemF0aW9uIiwiY2FsbCIsImRvbmUiLCJhcmdzIiwicmVzb2x2ZVdpdGgiLCJmYWlsIiwiaSIsImxlbmd0aCIsImEiLCJFcnJvciIsIndyYXBwZWQiLCJ0eXBlIiwibmFtZSIsInJlamVjdFdpdGgiLCJyZWplY3QiLCJqcVhIUlByb3h5IiwicHJvbWlzZSIsImFib3J0Iiwic3RhdHVzVGV4dCIsInNldFJlcXVlc3RIZWFkZXIiLCJ2YWx1ZSIsImdldFJlc3BvbnNlSGVhZGVyIiwiZ2V0QWxsUmVzcG9uc2VIZWFkZXJzIiwiZGVmaW5lUHJvcGVydHkiLCJnZXQiLCJyZWFkeVN0YXRlIiwic3RhdHVzIiwicmVzcG9uc2VUZXh0IiwicmVzcG9uc2VKU09OIiwicmVzcG9uc2VYTUwiLCJkb2N1bWVudCIsImFqYXhFcnJvciIsImV2ZW50IiwieGhyIiwic2V0dGluZ3MiLCJpc0xvZ2luUGFnZSIsInBhdGhuYW1lIiwiYXN5bmMiLCJzdWNjZXNzIiwiX2pxWEhSIiwiZSIsImRlbGV0ZVJlZnJlc2hUb2tlbkNvb2tpZSIsImNvb2tpZSIsInByb3RvY29sIiwiaXNBdXRoZW50aWNhdGVkIiwiUHJvbWlzZSIsInJlc29sdmUiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFLElBTEk7O0FBT2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQVhHOztBQWFqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsS0FqQkc7O0FBbUJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsS0F2QkU7O0FBeUJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNVQyxFQUFBQSxVQW5DVyw4QkFtQ0U7QUFFZjtBQUNBLFFBQUksS0FBS0QsYUFBVCxFQUF3QjtBQUNwQixhQUFPLEtBQUtILFdBQUwsS0FBcUIsSUFBNUI7QUFDSCxLQUxjLENBT2Y7OztBQUNBLFFBQU1LLFFBQVEsR0FBRyxNQUFNLEtBQUtDLGNBQUwsRUFBdkI7O0FBR0EsUUFBSSxDQUFDRCxRQUFMLEVBQWU7QUFDWDtBQUNBRSxNQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJD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QUFDaUMsaUJBQVAsR0FBMkJ6QyxZQUFZLENBQUNLLFVBQWIsRUFBM0I7QUFDSCxLQUpELE1BSU87QUFDSDtBQUNBRyxNQUFBQSxNQUFNLENBQUNpQyxpQkFBUCxHQUEyQnFELE9BQU8sQ0FBQ0MsT0FBUixDQUFnQixJQUFoQixDQUEzQjtBQUNIO0FBQ0osR0FiRCxNQWFPLENBQ047QUFDSiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsICovXG5cbi8qKlxuICogVG9rZW5NYW5hZ2VyIC0gbWFuYWdlcyBKV1QgYXV0aGVudGljYXRpb24gdG9rZW5zXG4gKlxuICogU2VjdXJpdHkgYXJjaGl0ZWN0dXJlOlxuICogLSBBY2Nlc3MgdG9rZW4gKEpXVCwgMTUgbWluKSBzdG9yZWQgaW4gTUVNT1JZIChub3QgbG9jYWxTdG9yYWdlIC0gWFNTIHByb3RlY3Rpb24pXG4gKiAtIFJlZnJlc2ggdG9rZW4gKDMwIGRheXMpIHN0b3JlZCBpbiBodHRwT25seSBjb29raWUgKFhTUyBwcm90ZWN0aW9uKVxuICogLSBTaWxlbnQgcmVmcmVzaCB0aW1lciB1cGRhdGVzIGFjY2VzcyB0b2tlbiBiZWZvcmUgZXhwaXJhdGlvblxuICogLSBBbGwgQUpBWCByZXF1ZXN0cyBhdXRvbWF0aWNhbGx5IGluY2x1ZGUgQXV0aG9yaXphdGlvbjogQmVhcmVyIGhlYWRlclxuICpcbiAqIEBtb2R1bGUgVG9rZW5NYW5hZ2VyXG4gKi9cbmNvbnN0IFRva2VuTWFuYWdlciA9IHtcbiAgICAvKipcbiAgICAgKiBBY2Nlc3MgdG9rZW4gKEpXVCkgc3RvcmVkIGluIG1lbW9yeSAtIE5FVkVSIGluIGxvY2FsU3RvcmFnZS9zZXNzaW9uU3RvcmFnZVxuICAgICAqIEB0eXBlIHtzdHJpbmd8bnVsbH1cbiAgICAgKi9cbiAgICBhY2Nlc3NUb2tlbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRpbWVyIGZvciBzaWxlbnQgdG9rZW4gcmVmcmVzaFxuICAgICAqIEB0eXBlIHtudW1iZXJ8bnVsbH1cbiAgICAgKi9cbiAgICByZWZyZXNoVGltZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgbXVsdGlwbGUgc2ltdWx0YW5lb3VzIHJlZnJlc2ggYXR0ZW1wdHNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc1JlZnJlc2hpbmc6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byBwcmV2ZW50IG11bHRpcGxlIGluaXRpYWxpemF0aW9uc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBUb2tlbk1hbmFnZXJcbiAgICAgKiAtIEF0dGVtcHRzIHRvIHJlZnJlc2ggYWNjZXNzIHRva2VuIHVzaW5nIHJlZnJlc2ggdG9rZW4gY29va2llXG4gICAgICogLSBSZWRpcmVjdHMgdG8gbG9naW4gaWYgbm8gdmFsaWQgcmVmcmVzaCB0b2tlblxuICAgICAqXG4gICAgICogTm90ZTogc2V0dXBHbG9iYWxBamF4KCkgaXMgY2FsbGVkIGF1dG9tYXRpY2FsbHkgb24gc2NyaXB0IGxvYWQsXG4gICAgICogbm90IGhlcmUsIHRvIGVuc3VyZSBpdCdzIGFjdGl2ZSBiZWZvcmUgQU5ZIEFKQVggcmVxdWVzdHMgYXJlIG1hZGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxib29sZWFuPn0gdHJ1ZSBpZiBhdXRoZW50aWNhdGlvbiBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBQcmV2ZW50IG11bHRpcGxlIGluaXRpYWxpemF0aW9uc1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hY2Nlc3NUb2tlbiAhPT0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyeSB0byBnZXQgYWNjZXNzIHRva2VuIHVzaW5nIHJlZnJlc2ggdG9rZW4gY29va2llXG4gICAgICAgIGNvbnN0IGhhc1Rva2VuID0gYXdhaXQgdGhpcy5zdGFydHVwUmVmcmVzaCgpO1xuXG5cbiAgICAgICAgaWYgKCFoYXNUb2tlbikge1xuICAgICAgICAgICAgLy8gTm8gdmFsaWQgcmVmcmVzaCB0b2tlbiDihpIgcmVkaXJlY3QgdG8gbG9naW5cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnR1cCByZWZyZXNoIC0gZ2V0IG5ldyBhY2Nlc3MgdG9rZW4gdXNpbmcgcmVmcmVzaCB0b2tlbiBjb29raWVcbiAgICAgKiBDYWxsZWQgb24gcGFnZSBsb2FkIHRvIHJlc3RvcmUgYXV0aGVudGljYXRpb24gc3RhdGVcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPGJvb2xlYW4+fSB0cnVlIGlmIHJlZnJlc2ggc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGFzeW5jIHN0YXJ0dXBSZWZyZXNoKCkge1xuXG4gICAgICAgIGlmICh0aGlzLmlzUmVmcmVzaGluZykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSB0cnVlO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6cmVmcmVzaCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzZW5kIEF1dGhvcml6YXRpb24gaGVhZGVyICh1c2luZyByZWZyZXNoIGNvb2tpZSlcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7fVxuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFjY2Vzc1Rva2VuKFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuLFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmV4cGlyZXNJblxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWZyZXNoaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RvcmUgYWNjZXNzIHRva2VuIGluIG1lbW9yeSBhbmQgc2NoZWR1bGUgc2lsZW50IHJlZnJlc2hcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b2tlbiBKV1QgYWNjZXNzIHRva2VuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGV4cGlyZXNJbiBUb2tlbiBsaWZldGltZSBpbiBzZWNvbmRzXG4gICAgICovXG4gICAgc2V0QWNjZXNzVG9rZW4odG9rZW4sIGV4cGlyZXNJbikge1xuICAgICAgICB0aGlzLmFjY2Vzc1Rva2VuID0gdG9rZW47XG5cbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgdGltZXJcbiAgICAgICAgaWYgKHRoaXMucmVmcmVzaFRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5yZWZyZXNoVGltZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2NoZWR1bGUgc2lsZW50IHJlZnJlc2ggMiBtaW51dGVzIGJlZm9yZSBleHBpcmF0aW9uXG4gICAgICAgIC8vIERlZmF1bHQ6IDkwMHMgKDE1IG1pbikgLSAxMjBzID0gNzgwcyAoMTMgbWluKVxuICAgICAgICBjb25zdCByZWZyZXNoQXQgPSBNYXRoLm1heCgoZXhwaXJlc0luIC0gMTIwKSwgNjApICogMTAwMDtcblxuXG4gICAgICAgIHRoaXMucmVmcmVzaFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNpbGVudFJlZnJlc2goKTtcbiAgICAgICAgfSwgcmVmcmVzaEF0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2lsZW50IHJlZnJlc2ggLSB1cGRhdGUgYWNjZXNzIHRva2VuIGJlZm9yZSBpdCBleHBpcmVzXG4gICAgICogQXV0b21hdGljYWxseSBjYWxsZWQgYnkgdGltZXIsIHRyYW5zcGFyZW50IHRvIHVzZXJcbiAgICAgKi9cbiAgICBhc3luYyBzaWxlbnRSZWZyZXNoKCkge1xuICAgICAgICBpZiAodGhpcy5pc1JlZnJlc2hpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNSZWZyZXNoaW5nID0gdHJ1ZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOnJlZnJlc2gnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2VuZCBBdXRob3JpemF0aW9uIGhlYWRlciAodXNpbmcgcmVmcmVzaCBjb29raWUpXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge31cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QWNjZXNzVG9rZW4oXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuZXhwaXJlc0luXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVmcmVzaCBmYWlsZWQg4oaSIGxvZ291dFxuICAgICAgICAgICAgICAgIHRoaXMubG9nb3V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTaWxlbnQgcmVmcmVzaCBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gUmVmcmVzaCBmYWlsZWQg4oaSIGxvZ291dFxuICAgICAgICAgICAgdGhpcy5sb2dvdXQoKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWZyZXNoaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHVwIGdsb2JhbCBBSkFYIGludGVyY2VwdG9yXG4gICAgICogQXV0b21hdGljYWxseSBhZGRzIEF1dGhvcml6YXRpb246IEJlYXJlciBoZWFkZXIgdG8gYWxsIEFKQVggcmVxdWVzdHNcbiAgICAgKiBIYW5kbGVzIDQwMSBlcnJvcnMgYnkgbG9nZ2luZyBvdXRcbiAgICAgKi9cbiAgICBzZXR1cEdsb2JhbEFqYXgoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsICQuYWpheFxuICAgICAgICBjb25zdCBvcmlnaW5hbEFqYXggPSAkLmFqYXg7XG5cbiAgICAgICAgLy8gV3JhcCAkLmFqYXggdG8gd2FpdCBmb3IgdG9rZW4gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgJC5hamF4ID0gZnVuY3Rpb24odXJsLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgYm90aCAkLmFqYXgodXJsLCBvcHRpb25zKSBhbmQgJC5hamF4KG9wdGlvbnMpIHNpZ25hdHVyZXNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdXJsID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB1cmw7XG4gICAgICAgICAgICAgICAgdXJsID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTa2lwIGF1dGggZW5kcG9pbnRzICh0aGV5IHVzZSByZWZyZXNoIGNvb2tpZSwgbm90IGFjY2VzcyB0b2tlbilcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3RVcmwgPSB1cmwgfHwgb3B0aW9ucy51cmwgfHwgJyc7XG4gICAgICAgICAgICBpZiAocmVxdWVzdFVybC5pbmNsdWRlcygnL2F1dGg6bG9naW4nKSB8fCByZXF1ZXN0VXJsLmluY2x1ZGVzKCcvYXV0aDpyZWZyZXNoJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxBamF4LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdhaXQgZm9yIFRva2VuTWFuYWdlciBpbml0aWFsaXphdGlvbiBiZWZvcmUgcHJvY2VlZGluZ1xuICAgICAgICAgICAgaWYgKHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSkge1xuICAgICAgICAgICAgICAgIC8vIFNoYWxsb3ctY2xvbmUgb3B0aW9ucyAoYW5kIGhlYWRlcnMpIHNvIG91ciBoZWFkZXIgaW5qZWN0aW9uXG4gICAgICAgICAgICAgICAgLy8gYW5kIHByZS1kaXNwYXRjaCBzZXRSZXF1ZXN0SGVhZGVyIHdyaXRlcyBkb24ndCBtdXRhdGUgdGhlXG4gICAgICAgICAgICAgICAgLy8gY2FsbGVyJ3Mgb2JqZWN0LiBFbGltaW5hdGVzIGFsaWFzaW5nIGxlYWtzIGlmIHRoZSBzYW1lXG4gICAgICAgICAgICAgICAgLy8gc2V0dGluZ3Mgb2JqZWN0IGlzIHJldXNlZCBhY3Jvc3MgbXVsdGlwbGUgJC5hamF4IGNhbGxzLlxuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zXG4gICAgICAgICAgICAgICAgICAgID8gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywgeyBoZWFkZXJzOiBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLmhlYWRlcnMpIH0pXG4gICAgICAgICAgICAgICAgICAgIDoge307XG5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgalF1ZXJ5IERlZmVycmVkIHRvIG1haW50YWluIGNvbXBhdGliaWxpdHkgd2l0aCBqUXVlcnkgY29kZS5cbiAgICAgICAgICAgICAgICAvLyBXZSBtdXN0IGV4cG9zZSBhIGpxWEhSLXNoYXBlZCBvYmplY3Q6IGNhbGxlcnMgKFNlbWFudGljIFVJIGFwaSxcbiAgICAgICAgICAgICAgICAvLyBkcm9wZG93biBxdWVyeVJlbW90ZSkgY2FsbCAuYWJvcnQoKSAvIC5zdGF0ZSgpIC8gLnNldFJlcXVlc3RIZWFkZXIoKVxuICAgICAgICAgICAgICAgIC8vIG9uIHRoZSByZXR1cm4gdmFsdWUuIEEgYmFyZSBEZWZlcnJlZCgpLnByb21pc2UoKSBsYWNrcyAuYWJvcnQoKVxuICAgICAgICAgICAgICAgIC8vIHdoaWNoIGNyYXNoZXMgU2VtYW50aWMgVUkncyBhYm9ydCBwYXRoIHdpdGhcbiAgICAgICAgICAgICAgICAvLyBcIlR5cGVFcnJvcjogZS5hYm9ydCBpcyBub3QgYSBmdW5jdGlvblwiIChzZWUgU2VudHJ5IE1JS09QQlgtTUhDKS5cbiAgICAgICAgICAgICAgICBjb25zdCBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAgICAgICAgICAgICBsZXQgcGVuZGluZ0pxWEhSID0gbnVsbDtcbiAgICAgICAgICAgICAgICBsZXQgYWJvcnRlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgd2luZG93LnRva2VuTWFuYWdlclJlYWR5LnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBDYWxsZXIgYWxyZWFkeSBhYm9ydGVkIGJlZm9yZSB3ZSBnb3QgYSBjaGFuY2UgdG8gZGlzcGF0Y2g7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFib3J0KCkgaGFzIGFscmVhZHkgcmVqZWN0ZWQgdGhlIGRlZmVycmVkIOKAlCBub3RoaW5nIHRvIGRvLlxuICAgICAgICAgICAgICAgICAgICBpZiAoYWJvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIEF1dGhvcml6YXRpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmFjY2Vzc1Rva2VuICYmICFvcHRpb25zLmhlYWRlcnMuQXV0aG9yaXphdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5oZWFkZXJzLkF1dGhvcml6YXRpb24gPSBgQmVhcmVyICR7c2VsZi5hY2Nlc3NUb2tlbn1gO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQXNzaWduIHBlbmRpbmdKcVhIUiBCRUZPUkUgY2hhaW5pbmcgc28gYSBzeW5jaHJvbm91cyBhYm9ydCgpXG4gICAgICAgICAgICAgICAgICAgIC8vIChlLmcuLCBmcm9tIGEgc2V0dGxlZC1mcm9tLWNhY2hlIGpxWEhSKSByb3V0ZXMgdmlhIHRoZVxuICAgICAgICAgICAgICAgICAgICAvLyBwb3N0LWRpc3BhdGNoIGJyYW5jaCBpbnN0ZWFkIG9mIHJlLXJlamVjdGluZyB0aGUgZGVmZXJyZWQuXG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmdKcVhIUiA9IHVybFxuICAgICAgICAgICAgICAgICAgICAgICAgPyBvcmlnaW5hbEFqYXguY2FsbCh0aGlzLCB1cmwsIG9wdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IG9yaWdpbmFsQWpheC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvcndhcmQgYWxsIGNhbGxiYWNrcyAocHJlc2VydmUgYHRoaXNgIGFuZCBmdWxsIGFyZ3VtZW50IGxpc3QpLlxuICAgICAgICAgICAgICAgICAgICAvLyBJc3N1ZSAjMTA1NjoganFYSFIuZmFpbCBvY2Nhc2lvbmFsbHkgcm91dGVzIGEgalF1ZXJ5LkV2ZW50XG4gICAgICAgICAgICAgICAgICAgIC8vIHRocm91Z2ggZXJyb3JUaHJvd24gKHRoaXJkIGFyZykgd2hlbiB0aGUgcmVxdWVzdCB3YXNcbiAgICAgICAgICAgICAgICAgICAgLy8gYWJvcnRlZCBieSBhbiBldmVudC1kcml2ZW4gaGFuZGxlciAoZS5nLiBEYXRhVGFibGVzXG4gICAgICAgICAgICAgICAgICAgIC8vIGFib3J0aW5nIGFuIGluLWZsaWdodCBzZWFyY2ggb24gYSBuZXcgZHJhdykuIFRoZSBldmVudFxuICAgICAgICAgICAgICAgICAgICAvLyB3b3VsZCB0aGVuIGVzY2FwZSB0byB3aW5kb3cub25lcnJvciBhcyBhIG5vbi1FcnJvciB0aHJvd1xuICAgICAgICAgICAgICAgICAgICAvLyBhbmQgcHJvZHVjZSBhIGZyZXNoIFNlbnRyeSBmaW5nZXJwcmludCBwZXIgalF1ZXJ5MjI8aWQ+XG4gICAgICAgICAgICAgICAgICAgIC8vIGNhY2hlIGlkIChTZW50cnkgTUlLT1BCWC1NSEEvTUhEL01IRS9NSEovTUhQKS4gUmVwbGFjZVxuICAgICAgICAgICAgICAgICAgICAvLyBhbnkgalF1ZXJ5LkV2ZW50LXNoYXBlZCBhcmd1bWVudCB3aXRoIGEgcmVhbCBFcnJvciBzb1xuICAgICAgICAgICAgICAgICAgICAvLyBkb3duc3RyZWFtIGxpc3RlbmVycyBzZWUgYSBzdGFibGUsIGdyb3VwYWJsZSB2YWx1ZS5cbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZ0pxWEhSXG4gICAgICAgICAgICAgICAgICAgICAgICAuZG9uZShmdW5jdGlvbiAoLi4uYXJncykgeyBkZWZlcnJlZC5yZXNvbHZlV2l0aCh0aGlzLCBhcmdzKTsgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5mYWlsKGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBhcmdzWzBdIOKAlCBieSBqUXVlcnkgY29udHJhY3QgdGhhdCdzIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGpxWEhSIG9iamVjdDsgZG93bnN0cmVhbSBsaXN0ZW5lcnMgKFNlbWFudGljIFVJXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXBpLCAkKGRvY3VtZW50KS5hamF4RXJyb3IpIGNhbGwgLnN0YXR1cyAvIC5hYm9ydFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9uIGl0IGFuZCB3b3VsZCBjcmFzaCBpZiB3ZSByZXBsYWNlZCBpdC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBlcnJvclRocm93biBzaXRzIGF0IGFyZ3NbMl07IHdlIHN0aWxsIHNjYW4gdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFpbCBpbiBjYXNlIHRoaXJkLXBhcnR5IHBsdWdpbnMgc2hpZnQgcG9zaXRpb25zLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgYXJncy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gYXJnc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGEgJiYgdHlwZW9mIGEgPT09ICdvYmplY3QnICYmICEoYSBpbnN0YW5jZW9mIEVycm9yKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgKCdpc1RyaWdnZXInIGluIGEgfHwgJ2lzRGVmYXVsdFByZXZlbnRlZCcgaW4gYSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHdyYXBwZWQgPSBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYGpxWEhSLmZhaWwgcmVjZWl2ZWQgalF1ZXJ5LkV2ZW50OiAke2EudHlwZSB8fCAndW5rbm93bid9YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyYXBwZWQubmFtZSA9ICdKcUV2ZW50SW5GYWlsJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3NbaV0gPSB3cmFwcGVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdFdpdGgodGhpcywgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBqcVhIUlByb3h5ID0gZGVmZXJyZWQucHJvbWlzZSgpO1xuICAgICAgICAgICAgICAgIGpxWEhSUHJveHkuYWJvcnQgPSBmdW5jdGlvbiAoc3RhdHVzVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVuZGluZ0pxWEhSICYmIHR5cGVvZiBwZW5kaW5nSnFYSFIuYWJvcnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlbmRpbmdKcVhIUi5hYm9ydChzdGF0dXNUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBqcVhIUlByb3h5O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFByZS1kaXNwYXRjaCBhYm9ydDogbWFyayB0aGUgcmVxdWVzdCBhbmQgcmVqZWN0IHRoZSBkZWZlcnJlZFxuICAgICAgICAgICAgICAgICAgICAvLyBvdXJzZWx2ZXM7IHRoZSAudGhlbigpIGNhbGxiYWNrIHdpbGwgc2VlIGBhYm9ydGVkYCBhbmQgc2tpcFxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgb3JpZ2luYWxBamF4IGNhbGwgZW50aXJlbHkuIHN0YXR1c1RleHQgaXMgZm9yd2FyZGVkIHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGxpc3RlbmVycyB2aWEgcmVqZWN0V2l0aCDigJQgbm8gbmVlZCB0byBzdGFzaCBpdCBzZXBhcmF0ZWx5LlxuICAgICAgICAgICAgICAgICAgICBhYm9ydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0V2l0aCh0aGlzLCBbbnVsbCwgJ2Fib3J0Jywgc3RhdHVzVGV4dCB8fCAnYWJvcnQnXSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBqcVhIUlByb3h5O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAganFYSFJQcm94eS5zZXRSZXF1ZXN0SGVhZGVyID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZW5kaW5nSnFYSFIgJiYgdHlwZW9mIHBlbmRpbmdKcVhIUi5zZXRSZXF1ZXN0SGVhZGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZW5kaW5nSnFYSFIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ganFYSFJQcm94eTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBQcmUtZGlzcGF0Y2g6IHN0YXNoIGhlYWRlciBpbiAoY2xvbmVkKSBvcHRpb25zIHNvIGl0IHNoaXBzXG4gICAgICAgICAgICAgICAgICAgIC8vIHdpdGggdGhlIHJlcXVlc3Qgb25jZSB0b2tlbk1hbmFnZXJSZWFkeSByZXNvbHZlcy5cbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5oZWFkZXJzW25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBqcVhIUlByb3h5O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAganFYSFJQcm94eS5nZXRSZXNwb25zZUhlYWRlciA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwZW5kaW5nSnFYSFIgJiYgdHlwZW9mIHBlbmRpbmdKcVhIUi5nZXRSZXNwb25zZUhlYWRlciA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBwZW5kaW5nSnFYSFIuZ2V0UmVzcG9uc2VIZWFkZXIobmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIDogbnVsbDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGpxWEhSUHJveHkuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGVuZGluZ0pxWEhSICYmIHR5cGVvZiBwZW5kaW5nSnFYSFIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzID09PSAnZnVuY3Rpb24nXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHBlbmRpbmdKcVhIUi5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIC8vIERlZmluZWQgYXMgbm9uLWVudW1lcmFibGUgZ2V0dGVycyBieSBkZXNpZ24gc28gdGhlIHByb3h5XG4gICAgICAgICAgICAgICAgLy8gZG9lc24ndCBleHBvc2UgZXh0cmEga2V5cyB0byBgZm9y4oCmaW5gIGNvbnN1bWVycyAocmVhbCBqcVhIUlxuICAgICAgICAgICAgICAgIC8vIGV4cG9zZXMgdGhlc2UgYXMgb3duIGVudW1lcmFibGUgcHJvcGVydGllczsgdGhlIHByb3h5IGlzXG4gICAgICAgICAgICAgICAgLy8gaW50ZW50aW9uYWxseSBhIHN0cmljdGVyIHN1YnNldCkuXG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGpxWEhSUHJveHksICdyZWFkeVN0YXRlJywge1xuICAgICAgICAgICAgICAgICAgICBnZXQoKSB7IHJldHVybiBwZW5kaW5nSnFYSFIgPyBwZW5kaW5nSnFYSFIucmVhZHlTdGF0ZSA6IDA7IH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGpxWEhSUHJveHksICdzdGF0dXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldCgpIHsgcmV0dXJuIHBlbmRpbmdKcVhIUiA/IHBlbmRpbmdKcVhIUi5zdGF0dXMgOiAwOyB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShqcVhIUlByb3h5LCAnc3RhdHVzVGV4dCcsIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0KCkgeyByZXR1cm4gcGVuZGluZ0pxWEhSID8gcGVuZGluZ0pxWEhSLnN0YXR1c1RleHQgOiAnJzsgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoanFYSFJQcm94eSwgJ3Jlc3BvbnNlVGV4dCcsIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0KCkgeyByZXR1cm4gcGVuZGluZ0pxWEhSID8gcGVuZGluZ0pxWEhSLnJlc3BvbnNlVGV4dCA6ICcnOyB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShqcVhIUlByb3h5LCAncmVzcG9uc2VKU09OJywge1xuICAgICAgICAgICAgICAgICAgICBnZXQoKSB7IHJldHVybiBwZW5kaW5nSnFYSFIgPyBwZW5kaW5nSnFYSFIucmVzcG9uc2VKU09OIDogdW5kZWZpbmVkOyB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShqcVhIUlByb3h5LCAncmVzcG9uc2VYTUwnLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldCgpIHsgcmV0dXJuIHBlbmRpbmdKcVhIUiA/IHBlbmRpbmdKcVhIUi5yZXNwb25zZVhNTCA6IHVuZGVmaW5lZDsgfSxcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBqcVhIUlByb3h5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUb2tlbk1hbmFnZXIgbm90IGluaXRpYWxpemVkIHlldCAtIHByb2NlZWQgd2l0aG91dCB0b2tlblxuICAgICAgICAgICAgLy8gKHRoaXMgc2hvdWxkIG9ubHkgaGFwcGVuIG9uIGxvZ2luIHBhZ2UpXG4gICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxBamF4LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWxzbyBzZXQgdXAgZXJyb3IgaGFuZGxlclxuICAgICAgICAkKGRvY3VtZW50KS5hamF4RXJyb3IoKGV2ZW50LCB4aHIsIHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdW5hdXRob3JpemVkIGVycm9yc1xuICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIG9uIGxvZ2luIHBhZ2UgLSBkb24ndCB0cmlnZ2VyIGxvZ291dCBsb29wXG4gICAgICAgICAgICAgICAgY29uc3QgaXNMb2dpblBhZ2UgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uL2luZGV4JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi8nKTtcblxuICAgICAgICAgICAgICAgIGlmICghaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVG9rZW4gZXhwaXJlZCBvciBpbnZhbGlkIOKGkiBsb2dvdXRcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dvdXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE5vdGU6IHdlIGRlbGliZXJhdGVseSBkbyBOT1Qgd3JhcCAkLmZuLmFwaSBoZXJlLiBTZW1hbnRpYyBVSSdzXG4gICAgICAgIC8vICQuZm4uYXBpIHVzZXMgJC5hamF4KCkgdW5kZXIgdGhlIGhvb2QsIHNvIHRoZSB3cmFwcGVyIGFib3ZlIGFscmVhZHlcbiAgICAgICAgLy8gaW5qZWN0cyB0aGUgQXV0aG9yaXphdGlvbiBoZWFkZXIuIEEgc2Vjb25kIHdyYXBwZXIgdGhhdCByZXR1cm5lZCBhXG4gICAgICAgIC8vIERlZmVycmVkIGZyb20gYmVmb3JlU2VuZCB2aW9sYXRlcyBTZW1hbnRpYyBVSSdzIGNvbnRyYWN0IChpdCBleHBlY3RzXG4gICAgICAgIC8vIHNldHRpbmdzIG9yIGZhbHNlKSBhbmQgd2FzIHRoZSBvcmlnaW5hbCBzb3VyY2Ugb2YgdGhlXG4gICAgICAgIC8vIFwiVHlwZUVycm9yOiBlLmFib3J0IGlzIG5vdCBhIGZ1bmN0aW9uXCIgY3Jhc2hlcyBpbiBkcm9wZG93blxuICAgICAgICAvLyBxdWVyeVJlbW90ZSAoc2VlIFNlbnRyeSBNSUtPUEJYLU1IQyBhbmQgcmVsYXRlZCBncm91cHMpLlxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2dvdXQgLSBjbGVhciB0b2tlbnMgYW5kIHJlZGlyZWN0IHRvIGxvZ2luXG4gICAgICogLSBDYWxscyBSRVNUIEFQSSB0byBpbnZhbGlkYXRlIHJlZnJlc2ggdG9rZW5cbiAgICAgKiAtIENsZWFycyBhY2Nlc3MgdG9rZW4gZnJvbSBtZW1vcnlcbiAgICAgKiAtIERlbGV0ZXMgcmVmcmVzaFRva2VuIGNvb2tpZSBmcm9tIGJyb3dzZXJcbiAgICAgKiAtIFJlZGlyZWN0cyB0byBsb2dpbiBwYWdlXG4gICAgICovXG4gICAgYXN5bmMgbG9nb3V0KCkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgb24gbG9naW4gcGFnZSAtIHByZXZlbnQgcmVkaXJlY3QgbG9vcFxuICAgICAgICBjb25zdCBpc0xvZ2luUGFnZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vaW5kZXgnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi8nKTtcblxuICAgICAgICBpZiAoaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgb24gbG9naW4gcGFnZSAtIGNsZWFyIHN0YXRlXG4gICAgICAgICAgICB0aGlzLmFjY2Vzc1Rva2VuID0gbnVsbDtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlZnJlc2hUaW1lcikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoVGltZXIgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDUklUSUNBTDogQ2xlYXIgaHR0cE9ubHkgY29va2llIHZpYSBzZXJ2ZXItc2lkZSBBSkFYIGVuZHBvaW50XG4gICAgICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGF1dGhlbnRpY2F0aW9uIGxvb3Agd2hlbiByZWZyZXNoVG9rZW4gZXhpc3RzIGJ1dCBpcyBleHBpcmVkXG4gICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2VuZGAsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgYXN5bmM6IGZhbHNlLCAvLyBTeW5jaHJvbm91cyB0byBlbnN1cmUgY29va2llIGlzIGNsZWFyZWRcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlcnJvcjogKF9qcVhIUiwgc3RhdHVzLCBlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJldmVudCBtdWx0aXBsZSBsb2dvdXQgY2FsbHNcbiAgICAgICAgaWYgKCF0aGlzLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAvLyBDUklUSUNBTDogQ2xlYXIgaHR0cE9ubHkgY29va2llIHZpYSBzZXJ2ZXItc2lkZSBlbmRwb2ludCBiZWZvcmUgcmVkaXJlY3RcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vZW5kYCxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jOiBmYWxzZSwgLy8gU3luY2hyb25vdXMgdG8gZW5zdXJlIGNvb2tpZSBpcyBjbGVhcmVkIGJlZm9yZSByZWRpcmVjdFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gQ2FsbCBsb2dvdXQgZW5kcG9pbnQgdG8gaW52YWxpZGF0ZSByZWZyZXNoIHRva2VuIGluIFJlZGlzXG4gICAgICAgICAgICBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOmxvZ291dCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5hY2Nlc3NUb2tlbn1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBJZiBBUEkgZmFpbHMgKGUuZy4sIDQwMSB3aXRoIGV4cGlyZWQgdG9rZW4pLCB3ZSBzdGlsbCBuZWVkIHRvIGNsZWFyIHRoZSBjb29raWVcbiAgICAgICAgICAgIC8vIFVzZSBzZXJ2ZXItc2lkZSBzZXNzaW9uL2VuZCBlbmRwb2ludCBhcyBmYWxsYmFjayB0byBjbGVhciBodHRwT25seSBjb29raWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIGxvY2FsIHN0YXRlXG4gICAgICAgIHRoaXMuYWNjZXNzVG9rZW4gPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5yZWZyZXNoVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2hUaW1lciA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDUklUSUNBTDogUmVkaXJlY3QgdG8gL3Nlc3Npb24vZW5kIHdoaWNoIGNsZWFycyBodHRwT25seSBjb29raWUgc2VydmVyLXNpZGVcbiAgICAgICAgLy8gVGhpcyBwcmV2ZW50cyBhdXRoZW50aWNhdGlvbiBsb29wIHdoZW4gcmVmcmVzaFRva2VuIGNvb2tpZSBleGlzdHMgYnV0IGlzIGV4cGlyZWRcbiAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2VuZGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSByZWZyZXNoVG9rZW4gY29va2llIGZyb20gYnJvd3NlclxuICAgICAqXG4gICAgICogSU1QT1JUQU5UOiBodHRwT25seSBjb29raWVzIENBTk5PVCBiZSBkZWxldGVkIHZpYSBKYXZhU2NyaXB0IChkb2N1bWVudC5jb29raWUpLlxuICAgICAqIFRoZXkgY2FuIG9ubHkgYmUgY2xlYXJlZCBieSB0aGUgc2VydmVyIHZpYSBTZXQtQ29va2llIGhlYWRlci5cbiAgICAgKlxuICAgICAqIFRoZSAvYXV0aDpsb2dvdXQgZW5kcG9pbnQgaGFuZGxlcyBjb29raWUgZGVsZXRpb24gb24gc2VydmVyIHNpZGUuXG4gICAgICogVGhpcyBtZXRob2QgZXhpc3RzIGZvciBub24taHR0cE9ubHkgZmFsbGJhY2sgc2NlbmFyaW9zIG9ubHkuXG4gICAgICpcbiAgICAgKiBGb3IgaHR0cE9ubHkgY29va2llcywgd2UgcmVseSBvbjpcbiAgICAgKiAxLiBTZXJ2ZXItc2lkZSBjb29raWUgZGVsZXRpb24gaW4gL2F1dGg6bG9nb3V0IHJlc3BvbnNlXG4gICAgICogMi4gU2Vzc2lvbkNvbnRyb2xsZXIuZW5kQWN0aW9uKCkgd2hpY2ggYWxzbyBjbGVhcnMgdGhlIGNvb2tpZVxuICAgICAqL1xuICAgIGRlbGV0ZVJlZnJlc2hUb2tlbkNvb2tpZSgpIHtcblxuICAgICAgICAvLyBOT1RFOiBUaGlzIHdvbid0IHdvcmsgZm9yIGh0dHBPbmx5IGNvb2tpZXMsIGJ1dCB0cnkgYW55d2F5IGZvciBub24taHR0cE9ubHkgZmFsbGJhY2tcbiAgICAgICAgZG9jdW1lbnQuY29va2llID0gJ3JlZnJlc2hUb2tlbj07IGV4cGlyZXM9VGh1LCAwMSBKYW4gMTk3MCAwMDowMDowMCBVVEM7IHBhdGg9LzsgU2FtZVNpdGU9U3RyaWN0JztcblxuICAgICAgICAvLyBGb3IgSFRUUFMgKHNlY3VyZSBmbGFnKVxuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSAnaHR0cHM6Jykge1xuICAgICAgICAgICAgZG9jdW1lbnQuY29va2llID0gJ3JlZnJlc2hUb2tlbj07IGV4cGlyZXM9VGh1LCAwMSBKYW4gMTk3MCAwMDowMDowMCBVVEM7IHBhdGg9Lzsgc2VjdXJlOyBTYW1lU2l0ZT1TdHJpY3QnO1xuICAgICAgICB9XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdXNlciBpcyBhdXRoZW50aWNhdGVkXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgYWNjZXNzIHRva2VuIGV4aXN0c1xuICAgICAqL1xuICAgIGlzQXV0aGVudGljYXRlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWNjZXNzVG9rZW4gIT09IG51bGw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LlRva2VuTWFuYWdlciA9IFRva2VuTWFuYWdlcjtcblxuLy8gQ1JJVElDQUw6IFNldCB1cCBBSkFYIGludGVyY2VwdG9yIElNTUVESUFURUxZIG9uIHNjcmlwdCBsb2FkXG4vLyBUaGlzIGVuc3VyZXMgQUxMIEFKQVggcmVxdWVzdHMgd2FpdCBmb3IgVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uXG4vLyBldmVuIGlmIHRoZXkncmUgZmlyZWQgYmVmb3JlICQoZG9jdW1lbnQpLnJlYWR5KClcblRva2VuTWFuYWdlci5zZXR1cEdsb2JhbEFqYXgoKTtcblxuLy8gQ1JJVElDQUw6IENyZWF0ZSB0b2tlbk1hbmFnZXJSZWFkeSBwcm9taXNlIElNTUVESUFURUxZXG4vLyBDaGVjayBpZiB3ZSdyZSBvbiBsb2dpbiBwYWdlIC0gaWYgbm90LCBzdGFydCBpbml0aWFsaXphdGlvbiByaWdodCBhd2F5XG4vLyBUaGlzIGVuc3VyZXMgdGhlIHByb21pc2UgZXhpc3RzIGJlZm9yZSBBTlkgb3RoZXIgc2NyaXB0IHJ1bnNcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIFByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb25zIG9uIHRoZSBzYW1lIHBhZ2VcbiAgICBpZiAoIXdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSkge1xuXG4gICAgICAgIGNvbnN0IGlzTG9naW5QYWdlID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi9pbmRleCcpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uLycpO1xuXG4gICAgICAgIGlmICghaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgIC8vIE5vdCBsb2dpbiBwYWdlIC0gc3RhcnQgVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAvLyBUaGlzIGhhcHBlbnMgQkVGT1JFICQoZG9jdW1lbnQpLnJlYWR5LCBlbnN1cmluZyB0b2tlbiBpcyByZWFkeSBBU0FQXG4gICAgICAgICAgICB3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkgPSBUb2tlbk1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTG9naW4gcGFnZSAtIHJlc29sdmUgaW1tZWRpYXRlbHkgKG5vIGF1dGhlbnRpY2F0aW9uIG5lZWRlZClcbiAgICAgICAgICAgIHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSA9IFByb21pc2UucmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgfVxufVxuIl19