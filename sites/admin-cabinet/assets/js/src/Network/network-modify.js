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
const networks = {
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
            rules: [
                {
                    type: 'ipaddr',
                    prompt: globalTranslate.nw_ValidateIppaddrNotRight,
                },
            ],
        },
        primarydns: {
            optional: true,
            rules: [
                {
                    type: 'ipaddr',
                    prompt: globalTranslate.nw_ValidateIppaddrNotRight,
                },
            ],
        },
        secondarydns: {
            optional: true,
            rules: [
                {
                    type: 'ipaddr',
                    prompt: globalTranslate.nw_ValidateIppaddrNotRight,
                },
            ],
        },
        extipaddr: {
            optional: true,
            rules: [
                {
                    type: 'ipaddrWithPortOptional',
                    prompt: globalTranslate.nw_ValidateExtIppaddrNotRight,
                },
                {
                    type: 'extenalIpHost',
                    prompt: globalTranslate.nw_ValidateExtIppaddrOrHostIsEmpty,
                },
            ],
        },
        exthostname: {
            depends: 'usenat',
            rules: [
                {
                    type: 'extenalIpHost',
                    prompt: globalTranslate.nw_ValidateExtIppaddrOrHostIsEmpty,
                },
            ],
        },
    },

    /**
     * Initializes the network settings form.
     */
    initialize() {
        // Load configuration via REST API
        networks.loadConfiguration();

        // Handles the change event of the 'usenat-checkbox'.
        $('#usenat-checkbox').checkbox({
            onChange() {
                networks.toggleDisabledFieldClass();
            },
        });
        networks.$dropDowns.dropdown();

        // DHCP checkbox handlers will be bound after tabs are created dynamically

        networks.$getMyIpButton.on('click', (e) => {
            e.preventDefault();
            networks.$getMyIpButton.addClass('loading disabled');
            SysinfoAPI.getExternalIpInfo(networks.cbAfterGetExternalIp);
        });

        // Delete button handler will be bound after tabs are created dynamically
        networks.$ipaddressInput.inputmask({alias: 'ip', 'placeholder': '_'});

        networks.initializeForm();

        // Hide form elements connected with non docker installations
        if (networks.$formObj.form('get value','is-docker')==="1") {
            networks.$notShowOnDockerDivs.hide();
        }
    },

    /**
     * Callback function executed after getting the external IP from a remote server.
     * @param {boolean|Object} response - The response received from the server. If false, indicates an error occurred.
     */
    cbAfterGetExternalIp(response) {
        if (response === false) {
            networks.$getMyIpButton.removeClass('loading disabled');
        } else {
            const currentExtIpAddr = networks.$formObj.form('get value', 'extipaddr');
            const portMatch = currentExtIpAddr.match(/:(\d+)$/);
            const port = portMatch ? ':' + portMatch[1] : '';
            const newExtIpAddr = response.ip + port;
            networks.$formObj.form('set value', 'extipaddr', newExtIpAddr);
            // Clear external hostname when getting external IP
            networks.$formObj.form('set value', 'exthostname', '');
            networks.$extipaddr.trigger('change');
            networks.$getMyIpButton.removeClass('loading disabled');
        }
    },

    /**
     * Update NAT help text with actual port values from REST API
     * @param {object} ports - Port configuration object from API
     */
    updateNATHelpText(ports) {
        // Only update if we have port values from server
        if (!ports.SIP_PORT || !ports.TLS_PORT || !ports.RTP_PORT_FROM || !ports.RTP_PORT_TO) {
            return;
        }

        // Update SIP ports text using ID
        const $sipPortValues = $('#nat-help-sip-ports .port-values');
        if ($sipPortValues.length > 0) {
            const sipText = i18n('nw_NATInfo3', {
                'SIP_PORT': ports.SIP_PORT,
                'TLS_PORT': ports.TLS_PORT
            });
            $sipPortValues.html(sipText);
        }

        // Update RTP ports text using ID
        const $rtpPortValues = $('#nat-help-rtp-ports .port-values');
        if ($rtpPortValues.length > 0) {
            const rtpText = i18n('nw_NATInfo4', {
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
    updatePortLabels(ports) {
        // Only update if we have port values from server
        if (!ports.SIP_PORT || !ports.TLS_PORT) {
            return;
        }

        // Update external SIP port label using ID
        const $sipLabel = $('#external-sip-port-label');
        if ($sipLabel.length > 0) {
            const sipLabelText = i18n('nw_PublicSIPPort', {
                'SIP_PORT': ports.SIP_PORT
            });
            $sipLabel.text(sipLabelText);
        }

        // Update external TLS port label using ID
        const $tlsLabel = $('#external-tls-port-label');
        if ($tlsLabel.length > 0) {
            const tlsLabelText = i18n('nw_PublicTLSPort', {
                'TLS_PORT': ports.TLS_PORT
            });
            $tlsLabel.text(tlsLabelText);
        }
    },

    /**
     * Toggles the 'disabled' class for specific fields based on their checkbox state.
     */
    toggleDisabledFieldClass() {
        $('#eth-interfaces-menu a').each((index, obj) => {
            const eth = $(obj).attr('data-tab');
            if ($(`#dhcp-${eth}-checkbox`).checkbox('is unchecked')) {
                $(`#ip-address-group-${eth}`).removeClass('disabled');
                $(`#not-dhcp-${eth}`).val('1');
            } else {
                $(`#ip-address-group-${eth}`).addClass('disabled');
                $(`#not-dhcp-${eth}`).val('');
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
    addNewFormRules(newRowId) {

        // Define the class for the 'name' field in the new row
        const nameClass = `name_${newRowId}`;

        // Define the form validation rules for the 'name' field
        networks.validateRules[nameClass] = {
            identifier: nameClass,
            depends: `interface_${newRowId}`,
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.nw_ValidateNameIsNotBeEmpty,
                },
            ],

        };

        // Define the class for the 'vlanid' field in the new row
        const vlanClass = `vlanid_${newRowId}`;


        // Define the form validation rules for the 'vlanid' field
        networks.validateRules[vlanClass] = {
            depends: `interface_${newRowId}`,
            identifier: vlanClass,
            rules: [
                {
                    type: 'integer[0..4095]',
                    prompt: globalTranslate.nw_ValidateVlanRange,
                },
                {
                    type: `checkVlan[${newRowId}]`,
                    prompt: globalTranslate.nw_ValidateVlanCross,
                },
            ],

        };

        // Define the class for the 'ipaddr' field in the new row
        const ipaddrClass = `ipaddr_${newRowId}`;

        // Define the form validation rules for the 'ipaddr' field
        networks.validateRules[ipaddrClass] = {
            identifier: ipaddrClass,
            depends: `not-dhcp-${newRowId}`,
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.nw_ValidateIppaddrIsEmpty,
                },
                {
                    type: 'ipaddr',
                    prompt: globalTranslate.nw_ValidateIppaddrNotRight,
                },
            ],
        };

        // Define the class for the 'dhcp' field in the new row
        const dhcpClass = `dhcp_${newRowId}`;

        // Define the form validation rules for the 'dhcp' field
        networks.validateRules[dhcpClass] = {
            identifier: dhcpClass,
            depends: `interface_${newRowId}`,
            rules: [
                {
                    type: `dhcpOnVlanNetworks[${newRowId}]`,
                    prompt: globalTranslate.nw_ValidateDHCPOnVlansDontSupport,
                },
            ],
        };

    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        console.log('cbBeforeSendForm called with settings:', settings);

        // Create a new object with all settings properties
        const result = Object.assign({}, settings);
        result.data = {};

        // Manually collect form values to avoid any DOM-related issues
        // Collect all regular input fields
        networks.$formObj.find('input[type="text"], input[type="hidden"], input[type="number"], textarea').each(function() {
            const $input = $(this);
            const name = $input.attr('name');
            if (name) {
                const value = $input.val();
                // Ensure we only get string values
                result.data[name] = (value !== null && value !== undefined) ? String(value) : '';
            }
        });

        // Collect select dropdowns
        networks.$formObj.find('select').each(function() {
            const $select = $(this);
            const name = $select.attr('name');
            if (name) {
                const value = $select.val();
                // Ensure we only get string values
                result.data[name] = (value !== null && value !== undefined) ? String(value) : '';
            }
        });

        // Convert checkbox values to boolean
        // PbxApiClient will handle conversion to strings for jQuery
        result.data.usenat = $('#usenat-checkbox').checkbox('is checked');

        // Use correct field name from the form (autoUpdateExternalIp, not AUTO_UPDATE_EXTERNAL_IP)
        const $autoUpdateDiv = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');
        if ($autoUpdateDiv.length > 0) {
            result.data.autoUpdateExternalIp = $autoUpdateDiv.checkbox('is checked');
        } else {
            result.data.autoUpdateExternalIp = false;
        }

        // Convert DHCP checkboxes to boolean for each interface
        networks.$formObj.find('.dhcp-checkbox').each((index, obj) => {
            const inputId = $(obj).attr('id');
            const rowId = inputId.replace('dhcp-', '').replace('-checkbox', '');
            result.data[`dhcp_${rowId}`] = $(obj).checkbox('is checked');
        });

        // Ensure internet_interface is included (from dynamic dropdown)
        const internetInterfaceValue = $('#internet_interface').val();
        if (internetInterfaceValue) {
            result.data.internet_interface = String(internetInterfaceValue);
        }

        // Map form field names to API field names for ports
        const portFieldMapping = {
            'externalSIPPort': 'EXTERNAL_SIP_PORT',
            'externalTLSPort': 'EXTERNAL_TLS_PORT'
        };

        // Apply port field mapping
        Object.keys(portFieldMapping).forEach(formField => {
            const apiField = portFieldMapping[formField];
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
    cbAfterSendForm(response) {
        console.log('cbAfterSendForm called with response:', response);
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = networks.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = networks.validateRules; // Form validation rules
        Form.cbBeforeSendForm = networks.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = networks.cbAfterSendForm; // Callback after form is sent

        // Configure REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = NetworkAPI;
        Form.apiSettings.saveMethod = 'saveConfig';

        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}network/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}network/modify/`;

        Form.initialize();
    },

    /**
     * Load network configuration via REST API
     */
    loadConfiguration() {
        console.log('Loading configuration from REST API...');
        NetworkAPI.getConfig((response) => {
            console.log('NetworkAPI.getConfig response:', response);
            if (response.result && response.data) {
                console.log('Configuration data received:', response.data);
                networks.populateForm(response.data);

                // Initialize UI after loading data
                networks.toggleDisabledFieldClass();

                // Hide form elements connected with non docker installations
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
    createInterfaceTabs(data) {
        const $menu = $('#eth-interfaces-menu');
        const $content = $('#eth-interfaces-content');

        // Clear existing content
        $menu.empty();
        $content.empty();

        // Find interfaces that can be deleted (have multiple VLANs)
        const deletableInterfaces = [];
        const interfaceCount = {};
        data.interfaces.forEach(iface => {
            interfaceCount[iface.interface] = (interfaceCount[iface.interface] || 0) + 1;
        });
        Object.keys(interfaceCount).forEach(ifaceName => {
            if (interfaceCount[ifaceName] > 1) {
                deletableInterfaces.push(ifaceName);
            }
        });

        // Create tabs for existing interfaces
        data.interfaces.forEach((iface, index) => {
            const tabId = iface.id;
            const tabLabel = `${iface.name || iface.interface} (${iface.interface}${iface.vlanid !== '0' && iface.vlanid !== 0 ? `.${iface.vlanid}` : ''})`;
            const isActive = index === 0;

            // Create tab menu item
            $menu.append(`
                <a class="item ${isActive ? 'active' : ''}" data-tab="${tabId}">
                    ${tabLabel}
                </a>
            `);

            // Create tab content
            const canDelete = deletableInterfaces.includes(iface.interface);
            const deleteButton = canDelete ? `
                <a class="ui icon left labeled button delete-interface" data-value="${tabId}">
                    <i class="icon trash"></i>${globalTranslate.nw_DeleteCurrentInterface}
                </a>
            ` : '';

            $content.append(networks.createInterfaceForm(iface, isActive, deleteButton));
        });

        // Create template tab for new VLAN
        if (data.template) {
            const template = data.template;
            template.id = 0;

            // Add "+" tab menu item
            $menu.append(`
                <a class="item" data-tab="0">
                    <i class="icon plus"></i>
                </a>
            `);

            // Create template form with interface selector
            $content.append(networks.createTemplateForm(template, data.interfaces));

            // Build interface selector dropdown for template
            const physicalInterfaces = {};
            data.interfaces.forEach(iface => {
                if (!physicalInterfaces[iface.interface]) {
                    physicalInterfaces[iface.interface] = {
                        value: iface.id.toString(),
                        text: iface.interface,
                        name: iface.interface
                    };
                }
            });

            const physicalInterfaceOptions = Object.values(physicalInterfaces);

            DynamicDropdownBuilder.buildDropdown('interface_0', { interface_0: '' }, {
                staticOptions: physicalInterfaceOptions,
                placeholder: globalTranslate.nw_SelectInterface,
                allowEmpty: true
            });
        }

        // Initialize tabs
        $('#eth-interfaces-menu .item').tab();
        $('#eth-interfaces-menu .item').first().trigger('click');

        // Initialize subnet dropdowns
        $('select[name^="subnet_"]').dropdown();

        // Re-bind delete button handlers
        $('.delete-interface').off('click').on('click', function(e) {
            e.preventDefault();
            const $button = $(this);
            const interfaceId = $button.attr('data-value');

            $button.addClass('loading disabled');

            NetworkAPI.deleteRecord(interfaceId, (response) => {
                $button.removeClass('loading disabled');

                if (response.result) {
                    window.location.reload();
                } else {
                    UserMessage.showMultiString(response.messages);
                }
            });
        });

        // Re-bind DHCP checkbox handlers
        $('.dhcp-checkbox').checkbox({
            onChange() {
                networks.toggleDisabledFieldClass();
            },
        });

        // Re-bind IP address input masks
        $('.ipaddress').inputmask({alias: 'ip', 'placeholder': '_'});
    },

    /**
     * Create form for existing interface
     */
    createInterfaceForm(iface, isActive, deleteButton) {
        const id = iface.id;

        return `
            <div class="ui bottom attached tab segment ${isActive ? 'active' : ''}" data-tab="${id}">
                <input type="hidden" name="interface_${id}" value="${iface.interface}" />

                <div class="field">
                    <label>${globalTranslate.nw_InterfaceName}</label>
                    <div class="field max-width-400">
                        <input type="text" name="name_${id}" value="${iface.name || ''}" />
                    </div>
                </div>

                <div class="field">
                    <div class="ui segment">
                        <div class="ui toggle checkbox dhcp-checkbox" id="dhcp-${id}-checkbox">
                            <input type="checkbox" name="dhcp_${id}" ${iface.dhcp ? 'checked' : ''} />
                            <label>${globalTranslate.nw_UseDHCP}</label>
                        </div>
                    </div>
                </div>

                <input type="hidden" name="notdhcp_${id}" id="not-dhcp-${id}"/>

                <div class="fields" id="ip-address-group-${id}">
                    <div class="field">
                        <label>${globalTranslate.nw_IPAddress}</label>
                        <div class="field max-width-400">
                            <input type="text" class="ipaddress" name="ipaddr_${id}" value="${iface.ipaddr || ''}" />
                        </div>
                    </div>
                    <div class="field">
                        <label>${globalTranslate.nw_NetworkMask}</label>
                        <div class="field max-width-400">
                            <select name="subnet_${id}" class="ui search selection dropdown" id="subnet-${id}">
                                ${networks.getSubnetOptions(iface.subnet || '24')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="field">
                    <label>${globalTranslate.nw_VlanID}</label>
                    <div class="field max-width-100">
                        <input type="number" name="vlanid_${id}" value="${iface.vlanid || '0'}" />
                    </div>
                </div>

                ${deleteButton}
            </div>
        `;
    },

    /**
     * Create form for new VLAN template
     */
    createTemplateForm(template, interfaces) {
        const id = 0;

        return `
            <div class="ui bottom attached tab segment" data-tab="${id}">
                <div class="field">
                    <label>${globalTranslate.nw_SelectInterface}</label>
                    <div class="field max-width-400">
                        <input type="hidden" name="interface_${id}" id="interface_${id}" />
                    </div>
                </div>

                <div class="field">
                    <label>${globalTranslate.nw_InterfaceName}</label>
                    <div class="field max-width-400">
                        <input type="text" name="name_${id}" id="name_${id}" value="" />
                    </div>
                </div>

                <div class="field">
                    <div class="ui segment">
                        <div class="ui toggle checkbox dhcp-checkbox" id="dhcp-${id}-checkbox">
                            <input type="checkbox" name="dhcp_${id}" checked />
                            <label>${globalTranslate.nw_UseDHCP}</label>
                        </div>
                    </div>
                </div>

                <input type="hidden" name="notdhcp_${id}" id="not-dhcp-${id}"/>

                <div class="fields" id="ip-address-group-${id}">
                    <div class="field">
                        <label>${globalTranslate.nw_IPAddress}</label>
                        <div class="field max-width-400">
                            <input type="text" class="ipaddress" name="ipaddr_${id}" value="" />
                        </div>
                    </div>
                    <div class="field">
                        <label>${globalTranslate.nw_NetworkMask}</label>
                        <div class="field max-width-400">
                            <select name="subnet_${id}" class="ui search selection dropdown" id="subnet-${id}">
                                ${networks.getSubnetOptions('0')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="field">
                    <label>${globalTranslate.nw_VlanID}</label>
                    <div class="field max-width-100">
                        <input type="number" name="vlanid_${id}" value="4095" />
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Get subnet mask options HTML
     */
    getSubnetOptions(selectedValue) {
        // Network masks from Cidr::getNetMasks() (krsort SORT_NUMERIC)
        const masks = [
            {value: '32', text: '32 - 255.255.255.255'},
            {value: '31', text: '31 - 255.255.255.254'},
            {value: '30', text: '30 - 255.255.255.252'},
            {value: '29', text: '29 - 255.255.255.248'},
            {value: '28', text: '28 - 255.255.255.240'},
            {value: '27', text: '27 - 255.255.255.224'},
            {value: '26', text: '26 - 255.255.255.192'},
            {value: '25', text: '25 - 255.255.255.128'},
            {value: '24', text: '24 - 255.255.255.0'},
            {value: '23', text: '23 - 255.255.255.254'},
            {value: '22', text: '22 - 255.255.252.0'},
            {value: '21', text: '21 - 255.255.248.0'},
            {value: '20', text: '20 - 255.255.240.0'},
            {value: '19', text: '19 - 255.255.224.0'},
            {value: '18', text: '18 - 255.255.192.0'},
            {value: '17', text: '17 - 255.255.128.0'},
            {value: '16', text: '16 - 255.255.0.0'},
            {value: '15', text: '15 - 255.254.0.0'},
            {value: '14', text: '14 - 255.252.0.0'},
            {value: '13', text: '13 - 255.248.0.0'},
            {value: '12', text: '12 - 255.240.0.0'},
            {value: '11', text: '11 - 255.224.0.0'},
            {value: '10', text: '10 - 255.192.0.0'},
            {value: '9', text: '9 - 255.128.0.0'},
            {value: '8', text: '8 - 255.0.0.0'},
            {value: '7', text: '7 - 254.0.0.0'},
            {value: '6', text: '6 - 252.0.0.0'},
            {value: '5', text: '5 - 248.0.0.0'},
            {value: '4', text: '4 - 240.0.0.0'},
            {value: '3', text: '3 - 224.0.0.0'},
            {value: '2', text: '2 - 192.0.0.0'},
            {value: '1', text: '1 - 128.0.0.0'},
            {value: '0', text: '0 - 0.0.0.0'},
        ];

        return masks.map(mask =>
            `<option value="${mask.value}" ${mask.value === selectedValue ? 'selected' : ''}>${mask.text}</option>`
        ).join('');
    },

    /**
     * Populate form with configuration data
     */
    populateForm(data) {
        console.log('populateForm called with data:', data);

        // Create interface tabs and forms dynamically
        networks.createInterfaceTabs(data);

        // Build internet interface dropdown dynamically
        const internetInterfaceOptions = data.interfaces.map(iface => ({
            value: iface.id.toString(),
            text: iface.name || `${iface.interface}${iface.vlanid !== '0' ? `.${iface.vlanid}` : ''}`,
            name: iface.name || `${iface.interface}${iface.vlanid !== '0' ? `.${iface.vlanid}` : ''}`
        }));

        const formData = {
            internet_interface: data.internetInterfaceId?.toString() || ''
        };

        DynamicDropdownBuilder.buildDropdown('internet_interface', formData, {
            staticOptions: internetInterfaceOptions,
            placeholder: globalTranslate.nw_SelectInternetInterface
        });

        // Set NAT settings
        if (data.nat) {
            console.log('Setting NAT settings:', data.nat);
            // Boolean values from API
            if (data.nat.usenat) {
                console.log('Checking usenat checkbox');
                $('#usenat-checkbox').checkbox('check');
            } else {
                console.log('Unchecking usenat checkbox');
                $('#usenat-checkbox').checkbox('uncheck');
            }
            networks.$formObj.form('set value', 'extipaddr', data.nat.extipaddr || '');
            networks.$formObj.form('set value', 'exthostname', data.nat.exthostname || '');

            // autoUpdateExternalIp boolean (field name from the form)
            const $autoUpdateCheckbox = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');
            if ($autoUpdateCheckbox.length > 0) {
                if (data.nat.AUTO_UPDATE_EXTERNAL_IP || data.nat.autoUpdateExternalIp) {
                    console.log('Checking autoUpdateExternalIp checkbox');
                    $autoUpdateCheckbox.checkbox('check');
                } else {
                    console.log('Unchecking autoUpdateExternalIp checkbox');
                    $autoUpdateCheckbox.checkbox('uncheck');
                }
            }
        }

        // Set port settings
        if (data.ports) {
            console.log('Setting port values:', data.ports);

            // Map API field names to form field names
            const portFieldMapping = {
                'EXTERNAL_SIP_PORT': 'externalSIPPort',
                'EXTERNAL_TLS_PORT': 'externalTLSPort',
                'SIP_PORT': 'SIP_PORT',
                'TLS_PORT': 'TLS_PORT',
                'RTP_PORT_FROM': 'RTP_PORT_FROM',
                'RTP_PORT_TO': 'RTP_PORT_TO'
            };

            Object.keys(data.ports).forEach(key => {
                const formFieldName = portFieldMapping[key] || key;
                const value = data.ports[key];
                console.log(`Setting port field ${formFieldName} to value ${value}`);
                networks.$formObj.form('set value', formFieldName, value);
            });

            // Update the NAT help text and labels with actual port values
            networks.updateNATHelpText(data.ports);
            networks.updatePortLabels(data.ports);
        }

        // Set additional settings
        if (data.settings) {
            Object.keys(data.settings).forEach(key => {
                networks.$formObj.form('set value', key, data.settings[key]);
            });
        }

        // Save initial values for dirty checking
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    },
};

/**
 * Custom form validation rule for checking if the value is a valid IP address.
 * @param {string} value - The value to validate as an IP address.
 * @returns {boolean} - True if the value is a valid IP address, false otherwise.
 */
$.fn.form.settings.rules.ipaddr = (value) => {
    let result = true;
    const f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (f == null) {
        result = false;
    } else {
        for (let i = 1; i < 5; i += 1) {
            const a = f[i];
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
$.fn.form.settings.rules.ipaddrWithPortOptional = (value) => {
    let result = true;
    const f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(:[0-9]+)?$/);
    if (f == null) {
        result = false;
    } else {
        for (let i = 1; i < 5; i += 1) {
            const a = f[i];
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
$.fn.form.settings.rules.checkVlan = (vlanValue, param) => {
    let result = true;
    const vlansArray = {};
    const allValues = networks.$formObj.form('get values');
    if (allValues.interface_0 !== undefined && allValues.interface_0 > 0) {
        const newEthName = allValues[`interface_${allValues.interface_0}`];
        vlansArray[newEthName] = [allValues.vlanid_0];
        if (allValues.vlanid_0 === '') {
            result = false;
        }
    }
    $.each(allValues, (index, value) => {
        if (index === 'interface_0' || index === 'vlanid_0') return;
        if (index.indexOf('vlanid') >= 0) {
            const ethName = allValues[`interface_${index.split('_')[1]}`];
            if ($.inArray(value, vlansArray[ethName]) >= 0
                && vlanValue === value
                && param === index.split('_')[1]) {
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
$.fn.form.settings.rules.dhcpOnVlanNetworks = (value, param) => {
    let result = true;
    const vlanValue = networks.$formObj.form('get value', `vlanid_${param}`);
    const dhcpValue = networks.$formObj.form('get value', `dhcp_${param}`);
    if (vlanValue > 0 && dhcpValue === 'on') {
        result = false;
    }
    return result;
};

/**
 * Custom form validation rule for checking the presence of external IP host information.
 * @returns {boolean} - True if the external IP host information is provided when NAT is enabled, false otherwise.
 */
$.fn.form.settings.rules.extenalIpHost = () => {
    const allValues = networks.$formObj.form('get values');
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
$(document).ready(() => {
    networks.initialize();
});
