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
    // TEMPORARY: Commented out for local Docker testing
    // if (networks.$formObj.form('get value','is-docker')==="1") {
    //     networks.$notShowOnDockerDivs.hide();
    // }
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
    // Only update if we have port values from server
    if (!ports.SIP_PORT || !ports.TLS_PORT || !ports.RTP_PORT_FROM || !ports.RTP_PORT_TO) {
      return;
    } // Update SIP ports text using ID


    var $sipPortValues = $('#nat-help-sip-ports .port-values');

    if ($sipPortValues.length > 0) {
      var sipText = i18n('nw_NATInfo3', {
        'SIP_PORT': ports.SIP_PORT,
        'TLS_PORT': ports.TLS_PORT
      });
      $sipPortValues.html(sipText);
    } // Update RTP ports text using ID


    var $rtpPortValues = $('#nat-help-rtp-ports .port-values');

    if ($rtpPortValues.length > 0) {
      var rtpText = i18n('nw_NATInfo4', {
        'RTP_PORT_FROM': ports.RTP_PORT_FROM,
        'RTP_PORT_TO': ports.RTP_PORT_TO
      });
      $rtpPortValues.html(rtpText);
    }
  },

  /**
   * Update port field labels with actual internal port values from REST API
   * @param {object} ports - Port configuration object from API
   */
  updatePortLabels: function updatePortLabels(ports) {
    // Only update if we have port values from server
    if (!ports.SIP_PORT || !ports.TLS_PORT) {
      return;
    } // Update external SIP port label using ID


    var $sipLabel = $('#external-sip-port-label');

    if ($sipLabel.length > 0) {
      var sipLabelText = i18n('nw_PublicSIPPort', {
        'SIP_PORT': ports.SIP_PORT
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
    } // Map form field names to API field names for ports


    var portFieldMapping = {
      'externalSIPPort': 'EXTERNAL_SIP_PORT',
      'externalTLSPort': 'EXTERNAL_TLS_PORT'
    }; // Apply port field mapping

    Object.keys(portFieldMapping).forEach(function (formField) {
      var apiField = portFieldMapping[formField];

      if (result.data[formField] !== undefined) {
        result.data[apiField] = result.data[formField];
        delete result.data[formField];
      }
    });
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
        // TEMPORARY: Commented out for local Docker testing
        // if (response.data.isDocker) {
        //     networks.$formObj.form('set value', 'is-docker', '1');
        //     networks.$notShowOnDockerDivs.hide();
        // }
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
    return "\n            <div class=\"ui bottom attached tab segment ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(id, "\">\n                <input type=\"hidden\" name=\"interface_").concat(id, "\" value=\"").concat(iface["interface"], "\" />\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox internet-radio\" id=\"internet-").concat(id, "-radio\">\n                            <input type=\"radio\" name=\"internet_interface\" value=\"").concat(id, "\" ").concat(isInternetInterface ? 'checked' : '', " />\n                            <label><i class=\"globe icon\"></i> ").concat(globalTranslate.nw_InternetInterface || 'Internet Interface', "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox").concat(iface.vlanid > 0 ? ' disabled' : '', "\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" ").concat(iface.vlanid > 0 ? '' : iface.dhcp ? 'checked' : '', " ").concat(iface.vlanid > 0 ? 'disabled' : '', " />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                <div class=\"fields\" id=\"ip-address-group-").concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '', "\" />\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"").concat(iface.vlanid || '0', "\" />\n                    </div>\n                </div>\n\n                <div class=\"dns-gateway-group-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                    <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetSettings || 'Internet Settings', "</div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Gateway, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsGatewayDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"gateway_").concat(id, "\" value=\"").concat(iface.gateway || '', "\" ").concat(dnsGatewayReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_PrimaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsGatewayDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"primarydns_").concat(id, "\" value=\"").concat(iface.primarydns || '', "\" ").concat(dnsGatewayReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_SecondaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsGatewayDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"secondarydns_").concat(id, "\" value=\"").concat(iface.secondarydns || '', "\" ").concat(dnsGatewayReadonly, " />\n                        </div>\n                    </div>\n                </div>\n\n                ").concat(deleteButton, "\n            </div>\n        ");
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
      // Map API field names to form field names
      var portFieldMapping = {
        'EXTERNAL_SIP_PORT': 'externalSIPPort',
        'EXTERNAL_TLS_PORT': 'externalTLSPort',
        'SIP_PORT': 'SIP_PORT',
        'TLS_PORT': 'TLS_PORT',
        'RTP_PORT_FROM': 'RTP_PORT_FROM',
        'RTP_PORT_TO': 'RTP_PORT_TO'
      };
      Object.keys(data.ports).forEach(function (key) {
        var formFieldName = portFieldMapping[key] || key;
        var value = data.ports[key];
        networks.$formObj.form('set value', formFieldName, value);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwiY3VycmVudEV4dElwQWRkciIsImZvcm0iLCJwb3J0TWF0Y2giLCJtYXRjaCIsInBvcnQiLCJuZXdFeHRJcEFkZHIiLCJpcCIsInRyaWdnZXIiLCJ1cGRhdGVOQVRIZWxwVGV4dCIsInBvcnRzIiwiU0lQX1BPUlQiLCJUTFNfUE9SVCIsIlJUUF9QT1JUX0ZST00iLCJSVFBfUE9SVF9UTyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGRoY3BDaGVja2JveCIsImlzRGhjcEVuYWJsZWQiLCIkaXBGaWVsZCIsIiRzdWJuZXREcm9wZG93biIsInByb3AiLCJjbG9zZXN0IiwidmFsIiwiYWRkTmV3Rm9ybVJ1bGVzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsIm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiT2JqZWN0IiwiYXNzaWduIiwiZGF0YSIsInN0YXRpY1JvdXRlcyIsImNvbGxlY3RSb3V0ZXMiLCJmaW5kIiwiJGlucHV0IiwibmFtZSIsInZhbHVlIiwidW5kZWZpbmVkIiwiU3RyaW5nIiwiJHNlbGVjdCIsInVzZW5hdCIsIiRhdXRvVXBkYXRlRGl2IiwicGFyZW50IiwiYXV0b1VwZGF0ZUV4dGVybmFsSXAiLCJpbnB1dElkIiwicm93SWQiLCJyZXBsYWNlIiwiJGNoZWNrYm94IiwiaXNEaXNhYmxlZCIsImhhc0NsYXNzIiwiJGNoZWNrZWRSYWRpbyIsImludGVybmV0X2ludGVyZmFjZSIsInBvcnRGaWVsZE1hcHBpbmciLCJrZXlzIiwiZm9yRWFjaCIsImZvcm1GaWVsZCIsImFwaUZpZWxkIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImlubGluZSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJjcmVhdGVJbnRlcmZhY2VUYWJzIiwiJG1lbnUiLCIkY29udGVudCIsImVtcHR5IiwiaW50ZXJmYWNlcyIsImlmYWNlIiwidGFiSWQiLCJpZCIsInRhYkxhYmVsIiwidmxhbmlkIiwiaXNBY3RpdmUiLCJhcHBlbmQiLCJjYW5EZWxldGUiLCJwYXJzZUludCIsImRlbGV0ZUJ1dHRvbiIsIm53X0RlbGV0ZUN1cnJlbnRJbnRlcmZhY2UiLCJjcmVhdGVJbnRlcmZhY2VGb3JtIiwidGVtcGxhdGUiLCJjcmVhdGVUZW1wbGF0ZUZvcm0iLCJwaHlzaWNhbEludGVyZmFjZXMiLCJ0b1N0cmluZyIsInBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyIsInZhbHVlcyIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW50ZXJmYWNlXzAiLCJzdGF0aWNPcHRpb25zIiwicGxhY2Vob2xkZXIiLCJud19TZWxlY3RJbnRlcmZhY2UiLCJhbGxvd0VtcHR5IiwiZmllbGROYW1lIiwiZm9ybURhdGEiLCJzdWJuZXQiLCJnZXRTdWJuZXRPcHRpb25zQXJyYXkiLCJud19TZWxlY3ROZXR3b3JrTWFzayIsImFkZGl0aW9uYWxDbGFzc2VzIiwic3VibmV0XzAiLCJ0YWIiLCJmaXJzdCIsInVwZGF0ZVZpc2liaWxpdHkiLCJvZmYiLCIkYnV0dG9uIiwiaW50ZXJmYWNlSWQiLCJyZW1vdmUiLCIkdGFiQ29udGVudCIsIiRmaXJzdFRhYiIsImVuYWJsZURpcnJpdHkiLCJjaGVja1ZhbHVlcyIsIiR2bGFuSW5wdXQiLCJ2bGFuVmFsdWUiLCJzZWxlY3RlZEludGVyZmFjZUlkIiwiaGlkZSIsInNob3ciLCIkdGFiIiwicHJlcGVuZCIsIiRkbnNHYXRld2F5R3JvdXAiLCIkZG5zR2F0ZXdheUZpZWxkcyIsIm9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMiLCJzYXZlSW5pdGlhbFZhbHVlcyIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJmb21hbnRpY1ZhbHVlcyIsIm1hbnVhbFZhbHVlcyIsIiRmaWVsZCIsImlzIiwib2xkRm9ybVZhbHVlcyIsIm5ld0Zvcm1WYWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsInNldEV2ZW50cyIsImlzSW50ZXJuZXRJbnRlcmZhY2UiLCJpbnRlcm5ldCIsImRuc0dhdGV3YXlWaXNpYmxlIiwiZG5zR2F0ZXdheVJlYWRvbmx5IiwiZGhjcCIsImRuc0dhdGV3YXlEaXNhYmxlZENsYXNzIiwibndfSW50ZXJmYWNlTmFtZSIsIm53X0ludGVybmV0SW50ZXJmYWNlIiwibndfVXNlREhDUCIsIm53X0lQQWRkcmVzcyIsImlwYWRkciIsIm53X05ldHdvcmtNYXNrIiwibndfVmxhbklEIiwibndfSW50ZXJuZXRTZXR0aW5ncyIsIm53X0dhdGV3YXkiLCJnYXRld2F5IiwibndfUHJpbWFyeUROUyIsInByaW1hcnlkbnMiLCJud19TZWNvbmRhcnlETlMiLCJzZWNvbmRhcnlkbnMiLCJuYXQiLCIkYXV0b1VwZGF0ZUNoZWNrYm94IiwiQVVUT19VUERBVEVfRVhURVJOQUxfSVAiLCJrZXkiLCJmb3JtRmllbGROYW1lIiwiYXZhaWxhYmxlSW50ZXJmYWNlcyIsImxvYWRSb3V0ZXMiLCJpbml0aWFsaXplRGlycml0eSIsImZuIiwiZiIsImkiLCJhIiwiaXBhZGRyV2l0aFBvcnRPcHRpb25hbCIsImNoZWNrVmxhbiIsInBhcmFtIiwiYWxsVmFsdWVzIiwibmV3RXRoTmFtZSIsInZsYW5pZF8wIiwiaW5kZXhPZiIsImV0aE5hbWUiLCJzcGxpdCIsImluQXJyYXkiLCJwdXNoIiwiZXh0ZW5hbElwSG9zdCIsInZhbGlkSG9zdG5hbWUiLCJob3N0bmFtZVJlZ2V4IiwidGVzdCIsIiR0YWJsZSIsIiRzZWN0aW9uIiwiJGFkZEJ1dHRvbiIsIiR0YWJsZUNvbnRhaW5lciIsIiRlbXB0eVBsYWNlaG9sZGVyIiwicm91dGVzIiwiaW5pdGlhbGl6ZURyYWdBbmREcm9wIiwiYWRkUm91dGUiLCJkb2N1bWVudCIsInRhcmdldCIsInVwZGF0ZVByaW9yaXRpZXMiLCJ1cGRhdGVFbXB0eVN0YXRlIiwiZGF0YUNoYW5nZWQiLCIkc291cmNlUm93IiwiY29weVJvdXRlIiwicGFzdGVkRGF0YSIsIm9yaWdpbmFsRXZlbnQiLCJjbGlwYm9hcmREYXRhIiwiZ2V0RGF0YSIsIndpbmRvdyIsImNsZWFuZWREYXRhIiwidHJpbSIsInNldFRpbWVvdXQiLCJ0YWJsZURuRFVwZGF0ZSIsInRhYmxlRG5EIiwib25Ecm9wIiwiZHJhZ0hhbmRsZSIsImludGVyZmFjZUNvdW50Iiwibm90Iiwicm91dGVJZCIsInN1Ym5ldERyb3Bkb3duSWQiLCJpbnRlcmZhY2VEcm9wZG93bklkIiwicm91dGVEYXRhIiwibmV0d29yayIsImRlc2NyaXB0aW9uIiwiJGV4aXN0aW5nUm93cyIsIiR0ZW1wbGF0ZSIsImxhc3QiLCIkbmV3Um93IiwiY2xvbmUiLCJEYXRlIiwibm93IiwiYWZ0ZXIiLCJpbml0aWFsaXplU3VibmV0RHJvcGRvd24iLCJpbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24iLCIkcm93Iiwic2VsZWN0ZWRWYWx1ZSIsIiRjb250YWluZXIiLCJkcm9wZG93bklkIiwib3B0aW9ucyIsIm53X0F1dG8iLCJtYXAiLCJsYWJlbCIsInJvdyIsInJvdXRlc0RhdGEiLCJyb3V0ZSIsInN0YXJ0c1dpdGgiLCJwcmlvcml0eSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2JDLEVBQUFBLGNB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cEIsS0FuQkcsRUFvQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FwQkcsRUFxQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FyQkcsRUFzQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0F0QkcsRUF1Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0F2QkcsRUF3Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0F4QkcsRUF5Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0F6QkcsRUEwQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0ExQkcsRUEyQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0EzQkcsRUE0Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0E1QkcsRUE2Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0E3QkcsRUE4Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0E5QkcsRUErQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0EvQkcsRUFnQ0g7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIs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QyxZQUFLOFIsbUJBQUwsRUFBRCxDQUE2QmxOLEdBQTdCLE1BQXNDLEVBTHpDO0FBTVJxTixRQUFBQSxXQUFXLEVBQUVXLElBQUksQ0FBQzVNLElBQUwsQ0FBVSxvQkFBVixFQUFnQ3BCLEdBQWhDLEVBTkw7QUFPUjRPLFFBQUFBLFFBQVEsRUFBRXRQLEtBQUssR0FBRztBQVBWLE9BQVo7QUFTSCxLQWZEO0FBZ0JBLFdBQU9rTSxNQUFQO0FBQ0g7QUFoVXVCLENBQTVCO0FBbVVBO0FBQ0E7QUFDQTs7QUFDQXBRLENBQUMsQ0FBQ3VRLFFBQUQsQ0FBRCxDQUFZa0QsS0FBWixDQUFrQixZQUFNO0FBQ3BCM1QsRUFBQUEsUUFBUSxDQUFDcUIsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN5c2luZm9BUEksIE5ldHdvcmtBUEksIFVzZXJNZXNzYWdlLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBuZXR3b3JrIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBuZXR3b3Jrc1xuICovXG5jb25zdCBuZXR3b3JrcyA9IHtcbiAgICAkZ2V0TXlJcEJ1dHRvbjogJCgnI2dldG15aXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNuZXR3b3JrLWZvcm0nKSxcblxuICAgICRkcm9wRG93bnM6ICQoJyNuZXR3b3JrLWZvcm0gLmRyb3Bkb3duJyksXG4gICAgJGV4dGlwYWRkcjogJCgnI2V4dGlwYWRkcicpLFxuICAgICRpcGFkZHJlc3NJbnB1dDogJCgnLmlwYWRkcmVzcycpLFxuICAgIHZsYW5zQXJyYXk6IHt9LFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnRzIHdpdGggd2Ugc2hvdWxkIGhpZGUgZnJvbSB0aGUgZm9ybSBmb3IgZG9ja2VyIGluc3RhbGxhdGlvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub3RTaG93T25Eb2NrZXJEaXZzOiAkKCcuZG8tbm90LXNob3ctaWYtZG9ja2VyJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0aXBhZGRyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyV2l0aFBvcnRPcHRpb25hbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGhvc3RuYW1lOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAndXNlbmF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd2YWxpZEhvc3RuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVIb3N0bmFtZUludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gTG9hZCBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAgICBuZXR3b3Jrcy5sb2FkQ29uZmlndXJhdGlvbigpO1xuXG4gICAgICAgIC8vIEhhbmRsZXMgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgJ3VzZW5hdC1jaGVja2JveCcuXG4gICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBuZXR3b3Jrcy4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gREhDUCBjaGVja2JveCBoYW5kbGVycyB3aWxsIGJlIGJvdW5kIGFmdGVyIHRhYnMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHlcblxuICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFN5c2luZm9BUEkuZ2V0RXh0ZXJuYWxJcEluZm8obmV0d29ya3MuY2JBZnRlckdldEV4dGVybmFsSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG4gICAgICAgIG5ldHdvcmtzLiRpcGFkZHJlc3NJbnB1dC5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICBuZXR3b3Jrcy5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3RhdGljIHJvdXRlcyBtYW5hZ2VyXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIEhpZGUgZm9ybSBlbGVtZW50cyBjb25uZWN0ZWQgd2l0aCBub24gZG9ja2VyIGluc3RhbGxhdGlvbnNcbiAgICAgICAgLy8gVEVNUE9SQVJZOiBDb21tZW50ZWQgb3V0IGZvciBsb2NhbCBEb2NrZXIgdGVzdGluZ1xuICAgICAgICAvLyBpZiAobmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywnaXMtZG9ja2VyJyk9PT1cIjFcIikge1xuICAgICAgICAvLyAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICAvLyB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGdldHRpbmcgdGhlIGV4dGVybmFsIElQIGZyb20gYSByZW1vdGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4gSWYgZmFsc2UsIGluZGljYXRlcyBhbiBlcnJvciBvY2N1cnJlZC5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0RXh0ZXJuYWxJcChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dElwQWRkciA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRpcGFkZHInKTtcbiAgICAgICAgICAgIGNvbnN0IHBvcnRNYXRjaCA9IGN1cnJlbnRFeHRJcEFkZHIubWF0Y2goLzooXFxkKykkLyk7XG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gcG9ydE1hdGNoID8gJzonICsgcG9ydE1hdGNoWzFdIDogJyc7XG4gICAgICAgICAgICBjb25zdCBuZXdFeHRJcEFkZHIgPSByZXNwb25zZS5pcCArIHBvcnQ7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgbmV3RXh0SXBBZGRyKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGV4dGVybmFsIGhvc3RuYW1lIHdoZW4gZ2V0dGluZyBleHRlcm5hbCBJUFxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgJycpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBoZWxwIHRleHQgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVOQVRIZWxwVGV4dChwb3J0cykge1xuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQX1BPUlQgfHwgIXBvcnRzLlRMU19QT1JUIHx8ICFwb3J0cy5SVFBfUE9SVF9GUk9NIHx8ICFwb3J0cy5SVFBfUE9SVF9UTykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFNJUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRzaXBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXNpcC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRzaXBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcFRleHQgPSBpMThuKCdud19OQVRJbmZvMycsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBfUE9SVCxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwUG9ydFZhbHVlcy5odG1sKHNpcFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFJUUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRydHBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRydHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJ0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUF9QT1JUX0ZST00sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQX1BPUlRfVE9cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHJ0cFBvcnRWYWx1ZXMuaHRtbChydHBUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcG9ydCBmaWVsZCBsYWJlbHMgd2l0aCBhY3R1YWwgaW50ZXJuYWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVQb3J0TGFiZWxzKHBvcnRzKSB7XG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHdlIGhhdmUgcG9ydCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgaWYgKCFwb3J0cy5TSVBfUE9SVCB8fCAhcG9ydHMuVExTX1BPUlQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBleHRlcm5hbCBTSVAgcG9ydCBsYWJlbCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkc2lwTGFiZWwgPSAkKCcjZXh0ZXJuYWwtc2lwLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRzaXBMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNTSVBQb3J0Jywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUF9QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBMYWJlbC50ZXh0KHNpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZXJuYWwgVExTIHBvcnQgbGFiZWwgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHRsc0xhYmVsID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkdGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkdGxzTGFiZWwudGV4dCh0bHNMYWJlbFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlICdkaXNhYmxlZCcgY2xhc3MgZm9yIHNwZWNpZmljIGZpZWxkcyBiYXNlZCBvbiB0aGVpciBjaGVja2JveCBzdGF0ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldGggPSAkKG9iaikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2V0aH0tY2hlY2tib3hgKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgICAgIC8vIEZpbmQgSVAgYWRkcmVzcyBhbmQgc3VibmV0IGZpZWxkc1xuICAgICAgICAgICAgY29uc3QgJGlwRmllbGQgPSAkKGBpbnB1dFtuYW1lPVwiaXBhZGRyXyR7ZXRofVwiXWApO1xuICAgICAgICAgICAgLy8gRHluYW1pY0Ryb3Bkb3duQnVpbGRlciBjcmVhdGVzIGRyb3Bkb3duIHdpdGggaWQgcGF0dGVybjogZmllbGROYW1lLWRyb3Bkb3duXG4gICAgICAgICAgICBjb25zdCAkc3VibmV0RHJvcGRvd24gPSAkKGAjc3VibmV0XyR7ZXRofS1kcm9wZG93bmApO1xuXG4gICAgICAgICAgICBpZiAoaXNEaGNwRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZW5hYmxlZCAtPiBtYWtlIElQL3N1Ym5ldCByZWFkLW9ubHkgYW5kIGFkZCBkaXNhYmxlZCBjbGFzc1xuICAgICAgICAgICAgICAgICRpcEZpZWxkLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJGlwRmllbGQuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJHN1Ym5ldERyb3Bkb3duLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGRpc2FibGVkIC0+IG1ha2UgSVAvc3VibmV0IGVkaXRhYmxlXG4gICAgICAgICAgICAgICAgJGlwRmllbGQucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgJGlwRmllbGQuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJHN1Ym5ldERyb3Bkb3duLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJzEnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV0d29ya3MuYWRkTmV3Rm9ybVJ1bGVzKGV0aCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIC8vIEZvciB0ZW1wbGF0ZSBpbnRlcmZhY2UgKGlkPTApLCBhZGQgZGVwZW5kZW5jeSBvbiBpbnRlcmZhY2Ugc2VsZWN0aW9uXG4gICAgICAgIGlmIChuZXdSb3dJZCA9PT0gMCB8fCBuZXdSb3dJZCA9PT0gJzAnKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2lwYWRkckNsYXNzXSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpcGFkZHJDbGFzcyxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCwgIC8vIFRlbXBsYXRlOiB2YWxpZGF0ZSBvbmx5IGlmIGludGVyZmFjZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogYG5vdGRoY3BfJHtuZXdSb3dJZH1gLCAgLy8gUmVhbCBpbnRlcmZhY2U6IHZhbGlkYXRlIG9ubHkgaWYgREhDUCBpcyBPRkZcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERIQ1AgdmFsaWRhdGlvbiByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgb2JqZWN0IHdpdGggYWxsIHNldHRpbmdzIHByb3BlcnRpZXNcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHt9O1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc3RhdGljIHJvdXRlc1xuICAgICAgICByZXN1bHQuZGF0YS5zdGF0aWNSb3V0ZXMgPSBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmNvbGxlY3RSb3V0ZXMoKTtcblxuICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGZvcm0gdmFsdWVzIHRvIGF2b2lkIGFueSBET00tcmVsYXRlZCBpc3N1ZXNcbiAgICAgICAgLy8gQ29sbGVjdCBhbGwgcmVndWxhciBpbnB1dCBmaWVsZHNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbdHlwZT1cInRleHRcIl0sIGlucHV0W3R5cGU9XCJoaWRkZW5cIl0sIGlucHV0W3R5cGU9XCJudW1iZXJcIl0sIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gJGlucHV0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkaW5wdXQudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBzZWxlY3QgZHJvcGRvd25zXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ3NlbGVjdCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkc2VsZWN0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkc2VsZWN0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkc2VsZWN0LnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGdldCBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbbmFtZV0gPSAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkgPyBTdHJpbmcodmFsdWUpIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW5cbiAgICAgICAgLy8gUGJ4QXBpQ2xpZW50IHdpbGwgaGFuZGxlIGNvbnZlcnNpb24gdG8gc3RyaW5ncyBmb3IgalF1ZXJ5XG4gICAgICAgIHJlc3VsdC5kYXRhLnVzZW5hdCA9ICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIFVzZSBjb3JyZWN0IGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSAoYXV0b1VwZGF0ZUV4dGVybmFsSXAsIG5vdCBBVVRPX1VQREFURV9FWFRFUk5BTF9JUClcbiAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVEaXYgPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBpZiAoJGF1dG9VcGRhdGVEaXYubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSAkYXV0b1VwZGF0ZURpdi5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbnZlcnQgREhDUCBjaGVja2JveGVzIHRvIGJvb2xlYW4gZm9yIGVhY2ggaW50ZXJmYWNlXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJy5kaGNwLWNoZWNrYm94JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5wdXRJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgY29uc3Qgcm93SWQgPSBpbnB1dElkLnJlcGxhY2UoJ2RoY3AtJywgJycpLnJlcGxhY2UoJy1jaGVja2JveCcsICcnKTtcblxuICAgICAgICAgICAgLy8gRm9yIGRpc2FibGVkIGNoZWNrYm94ZXMsIHJlYWQgYWN0dWFsIGlucHV0IHN0YXRlIGluc3RlYWQgb2YgRm9tYW50aWMgVUkgQVBJXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKG9iaik7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gJGNoZWNrYm94Lmhhc0NsYXNzKCdkaXNhYmxlZCcpIHx8ICRpbnB1dC5wcm9wKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNEaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIEZvciBkaXNhYmxlZCBjaGVja2JveGVzLCByZWFkIHRoZSBhY3R1YWwgaW5wdXQgY2hlY2tlZCBzdGF0ZVxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2BkaGNwXyR7cm93SWR9YF0gPSAkaW5wdXQucHJvcCgnY2hlY2tlZCcpID09PSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZW5hYmxlZCBjaGVja2JveGVzLCB1c2UgRm9tYW50aWMgVUkgQVBJXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtyb3dJZH1gXSA9ICRjaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IGludGVybmV0IHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmludGVybmV0X2ludGVyZmFjZSA9IFN0cmluZygkY2hlY2tlZFJhZGlvLnZhbCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hcCBmb3JtIGZpZWxkIG5hbWVzIHRvIEFQSSBmaWVsZCBuYW1lcyBmb3IgcG9ydHNcbiAgICAgICAgY29uc3QgcG9ydEZpZWxkTWFwcGluZyA9IHtcbiAgICAgICAgICAgICdleHRlcm5hbFNJUFBvcnQnOiAnRVhURVJOQUxfU0lQX1BPUlQnLFxuICAgICAgICAgICAgJ2V4dGVybmFsVExTUG9ydCc6ICdFWFRFUk5BTF9UTFNfUE9SVCdcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBcHBseSBwb3J0IGZpZWxkIG1hcHBpbmdcbiAgICAgICAgT2JqZWN0LmtleXMocG9ydEZpZWxkTWFwcGluZykuZm9yRWFjaChmb3JtRmllbGQgPT4ge1xuICAgICAgICAgICAgY29uc3QgYXBpRmllbGQgPSBwb3J0RmllbGRNYXBwaW5nW2Zvcm1GaWVsZF07XG4gICAgICAgICAgICBpZiAocmVzdWx0LmRhdGFbZm9ybUZpZWxkXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYXBpRmllbGRdID0gcmVzdWx0LmRhdGFbZm9ybUZpZWxkXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbZm9ybUZpZWxkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlc3BvbnNlIGhhbmRsZWQgYnkgRm9ybVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBuZXR3b3Jrcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbmV0d29ya3MudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG5ldHdvcmtzLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmlubGluZSA9IHRydWU7IC8vIFNob3cgaW5saW5lIGVycm9ycyBuZXh0IHRvIGZpZWxkc1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE5ldHdvcmtBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlQ29uZmlnJztcblxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfW5ldHdvcmsvbW9kaWZ5L2A7XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbmV0d29yayBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRDb25maWd1cmF0aW9uKCkge1xuICAgICAgICBOZXR3b3JrQVBJLmdldENvbmZpZygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgVUkgYWZ0ZXIgbG9hZGluZyBkYXRhXG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIGZvcm0gZWxlbWVudHMgY29ubmVjdGVkIHdpdGggbm9uIGRvY2tlciBpbnN0YWxsYXRpb25zXG4gICAgICAgICAgICAgICAgLy8gVEVNUE9SQVJZOiBDb21tZW50ZWQgb3V0IGZvciBsb2NhbCBEb2NrZXIgdGVzdGluZ1xuICAgICAgICAgICAgICAgIC8vIGlmIChyZXNwb25zZS5kYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpcy1kb2NrZXInLCAnMScpO1xuICAgICAgICAgICAgICAgIC8vICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGludGVyZmFjZSB0YWJzIGFuZCBmb3JtcyBkeW5hbWljYWxseSBmcm9tIFJFU1QgQVBJIGRhdGFcbiAgICAgKi9cbiAgICBjcmVhdGVJbnRlcmZhY2VUYWJzKGRhdGEpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudScpO1xuICAgICAgICBjb25zdCAkY29udGVudCA9ICQoJyNldGgtaW50ZXJmYWNlcy1jb250ZW50Jyk7XG5cbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY29udGVudFxuICAgICAgICAkbWVudS5lbXB0eSgpO1xuICAgICAgICAkY29udGVudC5lbXB0eSgpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0YWJzIGZvciBleGlzdGluZyBpbnRlcmZhY2VzXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRhYklkID0gaWZhY2UuaWQ7XG4gICAgICAgICAgICBjb25zdCB0YWJMYWJlbCA9IGAke2lmYWNlLm5hbWUgfHwgaWZhY2UuaW50ZXJmYWNlfSAoJHtpZmFjZS5pbnRlcmZhY2V9JHtpZmFjZS52bGFuaWQgIT09ICcwJyAmJiBpZmFjZS52bGFuaWQgIT09IDAgPyBgLiR7aWZhY2UudmxhbmlkfWAgOiAnJ30pYDtcbiAgICAgICAgICAgIGNvbnN0IGlzQWN0aXZlID0gaW5kZXggPT09IDA7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbSAke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7dGFiTGFiZWx9XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgY29udGVudFxuICAgICAgICAgICAgLy8gT25seSBWTEFOIGludGVyZmFjZXMgY2FuIGJlIGRlbGV0ZWQgKHZsYW5pZCA+IDApXG4gICAgICAgICAgICBjb25zdCBjYW5EZWxldGUgPSBwYXJzZUludChpZmFjZS52bGFuaWQsIDEwKSA+IDA7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVCdXR0b24gPSBjYW5EZWxldGUgPyBgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJ1aSBpY29uIGxlZnQgbGFiZWxlZCBidXR0b24gZGVsZXRlLWludGVyZmFjZVwiIGRhdGEtdmFsdWU9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2hcIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubndfRGVsZXRlQ3VycmVudEludGVyZmFjZX1cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgIDogJyc7XG5cbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVJbnRlcmZhY2VGb3JtKGlmYWNlLCBpc0FjdGl2ZSwgZGVsZXRlQnV0dG9uKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSB0YWIgZm9yIG5ldyBWTEFOXG4gICAgICAgIGlmIChkYXRhLnRlbXBsYXRlKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRhdGEudGVtcGxhdGU7XG4gICAgICAgICAgICB0ZW1wbGF0ZS5pZCA9IDA7XG5cbiAgICAgICAgICAgIC8vIEFkZCBcIitcIiB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbVwiIGRhdGEtdGFiPVwiMFwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gcGx1c1wiPjwvaT5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRlbXBsYXRlIGZvcm0gd2l0aCBpbnRlcmZhY2Ugc2VsZWN0b3JcbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVUZW1wbGF0ZUZvcm0odGVtcGxhdGUsIGRhdGEuaW50ZXJmYWNlcykpO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBpbnRlcmZhY2Ugc2VsZWN0b3IgZHJvcGRvd24gZm9yIHRlbXBsYXRlXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKGlmYWNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdKSB7XG4gICAgICAgICAgICAgICAgICAgIHBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLmlkLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5pbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpZmFjZS5pbnRlcmZhY2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zID0gT2JqZWN0LnZhbHVlcyhwaHlzaWNhbEludGVyZmFjZXMpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ2ludGVyZmFjZV8wJywgeyBpbnRlcmZhY2VfMDogJycgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZSxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3ducyB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gYHN1Ym5ldF8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHt9O1xuICAgICAgICAgICAgLy8gQ29udmVydCBzdWJuZXQgdG8gc3RyaW5nIGZvciBkcm9wZG93biBtYXRjaGluZ1xuICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5zdWJuZXQgfHwgJzI0Jyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSAgLy8gQWRkIHNlYXJjaCBjbGFzcyBmb3Igc2VhcmNoYWJsZSBkcm9wZG93blxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0ZW1wbGF0ZSAoaWQgPSAwKVxuICAgICAgICBpZiAoZGF0YS50ZW1wbGF0ZSkge1xuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdzdWJuZXRfMCcsIHsgc3VibmV0XzA6ICcyNCcgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10gIC8vIEFkZCBzZWFyY2ggY2xhc3MgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykuZmlyc3QoKS50cmlnZ2VyKCdjbGljaycpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0aWMgcm91dGVzIHNlY3Rpb24gdmlzaWJpbGl0eVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBSZS1iaW5kIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiByZW1vdmVzIFRBQiBmcm9tIGZvcm0gYW5kIG1hcmtzIGludGVyZmFjZSBhcyBkaXNhYmxlZFxuICAgICAgICAvLyBBY3R1YWwgZGVsZXRpb24gaGFwcGVucyBvbiBmb3JtIHN1Ym1pdFxuICAgICAgICAkKCcuZGVsZXRlLWludGVyZmFjZScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIG1lbnUgaXRlbVxuICAgICAgICAgICAgJChgI2V0aC1pbnRlcmZhY2VzLW1lbnUgYVtkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCkucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0ICR0YWJDb250ZW50ID0gJChgI2V0aC1pbnRlcmZhY2VzLWNvbnRlbnQgLnRhYltkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCk7XG4gICAgICAgICAgICAkdGFiQ29udGVudC5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQWRkIGhpZGRlbiBmaWVsZCB0byBtYXJrIHRoaXMgaW50ZXJmYWNlIGFzIGRpc2FibGVkXG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5hcHBlbmQoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImRpc2FibGVkXyR7aW50ZXJmYWNlSWR9XCIgdmFsdWU9XCIxXCIgLz5gKTtcblxuICAgICAgICAgICAgLy8gU3dpdGNoIHRvIGZpcnN0IGF2YWlsYWJsZSB0YWJcbiAgICAgICAgICAgIGNvbnN0ICRmaXJzdFRhYiA9ICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEuaXRlbScpLmZpcnN0KCk7XG4gICAgICAgICAgICBpZiAoJGZpcnN0VGFiLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZmlyc3RUYWIudGFiKCdjaGFuZ2UgdGFiJywgJGZpcnN0VGFiLmF0dHIoJ2RhdGEtdGFiJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBlbmFibGUgc3VibWl0IGJ1dHRvblxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBESENQIGNoZWNrYm94IGhhbmRsZXJzXG4gICAgICAgICQoJy5kaGNwLWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1iaW5kIElQIGFkZHJlc3MgaW5wdXQgbWFza3NcbiAgICAgICAgJCgnLmlwYWRkcmVzcycpLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIC8vIEFkZCBWTEFOIElEIGNoYW5nZSBoYW5kbGVycyB0byBjb250cm9sIERIQ1AgY2hlY2tib3ggc3RhdGVcbiAgICAgICAgJCgnaW5wdXRbbmFtZV49XCJ2bGFuaWRfXCJdJykub2ZmKCdpbnB1dCBjaGFuZ2UnKS5vbignaW5wdXQgY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkdmxhbklucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJHZsYW5JbnB1dC5hdHRyKCduYW1lJykucmVwbGFjZSgndmxhbmlkXycsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IHZsYW5WYWx1ZSA9IHBhcnNlSW50KCR2bGFuSW5wdXQudmFsKCksIDEwKSB8fCAwO1xuICAgICAgICAgICAgY29uc3QgJGRoY3BDaGVja2JveCA9ICQoYCNkaGNwLSR7aW50ZXJmYWNlSWR9LWNoZWNrYm94YCk7XG5cbiAgICAgICAgICAgIGlmICh2bGFuVmFsdWUgPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gRGlzYWJsZSBESENQIGNoZWNrYm94IGZvciBWTEFOIGludGVyZmFjZXNcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdzZXQgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmZpbmQoJ2lucHV0JykucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRW5hYmxlIERIQ1AgY2hlY2tib3ggZm9yIG5vbi1WTEFOIGludGVyZmFjZXNcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3NldCBlbmFibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5maW5kKCdpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVXBkYXRlIGRpc2FibGVkIGZpZWxkIGNsYXNzZXNcbiAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmlnZ2VyIHRoZSBoYW5kbGVyIGZvciBleGlzdGluZyBWTEFOIGludGVyZmFjZXMgdG8gYXBwbHkgaW5pdGlhbCBzdGF0ZVxuICAgICAgICAkKCdpbnB1dFtuYW1lXj1cInZsYW5pZF9cIl0nKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGludGVybmV0IHJhZGlvIGJ1dHRvbnMgd2l0aCBGb21hbnRpYyBVSVxuICAgICAgICAkKCcuaW50ZXJuZXQtcmFkaW8nKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEFkZCBpbnRlcm5ldCByYWRpbyBidXR0b24gY2hhbmdlIGhhbmRsZXJcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXScpLm9mZignY2hhbmdlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJbnRlcmZhY2VJZCA9ICQodGhpcykudmFsKCk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgYWxsIEROUy9HYXRld2F5IGdyb3Vwc1xuICAgICAgICAgICAgJCgnW2NsYXNzXj1cImRucy1nYXRld2F5LWdyb3VwLVwiXScpLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBETlMvR2F0ZXdheSBncm91cCBmb3Igc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlXG4gICAgICAgICAgICAkKGAuZG5zLWdhdGV3YXktZ3JvdXAtJHtzZWxlY3RlZEludGVyZmFjZUlkfWApLnNob3coKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIFRBQiBpY29ucyAtIGFkZCBnbG9iZSBpY29uIHRvIHNlbGVjdGVkLCByZW1vdmUgZnJvbSBvdGhlcnNcbiAgICAgICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgdGFiKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRhYiA9ICQodGFiKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YWJJZCA9ICR0YWIuYXR0cignZGF0YS10YWInKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBnbG9iZSBpY29uXG4gICAgICAgICAgICAgICAgJHRhYi5maW5kKCcuZ2xvYmUuaWNvbicpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGdsb2JlIGljb24gdG8gc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlIFRBQlxuICAgICAgICAgICAgICAgIGlmICh0YWJJZCA9PT0gc2VsZWN0ZWRJbnRlcmZhY2VJZCkge1xuICAgICAgICAgICAgICAgICAgICAkdGFiLnByZXBlbmQoJzxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBETlMvR2F0ZXdheSByZWFkb25seSBzdGF0ZSB3aGVuIERIQ1AgY2hhbmdlc1xuICAgICAgICAkKCcuZGhjcC1jaGVja2JveCcpLm9mZignY2hhbmdlLmRuc2dhdGV3YXknKS5vbignY2hhbmdlLmRuc2dhdGV3YXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRjaGVja2JveC5hdHRyKCdpZCcpLnJlcGxhY2UoJ2RoY3AtJywgJycpLnJlcGxhY2UoJy1jaGVja2JveCcsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSAkY2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAgICAgLy8gRmluZCBETlMvR2F0ZXdheSBmaWVsZHMgZm9yIHRoaXMgaW50ZXJmYWNlXG4gICAgICAgICAgICBjb25zdCAkZG5zR2F0ZXdheUdyb3VwID0gJChgLmRucy1nYXRld2F5LWdyb3VwLSR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgICAgICBjb25zdCAkZG5zR2F0ZXdheUZpZWxkcyA9ICRkbnNHYXRld2F5R3JvdXAuZmluZCgnaW5wdXRbbmFtZV49XCJnYXRld2F5X1wiXSwgaW5wdXRbbmFtZV49XCJwcmltYXJ5ZG5zX1wiXSwgaW5wdXRbbmFtZV49XCJzZWNvbmRhcnlkbnNfXCJdJyk7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IG1ha2UgRE5TL0dhdGV3YXkgcmVhZC1vbmx5XG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAkZG5zR2F0ZXdheUZpZWxkcy5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBkaXNhYmxlZCAtPiBtYWtlIEROUy9HYXRld2F5IGVkaXRhYmxlXG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgaW5pdGlhbCBUQUIgaWNvbiB1cGRhdGUgZm9yIGNoZWNrZWQgcmFkaW8gYnV0dG9uXG4gICAgICAgIGNvbnN0ICRjaGVja2VkUmFkaW8gPSAkKCdpbnB1dFtuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCJdOmNoZWNrZWQnKTtcbiAgICAgICAgaWYgKCRjaGVja2VkUmFkaW8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJGNoZWNrZWRSYWRpby50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFwcGx5IGluaXRpYWwgZGlzYWJsZWQgc3RhdGUgZm9yIERIQ1AtZW5hYmxlZCBpbnRlcmZhY2VzXG4gICAgICAgIC8vIENhbGwgYWZ0ZXIgYWxsIGRyb3Bkb3ducyBhcmUgY3JlYXRlZFxuICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuICAgICAgICAvLyBSZS1zYXZlIGluaXRpYWwgZm9ybSB2YWx1ZXMgYW5kIHJlLWJpbmQgZXZlbnQgaGFuZGxlcnMgZm9yIGR5bmFtaWNhbGx5IGNyZWF0ZWQgaW5wdXRzXG4gICAgICAgIC8vIFRoaXMgaXMgZXNzZW50aWFsIGZvciBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gdG8gd29yayB3aXRoIGR5bmFtaWMgdGFic1xuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBPdmVycmlkZSBGb3JtIG1ldGhvZHMgdG8gbWFudWFsbHkgY29sbGVjdCBhbGwgZmllbGQgdmFsdWVzIChpbmNsdWRpbmcgZnJvbSB0YWJzKVxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxTYXZlSW5pdGlhbFZhbHVlcyA9IEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXM7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbENoZWNrVmFsdWVzID0gRm9ybS5jaGVja1ZhbHVlcztcblxuICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB2YWx1ZXMgZnJvbSBGb21hbnRpYyBVSSAobWF5IG1pc3MgZHluYW1pY2FsbHkgY3JlYXRlZCB0YWIgZmllbGRzKVxuICAgICAgICAgICAgICAgIGNvbnN0IGZvbWFudGljVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBhbGwgZmllbGQgdmFsdWVzIHRvIGNhdGNoIGZpZWxkcyB0aGF0IEZvbWFudGljIFVJIG1pc3Nlc1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hbnVhbFZhbHVlcyA9IHt9O1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgJGZpZWxkLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBNZXJnZSBib3RoIChtYW51YWwgdmFsdWVzIG92ZXJyaWRlIEZvbWFudGljIHZhbHVlcyBmb3IgZmllbGRzIHRoYXQgZXhpc3QgaW4gYm90aClcbiAgICAgICAgICAgICAgICBGb3JtLm9sZEZvcm1WYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmb21hbnRpY1ZhbHVlcywgbWFudWFsVmFsdWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdmFsdWVzIGZyb20gRm9tYW50aWMgVUlcbiAgICAgICAgICAgICAgICBjb25zdCBmb21hbnRpY1ZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlc1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hbnVhbFZhbHVlcyA9IHt9O1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgJGZpZWxkLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBNZXJnZSBib3RoXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Rm9ybVZhbHVlcyA9IE9iamVjdC5hc3NpZ24oe30sIGZvbWFudGljVmFsdWVzLCBtYW51YWxWYWx1ZXMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KEZvcm0ub2xkRm9ybVZhbHVlcykgPT09IEpTT04uc3RyaW5naWZ5KG5ld0Zvcm1WYWx1ZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0uc2V0RXZlbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5zZXRFdmVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZm9ybSBmb3IgZXhpc3RpbmcgaW50ZXJmYWNlXG4gICAgICovXG4gICAgY3JlYXRlSW50ZXJmYWNlRm9ybShpZmFjZSwgaXNBY3RpdmUsIGRlbGV0ZUJ1dHRvbikge1xuICAgICAgICBjb25zdCBpZCA9IGlmYWNlLmlkO1xuICAgICAgICBjb25zdCBpc0ludGVybmV0SW50ZXJmYWNlID0gaWZhY2UuaW50ZXJuZXQgfHwgZmFsc2U7XG5cbiAgICAgICAgLy8gRE5TL0dhdGV3YXkgZmllbGRzIHZpc2liaWxpdHkgYW5kIHJlYWQtb25seSBzdGF0ZVxuICAgICAgICBjb25zdCBkbnNHYXRld2F5VmlzaWJsZSA9IGlzSW50ZXJuZXRJbnRlcmZhY2UgPyAnJyA6ICdzdHlsZT1cImRpc3BsYXk6bm9uZTtcIic7XG4gICAgICAgIGNvbnN0IGRuc0dhdGV3YXlSZWFkb25seSA9IGlmYWNlLmRoY3AgPyAncmVhZG9ubHknIDogJyc7XG4gICAgICAgIGNvbnN0IGRuc0dhdGV3YXlEaXNhYmxlZENsYXNzID0gaWZhY2UuZGhjcCA/ICdkaXNhYmxlZCcgOiAnJztcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudCAke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmludGVyZmFjZX1cIiAvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcmZhY2VOYW1lfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5uYW1lIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGludGVybmV0LXJhZGlvXCIgaWQ9XCJpbnRlcm5ldC0ke2lkfS1yYWRpb1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCIgdmFsdWU9XCIke2lkfVwiICR7aXNJbnRlcm5ldEludGVyZmFjZSA/ICdjaGVja2VkJyA6ICcnfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD48aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVybmV0SW50ZXJmYWNlIHx8ICdJbnRlcm5ldCBJbnRlcmZhY2UnfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggZGhjcC1jaGVja2JveCR7aWZhY2UudmxhbmlkID4gMCA/ICcgZGlzYWJsZWQnIDogJyd9XCIgaWQ9XCJkaGNwLSR7aWR9LWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgJHtpZmFjZS52bGFuaWQgPiAwID8gJycgOiAoaWZhY2UuZGhjcCA/ICdjaGVja2VkJyA6ICcnKX0gJHtpZmFjZS52bGFuaWQgPiAwID8gJ2Rpc2FibGVkJyA6ICcnfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Vc2VESENQfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZHNcIiBpZD1cImlwLWFkZHJlc3MtZ3JvdXAtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImlwYWRkcl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcGFkZHIgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cInN1Ym5ldF8ke2lkfVwiIG5hbWU9XCJzdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2Uuc3VibmV0IHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ZsYW5JRH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiBuYW1lPVwidmxhbmlkXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnZsYW5pZCB8fCAnMCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZG5zLWdhdGV3YXktZ3JvdXAtJHtpZH1cIiAke2Ruc0dhdGV3YXlWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGhvcml6b250YWwgZGl2aWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVybmV0U2V0dGluZ3MgfHwgJ0ludGVybmV0IFNldHRpbmdzJ308L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19HYXRld2F5fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMCAke2Ruc0dhdGV3YXlEaXNhYmxlZENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImdhdGV3YXlfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuZ2F0ZXdheSB8fCAnJ31cIiAke2Ruc0dhdGV3YXlSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19QcmltYXJ5RE5TfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMCAke2Ruc0dhdGV3YXlEaXNhYmxlZENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInByaW1hcnlkbnNfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UucHJpbWFyeWRucyB8fCAnJ31cIiAke2Ruc0dhdGV3YXlSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWNvbmRhcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwICR7ZG5zR2F0ZXdheURpc2FibGVkQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwic2Vjb25kYXJ5ZG5zXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnNlY29uZGFyeWRucyB8fCAnJ31cIiAke2Ruc0dhdGV3YXlSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICR7ZGVsZXRlQnV0dG9ufVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBmb3JtIGZvciBuZXcgVkxBTiB0ZW1wbGF0ZVxuICAgICAqL1xuICAgIGNyZWF0ZVRlbXBsYXRlRm9ybSh0ZW1wbGF0ZSwgaW50ZXJmYWNlcykge1xuICAgICAgICBjb25zdCBpZCA9IDA7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnRcIiBkYXRhLXRhYj1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2V9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIGlkPVwiaW50ZXJmYWNlXyR7aWR9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVyZmFjZU5hbWV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgaWQ9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBkaGNwLWNoZWNrYm94XCIgaWQ9XCJkaGNwLSR7aWR9LWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgY2hlY2tlZCAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Vc2VESENQfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZHNcIiBpZD1cImlwLWFkZHJlc3MtZ3JvdXAtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImlwYWRkcl8ke2lkfVwiIHZhbHVlPVwiXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cInN1Ym5ldF8ke2lkfVwiIG5hbWU9XCJzdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIjI0XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVmxhbklEfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIG5hbWU9XCJ2bGFuaWRfJHtpZH1cIiB2YWx1ZT1cIjQwOTVcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3VibmV0IG1hc2sgb3B0aW9ucyBhcnJheSBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygc3VibmV0IG1hc2sgb3B0aW9uc1xuICAgICAqL1xuICAgIGdldFN1Ym5ldE9wdGlvbnNBcnJheSgpIHtcbiAgICAgICAgLy8gTmV0d29yayBtYXNrcyBmcm9tIENpZHI6OmdldE5ldE1hc2tzKCkgKGtyc29ydCBTT1JUX05VTUVSSUMpXG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7dmFsdWU6ICczMicsIHRleHQ6ICczMiAtIDI1NS4yNTUuMjU1LjI1NSd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMzEnLCB0ZXh0OiAnMzEgLSAyNTUuMjU1LjI1NS4yNTQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMwJywgdGV4dDogJzMwIC0gMjU1LjI1NS4yNTUuMjUyJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyOScsIHRleHQ6ICcyOSAtIDI1NS4yNTUuMjU1LjI0OCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjgnLCB0ZXh0OiAnMjggLSAyNTUuMjU1LjI1NS4yNDAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI3JywgdGV4dDogJzI3IC0gMjU1LjI1NS4yNTUuMjI0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNicsIHRleHQ6ICcyNiAtIDI1NS4yNTUuMjU1LjE5Mid9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjUnLCB0ZXh0OiAnMjUgLSAyNTUuMjU1LjI1NS4xMjgnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI0JywgdGV4dDogJzI0IC0gMjU1LjI1NS4yNTUuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjMnLCB0ZXh0OiAnMjMgLSAyNTUuMjU1LjI1NS4yNTQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIyJywgdGV4dDogJzIyIC0gMjU1LjI1NS4yNTIuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjEnLCB0ZXh0OiAnMjEgLSAyNTUuMjU1LjI0OC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMCcsIHRleHQ6ICcyMCAtIDI1NS4yNTUuMjQwLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE5JywgdGV4dDogJzE5IC0gMjU1LjI1NS4yMjQuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTgnLCB0ZXh0OiAnMTggLSAyNTUuMjU1LjE5Mi4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNycsIHRleHQ6ICcxNyAtIDI1NS4yNTUuMTI4LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE2JywgdGV4dDogJzE2IC0gMjU1LjI1NS4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE1JywgdGV4dDogJzE1IC0gMjU1LjI1NC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE0JywgdGV4dDogJzE0IC0gMjU1LjI1Mi4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEzJywgdGV4dDogJzEzIC0gMjU1LjI0OC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEyJywgdGV4dDogJzEyIC0gMjU1LjI0MC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzExJywgdGV4dDogJzExIC0gMjU1LjIyNC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEwJywgdGV4dDogJzEwIC0gMjU1LjE5Mi4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzknLCB0ZXh0OiAnOSAtIDI1NS4xMjguMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc4JywgdGV4dDogJzggLSAyNTUuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzcnLCB0ZXh0OiAnNyAtIDI1NC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNicsIHRleHQ6ICc2IC0gMjUyLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc1JywgdGV4dDogJzUgLSAyNDguMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzQnLCB0ZXh0OiAnNCAtIDI0MC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMycsIHRleHQ6ICczIC0gMjI0LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyJywgdGV4dDogJzIgLSAxOTIuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEnLCB0ZXh0OiAnMSAtIDEyOC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMCcsIHRleHQ6ICcwIC0gMC4wLjAuMCd9LFxuICAgICAgICBdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggY29uZmlndXJhdGlvbiBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGludGVyZmFjZSB0YWJzIGFuZCBmb3JtcyBkeW5hbWljYWxseVxuICAgICAgICBuZXR3b3Jrcy5jcmVhdGVJbnRlcmZhY2VUYWJzKGRhdGEpO1xuXG4gICAgICAgIC8vIFNldCBOQVQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEubmF0KSB7XG4gICAgICAgICAgICAvLyBCb29sZWFuIHZhbHVlcyBmcm9tIEFQSVxuICAgICAgICAgICAgaWYgKGRhdGEubmF0LnVzZW5hdCkge1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgZGF0YS5uYXQuZXh0aXBhZGRyIHx8ICcnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRob3N0bmFtZScsIGRhdGEubmF0LmV4dGhvc3RuYW1lIHx8ICcnKTtcblxuICAgICAgICAgICAgLy8gYXV0b1VwZGF0ZUV4dGVybmFsSXAgYm9vbGVhbiAoZmllbGQgbmFtZSBmcm9tIHRoZSBmb3JtKVxuICAgICAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVDaGVja2JveCA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGF1dG9VcGRhdGVDaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEubmF0LkFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQIHx8IGRhdGEubmF0LmF1dG9VcGRhdGVFeHRlcm5hbElwKSB7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBwb3J0IHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnBvcnRzKSB7XG4gICAgICAgICAgICAvLyBNYXAgQVBJIGZpZWxkIG5hbWVzIHRvIGZvcm0gZmllbGQgbmFtZXNcbiAgICAgICAgICAgIGNvbnN0IHBvcnRGaWVsZE1hcHBpbmcgPSB7XG4gICAgICAgICAgICAgICAgJ0VYVEVSTkFMX1NJUF9QT1JUJzogJ2V4dGVybmFsU0lQUG9ydCcsXG4gICAgICAgICAgICAgICAgJ0VYVEVSTkFMX1RMU19QT1JUJzogJ2V4dGVybmFsVExTUG9ydCcsXG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogJ1NJUF9QT1JUJyxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiAnVExTX1BPUlQnLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogJ1JUUF9QT1JUX0ZST00nLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6ICdSVFBfUE9SVF9UTydcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucG9ydHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBmb3JtRmllbGROYW1lID0gcG9ydEZpZWxkTWFwcGluZ1trZXldIHx8IGtleTtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGEucG9ydHNba2V5XTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBmb3JtRmllbGROYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBOQVQgaGVscCB0ZXh0IGFuZCBsYWJlbHMgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXNcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZU5BVEhlbHBUZXh0KGRhdGEucG9ydHMpO1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlUG9ydExhYmVscyhkYXRhLnBvcnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBhZGRpdGlvbmFsIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnNldHRpbmdzKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnNldHRpbmdzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywga2V5LCBkYXRhLnNldHRpbmdzW2tleV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdG9yZSBhdmFpbGFibGUgaW50ZXJmYWNlcyBmb3Igc3RhdGljIHJvdXRlcyBGSVJTVCAoYmVmb3JlIGxvYWRpbmcgcm91dGVzKVxuICAgICAgICBpZiAoZGF0YS5hdmFpbGFibGVJbnRlcmZhY2VzKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmF2YWlsYWJsZUludGVyZmFjZXMgPSBkYXRhLmF2YWlsYWJsZUludGVyZmFjZXM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2FkIHN0YXRpYyByb3V0ZXMgQUZURVIgYXZhaWxhYmxlSW50ZXJmYWNlcyBhcmUgc2V0XG4gICAgICAgIGlmIChkYXRhLnN0YXRpY1JvdXRlcykge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5sb2FkUm91dGVzKGRhdGEuc3RhdGljUm91dGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgYWZ0ZXIgcG9wdWxhdGlvbiBpcyBjb21wbGV0ZVxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdGhlIGJ1dHRvbiBpcyBkaXNhYmxlZCBhbmQgYWxsIGR5bmFtaWNhbGx5IGNyZWF0ZWQgZmllbGRzIGFyZSB0cmFja2VkXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHIgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pJC8pO1xuICAgIGlmIChmID09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyV2l0aFBvcnRPcHRpb25hbCA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkoOlswLTldKyk/JC8pO1xuICAgIGlmIChmID09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIFZMQU4gSUQgaXMgdW5pcXVlIGZvciBhIGdpdmVuIGludGVyZmFjZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2bGFuVmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIFZMQU4gSUQgaW5wdXQgZmllbGQuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgcGFyYW1ldGVyIGZvciB0aGUgcnVsZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIFZMQU4gSUQgaXMgdW5pcXVlIGZvciB0aGUgaW50ZXJmYWNlLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja1ZsYW4gPSAodmxhblZhbHVlLCBwYXJhbSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IHZsYW5zQXJyYXkgPSB7fTtcbiAgICBjb25zdCBhbGxWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgaWYgKGFsbFZhbHVlcy5pbnRlcmZhY2VfMCAhPT0gdW5kZWZpbmVkICYmIGFsbFZhbHVlcy5pbnRlcmZhY2VfMCA+IDApIHtcbiAgICAgICAgY29uc3QgbmV3RXRoTmFtZSA9IGFsbFZhbHVlc1tgaW50ZXJmYWNlXyR7YWxsVmFsdWVzLmludGVyZmFjZV8wfWBdO1xuICAgICAgICB2bGFuc0FycmF5W25ld0V0aE5hbWVdID0gW2FsbFZhbHVlcy52bGFuaWRfMF07XG4gICAgICAgIGlmIChhbGxWYWx1ZXMudmxhbmlkXzAgPT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAkLmVhY2goYWxsVmFsdWVzLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gJ2ludGVyZmFjZV8wJyB8fCBpbmRleCA9PT0gJ3ZsYW5pZF8wJykgcmV0dXJuO1xuICAgICAgICBpZiAoaW5kZXguaW5kZXhPZigndmxhbmlkJykgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgZXRoTmFtZSA9IGFsbFZhbHVlc1tgaW50ZXJmYWNlXyR7aW5kZXguc3BsaXQoJ18nKVsxXX1gXTtcbiAgICAgICAgICAgIGlmICgkLmluQXJyYXkodmFsdWUsIHZsYW5zQXJyYXlbZXRoTmFtZV0pID49IDBcbiAgICAgICAgICAgICAgICAmJiB2bGFuVmFsdWUgPT09IHZhbHVlXG4gICAgICAgICAgICAgICAgJiYgcGFyYW0gPT09IGluZGV4LnNwbGl0KCdfJylbMV0pIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZXRoTmFtZSBpbiB2bGFuc0FycmF5KSkge1xuICAgICAgICAgICAgICAgICAgICB2bGFuc0FycmF5W2V0aE5hbWVdID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0ucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy8gREhDUCB2YWxpZGF0aW9uIHJ1bGUgcmVtb3ZlZCAtIERIQ1AgY2hlY2tib3ggaXMgZGlzYWJsZWQgZm9yIFZMQU4gaW50ZXJmYWNlcywgbm8gdmFsaWRhdGlvbiBuZWVkZWRcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHRoZSBwcmVzZW5jZSBvZiBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgZXh0ZXJuYWwgSVAgaG9zdCBpbmZvcm1hdGlvbiBpcyBwcm92aWRlZCB3aGVuIE5BVCBpcyBlbmFibGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbmFsSXBIb3N0ID0gKCkgPT4ge1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLnVzZW5hdCA9PT0gJ29uJykge1xuICAgICAgICBpZiAoYWxsVmFsdWVzLmV4dGhvc3RuYW1lID09PSAnJyAmJiBhbGxWYWx1ZXMuZXh0aXBhZGRyID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHZhbHVlIGlzIGEgdmFsaWQgaG9zdG5hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBob3N0bmFtZVxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB2YWxpZCBob3N0bmFtZSwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy52YWxpZEhvc3RuYW1lID0gKHZhbHVlKSA9PiB7XG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIEVtcHR5IGlzIGhhbmRsZWQgYnkgZXh0ZW5hbElwSG9zdCBydWxlXG4gICAgfVxuXG4gICAgLy8gUkZDIDk1Mi9SRkMgMTEyMyBob3N0bmFtZSB2YWxpZGF0aW9uXG4gICAgLy8gLSBMYWJlbHMgc2VwYXJhdGVkIGJ5IGRvdHNcbiAgICAvLyAtIEVhY2ggbGFiZWwgMS02MyBjaGFyc1xuICAgIC8vIC0gT25seSBhbHBoYW51bWVyaWMgYW5kIGh5cGhlbnNcbiAgICAvLyAtIENhbm5vdCBzdGFydC9lbmQgd2l0aCBoeXBoZW5cbiAgICAvLyAtIFRvdGFsIGxlbmd0aCBtYXggMjUzIGNoYXJzXG4gICAgY29uc3QgaG9zdG5hbWVSZWdleCA9IC9eKD89LnsxLDI1M30kKSg/IS0pW2EtekEtWjAtOS1dezEsNjN9KD88IS0pKFxcLlthLXpBLVowLTktXXsxLDYzfSg/PCEtKSkqJC87XG4gICAgcmV0dXJuIGhvc3RuYW1lUmVnZXgudGVzdCh2YWx1ZSk7XG59O1xuXG5cbi8qKlxuICogU3RhdGljIFJvdXRlcyBNYW5hZ2VyIE1vZHVsZVxuICpcbiAqIE1hbmFnZXMgc3RhdGljIHJvdXRlIGNvbmZpZ3VyYXRpb24gd2hlbiBtdWx0aXBsZSBuZXR3b3JrIGludGVyZmFjZXMgZXhpc3RcbiAqL1xuY29uc3QgU3RhdGljUm91dGVzTWFuYWdlciA9IHtcbiAgICAkdGFibGU6ICQoJyNzdGF0aWMtcm91dGVzLXRhYmxlJyksXG4gICAgJHNlY3Rpb246ICQoJyNzdGF0aWMtcm91dGVzLXNlY3Rpb24nKSxcbiAgICAkYWRkQnV0dG9uOiAkKCcjYWRkLW5ldy1yb3V0ZScpLFxuICAgICR0YWJsZUNvbnRhaW5lcjogbnVsbCxcbiAgICAkZW1wdHlQbGFjZWhvbGRlcjogbnVsbCxcbiAgICByb3V0ZXM6IFtdLFxuICAgIGF2YWlsYWJsZUludGVyZmFjZXM6IFtdLCAvLyBXaWxsIGJlIHBvcHVsYXRlZCBmcm9tIFJFU1QgQVBJXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHN0YXRpYyByb3V0ZXMgbWFuYWdlbWVudFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENhY2hlIGVsZW1lbnRzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIgPSAkKCcjc3RhdGljLXJvdXRlcy1lbXB0eS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZUNvbnRhaW5lciA9ICQoJyNzdGF0aWMtcm91dGVzLXRhYmxlLWNvbnRhaW5lcicpO1xuXG4gICAgICAgIC8vIEhpZGUgc2VjdGlvbiBpZiBsZXNzIHRoYW4gMiBpbnRlcmZhY2VzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlVmlzaWJpbGl0eSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJhZy1hbmQtZHJvcFxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuXG4gICAgICAgIC8vIEFkZCBidXR0b24gaGFuZGxlclxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRhZGRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGZpcnN0IHJvdXRlIGJ1dHRvbiBoYW5kbGVyIChpbiBlbXB0eSBwbGFjZWhvbGRlcilcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNhZGQtZmlyc3Qtcm91dGUtYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIChkZWxlZ2F0ZWQpXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdjbGljaycsICcuZGVsZXRlLXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29weSBidXR0b24gaGFuZGxlciAoZGVsZWdhdGVkKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignY2xpY2snLCAnLmNvcHktcm91dGUtYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRzb3VyY2VSb3cgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5jb3B5Um91dGUoJHNvdXJjZVJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIElucHV0IGNoYW5nZSBoYW5kbGVyc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignaW5wdXQgY2hhbmdlJywgJy5uZXR3b3JrLWlucHV0LCAuZ2F0ZXdheS1pbnB1dCwgLmRlc2NyaXB0aW9uLWlucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQYXN0ZSBoYW5kbGVycyBmb3IgSVAgYWRkcmVzcyBmaWVsZHMgKGVuYWJsZSBjbGlwYm9hcmQgcGFzdGUgd2l0aCBpbnB1dG1hc2spXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdwYXN0ZScsICcubmV0d29yay1pbnB1dCwgLmdhdGV3YXktaW5wdXQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIEdldCBwYXN0ZWQgZGF0YSBmcm9tIGNsaXBib2FyZFxuICAgICAgICAgICAgbGV0IHBhc3RlZERhdGEgPSAnJztcbiAgICAgICAgICAgIGlmIChlLm9yaWdpbmFsRXZlbnQgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUuY2xpcGJvYXJkRGF0YSAmJiBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuY2xpcGJvYXJkRGF0YSAmJiB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTsgLy8gRm9yIElFXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsZWFuIHRoZSBwYXN0ZWQgZGF0YSAocmVtb3ZlIGV4dHJhIHNwYWNlcywga2VlcCBvbmx5IHZhbGlkIElQIGNoYXJhY3RlcnMpXG4gICAgICAgICAgICBjb25zdCBjbGVhbmVkRGF0YSA9IHBhc3RlZERhdGEudHJpbSgpLnJlcGxhY2UoL1teMC05Ll0vZywgJycpO1xuXG4gICAgICAgICAgICAvLyBHZXQgdGhlIGlucHV0IGVsZW1lbnRcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG5cbiAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IHJlbW92ZSBtYXNrXG4gICAgICAgICAgICAkaW5wdXQuaW5wdXRtYXNrKCdyZW1vdmUnKTtcblxuICAgICAgICAgICAgLy8gU2V0IHRoZSBjbGVhbmVkIHZhbHVlXG4gICAgICAgICAgICAkaW5wdXQudmFsKGNsZWFuZWREYXRhKTtcblxuICAgICAgICAgICAgLy8gUmVhcHBseSB0aGUgbWFzayBhZnRlciBhIHNob3J0IGRlbGF5XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkaW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgcGxhY2Vob2xkZXI6ICdfJ30pO1xuICAgICAgICAgICAgICAgICRpbnB1dC50cmlnZ2VyKCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgb3IgcmVpbml0aWFsaXplIGRyYWctYW5kLWRyb3AgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcmFnQW5kRHJvcCgpIHtcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyB0YWJsZURuRCBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLmRhdGEoJ3RhYmxlRG5EJykpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLnRhYmxlRG5EVXBkYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3BcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2aXNpYmlsaXR5IGJhc2VkIG9uIG51bWJlciBvZiBpbnRlcmZhY2VzXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eSgpIHtcbiAgICAgICAgLy8gU2hvdy9oaWRlIHNlY3Rpb24gYmFzZWQgb24gbnVtYmVyIG9mIGludGVyZmFjZXNcbiAgICAgICAgY29uc3QgaW50ZXJmYWNlQ291bnQgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5ub3QoJ1tkYXRhLXRhYj1cIjBcIl0nKS5sZW5ndGg7XG4gICAgICAgIGlmIChpbnRlcmZhY2VDb3VudCA+IDEpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHNlY3Rpb24uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kc2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29weSBhIHJvdXRlIHJvdyAoY3JlYXRlIGR1cGxpY2F0ZSlcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHNvdXJjZVJvdyAtIFNvdXJjZSByb3cgdG8gY29weVxuICAgICAqL1xuICAgIGNvcHlSb3V0ZSgkc291cmNlUm93KSB7XG4gICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkc291cmNlUm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKTtcbiAgICAgICAgY29uc3Qgc3VibmV0RHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHtyb3V0ZUlkfWA7XG4gICAgICAgIGNvbnN0IGludGVyZmFjZURyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7cm91dGVJZH1gO1xuXG4gICAgICAgIC8vIENvbGxlY3QgZGF0YSBmcm9tIHNvdXJjZSByb3dcbiAgICAgICAgY29uc3Qgcm91dGVEYXRhID0ge1xuICAgICAgICAgICAgbmV0d29yazogJHNvdXJjZVJvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgc3VibmV0OiAkKGAjJHtzdWJuZXREcm9wZG93bklkfWApLnZhbCgpLFxuICAgICAgICAgICAgZ2F0ZXdheTogJHNvdXJjZVJvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgaW50ZXJmYWNlOiAkKGAjJHtpbnRlcmZhY2VEcm9wZG93bklkfWApLnZhbCgpIHx8ICcnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICRzb3VyY2VSb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKClcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgbmV3IHJvdXRlIHdpdGggY29waWVkIGRhdGFcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZShyb3V0ZURhdGEpO1xuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGFmdGVyIGFkZGluZyByb3V0ZVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZW1wdHkgc3RhdGUgdmlzaWJpbGl0eVxuICAgICAqL1xuICAgIHVwZGF0ZUVtcHR5U3RhdGUoKSB7XG4gICAgICAgIGNvbnN0ICRleGlzdGluZ1Jvd3MgPSAkKCcucm91dGUtcm93Jyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBwbGFjZWhvbGRlciwgaGlkZSB0YWJsZSBjb250YWluZXJcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIuc2hvdygpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBlbXB0eSBwbGFjZWhvbGRlciwgc2hvdyB0YWJsZSBjb250YWluZXJcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcm91dGVEYXRhIC0gUm91dGUgZGF0YSAob3B0aW9uYWwpXG4gICAgICovXG4gICAgYWRkUm91dGUocm91dGVEYXRhID0gbnVsbCkge1xuICAgICAgICBjb25zdCAkdGVtcGxhdGUgPSAkKCcucm91dGUtcm93LXRlbXBsYXRlJykubGFzdCgpO1xuICAgICAgICBjb25zdCAkbmV3Um93ID0gJHRlbXBsYXRlLmNsb25lKHRydWUpO1xuICAgICAgICBjb25zdCByb3V0ZUlkID0gcm91dGVEYXRhPy5pZCB8fCBgbmV3XyR7RGF0ZS5ub3coKX1gO1xuXG4gICAgICAgICRuZXdSb3dcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncm91dGUtcm93LXRlbXBsYXRlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygncm91dGUtcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdkYXRhLXJvdXRlLWlkJywgcm91dGVJZClcbiAgICAgICAgICAgIC5zaG93KCk7XG5cbiAgICAgICAgLy8gU2V0IHZhbHVlcyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAocm91dGVEYXRhKSB7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKHJvdXRlRGF0YS5uZXR3b3JrKTtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwocm91dGVEYXRhLmdhdGV3YXkpO1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcuZGVzY3JpcHRpb24taW5wdXQnKS52YWwocm91dGVEYXRhLmRlc2NyaXB0aW9uIHx8ICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB0byB0YWJsZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdSb3dzID0gJCgnLnJvdXRlLXJvdycpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nUm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRleGlzdGluZ1Jvd3MubGFzdCgpLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIHRoaXMgcm93XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duKCRuZXdSb3csIHJvdXRlRGF0YT8uc3VibmV0IHx8ICcyNCcpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW50ZXJmYWNlIGRyb3Bkb3duIGZvciB0aGlzIHJvd1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93bigkbmV3Um93LCByb3V0ZURhdGE/LmludGVyZmFjZSB8fCAnJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dG1hc2sgZm9yIElQIGFkZHJlc3MgZmllbGRzXG4gICAgICAgICRuZXdSb3cuZmluZCgnLmlwYWRkcmVzcycpLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsIHBsYWNlaG9sZGVyOiAnXyd9KTtcblxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVByaW9yaXRpZXMoKTtcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIGEgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBSb3cgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RlZFZhbHVlIC0gU2VsZWN0ZWQgc3VibmV0IHZhbHVlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duKCRyb3csIHNlbGVjdGVkVmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRyb3cuZmluZCgnLnN1Ym5ldC1kcm9wZG93bi1jb250YWluZXInKTtcbiAgICAgICAgY29uc3QgZHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHskcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKX1gO1xuXG4gICAgICAgICRjb250YWluZXIuaHRtbChgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIiR7ZHJvcGRvd25JZH1cIiAvPmApO1xuXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihkcm9wZG93bklkLFxuICAgICAgICAgICAgeyBbZHJvcGRvd25JZF06IHNlbGVjdGVkVmFsdWUgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBpbnRlcmZhY2UgZHJvcGRvd24gZm9yIGEgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBSb3cgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RlZFZhbHVlIC0gU2VsZWN0ZWQgaW50ZXJmYWNlIHZhbHVlIChlbXB0eSBzdHJpbmcgPSBhdXRvKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93bigkcm93LCBzZWxlY3RlZFZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkcm93LmZpbmQoJy5pbnRlcmZhY2UtZHJvcGRvd24tY29udGFpbmVyJyk7XG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7JHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyl9YDtcblxuICAgICAgICAkY29udGFpbmVyLmh0bWwoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCIke2Ryb3Bkb3duSWR9XCIgLz5gKTtcblxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biBvcHRpb25zOiBcIkF1dG9cIiArIGF2YWlsYWJsZSBpbnRlcmZhY2VzXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0F1dG8gfHwgJ0F1dG8nIH0sXG4gICAgICAgICAgICAuLi5TdGF0aWNSb3V0ZXNNYW5hZ2VyLmF2YWlsYWJsZUludGVyZmFjZXMubWFwKGlmYWNlID0+ICh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLnZhbHVlLFxuICAgICAgICAgICAgICAgIHRleHQ6IGlmYWNlLmxhYmVsXG4gICAgICAgICAgICB9KSlcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBQcmVwYXJlIGZvcm0gZGF0YSBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHt9O1xuICAgICAgICBmb3JtRGF0YVtkcm9wZG93bklkXSA9IHNlbGVjdGVkVmFsdWUgfHwgJyc7IC8vIEVuc3VyZSB3ZSBwYXNzIGVtcHR5IHN0cmluZyBmb3IgXCJBdXRvXCJcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZHJvcGRvd25JZCxcbiAgICAgICAgICAgIGZvcm1EYXRhLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG9wdGlvbnMsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcm91dGUgcHJpb3JpdGllcyBiYXNlZCBvbiB0YWJsZSBvcmRlclxuICAgICAqL1xuICAgIHVwZGF0ZVByaW9yaXRpZXMoKSB7XG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS1wcmlvcml0eScsIGluZGV4ICsgMSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHJvdXRlcyBmcm9tIGRhdGFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByb3V0ZXNEYXRhIC0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqL1xuICAgIGxvYWRSb3V0ZXMocm91dGVzRGF0YSkge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyByb3V0ZXNcbiAgICAgICAgJCgnLnJvdXRlLXJvdycpLnJlbW92ZSgpO1xuXG4gICAgICAgIC8vIEFkZCBlYWNoIHJvdXRlXG4gICAgICAgIGlmIChyb3V0ZXNEYXRhICYmIHJvdXRlc0RhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcm91dGVzRGF0YS5mb3JFYWNoKHJvdXRlID0+IHtcbiAgICAgICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKHJvdXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBzdGF0ZSBpZiBubyByb3V0ZXNcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlRW1wdHlTdGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGRyYWctYW5kLWRyb3AgYWZ0ZXIgYWRkaW5nIHJvdXRlc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0IHJvdXRlcyBmcm9tIHRhYmxlXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiByb3V0ZSBvYmplY3RzXG4gICAgICovXG4gICAgY29sbGVjdFJvdXRlcygpIHtcbiAgICAgICAgY29uc3Qgcm91dGVzID0gW107XG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChyb3cpO1xuICAgICAgICAgICAgY29uc3Qgcm91dGVJZCA9ICRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpO1xuICAgICAgICAgICAgY29uc3Qgc3VibmV0RHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHtyb3V0ZUlkfWA7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VEcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0ke3JvdXRlSWR9YDtcblxuICAgICAgICAgICAgcm91dGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIGlkOiByb3V0ZUlkLnN0YXJ0c1dpdGgoJ25ld18nKSA/IG51bGwgOiByb3V0ZUlkLFxuICAgICAgICAgICAgICAgIG5ldHdvcms6ICRyb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBzdWJuZXQ6ICQoYCMke3N1Ym5ldERyb3Bkb3duSWR9YCkudmFsKCksXG4gICAgICAgICAgICAgICAgZ2F0ZXdheTogJHJvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgICAgIGludGVyZmFjZTogJChgIyR7aW50ZXJmYWNlRHJvcGRvd25JZH1gKS52YWwoKSB8fCAnJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJHJvdy5maW5kKCcuZGVzY3JpcHRpb24taW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXggKyAxXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByb3V0ZXM7XG4gICAgfVxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG5ldHdvcmtzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19