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
        loginForm.$submitButton.removeClass('loading disabled');
        loginForm.$passkeyButton.removeClass('loading disabled');
        loginForm.showError(startResponse.messages || [globalTranslate.pk_LoginError]);
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
        loginForm.showError(finishResponse.messages || [globalTranslate.pk_LoginError]);
      }
    } catch (error) {
      loginForm.$submitButton.removeClass('loading disabled');
      loginForm.$passkeyButton.removeClass('loading disabled');
      console.error('Passkey authentication error:', error); // Check if user cancelled

      if (error.name === 'NotAllowedError') {
        // User cancelled - don't show error
        return;
      } // Real error - show message


      loginForm.showError(["".concat(globalTranslate.pk_LoginError, ": ").concat(error.message)]);
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
        loginForm.showError(response.messages || [globalTranslate.pk_LoginError]);
      }
    } catch (error) {
      console.error('Passkey login error:', error);
      loginForm.showError([globalTranslate.pk_LoginError]);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZXNzaW9uL2xvZ2luLWZvcm0uanMiXSwibmFtZXMiOlsibG9naW5Gb3JtIiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRwYXNzd29yZEZpZWxkIiwiJGNoZWNrQm94ZXMiLCIkcGFzc2tleUJ1dHRvbiIsInZhbGlkYXRlUnVsZXMiLCJsb2dpbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhdXRoX1ZhbGlkYXRlTG9naW5Ob3RFbXB0eSIsInBhc3N3b3JkIiwiYXV0aF9WYWxpZGF0ZVBhc3N3b3JkTm90RW1wdHkiLCJpbml0aWFsaXplIiwiY2hlY2tQYXNza2V5U3VwcG9ydCIsImJpbmRFdmVudHMiLCJpbml0aWFsaXplRm9ybVZhbGlkYXRpb24iLCJjaGVja2JveCIsImlzTG9jYWxob3N0Iiwid2luZG93IiwibG9jYXRpb24iLCJob3N0bmFtZSIsImlzU2VjdXJlIiwicHJvdG9jb2wiLCJoYXNXZWJBdXRobiIsIlB1YmxpY0tleUNyZWRlbnRpYWwiLCJ1bmRlZmluZWQiLCJoaWRlIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJmb3JtIiwic3VibWl0TG9naW4iLCJ3aGljaCIsImNsaWNrIiwiYXV0aGVudGljYXRlV2l0aFBhc3NrZXkiLCJyZW1vdmUiLCJhZGRDbGFzcyIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsIm1ldGhvZCIsImRhdGFUeXBlIiwiZGF0YSIsInZhbCIsInJlbWVtYmVyTWUiLCJpcyIsImNvbnNvbGUiLCJsb2ciLCJyZXN1bHQiLCJoYXNEYXRhIiwiaGFzQWNjZXNzVG9rZW4iLCJhY2Nlc3NUb2tlbiIsInRva2VuTGVuZ3RoIiwibGVuZ3RoIiwiZXhwaXJlc0luIiwidGVzdFJlZnJlc2hBbmRSZWRpcmVjdCIsImVycm9yIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJhdXRoX1dyb25nTG9naW5QYXNzd29yZCIsInJlc3BvbnNlSlNPTiIsInJlbW92ZUNsYXNzIiwiUHJvbWlzZSIsInJlc29sdmUiLCJzZXRUaW1lb3V0IiwiVG9rZW5NYW5hZ2VyIiwic2V0QWNjZXNzVG9rZW4iLCJnbG9iYWxSb290VXJsIiwiYXV0aF9SZWZyZXNoVG9rZW5FcnJvciIsIm9yaWdpbiIsInN0YXJ0UmVzcG9uc2UiLCJwa19Mb2dpbkVycm9yIiwicHVibGljS2V5T3B0aW9ucyIsInByZXBhcmVDcmVkZW50aWFsUmVxdWVzdE9wdGlvbnMiLCJhc3NlcnRpb24iLCJuYXZpZ2F0b3IiLCJjcmVkZW50aWFscyIsImdldCIsInB1YmxpY0tleSIsImFzc2VydGlvbkRhdGEiLCJwcmVwYXJlQXNzZXJ0aW9uRGF0YSIsImZpbmlzaFJlc3BvbnNlIiwiY29udGVudFR5cGUiLCJKU09OIiwic3RyaW5naWZ5IiwiY3JlYXRlU2Vzc2lvbkZyb21QYXNza2V5IiwibmFtZSIsIm1lc3NhZ2UiLCJhdXRoRGF0YSIsInNlc3Npb25Ub2tlbiIsInNlcnZlckRhdGEiLCJjaGFsbGVuZ2UiLCJiYXNlNjR1cmxUb0FycmF5QnVmZmVyIiwidGltZW91dCIsInJwSWQiLCJhbGxvd0NyZWRlbnRpYWxzIiwibWFwIiwiY3JlZCIsImlkIiwidXNlclZlcmlmaWNhdGlvbiIsInNlc3Npb25JZCIsImNyZWRlbnRpYWxJZCIsImFycmF5QnVmZmVyVG9CYXNlNjR1cmwiLCJyYXdJZCIsImF1dGhlbnRpY2F0b3JEYXRhIiwiY2xpZW50RGF0YUpTT04iLCJzaWduYXR1cmUiLCJ1c2VySGFuZGxlIiwiYmFzZTY0dXJsIiwicGFkZGluZyIsInJlcGVhdCIsImJhc2U2NCIsInJlcGxhY2UiLCJyYXdEYXRhIiwiYXRvYiIsIm91dHB1dEFycmF5IiwiVWludDhBcnJheSIsImkiLCJjaGFyQ29kZUF0IiwiYnVmZmVyIiwiYnl0ZXMiLCJiaW5hcnkiLCJieXRlTGVuZ3RoIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwiYnRvYSIsImVycm9ySHRtbCIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJiZWZvcmUiLCJmaWVsZHMiLCJvblN1Y2Nlc3MiLCJldmVudCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUVBLElBQU1BLFNBQVMsR0FBRztBQUNkO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGFBQUQsQ0FMRzs7QUFPZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxlQUFELENBWEY7O0FBYWQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsY0FBYyxFQUFFRixDQUFDLENBQUMsV0FBRCxDQWpCSDs7QUFtQmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsV0FBVyxFQUFFSCxDQUFDLENBQUMsV0FBRCxDQXZCQTs7QUF5QmQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsY0FBYyxFQUFFSixDQUFDLENBQUMsdUJBQUQsQ0E3Qkg7O0FBK0JkO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLEtBQUssRUFBRTtBQUNIQyxNQUFBQSxVQUFVLEVBQUUsT0FEVDtBQUVIQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERztBQUZKLEtBREk7QUFVWEMsSUFBQUEsUUFBUSxFQUFFO0FBQ05OLE1BQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRztBQUY1QixPQURHO0FBRkQ7QUFWQyxHQXBDRDs7QUF5RGQ7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBNURjLHdCQTRERDtBQUNUakIsSUFBQUEsU0FBUyxDQUFDa0IsbUJBQVY7QUFDQWxCLElBQUFBLFNBQVMsQ0FBQ21CLFVBQVY7QUFDQW5CLElBQUFBLFNBQVMsQ0FBQ29CLHdCQUFWO0FBQ0FwQixJQUFBQSxTQUFTLENBQUNLLFdBQVYsQ0FBc0JnQixRQUF0QjtBQUNILEdBakVhOztBQW1FZDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lILEVBQUFBLG1CQXhFYyxpQ0F3RVE7QUFDbEIsUUFBTUksV0FBVyxHQUFHQyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLFFBQWhCLEtBQTZCLFdBQTdCLElBQ0RGLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsUUFBaEIsS0FBNkIsV0FENUIsSUFFREYsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxRQUFoQixLQUE2QixPQUZoRDtBQUdBLFFBQU1DLFFBQVEsR0FBR0gsTUFBTSxDQUFDQyxRQUFQLENBQWdCRyxRQUFoQixLQUE2QixRQUE5QztBQUNBLFFBQU1DLFdBQVcsR0FBR0wsTUFBTSxDQUFDTSxtQkFBUCxLQUErQkMsU0FBbkQsQ0FMa0IsQ0FPbEI7QUFDQTtBQUNBOztBQUNBLFFBQUksQ0FBQ0YsV0FBRCxJQUFpQixDQUFDRixRQUFELElBQWEsQ0FBQ0osV0FBbkMsRUFBaUQ7QUFDN0N0QixNQUFBQSxTQUFTLENBQUNNLGNBQVYsQ0FBeUJ5QixJQUF6QixHQUQ2QyxDQUU3Qzs7QUFDQTdCLE1BQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCNkIsSUFBNUI7QUFDSDtBQUNKLEdBdkZhOztBQXlGZDtBQUNKO0FBQ0E7QUFDSVosRUFBQUEsVUE1RmMsd0JBNEZEO0FBQ1Q7QUFDQW5CLElBQUFBLFNBQVMsQ0FBQ0MsUUFBVixDQUFtQitCLEVBQW5CLENBQXNCLFFBQXRCLEVBQWdDLFVBQUNDLENBQUQsRUFBTztBQUNuQ0EsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsYUFBTyxLQUFQO0FBQ0gsS0FIRCxFQUZTLENBT1Q7O0FBQ0FsQyxJQUFBQSxTQUFTLENBQUNHLGFBQVYsQ0FBd0I2QixFQUF4QixDQUEyQixPQUEzQixFQUFvQyxVQUFDQyxDQUFELEVBQU87QUFDdkNBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBbEMsTUFBQUEsU0FBUyxDQUFDQyxRQUFWLENBQW1Ca0MsSUFBbkIsQ0FBd0IsZUFBeEI7O0FBQ0EsVUFBSW5DLFNBQVMsQ0FBQ0MsUUFBVixDQUFtQmtDLElBQW5CLENBQXdCLFVBQXhCLENBQUosRUFBeUM7QUFDckNuQyxRQUFBQSxTQUFTLENBQUNvQyxXQUFWO0FBQ0g7QUFDSixLQU5ELEVBUlMsQ0FnQlQ7O0FBQ0FwQyxJQUFBQSxTQUFTLENBQUNJLGNBQVYsQ0FBeUI0QixFQUF6QixDQUE0QixVQUE1QixFQUF3QyxVQUFDQyxDQUFELEVBQU87QUFDM0MsVUFBSUEsQ0FBQyxDQUFDSSxLQUFGLEtBQVksRUFBaEIsRUFBb0I7QUFDaEJKLFFBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBbEMsUUFBQUEsU0FBUyxDQUFDRyxhQUFWLENBQXdCbUMsS0FBeEI7QUFDSDtBQUNKLEtBTEQsRUFqQlMsQ0F3QlQ7O0FBQ0F0QyxJQUFBQSxTQUFTLENBQUNNLGNBQVYsQ0FBeUIwQixFQUF6QixDQUE0QixPQUE1QixFQUFxQyxVQUFDQyxDQUFELEVBQU87QUFDeENBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBbEMsTUFBQUEsU0FBUyxDQUFDdUMsdUJBQVY7QUFDSCxLQUhELEVBekJTLENBOEJUOztBQUNBckMsSUFBQUEsQ0FBQyxDQUFDLE9BQUQsQ0FBRCxDQUFXOEIsRUFBWCxDQUFjLE9BQWQsRUFBdUIsWUFBTTtBQUN6QjlCLE1BQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJzQyxNQUFuQjtBQUNILEtBRkQ7QUFHSCxHQTlIYTs7QUFnSWQ7QUFDSjtBQUNBO0FBQ0E7QUFDVUosRUFBQUEsV0FwSVEsK0JBb0lNO0FBQ2hCcEMsSUFBQUEsU0FBUyxDQUFDRyxhQUFWLENBQXdCc0MsUUFBeEIsQ0FBaUMsa0JBQWpDO0FBQ0F2QyxJQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1Cc0MsTUFBbkI7O0FBRUEsUUFBSTtBQUFBOztBQUNBLFVBQU1FLFFBQVEsR0FBRyxNQUFNeEMsQ0FBQyxDQUFDeUMsSUFBRixDQUFPO0FBQzFCQyxRQUFBQSxHQUFHLEVBQUUsNEJBRHFCO0FBRTFCQyxRQUFBQSxNQUFNLEVBQUUsTUFGa0I7QUFHMUJDLFFBQUFBLFFBQVEsRUFBRSxNQUhnQjtBQUkxQkMsUUFBQUEsSUFBSSxFQUFFO0FBQ0Z2QyxVQUFBQSxLQUFLLEVBQUVOLENBQUMsQ0FBQyxRQUFELENBQUQsQ0FBWThDLEdBQVosRUFETDtBQUVGakMsVUFBQUEsUUFBUSxFQUFFYixDQUFDLENBQUMsV0FBRCxDQUFELENBQWU4QyxHQUFmLEVBRlI7QUFHRkMsVUFBQUEsVUFBVSxFQUFFL0MsQ0FBQyxDQUFDLHFCQUFELENBQUQsQ0FBeUJnRCxFQUF6QixDQUE0QixVQUE1QjtBQUhWO0FBSm9CLE9BQVAsQ0FBdkI7QUFXQUMsTUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksdUJBQVosRUFBcUM7QUFDakNDLFFBQUFBLE1BQU0sRUFBRVgsUUFBUSxDQUFDVyxNQURnQjtBQUVqQ0MsUUFBQUEsT0FBTyxFQUFFLENBQUMsQ0FBQ1osUUFBUSxDQUFDSyxJQUZhO0FBR2pDUSxRQUFBQSxjQUFjLEVBQUUsQ0FBQyxFQUFFYixRQUFRLENBQUNLLElBQVQsSUFBaUJMLFFBQVEsQ0FBQ0ssSUFBVCxDQUFjUyxXQUFqQyxDQUhnQjtBQUlqQ0MsUUFBQUEsV0FBVyxvQkFBRWYsUUFBUSxDQUFDSyxJQUFYLDRFQUFFLGVBQWVTLFdBQWpCLDBEQUFFLHNCQUE0QkUsTUFKUjtBQUtqQ0MsUUFBQUEsU0FBUyxxQkFBRWpCLFFBQVEsQ0FBQ0ssSUFBWCxvREFBRSxnQkFBZVk7QUFMTyxPQUFyQzs7QUFRQSxVQUFJakIsUUFBUSxDQUFDVyxNQUFULElBQW1CWCxRQUFRLENBQUNLLElBQTVCLElBQW9DTCxRQUFRLENBQUNLLElBQVQsQ0FBY1MsV0FBdEQsRUFBbUU7QUFDL0RMLFFBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLGlEQUFaO0FBQ0FELFFBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLHlFQUFaLEVBRitELENBSS9EO0FBQ0E7O0FBQ0FwRCxRQUFBQSxTQUFTLENBQUM0RCxzQkFBVjtBQUNILE9BUEQsTUFPTztBQUNIVCxRQUFBQSxPQUFPLENBQUNVLEtBQVIsQ0FBYywyQkFBZCxFQUEyQ25CLFFBQTNDO0FBQ0ExQyxRQUFBQSxTQUFTLENBQUM4RCxTQUFWLENBQW9CcEIsUUFBUSxDQUFDcUIsUUFBVCxJQUFxQjtBQUFFRixVQUFBQSxLQUFLLEVBQUUsQ0FBQ2hELGVBQWUsQ0FBQ21ELHVCQUFqQjtBQUFULFNBQXpDO0FBQ0g7QUFDSixLQS9CRCxDQStCRSxPQUFPSCxLQUFQLEVBQWM7QUFDWlYsTUFBQUEsT0FBTyxDQUFDVSxLQUFSLENBQWMsY0FBZCxFQUE4QkEsS0FBOUI7O0FBRUEsVUFBSUEsS0FBSyxDQUFDSSxZQUFOLElBQXNCSixLQUFLLENBQUNJLFlBQU4sQ0FBbUJGLFFBQTdDLEVBQXVEO0FBQ25EL0QsUUFBQUEsU0FBUyxDQUFDOEQsU0FBVixDQUFvQkQsS0FBSyxDQUFDSSxZQUFOLENBQW1CRixRQUF2QztBQUNILE9BRkQsTUFFTztBQUNIL0QsUUFBQUEsU0FBUyxDQUFDOEQsU0FBVixDQUFvQjtBQUFFRCxVQUFBQSxLQUFLLEVBQUUsQ0FBQ2hELGVBQWUsQ0FBQ21ELHVCQUFqQjtBQUFULFNBQXBCO0FBQ0g7QUFDSixLQXZDRCxTQXVDVTtBQUNOaEUsTUFBQUEsU0FBUyxDQUFDRyxhQUFWLENBQXdCK0QsV0FBeEIsQ0FBb0Msa0JBQXBDO0FBQ0g7QUFDSixHQWxMYTs7QUFvTGQ7QUFDSjtBQUNBO0FBQ0E7QUFDVU4sRUFBQUEsc0JBeExRLDBDQXdMaUI7QUFDM0IsUUFBSTtBQUNBO0FBQ0E7QUFDQTtBQUNBVCxNQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSw2REFBWjtBQUNBLFlBQU0sSUFBSWUsT0FBSixDQUFZLFVBQUFDLE9BQU87QUFBQSxlQUFJQyxVQUFVLENBQUNELE9BQUQsRUFBVSxHQUFWLENBQWQ7QUFBQSxPQUFuQixDQUFOO0FBRUFqQixNQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxpREFBWjtBQUNBLFVBQU1WLFFBQVEsR0FBRyxNQUFNeEMsQ0FBQyxDQUFDeUMsSUFBRixDQUFPO0FBQzFCQyxRQUFBQSxHQUFHLEVBQUUsOEJBRHFCO0FBRTFCQyxRQUFBQSxNQUFNLEVBQUUsTUFGa0I7QUFHMUJDLFFBQUFBLFFBQVEsRUFBRTtBQUhnQixPQUFQLENBQXZCO0FBTUFLLE1BQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLDJCQUFaLEVBQXlDVixRQUF6Qzs7QUFFQSxVQUFJQSxRQUFRLENBQUNXLE1BQVQsSUFBbUJYLFFBQVEsQ0FBQ0ssSUFBNUIsSUFBb0NMLFFBQVEsQ0FBQ0ssSUFBVCxDQUFjUyxXQUF0RCxFQUFtRTtBQUMvREwsUUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksZ0RBQVo7QUFDQUQsUUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVkscURBQVosRUFGK0QsQ0FJL0Q7O0FBQ0FrQixRQUFBQSxZQUFZLENBQUNDLGNBQWIsQ0FDSTdCLFFBQVEsQ0FBQ0ssSUFBVCxDQUFjUyxXQURsQixFQUVJZCxRQUFRLENBQUNLLElBQVQsQ0FBY1ksU0FGbEIsRUFMK0QsQ0FVL0Q7O0FBQ0FwQyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJnRCxhQUFyQjtBQUNILE9BWkQsTUFZTztBQUNIckIsUUFBQUEsT0FBTyxDQUFDVSxLQUFSLENBQWMsNkNBQWQ7QUFDQTdELFFBQUFBLFNBQVMsQ0FBQzhELFNBQVYsQ0FBb0I7QUFBRUQsVUFBQUEsS0FBSyxFQUFFLENBQUNoRCxlQUFlLENBQUM0RCxzQkFBaEIsSUFBMEMscUJBQTNDO0FBQVQsU0FBcEI7QUFDSDtBQUNKLEtBaENELENBZ0NFLE9BQU9aLEtBQVAsRUFBYztBQUNaVixNQUFBQSxPQUFPLENBQUNVLEtBQVIsQ0FBYyw4QkFBZCxFQUE4Q0EsS0FBOUM7QUFDQTdELE1BQUFBLFNBQVMsQ0FBQzhELFNBQVYsQ0FBb0I7QUFBRUQsUUFBQUEsS0FBSyxFQUFFLENBQUNoRCxlQUFlLENBQUM0RCxzQkFBaEIsSUFBMEMscUJBQTNDO0FBQVQsT0FBcEI7QUFDSDtBQUNKLEdBN05hOztBQStOZDtBQUNKO0FBQ0E7QUFDQTtBQUNVbEMsRUFBQUEsdUJBbk9RLDJDQW1Pa0I7QUFDNUI7QUFDQXZDLElBQUFBLFNBQVMsQ0FBQ0csYUFBVixDQUF3QnNDLFFBQXhCLENBQWlDLGtCQUFqQztBQUNBekMsSUFBQUEsU0FBUyxDQUFDTSxjQUFWLENBQXlCbUMsUUFBekIsQ0FBa0Msa0JBQWxDO0FBQ0F2QyxJQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1Cc0MsTUFBbkI7O0FBRUEsUUFBSTtBQUNBO0FBQ0EsVUFBTWtDLE1BQU0sR0FBR25ELE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQmtELE1BQS9CLENBRkEsQ0FJQTs7QUFDQSxVQUFNQyxhQUFhLEdBQUcsTUFBTXpFLENBQUMsQ0FBQ3lDLElBQUYsQ0FBTztBQUMvQkMsUUFBQUEsR0FBRyxFQUFFLDhDQUQwQjtBQUUvQkMsUUFBQUEsTUFBTSxFQUFFLEtBRnVCO0FBRy9CRSxRQUFBQSxJQUFJLEVBQUU7QUFBRTJCLFVBQUFBLE1BQU0sRUFBTkE7QUFBRixTQUh5QixDQUdiOztBQUhhLE9BQVAsQ0FBNUI7O0FBTUEsVUFBSSxDQUFDQyxhQUFhLENBQUN0QixNQUFmLElBQXlCLENBQUNzQixhQUFhLENBQUM1QixJQUE1QyxFQUFrRDtBQUM5Qy9DLFFBQUFBLFNBQVMsQ0FBQ0csYUFBVixDQUF3QitELFdBQXhCLENBQW9DLGtCQUFwQztBQUNBbEUsUUFBQUEsU0FBUyxDQUFDTSxjQUFWLENBQXlCNEQsV0FBekIsQ0FBcUMsa0JBQXJDO0FBQ0FsRSxRQUFBQSxTQUFTLENBQUM4RCxTQUFWLENBQW9CYSxhQUFhLENBQUNaLFFBQWQsSUFBMEIsQ0FBQ2xELGVBQWUsQ0FBQytELGFBQWpCLENBQTlDO0FBQ0E7QUFDSCxPQWhCRCxDQWtCQTs7O0FBQ0EsVUFBTUMsZ0JBQWdCLEdBQUc3RSxTQUFTLENBQUM4RSwrQkFBVixDQUEwQ0gsYUFBYSxDQUFDNUIsSUFBeEQsQ0FBekI7QUFDQSxVQUFNZ0MsU0FBUyxHQUFHLE1BQU1DLFNBQVMsQ0FBQ0MsV0FBVixDQUFzQkMsR0FBdEIsQ0FBMEI7QUFBRUMsUUFBQUEsU0FBUyxFQUFFTjtBQUFiLE9BQTFCLENBQXhCLENBcEJBLENBc0JBOztBQUNBLFVBQU1PLGFBQWEsR0FBR3BGLFNBQVMsQ0FBQ3FGLG9CQUFWLENBQStCTixTQUEvQixFQUEwQ0osYUFBYSxDQUFDNUIsSUFBeEQsQ0FBdEI7QUFDQSxVQUFNdUMsY0FBYyxHQUFHLE1BQU1wRixDQUFDLENBQUN5QyxJQUFGLENBQU87QUFDaENDLFFBQUFBLEdBQUcsRUFBRSwrQ0FEMkI7QUFFaENDLFFBQUFBLE1BQU0sRUFBRSxNQUZ3QjtBQUdoQzBDLFFBQUFBLFdBQVcsRUFBRSxrQkFIbUI7QUFJaEN4QyxRQUFBQSxJQUFJLEVBQUV5QyxJQUFJLENBQUNDLFNBQUwsQ0FBZUwsYUFBZjtBQUowQixPQUFQLENBQTdCO0FBT0FwRixNQUFBQSxTQUFTLENBQUNHLGFBQVYsQ0FBd0IrRCxXQUF4QixDQUFvQyxrQkFBcEM7QUFDQWxFLE1BQUFBLFNBQVMsQ0FBQ00sY0FBVixDQUF5QjRELFdBQXpCLENBQXFDLGtCQUFyQzs7QUFFQSxVQUFJb0IsY0FBYyxDQUFDakMsTUFBbkIsRUFBMkI7QUFDdkI7QUFDQSxjQUFNckQsU0FBUyxDQUFDMEYsd0JBQVYsQ0FBbUNKLGNBQWMsQ0FBQ3ZDLElBQWxELENBQU47QUFDSCxPQUhELE1BR087QUFDSC9DLFFBQUFBLFNBQVMsQ0FBQzhELFNBQVYsQ0FBb0J3QixjQUFjLENBQUN2QixRQUFmLElBQTJCLENBQUNsRCxlQUFlLENBQUMrRCxhQUFqQixDQUEvQztBQUNIO0FBQ0osS0F4Q0QsQ0F3Q0UsT0FBT2YsS0FBUCxFQUFjO0FBQ1o3RCxNQUFBQSxTQUFTLENBQUNHLGFBQVYsQ0FBd0IrRCxXQUF4QixDQUFvQyxrQkFBcEM7QUFDQWxFLE1BQUFBLFNBQVMsQ0FBQ00sY0FBVixDQUF5QjRELFdBQXpCLENBQXFDLGtCQUFyQztBQUNBZixNQUFBQSxPQUFPLENBQUNVLEtBQVIsQ0FBYywrQkFBZCxFQUErQ0EsS0FBL0MsRUFIWSxDQUtaOztBQUNBLFVBQUlBLEtBQUssQ0FBQzhCLElBQU4sS0FBZSxpQkFBbkIsRUFBc0M7QUFDbEM7QUFDQTtBQUNILE9BVFcsQ0FXWjs7O0FBQ0EzRixNQUFBQSxTQUFTLENBQUM4RCxTQUFWLENBQW9CLFdBQUlqRCxlQUFlLENBQUMrRCxhQUFwQixlQUFzQ2YsS0FBSyxDQUFDK0IsT0FBNUMsRUFBcEI7QUFDSDtBQUNKLEdBL1JhOztBQWlTZDtBQUNKO0FBQ0E7QUFDQTtBQUNVRixFQUFBQSx3QkFyU1EsMENBcVNpQkcsUUFyU2pCLEVBcVMyQjtBQUNyQyxRQUFJO0FBQ0E7QUFDQSxVQUFNNUMsVUFBVSxHQUFHL0MsQ0FBQyxDQUFDLHFCQUFELENBQUQsQ0FBeUJnRCxFQUF6QixDQUE0QixVQUE1QixDQUFuQixDQUZBLENBSUE7O0FBQ0EsVUFBTVIsUUFBUSxHQUFHLE1BQU14QyxDQUFDLENBQUN5QyxJQUFGLENBQU87QUFDMUJDLFFBQUFBLEdBQUcsRUFBRSw0QkFEcUI7QUFFMUJDLFFBQUFBLE1BQU0sRUFBRSxNQUZrQjtBQUcxQkMsUUFBQUEsUUFBUSxFQUFFLE1BSGdCO0FBSTFCQyxRQUFBQSxJQUFJLEVBQUU7QUFDRitDLFVBQUFBLFlBQVksRUFBRUQsUUFBUSxDQUFDQyxZQURyQjtBQUVGN0MsVUFBQUEsVUFBVSxFQUFFQTtBQUZWO0FBSm9CLE9BQVAsQ0FBdkI7O0FBVUEsVUFBSVAsUUFBUSxDQUFDVyxNQUFULElBQW1CWCxRQUFRLENBQUNLLElBQTVCLElBQW9DTCxRQUFRLENBQUNLLElBQVQsQ0FBY1MsV0FBdEQsRUFBbUU7QUFDL0RMLFFBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLHVEQUFaLEVBRCtELENBRS9EOztBQUNBcEQsUUFBQUEsU0FBUyxDQUFDNEQsc0JBQVY7QUFDSCxPQUpELE1BSU87QUFDSDVELFFBQUFBLFNBQVMsQ0FBQzhELFNBQVYsQ0FBb0JwQixRQUFRLENBQUNxQixRQUFULElBQXFCLENBQUNsRCxlQUFlLENBQUMrRCxhQUFqQixDQUF6QztBQUNIO0FBQ0osS0F0QkQsQ0FzQkUsT0FBT2YsS0FBUCxFQUFjO0FBQ1pWLE1BQUFBLE9BQU8sQ0FBQ1UsS0FBUixDQUFjLHNCQUFkLEVBQXNDQSxLQUF0QztBQUNBN0QsTUFBQUEsU0FBUyxDQUFDOEQsU0FBVixDQUFvQixDQUFDakQsZUFBZSxDQUFDK0QsYUFBakIsQ0FBcEI7QUFDSDtBQUNKLEdBaFVhOztBQWtVZDtBQUNKO0FBQ0E7QUFDSUUsRUFBQUEsK0JBclVjLDJDQXFVa0JpQixVQXJVbEIsRUFxVThCO0FBQ3hDLFdBQU87QUFDSEMsTUFBQUEsU0FBUyxFQUFFaEcsU0FBUyxDQUFDaUcsc0JBQVYsQ0FBaUNGLFVBQVUsQ0FBQ0MsU0FBNUMsQ0FEUjtBQUVIRSxNQUFBQSxPQUFPLEVBQUVILFVBQVUsQ0FBQ0csT0FBWCxJQUFzQixLQUY1QjtBQUdIQyxNQUFBQSxJQUFJLEVBQUVKLFVBQVUsQ0FBQ0ksSUFIZDtBQUlIQyxNQUFBQSxnQkFBZ0IsRUFBRUwsVUFBVSxDQUFDSyxnQkFBWCxDQUE0QkMsR0FBNUIsQ0FBZ0MsVUFBQUMsSUFBSTtBQUFBLGVBQUs7QUFDdkQzRixVQUFBQSxJQUFJLEVBQUUsWUFEaUQ7QUFFdkQ0RixVQUFBQSxFQUFFLEVBQUV2RyxTQUFTLENBQUNpRyxzQkFBVixDQUFpQ0ssSUFBSSxDQUFDQyxFQUF0QztBQUZtRCxTQUFMO0FBQUEsT0FBcEMsQ0FKZjtBQVFIQyxNQUFBQSxnQkFBZ0IsRUFBRVQsVUFBVSxDQUFDUyxnQkFBWCxJQUErQjtBQVI5QyxLQUFQO0FBVUgsR0FoVmE7O0FBa1ZkO0FBQ0o7QUFDQTtBQUNJbkIsRUFBQUEsb0JBclZjLGdDQXFWT04sU0FyVlAsRUFxVmtCZ0IsVUFyVmxCLEVBcVY4QjtBQUN4QyxRQUFNckQsUUFBUSxHQUFHcUMsU0FBUyxDQUFDckMsUUFBM0I7QUFFQSxXQUFPO0FBQ0grRCxNQUFBQSxTQUFTLEVBQUVWLFVBQVUsQ0FBQ1UsU0FEbkI7QUFFSEMsTUFBQUEsWUFBWSxFQUFFMUcsU0FBUyxDQUFDMkcsc0JBQVYsQ0FBaUM1QixTQUFTLENBQUM2QixLQUEzQyxDQUZYO0FBR0hDLE1BQUFBLGlCQUFpQixFQUFFN0csU0FBUyxDQUFDMkcsc0JBQVYsQ0FBaUNqRSxRQUFRLENBQUNtRSxpQkFBMUMsQ0FIaEI7QUFJSEMsTUFBQUEsY0FBYyxFQUFFOUcsU0FBUyxDQUFDMkcsc0JBQVYsQ0FBaUNqRSxRQUFRLENBQUNvRSxjQUExQyxDQUpiO0FBS0hDLE1BQUFBLFNBQVMsRUFBRS9HLFNBQVMsQ0FBQzJHLHNCQUFWLENBQWlDakUsUUFBUSxDQUFDcUUsU0FBMUMsQ0FMUjtBQU1IQyxNQUFBQSxVQUFVLEVBQUV0RSxRQUFRLENBQUNzRSxVQUFULEdBQXNCaEgsU0FBUyxDQUFDMkcsc0JBQVYsQ0FBaUNqRSxRQUFRLENBQUNzRSxVQUExQyxDQUF0QixHQUE4RTtBQU52RixLQUFQO0FBUUgsR0FoV2E7O0FBa1dkO0FBQ0o7QUFDQTtBQUNJZixFQUFBQSxzQkFyV2Msa0NBcVdTZ0IsU0FyV1QsRUFxV29CO0FBQzlCLFFBQU1DLE9BQU8sR0FBRyxJQUFJQyxNQUFKLENBQVcsQ0FBQyxJQUFLRixTQUFTLENBQUN2RCxNQUFWLEdBQW1CLENBQXpCLElBQStCLENBQTFDLENBQWhCO0FBQ0EsUUFBTTBELE1BQU0sR0FBR0gsU0FBUyxDQUFDSSxPQUFWLENBQWtCLElBQWxCLEVBQXdCLEdBQXhCLEVBQTZCQSxPQUE3QixDQUFxQyxJQUFyQyxFQUEyQyxHQUEzQyxJQUFrREgsT0FBakU7QUFDQSxRQUFNSSxPQUFPLEdBQUcvRixNQUFNLENBQUNnRyxJQUFQLENBQVlILE1BQVosQ0FBaEI7QUFDQSxRQUFNSSxXQUFXLEdBQUcsSUFBSUMsVUFBSixDQUFlSCxPQUFPLENBQUM1RCxNQUF2QixDQUFwQjs7QUFDQSxTQUFLLElBQUlnRSxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHSixPQUFPLENBQUM1RCxNQUE1QixFQUFvQyxFQUFFZ0UsQ0FBdEMsRUFBeUM7QUFDckNGLE1BQUFBLFdBQVcsQ0FBQ0UsQ0FBRCxDQUFYLEdBQWlCSixPQUFPLENBQUNLLFVBQVIsQ0FBbUJELENBQW5CLENBQWpCO0FBQ0g7O0FBQ0QsV0FBT0YsV0FBVyxDQUFDSSxNQUFuQjtBQUNILEdBOVdhOztBQWdYZDtBQUNKO0FBQ0E7QUFDSWpCLEVBQUFBLHNCQW5YYyxrQ0FtWFNpQixNQW5YVCxFQW1YaUI7QUFDM0IsUUFBTUMsS0FBSyxHQUFHLElBQUlKLFVBQUosQ0FBZUcsTUFBZixDQUFkO0FBQ0EsUUFBSUUsTUFBTSxHQUFHLEVBQWI7O0FBQ0EsU0FBSyxJQUFJSixDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHRyxLQUFLLENBQUNFLFVBQTFCLEVBQXNDTCxDQUFDLEVBQXZDLEVBQTJDO0FBQ3ZDSSxNQUFBQSxNQUFNLElBQUlFLE1BQU0sQ0FBQ0MsWUFBUCxDQUFvQkosS0FBSyxDQUFDSCxDQUFELENBQXpCLENBQVY7QUFDSDs7QUFDRCxRQUFNTixNQUFNLEdBQUc3RixNQUFNLENBQUMyRyxJQUFQLENBQVlKLE1BQVosQ0FBZjtBQUNBLFdBQU9WLE1BQU0sQ0FBQ0MsT0FBUCxDQUFlLEtBQWYsRUFBc0IsR0FBdEIsRUFBMkJBLE9BQTNCLENBQW1DLEtBQW5DLEVBQTBDLEdBQTFDLEVBQStDQSxPQUEvQyxDQUF1RCxJQUF2RCxFQUE2RCxFQUE3RCxDQUFQO0FBQ0gsR0EzWGE7O0FBNlhkO0FBQ0o7QUFDQTtBQUNJdkQsRUFBQUEsU0FoWWMscUJBZ1lKQyxRQWhZSSxFQWdZTTtBQUNoQixRQUFNb0UsU0FBUyxHQUFHQyxLQUFLLENBQUNDLE9BQU4sQ0FBY3RFLFFBQWQsSUFDWkEsUUFBUSxDQUFDdUUsSUFBVCxDQUFjLE1BQWQsQ0FEWSxHQUVYdkUsUUFBUSxDQUFDRixLQUFULEdBQWlCRSxRQUFRLENBQUNGLEtBQVQsQ0FBZXlFLElBQWYsQ0FBb0IsTUFBcEIsQ0FBakIsR0FBK0MsZUFGdEQ7QUFJQXRJLElBQUFBLFNBQVMsQ0FBQ0MsUUFBVixDQUFtQnNJLE1BQW5CLGdEQUFnRUosU0FBaEU7QUFDSCxHQXRZYTs7QUF3WWQ7QUFDSjtBQUNBO0FBQ0kvRyxFQUFBQSx3QkEzWWMsc0NBMllhO0FBQ3ZCcEIsSUFBQUEsU0FBUyxDQUFDQyxRQUFWLENBQW1Ca0MsSUFBbkIsQ0FBd0I7QUFDcEJxRyxNQUFBQSxNQUFNLEVBQUV4SSxTQUFTLENBQUNPLGFBREU7QUFFcEJrSSxNQUFBQSxTQUZvQixxQkFFVkMsS0FGVSxFQUVIO0FBQ2I7QUFDQSxZQUFJQSxLQUFLLElBQUlBLEtBQUssQ0FBQ3hHLGNBQW5CLEVBQW1DO0FBQy9Cd0csVUFBQUEsS0FBSyxDQUFDeEcsY0FBTjtBQUNIO0FBQ0o7QUFQbUIsS0FBeEI7QUFTSDtBQXJaYSxDQUFsQixDLENBd1pBOztBQUNBaEMsQ0FBQyxDQUFDeUksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjVJLEVBQUFBLFNBQVMsQ0FBQ2lCLFVBQVY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLEZvcm0sQ29uZmlnICovXG5cbmNvbnN0IGxvZ2luRm9ybSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbG9naW4tZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwYXNzd29yZCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYXNzd29yZEZpZWxkOiAkKCcjcGFzc3dvcmQnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgY2hlY2tib3hlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGVja0JveGVzOiAkKCcuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIFBhc3NrZXkgbG9naW4gYnV0dG9uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcGFzc2tleUJ1dHRvbjogJCgnI3Bhc3NrZXktbG9naW4tYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbG9naW46IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdsb2dpbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYXV0aF9WYWxpZGF0ZUxvZ2luTm90RW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmF1dGhfVmFsaWRhdGVQYXNzd29yZE5vdEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbG9naW4gZm9ybSBmdW5jdGlvbmFsaXR5LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGxvZ2luRm9ybS5jaGVja1Bhc3NrZXlTdXBwb3J0KCk7XG4gICAgICAgIGxvZ2luRm9ybS5iaW5kRXZlbnRzKCk7XG4gICAgICAgIGxvZ2luRm9ybS5pbml0aWFsaXplRm9ybVZhbGlkYXRpb24oKTtcbiAgICAgICAgbG9naW5Gb3JtLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydHMgV2ViQXV0aG4gYW5kIGNvbm5lY3Rpb24gaXMgc2VjdXJlXG4gICAgICogV2ViQXV0aG4gcmVxdWlyZXMgSFRUUFMgb3IgbG9jYWxob3N0XG4gICAgICogSGlkZSBwYXNza2V5IGJ1dHRvbiBhbmQgT1IgZGl2aWRlciBpZiBub3Qgc3VwcG9ydGVkXG4gICAgICovXG4gICAgY2hlY2tQYXNza2V5U3VwcG9ydCgpIHtcbiAgICAgICAgY29uc3QgaXNMb2NhbGhvc3QgPSB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgPT09ICdsb2NhbGhvc3QnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgPT09ICcxMjcuMC4wLjEnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgPT09ICdbOjoxXSc7XG4gICAgICAgIGNvbnN0IGlzU2VjdXJlID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSAnaHR0cHM6JztcbiAgICAgICAgY29uc3QgaGFzV2ViQXV0aG4gPSB3aW5kb3cuUHVibGljS2V5Q3JlZGVudGlhbCAhPT0gdW5kZWZpbmVkO1xuXG4gICAgICAgIC8vIFNob3cgcGFzc2tleSBidXR0b24gb25seSBpZjpcbiAgICAgICAgLy8gMS4gQnJvd3NlciBzdXBwb3J0cyBXZWJBdXRobiBBTkRcbiAgICAgICAgLy8gMi4gQ29ubmVjdGlvbiBpcyBIVFRQUyBPUiBsb2NhbGhvc3RcbiAgICAgICAgaWYgKCFoYXNXZWJBdXRobiB8fCAoIWlzU2VjdXJlICYmICFpc0xvY2FsaG9zdCkpIHtcbiAgICAgICAgICAgIGxvZ2luRm9ybS4kcGFzc2tleUJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICAvLyBBbHNvIGhpZGUgdGhlIE9SIGRpdmlkZXJcbiAgICAgICAgICAgICQoJy51aS5ob3Jpem9udGFsLmRpdmlkZXInKS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQmluZCBmb3JtIGV2ZW50c1xuICAgICAqL1xuICAgIGJpbmRFdmVudHMoKSB7XG4gICAgICAgIC8vIFByZXZlbnQgZGVmYXVsdCBmb3JtIHN1Ym1pc3Npb24gLSB3ZSB1c2UgQUpBWCBvbmx5XG4gICAgICAgIGxvZ2luRm9ybS4kZm9ybU9iai5vbignc3VibWl0JywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHN1Ym1pdCBidXR0b24gY2xpY2sgLSBwYXNzd29yZCBhdXRoZW50aWNhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgICAgbG9naW5Gb3JtLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGxvZ2luRm9ybS4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG4gICAgICAgICAgICBpZiAobG9naW5Gb3JtLiRmb3JtT2JqLmZvcm0oJ2lzIHZhbGlkJykpIHtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uc3VibWl0TG9naW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGVudGVyIGtleSBvbiBwYXNzd29yZCBmaWVsZFxuICAgICAgICBsb2dpbkZvcm0uJHBhc3N3b3JkRmllbGQub24oJ2tleXByZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLndoaWNoID09PSAxMykge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uJHN1Ym1pdEJ1dHRvbi5jbGljaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgcGFzc2tleSBidXR0b24gY2xpY2sgLSB1c2VybmFtZWxlc3MgYXV0aGVudGljYXRpb25cbiAgICAgICAgbG9naW5Gb3JtLiRwYXNza2V5QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBsb2dpbkZvcm0uYXV0aGVudGljYXRlV2l0aFBhc3NrZXkoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2xlYXIgZXJyb3IgbWVzc2FnZXMgb24gaW5wdXRcbiAgICAgICAgJCgnaW5wdXQnKS5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdWJtaXQgbG9naW4gdmlhIFJFU1QgQVBJIC9wYnhjb3JlL2FwaS92My9hdXRoOmxvZ2luXG4gICAgICog0J/QvtC70YPRh9Cw0LXRgiBKV1QgYWNjZXNzIHRva2VuINC4IHJlZnJlc2ggdG9rZW4gY29va2llXG4gICAgICovXG4gICAgYXN5bmMgc3VibWl0TG9naW4oKSB7XG4gICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9hdXRoOmxvZ2luJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbG9naW46ICQoJyNsb2dpbicpLnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICBwYXNzd29yZDogJCgnI3Bhc3N3b3JkJykudmFsKCksXG4gICAgICAgICAgICAgICAgICAgIHJlbWVtYmVyTWU6ICQoJyNyZW1lbWJlck1lQ2hlY2tCb3gnKS5pcygnOmNoZWNrZWQnKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW0xPR0lOXSBBUEkgUmVzcG9uc2U6Jywge1xuICAgICAgICAgICAgICAgIHJlc3VsdDogcmVzcG9uc2UucmVzdWx0LFxuICAgICAgICAgICAgICAgIGhhc0RhdGE6ICEhcmVzcG9uc2UuZGF0YSxcbiAgICAgICAgICAgICAgICBoYXNBY2Nlc3NUb2tlbjogISEocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKSxcbiAgICAgICAgICAgICAgICB0b2tlbkxlbmd0aDogcmVzcG9uc2UuZGF0YT8uYWNjZXNzVG9rZW4/Lmxlbmd0aCxcbiAgICAgICAgICAgICAgICBleHBpcmVzSW46IHJlc3BvbnNlLmRhdGE/LmV4cGlyZXNJblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tMT0dJTl0gTG9naW4gc3VjY2Vzc2Z1bCwgYWNjZXNzIHRva2VuIHJlY2VpdmVkJyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tMT0dJTl0gUmVmcmVzaCBjb29raWUgc2hvdWxkIGJlIHNldCwgdGVzdGluZyB3aXRoIGltbWVkaWF0ZSByZWZyZXNoLi4uJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBUZXN0IHJlZnJlc2ggdG9rZW4gY29va2llIGJ5IGNhbGxpbmcgL2F1dGg6cmVmcmVzaCBpbW1lZGlhdGVseVxuICAgICAgICAgICAgICAgIC8vIFRoaXMgdmVyaWZpZXMgdGhlIGNvb2tpZSBpcyB3b3JraW5nIGJlZm9yZSByZWRpcmVjdGluZ1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS50ZXN0UmVmcmVzaEFuZFJlZGlyZWN0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMT0dJTl0gSW52YWxpZCByZXNwb25zZTonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcyB8fCB7IGVycm9yOiBbZ2xvYmFsVHJhbnNsYXRlLmF1dGhfV3JvbmdMb2dpblBhc3N3b3JkXSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0xvZ2luIGVycm9yOicsIGVycm9yKTtcblxuICAgICAgICAgICAgaWYgKGVycm9yLnJlc3BvbnNlSlNPTiAmJiBlcnJvci5yZXNwb25zZUpTT04ubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uc2hvd0Vycm9yKGVycm9yLnJlc3BvbnNlSlNPTi5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoeyBlcnJvcjogW2dsb2JhbFRyYW5zbGF0ZS5hdXRoX1dyb25nTG9naW5QYXNzd29yZF0gfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBsb2dpbkZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRlc3QgcmVmcmVzaCB0b2tlbiBjb29raWUgYW5kIHJlZGlyZWN0IGlmIHN1Y2Nlc3NmdWxcbiAgICAgKiBDYWxsZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgbG9naW4gdG8gdmVyaWZ5IGNvb2tpZSBpcyBzZXQgY29ycmVjdGx5XG4gICAgICovXG4gICAgYXN5bmMgdGVzdFJlZnJlc2hBbmRSZWRpcmVjdCgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdhaXQgMTAwbXMgZm9yIGJyb3dzZXIgdG8gcHJvY2VzcyBTZXQtQ29va2llIGhlYWRlclxuICAgICAgICAgICAgLy8gVGhlIGNvb2tpZSBpcyBzZXQgaW4gdGhlIHJlc3BvbnNlLCBidXQgYnJvd3NlcnMgbmVlZCB0aW1lIHRvIHN0b3JlIGl0XG4gICAgICAgICAgICAvLyBiZWZvcmUgaXQncyBhdmFpbGFibGUgZm9yIHRoZSBuZXh0IHJlcXVlc3RcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTE9HSU5dIFdhaXRpbmcgZm9yIGJyb3dzZXIgdG8gcHJvY2VzcyBTZXQtQ29va2llIGhlYWRlci4uLicpO1xuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW0xPR0lOXSBDYWxsaW5nIC9hdXRoOnJlZnJlc2ggdG8gdGVzdCBjb29raWUuLi4nKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvYXV0aDpyZWZyZXNoJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTE9HSU5dIFJlZnJlc2ggcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTE9HSU5dIFJlZnJlc2ggc3VjY2Vzc2Z1bCEgQ29va2llIGlzIHdvcmtpbmcuJyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tMT0dJTl0gU3RvcmluZyBuZXcgYWNjZXNzIHRva2VuIGFuZCByZWRpcmVjdGluZy4uLicpO1xuXG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgdGhlIE5FVyBhY2Nlc3MgdG9rZW4gZnJvbSByZWZyZXNoXG4gICAgICAgICAgICAgICAgVG9rZW5NYW5hZ2VyLnNldEFjY2Vzc1Rva2VuKFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmFjY2Vzc1Rva2VuLFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmV4cGlyZXNJblxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAvLyBOb3cgcmVkaXJlY3QgLSB3ZSBrbm93IHRoZSBjb29raWUgd29ya3NcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvaW5kZXhgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTE9HSU5dIFJlZnJlc2ggZmFpbGVkIC0gY29va2llIG5vdCB3b3JraW5nJyk7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcih7IGVycm9yOiBbZ2xvYmFsVHJhbnNsYXRlLmF1dGhfUmVmcmVzaFRva2VuRXJyb3IgfHwgJ1JlZnJlc2ggdG9rZW4gZXJyb3InXSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMT0dJTl0gUmVmcmVzaCB0ZXN0IGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICBsb2dpbkZvcm0uc2hvd0Vycm9yKHsgZXJyb3I6IFtnbG9iYWxUcmFuc2xhdGUuYXV0aF9SZWZyZXNoVG9rZW5FcnJvciB8fCAnUmVmcmVzaCB0b2tlbiBlcnJvciddIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF1dGhlbnRpY2F0ZSB1c2VyIHdpdGggUGFzc2tleSAodXNlcm5hbWVsZXNzIGZsb3cpXG4gICAgICogQnJvd3NlciB3aWxsIHNob3cgYWxsIGF2YWlsYWJsZSBwYXNza2V5cyBmb3IgdGhpcyBkb21haW5cbiAgICAgKi9cbiAgICBhc3luYyBhdXRoZW50aWNhdGVXaXRoUGFzc2tleSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGxvZ2luRm9ybS4kcGFzc2tleUJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEdldCBvcmlnaW4gZm9yIFdlYkF1dGhuXG4gICAgICAgICAgICBjb25zdCBvcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuXG4gICAgICAgICAgICAvLyBTdGVwIDE6IEdldCBjaGFsbGVuZ2UgZnJvbSBSRVNUIEFQSSAod2l0aG91dCBsb2dpbiAtIHVzZXJuYW1lbGVzcylcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0UmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9wYXNza2V5czphdXRoZW50aWNhdGlvblN0YXJ0JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgb3JpZ2luIH0sIC8vIE5vIGxvZ2luIHBhcmFtZXRlciAtIHVzZXJuYW1lbGVzcyBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghc3RhcnRSZXNwb25zZS5yZXN1bHQgfHwgIXN0YXJ0UmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGxvZ2luRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLiRwYXNza2V5QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcihzdGFydFJlc3BvbnNlLm1lc3NhZ2VzIHx8IFtnbG9iYWxUcmFuc2xhdGUucGtfTG9naW5FcnJvcl0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RlcCAyOiBDYWxsIFdlYkF1dGhuIEFQSSAtIGJyb3dzZXIgd2lsbCBzaG93IGFsbCBhdmFpbGFibGUgcGFzc2tleXNcbiAgICAgICAgICAgIGNvbnN0IHB1YmxpY0tleU9wdGlvbnMgPSBsb2dpbkZvcm0ucHJlcGFyZUNyZWRlbnRpYWxSZXF1ZXN0T3B0aW9ucyhzdGFydFJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgY29uc3QgYXNzZXJ0aW9uID0gYXdhaXQgbmF2aWdhdG9yLmNyZWRlbnRpYWxzLmdldCh7IHB1YmxpY0tleTogcHVibGljS2V5T3B0aW9ucyB9KTtcblxuICAgICAgICAgICAgLy8gU3RlcCAzOiBTZW5kIGFzc2VydGlvbiB0byBSRVNUIEFQSSBmb3IgdmVyaWZpY2F0aW9uXG4gICAgICAgICAgICBjb25zdCBhc3NlcnRpb25EYXRhID0gbG9naW5Gb3JtLnByZXBhcmVBc3NlcnRpb25EYXRhKGFzc2VydGlvbiwgc3RhcnRSZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbmlzaFJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvcGJ4Y29yZS9hcGkvdjMvcGFzc2tleXM6YXV0aGVudGljYXRpb25GaW5pc2gnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoYXNzZXJ0aW9uRGF0YSksXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbG9naW5Gb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGxvZ2luRm9ybS4kcGFzc2tleUJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAoZmluaXNoUmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gU3RhcnQgc2Vzc2lvbiB2aWEgU2Vzc2lvbkNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICBhd2FpdCBsb2dpbkZvcm0uY3JlYXRlU2Vzc2lvbkZyb21QYXNza2V5KGZpbmlzaFJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dpbkZvcm0uc2hvd0Vycm9yKGZpbmlzaFJlc3BvbnNlLm1lc3NhZ2VzIHx8IFtnbG9iYWxUcmFuc2xhdGUucGtfTG9naW5FcnJvcl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9naW5Gb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGxvZ2luRm9ybS4kcGFzc2tleUJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUGFzc2tleSBhdXRoZW50aWNhdGlvbiBlcnJvcjonLCBlcnJvcik7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHVzZXIgY2FuY2VsbGVkXG4gICAgICAgICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ05vdEFsbG93ZWRFcnJvcicpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2VyIGNhbmNlbGxlZCAtIGRvbid0IHNob3cgZXJyb3JcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlYWwgZXJyb3IgLSBzaG93IG1lc3NhZ2VcbiAgICAgICAgICAgIGxvZ2luRm9ybS5zaG93RXJyb3IoW2Ake2dsb2JhbFRyYW5zbGF0ZS5wa19Mb2dpbkVycm9yfTogJHtlcnJvci5tZXNzYWdlfWBdKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2dpbiB3aXRoIHBhc3NrZXkgYXV0aGVudGljYXRpb24gdXNpbmcgc2Vzc2lvblRva2VuXG4gICAgICogU2Vzc2lvblRva2VuIGlzIGV4Y2hhbmdlZCBmb3IgSldUIHRva2VucyB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBhc3luYyBjcmVhdGVTZXNzaW9uRnJvbVBhc3NrZXkoYXV0aERhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHJlbWVtYmVyIG1lIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICBjb25zdCByZW1lbWJlck1lID0gJCgnI3JlbWVtYmVyTWVDaGVja0JveCcpLmlzKCc6Y2hlY2tlZCcpO1xuXG4gICAgICAgICAgICAvLyBFeGNoYW5nZSBzZXNzaW9uVG9rZW4gZm9yIEpXVCB0b2tlbnMgdmlhIFJFU1QgQVBJXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL2F1dGg6bG9naW4nLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uVG9rZW46IGF1dGhEYXRhLnNlc3Npb25Ub2tlbixcbiAgICAgICAgICAgICAgICAgICAgcmVtZW1iZXJNZTogcmVtZW1iZXJNZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbUEFTU0tFWV0gTG9naW4gc3VjY2Vzc2Z1bCwgdGVzdGluZyByZWZyZXNoIGNvb2tpZS4uLicpO1xuICAgICAgICAgICAgICAgIC8vIFRlc3QgcmVmcmVzaCB0b2tlbiBjb29raWUgYmVmb3JlIHJlZGlyZWN0XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnRlc3RSZWZyZXNoQW5kUmVkaXJlY3QoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcyB8fCBbZ2xvYmFsVHJhbnNsYXRlLnBrX0xvZ2luRXJyb3JdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Bhc3NrZXkgbG9naW4gZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgbG9naW5Gb3JtLnNob3dFcnJvcihbZ2xvYmFsVHJhbnNsYXRlLnBrX0xvZ2luRXJyb3JdKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGNyZWRlbnRpYWwgcmVxdWVzdCBvcHRpb25zIGZvciBXZWJBdXRobiBBUElcbiAgICAgKi9cbiAgICBwcmVwYXJlQ3JlZGVudGlhbFJlcXVlc3RPcHRpb25zKHNlcnZlckRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoYWxsZW5nZTogbG9naW5Gb3JtLmJhc2U2NHVybFRvQXJyYXlCdWZmZXIoc2VydmVyRGF0YS5jaGFsbGVuZ2UpLFxuICAgICAgICAgICAgdGltZW91dDogc2VydmVyRGF0YS50aW1lb3V0IHx8IDYwMDAwLFxuICAgICAgICAgICAgcnBJZDogc2VydmVyRGF0YS5ycElkLFxuICAgICAgICAgICAgYWxsb3dDcmVkZW50aWFsczogc2VydmVyRGF0YS5hbGxvd0NyZWRlbnRpYWxzLm1hcChjcmVkID0+ICh7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3B1YmxpYy1rZXknLFxuICAgICAgICAgICAgICAgIGlkOiBsb2dpbkZvcm0uYmFzZTY0dXJsVG9BcnJheUJ1ZmZlcihjcmVkLmlkKSxcbiAgICAgICAgICAgIH0pKSxcbiAgICAgICAgICAgIHVzZXJWZXJpZmljYXRpb246IHNlcnZlckRhdGEudXNlclZlcmlmaWNhdGlvbiB8fCAncHJlZmVycmVkJyxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZSBhc3NlcnRpb24gZGF0YSB0byBzZW5kIHRvIHNlcnZlclxuICAgICAqL1xuICAgIHByZXBhcmVBc3NlcnRpb25EYXRhKGFzc2VydGlvbiwgc2VydmVyRGF0YSkge1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGFzc2VydGlvbi5yZXNwb25zZTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2Vzc2lvbklkOiBzZXJ2ZXJEYXRhLnNlc3Npb25JZCxcbiAgICAgICAgICAgIGNyZWRlbnRpYWxJZDogbG9naW5Gb3JtLmFycmF5QnVmZmVyVG9CYXNlNjR1cmwoYXNzZXJ0aW9uLnJhd0lkKSxcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0b3JEYXRhOiBsb2dpbkZvcm0uYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChyZXNwb25zZS5hdXRoZW50aWNhdG9yRGF0YSksXG4gICAgICAgICAgICBjbGllbnREYXRhSlNPTjogbG9naW5Gb3JtLmFycmF5QnVmZmVyVG9CYXNlNjR1cmwocmVzcG9uc2UuY2xpZW50RGF0YUpTT04pLFxuICAgICAgICAgICAgc2lnbmF0dXJlOiBsb2dpbkZvcm0uYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChyZXNwb25zZS5zaWduYXR1cmUpLFxuICAgICAgICAgICAgdXNlckhhbmRsZTogcmVzcG9uc2UudXNlckhhbmRsZSA/IGxvZ2luRm9ybS5hcnJheUJ1ZmZlclRvQmFzZTY0dXJsKHJlc3BvbnNlLnVzZXJIYW5kbGUpIDogbnVsbCxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBiYXNlNjR1cmwgc3RyaW5nIHRvIEFycmF5QnVmZmVyXG4gICAgICovXG4gICAgYmFzZTY0dXJsVG9BcnJheUJ1ZmZlcihiYXNlNjR1cmwpIHtcbiAgICAgICAgY29uc3QgcGFkZGluZyA9ICc9Jy5yZXBlYXQoKDQgLSAoYmFzZTY0dXJsLmxlbmd0aCAlIDQpKSAlIDQpO1xuICAgICAgICBjb25zdCBiYXNlNjQgPSBiYXNlNjR1cmwucmVwbGFjZSgvLS9nLCAnKycpLnJlcGxhY2UoL18vZywgJy8nKSArIHBhZGRpbmc7XG4gICAgICAgIGNvbnN0IHJhd0RhdGEgPSB3aW5kb3cuYXRvYihiYXNlNjQpO1xuICAgICAgICBjb25zdCBvdXRwdXRBcnJheSA9IG5ldyBVaW50OEFycmF5KHJhd0RhdGEubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByYXdEYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBvdXRwdXRBcnJheVtpXSA9IHJhd0RhdGEuY2hhckNvZGVBdChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0cHV0QXJyYXkuYnVmZmVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IEFycmF5QnVmZmVyIHRvIGJhc2U2NHVybCBzdHJpbmdcbiAgICAgKi9cbiAgICBhcnJheUJ1ZmZlclRvQmFzZTY0dXJsKGJ1ZmZlcikge1xuICAgICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gICAgICAgIGxldCBiaW5hcnkgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBieXRlcy5ieXRlTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGJpbmFyeSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBiYXNlNjQgPSB3aW5kb3cuYnRvYShiaW5hcnkpO1xuICAgICAgICByZXR1cm4gYmFzZTY0LnJlcGxhY2UoL1xcKy9nLCAnLScpLnJlcGxhY2UoL1xcLy9nLCAnXycpLnJlcGxhY2UoLz0vZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBzaG93RXJyb3IobWVzc2FnZXMpIHtcbiAgICAgICAgY29uc3QgZXJyb3JIdG1sID0gQXJyYXkuaXNBcnJheShtZXNzYWdlcylcbiAgICAgICAgICAgID8gbWVzc2FnZXMuam9pbignPGJyPicpXG4gICAgICAgICAgICA6IChtZXNzYWdlcy5lcnJvciA/IG1lc3NhZ2VzLmVycm9yLmpvaW4oJzxicj4nKSA6ICdVbmtub3duIGVycm9yJyk7XG5cbiAgICAgICAgbG9naW5Gb3JtLiRmb3JtT2JqLmJlZm9yZShgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7ZXJyb3JIdG1sfTwvZGl2PmApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvbiB1c2luZyBGb21hbnRpYyBVSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtVmFsaWRhdGlvbigpIHtcbiAgICAgICAgbG9naW5Gb3JtLiRmb3JtT2JqLmZvcm0oe1xuICAgICAgICAgICAgZmllbGRzOiBsb2dpbkZvcm0udmFsaWRhdGVSdWxlcyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhldmVudCkge1xuICAgICAgICAgICAgICAgIC8vIFByZXZlbnQgZGVmYXVsdCBmb3JtIHN1Ym1pc3Npb24gaWYgZXZlbnQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50ICYmIGV2ZW50LnByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGxvZ2luIGZvcm0uXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbG9naW5Gb3JtLmluaXRpYWxpemUoKTtcbn0pO1xuIl19