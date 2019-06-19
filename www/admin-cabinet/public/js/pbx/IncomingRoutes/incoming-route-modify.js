"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl,globalTranslate, Extensions, Form */
var incomingRouteModify = {
	$formObj: $('#incoming-route-form'),
	validateRules: {
		extension: {
			identifier: 'extension',
			rules: [{
				type: 'empty',
				prompt: globalTranslate.ir_ValidateForwardingToBeFilled
			}]
		},
		timeout: {
			identifier: 'timeout',
			rules: [{
				type: 'integer[10..180]',
				prompt: globalTranslate.ir_ValidateTimeoutOutOfRange
			}]
		}
	},
	initialize: function () {
		function initialize() {
			$('#provider').dropdown();
			incomingRouteModify.initializeForm();
			$('.forwarding-select').dropdown(Extensions.getDropdownSettingsWithoutEmpty());
			Extensions.fixBugDropdownIcon();
		}

		return initialize;
	}(),
	cbBeforeSendForm: function () {
		function cbBeforeSendForm(settings) {
			var result = settings;
			result.data = incomingRouteModify.$formObj.form('get values');
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
			Form.$formObj = incomingRouteModify.$formObj;
			Form.url = "".concat(globalRootUrl, "incoming-routes/save");
			Form.validateRules = incomingRouteModify.validateRules;
			Form.cbBeforeSendForm = incomingRouteModify.cbBeforeSendForm;
			Form.cbAfterSendForm = incomingRouteModify.cbAfterSendForm;
			Form.initialize();
		}

		return initializeForm;
	}()
};
$(document).ready(function () {
	incomingRouteModify.initialize();
});
//# sourceMappingURL=incoming-route-modify.js.map