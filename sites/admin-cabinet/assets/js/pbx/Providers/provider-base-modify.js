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
     */

  }, {
    key: "initializeForm",
    value: function initializeForm() {
      Form.$formObj = this.$formObj;
      Form.url = "".concat(globalRootUrl, "providers/save");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiJHNlY3JldCIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIiRjaGVja0JveGVzIiwiJGFjY29yZGlvbnMiLCIkZHJvcERvd25zIiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRhZGRpdGlvbmFsSG9zdElucHV0IiwiaG9zdFJvdyIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJwcm92aWRlcklkIiwidmFsIiwic2hvd0xvYWRpbmdTdGF0ZSIsIlByb3ZpZGVyc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwiaGlkZUxvYWRpbmdTdGF0ZSIsInJlc3VsdCIsImRhdGEiLCJwb3B1bGF0ZUZvcm1EYXRhIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsImluaXRpYWxpemVVSUNvbXBvbmVudHMiLCJpbml0aWFsaXplRXZlbnRIYW5kbGVycyIsImluaXRpYWxpemVGb3JtIiwidXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIiwicG9wdXAiLCJpbml0aWFsaXplQ2xpcGJvYXJkIiwib24iLCJhdHRyIiwiY2hlY2tib3giLCJkcm9wZG93biIsImFjY29yZGlvbiIsInVwZGF0ZUhvc3RzVGFibGVWaWV3IiwiaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93biIsImluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duIiwiaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duIiwiaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93biIsIiRmaWVsZCIsImxlbmd0aCIsIiRleGlzdGluZ0Ryb3Bkb3duIiwiY2xvc2VzdCIsImhhc0NsYXNzIiwiYWRkQ2xhc3MiLCJvbkNoYW5nZSIsInZhbHVlIiwiZmluZCIsInJlbW92ZUNsYXNzIiwicmVtb3ZlIiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwiZGF0YUNoYW5nZWQiLCJjdXJyZW50VmFsdWUiLCJpc0lBWCIsIm9wdGlvbnMiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZHJvcGRvd25IdG1sIiwibyIsIm1hcCIsIm9wdCIsImpvaW4iLCJyZXBsYWNlV2l0aCIsImF1dG8iLCJyZmM0NzMzIiwiaW5mbyIsImluYmFuZCIsImF1dG9faW5mbyIsIiRkcm9wZG93biIsImlzIiwiZ2V0Q3VycmVudE5ldHdvcmtGaWx0ZXJWYWx1ZSIsIk5ldHdvcmtGaWx0ZXJzQVBJIiwiaW5pdGlhbGl6ZURyb3Bkb3duIiwib25OZXR3b3JrRmlsdGVyQ2hhbmdlIiwic2Vzc2lvblN0b3JhZ2UiLCJzZXRJdGVtIiwic2F2ZWRWYWx1ZSIsImdldEl0ZW0iLCJzZWxmIiwia2V5cHJlc3MiLCJlIiwid2hpY2giLCJjYk9uQ29tcGxldGVIb3N0QWRkcmVzcyIsInByZXZlbnREZWZhdWx0IiwidGFyZ2V0IiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCIkaWNvbiIsImdlbmVyYXRlUGFzc3dvcmQiLCJjbGlwYm9hcmQiLCJDbGlwYm9hcmRKUyIsInRyaWdnZXIiLCJzZXRUaW1lb3V0IiwiY2xlYXJTZWxlY3Rpb24iLCJzaG93RXJyb3IiLCJwcl9FcnJvck9uUHJvdmlkZXJTYXZlIiwiUGJ4QXBpIiwiUGFzc3dvcmRHZW5lcmF0ZSIsInBhc3N3b3JkIiwic2hvdyIsImhpZGUiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImJpbmQiLCJjYkFmdGVyU2VuZEZvcm0iLCJpbml0aWFsaXplIiwic2V0dGluZ3MiLCJmb3JtIiwiYWRkaXRpb25hbEhvc3RzIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiaG9zdCIsInRyaW0iLCJwdXNoIiwiSlNPTiIsInN0cmluZ2lmeSIsInNhdmVOZXR3b3JrRmlsdGVyU3RhdGUiLCJ0ZXN0IiwicGFyZW50IiwiZHVwbGljYXRlIiwiJG5ld1JvdyIsImNsb25lIiwiYmVmb3JlIiwiaGFzSG9zdHMiLCJpZCIsInVuaXFpZCIsImRlc2NyaXB0aW9uIiwibm90ZSIsIlNpcCIsInNpcERhdGEiLCJ1c2VybmFtZSIsInNlY3JldCIsInBvcnQiLCJyZWdpc3RyYXRpb25fdHlwZSIsIm5ldHdvcmtmaWx0ZXJpZCIsImR0bWZtb2RlIiwidHJhbnNwb3J0IiwiZnJvbXVzZXIiLCJmcm9tZG9tYWluIiwib3V0Ym91bmRfcHJveHkiLCJtYW51YWxhdHRyaWJ1dGVzIiwicXVhbGlmeSIsInByb3AiLCJkaXNhYmxlZnJvbXVzZXIiLCJyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCIsIm5vcmVnaXN0ZXIiLCJxdWFsaWZ5ZnJlcSIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJJYXgiLCJpYXhEYXRhIiwiZGlzYWJsZWQiLCJ0b29sdGlwRGF0YSIsIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsWTtBQUNGO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksd0JBQVlDLFlBQVosRUFBMEI7QUFBQTs7QUFDdEIsU0FBS0EsWUFBTCxHQUFvQkEsWUFBcEI7QUFDQSxTQUFLQyxRQUFMLEdBQWdCQyxDQUFDLENBQUMscUJBQUQsQ0FBakI7QUFDQSxTQUFLQyxPQUFMLEdBQWVELENBQUMsQ0FBQyxTQUFELENBQWhCO0FBQ0EsU0FBS0UscUJBQUwsR0FBNkJGLENBQUMsQ0FBQyxnQ0FBRCxDQUE5QjtBQUNBLFNBQUtHLFdBQUwsR0FBbUJILENBQUMsQ0FBQywrQkFBRCxDQUFwQjtBQUNBLFNBQUtJLFdBQUwsR0FBbUJKLENBQUMsQ0FBQyxtQ0FBRCxDQUFwQjtBQUNBLFNBQUtLLFVBQUwsR0FBa0JMLENBQUMsQ0FBQyxr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TyxDQUFDakIsZUFBUixJQUEyQixNQUFyRDtBQUNBM0ksUUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJZLEdBQXZCLENBQTJCZ0osT0FBTyxDQUFDWCxnQkFBUixJQUE0QixFQUF2RCxFQVJnRCxDQVVoRDs7QUFDQSxZQUFJVyxPQUFPLENBQUNWLE9BQVIsS0FBb0IsR0FBeEIsRUFBNkJsSixDQUFDLENBQUMsVUFBRCxDQUFELENBQWNtSixJQUFkLENBQW1CLFNBQW5CLEVBQThCLElBQTlCO0FBQzdCLFlBQUlTLE9BQU8sQ0FBQ1AsMEJBQVIsS0FBdUMsR0FBM0MsRUFBZ0RySixDQUFDLENBQUMsNkJBQUQsQ0FBRCxDQUFpQ21KLElBQWpDLENBQXNDLFNBQXRDLEVBQWlELElBQWpEO0FBQ2hELFlBQUlTLE9BQU8sQ0FBQ04sVUFBUixLQUF1QixHQUEzQixFQUFnQ3RKLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJtSixJQUFqQixDQUFzQixTQUF0QixFQUFpQyxJQUFqQztBQUNuQyxPQXJEa0IsQ0F1RG5COzs7QUFDQSxVQUFJaEksSUFBSSxDQUFDMEksUUFBTCxLQUFrQixHQUFsQixJQUF5QjFJLElBQUksQ0FBQzBJLFFBQUwsS0FBa0IsSUFBL0MsRUFBcUQ7QUFDakQ3SixRQUFBQSxDQUFDLENBQUMsV0FBRCxDQUFELENBQWVZLEdBQWYsQ0FBbUIsR0FBbkI7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksNkJBQW9Ca0osV0FBcEIsRUFBaUM7QUFDN0IsYUFBT0MsY0FBYyxDQUFDQyxZQUFmLENBQTRCRixXQUE1QixDQUFQO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGksIENsaXBib2FyZEpTLCBOZXR3b3JrRmlsdGVyc0FQSSwgVG9vbHRpcEJ1aWxkZXIsIGkxOG4sIFByb3ZpZGVyc0FQSSAqL1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybXNcbiAqIEBjbGFzcyBQcm92aWRlckJhc2VcbiAqL1xuY2xhc3MgUHJvdmlkZXJCYXNlIHsgXG4gICAgLyoqICBcbiAgICAgKiBDb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlclR5cGUgLSBUeXBlIG9mIHByb3ZpZGVyIChTSVAgb3IgSUFYKVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHByb3ZpZGVyVHlwZSkge1xuICAgICAgICB0aGlzLnByb3ZpZGVyVHlwZSA9IHByb3ZpZGVyVHlwZTtcbiAgICAgICAgdGhpcy4kZm9ybU9iaiA9ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0nKTtcbiAgICAgICAgdGhpcy4kc2VjcmV0ID0gJCgnI3NlY3JldCcpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teSA9ICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5kdW1teScpO1xuICAgICAgICB0aGlzLiRjaGVja0JveGVzID0gJCgnI3NhdmUtcHJvdmlkZXItZm9ybSAuY2hlY2tib3gnKTtcbiAgICAgICAgdGhpcy4kYWNjb3JkaW9ucyA9ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmFjY29yZGlvbicpO1xuICAgICAgICB0aGlzLiRkcm9wRG93bnMgPSAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC51aS5kcm9wZG93bicpO1xuICAgICAgICB0aGlzLiRkZWxldGVSb3dCdXR0b24gPSAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuZGVsZXRlLXJvdy1idXR0b24nKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dCA9ICQoJyNhZGRpdGlvbmFsLWhvc3QgaW5wdXQnKTtcbiAgICAgICAgdGhpcy5ob3N0Um93ID0gJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmhvc3Qtcm93JztcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbiA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAnXigoKFxcXFxkfFsxLTldXFxcXGR8MVxcXFxkezJ9fDJbMC00XVxcXFxkfDI1WzAtNV0pXFxcXC4pezN9J1xuICAgICAgICAgICAgKyAnKFxcXFxkfFsxLTldXFxcXGR8MVxcXFxkezJ9fDJbMC00XVxcXFxkfDI1WzAtNV0pJ1xuICAgICAgICAgICAgKyAnKFxcXFwvKFxcZHxbMS0yXVxcZHwzWzAtMl0pKT8nXG4gICAgICAgICAgICArICd8W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0oPzpcXFxcLlthLXpBLVpdezIsfSkrKSQnLFxuICAgICAgICAgICAgJ2dtJ1xuICAgICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBHZXQgcHJvdmlkZXIgSUQgYW5kIHR5cGUgZnJvbSBmb3JtXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKSB8fCAkKCcjdW5pcWlkJykudmFsKCkgfHwgJyc7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyVHlwZSA9IHRoaXMucHJvdmlkZXJUeXBlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuc2hvd0xvYWRpbmdTdGF0ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBwcm92aWRlciBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgUHJvdmlkZXJzQVBJLmdldFJlY29yZChwcm92aWRlcklkLCBwcm92aWRlclR5cGUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUZvcm1EYXRhKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBkYXRhIGxvYWRpbmcgZmFpbGVkIGZvciBleGlzdGluZyBwcm92aWRlclxuICAgICAgICAgICAgICAgIGlmIChwcm92aWRlcklkICYmIHByb3ZpZGVySWQgIT09ICduZXcnKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDb250aW51ZSB3aXRoIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgYWxsIHRvb2x0aXAgcG9wdXBzXG4gICAgICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IGJyb3dzZXIgcGFzc3dvcmQgbWFuYWdlciBmb3IgZ2VuZXJhdGVkIHBhc3N3b3Jkc1xuICAgICAgICAgICAgdGhpcy4kc2VjcmV0Lm9uKCdmb2N1cycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQodGhpcykuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcbiAgICAgICAgdGhpcy4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHluYW1pYyBkcm9wZG93bnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duKCk7XG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKTtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbmV0d29yayBmaWx0ZXIgZHJvcGRvd25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVnaXN0cmF0aW9uIHR5cGUgZHJvcGRvd24gZHluYW1pY2FsbHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5zaWRlIGEgZHJvcGRvd24gc3RydWN0dXJlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBhIGRyb3Bkb3duLCBqdXN0IGVuc3VyZSBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISRleGlzdGluZ0Ryb3Bkb3duLmhhc0NsYXNzKCdyZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93bicpKSB7XG4gICAgICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uYWRkQ2xhc3MoJ3JlZ2lzdHJhdGlvbi10eXBlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9yc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy51aS5lcnJvci5tZXNzYWdlJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnLnByb21wdCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICAgICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkZmllbGQudmFsKCkgfHwgJ291dGJvdW5kJztcbiAgICAgICAgY29uc3QgaXNJQVggPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCc7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBvcHRpb25zIGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdvdXRib3VuZCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZVtpc0lBWCA/ICdpYXhfUkVHX1RZUEVfT1VUQk9VTkQnIDogJ3NpcF9SRUdfVFlQRV9PVVRCT1VORCddIHx8ICdPdXRib3VuZCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdpbmJvdW5kJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlW2lzSUFYID8gJ2lheF9SRUdfVFlQRV9JTkJPVU5EJyA6ICdzaXBfUkVHX1RZUEVfSU5CT1VORCddIHx8ICdJbmJvdW5kJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ25vbmUnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGVbaXNJQVggPyAnaWF4X1JFR19UWVBFX05PTkUnIDogJ3NpcF9SRUdfVFlQRV9OT05FJ10gfHwgJ05vbmUnIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBIVE1MXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gcmVnaXN0cmF0aW9uLXR5cGUtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJyZWdpc3RyYXRpb25fdHlwZVwiIGlkPVwicmVnaXN0cmF0aW9uX3R5cGVcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtvcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSBjdXJyZW50VmFsdWUpPy50ZXh0IHx8IGN1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAke29wdGlvbnMubWFwKG9wdCA9PiBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+JHtvcHQudGV4dH08L2Rpdj5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgZmllbGRcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICAgICQoJy5yZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZXJyb3JzXG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy51aS5lcnJvci5tZXNzYWdlJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcucHJvbXB0JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERUTUYgbW9kZSBkcm9wZG93biBmb3IgU0lQIHByb3ZpZGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKCcjZHRtZm1vZGUnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5zaWRlIGEgZHJvcGRvd24gc3RydWN0dXJlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBhIGRyb3Bkb3duLCBqdXN0IGVuc3VyZSBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISRleGlzdGluZ0Ryb3Bkb3duLmhhc0NsYXNzKCdkdG1mLW1vZGUtZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmFkZENsYXNzKCdkdG1mLW1vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICdhdXRvJztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnYXV0bycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5hdXRvIHx8ICdhdXRvJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ3JmYzQ3MzMnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucmZjNDczMyB8fCAncmZjNDczMycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdpbmZvJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmluZm8gfHwgJ2luZm8nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnaW5iYW5kJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmluYmFuZCB8fCAnaW5iYW5kJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2F1dG9faW5mbycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5hdXRvX2luZm8gfHwgJ2F1dG9faW5mbycgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZHJvcGRvd25IdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93biBkdG1mLW1vZGUtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkdG1mbW9kZVwiIGlkPVwiZHRtZm1vZGVcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtvcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSBjdXJyZW50VmFsdWUpPy50ZXh0IHx8IGN1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAke29wdGlvbnMubWFwKG9wdCA9PiBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+JHtvcHQudGV4dH08L2Rpdj5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAkKCcuZHRtZi1tb2RlLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0cmFuc3BvcnQgcHJvdG9jb2wgZHJvcGRvd24gZm9yIFNJUCBwcm92aWRlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoJyN0cmFuc3BvcnQnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5zaWRlIGEgZHJvcGRvd24gc3RydWN0dXJlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBhIGRyb3Bkb3duLCBqdXN0IGVuc3VyZSBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISRleGlzdGluZ0Ryb3Bkb3duLmhhc0NsYXNzKCd0cmFuc3BvcnQtZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmFkZENsYXNzKCd0cmFuc3BvcnQtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICdVRFAnO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdVRFAnLCB0ZXh0OiAnVURQJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ1RDUCcsIHRleHQ6ICdUQ1AnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnVExTJywgdGV4dDogJ1RMUycgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZHJvcGRvd25IdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93biB0cmFuc3BvcnQtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJ0cmFuc3BvcnRcIiBpZD1cInRyYW5zcG9ydFwiIHZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke2N1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAke29wdGlvbnMubWFwKG9wdCA9PiBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+JHtvcHQudGV4dH08L2Rpdj5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAkKCcudHJhbnNwb3J0LWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93blxuICAgICAqL1xuICAgIGluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoJyNuZXR3b3JrZmlsdGVyaWQnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB0aGUgZHJvcGRvd24gZWxlbWVudFxuICAgICAgICBsZXQgJGRyb3Bkb3duID0gJGZpZWxkO1xuICAgICAgICBpZiAoJGZpZWxkLmlzKCdzZWxlY3QnKSkge1xuICAgICAgICAgICAgJGRyb3Bkb3duID0gJGZpZWxkLmhhc0NsYXNzKCd1aScpID8gJGZpZWxkIDogJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24gPSAkZmllbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IHRoaXMuZ2V0Q3VycmVudE5ldHdvcmtGaWx0ZXJWYWx1ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIE5ldHdvcmtGaWx0ZXJzQVBJIHRvIGluaXRpYWxpemUgdGhlIGRyb3Bkb3duXG4gICAgICAgIE5ldHdvcmtGaWx0ZXJzQVBJLmluaXRpYWxpemVEcm9wZG93bigkZHJvcGRvd24sIHtcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZTogY3VycmVudFZhbHVlLFxuICAgICAgICAgICAgcHJvdmlkZXJUeXBlOiB0aGlzLnByb3ZpZGVyVHlwZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uTmV0d29ya0ZpbHRlckNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgbmV0d29yayBmaWx0ZXIgdmFsdWUgZnJvbSB2YXJpb3VzIHNvdXJjZXNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDdXJyZW50IG5ldHdvcmsgZmlsdGVyIHZhbHVlXG4gICAgICovXG4gICAgZ2V0Q3VycmVudE5ldHdvcmtGaWx0ZXJWYWx1ZSgpIHtcbiAgICAgICAgLy8gVHJ5IHRvIGdldCB2YWx1ZSBmcm9tIGhpZGRlbiBpbnB1dFxuICAgICAgICBsZXQgdmFsdWUgPSAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBub3QgZm91bmQsIHRyeSB0byBnZXQgZnJvbSBmb3JtIGRhdGEgb3IgUkVTVCBBUElcbiAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgZWRpdGluZyBleGlzdGluZyBwcm92aWRlclxuICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKHByb3ZpZGVySWQpIHtcbiAgICAgICAgICAgICAgICAvLyBWYWx1ZSBzaG91bGQgYmUgbG9hZGVkIGZyb20gc2VydmVyIHdoZW4gZWRpdGluZ1xuICAgICAgICAgICAgICAgIHZhbHVlID0gJCgnI25ldHdvcmtmaWx0ZXJpZCcpLmF0dHIoJ3ZhbHVlJykgfHwgJ25vbmUnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBEZWZhdWx0IGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgdmFsdWUgPSAnbm9uZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIG5ldHdvcmsgZmlsdGVyIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIG5ldHdvcmsgZmlsdGVyIHZhbHVlXG4gICAgICovXG4gICAgb25OZXR3b3JrRmlsdGVyQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgdmFsdWVcbiAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbCh2YWx1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzIGZvciBzcGVjaWZpYyBiZWhhdmlvclxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIGN1cnJlbnQgbmV0d29yayBmaWx0ZXIgdmFsdWUgdG8gcmVzdG9yZSBsYXRlclxuICAgICAqL1xuICAgIHNhdmVOZXR3b3JrRmlsdGVyU3RhdGUoKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbCgpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYCR7dGhpcy5wcm92aWRlclR5cGV9X25ldHdvcmtmaWx0ZXJfdmFsdWVgLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUmVzdG9yZSBwcmV2aW91c2x5IHNhdmVkIG5ldHdvcmsgZmlsdGVyIHZhbHVlXG4gICAgICovXG4gICAgcmVzdG9yZU5ldHdvcmtGaWx0ZXJTdGF0ZSgpIHtcbiAgICAgICAgY29uc3Qgc2F2ZWRWYWx1ZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYCR7dGhpcy5wcm92aWRlclR5cGV9X25ldHdvcmtmaWx0ZXJfdmFsdWVgKTtcbiAgICAgICAgaWYgKHNhdmVkVmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNuZXR3b3JrZmlsdGVyaWQnKS5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2F2ZWRWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyBzdHJpbmcgdG8gYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0YWJsZVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LmtleXByZXNzKChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBob3N0IGZyb20gYWRkaXRpb25hbC1ob3N0cy10YWJsZVxuICAgICAgICB0aGlzLiRkZWxldGVSb3dCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNob3cvaGlkZSBwYXNzd29yZCB0b2dnbGVcbiAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkYnV0dG9uLmZpbmQoJ2knKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuJHNlY3JldC5hdHRyKCd0eXBlJykgPT09ICdwYXNzd29yZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHBhc3N3b3JkXG4gICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V5ZScpLmFkZENsYXNzKCdleWUgc2xhc2gnKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRzZWNyZXQuYXR0cigndHlwZScsICd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgcGFzc3dvcmRcbiAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllIHNsYXNoJykuYWRkQ2xhc3MoJ2V5ZScpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHNlY3JldC5hdHRyKCd0eXBlJywgJ3Bhc3N3b3JkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIG5ldyBwYXNzd29yZFxuICAgICAgICAkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNsaXBib2FyZCgpIHtcbiAgICAgICAgY29uc3QgY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY2xpcGJvYXJkJyk7XG4gICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNsaXBib2FyZC5vbignZXJyb3InLCAoZSkgPT4ge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5wcl9FcnJvck9uUHJvdmlkZXJTYXZlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuZXcgcGFzc3dvcmRcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVBhc3N3b3JkKCkge1xuICAgICAgICBQYnhBcGkuUGFzc3dvcmRHZW5lcmF0ZSgxNiwgKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICBpZiAocGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRzZWNyZXQudmFsKHBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRzZWNyZXQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgcGFzc3dvcmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIC8vIE92ZXJyaWRlIGluIGNoaWxkIGNsYXNzZXNcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBwYXNzd29yZCB0b29sdGlwIGljb24gd2hlbiBpbiAnbm9uZScgcmVnaXN0cmF0aW9uIG1vZGVcbiAgICAgKi9cbiAgICBzaG93UGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICAkKCcucGFzc3dvcmQtdG9vbHRpcC1pY29uJykuc2hvdygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHBhc3N3b3JkIHRvb2x0aXAgaWNvblxuICAgICAqL1xuICAgIGhpZGVQYXNzd29yZFRvb2x0aXAoKSB7XG4gICAgICAgICQoJy5wYXNzd29yZC10b29sdGlwLWljb24nKS5oaWRlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcHJvdmlkZXIgc2V0dGluZ3NcbiAgICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIC8vIE92ZXJyaWRlIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIHZhbGlkYXRpb24gYW5kIGNhbGxiYWNrc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9zYXZlYDtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge29iamVjdH0gTW9kaWZpZWQgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBhZGRpdGlvbmFsIGhvc3RzIHRhYmxlIHRvIGFycmF5XG4gICAgICAgIGNvbnN0IGFkZGl0aW9uYWxIb3N0cyA9IFtdO1xuICAgICAgICAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0Ym9keSB0cjpub3QoLmR1bW15KScpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGhvc3QgPSAkKG9iaikuZmluZCgndGQ6Zmlyc3QnKS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsSG9zdHMucHVzaChob3N0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWRkaXRpb25hbEhvc3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFkZGl0aW9uYWxIb3N0cyA9IEpTT04uc3RyaW5naWZ5KGFkZGl0aW9uYWxIb3N0cyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgY3VycmVudCBuZXR3b3JrIGZpbHRlciBzdGF0ZVxuICAgICAgICB0aGlzLnNhdmVOZXR3b3JrRmlsdGVyU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIENhbiBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY29tcGxldGlvbiBvZiBob3N0IGFkZHJlc3MgaW5wdXRcbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpIHtcbiAgICAgICAgY29uc3QgaG9zdCA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCkudHJpbSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGhvc3RcbiAgICAgICAgaWYgKCFob3N0IHx8ICF0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24udGVzdChob3N0KSkge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGR1cGxpY2F0ZXNcbiAgICAgICAgbGV0IGR1cGxpY2F0ZSA9IGZhbHNlO1xuICAgICAgICAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0Ym9keSB0cjpub3QoLmR1bW15KScpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGlmICgkKG9iaikuZmluZCgndGQ6Zmlyc3QnKS50ZXh0KCkudHJpbSgpID09PSBob3N0KSB7XG4gICAgICAgICAgICAgICAgZHVwbGljYXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGR1cGxpY2F0ZSkge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyByb3dcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15LmNsb25lKCk7XG4gICAgICAgICRuZXdSb3cucmVtb3ZlQ2xhc3MoJ2R1bW15Jyk7XG4gICAgICAgICRuZXdSb3cuZmluZCgndGQ6Zmlyc3QnKS50ZXh0KGhvc3QpO1xuICAgICAgICAkbmV3Um93LmZpbmQoJy5kZWxldGUtcm93LWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15LmJlZm9yZSgkbmV3Um93KTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC52YWwoJycpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgaG9zdHMgdGFibGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0c1RhYmxlVmlldygpIHtcbiAgICAgICAgY29uc3QgaGFzSG9zdHMgPSAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0Ym9keSB0cjpub3QoLmR1bW15KScpLmxlbmd0aCA+IDA7XG4gICAgICAgIGlmIChoYXNIb3N0cykge1xuICAgICAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUnKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZScpLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGUgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgc2hvd0xvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgdGhpcy4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGxvYWRpbmcgc3RhdGUgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgaGlkZUxvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgdGhpcy4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICAvLyBDb21tb24gZmllbGRzXG4gICAgICAgIGlmIChkYXRhLmlkKSAkKCcjaWQnKS52YWwoZGF0YS5pZCk7XG4gICAgICAgIGlmIChkYXRhLnVuaXFpZCkgJCgnI3VuaXFpZCcpLnZhbChkYXRhLnVuaXFpZCk7XG4gICAgICAgIGlmIChkYXRhLmRlc2NyaXB0aW9uKSAkKCcjZGVzY3JpcHRpb24nKS52YWwoZGF0YS5kZXNjcmlwdGlvbik7XG4gICAgICAgIGlmIChkYXRhLm5vdGUpICQoJyNub3RlJykudmFsKGRhdGEubm90ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm92aWRlciB0eXBlIHNwZWNpZmljIGZpZWxkc1xuICAgICAgICBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdTSVAnICYmIGRhdGEuU2lwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBEYXRhID0gZGF0YS5TaXA7XG4gICAgICAgICAgICAkKCcjdXNlcm5hbWUnKS52YWwoc2lwRGF0YS51c2VybmFtZSB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjc2VjcmV0JykudmFsKHNpcERhdGEuc2VjcmV0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNob3N0JykudmFsKHNpcERhdGEuaG9zdCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjcG9ydCcpLnZhbChzaXBEYXRhLnBvcnQgfHwgJzUwNjAnKTtcbiAgICAgICAgICAgICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbChzaXBEYXRhLnJlZ2lzdHJhdGlvbl90eXBlIHx8ICdvdXRib3VuZCcpO1xuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChzaXBEYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZScpO1xuICAgICAgICAgICAgJCgnI2R0bWZtb2RlJykudmFsKHNpcERhdGEuZHRtZm1vZGUgfHwgJ2F1dG8nKTtcbiAgICAgICAgICAgICQoJyN0cmFuc3BvcnQnKS52YWwoc2lwRGF0YS50cmFuc3BvcnQgfHwgJ1VEUCcpO1xuICAgICAgICAgICAgJCgnI2Zyb211c2VyJykudmFsKHNpcERhdGEuZnJvbXVzZXIgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2Zyb21kb21haW4nKS52YWwoc2lwRGF0YS5mcm9tZG9tYWluIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNvdXRib3VuZF9wcm94eScpLnZhbChzaXBEYXRhLm91dGJvdW5kX3Byb3h5IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNtYW51YWxhdHRyaWJ1dGVzJykudmFsKHNpcERhdGEubWFudWFsYXR0cmlidXRlcyB8fCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrYm94ZXNcbiAgICAgICAgICAgIGlmIChzaXBEYXRhLnF1YWxpZnkgPT09ICcxJykgJCgnI3F1YWxpZnknKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAoc2lwRGF0YS5kaXNhYmxlZnJvbXVzZXIgPT09ICcxJykgJCgnI2Rpc2FibGVmcm9tdXNlcicpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChzaXBEYXRhLnJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoID09PSAnMScpICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChzaXBEYXRhLm5vcmVnaXN0ZXIgPT09ICcxJykgJCgnI25vcmVnaXN0ZXInKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFF1YWxpZnkgZnJlcXVlbmN5XG4gICAgICAgICAgICAkKCcjcXVhbGlmeWZyZXEnKS52YWwoc2lwRGF0YS5xdWFsaWZ5ZnJlcSB8fCAnNjAnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkaXRpb25hbCBob3N0c1xuICAgICAgICAgICAgaWYgKGRhdGEuYWRkaXRpb25hbEhvc3RzICYmIEFycmF5LmlzQXJyYXkoZGF0YS5hZGRpdGlvbmFsSG9zdHMpKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5hZGRpdGlvbmFsSG9zdHMuZm9yRWFjaCgoaG9zdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnZhbChob3N0KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMucHJvdmlkZXJUeXBlID09PSAnSUFYJyAmJiBkYXRhLklheCkge1xuICAgICAgICAgICAgY29uc3QgaWF4RGF0YSA9IGRhdGEuSWF4O1xuICAgICAgICAgICAgJCgnI3VzZXJuYW1lJykudmFsKGlheERhdGEudXNlcm5hbWUgfHwgJycpO1xuICAgICAgICAgICAgJCgnI3NlY3JldCcpLnZhbChpYXhEYXRhLnNlY3JldCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjaG9zdCcpLnZhbChpYXhEYXRhLmhvc3QgfHwgJycpO1xuICAgICAgICAgICAgJCgnI3BvcnQnKS52YWwoaWF4RGF0YS5wb3J0IHx8ICc0NTY5Jyk7XG4gICAgICAgICAgICAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoaWF4RGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCAnb3V0Ym91bmQnKTtcbiAgICAgICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoaWF4RGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJ25vbmUnKTtcbiAgICAgICAgICAgICQoJyNtYW51YWxhdHRyaWJ1dGVzJykudmFsKGlheERhdGEubWFudWFsYXR0cmlidXRlcyB8fCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrYm94ZXNcbiAgICAgICAgICAgIGlmIChpYXhEYXRhLnF1YWxpZnkgPT09ICcxJykgJCgnI3F1YWxpZnknKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAoaWF4RGF0YS5yZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCA9PT0gJzEnKSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAoaWF4RGF0YS5ub3JlZ2lzdGVyID09PSAnMScpICQoJyNub3JlZ2lzdGVyJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlZCBzdGF0ZVxuICAgICAgICBpZiAoZGF0YS5kaXNhYmxlZCA9PT0gJzEnIHx8IGRhdGEuZGlzYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICQoJyNkaXNhYmxlZCcpLnZhbCgnMScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwcyBmcm9tIHN0cnVjdHVyZWQgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b29sdGlwRGF0YSAtIFRvb2x0aXAgZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQodG9vbHRpcERhdGEpIHtcbiAgICAgICAgcmV0dXJuIFRvb2x0aXBCdWlsZGVyLmJ1aWxkQ29udGVudCh0b29sdGlwRGF0YSk7XG4gICAgfVxufSJdfQ==