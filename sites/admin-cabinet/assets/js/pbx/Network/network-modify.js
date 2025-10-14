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
    } // Load static routes if provided


    if (data.staticRoutes) {
      StaticRoutesManager.loadRoutes(data.staticRoutes);
    } // Store available interfaces for static routes


    if (data.availableInterfaces) {
      StaticRoutesManager.availableInterfaces = data.availableInterfaces;
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
  routes: [],
  availableInterfaces: [],
  // Will be populated from REST API

  /**
   * Initialize static routes management
   */
  initialize: function initialize() {
    // Hide section if less than 2 interfaces
    StaticRoutesManager.updateVisibility(); // Initialize drag-and-drop

    StaticRoutesManager.initializeDragAndDrop(); // Add button handler

    StaticRoutesManager.$addButton.on('click', function (e) {
      e.preventDefault();
      StaticRoutesManager.addRoute();
    }); // Delete button handler (delegated)

    StaticRoutesManager.$table.on('click', '.delete-route-button', function (e) {
      e.preventDefault();
      $(e.target).closest('tr').remove();
      StaticRoutesManager.updatePriorities();
      Form.dataChanged();
    }); // Copy button handler (delegated)

    StaticRoutesManager.$table.on('click', '.copy-route-button', function (e) {
      e.preventDefault();
      var $sourceRow = $(e.target).closest('tr');
      StaticRoutesManager.copyRoute($sourceRow);
    }); // Input change handlers

    StaticRoutesManager.$table.on('input change', '.network-input, .gateway-input', function () {
      Form.dataChanged();
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
      "interface": $("#".concat(interfaceDropdownId)).val() || ''
    }; // Add new route with copied data

    StaticRoutesManager.addRoute(routeData); // Reinitialize drag-and-drop after adding route

    StaticRoutesManager.initializeDragAndDrop();
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
    } // Add to table


    var $existingRows = $('.route-row');

    if ($existingRows.length === 0) {
      $template.after($newRow);
    } else {
      $existingRows.last().after($newRow);
    } // Initialize subnet dropdown for this row


    StaticRoutesManager.initializeSubnetDropdown($newRow, (routeData === null || routeData === void 0 ? void 0 : routeData.subnet) || '24'); // Initialize interface dropdown for this row

    StaticRoutesManager.initializeInterfaceDropdown($newRow, (routeData === null || routeData === void 0 ? void 0 : routeData["interface"]) || ''); // Initialize input masks

    $newRow.find('.ipaddress').inputmask({
      alias: 'ip',
      placeholder: '_'
    });
    StaticRoutesManager.updatePriorities();
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
    })));
    DynamicDropdownBuilder.buildDropdown(dropdownId, _defineProperty({}, dropdownId, selectedValue), {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwiY3VycmVudEV4dElwQWRkciIsImZvcm0iLCJwb3J0TWF0Y2giLCJtYXRjaCIsInBvcnQiLCJuZXdFeHRJcEFkZHIiLCJpcCIsInRyaWdnZXIiLCJ1cGRhdGVOQVRIZWxwVGV4dCIsInBvcnRzIiwiU0lQX1BPUlQiLCJUTFNfUE9SVCIsIlJUUF9QT1JUX0ZST00iLCJSVFBfUE9SVF9UTyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGRoY3BDaGVja2JveCIsImlzRGhjcEVuYWJsZWQiLCIkaXBGaWVsZCIsIiRzdWJuZXREcm9wZG93biIsInByb3AiLCJjbG9zZXN0IiwidmFsIiwiYWRkTmV3Rm9ybVJ1bGVzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsIm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiT2JqZWN0IiwiYXNzaWduIiwiZGF0YSIsInN0YXRpY1JvdXRlcyIsImNvbGxlY3RSb3V0ZXMiLCJmaW5kIiwiJGlucHV0IiwibmFtZSIsInZhbHVlIiwidW5kZWZpbmVkIiwiU3RyaW5nIiwiJHNlbGVjdCIsInVzZW5hdCIsIiRhdXRvVXBkYXRlRGl2IiwicGFyZW50IiwiYXV0b1VwZGF0ZUV4dGVybmFsSXAiLCJpbnB1dElkIiwicm93SWQiLCJyZXBsYWNlIiwiJGNoZWNrYm94IiwiaXNEaXNhYmxlZCIsImhhc0NsYXNzIiwiJGNoZWNrZWRSYWRpbyIsImludGVybmV0X2ludGVyZmFjZSIsInBvcnRGaWVsZE1hcHBpbmciLCJrZXlzIiwiZm9yRWFjaCIsImZvcm1GaWVsZCIsImFwaUZpZWxkIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImlubGluZSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJjcmVhdGVJbnRlcmZhY2VUYWJzIiwiJG1lbnUiLCIkY29udGVudCIsImVtcHR5IiwiaW50ZXJmYWNlcyIsImlmYWNlIiwidGFiSWQiLCJpZCIsInRhYkxhYmVsIiwidmxhbmlkIiwiaXNBY3RpdmUiLCJhcHBlbmQiLCJjYW5EZWxldGUiLCJwYXJzZUludCIsImRlbGV0ZUJ1dHRvbiIsIm53X0RlbGV0ZUN1cnJlbnRJbnRlcmZhY2UiLCJjcmVhdGVJbnRlcmZhY2VGb3JtIiwidGVtcGxhdGUiLCJjcmVhdGVUZW1wbGF0ZUZvcm0iLCJwaHlzaWNhbEludGVyZmFjZXMiLCJ0b1N0cmluZyIsInBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyIsInZhbHVlcyIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW50ZXJmYWNlXzAiLCJzdGF0aWNPcHRpb25zIiwicGxhY2Vob2xkZXIiLCJud19TZWxlY3RJbnRlcmZhY2UiLCJhbGxvd0VtcHR5IiwiZmllbGROYW1lIiwiZm9ybURhdGEiLCJzdWJuZXQiLCJnZXRTdWJuZXRPcHRpb25zQXJyYXkiLCJud19TZWxlY3ROZXR3b3JrTWFzayIsImFkZGl0aW9uYWxDbGFzc2VzIiwic3VibmV0XzAiLCJ0YWIiLCJmaXJzdCIsInVwZGF0ZVZpc2liaWxpdHkiLCJvZmYiLCIkYnV0dG9uIiwiaW50ZXJmYWNlSWQiLCJyZW1vdmUiLCIkdGFiQ29udGVudCIsIiRmaXJzdFRhYiIsImVuYWJsZURpcnJpdHkiLCJjaGVja1ZhbHVlcyIsIiR2bGFuSW5wdXQiLCJ2bGFuVmFsdWUiLCJzZWxlY3RlZEludGVyZmFjZUlkIiwiaGlkZSIsInNob3ciLCIkdGFiIiwicHJlcGVuZCIsIiRkbnNHYXRld2F5R3JvdXAiLCIkZG5zR2F0ZXdheUZpZWxkcyIsIm9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMiLCJzYXZlSW5pdGlhbFZhbHVlcyIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJmb21hbnRpY1ZhbHVlcyIsIm1hbnVhbFZhbHVlcyIsIiRmaWVsZCIsImlzIiwib2xkRm9ybVZhbHVlcyIsIm5ld0Zvcm1WYWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsInNldEV2ZW50cyIsImlzSW50ZXJuZXRJbnRlcmZhY2UiLCJpbnRlcm5ldCIsImRuc0dhdGV3YXlWaXNpYmxlIiwiZG5zR2F0ZXdheVJlYWRvbmx5IiwiZGhjcCIsImRuc0dhdGV3YXlEaXNhYmxlZENsYXNzIiwibndfSW50ZXJmYWNlTmFtZSIsIm53X0ludGVybmV0SW50ZXJmYWNlIiwibndfVXNlREhDUCIsIm53X0lQQWRkcmVzcyIsImlwYWRkciIsIm53X05ldHdvcmtNYXNrIiwibndfVmxhbklEIiwibndfSW50ZXJuZXRTZXR0aW5ncyIsIm53X0dhdGV3YXkiLCJnYXRld2F5IiwibndfUHJpbWFyeUROUyIsInByaW1hcnlkbnMiLCJud19TZWNvbmRhcnlETlMiLCJzZWNvbmRhcnlkbnMiLCJuYXQiLCIkYXV0b1VwZGF0ZUNoZWNrYm94IiwiQVVUT19VUERBVEVfRVhURVJOQUxfSVAiLCJrZXkiLCJmb3JtRmllbGROYW1lIiwibG9hZFJvdXRlcyIsImF2YWlsYWJsZUludGVyZmFjZXMiLCJpbml0aWFsaXplRGlycml0eSIsImZuIiwiZiIsImkiLCJhIiwiaXBhZGRyV2l0aFBvcnRPcHRpb25hbCIsImNoZWNrVmxhbiIsInBhcmFtIiwiYWxsVmFsdWVzIiwibmV3RXRoTmFtZSIsInZsYW5pZF8wIiwiaW5kZXhPZiIsImV0aE5hbWUiLCJzcGxpdCIsImluQXJyYXkiLCJwdXNoIiwiZXh0ZW5hbElwSG9zdCIsInZhbGlkSG9zdG5hbWUiLCJob3N0bmFtZVJlZ2V4IiwidGVzdCIsIiR0YWJsZSIsIiRzZWN0aW9uIiwiJGFkZEJ1dHRvbiIsInJvdXRlcyIsImluaXRpYWxpemVEcmFnQW5kRHJvcCIsImFkZFJvdXRlIiwidGFyZ2V0IiwidXBkYXRlUHJpb3JpdGllcyIsImRhdGFDaGFuZ2VkIiwiJHNvdXJjZVJvdyIsImNvcHlSb3V0ZSIsInRhYmxlRG5EVXBkYXRlIiwidGFibGVEbkQiLCJvbkRyb3AiLCJkcmFnSGFuZGxlIiwiaW50ZXJmYWNlQ291bnQiLCJub3QiLCJyb3V0ZUlkIiwic3VibmV0RHJvcGRvd25JZCIsImludGVyZmFjZURyb3Bkb3duSWQiLCJyb3V0ZURhdGEiLCJuZXR3b3JrIiwiJHRlbXBsYXRlIiwibGFzdCIsIiRuZXdSb3ciLCJjbG9uZSIsIkRhdGUiLCJub3ciLCIkZXhpc3RpbmdSb3dzIiwiYWZ0ZXIiLCJpbml0aWFsaXplU3VibmV0RHJvcGRvd24iLCJpbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24iLCIkcm93Iiwic2VsZWN0ZWRWYWx1ZSIsIiRjb250YWluZXIiLCJkcm9wZG93bklkIiwib3B0aW9ucyIsIm53X0F1dG8iLCJtYXAiLCJsYWJlbCIsInJvdyIsInJvdXRlc0RhdGEiLCJyb3V0ZSIsInN0YXJ0c1dpdGgiLCJwcmlvcml0eSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYkMsRUFBQUEsY0FBYyxFQUFFQyxDQUFDLENBQUMsVUFBRCxDQURKOztBQUdiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUQsQ0FBQyxDQUFDLGVBQUQsQ0FQRTtBQVNiRSxFQUFBQSxVQUFVLEVBQUVGLENBQUMsQ0FBQyx5QkFBRCxDQVRBO0FBVWJHLEVBQUFBLFVBQVUsRUFBRUgsQ0FBQyxDQUFD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R0FBNUIsRUFGRDtBQUdSNkYsUUFBQUEsTUFBTSxFQUFFekssQ0FBQyxZQUFLaVIsZ0JBQUwsRUFBRCxDQUEwQnJNLEdBQTFCLEVBSEE7QUFJUm1KLFFBQUFBLE9BQU8sRUFBRWdFLElBQUksQ0FBQy9MLElBQUwsQ0FBVSxnQkFBVixFQUE0QnBCLEdBQTVCLEVBSkQ7QUFLUixxQkFBVzVFLENBQUMsWUFBS2tSLG1CQUFMLEVBQUQsQ0FBNkJ0TSxHQUE3QixNQUFzQyxFQUx6QztBQU1SK04sUUFBQUEsUUFBUSxFQUFFek8sS0FBSyxHQUFHO0FBTlYsT0FBWjtBQVFILEtBZEQ7QUFlQSxXQUFPZ00sTUFBUDtBQUNIO0FBdFB1QixDQUE1QjtBQXlQQTtBQUNBO0FBQ0E7O0FBQ0FsUSxDQUFDLENBQUM0UyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCL1MsRUFBQUEsUUFBUSxDQUFDcUIsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN5c2luZm9BUEksIE5ldHdvcmtBUEksIFVzZXJNZXNzYWdlLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBuZXR3b3JrIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBuZXR3b3Jrc1xuICovXG5jb25zdCBuZXR3b3JrcyA9IHtcbiAgICAkZ2V0TXlJcEJ1dHRvbjogJCgnI2dldG15aXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNuZXR3b3JrLWZvcm0nKSxcblxuICAgICRkcm9wRG93bnM6ICQoJyNuZXR3b3JrLWZvcm0gLmRyb3Bkb3duJyksXG4gICAgJGV4dGlwYWRkcjogJCgnI2V4dGlwYWRkcicpLFxuICAgICRpcGFkZHJlc3NJbnB1dDogJCgnLmlwYWRkcmVzcycpLFxuICAgIHZsYW5zQXJyYXk6IHt9LFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnRzIHdpdGggd2Ugc2hvdWxkIGhpZGUgZnJvbSB0aGUgZm9ybSBmb3IgZG9ja2VyIGluc3RhbGxhdGlvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub3RTaG93T25Eb2NrZXJEaXZzOiAkKCcuZG8tbm90LXNob3ctaWYtZG9ja2VyJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0aXBhZGRyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyV2l0aFBvcnRPcHRpb25hbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGhvc3RuYW1lOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAndXNlbmF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd2YWxpZEhvc3RuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVIb3N0bmFtZUludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gTG9hZCBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAgICBuZXR3b3Jrcy5sb2FkQ29uZmlndXJhdGlvbigpO1xuXG4gICAgICAgIC8vIEhhbmRsZXMgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgJ3VzZW5hdC1jaGVja2JveCcuXG4gICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBuZXR3b3Jrcy4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gREhDUCBjaGVja2JveCBoYW5kbGVycyB3aWxsIGJlIGJvdW5kIGFmdGVyIHRhYnMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHlcblxuICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFN5c2luZm9BUEkuZ2V0RXh0ZXJuYWxJcEluZm8obmV0d29ya3MuY2JBZnRlckdldEV4dGVybmFsSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG4gICAgICAgIG5ldHdvcmtzLiRpcGFkZHJlc3NJbnB1dC5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICBuZXR3b3Jrcy5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3RhdGljIHJvdXRlcyBtYW5hZ2VyXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIEhpZGUgZm9ybSBlbGVtZW50cyBjb25uZWN0ZWQgd2l0aCBub24gZG9ja2VyIGluc3RhbGxhdGlvbnNcbiAgICAgICAgLy8gVEVNUE9SQVJZOiBDb21tZW50ZWQgb3V0IGZvciBsb2NhbCBEb2NrZXIgdGVzdGluZ1xuICAgICAgICAvLyBpZiAobmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywnaXMtZG9ja2VyJyk9PT1cIjFcIikge1xuICAgICAgICAvLyAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICAvLyB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGdldHRpbmcgdGhlIGV4dGVybmFsIElQIGZyb20gYSByZW1vdGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4gSWYgZmFsc2UsIGluZGljYXRlcyBhbiBlcnJvciBvY2N1cnJlZC5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0RXh0ZXJuYWxJcChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dElwQWRkciA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRpcGFkZHInKTtcbiAgICAgICAgICAgIGNvbnN0IHBvcnRNYXRjaCA9IGN1cnJlbnRFeHRJcEFkZHIubWF0Y2goLzooXFxkKykkLyk7XG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gcG9ydE1hdGNoID8gJzonICsgcG9ydE1hdGNoWzFdIDogJyc7XG4gICAgICAgICAgICBjb25zdCBuZXdFeHRJcEFkZHIgPSByZXNwb25zZS5pcCArIHBvcnQ7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgbmV3RXh0SXBBZGRyKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGV4dGVybmFsIGhvc3RuYW1lIHdoZW4gZ2V0dGluZyBleHRlcm5hbCBJUFxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgJycpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBoZWxwIHRleHQgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVOQVRIZWxwVGV4dChwb3J0cykge1xuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQX1BPUlQgfHwgIXBvcnRzLlRMU19QT1JUIHx8ICFwb3J0cy5SVFBfUE9SVF9GUk9NIHx8ICFwb3J0cy5SVFBfUE9SVF9UTykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFNJUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRzaXBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXNpcC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRzaXBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcFRleHQgPSBpMThuKCdud19OQVRJbmZvMycsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBfUE9SVCxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwUG9ydFZhbHVlcy5odG1sKHNpcFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFJUUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRydHBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRydHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJ0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUF9QT1JUX0ZST00sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQX1BPUlRfVE9cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHJ0cFBvcnRWYWx1ZXMuaHRtbChydHBUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcG9ydCBmaWVsZCBsYWJlbHMgd2l0aCBhY3R1YWwgaW50ZXJuYWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVQb3J0TGFiZWxzKHBvcnRzKSB7XG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHdlIGhhdmUgcG9ydCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgaWYgKCFwb3J0cy5TSVBfUE9SVCB8fCAhcG9ydHMuVExTX1BPUlQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBleHRlcm5hbCBTSVAgcG9ydCBsYWJlbCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkc2lwTGFiZWwgPSAkKCcjZXh0ZXJuYWwtc2lwLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRzaXBMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNTSVBQb3J0Jywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUF9QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBMYWJlbC50ZXh0KHNpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZXJuYWwgVExTIHBvcnQgbGFiZWwgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHRsc0xhYmVsID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkdGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkdGxzTGFiZWwudGV4dCh0bHNMYWJlbFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlICdkaXNhYmxlZCcgY2xhc3MgZm9yIHNwZWNpZmljIGZpZWxkcyBiYXNlZCBvbiB0aGVpciBjaGVja2JveCBzdGF0ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldGggPSAkKG9iaikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2V0aH0tY2hlY2tib3hgKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgICAgIC8vIEZpbmQgSVAgYWRkcmVzcyBhbmQgc3VibmV0IGZpZWxkc1xuICAgICAgICAgICAgY29uc3QgJGlwRmllbGQgPSAkKGBpbnB1dFtuYW1lPVwiaXBhZGRyXyR7ZXRofVwiXWApO1xuICAgICAgICAgICAgLy8gRHluYW1pY0Ryb3Bkb3duQnVpbGRlciBjcmVhdGVzIGRyb3Bkb3duIHdpdGggaWQgcGF0dGVybjogZmllbGROYW1lLWRyb3Bkb3duXG4gICAgICAgICAgICBjb25zdCAkc3VibmV0RHJvcGRvd24gPSAkKGAjc3VibmV0XyR7ZXRofS1kcm9wZG93bmApO1xuXG4gICAgICAgICAgICBpZiAoaXNEaGNwRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZW5hYmxlZCAtPiBtYWtlIElQL3N1Ym5ldCByZWFkLW9ubHkgYW5kIGFkZCBkaXNhYmxlZCBjbGFzc1xuICAgICAgICAgICAgICAgICRpcEZpZWxkLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJGlwRmllbGQuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJHN1Ym5ldERyb3Bkb3duLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGRpc2FibGVkIC0+IG1ha2UgSVAvc3VibmV0IGVkaXRhYmxlXG4gICAgICAgICAgICAgICAgJGlwRmllbGQucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgJGlwRmllbGQuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJHN1Ym5ldERyb3Bkb3duLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJzEnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV0d29ya3MuYWRkTmV3Rm9ybVJ1bGVzKGV0aCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIC8vIEZvciB0ZW1wbGF0ZSBpbnRlcmZhY2UgKGlkPTApLCBhZGQgZGVwZW5kZW5jeSBvbiBpbnRlcmZhY2Ugc2VsZWN0aW9uXG4gICAgICAgIGlmIChuZXdSb3dJZCA9PT0gMCB8fCBuZXdSb3dJZCA9PT0gJzAnKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2lwYWRkckNsYXNzXSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpcGFkZHJDbGFzcyxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCwgIC8vIFRlbXBsYXRlOiB2YWxpZGF0ZSBvbmx5IGlmIGludGVyZmFjZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogYG5vdGRoY3BfJHtuZXdSb3dJZH1gLCAgLy8gUmVhbCBpbnRlcmZhY2U6IHZhbGlkYXRlIG9ubHkgaWYgREhDUCBpcyBPRkZcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERIQ1AgdmFsaWRhdGlvbiByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgb2JqZWN0IHdpdGggYWxsIHNldHRpbmdzIHByb3BlcnRpZXNcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHt9O1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc3RhdGljIHJvdXRlc1xuICAgICAgICByZXN1bHQuZGF0YS5zdGF0aWNSb3V0ZXMgPSBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmNvbGxlY3RSb3V0ZXMoKTtcblxuICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGZvcm0gdmFsdWVzIHRvIGF2b2lkIGFueSBET00tcmVsYXRlZCBpc3N1ZXNcbiAgICAgICAgLy8gQ29sbGVjdCBhbGwgcmVndWxhciBpbnB1dCBmaWVsZHNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbdHlwZT1cInRleHRcIl0sIGlucHV0W3R5cGU9XCJoaWRkZW5cIl0sIGlucHV0W3R5cGU9XCJudW1iZXJcIl0sIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gJGlucHV0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkaW5wdXQudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBzZWxlY3QgZHJvcGRvd25zXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ3NlbGVjdCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkc2VsZWN0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkc2VsZWN0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkc2VsZWN0LnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGdldCBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbbmFtZV0gPSAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkgPyBTdHJpbmcodmFsdWUpIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW5cbiAgICAgICAgLy8gUGJ4QXBpQ2xpZW50IHdpbGwgaGFuZGxlIGNvbnZlcnNpb24gdG8gc3RyaW5ncyBmb3IgalF1ZXJ5XG4gICAgICAgIHJlc3VsdC5kYXRhLnVzZW5hdCA9ICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIFVzZSBjb3JyZWN0IGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSAoYXV0b1VwZGF0ZUV4dGVybmFsSXAsIG5vdCBBVVRPX1VQREFURV9FWFRFUk5BTF9JUClcbiAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVEaXYgPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBpZiAoJGF1dG9VcGRhdGVEaXYubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSAkYXV0b1VwZGF0ZURpdi5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbnZlcnQgREhDUCBjaGVja2JveGVzIHRvIGJvb2xlYW4gZm9yIGVhY2ggaW50ZXJmYWNlXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJy5kaGNwLWNoZWNrYm94JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5wdXRJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgY29uc3Qgcm93SWQgPSBpbnB1dElkLnJlcGxhY2UoJ2RoY3AtJywgJycpLnJlcGxhY2UoJy1jaGVja2JveCcsICcnKTtcblxuICAgICAgICAgICAgLy8gRm9yIGRpc2FibGVkIGNoZWNrYm94ZXMsIHJlYWQgYWN0dWFsIGlucHV0IHN0YXRlIGluc3RlYWQgb2YgRm9tYW50aWMgVUkgQVBJXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKG9iaik7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gJGNoZWNrYm94Lmhhc0NsYXNzKCdkaXNhYmxlZCcpIHx8ICRpbnB1dC5wcm9wKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNEaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIEZvciBkaXNhYmxlZCBjaGVja2JveGVzLCByZWFkIHRoZSBhY3R1YWwgaW5wdXQgY2hlY2tlZCBzdGF0ZVxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2BkaGNwXyR7cm93SWR9YF0gPSAkaW5wdXQucHJvcCgnY2hlY2tlZCcpID09PSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZW5hYmxlZCBjaGVja2JveGVzLCB1c2UgRm9tYW50aWMgVUkgQVBJXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtyb3dJZH1gXSA9ICRjaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IGludGVybmV0IHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmludGVybmV0X2ludGVyZmFjZSA9IFN0cmluZygkY2hlY2tlZFJhZGlvLnZhbCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hcCBmb3JtIGZpZWxkIG5hbWVzIHRvIEFQSSBmaWVsZCBuYW1lcyBmb3IgcG9ydHNcbiAgICAgICAgY29uc3QgcG9ydEZpZWxkTWFwcGluZyA9IHtcbiAgICAgICAgICAgICdleHRlcm5hbFNJUFBvcnQnOiAnRVhURVJOQUxfU0lQX1BPUlQnLFxuICAgICAgICAgICAgJ2V4dGVybmFsVExTUG9ydCc6ICdFWFRFUk5BTF9UTFNfUE9SVCdcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBcHBseSBwb3J0IGZpZWxkIG1hcHBpbmdcbiAgICAgICAgT2JqZWN0LmtleXMocG9ydEZpZWxkTWFwcGluZykuZm9yRWFjaChmb3JtRmllbGQgPT4ge1xuICAgICAgICAgICAgY29uc3QgYXBpRmllbGQgPSBwb3J0RmllbGRNYXBwaW5nW2Zvcm1GaWVsZF07XG4gICAgICAgICAgICBpZiAocmVzdWx0LmRhdGFbZm9ybUZpZWxkXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYXBpRmllbGRdID0gcmVzdWx0LmRhdGFbZm9ybUZpZWxkXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbZm9ybUZpZWxkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlc3BvbnNlIGhhbmRsZWQgYnkgRm9ybVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBuZXR3b3Jrcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbmV0d29ya3MudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG5ldHdvcmtzLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmlubGluZSA9IHRydWU7IC8vIFNob3cgaW5saW5lIGVycm9ycyBuZXh0IHRvIGZpZWxkc1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE5ldHdvcmtBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlQ29uZmlnJztcblxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfW5ldHdvcmsvbW9kaWZ5L2A7XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbmV0d29yayBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRDb25maWd1cmF0aW9uKCkge1xuICAgICAgICBOZXR3b3JrQVBJLmdldENvbmZpZygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgVUkgYWZ0ZXIgbG9hZGluZyBkYXRhXG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIGZvcm0gZWxlbWVudHMgY29ubmVjdGVkIHdpdGggbm9uIGRvY2tlciBpbnN0YWxsYXRpb25zXG4gICAgICAgICAgICAgICAgLy8gVEVNUE9SQVJZOiBDb21tZW50ZWQgb3V0IGZvciBsb2NhbCBEb2NrZXIgdGVzdGluZ1xuICAgICAgICAgICAgICAgIC8vIGlmIChyZXNwb25zZS5kYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpcy1kb2NrZXInLCAnMScpO1xuICAgICAgICAgICAgICAgIC8vICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGludGVyZmFjZSB0YWJzIGFuZCBmb3JtcyBkeW5hbWljYWxseSBmcm9tIFJFU1QgQVBJIGRhdGFcbiAgICAgKi9cbiAgICBjcmVhdGVJbnRlcmZhY2VUYWJzKGRhdGEpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudScpO1xuICAgICAgICBjb25zdCAkY29udGVudCA9ICQoJyNldGgtaW50ZXJmYWNlcy1jb250ZW50Jyk7XG5cbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY29udGVudFxuICAgICAgICAkbWVudS5lbXB0eSgpO1xuICAgICAgICAkY29udGVudC5lbXB0eSgpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0YWJzIGZvciBleGlzdGluZyBpbnRlcmZhY2VzXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRhYklkID0gaWZhY2UuaWQ7XG4gICAgICAgICAgICBjb25zdCB0YWJMYWJlbCA9IGAke2lmYWNlLm5hbWUgfHwgaWZhY2UuaW50ZXJmYWNlfSAoJHtpZmFjZS5pbnRlcmZhY2V9JHtpZmFjZS52bGFuaWQgIT09ICcwJyAmJiBpZmFjZS52bGFuaWQgIT09IDAgPyBgLiR7aWZhY2UudmxhbmlkfWAgOiAnJ30pYDtcbiAgICAgICAgICAgIGNvbnN0IGlzQWN0aXZlID0gaW5kZXggPT09IDA7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbSAke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7dGFiTGFiZWx9XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgY29udGVudFxuICAgICAgICAgICAgLy8gT25seSBWTEFOIGludGVyZmFjZXMgY2FuIGJlIGRlbGV0ZWQgKHZsYW5pZCA+IDApXG4gICAgICAgICAgICBjb25zdCBjYW5EZWxldGUgPSBwYXJzZUludChpZmFjZS52bGFuaWQsIDEwKSA+IDA7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVCdXR0b24gPSBjYW5EZWxldGUgPyBgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJ1aSBpY29uIGxlZnQgbGFiZWxlZCBidXR0b24gZGVsZXRlLWludGVyZmFjZVwiIGRhdGEtdmFsdWU9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2hcIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubndfRGVsZXRlQ3VycmVudEludGVyZmFjZX1cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgIDogJyc7XG5cbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVJbnRlcmZhY2VGb3JtKGlmYWNlLCBpc0FjdGl2ZSwgZGVsZXRlQnV0dG9uKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSB0YWIgZm9yIG5ldyBWTEFOXG4gICAgICAgIGlmIChkYXRhLnRlbXBsYXRlKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRhdGEudGVtcGxhdGU7XG4gICAgICAgICAgICB0ZW1wbGF0ZS5pZCA9IDA7XG5cbiAgICAgICAgICAgIC8vIEFkZCBcIitcIiB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbVwiIGRhdGEtdGFiPVwiMFwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gcGx1c1wiPjwvaT5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRlbXBsYXRlIGZvcm0gd2l0aCBpbnRlcmZhY2Ugc2VsZWN0b3JcbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVUZW1wbGF0ZUZvcm0odGVtcGxhdGUsIGRhdGEuaW50ZXJmYWNlcykpO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBpbnRlcmZhY2Ugc2VsZWN0b3IgZHJvcGRvd24gZm9yIHRlbXBsYXRlXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKGlmYWNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdKSB7XG4gICAgICAgICAgICAgICAgICAgIHBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLmlkLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5pbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpZmFjZS5pbnRlcmZhY2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zID0gT2JqZWN0LnZhbHVlcyhwaHlzaWNhbEludGVyZmFjZXMpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ2ludGVyZmFjZV8wJywgeyBpbnRlcmZhY2VfMDogJycgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZSxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3ducyB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gYHN1Ym5ldF8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHt9O1xuICAgICAgICAgICAgLy8gQ29udmVydCBzdWJuZXQgdG8gc3RyaW5nIGZvciBkcm9wZG93biBtYXRjaGluZ1xuICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5zdWJuZXQgfHwgJzI0Jyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSAgLy8gQWRkIHNlYXJjaCBjbGFzcyBmb3Igc2VhcmNoYWJsZSBkcm9wZG93blxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0ZW1wbGF0ZSAoaWQgPSAwKVxuICAgICAgICBpZiAoZGF0YS50ZW1wbGF0ZSkge1xuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdzdWJuZXRfMCcsIHsgc3VibmV0XzA6ICcyNCcgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10gIC8vIEFkZCBzZWFyY2ggY2xhc3MgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykuZmlyc3QoKS50cmlnZ2VyKCdjbGljaycpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0aWMgcm91dGVzIHNlY3Rpb24gdmlzaWJpbGl0eVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBSZS1iaW5kIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiByZW1vdmVzIFRBQiBmcm9tIGZvcm0gYW5kIG1hcmtzIGludGVyZmFjZSBhcyBkaXNhYmxlZFxuICAgICAgICAvLyBBY3R1YWwgZGVsZXRpb24gaGFwcGVucyBvbiBmb3JtIHN1Ym1pdFxuICAgICAgICAkKCcuZGVsZXRlLWludGVyZmFjZScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIG1lbnUgaXRlbVxuICAgICAgICAgICAgJChgI2V0aC1pbnRlcmZhY2VzLW1lbnUgYVtkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCkucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0ICR0YWJDb250ZW50ID0gJChgI2V0aC1pbnRlcmZhY2VzLWNvbnRlbnQgLnRhYltkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCk7XG4gICAgICAgICAgICAkdGFiQ29udGVudC5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQWRkIGhpZGRlbiBmaWVsZCB0byBtYXJrIHRoaXMgaW50ZXJmYWNlIGFzIGRpc2FibGVkXG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5hcHBlbmQoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImRpc2FibGVkXyR7aW50ZXJmYWNlSWR9XCIgdmFsdWU9XCIxXCIgLz5gKTtcblxuICAgICAgICAgICAgLy8gU3dpdGNoIHRvIGZpcnN0IGF2YWlsYWJsZSB0YWJcbiAgICAgICAgICAgIGNvbnN0ICRmaXJzdFRhYiA9ICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEuaXRlbScpLmZpcnN0KCk7XG4gICAgICAgICAgICBpZiAoJGZpcnN0VGFiLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZmlyc3RUYWIudGFiKCdjaGFuZ2UgdGFiJywgJGZpcnN0VGFiLmF0dHIoJ2RhdGEtdGFiJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBlbmFibGUgc3VibWl0IGJ1dHRvblxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBESENQIGNoZWNrYm94IGhhbmRsZXJzXG4gICAgICAgICQoJy5kaGNwLWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1iaW5kIElQIGFkZHJlc3MgaW5wdXQgbWFza3NcbiAgICAgICAgJCgnLmlwYWRkcmVzcycpLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIC8vIEFkZCBWTEFOIElEIGNoYW5nZSBoYW5kbGVycyB0byBjb250cm9sIERIQ1AgY2hlY2tib3ggc3RhdGVcbiAgICAgICAgJCgnaW5wdXRbbmFtZV49XCJ2bGFuaWRfXCJdJykub2ZmKCdpbnB1dCBjaGFuZ2UnKS5vbignaW5wdXQgY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkdmxhbklucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJHZsYW5JbnB1dC5hdHRyKCduYW1lJykucmVwbGFjZSgndmxhbmlkXycsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IHZsYW5WYWx1ZSA9IHBhcnNlSW50KCR2bGFuSW5wdXQudmFsKCksIDEwKSB8fCAwO1xuICAgICAgICAgICAgY29uc3QgJGRoY3BDaGVja2JveCA9ICQoYCNkaGNwLSR7aW50ZXJmYWNlSWR9LWNoZWNrYm94YCk7XG5cbiAgICAgICAgICAgIGlmICh2bGFuVmFsdWUgPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gRGlzYWJsZSBESENQIGNoZWNrYm94IGZvciBWTEFOIGludGVyZmFjZXNcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdzZXQgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmZpbmQoJ2lucHV0JykucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRW5hYmxlIERIQ1AgY2hlY2tib3ggZm9yIG5vbi1WTEFOIGludGVyZmFjZXNcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3NldCBlbmFibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5maW5kKCdpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVXBkYXRlIGRpc2FibGVkIGZpZWxkIGNsYXNzZXNcbiAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmlnZ2VyIHRoZSBoYW5kbGVyIGZvciBleGlzdGluZyBWTEFOIGludGVyZmFjZXMgdG8gYXBwbHkgaW5pdGlhbCBzdGF0ZVxuICAgICAgICAkKCdpbnB1dFtuYW1lXj1cInZsYW5pZF9cIl0nKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGludGVybmV0IHJhZGlvIGJ1dHRvbnMgd2l0aCBGb21hbnRpYyBVSVxuICAgICAgICAkKCcuaW50ZXJuZXQtcmFkaW8nKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEFkZCBpbnRlcm5ldCByYWRpbyBidXR0b24gY2hhbmdlIGhhbmRsZXJcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXScpLm9mZignY2hhbmdlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJbnRlcmZhY2VJZCA9ICQodGhpcykudmFsKCk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgYWxsIEROUy9HYXRld2F5IGdyb3Vwc1xuICAgICAgICAgICAgJCgnW2NsYXNzXj1cImRucy1nYXRld2F5LWdyb3VwLVwiXScpLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBETlMvR2F0ZXdheSBncm91cCBmb3Igc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlXG4gICAgICAgICAgICAkKGAuZG5zLWdhdGV3YXktZ3JvdXAtJHtzZWxlY3RlZEludGVyZmFjZUlkfWApLnNob3coKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIFRBQiBpY29ucyAtIGFkZCBnbG9iZSBpY29uIHRvIHNlbGVjdGVkLCByZW1vdmUgZnJvbSBvdGhlcnNcbiAgICAgICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgdGFiKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRhYiA9ICQodGFiKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YWJJZCA9ICR0YWIuYXR0cignZGF0YS10YWInKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBnbG9iZSBpY29uXG4gICAgICAgICAgICAgICAgJHRhYi5maW5kKCcuZ2xvYmUuaWNvbicpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGdsb2JlIGljb24gdG8gc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlIFRBQlxuICAgICAgICAgICAgICAgIGlmICh0YWJJZCA9PT0gc2VsZWN0ZWRJbnRlcmZhY2VJZCkge1xuICAgICAgICAgICAgICAgICAgICAkdGFiLnByZXBlbmQoJzxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBETlMvR2F0ZXdheSByZWFkb25seSBzdGF0ZSB3aGVuIERIQ1AgY2hhbmdlc1xuICAgICAgICAkKCcuZGhjcC1jaGVja2JveCcpLm9mZignY2hhbmdlLmRuc2dhdGV3YXknKS5vbignY2hhbmdlLmRuc2dhdGV3YXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRjaGVja2JveC5hdHRyKCdpZCcpLnJlcGxhY2UoJ2RoY3AtJywgJycpLnJlcGxhY2UoJy1jaGVja2JveCcsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSAkY2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAgICAgLy8gRmluZCBETlMvR2F0ZXdheSBmaWVsZHMgZm9yIHRoaXMgaW50ZXJmYWNlXG4gICAgICAgICAgICBjb25zdCAkZG5zR2F0ZXdheUdyb3VwID0gJChgLmRucy1nYXRld2F5LWdyb3VwLSR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgICAgICBjb25zdCAkZG5zR2F0ZXdheUZpZWxkcyA9ICRkbnNHYXRld2F5R3JvdXAuZmluZCgnaW5wdXRbbmFtZV49XCJnYXRld2F5X1wiXSwgaW5wdXRbbmFtZV49XCJwcmltYXJ5ZG5zX1wiXSwgaW5wdXRbbmFtZV49XCJzZWNvbmRhcnlkbnNfXCJdJyk7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IG1ha2UgRE5TL0dhdGV3YXkgcmVhZC1vbmx5XG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAkZG5zR2F0ZXdheUZpZWxkcy5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBkaXNhYmxlZCAtPiBtYWtlIEROUy9HYXRld2F5IGVkaXRhYmxlXG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgaW5pdGlhbCBUQUIgaWNvbiB1cGRhdGUgZm9yIGNoZWNrZWQgcmFkaW8gYnV0dG9uXG4gICAgICAgIGNvbnN0ICRjaGVja2VkUmFkaW8gPSAkKCdpbnB1dFtuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCJdOmNoZWNrZWQnKTtcbiAgICAgICAgaWYgKCRjaGVja2VkUmFkaW8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJGNoZWNrZWRSYWRpby50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFwcGx5IGluaXRpYWwgZGlzYWJsZWQgc3RhdGUgZm9yIERIQ1AtZW5hYmxlZCBpbnRlcmZhY2VzXG4gICAgICAgIC8vIENhbGwgYWZ0ZXIgYWxsIGRyb3Bkb3ducyBhcmUgY3JlYXRlZFxuICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuICAgICAgICAvLyBSZS1zYXZlIGluaXRpYWwgZm9ybSB2YWx1ZXMgYW5kIHJlLWJpbmQgZXZlbnQgaGFuZGxlcnMgZm9yIGR5bmFtaWNhbGx5IGNyZWF0ZWQgaW5wdXRzXG4gICAgICAgIC8vIFRoaXMgaXMgZXNzZW50aWFsIGZvciBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gdG8gd29yayB3aXRoIGR5bmFtaWMgdGFic1xuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBPdmVycmlkZSBGb3JtIG1ldGhvZHMgdG8gbWFudWFsbHkgY29sbGVjdCBhbGwgZmllbGQgdmFsdWVzIChpbmNsdWRpbmcgZnJvbSB0YWJzKVxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxTYXZlSW5pdGlhbFZhbHVlcyA9IEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXM7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbENoZWNrVmFsdWVzID0gRm9ybS5jaGVja1ZhbHVlcztcblxuICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB2YWx1ZXMgZnJvbSBGb21hbnRpYyBVSSAobWF5IG1pc3MgZHluYW1pY2FsbHkgY3JlYXRlZCB0YWIgZmllbGRzKVxuICAgICAgICAgICAgICAgIGNvbnN0IGZvbWFudGljVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBhbGwgZmllbGQgdmFsdWVzIHRvIGNhdGNoIGZpZWxkcyB0aGF0IEZvbWFudGljIFVJIG1pc3Nlc1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hbnVhbFZhbHVlcyA9IHt9O1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgJGZpZWxkLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBNZXJnZSBib3RoIChtYW51YWwgdmFsdWVzIG92ZXJyaWRlIEZvbWFudGljIHZhbHVlcyBmb3IgZmllbGRzIHRoYXQgZXhpc3QgaW4gYm90aClcbiAgICAgICAgICAgICAgICBGb3JtLm9sZEZvcm1WYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmb21hbnRpY1ZhbHVlcywgbWFudWFsVmFsdWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdmFsdWVzIGZyb20gRm9tYW50aWMgVUlcbiAgICAgICAgICAgICAgICBjb25zdCBmb21hbnRpY1ZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlc1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hbnVhbFZhbHVlcyA9IHt9O1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgJGZpZWxkLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBNZXJnZSBib3RoXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Rm9ybVZhbHVlcyA9IE9iamVjdC5hc3NpZ24oe30sIGZvbWFudGljVmFsdWVzLCBtYW51YWxWYWx1ZXMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KEZvcm0ub2xkRm9ybVZhbHVlcykgPT09IEpTT04uc3RyaW5naWZ5KG5ld0Zvcm1WYWx1ZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0uc2V0RXZlbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5zZXRFdmVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZm9ybSBmb3IgZXhpc3RpbmcgaW50ZXJmYWNlXG4gICAgICovXG4gICAgY3JlYXRlSW50ZXJmYWNlRm9ybShpZmFjZSwgaXNBY3RpdmUsIGRlbGV0ZUJ1dHRvbikge1xuICAgICAgICBjb25zdCBpZCA9IGlmYWNlLmlkO1xuICAgICAgICBjb25zdCBpc0ludGVybmV0SW50ZXJmYWNlID0gaWZhY2UuaW50ZXJuZXQgfHwgZmFsc2U7XG5cbiAgICAgICAgLy8gRE5TL0dhdGV3YXkgZmllbGRzIHZpc2liaWxpdHkgYW5kIHJlYWQtb25seSBzdGF0ZVxuICAgICAgICBjb25zdCBkbnNHYXRld2F5VmlzaWJsZSA9IGlzSW50ZXJuZXRJbnRlcmZhY2UgPyAnJyA6ICdzdHlsZT1cImRpc3BsYXk6bm9uZTtcIic7XG4gICAgICAgIGNvbnN0IGRuc0dhdGV3YXlSZWFkb25seSA9IGlmYWNlLmRoY3AgPyAncmVhZG9ubHknIDogJyc7XG4gICAgICAgIGNvbnN0IGRuc0dhdGV3YXlEaXNhYmxlZENsYXNzID0gaWZhY2UuZGhjcCA/ICdkaXNhYmxlZCcgOiAnJztcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudCAke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmludGVyZmFjZX1cIiAvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcmZhY2VOYW1lfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5uYW1lIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGludGVybmV0LXJhZGlvXCIgaWQ9XCJpbnRlcm5ldC0ke2lkfS1yYWRpb1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCIgdmFsdWU9XCIke2lkfVwiICR7aXNJbnRlcm5ldEludGVyZmFjZSA/ICdjaGVja2VkJyA6ICcnfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD48aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVybmV0SW50ZXJmYWNlIHx8ICdJbnRlcm5ldCBJbnRlcmZhY2UnfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggZGhjcC1jaGVja2JveCR7aWZhY2UudmxhbmlkID4gMCA/ICcgZGlzYWJsZWQnIDogJyd9XCIgaWQ9XCJkaGNwLSR7aWR9LWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgJHtpZmFjZS52bGFuaWQgPiAwID8gJycgOiAoaWZhY2UuZGhjcCA/ICdjaGVja2VkJyA6ICcnKX0gJHtpZmFjZS52bGFuaWQgPiAwID8gJ2Rpc2FibGVkJyA6ICcnfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Vc2VESENQfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZHNcIiBpZD1cImlwLWFkZHJlc3MtZ3JvdXAtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImlwYWRkcl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcGFkZHIgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cInN1Ym5ldF8ke2lkfVwiIG5hbWU9XCJzdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2Uuc3VibmV0IHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ZsYW5JRH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiBuYW1lPVwidmxhbmlkXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnZsYW5pZCB8fCAnMCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZG5zLWdhdGV3YXktZ3JvdXAtJHtpZH1cIiAke2Ruc0dhdGV3YXlWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGhvcml6b250YWwgZGl2aWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVybmV0U2V0dGluZ3MgfHwgJ0ludGVybmV0IFNldHRpbmdzJ308L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19HYXRld2F5fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMCAke2Ruc0dhdGV3YXlEaXNhYmxlZENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImdhdGV3YXlfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuZ2F0ZXdheSB8fCAnJ31cIiAke2Ruc0dhdGV3YXlSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19QcmltYXJ5RE5TfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMCAke2Ruc0dhdGV3YXlEaXNhYmxlZENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInByaW1hcnlkbnNfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UucHJpbWFyeWRucyB8fCAnJ31cIiAke2Ruc0dhdGV3YXlSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWNvbmRhcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwICR7ZG5zR2F0ZXdheURpc2FibGVkQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwic2Vjb25kYXJ5ZG5zXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnNlY29uZGFyeWRucyB8fCAnJ31cIiAke2Ruc0dhdGV3YXlSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICR7ZGVsZXRlQnV0dG9ufVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBmb3JtIGZvciBuZXcgVkxBTiB0ZW1wbGF0ZVxuICAgICAqL1xuICAgIGNyZWF0ZVRlbXBsYXRlRm9ybSh0ZW1wbGF0ZSwgaW50ZXJmYWNlcykge1xuICAgICAgICBjb25zdCBpZCA9IDA7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnRcIiBkYXRhLXRhYj1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2V9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIGlkPVwiaW50ZXJmYWNlXyR7aWR9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVyZmFjZU5hbWV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgaWQ9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBkaGNwLWNoZWNrYm94XCIgaWQ9XCJkaGNwLSR7aWR9LWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgY2hlY2tlZCAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Vc2VESENQfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZHNcIiBpZD1cImlwLWFkZHJlc3MtZ3JvdXAtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImlwYWRkcl8ke2lkfVwiIHZhbHVlPVwiXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cInN1Ym5ldF8ke2lkfVwiIG5hbWU9XCJzdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIjI0XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVmxhbklEfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIG5hbWU9XCJ2bGFuaWRfJHtpZH1cIiB2YWx1ZT1cIjQwOTVcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3VibmV0IG1hc2sgb3B0aW9ucyBhcnJheSBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygc3VibmV0IG1hc2sgb3B0aW9uc1xuICAgICAqL1xuICAgIGdldFN1Ym5ldE9wdGlvbnNBcnJheSgpIHtcbiAgICAgICAgLy8gTmV0d29yayBtYXNrcyBmcm9tIENpZHI6OmdldE5ldE1hc2tzKCkgKGtyc29ydCBTT1JUX05VTUVSSUMpXG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7dmFsdWU6ICczMicsIHRleHQ6ICczMiAtIDI1NS4yNTUuMjU1LjI1NSd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMzEnLCB0ZXh0OiAnMzEgLSAyNTUuMjU1LjI1NS4yNTQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMwJywgdGV4dDogJzMwIC0gMjU1LjI1NS4yNTUuMjUyJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyOScsIHRleHQ6ICcyOSAtIDI1NS4yNTUuMjU1LjI0OCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjgnLCB0ZXh0OiAnMjggLSAyNTUuMjU1LjI1NS4yNDAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI3JywgdGV4dDogJzI3IC0gMjU1LjI1NS4yNTUuMjI0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNicsIHRleHQ6ICcyNiAtIDI1NS4yNTUuMjU1LjE5Mid9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjUnLCB0ZXh0OiAnMjUgLSAyNTUuMjU1LjI1NS4xMjgnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI0JywgdGV4dDogJzI0IC0gMjU1LjI1NS4yNTUuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjMnLCB0ZXh0OiAnMjMgLSAyNTUuMjU1LjI1NS4yNTQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIyJywgdGV4dDogJzIyIC0gMjU1LjI1NS4yNTIuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjEnLCB0ZXh0OiAnMjEgLSAyNTUuMjU1LjI0OC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMCcsIHRleHQ6ICcyMCAtIDI1NS4yNTUuMjQwLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE5JywgdGV4dDogJzE5IC0gMjU1LjI1NS4yMjQuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTgnLCB0ZXh0OiAnMTggLSAyNTUuMjU1LjE5Mi4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNycsIHRleHQ6ICcxNyAtIDI1NS4yNTUuMTI4LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE2JywgdGV4dDogJzE2IC0gMjU1LjI1NS4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE1JywgdGV4dDogJzE1IC0gMjU1LjI1NC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE0JywgdGV4dDogJzE0IC0gMjU1LjI1Mi4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEzJywgdGV4dDogJzEzIC0gMjU1LjI0OC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEyJywgdGV4dDogJzEyIC0gMjU1LjI0MC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzExJywgdGV4dDogJzExIC0gMjU1LjIyNC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEwJywgdGV4dDogJzEwIC0gMjU1LjE5Mi4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzknLCB0ZXh0OiAnOSAtIDI1NS4xMjguMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc4JywgdGV4dDogJzggLSAyNTUuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzcnLCB0ZXh0OiAnNyAtIDI1NC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNicsIHRleHQ6ICc2IC0gMjUyLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc1JywgdGV4dDogJzUgLSAyNDguMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzQnLCB0ZXh0OiAnNCAtIDI0MC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMycsIHRleHQ6ICczIC0gMjI0LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyJywgdGV4dDogJzIgLSAxOTIuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEnLCB0ZXh0OiAnMSAtIDEyOC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMCcsIHRleHQ6ICcwIC0gMC4wLjAuMCd9LFxuICAgICAgICBdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggY29uZmlndXJhdGlvbiBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGludGVyZmFjZSB0YWJzIGFuZCBmb3JtcyBkeW5hbWljYWxseVxuICAgICAgICBuZXR3b3Jrcy5jcmVhdGVJbnRlcmZhY2VUYWJzKGRhdGEpO1xuXG4gICAgICAgIC8vIFNldCBOQVQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEubmF0KSB7XG4gICAgICAgICAgICAvLyBCb29sZWFuIHZhbHVlcyBmcm9tIEFQSVxuICAgICAgICAgICAgaWYgKGRhdGEubmF0LnVzZW5hdCkge1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgZGF0YS5uYXQuZXh0aXBhZGRyIHx8ICcnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRob3N0bmFtZScsIGRhdGEubmF0LmV4dGhvc3RuYW1lIHx8ICcnKTtcblxuICAgICAgICAgICAgLy8gYXV0b1VwZGF0ZUV4dGVybmFsSXAgYm9vbGVhbiAoZmllbGQgbmFtZSBmcm9tIHRoZSBmb3JtKVxuICAgICAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVDaGVja2JveCA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGF1dG9VcGRhdGVDaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEubmF0LkFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQIHx8IGRhdGEubmF0LmF1dG9VcGRhdGVFeHRlcm5hbElwKSB7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBwb3J0IHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnBvcnRzKSB7XG4gICAgICAgICAgICAvLyBNYXAgQVBJIGZpZWxkIG5hbWVzIHRvIGZvcm0gZmllbGQgbmFtZXNcbiAgICAgICAgICAgIGNvbnN0IHBvcnRGaWVsZE1hcHBpbmcgPSB7XG4gICAgICAgICAgICAgICAgJ0VYVEVSTkFMX1NJUF9QT1JUJzogJ2V4dGVybmFsU0lQUG9ydCcsXG4gICAgICAgICAgICAgICAgJ0VYVEVSTkFMX1RMU19QT1JUJzogJ2V4dGVybmFsVExTUG9ydCcsXG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogJ1NJUF9QT1JUJyxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiAnVExTX1BPUlQnLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogJ1JUUF9QT1JUX0ZST00nLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6ICdSVFBfUE9SVF9UTydcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucG9ydHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBmb3JtRmllbGROYW1lID0gcG9ydEZpZWxkTWFwcGluZ1trZXldIHx8IGtleTtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGEucG9ydHNba2V5XTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBmb3JtRmllbGROYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBOQVQgaGVscCB0ZXh0IGFuZCBsYWJlbHMgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXNcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZU5BVEhlbHBUZXh0KGRhdGEucG9ydHMpO1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlUG9ydExhYmVscyhkYXRhLnBvcnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBhZGRpdGlvbmFsIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnNldHRpbmdzKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnNldHRpbmdzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywga2V5LCBkYXRhLnNldHRpbmdzW2tleV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2FkIHN0YXRpYyByb3V0ZXMgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKGRhdGEuc3RhdGljUm91dGVzKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmxvYWRSb3V0ZXMoZGF0YS5zdGF0aWNSb3V0ZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RvcmUgYXZhaWxhYmxlIGludGVyZmFjZXMgZm9yIHN0YXRpYyByb3V0ZXNcbiAgICAgICAgaWYgKGRhdGEuYXZhaWxhYmxlSW50ZXJmYWNlcykge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzID0gZGF0YS5hdmFpbGFibGVJbnRlcmZhY2VzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBhZnRlciBwb3B1bGF0aW9uIGlzIGNvbXBsZXRlXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyB0aGUgYnV0dG9uIGlzIGRpc2FibGVkIGFuZCBhbGwgZHluYW1pY2FsbHkgY3JlYXRlZCBmaWVsZHMgYXJlIHRyYWNrZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3MuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJXaXRoUG9ydE9wdGlvbmFsID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSg6WzAtOV0rKT8kLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIGEgZ2l2ZW4gaW50ZXJmYWNlLlxuICogQHBhcmFtIHtzdHJpbmd9IHZsYW5WYWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgVkxBTiBJRCBpbnB1dCBmaWVsZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBwYXJhbWV0ZXIgZm9yIHRoZSBydWxlLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIHRoZSBpbnRlcmZhY2UsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVmxhbiA9ICh2bGFuVmFsdWUsIHBhcmFtKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgdmxhbnNBcnJheSA9IHt9O1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLmludGVyZmFjZV8wICE9PSB1bmRlZmluZWQgJiYgYWxsVmFsdWVzLmludGVyZmFjZV8wID4gMCkge1xuICAgICAgICBjb25zdCBuZXdFdGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHthbGxWYWx1ZXMuaW50ZXJmYWNlXzB9YF07XG4gICAgICAgIHZsYW5zQXJyYXlbbmV3RXRoTmFtZV0gPSBbYWxsVmFsdWVzLnZsYW5pZF8wXTtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy52bGFuaWRfMCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICQuZWFjaChhbGxWYWx1ZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAnaW50ZXJmYWNlXzAnIHx8IGluZGV4ID09PSAndmxhbmlkXzAnKSByZXR1cm47XG4gICAgICAgIGlmIChpbmRleC5pbmRleE9mKCd2bGFuaWQnKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBldGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHtpbmRleC5zcGxpdCgnXycpWzFdfWBdO1xuICAgICAgICAgICAgaWYgKCQuaW5BcnJheSh2YWx1ZSwgdmxhbnNBcnJheVtldGhOYW1lXSkgPj0gMFxuICAgICAgICAgICAgICAgICYmIHZsYW5WYWx1ZSA9PT0gdmFsdWVcbiAgICAgICAgICAgICAgICAmJiBwYXJhbSA9PT0gaW5kZXguc3BsaXQoJ18nKVsxXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIShldGhOYW1lIGluIHZsYW5zQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBESENQIHZhbGlkYXRpb24gcnVsZSByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzLCBubyB2YWxpZGF0aW9uIG5lZWRlZFxuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdGhlIHByZXNlbmNlIG9mIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uIGlzIHByb3ZpZGVkIHdoZW4gTkFUIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuYWxJcEhvc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMudXNlbmF0ID09PSAnb24nKSB7XG4gICAgICAgIGlmIChhbGxWYWx1ZXMuZXh0aG9zdG5hbWUgPT09ICcnICYmIGFsbFZhbHVlcy5leHRpcGFkZHIgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdmFsdWUgaXMgYSB2YWxpZCBob3N0bmFtZVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGhvc3RuYW1lXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHZhbGlkIGhvc3RuYW1lLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnZhbGlkSG9zdG5hbWUgPSAodmFsdWUpID0+IHtcbiAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gRW1wdHkgaXMgaGFuZGxlZCBieSBleHRlbmFsSXBIb3N0IHJ1bGVcbiAgICB9XG5cbiAgICAvLyBSRkMgOTUyL1JGQyAxMTIzIGhvc3RuYW1lIHZhbGlkYXRpb25cbiAgICAvLyAtIExhYmVscyBzZXBhcmF0ZWQgYnkgZG90c1xuICAgIC8vIC0gRWFjaCBsYWJlbCAxLTYzIGNoYXJzXG4gICAgLy8gLSBPbmx5IGFscGhhbnVtZXJpYyBhbmQgaHlwaGVuc1xuICAgIC8vIC0gQ2Fubm90IHN0YXJ0L2VuZCB3aXRoIGh5cGhlblxuICAgIC8vIC0gVG90YWwgbGVuZ3RoIG1heCAyNTMgY2hhcnNcbiAgICBjb25zdCBob3N0bmFtZVJlZ2V4ID0gL14oPz0uezEsMjUzfSQpKD8hLSlbYS16QS1aMC05LV17MSw2M30oPzwhLSkoXFwuW2EtekEtWjAtOS1dezEsNjN9KD88IS0pKSokLztcbiAgICByZXR1cm4gaG9zdG5hbWVSZWdleC50ZXN0KHZhbHVlKTtcbn07XG5cblxuLyoqXG4gKiBTdGF0aWMgUm91dGVzIE1hbmFnZXIgTW9kdWxlXG4gKlxuICogTWFuYWdlcyBzdGF0aWMgcm91dGUgY29uZmlndXJhdGlvbiB3aGVuIG11bHRpcGxlIG5ldHdvcmsgaW50ZXJmYWNlcyBleGlzdFxuICovXG5jb25zdCBTdGF0aWNSb3V0ZXNNYW5hZ2VyID0ge1xuICAgICR0YWJsZTogJCgnI3N0YXRpYy1yb3V0ZXMtdGFibGUnKSxcbiAgICAkc2VjdGlvbjogJCgnI3N0YXRpYy1yb3V0ZXMtc2VjdGlvbicpLFxuICAgICRhZGRCdXR0b246ICQoJyNhZGQtbmV3LXJvdXRlJyksXG4gICAgcm91dGVzOiBbXSxcbiAgICBhdmFpbGFibGVJbnRlcmZhY2VzOiBbXSwgLy8gV2lsbCBiZSBwb3B1bGF0ZWQgZnJvbSBSRVNUIEFQSVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdGF0aWMgcm91dGVzIG1hbmFnZW1lbnRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBIaWRlIHNlY3Rpb24gaWYgbGVzcyB0aGFuIDIgaW50ZXJmYWNlc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3BcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcblxuICAgICAgICAvLyBBZGQgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kYWRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciAoZGVsZWdhdGVkKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3V0ZS1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb3B5IGJ1dHRvbiBoYW5kbGVyIChkZWxlZ2F0ZWQpXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdjbGljaycsICcuY29weS1yb3V0ZS1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJHNvdXJjZVJvdyA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmNvcHlSb3V0ZSgkc291cmNlUm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5wdXQgY2hhbmdlIGhhbmRsZXJzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdpbnB1dCBjaGFuZ2UnLCAnLm5ldHdvcmstaW5wdXQsIC5nYXRld2F5LWlucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBvciByZWluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyYWdBbmREcm9wKCkge1xuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIHRhYmxlRG5EIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUuZGF0YSgndGFibGVEbkQnKSkge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUudGFibGVEbkRVcGRhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJhZy1hbmQtZHJvcFxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyb3A6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVByaW9yaXRpZXMoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJ1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZpc2liaWxpdHkgYmFzZWQgb24gbnVtYmVyIG9mIGludGVyZmFjZXNcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5KCkge1xuICAgICAgICAvLyBTaG93L2hpZGUgc2VjdGlvbiBiYXNlZCBvbiBudW1iZXIgb2YgaW50ZXJmYWNlc1xuICAgICAgICBjb25zdCBpbnRlcmZhY2VDb3VudCA9ICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEuaXRlbScpLm5vdCgnW2RhdGEtdGFiPVwiMFwiXScpLmxlbmd0aDtcbiAgICAgICAgaWYgKGludGVyZmFjZUNvdW50ID4gMSkge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kc2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRzZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3B5IGEgcm91dGUgcm93IChjcmVhdGUgZHVwbGljYXRlKVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkc291cmNlUm93IC0gU291cmNlIHJvdyB0byBjb3B5XG4gICAgICovXG4gICAgY29weVJvdXRlKCRzb3VyY2VSb3cpIHtcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9ICRzb3VyY2VSb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpO1xuICAgICAgICBjb25zdCBzdWJuZXREcm9wZG93bklkID0gYHN1Ym5ldC1yb3V0ZS0ke3JvdXRlSWR9YDtcbiAgICAgICAgY29uc3QgaW50ZXJmYWNlRHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHtyb3V0ZUlkfWA7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBkYXRhIGZyb20gc291cmNlIHJvd1xuICAgICAgICBjb25zdCByb3V0ZURhdGEgPSB7XG4gICAgICAgICAgICBuZXR3b3JrOiAkc291cmNlUm93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICBzdWJuZXQ6ICQoYCMke3N1Ym5ldERyb3Bkb3duSWR9YCkudmFsKCksXG4gICAgICAgICAgICBnYXRld2F5OiAkc291cmNlUm93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKCksXG4gICAgICAgICAgICBpbnRlcmZhY2U6ICQoYCMke2ludGVyZmFjZURyb3Bkb3duSWR9YCkudmFsKCkgfHwgJydcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgbmV3IHJvdXRlIHdpdGggY29waWVkIGRhdGFcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZShyb3V0ZURhdGEpO1xuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGFmdGVyIGFkZGluZyByb3V0ZVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJvdXRlRGF0YSAtIFJvdXRlIGRhdGEgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIGFkZFJvdXRlKHJvdXRlRGF0YSA9IG51bGwpIHtcbiAgICAgICAgY29uc3QgJHRlbXBsYXRlID0gJCgnLnJvdXRlLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9IHJvdXRlRGF0YT8uaWQgfHwgYG5ld18ke0RhdGUubm93KCl9YDtcblxuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JvdXRlLXJvdy10ZW1wbGF0ZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3JvdXRlLXJvdycpXG4gICAgICAgICAgICAuYXR0cignZGF0YS1yb3V0ZS1pZCcsIHJvdXRlSWQpXG4gICAgICAgICAgICAuc2hvdygpO1xuXG4gICAgICAgIC8vIFNldCB2YWx1ZXMgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHJvdXRlRGF0YSkge1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbChyb3V0ZURhdGEubmV0d29yayk7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKHJvdXRlRGF0YS5nYXRld2F5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB0byB0YWJsZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdSb3dzID0gJCgnLnJvdXRlLXJvdycpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nUm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRleGlzdGluZ1Jvd3MubGFzdCgpLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIHRoaXMgcm93XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duKCRuZXdSb3csIHJvdXRlRGF0YT8uc3VibmV0IHx8ICcyNCcpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW50ZXJmYWNlIGRyb3Bkb3duIGZvciB0aGlzIHJvd1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93bigkbmV3Um93LCByb3V0ZURhdGE/LmludGVyZmFjZSB8fCAnJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dCBtYXNrc1xuICAgICAgICAkbmV3Um93LmZpbmQoJy5pcGFkZHJlc3MnKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCBwbGFjZWhvbGRlcjogJ18nfSk7XG5cbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIGEgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBSb3cgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RlZFZhbHVlIC0gU2VsZWN0ZWQgc3VibmV0IHZhbHVlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duKCRyb3csIHNlbGVjdGVkVmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRyb3cuZmluZCgnLnN1Ym5ldC1kcm9wZG93bi1jb250YWluZXInKTtcbiAgICAgICAgY29uc3QgZHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHskcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKX1gO1xuXG4gICAgICAgICRjb250YWluZXIuaHRtbChgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIiR7ZHJvcGRvd25JZH1cIiAvPmApO1xuXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihkcm9wZG93bklkLFxuICAgICAgICAgICAgeyBbZHJvcGRvd25JZF06IHNlbGVjdGVkVmFsdWUgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBpbnRlcmZhY2UgZHJvcGRvd24gZm9yIGEgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBSb3cgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RlZFZhbHVlIC0gU2VsZWN0ZWQgaW50ZXJmYWNlIHZhbHVlIChlbXB0eSBzdHJpbmcgPSBhdXRvKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93bigkcm93LCBzZWxlY3RlZFZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkcm93LmZpbmQoJy5pbnRlcmZhY2UtZHJvcGRvd24tY29udGFpbmVyJyk7XG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7JHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyl9YDtcblxuICAgICAgICAkY29udGFpbmVyLmh0bWwoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCIke2Ryb3Bkb3duSWR9XCIgLz5gKTtcblxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biBvcHRpb25zOiBcIkF1dG9cIiArIGF2YWlsYWJsZSBpbnRlcmZhY2VzXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0F1dG8gfHwgJ0F1dG8nIH0sXG4gICAgICAgICAgICAuLi5TdGF0aWNSb3V0ZXNNYW5hZ2VyLmF2YWlsYWJsZUludGVyZmFjZXMubWFwKGlmYWNlID0+ICh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLnZhbHVlLFxuICAgICAgICAgICAgICAgIHRleHQ6IGlmYWNlLmxhYmVsXG4gICAgICAgICAgICB9KSlcbiAgICAgICAgXTtcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZHJvcGRvd25JZCxcbiAgICAgICAgICAgIHsgW2Ryb3Bkb3duSWRdOiBzZWxlY3RlZFZhbHVlIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogb3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZSxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSByb3V0ZSBwcmlvcml0aWVzIGJhc2VkIG9uIHRhYmxlIG9yZGVyXG4gICAgICovXG4gICAgdXBkYXRlUHJpb3JpdGllcygpIHtcbiAgICAgICAgJCgnLnJvdXRlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLXByaW9yaXR5JywgaW5kZXggKyAxKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgcm91dGVzIGZyb20gZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJvdXRlc0RhdGEgLSBBcnJheSBvZiByb3V0ZSBvYmplY3RzXG4gICAgICovXG4gICAgbG9hZFJvdXRlcyhyb3V0ZXNEYXRhKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHJvdXRlc1xuICAgICAgICAkKCcucm91dGUtcm93JykucmVtb3ZlKCk7XG5cbiAgICAgICAgLy8gQWRkIGVhY2ggcm91dGVcbiAgICAgICAgaWYgKHJvdXRlc0RhdGEgJiYgcm91dGVzRGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByb3V0ZXNEYXRhLmZvckVhY2gocm91dGUgPT4ge1xuICAgICAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUocm91dGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCBhZnRlciBhZGRpbmcgcm91dGVzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZURyYWdBbmREcm9wKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Qgcm91dGVzIGZyb20gdGFibGVcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHJvdXRlIG9iamVjdHNcbiAgICAgKi9cbiAgICBjb2xsZWN0Um91dGVzKCkge1xuICAgICAgICBjb25zdCByb3V0ZXMgPSBbXTtcbiAgICAgICAgJCgnLnJvdXRlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHJvdyk7XG4gICAgICAgICAgICBjb25zdCByb3V0ZUlkID0gJHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyk7XG4gICAgICAgICAgICBjb25zdCBzdWJuZXREcm9wZG93bklkID0gYHN1Ym5ldC1yb3V0ZS0ke3JvdXRlSWR9YDtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZURyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7cm91dGVJZH1gO1xuXG4gICAgICAgICAgICByb3V0ZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgaWQ6IHJvdXRlSWQuc3RhcnRzV2l0aCgnbmV3XycpID8gbnVsbCA6IHJvdXRlSWQsXG4gICAgICAgICAgICAgICAgbmV0d29yazogJHJvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgICAgIHN1Ym5ldDogJChgIyR7c3VibmV0RHJvcGRvd25JZH1gKS52YWwoKSxcbiAgICAgICAgICAgICAgICBnYXRld2F5OiAkcm93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlOiAkKGAjJHtpbnRlcmZhY2VEcm9wZG93bklkfWApLnZhbCgpIHx8ICcnLFxuICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCArIDFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJvdXRlcztcbiAgICB9XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIG5ldHdvcmsgc2V0dGluZ3MgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbmV0d29ya3MuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=