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
      var providerType = this.providerType; // Show loading state

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
          }
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
      } // Initialize network filter dropdown


      this.initializeNetworkFilterDropdown();
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
     */

  }, {
    key: "initializeNetworkFilterDropdown",
    value: function initializeNetworkFilterDropdown() {
      var _this3 = this;

      var $field = $('#networkfilterid');
      if ($field.length === 0) return; // Get the dropdown element

      var $dropdown = $field;

      if ($field.is('select')) {
        $dropdown = $field.hasClass('ui') ? $field : $field.closest('.ui.dropdown');

        if ($dropdown.length === 0) {
          $dropdown = $field;
        }
      } // Get current value


      var currentValue = this.getCurrentNetworkFilterValue(); // Use NetworkFiltersAPI to initialize the dropdown

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

      var self = this; // Add new string to additional-hosts-table table

      this.$additionalHostInput.keypress(function (e) {
        if (e.which === 13) {
          self.cbOnCompleteHostAddress();
        }
      }); // Delete host from additional-hosts-table

      this.$deleteRowButton.on('click', function (e) {
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
      $('#additional-hosts-table tbody tr:not(.dummy)').each(function (index, obj) {
        var host = $(obj).find('td:first').text().trim();

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
      var _this6 = this;

      var host = this.$additionalHostInput.val().trim(); // Validate the host

      if (!host || !this.hostInputValidation.test(host)) {
        this.$additionalHostInput.parent().addClass('error');
        return;
      } // Check for duplicates


      var duplicate = false;
      $('#additional-hosts-table tbody tr:not(.dummy)').each(function (index, obj) {
        if ($(obj).find('td:first').text().trim() === host) {
          duplicate = true;
          return false;
        }
      });

      if (duplicate) {
        this.$additionalHostInput.parent().addClass('error');
        return;
      } // Add new row


      var $newRow = this.$additionalHostsDummy.clone();
      $newRow.removeClass('dummy');
      $newRow.find('td:first').text(host);
      $newRow.find('.delete-row-button').on('click', function (e) {
        e.preventDefault();
        $(e.target).closest('tr').remove();

        _this6.updateHostsTableView();

        Form.dataChanged();
        return false;
      });
      this.$additionalHostsDummy.before($newRow);
      this.$additionalHostInput.val('');
      this.$additionalHostInput.parent().removeClass('error');
      this.updateHostsTableView();
      Form.dataChanged();
    }
    /**
     * Update the visibility of hosts table
     */

  }, {
    key: "updateHostsTableView",
    value: function updateHostsTableView() {
      var hasHosts = $('#additional-hosts-table tbody tr:not(.dummy)').length > 0;

      if (hasHosts) {
        $('#additional-hosts-table').show();
      } else {
        $('#additional-hosts-table').hide();
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
      var _this7 = this;

      // Common fields
      if (data.id) $('#id').val(data.id);
      if (data.uniqid) $('#uniqid').val(data.uniqid);
      if (data.description) $('#description').val(data.description);
      if (data.note) $('#note').val(data.note); // Provider type specific fields

      if (this.providerType === 'SIP' && data.Sip) {
        var sipData = data.Sip;
        $('#username').val(sipData.username || '');
        $('#secret').val(sipData.secret || '');
        $('#host').val(sipData.host || '');
        $('#port').val(sipData.port || '5060');
        $('#registration_type').val(sipData.registration_type || 'outbound');
        $('#networkfilterid').val(sipData.networkfilterid || 'none');
        $('#dtmfmode').val(sipData.dtmfmode || 'auto');
        $('#transport').val(sipData.transport || 'UDP');
        $('#fromuser').val(sipData.fromuser || '');
        $('#fromdomain').val(sipData.fromdomain || '');
        $('#outbound_proxy').val(sipData.outbound_proxy || '');
        $('#manualattributes').val(sipData.manualattributes || ''); // Checkboxes

        if (sipData.qualify === '1') $('#qualify').prop('checked', true);
        if (sipData.disablefromuser === '1') $('#disablefromuser').prop('checked', true);
        if (sipData.receive_calls_without_auth === '1') $('#receive_calls_without_auth').prop('checked', true);
        if (sipData.noregister === '1') $('#noregister').prop('checked', true); // Qualify frequency

        $('#qualifyfreq').val(sipData.qualifyfreq || '60'); // Additional hosts

        if (data.additionalHosts && Array.isArray(data.additionalHosts)) {
          data.additionalHosts.forEach(function (host) {
            _this7.$additionalHostInput.val(host);

            _this7.cbOnCompleteHostAddress();
          });
        }
      } else if (this.providerType === 'IAX' && data.Iax) {
        var iaxData = data.Iax;
        $('#username').val(iaxData.username || '');
        $('#secret').val(iaxData.secret || '');
        $('#host').val(iaxData.host || '');
        $('#port').val(iaxData.port || '4569');
        $('#registration_type').val(iaxData.registration_type || 'outbound');
        $('#networkfilterid').val(iaxData.networkfilterid || 'none');
        $('#manualattributes').val(iaxData.manualattributes || ''); // Checkboxes

        if (iaxData.qualify === '1') $('#qualify').prop('checked', true);
        if (iaxData.receive_calls_without_auth === '1') $('#receive_calls_without_auth').prop('checked', true);
        if (iaxData.noregister === '1') $('#noregister').prop('checked', true);
      } // Disabled state


      if (data.disabled === '1' || data.disabled === true) {
        $('#disabled').val('1');
      }
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
  }]);

  return ProviderBase;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiJHNlY3JldCIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIiRjaGVja0JveGVzIiwiJGFjY29yZGlvbnMiLCIkZHJvcERvd25zIiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRhZGRpdGlvbmFsSG9zdElucHV0IiwiaG9zdFJvdyIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJwcm92aWRlcklkIiwidmFsIiwic2hvd0xvYWRpbmdTdGF0ZSIsIlByb3ZpZGVyc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwiaGlkZUxvYWRpbmdTdGF0ZSIsInJlc3VsdCIsImRhdGEiLCJwb3B1bGF0ZUZvcm1EYXRhIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsImluaXRpYWxpemVVSUNvbXBvbmVudHMiLCJpbml0aWFsaXplRXZlbnRIYW5kbGVycyIsImluaXRpYWxpemVGb3JtIiwidXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIiwicG9wdXAiLCJpbml0aWFsaXplQ2xpcGJvYXJkIiwib24iLCJhdHRyIiwiY2hlY2tib3giLCJkcm9wZG93biIsImFjY29yZGlvbiIsInVwZGF0ZUhvc3RzVGFibGVWaWV3IiwiaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93biIsImluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duIiwiaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duIiwiaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93biIsIiRmaWVsZCIsImxlbmd0aCIsIiRleGlzdGluZ0Ryb3Bkb3duIiwiY2xvc2VzdCIsImhhc0NsYXNzIiwiYWRkQ2xhc3MiLCJvbkNoYW5nZSIsInZhbHVlIiwiZmluZCIsInJlbW92ZUNsYXNzIiwicmVtb3ZlIiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwiZGF0YUNoYW5nZWQiLCJjdXJyZW50VmFsdWUiLCJpc0lBWCIsIm9wdGlvbnMiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZHJvcGRvd25IdG1sIiwibyIsIm1hcCIsIm9wdCIsImpvaW4iLCJyZXBsYWNlV2l0aCIsImF1dG8iLCJyZmM0NzMzIiwiaW5mbyIsImluYmFuZCIsImF1dG9faW5mbyIsIiRkcm9wZG93biIsImlzIiwiZ2V0Q3VycmVudE5ldHdvcmtGaWx0ZXJWYWx1ZSIsIk5ldHdvcmtGaWx0ZXJzQVBJIiwiaW5pdGlhbGl6ZURyb3Bkb3duIiwib25OZXR3b3JrRmlsdGVyQ2hhbmdlIiwic2Vzc2lvblN0b3JhZ2UiLCJzZXRJdGVtIiwic2F2ZWRWYWx1ZSIsImdldEl0ZW0iLCJzZWxmIiwia2V5cHJlc3MiLCJlIiwid2hpY2giLCJjYk9uQ29tcGxldGVIb3N0QWRkcmVzcyIsInByZXZlbnREZWZhdWx0IiwidGFyZ2V0IiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCIkaWNvbiIsImdlbmVyYXRlUGFzc3dvcmQiLCJjbGlwYm9hcmQiLCJDbGlwYm9hcmRKUyIsInRyaWdnZXIiLCJzZXRUaW1lb3V0IiwiY2xlYXJTZWxlY3Rpb24iLCJzaG93RXJyb3IiLCJwcl9FcnJvck9uUHJvdmlkZXJTYXZlIiwiUGJ4QXBpIiwiUGFzc3dvcmRHZW5lcmF0ZSIsInBhc3N3b3JkIiwic2hvdyIsImhpZGUiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImluaXRpYWxpemUiLCJzZXR0aW5ncyIsImZvcm0iLCJhZGRpdGlvbmFsSG9zdHMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJob3N0IiwidHJpbSIsInB1c2giLCJKU09OIiwic3RyaW5naWZ5Iiwic2F2ZU5ldHdvcmtGaWx0ZXJTdGF0ZSIsInRlc3QiLCJwYXJlbnQiLCJkdXBsaWNhdGUiLCIkbmV3Um93IiwiY2xvbmUiLCJiZWZvcmUiLCJoYXNIb3N0cyIsImlkIiwidW5pcWlkIiwiZGVzY3JpcHRpb24iLCJub3RlIiwiU2lwIiwic2lwRGF0YSIsInVzZXJuYW1lIiwic2VjcmV0IiwicG9ydCIsInJlZ2lzdHJhdGlvbl90eXBlIiwibmV0d29ya2ZpbHRlcmlkIiwiZHRtZm1vZGUiLCJ0cmFuc3BvcnQiLCJmcm9tdXNlciIsImZyb21kb21haW4iLCJvdXRib3VuZF9wcm94eSIsIm1hbnVhbGF0dHJpYnV0ZXMiLCJxdWFsaWZ5IiwicHJvcCIsImRpc2FibGVmcm9tdXNlciIsInJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIiwibm9yZWdpc3RlciIsInF1YWxpZnlmcmVxIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9yRWFjaCIsIklheCIsImlheERhdGEiLCJkaXNhYmxlZCIsInRvb2x0aXBEYXRhIiwiVG9vbHRpcEJ1aWxkZXIiLCJidWlsZENvbnRlbnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxZO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDSSx3QkFBWUMsWUFBWixFQUEwQjtBQUFBOztBQUN0QixTQUFLQSxZQUFMLEdBQW9CQSxZQUFwQjtBQUNBLFNBQUtDLFFBQUwsR0FBZ0JDLENBQUMsQ0FBQyxxQkFBRCxDQUFqQjtBQUNBLFNBQUtDLE9BQUwsR0FBZUQsQ0FBQyxDQUFDLFNBQUQsQ0FBaEI7QUFDQSxTQUFLRSxxQkFBTCxHQUE2QkYsQ0FBQyxDQUFDLGdDQUFELENBQTlCO0FBQ0EsU0FBS0csV0FBTCxHQUFtQkgsQ0FBQyxDQUFDLCtCQUFELENBQXBCO0FBQ0EsU0FBS0ksV0FBTCxHQUFtQkosQ0FBQyxDQUFDLG1DQUFELENBQXBCO0FBQ0EsU0FBS0ssVUFBTCxHQUFrQkwsQ0FBQyxDQUFDLGtDQUFELENBQW5CO0FBQ0EsU0FBS00s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QyxtQkFBRCxDQUFELENBQXVCWSxHQUF2QixDQUEyQjhJLE9BQU8sQ0FBQ1gsZ0JBQVIsSUFBNEIsRUFBdkQsRUFSZ0QsQ0FVaEQ7O0FBQ0EsWUFBSVcsT0FBTyxDQUFDVixPQUFSLEtBQW9CLEdBQXhCLEVBQTZCaEosQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjaUosSUFBZCxDQUFtQixTQUFuQixFQUE4QixJQUE5QjtBQUM3QixZQUFJUyxPQUFPLENBQUNQLDBCQUFSLEtBQXVDLEdBQTNDLEVBQWdEbkosQ0FBQyxDQUFDLDZCQUFELENBQUQsQ0FBaUNpSixJQUFqQyxDQUFzQyxTQUF0QyxFQUFpRCxJQUFqRDtBQUNoRCxZQUFJUyxPQUFPLENBQUNOLFVBQVIsS0FBdUIsR0FBM0IsRUFBZ0NwSixDQUFDLENBQUMsYUFBRCxDQUFELENBQWlCaUosSUFBakIsQ0FBc0IsU0FBdEIsRUFBaUMsSUFBakM7QUFDbkMsT0FyRGtCLENBdURuQjs7O0FBQ0EsVUFBSTlILElBQUksQ0FBQ3dJLFFBQUwsS0FBa0IsR0FBbEIsSUFBeUJ4SSxJQUFJLENBQUN3SSxRQUFMLEtBQWtCLElBQS9DLEVBQXFEO0FBQ2pEM0osUUFBQUEsQ0FBQyxDQUFDLFdBQUQsQ0FBRCxDQUFlWSxHQUFmLENBQW1CLEdBQW5CO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLDZCQUFvQmdKLFdBQXBCLEVBQWlDO0FBQzdCLGFBQU9DLGNBQWMsQ0FBQ0MsWUFBZixDQUE0QkYsV0FBNUIsQ0FBUDtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgTmV0d29ya0ZpbHRlcnNBUEksIFRvb2x0aXBCdWlsZGVyLCBpMThuLCBQcm92aWRlcnNBUEkgKi9cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1zXG4gKiBAY2xhc3MgUHJvdmlkZXJCYXNlXG4gKi9cbmNsYXNzIFByb3ZpZGVyQmFzZSB7IFxuICAgIC8qKiAgXG4gICAgICogQ29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXJUeXBlIC0gVHlwZSBvZiBwcm92aWRlciAoU0lQIG9yIElBWClcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihwcm92aWRlclR5cGUpIHtcbiAgICAgICAgdGhpcy5wcm92aWRlclR5cGUgPSBwcm92aWRlclR5cGU7XG4gICAgICAgIHRoaXMuJGZvcm1PYmogPSAkKCcjc2F2ZS1wcm92aWRlci1mb3JtJyk7XG4gICAgICAgIHRoaXMuJHNlY3JldCA9ICQoJyNzZWNyZXQnKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkgPSAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuZHVtbXknKTtcbiAgICAgICAgdGhpcy4kY2hlY2tCb3hlcyA9ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmNoZWNrYm94Jyk7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMgPSAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC51aS5hY2NvcmRpb24nKTtcbiAgICAgICAgdGhpcy4kZHJvcERvd25zID0gJCgnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuZHJvcGRvd24nKTtcbiAgICAgICAgdGhpcy4kZGVsZXRlUm93QnV0dG9uID0gJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmRlbGV0ZS1yb3ctYnV0dG9uJyk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQgPSAkKCcjYWRkaXRpb25hbC1ob3N0IGlucHV0Jyk7XG4gICAgICAgIHRoaXMuaG9zdFJvdyA9ICcjc2F2ZS1wcm92aWRlci1mb3JtIC5ob3N0LXJvdyc7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24gPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgJ14oKChcXFxcZHxbMS05XVxcXFxkfDFcXFxcZHsyfXwyWzAtNF1cXFxcZHwyNVswLTVdKVxcXFwuKXszfSdcbiAgICAgICAgICAgICsgJyhcXFxcZHxbMS05XVxcXFxkfDFcXFxcZHsyfXwyWzAtNF1cXFxcZHwyNVswLTVdKSdcbiAgICAgICAgICAgICsgJyhcXFxcLyhcXGR8WzEtMl1cXGR8M1swLTJdKSk/J1xuICAgICAgICAgICAgKyAnfFthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKD86XFxcXC5bYS16QS1aXXsyLH0pKykkJyxcbiAgICAgICAgICAgICdnbSdcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2V0IHByb3ZpZGVyIElEIGFuZCB0eXBlIGZyb20gZm9ybVxuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCgnI2lkJykudmFsKCkgfHwgJCgnI3VuaXFpZCcpLnZhbCgpIHx8ICcnO1xuICAgICAgICBjb25zdCBwcm92aWRlclR5cGUgPSB0aGlzLnByb3ZpZGVyVHlwZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICB0aGlzLnNob3dMb2FkaW5nU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgcHJvdmlkZXIgZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIFByb3ZpZGVyc0FQSS5nZXRSZWNvcmQocHJvdmlkZXJJZCwgcHJvdmlkZXJUeXBlLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRpbmdTdGF0ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUHJvdmlkZXIgZGF0YSBsb2FkaW5nIGZhaWxlZCBmb3IgZXhpc3RpbmcgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXJJZCAmJiBwcm92aWRlcklkICE9PSAnbmV3Jykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ29udGludWUgd2l0aCBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGFsbCB0b29sdGlwIHBvcHVwc1xuICAgICAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVDbGlwYm9hcmQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJldmVudCBicm93c2VyIHBhc3N3b3JkIG1hbmFnZXIgZm9yIGdlbmVyYXRlZCBwYXNzd29yZHNcbiAgICAgICAgICAgIHRoaXMuJHNlY3JldC5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ2F1dG9jb21wbGV0ZScsICduZXctcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICB0aGlzLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgICAgIHRoaXMuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuICAgICAgICB0aGlzLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGR5bmFtaWMgZHJvcGRvd25zXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpO1xuICAgICAgICBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCk7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bigpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGRyb3Bkb3duIGR5bmFtaWNhbGx5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygncmVnaXN0cmF0aW9uLXR5cGUtZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmFkZENsYXNzKCdyZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93bicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcudWkuZXJyb3IubWVzc2FnZScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy5wcm9tcHQnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICdvdXRib3VuZCc7XG4gICAgICAgIGNvbnN0IGlzSUFYID0gdGhpcy5wcm92aWRlclR5cGUgPT09ICdJQVgnO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgb3B0aW9ucyBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnb3V0Ym91bmQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGVbaXNJQVggPyAnaWF4X1JFR19UWVBFX09VVEJPVU5EJyA6ICdzaXBfUkVHX1RZUEVfT1VUQk9VTkQnXSB8fCAnT3V0Ym91bmQnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnaW5ib3VuZCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZVtpc0lBWCA/ICdpYXhfUkVHX1RZUEVfSU5CT1VORCcgOiAnc2lwX1JFR19UWVBFX0lOQk9VTkQnXSB8fCAnSW5ib3VuZCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdub25lJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlW2lzSUFYID8gJ2lheF9SRUdfVFlQRV9OT05FJyA6ICdzaXBfUkVHX1RZUEVfTk9ORSddIHx8ICdOb25lJyB9XG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gSFRNTFxuICAgICAgICBjb25zdCBkcm9wZG93bkh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VsZWN0aW9uIGRyb3Bkb3duIHJlZ2lzdHJhdGlvbi10eXBlLWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwicmVnaXN0cmF0aW9uX3R5cGVcIiBpZD1cInJlZ2lzdHJhdGlvbl90eXBlXCIgdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlZmF1bHQgdGV4dFwiPiR7b3B0aW9ucy5maW5kKG8gPT4gby52YWx1ZSA9PT0gY3VycmVudFZhbHVlKT8udGV4dCB8fCBjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtvcHRpb25zLm1hcChvcHQgPT4gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0LnZhbHVlfVwiPiR7b3B0LnRleHR9PC9kaXY+YCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcGxhY2UgdGhlIGZpZWxkXG4gICAgICAgICRmaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICAkKCcucmVnaXN0cmF0aW9uLXR5cGUtZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9yc1xuICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcudWkuZXJyb3IubWVzc2FnZScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnLnByb21wdCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEVE1GIG1vZGUgZHJvcGRvd24gZm9yIFNJUCBwcm92aWRlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI2R0bWZtb2RlJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygnZHRtZi1tb2RlLWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygnZHRtZi1tb2RlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnYXV0byc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJ2F1dG8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuYXV0byB8fCAnYXV0bycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdyZmM0NzMzJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnJmYzQ3MzMgfHwgJ3JmYzQ3MzMnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnaW5mbycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pbmZvIHx8ICdpbmZvJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2luYmFuZCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pbmJhbmQgfHwgJ2luYmFuZCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdhdXRvX2luZm8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuYXV0b19pbmZvIHx8ICdhdXRvX2luZm8nIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gZHRtZi1tb2RlLWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiZHRtZm1vZGVcIiBpZD1cImR0bWZtb2RlXCIgdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlZmF1bHQgdGV4dFwiPiR7b3B0aW9ucy5maW5kKG8gPT4gby52YWx1ZSA9PT0gY3VycmVudFZhbHVlKT8udGV4dCB8fCBjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtvcHRpb25zLm1hcChvcHQgPT4gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0LnZhbHVlfVwiPiR7b3B0LnRleHR9PC9kaXY+YCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRmaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgJCgnLmR0bWYtbW9kZS1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJhbnNwb3J0IHByb3RvY29sIGRyb3Bkb3duIGZvciBTSVAgcHJvdmlkZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKCcjdHJhbnNwb3J0Jyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygndHJhbnNwb3J0LWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygndHJhbnNwb3J0LWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnVURQJztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnVURQJywgdGV4dDogJ1VEUCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdUQ1AnLCB0ZXh0OiAnVENQJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ1RMUycsIHRleHQ6ICdUTFMnIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gdHJhbnNwb3J0LWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwidHJhbnNwb3J0XCIgaWQ9XCJ0cmFuc3BvcnRcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtvcHRpb25zLm1hcChvcHQgPT4gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0LnZhbHVlfVwiPiR7b3B0LnRleHR9PC9kaXY+YCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRmaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgJCgnLnRyYW5zcG9ydC1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbmV0d29yayBmaWx0ZXIgZHJvcGRvd25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKCcjbmV0d29ya2ZpbHRlcmlkJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgdGhlIGRyb3Bkb3duIGVsZW1lbnRcbiAgICAgICAgbGV0ICRkcm9wZG93biA9ICRmaWVsZDtcbiAgICAgICAgaWYgKCRmaWVsZC5pcygnc2VsZWN0JykpIHtcbiAgICAgICAgICAgICRkcm9wZG93biA9ICRmaWVsZC5oYXNDbGFzcygndWknKSA/ICRmaWVsZCA6ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duID0gJGZpZWxkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY3VycmVudCB2YWx1ZVxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSB0aGlzLmdldEN1cnJlbnROZXR3b3JrRmlsdGVyVmFsdWUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBOZXR3b3JrRmlsdGVyc0FQSSB0byBpbml0aWFsaXplIHRoZSBkcm9wZG93blxuICAgICAgICBOZXR3b3JrRmlsdGVyc0FQSS5pbml0aWFsaXplRHJvcGRvd24oJGRyb3Bkb3duLCB7XG4gICAgICAgICAgICBjdXJyZW50VmFsdWU6IGN1cnJlbnRWYWx1ZSxcbiAgICAgICAgICAgIHByb3ZpZGVyVHlwZTogdGhpcy5wcm92aWRlclR5cGUsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbk5ldHdvcmtGaWx0ZXJDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IG5ldHdvcmsgZmlsdGVyIHZhbHVlIGZyb20gdmFyaW91cyBzb3VyY2VzXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQ3VycmVudCBuZXR3b3JrIGZpbHRlciB2YWx1ZVxuICAgICAqL1xuICAgIGdldEN1cnJlbnROZXR3b3JrRmlsdGVyVmFsdWUoKSB7XG4gICAgICAgIC8vIFRyeSB0byBnZXQgdmFsdWUgZnJvbSBoaWRkZW4gaW5wdXRcbiAgICAgICAgbGV0IHZhbHVlID0gJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm90IGZvdW5kLCB0cnkgdG8gZ2V0IGZyb20gZm9ybSBkYXRhIG9yIFJFU1QgQVBJXG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIGVkaXRpbmcgZXhpc3RpbmcgcHJvdmlkZXJcbiAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmIChwcm92aWRlcklkKSB7XG4gICAgICAgICAgICAgICAgLy8gVmFsdWUgc2hvdWxkIGJlIGxvYWRlZCBmcm9tIHNlcnZlciB3aGVuIGVkaXRpbmdcbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICQoJyNuZXR3b3JrZmlsdGVyaWQnKS5hdHRyKCd2YWx1ZScpIHx8ICdub25lJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRGVmYXVsdCBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICAgICAgICAgIHZhbHVlID0gJ25vbmUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBuZXR3b3JrIGZpbHRlciBjaGFuZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBTZWxlY3RlZCBuZXR3b3JrIGZpbHRlciB2YWx1ZVxuICAgICAqL1xuICAgIG9uTmV0d29ya0ZpbHRlckNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHZhbHVlXG4gICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwodmFsdWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3NlcyBmb3Igc3BlY2lmaWMgYmVoYXZpb3JcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2F2ZSBjdXJyZW50IG5ldHdvcmsgZmlsdGVyIHZhbHVlIHRvIHJlc3RvcmUgbGF0ZXJcbiAgICAgKi9cbiAgICBzYXZlTmV0d29ya0ZpbHRlclN0YXRlKCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9ICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGAke3RoaXMucHJvdmlkZXJUeXBlfV9uZXR3b3JrZmlsdGVyX3ZhbHVlYCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlc3RvcmUgcHJldmlvdXNseSBzYXZlZCBuZXR3b3JrIGZpbHRlciB2YWx1ZVxuICAgICAqL1xuICAgIHJlc3RvcmVOZXR3b3JrRmlsdGVyU3RhdGUoKSB7XG4gICAgICAgIGNvbnN0IHNhdmVkVmFsdWUgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGAke3RoaXMucHJvdmlkZXJUeXBlfV9uZXR3b3JrZmlsdGVyX3ZhbHVlYCk7XG4gICAgICAgIGlmIChzYXZlZFZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjbmV0d29ya2ZpbHRlcmlkJykuY2xvc2VzdCgnLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNhdmVkVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBuZXcgc3RyaW5nIHRvIGFkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGFibGVcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC5rZXlwcmVzcygoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUud2hpY2ggPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgaG9zdCBmcm9tIGFkZGl0aW9uYWwtaG9zdHMtdGFibGVcbiAgICAgICAgdGhpcy4kZGVsZXRlUm93QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTaG93L2hpZGUgcGFzc3dvcmQgdG9nZ2xlXG4gICAgICAgICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJGJ1dHRvbi5maW5kKCdpJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLiRzZWNyZXQuYXR0cigndHlwZScpID09PSAncGFzc3dvcmQnKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBwYXNzd29yZFxuICAgICAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUnKS5hZGRDbGFzcygnZXllIHNsYXNoJyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kc2VjcmV0LmF0dHIoJ3R5cGUnLCAndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHBhc3N3b3JkXG4gICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V5ZSBzbGFzaCcpLmFkZENsYXNzKCdleWUnKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRzZWNyZXQuYXR0cigndHlwZScsICdwYXNzd29yZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBHZW5lcmF0ZSBuZXcgcGFzc3dvcmRcbiAgICAgICAgJCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVDbGlwYm9hcmQoKSB7XG4gICAgICAgIGNvbnN0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNsaXBib2FyZCcpO1xuICAgICAgICAkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICB9KTtcblxuICAgICAgICBjbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUucHJfRXJyb3JPblByb3ZpZGVyU2F2ZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGEgbmV3IHBhc3N3b3JkXG4gICAgICovXG4gICAgZ2VuZXJhdGVQYXNzd29yZCgpIHtcbiAgICAgICAgUGJ4QXBpLlBhc3N3b3JkR2VuZXJhdGUoMTYsIChwYXNzd29yZCkgPT4ge1xuICAgICAgICAgICAgaWYgKHBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kc2VjcmV0LnZhbChwYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gcHJvdmlkZXIgc2V0dGluZ3NcbiAgICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBPdmVycmlkZSBpbiBjaGlsZCBjbGFzc2VzXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgcGFzc3dvcmQgdG9vbHRpcCBpY29uIHdoZW4gaW4gJ25vbmUnIHJlZ2lzdHJhdGlvbiBtb2RlXG4gICAgICovXG4gICAgc2hvd1Bhc3N3b3JkVG9vbHRpcCgpIHtcbiAgICAgICAgJCgnLnBhc3N3b3JkLXRvb2x0aXAtaWNvbicpLnNob3coKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBwYXNzd29yZCB0b29sdGlwIGljb25cbiAgICAgKi9cbiAgICBoaWRlUGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICAkKCcucGFzc3dvcmQtdG9vbHRpcC1pY29uJykuaGlkZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICAvLyBPdmVycmlkZSBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCB2YWxpZGF0aW9uIGFuZCBjYWxsYmFja3NcbiAgICAgKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBvdmVycmlkZGVuIGluIHByb3ZpZGVyLW1vZGlmeS5qcyB0byBjb25maWd1cmUgUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIC8vIFVSTCBpcyBub3Qgc2V0IGhlcmUgLSBjaGlsZCBjbGFzc2VzIGNvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGhpcy5jYkJlZm9yZVNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGhpcy5jYkFmdGVyU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBNb2RpZmllZCBzZXR0aW5nc1xuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGFkZGl0aW9uYWwgaG9zdHMgdGFibGUgdG8gYXJyYXlcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbEhvc3RzID0gW107XG4gICAgICAgICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRib2R5IHRyOm5vdCguZHVtbXkpJykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaG9zdCA9ICQob2JqKS5maW5kKCd0ZDpmaXJzdCcpLnRleHQoKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxIb3N0cy5wdXNoKGhvc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhZGRpdGlvbmFsSG9zdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWRkaXRpb25hbEhvc3RzID0gSlNPTi5zdHJpbmdpZnkoYWRkaXRpb25hbEhvc3RzKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSBjdXJyZW50IG5ldHdvcmsgZmlsdGVyIHN0YXRlXG4gICAgICAgIHRoaXMuc2F2ZU5ldHdvcmtGaWx0ZXJTdGF0ZSgpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjb21wbGV0aW9uIG9mIGhvc3QgYWRkcmVzcyBpbnB1dFxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCkge1xuICAgICAgICBjb25zdCBob3N0ID0gdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC52YWwoKS50cmltKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGF0ZSB0aGUgaG9zdFxuICAgICAgICBpZiAoIWhvc3QgfHwgIXRoaXMuaG9zdElucHV0VmFsaWRhdGlvbi50ZXN0KGhvc3QpKSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgZHVwbGljYXRlc1xuICAgICAgICBsZXQgZHVwbGljYXRlID0gZmFsc2U7XG4gICAgICAgICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRib2R5IHRyOm5vdCguZHVtbXkpJykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgaWYgKCQob2JqKS5maW5kKCd0ZDpmaXJzdCcpLnRleHQoKS50cmltKCkgPT09IGhvc3QpIHtcbiAgICAgICAgICAgICAgICBkdXBsaWNhdGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbmV3IHJvd1xuICAgICAgICBjb25zdCAkbmV3Um93ID0gdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuY2xvbmUoKTtcbiAgICAgICAgJG5ld1Jvdy5yZW1vdmVDbGFzcygnZHVtbXknKTtcbiAgICAgICAgJG5ld1Jvdy5maW5kKCd0ZDpmaXJzdCcpLnRleHQoaG9zdCk7XG4gICAgICAgICRuZXdSb3cuZmluZCgnLmRlbGV0ZS1yb3ctYnV0dG9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuYmVmb3JlKCRuZXdSb3cpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnZhbCgnJyk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBob3N0cyB0YWJsZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RzVGFibGVWaWV3KCkge1xuICAgICAgICBjb25zdCBoYXNIb3N0cyA9ICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRib2R5IHRyOm5vdCguZHVtbXkpJykubGVuZ3RoID4gMDtcbiAgICAgICAgaWYgKGhhc0hvc3RzKSB7XG4gICAgICAgICAgICAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZScpLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlJykuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgbG9hZGluZyBzdGF0ZSBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBzaG93TG9hZGluZ1N0YXRlKCkge1xuICAgICAgICB0aGlzLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGluZyBzdGF0ZSBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBoaWRlTG9hZGluZ1N0YXRlKCkge1xuICAgICAgICB0aGlzLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIENvbW1vbiBmaWVsZHNcbiAgICAgICAgaWYgKGRhdGEuaWQpICQoJyNpZCcpLnZhbChkYXRhLmlkKTtcbiAgICAgICAgaWYgKGRhdGEudW5pcWlkKSAkKCcjdW5pcWlkJykudmFsKGRhdGEudW5pcWlkKTtcbiAgICAgICAgaWYgKGRhdGEuZGVzY3JpcHRpb24pICQoJyNkZXNjcmlwdGlvbicpLnZhbChkYXRhLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgaWYgKGRhdGEubm90ZSkgJCgnI25vdGUnKS52YWwoZGF0YS5ub3RlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFByb3ZpZGVyIHR5cGUgc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcgJiYgZGF0YS5TaXApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcERhdGEgPSBkYXRhLlNpcDtcbiAgICAgICAgICAgICQoJyN1c2VybmFtZScpLnZhbChzaXBEYXRhLnVzZXJuYW1lIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNzZWNyZXQnKS52YWwoc2lwRGF0YS5zZWNyZXQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2hvc3QnKS52YWwoc2lwRGF0YS5ob3N0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNwb3J0JykudmFsKHNpcERhdGEucG9ydCB8fCAnNTA2MCcpO1xuICAgICAgICAgICAgJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKHNpcERhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgJ291dGJvdW5kJyk7XG4gICAgICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKHNpcERhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJyk7XG4gICAgICAgICAgICAkKCcjZHRtZm1vZGUnKS52YWwoc2lwRGF0YS5kdG1mbW9kZSB8fCAnYXV0bycpO1xuICAgICAgICAgICAgJCgnI3RyYW5zcG9ydCcpLnZhbChzaXBEYXRhLnRyYW5zcG9ydCB8fCAnVURQJyk7XG4gICAgICAgICAgICAkKCcjZnJvbXVzZXInKS52YWwoc2lwRGF0YS5mcm9tdXNlciB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZnJvbWRvbWFpbicpLnZhbChzaXBEYXRhLmZyb21kb21haW4gfHwgJycpO1xuICAgICAgICAgICAgJCgnI291dGJvdW5kX3Byb3h5JykudmFsKHNpcERhdGEub3V0Ym91bmRfcHJveHkgfHwgJycpO1xuICAgICAgICAgICAgJCgnI21hbnVhbGF0dHJpYnV0ZXMnKS52YWwoc2lwRGF0YS5tYW51YWxhdHRyaWJ1dGVzIHx8ICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2tib3hlc1xuICAgICAgICAgICAgaWYgKHNpcERhdGEucXVhbGlmeSA9PT0gJzEnKSAkKCcjcXVhbGlmeScpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChzaXBEYXRhLmRpc2FibGVmcm9tdXNlciA9PT0gJzEnKSAkKCcjZGlzYWJsZWZyb211c2VyJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgaWYgKHNpcERhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggPT09ICcxJykgJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgaWYgKHNpcERhdGEubm9yZWdpc3RlciA9PT0gJzEnKSAkKCcjbm9yZWdpc3RlcicpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUXVhbGlmeSBmcmVxdWVuY3lcbiAgICAgICAgICAgICQoJyNxdWFsaWZ5ZnJlcScpLnZhbChzaXBEYXRhLnF1YWxpZnlmcmVxIHx8ICc2MCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGRpdGlvbmFsIGhvc3RzXG4gICAgICAgICAgICBpZiAoZGF0YS5hZGRpdGlvbmFsSG9zdHMgJiYgQXJyYXkuaXNBcnJheShkYXRhLmFkZGl0aW9uYWxIb3N0cykpIHtcbiAgICAgICAgICAgICAgICBkYXRhLmFkZGl0aW9uYWxIb3N0cy5mb3JFYWNoKChob3N0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKGhvc3QpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdJQVgnICYmIGRhdGEuSWF4KSB7XG4gICAgICAgICAgICBjb25zdCBpYXhEYXRhID0gZGF0YS5JYXg7XG4gICAgICAgICAgICAkKCcjdXNlcm5hbWUnKS52YWwoaWF4RGF0YS51c2VybmFtZSB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjc2VjcmV0JykudmFsKGlheERhdGEuc2VjcmV0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNob3N0JykudmFsKGlheERhdGEuaG9zdCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjcG9ydCcpLnZhbChpYXhEYXRhLnBvcnQgfHwgJzQ1NjknKTtcbiAgICAgICAgICAgICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbChpYXhEYXRhLnJlZ2lzdHJhdGlvbl90eXBlIHx8ICdvdXRib3VuZCcpO1xuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChpYXhEYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZScpO1xuICAgICAgICAgICAgJCgnI21hbnVhbGF0dHJpYnV0ZXMnKS52YWwoaWF4RGF0YS5tYW51YWxhdHRyaWJ1dGVzIHx8ICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2tib3hlc1xuICAgICAgICAgICAgaWYgKGlheERhdGEucXVhbGlmeSA9PT0gJzEnKSAkKCcjcXVhbGlmeScpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChpYXhEYXRhLnJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoID09PSAnMScpICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChpYXhEYXRhLm5vcmVnaXN0ZXIgPT09ICcxJykgJCgnI25vcmVnaXN0ZXInKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGVkIHN0YXRlXG4gICAgICAgIGlmIChkYXRhLmRpc2FibGVkID09PSAnMScgfHwgZGF0YS5kaXNhYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgJCgnI2Rpc2FibGVkJykudmFsKCcxJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBzIGZyb20gc3RydWN0dXJlZCBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gVG9vbHRpcCBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdG9vbHRpcFxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudCh0b29sdGlwRGF0YSkge1xuICAgICAgICByZXR1cm4gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICB9XG59Il19