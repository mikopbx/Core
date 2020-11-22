/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, Form, sessionStorage */

$.fn.form.settings.rules.checkEmptyIfLicenseKeyEmpty = function (value) {
	return ($('#licKey').val().length === 28 || value.length > 0);
};

const licensingModify = {
	$formObj: $('#licencing-modify-form'),
	$dirrtyField: $('#dirrty'),
	$goToLicenseManagementBTN:$('#changePageToLicensing'),
	$emptyLicenseKeyInfo: $('#empty-license-key-info'),
	$filledLicenseKeyInfo: $('#filled-license-key-info'),
	$getNewKeyLicenseSection: $('#getNewKeyLicenseSection'),
	$couponSection: $('#couponSection'),
	$formErrorMessages: $('#form-error-messages'),
	$licKey: $('#licKey'),
	$coupon: $('#coupon'),
	$email: $('#email'),
	$ajaxMessages: $('.ui.message.ajax'),
	$licenseDetailInfo: $('#licenseDetailInfo'),
	$resetButton: $('#reset-license'),
	$productDetails: $('#productDetails'),
	$licensingMenu: $('#licensing-menu .item'),
	$accordions: $('#licencing-modify-form .ui.accordion'),
	defaultLicenseKey: null,
	validateRules: {
		companyname: {
			identifier: 'companyname',
			rules: [
				{
					type: 'checkEmptyIfLicenseKeyEmpty',
					prompt: globalTranslate.lic_ValidateCompanyNameEmpty,
				},
			],
		},
		email: {
			identifier: 'email',
			rules: [
				{
					type: 'checkEmptyIfLicenseKeyEmpty',
					prompt: globalTranslate.lic_ValidateContactEmail,
				},
			],
		},
		contact: {
			identifier: 'contact',
			rules: [
				{
					type: 'checkEmptyIfLicenseKeyEmpty',
					prompt: globalTranslate.lic_ValidateContactName,
				},
			],
		},
		licKey: {
			identifier: 'licKey',
			optional: true,
			rules: [
				{
					type: 'exactLength[28]',
					prompt: globalTranslate.lic_ValidateLicenseKeyEmpty,
				},
			],
		},
		coupon: {
			depends: 'licKey',
			identifier: 'coupon',
			optional: true,
			rules: [
				{
					type: 'exactLength[31]',
					prompt: globalTranslate.lic_ValidateCouponEmpty,
				},
			],
		},
	},
	initialize() {
		licensingModify.$accordions.accordion();
		licensingModify.$licenseDetailInfo.hide();
		licensingModify.$coupon.inputmask('MIKOUPD-*****-*****-*****-*****', {
			onBeforePaste: licensingModify.cbOnCouponBeforePaste,
		});
		licensingModify.$licKey.inputmask('MIKO-*****-*****-*****-*****', {
			oncomplete: licensingModify.cbOnLicenceKeyInputChange,
			onincomplete: licensingModify.cbOnLicenceKeyInputChange,
			clearIncomplete: true,
			onBeforePaste: licensingModify.cbOnLicenceKeyBeforePaste,
		});
		licensingModify.$email.inputmask('email');
		licensingModify.defaultLicenseKey = licensingModify.$licKey.val();

		licensingModify.$licensingMenu.tab({
			historyType: 'hash',
		});

		licensingModify.$resetButton.on('click',()=>{
			licensingModify.$formObj.addClass('loading disabled');
			PbxApi.LicenseResetLicenseKey(licensingModify.cbAfterResetLicenseKey);
		});

		licensingModify.cbOnLicenceKeyInputChange();

		licensingModify.initializeForm();

		if (licensingModify.defaultLicenseKey.length === 28) {
			licensingModify.$filledLicenseKeyInfo
				.html(`${licensingModify.defaultLicenseKey} <i class="spinner loading icon"></i>`)
				.show();
			PbxApi.LicenseGetMikoPBXFeatureStatus(licensingModify.cbAfterGetMikoPBXFeatureStatus);
			PbxApi.LicenseGetLicenseInfo(licensingModify.cbAfterGetLicenseInfo);
			licensingModify.$emptyLicenseKeyInfo.hide();
		} else {
			licensingModify.$filledLicenseKeyInfo.hide();
			licensingModify.$emptyLicenseKeyInfo.show();
		}

		if (licensingModify.defaultLicenseKey !== '') {
			licensingModify.$licensingMenu.tab('change tab', 'management');
		}

		licensingModify.$goToLicenseManagementBTN.on('click',(e)=>{
			e.preventDefault();
			licensingModify.$licensingMenu.tab('change tab', 'management');
		});

	},
	/**
	 * After send ResetLicenseKey callback
	 * @param response
	 */
	cbAfterResetLicenseKey(response){
		licensingModify.$formObj.removeClass('loading disabled');
		if (response!==false) window.location.reload();
	},
	/**
	 * After send GetLicenseInfo callback
	 * @param response
	 */
	cbAfterGetMikoPBXFeatureStatus(response){
		$('.spinner.loading.icon').remove();
		licensingModify.$ajaxMessages.remove();
		if (response===true){
			licensingModify.$formObj.removeClass('error').addClass('success');
			licensingModify.$filledLicenseKeyInfo.after(`<div class="ui success message ajax"><i class="check green icon"></i> ${globalTranslate.lic_LicenseKeyValid}</div>`);
		} else {
			licensingModify.$formObj.addClass('error').removeClass('success');
			licensingModify.$filledLicenseKeyInfo.after(`<div class="ui error message ajax"><i class="exclamation triangle red icon"></i> ${response.messages}</div>`);
		}
	},

	/**
	 * After send GetLicenseInfo callback
	 * @param response
	 */
	cbAfterGetLicenseInfo(response){
		if (response.licenseInfo !== undefined) {
			licensingModify.showLicenseInfo(response.licenseInfo);
			licensingModify.$licenseDetailInfo.show();
		} else {
			licensingModify.$licenseDetailInfo.hide();
		}
	},

	/**
	 * On change license key input field
	 */
	cbOnLicenceKeyInputChange() {
		const licKey = licensingModify.$licKey.val();
		if (licKey.length === 28) {
			licensingModify.$formObj.find('.reginfo input').each((index, obj) => {
				$(obj).attr('hidden', '');
			});
			licensingModify.$getNewKeyLicenseSection.hide();
			licensingModify.$couponSection.show();
			licensingModify.$formErrorMessages.empty();
		} else {
			licensingModify.$formObj.find('.reginfo input').each((index, obj) => {
				$(obj).removeAttr('hidden');
			});
			licensingModify.$getNewKeyLicenseSection.show();
			licensingModify.$couponSection.hide();
		}
	},
	/**
	 * Callback after paste license key
	 */
	cbOnLicenceKeyBeforePaste(pastedValue) {
		if (pastedValue.indexOf('MIKO-') === -1) {
			licensingModify.$licKey.transition('shake');
			return false;
		}
		return pastedValue.replace(/\s+/g, '');
	},
	/**
	 * Callback after paste license coupon
	 */
	cbOnCouponBeforePaste(pastedValue) {
		if (pastedValue.indexOf('MIKOUPD-') === -1) {
			licensingModify.$coupon.transition('shake');
			return false;
		}
		return pastedValue.replace(/\s+/g, '');
	},
	/**
	 * Parses and builds license info presentation
	 */
	showLicenseInfo(message) {
		const licenseData = JSON.parse(message);
		if (licenseData['@attributes'] === undefined) {
			return;
		}
		$('#key-companyname').text(licenseData['@attributes'].companyname);
		$('#key-contact').text(licenseData['@attributes'].contact);
		$('#key-email').text(licenseData['@attributes'].email);
		$('#key-tel').text(licenseData['@attributes'].tel);
		let products = licenseData.product;
		if (!Array.isArray(products)) {
			products = [];
			products.push(licenseData.product);
		}
		$.each(products, (key, productValue) => {
			let row = '<tr><td>';
			let product = productValue;
			if (product['@attributes'] !== undefined) {
				product = productValue['@attributes'];
			}
			const dateExpired = new Date(product.expired.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1/$2/$3'));
			const dateNow = new Date();
			if (dateNow > dateExpired) {
				row += `<div class="ui disabled segment">${product.name}<br>
				<small>${globalTranslate.lic_Expired}</small>`;
			} else if (product.expired.length === 0 && product.trial === '1') {
				row += `<div class="ui disabled segment">${product.name}<br>
				<small>${globalTranslate.lic_Expired}</small>`;
			} else {
				row += `<div class="ui positive message">${product.name}`;
				if (product.expired.length > 0) {
					let expiredText = globalTranslate.lic_ExpiredAfter;
					expiredText = expiredText.replace('%expired%', product.expired);
					row += `<br><small>${expiredText}</small>`;
				}
				row += '<br><span class="features">';
				$.each(productValue.feature, (index, featureValue) => {
					let featureInfo = globalTranslate.lic_FeatureInfo;
					let feature = featureValue;
					if (featureValue['@attributes'] !== undefined) {
						feature = featureValue['@attributes'];
					}
					featureInfo = featureInfo.replace('%name%', feature.name);
					featureInfo = featureInfo.replace('%count%', feature.count);
					featureInfo = featureInfo.replace('%counteach%', feature.counteach);
					featureInfo = featureInfo.replace('%captured%', feature.captured);
					row += `${featureInfo}<br>`;
				});
				row += '</span>';
			}
			row += '</div></td></tr>';
			$('#productDetails tbody').append(row);
		});
	},
	/**
	 * After update license key, get new one, activate coupon
	 * @param response
	 * @param success
	 */
	cbAfterFormProcessing(response, success) {
		if (success===true){
			window.location.reload();
		} else if (response.messages !== undefined) {
			UserMessage.showMultiString(response.messages);
		}else {
			UserMessage.showError(globalTranslate.lic_GetTrialErrorCheckInternet);
		}
		licensingModify.$dirrtyField.val(Math.random());
		licensingModify.$dirrtyField.trigger('change');
	},
	cbBeforeSendForm(settings) {
		return settings;
	},
	cbAfterSendForm() {
		const formData = licensingModify.$formObj.form('get values');
		PbxApi.LicenseProcessUserRequest(formData, licensingModify.cbAfterFormProcessing);
	},
	initializeForm() {
		Form.$formObj = licensingModify.$formObj;
		Form.url = `${globalRootUrl}licensing/save`;
		Form.validateRules = licensingModify.validateRules;
		Form.cbBeforeSendForm = licensingModify.cbBeforeSendForm;
		Form.cbAfterSendForm = licensingModify.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	licensingModify.initialize();
});

