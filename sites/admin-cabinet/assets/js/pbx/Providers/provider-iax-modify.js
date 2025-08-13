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
      this.initializeRegistrationTypeHandlers(); // Initialize tabs

      this.initializeTabs(); // Re-validate form when receive_calls_without_auth changes

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
     * Initialize tab functionality
     */

  }, {
    key: "initializeTabs",
    value: function initializeTabs() {
      $('#provider-tabs-menu .item').tab({
        onVisible: function onVisible(tabPath) {
          if (tabPath === 'diagnostics' && typeof providerModifyStatusWorker !== 'undefined') {
            // Initialize diagnostics tab when it becomes visible
            providerModifyStatusWorker.initializeDiagnosticsTab();
          }
        }
      });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzIiwiaW5pdGlhbGl6ZVRhYnMiLCJzZWxmIiwiJCIsImNoZWNrYm94IiwicmVnVHlwZSIsInZhbCIsIiRmb3JtT2JqIiwiZm9ybSIsIiRzZWNyZXQiLCJjbG9zZXN0IiwicmVtb3ZlQ2xhc3MiLCJpc0NoZWNrZWQiLCJzZXRUaW1lb3V0IiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMiLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJ2YWxpZGF0aW9uQ29uZmlnIiwib24iLCJpbmxpbmUiLCJrZXlib2FyZFNob3J0Y3V0cyIsImZpZWxkcyIsImdldFZhbGlkYXRlUnVsZXMiLCJvblN1Y2Nlc3MiLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiUHJvdmlkZXJzQVBJIiwic2F2ZU1ldGhvZCIsInZhbGlkYXRlUnVsZXMiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImluaXRpYWxpemUiLCIkc3VibWl0QnV0dG9uIiwib2ZmIiwiZSIsImhhc0NsYXNzIiwiY3VycmVudFJ1bGVzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsImFkZENsYXNzIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwidHlwZSIsInByb3ZpZGVyVHlwZSIsImJvb2xlYW5GaWVsZHMiLCJmb3JFYWNoIiwiZmllbGQiLCJoYXNPd25Qcm9wZXJ0eSIsInJlc3BvbnNlIiwidW5pcWlkIiwiJHdhcm5pbmdNZXNzYWdlIiwibmV4dCIsIiRjaGVja2JveElucHV0IiwidXBkYXRlV2FybmluZ1N0YXRlIiwicHJvcCIsIm9uQ2hlY2tlZCIsInRyYW5zaXRpb24iLCJvblVuY2hlY2tlZCIsImxlbmd0aCIsIlBhc3N3b3JkU2NvcmUiLCIkcGFzc3dvcmRQcm9ncmVzcyIsIiRzZWNyZXRGaWVsZCIsImFwcGVuZCIsImNoZWNrUGFzc1N0cmVuZ3RoIiwicGFzcyIsImJhciIsInNlY3Rpb24iLCIkcG9ydEZpZWxkIiwiZmluZCIsIiRsYWJlbCIsInNob3ciLCJoaWRlIiwiZmllbGROYW1lIiwiYXR0ciIsInJlZ2lzdHJhdGlvblR5cGVEYXRhIiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2hlYWRlciIsImxpc3QiLCJ0ZXJtIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kIiwiZGVmaW5pdGlvbiIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmQiLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmUiLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZV9kZXNjIiwicmVjZWl2ZUNhbGxzRGF0YSIsImlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2Rlc2MiLCJ3YXJuaW5nIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInRleHQiLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmciLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2FwcGxpY2F0aW9uIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbl9kZXNjIiwibmV0d29ya0ZpbHRlckRhdGEiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaGVhZGVyIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2Rlc2MiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZCIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kX2Rlc2MiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmQiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmVfZGVzYyIsInByb3ZpZGVySG9zdERhdGEiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2lwIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2RvbWFpbiIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kX3VzZSIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfdXNlIiwibm90ZSIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vdGUiLCJwb3J0RGF0YSIsImlheF9Qb3J0VG9vbHRpcF9oZWFkZXIiLCJpYXhfUG9ydFRvb2x0aXBfZGVzYyIsImlheF9Qb3J0VG9vbHRpcF9kZWZhdWx0IiwiaWF4X1BvcnRUb29sdGlwX2luZm8iLCJpYXhfUG9ydFRvb2x0aXBfbm90ZSIsIm1hbnVhbEF0dHJpYnV0ZXNEYXRhIiwiaTE4biIsImV4YW1wbGVzSGVhZGVyIiwiZXhhbXBsZXMiLCJ0b29sdGlwQ29uZmlncyIsIlRvb2x0aXBCdWlsZGVyIiwiZ2V0T3V0Ym91bmRSdWxlcyIsImdldEluYm91bmRSdWxlcyIsImdldE5vbmVSdWxlcyIsImlkZW50aWZpZXIiLCJydWxlcyIsInByb21wdCIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwiaG9zdCIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5IiwidXNlcm5hbWUiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHkiLCJzZWNyZXQiLCJvcHRpb25hbCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwicmVjZWl2ZVdpdGhvdXRBdXRoIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCIkZmllbGQiLCIkZHJvcGRvd24iLCJpcyIsImN1cnJlbnRWYWx1ZSIsImdldEN1cnJlbnROZXR3b3JrRmlsdGVyVmFsdWUiLCJOZXR3b3JrRmlsdGVyc0FQSSIsImluaXRpYWxpemVEcm9wZG93biIsImNhdGVnb3JpZXMiLCJvbkNoYW5nZSIsInZhbHVlIiwib25OZXR3b3JrRmlsdGVyQ2hhbmdlIiwiZWxIb3N0IiwiZWxVc2VybmFtZSIsImVsU2VjcmV0IiwiZWxQb3J0IiwiZWxSZWNlaXZlQ2FsbHMiLCJlbE5ldHdvcmtGaWx0ZXIiLCJlbFVuaXFJZCIsImdlblBhc3N3b3JkIiwidmFsVXNlck5hbWUiLCJ2YWxTZWNyZXQiLCJ2YWxQb3J0IiwidmFsUXVhbGlmeSIsImNvcHlCdXR0b24iLCJzaG93SGlkZUJ1dHRvbiIsImxhYmVsSG9zdFRleHQiLCJsYWJlbFBvcnRUZXh0IiwibGFiZWxVc2VybmFtZVRleHQiLCJsYWJlbFNlY3JldFRleHQiLCJyZW1vdmVBdHRyIiwiaGlkZVBhc3N3b3JkVG9vbHRpcCIsInByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIiwicHJfUHJvdmlkZXJQb3J0IiwicHJfUHJvdmlkZXJMb2dpbiIsInByX1Byb3ZpZGVyUGFzc3dvcmQiLCJ0cmltIiwiZ2VuZXJhdGVQYXNzd29yZCIsInJlc3RvcmVOZXR3b3JrRmlsdGVyU3RhdGUiLCJwcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MiLCJwcl9BdXRoZW50aWNhdGlvblVzZXJuYW1lIiwicHJfQXV0aGVudGljYXRpb25QYXNzd29yZCIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJwcl9QZWVySG9zdE9ySVBBZGRyZXNzIiwicHJfUGVlclBvcnQiLCJwcl9QZWVyVXNlcm5hbWUiLCJwcl9QZWVyUGFzc3dvcmQiLCJQcm92aWRlckJhc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFc7Ozs7O0FBQ0YseUJBQWM7QUFBQTs7QUFBQSw2QkFDSixLQURJO0FBRWI7QUFFRDtBQUNKO0FBQ0E7Ozs7O1dBQ0ksc0JBQWE7QUFDVCxrRkFEUyxDQUdUOzs7QUFDQSxXQUFLQywyQkFBTDtBQUNBLFdBQUtDLDRCQUFMO0FBQ0EsV0FBS0Msa0NBQUwsR0FOUyxDQVFUOztBQUNBLFdBQUtDLGNBQUwsR0FUUyxDQVdUOztBQUNBLFVBQU1DLElBQUksR0FBRyxJQUFiO0FBQ0FDLE1BQUFBLENBQUMsQ0FBQyxzQ0FBRCxDQUFELENBQTBDQyxRQUExQyxDQUFtRCxTQUFuRCxFQUE4RCxVQUE5RCxFQUEwRSxZQUFNO0FBQzVFO0FBQ0EsWUFBTUMsT0FBTyxHQUFHRixDQUFDLENBQUMsb0JBQUQsQ0FBRCxDQUF3QkcsR0FBeEIsRUFBaEIsQ0FGNEUsQ0FJNUU7O0FBQ0FKLFFBQUFBLElBQUksQ0FBQ0ssUUFBTCxDQUFjQyxJQUFkLENBQW1CLGVBQW5CLEVBQW9DLFFBQXBDO0FBQ0FOLFFBQUFBLElBQUksQ0FBQ08sT0FB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QUNBaEIsUUFBQUEsZUFBZSxDQUFDakYsSUFBaEIsQ0FBcUJqQixlQUFlLENBQUNtSCxlQUFoQixJQUFtQyxlQUF4RCxFQTlCMkIsQ0FnQzNCOztBQUNBLFlBQUl4QixPQUFPLENBQUMzSyxHQUFSLE9BQWtCLEVBQWxCLElBQXdCMkssT0FBTyxDQUFDM0ssR0FBUixPQUFrQixHQUE5QyxFQUFtRDtBQUMvQzJLLFVBQUFBLE9BQU8sQ0FBQzNLLEdBQVIsQ0FBWSxNQUFaO0FBQ0g7QUFDSjtBQUNKOzs7O0VBenZCcUJvTSxZIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQYXNzd29yZFNjb3JlLCBUb29sdGlwQnVpbGRlciwgaTE4biwgUHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogSUFYIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVySUFYXG4gKi9cbmNsYXNzIFByb3ZpZGVySUFYIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHsgXG4gICAgICAgIHN1cGVyKCdJQVgnKTsgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLmluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGFicygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtdmFsaWRhdGUgZm9ybSB3aGVuIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGNoYW5nZXNcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aC5jaGVja2JveCcpLmNoZWNrYm94KCdzZXR0aW5nJywgJ29uQ2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gR2V0IHJlZ2lzdHJhdGlvbiB0eXBlIHRvIGRldGVybWluZSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBlcnJvciBvbiBzZWNyZXQgZmllbGRcbiAgICAgICAgICAgIHNlbGYuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgIHNlbGYuJHNlY3JldC5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIGluYm91bmQgcmVnaXN0cmF0aW9uLCB2YWxpZGF0ZSBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc0NoZWNrZWQgJiYgc2VsZi4kc2VjcmV0LnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB1bmNoZWNrZWQgYW5kIHBhc3N3b3JkIGlzIGVtcHR5LCBzaG93IGVycm9yXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmaWVsZCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJzKCkge1xuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogKHRhYlBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiB0eXBlb2YgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIHdoZW4gaXQgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmluaXRpYWxpemVEaWFnbm9zdGljc1RhYigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBQcm92aWRlcnNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCdcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBnbG9iYWxSb290VXJsICsgJ3Byb3ZpZGVycy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdwcm92aWRlcnMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIuY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcHJvdmlkZXIgdHlwZVxuICAgICAgICByZXN1bHQuZGF0YS50eXBlID0gdGhpcy5wcm92aWRlclR5cGU7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBwcm9wZXIgYm9vbGVhbnNcbiAgICAgICAgY29uc3QgYm9vbGVhbkZpZWxkcyA9IFsnZGlzYWJsZWQnLCAncXVhbGlmeScsICdkaXNhYmxlZnJvbXVzZXInLCAnbm9yZWdpc3RlcicsICdyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCddO1xuICAgICAgICBib29sZWFuRmllbGRzLmZvckVhY2goKGZpZWxkKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0LmRhdGEuaGFzT3duUHJvcGVydHkoZmllbGQpKSB7XG4gICAgICAgICAgICAgICAgLy8gQ29udmVydCB2YXJpb3VzIGNoZWNrYm94IHJlcHJlc2VudGF0aW9ucyB0byBib29sZWFuXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbZmllbGRdID0gcmVzdWx0LmRhdGFbZmllbGRdID09PSB0cnVlIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkXSA9PT0gJ3RydWUnIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkXSA9PT0gJzEnIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkXSA9PT0gJ29uJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgc3VwZXIuY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEudW5pcWlkICYmICEkKCcjdW5pcWlkJykudmFsKCkpIHtcbiAgICAgICAgICAgICAgICAkKCcjdW5pcWlkJykudmFsKHJlc3BvbnNlLmRhdGEudW5pcWlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhlIEZvcm0uanMgd2lsbCBoYW5kbGUgdGhlIHJlbG9hZCBhdXRvbWF0aWNhbGx5IGlmIHJlc3BvbnNlLnJlbG9hZCBpcyBwcmVzZW50XG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIFJFU1QgQVBJIHJldHVybnMgcmVsb2FkIHBhdGggbGlrZSBcInByb3ZpZGVycy9tb2RpZnlpYXgvSUFYLVRSVU5LLXh4eFwiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIElBWCB3YXJuaW5nIG1lc3NhZ2UgaGFuZGxpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UoKSB7XG4gICAgICAgIGNvbnN0ICR3YXJuaW5nTWVzc2FnZSA9ICQoJyNlbFJlY2VpdmVDYWxscycpLm5leHQoJy53YXJuaW5nLm1lc3NhZ2UnKTtcbiAgICAgICAgY29uc3QgJGNoZWNrYm94SW5wdXQgPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZ1bmN0aW9uIHRvIHVwZGF0ZSB3YXJuaW5nIG1lc3NhZ2Ugc3RhdGVcbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlV2FybmluZ1N0YXRlKCkge1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveElucHV0LnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2FybmluZyBzdGF0ZVxuICAgICAgICB1cGRhdGVXYXJuaW5nU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjaGVja2JveCBjaGFuZ2VzXG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5yZW1vdmVDbGFzcygnaGlkZGVuJykudHJhbnNpdGlvbignZmFkZSBpbicpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UudHJhbnNpdGlvbignZmFkZSBvdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByZWFsLXRpbWUgdmFsaWRhdGlvbiBmZWVkYmFja1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKSB7XG4gICAgICAgIC8vIEVuYWJsZSBpbmxpbmUgdmFsaWRhdGlvbiBmb3IgYmV0dGVyIFVYXG4gICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgnc2V0dGluZycsICdpbmxpbmUnLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvclxuICAgICAgICBpZiAodGhpcy4kc2VjcmV0Lmxlbmd0aCA+IDAgJiYgdHlwZW9mIFBhc3N3b3JkU2NvcmUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgcHJvZ3Jlc3MgYmFyIGZvciBwYXNzd29yZCBzdHJlbmd0aCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICBsZXQgJHBhc3N3b3JkUHJvZ3Jlc3MgPSAkKCcjcGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgICAgIGlmICgkcGFzc3dvcmRQcm9ncmVzcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkc2VjcmV0RmllbGQgPSB0aGlzLiRzZWNyZXQuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgICAgICAgICAgJHBhc3N3b3JkUHJvZ3Jlc3MgPSAkKCc8ZGl2IGNsYXNzPVwidWkgdGlueSBwcm9ncmVzc1wiIGlkPVwicGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3NcIj48ZGl2IGNsYXNzPVwiYmFyXCI+PC9kaXY+PC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgJHNlY3JldEZpZWxkLmFwcGVuZCgkcGFzc3dvcmRQcm9ncmVzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYXNzd29yZCBzdHJlbmd0aCBvbiBpbnB1dFxuICAgICAgICAgICAgdGhpcy4kc2VjcmV0Lm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogdGhpcy4kc2VjcmV0LnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICBiYXI6ICRwYXNzd29yZFByb2dyZXNzLFxuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiAkcGFzc3dvcmRQcm9ncmVzc1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWxwZXIgdGV4dCBmb3IgSUFYLXNwZWNpZmljIGZpZWxkc1xuICAgICAgICBjb25zdCAkcG9ydEZpZWxkID0gJCgnI3BvcnQnKS5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgaWYgKCRwb3J0RmllbGQuZmluZCgnLnVpLnBvaW50aW5nLmxhYmVsJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkcG9ydEZpZWxkLmFwcGVuZCgnPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nIGxhYmVsXCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPkRlZmF1bHQgSUFYIHBvcnQgaXMgNDU2OTwvZGl2PicpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHBvcnQgaGVscGVyIG9uIGZvY3VzXG4gICAgICAgICQoJyNwb3J0Jykub24oJ2ZvY3VzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKHRoaXMpLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoJy51aS5wb2ludGluZy5sYWJlbCcpO1xuICAgICAgICAgICAgaWYgKCQodGhpcykudmFsKCkgPT09ICcnIHx8ICQodGhpcykudmFsKCkgPT09ICc0NTY5Jykge1xuICAgICAgICAgICAgICAgICRsYWJlbC5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLm9uKCdibHVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoJy51aS5wb2ludGluZy5sYWJlbCcpLmhpZGUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGF0ZSBvbiBibHVyIGZvciBpbW1lZGlhdGUgZmVlZGJhY2tcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnaW5wdXRbdHlwZT1cInRleHRcIl0sIGlucHV0W3R5cGU9XCJwYXNzd29yZFwiXScpLm9uKCdibHVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkKHRoaXMpLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRlUnVsZXMgPSBzZWxmLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgJiYgdmFsaWRhdGVSdWxlc1tmaWVsZE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgc2VsZi4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmaWVsZCcsIGZpZWxkTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCkgeyBcbiAgICAgICAgLy8gQnVpbGQgdG9vbHRpcCBkYXRhIHN0cnVjdHVyZXNcbiAgICAgICAgY29uc3QgcmVnaXN0cmF0aW9uVHlwZURhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCByZWNlaXZlQ2FsbHNEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb25fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBuZXR3b3JrRmlsdGVyRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwcm92aWRlckhvc3REYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfaXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW4sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kX3VzZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZV91c2VcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHBvcnREYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qb3J0VG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUG9ydFRvb2x0aXBfaW5mb1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUG9ydFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG1hbnVhbEF0dHJpYnV0ZXNEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBpMThuKCdpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyJyksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MnKSxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQnKSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlcicpLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnbGFuZ3VhZ2UgPSBydScsXG4gICAgICAgICAgICAgICAgJ2NvZGVjcHJpb3JpdHkgPSBob3N0JyxcbiAgICAgICAgICAgICAgICAndHJ1bmt0aW1lc3RhbXBzID0geWVzJyxcbiAgICAgICAgICAgICAgICAndHJ1bmsgPSB5ZXMnXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyJyksXG4gICAgICAgICAgICAgICAgdGV4dDogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmcnKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgJ3JlZ2lzdHJhdGlvbl90eXBlJzogcmVnaXN0cmF0aW9uVHlwZURhdGEsXG4gICAgICAgICAgICAncmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnOiByZWNlaXZlQ2FsbHNEYXRhLFxuICAgICAgICAgICAgJ25ldHdvcmtfZmlsdGVyJzogbmV0d29ya0ZpbHRlckRhdGEsXG4gICAgICAgICAgICAncHJvdmlkZXJfaG9zdCc6IHByb3ZpZGVySG9zdERhdGEsXG4gICAgICAgICAgICAnaWF4X3BvcnQnOiBwb3J0RGF0YSxcbiAgICAgICAgICAgICdtYW51YWxfYXR0cmlidXRlcyc6IG1hbnVhbEF0dHJpYnV0ZXNEYXRhXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIHVzaW5nIFRvb2x0aXBCdWlsZGVyXG4gICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAocmVnVHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnb3V0Ym91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ2luYm91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEluYm91bmRSdWxlcygpO1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Tm9uZVJ1bGVzKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRPdXRib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRJbmJvdW5kUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlY2VpdmVXaXRob3V0QXV0aCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBydWxlcyA9IHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTZWNyZXQgaXMgb3B0aW9uYWwgaWYgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggaXMgY2hlY2tlZFxuICAgICAgICBpZiAoIXJlY2VpdmVXaXRob3V0QXV0aCkge1xuICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzhdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igbm9uZSByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXROb25lUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGNoYW5nZSBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIFJlZ2lzdHJhdGlvbiB0eXBlIGhhbmRsZXIgaXMgbm93IGluIGJhc2UgY2xhc3NcbiAgICAgICAgLy8gVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgY29tcGF0aWJpbGl0eVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHdpdGggSUFYIGNhdGVnb3J5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI25ldHdvcmtmaWx0ZXJpZCcpO1xuICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHRoZSBkcm9wZG93biBlbGVtZW50XG4gICAgICAgIGxldCAkZHJvcGRvd24gPSAkZmllbGQ7XG4gICAgICAgIGlmICgkZmllbGQuaXMoJ3NlbGVjdCcpKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24gPSAkZmllbGQuaGFzQ2xhc3MoJ3VpJykgPyAkZmllbGQgOiAkZmllbGQuY2xvc2VzdCgnLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICRkcm9wZG93biA9ICRmaWVsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWVcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gdGhpcy5nZXRDdXJyZW50TmV0d29ya0ZpbHRlclZhbHVlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgTmV0d29ya0ZpbHRlcnNBUEkgdG8gaW5pdGlhbGl6ZSB0aGUgZHJvcGRvd24gd2l0aCBJQVggY2F0ZWdvcnlcbiAgICAgICAgTmV0d29ya0ZpbHRlcnNBUEkuaW5pdGlhbGl6ZURyb3Bkb3duKCRkcm9wZG93biwge1xuICAgICAgICAgICAgY3VycmVudFZhbHVlOiBjdXJyZW50VmFsdWUsXG4gICAgICAgICAgICBjYXRlZ29yaWVzOiBbJ0lBWCddLCAvLyBVc2UgSUFYIGNhdGVnb3J5IGluc3RlYWQgb2YgU0lQXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbk5ldHdvcmtGaWx0ZXJDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgcGFyZW50J3MgaW5pdGlhbGl6ZUZvcm0gdG8gaGFuZGxlIGR5bmFtaWMgdmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgaW5pdGlhbCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb25Db25maWcgPSB7XG4gICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgaW5saW5lOiB0cnVlLFxuICAgICAgICAgICAga2V5Ym9hcmRTaG9ydGN1dHM6IGZhbHNlLFxuICAgICAgICAgICAgZmllbGRzOiB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKSxcbiAgICAgICAgICAgIG9uU3VjY2VzczogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBQcmV2ZW50IGF1dG8tc3VibWl0LCBvbmx5IHN1Ym1pdCB2aWEgYnV0dG9uIGNsaWNrXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB3aXRoIHZhbGlkYXRpb25cbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKHZhbGlkYXRpb25Db25maWcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBQcm92aWRlcnNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCdcbiAgICAgICAgfTtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gT3ZlcnJpZGUgRm9ybSdzIHN1Ym1pdCBidXR0b24gaGFuZGxlciB0byB1c2UgZHluYW1pYyB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnZGlzYWJsZWQnKSkgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBHZXQgY3VycmVudCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIGZvcm0gc3RhdGVcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRSdWxlcyA9IHNlbGYuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgdXAgZm9ybSB2YWxpZGF0aW9uIHdpdGggY3VycmVudCBydWxlcyBhbmQgc3VibWl0XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IGN1cnJlbnRSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBzdWJtaXRGb3JtKCkgb24gc3VjY2Vzc2Z1bCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGVycm9yIGNsYXNzIHRvIGZvcm0gb24gdmFsaWRhdGlvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiB0aGUgcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIC8vIEdldCBlbGVtZW50IHJlZmVyZW5jZXNcbiAgICAgICAgY29uc3QgZWxIb3N0ID0gJCgnI2VsSG9zdCcpO1xuICAgICAgICBjb25zdCBlbFVzZXJuYW1lID0gJCgnI2VsVXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgZWxTZWNyZXQgPSAkKCcjZWxTZWNyZXQnKTtcbiAgICAgICAgY29uc3QgZWxQb3J0ID0gJCgnI2VsUG9ydCcpO1xuICAgICAgICBjb25zdCBlbFJlY2VpdmVDYWxscyA9ICQoJyNlbFJlY2VpdmVDYWxscycpO1xuICAgICAgICBjb25zdCBlbE5ldHdvcmtGaWx0ZXIgPSAkKCcjZWxOZXR3b3JrRmlsdGVyJyk7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgZWxVbmlxSWQgPSAkKCcjdW5pcWlkJyk7XG4gICAgICAgIGNvbnN0IGdlblBhc3N3b3JkID0gJCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpO1xuXG4gICAgICAgIGNvbnN0IHZhbFVzZXJOYW1lID0gJCgnI3VzZXJuYW1lJyk7XG4gICAgICAgIGNvbnN0IHZhbFNlY3JldCA9IHRoaXMuJHNlY3JldDtcbiAgICAgICAgY29uc3QgdmFsUG9ydCA9ICQoJyNwb3J0Jyk7XG4gICAgICAgIGNvbnN0IHZhbFF1YWxpZnkgPSAkKCcjcXVhbGlmeScpO1xuICAgICAgICBjb25zdCBjb3B5QnV0dG9uID0gJCgnI2VsU2VjcmV0IC5idXR0b24uY2xpcGJvYXJkJyk7XG4gICAgICAgIGNvbnN0IHNob3dIaWRlQnV0dG9uID0gJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpO1xuXG4gICAgICAgIC8vIEdldCBsYWJlbCB0ZXh0IGVsZW1lbnRzXG4gICAgICAgIGNvbnN0IGxhYmVsSG9zdFRleHQgPSAkKCcjaG9zdExhYmVsVGV4dCcpO1xuICAgICAgICBjb25zdCBsYWJlbFBvcnRUZXh0ID0gJCgnI3BvcnRMYWJlbFRleHQnKTtcbiAgICAgICAgY29uc3QgbGFiZWxVc2VybmFtZVRleHQgPSAkKCcjdXNlcm5hbWVMYWJlbFRleHQnKTtcbiAgICAgICAgY29uc3QgbGFiZWxTZWNyZXRUZXh0ID0gJCgnI3NlY3JldExhYmVsVGV4dCcpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBlbmFibGUgcXVhbGlmeSBmb3IgSUFYIChOQVQga2VlcGFsaXZlKVxuICAgICAgICBpZiAodmFsUXVhbGlmeS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YWxRdWFsaWZ5LnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIHZhbFF1YWxpZnkudmFsKCcxJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YWxVc2VyTmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuXG4gICAgICAgIC8vIEhpZGUgcGFzc3dvcmQgdG9vbHRpcCBieSBkZWZhdWx0XG4gICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkVG9vbHRpcCgpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBlbGVtZW50IHZpc2liaWxpdHkgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgIC8vIE9VVEJPVU5EOiBXZSByZWdpc3RlciB0byBwcm92aWRlclxuICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUmVjZWl2ZUNhbGxzLmhpZGUoKTtcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5oaWRlKCk7IC8vIE5ldHdvcmsgZmlsdGVyIG5vdCByZWxldmFudCBmb3Igb3V0Ym91bmRcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgICAgICAgICAgZWxIb3N0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxQb3J0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIGdlbmVyYXRlIGFuZCBjb3B5IGJ1dHRvbnMgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICBjb3B5QnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIHNob3dIaWRlQnV0dG9uLnNob3coKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVscyBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgIGxhYmVsSG9zdFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3QvSVAnKTtcbiAgICAgICAgICAgIGxhYmVsUG9ydFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQb3J0IHx8ICdQcm92aWRlciBQb3J0Jyk7XG4gICAgICAgICAgICBsYWJlbFVzZXJuYW1lVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckxvZ2luIHx8ICdMb2dpbicpO1xuICAgICAgICAgICAgbGFiZWxTZWNyZXRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUGFzc3dvcmQgfHwgJ1Bhc3N3b3JkJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IHBvcnQgaWYgZW1wdHlcbiAgICAgICAgICAgIGlmICh2YWxQb3J0LnZhbCgpID09PSAnJyB8fCB2YWxQb3J0LnZhbCgpID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgICB2YWxQb3J0LnZhbCgnNDU2OScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgLy8gSU5CT1VORDogUHJvdmlkZXIgY29ubmVjdHMgdG8gdXNcbiAgICAgICAgICAgIHZhbFVzZXJOYW1lLnZhbChlbFVuaXFJZC52YWwoKSk7XG4gICAgICAgICAgICB2YWxVc2VyTmFtZS5hdHRyKCdyZWFkb25seScsICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb24gaWYgZW1wdHlcbiAgICAgICAgICAgIGlmICh2YWxTZWNyZXQudmFsKCkudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LmhpZGUoKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxSZWNlaXZlQ2FsbHMuc2hvdygpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLnNob3coKTsgLy8gTmV0d29yayBmaWx0ZXIgYXZhaWxhYmxlIGZvciBzZWN1cml0eVxuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBwcm9tcHQgZm9yIGhpZGRlbiBwb3J0IGZpZWxkXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAncG9ydCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgICAgICAgICBlbEhvc3QucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFBvcnQucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxTZWNyZXQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBob3N0IHZhbGlkYXRpb24gZXJyb3Igc2luY2UgaXQncyBvcHRpb25hbCBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ2hvc3QnKTtcbiAgICAgICAgICAgICQoJyNob3N0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgYWxsIGJ1dHRvbnMgZm9yIGluYm91bmRcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLnNob3coKTtcbiAgICAgICAgICAgIGNvcHlCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgdmFsU2VjcmV0LnZhbCgpKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzdG9yZSBuZXR3b3JrIGZpbHRlciBzdGF0ZSBpZiBuZWVkZWRcbiAgICAgICAgICAgIHRoaXMucmVzdG9yZU5ldHdvcmtGaWx0ZXJTdGF0ZSgpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBpbmJvdW5kXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyB8fCAnUmVtb3RlIEhvc3QvSVAnKTtcbiAgICAgICAgICAgIGxhYmVsVXNlcm5hbWVUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uVXNlcm5hbWUgfHwgJ0F1dGhlbnRpY2F0aW9uIFVzZXJuYW1lJyk7XG4gICAgICAgICAgICBsYWJlbFNlY3JldFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25QYXNzd29yZCB8fCAnQXV0aGVudGljYXRpb24gUGFzc3dvcmQnKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIC8vIE5PTkU6IFN0YXRpYyBwZWVyLXRvLXBlZXIgY29ubmVjdGlvblxuICAgICAgICAgICAgZWxIb3N0LnNob3coKTsgXG4gICAgICAgICAgICBlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFJlY2VpdmVDYWxscy5zaG93KCk7XG4gICAgICAgICAgICBlbE5ldHdvcmtGaWx0ZXIuc2hvdygpOyAvLyBOZXR3b3JrIGZpbHRlciBhdmFpbGFibGUgZm9yIHNlY3VyaXR5XG5cbiAgICAgICAgICAgIC8vIFNob3cgdG9vbHRpcCBpY29uIGZvciBwYXNzd29yZCBmaWVsZFxuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgICAgIGVsSG9zdC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsUG9ydC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFNlY3JldC5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTsgLy8gUGFzc3dvcmQgaXMgb3B0aW9uYWwgaW4gbm9uZSBtb2RlXG5cbiAgICAgICAgICAgIC8vIEhpZGUgZ2VuZXJhdGUgYW5kIGNvcHkgYnV0dG9uc1xuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICBzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgbmV0d29yayBmaWx0ZXIgc3RhdGUgaWYgbmVlZGVkXG4gICAgICAgICAgICB0aGlzLnJlc3RvcmVOZXR3b3JrRmlsdGVyU3RhdGUoKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVscyBmb3Igbm9uZSAocGVlci10by1wZWVyKVxuICAgICAgICAgICAgbGFiZWxIb3N0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVySG9zdE9ySVBBZGRyZXNzIHx8ICdQZWVyIEhvc3QvSVAnKTtcbiAgICAgICAgICAgIGxhYmVsUG9ydFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclBvcnQgfHwgJ1BlZXIgUG9ydCcpO1xuICAgICAgICAgICAgbGFiZWxVc2VybmFtZVRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclVzZXJuYW1lIHx8ICdQZWVyIFVzZXJuYW1lJyk7XG4gICAgICAgICAgICBsYWJlbFNlY3JldFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclBhc3N3b3JkIHx8ICdQZWVyIFBhc3N3b3JkJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IHBvcnQgaWYgZW1wdHlcbiAgICAgICAgICAgIGlmICh2YWxQb3J0LnZhbCgpID09PSAnJyB8fCB2YWxQb3J0LnZhbCgpID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgICB2YWxQb3J0LnZhbCgnNDU2OScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSJdfQ==