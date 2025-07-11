"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
  hostInputValidation: new RegExp('^(((\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}' + '(\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])' + '(\\/(\d|[1-2]\d|3[0-2]))?' + '|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+)$', 'gm'),
  hostRow: '#save-provider-form .host-row',

  /**
   * Validation rules for outbound registration
   */
  outboundValidationRules: {
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
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
      }]
    },
    username: {
      identifier: 'username',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
      }]
    },
    secret: {
      identifier: 'secret',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
      }]
    },
    port: {
      identifier: 'port',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
      }, {
        type: 'integer[1..65535]',
        prompt: globalTranslate.pr_ValidationProviderPortInvalid
      }]
    }
  },

  /**
   * Validation rules for inbound registration
   */
  inboundValidationRules: {
    description: {
      identifier: 'description',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
      }]
    },
    host: {
      identifier: 'host',
      optional: true,
      rules: []
    },
    username: {
      identifier: 'username',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
      }]
    },
    secret: {
      identifier: 'secret',
      rules: [{
        type: 'checkSecret',
        prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
      }, {
        type: 'minLength[8]',
        prompt: globalTranslate.pr_ValidationProviderPasswordTooShort
      }, {
        type: 'checkPasswordStrength',
        prompt: globalTranslate.pr_ValidationProviderPasswordWeak
      }]
    },
    port: {
      identifier: 'port',
      optional: true,
      rules: []
    }
  },

  /**
   * Validation rules for none registration
   */
  noneValidationRules: {
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
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
      }]
    },
    username: {
      identifier: 'username',
      optional: true,
      rules: []
    },
    secret: {
      identifier: 'secret',
      optional: true,
      rules: []
    },
    port: {
      identifier: 'port',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
      }, {
        type: 'integer[1..65535]',
        prompt: globalTranslate.pr_ValidationProviderPortInvalid
      }]
    }
  },

  /**
   * Get validation rules for the form fields based on registration type.
   *
   * @returns {object} Validation rules
   */
  getValidateRules: function getValidateRules() {
    var regType = $('#registration_type').val(); // Select appropriate validation rules based on registration type

    var baseRules;

    switch (regType) {
      case 'outbound':
        baseRules = _objectSpread({}, provider.outboundValidationRules);
        break;

      case 'inbound':
        baseRules = _objectSpread({}, provider.inboundValidationRules);
        break;

      case 'none':
        baseRules = _objectSpread({}, provider.noneValidationRules);
        break;

      default:
        baseRules = _objectSpread({}, provider.outboundValidationRules);
    } // Add additional hosts validation (common for all types)


    baseRules.additional_hosts = {
      identifier: 'additional-host',
      optional: true,
      rules: [{
        type: 'regExp',
        value: provider.hostInputValidation,
        prompt: globalTranslate.pr_ValidationAdditionalHostInvalid || 'Please enter a valid IP address or hostname'
      }]
    };
    return baseRules;
  },

  /**
   * Generate password using REST API
   */
  generatePassword: function generatePassword() {
    // For IAX use longer password (base64Safe(32) will produce ~44 chars)
    var length = provider.providerType === 'IAX' ? 32 : 16;
    PbxApi.PasswordGenerate(length, function (password) {
      // Use Fomantic UI Form API
      provider.$formObj.form('set value', 'secret', password); // Update clipboard button attribute

      $('#elSecret .ui.button.clipboard').attr('data-clipboard-text', password); // Mark form as changed

      Form.dataChanged();
    });
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
   * Initialize real-time validation feedback
   */
  initializeRealtimeValidation: function initializeRealtimeValidation() {
    // Enable inline validation for better UX
    provider.$formObj.form('setting', 'inline', true); // Password strength indicator using existing PasswordScore module

    if (provider.$secret.length > 0 && typeof PasswordScore !== 'undefined') {
      // Create progress bar for password strength if it doesn't exist
      var $passwordProgress = $('#password-strength-progress');

      if ($passwordProgress.length === 0) {
        var $secretField = provider.$secret.closest('.field');
        $passwordProgress = $('<div class="ui tiny progress" id="password-strength-progress"><div class="bar"></div></div>');
        $secretField.append($passwordProgress);
      } // Update password strength on input


      provider.$secret.on('input', function () {
        PasswordScore.checkPassStrength({
          pass: provider.$secret.val(),
          bar: $passwordProgress,
          section: $passwordProgress
        });
      });
    } // Enhanced validation messages for IAX providers


    if (provider.providerType === 'IAX') {
      // Add helper text for IAX-specific fields
      var $portField = $('#port').closest('.field');

      if ($portField.find('.ui.pointing.label').length === 0) {
        $portField.append('<div class="ui pointing label" style="display: none;">Default IAX port is 4569</div>');
      } // Show port helper on focus


      $('#port').on('focus', function () {
        var $label = $(this).closest('.field').find('.ui.pointing.label');

        if ($(this).val() === '' || $(this).val() === '4569') {
          $label.show();
        }
      }).on('blur', function () {
        $(this).closest('.field').find('.ui.pointing.label').hide();
      });
    } // Validate on blur for immediate feedback


    provider.$formObj.find('input[type="text"], input[type="password"]').on('blur', function () {
      var fieldName = $(this).attr('name');
      var validateRules = provider.getValidateRules();

      if (fieldName && validateRules[fieldName]) {
        provider.$formObj.form('validate field', fieldName);
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
    } // Initialize real-time validation feedback


    provider.initializeRealtimeValidation();
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
    $('#registration_type').on('change', function () {
      provider.updateVisibilityElements(); // Remove all validation error prompts without clearing field values

      provider.$formObj.find('.field').removeClass('error');
      provider.$formObj.find('.ui.error.message').remove();
      provider.$formObj.find('.prompt').remove(); // Update validation rules for dynamic fields

      Form.validateRules = provider.getValidateRules(); // Mark form as changed to enable save button

      Form.dataChanged(); // Don't auto-submit, just check if form is valid to update UI

      setTimeout(function () {
        provider.$formObj.form('is valid');
      }, 100);
    }); // Trigger initial update for IAX providers

    if (provider.providerType === 'IAX') {
      provider.updateVisibilityElements();
      provider.initializeIaxWarningMessage(); // Re-validate form when receive_calls_without_auth changes

      $('#receive_calls_without_auth.checkbox').checkbox('setting', 'onChange', function () {
        // Just check if field is valid without triggering submit
        var isValid = provider.$formObj.form('is valid', 'secret');

        if (!isValid) {
          provider.$formObj.form('validate field', 'secret');
        } // Mark form as changed


        Form.dataChanged();
      });
    }

    $('#disablefromuser input').on('change', function () {
      provider.updateVisibilityElements();
      Form.dataChanged();
    }); // Show/hide password toggle

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
      provider.generatePassword();
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
    }); // Prevent browser password manager for generated passwords

    provider.$secret.on('focus', function () {
      $(this).attr('autocomplete', 'new-password');
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
    var regType = $('#registration_type').val();
    var elUniqId = $('#uniqid');
    var genPassword = $('#generate-new-password');
    var valUserName = $('#username');
    var valSecret = provider.$secret;

    if (provider.providerType === 'SIP') {
      var elAdditionalHost = $('#elAdditionalHosts'); // Reset username only when switching from inbound to other types

      if (valUserName.val() === elUniqId.val() && regType !== 'inbound') {
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
        genPassword.show(); // Remove validation errors for hidden host field

        provider.$formObj.form('remove prompt', 'host');
        $('#host').closest('.field').removeClass('error');
      } else if (regType === 'none') {
        elHost.show();
        elUsername.hide();
        elSecret.hide(); // Don't clear values, just remove validation prompts for hidden fields

        provider.$formObj.form('remove prompt', 'username');
        provider.$formObj.form('remove prompt', 'secret');
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
        // Update required fields for outbound

        elHost.addClass('required');
        elPort.addClass('required');
        elUsername.addClass('required');
        elSecret.addClass('required'); // Hide generate and copy buttons for outbound

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
        // Remove validation prompt for hidden port field

        provider.$formObj.form('remove prompt', 'port'); // Update required fields for inbound

        elHost.removeClass('required'); // Host is optional for inbound

        elPort.removeClass('required'); // Remove host validation error since it's optional for inbound

        provider.$formObj.form('remove prompt', 'host');
        $('#host').closest('.field').removeClass('error');
        elUsername.addClass('required');
        elSecret.addClass('required'); // Will be validated based on receive_calls_without_auth
        // Show all buttons for inbound

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
        // Update required fields for none

        elHost.addClass('required');
        elPort.addClass('required');
        elUsername.addClass('required');
        elSecret.addClass('required'); // Hide generate and copy buttons for none type

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
    $(provider.hostRow).each(function (_, obj) {
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
  cbAfterSendForm: function cbAfterSendForm() {// Response handled by Form module
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = provider.$formObj; // Prevent auto-submit on validation

    Form.$formObj.form({
      on: 'blur',
      inline: true,
      keyboardShortcuts: false,
      onSuccess: function onSuccess(event) {
        // Prevent auto-submit, only submit via button click
        if (event) {
          event.preventDefault();
        }

        return false;
      }
    }); // Custom validation rule for host field

    Form.$formObj.form.settings.rules.checkHostProvider = function (value) {
      var regType = $('#registration_type').val(); // For IAX, host is always required except for inbound

      if (provider.providerType === 'IAX') {
        if (regType === 'inbound') {
          // For inbound, host is optional (we accept connections)
          return true;
        } // For outbound and none, host is required


        return value.trim() !== '';
      } // For SIP, use original logic


      if (regType === 'inbound') {
        return true;
      }

      return value.trim() !== '';
    }; // Custom validation rule for username field


    Form.$formObj.form.settings.rules.checkUsername = function (value) {
      var regType = $('#registration_type').val();

      if (provider.providerType === 'IAX') {
        // Username is always required for IAX
        if (value.trim() === '') {
          return false;
        } // Check minimum length


        return value.length >= 2;
      } // For SIP


      if (provider.providerType === 'SIP') {
        // Username is not required when regType is 'none'
        if (regType === 'none') {
          return true;
        } // For other types, check if empty


        if (value.length === 0) {
          return false;
        }

        return value.length >= 2;
      }

      return true;
    }; // Custom validation rule for secret field


    Form.$formObj.form.settings.rules.checkSecret = function (value) {
      var regType = $('#registration_type').val();

      if (provider.providerType === 'IAX') {
        // For IAX, secret is required for outbound and none
        if (regType === 'outbound' || regType === 'none') {
          return value.trim() !== '';
        } // For inbound, secret is required if receive_calls_without_auth is not checked


        if (regType === 'inbound') {
          var receiveWithoutAuth = $('#receive_calls_without_auth').checkbox('is checked');

          if (!receiveWithoutAuth) {
            return value.trim() !== '';
          }
        }
      } // For SIP


      if (provider.providerType === 'SIP') {
        // Secret is not required when regType is 'none'
        if (regType === 'none') {
          return true;
        } // For other types, secret is required if not empty


        if (value.trim() === '') {
          return false;
        }
      }

      return true;
    }; // Custom validation rule for port field


    Form.$formObj.form.settings.rules.checkPort = function (value) {
      var regType = $('#registration_type').val();

      if (provider.providerType === 'IAX') {
        // Port is not required for inbound
        if (regType === 'inbound') {
          // Allow empty value for inbound
          return true;
        } // For outbound and none, port is required


        if (!value || value.trim() === '') {
          return false;
        }

        var _port = parseInt(value, 10);

        return !isNaN(_port) && _port >= 1 && _port <= 65535;
      } // For SIP, port is always required


      if (!value || value.trim() === '') {
        return false;
      }

      var port = parseInt(value, 10);
      return !isNaN(port) && port >= 1 && port <= 65535;
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

    Form.validateRules = provider.getValidateRules(); // Form validation rules

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
 * Custom form validation rule for password strength
 * @param {string} value - The password value
 * @returns {boolean} - Whether the password meets strength requirements
 */


$.fn.form.settings.rules.checkPasswordStrength = function (value) {
  // Get registration type
  var regType = $('#registration_type').val(); // Skip validation for outbound and none registration types

  if (regType === 'outbound' || regType === 'none') {
    return true;
  } // For generated passwords, always pass


  if (value.startsWith('id=') || value.length > 20) {
    return true;
  } // Check for minimum requirements


  var hasLowerCase = /[a-z]/.test(value);
  var hasUpperCase = /[A-Z]/.test(value);
  var hasNumber = /[0-9]/.test(value);
  var hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value); // Password should have at least 3 of 4 character types

  var strengthScore = [hasLowerCase, hasUpperCase, hasNumber, hasSpecialChar].filter(Boolean).length;
  return strengthScore >= 3;
};
/**
 *  Initialize provider management form on document ready
 */


$(document).ready(function () {
  provider.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVyIiwiJGZvcm1PYmoiLCIkIiwiJHNlY3JldCIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsInByb3ZpZGVyVHlwZSIsInZhbCIsIiRjaGVja0JveGVzIiwiJGFjY29yZGlvbnMiLCIkZHJvcERvd25zIiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRxdWFsaWZ5VG9nZ2xlIiwiJHF1YWxpZnlGcmVxVG9nZ2xlIiwiJGFkZGl0aW9uYWxIb3N0SW5wdXQiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwiUmVnRXhwIiwiaG9zdFJvdyIsIm91dGJvdW5kVmFsaWRhdGlvblJ1bGVzIiwiZGVzY3JpcHRpb24iLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJob3N0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInNlY3JldCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCIsImluYm91bmRWYWxpZGF0aW9uUnVsZXMiLCJvcHRpb25hbCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFdlYWsiLCJub25lVmFsaWRhdGlvblJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsInJlZ1R5cGUiLCJiYXNlUnVsZXMiLCJhZGRpdGlvbmFsX2hvc3RzIiwidmFsdWUiLCJwcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkIiwiZ2VuZXJhdGVQYXNzd29yZCIsImxlbmd0aCIsIlBieEFwaSIsIlBhc3N3b3JkR2VuZXJhdGUiLCJwYXNzd29yZCIsImZvcm0iLCJhdHRyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlIiwiJHdhcm5pbmdNZXNzYWdlIiwibmV4dCIsIiRjaGVja2JveElucHV0IiwidXBkYXRlV2FybmluZ1N0YXRlIiwicHJvcCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsInRyYW5zaXRpb24iLCJvblVuY2hlY2tlZCIsImFjY29yZGlvbiIsIm9uT3BlbiIsInNldFRpbWVvdXQiLCJpbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uIiwiUGFzc3dvcmRTY29yZSIsIiRwYXNzd29yZFByb2dyZXNzIiwiJHNlY3JldEZpZWxkIiwiY2xvc2VzdCIsImFwcGVuZCIsIm9uIiwiY2hlY2tQYXNzU3RyZW5ndGgiLCJwYXNzIiwiYmFyIiwic2VjdGlvbiIsIiRwb3J0RmllbGQiLCJmaW5kIiwiJGxhYmVsIiwic2hvdyIsImhpZGUiLCJmaWVsZE5hbWUiLCJ2YWxpZGF0ZVJ1bGVzIiwiaW5pdGlhbGl6ZSIsImRyb3Bkb3duIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJvbkNoYW5nZSIsImtleXByZXNzIiwiZSIsIndoaWNoIiwiY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MiLCJwcmV2ZW50RGVmYXVsdCIsInRhcmdldCIsInJlbW92ZSIsImluaXRpYWxpemVGb3JtIiwidXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIiwiaXNWYWxpZCIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiJGljb24iLCJwb3B1cCIsImNsaXBib2FyZCIsIkNsaXBib2FyZEpTIiwidHJpZ2dlciIsImNsZWFyU2VsZWN0aW9uIiwiY29uc29sZSIsImVycm9yIiwiYWN0aW9uIiwiZWxIb3N0IiwiZWxVc2VybmFtZSIsImVsU2VjcmV0IiwiZWxQb3J0IiwiZWxSZWNlaXZlQ2FsbHMiLCJlbFVuaXFJZCIsImdlblBhc3N3b3JkIiwidmFsVXNlck5hbWUiLCJ2YWxTZWNyZXQiLCJlbEFkZGl0aW9uYWxIb3N0IiwicmVtb3ZlQXR0ciIsInRyaW0iLCJlbCIsImZyb21Vc2VyIiwibGFiZWxIb3N0IiwibGFiZWxQb3J0IiwibGFiZWxVc2VybmFtZSIsImxhYmVsU2VjcmV0IiwidmFsUG9ydCIsInZhbFF1YWxpZnkiLCJjb3B5QnV0dG9uIiwic2hvd0hpZGVCdXR0b24iLCJ0ZXh0IiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9Qcm92aWRlclBvcnQiLCJwcl9Qcm92aWRlckxvZ2luIiwicHJfUHJvdmlkZXJQYXNzd29yZCIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsInByX0F1dGhlbnRpY2F0aW9uVXNlcm5hbWUiLCJwcl9BdXRoZW50aWNhdGlvblBhc3N3b3JkIiwicHJfUGVlckhvc3RPcklQQWRkcmVzcyIsInByX1BlZXJQb3J0IiwicHJfUGVlclVzZXJuYW1lIiwicHJfUGVlclBhc3N3b3JkIiwidmFsaWRhdGlvbiIsIm1hdGNoIiwiJHRyIiwibGFzdCIsIiRjbG9uZSIsImNsb25lIiwiaHRtbCIsImFmdGVyIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImFyckFkZGl0aW9uYWxIb3N0cyIsImVhY2giLCJfIiwib2JqIiwicHVzaCIsImFkZHJlc3MiLCJhZGRpdGlvbmFsSG9zdHMiLCJKU09OIiwic3RyaW5naWZ5IiwiY2JBZnRlclNlbmRGb3JtIiwiaW5saW5lIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJvblN1Y2Nlc3MiLCJldmVudCIsImNoZWNrSG9zdFByb3ZpZGVyIiwiY2hlY2tVc2VybmFtZSIsImNoZWNrU2VjcmV0IiwicmVjZWl2ZVdpdGhvdXRBdXRoIiwiY2hlY2tQb3J0IiwicGFyc2VJbnQiLCJpc05hTiIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJmbiIsIm5vcmVnaXN0ZXIiLCJjaGVja1Bhc3N3b3JkU3RyZW5ndGgiLCJzdGFydHNXaXRoIiwiaGFzTG93ZXJDYXNlIiwidGVzdCIsImhhc1VwcGVyQ2FzZSIsImhhc051bWJlciIsImhhc1NwZWNpYWxDaGFyIiwic3RyZW5ndGhTY29yZSIsImZpbHRlciIsIkJvb2xlYW4iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUViO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHFCQUFELENBTkU7O0FBUWI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFRCxDQUFDLENBQUMsU0FBRCxDQVpHO0FBY2JFLEVBQUFBLHFCQUFxQixFQUFFRixDQUFDLENBQUMsZ0NBQUQsQ0FkWDtBQWdCYkcsRUFBQUEsWUFBWSxFQUFFSCxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CSSxHQUFuQixFQWhCRDtBQWlCYkMsRUFBQUEsV0FBVyxFQUFFTCxDQUFDLENBQUMsK0JBQUQsQ0FqQkQ7QUFrQmJNLEVBQUFBLFdBQVcsRUFBRU4sQ0FBQyxDQUFDLG1DQUFELENBbEJEO0FBbUJiTyxFQUFBQSxVQUFVLEVBQUVQLENBQUMsQ0FBQyxrQ0FBRCxDQW5CQTtBQW9CYlEsRUFBQUEsZ0JBQWdCLEVBQUVSLENBQUMsQ0FBQyw0Q0FBRCxDQXBCTjtBQXFCYlMsRUFBQUEsY0FBYyxFQUFFVCxDQUFDLENBQUMsVUFBRCxDQXJCSjtBQXNCYlUsRUFBQUEsa0JBQWtCLEVBQUVWLENBQUMsQ0FBQyxlQUFELENBdEJSO0FBdUJiVyxFQUFBQSxvQkFBb0IsRUFBRVgsQ0FBQyxDQUFDLHdCQUFELENBdkJWO0FBd0JiWSxFQUFBQSxtQkFBbUIsRUFBRSxJQUFJQyxNQUFK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LENBQUNMLFlBQUQsRUFBZUUsWUFBZixFQUE2QkMsU0FBN0IsRUFBd0NDLGNBQXhDLEVBQXdERSxNQUF4RCxDQUErREMsT0FBL0QsRUFBd0VsSixNQUE5RjtBQUVBLFNBQU9nSixhQUFhLElBQUksQ0FBeEI7QUFDSCxDQXhCRDtBQTBCQTtBQUNBO0FBQ0E7OztBQUNBNUwsQ0FBQyxDQUFDK0wsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmxNLEVBQUFBLFFBQVEsQ0FBQ3VGLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgJCwgQ2xpcGJvYXJkSlMgKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgaGFuZGxpbmcgcHJvdmlkZXIgbWFuYWdlbWVudCBmb3JtXG4gKlxuICogQG1vZHVsZSBwcm92aWRlclxuICovXG5jb25zdCBwcm92aWRlciA9IHsgXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc2VjcmV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlY3JldDogJCgnI3NlY3JldCcpLFxuXG4gICAgJGFkZGl0aW9uYWxIb3N0c0R1bW15OiAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuZHVtbXknKSxcblxuICAgIHByb3ZpZGVyVHlwZTogJCgnI3Byb3ZpZGVyVHlwZScpLnZhbCgpLFxuICAgICRjaGVja0JveGVzOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC5jaGVja2JveCcpLFxuICAgICRhY2NvcmRpb25zOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC51aS5hY2NvcmRpb24nKSxcbiAgICAkZHJvcERvd25zOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC51aS5kcm9wZG93bicpLFxuICAgICRkZWxldGVSb3dCdXR0b246ICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5kZWxldGUtcm93LWJ1dHRvbicpLFxuICAgICRxdWFsaWZ5VG9nZ2xlOiAkKCcjcXVhbGlmeScpLFxuICAgICRxdWFsaWZ5RnJlcVRvZ2dsZTogJCgnI3F1YWxpZnktZnJlcScpLFxuICAgICRhZGRpdGlvbmFsSG9zdElucHV0OiAkKCcjYWRkaXRpb25hbC1ob3N0IGlucHV0JyksXG4gICAgaG9zdElucHV0VmFsaWRhdGlvbjogbmV3IFJlZ0V4cChcbiAgICAgICAgJ14oKChcXFxcZHxbMS05XVxcXFxkfDFcXFxcZHsyfXwyWzAtNF1cXFxcZHwyNVswLTVdKVxcXFwuKXszfSdcbiAgICAgICAgKyAnKFxcXFxkfFsxLTldXFxcXGR8MVxcXFxkezJ9fDJbMC00XVxcXFxkfDI1WzAtNV0pJ1xuICAgICAgICArICcoXFxcXC8oXFxkfFsxLTJdXFxkfDNbMC0yXSkpPydcbiAgICAgICAgKyAnfFthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKD86XFxcXC5bYS16QS1aXXsyLH0pKykkJyxcbiAgICAgICAgJ2dtJ1xuICAgICksXG4gICAgaG9zdFJvdzogJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmhvc3Qtcm93JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIG91dGJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIG91dGJvdW5kVmFsaWRhdGlvblJ1bGVzOiB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGluYm91bmRWYWxpZGF0aW9uUnVsZXM6IHtcbiAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrU2VjcmV0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja1Bhc3N3b3JkU3RyZW5ndGgnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFdlYWssXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciBub25lIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIG5vbmVWYWxpZGF0aW9uUnVsZXM6IHtcbiAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlLlxuICAgICAqXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNlbGVjdCBhcHByb3ByaWF0ZSB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGxldCBiYXNlUnVsZXM7XG4gICAgICAgIHN3aXRjaCAocmVnVHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnb3V0Ym91bmQnOlxuICAgICAgICAgICAgICAgIGJhc2VSdWxlcyA9IHsgLi4ucHJvdmlkZXIub3V0Ym91bmRWYWxpZGF0aW9uUnVsZXMgfTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2luYm91bmQnOlxuICAgICAgICAgICAgICAgIGJhc2VSdWxlcyA9IHsgLi4ucHJvdmlkZXIuaW5ib3VuZFZhbGlkYXRpb25SdWxlcyB9O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgYmFzZVJ1bGVzID0geyAuLi5wcm92aWRlci5ub25lVmFsaWRhdGlvblJ1bGVzIH07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGJhc2VSdWxlcyA9IHsgLi4ucHJvdmlkZXIub3V0Ym91bmRWYWxpZGF0aW9uUnVsZXMgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgaG9zdHMgdmFsaWRhdGlvbiAoY29tbW9uIGZvciBhbGwgdHlwZXMpXG4gICAgICAgIGJhc2VSdWxlcy5hZGRpdGlvbmFsX2hvc3RzID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb3ZpZGVyLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWRcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8ICdQbGVhc2UgZW50ZXIgYSB2YWxpZCBJUCBhZGRyZXNzIG9yIGhvc3RuYW1lJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBiYXNlUnVsZXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIHBhc3N3b3JkIHVzaW5nIFJFU1QgQVBJXG4gICAgICovXG4gICAgZ2VuZXJhdGVQYXNzd29yZCgpIHtcbiAgICAgICAgLy8gRm9yIElBWCB1c2UgbG9uZ2VyIHBhc3N3b3JkIChiYXNlNjRTYWZlKDMyKSB3aWxsIHByb2R1Y2UgfjQ0IGNoYXJzKVxuICAgICAgICBjb25zdCBsZW5ndGggPSBwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdJQVgnID8gMzIgOiAxNjtcbiAgICAgICAgXG4gICAgICAgIFBieEFwaS5QYXNzd29yZEdlbmVyYXRlKGxlbmd0aCwgKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICAvLyBVc2UgRm9tYW50aWMgVUkgRm9ybSBBUElcbiAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzZWNyZXQnLCBwYXNzd29yZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBjbGlwYm9hcmQgYnV0dG9uIGF0dHJpYnV0ZVxuICAgICAgICAgICAgJCgnI2VsU2VjcmV0IC51aS5idXR0b24uY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgSUFYIHdhcm5pbmcgbWVzc2FnZSBoYW5kbGluZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpIHtcbiAgICAgICAgY29uc3QgJHdhcm5pbmdNZXNzYWdlID0gJCgnI2VsUmVjZWl2ZUNhbGxzJykubmV4dCgnLndhcm5pbmcubWVzc2FnZScpO1xuICAgICAgICBjb25zdCAkY2hlY2tib3hJbnB1dCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRnVuY3Rpb24gdG8gdXBkYXRlIHdhcm5pbmcgbWVzc2FnZSBzdGF0ZVxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVXYXJuaW5nU3RhdGUoKSB7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94SW5wdXQucHJvcCgnY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3YXJuaW5nIHN0YXRlXG4gICAgICAgIHVwZGF0ZVdhcm5pbmdTdGF0ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNoZWNrYm94IGNoYW5nZXMgLSB1c2luZyB0aGUgYWxyZWFkeSBpbml0aWFsaXplZCBjaGVja2JveFxuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5yZW1vdmVDbGFzcygnaGlkZGVuJykudHJhbnNpdGlvbignZmFkZSBpbicpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UudHJhbnNpdGlvbignZmFkZSBvdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIHdhcm5pbmcgc3RhdGUgd2hlbiBhY2NvcmRpb24gb3BlbnNcbiAgICAgICAgcHJvdmlkZXIuJGFjY29yZGlvbnMuYWNjb3JkaW9uKHtcbiAgICAgICAgICAgIG9uT3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIERPTSBpcyBzZXR0bGVkXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh1cGRhdGVXYXJuaW5nU3RhdGUsIDUwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlYWwtdGltZSB2YWxpZGF0aW9uIGZlZWRiYWNrXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpIHtcbiAgICAgICAgLy8gRW5hYmxlIGlubGluZSB2YWxpZGF0aW9uIGZvciBiZXR0ZXIgVVhcbiAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgnc2V0dGluZycsICdpbmxpbmUnLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvciB1c2luZyBleGlzdGluZyBQYXNzd29yZFNjb3JlIG1vZHVsZVxuICAgICAgICBpZiAocHJvdmlkZXIuJHNlY3JldC5sZW5ndGggPiAwICYmIHR5cGVvZiBQYXNzd29yZFNjb3JlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIHByb2dyZXNzIGJhciBmb3IgcGFzc3dvcmQgc3RyZW5ndGggaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgbGV0ICRwYXNzd29yZFByb2dyZXNzID0gJCgnI3Bhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgICAgICBpZiAoJHBhc3N3b3JkUHJvZ3Jlc3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHNlY3JldEZpZWxkID0gcHJvdmlkZXIuJHNlY3JldC5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgICAgICAgICAkcGFzc3dvcmRQcm9ncmVzcyA9ICQoJzxkaXYgY2xhc3M9XCJ1aSB0aW55IHByb2dyZXNzXCIgaWQ9XCJwYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzc1wiPjxkaXYgY2xhc3M9XCJiYXJcIj48L2Rpdj48L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAkc2VjcmV0RmllbGQuYXBwZW5kKCRwYXNzd29yZFByb2dyZXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHN0cmVuZ3RoIG9uIGlucHV0XG4gICAgICAgICAgICBwcm92aWRlci4kc2VjcmV0Lm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogcHJvdmlkZXIuJHNlY3JldC52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgYmFyOiAkcGFzc3dvcmRQcm9ncmVzcyxcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogJHBhc3N3b3JkUHJvZ3Jlc3NcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFbmhhbmNlZCB2YWxpZGF0aW9uIG1lc3NhZ2VzIGZvciBJQVggcHJvdmlkZXJzXG4gICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdJQVgnKSB7XG4gICAgICAgICAgICAvLyBBZGQgaGVscGVyIHRleHQgZm9yIElBWC1zcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgICAgIGNvbnN0ICRwb3J0RmllbGQgPSAkKCcjcG9ydCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICAgICAgaWYgKCRwb3J0RmllbGQuZmluZCgnLnVpLnBvaW50aW5nLmxhYmVsJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgJHBvcnRGaWVsZC5hcHBlbmQoJzxkaXYgY2xhc3M9XCJ1aSBwb2ludGluZyBsYWJlbFwiIHN0eWxlPVwiZGlzcGxheTogbm9uZTtcIj5EZWZhdWx0IElBWCBwb3J0IGlzIDQ1Njk8L2Rpdj4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBwb3J0IGhlbHBlciBvbiBmb2N1c1xuICAgICAgICAgICAgJCgnI3BvcnQnKS5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKHRoaXMpLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoJy51aS5wb2ludGluZy5sYWJlbCcpO1xuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLnZhbCgpID09PSAnJyB8fCAkKHRoaXMpLnZhbCgpID09PSAnNDU2OScpIHtcbiAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5vbignYmx1cicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQodGhpcykuY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnLnVpLnBvaW50aW5nLmxhYmVsJykuaGlkZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIG9uIGJsdXIgZm9yIGltbWVkaWF0ZSBmZWVkYmFja1xuICAgICAgICBwcm92aWRlci4kZm9ybU9iai5maW5kKCdpbnB1dFt0eXBlPVwidGV4dFwiXSwgaW5wdXRbdHlwZT1cInBhc3N3b3JkXCJdJykub24oJ2JsdXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICQodGhpcykuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGVSdWxlcyA9IHByb3ZpZGVyLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgJiYgdmFsaWRhdGVSdWxlc1tmaWVsZE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZmllbGQnLCBmaWVsZE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBwcm92aWRlci4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuICAgICAgICBwcm92aWRlci4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG4gICAgICAgIHByb3ZpZGVyLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGFjY29yZGlvbiBzZXBhcmF0ZWx5IGZvciBJQVhcbiAgICAgICAgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSAhPT0gJ0lBWCcpIHtcbiAgICAgICAgICAgIHByb3ZpZGVyLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHJlYWwtdGltZSB2YWxpZGF0aW9uIGZlZWRiYWNrXG4gICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGNhbGxlZCB3aGVuIHRoZSBxdWFsaWZ5IHRvZ2dsZSBjaGFuZ2VzLlxuICAgICAgICAgKi9cbiAgICAgICAgcHJvdmlkZXIuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXIuJHF1YWxpZnlGcmVxVG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRxdWFsaWZ5RnJlcVRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgbmV3IHN0cmluZyB0byBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRhYmxlXG4gICAgICAgIHByb3ZpZGVyLiRhZGRpdGlvbmFsSG9zdElucHV0LmtleXByZXNzKChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBwcm92aWRlci5jYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgaG9zdCBmcm9tIGFkZGl0aW9uYWwtaG9zdHMtdGFibGVcbiAgICAgICAgcHJvdmlkZXIuJGRlbGV0ZVJvd0J1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHByb3ZpZGVyLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm92aWRlci5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIHByb3ZpZGVyLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuXG4gICAgICAgICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBwcm92aWRlci51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbGwgdmFsaWRhdGlvbiBlcnJvciBwcm9tcHRzIHdpdGhvdXQgY2xlYXJpbmcgZmllbGQgdmFsdWVzXG4gICAgICAgICAgICBwcm92aWRlci4kZm9ybU9iai5maW5kKCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZpbmQoJy51aS5lcnJvci5tZXNzYWdlJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBwcm92aWRlci4kZm9ybU9iai5maW5kKCcucHJvbXB0JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyBmb3IgZHluYW1pYyBmaWVsZHNcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHByb3ZpZGVyLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgLy8gRG9uJ3QgYXV0by1zdWJtaXQsIGp1c3QgY2hlY2sgaWYgZm9ybSBpcyB2YWxpZCB0byB1cGRhdGUgVUlcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ2lzIHZhbGlkJyk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyaWdnZXIgaW5pdGlhbCB1cGRhdGUgZm9yIElBWCBwcm92aWRlcnNcbiAgICAgICAgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcpIHtcbiAgICAgICAgICAgIHByb3ZpZGVyLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgcHJvdmlkZXIuaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlLXZhbGlkYXRlIGZvcm0gd2hlbiByZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCBjaGFuZ2VzXG4gICAgICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCgnc2V0dGluZycsICdvbkNoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIEp1c3QgY2hlY2sgaWYgZmllbGQgaXMgdmFsaWQgd2l0aG91dCB0cmlnZ2VyaW5nIHN1Ym1pdFxuICAgICAgICAgICAgICAgIGNvbnN0IGlzVmFsaWQgPSBwcm92aWRlci4kZm9ybU9iai5mb3JtKCdpcyB2YWxpZCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZmllbGQnLCAnc2VjcmV0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAkKCcjZGlzYWJsZWZyb211c2VyIGlucHV0Jykub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHByb3ZpZGVyLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTaG93L2hpZGUgcGFzc3dvcmQgdG9nZ2xlXG4gICAgICAgICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJGJ1dHRvbi5maW5kKCdpJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwcm92aWRlci4kc2VjcmV0LmF0dHIoJ3R5cGUnKSA9PT0gJ3Bhc3N3b3JkJykge1xuICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRzZWNyZXQuYXR0cigndHlwZScsICd0ZXh0Jyk7XG4gICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V5ZScpLmFkZENsYXNzKCdleWUgc2xhc2gnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJHNlY3JldC5hdHRyKCd0eXBlJywgJ3Bhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V5ZSBzbGFzaCcpLmFkZENsYXNzKCdleWUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRoZSBnZW5lcmF0ZSBuZXcgcGFzc3dvcmQgYnV0dG9uIGNsaWNrIGV2ZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcHJvdmlkZXIuZ2VuZXJhdGVQYXNzd29yZCgpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWxsIHRvb2x0aXAgcG9wdXBzXG4gICAgICAgICQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNsaXBib2FyZCcpO1xuICAgICAgICAkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICB9KTtcblxuICAgICAgICBjbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FjdGlvbjonLCBlLmFjdGlvbik7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcmlnZ2VyOicsIGUudHJpZ2dlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIHByb3ZpZGVyLiRzZWNyZXQub24oJ2ZvY3VzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ2F1dG9jb21wbGV0ZScsICduZXctcGFzc3dvcmQnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiB0aGUgcHJvdmlkZXIgdHlwZSBhbmQgcmVnaXN0cmF0aW9uIHR5cGUuXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBHZXQgZWxlbWVudCByZWZlcmVuY2VzXG4gICAgICAgIGxldCBlbEhvc3QgPSAkKCcjZWxIb3N0Jyk7XG4gICAgICAgIGxldCBlbFVzZXJuYW1lID0gJCgnI2VsVXNlcm5hbWUnKTtcbiAgICAgICAgbGV0IGVsU2VjcmV0ID0gJCgnI2VsU2VjcmV0Jyk7XG4gICAgICAgIGxldCBlbFBvcnQgPSAkKCcjZWxQb3J0Jyk7XG4gICAgICAgIGxldCBlbFJlY2VpdmVDYWxscyA9ICQoJyNlbFJlY2VpdmVDYWxscycpO1xuICAgICAgICBsZXQgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBsZXQgZWxVbmlxSWQgPSAkKCcjdW5pcWlkJyk7XG4gICAgICAgIGxldCBnZW5QYXNzd29yZCA9ICQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKTtcblxuICAgICAgICBsZXQgdmFsVXNlck5hbWUgPSAkKCcjdXNlcm5hbWUnKTtcbiAgICAgICAgbGV0IHZhbFNlY3JldCA9IHByb3ZpZGVyLiRzZWNyZXQ7XG5cbiAgICAgICAgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgIGxldCBlbEFkZGl0aW9uYWxIb3N0ID0gJCgnI2VsQWRkaXRpb25hbEhvc3RzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc2V0IHVzZXJuYW1lIG9ubHkgd2hlbiBzd2l0Y2hpbmcgZnJvbSBpbmJvdW5kIHRvIG90aGVyIHR5cGVzXG4gICAgICAgICAgICBpZiAodmFsVXNlck5hbWUudmFsKCkgPT09IGVsVW5pcUlkLnZhbCgpICYmIHJlZ1R5cGUgIT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIHZhbFVzZXJOYW1lLnZhbCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWxVc2VyTmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsQWRkaXRpb25hbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgICAgIGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgdmFsVXNlck5hbWUudmFsKGVsVW5pcUlkLnZhbCgpKTtcbiAgICAgICAgICAgICAgICB2YWxVc2VyTmFtZS5hdHRyKCdyZWFkb25seScsICcnKTtcbiAgICAgICAgICAgICAgICBpZiAodmFsU2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsU2VjcmV0LnZhbCgnaWQ9JyArICQoJyNpZCcpLnZhbCgpICsgJy0nICsgZWxVbmlxSWQudmFsKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbEhvc3QuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgICAgICBnZW5QYXNzd29yZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHZhbGlkYXRpb24gZXJyb3JzIGZvciBoaWRkZW4gaG9zdCBmaWVsZFxuICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnaG9zdCcpO1xuICAgICAgICAgICAgICAgICQoJyNob3N0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICAgICAgZWxVc2VybmFtZS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgZWxTZWNyZXQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIERvbid0IGNsZWFyIHZhbHVlcywganVzdCByZW1vdmUgdmFsaWRhdGlvbiBwcm9tcHRzIGZvciBoaWRkZW4gZmllbGRzXG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICd1c2VybmFtZScpO1xuICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnc2VjcmV0Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBlbGVtZW50IHZpc2liaWxpdHkgYmFzZWQgb24gJ2Rpc2FibGVmcm9tdXNlcicgY2hlY2tib3hcbiAgICAgICAgICAgIGxldCBlbCA9ICQoJyNkaXNhYmxlZnJvbXVzZXInKTtcbiAgICAgICAgICAgIGxldCBmcm9tVXNlciA9ICQoJyNkaXZGcm9tVXNlcicpO1xuICAgICAgICAgICAgaWYgKGVsLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICBmcm9tVXNlci5oaWRlKCk7XG4gICAgICAgICAgICAgICAgZnJvbVVzZXIucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnJvbVVzZXIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGZyb21Vc2VyLmFkZENsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIucHJvdmlkZXJUeXBlID09PSAnSUFYJykge1xuICAgICAgICAgICAgLy8gSGFuZGxlIElBWCBwcm92aWRlciB2aXNpYmlsaXR5XG4gICAgICAgICAgICB2YWxVc2VyTmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgbGFiZWwgZWxlbWVudHNcbiAgICAgICAgICAgIGxldCBsYWJlbEhvc3QgPSAkKCdsYWJlbFtmb3I9XCJob3N0XCJdJyk7XG4gICAgICAgICAgICBsZXQgbGFiZWxQb3J0ID0gJCgnbGFiZWxbZm9yPVwicG9ydFwiXScpO1xuICAgICAgICAgICAgbGV0IGxhYmVsVXNlcm5hbWUgPSAkKCdsYWJlbFtmb3I9XCJ1c2VybmFtZVwiXScpO1xuICAgICAgICAgICAgbGV0IGxhYmVsU2VjcmV0ID0gJCgnbGFiZWxbZm9yPVwic2VjcmV0XCJdJyk7XG4gICAgICAgICAgICBsZXQgdmFsUG9ydCA9ICQoJyNwb3J0Jyk7XG4gICAgICAgICAgICBsZXQgdmFsUXVhbGlmeSA9ICQoJyNxdWFsaWZ5Jyk7XG4gICAgICAgICAgICBsZXQgY29weUJ1dHRvbiA9ICQoJyNlbFNlY3JldCAuYnV0dG9uLmNsaXBib2FyZCcpO1xuICAgICAgICAgICAgbGV0IHNob3dIaWRlQnV0dG9uID0gJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCB2YWx1ZXMgZm9yIGhpZGRlbiBmaWVsZHNcbiAgICAgICAgICAgIC8vIEFsd2F5cyBlbmFibGUgcXVhbGlmeSBmb3IgSUFYIChOQVQga2VlcGFsaXZlKVxuICAgICAgICAgICAgaWYgKHZhbFF1YWxpZnkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZhbFF1YWxpZnkucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIHZhbFF1YWxpZnkudmFsKCcxJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBlbXB0eSBuZXR3b3JrIGZpbHRlciBJRCAobm8gcmVzdHJpY3Rpb25zIGJ5IGRlZmF1bHQpXG4gICAgICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKCcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBPVVRCT1VORDogV2UgcmVnaXN0ZXIgdG8gcHJvdmlkZXJcbiAgICAgICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsUmVjZWl2ZUNhbGxzLmhpZGUoKTsgLy8gTm90IHJlbGV2YW50IGZvciBvdXRib3VuZFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHMgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICAgICAgZWxIb3N0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIGVsUG9ydC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIGVsU2VjcmV0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZ2VuZXJhdGUgYW5kIGNvcHkgYnV0dG9ucyBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgY29weUJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdy9oaWRlIGJ1dHRvbiBpcyBhbHdheXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIHNob3dIaWRlQnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBvdXRib3VuZFxuICAgICAgICAgICAgICAgIGxhYmVsSG9zdC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyB8fCAnUHJvdmlkZXIgSG9zdC9JUCcpO1xuICAgICAgICAgICAgICAgIGxhYmVsUG9ydC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBvcnQgfHwgJ1Byb3ZpZGVyIFBvcnQnKTtcbiAgICAgICAgICAgICAgICBsYWJlbFVzZXJuYW1lLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyTG9naW4gfHwgJ0xvZ2luJyk7XG4gICAgICAgICAgICAgICAgbGFiZWxTZWNyZXQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQYXNzd29yZCB8fCAnUGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKHZhbFBvcnQudmFsKCkgPT09ICcnIHx8IHZhbFBvcnQudmFsKCkgPT09ICcwJykge1xuICAgICAgICAgICAgICAgICAgICB2YWxQb3J0LnZhbCgnNDU2OScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgLy8gSU5CT1VORDogUHJvdmlkZXIgY29ubmVjdHMgdG8gdXNcbiAgICAgICAgICAgICAgICAvLyBGb3IgaW5jb21pbmcgY29ubmVjdGlvbnMsIHVzZSB1bmlxaWQgYXMgdXNlcm5hbWVcbiAgICAgICAgICAgICAgICB2YWxVc2VyTmFtZS52YWwoZWxVbmlxSWQudmFsKCkpO1xuICAgICAgICAgICAgICAgIHZhbFVzZXJOYW1lLmF0dHIoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICAgICAgICAgIGlmICh2YWxTZWNyZXQudmFsKCkudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICB2YWxTZWNyZXQudmFsKCdpZD0nICsgJCgnI2lkJykudmFsKCkgKyAnLScgKyBlbFVuaXFJZC52YWwoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICAgICAgZWxQb3J0LmhpZGUoKTsgLy8gUG9ydCBub3QgbmVlZGVkIGZvciBpbmJvdW5kIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsUmVjZWl2ZUNhbGxzLnNob3coKTsgLy8gU2hvdyBmb3IgaW5ib3VuZCBjb25uZWN0aW9uc1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHByb21wdCBmb3IgaGlkZGVuIHBvcnQgZmllbGRcbiAgICAgICAgICAgICAgICBwcm92aWRlci4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3BvcnQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzIGZvciBpbmJvdW5kXG4gICAgICAgICAgICAgICAgZWxIb3N0LnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpOyAvLyBIb3N0IGlzIG9wdGlvbmFsIGZvciBpbmJvdW5kXG4gICAgICAgICAgICAgICAgZWxQb3J0LnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBob3N0IHZhbGlkYXRpb24gZXJyb3Igc2luY2UgaXQncyBvcHRpb25hbCBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnaG9zdCcpO1xuICAgICAgICAgICAgICAgICQoJyNob3N0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgZWxVc2VybmFtZS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICBlbFNlY3JldC5hZGRDbGFzcygncmVxdWlyZWQnKTsgLy8gV2lsbCBiZSB2YWxpZGF0ZWQgYmFzZWQgb24gcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGhcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBidXR0b25zIGZvciBpbmJvdW5kXG4gICAgICAgICAgICAgICAgZ2VuUGFzc3dvcmQuc2hvdygpO1xuICAgICAgICAgICAgICAgIGNvcHlCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgIHNob3dIaWRlQnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY2xpcGJvYXJkIHRleHQgd2hlbiBwYXNzd29yZCBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgY29weUJ1dHRvbi5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgdmFsU2VjcmV0LnZhbCgpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBpbmJvdW5kXG4gICAgICAgICAgICAgICAgbGFiZWxIb3N0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyB8fCAnUmVtb3RlIEhvc3QvSVAnKTtcbiAgICAgICAgICAgICAgICBsYWJlbFVzZXJuYW1lLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uVXNlcm5hbWUgfHwgJ0F1dGhlbnRpY2F0aW9uIFVzZXJuYW1lJyk7XG4gICAgICAgICAgICAgICAgbGFiZWxTZWNyZXQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25QYXNzd29yZCB8fCAnQXV0aGVudGljYXRpb24gUGFzc3dvcmQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgLy8gTk9ORTogU3RhdGljIHBlZXItdG8tcGVlciBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgICAgICBlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgICAgICBlbFJlY2VpdmVDYWxscy5zaG93KCk7IC8vIFNob3cgZm9yIHN0YXRpYyBjb25uZWN0aW9ucyB0b29cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzIGZvciBub25lXG4gICAgICAgICAgICAgICAgZWxIb3N0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIGVsUG9ydC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIGVsU2VjcmV0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZ2VuZXJhdGUgYW5kIGNvcHkgYnV0dG9ucyBmb3Igbm9uZSB0eXBlXG4gICAgICAgICAgICAgICAgZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGNvcHlCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cvaGlkZSBidXR0b24gaXMgYWx3YXlzIHZpc2libGVcbiAgICAgICAgICAgICAgICBzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVscyBmb3Igbm9uZSAocGVlci10by1wZWVyKVxuICAgICAgICAgICAgICAgIGxhYmVsSG9zdC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVySG9zdE9ySVBBZGRyZXNzIHx8ICdQZWVyIEhvc3QvSVAnKTtcbiAgICAgICAgICAgICAgICBsYWJlbFBvcnQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclBvcnQgfHwgJ1BlZXIgUG9ydCcpO1xuICAgICAgICAgICAgICAgIGxhYmVsVXNlcm5hbWUudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclVzZXJuYW1lIHx8ICdQZWVyIFVzZXJuYW1lJyk7XG4gICAgICAgICAgICAgICAgbGFiZWxTZWNyZXQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclBhc3N3b3JkIHx8ICdQZWVyIFBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgcG9ydCBpZiBlbXB0eVxuICAgICAgICAgICAgICAgIGlmICh2YWxQb3J0LnZhbCgpID09PSAnJyB8fCB2YWxQb3J0LnZhbCgpID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsUG9ydC52YWwoJzQ1NjknKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gd2hlbiBjb21wbGV0aW5nIHRoZSBob3N0IGFkZHJlc3MgaW5wdXQuXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FkZGl0aW9uYWwtaG9zdCcpO1xuXG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IHZhbHVlLm1hdGNoKHByb3ZpZGVyLmhvc3RJbnB1dFZhbGlkYXRpb24pO1xuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSB0aGUgaW5wdXQgdmFsdWVcbiAgICAgICAgICAgIGlmICh2YWxpZGF0aW9uID09PSBudWxsXG4gICAgICAgICAgICAgICAgfHwgdmFsaWRhdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBwcm92aWRlci4kYWRkaXRpb25hbEhvc3RJbnB1dC50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGhvc3QgYWRkcmVzcyBhbHJlYWR5IGV4aXN0c1xuICAgICAgICAgICAgaWYgKCQoYC5ob3N0LXJvd1tkYXRhLXZhbHVlPVwiJHt2YWx1ZX1cIl1gKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdHIgPSAkKCcuaG9zdC1yb3ctdHBsJykubGFzdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjbG9uZSA9ICR0ci5jbG9uZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoJChwcm92aWRlci5ob3N0Um93KS5sYXN0KCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ci5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQocHJvdmlkZXIuaG9zdFJvdykubGFzdCgpLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByb3ZpZGVyLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJvdmlkZXIuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBob3N0cyB0YWJsZSB2aWV3IGJhc2VkIG9uIHRoZSBwcmVzZW5jZSBvZiBhZGRpdGlvbmFsIGhvc3RzIG9yIHNob3dzIGR1bW15IGlmIHRoZXJlIGlzIG5vIHJlY29yZHNcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0c1RhYmxlVmlldygpIHtcbiAgICAgICAgaWYgKCQocHJvdmlkZXIuaG9zdFJvdykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBwcm92aWRlci4kYWRkaXRpb25hbEhvc3RzRHVtbXkuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcHJvdmlkZXIuJGFkZGl0aW9uYWxIb3N0c0R1bW15LmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICBjb25zdCBhcnJBZGRpdGlvbmFsSG9zdHMgPSBbXTtcbiAgICAgICAgJChwcm92aWRlci5ob3N0Um93KS5lYWNoKChfLCBvYmopID0+IHtcbiAgICAgICAgICAgIGlmICgkKG9iaikuYXR0cignZGF0YS12YWx1ZScpKSB7XG4gICAgICAgICAgICAgICAgYXJyQWRkaXRpb25hbEhvc3RzLnB1c2goeyBhZGRyZXNzOiAkKG9iaikuYXR0cignZGF0YS12YWx1ZScpIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmVzdWx0LmRhdGEuYWRkaXRpb25hbEhvc3RzID0gSlNPTi5zdHJpbmdpZnkoYXJyQWRkaXRpb25hbEhvc3RzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKCkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGVkIGJ5IEZvcm0gbW9kdWxlXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHByb3ZpZGVyLiRmb3JtT2JqO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJldmVudCBhdXRvLXN1Ym1pdCBvbiB2YWxpZGF0aW9uXG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSh7XG4gICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgaW5saW5lOiB0cnVlLFxuICAgICAgICAgICAga2V5Ym9hcmRTaG9ydGN1dHM6IGZhbHNlLFxuICAgICAgICAgICAgb25TdWNjZXNzOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIC8vIFByZXZlbnQgYXV0by1zdWJtaXQsIG9ubHkgc3VibWl0IHZpYSBidXR0b24gY2xpY2tcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGhvc3QgZmllbGRcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrSG9zdFByb3ZpZGVyID0gKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgICAgICAvLyBGb3IgSUFYLCBob3N0IGlzIGFsd2F5cyByZXF1aXJlZCBleGNlcHQgZm9yIGluYm91bmRcbiAgICAgICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdJQVgnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgaW5ib3VuZCwgaG9zdCBpcyBvcHRpb25hbCAod2UgYWNjZXB0IGNvbm5lY3Rpb25zKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRm9yIG91dGJvdW5kIGFuZCBub25lLCBob3N0IGlzIHJlcXVpcmVkXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnRyaW0oKSAhPT0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGb3IgU0lQLCB1c2Ugb3JpZ2luYWwgbG9naWNcbiAgICAgICAgICAgIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS50cmltKCkgIT09ICcnO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgdXNlcm5hbWUgZmllbGRcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVXNlcm5hbWUgPSAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2VybmFtZSBpcyBhbHdheXMgcmVxdWlyZWQgZm9yIElBWFxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgbWluaW11bSBsZW5ndGhcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUubGVuZ3RoID49IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZvciBTSVBcbiAgICAgICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlcm5hbWUgaXMgbm90IHJlcXVpcmVkIHdoZW4gcmVnVHlwZSBpcyAnbm9uZSdcbiAgICAgICAgICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBGb3Igb3RoZXIgdHlwZXMsIGNoZWNrIGlmIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5sZW5ndGggPj0gMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBzZWNyZXQgZmllbGRcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrU2VjcmV0ID0gKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdJQVgnKSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIElBWCwgc2VjcmV0IGlzIHJlcXVpcmVkIGZvciBvdXRib3VuZCBhbmQgbm9uZVxuICAgICAgICAgICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnIHx8IHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUudHJpbSgpICE9PSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRm9yIGluYm91bmQsIHNlY3JldCBpcyByZXF1aXJlZCBpZiByZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCBpcyBub3QgY2hlY2tlZFxuICAgICAgICAgICAgICAgIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjZWl2ZVdpdGhvdXRBdXRoID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNlaXZlV2l0aG91dEF1dGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS50cmltKCkgIT09ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3IgU0lQXG4gICAgICAgICAgICBpZiAocHJvdmlkZXIucHJvdmlkZXJUeXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgICAgIC8vIFNlY3JldCBpcyBub3QgcmVxdWlyZWQgd2hlbiByZWdUeXBlIGlzICdub25lJ1xuICAgICAgICAgICAgICAgIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEZvciBvdGhlciB0eXBlcywgc2VjcmV0IGlzIHJlcXVpcmVkIGlmIG5vdCBlbXB0eVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgcG9ydCBmaWVsZFxuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tQb3J0ID0gKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdJQVgnKSB7XG4gICAgICAgICAgICAgICAgLy8gUG9ydCBpcyBub3QgcmVxdWlyZWQgZm9yIGluYm91bmRcbiAgICAgICAgICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFsbG93IGVtcHR5IHZhbHVlIGZvciBpbmJvdW5kXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBGb3Igb3V0Ym91bmQgYW5kIG5vbmUsIHBvcnQgaXMgcmVxdWlyZWRcbiAgICAgICAgICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBwb3J0ID0gcGFyc2VJbnQodmFsdWUsIDEwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWlzTmFOKHBvcnQpICYmIHBvcnQgPj0gMSAmJiBwb3J0IDw9IDY1NTM1O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9yIFNJUCwgcG9ydCBpcyBhbHdheXMgcmVxdWlyZWRcbiAgICAgICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBwYXJzZUludCh2YWx1ZSwgMTApO1xuICAgICAgICAgICAgcmV0dXJuICFpc05hTihwb3J0KSAmJiBwb3J0ID49IDEgJiYgcG9ydCA8PSA2NTUzNTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAocHJvdmlkZXIucHJvdmlkZXJUeXBlKSB7XG4gICAgICAgICAgICBjYXNlICdTSVAnOlxuICAgICAgICAgICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvc2F2ZS9zaXBgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdJQVgnOlxuICAgICAgICAgICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvc2F2ZS9pYXhgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBwcm92aWRlci5nZXRWYWxpZGF0ZVJ1bGVzKCk7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBwcm92aWRlci5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gcHJvdmlkZXIuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciB1c2VybmFtZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBub3JlZ2lzdGVyIC0gVGhlIHZhbHVlIG9mIHRoZSAnbm9yZWdpc3RlcicgYXR0cmlidXRlLlxuICogQHBhcmFtIHtzdHJpbmd9IHVzZXJuYW1lIC0gVGhlIHZhbHVlIG9mIHRoZSB1c2VybmFtZSBpbnB1dCBmaWVsZC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFdoZXRoZXIgdGhlIHZhbGlkYXRpb24gcnVsZSBwYXNzZXMgb3Igbm90LlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudXNlcm5hbWUgPSBmdW5jdGlvbiAobm9yZWdpc3RlciwgdXNlcm5hbWUpIHtcbiAgICByZXR1cm4gISh1c2VybmFtZS5sZW5ndGggPT09IDAgJiYgbm9yZWdpc3RlciAhPT0gJ29uJyk7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgcGFzc3dvcmQgc3RyZW5ndGhcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSBwYXNzd29yZCB2YWx1ZVxuICogQHJldHVybnMge2Jvb2xlYW59IC0gV2hldGhlciB0aGUgcGFzc3dvcmQgbWVldHMgc3RyZW5ndGggcmVxdWlyZW1lbnRzXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja1Bhc3N3b3JkU3RyZW5ndGggPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBHZXQgcmVnaXN0cmF0aW9uIHR5cGVcbiAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgXG4gICAgLy8gU2tpcCB2YWxpZGF0aW9uIGZvciBvdXRib3VuZCBhbmQgbm9uZSByZWdpc3RyYXRpb24gdHlwZXNcbiAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJyB8fCByZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIFxuICAgIC8vIEZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzLCBhbHdheXMgcGFzc1xuICAgIGlmICh2YWx1ZS5zdGFydHNXaXRoKCdpZD0nKSB8fCB2YWx1ZS5sZW5ndGggPiAyMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgZm9yIG1pbmltdW0gcmVxdWlyZW1lbnRzXG4gICAgY29uc3QgaGFzTG93ZXJDYXNlID0gL1thLXpdLy50ZXN0KHZhbHVlKTtcbiAgICBjb25zdCBoYXNVcHBlckNhc2UgPSAvW0EtWl0vLnRlc3QodmFsdWUpO1xuICAgIGNvbnN0IGhhc051bWJlciA9IC9bMC05XS8udGVzdCh2YWx1ZSk7XG4gICAgY29uc3QgaGFzU3BlY2lhbENoYXIgPSAvWyFAIyQlXiYqKClfK1xcLT1cXFtcXF17fTsnOlwiXFxcXHwsLjw+XFwvP10vLnRlc3QodmFsdWUpO1xuICAgIFxuICAgIC8vIFBhc3N3b3JkIHNob3VsZCBoYXZlIGF0IGxlYXN0IDMgb2YgNCBjaGFyYWN0ZXIgdHlwZXNcbiAgICBjb25zdCBzdHJlbmd0aFNjb3JlID0gW2hhc0xvd2VyQ2FzZSwgaGFzVXBwZXJDYXNlLCBoYXNOdW1iZXIsIGhhc1NwZWNpYWxDaGFyXS5maWx0ZXIoQm9vbGVhbikubGVuZ3RoO1xuICAgIFxuICAgIHJldHVybiBzdHJlbmd0aFNjb3JlID49IDM7XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=