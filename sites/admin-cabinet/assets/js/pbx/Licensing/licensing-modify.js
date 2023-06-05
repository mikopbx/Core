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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJsaWNlbnNpbmdNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkZGlycnR5RmllbGQiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SGVhZGVyIiwiJGZpbGxlZExpY2Vuc2VLZXlJbmZvIiwiJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uIiwiJGNvdXBvblNlY3Rpb24iLCIkZm9ybUVycm9yTWVzc2FnZXMiLCIkbGljS2V5IiwiJGNvdXBvbiIsIiRlbWFpbCIsIiRhamF4TWVzc2FnZXMiLCIkbGljZW5zZURldGFpbEluZm8iLCIkcmVzZXRCdXR0b24iLCIkcHJvZHVjdERldGFpbHMiLCIkYWNjb3JkaW9ucyIsImRlZmF1bHRMaWNlbnNlS2V5IiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHkiLCJlbWFpbCIsImxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCIsImNvbnRhY3QiLCJsaWNfVmFsaWRhdGVDb250YWN0TmFtZSIsImxpY0tleSIsIm9wdGlvbmFsIiwibGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5IiwiY291cG9uIiwiZGVwZW5kcyIsImxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5IiwiaW5pdGlhbGl6ZSIsImFjY29yZGlvbiIsImhpZGUiLCJpbnB1dG1hc2siLCJvbkJlZm9yZVBhc3RlIiwiY2JPbkNvdXBvbkJlZm9yZVBhc3RlIiwib25jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UiLCJvbmluY29tcGxldGUiLCJjbGVhckluY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlIiwidmFsIiwib24iLCJhZGRDbGFzcyIsIlBieEFwaSIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJjYkFmdGVyUmVzZXRMaWNlbnNlS2V5IiwiaW5pdGlhbGl6ZUZvcm0iLCJsZW5ndGgiLCJodG1sIiwic2hvdyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsImFmdGVyIiwibGljX0xpY2Vuc2VLZXlWYWxpZCIsIm1lc3NhZ2VzIiwidW5kZWZpbmVkIiwibGljX0ZhaWxlZENoZWNrTGljZW5zZU5vdFBieFJlc3BvbnNlIiwibGljZW5zZUluZm8iLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiYXR0ciIsImVtcHR5IiwicmVtb3ZlQXR0ciIsInBhc3RlZFZhbHVlIiwiaW5kZXhPZiIsInRyYW5zaXRpb24iLCJyZXBsYWNlIiwibWVzc2FnZSIsImxpY2Vuc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwidGV4dCIsInRlbCIsInByb2R1Y3RzIiwicHJvZHVjdCIsIkFycmF5IiwiaXNBcnJheSIsInB1c2giLCJrZXkiLCJwcm9kdWN0VmFsdWUiLCJyb3ciLCJkYXRlRXhwaXJlZCIsIkRhdGUiLCJleHBpcmVkIiwiZGF0ZU5vdyIsIm5hbWUiLCJsaWNfRXhwaXJlZCIsInRyaWFsIiwiZXhwaXJlZFRleHQiLCJsaWNfRXhwaXJlZEFmdGVyIiwiZmVhdHVyZSIsImZlYXR1cmVWYWx1ZSIsImZlYXR1cmVJbmZvIiwibGljX0ZlYXR1cmVJbmZvIiwiY291bnQiLCJjb3VudGVhY2giLCJjYXB0dXJlZCIsImFwcGVuZCIsImNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyIsInN1Y2Nlc3MiLCJkYXRhIiwiUEJYTGljZW5zZSIsImdsb2JhbFBCWExpY2Vuc2UiLCJmb3JtIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzaG93RXJyb3IiLCJsaWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQiLCJNYXRoIiwicmFuZG9tIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvcm1EYXRhIiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZm4iLCJjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkiLCJ2YWx1ZSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZUFBZSxHQUFHO0FBQ3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHdCQUFELENBTFM7O0FBT3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRUQsQ0FBQyxDQUFDLFNBQUQsQ0FYSztBQVlwQkUsRUFBQUEsb0JBQW9CLEVBQUVGLENBQUMsQ0FBQyx5QkFBRCxDQVpIO0FBYXBCRyxFQUFBQSx1QkFBdUIsRUFBRUgsQ0FBQyxDQUFDLDRCQUFELENBYk47QUFjcEJJLEVBQUFBLHFCQUFxQixFQUFFSixDQUFDLENBQUMsMEJBQUQsQ0FkSjtBQWVwQkssRUFBQUEsd0JBQXdCLEVBQUVMLENBQUMsQ0FBQywwQkFBRCxDQWZQO0FBZ0JwQk0sRUFBQUEsY0FBYyxFQUFFTixDQUFDLENBQUMsZ0JBQUQsQ0FoQkc7QUFpQnBCTyxFQUFBQSxrQkFBa0IsRUFBRVAsQ0FBQyxDQUFDLHNCQUFELENBakJEO0FBa0JwQlEsRUFBQUEsT0FBTyxFQUFFUixDQUFDLENBQUMsU0FBRCxDQWxCVTtBQW1CcEJTLEVBQUFB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QXdCc0MsR0FBeEIsR0FBOEJPLE1BQTlCLEtBQXlDLEVBQXpDLElBQStDcUYsS0FBSyxDQUFDckYsTUFBTixHQUFlLENBQXRFO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7O0FBQ0FyRCxDQUFDLENBQUMySSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCOUksRUFBQUEsZUFBZSxDQUFDcUMsVUFBaEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFBCWExpY2Vuc2UqL1xuXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBtb2R1bGVzIGxpY2Vuc2Uga2V5XG4gKlxuICogQG1vZHVsZSBsaWNlbnNpbmdNb2RpZnlcbiAqL1xuY29uc3QgbGljZW5zaW5nTW9kaWZ5ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIERpcnR5IGNoZWNrIGZpZWxkLCBmb3IgY2hlY2tpbmcgaWYgc29tZXRoaW5nIG9uIHRoZSBmb3JtIHdhcyBjaGFuZ2VkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6ICQoJyNkaXJydHknKSxcbiAgICAkZW1wdHlMaWNlbnNlS2V5SW5mbzogJCgnLmVtcHR5LWxpY2Vuc2Uta2V5LWluZm8nKSxcbiAgICAkZmlsbGVkTGljZW5zZUtleUhlYWRlcjogJCgnLmZpbGxlZC1saWNlbnNlLWtleS1oZWFkZXInKSxcbiAgICAkZmlsbGVkTGljZW5zZUtleUluZm86ICQoJy5maWxsZWQtbGljZW5zZS1rZXktaW5mbycpLFxuICAgICRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbjogJCgnI2dldE5ld0tleUxpY2Vuc2VTZWN0aW9uJyksXG4gICAgJGNvdXBvblNlY3Rpb246ICQoJyNjb3Vwb25TZWN0aW9uJyksXG4gICAgJGZvcm1FcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuICAgICRsaWNLZXk6ICQoJyNsaWNLZXknKSxcbiAgICAkY291cG9uOiAkKCcjY291cG9uJyksXG4gICAgJGVtYWlsOiAkKCcjZW1haWwnKSxcbiAgICAkYWpheE1lc3NhZ2VzOiAkKCcudWkubWVzc2FnZS5hamF4JyksXG4gICAgJGxpY2Vuc2VEZXRhaWxJbmZvOiAkKCcjbGljZW5zZURldGFpbEluZm8nKSxcbiAgICAkcmVzZXRCdXR0b246ICQoJyNyZXNldC1saWNlbnNlJyksXG4gICAgJHByb2R1Y3REZXRhaWxzOiAkKCcjcHJvZHVjdERldGFpbHMnKSxcbiAgICAkYWNjb3JkaW9uczogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybSAudWkuYWNjb3JkaW9uJyksXG4gICAgZGVmYXVsdExpY2Vuc2VLZXk6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgY29tcGFueW5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb21wYW55bmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGVtYWlsOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZW1haWwnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0RW1haWwsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRhY3Q6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjb250YWN0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGxpY0tleToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2xpY0tleScsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMjhdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjb3Vwb246IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICdsaWNLZXknLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NvdXBvbicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhhY3RMZW5ndGhbMzFdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ291cG9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEluaXRpYWxpemUgdGhlIGxpY2Vuc2luZyBwYWdlLlxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2V0IGlucHV0IG1hc2sgZm9yIGNvdXBvbiBjb2RlIGZpZWxkXG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcbiAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uQ291cG9uQmVmb3JlUGFzdGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBpbnB1dCBtYXNrIGZvciBsaWNlbnNlIGtleSBmaWVsZFxuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS5pbnB1dG1hc2soJ01JS08tKioqKiotKioqKiotKioqKiotKioqKionLCB7XG4gICAgICAgICAgICBvbmNvbXBsZXRlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcbiAgICAgICAgICAgIG9uaW5jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG4gICAgICAgICAgICBjbGVhckluY29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleSA9IGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpO1xuXG4gICAgICAgIC8vIEhhbmRsZSByZXNldCBidXR0b24gY2xpY2tcbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRyZXNldEJ1dHRvbi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlUmVzZXRMaWNlbnNlS2V5KGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyUmVzZXRMaWNlbnNlS2V5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKTtcblxuICAgICAgICBsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBhIGxpY2Vuc2Uga2V5IGlzIHByZXNlbnRcbiAgICAgICAgaWYgKGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleS5sZW5ndGggPT09IDI4KSB7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvXG4gICAgICAgICAgICAgICAgLmh0bWwoYCR7bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5fSA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPmApXG4gICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICBQYnhBcGkuTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMpO1xuICAgICAgICAgICAgUGJ4QXBpLkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyhsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckdldExpY2Vuc2VJbmZvKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZW1wdHlMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlIZWFkZXIuaGlkZSgpO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuICAgICAgICB9XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIHJlc2V0dGluZyB0aGUgbGljZW5zZSBrZXkuXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBsaWNlbnNlIGtleSByZXNldC5cbiAgICAgKi9cbiAgICBjYkFmdGVyUmVzZXRMaWNlbnNlS2V5KHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlbW92ZSB0aGUgbG9hZGluZyBhbmQgZGlzYWJsZWQgY2xhc3NlcyBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSByZXNwb25zZSBpcyBub3QgZmFsc2UsIGluZGljYXRpbmcgYSBzdWNjZXNzZnVsIGxpY2Vuc2Uga2V5IHJlc2V0LFxuICAgICAgICAgICAgLy8gcmVsb2FkIHRoZSB3aW5kb3cgdG8gYXBwbHkgdGhlIGNoYW5nZXNcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYWZ0ZXIgZ2V0dGluZyB0aGUgTWlrb1BCWCBmZWF0dXJlIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBpbmRpY2F0aW5nIHRoZSBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGxvYWRpbmcgc3Bpbm5lciBhbmQgYW55IHByZXZpb3VzIEFKQVggbWVzc2FnZXNcbiAgICAgICAgJCgnLnNwaW5uZXIubG9hZGluZy5pY29uJykucmVtb3ZlKCk7XG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kYWpheE1lc3NhZ2VzLnJlbW92ZSgpO1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIE1pa29QQlggZmVhdHVyZSBzdGF0dXMgaXMgdHJ1ZSAodmFsaWQpXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ3N1Y2Nlc3MnKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBzdWNjZXNzIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiY2hlY2sgZ3JlZW4gaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VLZXlWYWxpZH08L2Rpdj5gKTtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBNaWtvUEJYIGZlYXR1cmUgc3RhdHVzIGlzIGZhbHNlIG9yIGFuIGVycm9yIG9jY3VycmVkXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2Vycm9yJykucmVtb3ZlQ2xhc3MoJ3N1Y2Nlc3MnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgcmVzcG9uc2UubWVzc2FnZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIEZhaWxlZCB0byBjaGVjayBsaWNlbnNlIHN0YXR1cyAocmVzcG9uc2UgaXMgZmFsc2Ugb3Igbm8gbWVzc2FnZXMgYXZhaWxhYmxlKVxuICAgICAgICAgICAgICAgICQoJyNsaWNGYWlsSW5mbycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgaWQ9XCJsaWNGYWlsSW5mb1wiIGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSByZWQgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGljX0ZhaWxlZENoZWNrTGljZW5zZU5vdFBieFJlc3BvbnNlfTwvZGl2PmApO1xuICAgICAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhaWxlZCB0byBjaGVjayBsaWNlbnNlIHN0YXR1cyB3aXRoIGVycm9yIG1lc3NhZ2VzXG4gICAgICAgICAgICAgICAgJCgnI2xpY0ZhaWxJbmZvTXNnJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5hZnRlcihgPGRpdiBpZD1cImxpY0ZhaWxJbmZvTXNnXCIgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIHJlZCBpY29uXCI+PC9pPiAke3Jlc3BvbnNlLm1lc3NhZ2VzfTwvZGl2PmApO1xuICAgICAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUhlYWRlci5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckdldExpY2Vuc2VJbmZvKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5saWNlbnNlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBMaWNlbnNlIGluZm9ybWF0aW9uIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LnNob3dMaWNlbnNlSW5mbyhyZXNwb25zZS5saWNlbnNlSW5mbyk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2UgaW5mb3JtYXRpb24gaXMgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIHdoZW4gdGhlcmUgaXMgYSBjaGFuZ2UgaW4gdGhlIGxpY2Vuc2Uga2V5IGlucHV0LlxuICAgICAqL1xuICAgIGNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGxpY0tleSA9IGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpO1xuICAgICAgICBpZiAobGljS2V5Lmxlbmd0aCA9PT0gMjgpIHtcbiAgICAgICAgICAgIC8vIExpY2Vuc2Uga2V5IGlzIGNvbXBsZXRlXG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLmF0dHIoJ2hpZGRlbicsICcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGNvdXBvblNlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmb3JtRXJyb3JNZXNzYWdlcy5lbXB0eSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGljZW5zZSBrZXkgaXMgaW5jb21wbGV0ZVxuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgICQob2JqKS5yZW1vdmVBdHRyKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGNvdXBvblNlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCBiZWZvcmUgcGFzdGluZyBhIHZhbHVlIGludG8gdGhlIGxpY2Vuc2Uga2V5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXN0ZWRWYWx1ZSAtIFRoZSB2YWx1ZSBiZWluZyBwYXN0ZWQgaW50byB0aGUgZmllbGQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58c3RyaW5nfSAtIFJldHVybnMgZmFsc2UgaWYgdGhlIHBhc3RlZCB2YWx1ZSBkb2VzIG5vdCBjb250YWluICdNSUtPLScsIG90aGVyd2lzZSByZXR1cm5zIHRoZSBwYXN0ZWQgdmFsdWUgd2l0aCB3aGl0ZXNwYWNlIHJlbW92ZWQuXG4gICAgICovXG4gICAgY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuICAgICAgICBpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLTy0nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgYmVmb3JlIHBhc3RpbmcgYSB2YWx1ZSBpbnRvIHRoZSBjb3Vwb24gZmllbGQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3RlZFZhbHVlIC0gVGhlIHZhbHVlIGJlaW5nIHBhc3RlZCBpbnRvIHRoZSBmaWVsZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxzdHJpbmd9IC0gUmV0dXJucyBmYWxzZSBpZiB0aGUgcGFzdGVkIHZhbHVlIGRvZXMgbm90IGNvbnRhaW4gJ01JS09VUEQtJywgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHBhc3RlZCB2YWx1ZSB3aXRoIHdoaXRlc3BhY2UgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBjYk9uQ291cG9uQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgaWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS09VUEQtJykgPT09IC0xKSB7XG4gICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGNvdXBvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBsaWNlbnNlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gVGhlIGxpY2Vuc2UgaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICAgKi9cbiAgICBzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuICAgICAgICBjb25zdCBsaWNlbnNlRGF0YSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICAgIGlmIChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJCgnI2tleS1jb21wYW55bmFtZScpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29tcGFueW5hbWUpO1xuICAgICAgICAkKCcja2V5LWNvbnRhY3QnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbnRhY3QpO1xuICAgICAgICAkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG4gICAgICAgICQoJyNrZXktdGVsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS50ZWwpO1xuICAgICAgICBsZXQgcHJvZHVjdHMgPSBsaWNlbnNlRGF0YS5wcm9kdWN0O1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG4gICAgICAgICAgICBwcm9kdWN0cyA9IFtdO1xuICAgICAgICAgICAgcHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcbiAgICAgICAgfVxuICAgICAgICAkLmVhY2gocHJvZHVjdHMsIChrZXksIHByb2R1Y3RWYWx1ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHByb2R1Y3RWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHJvdyA9ICc8dHI+PHRkPic7XG4gICAgICAgICAgICBsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcbiAgICAgICAgICAgIGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlWydAYXR0cmlidXRlcyddO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGF0ZUV4cGlyZWQgPSBuZXcgRGF0ZShwcm9kdWN0LmV4cGlyZWQucmVwbGFjZSgvKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkvLCAnJDEvJDIvJDMnKSk7XG4gICAgICAgICAgICBjb25zdCBkYXRlTm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGlmIChkYXRlTm93ID4gZGF0ZUV4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICByb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID09PSAwICYmIHByb2R1Y3QudHJpYWwgPT09ICcxJykge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj4ke3Byb2R1Y3QubmFtZX1gO1xuICAgICAgICAgICAgICAgIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXhwaXJlZFRleHQgPSBnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWRBZnRlcjtcbiAgICAgICAgICAgICAgICAgICAgZXhwaXJlZFRleHQgPSBleHBpcmVkVGV4dC5yZXBsYWNlKCclZXhwaXJlZCUnLCBwcm9kdWN0LmV4cGlyZWQpO1xuICAgICAgICAgICAgICAgICAgICByb3cgKz0gYDxicj48c21hbGw+JHtleHBpcmVkVGV4dH08L3NtYWxsPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJvdyArPSAnPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4nO1xuICAgICAgICAgICAgICAgICQuZWFjaChwcm9kdWN0VmFsdWUuZmVhdHVyZSwgKGluZGV4LCBmZWF0dXJlVmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmVJbmZvID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19GZWF0dXJlSW5mbztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZlYXR1cmUgPSBmZWF0dXJlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVuYW1lJScsIGZlYXR1cmUubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50JScsIGZlYXR1cmUuY291bnQpO1xuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudGVhY2glJywgZmVhdHVyZS5jb3VudGVhY2gpO1xuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjYXB0dXJlZCUnLCBmZWF0dXJlLmNhcHR1cmVkKTtcbiAgICAgICAgICAgICAgICAgICAgcm93ICs9IGAke2ZlYXR1cmVJbmZvfTxicj5gO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJvdyArPSAnPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb3cgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuICAgICAgICAgICAgJCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuYXBwZW5kKHJvdyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZnRlciB1cGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cbiAgICAgKiBAcGFyYW0gcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc1xuICAgICAqL1xuICAgIGNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyhyZXNwb25zZSwgc3VjY2Vzcykge1xuICAgICAgICBpZiAoc3VjY2VzcyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhLlBCWExpY2Vuc2UgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZ2xvYmFsUEJYTGljZW5zZSA9IHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZTtcbiAgICAgICAgICAgICAgICBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2xpY0tleScsIHJlc3BvbnNlLmRhdGEuUEJYTGljZW5zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5odG1sKCcnKTtcblxuICAgICAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdjb3Vwb24nLCAnJyk7XG5cbiAgICAgICAgICAgIGxpY2Vuc2luZ01vZGlmeS5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5saWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hhbmdlIHRoZSB2YWx1ZSBvZiAnJGRpcnJ0eUZpZWxkJyB0byB0cmlnZ2VyXG4gICAgICAgIC8vIHRoZSAnY2hhbmdlJyBmb3JtIGV2ZW50IGFuZCBlbmFibGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgICAgbGljZW5zaW5nTW9kaWZ5LiRkaXJydHlGaWVsZC52YWwoTWF0aC5yYW5kb20oKSk7XG4gICAgICAgIGxpY2Vuc2luZ01vZGlmeS4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBQYnhBcGkuTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdChmb3JtRGF0YSwgbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9zYXZlYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBsaWNlbnNpbmdNb2RpZnkudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgdG8gY2hlY2sgaWYgYSBmaWVsZCBpcyBlbXB0eSBvbmx5IGlmIHRoZSBsaWNlbnNlIGtleSBmaWVsZCBpcyBub3QgZW1wdHkuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZpZWxkIGJlaW5nIHZhbGlkYXRlZC5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIGZpZWxkIGlzIG5vdCBlbXB0eSBvciB0aGUgbGljZW5zZSBrZXkgZmllbGQgaXMgZW1wdHksIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiAobGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCkubGVuZ3RoID09PSAyOCB8fCB2YWx1ZS5sZW5ndGggPiAwKTtcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbGljZW5zaW5nIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==