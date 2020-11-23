/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalTranslate, PbxApi, Form, globalRootUrl */

const fail2BanIndex = {
	$formObj: $('#fail2ban-settings-form'),
	$bannedIpList: $('#banned-ip-list'),
	$unbanButons: $('.unban-button'),
	$enableCheckBox: $('#fail2ban-switch'),
	validateRules: {
		maxretry: {
			identifier: 'maxretry',
			rules: [
				{
					type: 'integer[3..99]',
					prompt: globalTranslate.f2b_ValidateMaxRetryRange,
				},
			],
		},
		findtime: {
			identifier: 'findtime',
			rules: [
				{
					type: 'integer[300..86400]',
					prompt: globalTranslate.f2b_ValidateFindTimeRange,
				},
			],
		},
		bantime: {
			identifier: 'bantime',
			rules: [
				{
					type: 'integer[300..86400]',
					prompt: globalTranslate.f2b_ValidateBanTimeRange,
				},
			],
		},
	},

	initialize() {
		PbxApi.SystemGetBannedIp(fail2BanIndex.cbGetBannedIpList);
		fail2BanIndex.$bannedIpList.on('click', fail2BanIndex.$unbanButons, (e) => {
			const unbannedIp = $(e.target).attr('data-value');
			PbxApi.SystemUnBanIp(unbannedIp, fail2BanIndex.cbAfterUnBanIp);
		});

		fail2BanIndex.$enableCheckBox.checkbox({
			onChange() {
				fail2BanIndex.changeFieldsLook();
			},
		});
		fail2BanIndex.changeFieldsLook();
		fail2BanIndex.initializeForm();
	},
	changeFieldsLook() {
		const checked = fail2BanIndex.$enableCheckBox.checkbox('is checked');
		fail2BanIndex.$formObj.find('.disability').each((index, obj) => {
			if (checked) {
				$(obj).removeClass('disabled');
			} else {
				$(obj).addClass('disabled');
			}
		});
	},
	cbGetBannedIpList(response) {
		if (response===false){
			return;
		}
		let htmlTable = `<h2 class="ui header">${globalTranslate.f2b_TableBannedHeader}</h2>`;
		htmlTable += '<table class="ui very compact table">';
		htmlTable += '<thead>';
		htmlTable += `<th>${globalTranslate.f2b_Reason}</th>`;
		htmlTable += `<th>${globalTranslate.f2b_IpAddres}</th>`;
		htmlTable += `<th>${globalTranslate.f2b_BanedTime}</th>`;
		htmlTable += '<th></th>';
		htmlTable += '</thead>';
		htmlTable += '<tbody>';
		response.sort((a, b) => {
			const keyA = a.timeofban;
			const keyB = b.timeofban;
			// Compare the 2 dates
			if (keyA < keyB) return 1;
			if (keyA > keyB) return -1;
			return 0;
		});
		$.each(response, (key, value) => {
			const blockDate = new Date(value.timeofban * 1000);
			let reason = `f2b_Jail_${value.jail}`;
			if (reason in globalTranslate) {
				reason = globalTranslate[reason];
			}

			htmlTable += '<tr>';
			htmlTable += `<td>${reason}</td>`;
			htmlTable += `<td>${value.ip}</td>`;
			htmlTable += `<td>${blockDate.toLocaleString()}</td>`;
			htmlTable += `<td class="right aligned collapsing"><button class="ui icon basic mini button unban-button" data-value="${value.ip}"><i class="icon trash red"></i>${globalTranslate.f2b_Unban}</button></td>`;
			htmlTable += '</tr>';
		});
		if (response.length === 0) {
			htmlTable += `<tr><td colspan="4" class="center aligned">${globalTranslate.f2b_TableBannedEmpty}</td></tr>`;
		}
		htmlTable += '<tbody>';
		htmlTable += '</table>';
		fail2BanIndex.$bannedIpList.html(htmlTable);
	},
	cbAfterUnBanIp() {
		PbxApi.SystemGetBannedIp(fail2BanIndex.cbGetBannedIpList);
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = fail2BanIndex.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = fail2BanIndex.$formObj;
		Form.url = `${globalRootUrl}fail2-ban/save`;
		Form.validateRules = fail2BanIndex.validateRules;
		Form.cbBeforeSendForm = fail2BanIndex.cbBeforeSendForm;
		Form.cbAfterSendForm = fail2BanIndex.cbAfterSendForm;
		Form.initialize();
	},
};
$(document).ready(() => {
	fail2BanIndex.initialize();
});

