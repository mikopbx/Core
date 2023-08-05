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
    keyCheck.$email.inputmask('email');
    keyCheck.defaultLicenseKey = keyCheck.$licKey.val(); // Restore previous license error message to prevent blinking

    var previousKeyMessage = sessionStorage.getItem("previousKeyMessage".concat(globalWebAdminLanguage));

    if (previousKeyMessage) {
      keyCheck.showLicenseError(JSON.parse(previousKeyMessage));
    } // Handle reset button click


    keyCheck.$resetButton.on('click', function () {
      keyCheck.$formObj.addClass('loading disabled');
      PbxApi.LicenseResetLicenseKey(keyCheck.cbAfterResetLicenseKey);
    });
    keyCheck.cbOnLicenceKeyInputChange();
    keyCheck.initializeForm(); // Check if a license key is present

    if (keyCheck.defaultLicenseKey.length === 28) {
      keyCheck.$filledLicenseKeyInfo.html("".concat(keyCheck.defaultLicenseKey, " <i class=\"spinner loading icon\"></i>")).show();
      keyCheck.$filledLicenseKeyHeader.show();
      PbxApi.LicenseGetMikoPBXFeatureStatus(keyCheck.cbAfterGetMikoPBXFeatureStatus);
      PbxApi.LicenseGetLicenseInfo(keyCheck.cbAfterGetLicenseInfo);
      keyCheck.$emptyLicenseKeyInfo.hide();
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
      keyCheck.$filledLicenseKeyInfo.after("<div class=\"ui success message ajax\"><i class=\"check green icon\"></i> ".concat(globalTranslate.lic_LicenseKeyValid, "</div>"));
      keyCheck.$filledLicenseKeyHeader.show();
    } else {
      // MikoPBX feature status is false or an error occurred
      if (response === false || response.messages === undefined) {
        // Failed to check license status (response is false or no messages available)
        UserMessage.showMultiString(globalTranslate.lic_FailedCheckLicenseNotPbxResponse, globalTranslate.lic_LicenseProblem);
        keyCheck.$filledLicenseKeyHeader.show();
      } else {
        // Failed to check license status with error messages
        keyCheck.showLicenseError(response.messages);
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
    var licKey = keyCheck.$licKey.val();

    if (licKey.length === 28) {
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
    } else if (response.messages !== undefined) {
      UserMessage.showMultiString(response.messages);
    } else {
      UserMessage.showError(globalTranslate.lic_GetTrialErrorCheckInternet);
    } // Trigger change event to acknowledge the modification


    Form.dataChanged();
  },

  /**
   * Prepares error messages to be displayed.
   * @param messages - Array of error messages.
   *
   */
  showLicenseError: function showLicenseError(messages) {
    var manageLink = "<br>".concat(globalTranslate.lic_ManageLicense, " <a href=\"https://lm.mikopbx.com/client-cabinet/session/index/");

    if (keyCheck.defaultLicenseKey.length === 28) {
      manageLink += keyCheck.defaultLicenseKey;
    }

    manageLink += '" target="_blank">https://lm.mikopbx.com</a>';
    messages.push(manageLink);
    UserMessage.showMultiString(messages, globalTranslate.lic_LicenseProblem, true);
    sessionStorage.setItem("previousKeyMessage".concat(globalWebAdminLanguage), JSON.stringify(messages));
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
  return keyCheck.$licKey.val().length === 28 || value.length > 0;
};
/**
 *  Initialize licensing modify form on document ready
 */


$(document).ready(function () {
  keyCheck.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUhlYWRlciIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiIsIiRjb3Vwb25TZWN0aW9uIiwiJGZvcm1FcnJvck1lc3NhZ2VzIiwiJGxpY0tleSIsIiRjb3Vwb24iLCIkZW1haWwiLCIkYWpheE1lc3NhZ2VzIiwiJGxpY2Vuc2VEZXRhaWxJbmZvIiwiJHJlc2V0QnV0dG9uIiwiJHByb2R1Y3REZXRhaWxzIiwiJGFjY29yZGlvbnMiLCJkZWZhdWx0TGljZW5zZUtleSIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJhY2NvcmRpb24iLCJoaWRlIiwiaW5wdXRtYXNrIiwib25CZWZvcmVQYXN0ZSIsImNiT25Db3Vwb25CZWZvcmVQYXN0ZSIsIm9uY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlIiwib25pbmNvbXBsZXRlIiwiY2xlYXJJbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSIsInZhbCIsInByZXZpb3VzS2V5TWVzc2FnZSIsInNlc3Npb25TdG9yYWdlIiwiZ2V0SXRlbSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCJzaG93TGljZW5zZUVycm9yIiwiSlNPTiIsInBhcnNlIiwib24iLCJhZGRDbGFzcyIsIlBieEFwaSIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJjYkFmdGVyUmVzZXRMaWNlbnNlS2V5IiwiaW5pdGlhbGl6ZUZvcm0iLCJsZW5ndGgiLCJodG1sIiwic2hvdyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsImFmdGVyIiwibGljX0xpY2Vuc2VLZXlWYWxpZCIsIm1lc3NhZ2VzIiwidW5kZWZpbmVkIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJsaWNfRmFpbGVkQ2hlY2tMaWNlbnNlTm90UGJ4UmVzcG9uc2UiLCJsaWNfTGljZW5zZVByb2JsZW0iLCJsaWNlbnNlSW5mbyIsInNob3dMaWNlbnNlSW5mbyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJhdHRyIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwidHJhbnNpdGlvbiIsInJlcGxhY2UiLCJtZXNzYWdlIiwibGljZW5zZURhdGEiLCJ0ZXh0IiwidGVsIiwicHJvZHVjdHMiLCJwcm9kdWN0IiwiQXJyYXkiLCJpc0FycmF5IiwicHVzaCIsImtleSIsInByb2R1Y3RWYWx1ZSIsInJvdyIsImRhdGVFeHBpcmVkIiwiRGF0ZSIsImV4cGlyZWQiLCJkYXRlTm93IiwibmFtZSIsImxpY19FeHBpcmVkIiwidHJpYWwiLCJleHBpcmVkVGV4dCIsImxpY19FeHBpcmVkQWZ0ZXIiLCJmZWF0dXJlIiwiZmVhdHVyZVZhbHVlIiwiZmVhdHVyZUluZm8iLCJsaWNfRmVhdHVyZUluZm8iLCJjb3VudCIsImNvdW50ZWFjaCIsImNhcHR1cmVkIiwiYXBwZW5kIiwiY2JBZnRlckZvcm1Qcm9jZXNzaW5nIiwic3VjY2VzcyIsImRhdGEiLCJQQlhMaWNlbnNlIiwiZ2xvYmFsUEJYTGljZW5zZSIsImZvcm0iLCJzaG93RXJyb3IiLCJsaWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJtYW5hZ2VMaW5rIiwibGljX01hbmFnZUxpY2Vuc2UiLCJzZXRJdGVtIiwic3RyaW5naWZ5IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwiZm9ybURhdGEiLCJMaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImZuIiwiY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5IiwidmFsdWUiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHdCQUFELENBTEU7QUFPYkMsRUFBQUEsb0JBQW9CLEVBQUVELENBQUMsQ0FBQyx5QkFBRCxDQVBWO0FBUWJFLEVBQUFBLHVCQUF1QixFQUFFRixDQUFDLENBQUMsNEJBQUQsQ0FSYjtBQVNiRyxFQUFBQSxxQkFBcUIsRUFBRUgsQ0FBQyxDQUFDLDBCQUFELENBVFg7QUFVYkksRUFBQUEsd0JBQXdCLEVBQUVKLENBQUMsQ0FBQywwQkFBRCxDQVZkO0FBV2JLLEVBQUFBLGNBQWMsRUFBRUwsQ0FBQyxDQUFDLGdCQUFELENBWEo7QUFZYk0sRUFBQUEsa0JBQWtCLEVBQUVOLENBQUMsQ0FBQyxzQkFBRCxDQVpSO0FBYWJPLEVBQUFBLE9BQU8sRUFBRVAsQ0FBQyxDQUFDLFNBQUQsQ0FiRztBQWNiUSxFQUFBQSxPQUFPLEVBQUVSLENBQUMsQ0FBQyxTQUFELENBZEc7QUFlYlMsRUFBQUEsTUFBTSxFQUFFVCxDQUFDLENBQUMsUUFBRCxDQWZJO0FBZ0JiVSxFQUFBQSxhQUFhLEVBQUVWLENBQUMsQ0FBQyxrQkFBRCxDQWhCSDtBQWlCYlcsRUFBQUEsa0JBQWtCLEVBQUVYLENBQUMsQ0FBQyxvQkFBRCxDQWpCUjtBQWtCYlksRUFBQUEsWUFBWSxFQUFFWixDQUFDLENBQUMsZ0JBQUQsQ0FsQkY7QUFtQmJhLEVBQUFBLGVBQWUsRUFBRWIsQ0FBQyxDQUFDLGlCQUFELENBbkJMO0FBb0JiYyxFQUFBQSxXQUFXLEVBQUVkLENBQUMsQ0FBQyxzQ0FBRCxDQXBCRDtBQXFCYmUsRUFBQUEsaUJBQWlCLEVBQUUsSUFyQk47O0FBdUJiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFdBQVcsRUFBRTtBQUNUQyxNQUFBQSxVQUFVLEVBQUUsYUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsNkJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREc7QUFGRSxLQURGO0FBVVhDLElBQUFBLEtBQUssRUFBRTtBQUNITixNQUFBQSxVQUFVLEVBQUUsT0FEVDtBQUVIQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsNkJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRjVCLE9BREc7QUFGSixLQVZJO0FBbUJYQyxJQUFBQSxPQUFPLEVBQUU7QUFDTFIsTUFBQUEsVUFBVSxFQUFFLFNBRFA7QUFFTEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLDZCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDSztBQUY1QixPQURHO0FBRkYsS0FuQkU7QUE0QlhDLElBQUFBLE1BQU0sRUFBRTtBQUNKVixNQUFBQSxVQUFVLEVBQUUsUUFEUjtBQUVKVyxNQUFBQSxRQUFRLEVBQUUsSUFGTjtBQUdKVixNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsaUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNRO0FBRjVCLE9BREc7QUFISCxLQTVCRztBQXNDWEMsSUFBQUEsTUFBTSxFQUFFO0FBQ0pDLE1BQUFBLE9BQU8sRUFBRSxRQURMO0FBRUpkLE1BQUFBLFVBQVUsRUFBRSxRQUZSO0FBR0pXLE1BQUFBLFFBQVEsRUFBRSxJQUhOO0FBSUpWLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxpQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1c7QUFGNUIsT0FERztBQUpIO0FBdENHLEdBNUJGO0FBK0ViO0FBQ0FDLEVBQUFBLFVBaEZhLHdCQWdGQTtBQUNUcEMsSUFBQUEsUUFBUSxDQUFDZ0IsV0FBVCxDQUFxQnFCLFNBQXJCO0FBQ0FyQyxJQUFBQSxRQUFRLENBQUNhLGtCQUFULENBQTRCeUIsSUFBNUIsR0FGUyxDQUlUOztBQUNBdEMsSUFBQUEsUUFBUSxDQUFDVSxPQUFULENBQWlCNkIsU0FBakIsQ0FBMkIsaUNBQTNCLEVBQThEO0FBQzFEQyxNQUFBQSxhQUFhLEVBQUV4QyxRQUFRLENBQUN5QztBQURrQyxLQUE5RCxFQUxTLENBU1Q7O0FBQ0F6QyxJQUFBQSxRQUFRLENBQUNTLE9BQVQsQ0FBaUI4QixTQUFqQixDQUEyQiw4QkFBM0IsRUFBMkQ7QUFDdkRHLE1BQUFBLFVBQVUsRUFBRTFDLFFBQVEsQ0FBQzJDLHlCQURrQztBQUV2REMsTUFBQUEsWUFBWSxFQUFFNUMsUUFBUSxDQUFDMkMseUJBRmdDO0FBR3ZERSxNQUFBQSxlQUFlLEVBQUUsSUFIc0M7QUFJdkRMLE1BQUFBLGFBQWEsRUFBRXhDLFFBQVEsQ0FBQzhDO0FBSitCLEtBQTNEO0FBT0E5QyxJQUFBQSxRQUFRLENBQUNXLE1BQVQsQ0FBZ0I0QixTQUFoQixDQUEwQixPQUExQjtBQUNBdkMsSUFBQUEsUUFBUSxDQUFDaUIsaUJBQVQsR0FBNkJqQixRQUFRLENBQUNTLE9BQVQsQ0FBaUJzQyxHQUFqQixFQUE3QixDQWxCUyxDQW9CVDs7QUFDQSxRQUFNQyxrQkFBa0IsR0FBR0MsY0FBYyxDQUFDQyxPQUFmLDZCQUE0Q0Msc0JBQTVDLEVBQTNCOztBQUNBLFFBQUlILGtCQUFKLEVBQXdCO0FBQ3BCaEQsTUFBQUEsUUFBUSxDQUFDb0QsZ0JBQVQsQ0FBMEJDLElBQUksQ0FBQ0MsS0FBTCxDQUFXTixrQkFBWCxDQUExQjtBQUNILEtBeEJRLENBMEJUOzs7QUFDQWhELElBQUFBLFFBQVEsQ0FBQ2MsWUFBVCxDQUFzQnlDLEVBQXRCLENBQXlCLE9BQXpCLEVBQWtDLFlBQU07QUFDcEN2RCxNQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0J1RCxRQUFsQixDQUEyQixrQkFBM0I7QUFDQUMsTUFBQUEsTUFBTSxDQUFDQyxzQkFBUCxDQUE4QjFELFFBQVEsQ0FBQzJELHNCQUF2QztBQUNILEtBSEQ7QUFLQTNELElBQUFBLFFBQVEsQ0FBQzJDLHlCQUFUO0FBRUEzQyxJQUFBQSxRQUFRLENBQUM0RCxjQUFULEdBbENTLENBb0NUOztBQUNBLFFBQUk1RCxRQUFRLENBQUNpQixpQkFBVCxDQUEyQjRDLE1BQTNCLEtBQXNDLEVBQTFDLEVBQThDO0FBQzFDN0QsTUFBQUEsUUFBUSxDQUFDSyxxQkFBVCxDQUNLeUQsSUFETCxXQUNhOUQsUUFBUSxDQUFDaUIsaUJBRHRCLDhDQUVLOEMsSUFGTDtBQUdBL0QsTUFBQUEsUUFBUSxDQUFDSSx1QkFBVCxDQUFpQzJELElBQWpDO0FBQ0FOLE1BQUFBLE1BQU0sQ0FBQ08sOEJBQVAsQ0FBc0NoRSxRQUFRLENBQUNpRSw4QkFBL0M7QUFDQVIsTUFBQUEsTUFBTSxDQUFDUyxxQkFBUCxDQUE2QmxFLFFBQVEsQ0FBQ21FLHFCQUF0QztBQUNBbkUsTUFBQUEsUUFBUSxDQUFDRyxvQkFBVCxDQUE4Qm1DLElBQTlCO0FBQ0gsS0FSRCxNQVFPO0FBQ0h0QyxNQUFBQSxRQUFRLENBQUNJLHVCQUFULENBQWlDa0MsSUFBakM7QUFDQXRDLE1BQUFBLFFBQVEsQ0FBQ0sscUJBQVQsQ0FBK0JpQyxJQUEvQjtBQUNBdEMsTUFBQUEsUUFBUSxDQUFDRyxvQkFBVCxDQUE4QjRELElBQTlCO0FBQ0g7QUFDSixHQWxJWTs7QUFvSWI7QUFDSjtBQUNBO0FBQ0E7QUFDSUosRUFBQUEsc0JBeElhLGtDQXdJVVMsUUF4SVYsRUF3SW9CO0FBQzdCO0FBQ0FwRSxJQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0JvRSxXQUFsQixDQUE4QixrQkFBOUI7O0FBRUEsUUFBSUQsUUFBUSxLQUFLLEtBQWpCLEVBQXdCO0FBQ3BCO0FBQ0E7QUFDQUUsTUFBQUEsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUFoQjtBQUNIO0FBQ0osR0FqSlk7O0FBbUpiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lQLEVBQUFBLDhCQXZKYSwwQ0F1SmtCRyxRQXZKbEIsRUF1SjRCO0FBQ3JDO0FBQ0FsRSxJQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQnVFLE1BQTNCOztBQUNBLFFBQUlMLFFBQVEsS0FBSyxJQUFqQixFQUF1QjtBQUNuQjtBQUNBcEUsTUFBQUEsUUFBUSxDQUFDQyxRQUFULENBQWtCb0UsV0FBbEIsQ0FBOEIsT0FBOUIsRUFBdUNiLFFBQXZDLENBQWdELFNBQWhEO0FBQ0F4RCxNQUFBQSxRQUFRLENBQUNLLHFCQUFULENBQStCcUUsS0FBL0IscUZBQThHbEQsZUFBZSxDQUFDbUQsbUJBQTlIO0FBQ0EzRSxNQUFBQSxRQUFRLENBQUNJLHVCQUFULENBQWlDMkQsSUFBakM7QUFDSCxLQUxELE1BS087QUFDSDtBQUNBLFVBQUlLLFFBQVEsS0FBSyxLQUFiLElBQXNCQSxRQUFRLENBQUNRLFFBQVQsS0FBc0JDLFNBQWhELEVBQTJEO0FBQ3ZEO0FBQ0FDLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QnZELGVBQWUsQ0FBQ3dELG9DQUE1QyxFQUFrRnhELGVBQWUsQ0FBQ3lELGtCQUFsRztBQUNBakYsUUFBQUEsUUFBUSxDQUFDSSx1QkFBVCxDQUFpQzJELElBQWpDO0FBQ0gsT0FKRCxNQUlPO0FBQ0g7QUFDQS9ELFFBQUFBLFFBQVEsQ0FBQ29ELGdCQUFULENBQTBCZ0IsUUFBUSxDQUFDUSxRQUFuQztBQUNBNUUsUUFBQUEsUUFBUSxDQUFDSSx1QkFBVCxDQUFpQzJELElBQWpDO0FBQ0g7QUFDSjtBQUNKLEdBM0tZOztBQTZLYjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxxQkFqTGEsaUNBaUxTQyxRQWpMVCxFQWlMbUI7QUFDNUIsUUFBSUEsUUFBUSxDQUFDYyxXQUFULEtBQXlCTCxTQUE3QixFQUF3QztBQUNwQztBQUNBN0UsTUFBQUEsUUFBUSxDQUFDbUYsZUFBVCxDQUF5QmYsUUFBUSxDQUFDYyxXQUFsQztBQUNBbEYsTUFBQUEsUUFBUSxDQUFDYSxrQkFBVCxDQUE0QmtELElBQTVCO0FBQ0gsS0FKRCxNQUlPO0FBQ0g7QUFDQS9ELE1BQUFBLFFBQVEsQ0FBQ2Esa0JBQVQsQ0FBNEJ5QixJQUE1QjtBQUNIO0FBQ0osR0ExTFk7O0FBNExiO0FBQ0o7QUFDQTtBQUNJSyxFQUFBQSx5QkEvTGEsdUNBK0xlO0FBQ3hCLFFBQU1iLE1BQU0sR0FBRzlCLFFBQVEsQ0FBQ1MsT0FBVCxDQUFpQnNDLEdBQWpCLEVBQWY7O0FBQ0EsUUFBSWpCLE1BQU0sQ0FBQytCLE1BQVAsS0FBa0IsRUFBdEIsRUFBMEI7QUFDdEI7QUFDQTdELE1BQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQm1GLElBQWxCLENBQXVCLGdCQUF2QixFQUF5Q0MsSUFBekMsQ0FBOEMsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQzFEckYsUUFBQUEsQ0FBQyxDQUFDcUYsR0FBRCxDQUFELENBQU9DLElBQVAsQ0FBWSxRQUFaLEVBQXNCLEVBQXRCO0FBQ0gsT0FGRDtBQUdBeEYsTUFBQUEsUUFBUSxDQUFDTSx3QkFBVCxDQUFrQ2dDLElBQWxDO0FBQ0F0QyxNQUFBQSxRQUFRLENBQUNPLGNBQVQsQ0FBd0J3RCxJQUF4QjtBQUNBL0QsTUFBQUEsUUFBUSxDQUFDUSxrQkFBVCxDQUE0QmlGLEtBQTVCO0FBQ0gsS0FSRCxNQVFPO0FBQ0g7QUFDQXpGLE1BQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQm1GLElBQWxCLENBQXVCLGdCQUF2QixFQUF5Q0MsSUFBekMsQ0FBOEMsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQzFEckYsUUFBQUEsQ0FBQyxDQUFDcUYsR0FBRCxDQUFELENBQU9HLFVBQVAsQ0FBa0IsUUFBbEI7QUFDSCxPQUZEO0FBR0ExRixNQUFBQSxRQUFRLENBQUNNLHdCQUFULENBQWtDeUQsSUFBbEM7QUFDQS9ELE1BQUFBLFFBQVEsQ0FBQ08sY0FBVCxDQUF3QitCLElBQXhCO0FBQ0g7QUFDSixHQWpOWTs7QUFtTmI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJUSxFQUFBQSx5QkF4TmEscUNBd05hNkMsV0F4TmIsRUF3TjBCO0FBQ25DLFFBQUlBLFdBQVcsQ0FBQ0MsT0FBWixDQUFvQixPQUFwQixNQUFpQyxDQUFDLENBQXRDLEVBQXlDO0FBQ3JDNUYsTUFBQUEsUUFBUSxDQUFDUyxPQUFULENBQWlCb0YsVUFBakIsQ0FBNEIsT0FBNUI7QUFDQSxhQUFPLEtBQVA7QUFDSDs7QUFDRCxXQUFPRixXQUFXLENBQUNHLE9BQVosQ0FBb0IsTUFBcEIsRUFBNEIsRUFBNUIsQ0FBUDtBQUNILEdBOU5ZOztBQWdPYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lyRCxFQUFBQSxxQkFyT2EsaUNBcU9Ta0QsV0FyT1QsRUFxT3NCO0FBQy9CLFFBQUlBLFdBQVcsQ0FBQ0MsT0FBWixDQUFvQixVQUFwQixNQUFvQyxDQUFDLENBQXpDLEVBQTRDO0FBQ3hDNUYsTUFBQUEsUUFBUSxDQUFDVSxPQUFULENBQWlCbUYsVUFBakIsQ0FBNEIsT0FBNUI7QUFDQSxhQUFPLEtBQVA7QUFDSDs7QUFDRCxXQUFPRixXQUFXLENBQUNHLE9BQVosQ0FBb0IsTUFBcEIsRUFBNEIsRUFBNUIsQ0FBUDtBQUNILEdBM09ZOztBQTZPYjtBQUNKO0FBQ0E7QUFDQTtBQUNJWCxFQUFBQSxlQWpQYSwyQkFpUEdZLE9BalBILEVBaVBZO0FBQ3JCLFFBQU1DLFdBQVcsR0FBRzNDLElBQUksQ0FBQ0MsS0FBTCxDQUFXeUMsT0FBWCxDQUFwQjs7QUFDQSxRQUFJQyxXQUFXLENBQUMsYUFBRCxDQUFYLEtBQStCbkIsU0FBbkMsRUFBOEM7QUFDMUM7QUFDSDs7QUFDRDNFLElBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCK0YsSUFBdEIsQ0FBMkJELFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkI3RSxXQUF0RDtBQUNBakIsSUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQitGLElBQWxCLENBQXVCRCxXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCcEUsT0FBbEQ7QUFDQTFCLElBQUFBLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0IrRixJQUFoQixDQUFxQkQsV0FBVyxDQUFDLGFBQUQsQ0FBWCxDQUEyQnRFLEtBQWhEO0FBQ0F4QixJQUFBQSxDQUFDLENBQUMsVUFBRCxDQUFELENBQWMrRixJQUFkLENBQW1CRCxXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCRSxHQUE5QztBQUNBLFFBQUlDLFFBQVEsR0FBR0gsV0FBVyxDQUFDSSxPQUEzQjs7QUFDQSxRQUFJLENBQUNDLEtBQUssQ0FBQ0MsT0FBTixDQUFjSCxRQUFkLENBQUwsRUFBOEI7QUFDMUJBLE1BQUFBLFFBQVEsR0FBRyxFQUFYO0FBQ0FBLE1BQUFBLFFBQVEsQ0FBQ0ksSUFBVCxDQUFjUCxXQUFXLENBQUNJLE9BQTFCO0FBQ0g7O0FBQ0RsRyxJQUFBQSxDQUFDLENBQUNtRixJQUFGLENBQU9jLFFBQVAsRUFBaUIsVUFBQ0ssR0FBRCxFQUFNQyxZQUFOLEVBQXVCO0FBQ3BDLFVBQUlBLFlBQVksS0FBSzVCLFNBQXJCLEVBQWdDO0FBQzVCO0FBQ0g7O0FBQ0QsVUFBSTZCLEdBQUcsR0FBRyxVQUFWO0FBQ0EsVUFBSU4sT0FBTyxHQUFHSyxZQUFkOztBQUNBLFVBQUlMLE9BQU8sQ0FBQyxhQUFELENBQVAsS0FBMkJ2QixTQUEvQixFQUEwQztBQUN0Q3VCLFFBQUFBLE9BQU8sR0FBR0ssWUFBWSxDQUFDLGFBQUQsQ0FBdEI7QUFDSDs7QUFDRCxVQUFNRSxXQUFXLEdBQUcsSUFBSUMsSUFBSixDQUFTUixPQUFPLENBQUNTLE9BQVIsQ0FBZ0JmLE9BQWhCLENBQXdCLHlCQUF4QixFQUFtRCxVQUFuRCxDQUFULENBQXBCO0FBQ0EsVUFBTWdCLE9BQU8sR0FBRyxJQUFJRixJQUFKLEVBQWhCOztBQUNBLFVBQUlFLE9BQU8sR0FBR0gsV0FBZCxFQUEyQjtBQUN2QkQsUUFBQUEsR0FBRyxpREFBd0NOLE9BQU8sQ0FBQ1csSUFBaEQsa0NBQ052RixlQUFlLENBQUN3RixXQURWLGFBQUg7QUFFSCxPQUhELE1BR08sSUFBSVosT0FBTyxDQUFDUyxPQUFSLENBQWdCaEQsTUFBaEIsS0FBMkIsQ0FBM0IsSUFBZ0N1QyxPQUFPLENBQUNhLEtBQVIsS0FBa0IsR0FBdEQsRUFBMkQ7QUFDOURQLFFBQUFBLEdBQUcsaURBQXdDTixPQUFPLENBQUNXLElBQWhELGtDQUNOdkYsZUFBZSxDQUFDd0YsV0FEVixhQUFIO0FBRUgsT0FITSxNQUdBO0FBQ0hOLFFBQUFBLEdBQUcsaURBQXdDTixPQUFPLENBQUNXLElBQWhELENBQUg7O0FBQ0EsWUFBSVgsT0FBTyxDQUFDUyxPQUFSLENBQWdCaEQsTUFBaEIsR0FBeUIsQ0FBN0IsRUFBZ0M7QUFDNUIsY0FBSXFELFdBQVcsR0FBRzFGLGVBQWUsQ0FBQzJGLGdCQUFsQztBQUNBRCxVQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQ3BCLE9BQVosQ0FBb0IsV0FBcEIsRUFBaUNNLE9BQU8sQ0FBQ1MsT0FBekMsQ0FBZDtBQUNBSCxVQUFBQSxHQUFHLHlCQUFrQlEsV0FBbEIsYUFBSDtBQUNIOztBQUNEUixRQUFBQSxHQUFHLElBQUksNkJBQVA7QUFDQXhHLFFBQUFBLENBQUMsQ0FBQ21GLElBQUYsQ0FBT29CLFlBQVksQ0FBQ1csT0FBcEIsRUFBNkIsVUFBQzlCLEtBQUQsRUFBUStCLFlBQVIsRUFBeUI7QUFDbEQsY0FBSUMsV0FBVyxHQUFHOUYsZUFBZSxDQUFDK0YsZUFBbEM7QUFDQSxjQUFJSCxPQUFPLEdBQUdDLFlBQWQ7O0FBQ0EsY0FBSUEsWUFBWSxDQUFDLGFBQUQsQ0FBWixLQUFnQ3hDLFNBQXBDLEVBQStDO0FBQzNDdUMsWUFBQUEsT0FBTyxHQUFHQyxZQUFZLENBQUMsYUFBRCxDQUF0QjtBQUNIOztBQUNEQyxVQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQ3hCLE9BQVosQ0FBb0IsUUFBcEIsRUFBOEJzQixPQUFPLENBQUNMLElBQXRDLENBQWQ7QUFDQU8sVUFBQUEsV0FBVyxHQUFHQSxXQUFXLENBQUN4QixPQUFaLENBQW9CLFNBQXBCLEVBQStCc0IsT0FBTyxDQUFDSSxLQUF2QyxDQUFkO0FBQ0FGLFVBQUFBLFdBQVcsR0FBR0EsV0FBVyxDQUFDeEIsT0FBWixDQUFvQixhQUFwQixFQUFtQ3NCLE9BQU8sQ0FBQ0ssU0FBM0MsQ0FBZDtBQUNBSCxVQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQ3hCLE9BQVosQ0FBb0IsWUFBcEIsRUFBa0NzQixPQUFPLENBQUNNLFFBQTFDLENBQWQ7QUFDQWhCLFVBQUFBLEdBQUcsY0FBT1ksV0FBUCxTQUFIO0FBQ0gsU0FYRDtBQVlBWixRQUFBQSxHQUFHLElBQUksU0FBUDtBQUNIOztBQUNEQSxNQUFBQSxHQUFHLElBQUksa0JBQVA7QUFDQXhHLE1BQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCeUgsTUFBM0IsQ0FBa0NqQixHQUFsQztBQUNILEtBekNEO0FBMENILEdBelNZOztBQTJTYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lrQixFQUFBQSxxQkFoVGEsaUNBZ1RTeEQsUUFoVFQsRUFnVG1CeUQsT0FoVG5CLEVBZ1Q0QjtBQUNyQyxRQUFJQSxPQUFPLEtBQUssSUFBaEIsRUFBc0I7QUFDbEIsVUFBSSxPQUFPekQsUUFBUSxDQUFDMEQsSUFBVCxDQUFjQyxVQUFyQixLQUFvQyxXQUF4QyxFQUFxRDtBQUNqREMsUUFBQUEsZ0JBQWdCLEdBQUc1RCxRQUFRLENBQUMwRCxJQUFULENBQWNDLFVBQWpDO0FBQ0EvSCxRQUFBQSxRQUFRLENBQUNDLFFBQVQsQ0FBa0JnSSxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxRQUFwQyxFQUE4QzdELFFBQVEsQ0FBQzBELElBQVQsQ0FBY0MsVUFBNUQ7QUFDSDs7QUFDRDdILE1BQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCNEQsSUFBM0IsQ0FBZ0MsRUFBaEM7QUFFQTlELE1BQUFBLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQmdJLElBQWxCLENBQXVCLFdBQXZCLEVBQW9DLFFBQXBDLEVBQThDLEVBQTlDO0FBRUFqSSxNQUFBQSxRQUFRLENBQUNvQyxVQUFUOztBQUNBLFVBQUlnQyxRQUFRLENBQUNRLFFBQVQsQ0FBa0JmLE1BQWxCLEtBQTZCLENBQWpDLEVBQW9DO0FBQ2hDaUIsUUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCWCxRQUFRLENBQUNRLFFBQXJDO0FBQ0g7QUFDSixLQWJELE1BYU8sSUFBSVIsUUFBUSxDQUFDUSxRQUFULEtBQXNCQyxTQUExQixFQUFxQztBQUN4Q0MsTUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCWCxRQUFRLENBQUNRLFFBQXJDO0FBQ0gsS0FGTSxNQUVBO0FBQ0hFLE1BQUFBLFdBQVcsQ0FBQ29ELFNBQVosQ0FBc0IxRyxlQUFlLENBQUMyRyw4QkFBdEM7QUFDSCxLQWxCb0MsQ0FvQnJDOzs7QUFDQUMsSUFBQUEsSUFBSSxDQUFDQyxXQUFMO0FBQ0gsR0F0VVk7O0FBd1ViO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWpGLEVBQUFBLGdCQTdVYSw0QkE2VUl3QixRQTdVSixFQTZVYztBQUN2QixRQUFJMEQsVUFBVSxpQkFBVTlHLGVBQWUsQ0FBQytHLGlCQUExQixvRUFBZDs7QUFDQSxRQUFJdkksUUFBUSxDQUFDaUIsaUJBQVQsQ0FBMkI0QyxNQUEzQixLQUFzQyxFQUExQyxFQUE4QztBQUMxQ3lFLE1BQUFBLFVBQVUsSUFBSXRJLFFBQVEsQ0FBQ2lCLGlCQUF2QjtBQUNIOztBQUNEcUgsSUFBQUEsVUFBVSxJQUFJLDhDQUFkO0FBQ0ExRCxJQUFBQSxRQUFRLENBQUMyQixJQUFULENBQWMrQixVQUFkO0FBQ0F4RCxJQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJILFFBQTVCLEVBQXNDcEQsZUFBZSxDQUFDeUQsa0JBQXRELEVBQTBFLElBQTFFO0FBQ0FoQyxJQUFBQSxjQUFjLENBQUN1RixPQUFmLDZCQUE0Q3JGLHNCQUE1QyxHQUFzRUUsSUFBSSxDQUFDb0YsU0FBTCxDQUFlN0QsUUFBZixDQUF0RTtBQUNILEdBdFZZOztBQXVWYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0k4RCxFQUFBQSxnQkE1VmEsNEJBNFZJQyxRQTVWSixFQTRWYztBQUN2QixXQUFPQSxRQUFQO0FBQ0gsR0E5Vlk7O0FBZ1diO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGVBcFdhLDJCQW9XR3hFLFFBcFdILEVBb1dhO0FBQ3RCLFFBQU15RSxRQUFRLEdBQUc3SSxRQUFRLENBQUNDLFFBQVQsQ0FBa0JnSSxJQUFsQixDQUF1QixZQUF2QixDQUFqQjtBQUNBeEUsSUFBQUEsTUFBTSxDQUFDcUYseUJBQVAsQ0FBaUNELFFBQWpDLEVBQTJDN0ksUUFBUSxDQUFDNEgscUJBQXBEO0FBQ0gsR0F2V1k7O0FBeVdiO0FBQ0o7QUFDQTtBQUNJaEUsRUFBQUEsY0E1V2EsNEJBNFdJO0FBQ2J3RSxJQUFBQSxJQUFJLENBQUNuSSxRQUFMLEdBQWdCRCxRQUFRLENBQUNDLFFBQXpCO0FBQ0FtSSxJQUFBQSxJQUFJLENBQUNXLEdBQUwsYUFBY0MsYUFBZCxvQkFGYSxDQUVnQzs7QUFDN0NaLElBQUFBLElBQUksQ0FBQ2xILGFBQUwsR0FBcUJsQixRQUFRLENBQUNrQixhQUE5QixDQUhhLENBR2dDOztBQUM3Q2tILElBQUFBLElBQUksQ0FBQ00sZ0JBQUwsR0FBd0IxSSxRQUFRLENBQUMwSSxnQkFBakMsQ0FKYSxDQUlzQzs7QUFDbkROLElBQUFBLElBQUksQ0FBQ1EsZUFBTCxHQUF1QjVJLFFBQVEsQ0FBQzRJLGVBQWhDLENBTGEsQ0FLb0M7O0FBQ2pEUixJQUFBQSxJQUFJLENBQUNoRyxVQUFMO0FBQ0g7QUFuWFksQ0FBakI7QUFzWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQWxDLENBQUMsQ0FBQytJLEVBQUYsQ0FBS2hCLElBQUwsQ0FBVVUsUUFBVixDQUFtQnRILEtBQW5CLENBQXlCNkgsMkJBQXpCLEdBQXVELFVBQVVDLEtBQVYsRUFBaUI7QUFDcEUsU0FBUW5KLFFBQVEsQ0FBQ1MsT0FBVCxDQUFpQnNDLEdBQWpCLEdBQXVCYyxNQUF2QixLQUFrQyxFQUFsQyxJQUF3Q3NGLEtBQUssQ0FBQ3RGLE1BQU4sR0FBZSxDQUEvRDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7OztBQUNBM0QsQ0FBQyxDQUFDa0osUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnJKLEVBQUFBLFFBQVEsQ0FBQ29DLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFBCWExpY2Vuc2UsIFVzZXJNZXNzYWdlKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbW9kdWxlcyBsaWNlbnNlIGtleVxuICpcbiAqIEBtb2R1bGUga2V5Q2hlY2tcbiAqL1xuY29uc3Qga2V5Q2hlY2sgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybScpLFxuXG4gICAgJGVtcHR5TGljZW5zZUtleUluZm86ICQoJy5lbXB0eS1saWNlbnNlLWtleS1pbmZvJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXI6ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaGVhZGVyJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlJbmZvOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8nKSxcbiAgICAkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb246ICQoJyNnZXROZXdLZXlMaWNlbnNlU2VjdGlvbicpLFxuICAgICRjb3Vwb25TZWN0aW9uOiAkKCcjY291cG9uU2VjdGlvbicpLFxuICAgICRmb3JtRXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcbiAgICAkbGljS2V5OiAkKCcjbGljS2V5JyksXG4gICAgJGNvdXBvbjogJCgnI2NvdXBvbicpLFxuICAgICRlbWFpbDogJCgnI2VtYWlsJyksXG4gICAgJGFqYXhNZXNzYWdlczogJCgnLnVpLm1lc3NhZ2UuYWpheCcpLFxuICAgICRsaWNlbnNlRGV0YWlsSW5mbzogJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyksXG4gICAgJHJlc2V0QnV0dG9uOiAkKCcjcmVzZXQtbGljZW5zZScpLFxuICAgICRwcm9kdWN0RGV0YWlsczogJCgnI3Byb2R1Y3REZXRhaWxzJyksXG4gICAgJGFjY29yZGlvbnM6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0gLnVpLmFjY29yZGlvbicpLFxuICAgIGRlZmF1bHRMaWNlbnNlS2V5OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGNvbXBhbnluYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb250YWN0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29udGFjdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBsaWNLZXk6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdsaWNLZXknLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY291cG9uOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAnbGljS2V5JyxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSBsaWNlbnNpbmcgcGFnZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBrZXlDaGVjay4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcbiAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcblxuICAgICAgICAvLyBTZXQgaW5wdXQgbWFzayBmb3IgY291cG9uIGNvZGUgZmllbGRcbiAgICAgICAga2V5Q2hlY2suJGNvdXBvbi5pbnB1dG1hc2soJ01JS09VUEQtKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBrZXlDaGVjay5jYk9uQ291cG9uQmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBsaWNlbnNlIGtleSBmaWVsZFxuICAgICAgICBrZXlDaGVjay4kbGljS2V5LmlucHV0bWFzaygnTUlLTy0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uY29tcGxldGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBvbmluY29tcGxldGU6IGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBjbGVhckluY29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlLFxuICAgICAgICB9KTtcblxuICAgICAgICBrZXlDaGVjay4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcpO1xuICAgICAgICBrZXlDaGVjay5kZWZhdWx0TGljZW5zZUtleSA9IGtleUNoZWNrLiRsaWNLZXkudmFsKCk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSBwcmV2aW91cyBsaWNlbnNlIGVycm9yIG1lc3NhZ2UgdG8gcHJldmVudCBibGlua2luZ1xuICAgICAgICBjb25zdCBwcmV2aW91c0tleU1lc3NhZ2UgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGBwcmV2aW91c0tleU1lc3NhZ2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG4gICAgICAgIGlmIChwcmV2aW91c0tleU1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLnNob3dMaWNlbnNlRXJyb3IoSlNPTi5wYXJzZShwcmV2aW91c0tleU1lc3NhZ2UpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSByZXNldCBidXR0b24gY2xpY2tcbiAgICAgICAga2V5Q2hlY2suJHJlc2V0QnV0dG9uLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBQYnhBcGkuTGljZW5zZVJlc2V0TGljZW5zZUtleShrZXlDaGVjay5jYkFmdGVyUmVzZXRMaWNlbnNlS2V5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpO1xuXG4gICAgICAgIGtleUNoZWNrLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYSBsaWNlbnNlIGtleSBpcyBwcmVzZW50XG4gICAgICAgIGlmIChrZXlDaGVjay5kZWZhdWx0TGljZW5zZUtleS5sZW5ndGggPT09IDI4KSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm9cbiAgICAgICAgICAgICAgICAuaHRtbChgJHtrZXlDaGVjay5kZWZhdWx0TGljZW5zZUtleX0gPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT5gKVxuICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICBQYnhBcGkuTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGtleUNoZWNrLmNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyk7XG4gICAgICAgICAgICBQYnhBcGkuTGljZW5zZUdldExpY2Vuc2VJbmZvKGtleUNoZWNrLmNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZW1wdHlMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5oaWRlKCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXNldHRpbmcgdGhlIGxpY2Vuc2Uga2V5LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgbGljZW5zZSBrZXkgcmVzZXQuXG4gICAgICovXG4gICAgY2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgYW5kIGRpc2FibGVkIGNsYXNzZXMgZnJvbSB0aGUgZm9ybVxuICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSByZXNwb25zZSBpcyBub3QgZmFsc2UsIGluZGljYXRpbmcgYSBzdWNjZXNzZnVsIGxpY2Vuc2Uga2V5IHJlc2V0LFxuICAgICAgICAgICAgLy8gcmVsb2FkIHRoZSB3aW5kb3cgdG8gYXBwbHkgdGhlIGNoYW5nZXNcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgZ2V0dGluZyB0aGUgTWlrb1BCWCBmZWF0dXJlIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBpbmRpY2F0aW5nIHRoZSBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgc3Bpbm5lciBhbmQgYW55IHByZXZpb3VzIEFKQVggbWVzc2FnZXNcbiAgICAgICAgJCgnLnNwaW5uZXIubG9hZGluZy5pY29uJykucmVtb3ZlKCk7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gTWlrb1BCWCBmZWF0dXJlIHN0YXR1cyBpcyB0cnVlICh2YWxpZClcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdzdWNjZXNzJyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBzdWNjZXNzIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiY2hlY2sgZ3JlZW4gaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VLZXlWYWxpZH08L2Rpdj5gKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE1pa29QQlggZmVhdHVyZSBzdGF0dXMgaXMgZmFsc2Ugb3IgYW4gZXJyb3Igb2NjdXJyZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgcmVzcG9uc2UubWVzc2FnZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIEZhaWxlZCB0byBjaGVjayBsaWNlbnNlIHN0YXR1cyAocmVzcG9uc2UgaXMgZmFsc2Ugb3Igbm8gbWVzc2FnZXMgYXZhaWxhYmxlKVxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUubGljX0ZhaWxlZENoZWNrTGljZW5zZU5vdFBieFJlc3BvbnNlLCBnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VQcm9ibGVtKTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhaWxlZCB0byBjaGVjayBsaWNlbnNlIHN0YXR1cyB3aXRoIGVycm9yIG1lc3NhZ2VzXG4gICAgICAgICAgICAgICAga2V5Q2hlY2suc2hvd0xpY2Vuc2VFcnJvcihyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIHRoZSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UubGljZW5zZUluZm8gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgIGtleUNoZWNrLnNob3dMaWNlbnNlSW5mbyhyZXNwb25zZS5saWNlbnNlSW5mbyk7XG4gICAgICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBrZXlDaGVjay4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCB3aGVuIHRoZXJlIGlzIGEgY2hhbmdlIGluIHRoZSBsaWNlbnNlIGtleSBpbnB1dC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCkge1xuICAgICAgICBjb25zdCBsaWNLZXkgPSBrZXlDaGVjay4kbGljS2V5LnZhbCgpO1xuICAgICAgICBpZiAobGljS2V5Lmxlbmd0aCA9PT0gMjgpIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1FcnJvck1lc3NhZ2VzLmVtcHR5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBpbmNvbXBsZXRlXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikucmVtb3ZlQXR0cignaGlkZGVuJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kY291cG9uU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgbGljZW5zZSBrZXkgZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS08tJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGxpY0tleS50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgY291cG9uIGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPVVBELScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkNvdXBvbkJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gVGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKi9cbiAgICBzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuICAgICAgICBjb25zdCBsaWNlbnNlRGF0YSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICAgIGlmIChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJCgnI2tleS1jb21wYW55bmFtZScpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29tcGFueW5hbWUpO1xuICAgICAgICAkKCcja2V5LWNvbnRhY3QnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbnRhY3QpO1xuICAgICAgICAkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG4gICAgICAgICQoJyNrZXktdGVsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS50ZWwpO1xuICAgICAgICBsZXQgcHJvZHVjdHMgPSBsaWNlbnNlRGF0YS5wcm9kdWN0O1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG4gICAgICAgICAgICBwcm9kdWN0cyA9IFtdO1xuICAgICAgICAgICAgcHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcbiAgICAgICAgfVxuICAgICAgICAkLmVhY2gocHJvZHVjdHMsIChrZXksIHByb2R1Y3RWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHJvdyA9ICc8dHI+PHRkPic7XG4gICAgICAgICAgICBsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGF0ZUV4cGlyZWQgPSBuZXcgRGF0ZShwcm9kdWN0LmV4cGlyZWQucmVwbGFjZSgvKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkvLCAnJDEvJDIvJDMnKSk7XG4gICAgICAgICAgICBjb25zdCBkYXRlTm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGlmIChkYXRlTm93ID4gZGF0ZUV4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID09PSAwICYmIHByb2R1Y3QudHJpYWwgPT09ICcxJykge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj4ke3Byb2R1Y3QubmFtZX1gO1xuICAgICAgICAgICAgICAgIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXhwaXJlZFRleHQgPSBnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWRBZnRlcjtcbiAgICAgICAgICAgICAgICAgICAgZXhwaXJlZFRleHQgPSBleHBpcmVkVGV4dC5yZXBsYWNlKCclZXhwaXJlZCUnLCBwcm9kdWN0LmV4cGlyZWQpO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYDxicj48c21hbGw+JHtleHBpcmVkVGV4dH08L3NtYWxsPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJvdyArPSAnPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4nO1xuICAgICAgICAgICAgICAgICQuZWFjaChwcm9kdWN0VmFsdWUuZmVhdHVyZSwgKGluZGV4LCBmZWF0dXJlVmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmVJbmZvID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19GZWF0dXJlSW5mbztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmUgPSBmZWF0dXJlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVuYW1lJScsIGZlYXR1cmUubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50JScsIGZlYXR1cmUuY291bnQpO1xuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudGVhY2glJywgZmVhdHVyZS5jb3VudGVhY2gpO1xuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjYXB0dXJlZCUnLCBmZWF0dXJlLmNhcHR1cmVkKTtcbiAgICAgICAgICAgICAgICAgICAgcm93ICs9IGAke2ZlYXR1cmVJbmZvfTxicj5gO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJvdyArPSAnPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb3cgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuYXBwZW5kKHJvdyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZnRlciB1cGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cbiAgICAgKiBAcGFyYW0gcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc1xuICAgICAqL1xuICAgIGNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyhyZXNwb25zZSwgc3VjY2Vzcykge1xuICAgICAgICBpZiAoc3VjY2VzcyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZ2xvYmFsUEJYTGljZW5zZSA9IHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZTtcbiAgICAgICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbGljS2V5JywgcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmh0bWwoJycpO1xuXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnY291cG9uJywgJycpO1xuXG4gICAgICAgICAgICBrZXlDaGVjay5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5saWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmVzIGVycm9yIG1lc3NhZ2VzIHRvIGJlIGRpc3BsYXllZC5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZXMgLSBBcnJheSBvZiBlcnJvciBtZXNzYWdlcy5cbiAgICAgKlxuICAgICAqL1xuICAgIHNob3dMaWNlbnNlRXJyb3IobWVzc2FnZXMpIHtcbiAgICAgICAgbGV0IG1hbmFnZUxpbmsgPSBgPGJyPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19NYW5hZ2VMaWNlbnNlfSA8YSBocmVmPVwiaHR0cHM6Ly9sbS5taWtvcGJ4LmNvbS9jbGllbnQtY2FiaW5ldC9zZXNzaW9uL2luZGV4L2A7XG4gICAgICAgIGlmIChrZXlDaGVjay5kZWZhdWx0TGljZW5zZUtleS5sZW5ndGggPT09IDI4KSB7XG4gICAgICAgICAgICBtYW5hZ2VMaW5rICs9IGtleUNoZWNrLmRlZmF1bHRMaWNlbnNlS2V5XG4gICAgICAgIH1cbiAgICAgICAgbWFuYWdlTGluayArPSAnXCIgdGFyZ2V0PVwiX2JsYW5rXCI+aHR0cHM6Ly9sbS5taWtvcGJ4LmNvbTwvYT4nO1xuICAgICAgICBtZXNzYWdlcy5wdXNoKG1hbmFnZUxpbmspO1xuICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcobWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5saWNfTGljZW5zZVByb2JsZW0sIHRydWUpO1xuICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKGBwcmV2aW91c0tleU1lc3NhZ2Uke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCwgSlNPTi5zdHJpbmdpZnkobWVzc2FnZXMpKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSBrZXlDaGVjay4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFBieEFwaS5MaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBrZXlDaGVjay5jYkFmdGVyRm9ybVByb2Nlc3NpbmcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBrZXlDaGVjay4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9zYXZlYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBrZXlDaGVjay52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0ga2V5Q2hlY2suY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGtleUNoZWNrLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgdG8gY2hlY2sgaWYgYSBmaWVsZCBpcyBlbXB0eSBvbmx5IGlmIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBub3QgZW1wdHkuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZpZWxkIGJlaW5nIHZhbGlkYXRlZC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGZpZWxkIGlzIG5vdCBlbXB0eSBvciB0aGUgbGljZW5zZSBrZXkgZmllbGQgaXMgZW1wdHksIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiAoa2V5Q2hlY2suJGxpY0tleS52YWwoKS5sZW5ndGggPT09IDI4IHx8IHZhbHVlLmxlbmd0aCA+IDApO1xufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBsaWNlbnNpbmcgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGtleUNoZWNrLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=