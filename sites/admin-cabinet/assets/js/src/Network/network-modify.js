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

/* global globalRootUrl,globalTranslate, Form, PbxApi */

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
        networks.toggleDisabledFieldClass();
        $('#eth-interfaces-menu .item').tab();

        // Handles the change event of the 'usenat-checkbox'.
        $('#usenat-checkbox').checkbox({
            onChange() {
                networks.toggleDisabledFieldClass();
            },
        });
        networks.$dropDowns.dropdown();

        // Handles the change event of the 'dhcp-checkbox'.
        $('.dhcp-checkbox')
            .checkbox({
                onChange() {
                    networks.toggleDisabledFieldClass();
                },
            });

        networks.$getMyIpButton.on('click', (e) => {
            e.preventDefault();
            networks.$getMyIpButton.addClass('loading disabled');
            PbxApi.GetExternalIp(networks.cbAfterGetExternalIp);
        });

        // Delete additional network interface
        $('.delete-interface').api({
            url: `${globalRootUrl}network/delete/{value}`,
            method: 'POST',
            beforeSend(settings) {
                $(this).addClass('loading disabled');
                return settings;
            },

            /**
             * Handles the successful response of the 'delete-interface' API request.
             * @param {object} response - The response object.
             */
            onSuccess(response) {
                $(this).removeClass('loading disabled');
                $('.ui.message.ajax').remove();
                $.each(response.message, (index, value) => {
                    networks.$formObj.after(`<div class="ui ${index} message ajax">${value}</div>`);
                });
                if (response.success) window.location.reload();
            },

            /**
             * Handles the failure response of the 'delete-interface' API request.
             * @param {object} response - The response object.
             */
            onFailure(response) {
                $(this).removeClass('loading disabled');
                $('form').after(response);
            },
        });

        // Clear additional network settings
        $('.delete-interface-0').on('click', () => {
            const initialValues = {
                interface_0: '',
                name_0: '',
                dhcp_0: 'on',
                ipaddr_0: '',
                subnet_0: '0',
            };
            networks.$formObj.form('set values', initialValues);
            $('#interface_0').dropdown('restore defaults');
            $('#dhcp-0-checkbox').checkbox('check');
            $('#eth-interfaces-menu .item').tab('change tab', $('#eth-interfaces-menu a.item').first().attr('data-tab'));
        });
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
            networks.$extipaddr.trigger('change');
            networks.$getMyIpButton.removeClass('loading disabled');
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
        const result = settings;
        result.data = networks.$formObj.form('get values');
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {

    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = networks.$formObj;
        Form.url = `${globalRootUrl}network/save`; // Form submission URL
        Form.validateRules = networks.validateRules; // Form validation rules
        Form.cbBeforeSendForm = networks.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = networks.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
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
