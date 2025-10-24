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
    }); // Apply IP mask for external IP address field

    networks.$extipaddr.inputmask({
      alias: 'ip',
      'placeholder': '_'
    });
    networks.initializeForm(); // Initialize static routes manager

    StaticRoutesManager.initialize(); // Hide static routes section in Docker (managed via do-not-show-if-docker class)

    if (networks.$formObj.form('get value', 'is-docker') === "1") {
      networks.$notShowOnDockerDivs.hide();
    }
  },

  /**
   * Callback function executed after getting the external IP from a remote server.
   * @param {boolean|Object} response - The response received from the server. If false, indicates an error occurred.
   */
  cbAfterGetExternalIp: function cbAfterGetExternalIp(response) {
    networks.$getMyIpButton.removeClass('loading disabled');

    if (response === false || !response.result || !response.data || !response.data.ip) {
      UserMessage.showError(globalTranslate.nw_ErrorGettingExternalIp || 'Failed to get external IP address');
      return;
    }

    var currentExtIpAddr = networks.$formObj.form('get value', 'extipaddr');
    var portMatch = currentExtIpAddr.match(/:(\d+)$/);
    var port = portMatch ? ':' + portMatch[1] : '';
    var newExtIpAddr = response.data.ip + port;
    networks.$formObj.form('set value', 'extipaddr', newExtIpAddr); // Clear external hostname when getting external IP

    networks.$formObj.form('set value', 'exthostname', '');
    networks.$extipaddr.trigger('change');
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
   * Show Docker network info as read-only
   */
  showDockerNetworkInfo: function showDockerNetworkInfo(data) {
    // WHY: In Docker, network is managed by container - show info as read-only
    if (!data.interfaces || data.interfaces.length === 0) return;
    var iface = data.interfaces[0]; // Docker typically has one interface
    // Populate Docker network info

    $('#docker-interface-name').text(iface.name || iface["interface"]);
    $('#docker-current-ip').text(iface.currentIpaddr || iface.ipaddr || '—'); // Format subnet mask (CIDR to dotted notation)

    var subnetCidr = iface.currentSubnet || iface.subnet || 24;
    var subnetMask = networks.cidrToNetmask(subnetCidr);
    $('#docker-current-subnet').text("".concat(subnetCidr, " - ").concat(subnetMask));
    $('#docker-current-gateway').text(iface.currentGateway || iface.gateway || '—'); // Show Docker info section (non-Docker section hidden by CSS class)

    $('.docker-network-info').show();
  },

  /**
   * Convert CIDR notation to dotted decimal netmask
   */
  cidrToNetmask: function cidrToNetmask(cidr) {
    var mask = ~(Math.pow(2, 32 - cidr) - 1);
    return [mask >>> 24 & 255, mask >>> 16 & 255, mask >>> 8 & 255, mask & 255].join('.');
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
    // WHY: Docker and non-Docker have different network management UIs
    if (data.isDocker) {
      // Show read-only network info for Docker
      networks.showDockerNetworkInfo(data);
    } else {
      // Create editable interface tabs for non-Docker
      networks.createInterfaceTabs(data);
    } // Set NAT settings


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJmb3JtIiwiaGlkZSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaXAiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXAiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBQb3J0IiwiVExTX1BPUlQiLCJSVFBQb3J0RnJvbSIsIlJUUFBvcnRUbyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGRoY3BDaGVja2JveCIsImlzRGhjcEVuYWJsZWQiLCIkaXBGaWVsZCIsIiRzdWJuZXREcm9wZG93biIsInByb3AiLCJjbG9zZXN0IiwidmFsIiwiYWRkTmV3Rm9ybVJ1bGVzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsIm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiT2JqZWN0IiwiYXNzaWduIiwic3RhdGljUm91dGVzIiwiY29sbGVjdFJvdXRlcyIsImZpbmQiLCIkaW5wdXQiLCJuYW1lIiwidmFsdWUiLCJ1bmRlZmluZWQiLCJTdHJpbmciLCIkc2VsZWN0IiwidXNlbmF0IiwiJGF1dG9VcGRhdGVEaXYiLCJwYXJlbnQiLCJhdXRvVXBkYXRlRXh0ZXJuYWxJcCIsImlucHV0SWQiLCJyb3dJZCIsInJlcGxhY2UiLCIkY2hlY2tib3giLCJpc0Rpc2FibGVkIiwiaGFzQ2xhc3MiLCIkY2hlY2tlZFJhZGlvIiwiaW50ZXJuZXRfaW50ZXJmYWNlIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImlubGluZSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsImlzRG9ja2VyIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJzaG93RG9ja2VyTmV0d29ya0luZm8iLCJpbnRlcmZhY2VzIiwiaWZhY2UiLCJjdXJyZW50SXBhZGRyIiwiaXBhZGRyIiwic3VibmV0Q2lkciIsImN1cnJlbnRTdWJuZXQiLCJzdWJuZXQiLCJzdWJuZXRNYXNrIiwiY2lkclRvTmV0bWFzayIsImN1cnJlbnRHYXRld2F5IiwiZ2F0ZXdheSIsInNob3ciLCJjaWRyIiwibWFzayIsImpvaW4iLCJjcmVhdGVJbnRlcmZhY2VUYWJzIiwiJG1lbnUiLCIkY29udGVudCIsImVtcHR5IiwiZm9yRWFjaCIsInRhYklkIiwiaWQiLCJ0YWJMYWJlbCIsInZsYW5pZCIsImlzQWN0aXZlIiwiYXBwZW5kIiwiY2FuRGVsZXRlIiwicGFyc2VJbnQiLCJkZWxldGVCdXR0b24iLCJud19EZWxldGVDdXJyZW50SW50ZXJmYWNlIiwiY3JlYXRlSW50ZXJmYWNlRm9ybSIsInRlbXBsYXRlIiwiY3JlYXRlVGVtcGxhdGVGb3JtIiwicGh5c2ljYWxJbnRlcmZhY2VzIiwidG9TdHJpbmciLCJwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMiLCJ2YWx1ZXMiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImludGVyZmFjZV8wIiwic3RhdGljT3B0aW9ucyIsInBsYWNlaG9sZGVyIiwibndfU2VsZWN0SW50ZXJmYWNlIiwiYWxsb3dFbXB0eSIsImZpZWxkTmFtZSIsImZvcm1EYXRhIiwiZ2V0U3VibmV0T3B0aW9uc0FycmF5IiwibndfU2VsZWN0TmV0d29ya01hc2siLCJhZGRpdGlvbmFsQ2xhc3NlcyIsInN1Ym5ldF8wIiwidGFiIiwiZmlyc3QiLCJ1cGRhdGVWaXNpYmlsaXR5Iiwib2ZmIiwiJGJ1dHRvbiIsImludGVyZmFjZUlkIiwicmVtb3ZlIiwiJHRhYkNvbnRlbnQiLCIkZmlyc3RUYWIiLCJlbmFibGVEaXJyaXR5IiwiY2hlY2tWYWx1ZXMiLCIkdmxhbklucHV0IiwidmxhblZhbHVlIiwic2VsZWN0ZWRJbnRlcmZhY2VJZCIsIiR0YWIiLCJwcmVwZW5kIiwiJGRuc0dhdGV3YXlHcm91cCIsIiRkbnNHYXRld2F5RmllbGRzIiwib3JpZ2luYWxTYXZlSW5pdGlhbFZhbHVlcyIsInNhdmVJbml0aWFsVmFsdWVzIiwib3JpZ2luYWxDaGVja1ZhbHVlcyIsImZvbWFudGljVmFsdWVzIiwibWFudWFsVmFsdWVzIiwiJGZpZWxkIiwiaXMiLCJvbGRGb3JtVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0Iiwic2V0RXZlbnRzIiwiaXNJbnRlcm5ldEludGVyZmFjZSIsImludGVybmV0IiwiZG5zR2F0ZXdheVZpc2libGUiLCJkbnNHYXRld2F5UmVhZG9ubHkiLCJkaGNwIiwiZG5zR2F0ZXdheURpc2FibGVkQ2xhc3MiLCJud19JbnRlcmZhY2VOYW1lIiwibndfSW50ZXJuZXRJbnRlcmZhY2UiLCJud19Vc2VESENQIiwibndfSVBBZGRyZXNzIiwibndfTmV0d29ya01hc2siLCJud19WbGFuSUQiLCJud19JbnRlcm5ldFNldHRpbmdzIiwibndfSG9zdG5hbWUiLCJob3N0bmFtZSIsIm53X0RvbWFpbiIsImRvbWFpbiIsIm53X0dhdGV3YXkiLCJud19QcmltYXJ5RE5TIiwicHJpbWFyeWRucyIsIm53X1NlY29uZGFyeUROUyIsInNlY29uZGFyeWRucyIsIm5hdCIsIiRhdXRvVXBkYXRlQ2hlY2tib3giLCJBVVRPX1VQREFURV9FWFRFUk5BTF9JUCIsImtleXMiLCJrZXkiLCJhdmFpbGFibGVJbnRlcmZhY2VzIiwibG9hZFJvdXRlcyIsImluaXRpYWxpemVEaXJyaXR5IiwiZm4iLCJmIiwiaSIsImEiLCJpcGFkZHJXaXRoUG9ydE9wdGlvbmFsIiwiY2hlY2tWbGFuIiwicGFyYW0iLCJhbGxWYWx1ZXMiLCJuZXdFdGhOYW1lIiwidmxhbmlkXzAiLCJpbmRleE9mIiwiZXRoTmFtZSIsInNwbGl0IiwiaW5BcnJheSIsInB1c2giLCJleHRlbmFsSXBIb3N0IiwidmFsaWRIb3N0bmFtZSIsImhvc3RuYW1lUmVnZXgiLCJ0ZXN0IiwiJHRhYmxlIiwiJHNlY3Rpb24iLCIkYWRkQnV0dG9uIiwiJHRhYmxlQ29udGFpbmVyIiwiJGVtcHR5UGxhY2Vob2xkZXIiLCJyb3V0ZXMiLCJpbml0aWFsaXplRHJhZ0FuZERyb3AiLCJhZGRSb3V0ZSIsImRvY3VtZW50IiwidGFyZ2V0IiwidXBkYXRlUHJpb3JpdGllcyIsInVwZGF0ZUVtcHR5U3RhdGUiLCJkYXRhQ2hhbmdlZCIsIiRzb3VyY2VSb3ciLCJjb3B5Um91dGUiLCJwYXN0ZWREYXRhIiwib3JpZ2luYWxFdmVudCIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwid2luZG93IiwiY2xlYW5lZERhdGEiLCJ0cmltIiwic2V0VGltZW91dCIsInRhYmxlRG5EVXBkYXRlIiwidGFibGVEbkQiLCJvbkRyb3AiLCJkcmFnSGFuZGxlIiwiaW50ZXJmYWNlQ291bnQiLCJub3QiLCJyb3V0ZUlkIiwic3VibmV0RHJvcGRvd25JZCIsImludGVyZmFjZURyb3Bkb3duSWQiLCJyb3V0ZURhdGEiLCJuZXR3b3JrIiwiZGVzY3JpcHRpb24iLCIkZXhpc3RpbmdSb3dzIiwiJHRlbXBsYXRlIiwibGFzdCIsIiRuZXdSb3ciLCJjbG9uZSIsIkRhdGUiLCJub3ciLCJhZnRlciIsImluaXRpYWxpemVTdWJuZXREcm9wZG93biIsImluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93biIsIiRyb3ciLCJzZWxlY3RlZFZhbHVlIiwiJGNvbnRhaW5lciIsImRyb3Bkb3duSWQiLCJvcHRpb25zIiwibndfQXV0byIsIm1hcCIsImxhYmVsIiwicm93Iiwicm91dGVzRGF0YSIsInJvdXRlIiwic3RhcnRzV2l0aCIsInByaW9yaXR5IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYkMsRUFBQUEsY0FBYyxFQUFFQyxDQUFDLENBQUMsVUFBRCxDQURKOztBQUdiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUQsQ0FBQyxDQUFDLGVBQUQsQ0FQRTtBQVNiRSxFQUFBQSxVQUFVLEVBQUVGLENBQUMsQ0FBQyx5QkFBRCxDQVRBO0FBVWJHLEVBQUFBLFVBQVUsRUFBRUgsQ0FBQyxDQUFDLFlBQUQsQ0FWQTtBQVdiSSxFQUFBQSxlQUFlLEVBQUVKLENBQUMsQ0FBQyxZQUFELENBWEw7QUFZYkssRUFBQUEsVUFBVSxFQUFFLEVBWkM7O0FBY2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsb0JBQW9CLEVBQUVOLENBQUMsQ0FBQyx3QkFBRCxDQWxCVjs7QUFvQmI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJTyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsU0FBUyxFQUFFO0FBQ1BDLE1BQUFBLFFBQVEsRUFBRSxJQURIO0FBRVBDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSx3QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERyxFQUtIO0FBQ0lILFFBQUFBLElBQUksRUFBRSxlQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRTtBQUY1QixPQUxHO0FBRkEsS0FEQTtBQWNYQyxJQUFBQSxXQUFXLEVBQUU7QUFDVEMsTUFBQUEsT0FBTyxFQUFFLFFBREE7QUFFVFAsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLGVBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNFO0FBRjVCLE9BREcsRUFLSDtBQUNJSixRQUFBQSxJQUFJLEVBQUUsZUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0s7QUFGNUIsT0FMRztBQUZFO0FBZEYsR0F6QkY7O0FBc0RiO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQXpEYSx3QkF5REE7QUFDVDtBQUNBckIsSUFBQUEsUUFBUSxDQUFDc0IsaUJBQVQsR0FGUyxDQUlUOztBQUNBcEIsSUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JxQixRQUF0QixDQUErQjtBQUMzQkMsTUFBQUEsUUFEMkIsc0JBQ2hCO0FBQ1B4QixRQUFBQSxRQUFRLENBQUN5Qix3QkFBVDtBQUNIO0FBSDBCLEtBQS9CO0FBS0F6QixJQUFBQSxRQUFRLENBQUNJLFVBQVQsQ0FBb0JzQixRQUFwQixHQVZTLENBWVQ7O0FBRUExQixJQUFBQSxRQUFRLENBQUNDLGNBQVQsQ0FBd0IwQixFQUF4QixDQUEyQixPQUEzQixFQUFvQyxVQUFDQyxDQUFELEVBQU87QUFDdkNBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBN0IsTUFBQUEsUUFBUSxDQUFDQyxjQUFULENBQXdCNkIsUUFBeEIsQ0FBaUMsa0JBQWpDO0FBQ0FDLE1BQUFBLFVBQVUsQ0FBQ0MsaUJBQVgsQ0FBNkJoQyxRQUFRLENBQUNpQyxvQkFBdEM7QUFDSCxLQUpELEVBZFMsQ0FvQlQ7O0FBQ0FqQyxJQUFBQSxRQUFRLENBQUNNLGVBQVQsQ0FBeUI0QixTQUF6QixDQUFtQztBQUFDQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjLHFCQUFlO0FBQTdCLEtBQW5DLEVBckJTLENBdUJUOztBQUNBbkMsSUFBQUEsUUFBUSxDQUFDSyxVQUFULENBQW9CNkIsU0FBcEIsQ0FBOEI7QUFBQ0MsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBYyxxQkFBZTtBQUE3QixLQUE5QjtBQUVBbkMsSUFBQUEsUUFBUSxDQUFDb0MsY0FBVCxHQTFCUyxDQTRCVDs7QUFDQUMsSUFBQUEsbUJBQW1CLENBQUNoQixVQUFwQixHQTdCUyxDQStCVDs7QUFDQSxRQUFJckIsUUFBUSxDQUFDRyxRQUFULENBQWtCbUMsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBbUMsV0FBbkMsTUFBa0QsR0FBdEQsRUFBMkQ7QUFDdkR0QyxNQUFBQSxRQUFRLENBQUNRLG9CQUFULENBQThCK0IsSUFBOUI7QUFDSDtBQUNKLEdBNUZZOztBQThGYjtBQUNKO0FBQ0E7QUFDQTtBQUNJTixFQUFBQSxvQkFsR2EsZ0NBa0dRTyxRQWxHUixFQWtHa0I7QUFDM0J4QyxJQUFBQSxRQUFRLENBQUNDLGNBQVQsQ0FBd0J3QyxXQUF4QixDQUFvQyxrQkFBcEM7O0FBRUEsUUFBSUQsUUFBUSxLQUFLLEtBQWIsSUFBc0IsQ0FBQ0EsUUFBUSxDQUFDRSxNQUFoQyxJQUEwQyxDQUFDRixRQUFRLENBQUNHLElBQXBELElBQTRELENBQUNILFFBQVEsQ0FBQ0csSUFBVCxDQUFjQyxFQUEvRSxFQUFtRjtBQUMvRUMsTUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCL0IsZUFBZSxDQUFDZ0MseUJBQWhCLElBQTZDLG1DQUFuRTtBQUNBO0FBQ0g7O0FBRUQsUUFBTUMsZ0JBQWdCLEdBQUdoRCxRQUFRLENBQUNHLFFBQVQsQ0FBa0JtQyxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxXQUFwQyxDQUF6QjtBQUNBLFFBQU1XLFNBQVMsR0FBR0QsZ0JBQWdCLENBQUNFLEtBQWpCLENBQXVCLFNBQXZCLENBQWxCO0FBQ0EsUUFBTUMsSUFBSSxHQUFHRixTQUFTLEdBQUcsTUFBTUEsU0FBUyxDQUFDLENBQUQsQ0FBbEIsR0FBd0IsRUFBOUM7QUFDQSxRQUFNRyxZQUFZLEdBQUdaLFFBQVEsQ0FBQ0csSUFBVCxDQUFjQyxFQUFkLEdBQW1CTyxJQUF4QztBQUNBbkQsSUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCbUMsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsV0FBcEMsRUFBaURjLFlBQWpELEVBWjJCLENBYTNCOztBQUNBcEQsSUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCbUMsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsYUFBcEMsRUFBbUQsRUFBbkQ7QUFDQXRDLElBQUFBLFFBQVEsQ0FBQ0ssVUFBVCxDQUFvQmdELE9BQXBCLENBQTRCLFFBQTVCO0FBQ0gsR0FsSFk7O0FBb0hiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQXhIYSw2QkF3SEtDLEtBeEhMLEVBd0hZO0FBQ3JCO0FBQ0E7QUFDQSxRQUFJLENBQUNBLEtBQUssQ0FBQ0MsT0FBUCxJQUFrQixDQUFDRCxLQUFLLENBQUNFLFFBQXpCLElBQXFDLENBQUNGLEtBQUssQ0FBQ0csV0FBNUMsSUFBMkQsQ0FBQ0gsS0FBSyxDQUFDSSxTQUF0RSxFQUFpRjtBQUM3RTtBQUNILEtBTG9CLENBT3JCOzs7QUFDQSxRQUFNQyxjQUFjLEdBQUcxRCxDQUFDLENBQUMsa0NBQUQsQ0FBeEI7O0FBQ0EsUUFBSTBELGNBQWMsQ0FBQ0MsTUFBZixHQUF3QixDQUE1QixFQUErQjtBQUMzQixVQUFNQyxPQUFPLEdBQUdDLElBQUksQ0FBQyxhQUFELEVBQWdCO0FBQ2hDLG9CQUFZUixLQUFLLENBQUNDLE9BRGM7QUFFaEMsb0JBQVlELEtBQUssQ0FBQ0U7QUFGYyxPQUFoQixDQUFwQjtBQUlBRyxNQUFBQSxjQUFjLENBQUNJLElBQWYsQ0FBb0JGLE9BQXBCO0FBQ0gsS0Fmb0IsQ0FpQnJCOzs7QUFDQSxRQUFNRyxjQUFjLEdBQUcvRCxDQUFDLENBQUMsa0NBQUQsQ0FBeEI7O0FBQ0EsUUFBSStELGNBQWMsQ0FBQ0osTUFBZixHQUF3QixDQUE1QixFQUErQjtBQUMzQixVQUFNSyxPQUFPLEdBQUdILElBQUksQ0FBQyxhQUFELEVBQWdCO0FBQ2hDLHlCQUFpQlIsS0FBSyxDQUFDRyxXQURTO0FBRWhDLHVCQUFlSCxLQUFLLENBQUNJO0FBRlcsT0FBaEIsQ0FBcEI7QUFJQU0sTUFBQUEsY0FBYyxDQUFDRCxJQUFmLENBQW9CRSxPQUFwQjtBQUNIO0FBQ0osR0FsSlk7O0FBb0piO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQXhKYSw0QkF3SklaLEtBeEpKLEVBd0pXO0FBQ3BCO0FBQ0E7QUFDQSxRQUFJLENBQUNBLEtBQUssQ0FBQ0MsT0FBUCxJQUFrQixDQUFDRCxLQUFLLENBQUNFLFFBQTdCLEVBQXVDO0FBQ25DO0FBQ0gsS0FMbUIsQ0FPcEI7OztBQUNBLFFBQU1XLFNBQVMsR0FBR2xFLENBQUMsQ0FBQywwQkFBRCxDQUFuQjs7QUFDQSxRQUFJa0UsU0FBUyxDQUFDUCxNQUFWLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3RCLFVBQU1RLFlBQVksR0FBR04sSUFBSSxDQUFDLGtCQUFELEVBQXFCO0FBQzFDLG9CQUFZUixLQUFLLENBQUNDO0FBRHdCLE9BQXJCLENBQXpCO0FBR0FZLE1BQUFBLFNBQVMsQ0FBQ0UsSUFBVixDQUFlRCxZQUFmO0FBQ0gsS0FkbUIsQ0FnQnBCOzs7QUFDQSxRQUFNRSxTQUFTLEdBQUdyRSxDQUFDLENBQUMsMEJBQUQsQ0FBbkI7O0FBQ0EsUUFBSXFFLFNBQVMsQ0FBQ1YsTUFBVixHQUFtQixDQUF2QixFQUEwQjtBQUN0QixVQUFNVyxZQUFZLEdBQUdULElBQUksQ0FBQyxrQkFBRCxFQUFxQjtBQUMxQyxvQkFBWVIsS0FBSyxDQUFDRTtBQUR3QixPQUFyQixDQUF6QjtBQUdBYyxNQUFBQSxTQUFTLENBQUNELElBQVYsQ0FBZUUsWUFBZjtBQUNIO0FBQ0osR0FoTFk7O0FBa0xiO0FBQ0o7QUFDQTtBQUNJL0MsRUFBQUEsd0JBckxhLHNDQXFMYztBQUN2QnZCLElBQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCdUUsSUFBNUIsQ0FBaUMsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQzdDLFVBQU1DLEdBQUcsR0FBRzFFLENBQUMsQ0FBQ3lFLEdBQUQsQ0FBRCxDQUFPRSxJQUFQLENBQVksVUFBWixDQUFaO0FBQ0EsVUFBTUMsYUFBYSxHQUFHNUUsQ0FBQyxpQkFBVTBFLEdBQVYsZUFBdkI7QUFDQSxVQUFNRyxhQUFhLEdBQUdELGFBQWEsQ0FBQ3ZELFFBQWQsQ0FBdUIsWUFBdkIsQ0FBdEIsQ0FINkMsQ0FLN0M7O0FBQ0EsVUFBTXlELFFBQVEsR0FBRzlFLENBQUMsK0JBQXVCMEUsR0FBdkIsU0FBbEIsQ0FONkMsQ0FPN0M7O0FBQ0EsVUFBTUssZUFBZSxHQUFHL0UsQ0FBQyxtQkFBWTBFLEdBQVosZUFBekI7O0FBRUEsVUFBSUcsYUFBSixFQUFtQjtBQUNmO0FBQ0FDLFFBQUFBLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjLFVBQWQsRUFBMEIsSUFBMUI7QUFDQUYsUUFBQUEsUUFBUSxDQUFDRyxPQUFULENBQWlCLFFBQWpCLEVBQTJCckQsUUFBM0IsQ0FBb0MsVUFBcEM7QUFDQW1ELFFBQUFBLGVBQWUsQ0FBQ25ELFFBQWhCLENBQXlCLFVBQXpCO0FBQ0E1QixRQUFBQSxDQUFDLHFCQUFjMEUsR0FBZCxFQUFELENBQXNCUSxHQUF0QixDQUEwQixFQUExQjtBQUNILE9BTkQsTUFNTztBQUNIO0FBQ0FKLFFBQUFBLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjLFVBQWQsRUFBMEIsS0FBMUI7QUFDQUYsUUFBQUEsUUFBUSxDQUFDRyxPQUFULENBQWlCLFFBQWpCLEVBQTJCMUMsV0FBM0IsQ0FBdUMsVUFBdkM7QUFDQXdDLFFBQUFBLGVBQWUsQ0FBQ3hDLFdBQWhCLENBQTRCLFVBQTVCO0FBQ0F2QyxRQUFBQSxDQUFDLHFCQUFjMEUsR0FBZCxFQUFELENBQXNCUSxHQUF0QixDQUEwQixHQUExQjtBQUNIOztBQUVEcEYsTUFBQUEsUUFBUSxDQUFDcUYsZUFBVCxDQUF5QlQsR0FBekI7QUFDSCxLQXpCRDs7QUEyQkEsUUFBSTFFLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCcUIsUUFBdEIsQ0FBK0IsWUFBL0IsQ0FBSixFQUFrRDtBQUM5Q3JCLE1BQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCdUMsV0FBM0IsQ0FBdUMsVUFBdkM7QUFDSCxLQUZELE1BRU87QUFDSHZDLE1BQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCNEIsUUFBM0IsQ0FBb0MsVUFBcEM7QUFDSDtBQUNKLEdBdE5ZOztBQXdOYjtBQUNKO0FBQ0E7QUFDQTtBQUNJdUQsRUFBQUEsZUE1TmEsMkJBNE5HQyxRQTVOSCxFQTROYTtBQUV0QjtBQUNBLFFBQU1DLFNBQVMsa0JBQVdELFFBQVgsQ0FBZixDQUhzQixDQUt0Qjs7QUFDQXRGLElBQUFBLFFBQVEsQ0FBQ1MsYUFBVCxDQUF1QjhFLFNBQXZCLElBQW9DO0FBQ2hDQyxNQUFBQSxVQUFVLEVBQUVELFNBRG9CO0FBRWhDcEUsTUFBQUEsT0FBTyxzQkFBZW1FLFFBQWYsQ0FGeUI7QUFHaEMxRSxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQzBFO0FBRjVCLE9BREc7QUFIeUIsS0FBcEMsQ0FOc0IsQ0FrQnRCOztBQUNBLFFBQU1DLFNBQVMsb0JBQWFKLFFBQWIsQ0FBZixDQW5Cc0IsQ0FzQnRCOztBQUNBdEYsSUFBQUEsUUFBUSxDQUFDUyxhQUFULENBQXVCaUYsU0FBdkIsSUFBb0M7QUFDaEN2RSxNQUFBQSxPQUFPLHNCQUFlbUUsUUFBZixDQUR5QjtBQUVoQ0UsTUFBQUEsVUFBVSxFQUFFRSxTQUZvQjtBQUdoQzlFLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxrQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQzRFO0FBRjVCLE9BREcsRUFLSDtBQUNJOUUsUUFBQUEsSUFBSSxzQkFBZXlFLFFBQWYsTUFEUjtBQUVJeEUsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUM2RTtBQUY1QixPQUxHO0FBSHlCLEtBQXBDLENBdkJzQixDQXVDdEI7O0FBQ0EsUUFBTUMsV0FBVyxvQkFBYVAsUUFBYixDQUFqQixDQXhDc0IsQ0EwQ3RCO0FBQ0E7O0FBQ0EsUUFBSUEsUUFBUSxLQUFLLENBQWIsSUFBa0JBLFFBQVEsS0FBSyxHQUFuQyxFQUF3QztBQUNwQ3RGLE1BQUFBLFFBQVEsQ0FBQ1MsYUFBVCxDQUF1Qm9GLFdBQXZCLElBQXNDO0FBQ2xDTCxRQUFBQSxVQUFVLEVBQUVLLFdBRHNCO0FBRWxDMUUsUUFBQUEsT0FBTyxzQkFBZW1FLFFBQWYsQ0FGMkI7QUFFQztBQUNuQzFFLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFVBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDK0U7QUFGNUIsU0FERyxFQUtIO0FBQ0lqRixVQUFBQSxJQUFJLEVBQUUsUUFEVjtBQUVJQyxVQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2dGO0FBRjVCLFNBTEc7QUFIMkIsT0FBdEM7QUFjSCxLQWZELE1BZU87QUFDSC9GLE1BQUFBLFFBQVEsQ0FBQ1MsYUFBVCxDQUF1Qm9GLFdBQXZCLElBQXNDO0FBQ2xDTCxRQUFBQSxVQUFVLEVBQUVLLFdBRHNCO0FBRWxDMUUsUUFBQUEsT0FBTyxvQkFBYW1FLFFBQWIsQ0FGMkI7QUFFRDtBQUNqQzFFLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFVBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDK0U7QUFGNUIsU0FERyxFQUtIO0FBQ0lqRixVQUFBQSxJQUFJLEVBQUUsUUFEVjtBQUVJQyxVQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2dGO0FBRjVCLFNBTEc7QUFIMkIsT0FBdEM7QUFjSCxLQTFFcUIsQ0E0RXRCOztBQUVILEdBMVNZOztBQTRTYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQWpUYSw0QkFpVElDLFFBalRKLEVBaVRjO0FBQ3ZCO0FBQ0EsUUFBTXZELE1BQU0sR0FBR3dELE1BQU0sQ0FBQ0MsTUFBUCxDQUFjLEVBQWQsRUFBa0JGLFFBQWxCLENBQWY7QUFDQXZELElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxHQUFjLEVBQWQsQ0FIdUIsQ0FLdkI7O0FBQ0FELElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZeUQsWUFBWixHQUEyQi9ELG1CQUFtQixDQUFDZ0UsYUFBcEIsRUFBM0IsQ0FOdUIsQ0FRdkI7QUFDQTs7QUFDQXJHLElBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1HLElBQWxCLENBQXVCLDBFQUF2QixFQUFtRzdCLElBQW5HLENBQXdHLFlBQVc7QUFDL0csVUFBTThCLE1BQU0sR0FBR3JHLENBQUMsQ0FBQyxJQUFELENBQWhCO0FBQ0EsVUFBTXNHLElBQUksR0FBR0QsTUFBTSxDQUFDMUIsSUFBUCxDQUFZLE1BQVosQ0FBYjs7QUFDQSxVQUFJMkIsSUFBSixFQUFVO0FBQ04sWUFBTUMsS0FBSyxHQUFHRixNQUFNLENBQUNuQixHQUFQLEVBQWQsQ0FETSxDQUVOOztBQUNBMUMsUUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVk2RCxJQUFaLElBQXFCQyxLQUFLLEtBQUssSUFBVixJQUFrQkEsS0FBSyxLQUFLQyxTQUE3QixHQUEwQ0MsTUFBTSxDQUFDRixLQUFELENBQWhELEdBQTBELEVBQTlFO0FBQ0g7QUFDSixLQVJELEVBVnVCLENBb0J2Qjs7QUFDQXpHLElBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1HLElBQWxCLENBQXVCLFFBQXZCLEVBQWlDN0IsSUFBakMsQ0FBc0MsWUFBVztBQUM3QyxVQUFNbUMsT0FBTyxHQUFHMUcsQ0FBQyxDQUFDLElBQUQsQ0FBakI7QUFDQSxVQUFNc0csSUFBSSxHQUFHSSxPQUFPLENBQUMvQixJQUFSLENBQWEsTUFBYixDQUFiOztBQUNBLFVBQUkyQixJQUFKLEVBQVU7QUFDTixZQUFNQyxLQUFLLEdBQUdHLE9BQU8sQ0FBQ3hCLEdBQVIsRUFBZCxDQURNLENBRU47O0FBQ0ExQyxRQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWTZELElBQVosSUFBcUJDLEtBQUssS0FBSyxJQUFWLElBQWtCQSxLQUFLLEtBQUtDLFNBQTdCLEdBQTBDQyxNQUFNLENBQUNGLEtBQUQsQ0FBaEQsR0FBMEQsRUFBOUU7QUFDSDtBQUNKLEtBUkQsRUFyQnVCLENBK0J2QjtBQUNBOztBQUNBL0QsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlrRSxNQUFaLEdBQXFCM0csQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JxQixRQUF0QixDQUErQixZQUEvQixDQUFyQixDQWpDdUIsQ0FtQ3ZCOztBQUNBLFFBQU11RixjQUFjLEdBQUc5RyxRQUFRLENBQUNHLFFBQVQsQ0FBa0JtRyxJQUFsQixDQUF1QixvQ0FBdkIsRUFBNkRTLE1BQTdELENBQW9FLFdBQXBFLENBQXZCOztBQUNBLFFBQUlELGNBQWMsQ0FBQ2pELE1BQWYsR0FBd0IsQ0FBNUIsRUFBK0I7QUFDM0JuQixNQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWXFFLG9CQUFaLEdBQW1DRixjQUFjLENBQUN2RixRQUFmLENBQXdCLFlBQXhCLENBQW5DO0FBQ0gsS0FGRCxNQUVPO0FBQ0htQixNQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWXFFLG9CQUFaLEdBQW1DLEtBQW5DO0FBQ0gsS0F6Q3NCLENBMkN2Qjs7O0FBQ0FoSCxJQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JtRyxJQUFsQixDQUF1QixnQkFBdkIsRUFBeUM3QixJQUF6QyxDQUE4QyxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDMUQsVUFBTXNDLE9BQU8sR0FBRy9HLENBQUMsQ0FBQ3lFLEdBQUQsQ0FBRCxDQUFPRSxJQUFQLENBQVksSUFBWixDQUFoQjtBQUNBLFVBQU1xQyxLQUFLLEdBQUdELE9BQU8sQ0FBQ0UsT0FBUixDQUFnQixPQUFoQixFQUF5QixFQUF6QixFQUE2QkEsT0FBN0IsQ0FBcUMsV0FBckMsRUFBa0QsRUFBbEQsQ0FBZCxDQUYwRCxDQUkxRDs7QUFDQSxVQUFNQyxTQUFTLEdBQUdsSCxDQUFDLENBQUN5RSxHQUFELENBQW5CO0FBQ0EsVUFBTTRCLE1BQU0sR0FBR2EsU0FBUyxDQUFDZCxJQUFWLENBQWUsd0JBQWYsQ0FBZjtBQUNBLFVBQU1lLFVBQVUsR0FBR0QsU0FBUyxDQUFDRSxRQUFWLENBQW1CLFVBQW5CLEtBQWtDZixNQUFNLENBQUNyQixJQUFQLENBQVksVUFBWixDQUFyRDs7QUFFQSxVQUFJbUMsVUFBSixFQUFnQjtBQUNaO0FBQ0EzRSxRQUFBQSxNQUFNLENBQUNDLElBQVAsZ0JBQW9CdUUsS0FBcEIsS0FBK0JYLE1BQU0sQ0FBQ3JCLElBQVAsQ0FBWSxTQUFaLE1BQTJCLElBQTFEO0FBQ0gsT0FIRCxNQUdPO0FBQ0g7QUFDQXhDLFFBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxnQkFBb0J1RSxLQUFwQixLQUErQkUsU0FBUyxDQUFDN0YsUUFBVixDQUFtQixZQUFuQixDQUEvQjtBQUNIO0FBQ0osS0FoQkQsRUE1Q3VCLENBOER2Qjs7QUFDQSxRQUFNZ0csYUFBYSxHQUFHckgsQ0FBQyxDQUFDLDBDQUFELENBQXZCOztBQUNBLFFBQUlxSCxhQUFhLENBQUMxRCxNQUFkLEdBQXVCLENBQTNCLEVBQThCO0FBQzFCbkIsTUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVk2RSxrQkFBWixHQUFpQ2IsTUFBTSxDQUFDWSxhQUFhLENBQUNuQyxHQUFkLEVBQUQsQ0FBdkM7QUFDSCxLQWxFc0IsQ0FvRXZCO0FBQ0E7OztBQUVBLFdBQU8xQyxNQUFQO0FBQ0gsR0F6WFk7O0FBMlhiO0FBQ0o7QUFDQTtBQUNBO0FBQ0krRSxFQUFBQSxlQS9YYSwyQkErWEdqRixRQS9YSCxFQStYYSxDQUN0QjtBQUNILEdBallZOztBQW1ZYjtBQUNKO0FBQ0E7QUFDSUosRUFBQUEsY0F0WWEsNEJBc1lJO0FBQ2JzRixJQUFBQSxJQUFJLENBQUN2SCxRQUFMLEdBQWdCSCxRQUFRLENBQUNHLFFBQXpCO0FBQ0F1SCxJQUFBQSxJQUFJLENBQUNDLEdBQUwsR0FBVyxHQUFYLENBRmEsQ0FFRzs7QUFDaEJELElBQUFBLElBQUksQ0FBQ2pILGFBQUwsR0FBcUJULFFBQVEsQ0FBQ1MsYUFBOUIsQ0FIYSxDQUdnQzs7QUFDN0NpSCxJQUFBQSxJQUFJLENBQUMxQixnQkFBTCxHQUF3QmhHLFFBQVEsQ0FBQ2dHLGdCQUFqQyxDQUphLENBSXNDOztBQUNuRDBCLElBQUFBLElBQUksQ0FBQ0QsZUFBTCxHQUF1QnpILFFBQVEsQ0FBQ3lILGVBQWhDLENBTGEsQ0FLb0M7O0FBQ2pEQyxJQUFBQSxJQUFJLENBQUNFLE1BQUwsR0FBYyxJQUFkLENBTmEsQ0FNTztBQUVwQjs7QUFDQUYsSUFBQUEsSUFBSSxDQUFDRyxXQUFMLENBQWlCQyxPQUFqQixHQUEyQixJQUEzQjtBQUNBSixJQUFBQSxJQUFJLENBQUNHLFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCQyxVQUE3QjtBQUNBTixJQUFBQSxJQUFJLENBQUNHLFdBQUwsQ0FBaUJJLFVBQWpCLEdBQThCLFlBQTlCLENBWGEsQ0FhYjs7QUFDQVAsSUFBQUEsSUFBSSxDQUFDUSxtQkFBTCxhQUE4QkMsYUFBOUI7QUFDQVQsSUFBQUEsSUFBSSxDQUFDVSxvQkFBTCxhQUErQkQsYUFBL0I7QUFFQVQsSUFBQUEsSUFBSSxDQUFDckcsVUFBTDtBQUNILEdBeFpZOztBQTBaYjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsaUJBN1phLCtCQTZaTztBQUNoQjBHLElBQUFBLFVBQVUsQ0FBQ0ssU0FBWCxDQUFxQixVQUFDN0YsUUFBRCxFQUFjO0FBQy9CLFVBQUlBLFFBQVEsQ0FBQ0UsTUFBVCxJQUFtQkYsUUFBUSxDQUFDRyxJQUFoQyxFQUFzQztBQUNsQzNDLFFBQUFBLFFBQVEsQ0FBQ3NJLFlBQVQsQ0FBc0I5RixRQUFRLENBQUNHLElBQS9CLEVBRGtDLENBR2xDOztBQUNBM0MsUUFBQUEsUUFBUSxDQUFDeUIsd0JBQVQsR0FKa0MsQ0FNbEM7O0FBQ0EsWUFBSWUsUUFBUSxDQUFDRyxJQUFULENBQWM0RixRQUFsQixFQUE0QjtBQUN4QnZJLFVBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1DLElBQWxCLENBQXVCLFdBQXZCLEVBQW9DLFdBQXBDLEVBQWlELEdBQWpEO0FBQ0F0QyxVQUFBQSxRQUFRLENBQUNRLG9CQUFULENBQThCK0IsSUFBOUI7QUFDSDtBQUNKLE9BWEQsTUFXTztBQUNITSxRQUFBQSxXQUFXLENBQUMyRixlQUFaLENBQTRCaEcsUUFBUSxDQUFDaUcsUUFBckM7QUFDSDtBQUNKLEtBZkQ7QUFnQkgsR0E5YVk7O0FBZ2JiO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxxQkFuYmEsaUNBbWJTL0YsSUFuYlQsRUFtYmU7QUFDeEI7QUFDQSxRQUFJLENBQUNBLElBQUksQ0FBQ2dHLFVBQU4sSUFBb0JoRyxJQUFJLENBQUNnRyxVQUFMLENBQWdCOUUsTUFBaEIsS0FBMkIsQ0FBbkQsRUFBc0Q7QUFFdEQsUUFBTStFLEtBQUssR0FBR2pHLElBQUksQ0FBQ2dHLFVBQUwsQ0FBZ0IsQ0FBaEIsQ0FBZCxDQUp3QixDQUlVO0FBRWxDOztBQUNBekksSUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEJvRSxJQUE1QixDQUFpQ3NFLEtBQUssQ0FBQ3BDLElBQU4sSUFBY29DLEtBQUssYUFBcEQ7QUFDQTFJLElBQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCb0UsSUFBeEIsQ0FBNkJzRSxLQUFLLENBQUNDLGFBQU4sSUFBdUJELEtBQUssQ0FBQ0UsTUFBN0IsSUFBdUMsR0FBcEUsRUFSd0IsQ0FVeEI7O0FBQ0EsUUFBTUMsVUFBVSxHQUFHSCxLQUFLLENBQUNJLGFBQU4sSUFBdUJKLEtBQUssQ0FBQ0ssTUFBN0IsSUFBdUMsRUFBMUQ7QUFDQSxRQUFNQyxVQUFVLEdBQUdsSixRQUFRLENBQUNtSixhQUFULENBQXVCSixVQUF2QixDQUFuQjtBQUNBN0ksSUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEJvRSxJQUE1QixXQUFvQ3lFLFVBQXBDLGdCQUFvREcsVUFBcEQ7QUFFQWhKLElBQUFBLENBQUMsQ0FBQyx5QkFBRCxDQUFELENBQTZCb0UsSUFBN0IsQ0FBa0NzRSxLQUFLLENBQUNRLGNBQU4sSUFBd0JSLEtBQUssQ0FBQ1MsT0FBOUIsSUFBeUMsR0FBM0UsRUFmd0IsQ0FpQnhCOztBQUNBbkosSUFBQUEsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEJvSixJQUExQjtBQUNILEdBdGNZOztBQXdjYjtBQUNKO0FBQ0E7QUFDSUgsRUFBQUEsYUEzY2EseUJBMmNDSSxJQTNjRCxFQTJjTztBQUNoQixRQUFNQyxJQUFJLEdBQUcsRUFBRSxZQUFNLEtBQUtELElBQVgsSUFBbUIsQ0FBckIsQ0FBYjtBQUNBLFdBQU8sQ0FDRkMsSUFBSSxLQUFLLEVBQVYsR0FBZ0IsR0FEYixFQUVGQSxJQUFJLEtBQUssRUFBVixHQUFnQixHQUZiLEVBR0ZBLElBQUksS0FBSyxDQUFWLEdBQWUsR0FIWixFQUlIQSxJQUFJLEdBQUcsR0FKSixFQUtMQyxJQUxLLENBS0EsR0FMQSxDQUFQO0FBTUgsR0FuZFk7O0FBcWRiO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxtQkF4ZGEsK0JBd2RPL0csSUF4ZFAsRUF3ZGE7QUFDdEIsUUFBTWdILEtBQUssR0FBR3pKLENBQUMsQ0FBQyxzQkFBRCxDQUFmO0FBQ0EsUUFBTTBKLFFBQVEsR0FBRzFKLENBQUMsQ0FBQyx5QkFBRCxDQUFsQixDQUZzQixDQUl0Qjs7QUFDQXlKLElBQUFBLEtBQUssQ0FBQ0UsS0FBTjtBQUNBRCxJQUFBQSxRQUFRLENBQUNDLEtBQVQsR0FOc0IsQ0FRdEI7O0FBQ0FsSCxJQUFBQSxJQUFJLENBQUNnRyxVQUFMLENBQWdCbUIsT0FBaEIsQ0FBd0IsVUFBQ2xCLEtBQUQsRUFBUWxFLEtBQVIsRUFBa0I7QUFDdEMsVUFBTXFGLEtBQUssR0FBR25CLEtBQUssQ0FBQ29CLEVBQXBCO0FBQ0EsVUFBTUMsUUFBUSxhQUFNckIsS0FBSyxDQUFDcEMsSUFBTixJQUFjb0MsS0FBSyxhQUF6QixlQUF3Q0EsS0FBSyxhQUE3QyxTQUEwREEsS0FBSyxDQUFDc0IsTUFBTixLQUFpQixHQUFqQixJQUF3QnRCLEtBQUssQ0FBQ3NCLE1BQU4sS0FBaUIsQ0FBekMsY0FBaUR0QixLQUFLLENBQUNzQixNQUF2RCxJQUFrRSxFQUE1SCxNQUFkO0FBQ0EsVUFBTUMsUUFBUSxHQUFHekYsS0FBSyxLQUFLLENBQTNCLENBSHNDLENBS3RDOztBQUNBaUYsTUFBQUEsS0FBSyxDQUFDUyxNQUFOLDZDQUNxQkQsUUFBUSxHQUFHLFFBQUgsR0FBYyxFQUQzQywyQkFDNERKLEtBRDVELHNDQUVVRSxRQUZWLDJDQU5zQyxDQVl0QztBQUNBOztBQUNBLFVBQU1JLFNBQVMsR0FBR0MsUUFBUSxDQUFDMUIsS0FBSyxDQUFDc0IsTUFBUCxFQUFlLEVBQWYsQ0FBUixHQUE2QixDQUEvQztBQUNBLFVBQU1LLFlBQVksR0FBR0YsU0FBUyxzR0FDNENOLEtBRDVDLGtFQUVNaEosZUFBZSxDQUFDeUoseUJBRnRCLDRDQUkxQixFQUpKO0FBTUFaLE1BQUFBLFFBQVEsQ0FBQ1EsTUFBVCxDQUFnQnBLLFFBQVEsQ0FBQ3lLLG1CQUFULENBQTZCN0IsS0FBN0IsRUFBb0N1QixRQUFwQyxFQUE4Q0ksWUFBOUMsQ0FBaEI7QUFDSCxLQXRCRCxFQVRzQixDQWlDdEI7O0FBQ0EsUUFBSTVILElBQUksQ0FBQytILFFBQVQsRUFBbUI7QUFDZixVQUFNQSxRQUFRLEdBQUcvSCxJQUFJLENBQUMrSCxRQUF0QjtBQUNBQSxNQUFBQSxRQUFRLENBQUNWLEVBQVQsR0FBYyxDQUFkLENBRmUsQ0FJZjs7QUFDQUwsTUFBQUEsS0FBSyxDQUFDUyxNQUFOLDZJQUxlLENBV2Y7O0FBQ0FSLE1BQUFBLFFBQVEsQ0FBQ1EsTUFBVCxDQUFnQnBLLFFBQVEsQ0FBQzJLLGtCQUFULENBQTRCRCxRQUE1QixFQUFzQy9ILElBQUksQ0FBQ2dHLFVBQTNDLENBQWhCLEVBWmUsQ0FjZjs7QUFDQSxVQUFNaUMsa0JBQWtCLEdBQUcsRUFBM0I7QUFDQWpJLE1BQUFBLElBQUksQ0FBQ2dHLFVBQUwsQ0FBZ0JtQixPQUFoQixDQUF3QixVQUFBbEIsS0FBSyxFQUFJO0FBQzdCLFlBQUksQ0FBQ2dDLGtCQUFrQixDQUFDaEMsS0FBSyxhQUFOLENBQXZCLEVBQTBDO0FBQ3RDZ0MsVUFBQUEsa0JBQWtCLENBQUNoQyxLQUFLLGFBQU4sQ0FBbEIsR0FBc0M7QUFDbENuQyxZQUFBQSxLQUFLLEVBQUVtQyxLQUFLLENBQUNvQixFQUFOLENBQVNhLFFBQVQsRUFEMkI7QUFFbEN2RyxZQUFBQSxJQUFJLEVBQUVzRSxLQUFLLGFBRnVCO0FBR2xDcEMsWUFBQUEsSUFBSSxFQUFFb0MsS0FBSztBQUh1QixXQUF0QztBQUtIO0FBQ0osT0FSRDtBQVVBLFVBQU1rQyx3QkFBd0IsR0FBRzVFLE1BQU0sQ0FBQzZFLE1BQVAsQ0FBY0gsa0JBQWQsQ0FBakM7QUFFQUksTUFBQUEsc0JBQXNCLENBQUNDLGFBQXZCLENBQXFDLGFBQXJDLEVBQW9EO0FBQUVDLFFBQUFBLFdBQVcsRUFBRTtBQUFmLE9BQXBELEVBQXlFO0FBQ3JFQyxRQUFBQSxhQUFhLEVBQUVMLHdCQURzRDtBQUVyRU0sUUFBQUEsV0FBVyxFQUFFckssZUFBZSxDQUFDc0ssa0JBRndDO0FBR3JFQyxRQUFBQSxVQUFVLEVBQUU7QUFIeUQsT0FBekU7QUFLSCxLQW5FcUIsQ0FxRXRCOzs7QUFDQTNJLElBQUFBLElBQUksQ0FBQ2dHLFVBQUwsQ0FBZ0JtQixPQUFoQixDQUF3QixVQUFDbEIsS0FBRCxFQUFXO0FBQy9CLFVBQU0yQyxTQUFTLG9CQUFhM0MsS0FBSyxDQUFDb0IsRUFBbkIsQ0FBZjtBQUNBLFVBQU13QixRQUFRLEdBQUcsRUFBakIsQ0FGK0IsQ0FHL0I7O0FBQ0FBLE1BQUFBLFFBQVEsQ0FBQ0QsU0FBRCxDQUFSLEdBQXNCNUUsTUFBTSxDQUFDaUMsS0FBSyxDQUFDSyxNQUFOLElBQWdCLElBQWpCLENBQTVCO0FBRUErQixNQUFBQSxzQkFBc0IsQ0FBQ0MsYUFBdkIsQ0FBcUNNLFNBQXJDLEVBQWdEQyxRQUFoRCxFQUEwRDtBQUN0REwsUUFBQUEsYUFBYSxFQUFFbkwsUUFBUSxDQUFDeUwscUJBQVQsRUFEdUM7QUFFdERMLFFBQUFBLFdBQVcsRUFBRXJLLGVBQWUsQ0FBQzJLLG9CQUZ5QjtBQUd0REosUUFBQUEsVUFBVSxFQUFFLEtBSDBDO0FBSXRESyxRQUFBQSxpQkFBaUIsRUFBRSxDQUFDLFFBQUQsQ0FKbUMsQ0FJdkI7O0FBSnVCLE9BQTFEO0FBTUgsS0FaRCxFQXRFc0IsQ0FvRnRCOztBQUNBLFFBQUloSixJQUFJLENBQUMrSCxRQUFULEVBQW1CO0FBQ2ZNLE1BQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQyxVQUFyQyxFQUFpRDtBQUFFVyxRQUFBQSxRQUFRLEVBQUU7QUFBWixPQUFqRCxFQUFxRTtBQUNqRVQsUUFBQUEsYUFBYSxFQUFFbkwsUUFBUSxDQUFDeUwscUJBQVQsRUFEa0Q7QUFFakVMLFFBQUFBLFdBQVcsRUFBRXJLLGVBQWUsQ0FBQzJLLG9CQUZvQztBQUdqRUosUUFBQUEsVUFBVSxFQUFFLEtBSHFEO0FBSWpFSyxRQUFBQSxpQkFBaUIsRUFBRSxDQUFDLFFBQUQsQ0FKOEMsQ0FJbEM7O0FBSmtDLE9BQXJFO0FBTUgsS0E1RnFCLENBOEZ0Qjs7O0FBQ0F6TCxJQUFBQSxDQUFDLENBQUMsNEJBQUQsQ0FBRCxDQUFnQzJMLEdBQWhDO0FBQ0EzTCxJQUFBQSxDQUFDLENBQUMsNEJBQUQsQ0FBRCxDQUFnQzRMLEtBQWhDLEdBQXdDekksT0FBeEMsQ0FBZ0QsT0FBaEQsRUFoR3NCLENBa0d0Qjs7QUFDQWhCLElBQUFBLG1CQUFtQixDQUFDMEosZ0JBQXBCLEdBbkdzQixDQXFHdEI7QUFDQTtBQUNBOztBQUNBN0wsSUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUI4TCxHQUF2QixDQUEyQixPQUEzQixFQUFvQ3JLLEVBQXBDLENBQXVDLE9BQXZDLEVBQWdELFVBQVNDLENBQVQsRUFBWTtBQUN4REEsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsVUFBTW9LLE9BQU8sR0FBRy9MLENBQUMsQ0FBQyxJQUFELENBQWpCO0FBQ0EsVUFBTWdNLFdBQVcsR0FBR0QsT0FBTyxDQUFDcEgsSUFBUixDQUFhLFlBQWIsQ0FBcEIsQ0FId0QsQ0FLeEQ7O0FBQ0EzRSxNQUFBQSxDQUFDLDZDQUFxQ2dNLFdBQXJDLFNBQUQsQ0FBdURDLE1BQXZELEdBTndELENBUXhEOztBQUNBLFVBQU1DLFdBQVcsR0FBR2xNLENBQUMsbURBQTJDZ00sV0FBM0MsU0FBckI7QUFDQUUsTUFBQUEsV0FBVyxDQUFDRCxNQUFaLEdBVndELENBWXhEOztBQUNBbk0sTUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCaUssTUFBbEIsa0RBQWdFOEIsV0FBaEUsd0JBYndELENBZXhEOztBQUNBLFVBQU1HLFNBQVMsR0FBR25NLENBQUMsQ0FBQyw2QkFBRCxDQUFELENBQWlDNEwsS0FBakMsRUFBbEI7O0FBQ0EsVUFBSU8sU0FBUyxDQUFDeEksTUFBVixHQUFtQixDQUF2QixFQUEwQjtBQUN0QndJLFFBQUFBLFNBQVMsQ0FBQ1IsR0FBVixDQUFjLFlBQWQsRUFBNEJRLFNBQVMsQ0FBQ3hILElBQVYsQ0FBZSxVQUFmLENBQTVCO0FBQ0gsT0FuQnVELENBcUJ4RDs7O0FBQ0EsVUFBSTZDLElBQUksQ0FBQzRFLGFBQVQsRUFBd0I7QUFDcEI1RSxRQUFBQSxJQUFJLENBQUM2RSxXQUFMO0FBQ0g7QUFDSixLQXpCRCxFQXhHc0IsQ0FtSXRCOztBQUNBck0sSUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JxQixRQUFwQixDQUE2QjtBQUN6QkMsTUFBQUEsUUFEeUIsc0JBQ2Q7QUFDUHhCLFFBQUFBLFFBQVEsQ0FBQ3lCLHdCQUFUO0FBQ0g7QUFId0IsS0FBN0IsRUFwSXNCLENBMEl0Qjs7QUFDQXZCLElBQUFBLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0JnQyxTQUFoQixDQUEwQjtBQUFDQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjLHFCQUFlO0FBQTdCLEtBQTFCLEVBM0lzQixDQTZJdEI7O0FBQ0FqQyxJQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0QjhMLEdBQTVCLENBQWdDLGNBQWhDLEVBQWdEckssRUFBaEQsQ0FBbUQsY0FBbkQsRUFBbUUsWUFBVztBQUMxRSxVQUFNNkssVUFBVSxHQUFHdE0sQ0FBQyxDQUFDLElBQUQsQ0FBcEI7QUFDQSxVQUFNZ00sV0FBVyxHQUFHTSxVQUFVLENBQUMzSCxJQUFYLENBQWdCLE1BQWhCLEVBQXdCc0MsT0FBeEIsQ0FBZ0MsU0FBaEMsRUFBMkMsRUFBM0MsQ0FBcEI7QUFDQSxVQUFNc0YsU0FBUyxHQUFHbkMsUUFBUSxDQUFDa0MsVUFBVSxDQUFDcEgsR0FBWCxFQUFELEVBQW1CLEVBQW5CLENBQVIsSUFBa0MsQ0FBcEQ7QUFDQSxVQUFNTixhQUFhLEdBQUc1RSxDQUFDLGlCQUFVZ00sV0FBVixlQUF2Qjs7QUFFQSxVQUFJTyxTQUFTLEdBQUcsQ0FBaEIsRUFBbUI7QUFDZjtBQUNBM0gsUUFBQUEsYUFBYSxDQUFDaEQsUUFBZCxDQUF1QixVQUF2QjtBQUNBZ0QsUUFBQUEsYUFBYSxDQUFDdkQsUUFBZCxDQUF1QixTQUF2QjtBQUNBdUQsUUFBQUEsYUFBYSxDQUFDdkQsUUFBZCxDQUF1QixjQUF2QjtBQUNBdUQsUUFBQUEsYUFBYSxDQUFDd0IsSUFBZCxDQUFtQixPQUFuQixFQUE0QnBCLElBQTVCLENBQWlDLFVBQWpDLEVBQTZDLElBQTdDO0FBQ0gsT0FORCxNQU1PO0FBQ0g7QUFDQUosUUFBQUEsYUFBYSxDQUFDckMsV0FBZCxDQUEwQixVQUExQjtBQUNBcUMsUUFBQUEsYUFBYSxDQUFDdkQsUUFBZCxDQUF1QixhQUF2QjtBQUNBdUQsUUFBQUEsYUFBYSxDQUFDd0IsSUFBZCxDQUFtQixPQUFuQixFQUE0QnBCLElBQTVCLENBQWlDLFVBQWpDLEVBQTZDLEtBQTdDO0FBQ0gsT0FqQnlFLENBa0IxRTs7O0FBQ0FsRixNQUFBQSxRQUFRLENBQUN5Qix3QkFBVDtBQUNILEtBcEJELEVBOUlzQixDQW9LdEI7O0FBQ0F2QixJQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0Qm1ELE9BQTVCLENBQW9DLFFBQXBDLEVBcktzQixDQXVLdEI7O0FBQ0FuRCxJQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQnFCLFFBQXJCLEdBeEtzQixDQTBLdEI7O0FBQ0FyQixJQUFBQSxDQUFDLENBQUMsa0NBQUQsQ0FBRCxDQUFzQzhMLEdBQXRDLENBQTBDLFFBQTFDLEVBQW9EckssRUFBcEQsQ0FBdUQsUUFBdkQsRUFBaUUsWUFBVztBQUN4RSxVQUFNK0ssbUJBQW1CLEdBQUd4TSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFrRixHQUFSLEVBQTVCLENBRHdFLENBR3hFOztBQUNBbEYsTUFBQUEsQ0FBQyxDQUFDLCtCQUFELENBQUQsQ0FBbUNxQyxJQUFuQyxHQUp3RSxDQU14RTs7QUFDQXJDLE1BQUFBLENBQUMsOEJBQXVCd00sbUJBQXZCLEVBQUQsQ0FBK0NwRCxJQUEvQyxHQVB3RSxDQVN4RTs7QUFDQXBKLE1BQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCdUUsSUFBNUIsQ0FBaUMsVUFBQ0MsS0FBRCxFQUFRbUgsR0FBUixFQUFnQjtBQUM3QyxZQUFNYyxJQUFJLEdBQUd6TSxDQUFDLENBQUMyTCxHQUFELENBQWQ7QUFDQSxZQUFNOUIsS0FBSyxHQUFHNEMsSUFBSSxDQUFDOUgsSUFBTCxDQUFVLFVBQVYsQ0FBZCxDQUY2QyxDQUk3Qzs7QUFDQThILFFBQUFBLElBQUksQ0FBQ3JHLElBQUwsQ0FBVSxhQUFWLEVBQXlCNkYsTUFBekIsR0FMNkMsQ0FPN0M7O0FBQ0EsWUFBSXBDLEtBQUssS0FBSzJDLG1CQUFkLEVBQW1DO0FBQy9CQyxVQUFBQSxJQUFJLENBQUNDLE9BQUwsQ0FBYSw0QkFBYjtBQUNIO0FBQ0osT0FYRCxFQVZ3RSxDQXVCeEU7O0FBQ0EsVUFBSWxGLElBQUksQ0FBQzRFLGFBQVQsRUFBd0I7QUFDcEI1RSxRQUFBQSxJQUFJLENBQUM2RSxXQUFMO0FBQ0g7QUFDSixLQTNCRCxFQTNLc0IsQ0F3TXRCOztBQUNBck0sSUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0I4TCxHQUFwQixDQUF3QixtQkFBeEIsRUFBNkNySyxFQUE3QyxDQUFnRCxtQkFBaEQsRUFBcUUsWUFBVztBQUM1RSxVQUFNeUYsU0FBUyxHQUFHbEgsQ0FBQyxDQUFDLElBQUQsQ0FBbkI7QUFDQSxVQUFNZ00sV0FBVyxHQUFHOUUsU0FBUyxDQUFDdkMsSUFBVixDQUFlLElBQWYsRUFBcUJzQyxPQUFyQixDQUE2QixPQUE3QixFQUFzQyxFQUF0QyxFQUEwQ0EsT0FBMUMsQ0FBa0QsV0FBbEQsRUFBK0QsRUFBL0QsQ0FBcEI7QUFDQSxVQUFNcEMsYUFBYSxHQUFHcUMsU0FBUyxDQUFDN0YsUUFBVixDQUFtQixZQUFuQixDQUF0QixDQUg0RSxDQUs1RTs7QUFDQSxVQUFNc0wsZ0JBQWdCLEdBQUczTSxDQUFDLDhCQUF1QmdNLFdBQXZCLEVBQTFCO0FBQ0EsVUFBTVksaUJBQWlCLEdBQUdELGdCQUFnQixDQUFDdkcsSUFBakIsQ0FBc0IsbUZBQXRCLENBQTFCOztBQUVBLFVBQUl2QixhQUFKLEVBQW1CO0FBQ2Y7QUFDQStILFFBQUFBLGlCQUFpQixDQUFDNUgsSUFBbEIsQ0FBdUIsVUFBdkIsRUFBbUMsSUFBbkM7QUFDQTRILFFBQUFBLGlCQUFpQixDQUFDM0gsT0FBbEIsQ0FBMEIsUUFBMUIsRUFBb0NyRCxRQUFwQyxDQUE2QyxVQUE3QztBQUNILE9BSkQsTUFJTztBQUNIO0FBQ0FnTCxRQUFBQSxpQkFBaUIsQ0FBQzVILElBQWxCLENBQXVCLFVBQXZCLEVBQW1DLEtBQW5DO0FBQ0E0SCxRQUFBQSxpQkFBaUIsQ0FBQzNILE9BQWxCLENBQTBCLFFBQTFCLEVBQW9DMUMsV0FBcEMsQ0FBZ0QsVUFBaEQ7QUFDSDtBQUNKLEtBbEJELEVBek1zQixDQTZOdEI7O0FBQ0EsUUFBTThFLGFBQWEsR0FBR3JILENBQUMsQ0FBQywwQ0FBRCxDQUF2Qjs7QUFDQSxRQUFJcUgsYUFBYSxDQUFDMUQsTUFBZCxHQUF1QixDQUEzQixFQUE4QjtBQUMxQjBELE1BQUFBLGFBQWEsQ0FBQ2xFLE9BQWQsQ0FBc0IsUUFBdEI7QUFDSCxLQWpPcUIsQ0FtT3RCO0FBQ0E7OztBQUNBckQsSUFBQUEsUUFBUSxDQUFDeUIsd0JBQVQsR0FyT3NCLENBdU90QjtBQUNBOztBQUNBLFFBQUlpRyxJQUFJLENBQUM0RSxhQUFULEVBQXdCO0FBQ3BCO0FBQ0EsVUFBTVMseUJBQXlCLEdBQUdyRixJQUFJLENBQUNzRixpQkFBdkM7QUFDQSxVQUFNQyxtQkFBbUIsR0FBR3ZGLElBQUksQ0FBQzZFLFdBQWpDOztBQUVBN0UsTUFBQUEsSUFBSSxDQUFDc0YsaUJBQUwsR0FBeUIsWUFBVztBQUNoQztBQUNBLFlBQU1FLGNBQWMsR0FBR2xOLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1DLElBQWxCLENBQXVCLFlBQXZCLENBQXZCLENBRmdDLENBSWhDOztBQUNBLFlBQU02SyxZQUFZLEdBQUcsRUFBckI7QUFDQW5OLFFBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1HLElBQWxCLENBQXVCLHlCQUF2QixFQUFrRDdCLElBQWxELENBQXVELFlBQVc7QUFDOUQsY0FBTTJJLE1BQU0sR0FBR2xOLENBQUMsQ0FBQyxJQUFELENBQWhCO0FBQ0EsY0FBTXNHLElBQUksR0FBRzRHLE1BQU0sQ0FBQ3ZJLElBQVAsQ0FBWSxNQUFaLEtBQXVCdUksTUFBTSxDQUFDdkksSUFBUCxDQUFZLElBQVosQ0FBcEM7O0FBQ0EsY0FBSTJCLElBQUosRUFBVTtBQUNOLGdCQUFJNEcsTUFBTSxDQUFDdkksSUFBUCxDQUFZLE1BQVosTUFBd0IsVUFBNUIsRUFBd0M7QUFDcENzSSxjQUFBQSxZQUFZLENBQUMzRyxJQUFELENBQVosR0FBcUI0RyxNQUFNLENBQUNDLEVBQVAsQ0FBVSxVQUFWLENBQXJCO0FBQ0gsYUFGRCxNQUVPLElBQUlELE1BQU0sQ0FBQ3ZJLElBQVAsQ0FBWSxNQUFaLE1BQXdCLE9BQTVCLEVBQXFDO0FBQ3hDLGtCQUFJdUksTUFBTSxDQUFDQyxFQUFQLENBQVUsVUFBVixDQUFKLEVBQTJCO0FBQ3ZCRixnQkFBQUEsWUFBWSxDQUFDM0csSUFBRCxDQUFaLEdBQXFCNEcsTUFBTSxDQUFDaEksR0FBUCxFQUFyQjtBQUNIO0FBQ0osYUFKTSxNQUlBO0FBQ0grSCxjQUFBQSxZQUFZLENBQUMzRyxJQUFELENBQVosR0FBcUI0RyxNQUFNLENBQUNoSSxHQUFQLEVBQXJCO0FBQ0g7QUFDSjtBQUNKLFNBZEQsRUFOZ0MsQ0FzQmhDOztBQUNBc0MsUUFBQUEsSUFBSSxDQUFDNEYsYUFBTCxHQUFxQnBILE1BQU0sQ0FBQ0MsTUFBUCxDQUFjLEVBQWQsRUFBa0IrRyxjQUFsQixFQUFrQ0MsWUFBbEMsQ0FBckI7QUFDSCxPQXhCRDs7QUEwQkF6RixNQUFBQSxJQUFJLENBQUM2RSxXQUFMLEdBQW1CLFlBQVc7QUFDMUI7QUFDQSxZQUFNVyxjQUFjLEdBQUdsTixRQUFRLENBQUNHLFFBQVQsQ0FBa0JtQyxJQUFsQixDQUF1QixZQUF2QixDQUF2QixDQUYwQixDQUkxQjs7QUFDQSxZQUFNNkssWUFBWSxHQUFHLEVBQXJCO0FBQ0FuTixRQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JtRyxJQUFsQixDQUF1Qix5QkFBdkIsRUFBa0Q3QixJQUFsRCxDQUF1RCxZQUFXO0FBQzlELGNBQU0ySSxNQUFNLEdBQUdsTixDQUFDLENBQUMsSUFBRCxDQUFoQjtBQUNBLGNBQU1zRyxJQUFJLEdBQUc0RyxNQUFNLENBQUN2SSxJQUFQLENBQVksTUFBWixLQUF1QnVJLE1BQU0sQ0FBQ3ZJLElBQVAsQ0FBWSxJQUFaLENBQXBDOztBQUNBLGNBQUkyQixJQUFKLEVBQVU7QUFDTixnQkFBSTRHLE1BQU0sQ0FBQ3ZJLElBQVAsQ0FBWSxNQUFaLE1BQXdCLFVBQTVCLEVBQXdDO0FBQ3BDc0ksY0FBQUEsWUFBWSxDQUFDM0csSUFBRCxDQUFaLEdBQXFCNEcsTUFBTSxDQUFDQyxFQUFQLENBQVUsVUFBVixDQUFyQjtBQUNILGFBRkQsTUFFTyxJQUFJRCxNQUFNLENBQUN2SSxJQUFQLENBQVksTUFBWixNQUF3QixPQUE1QixFQUFxQztBQUN4QyxrQkFBSXVJLE1BQU0sQ0FBQ0MsRUFBUCxDQUFVLFVBQVYsQ0FBSixFQUEyQjtBQUN2QkYsZ0JBQUFBLFlBQVksQ0FBQzNHLElBQUQsQ0FBWixHQUFxQjRHLE1BQU0sQ0FBQ2hJLEdBQVAsRUFBckI7QUFDSDtBQUNKLGFBSk0sTUFJQTtBQUNIK0gsY0FBQUEsWUFBWSxDQUFDM0csSUFBRCxDQUFaLEdBQXFCNEcsTUFBTSxDQUFDaEksR0FBUCxFQUFyQjtBQUNIO0FBQ0o7QUFDSixTQWRELEVBTjBCLENBc0IxQjs7QUFDQSxZQUFNbUksYUFBYSxHQUFHckgsTUFBTSxDQUFDQyxNQUFQLENBQWMsRUFBZCxFQUFrQitHLGNBQWxCLEVBQWtDQyxZQUFsQyxDQUF0Qjs7QUFFQSxZQUFJSyxJQUFJLENBQUNDLFNBQUwsQ0FBZS9GLElBQUksQ0FBQzRGLGFBQXBCLE1BQXVDRSxJQUFJLENBQUNDLFNBQUwsQ0FBZUYsYUFBZixDQUEzQyxFQUEwRTtBQUN0RTdGLFVBQUFBLElBQUksQ0FBQ2dHLGFBQUwsQ0FBbUI1TCxRQUFuQixDQUE0QixVQUE1QjtBQUNBNEYsVUFBQUEsSUFBSSxDQUFDaUcsZUFBTCxDQUFxQjdMLFFBQXJCLENBQThCLFVBQTlCO0FBQ0gsU0FIRCxNQUdPO0FBQ0g0RixVQUFBQSxJQUFJLENBQUNnRyxhQUFMLENBQW1CakwsV0FBbkIsQ0FBK0IsVUFBL0I7QUFDQWlGLFVBQUFBLElBQUksQ0FBQ2lHLGVBQUwsQ0FBcUJsTCxXQUFyQixDQUFpQyxVQUFqQztBQUNIO0FBQ0osT0FoQ0Q7O0FBa0NBLFVBQUksT0FBT2lGLElBQUksQ0FBQ3NGLGlCQUFaLEtBQWtDLFVBQXRDLEVBQWtEO0FBQzlDdEYsUUFBQUEsSUFBSSxDQUFDc0YsaUJBQUw7QUFDSDs7QUFDRCxVQUFJLE9BQU90RixJQUFJLENBQUNrRyxTQUFaLEtBQTBCLFVBQTlCLEVBQTBDO0FBQ3RDbEcsUUFBQUEsSUFBSSxDQUFDa0csU0FBTDtBQUNIO0FBQ0o7QUFDSixHQXp3Qlk7O0FBMndCYjtBQUNKO0FBQ0E7QUFDSW5ELEVBQUFBLG1CQTl3QmEsK0JBOHdCTzdCLEtBOXdCUCxFQTh3QmN1QixRQTl3QmQsRUE4d0J3QkksWUE5d0J4QixFQTh3QnNDO0FBQy9DLFFBQU1QLEVBQUUsR0FBR3BCLEtBQUssQ0FBQ29CLEVBQWpCO0FBQ0EsUUFBTTZELG1CQUFtQixHQUFHakYsS0FBSyxDQUFDa0YsUUFBTixJQUFrQixLQUE5QyxDQUYrQyxDQUkvQzs7QUFDQSxRQUFNQyxpQkFBaUIsR0FBR0YsbUJBQW1CLEdBQUcsRUFBSCxHQUFRLHVCQUFyRDtBQUNBLFFBQU1HLGtCQUFrQixHQUFHcEYsS0FBSyxDQUFDcUYsSUFBTixHQUFhLFVBQWIsR0FBMEIsRUFBckQ7QUFDQSxRQUFNQyx1QkFBdUIsR0FBR3RGLEtBQUssQ0FBQ3FGLElBQU4sR0FBYSxVQUFiLEdBQTBCLEVBQTFEO0FBRUEsK0VBQ2lEOUQsUUFBUSxHQUFHLFFBQUgsR0FBYyxFQUR2RSwyQkFDd0ZILEVBRHhGLDBFQUUrQ0EsRUFGL0Msd0JBRTZEcEIsS0FBSyxhQUZsRSx3RkFLcUI3SCxlQUFlLENBQUNvTixnQkFMckMseUlBT2dEbkUsRUFQaEQsd0JBTzhEcEIsS0FBSyxDQUFDcEMsSUFBTixJQUFjLEVBUDVFLHdQQWE4RXdELEVBYjlFLDhHQWMyRUEsRUFkM0UsZ0JBY2tGNkQsbUJBQW1CLEdBQUcsU0FBSCxHQUFlLEVBZHBILGtGQWV3RDlNLGVBQWUsQ0FBQ3FOLG9CQUFoQixJQUF3QyxvQkFmaEcseVFBc0I4RHhGLEtBQUssQ0FBQ3NCLE1BQU4sR0FBZSxDQUFmLEdBQW1CLFdBQW5CLEdBQWlDLEVBdEIvRiwwQkFzQitHRixFQXRCL0csNEZBdUJ3REEsRUF2QnhELGdCQXVCK0RwQixLQUFLLENBQUNzQixNQUFOLEdBQWUsQ0FBZixHQUFtQixFQUFuQixHQUF5QnRCLEtBQUssQ0FBQ3FGLElBQU4sR0FBYSxTQUFiLEdBQXlCLEVBdkJqSCxjQXVCd0hyRixLQUFLLENBQUNzQixNQUFOLEdBQWUsQ0FBZixHQUFtQixVQUFuQixHQUFnQyxFQXZCeEoscURBd0I2Qm5KLGVBQWUsQ0FBQ3NOLFVBeEI3QyxtS0E2QjZDckUsRUE3QjdDLDhCQTZCaUVBLEVBN0JqRSxpRkErQm1EQSxFQS9CbkQsNEZBaUN5QmpKLGVBQWUsQ0FBQ3VOLFlBakN6Qyx1S0FtQ3dFdEUsRUFuQ3hFLHdCQW1Dc0ZwQixLQUFLLENBQUNFLE1BQU4sSUFBZ0IsRUFuQ3RHLDBKQXVDeUIvSCxlQUFlLENBQUN3TixjQXZDekMsbUpBeUNzRHZFLEVBekN0RCw4QkF5QzBFQSxFQXpDMUUsd0JBeUN3RnBCLEtBQUssQ0FBQ0ssTUFBTixJQUFnQixFQXpDeEcsNEtBK0NxQmxJLGVBQWUsQ0FBQ3lOLFNBL0NyQyw2SUFpRG9EeEUsRUFqRHBELHdCQWlEa0VwQixLQUFLLENBQUNzQixNQUFOLElBQWdCLEdBakRsRix5SEFxRHdDRixFQXJEeEMsZ0JBcUQrQytELGlCQXJEL0MseUVBc0RpRGhOLGVBQWUsQ0FBQzBOLG1CQUFoQixJQUF1QyxtQkF0RHhGLGlHQXlEeUIxTixlQUFlLENBQUMyTixXQUFoQixJQUErQixVQXpEeEQscUpBMkR3RDFFLEVBM0R4RCx3QkEyRHNFcEIsS0FBSyxDQUFDK0YsUUFBTixJQUFrQixFQTNEeEYsb0xBZ0V5QjVOLGVBQWUsQ0FBQzZOLFNBQWhCLElBQTZCLFFBaEV0RCxtSkFrRXNENUUsRUFsRXRELHdCQWtFb0VwQixLQUFLLENBQUNpRyxNQUFOLElBQWdCLEVBbEVwRix3TEF1RXlCOU4sZUFBZSxDQUFDK04sVUF2RXpDLGdGQXdFa0RaLHVCQXhFbEQsc0dBeUV5RWxFLEVBekV6RSx3QkF5RXVGcEIsS0FBSyxDQUFDUyxPQUFOLElBQWlCLEVBekV4RyxnQkF5RStHMkUsa0JBekUvRywwSkE4RXlCak4sZUFBZSxDQUFDZ08sYUE5RXpDLGdGQStFa0RiLHVCQS9FbEQseUdBZ0Y0RWxFLEVBaEY1RSx3QkFnRjBGcEIsS0FBSyxDQUFDb0csVUFBTixJQUFvQixFQWhGOUcsZ0JBZ0ZxSGhCLGtCQWhGckgsMEpBcUZ5QmpOLGVBQWUsQ0FBQ2tPLGVBckZ6QyxnRkFzRmtEZix1QkF0RmxELDJHQXVGOEVsRSxFQXZGOUUsd0JBdUY0RnBCLEtBQUssQ0FBQ3NHLFlBQU4sSUFBc0IsRUF2RmxILGdCQXVGeUhsQixrQkF2RnpILHdIQTRGVXpELFlBNUZWO0FBK0ZILEdBdDNCWTs7QUF3M0JiO0FBQ0o7QUFDQTtBQUNJSSxFQUFBQSxrQkEzM0JhLDhCQTIzQk1ELFFBMzNCTixFQTIzQmdCL0IsVUEzM0JoQixFQTIzQjRCO0FBQ3JDLFFBQU1xQixFQUFFLEdBQUcsQ0FBWDtBQUVBLDRGQUM0REEsRUFENUQsb0ZBR3FCakosZUFBZSxDQUFDc0ssa0JBSHJDLGdKQUt1RHJCLEVBTHZELCtCQUs0RUEsRUFMNUUsNElBVXFCakosZUFBZSxDQUFDb04sZ0JBVnJDLHlJQVlnRG5FLEVBWmhELDBCQVlnRUEsRUFaaEUsOFBBa0J5RUEsRUFsQnpFLDRGQW1Cd0RBLEVBbkJ4RCwrREFvQjZCakosZUFBZSxDQUFDc04sVUFwQjdDLG1LQXlCNkNyRSxFQXpCN0MsOEJBeUJpRUEsRUF6QmpFLGlGQTJCbURBLEVBM0JuRCw0RkE2QnlCakosZUFBZSxDQUFDdU4sWUE3QnpDLHVLQStCd0V0RSxFQS9CeEUscUtBbUN5QmpKLGVBQWUsQ0FBQ3dOLGNBbkN6QyxtSkFxQ3NEdkUsRUFyQ3RELDhCQXFDMEVBLEVBckMxRSx5TEEyQ3FCakosZUFBZSxDQUFDeU4sU0EzQ3JDLDZJQTZDb0R4RSxFQTdDcEQ7QUFrREgsR0FoN0JZOztBQWs3QmI7QUFDSjtBQUNBO0FBQ0E7QUFDSXlCLEVBQUFBLHFCQXQ3QmEsbUNBczdCVztBQUNwQjtBQUNBLFdBQU8sQ0FDSDtBQUFDaEYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY25DLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQURHLEVBRUg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FGRyxFQUdIO0FBQUNtQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjbkMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBSEcsRUFJSDtBQUFDbUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY25DLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQUpHLEVBS0g7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FMRyxFQU1IO0FBQUNtQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjbkMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBTkcsRUFPSDtBQUFDbUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY25DLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQVBHLEVBUUg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FSRyxFQVNIO0FBQUNtQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjbkMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBVEcsRUFVSDtBQUFDbUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY25DLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQVZHLEVBV0g7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FYRyxFQVlIO0FBQUNtQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjbkMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBWkcsRUFhSDtBQUFDbUMsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY25DLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWJHLEVBY0g7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FkRyxFQWVIO0FBQUNtQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjbkMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBZkcsRUFnQkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FoQkcsRUFpQkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FqQkcsRUFrQkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FsQkcsRUFtQkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FuQkcsRUFvQkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FwQkcsRUFxQkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0FyQkcsRUFzQkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0F0QkcsRUF1Qkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxJQUFSO0FBQWNuQyxNQUFBQSxJQUFJLEVBQUU7QUFBcEIsS0F2QkcsRUF3Qkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFuQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0F4QkcsRUF5Qkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFuQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0F6QkcsRUEwQkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFuQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0ExQkcsRUEyQkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFuQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0EzQkcsRUE0Qkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFuQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0E1QkcsRUE2Qkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFuQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0E3QkcsRUE4Qkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFuQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0E5QkcsRUErQkg7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFuQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0EvQkcsRUFnQ0g7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFuQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0FoQ0csRUFpQ0g7QUFBQ21DLE1BQUFBLEtBQUssRUFBRSxHQUFSO0FBQWFuQyxNQUFBQSxJQUFJLEVBQUU7QUFBbkIsS0FqQ0csQ0FBUDtBQW1DSCxHQTM5Qlk7O0FBNjlCYjtBQUNKO0FBQ0E7QUFDSWdFLEVBQUFBLFlBaCtCYSx3QkFnK0JBM0YsSUFoK0JBLEVBZytCTTtBQUNmO0FBQ0EsUUFBSUEsSUFBSSxDQUFDNEYsUUFBVCxFQUFtQjtBQUNmO0FBQ0F2SSxNQUFBQSxRQUFRLENBQUMwSSxxQkFBVCxDQUErQi9GLElBQS9CO0FBQ0gsS0FIRCxNQUdPO0FBQ0g7QUFDQTNDLE1BQUFBLFFBQVEsQ0FBQzBKLG1CQUFULENBQTZCL0csSUFBN0I7QUFDSCxLQVJjLENBVWY7OztBQUNBLFFBQUlBLElBQUksQ0FBQ3dNLEdBQVQsRUFBYztBQUNWO0FBQ0EsVUFBSXhNLElBQUksQ0FBQ3dNLEdBQUwsQ0FBU3RJLE1BQWIsRUFBcUI7QUFDakIzRyxRQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQnFCLFFBQXRCLENBQStCLE9BQS9CO0FBQ0gsT0FGRCxNQUVPO0FBQ0hyQixRQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQnFCLFFBQXRCLENBQStCLFNBQS9CO0FBQ0g7O0FBQ0R2QixNQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JtQyxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxXQUFwQyxFQUFpREssSUFBSSxDQUFDd00sR0FBTCxDQUFTek8sU0FBVCxJQUFzQixFQUF2RTtBQUNBVixNQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JtQyxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxhQUFwQyxFQUFtREssSUFBSSxDQUFDd00sR0FBTCxDQUFTak8sV0FBVCxJQUF3QixFQUEzRSxFQVJVLENBVVY7O0FBQ0EsVUFBTWtPLG1CQUFtQixHQUFHcFAsUUFBUSxDQUFDRyxRQUFULENBQWtCbUcsSUFBbEIsQ0FBdUIsb0NBQXZCLEVBQTZEUyxNQUE3RCxDQUFvRSxXQUFwRSxDQUE1Qjs7QUFDQSxVQUFJcUksbUJBQW1CLENBQUN2TCxNQUFwQixHQUE2QixDQUFqQyxFQUFvQztBQUNoQyxZQUFJbEIsSUFBSSxDQUFDd00sR0FBTCxDQUFTRSx1QkFBVCxJQUFvQzFNLElBQUksQ0FBQ3dNLEdBQUwsQ0FBU25JLG9CQUFqRCxFQUF1RTtBQUNuRW9JLFVBQUFBLG1CQUFtQixDQUFDN04sUUFBcEIsQ0FBNkIsT0FBN0I7QUFDSCxTQUZELE1BRU87QUFDSDZOLFVBQUFBLG1CQUFtQixDQUFDN04sUUFBcEIsQ0FBNkIsU0FBN0I7QUFDSDtBQUNKO0FBQ0osS0E5QmMsQ0FnQ2Y7OztBQUNBLFFBQUlvQixJQUFJLENBQUNZLEtBQVQsRUFBZ0I7QUFDWjtBQUNBO0FBQ0EyQyxNQUFBQSxNQUFNLENBQUNvSixJQUFQLENBQVkzTSxJQUFJLENBQUNZLEtBQWpCLEVBQXdCdUcsT0FBeEIsQ0FBZ0MsVUFBQXlGLEdBQUcsRUFBSTtBQUNuQyxZQUFNOUksS0FBSyxHQUFHOUQsSUFBSSxDQUFDWSxLQUFMLENBQVdnTSxHQUFYLENBQWQ7QUFDQXZQLFFBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1DLElBQWxCLENBQXVCLFdBQXZCLEVBQW9DaU4sR0FBcEMsRUFBeUM5SSxLQUF6QztBQUNILE9BSEQsRUFIWSxDQVFaOztBQUNBekcsTUFBQUEsUUFBUSxDQUFDc0QsaUJBQVQsQ0FBMkJYLElBQUksQ0FBQ1ksS0FBaEM7QUFDQXZELE1BQUFBLFFBQVEsQ0FBQ21FLGdCQUFULENBQTBCeEIsSUFBSSxDQUFDWSxLQUEvQjtBQUNILEtBNUNjLENBOENmOzs7QUFDQSxRQUFJWixJQUFJLENBQUNzRCxRQUFULEVBQW1CO0FBQ2ZDLE1BQUFBLE1BQU0sQ0FBQ29KLElBQVAsQ0FBWTNNLElBQUksQ0FBQ3NELFFBQWpCLEVBQTJCNkQsT0FBM0IsQ0FBbUMsVUFBQXlGLEdBQUcsRUFBSTtBQUN0Q3ZQLFFBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1DLElBQWxCLENBQXVCLFdBQXZCLEVBQW9DaU4sR0FBcEMsRUFBeUM1TSxJQUFJLENBQUNzRCxRQUFMLENBQWNzSixHQUFkLENBQXpDO0FBQ0gsT0FGRDtBQUdILEtBbkRjLENBcURmOzs7QUFDQSxRQUFJNU0sSUFBSSxDQUFDNk0sbUJBQVQsRUFBOEI7QUFDMUJuTixNQUFBQSxtQkFBbUIsQ0FBQ21OLG1CQUFwQixHQUEwQzdNLElBQUksQ0FBQzZNLG1CQUEvQztBQUNILEtBeERjLENBMERmOzs7QUFDQSxRQUFJN00sSUFBSSxDQUFDeUQsWUFBVCxFQUF1QjtBQUNuQi9ELE1BQUFBLG1CQUFtQixDQUFDb04sVUFBcEIsQ0FBK0I5TSxJQUFJLENBQUN5RCxZQUFwQztBQUNILEtBN0RjLENBK0RmO0FBQ0E7OztBQUNBLFFBQUlzQixJQUFJLENBQUM0RSxhQUFULEVBQXdCO0FBQ3BCNUUsTUFBQUEsSUFBSSxDQUFDZ0ksaUJBQUw7QUFDSDtBQUNKO0FBcGlDWSxDQUFqQjtBQXVpQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQXhQLENBQUMsQ0FBQ3lQLEVBQUYsQ0FBS3JOLElBQUwsQ0FBVTJELFFBQVYsQ0FBbUJyRixLQUFuQixDQUF5QmtJLE1BQXpCLEdBQWtDLFVBQUNyQyxLQUFELEVBQVc7QUFDekMsTUFBSS9ELE1BQU0sR0FBRyxJQUFiO0FBQ0EsTUFBTWtOLENBQUMsR0FBR25KLEtBQUssQ0FBQ3ZELEtBQU4sQ0FBWSw4Q0FBWixDQUFWOztBQUNBLE1BQUkwTSxDQUFDLElBQUksSUFBVCxFQUFlO0FBQ1hsTixJQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNILEdBRkQsTUFFTztBQUNILFNBQUssSUFBSW1OLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUcsQ0FBcEIsRUFBdUJBLENBQUMsSUFBSSxDQUE1QixFQUErQjtBQUMzQixVQUFNQyxDQUFDLEdBQUdGLENBQUMsQ0FBQ0MsQ0FBRCxDQUFYOztBQUNBLFVBQUlDLENBQUMsR0FBRyxHQUFSLEVBQWE7QUFDVHBOLFFBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7QUFDSjs7QUFDRCxRQUFJa04sQ0FBQyxDQUFDLENBQUQsQ0FBRCxHQUFPLEVBQVgsRUFBZTtBQUNYbE4sTUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDtBQUNKOztBQUNELFNBQU9BLE1BQVA7QUFDSCxDQWpCRDtBQW1CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQXhDLENBQUMsQ0FBQ3lQLEVBQUYsQ0FBS3JOLElBQUwsQ0FBVTJELFFBQVYsQ0FBbUJyRixLQUFuQixDQUF5Qm1QLHNCQUF6QixHQUFrRCxVQUFDdEosS0FBRCxFQUFXO0FBQ3pELE1BQUkvRCxNQUFNLEdBQUcsSUFBYjtBQUNBLE1BQU1rTixDQUFDLEdBQUduSixLQUFLLENBQUN2RCxLQUFOLENBQVksd0RBQVosQ0FBVjs7QUFDQSxNQUFJME0sQ0FBQyxJQUFJLElBQVQsRUFBZTtBQUNYbE4sSUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSCxHQUZELE1BRU87QUFDSCxTQUFLLElBQUltTixDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHLENBQXBCLEVBQXVCQSxDQUFDLElBQUksQ0FBNUIsRUFBK0I7QUFDM0IsVUFBTUMsQ0FBQyxHQUFHRixDQUFDLENBQUNDLENBQUQsQ0FBWDs7QUFDQSxVQUFJQyxDQUFDLEdBQUcsR0FBUixFQUFhO0FBQ1RwTixRQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNIO0FBQ0o7O0FBQ0QsUUFBSWtOLENBQUMsQ0FBQyxDQUFELENBQUQsR0FBTyxFQUFYLEVBQWU7QUFDWGxOLE1BQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7QUFDSjs7QUFDRCxTQUFPQSxNQUFQO0FBQ0gsQ0FqQkQ7QUFvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQXhDLENBQUMsQ0FBQ3lQLEVBQUYsQ0FBS3JOLElBQUwsQ0FBVTJELFFBQVYsQ0FBbUJyRixLQUFuQixDQUF5Qm9QLFNBQXpCLEdBQXFDLFVBQUN2RCxTQUFELEVBQVl3RCxLQUFaLEVBQXNCO0FBQ3ZELE1BQUl2TixNQUFNLEdBQUcsSUFBYjtBQUNBLE1BQU1uQyxVQUFVLEdBQUcsRUFBbkI7QUFDQSxNQUFNMlAsU0FBUyxHQUFHbFEsUUFBUSxDQUFDRyxRQUFULENBQWtCbUMsSUFBbEIsQ0FBdUIsWUFBdkIsQ0FBbEI7O0FBQ0EsTUFBSTROLFNBQVMsQ0FBQ2hGLFdBQVYsS0FBMEJ4RSxTQUExQixJQUF1Q3dKLFNBQVMsQ0FBQ2hGLFdBQVYsR0FBd0IsQ0FBbkUsRUFBc0U7QUFDbEUsUUFBTWlGLFVBQVUsR0FBR0QsU0FBUyxxQkFBY0EsU0FBUyxDQUFDaEYsV0FBeEIsRUFBNUI7QUFDQTNLLElBQUFBLFVBQVUsQ0FBQzRQLFVBQUQsQ0FBVixHQUF5QixDQUFDRCxTQUFTLENBQUNFLFFBQVgsQ0FBekI7O0FBQ0EsUUFBSUYsU0FBUyxDQUFDRSxRQUFWLEtBQXVCLEVBQTNCLEVBQStCO0FBQzNCMU4sTUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDtBQUNKOztBQUNEeEMsRUFBQUEsQ0FBQyxDQUFDdUUsSUFBRixDQUFPeUwsU0FBUCxFQUFrQixVQUFDeEwsS0FBRCxFQUFRK0IsS0FBUixFQUFrQjtBQUNoQyxRQUFJL0IsS0FBSyxLQUFLLGFBQVYsSUFBMkJBLEtBQUssS0FBSyxVQUF6QyxFQUFxRDs7QUFDckQsUUFBSUEsS0FBSyxDQUFDMkwsT0FBTixDQUFjLFFBQWQsS0FBMkIsQ0FBL0IsRUFBa0M7QUFDOUIsVUFBTUMsT0FBTyxHQUFHSixTQUFTLHFCQUFjeEwsS0FBSyxDQUFDNkwsS0FBTixDQUFZLEdBQVosRUFBaUIsQ0FBakIsQ0FBZCxFQUF6Qjs7QUFDQSxVQUFJclEsQ0FBQyxDQUFDc1EsT0FBRixDQUFVL0osS0FBVixFQUFpQmxHLFVBQVUsQ0FBQytQLE9BQUQsQ0FBM0IsS0FBeUMsQ0FBekMsSUFDRzdELFNBQVMsS0FBS2hHLEtBRGpCLElBRUd3SixLQUFLLEtBQUt2TCxLQUFLLENBQUM2TCxLQUFOLENBQVksR0FBWixFQUFpQixDQUFqQixDQUZqQixFQUVzQztBQUNsQzdOLFFBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0gsT0FKRCxNQUlPO0FBQ0gsWUFBSSxFQUFFNE4sT0FBTyxJQUFJL1AsVUFBYixDQUFKLEVBQThCO0FBQzFCQSxVQUFBQSxVQUFVLENBQUMrUCxPQUFELENBQVYsR0FBc0IsRUFBdEI7QUFDSDs7QUFDRC9QLFFBQUFBLFVBQVUsQ0FBQytQLE9BQUQsQ0FBVixDQUFvQkcsSUFBcEIsQ0FBeUJoSyxLQUF6QjtBQUNIO0FBQ0o7QUFDSixHQWZEO0FBZ0JBLFNBQU8vRCxNQUFQO0FBQ0gsQ0E1QkQsQyxDQThCQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0F4QyxDQUFDLENBQUN5UCxFQUFGLENBQUtyTixJQUFMLENBQVUyRCxRQUFWLENBQW1CckYsS0FBbkIsQ0FBeUI4UCxhQUF6QixHQUF5QyxZQUFNO0FBQzNDLE1BQU1SLFNBQVMsR0FBR2xRLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQm1DLElBQWxCLENBQXVCLFlBQXZCLENBQWxCOztBQUNBLE1BQUk0TixTQUFTLENBQUNySixNQUFWLEtBQXFCLElBQXpCLEVBQStCO0FBQzNCLFFBQUlxSixTQUFTLENBQUNoUCxXQUFWLEtBQTBCLEVBQTFCLElBQWdDZ1AsU0FBUyxDQUFDeFAsU0FBVixLQUF3QixFQUE1RCxFQUFnRTtBQUM1RCxhQUFPLEtBQVA7QUFDSDtBQUNKOztBQUNELFNBQU8sSUFBUDtBQUNILENBUkQ7QUFVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQVIsQ0FBQyxDQUFDeVAsRUFBRixDQUFLck4sSUFBTCxDQUFVMkQsUUFBVixDQUFtQnJGLEtBQW5CLENBQXlCK1AsYUFBekIsR0FBeUMsVUFBQ2xLLEtBQUQsRUFBVztBQUNoRCxNQUFJLENBQUNBLEtBQUQsSUFBVUEsS0FBSyxLQUFLLEVBQXhCLEVBQTRCO0FBQ3hCLFdBQU8sSUFBUCxDQUR3QixDQUNYO0FBQ2hCLEdBSCtDLENBS2hEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0EsTUFBTW1LLGFBQWEsR0FBRywyRUFBdEI7QUFDQSxTQUFPQSxhQUFhLENBQUNDLElBQWQsQ0FBbUJwSyxLQUFuQixDQUFQO0FBQ0gsQ0FiRDtBQWdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQSxJQUFNcEUsbUJBQW1CLEdBQUc7QUFDeEJ5TyxFQUFBQSxNQUFNLEVBQUU1USxDQUFDLENBQUMsc0JBQUQsQ0FEZTtBQUV4QjZRLEVBQUFBLFFBQVEsRUFBRTdRLENBQUMsQ0FBQyx3QkFBRCxDQUZhO0FBR3hCOFEsRUFBQUEsVUFBVSxFQUFFOVEsQ0FBQyxDQUFDLGdCQUFELENBSFc7QUFJeEIrUSxFQUFBQSxlQUFlLEVBQUUsSUFKTztBQUt4QkMsRUFBQUEsaUJBQWlCLEVBQUUsSUFMSztBQU14QkMsRUFBQUEsTUFBTSxFQUFFLEVBTmdCO0FBT3hCM0IsRUFBQUEsbUJBQW1CLEVBQUUsRUFQRztBQU9DOztBQUV6QjtBQUNKO0FBQ0E7QUFDSW5PLEVBQUFBLFVBWndCLHdCQVlYO0FBQ1Q7QUFDQWdCLElBQUFBLG1CQUFtQixDQUFDNk8saUJBQXBCLEdBQXdDaFIsQ0FBQyxDQUFDLGtDQUFELENBQXpDO0FBQ0FtQyxJQUFBQSxtQkFBbUIsQ0FBQzRPLGVBQXBCLEdBQXNDL1EsQ0FBQyxDQUFDLGdDQUFELENBQXZDLENBSFMsQ0FLVDs7QUFDQW1DLElBQUFBLG1CQUFtQixDQUFDMEosZ0JBQXBCLEdBTlMsQ0FRVDs7QUFDQTFKLElBQUFBLG1CQUFtQixDQUFDK08scUJBQXBCLEdBVFMsQ0FXVDs7QUFDQS9PLElBQUFBLG1CQUFtQixDQUFDMk8sVUFBcEIsQ0FBK0JyUCxFQUEvQixDQUFrQyxPQUFsQyxFQUEyQyxVQUFDQyxDQUFELEVBQU87QUFDOUNBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBUSxNQUFBQSxtQkFBbUIsQ0FBQ2dQLFFBQXBCO0FBQ0gsS0FIRCxFQVpTLENBaUJUOztBQUNBblIsSUFBQUEsQ0FBQyxDQUFDb1IsUUFBRCxDQUFELENBQVkzUCxFQUFaLENBQWUsT0FBZixFQUF3Qix5QkFBeEIsRUFBbUQsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3REQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQVEsTUFBQUEsbUJBQW1CLENBQUNnUCxRQUFwQjtBQUNILEtBSEQsRUFsQlMsQ0F1QlQ7O0FBQ0FoUCxJQUFBQSxtQkFBbUIsQ0FBQ3lPLE1BQXBCLENBQTJCblAsRUFBM0IsQ0FBOEIsT0FBOUIsRUFBdUMsc0JBQXZDLEVBQStELFVBQUNDLENBQUQsRUFBTztBQUNsRUEsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EzQixNQUFBQSxDQUFDLENBQUMwQixDQUFDLENBQUMyUCxNQUFILENBQUQsQ0FBWXBNLE9BQVosQ0FBb0IsSUFBcEIsRUFBMEJnSCxNQUExQjtBQUNBOUosTUFBQUEsbUJBQW1CLENBQUNtUCxnQkFBcEI7QUFDQW5QLE1BQUFBLG1CQUFtQixDQUFDb1AsZ0JBQXBCO0FBQ0EvSixNQUFBQSxJQUFJLENBQUNnSyxXQUFMO0FBQ0gsS0FORCxFQXhCUyxDQWdDVDs7QUFDQXJQLElBQUFBLG1CQUFtQixDQUFDeU8sTUFBcEIsQ0FBMkJuUCxFQUEzQixDQUE4QixPQUE5QixFQUF1QyxvQkFBdkMsRUFBNkQsVUFBQ0MsQ0FBRCxFQUFPO0FBQ2hFQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxVQUFNOFAsVUFBVSxHQUFHelIsQ0FBQyxDQUFDMEIsQ0FBQyxDQUFDMlAsTUFBSCxDQUFELENBQVlwTSxPQUFaLENBQW9CLElBQXBCLENBQW5CO0FBQ0E5QyxNQUFBQSxtQkFBbUIsQ0FBQ3VQLFNBQXBCLENBQThCRCxVQUE5QjtBQUNILEtBSkQsRUFqQ1MsQ0F1Q1Q7O0FBQ0F0UCxJQUFBQSxtQkFBbUIsQ0FBQ3lPLE1BQXBCLENBQTJCblAsRUFBM0IsQ0FBOEIsY0FBOUIsRUFBOEMsb0RBQTlDLEVBQW9HLFlBQU07QUFDdEcrRixNQUFBQSxJQUFJLENBQUNnSyxXQUFMO0FBQ0gsS0FGRCxFQXhDUyxDQTRDVDs7QUFDQXJQLElBQUFBLG1CQUFtQixDQUFDeU8sTUFBcEIsQ0FBMkJuUCxFQUEzQixDQUE4QixPQUE5QixFQUF1QyxnQ0FBdkMsRUFBeUUsVUFBU0MsQ0FBVCxFQUFZO0FBQ2pGQSxNQUFBQSxDQUFDLENBQUNDLGNBQUYsR0FEaUYsQ0FHakY7O0FBQ0EsVUFBSWdRLFVBQVUsR0FBRyxFQUFqQjs7QUFDQSxVQUFJalEsQ0FBQyxDQUFDa1EsYUFBRixJQUFtQmxRLENBQUMsQ0FBQ2tRLGFBQUYsQ0FBZ0JDLGFBQW5DLElBQW9EblEsQ0FBQyxDQUFDa1EsYUFBRixDQUFnQkMsYUFBaEIsQ0FBOEJDLE9BQXRGLEVBQStGO0FBQzNGSCxRQUFBQSxVQUFVLEdBQUdqUSxDQUFDLENBQUNrUSxhQUFGLENBQWdCQyxhQUFoQixDQUE4QkMsT0FBOUIsQ0FBc0MsTUFBdEMsQ0FBYjtBQUNILE9BRkQsTUFFTyxJQUFJcFEsQ0FBQyxDQUFDbVEsYUFBRixJQUFtQm5RLENBQUMsQ0FBQ21RLGFBQUYsQ0FBZ0JDLE9BQXZDLEVBQWdEO0FBQ25ESCxRQUFBQSxVQUFVLEdBQUdqUSxDQUFDLENBQUNtUSxhQUFGLENBQWdCQyxPQUFoQixDQUF3QixNQUF4QixDQUFiO0FBQ0gsT0FGTSxNQUVBLElBQUlDLE1BQU0sQ0FBQ0YsYUFBUCxJQUF3QkUsTUFBTSxDQUFDRixhQUFQLENBQXFCQyxPQUFqRCxFQUEwRDtBQUM3REgsUUFBQUEsVUFBVSxHQUFHSSxNQUFNLENBQUNGLGFBQVAsQ0FBcUJDLE9BQXJCLENBQTZCLE1BQTdCLENBQWIsQ0FENkQsQ0FDVjtBQUN0RCxPQVhnRixDQWFqRjs7O0FBQ0EsVUFBTUUsV0FBVyxHQUFHTCxVQUFVLENBQUNNLElBQVgsR0FBa0JoTCxPQUFsQixDQUEwQixVQUExQixFQUFzQyxFQUF0QyxDQUFwQixDQWRpRixDQWdCakY7O0FBQ0EsVUFBTVosTUFBTSxHQUFHckcsQ0FBQyxDQUFDLElBQUQsQ0FBaEIsQ0FqQmlGLENBbUJqRjs7QUFDQXFHLE1BQUFBLE1BQU0sQ0FBQ3JFLFNBQVAsQ0FBaUIsUUFBakIsRUFwQmlGLENBc0JqRjs7QUFDQXFFLE1BQUFBLE1BQU0sQ0FBQ25CLEdBQVAsQ0FBVzhNLFdBQVgsRUF2QmlGLENBeUJqRjs7QUFDQUUsTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYjdMLFFBQUFBLE1BQU0sQ0FBQ3JFLFNBQVAsQ0FBaUI7QUFBQ0MsVUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBY2lKLFVBQUFBLFdBQVcsRUFBRTtBQUEzQixTQUFqQjtBQUNBN0UsUUFBQUEsTUFBTSxDQUFDbEQsT0FBUCxDQUFlLE9BQWY7QUFDQXFFLFFBQUFBLElBQUksQ0FBQ2dLLFdBQUw7QUFDSCxPQUpTLEVBSVAsRUFKTyxDQUFWO0FBS0gsS0EvQkQ7QUFnQ0gsR0F6RnVCOztBQTJGeEI7QUFDSjtBQUNBO0FBQ0lOLEVBQUFBLHFCQTlGd0IsbUNBOEZBO0FBQ3BCO0FBQ0EsUUFBSS9PLG1CQUFtQixDQUFDeU8sTUFBcEIsQ0FBMkJuTyxJQUEzQixDQUFnQyxVQUFoQyxDQUFKLEVBQWlEO0FBQzdDTixNQUFBQSxtQkFBbUIsQ0FBQ3lPLE1BQXBCLENBQTJCdUIsY0FBM0I7QUFDSCxLQUptQixDQU1wQjs7O0FBQ0FoUSxJQUFBQSxtQkFBbUIsQ0FBQ3lPLE1BQXBCLENBQTJCd0IsUUFBM0IsQ0FBb0M7QUFDaENDLE1BQUFBLE1BQU0sRUFBRSxrQkFBTTtBQUNWbFEsUUFBQUEsbUJBQW1CLENBQUNtUCxnQkFBcEI7QUFDQTlKLFFBQUFBLElBQUksQ0FBQ2dLLFdBQUw7QUFDSCxPQUorQjtBQUtoQ2MsTUFBQUEsVUFBVSxFQUFFO0FBTG9CLEtBQXBDO0FBT0gsR0E1R3VCOztBQThHeEI7QUFDSjtBQUNBO0FBQ0l6RyxFQUFBQSxnQkFqSHdCLDhCQWlITDtBQUNmO0FBQ0EsUUFBTTBHLGNBQWMsR0FBR3ZTLENBQUMsQ0FBQyw2QkFBRCxDQUFELENBQWlDd1MsR0FBakMsQ0FBcUMsZ0JBQXJDLEVBQXVEN08sTUFBOUU7O0FBQ0EsUUFBSTRPLGNBQWMsR0FBRyxDQUFyQixFQUF3QjtBQUNwQnBRLE1BQUFBLG1CQUFtQixDQUFDME8sUUFBcEIsQ0FBNkJ6SCxJQUE3QjtBQUNILEtBRkQsTUFFTztBQUNIakgsTUFBQUEsbUJBQW1CLENBQUMwTyxRQUFwQixDQUE2QnhPLElBQTdCO0FBQ0g7QUFDSixHQXpIdUI7O0FBMkh4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJcVAsRUFBQUEsU0EvSHdCLHFCQStIZEQsVUEvSGMsRUErSEY7QUFDbEIsUUFBTWdCLE9BQU8sR0FBR2hCLFVBQVUsQ0FBQzlNLElBQVgsQ0FBZ0IsZUFBaEIsQ0FBaEI7QUFDQSxRQUFNK04sZ0JBQWdCLDBCQUFtQkQsT0FBbkIsQ0FBdEI7QUFDQSxRQUFNRSxtQkFBbUIsNkJBQXNCRixPQUF0QixDQUF6QixDQUhrQixDQUtsQjs7QUFDQSxRQUFNRyxTQUFTLEdBQUc7QUFDZEMsTUFBQUEsT0FBTyxFQUFFcEIsVUFBVSxDQUFDckwsSUFBWCxDQUFnQixnQkFBaEIsRUFBa0NsQixHQUFsQyxFQURLO0FBRWQ2RCxNQUFBQSxNQUFNLEVBQUUvSSxDQUFDLFlBQUswUyxnQkFBTCxFQUFELENBQTBCeE4sR0FBMUIsRUFGTTtBQUdkaUUsTUFBQUEsT0FBTyxFQUFFc0ksVUFBVSxDQUFDckwsSUFBWCxDQUFnQixnQkFBaEIsRUFBa0NsQixHQUFsQyxFQUhLO0FBSWQsbUJBQVdsRixDQUFDLFlBQUsyUyxtQkFBTCxFQUFELENBQTZCek4sR0FBN0IsTUFBc0MsRUFKbkM7QUFLZDROLE1BQUFBLFdBQVcsRUFBRXJCLFVBQVUsQ0FBQ3JMLElBQVgsQ0FBZ0Isb0JBQWhCLEVBQXNDbEIsR0FBdEM7QUFMQyxLQUFsQixDQU5rQixDQWNsQjs7QUFDQS9DLElBQUFBLG1CQUFtQixDQUFDZ1AsUUFBcEIsQ0FBNkJ5QixTQUE3QixFQWZrQixDQWlCbEI7O0FBQ0F6USxJQUFBQSxtQkFBbUIsQ0FBQytPLHFCQUFwQjtBQUNILEdBbEp1Qjs7QUFvSnhCO0FBQ0o7QUFDQTtBQUNJSyxFQUFBQSxnQkF2SndCLDhCQXVKTDtBQUNmLFFBQU13QixhQUFhLEdBQUcvUyxDQUFDLENBQUMsWUFBRCxDQUF2Qjs7QUFDQSxRQUFJK1MsYUFBYSxDQUFDcFAsTUFBZCxLQUF5QixDQUE3QixFQUFnQztBQUM1QjtBQUNBeEIsTUFBQUEsbUJBQW1CLENBQUM2TyxpQkFBcEIsQ0FBc0M1SCxJQUF0QztBQUNBakgsTUFBQUEsbUJBQW1CLENBQUM0TyxlQUFwQixDQUFvQzFPLElBQXBDO0FBQ0gsS0FKRCxNQUlPO0FBQ0g7QUFDQUYsTUFBQUEsbUJBQW1CLENBQUM2TyxpQkFBcEIsQ0FBc0MzTyxJQUF0QztBQUNBRixNQUFBQSxtQkFBbUIsQ0FBQzRPLGVBQXBCLENBQW9DM0gsSUFBcEM7QUFDSDtBQUNKLEdBbEt1Qjs7QUFvS3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0krSCxFQUFBQSxRQXhLd0Isc0JBd0tHO0FBQUEsUUFBbEJ5QixTQUFrQix1RUFBTixJQUFNO0FBQ3ZCLFFBQU1JLFNBQVMsR0FBR2hULENBQUMsQ0FBQyxxQkFBRCxDQUFELENBQXlCaVQsSUFBekIsRUFBbEI7QUFDQSxRQUFNQyxPQUFPLEdBQUdGLFNBQVMsQ0FBQ0csS0FBVixDQUFnQixJQUFoQixDQUFoQjtBQUNBLFFBQU1WLE9BQU8sR0FBRyxDQUFBRyxTQUFTLFNBQVQsSUFBQUEsU0FBUyxXQUFULFlBQUFBLFNBQVMsQ0FBRTlJLEVBQVgsbUJBQXdCc0osSUFBSSxDQUFDQyxHQUFMLEVBQXhCLENBQWhCO0FBRUFILElBQUFBLE9BQU8sQ0FDRjNRLFdBREwsQ0FDaUIsb0JBRGpCLEVBRUtYLFFBRkwsQ0FFYyxXQUZkLEVBR0srQyxJQUhMLENBR1UsZUFIVixFQUcyQjhOLE9BSDNCLEVBSUtySixJQUpMLEdBTHVCLENBV3ZCOztBQUNBLFFBQUl3SixTQUFKLEVBQWU7QUFDWE0sTUFBQUEsT0FBTyxDQUFDOU0sSUFBUixDQUFhLGdCQUFiLEVBQStCbEIsR0FBL0IsQ0FBbUMwTixTQUFTLENBQUNDLE9BQTdDO0FBQ0FLLE1BQUFBLE9BQU8sQ0FBQzlNLElBQVIsQ0FBYSxnQkFBYixFQUErQmxCLEdBQS9CLENBQW1DME4sU0FBUyxDQUFDekosT0FBN0M7QUFDQStKLE1BQUFBLE9BQU8sQ0FBQzlNLElBQVIsQ0FBYSxvQkFBYixFQUFtQ2xCLEdBQW5DLENBQXVDME4sU0FBUyxDQUFDRSxXQUFWLElBQXlCLEVBQWhFO0FBQ0gsS0FoQnNCLENBa0J2Qjs7O0FBQ0EsUUFBTUMsYUFBYSxHQUFHL1MsQ0FBQyxDQUFDLFlBQUQsQ0FBdkI7O0FBQ0EsUUFBSStTLGFBQWEsQ0FBQ3BQLE1BQWQsS0FBeUIsQ0FBN0IsRUFBZ0M7QUFDNUJxUCxNQUFBQSxTQUFTLENBQUNNLEtBQVYsQ0FBZ0JKLE9BQWhCO0FBQ0gsS0FGRCxNQUVPO0FBQ0hILE1BQUFBLGFBQWEsQ0FBQ0UsSUFBZCxHQUFxQkssS0FBckIsQ0FBMkJKLE9BQTNCO0FBQ0gsS0F4QnNCLENBMEJ2Qjs7O0FBQ0EvUSxJQUFBQSxtQkFBbUIsQ0FBQ29SLHdCQUFwQixDQUE2Q0wsT0FBN0MsRUFBc0QsQ0FBQU4sU0FBUyxTQUFULElBQUFBLFNBQVMsV0FBVCxZQUFBQSxTQUFTLENBQUU3SixNQUFYLEtBQXFCLElBQTNFLEVBM0J1QixDQTZCdkI7O0FBQ0E1RyxJQUFBQSxtQkFBbUIsQ0FBQ3FSLDJCQUFwQixDQUFnRE4sT0FBaEQsRUFBeUQsQ0FBQU4sU0FBUyxTQUFULElBQUFBLFNBQVMsV0FBVCxZQUFBQSxTQUFTLGFBQVQsS0FBd0IsRUFBakYsRUE5QnVCLENBZ0N2Qjs7QUFDQU0sSUFBQUEsT0FBTyxDQUFDOU0sSUFBUixDQUFhLFlBQWIsRUFBMkJwRSxTQUEzQixDQUFxQztBQUFDQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjaUosTUFBQUEsV0FBVyxFQUFFO0FBQTNCLEtBQXJDO0FBRUEvSSxJQUFBQSxtQkFBbUIsQ0FBQ21QLGdCQUFwQjtBQUNBblAsSUFBQUEsbUJBQW1CLENBQUNvUCxnQkFBcEI7QUFDQS9KLElBQUFBLElBQUksQ0FBQ2dLLFdBQUw7QUFDSCxHQTlNdUI7O0FBZ054QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0krQixFQUFBQSx3QkFyTndCLG9DQXFOQ0UsSUFyTkQsRUFxTk9DLGFBck5QLEVBcU5zQjtBQUMxQyxRQUFNQyxVQUFVLEdBQUdGLElBQUksQ0FBQ3JOLElBQUwsQ0FBVSw0QkFBVixDQUFuQjtBQUNBLFFBQU13TixVQUFVLDBCQUFtQkgsSUFBSSxDQUFDOU8sSUFBTCxDQUFVLGVBQVYsQ0FBbkIsQ0FBaEI7QUFFQWdQLElBQUFBLFVBQVUsQ0FBQzdQLElBQVgsdUNBQTRDOFAsVUFBNUM7QUFFQTlJLElBQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQzZJLFVBQXJDLHNCQUNPQSxVQURQLEVBQ29CRixhQURwQixHQUVJO0FBQ0l6SSxNQUFBQSxhQUFhLEVBQUVuTCxRQUFRLENBQUN5TCxxQkFBVCxFQURuQjtBQUVJTCxNQUFBQSxXQUFXLEVBQUVySyxlQUFlLENBQUMySyxvQkFGakM7QUFHSUosTUFBQUEsVUFBVSxFQUFFLEtBSGhCO0FBSUlLLE1BQUFBLGlCQUFpQixFQUFFLENBQUMsUUFBRCxDQUp2QjtBQUtJbkssTUFBQUEsUUFBUSxFQUFFO0FBQUEsZUFBTWtHLElBQUksQ0FBQ2dLLFdBQUwsRUFBTjtBQUFBO0FBTGQsS0FGSjtBQVVILEdBck91Qjs7QUF1T3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWdDLEVBQUFBLDJCQTVPd0IsdUNBNE9JQyxJQTVPSixFQTRPVUMsYUE1T1YsRUE0T3lCO0FBQzdDLFFBQU1DLFVBQVUsR0FBR0YsSUFBSSxDQUFDck4sSUFBTCxDQUFVLCtCQUFWLENBQW5CO0FBQ0EsUUFBTXdOLFVBQVUsNkJBQXNCSCxJQUFJLENBQUM5TyxJQUFMLENBQVUsZUFBVixDQUF0QixDQUFoQjtBQUVBZ1AsSUFBQUEsVUFBVSxDQUFDN1AsSUFBWCx1Q0FBNEM4UCxVQUE1QyxZQUo2QyxDQU03Qzs7QUFDQSxRQUFNQyxPQUFPLElBQ1Q7QUFBRXROLE1BQUFBLEtBQUssRUFBRSxFQUFUO0FBQWFuQyxNQUFBQSxJQUFJLEVBQUV2RCxlQUFlLENBQUNpVCxPQUFoQixJQUEyQjtBQUE5QyxLQURTLDRCQUVOM1IsbUJBQW1CLENBQUNtTixtQkFBcEIsQ0FBd0N5RSxHQUF4QyxDQUE0QyxVQUFBckwsS0FBSztBQUFBLGFBQUs7QUFDckRuQyxRQUFBQSxLQUFLLEVBQUVtQyxLQUFLLENBQUNuQyxLQUR3QztBQUVyRG5DLFFBQUFBLElBQUksRUFBRXNFLEtBQUssQ0FBQ3NMO0FBRnlDLE9BQUw7QUFBQSxLQUFqRCxDQUZNLEVBQWIsQ0FQNkMsQ0FlN0M7O0FBQ0EsUUFBTTFJLFFBQVEsR0FBRyxFQUFqQjtBQUNBQSxJQUFBQSxRQUFRLENBQUNzSSxVQUFELENBQVIsR0FBdUJGLGFBQWEsSUFBSSxFQUF4QyxDQWpCNkMsQ0FpQkQ7O0FBRTVDNUksSUFBQUEsc0JBQXNCLENBQUNDLGFBQXZCLENBQXFDNkksVUFBckMsRUFDSXRJLFFBREosRUFFSTtBQUNJTCxNQUFBQSxhQUFhLEVBQUU0SSxPQURuQjtBQUVJM0ksTUFBQUEsV0FBVyxFQUFFckssZUFBZSxDQUFDc0ssa0JBRmpDO0FBR0lDLE1BQUFBLFVBQVUsRUFBRSxLQUhoQjtBQUlJOUosTUFBQUEsUUFBUSxFQUFFO0FBQUEsZUFBTWtHLElBQUksQ0FBQ2dLLFdBQUwsRUFBTjtBQUFBO0FBSmQsS0FGSjtBQVNILEdBeFF1Qjs7QUEwUXhCO0FBQ0o7QUFDQTtBQUNJRixFQUFBQSxnQkE3UXdCLDhCQTZRTDtBQUNmdFIsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQnVFLElBQWhCLENBQXFCLFVBQUNDLEtBQUQsRUFBUXlQLEdBQVIsRUFBZ0I7QUFDakNqVSxNQUFBQSxDQUFDLENBQUNpVSxHQUFELENBQUQsQ0FBT3RQLElBQVAsQ0FBWSxlQUFaLEVBQTZCSCxLQUFLLEdBQUcsQ0FBckM7QUFDSCxLQUZEO0FBR0gsR0FqUnVCOztBQW1SeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSStLLEVBQUFBLFVBdlJ3QixzQkF1UmIyRSxVQXZSYSxFQXVSRDtBQUNuQjtBQUNBbFUsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQmlNLE1BQWhCLEdBRm1CLENBSW5COztBQUNBLFFBQUlpSSxVQUFVLElBQUlBLFVBQVUsQ0FBQ3ZRLE1BQVgsR0FBb0IsQ0FBdEMsRUFBeUM7QUFDckN1USxNQUFBQSxVQUFVLENBQUN0SyxPQUFYLENBQW1CLFVBQUF1SyxLQUFLLEVBQUk7QUFDeEJoUyxRQUFBQSxtQkFBbUIsQ0FBQ2dQLFFBQXBCLENBQTZCZ0QsS0FBN0I7QUFDSCxPQUZEO0FBR0gsS0FKRCxNQUlPO0FBQ0g7QUFDQWhTLE1BQUFBLG1CQUFtQixDQUFDb1AsZ0JBQXBCO0FBQ0gsS0Faa0IsQ0FjbkI7OztBQUNBcFAsSUFBQUEsbUJBQW1CLENBQUMrTyxxQkFBcEI7QUFDSCxHQXZTdUI7O0FBeVN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJL0ssRUFBQUEsYUE3U3dCLDJCQTZTUjtBQUNaLFFBQU04SyxNQUFNLEdBQUcsRUFBZjtBQUNBalIsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQnVFLElBQWhCLENBQXFCLFVBQUNDLEtBQUQsRUFBUXlQLEdBQVIsRUFBZ0I7QUFDakMsVUFBTVIsSUFBSSxHQUFHelQsQ0FBQyxDQUFDaVUsR0FBRCxDQUFkO0FBQ0EsVUFBTXhCLE9BQU8sR0FBR2dCLElBQUksQ0FBQzlPLElBQUwsQ0FBVSxlQUFWLENBQWhCO0FBQ0EsVUFBTStOLGdCQUFnQiwwQkFBbUJELE9BQW5CLENBQXRCO0FBQ0EsVUFBTUUsbUJBQW1CLDZCQUFzQkYsT0FBdEIsQ0FBekI7QUFFQXhCLE1BQUFBLE1BQU0sQ0FBQ1YsSUFBUCxDQUFZO0FBQ1J6RyxRQUFBQSxFQUFFLEVBQUUySSxPQUFPLENBQUMyQixVQUFSLENBQW1CLE1BQW5CLElBQTZCLElBQTdCLEdBQW9DM0IsT0FEaEM7QUFFUkksUUFBQUEsT0FBTyxFQUFFWSxJQUFJLENBQUNyTixJQUFMLENBQVUsZ0JBQVYsRUFBNEJsQixHQUE1QixFQUZEO0FBR1I2RCxRQUFBQSxNQUFNLEVBQUUvSSxDQUFDLFlBQUswUyxnQkFBTCxFQUFELENBQTBCeE4sR0FBMUIsRUFIQTtBQUlSaUUsUUFBQUEsT0FBTyxFQUFFc0ssSUFBSSxDQUFDck4sSUFBTCxDQUFVLGdCQUFWLEVBQTRCbEIsR0FBNUIsRUFKRDtBQUtSLHFCQUFXbEYsQ0FBQyxZQUFLMlMsbUJBQUwsRUFBRCxDQUE2QnpOLEdBQTdCLE1BQXNDLEVBTHpDO0FBTVI0TixRQUFBQSxXQUFXLEVBQUVXLElBQUksQ0FBQ3JOLElBQUwsQ0FBVSxvQkFBVixFQUFnQ2xCLEdBQWhDLEVBTkw7QUFPUm1QLFFBQUFBLFFBQVEsRUFBRTdQLEtBQUssR0FBRztBQVBWLE9BQVo7QUFTSCxLQWZEO0FBZ0JBLFdBQU95TSxNQUFQO0FBQ0g7QUFoVXVCLENBQTVCO0FBbVVBO0FBQ0E7QUFDQTs7QUFDQWpSLENBQUMsQ0FBQ29SLFFBQUQsQ0FBRCxDQUFZa0QsS0FBWixDQUFrQixZQUFNO0FBQ3BCeFUsRUFBQUEsUUFBUSxDQUFDcUIsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN5c2luZm9BUEksIE5ldHdvcmtBUEksIFVzZXJNZXNzYWdlLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBuZXR3b3JrIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBuZXR3b3Jrc1xuICovXG5jb25zdCBuZXR3b3JrcyA9IHtcbiAgICAkZ2V0TXlJcEJ1dHRvbjogJCgnI2dldG15aXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNuZXR3b3JrLWZvcm0nKSxcblxuICAgICRkcm9wRG93bnM6ICQoJyNuZXR3b3JrLWZvcm0gLmRyb3Bkb3duJyksXG4gICAgJGV4dGlwYWRkcjogJCgnI2V4dGlwYWRkcicpLFxuICAgICRpcGFkZHJlc3NJbnB1dDogJCgnLmlwYWRkcmVzcycpLFxuICAgIHZsYW5zQXJyYXk6IHt9LFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnRzIHdpdGggd2Ugc2hvdWxkIGhpZGUgZnJvbSB0aGUgZm9ybSBmb3IgZG9ja2VyIGluc3RhbGxhdGlvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub3RTaG93T25Eb2NrZXJEaXZzOiAkKCcuZG8tbm90LXNob3ctaWYtZG9ja2VyJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0aXBhZGRyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyV2l0aFBvcnRPcHRpb25hbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGhvc3RuYW1lOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAndXNlbmF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd2YWxpZEhvc3RuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVIb3N0bmFtZUludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gTG9hZCBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAgICBuZXR3b3Jrcy5sb2FkQ29uZmlndXJhdGlvbigpO1xuXG4gICAgICAgIC8vIEhhbmRsZXMgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgJ3VzZW5hdC1jaGVja2JveCcuXG4gICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBuZXR3b3Jrcy4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gREhDUCBjaGVja2JveCBoYW5kbGVycyB3aWxsIGJlIGJvdW5kIGFmdGVyIHRhYnMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHlcblxuICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFN5c2luZm9BUEkuZ2V0RXh0ZXJuYWxJcEluZm8obmV0d29ya3MuY2JBZnRlckdldEV4dGVybmFsSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG4gICAgICAgIG5ldHdvcmtzLiRpcGFkZHJlc3NJbnB1dC5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICAvLyBBcHBseSBJUCBtYXNrIGZvciBleHRlcm5hbCBJUCBhZGRyZXNzIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgbmV0d29ya3MuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN0YXRpYyByb3V0ZXMgbWFuYWdlclxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBIaWRlIHN0YXRpYyByb3V0ZXMgc2VjdGlvbiBpbiBEb2NrZXIgKG1hbmFnZWQgdmlhIGRvLW5vdC1zaG93LWlmLWRvY2tlciBjbGFzcylcbiAgICAgICAgaWYgKG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ2lzLWRvY2tlcicpPT09XCIxXCIpIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRub3RTaG93T25Eb2NrZXJEaXZzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBnZXR0aW5nIHRoZSBleHRlcm5hbCBJUCBmcm9tIGEgcmVtb3RlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXIuIElmIGZhbHNlLCBpbmRpY2F0ZXMgYW4gZXJyb3Igb2NjdXJyZWQuXG4gICAgICovXG4gICAgY2JBZnRlckdldEV4dGVybmFsSXAocmVzcG9uc2UpIHtcbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8ICFyZXNwb25zZS5yZXN1bHQgfHwgIXJlc3BvbnNlLmRhdGEgfHwgIXJlc3BvbnNlLmRhdGEuaXApIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubndfRXJyb3JHZXR0aW5nRXh0ZXJuYWxJcCB8fCAnRmFpbGVkIHRvIGdldCBleHRlcm5hbCBJUCBhZGRyZXNzJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdXJyZW50RXh0SXBBZGRyID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGlwYWRkcicpO1xuICAgICAgICBjb25zdCBwb3J0TWF0Y2ggPSBjdXJyZW50RXh0SXBBZGRyLm1hdGNoKC86KFxcZCspJC8pO1xuICAgICAgICBjb25zdCBwb3J0ID0gcG9ydE1hdGNoID8gJzonICsgcG9ydE1hdGNoWzFdIDogJyc7XG4gICAgICAgIGNvbnN0IG5ld0V4dElwQWRkciA9IHJlc3BvbnNlLmRhdGEuaXAgKyBwb3J0O1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgbmV3RXh0SXBBZGRyKTtcbiAgICAgICAgLy8gQ2xlYXIgZXh0ZXJuYWwgaG9zdG5hbWUgd2hlbiBnZXR0aW5nIGV4dGVybmFsIElQXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRob3N0bmFtZScsICcnKTtcbiAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBoZWxwIHRleHQgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVOQVRIZWxwVGV4dChwb3J0cykge1xuICAgICAgICAvLyBXSFk6IFBvcnQga2V5cyBtYXRjaCBQYnhTZXR0aW5ncyBjb25zdGFudHMgKFNJUFBvcnQsIFRMU19QT1JULCBSVFBQb3J0RnJvbSwgUlRQUG9ydFRvKVxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQUG9ydCB8fCAhcG9ydHMuVExTX1BPUlQgfHwgIXBvcnRzLlJUUFBvcnRGcm9tIHx8ICFwb3J0cy5SVFBQb3J0VG8pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBTSVAgcG9ydHMgdGV4dCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkc2lwUG9ydFZhbHVlcyA9ICQoJyNuYXQtaGVscC1zaXAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkc2lwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBUZXh0ID0gaTE4bignbndfTkFUSW5mbzMnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQUG9ydCxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwUG9ydFZhbHVlcy5odG1sKHNpcFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFJUUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRydHBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRydHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJ0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUFBvcnRGcm9tLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6IHBvcnRzLlJUUFBvcnRUb1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkcnRwUG9ydFZhbHVlcy5odG1sKHJ0cFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwb3J0IGZpZWxkIGxhYmVscyB3aXRoIGFjdHVhbCBpbnRlcm5hbCBwb3J0IHZhbHVlcyBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBvcnRzIC0gUG9ydCBjb25maWd1cmF0aW9uIG9iamVjdCBmcm9tIEFQSVxuICAgICAqL1xuICAgIHVwZGF0ZVBvcnRMYWJlbHMocG9ydHMpIHtcbiAgICAgICAgLy8gV0hZOiBQb3J0IGtleXMgbWF0Y2ggUGJ4U2V0dGluZ3MgY29uc3RhbnRzIChTSVBQb3J0LCBUTFNfUE9SVClcbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgd2UgaGF2ZSBwb3J0IHZhbHVlcyBmcm9tIHNlcnZlclxuICAgICAgICBpZiAoIXBvcnRzLlNJUFBvcnQgfHwgIXBvcnRzLlRMU19QT1JUKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZXJuYWwgU0lQIHBvcnQgbGFiZWwgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHNpcExhYmVsID0gJCgnI2V4dGVybmFsLXNpcC1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkc2lwTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2lwTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljU0lQUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBMYWJlbC50ZXh0KHNpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZXJuYWwgVExTIHBvcnQgbGFiZWwgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHRsc0xhYmVsID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkdGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkdGxzTGFiZWwudGV4dCh0bHNMYWJlbFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlICdkaXNhYmxlZCcgY2xhc3MgZm9yIHNwZWNpZmljIGZpZWxkcyBiYXNlZCBvbiB0aGVpciBjaGVja2JveCBzdGF0ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldGggPSAkKG9iaikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2V0aH0tY2hlY2tib3hgKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgICAgIC8vIEZpbmQgSVAgYWRkcmVzcyBhbmQgc3VibmV0IGZpZWxkc1xuICAgICAgICAgICAgY29uc3QgJGlwRmllbGQgPSAkKGBpbnB1dFtuYW1lPVwiaXBhZGRyXyR7ZXRofVwiXWApO1xuICAgICAgICAgICAgLy8gRHluYW1pY0Ryb3Bkb3duQnVpbGRlciBjcmVhdGVzIGRyb3Bkb3duIHdpdGggaWQgcGF0dGVybjogZmllbGROYW1lLWRyb3Bkb3duXG4gICAgICAgICAgICBjb25zdCAkc3VibmV0RHJvcGRvd24gPSAkKGAjc3VibmV0XyR7ZXRofS1kcm9wZG93bmApO1xuXG4gICAgICAgICAgICBpZiAoaXNEaGNwRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZW5hYmxlZCAtPiBtYWtlIElQL3N1Ym5ldCByZWFkLW9ubHkgYW5kIGFkZCBkaXNhYmxlZCBjbGFzc1xuICAgICAgICAgICAgICAgICRpcEZpZWxkLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJGlwRmllbGQuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJHN1Ym5ldERyb3Bkb3duLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGRpc2FibGVkIC0+IG1ha2UgSVAvc3VibmV0IGVkaXRhYmxlXG4gICAgICAgICAgICAgICAgJGlwRmllbGQucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgJGlwRmllbGQuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJHN1Ym5ldERyb3Bkb3duLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJzEnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV0d29ya3MuYWRkTmV3Rm9ybVJ1bGVzKGV0aCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIC8vIEZvciB0ZW1wbGF0ZSBpbnRlcmZhY2UgKGlkPTApLCBhZGQgZGVwZW5kZW5jeSBvbiBpbnRlcmZhY2Ugc2VsZWN0aW9uXG4gICAgICAgIGlmIChuZXdSb3dJZCA9PT0gMCB8fCBuZXdSb3dJZCA9PT0gJzAnKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2lwYWRkckNsYXNzXSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpcGFkZHJDbGFzcyxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCwgIC8vIFRlbXBsYXRlOiB2YWxpZGF0ZSBvbmx5IGlmIGludGVyZmFjZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogYG5vdGRoY3BfJHtuZXdSb3dJZH1gLCAgLy8gUmVhbCBpbnRlcmZhY2U6IHZhbGlkYXRlIG9ubHkgaWYgREhDUCBpcyBPRkZcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERIQ1AgdmFsaWRhdGlvbiByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgb2JqZWN0IHdpdGggYWxsIHNldHRpbmdzIHByb3BlcnRpZXNcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHt9O1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc3RhdGljIHJvdXRlc1xuICAgICAgICByZXN1bHQuZGF0YS5zdGF0aWNSb3V0ZXMgPSBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmNvbGxlY3RSb3V0ZXMoKTtcblxuICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGZvcm0gdmFsdWVzIHRvIGF2b2lkIGFueSBET00tcmVsYXRlZCBpc3N1ZXNcbiAgICAgICAgLy8gQ29sbGVjdCBhbGwgcmVndWxhciBpbnB1dCBmaWVsZHNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbdHlwZT1cInRleHRcIl0sIGlucHV0W3R5cGU9XCJoaWRkZW5cIl0sIGlucHV0W3R5cGU9XCJudW1iZXJcIl0sIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gJGlucHV0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkaW5wdXQudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBzZWxlY3QgZHJvcGRvd25zXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ3NlbGVjdCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkc2VsZWN0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkc2VsZWN0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkc2VsZWN0LnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGdldCBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbbmFtZV0gPSAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkgPyBTdHJpbmcodmFsdWUpIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW5cbiAgICAgICAgLy8gUGJ4QXBpQ2xpZW50IHdpbGwgaGFuZGxlIGNvbnZlcnNpb24gdG8gc3RyaW5ncyBmb3IgalF1ZXJ5XG4gICAgICAgIHJlc3VsdC5kYXRhLnVzZW5hdCA9ICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIFVzZSBjb3JyZWN0IGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSAoYXV0b1VwZGF0ZUV4dGVybmFsSXAsIG5vdCBBVVRPX1VQREFURV9FWFRFUk5BTF9JUClcbiAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVEaXYgPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBpZiAoJGF1dG9VcGRhdGVEaXYubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSAkYXV0b1VwZGF0ZURpdi5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbnZlcnQgREhDUCBjaGVja2JveGVzIHRvIGJvb2xlYW4gZm9yIGVhY2ggaW50ZXJmYWNlXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJy5kaGNwLWNoZWNrYm94JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5wdXRJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgY29uc3Qgcm93SWQgPSBpbnB1dElkLnJlcGxhY2UoJ2RoY3AtJywgJycpLnJlcGxhY2UoJy1jaGVja2JveCcsICcnKTtcblxuICAgICAgICAgICAgLy8gRm9yIGRpc2FibGVkIGNoZWNrYm94ZXMsIHJlYWQgYWN0dWFsIGlucHV0IHN0YXRlIGluc3RlYWQgb2YgRm9tYW50aWMgVUkgQVBJXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKG9iaik7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gJGNoZWNrYm94Lmhhc0NsYXNzKCdkaXNhYmxlZCcpIHx8ICRpbnB1dC5wcm9wKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNEaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIEZvciBkaXNhYmxlZCBjaGVja2JveGVzLCByZWFkIHRoZSBhY3R1YWwgaW5wdXQgY2hlY2tlZCBzdGF0ZVxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2BkaGNwXyR7cm93SWR9YF0gPSAkaW5wdXQucHJvcCgnY2hlY2tlZCcpID09PSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZW5hYmxlZCBjaGVja2JveGVzLCB1c2UgRm9tYW50aWMgVUkgQVBJXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtyb3dJZH1gXSA9ICRjaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IGludGVybmV0IHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmludGVybmV0X2ludGVyZmFjZSA9IFN0cmluZygkY2hlY2tlZFJhZGlvLnZhbCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdIWTogTm8gcG9ydCBmaWVsZCBtYXBwaW5nIG5lZWRlZCAtIGZvcm0gZmllbGQgbmFtZXMgbWF0Y2ggQVBJIGNvbnN0YW50c1xuICAgICAgICAvLyAoZXh0ZXJuYWxTSVBQb3J0ID0gUGJ4U2V0dGluZ3M6OkVYVEVSTkFMX1NJUF9QT1JUKVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGVkIGJ5IEZvcm1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbmV0d29ya3MuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbmV0d29ya3MuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbmxpbmUgPSB0cnVlOyAvLyBTaG93IGlubGluZSBlcnJvcnMgbmV4dCB0byBmaWVsZHNcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBOZXR3b3JrQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZUNvbmZpZyc7XG5cbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL21vZGlmeS9gO1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG5ldHdvcmsgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQ29uZmlndXJhdGlvbigpIHtcbiAgICAgICAgTmV0d29ya0FQSS5nZXRDb25maWcoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGFmdGVyIGxvYWRpbmcgZGF0YVxuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBmb3JtIGVsZW1lbnRzIGNvbm5lY3RlZCB3aXRoIG5vbiBkb2NrZXIgaW5zdGFsbGF0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpcy1kb2NrZXInLCAnMScpO1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBEb2NrZXIgbmV0d29yayBpbmZvIGFzIHJlYWQtb25seVxuICAgICAqL1xuICAgIHNob3dEb2NrZXJOZXR3b3JrSW5mbyhkYXRhKSB7XG4gICAgICAgIC8vIFdIWTogSW4gRG9ja2VyLCBuZXR3b3JrIGlzIG1hbmFnZWQgYnkgY29udGFpbmVyIC0gc2hvdyBpbmZvIGFzIHJlYWQtb25seVxuICAgICAgICBpZiAoIWRhdGEuaW50ZXJmYWNlcyB8fCBkYXRhLmludGVyZmFjZXMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgaWZhY2UgPSBkYXRhLmludGVyZmFjZXNbMF07IC8vIERvY2tlciB0eXBpY2FsbHkgaGFzIG9uZSBpbnRlcmZhY2VcblxuICAgICAgICAvLyBQb3B1bGF0ZSBEb2NrZXIgbmV0d29yayBpbmZvXG4gICAgICAgICQoJyNkb2NrZXItaW50ZXJmYWNlLW5hbWUnKS50ZXh0KGlmYWNlLm5hbWUgfHwgaWZhY2UuaW50ZXJmYWNlKTtcbiAgICAgICAgJCgnI2RvY2tlci1jdXJyZW50LWlwJykudGV4dChpZmFjZS5jdXJyZW50SXBhZGRyIHx8IGlmYWNlLmlwYWRkciB8fCAn4oCUJyk7XG5cbiAgICAgICAgLy8gRm9ybWF0IHN1Ym5ldCBtYXNrIChDSURSIHRvIGRvdHRlZCBub3RhdGlvbilcbiAgICAgICAgY29uc3Qgc3VibmV0Q2lkciA9IGlmYWNlLmN1cnJlbnRTdWJuZXQgfHwgaWZhY2Uuc3VibmV0IHx8IDI0O1xuICAgICAgICBjb25zdCBzdWJuZXRNYXNrID0gbmV0d29ya3MuY2lkclRvTmV0bWFzayhzdWJuZXRDaWRyKTtcbiAgICAgICAgJCgnI2RvY2tlci1jdXJyZW50LXN1Ym5ldCcpLnRleHQoYCR7c3VibmV0Q2lkcn0gLSAke3N1Ym5ldE1hc2t9YCk7XG5cbiAgICAgICAgJCgnI2RvY2tlci1jdXJyZW50LWdhdGV3YXknKS50ZXh0KGlmYWNlLmN1cnJlbnRHYXRld2F5IHx8IGlmYWNlLmdhdGV3YXkgfHwgJ+KAlCcpO1xuXG4gICAgICAgIC8vIFNob3cgRG9ja2VyIGluZm8gc2VjdGlvbiAobm9uLURvY2tlciBzZWN0aW9uIGhpZGRlbiBieSBDU1MgY2xhc3MpXG4gICAgICAgICQoJy5kb2NrZXItbmV0d29yay1pbmZvJykuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IENJRFIgbm90YXRpb24gdG8gZG90dGVkIGRlY2ltYWwgbmV0bWFza1xuICAgICAqL1xuICAgIGNpZHJUb05ldG1hc2soY2lkcikge1xuICAgICAgICBjb25zdCBtYXNrID0gfigyICoqICgzMiAtIGNpZHIpIC0gMSk7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAobWFzayA+Pj4gMjQpICYgMjU1LFxuICAgICAgICAgICAgKG1hc2sgPj4+IDE2KSAmIDI1NSxcbiAgICAgICAgICAgIChtYXNrID4+PiA4KSAmIDI1NSxcbiAgICAgICAgICAgIG1hc2sgJiAyNTVcbiAgICAgICAgXS5qb2luKCcuJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBpbnRlcmZhY2UgdGFicyBhbmQgZm9ybXMgZHluYW1pY2FsbHkgZnJvbSBSRVNUIEFQSSBkYXRhXG4gICAgICovXG4gICAgY3JlYXRlSW50ZXJmYWNlVGFicyhkYXRhKSB7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUnKTtcbiAgICAgICAgY29uc3QgJGNvbnRlbnQgPSAkKCcjZXRoLWludGVyZmFjZXMtY29udGVudCcpO1xuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnRcbiAgICAgICAgJG1lbnUuZW1wdHkoKTtcbiAgICAgICAgJGNvbnRlbnQuZW1wdHkoKTtcblxuICAgICAgICAvLyBDcmVhdGUgdGFicyBmb3IgZXhpc3RpbmcgaW50ZXJmYWNlc1xuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaCgoaWZhY2UsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YWJJZCA9IGlmYWNlLmlkO1xuICAgICAgICAgICAgY29uc3QgdGFiTGFiZWwgPSBgJHtpZmFjZS5uYW1lIHx8IGlmYWNlLmludGVyZmFjZX0gKCR7aWZhY2UuaW50ZXJmYWNlfSR7aWZhY2UudmxhbmlkICE9PSAnMCcgJiYgaWZhY2UudmxhbmlkICE9PSAwID8gYC4ke2lmYWNlLnZsYW5pZH1gIDogJyd9KWA7XG4gICAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IGluZGV4ID09PSAwO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW0gJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICAke3RhYkxhYmVsfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIGNvbnRlbnRcbiAgICAgICAgICAgIC8vIE9ubHkgVkxBTiBpbnRlcmZhY2VzIGNhbiBiZSBkZWxldGVkICh2bGFuaWQgPiAwKVxuICAgICAgICAgICAgY29uc3QgY2FuRGVsZXRlID0gcGFyc2VJbnQoaWZhY2UudmxhbmlkLCAxMCkgPiAwO1xuICAgICAgICAgICAgY29uc3QgZGVsZXRlQnV0dG9uID0gY2FuRGVsZXRlID8gYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwidWkgaWNvbiBsZWZ0IGxhYmVsZWQgYnV0dG9uIGRlbGV0ZS1pbnRlcmZhY2VcIiBkYXRhLXZhbHVlPVwiJHt0YWJJZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RlbGV0ZUN1cnJlbnRJbnRlcmZhY2V9XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCA6ICcnO1xuXG4gICAgICAgICAgICAkY29udGVudC5hcHBlbmQobmV0d29ya3MuY3JlYXRlSW50ZXJmYWNlRm9ybShpZmFjZSwgaXNBY3RpdmUsIGRlbGV0ZUJ1dHRvbikpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgdGVtcGxhdGUgdGFiIGZvciBuZXcgVkxBTlxuICAgICAgICBpZiAoZGF0YS50ZW1wbGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkYXRhLnRlbXBsYXRlO1xuICAgICAgICAgICAgdGVtcGxhdGUuaWQgPSAwO1xuXG4gICAgICAgICAgICAvLyBBZGQgXCIrXCIgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW1cIiBkYXRhLXRhYj1cIjBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHBsdXNcIj48L2k+XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSBmb3JtIHdpdGggaW50ZXJmYWNlIHNlbGVjdG9yXG4gICAgICAgICAgICAkY29udGVudC5hcHBlbmQobmV0d29ya3MuY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBkYXRhLmludGVyZmFjZXMpKTtcblxuICAgICAgICAgICAgLy8gQnVpbGQgaW50ZXJmYWNlIHNlbGVjdG9yIGRyb3Bkb3duIGZvciB0ZW1wbGF0ZVxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VzID0ge307XG4gICAgICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaChpZmFjZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFwaHlzaWNhbEludGVyZmFjZXNbaWZhY2UuaW50ZXJmYWNlXSkge1xuICAgICAgICAgICAgICAgICAgICBwaHlzaWNhbEludGVyZmFjZXNbaWZhY2UuaW50ZXJmYWNlXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpZmFjZS5pZC50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogaWZhY2UuaW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogaWZhY2UuaW50ZXJmYWNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyA9IE9iamVjdC52YWx1ZXMocGh5c2ljYWxJbnRlcmZhY2VzKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdpbnRlcmZhY2VfMCcsIHsgaW50ZXJmYWNlXzA6ICcnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93bnMgdXNpbmcgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaCgoaWZhY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGBzdWJuZXRfJHtpZmFjZS5pZH1gO1xuICAgICAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7fTtcbiAgICAgICAgICAgIC8vIENvbnZlcnQgc3VibmV0IHRvIHN0cmluZyBmb3IgZHJvcGRvd24gbWF0Y2hpbmdcbiAgICAgICAgICAgIGZvcm1EYXRhW2ZpZWxkTmFtZV0gPSBTdHJpbmcoaWZhY2Uuc3VibmV0IHx8ICcyNCcpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBmb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10gIC8vIEFkZCBzZWFyY2ggY2xhc3MgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgdGVtcGxhdGUgKGlkID0gMClcbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUpIHtcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc3VibmV0XzAnLCB7IHN1Ym5ldF8wOiAnMjQnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddICAvLyBBZGQgc2VhcmNoIGNsYXNzIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLnRhYigpO1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLmZpcnN0KCkudHJpZ2dlcignY2xpY2snKTtcblxuICAgICAgICAvLyBVcGRhdGUgc3RhdGljIHJvdXRlcyBzZWN0aW9uIHZpc2liaWxpdHlcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVWaXNpYmlsaXR5KCk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gcmVtb3ZlcyBUQUIgZnJvbSBmb3JtIGFuZCBtYXJrcyBpbnRlcmZhY2UgYXMgZGlzYWJsZWRcbiAgICAgICAgLy8gQWN0dWFsIGRlbGV0aW9uIGhhcHBlbnMgb24gZm9ybSBzdWJtaXRcbiAgICAgICAgJCgnLmRlbGV0ZS1pbnRlcmZhY2UnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIFRBQiBtZW51IGl0ZW1cbiAgICAgICAgICAgICQoYCNldGgtaW50ZXJmYWNlcy1tZW51IGFbZGF0YS10YWI9XCIke2ludGVyZmFjZUlkfVwiXWApLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIFRBQiBjb250ZW50XG4gICAgICAgICAgICBjb25zdCAkdGFiQ29udGVudCA9ICQoYCNldGgtaW50ZXJmYWNlcy1jb250ZW50IC50YWJbZGF0YS10YWI9XCIke2ludGVyZmFjZUlkfVwiXWApO1xuICAgICAgICAgICAgJHRhYkNvbnRlbnQucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBoaWRkZW4gZmllbGQgdG8gbWFyayB0aGlzIGludGVyZmFjZSBhcyBkaXNhYmxlZFxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouYXBwZW5kKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaXNhYmxlZF8ke2ludGVyZmFjZUlkfVwiIHZhbHVlPVwiMVwiIC8+YCk7XG5cbiAgICAgICAgICAgIC8vIFN3aXRjaCB0byBmaXJzdCBhdmFpbGFibGUgdGFiXG4gICAgICAgICAgICBjb25zdCAkZmlyc3RUYWIgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5maXJzdCgpO1xuICAgICAgICAgICAgaWYgKCRmaXJzdFRhYi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGZpcnN0VGFiLnRhYignY2hhbmdlIHRhYicsICRmaXJzdFRhYi5hdHRyKCdkYXRhLXRhYicpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHN1Ym1pdCBidXR0b25cbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgREhDUCBjaGVja2JveCBoYW5kbGVyc1xuICAgICAgICAkKCcuZGhjcC1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBJUCBhZGRyZXNzIGlucHV0IG1hc2tzXG4gICAgICAgICQoJy5pcGFkZHJlc3MnKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICAvLyBBZGQgVkxBTiBJRCBjaGFuZ2UgaGFuZGxlcnMgdG8gY29udHJvbCBESENQIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwidmxhbmlkX1wiXScpLm9mZignaW5wdXQgY2hhbmdlJykub24oJ2lucHV0IGNoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHZsYW5JbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICR2bGFuSW5wdXQuYXR0cignbmFtZScpLnJlcGxhY2UoJ3ZsYW5pZF8nLCAnJyk7XG4gICAgICAgICAgICBjb25zdCB2bGFuVmFsdWUgPSBwYXJzZUludCgkdmxhbklucHV0LnZhbCgpLCAxMCkgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2ludGVyZmFjZUlkfS1jaGVja2JveGApO1xuXG4gICAgICAgICAgICBpZiAodmxhblZhbHVlID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIERpc2FibGUgREhDUCBjaGVja2JveCBmb3IgVkxBTiBpbnRlcmZhY2VzXG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgnc2V0IGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5maW5kKCdpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEVuYWJsZSBESENQIGNoZWNrYm94IGZvciBub24tVkxBTiBpbnRlcmZhY2VzXG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdzZXQgZW5hYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guZmluZCgnaW5wdXQnKS5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkaXNhYmxlZCBmaWVsZCBjbGFzc2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciB0aGUgaGFuZGxlciBmb3IgZXhpc3RpbmcgVkxBTiBpbnRlcmZhY2VzIHRvIGFwcGx5IGluaXRpYWwgc3RhdGVcbiAgICAgICAgJCgnaW5wdXRbbmFtZV49XCJ2bGFuaWRfXCJdJykudHJpZ2dlcignY2hhbmdlJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnRlcm5ldCByYWRpbyBidXR0b25zIHdpdGggRm9tYW50aWMgVUlcbiAgICAgICAgJCgnLmludGVybmV0LXJhZGlvJykuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBBZGQgaW50ZXJuZXQgcmFkaW8gYnV0dG9uIGNoYW5nZSBoYW5kbGVyXG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIl0nKS5vZmYoJ2NoYW5nZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkSW50ZXJmYWNlSWQgPSAkKHRoaXMpLnZhbCgpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIGFsbCBETlMvR2F0ZXdheSBncm91cHNcbiAgICAgICAgICAgICQoJ1tjbGFzc149XCJkbnMtZ2F0ZXdheS1ncm91cC1cIl0nKS5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgRE5TL0dhdGV3YXkgZ3JvdXAgZm9yIHNlbGVjdGVkIGludGVybmV0IGludGVyZmFjZVxuICAgICAgICAgICAgJChgLmRucy1nYXRld2F5LWdyb3VwLSR7c2VsZWN0ZWRJbnRlcmZhY2VJZH1gKS5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBUQUIgaWNvbnMgLSBhZGQgZ2xvYmUgaWNvbiB0byBzZWxlY3RlZCwgcmVtb3ZlIGZyb20gb3RoZXJzXG4gICAgICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIHRhYikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0YWIgPSAkKHRhYik7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFiSWQgPSAkdGFiLmF0dHIoJ2RhdGEtdGFiJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZXhpc3RpbmcgZ2xvYmUgaWNvblxuICAgICAgICAgICAgICAgICR0YWIuZmluZCgnLmdsb2JlLmljb24nKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBnbG9iZSBpY29uIHRvIHNlbGVjdGVkIGludGVybmV0IGludGVyZmFjZSBUQUJcbiAgICAgICAgICAgICAgICBpZiAodGFiSWQgPT09IHNlbGVjdGVkSW50ZXJmYWNlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRhYi5wcmVwZW5kKCc8aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGRhdGUgRE5TL0dhdGV3YXkgcmVhZG9ubHkgc3RhdGUgd2hlbiBESENQIGNoYW5nZXNcbiAgICAgICAgJCgnLmRoY3AtY2hlY2tib3gnKS5vZmYoJ2NoYW5nZS5kbnNnYXRld2F5Jykub24oJ2NoYW5nZS5kbnNnYXRld2F5JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkY2hlY2tib3guYXR0cignaWQnKS5yZXBsYWNlKCdkaGNwLScsICcnKS5yZXBsYWNlKCctY2hlY2tib3gnLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBpc0RoY3BFbmFibGVkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgICAgIC8vIEZpbmQgRE5TL0dhdGV3YXkgZmllbGRzIGZvciB0aGlzIGludGVyZmFjZVxuICAgICAgICAgICAgY29uc3QgJGRuc0dhdGV3YXlHcm91cCA9ICQoYC5kbnMtZ2F0ZXdheS1ncm91cC0ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICAgICAgY29uc3QgJGRuc0dhdGV3YXlGaWVsZHMgPSAkZG5zR2F0ZXdheUdyb3VwLmZpbmQoJ2lucHV0W25hbWVePVwiZ2F0ZXdheV9cIl0sIGlucHV0W25hbWVePVwicHJpbWFyeWRuc19cIl0sIGlucHV0W25hbWVePVwic2Vjb25kYXJ5ZG5zX1wiXScpO1xuXG4gICAgICAgICAgICBpZiAoaXNEaGNwRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZW5hYmxlZCAtPiBtYWtlIEROUy9HYXRld2F5IHJlYWQtb25seVxuICAgICAgICAgICAgICAgICRkbnNHYXRld2F5RmllbGRzLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZGlzYWJsZWQgLT4gbWFrZSBETlMvR2F0ZXdheSBlZGl0YWJsZVxuICAgICAgICAgICAgICAgICRkbnNHYXRld2F5RmllbGRzLnByb3AoJ3JlYWRvbmx5JywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICRkbnNHYXRld2F5RmllbGRzLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmlnZ2VyIGluaXRpYWwgVEFCIGljb24gdXBkYXRlIGZvciBjaGVja2VkIHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRjaGVja2VkUmFkaW8udHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSBpbml0aWFsIGRpc2FibGVkIHN0YXRlIGZvciBESENQLWVuYWJsZWQgaW50ZXJmYWNlc1xuICAgICAgICAvLyBDYWxsIGFmdGVyIGFsbCBkcm9wZG93bnMgYXJlIGNyZWF0ZWRcbiAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgLy8gUmUtc2F2ZSBpbml0aWFsIGZvcm0gdmFsdWVzIGFuZCByZS1iaW5kIGV2ZW50IGhhbmRsZXJzIGZvciBkeW5hbWljYWxseSBjcmVhdGVkIGlucHV0c1xuICAgICAgICAvLyBUaGlzIGlzIGVzc2VudGlhbCBmb3IgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHdvcmsgd2l0aCBkeW5hbWljIHRhYnNcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgLy8gT3ZlcnJpZGUgRm9ybSBtZXRob2RzIHRvIG1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyAoaW5jbHVkaW5nIGZyb20gdGFicylcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMgPSBGb3JtLnNhdmVJbml0aWFsVmFsdWVzO1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG5cbiAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdmFsdWVzIGZyb20gRm9tYW50aWMgVUkgKG1heSBtaXNzIGR5bmFtaWNhbGx5IGNyZWF0ZWQgdGFiIGZpZWxkcylcbiAgICAgICAgICAgICAgICBjb25zdCBmb21hbnRpY1ZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyB0byBjYXRjaCBmaWVsZHMgdGhhdCBGb21hbnRpYyBVSSBtaXNzZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aCAobWFudWFsIHZhbHVlcyBvdmVycmlkZSBGb21hbnRpYyB2YWx1ZXMgZm9yIGZpZWxkcyB0aGF0IGV4aXN0IGluIGJvdGgpXG4gICAgICAgICAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gT2JqZWN0LmFzc2lnbih7fSwgZm9tYW50aWNWYWx1ZXMsIG1hbnVhbFZhbHVlcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHZhbHVlcyBmcm9tIEZvbWFudGljIFVJXG4gICAgICAgICAgICAgICAgY29uc3QgZm9tYW50aWNWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aFxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmb21hbnRpY1ZhbHVlcywgbWFudWFsVmFsdWVzKTtcblxuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShGb3JtLm9sZEZvcm1WYWx1ZXMpID09PSBKU09OLnN0cmluZ2lmeShuZXdGb3JtVmFsdWVzKSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNhdmVJbml0aWFsVmFsdWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNldEV2ZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIEZvcm0uc2V0RXZlbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIGV4aXN0aW5nIGludGVyZmFjZVxuICAgICAqL1xuICAgIGNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24pIHtcbiAgICAgICAgY29uc3QgaWQgPSBpZmFjZS5pZDtcbiAgICAgICAgY29uc3QgaXNJbnRlcm5ldEludGVyZmFjZSA9IGlmYWNlLmludGVybmV0IHx8IGZhbHNlO1xuXG4gICAgICAgIC8vIEROUy9HYXRld2F5IGZpZWxkcyB2aXNpYmlsaXR5IGFuZCByZWFkLW9ubHkgc3RhdGVcbiAgICAgICAgY29uc3QgZG5zR2F0ZXdheVZpc2libGUgPSBpc0ludGVybmV0SW50ZXJmYWNlID8gJycgOiAnc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCInO1xuICAgICAgICBjb25zdCBkbnNHYXRld2F5UmVhZG9ubHkgPSBpZmFjZS5kaGNwID8gJ3JlYWRvbmx5JyA6ICcnO1xuICAgICAgICBjb25zdCBkbnNHYXRld2F5RGlzYWJsZWRDbGFzcyA9IGlmYWNlLmRoY3AgPyAnZGlzYWJsZWQnIDogJyc7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnQgJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pbnRlcmZhY2V9XCIgLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UubmFtZSB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBpbnRlcm5ldC1yYWRpb1wiIGlkPVwiaW50ZXJuZXQtJHtpZH0tcmFkaW9cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhZGlvXCIgbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiIHZhbHVlPVwiJHtpZH1cIiAke2lzSW50ZXJuZXRJbnRlcmZhY2UgPyAnY2hlY2tlZCcgOiAnJ30gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldEludGVyZmFjZSB8fCAnSW50ZXJuZXQgSW50ZXJmYWNlJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGRoY3AtY2hlY2tib3gke2lmYWNlLnZsYW5pZCA+IDAgPyAnIGRpc2FibGVkJyA6ICcnfVwiIGlkPVwiZGhjcC0ke2lkfS1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiZGhjcF8ke2lkfVwiICR7aWZhY2UudmxhbmlkID4gMCA/ICcnIDogKGlmYWNlLmRoY3AgPyAnY2hlY2tlZCcgOiAnJyl9ICR7aWZhY2UudmxhbmlkID4gMCA/ICdkaXNhYmxlZCcgOiAnJ30gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVXNlREhDUH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibm90ZGhjcF8ke2lkfVwiIGlkPVwibm90LWRoY3AtJHtpZH1cIi8+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRzXCIgaWQ9XCJpcC1hZGRyZXNzLWdyb3VwLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQQWRkcmVzc308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXBhZGRyIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X05ldHdvcmtNYXNrfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnN1Ym5ldCB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19WbGFuSUR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbmFtZT1cInZsYW5pZF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS52bGFuaWQgfHwgJzAnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRucy1nYXRld2F5LWdyb3VwLSR7aWR9XCIgJHtkbnNHYXRld2F5VmlzaWJsZX0+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBob3Jpem9udGFsIGRpdmlkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldFNldHRpbmdzIHx8ICdJbnRlcm5ldCBTZXR0aW5ncyd9PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSG9zdG5hbWUgfHwgJ0hvc3RuYW1lJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwiaG9zdG5hbWVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaG9zdG5hbWUgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCJtaWtvcGJ4XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Eb21haW4gfHwgJ0RvbWFpbid9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cImRvbWFpbl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5kb21haW4gfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCJleGFtcGxlLmNvbVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfR2F0ZXdheX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDAgJHtkbnNHYXRld2F5RGlzYWJsZWRDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJnYXRld2F5XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmdhdGV3YXkgfHwgJyd9XCIgJHtkbnNHYXRld2F5UmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfUHJpbWFyeUROU308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDAgJHtkbnNHYXRld2F5RGlzYWJsZWRDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJwcmltYXJ5ZG5zXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnByaW1hcnlkbnMgfHwgJyd9XCIgJHtkbnNHYXRld2F5UmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfU2Vjb25kYXJ5RE5TfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMCAke2Ruc0dhdGV3YXlEaXNhYmxlZENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInNlY29uZGFyeWRuc18ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5zZWNvbmRhcnlkbnMgfHwgJyd9XCIgJHtkbnNHYXRld2F5UmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAke2RlbGV0ZUJ1dHRvbn1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZm9ybSBmb3IgbmV3IFZMQU4gdGVtcGxhdGVcbiAgICAgKi9cbiAgICBjcmVhdGVUZW1wbGF0ZUZvcm0odGVtcGxhdGUsIGludGVyZmFjZXMpIHtcbiAgICAgICAgY29uc3QgaWQgPSAwO1xuXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYm90dG9tIGF0dGFjaGVkIHRhYiBzZWdtZW50XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcmZhY2VfJHtpZH1cIiBpZD1cImludGVyZmFjZV8ke2lkfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcmZhY2VOYW1lfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibmFtZV8ke2lkfVwiIGlkPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggZGhjcC1jaGVja2JveFwiIGlkPVwiZGhjcC0ke2lkfS1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiZGhjcF8ke2lkfVwiIGNoZWNrZWQgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVXNlREhDUH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibm90ZGhjcF8ke2lkfVwiIGlkPVwibm90LWRoY3AtJHtpZH1cIi8+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRzXCIgaWQ9XCJpcC1hZGRyZXNzLWdyb3VwLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQQWRkcmVzc308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIlwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X05ldHdvcmtNYXNrfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIyNFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ZsYW5JRH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiBuYW1lPVwidmxhbmlkXyR7aWR9XCIgdmFsdWU9XCI0MDk1XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHN1Ym5ldCBtYXNrIG9wdGlvbnMgYXJyYXkgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHN1Ym5ldCBtYXNrIG9wdGlvbnNcbiAgICAgKi9cbiAgICBnZXRTdWJuZXRPcHRpb25zQXJyYXkoKSB7XG4gICAgICAgIC8vIE5ldHdvcmsgbWFza3MgZnJvbSBDaWRyOjpnZXROZXRNYXNrcygpIChrcnNvcnQgU09SVF9OVU1FUklDKVxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge3ZhbHVlOiAnMzInLCB0ZXh0OiAnMzIgLSAyNTUuMjU1LjI1NS4yNTUnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMxJywgdGV4dDogJzMxIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMCcsIHRleHQ6ICczMCAtIDI1NS4yNTUuMjU1LjI1Mid9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjknLCB0ZXh0OiAnMjkgLSAyNTUuMjU1LjI1NS4yNDgnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI4JywgdGV4dDogJzI4IC0gMjU1LjI1NS4yNTUuMjQwJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNycsIHRleHQ6ICcyNyAtIDI1NS4yNTUuMjU1LjIyNCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjYnLCB0ZXh0OiAnMjYgLSAyNTUuMjU1LjI1NS4xOTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI1JywgdGV4dDogJzI1IC0gMjU1LjI1NS4yNTUuMTI4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNCcsIHRleHQ6ICcyNCAtIDI1NS4yNTUuMjU1LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIzJywgdGV4dDogJzIzIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMicsIHRleHQ6ICcyMiAtIDI1NS4yNTUuMjUyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIxJywgdGV4dDogJzIxIC0gMjU1LjI1NS4yNDguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjAnLCB0ZXh0OiAnMjAgLSAyNTUuMjU1LjI0MC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOScsIHRleHQ6ICcxOSAtIDI1NS4yNTUuMjI0LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE4JywgdGV4dDogJzE4IC0gMjU1LjI1NS4xOTIuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTcnLCB0ZXh0OiAnMTcgLSAyNTUuMjU1LjEyOC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNicsIHRleHQ6ICcxNiAtIDI1NS4yNTUuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNScsIHRleHQ6ICcxNSAtIDI1NS4yNTQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNCcsIHRleHQ6ICcxNCAtIDI1NS4yNTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMycsIHRleHQ6ICcxMyAtIDI1NS4yNDguMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMicsIHRleHQ6ICcxMiAtIDI1NS4yNDAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMScsIHRleHQ6ICcxMSAtIDI1NS4yMjQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMCcsIHRleHQ6ICcxMCAtIDI1NS4xOTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc5JywgdGV4dDogJzkgLSAyNTUuMTI4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOCcsIHRleHQ6ICc4IC0gMjU1LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc3JywgdGV4dDogJzcgLSAyNTQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzYnLCB0ZXh0OiAnNiAtIDI1Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNScsIHRleHQ6ICc1IC0gMjQ4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc0JywgdGV4dDogJzQgLSAyNDAuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMnLCB0ZXh0OiAnMyAtIDIyNC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMicsIHRleHQ6ICcyIC0gMTkyLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogJzEgLSAxMjguMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiAnMCAtIDAuMC4wLjAnfSxcbiAgICAgICAgXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGNvbmZpZ3VyYXRpb24gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFdIWTogRG9ja2VyIGFuZCBub24tRG9ja2VyIGhhdmUgZGlmZmVyZW50IG5ldHdvcmsgbWFuYWdlbWVudCBVSXNcbiAgICAgICAgaWYgKGRhdGEuaXNEb2NrZXIpIHtcbiAgICAgICAgICAgIC8vIFNob3cgcmVhZC1vbmx5IG5ldHdvcmsgaW5mbyBmb3IgRG9ja2VyXG4gICAgICAgICAgICBuZXR3b3Jrcy5zaG93RG9ja2VyTmV0d29ya0luZm8oZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgZWRpdGFibGUgaW50ZXJmYWNlIHRhYnMgZm9yIG5vbi1Eb2NrZXJcbiAgICAgICAgICAgIG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZVRhYnMoZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgTkFUIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLm5hdCkge1xuICAgICAgICAgICAgLy8gQm9vbGVhbiB2YWx1ZXMgZnJvbSBBUElcbiAgICAgICAgICAgIGlmIChkYXRhLm5hdC51c2VuYXQpIHtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIGRhdGEubmF0LmV4dGlwYWRkciB8fCAnJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCBkYXRhLm5hdC5leHRob3N0bmFtZSB8fCAnJyk7XG5cbiAgICAgICAgICAgIC8vIGF1dG9VcGRhdGVFeHRlcm5hbElwIGJvb2xlYW4gKGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSlcbiAgICAgICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlQ2hlY2tib3ggPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRhdXRvVXBkYXRlQ2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLm5hdC5BVVRPX1VQREFURV9FWFRFUk5BTF9JUCB8fCBkYXRhLm5hdC5hdXRvVXBkYXRlRXh0ZXJuYWxJcCkge1xuICAgICAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgcG9ydCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5wb3J0cykge1xuICAgICAgICAgICAgLy8gV0hZOiBObyBtYXBwaW5nIG5lZWRlZCAtIEFQSSByZXR1cm5zIGtleXMgbWF0Y2hpbmcgZm9ybSBmaWVsZCBuYW1lc1xuICAgICAgICAgICAgLy8gKGUuZy4sICdleHRlcm5hbFNJUFBvcnQnIGZyb20gUGJ4U2V0dGluZ3M6OkVYVEVSTkFMX1NJUF9QT1JUIGNvbnN0YW50KVxuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5wb3J0cykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YS5wb3J0c1trZXldO1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgTkFUIGhlbHAgdGV4dCBhbmQgbGFiZWxzIHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVOQVRIZWxwVGV4dChkYXRhLnBvcnRzKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZVBvcnRMYWJlbHMoZGF0YS5wb3J0cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYWRkaXRpb25hbCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5zZXR0aW5ncykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5zZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgZGF0YS5zZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RvcmUgYXZhaWxhYmxlIGludGVyZmFjZXMgZm9yIHN0YXRpYyByb3V0ZXMgRklSU1QgKGJlZm9yZSBsb2FkaW5nIHJvdXRlcylcbiAgICAgICAgaWYgKGRhdGEuYXZhaWxhYmxlSW50ZXJmYWNlcykge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzID0gZGF0YS5hdmFpbGFibGVJbnRlcmZhY2VzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9hZCBzdGF0aWMgcm91dGVzIEFGVEVSIGF2YWlsYWJsZUludGVyZmFjZXMgYXJlIHNldFxuICAgICAgICBpZiAoZGF0YS5zdGF0aWNSb3V0ZXMpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIubG9hZFJvdXRlcyhkYXRhLnN0YXRpY1JvdXRlcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGFmdGVyIHBvcHVsYXRpb24gaXMgY29tcGxldGVcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHRoZSBidXR0b24gaXMgZGlzYWJsZWQgYW5kIGFsbCBkeW5hbWljYWxseSBjcmVhdGVkIGZpZWxkcyBhcmUgdHJhY2tlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkcldpdGhQb3J0T3B0aW9uYWwgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pKDpbMC05XSspPyQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgYSBnaXZlbiBpbnRlcmZhY2UuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmxhblZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBWTEFOIElEIGlucHV0IGZpZWxkLlxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIHBhcmFtZXRlciBmb3IgdGhlIHJ1bGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgdGhlIGludGVyZmFjZSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tWbGFuID0gKHZsYW5WYWx1ZSwgcGFyYW0pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCB2bGFuc0FycmF5ID0ge307XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgIT09IHVuZGVmaW5lZCAmJiBhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgPiAwKSB7XG4gICAgICAgIGNvbnN0IG5ld0V0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2FsbFZhbHVlcy5pbnRlcmZhY2VfMH1gXTtcbiAgICAgICAgdmxhbnNBcnJheVtuZXdFdGhOYW1lXSA9IFthbGxWYWx1ZXMudmxhbmlkXzBdO1xuICAgICAgICBpZiAoYWxsVmFsdWVzLnZsYW5pZF8wID09PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgJC5lYWNoKGFsbFZhbHVlcywgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICBpZiAoaW5kZXggPT09ICdpbnRlcmZhY2VfMCcgfHwgaW5kZXggPT09ICd2bGFuaWRfMCcpIHJldHVybjtcbiAgICAgICAgaWYgKGluZGV4LmluZGV4T2YoJ3ZsYW5pZCcpID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGV0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2luZGV4LnNwbGl0KCdfJylbMV19YF07XG4gICAgICAgICAgICBpZiAoJC5pbkFycmF5KHZhbHVlLCB2bGFuc0FycmF5W2V0aE5hbWVdKSA+PSAwXG4gICAgICAgICAgICAgICAgJiYgdmxhblZhbHVlID09PSB2YWx1ZVxuICAgICAgICAgICAgICAgICYmIHBhcmFtID09PSBpbmRleC5zcGxpdCgnXycpWzFdKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghKGV0aE5hbWUgaW4gdmxhbnNBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2bGFuc0FycmF5W2V0aE5hbWVdLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8vIERIQ1AgdmFsaWRhdGlvbiBydWxlIHJlbW92ZWQgLSBESENQIGNoZWNrYm94IGlzIGRpc2FibGVkIGZvciBWTEFOIGludGVyZmFjZXMsIG5vIHZhbGlkYXRpb24gbmVlZGVkXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyB0aGUgcHJlc2VuY2Ugb2YgZXh0ZXJuYWwgSVAgaG9zdCBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24gaXMgcHJvdmlkZWQgd2hlbiBOQVQgaXMgZW5hYmxlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5hbElwSG9zdCA9ICgpID0+IHtcbiAgICBjb25zdCBhbGxWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgaWYgKGFsbFZhbHVlcy51c2VuYXQgPT09ICdvbicpIHtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy5leHRob3N0bmFtZSA9PT0gJycgJiYgYWxsVmFsdWVzLmV4dGlwYWRkciA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB2YWx1ZSBpcyBhIHZhbGlkIGhvc3RuYW1lXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgaG9zdG5hbWVcbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdmFsaWQgaG9zdG5hbWUsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudmFsaWRIb3N0bmFtZSA9ICh2YWx1ZSkgPT4ge1xuICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBFbXB0eSBpcyBoYW5kbGVkIGJ5IGV4dGVuYWxJcEhvc3QgcnVsZVxuICAgIH1cblxuICAgIC8vIFJGQyA5NTIvUkZDIDExMjMgaG9zdG5hbWUgdmFsaWRhdGlvblxuICAgIC8vIC0gTGFiZWxzIHNlcGFyYXRlZCBieSBkb3RzXG4gICAgLy8gLSBFYWNoIGxhYmVsIDEtNjMgY2hhcnNcbiAgICAvLyAtIE9ubHkgYWxwaGFudW1lcmljIGFuZCBoeXBoZW5zXG4gICAgLy8gLSBDYW5ub3Qgc3RhcnQvZW5kIHdpdGggaHlwaGVuXG4gICAgLy8gLSBUb3RhbCBsZW5ndGggbWF4IDI1MyBjaGFyc1xuICAgIGNvbnN0IGhvc3RuYW1lUmVnZXggPSAvXig/PS57MSwyNTN9JCkoPyEtKVthLXpBLVowLTktXXsxLDYzfSg/PCEtKShcXC5bYS16QS1aMC05LV17MSw2M30oPzwhLSkpKiQvO1xuICAgIHJldHVybiBob3N0bmFtZVJlZ2V4LnRlc3QodmFsdWUpO1xufTtcblxuXG4vKipcbiAqIFN0YXRpYyBSb3V0ZXMgTWFuYWdlciBNb2R1bGVcbiAqXG4gKiBNYW5hZ2VzIHN0YXRpYyByb3V0ZSBjb25maWd1cmF0aW9uIHdoZW4gbXVsdGlwbGUgbmV0d29yayBpbnRlcmZhY2VzIGV4aXN0XG4gKi9cbmNvbnN0IFN0YXRpY1JvdXRlc01hbmFnZXIgPSB7XG4gICAgJHRhYmxlOiAkKCcjc3RhdGljLXJvdXRlcy10YWJsZScpLFxuICAgICRzZWN0aW9uOiAkKCcjc3RhdGljLXJvdXRlcy1zZWN0aW9uJyksXG4gICAgJGFkZEJ1dHRvbjogJCgnI2FkZC1uZXctcm91dGUnKSxcbiAgICAkdGFibGVDb250YWluZXI6IG51bGwsXG4gICAgJGVtcHR5UGxhY2Vob2xkZXI6IG51bGwsXG4gICAgcm91dGVzOiBbXSxcbiAgICBhdmFpbGFibGVJbnRlcmZhY2VzOiBbXSwgLy8gV2lsbCBiZSBwb3B1bGF0ZWQgZnJvbSBSRVNUIEFQSVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdGF0aWMgcm91dGVzIG1hbmFnZW1lbnRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDYWNoZSBlbGVtZW50c1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyID0gJCgnI3N0YXRpYy1yb3V0ZXMtZW1wdHktcGxhY2Vob2xkZXInKTtcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIgPSAkKCcjc3RhdGljLXJvdXRlcy10YWJsZS1jb250YWluZXInKTtcblxuICAgICAgICAvLyBIaWRlIHNlY3Rpb24gaWYgbGVzcyB0aGFuIDIgaW50ZXJmYWNlc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3BcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcblxuICAgICAgICAvLyBBZGQgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kYWRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBmaXJzdCByb3V0ZSBidXR0b24gaGFuZGxlciAoaW4gZW1wdHkgcGxhY2Vob2xkZXIpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjYWRkLWZpcnN0LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciAoZGVsZWdhdGVkKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3V0ZS1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvcHkgYnV0dG9uIGhhbmRsZXIgKGRlbGVnYXRlZClcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2NsaWNrJywgJy5jb3B5LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkc291cmNlUm93ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuY29weVJvdXRlKCRzb3VyY2VSb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbnB1dCBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2lucHV0IGNoYW5nZScsICcubmV0d29yay1pbnB1dCwgLmdhdGV3YXktaW5wdXQsIC5kZXNjcmlwdGlvbi1pbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUGFzdGUgaGFuZGxlcnMgZm9yIElQIGFkZHJlc3MgZmllbGRzIChlbmFibGUgY2xpcGJvYXJkIHBhc3RlIHdpdGggaW5wdXRtYXNrKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbigncGFzdGUnLCAnLm5ldHdvcmstaW5wdXQsIC5nYXRld2F5LWlucHV0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBHZXQgcGFzdGVkIGRhdGEgZnJvbSBjbGlwYm9hcmRcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLmNsaXBib2FyZERhdGEgJiYgZS5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEgJiYgd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7IC8vIEZvciBJRVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbGVhbiB0aGUgcGFzdGVkIGRhdGEgKHJlbW92ZSBleHRyYSBzcGFjZXMsIGtlZXAgb25seSB2YWxpZCBJUCBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgY29uc3QgY2xlYW5lZERhdGEgPSBwYXN0ZWREYXRhLnRyaW0oKS5yZXBsYWNlKC9bXjAtOS5dL2csICcnKTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBUZW1wb3JhcmlseSByZW1vdmUgbWFza1xuICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzaygncmVtb3ZlJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCB0aGUgY2xlYW5lZCB2YWx1ZVxuICAgICAgICAgICAgJGlucHV0LnZhbChjbGVhbmVkRGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFJlYXBwbHkgdGhlIG1hc2sgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsIHBsYWNlaG9sZGVyOiAnXyd9KTtcbiAgICAgICAgICAgICAgICAkaW5wdXQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG9yIHJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJhZ0FuZERyb3AoKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgdGFibGVEbkQgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5kYXRhKCd0YWJsZURuRCcpKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS50YWJsZURuRFVwZGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcDogKCkgPT4ge1xuICAgICAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmlzaWJpbGl0eSBiYXNlZCBvbiBudW1iZXIgb2YgaW50ZXJmYWNlc1xuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHkoKSB7XG4gICAgICAgIC8vIFNob3cvaGlkZSBzZWN0aW9uIGJhc2VkIG9uIG51bWJlciBvZiBpbnRlcmZhY2VzXG4gICAgICAgIGNvbnN0IGludGVyZmFjZUNvdW50ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYS5pdGVtJykubm90KCdbZGF0YS10YWI9XCIwXCJdJykubGVuZ3RoO1xuICAgICAgICBpZiAoaW50ZXJmYWNlQ291bnQgPiAxKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRzZWN0aW9uLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHNlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvcHkgYSByb3V0ZSByb3cgKGNyZWF0ZSBkdXBsaWNhdGUpXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRzb3VyY2VSb3cgLSBTb3VyY2Ugcm93IHRvIGNvcHlcbiAgICAgKi9cbiAgICBjb3B5Um91dGUoJHNvdXJjZVJvdykge1xuICAgICAgICBjb25zdCByb3V0ZUlkID0gJHNvdXJjZVJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyk7XG4gICAgICAgIGNvbnN0IHN1Ym5ldERyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7cm91dGVJZH1gO1xuICAgICAgICBjb25zdCBpbnRlcmZhY2VEcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0ke3JvdXRlSWR9YDtcblxuICAgICAgICAvLyBDb2xsZWN0IGRhdGEgZnJvbSBzb3VyY2Ugcm93XG4gICAgICAgIGNvbnN0IHJvdXRlRGF0YSA9IHtcbiAgICAgICAgICAgIG5ldHdvcms6ICRzb3VyY2VSb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgIHN1Ym5ldDogJChgIyR7c3VibmV0RHJvcGRvd25JZH1gKS52YWwoKSxcbiAgICAgICAgICAgIGdhdGV3YXk6ICRzb3VyY2VSb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgIGludGVyZmFjZTogJChgIyR7aW50ZXJmYWNlRHJvcGRvd25JZH1gKS52YWwoKSB8fCAnJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAkc291cmNlUm93LmZpbmQoJy5kZXNjcmlwdGlvbi1pbnB1dCcpLnZhbCgpXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIG5ldyByb3V0ZSB3aXRoIGNvcGllZCBkYXRhXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUocm91dGVEYXRhKTtcblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCBhZnRlciBhZGRpbmcgcm91dGVcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGVtcHR5IHN0YXRlIHZpc2liaWxpdHlcbiAgICAgKi9cbiAgICB1cGRhdGVFbXB0eVN0YXRlKCkge1xuICAgICAgICBjb25zdCAkZXhpc3RpbmdSb3dzID0gJCgnLnJvdXRlLXJvdycpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nUm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgcGxhY2Vob2xkZXIsIGhpZGUgdGFibGUgY29udGFpbmVyXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyLnNob3coKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgZW1wdHkgcGxhY2Vob2xkZXIsIHNob3cgdGFibGUgY29udGFpbmVyXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyLmhpZGUoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJvdXRlRGF0YSAtIFJvdXRlIGRhdGEgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIGFkZFJvdXRlKHJvdXRlRGF0YSA9IG51bGwpIHtcbiAgICAgICAgY29uc3QgJHRlbXBsYXRlID0gJCgnLnJvdXRlLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9IHJvdXRlRGF0YT8uaWQgfHwgYG5ld18ke0RhdGUubm93KCl9YDtcblxuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JvdXRlLXJvdy10ZW1wbGF0ZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3JvdXRlLXJvdycpXG4gICAgICAgICAgICAuYXR0cignZGF0YS1yb3V0ZS1pZCcsIHJvdXRlSWQpXG4gICAgICAgICAgICAuc2hvdygpO1xuXG4gICAgICAgIC8vIFNldCB2YWx1ZXMgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHJvdXRlRGF0YSkge1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbChyb3V0ZURhdGEubmV0d29yayk7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKHJvdXRlRGF0YS5nYXRld2F5KTtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKHJvdXRlRGF0YS5kZXNjcmlwdGlvbiB8fCAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgdG8gdGFibGVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nUm93cyA9ICQoJy5yb3V0ZS1yb3cnKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ1Jvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkdGVtcGxhdGUuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZXhpc3RpbmdSb3dzLmxhc3QoKS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0aGlzIHJvd1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVTdWJuZXREcm9wZG93bigkbmV3Um93LCByb3V0ZURhdGE/LnN1Ym5ldCB8fCAnMjQnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGludGVyZmFjZSBkcm9wZG93biBmb3IgdGhpcyByb3dcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24oJG5ld1Jvdywgcm91dGVEYXRhPy5pbnRlcmZhY2UgfHwgJycpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW5wdXRtYXNrIGZvciBJUCBhZGRyZXNzIGZpZWxkc1xuICAgICAgICAkbmV3Um93LmZpbmQoJy5pcGFkZHJlc3MnKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCBwbGFjZWhvbGRlcjogJ18nfSk7XG5cbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlRW1wdHlTdGF0ZSgpO1xuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciBhIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gUm93IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0ZWRWYWx1ZSAtIFNlbGVjdGVkIHN1Ym5ldCB2YWx1ZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVTdWJuZXREcm9wZG93bigkcm93LCBzZWxlY3RlZFZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkcm93LmZpbmQoJy5zdWJuZXQtZHJvcGRvd24tY29udGFpbmVyJyk7XG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7JHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyl9YDtcblxuICAgICAgICAkY29udGFpbmVyLmh0bWwoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCIke2Ryb3Bkb3duSWR9XCIgLz5gKTtcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZHJvcGRvd25JZCxcbiAgICAgICAgICAgIHsgW2Ryb3Bkb3duSWRdOiBzZWxlY3RlZFZhbHVlIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW50ZXJmYWNlIGRyb3Bkb3duIGZvciBhIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gUm93IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0ZWRWYWx1ZSAtIFNlbGVjdGVkIGludGVyZmFjZSB2YWx1ZSAoZW1wdHkgc3RyaW5nID0gYXV0bylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24oJHJvdywgc2VsZWN0ZWRWYWx1ZSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJHJvdy5maW5kKCcuaW50ZXJmYWNlLWRyb3Bkb3duLWNvbnRhaW5lcicpO1xuICAgICAgICBjb25zdCBkcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0keyRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpfWA7XG5cbiAgICAgICAgJGNvbnRhaW5lci5odG1sKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiJHtkcm9wZG93bklkfVwiIC8+YCk7XG5cbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gb3B0aW9uczogXCJBdXRvXCIgKyBhdmFpbGFibGUgaW50ZXJmYWNlc1xuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19BdXRvIHx8ICdBdXRvJyB9LFxuICAgICAgICAgICAgLi4uU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzLm1hcChpZmFjZSA9PiAoe1xuICAgICAgICAgICAgICAgIHZhbHVlOiBpZmFjZS52YWx1ZSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5sYWJlbFxuICAgICAgICAgICAgfSkpXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gUHJlcGFyZSBmb3JtIGRhdGEgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7fTtcbiAgICAgICAgZm9ybURhdGFbZHJvcGRvd25JZF0gPSBzZWxlY3RlZFZhbHVlIHx8ICcnOyAvLyBFbnN1cmUgd2UgcGFzcyBlbXB0eSBzdHJpbmcgZm9yIFwiQXV0b1wiXG5cbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGRyb3Bkb3duSWQsXG4gICAgICAgICAgICBmb3JtRGF0YSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHJvdXRlIHByaW9yaXRpZXMgYmFzZWQgb24gdGFibGUgb3JkZXJcbiAgICAgKi9cbiAgICB1cGRhdGVQcmlvcml0aWVzKCkge1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtcHJpb3JpdHknLCBpbmRleCArIDEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCByb3V0ZXMgZnJvbSBkYXRhXG4gICAgICogQHBhcmFtIHtBcnJheX0gcm91dGVzRGF0YSAtIEFycmF5IG9mIHJvdXRlIG9iamVjdHNcbiAgICAgKi9cbiAgICBsb2FkUm91dGVzKHJvdXRlc0RhdGEpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3Rpbmcgcm91dGVzXG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5yZW1vdmUoKTtcblxuICAgICAgICAvLyBBZGQgZWFjaCByb3V0ZVxuICAgICAgICBpZiAocm91dGVzRGF0YSAmJiByb3V0ZXNEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJvdXRlc0RhdGEuZm9yRWFjaChyb3V0ZSA9PiB7XG4gICAgICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZShyb3V0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgc3RhdGUgaWYgbm8gcm91dGVzXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGFmdGVyIGFkZGluZyByb3V0ZXNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29sbGVjdCByb3V0ZXMgZnJvbSB0YWJsZVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqL1xuICAgIGNvbGxlY3RSb3V0ZXMoKSB7XG4gICAgICAgIGNvbnN0IHJvdXRlcyA9IFtdO1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQocm93KTtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHN1Ym5ldERyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7cm91dGVJZH1gO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlRHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHtyb3V0ZUlkfWA7XG5cbiAgICAgICAgICAgIHJvdXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBpZDogcm91dGVJZC5zdGFydHNXaXRoKCduZXdfJykgPyBudWxsIDogcm91dGVJZCxcbiAgICAgICAgICAgICAgICBuZXR3b3JrOiAkcm93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgc3VibmV0OiAkKGAjJHtzdWJuZXREcm9wZG93bklkfWApLnZhbCgpLFxuICAgICAgICAgICAgICAgIGdhdGV3YXk6ICRyb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2U6ICQoYCMke2ludGVyZmFjZURyb3Bkb3duSWR9YCkudmFsKCkgfHwgJycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICRyb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4ICsgMVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcm91dGVzO1xuICAgIH1cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbmV0d29yayBzZXR0aW5ncyBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBuZXR3b3Jrcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==