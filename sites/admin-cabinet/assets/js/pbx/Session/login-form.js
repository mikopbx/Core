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

/* global globalRootUrl,globalTranslate,Form,Config */
var loginForm = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#login-form'),

  /**
   * The jQuery object for the submit button.
   * @type {jQuery}
   */
  $submitButton: $('#submitbutton'),

  /**
   * The jQuery object for the password field.
   * @type {jQuery}
   */
  $passwordField: $('#password'),

  /**
   * The jQuery object for the checkboxes.
   * @type {jQuery}
   */
  $checkBoxes: $('.checkbox'),

  /**
   * Passkey login button
   * @type {jQuery}
   */
  $passkeyButton: $('#passkey-login-button'),

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    login: {
      identifier: 'login',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.auth_ValidateLoginNotEmpty
      }]
    },
    password: {
      identifier: 'password',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.auth_ValidatePasswordNotEmpty
      }]
    }
  },

  /**
   * Initializes the login form functionality.
   */
  initialize: function initialize() {
    loginForm.checkPasskeySupport();
    loginForm.bindEvents();
    loginForm.initializeFormValidation();
    loginForm.$checkBoxes.checkbox();
  },

  /**
   * Check if browser supports WebAuthn and connection is secure
   * WebAuthn requires HTTPS or localhost
   * Hide passkey button and OR divider if not supported
   */
  checkPasskeySupport: function checkPasskeySupport() {
    var isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '[::1]';
    var isSecure = window.location.protocol === 'https:';
    var hasWebAuthn = window.PublicKeyCredential !== undefined; // Show passkey button only if:
    // 1. Browser supports WebAuthn AND
    // 2. Connection is HTTPS OR localhost

    if (!hasWebAuthn || !isSecure && !isLocalhost) {
      loginForm.$passkeyButton.hide(); // Also hide the OR divider

      $('.ui.horizontal.divider').hide();
    }
  },

  /**
   * Bind form events
   */
  bindEvents: function bindEvents() {
    // Prevent default form submission - we use AJAX only
    loginForm.$formObj.on('submit', function (e) {
      e.preventDefault();
      return false;
    }); // Handle submit button click - password authentication via REST API

    loginForm.$submitButton.on('click', function (e) {
      e.preventDefault();
      loginForm.$formObj.form('validate form');

      if (loginForm.$formObj.form('is valid')) {
        loginForm.submitLogin();
      }
    }); // Handle enter key on password field

    loginForm.$passwordField.on('keypress', function (e) {
      if (e.which === 13) {
        e.preventDefault();
        loginForm.$submitButton.click();
      }
    }); // Handle passkey button click - usernameless authentication

    loginForm.$passkeyButton.on('click', function (e) {
      e.preventDefault();
      loginForm.authenticateWithPasskey();
    }); // Clear error messages on input

    $('input').on('input', function () {
      $('.message.ajax').remove();
    });
  },

  /**
   * Submit login via REST API /pbxcore/api/v3/auth:login
   * Получает JWT access token и refresh token cookie
   */
  submitLogin: async function submitLogin() {
    loginForm.$submitButton.addClass('loading disabled');
    $('.message.ajax').remove();

    try {
      var _response$data, _response$data$access, _response$data2;

      var response = await $.ajax({
        url: '/pbxcore/api/v3/auth:login',
        method: 'POST',
        dataType: 'json',
        data: {
          login: $('#login').val(),
          password: $('#password').val(),
          rememberMe: $('#rememberMeCheckBox').is(':checked')
        }
      });
      console.log('[LOGIN] API Response:', {
        result: response.result,
        hasData: !!response.data,
        hasAccessToken: !!(response.data && response.data.accessToken),
        tokenLength: (_response$data = response.data) === null || _response$data === void 0 ? void 0 : (_response$data$access = _response$data.accessToken) === null || _response$data$access === void 0 ? void 0 : _response$data$access.length,
        expiresIn: (_response$data2 = response.data) === null || _response$data2 === void 0 ? void 0 : _response$data2.expiresIn
      });

      if (response.result && response.data && response.data.accessToken) {
        console.log('[LOGIN] Login successful, access token received');
        console.log('[LOGIN] Refresh cookie should be set, testing with immediate refresh...'); // Test refresh token cookie by calling /auth:refresh immediately
        // This verifies the cookie is working before redirecting

        loginForm.testRefreshAndRedirect();
      } else {
        console.error('[LOGIN] Invalid response:', response);
        loginForm.showError(response.messages || {
          error: [globalTranslate.auth_WrongLoginPassword]
        });
      }
    } catch (error) {
      console.error('Login error:', error); // Distinguish network errors from authentication errors

      var status = error.status || 0;

      if (status === 0 || status >= 502) {
        // Network error or server unavailable (502, 503, 504)
        loginForm.showError({
          error: [globalTranslate.auth_ServerUnavailable]
        });
      } else if (error.responseJSON && error.responseJSON.messages) {
        // API returned error with message (e.g., wrong password, rate limit)
        loginForm.showError(error.responseJSON.messages);
      } else {
        // Unknown error - show generic message
        loginForm.showError({
          error: [globalTranslate.auth_WrongLoginPassword]
        });
      }
    } finally {
      loginForm.$submitButton.removeClass('loading disabled');
    }
  },

  /**
   * Test refresh token cookie and redirect if successful
   * Called immediately after login to verify cookie is set correctly
   */
  testRefreshAndRedirect: async function testRefreshAndRedirect() {
    try {
      // Wait 100ms for browser to process Set-Cookie header
      // The cookie is set in the response, but browsers need time to store it
      // before it's available for the next request
      console.log('[LOGIN] Waiting for browser to process Set-Cookie header...');
      await new Promise(function (resolve) {
        return setTimeout(resolve, 100);
      });
      console.log('[LOGIN] Calling /auth:refresh to test cookie...');
      var response = await $.ajax({
        url: '/pbxcore/api/v3/auth:refresh',
        method: 'POST',
        dataType: 'json'
      });
      console.log('[LOGIN] Refresh response:', response);

      if (response.result && response.data && response.data.accessToken) {
        console.log('[LOGIN] Refresh successful! Cookie is working.');
        console.log('[LOGIN] Storing new access token and redirecting...'); // Store the NEW access token from refresh

        TokenManager.setAccessToken(response.data.accessToken, response.data.expiresIn); // Redirect to user's configured home page from API response

        var redirectUrl = response.data.homePage || "".concat(globalRootUrl, "extensions/index");
        window.location = redirectUrl;
      } else {
        console.error('[LOGIN] Refresh failed - cookie not working');
        loginForm.showError({
          error: [globalTranslate.auth_RefreshTokenError || 'Refresh token error']
        });
      }
    } catch (error) {
      console.error('[LOGIN] Refresh test failed:', error);
      loginForm.showError({
        error: [globalTranslate.auth_RefreshTokenError || 'Refresh token error']
      });
    }
  },

  /**
   * Authenticate user with Passkey (usernameless flow)
   * Browser will show all available passkeys for this domain
   */
  authenticateWithPasskey: async function authenticateWithPasskey() {
    // Show loading state
    loginForm.$submitButton.addClass('loading disabled');
    loginForm.$passkeyButton.addClass('loading disabled');
    $('.message.ajax').remove();

    try {
      // Get origin for WebAuthn
      var origin = window.location.origin; // Step 1: Get challenge from REST API (without login - usernameless)

      var startResponse = await $.ajax({
        url: '/pbxcore/api/v3/passkeys:authenticationStart',
        method: 'GET',
        data: {
          origin: origin
        } // No login parameter - usernameless authentication

      });

      if (!startResponse.result || !startResponse.data) {
        var _startResponse$messag, _startResponse$messag2;

        loginForm.$submitButton.removeClass('loading disabled');
        loginForm.$passkeyButton.removeClass('loading disabled'); // Extract error message from response

        var errorMessage = ((_startResponse$messag = startResponse.messages) === null || _startResponse$messag === void 0 ? void 0 : (_startResponse$messag2 = _startResponse$messag.error) === null || _startResponse$messag2 === void 0 ? void 0 : _startResponse$messag2[0]) || globalTranslate.pk_LoginError;
        loginForm.showError([errorMessage]);
        return;
      } // Step 2: Call WebAuthn API - browser will show all available passkeys


      var publicKeyOptions = loginForm.prepareCredentialRequestOptions(startResponse.data);
      var assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions
      }); // Step 3: Send assertion to REST API for verification

      var assertionData = loginForm.prepareAssertionData(assertion, startResponse.data);
      var finishResponse = await $.ajax({
        url: '/pbxcore/api/v3/passkeys:authenticationFinish',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(assertionData)
      });
      loginForm.$submitButton.removeClass('loading disabled');
      loginForm.$passkeyButton.removeClass('loading disabled');

      if (finishResponse.result) {
        // Start session via SessionController
        await loginForm.createSessionFromPasskey(finishResponse.data);
      } else {
        var _finishResponse$messa, _finishResponse$messa2;

        // Extract error messages from response
        var _errorMessage = ((_finishResponse$messa = finishResponse.messages) === null || _finishResponse$messa === void 0 ? void 0 : (_finishResponse$messa2 = _finishResponse$messa.error) === null || _finishResponse$messa2 === void 0 ? void 0 : _finishResponse$messa2[0]) || globalTranslate.pk_LoginError;

        loginForm.showError([_errorMessage]);
      }
    } catch (error) {
      var _error$responseJSON, _error$responseJSON$m, _error$responseJSON$m2;

      loginForm.$submitButton.removeClass('loading disabled');
      loginForm.$passkeyButton.removeClass('loading disabled');
      console.error('Passkey authentication error:', error); // Check if user cancelled

      if (error.name === 'NotAllowedError') {
        // User cancelled - don't show error
        return;
      } // Extract error message from API response or use default


      var _errorMessage2 = globalTranslate.pk_LoginError;

      if ((_error$responseJSON = error.responseJSON) !== null && _error$responseJSON !== void 0 && (_error$responseJSON$m = _error$responseJSON.messages) !== null && _error$responseJSON$m !== void 0 && (_error$responseJSON$m2 = _error$responseJSON$m.error) !== null && _error$responseJSON$m2 !== void 0 && _error$responseJSON$m2[0]) {
        _errorMessage2 = error.responseJSON.messages.error[0];
      } else if (error.message) {
        _errorMessage2 = "".concat(globalTranslate.pk_LoginError, ": ").concat(error.message);
      }

      loginForm.showError([_errorMessage2]);
    }
  },

  /**
   * Login with passkey authentication using sessionToken
   * SessionToken is exchanged for JWT tokens via REST API
   */
  createSessionFromPasskey: async function createSessionFromPasskey(authData) {
    try {
      // Check if remember me is selected
      var rememberMe = $('#rememberMeCheckBox').is(':checked'); // Exchange sessionToken for JWT tokens via REST API

      var response = await $.ajax({
        url: '/pbxcore/api/v3/auth:login',
        method: 'POST',
        dataType: 'json',
        data: {
          sessionToken: authData.sessionToken,
          rememberMe: rememberMe
        }
      });

      if (response.result && response.data && response.data.accessToken) {
        console.log('[PASSKEY] Login successful, testing refresh cookie...'); // Test refresh token cookie before redirect

        loginForm.testRefreshAndRedirect();
      } else {
        var _response$messages, _response$messages$er;

        // Extract error message from response
        var errorMessage = ((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : (_response$messages$er = _response$messages.error) === null || _response$messages$er === void 0 ? void 0 : _response$messages$er[0]) || globalTranslate.pk_LoginError;
        loginForm.showError([errorMessage]);
      }
    } catch (error) {
      var _error$responseJSON2, _error$responseJSON2$, _error$responseJSON2$2;

      console.error('Passkey login error:', error); // Extract error message from API response or use default

      var _errorMessage3 = ((_error$responseJSON2 = error.responseJSON) === null || _error$responseJSON2 === void 0 ? void 0 : (_error$responseJSON2$ = _error$responseJSON2.messages) === null || _error$responseJSON2$ === void 0 ? void 0 : (_error$responseJSON2$2 = _error$responseJSON2$.error) === null || _error$responseJSON2$2 === void 0 ? void 0 : _error$responseJSON2$2[0]) || globalTranslate.pk_LoginError;

      loginForm.showError([_errorMessage3]);
    }
  },

  /**
   * Prepare credential request options for WebAuthn API
   */
  prepareCredentialRequestOptions: function prepareCredentialRequestOptions(serverData) {
    return {
      challenge: loginForm.base64urlToArrayBuffer(serverData.challenge),
      timeout: serverData.timeout || 60000,
      rpId: serverData.rpId,
      allowCredentials: serverData.allowCredentials.map(function (cred) {
        return {
          type: 'public-key',
          id: loginForm.base64urlToArrayBuffer(cred.id)
        };
      }),
      userVerification: serverData.userVerification || 'preferred'
    };
  },

  /**
   * Prepare assertion data to send to server
   */
  prepareAssertionData: function prepareAssertionData(assertion, serverData) {
    var response = assertion.response;
    return {
      sessionId: serverData.sessionId,
      credentialId: loginForm.arrayBufferToBase64url(assertion.rawId),
      authenticatorData: loginForm.arrayBufferToBase64url(response.authenticatorData),
      clientDataJSON: loginForm.arrayBufferToBase64url(response.clientDataJSON),
      signature: loginForm.arrayBufferToBase64url(response.signature),
      userHandle: response.userHandle ? loginForm.arrayBufferToBase64url(response.userHandle) : null
    };
  },

  /**
   * Convert base64url string to ArrayBuffer
   */
  base64urlToArrayBuffer: function base64urlToArrayBuffer(base64url) {
    var padding = '='.repeat((4 - base64url.length % 4) % 4);
    var base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray.buffer;
  },

  /**
   * Convert ArrayBuffer to base64url string
   */
  arrayBufferToBase64url: function arrayBufferToBase64url(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';

    for (var i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    var base64 = window.btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },

  /**
   * Show error message
   */
  showError: function showError(messages) {
    var errorHtml = Array.isArray(messages) ? messages.join('<br>') : messages.error ? messages.error.join('<br>') : 'Unknown error';
    loginForm.$formObj.before("<div class=\"ui error message ajax\">".concat(errorHtml, "</div>"));
  },

  /**
   * Initialize form validation using Fomantic UI
   */
  initializeFormValidation: function initializeFormValidation() {
    loginForm.$formObj.form({
      fields: loginForm.validateRules,
      onSuccess: function onSuccess(event) {
        // Prevent default form submission if event exists
        if (event && event.preventDefault) {
          event.preventDefault();
        }
      }
    });
  }
}; // When the document is ready, initialize the login form.

$(document).ready(function () {
  loginForm.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZXNzaW9uL2xvZ2luLWZvcm0uanMiXSwibmFtZXMiOlsibG9naW5Gb3JtIiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwYXNzd29yZEZpZWxkIiwiJGNoZWNrQm94ZXMiLCIkcGFzc2tleUJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJsb2dpbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhdXRoX1ZhbGlkYXRlTG9naW5Ob3RFbXB0eSIsInBhc3N3b3JkIiwiYXV0aF9WYWxpZGF0ZVBhc3N3b3JkTm90RW1wdHkiLCJpbml0aWFsaXplIiwiY2hlY2tQYXNza2V5U3VwcG9ydCIsImJpbmRFdmVudHMiLCJpbml0aWFsaXplRm9ybVZhbGlkYXRpb24iLCJjaGVja2JveCIsImlzTG9jYWxob3N0Iiwid2luZG93IiwibG9jYXRpb24iLCJob3N0bmFtZSIsImlzU2VjdXJlIiwicHJvdG9jb2wiLCJoYXNXZWJBdXRobiIsIlB1YmxpY0tleUNyZWRlbnRpYWwiLCJ1bmRlZmluZWQiLCJoaWRlIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJmb3JtIiwic3VibWl0TG9naW4iLCJ3aGljaCIsImNsaWNrIiwiYXV0aGVudGljYXRlV2l0aFBhc3NrZXkiLCJyZW1vdmUiLCJhZGRDbGFzcyIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsIm1ldGhvZCIsImRhdGFUeXBlIiwiZGF0YSIsInZhbCIsInJlbWVtYmVyTWUiLCJpcyIsImNvbnNvbGUiLCJsb2ciLCJyZXN1bHQiLCJoYXNEYXRhIiwiaGFzQWNjZXNzVG9rZW4iLCJhY2Nlc3NUb2tlbiIsInRva2VuTGVuZ3RoIiwibGVuZ3RoIiwiZXhwaXJlc0luIiwidGVzdFJlZnJlc2hBbmRSZWRpcmVjdCIsImVycm9yIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJhdXRoX1dyb25nTG9naW5QYXNzd29yZCIsInN0YXR1cyIsImF1dGhfU2VydmVyVW5hdmFpbGFibGUiLCJyZXNwb25zZUpTT04iLCJyZW1vdmVDbGFzcyIsIlByb21pc2UiLCJyZXNvbHZlIiwic2V0VGltZW91dCIsIlRva2VuTWFuYWdlciIsInNldEFjY2Vzc1Rva2VuIiwicmVkaXJlY3RVcmwiLCJob21lUGFnZSIsImdsb2JhbFJvb3RVcmwiLCJhdXRoX1JlZnJlc2hUb2tlbkVycm9yIiwib3JpZ2luIiwic3RhcnRSZXNwb25zZSIsImVycm9yTWVzc2FnZSIsInBrX0xvZ2luRXJyb3IiLCJwdWJsaWNLZXlPcHRpb25zIiwicHJlcGFyZUNyZWRlbnRpYWxSZXF1ZXN0T3B0aW9ucyIsImFzc2VydGlvbiIsIm5hdmlnYXRvciIsImNyZWRlbnRpYWxzIiwiZ2V0IiwicHVibGljS2V5IiwiYXNzZXJ0aW9uRGF0YSIsInByZXBhcmVBc3NlcnRpb25EYXRhIiwiZmluaXNoUmVzcG9uc2UiLCJjb250ZW50VHlwZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJjcmVhdGVTZXNzaW9uRnJvbVBhc3NrZXkiLCJuYW1lIiwibWVzc2FnZSIsImF1dGhEYXRhIiwic2Vzc2lvblRva2VuIiwic2VydmVyRGF0YSIsImNoYWxsZW5nZSIsImJhc2U2NHVybFRvQXJyYXlCdWZmZXIiLCJ0aW1lb3V0IiwicnBJZCIsImFsbG93Q3JlZGVudGlhbHMiLCJtYXAiLCJjcmVkIiwiaWQiLCJ1c2VyVmVyaWZpY2F0aW9uIiwic2Vzc2lvbklkIiwiY3JlZGVudGlhbElkIiwiYXJyYXlCdWZmZXJUb0Jhc2U2NHVybCIsInJhd0lkIiwiYXV0aGVudGljYXRvckRhdGEiLCJjbGllbnREYXRhSlNPTiIsInNpZ25hdHVyZSIsInVzZXJIYW5kbGUiLCJiYXNlNjR1cmwiLCJwYWRkaW5nIiwicmVwZWF0IiwiYmFzZTY0IiwicmVwbGFjZSIsInJhd0RhdGEiLCJhdG9iIiwib3V0cHV0QXJyYXkiLCJVaW50OEFycmF5IiwiaSIsImNoYXJDb2RlQXQiLCJidWZmZXIiLCJieXRlcyIsImJpbmFyeSIsImJ5dGVMZW5ndGgiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJidG9hIiwiZXJyb3JIdG1sIiwiQXJyYXkiLCJpc0FycmF5Iiwiam9pbiIsImJlZm9yZSIsImZpZWxkcyIsIm9uU3VjY2VzcyIsImV2ZW50IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBRUEsSUFBTUEsU0FBUyxHQUFHO0FBQ2Q7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsYUFBRCxDQUxHOztBQU9kO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLGVBQUQsQ0FYRjs7QUFhZDtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxjQUFjLEVBQUVGLENBQUMsQ0FBQyxXQUFELENBakJIOztBQW1CZDtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxXQUFXLEVBQUVILENBQUMsQ0FBQyxXQUFELENBdkJBOztBQXlCZDtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxjQUFjLEVBQUVKLENBQUMsQ0FBQyx1QkFBRCxDQTdCSDs7QUErQmQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsS0FBSyxFQUFFO0FBQ0hDLE1BQUFBLFVBQVUsRUFBRSxPQURUO0FBRUhDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkosS0FESTtBQVVYQyxJQUFBQSxRQUFRLEVBQUU7QUFDTk4sTUFBQUEsVUFBVSxFQUFFLFVBRE47QUFFTkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFB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Q0FBQ0MsT0FBTixDQUFjM0UsUUFBZCxJQUNaQSxRQUFRLENBQUM0RSxJQUFULENBQWMsTUFBZCxDQURZLEdBRVg1RSxRQUFRLENBQUNGLEtBQVQsR0FBaUJFLFFBQVEsQ0FBQ0YsS0FBVCxDQUFlOEUsSUFBZixDQUFvQixNQUFwQixDQUFqQixHQUErQyxlQUZ0RDtBQUlBM0ksSUFBQUEsU0FBUyxDQUFDQyxRQUFWLENBQW1CMkksTUFBbkIsZ0RBQWdFSixTQUFoRTtBQUNILEdBOVphOztBQWdhZDtBQUNKO0FBQ0E7QUFDSXBILEVBQUFBLHdCQW5hYyxzQ0FtYWE7QUFDdkJwQixJQUFBQSxTQUFTLENBQUNDLFFBQVYsQ0FBbUJrQyxJQUFuQixDQUF3QjtBQUNwQjBHLE1BQUFBLE1BQU0sRUFBRTdJLFNBQVMsQ0FBQ08sYUFERTtBQUVwQnVJLE1BQUFBLFNBRm9CLHFCQUVWQyxLQUZVLEVBRUg7QUFDYjtBQUNBLFlBQUlBLEtBQUssSUFBSUEsS0FBSyxDQUFDN0csY0FBbkIsRUFBbUM7QUFDL0I2RyxVQUFBQSxLQUFLLENBQUM3RyxjQUFOO0FBQ0g7QUFDSjtBQVBtQixLQUF4QjtBQVNIO0FBN2FhLENBQWxCLEMsQ0FnYkE7O0FBQ0FoQyxDQUFDLENBQUM4SSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCakosRUFBQUEsU0FBUyxDQUFDaUIsVUFBVjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsRm9ybSxDb25maWcgKi9cblxuY29uc3QgbG9naW5Gb3JtID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsb2dpbi1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN1Ym1pdCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHBhc3N3b3JkIGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhc3N3b3JkRmllbGQ6ICQoJyNwYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVja2JveGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQm94ZXM6ICQoJy5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogUGFzc2tleSBsb2dpbiBidXR0b25cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYXNza2V5QnV0dG9uOiAkKCcjcGFzc2tleS1sb2dpbi1idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBsb2dpbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2xvZ2luJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hdXRoX1ZhbGlkYXRlTG9naW5Ob3RFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgcGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYXV0aF9WYWxpZGF0ZVBhc3N3b3JkTm90RW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBsb2dpbiBmb3JtIGZ1bmN0aW9uYWxpdHkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgbG9naW5Gb3JtLmNoZWNrUGFzc2tleVN1cHBvcnQoKTtcbiAgICAgICAgbG9naW5Gb3JtLmJpbmRFdmVudHMoKTtcbiAgICAgICAgbG9naW5Gb3JtLmluaXRpYWxpemVGb3JtVmFsaWRhdGlvbigpO1xuICAgICAgICBsb2dpbkZvcm0uJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyBXZWJBdXRobiBhbmQgY29ubmVjdGlvbiBpcyBzZWN1cmVcbiAgICAgKiBXZWJBdXRobiByZXF1aXJlcyBIVFRQUyBvciBsb2NhbGhvc3RcbiAgICAgKiBIaWRlIHBhc3NrZXkgYnV0dG9uIGFuZCBPUiBkaXZpZGVyIGlmIG5vdCBzdXBwb3J0ZWRcbiAgICAgKi9cbiAgICBjaGVja1Bhc3NrZXlTdXBwb3J0KCkge1xuICAgICAgICBjb25zdCBpc0xvY2FsaG9zdCA9IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSA9PT0gJ2xvY2FsaG9zdCcgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSA9PT0gJzEyNy4wLjAuMScgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSA9PT0gJ1s6OjFdJztcbiAgICAgICAgY29uc3QgaXNTZWN1cmUgPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgPT09ICdodHRwczonO1xuICAgICAgICBjb25zdCBoYXNXZWJBdXRobiA9IHdpbmRvdy5QdWJsaWNLZXlDcmVkZW50aWFsICE9PSB1bmRlZmluZWQ7XG5cbiAgICAgICAgLy8gU2hvdyBwYXNza2V5IGJ1dHRvbiBvbmx5IGlmOlxuICAgICAgICAvLyAxLiBCcm93c2VyIHN1cHBvcnRzIFdlYkF1dGhuIEFORFxuICAgICAgICAvLyAyLiBDb25uZWN0aW9uIGlzIEhUVFBTIE9SIGxvY2FsaG9zdFxuICAgICAgICBpZiAoIWhhc1dlYkF1dGhuIHx8ICghaXNTZWN1cmUgJiYgIWlzTG9jYWxob3N0KSkge1xuICAgICAgICAgICAgbG9naW5Gb3JtLiRwYXNza2V5QnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIC8vIEFsc28gaGlkZSB0aGUgT1IgZGl2aWRlclxuICAgICAgICAgICAgJCgnLnVpLmhvcml6b250YWwuZGl2aWRlcicpLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCaW5kIGZvcm0gZXZlbnRzXG4gICAgICovXG4gICAgYmluZEV2ZW50cygpIHtcbiAgICAgICAgLy8gUHJldmVudCBkZWZhdWx0IGZvcm0gc3VibWlzc2lvbiAtIHdlIHVzZSBBSkFYIG9ubHlcbiAgICAgICAgbG9naW5Gb3JtLiRmb3JtT2JqLm9uKCdzdWJtaXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgc3VibWl0IGJ1dHRvbiBjbGljayAtIHBhc3N3b3JkIGF1dGhlbnRpY2F0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAgICBsb2dpbkZvcm0uJHN1Ym1pdEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbG9naW5Gb3JtLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcbiAgICAgICAgICAgIGlmIChsb2dpbkZvcm0uJGZvcm1PYmouZm9ybSgnaXMgdmFsaWQnKSkge1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS5zdWJtaXRMb2dpbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZW50ZXIga2V5IG9uIHBhc3N3b3JkIGZpZWxkXG4gICAgICAgIGxvZ2luRm9ybS4kcGFzc3dvcmRGaWVsZC5vbigna2V5cHJlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUud2hpY2ggPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLmNsaWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBwYXNza2V5IGJ1dHRvbiBjbGljayAtIHVzZXJuYW1lbGVzcyBhdXRoZW50aWNhdGlvblxuICAgICAgICBsb2dpbkZvcm0uJHBhc3NrZXlCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGxvZ2luRm9ybS5hdXRoZW50aWNhdGVXaXRoUGFzc2tleSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDbGVhciBlcnJvciBtZXNzYWdlcyBvbiBpbnB1dFxuICAgICAgICAkKCdpbnB1dCcpLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN1Ym1pdCBsb2dpbiB2aWEgUkVTVCBBUEkgL3BieGNvcmUvYXBpL3YzL2F1dGg6bG9naW5cbiAgICAgKiDQn9C+0LvRg9GH0LDQtdGCIEpXVCBhY2Nlc3MgdG9rZW4g0LggcmVmcmVzaCB0b2tlbiBjb29raWVcbiAgICAgKi9cbiAgICBhc3luYyBzdWJtaXRMb2dpbigpIHtcbiAgICAgICAgbG9naW5Gb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6bG9naW4nLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBsb2dpbjogJCgnI2xvZ2luJykudmFsKCksXG4gICAgICAgICAgICAgICAgICAgIHBhc3N3b3JkOiAkKCcjcGFzc3dvcmQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgcmVtZW1iZXJNZTogJCgnI3JlbWVtYmVyTWVDaGVja0JveCcpLmlzKCc6Y2hlY2tlZCcpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTE9HSU5dIEFQSSBSZXNwb25zZTonLCB7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiByZXNwb25zZS5yZXN1bHQsXG4gICAgICAgICAgICAgICAgaGFzRGF0YTogISFyZXNwb25zZS5kYXRhLFxuICAgICAgICAgICAgICAgIGhhc0FjY2Vzc1Rva2VuOiAhIShyZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4pLFxuICAgICAgICAgICAgICAgIHRva2VuTGVuZ3RoOiByZXNwb25zZS5kYXRhPy5hY2Nlc3NUb2tlbj8ubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGV4cGlyZXNJbjogcmVzcG9uc2UuZGF0YT8uZXhwaXJlc0luXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0xPR0lOXSBMb2dpbiBzdWNjZXNzZnVsLCBhY2Nlc3MgdG9rZW4gcmVjZWl2ZWQnKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0xPR0lOXSBSZWZyZXNoIGNvb2tpZSBzaG91bGQgYmUgc2V0LCB0ZXN0aW5nIHdpdGggaW1tZWRpYXRlIHJlZnJlc2guLi4nKTtcblxuICAgICAgICAgICAgICAgIC8vIFRlc3QgcmVmcmVzaCB0b2tlbiBjb29raWUgYnkgY2FsbGluZyAvYXV0aDpyZWZyZXNoIGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAgICAgLy8gVGhpcyB2ZXJpZmllcyB0aGUgY29va2llIGlzIHdvcmtpbmcgYmVmb3JlIHJlZGlyZWN0aW5nXG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnRlc3RSZWZyZXNoQW5kUmVkaXJlY3QoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0xPR0lOXSBJbnZhbGlkIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzIHx8IHsgZXJyb3I6IFtnbG9iYWxUcmFuc2xhdGUuYXV0aF9Xcm9uZ0xvZ2luUGFzc3dvcmRdIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTG9naW4gZXJyb3I6JywgZXJyb3IpO1xuXG4gICAgICAgICAgICAvLyBEaXN0aW5ndWlzaCBuZXR3b3JrIGVycm9ycyBmcm9tIGF1dGhlbnRpY2F0aW9uIGVycm9yc1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gZXJyb3Iuc3RhdHVzIHx8IDA7XG5cbiAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IDAgfHwgc3RhdHVzID49IDUwMikge1xuICAgICAgICAgICAgICAgIC8vIE5ldHdvcmsgZXJyb3Igb3Igc2VydmVyIHVuYXZhaWxhYmxlICg1MDIsIDUwMywgNTA0KVxuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoeyBlcnJvcjogW2dsb2JhbFRyYW5zbGF0ZS5hdXRoX1NlcnZlclVuYXZhaWxhYmxlXSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXJyb3IucmVzcG9uc2VKU09OICYmIGVycm9yLnJlc3BvbnNlSlNPTi5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIC8vIEFQSSByZXR1cm5lZCBlcnJvciB3aXRoIG1lc3NhZ2UgKGUuZy4sIHdyb25nIHBhc3N3b3JkLCByYXRlIGxpbWl0KVxuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoZXJyb3IucmVzcG9uc2VKU09OLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVW5rbm93biBlcnJvciAtIHNob3cgZ2VuZXJpYyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcih7IGVycm9yOiBbZ2xvYmFsVHJhbnNsYXRlLmF1dGhfV3JvbmdMb2dpblBhc3N3b3JkXSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGVzdCByZWZyZXNoIHRva2VuIGNvb2tpZSBhbmQgcmVkaXJlY3QgaWYgc3VjY2Vzc2Z1bFxuICAgICAqIENhbGxlZCBpbW1lZGlhdGVseSBhZnRlciBsb2dpbiB0byB2ZXJpZnkgY29va2llIGlzIHNldCBjb3JyZWN0bHlcbiAgICAgKi9cbiAgICBhc3luYyB0ZXN0UmVmcmVzaEFuZFJlZGlyZWN0KCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2FpdCAxMDBtcyBmb3IgYnJvd3NlciB0byBwcm9jZXNzIFNldC1Db29raWUgaGVhZGVyXG4gICAgICAgICAgICAvLyBUaGUgY29va2llIGlzIHNldCBpbiB0aGUgcmVzcG9uc2UsIGJ1dCBicm93c2VycyBuZWVkIHRpbWUgdG8gc3RvcmUgaXRcbiAgICAgICAgICAgIC8vIGJlZm9yZSBpdCdzIGF2YWlsYWJsZSBmb3IgdGhlIG5leHQgcmVxdWVzdFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tMT0dJTl0gV2FpdGluZyBmb3IgYnJvd3NlciB0byBwcm9jZXNzIFNldC1Db29raWUgaGVhZGVyLi4uJyk7XG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTE9HSU5dIENhbGxpbmcgL2F1dGg6cmVmcmVzaCB0byB0ZXN0IGNvb2tpZS4uLicpO1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOnJlZnJlc2gnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tMT0dJTl0gUmVmcmVzaCByZXNwb25zZTonLCByZXNwb25zZSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tMT0dJTl0gUmVmcmVzaCBzdWNjZXNzZnVsISBDb29raWUgaXMgd29ya2luZy4nKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0xPR0lOXSBTdG9yaW5nIG5ldyBhY2Nlc3MgdG9rZW4gYW5kIHJlZGlyZWN0aW5nLi4uJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgTkVXIGFjY2VzcyB0b2tlbiBmcm9tIHJlZnJlc2hcbiAgICAgICAgICAgICAgICBUb2tlbk1hbmFnZXIuc2V0QWNjZXNzVG9rZW4oXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuZXhwaXJlc0luXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIHVzZXIncyBjb25maWd1cmVkIGhvbWUgcGFnZSBmcm9tIEFQSSByZXNwb25zZVxuICAgICAgICAgICAgICAgIGNvbnN0IHJlZGlyZWN0VXJsID0gcmVzcG9uc2UuZGF0YS5ob21lUGFnZSB8fCBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvaW5kZXhgO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IHJlZGlyZWN0VXJsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTE9HSU5dIFJlZnJlc2ggZmFpbGVkIC0gY29va2llIG5vdCB3b3JraW5nJyk7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcih7IGVycm9yOiBbZ2xvYmFsVHJhbnNsYXRlLmF1dGhfUmVmcmVzaFRva2VuRXJyb3IgfHwgJ1JlZnJlc2ggdG9rZW4gZXJyb3InXSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMT0dJTl0gUmVmcmVzaCB0ZXN0IGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICBsb2dpbkZvcm0uc2hvd0Vycm9yKHsgZXJyb3I6IFtnbG9iYWxUcmFuc2xhdGUuYXV0aF9SZWZyZXNoVG9rZW5FcnJvciB8fCAnUmVmcmVzaCB0b2tlbiBlcnJvciddIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF1dGhlbnRpY2F0ZSB1c2VyIHdpdGggUGFzc2tleSAodXNlcm5hbWVsZXNzIGZsb3cpXG4gICAgICogQnJvd3NlciB3aWxsIHNob3cgYWxsIGF2YWlsYWJsZSBwYXNza2V5cyBmb3IgdGhpcyBkb21haW5cbiAgICAgKi9cbiAgICBhc3luYyBhdXRoZW50aWNhdGVXaXRoUGFzc2tleSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGxvZ2luRm9ybS4kcGFzc2tleUJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEdldCBvcmlnaW4gZm9yIFdlYkF1dGhuXG4gICAgICAgICAgICBjb25zdCBvcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuXG4gICAgICAgICAgICAvLyBTdGVwIDE6IEdldCBjaGFsbGVuZ2UgZnJvbSBSRVNUIEFQSSAod2l0aG91dCBsb2dpbiAtIHVzZXJuYW1lbGVzcylcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0UmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9wYXNza2V5czphdXRoZW50aWNhdGlvblN0YXJ0JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgb3JpZ2luIH0sIC8vIE5vIGxvZ2luIHBhcmFtZXRlciAtIHVzZXJuYW1lbGVzcyBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghc3RhcnRSZXNwb25zZS5yZXN1bHQgfHwgIXN0YXJ0UmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLiRwYXNza2V5QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBlcnJvciBtZXNzYWdlIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBzdGFydFJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvcj8uWzBdIHx8IGdsb2JhbFRyYW5zbGF0ZS5wa19Mb2dpbkVycm9yO1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoW2Vycm9yTWVzc2FnZV0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RlcCAyOiBDYWxsIFdlYkF1dGhuIEFQSSAtIGJyb3dzZXIgd2lsbCBzaG93IGFsbCBhdmFpbGFibGUgcGFzc2tleXNcbiAgICAgICAgICAgIGNvbnN0IHB1YmxpY0tleU9wdGlvbnMgPSBsb2dpbkZvcm0ucHJlcGFyZUNyZWRlbnRpYWxSZXF1ZXN0T3B0aW9ucyhzdGFydFJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgY29uc3QgYXNzZXJ0aW9uID0gYXdhaXQgbmF2aWdhdG9yLmNyZWRlbnRpYWxzLmdldCh7IHB1YmxpY0tleTogcHVibGljS2V5T3B0aW9ucyB9KTtcblxuICAgICAgICAgICAgLy8gU3RlcCAzOiBTZW5kIGFzc2VydGlvbiB0byBSRVNUIEFQSSBmb3IgdmVyaWZpY2F0aW9uXG4gICAgICAgICAgICBjb25zdCBhc3NlcnRpb25EYXRhID0gbG9naW5Gb3JtLnByZXBhcmVBc3NlcnRpb25EYXRhKGFzc2VydGlvbiwgc3RhcnRSZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbmlzaFJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvcGFzc2tleXM6YXV0aGVudGljYXRpb25GaW5pc2gnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoYXNzZXJ0aW9uRGF0YSksXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbG9naW5Gb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGxvZ2luRm9ybS4kcGFzc2tleUJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAoZmluaXNoUmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gU3RhcnQgc2Vzc2lvbiB2aWEgU2Vzc2lvbkNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICBhd2FpdCBsb2dpbkZvcm0uY3JlYXRlU2Vzc2lvbkZyb21QYXNza2V5KGZpbmlzaFJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGVycm9yIG1lc3NhZ2VzIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBmaW5pc2hSZXNwb25zZS5tZXNzYWdlcz8uZXJyb3I/LlswXSB8fCBnbG9iYWxUcmFuc2xhdGUucGtfTG9naW5FcnJvcjtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uc2hvd0Vycm9yKFtlcnJvck1lc3NhZ2VdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBsb2dpbkZvcm0uJHBhc3NrZXlCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Bhc3NrZXkgYXV0aGVudGljYXRpb24gZXJyb3I6JywgZXJyb3IpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB1c2VyIGNhbmNlbGxlZFxuICAgICAgICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdOb3RBbGxvd2VkRXJyb3InKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlciBjYW5jZWxsZWQgLSBkb24ndCBzaG93IGVycm9yXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IGVycm9yIG1lc3NhZ2UgZnJvbSBBUEkgcmVzcG9uc2Ugb3IgdXNlIGRlZmF1bHRcbiAgICAgICAgICAgIGxldCBlcnJvck1lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGUucGtfTG9naW5FcnJvcjtcbiAgICAgICAgICAgIGlmIChlcnJvci5yZXNwb25zZUpTT04/Lm1lc3NhZ2VzPy5lcnJvcj8uWzBdKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gZXJyb3IucmVzcG9uc2VKU09OLm1lc3NhZ2VzLmVycm9yWzBdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlcnJvci5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gYCR7Z2xvYmFsVHJhbnNsYXRlLnBrX0xvZ2luRXJyb3J9OiAke2Vycm9yLm1lc3NhZ2V9YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcihbZXJyb3JNZXNzYWdlXSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9naW4gd2l0aCBwYXNza2V5IGF1dGhlbnRpY2F0aW9uIHVzaW5nIHNlc3Npb25Ub2tlblxuICAgICAqIFNlc3Npb25Ub2tlbiBpcyBleGNoYW5nZWQgZm9yIEpXVCB0b2tlbnMgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgYXN5bmMgY3JlYXRlU2Vzc2lvbkZyb21QYXNza2V5KGF1dGhEYXRhKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiByZW1lbWJlciBtZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgY29uc3QgcmVtZW1iZXJNZSA9ICQoJyNyZW1lbWJlck1lQ2hlY2tCb3gnKS5pcygnOmNoZWNrZWQnKTtcblxuICAgICAgICAgICAgLy8gRXhjaGFuZ2Ugc2Vzc2lvblRva2VuIGZvciBKV1QgdG9rZW5zIHZpYSBSRVNUIEFQSVxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOmxvZ2luJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvblRva2VuOiBhdXRoRGF0YS5zZXNzaW9uVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgIHJlbWVtYmVyTWU6IHJlbWVtYmVyTWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1BBU1NLRVldIExvZ2luIHN1Y2Nlc3NmdWwsIHRlc3RpbmcgcmVmcmVzaCBjb29raWUuLi4nKTtcbiAgICAgICAgICAgICAgICAvLyBUZXN0IHJlZnJlc2ggdG9rZW4gY29va2llIGJlZm9yZSByZWRpcmVjdFxuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS50ZXN0UmVmcmVzaEFuZFJlZGlyZWN0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgZXJyb3IgbWVzc2FnZSBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXM/LmVycm9yPy5bMF0gfHwgZ2xvYmFsVHJhbnNsYXRlLnBrX0xvZ2luRXJyb3I7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcihbZXJyb3JNZXNzYWdlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQYXNza2V5IGxvZ2luIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgZXJyb3IgbWVzc2FnZSBmcm9tIEFQSSByZXNwb25zZSBvciB1c2UgZGVmYXVsdFxuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IucmVzcG9uc2VKU09OPy5tZXNzYWdlcz8uZXJyb3I/LlswXSB8fCBnbG9iYWxUcmFuc2xhdGUucGtfTG9naW5FcnJvcjtcbiAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoW2Vycm9yTWVzc2FnZV0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgY3JlZGVudGlhbCByZXF1ZXN0IG9wdGlvbnMgZm9yIFdlYkF1dGhuIEFQSVxuICAgICAqL1xuICAgIHByZXBhcmVDcmVkZW50aWFsUmVxdWVzdE9wdGlvbnMoc2VydmVyRGF0YSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2hhbGxlbmdlOiBsb2dpbkZvcm0uYmFzZTY0dXJsVG9BcnJheUJ1ZmZlcihzZXJ2ZXJEYXRhLmNoYWxsZW5nZSksXG4gICAgICAgICAgICB0aW1lb3V0OiBzZXJ2ZXJEYXRhLnRpbWVvdXQgfHwgNjAwMDAsXG4gICAgICAgICAgICBycElkOiBzZXJ2ZXJEYXRhLnJwSWQsXG4gICAgICAgICAgICBhbGxvd0NyZWRlbnRpYWxzOiBzZXJ2ZXJEYXRhLmFsbG93Q3JlZGVudGlhbHMubWFwKGNyZWQgPT4gKHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncHVibGljLWtleScsXG4gICAgICAgICAgICAgICAgaWQ6IGxvZ2luRm9ybS5iYXNlNjR1cmxUb0FycmF5QnVmZmVyKGNyZWQuaWQpLFxuICAgICAgICAgICAgfSkpLFxuICAgICAgICAgICAgdXNlclZlcmlmaWNhdGlvbjogc2VydmVyRGF0YS51c2VyVmVyaWZpY2F0aW9uIHx8ICdwcmVmZXJyZWQnLFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGFzc2VydGlvbiBkYXRhIHRvIHNlbmQgdG8gc2VydmVyXG4gICAgICovXG4gICAgcHJlcGFyZUFzc2VydGlvbkRhdGEoYXNzZXJ0aW9uLCBzZXJ2ZXJEYXRhKSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXNzZXJ0aW9uLnJlc3BvbnNlO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXNzaW9uSWQ6IHNlcnZlckRhdGEuc2Vzc2lvbklkLFxuICAgICAgICAgICAgY3JlZGVudGlhbElkOiBsb2dpbkZvcm0uYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChhc3NlcnRpb24ucmF3SWQpLFxuICAgICAgICAgICAgYXV0aGVudGljYXRvckRhdGE6IGxvZ2luRm9ybS5hcnJheUJ1ZmZlclRvQmFzZTY0dXJsKHJlc3BvbnNlLmF1dGhlbnRpY2F0b3JEYXRhKSxcbiAgICAgICAgICAgIGNsaWVudERhdGFKU09OOiBsb2dpbkZvcm0uYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChyZXNwb25zZS5jbGllbnREYXRhSlNPTiksXG4gICAgICAgICAgICBzaWduYXR1cmU6IGxvZ2luRm9ybS5hcnJheUJ1ZmZlclRvQmFzZTY0dXJsKHJlc3BvbnNlLnNpZ25hdHVyZSksXG4gICAgICAgICAgICB1c2VySGFuZGxlOiByZXNwb25zZS51c2VySGFuZGxlID8gbG9naW5Gb3JtLmFycmF5QnVmZmVyVG9CYXNlNjR1cmwocmVzcG9uc2UudXNlckhhbmRsZSkgOiBudWxsLFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGJhc2U2NHVybCBzdHJpbmcgdG8gQXJyYXlCdWZmZXJcbiAgICAgKi9cbiAgICBiYXNlNjR1cmxUb0FycmF5QnVmZmVyKGJhc2U2NHVybCkge1xuICAgICAgICBjb25zdCBwYWRkaW5nID0gJz0nLnJlcGVhdCgoNCAtIChiYXNlNjR1cmwubGVuZ3RoICUgNCkpICUgNCk7XG4gICAgICAgIGNvbnN0IGJhc2U2NCA9IGJhc2U2NHVybC5yZXBsYWNlKC8tL2csICcrJykucmVwbGFjZSgvXy9nLCAnLycpICsgcGFkZGluZztcbiAgICAgICAgY29uc3QgcmF3RGF0YSA9IHdpbmRvdy5hdG9iKGJhc2U2NCk7XG4gICAgICAgIGNvbnN0IG91dHB1dEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkocmF3RGF0YS5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhd0RhdGEubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIG91dHB1dEFycmF5W2ldID0gcmF3RGF0YS5jaGFyQ29kZUF0KGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRwdXRBcnJheS5idWZmZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgQXJyYXlCdWZmZXIgdG8gYmFzZTY0dXJsIHN0cmluZ1xuICAgICAqL1xuICAgIGFycmF5QnVmZmVyVG9CYXNlNjR1cmwoYnVmZmVyKSB7XG4gICAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgICAgICAgbGV0IGJpbmFyeSA9ICcnO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJ5dGVzLmJ5dGVMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYmluYXJ5ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGJhc2U2NCA9IHdpbmRvdy5idG9hKGJpbmFyeSk7XG4gICAgICAgIHJldHVybiBiYXNlNjQucmVwbGFjZSgvXFwrL2csICctJykucmVwbGFjZSgvXFwvL2csICdfJykucmVwbGFjZSgvPS9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAqL1xuICAgIHNob3dFcnJvcihtZXNzYWdlcykge1xuICAgICAgICBjb25zdCBlcnJvckh0bWwgPSBBcnJheS5pc0FycmF5KG1lc3NhZ2VzKVxuICAgICAgICAgICAgPyBtZXNzYWdlcy5qb2luKCc8YnI+JylcbiAgICAgICAgICAgIDogKG1lc3NhZ2VzLmVycm9yID8gbWVzc2FnZXMuZXJyb3Iuam9pbignPGJyPicpIDogJ1Vua25vd24gZXJyb3InKTtcblxuICAgICAgICBsb2dpbkZvcm0uJGZvcm1PYmouYmVmb3JlKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+JHtlcnJvckh0bWx9PC9kaXY+YCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIHVzaW5nIEZvbWFudGljIFVJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm1WYWxpZGF0aW9uKCkge1xuICAgICAgICBsb2dpbkZvcm0uJGZvcm1PYmouZm9ybSh7XG4gICAgICAgICAgICBmaWVsZHM6IGxvZ2luRm9ybS52YWxpZGF0ZVJ1bGVzLFxuICAgICAgICAgICAgb25TdWNjZXNzKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgLy8gUHJldmVudCBkZWZhdWx0IGZvcm0gc3VibWlzc2lvbiBpZiBldmVudCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQgJiYgZXZlbnQucHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgbG9naW4gZm9ybS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBsb2dpbkZvcm0uaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=