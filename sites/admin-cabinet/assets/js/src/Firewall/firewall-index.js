/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate */

const firewallTable = {
	$statusToggle: $('#status-toggle'),
	$addNewButton: $('#add-new-button'),
	$settings: $('#firewall-settings'),
	initialize() {
		$('.rule-row td').on('dblclick', (e) => {
			const id = $(e.target).closest('tr').attr('id');
			window.location = `${globalRootUrl}firewall/modify/${id}`;
		});
		firewallTable.$statusToggle
			.checkbox({
				onChecked() {
					firewallTable.enableFirewall();
				},
				onUnchecked() {
					firewallTable.disableFirewall();
				},
			});
	},
	/**
	 * Включить firewall
	 */
	enableFirewall() {
		$.api({
			url: `${globalRootUrl}firewall/enable`,
			on: 'now',
			onSuccess(response) {
				if (response.success) {
					firewallTable.cbAfterEnabled(true);
				} else {
					firewallTable.cbAfterDisabled();
				}
			},

		});
	},
	/**
	 * Включить firewall
	 */
	disableFirewall() {
		$.api({
			url: `${globalRootUrl}firewall/disable`,
			on: 'now',
			onSuccess(response) {
				if (response.success) {
					firewallTable.cbAfterDisabled(true);
				} else {
					firewallTable.cbAfterEnabled();
				}
			},

		});
	},
	/**
	 * Обработчки после включения firewall
	 */
	cbAfterEnabled(sendEvent = false) {
		firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusEnabled);
		firewallTable.$statusToggle.checkbox('set checked');
		$('i.icon.checkmark.green[data-value="off"]')
			.removeClass('checkmark green')
			.addClass('close red');
		$('i.icon.corner.close').hide();

		if (sendEvent) {
			const event = document.createEvent('Event');
			event.initEvent('ConfigDataChanged', false, true);
			window.dispatchEvent(event);
		}
	},
	/**
	 * Обработчки после выключения firewall
	 */
	cbAfterDisabled(sendEvent = false) {
		firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusDisabled);
		firewallTable.$statusToggle.checkbox('set unchecked');
		$('i.icon.close.red[data-value="off"]')
			.removeClass('close red')
			.addClass('checkmark green');
		$('i.icon.corner.close').show();
		if (sendEvent) {
			const event = document.createEvent('Event');
			event.initEvent('ConfigDataChanged', false, true);
			window.dispatchEvent(event);
		}
	},
};

$(document).ready(() => {
	firewallTable.initialize();
});

