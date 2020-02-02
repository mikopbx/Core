/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, Form */


$.fn.form.settings.rules.checkEmptyIfLicenseKeyEmpty = function (value) {
	return ($('#licKey').val().length === 28 || value.length > 0);
};

const licensingModify = {
	$formObj: $('#licencing-modify-form'),
	$emptyLicenseKeyInfo: $('#empty-license-key-info'),
	$filledLicenseKeyInfo: $('#filled-license-key-info'),
	$licKey: $('#licKey'),
	$coupon: $('#coupon'),
	$email: $('#email'),
	$ajaxMessages: $('.ui.message.ajax'),
	$licenseDetailInfo: $('#licenseDetailInfo'),
	$resetButton: $('#reset-license'),
	$productDetails: $('#productDetails'),
	$licensingMenu: $('#licensing-menu .item'),
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
		$('.ui.accordion').accordion();
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
			history: true,
			historyType: 'hash',
		});
		licensingModify.$resetButton.api({
			url: `${globalRootUrl}licensing/resetSettings`,
			method: 'GET',
			beforeSend(settings) {
				$(this).addClass('loading disabled');
				return settings;
			},
			onSuccess(response) {
				$(this).removeClass('loading disabled');
				licensingModify.$ajaxMessages.remove();
				if (response.success) window.location.reload();
			},
			onFailure(response) {
				$(this).removeClass('loading disabled');
				$('form').after(response);
			},
		});

		licensingModify.cbOnLicenceKeyInputChange();
		licensingModify.initializeForm();


		if (licensingModify.defaultLicenseKey.length === 28) {
			licensingModify.$filledLicenseKeyInfo
				.html(`${licensingModify.defaultLicenseKey} <i class="spinner loading icon"></i>`)
				.show();

			//  Проверим доступность фичии
			$.api({
				url: `${globalRootUrl}licensing/getBaseFeatureStatus/${licensingModify.defaultLicenseKey}`,
				on: 'now',
				successTest(response) {
					// test whether a JSON response is valid
					return response !== undefined
						&& Object.keys(response).length > 0
						&& response.success === true;
				},
				onSuccess() {
					licensingModify.$formObj.removeClass('error').addClass('success');
					licensingModify.$ajaxMessages.remove();
					licensingModify.$filledLicenseKeyInfo.after(`<div class="ui success message ajax"><i class="check green icon"></i> ${globalTranslate.lic_LicenseKeyValid}</div>`);
					$('.spinner.loading.icon').remove();
				},
				onFailure(response) {
					licensingModify.$formObj.addClass('error').removeClass('success');
					licensingModify.$ajaxMessages.remove();
					licensingModify.$filledLicenseKeyInfo.after(`<div class="ui error message ajax"><i class="exclamation triangle red icon"></i> ${response.message}</div>`);
					$('.spinner.loading.icon').remove();
				},
			});


			// Получим информациию о лицензии
			$.api({
				url: `${globalRootUrl}licensing/getLicenseInfo/${licensingModify.defaultLicenseKey}`,
				on: 'now',
				onSuccess(response) {
					licensingModify.cbShowLicenseInfo(response);
				},
				onError(errorMessage, element, xhr) {
					if (xhr.status === 403) {
						window.location = `${globalRootUrl}session/index`;
					}
				},
			});
			// PbxApi.CheckLicense(licensingModify.cbCheckLicenseKey);
			licensingModify.$emptyLicenseKeyInfo.hide();
		} else {
			licensingModify.$filledLicenseKeyInfo.hide();
			licensingModify.$emptyLicenseKeyInfo.show();
		}

		if (licensingModify.defaultLicenseKey !== '') {
			licensingModify.$licensingMenu.tab('change tab', 'management');
		}
	},
	/**
	 * Обработчик при вводе ключа
	 */
	cbOnLicenceKeyInputChange() {
		const licKey = licensingModify.$licKey.val();
		if (licKey.length === 28) {
			licensingModify.$formObj.find('.reginfo input').each((index, obj) => {
				$(obj).attr('hidden', '');
			});
			$('#getTrialLicenseSection').hide();
			$('#couponSection').show();
			$('#form-error-messages').empty();
		} else {
			licensingModify.$formObj.find('.reginfo input').each((index, obj) => {
				$(obj).removeAttr('hidden');
			});
			$('#getTrialLicenseSection').show();
			$('#couponSection').hide();
		}
	},
	/**
	 * Показать GetLicenseInfo
	 * @param response
	 */
	cbShowLicenseInfo(response) {
		if (response !== undefined && response.message !== 'null') {
			licensingModify.showLicenseInfo(response.message);
			licensingModify.$licenseDetailInfo.show();
		} else {
			licensingModify.$licenseDetailInfo.hide();
		}
	},
	/**
	 * Обработка вставки ключа из буффера обмена
	 */
	cbOnLicenceKeyBeforePaste(pastedValue) {
		if (pastedValue.indexOf('MIKO-') === -1) {
			licensingModify.$licKey.transition('shake');
			return false;
		}
		return pastedValue.replace(/\s+/g, '');
	},
	/**
	 * Обработка вставки купона из буффера обмена
	 */
	cbOnCouponBeforePaste(pastedValue) {
		if (pastedValue.indexOf('MIKOUPD-') === -1) {
			licensingModify.$coupon.transition('shake');
			return false;
		}
		return pastedValue.replace(/\s+/g, '');
	},
	/**
	 * Строит отображение информации о лицензировании ПП
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
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = licensingModify.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {
		licensingModify.defaultLicenseKey = licensingModify.$licKey.val();
		localStorage.clear('previousLicenseCheckResult');
	},
	initializeForm() {
		Form.$formObj = licensingModify.$formObj;
		Form.url = `${globalRootUrl}licensing/updateLicense`;
		Form.validateRules = licensingModify.validateRules;
		Form.cbBeforeSendForm = licensingModify.cbBeforeSendForm;
		Form.cbAfterSendForm = licensingModify.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	licensingModify.initialize();
});

