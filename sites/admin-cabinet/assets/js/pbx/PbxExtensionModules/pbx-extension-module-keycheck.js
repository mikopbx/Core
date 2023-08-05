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
   * @param messages
   */
  showLicenseError: function showLicenseError(messages) {
    var manageLink = "<br>".concat(globalTranslate.lic_ManageLicense, " <a href=\"https://lm.mikopbx.com/client-cabinet/session/index/");

    if (keyCheck.defaultLicenseKey.length === 28) {
      manageLink += keyCheck.defaultLicenseKey;
    }

    manageLink += '" target="_blank">https://lm.mikopbx.com</a>';
    messages.push(manageLink);
    UserMessage.showMultiString(messages, globalTranslate.lic_LicenseProblem);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWtleWNoZWNrLmpzIl0sIm5hbWVzIjpbImtleUNoZWNrIiwiJGZvcm1PYmoiLCIkIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUhlYWRlciIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiIsIiRjb3Vwb25TZWN0aW9uIiwiJGZvcm1FcnJvck1lc3NhZ2VzIiwiJGxpY0tleSIsIiRjb3Vwb24iLCIkZW1haWwiLCIkYWpheE1lc3NhZ2VzIiwiJGxpY2Vuc2VEZXRhaWxJbmZvIiwiJHJlc2V0QnV0dG9uIiwiJHByb2R1Y3REZXRhaWxzIiwiJGFjY29yZGlvbnMiLCJkZWZhdWx0TGljZW5zZUtleSIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJhY2NvcmRpb24iLCJoaWRlIiwiaW5wdXRtYXNrIiwib25CZWZvcmVQYXN0ZSIsImNiT25Db3Vwb25CZWZvcmVQYXN0ZSIsIm9uY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlIiwib25pbmNvbXBsZXRlIiwiY2xlYXJJbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSIsInZhbCIsInByZXZpb3VzS2V5TWVzc2FnZSIsInNlc3Npb25TdG9yYWdlIiwiZ2V0SXRlbSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCJzaG93TGljZW5zZUVycm9yIiwiSlNPTiIsInBhcnNlIiwib24iLCJhZGRDbGFzcyIsIlBieEFwaSIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJjYkFmdGVyUmVzZXRMaWNlbnNlS2V5IiwiaW5pdGlhbGl6ZUZvcm0iLCJsZW5ndGgiLCJodG1sIiwic2hvdyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsImFmdGVyIiwibGljX0xpY2Vuc2VLZXlWYWxpZCIsIm1lc3NhZ2VzIiwidW5kZWZpbmVkIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJsaWNfRmFpbGVkQ2hlY2tMaWNlbnNlTm90UGJ4UmVzcG9uc2UiLCJsaWNfTGljZW5zZVByb2JsZW0iLCJsaWNlbnNlSW5mbyIsInNob3dMaWNlbnNlSW5mbyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJhdHRyIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwidHJhbnNpdGlvbiIsInJlcGxhY2UiLCJtZXNzYWdlIiwibGljZW5zZURhdGEiLCJ0ZXh0IiwidGVsIiwicHJvZHVjdHMiLCJwcm9kdWN0IiwiQXJyYXkiLCJpc0FycmF5IiwicHVzaCIsImtleSIsInByb2R1Y3RWYWx1ZSIsInJvdyIsImRhdGVFeHBpcmVkIiwiRGF0ZSIsImV4cGlyZWQiLCJkYXRlTm93IiwibmFtZSIsImxpY19FeHBpcmVkIiwidHJpYWwiLCJleHBpcmVkVGV4dCIsImxpY19FeHBpcmVkQWZ0ZXIiLCJmZWF0dXJlIiwiZmVhdHVyZVZhbHVlIiwiZmVhdHVyZUluZm8iLCJsaWNfRmVhdHVyZUluZm8iLCJjb3VudCIsImNvdW50ZWFjaCIsImNhcHR1cmVkIiwiYXBwZW5kIiwiY2JBZnRlckZvcm1Qcm9jZXNzaW5nIiwic3VjY2VzcyIsImRhdGEiLCJQQlhMaWNlbnNlIiwiZ2xvYmFsUEJYTGljZW5zZSIsImZvcm0iLCJzaG93RXJyb3IiLCJsaWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJtYW5hZ2VMaW5rIiwibGljX01hbmFnZUxpY2Vuc2UiLCJzZXRJdGVtIiwic3RyaW5naWZ5IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwiZm9ybURhdGEiLCJMaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImZuIiwiY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5IiwidmFsdWUiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHdCQUFELENBTEU7QUFPYkMsRUFBQUEsb0JBQW9CLEVBQUVELENBQUMsQ0FBQyx5QkFBRCxDQVBWO0FBUWJFLEVBQUFBLHVCQUF1QixFQUFFRixDQUFDLENBQUMsNEJBQUQsQ0FSYjtBQVNiRyxFQUFBQSxxQkFBcUIsRUFBRUgsQ0FBQyxDQUFDLDBCQUFELENBVFg7QUFVYkksRUFBQUEsd0JBQXdCLEVBQUVKLENBQUMsQ0FBQywwQkFBRCxDQVZkO0FBV2JLLEVBQUFBLGNBQWMsRUFBRUwsQ0FBQyxDQUFDLGdCQUFELENBWEo7QUFZYk0sRUFBQUEsa0JBQWtCLEVBQUVO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UUFBUSxDQUFDMEksZ0JBQWpDLENBSmEsQ0FJc0M7O0FBQ25ETixJQUFBQSxJQUFJLENBQUNRLGVBQUwsR0FBdUI1SSxRQUFRLENBQUM0SSxlQUFoQyxDQUxhLENBS29DOztBQUNqRFIsSUFBQUEsSUFBSSxDQUFDaEcsVUFBTDtBQUNIO0FBbFhZLENBQWpCO0FBcVhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FsQyxDQUFDLENBQUMrSSxFQUFGLENBQUtoQixJQUFMLENBQVVVLFFBQVYsQ0FBbUJ0SCxLQUFuQixDQUF5QjZILDJCQUF6QixHQUF1RCxVQUFVQyxLQUFWLEVBQWlCO0FBQ3BFLFNBQVFuSixRQUFRLENBQUNTLE9BQVQsQ0FBaUJzQyxHQUFqQixHQUF1QmMsTUFBdkIsS0FBa0MsRUFBbEMsSUFBd0NzRixLQUFLLENBQUN0RixNQUFOLEdBQWUsQ0FBL0Q7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOzs7QUFDQTNELENBQUMsQ0FBQ2tKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJySixFQUFBQSxRQUFRLENBQUNvQyxVQUFUO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxQQlhMaWNlbnNlLCBVc2VyTWVzc2FnZSovXG5cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1vZHVsZXMgbGljZW5zZSBrZXlcbiAqXG4gKiBAbW9kdWxlIGtleUNoZWNrXG4gKi9cbmNvbnN0IGtleUNoZWNrID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0nKSxcblxuICAgICRlbXB0eUxpY2Vuc2VLZXlJbmZvOiAkKCcuZW1wdHktbGljZW5zZS1rZXktaW5mbycpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWhlYWRlcicpLFxuICAgICRmaWxsZWRMaWNlbnNlS2V5SW5mbzogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1pbmZvJyksXG4gICAgJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uOiAkKCcjZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24nKSxcbiAgICAkY291cG9uU2VjdGlvbjogJCgnI2NvdXBvblNlY3Rpb24nKSxcbiAgICAkZm9ybUVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG4gICAgJGxpY0tleTogJCgnI2xpY0tleScpLFxuICAgICRjb3Vwb246ICQoJyNjb3Vwb24nKSxcbiAgICAkZW1haWw6ICQoJyNlbWFpbCcpLFxuICAgICRhamF4TWVzc2FnZXM6ICQoJy51aS5tZXNzYWdlLmFqYXgnKSxcbiAgICAkbGljZW5zZURldGFpbEluZm86ICQoJyNsaWNlbnNlRGV0YWlsSW5mbycpLFxuICAgICRyZXNldEJ1dHRvbjogJCgnI3Jlc2V0LWxpY2Vuc2UnKSxcbiAgICAkcHJvZHVjdERldGFpbHM6ICQoJyNwcm9kdWN0RGV0YWlscycpLFxuICAgICRhY2NvcmRpb25zOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtIC51aS5hY2NvcmRpb24nKSxcbiAgICBkZWZhdWx0TGljZW5zZUtleTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBjb21wYW55bmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvbXBhbnluYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZW1haWw6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdlbWFpbCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY29udGFjdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvbnRhY3QnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0TmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgbGljS2V5OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbGljS2V5JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGFjdExlbmd0aFsyOF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvdXBvbjoge1xuICAgICAgICAgICAgZGVwZW5kczogJ2xpY0tleScsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY291cG9uJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGFjdExlbmd0aFszMV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb3Vwb25FbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gSW5pdGlhbGl6ZSB0aGUgbGljZW5zaW5nIHBhZ2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAga2V5Q2hlY2suJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIGtleUNoZWNrLiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGNvdXBvbiBjb2RlIGZpZWxkXG4gICAgICAgIGtleUNoZWNrLiRjb3Vwb24uaW5wdXRtYXNrKCdNSUtPVVBELSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25CZWZvcmVQYXN0ZToga2V5Q2hlY2suY2JPbkNvdXBvbkJlZm9yZVBhc3RlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgaW5wdXQgbWFzayBmb3IgbGljZW5zZSBrZXkgZmllbGRcbiAgICAgICAga2V5Q2hlY2suJGxpY0tleS5pbnB1dG1hc2soJ01JS08tKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuICAgICAgICAgICAgb25pbmNvbXBsZXRlOiBrZXlDaGVjay5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuICAgICAgICAgICAgY2xlYXJJbmNvbXBsZXRlOiB0cnVlLFxuICAgICAgICAgICAgb25CZWZvcmVQYXN0ZToga2V5Q2hlY2suY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAga2V5Q2hlY2suJGVtYWlsLmlucHV0bWFzaygnZW1haWwnKTtcbiAgICAgICAga2V5Q2hlY2suZGVmYXVsdExpY2Vuc2VLZXkgPSBrZXlDaGVjay4kbGljS2V5LnZhbCgpO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgcHJldmlvdXMgbGljZW5zZSBlcnJvciBtZXNzYWdlIHRvIHByZXZlbnQgYmxpbmtpbmdcbiAgICAgICAgY29uc3QgcHJldmlvdXNLZXlNZXNzYWdlID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShgcHJldmlvdXNLZXlNZXNzYWdlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuICAgICAgICBpZiAocHJldmlvdXNLZXlNZXNzYWdlKSB7XG4gICAgICAgICAgICBrZXlDaGVjay5zaG93TGljZW5zZUVycm9yKEpTT04ucGFyc2UocHJldmlvdXNLZXlNZXNzYWdlKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgcmVzZXQgYnV0dG9uIGNsaWNrXG4gICAgICAgIGtleUNoZWNrLiRyZXNldEJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgUGJ4QXBpLkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkoa2V5Q2hlY2suY2JBZnRlclJlc2V0TGljZW5zZUtleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGtleUNoZWNrLmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKTtcblxuICAgICAgICBrZXlDaGVjay5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGEgbGljZW5zZSBrZXkgaXMgcHJlc2VudFxuICAgICAgICBpZiAoa2V5Q2hlY2suZGVmYXVsdExpY2Vuc2VLZXkubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvXG4gICAgICAgICAgICAgICAgLmh0bWwoYCR7a2V5Q2hlY2suZGVmYXVsdExpY2Vuc2VLZXl9IDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+YClcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAgUGJ4QXBpLkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhrZXlDaGVjay5jYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMpO1xuICAgICAgICAgICAgUGJ4QXBpLkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyhrZXlDaGVjay5jYkFmdGVyR2V0TGljZW5zZUluZm8pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGVtcHR5TGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuaGlkZSgpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRlbXB0eUxpY2Vuc2VLZXlJbmZvLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmVzZXR0aW5nIHRoZSBsaWNlbnNlIGtleS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIGxpY2Vuc2Uga2V5IHJlc2V0LlxuICAgICAqL1xuICAgIGNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBsb2FkaW5nIGFuZCBkaXNhYmxlZCBjbGFzc2VzIGZyb20gdGhlIGZvcm1cbiAgICAgICAga2V5Q2hlY2suJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAocmVzcG9uc2UgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgaXMgbm90IGZhbHNlLCBpbmRpY2F0aW5nIGEgc3VjY2Vzc2Z1bCBsaWNlbnNlIGtleSByZXNldCxcbiAgICAgICAgICAgIC8vIHJlbG9hZCB0aGUgd2luZG93IHRvIGFwcGx5IHRoZSBjaGFuZ2VzXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIGdldHRpbmcgdGhlIE1pa29QQlggZmVhdHVyZSBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgTWlrb1BCWCBmZWF0dXJlIHN0YXR1cy5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBsb2FkaW5nIHNwaW5uZXIgYW5kIGFueSBwcmV2aW91cyBBSkFYIG1lc3NhZ2VzXG4gICAgICAgICQoJy5zcGlubmVyLmxvYWRpbmcuaWNvbicpLnJlbW92ZSgpO1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIE1pa29QQlggZmVhdHVyZSBzdGF0dXMgaXMgdHJ1ZSAodmFsaWQpXG4gICAgICAgICAgICBrZXlDaGVjay4kZm9ybU9iai5yZW1vdmVDbGFzcygnZXJyb3InKS5hZGRDbGFzcygnc3VjY2VzcycpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgc3VjY2VzcyBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImNoZWNrIGdyZWVuIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlS2V5VmFsaWR9PC9kaXY+YCk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzIGlzIGZhbHNlIG9yIGFuIGVycm9yIG9jY3VycmVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8IHJlc3BvbnNlLm1lc3NhZ2VzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBGYWlsZWQgdG8gY2hlY2sgbGljZW5zZSBzdGF0dXMgKHJlc3BvbnNlIGlzIGZhbHNlIG9yIG5vIG1lc3NhZ2VzIGF2YWlsYWJsZSlcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmxpY19GYWlsZWRDaGVja0xpY2Vuc2VOb3RQYnhSZXNwb25zZSwgZ2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlUHJvYmxlbSk7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWlsZWQgdG8gY2hlY2sgbGljZW5zZSBzdGF0dXMgd2l0aCBlcnJvciBtZXNzYWdlc1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLnNob3dMaWNlbnNlRXJyb3IocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIGtleUNoZWNrLiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TGljZW5zZUluZm8ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmxpY2Vuc2VJbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICBrZXlDaGVjay5zaG93TGljZW5zZUluZm8ocmVzcG9uc2UubGljZW5zZUluZm8pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAga2V5Q2hlY2suJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgd2hlbiB0aGVyZSBpcyBhIGNoYW5nZSBpbiB0aGUgbGljZW5zZSBrZXkgaW5wdXQuXG4gICAgICovXG4gICAgY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpIHtcbiAgICAgICAgY29uc3QgbGljS2V5ID0ga2V5Q2hlY2suJGxpY0tleS52YWwoKTtcbiAgICAgICAgaWYgKGxpY0tleS5sZW5ndGggPT09IDI4KSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBjb21wbGV0ZVxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLmF0dHIoJ2hpZGRlbicsICcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAga2V5Q2hlY2suJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb25TZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIGtleUNoZWNrLiRmb3JtRXJyb3JNZXNzYWdlcy5lbXB0eSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBrZXkgaXMgaW5jb21wbGV0ZVxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLnJlbW92ZUF0dHIoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBrZXlDaGVjay4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAga2V5Q2hlY2suJGNvdXBvblNlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBiZWZvcmUgcGFzdGluZyBhIHZhbHVlIGludG8gdGhlIGxpY2Vuc2Uga2V5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPLScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICBpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLTy0nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRsaWNLZXkudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBiZWZvcmUgcGFzdGluZyBhIHZhbHVlIGludG8gdGhlIGNvdXBvbiBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgdmFsdWUgYmVpbmcgcGFzdGVkIGludG8gdGhlIGZpZWxkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufHN0cmluZ30gLSBSZXR1cm5zIGZhbHNlIGlmIHRoZSBwYXN0ZWQgdmFsdWUgZG9lcyBub3QgY29udGFpbiAnTUlLT1VQRC0nLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgcGFzdGVkIHZhbHVlIHdpdGggd2hpdGVzcGFjZSByZW1vdmVkLlxuICAgICAqL1xuICAgIGNiT25Db3Vwb25CZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICBpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLT1VQRC0nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGtleUNoZWNrLiRjb3Vwb24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIFRoZSBsaWNlbnNlIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICovXG4gICAgc2hvd0xpY2Vuc2VJbmZvKG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgbGljZW5zZURhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgICBpZiAobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgICQoJyNrZXktY29tcGFueW5hbWUnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbXBhbnluYW1lKTtcbiAgICAgICAgJCgnI2tleS1jb250YWN0JykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb250YWN0KTtcbiAgICAgICAgJCgnI2tleS1lbWFpbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uZW1haWwpO1xuICAgICAgICAkKCcja2V5LXRlbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10udGVsKTtcbiAgICAgICAgbGV0IHByb2R1Y3RzID0gbGljZW5zZURhdGEucHJvZHVjdDtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHByb2R1Y3RzKSkge1xuICAgICAgICAgICAgcHJvZHVjdHMgPSBbXTtcbiAgICAgICAgICAgIHByb2R1Y3RzLnB1c2gobGljZW5zZURhdGEucHJvZHVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgJC5lYWNoKHByb2R1Y3RzLCAoa2V5LCBwcm9kdWN0VmFsdWUpID0+IHtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCByb3cgPSAnPHRyPjx0ZD4nO1xuICAgICAgICAgICAgbGV0IHByb2R1Y3QgPSBwcm9kdWN0VmFsdWU7XG4gICAgICAgICAgICBpZiAocHJvZHVjdFsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGRhdGVFeHBpcmVkID0gbmV3IERhdGUocHJvZHVjdC5leHBpcmVkLnJlcGxhY2UoLyhcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pLywgJyQxLyQyLyQzJykpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZU5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBpZiAoZGF0ZU5vdyA+IGRhdGVFeHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA9PT0gMCAmJiBwcm9kdWN0LnRyaWFsID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+JHtwcm9kdWN0Lm5hbWV9YDtcbiAgICAgICAgICAgICAgICBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV4cGlyZWRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkQWZ0ZXI7XG4gICAgICAgICAgICAgICAgICAgIGV4cGlyZWRUZXh0ID0gZXhwaXJlZFRleHQucmVwbGFjZSgnJWV4cGlyZWQlJywgcHJvZHVjdC5leHBpcmVkKTtcbiAgICAgICAgICAgICAgICAgICAgcm93ICs9IGA8YnI+PHNtYWxsPiR7ZXhwaXJlZFRleHR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByb3cgKz0gJzxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JztcbiAgICAgICAgICAgICAgICAkLmVhY2gocHJvZHVjdFZhbHVlLmZlYXR1cmUsIChpbmRleCwgZmVhdHVyZVZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmZWF0dXJlSW5mbyA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRmVhdHVyZUluZm87XG4gICAgICAgICAgICAgICAgICAgIGxldCBmZWF0dXJlID0gZmVhdHVyZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmUgPSBmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclbmFtZSUnLCBmZWF0dXJlLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudCUnLCBmZWF0dXJlLmNvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnRlYWNoJScsIGZlYXR1cmUuY291bnRlYWNoKTtcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY2FwdHVyZWQlJywgZmVhdHVyZS5jYXB0dXJlZCk7XG4gICAgICAgICAgICAgICAgICAgIHJvdyArPSBgJHtmZWF0dXJlSW5mb308YnI+YDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByb3cgKz0gJzwvc3Bhbj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcm93ICs9ICc8L2Rpdj48L3RkPjwvdHI+JztcbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmFwcGVuZChyb3cpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWZ0ZXIgdXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG4gICAgICogQHBhcmFtIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHN1Y2Nlc3NcbiAgICAgKi9cbiAgICBjYkFmdGVyRm9ybVByb2Nlc3NpbmcocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcbiAgICAgICAgaWYgKHN1Y2Nlc3MgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGdsb2JhbFBCWExpY2Vuc2UgPSByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2U7XG4gICAgICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2xpY0tleScsIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5odG1sKCcnKTtcblxuICAgICAgICAgICAga2V5Q2hlY2suJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2NvdXBvbicsICcnKTtcblxuICAgICAgICAgICAga2V5Q2hlY2suaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0dldFRyaWFsRXJyb3JDaGVja0ludGVybmV0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlcyBlcnJvciBtZXNzYWdlcyB0byBiZSBkaXNwbGF5ZWQuXG4gICAgICogQHBhcmFtIG1lc3NhZ2VzXG4gICAgICovXG4gICAgc2hvd0xpY2Vuc2VFcnJvcihtZXNzYWdlcyl7XG4gICAgICAgIGxldCBtYW5hZ2VMaW5rID0gYDxicj4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfTWFuYWdlTGljZW5zZX0gPGEgaHJlZj1cImh0dHBzOi8vbG0ubWlrb3BieC5jb20vY2xpZW50LWNhYmluZXQvc2Vzc2lvbi9pbmRleC9gO1xuICAgICAgICBpZiAoa2V5Q2hlY2suZGVmYXVsdExpY2Vuc2VLZXkubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAgbWFuYWdlTGluayArPSBrZXlDaGVjay5kZWZhdWx0TGljZW5zZUtleVxuICAgICAgICB9XG4gICAgICAgIG1hbmFnZUxpbmsgKz0gJ1wiIHRhcmdldD1cIl9ibGFua1wiPmh0dHBzOi8vbG0ubWlrb3BieC5jb208L2E+JztcbiAgICAgICAgbWVzc2FnZXMucHVzaChtYW5hZ2VMaW5rKTtcbiAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKG1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VQcm9ibGVtKTtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNLZXlNZXNzYWdlJHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWAsIEpTT04uc3RyaW5naWZ5KG1lc3NhZ2VzKSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0ga2V5Q2hlY2suJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBQYnhBcGkuTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdChmb3JtRGF0YSwga2V5Q2hlY2suY2JBZnRlckZvcm1Qcm9jZXNzaW5nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0ga2V5Q2hlY2suJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0ga2V5Q2hlY2sudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGtleUNoZWNrLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBrZXlDaGVjay5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIHRvIGNoZWNrIGlmIGEgZmllbGQgaXMgZW1wdHkgb25seSBpZiB0aGUgbGljZW5zZSBrZXkgZmllbGQgaXMgbm90IGVtcHR5LlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBmaWVsZCBiZWluZyB2YWxpZGF0ZWQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBmaWVsZCBpcyBub3QgZW1wdHkgb3IgdGhlIGxpY2Vuc2Uga2V5IGZpZWxkIGlzIGVtcHR5LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gKGtleUNoZWNrLiRsaWNLZXkudmFsKCkubGVuZ3RoID09PSAyOCB8fCB2YWx1ZS5sZW5ndGggPiAwKTtcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbGljZW5zaW5nIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBrZXlDaGVjay5pbml0aWFsaXplKCk7XG59KTtcblxuIl19