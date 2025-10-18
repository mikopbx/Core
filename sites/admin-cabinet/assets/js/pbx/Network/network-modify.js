"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

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

/* global globalRootUrl,globalTranslate, Form, SysinfoAPI, NetworkAPI, UserMessage, DynamicDropdownBuilder */

/**
 * Object for managing network settings
 *
 * @module networks
 */
var networks = {
  $getMyIpButton: $('#getmyip'),

  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#network-form'),
  $dropDowns: $('#network-form .dropdown'),
  $extipaddr: $('#extipaddr'),
  $ipaddressInput: $('.ipaddress'),
  vlansArray: {},

  /**
   * jQuery object for the elements with we should hide from the form for docker installation.
   * @type {jQuery}
   */
  $notShowOnDockerDivs: $('.do-not-show-if-docker'),

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    extipaddr: {
      optional: true,
      rules: [{
        type: 'ipaddrWithPortOptional',
        prompt: globalTranslate.nw_ValidateExtIppaddrNotRight
      }, {
        type: 'extenalIpHost',
        prompt: globalTranslate.nw_ValidateExtIppaddrOrHostIsEmpty
      }]
    },
    exthostname: {
      depends: 'usenat',
      rules: [{
        type: 'extenalIpHost',
        prompt: globalTranslate.nw_ValidateExtIppaddrOrHostIsEmpty
      }, {
        type: 'validHostname',
        prompt: globalTranslate.nw_ValidateHostnameInvalid
      }]
    }
  },

  /**
   * Initializes the network settings form.
   */
  initialize: function initialize() {
    // Load configuration via REST API
    networks.loadConfiguration(); // Handles the change event of the 'usenat-checkbox'.

    $('#usenat-checkbox').checkbox({
      onChange: function onChange() {
        networks.toggleDisabledFieldClass();
      }
    });
    networks.$dropDowns.dropdown(); // DHCP checkbox handlers will be bound after tabs are created dynamically

    networks.$getMyIpButton.on('click', function (e) {
      e.preventDefault();
      networks.$getMyIpButton.addClass('loading disabled');
      SysinfoAPI.getExternalIpInfo(networks.cbAfterGetExternalIp);
    }); // Delete button handler will be bound after tabs are created dynamically

    networks.$ipaddressInput.inputmask({
      alias: 'ip',
      'placeholder': '_'
    });
    networks.initializeForm(); // Initialize static routes manager

    StaticRoutesManager.initialize(); // Hide form elements connected with non docker installations

    if (networks.$formObj.form('get value', 'is-docker') === "1") {
      networks.$notShowOnDockerDivs.hide();
    }
  },

  /**
   * Callback function executed after getting the external IP from a remote server.
   * @param {boolean|Object} response - The response received from the server. If false, indicates an error occurred.
   */
  cbAfterGetExternalIp: function cbAfterGetExternalIp(response) {
    if (response === false) {
      networks.$getMyIpButton.removeClass('loading disabled');
    } else {
      var currentExtIpAddr = networks.$formObj.form('get value', 'extipaddr');
      var portMatch = currentExtIpAddr.match(/:(\d+)$/);
      var port = portMatch ? ':' + portMatch[1] : '';
      var newExtIpAddr = response.ip + port;
      networks.$formObj.form('set value', 'extipaddr', newExtIpAddr); // Clear external hostname when getting external IP

      networks.$formObj.form('set value', 'exthostname', '');
      networks.$extipaddr.trigger('change');
      networks.$getMyIpButton.removeClass('loading disabled');
    }
  },

  /**
   * Update NAT help text with actual port values from REST API
   * @param {object} ports - Port configuration object from API
   */
  updateNATHelpText: function updateNATHelpText(ports) {
    // WHY: Port keys match PbxSettings constants (SIPPort, TLS_PORT, RTPPortFrom, RTPPortTo)
    // Only update if we have port values from server
    if (!ports.SIPPort || !ports.TLS_PORT || !ports.RTPPortFrom || !ports.RTPPortTo) {
      return;
    } // Update SIP ports text using ID


    var $sipPortValues = $('#nat-help-sip-ports .port-values');

    if ($sipPortValues.length > 0) {
      var sipText = i18n('nw_NATInfo3', {
        'SIP_PORT': ports.SIPPort,
        'TLS_PORT': ports.TLS_PORT
      });
      $sipPortValues.html(sipText);
    } // Update RTP ports text using ID


    var $rtpPortValues = $('#nat-help-rtp-ports .port-values');

    if ($rtpPortValues.length > 0) {
      var rtpText = i18n('nw_NATInfo4', {
        'RTP_PORT_FROM': ports.RTPPortFrom,
        'RTP_PORT_TO': ports.RTPPortTo
      });
      $rtpPortValues.html(rtpText);
    }
  },

  /**
   * Update port field labels with actual internal port values from REST API
   * @param {object} ports - Port configuration object from API
   */
  updatePortLabels: function updatePortLabels(ports) {
    // WHY: Port keys match PbxSettings constants (SIPPort, TLS_PORT)
    // Only update if we have port values from server
    if (!ports.SIPPort || !ports.TLS_PORT) {
      return;
    } // Update external SIP port label using ID


    var $sipLabel = $('#external-sip-port-label');

    if ($sipLabel.length > 0) {
      var sipLabelText = i18n('nw_PublicSIPPort', {
        'SIP_PORT': ports.SIPPort
      });
      $sipLabel.text(sipLabelText);
    } // Update external TLS port label using ID


    var $tlsLabel = $('#external-tls-port-label');

    if ($tlsLabel.length > 0) {
      var tlsLabelText = i18n('nw_PublicTLSPort', {
        'TLS_PORT': ports.TLS_PORT
      });
      $tlsLabel.text(tlsLabelText);
    }
  },

  /**
   * Toggles the 'disabled' class for specific fields based on their checkbox state.
   */
  toggleDisabledFieldClass: function toggleDisabledFieldClass() {
    $('#eth-interfaces-menu a').each(function (index, obj) {
      var eth = $(obj).attr('data-tab');
      var $dhcpCheckbox = $("#dhcp-".concat(eth, "-checkbox"));
      var isDhcpEnabled = $dhcpCheckbox.checkbox('is checked'); // Find IP address and subnet fields

      var $ipField = $("input[name=\"ipaddr_".concat(eth, "\"]")); // DynamicDropdownBuilder creates dropdown with id pattern: fieldName-dropdown

      var $subnetDropdown = $("#subnet_".concat(eth, "-dropdown"));

      if (isDhcpEnabled) {
        // DHCP enabled -> make IP/subnet read-only and add disabled class
        $ipField.prop('readonly', true);
        $ipField.closest('.field').addClass('disabled');
        $subnetDropdown.addClass('disabled');
        $("#not-dhcp-".concat(eth)).val('');
      } else {
        // DHCP disabled -> make IP/subnet editable
        $ipField.prop('readonly', false);
        $ipField.closest('.field').removeClass('disabled');
        $subnetDropdown.removeClass('disabled');
        $("#not-dhcp-".concat(eth)).val('1');
      }

      networks.addNewFormRules(eth);
    });

    if ($('#usenat-checkbox').checkbox('is checked')) {
      $('.nated-settings-group').removeClass('disabled');
    } else {
      $('.nated-settings-group').addClass('disabled');
    }
  },

  /**
   * Adds new form validation rules for a specific row in the network configuration form.
   * @param {string} newRowId - The ID of the new row to add the form rules for.
   */
  addNewFormRules: function addNewFormRules(newRowId) {
    // Define the class for the 'name' field in the new row
    var nameClass = "name_".concat(newRowId); // Define the form validation rules for the 'name' field

    networks.validateRules[nameClass] = {
      identifier: nameClass,
      depends: "interface_".concat(newRowId),
      rules: [{
        type: 'empty',
        prompt: globalTranslate.nw_ValidateNameIsNotBeEmpty
      }]
    }; // Define the class for the 'vlanid' field in the new row

    var vlanClass = "vlanid_".concat(newRowId); // Define the form validation rules for the 'vlanid' field

    networks.validateRules[vlanClass] = {
      depends: "interface_".concat(newRowId),
      identifier: vlanClass,
      rules: [{
        type: 'integer[0..4095]',
        prompt: globalTranslate.nw_ValidateVlanRange
      }, {
        type: "checkVlan[".concat(newRowId, "]"),
        prompt: globalTranslate.nw_ValidateVlanCross
      }]
    }; // Define the class for the 'ipaddr' field in the new row

    var ipaddrClass = "ipaddr_".concat(newRowId); // Define the form validation rules for the 'ipaddr' field
    // For template interface (id=0), add dependency on interface selection

    if (newRowId === 0 || newRowId === '0') {
      networks.validateRules[ipaddrClass] = {
        identifier: ipaddrClass,
        depends: "interface_".concat(newRowId),
        // Template: validate only if interface is selected
        rules: [{
          type: 'empty',
          prompt: globalTranslate.nw_ValidateIppaddrIsEmpty
        }, {
          type: 'ipaddr',
          prompt: globalTranslate.nw_ValidateIppaddrNotRight
        }]
      };
    } else {
      networks.validateRules[ipaddrClass] = {
        identifier: ipaddrClass,
        depends: "notdhcp_".concat(newRowId),
        // Real interface: validate only if DHCP is OFF
        rules: [{
          type: 'empty',
          prompt: globalTranslate.nw_ValidateIppaddrIsEmpty
        }, {
          type: 'ipaddr',
          prompt: globalTranslate.nw_ValidateIppaddrNotRight
        }]
      };
    } // DHCP validation removed - DHCP checkbox is disabled for VLAN interfaces

  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    // Create a new object with all settings properties
    var result = Object.assign({}, settings);
    result.data = {}; // Collect static routes

    result.data.staticRoutes = StaticRoutesManager.collectRoutes(); // Manually collect form values to avoid any DOM-related issues
    // Collect all regular input fields

    networks.$formObj.find('input[type="text"], input[type="hidden"], input[type="number"], textarea').each(function () {
      var $input = $(this);
      var name = $input.attr('name');

      if (name) {
        var value = $input.val(); // Ensure we only get string values

        result.data[name] = value !== null && value !== undefined ? String(value) : '';
      }
    }); // Collect select dropdowns

    networks.$formObj.find('select').each(function () {
      var $select = $(this);
      var name = $select.attr('name');

      if (name) {
        var value = $select.val(); // Ensure we only get string values

        result.data[name] = value !== null && value !== undefined ? String(value) : '';
      }
    }); // Convert checkbox values to boolean
    // PbxApiClient will handle conversion to strings for jQuery

    result.data.usenat = $('#usenat-checkbox').checkbox('is checked'); // Use correct field name from the form (autoUpdateExternalIp, not AUTO_UPDATE_EXTERNAL_IP)

    var $autoUpdateDiv = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');

    if ($autoUpdateDiv.length > 0) {
      result.data.autoUpdateExternalIp = $autoUpdateDiv.checkbox('is checked');
    } else {
      result.data.autoUpdateExternalIp = false;
    } // Convert DHCP checkboxes to boolean for each interface


    networks.$formObj.find('.dhcp-checkbox').each(function (index, obj) {
      var inputId = $(obj).attr('id');
      var rowId = inputId.replace('dhcp-', '').replace('-checkbox', ''); // For disabled checkboxes, read actual input state instead of Fomantic UI API

      var $checkbox = $(obj);
      var $input = $checkbox.find('input[type="checkbox"]');
      var isDisabled = $checkbox.hasClass('disabled') || $input.prop('disabled');

      if (isDisabled) {
        // For disabled checkboxes, read the actual input checked state
        result.data["dhcp_".concat(rowId)] = $input.prop('checked') === true;
      } else {
        // For enabled checkboxes, use Fomantic UI API
        result.data["dhcp_".concat(rowId)] = $checkbox.checkbox('is checked');
      }
    }); // Collect internet radio button

    var $checkedRadio = $('input[name="internet_interface"]:checked');

    if ($checkedRadio.length > 0) {
      result.data.internet_interface = String($checkedRadio.val());
    } // WHY: No port field mapping needed - form field names match API constants
    // (externalSIPPort = PbxSettings::EXTERNAL_SIP_PORT)


    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {// Response handled by Form
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = networks.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = networks.validateRules; // Form validation rules

    Form.cbBeforeSendForm = networks.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = networks.cbAfterSendForm; // Callback after form is sent

    Form.inline = true; // Show inline errors next to fields
    // Configure REST API

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = NetworkAPI;
    Form.apiSettings.saveMethod = 'saveConfig'; // Important settings for correct save modes operation

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "network/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "network/modify/");
    Form.initialize();
  },

  /**
   * Load network configuration via REST API
   */
  loadConfiguration: function loadConfiguration() {
    NetworkAPI.getConfig(function (response) {
      if (response.result && response.data) {
        networks.populateForm(response.data); // Initialize UI after loading data

        networks.toggleDisabledFieldClass(); // Hide form elements connected with non docker installations

        if (response.data.isDocker) {
          networks.$formObj.form('set value', 'is-docker', '1');
          networks.$notShowOnDockerDivs.hide();
        }
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Create interface tabs and forms dynamically from REST API data
   */
  createInterfaceTabs: function createInterfaceTabs(data) {
    var $menu = $('#eth-interfaces-menu');
    var $content = $('#eth-interfaces-content'); // Clear existing content

    $menu.empty();
    $content.empty(); // Create tabs for existing interfaces

    data.interfaces.forEach(function (iface, index) {
      var tabId = iface.id;
      var tabLabel = "".concat(iface.name || iface["interface"], " (").concat(iface["interface"]).concat(iface.vlanid !== '0' && iface.vlanid !== 0 ? ".".concat(iface.vlanid) : '', ")");
      var isActive = index === 0; // Create tab menu item

      $menu.append("\n                <a class=\"item ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(tabId, "\">\n                    ").concat(tabLabel, "\n                </a>\n            ")); // Create tab content
      // Only VLAN interfaces can be deleted (vlanid > 0)

      var canDelete = parseInt(iface.vlanid, 10) > 0;
      var deleteButton = canDelete ? "\n                <a class=\"ui icon left labeled button delete-interface\" data-value=\"".concat(tabId, "\">\n                    <i class=\"icon trash\"></i>").concat(globalTranslate.nw_DeleteCurrentInterface, "\n                </a>\n            ") : '';
      $content.append(networks.createInterfaceForm(iface, isActive, deleteButton));
    }); // Create template tab for new VLAN

    if (data.template) {
      var template = data.template;
      template.id = 0; // Add "+" tab menu item

      $menu.append("\n                <a class=\"item\" data-tab=\"0\">\n                    <i class=\"icon plus\"></i>\n                </a>\n            "); // Create template form with interface selector

      $content.append(networks.createTemplateForm(template, data.interfaces)); // Build interface selector dropdown for template

      var physicalInterfaces = {};
      data.interfaces.forEach(function (iface) {
        if (!physicalInterfaces[iface["interface"]]) {
          physicalInterfaces[iface["interface"]] = {
            value: iface.id.toString(),
            text: iface["interface"],
            name: iface["interface"]
          };
        }
      });
      var physicalInterfaceOptions = Object.values(physicalInterfaces);
      DynamicDropdownBuilder.buildDropdown('interface_0', {
        interface_0: ''
      }, {
        staticOptions: physicalInterfaceOptions,
        placeholder: globalTranslate.nw_SelectInterface,
        allowEmpty: true
      });
    } // Initialize subnet dropdowns using DynamicDropdownBuilder


    data.interfaces.forEach(function (iface) {
      var fieldName = "subnet_".concat(iface.id);
      var formData = {}; // Convert subnet to string for dropdown matching

      formData[fieldName] = String(iface.subnet || '24');
      DynamicDropdownBuilder.buildDropdown(fieldName, formData, {
        staticOptions: networks.getSubnetOptionsArray(),
        placeholder: globalTranslate.nw_SelectNetworkMask,
        allowEmpty: false,
        additionalClasses: ['search'] // Add search class for searchable dropdown

      });
    }); // Initialize subnet dropdown for template (id = 0)

    if (data.template) {
      DynamicDropdownBuilder.buildDropdown('subnet_0', {
        subnet_0: '24'
      }, {
        staticOptions: networks.getSubnetOptionsArray(),
        placeholder: globalTranslate.nw_SelectNetworkMask,
        allowEmpty: false,
        additionalClasses: ['search'] // Add search class for searchable dropdown

      });
    } // Initialize tabs


    $('#eth-interfaces-menu .item').tab();
    $('#eth-interfaces-menu .item').first().trigger('click'); // Update static routes section visibility

    StaticRoutesManager.updateVisibility(); // Re-bind delete button handlers
    // Delete button removes TAB from form and marks interface as disabled
    // Actual deletion happens on form submit

    $('.delete-interface').off('click').on('click', function (e) {
      e.preventDefault();
      var $button = $(this);
      var interfaceId = $button.attr('data-value'); // Remove the TAB menu item

      $("#eth-interfaces-menu a[data-tab=\"".concat(interfaceId, "\"]")).remove(); // Remove the TAB content

      var $tabContent = $("#eth-interfaces-content .tab[data-tab=\"".concat(interfaceId, "\"]"));
      $tabContent.remove(); // Add hidden field to mark this interface as disabled

      networks.$formObj.append("<input type=\"hidden\" name=\"disabled_".concat(interfaceId, "\" value=\"1\" />")); // Switch to first available tab

      var $firstTab = $('#eth-interfaces-menu a.item').first();

      if ($firstTab.length > 0) {
        $firstTab.tab('change tab', $firstTab.attr('data-tab'));
      } // Mark form as changed to enable submit button


      if (Form.enableDirrity) {
        Form.checkValues();
      }
    }); // Re-bind DHCP checkbox handlers

    $('.dhcp-checkbox').checkbox({
      onChange: function onChange() {
        networks.toggleDisabledFieldClass();
      }
    }); // Re-bind IP address input masks

    $('.ipaddress').inputmask({
      alias: 'ip',
      'placeholder': '_'
    }); // Add VLAN ID change handlers to control DHCP checkbox state

    $('input[name^="vlanid_"]').off('input change').on('input change', function () {
      var $vlanInput = $(this);
      var interfaceId = $vlanInput.attr('name').replace('vlanid_', '');
      var vlanValue = parseInt($vlanInput.val(), 10) || 0;
      var $dhcpCheckbox = $("#dhcp-".concat(interfaceId, "-checkbox"));

      if (vlanValue > 0) {
        // Disable DHCP checkbox for VLAN interfaces
        $dhcpCheckbox.addClass('disabled');
        $dhcpCheckbox.checkbox('uncheck');
        $dhcpCheckbox.checkbox('set disabled');
        $dhcpCheckbox.find('input').prop('disabled', true);
      } else {
        // Enable DHCP checkbox for non-VLAN interfaces
        $dhcpCheckbox.removeClass('disabled');
        $dhcpCheckbox.checkbox('set enabled');
        $dhcpCheckbox.find('input').prop('disabled', false);
      } // Update disabled field classes


      networks.toggleDisabledFieldClass();
    }); // Trigger the handler for existing VLAN interfaces to apply initial state

    $('input[name^="vlanid_"]').trigger('change'); // Initialize internet radio buttons with Fomantic UI

    $('.internet-radio').checkbox(); // Add internet radio button change handler

    $('input[name="internet_interface"]').off('change').on('change', function () {
      var selectedInterfaceId = $(this).val(); // Hide all DNS/Gateway groups

      $('[class^="dns-gateway-group-"]').hide(); // Show DNS/Gateway group for selected internet interface

      $(".dns-gateway-group-".concat(selectedInterfaceId)).show(); // Update TAB icons - add globe icon to selected, remove from others

      $('#eth-interfaces-menu a').each(function (index, tab) {
        var $tab = $(tab);
        var tabId = $tab.attr('data-tab'); // Remove existing globe icon

        $tab.find('.globe.icon').remove(); // Add globe icon to selected internet interface TAB

        if (tabId === selectedInterfaceId) {
          $tab.prepend('<i class="globe icon"></i>');
        }
      }); // Mark form as changed

      if (Form.enableDirrity) {
        Form.checkValues();
      }
    }); // Update DNS/Gateway readonly state when DHCP changes

    $('.dhcp-checkbox').off('change.dnsgateway').on('change.dnsgateway', function () {
      var $checkbox = $(this);
      var interfaceId = $checkbox.attr('id').replace('dhcp-', '').replace('-checkbox', '');
      var isDhcpEnabled = $checkbox.checkbox('is checked'); // Find DNS/Gateway fields for this interface

      var $dnsGatewayGroup = $(".dns-gateway-group-".concat(interfaceId));
      var $dnsGatewayFields = $dnsGatewayGroup.find('input[name^="gateway_"], input[name^="primarydns_"], input[name^="secondarydns_"]');

      if (isDhcpEnabled) {
        // DHCP enabled -> make DNS/Gateway read-only
        $dnsGatewayFields.prop('readonly', true);
        $dnsGatewayFields.closest('.field').addClass('disabled');
      } else {
        // DHCP disabled -> make DNS/Gateway editable
        $dnsGatewayFields.prop('readonly', false);
        $dnsGatewayFields.closest('.field').removeClass('disabled');
      }
    }); // Trigger initial TAB icon update for checked radio button

    var $checkedRadio = $('input[name="internet_interface"]:checked');

    if ($checkedRadio.length > 0) {
      $checkedRadio.trigger('change');
    } // Apply initial disabled state for DHCP-enabled interfaces
    // Call after all dropdowns are created


    networks.toggleDisabledFieldClass(); // Re-save initial form values and re-bind event handlers for dynamically created inputs
    // This is essential for form change detection to work with dynamic tabs

    if (Form.enableDirrity) {
      // Override Form methods to manually collect all field values (including from tabs)
      var originalSaveInitialValues = Form.saveInitialValues;
      var originalCheckValues = Form.checkValues;

      Form.saveInitialValues = function () {
        // Get values from Fomantic UI (may miss dynamically created tab fields)
        var fomanticValues = networks.$formObj.form('get values'); // Manually collect all field values to catch fields that Fomantic UI misses

        var manualValues = {};
        networks.$formObj.find('input, select, textarea').each(function () {
          var $field = $(this);
          var name = $field.attr('name') || $field.attr('id');

          if (name) {
            if ($field.attr('type') === 'checkbox') {
              manualValues[name] = $field.is(':checked');
            } else if ($field.attr('type') === 'radio') {
              if ($field.is(':checked')) {
                manualValues[name] = $field.val();
              }
            } else {
              manualValues[name] = $field.val();
            }
          }
        }); // Merge both (manual values override Fomantic values for fields that exist in both)

        Form.oldFormValues = Object.assign({}, fomanticValues, manualValues);
      };

      Form.checkValues = function () {
        // Get values from Fomantic UI
        var fomanticValues = networks.$formObj.form('get values'); // Manually collect all field values

        var manualValues = {};
        networks.$formObj.find('input, select, textarea').each(function () {
          var $field = $(this);
          var name = $field.attr('name') || $field.attr('id');

          if (name) {
            if ($field.attr('type') === 'checkbox') {
              manualValues[name] = $field.is(':checked');
            } else if ($field.attr('type') === 'radio') {
              if ($field.is(':checked')) {
                manualValues[name] = $field.val();
              }
            } else {
              manualValues[name] = $field.val();
            }
          }
        }); // Merge both

        var newFormValues = Object.assign({}, fomanticValues, manualValues);

        if (JSON.stringify(Form.oldFormValues) === JSON.stringify(newFormValues)) {
          Form.$submitButton.addClass('disabled');
          Form.$dropdownSubmit.addClass('disabled');
        } else {
          Form.$submitButton.removeClass('disabled');
          Form.$dropdownSubmit.removeClass('disabled');
        }
      };

      if (typeof Form.saveInitialValues === 'function') {
        Form.saveInitialValues();
      }

      if (typeof Form.setEvents === 'function') {
        Form.setEvents();
      }
    }
  },

  /**
   * Create form for existing interface
   */
  createInterfaceForm: function createInterfaceForm(iface, isActive, deleteButton) {
    var id = iface.id;
    var isInternetInterface = iface.internet || false; // DNS/Gateway fields visibility and read-only state

    var dnsGatewayVisible = isInternetInterface ? '' : 'style="display:none;"';
    var dnsGatewayReadonly = iface.dhcp ? 'readonly' : '';
    var dnsGatewayDisabledClass = iface.dhcp ? 'disabled' : '';
    return "\n            <div class=\"ui bottom attached tab segment ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(id, "\">\n                <input type=\"hidden\" name=\"interface_").concat(id, "\" value=\"").concat(iface["interface"], "\" />\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox internet-radio\" id=\"internet-").concat(id, "-radio\">\n                            <input type=\"radio\" name=\"internet_interface\" value=\"").concat(id, "\" ").concat(isInternetInterface ? 'checked' : '', " />\n                            <label><i class=\"globe icon\"></i> ").concat(globalTranslate.nw_InternetInterface || 'Internet Interface', "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox").concat(iface.vlanid > 0 ? ' disabled' : '', "\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" ").concat(iface.vlanid > 0 ? '' : iface.dhcp ? 'checked' : '', " ").concat(iface.vlanid > 0 ? 'disabled' : '', " />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                <div class=\"fields\" id=\"ip-address-group-").concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '', "\" />\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"").concat(iface.vlanid || '0', "\" />\n                    </div>\n                </div>\n\n                <div class=\"dns-gateway-group-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                    <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetSettings || 'Internet Settings', "</div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Hostname || 'Hostname', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" name=\"hostname_").concat(id, "\" value=\"").concat(iface.hostname || '', "\" placeholder=\"mikopbx\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Domain || 'Domain', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" name=\"domain_").concat(id, "\" value=\"").concat(iface.domain || '', "\" placeholder=\"example.com\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Gateway, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsGatewayDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"gateway_").concat(id, "\" value=\"").concat(iface.gateway || '', "\" ").concat(dnsGatewayReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_PrimaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsGatewayDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"primarydns_").concat(id, "\" value=\"").concat(iface.primarydns || '', "\" ").concat(dnsGatewayReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_SecondaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsGatewayDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"secondarydns_").concat(id, "\" value=\"").concat(iface.secondarydns || '', "\" ").concat(dnsGatewayReadonly, " />\n                        </div>\n                    </div>\n                </div>\n\n                ").concat(deleteButton, "\n            </div>\n        ");
  },

  /**
   * Create form for new VLAN template
   */
  createTemplateForm: function createTemplateForm(template, interfaces) {
    var id = 0;
    return "\n            <div class=\"ui bottom attached tab segment\" data-tab=\"".concat(id, "\">\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_SelectInterface, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"hidden\" name=\"interface_").concat(id, "\" id=\"interface_").concat(id, "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" id=\"name_").concat(id, "\" value=\"\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" checked />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                <div class=\"fields\" id=\"ip-address-group-").concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"\" />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"24\" />\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"4095\" />\n                    </div>\n                </div>\n            </div>\n        ");
  },

  /**
   * Get subnet mask options array for DynamicDropdownBuilder
   * @returns {Array} Array of subnet mask options
   */
  getSubnetOptionsArray: function getSubnetOptionsArray() {
    // Network masks from Cidr::getNetMasks() (krsort SORT_NUMERIC)
    return [{
      value: '32',
      text: '32 - 255.255.255.255'
    }, {
      value: '31',
      text: '31 - 255.255.255.254'
    }, {
      value: '30',
      text: '30 - 255.255.255.252'
    }, {
      value: '29',
      text: '29 - 255.255.255.248'
    }, {
      value: '28',
      text: '28 - 255.255.255.240'
    }, {
      value: '27',
      text: '27 - 255.255.255.224'
    }, {
      value: '26',
      text: '26 - 255.255.255.192'
    }, {
      value: '25',
      text: '25 - 255.255.255.128'
    }, {
      value: '24',
      text: '24 - 255.255.255.0'
    }, {
      value: '23',
      text: '23 - 255.255.255.254'
    }, {
      value: '22',
      text: '22 - 255.255.252.0'
    }, {
      value: '21',
      text: '21 - 255.255.248.0'
    }, {
      value: '20',
      text: '20 - 255.255.240.0'
    }, {
      value: '19',
      text: '19 - 255.255.224.0'
    }, {
      value: '18',
      text: '18 - 255.255.192.0'
    }, {
      value: '17',
      text: '17 - 255.255.128.0'
    }, {
      value: '16',
      text: '16 - 255.255.0.0'
    }, {
      value: '15',
      text: '15 - 255.254.0.0'
    }, {
      value: '14',
      text: '14 - 255.252.0.0'
    }, {
      value: '13',
      text: '13 - 255.248.0.0'
    }, {
      value: '12',
      text: '12 - 255.240.0.0'
    }, {
      value: '11',
      text: '11 - 255.224.0.0'
    }, {
      value: '10',
      text: '10 - 255.192.0.0'
    }, {
      value: '9',
      text: '9 - 255.128.0.0'
    }, {
      value: '8',
      text: '8 - 255.0.0.0'
    }, {
      value: '7',
      text: '7 - 254.0.0.0'
    }, {
      value: '6',
      text: '6 - 252.0.0.0'
    }, {
      value: '5',
      text: '5 - 248.0.0.0'
    }, {
      value: '4',
      text: '4 - 240.0.0.0'
    }, {
      value: '3',
      text: '3 - 224.0.0.0'
    }, {
      value: '2',
      text: '2 - 192.0.0.0'
    }, {
      value: '1',
      text: '1 - 128.0.0.0'
    }, {
      value: '0',
      text: '0 - 0.0.0.0'
    }];
  },

  /**
   * Populate form with configuration data
   */
  populateForm: function populateForm(data) {
    // Create interface tabs and forms dynamically
    networks.createInterfaceTabs(data); // Set NAT settings

    if (data.nat) {
      // Boolean values from API
      if (data.nat.usenat) {
        $('#usenat-checkbox').checkbox('check');
      } else {
        $('#usenat-checkbox').checkbox('uncheck');
      }

      networks.$formObj.form('set value', 'extipaddr', data.nat.extipaddr || '');
      networks.$formObj.form('set value', 'exthostname', data.nat.exthostname || ''); // autoUpdateExternalIp boolean (field name from the form)

      var $autoUpdateCheckbox = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');

      if ($autoUpdateCheckbox.length > 0) {
        if (data.nat.AUTO_UPDATE_EXTERNAL_IP || data.nat.autoUpdateExternalIp) {
          $autoUpdateCheckbox.checkbox('check');
        } else {
          $autoUpdateCheckbox.checkbox('uncheck');
        }
      }
    } // Set port settings


    if (data.ports) {
      // WHY: No mapping needed - API returns keys matching form field names
      // (e.g., 'externalSIPPort' from PbxSettings::EXTERNAL_SIP_PORT constant)
      Object.keys(data.ports).forEach(function (key) {
        var value = data.ports[key];
        networks.$formObj.form('set value', key, value);
      }); // Update the NAT help text and labels with actual port values

      networks.updateNATHelpText(data.ports);
      networks.updatePortLabels(data.ports);
    } // Set additional settings


    if (data.settings) {
      Object.keys(data.settings).forEach(function (key) {
        networks.$formObj.form('set value', key, data.settings[key]);
      });
    } // Store available interfaces for static routes FIRST (before loading routes)


    if (data.availableInterfaces) {
      StaticRoutesManager.availableInterfaces = data.availableInterfaces;
    } // Load static routes AFTER availableInterfaces are set


    if (data.staticRoutes) {
      StaticRoutesManager.loadRoutes(data.staticRoutes);
    } // Re-initialize dirty checking after population is complete
    // This ensures the button is disabled and all dynamically created fields are tracked


    if (Form.enableDirrity) {
      Form.initializeDirrity();
    }
  }
};
/**
 * Custom form validation rule for checking if the value is a valid IP address.
 * @param {string} value - The value to validate as an IP address.
 * @returns {boolean} - True if the value is a valid IP address, false otherwise.
 */

$.fn.form.settings.rules.ipaddr = function (value) {
  var result = true;
  var f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (f == null) {
    result = false;
  } else {
    for (var i = 1; i < 5; i += 1) {
      var a = f[i];

      if (a > 255) {
        result = false;
      }
    }

    if (f[5] > 32) {
      result = false;
    }
  }

  return result;
};
/**
 * Custom form validation rule for checking if the value is a valid IP address with an optional port.
 * @param {string} value - The value to validate as an IP address with an optional port.
 * @returns {boolean} - True if the value is a valid IP address with an optional port, false otherwise.
 */


$.fn.form.settings.rules.ipaddrWithPortOptional = function (value) {
  var result = true;
  var f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(:[0-9]+)?$/);

  if (f == null) {
    result = false;
  } else {
    for (var i = 1; i < 5; i += 1) {
      var a = f[i];

      if (a > 255) {
        result = false;
      }
    }

    if (f[5] > 32) {
      result = false;
    }
  }

  return result;
};
/**
 * Custom form validation rule for checking if the VLAN ID is unique for a given interface.
 * @param {string} vlanValue - The value of the VLAN ID input field.
 * @param {string} param - The parameter for the rule.
 * @returns {boolean} - True if the VLAN ID is unique for the interface, false otherwise.
 */


$.fn.form.settings.rules.checkVlan = function (vlanValue, param) {
  var result = true;
  var vlansArray = {};
  var allValues = networks.$formObj.form('get values');

  if (allValues.interface_0 !== undefined && allValues.interface_0 > 0) {
    var newEthName = allValues["interface_".concat(allValues.interface_0)];
    vlansArray[newEthName] = [allValues.vlanid_0];

    if (allValues.vlanid_0 === '') {
      result = false;
    }
  }

  $.each(allValues, function (index, value) {
    if (index === 'interface_0' || index === 'vlanid_0') return;

    if (index.indexOf('vlanid') >= 0) {
      var ethName = allValues["interface_".concat(index.split('_')[1])];

      if ($.inArray(value, vlansArray[ethName]) >= 0 && vlanValue === value && param === index.split('_')[1]) {
        result = false;
      } else {
        if (!(ethName in vlansArray)) {
          vlansArray[ethName] = [];
        }

        vlansArray[ethName].push(value);
      }
    }
  });
  return result;
}; // DHCP validation rule removed - DHCP checkbox is disabled for VLAN interfaces, no validation needed

/**
 * Custom form validation rule for checking the presence of external IP host information.
 * @returns {boolean} - True if the external IP host information is provided when NAT is enabled, false otherwise.
 */


$.fn.form.settings.rules.extenalIpHost = function () {
  var allValues = networks.$formObj.form('get values');

  if (allValues.usenat === 'on') {
    if (allValues.exthostname === '' && allValues.extipaddr === '') {
      return false;
    }
  }

  return true;
};
/**
 * Custom form validation rule for checking if value is a valid hostname
 * @param {string} value - The value to validate as hostname
 * @returns {boolean} - True if valid hostname, false otherwise
 */


$.fn.form.settings.rules.validHostname = function (value) {
  if (!value || value === '') {
    return true; // Empty is handled by extenalIpHost rule
  } // RFC 952/RFC 1123 hostname validation
  // - Labels separated by dots
  // - Each label 1-63 chars
  // - Only alphanumeric and hyphens
  // - Cannot start/end with hyphen
  // - Total length max 253 chars


  var hostnameRegex = /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63}(?<!-))*$/;
  return hostnameRegex.test(value);
};
/**
 * Static Routes Manager Module
 *
 * Manages static route configuration when multiple network interfaces exist
 */


var StaticRoutesManager = {
  $table: $('#static-routes-table'),
  $section: $('#static-routes-section'),
  $addButton: $('#add-new-route'),
  $tableContainer: null,
  $emptyPlaceholder: null,
  routes: [],
  availableInterfaces: [],
  // Will be populated from REST API

  /**
   * Initialize static routes management
   */
  initialize: function initialize() {
    // Cache elements
    StaticRoutesManager.$emptyPlaceholder = $('#static-routes-empty-placeholder');
    StaticRoutesManager.$tableContainer = $('#static-routes-table-container'); // Hide section if less than 2 interfaces

    StaticRoutesManager.updateVisibility(); // Initialize drag-and-drop

    StaticRoutesManager.initializeDragAndDrop(); // Add button handler

    StaticRoutesManager.$addButton.on('click', function (e) {
      e.preventDefault();
      StaticRoutesManager.addRoute();
    }); // Add first route button handler (in empty placeholder)

    $(document).on('click', '#add-first-route-button', function (e) {
      e.preventDefault();
      StaticRoutesManager.addRoute();
    }); // Delete button handler (delegated)

    StaticRoutesManager.$table.on('click', '.delete-route-button', function (e) {
      e.preventDefault();
      $(e.target).closest('tr').remove();
      StaticRoutesManager.updatePriorities();
      StaticRoutesManager.updateEmptyState();
      Form.dataChanged();
    }); // Copy button handler (delegated)

    StaticRoutesManager.$table.on('click', '.copy-route-button', function (e) {
      e.preventDefault();
      var $sourceRow = $(e.target).closest('tr');
      StaticRoutesManager.copyRoute($sourceRow);
    }); // Input change handlers

    StaticRoutesManager.$table.on('input change', '.network-input, .gateway-input, .description-input', function () {
      Form.dataChanged();
    }); // Paste handlers for IP address fields (enable clipboard paste with inputmask)

    StaticRoutesManager.$table.on('paste', '.network-input, .gateway-input', function (e) {
      e.preventDefault(); // Get pasted data from clipboard

      var pastedData = '';

      if (e.originalEvent && e.originalEvent.clipboardData && e.originalEvent.clipboardData.getData) {
        pastedData = e.originalEvent.clipboardData.getData('text');
      } else if (e.clipboardData && e.clipboardData.getData) {
        pastedData = e.clipboardData.getData('text');
      } else if (window.clipboardData && window.clipboardData.getData) {
        pastedData = window.clipboardData.getData('text'); // For IE
      } // Clean the pasted data (remove extra spaces, keep only valid IP characters)


      var cleanedData = pastedData.trim().replace(/[^0-9.]/g, ''); // Get the input element

      var $input = $(this); // Temporarily remove mask

      $input.inputmask('remove'); // Set the cleaned value

      $input.val(cleanedData); // Reapply the mask after a short delay

      setTimeout(function () {
        $input.inputmask({
          alias: 'ip',
          placeholder: '_'
        });
        $input.trigger('input');
        Form.dataChanged();
      }, 10);
    });
  },

  /**
   * Initialize or reinitialize drag-and-drop functionality
   */
  initializeDragAndDrop: function initializeDragAndDrop() {
    // Destroy existing tableDnD if it exists
    if (StaticRoutesManager.$table.data('tableDnD')) {
      StaticRoutesManager.$table.tableDnDUpdate();
    } // Initialize drag-and-drop


    StaticRoutesManager.$table.tableDnD({
      onDrop: function onDrop() {
        StaticRoutesManager.updatePriorities();
        Form.dataChanged();
      },
      dragHandle: '.dragHandle'
    });
  },

  /**
   * Update visibility based on number of interfaces
   */
  updateVisibility: function updateVisibility() {
    // Show/hide section based on number of interfaces
    var interfaceCount = $('#eth-interfaces-menu a.item').not('[data-tab="0"]').length;

    if (interfaceCount > 1) {
      StaticRoutesManager.$section.show();
    } else {
      StaticRoutesManager.$section.hide();
    }
  },

  /**
   * Copy a route row (create duplicate)
   * @param {jQuery} $sourceRow - Source row to copy
   */
  copyRoute: function copyRoute($sourceRow) {
    var routeId = $sourceRow.attr('data-route-id');
    var subnetDropdownId = "subnet-route-".concat(routeId);
    var interfaceDropdownId = "interface-route-".concat(routeId); // Collect data from source row

    var routeData = {
      network: $sourceRow.find('.network-input').val(),
      subnet: $("#".concat(subnetDropdownId)).val(),
      gateway: $sourceRow.find('.gateway-input').val(),
      "interface": $("#".concat(interfaceDropdownId)).val() || '',
      description: $sourceRow.find('.description-input').val()
    }; // Add new route with copied data

    StaticRoutesManager.addRoute(routeData); // Reinitialize drag-and-drop after adding route

    StaticRoutesManager.initializeDragAndDrop();
  },

  /**
   * Update empty state visibility
   */
  updateEmptyState: function updateEmptyState() {
    var $existingRows = $('.route-row');

    if ($existingRows.length === 0) {
      // Show empty placeholder, hide table container
      StaticRoutesManager.$emptyPlaceholder.show();
      StaticRoutesManager.$tableContainer.hide();
    } else {
      // Hide empty placeholder, show table container
      StaticRoutesManager.$emptyPlaceholder.hide();
      StaticRoutesManager.$tableContainer.show();
    }
  },

  /**
   * Add a new route row
   * @param {Object} routeData - Route data (optional)
   */
  addRoute: function addRoute() {
    var routeData = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var $template = $('.route-row-template').last();
    var $newRow = $template.clone(true);
    var routeId = (routeData === null || routeData === void 0 ? void 0 : routeData.id) || "new_".concat(Date.now());
    $newRow.removeClass('route-row-template').addClass('route-row').attr('data-route-id', routeId).show(); // Set values if provided

    if (routeData) {
      $newRow.find('.network-input').val(routeData.network);
      $newRow.find('.gateway-input').val(routeData.gateway);
      $newRow.find('.description-input').val(routeData.description || '');
    } // Add to table


    var $existingRows = $('.route-row');

    if ($existingRows.length === 0) {
      $template.after($newRow);
    } else {
      $existingRows.last().after($newRow);
    } // Initialize subnet dropdown for this row


    StaticRoutesManager.initializeSubnetDropdown($newRow, (routeData === null || routeData === void 0 ? void 0 : routeData.subnet) || '24'); // Initialize interface dropdown for this row

    StaticRoutesManager.initializeInterfaceDropdown($newRow, (routeData === null || routeData === void 0 ? void 0 : routeData["interface"]) || ''); // Initialize inputmask for IP address fields

    $newRow.find('.ipaddress').inputmask({
      alias: 'ip',
      placeholder: '_'
    });
    StaticRoutesManager.updatePriorities();
    StaticRoutesManager.updateEmptyState();
    Form.dataChanged();
  },

  /**
   * Initialize subnet dropdown for a route row
   * @param {jQuery} $row - Row element
   * @param {string} selectedValue - Selected subnet value
   */
  initializeSubnetDropdown: function initializeSubnetDropdown($row, selectedValue) {
    var $container = $row.find('.subnet-dropdown-container');
    var dropdownId = "subnet-route-".concat($row.attr('data-route-id'));
    $container.html("<input type=\"hidden\" id=\"".concat(dropdownId, "\" />"));
    DynamicDropdownBuilder.buildDropdown(dropdownId, _defineProperty({}, dropdownId, selectedValue), {
      staticOptions: networks.getSubnetOptionsArray(),
      placeholder: globalTranslate.nw_SelectNetworkMask,
      allowEmpty: false,
      additionalClasses: ['search'],
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
  },

  /**
   * Initialize interface dropdown for a route row
   * @param {jQuery} $row - Row element
   * @param {string} selectedValue - Selected interface value (empty string = auto)
   */
  initializeInterfaceDropdown: function initializeInterfaceDropdown($row, selectedValue) {
    var $container = $row.find('.interface-dropdown-container');
    var dropdownId = "interface-route-".concat($row.attr('data-route-id'));
    $container.html("<input type=\"hidden\" id=\"".concat(dropdownId, "\" />")); // Build dropdown options: "Auto" + available interfaces

    var options = [{
      value: '',
      text: globalTranslate.nw_Auto || 'Auto'
    }].concat(_toConsumableArray(StaticRoutesManager.availableInterfaces.map(function (iface) {
      return {
        value: iface.value,
        text: iface.label
      };
    }))); // Prepare form data for DynamicDropdownBuilder

    var formData = {};
    formData[dropdownId] = selectedValue || ''; // Ensure we pass empty string for "Auto"

    DynamicDropdownBuilder.buildDropdown(dropdownId, formData, {
      staticOptions: options,
      placeholder: globalTranslate.nw_SelectInterface,
      allowEmpty: false,
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
  },

  /**
   * Update route priorities based on table order
   */
  updatePriorities: function updatePriorities() {
    $('.route-row').each(function (index, row) {
      $(row).attr('data-priority', index + 1);
    });
  },

  /**
   * Load routes from data
   * @param {Array} routesData - Array of route objects
   */
  loadRoutes: function loadRoutes(routesData) {
    // Clear existing routes
    $('.route-row').remove(); // Add each route

    if (routesData && routesData.length > 0) {
      routesData.forEach(function (route) {
        StaticRoutesManager.addRoute(route);
      });
    } else {
      // Show empty state if no routes
      StaticRoutesManager.updateEmptyState();
    } // Reinitialize drag-and-drop after adding routes


    StaticRoutesManager.initializeDragAndDrop();
  },

  /**
   * Collect routes from table
   * @returns {Array} Array of route objects
   */
  collectRoutes: function collectRoutes() {
    var routes = [];
    $('.route-row').each(function (index, row) {
      var $row = $(row);
      var routeId = $row.attr('data-route-id');
      var subnetDropdownId = "subnet-route-".concat(routeId);
      var interfaceDropdownId = "interface-route-".concat(routeId);
      routes.push({
        id: routeId.startsWith('new_') ? null : routeId,
        network: $row.find('.network-input').val(),
        subnet: $("#".concat(subnetDropdownId)).val(),
        gateway: $row.find('.gateway-input').val(),
        "interface": $("#".concat(interfaceDropdownId)).val() || '',
        description: $row.find('.description-input').val(),
        priority: index + 1
      });
    });
    return routes;
  }
};
/**
 *  Initialize network settings form on document ready
 */

$(document).ready(function () {
  networks.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJmb3JtIiwiaGlkZSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwiaXAiLCJ0cmlnZ2VyIiwidXBkYXRlTkFUSGVscFRleHQiLCJwb3J0cyIsIlNJUFBvcnQiLCJUTFNfUE9SVCIsIlJUUFBvcnRGcm9tIiwiUlRQUG9ydFRvIiwiJHNpcFBvcnRWYWx1ZXMiLCJsZW5ndGgiLCJzaXBUZXh0IiwiaTE4biIsImh0bWwiLCIkcnRwUG9ydFZhbHVlcyIsInJ0cFRleHQiLCJ1cGRhdGVQb3J0TGFiZWxzIiwiJHNpcExhYmVsIiwic2lwTGFiZWxUZXh0IiwidGV4dCIsIiR0bHNMYWJlbCIsInRsc0xhYmVsVGV4dCIsImVhY2giLCJpbmRleCIsIm9iaiIsImV0aCIsImF0dHIiLCIkZGhjcENoZWNrYm94IiwiaXNEaGNwRW5hYmxlZCIsIiRpcEZpZWxkIiwiJHN1Ym5ldERyb3Bkb3duIiwicHJvcCIsImNsb3Nlc3QiLCJ2YWwiLCJhZGROZXdGb3JtUnVsZXMiLCJuZXdSb3dJZCIsIm5hbWVDbGFzcyIsImlkZW50aWZpZXIiLCJud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHkiLCJ2bGFuQ2xhc3MiLCJud19WYWxpZGF0ZVZsYW5SYW5nZSIsIm53X1ZhbGlkYXRlVmxhbkNyb3NzIiwiaXBhZGRyQ2xhc3MiLCJud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5IiwibndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJPYmplY3QiLCJhc3NpZ24iLCJkYXRhIiwic3RhdGljUm91dGVzIiwiY29sbGVjdFJvdXRlcyIsImZpbmQiLCIkaW5wdXQiLCJuYW1lIiwidmFsdWUiLCJ1bmRlZmluZWQiLCJTdHJpbmciLCIkc2VsZWN0IiwidXNlbmF0IiwiJGF1dG9VcGRhdGVEaXYiLCJwYXJlbnQiLCJhdXRvVXBkYXRlRXh0ZXJuYWxJcCIsImlucHV0SWQiLCJyb3dJZCIsInJlcGxhY2UiLCIkY2hlY2tib3giLCJpc0Rpc2FibGVkIiwiaGFzQ2xhc3MiLCIkY2hlY2tlZFJhZGlvIiwiaW50ZXJuZXRfaW50ZXJmYWNlIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImlubGluZSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsImlzRG9ja2VyIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsImNyZWF0ZUludGVyZmFjZVRhYnMiLCIkbWVudSIsIiRjb250ZW50IiwiZW1wdHkiLCJpbnRlcmZhY2VzIiwiZm9yRWFjaCIsImlmYWNlIiwidGFiSWQiLCJpZCIsInRhYkxhYmVsIiwidmxhbmlkIiwiaXNBY3RpdmUiLCJhcHBlbmQiLCJjYW5EZWxldGUiLCJwYXJzZUludCIsImRlbGV0ZUJ1dHRvbiIsIm53X0RlbGV0ZUN1cnJlbnRJbnRlcmZhY2UiLCJjcmVhdGVJbnRlcmZhY2VGb3JtIiwidGVtcGxhdGUiLCJjcmVhdGVUZW1wbGF0ZUZvcm0iLCJwaHlzaWNhbEludGVyZmFjZXMiLCJ0b1N0cmluZyIsInBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyIsInZhbHVlcyIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW50ZXJmYWNlXzAiLCJzdGF0aWNPcHRpb25zIiwicGxhY2Vob2xkZXIiLCJud19TZWxlY3RJbnRlcmZhY2UiLCJhbGxvd0VtcHR5IiwiZmllbGROYW1lIiwiZm9ybURhdGEiLCJzdWJuZXQiLCJnZXRTdWJuZXRPcHRpb25zQXJyYXkiLCJud19TZWxlY3ROZXR3b3JrTWFzayIsImFkZGl0aW9uYWxDbGFzc2VzIiwic3VibmV0XzAiLCJ0YWIiLCJmaXJzdCIsInVwZGF0ZVZpc2liaWxpdHkiLCJvZmYiLCIkYnV0dG9uIiwiaW50ZXJmYWNlSWQiLCJyZW1vdmUiLCIkdGFiQ29udGVudCIsIiRmaXJzdFRhYiIsImVuYWJsZURpcnJpdHkiLCJjaGVja1ZhbHVlcyIsIiR2bGFuSW5wdXQiLCJ2bGFuVmFsdWUiLCJzZWxlY3RlZEludGVyZmFjZUlkIiwic2hvdyIsIiR0YWIiLCJwcmVwZW5kIiwiJGRuc0dhdGV3YXlHcm91cCIsIiRkbnNHYXRld2F5RmllbGRzIiwib3JpZ2luYWxTYXZlSW5pdGlhbFZhbHVlcyIsInNhdmVJbml0aWFsVmFsdWVzIiwib3JpZ2luYWxDaGVja1ZhbHVlcyIsImZvbWFudGljVmFsdWVzIiwibWFudWFsVmFsdWVzIiwiJGZpZWxkIiwiaXMiLCJvbGRGb3JtVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0Iiwic2V0RXZlbnRzIiwiaXNJbnRlcm5ldEludGVyZmFjZSIsImludGVybmV0IiwiZG5zR2F0ZXdheVZpc2libGUiLCJkbnNHYXRld2F5UmVhZG9ubHkiLCJkaGNwIiwiZG5zR2F0ZXdheURpc2FibGVkQ2xhc3MiLCJud19JbnRlcmZhY2VOYW1lIiwibndfSW50ZXJuZXRJbnRlcmZhY2UiLCJud19Vc2VESENQIiwibndfSVBBZGRyZXNzIiwiaXBhZGRyIiwibndfTmV0d29ya01hc2siLCJud19WbGFuSUQiLCJud19JbnRlcm5ldFNldHRpbmdzIiwibndfSG9zdG5hbWUiLCJob3N0bmFtZSIsIm53X0RvbWFpbiIsImRvbWFpbiIsIm53X0dhdGV3YXkiLCJnYXRld2F5IiwibndfUHJpbWFyeUROUyIsInByaW1hcnlkbnMiLCJud19TZWNvbmRhcnlETlMiLCJzZWNvbmRhcnlkbnMiLCJuYXQiLCIkYXV0b1VwZGF0ZUNoZWNrYm94IiwiQVVUT19VUERBVEVfRVhURVJOQUxfSVAiLCJrZXlzIiwia2V5IiwiYXZhaWxhYmxlSW50ZXJmYWNlcyIsImxvYWRSb3V0ZXMiLCJpbml0aWFsaXplRGlycml0eSIsImZuIiwiZiIsImkiLCJhIiwiaXBhZGRyV2l0aFBvcnRPcHRpb25hbCIsImNoZWNrVmxhbiIsInBhcmFtIiwiYWxsVmFsdWVzIiwibmV3RXRoTmFtZSIsInZsYW5pZF8wIiwiaW5kZXhPZiIsImV0aE5hbWUiLCJzcGxpdCIsImluQXJyYXkiLCJwdXNoIiwiZXh0ZW5hbElwSG9zdCIsInZhbGlkSG9zdG5hbWUiLCJob3N0bmFtZVJlZ2V4IiwidGVzdCIsIiR0YWJsZSIsIiRzZWN0aW9uIiwiJGFkZEJ1dHRvbiIsIiR0YWJsZUNvbnRhaW5lciIsIiRlbXB0eVBsYWNlaG9sZGVyIiwicm91dGVzIiwiaW5pdGlhbGl6ZURyYWdBbmREcm9wIiwiYWRkUm91dGUiLCJkb2N1bWVudCIsInRhcmdldCIsInVwZGF0ZVByaW9yaXRpZXMiLCJ1cGRhdGVFbXB0eVN0YXRlIiwiZGF0YUNoYW5nZWQiLCIkc291cmNlUm93IiwiY29weVJvdXRlIiwicGFzdGVkRGF0YSIsIm9yaWdpbmFsRXZlbnQiLCJjbGlwYm9hcmREYXRhIiwiZ2V0RGF0YSIsIndpbmRvdyIsImNsZWFuZWREYXRhIiwidHJpbSIsInNldFRpbWVvdXQiLCJ0YWJsZURuRFVwZGF0ZSIsInRhYmxlRG5EIiwib25Ecm9wIiwiZHJhZ0hhbmRsZSIsImludGVyZmFjZUNvdW50Iiwibm90Iiwicm91dGVJZCIsInN1Ym5ldERyb3Bkb3duSWQiLCJpbnRlcmZhY2VEcm9wZG93bklkIiwicm91dGVEYXRhIiwibmV0d29yayIsImRlc2NyaXB0aW9uIiwiJGV4aXN0aW5nUm93cyIsIiR0ZW1wbGF0ZSIsImxhc3QiLCIkbmV3Um93IiwiY2xvbmUiLCJEYXRlIiwibm93IiwiYWZ0ZXIiLCJpbml0aWFsaXplU3VibmV0RHJvcGRvd24iLCJpbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24iLCIkcm93Iiwic2VsZWN0ZWRWYWx1ZSIsIiRjb250YWluZXIiLCJkcm9wZG93bklkIiwib3B0aW9ucyIsIm53X0F1dG8iLCJtYXAiLCJsYWJlbCIsInJvdyIsInJvdXRlc0RhdGEiLCJyb3V0ZSIsInN0YXJ0c1dpdGgiLCJwcmlvcml0eSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2JDLEVBQUFBLGNBQWMsRUFBRUMsQ0FBQyxDQUFDLFVBQUQsQ0FESjs7QUFHYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVELENBQUMsQ0FBQyxlQUFELENBUEU7QUFTYkUsRUFBQUEsVUFBVSxFQUFFRixDQUFDLENBQUMseUJBQUQsQ0FUQTtBQVViRyxFQUFBQSxVQUFVLEVBQUVILENBQUMsQ0FBQyxZQUFELENBVkE7QUFXYkksRUFBQUEsZUFBZSxFQUFFSixDQUFDLENBQUMsWUFBRCxDQVhMO0FBWWJLLEVBQUFBLFVBQVUsRUFBRSxFQVpDOztBQWNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG9CQUFvQixFQUFFTixDQUFDLENBQUMsd0JBQUQsQ0FsQlY7O0FBb0JiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSU8sRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFNBQVMsRUFBRTtBQUNQQyxNQUFBQSxRQUFRLEVBQUUsSUFESDtBQUVQQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsd0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREcsRUFLSDtBQUNJSCxRQUFBQSxJQUFJLEVBQUUsZUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0U7QUFGNUIsT0FMRztBQUZBLEtBREE7QUFjWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RDLE1BQUFBLE9BQU8sRUFBRSxRQURBO0FBRVRQLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxlQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRTtBQUY1QixPQURHLEVBS0g7QUFDSUosUUFBQUEsSUFBSSxFQUFFLGVBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNLO0FBRjVCLE9BTEc7QUFGRTtBQWRGLEdBekJGOztBQXNEYjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUF6RGEsd0JBeURBO0FBQ1Q7QUFDQXJCLElBQUFBLFFBQVEsQ0FBQ3NCLGlCQUFULEdBRlMsQ0FJVDs7QUFDQXBCLElBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCcUIsUUFBdEIsQ0FBK0I7QUFDM0JDLE1BQUFBLFFBRDJCLHNCQUNoQjtBQUNQeEIsUUFBQUEsUUFBUSxDQUFDeUIsd0JBQVQ7QUFDSDtBQUgwQixLQUEvQjtBQUtBekIsSUFBQUEsUUFBUSxDQUFDSSxVQUFULENBQW9Cc0IsUUFBcEIsR0FWUyxDQVlUOztBQUVBMUIsSUFBQUEsUUFBUSxDQUFDQyxjQUFULENBQXdCMEIsRUFBeEIsQ0FBMkIsT0FBM0IsRUFBb0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3ZDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQTdCLE1BQUFBLFFBQVEsQ0FBQ0MsY0FBVCxDQUF3QjZCLFFBQXhCLENBQWlDLGtCQUFqQztBQUNBQyxNQUFBQSxVQUFVLENBQUNDLGlCQUFYLENBQTZCaEMsUUFBUSxDQUFDaUMsb0JBQXRDO0FBQ0gsS0FKRCxFQWRTLENBb0JUOztBQUNBakMsSUFBQUEsUUFBUSxDQUFDTSxlQUFULENBQXlCNEIsU0FBekIsQ0FBbUM7QUFBQ0MsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBYyxxQkFBZTtBQUE3QixLQUFuQztBQUVBbkMsSUFBQUEsUUFBUSxDQUFDb0MsY0FBVCxHQXZCUyxDQXlCVDs7QUFDQUMsSUFBQUEsbUJBQW1CLENBQUNoQixVQUFwQixHQTFCUyxDQTRCVDs7QUFDQSxRQUFJckIsUUFBUSxDQUFDRyxRQUFULENBQWtCbUMsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBbUMsV0FBbkMsTUFBa0QsR0FBdEQsRUFBMkQ7QUFDdkR0QyxNQUFBQSxRQUFRLENBQUNRLG9CQUFULENBQThCK0IsSUFBOUI7QUFDSDtBQUNKLEdBekZZOztBQTJGYjtBQUNKO0FBQ0E7QUFDQTtBQUNJTixFQUFBQSxvQkEvRmEsZ0NBK0ZRTyxRQS9GUixFQStGa0I7QUFDM0IsUUFBSUEsUUFBUSxLQUFLLEtBQWpCLEVBQXdCO0FBQ3BCeEMsTUFBQUEsUUFBUSxDQUFDQyxjQUFULENBQXdCd0MsV0FBeEIsQ0FBb0Msa0JBQXBDO0FBQ0gsS0FGRCxNQUVPO0FBQ0gsVUFBTUMsZ0JBQWdCLEdBQUcxQyxRQUFRLENBQUNHLFFBQVQsQ0FBa0JtQyxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxXQUFwQyxDQUF6QjtBQUNBLFVBQU1LLFNBQVMsR0FBR0QsZ0JBQWdCLENBQUNFLEtBQWpCLENBQXVCLFNBQXZCLENBQWxCO0FBQ0EsVUFBTUMsSUFBSSxHQUFHRixTQUFTLEdBQUcsTUFBTUEsU0FBUyxDQUFDLENBQUQsQ0FBbEIsR0FBd0IsRUFBOUM7QUFDQSxVQUFNRyxZQUFZLEdBQUdOLFFBQVEsQ0FBQ08sRUFBVCxHQUFjRixJQUFuQztBQUNBN0MsTUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCbUMsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsV0FBcEMsRUFBaURRLFlBQWpELEVBTEcsQ0FNSDs7QUFDQTlDLE1BQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1DLElBQWxCLENBQXVCLFdBQXZCLEVBQW9DLGFBQXBDLEVBQW1ELEVBQW5EO0FBQ0F0QyxNQUFBQSxRQUFRLENBQUNLLFVBQVQsQ0FBb0IyQyxPQUFwQixDQUE0QixRQUE1QjtBQUNBaEQsTUFBQUEsUUFBUSxDQUFDQyxjQUFULENBQXdCd0MsV0FBeEIsQ0FBb0Msa0JBQXBDO0FBQ0g7QUFDSixHQTdHWTs7QUErR2I7QUFDSjtBQUNBO0FBQ0E7QUFDSVEsRUFBQUEsaUJBbkhhLDZCQW1IS0MsS0FuSEwsRUFtSFk7QUFDckI7QUFDQTtBQUNBLFFBQUksQ0FBQ0EsS0FBSyxDQUFDQyxPQUFQLElBQWtCLENBQUNELEtBQUssQ0FBQ0UsUUFBekIsSUFBcUMsQ0FBQ0YsS0FBSyxDQUFDRyxXQUE1QyxJQUEyRCxDQUFDSCxLQUFLLENBQUNJLFNBQXRFLEVBQWlGO0FBQzdFO0FBQ0gsS0FMb0IsQ0FPckI7OztBQUNBLFFBQU1DLGNBQWMsR0FBR3JELENBQUMsQ0FBQyxrQ0FBRCxDQUF4Qjs7QUFDQSxRQUFJcUQsY0FBYyxDQUFDQyxNQUFmLEdBQXdCLENBQTVCLEVBQStCO0FBQzNCLFVBQU1DLE9BQU8sR0FBR0MsSUFBSSxDQUFDLGFBQUQsRUFBZ0I7QUFDaEMsb0JBQVlSLEtBQUssQ0FBQ0MsT0FEYztBQUVoQyxvQkFBWUQsS0FBSyxDQUFDRTtBQUZjLE9BQWhCLENBQXBCO0FBSUFHLE1BQUFBLGNBQWMsQ0FBQ0ksSUFBZixDQUFvQkYsT0FBcEI7QUFDSCxLQWZvQixDQWlCckI7OztBQUNBLFFBQU1HLGNBQWMsR0FBRzFELENBQUMsQ0FBQyxrQ0FBRCxDQUF4Qjs7QUFDQSxRQUFJMEQsY0FBYyxDQUFDSixNQUFmLEdBQXdCLENBQTVCLEVBQStCO0FBQzNCLFVBQU1LLE9BQU8sR0FBR0gsSUFBSSxDQUFDLGFBQUQsRUFBZ0I7QUFDaEMseUJBQWlCUixLQUFLLENBQUNHLFdBRFM7QUFFaEMsdUJBQWVILEtBQUssQ0FBQ0k7QUFGVyxPQUFoQixDQUFwQjtBQUlBTSxNQUFBQSxjQUFjLENBQUNELElBQWYsQ0FBb0JFLE9BQXBCO0FBQ0g7QUFDSixHQTdJWTs7QUErSWI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBbkphLDRCQW1KSVosS0FuSkosRUFtSlc7QUFDcEI7QUFDQTtBQUNBLFFBQUksQ0FBQ0EsS0FBSyxDQUFDQyxPQUFQLElBQWtCLENBQUNELEtBQUssQ0FBQ0UsUUFBN0IsRUFBdUM7QUFDbkM7QUFDSCxLQUxtQixDQU9wQjs7O0FBQ0EsUUFBTVcsU0FBUyxHQUFHN0QsQ0FBQyxDQUFDLDBCQUFELENBQW5COztBQUNBLFFBQUk2RCxTQUFTLENBQUNQLE1BQVYsR0FBbUIsQ0FBdkIsRUFBMEI7QUFDdEIsVUFBTVEsWUFBWSxHQUFHTixJQUFJLENBQUMsa0JBQUQsRUFBcUI7QUFDMUMsb0JBQVlSLEtBQUssQ0FBQ0M7QUFEd0IsT0FBckIsQ0FBekI7QUFHQVksTUFBQUEsU0FBUyxDQUFDRSxJQUFWLENBQWVELFlBQWY7QUFDSCxLQWRtQixDQWdCcEI7OztBQUNBLFFBQU1FLFNBQVMsR0FBR2hFLENBQUMsQ0FBQywwQkFBRCxDQUFuQjs7QUFDQSxRQUFJZ0UsU0FBUyxDQUFDVixNQUFWLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3RCLFVBQU1XLFlBQVksR0FBR1QsSUFBSSxDQUFDLGtCQUFELEVBQXFCO0FBQzFDLG9CQUFZUixLQUFLLENBQUNFO0FBRHdCLE9BQXJCLENBQXpCO0FBR0FjLE1BQUFBLFNBQVMsQ0FBQ0QsSUFBVixDQUFlRSxZQUFmO0FBQ0g7QUFDSixHQTNLWTs7QUE2S2I7QUFDSjtBQUNBO0FBQ0kxQyxFQUFBQSx3QkFoTGEsc0NBZ0xjO0FBQ3ZCdkIsSUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEJrRSxJQUE1QixDQUFpQyxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDN0MsVUFBTUMsR0FBRyxHQUFHckUsQ0FBQyxDQUFDb0UsR0FBRCxDQUFELENBQU9FLElBQVAsQ0FBWSxVQUFaLENBQVo7QUFDQSxVQUFNQyxhQUFhLEdBQUd2RSxDQUFDLGlCQUFVcUUsR0FBVixlQUF2QjtBQUNBLFVBQU1HLGFBQWEsR0FBR0QsYUFBYSxDQUFDbEQsUUFBZCxDQUF1QixZQUF2QixDQUF0QixDQUg2QyxDQUs3Qzs7QUFDQSxVQUFNb0QsUUFBUSxHQUFHekUsQ0FBQywrQkFBdUJxRSxHQUF2QixTQUFsQixDQU42QyxDQU83Qzs7QUFDQSxVQUFNSyxlQUFlLEdBQUcxRSxDQUFDLG1CQUFZcUUsR0FBWixlQUF6Qjs7QUFFQSxVQUFJRyxhQUFKLEVBQW1CO0FBQ2Y7QUFDQUMsUUFBQUEsUUFBUSxDQUFDRSxJQUFULENBQWMsVUFBZCxFQUEwQixJQUExQjtBQUNBRixRQUFBQSxRQUFRLENBQUNHLE9BQVQsQ0FBaUIsUUFBakIsRUFBMkJoRCxRQUEzQixDQUFvQyxVQUFwQztBQUNBOEMsUUFBQUEsZUFBZSxDQUFDOUMsUUFBaEIsQ0FBeUIsVUFBekI7QUFDQTVCLFFBQUFBLENBQUMscUJBQWNxRSxHQUFkLEVBQUQsQ0FBc0JRLEdBQXRCLENBQTBCLEVBQTFCO0FBQ0gsT0FORCxNQU1PO0FBQ0g7QUFDQUosUUFBQUEsUUFBUSxDQUFDRSxJQUFULENBQWMsVUFBZCxFQUEwQixLQUExQjtBQUNBRixRQUFBQSxRQUFRLENBQUNHLE9BQVQsQ0FBaUIsUUFBakIsRUFBMkJyQyxXQUEzQixDQUF1QyxVQUF2QztBQUNBbUMsUUFBQUEsZUFBZSxDQUFDbkMsV0FBaEIsQ0FBNEIsVUFBNUI7QUFDQXZDLFFBQUFBLENBQUMscUJBQWNxRSxHQUFkLEVBQUQsQ0FBc0JRLEdBQXRCLENBQTBCLEdBQTFCO0FBQ0g7O0FBRUQvRSxNQUFBQSxRQUFRLENBQUNnRixlQUFULENBQXlCVCxHQUF6QjtBQUNILEtBekJEOztBQTJCQSxRQUFJckUsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JxQixRQUF0QixDQUErQixZQUEvQixDQUFKLEVBQWtEO0FBQzlDckIsTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkJ1QyxXQUEzQixDQUF1QyxVQUF2QztBQUNILEtBRkQsTUFFTztBQUNIdkMsTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkI0QixRQUEzQixDQUFvQyxVQUFwQztBQUNIO0FBQ0osR0FqTlk7O0FBbU5iO0FBQ0o7QUFDQTtBQUNBO0FBQ0lrRCxFQUFBQSxlQXZOYSwyQkF1TkdDLFFBdk5ILEVBdU5hO0FBRXRCO0FBQ0EsUUFBTUMsU0FBUyxrQkFBV0QsUUFBWCxDQUFmLENBSHNCLENBS3RCOztBQUNBakYsSUFBQUEsUUFBUSxDQUFDUyxhQUFULENBQXVCeUUsU0FBdkIsSUFBb0M7QUFDaENDLE1BQUFBLFVBQVUsRUFBRUQsU0FEb0I7QUFFaEMvRCxNQUFBQSxPQUFPLHNCQUFlOEQsUUFBZixDQUZ5QjtBQUdoQ3JFLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDcUU7QUFGNUIsT0FERztBQUh5QixLQUFwQyxDQU5zQixDQWtCdEI7O0FBQ0EsUUFBTUMsU0FBUyxvQkFBYUosUUFBYixDQUFmLENBbkJzQixDQXNCdEI7O0FBQ0FqRixJQUFBQSxRQUFRLENBQUNTLGFBQVQsQ0FBdUI0RSxTQUF2QixJQUFvQztBQUNoQ2xFLE1BQUFBLE9BQU8sc0JBQWU4RCxRQUFmLENBRHlCO0FBRWhDRSxNQUFBQSxVQUFVLEVBQUVFLFNBRm9CO0FBR2hDekUsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLGtCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDdUU7QUFGNUIsT0FERyxFQUtIO0FBQ0l6RSxRQUFBQSxJQUFJLHNCQUFlb0UsUUFBZixNQURSO0FBRUluRSxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3dFO0FBRjVCLE9BTEc7QUFIeUIsS0FBcEMsQ0F2QnNCLENBdUN0Qjs7QUFDQSxRQUFNQyxXQUFXLG9CQUFhUCxRQUFiLENBQWpCLENBeENzQixDQTBDdEI7QUFDQTs7QUFDQSxRQUFJQSxRQUFRLEtBQUssQ0FBYixJQUFrQkEsUUFBUSxLQUFLLEdBQW5DLEVBQXdDO0FBQ3BDakYsTUFBQUEsUUFBUSxDQUFDUyxhQUFULENBQXVCK0UsV0FBdkIsSUFBc0M7QUFDbENMLFFBQUFBLFVBQVUsRUFBRUssV0FEc0I7QUFFbENyRSxRQUFBQSxPQUFPLHNCQUFlOEQsUUFBZixDQUYyQjtBQUVDO0FBQ25DckUsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsVUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUMwRTtBQUY1QixTQURHLEVBS0g7QUFDSTVFLFVBQUFBLElBQUksRUFBRSxRQURWO0FBRUlDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDMkU7QUFGNUIsU0FMRztBQUgyQixPQUF0QztBQWNILEtBZkQsTUFlTztBQUNIMUYsTUFBQUEsUUFBUSxDQUFDUyxhQUFULENBQXVCK0UsV0FBdkIsSUFBc0M7QUFDbENMLFFBQUFBLFVBQVUsRUFBRUssV0FEc0I7QUFFbENyRSxRQUFBQSxPQUFPLG9CQUFhOEQsUUFBYixDQUYyQjtBQUVEO0FBQ2pDckUsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsVUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUMwRTtBQUY1QixTQURHLEVBS0g7QUFDSTVFLFVBQUFBLElBQUksRUFBRSxRQURWO0FBRUlDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDMkU7QUFGNUIsU0FMRztBQUgyQixPQUF0QztBQWNILEtBMUVxQixDQTRFdEI7O0FBRUgsR0FyU1k7O0FBdVNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBNVNhLDRCQTRTSUMsUUE1U0osRUE0U2M7QUFDdkI7QUFDQSxRQUFNQyxNQUFNLEdBQUdDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjLEVBQWQsRUFBa0JILFFBQWxCLENBQWY7QUFDQUMsSUFBQUEsTUFBTSxDQUFDRyxJQUFQLEdBQWMsRUFBZCxDQUh1QixDQUt2Qjs7QUFDQUgsSUFBQUEsTUFBTSxDQUFDRyxJQUFQLENBQVlDLFlBQVosR0FBMkI1RCxtQkFBbUIsQ0FBQzZELGFBQXBCLEVBQTNCLENBTnVCLENBUXZCO0FBQ0E7O0FBQ0FsRyxJQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JnRyxJQUFsQixDQUF1QiwwRUFBdkIsRUFBbUcvQixJQUFuRyxDQUF3RyxZQUFXO0FBQy9HLFVBQU1nQyxNQUFNLEdBQUdsRyxDQUFDLENBQUMsSUFBRCxDQUFoQjtBQUNBLFVBQU1tRyxJQUFJLEdBQUdELE1BQU0sQ0FBQzVCLElBQVAsQ0FBWSxNQUFaLENBQWI7O0FBQ0EsVUFBSTZCLElBQUosRUFBVTtBQUNOLFlBQU1DLEtBQUssR0FBR0YsTUFBTSxDQUFDckIsR0FBUCxFQUFkLENBRE0sQ0FFTjs7QUFDQWMsUUFBQUEsTUFBTSxDQUFDRyxJQUFQLENBQVlLLElBQVosSUFBcUJDLEtBQUssS0FBSyxJQUFWLElBQWtCQSxLQUFLLEtBQUtDLFNBQTdCLEdBQTBDQyxNQUFNLENBQUNGLEtBQUQsQ0FBaEQsR0FBMEQsRUFBOUU7QUFDSDtBQUNKLEtBUkQsRUFWdUIsQ0FvQnZCOztBQUNBdEcsSUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCZ0csSUFBbEIsQ0FBdUIsUUFBdkIsRUFBaUMvQixJQUFqQyxDQUFzQyxZQUFXO0FBQzdDLFVBQU1xQyxPQUFPLEdBQUd2RyxDQUFDLENBQUMsSUFBRCxDQUFqQjtBQUNBLFVBQU1tRyxJQUFJLEdBQUdJLE9BQU8sQ0FBQ2pDLElBQVIsQ0FBYSxNQUFiLENBQWI7O0FBQ0EsVUFBSTZCLElBQUosRUFBVTtBQUNOLFlBQU1DLEtBQUssR0FBR0csT0FBTyxDQUFDMUIsR0FBUixFQUFkLENBRE0sQ0FFTjs7QUFDQWMsUUFBQUEsTUFBTSxDQUFDRyxJQUFQLENBQVlLLElBQVosSUFBcUJDLEtBQUssS0FBSyxJQUFWLElBQWtCQSxLQUFLLEtBQUtDLFNBQTdCLEdBQTBDQyxNQUFNLENBQUNGLEtBQUQsQ0FBaEQsR0FBMEQsRUFBOUU7QUFDSDtBQUNKLEtBUkQsRUFyQnVCLENBK0J2QjtBQUNBOztBQUNBVCxJQUFBQSxNQUFNLENBQUNHLElBQVAsQ0FBWVUsTUFBWixHQUFxQnhHLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCcUIsUUFBdEIsQ0FBK0IsWUFBL0IsQ0FBckIsQ0FqQ3VCLENBbUN2Qjs7QUFDQSxRQUFNb0YsY0FBYyxHQUFHM0csUUFBUSxDQUFDRyxRQUFULENBQWtCZ0csSUFBbEIsQ0FBdUIsb0NBQXZCLEVBQTZEUyxNQUE3RCxDQUFvRSxXQUFwRSxDQUF2Qjs7QUFDQSxRQUFJRCxjQUFjLENBQUNuRCxNQUFmLEdBQXdCLENBQTVCLEVBQStCO0FBQzNCcUMsTUFBQUEsTUFBTSxDQUFDRyxJQUFQLENBQVlhLG9CQUFaLEdBQW1DRixjQUFjLENBQUNwRixRQUFmLENBQXdCLFlBQXhCLENBQW5DO0FBQ0gsS0FGRCxNQUVPO0FBQ0hzRSxNQUFBQSxNQUFNLENBQUNHLElBQVAsQ0FBWWEsb0JBQVosR0FBbUMsS0FBbkM7QUFDSCxLQXpDc0IsQ0EyQ3ZCOzs7QUFDQTdHLElBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQmdHLElBQWxCLENBQXVCLGdCQUF2QixFQUF5Qy9CLElBQXpDLENBQThDLFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUMxRCxVQUFNd0MsT0FBTyxHQUFHNUcsQ0FBQyxDQUFDb0UsR0FBRCxDQUFELENBQU9FLElBQVAsQ0FBWSxJQUFaLENBQWhCO0FBQ0EsVUFBTXVDLEtBQUssR0FBR0QsT0FBTyxDQUFDRSxPQUFSLENBQWdCLE9BQWhCLEVBQXlCLEVBQXpCLEVBQTZCQSxPQUE3QixDQUFxQyxXQUFyQyxFQUFrRCxFQUFsRCxDQUFkLENBRjBELENBSTFEOztBQUNBLFVBQU1DLFNBQVMsR0FBRy9HLENBQUMsQ0FBQ29FLEdBQUQsQ0FBbkI7QUFDQSxVQUFNOEIsTUFBTSxHQUFHYSxTQUFTLENBQUNkLElBQVYsQ0FBZSx3QkFBZixDQUFmO0FBQ0EsVUFBTWUsVUFBVSxHQUFHRCxTQUFTLENBQUNFLFFBQVYsQ0FBbUIsVUFBbkIsS0FBa0NmLE1BQU0sQ0FBQ3ZCLElBQVAsQ0FBWSxVQUFaLENBQXJEOztBQUVBLFVBQUlxQyxVQUFKLEVBQWdCO0FBQ1o7QUFDQXJCLFFBQUFBLE1BQU0sQ0FBQ0csSUFBUCxnQkFBb0JlLEtBQXBCLEtBQStCWCxNQUFNLENBQUN2QixJQUFQLENBQVksU0FBWixNQUEyQixJQUExRDtBQUNILE9BSEQsTUFHTztBQUNIO0FBQ0FnQixRQUFBQSxNQUFNLENBQUNHLElBQVAsZ0JBQW9CZSxLQUFwQixLQUErQkUsU0FBUyxDQUFDMUYsUUFBVixDQUFtQixZQUFuQixDQUEvQjtBQUNIO0FBQ0osS0FoQkQsRUE1Q3VCLENBOER2Qjs7QUFDQSxRQUFNNkYsYUFBYSxHQUFHbEgsQ0FBQyxDQUFDLDBDQUFELENBQXZCOztBQUNBLFFBQUlrSCxhQUFhLENBQUM1RCxNQUFkLEdBQXVCLENBQTNCLEVBQThCO0FBQzFCcUMsTUFBQUEsTUFBTSxDQUFDRyxJQUFQLENBQVlxQixrQkFBWixHQUFpQ2IsTUFBTSxDQUFDWSxhQUFhLENBQUNyQyxHQUFkLEVBQUQsQ0FBdkM7QUFDSCxLQWxFc0IsQ0FvRXZCO0FBQ0E7OztBQUVBLFdBQU9jLE1BQVA7QUFDSCxHQXBYWTs7QUFzWGI7QUFDSjtBQUNBO0FBQ0E7QUFDSXlCLEVBQUFBLGVBMVhhLDJCQTBYRzlFLFFBMVhILEVBMFhhLENBQ3RCO0FBQ0gsR0E1WFk7O0FBOFhiO0FBQ0o7QUFDQTtBQUNJSixFQUFBQSxjQWpZYSw0QkFpWUk7QUFDYm1GLElBQUFBLElBQUksQ0FBQ3BILFFBQUwsR0FBZ0JILFFBQVEsQ0FBQ0csUUFBekI7QUFDQW9ILElBQUFBLElBQUksQ0FBQ0MsR0FBTCxHQUFXLEdBQVgsQ0FGYSxDQUVHOztBQUNoQkQsSUFBQUEsSUFBSSxDQUFDOUcsYUFBTCxHQUFxQlQsUUFBUSxDQUFDUyxhQUE5QixDQUhhLENBR2dDOztBQUM3QzhHLElBQUFBLElBQUksQ0FBQzVCLGdCQUFMLEdBQXdCM0YsUUFBUSxDQUFDMkYsZ0JBQWpDLENBSmEsQ0FJc0M7O0FBQ25ENEIsSUFBQUEsSUFBSSxDQUFDRCxlQUFMLEdBQXVCdEgsUUFBUSxDQUFDc0gsZUFBaEMsQ0FMYSxDQUtvQzs7QUFDakRDLElBQUFBLElBQUksQ0FBQ0UsTUFBTCxHQUFjLElBQWQsQ0FOYSxDQU1PO0FBRXBCOztBQUNBRixJQUFBQSxJQUFJLENBQUNHLFdBQUwsQ0FBaUJDLE9BQWpCLEdBQTJCLElBQTNCO0FBQ0FKLElBQUFBLElBQUksQ0FBQ0csV0FBTCxDQUFpQkUsU0FBakIsR0FBNkJDLFVBQTdCO0FBQ0FOLElBQUFBLElBQUksQ0FBQ0csV0FBTCxDQUFpQkksVUFBakIsR0FBOEIsWUFBOUIsQ0FYYSxDQWFiOztBQUNBUCxJQUFBQSxJQUFJLENBQUNRLG1CQUFMLGFBQThCQyxhQUE5QjtBQUNBVCxJQUFBQSxJQUFJLENBQUNVLG9CQUFMLGFBQStCRCxhQUEvQjtBQUVBVCxJQUFBQSxJQUFJLENBQUNsRyxVQUFMO0FBQ0gsR0FuWlk7O0FBcVpiO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxpQkF4WmEsK0JBd1pPO0FBQ2hCdUcsSUFBQUEsVUFBVSxDQUFDSyxTQUFYLENBQXFCLFVBQUMxRixRQUFELEVBQWM7QUFDL0IsVUFBSUEsUUFBUSxDQUFDcUQsTUFBVCxJQUFtQnJELFFBQVEsQ0FBQ3dELElBQWhDLEVBQXNDO0FBQ2xDaEcsUUFBQUEsUUFBUSxDQUFDbUksWUFBVCxDQUFzQjNGLFFBQVEsQ0FBQ3dELElBQS9CLEVBRGtDLENBR2xDOztBQUNBaEcsUUFBQUEsUUFBUSxDQUFDeUIsd0JBQVQsR0FKa0MsQ0FNbEM7O0FBQ0EsWUFBSWUsUUFBUSxDQUFDd0QsSUFBVCxDQUFjb0MsUUFBbEIsRUFBNEI7QUFDeEJwSSxVQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JtQyxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxXQUFwQyxFQUFpRCxHQUFqRDtBQUNBdEMsVUFBQUEsUUFBUSxDQUFDUSxvQkFBVCxDQUE4QitCLElBQTlCO0FBQ0g7QUFDSixPQVhELE1BV087QUFDSDhGLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QjlGLFFBQVEsQ0FBQytGLFFBQXJDO0FBQ0g7QUFDSixLQWZEO0FBZ0JILEdBemFZOztBQTJhYjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsbUJBOWFhLCtCQThhT3hDLElBOWFQLEVBOGFhO0FBQ3RCLFFBQU15QyxLQUFLLEdBQUd2SSxDQUFDLENBQUMsc0JBQUQsQ0FBZjtBQUNBLFFBQU13SSxRQUFRLEdBQUd4SSxDQUFDLENBQUMseUJBQUQsQ0FBbEIsQ0FGc0IsQ0FJdEI7O0FBQ0F1SSxJQUFBQSxLQUFLLENBQUNFLEtBQU47QUFDQUQsSUFBQUEsUUFBUSxDQUFDQyxLQUFULEdBTnNCLENBUXRCOztBQUNBM0MsSUFBQUEsSUFBSSxDQUFDNEMsVUFBTCxDQUFnQkMsT0FBaEIsQ0FBd0IsVUFBQ0MsS0FBRCxFQUFRekUsS0FBUixFQUFrQjtBQUN0QyxVQUFNMEUsS0FBSyxHQUFHRCxLQUFLLENBQUNFLEVBQXBCO0FBQ0EsVUFBTUMsUUFBUSxhQUFNSCxLQUFLLENBQUN6QyxJQUFOLElBQWN5QyxLQUFLLGFBQXpCLGVBQXdDQSxLQUFLLGFBQTdDLFNBQTBEQSxLQUFLLENBQUNJLE1BQU4sS0FBaUIsR0FBakIsSUFBd0JKLEtBQUssQ0FBQ0ksTUFBTixLQUFpQixDQUF6QyxjQUFpREosS0FBSyxDQUFDSSxNQUF2RCxJQUFrRSxFQUE1SCxNQUFkO0FBQ0EsVUFBTUMsUUFBUSxHQUFHOUUsS0FBSyxLQUFLLENBQTNCLENBSHNDLENBS3RDOztBQUNBb0UsTUFBQUEsS0FBSyxDQUFDVyxNQUFOLDZDQUNxQkQsUUFBUSxHQUFHLFFBQUgsR0FBYyxFQUQzQywyQkFDNERKLEtBRDVELHNDQUVVRSxRQUZWLDJDQU5zQyxDQVl0QztBQUNBOztBQUNBLFVBQU1JLFNBQVMsR0FBR0MsUUFBUSxDQUFDUixLQUFLLENBQUNJLE1BQVAsRUFBZSxFQUFmLENBQVIsR0FBNkIsQ0FBL0M7QUFDQSxVQUFNSyxZQUFZLEdBQUdGLFNBQVMsc0dBQzRDTixLQUQ1QyxrRUFFTWhJLGVBQWUsQ0FBQ3lJLHlCQUZ0Qiw0Q0FJMUIsRUFKSjtBQU1BZCxNQUFBQSxRQUFRLENBQUNVLE1BQVQsQ0FBZ0JwSixRQUFRLENBQUN5SixtQkFBVCxDQUE2QlgsS0FBN0IsRUFBb0NLLFFBQXBDLEVBQThDSSxZQUE5QyxDQUFoQjtBQUNILEtBdEJELEVBVHNCLENBaUN0Qjs7QUFDQSxRQUFJdkQsSUFBSSxDQUFDMEQsUUFBVCxFQUFtQjtBQUNmLFVBQU1BLFFBQVEsR0FBRzFELElBQUksQ0FBQzBELFFBQXRCO0FBQ0FBLE1BQUFBLFFBQVEsQ0FBQ1YsRUFBVCxHQUFjLENBQWQsQ0FGZSxDQUlmOztBQUNBUCxNQUFBQSxLQUFLLENBQUNXLE1BQU4sNklBTGUsQ0FXZjs7QUFDQVYsTUFBQUEsUUFBUSxDQUFDVSxNQUFULENBQWdCcEosUUFBUSxDQUFDMkosa0JBQVQsQ0FBNEJELFFBQTVCLEVBQXNDMUQsSUFBSSxDQUFDNEMsVUFBM0MsQ0FBaEIsRUFaZSxDQWNmOztBQUNBLFVBQU1nQixrQkFBa0IsR0FBRyxFQUEzQjtBQUNBNUQsTUFBQUEsSUFBSSxDQUFDNEMsVUFBTCxDQUFnQkMsT0FBaEIsQ0FBd0IsVUFBQUMsS0FBSyxFQUFJO0FBQzdCLFlBQUksQ0FBQ2Msa0JBQWtCLENBQUNkLEtBQUssYUFBTixDQUF2QixFQUEwQztBQUN0Q2MsVUFBQUEsa0JBQWtCLENBQUNkLEtBQUssYUFBTixDQUFsQixHQUFzQztBQUNsQ3hDLFlBQUFBLEtBQUssRUFBRXdDLEtBQUssQ0FBQ0UsRUFBTixDQUFTYSxRQUFULEVBRDJCO0FBRWxDNUYsWUFBQUEsSUFBSSxFQUFFNkUsS0FBSyxhQUZ1QjtBQUdsQ3pDLFlBQUFBLElBQUksRUFBRXlDLEtBQUs7QUFIdUIsV0FBdEM7QUFLSDtBQUNKLE9BUkQ7QUFVQSxVQUFNZ0Isd0JBQXdCLEdBQUdoRSxNQUFNLENBQUNpRSxNQUFQLENBQWNILGtCQUFkLENBQWpDO0FBRUFJLE1BQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQyxhQUFyQyxFQUFvRDtBQUFFQyxRQUFBQSxXQUFXLEVBQUU7QUFBZixPQUFwRCxFQUF5RTtBQUNyRUMsUUFBQUEsYUFBYSxFQUFFTCx3QkFEc0Q7QUFFckVNLFFBQUFBLFdBQVcsRUFBRXJKLGVBQWUsQ0FBQ3NKLGtCQUZ3QztBQUdyRUMsUUFBQUEsVUFBVSxFQUFFO0FBSHlELE9BQXpFO0FBS0gsS0FuRXFCLENBcUV0Qjs7O0FBQ0F0RSxJQUFBQSxJQUFJLENBQUM0QyxVQUFMLENBQWdCQyxPQUFoQixDQUF3QixVQUFDQyxLQUFELEVBQVc7QUFDL0IsVUFBTXlCLFNBQVMsb0JBQWF6QixLQUFLLENBQUNFLEVBQW5CLENBQWY7QUFDQSxVQUFNd0IsUUFBUSxHQUFHLEVBQWpCLENBRitCLENBRy9COztBQUNBQSxNQUFBQSxRQUFRLENBQUNELFNBQUQsQ0FBUixHQUFzQi9ELE1BQU0sQ0FBQ3NDLEtBQUssQ0FBQzJCLE1BQU4sSUFBZ0IsSUFBakIsQ0FBNUI7QUFFQVQsTUFBQUEsc0JBQXNCLENBQUNDLGFBQXZCLENBQXFDTSxTQUFyQyxFQUFnREMsUUFBaEQsRUFBMEQ7QUFDdERMLFFBQUFBLGFBQWEsRUFBRW5LLFFBQVEsQ0FBQzBLLHFCQUFULEVBRHVDO0FBRXRETixRQUFBQSxXQUFXLEVBQUVySixlQUFlLENBQUM0SixvQkFGeUI7QUFHdERMLFFBQUFBLFVBQVUsRUFBRSxLQUgwQztBQUl0RE0sUUFBQUEsaUJBQWlCLEVBQUUsQ0FBQyxRQUFELENBSm1DLENBSXZCOztBQUp1QixPQUExRDtBQU1ILEtBWkQsRUF0RXNCLENBb0Z0Qjs7QUFDQSxRQUFJNUUsSUFBSSxDQUFDMEQsUUFBVCxFQUFtQjtBQUNmTSxNQUFBQSxzQkFBc0IsQ0FBQ0MsYUFBdkIsQ0FBcUMsVUFBckMsRUFBaUQ7QUFBRVksUUFBQUEsUUFBUSxFQUFFO0FBQVosT0FBakQsRUFBcUU7QUFDakVWLFFBQUFBLGFBQWEsRUFBRW5LLFFBQVEsQ0FBQzBLLHFCQUFULEVBRGtEO0FBRWpFTixRQUFBQSxXQUFXLEVBQUVySixlQUFlLENBQUM0SixvQkFGb0M7QUFHakVMLFFBQUFBLFVBQVUsRUFBRSxLQUhxRDtBQUlqRU0sUUFBQUEsaUJBQWlCLEVBQUUsQ0FBQyxRQUFELENBSjhDLENBSWxDOztBQUprQyxPQUFyRTtBQU1ILEtBNUZxQixDQThGdEI7OztBQUNBMUssSUFBQUEsQ0FBQyxDQUFDLDRCQUFELENBQUQsQ0FBZ0M0SyxHQUFoQztBQUNBNUssSUFBQUEsQ0FBQyxDQUFDLDRCQUFELENBQUQsQ0FBZ0M2SyxLQUFoQyxHQUF3Qy9ILE9BQXhDLENBQWdELE9BQWhELEVBaEdzQixDQWtHdEI7O0FBQ0FYLElBQUFBLG1CQUFtQixDQUFDMkksZ0JBQXBCLEdBbkdzQixDQXFHdEI7QUFDQTtBQUNBOztBQUNBOUssSUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUIrSyxHQUF2QixDQUEyQixPQUEzQixFQUFvQ3RKLEVBQXBDLENBQXVDLE9BQXZDLEVBQWdELFVBQVNDLENBQVQsRUFBWTtBQUN4REEsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsVUFBTXFKLE9BQU8sR0FBR2hMLENBQUMsQ0FBQyxJQUFELENBQWpCO0FBQ0EsVUFBTWlMLFdBQVcsR0FBR0QsT0FBTyxDQUFDMUcsSUFBUixDQUFhLFlBQWIsQ0FBcEIsQ0FId0QsQ0FLeEQ7O0FBQ0F0RSxNQUFBQSxDQUFDLDZDQUFxQ2lMLFdBQXJDLFNBQUQsQ0FBdURDLE1BQXZELEdBTndELENBUXhEOztBQUNBLFVBQU1DLFdBQVcsR0FBR25MLENBQUMsbURBQTJDaUwsV0FBM0MsU0FBckI7QUFDQUUsTUFBQUEsV0FBVyxDQUFDRCxNQUFaLEdBVndELENBWXhEOztBQUNBcEwsTUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCaUosTUFBbEIsa0RBQWdFK0IsV0FBaEUsd0JBYndELENBZXhEOztBQUNBLFVBQU1HLFNBQVMsR0FBR3BMLENBQUMsQ0FBQyw2QkFBRCxDQUFELENBQWlDNkssS0FBakMsRUFBbEI7O0FBQ0EsVUFBSU8sU0FBUyxDQUFDOUgsTUFBVixHQUFtQixDQUF2QixFQUEwQjtBQUN0QjhILFFBQUFBLFNBQVMsQ0FBQ1IsR0FBVixDQUFjLFlBQWQsRUFBNEJRLFNBQVMsQ0FBQzlHLElBQVYsQ0FBZSxVQUFmLENBQTVCO0FBQ0gsT0FuQnVELENBcUJ4RDs7O0FBQ0EsVUFBSStDLElBQUksQ0FBQ2dFLGFBQVQsRUFBd0I7QUFDcEJoRSxRQUFBQSxJQUFJLENBQUNpRSxXQUFMO0FBQ0g7QUFDSixLQXpCRCxFQXhHc0IsQ0FtSXRCOztBQUNBdEwsSUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JxQixRQUFwQixDQUE2QjtBQUN6QkMsTUFBQUEsUUFEeUIsc0JBQ2Q7QUFDUHhCLFFBQUFBLFFBQVEsQ0FBQ3lCLHdCQUFUO0FBQ0g7QUFId0IsS0FBN0IsRUFwSXNCLENBMEl0Qjs7QUFDQXZCLElBQUFBLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0JnQyxTQUFoQixDQUEwQjtBQUFDQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjLHFCQUFlO0FBQTdCLEtBQTFCLEVBM0lzQixDQTZJdEI7O0FBQ0FqQyxJQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0QitLLEdBQTVCLENBQWdDLGNBQWhDLEVBQWdEdEosRUFBaEQsQ0FBbUQsY0FBbkQsRUFBbUUsWUFBVztBQUMxRSxVQUFNOEosVUFBVSxHQUFHdkwsQ0FBQyxDQUFDLElBQUQsQ0FBcEI7QUFDQSxVQUFNaUwsV0FBVyxHQUFHTSxVQUFVLENBQUNqSCxJQUFYLENBQWdCLE1BQWhCLEVBQXdCd0MsT0FBeEIsQ0FBZ0MsU0FBaEMsRUFBMkMsRUFBM0MsQ0FBcEI7QUFDQSxVQUFNMEUsU0FBUyxHQUFHcEMsUUFBUSxDQUFDbUMsVUFBVSxDQUFDMUcsR0FBWCxFQUFELEVBQW1CLEVBQW5CLENBQVIsSUFBa0MsQ0FBcEQ7QUFDQSxVQUFNTixhQUFhLEdBQUd2RSxDQUFDLGlCQUFVaUwsV0FBVixlQUF2Qjs7QUFFQSxVQUFJTyxTQUFTLEdBQUcsQ0FBaEIsRUFBbUI7QUFDZjtBQUNBakgsUUFBQUEsYUFBYSxDQUFDM0MsUUFBZCxDQUF1QixVQUF2QjtBQUNBMkMsUUFBQUEsYUFBYSxDQUFDbEQsUUFBZCxDQUF1QixTQUF2QjtBQUNBa0QsUUFBQUEsYUFBYSxDQUFDbEQsUUFBZCxDQUF1QixjQUF2QjtBQUNBa0QsUUFBQUEsYUFBYSxDQUFDMEIsSUFBZCxDQUFtQixPQUFuQixFQUE0QnRCLElBQTVCLENBQWlDLFVBQWpDLEVBQTZDLElBQTdDO0FBQ0gsT0FORCxNQU1PO0FBQ0g7QUFDQUosUUFBQUEsYUFBYSxDQUFDaEMsV0FBZCxDQUEwQixVQUExQjtBQUNBZ0MsUUFBQUEsYUFBYSxDQUFDbEQsUUFBZCxDQUF1QixhQUF2QjtBQUNBa0QsUUFBQUEsYUFBYSxDQUFDMEIsSUFBZCxDQUFtQixPQUFuQixFQUE0QnRCLElBQTVCLENBQWlDLFVBQWpDLEVBQTZDLEtBQTdDO0FBQ0gsT0FqQnlFLENBa0IxRTs7O0FBQ0E3RSxNQUFBQSxRQUFRLENBQUN5Qix3QkFBVDtBQUNILEtBcEJELEVBOUlzQixDQW9LdEI7O0FBQ0F2QixJQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0QjhDLE9BQTVCLENBQW9DLFFBQXBDLEVBcktzQixDQXVLdEI7O0FBQ0E5QyxJQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQnFCLFFBQXJCLEdBeEtzQixDQTBLdEI7O0FBQ0FyQixJQUFBQSxDQUFDLENBQUMsa0NBQUQsQ0FBRCxDQUFzQytLLEdBQXRDLENBQTBDLFFBQTFDLEVBQW9EdEosRUFBcEQsQ0FBdUQsUUFBdkQsRUFBaUUsWUFBVztBQUN4RSxVQUFNZ0ssbUJBQW1CLEdBQUd6TCxDQUFDLENBQUMsSUFBRCxDQUFELENBQVE2RSxHQUFSLEVBQTVCLENBRHdFLENBR3hFOztBQUNBN0UsTUFBQUEsQ0FBQyxDQUFDLCtCQUFELENBQUQsQ0FBbUNxQyxJQUFuQyxHQUp3RSxDQU14RTs7QUFDQXJDLE1BQUFBLENBQUMsOEJBQXVCeUwsbUJBQXZCLEVBQUQsQ0FBK0NDLElBQS9DLEdBUHdFLENBU3hFOztBQUNBMUwsTUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEJrRSxJQUE1QixDQUFpQyxVQUFDQyxLQUFELEVBQVF5RyxHQUFSLEVBQWdCO0FBQzdDLFlBQU1lLElBQUksR0FBRzNMLENBQUMsQ0FBQzRLLEdBQUQsQ0FBZDtBQUNBLFlBQU0vQixLQUFLLEdBQUc4QyxJQUFJLENBQUNySCxJQUFMLENBQVUsVUFBVixDQUFkLENBRjZDLENBSTdDOztBQUNBcUgsUUFBQUEsSUFBSSxDQUFDMUYsSUFBTCxDQUFVLGFBQVYsRUFBeUJpRixNQUF6QixHQUw2QyxDQU83Qzs7QUFDQSxZQUFJckMsS0FBSyxLQUFLNEMsbUJBQWQsRUFBbUM7QUFDL0JFLFVBQUFBLElBQUksQ0FBQ0MsT0FBTCxDQUFhLDRCQUFiO0FBQ0g7QUFDSixPQVhELEVBVndFLENBdUJ4RTs7QUFDQSxVQUFJdkUsSUFBSSxDQUFDZ0UsYUFBVCxFQUF3QjtBQUNwQmhFLFFBQUFBLElBQUksQ0FBQ2lFLFdBQUw7QUFDSDtBQUNKLEtBM0JELEVBM0tzQixDQXdNdEI7O0FBQ0F0TCxJQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQitLLEdBQXBCLENBQXdCLG1CQUF4QixFQUE2Q3RKLEVBQTdDLENBQWdELG1CQUFoRCxFQUFxRSxZQUFXO0FBQzVFLFVBQU1zRixTQUFTLEdBQUcvRyxDQUFDLENBQUMsSUFBRCxDQUFuQjtBQUNBLFVBQU1pTCxXQUFXLEdBQUdsRSxTQUFTLENBQUN6QyxJQUFWLENBQWUsSUFBZixFQUFxQndDLE9BQXJCLENBQTZCLE9BQTdCLEVBQXNDLEVBQXRDLEVBQTBDQSxPQUExQyxDQUFrRCxXQUFsRCxFQUErRCxFQUEvRCxDQUFwQjtBQUNBLFVBQU10QyxhQUFhLEdBQUd1QyxTQUFTLENBQUMxRixRQUFWLENBQW1CLFlBQW5CLENBQXRCLENBSDRFLENBSzVFOztBQUNBLFVBQU13SyxnQkFBZ0IsR0FBRzdMLENBQUMsOEJBQXVCaUwsV0FBdkIsRUFBMUI7QUFDQSxVQUFNYSxpQkFBaUIsR0FBR0QsZ0JBQWdCLENBQUM1RixJQUFqQixDQUFzQixtRkFBdEIsQ0FBMUI7O0FBRUEsVUFBSXpCLGFBQUosRUFBbUI7QUFDZjtBQUNBc0gsUUFBQUEsaUJBQWlCLENBQUNuSCxJQUFsQixDQUF1QixVQUF2QixFQUFtQyxJQUFuQztBQUNBbUgsUUFBQUEsaUJBQWlCLENBQUNsSCxPQUFsQixDQUEwQixRQUExQixFQUFvQ2hELFFBQXBDLENBQTZDLFVBQTdDO0FBQ0gsT0FKRCxNQUlPO0FBQ0g7QUFDQWtLLFFBQUFBLGlCQUFpQixDQUFDbkgsSUFBbEIsQ0FBdUIsVUFBdkIsRUFBbUMsS0FBbkM7QUFDQW1ILFFBQUFBLGlCQUFpQixDQUFDbEgsT0FBbEIsQ0FBMEIsUUFBMUIsRUFBb0NyQyxXQUFwQyxDQUFnRCxVQUFoRDtBQUNIO0FBQ0osS0FsQkQsRUF6TXNCLENBNk50Qjs7QUFDQSxRQUFNMkUsYUFBYSxHQUFHbEgsQ0FBQyxDQUFDLDBDQUFELENBQXZCOztBQUNBLFFBQUlrSCxhQUFhLENBQUM1RCxNQUFkLEdBQXVCLENBQTNCLEVBQThCO0FBQzFCNEQsTUFBQUEsYUFBYSxDQUFDcEUsT0FBZCxDQUFzQixRQUF0QjtBQUNILEtBak9xQixDQW1PdEI7QUFDQTs7O0FBQ0FoRCxJQUFBQSxRQUFRLENBQUN5Qix3QkFBVCxHQXJPc0IsQ0F1T3RCO0FBQ0E7O0FBQ0EsUUFBSThGLElBQUksQ0FBQ2dFLGFBQVQsRUFBd0I7QUFDcEI7QUFDQSxVQUFNVSx5QkFBeUIsR0FBRzFFLElBQUksQ0FBQzJFLGlCQUF2QztBQUNBLFVBQU1DLG1CQUFtQixHQUFHNUUsSUFBSSxDQUFDaUUsV0FBakM7O0FBRUFqRSxNQUFBQSxJQUFJLENBQUMyRSxpQkFBTCxHQUF5QixZQUFXO0FBQ2hDO0FBQ0EsWUFBTUUsY0FBYyxHQUFHcE0sUUFBUSxDQUFDRyxRQUFULENBQWtCbUMsSUFBbEIsQ0FBdUIsWUFBdkIsQ0FBdkIsQ0FGZ0MsQ0FJaEM7O0FBQ0EsWUFBTStKLFlBQVksR0FBRyxFQUFyQjtBQUNBck0sUUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCZ0csSUFBbEIsQ0FBdUIseUJBQXZCLEVBQWtEL0IsSUFBbEQsQ0FBdUQsWUFBVztBQUM5RCxjQUFNa0ksTUFBTSxHQUFHcE0sQ0FBQyxDQUFDLElBQUQsQ0FBaEI7QUFDQSxjQUFNbUcsSUFBSSxHQUFHaUcsTUFBTSxDQUFDOUgsSUFBUCxDQUFZLE1BQVosS0FBdUI4SCxNQUFNLENBQUM5SCxJQUFQLENBQVksSUFBWixDQUFwQzs7QUFDQSxjQUFJNkIsSUFBSixFQUFVO0FBQ04sZ0JBQUlpRyxNQUFNLENBQUM5SCxJQUFQLENBQVksTUFBWixNQUF3QixVQUE1QixFQUF3QztBQUNwQzZILGNBQUFBLFlBQVksQ0FBQ2hHLElBQUQsQ0FBWixHQUFxQmlHLE1BQU0sQ0FBQ0MsRUFBUCxDQUFVLFVBQVYsQ0FBckI7QUFDSCxhQUZELE1BRU8sSUFBSUQsTUFBTSxDQUFDOUgsSUFBUCxDQUFZLE1BQVosTUFBd0IsT0FBNUIsRUFBcUM7QUFDeEMsa0JBQUk4SCxNQUFNLENBQUNDLEVBQVAsQ0FBVSxVQUFWLENBQUosRUFBMkI7QUFDdkJGLGdCQUFBQSxZQUFZLENBQUNoRyxJQUFELENBQVosR0FBcUJpRyxNQUFNLENBQUN2SCxHQUFQLEVBQXJCO0FBQ0g7QUFDSixhQUpNLE1BSUE7QUFDSHNILGNBQUFBLFlBQVksQ0FBQ2hHLElBQUQsQ0FBWixHQUFxQmlHLE1BQU0sQ0FBQ3ZILEdBQVAsRUFBckI7QUFDSDtBQUNKO0FBQ0osU0FkRCxFQU5nQyxDQXNCaEM7O0FBQ0F3QyxRQUFBQSxJQUFJLENBQUNpRixhQUFMLEdBQXFCMUcsTUFBTSxDQUFDQyxNQUFQLENBQWMsRUFBZCxFQUFrQnFHLGNBQWxCLEVBQWtDQyxZQUFsQyxDQUFyQjtBQUNILE9BeEJEOztBQTBCQTlFLE1BQUFBLElBQUksQ0FBQ2lFLFdBQUwsR0FBbUIsWUFBVztBQUMxQjtBQUNBLFlBQU1ZLGNBQWMsR0FBR3BNLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1DLElBQWxCLENBQXVCLFlBQXZCLENBQXZCLENBRjBCLENBSTFCOztBQUNBLFlBQU0rSixZQUFZLEdBQUcsRUFBckI7QUFDQXJNLFFBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQmdHLElBQWxCLENBQXVCLHlCQUF2QixFQUFrRC9CLElBQWxELENBQXVELFlBQVc7QUFDOUQsY0FBTWtJLE1BQU0sR0FBR3BNLENBQUMsQ0FBQyxJQUFELENBQWhCO0FBQ0EsY0FBTW1HLElBQUksR0FBR2lHLE1BQU0sQ0FBQzlILElBQVAsQ0FBWSxNQUFaLEtBQXVCOEgsTUFBTSxDQUFDOUgsSUFBUCxDQUFZLElBQVosQ0FBcEM7O0FBQ0EsY0FBSTZCLElBQUosRUFBVTtBQUNOLGdCQUFJaUcsTUFBTSxDQUFDOUgsSUFBUCxDQUFZLE1BQVosTUFBd0IsVUFBNUIsRUFBd0M7QUFDcEM2SCxjQUFBQSxZQUFZLENBQUNoRyxJQUFELENBQVosR0FBcUJpRyxNQUFNLENBQUNDLEVBQVAsQ0FBVSxVQUFWLENBQXJCO0FBQ0gsYUFGRCxNQUVPLElBQUlELE1BQU0sQ0FBQzlILElBQVAsQ0FBWSxNQUFaLE1BQXdCLE9BQTVCLEVBQXFDO0FBQ3hDLGtCQUFJOEgsTUFBTSxDQUFDQyxFQUFQLENBQVUsVUFBVixDQUFKLEVBQTJCO0FBQ3ZCRixnQkFBQUEsWUFBWSxDQUFDaEcsSUFBRCxDQUFaLEdBQXFCaUcsTUFBTSxDQUFDdkgsR0FBUCxFQUFyQjtBQUNIO0FBQ0osYUFKTSxNQUlBO0FBQ0hzSCxjQUFBQSxZQUFZLENBQUNoRyxJQUFELENBQVosR0FBcUJpRyxNQUFNLENBQUN2SCxHQUFQLEVBQXJCO0FBQ0g7QUFDSjtBQUNKLFNBZEQsRUFOMEIsQ0FzQjFCOztBQUNBLFlBQU0wSCxhQUFhLEdBQUczRyxNQUFNLENBQUNDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCcUcsY0FBbEIsRUFBa0NDLFlBQWxDLENBQXRCOztBQUVBLFlBQUlLLElBQUksQ0FBQ0MsU0FBTCxDQUFlcEYsSUFBSSxDQUFDaUYsYUFBcEIsTUFBdUNFLElBQUksQ0FBQ0MsU0FBTCxDQUFlRixhQUFmLENBQTNDLEVBQTBFO0FBQ3RFbEYsVUFBQUEsSUFBSSxDQUFDcUYsYUFBTCxDQUFtQjlLLFFBQW5CLENBQTRCLFVBQTVCO0FBQ0F5RixVQUFBQSxJQUFJLENBQUNzRixlQUFMLENBQXFCL0ssUUFBckIsQ0FBOEIsVUFBOUI7QUFDSCxTQUhELE1BR087QUFDSHlGLFVBQUFBLElBQUksQ0FBQ3FGLGFBQUwsQ0FBbUJuSyxXQUFuQixDQUErQixVQUEvQjtBQUNBOEUsVUFBQUEsSUFBSSxDQUFDc0YsZUFBTCxDQUFxQnBLLFdBQXJCLENBQWlDLFVBQWpDO0FBQ0g7QUFDSixPQWhDRDs7QUFrQ0EsVUFBSSxPQUFPOEUsSUFBSSxDQUFDMkUsaUJBQVosS0FBa0MsVUFBdEMsRUFBa0Q7QUFDOUMzRSxRQUFBQSxJQUFJLENBQUMyRSxpQkFBTDtBQUNIOztBQUNELFVBQUksT0FBTzNFLElBQUksQ0FBQ3VGLFNBQVosS0FBMEIsVUFBOUIsRUFBMEM7QUFDdEN2RixRQUFBQSxJQUFJLENBQUN1RixTQUFMO0FBQ0g7QUFDSjtBQUNKLEdBL3RCWTs7QUFpdUJiO0FBQ0o7QUFDQTtBQUNJckQsRUFBQUEsbUJBcHVCYSwrQkFvdUJPWCxLQXB1QlAsRUFvdUJjSyxRQXB1QmQsRUFvdUJ3QkksWUFwdUJ4QixFQW91QnNDO0FBQy9DLFFBQU1QLEVBQUUsR0FBR0YsS0FBSyxDQUFDRSxFQUFqQjtBQUNBLFFBQU0rRCxtQkFBbUIsR0FBR2pFLEtBQUssQ0FBQ2tFLFFBQU4sSUFBa0IsS0FBOUMsQ0FGK0MsQ0FJL0M7O0FBQ0EsUUFBTUMsaUJBQWlCLEdBQUdGLG1CQUFtQixHQUFHLEVBQUgsR0FBUSx1QkFBckQ7QUFDQSxRQUFNRyxrQkFBa0IsR0FBR3BFLEtBQUssQ0FBQ3FFLElBQU4sR0FBYSxVQUFiLEdBQTBCLEVBQXJEO0FBQ0EsUUFBTUMsdUJBQXVCLEdBQUd0RSxLQUFLLENBQUNxRSxJQUFOLEdBQWEsVUFBYixHQUEwQixFQUExRDtBQUVBLCtFQUNpRGhFLFFBQVEsR0FBRyxRQUFILEdBQWMsRUFEdkUsMkJBQ3dGSCxFQUR4RiwwRUFFK0NBLEVBRi9DLHdCQUU2REYsS0FBSyxhQUZsRSx3RkFLcUIvSCxlQUFlLENBQUNzTSxnQkFMckMseUlBT2dEckUsRUFQaEQsd0JBTzhERixLQUFLLENBQUN6QyxJQUFOLElBQWMsRUFQNUUsd1BBYThFMkMsRUFiOUUsOEdBYzJFQSxFQWQzRSxnQkFja0YrRCxtQkFBbUIsR0FBRyxTQUFILEdBQWUsRUFkcEgsa0ZBZXdEaE0sZUFBZSxDQUFDdU0sb0JBQWhCLElBQXdDLG9CQWZoRyx5UUFzQjhEeEUsS0FBSyxDQUFDSSxNQUFOLEdBQWUsQ0FBZixHQUFtQixXQUFuQixHQUFpQyxFQXRCL0YsMEJBc0IrR0YsRUF0Qi9HLDRGQXVCd0RBLEVBdkJ4RCxnQkF1QitERixLQUFLLENBQUNJLE1BQU4sR0FBZSxDQUFmLEdBQW1CLEVBQW5CLEdBQXlCSixLQUFLLENBQUNxRSxJQUFOLEdBQWEsU0FBYixHQUF5QixFQXZCakgsY0F1QndIckUsS0FBSyxDQUFDSSxNQUFOLEdBQWUsQ0FBZixHQUFtQixVQUFuQixHQUFnQyxFQXZCeEoscURBd0I2Qm5JLGVBQWUsQ0FBQ3dNLFVBeEI3QyxtS0E2QjZDdkUsRUE3QjdDLDhCQTZCaUVBLEVBN0JqRSxpRkErQm1EQSxFQS9CbkQsNEZBaUN5QmpJLGVBQWUsQ0FBQ3lNLFlBakN6Qyx1S0FtQ3dFeEUsRUFuQ3hFLHdCQW1Dc0ZGLEtBQUssQ0FBQzJFLE1BQU4sSUFBZ0IsRUFuQ3RHLDBKQXVDeUIxTSxlQUFlLENBQUMyTSxjQXZDekMsbUpBeUNzRDFFLEVBekN0RCw4QkF5QzBFQSxFQXpDMUUsd0JBeUN3RkYsS0FBSyxDQUFDMkIsTUFBTixJQUFnQixFQXpDeEcsNEtBK0NxQjFKLGVBQWUsQ0FBQzRNLFNBL0NyQyw2SUFpRG9EM0UsRUFqRHBELHdCQWlEa0VGLEtBQUssQ0FBQ0ksTUFBTixJQUFnQixHQWpEbEYseUhBcUR3Q0YsRUFyRHhDLGdCQXFEK0NpRSxpQkFyRC9DLHlFQXNEaURsTSxlQUFlLENBQUM2TSxtQkFBaEIsSUFBdUMsbUJBdER4RixpR0F5RHlCN00sZUFBZSxDQUFDOE0sV0FBaEIsSUFBK0IsVUF6RHhELHFKQTJEd0Q3RSxFQTNEeEQsd0JBMkRzRUYsS0FBSyxDQUFDZ0YsUUFBTixJQUFrQixFQTNEeEYsb0xBZ0V5Qi9NLGVBQWUsQ0FBQ2dOLFNBQWhCLElBQTZCLFFBaEV0RCxtSkFrRXNEL0UsRUFsRXRELHdCQWtFb0VGLEtBQUssQ0FBQ2tGLE1BQU4sSUFBZ0IsRUFsRXBGLHdMQXVFeUJqTixlQUFlLENBQUNrTixVQXZFekMsZ0ZBd0VrRGIsdUJBeEVsRCxzR0F5RXlFcEUsRUF6RXpFLHdCQXlFdUZGLEtBQUssQ0FBQ29GLE9BQU4sSUFBaUIsRUF6RXhHLGdCQXlFK0doQixrQkF6RS9HLDBKQThFeUJuTSxlQUFlLENBQUNvTixhQTlFekMsZ0ZBK0VrRGYsdUJBL0VsRCx5R0FnRjRFcEUsRUFoRjVFLHdCQWdGMEZGLEtBQUssQ0FBQ3NGLFVBQU4sSUFBb0IsRUFoRjlHLGdCQWdGcUhsQixrQkFoRnJILDBKQXFGeUJuTSxlQUFlLENBQUNzTixlQXJGekMsZ0ZBc0ZrRGpCLHVCQXRGbEQsMkdBdUY4RXBFLEVBdkY5RSx3QkF1RjRGRixLQUFLLENBQUN3RixZQUFOLElBQXNCLEVBdkZsSCxnQkF1RnlIcEIsa0JBdkZ6SCx3SEE0RlUzRCxZQTVGVjtBQStGSCxHQTUwQlk7O0FBODBCYjtBQUNKO0FBQ0E7QUFDSUksRUFBQUEsa0JBajFCYSw4QkFpMUJNRCxRQWoxQk4sRUFpMUJnQmQsVUFqMUJoQixFQWkxQjRCO0FBQ3JDLFFBQU1JLEVBQUUsR0FBRyxDQUFYO0FBRUEsNEZBQzREQSxFQUQ1RCxvRkFHcUJqSSxlQUFlLENBQUNzSixrQkFIckMsZ0pBS3VEckIsRUFMdkQsK0JBSzRFQSxFQUw1RSw0SUFVcUJqSSxlQUFlLENBQUNzTSxnQkFWckMseUlBWWdEckUsRUFaaEQsMEJBWWdFQSxFQVpoRSw4UEFrQnlFQSxFQWxCekUsNEZBbUJ3REEsRUFuQnhELCtEQW9CNkJqSSxlQUFlLENBQUN3TSxVQXBCN0MsbUtBeUI2Q3ZFLEVBekI3Qyw4QkF5QmlFQSxFQXpCakUsaUZBMkJtREEsRUEzQm5ELDRGQTZCeUJqSSxlQUFlLENBQUN5TSxZQTdCekMsdUtBK0J3RXhFLEVBL0J4RSxxS0FtQ3lCakksZUFBZSxDQUFDMk0sY0FuQ3pDLG1KQXFDc0QxRSxFQXJDdEQsOEJBcUMwRUEsRUFyQzFFLHlMQTJDcUJqSSxlQUFlLENBQUM0TSxTQTNDckMsNklBNkNvRDNFLEVBN0NwRDtBQWtESCxHQXQ0Qlk7O0FBdzRCYjtBQUNKO0FBQ0E7QUFDQTtBQUNJMEIsRUFBQUEscUJBNTRCYSxtQ0E0NEJXO0FBQ3BCO0FBQ0EsV0FBTyxDQUNIO0FBQUNwRSxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjckMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBREcsRUFFSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQUZHLEVBR0g7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FIRyxFQUlIO0FBQUNxQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjckMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBSkcsRUFLSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQUxHLEVBTUg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FORyxFQU9IO0FBQUNxQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjckMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBUEcsRUFRSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQVJHLEVBU0g7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FURyxFQVVIO0FBQUNxQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjckMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBVkcsRUFXSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQVhHLEVBWUg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FaRyxFQWFIO0FBQUNxQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjckMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBYkcsRUFjSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWRHLEVBZUg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FmRyxFQWdCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWhCRyxFQWlCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWpCRyxFQWtCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWxCRyxFQW1CSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQW5CRyxFQW9CSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXBCRyxFQXFCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXJCRyxFQXNCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXRCRyxFQXVCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXZCRyxFQXdCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXJDLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQXhCRyxFQXlCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXJDLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQXpCRyxFQTBCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXJDLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTFCRyxFQTJCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXJDLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTNCRyxFQTRCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXJDLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTVCRyxFQTZCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXJDLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTdCRyxFQThCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXJDLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTlCRyxFQStCSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYXJDLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQS9CRyxFQWdDSDtB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UCxLQUFLLEdBQUc7QUFQVixPQUFaO0FBU0gsS0FmRDtBQWdCQSxXQUFPa00sTUFBUDtBQUNIO0FBaFV1QixDQUE1QjtBQW1VQTtBQUNBO0FBQ0E7O0FBQ0FyUSxDQUFDLENBQUN3USxRQUFELENBQUQsQ0FBWWtELEtBQVosQ0FBa0IsWUFBTTtBQUNwQjVULEVBQUFBLFFBQVEsQ0FBQ3FCLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTeXNpbmZvQVBJLCBOZXR3b3JrQVBJLCBVc2VyTWVzc2FnZSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbmV0d29yayBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgbmV0d29ya3NcbiAqL1xuY29uc3QgbmV0d29ya3MgPSB7XG4gICAgJGdldE15SXBCdXR0b246ICQoJyNnZXRteWlwJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbmV0d29yay1mb3JtJyksXG5cbiAgICAkZHJvcERvd25zOiAkKCcjbmV0d29yay1mb3JtIC5kcm9wZG93bicpLFxuICAgICRleHRpcGFkZHI6ICQoJyNleHRpcGFkZHInKSxcbiAgICAkaXBhZGRyZXNzSW5wdXQ6ICQoJy5pcGFkZHJlc3MnKSxcbiAgICB2bGFuc0FycmF5OiB7fSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50cyB3aXRoIHdlIHNob3VsZCBoaWRlIGZyb20gdGhlIGZvcm0gZm9yIGRvY2tlciBpbnN0YWxsYXRpb24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm90U2hvd09uRG9ja2VyRGl2czogJCgnLmRvLW5vdC1zaG93LWlmLWRvY2tlcicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGlwYWRkcjoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcldpdGhQb3J0T3B0aW9uYWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRob3N0bmFtZToge1xuICAgICAgICAgICAgZGVwZW5kczogJ3VzZW5hdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndmFsaWRIb3N0bmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbmV0d29yayBzZXR0aW5ncyBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIExvYWQgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgICAgbmV0d29ya3MubG9hZENvbmZpZ3VyYXRpb24oKTtcblxuICAgICAgICAvLyBIYW5kbGVzIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlICd1c2VuYXQtY2hlY2tib3gnLlxuICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgbmV0d29ya3MuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIERIQ1AgY2hlY2tib3ggaGFuZGxlcnMgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG5cbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBTeXNpbmZvQVBJLmdldEV4dGVybmFsSXBJbmZvKG5ldHdvcmtzLmNiQWZ0ZXJHZXRFeHRlcm5hbElwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIHdpbGwgYmUgYm91bmQgYWZ0ZXIgdGFicyBhcmUgY3JlYXRlZCBkeW5hbWljYWxseVxuICAgICAgICBuZXR3b3Jrcy4kaXBhZGRyZXNzSW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgbmV0d29ya3MuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN0YXRpYyByb3V0ZXMgbWFuYWdlclxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBIaWRlIGZvcm0gZWxlbWVudHMgY29ubmVjdGVkIHdpdGggbm9uIGRvY2tlciBpbnN0YWxsYXRpb25zXG4gICAgICAgIGlmIChuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpcy1kb2NrZXInKT09PVwiMVwiKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZ2V0dGluZyB0aGUgZXh0ZXJuYWwgSVAgZnJvbSBhIHJlbW90ZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyLiBJZiBmYWxzZSwgaW5kaWNhdGVzIGFuIGVycm9yIG9jY3VycmVkLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRFeHRlcm5hbElwKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXh0SXBBZGRyID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGlwYWRkcicpO1xuICAgICAgICAgICAgY29uc3QgcG9ydE1hdGNoID0gY3VycmVudEV4dElwQWRkci5tYXRjaCgvOihcXGQrKSQvKTtcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBwb3J0TWF0Y2ggPyAnOicgKyBwb3J0TWF0Y2hbMV0gOiAnJztcbiAgICAgICAgICAgIGNvbnN0IG5ld0V4dElwQWRkciA9IHJlc3BvbnNlLmlwICsgcG9ydDtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCBuZXdFeHRJcEFkZHIpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgZXh0ZXJuYWwgaG9zdG5hbWUgd2hlbiBnZXR0aW5nIGV4dGVybmFsIElQXG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCAnJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZXh0aXBhZGRyLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgTkFUIGhlbHAgdGV4dCB3aXRoIGFjdHVhbCBwb3J0IHZhbHVlcyBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBvcnRzIC0gUG9ydCBjb25maWd1cmF0aW9uIG9iamVjdCBmcm9tIEFQSVxuICAgICAqL1xuICAgIHVwZGF0ZU5BVEhlbHBUZXh0KHBvcnRzKSB7XG4gICAgICAgIC8vIFdIWTogUG9ydCBrZXlzIG1hdGNoIFBieFNldHRpbmdzIGNvbnN0YW50cyAoU0lQUG9ydCwgVExTX1BPUlQsIFJUUFBvcnRGcm9tLCBSVFBQb3J0VG8pXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHdlIGhhdmUgcG9ydCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgaWYgKCFwb3J0cy5TSVBQb3J0IHx8ICFwb3J0cy5UTFNfUE9SVCB8fCAhcG9ydHMuUlRQUG9ydEZyb20gfHwgIXBvcnRzLlJUUFBvcnRUbykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFNJUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRzaXBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXNpcC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRzaXBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcFRleHQgPSBpMThuKCdud19OQVRJbmZvMycsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0LFxuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBQb3J0VmFsdWVzLmh0bWwoc2lwVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgUlRQIHBvcnRzIHRleHQgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHJ0cFBvcnRWYWx1ZXMgPSAkKCcjbmF0LWhlbHAtcnRwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJHJ0cFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgcnRwVGV4dCA9IGkxOG4oJ253X05BVEluZm80Jywge1xuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogcG9ydHMuUlRQUG9ydEZyb20sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQUG9ydFRvXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRydHBQb3J0VmFsdWVzLmh0bWwocnRwVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBvcnQgZmllbGQgbGFiZWxzIHdpdGggYWN0dWFsIGludGVybmFsIHBvcnQgdmFsdWVzIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcG9ydHMgLSBQb3J0IGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZyb20gQVBJXG4gICAgICovXG4gICAgdXBkYXRlUG9ydExhYmVscyhwb3J0cykge1xuICAgICAgICAvLyBXSFk6IFBvcnQga2V5cyBtYXRjaCBQYnhTZXR0aW5ncyBjb25zdGFudHMgKFNJUFBvcnQsIFRMU19QT1JUKVxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQUG9ydCB8fCAhcG9ydHMuVExTX1BPUlQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBleHRlcm5hbCBTSVAgcG9ydCBsYWJlbCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkc2lwTGFiZWwgPSAkKCcjZXh0ZXJuYWwtc2lwLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRzaXBMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNTSVBQb3J0Jywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUFBvcnRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNpcExhYmVsLnRleHQoc2lwTGFiZWxUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBleHRlcm5hbCBUTFMgcG9ydCBsYWJlbCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkdGxzTGFiZWwgPSAkKCcjZXh0ZXJuYWwtdGxzLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCR0bHNMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCB0bHNMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNUTFNQb3J0Jywge1xuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICR0bHNMYWJlbC50ZXh0KHRsc0xhYmVsVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgJ2Rpc2FibGVkJyBjbGFzcyBmb3Igc3BlY2lmaWMgZmllbGRzIGJhc2VkIG9uIHRoZWlyIGNoZWNrYm94IHN0YXRlLlxuICAgICAqL1xuICAgIHRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpIHtcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV0aCA9ICQob2JqKS5hdHRyKCdkYXRhLXRhYicpO1xuICAgICAgICAgICAgY29uc3QgJGRoY3BDaGVja2JveCA9ICQoYCNkaGNwLSR7ZXRofS1jaGVja2JveGApO1xuICAgICAgICAgICAgY29uc3QgaXNEaGNwRW5hYmxlZCA9ICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAgICAgLy8gRmluZCBJUCBhZGRyZXNzIGFuZCBzdWJuZXQgZmllbGRzXG4gICAgICAgICAgICBjb25zdCAkaXBGaWVsZCA9ICQoYGlucHV0W25hbWU9XCJpcGFkZHJfJHtldGh9XCJdYCk7XG4gICAgICAgICAgICAvLyBEeW5hbWljRHJvcGRvd25CdWlsZGVyIGNyZWF0ZXMgZHJvcGRvd24gd2l0aCBpZCBwYXR0ZXJuOiBmaWVsZE5hbWUtZHJvcGRvd25cbiAgICAgICAgICAgIGNvbnN0ICRzdWJuZXREcm9wZG93biA9ICQoYCNzdWJuZXRfJHtldGh9LWRyb3Bkb3duYCk7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IG1ha2UgSVAvc3VibmV0IHJlYWQtb25seSBhbmQgYWRkIGRpc2FibGVkIGNsYXNzXG4gICAgICAgICAgICAgICAgJGlwRmllbGQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAkaXBGaWVsZC5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkc3VibmV0RHJvcGRvd24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZGlzYWJsZWQgLT4gbWFrZSBJUC9zdWJuZXQgZWRpdGFibGVcbiAgICAgICAgICAgICAgICAkaXBGaWVsZC5wcm9wKCdyZWFkb25seScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkaXBGaWVsZC5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkc3VibmV0RHJvcGRvd24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnMScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXR3b3Jrcy5hZGROZXdGb3JtUnVsZXMoZXRoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJy5uYXRlZC1zZXR0aW5ncy1ncm91cCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgbmV3IGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgYSBzcGVjaWZpYyByb3cgaW4gdGhlIG5ldHdvcmsgY29uZmlndXJhdGlvbiBmb3JtLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdSb3dJZCAtIFRoZSBJRCBvZiB0aGUgbmV3IHJvdyB0byBhZGQgdGhlIGZvcm0gcnVsZXMgZm9yLlxuICAgICAqL1xuICAgIGFkZE5ld0Zvcm1SdWxlcyhuZXdSb3dJZCkge1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAnbmFtZScgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgbmFtZUNsYXNzID0gYG5hbWVfJHtuZXdSb3dJZH1gO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ25hbWUnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbbmFtZUNsYXNzXSA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IG5hbWVDbGFzcyxcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlTmFtZUlzTm90QmVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcblxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAndmxhbmlkJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCB2bGFuQ2xhc3MgPSBgdmxhbmlkXyR7bmV3Um93SWR9YDtcblxuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1t2bGFuQ2xhc3NdID0ge1xuICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiB2bGFuQ2xhc3MsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMC4uNDA5NV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZVZsYW5SYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogYGNoZWNrVmxhblske25ld1Jvd0lkfV1gLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZVZsYW5Dcm9zcyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcblxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAnaXBhZGRyJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCBpcGFkZHJDbGFzcyA9IGBpcGFkZHJfJHtuZXdSb3dJZH1gO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ2lwYWRkcicgZmllbGRcbiAgICAgICAgLy8gRm9yIHRlbXBsYXRlIGludGVyZmFjZSAoaWQ9MCksIGFkZCBkZXBlbmRlbmN5IG9uIGludGVyZmFjZSBzZWxlY3Rpb25cbiAgICAgICAgaWYgKG5ld1Jvd0lkID09PSAwIHx8IG5ld1Jvd0lkID09PSAnMCcpIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbaXBhZGRyQ2xhc3NdID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlwYWRkckNsYXNzLFxuICAgICAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLCAgLy8gVGVtcGxhdGU6IHZhbGlkYXRlIG9ubHkgaWYgaW50ZXJmYWNlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2lwYWRkckNsYXNzXSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpcGFkZHJDbGFzcyxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiBgbm90ZGhjcF8ke25ld1Jvd0lkfWAsICAvLyBSZWFsIGludGVyZmFjZTogdmFsaWRhdGUgb25seSBpZiBESENQIGlzIE9GRlxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gREhDUCB2YWxpZGF0aW9uIHJlbW92ZWQgLSBESENQIGNoZWNrYm94IGlzIGRpc2FibGVkIGZvciBWTEFOIGludGVyZmFjZXNcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBvYmplY3Qgd2l0aCBhbGwgc2V0dGluZ3MgcHJvcGVydGllc1xuICAgICAgICBjb25zdCByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBzZXR0aW5ncyk7XG4gICAgICAgIHJlc3VsdC5kYXRhID0ge307XG5cbiAgICAgICAgLy8gQ29sbGVjdCBzdGF0aWMgcm91dGVzXG4gICAgICAgIHJlc3VsdC5kYXRhLnN0YXRpY1JvdXRlcyA9IFN0YXRpY1JvdXRlc01hbmFnZXIuY29sbGVjdFJvdXRlcygpO1xuXG4gICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgZm9ybSB2YWx1ZXMgdG8gYXZvaWQgYW55IERPTS1yZWxhdGVkIGlzc3Vlc1xuICAgICAgICAvLyBDb2xsZWN0IGFsbCByZWd1bGFyIGlucHV0IGZpZWxkc1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFt0eXBlPVwidGV4dFwiXSwgaW5wdXRbdHlwZT1cImhpZGRlblwiXSwgaW5wdXRbdHlwZT1cIm51bWJlclwiXSwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRpbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IHNlbGVjdCBkcm9wZG93bnNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnc2VsZWN0JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWxlY3QgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRzZWxlY3QuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRzZWxlY3QudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhblxuICAgICAgICAvLyBQYnhBcGlDbGllbnQgd2lsbCBoYW5kbGUgY29udmVyc2lvbiB0byBzdHJpbmdzIGZvciBqUXVlcnlcbiAgICAgICAgcmVzdWx0LmRhdGEudXNlbmF0ID0gJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgLy8gVXNlIGNvcnJlY3QgZmllbGQgbmFtZSBmcm9tIHRoZSBmb3JtIChhdXRvVXBkYXRlRXh0ZXJuYWxJcCwgbm90IEFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQKVxuICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZURpdiA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgIGlmICgkYXV0b1VwZGF0ZURpdi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9ICRhdXRvVXBkYXRlRGl2LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29udmVydCBESENQIGNoZWNrYm94ZXMgdG8gYm9vbGVhbiBmb3IgZWFjaCBpbnRlcmZhY2VcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnLmRoY3AtY2hlY2tib3gnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbnB1dElkID0gJChvYmopLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBjb25zdCByb3dJZCA9IGlucHV0SWQucmVwbGFjZSgnZGhjcC0nLCAnJykucmVwbGFjZSgnLWNoZWNrYm94JywgJycpO1xuXG4gICAgICAgICAgICAvLyBGb3IgZGlzYWJsZWQgY2hlY2tib3hlcywgcmVhZCBhY3R1YWwgaW5wdXQgc3RhdGUgaW5zdGVhZCBvZiBGb21hbnRpYyBVSSBBUElcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQob2JqKTtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICRjaGVja2JveC5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSAkY2hlY2tib3guaGFzQ2xhc3MoJ2Rpc2FibGVkJykgfHwgJGlucHV0LnByb3AoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIGlmIChpc0Rpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIGRpc2FibGVkIGNoZWNrYm94ZXMsIHJlYWQgdGhlIGFjdHVhbCBpbnB1dCBjaGVja2VkIHN0YXRlXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtyb3dJZH1gXSA9ICRpbnB1dC5wcm9wKCdjaGVja2VkJykgPT09IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZvciBlbmFibGVkIGNoZWNrYm94ZXMsIHVzZSBGb21hbnRpYyBVSSBBUElcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtgZGhjcF8ke3Jvd0lkfWBdID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3QgaW50ZXJuZXQgcmFkaW8gYnV0dG9uXG4gICAgICAgIGNvbnN0ICRjaGVja2VkUmFkaW8gPSAkKCdpbnB1dFtuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCJdOmNoZWNrZWQnKTtcbiAgICAgICAgaWYgKCRjaGVja2VkUmFkaW8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuaW50ZXJuZXRfaW50ZXJmYWNlID0gU3RyaW5nKCRjaGVja2VkUmFkaW8udmFsKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV0hZOiBObyBwb3J0IGZpZWxkIG1hcHBpbmcgbmVlZGVkIC0gZm9ybSBmaWVsZCBuYW1lcyBtYXRjaCBBUEkgY29uc3RhbnRzXG4gICAgICAgIC8vIChleHRlcm5hbFNJUFBvcnQgPSBQYnhTZXR0aW5nczo6RVhURVJOQUxfU0lQX1BPUlQpXG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlc3BvbnNlIGhhbmRsZWQgYnkgRm9ybVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBuZXR3b3Jrcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbmV0d29ya3MudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG5ldHdvcmtzLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmlubGluZSA9IHRydWU7IC8vIFNob3cgaW5saW5lIGVycm9ycyBuZXh0IHRvIGZpZWxkc1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE5ldHdvcmtBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlQ29uZmlnJztcblxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfW5ldHdvcmsvbW9kaWZ5L2A7XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbmV0d29yayBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRDb25maWd1cmF0aW9uKCkge1xuICAgICAgICBOZXR3b3JrQVBJLmdldENvbmZpZygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgVUkgYWZ0ZXIgbG9hZGluZyBkYXRhXG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIGZvcm0gZWxlbWVudHMgY29ubmVjdGVkIHdpdGggbm9uIGRvY2tlciBpbnN0YWxsYXRpb25zXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuaXNEb2NrZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2lzLWRvY2tlcicsICcxJyk7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRub3RTaG93T25Eb2NrZXJEaXZzLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgaW50ZXJmYWNlIHRhYnMgYW5kIGZvcm1zIGR5bmFtaWNhbGx5IGZyb20gUkVTVCBBUEkgZGF0YVxuICAgICAqL1xuICAgIGNyZWF0ZUludGVyZmFjZVRhYnMoZGF0YSkge1xuICAgICAgICBjb25zdCAkbWVudSA9ICQoJyNldGgtaW50ZXJmYWNlcy1tZW51Jyk7XG4gICAgICAgIGNvbnN0ICRjb250ZW50ID0gJCgnI2V0aC1pbnRlcmZhY2VzLWNvbnRlbnQnKTtcblxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBjb250ZW50XG4gICAgICAgICRtZW51LmVtcHR5KCk7XG4gICAgICAgICRjb250ZW50LmVtcHR5KCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRhYnMgZm9yIGV4aXN0aW5nIGludGVyZmFjZXNcbiAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goKGlmYWNlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGFiSWQgPSBpZmFjZS5pZDtcbiAgICAgICAgICAgIGNvbnN0IHRhYkxhYmVsID0gYCR7aWZhY2UubmFtZSB8fCBpZmFjZS5pbnRlcmZhY2V9ICgke2lmYWNlLmludGVyZmFjZX0ke2lmYWNlLnZsYW5pZCAhPT0gJzAnICYmIGlmYWNlLnZsYW5pZCAhPT0gMCA/IGAuJHtpZmFjZS52bGFuaWR9YCA6ICcnfSlgO1xuICAgICAgICAgICAgY29uc3QgaXNBY3RpdmUgPSBpbmRleCA9PT0gMDtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRhYiBtZW51IGl0ZW1cbiAgICAgICAgICAgICRtZW51LmFwcGVuZChgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJpdGVtICR7aXNBY3RpdmUgPyAnYWN0aXZlJyA6ICcnfVwiIGRhdGEtdGFiPVwiJHt0YWJJZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgJHt0YWJMYWJlbH1cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRhYiBjb250ZW50XG4gICAgICAgICAgICAvLyBPbmx5IFZMQU4gaW50ZXJmYWNlcyBjYW4gYmUgZGVsZXRlZCAodmxhbmlkID4gMClcbiAgICAgICAgICAgIGNvbnN0IGNhbkRlbGV0ZSA9IHBhcnNlSW50KGlmYWNlLnZsYW5pZCwgMTApID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ1dHRvbiA9IGNhbkRlbGV0ZSA/IGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cInVpIGljb24gbGVmdCBsYWJlbGVkIGJ1dHRvbiBkZWxldGUtaW50ZXJmYWNlXCIgZGF0YS12YWx1ZT1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaFwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19EZWxldGVDdXJyZW50SW50ZXJmYWNlfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGAgOiAnJztcblxuICAgICAgICAgICAgJGNvbnRlbnQuYXBwZW5kKG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRlbXBsYXRlIHRhYiBmb3IgbmV3IFZMQU5cbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZGF0YS50ZW1wbGF0ZTtcbiAgICAgICAgICAgIHRlbXBsYXRlLmlkID0gMDtcblxuICAgICAgICAgICAgLy8gQWRkIFwiK1wiIHRhYiBtZW51IGl0ZW1cbiAgICAgICAgICAgICRtZW51LmFwcGVuZChgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJpdGVtXCIgZGF0YS10YWI9XCIwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBwbHVzXCI+PC9pPlxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGVtcGxhdGUgZm9ybSB3aXRoIGludGVyZmFjZSBzZWxlY3RvclxuICAgICAgICAgICAgJGNvbnRlbnQuYXBwZW5kKG5ldHdvcmtzLmNyZWF0ZVRlbXBsYXRlRm9ybSh0ZW1wbGF0ZSwgZGF0YS5pbnRlcmZhY2VzKSk7XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIGludGVyZmFjZSBzZWxlY3RvciBkcm9wZG93biBmb3IgdGVtcGxhdGVcbiAgICAgICAgICAgIGNvbnN0IHBoeXNpY2FsSW50ZXJmYWNlcyA9IHt9O1xuICAgICAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goaWZhY2UgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcGh5c2ljYWxJbnRlcmZhY2VzW2lmYWNlLmludGVyZmFjZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgcGh5c2ljYWxJbnRlcmZhY2VzW2lmYWNlLmludGVyZmFjZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaWZhY2UuaWQudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGlmYWNlLmludGVyZmFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGlmYWNlLmludGVyZmFjZVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMgPSBPYmplY3QudmFsdWVzKHBoeXNpY2FsSW50ZXJmYWNlcyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignaW50ZXJmYWNlXzAnLCB7IGludGVyZmFjZV8wOiAnJyB9LCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd25zIHVzaW5nIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goKGlmYWNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBgc3VibmV0XyR7aWZhY2UuaWR9YDtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge307XG4gICAgICAgICAgICAvLyBDb252ZXJ0IHN1Ym5ldCB0byBzdHJpbmcgZm9yIGRyb3Bkb3duIG1hdGNoaW5nXG4gICAgICAgICAgICBmb3JtRGF0YVtmaWVsZE5hbWVdID0gU3RyaW5nKGlmYWNlLnN1Ym5ldCB8fCAnMjQnKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddICAvLyBBZGQgc2VhcmNoIGNsYXNzIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIHRlbXBsYXRlIChpZCA9IDApXG4gICAgICAgIGlmIChkYXRhLnRlbXBsYXRlKSB7XG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3N1Ym5ldF8wJywgeyBzdWJuZXRfMDogJzI0JyB9LCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSAgLy8gQWRkIHNlYXJjaCBjbGFzcyBmb3Igc2VhcmNoYWJsZSBkcm9wZG93blxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgLml0ZW0nKS50YWIoKTtcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgLml0ZW0nKS5maXJzdCgpLnRyaWdnZXIoJ2NsaWNrJyk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YXRpYyByb3V0ZXMgc2VjdGlvbiB2aXNpYmlsaXR5XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlVmlzaWJpbGl0eSgpO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIHJlbW92ZXMgVEFCIGZyb20gZm9ybSBhbmQgbWFya3MgaW50ZXJmYWNlIGFzIGRpc2FibGVkXG4gICAgICAgIC8vIEFjdHVhbCBkZWxldGlvbiBoYXBwZW5zIG9uIGZvcm0gc3VibWl0XG4gICAgICAgICQoJy5kZWxldGUtaW50ZXJmYWNlJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBUQUIgbWVudSBpdGVtXG4gICAgICAgICAgICAkKGAjZXRoLWludGVyZmFjZXMtbWVudSBhW2RhdGEtdGFiPVwiJHtpbnRlcmZhY2VJZH1cIl1gKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBUQUIgY29udGVudFxuICAgICAgICAgICAgY29uc3QgJHRhYkNvbnRlbnQgPSAkKGAjZXRoLWludGVyZmFjZXMtY29udGVudCAudGFiW2RhdGEtdGFiPVwiJHtpbnRlcmZhY2VJZH1cIl1gKTtcbiAgICAgICAgICAgICR0YWJDb250ZW50LnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBBZGQgaGlkZGVuIGZpZWxkIHRvIG1hcmsgdGhpcyBpbnRlcmZhY2UgYXMgZGlzYWJsZWRcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmFwcGVuZChgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiZGlzYWJsZWRfJHtpbnRlcmZhY2VJZH1cIiB2YWx1ZT1cIjFcIiAvPmApO1xuXG4gICAgICAgICAgICAvLyBTd2l0Y2ggdG8gZmlyc3QgYXZhaWxhYmxlIHRhYlxuICAgICAgICAgICAgY29uc3QgJGZpcnN0VGFiID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYS5pdGVtJykuZmlyc3QoKTtcbiAgICAgICAgICAgIGlmICgkZmlyc3RUYWIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRmaXJzdFRhYi50YWIoJ2NoYW5nZSB0YWInLCAkZmlyc3RUYWIuYXR0cignZGF0YS10YWInKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzdWJtaXQgYnV0dG9uXG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1iaW5kIERIQ1AgY2hlY2tib3ggaGFuZGxlcnNcbiAgICAgICAgJCgnLmRoY3AtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgSVAgYWRkcmVzcyBpbnB1dCBtYXNrc1xuICAgICAgICAkKCcuaXBhZGRyZXNzJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgLy8gQWRkIFZMQU4gSUQgY2hhbmdlIGhhbmRsZXJzIHRvIGNvbnRyb2wgREhDUCBjaGVja2JveCBzdGF0ZVxuICAgICAgICAkKCdpbnB1dFtuYW1lXj1cInZsYW5pZF9cIl0nKS5vZmYoJ2lucHV0IGNoYW5nZScpLm9uKCdpbnB1dCBjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICR2bGFuSW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkdmxhbklucHV0LmF0dHIoJ25hbWUnKS5yZXBsYWNlKCd2bGFuaWRfJywgJycpO1xuICAgICAgICAgICAgY29uc3QgdmxhblZhbHVlID0gcGFyc2VJbnQoJHZsYW5JbnB1dC52YWwoKSwgMTApIHx8IDA7XG4gICAgICAgICAgICBjb25zdCAkZGhjcENoZWNrYm94ID0gJChgI2RoY3AtJHtpbnRlcmZhY2VJZH0tY2hlY2tib3hgKTtcblxuICAgICAgICAgICAgaWYgKHZsYW5WYWx1ZSA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBEaXNhYmxlIERIQ1AgY2hlY2tib3ggZm9yIFZMQU4gaW50ZXJmYWNlc1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3NldCBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guZmluZCgnaW5wdXQnKS5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFbmFibGUgREhDUCBjaGVja2JveCBmb3Igbm9uLVZMQU4gaW50ZXJmYWNlc1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3gucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgnc2V0IGVuYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmZpbmQoJ2lucHV0JykucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVcGRhdGUgZGlzYWJsZWQgZmllbGQgY2xhc3Nlc1xuICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgdGhlIGhhbmRsZXIgZm9yIGV4aXN0aW5nIFZMQU4gaW50ZXJmYWNlcyB0byBhcHBseSBpbml0aWFsIHN0YXRlXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwidmxhbmlkX1wiXScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW50ZXJuZXQgcmFkaW8gYnV0dG9ucyB3aXRoIEZvbWFudGljIFVJXG4gICAgICAgICQoJy5pbnRlcm5ldC1yYWRpbycpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gQWRkIGludGVybmV0IHJhZGlvIGJ1dHRvbiBjaGFuZ2UgaGFuZGxlclxuICAgICAgICAkKCdpbnB1dFtuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCJdJykub2ZmKCdjaGFuZ2UnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBzZWxlY3RlZEludGVyZmFjZUlkID0gJCh0aGlzKS52YWwoKTtcblxuICAgICAgICAgICAgLy8gSGlkZSBhbGwgRE5TL0dhdGV3YXkgZ3JvdXBzXG4gICAgICAgICAgICAkKCdbY2xhc3NePVwiZG5zLWdhdGV3YXktZ3JvdXAtXCJdJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBTaG93IEROUy9HYXRld2F5IGdyb3VwIGZvciBzZWxlY3RlZCBpbnRlcm5ldCBpbnRlcmZhY2VcbiAgICAgICAgICAgICQoYC5kbnMtZ2F0ZXdheS1ncm91cC0ke3NlbGVjdGVkSW50ZXJmYWNlSWR9YCkuc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgVEFCIGljb25zIC0gYWRkIGdsb2JlIGljb24gdG8gc2VsZWN0ZWQsIHJlbW92ZSBmcm9tIG90aGVyc1xuICAgICAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCB0YWIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGFiID0gJCh0YWIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhYklkID0gJHRhYi5hdHRyKCdkYXRhLXRhYicpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGV4aXN0aW5nIGdsb2JlIGljb25cbiAgICAgICAgICAgICAgICAkdGFiLmZpbmQoJy5nbG9iZS5pY29uJykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgZ2xvYmUgaWNvbiB0byBzZWxlY3RlZCBpbnRlcm5ldCBpbnRlcmZhY2UgVEFCXG4gICAgICAgICAgICAgICAgaWYgKHRhYklkID09PSBzZWxlY3RlZEludGVyZmFjZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgICR0YWIucHJlcGVuZCgnPGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIEROUy9HYXRld2F5IHJlYWRvbmx5IHN0YXRlIHdoZW4gREhDUCBjaGFuZ2VzXG4gICAgICAgICQoJy5kaGNwLWNoZWNrYm94Jykub2ZmKCdjaGFuZ2UuZG5zZ2F0ZXdheScpLm9uKCdjaGFuZ2UuZG5zZ2F0ZXdheScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGNoZWNrYm94LmF0dHIoJ2lkJykucmVwbGFjZSgnZGhjcC0nLCAnJykucmVwbGFjZSgnLWNoZWNrYm94JywgJycpO1xuICAgICAgICAgICAgY29uc3QgaXNEaGNwRW5hYmxlZCA9ICRjaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgICAgICAvLyBGaW5kIEROUy9HYXRld2F5IGZpZWxkcyBmb3IgdGhpcyBpbnRlcmZhY2VcbiAgICAgICAgICAgIGNvbnN0ICRkbnNHYXRld2F5R3JvdXAgPSAkKGAuZG5zLWdhdGV3YXktZ3JvdXAtJHtpbnRlcmZhY2VJZH1gKTtcbiAgICAgICAgICAgIGNvbnN0ICRkbnNHYXRld2F5RmllbGRzID0gJGRuc0dhdGV3YXlHcm91cC5maW5kKCdpbnB1dFtuYW1lXj1cImdhdGV3YXlfXCJdLCBpbnB1dFtuYW1lXj1cInByaW1hcnlkbnNfXCJdLCBpbnB1dFtuYW1lXj1cInNlY29uZGFyeWRuc19cIl0nKTtcblxuICAgICAgICAgICAgaWYgKGlzRGhjcEVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGVuYWJsZWQgLT4gbWFrZSBETlMvR2F0ZXdheSByZWFkLW9ubHlcbiAgICAgICAgICAgICAgICAkZG5zR2F0ZXdheUZpZWxkcy5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICRkbnNHYXRld2F5RmllbGRzLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGRpc2FibGVkIC0+IG1ha2UgRE5TL0dhdGV3YXkgZWRpdGFibGVcbiAgICAgICAgICAgICAgICAkZG5zR2F0ZXdheUZpZWxkcy5wcm9wKCdyZWFkb25seScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkZG5zR2F0ZXdheUZpZWxkcy5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBpbml0aWFsIFRBQiBpY29uIHVwZGF0ZSBmb3IgY2hlY2tlZCByYWRpbyBidXR0b25cbiAgICAgICAgY29uc3QgJGNoZWNrZWRSYWRpbyA9ICQoJ2lucHV0W25hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIl06Y2hlY2tlZCcpO1xuICAgICAgICBpZiAoJGNoZWNrZWRSYWRpby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkY2hlY2tlZFJhZGlvLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgaW5pdGlhbCBkaXNhYmxlZCBzdGF0ZSBmb3IgREhDUC1lbmFibGVkIGludGVyZmFjZXNcbiAgICAgICAgLy8gQ2FsbCBhZnRlciBhbGwgZHJvcGRvd25zIGFyZSBjcmVhdGVkXG4gICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgIC8vIFJlLXNhdmUgaW5pdGlhbCBmb3JtIHZhbHVlcyBhbmQgcmUtYmluZCBldmVudCBoYW5kbGVycyBmb3IgZHluYW1pY2FsbHkgY3JlYXRlZCBpbnB1dHNcbiAgICAgICAgLy8gVGhpcyBpcyBlc3NlbnRpYWwgZm9yIGZvcm0gY2hhbmdlIGRldGVjdGlvbiB0byB3b3JrIHdpdGggZHluYW1pYyB0YWJzXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIE92ZXJyaWRlIEZvcm0gbWV0aG9kcyB0byBtYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXMgKGluY2x1ZGluZyBmcm9tIHRhYnMpXG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbFNhdmVJbml0aWFsVmFsdWVzID0gRm9ybS5zYXZlSW5pdGlhbFZhbHVlcztcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsQ2hlY2tWYWx1ZXMgPSBGb3JtLmNoZWNrVmFsdWVzO1xuXG4gICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHZhbHVlcyBmcm9tIEZvbWFudGljIFVJIChtYXkgbWlzcyBkeW5hbWljYWxseSBjcmVhdGVkIHRhYiBmaWVsZHMpXG4gICAgICAgICAgICAgICAgY29uc3QgZm9tYW50aWNWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXMgdG8gY2F0Y2ggZmllbGRzIHRoYXQgRm9tYW50aWMgVUkgbWlzc2VzXG4gICAgICAgICAgICAgICAgY29uc3QgbWFudWFsVmFsdWVzID0ge307XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCAkZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAncmFkaW8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5pcygnOmNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIE1lcmdlIGJvdGggKG1hbnVhbCB2YWx1ZXMgb3ZlcnJpZGUgRm9tYW50aWMgdmFsdWVzIGZvciBmaWVsZHMgdGhhdCBleGlzdCBpbiBib3RoKVxuICAgICAgICAgICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IE9iamVjdC5hc3NpZ24oe30sIGZvbWFudGljVmFsdWVzLCBtYW51YWxWYWx1ZXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB2YWx1ZXMgZnJvbSBGb21hbnRpYyBVSVxuICAgICAgICAgICAgICAgIGNvbnN0IGZvbWFudGljVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBhbGwgZmllbGQgdmFsdWVzXG4gICAgICAgICAgICAgICAgY29uc3QgbWFudWFsVmFsdWVzID0ge307XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCAkZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAncmFkaW8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5pcygnOmNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIE1lcmdlIGJvdGhcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdGb3JtVmFsdWVzID0gT2JqZWN0LmFzc2lnbih7fSwgZm9tYW50aWNWYWx1ZXMsIG1hbnVhbFZhbHVlcyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoRm9ybS5vbGRGb3JtVmFsdWVzKSA9PT0gSlNPTi5zdHJpbmdpZnkobmV3Rm9ybVZhbHVlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybS5zZXRFdmVudHMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBGb3JtLnNldEV2ZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBmb3JtIGZvciBleGlzdGluZyBpbnRlcmZhY2VcbiAgICAgKi9cbiAgICBjcmVhdGVJbnRlcmZhY2VGb3JtKGlmYWNlLCBpc0FjdGl2ZSwgZGVsZXRlQnV0dG9uKSB7XG4gICAgICAgIGNvbnN0IGlkID0gaWZhY2UuaWQ7XG4gICAgICAgIGNvbnN0IGlzSW50ZXJuZXRJbnRlcmZhY2UgPSBpZmFjZS5pbnRlcm5ldCB8fCBmYWxzZTtcblxuICAgICAgICAvLyBETlMvR2F0ZXdheSBmaWVsZHMgdmlzaWJpbGl0eSBhbmQgcmVhZC1vbmx5IHN0YXRlXG4gICAgICAgIGNvbnN0IGRuc0dhdGV3YXlWaXNpYmxlID0gaXNJbnRlcm5ldEludGVyZmFjZSA/ICcnIDogJ3N0eWxlPVwiZGlzcGxheTpub25lO1wiJztcbiAgICAgICAgY29uc3QgZG5zR2F0ZXdheVJlYWRvbmx5ID0gaWZhY2UuZGhjcCA/ICdyZWFkb25seScgOiAnJztcbiAgICAgICAgY29uc3QgZG5zR2F0ZXdheURpc2FibGVkQ2xhc3MgPSBpZmFjZS5kaGNwID8gJ2Rpc2FibGVkJyA6ICcnO1xuXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYm90dG9tIGF0dGFjaGVkIHRhYiBzZWdtZW50ICR7aXNBY3RpdmUgPyAnYWN0aXZlJyA6ICcnfVwiIGRhdGEtdGFiPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcmZhY2VfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaW50ZXJmYWNlfVwiIC8+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVyZmFjZU5hbWV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLm5hbWUgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggaW50ZXJuZXQtcmFkaW9cIiBpZD1cImludGVybmV0LSR7aWR9LXJhZGlvXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJyYWRpb1wiIG5hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIiB2YWx1ZT1cIiR7aWR9XCIgJHtpc0ludGVybmV0SW50ZXJmYWNlID8gJ2NoZWNrZWQnIDogJyd9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJuZXRJbnRlcmZhY2UgfHwgJ0ludGVybmV0IEludGVyZmFjZSd9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBkaGNwLWNoZWNrYm94JHtpZmFjZS52bGFuaWQgPiAwID8gJyBkaXNhYmxlZCcgOiAnJ31cIiBpZD1cImRoY3AtJHtpZH0tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImRoY3BfJHtpZH1cIiAke2lmYWNlLnZsYW5pZCA+IDAgPyAnJyA6IChpZmFjZS5kaGNwID8gJ2NoZWNrZWQnIDogJycpfSAke2lmYWNlLnZsYW5pZCA+IDAgPyAnZGlzYWJsZWQnIDogJyd9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm5vdGRoY3BfJHtpZH1cIiBpZD1cIm5vdC1kaGNwLSR7aWR9XCIvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUEFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwYWRkciB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19OZXR3b3JrTWFza308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwic3VibmV0XyR7aWR9XCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5zdWJuZXQgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVmxhbklEfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIG5hbWU9XCJ2bGFuaWRfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UudmxhbmlkIHx8ICcwJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkbnMtZ2F0ZXdheS1ncm91cC0ke2lkfVwiICR7ZG5zR2F0ZXdheVZpc2libGV9PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaG9yaXpvbnRhbCBkaXZpZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJuZXRTZXR0aW5ncyB8fCAnSW50ZXJuZXQgU2V0dGluZ3MnfTwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0hvc3RuYW1lIHx8ICdIb3N0bmFtZSd9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cImhvc3RuYW1lXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmhvc3RuYW1lIHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwibWlrb3BieFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfRG9tYWluIHx8ICdEb21haW4nfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJkb21haW5fJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuZG9tYWluIHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiZXhhbXBsZS5jb21cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0dhdGV3YXl9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwICR7ZG5zR2F0ZXdheURpc2FibGVkQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiZ2F0ZXdheV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5nYXRld2F5IHx8ICcnfVwiICR7ZG5zR2F0ZXdheVJlYWRvbmx5fSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ByaW1hcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwICR7ZG5zR2F0ZXdheURpc2FibGVkQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwicHJpbWFyeWRuc18ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5wcmltYXJ5ZG5zIHx8ICcnfVwiICR7ZG5zR2F0ZXdheVJlYWRvbmx5fSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1NlY29uZGFyeUROU308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDAgJHtkbnNHYXRld2F5RGlzYWJsZWRDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJzZWNvbmRhcnlkbnNfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2Uuc2Vjb25kYXJ5ZG5zIHx8ICcnfVwiICR7ZG5zR2F0ZXdheVJlYWRvbmx5fSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgJHtkZWxldGVCdXR0b259XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIG5ldyBWTEFOIHRlbXBsYXRlXG4gICAgICovXG4gICAgY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBpbnRlcmZhY2VzKSB7XG4gICAgICAgIGNvbnN0IGlkID0gMDtcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudFwiIGRhdGEtdGFiPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgaWQ9XCJpbnRlcmZhY2VfJHtpZH1cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiBpZD1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIlwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGRoY3AtY2hlY2tib3hcIiBpZD1cImRoY3AtJHtpZH0tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImRoY3BfJHtpZH1cIiBjaGVja2VkIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm5vdGRoY3BfJHtpZH1cIiBpZD1cIm5vdC1kaGNwLSR7aWR9XCIvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUEFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19OZXR3b3JrTWFza308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwic3VibmV0XyR7aWR9XCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiMjRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19WbGFuSUR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbmFtZT1cInZsYW5pZF8ke2lkfVwiIHZhbHVlPVwiNDA5NVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzdWJuZXQgbWFzayBvcHRpb25zIGFycmF5IGZvciBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJuZXQgbWFzayBvcHRpb25zXG4gICAgICovXG4gICAgZ2V0U3VibmV0T3B0aW9uc0FycmF5KCkge1xuICAgICAgICAvLyBOZXR3b3JrIG1hc2tzIGZyb20gQ2lkcjo6Z2V0TmV0TWFza3MoKSAoa3Jzb3J0IFNPUlRfTlVNRVJJQylcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHt2YWx1ZTogJzMyJywgdGV4dDogJzMyIC0gMjU1LjI1NS4yNTUuMjU1J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMScsIHRleHQ6ICczMSAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMzAnLCB0ZXh0OiAnMzAgLSAyNTUuMjU1LjI1NS4yNTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI5JywgdGV4dDogJzI5IC0gMjU1LjI1NS4yNTUuMjQ4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyOCcsIHRleHQ6ICcyOCAtIDI1NS4yNTUuMjU1LjI0MCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjcnLCB0ZXh0OiAnMjcgLSAyNTUuMjU1LjI1NS4yMjQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI2JywgdGV4dDogJzI2IC0gMjU1LjI1NS4yNTUuMTkyJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNScsIHRleHQ6ICcyNSAtIDI1NS4yNTUuMjU1LjEyOCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjQnLCB0ZXh0OiAnMjQgLSAyNTUuMjU1LjI1NS4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMycsIHRleHQ6ICcyMyAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjInLCB0ZXh0OiAnMjIgLSAyNTUuMjU1LjI1Mi4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMScsIHRleHQ6ICcyMSAtIDI1NS4yNTUuMjQ4LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIwJywgdGV4dDogJzIwIC0gMjU1LjI1NS4yNDAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTknLCB0ZXh0OiAnMTkgLSAyNTUuMjU1LjIyNC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOCcsIHRleHQ6ICcxOCAtIDI1NS4yNTUuMTkyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE3JywgdGV4dDogJzE3IC0gMjU1LjI1NS4xMjguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTYnLCB0ZXh0OiAnMTYgLSAyNTUuMjU1LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTUnLCB0ZXh0OiAnMTUgLSAyNTUuMjU0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTQnLCB0ZXh0OiAnMTQgLSAyNTUuMjUyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTMnLCB0ZXh0OiAnMTMgLSAyNTUuMjQ4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTInLCB0ZXh0OiAnMTIgLSAyNTUuMjQwLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTEnLCB0ZXh0OiAnMTEgLSAyNTUuMjI0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTAnLCB0ZXh0OiAnMTAgLSAyNTUuMTkyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOScsIHRleHQ6ICc5IC0gMjU1LjEyOC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzgnLCB0ZXh0OiAnOCAtIDI1NS4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNycsIHRleHQ6ICc3IC0gMjU0LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc2JywgdGV4dDogJzYgLSAyNTIuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzUnLCB0ZXh0OiAnNSAtIDI0OC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNCcsIHRleHQ6ICc0IC0gMjQwLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICczJywgdGV4dDogJzMgLSAyMjQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzInLCB0ZXh0OiAnMiAtIDE5Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMScsIHRleHQ6ICcxIC0gMTI4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogJzAgLSAwLjAuMC4wJ30sXG4gICAgICAgIF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBjb25maWd1cmF0aW9uIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBDcmVhdGUgaW50ZXJmYWNlIHRhYnMgYW5kIGZvcm1zIGR5bmFtaWNhbGx5XG4gICAgICAgIG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZVRhYnMoZGF0YSk7XG5cbiAgICAgICAgLy8gU2V0IE5BVCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5uYXQpIHtcbiAgICAgICAgICAgIC8vIEJvb2xlYW4gdmFsdWVzIGZyb20gQVBJXG4gICAgICAgICAgICBpZiAoZGF0YS5uYXQudXNlbmF0KSB7XG4gICAgICAgICAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCBkYXRhLm5hdC5leHRpcGFkZHIgfHwgJycpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgZGF0YS5uYXQuZXh0aG9zdG5hbWUgfHwgJycpO1xuXG4gICAgICAgICAgICAvLyBhdXRvVXBkYXRlRXh0ZXJuYWxJcCBib29sZWFuIChmaWVsZCBuYW1lIGZyb20gdGhlIGZvcm0pXG4gICAgICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZUNoZWNrYm94ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgIGlmICgkYXV0b1VwZGF0ZUNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5uYXQuQVVUT19VUERBVEVfRVhURVJOQUxfSVAgfHwgZGF0YS5uYXQuYXV0b1VwZGF0ZUV4dGVybmFsSXApIHtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHBvcnQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEucG9ydHMpIHtcbiAgICAgICAgICAgIC8vIFdIWTogTm8gbWFwcGluZyBuZWVkZWQgLSBBUEkgcmV0dXJucyBrZXlzIG1hdGNoaW5nIGZvcm0gZmllbGQgbmFtZXNcbiAgICAgICAgICAgIC8vIChlLmcuLCAnZXh0ZXJuYWxTSVBQb3J0JyBmcm9tIFBieFNldHRpbmdzOjpFWFRFUk5BTF9TSVBfUE9SVCBjb25zdGFudClcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucG9ydHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGEucG9ydHNba2V5XTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBrZXksIHZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIE5BVCBoZWxwIHRleHQgYW5kIGxhYmVscyB3aXRoIGFjdHVhbCBwb3J0IHZhbHVlc1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlTkFUSGVscFRleHQoZGF0YS5wb3J0cyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVQb3J0TGFiZWxzKGRhdGEucG9ydHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGFkZGl0aW9uYWwgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEuc2V0dGluZ3MpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEuc2V0dGluZ3MpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBrZXksIGRhdGEuc2V0dGluZ3Nba2V5XSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN0b3JlIGF2YWlsYWJsZSBpbnRlcmZhY2VzIGZvciBzdGF0aWMgcm91dGVzIEZJUlNUIChiZWZvcmUgbG9hZGluZyByb3V0ZXMpXG4gICAgICAgIGlmIChkYXRhLmF2YWlsYWJsZUludGVyZmFjZXMpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYXZhaWxhYmxlSW50ZXJmYWNlcyA9IGRhdGEuYXZhaWxhYmxlSW50ZXJmYWNlcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIExvYWQgc3RhdGljIHJvdXRlcyBBRlRFUiBhdmFpbGFibGVJbnRlcmZhY2VzIGFyZSBzZXRcbiAgICAgICAgaWYgKGRhdGEuc3RhdGljUm91dGVzKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmxvYWRSb3V0ZXMoZGF0YS5zdGF0aWNSb3V0ZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBhZnRlciBwb3B1bGF0aW9uIGlzIGNvbXBsZXRlXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyB0aGUgYnV0dG9uIGlzIGRpc2FibGVkIGFuZCBhbGwgZHluYW1pY2FsbHkgY3JlYXRlZCBmaWVsZHMgYXJlIHRyYWNrZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3MuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJXaXRoUG9ydE9wdGlvbmFsID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSg6WzAtOV0rKT8kLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIGEgZ2l2ZW4gaW50ZXJmYWNlLlxuICogQHBhcmFtIHtzdHJpbmd9IHZsYW5WYWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgVkxBTiBJRCBpbnB1dCBmaWVsZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBwYXJhbWV0ZXIgZm9yIHRoZSBydWxlLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIHRoZSBpbnRlcmZhY2UsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVmxhbiA9ICh2bGFuVmFsdWUsIHBhcmFtKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgdmxhbnNBcnJheSA9IHt9O1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLmludGVyZmFjZV8wICE9PSB1bmRlZmluZWQgJiYgYWxsVmFsdWVzLmludGVyZmFjZV8wID4gMCkge1xuICAgICAgICBjb25zdCBuZXdFdGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHthbGxWYWx1ZXMuaW50ZXJmYWNlXzB9YF07XG4gICAgICAgIHZsYW5zQXJyYXlbbmV3RXRoTmFtZV0gPSBbYWxsVmFsdWVzLnZsYW5pZF8wXTtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy52bGFuaWRfMCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICQuZWFjaChhbGxWYWx1ZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAnaW50ZXJmYWNlXzAnIHx8IGluZGV4ID09PSAndmxhbmlkXzAnKSByZXR1cm47XG4gICAgICAgIGlmIChpbmRleC5pbmRleE9mKCd2bGFuaWQnKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBldGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHtpbmRleC5zcGxpdCgnXycpWzFdfWBdO1xuICAgICAgICAgICAgaWYgKCQuaW5BcnJheSh2YWx1ZSwgdmxhbnNBcnJheVtldGhOYW1lXSkgPj0gMFxuICAgICAgICAgICAgICAgICYmIHZsYW5WYWx1ZSA9PT0gdmFsdWVcbiAgICAgICAgICAgICAgICAmJiBwYXJhbSA9PT0gaW5kZXguc3BsaXQoJ18nKVsxXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIShldGhOYW1lIGluIHZsYW5zQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBESENQIHZhbGlkYXRpb24gcnVsZSByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzLCBubyB2YWxpZGF0aW9uIG5lZWRlZFxuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdGhlIHByZXNlbmNlIG9mIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uIGlzIHByb3ZpZGVkIHdoZW4gTkFUIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuYWxJcEhvc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMudXNlbmF0ID09PSAnb24nKSB7XG4gICAgICAgIGlmIChhbGxWYWx1ZXMuZXh0aG9zdG5hbWUgPT09ICcnICYmIGFsbFZhbHVlcy5leHRpcGFkZHIgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdmFsdWUgaXMgYSB2YWxpZCBob3N0bmFtZVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGhvc3RuYW1lXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHZhbGlkIGhvc3RuYW1lLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnZhbGlkSG9zdG5hbWUgPSAodmFsdWUpID0+IHtcbiAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gRW1wdHkgaXMgaGFuZGxlZCBieSBleHRlbmFsSXBIb3N0IHJ1bGVcbiAgICB9XG5cbiAgICAvLyBSRkMgOTUyL1JGQyAxMTIzIGhvc3RuYW1lIHZhbGlkYXRpb25cbiAgICAvLyAtIExhYmVscyBzZXBhcmF0ZWQgYnkgZG90c1xuICAgIC8vIC0gRWFjaCBsYWJlbCAxLTYzIGNoYXJzXG4gICAgLy8gLSBPbmx5IGFscGhhbnVtZXJpYyBhbmQgaHlwaGVuc1xuICAgIC8vIC0gQ2Fubm90IHN0YXJ0L2VuZCB3aXRoIGh5cGhlblxuICAgIC8vIC0gVG90YWwgbGVuZ3RoIG1heCAyNTMgY2hhcnNcbiAgICBjb25zdCBob3N0bmFtZVJlZ2V4ID0gL14oPz0uezEsMjUzfSQpKD8hLSlbYS16QS1aMC05LV17MSw2M30oPzwhLSkoXFwuW2EtekEtWjAtOS1dezEsNjN9KD88IS0pKSokLztcbiAgICByZXR1cm4gaG9zdG5hbWVSZWdleC50ZXN0KHZhbHVlKTtcbn07XG5cblxuLyoqXG4gKiBTdGF0aWMgUm91dGVzIE1hbmFnZXIgTW9kdWxlXG4gKlxuICogTWFuYWdlcyBzdGF0aWMgcm91dGUgY29uZmlndXJhdGlvbiB3aGVuIG11bHRpcGxlIG5ldHdvcmsgaW50ZXJmYWNlcyBleGlzdFxuICovXG5jb25zdCBTdGF0aWNSb3V0ZXNNYW5hZ2VyID0ge1xuICAgICR0YWJsZTogJCgnI3N0YXRpYy1yb3V0ZXMtdGFibGUnKSxcbiAgICAkc2VjdGlvbjogJCgnI3N0YXRpYy1yb3V0ZXMtc2VjdGlvbicpLFxuICAgICRhZGRCdXR0b246ICQoJyNhZGQtbmV3LXJvdXRlJyksXG4gICAgJHRhYmxlQ29udGFpbmVyOiBudWxsLFxuICAgICRlbXB0eVBsYWNlaG9sZGVyOiBudWxsLFxuICAgIHJvdXRlczogW10sXG4gICAgYXZhaWxhYmxlSW50ZXJmYWNlczogW10sIC8vIFdpbGwgYmUgcG9wdWxhdGVkIGZyb20gUkVTVCBBUElcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc3RhdGljIHJvdXRlcyBtYW5hZ2VtZW50XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gQ2FjaGUgZWxlbWVudHNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kZW1wdHlQbGFjZWhvbGRlciA9ICQoJyNzdGF0aWMtcm91dGVzLWVtcHR5LXBsYWNlaG9sZGVyJyk7XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlQ29udGFpbmVyID0gJCgnI3N0YXRpYy1yb3V0ZXMtdGFibGUtY29udGFpbmVyJyk7XG5cbiAgICAgICAgLy8gSGlkZSBzZWN0aW9uIGlmIGxlc3MgdGhhbiAyIGludGVyZmFjZXNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVWaXNpYmlsaXR5KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZURyYWdBbmREcm9wKCk7XG5cbiAgICAgICAgLy8gQWRkIGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGFkZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgZmlyc3Qgcm91dGUgYnV0dG9uIGhhbmRsZXIgKGluIGVtcHR5IHBsYWNlaG9sZGVyKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2FkZC1maXJzdC1yb3V0ZS1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgKGRlbGVnYXRlZClcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2NsaWNrJywgJy5kZWxldGUtcm91dGUtYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVByaW9yaXRpZXMoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlRW1wdHlTdGF0ZSgpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb3B5IGJ1dHRvbiBoYW5kbGVyIChkZWxlZ2F0ZWQpXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdjbGljaycsICcuY29weS1yb3V0ZS1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJHNvdXJjZVJvdyA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmNvcHlSb3V0ZSgkc291cmNlUm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5wdXQgY2hhbmdlIGhhbmRsZXJzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdpbnB1dCBjaGFuZ2UnLCAnLm5ldHdvcmstaW5wdXQsIC5nYXRld2F5LWlucHV0LCAuZGVzY3JpcHRpb24taW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFBhc3RlIGhhbmRsZXJzIGZvciBJUCBhZGRyZXNzIGZpZWxkcyAoZW5hYmxlIGNsaXBib2FyZCBwYXN0ZSB3aXRoIGlucHV0bWFzaylcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ3Bhc3RlJywgJy5uZXR3b3JrLWlucHV0LCAuZ2F0ZXdheS1pbnB1dCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgLy8gR2V0IHBhc3RlZCBkYXRhIGZyb20gY2xpcGJvYXJkXG4gICAgICAgICAgICBsZXQgcGFzdGVkRGF0YSA9ICcnO1xuICAgICAgICAgICAgaWYgKGUub3JpZ2luYWxFdmVudCAmJiBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YSAmJiBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5jbGlwYm9hcmREYXRhICYmIGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5jbGlwYm9hcmREYXRhICYmIHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpOyAvLyBGb3IgSUVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2xlYW4gdGhlIHBhc3RlZCBkYXRhIChyZW1vdmUgZXh0cmEgc3BhY2VzLCBrZWVwIG9ubHkgdmFsaWQgSVAgY2hhcmFjdGVycylcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuZWREYXRhID0gcGFzdGVkRGF0YS50cmltKCkucmVwbGFjZSgvW14wLTkuXS9nLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIEdldCB0aGUgaW5wdXQgZWxlbWVudFxuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcblxuICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgcmVtb3ZlIG1hc2tcbiAgICAgICAgICAgICRpbnB1dC5pbnB1dG1hc2soJ3JlbW92ZScpO1xuXG4gICAgICAgICAgICAvLyBTZXQgdGhlIGNsZWFuZWQgdmFsdWVcbiAgICAgICAgICAgICRpbnB1dC52YWwoY2xlYW5lZERhdGEpO1xuXG4gICAgICAgICAgICAvLyBSZWFwcGx5IHRoZSBtYXNrIGFmdGVyIGEgc2hvcnQgZGVsYXlcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRpbnB1dC5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCBwbGFjZWhvbGRlcjogJ18nfSk7XG4gICAgICAgICAgICAgICAgJGlucHV0LnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSwgMTApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBvciByZWluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyYWdBbmREcm9wKCkge1xuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIHRhYmxlRG5EIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUuZGF0YSgndGFibGVEbkQnKSkge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUudGFibGVEbkRVcGRhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJhZy1hbmQtZHJvcFxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyb3A6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVByaW9yaXRpZXMoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJ1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZpc2liaWxpdHkgYmFzZWQgb24gbnVtYmVyIG9mIGludGVyZmFjZXNcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5KCkge1xuICAgICAgICAvLyBTaG93L2hpZGUgc2VjdGlvbiBiYXNlZCBvbiBudW1iZXIgb2YgaW50ZXJmYWNlc1xuICAgICAgICBjb25zdCBpbnRlcmZhY2VDb3VudCA9ICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEuaXRlbScpLm5vdCgnW2RhdGEtdGFiPVwiMFwiXScpLmxlbmd0aDtcbiAgICAgICAgaWYgKGludGVyZmFjZUNvdW50ID4gMSkge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kc2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRzZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3B5IGEgcm91dGUgcm93IChjcmVhdGUgZHVwbGljYXRlKVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkc291cmNlUm93IC0gU291cmNlIHJvdyB0byBjb3B5XG4gICAgICovXG4gICAgY29weVJvdXRlKCRzb3VyY2VSb3cpIHtcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9ICRzb3VyY2VSb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpO1xuICAgICAgICBjb25zdCBzdWJuZXREcm9wZG93bklkID0gYHN1Ym5ldC1yb3V0ZS0ke3JvdXRlSWR9YDtcbiAgICAgICAgY29uc3QgaW50ZXJmYWNlRHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHtyb3V0ZUlkfWA7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBkYXRhIGZyb20gc291cmNlIHJvd1xuICAgICAgICBjb25zdCByb3V0ZURhdGEgPSB7XG4gICAgICAgICAgICBuZXR3b3JrOiAkc291cmNlUm93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICBzdWJuZXQ6ICQoYCMke3N1Ym5ldERyb3Bkb3duSWR9YCkudmFsKCksXG4gICAgICAgICAgICBnYXRld2F5OiAkc291cmNlUm93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKCksXG4gICAgICAgICAgICBpbnRlcmZhY2U6ICQoYCMke2ludGVyZmFjZURyb3Bkb3duSWR9YCkudmFsKCkgfHwgJycsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJHNvdXJjZVJvdy5maW5kKCcuZGVzY3JpcHRpb24taW5wdXQnKS52YWwoKVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFkZCBuZXcgcm91dGUgd2l0aCBjb3BpZWQgZGF0YVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKHJvdXRlRGF0YSk7XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGRyYWctYW5kLWRyb3AgYWZ0ZXIgYWRkaW5nIHJvdXRlXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZURyYWdBbmREcm9wKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBlbXB0eSBzdGF0ZSB2aXNpYmlsaXR5XG4gICAgICovXG4gICAgdXBkYXRlRW1wdHlTdGF0ZSgpIHtcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nUm93cyA9ICQoJy5yb3V0ZS1yb3cnKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ1Jvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBTaG93IGVtcHR5IHBsYWNlaG9sZGVyLCBoaWRlIHRhYmxlIGNvbnRhaW5lclxuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kZW1wdHlQbGFjZWhvbGRlci5zaG93KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZUNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGVtcHR5IHBsYWNlaG9sZGVyLCBzaG93IHRhYmxlIGNvbnRhaW5lclxuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kZW1wdHlQbGFjZWhvbGRlci5oaWRlKCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZUNvbnRhaW5lci5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByb3V0ZURhdGEgLSBSb3V0ZSBkYXRhIChvcHRpb25hbClcbiAgICAgKi9cbiAgICBhZGRSb3V0ZShyb3V0ZURhdGEgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0ICR0ZW1wbGF0ZSA9ICQoJy5yb3V0ZS1yb3ctdGVtcGxhdGUnKS5sYXN0KCk7XG4gICAgICAgIGNvbnN0ICRuZXdSb3cgPSAkdGVtcGxhdGUuY2xvbmUodHJ1ZSk7XG4gICAgICAgIGNvbnN0IHJvdXRlSWQgPSByb3V0ZURhdGE/LmlkIHx8IGBuZXdfJHtEYXRlLm5vdygpfWA7XG5cbiAgICAgICAgJG5ld1Jvd1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyb3V0ZS1yb3ctdGVtcGxhdGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdyb3V0ZS1yb3cnKVxuICAgICAgICAgICAgLmF0dHIoJ2RhdGEtcm91dGUtaWQnLCByb3V0ZUlkKVxuICAgICAgICAgICAgLnNob3coKTtcblxuICAgICAgICAvLyBTZXQgdmFsdWVzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChyb3V0ZURhdGEpIHtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwocm91dGVEYXRhLm5ldHdvcmspO1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbChyb3V0ZURhdGEuZ2F0ZXdheSk7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5kZXNjcmlwdGlvbi1pbnB1dCcpLnZhbChyb3V0ZURhdGEuZGVzY3JpcHRpb24gfHwgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHRvIHRhYmxlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ1Jvd3MgPSAkKCcucm91dGUtcm93Jyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJHRlbXBsYXRlLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGV4aXN0aW5nUm93cy5sYXN0KCkuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgdGhpcyByb3dcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplU3VibmV0RHJvcGRvd24oJG5ld1Jvdywgcm91dGVEYXRhPy5zdWJuZXQgfHwgJzI0Jyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnRlcmZhY2UgZHJvcGRvd24gZm9yIHRoaXMgcm93XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duKCRuZXdSb3csIHJvdXRlRGF0YT8uaW50ZXJmYWNlIHx8ICcnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGlucHV0bWFzayBmb3IgSVAgYWRkcmVzcyBmaWVsZHNcbiAgICAgICAgJG5ld1Jvdy5maW5kKCcuaXBhZGRyZXNzJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgcGxhY2Vob2xkZXI6ICdfJ30pO1xuXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgYSByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHJvdyAtIFJvdyBlbGVtZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdGVkVmFsdWUgLSBTZWxlY3RlZCBzdWJuZXQgdmFsdWVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU3VibmV0RHJvcGRvd24oJHJvdywgc2VsZWN0ZWRWYWx1ZSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJHJvdy5maW5kKCcuc3VibmV0LWRyb3Bkb3duLWNvbnRhaW5lcicpO1xuICAgICAgICBjb25zdCBkcm9wZG93bklkID0gYHN1Ym5ldC1yb3V0ZS0keyRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpfWA7XG5cbiAgICAgICAgJGNvbnRhaW5lci5odG1sKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiJHtkcm9wZG93bklkfVwiIC8+YCk7XG5cbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGRyb3Bkb3duSWQsXG4gICAgICAgICAgICB7IFtkcm9wZG93bklkXTogc2VsZWN0ZWRWYWx1ZSB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10sXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGludGVyZmFjZSBkcm9wZG93biBmb3IgYSByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHJvdyAtIFJvdyBlbGVtZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdGVkVmFsdWUgLSBTZWxlY3RlZCBpbnRlcmZhY2UgdmFsdWUgKGVtcHR5IHN0cmluZyA9IGF1dG8pXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duKCRyb3csIHNlbGVjdGVkVmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRyb3cuZmluZCgnLmludGVyZmFjZS1kcm9wZG93bi1jb250YWluZXInKTtcbiAgICAgICAgY29uc3QgZHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHskcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKX1gO1xuXG4gICAgICAgICRjb250YWluZXIuaHRtbChgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIiR7ZHJvcGRvd25JZH1cIiAvPmApO1xuXG4gICAgICAgIC8vIEJ1aWxkIGRyb3Bkb3duIG9wdGlvbnM6IFwiQXV0b1wiICsgYXZhaWxhYmxlIGludGVyZmFjZXNcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfQXV0byB8fCAnQXV0bycgfSxcbiAgICAgICAgICAgIC4uLlN0YXRpY1JvdXRlc01hbmFnZXIuYXZhaWxhYmxlSW50ZXJmYWNlcy5tYXAoaWZhY2UgPT4gKHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogaWZhY2UudmFsdWUsXG4gICAgICAgICAgICAgICAgdGV4dDogaWZhY2UubGFiZWxcbiAgICAgICAgICAgIH0pKVxuICAgICAgICBdO1xuXG4gICAgICAgIC8vIFByZXBhcmUgZm9ybSBkYXRhIGZvciBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge307XG4gICAgICAgIGZvcm1EYXRhW2Ryb3Bkb3duSWRdID0gc2VsZWN0ZWRWYWx1ZSB8fCAnJzsgLy8gRW5zdXJlIHdlIHBhc3MgZW1wdHkgc3RyaW5nIGZvciBcIkF1dG9cIlxuXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihkcm9wZG93bklkLFxuICAgICAgICAgICAgZm9ybURhdGEsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogb3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZSxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSByb3V0ZSBwcmlvcml0aWVzIGJhc2VkIG9uIHRhYmxlIG9yZGVyXG4gICAgICovXG4gICAgdXBkYXRlUHJpb3JpdGllcygpIHtcbiAgICAgICAgJCgnLnJvdXRlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLXByaW9yaXR5JywgaW5kZXggKyAxKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgcm91dGVzIGZyb20gZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJvdXRlc0RhdGEgLSBBcnJheSBvZiByb3V0ZSBvYmplY3RzXG4gICAgICovXG4gICAgbG9hZFJvdXRlcyhyb3V0ZXNEYXRhKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHJvdXRlc1xuICAgICAgICAkKCcucm91dGUtcm93JykucmVtb3ZlKCk7XG5cbiAgICAgICAgLy8gQWRkIGVhY2ggcm91dGVcbiAgICAgICAgaWYgKHJvdXRlc0RhdGEgJiYgcm91dGVzRGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByb3V0ZXNEYXRhLmZvckVhY2gocm91dGUgPT4ge1xuICAgICAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUocm91dGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGVtcHR5IHN0YXRlIGlmIG5vIHJvdXRlc1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCBhZnRlciBhZGRpbmcgcm91dGVzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZURyYWdBbmREcm9wKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Qgcm91dGVzIGZyb20gdGFibGVcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHJvdXRlIG9iamVjdHNcbiAgICAgKi9cbiAgICBjb2xsZWN0Um91dGVzKCkge1xuICAgICAgICBjb25zdCByb3V0ZXMgPSBbXTtcbiAgICAgICAgJCgnLnJvdXRlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHJvdyk7XG4gICAgICAgICAgICBjb25zdCByb3V0ZUlkID0gJHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyk7XG4gICAgICAgICAgICBjb25zdCBzdWJuZXREcm9wZG93bklkID0gYHN1Ym5ldC1yb3V0ZS0ke3JvdXRlSWR9YDtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZURyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7cm91dGVJZH1gO1xuXG4gICAgICAgICAgICByb3V0ZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgaWQ6IHJvdXRlSWQuc3RhcnRzV2l0aCgnbmV3XycpID8gbnVsbCA6IHJvdXRlSWQsXG4gICAgICAgICAgICAgICAgbmV0d29yazogJHJvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgICAgIHN1Ym5ldDogJChgIyR7c3VibmV0RHJvcGRvd25JZH1gKS52YWwoKSxcbiAgICAgICAgICAgICAgICBnYXRld2F5OiAkcm93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlOiAkKGAjJHtpbnRlcmZhY2VEcm9wZG93bklkfWApLnZhbCgpIHx8ICcnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAkcm93LmZpbmQoJy5kZXNjcmlwdGlvbi1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCArIDFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJvdXRlcztcbiAgICB9XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIG5ldHdvcmsgc2V0dGluZ3MgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbmV0d29ya3MuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=