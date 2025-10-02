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
    } // Initialize tabs


    $('#eth-interfaces-menu .item').tab();
    $('#eth-interfaces-menu .item').first().trigger('click'); // Initialize subnet dropdowns

    $('select[name^="subnet_"]').dropdown(); // Re-bind delete button handlers

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
    return "\n            <div class=\"ui bottom attached tab segment ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(id, "\">\n                <input type=\"hidden\" name=\"interface_").concat(id, "\" value=\"").concat(iface["interface"], "\" />\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" ").concat(iface.dhcp ? 'checked' : '', " />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                <div class=\"fields\" id=\"ip-address-group-").concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <select name=\"subnet_").concat(id, "\" class=\"ui search selection dropdown\" id=\"subnet-").concat(id, "\">\n                                ").concat(networks.getSubnetOptions(iface.subnet || '24'), "\n                            </select>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"").concat(iface.vlanid || '0', "\" />\n                    </div>\n                </div>\n\n                ").concat(deleteButton, "\n            </div>\n        ");
  },

  /**
   * Create form for new VLAN template
   */
  createTemplateForm: function createTemplateForm(template, interfaces) {
    var id = 0;
    return "\n            <div class=\"ui bottom attached tab segment\" data-tab=\"".concat(id, "\">\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_SelectInterface, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"hidden\" name=\"interface_").concat(id, "\" id=\"interface_").concat(id, "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" id=\"name_").concat(id, "\" value=\"\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" checked />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                <div class=\"fields\" id=\"ip-address-group-").concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"\" />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <select name=\"subnet_").concat(id, "\" class=\"ui search selection dropdown\" id=\"subnet-").concat(id, "\">\n                                ").concat(networks.getSubnetOptions('0'), "\n                            </select>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"4095\" />\n                    </div>\n                </div>\n            </div>\n        ");
  },

  /**
   * Get subnet mask options HTML
   */
  getSubnetOptions: function getSubnetOptions(selectedValue) {
    // Network masks from Cidr::getNetMasks() (krsort SORT_NUMERIC)
    var masks = [{
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
    return masks.map(function (mask) {
      return "<option value=\"".concat(mask.value, "\" ").concat(mask.value === selectedValue ? 'selected' : '', ">").concat(mask.text, "</option>");
    }).join('');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJnYXRld2F5Iiwib3B0aW9uYWwiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCIsInByaW1hcnlkbnMiLCJzZWNvbmRhcnlkbnMiLCJleHRpcGFkZHIiLCJud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHkiLCJleHRob3N0bmFtZSIsImRlcGVuZHMiLCJpbml0aWFsaXplIiwibG9hZENvbmZpZ3VyYXRpb24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwiZHJvcGRvd24iLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZENsYXNzIiwiU3lzaW5mb0FQSSIsImdldEV4dGVybmFsSXBJbmZvIiwiY2JBZnRlckdldEV4dGVybmFsSXAiLCJpbnB1dG1hc2siLCJhbGlhcyIsImluaXRpYWxpemVGb3JtIiwiZm9ybSIsImhpZGUiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwiY3VycmVudEV4dElwQWRkciIsInBvcnRNYXRjaCIsIm1hdGNoIiwicG9ydCIsIm5ld0V4dElwQWRkciIsImlwIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBfUE9SVCIsIlRMU19QT1JUIiwiUlRQX1BPUlRfRlJPTSIsIlJUUF9QT1JUX1RPIiwiJHNpcFBvcnRWYWx1ZXMiLCJsZW5ndGgiLCJzaXBUZXh0IiwiaTE4biIsImh0bWwiLCIkcnRwUG9ydFZhbHVlcyIsInJ0cFRleHQiLCJ1cGRhdGVQb3J0TGFiZWxzIiwiJHNpcExhYmVsIiwic2lwTGFiZWxUZXh0IiwidGV4dCIsIiR0bHNMYWJlbCIsInRsc0xhYmVsVGV4dCIsImVhY2giLCJpbmRleCIsIm9iaiIsImV0aCIsImF0dHIiLCJ2YWwiLCJhZGROZXdGb3JtUnVsZXMiLCJuZXdSb3dJZCIsIm5hbWVDbGFzcyIsImlkZW50aWZpZXIiLCJud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHkiLCJ2bGFuQ2xhc3MiLCJud19WYWxpZGF0ZVZsYW5SYW5nZSIsIm53X1ZhbGlkYXRlVmxhbkNyb3NzIiwiaXBhZGRyQ2xhc3MiLCJud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5IiwiZGhjcENsYXNzIiwibndfVmFsaWRhdGVESENQT25WbGFuc0RvbnRTdXBwb3J0IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY29uc29sZSIsImxvZyIsInJlc3VsdCIsIk9iamVjdCIsImFzc2lnbiIsImRhdGEiLCJmaW5kIiwiJGlucHV0IiwibmFtZSIsInZhbHVlIiwidW5kZWZpbmVkIiwiU3RyaW5nIiwiJHNlbGVjdCIsInVzZW5hdCIsIiRhdXRvVXBkYXRlRGl2IiwicGFyZW50IiwiYXV0b1VwZGF0ZUV4dGVybmFsSXAiLCJpbnB1dElkIiwicm93SWQiLCJyZXBsYWNlIiwiaW50ZXJuZXRJbnRlcmZhY2VWYWx1ZSIsImludGVybmV0X2ludGVyZmFjZSIsInBvcnRGaWVsZE1hcHBpbmciLCJrZXlzIiwiZm9yRWFjaCIsImZvcm1GaWVsZCIsImFwaUZpZWxkIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsImlzRG9ja2VyIiwiZXJyb3IiLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiY3JlYXRlSW50ZXJmYWNlVGFicyIsIiRtZW51IiwiJGNvbnRlbnQiLCJlbXB0eSIsImRlbGV0YWJsZUludGVyZmFjZXMiLCJpbnRlcmZhY2VDb3VudCIsImludGVyZmFjZXMiLCJpZmFjZSIsImlmYWNlTmFtZSIsInB1c2giLCJ0YWJJZCIsImlkIiwidGFiTGFiZWwiLCJ2bGFuaWQiLCJpc0FjdGl2ZSIsImFwcGVuZCIsImNhbkRlbGV0ZSIsImluY2x1ZGVzIiwiZGVsZXRlQnV0dG9uIiwibndfRGVsZXRlQ3VycmVudEludGVyZmFjZSIsImNyZWF0ZUludGVyZmFjZUZvcm0iLCJ0ZW1wbGF0ZSIsImNyZWF0ZVRlbXBsYXRlRm9ybSIsInBoeXNpY2FsSW50ZXJmYWNlcyIsInRvU3RyaW5nIiwicGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zIiwidmFsdWVzIiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJpbnRlcmZhY2VfMCIsInN0YXRpY09wdGlvbnMiLCJwbGFjZWhvbGRlciIsIm53X1NlbGVjdEludGVyZmFjZSIsImFsbG93RW1wdHkiLCJ0YWIiLCJmaXJzdCIsIm9mZiIsIiRidXR0b24iLCJpbnRlcmZhY2VJZCIsImRlbGV0ZVJlY29yZCIsIndpbmRvdyIsImxvY2F0aW9uIiwicmVsb2FkIiwibndfSW50ZXJmYWNlTmFtZSIsImRoY3AiLCJud19Vc2VESENQIiwibndfSVBBZGRyZXNzIiwiaXBhZGRyIiwibndfTmV0d29ya01hc2siLCJnZXRTdWJuZXRPcHRpb25zIiwic3VibmV0IiwibndfVmxhbklEIiwic2VsZWN0ZWRWYWx1ZSIsIm1hc2tzIiwibWFwIiwibWFzayIsImpvaW4iLCJpbnRlcm5ldEludGVyZmFjZU9wdGlvbnMiLCJmb3JtRGF0YSIsImludGVybmV0SW50ZXJmYWNlSWQiLCJud19TZWxlY3RJbnRlcm5ldEludGVyZmFjZSIsIm5hdCIsIiRhdXRvVXBkYXRlQ2hlY2tib3giLCJBVVRPX1VQREFURV9FWFRFUk5BTF9JUCIsImtleSIsImZvcm1GaWVsZE5hbWUiLCJlbmFibGVEaXJyaXR5Iiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJmbiIsImYiLCJpIiwiYSIsImlwYWRkcldpdGhQb3J0T3B0aW9uYWwiLCJjaGVja1ZsYW4iLCJ2bGFuVmFsdWUiLCJwYXJhbSIsImFsbFZhbHVlcyIsIm5ld0V0aE5hbWUiLCJ2bGFuaWRfMCIsImluZGV4T2YiLCJldGhOYW1lIiwic3BsaXQiLCJpbkFycmF5IiwiZGhjcE9uVmxhbk5ldHdvcmtzIiwiZGhjcFZhbHVlIiwiZXh0ZW5hbElwSG9zdCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2JDLEVBQUFBLGNBQWMsRUFBRUMsQ0FBQyxDQUFDLFVBQUQsQ0FESjs7QUFHYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVELENBQUMsQ0FBQyxlQUFELENBUEU7QUFTYkUsRUFBQUEsVUFBVSxFQUFFRixDQUFDLENBQUMseUJBQUQsQ0FUQTtBQVViRyxFQUFBQSxVQUFVLEVBQUVILENBQUMsQ0FBQyxZQUFELENBVkE7QUFXYkksRUFBQUEsZUFBZSxFQUFFSixDQUFDLENBQUMsWUFBRCxDQVhMO0FBWWJLLEVBQUFBLFVBQVUsRUFBRSxFQVpDOztBQWNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG9CQUFvQixFQUFFTixDQUFDLENBQUMsd0JBQUQsQ0FsQlY7O0FBb0JiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSU8sRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLE9BQU8sRUFBRTtBQUNMQyxNQUFBQSxRQUFRLEVBQUUsSUFETDtB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QUNnQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjaEMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBbkJVLEVBb0JWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjaEMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBcEJVLEVBcUJWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjaEMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBckJVLEVBc0JWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjaEMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBdEJVLEVBdUJWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjaEMsTUFBQUEsSUFBSSxFQUFFO0FBQXBCLEtBdkJVLEVBd0JWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBeEJVLEVBeUJWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBekJVLEVBMEJWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBMUJVLEVBMkJWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBM0JVLEVBNEJWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBNUJVLEVBNkJWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBN0JVLEVBOEJWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBOUJVLEVBK0JWO0FBQUNnQyxNQUFBQSxLQUFLLEVBQUUsR0FBUjtBQUFhaEMsTUFBQUEsSUFBSSxFQUFFO0FBQW5CLEtBL0JVLEVBZ0NWO0FBQUNn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QW5DLEVBQXlDO0FBQ3JDL0gsSUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDs7QUFDRCxTQUFPQSxNQUFQO0FBQ0gsQ0FSRDtBQVVBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQTFGLENBQUMsQ0FBQ3lNLEVBQUYsQ0FBS25LLElBQUwsQ0FBVWlELFFBQVYsQ0FBbUI3RSxLQUFuQixDQUF5QmdOLGFBQXpCLEdBQXlDLFlBQU07QUFDM0MsTUFBTVQsU0FBUyxHQUFHbk4sUUFBUSxDQUFDRyxRQUFULENBQWtCcUMsSUFBbEIsQ0FBdUIsWUFBdkIsQ0FBbEI7O0FBQ0EsTUFBSTJLLFNBQVMsQ0FBQzVHLE1BQVYsS0FBcUIsSUFBekIsRUFBK0I7QUFDM0IsUUFBSTRHLFNBQVMsQ0FBQzdMLFdBQVYsS0FBMEIsRUFBMUIsSUFBZ0M2TCxTQUFTLENBQUNoTSxTQUFWLEtBQXdCLEVBQTVELEVBQWdFO0FBQzVELGFBQU8sS0FBUDtBQUNIO0FBQ0o7O0FBQ0QsU0FBTyxJQUFQO0FBQ0gsQ0FSRDtBQVdBO0FBQ0E7QUFDQTs7O0FBQ0FqQixDQUFDLENBQUMyTixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCOU4sRUFBQUEsUUFBUSxDQUFDd0IsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN5c2luZm9BUEksIE5ldHdvcmtBUEksIFVzZXJNZXNzYWdlLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBuZXR3b3JrIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBuZXR3b3Jrc1xuICovXG5jb25zdCBuZXR3b3JrcyA9IHtcbiAgICAkZ2V0TXlJcEJ1dHRvbjogJCgnI2dldG15aXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNuZXR3b3JrLWZvcm0nKSxcblxuICAgICRkcm9wRG93bnM6ICQoJyNuZXR3b3JrLWZvcm0gLmRyb3Bkb3duJyksXG4gICAgJGV4dGlwYWRkcjogJCgnI2V4dGlwYWRkcicpLFxuICAgICRpcGFkZHJlc3NJbnB1dDogJCgnLmlwYWRkcmVzcycpLFxuICAgIHZsYW5zQXJyYXk6IHt9LFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnRzIHdpdGggd2Ugc2hvdWxkIGhpZGUgZnJvbSB0aGUgZm9ybSBmb3IgZG9ja2VyIGluc3RhbGxhdGlvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub3RTaG93T25Eb2NrZXJEaXZzOiAkKCcuZG8tbm90LXNob3ctaWYtZG9ja2VyJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZ2F0ZXdheToge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwcmltYXJ5ZG5zOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY29uZGFyeWRuczoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRpcGFkZHI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHJXaXRoUG9ydE9wdGlvbmFsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0aG9zdG5hbWU6IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICd1c2VuYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG5ldHdvcmsgc2V0dGluZ3MgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBMb2FkIGNvbmZpZ3VyYXRpb24gdmlhIFJFU1QgQVBJXG4gICAgICAgIG5ldHdvcmtzLmxvYWRDb25maWd1cmF0aW9uKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlcyB0aGUgY2hhbmdlIGV2ZW50IG9mIHRoZSAndXNlbmF0LWNoZWNrYm94Jy5cbiAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIG5ldHdvcmtzLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBESENQIGNoZWNrYm94IGhhbmRsZXJzIHdpbGwgYmUgYm91bmQgYWZ0ZXIgdGFicyBhcmUgY3JlYXRlZCBkeW5hbWljYWxseVxuXG4gICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgU3lzaW5mb0FQSS5nZXRFeHRlcm5hbElwSW5mbyhuZXR3b3Jrcy5jYkFmdGVyR2V0RXh0ZXJuYWxJcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciB3aWxsIGJlIGJvdW5kIGFmdGVyIHRhYnMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHlcbiAgICAgICAgbmV0d29ya3MuJGlwYWRkcmVzc0lucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIG5ldHdvcmtzLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSGlkZSBmb3JtIGVsZW1lbnRzIGNvbm5lY3RlZCB3aXRoIG5vbiBkb2NrZXIgaW5zdGFsbGF0aW9uc1xuICAgICAgICBpZiAobmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywnaXMtZG9ja2VyJyk9PT1cIjFcIikge1xuICAgICAgICAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGdldHRpbmcgdGhlIGV4dGVybmFsIElQIGZyb20gYSByZW1vdGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4gSWYgZmFsc2UsIGluZGljYXRlcyBhbiBlcnJvciBvY2N1cnJlZC5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0RXh0ZXJuYWxJcChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dElwQWRkciA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRpcGFkZHInKTtcbiAgICAgICAgICAgIGNvbnN0IHBvcnRNYXRjaCA9IGN1cnJlbnRFeHRJcEFkZHIubWF0Y2goLzooXFxkKykkLyk7XG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gcG9ydE1hdGNoID8gJzonICsgcG9ydE1hdGNoWzFdIDogJyc7XG4gICAgICAgICAgICBjb25zdCBuZXdFeHRJcEFkZHIgPSByZXNwb25zZS5pcCArIHBvcnQ7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgbmV3RXh0SXBBZGRyKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGV4dGVybmFsIGhvc3RuYW1lIHdoZW4gZ2V0dGluZyBleHRlcm5hbCBJUFxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgJycpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBoZWxwIHRleHQgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVOQVRIZWxwVGV4dChwb3J0cykge1xuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQX1BPUlQgfHwgIXBvcnRzLlRMU19QT1JUIHx8ICFwb3J0cy5SVFBfUE9SVF9GUk9NIHx8ICFwb3J0cy5SVFBfUE9SVF9UTykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFNJUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRzaXBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXNpcC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRzaXBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcFRleHQgPSBpMThuKCdud19OQVRJbmZvMycsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBfUE9SVCxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwUG9ydFZhbHVlcy5odG1sKHNpcFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFJUUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRydHBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRydHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJ0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUF9QT1JUX0ZST00sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQX1BPUlRfVE9cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHJ0cFBvcnRWYWx1ZXMuaHRtbChydHBUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcG9ydCBmaWVsZCBsYWJlbHMgd2l0aCBhY3R1YWwgaW50ZXJuYWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVQb3J0TGFiZWxzKHBvcnRzKSB7XG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHdlIGhhdmUgcG9ydCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgaWYgKCFwb3J0cy5TSVBfUE9SVCB8fCAhcG9ydHMuVExTX1BPUlQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBleHRlcm5hbCBTSVAgcG9ydCBsYWJlbCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkc2lwTGFiZWwgPSAkKCcjZXh0ZXJuYWwtc2lwLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRzaXBMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNTSVBQb3J0Jywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUF9QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBMYWJlbC50ZXh0KHNpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZXJuYWwgVExTIHBvcnQgbGFiZWwgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHRsc0xhYmVsID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkdGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkdGxzTGFiZWwudGV4dCh0bHNMYWJlbFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlICdkaXNhYmxlZCcgY2xhc3MgZm9yIHNwZWNpZmljIGZpZWxkcyBiYXNlZCBvbiB0aGVpciBjaGVja2JveCBzdGF0ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldGggPSAkKG9iaikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGlmICgkKGAjZGhjcC0ke2V0aH0tY2hlY2tib3hgKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAkKGAjaXAtYWRkcmVzcy1ncm91cC0ke2V0aH1gKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKGAjbm90LWRoY3AtJHtldGh9YCkudmFsKCcxJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoYCNpcC1hZGRyZXNzLWdyb3VwLSR7ZXRofWApLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuYWRkTmV3Rm9ybVJ1bGVzKGV0aCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbaXBhZGRyQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgbm90LWRoY3AtJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2RoY3AnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IGRoY3BDbGFzcyA9IGBkaGNwXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdkaGNwJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2RoY3BDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBkaGNwQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBgZGhjcE9uVmxhbk5ldHdvcmtzWyR7bmV3Um93SWR9XWAsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlREhDUE9uVmxhbnNEb250U3VwcG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjYkJlZm9yZVNlbmRGb3JtIGNhbGxlZCB3aXRoIHNldHRpbmdzOicsIHNldHRpbmdzKTtcblxuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgb2JqZWN0IHdpdGggYWxsIHNldHRpbmdzIHByb3BlcnRpZXNcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHt9O1xuXG4gICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgZm9ybSB2YWx1ZXMgdG8gYXZvaWQgYW55IERPTS1yZWxhdGVkIGlzc3Vlc1xuICAgICAgICAvLyBDb2xsZWN0IGFsbCByZWd1bGFyIGlucHV0IGZpZWxkc1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFt0eXBlPVwidGV4dFwiXSwgaW5wdXRbdHlwZT1cImhpZGRlblwiXSwgaW5wdXRbdHlwZT1cIm51bWJlclwiXSwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRpbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IHNlbGVjdCBkcm9wZG93bnNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnc2VsZWN0JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWxlY3QgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRzZWxlY3QuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRzZWxlY3QudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhblxuICAgICAgICAvLyBQYnhBcGlDbGllbnQgd2lsbCBoYW5kbGUgY29udmVyc2lvbiB0byBzdHJpbmdzIGZvciBqUXVlcnlcbiAgICAgICAgcmVzdWx0LmRhdGEudXNlbmF0ID0gJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgLy8gVXNlIGNvcnJlY3QgZmllbGQgbmFtZSBmcm9tIHRoZSBmb3JtIChhdXRvVXBkYXRlRXh0ZXJuYWxJcCwgbm90IEFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQKVxuICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZURpdiA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgIGlmICgkYXV0b1VwZGF0ZURpdi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9ICRhdXRvVXBkYXRlRGl2LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29udmVydCBESENQIGNoZWNrYm94ZXMgdG8gYm9vbGVhbiBmb3IgZWFjaCBpbnRlcmZhY2VcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnLmRoY3AtY2hlY2tib3gnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbnB1dElkID0gJChvYmopLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBjb25zdCByb3dJZCA9IGlucHV0SWQucmVwbGFjZSgnZGhjcC0nLCAnJykucmVwbGFjZSgnLWNoZWNrYm94JywgJycpO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtyb3dJZH1gXSA9ICQob2JqKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbnN1cmUgaW50ZXJuZXRfaW50ZXJmYWNlIGlzIGluY2x1ZGVkIChmcm9tIGR5bmFtaWMgZHJvcGRvd24pXG4gICAgICAgIGNvbnN0IGludGVybmV0SW50ZXJmYWNlVmFsdWUgPSAkKCcjaW50ZXJuZXRfaW50ZXJmYWNlJykudmFsKCk7XG4gICAgICAgIGlmIChpbnRlcm5ldEludGVyZmFjZVZhbHVlKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pbnRlcm5ldF9pbnRlcmZhY2UgPSBTdHJpbmcoaW50ZXJuZXRJbnRlcmZhY2VWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXAgZm9ybSBmaWVsZCBuYW1lcyB0byBBUEkgZmllbGQgbmFtZXMgZm9yIHBvcnRzXG4gICAgICAgIGNvbnN0IHBvcnRGaWVsZE1hcHBpbmcgPSB7XG4gICAgICAgICAgICAnZXh0ZXJuYWxTSVBQb3J0JzogJ0VYVEVSTkFMX1NJUF9QT1JUJyxcbiAgICAgICAgICAgICdleHRlcm5hbFRMU1BvcnQnOiAnRVhURVJOQUxfVExTX1BPUlQnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXBwbHkgcG9ydCBmaWVsZCBtYXBwaW5nXG4gICAgICAgIE9iamVjdC5rZXlzKHBvcnRGaWVsZE1hcHBpbmcpLmZvckVhY2goZm9ybUZpZWxkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFwaUZpZWxkID0gcG9ydEZpZWxkTWFwcGluZ1tmb3JtRmllbGRdO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2FwaUZpZWxkXSA9IHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdjYkJlZm9yZVNlbmRGb3JtIHJldHVybmluZyByZXN1bHQ6JywgcmVzdWx0KTtcbiAgICAgICAgY29uc29sZS5sb2coJ2NiQmVmb3JlU2VuZEZvcm0gcmVzdWx0LmRhdGE6JywgcmVzdWx0LmRhdGEpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnY2JBZnRlclNlbmRGb3JtIGNhbGxlZCB3aXRoIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbmV0d29ya3MuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbmV0d29ya3MuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBOZXR3b3JrQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZUNvbmZpZyc7XG5cbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL21vZGlmeS9gO1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG5ldHdvcmsgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQ29uZmlndXJhdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0xvYWRpbmcgY29uZmlndXJhdGlvbiBmcm9tIFJFU1QgQVBJLi4uJyk7XG4gICAgICAgIE5ldHdvcmtBUEkuZ2V0Q29uZmlnKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05ldHdvcmtBUEkuZ2V0Q29uZmlnIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb25maWd1cmF0aW9uIGRhdGEgcmVjZWl2ZWQ6JywgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBhZnRlciBsb2FkaW5nIGRhdGFcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZm9ybSBlbGVtZW50cyBjb25uZWN0ZWQgd2l0aCBub24gZG9ja2VyIGluc3RhbGxhdGlvbnNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5pc0RvY2tlcikge1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaXMtZG9ja2VyJywgJzEnKTtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgY29uZmlndXJhdGlvbjonLCByZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBpbnRlcmZhY2UgdGFicyBhbmQgZm9ybXMgZHluYW1pY2FsbHkgZnJvbSBSRVNUIEFQSSBkYXRhXG4gICAgICovXG4gICAgY3JlYXRlSW50ZXJmYWNlVGFicyhkYXRhKSB7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUnKTtcbiAgICAgICAgY29uc3QgJGNvbnRlbnQgPSAkKCcjZXRoLWludGVyZmFjZXMtY29udGVudCcpO1xuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnRcbiAgICAgICAgJG1lbnUuZW1wdHkoKTtcbiAgICAgICAgJGNvbnRlbnQuZW1wdHkoKTtcblxuICAgICAgICAvLyBGaW5kIGludGVyZmFjZXMgdGhhdCBjYW4gYmUgZGVsZXRlZCAoaGF2ZSBtdWx0aXBsZSBWTEFOcylcbiAgICAgICAgY29uc3QgZGVsZXRhYmxlSW50ZXJmYWNlcyA9IFtdO1xuICAgICAgICBjb25zdCBpbnRlcmZhY2VDb3VudCA9IHt9O1xuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaChpZmFjZSA9PiB7XG4gICAgICAgICAgICBpbnRlcmZhY2VDb3VudFtpZmFjZS5pbnRlcmZhY2VdID0gKGludGVyZmFjZUNvdW50W2lmYWNlLmludGVyZmFjZV0gfHwgMCkgKyAxO1xuICAgICAgICB9KTtcbiAgICAgICAgT2JqZWN0LmtleXMoaW50ZXJmYWNlQ291bnQpLmZvckVhY2goaWZhY2VOYW1lID0+IHtcbiAgICAgICAgICAgIGlmIChpbnRlcmZhY2VDb3VudFtpZmFjZU5hbWVdID4gMSkge1xuICAgICAgICAgICAgICAgIGRlbGV0YWJsZUludGVyZmFjZXMucHVzaChpZmFjZU5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgdGFicyBmb3IgZXhpc3RpbmcgaW50ZXJmYWNlc1xuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaCgoaWZhY2UsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YWJJZCA9IGlmYWNlLmlkO1xuICAgICAgICAgICAgY29uc3QgdGFiTGFiZWwgPSBgJHtpZmFjZS5uYW1lIHx8IGlmYWNlLmludGVyZmFjZX0gKCR7aWZhY2UuaW50ZXJmYWNlfSR7aWZhY2UudmxhbmlkICE9PSAnMCcgJiYgaWZhY2UudmxhbmlkICE9PSAwID8gYC4ke2lmYWNlLnZsYW5pZH1gIDogJyd9KWA7XG4gICAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IGluZGV4ID09PSAwO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW0gJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICAke3RhYkxhYmVsfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0IGNhbkRlbGV0ZSA9IGRlbGV0YWJsZUludGVyZmFjZXMuaW5jbHVkZXMoaWZhY2UuaW50ZXJmYWNlKTtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ1dHRvbiA9IGNhbkRlbGV0ZSA/IGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cInVpIGljb24gbGVmdCBsYWJlbGVkIGJ1dHRvbiBkZWxldGUtaW50ZXJmYWNlXCIgZGF0YS12YWx1ZT1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaFwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19EZWxldGVDdXJyZW50SW50ZXJmYWNlfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGAgOiAnJztcblxuICAgICAgICAgICAgJGNvbnRlbnQuYXBwZW5kKG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRlbXBsYXRlIHRhYiBmb3IgbmV3IFZMQU5cbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZGF0YS50ZW1wbGF0ZTtcbiAgICAgICAgICAgIHRlbXBsYXRlLmlkID0gMDtcblxuICAgICAgICAgICAgLy8gQWRkIFwiK1wiIHRhYiBtZW51IGl0ZW1cbiAgICAgICAgICAgICRtZW51LmFwcGVuZChgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJpdGVtXCIgZGF0YS10YWI9XCIwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBwbHVzXCI+PC9pPlxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGVtcGxhdGUgZm9ybSB3aXRoIGludGVyZmFjZSBzZWxlY3RvclxuICAgICAgICAgICAgJGNvbnRlbnQuYXBwZW5kKG5ldHdvcmtzLmNyZWF0ZVRlbXBsYXRlRm9ybSh0ZW1wbGF0ZSwgZGF0YS5pbnRlcmZhY2VzKSk7XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIGludGVyZmFjZSBzZWxlY3RvciBkcm9wZG93biBmb3IgdGVtcGxhdGVcbiAgICAgICAgICAgIGNvbnN0IHBoeXNpY2FsSW50ZXJmYWNlcyA9IHt9O1xuICAgICAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goaWZhY2UgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcGh5c2ljYWxJbnRlcmZhY2VzW2lmYWNlLmludGVyZmFjZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgcGh5c2ljYWxJbnRlcmZhY2VzW2lmYWNlLmludGVyZmFjZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaWZhY2UuaWQudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGlmYWNlLmludGVyZmFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGlmYWNlLmludGVyZmFjZVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMgPSBPYmplY3QudmFsdWVzKHBoeXNpY2FsSW50ZXJmYWNlcyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignaW50ZXJmYWNlXzAnLCB7IGludGVyZmFjZV8wOiAnJyB9LCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykuZmlyc3QoKS50cmlnZ2VyKCdjbGljaycpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duc1xuICAgICAgICAkKCdzZWxlY3RbbmFtZV49XCJzdWJuZXRfXCJdJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBSZS1iaW5kIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgJCgnLmRlbGV0ZS1pbnRlcmZhY2UnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIE5ldHdvcmtBUEkuZGVsZXRlUmVjb3JkKGludGVyZmFjZUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1iaW5kIERIQ1AgY2hlY2tib3ggaGFuZGxlcnNcbiAgICAgICAgJCgnLmRoY3AtY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgSVAgYWRkcmVzcyBpbnB1dCBtYXNrc1xuICAgICAgICAkKCcuaXBhZGRyZXNzJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBmb3JtIGZvciBleGlzdGluZyBpbnRlcmZhY2VcbiAgICAgKi9cbiAgICBjcmVhdGVJbnRlcmZhY2VGb3JtKGlmYWNlLCBpc0FjdGl2ZSwgZGVsZXRlQnV0dG9uKSB7XG4gICAgICAgIGNvbnN0IGlkID0gaWZhY2UuaWQ7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnQgJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pbnRlcmZhY2V9XCIgLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UubmFtZSB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBkaGNwLWNoZWNrYm94XCIgaWQ9XCJkaGNwLSR7aWR9LWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgJHtpZmFjZS5kaGNwID8gJ2NoZWNrZWQnIDogJyd9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm5vdGRoY3BfJHtpZH1cIiBpZD1cIm5vdC1kaGNwLSR7aWR9XCIvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUEFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwYWRkciB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19OZXR3b3JrTWFza308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c2VsZWN0IG5hbWU9XCJzdWJuZXRfJHtpZH1cIiBjbGFzcz1cInVpIHNlYXJjaCBzZWxlY3Rpb24gZHJvcGRvd25cIiBpZD1cInN1Ym5ldC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke25ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnMoaWZhY2Uuc3VibmV0IHx8ICcyNCcpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19WbGFuSUR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbmFtZT1cInZsYW5pZF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS52bGFuaWQgfHwgJzAnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgJHtkZWxldGVCdXR0b259XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIG5ldyBWTEFOIHRlbXBsYXRlXG4gICAgICovXG4gICAgY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBpbnRlcmZhY2VzKSB7XG4gICAgICAgIGNvbnN0IGlkID0gMDtcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudFwiIGRhdGEtdGFiPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgaWQ9XCJpbnRlcmZhY2VfJHtpZH1cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiBpZD1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIlwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGRoY3AtY2hlY2tib3hcIiBpZD1cImRoY3AtJHtpZH0tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImRoY3BfJHtpZH1cIiBjaGVja2VkIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm5vdGRoY3BfJHtpZH1cIiBpZD1cIm5vdC1kaGNwLSR7aWR9XCIvPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUEFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19OZXR3b3JrTWFza308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c2VsZWN0IG5hbWU9XCJzdWJuZXRfJHtpZH1cIiBjbGFzcz1cInVpIHNlYXJjaCBzZWxlY3Rpb24gZHJvcGRvd25cIiBpZD1cInN1Ym5ldC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke25ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnMoJzAnKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVmxhbklEfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIG5hbWU9XCJ2bGFuaWRfJHtpZH1cIiB2YWx1ZT1cIjQwOTVcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3VibmV0IG1hc2sgb3B0aW9ucyBIVE1MXG4gICAgICovXG4gICAgZ2V0U3VibmV0T3B0aW9ucyhzZWxlY3RlZFZhbHVlKSB7XG4gICAgICAgIC8vIE5ldHdvcmsgbWFza3MgZnJvbSBDaWRyOjpnZXROZXRNYXNrcygpIChrcnNvcnQgU09SVF9OVU1FUklDKVxuICAgICAgICBjb25zdCBtYXNrcyA9IFtcbiAgICAgICAgICAgIHt2YWx1ZTogJzMyJywgdGV4dDogJzMyIC0gMjU1LjI1NS4yNTUuMjU1J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMScsIHRleHQ6ICczMSAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMzAnLCB0ZXh0OiAnMzAgLSAyNTUuMjU1LjI1NS4yNTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI5JywgdGV4dDogJzI5IC0gMjU1LjI1NS4yNTUuMjQ4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyOCcsIHRleHQ6ICcyOCAtIDI1NS4yNTUuMjU1LjI0MCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjcnLCB0ZXh0OiAnMjcgLSAyNTUuMjU1LjI1NS4yMjQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI2JywgdGV4dDogJzI2IC0gMjU1LjI1NS4yNTUuMTkyJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNScsIHRleHQ6ICcyNSAtIDI1NS4yNTUuMjU1LjEyOCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjQnLCB0ZXh0OiAnMjQgLSAyNTUuMjU1LjI1NS4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMycsIHRleHQ6ICcyMyAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjInLCB0ZXh0OiAnMjIgLSAyNTUuMjU1LjI1Mi4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMScsIHRleHQ6ICcyMSAtIDI1NS4yNTUuMjQ4LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIwJywgdGV4dDogJzIwIC0gMjU1LjI1NS4yNDAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTknLCB0ZXh0OiAnMTkgLSAyNTUuMjU1LjIyNC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOCcsIHRleHQ6ICcxOCAtIDI1NS4yNTUuMTkyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE3JywgdGV4dDogJzE3IC0gMjU1LjI1NS4xMjguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTYnLCB0ZXh0OiAnMTYgLSAyNTUuMjU1LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTUnLCB0ZXh0OiAnMTUgLSAyNTUuMjU0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTQnLCB0ZXh0OiAnMTQgLSAyNTUuMjUyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTMnLCB0ZXh0OiAnMTMgLSAyNTUuMjQ4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTInLCB0ZXh0OiAnMTIgLSAyNTUuMjQwLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTEnLCB0ZXh0OiAnMTEgLSAyNTUuMjI0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTAnLCB0ZXh0OiAnMTAgLSAyNTUuMTkyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOScsIHRleHQ6ICc5IC0gMjU1LjEyOC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzgnLCB0ZXh0OiAnOCAtIDI1NS4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNycsIHRleHQ6ICc3IC0gMjU0LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc2JywgdGV4dDogJzYgLSAyNTIuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzUnLCB0ZXh0OiAnNSAtIDI0OC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNCcsIHRleHQ6ICc0IC0gMjQwLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICczJywgdGV4dDogJzMgLSAyMjQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzInLCB0ZXh0OiAnMiAtIDE5Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMScsIHRleHQ6ICcxIC0gMTI4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogJzAgLSAwLjAuMC4wJ30sXG4gICAgICAgIF07XG5cbiAgICAgICAgcmV0dXJuIG1hc2tzLm1hcChtYXNrID0+XG4gICAgICAgICAgICBgPG9wdGlvbiB2YWx1ZT1cIiR7bWFzay52YWx1ZX1cIiAke21hc2sudmFsdWUgPT09IHNlbGVjdGVkVmFsdWUgPyAnc2VsZWN0ZWQnIDogJyd9PiR7bWFzay50ZXh0fTwvb3B0aW9uPmBcbiAgICAgICAgKS5qb2luKCcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGNvbmZpZ3VyYXRpb24gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwb3B1bGF0ZUZvcm0gY2FsbGVkIHdpdGggZGF0YTonLCBkYXRhKTtcblxuICAgICAgICAvLyBDcmVhdGUgaW50ZXJmYWNlIHRhYnMgYW5kIGZvcm1zIGR5bmFtaWNhbGx5XG4gICAgICAgIG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZVRhYnMoZGF0YSk7XG5cbiAgICAgICAgLy8gQnVpbGQgaW50ZXJuZXQgaW50ZXJmYWNlIGRyb3Bkb3duIGR5bmFtaWNhbGx5XG4gICAgICAgIGNvbnN0IGludGVybmV0SW50ZXJmYWNlT3B0aW9ucyA9IGRhdGEuaW50ZXJmYWNlcy5tYXAoaWZhY2UgPT4gKHtcbiAgICAgICAgICAgIHZhbHVlOiBpZmFjZS5pZC50b1N0cmluZygpLFxuICAgICAgICAgICAgdGV4dDogaWZhY2UubmFtZSB8fCBgJHtpZmFjZS5pbnRlcmZhY2V9JHtpZmFjZS52bGFuaWQgIT09ICcwJyA/IGAuJHtpZmFjZS52bGFuaWR9YCA6ICcnfWAsXG4gICAgICAgICAgICBuYW1lOiBpZmFjZS5uYW1lIHx8IGAke2lmYWNlLmludGVyZmFjZX0ke2lmYWNlLnZsYW5pZCAhPT0gJzAnID8gYC4ke2lmYWNlLnZsYW5pZH1gIDogJyd9YFxuICAgICAgICB9KSk7XG5cbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7XG4gICAgICAgICAgICBpbnRlcm5ldF9pbnRlcmZhY2U6IGRhdGEuaW50ZXJuZXRJbnRlcmZhY2VJZD8udG9TdHJpbmcoKSB8fCAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignaW50ZXJuZXRfaW50ZXJmYWNlJywgZm9ybURhdGEsIHtcbiAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IGludGVybmV0SW50ZXJmYWNlT3B0aW9ucyxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJuZXRJbnRlcmZhY2VcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IE5BVCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5uYXQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZXR0aW5nIE5BVCBzZXR0aW5nczonLCBkYXRhLm5hdCk7XG4gICAgICAgICAgICAvLyBCb29sZWFuIHZhbHVlcyBmcm9tIEFQSVxuICAgICAgICAgICAgaWYgKGRhdGEubmF0LnVzZW5hdCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDaGVja2luZyB1c2VuYXQgY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVbmNoZWNraW5nIHVzZW5hdCBjaGVja2JveCcpO1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIGRhdGEubmF0LmV4dGlwYWRkciB8fCAnJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCBkYXRhLm5hdC5leHRob3N0bmFtZSB8fCAnJyk7XG5cbiAgICAgICAgICAgIC8vIGF1dG9VcGRhdGVFeHRlcm5hbElwIGJvb2xlYW4gKGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSlcbiAgICAgICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlQ2hlY2tib3ggPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRhdXRvVXBkYXRlQ2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLm5hdC5BVVRPX1VQREFURV9FWFRFUk5BTF9JUCB8fCBkYXRhLm5hdC5hdXRvVXBkYXRlRXh0ZXJuYWxJcCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ2hlY2tpbmcgYXV0b1VwZGF0ZUV4dGVybmFsSXAgY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVW5jaGVja2luZyBhdXRvVXBkYXRlRXh0ZXJuYWxJcCBjaGVja2JveCcpO1xuICAgICAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHBvcnQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEucG9ydHMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZXR0aW5nIHBvcnQgdmFsdWVzOicsIGRhdGEucG9ydHMpO1xuXG4gICAgICAgICAgICAvLyBNYXAgQVBJIGZpZWxkIG5hbWVzIHRvIGZvcm0gZmllbGQgbmFtZXNcbiAgICAgICAgICAgIGNvbnN0IHBvcnRGaWVsZE1hcHBpbmcgPSB7XG4gICAgICAgICAgICAgICAgJ0VYVEVSTkFMX1NJUF9QT1JUJzogJ2V4dGVybmFsU0lQUG9ydCcsXG4gICAgICAgICAgICAgICAgJ0VYVEVSTkFMX1RMU19QT1JUJzogJ2V4dGVybmFsVExTUG9ydCcsXG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogJ1NJUF9QT1JUJyxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiAnVExTX1BPUlQnLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogJ1JUUF9QT1JUX0ZST00nLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6ICdSVFBfUE9SVF9UTydcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucG9ydHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBmb3JtRmllbGROYW1lID0gcG9ydEZpZWxkTWFwcGluZ1trZXldIHx8IGtleTtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGEucG9ydHNba2V5XTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU2V0dGluZyBwb3J0IGZpZWxkICR7Zm9ybUZpZWxkTmFtZX0gdG8gdmFsdWUgJHt2YWx1ZX1gKTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBmb3JtRmllbGROYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBOQVQgaGVscCB0ZXh0IGFuZCBsYWJlbHMgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXNcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZU5BVEhlbHBUZXh0KGRhdGEucG9ydHMpO1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlUG9ydExhYmVscyhkYXRhLnBvcnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBhZGRpdGlvbmFsIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnNldHRpbmdzKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnNldHRpbmdzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywga2V5LCBkYXRhLnNldHRpbmdzW2tleV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIGluaXRpYWwgdmFsdWVzIGZvciBkaXJ0eSBjaGVja2luZ1xuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkcldpdGhQb3J0T3B0aW9uYWwgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pKDpbMC05XSspPyQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgYSBnaXZlbiBpbnRlcmZhY2UuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmxhblZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBWTEFOIElEIGlucHV0IGZpZWxkLlxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIHBhcmFtZXRlciBmb3IgdGhlIHJ1bGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBWTEFOIElEIGlzIHVuaXF1ZSBmb3IgdGhlIGludGVyZmFjZSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tWbGFuID0gKHZsYW5WYWx1ZSwgcGFyYW0pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCB2bGFuc0FycmF5ID0ge307XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgIT09IHVuZGVmaW5lZCAmJiBhbGxWYWx1ZXMuaW50ZXJmYWNlXzAgPiAwKSB7XG4gICAgICAgIGNvbnN0IG5ld0V0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2FsbFZhbHVlcy5pbnRlcmZhY2VfMH1gXTtcbiAgICAgICAgdmxhbnNBcnJheVtuZXdFdGhOYW1lXSA9IFthbGxWYWx1ZXMudmxhbmlkXzBdO1xuICAgICAgICBpZiAoYWxsVmFsdWVzLnZsYW5pZF8wID09PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgJC5lYWNoKGFsbFZhbHVlcywgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICBpZiAoaW5kZXggPT09ICdpbnRlcmZhY2VfMCcgfHwgaW5kZXggPT09ICd2bGFuaWRfMCcpIHJldHVybjtcbiAgICAgICAgaWYgKGluZGV4LmluZGV4T2YoJ3ZsYW5pZCcpID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGV0aE5hbWUgPSBhbGxWYWx1ZXNbYGludGVyZmFjZV8ke2luZGV4LnNwbGl0KCdfJylbMV19YF07XG4gICAgICAgICAgICBpZiAoJC5pbkFycmF5KHZhbHVlLCB2bGFuc0FycmF5W2V0aE5hbWVdKSA+PSAwXG4gICAgICAgICAgICAgICAgJiYgdmxhblZhbHVlID09PSB2YWx1ZVxuICAgICAgICAgICAgICAgICYmIHBhcmFtID09PSBpbmRleC5zcGxpdCgnXycpWzFdKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghKGV0aE5hbWUgaW4gdmxhbnNBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2bGFuc0FycmF5W2V0aE5hbWVdLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiBESENQIGlzIGVuYWJsZWQgb24gVkxBTiBuZXR3b3Jrcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgaW5wdXQgZmllbGQuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgcGFyYW1ldGVyIGZvciB0aGUgcnVsZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIERIQ1AgaXMgbm90IGVuYWJsZWQgb24gdGhlIFZMQU4gbmV0d29yaywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZGhjcE9uVmxhbk5ldHdvcmtzID0gKHZhbHVlLCBwYXJhbSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IHZsYW5WYWx1ZSA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsIGB2bGFuaWRfJHtwYXJhbX1gKTtcbiAgICBjb25zdCBkaGNwVmFsdWUgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgZGhjcF8ke3BhcmFtfWApO1xuICAgIGlmICh2bGFuVmFsdWUgPiAwICYmIGRoY3BWYWx1ZSA9PT0gJ29uJykge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyB0aGUgcHJlc2VuY2Ugb2YgZXh0ZXJuYWwgSVAgaG9zdCBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24gaXMgcHJvdmlkZWQgd2hlbiBOQVQgaXMgZW5hYmxlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5hbElwSG9zdCA9ICgpID0+IHtcbiAgICBjb25zdCBhbGxWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgaWYgKGFsbFZhbHVlcy51c2VuYXQgPT09ICdvbicpIHtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy5leHRob3N0bmFtZSA9PT0gJycgJiYgYWxsVmFsdWVzLmV4dGlwYWRkciA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG5ldHdvcmtzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19