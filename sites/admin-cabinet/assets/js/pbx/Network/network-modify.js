"use strict";

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
    gateway: {
      optional: true,
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    },
    primarydns: {
      optional: true,
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    },
    secondarydns: {
      optional: true,
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    },
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
    networks.initializeForm(); // Hide form elements connected with non docker installations

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

      if ($("#dhcp-".concat(eth, "-checkbox")).checkbox('is unchecked')) {
        $("#ip-address-group-".concat(eth)).removeClass('disabled');
        $("#not-dhcp-".concat(eth)).val('1');
      } else {
        $("#ip-address-group-".concat(eth)).addClass('disabled');
        $("#not-dhcp-".concat(eth)).val('');
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

    networks.validateRules[ipaddrClass] = {
      identifier: ipaddrClass,
      depends: "not-dhcp-".concat(newRowId),
      rules: [{
        type: 'empty',
        prompt: globalTranslate.nw_ValidateIppaddrIsEmpty
      }, {
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    }; // Define the class for the 'dhcp' field in the new row

    var dhcpClass = "dhcp_".concat(newRowId); // Define the form validation rules for the 'dhcp' field

    networks.validateRules[dhcpClass] = {
      identifier: dhcpClass,
      depends: "interface_".concat(newRowId),
      rules: [{
        type: "dhcpOnVlanNetworks[".concat(newRowId, "]"),
        prompt: globalTranslate.nw_ValidateDHCPOnVlansDontSupport
      }]
    };
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    console.log('cbBeforeSendForm called with settings:', settings); // Create a new object with all settings properties

    var result = Object.assign({}, settings);
    result.data = {}; // Manually collect form values to avoid any DOM-related issues
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
      var rowId = inputId.replace('dhcp-', '').replace('-checkbox', '');
      result.data["dhcp_".concat(rowId)] = $(obj).checkbox('is checked');
    }); // Ensure internet_interface is included (from dynamic dropdown)

    var internetInterfaceValue = $('#internet_interface').val();

    if (internetInterfaceValue) {
      result.data.internet_interface = String(internetInterfaceValue);
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
    console.log('cbBeforeSendForm returning result:', result);
    console.log('cbBeforeSendForm result.data:', result.data);
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    console.log('cbAfterSendForm called with response:', response);
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
    console.log('Loading configuration from REST API...');
    NetworkAPI.getConfig(function (response) {
      console.log('NetworkAPI.getConfig response:', response);

      if (response.result && response.data) {
        console.log('Configuration data received:', response.data);
        networks.populateForm(response.data); // Initialize UI after loading data

        networks.toggleDisabledFieldClass(); // Hide form elements connected with non docker installations

        if (response.data.isDocker) {
          networks.$formObj.form('set value', 'is-docker', '1');
          networks.$notShowOnDockerDivs.hide();
        }
      } else {
        console.error('Failed to load configuration:', response.messages);
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
    $content.empty(); // Find interfaces that can be deleted (have multiple VLANs)

    var deletableInterfaces = [];
    var interfaceCount = {};
    data.interfaces.forEach(function (iface) {
      interfaceCount[iface["interface"]] = (interfaceCount[iface["interface"]] || 0) + 1;
    });
    Object.keys(interfaceCount).forEach(function (ifaceName) {
      if (interfaceCount[ifaceName] > 1) {
        deletableInterfaces.push(ifaceName);
      }
    }); // Create tabs for existing interfaces

    data.interfaces.forEach(function (iface, index) {
      var tabId = iface.id;
      var tabLabel = "".concat(iface.name || iface["interface"], " (").concat(iface["interface"]).concat(iface.vlanid !== '0' && iface.vlanid !== 0 ? ".".concat(iface.vlanid) : '', ")");
      var isActive = index === 0; // Create tab menu item

      $menu.append("\n                <a class=\"item ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(tabId, "\">\n                    ").concat(tabLabel, "\n                </a>\n            ")); // Create tab content

      var canDelete = deletableInterfaces.includes(iface["interface"]);
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
      var formData = {};
      formData[fieldName] = iface.subnet || '24';
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
    $('#eth-interfaces-menu .item').first().trigger('click'); // Re-bind delete button handlers

    $('.delete-interface').off('click').on('click', function (e) {
      e.preventDefault();
      var $button = $(this);
      var interfaceId = $button.attr('data-value');
      $button.addClass('loading disabled');
      NetworkAPI.deleteRecord(interfaceId, function (response) {
        $button.removeClass('loading disabled');

        if (response.result) {
          window.location.reload();
        } else {
          UserMessage.showMultiString(response.messages);
        }
      });
    }); // Re-bind DHCP checkbox handlers

    $('.dhcp-checkbox').checkbox({
      onChange: function onChange() {
        networks.toggleDisabledFieldClass();
      }
    }); // Re-bind IP address input masks

    $('.ipaddress').inputmask({
      alias: 'ip',
      'placeholder': '_'
    });
  },

  /**
   * Create form for existing interface
   */
  createInterfaceForm: function createInterfaceForm(iface, isActive, deleteButton) {
    var id = iface.id;
    return "\n            <div class=\"ui bottom attached tab segment ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(id, "\">\n                <input type=\"hidden\" name=\"interface_").concat(id, "\" value=\"").concat(iface["interface"], "\" />\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" ").concat(iface.dhcp ? 'checked' : '', " />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                <div class=\"fields\" id=\"ip-address-group-").concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '24', "\" />\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"").concat(iface.vlanid || '0', "\" />\n                    </div>\n                </div>\n\n                ").concat(deleteButton, "\n            </div>\n        ");
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
    var _data$internetInterfa;

    console.log('populateForm called with data:', data); // Create interface tabs and forms dynamically

    networks.createInterfaceTabs(data); // Build internet interface dropdown dynamically

    var internetInterfaceOptions = data.interfaces.map(function (iface) {
      return {
        value: iface.id.toString(),
        text: iface.name || "".concat(iface["interface"]).concat(iface.vlanid !== '0' ? ".".concat(iface.vlanid) : ''),
        name: iface.name || "".concat(iface["interface"]).concat(iface.vlanid !== '0' ? ".".concat(iface.vlanid) : '')
      };
    });
    var formData = {
      internet_interface: ((_data$internetInterfa = data.internetInterfaceId) === null || _data$internetInterfa === void 0 ? void 0 : _data$internetInterfa.toString()) || ''
    };
    DynamicDropdownBuilder.buildDropdown('internet_interface', formData, {
      staticOptions: internetInterfaceOptions,
      placeholder: globalTranslate.nw_SelectInternetInterface
    }); // Set NAT settings

    if (data.nat) {
      console.log('Setting NAT settings:', data.nat); // Boolean values from API

      if (data.nat.usenat) {
        console.log('Checking usenat checkbox');
        $('#usenat-checkbox').checkbox('check');
      } else {
        console.log('Unchecking usenat checkbox');
        $('#usenat-checkbox').checkbox('uncheck');
      }

      networks.$formObj.form('set value', 'extipaddr', data.nat.extipaddr || '');
      networks.$formObj.form('set value', 'exthostname', data.nat.exthostname || ''); // autoUpdateExternalIp boolean (field name from the form)

      var $autoUpdateCheckbox = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');

      if ($autoUpdateCheckbox.length > 0) {
        if (data.nat.AUTO_UPDATE_EXTERNAL_IP || data.nat.autoUpdateExternalIp) {
          console.log('Checking autoUpdateExternalIp checkbox');
          $autoUpdateCheckbox.checkbox('check');
        } else {
          console.log('Unchecking autoUpdateExternalIp checkbox');
          $autoUpdateCheckbox.checkbox('uncheck');
        }
      }
    } // Set port settings


    if (data.ports) {
      console.log('Setting port values:', data.ports); // Map API field names to form field names

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
        console.log("Setting port field ".concat(formFieldName, " to value ").concat(value));
        networks.$formObj.form('set value', formFieldName, value);
      }); // Update the NAT help text and labels with actual port values

      networks.updateNATHelpText(data.ports);
      networks.updatePortLabels(data.ports);
    } // Set additional settings


    if (data.settings) {
      Object.keys(data.settings).forEach(function (key) {
        networks.$formObj.form('set value', key, data.settings[key]);
      });
    } // Save initial values for dirty checking


    if (Form.enableDirrity) {
      Form.saveInitialValues();
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
};
/**
 * Custom form validation rule for checking if DHCP is enabled on VLAN networks.
 * @param {string} value - The value of the input field.
 * @param {string} param - The parameter for the rule.
 * @returns {boolean} - True if the DHCP is not enabled on the VLAN network, false otherwise.
 */


$.fn.form.settings.rules.dhcpOnVlanNetworks = function (value, param) {
  var result = true;
  var vlanValue = networks.$formObj.form('get value', "vlanid_".concat(param));
  var dhcpValue = networks.$formObj.form('get value', "dhcp_".concat(param));

  if (vlanValue > 0 && dhcpValue === 'on') {
    result = false;
  }

  return result;
};
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
 *  Initialize network settings form on document ready
 */


$(document).ready(function () {
  networks.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJnYXRld2F5Iiwib3B0aW9uYWwiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCIsInByaW1hcnlkbnMiLCJzZWNvbmRhcnlkbnMiLCJleHRpcGFkZHIiLCJud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHkiLCJleHRob3N0bmFtZSIsImRlcGVuZHMiLCJud19WYWxpZGF0ZUhvc3RuYW1lSW52YWxpZCIsImluaXRpYWxpemUiLCJsb2FkQ29uZmlndXJhdGlvbiIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJ0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MiLCJkcm9wZG93biIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCJTeXNpbmZvQVBJIiwiZ2V0RXh0ZXJuYWxJcEluZm8iLCJjYkFmdGVyR2V0RXh0ZXJuYWxJcCIsImlucHV0bWFzayIsImFsaWFzIiwiaW5pdGlhbGl6ZUZvcm0iLCJmb3JtIiwiaGlkZSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwiaXAiLCJ0cmlnZ2VyIiwidXBkYXRlTkFUSGVscFRleHQiLCJwb3J0cyIsIlNJUF9QT1JUIiwiVExTX1BPUlQiLCJSVFBfUE9SVF9GUk9NIiwiUlRQX1BPUlRfVE8iLCIkc2lwUG9ydFZhbHVlcyIsImxlbmd0aCIsInNpcFRleHQiLCJpMThuIiwiaHRtbCIsIiRydHBQb3J0VmFsdWVzIiwicnRwVGV4dCIsInVwZGF0ZVBvcnRMYWJlbHMiLCIkc2lwTGFiZWwiLCJzaXBMYWJlbFRleHQiLCJ0ZXh0IiwiJHRsc0xhYmVsIiwidGxzTGFiZWxUZXh0IiwiZWFjaCIsImluZGV4Iiwib2JqIiwiZXRoIiwiYXR0ciIsInZhbCIsImFkZE5ld0Zvcm1SdWxlcyIsIm5ld1Jvd0lkIiwibmFtZUNsYXNzIiwiaWRlbnRpZmllciIsIm53X1ZhbGlkYXRlTmFtZUlzTm90QmVFbXB0eSIsInZsYW5DbGFzcyIsIm53X1ZhbGlkYXRlVmxhblJhbmdlIiwibndfVmFsaWRhdGVWbGFuQ3Jvc3MiLCJpcGFkZHJDbGFzcyIsIm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHkiLCJkaGNwQ2xhc3MiLCJud19WYWxpZGF0ZURIQ1BPblZsYW5zRG9udFN1cHBvcnQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjb25zb2xlIiwibG9nIiwicmVzdWx0IiwiT2JqZWN0IiwiYXNzaWduIiwiZGF0YSIsImZpbmQiLCIkaW5wdXQiLCJuYW1lIiwidmFsdWUiLCJ1bmRlZmluZWQiLCJTdHJpbmciLCIkc2VsZWN0IiwidXNlbmF0IiwiJGF1dG9VcGRhdGVEaXYiLCJwYXJlbnQiLCJhdXRvVXBkYXRlRXh0ZXJuYWxJcCIsImlucHV0SWQiLCJyb3dJZCIsInJlcGxhY2UiLCJpbnRlcm5ldEludGVyZmFjZVZhbHVlIiwiaW50ZXJuZXRfaW50ZXJmYWNlIiwicG9ydEZpZWxkTWFwcGluZyIsImtleXMiLCJmb3JFYWNoIiwiZm9ybUZpZWxkIiwiYXBpRmllbGQiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiTmV0d29ya0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiZ2V0Q29uZmlnIiwicG9wdWxhdGVGb3JtIiwiaXNEb2NrZXIiLCJlcnJvciIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJjcmVhdGVJbnRlcmZhY2VUYWJzIiwiJG1lbnUiLCIkY29udGVudCIsImVtcHR5IiwiZGVsZXRhYmxlSW50ZXJmYWNlcyIsImludGVyZmFjZUNvdW50IiwiaW50ZXJmYWNlcyIsImlmYWNlIiwiaWZhY2VOYW1lIiwicHVzaCIsInRhYklkIiwiaWQiLCJ0YWJMYWJlbCIsInZsYW5pZCIsImlzQWN0aXZlIiwiYXBwZW5kIiwiY2FuRGVsZXRlIiwiaW5jbHVkZXMiLCJkZWxldGVCdXR0b24iLCJud19EZWxldGVDdXJyZW50SW50ZXJmYWNlIiwiY3JlYXRlSW50ZXJmYWNlRm9ybSIsInRlbXBsYXRlIiwiY3JlYXRlVGVtcGxhdGVGb3JtIiwicGh5c2ljYWxJbnRlcmZhY2VzIiwidG9TdHJpbmciLCJwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMiLCJ2YWx1ZXMiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImludGVyZmFjZV8wIiwic3RhdGljT3B0aW9ucyIsInBsYWNlaG9sZGVyIiwibndfU2VsZWN0SW50ZXJmYWNlIiwiYWxsb3dFbXB0eSIsImZpZWxkTmFtZSIsImZvcm1EYXRhIiwic3VibmV0IiwiZ2V0U3VibmV0T3B0aW9uc0FycmF5IiwibndfU2VsZWN0TmV0d29ya01hc2siLCJhZGRpdGlvbmFsQ2xhc3NlcyIsInN1Ym5ldF8wIiwidGFiIiwiZmlyc3QiLCJvZmYiLCIkYnV0dG9uIiwiaW50ZXJmYWNlSWQiLCJkZWxldGVSZWNvcmQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsIm53X0ludGVyZmFjZU5hbWUiLCJkaGNwIiwibndfVXNlREhDUCIsIm53X0lQQWRkcmVzcyIsImlwYWRkciIsIm53X05ldHdvcmtNYXNrIiwibndfVmxhbklEIiwiaW50ZXJuZXRJbnRlcmZhY2VPcHRpb25zIiwibWFwIiwiaW50ZXJuZXRJbnRlcmZhY2VJZCIsIm53X1NlbGVjdEludGVybmV0SW50ZXJmYWNlIiwibmF0IiwiJGF1dG9VcGRhdGVDaGVja2JveCIsIkFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQIiwia2V5IiwiZm9ybUZpZWxkTmFtZSIsImVuYWJsZURpcnJpdHkiLCJzYXZlSW5pdGlhbFZhbHVlcyIsImZuIiwiZiIsImkiLCJhIiwiaXBhZGRyV2l0aFBvcnRPcHRpb25hbCIsImNoZWNrVmxhbiIsInZsYW5WYWx1ZSIsInBhcmFtIiwiYWxsVmFsdWVzIiwibmV3RXRoTmFtZSIsInZsYW5pZF8wIiwiaW5kZXhPZiIsImV0aE5hbWUiLCJzcGxpdCIsImluQXJyYXkiLCJkaGNwT25WbGFuTmV0d29ya3MiLCJkaGNwVmFsdWUiLCJleHRlbmFsSXBIb3N0IiwidmFsaWRIb3N0bmFtZSIsImhvc3RuYW1lUmVnZXgiLCJ0ZXN0IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYkMsRUFBQUEsY0FBYyxFQUFFQyxDQUFDLENBQUMsVUFBRCxDQURKOztBQUdiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUQsQ0FBQyxDQUFDLGVBQUQsQ0FQRTtBQVNiRSxFQUFBQSxVQUFVLEVBQUVGLENBQUMsQ0FBQyx5QkFBRCxDQVRBO0FBVWJHLEVBQUFBLFVBQVUsRUFBRUgsQ0FBQyxDQUFDLFlBQUQsQ0FWQTtBQVdiSSxFQUFBQSxlQUFlLEVBQUVKLENBQUMsQ0FBQyxZQUFELENBWEw7QUFZYkssRUFBQUEsVUFBVSxFQUFFLEVBWkM7O0FBY2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsb0JBQW9CLEVBQUVOLENBQUMsQ0FBQyx3QkFBRCxDQWxC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QSxLQUFLLEVBQUUsSUFBUjtBQUFjaEMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBcEJHLEVBcUJIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjaEMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBckJHLEVBc0JIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjaEMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBdEJHLEVBdUJIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjaEMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBdkJHLEVBd0JIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBeEJHLEVBeUJIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBekJHLEVBMEJIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBMUJHLEVBMkJIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBM0JHLEVBNEJIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBNUJHLEVBNkJIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBN0JHLEVBOEJIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBOUJHLEVBK0JIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBL0JHLEVBZ0NIO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBaENHLEVBaUNIO0FBQUNnQyxNQUFBQSxL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TUFBVixLQUFxQixJQUF6QixFQUErQjtBQUMzQixRQUFJNEcsU0FBUyxDQUFDOUwsV0FBVixLQUEwQixFQUExQixJQUFnQzhMLFNBQVMsQ0FBQ2pNLFNBQVYsS0FBd0IsRUFBNUQsRUFBZ0U7QUFDNUQsYUFBTyxLQUFQO0FBQ0g7QUFDSjs7QUFDRCxTQUFPLElBQVA7QUFDSCxDQVJEO0FBVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FqQixDQUFDLENBQUMwTSxFQUFGLENBQUtuSyxJQUFMLENBQVVpRCxRQUFWLENBQW1COUUsS0FBbkIsQ0FBeUJrTixhQUF6QixHQUF5QyxVQUFDMUgsS0FBRCxFQUFXO0FBQ2hELE1BQUksQ0FBQ0EsS0FBRCxJQUFVQSxLQUFLLEtBQUssRUFBeEIsRUFBNEI7QUFDeEIsV0FBTyxJQUFQLENBRHdCLENBQ1g7QUFDaEIsR0FIK0MsQ0FLaEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQSxNQUFNMkgsYUFBYSxHQUFHLDJFQUF0QjtBQUNBLFNBQU9BLGFBQWEsQ0FBQ0MsSUFBZCxDQUFtQjVILEtBQW5CLENBQVA7QUFDSCxDQWJEO0FBZ0JBO0FBQ0E7QUFDQTs7O0FBQ0FsRyxDQUFDLENBQUMrTixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbE8sRUFBQUEsUUFBUSxDQUFDeUIsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN5c2luZm9BUEksIE5ldHdvcmtBUEksIFVzZXJNZXNzYWdlLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBuZXR3b3JrIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBuZXR3b3Jrc1xuICovXG5jb25zdCBuZXR3b3JrcyA9IHtcbiAgICAkZ2V0TXlJcEJ1dHRvbjogJCgnI2dldG15aXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNuZXR3b3JrLWZvcm0nKSxcblxuICAgICRkcm9wRG93bnM6ICQoJyNuZXR3b3JrLWZvcm0gLmRyb3Bkb3duJyksXG4gICAgJGV4dGlwYWRkcjogJCgnI2V4dGlwYWRkcicpLFxuICAgICRpcGFkZHJlc3NJbnB1dDogJCgnLmlwYWRkcmVzcycpLFxuICAgIHZsYW5zQXJyYXk6IHt9LFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnRzIHdpdGggd2Ugc2hvdWxkIGhpZGUgZnJvbSB0aGUgZm9ybSBmb3IgZG9ja2VyIGluc3RhbGxhdGlvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub3RTaG93T25Eb2NrZXJEaXZzOiAkKCcuZG8tbm90LXNob3ctaWYtZG9ja2VyJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZ2F0ZXdheToge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwcmltYXJ5ZG5zOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY29uZGFyeWRuczoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRpcGFkZHI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHJXaXRoUG9ydE9wdGlvbmFsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0aG9zdG5hbWU6IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICd1c2VuYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3ZhbGlkSG9zdG5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUhvc3RuYW1lSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG5ldHdvcmsgc2V0dGluZ3MgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBMb2FkIGNvbmZpZ3VyYXRpb24gdmlhIFJFU1QgQVBJXG4gICAgICAgIG5ldHdvcmtzLmxvYWRDb25maWd1cmF0aW9uKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlcyB0aGUgY2hhbmdlIGV2ZW50IG9mIHRoZSAndXNlbmF0LWNoZWNrYm94Jy5cbiAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIG5ldHdvcmtzLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBESENQIGNoZWNrYm94IGhhbmRsZXJzIHdpbGwgYmUgYm91bmQgYWZ0ZXIgdGFicyBhcmUgY3JlYXRlZCBkeW5hbWljYWxseVxuXG4gICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgU3lzaW5mb0FQSS5nZXRFeHRlcm5hbElwSW5mbyhuZXR3b3Jrcy5jYkFmdGVyR2V0RXh0ZXJuYWxJcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciB3aWxsIGJlIGJvdW5kIGFmdGVyIHRhYnMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHlcbiAgICAgICAgbmV0d29ya3MuJGlwYWRkcmVzc0lucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIG5ldHdvcmtzLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSGlkZSBmb3JtIGVsZW1lbnRzIGNvbm5lY3RlZCB3aXRoIG5vbiBkb2NrZXIgaW5zdGFsbGF0aW9uc1xuICAgICAgICBpZiAobmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywnaXMtZG9ja2VyJyk9PT1cIjFcIikge1xuICAgICAgICAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGdldHRpbmcgdGhlIGV4dGVybmFsIElQIGZyb20gYSByZW1vdGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4gSWYgZmFsc2UsIGluZGljYXRlcyBhbiBlcnJvciBvY2N1cnJlZC5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0RXh0ZXJuYWxJcChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dElwQWRkciA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRpcGFkZHInKTtcbiAgICAgICAgICAgIGNvbnN0IHBvcnRNYXRjaCA9IGN1cnJlbnRFeHRJcEFkZHIubWF0Y2goLzooXFxkKykkLyk7XG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gcG9ydE1hdGNoID8gJzonICsgcG9ydE1hdGNoWzFdIDogJyc7XG4gICAgICAgICAgICBjb25zdCBuZXdFeHRJcEFkZHIgPSByZXNwb25zZS5pcCArIHBvcnQ7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgbmV3RXh0SXBBZGRyKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGV4dGVybmFsIGhvc3RuYW1lIHdoZW4gZ2V0dGluZyBleHRlcm5hbCBJUFxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgJycpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBoZWxwIHRleHQgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVOQVRIZWxwVGV4dChwb3J0cykge1xuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQX1BPUlQgfHwgIXBvcnRzLlRMU19QT1JUIHx8ICFwb3J0cy5SVFBfUE9SVF9GUk9NIHx8ICFwb3J0cy5SVFBfUE9SVF9UTykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFNJUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRzaXBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXNpcC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRzaXBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcFRleHQgPSBpMThuKCdud19OQVRJbmZvMycsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBfUE9SVCxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwUG9ydFZhbHVlcy5odG1sKHNpcFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFJUUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRydHBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRydHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJ0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUF9QT1JUX0ZST00sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQX1BPUlRfVE9cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHJ0cFBvcnRWYWx1ZXMuaHRtbChydHBUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcG9ydCBmaWVsZCBsYWJlbHMgd2l0aCBhY3R1YWwgaW50ZXJuYWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVQb3J0TGFiZWxzKHBvcnRzKSB7XG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHdlIGhhdmUgcG9ydCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgaWYgKCFwb3J0cy5TSVBfUE9SVCB8fCAhcG9ydHMuVExTX1BPUlQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBleHRlcm5hbCBTSVAgcG9ydCBsYWJlbCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkc2lwTGFiZWwgPSAkKCcjZXh0ZXJuYWwtc2lwLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRzaXBMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNTSVBQb3J0Jywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUF9QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBMYWJlbC50ZXh0KHNpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZXJuYWwgVExTIHBvcnQgbGFiZWwgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHRsc0xhYmVsID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkdGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkdGxzTGFiZWwudGV4dCh0bHNMYWJlbFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlICdkaXNhYmxlZCcgY2xhc3MgZm9yIHNwZWNpZmljIGZpZWxkcyBiYXNlZCBvbiB0aGVpciBjaGVja2JveCBzdGF0ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldGggPSAkKG9iaikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGlmICgkKGAjZGhjcC0ke2V0aH0tY2hlY2tib3hgKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAkKGAjaXAtYWRkcmVzcy1ncm91cC0ke2V0aH1gKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKGAjbm90LWRoY3AtJHtldGh9YCkudmFsKCcxJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoYCNpcC1hZGRyZXNzLWdyb3VwLSR7ZXRofWApLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuYWRkTmV3Rm9ybVJ1bGVzKGV0aCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbaXBhZGRyQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgbm90LWRoY3AtJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2RoY3AnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IGRoY3BDbGFzcyA9IGBkaGNwXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdkaGNwJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2RoY3BDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBkaGNwQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBgZGhjcE9uVmxhbk5ldHdvcmtzWyR7bmV3Um93SWR9XWAsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlREhDUE9uVmxhbnNEb250U3VwcG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjYkJlZm9yZVNlbmRGb3JtIGNhbGxlZCB3aXRoIHNldHRpbmdzOicsIHNldHRpbmdzKTtcblxuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgb2JqZWN0IHdpdGggYWxsIHNldHRpbmdzIHByb3BlcnRpZXNcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHt9O1xuXG4gICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgZm9ybSB2YWx1ZXMgdG8gYXZvaWQgYW55IERPTS1yZWxhdGVkIGlzc3Vlc1xuICAgICAgICAvLyBDb2xsZWN0IGFsbCByZWd1bGFyIGlucHV0IGZpZWxkc1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFt0eXBlPVwidGV4dFwiXSwgaW5wdXRbdHlwZT1cImhpZGRlblwiXSwgaW5wdXRbdHlwZT1cIm51bWJlclwiXSwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRpbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IHNlbGVjdCBkcm9wZG93bnNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnc2VsZWN0JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWxlY3QgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRzZWxlY3QuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRzZWxlY3QudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhblxuICAgICAgICAvLyBQYnhBcGlDbGllbnQgd2lsbCBoYW5kbGUgY29udmVyc2lvbiB0byBzdHJpbmdzIGZvciBqUXVlcnlcbiAgICAgICAgcmVzdWx0LmRhdGEudXNlbmF0ID0gJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgLy8gVXNlIGNvcnJlY3QgZmllbGQgbmFtZSBmcm9tIHRoZSBmb3JtIChhdXRvVXBkYXRlRXh0ZXJuYWxJcCwgbm90IEFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQKVxuICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZURpdiA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgIGlmICgkYXV0b1VwZGF0ZURpdi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9ICRhdXRvVXBkYXRlRGl2LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29udmVydCBESENQIGNoZWNrYm94ZXMgdG8gYm9vbGVhbiBmb3IgZWFjaCBpbnRlcmZhY2VcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnLmRoY3AtY2hlY2tib3gnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbnB1dElkID0gJChvYmopLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBjb25zdCByb3dJZCA9IGlucHV0SWQucmVwbGFjZSgnZGhjcC0nLCAnJykucmVwbGFjZSgnLWNoZWNrYm94JywgJycpO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtyb3dJZH1gXSA9ICQob2JqKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbnN1cmUgaW50ZXJuZXRfaW50ZXJmYWNlIGlzIGluY2x1ZGVkIChmcm9tIGR5bmFtaWMgZHJvcGRvd24pXG4gICAgICAgIGNvbnN0IGludGVybmV0SW50ZXJmYWNlVmFsdWUgPSAkKCcjaW50ZXJuZXRfaW50ZXJmYWNlJykudmFsKCk7XG4gICAgICAgIGlmIChpbnRlcm5ldEludGVyZmFjZVZhbHVlKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pbnRlcm5ldF9pbnRlcmZhY2UgPSBTdHJpbmcoaW50ZXJuZXRJbnRlcmZhY2VWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXAgZm9ybSBmaWVsZCBuYW1lcyB0byBBUEkgZmllbGQgbmFtZXMgZm9yIHBvcnRzXG4gICAgICAgIGNvbnN0IHBvcnRGaWVsZE1hcHBpbmcgPSB7XG4gICAgICAgICAgICAnZXh0ZXJuYWxTSVBQb3J0JzogJ0VYVEVSTkFMX1NJUF9QT1JUJyxcbiAgICAgICAgICAgICdleHRlcm5hbFRMU1BvcnQnOiAnRVhURVJOQUxfVExTX1BPUlQnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXBwbHkgcG9ydCBmaWVsZCBtYXBwaW5nXG4gICAgICAgIE9iamVjdC5rZXlzKHBvcnRGaWVsZE1hcHBpbmcpLmZvckVhY2goZm9ybUZpZWxkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFwaUZpZWxkID0gcG9ydEZpZWxkTWFwcGluZ1tmb3JtRmllbGRdO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2FwaUZpZWxkXSA9IHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdjYkJlZm9yZVNlbmRGb3JtIHJldHVybmluZyByZXN1bHQ6JywgcmVzdWx0KTtcbiAgICAgICAgY29uc29sZS5sb2coJ2NiQmVmb3JlU2VuZEZvcm0gcmVzdWx0LmRhdGE6JywgcmVzdWx0LmRhdGEpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnY2JBZnRlclNlbmRGb3JtIGNhbGxlZCB3aXRoIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbmV0d29ya3MuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbmV0d29ya3MuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBOZXR3b3JrQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZUNvbmZpZyc7XG5cbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL21vZGlmeS9gO1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG5ldHdvcmsgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQ29uZmlndXJhdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0xvYWRpbmcgY29uZmlndXJhdGlvbiBmcm9tIFJFU1QgQVBJLi4uJyk7XG4gICAgICAgIE5ldHdvcmtBUEkuZ2V0Q29uZmlnKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05ldHdvcmtBUEkuZ2V0Q29uZmlnIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb25maWd1cmF0aW9uIGRhdGEgcmVjZWl2ZWQ6JywgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBhZnRlciBsb2FkaW5nIGRhdGFcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZm9ybSBlbGVtZW50cyBjb25uZWN0ZWQgd2l0aCBub24gZG9ja2VyIGluc3RhbGxhdGlvbnNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5pc0RvY2tlcikge1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaXMtZG9ja2VyJywgJzEnKTtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgY29uZmlndXJhdGlvbjonLCByZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBpbnRlcmZhY2UgdGFicyBhbmQgZm9ybXMgZHluYW1pY2FsbHkgZnJvbSBSRVNUIEFQSSBkYXRhXG4gICAgICovXG4gICAgY3JlYXRlSW50ZXJmYWNlVGFicyhkYXRhKSB7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUnKTtcbiAgICAgICAgY29uc3QgJGNvbnRlbnQgPSAkKCcjZXRoLWludGVyZmFjZXMtY29udGVudCcpO1xuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnRcbiAgICAgICAgJG1lbnUuZW1wdHkoKTtcbiAgICAgICAgJGNvbnRlbnQuZW1wdHkoKTtcblxuICAgICAgICAvLyBGaW5kIGludGVyZmFjZXMgdGhhdCBjYW4gYmUgZGVsZXRlZCAoaGF2ZSBtdWx0aXBsZSBWTEFOcylcbiAgICAgICAgY29uc3QgZGVsZXRhYmxlSW50ZXJmYWNlcyA9IFtdO1xuICAgICAgICBjb25zdCBpbnRlcmZhY2VDb3VudCA9IHt9O1xuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaChpZmFjZSA9PiB7XG4gICAgICAgICAgICBpbnRlcmZhY2VDb3VudFtpZmFjZS5pbnRlcmZhY2VdID0gKGludGVyZmFjZUNvdW50W2lmYWNlLmludGVyZmFjZV0gfHwgMCkgKyAxO1xuICAgICAgICB9KTtcbiAgICAgICAgT2JqZWN0LmtleXMoaW50ZXJmYWNlQ291bnQpLmZvckVhY2goaWZhY2VOYW1lID0+IHtcbiAgICAgICAgICAgIGlmIChpbnRlcmZhY2VDb3VudFtpZmFjZU5hbWVdID4gMSkge1xuICAgICAgICAgICAgICAgIGRlbGV0YWJsZUludGVyZmFjZXMucHVzaChpZmFjZU5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgdGFicyBmb3IgZXhpc3RpbmcgaW50ZXJmYWNlc1xuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaCgoaWZhY2UsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YWJJZCA9IGlmYWNlLmlkO1xuICAgICAgICAgICAgY29uc3QgdGFiTGFiZWwgPSBgJHtpZmFjZS5uYW1lIHx8IGlmYWNlLmludGVyZmFjZX0gKCR7aWZhY2UuaW50ZXJmYWNlfSR7aWZhY2UudmxhbmlkICE9PSAnMCcgJiYgaWZhY2UudmxhbmlkICE9PSAwID8gYC4ke2lmYWNlLnZsYW5pZH1gIDogJyd9KWA7XG4gICAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IGluZGV4ID09PSAwO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW0gJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICAke3RhYkxhYmVsfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0IGNhbkRlbGV0ZSA9IGRlbGV0YWJsZUludGVyZmFjZXMuaW5jbHVkZXMoaWZhY2UuaW50ZXJmYWNlKTtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ1dHRvbiA9IGNhbkRlbGV0ZSA/IGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cInVpIGljb24gbGVmdCBsYWJlbGVkIGJ1dHRvbiBkZWxldGUtaW50ZXJmYWNlXCIgZGF0YS12YWx1ZT1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaFwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19EZWxldGVDdXJyZW50SW50ZXJmYWNlfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGAgOiAnJztcblxuICAgICAgICAgICAgJGNvbnRlbnQuYXBwZW5kKG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRlbXBsYXRlIHRhYiBmb3IgbmV3IFZMQU5cbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZGF0YS50ZW1wbGF0ZTtcbiAgICAgICAgICAgIHRlbXBsYXRlLmlkID0gMDtcblxuICAgICAgICAgICAgLy8gQWRkIFwiK1wiIHRhYiBtZW51IGl0ZW1cbiAgICAgICAgICAgICRtZW51LmFwcGVuZChgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJpdGVtXCIgZGF0YS10YWI9XCIwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBwbHVzXCI+PC9pPlxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGVtcGxhdGUgZm9ybSB3aXRoIGludGVyZmFjZSBzZWxlY3RvclxuICAgICAgICAgICAgJGNvbnRlbnQuYXBwZW5kKG5ldHdvcmtzLmNyZWF0ZVRlbXBsYXRlRm9ybSh0ZW1wbGF0ZSwgZGF0YS5pbnRlcmZhY2VzKSk7XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIGludGVyZmFjZSBzZWxlY3RvciBkcm9wZG93biBmb3IgdGVtcGxhdGVcbiAgICAgICAgICAgIGNvbnN0IHBoeXNpY2FsSW50ZXJmYWNlcyA9IHt9O1xuICAgICAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goaWZhY2UgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcGh5c2ljYWxJbnRlcmZhY2VzW2lmYWNlLmludGVyZmFjZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgcGh5c2ljYWxJbnRlcmZhY2VzW2lmYWNlLmludGVyZmFjZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaWZhY2UuaWQudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGlmYWNlLmludGVyZmFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGlmYWNlLmludGVyZmFjZVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMgPSBPYmplY3QudmFsdWVzKHBoeXNpY2FsSW50ZXJmYWNlcyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignaW50ZXJmYWNlXzAnLCB7IGludGVyZmFjZV8wOiAnJyB9LCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd25zIHVzaW5nIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goKGlmYWNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBgc3VibmV0XyR7aWZhY2UuaWR9YDtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge307XG4gICAgICAgICAgICBmb3JtRGF0YVtmaWVsZE5hbWVdID0gaWZhY2Uuc3VibmV0IHx8ICcyNCc7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSAgLy8gQWRkIHNlYXJjaCBjbGFzcyBmb3Igc2VhcmNoYWJsZSBkcm9wZG93blxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0ZW1wbGF0ZSAoaWQgPSAwKVxuICAgICAgICBpZiAoZGF0YS50ZW1wbGF0ZSkge1xuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdzdWJuZXRfMCcsIHsgc3VibmV0XzA6ICcyNCcgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10gIC8vIEFkZCBzZWFyY2ggY2xhc3MgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykuZmlyc3QoKS50cmlnZ2VyKCdjbGljaycpO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICAkKCcuZGVsZXRlLWludGVyZmFjZScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgTmV0d29ya0FQSS5kZWxldGVSZWNvcmQoaW50ZXJmYWNlSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgREhDUCBjaGVja2JveCBoYW5kbGVyc1xuICAgICAgICAkKCcuZGhjcC1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBJUCBhZGRyZXNzIGlucHV0IG1hc2tzXG4gICAgICAgICQoJy5pcGFkZHJlc3MnKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIGV4aXN0aW5nIGludGVyZmFjZVxuICAgICAqL1xuICAgIGNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24pIHtcbiAgICAgICAgY29uc3QgaWQgPSBpZmFjZS5pZDtcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudCAke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmludGVyZmFjZX1cIiAvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcmZhY2VOYW1lfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5uYW1lIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGRoY3AtY2hlY2tib3hcIiBpZD1cImRoY3AtJHtpZH0tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImRoY3BfJHtpZH1cIiAke2lmYWNlLmRoY3AgPyAnY2hlY2tlZCcgOiAnJ30gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVXNlREhDUH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibm90ZGhjcF8ke2lkfVwiIGlkPVwibm90LWRoY3AtJHtpZH1cIi8+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRzXCIgaWQ9XCJpcC1hZGRyZXNzLWdyb3VwLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQQWRkcmVzc308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXBhZGRyIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X05ldHdvcmtNYXNrfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnN1Ym5ldCB8fCAnMjQnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ZsYW5JRH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiBuYW1lPVwidmxhbmlkXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnZsYW5pZCB8fCAnMCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAke2RlbGV0ZUJ1dHRvbn1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZm9ybSBmb3IgbmV3IFZMQU4gdGVtcGxhdGVcbiAgICAgKi9cbiAgICBjcmVhdGVUZW1wbGF0ZUZvcm0odGVtcGxhdGUsIGludGVyZmFjZXMpIHtcbiAgICAgICAgY29uc3QgaWQgPSAwO1xuXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYm90dG9tIGF0dGFjaGVkIHRhYiBzZWdtZW50XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcmZhY2VfJHtpZH1cIiBpZD1cImludGVyZmFjZV8ke2lkfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcmZhY2VOYW1lfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibmFtZV8ke2lkfVwiIGlkPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggZGhjcC1jaGVja2JveFwiIGlkPVwiZGhjcC0ke2lkfS1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiZGhjcF8ke2lkfVwiIGNoZWNrZWQgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVXNlREhDUH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibm90ZGhjcF8ke2lkfVwiIGlkPVwibm90LWRoY3AtJHtpZH1cIi8+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRzXCIgaWQ9XCJpcC1hZGRyZXNzLWdyb3VwLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQQWRkcmVzc308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIlwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X05ldHdvcmtNYXNrfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIyNFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ZsYW5JRH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiBuYW1lPVwidmxhbmlkXyR7aWR9XCIgdmFsdWU9XCI0MDk1XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHN1Ym5ldCBtYXNrIG9wdGlvbnMgYXJyYXkgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHN1Ym5ldCBtYXNrIG9wdGlvbnNcbiAgICAgKi9cbiAgICBnZXRTdWJuZXRPcHRpb25zQXJyYXkoKSB7XG4gICAgICAgIC8vIE5ldHdvcmsgbWFza3MgZnJvbSBDaWRyOjpnZXROZXRNYXNrcygpIChrcnNvcnQgU09SVF9OVU1FUklDKVxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge3ZhbHVlOiAnMzInLCB0ZXh0OiAnMzIgLSAyNTUuMjU1LjI1NS4yNTUnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMxJywgdGV4dDogJzMxIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMCcsIHRleHQ6ICczMCAtIDI1NS4yNTUuMjU1LjI1Mid9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjknLCB0ZXh0OiAnMjkgLSAyNTUuMjU1LjI1NS4yNDgnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI4JywgdGV4dDogJzI4IC0gMjU1LjI1NS4yNTUuMjQwJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNycsIHRleHQ6ICcyNyAtIDI1NS4yNTUuMjU1LjIyNCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjYnLCB0ZXh0OiAnMjYgLSAyNTUuMjU1LjI1NS4xOTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI1JywgdGV4dDogJzI1IC0gMjU1LjI1NS4yNTUuMTI4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNCcsIHRleHQ6ICcyNCAtIDI1NS4yNTUuMjU1LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIzJywgdGV4dDogJzIzIC0gMjU1LjI1NS4yNTUuMjU0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMicsIHRleHQ6ICcyMiAtIDI1NS4yNTUuMjUyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIxJywgdGV4dDogJzIxIC0gMjU1LjI1NS4yNDguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjAnLCB0ZXh0OiAnMjAgLSAyNTUuMjU1LjI0MC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOScsIHRleHQ6ICcxOSAtIDI1NS4yNTUuMjI0LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE4JywgdGV4dDogJzE4IC0gMjU1LjI1NS4xOTIuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTcnLCB0ZXh0OiAnMTcgLSAyNTUuMjU1LjEyOC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNicsIHRleHQ6ICcxNiAtIDI1NS4yNTUuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNScsIHRleHQ6ICcxNSAtIDI1NS4yNTQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNCcsIHRleHQ6ICcxNCAtIDI1NS4yNTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMycsIHRleHQ6ICcxMyAtIDI1NS4yNDguMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMicsIHRleHQ6ICcxMiAtIDI1NS4yNDAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMScsIHRleHQ6ICcxMSAtIDI1NS4yMjQuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxMCcsIHRleHQ6ICcxMCAtIDI1NS4xOTIuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc5JywgdGV4dDogJzkgLSAyNTUuMTI4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOCcsIHRleHQ6ICc4IC0gMjU1LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc3JywgdGV4dDogJzcgLSAyNTQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzYnLCB0ZXh0OiAnNiAtIDI1Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNScsIHRleHQ6ICc1IC0gMjQ4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc0JywgdGV4dDogJzQgLSAyNDAuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMnLCB0ZXh0OiAnMyAtIDIyNC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMicsIHRleHQ6ICcyIC0gMTkyLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogJzEgLSAxMjguMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiAnMCAtIDAuMC4wLjAnfSxcbiAgICAgICAgXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGNvbmZpZ3VyYXRpb24gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwb3B1bGF0ZUZvcm0gY2FsbGVkIHdpdGggZGF0YTonLCBkYXRhKTtcblxuICAgICAgICAvLyBDcmVhdGUgaW50ZXJmYWNlIHRhYnMgYW5kIGZvcm1zIGR5bmFtaWNhbGx5XG4gICAgICAgIG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZVRhYnMoZGF0YSk7XG5cbiAgICAgICAgLy8gQnVpbGQgaW50ZXJuZXQgaW50ZXJmYWNlIGRyb3Bkb3duIGR5bmFtaWNhbGx5XG4gICAgICAgIGNvbnN0IGludGVybmV0SW50ZXJmYWNlT3B0aW9ucyA9IGRhdGEuaW50ZXJmYWNlcy5tYXAoaWZhY2UgPT4gKHtcbiAgICAgICAgICAgIHZhbHVlOiBpZmFjZS5pZC50b1N0cmluZygpLFxuICAgICAgICAgICAgdGV4dDogaWZhY2UubmFtZSB8fCBgJHtpZmFjZS5pbnRlcmZhY2V9JHtpZmFjZS52bGFuaWQgIT09ICcwJyA/IGAuJHtpZmFjZS52bGFuaWR9YCA6ICcnfWAsXG4gICAgICAgICAgICBuYW1lOiBpZmFjZS5uYW1lIHx8IGAke2lmYWNlLmludGVyZmFjZX0ke2lmYWNlLnZsYW5pZCAhPT0gJzAnID8gYC4ke2lmYWNlLnZsYW5pZH1gIDogJyd9YFxuICAgICAgICB9KSk7XG5cbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7XG4gICAgICAgICAgICBpbnRlcm5ldF9pbnRlcmZhY2U6IGRhdGEuaW50ZXJuZXRJbnRlcmZhY2VJZD8udG9TdHJpbmcoKSB8fCAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignaW50ZXJuZXRfaW50ZXJmYWNlJywgZm9ybURhdGEsIHtcbiAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IGludGVybmV0SW50ZXJmYWNlT3B0aW9ucyxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJuZXRJbnRlcmZhY2VcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IE5BVCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5uYXQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZXR0aW5nIE5BVCBzZXR0aW5nczonLCBkYXRhLm5hdCk7XG4gICAgICAgICAgICAvLyBCb29sZWFuIHZhbHVlcyBmcm9tIEFQSVxuICAgICAgICAgICAgaWYgKGRhdGEubmF0LnVzZW5hdCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDaGVja2luZyB1c2VuYXQgY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVbmNoZWNraW5nIHVzZW5hdCBjaGVja2JveCcpO1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIGRhdGEubmF0LmV4dGlwYWRkciB8fCAnJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCBkYXRhLm5hdC5leHRob3N0bmFtZSB8fCAnJyk7XG5cbiAgICAgICAgICAgIC8vIGF1dG9VcGRhdGVFeHRlcm5hbElwIGJvb2xlYW4gKGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSlcbiAgICAgICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlQ2hlY2tib3ggPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRhdXRvVXBkYXRlQ2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLm5hdC5BVVRPX1VQREFURV9FWFRFUk5BTF9JUCB8fCBkYXRhLm5hdC5hdXRvVXBkYXRlRXh0ZXJuYWxJcCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ2hlY2tpbmcgYXV0b1VwZGF0ZUV4dGVybmFsSXAgY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVW5jaGVja2luZyBhdXRvVXBkYXRlRXh0ZXJuYWxJcCBjaGVja2JveCcpO1xuICAgICAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHBvcnQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEucG9ydHMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZXR0aW5nIHBvcnQgdmFsdWVzOicsIGRhdGEucG9ydHMpO1xuXG4gICAgICAgICAgICAvLyBNYXAgQVBJIGZpZWxkIG5hbWVzIHRvIGZvcm0gZmllbGQgbmFtZXNcbiAgICAgICAgICAgIGNvbnN0IHBvcnRGaWVsZE1hcHBpbmcgPSB7XG4gICAgICAgICAgICAgICAgJ0VYVEVSTkFMX1NJUF9QT1JUJzogJ2V4dGVybmFsU0lQUG9ydCcsXG4gICAgICAgICAgICAgICAgJ0VYVEVSTkFMX1RMU19QT1JUJzogJ2V4dGVybmFsVExTUG9ydCcsXG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogJ1NJUF9QT1JUJyxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiAnVExTX1BPUlQnLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogJ1JUUF9QT1JUX0ZST00nLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6ICdSVFBfUE9SVF9UTydcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucG9ydHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBmb3JtRmllbGROYW1lID0gcG9ydEZpZWxkTWFwcGluZ1trZXldIHx8IGtleTtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGEucG9ydHNba2V5XTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU2V0dGluZyBwb3J0IGZpZWxkICR7Zm9ybUZpZWxkTmFtZX0gdG8gdmFsdWUgJHt2YWx1ZX1gKTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBmb3JtRmllbGROYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBOQVQgaGVscCB0ZXh0IGFuZCBsYWJlbHMgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXNcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZU5BVEhlbHBUZXh0KGRhdGEucG9ydHMpO1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlUG9ydExhYmVscyhkYXRhLnBvcnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBhZGRpdGlvbmFsIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnNldHRpbmdzKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnNldHRpbmdzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywga2V5LCBkYXRhLnNldHRpbmdzW2tleV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIGluaXRpYWwgdmFsdWVzIGZvciBkaXJ0eSBjaGVja2luZ1xuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkcldpdGhQb3J0T3B0aW9uYWwgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pKDpbMC05XSspPyQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgYSBnaXZlbiBpbnRlcmZhY2UuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmxhblZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBWTEFOIElEIGlucHV0IGZpZWxkLlxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIHBhcmFtZXRlciBmb3IgdGhlIHJ1bGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgdGhlIGludGVyZmFjZSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tWbGFuID0gKHZsYW5WYWx1ZSwgcGFyYW0pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCB2bGFuc0FycmF5ID0ge307XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgIT09IHVuZGVmaW5lZCAmJiBhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgPiAwKSB7XG4gICAgICAgIGNvbnN0IG5ld0V0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2FsbFZhbHVlcy5pbnRlcmZhY2VfMH1gXTtcbiAgICAgICAgdmxhbnNBcnJheVtuZXdFdGhOYW1lXSA9IFthbGxWYWx1ZXMudmxhbmlkXzBdO1xuICAgICAgICBpZiAoYWxsVmFsdWVzLnZsYW5pZF8wID09PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgJC5lYWNoKGFsbFZhbHVlcywgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICBpZiAoaW5kZXggPT09ICdpbnRlcmZhY2VfMCcgfHwgaW5kZXggPT09ICd2bGFuaWRfMCcpIHJldHVybjtcbiAgICAgICAgaWYgKGluZGV4LmluZGV4T2YoJ3ZsYW5pZCcpID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGV0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2luZGV4LnNwbGl0KCdfJylbMV19YF07XG4gICAgICAgICAgICBpZiAoJC5pbkFycmF5KHZhbHVlLCB2bGFuc0FycmF5W2V0aE5hbWVdKSA+PSAwXG4gICAgICAgICAgICAgICAgJiYgdmxhblZhbHVlID09PSB2YWx1ZVxuICAgICAgICAgICAgICAgICYmIHBhcmFtID09PSBpbmRleC5zcGxpdCgnXycpWzFdKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghKGV0aE5hbWUgaW4gdmxhbnNBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2bGFuc0FycmF5W2V0aE5hbWVdLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiBESENQIGlzIGVuYWJsZWQgb24gVkxBTiBuZXR3b3Jrcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgaW5wdXQgZmllbGQuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgcGFyYW1ldGVyIGZvciB0aGUgcnVsZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIERIQ1AgaXMgbm90IGVuYWJsZWQgb24gdGhlIFZMQU4gbmV0d29yaywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZGhjcE9uVmxhbk5ldHdvcmtzID0gKHZhbHVlLCBwYXJhbSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IHZsYW5WYWx1ZSA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsIGB2bGFuaWRfJHtwYXJhbX1gKTtcbiAgICBjb25zdCBkaGNwVmFsdWUgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgZGhjcF8ke3BhcmFtfWApO1xuICAgIGlmICh2bGFuVmFsdWUgPiAwICYmIGRoY3BWYWx1ZSA9PT0gJ29uJykge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyB0aGUgcHJlc2VuY2Ugb2YgZXh0ZXJuYWwgSVAgaG9zdCBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24gaXMgcHJvdmlkZWQgd2hlbiBOQVQgaXMgZW5hYmxlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5hbElwSG9zdCA9ICgpID0+IHtcbiAgICBjb25zdCBhbGxWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgaWYgKGFsbFZhbHVlcy51c2VuYXQgPT09ICdvbicpIHtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy5leHRob3N0bmFtZSA9PT0gJycgJiYgYWxsVmFsdWVzLmV4dGlwYWRkciA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB2YWx1ZSBpcyBhIHZhbGlkIGhvc3RuYW1lXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgaG9zdG5hbWVcbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdmFsaWQgaG9zdG5hbWUsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudmFsaWRIb3N0bmFtZSA9ICh2YWx1ZSkgPT4ge1xuICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBFbXB0eSBpcyBoYW5kbGVkIGJ5IGV4dGVuYWxJcEhvc3QgcnVsZVxuICAgIH1cblxuICAgIC8vIFJGQyA5NTIvUkZDIDExMjMgaG9zdG5hbWUgdmFsaWRhdGlvblxuICAgIC8vIC0gTGFiZWxzIHNlcGFyYXRlZCBieSBkb3RzXG4gICAgLy8gLSBFYWNoIGxhYmVsIDEtNjMgY2hhcnNcbiAgICAvLyAtIE9ubHkgYWxwaGFudW1lcmljIGFuZCBoeXBoZW5zXG4gICAgLy8gLSBDYW5ub3Qgc3RhcnQvZW5kIHdpdGggaHlwaGVuXG4gICAgLy8gLSBUb3RhbCBsZW5ndGggbWF4IDI1MyBjaGFyc1xuICAgIGNvbnN0IGhvc3RuYW1lUmVnZXggPSAvXig/PS57MSwyNTN9JCkoPyEtKVthLXpBLVowLTktXXsxLDYzfSg/PCEtKShcXC5bYS16QS1aMC05LV17MSw2M30oPzwhLSkpKiQvO1xuICAgIHJldHVybiBob3N0bmFtZVJlZ2V4LnRlc3QodmFsdWUpO1xufTtcblxuXG4vKipcbiAqICBJbml0aWFsaXplIG5ldHdvcmsgc2V0dGluZ3MgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbmV0d29ya3MuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=