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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUhlYWRlciIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIiLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRwcm9kdWN0RGV0YWlscyIsIiRhY2NvcmRpb25zIiwiJHJlc2V0QnV0dG9uIiwiJHNhdmVLZXlCdXR0b24iLCIkYWN0aXZhdGVDb3Vwb25CdXR0b24iLCIkbWFuYWdlS2V5QnV0dG9uIiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHkiLCJlbWFpbCIsImxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCIsImNvbnRhY3QiLCJsaWNfVmFsaWRhdGVDb250YWN0TmFtZSIsImxpY0tleSIsIm9wdGlvbmFsIiwibGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5IiwiY291cG9uIiwiZGVwZW5kcyIsImxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5IiwiaW5pdGlhbGl6ZSIsImFjY29yZGlvbiIsImhpZGUiLCJpbnB1dG1hc2siLCJvbkJlZm9yZVBhc3RlIiwiY2JPbkNvdXBvbkJlZm9yZVBhc3RlIiwib25jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UiLCJvbmluY29tcGxldGUiLCJjbGVhckluY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlIiwib24iLCJsZW5ndGgiLCJhZGRDbGFzcyIsIkZvcm0iLCJzdWJtaXRGb3JtIiwidHJhbnNpdGlvbiIsIlBieEFwaSIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJjYkFmdGVyUmVzZXRMaWNlbnNlS2V5IiwiaW5pdGlhbGl6ZUZvcm0iLCJnbG9iYWxQQlhMaWNlbnNlIiwiaHRtbCIsInNob3ciLCJhdHRyIiwiQ29uZmlnIiwia2V5TWFuYWdlbWVudFVybCIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsInNlc3Npb25TdG9yYWdlIiwicmVtb3ZlSXRlbSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCJtZXNzYWdlcyIsInVuZGVmaW5lZCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibGljX0ZhaWxlZENoZWNrTGljZW5zZU5vdFBieFJlc3BvbnNlIiwibGljX0xpY2Vuc2VQcm9ibGVtIiwiY2JBZnRlckdldExpY2Vuc2VJbmZvIiwibGljZW5zZUluZm8iLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwibGljX0V4cGlyZWRBZnRlciIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImxpY19GZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiZGF0YSIsIlBCWExpY2Vuc2UiLCJmb3JtIiwibGljZW5zZSIsInNob3dMaWNlbnNlRXJyb3IiLCJsaWNfR2VuZXJhbEVycm9yIiwiZGF0YUNoYW5nZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JtRGF0YSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZm4iLCJjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkiLCJ2YWx1ZSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsd0JBQUQsQ0FMRTtBQU9iQyxFQUFBQSxvQkFBb0IsRUFBRUQsQ0FBQyxDQUFDLHlCQUFELENBUFY7QUFRYkUsRUFBQUEsdUJBQXVCLEVBQUVGLENBQUMsQ0FBQyw0QkFBRCxDQVJiO0FBU2JHLEVBQUFBLHFCQUFxQixFQUFFSCxDQUFDLENBQUMsMEJBQUQsQ0FUWDtBQVViSSxFQUFBQSw0QkFBNEIsRUFBRUosQ0FBQyxDQUFDLDhDQUFELENBVmxCO0FBV2JLLEVBQUFBLHdCQUF3QixFQUFFTCxDQUFDLENBQUMsMEJBQUQsQ0FYZDtBQVliTSxFQUFBQSxjQUFjLEVBQUVOLENBQUMsQ0FBQyxnQkFBRCxDQVpKO0FBYWJPLEVBQUFBLGtC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aEgsS0FBbkIsQ0FBeUJ1SCwyQkFBekIsR0FBdUQsVUFBVUMsS0FBVixFQUFpQjtBQUNwRSxTQUFRaEosUUFBUSxDQUFDVSxPQUFULENBQWlCZ0MsU0FBakIsQ0FBMkIsZUFBM0IsRUFBNENTLE1BQTVDLEtBQXVELEVBQXZELElBQTZENkYsS0FBSyxDQUFDN0YsTUFBTixHQUFlLENBQXBGO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7O0FBQ0FqRCxDQUFDLENBQUMrSSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbEosRUFBQUEsUUFBUSxDQUFDdUMsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUEJYTGljZW5zZSwgVXNlck1lc3NhZ2UqL1xuXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBtb2R1bGVzIGxpY2Vuc2Uga2V5XG4gKlxuICogQG1vZHVsZSBrZXlDaGVja1xuICovXG5jb25zdCBrZXlDaGVjayA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtJyksXG5cbiAgICAkZW1wdHlMaWNlbnNlS2V5SW5mbzogJCgnLmVtcHR5LWxpY2Vuc2Uta2V5LWluZm8nKSxcbiAgICAkZmlsbGVkTGljZW5zZUtleUhlYWRlcjogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1oZWFkZXInKSxcbiAgICAkZmlsbGVkTGljZW5zZUtleUluZm86ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaW5mbycpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXI6ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaW5mbyAuY29uZmlkZW50aWFsLWZpZWxkJyksXG4gICAgJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uOiAkKCcjZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24nKSxcbiAgICAkY291cG9uU2VjdGlvbjogJCgnI2NvdXBvblNlY3Rpb24nKSxcbiAgICAkZm9ybUVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG4gICAgJGxpY0tleTogJCgnI2xpY0tleScpLFxuICAgICRjb3Vwb246ICQoJyNjb3Vwb24nKSxcbiAgICAkZW1haWw6ICQoJyNlbWFpbCcpLFxuICAgICRhamF4TWVzc2FnZXM6ICQoJy51aS5tZXNzYWdlLmFqYXgnKSxcbiAgICAkbGljZW5zZURldGFpbEluZm86ICQoJyNsaWNlbnNlRGV0YWlsSW5mbycpLFxuICAgICRwcm9kdWN0RGV0YWlsczogJCgnI3Byb2R1Y3REZXRhaWxzJyksXG4gICAgJGFjY29yZGlvbnM6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0gLnVpLmFjY29yZGlvbicpLFxuXG4gICAgJHJlc2V0QnV0dG9uOiAkKCcjcmVzZXQtbGljZW5zZS1idXR0b24nKSxcbiAgICAkc2F2ZUtleUJ1dHRvbjogJCgnI3NhdmUtbGljZW5zZS1rZXktYnV0dG9uJyksXG4gICAgJGFjdGl2YXRlQ291cG9uQnV0dG9uOiAkKCcjY291cG9uLWFjdGl2YXRpb24tYnV0dG9uJyksXG4gICAgJG1hbmFnZUtleUJ1dHRvbjogJCgnI21hbmFnZS1saWNlbnNlLWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGNvbXBhbnluYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb250YWN0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29udGFjdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBsaWNLZXk6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdsaWNLZXknLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY291cG9uOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAnbGljS2V5JyxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSBsaWNlbnNpbmcgcGFnZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBrZXlDaGVjay4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcbiAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcblxuICAgICAgICAvLyBTZXQgaW5wdXQgbWFzayBmb3IgY291cG9uIGNvZGUgZmllbGRcbiAgICAgICAga2V5Q2hlY2suJGNvdXBvbi5pbnB1dG1hc2soJ01JS09VUEQtKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBrZXlDaGVjay5jYk9uQ291cG9uQmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBsaWNlbnNlIGtleSBmaWVsZFxuICAgICAgICBrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygnTUlLTy0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uY29tcGxldGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBvbmluY29tcGxldGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBjbGVhckluY29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlLFxuICAgICAgICB9KTtcblxuICAgICAgICBrZXlDaGVjay4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcpO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgcHJldmlvdXMgbGljZW5zZSBlcnJvciBtZXNzYWdlIHRvIHByZXZlbnQgYmxpbmtpbmdcbiAgICAgICAgLy8gY29uc3QgcHJldmlvdXNLZXlNZXNzYWdlID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShgcHJldmlvdXNLZXlNZXNzYWdlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuICAgICAgICAvLyBpZiAocHJldmlvdXNLZXlNZXNzYWdlICYmIGdsb2JhbFBCWExpY2Vuc2UubGVuZ3RoPjApIHtcbiAgICAgICAgLy8gICAgIFVzZXJNZXNzYWdlLnNob3dMaWNlbnNlRXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlUHJvYmxlbSwgSlNPTi5wYXJzZShwcmV2aW91c0tleU1lc3NhZ2UpLHRydWUpXG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyBIYW5kbGUgc2F2ZSBrZXkgYnV0dG9uIGNsaWNrXG4gICAgICAgIGtleUNoZWNrLiRzYXZlS2V5QnV0dG9uLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aD09PTIwKXtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRzYXZlS2V5QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5zdWJtaXRGb3JtKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRzYXZlS2V5QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSByZXNldCBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJHJlc2V0QnV0dG9uLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kcmVzZXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlUmVzZXRMaWNlbnNlS2V5KGtleUNoZWNrLmNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgYWN0aXZhdGUgY291cG9uIGJ1dHRvbiBjbGlja1xuICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleUNoZWNrLiRjb3Vwb24uaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykubGVuZ3RoPT09MjAgJiZrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aD09PTIwKXtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRhY3RpdmF0ZUNvdXBvbkJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpO1xuXG4gICAgICAgIGtleUNoZWNrLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYSBsaWNlbnNlIGtleSBpcyBwcmVzZW50XG4gICAgICAgIGlmIChnbG9iYWxQQlhMaWNlbnNlLmxlbmd0aCA9PT0gMjgpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5UGxhY2Vob2xkZXIuaHRtbChgJHtnbG9iYWxQQlhMaWNlbnNlfSA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPmApO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJG1hbmFnZUtleUJ1dHRvbi5hdHRyKCdocmVmJyxDb25maWcua2V5TWFuYWdlbWVudFVybCk7XG4gICAgICAgICAgICBQYnhBcGkuTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGtleUNoZWNrLmNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZW1wdHlMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRlbXB0eUxpY2Vuc2VLZXlJbmZvLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmVzZXR0aW5nIHRoZSBsaWNlbnNlIGtleS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIGxpY2Vuc2Uga2V5IHJlc2V0LlxuICAgICAqL1xuICAgIGNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBsb2FkaW5nIGFuZCBkaXNhYmxlZCBjbGFzc2VzIGZyb20gdGhlIGZvcm1cbiAgICAgICAga2V5Q2hlY2suJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAga2V5Q2hlY2suJHJlc2V0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSByZXNwb25zZSBpcyBub3QgZmFsc2UsIGluZGljYXRpbmcgYSBzdWNjZXNzZnVsIGxpY2Vuc2Uga2V5IHJlc2V0LFxuICAgICAgICAgICAgLy8gcmVsb2FkIHRoZSB3aW5kb3cgdG8gYXBwbHkgdGhlIGNoYW5nZXNcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgZ2V0dGluZyB0aGUgTWlrb1BCWCBmZWF0dXJlIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBpbmRpY2F0aW5nIHRoZSBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgc3Bpbm5lciBhbmQgYW55IHByZXZpb3VzIEFKQVggbWVzc2FnZXNcbiAgICAgICAgJCgnLnNwaW5uZXIubG9hZGluZy5pY29uJykucmVtb3ZlKCk7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gTWlrb1BCWCBmZWF0dXJlIHN0YXR1cyBpcyB0cnVlICh2YWxpZClcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdzdWNjZXNzJyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleVBsYWNlaG9sZGVyLmh0bWwoYCR7Z2xvYmFsUEJYTGljZW5zZX0gPGkgY2xhc3M9XCJjaGVjayBncmVlbiBpY29uXCI+PC9pPmApXG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c0tleU1lc3NhZ2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzIGlzIGZhbHNlIG9yIGFuIGVycm9yIG9jY3VycmVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8IHJlc3BvbnNlLm1lc3NhZ2VzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBGYWlsZWQgdG8gY2hlY2sgbGljZW5zZSBzdGF0dXMgKHJlc3BvbnNlIGlzIGZhbHNlIG9yIG5vIG1lc3NhZ2VzIGF2YWlsYWJsZSlcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmxpY19GYWlsZWRDaGVja0xpY2Vuc2VOb3RQYnhSZXNwb25zZSwgZ2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlUHJvYmxlbSk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWlsZWQgdG8gY2hlY2sgbGljZW5zZSBzdGF0dXMgd2l0aCBlcnJvciBtZXNzYWdlc1xuICAgICAgICAgICAgICAgIC8vc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNLZXlNZXNzYWdlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWAsIEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlLm1lc3NhZ2VzKSk7XG4gICAgICAgICAgICAgICAgLy9Vc2VyTWVzc2FnZS5zaG93TGljZW5zZUVycm9yKGdsb2JhbFRyYW5zbGF0ZS5saWNfTGljZW5zZVByb2JsZW0sIHJlc3BvbnNlLm1lc3NhZ2VzLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckdldExpY2Vuc2VJbmZvKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5saWNlbnNlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGluZm9ybWF0aW9uIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAga2V5Q2hlY2suc2hvd0xpY2Vuc2VJbmZvKHJlc3BvbnNlLmxpY2Vuc2VJbmZvKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGluZm9ybWF0aW9uIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIHdoZW4gdGhlcmUgaXMgYSBjaGFuZ2UgaW4gdGhlIGxpY2Vuc2Uga2V5IGlucHV0LlxuICAgICAqL1xuICAgIGNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKSB7XG4gICAgICAgIGlmIChrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpLmxlbmd0aCA9PT0gMjApIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1FcnJvck1lc3NhZ2VzLmVtcHR5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBpbmNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikucmVtb3ZlQXR0cignaGlkZGVuJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgbGljZW5zZSBrZXkgZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS08tJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGxpY0tleS50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgY291cG9uIGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPVVBELScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkNvdXBvbkJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gVGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKi9cbiAgICBzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuICAgICAgICBjb25zdCBsaWNlbnNlRGF0YSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICAgIGlmIChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJCgnI2tleS1jb21wYW55bmFtZScpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29tcGFueW5hbWUpO1xuICAgICAgICAkKCcja2V5LWNvbnRhY3QnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbnRhY3QpO1xuICAgICAgICAkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG4gICAgICAgICQoJyNrZXktdGVsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS50ZWwpO1xuICAgICAgICBsZXQgcHJvZHVjdHMgPSBsaWNlbnNlRGF0YS5wcm9kdWN0O1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG4gICAgICAgICAgICBwcm9kdWN0cyA9IFtdO1xuICAgICAgICAgICAgcHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcbiAgICAgICAgfVxuICAgICAgICAkLmVhY2gocHJvZHVjdHMsIChrZXksIHByb2R1Y3RWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHJvdyA9ICc8dHI+PHRkPic7XG4gICAgICAgICAgICBsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGF0ZUV4cGlyZWQgPSBuZXcgRGF0ZShwcm9kdWN0LmV4cGlyZWQucmVwbGFjZSgvKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkvLCAnJDEvJDIvJDMnKSk7XG4gICAgICAgICAgICBjb25zdCBkYXRlTm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGlmIChkYXRlTm93ID4gZGF0ZUV4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID09PSAwICYmIHByb2R1Y3QudHJpYWwgPT09ICcxJykge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj4ke3Byb2R1Y3QubmFtZX1gO1xuICAgICAgICAgICAgICAgIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXhwaXJlZFRleHQgPSBnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWRBZnRlcjtcbiAgICAgICAgICAgICAgICAgICAgZXhwaXJlZFRleHQgPSBleHBpcmVkVGV4dC5yZXBsYWNlKCclZXhwaXJlZCUnLCBwcm9kdWN0LmV4cGlyZWQpO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYDxicj48c21hbGw+JHtleHBpcmVkVGV4dH08L3NtYWxsPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJvdyArPSAnPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4nO1xuICAgICAgICAgICAgICAgICQuZWFjaChwcm9kdWN0VmFsdWUuZmVhdHVyZSwgKGluZGV4LCBmZWF0dXJlVmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmVJbmZvID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19GZWF0dXJlSW5mbztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmUgPSBmZWF0dXJlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVuYW1lJScsIGZlYXR1cmUubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50JScsIGZlYXR1cmUuY291bnQpO1xuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudGVhY2glJywgZmVhdHVyZS5jb3VudGVhY2gpO1xuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjYXB0dXJlZCUnLCBmZWF0dXJlLmNhcHR1cmVkKTtcbiAgICAgICAgICAgICAgICAgICAgcm93ICs9IGAke2ZlYXR1cmVJbmZvfTxicj5gO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJvdyArPSAnPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb3cgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuYXBwZW5kKHJvdyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZnRlciB1cGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cbiAgICAgKiBAcGFyYW0gcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc1xuICAgICAqL1xuICAgIGNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyhyZXNwb25zZSwgc3VjY2Vzcykge1xuICAgICAgICBpZiAoc3VjY2VzcyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZ2xvYmFsUEJYTGljZW5zZSA9IHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbGljS2V5JywgcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmh0bWwoJycpO1xuXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnY291cG9uJywgJycpO1xuXG4gICAgICAgICAgICBrZXlDaGVjay5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlcy5saWNlbnNlIT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dMaWNlbnNlRXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmxpY19HZW5lcmFsRXJyb3IsIHJlc3BvbnNlLm1lc3NhZ2VzLmxpY2Vuc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUubGljX0dlbmVyYWxFcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBrZXlDaGVjay4kc2F2ZUtleUJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBrZXlDaGVjay4kYWN0aXZhdGVDb3Vwb25CdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFBieEFwaS5MaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBrZXlDaGVjay5jYkFmdGVyRm9ybVByb2Nlc3NpbmcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBrZXlDaGVjay4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9zYXZlYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBrZXlDaGVjay52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0ga2V5Q2hlY2suY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGtleUNoZWNrLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgdG8gY2hlY2sgaWYgYSBmaWVsZCBpcyBlbXB0eSBvbmx5IGlmIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBub3QgZW1wdHkuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZpZWxkIGJlaW5nIHZhbGlkYXRlZC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGZpZWxkIGlzIG5vdCBlbXB0eSBvciB0aGUgbGljZW5zZSBrZXkgZmllbGQgaXMgZW1wdHksIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiAoa2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKS5sZW5ndGggPT09IDIwIHx8IHZhbHVlLmxlbmd0aCA+IDApO1xufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBsaWNlbnNpbmcgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGtleUNoZWNrLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=