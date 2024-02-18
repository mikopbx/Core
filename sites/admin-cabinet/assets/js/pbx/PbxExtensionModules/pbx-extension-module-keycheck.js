"use strict";

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
var keyCheck = {
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
      rules: [{
        type: 'checkEmptyIfLicenseKeyEmpty',
        prompt: globalTranslate.lic_ValidateCompanyNameEmpty
      }]
    },
    email: {
      identifier: 'email',
      rules: [{
        type: 'checkEmptyIfLicenseKeyEmpty',
        prompt: globalTranslate.lic_ValidateContactEmail
      }]
    },
    contact: {
      identifier: 'contact',
      rules: [{
        type: 'checkEmptyIfLicenseKeyEmpty',
        prompt: globalTranslate.lic_ValidateContactName
      }]
    },
    licKey: {
      identifier: 'licKey',
      optional: true,
      rules: [{
        type: 'exactLength[28]',
        prompt: globalTranslate.lic_ValidateLicenseKeyEmpty
      }]
    },
    coupon: {
      depends: 'licKey',
      identifier: 'coupon',
      optional: true,
      rules: [{
        type: 'exactLength[31]',
        prompt: globalTranslate.lic_ValidateCouponEmpty
      }]
    }
  },
  // Initialize the licensing page.
  initialize: function initialize() {
    keyCheck.$accordions.accordion();
    keyCheck.$licenseDetailInfo.hide(); // Set input mask for coupon code field

    keyCheck.$coupon.inputmask('MIKOUPD-*****-*****-*****-*****', {
      onBeforePaste: keyCheck.cbOnCouponBeforePaste
    }); // Set input mask for license key field

    keyCheck.$licKey.inputmask('MIKO-*****-*****-*****-*****', {
      oncomplete: keyCheck.cbOnLicenceKeyInputChange,
      onincomplete: keyCheck.cbOnLicenceKeyInputChange,
      clearIncomplete: true,
      onBeforePaste: keyCheck.cbOnLicenceKeyBeforePaste
    });
    keyCheck.$email.inputmask('email'); // Restore previous license error message to prevent blinking
    // const previousKeyMessage = sessionStorage.getItem(`previousKeyMessage${globalWebAdminLanguage}`);
    // if (previousKeyMessage && globalPBXLicense.length>0) {
    //     UserMessage.showLicenseError(globalTranslate.lic_LicenseProblem, JSON.parse(previousKeyMessage),true)
    // }
    // Handle save key button click

    keyCheck.$saveKeyButton.on('click', function () {
      if (keyCheck.$licKey.inputmask('unmaskedvalue').length === 20) {
        keyCheck.$formObj.addClass('loading disabled');
        keyCheck.$saveKeyButton.addClass('loading disabled');
        Form.submitForm();
      } else {
        keyCheck.$saveKeyButton.transition('shake');
      }
    }); // Handle reset button click

    keyCheck.$resetButton.on('click', function () {
      keyCheck.$formObj.addClass('loading disabled');
      keyCheck.$resetButton.addClass('loading disabled');
      PbxApi.LicenseResetLicenseKey(keyCheck.cbAfterResetLicenseKey);
    }); // Handle activate coupon button click

    keyCheck.$activateCouponButton.on('click', function () {
      if (keyCheck.$coupon.inputmask('unmaskedvalue').length === 20 && keyCheck.$licKey.inputmask('unmaskedvalue').length === 20) {
        keyCheck.$formObj.addClass('loading disabled');
        keyCheck.$activateCouponButton.addClass('loading disabled');
        Form.submitForm();
      } else {
        keyCheck.$activateCouponButton.transition('shake');
      }
    });
    keyCheck.cbOnLicenceKeyInputChange();
    keyCheck.initializeForm(); // Check if a license key is present

    if (globalPBXLicense.length === 28) {
      keyCheck.$filledLicenseKeyPlaceholder.html("".concat(globalPBXLicense, " <i class=\"spinner loading icon\"></i>"));
      keyCheck.$filledLicenseKeyHeader.show();
      keyCheck.$manageKeyButton.attr('href', Config.keyManagementUrl);
      PbxApi.LicenseGetMikoPBXFeatureStatus(keyCheck.cbAfterGetMikoPBXFeatureStatus);
      PbxApi.LicenseGetLicenseInfo(keyCheck.cbAfterGetLicenseInfo);
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
  cbAfterResetLicenseKey: function cbAfterResetLicenseKey(response) {
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
  cbAfterGetMikoPBXFeatureStatus: function cbAfterGetMikoPBXFeatureStatus(response) {
    // Remove the loading spinner and any previous AJAX messages
    $('.spinner.loading.icon').remove();

    if (response === true) {
      // MikoPBX feature status is true (valid)
      keyCheck.$formObj.removeClass('error').addClass('success');
      keyCheck.$filledLicenseKeyPlaceholder.html("".concat(globalPBXLicense, " <i class=\"check green icon\"></i>"));
      keyCheck.$filledLicenseKeyHeader.show();
      sessionStorage.removeItem("previousKeyMessage".concat(globalWebAdminLanguage));
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
  cbAfterGetLicenseInfo: function cbAfterGetLicenseInfo(response) {
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
  cbOnLicenceKeyInputChange: function cbOnLicenceKeyInputChange() {
    if (keyCheck.$licKey.inputmask('unmaskedvalue').length === 20) {
      // License key is complete
      keyCheck.$formObj.find('.reginfo input').each(function (index, obj) {
        $(obj).attr('hidden', '');
      });
      keyCheck.$getNewKeyLicenseSection.hide();
      keyCheck.$couponSection.show();
      keyCheck.$formErrorMessages.empty();
    } else {
      // License key is incomplete
      keyCheck.$formObj.find('.reginfo input').each(function (index, obj) {
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
  cbOnLicenceKeyBeforePaste: function cbOnLicenceKeyBeforePaste(pastedValue) {
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
  cbOnCouponBeforePaste: function cbOnCouponBeforePaste(pastedValue) {
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
  showLicenseInfo: function showLicenseInfo(message) {
    var licenseData = JSON.parse(message);

    if (licenseData['@attributes'] === undefined) {
      return;
    }

    $('#key-companyname').text(licenseData['@attributes'].companyname);
    $('#key-contact').text(licenseData['@attributes'].contact);
    $('#key-email').text(licenseData['@attributes'].email);
    $('#key-tel').text(licenseData['@attributes'].tel);
    var products = licenseData.product;

    if (!Array.isArray(products)) {
      products = [];
      products.push(licenseData.product);
    }

    $.each(products, function (key, productValue) {
      if (productValue === undefined) {
        return;
      }

      var row = '<tr><td>';
      var product = productValue;

      if (product['@attributes'] !== undefined) {
        product = productValue['@attributes'];
      }

      var dateExpired = new Date(product.expired.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1/$2/$3'));
      var dateNow = new Date();

      if (dateNow > dateExpired) {
        row += "<div class=\"ui disabled segment\">".concat(product.name, "<br>\n\t\t\t\t<small>").concat(globalTranslate.lic_Expired, "</small>");
      } else if (product.expired.length === 0 && product.trial === '1') {
        row += "<div class=\"ui disabled segment\">".concat(product.name, "<br>\n\t\t\t\t<small>").concat(globalTranslate.lic_Expired, "</small>");
      } else {
        row += "<div class=\"ui positive message\">".concat(product.name);

        if (product.expired.length > 0) {
          var expiredText = globalTranslate.lic_ExpiredAfter;
          expiredText = expiredText.replace('%expired%', product.expired);
          row += "<br><small>".concat(expiredText, "</small>");
        }

        row += '<br><span class="features">';
        $.each(productValue.feature, function (index, featureValue) {
          var featureInfo = globalTranslate.lic_FeatureInfo;
          var feature = featureValue;

          if (featureValue['@attributes'] !== undefined) {
            feature = featureValue['@attributes'];
          }

          featureInfo = featureInfo.replace('%name%', feature.name);
          featureInfo = featureInfo.replace('%count%', feature.count);
          featureInfo = featureInfo.replace('%counteach%', feature.counteach);
          featureInfo = featureInfo.replace('%captured%', feature.captured);
          row += "".concat(featureInfo, "<br>");
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
  cbAfterFormProcessing: function cbAfterFormProcessing(response, success) {
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
    } else if (response.messages.license !== undefined) {
      UserMessage.showLicenseError(globalTranslate.lic_GeneralError, response.messages.license);
    } else {
      UserMessage.showMultiString(response.messages, globalTranslate.lic_GeneralError);
    } // Trigger change event to acknowledge the modification


    Form.dataChanged();
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    return settings;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    keyCheck.$formObj.removeClass('loading');
    keyCheck.$saveKeyButton.removeClass('loading disabled');
    keyCheck.$activateCouponButton.removeClass('loading disabled');
    var formData = keyCheck.$formObj.form('get values');
    PbxApi.LicenseProcessUserRequest(formData, keyCheck.cbAfterFormProcessing);
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = keyCheck.$formObj;
    Form.url = "".concat(globalRootUrl, "licensing/save"); // Form submission URL

    Form.validateRules = keyCheck.validateRules; // Form validation rules

    Form.cbBeforeSendForm = keyCheck.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = keyCheck.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
};
/**
 * Custom validation rule to check if a field is empty only if the license key field is not empty.
 * @param {string} value - The value of the field being validated.
 * @returns {boolean} - True if the field is not empty or the license key field is empty, false otherwise.
 */

$.fn.form.settings.rules.checkEmptyIfLicenseKeyEmpty = function (value) {
  return keyCheck.$licKey.inputmask('unmaskedvalue').length === 20 || value.length > 0;
};
/**
 *  Initialize licensing modify form on document ready
 */


$(document).ready(function () {
  keyCheck.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUhlYWRlciIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIiLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRwcm9kdWN0RGV0YWlscyIsIiRhY2NvcmRpb25zIiwiJHJlc2V0QnV0dG9uIiwiJHNhdmVLZXlCdXR0b24iLCIkYWN0aXZhdGVDb3Vwb25CdXR0b24iLCIkbWFuYWdlS2V5QnV0dG9uIiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHkiLCJlbWFpbCIsImxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCIsImNvbnRhY3QiLCJsaWNfVmFsaWRhdGVDb250YWN0TmFtZSIsImxpY0tleSIsIm9wdGlvbmFsIiwibGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5IiwiY291cG9uIiwiZGVwZW5kcyIsImxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5IiwiaW5pdGlhbGl6ZSIsImFjY29yZGlvbiIsImhpZGUiLCJpbnB1dG1hc2siLCJvbkJlZm9yZVBhc3RlIiwiY2JPbkNvdXBvbkJlZm9yZVBhc3RlIiwib25jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UiLCJvbmluY29tcGxldGUiLCJjbGVhckluY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlIiwib24iLCJsZW5ndGgiLCJhZGRDbGFzcyIsIkZvcm0iLCJzdWJtaXRGb3JtIiwidHJhbnNpdGlvbiIsIlBieEFwaSIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJjYkFmdGVyUmVzZXRMaWNlbnNlS2V5IiwiaW5pdGlhbGl6ZUZvcm0iLCJnbG9iYWxQQlhMaWNlbnNlIiwiaHRtbCIsInNob3ciLCJhdHRyIiwiQ29uZmlnIiwia2V5TWFuYWdlbWVudFVybCIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsInNlc3Npb25TdG9yYWdlIiwicmVtb3ZlSXRlbSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCJtZXNzYWdlcyIsInVuZGVmaW5lZCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibGljX0ZhaWxlZENoZWNrTGljZW5zZU5vdFBieFJlc3BvbnNlIiwibGljX0xpY2Vuc2VQcm9ibGVtIiwibGljZW5zZUluZm8iLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwibGljX0V4cGlyZWRBZnRlciIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImxpY19GZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiZGF0YSIsIlBCWExpY2Vuc2UiLCJmb3JtIiwibGljZW5zZSIsInNob3dMaWNlbnNlRXJyb3IiLCJsaWNfR2VuZXJhbEVycm9yIiwiZGF0YUNoYW5nZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JtRGF0YSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZm4iLCJjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkiLCJ2YWx1ZSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsd0JBQUQsQ0FMRTtBQU9iQyxFQUFBQSxvQkFBb0IsRUFBRUQsQ0FBQyxDQUFDLHlCQUFELENBUFY7QUFRYkUsRUFBQUEsdUJBQXVCLEVBQUVGLENBQUMsQ0FBQyw0QkFBRCxDQVJiO0FBU2JHLEVBQUFBLHFCQUFxQixFQUFFSCxDQUFDLENBQUMsMEJBQUQsQ0FUWDtBQVViSSxFQUFBQSw0QkFBNEIsRUFBRUosQ0FBQyxDQUFDLDhDQUFELENBVmxCO0FBV2JLLEVBQUFBLHdCQUF3QixFQUFFTCxDQUFDLENBQUMsMEJBQUQsQ0FYZDtBQVliTSxFQUFBQSxjQUFjLEVBQUVOLENBQUMsQ0FBQyxn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QXFZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBckMsQ0FBQyxDQUFDNkksRUFBRixDQUFLWixJQUFMLENBQVVNLFFBQVYsQ0FBbUJqSCxLQUFuQixDQUF5QndILDJCQUF6QixHQUF1RCxVQUFVQyxLQUFWLEVBQWlCO0FBQ3BFLFNBQVFqSixRQUFRLENBQUNVLE9BQVQsQ0FBaUJnQyxTQUFqQixDQUEyQixlQUEzQixFQUE0Q1MsTUFBNUMsS0FBdUQsRUFBdkQsSUFBNkQ4RixLQUFLLENBQUM5RixNQUFOLEdBQWUsQ0FBcEY7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOzs7QUFDQWpELENBQUMsQ0FBQ2dKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJuSixFQUFBQSxRQUFRLENBQUN1QyxVQUFUO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxQQlhMaWNlbnNlLCBVc2VyTWVzc2FnZSovXG5cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1vZHVsZXMgbGljZW5zZSBrZXlcbiAqXG4gKiBAbW9kdWxlIGtleUNoZWNrXG4gKi9cbmNvbnN0IGtleUNoZWNrID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0nKSxcblxuICAgICRlbXB0eUxpY2Vuc2VLZXlJbmZvOiAkKCcuZW1wdHktbGljZW5zZS1rZXktaW5mbycpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWhlYWRlcicpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5SW5mbzogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1pbmZvJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlcjogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1pbmZvIC5jb25maWRlbnRpYWwtZmllbGQnKSxcbiAgICAkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb246ICQoJyNnZXROZXdLZXlMaWNlbnNlU2VjdGlvbicpLFxuICAgICRjb3Vwb25TZWN0aW9uOiAkKCcjY291cG9uU2VjdGlvbicpLFxuICAgICRmb3JtRXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcbiAgICAkbGljS2V5OiAkKCcjbGljS2V5JyksXG4gICAgJGNvdXBvbjogJCgnI2NvdXBvbicpLFxuICAgICRlbWFpbDogJCgnI2VtYWlsJyksXG4gICAgJGFqYXhNZXNzYWdlczogJCgnLnVpLm1lc3NhZ2UuYWpheCcpLFxuICAgICRsaWNlbnNlRGV0YWlsSW5mbzogJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyksXG4gICAgJHByb2R1Y3REZXRhaWxzOiAkKCcjcHJvZHVjdERldGFpbHMnKSxcbiAgICAkYWNjb3JkaW9uczogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cbiAgICAkcmVzZXRCdXR0b246ICQoJyNyZXNldC1saWNlbnNlLWJ1dHRvbicpLFxuICAgICRzYXZlS2V5QnV0dG9uOiAkKCcjc2F2ZS1saWNlbnNlLWtleS1idXR0b24nKSxcbiAgICAkYWN0aXZhdGVDb3Vwb25CdXR0b246ICQoJyNjb3Vwb24tYWN0aXZhdGlvbi1idXR0b24nKSxcbiAgICAkbWFuYWdlS2V5QnV0dG9uOiAkKCcjbWFuYWdlLWxpY2Vuc2UtYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgY29tcGFueW5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb21wYW55bmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGVtYWlsOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZW1haWwnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0RW1haWwsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRhY3Q6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb250YWN0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGxpY0tleToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2xpY0tleScsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMjhdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb3Vwb246IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICdsaWNLZXknLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvdXBvbicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMzFdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ291cG9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEluaXRpYWxpemUgdGhlIGxpY2Vuc2luZyBwYWdlLlxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGtleUNoZWNrLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBjb3Vwb24gY29kZSBmaWVsZFxuICAgICAgICBrZXlDaGVjay4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25Db3Vwb25CZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGxpY2Vuc2Uga2V5IGZpZWxkXG4gICAgICAgIGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIG9uaW5jb21wbGV0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIGNsZWFySW5jb21wbGV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGtleUNoZWNrLiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSBwcmV2aW91cyBsaWNlbnNlIGVycm9yIG1lc3NhZ2UgdG8gcHJldmVudCBibGlua2luZ1xuICAgICAgICAvLyBjb25zdCBwcmV2aW91c0tleU1lc3NhZ2UgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGBwcmV2aW91c0tleU1lc3NhZ2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG4gICAgICAgIC8vIGlmIChwcmV2aW91c0tleU1lc3NhZ2UgJiYgZ2xvYmFsUEJYTGljZW5zZS5sZW5ndGg+MCkge1xuICAgICAgICAvLyAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VQcm9ibGVtLCBKU09OLnBhcnNlKHByZXZpb3VzS2V5TWVzc2FnZSksdHJ1ZSlcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIEhhbmRsZSBzYXZlIGtleSBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoPT09MjApe1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJHNhdmVLZXlCdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHJlc2V0IGJ1dHRvbiBjbGlja1xuICAgICAgICBrZXlDaGVjay4kcmVzZXRCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRyZXNldEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgUGJ4QXBpLkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkoa2V5Q2hlY2suY2JBZnRlclJlc2V0TGljZW5zZUtleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBhY3RpdmF0ZSBjb3Vwb24gYnV0dG9uIGNsaWNrXG4gICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5Q2hlY2suJGNvdXBvbi5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGg9PT0yMCAmJmtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoPT09MjApe1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGFjdGl2YXRlQ291cG9uQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5zdWJtaXRGb3JtKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cbiAgICAgICAga2V5Q2hlY2suaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBhIGxpY2Vuc2Uga2V5IGlzIHByZXNlbnRcbiAgICAgICAgaWYgKGdsb2JhbFBCWExpY2Vuc2UubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlQbGFjZWhvbGRlci5odG1sKGAke2dsb2JhbFBCWExpY2Vuc2V9IDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+YCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kbWFuYWdlS2V5QnV0dG9uLmF0dHIoJ2hyZWYnLENvbmZpZy5rZXlNYW5hZ2VtZW50VXJsKTtcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMoa2V5Q2hlY2suY2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKTtcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlR2V0TGljZW5zZUluZm8oa2V5Q2hlY2suY2JBZnRlckdldExpY2Vuc2VJbmZvKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRlbXB0eUxpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SW5mby5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXNldHRpbmcgdGhlIGxpY2Vuc2Uga2V5LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgbGljZW5zZSBrZXkgcmVzZXQuXG4gICAgICovXG4gICAgY2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgYW5kIGRpc2FibGVkIGNsYXNzZXMgZnJvbSB0aGUgZm9ybVxuICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBrZXlDaGVjay4kcmVzZXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGlzIG5vdCBmYWxzZSwgaW5kaWNhdGluZyBhIHN1Y2Nlc3NmdWwgbGljZW5zZSBrZXkgcmVzZXQsXG4gICAgICAgICAgICAvLyByZWxvYWQgdGhlIHdpbmRvdyB0byBhcHBseSB0aGUgY2hhbmdlc1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciBnZXR0aW5nIHRoZSBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGluZGljYXRpbmcgdGhlIE1pa29QQlggZmVhdHVyZSBzdGF0dXMuXG4gICAgICovXG4gICAgY2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlbW92ZSB0aGUgbG9hZGluZyBzcGlubmVyIGFuZCBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlc1xuICAgICAgICAkKCcuc3Bpbm5lci5sb2FkaW5nLmljb24nKS5yZW1vdmUoKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzIGlzIHRydWUgKHZhbGlkKVxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ3N1Y2Nlc3MnKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIuaHRtbChgJHtnbG9iYWxQQlhMaWNlbnNlfSA8aSBjbGFzcz1cImNoZWNrIGdyZWVuIGljb25cIj48L2k+YClcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLnNob3coKTtcbiAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzS2V5TWVzc2FnZSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE1pa29QQlggZmVhdHVyZSBzdGF0dXMgaXMgZmFsc2Ugb3IgYW4gZXJyb3Igb2NjdXJyZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgcmVzcG9uc2UubWVzc2FnZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIEZhaWxlZCB0byBjaGVjayBsaWNlbnNlIHN0YXR1cyAocmVzcG9uc2UgaXMgZmFsc2Ugb3Igbm8gbWVzc2FnZXMgYXZhaWxhYmxlKVxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUubGljX0ZhaWxlZENoZWNrTGljZW5zZU5vdFBieFJlc3BvbnNlLCBnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VQcm9ibGVtKTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhaWxlZCB0byBjaGVjayBsaWNlbnNlIHN0YXR1cyB3aXRoIGVycm9yIG1lc3NhZ2VzXG4gICAgICAgICAgICAgICAgLy9zZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGBwcmV2aW91c0tleU1lc3NhZ2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCwgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UubWVzc2FnZXMpKTtcbiAgICAgICAgICAgICAgICAvL1VzZXJNZXNzYWdlLnNob3dMaWNlbnNlRXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlUHJvYmxlbSwgcmVzcG9uc2UubWVzc2FnZXMsIHRydWUpO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TGljZW5zZUluZm8ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmxpY2Vuc2VJbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICBrZXlDaGVjay5zaG93TGljZW5zZUluZm8ocmVzcG9uc2UubGljZW5zZUluZm8pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgd2hlbiB0aGVyZSBpcyBhIGNoYW5nZSBpbiB0aGUgbGljZW5zZSBrZXkgaW5wdXQuXG4gICAgICovXG4gICAgY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpIHtcbiAgICAgICAgaWYgKGtleUNoZWNrLiRsaWNLZXkuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoID09PSAyMCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBrZXkgaXMgY29tcGxldGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgICQob2JqKS5hdHRyKCdoaWRkZW4nLCAnJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybUVycm9yTWVzc2FnZXMuZW1wdHkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGluY29tcGxldGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgICQob2JqKS5yZW1vdmVBdHRyKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb25TZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYmVmb3JlIHBhc3RpbmcgYSB2YWx1ZSBpbnRvIHRoZSBsaWNlbnNlIGtleSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgdmFsdWUgYmVpbmcgcGFzdGVkIGludG8gdGhlIGZpZWxkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufHN0cmluZ30gLSBSZXR1cm5zIGZhbHNlIGlmIHRoZSBwYXN0ZWQgdmFsdWUgZG9lcyBub3QgY29udGFpbiAnTUlLTy0nLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgcGFzdGVkIHZhbHVlIHdpdGggd2hpdGVzcGFjZSByZW1vdmVkLlxuICAgICAqL1xuICAgIGNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgaWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS08tJykgPT09IC0xKSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kbGljS2V5LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYmVmb3JlIHBhc3RpbmcgYSB2YWx1ZSBpbnRvIHRoZSBjb3Vwb24gZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS09VUEQtJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uQ291cG9uQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgaWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS09VUEQtJykgPT09IC0xKSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBUaGUgbGljZW5zZSBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqL1xuICAgIHNob3dMaWNlbnNlSW5mbyhtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGxpY2Vuc2VEYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgICAgICAgaWYgKGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkKCcja2V5LWNvbXBhbnluYW1lJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb21wYW55bmFtZSk7XG4gICAgICAgICQoJyNrZXktY29udGFjdCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29udGFjdCk7XG4gICAgICAgICQoJyNrZXktZW1haWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmVtYWlsKTtcbiAgICAgICAgJCgnI2tleS10ZWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLnRlbCk7XG4gICAgICAgIGxldCBwcm9kdWN0cyA9IGxpY2Vuc2VEYXRhLnByb2R1Y3Q7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcm9kdWN0cykpIHtcbiAgICAgICAgICAgIHByb2R1Y3RzID0gW107XG4gICAgICAgICAgICBwcm9kdWN0cy5wdXNoKGxpY2Vuc2VEYXRhLnByb2R1Y3QpO1xuICAgICAgICB9XG4gICAgICAgICQuZWFjaChwcm9kdWN0cywgKGtleSwgcHJvZHVjdFZhbHVlKSA9PiB7XG4gICAgICAgICAgICBpZiAocHJvZHVjdFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgcm93ID0gJzx0cj48dGQ+JztcbiAgICAgICAgICAgIGxldCBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlO1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHByb2R1Y3QgPSBwcm9kdWN0VmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkYXRlRXhwaXJlZCA9IG5ldyBEYXRlKHByb2R1Y3QuZXhwaXJlZC5yZXBsYWNlKC8oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KS8sICckMS8kMi8kMycpKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVOb3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgaWYgKGRhdGVOb3cgPiBkYXRlRXhwaXJlZCkge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPT09IDAgJiYgcHJvZHVjdC50cmlhbCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPiR7cHJvZHVjdC5uYW1lfWA7XG4gICAgICAgICAgICAgICAgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBleHBpcmVkVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZEFmdGVyO1xuICAgICAgICAgICAgICAgICAgICBleHBpcmVkVGV4dCA9IGV4cGlyZWRUZXh0LnJlcGxhY2UoJyVleHBpcmVkJScsIHByb2R1Y3QuZXhwaXJlZCk7XG4gICAgICAgICAgICAgICAgICAgIHJvdyArPSBgPGJyPjxzbWFsbD4ke2V4cGlyZWRUZXh0fTwvc21hbGw+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPic7XG4gICAgICAgICAgICAgICAgJC5lYWNoKHByb2R1Y3RWYWx1ZS5mZWF0dXJlLCAoaW5kZXgsIGZlYXR1cmVWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZUluZm8gPSBnbG9iYWxUcmFuc2xhdGUubGljX0ZlYXR1cmVJbmZvO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJW5hbWUlJywgZmVhdHVyZS5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnQlJywgZmVhdHVyZS5jb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50ZWFjaCUnLCBmZWF0dXJlLmNvdW50ZWFjaCk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNhcHR1cmVkJScsIGZlYXR1cmUuY2FwdHVyZWQpO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdyArPSAnPC9kaXY+PC90ZD48L3RyPic7XG4gICAgICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5hcHBlbmQocm93KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFmdGVyIHVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuICAgICAqIEBwYXJhbSByZXNwb25zZVxuICAgICAqIEBwYXJhbSBzdWNjZXNzXG4gICAgICovXG4gICAgY2JBZnRlckZvcm1Qcm9jZXNzaW5nKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG4gICAgICAgIGlmIChzdWNjZXNzID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBnbG9iYWxQQlhMaWNlbnNlID0gcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdsaWNLZXknLCByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuaHRtbCgnJyk7XG5cbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdjb3Vwb24nLCAnJyk7XG5cbiAgICAgICAgICAgIGtleUNoZWNrLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0dlbmVyYWxFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMubGljZW5zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5saWNfR2VuZXJhbEVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIGtleUNoZWNrLiRzYXZlS2V5QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IGtleUNoZWNrLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgUGJ4QXBpLkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGtleUNoZWNrLmNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGtleUNoZWNrLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGtleUNoZWNrLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBrZXlDaGVjay5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0ga2V5Q2hlY2suY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSB0byBjaGVjayBpZiBhIGZpZWxkIGlzIGVtcHR5IG9ubHkgaWYgdGhlIGxpY2Vuc2Uga2V5IGZpZWxkIGlzIG5vdCBlbXB0eS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmllbGQgYmVpbmcgdmFsaWRhdGVkLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgZmllbGQgaXMgbm90IGVtcHR5IG9yIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBlbXB0eSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aCA9PT0gMjAgfHwgdmFsdWUubGVuZ3RoID4gMCk7XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIGxpY2Vuc2luZyBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAga2V5Q2hlY2suaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==