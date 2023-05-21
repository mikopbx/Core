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
    licensingModify.$licensingMenu.tab({
      historyType: 'hash'
    }); // Check if the license key info is filled

    if (licensingModify.$filledLicenseKeyInfo.length === 0) {
      licensingModify.$licensingMenu.tab('change tab', 'management'); // No internet connection. Form is not rendered.

      return;
    }

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
      PbxApi.LicenseGetMikoPBXFeatureStatus(licensingModify.cbAfterGetMikoPBXFeatureStatus);
      PbxApi.LicenseGetLicenseInfo(licensingModify.cbAfterGetLicenseInfo);
      licensingModify.$emptyLicenseKeyInfo.hide();
    } else {
      licensingModify.$filledLicenseKeyInfo.hide();
      licensingModify.$emptyLicenseKeyInfo.show();
    } // Switch to the management tab if a license key is present


    if (licensingModify.defaultLicenseKey !== '') {
      licensingModify.$licensingMenu.tab('change tab', 'management');
    } // Handle "Go to License Management" button click


    licensingModify.$goToLicenseManagementBTN.on('click', function (e) {
      e.preventDefault();
      licensingModify.$licensingMenu.tab('change tab', 'management');
    });
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
    licensingModify.$ajaxMessages.remove();

    if (response === true) {
      // MikoPBX feature status is true (valid)
      licensingModify.$formObj.removeClass('error').addClass('success');
      licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui success message ajax\"><i class=\"check green icon\"></i> ".concat(globalTranslate.lic_LicenseKeyValid, "</div>"));
    } else {
      // MikoPBX feature status is false or an error occurred
      licensingModify.$formObj.addClass('error').removeClass('success');

      if (response === false || response.messages === undefined) {
        // Failed to check license status (response is false or no messages available)
        $('#licFailInfo').remove();
        licensingModify.$filledLicenseKeyInfo.after("<div id=\"licFailInfo\" class=\"ui error message ajax\"><i class=\"exclamation triangle red icon\"></i> ".concat(globalTranslate.lic_FailedCheckLicenseNotPbxResponse, "</div>"));
      } else {
        // Failed to check license status with error messages
        $('#licFailInfoMsg').remove();
        licensingModify.$filledLicenseKeyInfo.after("<div id=\"licFailInfoMsg\" class=\"ui error message ajax\"><i class=\"exclamation triangle red icon\"></i> ".concat(response.messages, "</div>"));
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
    } // Change the value of '$dirrtyField' to trigger
    // the 'change' form event and enable submit button.


    licensingModify.$dirrtyField.val(Math.random());
    licensingModify.$dirrtyField.trigger('change');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJsaWNlbnNpbmdNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkZGlycnR5RmllbGQiLCIkZ29Ub0xpY2Vuc2VNYW5hZ2VtZW50QlROIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUluZm8iLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRyZXNldEJ1dHRvbiIsIiRwcm9kdWN0RGV0YWlscyIsIiRsaWNlbnNpbmdNZW51IiwiJGFjY29yZGlvbnMiLCJkZWZhdWx0TGljZW5zZUtleSIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJ0YWIiLCJoaXN0b3J5VHlwZSIsImxlbmd0aCIsImFjY29yZGlvbiIsImhpZGUiLCJpbnB1dG1hc2siLCJvbkJlZm9yZVBhc3RlIiwiY2JPbkNvdXBvbkJlZm9yZVBhc3RlIiwib25jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UiLCJvbmluY29tcGxldGUiLCJjbGVhckluY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlIiwidmFsIiwib24iLCJhZGRDbGFzcyIsIlBieEFwaSIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJjYkFmdGVyUmVzZXRMaWNlbnNlS2V5IiwiaW5pdGlhbGl6ZUZvcm0iLCJodG1sIiwic2hvdyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsImFmdGVyIiwibGljX0xpY2Vuc2VLZXlWYWxpZCIsIm1lc3NhZ2VzIiwidW5kZWZpbmVkIiwibGljX0ZhaWxlZENoZWNrTGljZW5zZU5vdFBieFJlc3BvbnNlIiwibGljZW5zZUluZm8iLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiYXR0ciIsImVtcHR5IiwicmVtb3ZlQXR0ciIsInBhc3RlZFZhbHVlIiwiaW5kZXhPZiIsInRyYW5zaXRpb24iLCJyZXBsYWNlIiwibWVzc2FnZSIsImxpY2Vuc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwidGV4dCIsInRlbCIsInByb2R1Y3RzIiwicHJvZHVjdCIsIkFycmF5IiwiaXNBcnJheSIsInB1c2giLCJrZXkiLCJwcm9kdWN0VmFsdWUiLCJyb3ciLCJkYXRlRXhwaXJlZCIsIkRhdGUiLCJleHBpcmVkIiwiZGF0ZU5vdyIsIm5hbWUiLCJsaWNfRXhwaXJlZCIsInRyaWFsIiwiZXhwaXJlZFRleHQiLCJsaWNfRXhwaXJlZEFmdGVyIiwiZmVhdHVyZSIsImZlYXR1cmVWYWx1ZSIsImZlYXR1cmVJbmZvIiwibGljX0ZlYXR1cmVJbmZvIiwiY291bnQiLCJjb3VudGVhY2giLCJjYXB0dXJlZCIsImFwcGVuZCIsImNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyIsInN1Y2Nlc3MiLCJkYXRhIiwiUEJYTGljZW5zZSIsImdsb2JhbFBCWExpY2Vuc2UiLCJmb3JtIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzaG93RXJyb3IiLCJsaWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQiLCJNYXRoIiwicmFuZG9tIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvcm1EYXRhIiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZm4iLCJjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkiLCJ2YWx1ZSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZUFBZSxHQUFHO0FBQ3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHdCQUFELENBTFM7O0FBT3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRUQsQ0FBQyxDQUFDLFNBQUQsQ0FYSztBQWFwQkUsRUFBQUEseUJBQXlCLEVBQUVGLENBQUMsQ0FBQyx3QkFBRCxDQWJSO0FBY3BCRyxFQUFBQSxvQkFBb0IsRUFBRUgsQ0FBQyxDQUFDLHlCQUFELENBZEg7QUFlcEJJLEVBQUFBLHFCQUFxQixFQUFFSixDQUFDLENBQUMsMEJBQUQsQ0FmSjtBQWdCcEJLLEVBQUFBLHdCQUF3QixFQUFFTCxDQUFDLENBQUMsMEJBQUQsQ0FoQlA7QUFpQnBCTSxFQUFBQSxjQUFjLEVBQUVOLENBQUMsQ0FBQyxnQkFBRCxDQWpCRztBQWtCcEJPLEVBQUFBLGtCQUFrQixFQUFFUCxDQUFDLENBQUMsc0JBQUQsQ0FsQkQ7QUFtQnBCUSxFQUFBQSxPQUFPLEVBQUVSLENBQUMsQ0FBQyxTQUFELENBbkJVO0FBb0JwQlMsRUFBQUEsT0FBTyxFQUFFVCxDQUFDLENBQUMsU0FBRCxDQXBCVTtBQXFCcEJVLEVBQUFBLE1BQU0sRUFBRVYsQ0FBQyxDQUFDLFFBQUQsQ0FyQlc7QUFzQnBCVyxFQUFBQSxhQUFhLEVBQUVYLENBQUMsQ0FBQyxrQkFBRCxDQXRCSTtBQXVCcEJZLEVBQUFBLGtCQUFrQixFQUFFWixDQUFDLENBQUMsb0JBQUQsQ0F2QkQ7QUF3QnBCYSxFQUFBQSxZQUFZLEVBQUViLENBQUMsQ0FBQyxnQkFBRCxDQXhCSztBQXlCcEJjLEVBQUFBLGVBQWUsRUFBRWQsQ0FBQyxDQUFDLGlCQUFELENBekJFO0FBMEJwQmUsRUFBQUEsY0FBYyxFQUFFZixDQUFDLENBQUMsdUJBQUQsQ0ExQkc7QUEyQnBCZ0IsRUFBQUEsV0FBVyxFQUFFaEIsQ0FBQyxDQUFDLHNDQUFELENBM0JNO0FBNEJwQmlCLEVBQUFBLGlCQUFpQixFQUFFLElBNUJDOztBQThCcEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RDLE1BQUFBLFVBQVUsRUFBRSxhQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSw2QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERztBQUZFLEtBREY7QUFVWEMsSUFBQUEsS0FBSyxFQUFFO0FBQ0hOLE1BQUFBLFVBQVUsRUFBRSxPQURUO0FBRUhDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSw2QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0c7QUFGNUIsT0FERztBQUZKLEtBVkk7QUFtQlhDLElBQUFBLE9BQU8sRUFBRTtBQUNMUixNQUFBQSxVQUFVLEVBQUUsU0FEUDtBQUVMQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsNkJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNLO0FBRjVCLE9BREc7QUFGRixLQW5CRTtBQTRCWEMsSUFBQUEsTUFBTSxFQUFFO0FBQ0pWLE1BQUFBLFVBQVUsRUFBRSxRQURSO0FBRUpXLE1BQUFBLFFBQVEsRUFBRSxJQUZOO0FBR0pWLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxpQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1E7QUFGNUIsT0FERztBQUhILEtBNUJHO0FBc0NYQyxJQUFBQSxNQUFNLEVBQUU7QUFDSkMsTUFBQUEsT0FBTyxFQUFFLFFBREw7QUFFSmQsTUFBQUEsVUFBVSxFQUFFLFFBRlI7QUFHSlcsTUFBQUEsUUFBUSxFQUFFLElBSE47QUFJSlYsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLGlCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDVztBQUY1QixPQURHO0FBSkg7QUF0Q0csR0FuQ0s7QUFzRnBCO0FBQ0FDLEVBQUFBLFVBdkZvQix3QkF1RlA7QUFFVHRDLElBQUFBLGVBQWUsQ0FBQ2lCLGNBQWhCLENBQStCc0IsR0FBL0IsQ0FBbUM7QUFDL0JDLE1BQUFBLFdBQVcsRUFBRTtBQURrQixLQUFuQyxFQUZTLENBTVQ7O0FBQ0EsUUFBSXhDLGVBQWUsQ0FBQ00scUJBQWhCLENBQXNDbUMsTUFBdEMsS0FBaUQsQ0FBckQsRUFBd0Q7QUFDcER6QyxNQUFBQSxlQUFlLENBQUNpQixjQUFoQixDQUErQnNCLEdBQS9CLENBQW1DLFlBQW5DLEVBQWlELFlBQWpELEVBRG9ELENBRXBEOztBQUNBO0FBQ0g7O0FBRUR2QyxJQUFBQSxlQUFlLENBQUNrQixXQUFoQixDQUE0QndCLFNBQTVCO0FBQ0ExQyxJQUFBQSxlQUFlLENBQUNjLGtCQUFoQixDQUFtQzZCLElBQW5DLEdBZFMsQ0FnQlQ7O0FBQ0EzQyxJQUFBQSxlQUFlLENBQUNXLE9BQWhCLENBQXdCaUMsU0FBeEIsQ0FBa0MsaUNBQWxDLEVBQXFFO0FBQ2pFQyxNQUFBQSxhQUFhLEVBQUU3QyxlQUFlLENBQUM4QztBQURrQyxLQUFyRSxFQWpCUyxDQXFCVDs7QUFDQTlDLElBQUFBLGVBQWUsQ0FBQ1UsT0FBaEIsQ0FBd0JrQyxTQUF4QixDQUFrQyw4QkFBbEMsRUFBa0U7QUFDOURHLE1BQUFBLFVBQVUsRUFBRS9DLGVBQWUsQ0FBQ2dELHlCQURrQztBQUU5REMsTUFBQUEsWUFBWSxFQUFFakQsZUFBZSxDQUFDZ0QseUJBRmdDO0FBRzlERSxNQUFBQSxlQUFlLEVBQUUsSUFINkM7QUFJOURMLE1BQUFBLGFBQWEsRUFBRTdDLGVBQWUsQ0FBQ21EO0FBSitCLEtBQWxFO0FBT0FuRCxJQUFBQSxlQUFlLENBQUNZLE1BQWhCLENBQXVCZ0MsU0FBdkIsQ0FBaUMsT0FBakM7QUFDQTVDLElBQUFBLGVBQWUsQ0FBQ21CLGlCQUFoQixHQUFvQ25CLGVBQWUsQ0FBQ1UsT0FBaEIsQ0FBd0IwQyxHQUF4QixFQUFwQyxDQTlCUyxDQWdDVDs7QUFDQXBELElBQUFBLGVBQWUsQ0FBQ2UsWUFBaEIsQ0FBNkJzQyxFQUE3QixDQUFnQyxPQUFoQyxFQUF5QyxZQUFNO0FBQzNDckQsTUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QnFELFFBQXpCLENBQWtDLGtCQUFsQztBQUNBQyxNQUFBQSxNQUFNLENBQUNDLHNCQUFQLENBQThCeEQsZUFBZSxDQUFDeUQsc0JBQTlDO0FBQ0gsS0FIRDtBQUtBekQsSUFBQUEsZUFBZSxDQUFDZ0QseUJBQWhCO0FBRUFoRCxJQUFBQSxlQUFlLENBQUMwRCxjQUFoQixHQXhDUyxDQTBDVDs7QUFDQSxRQUFJMUQsZUFBZSxDQUFDbUIsaUJBQWhCLENBQWtDc0IsTUFBbEMsS0FBNkMsRUFBakQsRUFBcUQ7QUFDakR6QyxNQUFBQSxlQUFlLENBQUNNLHFCQUFoQixDQUNLcUQsSUFETCxXQUNhM0QsZUFBZSxDQUFDbUIsaUJBRDdCLDhDQUVLeUMsSUFGTDtBQUdBTCxNQUFBQSxNQUFNLENBQUNNLDhCQUFQLENBQXNDN0QsZUFBZSxDQUFDOEQsOEJBQXREO0FBQ0FQLE1BQUFBLE1BQU0sQ0FBQ1EscUJBQVAsQ0FBNkIvRCxlQUFlLENBQUNnRSxxQkFBN0M7QUFDQWhFLE1BQUFBLGVBQWUsQ0FBQ0ssb0JBQWhCLENBQXFDc0MsSUFBckM7QUFDSCxLQVBELE1BT087QUFDSDNDLE1BQUFBLGVBQWUsQ0FBQ00scUJBQWhCLENBQXNDcUMsSUFBdEM7QUFDQTNDLE1BQUFBLGVBQWUsQ0FBQ0ssb0JBQWhCLENBQXFDdUQsSUFBckM7QUFDSCxLQXJEUSxDQXVEVDs7O0FBQ0EsUUFBSTVELGVBQWUsQ0FBQ21CLGlCQUFoQixLQUFzQyxFQUExQyxFQUE4QztBQUMxQ25CLE1BQUFBLGVBQWUsQ0FBQ2lCLGNBQWhCLENBQStCc0IsR0FBL0IsQ0FBbUMsWUFBbkMsRUFBaUQsWUFBakQ7QUFDSCxLQTFEUSxDQTREVDs7O0FBQ0F2QyxJQUFBQSxlQUFlLENBQUNJLHlCQUFoQixDQUEwQ2lELEVBQTFDLENBQTZDLE9BQTdDLEVBQXNELFVBQUNZLENBQUQsRUFBTztBQUN6REEsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0FsRSxNQUFBQSxlQUFlLENBQUNpQixjQUFoQixDQUErQnNCLEdBQS9CLENBQW1DLFlBQW5DLEVBQWlELFlBQWpEO0FBQ0gsS0FIRDtBQUtILEdBekptQjs7QUEySnBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lrQixFQUFBQSxzQkEvSm9CLGtDQStKR1UsUUEvSkgsRUErSmE7QUFDN0I7QUFDQW5FLElBQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUJtRSxXQUF6QixDQUFxQyxrQkFBckM7O0FBRUEsUUFBSUQsUUFBUSxLQUFLLEtBQWpCLEVBQXdCO0FBQ3BCO0FBQ0E7QUFDQUUsTUFBQUEsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUFoQjtBQUNIO0FBQ0osR0F4S21COztBQTBLcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSVQsRUFBQUEsOEJBOUtvQiwwQ0E4S1dLLFFBOUtYLEVBOEtxQjtBQUNyQztBQUNBakUsSUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkJzRSxNQUEzQjtBQUNBeEUsSUFBQUEsZUFBZSxDQUFDYSxhQUFoQixDQUE4QjJELE1BQTlCOztBQUNBLFFBQUlMLFFBQVEsS0FBSyxJQUFqQixFQUF1QjtBQUNuQjtBQUNBbkUsTUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5Qm1FLFdBQXpCLENBQXFDLE9BQXJDLEVBQThDZCxRQUE5QyxDQUF1RCxTQUF2RDtBQUNBdEQsTUFBQUEsZUFBZSxDQUFDTSxxQkFBaEIsQ0FBc0NtRSxLQUF0QyxxRkFBcUgvQyxlQUFlLENBQUNnRCxtQkFBckk7QUFDSCxLQUpELE1BSU87QUFDSDtBQUNBMUUsTUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QnFELFFBQXpCLENBQWtDLE9BQWxDLEVBQTJDYyxXQUEzQyxDQUF1RCxTQUF2RDs7QUFDQSxVQUFJRCxRQUFRLEtBQUssS0FBYixJQUFzQkEsUUFBUSxDQUFDUSxRQUFULEtBQXNCQyxTQUFoRCxFQUEyRDtBQUN2RDtBQUNBMUUsUUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQnNFLE1BQWxCO0FBQ0F4RSxRQUFBQSxlQUFlLENBQUNNLHFCQUFoQixDQUFzQ21FLEtBQXRDLG1IQUFpSi9DLGVBQWUsQ0FBQ21ELG9DQUFqSztBQUNILE9BSkQsTUFJTztBQUNIO0FBQ0EzRSxRQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQnNFLE1BQXJCO0FBQ0F4RSxRQUFBQSxlQUFlLENBQUNNLHFCQUFoQixDQUFzQ21FLEtBQXRDLHNIQUFvSk4sUUFBUSxDQUFDUSxRQUE3SjtBQUNIO0FBQ0o7QUFDSixHQW5NbUI7O0FBcU1wQjtBQUNKO0FBQ0E7QUFDQTtBQUNJWCxFQUFBQSxxQkF6TW9CLGlDQXlNRUcsUUF6TUYsRUF5TVk7QUFDNUIsUUFBSUEsUUFBUSxDQUFDVyxXQUFULEtBQXlCRixTQUE3QixFQUF3QztBQUNwQztBQUNBNUUsTUFBQUEsZUFBZSxDQUFDK0UsZUFBaEIsQ0FBZ0NaLFFBQVEsQ0FBQ1csV0FBekM7QUFDQTlFLE1BQUFBLGVBQWUsQ0FBQ2Msa0JBQWhCLENBQW1DOEMsSUFBbkM7QUFDSCxLQUpELE1BSU87QUFDSDtBQUNBNUQsTUFBQUEsZUFBZSxDQUFDYyxrQkFBaEIsQ0FBbUM2QixJQUFuQztBQUNIO0FBQ0osR0FsTm1COztBQW9OcEI7QUFDSjtBQUNBO0FBQ0lLLEVBQUFBLHlCQXZOb0IsdUNBdU5RO0FBQ3hCLFFBQU1oQixNQUFNLEdBQUdoQyxlQUFlLENBQUNVLE9BQWhCLENBQXdCMEMsR0FBeEIsRUFBZjs7QUFDQSxRQUFJcEIsTUFBTSxDQUFDUyxNQUFQLEtBQWtCLEVBQXRCLEVBQTBCO0FBQ3RCO0FBQ0F6QyxNQUFBQSxlQUFlLENBQUNDLFFBQWhCLENBQXlCK0UsSUFBekIsQ0FBOEIsZ0JBQTlCLEVBQWdEQyxJQUFoRCxDQUFxRCxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDakVqRixRQUFBQSxDQUFDLENBQUNpRixHQUFELENBQUQsQ0FBT0MsSUFBUCxDQUFZLFFBQVosRUFBc0IsRUFBdEI7QUFDSCxPQUZEO0FBR0FwRixNQUFBQSxlQUFlLENBQUNPLHdCQUFoQixDQUF5Q29DLElBQXpDO0FBQ0EzQyxNQUFBQSxlQUFlLENBQUNRLGNBQWhCLENBQStCb0QsSUFBL0I7QUFDQTVELE1BQUFBLGVBQWUsQ0FBQ1Msa0JBQWhCLENBQW1DNEUsS0FBbkM7QUFDSCxLQVJELE1BUU87QUFDSDtBQUNBckYsTUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QitFLElBQXpCLENBQThCLGdCQUE5QixFQUFnREMsSUFBaEQsQ0FBcUQsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQ2pFakYsUUFBQUEsQ0FBQyxDQUFDaUYsR0FBRCxDQUFELENBQU9HLFVBQVAsQ0FBa0IsUUFBbEI7QUFDSCxPQUZEO0FBR0F0RixNQUFBQSxlQUFlLENBQUNPLHdCQUFoQixDQUF5Q3FELElBQXpDO0FBQ0E1RCxNQUFBQSxlQUFlLENBQUNRLGNBQWhCLENBQStCbUMsSUFBL0I7QUFDSDtBQUNKLEdBek9tQjs7QUEyT3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSVEsRUFBQUEseUJBaFBvQixxQ0FnUE1vQyxXQWhQTixFQWdQbUI7QUFDbkMsUUFBSUEsV0FBVyxDQUFDQyxPQUFaLENBQW9CLE9BQXBCLE1BQWlDLENBQUMsQ0FBdEMsRUFBeUM7QUFDckN4RixNQUFBQSxlQUFlLENBQUNVLE9BQWhCLENBQXdCK0UsVUFBeEIsQ0FBbUMsT0FBbkM7QUFDQSxhQUFPLEtBQVA7QUFDSDs7QUFDRCxXQUFPRixXQUFXLENBQUNHLE9BQVosQ0FBb0IsTUFBcEIsRUFBNEIsRUFBNUIsQ0FBUDtBQUNILEdBdFBtQjs7QUF3UHBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTVDLEVBQUFBLHFCQTdQb0IsaUNBNlBFeUMsV0E3UEYsRUE2UGU7QUFDL0IsUUFBSUEsV0FBVyxDQUFDQyxPQUFaLENBQW9CLFVBQXBCLE1BQW9DLENBQUMsQ0FBekMsRUFBNEM7QUFDeEN4RixNQUFBQSxlQUFlLENBQUNXLE9BQWhCLENBQXdCOEUsVUFBeEIsQ0FBbUMsT0FBbkM7QUFDQSxhQUFPLEtBQVA7QUFDSDs7QUFDRCxXQUFPRixXQUFXLENBQUNHLE9BQVosQ0FBb0IsTUFBcEIsRUFBNEIsRUFBNUIsQ0FBUDtBQUNILEdBblFtQjs7QUFxUXBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lYLEVBQUFBLGVBelFvQiwyQkF5UUpZLE9BelFJLEVBeVFLO0FBQ3JCLFFBQU1DLFdBQVcsR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVdILE9BQVgsQ0FBcEI7O0FBQ0EsUUFBSUMsV0FBVyxDQUFDLGFBQUQsQ0FBWCxLQUErQmhCLFNBQW5DLEVBQThDO0FBQzFDO0FBQ0g7O0FBQ0QxRSxJQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQjZGLElBQXRCLENBQTJCSCxXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCdkUsV0FBdEQ7QUFDQW5CLElBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0I2RixJQUFsQixDQUF1QkgsV0FBVyxDQUFDLGFBQUQsQ0FBWCxDQUEyQjlELE9BQWxEO0FBQ0E1QixJQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCNkYsSUFBaEIsQ0FBcUJILFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkJoRSxLQUFoRDtBQUNBMUIsSUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjNkYsSUFBZCxDQUFtQkgsV0FBVyxDQUFDLGFBQUQsQ0FBWCxDQUEyQkksR0FBOUM7QUFDQSxRQUFJQyxRQUFRLEdBQUdMLFdBQVcsQ0FBQ00sT0FBM0I7O0FBQ0EsUUFBSSxDQUFDQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0gsUUFBZCxDQUFMLEVBQThCO0FBQzFCQSxNQUFBQSxRQUFRLEdBQUcsRUFBWDtBQUNBQSxNQUFBQSxRQUFRLENBQUNJLElBQVQsQ0FBY1QsV0FBVyxDQUFDTSxPQUExQjtBQUNIOztBQUNEaEcsSUFBQUEsQ0FBQyxDQUFDK0UsSUFBRixDQUFPZ0IsUUFBUCxFQUFpQixVQUFDSyxHQUFELEVBQU1DLFlBQU4sRUFBdUI7QUFDcEMsVUFBSUEsWUFBWSxLQUFLM0IsU0FBckIsRUFBZ0M7QUFDNUI7QUFDSDs7QUFDRCxVQUFJNEIsR0FBRyxHQUFHLFVBQVY7QUFDQSxVQUFJTixPQUFPLEdBQUdLLFlBQWQ7O0FBQ0EsVUFBSUwsT0FBTyxDQUFDLGFBQUQsQ0FBUCxLQUEyQnRCLFNBQS9CLEVBQTBDO0FBQ3RDc0IsUUFBQUEsT0FBTyxHQUFHSyxZQUFZLENBQUMsYUFBRCxDQUF0QjtBQUNIOztBQUNELFVBQU1FLFdBQVcsR0FBRyxJQUFJQyxJQUFKLENBQVNSLE9BQU8sQ0FBQ1MsT0FBUixDQUFnQmpCLE9BQWhCLENBQXdCLHlCQUF4QixFQUFtRCxVQUFuRCxDQUFULENBQXBCO0FBQ0EsVUFBTWtCLE9BQU8sR0FBRyxJQUFJRixJQUFKLEVBQWhCOztBQUNBLFVBQUlFLE9BQU8sR0FBR0gsV0FBZCxFQUEyQjtBQUN2QkQsUUFBQUEsR0FBRyxpREFBd0NOLE9BQU8sQ0FBQ1csSUFBaEQsa0NBQ05uRixlQUFlLENBQUNvRixXQURWLGFBQUg7QUFFSCxPQUhELE1BR08sSUFBSVosT0FBTyxDQUFDUyxPQUFSLENBQWdCbEUsTUFBaEIsS0FBMkIsQ0FBM0IsSUFBZ0N5RCxPQUFPLENBQUNhLEtBQVIsS0FBa0IsR0FBdEQsRUFBMkQ7QUFDOURQLFFBQUFBLEdBQUcsaURBQXdDTixPQUFPLENBQUNXLElBQWhELGtDQUNObkYsZUFBZSxDQUFDb0YsV0FEVixhQUFIO0FBRUgsT0FITSxNQUdBO0FBQ0hOLFFBQUFBLEdBQUcsaURBQXdDTixPQUFPLENBQUNXLElBQWhELENBQUg7O0FBQ0EsWUFBSVgsT0FBTyxDQUFDUyxPQUFSLENBQWdCbEUsTUFBaEIsR0FBeUIsQ0FBN0IsRUFBZ0M7QUFDNUIsY0FBSXVFLFdBQVcsR0FBR3RGLGVBQWUsQ0FBQ3VGLGdCQUFsQztBQUNBRCxVQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQ3RCLE9BQVosQ0FBb0IsV0FBcEIsRUFBaUNRLE9BQU8sQ0FBQ1MsT0FBekMsQ0FBZDtBQUNBSCxVQUFBQSxHQUFHLHlCQUFrQlEsV0FBbEIsYUFBSDtBQUNIOztBQUNEUixRQUFBQSxHQUFHLElBQUksNkJBQVA7QUFDQXRHLFFBQUFBLENBQUMsQ0FBQytFLElBQUYsQ0FBT3NCLFlBQVksQ0FBQ1csT0FBcEIsRUFBNkIsVUFBQ2hDLEtBQUQsRUFBUWlDLFlBQVIsRUFBeUI7QUFDbEQsY0FBSUMsV0FBVyxHQUFHMUYsZUFBZSxDQUFDMkYsZUFBbEM7QUFDQSxjQUFJSCxPQUFPLEdBQUdDLFlBQWQ7O0FBQ0EsY0FBSUEsWUFBWSxDQUFDLGFBQUQsQ0FBWixLQUFnQ3ZDLFNBQXBDLEVBQStDO0FBQzNDc0MsWUFBQUEsT0FBTyxHQUFHQyxZQUFZLENBQUMsYUFBRCxDQUF0QjtBQUNIOztBQUNEQyxVQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQzFCLE9BQVosQ0FBb0IsUUFBcEIsRUFBOEJ3QixPQUFPLENBQUNMLElBQXRDLENBQWQ7QUFDQU8sVUFBQUEsV0FBVyxHQUFHQSxXQUFXLENBQUMxQixPQUFaLENBQW9CLFNBQXBCLEVBQStCd0IsT0FBTyxDQUFDSSxLQUF2QyxDQUFkO0FBQ0FGLFVBQUFBLFdBQVcsR0FBR0EsV0FBVyxDQUFDMUIsT0FBWixDQUFvQixhQUFwQixFQUFtQ3dCLE9BQU8sQ0FBQ0ssU0FBM0MsQ0FBZDtBQUNBSCxVQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQzFCLE9BQVosQ0FBb0IsWUFBcEIsRUFBa0N3QixPQUFPLENBQUNNLFFBQTFDLENBQWQ7QUFDQWhCLFVBQUFBLEdBQUcsY0FBT1ksV0FBUCxTQUFIO0FBQ0gsU0FYRDtBQVlBWixRQUFBQSxHQUFHLElBQUksU0FBUDtBQUNIOztBQUNEQSxNQUFBQSxHQUFHLElBQUksa0JBQVA7QUFDQXRHLE1BQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCdUgsTUFBM0IsQ0FBa0NqQixHQUFsQztBQUNILEtBekNEO0FBMENILEdBalVtQjs7QUFtVXBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWtCLEVBQUFBLHFCQXhVb0IsaUNBd1VFdkQsUUF4VUYsRUF3VVl3RCxPQXhVWixFQXdVcUI7QUFDckMsUUFBSUEsT0FBTyxLQUFLLElBQWhCLEVBQXNCO0FBQ2xCLFVBQUksT0FBT3hELFFBQVEsQ0FBQ3lELElBQVQsQ0FBY0MsVUFBckIsS0FBb0MsV0FBeEMsRUFBcUQ7QUFDakRDLFFBQUFBLGdCQUFnQixHQUFHM0QsUUFBUSxDQUFDeUQsSUFBVCxDQUFjQyxVQUFqQztBQUNBN0gsUUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QjhILElBQXpCLENBQThCLFdBQTlCLEVBQTJDLFFBQTNDLEVBQXFENUQsUUFBUSxDQUFDeUQsSUFBVCxDQUFjQyxVQUFuRTtBQUNIOztBQUNEM0gsTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkJ5RCxJQUEzQixDQUFnQyxFQUFoQztBQUVBM0QsTUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QjhILElBQXpCLENBQThCLFdBQTlCLEVBQTJDLFFBQTNDLEVBQXFELEVBQXJEO0FBRUEvSCxNQUFBQSxlQUFlLENBQUNzQyxVQUFoQjs7QUFDQSxVQUFJNkIsUUFBUSxDQUFDUSxRQUFULENBQWtCbEMsTUFBbEIsS0FBNkIsQ0FBakMsRUFBb0M7QUFDaEN1RixRQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEI5RCxRQUFRLENBQUNRLFFBQXJDO0FBQ0g7QUFDSixLQWJELE1BYU8sSUFBSVIsUUFBUSxDQUFDUSxRQUFULEtBQXNCQyxTQUExQixFQUFxQztBQUN4Q29ELE1BQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QjlELFFBQVEsQ0FBQ1EsUUFBckM7QUFDSCxLQUZNLE1BRUE7QUFDSHFELE1BQUFBLFdBQVcsQ0FBQ0UsU0FBWixDQUFzQnhHLGVBQWUsQ0FBQ3lHLDhCQUF0QztBQUNILEtBbEJvQyxDQW9CckM7QUFDQTs7O0FBQ0FuSSxJQUFBQSxlQUFlLENBQUNHLFlBQWhCLENBQTZCaUQsR0FBN0IsQ0FBaUNnRixJQUFJLENBQUNDLE1BQUwsRUFBakM7QUFDQXJJLElBQUFBLGVBQWUsQ0FBQ0csWUFBaEIsQ0FBNkJtSSxPQUE3QixDQUFxQyxRQUFyQztBQUNILEdBaFdtQjs7QUFrV3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBdldvQiw0QkF1V0hDLFFBdldHLEVBdVdPO0FBQ3ZCLFdBQU9BLFFBQVA7QUFDSCxHQXpXbUI7O0FBMldwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQS9Xb0IsMkJBK1dKdEUsUUEvV0ksRUErV007QUFDdEIsUUFBTXVFLFFBQVEsR0FBRzFJLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUI4SCxJQUF6QixDQUE4QixZQUE5QixDQUFqQjtBQUNBeEUsSUFBQUEsTUFBTSxDQUFDb0YseUJBQVAsQ0FBaUNELFFBQWpDLEVBQTJDMUksZUFBZSxDQUFDMEgscUJBQTNEO0FBQ0gsR0FsWG1COztBQW9YcEI7QUFDSjtBQUNBO0FBQ0loRSxFQUFBQSxjQXZYb0IsNEJBdVhIO0FBQ2JrRixJQUFBQSxJQUFJLENBQUMzSSxRQUFMLEdBQWdCRCxlQUFlLENBQUNDLFFBQWhDO0FBQ0EySSxJQUFBQSxJQUFJLENBQUNDLEdBQUwsYUFBY0MsYUFBZCxvQkFGYSxDQUVnQzs7QUFDN0NGLElBQUFBLElBQUksQ0FBQ3hILGFBQUwsR0FBcUJwQixlQUFlLENBQUNvQixhQUFyQyxDQUhhLENBR3VDOztBQUNwRHdILElBQUFBLElBQUksQ0FBQ0wsZ0JBQUwsR0FBd0J2SSxlQUFlLENBQUN1SSxnQkFBeEMsQ0FKYSxDQUk2Qzs7QUFDMURLLElBQUFBLElBQUksQ0FBQ0gsZUFBTCxHQUF1QnpJLGVBQWUsQ0FBQ3lJLGVBQXZDLENBTGEsQ0FLMkM7O0FBQ3hERyxJQUFBQSxJQUFJLENBQUN0RyxVQUFMO0FBQ0g7QUE5WG1CLENBQXhCO0FBaVlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FwQyxDQUFDLENBQUM2SSxFQUFGLENBQUtoQixJQUFMLENBQVVTLFFBQVYsQ0FBbUJqSCxLQUFuQixDQUF5QnlILDJCQUF6QixHQUF1RCxVQUFVQyxLQUFWLEVBQWlCO0FBQ3BFLFNBQVFqSixlQUFlLENBQUNVLE9BQWhCLENBQXdCMEMsR0FBeEIsR0FBOEJYLE1BQTlCLEtBQXlDLEVBQXpDLElBQStDd0csS0FBSyxDQUFDeEcsTUFBTixHQUFlLENBQXRFO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7O0FBQ0F2QyxDQUFDLENBQUNnSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbkosRUFBQUEsZUFBZSxDQUFDc0MsVUFBaEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFBCWExpY2Vuc2UqL1xuXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBtb2R1bGVzIGxpY2Vuc2Uga2V5XG4gKlxuICogQG1vZHVsZSBsaWNlbnNpbmdNb2RpZnlcbiAqL1xuY29uc3QgbGljZW5zaW5nTW9kaWZ5ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIERpcnR5IGNoZWNrIGZpZWxkLCBmb3IgY2hlY2tpbmcgaWYgc29tZXRoaW5nIG9uIHRoZSBmb3JtIHdhcyBjaGFuZ2VkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6ICQoJyNkaXJydHknKSxcblxuICAgICRnb1RvTGljZW5zZU1hbmFnZW1lbnRCVE46ICQoJyNjaGFuZ2VQYWdlVG9MaWNlbnNpbmcnKSxcbiAgICAkZW1wdHlMaWNlbnNlS2V5SW5mbzogJCgnI2VtcHR5LWxpY2Vuc2Uta2V5LWluZm8nKSxcbiAgICAkZmlsbGVkTGljZW5zZUtleUluZm86ICQoJyNmaWxsZWQtbGljZW5zZS1rZXktaW5mbycpLFxuICAgICRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbjogJCgnI2dldE5ld0tleUxpY2Vuc2VTZWN0aW9uJyksXG4gICAgJGNvdXBvblNlY3Rpb246ICQoJyNjb3Vwb25TZWN0aW9uJyksXG4gICAgJGZvcm1FcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuICAgICRsaWNLZXk6ICQoJyNsaWNLZXknKSxcbiAgICAkY291cG9uOiAkKCcjY291cG9uJyksXG4gICAgJGVtYWlsOiAkKCcjZW1haWwnKSxcbiAgICAkYWpheE1lc3NhZ2VzOiAkKCcudWkubWVzc2FnZS5hamF4JyksXG4gICAgJGxpY2Vuc2VEZXRhaWxJbmZvOiAkKCcjbGljZW5zZURldGFpbEluZm8nKSxcbiAgICAkcmVzZXRCdXR0b246ICQoJyNyZXNldC1saWNlbnNlJyksXG4gICAgJHByb2R1Y3REZXRhaWxzOiAkKCcjcHJvZHVjdERldGFpbHMnKSxcbiAgICAkbGljZW5zaW5nTWVudTogJCgnI2xpY2Vuc2luZy1tZW51IC5pdGVtJyksXG4gICAgJGFjY29yZGlvbnM6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0gLnVpLmFjY29yZGlvbicpLFxuICAgIGRlZmF1bHRMaWNlbnNlS2V5OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGNvbXBhbnluYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb250YWN0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29udGFjdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBsaWNLZXk6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdsaWNLZXknLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY291cG9uOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAnbGljS2V5JyxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSBsaWNlbnNpbmcgcGFnZS5cbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxpY2Vuc2Uga2V5IGluZm8gaXMgZmlsbGVkXG4gICAgICAgIGlmIChsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNpbmdNZW51LnRhYignY2hhbmdlIHRhYicsICdtYW5hZ2VtZW50Jyk7XG4gICAgICAgICAgICAvLyBObyBpbnRlcm5ldCBjb25uZWN0aW9uLiBGb3JtIGlzIG5vdCByZW5kZXJlZC5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGNvdXBvbiBjb2RlIGZpZWxkXG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uQ291cG9uQmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBsaWNlbnNlIGtleSBmaWVsZFxuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS5pbnB1dG1hc2soJ01JS08tKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIG9uaW5jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBjbGVhckluY29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleSA9IGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpO1xuXG4gICAgICAgIC8vIEhhbmRsZSByZXNldCBidXR0b24gY2xpY2tcbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRyZXNldEJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlUmVzZXRMaWNlbnNlS2V5KGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyUmVzZXRMaWNlbnNlS2V5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKTtcblxuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBhIGxpY2Vuc2Uga2V5IGlzIHByZXNlbnRcbiAgICAgICAgaWYgKGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleS5sZW5ndGggPT09IDI4KSB7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvXG4gICAgICAgICAgICAgICAgLmh0bWwoYCR7bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5fSA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPmApXG4gICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMobGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyk7XG4gICAgICAgICAgICBQYnhBcGkuTGljZW5zZUdldExpY2Vuc2VJbmZvKGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyR2V0TGljZW5zZUluZm8pO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN3aXRjaCB0byB0aGUgbWFuYWdlbWVudCB0YWIgaWYgYSBsaWNlbnNlIGtleSBpcyBwcmVzZW50XG4gICAgICAgIGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgIT09ICcnKSB7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKCdjaGFuZ2UgdGFiJywgJ21hbmFnZW1lbnQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBcIkdvIHRvIExpY2Vuc2UgTWFuYWdlbWVudFwiIGJ1dHRvbiBjbGlja1xuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGdvVG9MaWNlbnNlTWFuYWdlbWVudEJUTi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNpbmdNZW51LnRhYignY2hhbmdlIHRhYicsICdtYW5hZ2VtZW50Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXNldHRpbmcgdGhlIGxpY2Vuc2Uga2V5LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgbGljZW5zZSBrZXkgcmVzZXQuXG4gICAgICovXG4gICAgY2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgYW5kIGRpc2FibGVkIGNsYXNzZXMgZnJvbSB0aGUgZm9ybVxuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAocmVzcG9uc2UgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgaXMgbm90IGZhbHNlLCBpbmRpY2F0aW5nIGEgc3VjY2Vzc2Z1bCBsaWNlbnNlIGtleSByZXNldCxcbiAgICAgICAgICAgIC8vIHJlbG9hZCB0aGUgd2luZG93IHRvIGFwcGx5IHRoZSBjaGFuZ2VzXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIGdldHRpbmcgdGhlIE1pa29QQlggZmVhdHVyZSBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgTWlrb1BCWCBmZWF0dXJlIHN0YXR1cy5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBsb2FkaW5nIHNwaW5uZXIgYW5kIGFueSBwcmV2aW91cyBBSkFYIG1lc3NhZ2VzXG4gICAgICAgICQoJy5zcGlubmVyLmxvYWRpbmcuaWNvbicpLnJlbW92ZSgpO1xuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGFqYXhNZXNzYWdlcy5yZW1vdmUoKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzIGlzIHRydWUgKHZhbGlkKVxuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdzdWNjZXNzJyk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgc3VjY2VzcyBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImNoZWNrIGdyZWVuIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlS2V5VmFsaWR9PC9kaXY+YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzIGlzIGZhbHNlIG9yIGFuIGVycm9yIG9jY3VycmVkXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2Vycm9yJykucmVtb3ZlQ2xhc3MoJ3N1Y2Nlc3MnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgcmVzcG9uc2UubWVzc2FnZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIEZhaWxlZCB0byBjaGVjayBsaWNlbnNlIHN0YXR1cyAocmVzcG9uc2UgaXMgZmFsc2Ugb3Igbm8gbWVzc2FnZXMgYXZhaWxhYmxlKVxuICAgICAgICAgICAgICAgICQoJyNsaWNGYWlsSW5mbycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgaWQ9XCJsaWNGYWlsSW5mb1wiIGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSByZWQgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGljX0ZhaWxlZENoZWNrTGljZW5zZU5vdFBieFJlc3BvbnNlfTwvZGl2PmApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWlsZWQgdG8gY2hlY2sgbGljZW5zZSBzdGF0dXMgd2l0aCBlcnJvciBtZXNzYWdlc1xuICAgICAgICAgICAgICAgICQoJyNsaWNGYWlsSW5mb01zZycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgaWQ9XCJsaWNGYWlsSW5mb01zZ1wiIGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSByZWQgaWNvblwiPjwvaT4gJHtyZXNwb25zZS5tZXNzYWdlc308L2Rpdj5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TGljZW5zZUluZm8ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmxpY2Vuc2VJbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuc2hvd0xpY2Vuc2VJbmZvKHJlc3BvbnNlLmxpY2Vuc2VJbmZvKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgd2hlbiB0aGVyZSBpcyBhIGNoYW5nZSBpbiB0aGUgbGljZW5zZSBrZXkgaW5wdXQuXG4gICAgICovXG4gICAgY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpIHtcbiAgICAgICAgY29uc3QgbGljS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG4gICAgICAgIGlmIChsaWNLZXkubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBrZXkgaXMgY29tcGxldGVcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kY291cG9uU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1FcnJvck1lc3NhZ2VzLmVtcHR5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBpbmNvbXBsZXRlXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLnJlbW92ZUF0dHIoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kY291cG9uU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgbGljZW5zZSBrZXkgZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS08tJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBiZWZvcmUgcGFzdGluZyBhIHZhbHVlIGludG8gdGhlIGNvdXBvbiBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgdmFsdWUgYmVpbmcgcGFzdGVkIGludG8gdGhlIGZpZWxkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufHN0cmluZ30gLSBSZXR1cm5zIGZhbHNlIGlmIHRoZSBwYXN0ZWQgdmFsdWUgZG9lcyBub3QgY29udGFpbiAnTUlLT1VQRC0nLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgcGFzdGVkIHZhbHVlIHdpdGggd2hpdGVzcGFjZSByZW1vdmVkLlxuICAgICAqL1xuICAgIGNiT25Db3Vwb25CZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICBpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLT1VQRC0nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kY291cG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBUaGUgbGljZW5zZSBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgICAqL1xuICAgIHNob3dMaWNlbnNlSW5mbyhtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGxpY2Vuc2VEYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgICAgICAgaWYgKGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkKCcja2V5LWNvbXBhbnluYW1lJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb21wYW55bmFtZSk7XG4gICAgICAgICQoJyNrZXktY29udGFjdCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29udGFjdCk7XG4gICAgICAgICQoJyNrZXktZW1haWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmVtYWlsKTtcbiAgICAgICAgJCgnI2tleS10ZWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLnRlbCk7XG4gICAgICAgIGxldCBwcm9kdWN0cyA9IGxpY2Vuc2VEYXRhLnByb2R1Y3Q7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcm9kdWN0cykpIHtcbiAgICAgICAgICAgIHByb2R1Y3RzID0gW107XG4gICAgICAgICAgICBwcm9kdWN0cy5wdXNoKGxpY2Vuc2VEYXRhLnByb2R1Y3QpO1xuICAgICAgICB9XG4gICAgICAgICQuZWFjaChwcm9kdWN0cywgKGtleSwgcHJvZHVjdFZhbHVlKSA9PiB7XG4gICAgICAgICAgICBpZiAocHJvZHVjdFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgcm93ID0gJzx0cj48dGQ+JztcbiAgICAgICAgICAgIGxldCBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlO1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHByb2R1Y3QgPSBwcm9kdWN0VmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkYXRlRXhwaXJlZCA9IG5ldyBEYXRlKHByb2R1Y3QuZXhwaXJlZC5yZXBsYWNlKC8oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KS8sICckMS8kMi8kMycpKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVOb3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgaWYgKGRhdGVOb3cgPiBkYXRlRXhwaXJlZCkge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPT09IDAgJiYgcHJvZHVjdC50cmlhbCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPiR7cHJvZHVjdC5uYW1lfWA7XG4gICAgICAgICAgICAgICAgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBleHBpcmVkVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZEFmdGVyO1xuICAgICAgICAgICAgICAgICAgICBleHBpcmVkVGV4dCA9IGV4cGlyZWRUZXh0LnJlcGxhY2UoJyVleHBpcmVkJScsIHByb2R1Y3QuZXhwaXJlZCk7XG4gICAgICAgICAgICAgICAgICAgIHJvdyArPSBgPGJyPjxzbWFsbD4ke2V4cGlyZWRUZXh0fTwvc21hbGw+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPic7XG4gICAgICAgICAgICAgICAgJC5lYWNoKHByb2R1Y3RWYWx1ZS5mZWF0dXJlLCAoaW5kZXgsIGZlYXR1cmVWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZUluZm8gPSBnbG9iYWxUcmFuc2xhdGUubGljX0ZlYXR1cmVJbmZvO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJW5hbWUlJywgZmVhdHVyZS5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnQlJywgZmVhdHVyZS5jb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50ZWFjaCUnLCBmZWF0dXJlLmNvdW50ZWFjaCk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNhcHR1cmVkJScsIGZlYXR1cmUuY2FwdHVyZWQpO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcm93ICs9ICc8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdyArPSAnPC9kaXY+PC90ZD48L3RyPic7XG4gICAgICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5hcHBlbmQocm93KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFmdGVyIHVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuICAgICAqIEBwYXJhbSByZXNwb25zZVxuICAgICAqIEBwYXJhbSBzdWNjZXNzXG4gICAgICovXG4gICAgY2JBZnRlckZvcm1Qcm9jZXNzaW5nKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG4gICAgICAgIGlmIChzdWNjZXNzID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBnbG9iYWxQQlhMaWNlbnNlID0gcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlO1xuICAgICAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbGljS2V5JywgcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmh0bWwoJycpO1xuXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2NvdXBvbicsICcnKTtcblxuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmxpY19HZXRUcmlhbEVycm9yQ2hlY2tJbnRlcm5ldCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGFuZ2UgdGhlIHZhbHVlIG9mICckZGlycnR5RmllbGQnIHRvIHRyaWdnZXJcbiAgICAgICAgLy8gdGhlICdjaGFuZ2UnIGZvcm0gZXZlbnQgYW5kIGVuYWJsZSBzdWJtaXQgYnV0dG9uLlxuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGRpcnJ0eUZpZWxkLnZhbChNYXRoLnJhbmRvbSgpKTtcbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRkaXJydHlGaWVsZC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFBieEFwaS5MaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckZvcm1Qcm9jZXNzaW5nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGxpY2Vuc2luZ01vZGlmeS52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbGljZW5zaW5nTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBsaWNlbnNpbmdNb2RpZnkuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSB0byBjaGVjayBpZiBhIGZpZWxkIGlzIGVtcHR5IG9ubHkgaWYgdGhlIGxpY2Vuc2Uga2V5IGZpZWxkIGlzIG5vdCBlbXB0eS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmllbGQgYmVpbmcgdmFsaWRhdGVkLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgZmllbGQgaXMgbm90IGVtcHR5IG9yIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBlbXB0eSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIChsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKS5sZW5ndGggPT09IDI4IHx8IHZhbHVlLmxlbmd0aCA+IDApO1xufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBsaWNlbnNpbmcgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGxpY2Vuc2luZ01vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19