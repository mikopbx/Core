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

/* global globalRootUrl, globalTranslate, Form, sessionStorage, globalPBXLicense*/

/**
 * Object for managing modules license key
 *
 * @module licensingModify
 */
var licensingModify = {
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
    licensingModify.$accordions.accordion();
    licensingModify.$licenseDetailInfo.hide(); // Set input mask for coupon code field

    licensingModify.$coupon.inputmask('MIKOUPD-*****-*****-*****-*****', {
      onBeforePaste: licensingModify.cbOnCouponBeforePaste
    }); // Set input mask for license key field

    licensingModify.$licKey.inputmask('MIKO-*****-*****-*****-*****', {
      oncomplete: licensingModify.cbOnLicenceKeyInputChange,
      onincomplete: licensingModify.cbOnLicenceKeyInputChange,
      clearIncomplete: true,
      onBeforePaste: licensingModify.cbOnLicenceKeyBeforePaste
    });
    licensingModify.$email.inputmask('email');
    licensingModify.defaultLicenseKey = licensingModify.$licKey.val(); // Handle reset button click

    licensingModify.$resetButton.on('click', function () {
      licensingModify.$formObj.addClass('loading disabled');
      PbxApi.LicenseResetLicenseKey(licensingModify.cbAfterResetLicenseKey);
    });
    licensingModify.cbOnLicenceKeyInputChange();
    licensingModify.initializeForm(); // Check if a license key is present

    if (licensingModify.defaultLicenseKey.length === 28) {
      licensingModify.$filledLicenseKeyInfo.html("".concat(licensingModify.defaultLicenseKey, " <i class=\"spinner loading icon\"></i>")).show();
      licensingModify.$filledLicenseKeyHeader.show();
      PbxApi.LicenseGetMikoPBXFeatureStatus(licensingModify.cbAfterGetMikoPBXFeatureStatus);
      PbxApi.LicenseGetLicenseInfo(licensingModify.cbAfterGetLicenseInfo);
      licensingModify.$emptyLicenseKeyInfo.hide();
    } else {
      licensingModify.$filledLicenseKeyHeader.hide();
      licensingModify.$filledLicenseKeyInfo.hide();
      licensingModify.$emptyLicenseKeyInfo.show();
    }
  },

  /**
   * Callback function triggered after resetting the license key.
   * @param {boolean} response - The response indicating the success of the license key reset.
   */
  cbAfterResetLicenseKey: function cbAfterResetLicenseKey(response) {
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
  cbAfterGetMikoPBXFeatureStatus: function cbAfterGetMikoPBXFeatureStatus(response) {
    // Remove the loading spinner and any previous AJAX messages
    $('.spinner.loading.icon').remove();

    if (response === true) {
      // MikoPBX feature status is true (valid)
      licensingModify.$formObj.removeClass('error').addClass('success');
      licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui success message ajax\"><i class=\"check green icon\"></i> ".concat(globalTranslate.lic_LicenseKeyValid, "</div>"));
      licensingModify.$filledLicenseKeyHeader.show();
    } else {
      // MikoPBX feature status is false or an error occurred
      if (response === false || response.messages === undefined) {
        // Failed to check license status (response is false or no messages available)
        UserMessage.showMultiString(globalTranslate.lic_FailedCheckLicenseNotPbxResponse, globalTranslate.lic_LicenseProblem);
        licensingModify.$filledLicenseKeyHeader.show();
      } else {
        // Failed to check license status with error messages
        licensingModify.showLicenseError(response.messages);
        licensingModify.$filledLicenseKeyHeader.show();
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
  cbOnLicenceKeyInputChange: function cbOnLicenceKeyInputChange() {
    var licKey = licensingModify.$licKey.val();

    if (licKey.length === 28) {
      // License key is complete
      licensingModify.$formObj.find('.reginfo input').each(function (index, obj) {
        $(obj).attr('hidden', '');
      });
      licensingModify.$getNewKeyLicenseSection.hide();
      licensingModify.$couponSection.show();
      licensingModify.$formErrorMessages.empty();
    } else {
      // License key is incomplete
      licensingModify.$formObj.find('.reginfo input').each(function (index, obj) {
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
  cbOnLicenceKeyBeforePaste: function cbOnLicenceKeyBeforePaste(pastedValue) {
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
  cbOnCouponBeforePaste: function cbOnCouponBeforePaste(pastedValue) {
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
    } // Trigger change event to acknowledge the modification


    Form.dataChanged();
  },

  /**
   * Prepares error messages to be displayed.
   * @param messages
   */
  showLicenseError: function showLicenseError(messages) {
    var manageLink = "<br>".concat(globalTranslate.lic_ManageLicense, " <a href=\"https://lm.mikopbx.com/client-cabinet/session/index/");

    if (licensingModify.defaultLicenseKey.length === 28) {
      manageLink += licensingModify.defaultLicenseKey;
    }

    manageLink += '" target="_blank">https://lm.mikopbx.com</a>';
    messages.push(manageLink);
    UserMessage.showMultiString(messages, globalTranslate.lic_LicenseProblem);
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
    var formData = licensingModify.$formObj.form('get values');
    PbxApi.LicenseProcessUserRequest(formData, licensingModify.cbAfterFormProcessing);
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = licensingModify.$formObj;
    Form.url = "".concat(globalRootUrl, "licensing/save"); // Form submission URL

    Form.validateRules = licensingModify.validateRules; // Form validation rules

    Form.cbBeforeSendForm = licensingModify.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = licensingModify.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
};
/**
 * Custom validation rule to check if a field is empty only if the license key field is not empty.
 * @param {string} value - The value of the field being validated.
 * @returns {boolean} - True if the field is not empty or the license key field is empty, false otherwise.
 */

$.fn.form.settings.rules.checkEmptyIfLicenseKeyEmpty = function (value) {
  return licensingModify.$licKey.val().length === 28 || value.length > 0;
};
/**
 *  Initialize licensing modify form on document ready
 */


$(document).ready(function () {
  licensingModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJsaWNlbnNpbmdNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyIiwiJGZpbGxlZExpY2Vuc2VLZXlJbmZvIiwiJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uIiwiJGNvdXBvblNlY3Rpb24iLCIkZm9ybUVycm9yTWVzc2FnZXMiLCIkbGljS2V5IiwiJGNvdXBvbiIsIiRlbWFpbCIsIiRhamF4TWVzc2FnZXMiLCIkbGljZW5zZURldGFpbEluZm8iLCIkcmVzZXRCdXR0b24iLCIkcHJvZHVjdERldGFpbHMiLCIkYWNjb3JkaW9ucyIsImRlZmF1bHRMaWNlbnNlS2V5IiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHkiLCJlbWFpbCIsImxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCIsImNvbnRhY3QiLCJsaWNfVmFsaWRhdGVDb250YWN0TmFtZSIsImxpY0tleSIsIm9wdGlvbmFsIiwibGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5IiwiY291cG9uIiwiZGVwZW5kcyIsImxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5IiwiaW5pdGlhbGl6ZSIsImFjY29yZGlvbiIsImhpZGUiLCJpbnB1dG1hc2siLCJvbkJlZm9yZVBhc3RlIiwiY2JPbkNvdXBvbkJlZm9yZVBhc3RlIiwib25jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UiLCJvbmluY29tcGxldGUiLCJjbGVhckluY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlIiwidmFsIiwib24iLCJhZGRDbGFzcyIsIlBieEFwaSIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJjYkFmdGVyUmVzZXRMaWNlbnNlS2V5IiwiaW5pdGlhbGl6ZUZvcm0iLCJsZW5ndGgiLCJodG1sIiwic2hvdyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsImFmdGVyIiwibGljX0xpY2Vuc2VLZXlWYWxpZCIsIm1lc3NhZ2VzIiwidW5kZWZpbmVkIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJsaWNfRmFpbGVkQ2hlY2tMaWNlbnNlTm90UGJ4UmVzcG9uc2UiLCJsaWNfTGljZW5zZVByb2JsZW0iLCJzaG93TGljZW5zZUVycm9yIiwibGljZW5zZUluZm8iLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiYXR0ciIsImVtcHR5IiwicmVtb3ZlQXR0ciIsInBhc3RlZFZhbHVlIiwiaW5kZXhPZiIsInRyYW5zaXRpb24iLCJyZXBsYWNlIiwibWVzc2FnZSIsImxpY2Vuc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwidGV4dCIsInRlbCIsInByb2R1Y3RzIiwicHJvZHVjdCIsIkFycmF5IiwiaXNBcnJheSIsInB1c2giLCJrZXkiLCJwcm9kdWN0VmFsdWUiLCJyb3ciLCJkYXRlRXhwaXJlZCIsIkRhdGUiLCJleHBpcmVkIiwiZGF0ZU5vdyIsIm5hbWUiLCJsaWNfRXhwaXJlZCIsInRyaWFsIiwiZXhwaXJlZFRleHQiLCJsaWNfRXhwaXJlZEFmdGVyIiwiZmVhdHVyZSIsImZlYXR1cmVWYWx1ZSIsImZlYXR1cmVJbmZvIiwibGljX0ZlYXR1cmVJbmZvIiwiY291bnQiLCJjb3VudGVhY2giLCJjYXB0dXJlZCIsImFwcGVuZCIsImNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyIsInN1Y2Nlc3MiLCJkYXRhIiwiUEJYTGljZW5zZSIsImdsb2JhbFBCWExpY2Vuc2UiLCJmb3JtIiwic2hvd0Vycm9yIiwibGljX0dldFRyaWFsRXJyb3JDaGVja0ludGVybmV0IiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwibWFuYWdlTGluayIsImxpY19NYW5hZ2VMaWNlbnNlIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwiZm9ybURhdGEiLCJMaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImZuIiwiY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5IiwidmFsdWUiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGVBQWUsR0FBRztBQUNwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxTO0FBT3BCQyxFQUFBQSxvQkFBb0IsRUFBRUQsQ0FBQyxDQUFDLHlCQUFELENBUEg7QUFRcEJFLEVBQUFBLHVCQUF1QixFQUFFRixDQUFDLENBQUMsNEJBQUQsQ0FSTjtBQVNwQkcsRUFBQUEscUJBQXFCLEVBQUVILENBQUMsQ0FBQywwQkFBRCxDQVRKO0FBVXBCSSxFQUFBQSx3QkFBd0IsRUFBRUosQ0FBQyxDQUFDLDBCQUFELENBVlA7QUFXcEJLLEVBQUFBLGNBQWMsRUFBRUwsQ0FBQyxDQUFDLGdCQUFELENBWEc7QUFZcEJNLEVBQUFBLGtCQUFrQixFQUFFTixDQUFDLENBQUMsc0JBQUQsQ0FaRDtBQWFwQk8sRUFBQUEsT0FBTyxFQUFFUCxDQUFDLENBQUMsU0FBRCxDQWJVO0FBY3BCUSxFQUFBQSxPQUFPLEVBQUVSLENBQUMsQ0FBQyxTQUFELENBZFU7QUFlcEJTLEVBQUFBLE1BQU0sRUFBRVQsQ0FBQyxDQUFDLFFBQUQsQ0FmVztBQWdCcEJVLEVBQUFBLGFBQWEsRUFBRVYsQ0FBQyxDQUFDLGtCQUFELENBaEJJO0FBaUJwQlcsRUFBQUEsa0JBQWtCLEVBQUVYLENBQUMsQ0FBQyxvQkFBRCxDQWpCRDtBQWtCcEJZLEVBQUFBLFlBQVksRUFBRVosQ0FBQyxDQUFDLGdCQUFELENBbEJLO0FBbUJwQmEsRUFBQUEsZUFBZSxFQUFFYixDQUFDLENBQUMsaUJBQUQsQ0FuQkU7QUFvQnBCYyxFQUFBQSxXQUFXLEVBQUVkLENBQUMsQ0FBQyxzQ0FBRCxDQXBCTTtBQXFCcEJlLEVBQUFBLGlCQUFpQixFQUFFLElBckJDOztBQXVCcEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RDLE1BQUFBLFVBQVUsRUFBRSxhQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSw2QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERztBQUZFLEtBREY7QUFVWEMsSUFBQUEsS0FBSyxFQUFFO0FBQ0hOLE1BQUFBLFVBQVUsRUFBRSxPQURUO0FBRUhDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSw2QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0c7QUFGNUIsT0FERztBQUZKLEtBVkk7QUFtQlhDLElBQUFBLE9BQU8sRUFBRTtBQUNMUixNQUFBQSxVQUFVLEVBQUUsU0FEUDtBQUVMQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsNkJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNLO0FBRjVCLE9BREc7QUFGRixLQW5CRTtBQTRCWEMsSUFBQUEsTUFBTSxFQUFFO0FBQ0pWLE1BQUFBLFVBQVUsRUFBRSxRQURSO0FBRUpXLE1BQUFBLFFBQVEsRUFBRSxJQUZOO0FBR0pWLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxpQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1E7QUFGNUIsT0FERztBQUhILEtBNUJHO0FBc0NYQyxJQUFBQSxNQUFNLEVBQUU7QUFDSkMsTUFBQUEsT0FBTyxFQUFFLFFBREw7QUFFSmQsTUFBQUEsVUFBVSxFQUFFLFFBRlI7QUFHSlcsTUFBQUEsUUFBUSxFQUFFLElBSE47QUFJSlYsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLGlCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDVztBQUY1QixPQURHO0FBSkg7QUF0Q0csR0E1Qks7QUErRXBCO0FBQ0FDLEVBQUFBLFVBaEZvQix3QkFnRlA7QUFDVHBDLElBQUFBLGVBQWUsQ0FBQ2dCLFdBQWhCLENBQTRCcUIsU0FBNUI7QUFDQXJDLElBQUFBLGVBQWUsQ0FBQ2Esa0JBQWhCLENBQW1DeUIsSUFBbkMsR0FGUyxDQUlUOztBQUNBdEMsSUFBQUEsZUFBZSxDQUFDVSxPQUFoQixDQUF3QjZCLFNBQXhCLENBQWtDLGlDQUFsQyxFQUFxRTtBQUNqRUMsTUFBQUEsYUFBYSxFQUFFeEMsZUFBZSxDQUFDeUM7QUFEa0MsS0FBckUsRUFMUyxDQVNUOztBQUNBekMsSUFBQUEsZUFBZSxDQUFDUyxPQUFoQixDQUF3QjhCLFNBQXhCLENBQWtDLDhCQUFsQyxFQUFrRTtBQUM5REcsTUFBQUEsVUFBVSxFQUFFMUMsZUFBZSxDQUFDMkMseUJBRGtDO0FBRTlEQyxNQUFBQSxZQUFZLEVBQUU1QyxlQUFlLENBQUMyQyx5QkFGZ0M7QUFHOURFLE1BQUFBLGVBQWUsRUFBRSxJQUg2QztBQUk5REwsTUFBQUEsYUFBYSxFQUFFeEMsZUFBZSxDQUFDOEM7QUFKK0IsS0FBbEU7QUFPQTlDLElBQUFBLGVBQWUsQ0FBQ1csTUFBaEIsQ0FBdUI0QixTQUF2QixDQUFpQyxPQUFqQztBQUNBdkMsSUFBQUEsZUFBZSxDQUFDaUIsaUJBQWhCLEdBQW9DakIsZUFBZSxDQUFDUyxPQUFoQixDQUF3QnNDLEdBQXhCLEVBQXBDLENBbEJTLENBb0JUOztBQUNBL0MsSUFBQUEsZUFBZSxDQUFDYyxZQUFoQixDQUE2QmtDLEVBQTdCLENBQWdDLE9BQWhDLEVBQXlDLFlBQU07QUFDM0NoRCxNQUFBQSxlQUFlLENBQUNDLFFBQWhCLENBQXlCZ0QsUUFBekIsQ0FBa0Msa0JBQWxDO0FBQ0FDLE1BQUFBLE1BQU0sQ0FBQ0Msc0JBQVAsQ0FBOEJuRCxlQUFlLENBQUNvRCxzQkFBOUM7QUFDSCxLQUhEO0FBS0FwRCxJQUFBQSxlQUFlLENBQUMyQyx5QkFBaEI7QUFFQTNDLElBQUFBLGVBQWUsQ0FBQ3FELGNBQWhCLEdBNUJTLENBOEJUOztBQUNBLFFBQUlyRCxlQUFlLENBQUNpQixpQkFBaEIsQ0FBa0NxQyxNQUFsQyxLQUE2QyxFQUFqRCxFQUFxRDtBQUNqRHRELE1BQUFBLGVBQWUsQ0FBQ0sscUJBQWhCLENBQ0trRCxJQURMLFdBQ2F2RCxlQUFlLENBQUNpQixpQkFEN0IsOENBRUt1QyxJQUZMO0FBR0F4RCxNQUFBQSxlQUFlLENBQUNJLHVCQUFoQixDQUF3Q29ELElBQXhDO0FBQ0FOLE1BQUFBLE1BQU0sQ0FBQ08sOEJBQVAsQ0FBc0N6RCxlQUFlLENBQUMwRCw4QkFBdEQ7QUFDQVIsTUFBQUEsTUFBTSxDQUFDUyxxQkFBUCxDQUE2QjNELGVBQWUsQ0FBQzRELHFCQUE3QztBQUNBNUQsTUFBQUEsZUFBZSxDQUFDRyxvQkFBaEIsQ0FBcUNtQyxJQUFyQztBQUNILEtBUkQsTUFRTztBQUNIdEMsTUFBQUEsZUFBZSxDQUFDSSx1QkFBaEIsQ0FBd0NrQyxJQUF4QztBQUNBdEMsTUFBQUEsZUFBZSxDQUFDSyxxQkFBaEIsQ0FBc0NpQyxJQUF0QztBQUNBdEMsTUFBQUEsZUFBZSxDQUFDRyxvQkFBaEIsQ0FBcUNxRCxJQUFyQztBQUNIO0FBRUosR0E3SG1COztBQStIcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUosRUFBQUEsc0JBbklvQixrQ0FtSUdTLFFBbklILEVBbUlhO0FBQzdCO0FBQ0E3RCxJQUFBQSxlQUFlLENBQUNDLFFBQWhCLENBQXlCNkQsV0FBekIsQ0FBcUMsa0JBQXJDOztBQUVBLFFBQUlELFFBQVEsS0FBSyxLQUFqQixFQUF3QjtBQUNwQjtBQUNBO0FBQ0FFLE1BQUFBLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsTUFBaEI7QUFDSDtBQUNKLEdBNUltQjs7QUE4SXBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lQLEVBQUFBLDhCQWxKb0IsMENBa0pXRyxRQWxKWCxFQWtKcUI7QUFDckM7QUFDQTNELElBQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCZ0UsTUFBM0I7O0FBQ0EsUUFBSUwsUUFBUSxLQUFLLElBQWpCLEVBQXVCO0FBQ25CO0FBQ0E3RCxNQUFBQSxlQUFlLENBQUNDLFFBQWhCLENBQXlCNkQsV0FBekIsQ0FBcUMsT0FBckMsRUFBOENiLFFBQTlDLENBQXVELFNBQXZEO0FBQ0FqRCxNQUFBQSxlQUFlLENBQUNLLHFCQUFoQixDQUFzQzhELEtBQXRDLHFGQUFxSDNDLGVBQWUsQ0FBQzRDLG1CQUFySTtBQUNBcEUsTUFBQUEsZUFBZSxDQUFDSSx1QkFBaEIsQ0FBd0NvRCxJQUF4QztBQUNILEtBTEQsTUFLTztBQUNIO0FBQ0EsVUFBSUssUUFBUSxLQUFLLEtBQWIsSUFBc0JBLFFBQVEsQ0FBQ1EsUUFBVCxLQUFzQkMsU0FBaEQsRUFBMkQ7QUFDdkQ7QUFDQUMsUUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCaEQsZUFBZSxDQUFDaUQsb0NBQTVDLEVBQWtGakQsZUFBZSxDQUFDa0Qsa0JBQWxHO0FBQ0ExRSxRQUFBQSxlQUFlLENBQUNJLHVCQUFoQixDQUF3Q29ELElBQXhDO0FBQ0gsT0FKRCxNQUlPO0FBQ0g7QUFDQXhELFFBQUFBLGVBQWUsQ0FBQzJFLGdCQUFoQixDQUFpQ2QsUUFBUSxDQUFDUSxRQUExQztBQUNBckUsUUFBQUEsZUFBZSxDQUFDSSx1QkFBaEIsQ0FBd0NvRCxJQUF4QztBQUNIO0FBQ0o7QUFDSixHQXRLbUI7O0FBd0twQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxxQkE1S29CLGlDQTRLRUMsUUE1S0YsRUE0S1k7QUFDNUIsUUFBSUEsUUFBUSxDQUFDZSxXQUFULEtBQXlCTixTQUE3QixFQUF3QztBQUNwQztBQUNBdEUsTUFBQUEsZUFBZSxDQUFDNkUsZUFBaEIsQ0FBZ0NoQixRQUFRLENBQUNlLFdBQXpDO0FBQ0E1RSxNQUFBQSxlQUFlLENBQUNhLGtCQUFoQixDQUFtQzJDLElBQW5DO0FBQ0gsS0FKRCxNQUlPO0FBQ0g7QUFDQXhELE1BQUFBLGVBQWUsQ0FBQ2Esa0JBQWhCLENBQW1DeUIsSUFBbkM7QUFDSDtBQUNKLEdBckxtQjs7QUF1THBCO0FBQ0o7QUFDQTtBQUNJSyxFQUFBQSx5QkExTG9CLHVDQTBMUTtBQUN4QixRQUFNYixNQUFNLEdBQUc5QixlQUFlLENBQUNTLE9BQWhCLENBQXdCc0MsR0FBeEIsRUFBZjs7QUFDQSxRQUFJakIsTUFBTSxDQUFDd0IsTUFBUCxLQUFrQixFQUF0QixFQUEwQjtBQUN0QjtBQUNBdEQsTUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QjZFLElBQXpCLENBQThCLGdCQUE5QixFQUFnREMsSUFBaEQsQ0FBcUQsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQ2pFL0UsUUFBQUEsQ0FBQyxDQUFDK0UsR0FBRCxDQUFELENBQU9DLElBQVAsQ0FBWSxRQUFaLEVBQXNCLEVBQXRCO0FBQ0gsT0FGRDtBQUdBbEYsTUFBQUEsZUFBZSxDQUFDTSx3QkFBaEIsQ0FBeUNnQyxJQUF6QztBQUNBdEMsTUFBQUEsZUFBZSxDQUFDTyxjQUFoQixDQUErQmlELElBQS9CO0FBQ0F4RCxNQUFBQSxlQUFlLENBQUNRLGtCQUFoQixDQUFtQzJFLEtBQW5DO0FBQ0gsS0FSRCxNQVFPO0FBQ0g7QUFDQW5GLE1BQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUI2RSxJQUF6QixDQUE4QixnQkFBOUIsRUFBZ0RDLElBQWhELENBQXFELFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUNqRS9FLFFBQUFBLENBQUMsQ0FBQytFLEdBQUQsQ0FBRCxDQUFPRyxVQUFQLENBQWtCLFFBQWxCO0FBQ0gsT0FGRDtBQUdBcEYsTUFBQUEsZUFBZSxDQUFDTSx3QkFBaEIsQ0FBeUNrRCxJQUF6QztBQUNBeEQsTUFBQUEsZUFBZSxDQUFDTyxjQUFoQixDQUErQitCLElBQS9CO0FBQ0g7QUFDSixHQTVNbUI7O0FBOE1wQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lRLEVBQUFBLHlCQW5Ob0IscUNBbU5NdUMsV0FuTk4sRUFtTm1CO0FBQ25DLFFBQUlBLFdBQVcsQ0FBQ0MsT0FBWixDQUFvQixPQUFwQixNQUFpQyxDQUFDLENBQXRDLEVBQXlDO0FBQ3JDdEYsTUFBQUEsZUFBZSxDQUFDUyxPQUFoQixDQUF3QjhFLFVBQXhCLENBQW1DLE9BQW5DO0FBQ0EsYUFBTyxLQUFQO0FBQ0g7O0FBQ0QsV0FBT0YsV0FBVyxDQUFDRyxPQUFaLENBQW9CLE1BQXBCLEVBQTRCLEVBQTVCLENBQVA7QUFDSCxHQXpObUI7O0FBMk5wQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0kvQyxFQUFBQSxxQkFoT29CLGlDQWdPRTRDLFdBaE9GLEVBZ09lO0FBQy9CLFFBQUlBLFdBQVcsQ0FBQ0MsT0FBWixDQUFvQixVQUFwQixNQUFvQyxDQUFDLENBQXpDLEVBQTRDO0FBQ3hDdEYsTUFBQUEsZUFBZSxDQUFDVSxPQUFoQixDQUF3QjZFLFVBQXhCLENBQW1DLE9BQW5DO0FBQ0EsYUFBTyxLQUFQO0FBQ0g7O0FBQ0QsV0FBT0YsV0FBVyxDQUFDRyxPQUFaLENBQW9CLE1BQXBCLEVBQTRCLEVBQTVCLENBQVA7QUFDSCxHQXRPbUI7O0FBd09wQjtBQUNKO0FBQ0E7QUFDQTtBQUNJWCxFQUFBQSxlQTVPb0IsMkJBNE9KWSxPQTVPSSxFQTRPSztBQUNyQixRQUFNQyxXQUFXLEdBQUdDLElBQUksQ0FBQ0MsS0FBTCxDQUFXSCxPQUFYLENBQXBCOztBQUNBLFFBQUlDLFdBQVcsQ0FBQyxhQUFELENBQVgsS0FBK0JwQixTQUFuQyxFQUE4QztBQUMxQztBQUNIOztBQUNEcEUsSUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0IyRixJQUF0QixDQUEyQkgsV0FBVyxDQUFDLGFBQUQsQ0FBWCxDQUEyQnZFLFdBQXREO0FBQ0FqQixJQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCMkYsSUFBbEIsQ0FBdUJILFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkI5RCxPQUFsRDtBQUNBMUIsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQjJGLElBQWhCLENBQXFCSCxXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCaEUsS0FBaEQ7QUFDQXhCLElBQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBYzJGLElBQWQsQ0FBbUJILFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkJJLEdBQTlDO0FBQ0EsUUFBSUMsUUFBUSxHQUFHTCxXQUFXLENBQUNNLE9BQTNCOztBQUNBLFFBQUksQ0FBQ0MsS0FBSyxDQUFDQyxPQUFOLENBQWNILFFBQWQsQ0FBTCxFQUE4QjtBQUMxQkEsTUFBQUEsUUFBUSxHQUFHLEVBQVg7QUFDQUEsTUFBQUEsUUFBUSxDQUFDSSxJQUFULENBQWNULFdBQVcsQ0FBQ00sT0FBMUI7QUFDSDs7QUFDRDlGLElBQUFBLENBQUMsQ0FBQzZFLElBQUYsQ0FBT2dCLFFBQVAsRUFBaUIsVUFBQ0ssR0FBRCxFQUFNQyxZQUFOLEVBQXVCO0FBQ3BDLFVBQUlBLFlBQVksS0FBSy9CLFNBQXJCLEVBQWdDO0FBQzVCO0FBQ0g7O0FBQ0QsVUFBSWdDLEdBQUcsR0FBRyxVQUFWO0FBQ0EsVUFBSU4sT0FBTyxHQUFHSyxZQUFkOztBQUNBLFVBQUlMLE9BQU8sQ0FBQyxhQUFELENBQVAsS0FBMkIxQixTQUEvQixFQUEwQztBQUN0QzBCLFFBQUFBLE9BQU8sR0FBR0ssWUFBWSxDQUFDLGFBQUQsQ0FBdEI7QUFDSDs7QUFDRCxVQUFNRSxXQUFXLEdBQUcsSUFBSUMsSUFBSixDQUFTUixPQUFPLENBQUNTLE9BQVIsQ0FBZ0JqQixPQUFoQixDQUF3Qix5QkFBeEIsRUFBbUQsVUFBbkQsQ0FBVCxDQUFwQjtBQUNBLFVBQU1rQixPQUFPLEdBQUcsSUFBSUYsSUFBSixFQUFoQjs7QUFDQSxVQUFJRSxPQUFPLEdBQUdILFdBQWQsRUFBMkI7QUFDdkJELFFBQUFBLEdBQUcsaURBQXdDTixPQUFPLENBQUNXLElBQWhELGtDQUNObkYsZUFBZSxDQUFDb0YsV0FEVixhQUFIO0FBRUgsT0FIRCxNQUdPLElBQUlaLE9BQU8sQ0FBQ1MsT0FBUixDQUFnQm5ELE1BQWhCLEtBQTJCLENBQTNCLElBQWdDMEMsT0FBTyxDQUFDYSxLQUFSLEtBQWtCLEdBQXRELEVBQTJEO0FBQzlEUCxRQUFBQSxHQUFHLGlEQUF3Q04sT0FBTyxDQUFDVyxJQUFoRCxrQ0FDTm5GLGVBQWUsQ0FBQ29GLFdBRFYsYUFBSDtBQUVILE9BSE0sTUFHQTtBQUNITixRQUFBQSxHQUFHLGlEQUF3Q04sT0FBTyxDQUFDVyxJQUFoRCxDQUFIOztBQUNBLFlBQUlYLE9BQU8sQ0FBQ1MsT0FBUixDQUFnQm5ELE1BQWhCLEdBQXlCLENBQTdCLEVBQWdDO0FBQzVCLGNBQUl3RCxXQUFXLEdBQUd0RixlQUFlLENBQUN1RixnQkFBbEM7QUFDQUQsVUFBQUEsV0FBVyxHQUFHQSxXQUFXLENBQUN0QixPQUFaLENBQW9CLFdBQXBCLEVBQWlDUSxPQUFPLENBQUNTLE9BQXpDLENBQWQ7QUFDQUgsVUFBQUEsR0FBRyx5QkFBa0JRLFdBQWxCLGFBQUg7QUFDSDs7QUFDRFIsUUFBQUEsR0FBRyxJQUFJLDZCQUFQO0FBQ0FwRyxRQUFBQSxDQUFDLENBQUM2RSxJQUFGLENBQU9zQixZQUFZLENBQUNXLE9BQXBCLEVBQTZCLFVBQUNoQyxLQUFELEVBQVFpQyxZQUFSLEVBQXlCO0FBQ2xELGNBQUlDLFdBQVcsR0FBRzFGLGVBQWUsQ0FBQzJGLGVBQWxDO0FBQ0EsY0FBSUgsT0FBTyxHQUFHQyxZQUFkOztBQUNBLGNBQUlBLFlBQVksQ0FBQyxhQUFELENBQVosS0FBZ0MzQyxTQUFwQyxFQUErQztBQUMzQzBDLFlBQUFBLE9BQU8sR0FBR0MsWUFBWSxDQUFDLGFBQUQsQ0FBdEI7QUFDSDs7QUFDREMsVUFBQUEsV0FBVyxHQUFHQSxXQUFXLENBQUMxQixPQUFaLENBQW9CLFFBQXBCLEVBQThCd0IsT0FBTyxDQUFDTCxJQUF0QyxDQUFkO0FBQ0FPLFVBQUFBLFdBQVcsR0FBR0EsV0FBVyxDQUFDMUIsT0FBWixDQUFvQixTQUFwQixFQUErQndCLE9BQU8sQ0FBQ0ksS0FBdkMsQ0FBZDtBQUNBRixVQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQzFCLE9BQVosQ0FBb0IsYUFBcEIsRUFBbUN3QixPQUFPLENBQUNLLFNBQTNDLENBQWQ7QUFDQUgsVUFBQUEsV0FBVyxHQUFHQSxXQUFXLENBQUMxQixPQUFaLENBQW9CLFlBQXBCLEVBQWtDd0IsT0FBTyxDQUFDTSxRQUExQyxDQUFkO0FBQ0FoQixVQUFBQSxHQUFHLGNBQU9ZLFdBQVAsU0FBSDtBQUNILFNBWEQ7QUFZQVosUUFBQUEsR0FBRyxJQUFJLFNBQVA7QUFDSDs7QUFDREEsTUFBQUEsR0FBRyxJQUFJLGtCQUFQO0FBQ0FwRyxNQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQnFILE1BQTNCLENBQWtDakIsR0FBbEM7QUFDSCxLQXpDRDtBQTBDSCxHQXBTbUI7O0FBc1NwQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lrQixFQUFBQSxxQkEzU29CLGlDQTJTRTNELFFBM1NGLEVBMlNZNEQsT0EzU1osRUEyU3FCO0FBQ3JDLFFBQUlBLE9BQU8sS0FBSyxJQUFoQixFQUFzQjtBQUNsQixVQUFJLE9BQU81RCxRQUFRLENBQUM2RCxJQUFULENBQWNDLFVBQXJCLEtBQW9DLFdBQXhDLEVBQXFEO0FBQ2pEQyxRQUFBQSxnQkFBZ0IsR0FBRy9ELFFBQVEsQ0FBQzZELElBQVQsQ0FBY0MsVUFBakM7QUFDQTNILFFBQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUI0SCxJQUF6QixDQUE4QixXQUE5QixFQUEyQyxRQUEzQyxFQUFxRGhFLFFBQVEsQ0FBQzZELElBQVQsQ0FBY0MsVUFBbkU7QUFDSDs7QUFDRHpILE1BQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCcUQsSUFBM0IsQ0FBZ0MsRUFBaEM7QUFFQXZELE1BQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUI0SCxJQUF6QixDQUE4QixXQUE5QixFQUEyQyxRQUEzQyxFQUFxRCxFQUFyRDtBQUVBN0gsTUFBQUEsZUFBZSxDQUFDb0MsVUFBaEI7O0FBQ0EsVUFBSXlCLFFBQVEsQ0FBQ1EsUUFBVCxDQUFrQmYsTUFBbEIsS0FBNkIsQ0FBakMsRUFBb0M7QUFDaENpQixRQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJYLFFBQVEsQ0FBQ1EsUUFBckM7QUFDSDtBQUNKLEtBYkQsTUFhTyxJQUFJUixRQUFRLENBQUNRLFFBQVQsS0FBc0JDLFNBQTFCLEVBQXFDO0FBQ3hDQyxNQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJYLFFBQVEsQ0FBQ1EsUUFBckM7QUFDSCxLQUZNLE1BRUE7QUFDSEUsTUFBQUEsV0FBVyxDQUFDdUQsU0FBWixDQUFzQnRHLGVBQWUsQ0FBQ3VHLDhCQUF0QztBQUNILEtBbEJvQyxDQW9CckM7OztBQUNBQyxJQUFBQSxJQUFJLENBQUNDLFdBQUw7QUFDSCxHQWpVbUI7O0FBbVVwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJdEQsRUFBQUEsZ0JBdlVvQiw0QkF1VUhOLFFBdlVHLEVBdVVNO0FBQ3RCLFFBQUk2RCxVQUFVLGlCQUFVMUcsZUFBZSxDQUFDMkcsaUJBQTFCLG9FQUFkOztBQUNBLFFBQUluSSxlQUFlLENBQUNpQixpQkFBaEIsQ0FBa0NxQyxNQUFsQyxLQUE2QyxFQUFqRCxFQUFxRDtBQUNqRDRFLE1BQUFBLFVBQVUsSUFBSWxJLGVBQWUsQ0FBQ2lCLGlCQUE5QjtBQUNIOztBQUNEaUgsSUFBQUEsVUFBVSxJQUFJLDhDQUFkO0FBQ0E3RCxJQUFBQSxRQUFRLENBQUM4QixJQUFULENBQWMrQixVQUFkO0FBQ0EzRCxJQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJILFFBQTVCLEVBQXNDN0MsZUFBZSxDQUFDa0Qsa0JBQXREO0FBQ0gsR0EvVW1COztBQWdWcEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJMEQsRUFBQUEsZ0JBclZvQiw0QkFxVkhDLFFBclZHLEVBcVZPO0FBQ3ZCLFdBQU9BLFFBQVA7QUFDSCxHQXZWbUI7O0FBeVZwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQTdWb0IsMkJBNlZKekUsUUE3VkksRUE2Vk07QUFDdEIsUUFBTTBFLFFBQVEsR0FBR3ZJLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUI0SCxJQUF6QixDQUE4QixZQUE5QixDQUFqQjtBQUNBM0UsSUFBQUEsTUFBTSxDQUFDc0YseUJBQVAsQ0FBaUNELFFBQWpDLEVBQTJDdkksZUFBZSxDQUFDd0gscUJBQTNEO0FBQ0gsR0FoV21COztBQWtXcEI7QUFDSjtBQUNBO0FBQ0luRSxFQUFBQSxjQXJXb0IsNEJBcVdIO0FBQ2IyRSxJQUFBQSxJQUFJLENBQUMvSCxRQUFMLEdBQWdCRCxlQUFlLENBQUNDLFFBQWhDO0FBQ0ErSCxJQUFBQSxJQUFJLENBQUNTLEdBQUwsYUFBY0MsYUFBZCxvQkFGYSxDQUVnQzs7QUFDN0NWLElBQUFBLElBQUksQ0FBQzlHLGFBQUwsR0FBcUJsQixlQUFlLENBQUNrQixhQUFyQyxDQUhhLENBR3VDOztBQUNwRDhHLElBQUFBLElBQUksQ0FBQ0ksZ0JBQUwsR0FBd0JwSSxlQUFlLENBQUNvSSxnQkFBeEMsQ0FKYSxDQUk2Qzs7QUFDMURKLElBQUFBLElBQUksQ0FBQ00sZUFBTCxHQUF1QnRJLGVBQWUsQ0FBQ3NJLGVBQXZDLENBTGEsQ0FLMkM7O0FBQ3hETixJQUFBQSxJQUFJLENBQUM1RixVQUFMO0FBQ0g7QUE1V21CLENBQXhCO0FBK1dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FsQyxDQUFDLENBQUN5SSxFQUFGLENBQUtkLElBQUwsQ0FBVVEsUUFBVixDQUFtQmhILEtBQW5CLENBQXlCdUgsMkJBQXpCLEdBQXVELFVBQVVDLEtBQVYsRUFBaUI7QUFDcEUsU0FBUTdJLGVBQWUsQ0FBQ1MsT0FBaEIsQ0FBd0JzQyxHQUF4QixHQUE4Qk8sTUFBOUIsS0FBeUMsRUFBekMsSUFBK0N1RixLQUFLLENBQUN2RixNQUFOLEdBQWUsQ0FBdEU7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOzs7QUFDQXBELENBQUMsQ0FBQzRJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIvSSxFQUFBQSxlQUFlLENBQUNvQyxVQUFoQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUEJYTGljZW5zZSovXG5cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1vZHVsZXMgbGljZW5zZSBrZXlcbiAqXG4gKiBAbW9kdWxlIGxpY2Vuc2luZ01vZGlmeVxuICovXG5jb25zdCBsaWNlbnNpbmdNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybScpLFxuXG4gICAgJGVtcHR5TGljZW5zZUtleUluZm86ICQoJy5lbXB0eS1saWNlbnNlLWtleS1pbmZvJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXI6ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaGVhZGVyJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlJbmZvOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8nKSxcbiAgICAkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb246ICQoJyNnZXROZXdLZXlMaWNlbnNlU2VjdGlvbicpLFxuICAgICRjb3Vwb25TZWN0aW9uOiAkKCcjY291cG9uU2VjdGlvbicpLFxuICAgICRmb3JtRXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcbiAgICAkbGljS2V5OiAkKCcjbGljS2V5JyksXG4gICAgJGNvdXBvbjogJCgnI2NvdXBvbicpLFxuICAgICRlbWFpbDogJCgnI2VtYWlsJyksXG4gICAgJGFqYXhNZXNzYWdlczogJCgnLnVpLm1lc3NhZ2UuYWpheCcpLFxuICAgICRsaWNlbnNlRGV0YWlsSW5mbzogJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyksXG4gICAgJHJlc2V0QnV0dG9uOiAkKCcjcmVzZXQtbGljZW5zZScpLFxuICAgICRwcm9kdWN0RGV0YWlsczogJCgnI3Byb2R1Y3REZXRhaWxzJyksXG4gICAgJGFjY29yZGlvbnM6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0gLnVpLmFjY29yZGlvbicpLFxuICAgIGRlZmF1bHRMaWNlbnNlS2V5OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGNvbXBhbnluYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb250YWN0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29udGFjdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBsaWNLZXk6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdsaWNLZXknLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY291cG9uOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAnbGljS2V5JyxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSBsaWNlbnNpbmcgcGFnZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBjb3Vwb24gY29kZSBmaWVsZFxuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGNvdXBvbi5pbnB1dG1hc2soJ01JS09VUEQtKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkNvdXBvbkJlZm9yZVBhc3RlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgaW5wdXQgbWFzayBmb3IgbGljZW5zZSBrZXkgZmllbGRcbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBvbmluY29tcGxldGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuICAgICAgICAgICAgY2xlYXJJbmNvbXBsZXRlOiB0cnVlLFxuICAgICAgICAgICAgb25CZWZvcmVQYXN0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcpO1xuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcblxuICAgICAgICAvLyBIYW5kbGUgcmVzZXQgYnV0dG9uIGNsaWNrXG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kcmVzZXRCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBQYnhBcGkuTGljZW5zZVJlc2V0TGljZW5zZUtleShsaWNlbnNpbmdNb2RpZnkuY2JBZnRlclJlc2V0TGljZW5zZUtleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYSBsaWNlbnNlIGtleSBpcyBwcmVzZW50XG4gICAgICAgIGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mb1xuICAgICAgICAgICAgICAgIC5odG1sKGAke2xpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleX0gPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT5gKVxuICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAgUGJ4QXBpLkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKTtcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlR2V0TGljZW5zZUluZm8obGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLmhpZGUoKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXNldHRpbmcgdGhlIGxpY2Vuc2Uga2V5LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgbGljZW5zZSBrZXkgcmVzZXQuXG4gICAgICovXG4gICAgY2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgYW5kIGRpc2FibGVkIGNsYXNzZXMgZnJvbSB0aGUgZm9ybVxuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAocmVzcG9uc2UgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgaXMgbm90IGZhbHNlLCBpbmRpY2F0aW5nIGEgc3VjY2Vzc2Z1bCBsaWNlbnNlIGtleSByZXNldCxcbiAgICAgICAgICAgIC8vIHJlbG9hZCB0aGUgd2luZG93IHRvIGFwcGx5IHRoZSBjaGFuZ2VzXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIGdldHRpbmcgdGhlIE1pa29QQlggZmVhdHVyZSBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgTWlrb1BCWCBmZWF0dXJlIHN0YXR1cy5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBsb2FkaW5nIHNwaW5uZXIgYW5kIGFueSBwcmV2aW91cyBBSkFYIG1lc3NhZ2VzXG4gICAgICAgICQoJy5zcGlubmVyLmxvYWRpbmcuaWNvbicpLnJlbW92ZSgpO1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIE1pa29QQlggZmVhdHVyZSBzdGF0dXMgaXMgdHJ1ZSAodmFsaWQpXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ3N1Y2Nlc3MnKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBzdWNjZXNzIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiY2hlY2sgZ3JlZW4gaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VLZXlWYWxpZH08L2Rpdj5gKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzIGlzIGZhbHNlIG9yIGFuIGVycm9yIG9jY3VycmVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8IHJlc3BvbnNlLm1lc3NhZ2VzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBGYWlsZWQgdG8gY2hlY2sgbGljZW5zZSBzdGF0dXMgKHJlc3BvbnNlIGlzIGZhbHNlIG9yIG5vIG1lc3NhZ2VzIGF2YWlsYWJsZSlcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmxpY19GYWlsZWRDaGVja0xpY2Vuc2VOb3RQYnhSZXNwb25zZSwgZ2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlUHJvYmxlbSk7XG4gICAgICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLnNob3coKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFpbGVkIHRvIGNoZWNrIGxpY2Vuc2Ugc3RhdHVzIHdpdGggZXJyb3IgbWVzc2FnZXNcbiAgICAgICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuc2hvd0xpY2Vuc2VFcnJvcihyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TGljZW5zZUluZm8ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmxpY2Vuc2VJbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuc2hvd0xpY2Vuc2VJbmZvKHJlc3BvbnNlLmxpY2Vuc2VJbmZvKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgd2hlbiB0aGVyZSBpcyBhIGNoYW5nZSBpbiB0aGUgbGljZW5zZSBrZXkgaW5wdXQuXG4gICAgICovXG4gICAgY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpIHtcbiAgICAgICAgY29uc3QgbGljS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG4gICAgICAgIGlmIChsaWNLZXkubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBrZXkgaXMgY29tcGxldGVcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kY291cG9uU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1FcnJvck1lc3NhZ2VzLmVtcHR5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBpbmNvbXBsZXRlXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLnJlbW92ZUF0dHIoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kY291cG9uU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgbGljZW5zZSBrZXkgZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS08tJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBiZWZvcmUgcGFzdGluZyBhIHZhbHVlIGludG8gdGhlIGNvdXBvbiBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgdmFsdWUgYmVpbmcgcGFzdGVkIGludG8gdGhlIGZpZWxkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufHN0cmluZ30gLSBSZXR1cm5zIGZhbHNlIGlmIHRoZSBwYXN0ZWQgdmFsdWUgZG9lcyBub3QgY29udGFpbiAnTUlLT1VQRC0nLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgcGFzdGVkIHZhbHVlIHdpdGggd2hpdGVzcGFjZSByZW1vdmVkLlxuICAgICAqL1xuICAgIGNiT25Db3Vwb25CZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICBpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLT1VQRC0nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kY291cG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBUaGUgbGljZW5zZSBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqL1xuICAgIHNob3dMaWNlbnNlSW5mbyhtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGxpY2Vuc2VEYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgICAgICAgaWYgKGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkKCcja2V5LWNvbXBhbnluYW1lJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb21wYW55bmFtZSk7XG4gICAgICAgICQoJyNrZXktY29udGFjdCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29udGFjdCk7XG4gICAgICAgICQoJyNrZXktZW1haWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmVtYWlsKTtcbiAgICAgICAgJCgnI2tleS10ZWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLnRlbCk7XG4gICAgICAgIGxldCBwcm9kdWN0cyA9IGxpY2Vuc2VEYXRhLnByb2R1Y3Q7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcm9kdWN0cykpIHtcbiAgICAgICAgICAgIHByb2R1Y3RzID0gW107XG4gICAgICAgICAgICBwcm9kdWN0cy5wdXNoKGxpY2Vuc2VEYXRhLnByb2R1Y3QpO1xuICAgICAgICB9XG4gICAgICAgICQuZWFjaChwcm9kdWN0cywgKGtleSwgcHJvZHVjdFZhbHVlKSA9PiB7XG4gICAgICAgICAgICBpZiAocHJvZHVjdFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgcm93ID0gJzx0cj48dGQ+JztcbiAgICAgICAgICAgIGxldCBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlO1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHByb2R1Y3QgPSBwcm9kdWN0VmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkYXRlRXhwaXJlZCA9IG5ldyBEYXRlKHByb2R1Y3QuZXhwaXJlZC5yZXBsYWNlKC8oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KS8sICckMS8kMi8kMycpKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVOb3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgaWYgKGRhdGVOb3cgPiBkYXRlRXhwaXJlZCkge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPT09IDAgJiYgcHJvZHVjdC50cmlhbCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPiR7cHJvZHVjdC5uYW1lfWA7XG4gICAgICAgICAgICAgICAgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBleHBpcmVkVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZEFmdGVyO1xuICAgICAgICAgICAgICAgICAgICBleHBpcmVkVGV4dCA9IGV4cGlyZWRUZXh0LnJlcGxhY2UoJyVleHBpcmVkJScsIHByb2R1Y3QuZXhwaXJlZCk7XG4gICAgICAgICAgICAgICAgICAgIHJvdyArPSBgPGJyPjxzbWFsbD4ke2V4cGlyZWRUZXh0fTwvc21hbGw+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPic7XG4gICAgICAgICAgICAgICAgJC5lYWNoKHByb2R1Y3RWYWx1ZS5mZWF0dXJlLCAoaW5kZXgsIGZlYXR1cmVWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZUluZm8gPSBnbG9iYWxUcmFuc2xhdGUubGljX0ZlYXR1cmVJbmZvO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJW5hbWUlJywgZmVhdHVyZS5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnQlJywgZmVhdHVyZS5jb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50ZWFjaCUnLCBmZWF0dXJlLmNvdW50ZWFjaCk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNhcHR1cmVkJScsIGZlYXR1cmUuY2FwdHVyZWQpO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdyArPSAnPC9kaXY+PC90ZD48L3RyPic7XG4gICAgICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5hcHBlbmQocm93KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFmdGVyIHVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuICAgICAqIEBwYXJhbSByZXNwb25zZVxuICAgICAqIEBwYXJhbSBzdWNjZXNzXG4gICAgICovXG4gICAgY2JBZnRlckZvcm1Qcm9jZXNzaW5nKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG4gICAgICAgIGlmIChzdWNjZXNzID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBnbG9iYWxQQlhMaWNlbnNlID0gcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlO1xuICAgICAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbGljS2V5JywgcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmh0bWwoJycpO1xuXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2NvdXBvbicsICcnKTtcblxuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmxpY19HZXRUcmlhbEVycm9yQ2hlY2tJbnRlcm5ldCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZXMgZXJyb3IgbWVzc2FnZXMgdG8gYmUgZGlzcGxheWVkLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlc1xuICAgICAqL1xuICAgIHNob3dMaWNlbnNlRXJyb3IobWVzc2FnZXMpe1xuICAgICAgICBsZXQgbWFuYWdlTGluayA9IGA8YnI+JHtnbG9iYWxUcmFuc2xhdGUubGljX01hbmFnZUxpY2Vuc2V9IDxhIGhyZWY9XCJodHRwczovL2xtLm1pa29wYnguY29tL2NsaWVudC1jYWJpbmV0L3Nlc3Npb24vaW5kZXgvYDtcbiAgICAgICAgaWYgKGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleS5sZW5ndGggPT09IDI4KSB7XG4gICAgICAgICAgICBtYW5hZ2VMaW5rICs9IGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleVxuICAgICAgICB9XG4gICAgICAgIG1hbmFnZUxpbmsgKz0gJ1wiIHRhcmdldD1cIl9ibGFua1wiPmh0dHBzOi8vbG0ubWlrb3BieC5jb208L2E+JztcbiAgICAgICAgbWVzc2FnZXMucHVzaChtYW5hZ2VMaW5rKTtcbiAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKG1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VQcm9ibGVtKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBQYnhBcGkuTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdChmb3JtRGF0YSwgbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9zYXZlYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBsaWNlbnNpbmdNb2RpZnkudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgdG8gY2hlY2sgaWYgYSBmaWVsZCBpcyBlbXB0eSBvbmx5IGlmIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBub3QgZW1wdHkuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZpZWxkIGJlaW5nIHZhbGlkYXRlZC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGZpZWxkIGlzIG5vdCBlbXB0eSBvciB0aGUgbGljZW5zZSBrZXkgZmllbGQgaXMgZW1wdHksIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiAobGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCkubGVuZ3RoID09PSAyOCB8fCB2YWx1ZS5sZW5ndGggPiAwKTtcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbGljZW5zaW5nIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==