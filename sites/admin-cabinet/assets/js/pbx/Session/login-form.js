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
      console.error('Login error:', error);

      if (error.responseJSON && error.responseJSON.messages) {
        loginForm.showError(error.responseJSON.messages);
      } else {
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

        TokenManager.setAccessToken(response.data.accessToken, response.data.expiresIn); // Now redirect - we know the cookie works

        window.location = "".concat(globalRootUrl, "extensions/index");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZXNzaW9uL2xvZ2luLWZvcm0uanMiXSwibmFtZXMiOlsibG9naW5Gb3JtIiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwYXNzd29yZEZpZWxkIiwiJGNoZWNrQm94ZXMiLCIkcGFzc2tleUJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJsb2dpbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhdXRoX1ZhbGlkYXRlTG9naW5Ob3RFbXB0eSIsInBhc3N3b3JkIiwiYXV0aF9WYWxpZGF0ZVBhc3N3b3JkTm90RW1wdHkiLCJpbml0aWFsaXplIiwiY2hlY2tQYXNza2V5U3VwcG9ydCIsImJpbmRFdmVudHMiLCJpbml0aWFsaXplRm9ybVZhbGlkYXRpb24iLCJjaGVja2JveCIsImlzTG9jYWxob3N0Iiwid2luZG93IiwibG9jYXRpb24iLCJob3N0bmFtZSIsImlzU2VjdXJlIiwicHJvdG9jb2wiLCJoYXNXZWJBdXRobiIsIlB1YmxpY0tleUNyZWRlbnRpYWwiLCJ1bmRlZmluZWQiLCJoaWRlIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJmb3JtIiwic3VibWl0TG9naW4iLCJ3aGljaCIsImNsaWNrIiwiYXV0aGVudGljYXRlV2l0aFBhc3NrZXkiLCJyZW1vdmUiLCJhZGRDbGFzcyIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsIm1ldGhvZCIsImRhdGFUeXBlIiwiZGF0YSIsInZhbCIsInJlbWVtYmVyTWUiLCJpcyIsImNvbnNvbGUiLCJsb2ciLCJyZXN1bHQiLCJoYXNEYXRhIiwiaGFzQWNjZXNzVG9rZW4iLCJhY2Nlc3NUb2tlbiIsInRva2VuTGVuZ3RoIiwibGVuZ3RoIiwiZXhwaXJlc0luIiwidGVzdFJlZnJlc2hBbmRSZWRpcmVjdCIsImVycm9yIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJhdXRoX1dyb25nTG9naW5QYXNzd29yZCIsInJlc3BvbnNlSlNPTiIsInJlbW92ZUNsYXNzIiwiUHJvbWlzZSIsInJlc29sdmUiLCJzZXRUaW1lb3V0IiwiVG9rZW5NYW5hZ2VyIiwic2V0QWNjZXNzVG9rZW4iLCJnbG9iYWxSb290VXJsIiwiYXV0aF9SZWZyZXNoVG9rZW5FcnJvciIsIm9yaWdpbiIsInN0YXJ0UmVzcG9uc2UiLCJlcnJvck1lc3NhZ2UiLCJwa19Mb2dpbkVycm9yIiwicHVibGljS2V5T3B0aW9ucyIsInByZXBhcmVDcmVkZW50aWFsUmVxdWVzdE9wdGlvbnMiLCJhc3NlcnRpb24iLCJuYXZpZ2F0b3IiLCJjcmVkZW50aWFscyIsImdldCIsInB1YmxpY0tleSIsImFzc2VydGlvbkRhdGEiLCJwcmVwYXJlQXNzZXJ0aW9uRGF0YSIsImZpbmlzaFJlc3BvbnNlIiwiY29udGVudFR5cGUiLCJKU09OIiwic3RyaW5naWZ5IiwiY3JlYXRlU2Vzc2lvbkZyb21QYXNza2V5IiwibmFtZSIsIm1lc3NhZ2UiLCJhdXRoRGF0YSIsInNlc3Npb25Ub2tlbiIsInNlcnZlckRhdGEiLCJjaGFsbGVuZ2UiLCJiYXNlNjR1cmxUb0FycmF5QnVmZmVyIiwidGltZW91dCIsInJwSWQiLCJhbGxvd0NyZWRlbnRpYWxzIiwibWFwIiwiY3JlZCIsImlkIiwidXNlclZlcmlmaWNhdGlvbiIsInNlc3Npb25JZCIsImNyZWRlbnRpYWxJZCIsImFycmF5QnVmZmVyVG9CYXNlNjR1cmwiLCJyYXdJZCIsImF1dGhlbnRpY2F0b3JEYXRhIiwiY2xpZW50RGF0YUpTT04iLCJzaWduYXR1cmUiLCJ1c2VySGFuZGxlIiwiYmFzZTY0dXJsIiwicGFkZGluZyIsInJlcGVhdCIsImJhc2U2NCIsInJlcGxhY2UiLCJyYXdEYXRhIiwiYXRvYiIsIm91dHB1dEFycmF5IiwiVWludDhBcnJheSIsImkiLCJjaGFyQ29kZUF0IiwiYnVmZmVyIiwiYnl0ZXMiLCJiaW5hcnkiLCJieXRlTGVuZ3RoIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwiYnRvYSIsImVycm9ySHRtbCIsIkFycmF5IiwiaXNBcnJheSIs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RlUsRUFFSDtBQUNiO0FBQ0EsWUFBSUEsS0FBSyxJQUFJQSxLQUFLLENBQUN6RyxjQUFuQixFQUFtQztBQUMvQnlHLFVBQUFBLEtBQUssQ0FBQ3pHLGNBQU47QUFDSDtBQUNKO0FBUG1CLEtBQXhCO0FBU0g7QUFwYWEsQ0FBbEIsQyxDQXVhQTs7QUFDQWhDLENBQUMsQ0FBQzBJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEI3SSxFQUFBQSxTQUFTLENBQUNpQixVQUFWO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSxGb3JtLENvbmZpZyAqL1xuXG5jb25zdCBsb2dpbkZvcm0gPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2xvZ2luLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcGFzc3dvcmQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcGFzc3dvcmRGaWVsZDogJCgnI3Bhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNoZWNrYm94ZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tCb3hlczogJCgnLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBQYXNza2V5IGxvZ2luIGJ1dHRvblxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhc3NrZXlCdXR0b246ICQoJyNwYXNza2V5LWxvZ2luLWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGxvZ2luOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbG9naW4nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmF1dGhfVmFsaWRhdGVMb2dpbk5vdEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3Bhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hdXRoX1ZhbGlkYXRlUGFzc3dvcmROb3RFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZ2luIGZvcm0gZnVuY3Rpb25hbGl0eS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBsb2dpbkZvcm0uY2hlY2tQYXNza2V5U3VwcG9ydCgpO1xuICAgICAgICBsb2dpbkZvcm0uYmluZEV2ZW50cygpO1xuICAgICAgICBsb2dpbkZvcm0uaW5pdGlhbGl6ZUZvcm1WYWxpZGF0aW9uKCk7XG4gICAgICAgIGxvZ2luRm9ybS4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBicm93c2VyIHN1cHBvcnRzIFdlYkF1dGhuIGFuZCBjb25uZWN0aW9uIGlzIHNlY3VyZVxuICAgICAqIFdlYkF1dGhuIHJlcXVpcmVzIEhUVFBTIG9yIGxvY2FsaG9zdFxuICAgICAqIEhpZGUgcGFzc2tleSBidXR0b24gYW5kIE9SIGRpdmlkZXIgaWYgbm90IHN1cHBvcnRlZFxuICAgICAqL1xuICAgIGNoZWNrUGFzc2tleVN1cHBvcnQoKSB7XG4gICAgICAgIGNvbnN0IGlzTG9jYWxob3N0ID0gd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lID09PSAnbG9jYWxob3N0JyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lID09PSAnMTI3LjAuMC4xJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lID09PSAnWzo6MV0nO1xuICAgICAgICBjb25zdCBpc1NlY3VyZSA9IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOic7XG4gICAgICAgIGNvbnN0IGhhc1dlYkF1dGhuID0gd2luZG93LlB1YmxpY0tleUNyZWRlbnRpYWwgIT09IHVuZGVmaW5lZDtcblxuICAgICAgICAvLyBTaG93IHBhc3NrZXkgYnV0dG9uIG9ubHkgaWY6XG4gICAgICAgIC8vIDEuIEJyb3dzZXIgc3VwcG9ydHMgV2ViQXV0aG4gQU5EXG4gICAgICAgIC8vIDIuIENvbm5lY3Rpb24gaXMgSFRUUFMgT1IgbG9jYWxob3N0XG4gICAgICAgIGlmICghaGFzV2ViQXV0aG4gfHwgKCFpc1NlY3VyZSAmJiAhaXNMb2NhbGhvc3QpKSB7XG4gICAgICAgICAgICBsb2dpbkZvcm0uJHBhc3NrZXlCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgLy8gQWxzbyBoaWRlIHRoZSBPUiBkaXZpZGVyXG4gICAgICAgICAgICAkKCcudWkuaG9yaXpvbnRhbC5kaXZpZGVyJykuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJpbmQgZm9ybSBldmVudHNcbiAgICAgKi9cbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgICAvLyBQcmV2ZW50IGRlZmF1bHQgZm9ybSBzdWJtaXNzaW9uIC0gd2UgdXNlIEFKQVggb25seVxuICAgICAgICBsb2dpbkZvcm0uJGZvcm1PYmoub24oJ3N1Ym1pdCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBzdWJtaXQgYnV0dG9uIGNsaWNrIC0gcGFzc3dvcmQgYXV0aGVudGljYXRpb24gdmlhIFJFU1QgQVBJXG4gICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBsb2dpbkZvcm0uJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuICAgICAgICAgICAgaWYgKGxvZ2luRm9ybS4kZm9ybU9iai5mb3JtKCdpcyB2YWxpZCcpKSB7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnN1Ym1pdExvZ2luKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgb24gcGFzc3dvcmQgZmllbGRcbiAgICAgICAgbG9naW5Gb3JtLiRwYXNzd29yZEZpZWxkLm9uKCdrZXlwcmVzcycsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLiRzdWJtaXRCdXR0b24uY2xpY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHBhc3NrZXkgYnV0dG9uIGNsaWNrIC0gdXNlcm5hbWVsZXNzIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgIGxvZ2luRm9ybS4kcGFzc2tleUJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbG9naW5Gb3JtLmF1dGhlbnRpY2F0ZVdpdGhQYXNza2V5KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENsZWFyIGVycm9yIG1lc3NhZ2VzIG9uIGlucHV0XG4gICAgICAgICQoJ2lucHV0Jykub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgJCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3VibWl0IGxvZ2luIHZpYSBSRVNUIEFQSSAvcGJ4Y29yZS9hcGkvdjMvYXV0aDpsb2dpblxuICAgICAqINCf0L7Qu9GD0YfQsNC10YIgSldUIGFjY2VzcyB0b2tlbiDQuCByZWZyZXNoIHRva2VuIGNvb2tpZVxuICAgICAqL1xuICAgIGFzeW5jIHN1Ym1pdExvZ2luKCkge1xuICAgICAgICBsb2dpbkZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvYXV0aDpsb2dpbicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2luOiAkKCcjbG9naW4nKS52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgcGFzc3dvcmQ6ICQoJyNwYXNzd29yZCcpLnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICByZW1lbWJlck1lOiAkKCcjcmVtZW1iZXJNZUNoZWNrQm94JykuaXMoJzpjaGVja2VkJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tMT0dJTl0gQVBJIFJlc3BvbnNlOicsIHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IHJlc3BvbnNlLnJlc3VsdCxcbiAgICAgICAgICAgICAgICBoYXNEYXRhOiAhIXJlc3BvbnNlLmRhdGEsXG4gICAgICAgICAgICAgICAgaGFzQWNjZXNzVG9rZW46ICEhKHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbiksXG4gICAgICAgICAgICAgICAgdG9rZW5MZW5ndGg6IHJlc3BvbnNlLmRhdGE/LmFjY2Vzc1Rva2VuPy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgZXhwaXJlc0luOiByZXNwb25zZS5kYXRhPy5leHBpcmVzSW5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTE9HSU5dIExvZ2luIHN1Y2Nlc3NmdWwsIGFjY2VzcyB0b2tlbiByZWNlaXZlZCcpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTE9HSU5dIFJlZnJlc2ggY29va2llIHNob3VsZCBiZSBzZXQsIHRlc3Rpbmcgd2l0aCBpbW1lZGlhdGUgcmVmcmVzaC4uLicpO1xuXG4gICAgICAgICAgICAgICAgLy8gVGVzdCByZWZyZXNoIHRva2VuIGNvb2tpZSBieSBjYWxsaW5nIC9hdXRoOnJlZnJlc2ggaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICAvLyBUaGlzIHZlcmlmaWVzIHRoZSBjb29raWUgaXMgd29ya2luZyBiZWZvcmUgcmVkaXJlY3RpbmdcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0udGVzdFJlZnJlc2hBbmRSZWRpcmVjdCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTE9HSU5dIEludmFsaWQgcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXMgfHwgeyBlcnJvcjogW2dsb2JhbFRyYW5zbGF0ZS5hdXRoX1dyb25nTG9naW5QYXNzd29yZF0gfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdMb2dpbiBlcnJvcjonLCBlcnJvcik7XG5cbiAgICAgICAgICAgIGlmIChlcnJvci5yZXNwb25zZUpTT04gJiYgZXJyb3IucmVzcG9uc2VKU09OLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcihlcnJvci5yZXNwb25zZUpTT04ubWVzc2FnZXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uc2hvd0Vycm9yKHsgZXJyb3I6IFtnbG9iYWxUcmFuc2xhdGUuYXV0aF9Xcm9uZ0xvZ2luUGFzc3dvcmRdIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgbG9naW5Gb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUZXN0IHJlZnJlc2ggdG9rZW4gY29va2llIGFuZCByZWRpcmVjdCBpZiBzdWNjZXNzZnVsXG4gICAgICogQ2FsbGVkIGltbWVkaWF0ZWx5IGFmdGVyIGxvZ2luIHRvIHZlcmlmeSBjb29raWUgaXMgc2V0IGNvcnJlY3RseVxuICAgICAqL1xuICAgIGFzeW5jIHRlc3RSZWZyZXNoQW5kUmVkaXJlY3QoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXYWl0IDEwMG1zIGZvciBicm93c2VyIHRvIHByb2Nlc3MgU2V0LUNvb2tpZSBoZWFkZXJcbiAgICAgICAgICAgIC8vIFRoZSBjb29raWUgaXMgc2V0IGluIHRoZSByZXNwb25zZSwgYnV0IGJyb3dzZXJzIG5lZWQgdGltZSB0byBzdG9yZSBpdFxuICAgICAgICAgICAgLy8gYmVmb3JlIGl0J3MgYXZhaWxhYmxlIGZvciB0aGUgbmV4dCByZXF1ZXN0XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW0xPR0lOXSBXYWl0aW5nIGZvciBicm93c2VyIHRvIHByb2Nlc3MgU2V0LUNvb2tpZSBoZWFkZXIuLi4nKTtcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tMT0dJTl0gQ2FsbGluZyAvYXV0aDpyZWZyZXNoIHRvIHRlc3QgY29va2llLi4uJyk7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6cmVmcmVzaCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW0xPR0lOXSBSZWZyZXNoIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0xPR0lOXSBSZWZyZXNoIHN1Y2Nlc3NmdWwhIENvb2tpZSBpcyB3b3JraW5nLicpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTE9HSU5dIFN0b3JpbmcgbmV3IGFjY2VzcyB0b2tlbiBhbmQgcmVkaXJlY3RpbmcuLi4nKTtcblxuICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBORVcgYWNjZXNzIHRva2VuIGZyb20gcmVmcmVzaFxuICAgICAgICAgICAgICAgIFRva2VuTWFuYWdlci5zZXRBY2Nlc3NUb2tlbihcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbixcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5leHBpcmVzSW5cbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gTm93IHJlZGlyZWN0IC0gd2Uga25vdyB0aGUgY29va2llIHdvcmtzXG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2luZGV4YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0xPR0lOXSBSZWZyZXNoIGZhaWxlZCAtIGNvb2tpZSBub3Qgd29ya2luZycpO1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoeyBlcnJvcjogW2dsb2JhbFRyYW5zbGF0ZS5hdXRoX1JlZnJlc2hUb2tlbkVycm9yIHx8ICdSZWZyZXNoIHRva2VuIGVycm9yJ10gfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTE9HSU5dIFJlZnJlc2ggdGVzdCBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcih7IGVycm9yOiBbZ2xvYmFsVHJhbnNsYXRlLmF1dGhfUmVmcmVzaFRva2VuRXJyb3IgfHwgJ1JlZnJlc2ggdG9rZW4gZXJyb3InXSB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdXRoZW50aWNhdGUgdXNlciB3aXRoIFBhc3NrZXkgKHVzZXJuYW1lbGVzcyBmbG93KVxuICAgICAqIEJyb3dzZXIgd2lsbCBzaG93IGFsbCBhdmFpbGFibGUgcGFzc2tleXMgZm9yIHRoaXMgZG9tYWluXG4gICAgICovXG4gICAgYXN5bmMgYXV0aGVudGljYXRlV2l0aFBhc3NrZXkoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBsb2dpbkZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBsb2dpbkZvcm0uJHBhc3NrZXlCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBHZXQgb3JpZ2luIGZvciBXZWJBdXRoblxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcblxuICAgICAgICAgICAgLy8gU3RlcCAxOiBHZXQgY2hhbGxlbmdlIGZyb20gUkVTVCBBUEkgKHdpdGhvdXQgbG9naW4gLSB1c2VybmFtZWxlc3MpXG4gICAgICAgICAgICBjb25zdCBzdGFydFJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvcGFzc2tleXM6YXV0aGVudGljYXRpb25TdGFydCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IG9yaWdpbiB9LCAvLyBObyBsb2dpbiBwYXJhbWV0ZXIgLSB1c2VybmFtZWxlc3MgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIXN0YXJ0UmVzcG9uc2UucmVzdWx0IHx8ICFzdGFydFJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS4kcGFzc2tleUJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgZXJyb3IgbWVzc2FnZSBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gc3RhcnRSZXNwb25zZS5tZXNzYWdlcz8uZXJyb3I/LlswXSB8fCBnbG9iYWxUcmFuc2xhdGUucGtfTG9naW5FcnJvcjtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uc2hvd0Vycm9yKFtlcnJvck1lc3NhZ2VdKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMjogQ2FsbCBXZWJBdXRobiBBUEkgLSBicm93c2VyIHdpbGwgc2hvdyBhbGwgYXZhaWxhYmxlIHBhc3NrZXlzXG4gICAgICAgICAgICBjb25zdCBwdWJsaWNLZXlPcHRpb25zID0gbG9naW5Gb3JtLnByZXBhcmVDcmVkZW50aWFsUmVxdWVzdE9wdGlvbnMoc3RhcnRSZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIGNvbnN0IGFzc2VydGlvbiA9IGF3YWl0IG5hdmlnYXRvci5jcmVkZW50aWFscy5nZXQoeyBwdWJsaWNLZXk6IHB1YmxpY0tleU9wdGlvbnMgfSk7XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMzogU2VuZCBhc3NlcnRpb24gdG8gUkVTVCBBUEkgZm9yIHZlcmlmaWNhdGlvblxuICAgICAgICAgICAgY29uc3QgYXNzZXJ0aW9uRGF0YSA9IGxvZ2luRm9ybS5wcmVwYXJlQXNzZXJ0aW9uRGF0YShhc3NlcnRpb24sIHN0YXJ0UmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICBjb25zdCBmaW5pc2hSZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL3Bhc3NrZXlzOmF1dGhlbnRpY2F0aW9uRmluaXNoJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGFzc2VydGlvbkRhdGEpLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBsb2dpbkZvcm0uJHBhc3NrZXlCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgaWYgKGZpbmlzaFJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIFN0YXJ0IHNlc3Npb24gdmlhIFNlc3Npb25Db250cm9sbGVyXG4gICAgICAgICAgICAgICAgYXdhaXQgbG9naW5Gb3JtLmNyZWF0ZVNlc3Npb25Gcm9tUGFzc2tleShmaW5pc2hSZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBlcnJvciBtZXNzYWdlcyBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZmluaXNoUmVzcG9uc2UubWVzc2FnZXM/LmVycm9yPy5bMF0gfHwgZ2xvYmFsVHJhbnNsYXRlLnBrX0xvZ2luRXJyb3I7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcihbZXJyb3JNZXNzYWdlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dpbkZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgbG9naW5Gb3JtLiRwYXNza2V5QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQYXNza2V5IGF1dGhlbnRpY2F0aW9uIGVycm9yOicsIGVycm9yKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdXNlciBjYW5jZWxsZWRcbiAgICAgICAgICAgIGlmIChlcnJvci5uYW1lID09PSAnTm90QWxsb3dlZEVycm9yJykge1xuICAgICAgICAgICAgICAgIC8vIFVzZXIgY2FuY2VsbGVkIC0gZG9uJ3Qgc2hvdyBlcnJvclxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBlcnJvciBtZXNzYWdlIGZyb20gQVBJIHJlc3BvbnNlIG9yIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICBsZXQgZXJyb3JNZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlLnBrX0xvZ2luRXJyb3I7XG4gICAgICAgICAgICBpZiAoZXJyb3IucmVzcG9uc2VKU09OPy5tZXNzYWdlcz8uZXJyb3I/LlswXSkge1xuICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IGVycm9yLnJlc3BvbnNlSlNPTi5tZXNzYWdlcy5lcnJvclswXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXJyb3IubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IGAke2dsb2JhbFRyYW5zbGF0ZS5wa19Mb2dpbkVycm9yfTogJHtlcnJvci5tZXNzYWdlfWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoW2Vycm9yTWVzc2FnZV0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvZ2luIHdpdGggcGFzc2tleSBhdXRoZW50aWNhdGlvbiB1c2luZyBzZXNzaW9uVG9rZW5cbiAgICAgKiBTZXNzaW9uVG9rZW4gaXMgZXhjaGFuZ2VkIGZvciBKV1QgdG9rZW5zIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGFzeW5jIGNyZWF0ZVNlc3Npb25Gcm9tUGFzc2tleShhdXRoRGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcmVtZW1iZXIgbWUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgIGNvbnN0IHJlbWVtYmVyTWUgPSAkKCcjcmVtZW1iZXJNZUNoZWNrQm94JykuaXMoJzpjaGVja2VkJyk7XG5cbiAgICAgICAgICAgIC8vIEV4Y2hhbmdlIHNlc3Npb25Ub2tlbiBmb3IgSldUIHRva2VucyB2aWEgUkVTVCBBUElcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvYXV0aDpsb2dpbicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25Ub2tlbjogYXV0aERhdGEuc2Vzc2lvblRva2VuLFxuICAgICAgICAgICAgICAgICAgICByZW1lbWJlck1lOiByZW1lbWJlck1lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tQQVNTS0VZXSBMb2dpbiBzdWNjZXNzZnVsLCB0ZXN0aW5nIHJlZnJlc2ggY29va2llLi4uJyk7XG4gICAgICAgICAgICAgICAgLy8gVGVzdCByZWZyZXNoIHRva2VuIGNvb2tpZSBiZWZvcmUgcmVkaXJlY3RcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0udGVzdFJlZnJlc2hBbmRSZWRpcmVjdCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGVycm9yIG1lc3NhZ2UgZnJvbSByZXNwb25zZVxuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvcj8uWzBdIHx8IGdsb2JhbFRyYW5zbGF0ZS5wa19Mb2dpbkVycm9yO1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoW2Vycm9yTWVzc2FnZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUGFzc2tleSBsb2dpbiBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBFeHRyYWN0IGVycm9yIG1lc3NhZ2UgZnJvbSBBUEkgcmVzcG9uc2Ugb3IgdXNlIGRlZmF1bHRcbiAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yLnJlc3BvbnNlSlNPTj8ubWVzc2FnZXM/LmVycm9yPy5bMF0gfHwgZ2xvYmFsVHJhbnNsYXRlLnBrX0xvZ2luRXJyb3I7XG4gICAgICAgICAgICBsb2dpbkZvcm0uc2hvd0Vycm9yKFtlcnJvck1lc3NhZ2VdKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGNyZWRlbnRpYWwgcmVxdWVzdCBvcHRpb25zIGZvciBXZWJBdXRobiBBUElcbiAgICAgKi9cbiAgICBwcmVwYXJlQ3JlZGVudGlhbFJlcXVlc3RPcHRpb25zKHNlcnZlckRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoYWxsZW5nZTogbG9naW5Gb3JtLmJhc2U2NHVybFRvQXJyYXlCdWZmZXIoc2VydmVyRGF0YS5jaGFsbGVuZ2UpLFxuICAgICAgICAgICAgdGltZW91dDogc2VydmVyRGF0YS50aW1lb3V0IHx8IDYwMDAwLFxuICAgICAgICAgICAgcnBJZDogc2VydmVyRGF0YS5ycElkLFxuICAgICAgICAgICAgYWxsb3dDcmVkZW50aWFsczogc2VydmVyRGF0YS5hbGxvd0NyZWRlbnRpYWxzLm1hcChjcmVkID0+ICh7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3B1YmxpYy1rZXknLFxuICAgICAgICAgICAgICAgIGlkOiBsb2dpbkZvcm0uYmFzZTY0dXJsVG9BcnJheUJ1ZmZlcihjcmVkLmlkKSxcbiAgICAgICAgICAgIH0pKSxcbiAgICAgICAgICAgIHVzZXJWZXJpZmljYXRpb246IHNlcnZlckRhdGEudXNlclZlcmlmaWNhdGlvbiB8fCAncHJlZmVycmVkJyxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZSBhc3NlcnRpb24gZGF0YSB0byBzZW5kIHRvIHNlcnZlclxuICAgICAqL1xuICAgIHByZXBhcmVBc3NlcnRpb25EYXRhKGFzc2VydGlvbiwgc2VydmVyRGF0YSkge1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGFzc2VydGlvbi5yZXNwb25zZTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2Vzc2lvbklkOiBzZXJ2ZXJEYXRhLnNlc3Npb25JZCxcbiAgICAgICAgICAgIGNyZWRlbnRpYWxJZDogbG9naW5Gb3JtLmFycmF5QnVmZmVyVG9CYXNlNjR1cmwoYXNzZXJ0aW9uLnJhd0lkKSxcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0b3JEYXRhOiBsb2dpbkZvcm0uYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChyZXNwb25zZS5hdXRoZW50aWNhdG9yRGF0YSksXG4gICAgICAgICAgICBjbGllbnREYXRhSlNPTjogbG9naW5Gb3JtLmFycmF5QnVmZmVyVG9CYXNlNjR1cmwocmVzcG9uc2UuY2xpZW50RGF0YUpTT04pLFxuICAgICAgICAgICAgc2lnbmF0dXJlOiBsb2dpbkZvcm0uYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChyZXNwb25zZS5zaWduYXR1cmUpLFxuICAgICAgICAgICAgdXNlckhhbmRsZTogcmVzcG9uc2UudXNlckhhbmRsZSA/IGxvZ2luRm9ybS5hcnJheUJ1ZmZlclRvQmFzZTY0dXJsKHJlc3BvbnNlLnVzZXJIYW5kbGUpIDogbnVsbCxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBiYXNlNjR1cmwgc3RyaW5nIHRvIEFycmF5QnVmZmVyXG4gICAgICovXG4gICAgYmFzZTY0dXJsVG9BcnJheUJ1ZmZlcihiYXNlNjR1cmwpIHtcbiAgICAgICAgY29uc3QgcGFkZGluZyA9ICc9Jy5yZXBlYXQoKDQgLSAoYmFzZTY0dXJsLmxlbmd0aCAlIDQpKSAlIDQpO1xuICAgICAgICBjb25zdCBiYXNlNjQgPSBiYXNlNjR1cmwucmVwbGFjZSgvLS9nLCAnKycpLnJlcGxhY2UoL18vZywgJy8nKSArIHBhZGRpbmc7XG4gICAgICAgIGNvbnN0IHJhd0RhdGEgPSB3aW5kb3cuYXRvYihiYXNlNjQpO1xuICAgICAgICBjb25zdCBvdXRwdXRBcnJheSA9IG5ldyBVaW50OEFycmF5KHJhd0RhdGEubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByYXdEYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBvdXRwdXRBcnJheVtpXSA9IHJhd0RhdGEuY2hhckNvZGVBdChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0cHV0QXJyYXkuYnVmZmVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IEFycmF5QnVmZmVyIHRvIGJhc2U2NHVybCBzdHJpbmdcbiAgICAgKi9cbiAgICBhcnJheUJ1ZmZlclRvQmFzZTY0dXJsKGJ1ZmZlcikge1xuICAgICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gICAgICAgIGxldCBiaW5hcnkgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBieXRlcy5ieXRlTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGJpbmFyeSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBiYXNlNjQgPSB3aW5kb3cuYnRvYShiaW5hcnkpO1xuICAgICAgICByZXR1cm4gYmFzZTY0LnJlcGxhY2UoL1xcKy9nLCAnLScpLnJlcGxhY2UoL1xcLy9nLCAnXycpLnJlcGxhY2UoLz0vZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBzaG93RXJyb3IobWVzc2FnZXMpIHtcbiAgICAgICAgY29uc3QgZXJyb3JIdG1sID0gQXJyYXkuaXNBcnJheShtZXNzYWdlcylcbiAgICAgICAgICAgID8gbWVzc2FnZXMuam9pbignPGJyPicpXG4gICAgICAgICAgICA6IChtZXNzYWdlcy5lcnJvciA/IG1lc3NhZ2VzLmVycm9yLmpvaW4oJzxicj4nKSA6ICdVbmtub3duIGVycm9yJyk7XG5cbiAgICAgICAgbG9naW5Gb3JtLiRmb3JtT2JqLmJlZm9yZShgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7ZXJyb3JIdG1sfTwvZGl2PmApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvbiB1c2luZyBGb21hbnRpYyBVSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtVmFsaWRhdGlvbigpIHtcbiAgICAgICAgbG9naW5Gb3JtLiRmb3JtT2JqLmZvcm0oe1xuICAgICAgICAgICAgZmllbGRzOiBsb2dpbkZvcm0udmFsaWRhdGVSdWxlcyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhldmVudCkge1xuICAgICAgICAgICAgICAgIC8vIFByZXZlbnQgZGVmYXVsdCBmb3JtIHN1Ym1pc3Npb24gaWYgZXZlbnQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50ICYmIGV2ZW50LnByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGxvZ2luIGZvcm0uXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbG9naW5Gb3JtLmluaXRpYWxpemUoKTtcbn0pO1xuIl19