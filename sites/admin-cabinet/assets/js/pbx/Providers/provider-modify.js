"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, $, ClipboardJS */

/**
 * Object for handling provider management form
 *
 * @module provider
 */
var provider = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#save-provider-form'),

  /**
   * jQuery object for the secret field.
   * @type {jQuery}
   */
  $secret: $('#secret'),
  $additionalHostsDummy: $('#additional-hosts-table .dummy'),
  providerType: $('#providerType').val(),
  $checkBoxes: $('#save-provider-form .checkbox'),
  $accordions: $('#save-provider-form .ui.accordion'),
  $dropDowns: $('#save-provider-form .ui.dropdown'),
  $deleteRowButton: $('#additional-hosts-table .delete-row-button'),
  $qualifyToggle: $('#qualify'),
  $qualifyFreqToggle: $('#qualify-freq'),
  $additionalHostInput: $('#additional-host input'),
  hostInputValidation: /^((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\/(\d|[1-2]\d|3[0-2]))?|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+)$/gm,
  hostRow: '#save-provider-form .host-row',

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    description: {
      identifier: 'description',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
      }]
    },
    host: {
      identifier: 'host',
      rules: [{
        type: 'checkHostProvider',
        prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
      }]
    },
    username: {
      identifier: 'username',
      optional: true,
      rules: [{
        type: 'minLength[2]',
        prompt: globalTranslate.pr_ValidationProviderLoginNotSingleSimbol
      }]
    },
    port: {
      identifier: 'port',
      rules: [{
        type: 'integer[1..65535]',
        prompt: globalTranslate.pr_ValidationProviderPortRange
      }]
    }
  },

  /**
   * Generate password based on provider type
   * @returns {string} Generated password
   */
  generatePassword: function generatePassword() {
    if (provider.providerType === 'SIP') {
      return provider.generateSipPassword();
    } else if (provider.providerType === 'IAX') {
      return provider.generateIaxPassword();
    }

    return provider.generateSipPassword(); // Default fallback
  },

  /**
   * Generate SIP password (base64-safe characters, 16 chars)
   * @param {number} length Password length
   * @returns {string} Generated password
   */
  generateSipPassword: function generateSipPassword() {
    var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 16;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    var password = '';

    for (var i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  },

  /**
   * Generate IAX password (hex characters, 32 chars)
   * @param {number} length Password length
   * @returns {string} Generated password
   */
  generateIaxPassword: function generateIaxPassword() {
    var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 32;
    var chars = 'abcdef0123456789';
    var password = '';

    for (var i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  },

  /**
   * Initialize IAX warning message handling
   */
  initializeIaxWarningMessage: function initializeIaxWarningMessage() {
    var $warningMessage = $('#elReceiveCalls').next('.warning.message');
    var $checkboxInput = $('#receive_calls_without_auth'); // Function to update warning message state

    function updateWarningState() {
      if ($checkboxInput.prop('checked')) {
        $warningMessage.removeClass('hidden');
      } else {
        $warningMessage.addClass('hidden');
      }
    } // Initialize warning state


    updateWarningState(); // Handle checkbox changes - using the already initialized checkbox

    $('#receive_calls_without_auth.checkbox').checkbox({
      onChecked: function onChecked() {
        $warningMessage.removeClass('hidden').transition('fade in');
      },
      onUnchecked: function onUnchecked() {
        $warningMessage.transition('fade out', function () {
          $warningMessage.addClass('hidden');
        });
      }
    }); // Re-initialize warning state when accordion opens

    provider.$accordions.accordion({
      onOpen: function onOpen() {
        // Small delay to ensure DOM is settled
        setTimeout(updateWarningState, 50);
      }
    });
  },

  /**
   * Initialize the provider form.
   */
  initialize: function initialize() {
    provider.$checkBoxes.checkbox();
    provider.$dropDowns.dropdown();
    provider.updateHostsTableView(); // Initialize accordion separately for IAX

    if (provider.providerType !== 'IAX') {
      provider.$accordions.accordion();
    }
    /**
     * Callback function called when the qualify toggle changes.
     */


    provider.$qualifyToggle.checkbox({
      onChange: function onChange() {
        if (provider.$qualifyToggle.checkbox('is checked')) {
          provider.$qualifyFreqToggle.removeClass('disabled');
        } else {
          provider.$qualifyFreqToggle.addClass('disabled');
        }
      }
    }); // Add new string to additional-hosts-table table

    provider.$additionalHostInput.keypress(function (e) {
      if (e.which === 13) {
        provider.cbOnCompleteHostAddress();
      }
    }); // Delete host from additional-hosts-table

    provider.$deleteRowButton.on('click', function (e) {
      e.preventDefault();
      $(e.target).closest('tr').remove();
      provider.updateHostsTableView();
      Form.dataChanged();
      return false;
    });
    provider.initializeForm();
    provider.updateVisibilityElements();
    $('#registration_type').on('change', provider.updateVisibilityElements); // Trigger initial update for IAX providers

    if (provider.providerType === 'IAX') {
      provider.updateVisibilityElements();
      provider.initializeIaxWarningMessage();
    }

    $('#disablefromuser input').on('change', provider.updateVisibilityElements); // Show/hide password toggle

    $('#show-hide-password').on('click', function (e) {
      e.preventDefault();
      var $button = $(e.currentTarget);
      var $icon = $button.find('i');

      if (provider.$secret.attr('type') === 'password') {
        provider.$secret.attr('type', 'text');
        $icon.removeClass('eye').addClass('eye slash');
      } else {
        provider.$secret.attr('type', 'password');
        $icon.removeClass('eye slash').addClass('eye');
      }
    });
    $('#generate-new-password').on('click', function (e) {
      /**
       * Event handler for the generate new password button click event.
       * @param {Event} e - The click event.
       */
      e.preventDefault();
      var password = provider.generatePassword();
      provider.$secret.val(password);
      provider.$secret.trigger('change');
    });
    provider.$secret.on('change', function () {
      $('#elSecret .ui.button.clipboard').attr('data-clipboard-text', provider.$secret.val());
    }); // Initialize all tooltip popups

    $('.popuped').popup();
    var clipboard = new ClipboardJS('.clipboard');
    $('.clipboard').popup({
      on: 'manual'
    });
    clipboard.on('success', function (e) {
      $(e.trigger).popup('show');
      setTimeout(function () {
        $(e.trigger).popup('hide');
      }, 1500);
      e.clearSelection();
    });
    clipboard.on('error', function (e) {
      console.error('Action:', e.action);
      console.error('Trigger:', e.trigger);
    });
  },

  /**
   * Update the visibility of elements based on the provider type and registration type.
   */
  updateVisibilityElements: function updateVisibilityElements() {
    // Get element references
    var elHost = $('#elHost');
    var elUsername = $('#elUsername');
    var elSecret = $('#elSecret');
    var elPort = $('#elPort');
    var elReceiveCalls = $('#elReceiveCalls');
    var elNetworkFilter = $('#elNetworkFilter');
    var regType = $('#registration_type').val();
    var elUniqId = $('#uniqid');
    var genPassword = $('#generate-new-password');
    var valUserName = $('#username');
    var valSecret = provider.$secret;

    if (provider.providerType === 'SIP') {
      var elAdditionalHost = $('#elAdditionalHosts'); // Reset username if necessary

      if (valUserName.val() === elUniqId.val() && regType !== 'outbound') {
        valUserName.val('');
      }

      valUserName.removeAttr('readonly'); // Update element visibility based on registration type

      if (regType === 'outbound') {
        elHost.show();
        elUsername.show();
        elSecret.show();
        elAdditionalHost.show();
        genPassword.hide();
      } else if (regType === 'inbound') {
        valUserName.val(elUniqId.val());
        valUserName.attr('readonly', '');

        if (valSecret.val().trim() === '') {
          valSecret.val('id=' + $('#id').val() + '-' + elUniqId.val());
        }

        elHost.hide();
        elUsername.show();
        elSecret.show();
        genPassword.show();
      } else if (regType === 'none') {
        elHost.show();
        elUsername.hide();
        elSecret.hide();
      } // Update element visibility based on 'disablefromuser' checkbox


      var el = $('#disablefromuser');
      var fromUser = $('#divFromUser');

      if (el.checkbox('is checked')) {
        fromUser.hide();
        fromUser.removeClass('visible');
      } else {
        fromUser.show();
        fromUser.addClass('visible');
      }
    } else if (provider.providerType === 'IAX') {
      // Handle IAX provider visibility
      valUserName.removeAttr('readonly'); // Get label elements

      var labelHost = $('label[for="host"]');
      var labelPort = $('label[for="port"]');
      var labelUsername = $('label[for="username"]');
      var labelSecret = $('label[for="secret"]');
      var valPort = $('#port');
      var valQualify = $('#qualify');
      var copyButton = $('#elSecret .button.clipboard');
      var showHideButton = $('#show-hide-password'); // Set default values for hidden fields
      // Always enable qualify for IAX (NAT keepalive)

      if (valQualify.length > 0) {
        valQualify.prop('checked', true);
        valQualify.val('1');
      } // Set empty network filter ID (no restrictions by default)


      $('#networkfilterid').val(''); // Update element visibility based on registration type

      if (regType === 'outbound') {
        // OUTBOUND: We register to provider
        elHost.show();
        elPort.show();
        elUsername.show();
        elSecret.show();
        elReceiveCalls.hide(); // Not relevant for outbound
        // Make host required for outbound

        elHost.addClass('required'); // Hide generate and copy buttons for outbound

        genPassword.hide();
        copyButton.hide(); // Show/hide button is always visible

        showHideButton.show(); // Update labels for outbound

        labelHost.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP');
        labelPort.text(globalTranslate.pr_ProviderPort || 'Provider Port');
        labelUsername.text(globalTranslate.pr_ProviderLogin || 'Login');
        labelSecret.text(globalTranslate.pr_ProviderPassword || 'Password'); // Set default port if empty

        if (valPort.val() === '' || valPort.val() === '0') {
          valPort.val('4569');
        }
      } else if (regType === 'inbound') {
        // INBOUND: Provider connects to us
        // For incoming connections, use uniqid as username
        valUserName.val(elUniqId.val());
        valUserName.attr('readonly', '');

        if (valSecret.val().trim() === '') {
          valSecret.val('id=' + $('#id').val() + '-' + elUniqId.val());
        }

        elHost.show();
        elPort.hide(); // Port not needed for inbound connections

        elUsername.show();
        elSecret.show();
        elReceiveCalls.show(); // Show for inbound connections
        // Make host required for inbound

        elHost.addClass('required'); // Show all buttons for inbound

        genPassword.show();
        copyButton.show();
        showHideButton.show(); // Update clipboard text when password changes

        copyButton.attr('data-clipboard-text', valSecret.val()); // Update labels for inbound

        labelHost.text(globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host/IP');
        labelUsername.text(globalTranslate.pr_AuthenticationUsername || 'Authentication Username');
        labelSecret.text(globalTranslate.pr_AuthenticationPassword || 'Authentication Password');
      } else if (regType === 'none') {
        // NONE: Static peer-to-peer connection
        elHost.show();
        elPort.show();
        elUsername.show();
        elSecret.show();
        elReceiveCalls.show(); // Show for static connections too
        // Make host required for none

        elHost.addClass('required'); // Hide generate and copy buttons for none type

        genPassword.hide();
        copyButton.hide(); // Show/hide button is always visible

        showHideButton.show(); // Update labels for none (peer-to-peer)

        labelHost.text(globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP');
        labelPort.text(globalTranslate.pr_PeerPort || 'Peer Port');
        labelUsername.text(globalTranslate.pr_PeerUsername || 'Peer Username');
        labelSecret.text(globalTranslate.pr_PeerPassword || 'Peer Password'); // Set default port if empty

        if (valPort.val() === '' || valPort.val() === '0') {
          valPort.val('4569');
        }
      }
    }
  },

  /**
   * Callback function when completing the host address input.
   */
  cbOnCompleteHostAddress: function cbOnCompleteHostAddress() {
    var value = provider.$formObj.form('get value', 'additional-host');

    if (value) {
      var validation = value.match(provider.hostInputValidation); // Validate the input value

      if (validation === null || validation.length === 0) {
        provider.$additionalHostInput.transition('shake');
        return;
      } // Check if the host address already exists


      if ($(".host-row[data-value=\"".concat(value, "\"]")).length === 0) {
        var $tr = $('.host-row-tpl').last();
        var $clone = $tr.clone(true);
        $clone.removeClass('host-row-tpl').addClass('host-row').show();
        $clone.attr('data-value', value);
        $clone.find('.address').html(value);

        if ($(provider.hostRow).last().length === 0) {
          $tr.after($clone);
        } else {
          $(provider.hostRow).last().after($clone);
        }

        provider.updateHostsTableView();
        Form.dataChanged();
      }

      provider.$additionalHostInput.val('');
    }
  },

  /**
   * Updates the hosts table view based on the presence of additional hosts or shows dummy if there is no records
   */
  updateHostsTableView: function updateHostsTableView() {
    if ($(provider.hostRow).length === 0) {
      provider.$additionalHostsDummy.show();
    } else {
      provider.$additionalHostsDummy.hide();
    }
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = provider.$formObj.form('get values');
    var arrAdditionalHosts = [];
    $(provider.hostRow).each(function (index, obj) {
      if ($(obj).attr('data-value')) {
        arrAdditionalHosts.push({
          address: $(obj).attr('data-value')
        });
      }
    });
    result.data.additionalHosts = JSON.stringify(arrAdditionalHosts);
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {},

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = provider.$formObj;

    Form.$formObj.form.settings.rules.checkHostProvider = function (value) {
      var enable;

      if ($('#registration_type').val() === 'inbound') {
        enable = true;
      } else {
        enable = value.trim() !== '';
      }

      return enable;
    };

    switch (provider.providerType) {
      case 'SIP':
        Form.url = "".concat(globalRootUrl, "providers/save/sip"); // Form submission URL

        break;

      case 'IAX':
        Form.url = "".concat(globalRootUrl, "providers/save/iax"); // Form submission URL

        break;

      default:
        return;
    }

    Form.validateRules = provider.validateRules; // Form validation rules

    Form.cbBeforeSendForm = provider.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = provider.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
};
/**
 * Custom form validation rule for username.
 * @param {string} noregister - The value of the 'noregister' attribute.
 * @param {string} username - The value of the username input field.
 * @returns {boolean} - Whether the validation rule passes or not.
 */

$.fn.form.settings.rules.username = function (noregister, username) {
  return !(username.length === 0 && noregister !== 'on');
};
/**
 *  Initialize provider management form on document ready
 */


$(document).ready(function () {
  provider.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVyIiwiJGZvcm1PYmoiLCIkIiwiJHNlY3JldCIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsInByb3ZpZGVyVHlwZSIsInZhbCIsIiRjaGVja0JveGVzIiwiJGFjY29yZGlvbnMiLCIkZHJvcERvd25zIiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRxdWFsaWZ5VG9nZ2xlIiwiJHF1YWxpZnlGcmVxVG9nZ2xlIiwiJGFkZGl0aW9uYWxIb3N0SW5wdXQiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwiaG9zdFJvdyIsInZhbGlkYXRlUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsImhvc3QiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInVzZXJuYW1lIiwib3B0aW9uYWwiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbk5vdFNpbmdsZVNpbWJvbCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0UmFuZ2UiLCJnZW5lcmF0ZVBhc3N3b3JkIiwiZ2VuZXJhdGVTaXBQYXNzd29yZCIsImdlbmVyYXRlSWF4UGFzc3dvcmQiLCJsZW5ndGgiLCJjaGFycyIsInBhc3N3b3JkIiwiaSIsImNoYXJBdCIsIk1hdGgiLCJmbG9vciIsInJhbmRvbSIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsIiR3YXJuaW5nTWVzc2FnZSIsIm5leHQiLCIkY2hlY2tib3hJbnB1dCIsInVwZGF0ZVdhcm5pbmdTdGF0ZSIsInByb3AiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJ0cmFuc2l0aW9uIiwib25VbmNoZWNrZWQiLCJhY2NvcmRpb24iLCJvbk9wZW4iLCJzZXRUaW1lb3V0IiwiaW5pdGlhbGl6ZSIsImRyb3Bkb3duIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJvbkNoYW5nZSIsImtleXByZXNzIiwiZSIsIndoaWNoIiwiY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MiLCJvbiIsInByZXZlbnREZWZhdWx0IiwidGFyZ2V0IiwiY2xvc2VzdCIsInJlbW92ZSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImluaXRpYWxpemVGb3JtIiwidXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCIkaWNvbiIsImZpbmQiLCJhdHRyIiwidHJpZ2dlciIsInBvcHVwIiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsImVsSG9zdCIsImVsVXNlcm5hbWUiLCJlbFNlY3JldCIsImVsUG9ydCIsImVsUmVjZWl2ZUNhbGxzIiwiZWxOZXR3b3JrRmlsdGVyIiwicmVnVHlwZSIsImVsVW5pcUlkIiwiZ2VuUGFzc3dvcmQiLCJ2YWxVc2VyTmFtZSIsInZhbFNlY3JldCIsImVsQWRkaXRpb25hbEhvc3QiLCJyZW1vdmVBdHRyIiwic2hvdyIsImhpZGUiLCJ0cmltIiwiZWwiLCJmcm9tVXNlciIsImxhYmVsSG9zdCIsImxhYmVsUG9ydCIsImxhYmVsVXNlcm5hbWUiLCJsYWJlbFNlY3JldCIsInZhbFBvcnQiLCJ2YWxRdWFsaWZ5IiwiY29weUJ1dHRvbiIsInNob3dIaWRlQnV0dG9uIiwidGV4dCIsInByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIiwicHJfUHJvdmlkZXJQb3J0IiwicHJfUHJvdmlkZXJMb2dpbiIsInByX1Byb3ZpZGVyUGFzc3dvcmQiLCJwcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MiLCJwcl9BdXRoZW50aWNhdGlvblVzZXJuYW1lIiwicHJfQXV0aGVudGljYXRpb25QYXNzd29yZCIsInByX1BlZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9QZWVyUG9ydCIsInByX1BlZXJVc2VybmFtZSIsInByX1BlZXJQYXNzd29yZCIsInZhbHVlIiwiZm9ybSIsInZhbGlkYXRpb24iLCJtYXRjaCIsIiR0ciIsImxhc3QiLCIkY2xvbmUiLCJjbG9uZSIsImh0bWwiLCJhZnRlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImRhdGEiLCJhcnJBZGRpdGlvbmFsSG9zdHMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJwdXNoIiwiYWRkcmVzcyIsImFkZGl0aW9uYWxIb3N0cyIsIkpTT04iLCJzdHJpbmdpZnkiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsImNoZWNrSG9zdFByb3ZpZGVyIiwiZW5hYmxlIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImZuIiwibm9yZWdpc3RlciIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBRWI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FORTs7QUFRYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUVELENBQUMsQ0FBQyxTQUFELENBWkc7QUFjYkUsRUFBQUEscUJBQXFCLEVBQUVGLENBQUMsQ0FBQyxnQ0FBRCxDQWRYO0FBZ0JiRyxFQUFBQSxZQUFZLEVBQUVILENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJJLEdBQW5CLEVBaEJEO0FBaUJiQyxFQUFBQSxXQUFXLEVBQUVMLENBQUMsQ0FBQywrQkFBRCxDQWpCRDtBQWtCYk0sRUFBQUEsV0FBVyxFQUFFTixDQUFDLENBQUMsbUNBQUQsQ0FsQkQ7QUFtQmJPLEVBQUFBLFVBQVUsRUFBRVAsQ0FBQyxDQUFDLGtDQUFE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LE1BQVQsS0FBb0IsQ0FBcEIsSUFBeUJ5SCxVQUFVLEtBQUssSUFBMUMsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7OztBQUNBekosQ0FBQyxDQUFDMEosUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjdKLEVBQUFBLFFBQVEsQ0FBQ3lELFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgJCwgQ2xpcGJvYXJkSlMgKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgaGFuZGxpbmcgcHJvdmlkZXIgbWFuYWdlbWVudCBmb3JtXG4gKlxuICogQG1vZHVsZSBwcm92aWRlclxuICovXG5jb25zdCBwcm92aWRlciA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzZWNyZXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VjcmV0OiAkKCcjc2VjcmV0JyksXG5cbiAgICAkYWRkaXRpb25hbEhvc3RzRHVtbXk6ICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5kdW1teScpLFxuXG4gICAgcHJvdmlkZXJUeXBlOiAkKCcjcHJvdmlkZXJUeXBlJykudmFsKCksXG4gICAgJGNoZWNrQm94ZXM6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmNoZWNrYm94JyksXG4gICAgJGFjY29yZGlvbnM6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmFjY29yZGlvbicpLFxuICAgICRkcm9wRG93bnM6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmRyb3Bkb3duJyksXG4gICAgJGRlbGV0ZVJvd0J1dHRvbjogJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmRlbGV0ZS1yb3ctYnV0dG9uJyksXG4gICAgJHF1YWxpZnlUb2dnbGU6ICQoJyNxdWFsaWZ5JyksXG4gICAgJHF1YWxpZnlGcmVxVG9nZ2xlOiAkKCcjcXVhbGlmeS1mcmVxJyksXG4gICAgJGFkZGl0aW9uYWxIb3N0SW5wdXQ6ICQoJyNhZGRpdGlvbmFsLWhvc3QgaW5wdXQnKSxcbiAgICBob3N0SW5wdXRWYWxpZGF0aW9uOiAvXigoKFswLTldfFsxLTldWzAtOV18MVswLTldezJ9fDJbMC00XVswLTldfDI1WzAtNV0pXFwuKXszfShbMC05XXxbMS05XVswLTldfDFbMC05XXsyfXwyWzAtNF1bMC05XXwyNVswLTVdKShcXC8oXFxkfFsxLTJdXFxkfDNbMC0yXSkpP3xbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSg/OlxcLlthLXpBLVpdezIsfSkrKSQvZ20sXG4gICAgaG9zdFJvdzogJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmhvc3Qtcm93JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0hvc3RQcm92aWRlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbMl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbk5vdFNpbmdsZVNpbWJvbCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgcGFzc3dvcmQgYmFzZWQgb24gcHJvdmlkZXIgdHlwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEdlbmVyYXRlZCBwYXNzd29yZFxuICAgICAqL1xuICAgIGdlbmVyYXRlUGFzc3dvcmQoKSB7XG4gICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvdmlkZXIuZ2VuZXJhdGVTaXBQYXNzd29yZCgpO1xuICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm92aWRlci5nZW5lcmF0ZUlheFBhc3N3b3JkKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb3ZpZGVyLmdlbmVyYXRlU2lwUGFzc3dvcmQoKTsgLy8gRGVmYXVsdCBmYWxsYmFja1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBTSVAgcGFzc3dvcmQgKGJhc2U2NC1zYWZlIGNoYXJhY3RlcnMsIDE2IGNoYXJzKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsZW5ndGggUGFzc3dvcmQgbGVuZ3RoXG4gICAgICogQHJldHVybnMge3N0cmluZ30gR2VuZXJhdGVkIHBhc3N3b3JkXG4gICAgICovXG4gICAgZ2VuZXJhdGVTaXBQYXNzd29yZChsZW5ndGggPSAxNikge1xuICAgICAgICBjb25zdCBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OS1fJztcbiAgICAgICAgbGV0IHBhc3N3b3JkID0gJyc7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBhc3N3b3JkICs9IGNoYXJzLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzc3dvcmQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIElBWCBwYXNzd29yZCAoaGV4IGNoYXJhY3RlcnMsIDMyIGNoYXJzKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsZW5ndGggUGFzc3dvcmQgbGVuZ3RoXG4gICAgICogQHJldHVybnMge3N0cmluZ30gR2VuZXJhdGVkIHBhc3N3b3JkXG4gICAgICovXG4gICAgZ2VuZXJhdGVJYXhQYXNzd29yZChsZW5ndGggPSAzMikge1xuICAgICAgICBjb25zdCBjaGFycyA9ICdhYmNkZWYwMTIzNDU2Nzg5JztcbiAgICAgICAgbGV0IHBhc3N3b3JkID0gJyc7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBhc3N3b3JkICs9IGNoYXJzLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzc3dvcmQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgSUFYIHdhcm5pbmcgbWVzc2FnZSBoYW5kbGluZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpIHtcbiAgICAgICAgY29uc3QgJHdhcm5pbmdNZXNzYWdlID0gJCgnI2VsUmVjZWl2ZUNhbGxzJykubmV4dCgnLndhcm5pbmcubWVzc2FnZScpO1xuICAgICAgICBjb25zdCAkY2hlY2tib3hJbnB1dCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRnVuY3Rpb24gdG8gdXBkYXRlIHdhcm5pbmcgbWVzc2FnZSBzdGF0ZVxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVXYXJuaW5nU3RhdGUoKSB7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94SW5wdXQucHJvcCgnY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3YXJuaW5nIHN0YXRlXG4gICAgICAgIHVwZGF0ZVdhcm5pbmdTdGF0ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNoZWNrYm94IGNoYW5nZXMgLSB1c2luZyB0aGUgYWxyZWFkeSBpbml0aWFsaXplZCBjaGVja2JveFxuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5yZW1vdmVDbGFzcygnaGlkZGVuJykudHJhbnNpdGlvbignZmFkZSBpbicpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UudHJhbnNpdGlvbignZmFkZSBvdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIHdhcm5pbmcgc3RhdGUgd2hlbiBhY2NvcmRpb24gb3BlbnNcbiAgICAgICAgcHJvdmlkZXIuJGFjY29yZGlvbnMuYWNjb3JkaW9uKHtcbiAgICAgICAgICAgIG9uT3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIERPTSBpcyBzZXR0bGVkXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh1cGRhdGVXYXJuaW5nU3RhdGUsIDUwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgcHJvdmlkZXIuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcbiAgICAgICAgcHJvdmlkZXIuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuICAgICAgICBwcm92aWRlci51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhY2NvcmRpb24gc2VwYXJhdGVseSBmb3IgSUFYXG4gICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgIT09ICdJQVgnKSB7XG4gICAgICAgICAgICBwcm92aWRlci4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gY2FsbGVkIHdoZW4gdGhlIHF1YWxpZnkgdG9nZ2xlIGNoYW5nZXMuXG4gICAgICAgICAqL1xuICAgICAgICBwcm92aWRlci4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICBwcm92aWRlci4kcXVhbGlmeUZyZXFUb2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXIuJHF1YWxpZnlGcmVxVG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBuZXcgc3RyaW5nIHRvIGFkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGFibGVcbiAgICAgICAgcHJvdmlkZXIuJGFkZGl0aW9uYWxIb3N0SW5wdXQua2V5cHJlc3MoKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLndoaWNoID09PSAxMykge1xuICAgICAgICAgICAgICAgIHByb3ZpZGVyLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBob3N0IGZyb20gYWRkaXRpb25hbC1ob3N0cy10YWJsZVxuICAgICAgICBwcm92aWRlci4kZGVsZXRlUm93QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgcHJvdmlkZXIudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgcHJvdmlkZXIudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG5cbiAgICAgICAgJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykub24oJ2NoYW5nZScsIHByb3ZpZGVyLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cyk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGluaXRpYWwgdXBkYXRlIGZvciBJQVggcHJvdmlkZXJzXG4gICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdJQVgnKSB7XG4gICAgICAgICAgICBwcm92aWRlci51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCgnI2Rpc2FibGVmcm9tdXNlciBpbnB1dCcpLm9uKCdjaGFuZ2UnLCBwcm92aWRlci51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMpO1xuXG4gICAgICAgIC8vIFNob3cvaGlkZSBwYXNzd29yZCB0b2dnbGVcbiAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkYnV0dG9uLmZpbmQoJ2knKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHByb3ZpZGVyLiRzZWNyZXQuYXR0cigndHlwZScpID09PSAncGFzc3dvcmQnKSB7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJHNlY3JldC5hdHRyKCd0eXBlJywgJ3RleHQnKTtcbiAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllJykuYWRkQ2xhc3MoJ2V5ZSBzbGFzaCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwcm92aWRlci4kc2VjcmV0LmF0dHIoJ3R5cGUnLCAncGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllIHNsYXNoJykuYWRkQ2xhc3MoJ2V5ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGhlIGdlbmVyYXRlIG5ldyBwYXNzd29yZCBidXR0b24gY2xpY2sgZXZlbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBwYXNzd29yZCA9IHByb3ZpZGVyLmdlbmVyYXRlUGFzc3dvcmQoKTtcbiAgICAgICAgICAgIHByb3ZpZGVyLiRzZWNyZXQudmFsKHBhc3N3b3JkKTtcbiAgICAgICAgICAgIHByb3ZpZGVyLiRzZWNyZXQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHByb3ZpZGVyLiRzZWNyZXQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgICQoJyNlbFNlY3JldCAudWkuYnV0dG9uLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCBwcm92aWRlci4kc2VjcmV0LnZhbCgpKVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGFsbCB0b29sdGlwIHBvcHVwc1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jbGlwYm9hcmQnKTtcbiAgICAgICAgJCgnLmNsaXBib2FyZCcpLnBvcHVwKHtcbiAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2xpcGJvYXJkLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBY3Rpb246JywgZS5hY3Rpb24pO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJpZ2dlcjonLCBlLnRyaWdnZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSBwcm92aWRlciB0eXBlIGFuZCByZWdpc3RyYXRpb24gdHlwZS5cbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIC8vIEdldCBlbGVtZW50IHJlZmVyZW5jZXNcbiAgICAgICAgbGV0IGVsSG9zdCA9ICQoJyNlbEhvc3QnKTtcbiAgICAgICAgbGV0IGVsVXNlcm5hbWUgPSAkKCcjZWxVc2VybmFtZScpO1xuICAgICAgICBsZXQgZWxTZWNyZXQgPSAkKCcjZWxTZWNyZXQnKTtcbiAgICAgICAgbGV0IGVsUG9ydCA9ICQoJyNlbFBvcnQnKTtcbiAgICAgICAgbGV0IGVsUmVjZWl2ZUNhbGxzID0gJCgnI2VsUmVjZWl2ZUNhbGxzJyk7XG4gICAgICAgIGxldCBlbE5ldHdvcmtGaWx0ZXIgPSAkKCcjZWxOZXR3b3JrRmlsdGVyJyk7XG4gICAgICAgIGxldCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGxldCBlbFVuaXFJZCA9ICQoJyN1bmlxaWQnKTtcbiAgICAgICAgbGV0IGdlblBhc3N3b3JkID0gJCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpO1xuXG4gICAgICAgIGxldCB2YWxVc2VyTmFtZSA9ICQoJyN1c2VybmFtZScpO1xuICAgICAgICBsZXQgdmFsU2VjcmV0ID0gcHJvdmlkZXIuJHNlY3JldDtcblxuICAgICAgICBpZiAocHJvdmlkZXIucHJvdmlkZXJUeXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgbGV0IGVsQWRkaXRpb25hbEhvc3QgPSAkKCcjZWxBZGRpdGlvbmFsSG9zdHMnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzZXQgdXNlcm5hbWUgaWYgbmVjZXNzYXJ5XG4gICAgICAgICAgICBpZiAodmFsVXNlck5hbWUudmFsKCkgPT09IGVsVW5pcUlkLnZhbCgpICYmIHJlZ1R5cGUgIT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgICAgICB2YWxVc2VyTmFtZS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsVXNlck5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgICAgICBlbEFkZGl0aW9uYWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIHZhbFVzZXJOYW1lLnZhbChlbFVuaXFJZC52YWwoKSk7XG4gICAgICAgICAgICAgICAgdmFsVXNlck5hbWUuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgICAgICAgICAgaWYgKHZhbFNlY3JldC52YWwoKS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbFNlY3JldC52YWwoJ2lkPScgKyAkKCcjaWQnKS52YWwoKSArICctJyArIGVsVW5pcUlkLnZhbCgpKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbEhvc3QuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgICAgICBnZW5QYXNzd29yZC5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICAgICAgZWxVc2VybmFtZS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgZWxTZWNyZXQuaGlkZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uICdkaXNhYmxlZnJvbXVzZXInIGNoZWNrYm94XG4gICAgICAgICAgICBsZXQgZWwgPSAkKCcjZGlzYWJsZWZyb211c2VyJyk7XG4gICAgICAgICAgICBsZXQgZnJvbVVzZXIgPSAkKCcjZGl2RnJvbVVzZXInKTtcbiAgICAgICAgICAgIGlmIChlbC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgZnJvbVVzZXIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGZyb21Vc2VyLnJlbW92ZUNsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZyb21Vc2VyLnNob3coKTtcbiAgICAgICAgICAgICAgICBmcm9tVXNlci5hZGRDbGFzcygndmlzaWJsZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBJQVggcHJvdmlkZXIgdmlzaWJpbGl0eVxuICAgICAgICAgICAgdmFsVXNlck5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGxhYmVsIGVsZW1lbnRzXG4gICAgICAgICAgICBsZXQgbGFiZWxIb3N0ID0gJCgnbGFiZWxbZm9yPVwiaG9zdFwiXScpO1xuICAgICAgICAgICAgbGV0IGxhYmVsUG9ydCA9ICQoJ2xhYmVsW2Zvcj1cInBvcnRcIl0nKTtcbiAgICAgICAgICAgIGxldCBsYWJlbFVzZXJuYW1lID0gJCgnbGFiZWxbZm9yPVwidXNlcm5hbWVcIl0nKTtcbiAgICAgICAgICAgIGxldCBsYWJlbFNlY3JldCA9ICQoJ2xhYmVsW2Zvcj1cInNlY3JldFwiXScpO1xuICAgICAgICAgICAgbGV0IHZhbFBvcnQgPSAkKCcjcG9ydCcpO1xuICAgICAgICAgICAgbGV0IHZhbFF1YWxpZnkgPSAkKCcjcXVhbGlmeScpO1xuICAgICAgICAgICAgbGV0IGNvcHlCdXR0b24gPSAkKCcjZWxTZWNyZXQgLmJ1dHRvbi5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgIGxldCBzaG93SGlkZUJ1dHRvbiA9ICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgdmFsdWVzIGZvciBoaWRkZW4gZmllbGRzXG4gICAgICAgICAgICAvLyBBbHdheXMgZW5hYmxlIHF1YWxpZnkgZm9yIElBWCAoTkFUIGtlZXBhbGl2ZSlcbiAgICAgICAgICAgIGlmICh2YWxRdWFsaWZ5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YWxRdWFsaWZ5LnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB2YWxRdWFsaWZ5LnZhbCgnMScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgZW1wdHkgbmV0d29yayBmaWx0ZXIgSUQgKG5vIHJlc3RyaWN0aW9ucyBieSBkZWZhdWx0KVxuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbCgnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBlbGVtZW50IHZpc2liaWxpdHkgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICAgICAgLy8gT1VUQk9VTkQ6IFdlIHJlZ2lzdGVyIHRvIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgICAgICBlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgICAgICBlbFJlY2VpdmVDYWxscy5oaWRlKCk7IC8vIE5vdCByZWxldmFudCBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgICAgICAvLyBNYWtlIGhvc3QgcmVxdWlyZWQgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICAgICAgZWxIb3N0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZ2VuZXJhdGUgYW5kIGNvcHkgYnV0dG9ucyBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgY29weUJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdy9oaWRlIGJ1dHRvbiBpcyBhbHdheXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIHNob3dIaWRlQnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBvdXRib3VuZFxuICAgICAgICAgICAgICAgIGxhYmVsSG9zdC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyB8fCAnUHJvdmlkZXIgSG9zdC9JUCcpO1xuICAgICAgICAgICAgICAgIGxhYmVsUG9ydC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBvcnQgfHwgJ1Byb3ZpZGVyIFBvcnQnKTtcbiAgICAgICAgICAgICAgICBsYWJlbFVzZXJuYW1lLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyTG9naW4gfHwgJ0xvZ2luJyk7XG4gICAgICAgICAgICAgICAgbGFiZWxTZWNyZXQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQYXNzd29yZCB8fCAnUGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKHZhbFBvcnQudmFsKCkgPT09ICcnIHx8IHZhbFBvcnQudmFsKCkgPT09ICcwJykge1xuICAgICAgICAgICAgICAgICAgICB2YWxQb3J0LnZhbCgnNDU2OScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgLy8gSU5CT1VORDogUHJvdmlkZXIgY29ubmVjdHMgdG8gdXNcbiAgICAgICAgICAgICAgICAvLyBGb3IgaW5jb21pbmcgY29ubmVjdGlvbnMsIHVzZSB1bmlxaWQgYXMgdXNlcm5hbWVcbiAgICAgICAgICAgICAgICB2YWxVc2VyTmFtZS52YWwoZWxVbmlxSWQudmFsKCkpO1xuICAgICAgICAgICAgICAgIHZhbFVzZXJOYW1lLmF0dHIoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICAgICAgICAgIGlmICh2YWxTZWNyZXQudmFsKCkudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICB2YWxTZWNyZXQudmFsKCdpZD0nICsgJCgnI2lkJykudmFsKCkgKyAnLScgKyBlbFVuaXFJZC52YWwoKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgICAgICBlbFBvcnQuaGlkZSgpOyAvLyBQb3J0IG5vdCBuZWVkZWQgZm9yIGluYm91bmQgY29ubmVjdGlvbnNcbiAgICAgICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICAgICAgZWxSZWNlaXZlQ2FsbHMuc2hvdygpOyAvLyBTaG93IGZvciBpbmJvdW5kIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAgICAgLy8gTWFrZSBob3N0IHJlcXVpcmVkIGZvciBpbmJvdW5kXG4gICAgICAgICAgICAgICAgZWxIb3N0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNob3cgYWxsIGJ1dHRvbnMgZm9yIGluYm91bmRcbiAgICAgICAgICAgICAgICBnZW5QYXNzd29yZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgY29weUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBjbGlwYm9hcmQgdGV4dCB3aGVuIHBhc3N3b3JkIGNoYW5nZXNcbiAgICAgICAgICAgICAgICBjb3B5QnV0dG9uLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCB2YWxTZWNyZXQudmFsKCkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIGluYm91bmRcbiAgICAgICAgICAgICAgICBsYWJlbEhvc3QudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIHx8ICdSZW1vdGUgSG9zdC9JUCcpO1xuICAgICAgICAgICAgICAgIGxhYmVsVXNlcm5hbWUudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSB8fCAnQXV0aGVudGljYXRpb24gVXNlcm5hbWUnKTtcbiAgICAgICAgICAgICAgICBsYWJlbFNlY3JldC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblBhc3N3b3JkIHx8ICdBdXRoZW50aWNhdGlvbiBQYXNzd29yZCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAvLyBOT05FOiBTdGF0aWMgcGVlci10by1wZWVyIGNvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsUmVjZWl2ZUNhbGxzLnNob3coKTsgLy8gU2hvdyBmb3Igc3RhdGljIGNvbm5lY3Rpb25zIHRvb1xuICAgICAgICAgICAgICAgIC8vIE1ha2UgaG9zdCByZXF1aXJlZCBmb3Igbm9uZVxuICAgICAgICAgICAgICAgIGVsSG9zdC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIGdlbmVyYXRlIGFuZCBjb3B5IGJ1dHRvbnMgZm9yIG5vbmUgdHlwZVxuICAgICAgICAgICAgICAgIGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjb3B5QnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93L2hpZGUgYnV0dG9uIGlzIGFsd2F5cyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIG5vbmUgKHBlZXItdG8tcGVlcilcbiAgICAgICAgICAgICAgICBsYWJlbEhvc3QudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlckhvc3RPcklQQWRkcmVzcyB8fCAnUGVlciBIb3N0L0lQJyk7XG4gICAgICAgICAgICAgICAgbGFiZWxQb3J0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQb3J0IHx8ICdQZWVyIFBvcnQnKTtcbiAgICAgICAgICAgICAgICBsYWJlbFVzZXJuYW1lLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJVc2VybmFtZSB8fCAnUGVlciBVc2VybmFtZScpO1xuICAgICAgICAgICAgICAgIGxhYmVsU2VjcmV0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQYXNzd29yZCB8fCAnUGVlciBQYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IHBvcnQgaWYgZW1wdHlcbiAgICAgICAgICAgICAgICBpZiAodmFsUG9ydC52YWwoKSA9PT0gJycgfHwgdmFsUG9ydC52YWwoKSA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbFBvcnQudmFsKCc0NTY5Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gY29tcGxldGluZyB0aGUgaG9zdCBhZGRyZXNzIGlucHV0LlxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdhZGRpdGlvbmFsLWhvc3QnKTtcblxuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSB2YWx1ZS5tYXRjaChwcm92aWRlci5ob3N0SW5wdXRWYWxpZGF0aW9uKTtcblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGlucHV0IHZhbHVlXG4gICAgICAgICAgICBpZiAodmFsaWRhdGlvbiA9PT0gbnVsbFxuICAgICAgICAgICAgICAgIHx8IHZhbGlkYXRpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJGFkZGl0aW9uYWxIb3N0SW5wdXQudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBob3N0IGFkZHJlc3MgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIGlmICgkKGAuaG9zdC1yb3dbZGF0YS12YWx1ZT1cIiR7dmFsdWV9XCJdYCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRyID0gJCgnLmhvc3Qtcm93LXRwbCcpLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgJGNsb25lXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaG9zdC1yb3ctdHBsJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdob3N0LXJvdycpXG4gICAgICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmZpbmQoJy5hZGRyZXNzJykuaHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKCQocHJvdmlkZXIuaG9zdFJvdykubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKHByb3ZpZGVyLmhvc3RSb3cpLmxhc3QoKS5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcm92aWRlci51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByb3ZpZGVyLiRhZGRpdGlvbmFsSG9zdElucHV0LnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgaG9zdHMgdGFibGUgdmlldyBiYXNlZCBvbiB0aGUgcHJlc2VuY2Ugb2YgYWRkaXRpb25hbCBob3N0cyBvciBzaG93cyBkdW1teSBpZiB0aGVyZSBpcyBubyByZWNvcmRzXG4gICAgICovXG4gICAgdXBkYXRlSG9zdHNUYWJsZVZpZXcoKSB7XG4gICAgICAgIGlmICgkKHByb3ZpZGVyLmhvc3RSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcHJvdmlkZXIuJGFkZGl0aW9uYWxIb3N0c0R1bW15LnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHByb3ZpZGVyLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBwcm92aWRlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgY29uc3QgYXJyQWRkaXRpb25hbEhvc3RzID0gW107XG4gICAgICAgICQocHJvdmlkZXIuaG9zdFJvdykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgaWYgKCQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJykpIHtcbiAgICAgICAgICAgICAgICBhcnJBZGRpdGlvbmFsSG9zdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGFkZHJlc3M6ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyksXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXN1bHQuZGF0YS5hZGRpdGlvbmFsSG9zdHMgPSBKU09OLnN0cmluZ2lmeShhcnJBZGRpdGlvbmFsSG9zdHMpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBwcm92aWRlci4kZm9ybU9iajtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrSG9zdFByb3ZpZGVyID0gKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBsZXQgZW5hYmxlO1xuICAgICAgICAgICAgaWYgKCQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgICAgICBlbmFibGUgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbmFibGUgPSB2YWx1ZS50cmltKCkgIT09ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGVuYWJsZTtcbiAgICAgICAgfTtcbiAgICAgICAgc3dpdGNoIChwcm92aWRlci5wcm92aWRlclR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ1NJUCc6XG4gICAgICAgICAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9zYXZlL3NpcGA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ0lBWCc6XG4gICAgICAgICAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9zYXZlL2lheGA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHByb3ZpZGVyLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBwcm92aWRlci5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gcHJvdmlkZXIuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciB1c2VybmFtZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBub3JlZ2lzdGVyIC0gVGhlIHZhbHVlIG9mIHRoZSAnbm9yZWdpc3RlcicgYXR0cmlidXRlLlxuICogQHBhcmFtIHtzdHJpbmd9IHVzZXJuYW1lIC0gVGhlIHZhbHVlIG9mIHRoZSB1c2VybmFtZSBpbnB1dCBmaWVsZC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFdoZXRoZXIgdGhlIHZhbGlkYXRpb24gcnVsZSBwYXNzZXMgb3Igbm90LlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudXNlcm5hbWUgPSBmdW5jdGlvbiAobm9yZWdpc3RlciwgdXNlcm5hbWUpIHtcbiAgICByZXR1cm4gISh1c2VybmFtZS5sZW5ndGggPT09IDAgJiYgbm9yZWdpc3RlciAhPT0gJ29uJyk7XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=