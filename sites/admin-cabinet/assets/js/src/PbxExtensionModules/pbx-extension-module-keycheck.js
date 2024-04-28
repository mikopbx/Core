/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, sessionStorage, globalPBXLicense, UserMessage*/


/**
 * Object for managing modules license key
 *
 * @module keyCheck
 */
const keyCheck = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#licencing-modify-form'),

    $emptyLicenseKeyInfo: $('.empty-license-key-info'),
    $filledLicenseKeyHeader: $('.filled-license-key-header'),
    $filledLicenseKeyInfo: $('.filled-license-key-info'),
    $filledLicenseKeyPlaceholder: $('.filled-license-key-info .confidential-field'),
    $getNewKeyLicenseSection: $('#getNewKeyLicenseSection'),
    $couponSection: $('#couponSection'),
    $formErrorMessages: $('#form-error-messages'),
    $licKey: $('#licKey'),
    $coupon: $('#coupon'),
    $email: $('#email'),
    $ajaxMessages: $('.ui.message.ajax'),
    $licenseDetailInfo: $('#licenseDetailInfo'),
    $productDetails: $('#productDetails'),
    $accordions: $('#licencing-modify-form .ui.accordion'),

    $resetButton: $('#reset-license-button'),
    $saveKeyButton: $('#save-license-key-button'),
    $activateCouponButton: $('#coupon-activation-button'),
    $manageKeyButton: $('#manage-license-button'),

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
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

    // Initialize the licensing page.
    initialize() {
        keyCheck.$accordions.accordion();
        keyCheck.$licenseDetailInfo.hide();

        // Set input mask for coupon code field
        keyCheck.$coupon.inputmask('MIKOUPD-*****-*****-*****-*****', {
            onBeforePaste: keyCheck.cbOnCouponBeforePaste,
        });

        // Set input mask for license key field
        keyCheck.$licKey.inputmask('MIKO-*****-*****-*****-*****', {
            oncomplete: keyCheck.cbOnLicenceKeyInputChange,
            onincomplete: keyCheck.cbOnLicenceKeyInputChange,
            clearIncomplete: true,
            onBeforePaste: keyCheck.cbOnLicenceKeyBeforePaste,
        });

        keyCheck.$email.inputmask('email');

        // Restore previous license error message to prevent blinking
        // const previousKeyMessage = sessionStorage.getItem(`previousKeyMessage${globalWebAdminLanguage}`);
        // if (previousKeyMessage && globalPBXLicense.length>0) {
        //     UserMessage.showLicenseError(globalTranslate.lic_LicenseProblem, JSON.parse(previousKeyMessage),true)
        // }

        // Handle save key button click
        keyCheck.$saveKeyButton.on('click', () => {
            if (keyCheck.$licKey.inputmask('unmaskedvalue').length===20){
                keyCheck.$formObj.addClass('loading disabled');
                keyCheck.$saveKeyButton.addClass('loading disabled');
                Form.submitForm();
            } else {
                keyCheck.$saveKeyButton.transition('shake');
            }
        });

        // Handle reset button click
        keyCheck.$resetButton.on('click', () => {
            keyCheck.$formObj.addClass('loading disabled');
            keyCheck.$resetButton.addClass('loading disabled');
            PbxApi.LicenseResetLicenseKey(keyCheck.cbAfterResetLicenseKey);
        });

        // Handle activate coupon button click
        keyCheck.$activateCouponButton.on('click', () => {
            if (keyCheck.$coupon.inputmask('unmaskedvalue').length===20 &&keyCheck.$licKey.inputmask('unmaskedvalue').length===20){
                keyCheck.$formObj.addClass('loading disabled');
                keyCheck.$activateCouponButton.addClass('loading disabled');
                Form.submitForm();
            } else {
                keyCheck.$activateCouponButton.transition('shake');
            }
        });

        keyCheck.cbOnLicenceKeyInputChange();

        keyCheck.initializeForm();

        // Check if a license key is present
        if (globalPBXLicense.length === 28) {
            keyCheck.$filledLicenseKeyPlaceholder.html(`${globalPBXLicense} <i class="spinner loading icon"></i>`);
            keyCheck.$filledLicenseKeyHeader.show();
            keyCheck.$manageKeyButton.attr('href',Config.keyManagementUrl);
            PbxApi.LicenseGetMikoPBXFeatureStatus(keyCheck.cbAfterGetMikoPBXFeatureStatus);
            keyCheck.$emptyLicenseKeyInfo.hide();
            keyCheck.$filledLicenseKeyInfo.show();
        } else {
            keyCheck.$filledLicenseKeyHeader.hide();
            keyCheck.$filledLicenseKeyInfo.hide();
            keyCheck.$emptyLicenseKeyInfo.show();
        }
    },

    /**
     * Callback function triggered after resetting the license key.
     * @param {boolean} response - The response indicating the success of the license key reset.
     */
    cbAfterResetLicenseKey(response) {
        // Remove the loading and disabled classes from the form
        keyCheck.$formObj.removeClass('loading disabled');
        keyCheck.$resetButton.removeClass('loading disabled');
        if (response !== false) {
            // If the response is not false, indicating a successful license key reset,
            // reload the window to apply the changes
            window.location.reload();
        }
    },

    /**
     * Callback function triggered after getting the MikoPBX feature status.
     * @param {boolean|Object} response - The response indicating the MikoPBX feature status.
     */
    cbAfterGetMikoPBXFeatureStatus(response) {
        // Remove the loading spinner and any previous AJAX messages
        $('.spinner.loading.icon').remove();
        if (response === true) {
            // MikoPBX feature status is true (valid)
            keyCheck.$formObj.removeClass('error').addClass('success');
            keyCheck.$filledLicenseKeyPlaceholder.html(`${globalPBXLicense} <i class="check green icon"></i>`)
            keyCheck.$filledLicenseKeyHeader.show();
            sessionStorage.removeItem(`previousKeyMessage${globalWebAdminLanguage}`);
        } else {
            // MikoPBX feature status is false or an error occurred
            if (response === false || response.messages === undefined) {
                // Failed to check license status (response is false or no messages available)
                UserMessage.showMultiString(globalTranslate.lic_FailedCheckLicenseNotPbxResponse, globalTranslate.lic_LicenseProblem);
                keyCheck.$filledLicenseKeyHeader.show();
            } else {
                // Failed to check license status with error messages
                //sessionStorage.setItem(`previousKeyMessage${globalWebAdminLanguage}`, JSON.stringify(response.messages));
                //UserMessage.showLicenseError(globalTranslate.lic_LicenseProblem, response.messages, true);
                keyCheck.$filledLicenseKeyHeader.show();
            }
        }
    },

    /**
     * Callback function triggered after retrieving the license information.
     * @param {Object} response - The response containing the license information.
     */
    cbAfterGetLicenseInfo(response) {
        if (response.licenseInfo !== undefined) {
            // License information is available
            keyCheck.showLicenseInfo(response.licenseInfo);
            keyCheck.$licenseDetailInfo.show();
        } else {
            // License information is not available
            keyCheck.$licenseDetailInfo.hide();
        }
    },

    /**
     * Callback function triggered when there is a change in the license key input.
     */
    cbOnLicenceKeyInputChange() {
        if (keyCheck.$licKey.inputmask('unmaskedvalue').length === 20) {
            // License key is complete
            keyCheck.$formObj.find('.reginfo input').each((index, obj) => {
                $(obj).attr('hidden', '');
            });
            keyCheck.$getNewKeyLicenseSection.hide();
            keyCheck.$couponSection.show();
            keyCheck.$formErrorMessages.empty();
        } else {
            // License key is incomplete
            keyCheck.$formObj.find('.reginfo input').each((index, obj) => {
                $(obj).removeAttr('hidden');
            });
            keyCheck.$getNewKeyLicenseSection.show();
            keyCheck.$couponSection.hide();
        }
    },

    /**
     * Callback function triggered before pasting a value into the license key field.
     * @param {string} pastedValue - The value being pasted into the field.
     * @returns {boolean|string} - Returns false if the pasted value does not contain 'MIKO-', otherwise returns the pasted value with whitespace removed.
     */
    cbOnLicenceKeyBeforePaste(pastedValue) {
        if (pastedValue.indexOf('MIKO-') === -1) {
            keyCheck.$licKey.transition('shake');
            return false;
        }
        return pastedValue.replace(/\s+/g, '');
    },

    /**
     * Callback function triggered before pasting a value into the coupon field.
     * @param {string} pastedValue - The value being pasted into the field.
     * @returns {boolean|string} - Returns false if the pasted value does not contain 'MIKOUPD-', otherwise returns the pasted value with whitespace removed.
     */
    cbOnCouponBeforePaste(pastedValue) {
        if (pastedValue.indexOf('MIKOUPD-') === -1) {
            keyCheck.$coupon.transition('shake');
            return false;
        }
        return pastedValue.replace(/\s+/g, '');
    },

    /**
     * Display license information.
     * @param {string} message - The license information message.
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
            if (productValue === undefined) {
                return;
            }
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
        if (success === true) {
            if (typeof response.data.PBXLicense !== 'undefined') {
                globalPBXLicense = response.data.PBXLicense;
                keyCheck.$formObj.form('set value', 'licKey', response.data.PBXLicense);
            }
            $('#productDetails tbody').html('');

            keyCheck.$formObj.form('set value', 'coupon', '');

            keyCheck.initialize();
            if (response.messages.length !== 0) {
                UserMessage.showMultiString(response.messages);
            }
        } else if (response.messages.license!==undefined){
            UserMessage.showLicenseError(globalTranslate.lic_GeneralError, response.messages.license);
        } else {
            UserMessage.showMultiString(response.messages, globalTranslate.lic_GeneralError);
        }

        // Trigger change event to acknowledge the modification
        Form.dataChanged();
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        return settings;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        keyCheck.$formObj.removeClass('loading');
        keyCheck.$saveKeyButton.removeClass('loading disabled');
        keyCheck.$activateCouponButton.removeClass('loading disabled');
        const formData = keyCheck.$formObj.form('get values');
        PbxApi.LicenseProcessUserRequest(formData, keyCheck.cbAfterFormProcessing);
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = keyCheck.$formObj;
        Form.url = `${globalRootUrl}licensing/save`; // Form submission URL
        Form.validateRules = keyCheck.validateRules; // Form validation rules
        Form.cbBeforeSendForm = keyCheck.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = keyCheck.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

/**
 * Custom validation rule to check if a field is empty only if the license key field is not empty.
 * @param {string} value - The value of the field being validated.
 * @returns {boolean} - True if the field is not empty or the license key field is empty, false otherwise.
 */
$.fn.form.settings.rules.checkEmptyIfLicenseKeyEmpty = function (value) {
    return (keyCheck.$licKey.inputmask('unmaskedvalue').length === 20 || value.length > 0);
};

/**
 *  Initialize licensing modify form on document ready
 */
$(document).ready(() => {
    keyCheck.initialize();
});

