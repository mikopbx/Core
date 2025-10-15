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

/* global globalTranslate, PasskeysAPI, UserMessage, ClipboardJS */

/**
 * GeneralSettingsPasskeys object is responsible for managing Passkeys in General Settings
 *
 * @module GeneralSettingsPasskeys
 */
var GeneralSettingsPasskeys = {
  /**
   * jQuery object for the container
   * @type {jQuery}
   */
  $container: null,

  /**
   * Array of passkeys
   * @type {Array}
   */
  passkeys: [],

  /**
   * Clipboard instance for copy functionality
   * @type {ClipboardJS}
   */
  clipboard: null,

  /**
   * Initialize the Passkeys management module
   */
  initialize: function initialize() {
    this.$container = $('#passkeys-container');

    if (this.$container.length === 0) {
      return;
    } // Check if WebAuthn is supported


    if (!window.PublicKeyCredential) {
      this.renderUnsupportedMessage();
      return;
    }

    this.loadPasskeys();
    this.bindEventHandlers();
  },

  /**
   * Render unsupported browser message
   */
  renderUnsupportedMessage: function renderUnsupportedMessage() {
    var html = "\n            <div class=\"ui warning message\">\n                <i class=\"warning icon\"></i>\n                ".concat(globalTranslate.pk_NotSupported, "\n            </div>\n        ");
    this.$container.html(html);
  },

  /**
   * Load passkeys from server
   */
  loadPasskeys: function loadPasskeys() {
    var _this = this;

    PasskeysAPI.getList(function (response) {
      if (response.result && response.data) {
        _this.passkeys = response.data;
      } else {
        _this.passkeys = [];
      }

      _this.renderTable();
    });
  },

  /**
   * Render the passkeys table
   */
  renderTable: function renderTable() {
    var _this2 = this;

    var $table = $('#passkeys-table tbody');
    var $emptyRow = $('#passkeys-empty-row');

    if (this.passkeys.length === 0) {
      // Show empty placeholder
      $table.find('tr:not(#passkeys-empty-row)').remove();
      $emptyRow.show();
    } else {
      // Hide empty placeholder
      $emptyRow.hide(); // Remove existing passkey rows (keep empty row)

      $table.find('tr:not(#passkeys-empty-row)').remove(); // Add passkey rows

      this.passkeys.forEach(function (passkey) {
        var lastUsed = passkey.last_used_at ? _this2.formatDate(passkey.last_used_at) : globalTranslate.pk_NeverUsed || 'Never used';
        var html = "\n                    <tr data-id=\"".concat(passkey.id, "\">\n                        <td class=\"passkey-cell\">\n                            <div style=\"margin-bottom: 0.3em;\">\n                                <strong>").concat(_this2.escapeHtml(passkey.name), "</strong>\n                            </div>\n                            <div style=\"font-size: 0.85em; color: rgba(0,0,0,.4);\">\n                                ").concat(globalTranslate.pk_ColumnLastUsed, ": ").concat(lastUsed, "\n                            </div>\n                        </td>\n                        <td class=\"right aligned collapsing\">\n                            <a class=\"ui basic icon button two-steps-delete delete-passkey-btn\"\n                               data-id=\"").concat(passkey.id, "\"\n                               data-content=\"").concat(globalTranslate.pk_Delete, "\">\n                                <i class=\"trash icon red\"></i>\n                            </a>\n                        </td>\n                    </tr>\n                ");
        $table.append(html);
      }); // Add button row

      var addButtonRow = "\n                <tr id=\"add-passkey-row\">\n                    <td colspan=\"2\">\n                        <button class=\"ui mini basic button\" id=\"add-passkey-button\">\n                            <i class=\"plus icon\"></i>\n                            ".concat(globalTranslate.pk_AddPasskey, "\n                        </button>\n                    </td>\n                </tr>\n            ");
      $table.append(addButtonRow); // Initialize tooltips

      $table.find('[data-content]').popup();
    }
  },

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  formatDate: function formatDate(dateString) {
    if (!dateString) return '-';
    var date = new Date(dateString);
    return date.toLocaleString();
  },

  /**
   * Bind event handlers
   */
  bindEventHandlers: function bindEventHandlers() {
    // Add passkey button (delegated)
    this.$container.on('click', '#add-passkey-button', function (e) {
      e.preventDefault();
      GeneralSettingsPasskeys.registerNewPasskey();
    }); // Delete button (delegated)
    // Only trigger deletion on second click (when two-steps-delete class is removed)

    this.$container.on('click', '.delete-passkey-btn:not(.two-steps-delete)', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var passkeyId = $(e.currentTarget).data('id');
      GeneralSettingsPasskeys.deletePasskey(passkeyId);
    });
  },

  /**
   * Generate passkey name based on browser and device information
   * @returns {string} Generated passkey name
   */
  generatePasskeyName: function generatePasskeyName() {
    var ua = navigator.userAgent;
    var browser = 'Browser';
    var os = 'Unknown OS';
    var device = ''; // Detect browser

    if (ua.indexOf('Edg') > -1) {
      browser = 'Edge';
    } else if (ua.indexOf('Chrome') > -1) {
      browser = 'Chrome';
    } else if (ua.indexOf('Safari') > -1) {
      browser = 'Safari';
    } else if (ua.indexOf('Firefox') > -1) {
      browser = 'Firefox';
    } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
      browser = 'Opera';
    } // Detect OS


    if (ua.indexOf('Win') > -1) {
      os = 'Windows';
    } else if (ua.indexOf('Mac') > -1) {
      os = 'macOS';
    } else if (ua.indexOf('Linux') > -1) {
      os = 'Linux';
    } else if (ua.indexOf('Android') > -1) {
      os = 'Android';
    } else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
      os = ua.indexOf('iPhone') > -1 ? 'iPhone' : 'iPad';
    } // Detect device type for mobile


    if (ua.indexOf('Mobile') > -1 && os !== 'Android' && os !== 'iPhone' && os !== 'iPad') {
      device = ' Mobile';
    } // Build name


    var timestamp = new Date().toLocaleDateString();
    return "".concat(browser, " on ").concat(os).concat(device, " (").concat(timestamp, ")");
  },

  /**
   * Register new passkey using WebAuthn
   */
  registerNewPasskey: async function registerNewPasskey() {
    // Auto-generate passkey name based on browser/device
    var passkeyName = GeneralSettingsPasskeys.generatePasskeyName();
    var $button = $('#add-passkey-button');
    $button.addClass('loading disabled');

    try {
      // Step 1: Get challenge from server
      PasskeysAPI.registrationStart(passkeyName, async function (response) {
        if (!response.result) {
          $button.removeClass('loading disabled');
          UserMessage.showMultiString(response.messages);
          return;
        }

        try {
          // Step 2: Call WebAuthn API
          var publicKeyOptions = GeneralSettingsPasskeys.prepareCredentialCreationOptions(response.data);
          var credential = await navigator.credentials.create({
            publicKey: publicKeyOptions
          }); // Step 3: Send attestation to server

          var attestationData = GeneralSettingsPasskeys.prepareAttestationData(credential, response.data, passkeyName);
          PasskeysAPI.registrationFinish(attestationData, function (finishResponse) {
            $button.removeClass('loading disabled');

            if (finishResponse.result) {
              GeneralSettingsPasskeys.loadPasskeys();
            } else {
              UserMessage.showMultiString(finishResponse.messages);
            }
          });
        } catch (error) {
          $button.removeClass('loading disabled');
          console.error('WebAuthn registration error:', error); // Handle user cancellation gracefully

          if (error.name === 'NotAllowedError') {
            UserMessage.showError(globalTranslate.pk_RegisterCancelled || 'Registration was cancelled');
          } else {
            UserMessage.showError("".concat(globalTranslate.pk_RegisterError, ": ").concat(error.message));
          }
        }
      });
    } catch (error) {
      $button.removeClass('loading disabled');
      console.error('Registration start error:', error);
      UserMessage.showError("".concat(globalTranslate.pk_RegisterError, ": ").concat(error.message));
    }
  },

  /**
   * Prepare credential creation options for WebAuthn API
   * @param {object} serverData - Data from server
   * @returns {object} PublicKeyCredentialCreationOptions
   */
  prepareCredentialCreationOptions: function prepareCredentialCreationOptions(serverData) {
    return {
      challenge: GeneralSettingsPasskeys.base64urlToArrayBuffer(serverData.challenge),
      rp: serverData.rp,
      user: {
        id: GeneralSettingsPasskeys.base64urlToArrayBuffer(serverData.user.id),
        name: serverData.user.name,
        displayName: serverData.user.displayName
      },
      pubKeyCredParams: serverData.pubKeyCredParams,
      authenticatorSelection: serverData.authenticatorSelection,
      timeout: serverData.timeout || 60000,
      attestation: serverData.attestation || 'none'
    };
  },

  /**
   * Prepare attestation data to send to server
   * @param {PublicKeyCredential} credential - Credential from WebAuthn
   * @param {object} serverData - Original server data with sessionId
   * @param {string} passkeyName - Generated passkey name
   * @returns {object} Attestation data
   */
  prepareAttestationData: function prepareAttestationData(credential, serverData, passkeyName) {
    var response = credential.response;
    return {
      sessionId: serverData.sessionId,
      credentialId: GeneralSettingsPasskeys.arrayBufferToBase64url(credential.rawId),
      name: passkeyName,
      attestationObject: GeneralSettingsPasskeys.arrayBufferToBase64url(response.attestationObject),
      clientDataJSON: GeneralSettingsPasskeys.arrayBufferToBase64url(response.clientDataJSON)
    };
  },

  /**
   * Delete passkey (without confirmation - using two-steps-delete mechanism)
   * @param {string} passkeyId - ID of passkey to delete
   */
  deletePasskey: function deletePasskey(passkeyId) {
    PasskeysAPI.deleteRecord(passkeyId, function (response) {
      if (response.result) {
        GeneralSettingsPasskeys.loadPasskeys();
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Convert base64url string to ArrayBuffer
   * @param {string} base64url - Base64url encoded string
   * @returns {ArrayBuffer}
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
   * @param {ArrayBuffer} buffer - ArrayBuffer to convert
   * @returns {string} Base64url encoded string
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
   * Escape HTML for safe display
   * @param {string} text Text to escape
   * @return {string} Escaped text
   */
  escapeHtml: function escapeHtml(text) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) {
      return map[m];
    });
  }
}; // Initialize when document is ready

$(document).ready(function () {
  GeneralSettingsPasskeys.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1wYXNza2V5cy5qcyJdLCJuYW1lcyI6WyJHZW5lcmFsU2V0dGluZ3NQYXNza2V5cyIsIiRjb250YWluZXIiLCJwYXNza2V5cyIsImNsaXBib2FyZCIsImluaXRpYWxpemUiLCIkIiwibGVuZ3RoIiwid2luZG93IiwiUHVibGljS2V5Q3JlZGVudGlhbCIsInJlbmRlclVuc3VwcG9ydGVkTWVzc2FnZSIsImxvYWRQYXNza2V5cyIsImJpbmRFdmVudEhhbmRsZXJzIiwiaHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsInBrX05vdFN1cHBvcnRlZCIsIlBhc3NrZXlzQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsInJlbmRlclRhYmxlIiwiJHRhYmxlIiwiJGVtcHR5Um93IiwiZmluZCIsInJlbW92ZSIsInNob3ciLCJoaWRlIiwiZm9yRWFjaCIsInBhc3NrZXkiLCJsYXN0VXNlZCIsImxhc3RfdXNlZF9hdCIsImZvcm1hdERhdGUiLCJwa19OZXZlclVzZWQiLCJpZCIsImVzY2FwZUh0bWwiLCJuYW1lIiwicGtfQ29sdW1uTGFzdFVzZWQiLCJwa19EZWxldGUiLCJhcHBlbmQiLCJhZGRCdXR0b25Sb3ciLCJwa19BZGRQYXNza2V5IiwicG9wdXAiLCJkYXRlU3RyaW5nIiwiZGF0ZSIsIkRhdGUiLCJ0b0xvY2FsZVN0cmluZyIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicmVnaXN0ZXJOZXdQYXNza2V5Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwicGFzc2tleUlkIiwiY3VycmVudFRhcmdldCIsImRlbGV0ZVBhc3NrZXkiLCJnZW5lcmF0ZVBhc3NrZXlOYW1lIiwidWEiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJicm93c2VyIiwib3MiLCJkZXZpY2UiLCJpbmRleE9mIiwidGltZXN0YW1wIiwidG9Mb2NhbGVEYXRlU3RyaW5nIiwicGFzc2tleU5hbWUiLCIkYnV0dG9uIiwiYWRkQ2xhc3MiLCJyZWdpc3RyYXRpb25TdGFydCIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInB1YmxpY0tleU9wdGlvbnMiLCJwcmVwYXJlQ3JlZGVudGlhbENyZWF0aW9uT3B0aW9ucyIsImNyZWRlbnRpYWwiLCJjcmVkZW50aWFscyIsImNyZWF0ZSIsInB1YmxpY0tleSIsImF0dGVzdGF0aW9uRGF0YSIsInByZXBhcmVBdHRlc3RhdGlvbkRhdGEiLCJyZWdpc3RyYXRpb25GaW5pc2giLCJmaW5pc2hSZXNwb25zZSIsImVycm9yIiwiY29uc29sZSIsInNob3dFcnJvciIsInBrX1JlZ2lzdGVyQ2FuY2VsbGVkIiwicGtfUmVnaXN0ZXJFcnJvciIsIm1lc3NhZ2UiLCJzZXJ2ZXJEYXRhIiwiY2hhbGxlbmdlIiwiYmFzZTY0dXJsVG9BcnJheUJ1ZmZlciIsInJwIiwidXNlciIsImRpc3BsYXlOYW1lIiwicHViS2V5Q3JlZFBhcmFtcyIsImF1dGhlbnRpY2F0b3JTZWxlY3Rpb24iLCJ0aW1lb3V0IiwiYXR0ZXN0YXRpb24iLCJzZXNzaW9uSWQiLCJjcmVkZW50aWFsSWQiLCJhcnJheUJ1ZmZlclRvQmFzZTY0dXJsIiwicmF3SWQiLCJhdHRlc3RhdGlvbk9iamVjdCIsImNsaWVudERhdGFKU09OIiwiZGVsZXRlUmVjb3JkIiwiYmFzZTY0dXJsIiwicGFkZGluZyIsInJlcGVhdCIsImJhc2U2NCIsInJlcGxhY2UiLCJyYXdEYXRhIiwiYXRvYiIsIm91dHB1dEFycmF5IiwiVWludDhBcnJheSIsImkiLCJjaGFyQ29kZUF0IiwiYnVmZmVyIiwiYnl0ZXMiLCJiaW5hcnkiLCJieXRlTGVuZ3RoIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwiYnRvYSIsInRleHQiLCJtYXAiLCJtIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUFDQSxTQUFLLElBQUlKLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdHLEtBQUssQ0FBQ0UsVUFBMUIsRUFBc0NMLENBQUMsRUFBdkMsRUFBMkM7QUFDdkNJLE1BQUFBLE1BQU0sSUFBSUUsTUFBTSxDQUFDQyxZQUFQLENBQW9CSixLQUFLLENBQUNILENBQUQsQ0FBekIsQ0FBVjtBQUNIOztBQUNELFFBQU1OLE1BQU0sR0FBR3JHLE1BQU0sQ0FBQ21ILElBQVAsQ0FBWUosTUFBWixDQUFmO0FBQ0EsV0FBT1YsTUFBTSxDQUFDQyxPQUFQLENBQWUsS0FBZixFQUFzQixHQUF0QixFQUEyQkEsT0FBM0IsQ0FBbUMsS0FBbkMsRUFBMEMsR0FBMUMsRUFBK0NBLE9BQS9DLENBQXVELElBQXZELEVBQTZELEVBQTdELENBQVA7QUFDSCxHQXpWMkI7O0FBMlY1QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0kzRSxFQUFBQSxVQWhXNEIsc0JBZ1dqQnlGLElBaFdpQixFQWdXWDtBQUNiLFFBQU1DLEdBQUcsR0FBRztBQUNSLFdBQUssT0FERztBQUVSLFdBQUssTUFGRztBQUdSLFdBQUssTUFIRztBQUlSLFdBQUssUUFKRztBQUtSLFdBQUs7QUFMRyxLQUFaO0FBT0EsV0FBT0QsSUFBSSxDQUFDZCxPQUFMLENBQWEsVUFBYixFQUF5QixVQUFBZ0IsQ0FBQztBQUFBLGFBQUlELEdBQUcsQ0FBQ0MsQ0FBRCxDQUFQO0FBQUEsS0FBMUIsQ0FBUDtBQUNIO0FBelcyQixDQUFoQyxDLENBNFdBOztBQUNBeEgsQ0FBQyxDQUFDeUgsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQi9ILEVBQUFBLHVCQUF1QixDQUFDSSxVQUF4QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYXNza2V5c0FQSSwgVXNlck1lc3NhZ2UsIENsaXBib2FyZEpTICovXG5cbi8qKlxuICogR2VuZXJhbFNldHRpbmdzUGFzc2tleXMgb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBtYW5hZ2luZyBQYXNza2V5cyBpbiBHZW5lcmFsIFNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBHZW5lcmFsU2V0dGluZ3NQYXNza2V5c1xuICovXG5jb25zdCBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cyA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgY29udGFpbmVyXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY29udGFpbmVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgcGFzc2tleXNcbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgcGFzc2tleXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogQ2xpcGJvYXJkIGluc3RhbmNlIGZvciBjb3B5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKiBAdHlwZSB7Q2xpcGJvYXJkSlN9XG4gICAgICovXG4gICAgY2xpcGJvYXJkOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgUGFzc2tleXMgbWFuYWdlbWVudCBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB0aGlzLiRjb250YWluZXIgPSAkKCcjcGFzc2tleXMtY29udGFpbmVyJyk7XG5cbiAgICAgICAgaWYgKHRoaXMuJGNvbnRhaW5lci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIFdlYkF1dGhuIGlzIHN1cHBvcnRlZFxuICAgICAgICBpZiAoIXdpbmRvdy5QdWJsaWNLZXlDcmVkZW50aWFsKSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclVuc3VwcG9ydGVkTWVzc2FnZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sb2FkUGFzc2tleXMoKTtcbiAgICAgICAgdGhpcy5iaW5kRXZlbnRIYW5kbGVycygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgdW5zdXBwb3J0ZWQgYnJvd3NlciBtZXNzYWdlXG4gICAgICovXG4gICAgcmVuZGVyVW5zdXBwb3J0ZWRNZXNzYWdlKCkge1xuICAgICAgICBjb25zdCBodG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwid2FybmluZyBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnBrX05vdFN1cHBvcnRlZH1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICB0aGlzLiRjb250YWluZXIuaHRtbChodG1sKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBwYXNza2V5cyBmcm9tIHNlcnZlclxuICAgICAqL1xuICAgIGxvYWRQYXNza2V5cygpIHtcbiAgICAgICAgUGFzc2tleXNBUEkuZ2V0TGlzdCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMucGFzc2tleXMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBhc3NrZXlzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnJlbmRlclRhYmxlKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgdGhlIHBhc3NrZXlzIHRhYmxlXG4gICAgICovXG4gICAgcmVuZGVyVGFibGUoKSB7XG4gICAgICAgIGNvbnN0ICR0YWJsZSA9ICQoJyNwYXNza2V5cy10YWJsZSB0Ym9keScpO1xuICAgICAgICBjb25zdCAkZW1wdHlSb3cgPSAkKCcjcGFzc2tleXMtZW1wdHktcm93Jyk7XG5cbiAgICAgICAgaWYgKHRoaXMucGFzc2tleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBTaG93IGVtcHR5IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAkdGFibGUuZmluZCgndHI6bm90KCNwYXNza2V5cy1lbXB0eS1yb3cpJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAkZW1wdHlSb3cuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBlbXB0eSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgJGVtcHR5Um93LmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGV4aXN0aW5nIHBhc3NrZXkgcm93cyAoa2VlcCBlbXB0eSByb3cpXG4gICAgICAgICAgICAkdGFibGUuZmluZCgndHI6bm90KCNwYXNza2V5cy1lbXB0eS1yb3cpJykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBwYXNza2V5IHJvd3NcbiAgICAgICAgICAgIHRoaXMucGFzc2tleXMuZm9yRWFjaCgocGFzc2tleSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxhc3RVc2VkID0gcGFzc2tleS5sYXN0X3VzZWRfYXRcbiAgICAgICAgICAgICAgICAgICAgPyB0aGlzLmZvcm1hdERhdGUocGFzc2tleS5sYXN0X3VzZWRfYXQpXG4gICAgICAgICAgICAgICAgICAgIDogZ2xvYmFsVHJhbnNsYXRlLnBrX05ldmVyVXNlZCB8fCAnTmV2ZXIgdXNlZCc7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBodG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8dHIgZGF0YS1pZD1cIiR7cGFzc2tleS5pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInBhc3NrZXktY2VsbFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJtYXJnaW4tYm90dG9tOiAwLjNlbTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke3RoaXMuZXNjYXBlSHRtbChwYXNza2V5Lm5hbWUpfTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJmb250LXNpemU6IDAuODVlbTsgY29sb3I6IHJnYmEoMCwwLDAsLjQpO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wa19Db2x1bW5MYXN0VXNlZH06ICR7bGFzdFVzZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiB0d28tc3RlcHMtZGVsZXRlIGRlbGV0ZS1wYXNza2V5LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1pZD1cIiR7cGFzc2tleS5pZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLnBrX0RlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ0cmFzaCBpY29uIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgJHRhYmxlLmFwcGVuZChodG1sKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBBZGQgYnV0dG9uIHJvd1xuICAgICAgICAgICAgY29uc3QgYWRkQnV0dG9uUm93ID0gYFxuICAgICAgICAgICAgICAgIDx0ciBpZD1cImFkZC1wYXNza2V5LXJvd1wiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBtaW5pIGJhc2ljIGJ1dHRvblwiIGlkPVwiYWRkLXBhc3NrZXktYnV0dG9uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJwbHVzIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucGtfQWRkUGFzc2tleX1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgJHRhYmxlLmFwcGVuZChhZGRCdXR0b25Sb3cpO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgICAgICAkdGFibGUuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBkYXRlIGZvciBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRhdGVTdHJpbmcgLSBJU08gZGF0ZSBzdHJpbmdcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZGF0ZVxuICAgICAqL1xuICAgIGZvcm1hdERhdGUoZGF0ZVN0cmluZykge1xuICAgICAgICBpZiAoIWRhdGVTdHJpbmcpIHJldHVybiAnLSc7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShkYXRlU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGRhdGUudG9Mb2NhbGVTdHJpbmcoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQmluZCBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGJpbmRFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBBZGQgcGFzc2tleSBidXR0b24gKGRlbGVnYXRlZClcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLm9uKCdjbGljaycsICcjYWRkLXBhc3NrZXktYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLnJlZ2lzdGVyTmV3UGFzc2tleSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIChkZWxlZ2F0ZWQpXG4gICAgICAgIC8vIE9ubHkgdHJpZ2dlciBkZWxldGlvbiBvbiBzZWNvbmQgY2xpY2sgKHdoZW4gdHdvLXN0ZXBzLWRlbGV0ZSBjbGFzcyBpcyByZW1vdmVkKVxuICAgICAgICB0aGlzLiRjb250YWluZXIub24oJ2NsaWNrJywgJy5kZWxldGUtcGFzc2tleS1idG46bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgcGFzc2tleUlkID0gJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoJ2lkJyk7XG4gICAgICAgICAgICBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5kZWxldGVQYXNza2V5KHBhc3NrZXlJZCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBwYXNza2V5IG5hbWUgYmFzZWQgb24gYnJvd3NlciBhbmQgZGV2aWNlIGluZm9ybWF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gR2VuZXJhdGVkIHBhc3NrZXkgbmFtZVxuICAgICAqL1xuICAgIGdlbmVyYXRlUGFzc2tleU5hbWUoKSB7XG4gICAgICAgIGNvbnN0IHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudDtcbiAgICAgICAgbGV0IGJyb3dzZXIgPSAnQnJvd3Nlcic7XG4gICAgICAgIGxldCBvcyA9ICdVbmtub3duIE9TJztcbiAgICAgICAgbGV0IGRldmljZSA9ICcnO1xuXG4gICAgICAgIC8vIERldGVjdCBicm93c2VyXG4gICAgICAgIGlmICh1YS5pbmRleE9mKCdFZGcnKSA+IC0xKSB7XG4gICAgICAgICAgICBicm93c2VyID0gJ0VkZ2UnO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ0Nocm9tZScpID4gLTEpIHtcbiAgICAgICAgICAgIGJyb3dzZXIgPSAnQ2hyb21lJztcbiAgICAgICAgfSBlbHNlIGlmICh1YS5pbmRleE9mKCdTYWZhcmknKSA+IC0xKSB7XG4gICAgICAgICAgICBicm93c2VyID0gJ1NhZmFyaSc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignRmlyZWZveCcpID4gLTEpIHtcbiAgICAgICAgICAgIGJyb3dzZXIgPSAnRmlyZWZveCc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignT3BlcmEnKSA+IC0xIHx8IHVhLmluZGV4T2YoJ09QUicpID4gLTEpIHtcbiAgICAgICAgICAgIGJyb3dzZXIgPSAnT3BlcmEnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZWN0IE9TXG4gICAgICAgIGlmICh1YS5pbmRleE9mKCdXaW4nKSA+IC0xKSB7XG4gICAgICAgICAgICBvcyA9ICdXaW5kb3dzJztcbiAgICAgICAgfSBlbHNlIGlmICh1YS5pbmRleE9mKCdNYWMnKSA+IC0xKSB7XG4gICAgICAgICAgICBvcyA9ICdtYWNPUyc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignTGludXgnKSA+IC0xKSB7XG4gICAgICAgICAgICBvcyA9ICdMaW51eCc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignQW5kcm9pZCcpID4gLTEpIHtcbiAgICAgICAgICAgIG9zID0gJ0FuZHJvaWQnO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ2lQaG9uZScpID4gLTEgfHwgdWEuaW5kZXhPZignaVBhZCcpID4gLTEpIHtcbiAgICAgICAgICAgIG9zID0gdWEuaW5kZXhPZignaVBob25lJykgPiAtMSA/ICdpUGhvbmUnIDogJ2lQYWQnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZWN0IGRldmljZSB0eXBlIGZvciBtb2JpbGVcbiAgICAgICAgaWYgKHVhLmluZGV4T2YoJ01vYmlsZScpID4gLTEgJiYgb3MgIT09ICdBbmRyb2lkJyAmJiBvcyAhPT0gJ2lQaG9uZScgJiYgb3MgIT09ICdpUGFkJykge1xuICAgICAgICAgICAgZGV2aWNlID0gJyBNb2JpbGUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgbmFtZVxuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvTG9jYWxlRGF0ZVN0cmluZygpO1xuICAgICAgICByZXR1cm4gYCR7YnJvd3Nlcn0gb24gJHtvc30ke2RldmljZX0gKCR7dGltZXN0YW1wfSlgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlciBuZXcgcGFzc2tleSB1c2luZyBXZWJBdXRoblxuICAgICAqL1xuICAgIGFzeW5jIHJlZ2lzdGVyTmV3UGFzc2tleSgpIHtcbiAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNza2V5IG5hbWUgYmFzZWQgb24gYnJvd3Nlci9kZXZpY2VcbiAgICAgICAgY29uc3QgcGFzc2tleU5hbWUgPSBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5nZW5lcmF0ZVBhc3NrZXlOYW1lKCk7XG5cbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJyNhZGQtcGFzc2tleS1idXR0b24nKTtcbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBTdGVwIDE6IEdldCBjaGFsbGVuZ2UgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIFBhc3NrZXlzQVBJLnJlZ2lzdHJhdGlvblN0YXJ0KHBhc3NrZXlOYW1lLCBhc3luYyAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdGVwIDI6IENhbGwgV2ViQXV0aG4gQVBJXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHB1YmxpY0tleU9wdGlvbnMgPSBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5wcmVwYXJlQ3JlZGVudGlhbENyZWF0aW9uT3B0aW9ucyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3JlZGVudGlhbCA9IGF3YWl0IG5hdmlnYXRvci5jcmVkZW50aWFscy5jcmVhdGUoeyBwdWJsaWNLZXk6IHB1YmxpY0tleU9wdGlvbnMgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU3RlcCAzOiBTZW5kIGF0dGVzdGF0aW9uIHRvIHNlcnZlclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRlc3RhdGlvbkRhdGEgPSBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5wcmVwYXJlQXR0ZXN0YXRpb25EYXRhKGNyZWRlbnRpYWwsIHJlc3BvbnNlLmRhdGEsIHBhc3NrZXlOYW1lKTtcblxuICAgICAgICAgICAgICAgICAgICBQYXNza2V5c0FQSS5yZWdpc3RyYXRpb25GaW5pc2goYXR0ZXN0YXRpb25EYXRhLCAoZmluaXNoUmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbmlzaFJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLmxvYWRQYXNza2V5cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZmluaXNoUmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dlYkF1dGhuIHJlZ2lzdHJhdGlvbiBlcnJvcjonLCBlcnJvcik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHVzZXIgY2FuY2VsbGF0aW9uIGdyYWNlZnVsbHlcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdOb3RBbGxvd2VkRXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnBrX1JlZ2lzdGVyQ2FuY2VsbGVkIHx8ICdSZWdpc3RyYXRpb24gd2FzIGNhbmNlbGxlZCcpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5wa19SZWdpc3RlckVycm9yfTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdSZWdpc3RyYXRpb24gc3RhcnQgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5wa19SZWdpc3RlckVycm9yfTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgY3JlZGVudGlhbCBjcmVhdGlvbiBvcHRpb25zIGZvciBXZWJBdXRobiBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2VydmVyRGF0YSAtIERhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBQdWJsaWNLZXlDcmVkZW50aWFsQ3JlYXRpb25PcHRpb25zXG4gICAgICovXG4gICAgcHJlcGFyZUNyZWRlbnRpYWxDcmVhdGlvbk9wdGlvbnMoc2VydmVyRGF0YSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2hhbGxlbmdlOiBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5iYXNlNjR1cmxUb0FycmF5QnVmZmVyKHNlcnZlckRhdGEuY2hhbGxlbmdlKSxcbiAgICAgICAgICAgIHJwOiBzZXJ2ZXJEYXRhLnJwLFxuICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGlkOiBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5iYXNlNjR1cmxUb0FycmF5QnVmZmVyKHNlcnZlckRhdGEudXNlci5pZCksXG4gICAgICAgICAgICAgICAgbmFtZTogc2VydmVyRGF0YS51c2VyLm5hbWUsXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWU6IHNlcnZlckRhdGEudXNlci5kaXNwbGF5TmFtZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwdWJLZXlDcmVkUGFyYW1zOiBzZXJ2ZXJEYXRhLnB1YktleUNyZWRQYXJhbXMsXG4gICAgICAgICAgICBhdXRoZW50aWNhdG9yU2VsZWN0aW9uOiBzZXJ2ZXJEYXRhLmF1dGhlbnRpY2F0b3JTZWxlY3Rpb24sXG4gICAgICAgICAgICB0aW1lb3V0OiBzZXJ2ZXJEYXRhLnRpbWVvdXQgfHwgNjAwMDAsXG4gICAgICAgICAgICBhdHRlc3RhdGlvbjogc2VydmVyRGF0YS5hdHRlc3RhdGlvbiB8fCAnbm9uZScsXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgYXR0ZXN0YXRpb24gZGF0YSB0byBzZW5kIHRvIHNlcnZlclxuICAgICAqIEBwYXJhbSB7UHVibGljS2V5Q3JlZGVudGlhbH0gY3JlZGVudGlhbCAtIENyZWRlbnRpYWwgZnJvbSBXZWJBdXRoblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXJ2ZXJEYXRhIC0gT3JpZ2luYWwgc2VydmVyIGRhdGEgd2l0aCBzZXNzaW9uSWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc2tleU5hbWUgLSBHZW5lcmF0ZWQgcGFzc2tleSBuYW1lXG4gICAgICogQHJldHVybnMge29iamVjdH0gQXR0ZXN0YXRpb24gZGF0YVxuICAgICAqL1xuICAgIHByZXBhcmVBdHRlc3RhdGlvbkRhdGEoY3JlZGVudGlhbCwgc2VydmVyRGF0YSwgcGFzc2tleU5hbWUpIHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBjcmVkZW50aWFsLnJlc3BvbnNlO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXNzaW9uSWQ6IHNlcnZlckRhdGEuc2Vzc2lvbklkLFxuICAgICAgICAgICAgY3JlZGVudGlhbElkOiBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5hcnJheUJ1ZmZlclRvQmFzZTY0dXJsKGNyZWRlbnRpYWwucmF3SWQpLFxuICAgICAgICAgICAgbmFtZTogcGFzc2tleU5hbWUsXG4gICAgICAgICAgICBhdHRlc3RhdGlvbk9iamVjdDogR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChyZXNwb25zZS5hdHRlc3RhdGlvbk9iamVjdCksXG4gICAgICAgICAgICBjbGllbnREYXRhSlNPTjogR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChyZXNwb25zZS5jbGllbnREYXRhSlNPTiksXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBwYXNza2V5ICh3aXRob3V0IGNvbmZpcm1hdGlvbiAtIHVzaW5nIHR3by1zdGVwcy1kZWxldGUgbWVjaGFuaXNtKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNza2V5SWQgLSBJRCBvZiBwYXNza2V5IHRvIGRlbGV0ZVxuICAgICAqL1xuICAgIGRlbGV0ZVBhc3NrZXkocGFzc2tleUlkKSB7XG4gICAgICAgIFBhc3NrZXlzQVBJLmRlbGV0ZVJlY29yZChwYXNza2V5SWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLmxvYWRQYXNza2V5cygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBiYXNlNjR1cmwgc3RyaW5nIHRvIEFycmF5QnVmZmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGJhc2U2NHVybCAtIEJhc2U2NHVybCBlbmNvZGVkIHN0cmluZ1xuICAgICAqIEByZXR1cm5zIHtBcnJheUJ1ZmZlcn1cbiAgICAgKi9cbiAgICBiYXNlNjR1cmxUb0FycmF5QnVmZmVyKGJhc2U2NHVybCkge1xuICAgICAgICBjb25zdCBwYWRkaW5nID0gJz0nLnJlcGVhdCgoNCAtIChiYXNlNjR1cmwubGVuZ3RoICUgNCkpICUgNCk7XG4gICAgICAgIGNvbnN0IGJhc2U2NCA9IGJhc2U2NHVybC5yZXBsYWNlKC8tL2csICcrJykucmVwbGFjZSgvXy9nLCAnLycpICsgcGFkZGluZztcbiAgICAgICAgY29uc3QgcmF3RGF0YSA9IHdpbmRvdy5hdG9iKGJhc2U2NCk7XG4gICAgICAgIGNvbnN0IG91dHB1dEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkocmF3RGF0YS5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhd0RhdGEubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIG91dHB1dEFycmF5W2ldID0gcmF3RGF0YS5jaGFyQ29kZUF0KGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRwdXRBcnJheS5idWZmZXI7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgQXJyYXlCdWZmZXIgdG8gYmFzZTY0dXJsIHN0cmluZ1xuICAgICAqIEBwYXJhbSB7QXJyYXlCdWZmZXJ9IGJ1ZmZlciAtIEFycmF5QnVmZmVyIHRvIGNvbnZlcnRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBCYXNlNjR1cmwgZW5jb2RlZCBzdHJpbmdcbiAgICAgKi9cbiAgICBhcnJheUJ1ZmZlclRvQmFzZTY0dXJsKGJ1ZmZlcikge1xuICAgICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gICAgICAgIGxldCBiaW5hcnkgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBieXRlcy5ieXRlTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGJpbmFyeSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBiYXNlNjQgPSB3aW5kb3cuYnRvYShiaW5hcnkpO1xuICAgICAgICByZXR1cm4gYmFzZTY0LnJlcGxhY2UoL1xcKy9nLCAnLScpLnJlcGxhY2UoL1xcLy9nLCAnXycpLnJlcGxhY2UoLz0vZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCBmb3Igc2FmZSBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBtYXAgPSB7XG4gICAgICAgICAgICAnJic6ICcmYW1wOycsXG4gICAgICAgICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICAgICAgICc+JzogJyZndDsnLFxuICAgICAgICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICAgICAgICBcIidcIjogJyYjMDM5OydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZSgvWyY8PlwiJ10vZywgbSA9PiBtYXBbbV0pO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19