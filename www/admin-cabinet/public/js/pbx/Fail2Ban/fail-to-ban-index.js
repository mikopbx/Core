"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global globalTranslate, PbxApi, Form, globalRootUrl */
var fail2BanIndex = {
	$formObj: $('#fail2ban-settings-form'),
	$bannedIpList: $('#banned-ip-list'),
	$unbanButons: $('.unban-button'),
	$enableCheckBox: $('#fail2ban-switch'),
	validateRules: {
		maxretry: {
			identifier: 'maxretry',
			rules: [{
				type: 'integer[3..99]',
				prompt: globalTranslate.f2b_ValidateMaxRetryRange
			}]
		},
		findtime: {
			identifier: 'findtime',
			rules: [{
				type: 'integer[300..86400]',
				prompt: globalTranslate.f2b_ValidateFindTimeRange
			}]
		},
		bantime: {
			identifier: 'bantime',
			rules: [{
				type: 'integer[300..86400]',
				prompt: globalTranslate.f2b_ValidateBanTimeRange
			}]
		}
	},
	initialize: function () {
		function initialize() {
			PbxApi.SystemGetBannedIp(fail2BanIndex.cbGetBannedIpList);
			fail2BanIndex.$bannedIpList.on('click', fail2BanIndex.$unbanButons, function (e) {
				var unbannedIp = $(e.target).attr('data-value');
				var data = {
					ip: unbannedIp
				};
				PbxApi.SystemUnBanIp(data, fail2BanIndex.cbAfterUnBanIp);
			});
			fail2BanIndex.$enableCheckBox.checkbox({
				onChange: function () {
					function onChange() {
						fail2BanIndex.changeFieldsLook();
					}

					return onChange;
				}()
			});
			fail2BanIndex.changeFieldsLook();
			fail2BanIndex.initializeForm();
		}

		return initialize;
	}(),
	changeFieldsLook: function () {
		function changeFieldsLook() {
			var checked = fail2BanIndex.$enableCheckBox.checkbox('is checked');
			fail2BanIndex.$formObj.find('.disability').each(function (index, obj) {
				if (checked) {
					$(obj).removeClass('disabled');
				} else {
					$(obj).addClass('disabled');
				}
			});
		}

		return changeFieldsLook;
	}(),
	cbGetBannedIpList: function () {
		function cbGetBannedIpList(response) {
			var htmlTable = "<h2 class=\"ui header\">".concat(globalTranslate.f2b_TableBannedHeader, "</h2>");
			htmlTable += '<table class="ui very compact table">';
			htmlTable += '<thead>';
			htmlTable += "<th>".concat(globalTranslate.f2b_Reason, "</th>");
			htmlTable += "<th>".concat(globalTranslate.f2b_IpAddres, "</th>");
			htmlTable += "<th>".concat(globalTranslate.f2b_BanedTime, "</th>");
			htmlTable += '<th></th>';
			htmlTable += '</thead>';
			htmlTable += '<tbody>';
			response.sort(function (a, b) {
				var keyA = a.timeofban;
				var keyB = b.timeofban; // Compare the 2 dates

				if (keyA < keyB) return 1;
				if (keyA > keyB) return -1;
				return 0;
			});
			$.each(response, function (key, value) {
				var blockDate = new Date(value.timeofban * 1000);
				var reason = "f2b_Jail_".concat(value.jail);

				if (reason in globalTranslate) {
					reason = globalTranslate[reason];
				}

				htmlTable += '<tr>';
				htmlTable += "<td>".concat(reason, "</td>");
				htmlTable += "<td>".concat(value.ip, "</td>");
				htmlTable += "<td>".concat(blockDate.toLocaleString(), "</td>");
				htmlTable += "<td class=\"right aligned collapsing\"><button class=\"ui icon basic mini button unban-button\" data-value=\"".concat(value.ip, "\"><i class=\"icon trash red\"></i>").concat(globalTranslate.f2b_Unban, "</button></td>");
				htmlTable += '</tr>';
			});

			if (response.length === 0) {
				htmlTable += "<tr><td colspan=\"4\" class=\"center aligned\">".concat(globalTranslate.f2b_TableBannedEmpty, "</td></tr>");
			}

			htmlTable += '<tbody>';
			htmlTable += '</table>';
			fail2BanIndex.$bannedIpList.html(htmlTable);
		}

		return cbGetBannedIpList;
	}(),
	cbAfterUnBanIp: function () {
		function cbAfterUnBanIp() {
			PbxApi.SystemGetBannedIp(fail2BanIndex.cbGetBannedIpList);
		}

		return cbAfterUnBanIp;
	}(),
	cbBeforeSendForm: function () {
		function cbBeforeSendForm(settings) {
			var result = settings;
			result.data = fail2BanIndex.$formObj.form('get values');
			return result;
		}

		return cbBeforeSendForm;
	}(),
	cbAfterSendForm: function () {
		function cbAfterSendForm() {
		}

		return cbAfterSendForm;
	}(),
	initializeForm: function () {
		function initializeForm() {
			Form.$formObj = fail2BanIndex.$formObj;
			Form.url = "".concat(globalRootUrl, "fail2-ban/save");
			Form.validateRules = fail2BanIndex.validateRules;
			Form.cbBeforeSendForm = fail2BanIndex.cbBeforeSendForm;
			Form.cbAfterSendForm = fail2BanIndex.cbAfterSendForm;
			Form.initialize();
		}

		return initializeForm;
	}()
};
$(document).ready(function () {
	fail2BanIndex.initialize();
});
//# sourceMappingURL=fail-to-ban-index.js.map