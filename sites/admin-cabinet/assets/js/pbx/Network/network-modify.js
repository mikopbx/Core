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
 *  Initialize network settings form on document ready
 */


$(document).ready(function () {
  networks.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJnYXRld2F5Iiwib3B0aW9uYWwiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCIsInByaW1hcnlkbnMiLCJzZWNvbmRhcnlkbnMiLCJleHRpcGFkZHIiLCJud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHkiLCJleHRob3N0bmFtZSIsImRlcGVuZHMiLCJpbml0aWFsaXplIiwibG9hZENvbmZpZ3VyYXRpb24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwiZHJvcGRvd24iLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZENsYXNzIiwiU3lzaW5mb0FQSSIsImdldEV4dGVybmFsSXBJbmZvIiwiY2JBZnRlckdldEV4dGVybmFsSXAiLCJpbnB1dG1hc2siLCJhbGlhcyIsImluaXRpYWxpemVGb3JtIiwiZm9ybSIsImhpZGUiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwiY3VycmVudEV4dElwQWRkciIsInBvcnRNYXRjaCIsIm1hdGNoIiwicG9ydCIsIm5ld0V4dElwQWRkciIsImlwIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBfUE9SVCIsIlRMU19QT1JUIiwiUlRQX1BPUlRfRlJPTSIsIlJUUF9QT1JUX1RPIiwiJHNpcFBvcnRWYWx1ZXMiLCJsZW5ndGgiLCJzaXBUZXh0IiwiaTE4biIsImh0bWwiLCIkcnRwUG9ydFZhbHVlcyIsInJ0cFRleHQiLCJ1cGRhdGVQb3J0TGFiZWxzIiwiJHNpcExhYmVsIiwic2lwTGFiZWxUZXh0IiwidGV4dCIsIiR0bHNMYWJlbCIsInRsc0xhYmVsVGV4dCIsImVhY2giLCJpbmRleCIsIm9iaiIsImV0aCIsImF0dHIiLCJ2YWwiLCJhZGROZXdGb3JtUnVsZXMiLCJuZXdSb3dJZCIsIm5hbWVDbGFzcyIsImlkZW50aWZpZXIiLCJud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHkiLCJ2bGFuQ2xhc3MiLCJud19WYWxpZGF0ZVZsYW5SYW5nZSIsIm53X1ZhbGlkYXRlVmxhbkNyb3NzIiwiaXBhZGRyQ2xhc3MiLCJud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5IiwiZGhjcENsYXNzIiwibndfVmFsaWRhdGVESENQT25WbGFuc0RvbnRTdXBwb3J0IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY29uc29sZSIsImxvZyIsInJlc3VsdCIsIk9iamVjdCIsImFzc2lnbiIsImRhdGEiLCJmaW5kIiwiJGlucHV0IiwibmFtZSIsInZhbHVlIiwidW5kZWZpbmVkIiwiU3RyaW5nIiwiJHNlbGVjdCIsInVzZW5hdCIsIiRhdXRvVXBkYXRlRGl2IiwicGFyZW50IiwiYXV0b1VwZGF0ZUV4dGVybmFsSXAiLCJpbnB1dElkIiwicm93SWQiLCJyZXBsYWNlIiwiaW50ZXJuZXRJbnRlcmZhY2VWYWx1ZSIsImludGVybmV0X2ludGVyZmFjZSIsInBvcnRGaWVsZE1hcHBpbmciLCJrZXlzIiwiZm9yRWFjaCIsImZvcm1GaWVsZCIsImFwaUZpZWxkIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsImlzRG9ja2VyIiwiZXJyb3IiLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiY3JlYXRlSW50ZXJmYWNlVGFicyIsIiRtZW51IiwiJGNvbnRlbnQiLCJlbXB0eSIsImRlbGV0YWJsZUludGVyZmFjZXMiLCJpbnRlcmZhY2VDb3VudCIsImludGVyZmFjZXMiLCJpZmFjZSIsImlmYWNlTmFtZSIsInB1c2giLCJ0YWJJZCIsImlkIiwidGFiTGFiZWwiLCJ2bGFuaWQiLCJpc0FjdGl2ZSIsImFwcGVuZCIsImNhbkRlbGV0ZSIsImluY2x1ZGVzIiwiZGVsZXRlQnV0dG9uIiwibndfRGVsZXRlQ3VycmVudEludGVyZmFjZSIsImNyZWF0ZUludGVyZmFjZUZvcm0iLCJ0ZW1wbGF0ZSIsImNyZWF0ZVRlbXBsYXRlRm9ybSIsInBoeXNpY2FsSW50ZXJmYWNlcyIsInRvU3RyaW5nIiwicGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zIiwidmFsdWVzIiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJpbnRlcmZhY2VfMCIsInN0YXRpY09wdGlvbnMiLCJwbGFjZWhvbGRlciIsIm53X1NlbGVjdEludGVyZmFjZSIsImFsbG93RW1wdHkiLCJmaWVsZE5hbWUiLCJmb3JtRGF0YSIsInN1Ym5ldCIsImdldFN1Ym5ldE9wdGlvbnNBcnJheSIsIm53X1NlbGVjdE5ldHdvcmtNYXNrIiwiYWRkaXRpb25hbENsYXNzZXMiLCJzdWJuZXRfMCIsInRhYiIsImZpcnN0Iiwib2ZmIiwiJGJ1dHRvbiIsImludGVyZmFjZUlkIiwiZGVsZXRlUmVjb3JkIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJud19JbnRlcmZhY2VOYW1lIiwiZGhjcCIsIm53X1VzZURIQ1AiLCJud19JUEFkZHJlc3MiLCJpcGFkZHIiLCJud19OZXR3b3JrTWFzayIsIm53X1ZsYW5JRCIsImludGVybmV0SW50ZXJmYWNlT3B0aW9ucyIsIm1hcCIsImludGVybmV0SW50ZXJmYWNlSWQiLCJud19TZWxlY3RJbnRlcm5ldEludGVyZmFjZSIsIm5hdCIsIiRhdXRvVXBkYXRlQ2hlY2tib3giLCJBVVRPX1VQREFURV9FWFRFUk5BTF9JUCIsImtleSIsImZvcm1GaWVsZE5hbWUiLCJlbmFibGVEaXJyaXR5Iiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJmbiIsImYiLCJpIiwiYSIsImlwYWRkcldpdGhQb3J0T3B0aW9uYWwiLCJjaGVja1ZsYW4iLCJ2bGFuVmFsdWUiLCJwYXJhbSIsImFsbFZhbHVlcyIsIm5ld0V0aE5hbWUiLCJ2bGFuaWRfMCIsImluZGV4T2YiLCJldGhOYW1lIiwic3BsaXQiLCJpbkFycmF5IiwiZGhjcE9uVmxhbk5ldHdvcmtzIiwiZGhjcFZhbHVlIiwiZXh0ZW5hbElwSG9zdCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2JDLEVBQUFBLGNBQWMsRUFBRUMsQ0FBQyxDQUFDLFVBQUQsQ0FESjs7QUFHYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVELENBQUMsQ0FBQyxlQUFELENBUEU7QUFTYkUsRUFBQUEsVUFBVSxFQUFFRixDQUFDLENBQUMseUJBQUQsQ0FUQTtBQVViRyxFQUFBQSxVQUFVLEVBQUVILENBQUMsQ0FBQyxZQUFELENBVkE7QUFXYkksRUFBQUEsZUFBZSxFQUFFSixDQUFDLENBQUMsWUFBRCxDQVhMO0FBWWJLLEVBQUFBLFVBQVUsRUFBRSxFQVpDOztBQWNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG9CQUFvQixFQUFFTixDQUFDLENBQUMsd0JBQUQsQ0FsQlY7O0FBb0JiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSU8sRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLE9BQU8s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SUFBUDtBQUNILENBUkQ7QUFXQTtBQUNBO0FBQ0E7OztBQUNBakIsQ0FBQyxDQUFDMk4sUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjlOLEVBQUFBLFFBQVEsQ0FBQ3dCLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTeXNpbmZvQVBJLCBOZXR3b3JrQVBJLCBVc2VyTWVzc2FnZSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbmV0d29yayBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgbmV0d29ya3NcbiAqL1xuY29uc3QgbmV0d29ya3MgPSB7XG4gICAgJGdldE15SXBCdXR0b246ICQoJyNnZXRteWlwJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbmV0d29yay1mb3JtJyksXG5cbiAgICAkZHJvcERvd25zOiAkKCcjbmV0d29yay1mb3JtIC5kcm9wZG93bicpLFxuICAgICRleHRpcGFkZHI6ICQoJyNleHRpcGFkZHInKSxcbiAgICAkaXBhZGRyZXNzSW5wdXQ6ICQoJy5pcGFkZHJlc3MnKSxcbiAgICB2bGFuc0FycmF5OiB7fSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50cyB3aXRoIHdlIHNob3VsZCBoaWRlIGZyb20gdGhlIGZvcm0gZm9yIGRvY2tlciBpbnN0YWxsYXRpb24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm90U2hvd09uRG9ja2VyRGl2czogJCgnLmRvLW5vdC1zaG93LWlmLWRvY2tlcicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGdhdGV3YXk6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgcHJpbWFyeWRuczoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzZWNvbmRhcnlkbnM6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0aXBhZGRyOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyV2l0aFBvcnRPcHRpb25hbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGhvc3RuYW1lOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAndXNlbmF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5hbElwSG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gTG9hZCBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAgICBuZXR3b3Jrcy5sb2FkQ29uZmlndXJhdGlvbigpO1xuXG4gICAgICAgIC8vIEhhbmRsZXMgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgJ3VzZW5hdC1jaGVja2JveCcuXG4gICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBuZXR3b3Jrcy4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gREhDUCBjaGVja2JveCBoYW5kbGVycyB3aWxsIGJlIGJvdW5kIGFmdGVyIHRhYnMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHlcblxuICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFN5c2luZm9BUEkuZ2V0RXh0ZXJuYWxJcEluZm8obmV0d29ya3MuY2JBZnRlckdldEV4dGVybmFsSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG4gICAgICAgIG5ldHdvcmtzLiRpcGFkZHJlc3NJbnB1dC5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICBuZXR3b3Jrcy5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEhpZGUgZm9ybSBlbGVtZW50cyBjb25uZWN0ZWQgd2l0aCBub24gZG9ja2VyIGluc3RhbGxhdGlvbnNcbiAgICAgICAgaWYgKG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ2lzLWRvY2tlcicpPT09XCIxXCIpIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRub3RTaG93T25Eb2NrZXJEaXZzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBnZXR0aW5nIHRoZSBleHRlcm5hbCBJUCBmcm9tIGEgcmVtb3RlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXIuIElmIGZhbHNlLCBpbmRpY2F0ZXMgYW4gZXJyb3Igb2NjdXJyZWQuXG4gICAgICovXG4gICAgY2JBZnRlckdldEV4dGVybmFsSXAocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHRJcEFkZHIgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0aXBhZGRyJyk7XG4gICAgICAgICAgICBjb25zdCBwb3J0TWF0Y2ggPSBjdXJyZW50RXh0SXBBZGRyLm1hdGNoKC86KFxcZCspJC8pO1xuICAgICAgICAgICAgY29uc3QgcG9ydCA9IHBvcnRNYXRjaCA/ICc6JyArIHBvcnRNYXRjaFsxXSA6ICcnO1xuICAgICAgICAgICAgY29uc3QgbmV3RXh0SXBBZGRyID0gcmVzcG9uc2UuaXAgKyBwb3J0O1xuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIG5ld0V4dElwQWRkcik7XG4gICAgICAgICAgICAvLyBDbGVhciBleHRlcm5hbCBob3N0bmFtZSB3aGVuIGdldHRpbmcgZXh0ZXJuYWwgSVBcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRob3N0bmFtZScsICcnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBOQVQgaGVscCB0ZXh0IHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcG9ydHMgLSBQb3J0IGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZyb20gQVBJXG4gICAgICovXG4gICAgdXBkYXRlTkFUSGVscFRleHQocG9ydHMpIHtcbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgd2UgaGF2ZSBwb3J0IHZhbHVlcyBmcm9tIHNlcnZlclxuICAgICAgICBpZiAoIXBvcnRzLlNJUF9QT1JUIHx8ICFwb3J0cy5UTFNfUE9SVCB8fCAhcG9ydHMuUlRQX1BPUlRfRlJPTSB8fCAhcG9ydHMuUlRQX1BPUlRfVE8pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBTSVAgcG9ydHMgdGV4dCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkc2lwUG9ydFZhbHVlcyA9ICQoJyNuYXQtaGVscC1zaXAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkc2lwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBUZXh0ID0gaTE4bignbndfTkFUSW5mbzMnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQX1BPUlQsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNpcFBvcnRWYWx1ZXMuaHRtbChzaXBUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBSVFAgcG9ydHMgdGV4dCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkcnRwUG9ydFZhbHVlcyA9ICQoJyNuYXQtaGVscC1ydHAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkcnRwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBydHBUZXh0ID0gaTE4bignbndfTkFUSW5mbzQnLCB7XG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX0ZST00nOiBwb3J0cy5SVFBfUE9SVF9GUk9NLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6IHBvcnRzLlJUUF9QT1JUX1RPXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRydHBQb3J0VmFsdWVzLmh0bWwocnRwVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBvcnQgZmllbGQgbGFiZWxzIHdpdGggYWN0dWFsIGludGVybmFsIHBvcnQgdmFsdWVzIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcG9ydHMgLSBQb3J0IGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZyb20gQVBJXG4gICAgICovXG4gICAgdXBkYXRlUG9ydExhYmVscyhwb3J0cykge1xuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQX1BPUlQgfHwgIXBvcnRzLlRMU19QT1JUKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZXJuYWwgU0lQIHBvcnQgbGFiZWwgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHNpcExhYmVsID0gJCgnI2V4dGVybmFsLXNpcC1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkc2lwTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2lwTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljU0lQUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwTGFiZWwudGV4dChzaXBMYWJlbFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGV4dGVybmFsIFRMUyBwb3J0IGxhYmVsIHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICR0bHNMYWJlbCA9ICQoJyNleHRlcm5hbC10bHMtcG9ydC1sYWJlbCcpO1xuICAgICAgICBpZiAoJHRsc0xhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHRsc0xhYmVsVGV4dCA9IGkxOG4oJ253X1B1YmxpY1RMU1BvcnQnLCB7XG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHRsc0xhYmVsLnRleHQodGxzTGFiZWxUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSAnZGlzYWJsZWQnIGNsYXNzIGZvciBzcGVjaWZpYyBmaWVsZHMgYmFzZWQgb24gdGhlaXIgY2hlY2tib3ggc3RhdGUuXG4gICAgICovXG4gICAgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXRoID0gJChvYmopLmF0dHIoJ2RhdGEtdGFiJyk7XG4gICAgICAgICAgICBpZiAoJChgI2RoY3AtJHtldGh9LWNoZWNrYm94YCkuY2hlY2tib3goJ2lzIHVuY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgJChgI2lwLWFkZHJlc3MtZ3JvdXAtJHtldGh9YCkucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnMScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKGAjaXAtYWRkcmVzcy1ncm91cC0ke2V0aH1gKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKGAjbm90LWRoY3AtJHtldGh9YCkudmFsKCcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ldHdvcmtzLmFkZE5ld0Zvcm1SdWxlcyhldGgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICQoJy5uYXRlZC1zZXR0aW5ncy1ncm91cCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBuZXcgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciBhIHNwZWNpZmljIHJvdyBpbiB0aGUgbmV0d29yayBjb25maWd1cmF0aW9uIGZvcm0uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld1Jvd0lkIC0gVGhlIElEIG9mIHRoZSBuZXcgcm93IHRvIGFkZCB0aGUgZm9ybSBydWxlcyBmb3IuXG4gICAgICovXG4gICAgYWRkTmV3Rm9ybVJ1bGVzKG5ld1Jvd0lkKSB7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICduYW1lJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCBuYW1lQ2xhc3MgPSBgbmFtZV8ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAnbmFtZScgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tuYW1lQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogbmFtZUNsYXNzLFxuICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IHZsYW5DbGFzcyA9IGB2bGFuaWRfJHtuZXdSb3dJZH1gO1xuXG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAndmxhbmlkJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW3ZsYW5DbGFzc10gPSB7XG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IHZsYW5DbGFzcyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclswLi40MDk1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlVmxhblJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBgY2hlY2tWbGFuWyR7bmV3Um93SWR9XWAsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlVmxhbkNyb3NzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IGlwYWRkckNsYXNzID0gYGlwYWRkcl8ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAnaXBhZGRyJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2lwYWRkckNsYXNzXSA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IGlwYWRkckNsYXNzLFxuICAgICAgICAgICAgZGVwZW5kczogYG5vdC1kaGNwLSR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICdkaGNwJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCBkaGNwQ2xhc3MgPSBgZGhjcF8ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAnZGhjcCcgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tkaGNwQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogZGhjcENsYXNzLFxuICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogYGRoY3BPblZsYW5OZXR3b3Jrc1ske25ld1Jvd0lkfV1gLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZURIQ1BPblZsYW5zRG9udFN1cHBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zb2xlLmxvZygnY2JCZWZvcmVTZW5kRm9ybSBjYWxsZWQgd2l0aCBzZXR0aW5nczonLCBzZXR0aW5ncyk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IG9iamVjdCB3aXRoIGFsbCBzZXR0aW5ncyBwcm9wZXJ0aWVzXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHNldHRpbmdzKTtcbiAgICAgICAgcmVzdWx0LmRhdGEgPSB7fTtcblxuICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGZvcm0gdmFsdWVzIHRvIGF2b2lkIGFueSBET00tcmVsYXRlZCBpc3N1ZXNcbiAgICAgICAgLy8gQ29sbGVjdCBhbGwgcmVndWxhciBpbnB1dCBmaWVsZHNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbdHlwZT1cInRleHRcIl0sIGlucHV0W3R5cGU9XCJoaWRkZW5cIl0sIGlucHV0W3R5cGU9XCJudW1iZXJcIl0sIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gJGlucHV0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkaW5wdXQudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBzZWxlY3QgZHJvcGRvd25zXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ3NlbGVjdCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkc2VsZWN0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkc2VsZWN0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkc2VsZWN0LnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGdldCBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbbmFtZV0gPSAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkgPyBTdHJpbmcodmFsdWUpIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW5cbiAgICAgICAgLy8gUGJ4QXBpQ2xpZW50IHdpbGwgaGFuZGxlIGNvbnZlcnNpb24gdG8gc3RyaW5ncyBmb3IgalF1ZXJ5XG4gICAgICAgIHJlc3VsdC5kYXRhLnVzZW5hdCA9ICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIFVzZSBjb3JyZWN0IGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSAoYXV0b1VwZGF0ZUV4dGVybmFsSXAsIG5vdCBBVVRPX1VQREFURV9FWFRFUk5BTF9JUClcbiAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVEaXYgPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBpZiAoJGF1dG9VcGRhdGVEaXYubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSAkYXV0b1VwZGF0ZURpdi5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbnZlcnQgREhDUCBjaGVja2JveGVzIHRvIGJvb2xlYW4gZm9yIGVhY2ggaW50ZXJmYWNlXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJy5kaGNwLWNoZWNrYm94JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5wdXRJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgY29uc3Qgcm93SWQgPSBpbnB1dElkLnJlcGxhY2UoJ2RoY3AtJywgJycpLnJlcGxhY2UoJy1jaGVja2JveCcsICcnKTtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhW2BkaGNwXyR7cm93SWR9YF0gPSAkKG9iaikuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5zdXJlIGludGVybmV0X2ludGVyZmFjZSBpcyBpbmNsdWRlZCAoZnJvbSBkeW5hbWljIGRyb3Bkb3duKVxuICAgICAgICBjb25zdCBpbnRlcm5ldEludGVyZmFjZVZhbHVlID0gJCgnI2ludGVybmV0X2ludGVyZmFjZScpLnZhbCgpO1xuICAgICAgICBpZiAoaW50ZXJuZXRJbnRlcmZhY2VWYWx1ZSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuaW50ZXJuZXRfaW50ZXJmYWNlID0gU3RyaW5nKGludGVybmV0SW50ZXJmYWNlVmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFwIGZvcm0gZmllbGQgbmFtZXMgdG8gQVBJIGZpZWxkIG5hbWVzIGZvciBwb3J0c1xuICAgICAgICBjb25zdCBwb3J0RmllbGRNYXBwaW5nID0ge1xuICAgICAgICAgICAgJ2V4dGVybmFsU0lQUG9ydCc6ICdFWFRFUk5BTF9TSVBfUE9SVCcsXG4gICAgICAgICAgICAnZXh0ZXJuYWxUTFNQb3J0JzogJ0VYVEVSTkFMX1RMU19QT1JUJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFwcGx5IHBvcnQgZmllbGQgbWFwcGluZ1xuICAgICAgICBPYmplY3Qua2V5cyhwb3J0RmllbGRNYXBwaW5nKS5mb3JFYWNoKGZvcm1GaWVsZCA9PiB7XG4gICAgICAgICAgICBjb25zdCBhcGlGaWVsZCA9IHBvcnRGaWVsZE1hcHBpbmdbZm9ybUZpZWxkXTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQuZGF0YVtmb3JtRmllbGRdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVthcGlGaWVsZF0gPSByZXN1bHQuZGF0YVtmb3JtRmllbGRdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtmb3JtRmllbGRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zb2xlLmxvZygnY2JCZWZvcmVTZW5kRm9ybSByZXR1cm5pbmcgcmVzdWx0OicsIHJlc3VsdCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjYkJlZm9yZVNlbmRGb3JtIHJlc3VsdC5kYXRhOicsIHJlc3VsdC5kYXRhKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2NiQWZ0ZXJTZW5kRm9ybSBjYWxsZWQgd2l0aCByZXNwb25zZTonLCByZXNwb25zZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG5ldHdvcmtzLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbmV0d29ya3MuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG5ldHdvcmtzLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gTmV0d29ya0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVDb25maWcnO1xuXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfW5ldHdvcmsvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9tb2RpZnkvYDtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZENvbmZpZ3VyYXRpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdMb2FkaW5nIGNvbmZpZ3VyYXRpb24gZnJvbSBSRVNUIEFQSS4uLicpO1xuICAgICAgICBOZXR3b3JrQVBJLmdldENvbmZpZygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdOZXR3b3JrQVBJLmdldENvbmZpZyByZXNwb25zZTonLCByZXNwb25zZSk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ29uZmlndXJhdGlvbiBkYXRhIHJlY2VpdmVkOicsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgVUkgYWZ0ZXIgbG9hZGluZyBkYXRhXG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIGZvcm0gZWxlbWVudHMgY29ubmVjdGVkIHdpdGggbm9uIGRvY2tlciBpbnN0YWxsYXRpb25zXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuaXNEb2NrZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2lzLWRvY2tlcicsICcxJyk7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRub3RTaG93T25Eb2NrZXJEaXZzLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBsb2FkIGNvbmZpZ3VyYXRpb246JywgcmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgaW50ZXJmYWNlIHRhYnMgYW5kIGZvcm1zIGR5bmFtaWNhbGx5IGZyb20gUkVTVCBBUEkgZGF0YVxuICAgICAqL1xuICAgIGNyZWF0ZUludGVyZmFjZVRhYnMoZGF0YSkge1xuICAgICAgICBjb25zdCAkbWVudSA9ICQoJyNldGgtaW50ZXJmYWNlcy1tZW51Jyk7XG4gICAgICAgIGNvbnN0ICRjb250ZW50ID0gJCgnI2V0aC1pbnRlcmZhY2VzLWNvbnRlbnQnKTtcblxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBjb250ZW50XG4gICAgICAgICRtZW51LmVtcHR5KCk7XG4gICAgICAgICRjb250ZW50LmVtcHR5KCk7XG5cbiAgICAgICAgLy8gRmluZCBpbnRlcmZhY2VzIHRoYXQgY2FuIGJlIGRlbGV0ZWQgKGhhdmUgbXVsdGlwbGUgVkxBTnMpXG4gICAgICAgIGNvbnN0IGRlbGV0YWJsZUludGVyZmFjZXMgPSBbXTtcbiAgICAgICAgY29uc3QgaW50ZXJmYWNlQ291bnQgPSB7fTtcbiAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goaWZhY2UgPT4ge1xuICAgICAgICAgICAgaW50ZXJmYWNlQ291bnRbaWZhY2UuaW50ZXJmYWNlXSA9IChpbnRlcmZhY2VDb3VudFtpZmFjZS5pbnRlcmZhY2VdIHx8IDApICsgMTtcbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5rZXlzKGludGVyZmFjZUNvdW50KS5mb3JFYWNoKGlmYWNlTmFtZSA9PiB7XG4gICAgICAgICAgICBpZiAoaW50ZXJmYWNlQ291bnRbaWZhY2VOYW1lXSA+IDEpIHtcbiAgICAgICAgICAgICAgICBkZWxldGFibGVJbnRlcmZhY2VzLnB1c2goaWZhY2VOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRhYnMgZm9yIGV4aXN0aW5nIGludGVyZmFjZXNcbiAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goKGlmYWNlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGFiSWQgPSBpZmFjZS5pZDtcbiAgICAgICAgICAgIGNvbnN0IHRhYkxhYmVsID0gYCR7aWZhY2UubmFtZSB8fCBpZmFjZS5pbnRlcmZhY2V9ICgke2lmYWNlLmludGVyZmFjZX0ke2lmYWNlLnZsYW5pZCAhPT0gJzAnICYmIGlmYWNlLnZsYW5pZCAhPT0gMCA/IGAuJHtpZmFjZS52bGFuaWR9YCA6ICcnfSlgO1xuICAgICAgICAgICAgY29uc3QgaXNBY3RpdmUgPSBpbmRleCA9PT0gMDtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRhYiBtZW51IGl0ZW1cbiAgICAgICAgICAgICRtZW51LmFwcGVuZChgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJpdGVtICR7aXNBY3RpdmUgPyAnYWN0aXZlJyA6ICcnfVwiIGRhdGEtdGFiPVwiJHt0YWJJZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgJHt0YWJMYWJlbH1cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRhYiBjb250ZW50XG4gICAgICAgICAgICBjb25zdCBjYW5EZWxldGUgPSBkZWxldGFibGVJbnRlcmZhY2VzLmluY2x1ZGVzKGlmYWNlLmludGVyZmFjZSk7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVCdXR0b24gPSBjYW5EZWxldGUgPyBgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJ1aSBpY29uIGxlZnQgbGFiZWxlZCBidXR0b24gZGVsZXRlLWludGVyZmFjZVwiIGRhdGEtdmFsdWU9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2hcIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubndfRGVsZXRlQ3VycmVudEludGVyZmFjZX1cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgIDogJyc7XG5cbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVJbnRlcmZhY2VGb3JtKGlmYWNlLCBpc0FjdGl2ZSwgZGVsZXRlQnV0dG9uKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSB0YWIgZm9yIG5ldyBWTEFOXG4gICAgICAgIGlmIChkYXRhLnRlbXBsYXRlKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRhdGEudGVtcGxhdGU7XG4gICAgICAgICAgICB0ZW1wbGF0ZS5pZCA9IDA7XG5cbiAgICAgICAgICAgIC8vIEFkZCBcIitcIiB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbVwiIGRhdGEtdGFiPVwiMFwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gcGx1c1wiPjwvaT5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRlbXBsYXRlIGZvcm0gd2l0aCBpbnRlcmZhY2Ugc2VsZWN0b3JcbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVUZW1wbGF0ZUZvcm0odGVtcGxhdGUsIGRhdGEuaW50ZXJmYWNlcykpO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBpbnRlcmZhY2Ugc2VsZWN0b3IgZHJvcGRvd24gZm9yIHRlbXBsYXRlXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKGlmYWNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdKSB7XG4gICAgICAgICAgICAgICAgICAgIHBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLmlkLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5pbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpZmFjZS5pbnRlcmZhY2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zID0gT2JqZWN0LnZhbHVlcyhwaHlzaWNhbEludGVyZmFjZXMpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ2ludGVyZmFjZV8wJywgeyBpbnRlcmZhY2VfMDogJycgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZSxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3ducyB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gYHN1Ym5ldF8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHt9O1xuICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IGlmYWNlLnN1Ym5ldCB8fCAnMjQnO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBmb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10gIC8vIEFkZCBzZWFyY2ggY2xhc3MgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgdGVtcGxhdGUgKGlkID0gMClcbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUpIHtcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc3VibmV0XzAnLCB7IHN1Ym5ldF8wOiAnMjQnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddICAvLyBBZGQgc2VhcmNoIGNsYXNzIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLnRhYigpO1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLmZpcnN0KCkudHJpZ2dlcignY2xpY2snKTtcblxuICAgICAgICAvLyBSZS1iaW5kIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgJCgnLmRlbGV0ZS1pbnRlcmZhY2UnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIE5ldHdvcmtBUEkuZGVsZXRlUmVjb3JkKGludGVyZmFjZUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1iaW5kIERIQ1AgY2hlY2tib3ggaGFuZGxlcnNcbiAgICAgICAgJCgnLmRoY3AtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgSVAgYWRkcmVzcyBpbnB1dCBtYXNrc1xuICAgICAgICAkKCcuaXBhZGRyZXNzJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBmb3JtIGZvciBleGlzdGluZyBpbnRlcmZhY2VcbiAgICAgKi9cbiAgICBjcmVhdGVJbnRlcmZhY2VGb3JtKGlmYWNlLCBpc0FjdGl2ZSwgZGVsZXRlQnV0dG9uKSB7XG4gICAgICAgIGNvbnN0IGlkID0gaWZhY2UuaWQ7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnQgJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pbnRlcmZhY2V9XCIgLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UubmFtZSB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBkaGNwLWNoZWNrYm94XCIgaWQ9XCJkaGNwLSR7aWR9LWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgJHtpZmFjZS5kaGNwID8gJ2NoZWNrZWQnIDogJyd9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm5vdGRoY3BfJHtpZH1cIiBpZD1cIm5vdC1kaGNwLSR7aWR9XCIvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUEFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwYWRkciB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19OZXR3b3JrTWFza308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwic3VibmV0XyR7aWR9XCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5zdWJuZXQgfHwgJzI0J31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19WbGFuSUR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbmFtZT1cInZsYW5pZF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS52bGFuaWQgfHwgJzAnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgJHtkZWxldGVCdXR0b259XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIG5ldyBWTEFOIHRlbXBsYXRlXG4gICAgICovXG4gICAgY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBpbnRlcmZhY2VzKSB7XG4gICAgICAgIGNvbnN0IGlkID0gMDtcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudFwiIGRhdGEtdGFiPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgaWQ9XCJpbnRlcmZhY2VfJHtpZH1cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiBpZD1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIlwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGRoY3AtY2hlY2tib3hcIiBpZD1cImRoY3AtJHtpZH0tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImRoY3BfJHtpZH1cIiBjaGVja2VkIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm5vdGRoY3BfJHtpZH1cIiBpZD1cIm5vdC1kaGNwLSR7aWR9XCIvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUEFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19OZXR3b3JrTWFza308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwic3VibmV0XyR7aWR9XCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiMjRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19WbGFuSUR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbmFtZT1cInZsYW5pZF8ke2lkfVwiIHZhbHVlPVwiNDA5NVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzdWJuZXQgbWFzayBvcHRpb25zIGFycmF5IGZvciBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJuZXQgbWFzayBvcHRpb25zXG4gICAgICovXG4gICAgZ2V0U3VibmV0T3B0aW9uc0FycmF5KCkge1xuICAgICAgICAvLyBOZXR3b3JrIG1hc2tzIGZyb20gQ2lkcjo6Z2V0TmV0TWFza3MoKSAoa3Jzb3J0IFNPUlRfTlVNRVJJQylcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHt2YWx1ZTogJzMyJywgdGV4dDogJzMyIC0gMjU1LjI1NS4yNTUuMjU1J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMScsIHRleHQ6ICczMSAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMzAnLCB0ZXh0OiAnMzAgLSAyNTUuMjU1LjI1NS4yNTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI5JywgdGV4dDogJzI5IC0gMjU1LjI1NS4yNTUuMjQ4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyOCcsIHRleHQ6ICcyOCAtIDI1NS4yNTUuMjU1LjI0MCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjcnLCB0ZXh0OiAnMjcgLSAyNTUuMjU1LjI1NS4yMjQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI2JywgdGV4dDogJzI2IC0gMjU1LjI1NS4yNTUuMTkyJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNScsIHRleHQ6ICcyNSAtIDI1NS4yNTUuMjU1LjEyOCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjQnLCB0ZXh0OiAnMjQgLSAyNTUuMjU1LjI1NS4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMycsIHRleHQ6ICcyMyAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjInLCB0ZXh0OiAnMjIgLSAyNTUuMjU1LjI1Mi4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMScsIHRleHQ6ICcyMSAtIDI1NS4yNTUuMjQ4LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIwJywgdGV4dDogJzIwIC0gMjU1LjI1NS4yNDAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTknLCB0ZXh0OiAnMTkgLSAyNTUuMjU1LjIyNC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOCcsIHRleHQ6ICcxOCAtIDI1NS4yNTUuMTkyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE3JywgdGV4dDogJzE3IC0gMjU1LjI1NS4xMjguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTYnLCB0ZXh0OiAnMTYgLSAyNTUuMjU1LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTUnLCB0ZXh0OiAnMTUgLSAyNTUuMjU0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTQnLCB0ZXh0OiAnMTQgLSAyNTUuMjUyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTMnLCB0ZXh0OiAnMTMgLSAyNTUuMjQ4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTInLCB0ZXh0OiAnMTIgLSAyNTUuMjQwLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTEnLCB0ZXh0OiAnMTEgLSAyNTUuMjI0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTAnLCB0ZXh0OiAnMTAgLSAyNTUuMTkyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOScsIHRleHQ6ICc5IC0gMjU1LjEyOC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzgnLCB0ZXh0OiAnOCAtIDI1NS4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNycsIHRleHQ6ICc3IC0gMjU0LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc2JywgdGV4dDogJzYgLSAyNTIuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzUnLCB0ZXh0OiAnNSAtIDI0OC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNCcsIHRleHQ6ICc0IC0gMjQwLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICczJywgdGV4dDogJzMgLSAyMjQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzInLCB0ZXh0OiAnMiAtIDE5Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMScsIHRleHQ6ICcxIC0gMTI4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogJzAgLSAwLjAuMC4wJ30sXG4gICAgICAgIF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBjb25maWd1cmF0aW9uIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICBjb25zb2xlLmxvZygncG9wdWxhdGVGb3JtIGNhbGxlZCB3aXRoIGRhdGE6JywgZGF0YSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGludGVyZmFjZSB0YWJzIGFuZCBmb3JtcyBkeW5hbWljYWxseVxuICAgICAgICBuZXR3b3Jrcy5jcmVhdGVJbnRlcmZhY2VUYWJzKGRhdGEpO1xuXG4gICAgICAgIC8vIEJ1aWxkIGludGVybmV0IGludGVyZmFjZSBkcm9wZG93biBkeW5hbWljYWxseVxuICAgICAgICBjb25zdCBpbnRlcm5ldEludGVyZmFjZU9wdGlvbnMgPSBkYXRhLmludGVyZmFjZXMubWFwKGlmYWNlID0+ICh7XG4gICAgICAgICAgICB2YWx1ZTogaWZhY2UuaWQudG9TdHJpbmcoKSxcbiAgICAgICAgICAgIHRleHQ6IGlmYWNlLm5hbWUgfHwgYCR7aWZhY2UuaW50ZXJmYWNlfSR7aWZhY2UudmxhbmlkICE9PSAnMCcgPyBgLiR7aWZhY2UudmxhbmlkfWAgOiAnJ31gLFxuICAgICAgICAgICAgbmFtZTogaWZhY2UubmFtZSB8fCBgJHtpZmFjZS5pbnRlcmZhY2V9JHtpZmFjZS52bGFuaWQgIT09ICcwJyA/IGAuJHtpZmFjZS52bGFuaWR9YCA6ICcnfWBcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge1xuICAgICAgICAgICAgaW50ZXJuZXRfaW50ZXJmYWNlOiBkYXRhLmludGVybmV0SW50ZXJmYWNlSWQ/LnRvU3RyaW5nKCkgfHwgJydcbiAgICAgICAgfTtcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ2ludGVybmV0X2ludGVyZmFjZScsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBpbnRlcm5ldEludGVyZmFjZU9wdGlvbnMsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVybmV0SW50ZXJmYWNlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBOQVQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEubmF0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZyBOQVQgc2V0dGluZ3M6JywgZGF0YS5uYXQpO1xuICAgICAgICAgICAgLy8gQm9vbGVhbiB2YWx1ZXMgZnJvbSBBUElcbiAgICAgICAgICAgIGlmIChkYXRhLm5hdC51c2VuYXQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ2hlY2tpbmcgdXNlbmF0IGNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVW5jaGVja2luZyB1c2VuYXQgY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCBkYXRhLm5hdC5leHRpcGFkZHIgfHwgJycpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgZGF0YS5uYXQuZXh0aG9zdG5hbWUgfHwgJycpO1xuXG4gICAgICAgICAgICAvLyBhdXRvVXBkYXRlRXh0ZXJuYWxJcCBib29sZWFuIChmaWVsZCBuYW1lIGZyb20gdGhlIGZvcm0pXG4gICAgICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZUNoZWNrYm94ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgIGlmICgkYXV0b1VwZGF0ZUNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5uYXQuQVVUT19VUERBVEVfRVhURVJOQUxfSVAgfHwgZGF0YS5uYXQuYXV0b1VwZGF0ZUV4dGVybmFsSXApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NoZWNraW5nIGF1dG9VcGRhdGVFeHRlcm5hbElwIGNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1VuY2hlY2tpbmcgYXV0b1VwZGF0ZUV4dGVybmFsSXAgY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBwb3J0IHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnBvcnRzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZyBwb3J0IHZhbHVlczonLCBkYXRhLnBvcnRzKTtcblxuICAgICAgICAgICAgLy8gTWFwIEFQSSBmaWVsZCBuYW1lcyB0byBmb3JtIGZpZWxkIG5hbWVzXG4gICAgICAgICAgICBjb25zdCBwb3J0RmllbGRNYXBwaW5nID0ge1xuICAgICAgICAgICAgICAgICdFWFRFUk5BTF9TSVBfUE9SVCc6ICdleHRlcm5hbFNJUFBvcnQnLFxuICAgICAgICAgICAgICAgICdFWFRFUk5BTF9UTFNfUE9SVCc6ICdleHRlcm5hbFRMU1BvcnQnLFxuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6ICdTSVBfUE9SVCcsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogJ1RMU19QT1JUJyxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6ICdSVFBfUE9SVF9GUk9NJyxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfVE8nOiAnUlRQX1BPUlRfVE8nXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnBvcnRzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm9ybUZpZWxkTmFtZSA9IHBvcnRGaWVsZE1hcHBpbmdba2V5XSB8fCBrZXk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkYXRhLnBvcnRzW2tleV07XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFNldHRpbmcgcG9ydCBmaWVsZCAke2Zvcm1GaWVsZE5hbWV9IHRvIHZhbHVlICR7dmFsdWV9YCk7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgZm9ybUZpZWxkTmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgTkFUIGhlbHAgdGV4dCBhbmQgbGFiZWxzIHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVOQVRIZWxwVGV4dChkYXRhLnBvcnRzKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZVBvcnRMYWJlbHMoZGF0YS5wb3J0cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYWRkaXRpb25hbCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5zZXR0aW5ncykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5zZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgZGF0YS5zZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2F2ZSBpbml0aWFsIHZhbHVlcyBmb3IgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3MuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJXaXRoUG9ydE9wdGlvbmFsID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSg6WzAtOV0rKT8kLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIGEgZ2l2ZW4gaW50ZXJmYWNlLlxuICogQHBhcmFtIHtzdHJpbmd9IHZsYW5WYWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgVkxBTiBJRCBpbnB1dCBmaWVsZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBwYXJhbWV0ZXIgZm9yIHRoZSBydWxlLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIHRoZSBpbnRlcmZhY2UsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVmxhbiA9ICh2bGFuVmFsdWUsIHBhcmFtKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgdmxhbnNBcnJheSA9IHt9O1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLmludGVyZmFjZV8wICE9PSB1bmRlZmluZWQgJiYgYWxsVmFsdWVzLmludGVyZmFjZV8wID4gMCkge1xuICAgICAgICBjb25zdCBuZXdFdGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHthbGxWYWx1ZXMuaW50ZXJmYWNlXzB9YF07XG4gICAgICAgIHZsYW5zQXJyYXlbbmV3RXRoTmFtZV0gPSBbYWxsVmFsdWVzLnZsYW5pZF8wXTtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy52bGFuaWRfMCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICQuZWFjaChhbGxWYWx1ZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAnaW50ZXJmYWNlXzAnIHx8IGluZGV4ID09PSAndmxhbmlkXzAnKSByZXR1cm47XG4gICAgICAgIGlmIChpbmRleC5pbmRleE9mKCd2bGFuaWQnKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBldGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHtpbmRleC5zcGxpdCgnXycpWzFdfWBdO1xuICAgICAgICAgICAgaWYgKCQuaW5BcnJheSh2YWx1ZSwgdmxhbnNBcnJheVtldGhOYW1lXSkgPj0gMFxuICAgICAgICAgICAgICAgICYmIHZsYW5WYWx1ZSA9PT0gdmFsdWVcbiAgICAgICAgICAgICAgICAmJiBwYXJhbSA9PT0gaW5kZXguc3BsaXQoJ18nKVsxXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIShldGhOYW1lIGluIHZsYW5zQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgREhDUCBpcyBlbmFibGVkIG9uIFZMQU4gbmV0d29ya3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGlucHV0IGZpZWxkLlxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIHBhcmFtZXRlciBmb3IgdGhlIHJ1bGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBESENQIGlzIG5vdCBlbmFibGVkIG9uIHRoZSBWTEFOIG5ldHdvcmssIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmRoY3BPblZsYW5OZXR3b3JrcyA9ICh2YWx1ZSwgcGFyYW0pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCB2bGFuVmFsdWUgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgdmxhbmlkXyR7cGFyYW19YCk7XG4gICAgY29uc3QgZGhjcFZhbHVlID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGRoY3BfJHtwYXJhbX1gKTtcbiAgICBpZiAodmxhblZhbHVlID4gMCAmJiBkaGNwVmFsdWUgPT09ICdvbicpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdGhlIHByZXNlbmNlIG9mIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uIGlzIHByb3ZpZGVkIHdoZW4gTkFUIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuYWxJcEhvc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMudXNlbmF0ID09PSAnb24nKSB7XG4gICAgICAgIGlmIChhbGxWYWx1ZXMuZXh0aG9zdG5hbWUgPT09ICcnICYmIGFsbFZhbHVlcy5leHRpcGFkZHIgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogIEluaXRpYWxpemUgbmV0d29yayBzZXR0aW5ncyBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBuZXR3b3Jrcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==