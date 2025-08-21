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

/* global globalTranslate, ClipboardJS, UserMessage */

/**
 * SSH Keys Table Management Module
 * Handles display and management of SSH authorized keys in a table format
 */
var sshKeysTable = {
  /**
   * Array of SSH keys
   * @type {Array<{key: string, comment: string}>}
   */
  keys: [],

  /**
   * jQuery object for the table container
   * @type {jQuery}
   */
  $container: null,

  /**
   * jQuery object for the hidden input field
   * @type {jQuery}
   */
  $hiddenField: null,

  /**
   * Clipboard instance for copy functionality
   * @type {ClipboardJS}
   */
  clipboard: null,

  /**
   * Initialize the SSH keys table
   * 
   * @param {string} containerId Container element ID
   * @param {string} fieldId Hidden field ID
   */
  initialize: function initialize(containerId, fieldId) {
    this.$container = $("#".concat(containerId));
    this.$hiddenField = $("#".concat(fieldId));

    if (this.$container.length === 0 || this.$hiddenField.length === 0) {
      return;
    } // Parse existing value from textarea/hidden field


    this.parseExistingKeys(); // Render the table

    this.renderTable(); // Initialize clipboard

    this.initializeClipboard(); // Bind event handlers

    this.bindEventHandlers();
  },

  /**
   * Parse existing SSH keys from the hidden field
   */
  parseExistingKeys: function parseExistingKeys() {
    var _this = this;

    var existingValue = this.$hiddenField.val();

    if (!existingValue) {
      return;
    }

    var lines = existingValue.split('\n');
    this.keys = [];
    lines.forEach(function (line) {
      line = line.trim();

      if (line && !line.startsWith('#')) {
        // Store the full key line
        _this.keys.push({
          key: line
        });
      }
    });
  },

  /**
   * Render the SSH keys table
   */
  renderTable: function renderTable() {
    var _this2 = this;

    var html = "\n            <table class=\"ui very basic table\" id=\"ssh-keys-list\">\n                <tbody>\n        "; // Show existing keys

    this.keys.forEach(function (keyData, index) {
      var truncated = _this2.truncateSSHKey(keyData.key);

      html += "\n                <tr data-index=\"".concat(index, "\">\n                    <td class=\"ssh-key-cell\">\n                        <code style=\"font-size: 0.9em;\">").concat(truncated, "</code>\n                    </td>\n                    <td class=\"right aligned collapsing\">\n                        <div class=\"ui tiny basic icon buttons action-buttons\">\n                            <a class=\"ui button copy-key-btn\" \n                               data-clipboard-text=\"").concat(_this2.escapeHtml(keyData.key), "\"\n                               data-variation=\"basic\"\n                               data-content=\"").concat(globalTranslate.bt_ToolTipCopyKey || 'Copy', "\">\n                                <i class=\"copy icon blue\"></i>\n                            </a>\n                            <a class=\"ui button delete-key-btn\" \n                               data-index=\"").concat(index, "\"\n                               data-content=\"").concat(globalTranslate.bt_ToolTipDelete || 'Delete', "\">\n                                <i class=\"trash icon red\"></i>\n                            </a>\n                        </div>\n                    </td>\n                </tr>\n            ");
    }); // Add new key row (initially hidden, shown when add button clicked)

    html += "\n                <tr id=\"add-key-row\" style=\"display:none;\">\n                    <td colspan=\"2\">\n                        <div class=\"ui form\">\n                            <div class=\"field\">\n                                <textarea id=\"new-ssh-key\" rows=\"3\" \n                                    placeholder=\"".concat(globalTranslate.gs_SSHKeyPlaceholder || 'Paste one or more SSH keys (one per line):\nssh-rsa AAAAB3... user@host1\nssh-ed25519 AAAAC3... user@host2', "\"></textarea>\n                            </div>\n                            <div class=\"ui mini buttons\">\n                                <button class=\"ui positive button\" id=\"save-key-btn\">\n                                    <i class=\"check icon\"></i> ").concat(globalTranslate.bt_Add || 'Add', "\n                                </button>\n                                <button class=\"ui button\" id=\"cancel-key-btn\">\n                                    <i class=\"close icon\"></i> ").concat(globalTranslate.bt_Cancel || 'Cancel', "\n                                </button>\n                            </div>\n                        </div>\n                    </td>\n                </tr>\n                <tr id=\"add-button-row\">\n                    <td colspan=\"2\">\n                        <button class=\"ui mini basic button\" id=\"show-add-key-btn\">\n                            <i class=\"plus icon\"></i>\n                            ").concat(globalTranslate.gs_AddKey || 'Add SSH Key', "\n                        </button>\n                    </td>\n                </tr>\n                </tbody>\n            </table>\n        ");
    this.$container.html(html); // Initialize tooltips

    this.$container.find('[data-content]').popup();
  },

  /**
   * Truncate SSH key for display (preserves comment)
   * 
   * @param {string} key Full SSH key
   * @return {string} Truncated key with comment
   */
  truncateSSHKey: function truncateSSHKey(key) {
    if (!key || key.length < 50) {
      return key;
    }

    var parts = key.split(' ');

    if (parts.length >= 2) {
      var keyType = parts[0];
      var keyData = parts[1];
      var comment = parts.slice(2).join(' '); // Everything after key data is comment

      if (keyData.length > 40) {
        var truncated = keyData.substring(0, 20) + '...' + keyData.substring(keyData.length - 15); // Include comment if present

        return comment ? "".concat(keyType, " ").concat(truncated, " ").concat(comment) : "".concat(keyType, " ").concat(truncated);
      }
    }

    return key;
  },

  /**
   * Initialize clipboard functionality
   */
  initializeClipboard: function initializeClipboard() {
    if (this.clipboard) {
      this.clipboard.destroy();
    }

    this.clipboard = new ClipboardJS('.copy-key-btn');
    this.clipboard.on('success', function (e) {
      // Just visual feedback - change icon briefly
      var $icon = $(e.trigger).find('i');
      $icon.removeClass('copy').addClass('check green');
      setTimeout(function () {
        $icon.removeClass('check green').addClass('copy blue');
      }, 2000); // Clear selection

      e.clearSelection();
    });
    this.clipboard.on('error', function () {
      UserMessage.showError(globalTranslate.gs_CopyFailed || 'Failed to copy SSH key');
    });
  },

  /**
   * Bind event handlers
   */
  bindEventHandlers: function bindEventHandlers() {
    var _this3 = this;

    // Show add key form
    this.$container.on('click', '#show-add-key-btn', function (e) {
      e.preventDefault();
      $('#add-key-row').show();
      $('#add-button-row').hide();
      $('#new-ssh-key').focus();
    }); // Save new key

    this.$container.on('click', '#save-key-btn', function (e) {
      e.preventDefault();

      _this3.addKey();
    }); // Cancel add key

    this.$container.on('click', '#cancel-key-btn', function (e) {
      e.preventDefault();

      _this3.cancelAddKey();
    }); // Delete key button

    this.$container.on('click', '.delete-key-btn', function (e) {
      e.preventDefault();
      var index = parseInt($(e.currentTarget).data('index'));

      _this3.deleteKey(index);
    }); // Enter key in input saves the key

    this.$container.on('keydown', '#new-ssh-key', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();

        _this3.addKey();
      } else if (e.key === 'Escape') {
        e.preventDefault();

        _this3.cancelAddKey();
      }
    });
  },

  /**
   * Cancel adding a new key
   */
  cancelAddKey: function cancelAddKey() {
    $('#new-ssh-key').val('');
    $('#add-key-row').hide();
    $('#add-button-row').show();
  },

  /**
   * Add a new SSH key or multiple keys
   */
  addKey: function addKey() {
    var _this4 = this;

    var $input = $('#new-ssh-key');
    var inputValue = $input.val().trim();

    if (!inputValue) {
      // Just close the form if empty
      this.cancelAddKey();
      return;
    } // Parse multiple keys (split by newlines and filter out empty lines and comments)


    var lines = inputValue.split('\n');
    var newKeys = [];
    var invalidKeys = [];
    var duplicateKeys = [];
    lines.forEach(function (line) {
      line = line.trim(); // Skip empty lines and comments

      if (!line || line.startsWith('#')) {
        return;
      } // Validate SSH key format


      if (!_this4.isValidSSHKey(line)) {
        invalidKeys.push(line.substring(0, 50) + (line.length > 50 ? '...' : ''));
        return;
      } // Check for duplicates


      if (_this4.keys.some(function (k) {
        return k.key === line;
      })) {
        duplicateKeys.push(_this4.truncateSSHKey(line));
        return;
      } // Check for duplicates within the new keys being added


      if (newKeys.some(function (k) {
        return k.key === line;
      })) {
        duplicateKeys.push(_this4.truncateSSHKey(line));
        return;
      }

      newKeys.push({
        key: line
      });
    }); // Show errors if any

    if (invalidKeys.length > 0) {
      var message = (globalTranslate.gs_InvalidKeyFormat || 'Invalid SSH key format') + ': ' + invalidKeys.join(', ');
      UserMessage.showError(message);
      $input.focus();
      return;
    }

    if (duplicateKeys.length > 0 && newKeys.length === 0) {
      var _message = (globalTranslate.gs_KeyAlreadyExists || 'These SSH keys already exist') + ': ' + duplicateKeys.join(', ');

      UserMessage.showError(_message);
      $input.focus();
      return;
    } // Add all valid new keys


    if (newKeys.length > 0) {
      var _this$keys;

      (_this$keys = this.keys).push.apply(_this$keys, newKeys); // Update hidden field


      this.updateHiddenField(); // Re-render table

      this.renderTable(); // Re-initialize clipboard for new buttons

      this.initializeClipboard(); // Show info about duplicates if any were skipped

      if (duplicateKeys.length > 0) {
        var _message2 = "".concat(globalTranslate.gs_KeysAdded || 'Added', " ").concat(newKeys.length, " ").concat(globalTranslate.gs_Keys || 'key(s)', ". ") + "".concat(globalTranslate.gs_SkippedDuplicates || 'Skipped duplicates', ": ").concat(duplicateKeys.length);

        UserMessage.showInformation(_message2);
      }
    } else if (duplicateKeys.length > 0) {
      // All keys were duplicates
      var _message3 = globalTranslate.gs_AllKeysAlreadyExist || 'All provided SSH keys already exist';

      UserMessage.showError(_message3);
      $input.focus();
    }
  },

  /**
   * Delete an SSH key
   * 
   * @param {number} index Key index to delete
   */
  deleteKey: function deleteKey(index) {
    if (index < 0 || index >= this.keys.length) {
      return;
    } // Remove from array


    this.keys.splice(index, 1); // Update hidden field

    this.updateHiddenField(); // Re-render table

    this.renderTable(); // Re-initialize clipboard for remaining buttons

    this.initializeClipboard();
  },

  /**
   * Update the hidden field with current keys
   */
  updateHiddenField: function updateHiddenField() {
    var lines = this.keys.map(function (keyData) {
      return keyData.key;
    });
    this.$hiddenField.val(lines.join('\n')); // Trigger change event for form validation

    this.$hiddenField.trigger('change'); // Also trigger Form.checkValues() if it exists to enable save button

    if (typeof Form !== 'undefined' && Form.checkValues) {
      Form.checkValues();
    }
  },

  /**
   * Validate SSH key format
   * 
   * @param {string} key SSH key string
   * @return {boolean} True if valid
   */
  isValidSSHKey: function isValidSSHKey(key) {
    var sshKeyRegex = /^(ssh-rsa|ssh-dss|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\s+[A-Za-z0-9+/]+[=]{0,2}(\s+.+)?$/;
    return sshKeyRegex.test(key.trim());
  },

  /**
   * Escape HTML for safe display
   * 
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
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3Mvc3NoLWtleXMtdGFibGUuanMiXSwibmFtZXMiOlsic3NoS2V5c1RhYmxlIiwia2V5cyIsIiRjb250YWluZXIiLCIkaGlkZGVuRmllbGQiLCJjbGlwYm9hcmQiLCJpbml0aWFsaXplIiwiY29udGFpbmVySWQiLCJmaWVsZElkIiwiJCIsImxlbmd0aCIsInBhcnNlRXhpc3RpbmdLZXlzIiwicmVuZGVyVGFibGUiLCJpbml0aWFsaXplQ2xpcGJvYXJkIiwiYmluZEV2ZW50SGFuZGxlcnMiLCJleGlzdGluZ1ZhbHVlIiwidmFsIiwibGluZXMiLCJzcGxpdCIsImZvckVhY2giLCJsaW5lIiwidHJpbSIsInN0YXJ0c1dpdGgiLCJwdXNoIiwia2V5IiwiaHRtbCIsImtleURhdGEiLCJpbmRleCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiZXNjYXBlSHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsImJ0X1Rvb2xUaXBDb3B5S2V5IiwiYnRfVG9vbFRpcERlbGV0ZSIsImdzX1NTSEtleVBsYWNlaG9sZGVyIiwiYnRfQWRkIiwiYnRfQ2FuY2VsIiwiZ3NfQWRkS2V5IiwiZmluZCIsInBvcHVwIiwicGFydHMiLCJrZXlUeXBlIiwiY29tbWVudCIsInNsaWNlIiwiam9pbiIsInN1YnN0cmluZyIsImRlc3Ryb3kiLCJDbGlwYm9hcmRKUyIsIm9uIiwiZSIsIiRpY29uIiwidHJpZ2dlciIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJzZXRUaW1lb3V0IiwiY2xlYXJTZWxlY3Rpb24iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdzX0NvcHlGYWlsZWQiLCJwcmV2ZW50RGVmYXVsdCIsInNob3ciLCJoaWRlIiwiZm9jdXMiLCJhZGRLZXkiLCJjYW5jZWxBZGRLZXkiLCJwYXJzZUludCIsImN1cnJlbnRUYXJnZXQiLCJkYXRhIiwiZGVsZXRlS2V5IiwiJGlucHV0IiwiaW5wdXRWYWx1ZSIsIm5ld0tleXMiLCJpbnZhbGlkS2V5cyIsImR1cGxpY2F0ZUtleXMiLCJpc1ZhbGlkU1NIS2V5Iiwic29tZSIsImsiLCJtZXNzYWdlIiwiZ3NfSW52YWxpZEtleUZvcm1hdCIsImdzX0tleUFscmVhZHlFeGlzdHMiLCJ1cGRhdGVIaWRkZW5GaWVsZCIsImdzX0tleXNBZGRlZCIsImdzX0tleXMiLCJnc19Ta2lwcGVkRHVwbGljYXRlcyIsInNob3dJbmZvcm1hdGlvbiIsImdzX0FsbEtleXNBbHJlYWR5RXhpc3QiLCJzcGxpY2UiLCJtYXAiLCJGb3JtIiwiY2hlY2tWYWx1ZXMiLCJzc2hLZXlSZWdleCIsInRlc3QiLCJ0ZXh0IiwicmVwbGFjZSIsIm0iXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxJQUFJLEVBQUUsRUFMVzs7QUFPakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLElBWEs7O0FBYWpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQWpCRzs7QUFtQmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQXZCTTs7QUF5QmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQS9CaUIsc0JBK0JOQyxXQS9CTSxFQStCT0MsT0EvQlAsRUErQmdCO0FBQzdCLFNBQUtMLFVBQUwsR0FBa0JNLENBQUMsWUFBS0YsV0FBTCxFQUFuQjtBQUNBLFNBQUtILFlBQUwsR0FBb0JLLENBQUMsWUFBS0QsT0FBTCxFQUFyQjs7QUFFQSxRQUFJLEtBQUtMLFVBQUwsQ0FBZ0JPLE1BQWhCLEtBQTJCLENBQTNCLElBQWdDLEtBQUtOLFlBQUwsQ0FBa0JNLE1BQWxCLEtBQTZC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QUFWLENBQWMsVUFBQTdELE9BQU87QUFBQSxhQUFJQSxPQUFPLENBQUNGLEdBQVo7QUFBQSxLQUFyQixDQUFkO0FBRUEsU0FBS3BCLFlBQUwsQ0FBa0JZLEdBQWxCLENBQXNCQyxLQUFLLENBQUMyQixJQUFOLENBQVcsSUFBWCxDQUF0QixFQUhnQixDQUtoQjs7QUFDQSxTQUFLeEMsWUFBTCxDQUFrQitDLE9BQWxCLENBQTBCLFFBQTFCLEVBTmdCLENBUWhCOztBQUNBLFFBQUksT0FBT3FDLElBQVAsS0FBZ0IsV0FBaEIsSUFBK0JBLElBQUksQ0FBQ0MsV0FBeEMsRUFBcUQ7QUFDakRELE1BQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNIO0FBQ0osR0FuWWdCOztBQXFZakI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lmLEVBQUFBLGFBM1lpQix5QkEyWUhsRCxHQTNZRyxFQTJZRTtBQUNmLFFBQU1rRSxXQUFXLEdBQUcsOEhBQXBCO0FBQ0EsV0FBT0EsV0FBVyxDQUFDQyxJQUFaLENBQWlCbkUsR0FBRyxDQUFDSCxJQUFKLEVBQWpCLENBQVA7QUFDSCxHQTlZZ0I7O0FBZ1pqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsVUF0WmlCLHNCQXNaTjhELElBdFpNLEVBc1pBO0FBQ2IsUUFBTUwsR0FBRyxHQUFHO0FBQ1IsV0FBSyxPQURHO0FBRVIsV0FBSyxNQUZHO0FBR1IsV0FBSyxNQUhHO0FBSVIsV0FBSyxRQUpHO0FBS1IsV0FBSztBQUxHLEtBQVo7QUFPQSxXQUFPSyxJQUFJLENBQUNDLE9BQUwsQ0FBYSxVQUFiLEVBQXlCLFVBQUFDLENBQUM7QUFBQSxhQUFJUCxHQUFHLENBQUNPLENBQUQsQ0FBUDtBQUFBLEtBQTFCLENBQVA7QUFDSDtBQS9aZ0IsQ0FBckIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBDbGlwYm9hcmRKUywgVXNlck1lc3NhZ2UgKi9cblxuLyoqXG4gKiBTU0ggS2V5cyBUYWJsZSBNYW5hZ2VtZW50IE1vZHVsZVxuICogSGFuZGxlcyBkaXNwbGF5IGFuZCBtYW5hZ2VtZW50IG9mIFNTSCBhdXRob3JpemVkIGtleXMgaW4gYSB0YWJsZSBmb3JtYXRcbiAqL1xuY29uc3Qgc3NoS2V5c1RhYmxlID0ge1xuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIFNTSCBrZXlzXG4gICAgICogQHR5cGUge0FycmF5PHtrZXk6IHN0cmluZywgY29tbWVudDogc3RyaW5nfT59XG4gICAgICovXG4gICAga2V5czogW10sXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYmxlIGNvbnRhaW5lclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNvbnRhaW5lcjogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaGlkZGVuIGlucHV0IGZpZWxkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkaGlkZGVuRmllbGQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xpcGJvYXJkIGluc3RhbmNlIGZvciBjb3B5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKiBAdHlwZSB7Q2xpcGJvYXJkSlN9XG4gICAgICovXG4gICAgY2xpcGJvYXJkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIFNTSCBrZXlzIHRhYmxlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRhaW5lcklkIENvbnRhaW5lciBlbGVtZW50IElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgSGlkZGVuIGZpZWxkIElEXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZShjb250YWluZXJJZCwgZmllbGRJZCkge1xuICAgICAgICB0aGlzLiRjb250YWluZXIgPSAkKGAjJHtjb250YWluZXJJZH1gKTtcbiAgICAgICAgdGhpcy4kaGlkZGVuRmllbGQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuJGNvbnRhaW5lci5sZW5ndGggPT09IDAgfHwgdGhpcy4kaGlkZGVuRmllbGQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBhcnNlIGV4aXN0aW5nIHZhbHVlIGZyb20gdGV4dGFyZWEvaGlkZGVuIGZpZWxkXG4gICAgICAgIHRoaXMucGFyc2VFeGlzdGluZ0tleXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbmRlciB0aGUgdGFibGVcbiAgICAgICAgdGhpcy5yZW5kZXJUYWJsZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjbGlwYm9hcmRcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBCaW5kIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIHRoaXMuYmluZEV2ZW50SGFuZGxlcnMoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBhcnNlIGV4aXN0aW5nIFNTSCBrZXlzIGZyb20gdGhlIGhpZGRlbiBmaWVsZFxuICAgICAqL1xuICAgIHBhcnNlRXhpc3RpbmdLZXlzKCkge1xuICAgICAgICBjb25zdCBleGlzdGluZ1ZhbHVlID0gdGhpcy4kaGlkZGVuRmllbGQudmFsKCk7XG4gICAgICAgIGlmICghZXhpc3RpbmdWYWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsaW5lcyA9IGV4aXN0aW5nVmFsdWUuc3BsaXQoJ1xcbicpO1xuICAgICAgICB0aGlzLmtleXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGxpbmVzLmZvckVhY2gobGluZSA9PiB7XG4gICAgICAgICAgICBsaW5lID0gbGluZS50cmltKCk7XG4gICAgICAgICAgICBpZiAobGluZSAmJiAhbGluZS5zdGFydHNXaXRoKCcjJykpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgZnVsbCBrZXkgbGluZVxuICAgICAgICAgICAgICAgIHRoaXMua2V5cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAga2V5OiBsaW5lXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHRoZSBTU0gga2V5cyB0YWJsZVxuICAgICAqL1xuICAgIHJlbmRlclRhYmxlKCkge1xuICAgICAgICBsZXQgaHRtbCA9IGBcbiAgICAgICAgICAgIDx0YWJsZSBjbGFzcz1cInVpIHZlcnkgYmFzaWMgdGFibGVcIiBpZD1cInNzaC1rZXlzLWxpc3RcIj5cbiAgICAgICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGV4aXN0aW5nIGtleXNcbiAgICAgICAgdGhpcy5rZXlzLmZvckVhY2goKGtleURhdGEsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSB0aGlzLnRydW5jYXRlU1NIS2V5KGtleURhdGEua2V5KTtcbiAgICAgICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDx0ciBkYXRhLWluZGV4PVwiJHtpbmRleH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwic3NoLWtleS1jZWxsXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8Y29kZSBzdHlsZT1cImZvbnQtc2l6ZTogMC45ZW07XCI+JHt0cnVuY2F0ZWR9PC9jb2RlPlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55IGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwidWkgYnV0dG9uIGNvcHkta2V5LWJ0blwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke3RoaXMuZXNjYXBlSHRtbChrZXlEYXRhLmtleSl9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cImJhc2ljXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weUtleSB8fCAnQ29weSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29weSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZS1rZXktYnRuXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1pbmRleD1cIiR7aW5kZXh9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlIHx8ICdEZWxldGUnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInRyYXNoIGljb24gcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBuZXcga2V5IHJvdyAoaW5pdGlhbGx5IGhpZGRlbiwgc2hvd24gd2hlbiBhZGQgYnV0dG9uIGNsaWNrZWQpXG4gICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDx0ciBpZD1cImFkZC1rZXktcm93XCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjb2xzcGFuPVwiMlwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGZvcm1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGlkPVwibmV3LXNzaC1rZXlcIiByb3dzPVwiM1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCIke2dsb2JhbFRyYW5zbGF0ZS5nc19TU0hLZXlQbGFjZWhvbGRlciB8fCAnUGFzdGUgb25lIG9yIG1vcmUgU1NIIGtleXMgKG9uZSBwZXIgbGluZSk6XFxuc3NoLXJzYSBBQUFBQjMuLi4gdXNlckBob3N0MVxcbnNzaC1lZDI1NTE5IEFBQUFDMy4uLiB1c2VyQGhvc3QyJ31cIj48L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtaW5pIGJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIHBvc2l0aXZlIGJ1dHRvblwiIGlkPVwic2F2ZS1rZXktYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X0FkZCB8fCAnQWRkJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b25cIiBpZD1cImNhbmNlbC1rZXktYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNsb3NlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X0NhbmNlbCB8fCAnQ2FuY2VsJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIDx0ciBpZD1cImFkZC1idXR0b24tcm93XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjb2xzcGFuPVwiMlwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIG1pbmkgYmFzaWMgYnV0dG9uXCIgaWQ9XCJzaG93LWFkZC1rZXktYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJwbHVzIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfQWRkS2V5IHx8ICdBZGQgU1NIIEtleSd9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLmh0bWwoaHRtbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUcnVuY2F0ZSBTU0gga2V5IGZvciBkaXNwbGF5IChwcmVzZXJ2ZXMgY29tbWVudClcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IEZ1bGwgU1NIIGtleVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVHJ1bmNhdGVkIGtleSB3aXRoIGNvbW1lbnRcbiAgICAgKi9cbiAgICB0cnVuY2F0ZVNTSEtleShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkgfHwga2V5Lmxlbmd0aCA8IDUwKSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdCgnICcpO1xuICAgICAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleVR5cGUgPSBwYXJ0c1swXTtcbiAgICAgICAgICAgIGNvbnN0IGtleURhdGEgPSBwYXJ0c1sxXTtcbiAgICAgICAgICAgIGNvbnN0IGNvbW1lbnQgPSBwYXJ0cy5zbGljZSgyKS5qb2luKCcgJyk7IC8vIEV2ZXJ5dGhpbmcgYWZ0ZXIga2V5IGRhdGEgaXMgY29tbWVudFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5RGF0YS5sZW5ndGggPiA0MCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZCA9IGtleURhdGEuc3Vic3RyaW5nKDAsIDIwKSArICcuLi4nICsga2V5RGF0YS5zdWJzdHJpbmcoa2V5RGF0YS5sZW5ndGggLSAxNSk7XG4gICAgICAgICAgICAgICAgLy8gSW5jbHVkZSBjb21tZW50IGlmIHByZXNlbnRcbiAgICAgICAgICAgICAgICByZXR1cm4gY29tbWVudCA/IGAke2tleVR5cGV9ICR7dHJ1bmNhdGVkfSAke2NvbW1lbnR9YCA6IGAke2tleVR5cGV9ICR7dHJ1bmNhdGVkfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNsaXBib2FyZCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICB0aGlzLmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY29weS1rZXktYnRuJyk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBKdXN0IHZpc3VhbCBmZWVkYmFjayAtIGNoYW5nZSBpY29uIGJyaWVmbHlcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlLnRyaWdnZXIpLmZpbmQoJ2knKTtcbiAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdjb3B5JykuYWRkQ2xhc3MoJ2NoZWNrIGdyZWVuJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnY2hlY2sgZ3JlZW4nKS5hZGRDbGFzcygnY29weSBibHVlJyk7XG4gICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgc2VsZWN0aW9uXG4gICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5jbGlwYm9hcmQub24oJ2Vycm9yJywgKCkgPT4ge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5nc19Db3B5RmFpbGVkIHx8ICdGYWlsZWQgdG8gY29weSBTU0gga2V5Jyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQmluZCBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGJpbmRFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBTaG93IGFkZCBrZXkgZm9ybVxuICAgICAgICB0aGlzLiRjb250YWluZXIub24oJ2NsaWNrJywgJyNzaG93LWFkZC1rZXktYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJyNhZGQta2V5LXJvdycpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNhZGQtYnV0dG9uLXJvdycpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNuZXctc3NoLWtleScpLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSBuZXcga2V5XG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci5vbignY2xpY2snLCAnI3NhdmUta2V5LWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLmFkZEtleSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbmNlbCBhZGQga2V5XG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci5vbignY2xpY2snLCAnI2NhbmNlbC1rZXktYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMuY2FuY2VsQWRkS2V5KCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVsZXRlIGtleSBidXR0b25cbiAgICAgICAgdGhpcy4kY29udGFpbmVyLm9uKCdjbGljaycsICcuZGVsZXRlLWtleS1idG4nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBwYXJzZUludCgkKGUuY3VycmVudFRhcmdldCkuZGF0YSgnaW5kZXgnKSk7XG4gICAgICAgICAgICB0aGlzLmRlbGV0ZUtleShpbmRleCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRW50ZXIga2V5IGluIGlucHV0IHNhdmVzIHRoZSBrZXlcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLm9uKCdrZXlkb3duJywgJyNuZXctc3NoLWtleScsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRLZXkoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09ICdFc2NhcGUnKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsQWRkS2V5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FuY2VsIGFkZGluZyBhIG5ldyBrZXlcbiAgICAgKi9cbiAgICBjYW5jZWxBZGRLZXkoKSB7XG4gICAgICAgICQoJyNuZXctc3NoLWtleScpLnZhbCgnJyk7XG4gICAgICAgICQoJyNhZGQta2V5LXJvdycpLmhpZGUoKTtcbiAgICAgICAgJCgnI2FkZC1idXR0b24tcm93Jykuc2hvdygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IFNTSCBrZXkgb3IgbXVsdGlwbGUga2V5c1xuICAgICAqL1xuICAgIGFkZEtleSgpIHtcbiAgICAgICAgY29uc3QgJGlucHV0ID0gJCgnI25ldy1zc2gta2V5Jyk7XG4gICAgICAgIGNvbnN0IGlucHV0VmFsdWUgPSAkaW5wdXQudmFsKCkudHJpbSgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFpbnB1dFZhbHVlKSB7XG4gICAgICAgICAgICAvLyBKdXN0IGNsb3NlIHRoZSBmb3JtIGlmIGVtcHR5XG4gICAgICAgICAgICB0aGlzLmNhbmNlbEFkZEtleSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQYXJzZSBtdWx0aXBsZSBrZXlzIChzcGxpdCBieSBuZXdsaW5lcyBhbmQgZmlsdGVyIG91dCBlbXB0eSBsaW5lcyBhbmQgY29tbWVudHMpXG4gICAgICAgIGNvbnN0IGxpbmVzID0gaW5wdXRWYWx1ZS5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGNvbnN0IG5ld0tleXMgPSBbXTtcbiAgICAgICAgY29uc3QgaW52YWxpZEtleXMgPSBbXTtcbiAgICAgICAgY29uc3QgZHVwbGljYXRlS2V5cyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgbGluZXMuZm9yRWFjaChsaW5lID0+IHtcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLnRyaW0oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2tpcCBlbXB0eSBsaW5lcyBhbmQgY29tbWVudHNcbiAgICAgICAgICAgIGlmICghbGluZSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyMnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgU1NIIGtleSBmb3JtYXRcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1ZhbGlkU1NIS2V5KGxpbmUpKSB7XG4gICAgICAgICAgICAgICAgaW52YWxpZEtleXMucHVzaChsaW5lLnN1YnN0cmluZygwLCA1MCkgKyAobGluZS5sZW5ndGggPiA1MCA/ICcuLi4nIDogJycpKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBkdXBsaWNhdGVzXG4gICAgICAgICAgICBpZiAodGhpcy5rZXlzLnNvbWUoayA9PiBrLmtleSA9PT0gbGluZSkpIHtcbiAgICAgICAgICAgICAgICBkdXBsaWNhdGVLZXlzLnB1c2godGhpcy50cnVuY2F0ZVNTSEtleShsaW5lKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgZHVwbGljYXRlcyB3aXRoaW4gdGhlIG5ldyBrZXlzIGJlaW5nIGFkZGVkXG4gICAgICAgICAgICBpZiAobmV3S2V5cy5zb21lKGsgPT4gay5rZXkgPT09IGxpbmUpKSB7XG4gICAgICAgICAgICAgICAgZHVwbGljYXRlS2V5cy5wdXNoKHRoaXMudHJ1bmNhdGVTU0hLZXkobGluZSkpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbmV3S2V5cy5wdXNoKHtcbiAgICAgICAgICAgICAgICBrZXk6IGxpbmVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgZXJyb3JzIGlmIGFueVxuICAgICAgICBpZiAoaW52YWxpZEtleXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IChnbG9iYWxUcmFuc2xhdGUuZ3NfSW52YWxpZEtleUZvcm1hdCB8fCAnSW52YWxpZCBTU0gga2V5IGZvcm1hdCcpICsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnOiAnICsgaW52YWxpZEtleXMuam9pbignLCAnKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgICAgICRpbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZHVwbGljYXRlS2V5cy5sZW5ndGggPiAwICYmIG5ld0tleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gKGdsb2JhbFRyYW5zbGF0ZS5nc19LZXlBbHJlYWR5RXhpc3RzIHx8ICdUaGVzZSBTU0gga2V5cyBhbHJlYWR5IGV4aXN0JykgKyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICc6ICcgKyBkdXBsaWNhdGVLZXlzLmpvaW4oJywgJyk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZSk7XG4gICAgICAgICAgICAkaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFsbCB2YWxpZCBuZXcga2V5c1xuICAgICAgICBpZiAobmV3S2V5cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLmtleXMucHVzaCguLi5uZXdLZXlzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBmaWVsZFxuICAgICAgICAgICAgdGhpcy51cGRhdGVIaWRkZW5GaWVsZCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZS1yZW5kZXIgdGFibGVcbiAgICAgICAgICAgIHRoaXMucmVuZGVyVGFibGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIG5ldyBidXR0b25zXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVDbGlwYm9hcmQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBpbmZvIGFib3V0IGR1cGxpY2F0ZXMgaWYgYW55IHdlcmUgc2tpcHBlZFxuICAgICAgICAgICAgaWYgKGR1cGxpY2F0ZUtleXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfS2V5c0FkZGVkIHx8ICdBZGRlZCd9ICR7bmV3S2V5cy5sZW5ndGh9ICR7Z2xvYmFsVHJhbnNsYXRlLmdzX0tleXMgfHwgJ2tleShzKSd9LiBgICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfU2tpcHBlZER1cGxpY2F0ZXMgfHwgJ1NraXBwZWQgZHVwbGljYXRlcyd9OiAke2R1cGxpY2F0ZUtleXMubGVuZ3RofWA7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGR1cGxpY2F0ZUtleXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxsIGtleXMgd2VyZSBkdXBsaWNhdGVzXG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbEtleXNBbHJlYWR5RXhpc3QgfHwgJ0FsbCBwcm92aWRlZCBTU0gga2V5cyBhbHJlYWR5IGV4aXN0JztcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgICAgICRpbnB1dC5mb2N1cygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWxldGUgYW4gU1NIIGtleVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCBLZXkgaW5kZXggdG8gZGVsZXRlXG4gICAgICovXG4gICAgZGVsZXRlS2V5KGluZGV4KSB7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPj0gdGhpcy5rZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgZnJvbSBhcnJheVxuICAgICAgICB0aGlzLmtleXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gZmllbGRcbiAgICAgICAgdGhpcy51cGRhdGVIaWRkZW5GaWVsZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtcmVuZGVyIHRhYmxlXG4gICAgICAgIHRoaXMucmVuZGVyVGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2xpcGJvYXJkIGZvciByZW1haW5pbmcgYnV0dG9uc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDbGlwYm9hcmQoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgaGlkZGVuIGZpZWxkIHdpdGggY3VycmVudCBrZXlzXG4gICAgICovXG4gICAgdXBkYXRlSGlkZGVuRmllbGQoKSB7XG4gICAgICAgIGNvbnN0IGxpbmVzID0gdGhpcy5rZXlzLm1hcChrZXlEYXRhID0+IGtleURhdGEua2V5KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuJGhpZGRlbkZpZWxkLnZhbChsaW5lcy5qb2luKCdcXG4nKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCBmb3IgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIHRoaXMuJGhpZGRlbkZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWxzbyB0cmlnZ2VyIEZvcm0uY2hlY2tWYWx1ZXMoKSBpZiBpdCBleGlzdHMgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSBTU0gga2V5IGZvcm1hdFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgU1NIIGtleSBzdHJpbmdcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufSBUcnVlIGlmIHZhbGlkXG4gICAgICovXG4gICAgaXNWYWxpZFNTSEtleShrZXkpIHtcbiAgICAgICAgY29uc3Qgc3NoS2V5UmVnZXggPSAvXihzc2gtcnNhfHNzaC1kc3N8c3NoLWVkMjU1MTl8ZWNkc2Etc2hhMi1uaXN0cDI1NnxlY2RzYS1zaGEyLW5pc3RwMzg0fGVjZHNhLXNoYTItbmlzdHA1MjEpXFxzK1tBLVphLXowLTkrL10rWz1dezAsMn0oXFxzKy4rKT8kLztcbiAgICAgICAgcmV0dXJuIHNzaEtleVJlZ2V4LnRlc3Qoa2V5LnRyaW0oKSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCBmb3Igc2FmZSBkaXNwbGF5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBtYXAgPSB7XG4gICAgICAgICAgICAnJic6ICcmYW1wOycsXG4gICAgICAgICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICAgICAgICc+JzogJyZndDsnLFxuICAgICAgICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICAgICAgICBcIidcIjogJyYjMDM5OydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZSgvWyY8PlwiJ10vZywgbSA9PiBtYXBbbV0pO1xuICAgIH1cbn07Il19