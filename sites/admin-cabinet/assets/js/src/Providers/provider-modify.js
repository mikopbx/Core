/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, $, ClipboardJS */

// custom form validation rule
$.fn.form.settings.rules.username = function (noregister, username) {
	return !(username.length === 0 && noregister !== 'on');
};

const provider = {
	$formObj: $('#save-provider-form'),
	$secret: $('#secret'),
	$dirrtyField: $('#dirrty'),
	providerType: $('#providerType').val(),
	$checkBoxes: $('#save-provider-form .checkbox'),
	$accordions: $('#save-provider-form .ui.accordion'),
	$dropDowns: $('#save-provider-form .ui.dropdown'),
	$deleteRowButton: $('#additional-hosts-table .delete-row-button'),
	$qualifyToggle: $('#qualify'),
	$qualifyFreqToggle: $('#qualify-freq'),
	$additionalHostInput: $('#additional-host input'),
	hostInputValidation: /^((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\/(\d|[1-2]\d|3[0-2]))?|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+)$/gm,
	hostRow: '#save-provider-form .host-row',
	validateRules: {
		description: {
			identifier: 'description',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.pr_ValidationProviderNameIsEmpty,
				},
			],
		},
		host: {
			identifier: 'host',
			rules: [
				{
					type: 'checkHostProvider',
					prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
				},
			],
		},
		username: {
			identifier: 'username',
			optional   : true,
			rules: [
				{
					type: 'minLength[2]',
					prompt: globalTranslate.pr_ValidationProviderLoginNotSingleSimbol,
				},
			],
		},
		port: {
			identifier: 'port',
			rules: [
				{
					type: 'integer[1..65535]',
					prompt: globalTranslate.pr_ValidationProviderPortRange,
				},
			],
		},
	},
	initialize() {
		provider.$checkBoxes.checkbox();
		provider.$accordions.accordion();
		provider.$dropDowns.dropdown();
		provider.$qualifyToggle.checkbox({
			onChange() {
				if (provider.$qualifyToggle.checkbox('is checked')) {
					provider.$qualifyFreqToggle.removeClass('disabled');
				} else {
					provider.$qualifyFreqToggle.addClass('disabled');
				}
			},
		});
		// Add new string to additional-hosts-table table
		provider.$additionalHostInput.keypress((e)=>{
			if (e.which === 13) {
				provider.cbOnCompleteHostAddress();
			}
		});
		// Delete host from additional-hosts-table
		provider.$deleteRowButton.on('click', (e) => {
			$(e.target).closest('tr').remove();
			provider.updateHostsTableView();
			provider.$dirrtyField.val(Math.random());
			provider.$dirrtyField.trigger('change');
			e.preventDefault();
			return false;
		});
		provider.initializeForm();

		provider.updateVisibilityElements();
		$('#registration_type').on('change', provider.updateVisibilityElements);
		$('#disablefromuser input').on('change', provider.updateVisibilityElements);

		$('#generate-new-password').on('click', (e) => {
			e.preventDefault();
			const chars = 'abcdef1234567890';
			let pass = '';
			for (let x = 0; x < 32; x += 1) {
				const i = Math.floor(Math.random() * chars.length);
				pass += chars.charAt(i);
			}
			provider.$secret.val(pass);
			provider.$secret.trigger('change');
		});
		provider.$secret.on('change', () => {
			$('#elSecret a.ui.button.clipboard').attr('data-clipboard-text', provider.$secret.val())
		});
		const clipboard = new ClipboardJS('.clipboard');
		$('.clipboard').popup({
			on: 'manual',
		});
		clipboard.on('success', (e) => {
			$(e.trigger).popup('show');
			setTimeout(() => {
				$(e.trigger).popup('hide');
			}, 1500);
			e.clearSelection();
		});

		clipboard.on('error', (e) => {
			console.error('Action:', e.action);
			console.error('Trigger:', e.trigger);
		});
	},
	updateVisibilityElements(){
		if(provider.providerType !== 'SIP'){
			return;
		}
		let elHost 	    	= $('#elHost');
		let elUsername  	= $('#elUsername');
		let elSecret    	= $('#elSecret');
		let elAdditionalHost= $('#elAdditionalHosts');
		let regType 		= $('#registration_type').val();
		let elUniqId		= $('#uniqid');
		let genPassword		= $('#generate-new-password');

		let valUserName  	= $('#username');
		let valSecret   	= provider.$secret;

		if(valUserName.val() === elUniqId.val()){
			valUserName.val('');
		}
		valUserName.removeAttr('readonly');
		if(regType === 'outbound'){
			elHost.show();
			elUsername.show();
			elSecret.show();
			elAdditionalHost.show();
			genPassword.hide();
		}else if(regType === 'inbound'){
			valUserName.val(elUniqId.val());
			valUserName.attr('readonly', '');
			if(valSecret.val().trim() === ''){
				valSecret.val('id='+$('#id').val()+'-'+elUniqId.val())
			}
			elHost.hide();
			elUsername.show();
			elSecret.show();
			genPassword.show();
		}else if(regType === 'none'){
			elHost.show();
			elUsername.hide();
			elSecret.hide();
		}

		let el = $('#disablefromuser');
		let fromUser = $('#divFromUser');
		if(el.checkbox('is checked')){
			fromUser.hide();
			fromUser.removeClass('visible');
		}else{
			fromUser.show();
			fromUser.addClass('visible');

		}
	},
	/**
	 * Adds record to hosts table
	 */
	cbOnCompleteHostAddress(){
		const value = provider.$formObj.form('get value', 'additional-host');
		if (value) {
			const validation = value.match(provider.hostInputValidation);
			if (validation===null
				|| validation.length===0){
				provider.$additionalHostInput.transition('shake');
				return;
			}

			if ($(`.host-row[data-value="${value}"]`).length===0){
				const $tr = $('.host-row-tpl').last();
				const $clone = $tr.clone(true);
				$clone
					.removeClass('host-row-tpl')
					.addClass('host-row')
					.show();
				$clone.attr('data-value', value);
				$clone.find('.address').html(value);
				if ($(provider.hostRow).last().length === 0) {
					$tr.after($clone);
				} else {
					$(provider.hostRow).last().after($clone);
				}
				provider.updateHostsTableView();
				provider.$dirrtyField.val(Math.random());
				provider.$dirrtyField.trigger('change');
			}
			provider.$additionalHostInput.val('');
		}
	},
	/**
	 * Shows dummy if we have zero rows
	 */
	updateHostsTableView() {
		const dummy = `<tr class="dummy"><td colspan="4" class="center aligned">${globalTranslate.pr_NoAnyAdditionalHosts}</td></tr>`;

		if ($(provider.hostRow).length === 0) {
			$('#additional-hosts-table tbody').append(dummy);
		} else {
			$('#additional-hosts-table tbody .dummy').remove();
		}
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = provider.$formObj.form('get values');

		const arrAdditionalHosts = [];
		$(provider.hostRow).each((index, obj) => {
			if ($(obj).attr('data-value')) {
				arrAdditionalHosts.push({
					address: $(obj).attr('data-value'),
				});
			}
		});
		result.data.additionalHosts = JSON.stringify(arrAdditionalHosts);
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = provider.$formObj;
		Form.$formObj.form.settings.rules.checkHostProvider = (value) => {
			let enable;
			if($('#registration_type').val() === 'inbound'){
				enable = true;
			}else{
				enable = value.trim() !== '';
			}
			return enable;
		};
		switch (provider.providerType) {
			case 'SIP':
				Form.url = `${globalRootUrl}providers/save/sip`;
				break;
			case 'IAX':
				Form.url = `${globalRootUrl}providers/save/iax`;
				break;
			default:
				return;
		}
		Form.validateRules = provider.validateRules;
		Form.cbBeforeSendForm = provider.cbBeforeSendForm;
		Form.cbAfterSendForm = provider.cbAfterSendForm;
		Form.initialize();
	},
};



$(document).ready(() => {
	provider.initialize();
});
