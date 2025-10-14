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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwiY3VycmVudEV4dElwQWRkciIsImZvcm0iLCJwb3J0TWF0Y2giLCJtYXRjaCIsInBvcnQiLCJuZXdFeHRJcEFkZHIiLCJpcCIsInRyaWdnZXIiLCJ1cGRhdGVOQVRIZWxwVGV4dCIsInBvcnRzIiwiU0lQX1BPUlQiLCJUTFNfUE9SVCIsIlJUUF9QT1JUX0ZST00iLCJSVFBfUE9SVF9UTyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGRoY3BDaGVja2JveCIsImlzRGhjcEVuYWJsZWQiLCIkaXBGaWVsZCIsIiRzdWJuZXREcm9wZG93biIsInByb3AiLCJjbG9zZXN0IiwidmFsIiwiYWRkTmV3Rm9ybVJ1bGVzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsIm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiT2JqZWN0IiwiYXNzaWduIiwiZGF0YSIsInN0YXRpY1JvdXRlcyIsImNvbGxlY3RSb3V0ZXMiLCJmaW5kIiwiJGlucHV0IiwibmFtZSIsInZhbHVlIiwidW5kZWZpbmVkIiwiU3RyaW5nIiwiJHNlbGVjdCIsInVzZW5hdCIsIiRhdXRvVXBkYXRlRGl2IiwicGFyZW50IiwiYXV0b1VwZGF0ZUV4dGVybmFsSXAiLCJpbnB1dElkIiwicm93SWQiLCJyZXBsYWNlIiwiJGNoZWNrYm94IiwiaXNEaXNhYmxlZCIsImhhc0NsYXNzIiwiJGNoZWNrZWRSYWRpbyIsImludGVybmV0X2ludGVyZmFjZSIsInBvcnRGaWVsZE1hcHBpbmciLCJrZXlzIiwiZm9yRWFjaCIsImZvcm1GaWVsZCIsImFwaUZpZWxkIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImlubGluZSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJjcmVhdGVJbnRlcmZhY2VUYWJzIiwiJG1lbnUiLCIkY29udGVudCIsImVtcHR5IiwiaW50ZXJmYWNlcyIsImlmYWNlIiwidGFiSWQiLCJpZCIsInRhYkxhYmVsIiwidmxhbmlkIiwiaXNBY3RpdmUiLCJhcHBlbmQiLCJjYW5EZWxldGUiLCJwYXJzZUludCIsImRlbGV0ZUJ1dHRvbiIsIm53X0RlbGV0ZUN1cnJlbnRJbnRlcmZhY2UiLCJjcmVhdGVJbnRlcmZhY2VGb3JtIiwidGVtcGxhdGUiLCJjcmVhdGVUZW1wbGF0ZUZvcm0iLCJwaHlzaWNhbEludGVyZmFjZXMiLCJ0b1N0cmluZyIsInBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyIsInZhbHVlcyIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW50ZXJmYWNlXzAiLCJzdGF0aWNPcHRpb25zIiwicGxhY2Vob2xkZXIiLCJud19TZWxlY3RJbnRlcmZhY2UiLCJhbGxvd0VtcHR5IiwiZmllbGROYW1lIiwiZm9ybURhdGEiLCJzdWJuZXQiLCJnZXRTdWJuZXRPcHRpb25zQXJyYXkiLCJud19TZWxlY3ROZXR3b3JrTWFzayIsImFkZGl0aW9uYWxDbGFzc2VzIiwic3VibmV0XzAiLCJ0YWIiLCJmaXJzdCIsInVwZGF0ZVZpc2liaWxpdHkiLCJvZmYiLCIkYnV0dG9uIiwiaW50ZXJmYWNlSWQiLCJyZW1vdmUiLCIkdGFiQ29udGVudCIsIiRmaXJzdFRhYiIsImVuYWJsZURpcnJpdHkiLCJjaGVja1ZhbHVlcyIsIiR2bGFuSW5wdXQiLCJ2bGFuVmFsdWUiLCJzZWxlY3RlZEludGVyZmFjZUlkIiwiaGlkZSIsInNob3ciLCIkdGFiIiwicHJlcGVuZCIsIiRkbnNHYXRld2F5R3JvdXAiLCIkZG5zR2F0ZXdheUZpZWxkcyIsIm9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMiLCJzYXZlSW5pdGlhbFZhbHVlcyIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJmb21hbnRpY1ZhbHVlcyIsIm1hbnVhbFZhbHVlcyIsIiRmaWVsZCIsImlzIiwib2xkRm9ybVZhbHVlcyIsIm5ld0Zvcm1WYWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsInNldEV2ZW50cyIsImlzSW50ZXJuZXRJbnRlcmZhY2UiLCJpbnRlcm5ldCIsImRuc0dhdGV3YXlWaXNpYmxlIiwiZG5zR2F0ZXdheVJlYWRvbmx5IiwiZGhjcCIsImRuc0dhdGV3YXlEaXNhYmxlZENsYXNzIiwibndfSW50ZXJmYWNlTmFtZSIsIm53X0ludGVybmV0SW50ZXJmYWNlIiwibndfVXNlREhDUCIsIm53X0lQQWRkcmVzcyIsImlwYWRkciIsIm53X05ldHdvcmtNYXNrIiwibndfVmxhbklEIiwibndfSW50ZXJuZXRTZXR0aW5ncyIsIm53X0dhdGV3YXkiLCJnYXRld2F5IiwibndfUHJpbWFyeUROUyIsInByaW1hcnlkbnMiLCJud19TZWNvbmRhcnlETlMiLCJzZWNvbmRhcnlkbnMiLCJuYXQiLCIkYXV0b1VwZGF0ZUNoZWNrYm94IiwiQVVUT19VUERBVEVfRVhURVJOQUxfSVAiLCJrZXkiLCJmb3JtRmllbGROYW1lIiwiYXZhaWxhYmxlSW50ZXJmYWNlcyIsImxvYWRSb3V0ZXMiLCJpbml0aWFsaXplRGlycml0eSIsImZuIiwiZiIsImkiLCJhIiwiaXBhZGRyV2l0aFBvcnRPcHRpb25hbCIsImNoZWNrVmxhbiIsInBhcmFtIiwiYWxsVmFsdWVzIiwibmV3RXRoTmFtZSIsInZsYW5pZF8wIiwiaW5kZXhPZiIsImV0aE5hbWUiLCJzcGxpdCIsImluQXJyYXkiLCJwdXNoIiwiZXh0ZW5hbElwSG9zdCIsInZhbGlkSG9zdG5hbWUiLCJob3N0bmFtZVJlZ2V4IiwidGVzdCIsIiR0YWJsZSIsIiRzZWN0aW9uIiwiJGFkZEJ1dHRvbiIsInJvdXRlcyIsImluaXRpYWxpemVEcmFnQW5kRHJvcCIsImFkZFJvdXRlIiwidGFyZ2V0IiwidXBkYXRlUHJpb3JpdGllcyIsImRhdGFDaGFuZ2VkIiwiJHNvdXJjZVJvdyIsImNvcHlSb3V0ZSIsInBhc3RlZERhdGEiLCJvcmlnaW5hbEV2ZW50IiwiY2xpcGJvYXJkRGF0YSIsImdldERhdGEiLCJ3aW5kb3ciLCJjbGVhbmVkRGF0YSIsInRyaW0iLCJzZXRUaW1lb3V0IiwidGFibGVEbkRVcGRhdGUiLCJ0YWJsZURuRCIsIm9uRHJvcCIsImRyYWdIYW5kbGUiLCJpbnRlcmZhY2VDb3VudCIsIm5vdCIsInJvdXRlSWQiLCJzdWJuZXREcm9wZG93bklkIiwiaW50ZXJmYWNlRHJvcGRvd25JZCIsInJvdXRlRGF0YSIsIm5ldHdvcmsiLCJkZXNjcmlwdGlvbiIsIiR0ZW1wbGF0ZSIsImxhc3QiLCIkbmV3Um93IiwiY2xvbmUiLCJEYXRlIiwibm93IiwiJGV4aXN0aW5nUm93cyIsImFmdGVyIiwiaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duIiwiaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duIiwiJHJvdyIsInNlbGVjdGVkVmFsdWUiLCIkY29udGFpbmVyIiwiZHJvcGRvd25JZCIsIm9wdGlvbnMiLCJud19BdXRvIiwibWFwIiwibGFiZWwiLCJyb3ciLCJyb3V0ZXNEYXRhIiwicm91dGUiLCJzdGFydHNXaXRoIiwicHJpb3JpdHkiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2JDLEVBQUFBLGNBQWMsRUFBRUMsQ0FBQyxDQUFDLFVBQUQsQ0FESjs7QUFHYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVELENBQUMsQ0FBQyxlQUFELENBUEU7QUFTYkUsRUFBQUEsVUFBVSxFQUFFRixDQUFDLENBQUMseUJBQUQsQ0FUQTtBQVViRyxFQUFBQSxVQUFVLEVBQUVILENBQUMsQ0FBQyxZQUFELENBVkE7QUFXYkksRUFBQUEsZUFBZSxFQUFFSixDQUFDLENBQUMsWUFBRCxDQVhMO0FBWWJLLEVBQUFBLFVBQVUsRUFBRSxFQVpDOztBQWNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG9CQUFvQixFQUFFTixDQUFDLENBQUMsd0JBQUQsQ0FsQlY7O0FBb0JiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSU8sRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFNBQVMsRUFBRTtBQUNQQyxNQUFBQSxRQUFRLEVBQUUsSUFESDtBQUVQQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsd0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREcsRUFLSDtBQUNJSCxRQUFBQSxJQUFJLEVBQUUsZUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0U7QUFGNUIsT0FMRztBQUZBLEtBREE7QUFjWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RDLE1BQUFBLE9BQU8sRUFBRSxRQURBO0FBRVRQLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxlQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRTtBQUY1QixPQURHLEVBS0g7QUFDSUosUUFBQUEsSUFBSSxFQUFFLGVBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNLO0FBRjVCLE9BTEc7QUFGRTtBQWRGLEdBekJGOztBQXNEYjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUF6RGEsd0JBeURBO0FBQ1Q7QUFDQXJCLElBQUFBLFFBQVEsQ0FBQ3NCLGlCQUFULEdBRlMsQ0FJVDs7QUFDQXBCLElBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCcUIsUUFBdEIsQ0FBK0I7QUFDM0JDLE1BQUFBLFFBRDJCLHNCQUNoQjtBQUNQeEIsUUFBQUEsUUFBUSxDQUFDeUIsd0JBQVQ7QUFDSDtBQUgwQixLQUEvQjtBQUtBekIsSUFBQUEsUUFBUSxDQUFDSSxVQUFULENBQW9Cc0IsUUFBcEIsR0FWUyxDQVlUOztBQUVBMUIsSUFBQUEsUUFBUSxDQUFDQyxjQUFULENBQXdCMEIsRUFBeEIsQ0FBMkIsT0FBM0IsRUFBb0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3ZDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQTdCLE1BQUFBLFFBQVEsQ0FBQ0MsY0FBVCxDQUF3QjZCLFFBQXhCLENBQWlDLGtCQUFqQztBQUNBQyxNQUFBQSxVQUFVLENBQUNDLGlCQUFYLENBQTZCaEMsUUFBUSxDQUFDaUMsb0JBQXRDO0FBQ0gsS0FKRCxFQWRTLENBb0JUOztBQUNBakMsSUFBQUEsUUFBUSxDQUFDTSxlQUFULENBQXlCNEIsU0FBekIsQ0FBbUM7QUFBQ0MsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBYyxxQkFBZTtBQUE3QixLQUFuQztBQUVBbkMsSUFBQUEsUUFBUSxDQUFDb0MsY0FBVCxHQXZCUyxDQXlCVDs7QUFDQUMsSUFBQUEsbUJBQW1CLENBQUNoQixVQUFwQixHQTFCUyxDQTRCVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0gsR0ExRlk7O0FBNEZiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lZLEVBQUFBLG9CQWhHYSxnQ0FnR1FLLFFBaEdSLEVBZ0drQjtBQUMzQixRQUFJQSxRQUFRLEtBQUssS0FBakIsRUFBd0I7QUFDcEJ0QyxNQUFBQSxRQUFRLENBQUNDLGNBQVQsQ0FBd0JzQyxXQUF4QixDQUFvQyxrQkFBcEM7QUFDSCxLQUZELE1BRU87QUFDSCxVQUFNQyxnQkFBZ0IsR0FBR3hDLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNDLElBQWxCLENBQXVCLFdBQXZCLEVBQW9DLFdBQXBDLENBQXpCO0FBQ0EsVUFBTUMsU0FBUyxHQUFHRixnQkFBZ0IsQ0FBQ0csS0FBakIsQ0FBdUIsU0FBdkIsQ0FBbEI7QUFDQSxVQUFNQyxJQUFJLEdBQUdGLFNBQVMsR0FBRyxNQUFNQSxTQUFTLENBQUMsQ0FBRCxDQUFsQixHQUF3QixFQUE5QztBQUNBLFVBQU1HLFlBQVksR0FBR1AsUUFBUSxDQUFDUSxFQUFULEdBQWNGLElBQW5DO0FBQ0E1QyxNQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JzQyxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxXQUFwQyxFQUFpREksWUFBakQsRUFMRyxDQU1IOztBQUNBN0MsTUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCc0MsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsYUFBcEMsRUFBbUQsRUFBbkQ7QUFDQXpDLE1BQUFBLFFBQVEsQ0FBQ0ssVUFBVCxDQUFvQjBDLE9BQXBCLENBQTRCLFFBQTVCO0FBQ0EvQyxNQUFBQSxRQUFRLENBQUNDLGNBQVQsQ0FBd0JzQyxXQUF4QixDQUFvQyxrQkFBcEM7QUFDSDtBQUNKLEdBOUdZOztBQWdIYjtBQUNKO0FBQ0E7QUFDQTtBQUNJUyxFQUFBQSxpQkFwSGEsNkJBb0hLQyxLQXBITCxFQW9IWTtBQUNyQjtBQUNBLFFBQUksQ0FBQ0EsS0FBSyxDQUFDQyxRQUFQLElBQW1CLENBQUNELEtBQUssQ0FBQ0UsUUFBMUIsSUFBc0MsQ0FBQ0YsS0FBSyxDQUFDRyxhQUE3QyxJQUE4RCxDQUFDSCxLQUFLLENBQUNJLFdBQXpFLEVBQXNGO0FBQ2xGO0FBQ0gsS0FKb0IsQ0FNckI7OztBQUNBLFFBQU1DLGNBQWMsR0FBR3BELENBQUMsQ0FBQyxrQ0FBRCxDQUF4Qjs7QUFDQSxRQUFJb0QsY0FBYyxDQUFDQyxNQUFmLEdBQXdCLENBQTVCLEVBQStCO0FBQzNCLFVBQU1DLE9BQU8sR0FBR0MsSUFBSSxDQUFDLGFBQUQsRUFBZ0I7QUFDaEMsb0JBQVlSLEtBQUssQ0FBQ0MsUUFEYztBQUVoQyxvQkFBWUQsS0FBSyxDQUFDRTtBQUZjLE9BQWhCLENBQXBCO0FBSUFHLE1BQUFBLGNBQWMsQ0FBQ0ksSUFBZixDQUFvQkYsT0FBcEI7QUFDSCxLQWRvQixDQWdCckI7OztBQUNBLFFBQU1HLGNBQWMsR0FBR3pELENBQUMsQ0FBQyxrQ0FBRCxDQUF4Qjs7QUFDQSxRQUFJeUQsY0FBYyxDQUFDSixNQUFmLEdBQXdCLENBQTVCLEVBQStCO0FBQzNCLFVBQU1LLE9BQU8sR0FBR0gsSUFBSSxDQUFDLGFBQUQsRUFBZ0I7QUFDaEMseUJBQWlCUixLQUFLLENBQUNHLGFBRFM7QUFFaEMsdUJBQWVILEtBQUssQ0FBQ0k7QUFGVyxPQUFoQixDQUFwQjtBQUlBTSxNQUFBQSxjQUFjLENBQUNELElBQWYsQ0FBb0JFLE9BQXBCO0FBQ0g7QUFDSixHQTdJWTs7QUErSWI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBbkphLDRCQW1KSVosS0FuSkosRUFtSlc7QUFDcEI7QUFDQSxRQUFJLENBQUNBLEtBQUssQ0FBQ0MsUUFBUCxJQUFtQixDQUFDRCxLQUFLLENBQUNFLFFBQTlCLEVBQXdDO0FBQ3BDO0FBQ0gsS0FKbUIsQ0FNcEI7OztBQUNBLFFBQU1XLFNBQVMsR0FBRzVELENBQUMsQ0FBQywwQkFBRCxDQUFuQjs7QUFDQSxRQUFJNEQsU0FBUyxDQUFDUCxNQUFWLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3RCLFVBQU1RLFlBQVksR0FBR04sSUFBSSxDQUFDLGtCQUFELEVBQXFCO0FBQzFDLG9CQUFZUixLQUFLLENBQUNDO0FBRHdCLE9BQXJCLENBQXpCO0FBR0FZLE1BQUFBLFNBQVMsQ0FBQ0UsSUFBVixDQUFlRCxZQUFmO0FBQ0gsS0FibUIsQ0FlcEI7OztBQUNBLFFBQU1FLFNBQVMsR0FBRy9ELENBQUMsQ0FBQywwQkFBRCxDQUFuQjs7QUFDQSxRQUFJK0QsU0FBUyxDQUFDVixNQUFWLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3RCLFVBQU1XLFlBQVksR0FBR1QsSUFBSSxDQUFDLGtCQUFELEVBQXFCO0FBQzFDLG9CQUFZUixLQUFLLENBQUNFO0FBRHdCLE9BQXJCLENBQXpCO0FBR0FjLE1BQUFBLFNBQVMsQ0FBQ0QsSUFBVixDQUFlRSxZQUFmO0FBQ0g7QUFDSixHQTFLWTs7QUE0S2I7QUFDSjtBQUNBO0FBQ0l6QyxFQUFBQSx3QkEvS2Esc0NBK0tjO0FBQ3ZCdkIsSUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEJpRSxJQUE1QixDQUFpQyxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDN0MsVUFBTUMsR0FBRyxHQUFHcEUsQ0FBQyxDQUFDbUUsR0FBRCxDQUFELENBQU9FLElBQVAsQ0FBWSxVQUFaLENBQVo7QUFDQSxVQUFNQyxhQUFhLEdBQUd0RSxDQUFDLGlCQUFVb0UsR0FBVixlQUF2QjtBQUNBLFVBQU1HLGFBQWEsR0FBR0QsYUFBYSxDQUFDakQsUUFBZCxDQUF1QixZQUF2QixDQUF0QixDQUg2QyxDQUs3Qzs7QUFDQSxVQUFNbUQsUUFBUSxHQUFHeEUsQ0FBQywrQkFBdUJvRSxHQUF2QixTQUFsQixDQU42QyxDQU83Qzs7QUFDQSxVQUFNSyxlQUFlLEdBQUd6RSxDQUFDLG1CQUFZb0UsR0FBWixlQUF6Qjs7QUFFQSxVQUFJRyxhQUFKLEVBQW1CO0FBQ2Y7QUFDQUMsUUFBQUEsUUFBUSxDQUFDRSxJQUFULENBQWMsVUFBZCxFQUEwQixJQUExQjtBQUNBRixRQUFBQSxRQUFRLENBQUNHLE9BQVQsQ0FBaUIsUUFBakIsRUFBMkIvQyxRQUEzQixDQUFvQyxVQUFwQztBQUNBNkMsUUFBQUEsZUFBZSxDQUFDN0MsUUFBaEIsQ0FBeUIsVUFBekI7QUFDQTVCLFFBQUFBLENBQUMscUJBQWNvRSxHQUFkLEVBQUQsQ0FBc0JRLEdBQXRCLENBQTBCLEVBQTFCO0FBQ0gsT0FORCxNQU1PO0FBQ0g7QUFDQUosUUFBQUEsUUFBUSxDQUFDRSxJQUFULENBQWMsVUFBZCxFQUEwQixLQUExQjtBQUNBRixRQUFBQSxRQUFRLENBQUNHLE9BQVQsQ0FBaUIsUUFBakIsRUFBMkJ0QyxXQUEzQixDQUF1QyxVQUF2QztBQUNBb0MsUUFBQUEsZUFBZSxDQUFDcEMsV0FBaEIsQ0FBNEIsVUFBNUI7QUFDQXJDLFFBQUFBLENBQUMscUJBQWNvRSxHQUFkLEVBQUQsQ0FBc0JRLEdBQXRCLENBQTBCLEdBQTFCO0FBQ0g7O0FBRUQ5RSxNQUFBQSxRQUFRLENBQUMrRSxlQUFULENBQXlCVCxHQUF6QjtBQUNILEtBekJEOztBQTJCQSxRQUFJcEUsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JxQixRQUF0QixDQUErQixZQUEvQixDQUFKLEVBQWtEO0FBQzlDckIsTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkJxQyxXQUEzQixDQUF1QyxVQUF2QztBQUNILEtBRkQsTUFFTztBQUNIckMsTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkI0QixRQUEzQixDQUFvQyxVQUFwQztBQUNIO0FBQ0osR0FoTlk7O0FBa05iO0FBQ0o7QUFDQTtBQUNBO0FBQ0lpRCxFQUFBQSxlQXROYSwyQkFzTkdDLFFBdE5ILEVBc05hO0FBRXRCO0FBQ0EsUUFBTUMsU0FBUyxrQkFBV0QsUUFBWCxDQUFmLENBSHNCLENBS3RCOztBQUNBaEYsSUFBQUEsUUFBUSxDQUFDUyxhQUFULENBQXVCd0UsU0FBdkIsSUFBb0M7QUFDaENDLE1BQUFBLFVBQVUsRUFBRUQsU0FEb0I7QUFFaEM5RCxNQUFBQSxPQUFPLHNCQUFlNkQsUUFBZixDQUZ5QjtBQUdoQ3BFLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDb0U7QUFGNUIsT0FERztBQUh5QixLQUFwQyxDQU5zQixDQWtCdEI7O0FBQ0EsUUFBTUMsU0FBUyxvQkFBYUosUUFBYixDQUFmLENBbkJzQixDQXNCdEI7O0FBQ0FoRixJQUFBQSxRQUFRLENBQUNTLGFBQVQsQ0FBdUIyRSxTQUF2QixJQUFvQztBQUNoQ2pFLE1BQUFBLE9BQU8sc0JBQWU2RCxRQUFmLENBRHlCO0FBRWhDRSxNQUFBQSxVQUFVLEVBQUVFLFNBRm9CO0FBR2hDeEUsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLGtCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDc0U7QUFGNUIsT0FERyxFQUtIO0FBQ0l4RSxRQUFBQSxJQUFJLHNCQUFlbUUsUUFBZixNQURSO0FBRUlsRSxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3VFO0FBRjVCLE9BTEc7QUFIeUIsS0FBcEMsQ0F2QnNCLENBdUN0Qjs7QUFDQSxRQUFNQyxXQUFXLG9CQUFhUCxRQUFiLENBQWpCLENBeENzQixDQTBDdEI7QUFDQTs7QUFDQSxRQUFJQSxRQUFRLEtBQUssQ0FBYixJQUFrQkEsUUFBUSxLQUFLLEdBQW5DLEVBQXdDO0FBQ3BDaEYsTUFBQUEsUUFBUSxDQUFDUyxhQUFULENBQXVCOEUsV0FBdkIsSUFBc0M7QUFDbENMLFFBQUFBLFVBQVUsRUFBRUssV0FEc0I7QUFFbENwRSxRQUFBQSxPQUFPLHNCQUFlNkQsUUFBZixDQUYyQjtBQUVDO0FBQ25DcEUsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsVUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUN5RTtBQUY1QixTQURHLEVBS0g7QUFDSTNFLFVBQUFBLElBQUksRUFBRSxRQURWO0FBRUlDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDMEU7QUFGNUIsU0FMRztBQUgyQixPQUF0QztBQWNILEtBZkQsTUFlTztBQUNIekYsTUFBQUEsUUFBUSxDQUFDUyxhQUFULENBQXVCOEUsV0FBdkIsSUFBc0M7QUFDbENMLFFBQUFBLFVBQVUsRUFBRUssV0FEc0I7QUFFbENwRSxRQUFBQSxPQUFPLG9CQUFhNkQsUUFBYixDQUYyQjtBQUVEO0FBQ2pDcEUsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsVUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUN5RTtBQUY1QixTQURHLEVBS0g7QUFDSTNFLFVBQUFBLElBQUksRUFBRSxRQURWO0FBRUlDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDMEU7QUFGNUIsU0FMRztBQUgyQixPQUF0QztBQWNILEtBMUVxQixDQTRFdEI7O0FBRUgsR0FwU1k7O0FBc1NiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBM1NhLDRCQTJTSUMsUUEzU0osRUEyU2M7QUFDdkI7QUFDQSxRQUFNQyxNQUFNLEdBQUdDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjLEVBQWQsRUFBa0JILFFBQWxCLENBQWY7QUFDQUMsSUFBQUEsTUFBTSxDQUFDRyxJQUFQLEdBQWMsRUFBZCxDQUh1QixDQUt2Qjs7QUFDQUgsSUFBQUEsTUFBTSxDQUFDRyxJQUFQLENBQVlDLFlBQVosR0FBMkIzRCxtQkFBbUIsQ0FBQzRELGFBQXBCLEVBQTNCLENBTnVCLENBUXZCO0FBQ0E7O0FBQ0FqRyxJQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0IrRixJQUFsQixDQUF1QiwwRUFBdkIsRUFBbUcvQixJQUFuRyxDQUF3RyxZQUFXO0FBQy9HLFVBQU1nQyxNQUFNLEdBQUdqRyxDQUFDLENBQUMsSUFBRCxDQUFoQjtBQUNBLFVBQU1rRyxJQUFJLEdBQUdELE1BQU0sQ0FBQzVCLElBQVAsQ0FBWSxNQUFaLENBQWI7O0FBQ0EsVUFBSTZCLElBQUosRUFBVTtBQUNOLFlBQU1DLEtBQUssR0FBR0YsTUFBTSxDQUFDckIsR0FBUCxFQUFkLENBRE0sQ0FFTjs7QUFDQWMsUUFBQUEsTUFBTSxDQUFDRyxJQUFQLENBQVlLLElBQVosSUFBcUJDLEtBQUssS0FBSyxJQUFWLElBQWtCQSxLQUFLLEtBQUtDLFNBQTdCLEdBQTBDQyxNQUFNLENBQUNGLEtBQUQsQ0FBaEQsR0FBMEQsRUFBOUU7QUFDSDtBQUNKLEtBUkQsRUFWdUIsQ0FvQnZCOztBQUNBckcsSUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCK0YsSUFBbEIsQ0FBdUIsUUFBdkIsRUFBaUMvQixJQUFqQyxDQUFzQyxZQUFXO0FBQzdDLFVBQU1xQyxPQUFPLEdBQUd0RyxDQUFDLENBQUMsSUFBRCxDQUFqQjtBQUNBLFVBQU1rRyxJQUFJLEdBQUdJLE9BQU8sQ0FBQ2pDLElBQVIsQ0FBYSxNQUFiLENBQWI7O0FBQ0EsVUFBSTZCLElBQUosRUFBVTtBQUNOLFlBQU1DLEtBQUssR0FBR0csT0FBTyxDQUFDMUIsR0FBUixFQUFkLENBRE0sQ0FFTjs7QUFDQWMsUUFBQUEsTUFBTSxDQUFDRyxJQUFQLENBQVlLLElBQVosSUFBcUJDLEtBQUssS0FBSyxJQUFWLElBQWtCQSxLQUFLLEtBQUtDLFNBQTdCLEdBQTBDQyxNQUFNLENBQUNGLEtBQUQsQ0FBaEQsR0FBMEQsRUFBOUU7QUFDSDtBQUNKLEtBUkQsRUFyQnVCLENBK0J2QjtBQUNBOztBQUNBVCxJQUFBQSxNQUFNLENBQUNHLElBQVAsQ0FBWVUsTUFBWixHQUFxQnZHLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCcUIsUUFBdEIsQ0FBK0IsWUFBL0IsQ0FBckIsQ0FqQ3VCLENBbUN2Qjs7QUFDQSxRQUFNbUYsY0FBYyxHQUFHMUcsUUFBUSxDQUFDRyxRQUFULENBQWtCK0YsSUFBbEIsQ0FBdUIsb0NBQXZCLEVBQTZEUyxNQUE3RCxDQUFvRSxXQUFwRSxDQUF2Qjs7QUFDQSxRQUFJRCxjQUFjLENBQUNuRCxNQUFmLEdBQXdCLENBQTVCLEVBQStCO0FBQzNCcUMsTUFBQUEsTUFBTSxDQUFDRyxJQUFQLENBQVlhLG9CQUFaLEdBQW1DRixjQUFjLENBQUNuRixRQUFmLENBQXdCLFlBQXhCLENBQW5DO0FBQ0gsS0FGRCxNQUVPO0FBQ0hxRSxNQUFBQSxNQUFNLENBQUNHLElBQVAsQ0FBWWEsb0JBQVosR0FBbUMsS0FBbkM7QUFDSCxLQXpDc0IsQ0EyQ3ZCOzs7QUFDQTVHLElBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQitGLElBQWxCLENBQXVCLGdCQUF2QixFQUF5Qy9CLElBQXpDLENBQThDLFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUMxRCxVQUFNd0MsT0FBTyxHQUFHM0csQ0FBQyxDQUFDbUUsR0FBRCxDQUFELENBQU9FLElBQVAsQ0FBWSxJQUFaLENBQWhCO0FBQ0EsVUFBTXVDLEtBQUssR0FBR0QsT0FBTyxDQUFDRSxPQUFSLENBQWdCLE9BQWhCLEVBQXlCLEVBQXpCLEVBQTZCQSxPQUE3QixDQUFxQyxXQUFyQyxFQUFrRCxFQUFsRCxDQUFkLENBRjBELENBSTFEOztBQUNBLFVBQU1DLFNBQVMsR0FBRzlHLENBQUMsQ0FBQ21FLEdBQUQsQ0FBbkI7QUFDQSxVQUFNOEIsTUFBTSxHQUFHYSxTQUFTLENBQUNkLElBQVYsQ0FBZSx3QkFBZixDQUFmO0FBQ0EsVUFBTWUsVUFBVSxHQUFHRCxTQUFTLENBQUNFLFFBQVYsQ0FBbUIsVUFBbkIsS0FBa0NmLE1BQU0sQ0FBQ3ZCLElBQVAsQ0FBWSxVQUFaLENBQXJEOztBQUVBLFVBQUlxQyxVQUFKLEVBQWdCO0FBQ1o7QUFDQXJCLFFBQUFBLE1BQU0sQ0FBQ0csSUFBUCxnQkFBb0JlLEtBQXBCLEtBQStCWCxNQUFNLENBQUN2QixJQUFQLENBQVksU0FBWixNQUEyQixJQUExRDtBQUNILE9BSEQsTUFHTztBQUNIO0FBQ0FnQixRQUFBQSxNQUFNLENBQUNHLElBQVAsZ0JBQW9CZSxLQUFwQixLQUErQkUsU0FBUyxDQUFDekYsUUFBVixDQUFtQixZQUFuQixDQUEvQjtBQUNIO0FBQ0osS0FoQkQsRUE1Q3VCLENBOER2Qjs7QUFDQSxRQUFNNEYsYUFBYSxHQUFHakgsQ0FBQyxDQUFDLDBDQUFELENBQXZCOztBQUNBLFFBQUlpSCxhQUFhLENBQUM1RCxNQUFkLEdBQXVCLENBQTNCLEVBQThCO0FBQzFCcUMsTUFBQUEsTUFBTSxDQUFDRyxJQUFQLENBQVlxQixrQkFBWixHQUFpQ2IsTUFBTSxDQUFDWSxhQUFhLENBQUNyQyxHQUFkLEVBQUQsQ0FBdkM7QUFDSCxLQWxFc0IsQ0FvRXZCOzs7QUFDQSxRQUFNdUMsZ0JBQWdCLEdBQUc7QUFDckIseUJBQW1CLG1CQURFO0FBRXJCLHlCQUFtQjtBQUZFLEtBQXpCLENBckV1QixDQTBFdkI7O0FBQ0F4QixJQUFBQSxNQUFNLENBQUN5QixJQUFQLENBQVlELGdCQUFaLEVBQThCRSxPQUE5QixDQUFzQyxVQUFBQyxTQUFTLEVBQUk7QUFDL0MsVUFBTUMsUUFBUSxHQUFHSixnQkFBZ0IsQ0FBQ0csU0FBRCxDQUFqQzs7QUFDQSxVQUFJNUIsTUFBTSxDQUFDRyxJQUFQLENBQVl5QixTQUFaLE1BQTJCbEIsU0FBL0IsRUFBMEM7QUFDdENWLFFBQUFBLE1BQU0sQ0FBQ0csSUFBUCxDQUFZMEIsUUFBWixJQUF3QjdCLE1BQU0sQ0FBQ0csSUFBUCxDQUFZeUIsU0FBWixDQUF4QjtBQUNBLGVBQU81QixNQUFNLENBQUNHLElBQVAsQ0FBWXlCLFNBQVosQ0FBUDtBQUNIO0FBQ0osS0FORDtBQVFBLFdBQU81QixNQUFQO0FBQ0gsR0EvWFk7O0FBaVliO0FBQ0o7QUFDQTtBQUNBO0FBQ0k4QixFQUFBQSxlQXJZYSwyQkFxWUdwRixRQXJZSCxFQXFZYSxDQUN0QjtBQUNILEdBdllZOztBQXlZYjtBQUNKO0FBQ0E7QUFDSUYsRUFBQUEsY0E1WWEsNEJBNFlJO0FBQ2J1RixJQUFBQSxJQUFJLENBQUN4SCxRQUFMLEdBQWdCSCxRQUFRLENBQUNHLFFBQXpCO0FBQ0F3SCxJQUFBQSxJQUFJLENBQUNDLEdBQUwsR0FBVyxHQUFYLENBRmEsQ0FFRzs7QUFDaEJELElBQUFBLElBQUksQ0FBQ2xILGFBQUwsR0FBcUJULFFBQVEsQ0FBQ1MsYUFBOUIsQ0FIYSxDQUdnQzs7QUFDN0NrSCxJQUFBQSxJQUFJLENBQUNqQyxnQkFBTCxHQUF3QjFGLFFBQVEsQ0FBQzBGLGdCQUFqQyxDQUphLENBSXNDOztBQUNuRGlDLElBQUFBLElBQUksQ0FBQ0QsZUFBTCxHQUF1QjFILFFBQVEsQ0FBQzBILGVBQWhDLENBTGEsQ0FLb0M7O0FBQ2pEQyxJQUFBQSxJQUFJLENBQUNFLE1BQUwsR0FBYyxJQUFkLENBTmEsQ0FNTztBQUVwQjs7QUFDQUYsSUFBQUEsSUFBSSxDQUFDRyxXQUFMLENBQWlCQyxPQUFqQixHQUEyQixJQUEzQjtBQUNBSixJQUFBQSxJQUFJLENBQUNHLFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCQyxVQUE3QjtBQUNBTixJQUFBQSxJQUFJLENBQUNHLFdBQUwsQ0FBaUJJLFVBQWpCLEdBQThCLFlBQTlCLENBWGEsQ0FhYjs7QUFDQVAsSUFBQUEsSUFBSSxDQUFDUSxtQkFBTCxhQUE4QkMsYUFBOUI7QUFDQVQsSUFBQUEsSUFBSSxDQUFDVSxvQkFBTCxhQUErQkQsYUFBL0I7QUFFQVQsSUFBQUEsSUFBSSxDQUFDdEcsVUFBTDtBQUNILEdBOVpZOztBQWdhYjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsaUJBbmFhLCtCQW1hTztBQUNoQjJHLElBQUFBLFVBQVUsQ0FBQ0ssU0FBWCxDQUFxQixVQUFDaEcsUUFBRCxFQUFjO0FBQy9CLFVBQUlBLFFBQVEsQ0FBQ3NELE1BQVQsSUFBbUJ0RCxRQUFRLENBQUN5RCxJQUFoQyxFQUFzQztBQUNsQy9GLFFBQUFBLFFBQVEsQ0FBQ3VJLFlBQVQsQ0FBc0JqRyxRQUFRLENBQUN5RCxJQUEvQixFQURrQyxDQUdsQzs7QUFDQS9GLFFBQUFBLFFBQVEsQ0FBQ3lCLHdCQUFULEdBSmtDLENBTWxDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNILE9BWkQsTUFZTztBQUNIK0csUUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCbkcsUUFBUSxDQUFDb0csUUFBckM7QUFDSDtBQUNKLEtBaEJEO0FBaUJILEdBcmJZOztBQXViYjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsbUJBMWJhLCtCQTBiTzVDLElBMWJQLEVBMGJhO0FBQ3RCLFFBQU02QyxLQUFLLEdBQUcxSSxDQUFDLENBQUMsc0JBQUQsQ0FBZjtBQUNBLFFBQU0ySSxRQUFRLEdBQUczSSxDQUFDLENBQUMseUJBQUQsQ0FBbEIsQ0FGc0IsQ0FJdEI7O0FBQ0EwSSxJQUFBQSxLQUFLLENBQUNFLEtBQU47QUFDQUQsSUFBQUEsUUFBUSxDQUFDQyxLQUFULEdBTnNCLENBUXRCOztBQUNBL0MsSUFBQUEsSUFBSSxDQUFDZ0QsVUFBTCxDQUFnQnhCLE9BQWhCLENBQXdCLFVBQUN5QixLQUFELEVBQVE1RSxLQUFSLEVBQWtCO0FBQ3RDLFVBQU02RSxLQUFLLEdBQUdELEtBQUssQ0FBQ0UsRUFBcEI7QUFDQSxVQUFNQyxRQUFRLGFBQU1ILEtBQUssQ0FBQzVDLElBQU4sSUFBYzRDLEtBQUssYUFBekIsZUFBd0NBLEtBQUssYUFBN0MsU0FBMERBLEtBQUssQ0FBQ0ksTUFBTixLQUFpQixHQUFqQixJQUF3QkosS0FBSyxDQUFDSSxNQUFOLEtBQWlCLENBQXpDLGNBQWlESixLQUFLLENBQUNJLE1BQXZELElBQWtFLEVBQTVILE1BQWQ7QUFDQSxVQUFNQyxRQUFRLEdBQUdqRixLQUFLLEtBQUssQ0FBM0IsQ0FIc0MsQ0FLdEM7O0FBQ0F3RSxNQUFBQSxLQUFLLENBQUNVLE1BQU4sNkNBQ3FCRCxRQUFRLEdBQUcsUUFBSCxHQUFjLEVBRDNDLDJCQUM0REosS0FENUQsc0NBRVVFLFFBRlYsMkNBTnNDLENBWXRDO0FBQ0E7O0FBQ0EsVUFBTUksU0FBUyxHQUFHQyxRQUFRLENBQUNSLEtBQUssQ0FBQ0ksTUFBUCxFQUFlLEVBQWYsQ0FBUixHQUE2QixDQUEvQztBQUNBLFVBQU1LLFlBQVksR0FBR0YsU0FBUyxzR0FDNENOLEtBRDVDLGtFQUVNbEksZUFBZSxDQUFDMkkseUJBRnRCLDRDQUkxQixFQUpKO0FBTUFiLE1BQUFBLFFBQVEsQ0FBQ1MsTUFBVCxDQUFnQnRKLFFBQVEsQ0FBQzJKLG1CQUFULENBQTZCWCxLQUE3QixFQUFvQ0ssUUFBcEMsRUFBOENJLFlBQTlDLENBQWhCO0FBQ0gsS0F0QkQsRUFUc0IsQ0FpQ3RCOztBQUNBLFFBQUkxRCxJQUFJLENBQUM2RCxRQUFULEVBQW1CO0FBQ2YsVUFBTUEsUUFBUSxHQUFHN0QsSUFBSSxDQUFDNkQsUUFBdEI7QUFDQUEsTUFBQUEsUUFBUSxDQUFDVixFQUFULEdBQWMsQ0FBZCxDQUZlLENBSWY7O0FBQ0FOLE1BQUFBLEtBQUssQ0FBQ1UsTUFBTiw2SUFMZSxDQVdmOztBQUNBVCxNQUFBQSxRQUFRLENBQUNTLE1BQVQsQ0FBZ0J0SixRQUFRLENBQUM2SixrQkFBVCxDQUE0QkQsUUFBNUIsRUFBc0M3RCxJQUFJLENBQUNnRCxVQUEzQyxDQUFoQixFQVplLENBY2Y7O0FBQ0EsVUFBTWUsa0JBQWtCLEdBQUcsRUFBM0I7QUFDQS9ELE1BQUFBLElBQUksQ0FBQ2dELFVBQUwsQ0FBZ0J4QixPQUFoQixDQUF3QixVQUFBeUIsS0FBSyxFQUFJO0FBQzdCLFlBQUksQ0FBQ2Msa0JBQWtCLENBQUNkLEtBQUssYUFBTixDQUF2QixFQUEwQztBQUN0Q2MsVUFBQUEsa0JBQWtCLENBQUNkLEtBQUssYUFBTixDQUFsQixHQUFzQztBQUNsQzNDLFlBQUFBLEtBQUssRUFBRTJDLEtBQUssQ0FBQ0UsRUFBTixDQUFTYSxRQUFULEVBRDJCO0FBRWxDL0YsWUFBQUEsSUFBSSxFQUFFZ0YsS0FBSyxhQUZ1QjtBQUdsQzVDLFlBQUFBLElBQUksRUFBRTRDLEtBQUs7QUFIdUIsV0FBdEM7QUFLSDtBQUNKLE9BUkQ7QUFVQSxVQUFNZ0Isd0JBQXdCLEdBQUduRSxNQUFNLENBQUNvRSxNQUFQLENBQWNILGtCQUFkLENBQWpDO0FBRUFJLE1BQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQyxhQUFyQyxFQUFvRDtBQUFFQyxRQUFBQSxXQUFXLEVBQUU7QUFBZixPQUFwRCxFQUF5RTtBQUNyRUMsUUFBQUEsYUFBYSxFQUFFTCx3QkFEc0Q7QUFFckVNLFFBQUFBLFdBQVcsRUFBRXZKLGVBQWUsQ0FBQ3dKLGtCQUZ3QztBQUdyRUMsUUFBQUEsVUFBVSxFQUFFO0FBSHlELE9BQXpFO0FBS0gsS0FuRXFCLENBcUV0Qjs7O0FBQ0F6RSxJQUFBQSxJQUFJLENBQUNnRCxVQUFMLENBQWdCeEIsT0FBaEIsQ0FBd0IsVUFBQ3lCLEtBQUQsRUFBVztBQUMvQixVQUFNeUIsU0FBUyxvQkFBYXpCLEtBQUssQ0FBQ0UsRUFBbkIsQ0FBZjtBQUNBLFVBQU13QixRQUFRLEdBQUcsRUFBakIsQ0FGK0IsQ0FHL0I7O0FBQ0FBLE1BQUFBLFFBQVEsQ0FBQ0QsU0FBRCxDQUFSLEdBQXNCbEUsTUFBTSxDQUFDeUMsS0FBSyxDQUFDMkIsTUFBTixJQUFnQixJQUFqQixDQUE1QjtBQUVBVCxNQUFBQSxzQkFBc0IsQ0FBQ0MsYUFBdkIsQ0FBcUNNLFNBQXJDLEVBQWdEQyxRQUFoRCxFQUEwRDtBQUN0REwsUUFBQUEsYUFBYSxFQUFFckssUUFBUSxDQUFDNEsscUJBQVQsRUFEdUM7QUFFdEROLFFBQUFBLFdBQVcsRUFBRXZKLGVBQWUsQ0FBQzhKLG9CQUZ5QjtBQUd0REwsUUFBQUEsVUFBVSxFQUFFLEtBSDBDO0FBSXRETSxRQUFBQSxpQkFBaUIsRUFBRSxDQUFDLFFBQUQsQ0FKbUMsQ0FJdkI7O0FBSnVCLE9BQTFEO0FBTUgsS0FaRCxFQXRFc0IsQ0FvRnRCOztBQUNBLFFBQUkvRSxJQUFJLENBQUM2RCxRQUFULEVBQW1CO0FBQ2ZNLE1BQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQyxVQUFyQyxFQUFpRDtBQUFFWSxRQUFBQSxRQUFRLEVBQUU7QUFBWixPQUFqRCxFQUFxRTtBQUNqRVYsUUFBQUEsYUFBYSxFQUFFckssUUFBUSxDQUFDNEsscUJBQVQsRUFEa0Q7QUFFakVOLFFBQUFBLFdBQVcsRUFBRXZKLGVBQWUsQ0FBQzhKLG9CQUZvQztBQUdqRUwsUUFBQUEsVUFBVSxFQUFFLEtBSHFEO0FBSWpFTSxRQUFBQSxpQkFBaUIsRUFBRSxDQUFDLFFBQUQsQ0FKOEMsQ0FJbEM7O0FBSmtDLE9BQXJFO0FBTUgsS0E1RnFCLENBOEZ0Qjs7O0FBQ0E1SyxJQUFBQSxDQUFDLENBQUMsNEJBQUQsQ0FBRCxDQUFnQzhLLEdBQWhDO0FBQ0E5SyxJQUFBQSxDQUFDLENBQUMsNEJBQUQsQ0FBRCxDQUFnQytLLEtBQWhDLEdBQXdDbEksT0FBeEMsQ0FBZ0QsT0FBaEQsRUFoR3NCLENBa0d0Qjs7QUFDQVYsSUFBQUEsbUJBQW1CLENBQUM2SSxnQkFBcEIsR0FuR3NCLENBcUd0QjtBQUNBO0FBQ0E7O0FBQ0FoTCxJQUFBQSxDQUFDLENBQUMsbUJBQUQsQ0FBRCxDQUF1QmlMLEdBQXZCLENBQTJCLE9BQTNCLEVBQW9DeEosRUFBcEMsQ0FBdUMsT0FBdkMsRUFBZ0QsVUFBU0MsQ0FBVCxFQUFZO0FBQ3hEQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxVQUFNdUosT0FBTyxHQUFHbEwsQ0FBQyxDQUFDLElBQUQsQ0FBakI7QUFDQSxVQUFNbUwsV0FBVyxHQUFHRCxPQUFPLENBQUM3RyxJQUFSLENBQWEsWUFBYixDQUFwQixDQUh3RCxDQUt4RDs7QUFDQXJFLE1BQUFBLENBQUMsNkNBQXFDbUwsV0FBckMsU0FBRCxDQUF1REMsTUFBdkQsR0FOd0QsQ0FReEQ7O0FBQ0EsVUFBTUMsV0FBVyxHQUFHckwsQ0FBQyxtREFBMkNtTCxXQUEzQyxTQUFyQjtBQUNBRSxNQUFBQSxXQUFXLENBQUNELE1BQVosR0FWd0QsQ0FZeEQ7O0FBQ0F0TCxNQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JtSixNQUFsQixrREFBZ0UrQixXQUFoRSx3QkFid0QsQ0FleEQ7O0FBQ0EsVUFBTUcsU0FBUyxHQUFHdEwsQ0FBQyxDQUFDLDZCQUFELENBQUQsQ0FBaUMrSyxLQUFqQyxFQUFsQjs7QUFDQSxVQUFJTyxTQUFTLENBQUNqSSxNQUFWLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3RCaUksUUFBQUEsU0FBUyxDQUFDUixHQUFWLENBQWMsWUFBZCxFQUE0QlEsU0FBUyxDQUFDakgsSUFBVixDQUFlLFVBQWYsQ0FBNUI7QUFDSCxPQW5CdUQsQ0FxQnhEOzs7QUFDQSxVQUFJb0QsSUFBSSxDQUFDOEQsYUFBVCxFQUF3QjtBQUNwQjlELFFBQUFBLElBQUksQ0FBQytELFdBQUw7QUFDSDtBQUNKLEtBekJELEVBeEdzQixDQW1JdEI7O0FBQ0F4TCxJQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQnFCLFFBQXBCLENBQTZCO0FBQ3pCQyxNQUFBQSxRQUR5QixzQkFDZDtBQUNQeEIsUUFBQUEsUUFBUSxDQUFDeUIsd0JBQVQ7QUFDSDtBQUh3QixLQUE3QixFQXBJc0IsQ0EwSXRCOztBQUNBdkIsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQmdDLFNBQWhCLENBQTBCO0FBQUNDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWMscUJBQWU7QUFBN0IsS0FBMUIsRUEzSXNCLENBNkl0Qjs7QUFDQWpDLElBQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCaUwsR0FBNUIsQ0FBZ0MsY0FBaEMsRUFBZ0R4SixFQUFoRCxDQUFtRCxjQUFuRCxFQUFtRSxZQUFXO0FBQzFFLFVBQU1nSyxVQUFVLEdBQUd6TCxDQUFDLENBQUMsSUFBRCxDQUFwQjtBQUNBLFVBQU1tTCxXQUFXLEdBQUdNLFVBQVUsQ0FBQ3BILElBQVgsQ0FBZ0IsTUFBaEIsRUFBd0J3QyxPQUF4QixDQUFnQyxTQUFoQyxFQUEyQyxFQUEzQyxDQUFwQjtBQUNBLFVBQU02RSxTQUFTLEdBQUdwQyxRQUFRLENBQUNtQyxVQUFVLENBQUM3RyxHQUFYLEVBQUQsRUFBbUIsRUFBbkIsQ0FBUixJQUFrQyxDQUFwRDtBQUNBLFVBQU1OLGFBQWEsR0FBR3RFLENBQUMsaUJBQVVtTCxXQUFWLGVBQXZCOztBQUVBLFVBQUlPLFNBQVMsR0FBRyxDQUFoQixFQUFtQjtBQUNmO0FBQ0FwSCxRQUFBQSxhQUFhLENBQUMxQyxRQUFkLENBQXVCLFVBQXZCO0FBQ0EwQyxRQUFBQSxhQUFhLENBQUNqRCxRQUFkLENBQXVCLFNBQXZCO0FBQ0FpRCxRQUFBQSxhQUFhLENBQUNqRCxRQUFkLENBQXVCLGNBQXZCO0FBQ0FpRCxRQUFBQSxhQUFhLENBQUMwQixJQUFkLENBQW1CLE9BQW5CLEVBQTRCdEIsSUFBNUIsQ0FBaUMsVUFBakMsRUFBNkMsSUFBN0M7QUFDSCxPQU5ELE1BTU87QUFDSDtBQUNBSixRQUFBQSxhQUFhLENBQUNqQyxXQUFkLENBQTBCLFVBQTFCO0FBQ0FpQyxRQUFBQSxhQUFhLENBQUNqRCxRQUFkLENBQXVCLGFBQXZCO0FBQ0FpRCxRQUFBQSxhQUFhLENBQUMwQixJQUFkLENBQW1CLE9BQW5CLEVBQTRCdEIsSUFBNUIsQ0FBaUMsVUFBakMsRUFBNkMsS0FBN0M7QUFDSCxPQWpCeUUsQ0FrQjFFOzs7QUFDQTVFLE1BQUFBLFFBQVEsQ0FBQ3lCLHdCQUFUO0FBQ0gsS0FwQkQsRUE5SXNCLENBb0t0Qjs7QUFDQXZCLElBQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCNkMsT0FBNUIsQ0FBb0MsUUFBcEMsRUFyS3NCLENBdUt0Qjs7QUFDQTdDLElBQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCcUIsUUFBckIsR0F4S3NCLENBMEt0Qjs7QUFDQXJCLElBQUFBLENBQUMsQ0FBQyxrQ0FBRCxDQUFELENBQXNDaUwsR0FBdEMsQ0FBMEMsUUFBMUMsRUFBb0R4SixFQUFwRCxDQUF1RCxRQUF2RCxFQUFpRSxZQUFXO0FBQ3hFLFVBQU1rSyxtQkFBbUIsR0FBRzNMLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUTRFLEdBQVIsRUFBNUIsQ0FEd0UsQ0FHeEU7O0FBQ0E1RSxNQUFBQSxDQUFDLENBQUMsK0JBQUQsQ0FBRCxDQUFtQzRMLElBQW5DLEdBSndFLENBTXhFOztBQUNBNUwsTUFBQUEsQ0FBQyw4QkFBdUIyTCxtQkFBdkIsRUFBRCxDQUErQ0UsSUFBL0MsR0FQd0UsQ0FTeEU7O0FBQ0E3TCxNQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0QmlFLElBQTVCLENBQWlDLFVBQUNDLEtBQUQsRUFBUTRHLEdBQVIsRUFBZ0I7QUFDN0MsWUFBTWdCLElBQUksR0FBRzlMLENBQUMsQ0FBQzhLLEdBQUQsQ0FBZDtBQUNBLFlBQU0vQixLQUFLLEdBQUcrQyxJQUFJLENBQUN6SCxJQUFMLENBQVUsVUFBVixDQUFkLENBRjZDLENBSTdDOztBQUNBeUgsUUFBQUEsSUFBSSxDQUFDOUYsSUFBTCxDQUFVLGFBQVYsRUFBeUJvRixNQUF6QixHQUw2QyxDQU83Qzs7QUFDQSxZQUFJckMsS0FBSyxLQUFLNEMsbUJBQWQsRUFBbUM7QUFDL0JHLFVBQUFBLElBQUksQ0FBQ0MsT0FBTCxDQUFhLDRCQUFiO0FBQ0g7QUFDSixPQVhELEVBVndFLENBdUJ4RTs7QUFDQSxVQUFJdEUsSUFBSSxDQUFDOEQsYUFBVCxFQUF3QjtBQUNwQjlELFFBQUFBLElBQUksQ0FBQytELFdBQUw7QUFDSDtBQUNKLEtBM0JELEVBM0tzQixDQXdNdEI7O0FBQ0F4TCxJQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQmlMLEdBQXBCLENBQXdCLG1CQUF4QixFQUE2Q3hKLEVBQTdDLENBQWdELG1CQUFoRCxFQUFxRSxZQUFXO0FBQzVFLFVBQU1xRixTQUFTLEdBQUc5RyxDQUFDLENBQUMsSUFBRCxDQUFuQjtBQUNBLFVBQU1tTCxXQUFXLEdBQUdyRSxTQUFTLENBQUN6QyxJQUFWLENBQWUsSUFBZixFQUFxQndDLE9BQXJCLENBQTZCLE9BQTdCLEVBQXNDLEVBQXRDLEVBQTBDQSxPQUExQyxDQUFrRCxXQUFsRCxFQUErRCxFQUEvRCxDQUFwQjtBQUNBLFVBQU10QyxhQUFhLEdBQUd1QyxTQUFTLENBQUN6RixRQUFWLENBQW1CLFlBQW5CLENBQXRCLENBSDRFLENBSzVFOztBQUNBLFVBQU0ySyxnQkFBZ0IsR0FBR2hNLENBQUMsOEJBQXVCbUwsV0FBdkIsRUFBMUI7QUFDQSxVQUFNYyxpQkFBaUIsR0FBR0QsZ0JBQWdCLENBQUNoRyxJQUFqQixDQUFzQixtRkFBdEIsQ0FBMUI7O0FBRUEsVUFBSXpCLGFBQUosRUFBbUI7QUFDZjtBQUNBMEgsUUFBQUEsaUJBQWlCLENBQUN2SCxJQUFsQixDQUF1QixVQUF2QixFQUFtQyxJQUFuQztBQUNBdUgsUUFBQUEsaUJBQWlCLENBQUN0SCxPQUFsQixDQUEwQixRQUExQixFQUFvQy9DLFFBQXBDLENBQTZDLFVBQTdDO0FBQ0gsT0FKRCxNQUlPO0FBQ0g7QUFDQXFLLFFBQUFBLGlCQUFpQixDQUFDdkgsSUFBbEIsQ0FBdUIsVUFBdkIsRUFBbUMsS0FBbkM7QUFDQXVILFFBQUFBLGlCQUFpQixDQUFDdEgsT0FBbEIsQ0FBMEIsUUFBMUIsRUFBb0N0QyxXQUFwQyxDQUFnRCxVQUFoRDtBQUNIO0FBQ0osS0FsQkQsRUF6TXNCLENBNk50Qjs7QUFDQSxRQUFNNEUsYUFBYSxHQUFHakgsQ0FBQyxDQUFDLDBDQUFELENBQXZCOztBQUNBLFFBQUlpSCxhQUFhLENBQUM1RCxNQUFkLEdBQXVCLENBQTNCLEVBQThCO0FBQzFCNEQsTUFBQUEsYUFBYSxDQUFDcEUsT0FBZCxDQUFzQixRQUF0QjtBQUNILEtBak9xQixDQW1PdEI7QUFDQTs7O0FBQ0EvQyxJQUFBQSxRQUFRLENBQUN5Qix3QkFBVCxHQXJPc0IsQ0F1T3RCO0FBQ0E7O0FBQ0EsUUFBSWtHLElBQUksQ0FBQzhELGFBQVQsRUFBd0I7QUFDcEI7QUFDQSxVQUFNVyx5QkFBeUIsR0FBR3pFLElBQUksQ0FBQzBFLGlCQUF2QztBQUNBLFVBQU1DLG1CQUFtQixHQUFHM0UsSUFBSSxDQUFDK0QsV0FBakM7O0FBRUEvRCxNQUFBQSxJQUFJLENBQUMwRSxpQkFBTCxHQUF5QixZQUFXO0FBQ2hDO0FBQ0EsWUFBTUUsY0FBYyxHQUFHdk0sUUFBUSxDQUFDRyxRQUFULENBQWtCc0MsSUFBbEIsQ0FBdUIsWUFBdkIsQ0FBdkIsQ0FGZ0MsQ0FJaEM7O0FBQ0EsWUFBTStKLFlBQVksR0FBRyxFQUFyQjtBQUNBeE0sUUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCK0YsSUFBbEIsQ0FBdUIseUJBQXZCLEVBQWtEL0IsSUFBbEQsQ0FBdUQsWUFBVztBQUM5RCxjQUFNc0ksTUFBTSxHQUFHdk0sQ0FBQyxDQUFDLElBQUQsQ0FBaEI7QUFDQSxjQUFNa0csSUFBSSxHQUFHcUcsTUFBTSxDQUFDbEksSUFBUCxDQUFZLE1BQVosS0FBdUJrSSxNQUFNLENBQUNsSSxJQUFQLENBQVksSUFBWixDQUFwQzs7QUFDQSxjQUFJNkIsSUFBSixFQUFVO0FBQ04sZ0JBQUlxRyxNQUFNLENBQUNsSSxJQUFQLENBQVksTUFBWixNQUF3QixVQUE1QixFQUF3QztBQUNwQ2lJLGNBQUFBLFlBQVksQ0FBQ3BHLElBQUQsQ0FBWixHQUFxQnFHLE1BQU0sQ0FBQ0MsRUFBUCxDQUFVLFVBQVYsQ0FBckI7QUFDSCxhQUZELE1BRU8sSUFBSUQsTUFBTSxDQUFDbEksSUFBUCxDQUFZLE1BQVosTUFBd0IsT0FBNUIsRUFBcUM7QUFDeEMsa0JBQUlrSSxNQUFNLENBQUNDLEVBQVAsQ0FBVSxVQUFWLENBQUosRUFBMkI7QUFDdkJGLGdCQUFBQSxZQUFZLENBQUNwRyxJQUFELENBQVosR0FBcUJxRyxNQUFNLENBQUMzSCxHQUFQLEVBQXJCO0FBQ0g7QUFDSixhQUpNLE1BSUE7QUFDSDBILGNBQUFBLFlBQVksQ0FBQ3BHLElBQUQsQ0FBWixHQUFxQnFHLE1BQU0sQ0FBQzNILEdBQVAsRUFBckI7QUFDSDtBQUNKO0FBQ0osU0FkRCxFQU5nQyxDQXNCaEM7O0FBQ0E2QyxRQUFBQSxJQUFJLENBQUNnRixhQUFMLEdBQXFCOUcsTUFBTSxDQUFDQyxNQUFQLENBQWMsRUFBZCxFQUFrQnlHLGNBQWxCLEVBQWtDQyxZQUFsQyxDQUFyQjtBQUNILE9BeEJEOztBQTBCQTdFLE1BQUFBLElBQUksQ0FBQytELFdBQUwsR0FBbUIsWUFBVztBQUMxQjtBQUNBLFlBQU1hLGNBQWMsR0FBR3ZNLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNDLElBQWxCLENBQXVCLFlBQXZCLENBQXZCLENBRjBCLENBSTFCOztBQUNBLFlBQU0rSixZQUFZLEdBQUcsRUFBckI7QUFDQXhNLFFBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQitGLElBQWxCLENBQXVCLHlCQUF2QixFQUFrRC9CLElBQWxELENBQXVELFlBQVc7QUFDOUQsY0FBTXNJLE1BQU0sR0FBR3ZNLENBQUMsQ0FBQyxJQUFELENBQWhCO0FBQ0EsY0FBTWtHLElBQUksR0FBR3FHLE1BQU0sQ0FBQ2xJLElBQVAsQ0FBWSxNQUFaLEtBQXVCa0ksTUFBTSxDQUFDbEksSUFBUCxDQUFZLElBQVosQ0FBcEM7O0FBQ0EsY0FBSTZCLElBQUosRUFBVTtBQUNOLGdCQUFJcUcsTUFBTSxDQUFDbEksSUFBUCxDQUFZLE1BQVosTUFBd0IsVUFBNUIsRUFBd0M7QUFDcENpSSxjQUFBQSxZQUFZLENBQUNwRyxJQUFELENBQVosR0FBcUJxRyxNQUFNLENBQUNDLEVBQVAsQ0FBVSxVQUFWLENBQXJCO0FBQ0gsYUFGRCxNQUVPLElBQUlELE1BQU0sQ0FBQ2xJLElBQVAsQ0FBWSxNQUFaLE1BQXdCLE9BQTVCLEVBQXFDO0FBQ3hDLGtCQUFJa0ksTUFBTSxDQUFDQyxFQUFQLENBQVUsVUFBVixDQUFKLEVBQTJCO0FBQ3ZCRixnQkFBQUEsWUFBWSxDQUFDcEcsSUFBRCxDQUFaLEdBQXFCcUcsTUFBTSxDQUFDM0gsR0FBUCxFQUFyQjtBQUNIO0FBQ0osYUFKTSxNQUlBO0FBQ0gwSCxjQUFBQSxZQUFZLENBQUNwRyxJQUFELENBQVosR0FBcUJxRyxNQUFNLENBQUMzSCxHQUFQLEVBQXJCO0FBQ0g7QUFDSjtBQUNKLFNBZEQsRUFOMEIsQ0FzQjFCOztBQUNBLFlBQU04SCxhQUFhLEdBQUcvRyxNQUFNLENBQUNDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCeUcsY0FBbEIsRUFBa0NDLFlBQWxDLENBQXRCOztBQUVBLFlBQUlLLElBQUksQ0FBQ0MsU0FBTCxDQUFlbkYsSUFBSSxDQUFDZ0YsYUFBcEIsTUFBdUNFLElBQUksQ0FBQ0MsU0FBTCxDQUFlRixhQUFmLENBQTNDLEVBQTBFO0FBQ3RFakYsVUFBQUEsSUFBSSxDQUFDb0YsYUFBTCxDQUFtQmpMLFFBQW5CLENBQTRCLFVBQTVCO0FBQ0E2RixVQUFBQSxJQUFJLENBQUNxRixlQUFMLENBQXFCbEwsUUFBckIsQ0FBOEIsVUFBOUI7QUFDSCxTQUhELE1BR087QUFDSDZGLFVBQUFBLElBQUksQ0FBQ29GLGFBQUwsQ0FBbUJ4SyxXQUFuQixDQUErQixVQUEvQjtBQUNBb0YsVUFBQUEsSUFBSSxDQUFDcUYsZUFBTCxDQUFxQnpLLFdBQXJCLENBQWlDLFVBQWpDO0FBQ0g7QUFDSixPQWhDRDs7QUFrQ0EsVUFBSSxPQUFPb0YsSUFBSSxDQUFDMEUsaUJBQVosS0FBa0MsVUFBdEMsRUFBa0Q7QUFDOUMxRSxRQUFBQSxJQUFJLENBQUMwRSxpQkFBTDtBQUNIOztBQUNELFVBQUksT0FBTzFFLElBQUksQ0FBQ3NGLFNBQVosS0FBMEIsVUFBOUIsRUFBMEM7QUFDdEN0RixRQUFBQSxJQUFJLENBQUNzRixTQUFMO0FBQ0g7QUFDSjtBQUNKLEdBM3VCWTs7QUE2dUJiO0FBQ0o7QUFDQTtBQUNJdEQsRUFBQUEsbUJBaHZCYSwrQkFndkJPWCxLQWh2QlAsRUFndkJjSyxRQWh2QmQsRUFndkJ3QkksWUFodkJ4QixFQWd2QnNDO0FBQy9DLFFBQU1QLEVBQUUsR0FBR0YsS0FBSyxDQUFDRSxFQUFqQjtBQUNBLFFBQU1nRSxtQkFBbUIsR0FBR2xFLEtBQUssQ0FBQ21FLFFBQU4sSUFBa0IsS0FBOUMsQ0FGK0MsQ0FJL0M7O0FBQ0EsUUFBTUMsaUJBQWlCLEdBQUdGLG1CQUFtQixHQUFHLEVBQUgsR0FBUSx1QkFBckQ7QUFDQSxRQUFNRyxrQkFBa0IsR0FBR3JFLEtBQUssQ0FBQ3NFLElBQU4sR0FBYSxVQUFiLEdBQTBCLEVBQXJEO0FBQ0EsUUFBTUMsdUJBQXVCLEdBQUd2RSxLQUFLLENBQUNzRSxJQUFOLEdBQWEsVUFBYixHQUEwQixFQUExRDtBQUVBLCtFQUNpRGpFLFFBQVEsR0FBRyxRQUFILEdBQWMsRUFEdkUsMkJBQ3dGSCxFQUR4RiwwRUFFK0NBLEVBRi9DLHdCQUU2REYsS0FBSyxhQUZsRSx3RkFLcUJqSSxlQUFlLENBQUN5TSxnQkFMckMseUlBT2dEdEUsRUFQaEQsd0JBTzhERixLQUFLLENBQUM1QyxJQUFOLElBQWMsRUFQNUUsd1BBYThFOEMsRUFiOUUsOEdBYzJFQSxFQWQzRSxnQkFja0ZnRSxtQkFBbUIsR0FBRyxTQUFILEdBQWUsRUFkcEgsa0ZBZXdEbk0sZUFBZSxDQUFDME0sb0JBQWhCLElBQXdDLG9CQWZoRyx5UUFzQjhEekUsS0FBSyxDQUFDSSxNQUFOLEdBQWUsQ0FBZixHQUFtQixXQUFuQixHQUFpQyxFQXRCL0YsMEJBc0IrR0YsRUF0Qi9HLDRGQXVCd0RBLEVBdkJ4RCxnQkF1QitERixLQUFLLENBQUNJLE1BQU4sR0FBZSxDQUFmLEdBQW1CLEVBQW5CLEdBQXlCSixLQUFLLENBQUNzRSxJQUFOLEdBQWEsU0FBYixHQUF5QixFQXZCakgsY0F1QndIdEUsS0FBSyxDQUFDSSxNQUFOLEdBQWUsQ0FBZixHQUFtQixVQUFuQixHQUFnQyxFQXZCeEoscURBd0I2QnJJLGVBQWUsQ0FBQzJNLFVBeEI3QyxtS0E2QjZDeEUsRUE3QjdDLDhCQTZCaUVBLEVBN0JqRSxpRkErQm1EQSxFQS9CbkQsNEZBaUN5Qm5JLGVBQWUsQ0FBQzRNLFlBakN6Qyx1S0FtQ3dFekUsRUFuQ3hFLHdCQW1Dc0ZGLEtBQUssQ0FBQzRFLE1BQU4sSUFBZ0IsRUFuQ3RHLDBKQXVDeUI3TSxlQUFlLENBQUM4TSxjQXZDekMsbUpBeUNzRDNFLEVBekN0RCw4QkF5QzBFQSxFQXpDMUUsd0JBeUN3RkYsS0FBSyxDQUFDMkIsTUFBTixJQUFnQixFQXpDeEcsNEtBK0NxQjVKLGVBQWUsQ0FBQytNLFNBL0NyQyw2SUFpRG9ENUUsRUFqRHBELHdCQWlEa0VGLEtBQUssQ0FBQ0ksTUFBTixJQUFnQixHQWpEbEYseUhBcUR3Q0YsRUFyRHhDLGdCQXFEK0NrRSxpQkFyRC9DLHlFQXNEaURyTSxlQUFlLENBQUNnTixtQkFBaEIsSUFBdUMsbUJBdER4RixpR0F5RHlCaE4sZUFBZSxDQUFDaU4sVUF6RHpDLGdGQTBEa0RULHVCQTFEbEQsc0dBMkR5RXJFLEVBM0R6RSx3QkEyRHVGRixLQUFLLENBQUNpRixPQUFOLElBQWlCLEVBM0R4RyxnQkEyRCtHWixrQkEzRC9HLDBKQWdFeUJ0TSxlQUFlLENBQUNtTixhQWhFekMsZ0ZBaUVrRFgsdUJBakVsRCx5R0FrRTRFckUsRUFsRTVFLHdCQWtFMEZGLEtBQUssQ0FBQ21GLFVBQU4sSUFBb0IsRUFsRTlHLGdCQWtFcUhkLGtCQWxFckgsMEpBdUV5QnRNLGVBQWUsQ0FBQ3FOLGVBdkV6QyxnRkF3RWtEYix1QkF4RWxELDJHQXlFOEVyRSxFQXpFOUUsd0JBeUU0RkYsS0FBSyxDQUFDcUYsWUFBTixJQUFzQixFQXpFbEgsZ0JBeUV5SGhCLGtCQXpFekgsd0hBOEVVNUQsWUE5RVY7QUFpRkgsR0ExMEJZOztBQTQwQmI7QUFDSjtBQUNBO0FBQ0lJLEVBQUFBLGtCQS8wQmEsOEJBKzBCTUQsUUEvMEJOLEVBKzBCZ0JiLFVBLzBCaEIsRUErMEI0QjtBQUNyQyxRQUFNRyxFQUFFLEdBQUcsQ0FBWDtBQUVBLDRGQUM0REEsRUFENUQsb0ZBR3FCbkksZUFBZSxDQUFDd0osa0JBSHJDLGdKQUt1RHJCLEVBTHZELCtCQUs0RUEsRUFMNUUsNElBVXFCbkksZUFBZSxDQUFDeU0sZ0JBVnJDLHlJQVlnRHRFLEVBWmhELDBCQVlnRUEsRUFaaEUsOFBBa0J5RUEsRUFsQnpFLDRGQW1Cd0RBLEVBbkJ4RCwrREFvQjZCbkksZUFBZSxDQUFDMk0sVUFwQjdDLG1LQXlCNkN4RSxFQXpCN0MsOEJBeUJpRUEsRUF6QmpFLGlGQTJCbURBLEVBM0JuRCw0RkE2QnlCbkksZUFBZSxDQUFDNE0sWUE3QnpDLHVLQStCd0V6RSxFQS9CeEUscUtBbUN5Qm5JLGVBQWUsQ0FBQzhNLGNBbkN6QyxtSkFxQ3NEM0UsRUFyQ3RELDhCQXFDMEVBLEVBckMxRSx5TEEyQ3FCbkksZUFBZSxDQUFDK00sU0EzQ3JDLDZJQTZDb0Q1RSxFQTdDcEQ7QUFrREgsR0FwNEJZOztBQXM0QmI7QUFDSjtBQUNBO0FBQ0E7QUFDSTBCLEVBQUFBLHFCQTE0QmEsbUNBMDRCVztBQUNwQjtBQUNBLFdBQU8sQ0FDSDtBQUFDdkUsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQURHLEVBRUg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FGRyxFQUdIO0FBQUNxQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjckMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBSEcsRUFJSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQUpHLEVBS0g7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FMRyxFQU1IO0FBQUNxQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjckMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBTkcsRUFPSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQVBHLEVBUUg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FSRyxFQVNIO0FBQUNxQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjckMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBVEcsRUFVSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQVZHLEVBV0g7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FYRyxFQVlIO0FBQUNxQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjckMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBWkcsRUFhSDtBQUFDcUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY3JDLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWJHLEVBY0g7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FkRyxFQWVIO0FBQUNxQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjckMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBZkcsRUFnQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FoQkcsRUFpQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FqQkcsRUFrQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FsQkcsRUFtQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FuQkcsRUFvQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FwQkcsRUFxQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FyQkcsRUFzQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0F0QkcsRUF1Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNyQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0F2QkcsRUF3Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0F4QkcsRUF5Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0F6QkcsRUEwQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0ExQkcsRUEyQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0EzQkcsRUE0Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0E1QkcsRUE2Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0E3QkcsRUE4Qkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0E5QkcsRUErQkg7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0EvQkcsRUFnQ0g7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0FoQ0csRUFpQ0g7QUFBQ3FDLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0FqQ0csQ0FBUDtBQW1DSCxHQS82Qlk7O0FBaTdCYjtBQUNKO0FBQ0E7QUFDSXVFLEVBQUFBLFlBcDdCYSx3QkFvN0JBeEMsSUFwN0JBLEVBbzdCTTtBQUNmO0FBQ0EvRixJQUFBQSxRQUFRLENBQUMySSxtQkFBVCxDQUE2QjVDLElBQTdCLEVBRmUsQ0FJZjs7QUFDQSxRQUFJQSxJQUFJLENBQUN1SSxHQUFULEVBQWM7QUFDVjtBQUNBLFVBQUl2SSxJQUFJLENBQUN1SSxHQUFMLENBQVM3SCxNQUFiLEVBQXFCO0FBQ2pCdkcsUUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JxQixRQUF0QixDQUErQixPQUEvQjtBQUNILE9BRkQsTUFFTztBQUNIckIsUUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JxQixRQUF0QixDQUErQixTQUEvQjtBQUNIOztBQUNEdkIsTUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCc0MsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsV0FBcEMsRUFBaURzRCxJQUFJLENBQUN1SSxHQUFMLENBQVM1TixTQUFULElBQXNCLEVBQXZFO0FBQ0FWLE1BQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNDLElBQWxCLENBQXVCLFdBQXZCLEVBQW9DLGFBQXBDLEVBQW1Ec0QsSUFBSSxDQUFDdUksR0FBTCxDQUFTcE4sV0FBVCxJQUF3QixFQUEzRSxFQVJVLENBVVY7O0FBQ0EsVUFBTXFOLG1CQUFtQixHQUFHdk8sUUFBUSxDQUFDRyxRQUFULENBQWtCK0YsSUFBbEIsQ0FBdUIsb0NBQXZCLEVBQTZEUyxNQUE3RCxDQUFvRSxXQUFwRSxDQUE1Qjs7QUFDQSxVQUFJNEgsbUJBQW1CLENBQUNoTCxNQUFwQixHQUE2QixDQUFqQyxFQUFvQztBQUNoQyxZQUFJd0MsSUFBSSxDQUFDdUksR0FBTCxDQUFTRSx1QkFBVCxJQUFvQ3pJLElBQUksQ0FBQ3VJLEdBQUwsQ0FBUzFILG9CQUFqRCxFQUF1RTtBQUNuRTJILFVBQUFBLG1CQUFtQixDQUFDaE4sUUFBcEIsQ0FBNkIsT0FBN0I7QUFDSCxTQUZELE1BRU87QUFDSGdOLFVBQUFBLG1CQUFtQixDQUFDaE4sUUFBcEIsQ0FBNkIsU0FBN0I7QUFDSDtBQUNKO0FBQ0osS0F4QmMsQ0EwQmY7OztBQUNBLFFBQUl3RSxJQUFJLENBQUM5QyxLQUFULEVBQWdCO0FBQ1o7QUFDQSxVQUFNb0UsZ0JBQWdCLEdBQUc7QUFDckIsNkJBQXFCLGlCQURBO0FBRXJCLDZCQUFxQixpQkFGQTtBQUdyQixvQkFBWSxVQUhTO0FBSXJCLG9CQUFZLFVBSlM7QUFLckIseUJBQWlCLGVBTEk7QUFNckIsdUJBQWU7QUFOTSxPQUF6QjtBQVNBeEIsTUFBQUEsTUFBTSxDQUFDeUIsSUFBUCxDQUFZdkIsSUFBSSxDQUFDOUMsS0FBakIsRUFBd0JzRSxPQUF4QixDQUFnQyxVQUFBa0gsR0FBRyxFQUFJO0FBQ25DLFlBQU1DLGFBQWEsR0FBR3JILGdCQUFnQixDQUFDb0gsR0FBRCxDQUFoQixJQUF5QkEsR0FBL0M7QUFDQSxZQUFNcEksS0FBSyxHQUFHTixJQUFJLENBQUM5QyxLQUFMLENBQVd3TCxHQUFYLENBQWQ7QUFDQXpPLFFBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNDLElBQWxCLENBQXVCLFdBQXZCLEVBQW9DaU0sYUFBcEMsRUFBbURySSxLQUFuRDtBQUNILE9BSkQsRUFYWSxDQWlCWjs7QUFDQXJHLE1BQUFBLFFBQVEsQ0FBQ2dELGlCQUFULENBQTJCK0MsSUFBSSxDQUFDOUMsS0FBaEM7QUFDQWpELE1BQUFBLFFBQVEsQ0FBQzZELGdCQUFULENBQTBCa0MsSUFBSSxDQUFDOUMsS0FBL0I7QUFDSCxLQS9DYyxDQWlEZjs7O0FBQ0EsUUFBSThDLElBQUksQ0FBQ0osUUFBVCxFQUFtQjtBQUNmRSxNQUFBQSxNQUFNLENBQUN5QixJQUFQLENBQVl2QixJQUFJLENBQUNKLFFBQWpCLEVBQTJCNEIsT0FBM0IsQ0FBbUMsVUFBQWtILEdBQUcsRUFBSTtBQUN0Q3pPLFFBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNDLElBQWxCLENBQXVCLFdBQXZCLEVBQW9DZ00sR0FBcEMsRUFBeUMxSSxJQUFJLENBQUNKLFFBQUwsQ0FBYzhJLEdBQWQsQ0FBekM7QUFDSCxPQUZEO0FBR0gsS0F0RGMsQ0F3RGY7OztBQUNBLFFBQUkxSSxJQUFJLENBQUM0SSxtQkFBVCxFQUE4QjtBQUMxQnRNLE1BQUFBLG1CQUFtQixDQUFDc00sbUJBQXBCLEdBQTBDNUksSUFBSSxDQUFDNEksbUJBQS9DO0FBQ0gsS0EzRGMsQ0E2RGY7OztBQUNBLFFBQUk1SSxJQUFJLENBQUNDLFlBQVQsRUFBdUI7QUFDbkIzRCxNQUFBQSxtQkFBbUIsQ0FBQ3VNLFVBQXBCLENBQStCN0ksSUFBSSxDQUFDQyxZQUFwQztBQUNILEtBaEVjLENBa0VmO0FBQ0E7OztBQUNBLFFBQUkyQixJQUFJLENBQUM4RCxhQUFULEVBQXdCO0FBQ3BCOUQsTUFBQUEsSUFBSSxDQUFDa0gsaUJBQUw7QUFDSDtBQUNKO0FBMy9CWSxDQUFqQjtBQTgvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTNPLENBQUMsQ0FBQzRPLEVBQUYsQ0FBS3JNLElBQUwsQ0FBVWtELFFBQVYsQ0FBbUIvRSxLQUFuQixDQUF5QmdOLE1BQXpCLEdBQWtDLFVBQUN2SCxLQUFELEVBQVc7QUFDekMsTUFBSVQsTUFBTSxHQUFHLElBQWI7QUFDQSxNQUFNbUosQ0FBQyxHQUFHMUksS0FBSyxDQUFDMUQsS0FBTixDQUFZLDhDQUFaLENBQVY7O0FBQ0EsTUFBSW9NLENBQUMsSUFBSSxJQUFULEVBQWU7QUFDWG5KLElBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0gsR0FGRCxNQUVPO0FBQ0gsU0FBSyxJQUFJb0osQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBRyxDQUFwQixFQUF1QkEsQ0FBQyxJQUFJLENBQTVCLEVBQStCO0FBQzNCLFVBQU1DLENBQUMsR0FBR0YsQ0FBQyxDQUFDQyxDQUFELENBQVg7O0FBQ0EsVUFBSUMsQ0FBQyxHQUFHLEdBQVIsRUFBYTtBQUNUckosUUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDtBQUNKOztBQUNELFFBQUltSixDQUFDLENBQUMsQ0FBRCxDQUFELEdBQU8sRUFBWCxFQUFlO0FBQ1huSixNQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNIO0FBQ0o7O0FBQ0QsU0FBT0EsTUFBUDtBQUNILENBakJEO0FBbUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBMUYsQ0FBQyxDQUFDNE8sRUFBRixDQUFLck0sSUFBTCxDQUFVa0QsUUFBVixDQUFtQi9FLEtBQW5CLENBQXlCc08sc0JBQXpCLEdBQWtELFVBQUM3SSxLQUFELEVBQVc7QUFDekQsTUFBSVQsTUFBTSxHQUFHLElBQWI7QUFDQSxNQUFNbUosQ0FBQyxHQUFHMUksS0FBSyxDQUFDMUQsS0FBTixDQUFZLHdEQUFaLENBQVY7O0FBQ0EsTUFBSW9NLENBQUMsSUFBSSxJQUFULEVBQWU7QUFDWG5KLElBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0gsR0FGRCxNQUVPO0FBQ0gsU0FBSyxJQUFJb0osQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBRyxDQUFwQixFQUF1QkEsQ0FBQyxJQUFJLENBQTVCLEVBQStCO0FBQzNCLFVBQU1DLENBQUMsR0FBR0YsQ0FBQyxDQUFDQyxDQUFELENBQVg7O0FBQ0EsVUFBSUMsQ0FBQyxHQUFHLEdBQVIsRUFBYTtBQUNUckosUUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDtBQUNKOztBQUNELFFBQUltSixDQUFDLENBQUMsQ0FBRCxDQUFELEdBQU8sRUFBWCxFQUFlO0FBQ1huSixNQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNIO0FBQ0o7O0FBQ0QsU0FBT0EsTUFBUDtBQUNILENBakJEO0FBb0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0ExRixDQUFDLENBQUM0TyxFQUFGLENBQUtyTSxJQUFMLENBQVVrRCxRQUFWLENBQW1CL0UsS0FBbkIsQ0FBeUJ1TyxTQUF6QixHQUFxQyxVQUFDdkQsU0FBRCxFQUFZd0QsS0FBWixFQUFzQjtBQUN2RCxNQUFJeEosTUFBTSxHQUFHLElBQWI7QUFDQSxNQUFNckYsVUFBVSxHQUFHLEVBQW5CO0FBQ0EsTUFBTThPLFNBQVMsR0FBR3JQLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNDLElBQWxCLENBQXVCLFlBQXZCLENBQWxCOztBQUNBLE1BQUk0TSxTQUFTLENBQUNqRixXQUFWLEtBQTBCOUQsU0FBMUIsSUFBdUMrSSxTQUFTLENBQUNqRixXQUFWLEdBQXdCLENBQW5FLEVBQXNFO0FBQ2xFLFFBQU1rRixVQUFVLEdBQUdELFNBQVMscUJBQWNBLFNBQVMsQ0FBQ2pGLFdBQXhCLEVBQTVCO0FBQ0E3SixJQUFBQSxVQUFVLENBQUMrTyxVQUFELENBQVYsR0FBeUIsQ0FBQ0QsU0FBUyxDQUFDRSxRQUFYLENBQXpCOztBQUNBLFFBQUlGLFNBQVMsQ0FBQ0UsUUFBVixLQUF1QixFQUEzQixFQUErQjtBQUMzQjNKLE1BQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7QUFDSjs7QUFDRDFGLEVBQUFBLENBQUMsQ0FBQ2lFLElBQUYsQ0FBT2tMLFNBQVAsRUFBa0IsVUFBQ2pMLEtBQUQsRUFBUWlDLEtBQVIsRUFBa0I7QUFDaEMsUUFBSWpDLEtBQUssS0FBSyxhQUFWLElBQTJCQSxLQUFLLEtBQUssVUFBekMsRUFBcUQ7O0FBQ3JELFFBQUlBLEtBQUssQ0FBQ29MLE9BQU4sQ0FBYyxRQUFkLEtBQTJCLENBQS9CLEVBQWtDO0FBQzlCLFVBQU1DLE9BQU8sR0FBR0osU0FBUyxxQkFBY2pMLEtBQUssQ0FBQ3NMLEtBQU4sQ0FBWSxHQUFaLEVBQWlCLENBQWpCLENBQWQsRUFBekI7O0FBQ0EsVUFBSXhQLENBQUMsQ0FBQ3lQLE9BQUYsQ0FBVXRKLEtBQVYsRUFBaUI5RixVQUFVLENBQUNrUCxPQUFELENBQTNCLEtBQXlDLENBQXpDLElBQ0c3RCxTQUFTLEtBQUt2RixLQURqQixJQUVHK0ksS0FBSyxLQUFLaEwsS0FBSyxDQUFDc0wsS0FBTixDQUFZLEdBQVosRUFBaUIsQ0FBakIsQ0FGakIsRUFFc0M7QUFDbEM5SixRQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNILE9BSkQsTUFJTztBQUNILFlBQUksRUFBRTZKLE9BQU8sSUFBSWxQLFVBQWIsQ0FBSixFQUE4QjtBQUMxQkEsVUFBQUEsVUFBVSxDQUFDa1AsT0FBRCxDQUFWLEdBQXNCLEVBQXRCO0FBQ0g7O0FBQ0RsUCxRQUFBQSxVQUFVLENBQUNrUCxPQUFELENBQVYsQ0FBb0JHLElBQXBCLENBQXlCdkosS0FBekI7QUFDSDtBQUNKO0FBQ0osR0FmRDtBQWdCQSxTQUFPVCxNQUFQO0FBQ0gsQ0E1QkQsQyxDQThCQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0ExRixDQUFDLENBQUM0TyxFQUFGLENBQUtyTSxJQUFMLENBQVVrRCxRQUFWLENBQW1CL0UsS0FBbkIsQ0FBeUJpUCxhQUF6QixHQUF5QyxZQUFNO0FBQzNDLE1BQU1SLFNBQVMsR0FBR3JQLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNDLElBQWxCLENBQXVCLFlBQXZCLENBQWxCOztBQUNBLE1BQUk0TSxTQUFTLENBQUM1SSxNQUFWLEtBQXFCLElBQXpCLEVBQStCO0FBQzNCLFFBQUk0SSxTQUFTLENBQUNuTyxXQUFWLEtBQTBCLEVBQTFCLElBQWdDbU8sU0FBUyxDQUFDM08sU0FBVixLQUF3QixFQUE1RCxFQUFnRTtBQUM1RCxhQUFPLEtBQVA7QUFDSDtBQUNKOztBQUNELFNBQU8sSUFBUDtBQUNILENBUkQ7QUFVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVIsQ0FBQyxDQUFDNE8sRUFBRixDQUFLck0sSUFBTCxDQUFVa0QsUUFBVixDQUFtQi9FLEtBQW5CLENBQXlCa1AsYUFBekIsR0FBeUMsVUFBQ3pKLEtBQUQsRUFBVztBQUNoRCxNQUFJLENBQUNBLEtBQUQsSUFBVUEsS0FBSyxLQUFLLEVBQXhCLEVBQTRCO0FBQ3hCLFdBQU8sSUFBUCxDQUR3QixDQUNYO0FBQ2hCLEdBSCtDLENBS2hEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0EsTUFBTTBKLGFBQWEsR0FBRywyRUFBdEI7QUFDQSxTQUFPQSxhQUFhLENBQUNDLElBQWQsQ0FBbUIzSixLQUFuQixDQUFQO0FBQ0gsQ0FiRDtBQWdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQSxJQUFNaEUsbUJBQW1CLEdBQUc7QUFDeEI0TixFQUFBQSxNQUFNLEVBQUUvUCxDQUFDLENBQUMsc0JBQUQsQ0FEZTtBQUV4QmdRLEVBQUFBLFFBQVEsRUFBRWhRLENBQUMsQ0FBQyx3QkFBRCxDQUZhO0FBR3hCaVEsRUFBQUEsVUFBVSxFQUFFalEsQ0FBQyxDQUFDLGdCQUFELENBSFc7QUFJeEJrUSxFQUFBQSxNQUFNLEVBQUUsRUFKZ0I7QUFLeEJ6QixFQUFBQSxtQkFBbUIsRUFBRSxFQUxHO0FBS0M7O0FBRXpCO0FBQ0o7QUFDQTtBQUNJdE4sRUFBQUEsVUFWd0Isd0JBVVg7QUFDVDtBQUNBZ0IsSUFBQUEsbUJBQW1CLENBQUM2SSxnQkFBcEIsR0FGUyxDQUlUOztBQUNBN0ksSUFBQUEsbUJBQW1CLENBQUNnTyxxQkFBcEIsR0FMUyxDQU9UOztBQUNBaE8sSUFBQUEsbUJBQW1CLENBQUM4TixVQUFwQixDQUErQnhPLEVBQS9CLENBQWtDLE9BQWxDLEVBQTJDLFVBQUNDLENBQUQsRUFBTztBQUM5Q0EsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0FRLE1BQUFBLG1CQUFtQixDQUFDaU8sUUFBcEI7QUFDSCxLQUhELEVBUlMsQ0FhVDs7QUFDQWpPLElBQUFBLG1CQUFtQixDQUFDNE4sTUFBcEIsQ0FBMkJ0TyxFQUEzQixDQUE4QixPQUE5QixFQUF1QyxzQkFBdkMsRUFBK0QsVUFBQ0MsQ0FBRCxFQUFPO0FBQ2xFQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQTNCLE1BQUFBLENBQUMsQ0FBQzBCLENBQUMsQ0FBQzJPLE1BQUgsQ0FBRCxDQUFZMUwsT0FBWixDQUFvQixJQUFwQixFQUEwQnlHLE1BQTFCO0FBQ0FqSixNQUFBQSxtQkFBbUIsQ0FBQ21PLGdCQUFwQjtBQUNBN0ksTUFBQUEsSUFBSSxDQUFDOEksV0FBTDtBQUNILEtBTEQsRUFkUyxDQXFCVDs7QUFDQXBPLElBQUFBLG1CQUFtQixDQUFDNE4sTUFBcEIsQ0FBMkJ0TyxFQUEzQixDQUE4QixPQUE5QixFQUF1QyxvQkFBdkMsRUFBNkQsVUFBQ0MsQ0FBRCxFQUFPO0FBQ2hFQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxVQUFNNk8sVUFBVSxHQUFHeFEsQ0FBQyxDQUFDMEIsQ0FBQyxDQUFDMk8sTUFBSCxDQUFELENBQVkxTCxPQUFaLENBQW9CLElBQXBCLENBQW5CO0FBQ0F4QyxNQUFBQSxtQkFBbUIsQ0FBQ3NPLFNBQXBCLENBQThCRCxVQUE5QjtBQUNILEtBSkQsRUF0QlMsQ0E0QlQ7O0FBQ0FyTyxJQUFBQSxtQkFBbUIsQ0FBQzROLE1BQXBCLENBQTJCdE8sRUFBM0IsQ0FBOEIsY0FBOUIsRUFBOEMsb0RBQTlDLEVBQW9HLFlBQU07QUFDdEdnRyxNQUFBQSxJQUFJLENBQUM4SSxXQUFMO0FBQ0gsS0FGRCxFQTdCUyxDQWlDVDs7QUFDQXBPLElBQUFBLG1CQUFtQixDQUFDNE4sTUFBcEIsQ0FBMkJ0TyxFQUEzQixDQUE4QixPQUE5QixFQUF1QyxnQ0FBdkMsRUFBeUUsVUFBU0MsQ0FBVCxFQUFZO0FBQ2pGQSxNQUFBQSxDQUFDLENBQUNDLGNBQUYsR0FEaUYsQ0FHakY7O0FBQ0EsVUFBSStPLFVBQVUsR0FBRyxFQUFqQjs7QUFDQSxVQUFJaFAsQ0FBQyxDQUFDaVAsYUFBRixJQUFtQmpQLENBQUMsQ0FBQ2lQLGFBQUYsQ0FBZ0JDLGFBQW5DLElBQW9EbFAsQ0FBQyxDQUFDaVAsYUFBRixDQUFnQkMsYUFBaEIsQ0FBOEJDLE9BQXRGLEVBQStGO0FBQzNGSCxRQUFBQSxVQUFVLEdBQUdoUCxDQUFDLENBQUNpUCxhQUFGLENBQWdCQyxhQUFoQixDQUE4QkMsT0FBOUIsQ0FBc0MsTUFBdEMsQ0FBYjtBQUNILE9BRkQsTUFFTyxJQUFJblAsQ0FBQyxDQUFDa1AsYUFBRixJQUFtQmxQLENBQUMsQ0FBQ2tQLGFBQUYsQ0FBZ0JDLE9BQXZDLEVBQWdEO0FBQ25ESCxRQUFBQSxVQUFVLEdBQUdoUCxDQUFDLENBQUNrUCxhQUFGLENBQWdCQyxPQUFoQixDQUF3QixNQUF4QixDQUFiO0FBQ0gsT0FGTSxNQUVBLElBQUlDLE1BQU0sQ0FBQ0YsYUFBUCxJQUF3QkUsTUFBTSxDQUFDRixhQUFQLENBQXFCQyxPQUFqRCxFQUEwRDtBQUM3REgsUUFBQUEsVUFBVSxHQUFHSSxNQUFNLENBQUNGLGFBQVAsQ0FBcUJDLE9BQXJCLENBQTZCLE1BQTdCLENBQWIsQ0FENkQsQ0FDVjtBQUN0RCxPQVhnRixDQWFqRjs7O0FBQ0EsVUFBTUUsV0FBVyxHQUFHTCxVQUFVLENBQUNNLElBQVgsR0FBa0JuSyxPQUFsQixDQUEwQixVQUExQixFQUFzQyxFQUF0QyxDQUFwQixDQWRpRixDQWdCakY7O0FBQ0EsVUFBTVosTUFBTSxHQUFHakcsQ0FBQyxDQUFDLElBQUQsQ0FBaEIsQ0FqQmlGLENBbUJqRjs7QUFDQWlHLE1BQUFBLE1BQU0sQ0FBQ2pFLFNBQVAsQ0FBaUIsUUFBakIsRUFwQmlGLENBc0JqRjs7QUFDQWlFLE1BQUFBLE1BQU0sQ0FBQ3JCLEdBQVAsQ0FBV21NLFdBQVgsRUF2QmlGLENBeUJqRjs7QUFDQUUsTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYmhMLFFBQUFBLE1BQU0sQ0FBQ2pFLFNBQVAsQ0FBaUI7QUFBQ0MsVUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY21JLFVBQUFBLFdBQVcsRUFBRTtBQUEzQixTQUFqQjtBQUNBbkUsUUFBQUEsTUFBTSxDQUFDcEQsT0FBUCxDQUFlLE9BQWY7QUFDQTRFLFFBQUFBLElBQUksQ0FBQzhJLFdBQUw7QUFDSCxPQUpTLEVBSVAsRUFKTyxDQUFWO0FBS0gsS0EvQkQ7QUFnQ0gsR0E1RXVCOztBQThFeEI7QUFDSjtBQUNBO0FBQ0lKLEVBQUFBLHFCQWpGd0IsbUNBaUZBO0FBQ3BCO0FBQ0EsUUFBSWhPLG1CQUFtQixDQUFDNE4sTUFBcEIsQ0FBMkJsSyxJQUEzQixDQUFnQyxVQUFoQyxDQUFKLEVBQWlEO0FBQzdDMUQsTUFBQUEsbUJBQW1CLENBQUM0TixNQUFwQixDQUEyQm1CLGNBQTNCO0FBQ0gsS0FKbUIsQ0FNcEI7OztBQUNBL08sSUFBQUEsbUJBQW1CLENBQUM0TixNQUFwQixDQUEyQm9CLFFBQTNCLENBQW9DO0FBQ2hDQyxNQUFBQSxNQUFNLEVBQUUsa0JBQU07QUFDVmpQLFFBQUFBLG1CQUFtQixDQUFDbU8sZ0JBQXBCO0FBQ0E3SSxRQUFBQSxJQUFJLENBQUM4SSxXQUFMO0FBQ0gsT0FKK0I7QUFLaENjLE1BQUFBLFVBQVUsRUFBRTtBQUxvQixLQUFwQztBQU9ILEdBL0Z1Qjs7QUFpR3hCO0FBQ0o7QUFDQTtBQUNJckcsRUFBQUEsZ0JBcEd3Qiw4QkFvR0w7QUFDZjtBQUNBLFFBQU1zRyxjQUFjLEdBQUd0UixDQUFDLENBQUMsNkJBQUQsQ0FBRCxDQUFpQ3VSLEdBQWpDLENBQXFDLGdCQUFyQyxFQUF1RGxPLE1BQTlFOztBQUNBLFFBQUlpTyxjQUFjLEdBQUcsQ0FBckIsRUFBd0I7QUFDcEJuUCxNQUFBQSxtQkFBbUIsQ0FBQzZOLFFBQXBCLENBQTZCbkUsSUFBN0I7QUFDSCxLQUZELE1BRU87QUFDSDFKLE1BQUFBLG1CQUFtQixDQUFDNk4sUUFBcEIsQ0FBNkJwRSxJQUE3QjtBQUNIO0FBQ0osR0E1R3VCOztBQThHeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSTZFLEVBQUFBLFNBbEh3QixxQkFrSGRELFVBbEhjLEVBa0hGO0FBQ2xCLFFBQU1nQixPQUFPLEdBQUdoQixVQUFVLENBQUNuTSxJQUFYLENBQWdCLGVBQWhCLENBQWhCO0FBQ0EsUUFBTW9OLGdCQUFnQiwwQkFBbUJELE9BQW5CLENBQXRCO0FBQ0EsUUFBTUUsbUJBQW1CLDZCQUFzQkYsT0FBdEIsQ0FBekIsQ0FIa0IsQ0FLbEI7O0FBQ0EsUUFBTUcsU0FBUyxHQUFHO0FBQ2RDLE1BQUFBLE9BQU8sRUFBRXBCLFVBQVUsQ0FBQ3hLLElBQVgsQ0FBZ0IsZ0JBQWhCLEVBQWtDcEIsR0FBbEMsRUFESztBQUVkNkYsTUFBQUEsTUFBTSxFQUFFekssQ0FBQyxZQUFLeVIsZ0JBQUwsRUFBRCxDQUEwQjdNLEdBQTFCLEVBRk07QUFHZG1KLE1BQUFBLE9BQU8sRUFBRXlDLFVBQVUsQ0FBQ3hLLElBQVgsQ0FBZ0IsZ0JBQWhCLEVBQWtDcEIsR0FBbEMsRUFISztBQUlkLG1CQUFXNUUsQ0FBQyxZQUFLMFIsbUJBQUwsRUFBRCxDQUE2QjlNLEdBQTdCLE1BQXNDLEVBSm5DO0FBS2RpTixNQUFBQSxXQUFXLEVBQUVyQixVQUFVLENBQUN4SyxJQUFYLENBQWdCLG9CQUFoQixFQUFzQ3BCLEdBQXRDO0FBTEMsS0FBbEIsQ0FOa0IsQ0FjbEI7O0FBQ0F6QyxJQUFBQSxtQkFBbUIsQ0FBQ2lPLFFBQXBCLENBQTZCdUIsU0FBN0IsRUFma0IsQ0FpQmxCOztBQUNBeFAsSUFBQUEsbUJBQW1CLENBQUNnTyxxQkFBcEI7QUFDSCxHQXJJdUI7O0FBdUl4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQTNJd0Isc0JBMklHO0FBQUEsUUFBbEJ1QixTQUFrQix1RUFBTixJQUFNO0FBQ3ZCLFFBQU1HLFNBQVMsR0FBRzlSLENBQUMsQ0FBQyxxQkFBRCxDQUFELENBQXlCK1IsSUFBekIsRUFBbEI7QUFDQSxRQUFNQyxPQUFPLEdBQUdGLFNBQVMsQ0FBQ0csS0FBVixDQUFnQixJQUFoQixDQUFoQjtBQUNBLFFBQU1ULE9BQU8sR0FBRyxDQUFBRyxTQUFTLFNBQVQsSUFBQUEsU0FBUyxXQUFULFlBQUFBLFNBQVMsQ0FBRTNJLEVBQVgsbUJBQXdCa0osSUFBSSxDQUFDQyxHQUFMLEVBQXhCLENBQWhCO0FBRUFILElBQUFBLE9BQU8sQ0FDRjNQLFdBREwsQ0FDaUIsb0JBRGpCLEVBRUtULFFBRkwsQ0FFYyxXQUZkLEVBR0t5QyxJQUhMLENBR1UsZUFIVixFQUcyQm1OLE9BSDNCLEVBSUszRixJQUpMLEdBTHVCLENBV3ZCOztBQUNBLFFBQUk4RixTQUFKLEVBQWU7QUFDWEssTUFBQUEsT0FBTyxDQUFDaE0sSUFBUixDQUFhLGdCQUFiLEVBQStCcEIsR0FBL0IsQ0FBbUMrTSxTQUFTLENBQUNDLE9BQTdDO0FBQ0FJLE1BQUFBLE9BQU8sQ0FBQ2hNLElBQVIsQ0FBYSxnQkFBYixFQUErQnBCLEdBQS9CLENBQW1DK00sU0FBUyxDQUFDNUQsT0FBN0M7QUFDQWlFLE1BQUFBLE9BQU8sQ0FBQ2hNLElBQVIsQ0FBYSxvQkFBYixFQUFtQ3BCLEdBQW5DLENBQXVDK00sU0FBUyxDQUFDRSxXQUFWLElBQXlCLEVBQWhFO0FBQ0gsS0FoQnNCLENBa0J2Qjs7O0FBQ0EsUUFBTU8sYUFBYSxHQUFHcFMsQ0FBQyxDQUFDLFlBQUQsQ0FBdkI7O0FBQ0EsUUFBSW9TLGFBQWEsQ0FBQy9PLE1BQWQsS0FBeUIsQ0FBN0IsRUFBZ0M7QUFDNUJ5TyxNQUFBQSxTQUFTLENBQUNPLEtBQVYsQ0FBZ0JMLE9BQWhCO0FBQ0gsS0FGRCxNQUVPO0FBQ0hJLE1BQUFBLGFBQWEsQ0FBQ0wsSUFBZCxHQUFxQk0sS0FBckIsQ0FBMkJMLE9BQTNCO0FBQ0gsS0F4QnNCLENBMEJ2Qjs7O0FBQ0E3UCxJQUFBQSxtQkFBbUIsQ0FBQ21RLHdCQUFwQixDQUE2Q04sT0FBN0MsRUFBc0QsQ0FBQUwsU0FBUyxTQUFULElBQUFBLFNBQVMsV0FBVCxZQUFBQSxTQUFTLENBQUVsSCxNQUFYLEtBQXFCLElBQTNFLEVBM0J1QixDQTZCdkI7O0FBQ0F0SSxJQUFBQSxtQkFBbUIsQ0FBQ29RLDJCQUFwQixDQUFnRFAsT0FBaEQsRUFBeUQsQ0FBQUwsU0FBUyxTQUFULElBQUFBLFNBQVMsV0FBVCxZQUFBQSxTQUFTLGFBQVQsS0FBd0IsRUFBakYsRUE5QnVCLENBZ0N2Qjs7QUFDQUssSUFBQUEsT0FBTyxDQUFDaE0sSUFBUixDQUFhLFlBQWIsRUFBMkJoRSxTQUEzQixDQUFxQztBQUFDQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjbUksTUFBQUEsV0FBVyxFQUFFO0FBQTNCLEtBQXJDO0FBRUFqSSxJQUFBQSxtQkFBbUIsQ0FBQ21PLGdCQUFwQjtBQUNBN0ksSUFBQUEsSUFBSSxDQUFDOEksV0FBTDtBQUNILEdBaEx1Qjs7QUFrTHhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSStCLEVBQUFBLHdCQXZMd0Isb0NBdUxDRSxJQXZMRCxFQXVMT0MsYUF2TFAsRUF1THNCO0FBQzFDLFFBQU1DLFVBQVUsR0FBR0YsSUFBSSxDQUFDeE0sSUFBTCxDQUFVLDRCQUFWLENBQW5CO0FBQ0EsUUFBTTJNLFVBQVUsMEJBQW1CSCxJQUFJLENBQUNuTyxJQUFMLENBQVUsZUFBVixDQUFuQixDQUFoQjtBQUVBcU8sSUFBQUEsVUFBVSxDQUFDbFAsSUFBWCx1Q0FBNENtUCxVQUE1QztBQUVBM0ksSUFBQUEsc0JBQXNCLENBQUNDLGFBQXZCLENBQXFDMEksVUFBckMsc0JBQ09BLFVBRFAsRUFDb0JGLGFBRHBCLEdBRUk7QUFDSXRJLE1BQUFBLGFBQWEsRUFBRXJLLFFBQVEsQ0FBQzRLLHFCQUFULEVBRG5CO0FBRUlOLE1BQUFBLFdBQVcsRUFBRXZKLGVBQWUsQ0FBQzhKLG9CQUZqQztBQUdJTCxNQUFBQSxVQUFVLEVBQUUsS0FIaEI7QUFJSU0sTUFBQUEsaUJBQWlCLEVBQUUsQ0FBQyxRQUFELENBSnZCO0FBS0l0SixNQUFBQSxRQUFRLEVBQUU7QUFBQSxlQUFNbUcsSUFBSSxDQUFDOEksV0FBTCxFQUFOO0FBQUE7QUFMZCxLQUZKO0FBVUgsR0F2TXVCOztBQXlNeEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJZ0MsRUFBQUEsMkJBOU13Qix1Q0E4TUlDLElBOU1KLEVBOE1VQyxhQTlNVixFQThNeUI7QUFDN0MsUUFBTUMsVUFBVSxHQUFHRixJQUFJLENBQUN4TSxJQUFMLENBQVUsK0JBQVYsQ0FBbkI7QUFDQSxRQUFNMk0sVUFBVSw2QkFBc0JILElBQUksQ0FBQ25PLElBQUwsQ0FBVSxlQUFWLENBQXRCLENBQWhCO0FBRUFxTyxJQUFBQSxVQUFVLENBQUNsUCxJQUFYLHVDQUE0Q21QLFVBQTVDLFlBSjZDLENBTTdDOztBQUNBLFFBQU1DLE9BQU8sSUFDVDtBQUFFek0sTUFBQUEsS0FBSyxFQUFFLEVBQVQ7QUFBYXJDLE1BQUFBLElBQUksRUFBRWpELGVBQWUsQ0FBQ2dTLE9BQWhCLElBQTJCO0FBQTlDLEtBRFMsNEJBRU4xUSxtQkFBbUIsQ0FBQ3NNLG1CQUFwQixDQUF3Q3FFLEdBQXhDLENBQTRDLFVBQUFoSyxLQUFLO0FBQUEsYUFBSztBQUNyRDNDLFFBQUFBLEtBQUssRUFBRTJDLEtBQUssQ0FBQzNDLEtBRHdDO0FBRXJEckMsUUFBQUEsSUFBSSxFQUFFZ0YsS0FBSyxDQUFDaUs7QUFGeUMsT0FBTDtBQUFBLEtBQWpELENBRk0sRUFBYixDQVA2QyxDQWU3Qzs7QUFDQSxRQUFNdkksUUFBUSxHQUFHLEVBQWpCO0FBQ0FBLElBQUFBLFFBQVEsQ0FBQ21JLFVBQUQsQ0FBUixHQUF1QkYsYUFBYSxJQUFJLEVBQXhDLENBakI2QyxDQWlCRDs7QUFFNUN6SSxJQUFBQSxzQkFBc0IsQ0FBQ0MsYUFBdkIsQ0FBcUMwSSxVQUFyQyxFQUNJbkksUUFESixFQUVJO0FBQ0lMLE1BQUFBLGFBQWEsRUFBRXlJLE9BRG5CO0FBRUl4SSxNQUFBQSxXQUFXLEVBQUV2SixlQUFlLENBQUN3SixrQkFGakM7QUFHSUMsTUFBQUEsVUFBVSxFQUFFLEtBSGhCO0FBSUloSixNQUFBQSxRQUFRLEVBQUU7QUFBQSxlQUFNbUcsSUFBSSxDQUFDOEksV0FBTCxFQUFOO0FBQUE7QUFKZCxLQUZKO0FBU0gsR0ExT3VCOztBQTRPeEI7QUFDSjtBQUNBO0FBQ0lELEVBQUFBLGdCQS9Pd0IsOEJBK09MO0FBQ2Z0USxJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCaUUsSUFBaEIsQ0FBcUIsVUFBQ0MsS0FBRCxFQUFROE8sR0FBUixFQUFnQjtBQUNqQ2hULE1BQUFBLENBQUMsQ0FBQ2dULEdBQUQsQ0FBRCxDQUFPM08sSUFBUCxDQUFZLGVBQVosRUFBNkJILEtBQUssR0FBRyxDQUFyQztBQUNILEtBRkQ7QUFHSCxHQW5QdUI7O0FBcVB4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJd0ssRUFBQUEsVUF6UHdCLHNCQXlQYnVFLFVBelBhLEVBeVBEO0FBQ25CO0FBQ0FqVCxJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCb0wsTUFBaEIsR0FGbUIsQ0FJbkI7O0FBQ0EsUUFBSTZILFVBQVUsSUFBSUEsVUFBVSxDQUFDNVAsTUFBWCxHQUFvQixDQUF0QyxFQUF5QztBQUNyQzRQLE1BQUFBLFVBQVUsQ0FBQzVMLE9BQVgsQ0FBbUIsVUFBQTZMLEtBQUssRUFBSTtBQUN4Qi9RLFFBQUFBLG1CQUFtQixDQUFDaU8sUUFBcEIsQ0FBNkI4QyxLQUE3QjtBQUNILE9BRkQ7QUFHSCxLQVRrQixDQVduQjs7O0FBQ0EvUSxJQUFBQSxtQkFBbUIsQ0FBQ2dPLHFCQUFwQjtBQUNILEdBdFF1Qjs7QUF3UXhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lwSyxFQUFBQSxhQTVRd0IsMkJBNFFSO0FBQ1osUUFBTW1LLE1BQU0sR0FBRyxFQUFmO0FBQ0FsUSxJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCaUUsSUFBaEIsQ0FBcUIsVUFBQ0MsS0FBRCxFQUFROE8sR0FBUixFQUFnQjtBQUNqQyxVQUFNUixJQUFJLEdBQUd4UyxDQUFDLENBQUNnVCxHQUFELENBQWQ7QUFDQSxVQUFNeEIsT0FBTyxHQUFHZ0IsSUFBSSxDQUFDbk8sSUFBTCxDQUFVLGVBQVYsQ0FBaEI7QUFDQSxVQUFNb04sZ0JBQWdCLDBCQUFtQkQsT0FBbkIsQ0FBdEI7QUFDQSxVQUFNRSxtQkFBbUIsNkJBQXNCRixPQUF0QixDQUF6QjtBQUVBdEIsTUFBQUEsTUFBTSxDQUFDUixJQUFQLENBQVk7QUFDUjFHLFFBQUFBLEVBQUUsRUFBRXdJLE9BQU8sQ0FBQzJCLFVBQVIsQ0FBbUIsTUFBbkIsSUFBNkIsSUFBN0IsR0FBb0MzQixPQURoQztBQUVSSSxRQUFBQSxPQUFPLEVBQUVZLElBQUksQ0FBQ3hNLElBQUwsQ0FBVSxnQkFBVixFQUE0QnBCLEdBQTVCLEVBRkQ7QUFHUjZGLFFBQUFBLE1BQU0sRUFBRXpLLENBQUMsWUFBS3lSLGdCQUFMLEVBQUQsQ0FBMEI3TSxHQUExQixFQUhBO0FBSVJtSixRQUFBQSxPQUFPLEVBQUV5RSxJQUFJLENBQUN4TSxJQUFMLENBQVUsZ0JBQVYsRUFBNEJwQixHQUE1QixFQUpEO0FBS1IscUJBQVc1RSxDQUFDLFlBQUswUixtQkFBTCxFQUFELENBQTZCOU0sR0FBN0IsTUFBc0MsRUFMekM7QUFNUmlOLFFBQUFBLFdBQVcsRUFBRVcsSUFBSSxDQUFDeE0sSUFBTCxDQUFVLG9CQUFWLEVBQWdDcEIsR0FBaEMsRUFOTDtBQU9Sd08sUUFBQUEsUUFBUSxFQUFFbFAsS0FBSyxHQUFHO0FBUFYsT0FBWjtBQVNILEtBZkQ7QUFnQkEsV0FBT2dNLE1BQVA7QUFDSDtBQS9SdUIsQ0FBNUI7QUFrU0E7QUFDQTtBQUNBOztBQUNBbFEsQ0FBQyxDQUFDcVQsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnhULEVBQUFBLFFBQVEsQ0FBQ3FCLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTeXNpbmZvQVBJLCBOZXR3b3JrQVBJLCBVc2VyTWVzc2FnZSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbmV0d29yayBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgbmV0d29ya3NcbiAqL1xuY29uc3QgbmV0d29ya3MgPSB7XG4gICAgJGdldE15SXBCdXR0b246ICQoJyNnZXRteWlwJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbmV0d29yay1mb3JtJyksXG5cbiAgICAkZHJvcERvd25zOiAkKCcjbmV0d29yay1mb3JtIC5kcm9wZG93bicpLFxuICAgICRleHRpcGFkZHI6ICQoJyNleHRpcGFkZHInKSxcbiAgICAkaXBhZGRyZXNzSW5wdXQ6ICQoJy5pcGFkZHJlc3MnKSxcbiAgICB2bGFuc0FycmF5OiB7fSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50cyB3aXRoIHdlIHNob3VsZCBoaWRlIGZyb20gdGhlIGZvcm0gZm9yIGRvY2tlciBpbnN0YWxsYXRpb24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm90U2hvd09uRG9ja2VyRGl2czogJCgnLmRvLW5vdC1zaG93LWlmLWRvY2tlcicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGlwYWRkcjoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcldpdGhQb3J0T3B0aW9uYWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRob3N0bmFtZToge1xuICAgICAgICAgICAgZGVwZW5kczogJ3VzZW5hdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndmFsaWRIb3N0bmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbmV0d29yayBzZXR0aW5ncyBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIExvYWQgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgICAgbmV0d29ya3MubG9hZENvbmZpZ3VyYXRpb24oKTtcblxuICAgICAgICAvLyBIYW5kbGVzIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlICd1c2VuYXQtY2hlY2tib3gnLlxuICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgbmV0d29ya3MuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIERIQ1AgY2hlY2tib3ggaGFuZGxlcnMgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG5cbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBTeXNpbmZvQVBJLmdldEV4dGVybmFsSXBJbmZvKG5ldHdvcmtzLmNiQWZ0ZXJHZXRFeHRlcm5hbElwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIHdpbGwgYmUgYm91bmQgYWZ0ZXIgdGFicyBhcmUgY3JlYXRlZCBkeW5hbWljYWxseVxuICAgICAgICBuZXR3b3Jrcy4kaXBhZGRyZXNzSW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgbmV0d29ya3MuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN0YXRpYyByb3V0ZXMgbWFuYWdlclxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBIaWRlIGZvcm0gZWxlbWVudHMgY29ubmVjdGVkIHdpdGggbm9uIGRvY2tlciBpbnN0YWxsYXRpb25zXG4gICAgICAgIC8vIFRFTVBPUkFSWTogQ29tbWVudGVkIG91dCBmb3IgbG9jYWwgRG9ja2VyIHRlc3RpbmdcbiAgICAgICAgLy8gaWYgKG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ2lzLWRvY2tlcicpPT09XCIxXCIpIHtcbiAgICAgICAgLy8gICAgIG5ldHdvcmtzLiRub3RTaG93T25Eb2NrZXJEaXZzLmhpZGUoKTtcbiAgICAgICAgLy8gfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBnZXR0aW5nIHRoZSBleHRlcm5hbCBJUCBmcm9tIGEgcmVtb3RlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXIuIElmIGZhbHNlLCBpbmRpY2F0ZXMgYW4gZXJyb3Igb2NjdXJyZWQuXG4gICAgICovXG4gICAgY2JBZnRlckdldEV4dGVybmFsSXAocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHRJcEFkZHIgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0aXBhZGRyJyk7XG4gICAgICAgICAgICBjb25zdCBwb3J0TWF0Y2ggPSBjdXJyZW50RXh0SXBBZGRyLm1hdGNoKC86KFxcZCspJC8pO1xuICAgICAgICAgICAgY29uc3QgcG9ydCA9IHBvcnRNYXRjaCA/ICc6JyArIHBvcnRNYXRjaFsxXSA6ICcnO1xuICAgICAgICAgICAgY29uc3QgbmV3RXh0SXBBZGRyID0gcmVzcG9uc2UuaXAgKyBwb3J0O1xuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIG5ld0V4dElwQWRkcik7XG4gICAgICAgICAgICAvLyBDbGVhciBleHRlcm5hbCBob3N0bmFtZSB3aGVuIGdldHRpbmcgZXh0ZXJuYWwgSVBcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRob3N0bmFtZScsICcnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBOQVQgaGVscCB0ZXh0IHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcG9ydHMgLSBQb3J0IGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZyb20gQVBJXG4gICAgICovXG4gICAgdXBkYXRlTkFUSGVscFRleHQocG9ydHMpIHtcbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgd2UgaGF2ZSBwb3J0IHZhbHVlcyBmcm9tIHNlcnZlclxuICAgICAgICBpZiAoIXBvcnRzLlNJUF9QT1JUIHx8ICFwb3J0cy5UTFNfUE9SVCB8fCAhcG9ydHMuUlRQX1BPUlRfRlJPTSB8fCAhcG9ydHMuUlRQX1BPUlRfVE8pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBTSVAgcG9ydHMgdGV4dCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkc2lwUG9ydFZhbHVlcyA9ICQoJyNuYXQtaGVscC1zaXAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkc2lwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBUZXh0ID0gaTE4bignbndfTkFUSW5mbzMnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQX1BPUlQsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNpcFBvcnRWYWx1ZXMuaHRtbChzaXBUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBSVFAgcG9ydHMgdGV4dCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkcnRwUG9ydFZhbHVlcyA9ICQoJyNuYXQtaGVscC1ydHAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkcnRwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBydHBUZXh0ID0gaTE4bignbndfTkFUSW5mbzQnLCB7XG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX0ZST00nOiBwb3J0cy5SVFBfUE9SVF9GUk9NLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6IHBvcnRzLlJUUF9QT1JUX1RPXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRydHBQb3J0VmFsdWVzLmh0bWwocnRwVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBvcnQgZmllbGQgbGFiZWxzIHdpdGggYWN0dWFsIGludGVybmFsIHBvcnQgdmFsdWVzIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcG9ydHMgLSBQb3J0IGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZyb20gQVBJXG4gICAgICovXG4gICAgdXBkYXRlUG9ydExhYmVscyhwb3J0cykge1xuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQX1BPUlQgfHwgIXBvcnRzLlRMU19QT1JUKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZXJuYWwgU0lQIHBvcnQgbGFiZWwgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHNpcExhYmVsID0gJCgnI2V4dGVybmFsLXNpcC1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkc2lwTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2lwTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljU0lQUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwTGFiZWwudGV4dChzaXBMYWJlbFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGV4dGVybmFsIFRMUyBwb3J0IGxhYmVsIHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICR0bHNMYWJlbCA9ICQoJyNleHRlcm5hbC10bHMtcG9ydC1sYWJlbCcpO1xuICAgICAgICBpZiAoJHRsc0xhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHRsc0xhYmVsVGV4dCA9IGkxOG4oJ253X1B1YmxpY1RMU1BvcnQnLCB7XG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHRsc0xhYmVsLnRleHQodGxzTGFiZWxUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSAnZGlzYWJsZWQnIGNsYXNzIGZvciBzcGVjaWZpYyBmaWVsZHMgYmFzZWQgb24gdGhlaXIgY2hlY2tib3ggc3RhdGUuXG4gICAgICovXG4gICAgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXRoID0gJChvYmopLmF0dHIoJ2RhdGEtdGFiJyk7XG4gICAgICAgICAgICBjb25zdCAkZGhjcENoZWNrYm94ID0gJChgI2RoY3AtJHtldGh9LWNoZWNrYm94YCk7XG4gICAgICAgICAgICBjb25zdCBpc0RoY3BFbmFibGVkID0gJGRoY3BDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgICAgICAvLyBGaW5kIElQIGFkZHJlc3MgYW5kIHN1Ym5ldCBmaWVsZHNcbiAgICAgICAgICAgIGNvbnN0ICRpcEZpZWxkID0gJChgaW5wdXRbbmFtZT1cImlwYWRkcl8ke2V0aH1cIl1gKTtcbiAgICAgICAgICAgIC8vIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgY3JlYXRlcyBkcm9wZG93biB3aXRoIGlkIHBhdHRlcm46IGZpZWxkTmFtZS1kcm9wZG93blxuICAgICAgICAgICAgY29uc3QgJHN1Ym5ldERyb3Bkb3duID0gJChgI3N1Ym5ldF8ke2V0aH0tZHJvcGRvd25gKTtcblxuICAgICAgICAgICAgaWYgKGlzRGhjcEVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGVuYWJsZWQgLT4gbWFrZSBJUC9zdWJuZXQgcmVhZC1vbmx5IGFuZCBhZGQgZGlzYWJsZWQgY2xhc3NcbiAgICAgICAgICAgICAgICAkaXBGaWVsZC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICRpcEZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRzdWJuZXREcm9wZG93bi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKGAjbm90LWRoY3AtJHtldGh9YCkudmFsKCcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBkaXNhYmxlZCAtPiBtYWtlIElQL3N1Ym5ldCBlZGl0YWJsZVxuICAgICAgICAgICAgICAgICRpcEZpZWxkLnByb3AoJ3JlYWRvbmx5JywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICRpcEZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRzdWJuZXREcm9wZG93bi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKGAjbm90LWRoY3AtJHtldGh9YCkudmFsKCcxJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5ldHdvcmtzLmFkZE5ld0Zvcm1SdWxlcyhldGgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICQoJy5uYXRlZC1zZXR0aW5ncy1ncm91cCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBuZXcgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciBhIHNwZWNpZmljIHJvdyBpbiB0aGUgbmV0d29yayBjb25maWd1cmF0aW9uIGZvcm0uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld1Jvd0lkIC0gVGhlIElEIG9mIHRoZSBuZXcgcm93IHRvIGFkZCB0aGUgZm9ybSBydWxlcyBmb3IuXG4gICAgICovXG4gICAgYWRkTmV3Rm9ybVJ1bGVzKG5ld1Jvd0lkKSB7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICduYW1lJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCBuYW1lQ2xhc3MgPSBgbmFtZV8ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAnbmFtZScgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tuYW1lQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogbmFtZUNsYXNzLFxuICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IHZsYW5DbGFzcyA9IGB2bGFuaWRfJHtuZXdSb3dJZH1gO1xuXG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAndmxhbmlkJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW3ZsYW5DbGFzc10gPSB7XG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IHZsYW5DbGFzcyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclswLi40MDk1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlVmxhblJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBgY2hlY2tWbGFuWyR7bmV3Um93SWR9XWAsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlVmxhbkNyb3NzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IGlwYWRkckNsYXNzID0gYGlwYWRkcl8ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAnaXBhZGRyJyBmaWVsZFxuICAgICAgICAvLyBGb3IgdGVtcGxhdGUgaW50ZXJmYWNlIChpZD0wKSwgYWRkIGRlcGVuZGVuY3kgb24gaW50ZXJmYWNlIHNlbGVjdGlvblxuICAgICAgICBpZiAobmV3Um93SWQgPT09IDAgfHwgbmV3Um93SWQgPT09ICcwJykge1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsICAvLyBUZW1wbGF0ZTogdmFsaWRhdGUgb25seSBpZiBpbnRlcmZhY2UgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbaXBhZGRyQ2xhc3NdID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlwYWRkckNsYXNzLFxuICAgICAgICAgICAgICAgIGRlcGVuZHM6IGBub3RkaGNwXyR7bmV3Um93SWR9YCwgIC8vIFJlYWwgaW50ZXJmYWNlOiB2YWxpZGF0ZSBvbmx5IGlmIERIQ1AgaXMgT0ZGXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBESENQIHZhbGlkYXRpb24gcmVtb3ZlZCAtIERIQ1AgY2hlY2tib3ggaXMgZGlzYWJsZWQgZm9yIFZMQU4gaW50ZXJmYWNlc1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IG9iamVjdCB3aXRoIGFsbCBzZXR0aW5ncyBwcm9wZXJ0aWVzXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHNldHRpbmdzKTtcbiAgICAgICAgcmVzdWx0LmRhdGEgPSB7fTtcblxuICAgICAgICAvLyBDb2xsZWN0IHN0YXRpYyByb3V0ZXNcbiAgICAgICAgcmVzdWx0LmRhdGEuc3RhdGljUm91dGVzID0gU3RhdGljUm91dGVzTWFuYWdlci5jb2xsZWN0Um91dGVzKCk7XG5cbiAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBmb3JtIHZhbHVlcyB0byBhdm9pZCBhbnkgRE9NLXJlbGF0ZWQgaXNzdWVzXG4gICAgICAgIC8vIENvbGxlY3QgYWxsIHJlZ3VsYXIgaW5wdXQgZmllbGRzXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W3R5cGU9XCJ0ZXh0XCJdLCBpbnB1dFt0eXBlPVwiaGlkZGVuXCJdLCBpbnB1dFt0eXBlPVwibnVtYmVyXCJdLCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJGlucHV0LnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGdldCBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbbmFtZV0gPSAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkgPyBTdHJpbmcodmFsdWUpIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc2VsZWN0IGRyb3Bkb3duc1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdzZWxlY3QnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHNlbGVjdCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gJHNlbGVjdC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJHNlbGVjdC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuXG4gICAgICAgIC8vIFBieEFwaUNsaWVudCB3aWxsIGhhbmRsZSBjb252ZXJzaW9uIHRvIHN0cmluZ3MgZm9yIGpRdWVyeVxuICAgICAgICByZXN1bHQuZGF0YS51c2VuYXQgPSAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAvLyBVc2UgY29ycmVjdCBmaWVsZCBuYW1lIGZyb20gdGhlIGZvcm0gKGF1dG9VcGRhdGVFeHRlcm5hbElwLCBub3QgQVVUT19VUERBVEVfRVhURVJOQUxfSVApXG4gICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlRGl2ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgaWYgKCRhdXRvVXBkYXRlRGl2Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1dG9VcGRhdGVFeHRlcm5hbElwID0gJGF1dG9VcGRhdGVEaXYuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1dG9VcGRhdGVFeHRlcm5hbElwID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb252ZXJ0IERIQ1AgY2hlY2tib3hlcyB0byBib29sZWFuIGZvciBlYWNoIGludGVyZmFjZVxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCcuZGhjcC1jaGVja2JveCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlucHV0SWQgPSAkKG9iaikuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHJvd0lkID0gaW5wdXRJZC5yZXBsYWNlKCdkaGNwLScsICcnKS5yZXBsYWNlKCctY2hlY2tib3gnLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIEZvciBkaXNhYmxlZCBjaGVja2JveGVzLCByZWFkIGFjdHVhbCBpbnB1dCBzdGF0ZSBpbnN0ZWFkIG9mIEZvbWFudGljIFVJIEFQSVxuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJChvYmopO1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJGNoZWNrYm94LmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpO1xuICAgICAgICAgICAgY29uc3QgaXNEaXNhYmxlZCA9ICRjaGVja2JveC5oYXNDbGFzcygnZGlzYWJsZWQnKSB8fCAkaW5wdXQucHJvcCgnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgaWYgKGlzRGlzYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZGlzYWJsZWQgY2hlY2tib3hlcywgcmVhZCB0aGUgYWN0dWFsIGlucHV0IGNoZWNrZWQgc3RhdGVcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtgZGhjcF8ke3Jvd0lkfWBdID0gJGlucHV0LnByb3AoJ2NoZWNrZWQnKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIGVuYWJsZWQgY2hlY2tib3hlcywgdXNlIEZvbWFudGljIFVJIEFQSVxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2BkaGNwXyR7cm93SWR9YF0gPSAkY2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBpbnRlcm5ldCByYWRpbyBidXR0b25cbiAgICAgICAgY29uc3QgJGNoZWNrZWRSYWRpbyA9ICQoJ2lucHV0W25hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIl06Y2hlY2tlZCcpO1xuICAgICAgICBpZiAoJGNoZWNrZWRSYWRpby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pbnRlcm5ldF9pbnRlcmZhY2UgPSBTdHJpbmcoJGNoZWNrZWRSYWRpby52YWwoKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXAgZm9ybSBmaWVsZCBuYW1lcyB0byBBUEkgZmllbGQgbmFtZXMgZm9yIHBvcnRzXG4gICAgICAgIGNvbnN0IHBvcnRGaWVsZE1hcHBpbmcgPSB7XG4gICAgICAgICAgICAnZXh0ZXJuYWxTSVBQb3J0JzogJ0VYVEVSTkFMX1NJUF9QT1JUJyxcbiAgICAgICAgICAgICdleHRlcm5hbFRMU1BvcnQnOiAnRVhURVJOQUxfVExTX1BPUlQnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXBwbHkgcG9ydCBmaWVsZCBtYXBwaW5nXG4gICAgICAgIE9iamVjdC5rZXlzKHBvcnRGaWVsZE1hcHBpbmcpLmZvckVhY2goZm9ybUZpZWxkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFwaUZpZWxkID0gcG9ydEZpZWxkTWFwcGluZ1tmb3JtRmllbGRdO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2FwaUZpZWxkXSA9IHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGVkIGJ5IEZvcm1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbmV0d29ya3MuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbmV0d29ya3MuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbmxpbmUgPSB0cnVlOyAvLyBTaG93IGlubGluZSBlcnJvcnMgbmV4dCB0byBmaWVsZHNcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBOZXR3b3JrQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZUNvbmZpZyc7XG5cbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL21vZGlmeS9gO1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG5ldHdvcmsgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQ29uZmlndXJhdGlvbigpIHtcbiAgICAgICAgTmV0d29ya0FQSS5nZXRDb25maWcoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGFmdGVyIGxvYWRpbmcgZGF0YVxuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBmb3JtIGVsZW1lbnRzIGNvbm5lY3RlZCB3aXRoIG5vbiBkb2NrZXIgaW5zdGFsbGF0aW9uc1xuICAgICAgICAgICAgICAgIC8vIFRFTVBPUkFSWTogQ29tbWVudGVkIG91dCBmb3IgbG9jYWwgRG9ja2VyIHRlc3RpbmdcbiAgICAgICAgICAgICAgICAvLyBpZiAocmVzcG9uc2UuZGF0YS5pc0RvY2tlcikge1xuICAgICAgICAgICAgICAgIC8vICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaXMtZG9ja2VyJywgJzEnKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBpbnRlcmZhY2UgdGFicyBhbmQgZm9ybXMgZHluYW1pY2FsbHkgZnJvbSBSRVNUIEFQSSBkYXRhXG4gICAgICovXG4gICAgY3JlYXRlSW50ZXJmYWNlVGFicyhkYXRhKSB7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUnKTtcbiAgICAgICAgY29uc3QgJGNvbnRlbnQgPSAkKCcjZXRoLWludGVyZmFjZXMtY29udGVudCcpO1xuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnRcbiAgICAgICAgJG1lbnUuZW1wdHkoKTtcbiAgICAgICAgJGNvbnRlbnQuZW1wdHkoKTtcblxuICAgICAgICAvLyBDcmVhdGUgdGFicyBmb3IgZXhpc3RpbmcgaW50ZXJmYWNlc1xuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaCgoaWZhY2UsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YWJJZCA9IGlmYWNlLmlkO1xuICAgICAgICAgICAgY29uc3QgdGFiTGFiZWwgPSBgJHtpZmFjZS5uYW1lIHx8IGlmYWNlLmludGVyZmFjZX0gKCR7aWZhY2UuaW50ZXJmYWNlfSR7aWZhY2UudmxhbmlkICE9PSAnMCcgJiYgaWZhY2UudmxhbmlkICE9PSAwID8gYC4ke2lmYWNlLnZsYW5pZH1gIDogJyd9KWA7XG4gICAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IGluZGV4ID09PSAwO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW0gJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICAke3RhYkxhYmVsfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIGNvbnRlbnRcbiAgICAgICAgICAgIC8vIE9ubHkgVkxBTiBpbnRlcmZhY2VzIGNhbiBiZSBkZWxldGVkICh2bGFuaWQgPiAwKVxuICAgICAgICAgICAgY29uc3QgY2FuRGVsZXRlID0gcGFyc2VJbnQoaWZhY2UudmxhbmlkLCAxMCkgPiAwO1xuICAgICAgICAgICAgY29uc3QgZGVsZXRlQnV0dG9uID0gY2FuRGVsZXRlID8gYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwidWkgaWNvbiBsZWZ0IGxhYmVsZWQgYnV0dG9uIGRlbGV0ZS1pbnRlcmZhY2VcIiBkYXRhLXZhbHVlPVwiJHt0YWJJZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RlbGV0ZUN1cnJlbnRJbnRlcmZhY2V9XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCA6ICcnO1xuXG4gICAgICAgICAgICAkY29udGVudC5hcHBlbmQobmV0d29ya3MuY3JlYXRlSW50ZXJmYWNlRm9ybShpZmFjZSwgaXNBY3RpdmUsIGRlbGV0ZUJ1dHRvbikpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgdGVtcGxhdGUgdGFiIGZvciBuZXcgVkxBTlxuICAgICAgICBpZiAoZGF0YS50ZW1wbGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkYXRhLnRlbXBsYXRlO1xuICAgICAgICAgICAgdGVtcGxhdGUuaWQgPSAwO1xuXG4gICAgICAgICAgICAvLyBBZGQgXCIrXCIgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW1cIiBkYXRhLXRhYj1cIjBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHBsdXNcIj48L2k+XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSBmb3JtIHdpdGggaW50ZXJmYWNlIHNlbGVjdG9yXG4gICAgICAgICAgICAkY29udGVudC5hcHBlbmQobmV0d29ya3MuY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBkYXRhLmludGVyZmFjZXMpKTtcblxuICAgICAgICAgICAgLy8gQnVpbGQgaW50ZXJmYWNlIHNlbGVjdG9yIGRyb3Bkb3duIGZvciB0ZW1wbGF0ZVxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VzID0ge307XG4gICAgICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaChpZmFjZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFwaHlzaWNhbEludGVyZmFjZXNbaWZhY2UuaW50ZXJmYWNlXSkge1xuICAgICAgICAgICAgICAgICAgICBwaHlzaWNhbEludGVyZmFjZXNbaWZhY2UuaW50ZXJmYWNlXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpZmFjZS5pZC50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogaWZhY2UuaW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogaWZhY2UuaW50ZXJmYWNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyA9IE9iamVjdC52YWx1ZXMocGh5c2ljYWxJbnRlcmZhY2VzKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdpbnRlcmZhY2VfMCcsIHsgaW50ZXJmYWNlXzA6ICcnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93bnMgdXNpbmcgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaCgoaWZhY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGBzdWJuZXRfJHtpZmFjZS5pZH1gO1xuICAgICAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7fTtcbiAgICAgICAgICAgIC8vIENvbnZlcnQgc3VibmV0IHRvIHN0cmluZyBmb3IgZHJvcGRvd24gbWF0Y2hpbmdcbiAgICAgICAgICAgIGZvcm1EYXRhW2ZpZWxkTmFtZV0gPSBTdHJpbmcoaWZhY2Uuc3VibmV0IHx8ICcyNCcpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBmb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10gIC8vIEFkZCBzZWFyY2ggY2xhc3MgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgdGVtcGxhdGUgKGlkID0gMClcbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUpIHtcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc3VibmV0XzAnLCB7IHN1Ym5ldF8wOiAnMjQnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddICAvLyBBZGQgc2VhcmNoIGNsYXNzIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLnRhYigpO1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLmZpcnN0KCkudHJpZ2dlcignY2xpY2snKTtcblxuICAgICAgICAvLyBVcGRhdGUgc3RhdGljIHJvdXRlcyBzZWN0aW9uIHZpc2liaWxpdHlcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVWaXNpYmlsaXR5KCk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gcmVtb3ZlcyBUQUIgZnJvbSBmb3JtIGFuZCBtYXJrcyBpbnRlcmZhY2UgYXMgZGlzYWJsZWRcbiAgICAgICAgLy8gQWN0dWFsIGRlbGV0aW9uIGhhcHBlbnMgb24gZm9ybSBzdWJtaXRcbiAgICAgICAgJCgnLmRlbGV0ZS1pbnRlcmZhY2UnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIFRBQiBtZW51IGl0ZW1cbiAgICAgICAgICAgICQoYCNldGgtaW50ZXJmYWNlcy1tZW51IGFbZGF0YS10YWI9XCIke2ludGVyZmFjZUlkfVwiXWApLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIFRBQiBjb250ZW50XG4gICAgICAgICAgICBjb25zdCAkdGFiQ29udGVudCA9ICQoYCNldGgtaW50ZXJmYWNlcy1jb250ZW50IC50YWJbZGF0YS10YWI9XCIke2ludGVyZmFjZUlkfVwiXWApO1xuICAgICAgICAgICAgJHRhYkNvbnRlbnQucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBoaWRkZW4gZmllbGQgdG8gbWFyayB0aGlzIGludGVyZmFjZSBhcyBkaXNhYmxlZFxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouYXBwZW5kKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaXNhYmxlZF8ke2ludGVyZmFjZUlkfVwiIHZhbHVlPVwiMVwiIC8+YCk7XG5cbiAgICAgICAgICAgIC8vIFN3aXRjaCB0byBmaXJzdCBhdmFpbGFibGUgdGFiXG4gICAgICAgICAgICBjb25zdCAkZmlyc3RUYWIgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5maXJzdCgpO1xuICAgICAgICAgICAgaWYgKCRmaXJzdFRhYi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGZpcnN0VGFiLnRhYignY2hhbmdlIHRhYicsICRmaXJzdFRhYi5hdHRyKCdkYXRhLXRhYicpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHN1Ym1pdCBidXR0b25cbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgREhDUCBjaGVja2JveCBoYW5kbGVyc1xuICAgICAgICAkKCcuZGhjcC1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBJUCBhZGRyZXNzIGlucHV0IG1hc2tzXG4gICAgICAgICQoJy5pcGFkZHJlc3MnKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICAvLyBBZGQgVkxBTiBJRCBjaGFuZ2UgaGFuZGxlcnMgdG8gY29udHJvbCBESENQIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwidmxhbmlkX1wiXScpLm9mZignaW5wdXQgY2hhbmdlJykub24oJ2lucHV0IGNoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHZsYW5JbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICR2bGFuSW5wdXQuYXR0cignbmFtZScpLnJlcGxhY2UoJ3ZsYW5pZF8nLCAnJyk7XG4gICAgICAgICAgICBjb25zdCB2bGFuVmFsdWUgPSBwYXJzZUludCgkdmxhbklucHV0LnZhbCgpLCAxMCkgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2ludGVyZmFjZUlkfS1jaGVja2JveGApO1xuXG4gICAgICAgICAgICBpZiAodmxhblZhbHVlID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIERpc2FibGUgREhDUCBjaGVja2JveCBmb3IgVkxBTiBpbnRlcmZhY2VzXG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgnc2V0IGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5maW5kKCdpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEVuYWJsZSBESENQIGNoZWNrYm94IGZvciBub24tVkxBTiBpbnRlcmZhY2VzXG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdzZXQgZW5hYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guZmluZCgnaW5wdXQnKS5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkaXNhYmxlZCBmaWVsZCBjbGFzc2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciB0aGUgaGFuZGxlciBmb3IgZXhpc3RpbmcgVkxBTiBpbnRlcmZhY2VzIHRvIGFwcGx5IGluaXRpYWwgc3RhdGVcbiAgICAgICAgJCgnaW5wdXRbbmFtZV49XCJ2bGFuaWRfXCJdJykudHJpZ2dlcignY2hhbmdlJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnRlcm5ldCByYWRpbyBidXR0b25zIHdpdGggRm9tYW50aWMgVUlcbiAgICAgICAgJCgnLmludGVybmV0LXJhZGlvJykuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBBZGQgaW50ZXJuZXQgcmFkaW8gYnV0dG9uIGNoYW5nZSBoYW5kbGVyXG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIl0nKS5vZmYoJ2NoYW5nZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkSW50ZXJmYWNlSWQgPSAkKHRoaXMpLnZhbCgpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIGFsbCBETlMvR2F0ZXdheSBncm91cHNcbiAgICAgICAgICAgICQoJ1tjbGFzc149XCJkbnMtZ2F0ZXdheS1ncm91cC1cIl0nKS5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgRE5TL0dhdGV3YXkgZ3JvdXAgZm9yIHNlbGVjdGVkIGludGVybmV0IGludGVyZmFjZVxuICAgICAgICAgICAgJChgLmRucy1nYXRld2F5LWdyb3VwLSR7c2VsZWN0ZWRJbnRlcmZhY2VJZH1gKS5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBUQUIgaWNvbnMgLSBhZGQgZ2xvYmUgaWNvbiB0byBzZWxlY3RlZCwgcmVtb3ZlIGZyb20gb3RoZXJzXG4gICAgICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIHRhYikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0YWIgPSAkKHRhYik7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFiSWQgPSAkdGFiLmF0dHIoJ2RhdGEtdGFiJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZXhpc3RpbmcgZ2xvYmUgaWNvblxuICAgICAgICAgICAgICAgICR0YWIuZmluZCgnLmdsb2JlLmljb24nKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBnbG9iZSBpY29uIHRvIHNlbGVjdGVkIGludGVybmV0IGludGVyZmFjZSBUQUJcbiAgICAgICAgICAgICAgICBpZiAodGFiSWQgPT09IHNlbGVjdGVkSW50ZXJmYWNlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRhYi5wcmVwZW5kKCc8aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGRhdGUgRE5TL0dhdGV3YXkgcmVhZG9ubHkgc3RhdGUgd2hlbiBESENQIGNoYW5nZXNcbiAgICAgICAgJCgnLmRoY3AtY2hlY2tib3gnKS5vZmYoJ2NoYW5nZS5kbnNnYXRld2F5Jykub24oJ2NoYW5nZS5kbnNnYXRld2F5JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkY2hlY2tib3guYXR0cignaWQnKS5yZXBsYWNlKCdkaGNwLScsICcnKS5yZXBsYWNlKCctY2hlY2tib3gnLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBpc0RoY3BFbmFibGVkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgICAgIC8vIEZpbmQgRE5TL0dhdGV3YXkgZmllbGRzIGZvciB0aGlzIGludGVyZmFjZVxuICAgICAgICAgICAgY29uc3QgJGRuc0dhdGV3YXlHcm91cCA9ICQoYC5kbnMtZ2F0ZXdheS1ncm91cC0ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICAgICAgY29uc3QgJGRuc0dhdGV3YXlGaWVsZHMgPSAkZG5zR2F0ZXdheUdyb3VwLmZpbmQoJ2lucHV0W25hbWVePVwiZ2F0ZXdheV9cIl0sIGlucHV0W25hbWVePVwicHJpbWFyeWRuc19cIl0sIGlucHV0W25hbWVePVwic2Vjb25kYXJ5ZG5zX1wiXScpO1xuXG4gICAgICAgICAgICBpZiAoaXNEaGNwRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZW5hYmxlZCAtPiBtYWtlIEROUy9HYXRld2F5IHJlYWQtb25seVxuICAgICAgICAgICAgICAgICRkbnNHYXRld2F5RmllbGRzLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZGlzYWJsZWQgLT4gbWFrZSBETlMvR2F0ZXdheSBlZGl0YWJsZVxuICAgICAgICAgICAgICAgICRkbnNHYXRld2F5RmllbGRzLnByb3AoJ3JlYWRvbmx5JywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICRkbnNHYXRld2F5RmllbGRzLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmlnZ2VyIGluaXRpYWwgVEFCIGljb24gdXBkYXRlIGZvciBjaGVja2VkIHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRjaGVja2VkUmFkaW8udHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSBpbml0aWFsIGRpc2FibGVkIHN0YXRlIGZvciBESENQLWVuYWJsZWQgaW50ZXJmYWNlc1xuICAgICAgICAvLyBDYWxsIGFmdGVyIGFsbCBkcm9wZG93bnMgYXJlIGNyZWF0ZWRcbiAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgLy8gUmUtc2F2ZSBpbml0aWFsIGZvcm0gdmFsdWVzIGFuZCByZS1iaW5kIGV2ZW50IGhhbmRsZXJzIGZvciBkeW5hbWljYWxseSBjcmVhdGVkIGlucHV0c1xuICAgICAgICAvLyBUaGlzIGlzIGVzc2VudGlhbCBmb3IgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHdvcmsgd2l0aCBkeW5hbWljIHRhYnNcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgLy8gT3ZlcnJpZGUgRm9ybSBtZXRob2RzIHRvIG1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyAoaW5jbHVkaW5nIGZyb20gdGFicylcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMgPSBGb3JtLnNhdmVJbml0aWFsVmFsdWVzO1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG5cbiAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdmFsdWVzIGZyb20gRm9tYW50aWMgVUkgKG1heSBtaXNzIGR5bmFtaWNhbGx5IGNyZWF0ZWQgdGFiIGZpZWxkcylcbiAgICAgICAgICAgICAgICBjb25zdCBmb21hbnRpY1ZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyB0byBjYXRjaCBmaWVsZHMgdGhhdCBGb21hbnRpYyBVSSBtaXNzZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aCAobWFudWFsIHZhbHVlcyBvdmVycmlkZSBGb21hbnRpYyB2YWx1ZXMgZm9yIGZpZWxkcyB0aGF0IGV4aXN0IGluIGJvdGgpXG4gICAgICAgICAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gT2JqZWN0LmFzc2lnbih7fSwgZm9tYW50aWNWYWx1ZXMsIG1hbnVhbFZhbHVlcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHZhbHVlcyBmcm9tIEZvbWFudGljIFVJXG4gICAgICAgICAgICAgICAgY29uc3QgZm9tYW50aWNWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aFxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmb21hbnRpY1ZhbHVlcywgbWFudWFsVmFsdWVzKTtcblxuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShGb3JtLm9sZEZvcm1WYWx1ZXMpID09PSBKU09OLnN0cmluZ2lmeShuZXdGb3JtVmFsdWVzKSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNhdmVJbml0aWFsVmFsdWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNldEV2ZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIEZvcm0uc2V0RXZlbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIGV4aXN0aW5nIGludGVyZmFjZVxuICAgICAqL1xuICAgIGNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24pIHtcbiAgICAgICAgY29uc3QgaWQgPSBpZmFjZS5pZDtcbiAgICAgICAgY29uc3QgaXNJbnRlcm5ldEludGVyZmFjZSA9IGlmYWNlLmludGVybmV0IHx8IGZhbHNlO1xuXG4gICAgICAgIC8vIEROUy9HYXRld2F5IGZpZWxkcyB2aXNpYmlsaXR5IGFuZCByZWFkLW9ubHkgc3RhdGVcbiAgICAgICAgY29uc3QgZG5zR2F0ZXdheVZpc2libGUgPSBpc0ludGVybmV0SW50ZXJmYWNlID8gJycgOiAnc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCInO1xuICAgICAgICBjb25zdCBkbnNHYXRld2F5UmVhZG9ubHkgPSBpZmFjZS5kaGNwID8gJ3JlYWRvbmx5JyA6ICcnO1xuICAgICAgICBjb25zdCBkbnNHYXRld2F5RGlzYWJsZWRDbGFzcyA9IGlmYWNlLmRoY3AgPyAnZGlzYWJsZWQnIDogJyc7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnQgJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pbnRlcmZhY2V9XCIgLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UubmFtZSB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBpbnRlcm5ldC1yYWRpb1wiIGlkPVwiaW50ZXJuZXQtJHtpZH0tcmFkaW9cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhZGlvXCIgbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiIHZhbHVlPVwiJHtpZH1cIiAke2lzSW50ZXJuZXRJbnRlcmZhY2UgPyAnY2hlY2tlZCcgOiAnJ30gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldEludGVyZmFjZSB8fCAnSW50ZXJuZXQgSW50ZXJmYWNlJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGRoY3AtY2hlY2tib3gke2lmYWNlLnZsYW5pZCA+IDAgPyAnIGRpc2FibGVkJyA6ICcnfVwiIGlkPVwiZGhjcC0ke2lkfS1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiZGhjcF8ke2lkfVwiICR7aWZhY2UudmxhbmlkID4gMCA/ICcnIDogKGlmYWNlLmRoY3AgPyAnY2hlY2tlZCcgOiAnJyl9ICR7aWZhY2UudmxhbmlkID4gMCA/ICdkaXNhYmxlZCcgOiAnJ30gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVXNlREhDUH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibm90ZGhjcF8ke2lkfVwiIGlkPVwibm90LWRoY3AtJHtpZH1cIi8+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRzXCIgaWQ9XCJpcC1hZGRyZXNzLWdyb3VwLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQQWRkcmVzc308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXBhZGRyIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X05ldHdvcmtNYXNrfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnN1Ym5ldCB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19WbGFuSUR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbmFtZT1cInZsYW5pZF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS52bGFuaWQgfHwgJzAnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRucy1nYXRld2F5LWdyb3VwLSR7aWR9XCIgJHtkbnNHYXRld2F5VmlzaWJsZX0+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBob3Jpem9udGFsIGRpdmlkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldFNldHRpbmdzIHx8ICdJbnRlcm5ldCBTZXR0aW5ncyd9PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfR2F0ZXdheX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDAgJHtkbnNHYXRld2F5RGlzYWJsZWRDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJnYXRld2F5XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmdhdGV3YXkgfHwgJyd9XCIgJHtkbnNHYXRld2F5UmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfUHJpbWFyeUROU308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDAgJHtkbnNHYXRld2F5RGlzYWJsZWRDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJwcmltYXJ5ZG5zXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnByaW1hcnlkbnMgfHwgJyd9XCIgJHtkbnNHYXRld2F5UmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfU2Vjb25kYXJ5RE5TfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMCAke2Ruc0dhdGV3YXlEaXNhYmxlZENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInNlY29uZGFyeWRuc18ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5zZWNvbmRhcnlkbnMgfHwgJyd9XCIgJHtkbnNHYXRld2F5UmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAke2RlbGV0ZUJ1dHRvbn1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZm9ybSBmb3IgbmV3IFZMQU4gdGVtcGxhdGVcbiAgICAgKi9cbiAgICBjcmVhdGVUZW1wbGF0ZUZvcm0odGVtcGxhdGUsIGludGVyZmFjZXMpIHtcbiAgICAgICAgY29uc3QgaWQgPSAwO1xuXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYm90dG9tIGF0dGFjaGVkIHRhYiBzZWdtZW50XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcmZhY2VfJHtpZH1cIiBpZD1cImludGVyZmFjZV8ke2lkfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcmZhY2VOYW1lfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibmFtZV8ke2lkfVwiIGlkPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggZGhjcC1jaGVja2JveFwiIGlkPVwiZGhjcC0ke2lkfS1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiZGhjcF8ke2lkfVwiIGNoZWNrZWQgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVXNlREhDUH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibm90ZGhjcF8ke2lkfVwiIGlkPVwibm90LWRoY3AtJHtpZH1cIi8+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRzXCIgaWQ9XCJpcC1hZGRyZXNzLWdyb3VwLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQQWRkcmVzc308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIlwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X05ldHdvcmtNYXNrfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIyNFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ZsYW5JRH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiBuYW1lPVwidmxhbmlkXyR7aWR9XCIgdmFsdWU9XCI0MDk1XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHN1Ym5ldCBtYXNrIG9wdGlvbnMgYXJyYXkgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHN1Ym5ldCBtYXNrIG9wdGlvbnNcbiAgICAgKi9cbiAgICBnZXRTdWJuZXRPcHRpb25zQXJyYXkoKSB7XG4gICAgICAgIC8vIE5ldHdvcmsgbWFza3MgZnJvbSBDaWRyOjpnZXROZXRNYXNrcygpIChrcnNvcnQgU09SVF9OVU1FUklDKVxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge3ZhbHVlOiAnMzInLCB0ZXh0OiAnMzIgLSAyNTUuMjU1LjI1NS4yNTUnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMxJywgdGV4dDogJzMxIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMCcsIHRleHQ6ICczMCAtIDI1NS4yNTUuMjU1LjI1Mid9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjknLCB0ZXh0OiAnMjkgLSAyNTUuMjU1LjI1NS4yNDgnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI4JywgdGV4dDogJzI4IC0gMjU1LjI1NS4yNTUuMjQwJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNycsIHRleHQ6ICcyNyAtIDI1NS4yNTUuMjU1LjIyNCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjYnLCB0ZXh0OiAnMjYgLSAyNTUuMjU1LjI1NS4xOTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI1JywgdGV4dDogJzI1IC0gMjU1LjI1NS4yNTUuMTI4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNCcsIHRleHQ6ICcyNCAtIDI1NS4yNTUuMjU1LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIzJywgdGV4dDogJzIzIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMicsIHRleHQ6ICcyMiAtIDI1NS4yNTUuMjUyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIxJywgdGV4dDogJzIxIC0gMjU1LjI1NS4yNDguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjAnLCB0ZXh0OiAnMjAgLSAyNTUuMjU1LjI0MC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOScsIHRleHQ6ICcxOSAtIDI1NS4yNTUuMjI0LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE4JywgdGV4dDogJzE4IC0gMjU1LjI1NS4xOTIuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTcnLCB0ZXh0OiAnMTcgLSAyNTUuMjU1LjEyOC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNicsIHRleHQ6ICcxNiAtIDI1NS4yNTUuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNScsIHRleHQ6ICcxNSAtIDI1NS4yNTQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNCcsIHRleHQ6ICcxNCAtIDI1NS4yNTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMycsIHRleHQ6ICcxMyAtIDI1NS4yNDguMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMicsIHRleHQ6ICcxMiAtIDI1NS4yNDAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMScsIHRleHQ6ICcxMSAtIDI1NS4yMjQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMCcsIHRleHQ6ICcxMCAtIDI1NS4xOTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc5JywgdGV4dDogJzkgLSAyNTUuMTI4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOCcsIHRleHQ6ICc4IC0gMjU1LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc3JywgdGV4dDogJzcgLSAyNTQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzYnLCB0ZXh0OiAnNiAtIDI1Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNScsIHRleHQ6ICc1IC0gMjQ4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc0JywgdGV4dDogJzQgLSAyNDAuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMnLCB0ZXh0OiAnMyAtIDIyNC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMicsIHRleHQ6ICcyIC0gMTkyLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogJzEgLSAxMjguMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiAnMCAtIDAuMC4wLjAnfSxcbiAgICAgICAgXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGNvbmZpZ3VyYXRpb24gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIENyZWF0ZSBpbnRlcmZhY2UgdGFicyBhbmQgZm9ybXMgZHluYW1pY2FsbHlcbiAgICAgICAgbmV0d29ya3MuY3JlYXRlSW50ZXJmYWNlVGFicyhkYXRhKTtcblxuICAgICAgICAvLyBTZXQgTkFUIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLm5hdCkge1xuICAgICAgICAgICAgLy8gQm9vbGVhbiB2YWx1ZXMgZnJvbSBBUElcbiAgICAgICAgICAgIGlmIChkYXRhLm5hdC51c2VuYXQpIHtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIGRhdGEubmF0LmV4dGlwYWRkciB8fCAnJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCBkYXRhLm5hdC5leHRob3N0bmFtZSB8fCAnJyk7XG5cbiAgICAgICAgICAgIC8vIGF1dG9VcGRhdGVFeHRlcm5hbElwIGJvb2xlYW4gKGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSlcbiAgICAgICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlQ2hlY2tib3ggPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRhdXRvVXBkYXRlQ2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLm5hdC5BVVRPX1VQREFURV9FWFRFUk5BTF9JUCB8fCBkYXRhLm5hdC5hdXRvVXBkYXRlRXh0ZXJuYWxJcCkge1xuICAgICAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgcG9ydCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5wb3J0cykge1xuICAgICAgICAgICAgLy8gTWFwIEFQSSBmaWVsZCBuYW1lcyB0byBmb3JtIGZpZWxkIG5hbWVzXG4gICAgICAgICAgICBjb25zdCBwb3J0RmllbGRNYXBwaW5nID0ge1xuICAgICAgICAgICAgICAgICdFWFRFUk5BTF9TSVBfUE9SVCc6ICdleHRlcm5hbFNJUFBvcnQnLFxuICAgICAgICAgICAgICAgICdFWFRFUk5BTF9UTFNfUE9SVCc6ICdleHRlcm5hbFRMU1BvcnQnLFxuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6ICdTSVBfUE9SVCcsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogJ1RMU19QT1JUJyxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6ICdSVFBfUE9SVF9GUk9NJyxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfVE8nOiAnUlRQX1BPUlRfVE8nXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnBvcnRzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm9ybUZpZWxkTmFtZSA9IHBvcnRGaWVsZE1hcHBpbmdba2V5XSB8fCBrZXk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkYXRhLnBvcnRzW2tleV07XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgZm9ybUZpZWxkTmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgTkFUIGhlbHAgdGV4dCBhbmQgbGFiZWxzIHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVOQVRIZWxwVGV4dChkYXRhLnBvcnRzKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZVBvcnRMYWJlbHMoZGF0YS5wb3J0cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYWRkaXRpb25hbCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5zZXR0aW5ncykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5zZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgZGF0YS5zZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RvcmUgYXZhaWxhYmxlIGludGVyZmFjZXMgZm9yIHN0YXRpYyByb3V0ZXMgRklSU1QgKGJlZm9yZSBsb2FkaW5nIHJvdXRlcylcbiAgICAgICAgaWYgKGRhdGEuYXZhaWxhYmxlSW50ZXJmYWNlcykge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzID0gZGF0YS5hdmFpbGFibGVJbnRlcmZhY2VzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9hZCBzdGF0aWMgcm91dGVzIEFGVEVSIGF2YWlsYWJsZUludGVyZmFjZXMgYXJlIHNldFxuICAgICAgICBpZiAoZGF0YS5zdGF0aWNSb3V0ZXMpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIubG9hZFJvdXRlcyhkYXRhLnN0YXRpY1JvdXRlcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGFmdGVyIHBvcHVsYXRpb24gaXMgY29tcGxldGVcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHRoZSBidXR0b24gaXMgZGlzYWJsZWQgYW5kIGFsbCBkeW5hbWljYWxseSBjcmVhdGVkIGZpZWxkcyBhcmUgdHJhY2tlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkcldpdGhQb3J0T3B0aW9uYWwgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pKDpbMC05XSspPyQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgYSBnaXZlbiBpbnRlcmZhY2UuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmxhblZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBWTEFOIElEIGlucHV0IGZpZWxkLlxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIHBhcmFtZXRlciBmb3IgdGhlIHJ1bGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgdGhlIGludGVyZmFjZSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tWbGFuID0gKHZsYW5WYWx1ZSwgcGFyYW0pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCB2bGFuc0FycmF5ID0ge307XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgIT09IHVuZGVmaW5lZCAmJiBhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgPiAwKSB7XG4gICAgICAgIGNvbnN0IG5ld0V0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2FsbFZhbHVlcy5pbnRlcmZhY2VfMH1gXTtcbiAgICAgICAgdmxhbnNBcnJheVtuZXdFdGhOYW1lXSA9IFthbGxWYWx1ZXMudmxhbmlkXzBdO1xuICAgICAgICBpZiAoYWxsVmFsdWVzLnZsYW5pZF8wID09PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgJC5lYWNoKGFsbFZhbHVlcywgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICBpZiAoaW5kZXggPT09ICdpbnRlcmZhY2VfMCcgfHwgaW5kZXggPT09ICd2bGFuaWRfMCcpIHJldHVybjtcbiAgICAgICAgaWYgKGluZGV4LmluZGV4T2YoJ3ZsYW5pZCcpID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGV0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2luZGV4LnNwbGl0KCdfJylbMV19YF07XG4gICAgICAgICAgICBpZiAoJC5pbkFycmF5KHZhbHVlLCB2bGFuc0FycmF5W2V0aE5hbWVdKSA+PSAwXG4gICAgICAgICAgICAgICAgJiYgdmxhblZhbHVlID09PSB2YWx1ZVxuICAgICAgICAgICAgICAgICYmIHBhcmFtID09PSBpbmRleC5zcGxpdCgnXycpWzFdKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghKGV0aE5hbWUgaW4gdmxhbnNBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2bGFuc0FycmF5W2V0aE5hbWVdLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8vIERIQ1AgdmFsaWRhdGlvbiBydWxlIHJlbW92ZWQgLSBESENQIGNoZWNrYm94IGlzIGRpc2FibGVkIGZvciBWTEFOIGludGVyZmFjZXMsIG5vIHZhbGlkYXRpb24gbmVlZGVkXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyB0aGUgcHJlc2VuY2Ugb2YgZXh0ZXJuYWwgSVAgaG9zdCBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24gaXMgcHJvdmlkZWQgd2hlbiBOQVQgaXMgZW5hYmxlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5hbElwSG9zdCA9ICgpID0+IHtcbiAgICBjb25zdCBhbGxWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgaWYgKGFsbFZhbHVlcy51c2VuYXQgPT09ICdvbicpIHtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy5leHRob3N0bmFtZSA9PT0gJycgJiYgYWxsVmFsdWVzLmV4dGlwYWRkciA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB2YWx1ZSBpcyBhIHZhbGlkIGhvc3RuYW1lXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgaG9zdG5hbWVcbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdmFsaWQgaG9zdG5hbWUsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudmFsaWRIb3N0bmFtZSA9ICh2YWx1ZSkgPT4ge1xuICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBFbXB0eSBpcyBoYW5kbGVkIGJ5IGV4dGVuYWxJcEhvc3QgcnVsZVxuICAgIH1cblxuICAgIC8vIFJGQyA5NTIvUkZDIDExMjMgaG9zdG5hbWUgdmFsaWRhdGlvblxuICAgIC8vIC0gTGFiZWxzIHNlcGFyYXRlZCBieSBkb3RzXG4gICAgLy8gLSBFYWNoIGxhYmVsIDEtNjMgY2hhcnNcbiAgICAvLyAtIE9ubHkgYWxwaGFudW1lcmljIGFuZCBoeXBoZW5zXG4gICAgLy8gLSBDYW5ub3Qgc3RhcnQvZW5kIHdpdGggaHlwaGVuXG4gICAgLy8gLSBUb3RhbCBsZW5ndGggbWF4IDI1MyBjaGFyc1xuICAgIGNvbnN0IGhvc3RuYW1lUmVnZXggPSAvXig/PS57MSwyNTN9JCkoPyEtKVthLXpBLVowLTktXXsxLDYzfSg/PCEtKShcXC5bYS16QS1aMC05LV17MSw2M30oPzwhLSkpKiQvO1xuICAgIHJldHVybiBob3N0bmFtZVJlZ2V4LnRlc3QodmFsdWUpO1xufTtcblxuXG4vKipcbiAqIFN0YXRpYyBSb3V0ZXMgTWFuYWdlciBNb2R1bGVcbiAqXG4gKiBNYW5hZ2VzIHN0YXRpYyByb3V0ZSBjb25maWd1cmF0aW9uIHdoZW4gbXVsdGlwbGUgbmV0d29yayBpbnRlcmZhY2VzIGV4aXN0XG4gKi9cbmNvbnN0IFN0YXRpY1JvdXRlc01hbmFnZXIgPSB7XG4gICAgJHRhYmxlOiAkKCcjc3RhdGljLXJvdXRlcy10YWJsZScpLFxuICAgICRzZWN0aW9uOiAkKCcjc3RhdGljLXJvdXRlcy1zZWN0aW9uJyksXG4gICAgJGFkZEJ1dHRvbjogJCgnI2FkZC1uZXctcm91dGUnKSxcbiAgICByb3V0ZXM6IFtdLFxuICAgIGF2YWlsYWJsZUludGVyZmFjZXM6IFtdLCAvLyBXaWxsIGJlIHBvcHVsYXRlZCBmcm9tIFJFU1QgQVBJXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHN0YXRpYyByb3V0ZXMgbWFuYWdlbWVudFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEhpZGUgc2VjdGlvbiBpZiBsZXNzIHRoYW4gMiBpbnRlcmZhY2VzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlVmlzaWJpbGl0eSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJhZy1hbmQtZHJvcFxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuXG4gICAgICAgIC8vIEFkZCBidXR0b24gaGFuZGxlclxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRhZGRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIChkZWxlZ2F0ZWQpXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdjbGljaycsICcuZGVsZXRlLXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvcHkgYnV0dG9uIGhhbmRsZXIgKGRlbGVnYXRlZClcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2NsaWNrJywgJy5jb3B5LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkc291cmNlUm93ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuY29weVJvdXRlKCRzb3VyY2VSb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbnB1dCBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2lucHV0IGNoYW5nZScsICcubmV0d29yay1pbnB1dCwgLmdhdGV3YXktaW5wdXQsIC5kZXNjcmlwdGlvbi1pbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUGFzdGUgaGFuZGxlcnMgZm9yIElQIGFkZHJlc3MgZmllbGRzIChlbmFibGUgY2xpcGJvYXJkIHBhc3RlIHdpdGggaW5wdXRtYXNrKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbigncGFzdGUnLCAnLm5ldHdvcmstaW5wdXQsIC5nYXRld2F5LWlucHV0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBHZXQgcGFzdGVkIGRhdGEgZnJvbSBjbGlwYm9hcmRcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLmNsaXBib2FyZERhdGEgJiYgZS5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEgJiYgd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7IC8vIEZvciBJRVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbGVhbiB0aGUgcGFzdGVkIGRhdGEgKHJlbW92ZSBleHRyYSBzcGFjZXMsIGtlZXAgb25seSB2YWxpZCBJUCBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgY29uc3QgY2xlYW5lZERhdGEgPSBwYXN0ZWREYXRhLnRyaW0oKS5yZXBsYWNlKC9bXjAtOS5dL2csICcnKTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBUZW1wb3JhcmlseSByZW1vdmUgbWFza1xuICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzaygncmVtb3ZlJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCB0aGUgY2xlYW5lZCB2YWx1ZVxuICAgICAgICAgICAgJGlucHV0LnZhbChjbGVhbmVkRGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFJlYXBwbHkgdGhlIG1hc2sgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsIHBsYWNlaG9sZGVyOiAnXyd9KTtcbiAgICAgICAgICAgICAgICAkaW5wdXQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG9yIHJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJhZ0FuZERyb3AoKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgdGFibGVEbkQgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5kYXRhKCd0YWJsZURuRCcpKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS50YWJsZURuRFVwZGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcDogKCkgPT4ge1xuICAgICAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmlzaWJpbGl0eSBiYXNlZCBvbiBudW1iZXIgb2YgaW50ZXJmYWNlc1xuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHkoKSB7XG4gICAgICAgIC8vIFNob3cvaGlkZSBzZWN0aW9uIGJhc2VkIG9uIG51bWJlciBvZiBpbnRlcmZhY2VzXG4gICAgICAgIGNvbnN0IGludGVyZmFjZUNvdW50ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYS5pdGVtJykubm90KCdbZGF0YS10YWI9XCIwXCJdJykubGVuZ3RoO1xuICAgICAgICBpZiAoaW50ZXJmYWNlQ291bnQgPiAxKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRzZWN0aW9uLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHNlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvcHkgYSByb3V0ZSByb3cgKGNyZWF0ZSBkdXBsaWNhdGUpXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRzb3VyY2VSb3cgLSBTb3VyY2Ugcm93IHRvIGNvcHlcbiAgICAgKi9cbiAgICBjb3B5Um91dGUoJHNvdXJjZVJvdykge1xuICAgICAgICBjb25zdCByb3V0ZUlkID0gJHNvdXJjZVJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyk7XG4gICAgICAgIGNvbnN0IHN1Ym5ldERyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7cm91dGVJZH1gO1xuICAgICAgICBjb25zdCBpbnRlcmZhY2VEcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0ke3JvdXRlSWR9YDtcblxuICAgICAgICAvLyBDb2xsZWN0IGRhdGEgZnJvbSBzb3VyY2Ugcm93XG4gICAgICAgIGNvbnN0IHJvdXRlRGF0YSA9IHtcbiAgICAgICAgICAgIG5ldHdvcms6ICRzb3VyY2VSb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgIHN1Ym5ldDogJChgIyR7c3VibmV0RHJvcGRvd25JZH1gKS52YWwoKSxcbiAgICAgICAgICAgIGdhdGV3YXk6ICRzb3VyY2VSb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgIGludGVyZmFjZTogJChgIyR7aW50ZXJmYWNlRHJvcGRvd25JZH1gKS52YWwoKSB8fCAnJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAkc291cmNlUm93LmZpbmQoJy5kZXNjcmlwdGlvbi1pbnB1dCcpLnZhbCgpXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIG5ldyByb3V0ZSB3aXRoIGNvcGllZCBkYXRhXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUocm91dGVEYXRhKTtcblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCBhZnRlciBhZGRpbmcgcm91dGVcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByb3V0ZURhdGEgLSBSb3V0ZSBkYXRhIChvcHRpb25hbClcbiAgICAgKi9cbiAgICBhZGRSb3V0ZShyb3V0ZURhdGEgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0ICR0ZW1wbGF0ZSA9ICQoJy5yb3V0ZS1yb3ctdGVtcGxhdGUnKS5sYXN0KCk7XG4gICAgICAgIGNvbnN0ICRuZXdSb3cgPSAkdGVtcGxhdGUuY2xvbmUodHJ1ZSk7XG4gICAgICAgIGNvbnN0IHJvdXRlSWQgPSByb3V0ZURhdGE/LmlkIHx8IGBuZXdfJHtEYXRlLm5vdygpfWA7XG5cbiAgICAgICAgJG5ld1Jvd1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyb3V0ZS1yb3ctdGVtcGxhdGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdyb3V0ZS1yb3cnKVxuICAgICAgICAgICAgLmF0dHIoJ2RhdGEtcm91dGUtaWQnLCByb3V0ZUlkKVxuICAgICAgICAgICAgLnNob3coKTtcblxuICAgICAgICAvLyBTZXQgdmFsdWVzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChyb3V0ZURhdGEpIHtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwocm91dGVEYXRhLm5ldHdvcmspO1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbChyb3V0ZURhdGEuZ2F0ZXdheSk7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5kZXNjcmlwdGlvbi1pbnB1dCcpLnZhbChyb3V0ZURhdGEuZGVzY3JpcHRpb24gfHwgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHRvIHRhYmxlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ1Jvd3MgPSAkKCcucm91dGUtcm93Jyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJHRlbXBsYXRlLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGV4aXN0aW5nUm93cy5sYXN0KCkuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgdGhpcyByb3dcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplU3VibmV0RHJvcGRvd24oJG5ld1Jvdywgcm91dGVEYXRhPy5zdWJuZXQgfHwgJzI0Jyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnRlcmZhY2UgZHJvcGRvd24gZm9yIHRoaXMgcm93XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duKCRuZXdSb3csIHJvdXRlRGF0YT8uaW50ZXJmYWNlIHx8ICcnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGlucHV0bWFzayBmb3IgSVAgYWRkcmVzcyBmaWVsZHNcbiAgICAgICAgJG5ld1Jvdy5maW5kKCcuaXBhZGRyZXNzJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgcGxhY2Vob2xkZXI6ICdfJ30pO1xuXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciBhIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gUm93IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0ZWRWYWx1ZSAtIFNlbGVjdGVkIHN1Ym5ldCB2YWx1ZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVTdWJuZXREcm9wZG93bigkcm93LCBzZWxlY3RlZFZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkcm93LmZpbmQoJy5zdWJuZXQtZHJvcGRvd24tY29udGFpbmVyJyk7XG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7JHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyl9YDtcblxuICAgICAgICAkY29udGFpbmVyLmh0bWwoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCIke2Ryb3Bkb3duSWR9XCIgLz5gKTtcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZHJvcGRvd25JZCxcbiAgICAgICAgICAgIHsgW2Ryb3Bkb3duSWRdOiBzZWxlY3RlZFZhbHVlIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW50ZXJmYWNlIGRyb3Bkb3duIGZvciBhIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gUm93IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0ZWRWYWx1ZSAtIFNlbGVjdGVkIGludGVyZmFjZSB2YWx1ZSAoZW1wdHkgc3RyaW5nID0gYXV0bylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24oJHJvdywgc2VsZWN0ZWRWYWx1ZSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJHJvdy5maW5kKCcuaW50ZXJmYWNlLWRyb3Bkb3duLWNvbnRhaW5lcicpO1xuICAgICAgICBjb25zdCBkcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0keyRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpfWA7XG5cbiAgICAgICAgJGNvbnRhaW5lci5odG1sKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiJHtkcm9wZG93bklkfVwiIC8+YCk7XG5cbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gb3B0aW9uczogXCJBdXRvXCIgKyBhdmFpbGFibGUgaW50ZXJmYWNlc1xuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19BdXRvIHx8ICdBdXRvJyB9LFxuICAgICAgICAgICAgLi4uU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzLm1hcChpZmFjZSA9PiAoe1xuICAgICAgICAgICAgICAgIHZhbHVlOiBpZmFjZS52YWx1ZSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5sYWJlbFxuICAgICAgICAgICAgfSkpXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gUHJlcGFyZSBmb3JtIGRhdGEgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7fTtcbiAgICAgICAgZm9ybURhdGFbZHJvcGRvd25JZF0gPSBzZWxlY3RlZFZhbHVlIHx8ICcnOyAvLyBFbnN1cmUgd2UgcGFzcyBlbXB0eSBzdHJpbmcgZm9yIFwiQXV0b1wiXG5cbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGRyb3Bkb3duSWQsXG4gICAgICAgICAgICBmb3JtRGF0YSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHJvdXRlIHByaW9yaXRpZXMgYmFzZWQgb24gdGFibGUgb3JkZXJcbiAgICAgKi9cbiAgICB1cGRhdGVQcmlvcml0aWVzKCkge1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtcHJpb3JpdHknLCBpbmRleCArIDEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCByb3V0ZXMgZnJvbSBkYXRhXG4gICAgICogQHBhcmFtIHtBcnJheX0gcm91dGVzRGF0YSAtIEFycmF5IG9mIHJvdXRlIG9iamVjdHNcbiAgICAgKi9cbiAgICBsb2FkUm91dGVzKHJvdXRlc0RhdGEpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3Rpbmcgcm91dGVzXG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5yZW1vdmUoKTtcblxuICAgICAgICAvLyBBZGQgZWFjaCByb3V0ZVxuICAgICAgICBpZiAocm91dGVzRGF0YSAmJiByb3V0ZXNEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJvdXRlc0RhdGEuZm9yRWFjaChyb3V0ZSA9PiB7XG4gICAgICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZShyb3V0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGFmdGVyIGFkZGluZyByb3V0ZXNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29sbGVjdCByb3V0ZXMgZnJvbSB0YWJsZVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqL1xuICAgIGNvbGxlY3RSb3V0ZXMoKSB7XG4gICAgICAgIGNvbnN0IHJvdXRlcyA9IFtdO1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQocm93KTtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHN1Ym5ldERyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7cm91dGVJZH1gO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlRHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHtyb3V0ZUlkfWA7XG5cbiAgICAgICAgICAgIHJvdXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBpZDogcm91dGVJZC5zdGFydHNXaXRoKCduZXdfJykgPyBudWxsIDogcm91dGVJZCxcbiAgICAgICAgICAgICAgICBuZXR3b3JrOiAkcm93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgc3VibmV0OiAkKGAjJHtzdWJuZXREcm9wZG93bklkfWApLnZhbCgpLFxuICAgICAgICAgICAgICAgIGdhdGV3YXk6ICRyb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2U6ICQoYCMke2ludGVyZmFjZURyb3Bkb3duSWR9YCkudmFsKCkgfHwgJycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICRyb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4ICsgMVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcm91dGVzO1xuICAgIH1cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbmV0d29yayBzZXR0aW5ncyBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBuZXR3b3Jrcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==