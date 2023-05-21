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

/* global globalRootUrl, globalTranslate, Form, sessionStorage, globalPBXLicense*/


/**
 * Object for managing modules license key
 *
 * @module licensingModify
 */
const licensingModify = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#licencing-modify-form'),

    /**
     * Dirty check field, for checking if something on the form was changed
     * @type {jQuery}
     */
    $dirrtyField: $('#dirrty'),

    $goToLicenseManagementBTN: $('#changePageToLicensing'),
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

        licensingModify.$licensingMenu.tab({
            historyType: 'hash',
        });

        // Check if the license key info is filled
        if (licensingModify.$filledLicenseKeyInfo.length === 0) {
            licensingModify.$licensingMenu.tab('change tab', 'management');
            // No internet connection. Form is not rendered.
            return;
        }

        licensingModify.$accordions.accordion();
        licensingModify.$licenseDetailInfo.hide();

        // Set input mask for coupon code field
        licensingModify.$coupon.inputmask('MIKOUPD-*****-*****-*****-*****', {
            onBeforePaste: licensingModify.cbOnCouponBeforePaste,
        });

        // Set input mask for license key field
        licensingModify.$licKey.inputmask('MIKO-*****-*****-*****-*****', {
            oncomplete: licensingModify.cbOnLicenceKeyInputChange,
            onincomplete: licensingModify.cbOnLicenceKeyInputChange,
            clearIncomplete: true,
            onBeforePaste: licensingModify.cbOnLicenceKeyBeforePaste,
        });

        licensingModify.$email.inputmask('email');
        licensingModify.defaultLicenseKey = licensingModify.$licKey.val();

        // Handle reset button click
        licensingModify.$resetButton.on('click', () => {
            licensingModify.$formObj.addClass('loading disabled');
            PbxApi.LicenseResetLicenseKey(licensingModify.cbAfterResetLicenseKey);
        });

        licensingModify.cbOnLicenceKeyInputChange();

        licensingModify.initializeForm();

        // Check if a license key is present
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

        // Switch to the management tab if a license key is present
        if (licensingModify.defaultLicenseKey !== '') {
            licensingModify.$licensingMenu.tab('change tab', 'management');
        }

        // Handle "Go to License Management" button click
        licensingModify.$goToLicenseManagementBTN.on('click', (e) => {
            e.preventDefault();
            licensingModify.$licensingMenu.tab('change tab', 'management');
        });

    },

    /**
     * Callback function triggered after resetting the license key.
     * @param {boolean} response - The response indicating the success of the license key reset.
     */
    cbAfterResetLicenseKey(response) {
        // Remove the loading and disabled classes from the form
        licensingModify.$formObj.removeClass('loading disabled');

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
        licensingModify.$ajaxMessages.remove();
        if (response === true) {
            // MikoPBX feature status is true (valid)
            licensingModify.$formObj.removeClass('error').addClass('success');
            licensingModify.$filledLicenseKeyInfo.after(`<div class="ui success message ajax"><i class="check green icon"></i> ${globalTranslate.lic_LicenseKeyValid}</div>`);
        } else {
            // MikoPBX feature status is false or an error occurred
            licensingModify.$formObj.addClass('error').removeClass('success');
            if (response === false || response.messages === undefined) {
                // Failed to check license status (response is false or no messages available)
                $('#licFailInfo').remove();
                licensingModify.$filledLicenseKeyInfo.after(`<div id="licFailInfo" class="ui error message ajax"><i class="exclamation triangle red icon"></i> ${globalTranslate.lic_FailedCheckLicenseNotPbxResponse}</div>`);
            } else {
                // Failed to check license status with error messages
                $('#licFailInfoMsg').remove();
                licensingModify.$filledLicenseKeyInfo.after(`<div id="licFailInfoMsg" class="ui error message ajax"><i class="exclamation triangle red icon"></i> ${response.messages}</div>`);
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
            licensingModify.showLicenseInfo(response.licenseInfo);
            licensingModify.$licenseDetailInfo.show();
        } else {
            // License information is not available
            licensingModify.$licenseDetailInfo.hide();
        }
    },

    /**
     * Callback function triggered when there is a change in the license key input.
     */
    cbOnLicenceKeyInputChange() {
        const licKey = licensingModify.$licKey.val();
        if (licKey.length === 28) {
            // License key is complete
            licensingModify.$formObj.find('.reginfo input').each((index, obj) => {
                $(obj).attr('hidden', '');
            });
            licensingModify.$getNewKeyLicenseSection.hide();
            licensingModify.$couponSection.show();
            licensingModify.$formErrorMessages.empty();
        } else {
            // License key is incomplete
            licensingModify.$formObj.find('.reginfo input').each((index, obj) => {
                $(obj).removeAttr('hidden');
            });
            licensingModify.$getNewKeyLicenseSection.show();
            licensingModify.$couponSection.hide();
        }
    },

    /**
     * Callback function triggered before pasting a value into the license key field.
     * @param {string} pastedValue - The value being pasted into the field.
     * @returns {boolean|string} - Returns false if the pasted value does not contain 'MIKO-', otherwise returns the pasted value with whitespace removed.
     */
    cbOnLicenceKeyBeforePaste(pastedValue) {
        if (pastedValue.indexOf('MIKO-') === -1) {
            licensingModify.$licKey.transition('shake');
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
            licensingModify.$coupon.transition('shake');
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
                licensingModify.$formObj.form('set value', 'licKey', response.data.PBXLicense);
            }
            $('#productDetails tbody').html('');

            licensingModify.$formObj.form('set value', 'coupon', '');

            licensingModify.initialize();
            if (response.messages.length !== 0) {
                UserMessage.showMultiString(response.messages);
            }
        } else if (response.messages !== undefined) {
            UserMessage.showMultiString(response.messages);
        } else {
            UserMessage.showError(globalTranslate.lic_GetTrialErrorCheckInternet);
        }

        // Change the value of '$dirrtyField' to trigger
        // the 'change' form event and enable submit button.
        licensingModify.$dirrtyField.val(Math.random());
        licensingModify.$dirrtyField.trigger('change');
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
        const formData = licensingModify.$formObj.form('get values');
        PbxApi.LicenseProcessUserRequest(formData, licensingModify.cbAfterFormProcessing);
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = licensingModify.$formObj;
        Form.url = `${globalRootUrl}licensing/save`; // Form submission URL
        Form.validateRules = licensingModify.validateRules; // Form validation rules
        Form.cbBeforeSendForm = licensingModify.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = licensingModify.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

/**
 * Custom validation rule to check if a field is empty only if the license key field is not empty.
 * @param {string} value - The value of the field being validated.
 * @returns {boolean} - True if the field is not empty or the license key field is empty, false otherwise.
 */
$.fn.form.settings.rules.checkEmptyIfLicenseKeyEmpty = function (value) {
    return (licensingModify.$licKey.val().length === 28 || value.length > 0);
};

/**
 *  Initialize licensing modify form on document ready
 */
$(document).ready(() => {
    licensingModify.initialize();
});

