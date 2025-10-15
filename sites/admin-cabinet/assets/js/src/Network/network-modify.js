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
                {
                    type: 'validHostname',
                    prompt: globalTranslate.nw_ValidateHostnameInvalid,
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

        // Initialize static routes manager
        StaticRoutesManager.initialize();

        // Hide form elements connected with non docker installations
        // TEMPORARY: Commented out for local Docker testing
        // if (networks.$formObj.form('get value','is-docker')==="1") {
        //     networks.$notShowOnDockerDivs.hide();
        // }
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
            const $dhcpCheckbox = $(`#dhcp-${eth}-checkbox`);
            const isDhcpEnabled = $dhcpCheckbox.checkbox('is checked');

            // Find IP address and subnet fields
            const $ipField = $(`input[name="ipaddr_${eth}"]`);
            // DynamicDropdownBuilder creates dropdown with id pattern: fieldName-dropdown
            const $subnetDropdown = $(`#subnet_${eth}-dropdown`);

            if (isDhcpEnabled) {
                // DHCP enabled -> make IP/subnet read-only and add disabled class
                $ipField.prop('readonly', true);
                $ipField.closest('.field').addClass('disabled');
                $subnetDropdown.addClass('disabled');
                $(`#not-dhcp-${eth}`).val('');
            } else {
                // DHCP disabled -> make IP/subnet editable
                $ipField.prop('readonly', false);
                $ipField.closest('.field').removeClass('disabled');
                $subnetDropdown.removeClass('disabled');
                $(`#not-dhcp-${eth}`).val('1');
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
        // For template interface (id=0), add dependency on interface selection
        if (newRowId === 0 || newRowId === '0') {
            networks.validateRules[ipaddrClass] = {
                identifier: ipaddrClass,
                depends: `interface_${newRowId}`,  // Template: validate only if interface is selected
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
        } else {
            networks.validateRules[ipaddrClass] = {
                identifier: ipaddrClass,
                depends: `notdhcp_${newRowId}`,  // Real interface: validate only if DHCP is OFF
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
        }

        // DHCP validation removed - DHCP checkbox is disabled for VLAN interfaces

    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        // Create a new object with all settings properties
        const result = Object.assign({}, settings);
        result.data = {};

        // Collect static routes
        result.data.staticRoutes = StaticRoutesManager.collectRoutes();

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

            // For disabled checkboxes, read actual input state instead of Fomantic UI API
            const $checkbox = $(obj);
            const $input = $checkbox.find('input[type="checkbox"]');
            const isDisabled = $checkbox.hasClass('disabled') || $input.prop('disabled');

            if (isDisabled) {
                // For disabled checkboxes, read the actual input checked state
                result.data[`dhcp_${rowId}`] = $input.prop('checked') === true;
            } else {
                // For enabled checkboxes, use Fomantic UI API
                result.data[`dhcp_${rowId}`] = $checkbox.checkbox('is checked');
            }
        });

        // Collect internet radio button
        const $checkedRadio = $('input[name="internet_interface"]:checked');
        if ($checkedRadio.length > 0) {
            result.data.internet_interface = String($checkedRadio.val());
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

        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        // Response handled by Form
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
        Form.inline = true; // Show inline errors next to fields

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
        NetworkAPI.getConfig((response) => {
            if (response.result && response.data) {
                networks.populateForm(response.data);

                // Initialize UI after loading data
                networks.toggleDisabledFieldClass();

                // Hide form elements connected with non docker installations
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
    createInterfaceTabs(data) {
        const $menu = $('#eth-interfaces-menu');
        const $content = $('#eth-interfaces-content');

        // Clear existing content
        $menu.empty();
        $content.empty();

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
            // Only VLAN interfaces can be deleted (vlanid > 0)
            const canDelete = parseInt(iface.vlanid, 10) > 0;
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

        // Initialize subnet dropdowns using DynamicDropdownBuilder
        data.interfaces.forEach((iface) => {
            const fieldName = `subnet_${iface.id}`;
            const formData = {};
            // Convert subnet to string for dropdown matching
            formData[fieldName] = String(iface.subnet || '24');

            DynamicDropdownBuilder.buildDropdown(fieldName, formData, {
                staticOptions: networks.getSubnetOptionsArray(),
                placeholder: globalTranslate.nw_SelectNetworkMask,
                allowEmpty: false,
                additionalClasses: ['search']  // Add search class for searchable dropdown
            });
        });

        // Initialize subnet dropdown for template (id = 0)
        if (data.template) {
            DynamicDropdownBuilder.buildDropdown('subnet_0', { subnet_0: '24' }, {
                staticOptions: networks.getSubnetOptionsArray(),
                placeholder: globalTranslate.nw_SelectNetworkMask,
                allowEmpty: false,
                additionalClasses: ['search']  // Add search class for searchable dropdown
            });
        }

        // Initialize tabs
        $('#eth-interfaces-menu .item').tab();
        $('#eth-interfaces-menu .item').first().trigger('click');

        // Update static routes section visibility
        StaticRoutesManager.updateVisibility();

        // Re-bind delete button handlers
        // Delete button removes TAB from form and marks interface as disabled
        // Actual deletion happens on form submit
        $('.delete-interface').off('click').on('click', function(e) {
            e.preventDefault();
            const $button = $(this);
            const interfaceId = $button.attr('data-value');

            // Remove the TAB menu item
            $(`#eth-interfaces-menu a[data-tab="${interfaceId}"]`).remove();

            // Remove the TAB content
            const $tabContent = $(`#eth-interfaces-content .tab[data-tab="${interfaceId}"]`);
            $tabContent.remove();

            // Add hidden field to mark this interface as disabled
            networks.$formObj.append(`<input type="hidden" name="disabled_${interfaceId}" value="1" />`);

            // Switch to first available tab
            const $firstTab = $('#eth-interfaces-menu a.item').first();
            if ($firstTab.length > 0) {
                $firstTab.tab('change tab', $firstTab.attr('data-tab'));
            }

            // Mark form as changed to enable submit button
            if (Form.enableDirrity) {
                Form.checkValues();
            }
        });

        // Re-bind DHCP checkbox handlers
        $('.dhcp-checkbox').checkbox({
            onChange() {
                networks.toggleDisabledFieldClass();
            },
        });

        // Re-bind IP address input masks
        $('.ipaddress').inputmask({alias: 'ip', 'placeholder': '_'});

        // Add VLAN ID change handlers to control DHCP checkbox state
        $('input[name^="vlanid_"]').off('input change').on('input change', function() {
            const $vlanInput = $(this);
            const interfaceId = $vlanInput.attr('name').replace('vlanid_', '');
            const vlanValue = parseInt($vlanInput.val(), 10) || 0;
            const $dhcpCheckbox = $(`#dhcp-${interfaceId}-checkbox`);

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
            }
            // Update disabled field classes
            networks.toggleDisabledFieldClass();
        });

        // Trigger the handler for existing VLAN interfaces to apply initial state
        $('input[name^="vlanid_"]').trigger('change');

        // Initialize internet radio buttons with Fomantic UI
        $('.internet-radio').checkbox();

        // Add internet radio button change handler
        $('input[name="internet_interface"]').off('change').on('change', function() {
            const selectedInterfaceId = $(this).val();

            // Hide all DNS/Gateway groups
            $('[class^="dns-gateway-group-"]').hide();

            // Show DNS/Gateway group for selected internet interface
            $(`.dns-gateway-group-${selectedInterfaceId}`).show();

            // Update TAB icons - add globe icon to selected, remove from others
            $('#eth-interfaces-menu a').each((index, tab) => {
                const $tab = $(tab);
                const tabId = $tab.attr('data-tab');

                // Remove existing globe icon
                $tab.find('.globe.icon').remove();

                // Add globe icon to selected internet interface TAB
                if (tabId === selectedInterfaceId) {
                    $tab.prepend('<i class="globe icon"></i>');
                }
            });

            // Mark form as changed
            if (Form.enableDirrity) {
                Form.checkValues();
            }
        });

        // Update DNS/Gateway readonly state when DHCP changes
        $('.dhcp-checkbox').off('change.dnsgateway').on('change.dnsgateway', function() {
            const $checkbox = $(this);
            const interfaceId = $checkbox.attr('id').replace('dhcp-', '').replace('-checkbox', '');
            const isDhcpEnabled = $checkbox.checkbox('is checked');

            // Find DNS/Gateway fields for this interface
            const $dnsGatewayGroup = $(`.dns-gateway-group-${interfaceId}`);
            const $dnsGatewayFields = $dnsGatewayGroup.find('input[name^="gateway_"], input[name^="primarydns_"], input[name^="secondarydns_"]');

            if (isDhcpEnabled) {
                // DHCP enabled -> make DNS/Gateway read-only
                $dnsGatewayFields.prop('readonly', true);
                $dnsGatewayFields.closest('.field').addClass('disabled');
            } else {
                // DHCP disabled -> make DNS/Gateway editable
                $dnsGatewayFields.prop('readonly', false);
                $dnsGatewayFields.closest('.field').removeClass('disabled');
            }
        });

        // Trigger initial TAB icon update for checked radio button
        const $checkedRadio = $('input[name="internet_interface"]:checked');
        if ($checkedRadio.length > 0) {
            $checkedRadio.trigger('change');
        }

        // Apply initial disabled state for DHCP-enabled interfaces
        // Call after all dropdowns are created
        networks.toggleDisabledFieldClass();

        // Re-save initial form values and re-bind event handlers for dynamically created inputs
        // This is essential for form change detection to work with dynamic tabs
        if (Form.enableDirrity) {
            // Override Form methods to manually collect all field values (including from tabs)
            const originalSaveInitialValues = Form.saveInitialValues;
            const originalCheckValues = Form.checkValues;

            Form.saveInitialValues = function() {
                // Get values from Fomantic UI (may miss dynamically created tab fields)
                const fomanticValues = networks.$formObj.form('get values');

                // Manually collect all field values to catch fields that Fomantic UI misses
                const manualValues = {};
                networks.$formObj.find('input, select, textarea').each(function() {
                    const $field = $(this);
                    const name = $field.attr('name') || $field.attr('id');
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
                });

                // Merge both (manual values override Fomantic values for fields that exist in both)
                Form.oldFormValues = Object.assign({}, fomanticValues, manualValues);
            };

            Form.checkValues = function() {
                // Get values from Fomantic UI
                const fomanticValues = networks.$formObj.form('get values');

                // Manually collect all field values
                const manualValues = {};
                networks.$formObj.find('input, select, textarea').each(function() {
                    const $field = $(this);
                    const name = $field.attr('name') || $field.attr('id');
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
                });

                // Merge both
                const newFormValues = Object.assign({}, fomanticValues, manualValues);

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
    createInterfaceForm(iface, isActive, deleteButton) {
        const id = iface.id;
        const isInternetInterface = iface.internet || false;

        // DNS/Gateway fields visibility and read-only state
        const dnsGatewayVisible = isInternetInterface ? '' : 'style="display:none;"';
        const dnsGatewayReadonly = iface.dhcp ? 'readonly' : '';
        const dnsGatewayDisabledClass = iface.dhcp ? 'disabled' : '';

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
                        <div class="ui toggle checkbox internet-radio" id="internet-${id}-radio">
                            <input type="radio" name="internet_interface" value="${id}" ${isInternetInterface ? 'checked' : ''} />
                            <label><i class="globe icon"></i> ${globalTranslate.nw_InternetInterface || 'Internet Interface'}</label>
                        </div>
                    </div>
                </div>

                <div class="field">
                    <div class="ui segment">
                        <div class="ui toggle checkbox dhcp-checkbox${iface.vlanid > 0 ? ' disabled' : ''}" id="dhcp-${id}-checkbox">
                            <input type="checkbox" name="dhcp_${id}" ${iface.vlanid > 0 ? '' : (iface.dhcp ? 'checked' : '')} ${iface.vlanid > 0 ? 'disabled' : ''} />
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
                            <input type="hidden" id="subnet_${id}" name="subnet_${id}" value="${iface.subnet || ''}" />
                        </div>
                    </div>
                </div>

                <div class="field">
                    <label>${globalTranslate.nw_VlanID}</label>
                    <div class="field max-width-100">
                        <input type="number" name="vlanid_${id}" value="${iface.vlanid || '0'}" />
                    </div>
                </div>

                <div class="dns-gateway-group-${id}" ${dnsGatewayVisible}>
                    <div class="ui horizontal divider">${globalTranslate.nw_InternetSettings || 'Internet Settings'}</div>

                    <div class="field">
                        <label>${globalTranslate.nw_Gateway}</label>
                        <div class="field max-width-400 ${dnsGatewayDisabledClass}">
                            <input type="text" class="ipaddress" name="gateway_${id}" value="${iface.gateway || ''}" ${dnsGatewayReadonly} />
                        </div>
                    </div>

                    <div class="field">
                        <label>${globalTranslate.nw_PrimaryDNS}</label>
                        <div class="field max-width-400 ${dnsGatewayDisabledClass}">
                            <input type="text" class="ipaddress" name="primarydns_${id}" value="${iface.primarydns || ''}" ${dnsGatewayReadonly} />
                        </div>
                    </div>

                    <div class="field">
                        <label>${globalTranslate.nw_SecondaryDNS}</label>
                        <div class="field max-width-400 ${dnsGatewayDisabledClass}">
                            <input type="text" class="ipaddress" name="secondarydns_${id}" value="${iface.secondarydns || ''}" ${dnsGatewayReadonly} />
                        </div>
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
                            <input type="hidden" id="subnet_${id}" name="subnet_${id}" value="24" />
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
     * Get subnet mask options array for DynamicDropdownBuilder
     * @returns {Array} Array of subnet mask options
     */
    getSubnetOptionsArray() {
        // Network masks from Cidr::getNetMasks() (krsort SORT_NUMERIC)
        return [
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
    },

    /**
     * Populate form with configuration data
     */
    populateForm(data) {
        // Create interface tabs and forms dynamically
        networks.createInterfaceTabs(data);

        // Set NAT settings
        if (data.nat) {
            // Boolean values from API
            if (data.nat.usenat) {
                $('#usenat-checkbox').checkbox('check');
            } else {
                $('#usenat-checkbox').checkbox('uncheck');
            }
            networks.$formObj.form('set value', 'extipaddr', data.nat.extipaddr || '');
            networks.$formObj.form('set value', 'exthostname', data.nat.exthostname || '');

            // autoUpdateExternalIp boolean (field name from the form)
            const $autoUpdateCheckbox = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');
            if ($autoUpdateCheckbox.length > 0) {
                if (data.nat.AUTO_UPDATE_EXTERNAL_IP || data.nat.autoUpdateExternalIp) {
                    $autoUpdateCheckbox.checkbox('check');
                } else {
                    $autoUpdateCheckbox.checkbox('uncheck');
                }
            }
        }

        // Set port settings
        if (data.ports) {
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

        // Store available interfaces for static routes FIRST (before loading routes)
        if (data.availableInterfaces) {
            StaticRoutesManager.availableInterfaces = data.availableInterfaces;
        }

        // Load static routes AFTER availableInterfaces are set
        if (data.staticRoutes) {
            StaticRoutesManager.loadRoutes(data.staticRoutes);
        }

        // Re-initialize dirty checking after population is complete
        // This ensures the button is disabled and all dynamically created fields are tracked
        if (Form.enableDirrity) {
            Form.initializeDirrity();
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

// DHCP validation rule removed - DHCP checkbox is disabled for VLAN interfaces, no validation needed

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
 * Custom form validation rule for checking if value is a valid hostname
 * @param {string} value - The value to validate as hostname
 * @returns {boolean} - True if valid hostname, false otherwise
 */
$.fn.form.settings.rules.validHostname = (value) => {
    if (!value || value === '') {
        return true; // Empty is handled by extenalIpHost rule
    }

    // RFC 952/RFC 1123 hostname validation
    // - Labels separated by dots
    // - Each label 1-63 chars
    // - Only alphanumeric and hyphens
    // - Cannot start/end with hyphen
    // - Total length max 253 chars
    const hostnameRegex = /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63}(?<!-))*$/;
    return hostnameRegex.test(value);
};


/**
 * Static Routes Manager Module
 *
 * Manages static route configuration when multiple network interfaces exist
 */
const StaticRoutesManager = {
    $table: $('#static-routes-table'),
    $section: $('#static-routes-section'),
    $addButton: $('#add-new-route'),
    $tableContainer: null,
    $emptyPlaceholder: null,
    routes: [],
    availableInterfaces: [], // Will be populated from REST API

    /**
     * Initialize static routes management
     */
    initialize() {
        // Cache elements
        StaticRoutesManager.$emptyPlaceholder = $('#static-routes-empty-placeholder');
        StaticRoutesManager.$tableContainer = $('#static-routes-table-container');

        // Hide section if less than 2 interfaces
        StaticRoutesManager.updateVisibility();

        // Initialize drag-and-drop
        StaticRoutesManager.initializeDragAndDrop();

        // Add button handler
        StaticRoutesManager.$addButton.on('click', (e) => {
            e.preventDefault();
            StaticRoutesManager.addRoute();
        });

        // Add first route button handler (in empty placeholder)
        $(document).on('click', '#add-first-route-button', (e) => {
            e.preventDefault();
            StaticRoutesManager.addRoute();
        });

        // Delete button handler (delegated)
        StaticRoutesManager.$table.on('click', '.delete-route-button', (e) => {
            e.preventDefault();
            $(e.target).closest('tr').remove();
            StaticRoutesManager.updatePriorities();
            StaticRoutesManager.updateEmptyState();
            Form.dataChanged();
        });

        // Copy button handler (delegated)
        StaticRoutesManager.$table.on('click', '.copy-route-button', (e) => {
            e.preventDefault();
            const $sourceRow = $(e.target).closest('tr');
            StaticRoutesManager.copyRoute($sourceRow);
        });

        // Input change handlers
        StaticRoutesManager.$table.on('input change', '.network-input, .gateway-input, .description-input', () => {
            Form.dataChanged();
        });

        // Paste handlers for IP address fields (enable clipboard paste with inputmask)
        StaticRoutesManager.$table.on('paste', '.network-input, .gateway-input', function(e) {
            e.preventDefault();

            // Get pasted data from clipboard
            let pastedData = '';
            if (e.originalEvent && e.originalEvent.clipboardData && e.originalEvent.clipboardData.getData) {
                pastedData = e.originalEvent.clipboardData.getData('text');
            } else if (e.clipboardData && e.clipboardData.getData) {
                pastedData = e.clipboardData.getData('text');
            } else if (window.clipboardData && window.clipboardData.getData) {
                pastedData = window.clipboardData.getData('text'); // For IE
            }

            // Clean the pasted data (remove extra spaces, keep only valid IP characters)
            const cleanedData = pastedData.trim().replace(/[^0-9.]/g, '');

            // Get the input element
            const $input = $(this);

            // Temporarily remove mask
            $input.inputmask('remove');

            // Set the cleaned value
            $input.val(cleanedData);

            // Reapply the mask after a short delay
            setTimeout(() => {
                $input.inputmask({alias: 'ip', placeholder: '_'});
                $input.trigger('input');
                Form.dataChanged();
            }, 10);
        });
    },

    /**
     * Initialize or reinitialize drag-and-drop functionality
     */
    initializeDragAndDrop() {
        // Destroy existing tableDnD if it exists
        if (StaticRoutesManager.$table.data('tableDnD')) {
            StaticRoutesManager.$table.tableDnDUpdate();
        }

        // Initialize drag-and-drop
        StaticRoutesManager.$table.tableDnD({
            onDrop: () => {
                StaticRoutesManager.updatePriorities();
                Form.dataChanged();
            },
            dragHandle: '.dragHandle'
        });
    },

    /**
     * Update visibility based on number of interfaces
     */
    updateVisibility() {
        // Show/hide section based on number of interfaces
        const interfaceCount = $('#eth-interfaces-menu a.item').not('[data-tab="0"]').length;
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
    copyRoute($sourceRow) {
        const routeId = $sourceRow.attr('data-route-id');
        const subnetDropdownId = `subnet-route-${routeId}`;
        const interfaceDropdownId = `interface-route-${routeId}`;

        // Collect data from source row
        const routeData = {
            network: $sourceRow.find('.network-input').val(),
            subnet: $(`#${subnetDropdownId}`).val(),
            gateway: $sourceRow.find('.gateway-input').val(),
            interface: $(`#${interfaceDropdownId}`).val() || '',
            description: $sourceRow.find('.description-input').val()
        };

        // Add new route with copied data
        StaticRoutesManager.addRoute(routeData);

        // Reinitialize drag-and-drop after adding route
        StaticRoutesManager.initializeDragAndDrop();
    },

    /**
     * Update empty state visibility
     */
    updateEmptyState() {
        const $existingRows = $('.route-row');
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
    addRoute(routeData = null) {
        const $template = $('.route-row-template').last();
        const $newRow = $template.clone(true);
        const routeId = routeData?.id || `new_${Date.now()}`;

        $newRow
            .removeClass('route-row-template')
            .addClass('route-row')
            .attr('data-route-id', routeId)
            .show();

        // Set values if provided
        if (routeData) {
            $newRow.find('.network-input').val(routeData.network);
            $newRow.find('.gateway-input').val(routeData.gateway);
            $newRow.find('.description-input').val(routeData.description || '');
        }

        // Add to table
        const $existingRows = $('.route-row');
        if ($existingRows.length === 0) {
            $template.after($newRow);
        } else {
            $existingRows.last().after($newRow);
        }

        // Initialize subnet dropdown for this row
        StaticRoutesManager.initializeSubnetDropdown($newRow, routeData?.subnet || '24');

        // Initialize interface dropdown for this row
        StaticRoutesManager.initializeInterfaceDropdown($newRow, routeData?.interface || '');

        // Initialize inputmask for IP address fields
        $newRow.find('.ipaddress').inputmask({alias: 'ip', placeholder: '_'});

        StaticRoutesManager.updatePriorities();
        StaticRoutesManager.updateEmptyState();
        Form.dataChanged();
    },

    /**
     * Initialize subnet dropdown for a route row
     * @param {jQuery} $row - Row element
     * @param {string} selectedValue - Selected subnet value
     */
    initializeSubnetDropdown($row, selectedValue) {
        const $container = $row.find('.subnet-dropdown-container');
        const dropdownId = `subnet-route-${$row.attr('data-route-id')}`;

        $container.html(`<input type="hidden" id="${dropdownId}" />`);

        DynamicDropdownBuilder.buildDropdown(dropdownId,
            { [dropdownId]: selectedValue },
            {
                staticOptions: networks.getSubnetOptionsArray(),
                placeholder: globalTranslate.nw_SelectNetworkMask,
                allowEmpty: false,
                additionalClasses: ['search'],
                onChange: () => Form.dataChanged()
            }
        );
    },

    /**
     * Initialize interface dropdown for a route row
     * @param {jQuery} $row - Row element
     * @param {string} selectedValue - Selected interface value (empty string = auto)
     */
    initializeInterfaceDropdown($row, selectedValue) {
        const $container = $row.find('.interface-dropdown-container');
        const dropdownId = `interface-route-${$row.attr('data-route-id')}`;

        $container.html(`<input type="hidden" id="${dropdownId}" />`);

        // Build dropdown options: "Auto" + available interfaces
        const options = [
            { value: '', text: globalTranslate.nw_Auto || 'Auto' },
            ...StaticRoutesManager.availableInterfaces.map(iface => ({
                value: iface.value,
                text: iface.label
            }))
        ];

        // Prepare form data for DynamicDropdownBuilder
        const formData = {};
        formData[dropdownId] = selectedValue || ''; // Ensure we pass empty string for "Auto"

        DynamicDropdownBuilder.buildDropdown(dropdownId,
            formData,
            {
                staticOptions: options,
                placeholder: globalTranslate.nw_SelectInterface,
                allowEmpty: false,
                onChange: () => Form.dataChanged()
            }
        );
    },

    /**
     * Update route priorities based on table order
     */
    updatePriorities() {
        $('.route-row').each((index, row) => {
            $(row).attr('data-priority', index + 1);
        });
    },

    /**
     * Load routes from data
     * @param {Array} routesData - Array of route objects
     */
    loadRoutes(routesData) {
        // Clear existing routes
        $('.route-row').remove();

        // Add each route
        if (routesData && routesData.length > 0) {
            routesData.forEach(route => {
                StaticRoutesManager.addRoute(route);
            });
        } else {
            // Show empty state if no routes
            StaticRoutesManager.updateEmptyState();
        }

        // Reinitialize drag-and-drop after adding routes
        StaticRoutesManager.initializeDragAndDrop();
    },

    /**
     * Collect routes from table
     * @returns {Array} Array of route objects
     */
    collectRoutes() {
        const routes = [];
        $('.route-row').each((index, row) => {
            const $row = $(row);
            const routeId = $row.attr('data-route-id');
            const subnetDropdownId = `subnet-route-${routeId}`;
            const interfaceDropdownId = `interface-route-${routeId}`;

            routes.push({
                id: routeId.startsWith('new_') ? null : routeId,
                network: $row.find('.network-input').val(),
                subnet: $(`#${subnetDropdownId}`).val(),
                gateway: $row.find('.gateway-input').val(),
                interface: $(`#${interfaceDropdownId}`).val() || '',
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
$(document).ready(() => {
    networks.initialize();
});
