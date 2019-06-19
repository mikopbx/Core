"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl,globalTranslate, Form */
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

var firewall = {
	$formObj: $('#firewall-form'),
	validateRules: {
		network: {
			identifier: 'network',
			rules: [{
				type: 'ipaddr',
				prompt: globalTranslate.fw_ValidatePermitAddress
			}]
		},
		description: {
			identifier: 'description',
			rules: [{
				type: 'empty',
				prompt: globalTranslate.fw_ValidateRuleName
			}]
		}
	},
	initialize: function () {
		function initialize() {
			$('.rules, .checkbox').checkbox();
			$('.dropdown').dropdown();
			firewall.initializeForm();
		}

		return initialize;
	}(),
	cbBeforeSendForm: function () {
		function cbBeforeSendForm(settings) {
			var result = settings;
			result.data = firewall.$formObj.form('get values');
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
			Form.$formObj = firewall.$formObj;
			Form.url = "".concat(globalRootUrl, "firewall/save");
			Form.validateRules = firewall.validateRules;
			Form.cbBeforeSendForm = firewall.cbBeforeSendForm;
			Form.cbAfterSendForm = firewall.cbAfterSendForm;
			Form.initialize();
		}

		return initializeForm;
	}()
};
$(document).ready(function () {
	firewall.initialize();
});
//# sourceMappingURL=firewall-modify.js.map