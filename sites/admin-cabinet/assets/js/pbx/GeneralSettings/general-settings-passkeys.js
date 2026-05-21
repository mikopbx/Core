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

/* global globalTranslate, PasskeysAPI, UserMessage, ClipboardJS, PbxDateTime */

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
    } // Check if accessing via IP address (WebAuthn requires valid domain)


    if (this.isAccessingViaIpAddress()) {
      this.renderDomainRequiredMessage();
      return;
    }

    this.loadPasskeys();
    this.bindEventHandlers();
  },

  /**
   * Check if the current hostname is an IP address (IPv4 or IPv6)
   * WebAuthn requires a valid domain name, not an IP address
   * @returns {boolean} True if accessing via IP address
   */
  isAccessingViaIpAddress: function isAccessingViaIpAddress() {
    var hostname = window.location.hostname; // IPv4 pattern: xxx.xxx.xxx.xxx

    var ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/; // IPv6 patterns: [::1], [2001:db8::1], etc.
    // Also check for localhost IP representations

    var ipv6Pattern = /^(\[.*\]|::1|localhost)$/i; // Check for IPv6 without brackets (some browsers)

    var ipv6NoBrackets = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname) || ipv6NoBrackets.test(hostname);
  },

  /**
   * Render message when domain is required for Passkeys
   */
  renderDomainRequiredMessage: function renderDomainRequiredMessage() {
    var html = "\n            <div class=\"ui info message\">\n                <div class=\"header\">\n                    <i class=\"info circle icon\"></i>\n                    ".concat(globalTranslate.pk_DomainRequired, "\n                </div>\n                <p>").concat(globalTranslate.pk_DomainRequiredDescription, "</p>\n            </div>\n        ");
    this.$container.html(html);
  },

  /**
   * Render unsupported browser message
   */
  renderUnsupportedMessage: function renderUnsupportedMessage() {
    var html = "\n            <div class=\"ui warning message\">\n                <i class=\"warning icon\"></i>\n                ".concat(globalTranslate.pk_NotSupported, "\n            </div>\n        ");
    this.$container.html(html);
  },

  /**
   * Load passkeys from server. The endpoint wraps the array in
   * `{ items, _meta }` so the UI can format `last_used_at` in server TZ;
   * accept the legacy raw-array shape for backward compatibility.
   */
  loadPasskeys: function loadPasskeys() {
    var _this = this;

    PasskeysAPI.getList(function (response) {
      if (response.result && response.data) {
        var payload = response.data;

        if (Array.isArray(payload)) {
          _this.passkeys = payload;
        } else if (payload.items && Array.isArray(payload.items)) {
          _this.passkeys = payload.items;

          if (payload._meta) {
            PbxDateTime.setServerMeta(payload._meta);
          }
        } else {
          _this.passkeys = [];
        }
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
        var lastUsedHtml;

        if (passkey.last_used_at) {
          var _this2$formatDate = _this2.formatDate(passkey.last_used_at),
              display = _this2$formatDate.display,
              tooltipHtml = _this2$formatDate.tooltipHtml;

          if (tooltipHtml) {
            // Use the same Fomantic popup contract as the rest of the
            // table (`data-content` is consumed by $table.find('[data-content]').popup()`).
            // Adding `data-variation="inverted"` matches the styling used in Fail2Ban.
            var safe = tooltipHtml.replace(/"/g, '&quot;');
            lastUsedHtml = "<span class=\"passkey-last-used-tooltip\" data-html=\"".concat(safe, "\"") + ' data-position="top center" data-variation="inverted">' + "".concat(_this2.escapeHtml(display), "</span>");
          } else {
            lastUsedHtml = "<span>".concat(_this2.escapeHtml(display), "</span>");
          }
        } else {
          lastUsedHtml = _this2.escapeHtml(globalTranslate.pk_NeverUsed);
        }

        var html = "\n                    <tr data-id=\"".concat(passkey.id, "\">\n                        <td class=\"passkey-cell\">\n                            <div style=\"margin-bottom: 0.3em;\">\n                                <strong>").concat(_this2.escapeHtml(passkey.name), "</strong>\n                            </div>\n                            <div style=\"font-size: 0.85em; color: rgba(0,0,0,.4);\">\n                                ").concat(globalTranslate.pk_ColumnLastUsed, ": ").concat(lastUsedHtml, "\n                            </div>\n                        </td>\n                        <td class=\"right aligned collapsing\">\n                            <a class=\"ui basic icon button two-steps-delete delete-passkey-btn\"\n                               data-id=\"").concat(passkey.id, "\"\n                               data-content=\"").concat(globalTranslate.pk_Delete, "\">\n                                <i class=\"trash icon red\"></i>\n                            </a>\n                        </td>\n                    </tr>\n                ");
        $table.append(html);
      }); // Add button row

      var addButtonRow = "\n                <tr id=\"add-passkey-row\">\n                    <td colspan=\"2\">\n                        <button class=\"ui mini basic button\" id=\"add-passkey-button\">\n                            <i class=\"plus icon\"></i>\n                            ".concat(globalTranslate.pk_AddPasskey, "\n                        </button>\n                    </td>\n                </tr>\n            ");
      $table.append(addButtonRow); // Initialize tooltips

      $table.find('[data-content]').popup(); // Last-used cells carry the dual-TZ HTML in data-html. Fomantic's
      // `html` setting accepts a raw template string, so we wire it up
      // per element to give each cell its own popup body.

      $table.find('.passkey-last-used-tooltip').each(function () {
        var $el = $(this);
        $el.popup('destroy');
        $el.popup({
          html: $el.attr('data-html'),
          hoverable: true,
          variation: 'inverted',
          position: 'top center',
          delay: {
            show: 200,
            hide: 100
          }
        });
      });
    }
  },

  /**
   * Format `last_used_at` for display. The backend stores it as a
   * `Y-m-d H:i:s` string already in server TZ; we render the server-side
   * value as-is and expose the browser equivalent via a Fomantic popup.
   *
   * @param {string} dateString - Server-side "Y-m-d H:i:s" string
   * @returns {{display:string, tooltipHtml:string}}
   */
  formatDate: function formatDate(dateString) {
    if (!dateString) {
      return {
        display: '-',
        tooltipHtml: ''
      };
    }

    var ts = PbxDateTime.serverStringToTimestamp(dateString);

    if (ts === null) {
      return {
        display: dateString,
        tooltipHtml: ''
      };
    }

    return {
      display: PbxDateTime.formatServerTime(ts),
      tooltipHtml: PbxDateTime.buildDualTooltipHtml(ts)
    };
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
          console.error('WebAuthn registration error:', error); // Handle specific WebAuthn errors

          if (error.name === 'NotAllowedError') {
            // Check if it's a TLS certificate error (Chrome-specific)
            if (error.message && error.message.includes('TLS certificate')) {
              UserMessage.showError(globalTranslate.pk_TlsCertificateError);
            } else {
              // User cancelled the operation
              UserMessage.showError(globalTranslate.pk_RegisterCancelled);
            }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1wYXNza2V5cy5qcyJdLCJuYW1lcyI6WyJHZW5lcmFsU2V0dGluZ3NQYXNza2V5cyIsIiRjb250YWluZXIiLCJwYXNza2V5cyIsImNsaXBib2FyZCIsImluaXRpYWxpemUiLCIkIiwibGVuZ3RoIiwid2luZG93IiwiUHVibGljS2V5Q3JlZGVudGlhbCIsInJlbmRlclVuc3VwcG9ydGVkTWVzc2FnZSIsImlzQWNjZXNzaW5nVmlhSXBBZGRyZXNzIiwicmVuZGVyRG9tYWluUmVxdWlyZWRNZXNzYWdlIiwibG9hZFBhc3NrZXlzIiwiYmluZEV2ZW50SGFuZGxlcnMiLCJob3N0bmFtZSIsImxvY2F0aW9uIiwiaXB2NFBhdHRlcm4iLCJpcHY2UGF0dGVybiIsImlwdjZOb0JyYWNrZXRzIiwidGVzdCIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJwa19Eb21haW5SZXF1aXJlZCIsInBrX0RvbWFpblJlcXVpcmVkRGVzY3JpcHRpb24iLCJwa19Ob3RTdXBwb3J0ZWQiLCJQYXNza2V5c0FQSSIsImdldExpc3QiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJwYXlsb2FkIiwiQXJyYXkiLCJpc0FycmF5IiwiaXRlbXMiLCJfbWV0YSIsIlBieERhdGVUaW1lIiwic2V0U2VydmVyTWV0YSIsInJlbmRlclRhYmxlIiwiJHRhYmxlIiwiJGVtcHR5Um93IiwiZmluZCIsInJlbW92ZSIsInNob3ciLCJoaWRlIiwiZm9yRWFjaCIsInBhc3NrZXkiLCJsYXN0VXNlZEh0bWwiLCJsYXN0X3VzZWRfYXQiLCJmb3JtYXREYXRlIiwiZGlzcGxheSIsInRvb2x0aXBIdG1sIiwic2FmZSIsInJlcGxhY2UiLCJlc2NhcGVIdG1sIiwicGtfTmV2ZXJVc2VkIiwiaWQiLCJuYW1lIiwicGtfQ29sdW1uTGFzdFVzZWQiLCJwa19EZWxldGUiLCJhcHBlbmQiLCJhZGRCdXR0b25Sb3ciLCJwa19BZGRQYXNza2V5IiwicG9wdXAiLCJlYWNoIiwiJGVsIiwiYXR0ciIsImhvdmVyYWJsZSIsInZhcmlhdGlvbiIsInBvc2l0aW9uIiwiZGVsYXkiLCJkYXRlU3RyaW5nIiwidHMiLCJzZXJ2ZXJTdHJpbmdUb1RpbWVzdGFtcCIsImZvcm1hdFNlcnZlclRpbWUiLCJidWlsZER1YWxUb29sdGlwSHRtbCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwicmVnaXN0ZXJOZXdQYXNza2V5Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwicGFzc2tleUlkIiwiY3VycmVudFRhcmdldCIsImRlbGV0ZVBhc3NrZXkiLCJnZW5lcmF0ZVBhc3NrZXlOYW1lIiwidWEiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJicm93c2VyIiwib3MiLCJkZXZpY2UiLCJpbmRleE9mIiwidGltZXN0YW1wIiwiRGF0ZSIsInRvTG9jYWxlRGF0ZVN0cmluZyIsInBhc3NrZXlOYW1lIiwiJGJ1dHRvbiIsImFkZENsYXNzIiwicmVnaXN0cmF0aW9uU3RhcnQiLCJyZW1vdmVDbGFzcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJwdWJsaWNLZXlPcHRpb25zIiwicHJlcGFyZUNyZWRlbnRpYWxDcmVhdGlvbk9wdGlvbnMiLCJjcmVkZW50aWFsIiwiY3JlZGVudGlhbHMiLCJjcmVhdGUiLCJwdWJsaWNLZXkiLCJhdHRlc3RhdGlvbkRhdGEiLCJwcmVwYXJlQXR0ZXN0YXRpb25EYXRhIiwicmVnaXN0cmF0aW9uRmluaXNoIiwiZmluaXNoUmVzcG9uc2UiLCJlcnJvciIsImNvbnNvbGUiLCJtZXNzYWdlIiwiaW5jbHVkZXMiLCJzaG93RXJyb3IiLCJwa19UbHNDZXJ0aWZpY2F0ZUVycm9yIiwicGtfUmVnaXN0ZXJDYW5jZWxsZWQiLCJwa19SZWdpc3RlckVycm9yIiwic2VydmVyRGF0YSIsImNoYWxsZW5nZSIsImJhc2U2NHVybFRvQXJyYXlCdWZmZXIiLCJycCIsInVzZXIiLCJkaXNwbGF5TmFtZSIsInB1YktleUNyZWRQYXJhbXMiLCJhdXRoZW50aWNhdG9yU2VsZWN0aW9uIiwidGltZW91dCIsImF0dGVzdGF0aW9uIiwic2Vzc2lvbklkIiwiY3JlZGVudGlhbElkIiwiYXJyYXlCdWZmZXJUb0Jhc2U2NHVybCIsInJhd0lkIiwiYXR0ZXN0YXRpb25PYmplY3QiLCJjbGllbnREYXRhSlNPTiIsImRlbGV0ZVJlY29yZCIsImJhc2U2NHVybCIsInBhZGRpbmciLCJyZXBlYXQiLCJiYXNlNjQiLCJyYXdEYXRhIiwiYXRvYiIsIm91dHB1dEFycmF5IiwiVWludDhBcnJheSIsImkiLCJjaGFyQ29kZUF0IiwiYnVmZmVyIiwiYnl0ZXMiLCJiaW5hcnkiLCJieXRlTGVuZ3RoIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwiYnRvYSIsInRleHQiLCJtYXAiLCJtIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSx1QkFBdUIsR0FBRztBQUM1QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUFMZ0I7O0FBTzVCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxFQVhrQjs7QUFhNUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBakJpQjs7QUFtQjVCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQXRCNEIsd0JBc0JmO0FBQ1QsU0FBS0gsVUFBTCxHQUFrQkksQ0FBQyxDQUFDLHFCQUFELENBQW5COztBQUVBLFFBQUksS0FBS0osVUFBTCxDQUFnQkssTUFBaEIsS0FBMkIsQ0FBL0IsRUFBa0M7QUFDOUI7QUFDSCxLQUxRLENBT1Q7OztBQUNBLFFBQUksQ0FBQ0MsTUFBTSxDQUFDQyxtQkFBWixFQUFpQztBQUM3QixXQUFLQyx3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bCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYXNza2V5c0FQSSwgVXNlck1lc3NhZ2UsIENsaXBib2FyZEpTLCBQYnhEYXRlVGltZSAqL1xuXG4vKipcbiAqIEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzIG9iamVjdCBpcyByZXNwb25zaWJsZSBmb3IgbWFuYWdpbmcgUGFzc2tleXMgaW4gR2VuZXJhbCBTZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgR2VuZXJhbFNldHRpbmdzUGFzc2tleXNcbiAqL1xuY29uc3QgR2VuZXJhbFNldHRpbmdzUGFzc2tleXMgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNvbnRhaW5lclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNvbnRhaW5lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIHBhc3NrZXlzXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHBhc3NrZXlzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIENsaXBib2FyZCBpbnN0YW5jZSBmb3IgY29weSBmdW5jdGlvbmFsaXR5XG4gICAgICogQHR5cGUge0NsaXBib2FyZEpTfVxuICAgICAqL1xuICAgIGNsaXBib2FyZDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIFBhc3NrZXlzIG1hbmFnZW1lbnQgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyID0gJCgnI3Bhc3NrZXlzLWNvbnRhaW5lcicpO1xuXG4gICAgICAgIGlmICh0aGlzLiRjb250YWluZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBXZWJBdXRobiBpcyBzdXBwb3J0ZWRcbiAgICAgICAgaWYgKCF3aW5kb3cuUHVibGljS2V5Q3JlZGVudGlhbCkge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJVbnN1cHBvcnRlZE1lc3NhZ2UoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGFjY2Vzc2luZyB2aWEgSVAgYWRkcmVzcyAoV2ViQXV0aG4gcmVxdWlyZXMgdmFsaWQgZG9tYWluKVxuICAgICAgICBpZiAodGhpcy5pc0FjY2Vzc2luZ1ZpYUlwQWRkcmVzcygpKSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlckRvbWFpblJlcXVpcmVkTWVzc2FnZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sb2FkUGFzc2tleXMoKTtcbiAgICAgICAgdGhpcy5iaW5kRXZlbnRIYW5kbGVycygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0aGUgY3VycmVudCBob3N0bmFtZSBpcyBhbiBJUCBhZGRyZXNzIChJUHY0IG9yIElQdjYpXG4gICAgICogV2ViQXV0aG4gcmVxdWlyZXMgYSB2YWxpZCBkb21haW4gbmFtZSwgbm90IGFuIElQIGFkZHJlc3NcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBhY2Nlc3NpbmcgdmlhIElQIGFkZHJlc3NcbiAgICAgKi9cbiAgICBpc0FjY2Vzc2luZ1ZpYUlwQWRkcmVzcygpIHtcbiAgICAgICAgY29uc3QgeyBob3N0bmFtZSB9ID0gd2luZG93LmxvY2F0aW9uO1xuXG4gICAgICAgIC8vIElQdjQgcGF0dGVybjogeHh4Lnh4eC54eHgueHh4XG4gICAgICAgIGNvbnN0IGlwdjRQYXR0ZXJuID0gL14oXFxkezEsM31cXC4pezN9XFxkezEsM30kLztcblxuICAgICAgICAvLyBJUHY2IHBhdHRlcm5zOiBbOjoxXSwgWzIwMDE6ZGI4OjoxXSwgZXRjLlxuICAgICAgICAvLyBBbHNvIGNoZWNrIGZvciBsb2NhbGhvc3QgSVAgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIGNvbnN0IGlwdjZQYXR0ZXJuID0gL14oXFxbLipcXF18OjoxfGxvY2FsaG9zdCkkL2k7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIElQdjYgd2l0aG91dCBicmFja2V0cyAoc29tZSBicm93c2VycylcbiAgICAgICAgY29uc3QgaXB2Nk5vQnJhY2tldHMgPSAvXihbMC05YS1mQS1GXXswLDR9Oil7Miw3fVswLTlhLWZBLUZdezAsNH0kLztcblxuICAgICAgICByZXR1cm4gaXB2NFBhdHRlcm4udGVzdChob3N0bmFtZSlcbiAgICAgICAgICAgIHx8IGlwdjZQYXR0ZXJuLnRlc3QoaG9zdG5hbWUpXG4gICAgICAgICAgICB8fCBpcHY2Tm9CcmFja2V0cy50ZXN0KGhvc3RuYW1lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIG1lc3NhZ2Ugd2hlbiBkb21haW4gaXMgcmVxdWlyZWQgZm9yIFBhc3NrZXlzXG4gICAgICovXG4gICAgcmVuZGVyRG9tYWluUmVxdWlyZWRNZXNzYWdlKCkge1xuICAgICAgICBjb25zdCBodG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wa19Eb21haW5SZXF1aXJlZH1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5wa19Eb21haW5SZXF1aXJlZERlc2NyaXB0aW9ufTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICB0aGlzLiRjb250YWluZXIuaHRtbChodG1sKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHVuc3VwcG9ydGVkIGJyb3dzZXIgbWVzc2FnZVxuICAgICAqL1xuICAgIHJlbmRlclVuc3VwcG9ydGVkTWVzc2FnZSgpIHtcbiAgICAgICAgY29uc3QgaHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIndhcm5pbmcgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wa19Ob3RTdXBwb3J0ZWR9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLmh0bWwoaHRtbCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgcGFzc2tleXMgZnJvbSBzZXJ2ZXIuIFRoZSBlbmRwb2ludCB3cmFwcyB0aGUgYXJyYXkgaW5cbiAgICAgKiBgeyBpdGVtcywgX21ldGEgfWAgc28gdGhlIFVJIGNhbiBmb3JtYXQgYGxhc3RfdXNlZF9hdGAgaW4gc2VydmVyIFRaO1xuICAgICAqIGFjY2VwdCB0aGUgbGVnYWN5IHJhdy1hcnJheSBzaGFwZSBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eS5cbiAgICAgKi9cbiAgICBsb2FkUGFzc2tleXMoKSB7XG4gICAgICAgIFBhc3NrZXlzQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXlsb2FkID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXlsb2FkKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhc3NrZXlzID0gcGF5bG9hZDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBheWxvYWQuaXRlbXMgJiYgQXJyYXkuaXNBcnJheShwYXlsb2FkLml0ZW1zKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhc3NrZXlzID0gcGF5bG9hZC5pdGVtcztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBheWxvYWQuX21ldGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFBieERhdGVUaW1lLnNldFNlcnZlck1ldGEocGF5bG9hZC5fbWV0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhc3NrZXlzID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBhc3NrZXlzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnJlbmRlclRhYmxlKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgdGhlIHBhc3NrZXlzIHRhYmxlXG4gICAgICovXG4gICAgcmVuZGVyVGFibGUoKSB7XG4gICAgICAgIGNvbnN0ICR0YWJsZSA9ICQoJyNwYXNza2V5cy10YWJsZSB0Ym9keScpO1xuICAgICAgICBjb25zdCAkZW1wdHlSb3cgPSAkKCcjcGFzc2tleXMtZW1wdHktcm93Jyk7XG5cbiAgICAgICAgaWYgKHRoaXMucGFzc2tleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBTaG93IGVtcHR5IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAkdGFibGUuZmluZCgndHI6bm90KCNwYXNza2V5cy1lbXB0eS1yb3cpJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAkZW1wdHlSb3cuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBlbXB0eSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgJGVtcHR5Um93LmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGV4aXN0aW5nIHBhc3NrZXkgcm93cyAoa2VlcCBlbXB0eSByb3cpXG4gICAgICAgICAgICAkdGFibGUuZmluZCgndHI6bm90KCNwYXNza2V5cy1lbXB0eS1yb3cpJykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBwYXNza2V5IHJvd3NcbiAgICAgICAgICAgIHRoaXMucGFzc2tleXMuZm9yRWFjaCgocGFzc2tleSkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBsYXN0VXNlZEh0bWw7XG4gICAgICAgICAgICAgICAgaWYgKHBhc3NrZXkubGFzdF91c2VkX2F0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZGlzcGxheSwgdG9vbHRpcEh0bWwgfSA9IHRoaXMuZm9ybWF0RGF0ZShwYXNza2V5Lmxhc3RfdXNlZF9hdCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b29sdGlwSHRtbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBzYW1lIEZvbWFudGljIHBvcHVwIGNvbnRyYWN0IGFzIHRoZSByZXN0IG9mIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFibGUgKGBkYXRhLWNvbnRlbnRgIGlzIGNvbnN1bWVkIGJ5ICR0YWJsZS5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKClgKS5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkZGluZyBgZGF0YS12YXJpYXRpb249XCJpbnZlcnRlZFwiYCBtYXRjaGVzIHRoZSBzdHlsaW5nIHVzZWQgaW4gRmFpbDJCYW4uXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlID0gdG9vbHRpcEh0bWwucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdFVzZWRIdG1sID0gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGA8c3BhbiBjbGFzcz1cInBhc3NrZXktbGFzdC11c2VkLXRvb2x0aXBcIiBkYXRhLWh0bWw9XCIke3NhZmV9XCJgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKyAnIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCIgZGF0YS12YXJpYXRpb249XCJpbnZlcnRlZFwiPidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArIGAke3RoaXMuZXNjYXBlSHRtbChkaXNwbGF5KX08L3NwYW4+YFxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RVc2VkSHRtbCA9IGA8c3Bhbj4ke3RoaXMuZXNjYXBlSHRtbChkaXNwbGF5KX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxhc3RVc2VkSHRtbCA9IHRoaXMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUucGtfTmV2ZXJVc2VkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBodG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8dHIgZGF0YS1pZD1cIiR7cGFzc2tleS5pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInBhc3NrZXktY2VsbFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJtYXJnaW4tYm90dG9tOiAwLjNlbTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke3RoaXMuZXNjYXBlSHRtbChwYXNza2V5Lm5hbWUpfTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJmb250LXNpemU6IDAuODVlbTsgY29sb3I6IHJnYmEoMCwwLDAsLjQpO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wa19Db2x1bW5MYXN0VXNlZH06ICR7bGFzdFVzZWRIdG1sfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gdHdvLXN0ZXBzLWRlbGV0ZSBkZWxldGUtcGFzc2tleS1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtaWQ9XCIke3Bhc3NrZXkuaWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5wa19EZWxldGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwidHJhc2ggaWNvbiByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgICR0YWJsZS5hcHBlbmQoaHRtbCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQWRkIGJ1dHRvbiByb3dcbiAgICAgICAgICAgIGNvbnN0IGFkZEJ1dHRvblJvdyA9IGBcbiAgICAgICAgICAgICAgICA8dHIgaWQ9XCJhZGQtcGFzc2tleS1yb3dcIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNvbHNwYW49XCIyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgbWluaSBiYXNpYyBidXR0b25cIiBpZD1cImFkZC1wYXNza2V5LWJ1dHRvblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwicGx1cyBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnBrX0FkZFBhc3NrZXl9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICR0YWJsZS5hcHBlbmQoYWRkQnV0dG9uUm93KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICAgICAgJHRhYmxlLmZpbmQoJ1tkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICAgICAgICAgIC8vIExhc3QtdXNlZCBjZWxscyBjYXJyeSB0aGUgZHVhbC1UWiBIVE1MIGluIGRhdGEtaHRtbC4gRm9tYW50aWMnc1xuICAgICAgICAgICAgLy8gYGh0bWxgIHNldHRpbmcgYWNjZXB0cyBhIHJhdyB0ZW1wbGF0ZSBzdHJpbmcsIHNvIHdlIHdpcmUgaXQgdXBcbiAgICAgICAgICAgIC8vIHBlciBlbGVtZW50IHRvIGdpdmUgZWFjaCBjZWxsIGl0cyBvd24gcG9wdXAgYm9keS5cbiAgICAgICAgICAgICR0YWJsZS5maW5kKCcucGFzc2tleS1sYXN0LXVzZWQtdG9vbHRpcCcpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgJGVsLnBvcHVwKCdkZXN0cm95Jyk7XG4gICAgICAgICAgICAgICAgJGVsLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogJGVsLmF0dHIoJ2RhdGEtaHRtbCcpLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2ludmVydGVkJyxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHsgc2hvdzogMjAwLCBoaWRlOiAxMDAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBgbGFzdF91c2VkX2F0YCBmb3IgZGlzcGxheS4gVGhlIGJhY2tlbmQgc3RvcmVzIGl0IGFzIGFcbiAgICAgKiBgWS1tLWQgSDppOnNgIHN0cmluZyBhbHJlYWR5IGluIHNlcnZlciBUWjsgd2UgcmVuZGVyIHRoZSBzZXJ2ZXItc2lkZVxuICAgICAqIHZhbHVlIGFzLWlzIGFuZCBleHBvc2UgdGhlIGJyb3dzZXIgZXF1aXZhbGVudCB2aWEgYSBGb21hbnRpYyBwb3B1cC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkYXRlU3RyaW5nIC0gU2VydmVyLXNpZGUgXCJZLW0tZCBIOmk6c1wiIHN0cmluZ1xuICAgICAqIEByZXR1cm5zIHt7ZGlzcGxheTpzdHJpbmcsIHRvb2x0aXBIdG1sOnN0cmluZ319XG4gICAgICovXG4gICAgZm9ybWF0RGF0ZShkYXRlU3RyaW5nKSB7XG4gICAgICAgIGlmICghZGF0ZVN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIHsgZGlzcGxheTogJy0nLCB0b29sdGlwSHRtbDogJycgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0cyA9IFBieERhdGVUaW1lLnNlcnZlclN0cmluZ1RvVGltZXN0YW1wKGRhdGVTdHJpbmcpO1xuICAgICAgICBpZiAodHMgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGRpc3BsYXk6IGRhdGVTdHJpbmcsIHRvb2x0aXBIdG1sOiAnJyB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkaXNwbGF5OiBQYnhEYXRlVGltZS5mb3JtYXRTZXJ2ZXJUaW1lKHRzKSxcbiAgICAgICAgICAgIHRvb2x0aXBIdG1sOiBQYnhEYXRlVGltZS5idWlsZER1YWxUb29sdGlwSHRtbCh0cyksXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJpbmQgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBiaW5kRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gQWRkIHBhc3NrZXkgYnV0dG9uIChkZWxlZ2F0ZWQpXG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci5vbignY2xpY2snLCAnI2FkZC1wYXNza2V5LWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5yZWdpc3Rlck5ld1Bhc3NrZXkoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiAoZGVsZWdhdGVkKVxuICAgICAgICAvLyBPbmx5IHRyaWdnZXIgZGVsZXRpb24gb24gc2Vjb25kIGNsaWNrICh3aGVuIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgaXMgcmVtb3ZlZClcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLm9uKCdjbGljaycsICcuZGVsZXRlLXBhc3NrZXktYnRuOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IHBhc3NrZXlJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCdpZCcpO1xuICAgICAgICAgICAgR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuZGVsZXRlUGFzc2tleShwYXNza2V5SWQpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgcGFzc2tleSBuYW1lIGJhc2VkIG9uIGJyb3dzZXIgYW5kIGRldmljZSBpbmZvcm1hdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEdlbmVyYXRlZCBwYXNza2V5IG5hbWVcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVBhc3NrZXlOYW1lKCkge1xuICAgICAgICBjb25zdCB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgICAgIGxldCBicm93c2VyID0gJ0Jyb3dzZXInO1xuICAgICAgICBsZXQgb3MgPSAnVW5rbm93biBPUyc7XG4gICAgICAgIGxldCBkZXZpY2UgPSAnJztcblxuICAgICAgICAvLyBEZXRlY3QgYnJvd3NlclxuICAgICAgICBpZiAodWEuaW5kZXhPZignRWRnJykgPiAtMSkge1xuICAgICAgICAgICAgYnJvd3NlciA9ICdFZGdlJztcbiAgICAgICAgfSBlbHNlIGlmICh1YS5pbmRleE9mKCdDaHJvbWUnKSA+IC0xKSB7XG4gICAgICAgICAgICBicm93c2VyID0gJ0Nocm9tZSc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignU2FmYXJpJykgPiAtMSkge1xuICAgICAgICAgICAgYnJvd3NlciA9ICdTYWZhcmknO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ0ZpcmVmb3gnKSA+IC0xKSB7XG4gICAgICAgICAgICBicm93c2VyID0gJ0ZpcmVmb3gnO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ09wZXJhJykgPiAtMSB8fCB1YS5pbmRleE9mKCdPUFInKSA+IC0xKSB7XG4gICAgICAgICAgICBicm93c2VyID0gJ09wZXJhJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERldGVjdCBPU1xuICAgICAgICBpZiAodWEuaW5kZXhPZignV2luJykgPiAtMSkge1xuICAgICAgICAgICAgb3MgPSAnV2luZG93cyc7XG4gICAgICAgIH0gZWxzZSBpZiAodWEuaW5kZXhPZignTWFjJykgPiAtMSkge1xuICAgICAgICAgICAgb3MgPSAnbWFjT1MnO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ0xpbnV4JykgPiAtMSkge1xuICAgICAgICAgICAgb3MgPSAnTGludXgnO1xuICAgICAgICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoJ0FuZHJvaWQnKSA+IC0xKSB7XG4gICAgICAgICAgICBvcyA9ICdBbmRyb2lkJztcbiAgICAgICAgfSBlbHNlIGlmICh1YS5pbmRleE9mKCdpUGhvbmUnKSA+IC0xIHx8IHVhLmluZGV4T2YoJ2lQYWQnKSA+IC0xKSB7XG4gICAgICAgICAgICBvcyA9IHVhLmluZGV4T2YoJ2lQaG9uZScpID4gLTEgPyAnaVBob25lJyA6ICdpUGFkJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERldGVjdCBkZXZpY2UgdHlwZSBmb3IgbW9iaWxlXG4gICAgICAgIGlmICh1YS5pbmRleE9mKCdNb2JpbGUnKSA+IC0xICYmIG9zICE9PSAnQW5kcm9pZCcgJiYgb3MgIT09ICdpUGhvbmUnICYmIG9zICE9PSAnaVBhZCcpIHtcbiAgICAgICAgICAgIGRldmljZSA9ICcgTW9iaWxlJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIG5hbWVcbiAgICAgICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKS50b0xvY2FsZURhdGVTdHJpbmcoKTtcbiAgICAgICAgcmV0dXJuIGAke2Jyb3dzZXJ9IG9uICR7b3N9JHtkZXZpY2V9ICgke3RpbWVzdGFtcH0pYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgbmV3IHBhc3NrZXkgdXNpbmcgV2ViQXV0aG5cbiAgICAgKi9cbiAgICBhc3luYyByZWdpc3Rlck5ld1Bhc3NrZXkoKSB7XG4gICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc2tleSBuYW1lIGJhc2VkIG9uIGJyb3dzZXIvZGV2aWNlXG4gICAgICAgIGNvbnN0IHBhc3NrZXlOYW1lID0gR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuZ2VuZXJhdGVQYXNza2V5TmFtZSgpO1xuXG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjYWRkLXBhc3NrZXktYnV0dG9uJyk7XG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gU3RlcCAxOiBHZXQgY2hhbGxlbmdlIGZyb20gc2VydmVyXG4gICAgICAgICAgICBQYXNza2V5c0FQSS5yZWdpc3RyYXRpb25TdGFydChwYXNza2V5TmFtZSwgYXN5bmMgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RlcCAyOiBDYWxsIFdlYkF1dGhuIEFQSVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwdWJsaWNLZXlPcHRpb25zID0gR2VuZXJhbFNldHRpbmdzUGFzc2tleXMucHJlcGFyZUNyZWRlbnRpYWxDcmVhdGlvbk9wdGlvbnMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNyZWRlbnRpYWwgPSBhd2FpdCBuYXZpZ2F0b3IuY3JlZGVudGlhbHMuY3JlYXRlKHsgcHVibGljS2V5OiBwdWJsaWNLZXlPcHRpb25zIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0ZXAgMzogU2VuZCBhdHRlc3RhdGlvbiB0byBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXR0ZXN0YXRpb25EYXRhID0gR2VuZXJhbFNldHRpbmdzUGFzc2tleXMucHJlcGFyZUF0dGVzdGF0aW9uRGF0YShjcmVkZW50aWFsLCByZXNwb25zZS5kYXRhLCBwYXNza2V5TmFtZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgUGFzc2tleXNBUEkucmVnaXN0cmF0aW9uRmluaXNoKGF0dGVzdGF0aW9uRGF0YSwgKGZpbmlzaFJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaW5pc2hSZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5sb2FkUGFzc2tleXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGZpbmlzaFJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXZWJBdXRobiByZWdpc3RyYXRpb24gZXJyb3I6JywgZXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzcGVjaWZpYyBXZWJBdXRobiBlcnJvcnNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdOb3RBbGxvd2VkRXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGEgVExTIGNlcnRpZmljYXRlIGVycm9yIChDaHJvbWUtc3BlY2lmaWMpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IubWVzc2FnZSAmJiBlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdUTFMgY2VydGlmaWNhdGUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUucGtfVGxzQ2VydGlmaWNhdGVFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVzZXIgY2FuY2VsbGVkIHRoZSBvcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnBrX1JlZ2lzdGVyQ2FuY2VsbGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihgJHtnbG9iYWxUcmFuc2xhdGUucGtfUmVnaXN0ZXJFcnJvcn06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUmVnaXN0cmF0aW9uIHN0YXJ0IGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihgJHtnbG9iYWxUcmFuc2xhdGUucGtfUmVnaXN0ZXJFcnJvcn06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGNyZWRlbnRpYWwgY3JlYXRpb24gb3B0aW9ucyBmb3IgV2ViQXV0aG4gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNlcnZlckRhdGEgLSBEYXRhIGZyb20gc2VydmVyXG4gICAgICogQHJldHVybnMge29iamVjdH0gUHVibGljS2V5Q3JlZGVudGlhbENyZWF0aW9uT3B0aW9uc1xuICAgICAqL1xuICAgIHByZXBhcmVDcmVkZW50aWFsQ3JlYXRpb25PcHRpb25zKHNlcnZlckRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoYWxsZW5nZTogR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuYmFzZTY0dXJsVG9BcnJheUJ1ZmZlcihzZXJ2ZXJEYXRhLmNoYWxsZW5nZSksXG4gICAgICAgICAgICBycDogc2VydmVyRGF0YS5ycCxcbiAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBpZDogR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuYmFzZTY0dXJsVG9BcnJheUJ1ZmZlcihzZXJ2ZXJEYXRhLnVzZXIuaWQpLFxuICAgICAgICAgICAgICAgIG5hbWU6IHNlcnZlckRhdGEudXNlci5uYW1lLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiBzZXJ2ZXJEYXRhLnVzZXIuZGlzcGxheU5hbWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHViS2V5Q3JlZFBhcmFtczogc2VydmVyRGF0YS5wdWJLZXlDcmVkUGFyYW1zLFxuICAgICAgICAgICAgYXV0aGVudGljYXRvclNlbGVjdGlvbjogc2VydmVyRGF0YS5hdXRoZW50aWNhdG9yU2VsZWN0aW9uLFxuICAgICAgICAgICAgdGltZW91dDogc2VydmVyRGF0YS50aW1lb3V0IHx8IDYwMDAwLFxuICAgICAgICAgICAgYXR0ZXN0YXRpb246IHNlcnZlckRhdGEuYXR0ZXN0YXRpb24gfHwgJ25vbmUnLFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGF0dGVzdGF0aW9uIGRhdGEgdG8gc2VuZCB0byBzZXJ2ZXJcbiAgICAgKiBAcGFyYW0ge1B1YmxpY0tleUNyZWRlbnRpYWx9IGNyZWRlbnRpYWwgLSBDcmVkZW50aWFsIGZyb20gV2ViQXV0aG5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2VydmVyRGF0YSAtIE9yaWdpbmFsIHNlcnZlciBkYXRhIHdpdGggc2Vzc2lvbklkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3NrZXlOYW1lIC0gR2VuZXJhdGVkIHBhc3NrZXkgbmFtZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IEF0dGVzdGF0aW9uIGRhdGFcbiAgICAgKi9cbiAgICBwcmVwYXJlQXR0ZXN0YXRpb25EYXRhKGNyZWRlbnRpYWwsIHNlcnZlckRhdGEsIHBhc3NrZXlOYW1lKSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gY3JlZGVudGlhbC5yZXNwb25zZTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2Vzc2lvbklkOiBzZXJ2ZXJEYXRhLnNlc3Npb25JZCxcbiAgICAgICAgICAgIGNyZWRlbnRpYWxJZDogR2VuZXJhbFNldHRpbmdzUGFzc2tleXMuYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChjcmVkZW50aWFsLnJhd0lkKSxcbiAgICAgICAgICAgIG5hbWU6IHBhc3NrZXlOYW1lLFxuICAgICAgICAgICAgYXR0ZXN0YXRpb25PYmplY3Q6IEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLmFycmF5QnVmZmVyVG9CYXNlNjR1cmwocmVzcG9uc2UuYXR0ZXN0YXRpb25PYmplY3QpLFxuICAgICAgICAgICAgY2xpZW50RGF0YUpTT046IEdlbmVyYWxTZXR0aW5nc1Bhc3NrZXlzLmFycmF5QnVmZmVyVG9CYXNlNjR1cmwocmVzcG9uc2UuY2xpZW50RGF0YUpTT04pLFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgcGFzc2tleSAod2l0aG91dCBjb25maXJtYXRpb24gLSB1c2luZyB0d28tc3RlcHMtZGVsZXRlIG1lY2hhbmlzbSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc2tleUlkIC0gSUQgb2YgcGFzc2tleSB0byBkZWxldGVcbiAgICAgKi9cbiAgICBkZWxldGVQYXNza2V5KHBhc3NrZXlJZCkge1xuICAgICAgICBQYXNza2V5c0FQSS5kZWxldGVSZWNvcmQocGFzc2tleUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5sb2FkUGFzc2tleXMoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgYmFzZTY0dXJsIHN0cmluZyB0byBBcnJheUJ1ZmZlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlNjR1cmwgLSBCYXNlNjR1cmwgZW5jb2RlZCBzdHJpbmdcbiAgICAgKiBAcmV0dXJucyB7QXJyYXlCdWZmZXJ9XG4gICAgICovXG4gICAgYmFzZTY0dXJsVG9BcnJheUJ1ZmZlcihiYXNlNjR1cmwpIHtcbiAgICAgICAgY29uc3QgcGFkZGluZyA9ICc9Jy5yZXBlYXQoKDQgLSAoYmFzZTY0dXJsLmxlbmd0aCAlIDQpKSAlIDQpO1xuICAgICAgICBjb25zdCBiYXNlNjQgPSBiYXNlNjR1cmwucmVwbGFjZSgvLS9nLCAnKycpLnJlcGxhY2UoL18vZywgJy8nKSArIHBhZGRpbmc7XG4gICAgICAgIGNvbnN0IHJhd0RhdGEgPSB3aW5kb3cuYXRvYihiYXNlNjQpO1xuICAgICAgICBjb25zdCBvdXRwdXRBcnJheSA9IG5ldyBVaW50OEFycmF5KHJhd0RhdGEubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByYXdEYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBvdXRwdXRBcnJheVtpXSA9IHJhd0RhdGEuY2hhckNvZGVBdChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0cHV0QXJyYXkuYnVmZmVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IEFycmF5QnVmZmVyIHRvIGJhc2U2NHVybCBzdHJpbmdcbiAgICAgKiBAcGFyYW0ge0FycmF5QnVmZmVyfSBidWZmZXIgLSBBcnJheUJ1ZmZlciB0byBjb252ZXJ0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gQmFzZTY0dXJsIGVuY29kZWQgc3RyaW5nXG4gICAgICovXG4gICAgYXJyYXlCdWZmZXJUb0Jhc2U2NHVybChidWZmZXIpIHtcbiAgICAgICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICAgICAgICBsZXQgYmluYXJ5ID0gJyc7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnl0ZXMuYnl0ZUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBiaW5hcnkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmFzZTY0ID0gd2luZG93LmJ0b2EoYmluYXJ5KTtcbiAgICAgICAgcmV0dXJuIGJhc2U2NC5yZXBsYWNlKC9cXCsvZywgJy0nKS5yZXBsYWNlKC9cXC8vZywgJ18nKS5yZXBsYWNlKC89L2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgZm9yIHNhZmUgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IFRleHQgdG8gZXNjYXBlXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgbWFwID0ge1xuICAgICAgICAgICAgJyYnOiAnJmFtcDsnLFxuICAgICAgICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAgICAgICAnPic6ICcmZ3Q7JyxcbiAgICAgICAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgICAgICAgXCInXCI6ICcmIzAzOTsnXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoL1smPD5cIiddL2csIG0gPT4gbWFwW21dKTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBHZW5lcmFsU2V0dGluZ3NQYXNza2V5cy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==