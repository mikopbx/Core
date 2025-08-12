"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, TooltipBuilder, i18n, ProvidersAPI */

/**
 * Base class for provider management forms
 * @class ProviderBase
 */
var ProviderBase = /*#__PURE__*/function () {
  /**  
   * Constructor
   * @param {string} providerType - Type of provider (SIP or IAX)
   */
  function ProviderBase(providerType) {
    _classCallCheck(this, ProviderBase);

    this.providerType = providerType;
    this.$formObj = $('#save-provider-form');
    this.$secret = $('#secret');
    this.$additionalHostsDummy = $('#additional-hosts-table .dummy');
    this.$additionalHostsTemplate = $('#additional-hosts-table .host-row-tpl');
    this.$checkBoxes = $('#save-provider-form .checkbox');
    this.$accordions = $('#save-provider-form .ui.accordion');
    this.$dropDowns = $('#save-provider-form .ui.dropdown');
    this.$deleteRowButton = $('#additional-hosts-table .delete-row-button');
    this.$additionalHostInput = $('#additional-host input');
    this.hostRow = '#save-provider-form .host-row';
    this.hostInputValidation = new RegExp('^(((\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}' + '(\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])' + '(\\/(\d|[1-2]\d|3[0-2]))?' + '|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+)$', 'gm');
  }
  /**
   * Initialize the provider form
   */


  _createClass(ProviderBase, [{
    key: "initialize",
    value: function initialize() {
      var _this = this;

      // Get provider ID and type from form
      var providerId = $('#id').val() || $('#uniqid').val() || '';
      var providerType = this.providerType; // Update header immediately for better UX

      var currentDescription = $('#description').val() || '';
      this.updatePageHeader(currentDescription); // Show loading state

      this.showLoadingState(); // Load provider data from REST API

      ProvidersAPI.getRecord(providerId, providerType, function (response) {
        _this.hideLoadingState();

        if (response.result && response.data) {
          // Populate form with data
          _this.populateFormData(response.data);
        } else {
          // Provider data loading failed for existing provider
          if (providerId && providerId !== 'new') {
            UserMessage.showMultiString(response.messages);
          } // Initialize network filter dropdown for new providers


          _this.initializeNetworkFilterDropdown();
        } // Continue with initialization


        _this.initializeUIComponents();

        _this.initializeEventHandlers();

        _this.initializeForm();

        _this.updateVisibilityElements(); // Initialize all tooltip popups


        $('.popuped').popup();

        _this.initializeClipboard(); // Prevent browser password manager for generated passwords


        _this.$secret.on('focus', function () {
          $(this).attr('autocomplete', 'new-password');
        });
      });
    }
    /**
     * Initialize UI components
     */

  }, {
    key: "initializeUIComponents",
    value: function initializeUIComponents() {
      this.$checkBoxes.checkbox();
      this.$dropDowns.dropdown();
      this.$accordions.accordion();
      this.updateHostsTableView(); // Initialize dynamic dropdowns

      this.initializeRegistrationTypeDropdown();

      if (this.providerType === 'SIP') {
        this.initializeDtmfModeDropdown();
        this.initializeTransportDropdown();
      } // Network filter dropdown will be initialized after data is loaded

    }
    /**
     * Initialize registration type dropdown dynamically
     */

  }, {
    key: "initializeRegistrationTypeDropdown",
    value: function initializeRegistrationTypeDropdown() {
      var _this2 = this,
          _options$find;

      var $field = $('#registration_type');
      if ($field.length === 0) return; // Check if already inside a dropdown structure

      var $existingDropdown = $field.closest('.ui.dropdown');

      if ($existingDropdown.length > 0) {
        // Already a dropdown, just ensure it's initialized
        if (!$existingDropdown.hasClass('registration-type-dropdown')) {
          $existingDropdown.addClass('registration-type-dropdown');
        }

        $existingDropdown.dropdown({
          onChange: function onChange(value) {
            _this2.updateVisibilityElements(); // Clear validation errors


            _this2.$formObj.find('.field').removeClass('error');

            _this2.$formObj.find('.ui.error.message').remove();

            _this2.$formObj.find('.prompt').remove(); // Update validation rules


            Form.validateRules = _this2.getValidateRules();
            Form.dataChanged();
          }
        });
        return;
      }

      var currentValue = $field.val() || 'outbound';
      var isIAX = this.providerType === 'IAX'; // Build options based on provider type

      var options = [{
        value: 'outbound',
        text: globalTranslate[isIAX ? 'iax_REG_TYPE_OUTBOUND' : 'sip_REG_TYPE_OUTBOUND'] || 'Outbound'
      }, {
        value: 'inbound',
        text: globalTranslate[isIAX ? 'iax_REG_TYPE_INBOUND' : 'sip_REG_TYPE_INBOUND'] || 'Inbound'
      }, {
        value: 'none',
        text: globalTranslate[isIAX ? 'iax_REG_TYPE_NONE' : 'sip_REG_TYPE_NONE'] || 'None'
      }]; // Create dropdown HTML

      var dropdownHtml = "\n            <div class=\"ui selection dropdown registration-type-dropdown\">\n                <input type=\"hidden\" name=\"registration_type\" id=\"registration_type\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(((_options$find = options.find(function (o) {
        return o.value === currentValue;
      })) === null || _options$find === void 0 ? void 0 : _options$find.text) || currentValue, "</div>\n                <div class=\"menu\">\n                    ").concat(options.map(function (opt) {
        return "<div class=\"item\" data-value=\"".concat(opt.value, "\">").concat(opt.text, "</div>");
      }).join(''), "\n                </div>\n            </div>\n        "); // Replace the field

      $field.replaceWith(dropdownHtml); // Initialize dropdown

      $('.registration-type-dropdown').dropdown({
        onChange: function onChange(value) {
          _this2.updateVisibilityElements(); // Clear validation errors


          _this2.$formObj.find('.field').removeClass('error');

          _this2.$formObj.find('.ui.error.message').remove();

          _this2.$formObj.find('.prompt').remove(); // Update validation rules


          Form.validateRules = _this2.getValidateRules();
          Form.dataChanged();
        }
      });
    }
    /**
     * Initialize DTMF mode dropdown for SIP providers
     */

  }, {
    key: "initializeDtmfModeDropdown",
    value: function initializeDtmfModeDropdown() {
      var _options$find2;

      var $field = $('#dtmfmode');
      if ($field.length === 0) return; // Check if already inside a dropdown structure

      var $existingDropdown = $field.closest('.ui.dropdown');

      if ($existingDropdown.length > 0) {
        // Already a dropdown, just ensure it's initialized
        if (!$existingDropdown.hasClass('dtmf-mode-dropdown')) {
          $existingDropdown.addClass('dtmf-mode-dropdown');
        }

        $existingDropdown.dropdown({
          onChange: function onChange() {
            return Form.dataChanged();
          }
        });
        return;
      }

      var currentValue = $field.val() || 'auto';
      var options = [{
        value: 'auto',
        text: globalTranslate.auto || 'auto'
      }, {
        value: 'rfc4733',
        text: globalTranslate.rfc4733 || 'rfc4733'
      }, {
        value: 'info',
        text: globalTranslate.info || 'info'
      }, {
        value: 'inband',
        text: globalTranslate.inband || 'inband'
      }, {
        value: 'auto_info',
        text: globalTranslate.auto_info || 'auto_info'
      }];
      var dropdownHtml = "\n            <div class=\"ui selection dropdown dtmf-mode-dropdown\">\n                <input type=\"hidden\" name=\"dtmfmode\" id=\"dtmfmode\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(((_options$find2 = options.find(function (o) {
        return o.value === currentValue;
      })) === null || _options$find2 === void 0 ? void 0 : _options$find2.text) || currentValue, "</div>\n                <div class=\"menu\">\n                    ").concat(options.map(function (opt) {
        return "<div class=\"item\" data-value=\"".concat(opt.value, "\">").concat(opt.text, "</div>");
      }).join(''), "\n                </div>\n            </div>\n        ");
      $field.replaceWith(dropdownHtml);
      $('.dtmf-mode-dropdown').dropdown({
        onChange: function onChange() {
          return Form.dataChanged();
        }
      });
    }
    /**
     * Initialize transport protocol dropdown for SIP providers
     */

  }, {
    key: "initializeTransportDropdown",
    value: function initializeTransportDropdown() {
      var $field = $('#transport');
      if ($field.length === 0) return; // Check if already inside a dropdown structure

      var $existingDropdown = $field.closest('.ui.dropdown');

      if ($existingDropdown.length > 0) {
        // Already a dropdown, just ensure it's initialized
        if (!$existingDropdown.hasClass('transport-dropdown')) {
          $existingDropdown.addClass('transport-dropdown');
        }

        $existingDropdown.dropdown({
          onChange: function onChange() {
            return Form.dataChanged();
          }
        });
        return;
      }

      var currentValue = $field.val() || 'UDP';
      var options = [{
        value: 'UDP',
        text: 'UDP'
      }, {
        value: 'TCP',
        text: 'TCP'
      }, {
        value: 'TLS',
        text: 'TLS'
      }];
      var dropdownHtml = "\n            <div class=\"ui selection dropdown transport-dropdown\">\n                <input type=\"hidden\" name=\"transport\" id=\"transport\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(currentValue, "</div>\n                <div class=\"menu\">\n                    ").concat(options.map(function (opt) {
        return "<div class=\"item\" data-value=\"".concat(opt.value, "\">").concat(opt.text, "</div>");
      }).join(''), "\n                </div>\n            </div>\n        ");
      $field.replaceWith(dropdownHtml);
      $('.transport-dropdown').dropdown({
        onChange: function onChange() {
          return Form.dataChanged();
        }
      });
    }
    /**
     * Initialize network filter dropdown
     * @param {string} preselectedValue - Optional preselected value from API
     */

  }, {
    key: "initializeNetworkFilterDropdown",
    value: function initializeNetworkFilterDropdown() {
      var _this3 = this;

      var preselectedValue = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var $field = $('#networkfilterid');
      if ($field.length === 0) return; // Get the dropdown element

      var $dropdown = $field;

      if ($field.is('select')) {
        $dropdown = $field.hasClass('ui') ? $field : $field.closest('.ui.dropdown');

        if ($dropdown.length === 0) {
          $dropdown = $field;
        }
      } // Use provided value or get current value


      var currentValue = preselectedValue || this.getCurrentNetworkFilterValue(); // Use NetworkFiltersAPI to initialize the dropdown

      NetworkFiltersAPI.initializeDropdown($dropdown, {
        currentValue: currentValue,
        providerType: this.providerType,
        onChange: function onChange(value) {
          _this3.onNetworkFilterChange(value);

          Form.dataChanged();
        }
      });
    }
    /**
     * Get current network filter value from various sources
     * @returns {string} Current network filter value
     */

  }, {
    key: "getCurrentNetworkFilterValue",
    value: function getCurrentNetworkFilterValue() {
      // Try to get value from hidden input
      var value = $('#networkfilterid').val(); // If not found, try to get from form data or REST API

      if (!value) {
        // Check if we're editing existing provider
        var providerId = $('#id').val();

        if (providerId) {
          // Value should be loaded from server when editing
          value = $('#networkfilterid').attr('value') || 'none';
        } else {
          // Default for new providers
          value = 'none';
        }
      }

      return value;
    }
    /**
     * Handle network filter change
     * @param {string} value - Selected network filter value
     */

  }, {
    key: "onNetworkFilterChange",
    value: function onNetworkFilterChange(value) {
      // Update hidden input value
      $('#networkfilterid').val(value); // Can be overridden in child classes for specific behavior
    }
    /**
     * Save current network filter value to restore later
     */

  }, {
    key: "saveNetworkFilterState",
    value: function saveNetworkFilterState() {
      var value = $('#networkfilterid').val();

      if (value) {
        sessionStorage.setItem("".concat(this.providerType, "_networkfilter_value"), value);
      }
    }
    /**
     * Restore previously saved network filter value
     */

  }, {
    key: "restoreNetworkFilterState",
    value: function restoreNetworkFilterState() {
      var savedValue = sessionStorage.getItem("".concat(this.providerType, "_networkfilter_value"));

      if (savedValue) {
        var $dropdown = $('#networkfilterid').closest('.ui.dropdown');

        if ($dropdown.length > 0) {
          $dropdown.dropdown('set selected', savedValue);
        }
      }
    }
    /**
     * Initialize event handlers
     */

  }, {
    key: "initializeEventHandlers",
    value: function initializeEventHandlers() {
      var _this4 = this;

      var self = this; // Update header when provider name changes

      $('#description').on('input', function () {
        self.updatePageHeader($(this).val());
      }); // Add new string to additional-hosts-table table

      this.$additionalHostInput.keypress(function (e) {
        if (e.which === 13) {
          self.cbOnCompleteHostAddress();
        }
      }); // Delete host from additional-hosts-table - use event delegation for dynamic elements

      $('#additional-hosts-table').on('click', '.delete-row-button', function (e) {
        e.preventDefault();
        $(e.target).closest('tr').remove();
        self.updateHostsTableView();
        Form.dataChanged();
        return false;
      }); // Show/hide password toggle

      $('#show-hide-password').on('click', function (e) {
        e.preventDefault();
        var $button = $(e.currentTarget);
        var $icon = $button.find('i');

        if (_this4.$secret.attr('type') === 'password') {
          // Show password
          $icon.removeClass('eye').addClass('eye slash');

          _this4.$secret.attr('type', 'text');
        } else {
          // Hide password
          $icon.removeClass('eye slash').addClass('eye');

          _this4.$secret.attr('type', 'password');
        }
      }); // Generate new password

      $('#generate-new-password').on('click', function (e) {
        e.preventDefault();

        _this4.generatePassword();
      });
    }
    /**
     * Initialize clipboard functionality
     */

  }, {
    key: "initializeClipboard",
    value: function initializeClipboard() {
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
        UserMessage.showError(globalTranslate.pr_ErrorOnProviderSave);
      });
    }
    /**
     * Generate a new password
     */

  }, {
    key: "generatePassword",
    value: function generatePassword() {
      var _this5 = this;

      PbxApi.PasswordGenerate(16, function (password) {
        if (password) {
          _this5.$secret.val(password);

          _this5.$secret.trigger('change');

          Form.dataChanged();
          $('.clipboard').attr('data-clipboard-text', password);
        }
      });
    }
    /**
     * Update visibility of elements based on provider settings
     * This method should be overridden in child classes
     */

  }, {
    key: "updateVisibilityElements",
    value: function updateVisibilityElements() {// Override in child classes
    }
    /**
     * Show password tooltip icon when in 'none' registration mode
     */

  }, {
    key: "showPasswordTooltip",
    value: function showPasswordTooltip() {
      $('.password-tooltip-icon').show();
    }
    /**
     * Hide password tooltip icon
     */

  }, {
    key: "hidePasswordTooltip",
    value: function hidePasswordTooltip() {
      $('.password-tooltip-icon').hide();
    }
    /**
     * Get validation rules based on provider settings
     * This method should be overridden in child classes
     * @returns {object} Validation rules
     */

  }, {
    key: "getValidateRules",
    value: function getValidateRules() {
      // Override in child classes
      return {};
    }
    /**
     * Initialize form with validation and callbacks
     * Note: This method is overridden in provider-modify.js to configure REST API
     */

  }, {
    key: "initializeForm",
    value: function initializeForm() {
      Form.$formObj = this.$formObj; // URL is not set here - child classes configure REST API

      Form.validateRules = this.getValidateRules();
      Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
      Form.initialize();
    }
    /**
     * Callback before form submission
     * @param {object} settings - Form settings
     * @returns {object} Modified settings
     */

  }, {
    key: "cbBeforeSendForm",
    value: function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = this.$formObj.form('get values'); // Convert additional hosts table to array

      var additionalHosts = [];
      $('#additional-hosts-table tbody tr.host-row').each(function (index, obj) {
        var host = $(obj).find('td.address').text().trim();

        if (host) {
          additionalHosts.push(host);
        }
      });

      if (additionalHosts.length > 0) {
        result.data.additionalHosts = JSON.stringify(additionalHosts);
      } // Save current network filter state


      this.saveNetworkFilterState();
      return result;
    }
    /**
     * Callback after form submission
     * @param {object} response - Server response
     */

  }, {
    key: "cbAfterSendForm",
    value: function cbAfterSendForm(response) {// Can be overridden in child classes
    }
    /**
     * Handle completion of host address input
     */

  }, {
    key: "cbOnCompleteHostAddress",
    value: function cbOnCompleteHostAddress() {
      var value = this.$formObj.form('get value', 'additional-host');

      if (value) {
        var validation = value.match(this.hostInputValidation); // Validate the input value

        if (validation === null || validation.length === 0) {
          this.$additionalHostInput.transition('shake');
          return;
        } // Check if the host address already exists


        if ($(".host-row[data-value=\"".concat(value, "\"]")).length === 0) {
          var $tr = $('.host-row-tpl').last();
          var $clone = $tr.clone(false); // Use false since events are delegated

          $clone.removeClass('host-row-tpl').addClass('host-row').show();
          $clone.attr('data-value', value);
          $clone.find('.address').html(value);

          if ($(this.hostRow).last().length === 0) {
            $tr.after($clone);
          } else {
            $(this.hostRow).last().after($clone);
          }

          this.updateHostsTableView();
          Form.dataChanged();
        }

        this.$additionalHostInput.val('');
      }
    }
    /**
     * Update the visibility of hosts table
     */

  }, {
    key: "updateHostsTableView",
    value: function updateHostsTableView() {
      if ($(this.hostRow).length === 0) {
        this.$additionalHostsDummy.show();
      } else {
        this.$additionalHostsDummy.hide();
      }
    }
    /**
     * Show loading state for the form
     */

  }, {
    key: "showLoadingState",
    value: function showLoadingState() {
      this.$formObj.addClass('loading');
    }
    /**
     * Hide loading state for the form
     */

  }, {
    key: "hideLoadingState",
    value: function hideLoadingState() {
      this.$formObj.removeClass('loading');
    }
    /**
     * Populate form with data from API
     * @param {object} data - Provider data from API
     */

  }, {
    key: "populateFormData",
    value: function populateFormData(data) {
      // Common fields
      if (data.id) $('#id').val(data.id);
      if (data.uniqid) $('#uniqid').val(data.uniqid);

      if (data.description) {
        $('#description').val(data.description); // Update page header with provider name and type

        this.updatePageHeader(data.description);
      }

      if (data.note) $('#note').val(data.note); // Store network filter value for later initialization

      var networkFilterValue = data.networkfilterid || 'none'; // Provider type specific fields - REST API v2 returns flat structure

      if (this.providerType === 'SIP') {
        $('#username').val(data.username || '');
        $('#secret').val(data.secret || '');
        $('#host').val(data.host || '');
        $('#port').val(data.port || '5060');
        $('#registration_type').val(data.registration_type || 'outbound');
        $('#networkfilterid').val(networkFilterValue);
        $('#dtmfmode').val(data.dtmfmode || 'auto');
        $('#transport').val(data.transport || 'UDP');
        $('#fromuser').val(data.fromuser || '');
        $('#fromdomain').val(data.fromdomain || '');
        $('#outbound_proxy').val(data.outbound_proxy || '');
        $('#manualattributes').val(data.manualattributes || ''); // Checkboxes - handle both string '1' and boolean true

        if (data.qualify === '1' || data.qualify === true) $('#qualify').prop('checked', true);
        if (data.disablefromuser === '1' || data.disablefromuser === true) $('#disablefromuser').prop('checked', true);
        if (data.receive_calls_without_auth === '1' || data.receive_calls_without_auth === true) $('#receive_calls_without_auth').prop('checked', true);
        if (data.noregister === '1' || data.noregister === true) $('#noregister').prop('checked', true); // Qualify frequency

        $('#qualifyfreq').val(data.qualifyfreq || '60'); // Additional hosts - populate after form is ready

        this.populateAdditionalHosts(data.additionalHosts);
      } else if (this.providerType === 'IAX') {
        $('#username').val(data.username || '');
        $('#secret').val(data.secret || '');
        $('#host').val(data.host || '');
        $('#port').val(data.port || '4569');
        $('#registration_type').val(data.registration_type || 'outbound');
        $('#networkfilterid').val(networkFilterValue);
        $('#manualattributes').val(data.manualattributes || ''); // Checkboxes - handle both string '1' and boolean true

        if (data.qualify === '1' || data.qualify === true) $('#qualify').prop('checked', true);
        if (data.receive_calls_without_auth === '1' || data.receive_calls_without_auth === true) $('#receive_calls_without_auth').prop('checked', true);
        if (data.noregister === '1' || data.noregister === true) $('#noregister').prop('checked', true);
      } // Disabled state


      if (data.disabled === '1' || data.disabled === true) {
        $('#disabled').val('1');
      } // Initialize network filter dropdown with the value from API


      this.initializeNetworkFilterDropdown(networkFilterValue);
    }
    /**
     * Populate additional hosts from API data
     * @param {array} additionalHosts - Array of additional hosts from API
     */

  }, {
    key: "populateAdditionalHosts",
    value: function populateAdditionalHosts(additionalHosts) {
      var _this6 = this;

      if (!additionalHosts || !Array.isArray(additionalHosts)) {
        return;
      } // Clear existing hosts first (except template and dummy)


      $('#additional-hosts-table tbody tr.host-row').remove(); // Add each host using the same logic as cbOnCompleteHostAddress

      additionalHosts.forEach(function (hostObj) {
        // Handle both object format {id, address} and string format
        var hostAddress = typeof hostObj === 'string' ? hostObj : hostObj.address;

        if (hostAddress && hostAddress.trim()) {
          // Use the same logic as cbOnCompleteHostAddress
          var $tr = $('.host-row-tpl').last();
          var $clone = $tr.clone(false); // Use false since events are delegated

          $clone.removeClass('host-row-tpl').addClass('host-row').show();
          $clone.attr('data-value', hostAddress);
          $clone.find('.address').html(hostAddress); // Insert the cloned row

          if ($(_this6.hostRow).last().length === 0) {
            $tr.after($clone);
          } else {
            $(_this6.hostRow).last().after($clone);
          }
        }
      }); // Update table visibility

      this.updateHostsTableView();
    }
    /**
     * Build HTML content for tooltips from structured data
     * @param {Object} tooltipData - Tooltip data object
     * @returns {string} HTML content for tooltip
     * @deprecated Use TooltipBuilder.buildContent() instead
     */

  }, {
    key: "buildTooltipContent",
    value: function buildTooltipContent(tooltipData) {
      return TooltipBuilder.buildContent(tooltipData);
    }
    /**
     * Update page header with provider name and type
     * @param {string} providerName - Provider name
     */

  }, {
    key: "updatePageHeader",
    value: function updatePageHeader(providerName) {
      var providerTypeText = this.providerType === 'SIP' ? 'SIP' : 'IAX';
      var headerText;

      if (providerName && providerName.trim() !== '') {
        // Existing provider with name
        headerText = "".concat(providerName, " (").concat(providerTypeText, ")");
      } else {
        // New provider or no name
        var newProviderText = globalTranslate.pr_NewProvider || 'New Provider';
        headerText = "".concat(newProviderText, " (").concat(providerTypeText, ")");
      } // Update main header content


      $('h1 .content').text(headerText);
    }
  }]);

  return ProviderBase;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiJHNlY3JldCIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZSIsIiRjaGVja0JveGVzIiwiJGFjY29yZGlvbnMiLCIkZHJvcERvd25zIiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRhZGRpdGlvbmFsSG9zdElucHV0IiwiaG9zdFJvdyIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJwcm92aWRlcklkIiwidmFsIiwiY3VycmVudERlc2NyaXB0aW9uIiwidXBkYXRlUGFnZUhlYWRlciIsInNob3dMb2FkaW5nU3RhdGUiLCJQcm92aWRlcnNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsImhpZGVMb2FkaW5nU3RhdGUiLCJyZXN1bHQiLCJkYXRhIiwicG9wdWxhdGVGb3JtRGF0YSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJpbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsImluaXRpYWxpemVFdmVudEhhbmRsZXJzIiwiaW5pdGlhbGl6ZUZvcm0iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJwb3B1cCIsImluaXRpYWxpemVDbGlwYm9hcmQiLCJvbiIsImF0dHIiLCJjaGVja2JveCIsImRyb3Bkb3duIiwiYWNjb3JkaW9uIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duIiwiaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24iLCJpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24iLCIkZmllbGQiLCJsZW5ndGgiLCIkZXhpc3RpbmdEcm9wZG93biIsImNsb3Nlc3QiLCJoYXNDbGFzcyIsImFkZENsYXNzIiwib25DaGFuZ2UiLCJ2YWx1ZSIsImZpbmQiLCJyZW1vdmVDbGFzcyIsInJlbW92ZSIsIkZvcm0iLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImRhdGFDaGFuZ2VkIiwiY3VycmVudFZhbHVlIiwiaXNJQVgiLCJvcHRpb25zIiwidGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsImRyb3Bkb3duSHRtbCIsIm8iLCJtYXAiLCJvcHQiLCJqb2luIiwicmVwbGFjZVdpdGgiLCJhdXRvIiwicmZjNDczMyIsImluZm8iLCJpbmJhbmQiLCJhdXRvX2luZm8iLCJwcmVzZWxlY3RlZFZhbHVlIiwiJGRyb3Bkb3duIiwiaXMiLCJnZXRDdXJyZW50TmV0d29ya0ZpbHRlclZhbHVlIiwiTmV0d29ya0ZpbHRlcnNBUEkiLCJpbml0aWFsaXplRHJvcGRvd24iLCJvbk5ldHdvcmtGaWx0ZXJDaGFuZ2UiLCJzZXNzaW9uU3RvcmFnZSIsInNldEl0ZW0iLCJzYXZlZFZhbHVlIiwiZ2V0SXRlbSIsInNlbGYiLCJrZXlwcmVzcyIsImUiLCJ3aGljaCIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwicHJldmVudERlZmF1bHQiLCJ0YXJnZXQiLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsIiRpY29uIiwiZ2VuZXJhdGVQYXNzd29yZCIsImNsaXBib2FyZCIsIkNsaXBib2FyZEpTIiwidHJpZ2dlciIsInNldFRpbWVvdXQiLCJjbGVhclNlbGVjdGlvbiIsInNob3dFcnJvciIsInByX0Vycm9yT25Qcm92aWRlclNhdmUiLCJQYnhBcGkiLCJQYXNzd29yZEdlbmVyYXRlIiwicGFzc3dvcmQiLCJzaG93IiwiaGlkZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiaW5pdGlhbGl6ZSIsInNldHRpbmdzIiwiZm9ybSIsImFkZGl0aW9uYWxIb3N0cyIsImVhY2giLCJpbmRleCIsIm9iaiIsImhvc3QiLCJ0cmltIiwicHVzaCIsIkpTT04iLCJzdHJpbmdpZnkiLCJzYXZlTmV0d29ya0ZpbHRlclN0YXRlIiwidmFsaWRhdGlvbiIsIm1hdGNoIiwidHJhbnNpdGlvbiIsIiR0ciIsImxhc3QiLCIkY2xvbmUiLCJjbG9uZSIsImh0bWwiLCJhZnRlciIsImlkIiwidW5pcWlkIiwiZGVzY3JpcHRpb24iLCJub3RlIiwibmV0d29ya0ZpbHRlclZhbHVlIiwibmV0d29ya2ZpbHRlcmlkIiwidXNlcm5hbWUiLCJzZWNyZXQiLCJwb3J0IiwicmVnaXN0cmF0aW9uX3R5cGUiLCJkdG1mbW9kZSIsInRyYW5zcG9ydCIsImZyb211c2VyIiwiZnJvbWRvbWFpbiIsIm91dGJvdW5kX3Byb3h5IiwibWFudWFsYXR0cmlidXRlcyIsInF1YWxpZnkiLCJwcm9wIiwiZGlzYWJsZWZyb211c2VyIiwicmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgiLCJub3JlZ2lzdGVyIiwicXVhbGlmeWZyZXEiLCJwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyIsImRpc2FibGVkIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9yRWFjaCIsImhvc3RPYmoiLCJob3N0QWRkcmVzcyIsImFkZHJlc3MiLCJ0b29sdGlwRGF0YSIsIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50IiwicHJvdmlkZXJOYW1lIiwicHJvdmlkZXJUeXBlVGV4dCIsImhlYWRlclRleHQiLCJuZXdQcm92aWRlclRleHQiLCJwcl9OZXdQcm92aWRlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFk7QUFDRjtBQUNKO0FBQ0E7QUFDQTtBQUNJLHdCQUFZQyxZQUFaLEVBQTBCO0FBQUE7O0FBQ3RCLFNBQUtBLFlBQUwsR0FBb0JBLFlBQXBCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQkMsQ0FBQyxDQUFDLHFCQUFELENBQWpCO0FBQ0Es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QXZCLEtBQWtDLENBQXRDLEVBQXlDO0FBQ3JDbUYsWUFBQUEsR0FBRyxDQUFDSyxLQUFKLENBQVVILE1BQVY7QUFDSCxXQUZELE1BRU87QUFDSGpJLFlBQUFBLENBQUMsQ0FBQyxNQUFJLENBQUNTLE9BQU4sQ0FBRCxDQUFnQnVILElBQWhCLEdBQXVCSSxLQUF2QixDQUE2QkgsTUFBN0I7QUFDSDtBQUNKO0FBQ0osT0FyQkQsRUFUcUMsQ0FnQ3JDOztBQUNBLFdBQUsxRixvQkFBTDtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksNkJBQW9CNEgsV0FBcEIsRUFBaUM7QUFDN0IsYUFBT0MsY0FBYyxDQUFDQyxZQUFmLENBQTRCRixXQUE1QixDQUFQO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLDBCQUFpQkcsWUFBakIsRUFBK0I7QUFDM0IsVUFBTUMsZ0JBQWdCLEdBQUcsS0FBS3pLLFlBQUwsS0FBc0IsS0FBdEIsR0FBOEIsS0FBOUIsR0FBc0MsS0FBL0Q7QUFDQSxVQUFJMEssVUFBSjs7QUFFQSxVQUFJRixZQUFZLElBQUlBLFlBQVksQ0FBQy9DLElBQWIsT0FBd0IsRUFBNUMsRUFBZ0Q7QUFDNUM7QUFDQWlELFFBQUFBLFVBQVUsYUFBTUYsWUFBTixlQUF1QkMsZ0JBQXZCLE1BQVY7QUFDSCxPQUhELE1BR087QUFDSDtBQUNBLFlBQU1FLGVBQWUsR0FBRzNHLGVBQWUsQ0FBQzRHLGNBQWhCLElBQWtDLGNBQTFEO0FBQ0FGLFFBQUFBLFVBQVUsYUFBTUMsZUFBTixlQUEwQkYsZ0JBQTFCLE1BQVY7QUFDSCxPQVgwQixDQWEzQjs7O0FBQ0F2SyxNQUFBQSxDQUFDLENBQUMsYUFBRCxDQUFELENBQWlCNkQsSUFBakIsQ0FBc0IyRyxVQUF0QjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgTmV0d29ya0ZpbHRlcnNBUEksIFRvb2x0aXBCdWlsZGVyLCBpMThuLCBQcm92aWRlcnNBUEkgKi9cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1zXG4gKiBAY2xhc3MgUHJvdmlkZXJCYXNlXG4gKi9cbmNsYXNzIFByb3ZpZGVyQmFzZSB7IFxuICAgIC8qKiAgXG4gICAgICogQ29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXJUeXBlIC0gVHlwZSBvZiBwcm92aWRlciAoU0lQIG9yIElBWClcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihwcm92aWRlclR5cGUpIHtcbiAgICAgICAgdGhpcy5wcm92aWRlclR5cGUgPSBwcm92aWRlclR5cGU7XG4gICAgICAgIHRoaXMuJGZvcm1PYmogPSAkKCcjc2F2ZS1wcm92aWRlci1mb3JtJyk7XG4gICAgICAgIHRoaXMuJHNlY3JldCA9ICQoJyNzZWNyZXQnKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkgPSAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuZHVtbXknKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGVtcGxhdGUgPSAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuaG9zdC1yb3ctdHBsJyk7XG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMgPSAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC5jaGVja2JveCcpO1xuICAgICAgICB0aGlzLiRhY2NvcmRpb25zID0gJCgnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuYWNjb3JkaW9uJyk7XG4gICAgICAgIHRoaXMuJGRyb3BEb3ducyA9ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgIHRoaXMuJGRlbGV0ZVJvd0J1dHRvbiA9ICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5kZWxldGUtcm93LWJ1dHRvbicpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0ID0gJCgnI2FkZGl0aW9uYWwtaG9zdCBpbnB1dCcpO1xuICAgICAgICB0aGlzLmhvc3RSb3cgPSAnI3NhdmUtcHJvdmlkZXItZm9ybSAuaG9zdC1yb3cnO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgICdeKCgoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSlcXFxcLil7M30nXG4gICAgICAgICAgICArICcoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSknXG4gICAgICAgICAgICArICcoXFxcXC8oXFxkfFsxLTJdXFxkfDNbMC0yXSkpPydcbiAgICAgICAgICAgICsgJ3xbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSg/OlxcXFwuW2EtekEtWl17Mix9KSspJCcsXG4gICAgICAgICAgICAnZ20nXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEdldCBwcm92aWRlciBJRCBhbmQgdHlwZSBmcm9tIGZvcm1cbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpIHx8ICQoJyN1bmlxaWQnKS52YWwoKSB8fCAnJztcbiAgICAgICAgY29uc3QgcHJvdmlkZXJUeXBlID0gdGhpcy5wcm92aWRlclR5cGU7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIGltbWVkaWF0ZWx5IGZvciBiZXR0ZXIgVVhcbiAgICAgICAgY29uc3QgY3VycmVudERlc2NyaXB0aW9uID0gJCgnI2Rlc2NyaXB0aW9uJykudmFsKCkgfHwgJyc7XG4gICAgICAgIHRoaXMudXBkYXRlUGFnZUhlYWRlcihjdXJyZW50RGVzY3JpcHRpb24pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuc2hvd0xvYWRpbmdTdGF0ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBwcm92aWRlciBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgUHJvdmlkZXJzQVBJLmdldFJlY29yZChwcm92aWRlcklkLCBwcm92aWRlclR5cGUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUZvcm1EYXRhKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBkYXRhIGxvYWRpbmcgZmFpbGVkIGZvciBleGlzdGluZyBwcm92aWRlclxuICAgICAgICAgICAgICAgIGlmIChwcm92aWRlcklkICYmIHByb3ZpZGVySWQgIT09ICduZXcnKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ29udGludWUgd2l0aCBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGFsbCB0b29sdGlwIHBvcHVwc1xuICAgICAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVDbGlwYm9hcmQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJldmVudCBicm93c2VyIHBhc3N3b3JkIG1hbmFnZXIgZm9yIGdlbmVyYXRlZCBwYXNzd29yZHNcbiAgICAgICAgICAgIHRoaXMuJHNlY3JldC5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ2F1dG9jb21wbGV0ZScsICduZXctcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICB0aGlzLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgICAgIHRoaXMuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuICAgICAgICB0aGlzLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGR5bmFtaWMgZHJvcGRvd25zXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpO1xuICAgICAgICBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCk7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVnaXN0cmF0aW9uIHR5cGUgZHJvcGRvd24gZHluYW1pY2FsbHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5zaWRlIGEgZHJvcGRvd24gc3RydWN0dXJlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBhIGRyb3Bkb3duLCBqdXN0IGVuc3VyZSBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISRleGlzdGluZ0Ryb3Bkb3duLmhhc0NsYXNzKCdyZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93bicpKSB7XG4gICAgICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uYWRkQ2xhc3MoJ3JlZ2lzdHJhdGlvbi10eXBlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9yc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy51aS5lcnJvci5tZXNzYWdlJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnLnByb21wdCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICAgICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkZmllbGQudmFsKCkgfHwgJ291dGJvdW5kJztcbiAgICAgICAgY29uc3QgaXNJQVggPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCc7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBvcHRpb25zIGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdvdXRib3VuZCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZVtpc0lBWCA/ICdpYXhfUkVHX1RZUEVfT1VUQk9VTkQnIDogJ3NpcF9SRUdfVFlQRV9PVVRCT1VORCddIHx8ICdPdXRib3VuZCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdpbmJvdW5kJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlW2lzSUFYID8gJ2lheF9SRUdfVFlQRV9JTkJPVU5EJyA6ICdzaXBfUkVHX1RZUEVfSU5CT1VORCddIHx8ICdJbmJvdW5kJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ25vbmUnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGVbaXNJQVggPyAnaWF4X1JFR19UWVBFX05PTkUnIDogJ3NpcF9SRUdfVFlQRV9OT05FJ10gfHwgJ05vbmUnIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBIVE1MXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gcmVnaXN0cmF0aW9uLXR5cGUtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJyZWdpc3RyYXRpb25fdHlwZVwiIGlkPVwicmVnaXN0cmF0aW9uX3R5cGVcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtvcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSBjdXJyZW50VmFsdWUpPy50ZXh0IHx8IGN1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAke29wdGlvbnMubWFwKG9wdCA9PiBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+JHtvcHQudGV4dH08L2Rpdj5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgZmllbGRcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICAgICQoJy5yZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZXJyb3JzXG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy51aS5lcnJvci5tZXNzYWdlJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcucHJvbXB0JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERUTUYgbW9kZSBkcm9wZG93biBmb3IgU0lQIHByb3ZpZGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKCcjZHRtZm1vZGUnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5zaWRlIGEgZHJvcGRvd24gc3RydWN0dXJlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBhIGRyb3Bkb3duLCBqdXN0IGVuc3VyZSBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISRleGlzdGluZ0Ryb3Bkb3duLmhhc0NsYXNzKCdkdG1mLW1vZGUtZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmFkZENsYXNzKCdkdG1mLW1vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICdhdXRvJztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnYXV0bycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5hdXRvIHx8ICdhdXRvJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ3JmYzQ3MzMnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucmZjNDczMyB8fCAncmZjNDczMycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdpbmZvJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmluZm8gfHwgJ2luZm8nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnaW5iYW5kJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmluYmFuZCB8fCAnaW5iYW5kJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2F1dG9faW5mbycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5hdXRvX2luZm8gfHwgJ2F1dG9faW5mbycgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZHJvcGRvd25IdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93biBkdG1mLW1vZGUtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkdG1mbW9kZVwiIGlkPVwiZHRtZm1vZGVcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtvcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSBjdXJyZW50VmFsdWUpPy50ZXh0IHx8IGN1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAke29wdGlvbnMubWFwKG9wdCA9PiBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+JHtvcHQudGV4dH08L2Rpdj5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAkKCcuZHRtZi1tb2RlLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0cmFuc3BvcnQgcHJvdG9jb2wgZHJvcGRvd24gZm9yIFNJUCBwcm92aWRlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoJyN0cmFuc3BvcnQnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5zaWRlIGEgZHJvcGRvd24gc3RydWN0dXJlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBhIGRyb3Bkb3duLCBqdXN0IGVuc3VyZSBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISRleGlzdGluZ0Ryb3Bkb3duLmhhc0NsYXNzKCd0cmFuc3BvcnQtZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmFkZENsYXNzKCd0cmFuc3BvcnQtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICdVRFAnO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdVRFAnLCB0ZXh0OiAnVURQJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ1RDUCcsIHRleHQ6ICdUQ1AnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnVExTJywgdGV4dDogJ1RMUycgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZHJvcGRvd25IdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93biB0cmFuc3BvcnQtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJ0cmFuc3BvcnRcIiBpZD1cInRyYW5zcG9ydFwiIHZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke2N1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAke29wdGlvbnMubWFwKG9wdCA9PiBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+JHtvcHQudGV4dH08L2Rpdj5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAkKCcudHJhbnNwb3J0LWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVzZWxlY3RlZFZhbHVlIC0gT3B0aW9uYWwgcHJlc2VsZWN0ZWQgdmFsdWUgZnJvbSBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKHByZXNlbGVjdGVkVmFsdWUgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoJyNuZXR3b3JrZmlsdGVyaWQnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB0aGUgZHJvcGRvd24gZWxlbWVudFxuICAgICAgICBsZXQgJGRyb3Bkb3duID0gJGZpZWxkO1xuICAgICAgICBpZiAoJGZpZWxkLmlzKCdzZWxlY3QnKSkge1xuICAgICAgICAgICAgJGRyb3Bkb3duID0gJGZpZWxkLmhhc0NsYXNzKCd1aScpID8gJGZpZWxkIDogJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24gPSAkZmllbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBwcm92aWRlZCB2YWx1ZSBvciBnZXQgY3VycmVudCB2YWx1ZVxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBwcmVzZWxlY3RlZFZhbHVlIHx8IHRoaXMuZ2V0Q3VycmVudE5ldHdvcmtGaWx0ZXJWYWx1ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIE5ldHdvcmtGaWx0ZXJzQVBJIHRvIGluaXRpYWxpemUgdGhlIGRyb3Bkb3duXG4gICAgICAgIE5ldHdvcmtGaWx0ZXJzQVBJLmluaXRpYWxpemVEcm9wZG93bigkZHJvcGRvd24sIHtcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZTogY3VycmVudFZhbHVlLFxuICAgICAgICAgICAgcHJvdmlkZXJUeXBlOiB0aGlzLnByb3ZpZGVyVHlwZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uTmV0d29ya0ZpbHRlckNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgbmV0d29yayBmaWx0ZXIgdmFsdWUgZnJvbSB2YXJpb3VzIHNvdXJjZXNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDdXJyZW50IG5ldHdvcmsgZmlsdGVyIHZhbHVlXG4gICAgICovXG4gICAgZ2V0Q3VycmVudE5ldHdvcmtGaWx0ZXJWYWx1ZSgpIHtcbiAgICAgICAgLy8gVHJ5IHRvIGdldCB2YWx1ZSBmcm9tIGhpZGRlbiBpbnB1dFxuICAgICAgICBsZXQgdmFsdWUgPSAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBub3QgZm91bmQsIHRyeSB0byBnZXQgZnJvbSBmb3JtIGRhdGEgb3IgUkVTVCBBUElcbiAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgZWRpdGluZyBleGlzdGluZyBwcm92aWRlclxuICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKHByb3ZpZGVySWQpIHtcbiAgICAgICAgICAgICAgICAvLyBWYWx1ZSBzaG91bGQgYmUgbG9hZGVkIGZyb20gc2VydmVyIHdoZW4gZWRpdGluZ1xuICAgICAgICAgICAgICAgIHZhbHVlID0gJCgnI25ldHdvcmtmaWx0ZXJpZCcpLmF0dHIoJ3ZhbHVlJykgfHwgJ25vbmUnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBEZWZhdWx0IGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgdmFsdWUgPSAnbm9uZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIG5ldHdvcmsgZmlsdGVyIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIG5ldHdvcmsgZmlsdGVyIHZhbHVlXG4gICAgICovXG4gICAgb25OZXR3b3JrRmlsdGVyQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgdmFsdWVcbiAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbCh2YWx1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzIGZvciBzcGVjaWZpYyBiZWhhdmlvclxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIGN1cnJlbnQgbmV0d29yayBmaWx0ZXIgdmFsdWUgdG8gcmVzdG9yZSBsYXRlclxuICAgICAqL1xuICAgIHNhdmVOZXR3b3JrRmlsdGVyU3RhdGUoKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbCgpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYCR7dGhpcy5wcm92aWRlclR5cGV9X25ldHdvcmtmaWx0ZXJfdmFsdWVgLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUmVzdG9yZSBwcmV2aW91c2x5IHNhdmVkIG5ldHdvcmsgZmlsdGVyIHZhbHVlXG4gICAgICovXG4gICAgcmVzdG9yZU5ldHdvcmtGaWx0ZXJTdGF0ZSgpIHtcbiAgICAgICAgY29uc3Qgc2F2ZWRWYWx1ZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYCR7dGhpcy5wcm92aWRlclR5cGV9X25ldHdvcmtmaWx0ZXJfdmFsdWVgKTtcbiAgICAgICAgaWYgKHNhdmVkVmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNuZXR3b3JrZmlsdGVyaWQnKS5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2F2ZWRWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhlYWRlciB3aGVuIHByb3ZpZGVyIG5hbWUgY2hhbmdlc1xuICAgICAgICAkKCcjZGVzY3JpcHRpb24nKS5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNlbGYudXBkYXRlUGFnZUhlYWRlcigkKHRoaXMpLnZhbCgpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbmV3IHN0cmluZyB0byBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRhYmxlXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQua2V5cHJlc3MoKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLndoaWNoID09PSAxMykge1xuICAgICAgICAgICAgICAgIHNlbGYuY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGhvc3QgZnJvbSBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC0gdXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGR5bmFtaWMgZWxlbWVudHNcbiAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUnKS5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3ctYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNob3cvaGlkZSBwYXNzd29yZCB0b2dnbGVcbiAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkYnV0dG9uLmZpbmQoJ2knKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuJHNlY3JldC5hdHRyKCd0eXBlJykgPT09ICdwYXNzd29yZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHBhc3N3b3JkXG4gICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V5ZScpLmFkZENsYXNzKCdleWUgc2xhc2gnKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRzZWNyZXQuYXR0cigndHlwZScsICd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgcGFzc3dvcmRcbiAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllIHNsYXNoJykuYWRkQ2xhc3MoJ2V5ZScpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHNlY3JldC5hdHRyKCd0eXBlJywgJ3Bhc3N3b3JkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIG5ldyBwYXNzd29yZFxuICAgICAgICAkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNsaXBib2FyZCgpIHtcbiAgICAgICAgY29uc3QgY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY2xpcGJvYXJkJyk7XG4gICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNsaXBib2FyZC5vbignZXJyb3InLCAoZSkgPT4ge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5wcl9FcnJvck9uUHJvdmlkZXJTYXZlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuZXcgcGFzc3dvcmRcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVBhc3N3b3JkKCkge1xuICAgICAgICBQYnhBcGkuUGFzc3dvcmRHZW5lcmF0ZSgxNiwgKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICBpZiAocGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRzZWNyZXQudmFsKHBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRzZWNyZXQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgcGFzc3dvcmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIC8vIE92ZXJyaWRlIGluIGNoaWxkIGNsYXNzZXNcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBwYXNzd29yZCB0b29sdGlwIGljb24gd2hlbiBpbiAnbm9uZScgcmVnaXN0cmF0aW9uIG1vZGVcbiAgICAgKi9cbiAgICBzaG93UGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICAkKCcucGFzc3dvcmQtdG9vbHRpcC1pY29uJykuc2hvdygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHBhc3N3b3JkIHRvb2x0aXAgaWNvblxuICAgICAqL1xuICAgIGhpZGVQYXNzd29yZFRvb2x0aXAoKSB7XG4gICAgICAgICQoJy5wYXNzd29yZC10b29sdGlwLWljb24nKS5oaWRlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcHJvdmlkZXIgc2V0dGluZ3NcbiAgICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIC8vIE92ZXJyaWRlIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIHZhbGlkYXRpb24gYW5kIGNhbGxiYWNrc1xuICAgICAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIG92ZXJyaWRkZW4gaW4gcHJvdmlkZXItbW9kaWZ5LmpzIHRvIGNvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgLy8gVVJMIGlzIG5vdCBzZXQgaGVyZSAtIGNoaWxkIGNsYXNzZXMgY29uZmlndXJlIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE1vZGlmaWVkIHNldHRpbmdzXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgYWRkaXRpb25hbCBob3N0cyB0YWJsZSB0byBhcnJheVxuICAgICAgICBjb25zdCBhZGRpdGlvbmFsSG9zdHMgPSBbXTtcbiAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHkgdHIuaG9zdC1yb3cnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBob3N0ID0gJChvYmopLmZpbmQoJ3RkLmFkZHJlc3MnKS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsSG9zdHMucHVzaChob3N0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWRkaXRpb25hbEhvc3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFkZGl0aW9uYWxIb3N0cyA9IEpTT04uc3RyaW5naWZ5KGFkZGl0aW9uYWxIb3N0cyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgY3VycmVudCBuZXR3b3JrIGZpbHRlciBzdGF0ZVxuICAgICAgICB0aGlzLnNhdmVOZXR3b3JrRmlsdGVyU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIENhbiBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY29tcGxldGlvbiBvZiBob3N0IGFkZHJlc3MgaW5wdXRcbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdhZGRpdGlvbmFsLWhvc3QnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IHZhbHVlLm1hdGNoKHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBpbnB1dCB2YWx1ZVxuICAgICAgICAgICAgaWYgKHZhbGlkYXRpb24gPT09IG51bGwgfHwgdmFsaWRhdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgaG9zdCBhZGRyZXNzIGFscmVhZHkgZXhpc3RzXG4gICAgICAgICAgICBpZiAoJChgLmhvc3Qtcm93W2RhdGEtdmFsdWU9XCIke3ZhbHVlfVwiXWApLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9ICQoJy5ob3N0LXJvdy10cGwnKS5sYXN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGNsb25lID0gJHRyLmNsb25lKGZhbHNlKTsgLy8gVXNlIGZhbHNlIHNpbmNlIGV2ZW50cyBhcmUgZGVsZWdhdGVkXG4gICAgICAgICAgICAgICAgJGNsb25lXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaG9zdC1yb3ctdHBsJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdob3N0LXJvdycpXG4gICAgICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmZpbmQoJy5hZGRyZXNzJykuaHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKCQodGhpcy5ob3N0Um93KS5sYXN0KCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ci5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcy5ob3N0Um93KS5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBob3N0cyB0YWJsZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RzVGFibGVWaWV3KCkge1xuICAgICAgICBpZiAoJCh0aGlzLmhvc3RSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgbG9hZGluZyBzdGF0ZSBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBzaG93TG9hZGluZ1N0YXRlKCkge1xuICAgICAgICB0aGlzLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGluZyBzdGF0ZSBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBoaWRlTG9hZGluZ1N0YXRlKCkge1xuICAgICAgICB0aGlzLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIENvbW1vbiBmaWVsZHNcbiAgICAgICAgaWYgKGRhdGEuaWQpICQoJyNpZCcpLnZhbChkYXRhLmlkKTtcbiAgICAgICAgaWYgKGRhdGEudW5pcWlkKSAkKCcjdW5pcWlkJykudmFsKGRhdGEudW5pcWlkKTtcbiAgICAgICAgaWYgKGRhdGEuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgICQoJyNkZXNjcmlwdGlvbicpLnZhbChkYXRhLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIHByb3ZpZGVyIG5hbWUgYW5kIHR5cGVcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUGFnZUhlYWRlcihkYXRhLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5ub3RlKSAkKCcjbm90ZScpLnZhbChkYXRhLm5vdGUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgbmV0d29yayBmaWx0ZXIgdmFsdWUgZm9yIGxhdGVyIGluaXRpYWxpemF0aW9uXG4gICAgICAgIGxldCBuZXR3b3JrRmlsdGVyVmFsdWUgPSBkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZSc7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm92aWRlciB0eXBlIHNwZWNpZmljIGZpZWxkcyAtIFJFU1QgQVBJIHYyIHJldHVybnMgZmxhdCBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKHRoaXMucHJvdmlkZXJUeXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgJCgnI3VzZXJuYW1lJykudmFsKGRhdGEudXNlcm5hbWUgfHwgJycpO1xuICAgICAgICAgICAgJCgnI3NlY3JldCcpLnZhbChkYXRhLnNlY3JldCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjaG9zdCcpLnZhbChkYXRhLmhvc3QgfHwgJycpO1xuICAgICAgICAgICAgJCgnI3BvcnQnKS52YWwoZGF0YS5wb3J0IHx8ICc1MDYwJyk7XG4gICAgICAgICAgICAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCAnb3V0Ym91bmQnKTtcbiAgICAgICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwobmV0d29ya0ZpbHRlclZhbHVlKTtcbiAgICAgICAgICAgICQoJyNkdG1mbW9kZScpLnZhbChkYXRhLmR0bWZtb2RlIHx8ICdhdXRvJyk7XG4gICAgICAgICAgICAkKCcjdHJhbnNwb3J0JykudmFsKGRhdGEudHJhbnNwb3J0IHx8ICdVRFAnKTtcbiAgICAgICAgICAgICQoJyNmcm9tdXNlcicpLnZhbChkYXRhLmZyb211c2VyIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNmcm9tZG9tYWluJykudmFsKGRhdGEuZnJvbWRvbWFpbiB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjb3V0Ym91bmRfcHJveHknKS52YWwoZGF0YS5vdXRib3VuZF9wcm94eSB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjbWFudWFsYXR0cmlidXRlcycpLnZhbChkYXRhLm1hbnVhbGF0dHJpYnV0ZXMgfHwgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVja2JveGVzIC0gaGFuZGxlIGJvdGggc3RyaW5nICcxJyBhbmQgYm9vbGVhbiB0cnVlXG4gICAgICAgICAgICBpZiAoZGF0YS5xdWFsaWZ5ID09PSAnMScgfHwgZGF0YS5xdWFsaWZ5ID09PSB0cnVlKSAkKCcjcXVhbGlmeScpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChkYXRhLmRpc2FibGVmcm9tdXNlciA9PT0gJzEnIHx8IGRhdGEuZGlzYWJsZWZyb211c2VyID09PSB0cnVlKSAkKCcjZGlzYWJsZWZyb211c2VyJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgaWYgKGRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggPT09ICcxJyB8fCBkYXRhLnJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoID09PSB0cnVlKSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAoZGF0YS5ub3JlZ2lzdGVyID09PSAnMScgfHwgZGF0YS5ub3JlZ2lzdGVyID09PSB0cnVlKSAkKCcjbm9yZWdpc3RlcicpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUXVhbGlmeSBmcmVxdWVuY3lcbiAgICAgICAgICAgICQoJyNxdWFsaWZ5ZnJlcScpLnZhbChkYXRhLnF1YWxpZnlmcmVxIHx8ICc2MCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGRpdGlvbmFsIGhvc3RzIC0gcG9wdWxhdGUgYWZ0ZXIgZm9ybSBpcyByZWFkeVxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyhkYXRhLmFkZGl0aW9uYWxIb3N0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdJQVgnKSB7XG4gICAgICAgICAgICAkKCcjdXNlcm5hbWUnKS52YWwoZGF0YS51c2VybmFtZSB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjc2VjcmV0JykudmFsKGRhdGEuc2VjcmV0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNob3N0JykudmFsKGRhdGEuaG9zdCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjcG9ydCcpLnZhbChkYXRhLnBvcnQgfHwgJzQ1NjknKTtcbiAgICAgICAgICAgICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbChkYXRhLnJlZ2lzdHJhdGlvbl90eXBlIHx8ICdvdXRib3VuZCcpO1xuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChuZXR3b3JrRmlsdGVyVmFsdWUpO1xuICAgICAgICAgICAgJCgnI21hbnVhbGF0dHJpYnV0ZXMnKS52YWwoZGF0YS5tYW51YWxhdHRyaWJ1dGVzIHx8ICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2tib3hlcyAtIGhhbmRsZSBib3RoIHN0cmluZyAnMScgYW5kIGJvb2xlYW4gdHJ1ZVxuICAgICAgICAgICAgaWYgKGRhdGEucXVhbGlmeSA9PT0gJzEnIHx8IGRhdGEucXVhbGlmeSA9PT0gdHJ1ZSkgJCgnI3F1YWxpZnknKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAoZGF0YS5yZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCA9PT0gJzEnIHx8IGRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggPT09IHRydWUpICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChkYXRhLm5vcmVnaXN0ZXIgPT09ICcxJyB8fCBkYXRhLm5vcmVnaXN0ZXIgPT09IHRydWUpICQoJyNub3JlZ2lzdGVyJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlZCBzdGF0ZVxuICAgICAgICBpZiAoZGF0YS5kaXNhYmxlZCA9PT0gJzEnIHx8IGRhdGEuZGlzYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICQoJyNkaXNhYmxlZCcpLnZhbCgnMScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHdpdGggdGhlIHZhbHVlIGZyb20gQVBJXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bihuZXR3b3JrRmlsdGVyVmFsdWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGFkZGl0aW9uYWwgaG9zdHMgZnJvbSBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGFkZGl0aW9uYWxIb3N0cyAtIEFycmF5IG9mIGFkZGl0aW9uYWwgaG9zdHMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyhhZGRpdGlvbmFsSG9zdHMpIHtcbiAgICAgICAgaWYgKCFhZGRpdGlvbmFsSG9zdHMgfHwgIUFycmF5LmlzQXJyYXkoYWRkaXRpb25hbEhvc3RzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBob3N0cyBmaXJzdCAoZXhjZXB0IHRlbXBsYXRlIGFuZCBkdW1teSlcbiAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHkgdHIuaG9zdC1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIGhvc3QgdXNpbmcgdGhlIHNhbWUgbG9naWMgYXMgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3NcbiAgICAgICAgYWRkaXRpb25hbEhvc3RzLmZvckVhY2goKGhvc3RPYmopID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIG9iamVjdCBmb3JtYXQge2lkLCBhZGRyZXNzfSBhbmQgc3RyaW5nIGZvcm1hdFxuICAgICAgICAgICAgY29uc3QgaG9zdEFkZHJlc3MgPSB0eXBlb2YgaG9zdE9iaiA9PT0gJ3N0cmluZycgPyBob3N0T2JqIDogaG9zdE9iai5hZGRyZXNzO1xuICAgICAgICAgICAgaWYgKGhvc3RBZGRyZXNzICYmIGhvc3RBZGRyZXNzLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgc2FtZSBsb2dpYyBhcyBjYk9uQ29tcGxldGVIb3N0QWRkcmVzc1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9ICQoJy5ob3N0LXJvdy10cGwnKS5sYXN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGNsb25lID0gJHRyLmNsb25lKGZhbHNlKTsgLy8gVXNlIGZhbHNlIHNpbmNlIGV2ZW50cyBhcmUgZGVsZWdhdGVkXG4gICAgICAgICAgICAgICAgJGNsb25lXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaG9zdC1yb3ctdHBsJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdob3N0LXJvdycpXG4gICAgICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCBob3N0QWRkcmVzcyk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmZpbmQoJy5hZGRyZXNzJykuaHRtbChob3N0QWRkcmVzcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5zZXJ0IHRoZSBjbG9uZWQgcm93XG4gICAgICAgICAgICAgICAgaWYgKCQodGhpcy5ob3N0Um93KS5sYXN0KCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ci5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcy5ob3N0Um93KS5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBzIGZyb20gc3RydWN0dXJlZCBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gVG9vbHRpcCBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdG9vbHRpcFxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudCh0b29sdGlwRGF0YSkge1xuICAgICAgICByZXR1cm4gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggcHJvdmlkZXIgbmFtZSBhbmQgdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlck5hbWUgLSBQcm92aWRlciBuYW1lXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUhlYWRlcihwcm92aWRlck5hbWUpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJUeXBlVGV4dCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnU0lQJyA/ICdTSVAnIDogJ0lBWCc7XG4gICAgICAgIGxldCBoZWFkZXJUZXh0O1xuICAgICAgICBcbiAgICAgICAgaWYgKHByb3ZpZGVyTmFtZSAmJiBwcm92aWRlck5hbWUudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgLy8gRXhpc3RpbmcgcHJvdmlkZXIgd2l0aCBuYW1lXG4gICAgICAgICAgICBoZWFkZXJUZXh0ID0gYCR7cHJvdmlkZXJOYW1lfSAoJHtwcm92aWRlclR5cGVUZXh0fSlgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTmV3IHByb3ZpZGVyIG9yIG5vIG5hbWVcbiAgICAgICAgICAgIGNvbnN0IG5ld1Byb3ZpZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXdQcm92aWRlciB8fCAnTmV3IFByb3ZpZGVyJztcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBgJHtuZXdQcm92aWRlclRleHR9ICgke3Byb3ZpZGVyVHlwZVRleHR9KWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBtYWluIGhlYWRlciBjb250ZW50XG4gICAgICAgICQoJ2gxIC5jb250ZW50JykudGV4dChoZWFkZXJUZXh0KTtcbiAgICB9XG59Il19