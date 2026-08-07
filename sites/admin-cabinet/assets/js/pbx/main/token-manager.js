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
   * Flag to prevent multiple simultaneous logouts.
   *
   * A page with several pollers (advice worker, event bus, DataTable refresh)
   * gets one 401 per in-flight request when the session dies, and the global
   * ajaxError handler calls logout() for every one of them. Without this flag
   * that means N parallel auth:logout calls, N synchronous session/end calls,
   * and a race over the landing page: the first call ends at session/end
   * while a later one, seeing accessToken already nulled, sets session/index.
   * Never reset: every path guarded by it navigates away from the page. The
   * login-page branch, which returns without navigating, is left unguarded.
   * @type {boolean}
   */
  isLoggingOut: false,

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
    } // A burst of 401s must produce exactly one logout, not one per request.
    // Latched below the login-page branch above: that branch returns without
    // navigating, so latching there would swallow its cookie cleanup later.


    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true; // Prevent multiple logout calls

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Rva2VuLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiVG9rZW5NYW5hZ2VyIiwiYWNjZXNzVG9rZW4iLCJyZWZyZXNoVGltZXIiLCJpc1JlZnJlc2hpbmciLCJpc0xvZ2dpbmdPdXQiLCJpc0luaXRpYWxpemVkIiwiaW5pdGlhbGl6ZSIsImhhc1Rva2VuIiwic3RhcnR1cFJlZnJlc2giLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJyZXNwb25zZSIsIiQiLCJhamF4IiwidXJsIiwibWV0aG9kIiwiZGF0YVR5cGUiLCJoZWFkZXJzIiwicmVzdWx0IiwiZGF0YSIsInNldEFjY2Vzc1Rva2VuIiwiZXhwaXJlc0luIiwiZXJyb3IiLCJ0b2tlbiIsImNsZWFyVGltZW91dCIsInJlZnJlc2hBdCIsIk1hdGgiLCJtYXgiLCJzZXRUaW1lb3V0Iiwic2lsZW50UmVmcmVzaCIsImxvZ291dCIsImNvbnNvbGUiLCJzZXR1cEdsb2JhbEFqYXgiLCJzZWxmIiwib3JpZ2luYWxBamF4Iiwib3B0aW9ucyIsInVuZGVmaW5lZCIsInJlcXVlc3RVcmwiLCJpbmNsdWRlcyIsImFwcGx5IiwiYXJndW1lbnRzIiwidG9rZW5NYW5hZ2VyUmVhZHkiLCJPYmplY3QiLCJhc3NpZ24iLCJkZWZlcnJlZCIsIkRlZmVycmVkIiwicGVuZGluZ0pxWEhSIiwiYWJvcnRlZCIsInRoZW4iLCJBdXRob3JpemF0aW9uIiwiY2FsbCIsImRvbmUiLCJhcmdzIiwicmVzb2x2ZVdpdGgiLCJmYWlsIiwiaSIsImxlbmd0aCIsImEiLCJFcnJvciIsIndyYXBwZWQiLCJ0eXBlIiwibmFtZSIsInJlamVjdFdpdGgiLCJyZWplY3QiLCJqcVhIUlByb3h5IiwicHJvbWlzZSIsImFib3J0Iiwic3RhdHVzVGV4dCIsInNldFJlcXVlc3RIZWFkZXIiLCJ2YWx1ZSIsImdldFJlc3BvbnNlSGVhZGVyIiwiZ2V0QWxsUmVzcG9uc2VIZWFkZXJzIiwiZGVmaW5lUHJvcGVydHkiLCJnZXQiLCJyZWFkeVN0YXRlIiwic3RhdHVzIiwicmVzcG9uc2VUZXh0IiwicmVzcG9uc2VKU09OIiwicmVzcG9uc2VYTUwiLCJkb2N1bWVudCIsImFqYXhFcnJvciIsImV2ZW50IiwieGhyIiwic2V0dGluZ3MiLCJpc0xvZ2luUGFnZSIsInBhdGhuYW1lIiwiYXN5bmMiLCJzdWNjZXNzIiwiX2pxWEhSIiwiZSIsImRlbGV0ZVJlZnJlc2hUb2tlbkNvb2tpZSIsImNvb2tpZSIsInByb3RvY29sIiwiaXNBdXRoZW50aWNhdGVkIiwiUHJvbWlzZSIsInJlc29sdmUiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFLElBTEk7O0FBT2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQVhHOztBQWFqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsS0FqQkc7O0FBbUJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsS0FoQ0c7O0FBa0NqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsS0F0Q0U7O0FBd0NqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNVQyxFQUFBQSxVQWxEVyw4QkFrREU7QUFFZjtBQUNBLFFBQUksS0FBS0QsYUFBVCxFQUF3QjtBQUNwQixhQUFPLEtBQUtKLFdBQUwsS0FBcUIsSUFBNUI7QUFDSCxLQUxjLENBT2Y7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QU0yQyxXQUFXLEdBQUc1RSxNQUFNLENBQUNDLFFBQVAsQ0FBZ0I0RSxRQUFoQixDQUF5Qi9DLFFBQXpCLENBQWtDLGdCQUFsQyxLQUNEOUIsTUFBTSxDQUFDQyxRQUFQLENBQWdCNEUsUUFBaEIsQ0FBeUIvQyxRQUF6QixDQUFrQyxXQUFsQyxDQURuQjs7QUFHQSxRQUFJLENBQUM4QyxXQUFMLEVBQWtCO0FBQ2Q7QUFDQTtBQUNBNUUsTUFBQUEsTUFBTSxDQUFDaUMsaUJBQVAsR0FBMkIxQyxZQUFZLENBQUNNLFVBQWIsRUFBM0I7QUFDSCxLQUpELE1BSU87QUFDSDtBQUNBRyxNQUFBQSxNQUFNLENBQUNpQyxpQkFBUCxHQUEyQnFELE9BQU8sQ0FBQ0MsT0FBUixDQUFnQixJQUFoQixDQUEzQjtBQUNIO0FBQ0osR0FiRCxNQWFPLENBQ047QUFDSiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsICovXG5cbi8qKlxuICogVG9rZW5NYW5hZ2VyIC0gbWFuYWdlcyBKV1QgYXV0aGVudGljYXRpb24gdG9rZW5zXG4gKlxuICogU2VjdXJpdHkgYXJjaGl0ZWN0dXJlOlxuICogLSBBY2Nlc3MgdG9rZW4gKEpXVCwgMTUgbWluKSBzdG9yZWQgaW4gTUVNT1JZIChub3QgbG9jYWxTdG9yYWdlIC0gWFNTIHByb3RlY3Rpb24pXG4gKiAtIFJlZnJlc2ggdG9rZW4gKDMwIGRheXMpIHN0b3JlZCBpbiBodHRwT25seSBjb29raWUgKFhTUyBwcm90ZWN0aW9uKVxuICogLSBTaWxlbnQgcmVmcmVzaCB0aW1lciB1cGRhdGVzIGFjY2VzcyB0b2tlbiBiZWZvcmUgZXhwaXJhdGlvblxuICogLSBBbGwgQUpBWCByZXF1ZXN0cyBhdXRvbWF0aWNhbGx5IGluY2x1ZGUgQXV0aG9yaXphdGlvbjogQmVhcmVyIGhlYWRlclxuICpcbiAqIEBtb2R1bGUgVG9rZW5NYW5hZ2VyXG4gKi9cbmNvbnN0IFRva2VuTWFuYWdlciA9IHtcbiAgICAvKipcbiAgICAgKiBBY2Nlc3MgdG9rZW4gKEpXVCkgc3RvcmVkIGluIG1lbW9yeSAtIE5FVkVSIGluIGxvY2FsU3RvcmFnZS9zZXNzaW9uU3RvcmFnZVxuICAgICAqIEB0eXBlIHtzdHJpbmd8bnVsbH1cbiAgICAgKi9cbiAgICBhY2Nlc3NUb2tlbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRpbWVyIGZvciBzaWxlbnQgdG9rZW4gcmVmcmVzaFxuICAgICAqIEB0eXBlIHtudW1iZXJ8bnVsbH1cbiAgICAgKi9cbiAgICByZWZyZXNoVGltZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgbXVsdGlwbGUgc2ltdWx0YW5lb3VzIHJlZnJlc2ggYXR0ZW1wdHNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc1JlZnJlc2hpbmc6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byBwcmV2ZW50IG11bHRpcGxlIHNpbXVsdGFuZW91cyBsb2dvdXRzLlxuICAgICAqXG4gICAgICogQSBwYWdlIHdpdGggc2V2ZXJhbCBwb2xsZXJzIChhZHZpY2Ugd29ya2VyLCBldmVudCBidXMsIERhdGFUYWJsZSByZWZyZXNoKVxuICAgICAqIGdldHMgb25lIDQwMSBwZXIgaW4tZmxpZ2h0IHJlcXVlc3Qgd2hlbiB0aGUgc2Vzc2lvbiBkaWVzLCBhbmQgdGhlIGdsb2JhbFxuICAgICAqIGFqYXhFcnJvciBoYW5kbGVyIGNhbGxzIGxvZ291dCgpIGZvciBldmVyeSBvbmUgb2YgdGhlbS4gV2l0aG91dCB0aGlzIGZsYWdcbiAgICAgKiB0aGF0IG1lYW5zIE4gcGFyYWxsZWwgYXV0aDpsb2dvdXQgY2FsbHMsIE4gc3luY2hyb25vdXMgc2Vzc2lvbi9lbmQgY2FsbHMsXG4gICAgICogYW5kIGEgcmFjZSBvdmVyIHRoZSBsYW5kaW5nIHBhZ2U6IHRoZSBmaXJzdCBjYWxsIGVuZHMgYXQgc2Vzc2lvbi9lbmRcbiAgICAgKiB3aGlsZSBhIGxhdGVyIG9uZSwgc2VlaW5nIGFjY2Vzc1Rva2VuIGFscmVhZHkgbnVsbGVkLCBzZXRzIHNlc3Npb24vaW5kZXguXG4gICAgICogTmV2ZXIgcmVzZXQ6IGV2ZXJ5IHBhdGggZ3VhcmRlZCBieSBpdCBuYXZpZ2F0ZXMgYXdheSBmcm9tIHRoZSBwYWdlLiBUaGVcbiAgICAgKiBsb2dpbi1wYWdlIGJyYW5jaCwgd2hpY2ggcmV0dXJucyB3aXRob3V0IG5hdmlnYXRpbmcsIGlzIGxlZnQgdW5ndWFyZGVkLlxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzTG9nZ2luZ091dDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb25zXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFRva2VuTWFuYWdlclxuICAgICAqIC0gQXR0ZW1wdHMgdG8gcmVmcmVzaCBhY2Nlc3MgdG9rZW4gdXNpbmcgcmVmcmVzaCB0b2tlbiBjb29raWVcbiAgICAgKiAtIFJlZGlyZWN0cyB0byBsb2dpbiBpZiBubyB2YWxpZCByZWZyZXNoIHRva2VuXG4gICAgICpcbiAgICAgKiBOb3RlOiBzZXR1cEdsb2JhbEFqYXgoKSBpcyBjYWxsZWQgYXV0b21hdGljYWxseSBvbiBzY3JpcHQgbG9hZCxcbiAgICAgKiBub3QgaGVyZSwgdG8gZW5zdXJlIGl0J3MgYWN0aXZlIGJlZm9yZSBBTlkgQUpBWCByZXF1ZXN0cyBhcmUgbWFkZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPGJvb2xlYW4+fSB0cnVlIGlmIGF1dGhlbnRpY2F0aW9uIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBhc3luYyBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8vIFByZXZlbnQgbXVsdGlwbGUgaW5pdGlhbGl6YXRpb25zXG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFjY2Vzc1Rva2VuICE9PSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJ5IHRvIGdldCBhY2Nlc3MgdG9rZW4gdXNpbmcgcmVmcmVzaCB0b2tlbiBjb29raWVcbiAgICAgICAgY29uc3QgaGFzVG9rZW4gPSBhd2FpdCB0aGlzLnN0YXJ0dXBSZWZyZXNoKCk7XG5cblxuICAgICAgICBpZiAoIWhhc1Rva2VuKSB7XG4gICAgICAgICAgICAvLyBObyB2YWxpZCByZWZyZXNoIHRva2VuIOKGkiByZWRpcmVjdCB0byBsb2dpblxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHVwIHJlZnJlc2ggLSBnZXQgbmV3IGFjY2VzcyB0b2tlbiB1c2luZyByZWZyZXNoIHRva2VuIGNvb2tpZVxuICAgICAqIENhbGxlZCBvbiBwYWdlIGxvYWQgdG8gcmVzdG9yZSBhdXRoZW50aWNhdGlvbiBzdGF0ZVxuICAgICAqXG4gICAgICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59IHRydWUgaWYgcmVmcmVzaCBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgYXN5bmMgc3RhcnR1cFJlZnJlc2goKSB7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNSZWZyZXNoaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmlzUmVmcmVzaGluZyA9IHRydWU7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvYXV0aDpyZWZyZXNoJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgICAgICAgIC8vIERvbid0IHNlbmQgQXV0aG9yaXphdGlvbiBoZWFkZXIgKHVzaW5nIHJlZnJlc2ggY29va2llKVxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHt9XG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QWNjZXNzVG9rZW4oXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuZXhwaXJlc0luXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdG9yZSBhY2Nlc3MgdG9rZW4gaW4gbWVtb3J5IGFuZCBzY2hlZHVsZSBzaWxlbnQgcmVmcmVzaFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIEpXVCBhY2Nlc3MgdG9rZW5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZXhwaXJlc0luIFRva2VuIGxpZmV0aW1lIGluIHNlY29uZHNcbiAgICAgKi9cbiAgICBzZXRBY2Nlc3NUb2tlbih0b2tlbiwgZXhwaXJlc0luKSB7XG4gICAgICAgIHRoaXMuYWNjZXNzVG9rZW4gPSB0b2tlbjtcblxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lclxuICAgICAgICBpZiAodGhpcy5yZWZyZXNoVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTY2hlZHVsZSBzaWxlbnQgcmVmcmVzaCAyIG1pbnV0ZXMgYmVmb3JlIGV4cGlyYXRpb25cbiAgICAgICAgLy8gRGVmYXVsdDogOTAwcyAoMTUgbWluKSAtIDEyMHMgPSA3ODBzICgxMyBtaW4pXG4gICAgICAgIGNvbnN0IHJlZnJlc2hBdCA9IE1hdGgubWF4KChleHBpcmVzSW4gLSAxMjApLCA2MCkgKiAxMDAwO1xuXG5cbiAgICAgICAgdGhpcy5yZWZyZXNoVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2lsZW50UmVmcmVzaCgpO1xuICAgICAgICB9LCByZWZyZXNoQXQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaWxlbnQgcmVmcmVzaCAtIHVwZGF0ZSBhY2Nlc3MgdG9rZW4gYmVmb3JlIGl0IGV4cGlyZXNcbiAgICAgKiBBdXRvbWF0aWNhbGx5IGNhbGxlZCBieSB0aW1lciwgdHJhbnNwYXJlbnQgdG8gdXNlclxuICAgICAqL1xuICAgIGFzeW5jIHNpbGVudFJlZnJlc2goKSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVmcmVzaGluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSB0cnVlO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6cmVmcmVzaCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzZW5kIEF1dGhvcml6YXRpb24gaGVhZGVyICh1c2luZyByZWZyZXNoIGNvb2tpZSlcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7fVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBY2Nlc3NUb2tlbihcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbixcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5leHBpcmVzSW5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZWZyZXNoIGZhaWxlZCDihpIgbG9nb3V0XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dvdXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpbGVudCByZWZyZXNoIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBSZWZyZXNoIGZhaWxlZCDihpIgbG9nb3V0XG4gICAgICAgICAgICB0aGlzLmxvZ291dCgpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5pc1JlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgdXAgZ2xvYmFsIEFKQVggaW50ZXJjZXB0b3JcbiAgICAgKiBBdXRvbWF0aWNhbGx5IGFkZHMgQXV0aG9yaXphdGlvbjogQmVhcmVyIGhlYWRlciB0byBhbGwgQUpBWCByZXF1ZXN0c1xuICAgICAqIEhhbmRsZXMgNDAxIGVycm9ycyBieSBsb2dnaW5nIG91dFxuICAgICAqL1xuICAgIHNldHVwR2xvYmFsQWpheCgpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgJC5hamF4XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQWpheCA9ICQuYWpheDtcblxuICAgICAgICAvLyBXcmFwICQuYWpheCB0byB3YWl0IGZvciB0b2tlbiBpbml0aWFsaXphdGlvblxuICAgICAgICAkLmFqYXggPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoICQuYWpheCh1cmwsIG9wdGlvbnMpIGFuZCAkLmFqYXgob3B0aW9ucykgc2lnbmF0dXJlc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB1cmwgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHVybDtcbiAgICAgICAgICAgICAgICB1cmwgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNraXAgYXV0aCBlbmRwb2ludHMgKHRoZXkgdXNlIHJlZnJlc2ggY29va2llLCBub3QgYWNjZXNzIHRva2VuKVxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdFVybCA9IHVybCB8fCBvcHRpb25zLnVybCB8fCAnJztcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0VXJsLmluY2x1ZGVzKCcvYXV0aDpsb2dpbicpIHx8IHJlcXVlc3RVcmwuaW5jbHVkZXMoJy9hdXRoOnJlZnJlc2gnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2FpdCBmb3IgVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIGJlZm9yZSBwcm9jZWVkaW5nXG4gICAgICAgICAgICBpZiAod2luZG93LnRva2VuTWFuYWdlclJlYWR5KSB7XG4gICAgICAgICAgICAgICAgLy8gU2hhbGxvdy1jbG9uZSBvcHRpb25zIChhbmQgaGVhZGVycykgc28gb3VyIGhlYWRlciBpbmplY3Rpb25cbiAgICAgICAgICAgICAgICAvLyBhbmQgcHJlLWRpc3BhdGNoIHNldFJlcXVlc3RIZWFkZXIgd3JpdGVzIGRvbid0IG11dGF0ZSB0aGVcbiAgICAgICAgICAgICAgICAvLyBjYWxsZXIncyBvYmplY3QuIEVsaW1pbmF0ZXMgYWxpYXNpbmcgbGVha3MgaWYgdGhlIHNhbWVcbiAgICAgICAgICAgICAgICAvLyBzZXR0aW5ncyBvYmplY3QgaXMgcmV1c2VkIGFjcm9zcyBtdWx0aXBsZSAkLmFqYXggY2FsbHMuXG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgPyBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7IGhlYWRlcnM6IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMuaGVhZGVycykgfSlcbiAgICAgICAgICAgICAgICAgICAgOiB7fTtcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBqUXVlcnkgRGVmZXJyZWQgdG8gbWFpbnRhaW4gY29tcGF0aWJpbGl0eSB3aXRoIGpRdWVyeSBjb2RlLlxuICAgICAgICAgICAgICAgIC8vIFdlIG11c3QgZXhwb3NlIGEganFYSFItc2hhcGVkIG9iamVjdDogY2FsbGVycyAoU2VtYW50aWMgVUkgYXBpLFxuICAgICAgICAgICAgICAgIC8vIGRyb3Bkb3duIHF1ZXJ5UmVtb3RlKSBjYWxsIC5hYm9ydCgpIC8gLnN0YXRlKCkgLyAuc2V0UmVxdWVzdEhlYWRlcigpXG4gICAgICAgICAgICAgICAgLy8gb24gdGhlIHJldHVybiB2YWx1ZS4gQSBiYXJlIERlZmVycmVkKCkucHJvbWlzZSgpIGxhY2tzIC5hYm9ydCgpXG4gICAgICAgICAgICAgICAgLy8gd2hpY2ggY3Jhc2hlcyBTZW1hbnRpYyBVSSdzIGFib3J0IHBhdGggd2l0aFxuICAgICAgICAgICAgICAgIC8vIFwiVHlwZUVycm9yOiBlLmFib3J0IGlzIG5vdCBhIGZ1bmN0aW9uXCIgKHNlZSBTZW50cnkgTUlLT1BCWC1NSEMpLlxuICAgICAgICAgICAgICAgIGNvbnN0IGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgICAgICAgICAgICAgIGxldCBwZW5kaW5nSnFYSFIgPSBudWxsO1xuICAgICAgICAgICAgICAgIGxldCBhYm9ydGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICB3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGxlciBhbHJlYWR5IGFib3J0ZWQgYmVmb3JlIHdlIGdvdCBhIGNoYW5jZSB0byBkaXNwYXRjaDtcbiAgICAgICAgICAgICAgICAgICAgLy8gYWJvcnQoKSBoYXMgYWxyZWFkeSByZWplY3RlZCB0aGUgZGVmZXJyZWQg4oCUIG5vdGhpbmcgdG8gZG8uXG4gICAgICAgICAgICAgICAgICAgIGlmIChhYm9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgQXV0aG9yaXphdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuYWNjZXNzVG9rZW4gJiYgIW9wdGlvbnMuaGVhZGVycy5BdXRob3JpemF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA9IGBCZWFyZXIgJHtzZWxmLmFjY2Vzc1Rva2VufWA7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBBc3NpZ24gcGVuZGluZ0pxWEhSIEJFRk9SRSBjaGFpbmluZyBzbyBhIHN5bmNocm9ub3VzIGFib3J0KClcbiAgICAgICAgICAgICAgICAgICAgLy8gKGUuZy4sIGZyb20gYSBzZXR0bGVkLWZyb20tY2FjaGUganFYSFIpIHJvdXRlcyB2aWEgdGhlXG4gICAgICAgICAgICAgICAgICAgIC8vIHBvc3QtZGlzcGF0Y2ggYnJhbmNoIGluc3RlYWQgb2YgcmUtcmVqZWN0aW5nIHRoZSBkZWZlcnJlZC5cbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZ0pxWEhSID0gdXJsXG4gICAgICAgICAgICAgICAgICAgICAgICA/IG9yaWdpbmFsQWpheC5jYWxsKHRoaXMsIHVybCwgb3B0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgICAgIDogb3JpZ2luYWxBamF4LmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yd2FyZCBhbGwgY2FsbGJhY2tzIChwcmVzZXJ2ZSBgdGhpc2AgYW5kIGZ1bGwgYXJndW1lbnQgbGlzdCkuXG4gICAgICAgICAgICAgICAgICAgIC8vIElzc3VlICMxMDU2OiBqcVhIUi5mYWlsIG9jY2FzaW9uYWxseSByb3V0ZXMgYSBqUXVlcnkuRXZlbnRcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhyb3VnaCBlcnJvclRocm93biAodGhpcmQgYXJnKSB3aGVuIHRoZSByZXF1ZXN0IHdhc1xuICAgICAgICAgICAgICAgICAgICAvLyBhYm9ydGVkIGJ5IGFuIGV2ZW50LWRyaXZlbiBoYW5kbGVyIChlLmcuIERhdGFUYWJsZXNcbiAgICAgICAgICAgICAgICAgICAgLy8gYWJvcnRpbmcgYW4gaW4tZmxpZ2h0IHNlYXJjaCBvbiBhIG5ldyBkcmF3KS4gVGhlIGV2ZW50XG4gICAgICAgICAgICAgICAgICAgIC8vIHdvdWxkIHRoZW4gZXNjYXBlIHRvIHdpbmRvdy5vbmVycm9yIGFzIGEgbm9uLUVycm9yIHRocm93XG4gICAgICAgICAgICAgICAgICAgIC8vIGFuZCBwcm9kdWNlIGEgZnJlc2ggU2VudHJ5IGZpbmdlcnByaW50IHBlciBqUXVlcnkyMjxpZD5cbiAgICAgICAgICAgICAgICAgICAgLy8gY2FjaGUgaWQgKFNlbnRyeSBNSUtPUEJYLU1IQS9NSEQvTUhFL01ISi9NSFApLiBSZXBsYWNlXG4gICAgICAgICAgICAgICAgICAgIC8vIGFueSBqUXVlcnkuRXZlbnQtc2hhcGVkIGFyZ3VtZW50IHdpdGggYSByZWFsIEVycm9yIHNvXG4gICAgICAgICAgICAgICAgICAgIC8vIGRvd25zdHJlYW0gbGlzdGVuZXJzIHNlZSBhIHN0YWJsZSwgZ3JvdXBhYmxlIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nSnFYSFJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5kb25lKGZ1bmN0aW9uICguLi5hcmdzKSB7IGRlZmVycmVkLnJlc29sdmVXaXRoKHRoaXMsIGFyZ3MpOyB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZhaWwoZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIGFyZ3NbMF0g4oCUIGJ5IGpRdWVyeSBjb250cmFjdCB0aGF0J3MgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ganFYSFIgb2JqZWN0OyBkb3duc3RyZWFtIGxpc3RlbmVycyAoU2VtYW50aWMgVUlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhcGksICQoZG9jdW1lbnQpLmFqYXhFcnJvcikgY2FsbCAuc3RhdHVzIC8gLmFib3J0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb24gaXQgYW5kIHdvdWxkIGNyYXNoIGlmIHdlIHJlcGxhY2VkIGl0LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVycm9yVGhyb3duIHNpdHMgYXQgYXJnc1syXTsgd2Ugc3RpbGwgc2NhbiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0YWlsIGluIGNhc2UgdGhpcmQtcGFydHkgcGx1Z2lucyBzaGlmdCBwb3NpdGlvbnMuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBhcmdzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGEgPSBhcmdzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYSAmJiB0eXBlb2YgYSA9PT0gJ29iamVjdCcgJiYgIShhIGluc3RhbmNlb2YgRXJyb3IpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiAoJ2lzVHJpZ2dlcicgaW4gYSB8fCAnaXNEZWZhdWx0UHJldmVudGVkJyBpbiBhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgd3JhcHBlZCA9IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBganFYSFIuZmFpbCByZWNlaXZlZCBqUXVlcnkuRXZlbnQ6ICR7YS50eXBlIHx8ICd1bmtub3duJ31gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JhcHBlZC5uYW1lID0gJ0pxRXZlbnRJbkZhaWwnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJnc1tpXSA9IHdyYXBwZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0V2l0aCh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb24gZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGpxWEhSUHJveHkgPSBkZWZlcnJlZC5wcm9taXNlKCk7XG4gICAgICAgICAgICAgICAganFYSFJQcm94eS5hYm9ydCA9IGZ1bmN0aW9uIChzdGF0dXNUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZW5kaW5nSnFYSFIgJiYgdHlwZW9mIHBlbmRpbmdKcVhIUi5hYm9ydCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVuZGluZ0pxWEhSLmFib3J0KHN0YXR1c1RleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGpxWEhSUHJveHk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gUHJlLWRpc3BhdGNoIGFib3J0OiBtYXJrIHRoZSByZXF1ZXN0IGFuZCByZWplY3QgdGhlIGRlZmVycmVkXG4gICAgICAgICAgICAgICAgICAgIC8vIG91cnNlbHZlczsgdGhlIC50aGVuKCkgY2FsbGJhY2sgd2lsbCBzZWUgYGFib3J0ZWRgIGFuZCBza2lwXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBvcmlnaW5hbEFqYXggY2FsbCBlbnRpcmVseS4gc3RhdHVzVGV4dCBpcyBmb3J3YXJkZWQgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gbGlzdGVuZXJzIHZpYSByZWplY3RXaXRoIOKAlCBubyBuZWVkIHRvIHN0YXNoIGl0IHNlcGFyYXRlbHkuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3RXaXRoKHRoaXMsIFtudWxsLCAnYWJvcnQnLCBzdGF0dXNUZXh0IHx8ICdhYm9ydCddKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGpxWEhSUHJveHk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBqcVhIUlByb3h5LnNldFJlcXVlc3RIZWFkZXIgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlbmRpbmdKcVhIUiAmJiB0eXBlb2YgcGVuZGluZ0pxWEhSLnNldFJlcXVlc3RIZWFkZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlbmRpbmdKcVhIUi5zZXRSZXF1ZXN0SGVhZGVyKG5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBqcVhIUlByb3h5O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFByZS1kaXNwYXRjaDogc3Rhc2ggaGVhZGVyIGluIChjbG9uZWQpIG9wdGlvbnMgc28gaXQgc2hpcHNcbiAgICAgICAgICAgICAgICAgICAgLy8gd2l0aCB0aGUgcmVxdWVzdCBvbmNlIHRva2VuTWFuYWdlclJlYWR5IHJlc29sdmVzLlxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmhlYWRlcnNbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGpxWEhSUHJveHk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBqcVhIUlByb3h5LmdldFJlc3BvbnNlSGVhZGVyID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBlbmRpbmdKcVhIUiAmJiB0eXBlb2YgcGVuZGluZ0pxWEhSLmdldFJlc3BvbnNlSGVhZGVyID09PSAnZnVuY3Rpb24nXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHBlbmRpbmdKcVhIUi5nZXRSZXNwb25zZUhlYWRlcihuYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBudWxsO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAganFYSFJQcm94eS5nZXRBbGxSZXNwb25zZUhlYWRlcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwZW5kaW5nSnFYSFIgJiYgdHlwZW9mIHBlbmRpbmdKcVhIUi5nZXRBbGxSZXNwb25zZUhlYWRlcnMgPT09ICdmdW5jdGlvbidcbiAgICAgICAgICAgICAgICAgICAgICAgID8gcGVuZGluZ0pxWEhSLmdldEFsbFJlc3BvbnNlSGVhZGVycygpXG4gICAgICAgICAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy8gRGVmaW5lZCBhcyBub24tZW51bWVyYWJsZSBnZXR0ZXJzIGJ5IGRlc2lnbiBzbyB0aGUgcHJveHlcbiAgICAgICAgICAgICAgICAvLyBkb2Vzbid0IGV4cG9zZSBleHRyYSBrZXlzIHRvIGBmb3LigKZpbmAgY29uc3VtZXJzIChyZWFsIGpxWEhSXG4gICAgICAgICAgICAgICAgLy8gZXhwb3NlcyB0aGVzZSBhcyBvd24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzOyB0aGUgcHJveHkgaXNcbiAgICAgICAgICAgICAgICAvLyBpbnRlbnRpb25hbGx5IGEgc3RyaWN0ZXIgc3Vic2V0KS5cbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoanFYSFJQcm94eSwgJ3JlYWR5U3RhdGUnLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldCgpIHsgcmV0dXJuIHBlbmRpbmdKcVhIUiA/IHBlbmRpbmdKcVhIUi5yZWFkeVN0YXRlIDogMDsgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoanFYSFJQcm94eSwgJ3N0YXR1cycsIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0KCkgeyByZXR1cm4gcGVuZGluZ0pxWEhSID8gcGVuZGluZ0pxWEhSLnN0YXR1cyA6IDA7IH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGpxWEhSUHJveHksICdzdGF0dXNUZXh0Jywge1xuICAgICAgICAgICAgICAgICAgICBnZXQoKSB7IHJldHVybiBwZW5kaW5nSnFYSFIgPyBwZW5kaW5nSnFYSFIuc3RhdHVzVGV4dCA6ICcnOyB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShqcVhIUlByb3h5LCAncmVzcG9uc2VUZXh0Jywge1xuICAgICAgICAgICAgICAgICAgICBnZXQoKSB7IHJldHVybiBwZW5kaW5nSnFYSFIgPyBwZW5kaW5nSnFYSFIucmVzcG9uc2VUZXh0IDogJyc7IH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGpxWEhSUHJveHksICdyZXNwb25zZUpTT04nLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldCgpIHsgcmV0dXJuIHBlbmRpbmdKcVhIUiA/IHBlbmRpbmdKcVhIUi5yZXNwb25zZUpTT04gOiB1bmRlZmluZWQ7IH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGpxWEhSUHJveHksICdyZXNwb25zZVhNTCcsIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0KCkgeyByZXR1cm4gcGVuZGluZ0pxWEhSID8gcGVuZGluZ0pxWEhSLnJlc3BvbnNlWE1MIDogdW5kZWZpbmVkOyB9LFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGpxWEhSUHJveHk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRva2VuTWFuYWdlciBub3QgaW5pdGlhbGl6ZWQgeWV0IC0gcHJvY2VlZCB3aXRob3V0IHRva2VuXG4gICAgICAgICAgICAvLyAodGhpcyBzaG91bGQgb25seSBoYXBwZW4gb24gbG9naW4gcGFnZSlcbiAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBbHNvIHNldCB1cCBlcnJvciBoYW5kbGVyXG4gICAgICAgICQoZG9jdW1lbnQpLmFqYXhFcnJvcigoZXZlbnQsIHhociwgc2V0dGluZ3MpID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB1bmF1dGhvcml6ZWQgZXJyb3JzXG4gICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgb24gbG9naW4gcGFnZSAtIGRvbid0IHRyaWdnZXIgbG9nb3V0IGxvb3BcbiAgICAgICAgICAgICAgICBjb25zdCBpc0xvZ2luUGFnZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vaW5kZXgnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uLycpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFpc0xvZ2luUGFnZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUb2tlbiBleHBpcmVkIG9yIGludmFsaWQg4oaSIGxvZ291dFxuICAgICAgICAgICAgICAgICAgICBzZWxmLmxvZ291dCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTm90ZTogd2UgZGVsaWJlcmF0ZWx5IGRvIE5PVCB3cmFwICQuZm4uYXBpIGhlcmUuIFNlbWFudGljIFVJJ3NcbiAgICAgICAgLy8gJC5mbi5hcGkgdXNlcyAkLmFqYXgoKSB1bmRlciB0aGUgaG9vZCwgc28gdGhlIHdyYXBwZXIgYWJvdmUgYWxyZWFkeVxuICAgICAgICAvLyBpbmplY3RzIHRoZSBBdXRob3JpemF0aW9uIGhlYWRlci4gQSBzZWNvbmQgd3JhcHBlciB0aGF0IHJldHVybmVkIGFcbiAgICAgICAgLy8gRGVmZXJyZWQgZnJvbSBiZWZvcmVTZW5kIHZpb2xhdGVzIFNlbWFudGljIFVJJ3MgY29udHJhY3QgKGl0IGV4cGVjdHNcbiAgICAgICAgLy8gc2V0dGluZ3Mgb3IgZmFsc2UpIGFuZCB3YXMgdGhlIG9yaWdpbmFsIHNvdXJjZSBvZiB0aGVcbiAgICAgICAgLy8gXCJUeXBlRXJyb3I6IGUuYWJvcnQgaXMgbm90IGEgZnVuY3Rpb25cIiBjcmFzaGVzIGluIGRyb3Bkb3duXG4gICAgICAgIC8vIHF1ZXJ5UmVtb3RlIChzZWUgU2VudHJ5IE1JS09QQlgtTUhDIGFuZCByZWxhdGVkIGdyb3VwcykuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvZ291dCAtIGNsZWFyIHRva2VucyBhbmQgcmVkaXJlY3QgdG8gbG9naW5cbiAgICAgKiAtIENhbGxzIFJFU1QgQVBJIHRvIGludmFsaWRhdGUgcmVmcmVzaCB0b2tlblxuICAgICAqIC0gQ2xlYXJzIGFjY2VzcyB0b2tlbiBmcm9tIG1lbW9yeVxuICAgICAqIC0gRGVsZXRlcyByZWZyZXNoVG9rZW4gY29va2llIGZyb20gYnJvd3NlclxuICAgICAqIC0gUmVkaXJlY3RzIHRvIGxvZ2luIHBhZ2VcbiAgICAgKi9cbiAgICBhc3luYyBsb2dvdXQoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgb24gbG9naW4gcGFnZSAtIHByZXZlbnQgcmVkaXJlY3QgbG9vcFxuICAgICAgICBjb25zdCBpc0xvZ2luUGFnZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vaW5kZXgnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2Vzc2lvbi8nKTtcblxuICAgICAgICBpZiAoaXNMb2dpblBhZ2UpIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgb24gbG9naW4gcGFnZSAtIGNsZWFyIHN0YXRlXG4gICAgICAgICAgICB0aGlzLmFjY2Vzc1Rva2VuID0gbnVsbDtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlZnJlc2hUaW1lcikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoVGltZXIgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDUklUSUNBTDogQ2xlYXIgaHR0cE9ubHkgY29va2llIHZpYSBzZXJ2ZXItc2lkZSBBSkFYIGVuZHBvaW50XG4gICAgICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGF1dGhlbnRpY2F0aW9uIGxvb3Agd2hlbiByZWZyZXNoVG9rZW4gZXhpc3RzIGJ1dCBpcyBleHBpcmVkXG4gICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2VuZGAsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgYXN5bmM6IGZhbHNlLCAvLyBTeW5jaHJvbm91cyB0byBlbnN1cmUgY29va2llIGlzIGNsZWFyZWRcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlcnJvcjogKF9qcVhIUiwgc3RhdHVzLCBlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQSBidXJzdCBvZiA0MDFzIG11c3QgcHJvZHVjZSBleGFjdGx5IG9uZSBsb2dvdXQsIG5vdCBvbmUgcGVyIHJlcXVlc3QuXG4gICAgICAgIC8vIExhdGNoZWQgYmVsb3cgdGhlIGxvZ2luLXBhZ2UgYnJhbmNoIGFib3ZlOiB0aGF0IGJyYW5jaCByZXR1cm5zIHdpdGhvdXRcbiAgICAgICAgLy8gbmF2aWdhdGluZywgc28gbGF0Y2hpbmcgdGhlcmUgd291bGQgc3dhbGxvdyBpdHMgY29va2llIGNsZWFudXAgbGF0ZXIuXG4gICAgICAgIGlmICh0aGlzLmlzTG9nZ2luZ091dCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNMb2dnaW5nT3V0ID0gdHJ1ZTtcblxuICAgICAgICAvLyBQcmV2ZW50IG11bHRpcGxlIGxvZ291dCBjYWxsc1xuICAgICAgICBpZiAoIXRoaXMuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIC8vIENSSVRJQ0FMOiBDbGVhciBodHRwT25seSBjb29raWUgdmlhIHNlcnZlci1zaWRlIGVuZHBvaW50IGJlZm9yZSByZWRpcmVjdFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9lbmRgLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgICAgYXN5bmM6IGZhbHNlLCAvLyBTeW5jaHJvbm91cyB0byBlbnN1cmUgY29va2llIGlzIGNsZWFyZWQgYmVmb3JlIHJlZGlyZWN0XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBDYWxsIGxvZ291dCBlbmRwb2ludCB0byBpbnZhbGlkYXRlIHJlZnJlc2ggdG9rZW4gaW4gUmVkaXNcbiAgICAgICAgICAgIGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6bG9nb3V0JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLmFjY2Vzc1Rva2VufWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIElmIEFQSSBmYWlscyAoZS5nLiwgNDAxIHdpdGggZXhwaXJlZCB0b2tlbiksIHdlIHN0aWxsIG5lZWQgdG8gY2xlYXIgdGhlIGNvb2tpZVxuICAgICAgICAgICAgLy8gVXNlIHNlcnZlci1zaWRlIHNlc3Npb24vZW5kIGVuZHBvaW50IGFzIGZhbGxiYWNrIHRvIGNsZWFyIGh0dHBPbmx5IGNvb2tpZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgbG9jYWwgc3RhdGVcbiAgICAgICAgdGhpcy5hY2Nlc3NUb2tlbiA9IG51bGw7XG4gICAgICAgIGlmICh0aGlzLnJlZnJlc2hUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmVmcmVzaFRpbWVyKTtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaFRpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENSSVRJQ0FMOiBSZWRpcmVjdCB0byAvc2Vzc2lvbi9lbmQgd2hpY2ggY2xlYXJzIGh0dHBPbmx5IGNvb2tpZSBzZXJ2ZXItc2lkZVxuICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGF1dGhlbnRpY2F0aW9uIGxvb3Agd2hlbiByZWZyZXNoVG9rZW4gY29va2llIGV4aXN0cyBidXQgaXMgZXhwaXJlZFxuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vZW5kYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJlZnJlc2hUb2tlbiBjb29raWUgZnJvbSBicm93c2VyXG4gICAgICpcbiAgICAgKiBJTVBPUlRBTlQ6IGh0dHBPbmx5IGNvb2tpZXMgQ0FOTk9UIGJlIGRlbGV0ZWQgdmlhIEphdmFTY3JpcHQgKGRvY3VtZW50LmNvb2tpZSkuXG4gICAgICogVGhleSBjYW4gb25seSBiZSBjbGVhcmVkIGJ5IHRoZSBzZXJ2ZXIgdmlhIFNldC1Db29raWUgaGVhZGVyLlxuICAgICAqXG4gICAgICogVGhlIC9hdXRoOmxvZ291dCBlbmRwb2ludCBoYW5kbGVzIGNvb2tpZSBkZWxldGlvbiBvbiBzZXJ2ZXIgc2lkZS5cbiAgICAgKiBUaGlzIG1ldGhvZCBleGlzdHMgZm9yIG5vbi1odHRwT25seSBmYWxsYmFjayBzY2VuYXJpb3Mgb25seS5cbiAgICAgKlxuICAgICAqIEZvciBodHRwT25seSBjb29raWVzLCB3ZSByZWx5IG9uOlxuICAgICAqIDEuIFNlcnZlci1zaWRlIGNvb2tpZSBkZWxldGlvbiBpbiAvYXV0aDpsb2dvdXQgcmVzcG9uc2VcbiAgICAgKiAyLiBTZXNzaW9uQ29udHJvbGxlci5lbmRBY3Rpb24oKSB3aGljaCBhbHNvIGNsZWFycyB0aGUgY29va2llXG4gICAgICovXG4gICAgZGVsZXRlUmVmcmVzaFRva2VuQ29va2llKCkge1xuXG4gICAgICAgIC8vIE5PVEU6IFRoaXMgd29uJ3Qgd29yayBmb3IgaHR0cE9ubHkgY29va2llcywgYnV0IHRyeSBhbnl3YXkgZm9yIG5vbi1odHRwT25seSBmYWxsYmFja1xuICAgICAgICBkb2N1bWVudC5jb29raWUgPSAncmVmcmVzaFRva2VuPTsgZXhwaXJlcz1UaHUsIDAxIEphbiAxOTcwIDAwOjAwOjAwIFVUQzsgcGF0aD0vOyBTYW1lU2l0ZT1TdHJpY3QnO1xuXG4gICAgICAgIC8vIEZvciBIVFRQUyAoc2VjdXJlIGZsYWcpXG4gICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgPT09ICdodHRwczonKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5jb29raWUgPSAncmVmcmVzaFRva2VuPTsgZXhwaXJlcz1UaHUsIDAxIEphbiAxOTcwIDAwOjAwOjAwIFVUQzsgcGF0aD0vOyBzZWN1cmU7IFNhbWVTaXRlPVN0cmljdCc7XG4gICAgICAgIH1cblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB1c2VyIGlzIGF1dGhlbnRpY2F0ZWRcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiBhY2Nlc3MgdG9rZW4gZXhpc3RzXG4gICAgICovXG4gICAgaXNBdXRoZW50aWNhdGVkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hY2Nlc3NUb2tlbiAhPT0gbnVsbDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuVG9rZW5NYW5hZ2VyID0gVG9rZW5NYW5hZ2VyO1xuXG4vLyBDUklUSUNBTDogU2V0IHVwIEFKQVggaW50ZXJjZXB0b3IgSU1NRURJQVRFTFkgb24gc2NyaXB0IGxvYWRcbi8vIFRoaXMgZW5zdXJlcyBBTEwgQUpBWCByZXF1ZXN0cyB3YWl0IGZvciBUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb25cbi8vIGV2ZW4gaWYgdGhleSdyZSBmaXJlZCBiZWZvcmUgJChkb2N1bWVudCkucmVhZHkoKVxuVG9rZW5NYW5hZ2VyLnNldHVwR2xvYmFsQWpheCgpO1xuXG4vLyBDUklUSUNBTDogQ3JlYXRlIHRva2VuTWFuYWdlclJlYWR5IHByb21pc2UgSU1NRURJQVRFTFlcbi8vIENoZWNrIGlmIHdlJ3JlIG9uIGxvZ2luIHBhZ2UgLSBpZiBub3QsIHN0YXJ0IGluaXRpYWxpemF0aW9uIHJpZ2h0IGF3YXlcbi8vIFRoaXMgZW5zdXJlcyB0aGUgcHJvbWlzZSBleGlzdHMgYmVmb3JlIEFOWSBvdGhlciBzY3JpcHQgcnVuc1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gUHJldmVudCBtdWx0aXBsZSBpbml0aWFsaXphdGlvbnMgb24gdGhlIHNhbWUgcGFnZVxuICAgIGlmICghd2luZG93LnRva2VuTWFuYWdlclJlYWR5KSB7XG5cbiAgICAgICAgY29uc3QgaXNMb2dpblBhZ2UgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJy9zZXNzaW9uL2luZGV4JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnL3Nlc3Npb24vJyk7XG5cbiAgICAgICAgaWYgKCFpc0xvZ2luUGFnZSkge1xuICAgICAgICAgICAgLy8gTm90IGxvZ2luIHBhZ2UgLSBzdGFydCBUb2tlbk1hbmFnZXIgaW5pdGlhbGl6YXRpb24gaW1tZWRpYXRlbHlcbiAgICAgICAgICAgIC8vIFRoaXMgaGFwcGVucyBCRUZPUkUgJChkb2N1bWVudCkucmVhZHksIGVuc3VyaW5nIHRva2VuIGlzIHJlYWR5IEFTQVBcbiAgICAgICAgICAgIHdpbmRvdy50b2tlbk1hbmFnZXJSZWFkeSA9IFRva2VuTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMb2dpbiBwYWdlIC0gcmVzb2x2ZSBpbW1lZGlhdGVseSAobm8gYXV0aGVudGljYXRpb24gbmVlZGVkKVxuICAgICAgICAgICAgd2luZG93LnRva2VuTWFuYWdlclJlYWR5ID0gUHJvbWlzZS5yZXNvbHZlKHRydWUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICB9XG59XG4iXX0=