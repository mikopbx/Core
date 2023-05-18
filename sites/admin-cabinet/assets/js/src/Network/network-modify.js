/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

const networks = {
	$getMyIpButton: $('#getmyip'),
	$formObj: $('#network-form'),
	$dropDowns: $('#network-form .dropdown'),
	$extipaddr:$('#extipaddr'),
	$ipaddressInput: $('.ipaddress'),
	vlansArray: {},
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
	initialize() {
		networks.toggleDisabledFieldClass();
		$('#eth-interfaces-menu .item').tab();

		$('#usenat-checkbox').checkbox({
			onChange() {
				networks.toggleDisabledFieldClass();
			},
		});
		networks.$dropDowns.dropdown();
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

		// Удаление дополнительного сетевого интерфейса
		$('.delete-interface').api({
			url: `${globalRootUrl}network/delete/{value}`,
			method: 'POST',
			beforeSend(settings) {
				$(this).addClass('loading disabled');
				return settings;
			},

			onSuccess(response) {
				$(this).removeClass('loading disabled');
				$('.ui.message.ajax').remove();
				$.each(response.message, (index, value) => {
					networks.$formObj.after(`<div class="ui ${index} message ajax">${value}</div>`);
				});
				if (response.success) window.location.reload();
			},

			onFailure(response) {
				$(this).removeClass('loading disabled');
				$('form').after(response);
			},
		});

		// Очистка настроек дополнительного сетевого
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
	},
	/**
	 * Gets external IP by request to remote server
	 */
	cbAfterGetExternalIp(response) {
		if (response === false) {
			networks.$getMyIpButton.removeClass('loading disabled');
		} else {
			networks.$formObj.form('set value', 'extipaddr', response.ip);
			networks.$extipaddr.trigger('change');
			networks.$getMyIpButton.removeClass('loading disabled');
		}
	},
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
	addNewFormRules(newRowId) {
		const nameClass = `name_${newRowId}`;
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

		const vlanClass = `vlanid_${newRowId}`;
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

		const ipaddrClass = `ipaddr_${newRowId}`;
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

		const dhcpClass = `dhcp_${newRowId}`;
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
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = networks.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = networks.$formObj;
		Form.url = `${globalRootUrl}network/save`;
		Form.validateRules = networks.validateRules;
		Form.cbBeforeSendForm = networks.cbBeforeSendForm;
		Form.cbAfterSendForm = networks.cbAfterSendForm;
		Form.initialize();
	},
};

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

$.fn.form.settings.rules.dhcpOnVlanNetworks = (value, param) => {
	let result = true;
	const vlanValue = networks.$formObj.form('get value', `vlanid_${param}`);
	const dhcpValue = networks.$formObj.form('get value', `dhcp_${param}`);
	if (vlanValue > 0 && dhcpValue === 'on') {
		result = false;
	}
	return result;
};

$.fn.form.settings.rules.extenalIpHost = () => {
	const allValues = networks.$formObj.form('get values');
	if (allValues.usenat === 'on') {
		if (allValues.exthostname === '' && allValues.extipaddr === '') {
			return false;
		}
	}
	return true;
};

$(document).ready(() => {
	networks.initialize();
});
