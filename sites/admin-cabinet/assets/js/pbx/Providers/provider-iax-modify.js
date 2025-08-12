"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, PasswordScore, TooltipBuilder, i18n, ProvidersAPI */

/**
 * IAX provider management form
 * @class ProviderIAX
 */
var ProviderIAX = /*#__PURE__*/function (_ProviderBase) {
  _inherits(ProviderIAX, _ProviderBase);

  var _super = _createSuper(ProviderIAX);

  function ProviderIAX() {
    _classCallCheck(this, ProviderIAX);

    return _super.call(this, 'IAX');
  }
  /**
   * Initialize the provider form
   */


  _createClass(ProviderIAX, [{
    key: "initialize",
    value: function initialize() {
      _get(_getPrototypeOf(ProviderIAX.prototype), "initialize", this).call(this); // IAX-specific initialization


      this.initializeIaxWarningMessage();
      this.initializeRealtimeValidation();
      this.initializeRegistrationTypeHandlers(); // Re-validate form when receive_calls_without_auth changes

      var self = this;
      $('#receive_calls_without_auth.checkbox').checkbox('setting', 'onChange', function () {
        // Get registration type to determine validation rules
        var regType = $('#registration_type').val(); // Clear any existing error on secret field

        self.$formObj.form('remove prompt', 'secret');
        self.$secret.closest('.field').removeClass('error'); // For inbound registration, validate based on checkbox state

        if (regType === 'inbound') {
          var isChecked = $('#receive_calls_without_auth').checkbox('is checked');

          if (!isChecked && self.$secret.val() === '') {
            // If unchecked and password is empty, show error
            setTimeout(function () {
              self.$formObj.form('validate field', 'secret');
            }, 100);
          }
        } // Mark form as changed


        Form.dataChanged();
      }); // Initialize field help tooltips

      this.initializeFieldTooltips();
    }
    /**
     * Initialize form with REST API configuration
     */

  }, {
    key: "initializeForm",
    value:
    /**
     * Override parent's initializeForm to handle dynamic validation rules
     */
    function initializeForm() {
      var self = this;
      Form.$formObj = this.$formObj; // Get initial validation rules

      var validationConfig = {
        on: 'blur',
        inline: true,
        keyboardShortcuts: false,
        fields: this.getValidateRules(),
        onSuccess: function onSuccess(event) {
          // Prevent auto-submit, only submit via button click
          if (event) {
            event.preventDefault();
          }

          return false;
        }
      }; // Initialize form with validation

      Form.$formObj.form(validationConfig); // Configure REST API settings

      Form.apiSettings = {
        enabled: true,
        apiObject: ProvidersAPI,
        saveMethod: 'saveRecord'
      };
      Form.validateRules = this.getValidateRules();
      Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
      Form.initialize(); // Override Form's submit button handler to use dynamic validation rules

      Form.$submitButton.off('click').on('click', function (e) {
        e.preventDefault();
        if (Form.$submitButton.hasClass('loading')) return;
        if (Form.$submitButton.hasClass('disabled')) return; // Get current validation rules based on form state

        var currentRules = self.getValidateRules(); // Set up form validation with current rules and submit

        Form.$formObj.form({
          on: 'blur',
          fields: currentRules,
          onSuccess: function onSuccess() {
            // Call submitForm() on successful validation
            Form.submitForm();
          },
          onFailure: function onFailure() {
            // Add error class to form on validation failure
            Form.$formObj.removeClass('error').addClass('error');
          }
        });
        Form.$formObj.form('validate form');
      });
    }
    /**
     * Update the visibility of elements based on the registration type
     */

  }, {
    key: "cbBeforeSendForm",
    value:
    /**
     * Callback before form submission
     */
    function cbBeforeSendForm(settings) {
      var result = _get(_getPrototypeOf(ProviderIAX.prototype), "cbBeforeSendForm", this).call(this, settings); // Add provider type


      result.data.type = this.providerType; // Convert checkbox values to proper booleans

      var booleanFields = ['disabled', 'qualify', 'disablefromuser', 'noregister', 'receive_calls_without_auth'];
      booleanFields.forEach(function (field) {
        if (result.data.hasOwnProperty(field)) {
          // Convert various checkbox representations to boolean
          result.data[field] = result.data[field] === true || result.data[field] === 'true' || result.data[field] === '1' || result.data[field] === 'on';
        }
      });
      return result;
    }
    /**
     * Callback after form submission
     */

  }, {
    key: "cbAfterSendForm",
    value: function cbAfterSendForm(response) {
      _get(_getPrototypeOf(ProviderIAX.prototype), "cbAfterSendForm", this).call(this, response);

      if (response.result && response.data) {
        // Update form with response data if needed
        if (response.data.uniqid && !$('#uniqid').val()) {
          $('#uniqid').val(response.data.uniqid);
        } // The Form.js will handle the reload automatically if response.reload is present
        // For new records, REST API returns reload path like "providers/modifyiax/IAX-TRUNK-xxx"

      }
    }
    /**
     * Initialize IAX warning message handling
     */

  }, {
    key: "initializeIaxWarningMessage",
    value: function initializeIaxWarningMessage() {
      var $warningMessage = $('#elReceiveCalls').next('.warning.message');
      var $checkboxInput = $('#receive_calls_without_auth'); // Function to update warning message state

      function updateWarningState() {
        if ($checkboxInput.prop('checked')) {
          $warningMessage.removeClass('hidden');
        } else {
          $warningMessage.addClass('hidden');
        }
      } // Initialize warning state


      updateWarningState(); // Handle checkbox changes

      var self = this;
      $('#receive_calls_without_auth.checkbox').checkbox({
        onChecked: function onChecked() {
          $warningMessage.removeClass('hidden').transition('fade in');
        },
        onUnchecked: function onUnchecked() {
          $warningMessage.transition('fade out', function () {
            $warningMessage.addClass('hidden');
          });
        }
      });
    }
    /**
     * Initialize real-time validation feedback
     */

  }, {
    key: "initializeRealtimeValidation",
    value: function initializeRealtimeValidation() {
      var _this = this;

      // Enable inline validation for better UX
      this.$formObj.form('setting', 'inline', true); // Password strength indicator

      if (this.$secret.length > 0 && typeof PasswordScore !== 'undefined') {
        // Create progress bar for password strength if it doesn't exist
        var $passwordProgress = $('#password-strength-progress');

        if ($passwordProgress.length === 0) {
          var $secretField = this.$secret.closest('.field');
          $passwordProgress = $('<div class="ui tiny progress" id="password-strength-progress"><div class="bar"></div></div>');
          $secretField.append($passwordProgress);
        } // Update password strength on input


        this.$secret.on('input', function () {
          PasswordScore.checkPassStrength({
            pass: _this.$secret.val(),
            bar: $passwordProgress,
            section: $passwordProgress
          });
        });
      } // Add helper text for IAX-specific fields


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
      }); // Validate on blur for immediate feedback

      var self = this;
      this.$formObj.find('input[type="text"], input[type="password"]').on('blur', function () {
        var fieldName = $(this).attr('name');
        var validateRules = self.getValidateRules();

        if (fieldName && validateRules[fieldName]) {
          self.$formObj.form('validate field', fieldName);
        }
      });
    }
    /**
     * Initialize field help tooltips
     */

  }, {
    key: "initializeFieldTooltips",
    value: function initializeFieldTooltips() {
      // Build tooltip data structures
      var registrationTypeData = {
        header: globalTranslate.iax_RegistrationTypeTooltip_header,
        list: [{
          term: globalTranslate.iax_RegistrationTypeTooltip_outbound,
          definition: globalTranslate.iax_RegistrationTypeTooltip_outbound_desc
        }, {
          term: globalTranslate.iax_RegistrationTypeTooltip_inbound,
          definition: globalTranslate.iax_RegistrationTypeTooltip_inbound_desc
        }, {
          term: globalTranslate.iax_RegistrationTypeTooltip_none,
          definition: globalTranslate.iax_RegistrationTypeTooltip_none_desc
        }]
      };
      var receiveCallsData = {
        header: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_header,
        description: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_desc,
        warning: {
          header: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_warning_header,
          text: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_warning
        },
        list: [{
          term: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_application,
          definition: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_application_desc
        }]
      };
      var networkFilterData = {
        header: globalTranslate.iax_NetworkFilterTooltip_header,
        description: globalTranslate.iax_NetworkFilterTooltip_desc,
        list: [{
          term: globalTranslate.iax_NetworkFilterTooltip_inbound,
          definition: globalTranslate.iax_NetworkFilterTooltip_inbound_desc
        }, {
          term: globalTranslate.iax_NetworkFilterTooltip_outbound,
          definition: globalTranslate.iax_NetworkFilterTooltip_outbound_desc
        }, {
          term: globalTranslate.iax_NetworkFilterTooltip_none,
          definition: globalTranslate.iax_NetworkFilterTooltip_none_desc
        }]
      };
      var providerHostData = {
        header: globalTranslate.iax_ProviderHostTooltip_header,
        description: globalTranslate.iax_ProviderHostTooltip_desc,
        list: [globalTranslate.iax_ProviderHostTooltip_format_ip, globalTranslate.iax_ProviderHostTooltip_format_domain, globalTranslate.iax_ProviderHostTooltip_outbound_use, globalTranslate.iax_ProviderHostTooltip_none_use],
        note: globalTranslate.iax_ProviderHostTooltip_note
      };
      var portData = {
        header: globalTranslate.iax_PortTooltip_header,
        description: globalTranslate.iax_PortTooltip_desc,
        list: [globalTranslate.iax_PortTooltip_default, globalTranslate.iax_PortTooltip_info],
        note: globalTranslate.iax_PortTooltip_note
      };
      var manualAttributesData = {
        header: i18n('iax_ManualAttributesTooltip_header'),
        description: i18n('iax_ManualAttributesTooltip_desc'),
        list: [{
          term: i18n('iax_ManualAttributesTooltip_format'),
          definition: null
        }],
        examplesHeader: i18n('iax_ManualAttributesTooltip_examples_header'),
        examples: ['language = ru', 'codecpriority = host', 'trunktimestamps = yes', 'trunk = yes'],
        warning: {
          header: i18n('iax_ManualAttributesTooltip_warning_header'),
          text: i18n('iax_ManualAttributesTooltip_warning')
        }
      };
      var tooltipConfigs = {
        'registration_type': registrationTypeData,
        'receive_calls_without_auth': receiveCallsData,
        'network_filter': networkFilterData,
        'provider_host': providerHostData,
        'iax_port': portData,
        'manual_attributes': manualAttributesData
      }; // Initialize tooltips using TooltipBuilder

      TooltipBuilder.initialize(tooltipConfigs);
    }
    /**
     * Get validation rules based on registration type
     * @returns {object} Validation rules
     */

  }, {
    key: "getValidateRules",
    value: function getValidateRules() {
      var regType = $('#registration_type').val();

      switch (regType) {
        case 'outbound':
          return this.getOutboundRules();

        case 'inbound':
          return this.getInboundRules();

        case 'none':
          return this.getNoneRules();

        default:
          return this.getOutboundRules();
      }
    }
    /**
     * Get validation rules for outbound registration
     */

  }, {
    key: "getOutboundRules",
    value: function getOutboundRules() {
      return {
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
      };
    }
    /**
     * Get validation rules for inbound registration
     */

  }, {
    key: "getInboundRules",
    value: function getInboundRules() {
      var receiveWithoutAuth = $('#receive_calls_without_auth').checkbox('is checked');
      var rules = {
        description: {
          identifier: 'description',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
          }]
        },
        username: {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }]
        }
      }; // Secret is optional if receive_calls_without_auth is checked

      if (!receiveWithoutAuth) {
        rules.secret = {
          identifier: 'secret',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
          }, {
            type: 'minLength[8]',
            prompt: globalTranslate.pr_ValidationProviderPasswordTooShort
          }]
        };
      } else {
        rules.secret = {
          identifier: 'secret',
          optional: true,
          rules: []
        };
      }

      return rules;
    }
    /**
     * Get validation rules for none registration
     */

  }, {
    key: "getNoneRules",
    value: function getNoneRules() {
      return {
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
      };
    }
    /**
     * Initialize registration type change handlers
     */

  }, {
    key: "initializeRegistrationTypeHandlers",
    value: function initializeRegistrationTypeHandlers() {// Registration type handler is now in base class
      // This method is kept for compatibility
    }
    /**
     * Initialize network filter dropdown with IAX category
     */

  }, {
    key: "initializeNetworkFilterDropdown",
    value: function initializeNetworkFilterDropdown() {
      var _this2 = this;

      var $field = $('#networkfilterid');
      if ($field.length === 0) return; // Get the dropdown element

      var $dropdown = $field;

      if ($field.is('select')) {
        $dropdown = $field.hasClass('ui') ? $field : $field.closest('.ui.dropdown');

        if ($dropdown.length === 0) {
          $dropdown = $field;
        }
      } // Get current value


      var currentValue = this.getCurrentNetworkFilterValue(); // Use NetworkFiltersAPI to initialize the dropdown with IAX category

      NetworkFiltersAPI.initializeDropdown($dropdown, {
        currentValue: currentValue,
        categories: ['IAX'],
        // Use IAX category instead of SIP
        onChange: function onChange(value) {
          _this2.onNetworkFilterChange(value);

          Form.dataChanged();
        }
      });
    }
  }, {
    key: "updateVisibilityElements",
    value: function updateVisibilityElements() {
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
      var valSecret = this.$secret;
      var valPort = $('#port');
      var valQualify = $('#qualify');
      var copyButton = $('#elSecret .button.clipboard');
      var showHideButton = $('#show-hide-password'); // Get label text elements

      var labelHostText = $('#hostLabelText');
      var labelPortText = $('#portLabelText');
      var labelUsernameText = $('#usernameLabelText');
      var labelSecretText = $('#secretLabelText'); // Always enable qualify for IAX (NAT keepalive)

      if (valQualify.length > 0) {
        valQualify.prop('checked', true);
        valQualify.val('1');
      }

      valUserName.removeAttr('readonly'); // Hide password tooltip by default

      this.hidePasswordTooltip(); // Update element visibility based on registration type

      if (regType === 'outbound') {
        // OUTBOUND: We register to provider
        elHost.show();
        elPort.show();
        elUsername.show();
        elSecret.show();
        elReceiveCalls.hide();
        elNetworkFilter.hide(); // Network filter not relevant for outbound
        // Update required fields

        elHost.addClass('required');
        elPort.addClass('required');
        elUsername.addClass('required');
        elSecret.addClass('required'); // Hide generate and copy buttons for outbound

        genPassword.hide();
        copyButton.hide();
        showHideButton.show(); // Update labels for outbound

        labelHostText.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP');
        labelPortText.text(globalTranslate.pr_ProviderPort || 'Provider Port');
        labelUsernameText.text(globalTranslate.pr_ProviderLogin || 'Login');
        labelSecretText.text(globalTranslate.pr_ProviderPassword || 'Password'); // Set default port if empty

        if (valPort.val() === '' || valPort.val() === '0') {
          valPort.val('4569');
        }
      } else if (regType === 'inbound') {
        // INBOUND: Provider connects to us
        valUserName.val(elUniqId.val());
        valUserName.attr('readonly', ''); // Auto-generate password for inbound registration if empty

        if (valSecret.val().trim() === '') {
          this.generatePassword();
        }

        elHost.show();
        elPort.hide();
        elUsername.show();
        elSecret.show();
        elReceiveCalls.show();
        elNetworkFilter.show(); // Network filter available for security
        // Remove validation prompt for hidden port field

        this.$formObj.form('remove prompt', 'port'); // Update required fields

        elHost.removeClass('required');
        elPort.removeClass('required');
        elUsername.addClass('required');
        elSecret.addClass('required'); // Remove host validation error since it's optional for inbound

        this.$formObj.form('remove prompt', 'host');
        $('#host').closest('.field').removeClass('error'); // Show all buttons for inbound

        genPassword.show();
        copyButton.show();
        showHideButton.show();
        copyButton.attr('data-clipboard-text', valSecret.val()); // Restore network filter state if needed

        this.restoreNetworkFilterState(); // Update labels for inbound

        labelHostText.text(globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host/IP');
        labelUsernameText.text(globalTranslate.pr_AuthenticationUsername || 'Authentication Username');
        labelSecretText.text(globalTranslate.pr_AuthenticationPassword || 'Authentication Password');
      } else if (regType === 'none') {
        // NONE: Static peer-to-peer connection
        elHost.show();
        elPort.show();
        elUsername.show();
        elSecret.show();
        elReceiveCalls.show();
        elNetworkFilter.show(); // Network filter available for security
        // Show tooltip icon for password field

        this.showPasswordTooltip(); // Update required fields

        elHost.addClass('required');
        elPort.addClass('required');
        elUsername.addClass('required');
        elSecret.removeClass('required'); // Password is optional in none mode
        // Hide generate and copy buttons

        genPassword.hide();
        copyButton.hide();
        showHideButton.show(); // Restore network filter state if needed

        this.restoreNetworkFilterState(); // Update labels for none (peer-to-peer)

        labelHostText.text(globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP');
        labelPortText.text(globalTranslate.pr_PeerPort || 'Peer Port');
        labelUsernameText.text(globalTranslate.pr_PeerUsername || 'Peer Username');
        labelSecretText.text(globalTranslate.pr_PeerPassword || 'Peer Password'); // Set default port if empty

        if (valPort.val() === '' || valPort.val() === '0') {
          valPort.val('4569');
        }
      }
    }
  }]);

  return ProviderIAX;
}(ProviderBase);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzIiwic2VsZiIsIiQiLCJjaGVja2JveCIsInJlZ1R5cGUiLCJ2YWwiLCIkZm9ybU9iaiIsImZvcm0iLCIkc2VjcmV0IiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwiaXNDaGVja2VkIiwic2V0VGltZW91dCIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImluaXRpYWxpemVGaWVsZFRvb2x0aXBzIiwidmFsaWRhdGlvbkNvbmZpZyIsIm9uIiwiaW5saW5lIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJmaWVsZHMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwib25TdWNjZXNzIiwiZXZlbnQiLCJwcmV2ZW50RGVmYXVsdCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIlByb3ZpZGVyc0FQSSIsInNhdmVNZXRob2QiLCJ2YWxpZGF0ZVJ1bGVzIiwiY2JCZWZvcmVTZW5kRm9ybSIsImJpbmQiLCJjYkFmdGVyU2VuZEZvcm0iLCJpbml0aWFsaXplIiwiJHN1Ym1pdEJ1dHRvbiIsIm9mZiIsImUiLCJoYXNDbGFzcyIsImN1cnJlbnRSdWxlcyIsInN1Ym1pdEZvcm0iLCJvbkZhaWx1cmUiLCJhZGRDbGFzcyIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsInR5cGUiLCJwcm92aWRlclR5cGUiLCJib29sZWFuRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkIiwiaGFzT3duUHJvcGVydHkiLCJyZXNwb25zZSIsInVuaXFpZCIsIiR3YXJuaW5nTWVzc2FnZSIsIm5leHQiLCIkY2hlY2tib3hJbnB1dCIsInVwZGF0ZVdhcm5pbmdTdGF0ZSIsInByb3AiLCJvbkNoZWNrZWQiLCJ0cmFuc2l0aW9uIiwib25VbmNoZWNrZWQiLCJsZW5ndGgiLCJQYXNzd29yZFNjb3JlIiwiJHBhc3N3b3JkUHJvZ3Jlc3MiLCIkc2VjcmV0RmllbGQiLCJhcHBlbmQiLCJjaGVja1Bhc3NTdHJlbmd0aCIsInBhc3MiLCJiYXIiLCJzZWN0aW9uIiwiJHBvcnRGaWVsZCIsImZpbmQiLCIkbGFiZWwiLCJzaG93IiwiaGlkZSIsImZpZWxkTmFtZSIsImF0dHIiLCJyZWdpc3RyYXRpb25UeXBlRGF0YSIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIiLCJsaXN0IiwidGVybSIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCIsImRlZmluaXRpb24iLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmRfZGVzYyIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzYyIsInJlY2VpdmVDYWxsc0RhdGEiLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9kZXNjIiwid2FybmluZyIsImlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbiIsImlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb25fZGVzYyIsIm5ldHdvcmtGaWx0ZXJEYXRhIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2hlYWRlciIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9kZXNjIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmQiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZF9kZXNjIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZSIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lX2Rlc2MiLCJwcm92aWRlckhvc3REYXRhIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW4iLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF91c2UiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lX3VzZSIsIm5vdGUiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlIiwicG9ydERhdGEiLCJpYXhfUG9ydFRvb2x0aXBfaGVhZGVyIiwiaWF4X1BvcnRUb29sdGlwX2Rlc2MiLCJpYXhfUG9ydFRvb2x0aXBfZGVmYXVsdCIsImlheF9Qb3J0VG9vbHRpcF9pbmZvIiwiaWF4X1BvcnRUb29sdGlwX25vdGUiLCJtYW51YWxBdHRyaWJ1dGVzRGF0YSIsImkxOG4iLCJleGFtcGxlc0hlYWRlciIsImV4YW1wbGVzIiwidG9vbHRpcENvbmZpZ3MiLCJUb29sdGlwQnVpbGRlciIsImdldE91dGJvdW5kUnVsZXMiLCJnZXRJbmJvdW5kUnVsZXMiLCJnZXROb25lUnVsZXMiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJwcm9tcHQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsImhvc3QiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5Iiwic2VjcmV0Iiwib3B0aW9uYWwiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCIsInJlY2VpdmVXaXRob3V0QXV0aCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IiwiJGZpZWxkIiwiJGRyb3Bkb3duIiwiaXMiLCJjdXJyZW50VmFsdWUiLCJnZXRDdXJyZW50TmV0d29ya0ZpbHRlclZhbHVlIiwiTmV0d29ya0ZpbHRlcnNBUEkiLCJpbml0aWFsaXplRHJvcGRvd24iLCJjYXRlZ29yaWVzIiwib25DaGFuZ2UiLCJ2YWx1ZSIsIm9uTmV0d29ya0ZpbHRlckNoYW5nZSIsImVsSG9zdCIsImVsVXNlcm5hbWUiLCJlbFNlY3JldCIsImVsUG9ydCIsImVsUmVjZWl2ZUNhbGxzIiwiZWxOZXR3b3JrRmlsdGVyIiwiZWxVbmlxSWQiLCJnZW5QYXNzd29yZCIsInZhbFVzZXJOYW1lIiwidmFsU2VjcmV0IiwidmFsUG9ydCIsInZhbFF1YWxpZnkiLCJjb3B5QnV0dG9uIiwic2hvd0hpZGVCdXR0b24iLCJsYWJlbEhvc3RUZXh0IiwibGFiZWxQb3J0VGV4dCIsImxhYmVsVXNlcm5hbWVUZXh0IiwibGFiZWxTZWNyZXRUZXh0IiwicmVtb3ZlQXR0ciIsImhpZGVQYXNzd29yZFRvb2x0aXAiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1Byb3ZpZGVyUG9ydCIsInByX1Byb3ZpZGVyTG9naW4iLCJwcl9Qcm92aWRlclBhc3N3b3JkIiwidHJpbSIsImdlbmVyYXRlUGFzc3dvcmQiLCJyZXN0b3JlTmV0d29ya0ZpbHRlclN0YXRlIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSIsInByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQiLCJzaG93UGFzc3dvcmRUb29sdGlwIiwicHJfUGVlckhvc3RPcklQQWRkcmVzcyIsInByX1BlZXJQb3J0IiwicHJfUGVlclVzZXJuYW1lIiwicHJfUGVlclBhc3N3b3JkIiwiUHJvdmlkZXJCYXNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxXOzs7OztBQUNGLHlCQUFjO0FBQUE7O0FBQUEsNkJBQ0osS0FESTtBQUViO0FBRUQ7QUFDSjtBQUNBOzs7OztXQUNJLHNCQUFhO0FBQ1Qsa0ZBRFMsQ0FHVDs7O0FBQ0EsV0FBS0MsMkJBQUw7QUFDQSxXQUFLQyw0QkFBTDtBQUNBLFdBQUtDLGtDQUFMLEdBTlMsQ0FRVDs7QUFDQSxVQUFNQyxJQUFJLEdBQUcsSUFBYjtBQUNBQyxNQUFBQSxDQUFDLENBQUMsc0NBQUQsQ0FBRCxDQUEwQ0MsUUFBMUMsQ0FBbUQsU0FBbkQsRUFBOEQsVUFBOUQsRUFBMEUsWUFBTTtBQUM1RTtBQUNBLFlBQU1DLE9BQU8sR0FBR0YsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0JHLEdBQXhCLEVBQWhCLENBRjRFLENBSTVFOztBQUNBSixRQUFBQSxJQUFJLENBQUNLLFFBQUwsQ0FBY0MsSUFBZCxDQUFtQixlQUFuQixFQUFvQyxRQUFwQztBQUNBTixRQUFBQSxJQUFJLENBQUNPLE9BQUwsQ0FBYUMsT0FBYixDQUFxQixRQUFyQixFQUErQkMsV0FBL0IsQ0FBMkMsT0FBM0MsRUFONEUsQ0FRNUU7O0FBQ0EsWUFBSU4sT0FBTyxLQUFLLFNBQWhCLEVBQTJCO0FBQ3ZCLGNBQU1PLFNBQVMsR0FBR1QsQ0FBQyxDQUFD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Q0FBQ3ZILFFBQVAsQ0FBZ0IsVUFBaEI7QUFDQTBILFFBQUFBLE1BQU0sQ0FBQzFILFFBQVAsQ0FBZ0IsVUFBaEI7QUFDQXdILFFBQUFBLFVBQVUsQ0FBQ3hILFFBQVgsQ0FBb0IsVUFBcEI7QUFDQXlILFFBQUFBLFFBQVEsQ0FBQ3pKLFdBQVQsQ0FBcUIsVUFBckIsRUFoQjJCLENBZ0JPO0FBRWxDOztBQUNBOEosUUFBQUEsV0FBVyxDQUFDN0YsSUFBWjtBQUNBa0csUUFBQUEsVUFBVSxDQUFDbEcsSUFBWDtBQUNBbUcsUUFBQUEsY0FBYyxDQUFDcEcsSUFBZixHQXJCMkIsQ0F1QjNCOztBQUNBLGFBQUtpSCx5QkFBTCxHQXhCMkIsQ0EwQjNCOztBQUNBWixRQUFBQSxhQUFhLENBQUM5RSxJQUFkLENBQW1CakIsZUFBZSxDQUFDZ0gsc0JBQWhCLElBQTBDLGNBQTdEO0FBQ0FoQixRQUFBQSxhQUFhLENBQUMvRSxJQUFkLENBQW1CakIsZUFBZSxDQUFDaUgsV0FBaEIsSUFBK0IsV0FBbEQ7QUFDQWhCLFFBQUFBLGlCQUFpQixDQUFDaEYsSUFBbEIsQ0FBdUJqQixlQUFlLENBQUNrSCxlQUFoQixJQUFtQyxlQUExRDtBQUNBaEIsUUFBQUEsZUFBZSxDQUFDakYsSUFBaEIsQ0FBcUJqQixlQUFlLENBQUNtSCxlQUFoQixJQUFtQyxlQUF4RCxFQTlCMkIsQ0FnQzNCOztBQUNBLFlBQUl4QixPQUFPLENBQUN0SyxHQUFSLE9BQWtCLEVBQWxCLElBQXdCc0ssT0FBTyxDQUFDdEssR0FBUixPQUFrQixHQUE5QyxFQUFtRDtBQUMvQ3NLLFVBQUFBLE9BQU8sQ0FBQ3RLLEdBQVIsQ0FBWSxNQUFaO0FBQ0g7QUFDSjtBQUNKOzs7O0VBeHVCcUIrTCxZIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQYXNzd29yZFNjb3JlLCBUb29sdGlwQnVpbGRlciwgaTE4biwgUHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogSUFYIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVySUFYXG4gKi9cbmNsYXNzIFByb3ZpZGVySUFYIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHsgXG4gICAgICAgIHN1cGVyKCdJQVgnKTsgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLmluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS12YWxpZGF0ZSBmb3JtIHdoZW4gcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggY2hhbmdlc1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoLmNoZWNrYm94JykuY2hlY2tib3goJ3NldHRpbmcnLCAnb25DaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBHZXQgcmVnaXN0cmF0aW9uIHR5cGUgdG8gZGV0ZXJtaW5lIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIGVycm9yIG9uIHNlY3JldCBmaWVsZFxuICAgICAgICAgICAgc2VsZi4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgc2VsZi4kc2VjcmV0LmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3IgaW5ib3VuZCByZWdpc3RyYXRpb24sIHZhbGlkYXRlIGJhc2VkIG9uIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCAmJiBzZWxmLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHVuY2hlY2tlZCBhbmQgcGFzc3dvcmQgaXMgZW1wdHksIHNob3cgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZpZWxkJywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRmllbGRUb29sdGlwcygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGhpcy5jYkJlZm9yZVNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGhpcy5jYkFmdGVyU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5nc1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogUHJvdmlkZXJzQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdwcm92aWRlcnMvaW5kZXgvJztcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAncHJvdmlkZXJzL21vZGlmeS8nO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLmNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9IHRoaXMucHJvdmlkZXJUeXBlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gcHJvcGVyIGJvb2xlYW5zXG4gICAgICAgIGNvbnN0IGJvb2xlYW5GaWVsZHMgPSBbJ2Rpc2FibGVkJywgJ3F1YWxpZnknLCAnZGlzYWJsZWZyb211c2VyJywgJ25vcmVnaXN0ZXInLCAncmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnXTtcbiAgICAgICAgYm9vbGVhbkZpZWxkcy5mb3JFYWNoKChmaWVsZCkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmhhc093blByb3BlcnR5KGZpZWxkKSkge1xuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgdmFyaW91cyBjaGVja2JveCByZXByZXNlbnRhdGlvbnMgdG8gYm9vbGVhblxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkXSA9IHJlc3VsdC5kYXRhW2ZpZWxkXSA9PT0gdHJ1ZSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZF0gPT09ICd0cnVlJyB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZF0gPT09ICcxJyB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZF0gPT09ICdvbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIHN1cGVyLmNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YSBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLnVuaXFpZCAmJiAhJCgnI3VuaXFpZCcpLnZhbCgpKSB7XG4gICAgICAgICAgICAgICAgJCgnI3VuaXFpZCcpLnZhbChyZXNwb25zZS5kYXRhLnVuaXFpZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRoZSBGb3JtLmpzIHdpbGwgaGFuZGxlIHRoZSByZWxvYWQgYXV0b21hdGljYWxseSBpZiByZXNwb25zZS5yZWxvYWQgaXMgcHJlc2VudFxuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBSRVNUIEFQSSByZXR1cm5zIHJlbG9hZCBwYXRoIGxpa2UgXCJwcm92aWRlcnMvbW9kaWZ5aWF4L0lBWC1UUlVOSy14eHhcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBJQVggd2FybmluZyBtZXNzYWdlIGhhbmRsaW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCkge1xuICAgICAgICBjb25zdCAkd2FybmluZ01lc3NhZ2UgPSAkKCcjZWxSZWNlaXZlQ2FsbHMnKS5uZXh0KCcud2FybmluZy5tZXNzYWdlJyk7XG4gICAgICAgIGNvbnN0ICRjaGVja2JveElucHV0ID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGdW5jdGlvbiB0byB1cGRhdGUgd2FybmluZyBtZXNzYWdlIHN0YXRlXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZVdhcm5pbmdTdGF0ZSgpIHtcbiAgICAgICAgICAgIGlmICgkY2hlY2tib3hJbnB1dC5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdhcm5pbmcgc3RhdGVcbiAgICAgICAgdXBkYXRlV2FybmluZ1N0YXRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2hlY2tib3ggY2hhbmdlc1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGVja2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpLnRyYW5zaXRpb24oJ2ZhZGUgaW4nKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblVuY2hlY2tlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnRyYW5zaXRpb24oJ2ZhZGUgb3V0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVhbC10aW1lIHZhbGlkYXRpb24gZmVlZGJhY2tcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uKCkge1xuICAgICAgICAvLyBFbmFibGUgaW5saW5lIHZhbGlkYXRpb24gZm9yIGJldHRlciBVWFxuICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3NldHRpbmcnLCAnaW5saW5lJywgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBQYXNzd29yZCBzdHJlbmd0aCBpbmRpY2F0b3JcbiAgICAgICAgaWYgKHRoaXMuJHNlY3JldC5sZW5ndGggPiAwICYmIHR5cGVvZiBQYXNzd29yZFNjb3JlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIHByb2dyZXNzIGJhciBmb3IgcGFzc3dvcmQgc3RyZW5ndGggaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgbGV0ICRwYXNzd29yZFByb2dyZXNzID0gJCgnI3Bhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgICAgICBpZiAoJHBhc3N3b3JkUHJvZ3Jlc3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHNlY3JldEZpZWxkID0gdGhpcy4kc2VjcmV0LmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICAgICAgICAgICRwYXNzd29yZFByb2dyZXNzID0gJCgnPGRpdiBjbGFzcz1cInVpIHRpbnkgcHJvZ3Jlc3NcIiBpZD1cInBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzXCI+PGRpdiBjbGFzcz1cImJhclwiPjwvZGl2PjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICRzZWNyZXRGaWVsZC5hcHBlbmQoJHBhc3N3b3JkUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgc3RyZW5ndGggb24gaW5wdXRcbiAgICAgICAgICAgIHRoaXMuJHNlY3JldC5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgUGFzc3dvcmRTY29yZS5jaGVja1Bhc3NTdHJlbmd0aCh7XG4gICAgICAgICAgICAgICAgICAgIHBhc3M6IHRoaXMuJHNlY3JldC52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgYmFyOiAkcGFzc3dvcmRQcm9ncmVzcyxcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogJHBhc3N3b3JkUHJvZ3Jlc3NcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaGVscGVyIHRleHQgZm9yIElBWC1zcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgY29uc3QgJHBvcnRGaWVsZCA9ICQoJyNwb3J0JykuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgIGlmICgkcG9ydEZpZWxkLmZpbmQoJy51aS5wb2ludGluZy5sYWJlbCcpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJHBvcnRGaWVsZC5hcHBlbmQoJzxkaXYgY2xhc3M9XCJ1aSBwb2ludGluZyBsYWJlbFwiIHN0eWxlPVwiZGlzcGxheTogbm9uZTtcIj5EZWZhdWx0IElBWCBwb3J0IGlzIDQ1Njk8L2Rpdj4nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBwb3J0IGhlbHBlciBvbiBmb2N1c1xuICAgICAgICAkKCcjcG9ydCcpLm9uKCdmb2N1cycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJCh0aGlzKS5jbG9zZXN0KCcuZmllbGQnKS5maW5kKCcudWkucG9pbnRpbmcubGFiZWwnKTtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLnZhbCgpID09PSAnJyB8fCAkKHRoaXMpLnZhbCgpID09PSAnNDU2OScpIHtcbiAgICAgICAgICAgICAgICAkbGFiZWwuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5vbignYmx1cicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5jbG9zZXN0KCcuZmllbGQnKS5maW5kKCcudWkucG9pbnRpbmcubGFiZWwnKS5oaWRlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVmFsaWRhdGUgb24gYmx1ciBmb3IgaW1tZWRpYXRlIGZlZWRiYWNrXG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W3R5cGU9XCJ0ZXh0XCJdLCBpbnB1dFt0eXBlPVwicGFzc3dvcmRcIl0nKS5vbignYmx1cicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJCh0aGlzKS5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0ZVJ1bGVzID0gc2VsZi5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICBpZiAoZmllbGROYW1lICYmIHZhbGlkYXRlUnVsZXNbZmllbGROYW1lXSkge1xuICAgICAgICAgICAgICAgIHNlbGYuJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZmllbGQnLCBmaWVsZE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmllbGRUb29sdGlwcygpIHsgXG4gICAgICAgIC8vIEJ1aWxkIHRvb2x0aXAgZGF0YSBzdHJ1Y3R1cmVzXG4gICAgICAgIGNvbnN0IHJlZ2lzdHJhdGlvblR5cGVEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcmVjZWl2ZUNhbGxzRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2FwcGxpY2F0aW9uX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgbmV0d29ya0ZpbHRlckRhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9vdXRib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcHJvdmlkZXJIb3N0RGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2lwLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfZG9tYWluLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF91c2UsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfdXNlXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vdGVcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwb3J0RGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qb3J0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qb3J0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUG9ydFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX2luZm9cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX25vdGVcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBtYW51YWxBdHRyaWJ1dGVzRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlcicpLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kZXNjJyksXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBpMThuKCdpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0JyksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXInKSxcbiAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgJ2xhbmd1YWdlID0gcnUnLFxuICAgICAgICAgICAgICAgICdjb2RlY3ByaW9yaXR5ID0gaG9zdCcsXG4gICAgICAgICAgICAgICAgJ3RydW5rdGltZXN0YW1wcyA9IHllcycsXG4gICAgICAgICAgICAgICAgJ3RydW5rID0geWVzJ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nX2hlYWRlcicpLFxuICAgICAgICAgICAgICAgIHRleHQ6IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nJylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgICdyZWdpc3RyYXRpb25fdHlwZSc6IHJlZ2lzdHJhdGlvblR5cGVEYXRhLFxuICAgICAgICAgICAgJ3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJzogcmVjZWl2ZUNhbGxzRGF0YSxcbiAgICAgICAgICAgICduZXR3b3JrX2ZpbHRlcic6IG5ldHdvcmtGaWx0ZXJEYXRhLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2hvc3QnOiBwcm92aWRlckhvc3REYXRhLFxuICAgICAgICAgICAgJ2lheF9wb3J0JzogcG9ydERhdGEsXG4gICAgICAgICAgICAnbWFudWFsX2F0dHJpYnV0ZXMnOiBtYW51YWxBdHRyaWJ1dGVzRGF0YVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyB1c2luZyBUb29sdGlwQnVpbGRlclxuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKHJlZ1R5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ291dGJvdW5kJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgICAgICBjYXNlICdpbmJvdW5kJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRJbmJvdW5kUnVsZXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE5vbmVSdWxlcygpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igb3V0Ym91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0T3V0Ym91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWNlaXZlV2l0aG91dEF1dGggPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcnVsZXMgPSB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2VjcmV0IGlzIG9wdGlvbmFsIGlmIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGlzIGNoZWNrZWRcbiAgICAgICAgaWYgKCFyZWNlaXZlV2l0aG91dEF1dGgpIHtcbiAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG5vbmUgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9uZVJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByZWdpc3RyYXRpb24gdHlwZSBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzKCkge1xuICAgICAgICAvLyBSZWdpc3RyYXRpb24gdHlwZSBoYW5kbGVyIGlzIG5vdyBpbiBiYXNlIGNsYXNzXG4gICAgICAgIC8vIFRoaXMgbWV0aG9kIGlzIGtlcHQgZm9yIGNvbXBhdGliaWxpdHlcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIElBWCBjYXRlZ29yeVxuICAgICAqL1xuICAgIGluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoJyNuZXR3b3JrZmlsdGVyaWQnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB0aGUgZHJvcGRvd24gZWxlbWVudFxuICAgICAgICBsZXQgJGRyb3Bkb3duID0gJGZpZWxkO1xuICAgICAgICBpZiAoJGZpZWxkLmlzKCdzZWxlY3QnKSkge1xuICAgICAgICAgICAgJGRyb3Bkb3duID0gJGZpZWxkLmhhc0NsYXNzKCd1aScpID8gJGZpZWxkIDogJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24gPSAkZmllbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IHRoaXMuZ2V0Q3VycmVudE5ldHdvcmtGaWx0ZXJWYWx1ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIE5ldHdvcmtGaWx0ZXJzQVBJIHRvIGluaXRpYWxpemUgdGhlIGRyb3Bkb3duIHdpdGggSUFYIGNhdGVnb3J5XG4gICAgICAgIE5ldHdvcmtGaWx0ZXJzQVBJLmluaXRpYWxpemVEcm9wZG93bigkZHJvcGRvd24sIHtcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZTogY3VycmVudFZhbHVlLFxuICAgICAgICAgICAgY2F0ZWdvcmllczogWydJQVgnXSwgLy8gVXNlIElBWCBjYXRlZ29yeSBpbnN0ZWFkIG9mIFNJUFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMub25OZXR3b3JrRmlsdGVyQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE92ZXJyaWRlIHBhcmVudCdzIGluaXRpYWxpemVGb3JtIHRvIGhhbmRsZSBkeW5hbWljIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGluaXRpYWwgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9uQ29uZmlnID0ge1xuICAgICAgICAgICAgb246ICdibHVyJyxcbiAgICAgICAgICAgIGlubGluZTogdHJ1ZSxcbiAgICAgICAgICAgIGtleWJvYXJkU2hvcnRjdXRzOiBmYWxzZSxcbiAgICAgICAgICAgIGZpZWxkczogdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCksXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgLy8gUHJldmVudCBhdXRvLXN1Ym1pdCwgb25seSBzdWJtaXQgdmlhIGJ1dHRvbiBjbGlja1xuICAgICAgICAgICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gd2l0aCB2YWxpZGF0aW9uXG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSh2YWxpZGF0aW9uQ29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5nc1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogUHJvdmlkZXJzQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgICAgIH07XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE92ZXJyaWRlIEZvcm0ncyBzdWJtaXQgYnV0dG9uIGhhbmRsZXIgdG8gdXNlIGR5bmFtaWMgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoRm9ybS4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBmb3JtIHN0YXRlXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UnVsZXMgPSBzZWxmLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IHVwIGZvcm0gdmFsaWRhdGlvbiB3aXRoIGN1cnJlbnQgcnVsZXMgYW5kIHN1Ym1pdFxuICAgICAgICAgICAgRm9ybS4kZm9ybU9ialxuICAgICAgICAgICAgICAgIC5mb3JtKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdibHVyJyxcbiAgICAgICAgICAgICAgICAgICAgZmllbGRzOiBjdXJyZW50UnVsZXMsXG4gICAgICAgICAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENhbGwgc3VibWl0Rm9ybSgpIG9uIHN1Y2Nlc3NmdWwgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5zdWJtaXRGb3JtKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkZCBlcnJvciBjbGFzcyB0byBmb3JtIG9uIHZhbGlkYXRpb24gZmFpbHVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5yZW1vdmVDbGFzcygnZXJyb3InKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBHZXQgZWxlbWVudCByZWZlcmVuY2VzXG4gICAgICAgIGNvbnN0IGVsSG9zdCA9ICQoJyNlbEhvc3QnKTtcbiAgICAgICAgY29uc3QgZWxVc2VybmFtZSA9ICQoJyNlbFVzZXJuYW1lJyk7XG4gICAgICAgIGNvbnN0IGVsU2VjcmV0ID0gJCgnI2VsU2VjcmV0Jyk7XG4gICAgICAgIGNvbnN0IGVsUG9ydCA9ICQoJyNlbFBvcnQnKTtcbiAgICAgICAgY29uc3QgZWxSZWNlaXZlQ2FsbHMgPSAkKCcjZWxSZWNlaXZlQ2FsbHMnKTtcbiAgICAgICAgY29uc3QgZWxOZXR3b3JrRmlsdGVyID0gJCgnI2VsTmV0d29ya0ZpbHRlcicpO1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IGVsVW5pcUlkID0gJCgnI3VuaXFpZCcpO1xuICAgICAgICBjb25zdCBnZW5QYXNzd29yZCA9ICQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKTtcblxuICAgICAgICBjb25zdCB2YWxVc2VyTmFtZSA9ICQoJyN1c2VybmFtZScpO1xuICAgICAgICBjb25zdCB2YWxTZWNyZXQgPSB0aGlzLiRzZWNyZXQ7XG4gICAgICAgIGNvbnN0IHZhbFBvcnQgPSAkKCcjcG9ydCcpO1xuICAgICAgICBjb25zdCB2YWxRdWFsaWZ5ID0gJCgnI3F1YWxpZnknKTtcbiAgICAgICAgY29uc3QgY29weUJ1dHRvbiA9ICQoJyNlbFNlY3JldCAuYnV0dG9uLmNsaXBib2FyZCcpO1xuICAgICAgICBjb25zdCBzaG93SGlkZUJ1dHRvbiA9ICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKTtcblxuICAgICAgICAvLyBHZXQgbGFiZWwgdGV4dCBlbGVtZW50c1xuICAgICAgICBjb25zdCBsYWJlbEhvc3RUZXh0ID0gJCgnI2hvc3RMYWJlbFRleHQnKTtcbiAgICAgICAgY29uc3QgbGFiZWxQb3J0VGV4dCA9ICQoJyNwb3J0TGFiZWxUZXh0Jyk7XG4gICAgICAgIGNvbnN0IGxhYmVsVXNlcm5hbWVUZXh0ID0gJCgnI3VzZXJuYW1lTGFiZWxUZXh0Jyk7XG4gICAgICAgIGNvbnN0IGxhYmVsU2VjcmV0VGV4dCA9ICQoJyNzZWNyZXRMYWJlbFRleHQnKTtcblxuICAgICAgICAvLyBBbHdheXMgZW5hYmxlIHF1YWxpZnkgZm9yIElBWCAoTkFUIGtlZXBhbGl2ZSlcbiAgICAgICAgaWYgKHZhbFF1YWxpZnkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFsUXVhbGlmeS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICB2YWxRdWFsaWZ5LnZhbCgnMScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFsVXNlck5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcblxuICAgICAgICAvLyBIaWRlIHBhc3N3b3JkIHRvb2x0aXAgYnkgZGVmYXVsdFxuICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcblxuICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICAvLyBPVVRCT1VORDogV2UgcmVnaXN0ZXIgdG8gcHJvdmlkZXJcbiAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICBlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFJlY2VpdmVDYWxscy5oaWRlKCk7XG4gICAgICAgICAgICBlbE5ldHdvcmtGaWx0ZXIuaGlkZSgpOyAvLyBOZXR3b3JrIGZpbHRlciBub3QgcmVsZXZhbnQgZm9yIG91dGJvdW5kXG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgICAgIGVsSG9zdC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsUG9ydC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFNlY3JldC5hZGRDbGFzcygncmVxdWlyZWQnKTtcblxuICAgICAgICAgICAgLy8gSGlkZSBnZW5lcmF0ZSBhbmQgY29weSBidXR0b25zIGZvciBvdXRib3VuZFxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICBzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0L0lQJyk7XG4gICAgICAgICAgICBsYWJlbFBvcnRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUG9ydCB8fCAnUHJvdmlkZXIgUG9ydCcpO1xuICAgICAgICAgICAgbGFiZWxVc2VybmFtZVRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJMb2dpbiB8fCAnTG9naW4nKTtcbiAgICAgICAgICAgIGxhYmVsU2VjcmV0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBhc3N3b3JkIHx8ICdQYXNzd29yZCcpO1xuXG4gICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsUG9ydC52YWwoKSA9PT0gJycgfHwgdmFsUG9ydC52YWwoKSA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgdmFsUG9ydC52YWwoJzQ1NjknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgIC8vIElOQk9VTkQ6IFByb3ZpZGVyIGNvbm5lY3RzIHRvIHVzXG4gICAgICAgICAgICB2YWxVc2VyTmFtZS52YWwoZWxVbmlxSWQudmFsKCkpO1xuICAgICAgICAgICAgdmFsVXNlck5hbWUuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uIGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsU2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5oaWRlKCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUmVjZWl2ZUNhbGxzLnNob3coKTtcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5zaG93KCk7IC8vIE5ldHdvcmsgZmlsdGVyIGF2YWlsYWJsZSBmb3Igc2VjdXJpdHlcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHZhbGlkYXRpb24gcHJvbXB0IGZvciBoaWRkZW4gcG9ydCBmaWVsZFxuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3BvcnQnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgICAgICAgICAgZWxIb3N0LnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxQb3J0LnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgaG9zdCB2YWxpZGF0aW9uIGVycm9yIHNpbmNlIGl0J3Mgb3B0aW9uYWwgZm9yIGluYm91bmRcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdob3N0Jyk7XG4gICAgICAgICAgICAkKCcjaG9zdCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXG4gICAgICAgICAgICAvLyBTaG93IGFsbCBidXR0b25zIGZvciBpbmJvdW5kXG4gICAgICAgICAgICBnZW5QYXNzd29yZC5zaG93KCk7XG4gICAgICAgICAgICBjb3B5QnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgIHNob3dIaWRlQnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgIGNvcHlCdXR0b24uYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIHZhbFNlY3JldC52YWwoKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgbmV0d29yayBmaWx0ZXIgc3RhdGUgaWYgbmVlZGVkXG4gICAgICAgICAgICB0aGlzLnJlc3RvcmVOZXR3b3JrRmlsdGVyU3RhdGUoKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVscyBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgbGFiZWxIb3N0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MgfHwgJ1JlbW90ZSBIb3N0L0lQJyk7XG4gICAgICAgICAgICBsYWJlbFVzZXJuYW1lVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblVzZXJuYW1lIHx8ICdBdXRoZW50aWNhdGlvbiBVc2VybmFtZScpO1xuICAgICAgICAgICAgbGFiZWxTZWNyZXRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQgfHwgJ0F1dGhlbnRpY2F0aW9uIFBhc3N3b3JkJyk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAvLyBOT05FOiBTdGF0aWMgcGVlci10by1wZWVyIGNvbm5lY3Rpb25cbiAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7IFxuICAgICAgICAgICAgZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxSZWNlaXZlQ2FsbHMuc2hvdygpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLnNob3coKTsgLy8gTmV0d29yayBmaWx0ZXIgYXZhaWxhYmxlIGZvciBzZWN1cml0eVxuXG4gICAgICAgICAgICAvLyBTaG93IHRvb2x0aXAgaWNvbiBmb3IgcGFzc3dvcmQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuc2hvd1Bhc3N3b3JkVG9vbHRpcCgpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgICAgICAgICBlbEhvc3QuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFBvcnQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxTZWNyZXQucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7IC8vIFBhc3N3b3JkIGlzIG9wdGlvbmFsIGluIG5vbmUgbW9kZVxuXG4gICAgICAgICAgICAvLyBIaWRlIGdlbmVyYXRlIGFuZCBjb3B5IGJ1dHRvbnNcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgIGNvcHlCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXN0b3JlIG5ldHdvcmsgZmlsdGVyIHN0YXRlIGlmIG5lZWRlZFxuICAgICAgICAgICAgdGhpcy5yZXN0b3JlTmV0d29ya0ZpbHRlclN0YXRlKCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIG5vbmUgKHBlZXItdG8tcGVlcilcbiAgICAgICAgICAgIGxhYmVsSG9zdFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlckhvc3RPcklQQWRkcmVzcyB8fCAnUGVlciBIb3N0L0lQJyk7XG4gICAgICAgICAgICBsYWJlbFBvcnRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQb3J0IHx8ICdQZWVyIFBvcnQnKTtcbiAgICAgICAgICAgIGxhYmVsVXNlcm5hbWVUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJVc2VybmFtZSB8fCAnUGVlciBVc2VybmFtZScpO1xuICAgICAgICAgICAgbGFiZWxTZWNyZXRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQYXNzd29yZCB8fCAnUGVlciBQYXNzd29yZCcpO1xuXG4gICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsUG9ydC52YWwoKSA9PT0gJycgfHwgdmFsUG9ydC52YWwoKSA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgdmFsUG9ydC52YWwoJzQ1NjknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0iXX0=