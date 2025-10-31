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
   * DEPRECATED: Docker now uses same interface tabs as regular installation
   */
  showDockerNetworkInfo: function showDockerNetworkInfo(data) {
    // This function is no longer used - Docker uses createInterfaceTabs instead
    console.warn('showDockerNetworkInfo is deprecated');
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
   * @param {Object} data - Interface data from API
   * @param {boolean} isDocker - Whether running in Docker environment
   */
  createInterfaceTabs: function createInterfaceTabs(data) {
    var isDocker = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
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
      // In Docker, disable delete for all interfaces

      var canDelete = !isDocker && parseInt(iface.vlanid, 10) > 0;
      var deleteButton = canDelete ? "\n                <a class=\"ui icon left labeled button delete-interface\" data-value=\"".concat(tabId, "\">\n                    <i class=\"icon trash\"></i>").concat(globalTranslate.nw_DeleteCurrentInterface, "\n                </a>\n            ") : '';
      $content.append(networks.createInterfaceForm(iface, isActive, deleteButton, isDocker));
    }); // Create template tab for new VLAN (not for Docker)

    if (data.template && !isDocker) {
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
   * @param {Object} iface - Interface data
   * @param {boolean} isActive - Whether this tab is active
   * @param {string} deleteButton - HTML for delete button
   * @param {boolean} isDocker - Whether running in Docker environment
   */
  createInterfaceForm: function createInterfaceForm(iface, isActive, deleteButton) {
    var isDocker = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    var id = iface.id;
    var isInternetInterface = iface.internet || false; // DNS/Gateway fields visibility and read-only state

    var dnsGatewayVisible = isInternetInterface ? '' : 'style="display:none;"'; // In Docker: Gateway is always readonly, DNS fields are editable
    // In regular mode: All fields readonly if DHCP enabled

    var gatewayReadonly = isDocker || iface.dhcp ? 'readonly' : '';
    var gatewayDisabledClass = isDocker || iface.dhcp ? 'disabled' : '';
    var dnsReadonly = isDocker ? '' : iface.dhcp ? 'readonly' : '';
    var dnsDisabledClass = isDocker ? '' : iface.dhcp ? 'disabled' : ''; // In Docker: IP, subnet, VLAN are readonly

    var dockerReadonly = isDocker ? 'readonly' : '';
    var dockerDisabledClass = isDocker ? 'disabled' : ''; // In Docker: DHCP checkbox is disabled and always checked

    var dhcpDisabled = isDocker || iface.vlanid > 0;
    var dhcpChecked = isDocker || (iface.vlanid > 0 ? false : iface.dhcp);
    return "\n            <div class=\"ui bottom attached tab segment ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(id, "\">\n                <input type=\"hidden\" name=\"interface_").concat(id, "\" value=\"").concat(iface["interface"], "\" />\n\n                ").concat(isDocker ? "\n                <input type=\"hidden\" name=\"name_".concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                <input type=\"hidden\" name=\"internet_interface\" value=\"").concat(id, "\" />\n                <input type=\"hidden\" name=\"dhcp_").concat(id, "\" value=\"on\" />\n                ") : "\n                <div class=\"field\">\n                    <label>".concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox internet-radio\" id=\"internet-").concat(id, "-radio\">\n                            <input type=\"radio\" name=\"internet_interface\" value=\"").concat(id, "\" ").concat(isInternetInterface ? 'checked' : '', " />\n                            <label><i class=\"globe icon\"></i> ").concat(globalTranslate.nw_InternetInterface || 'Internet Interface', "</label>\n                        </div>\n                    </div>\n                </div>\n                "), "\n\n                ").concat(isDocker ? '' : "\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox".concat(dhcpDisabled ? ' disabled' : '', "\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" ").concat(dhcpChecked ? 'checked' : '', " ").concat(dhcpDisabled ? 'disabled' : '', " />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n                "), "\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                <div class=\"fields\" id=\"ip-address-group-").concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" ").concat(dockerReadonly, " />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '', "\" />\n                        </div>\n                    </div>\n                </div>\n\n                ").concat(isDocker ? '' : "\n                <div class=\"field\">\n                    <label>".concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"").concat(iface.vlanid || '0', "\" />\n                    </div>\n                </div>\n                "), "\n\n                <div class=\"dns-gateway-group-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                    <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetSettings || 'Internet Settings', "</div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Hostname || 'Hostname', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" name=\"hostname_").concat(id, "\" value=\"").concat(iface.hostname || '', "\" placeholder=\"mikopbx\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Domain || 'Domain', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" name=\"domain_").concat(id, "\" value=\"").concat(iface.domain || '', "\" placeholder=\"example.com\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Gateway, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"gateway_").concat(id, "\" value=\"").concat(iface.gateway || '', "\" ").concat(gatewayReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_PrimaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"primarydns_").concat(id, "\" value=\"").concat(iface.primarydns || '', "\" ").concat(dnsReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_SecondaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"secondarydns_").concat(id, "\" value=\"").concat(iface.secondarydns || '', "\" ").concat(dnsReadonly, " />\n                        </div>\n                    </div>\n                </div>\n\n                ").concat(deleteButton, "\n            </div>\n        ");
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
    // WHY: Both Docker and non-Docker now use interface tabs
    // Docker has restrictions: DHCP locked, IP/subnet/VLAN readonly, DNS editable
    networks.createInterfaceTabs(data, data.isDocker || false); // Set NAT settings

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJmb3JtIiwiaGlkZSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaXAiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXAiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBQb3J0IiwiVExTX1BPUlQiLCJSVFBQb3J0RnJvbSIsIlJUUFBvcnRUbyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGRoY3BDaGVja2JveCIsImlzRGhjcEVuYWJsZWQiLCIkaXBGaWVsZCIsIiRzdWJuZXREcm9wZG93biIsInByb3AiLCJjbG9zZXN0IiwidmFsIiwiYWRkTmV3Rm9ybVJ1bGVzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsIm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiT2JqZWN0IiwiYXNzaWduIiwic3RhdGljUm91dGVzIiwiY29sbGVjdFJvdXRlcyIsImZpbmQiLCIkaW5wdXQiLCJuYW1lIiwidmFsdWUiLCJ1bmRlZmluZWQiLCJTdHJpbmciLCIkc2VsZWN0IiwidXNlbmF0IiwiJGF1dG9VcGRhdGVEaXYiLCJwYXJlbnQiLCJhdXRvVXBkYXRlRXh0ZXJuYWxJcCIsImlucHV0SWQiLCJyb3dJZCIsInJlcGxhY2UiLCIkY2hlY2tib3giLCJpc0Rpc2FibGVkIiwiaGFzQ2xhc3MiLCIkY2hlY2tlZFJhZGlvIiwiaW50ZXJuZXRfaW50ZXJmYWNlIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImlubGluZSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsImlzRG9ja2VyIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJzaG93RG9ja2VyTmV0d29ya0luZm8iLCJjb25zb2xlIiwid2FybiIsImNpZHJUb05ldG1hc2siLCJjaWRyIiwibWFzayIsImpvaW4iLCJjcmVhdGVJbnRlcmZhY2VUYWJzIiwiJG1lbnUiLCIkY29udGVudCIsImVtcHR5IiwiaW50ZXJmYWNlcyIsImZvckVhY2giLCJpZmFjZSIsInRhYklkIiwiaWQiLCJ0YWJMYWJlbCIsInZsYW5pZCIsImlzQWN0aXZlIiwiYXBwZW5kIiwiY2FuRGVsZXRlIiwicGFyc2VJbnQiLCJkZWxldGVCdXR0b24iLCJud19EZWxldGVDdXJyZW50SW50ZXJmYWNlIiwiY3JlYXRlSW50ZXJmYWNlRm9ybSIsInRlbXBsYXRlIiwiY3JlYXRlVGVtcGxhdGVGb3JtIiwicGh5c2ljYWxJbnRlcmZhY2VzIiwidG9TdHJpbmciLCJwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMiLCJ2YWx1ZXMiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImludGVyZmFjZV8wIiwic3RhdGljT3B0aW9ucyIsInBsYWNlaG9sZGVyIiwibndfU2VsZWN0SW50ZXJmYWNlIiwiYWxsb3dFbXB0eSIsImZpZWxkTmFtZSIsImZvcm1EYXRhIiwic3VibmV0IiwiZ2V0U3VibmV0T3B0aW9uc0FycmF5IiwibndfU2VsZWN0TmV0d29ya01hc2siLCJhZGRpdGlvbmFsQ2xhc3NlcyIsInN1Ym5ldF8wIiwidGFiIiwiZmlyc3QiLCJ1cGRhdGVWaXNpYmlsaXR5Iiwib2ZmIiwiJGJ1dHRvbiIsImludGVyZmFjZUlkIiwicmVtb3ZlIiwiJHRhYkNvbnRlbnQiLCIkZmlyc3RUYWIiLCJlbmFibGVEaXJyaXR5IiwiY2hlY2tWYWx1ZXMiLCIkdmxhbklucHV0IiwidmxhblZhbHVlIiwic2VsZWN0ZWRJbnRlcmZhY2VJZCIsInNob3ciLCIkdGFiIiwicHJlcGVuZCIsIiRkbnNHYXRld2F5R3JvdXAiLCIkZG5zR2F0ZXdheUZpZWxkcyIsIm9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMiLCJzYXZlSW5pdGlhbFZhbHVlcyIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJmb21hbnRpY1ZhbHVlcyIsIm1hbnVhbFZhbHVlcyIsIiRmaWVsZCIsImlzIiwib2xkRm9ybVZhbHVlcyIsIm5ld0Zvcm1WYWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsInNldEV2ZW50cyIsImlzSW50ZXJuZXRJbnRlcmZhY2UiLCJpbnRlcm5ldCIsImRuc0dhdGV3YXlWaXNpYmxlIiwiZ2F0ZXdheVJlYWRvbmx5IiwiZGhjcCIsImdhdGV3YXlEaXNhYmxlZENsYXNzIiwiZG5zUmVhZG9ubHkiLCJkbnNEaXNhYmxlZENsYXNzIiwiZG9ja2VyUmVhZG9ubHkiLCJkb2NrZXJEaXNhYmxlZENsYXNzIiwiZGhjcERpc2FibGVkIiwiZGhjcENoZWNrZWQiLCJud19JbnRlcmZhY2VOYW1lIiwibndfSW50ZXJuZXRJbnRlcmZhY2UiLCJud19Vc2VESENQIiwibndfSVBBZGRyZXNzIiwiaXBhZGRyIiwibndfTmV0d29ya01hc2siLCJud19WbGFuSUQiLCJud19JbnRlcm5ldFNldHRpbmdzIiwibndfSG9zdG5hbWUiLCJob3N0bmFtZSIsIm53X0RvbWFpbiIsImRvbWFpbiIsIm53X0dhdGV3YXkiLCJnYXRld2F5IiwibndfUHJpbWFyeUROUyIsInByaW1hcnlkbnMiLCJud19TZWNvbmRhcnlETlMiLCJzZWNvbmRhcnlkbnMiLCJuYXQiLCIkYXV0b1VwZGF0ZUNoZWNrYm94IiwiQVVUT19VUERBVEVfRVhURVJOQUxfSVAiLCJrZXlzIiwia2V5IiwiYXZhaWxhYmxlSW50ZXJmYWNlcyIsImxvYWRSb3V0ZXMiLCJpbml0aWFsaXplRGlycml0eSIsImZuIiwiZiIsImkiLCJhIiwiaXBhZGRyV2l0aFBvcnRPcHRpb25hbCIsImNoZWNrVmxhbiIsInBhcmFtIiwiYWxsVmFsdWVzIiwibmV3RXRoTmFtZSIsInZsYW5pZF8wIiwiaW5kZXhPZiIsImV0aE5hbWUiLCJzcGxpdCIsImluQXJyYXkiLCJwdXNoIiwiZXh0ZW5hbElwSG9zdCIsInZhbGlkSG9zdG5hbWUiLCJob3N0bmFtZVJlZ2V4IiwidGVzdCIsIiR0YWJsZSIsIiRzZWN0aW9uIiwiJGFkZEJ1dHRvbiIsIiR0YWJsZUNvbnRhaW5lciIsIiRlbXB0eVBsYWNlaG9sZGVyIiwicm91dGVzIiwiaW5pdGlhbGl6ZURyYWdBbmREcm9wIiwiYWRkUm91dGUiLCJkb2N1bWVudCIsInRhcmdldCIsInVwZGF0ZVByaW9yaXRpZXMiLCJ1cGRhdGVFbXB0eVN0YXRlIiwiZGF0YUNoYW5nZWQiLCIkc291cmNlUm93IiwiY29weVJvdXRlIiwicGFzdGVkRGF0YSIsIm9yaWdpbmFsRXZlbnQiLCJjbGlwYm9hcmREYXRhIiwiZ2V0RGF0YSIsIndpbmRvdyIsImNsZWFuZWREYXRhIiwidHJpbSIsInNldFRpbWVvdXQiLCJ0YWJsZURuRFVwZGF0ZSIsInRhYmxlRG5EIiwib25Ecm9wIiwiZHJhZ0hhbmRsZSIsImludGVyZmFjZUNvdW50Iiwibm90Iiwicm91dGVJZCIsInN1Ym5ldERyb3Bkb3duSWQiLCJpbnRlcmZhY2VEcm9wZG93bklkIiwicm91dGVEYXRhIiwibmV0d29yayIsImRlc2NyaXB0aW9uIiwiJGV4aXN0aW5nUm93cyIsIiR0ZW1wbGF0ZSIsImxhc3QiLCIkbmV3Um93IiwiY2xvbmUiLCJEYXRlIiwibm93IiwiYWZ0ZXIiLCJpbml0aWFsaXplU3VibmV0RHJvcGRvd24iLCJpbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24iLCIkcm93Iiwic2VsZWN0ZWRWYWx1ZSIsIiRjb250YWluZXIiLCJkcm9wZG93bklkIiwib3B0aW9ucyIsIm53X0F1dG8iLCJtYXAiLCJsYWJlbCIsInJvdyIsInJvdXRlc0RhdGEiLCJyb3V0ZSIsInN0YXJ0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ICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN5c2luZm9BUEksIE5ldHdvcmtBUEksIFVzZXJNZXNzYWdlLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBuZXR3b3JrIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBuZXR3b3Jrc1xuICovXG5jb25zdCBuZXR3b3JrcyA9IHtcbiAgICAkZ2V0TXlJcEJ1dHRvbjogJCgnI2dldG15aXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNuZXR3b3JrLWZvcm0nKSxcblxuICAgICRkcm9wRG93bnM6ICQoJyNuZXR3b3JrLWZvcm0gLmRyb3Bkb3duJyksXG4gICAgJGV4dGlwYWRkcjogJCgnI2V4dGlwYWRkcicpLFxuICAgICRpcGFkZHJlc3NJbnB1dDogJCgnLmlwYWRkcmVzcycpLFxuICAgIHZsYW5zQXJyYXk6IHt9LFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnRzIHdpdGggd2Ugc2hvdWxkIGhpZGUgZnJvbSB0aGUgZm9ybSBmb3IgZG9ja2VyIGluc3RhbGxhdGlvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub3RTaG93T25Eb2NrZXJEaXZzOiAkKCcuZG8tbm90LXNob3ctaWYtZG9ja2VyJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0aXBhZGRyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyV2l0aFBvcnRPcHRpb25hbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGhvc3RuYW1lOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAndXNlbmF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd2YWxpZEhvc3RuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVIb3N0bmFtZUludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gTG9hZCBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAgICBuZXR3b3Jrcy5sb2FkQ29uZmlndXJhdGlvbigpO1xuXG4gICAgICAgIC8vIEhhbmRsZXMgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgJ3VzZW5hdC1jaGVja2JveCcuXG4gICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBuZXR3b3Jrcy4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gREhDUCBjaGVja2JveCBoYW5kbGVycyB3aWxsIGJlIGJvdW5kIGFmdGVyIHRhYnMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHlcblxuICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFN5c2luZm9BUEkuZ2V0RXh0ZXJuYWxJcEluZm8obmV0d29ya3MuY2JBZnRlckdldEV4dGVybmFsSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG4gICAgICAgIG5ldHdvcmtzLiRpcGFkZHJlc3NJbnB1dC5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICAvLyBBcHBseSBJUCBtYXNrIGZvciBleHRlcm5hbCBJUCBhZGRyZXNzIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgbmV0d29ya3MuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN0YXRpYyByb3V0ZXMgbWFuYWdlclxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBIaWRlIHN0YXRpYyByb3V0ZXMgc2VjdGlvbiBpbiBEb2NrZXIgKG1hbmFnZWQgdmlhIGRvLW5vdC1zaG93LWlmLWRvY2tlciBjbGFzcylcbiAgICAgICAgaWYgKG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ2lzLWRvY2tlcicpPT09XCIxXCIpIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRub3RTaG93T25Eb2NrZXJEaXZzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBnZXR0aW5nIHRoZSBleHRlcm5hbCBJUCBmcm9tIGEgcmVtb3RlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXIuIElmIGZhbHNlLCBpbmRpY2F0ZXMgYW4gZXJyb3Igb2NjdXJyZWQuXG4gICAgICovXG4gICAgY2JBZnRlckdldEV4dGVybmFsSXAocmVzcG9uc2UpIHtcbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8ICFyZXNwb25zZS5yZXN1bHQgfHwgIXJlc3BvbnNlLmRhdGEgfHwgIXJlc3BvbnNlLmRhdGEuaXApIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubndfRXJyb3JHZXR0aW5nRXh0ZXJuYWxJcCB8fCAnRmFpbGVkIHRvIGdldCBleHRlcm5hbCBJUCBhZGRyZXNzJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdXJyZW50RXh0SXBBZGRyID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGlwYWRkcicpO1xuICAgICAgICBjb25zdCBwb3J0TWF0Y2ggPSBjdXJyZW50RXh0SXBBZGRyLm1hdGNoKC86KFxcZCspJC8pO1xuICAgICAgICBjb25zdCBwb3J0ID0gcG9ydE1hdGNoID8gJzonICsgcG9ydE1hdGNoWzFdIDogJyc7XG4gICAgICAgIGNvbnN0IG5ld0V4dElwQWRkciA9IHJlc3BvbnNlLmRhdGEuaXAgKyBwb3J0O1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgbmV3RXh0SXBBZGRyKTtcbiAgICAgICAgLy8gQ2xlYXIgZXh0ZXJuYWwgaG9zdG5hbWUgd2hlbiBnZXR0aW5nIGV4dGVybmFsIElQXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRob3N0bmFtZScsICcnKTtcbiAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBoZWxwIHRleHQgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVOQVRIZWxwVGV4dChwb3J0cykge1xuICAgICAgICAvLyBXSFk6IFBvcnQga2V5cyBtYXRjaCBQYnhTZXR0aW5ncyBjb25zdGFudHMgKFNJUFBvcnQsIFRMU19QT1JULCBSVFBQb3J0RnJvbSwgUlRQUG9ydFRvKVxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQUG9ydCB8fCAhcG9ydHMuVExTX1BPUlQgfHwgIXBvcnRzLlJUUFBvcnRGcm9tIHx8ICFwb3J0cy5SVFBQb3J0VG8pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBTSVAgcG9ydHMgdGV4dCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkc2lwUG9ydFZhbHVlcyA9ICQoJyNuYXQtaGVscC1zaXAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkc2lwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBUZXh0ID0gaTE4bignbndfTkFUSW5mbzMnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQUG9ydCxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwUG9ydFZhbHVlcy5odG1sKHNpcFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFJUUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRydHBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRydHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJ0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUFBvcnRGcm9tLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6IHBvcnRzLlJUUFBvcnRUb1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkcnRwUG9ydFZhbHVlcy5odG1sKHJ0cFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwb3J0IGZpZWxkIGxhYmVscyB3aXRoIGFjdHVhbCBpbnRlcm5hbCBwb3J0IHZhbHVlcyBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBvcnRzIC0gUG9ydCBjb25maWd1cmF0aW9uIG9iamVjdCBmcm9tIEFQSVxuICAgICAqL1xuICAgIHVwZGF0ZVBvcnRMYWJlbHMocG9ydHMpIHtcbiAgICAgICAgLy8gV0hZOiBQb3J0IGtleXMgbWF0Y2ggUGJ4U2V0dGluZ3MgY29uc3RhbnRzIChTSVBQb3J0LCBUTFNfUE9SVClcbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgd2UgaGF2ZSBwb3J0IHZhbHVlcyBmcm9tIHNlcnZlclxuICAgICAgICBpZiAoIXBvcnRzLlNJUFBvcnQgfHwgIXBvcnRzLlRMU19QT1JUKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZXJuYWwgU0lQIHBvcnQgbGFiZWwgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHNpcExhYmVsID0gJCgnI2V4dGVybmFsLXNpcC1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkc2lwTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2lwTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljU0lQUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBMYWJlbC50ZXh0KHNpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZXJuYWwgVExTIHBvcnQgbGFiZWwgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHRsc0xhYmVsID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkdGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkdGxzTGFiZWwudGV4dCh0bHNMYWJlbFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlICdkaXNhYmxlZCcgY2xhc3MgZm9yIHNwZWNpZmljIGZpZWxkcyBiYXNlZCBvbiB0aGVpciBjaGVja2JveCBzdGF0ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldGggPSAkKG9iaikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2V0aH0tY2hlY2tib3hgKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgICAgIC8vIEZpbmQgSVAgYWRkcmVzcyBhbmQgc3VibmV0IGZpZWxkc1xuICAgICAgICAgICAgY29uc3QgJGlwRmllbGQgPSAkKGBpbnB1dFtuYW1lPVwiaXBhZGRyXyR7ZXRofVwiXWApO1xuICAgICAgICAgICAgLy8gRHluYW1pY0Ryb3Bkb3duQnVpbGRlciBjcmVhdGVzIGRyb3Bkb3duIHdpdGggaWQgcGF0dGVybjogZmllbGROYW1lLWRyb3Bkb3duXG4gICAgICAgICAgICBjb25zdCAkc3VibmV0RHJvcGRvd24gPSAkKGAjc3VibmV0XyR7ZXRofS1kcm9wZG93bmApO1xuXG4gICAgICAgICAgICBpZiAoaXNEaGNwRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZW5hYmxlZCAtPiBtYWtlIElQL3N1Ym5ldCByZWFkLW9ubHkgYW5kIGFkZCBkaXNhYmxlZCBjbGFzc1xuICAgICAgICAgICAgICAgICRpcEZpZWxkLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJGlwRmllbGQuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJHN1Ym5ldERyb3Bkb3duLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGRpc2FibGVkIC0+IG1ha2UgSVAvc3VibmV0IGVkaXRhYmxlXG4gICAgICAgICAgICAgICAgJGlwRmllbGQucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgJGlwRmllbGQuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJHN1Ym5ldERyb3Bkb3duLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJzEnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV0d29ya3MuYWRkTmV3Rm9ybVJ1bGVzKGV0aCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIC8vIEZvciB0ZW1wbGF0ZSBpbnRlcmZhY2UgKGlkPTApLCBhZGQgZGVwZW5kZW5jeSBvbiBpbnRlcmZhY2Ugc2VsZWN0aW9uXG4gICAgICAgIGlmIChuZXdSb3dJZCA9PT0gMCB8fCBuZXdSb3dJZCA9PT0gJzAnKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2lwYWRkckNsYXNzXSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpcGFkZHJDbGFzcyxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCwgIC8vIFRlbXBsYXRlOiB2YWxpZGF0ZSBvbmx5IGlmIGludGVyZmFjZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogYG5vdGRoY3BfJHtuZXdSb3dJZH1gLCAgLy8gUmVhbCBpbnRlcmZhY2U6IHZhbGlkYXRlIG9ubHkgaWYgREhDUCBpcyBPRkZcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERIQ1AgdmFsaWRhdGlvbiByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgb2JqZWN0IHdpdGggYWxsIHNldHRpbmdzIHByb3BlcnRpZXNcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHt9O1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc3RhdGljIHJvdXRlc1xuICAgICAgICByZXN1bHQuZGF0YS5zdGF0aWNSb3V0ZXMgPSBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmNvbGxlY3RSb3V0ZXMoKTtcblxuICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGZvcm0gdmFsdWVzIHRvIGF2b2lkIGFueSBET00tcmVsYXRlZCBpc3N1ZXNcbiAgICAgICAgLy8gQ29sbGVjdCBhbGwgcmVndWxhciBpbnB1dCBmaWVsZHNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbdHlwZT1cInRleHRcIl0sIGlucHV0W3R5cGU9XCJoaWRkZW5cIl0sIGlucHV0W3R5cGU9XCJudW1iZXJcIl0sIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gJGlucHV0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkaW5wdXQudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBzZWxlY3QgZHJvcGRvd25zXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ3NlbGVjdCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkc2VsZWN0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkc2VsZWN0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkc2VsZWN0LnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGdldCBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbbmFtZV0gPSAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkgPyBTdHJpbmcodmFsdWUpIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW5cbiAgICAgICAgLy8gUGJ4QXBpQ2xpZW50IHdpbGwgaGFuZGxlIGNvbnZlcnNpb24gdG8gc3RyaW5ncyBmb3IgalF1ZXJ5XG4gICAgICAgIHJlc3VsdC5kYXRhLnVzZW5hdCA9ICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIFVzZSBjb3JyZWN0IGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSAoYXV0b1VwZGF0ZUV4dGVybmFsSXAsIG5vdCBBVVRPX1VQREFURV9FWFRFUk5BTF9JUClcbiAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVEaXYgPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBpZiAoJGF1dG9VcGRhdGVEaXYubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSAkYXV0b1VwZGF0ZURpdi5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbnZlcnQgREhDUCBjaGVja2JveGVzIHRvIGJvb2xlYW4gZm9yIGVhY2ggaW50ZXJmYWNlXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJy5kaGNwLWNoZWNrYm94JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5wdXRJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgY29uc3Qgcm93SWQgPSBpbnB1dElkLnJlcGxhY2UoJ2RoY3AtJywgJycpLnJlcGxhY2UoJy1jaGVja2JveCcsICcnKTtcblxuICAgICAgICAgICAgLy8gRm9yIGRpc2FibGVkIGNoZWNrYm94ZXMsIHJlYWQgYWN0dWFsIGlucHV0IHN0YXRlIGluc3RlYWQgb2YgRm9tYW50aWMgVUkgQVBJXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKG9iaik7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gJGNoZWNrYm94Lmhhc0NsYXNzKCdkaXNhYmxlZCcpIHx8ICRpbnB1dC5wcm9wKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNEaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIEZvciBkaXNhYmxlZCBjaGVja2JveGVzLCByZWFkIHRoZSBhY3R1YWwgaW5wdXQgY2hlY2tlZCBzdGF0ZVxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2BkaGNwXyR7cm93SWR9YF0gPSAkaW5wdXQucHJvcCgnY2hlY2tlZCcpID09PSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZW5hYmxlZCBjaGVja2JveGVzLCB1c2UgRm9tYW50aWMgVUkgQVBJXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtyb3dJZH1gXSA9ICRjaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IGludGVybmV0IHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmludGVybmV0X2ludGVyZmFjZSA9IFN0cmluZygkY2hlY2tlZFJhZGlvLnZhbCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdIWTogTm8gcG9ydCBmaWVsZCBtYXBwaW5nIG5lZWRlZCAtIGZvcm0gZmllbGQgbmFtZXMgbWF0Y2ggQVBJIGNvbnN0YW50c1xuICAgICAgICAvLyAoZXh0ZXJuYWxTSVBQb3J0ID0gUGJ4U2V0dGluZ3M6OkVYVEVSTkFMX1NJUF9QT1JUKVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGVkIGJ5IEZvcm1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbmV0d29ya3MuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbmV0d29ya3MuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbmxpbmUgPSB0cnVlOyAvLyBTaG93IGlubGluZSBlcnJvcnMgbmV4dCB0byBmaWVsZHNcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBOZXR3b3JrQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZUNvbmZpZyc7XG5cbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL21vZGlmeS9gO1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG5ldHdvcmsgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQ29uZmlndXJhdGlvbigpIHtcbiAgICAgICAgTmV0d29ya0FQSS5nZXRDb25maWcoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGFmdGVyIGxvYWRpbmcgZGF0YVxuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBmb3JtIGVsZW1lbnRzIGNvbm5lY3RlZCB3aXRoIG5vbiBkb2NrZXIgaW5zdGFsbGF0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpcy1kb2NrZXInLCAnMScpO1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBEb2NrZXIgbmV0d29yayBpbmZvIGFzIHJlYWQtb25seVxuICAgICAqIERFUFJFQ0FURUQ6IERvY2tlciBub3cgdXNlcyBzYW1lIGludGVyZmFjZSB0YWJzIGFzIHJlZ3VsYXIgaW5zdGFsbGF0aW9uXG4gICAgICovXG4gICAgc2hvd0RvY2tlck5ldHdvcmtJbmZvKGRhdGEpIHtcbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyBubyBsb25nZXIgdXNlZCAtIERvY2tlciB1c2VzIGNyZWF0ZUludGVyZmFjZVRhYnMgaW5zdGVhZFxuICAgICAgICBjb25zb2xlLndhcm4oJ3Nob3dEb2NrZXJOZXR3b3JrSW5mbyBpcyBkZXByZWNhdGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgQ0lEUiBub3RhdGlvbiB0byBkb3R0ZWQgZGVjaW1hbCBuZXRtYXNrXG4gICAgICovXG4gICAgY2lkclRvTmV0bWFzayhjaWRyKSB7XG4gICAgICAgIGNvbnN0IG1hc2sgPSB+KDIgKiogKDMyIC0gY2lkcikgLSAxKTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIChtYXNrID4+PiAyNCkgJiAyNTUsXG4gICAgICAgICAgICAobWFzayA+Pj4gMTYpICYgMjU1LFxuICAgICAgICAgICAgKG1hc2sgPj4+IDgpICYgMjU1LFxuICAgICAgICAgICAgbWFzayAmIDI1NVxuICAgICAgICBdLmpvaW4oJy4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGludGVyZmFjZSB0YWJzIGFuZCBmb3JtcyBkeW5hbWljYWxseSBmcm9tIFJFU1QgQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEludGVyZmFjZSBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0RvY2tlciAtIFdoZXRoZXIgcnVubmluZyBpbiBEb2NrZXIgZW52aXJvbm1lbnRcbiAgICAgKi9cbiAgICBjcmVhdGVJbnRlcmZhY2VUYWJzKGRhdGEsIGlzRG9ja2VyID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudScpO1xuICAgICAgICBjb25zdCAkY29udGVudCA9ICQoJyNldGgtaW50ZXJmYWNlcy1jb250ZW50Jyk7XG5cbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY29udGVudFxuICAgICAgICAkbWVudS5lbXB0eSgpO1xuICAgICAgICAkY29udGVudC5lbXB0eSgpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0YWJzIGZvciBleGlzdGluZyBpbnRlcmZhY2VzXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRhYklkID0gaWZhY2UuaWQ7XG4gICAgICAgICAgICBjb25zdCB0YWJMYWJlbCA9IGAke2lmYWNlLm5hbWUgfHwgaWZhY2UuaW50ZXJmYWNlfSAoJHtpZmFjZS5pbnRlcmZhY2V9JHtpZmFjZS52bGFuaWQgIT09ICcwJyAmJiBpZmFjZS52bGFuaWQgIT09IDAgPyBgLiR7aWZhY2UudmxhbmlkfWAgOiAnJ30pYDtcbiAgICAgICAgICAgIGNvbnN0IGlzQWN0aXZlID0gaW5kZXggPT09IDA7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbSAke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7dGFiTGFiZWx9XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgY29udGVudFxuICAgICAgICAgICAgLy8gT25seSBWTEFOIGludGVyZmFjZXMgY2FuIGJlIGRlbGV0ZWQgKHZsYW5pZCA+IDApXG4gICAgICAgICAgICAvLyBJbiBEb2NrZXIsIGRpc2FibGUgZGVsZXRlIGZvciBhbGwgaW50ZXJmYWNlc1xuICAgICAgICAgICAgY29uc3QgY2FuRGVsZXRlID0gIWlzRG9ja2VyICYmIHBhcnNlSW50KGlmYWNlLnZsYW5pZCwgMTApID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ1dHRvbiA9IGNhbkRlbGV0ZSA/IGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cInVpIGljb24gbGVmdCBsYWJlbGVkIGJ1dHRvbiBkZWxldGUtaW50ZXJmYWNlXCIgZGF0YS12YWx1ZT1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaFwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19EZWxldGVDdXJyZW50SW50ZXJmYWNlfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGAgOiAnJztcblxuICAgICAgICAgICAgJGNvbnRlbnQuYXBwZW5kKG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24sIGlzRG9ja2VyKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSB0YWIgZm9yIG5ldyBWTEFOIChub3QgZm9yIERvY2tlcilcbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUgJiYgIWlzRG9ja2VyKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRhdGEudGVtcGxhdGU7XG4gICAgICAgICAgICB0ZW1wbGF0ZS5pZCA9IDA7XG5cbiAgICAgICAgICAgIC8vIEFkZCBcIitcIiB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbVwiIGRhdGEtdGFiPVwiMFwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gcGx1c1wiPjwvaT5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRlbXBsYXRlIGZvcm0gd2l0aCBpbnRlcmZhY2Ugc2VsZWN0b3JcbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVUZW1wbGF0ZUZvcm0odGVtcGxhdGUsIGRhdGEuaW50ZXJmYWNlcykpO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBpbnRlcmZhY2Ugc2VsZWN0b3IgZHJvcGRvd24gZm9yIHRlbXBsYXRlXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKGlmYWNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdKSB7XG4gICAgICAgICAgICAgICAgICAgIHBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLmlkLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5pbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpZmFjZS5pbnRlcmZhY2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zID0gT2JqZWN0LnZhbHVlcyhwaHlzaWNhbEludGVyZmFjZXMpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ2ludGVyZmFjZV8wJywgeyBpbnRlcmZhY2VfMDogJycgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZSxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3ducyB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gYHN1Ym5ldF8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHt9O1xuICAgICAgICAgICAgLy8gQ29udmVydCBzdWJuZXQgdG8gc3RyaW5nIGZvciBkcm9wZG93biBtYXRjaGluZ1xuICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5zdWJuZXQgfHwgJzI0Jyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSAgLy8gQWRkIHNlYXJjaCBjbGFzcyBmb3Igc2VhcmNoYWJsZSBkcm9wZG93blxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0ZW1wbGF0ZSAoaWQgPSAwKVxuICAgICAgICBpZiAoZGF0YS50ZW1wbGF0ZSkge1xuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdzdWJuZXRfMCcsIHsgc3VibmV0XzA6ICcyNCcgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10gIC8vIEFkZCBzZWFyY2ggY2xhc3MgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykuZmlyc3QoKS50cmlnZ2VyKCdjbGljaycpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0aWMgcm91dGVzIHNlY3Rpb24gdmlzaWJpbGl0eVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBSZS1iaW5kIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiByZW1vdmVzIFRBQiBmcm9tIGZvcm0gYW5kIG1hcmtzIGludGVyZmFjZSBhcyBkaXNhYmxlZFxuICAgICAgICAvLyBBY3R1YWwgZGVsZXRpb24gaGFwcGVucyBvbiBmb3JtIHN1Ym1pdFxuICAgICAgICAkKCcuZGVsZXRlLWludGVyZmFjZScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIG1lbnUgaXRlbVxuICAgICAgICAgICAgJChgI2V0aC1pbnRlcmZhY2VzLW1lbnUgYVtkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCkucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0ICR0YWJDb250ZW50ID0gJChgI2V0aC1pbnRlcmZhY2VzLWNvbnRlbnQgLnRhYltkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCk7XG4gICAgICAgICAgICAkdGFiQ29udGVudC5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQWRkIGhpZGRlbiBmaWVsZCB0byBtYXJrIHRoaXMgaW50ZXJmYWNlIGFzIGRpc2FibGVkXG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5hcHBlbmQoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImRpc2FibGVkXyR7aW50ZXJmYWNlSWR9XCIgdmFsdWU9XCIxXCIgLz5gKTtcblxuICAgICAgICAgICAgLy8gU3dpdGNoIHRvIGZpcnN0IGF2YWlsYWJsZSB0YWJcbiAgICAgICAgICAgIGNvbnN0ICRmaXJzdFRhYiA9ICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEuaXRlbScpLmZpcnN0KCk7XG4gICAgICAgICAgICBpZiAoJGZpcnN0VGFiLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZmlyc3RUYWIudGFiKCdjaGFuZ2UgdGFiJywgJGZpcnN0VGFiLmF0dHIoJ2RhdGEtdGFiJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBlbmFibGUgc3VibWl0IGJ1dHRvblxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBESENQIGNoZWNrYm94IGhhbmRsZXJzXG4gICAgICAgICQoJy5kaGNwLWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1iaW5kIElQIGFkZHJlc3MgaW5wdXQgbWFza3NcbiAgICAgICAgJCgnLmlwYWRkcmVzcycpLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIC8vIEFkZCBWTEFOIElEIGNoYW5nZSBoYW5kbGVycyB0byBjb250cm9sIERIQ1AgY2hlY2tib3ggc3RhdGVcbiAgICAgICAgJCgnaW5wdXRbbmFtZV49XCJ2bGFuaWRfXCJdJykub2ZmKCdpbnB1dCBjaGFuZ2UnKS5vbignaW5wdXQgY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkdmxhbklucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJHZsYW5JbnB1dC5hdHRyKCduYW1lJykucmVwbGFjZSgndmxhbmlkXycsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IHZsYW5WYWx1ZSA9IHBhcnNlSW50KCR2bGFuSW5wdXQudmFsKCksIDEwKSB8fCAwO1xuICAgICAgICAgICAgY29uc3QgJGRoY3BDaGVja2JveCA9ICQoYCNkaGNwLSR7aW50ZXJmYWNlSWR9LWNoZWNrYm94YCk7XG5cbiAgICAgICAgICAgIGlmICh2bGFuVmFsdWUgPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gRGlzYWJsZSBESENQIGNoZWNrYm94IGZvciBWTEFOIGludGVyZmFjZXNcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdzZXQgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmZpbmQoJ2lucHV0JykucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRW5hYmxlIERIQ1AgY2hlY2tib3ggZm9yIG5vbi1WTEFOIGludGVyZmFjZXNcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3NldCBlbmFibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5maW5kKCdpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVXBkYXRlIGRpc2FibGVkIGZpZWxkIGNsYXNzZXNcbiAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmlnZ2VyIHRoZSBoYW5kbGVyIGZvciBleGlzdGluZyBWTEFOIGludGVyZmFjZXMgdG8gYXBwbHkgaW5pdGlhbCBzdGF0ZVxuICAgICAgICAkKCdpbnB1dFtuYW1lXj1cInZsYW5pZF9cIl0nKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGludGVybmV0IHJhZGlvIGJ1dHRvbnMgd2l0aCBGb21hbnRpYyBVSVxuICAgICAgICAkKCcuaW50ZXJuZXQtcmFkaW8nKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEFkZCBpbnRlcm5ldCByYWRpbyBidXR0b24gY2hhbmdlIGhhbmRsZXJcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXScpLm9mZignY2hhbmdlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJbnRlcmZhY2VJZCA9ICQodGhpcykudmFsKCk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgYWxsIEROUy9HYXRld2F5IGdyb3Vwc1xuICAgICAgICAgICAgJCgnW2NsYXNzXj1cImRucy1nYXRld2F5LWdyb3VwLVwiXScpLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBETlMvR2F0ZXdheSBncm91cCBmb3Igc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlXG4gICAgICAgICAgICAkKGAuZG5zLWdhdGV3YXktZ3JvdXAtJHtzZWxlY3RlZEludGVyZmFjZUlkfWApLnNob3coKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIFRBQiBpY29ucyAtIGFkZCBnbG9iZSBpY29uIHRvIHNlbGVjdGVkLCByZW1vdmUgZnJvbSBvdGhlcnNcbiAgICAgICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgdGFiKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRhYiA9ICQodGFiKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YWJJZCA9ICR0YWIuYXR0cignZGF0YS10YWInKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBnbG9iZSBpY29uXG4gICAgICAgICAgICAgICAgJHRhYi5maW5kKCcuZ2xvYmUuaWNvbicpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGdsb2JlIGljb24gdG8gc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlIFRBQlxuICAgICAgICAgICAgICAgIGlmICh0YWJJZCA9PT0gc2VsZWN0ZWRJbnRlcmZhY2VJZCkge1xuICAgICAgICAgICAgICAgICAgICAkdGFiLnByZXBlbmQoJzxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBETlMvR2F0ZXdheSByZWFkb25seSBzdGF0ZSB3aGVuIERIQ1AgY2hhbmdlc1xuICAgICAgICAkKCcuZGhjcC1jaGVja2JveCcpLm9mZignY2hhbmdlLmRuc2dhdGV3YXknKS5vbignY2hhbmdlLmRuc2dhdGV3YXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRjaGVja2JveC5hdHRyKCdpZCcpLnJlcGxhY2UoJ2RoY3AtJywgJycpLnJlcGxhY2UoJy1jaGVja2JveCcsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSAkY2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAgICAgLy8gRmluZCBETlMvR2F0ZXdheSBmaWVsZHMgZm9yIHRoaXMgaW50ZXJmYWNlXG4gICAgICAgICAgICBjb25zdCAkZG5zR2F0ZXdheUdyb3VwID0gJChgLmRucy1nYXRld2F5LWdyb3VwLSR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgICAgICBjb25zdCAkZG5zR2F0ZXdheUZpZWxkcyA9ICRkbnNHYXRld2F5R3JvdXAuZmluZCgnaW5wdXRbbmFtZV49XCJnYXRld2F5X1wiXSwgaW5wdXRbbmFtZV49XCJwcmltYXJ5ZG5zX1wiXSwgaW5wdXRbbmFtZV49XCJzZWNvbmRhcnlkbnNfXCJdJyk7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IG1ha2UgRE5TL0dhdGV3YXkgcmVhZC1vbmx5XG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAkZG5zR2F0ZXdheUZpZWxkcy5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBkaXNhYmxlZCAtPiBtYWtlIEROUy9HYXRld2F5IGVkaXRhYmxlXG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgaW5pdGlhbCBUQUIgaWNvbiB1cGRhdGUgZm9yIGNoZWNrZWQgcmFkaW8gYnV0dG9uXG4gICAgICAgIGNvbnN0ICRjaGVja2VkUmFkaW8gPSAkKCdpbnB1dFtuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCJdOmNoZWNrZWQnKTtcbiAgICAgICAgaWYgKCRjaGVja2VkUmFkaW8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJGNoZWNrZWRSYWRpby50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFwcGx5IGluaXRpYWwgZGlzYWJsZWQgc3RhdGUgZm9yIERIQ1AtZW5hYmxlZCBpbnRlcmZhY2VzXG4gICAgICAgIC8vIENhbGwgYWZ0ZXIgYWxsIGRyb3Bkb3ducyBhcmUgY3JlYXRlZFxuICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuICAgICAgICAvLyBSZS1zYXZlIGluaXRpYWwgZm9ybSB2YWx1ZXMgYW5kIHJlLWJpbmQgZXZlbnQgaGFuZGxlcnMgZm9yIGR5bmFtaWNhbGx5IGNyZWF0ZWQgaW5wdXRzXG4gICAgICAgIC8vIFRoaXMgaXMgZXNzZW50aWFsIGZvciBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gdG8gd29yayB3aXRoIGR5bmFtaWMgdGFic1xuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBPdmVycmlkZSBGb3JtIG1ldGhvZHMgdG8gbWFudWFsbHkgY29sbGVjdCBhbGwgZmllbGQgdmFsdWVzIChpbmNsdWRpbmcgZnJvbSB0YWJzKVxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxTYXZlSW5pdGlhbFZhbHVlcyA9IEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXM7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbENoZWNrVmFsdWVzID0gRm9ybS5jaGVja1ZhbHVlcztcblxuICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB2YWx1ZXMgZnJvbSBGb21hbnRpYyBVSSAobWF5IG1pc3MgZHluYW1pY2FsbHkgY3JlYXRlZCB0YWIgZmllbGRzKVxuICAgICAgICAgICAgICAgIGNvbnN0IGZvbWFudGljVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBhbGwgZmllbGQgdmFsdWVzIHRvIGNhdGNoIGZpZWxkcyB0aGF0IEZvbWFudGljIFVJIG1pc3Nlc1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hbnVhbFZhbHVlcyA9IHt9O1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgJGZpZWxkLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBNZXJnZSBib3RoIChtYW51YWwgdmFsdWVzIG92ZXJyaWRlIEZvbWFudGljIHZhbHVlcyBmb3IgZmllbGRzIHRoYXQgZXhpc3QgaW4gYm90aClcbiAgICAgICAgICAgICAgICBGb3JtLm9sZEZvcm1WYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmb21hbnRpY1ZhbHVlcywgbWFudWFsVmFsdWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdmFsdWVzIGZyb20gRm9tYW50aWMgVUlcbiAgICAgICAgICAgICAgICBjb25zdCBmb21hbnRpY1ZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlc1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hbnVhbFZhbHVlcyA9IHt9O1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgJGZpZWxkLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBNZXJnZSBib3RoXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Rm9ybVZhbHVlcyA9IE9iamVjdC5hc3NpZ24oe30sIGZvbWFudGljVmFsdWVzLCBtYW51YWxWYWx1ZXMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KEZvcm0ub2xkRm9ybVZhbHVlcykgPT09IEpTT04uc3RyaW5naWZ5KG5ld0Zvcm1WYWx1ZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0uc2V0RXZlbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5zZXRFdmVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZm9ybSBmb3IgZXhpc3RpbmcgaW50ZXJmYWNlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGlmYWNlIC0gSW50ZXJmYWNlIGRhdGFcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzQWN0aXZlIC0gV2hldGhlciB0aGlzIHRhYiBpcyBhY3RpdmVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGVsZXRlQnV0dG9uIC0gSFRNTCBmb3IgZGVsZXRlIGJ1dHRvblxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNEb2NrZXIgLSBXaGV0aGVyIHJ1bm5pbmcgaW4gRG9ja2VyIGVudmlyb25tZW50XG4gICAgICovXG4gICAgY3JlYXRlSW50ZXJmYWNlRm9ybShpZmFjZSwgaXNBY3RpdmUsIGRlbGV0ZUJ1dHRvbiwgaXNEb2NrZXIgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCBpZCA9IGlmYWNlLmlkO1xuICAgICAgICBjb25zdCBpc0ludGVybmV0SW50ZXJmYWNlID0gaWZhY2UuaW50ZXJuZXQgfHwgZmFsc2U7XG5cbiAgICAgICAgLy8gRE5TL0dhdGV3YXkgZmllbGRzIHZpc2liaWxpdHkgYW5kIHJlYWQtb25seSBzdGF0ZVxuICAgICAgICBjb25zdCBkbnNHYXRld2F5VmlzaWJsZSA9IGlzSW50ZXJuZXRJbnRlcmZhY2UgPyAnJyA6ICdzdHlsZT1cImRpc3BsYXk6bm9uZTtcIic7XG5cbiAgICAgICAgLy8gSW4gRG9ja2VyOiBHYXRld2F5IGlzIGFsd2F5cyByZWFkb25seSwgRE5TIGZpZWxkcyBhcmUgZWRpdGFibGVcbiAgICAgICAgLy8gSW4gcmVndWxhciBtb2RlOiBBbGwgZmllbGRzIHJlYWRvbmx5IGlmIERIQ1AgZW5hYmxlZFxuICAgICAgICBjb25zdCBnYXRld2F5UmVhZG9ubHkgPSBpc0RvY2tlciB8fCBpZmFjZS5kaGNwID8gJ3JlYWRvbmx5JyA6ICcnO1xuICAgICAgICBjb25zdCBnYXRld2F5RGlzYWJsZWRDbGFzcyA9IGlzRG9ja2VyIHx8IGlmYWNlLmRoY3AgPyAnZGlzYWJsZWQnIDogJyc7XG4gICAgICAgIGNvbnN0IGRuc1JlYWRvbmx5ID0gaXNEb2NrZXIgPyAnJyA6IChpZmFjZS5kaGNwID8gJ3JlYWRvbmx5JyA6ICcnKTtcbiAgICAgICAgY29uc3QgZG5zRGlzYWJsZWRDbGFzcyA9IGlzRG9ja2VyID8gJycgOiAoaWZhY2UuZGhjcCA/ICdkaXNhYmxlZCcgOiAnJyk7XG5cbiAgICAgICAgLy8gSW4gRG9ja2VyOiBJUCwgc3VibmV0LCBWTEFOIGFyZSByZWFkb25seVxuICAgICAgICBjb25zdCBkb2NrZXJSZWFkb25seSA9IGlzRG9ja2VyID8gJ3JlYWRvbmx5JyA6ICcnO1xuICAgICAgICBjb25zdCBkb2NrZXJEaXNhYmxlZENsYXNzID0gaXNEb2NrZXIgPyAnZGlzYWJsZWQnIDogJyc7XG5cbiAgICAgICAgLy8gSW4gRG9ja2VyOiBESENQIGNoZWNrYm94IGlzIGRpc2FibGVkIGFuZCBhbHdheXMgY2hlY2tlZFxuICAgICAgICBjb25zdCBkaGNwRGlzYWJsZWQgPSBpc0RvY2tlciB8fCBpZmFjZS52bGFuaWQgPiAwO1xuICAgICAgICBjb25zdCBkaGNwQ2hlY2tlZCA9IGlzRG9ja2VyIHx8IChpZmFjZS52bGFuaWQgPiAwID8gZmFsc2UgOiBpZmFjZS5kaGNwKTtcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudCAke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmludGVyZmFjZX1cIiAvPlxuXG4gICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/IGBcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLm5hbWUgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIiB2YWx1ZT1cIiR7aWR9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgdmFsdWU9XCJvblwiIC8+XG4gICAgICAgICAgICAgICAgYCA6IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVyZmFjZU5hbWV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLm5hbWUgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggaW50ZXJuZXQtcmFkaW9cIiBpZD1cImludGVybmV0LSR7aWR9LXJhZGlvXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJyYWRpb1wiIG5hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIiB2YWx1ZT1cIiR7aWR9XCIgJHtpc0ludGVybmV0SW50ZXJmYWNlID8gJ2NoZWNrZWQnIDogJyd9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJuZXRJbnRlcmZhY2UgfHwgJ0ludGVybmV0IEludGVyZmFjZSd9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgfVxuXG4gICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBkaGNwLWNoZWNrYm94JHtkaGNwRGlzYWJsZWQgPyAnIGRpc2FibGVkJyA6ICcnfVwiIGlkPVwiZGhjcC0ke2lkfS1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiZGhjcF8ke2lkfVwiICR7ZGhjcENoZWNrZWQgPyAnY2hlY2tlZCcgOiAnJ30gJHtkaGNwRGlzYWJsZWQgPyAnZGlzYWJsZWQnIDogJyd9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgfVxuXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibm90ZGhjcF8ke2lkfVwiIGlkPVwibm90LWRoY3AtJHtpZH1cIi8+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRzXCIgaWQ9XCJpcC1hZGRyZXNzLWdyb3VwLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQQWRkcmVzc308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXBhZGRyIHx8ICcnfVwiICR7ZG9ja2VyUmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X05ldHdvcmtNYXNrfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnN1Ym5ldCB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVmxhbklEfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIG5hbWU9XCJ2bGFuaWRfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UudmxhbmlkIHx8ICcwJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgfVxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRucy1nYXRld2F5LWdyb3VwLSR7aWR9XCIgJHtkbnNHYXRld2F5VmlzaWJsZX0+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBob3Jpem9udGFsIGRpdmlkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldFNldHRpbmdzIHx8ICdJbnRlcm5ldCBTZXR0aW5ncyd9PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSG9zdG5hbWUgfHwgJ0hvc3RuYW1lJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwiaG9zdG5hbWVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaG9zdG5hbWUgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCJtaWtvcGJ4XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Eb21haW4gfHwgJ0RvbWFpbid9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cImRvbWFpbl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5kb21haW4gfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCJleGFtcGxlLmNvbVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfR2F0ZXdheX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJnYXRld2F5XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmdhdGV3YXkgfHwgJyd9XCIgJHtnYXRld2F5UmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfUHJpbWFyeUROU308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDAgJHtkbnNEaXNhYmxlZENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInByaW1hcnlkbnNfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UucHJpbWFyeWRucyB8fCAnJ31cIiAke2Ruc1JlYWRvbmx5fSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1NlY29uZGFyeUROU308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDAgJHtkbnNEaXNhYmxlZENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInNlY29uZGFyeWRuc18ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5zZWNvbmRhcnlkbnMgfHwgJyd9XCIgJHtkbnNSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICR7ZGVsZXRlQnV0dG9ufVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBmb3JtIGZvciBuZXcgVkxBTiB0ZW1wbGF0ZVxuICAgICAqL1xuICAgIGNyZWF0ZVRlbXBsYXRlRm9ybSh0ZW1wbGF0ZSwgaW50ZXJmYWNlcykge1xuICAgICAgICBjb25zdCBpZCA9IDA7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnRcIiBkYXRhLXRhYj1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2V9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIGlkPVwiaW50ZXJmYWNlXyR7aWR9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVyZmFjZU5hbWV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgaWQ9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBkaGNwLWNoZWNrYm94XCIgaWQ9XCJkaGNwLSR7aWR9LWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgY2hlY2tlZCAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Vc2VESENQfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZHNcIiBpZD1cImlwLWFkZHJlc3MtZ3JvdXAtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImlwYWRkcl8ke2lkfVwiIHZhbHVlPVwiXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cInN1Ym5ldF8ke2lkfVwiIG5hbWU9XCJzdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIjI0XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVmxhbklEfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIG5hbWU9XCJ2bGFuaWRfJHtpZH1cIiB2YWx1ZT1cIjQwOTVcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3VibmV0IG1hc2sgb3B0aW9ucyBhcnJheSBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygc3VibmV0IG1hc2sgb3B0aW9uc1xuICAgICAqL1xuICAgIGdldFN1Ym5ldE9wdGlvbnNBcnJheSgpIHtcbiAgICAgICAgLy8gTmV0d29yayBtYXNrcyBmcm9tIENpZHI6OmdldE5ldE1hc2tzKCkgKGtyc29ydCBTT1JUX05VTUVSSUMpXG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7dmFsdWU6ICczMicsIHRleHQ6ICczMiAtIDI1NS4yNTUuMjU1LjI1NSd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMzEnLCB0ZXh0OiAnMzEgLSAyNTUuMjU1LjI1NS4yNTQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMwJywgdGV4dDogJzMwIC0gMjU1LjI1NS4yNTUuMjUyJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyOScsIHRleHQ6ICcyOSAtIDI1NS4yNTUuMjU1LjI0OCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjgnLCB0ZXh0OiAnMjggLSAyNTUuMjU1LjI1NS4yNDAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI3JywgdGV4dDogJzI3IC0gMjU1LjI1NS4yNTUuMjI0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNicsIHRleHQ6ICcyNiAtIDI1NS4yNTUuMjU1LjE5Mid9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjUnLCB0ZXh0OiAnMjUgLSAyNTUuMjU1LjI1NS4xMjgnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI0JywgdGV4dDogJzI0IC0gMjU1LjI1NS4yNTUuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjMnLCB0ZXh0OiAnMjMgLSAyNTUuMjU1LjI1NS4yNTQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIyJywgdGV4dDogJzIyIC0gMjU1LjI1NS4yNTIuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjEnLCB0ZXh0OiAnMjEgLSAyNTUuMjU1LjI0OC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMCcsIHRleHQ6ICcyMCAtIDI1NS4yNTUuMjQwLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE5JywgdGV4dDogJzE5IC0gMjU1LjI1NS4yMjQuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTgnLCB0ZXh0OiAnMTggLSAyNTUuMjU1LjE5Mi4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNycsIHRleHQ6ICcxNyAtIDI1NS4yNTUuMTI4LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE2JywgdGV4dDogJzE2IC0gMjU1LjI1NS4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE1JywgdGV4dDogJzE1IC0gMjU1LjI1NC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE0JywgdGV4dDogJzE0IC0gMjU1LjI1Mi4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEzJywgdGV4dDogJzEzIC0gMjU1LjI0OC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEyJywgdGV4dDogJzEyIC0gMjU1LjI0MC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzExJywgdGV4dDogJzExIC0gMjU1LjIyNC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEwJywgdGV4dDogJzEwIC0gMjU1LjE5Mi4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzknLCB0ZXh0OiAnOSAtIDI1NS4xMjguMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc4JywgdGV4dDogJzggLSAyNTUuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzcnLCB0ZXh0OiAnNyAtIDI1NC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNicsIHRleHQ6ICc2IC0gMjUyLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc1JywgdGV4dDogJzUgLSAyNDguMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzQnLCB0ZXh0OiAnNCAtIDI0MC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMycsIHRleHQ6ICczIC0gMjI0LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyJywgdGV4dDogJzIgLSAxOTIuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEnLCB0ZXh0OiAnMSAtIDEyOC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMCcsIHRleHQ6ICcwIC0gMC4wLjAuMCd9LFxuICAgICAgICBdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggY29uZmlndXJhdGlvbiBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gV0hZOiBCb3RoIERvY2tlciBhbmQgbm9uLURvY2tlciBub3cgdXNlIGludGVyZmFjZSB0YWJzXG4gICAgICAgIC8vIERvY2tlciBoYXMgcmVzdHJpY3Rpb25zOiBESENQIGxvY2tlZCwgSVAvc3VibmV0L1ZMQU4gcmVhZG9ubHksIEROUyBlZGl0YWJsZVxuICAgICAgICBuZXR3b3Jrcy5jcmVhdGVJbnRlcmZhY2VUYWJzKGRhdGEsIGRhdGEuaXNEb2NrZXIgfHwgZmFsc2UpO1xuXG4gICAgICAgIC8vIFNldCBOQVQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEubmF0KSB7XG4gICAgICAgICAgICAvLyBCb29sZWFuIHZhbHVlcyBmcm9tIEFQSVxuICAgICAgICAgICAgaWYgKGRhdGEubmF0LnVzZW5hdCkge1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgZGF0YS5uYXQuZXh0aXBhZGRyIHx8ICcnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRob3N0bmFtZScsIGRhdGEubmF0LmV4dGhvc3RuYW1lIHx8ICcnKTtcblxuICAgICAgICAgICAgLy8gYXV0b1VwZGF0ZUV4dGVybmFsSXAgYm9vbGVhbiAoZmllbGQgbmFtZSBmcm9tIHRoZSBmb3JtKVxuICAgICAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVDaGVja2JveCA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGF1dG9VcGRhdGVDaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEubmF0LkFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQIHx8IGRhdGEubmF0LmF1dG9VcGRhdGVFeHRlcm5hbElwKSB7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBwb3J0IHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnBvcnRzKSB7XG4gICAgICAgICAgICAvLyBXSFk6IE5vIG1hcHBpbmcgbmVlZGVkIC0gQVBJIHJldHVybnMga2V5cyBtYXRjaGluZyBmb3JtIGZpZWxkIG5hbWVzXG4gICAgICAgICAgICAvLyAoZS5nLiwgJ2V4dGVybmFsU0lQUG9ydCcgZnJvbSBQYnhTZXR0aW5nczo6RVhURVJOQUxfU0lQX1BPUlQgY29uc3RhbnQpXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnBvcnRzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkYXRhLnBvcnRzW2tleV07XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywga2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBOQVQgaGVscCB0ZXh0IGFuZCBsYWJlbHMgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXNcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZU5BVEhlbHBUZXh0KGRhdGEucG9ydHMpO1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlUG9ydExhYmVscyhkYXRhLnBvcnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBhZGRpdGlvbmFsIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnNldHRpbmdzKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnNldHRpbmdzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywga2V5LCBkYXRhLnNldHRpbmdzW2tleV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdG9yZSBhdmFpbGFibGUgaW50ZXJmYWNlcyBmb3Igc3RhdGljIHJvdXRlcyBGSVJTVCAoYmVmb3JlIGxvYWRpbmcgcm91dGVzKVxuICAgICAgICBpZiAoZGF0YS5hdmFpbGFibGVJbnRlcmZhY2VzKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmF2YWlsYWJsZUludGVyZmFjZXMgPSBkYXRhLmF2YWlsYWJsZUludGVyZmFjZXM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2FkIHN0YXRpYyByb3V0ZXMgQUZURVIgYXZhaWxhYmxlSW50ZXJmYWNlcyBhcmUgc2V0XG4gICAgICAgIGlmIChkYXRhLnN0YXRpY1JvdXRlcykge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5sb2FkUm91dGVzKGRhdGEuc3RhdGljUm91dGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgYWZ0ZXIgcG9wdWxhdGlvbiBpcyBjb21wbGV0ZVxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdGhlIGJ1dHRvbiBpcyBkaXNhYmxlZCBhbmQgYWxsIGR5bmFtaWNhbGx5IGNyZWF0ZWQgZmllbGRzIGFyZSB0cmFja2VkXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHIgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pJC8pO1xuICAgIGlmIChmID09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyV2l0aFBvcnRPcHRpb25hbCA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkoOlswLTldKyk/JC8pO1xuICAgIGlmIChmID09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIFZMQU4gSUQgaXMgdW5pcXVlIGZvciBhIGdpdmVuIGludGVyZmFjZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2bGFuVmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIFZMQU4gSUQgaW5wdXQgZmllbGQuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgcGFyYW1ldGVyIGZvciB0aGUgcnVsZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIFZMQU4gSUQgaXMgdW5pcXVlIGZvciB0aGUgaW50ZXJmYWNlLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja1ZsYW4gPSAodmxhblZhbHVlLCBwYXJhbSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IHZsYW5zQXJyYXkgPSB7fTtcbiAgICBjb25zdCBhbGxWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgaWYgKGFsbFZhbHVlcy5pbnRlcmZhY2VfMCAhPT0gdW5kZWZpbmVkICYmIGFsbFZhbHVlcy5pbnRlcmZhY2VfMCA+IDApIHtcbiAgICAgICAgY29uc3QgbmV3RXRoTmFtZSA9IGFsbFZhbHVlc1tgaW50ZXJmYWNlXyR7YWxsVmFsdWVzLmludGVyZmFjZV8wfWBdO1xuICAgICAgICB2bGFuc0FycmF5W25ld0V0aE5hbWVdID0gW2FsbFZhbHVlcy52bGFuaWRfMF07XG4gICAgICAgIGlmIChhbGxWYWx1ZXMudmxhbmlkXzAgPT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAkLmVhY2goYWxsVmFsdWVzLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gJ2ludGVyZmFjZV8wJyB8fCBpbmRleCA9PT0gJ3ZsYW5pZF8wJykgcmV0dXJuO1xuICAgICAgICBpZiAoaW5kZXguaW5kZXhPZigndmxhbmlkJykgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgZXRoTmFtZSA9IGFsbFZhbHVlc1tgaW50ZXJmYWNlXyR7aW5kZXguc3BsaXQoJ18nKVsxXX1gXTtcbiAgICAgICAgICAgIGlmICgkLmluQXJyYXkodmFsdWUsIHZsYW5zQXJyYXlbZXRoTmFtZV0pID49IDBcbiAgICAgICAgICAgICAgICAmJiB2bGFuVmFsdWUgPT09IHZhbHVlXG4gICAgICAgICAgICAgICAgJiYgcGFyYW0gPT09IGluZGV4LnNwbGl0KCdfJylbMV0pIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZXRoTmFtZSBpbiB2bGFuc0FycmF5KSkge1xuICAgICAgICAgICAgICAgICAgICB2bGFuc0FycmF5W2V0aE5hbWVdID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0ucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy8gREhDUCB2YWxpZGF0aW9uIHJ1bGUgcmVtb3ZlZCAtIERIQ1AgY2hlY2tib3ggaXMgZGlzYWJsZWQgZm9yIFZMQU4gaW50ZXJmYWNlcywgbm8gdmFsaWRhdGlvbiBuZWVkZWRcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHRoZSBwcmVzZW5jZSBvZiBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgZXh0ZXJuYWwgSVAgaG9zdCBpbmZvcm1hdGlvbiBpcyBwcm92aWRlZCB3aGVuIE5BVCBpcyBlbmFibGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbmFsSXBIb3N0ID0gKCkgPT4ge1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLnVzZW5hdCA9PT0gJ29uJykge1xuICAgICAgICBpZiAoYWxsVmFsdWVzLmV4dGhvc3RuYW1lID09PSAnJyAmJiBhbGxWYWx1ZXMuZXh0aXBhZGRyID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHZhbHVlIGlzIGEgdmFsaWQgaG9zdG5hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBob3N0bmFtZVxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB2YWxpZCBob3N0bmFtZSwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy52YWxpZEhvc3RuYW1lID0gKHZhbHVlKSA9PiB7XG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIEVtcHR5IGlzIGhhbmRsZWQgYnkgZXh0ZW5hbElwSG9zdCBydWxlXG4gICAgfVxuXG4gICAgLy8gUkZDIDk1Mi9SRkMgMTEyMyBob3N0bmFtZSB2YWxpZGF0aW9uXG4gICAgLy8gLSBMYWJlbHMgc2VwYXJhdGVkIGJ5IGRvdHNcbiAgICAvLyAtIEVhY2ggbGFiZWwgMS02MyBjaGFyc1xuICAgIC8vIC0gT25seSBhbHBoYW51bWVyaWMgYW5kIGh5cGhlbnNcbiAgICAvLyAtIENhbm5vdCBzdGFydC9lbmQgd2l0aCBoeXBoZW5cbiAgICAvLyAtIFRvdGFsIGxlbmd0aCBtYXggMjUzIGNoYXJzXG4gICAgY29uc3QgaG9zdG5hbWVSZWdleCA9IC9eKD89LnsxLDI1M30kKSg/IS0pW2EtekEtWjAtOS1dezEsNjN9KD88IS0pKFxcLlthLXpBLVowLTktXXsxLDYzfSg/PCEtKSkqJC87XG4gICAgcmV0dXJuIGhvc3RuYW1lUmVnZXgudGVzdCh2YWx1ZSk7XG59O1xuXG5cbi8qKlxuICogU3RhdGljIFJvdXRlcyBNYW5hZ2VyIE1vZHVsZVxuICpcbiAqIE1hbmFnZXMgc3RhdGljIHJvdXRlIGNvbmZpZ3VyYXRpb24gd2hlbiBtdWx0aXBsZSBuZXR3b3JrIGludGVyZmFjZXMgZXhpc3RcbiAqL1xuY29uc3QgU3RhdGljUm91dGVzTWFuYWdlciA9IHtcbiAgICAkdGFibGU6ICQoJyNzdGF0aWMtcm91dGVzLXRhYmxlJyksXG4gICAgJHNlY3Rpb246ICQoJyNzdGF0aWMtcm91dGVzLXNlY3Rpb24nKSxcbiAgICAkYWRkQnV0dG9uOiAkKCcjYWRkLW5ldy1yb3V0ZScpLFxuICAgICR0YWJsZUNvbnRhaW5lcjogbnVsbCxcbiAgICAkZW1wdHlQbGFjZWhvbGRlcjogbnVsbCxcbiAgICByb3V0ZXM6IFtdLFxuICAgIGF2YWlsYWJsZUludGVyZmFjZXM6IFtdLCAvLyBXaWxsIGJlIHBvcHVsYXRlZCBmcm9tIFJFU1QgQVBJXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHN0YXRpYyByb3V0ZXMgbWFuYWdlbWVudFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENhY2hlIGVsZW1lbnRzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIgPSAkKCcjc3RhdGljLXJvdXRlcy1lbXB0eS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZUNvbnRhaW5lciA9ICQoJyNzdGF0aWMtcm91dGVzLXRhYmxlLWNvbnRhaW5lcicpO1xuXG4gICAgICAgIC8vIEhpZGUgc2VjdGlvbiBpZiBsZXNzIHRoYW4gMiBpbnRlcmZhY2VzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlVmlzaWJpbGl0eSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJhZy1hbmQtZHJvcFxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuXG4gICAgICAgIC8vIEFkZCBidXR0b24gaGFuZGxlclxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRhZGRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGZpcnN0IHJvdXRlIGJ1dHRvbiBoYW5kbGVyIChpbiBlbXB0eSBwbGFjZWhvbGRlcilcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNhZGQtZmlyc3Qtcm91dGUtYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIChkZWxlZ2F0ZWQpXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdjbGljaycsICcuZGVsZXRlLXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29weSBidXR0b24gaGFuZGxlciAoZGVsZWdhdGVkKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignY2xpY2snLCAnLmNvcHktcm91dGUtYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRzb3VyY2VSb3cgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5jb3B5Um91dGUoJHNvdXJjZVJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIElucHV0IGNoYW5nZSBoYW5kbGVyc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignaW5wdXQgY2hhbmdlJywgJy5uZXR3b3JrLWlucHV0LCAuZ2F0ZXdheS1pbnB1dCwgLmRlc2NyaXB0aW9uLWlucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQYXN0ZSBoYW5kbGVycyBmb3IgSVAgYWRkcmVzcyBmaWVsZHMgKGVuYWJsZSBjbGlwYm9hcmQgcGFzdGUgd2l0aCBpbnB1dG1hc2spXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdwYXN0ZScsICcubmV0d29yay1pbnB1dCwgLmdhdGV3YXktaW5wdXQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIEdldCBwYXN0ZWQgZGF0YSBmcm9tIGNsaXBib2FyZFxuICAgICAgICAgICAgbGV0IHBhc3RlZERhdGEgPSAnJztcbiAgICAgICAgICAgIGlmIChlLm9yaWdpbmFsRXZlbnQgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUuY2xpcGJvYXJkRGF0YSAmJiBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuY2xpcGJvYXJkRGF0YSAmJiB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTsgLy8gRm9yIElFXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsZWFuIHRoZSBwYXN0ZWQgZGF0YSAocmVtb3ZlIGV4dHJhIHNwYWNlcywga2VlcCBvbmx5IHZhbGlkIElQIGNoYXJhY3RlcnMpXG4gICAgICAgICAgICBjb25zdCBjbGVhbmVkRGF0YSA9IHBhc3RlZERhdGEudHJpbSgpLnJlcGxhY2UoL1teMC05Ll0vZywgJycpO1xuXG4gICAgICAgICAgICAvLyBHZXQgdGhlIGlucHV0IGVsZW1lbnRcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG5cbiAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IHJlbW92ZSBtYXNrXG4gICAgICAgICAgICAkaW5wdXQuaW5wdXRtYXNrKCdyZW1vdmUnKTtcblxuICAgICAgICAgICAgLy8gU2V0IHRoZSBjbGVhbmVkIHZhbHVlXG4gICAgICAgICAgICAkaW5wdXQudmFsKGNsZWFuZWREYXRhKTtcblxuICAgICAgICAgICAgLy8gUmVhcHBseSB0aGUgbWFzayBhZnRlciBhIHNob3J0IGRlbGF5XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkaW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgcGxhY2Vob2xkZXI6ICdfJ30pO1xuICAgICAgICAgICAgICAgICRpbnB1dC50cmlnZ2VyKCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgb3IgcmVpbml0aWFsaXplIGRyYWctYW5kLWRyb3AgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcmFnQW5kRHJvcCgpIHtcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyB0YWJsZURuRCBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLmRhdGEoJ3RhYmxlRG5EJykpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLnRhYmxlRG5EVXBkYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3BcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2aXNpYmlsaXR5IGJhc2VkIG9uIG51bWJlciBvZiBpbnRlcmZhY2VzXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eSgpIHtcbiAgICAgICAgLy8gU2hvdy9oaWRlIHNlY3Rpb24gYmFzZWQgb24gbnVtYmVyIG9mIGludGVyZmFjZXNcbiAgICAgICAgY29uc3QgaW50ZXJmYWNlQ291bnQgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5ub3QoJ1tkYXRhLXRhYj1cIjBcIl0nKS5sZW5ndGg7XG4gICAgICAgIGlmIChpbnRlcmZhY2VDb3VudCA+IDEpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHNlY3Rpb24uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kc2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29weSBhIHJvdXRlIHJvdyAoY3JlYXRlIGR1cGxpY2F0ZSlcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHNvdXJjZVJvdyAtIFNvdXJjZSByb3cgdG8gY29weVxuICAgICAqL1xuICAgIGNvcHlSb3V0ZSgkc291cmNlUm93KSB7XG4gICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkc291cmNlUm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKTtcbiAgICAgICAgY29uc3Qgc3VibmV0RHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHtyb3V0ZUlkfWA7XG4gICAgICAgIGNvbnN0IGludGVyZmFjZURyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7cm91dGVJZH1gO1xuXG4gICAgICAgIC8vIENvbGxlY3QgZGF0YSBmcm9tIHNvdXJjZSByb3dcbiAgICAgICAgY29uc3Qgcm91dGVEYXRhID0ge1xuICAgICAgICAgICAgbmV0d29yazogJHNvdXJjZVJvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgc3VibmV0OiAkKGAjJHtzdWJuZXREcm9wZG93bklkfWApLnZhbCgpLFxuICAgICAgICAgICAgZ2F0ZXdheTogJHNvdXJjZVJvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgaW50ZXJmYWNlOiAkKGAjJHtpbnRlcmZhY2VEcm9wZG93bklkfWApLnZhbCgpIHx8ICcnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICRzb3VyY2VSb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKClcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgbmV3IHJvdXRlIHdpdGggY29waWVkIGRhdGFcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZShyb3V0ZURhdGEpO1xuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGFmdGVyIGFkZGluZyByb3V0ZVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZW1wdHkgc3RhdGUgdmlzaWJpbGl0eVxuICAgICAqL1xuICAgIHVwZGF0ZUVtcHR5U3RhdGUoKSB7XG4gICAgICAgIGNvbnN0ICRleGlzdGluZ1Jvd3MgPSAkKCcucm91dGUtcm93Jyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBwbGFjZWhvbGRlciwgaGlkZSB0YWJsZSBjb250YWluZXJcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIuc2hvdygpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBlbXB0eSBwbGFjZWhvbGRlciwgc2hvdyB0YWJsZSBjb250YWluZXJcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcm91dGVEYXRhIC0gUm91dGUgZGF0YSAob3B0aW9uYWwpXG4gICAgICovXG4gICAgYWRkUm91dGUocm91dGVEYXRhID0gbnVsbCkge1xuICAgICAgICBjb25zdCAkdGVtcGxhdGUgPSAkKCcucm91dGUtcm93LXRlbXBsYXRlJykubGFzdCgpO1xuICAgICAgICBjb25zdCAkbmV3Um93ID0gJHRlbXBsYXRlLmNsb25lKHRydWUpO1xuICAgICAgICBjb25zdCByb3V0ZUlkID0gcm91dGVEYXRhPy5pZCB8fCBgbmV3XyR7RGF0ZS5ub3coKX1gO1xuXG4gICAgICAgICRuZXdSb3dcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncm91dGUtcm93LXRlbXBsYXRlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygncm91dGUtcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdkYXRhLXJvdXRlLWlkJywgcm91dGVJZClcbiAgICAgICAgICAgIC5zaG93KCk7XG5cbiAgICAgICAgLy8gU2V0IHZhbHVlcyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAocm91dGVEYXRhKSB7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKHJvdXRlRGF0YS5uZXR3b3JrKTtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwocm91dGVEYXRhLmdhdGV3YXkpO1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcuZGVzY3JpcHRpb24taW5wdXQnKS52YWwocm91dGVEYXRhLmRlc2NyaXB0aW9uIHx8ICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB0byB0YWJsZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdSb3dzID0gJCgnLnJvdXRlLXJvdycpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nUm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRleGlzdGluZ1Jvd3MubGFzdCgpLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIHRoaXMgcm93XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duKCRuZXdSb3csIHJvdXRlRGF0YT8uc3VibmV0IHx8ICcyNCcpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW50ZXJmYWNlIGRyb3Bkb3duIGZvciB0aGlzIHJvd1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93bigkbmV3Um93LCByb3V0ZURhdGE/LmludGVyZmFjZSB8fCAnJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dG1hc2sgZm9yIElQIGFkZHJlc3MgZmllbGRzXG4gICAgICAgICRuZXdSb3cuZmluZCgnLmlwYWRkcmVzcycpLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsIHBsYWNlaG9sZGVyOiAnXyd9KTtcblxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVByaW9yaXRpZXMoKTtcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIGEgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBSb3cgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RlZFZhbHVlIC0gU2VsZWN0ZWQgc3VibmV0IHZhbHVlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duKCRyb3csIHNlbGVjdGVkVmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRyb3cuZmluZCgnLnN1Ym5ldC1kcm9wZG93bi1jb250YWluZXInKTtcbiAgICAgICAgY29uc3QgZHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHskcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKX1gO1xuXG4gICAgICAgICRjb250YWluZXIuaHRtbChgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIiR7ZHJvcGRvd25JZH1cIiAvPmApO1xuXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihkcm9wZG93bklkLFxuICAgICAgICAgICAgeyBbZHJvcGRvd25JZF06IHNlbGVjdGVkVmFsdWUgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBpbnRlcmZhY2UgZHJvcGRvd24gZm9yIGEgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBSb3cgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RlZFZhbHVlIC0gU2VsZWN0ZWQgaW50ZXJmYWNlIHZhbHVlIChlbXB0eSBzdHJpbmcgPSBhdXRvKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93bigkcm93LCBzZWxlY3RlZFZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkcm93LmZpbmQoJy5pbnRlcmZhY2UtZHJvcGRvd24tY29udGFpbmVyJyk7XG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7JHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyl9YDtcblxuICAgICAgICAkY29udGFpbmVyLmh0bWwoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCIke2Ryb3Bkb3duSWR9XCIgLz5gKTtcblxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biBvcHRpb25zOiBcIkF1dG9cIiArIGF2YWlsYWJsZSBpbnRlcmZhY2VzXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0F1dG8gfHwgJ0F1dG8nIH0sXG4gICAgICAgICAgICAuLi5TdGF0aWNSb3V0ZXNNYW5hZ2VyLmF2YWlsYWJsZUludGVyZmFjZXMubWFwKGlmYWNlID0+ICh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLnZhbHVlLFxuICAgICAgICAgICAgICAgIHRleHQ6IGlmYWNlLmxhYmVsXG4gICAgICAgICAgICB9KSlcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBQcmVwYXJlIGZvcm0gZGF0YSBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHt9O1xuICAgICAgICBmb3JtRGF0YVtkcm9wZG93bklkXSA9IHNlbGVjdGVkVmFsdWUgfHwgJyc7IC8vIEVuc3VyZSB3ZSBwYXNzIGVtcHR5IHN0cmluZyBmb3IgXCJBdXRvXCJcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZHJvcGRvd25JZCxcbiAgICAgICAgICAgIGZvcm1EYXRhLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG9wdGlvbnMsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcm91dGUgcHJpb3JpdGllcyBiYXNlZCBvbiB0YWJsZSBvcmRlclxuICAgICAqL1xuICAgIHVwZGF0ZVByaW9yaXRpZXMoKSB7XG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS1wcmlvcml0eScsIGluZGV4ICsgMSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHJvdXRlcyBmcm9tIGRhdGFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByb3V0ZXNEYXRhIC0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqL1xuICAgIGxvYWRSb3V0ZXMocm91dGVzRGF0YSkge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyByb3V0ZXNcbiAgICAgICAgJCgnLnJvdXRlLXJvdycpLnJlbW92ZSgpO1xuXG4gICAgICAgIC8vIEFkZCBlYWNoIHJvdXRlXG4gICAgICAgIGlmIChyb3V0ZXNEYXRhICYmIHJvdXRlc0RhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcm91dGVzRGF0YS5mb3JFYWNoKHJvdXRlID0+IHtcbiAgICAgICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKHJvdXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBzdGF0ZSBpZiBubyByb3V0ZXNcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlRW1wdHlTdGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGRyYWctYW5kLWRyb3AgYWZ0ZXIgYWRkaW5nIHJvdXRlc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0IHJvdXRlcyBmcm9tIHRhYmxlXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiByb3V0ZSBvYmplY3RzXG4gICAgICovXG4gICAgY29sbGVjdFJvdXRlcygpIHtcbiAgICAgICAgY29uc3Qgcm91dGVzID0gW107XG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChyb3cpO1xuICAgICAgICAgICAgY29uc3Qgcm91dGVJZCA9ICRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpO1xuICAgICAgICAgICAgY29uc3Qgc3VibmV0RHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHtyb3V0ZUlkfWA7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VEcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0ke3JvdXRlSWR9YDtcblxuICAgICAgICAgICAgcm91dGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIGlkOiByb3V0ZUlkLnN0YXJ0c1dpdGgoJ25ld18nKSA/IG51bGwgOiByb3V0ZUlkLFxuICAgICAgICAgICAgICAgIG5ldHdvcms6ICRyb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBzdWJuZXQ6ICQoYCMke3N1Ym5ldERyb3Bkb3duSWR9YCkudmFsKCksXG4gICAgICAgICAgICAgICAgZ2F0ZXdheTogJHJvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgICAgIGludGVyZmFjZTogJChgIyR7aW50ZXJmYWNlRHJvcGRvd25JZH1gKS52YWwoKSB8fCAnJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJHJvdy5maW5kKCcuZGVzY3JpcHRpb24taW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXggKyAxXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByb3V0ZXM7XG4gICAgfVxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG5ldHdvcmtzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19