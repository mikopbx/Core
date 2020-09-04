/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, Form */

const outboundRoute = {
	$formObj: $('#outbound-route-form'),
	$providerDropDown: $('#providerid'),
	validateRules: {
		rulename: {
			identifier: 'rulename',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.or_ValidationPleaseEnterRuleName,
				},
			],
		},
		provider: {
			identifier: 'providerid',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.or_ValidationPleaseSelectProvider,
				},
			],
		},
		numberbeginswith: {
			identifier: 'numberbeginswith',
			rules: [
				{
					type: 'regExp',
					value: '/^(|[0-9#+()\\[\\-\\]\\{\\}|]{1,64})$/',
					prompt: globalTranslate.or_ValidateBeginPattern,
				},
			],
		},
		restnumbers: {
			identifier: 'restnumbers',
			optional: true,
			rules: [
				{
					type: 'integer[0..99]',
					prompt: globalTranslate.or_ValidateRestNumbers,
				},
			],
		},
		trimfrombegin: {
			identifier: 'trimfrombegin',
			optional: true,
			rules: [
				{
					type: 'integer[0..99]',
					prompt: globalTranslate.or_ValidateTrimFromBegin,
				},
			],
		},

		prepend: {
			identifier: 'prepend',
			optional: true,
			rules: [
				{
					type: 'regExp',
					value: '/^[0-9#w+]{0,20}$/',
					prompt: globalTranslate.or_ValidatePrepend,
				},
			],
		},
	},
	initialize() {
		outboundRoute.$providerDropDown.dropdown();
		outboundRoute.initializeForm();
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = outboundRoute.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {

	},
	initializeForm() {
		Form.$formObj = outboundRoute.$formObj;
		Form.url = `${globalRootUrl}outbound-routes/save`;
		Form.validateRules = outboundRoute.validateRules;
		Form.cbBeforeSendForm = outboundRoute.cbBeforeSendForm;
		Form.cbAfterSendForm = outboundRoute.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	outboundRoute.initialize();
});

