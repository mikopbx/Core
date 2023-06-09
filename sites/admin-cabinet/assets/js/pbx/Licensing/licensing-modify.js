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
    licensingModify.$ajaxMessages.remove();

    if (response === true) {
      // MikoPBX feature status is true (valid)
      licensingModify.$formObj.removeClass('error').addClass('success');
      licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui success message ajax\"><i class=\"check green icon\"></i> ".concat(globalTranslate.lic_LicenseKeyValid, "</div>"));
      licensingModify.$filledLicenseKeyHeader.show();
    } else {
      // MikoPBX feature status is false or an error occurred
      licensingModify.$formObj.addClass('error').removeClass('success');

      if (response === false || response.messages === undefined) {
        // Failed to check license status (response is false or no messages available)
        $('#licFailInfo').remove();
        licensingModify.$filledLicenseKeyInfo.after("<div id=\"licFailInfo\" class=\"ui error message ajax\"><i class=\"exclamation triangle red icon\"></i> ".concat(globalTranslate.lic_FailedCheckLicenseNotPbxResponse, "</div>"));
        licensingModify.$filledLicenseKeyHeader.show();
      } else {
        // Failed to check license status with error messages
        $('#licFailInfoMsg').remove();
        licensingModify.$filledLicenseKeyInfo.after("<div id=\"licFailInfoMsg\" class=\"ui error message ajax\"><i class=\"exclamation triangle red icon\"></i> ".concat(response.messages, "</div>"));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJsaWNlbnNpbmdNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyIiwiJGZpbGxlZExpY2Vuc2VLZXlJbmZvIiwiJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uIiwiJGNvdXBvblNlY3Rpb24iLCIkZm9ybUVycm9yTWVzc2FnZXMiLCIkbGljS2V5IiwiJGNvdXBvbiIsIiRlbWFpbCIsIiRhamF4TWVzc2FnZXMiLCIkbGljZW5zZURldGFpbEluZm8iLCIkcmVzZXRCdXR0b24iLCIkcHJvZHVjdERldGFpbHMiLCIkYWNjb3JkaW9ucyIsImRlZmF1bHRMaWNlbnNlS2V5IiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHkiLCJlbWFpbCIsImxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCIsImNvbnRhY3QiLCJsaWNfVmFsaWRhdGVDb250YWN0TmFtZSIsImxpY0tleSIsIm9wdGlvbmFsIiwibGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5IiwiY291cG9uIiwiZGVwZW5kcyIsImxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5IiwiaW5pdGlhbGl6ZSIsImFjY29yZGlvbiIsImhpZGUiLCJpbnB1dG1hc2siLCJvbkJlZm9yZVBhc3RlIiwiY2JPbkNvdXBvbkJlZm9yZVBhc3RlIiwib25jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UiLCJvbmluY29tcGxldGUiLCJjbGVhckluY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlIiwidmFsIiwib24iLCJhZGRDbGFzcyIsIlBieEFwaSIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJjYkFmdGVyUmVzZXRMaWNlbnNlS2V5IiwiaW5pdGlhbGl6ZUZvcm0iLCJsZW5ndGgiLCJodG1sIiwic2hvdyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsImFmdGVyIiwibGljX0xpY2Vuc2VLZXlWYWxpZCIsIm1lc3NhZ2VzIiwidW5kZWZpbmVkIiwibGljX0ZhaWxlZENoZWNrTGljZW5zZU5vdFBieFJlc3BvbnNlIiwibGljZW5zZUluZm8iLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiYXR0ciIsImVtcHR5IiwicmVtb3ZlQXR0ciIsInBhc3RlZFZhbHVlIiwiaW5kZXhPZiIsInRyYW5zaXRpb24iLCJyZXBsYWNlIiwibWVzc2FnZSIsImxpY2Vuc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwidGV4dCIsInRlbCIsInByb2R1Y3RzIiwicHJvZHVjdCIsIkFycmF5IiwiaXNBcnJheSIsInB1c2giLCJrZXkiLCJwcm9kdWN0VmFsdWUiLCJyb3ciLCJkYXRlRXhwaXJlZCIsIkRhdGUiLCJleHBpcmVkIiwiZGF0ZU5vdyIsIm5hbWUiLCJsaWNfRXhwaXJlZCIsInRyaWFsIiwiZXhwaXJlZFRleHQiLCJsaWNfRXhwaXJlZEFmdGVyIiwiZmVhdHVyZSIsImZlYXR1cmVWYWx1ZSIsImZlYXR1cmVJbmZvIiwibGljX0ZlYXR1cmVJbmZvIiwiY291bnQiLCJjb3VudGVhY2giLCJjYXB0dXJlZCIsImFwcGVuZCIsImNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyIsInN1Y2Nlc3MiLCJkYXRhIiwiUEJYTGljZW5zZSIsImdsb2JhbFBCWExpY2Vuc2UiLCJmb3JtIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzaG93RXJyb3IiLCJsaWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JtRGF0YSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZm4iLCJjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkiLCJ2YWx1ZSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZUFBZSxHQUFHO0FBQ3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHdCQUFELENBTFM7QUFPcEJDLEVBQUFBLG9CQUFvQixFQUFFRCxDQUFDLENBQUMseUJBQUQsQ0FQSDtBQVFwQkUsRUFBQUEsdUJBQXVCLEVBQUVGLENBQUMsQ0FBQyw0QkFBRCxDQVJOO0FBU3BCRyxFQUFBQSxxQkFBcUIsRUFBRUgsQ0FBQyxDQUFDLDBCQUFELENBVEo7QUFVcEJJLEVBQUFBLHdCQUF3QixFQUFFSixDQUFDLENBQUMsMEJBQUQsQ0FWUDtBQVdwQkssRUFBQUEsY0FBYyxFQUFFTCxDQUFDLENBQUMsZ0JBQUQsQ0FYRztBQVlwQk0sRUFBQUEsa0JBQWtCLEVBQUVOLENBQUMsQ0FBQyxzQkFBRCxDQVpEO0FBYXBCTyxFQUFBQSxPQUFPLEVBQUVQLENBQUMsQ0FBQyxTQUFELENBYlU7QUFjcEJRLEVBQUFBLE9BQU8sRUFBRVIsQ0FBQyxDQUFDLFNBQUQsQ0FkVTtBQWVwQlMsRUFBQUEsTUFBTSxFQUFFVCxDQUFDLENBQUMsUUFBRCxDQWZXO0FBZ0JwQlUsRUFBQUEsYUFBYSxFQUFF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WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUEJYTGljZW5zZSovXG5cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1vZHVsZXMgbGljZW5zZSBrZXlcbiAqXG4gKiBAbW9kdWxlIGxpY2Vuc2luZ01vZGlmeVxuICovXG5jb25zdCBsaWNlbnNpbmdNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybScpLFxuXG4gICAgJGVtcHR5TGljZW5zZUtleUluZm86ICQoJy5lbXB0eS1saWNlbnNlLWtleS1pbmZvJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXI6ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaGVhZGVyJyksXG4gICAgJGZpbGxlZExpY2Vuc2VLZXlJbmZvOiAkKCcuZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8nKSxcbiAgICAkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb246ICQoJyNnZXROZXdLZXlMaWNlbnNlU2VjdGlvbicpLFxuICAgICRjb3Vwb25TZWN0aW9uOiAkKCcjY291cG9uU2VjdGlvbicpLFxuICAgICRmb3JtRXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcbiAgICAkbGljS2V5OiAkKCcjbGljS2V5JyksXG4gICAgJGNvdXBvbjogJCgnI2NvdXBvbicpLFxuICAgICRlbWFpbDogJCgnI2VtYWlsJyksXG4gICAgJGFqYXhNZXNzYWdlczogJCgnLnVpLm1lc3NhZ2UuYWpheCcpLFxuICAgICRsaWNlbnNlRGV0YWlsSW5mbzogJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyksXG4gICAgJHJlc2V0QnV0dG9uOiAkKCcjcmVzZXQtbGljZW5zZScpLFxuICAgICRwcm9kdWN0RGV0YWlsczogJCgnI3Byb2R1Y3REZXRhaWxzJyksXG4gICAgJGFjY29yZGlvbnM6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0gLnVpLmFjY29yZGlvbicpLFxuICAgIGRlZmF1bHRMaWNlbnNlS2V5OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGNvbXBhbnluYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2VtYWlsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb250YWN0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY29udGFjdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBsaWNLZXk6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdsaWNLZXknLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY291cG9uOiB7XG4gICAgICAgICAgICBkZXBlbmRzOiAnbGljS2V5JyxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSBsaWNlbnNpbmcgcGFnZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBjb3Vwb24gY29kZSBmaWVsZFxuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGNvdXBvbi5pbnB1dG1hc2soJ01JS09VUEQtKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkNvdXBvbkJlZm9yZVBhc3RlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgaW5wdXQgbWFzayBmb3IgbGljZW5zZSBrZXkgZmllbGRcbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuICAgICAgICAgICAgb25jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBvbmluY29tcGxldGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuICAgICAgICAgICAgY2xlYXJJbmNvbXBsZXRlOiB0cnVlLFxuICAgICAgICAgICAgb25CZWZvcmVQYXN0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcpO1xuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcblxuICAgICAgICAvLyBIYW5kbGUgcmVzZXQgYnV0dG9uIGNsaWNrXG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kcmVzZXRCdXR0b24ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBQYnhBcGkuTGljZW5zZVJlc2V0TGljZW5zZUtleShsaWNlbnNpbmdNb2RpZnkuY2JBZnRlclJlc2V0TGljZW5zZUtleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYSBsaWNlbnNlIGtleSBpcyBwcmVzZW50XG4gICAgICAgIGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkubGVuZ3RoID09PSAyOCkge1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mb1xuICAgICAgICAgICAgICAgIC5odG1sKGAke2xpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleX0gPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT5gKVxuICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAgUGJ4QXBpLkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKTtcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlR2V0TGljZW5zZUluZm8obGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyLmhpZGUoKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXNldHRpbmcgdGhlIGxpY2Vuc2Uga2V5LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgbGljZW5zZSBrZXkgcmVzZXQuXG4gICAgICovXG4gICAgY2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgYW5kIGRpc2FibGVkIGNsYXNzZXMgZnJvbSB0aGUgZm9ybVxuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAocmVzcG9uc2UgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgaXMgbm90IGZhbHNlLCBpbmRpY2F0aW5nIGEgc3VjY2Vzc2Z1bCBsaWNlbnNlIGtleSByZXNldCxcbiAgICAgICAgICAgIC8vIHJlbG9hZCB0aGUgd2luZG93IHRvIGFwcGx5IHRoZSBjaGFuZ2VzXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIGdldHRpbmcgdGhlIE1pa29QQlggZmVhdHVyZSBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgaW5kaWNhdGluZyB0aGUgTWlrb1BCWCBmZWF0dXJlIHN0YXR1cy5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBsb2FkaW5nIHNwaW5uZXIgYW5kIGFueSBwcmV2aW91cyBBSkFYIG1lc3NhZ2VzXG4gICAgICAgICQoJy5zcGlubmVyLmxvYWRpbmcuaWNvbicpLnJlbW92ZSgpO1xuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGFqYXhNZXNzYWdlcy5yZW1vdmUoKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzIGlzIHRydWUgKHZhbGlkKVxuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdzdWNjZXNzJyk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgc3VjY2VzcyBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImNoZWNrIGdyZWVuIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlS2V5VmFsaWR9PC9kaXY+YCk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTWlrb1BCWCBmZWF0dXJlIHN0YXR1cyBpcyBmYWxzZSBvciBhbiBlcnJvciBvY2N1cnJlZFxuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdlcnJvcicpLnJlbW92ZUNsYXNzKCdzdWNjZXNzJyk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8IHJlc3BvbnNlLm1lc3NhZ2VzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBGYWlsZWQgdG8gY2hlY2sgbGljZW5zZSBzdGF0dXMgKHJlc3BvbnNlIGlzIGZhbHNlIG9yIG5vIG1lc3NhZ2VzIGF2YWlsYWJsZSlcbiAgICAgICAgICAgICAgICAkKCcjbGljRmFpbEluZm8nKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGlkPVwibGljRmFpbEluZm9cIiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgcmVkIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxpY19GYWlsZWRDaGVja0xpY2Vuc2VOb3RQYnhSZXNwb25zZX08L2Rpdj5gKTtcbiAgICAgICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWlsZWQgdG8gY2hlY2sgbGljZW5zZSBzdGF0dXMgd2l0aCBlcnJvciBtZXNzYWdlc1xuICAgICAgICAgICAgICAgICQoJyNsaWNGYWlsSW5mb01zZycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgaWQ9XCJsaWNGYWlsSW5mb01zZ1wiIGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSByZWQgaWNvblwiPjwvaT4gJHtyZXNwb25zZS5tZXNzYWdlc308L2Rpdj5gKTtcbiAgICAgICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIHRoZSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UubGljZW5zZUluZm8gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBpbmZvcm1hdGlvbiBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS5zaG93TGljZW5zZUluZm8ocmVzcG9uc2UubGljZW5zZUluZm8pO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGluZm9ybWF0aW9uIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCB3aGVuIHRoZXJlIGlzIGEgY2hhbmdlIGluIHRoZSBsaWNlbnNlIGtleSBpbnB1dC5cbiAgICAgKi9cbiAgICBjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCkge1xuICAgICAgICBjb25zdCBsaWNLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcbiAgICAgICAgaWYgKGxpY0tleS5sZW5ndGggPT09IDI4KSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGtleSBpcyBjb21wbGV0ZVxuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgICQob2JqKS5hdHRyKCdoaWRkZW4nLCAnJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRjb3Vwb25TZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZm9ybUVycm9yTWVzc2FnZXMuZW1wdHkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGluY29tcGxldGVcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikucmVtb3ZlQXR0cignaGlkZGVuJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRjb3Vwb25TZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYmVmb3JlIHBhc3RpbmcgYSB2YWx1ZSBpbnRvIHRoZSBsaWNlbnNlIGtleSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzdGVkVmFsdWUgLSBUaGUgdmFsdWUgYmVpbmcgcGFzdGVkIGludG8gdGhlIGZpZWxkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufHN0cmluZ30gLSBSZXR1cm5zIGZhbHNlIGlmIHRoZSBwYXN0ZWQgdmFsdWUgZG9lcyBub3QgY29udGFpbiAnTUlLTy0nLCBvdGhlcndpc2UgcmV0dXJucyB0aGUgcGFzdGVkIHZhbHVlIHdpdGggd2hpdGVzcGFjZSByZW1vdmVkLlxuICAgICAqL1xuICAgIGNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgaWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS08tJykgPT09IC0xKSB7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGJlZm9yZSBwYXN0aW5nIGEgdmFsdWUgaW50byB0aGUgY291cG9uIGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPVVBELScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkNvdXBvbkJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgIGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRjb3Vwb24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgbGljZW5zZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIFRoZSBsaWNlbnNlIGluZm9ybWF0aW9uIG1lc3NhZ2UuXG4gICAgICovXG4gICAgc2hvd0xpY2Vuc2VJbmZvKG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgbGljZW5zZURhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgICBpZiAobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgICQoJyNrZXktY29tcGFueW5hbWUnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbXBhbnluYW1lKTtcbiAgICAgICAgJCgnI2tleS1jb250YWN0JykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb250YWN0KTtcbiAgICAgICAgJCgnI2tleS1lbWFpbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uZW1haWwpO1xuICAgICAgICAkKCcja2V5LXRlbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10udGVsKTtcbiAgICAgICAgbGV0IHByb2R1Y3RzID0gbGljZW5zZURhdGEucHJvZHVjdDtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHByb2R1Y3RzKSkge1xuICAgICAgICAgICAgcHJvZHVjdHMgPSBbXTtcbiAgICAgICAgICAgIHByb2R1Y3RzLnB1c2gobGljZW5zZURhdGEucHJvZHVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgJC5lYWNoKHByb2R1Y3RzLCAoa2V5LCBwcm9kdWN0VmFsdWUpID0+IHtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCByb3cgPSAnPHRyPjx0ZD4nO1xuICAgICAgICAgICAgbGV0IHByb2R1Y3QgPSBwcm9kdWN0VmFsdWU7XG4gICAgICAgICAgICBpZiAocHJvZHVjdFsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGRhdGVFeHBpcmVkID0gbmV3IERhdGUocHJvZHVjdC5leHBpcmVkLnJlcGxhY2UoLyhcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pLywgJyQxLyQyLyQzJykpO1xuICAgICAgICAgICAgY29uc3QgZGF0ZU5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBpZiAoZGF0ZU5vdyA+IGRhdGVFeHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgcm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA9PT0gMCAmJiBwcm9kdWN0LnRyaWFsID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+JHtwcm9kdWN0Lm5hbWV9YDtcbiAgICAgICAgICAgICAgICBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV4cGlyZWRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkQWZ0ZXI7XG4gICAgICAgICAgICAgICAgICAgIGV4cGlyZWRUZXh0ID0gZXhwaXJlZFRleHQucmVwbGFjZSgnJWV4cGlyZWQlJywgcHJvZHVjdC5leHBpcmVkKTtcbiAgICAgICAgICAgICAgICAgICAgcm93ICs9IGA8YnI+PHNtYWxsPiR7ZXhwaXJlZFRleHR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByb3cgKz0gJzxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JztcbiAgICAgICAgICAgICAgICAkLmVhY2gocHJvZHVjdFZhbHVlLmZlYXR1cmUsIChpbmRleCwgZmVhdHVyZVZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmZWF0dXJlSW5mbyA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRmVhdHVyZUluZm87XG4gICAgICAgICAgICAgICAgICAgIGxldCBmZWF0dXJlID0gZmVhdHVyZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmUgPSBmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclbmFtZSUnLCBmZWF0dXJlLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudCUnLCBmZWF0dXJlLmNvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnRlYWNoJScsIGZlYXR1cmUuY291bnRlYWNoKTtcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY2FwdHVyZWQlJywgZmVhdHVyZS5jYXB0dXJlZCk7XG4gICAgICAgICAgICAgICAgICAgIHJvdyArPSBgJHtmZWF0dXJlSW5mb308YnI+YDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByb3cgKz0gJzwvc3Bhbj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcm93ICs9ICc8L2Rpdj48L3RkPjwvdHI+JztcbiAgICAgICAgICAgICQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmFwcGVuZChyb3cpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWZ0ZXIgdXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG4gICAgICogQHBhcmFtIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHN1Y2Nlc3NcbiAgICAgKi9cbiAgICBjYkFmdGVyRm9ybVByb2Nlc3NpbmcocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcbiAgICAgICAgaWYgKHN1Y2Nlc3MgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YS5QQlhMaWNlbnNlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGdsb2JhbFBCWExpY2Vuc2UgPSByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2U7XG4gICAgICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdsaWNLZXknLCByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuaHRtbCgnJyk7XG5cbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnY291cG9uJywgJycpO1xuXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0dldFRyaWFsRXJyb3JDaGVja0ludGVybmV0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0gbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgUGJ4QXBpLkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyRm9ybVByb2Nlc3NpbmcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbGljZW5zaW5nTW9kaWZ5LnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBsaWNlbnNpbmdNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIHRvIGNoZWNrIGlmIGEgZmllbGQgaXMgZW1wdHkgb25seSBpZiB0aGUgbGljZW5zZSBrZXkgZmllbGQgaXMgbm90IGVtcHR5LlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBmaWVsZCBiZWluZyB2YWxpZGF0ZWQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBmaWVsZCBpcyBub3QgZW1wdHkgb3IgdGhlIGxpY2Vuc2Uga2V5IGZpZWxkIGlzIGVtcHR5LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gKGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpLmxlbmd0aCA9PT0gMjggfHwgdmFsdWUubGVuZ3RoID4gMCk7XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIGxpY2Vuc2luZyBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=