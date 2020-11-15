"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, Form, sessionStorage */
$.fn.form.settings.rules.checkEmptyIfLicenseKeyEmpty = function (value) {
  return $('#licKey').val().length === 28 || value.length > 0;
};

var licensingModify = {
  $formObj: $('#licencing-modify-form'),
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
  initialize: function () {
    function initialize() {
      licensingModify.$accordions.accordion();
      licensingModify.$licenseDetailInfo.hide();
      licensingModify.$coupon.inputmask('MIKOUPD-*****-*****-*****-*****', {
        onBeforePaste: licensingModify.cbOnCouponBeforePaste
      });
      licensingModify.$licKey.inputmask('MIKO-*****-*****-*****-*****', {
        oncomplete: licensingModify.cbOnLicenceKeyInputChange,
        onincomplete: licensingModify.cbOnLicenceKeyInputChange,
        clearIncomplete: true,
        onBeforePaste: licensingModify.cbOnLicenceKeyBeforePaste
      });
      licensingModify.$email.inputmask('email');
      licensingModify.defaultLicenseKey = licensingModify.$licKey.val();
      licensingModify.$licensingMenu.tab({
        historyType: 'hash'
      });
      licensingModify.$resetButton.on('click', function () {
        licensingModify.$formObj.addClass('loading disabled');
        PbxApi.LicenseResetLicenseKey(licensingModify.cbAfterResetLicenseKey);
      });
      licensingModify.cbOnLicenceKeyInputChange();
      licensingModify.initializeForm();

      if (licensingModify.defaultLicenseKey.length === 28) {
        licensingModify.$filledLicenseKeyInfo.html("".concat(licensingModify.defaultLicenseKey, " <i class=\"spinner loading icon\"></i>")).show();
        PbxApi.LicenseGetMikoPBXFeatureStatus(licensingModify.cbAfterGetMikoPBXFeatureStatus);
        PbxApi.LicenseGetLicenseInfo(licensingModify.cbAfterGetLicenseInfo);
        licensingModify.$emptyLicenseKeyInfo.hide();
      } else {
        licensingModify.$filledLicenseKeyInfo.hide();
        licensingModify.$emptyLicenseKeyInfo.show();
      }

      if (licensingModify.defaultLicenseKey !== '') {
        licensingModify.$licensingMenu.tab('change tab', 'management');
      }

      licensingModify.$goToLicenseManagementBTN.on('click', function (e) {
        e.preventDefault();
        licensingModify.$licensingMenu.tab('change tab', 'management');
      });
    }

    return initialize;
  }(),

  /**
   * After send ResetLicenseKey callback
   * @param response
   */
  cbAfterResetLicenseKey: function () {
    function cbAfterResetLicenseKey(response) {
      licensingModify.$formObj.removeClass('loading disabled');
      if (response !== false) window.location.reload();
    }

    return cbAfterResetLicenseKey;
  }(),

  /**
   * After send GetLicenseInfo callback
   * @param response
   */
  cbAfterGetMikoPBXFeatureStatus: function () {
    function cbAfterGetMikoPBXFeatureStatus(response) {
      $('.spinner.loading.icon').remove();
      licensingModify.$ajaxMessages.remove();

      if (response === true) {
        licensingModify.$formObj.removeClass('error').addClass('success');
        licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui success message ajax\"><i class=\"check green icon\"></i> ".concat(globalTranslate.lic_LicenseKeyValid, "</div>"));
      } else {
        licensingModify.$formObj.addClass('error').removeClass('success');
        licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui error message ajax\"><i class=\"exclamation triangle red icon\"></i> ".concat(response.messages, "</div>"));
      }
    }

    return cbAfterGetMikoPBXFeatureStatus;
  }(),

  /**
   * After send GetLicenseInfo callback
   * @param response
   */
  cbAfterGetLicenseInfo: function () {
    function cbAfterGetLicenseInfo(response) {
      if (response.licenseInfo !== undefined) {
        licensingModify.showLicenseInfo(response.licenseInfo);
        licensingModify.$licenseDetailInfo.show();
      } else {
        licensingModify.$licenseDetailInfo.hide();
      }
    }

    return cbAfterGetLicenseInfo;
  }(),

  /**
   * On change license key input field
   */
  cbOnLicenceKeyInputChange: function () {
    function cbOnLicenceKeyInputChange() {
      var licKey = licensingModify.$licKey.val();

      if (licKey.length === 28) {
        licensingModify.$formObj.find('.reginfo input').each(function (index, obj) {
          $(obj).attr('hidden', '');
        });
        licensingModify.$getNewKeyLicenseSection.hide();
        licensingModify.$couponSection.show();
        licensingModify.$formErrorMessages.empty();
      } else {
        licensingModify.$formObj.find('.reginfo input').each(function (index, obj) {
          $(obj).removeAttr('hidden');
        });
        licensingModify.$getNewKeyLicenseSection.show();
        licensingModify.$couponSection.hide();
      }
    }

    return cbOnLicenceKeyInputChange;
  }(),

  /**
   * Callback after paste license key
   */
  cbOnLicenceKeyBeforePaste: function () {
    function cbOnLicenceKeyBeforePaste(pastedValue) {
      if (pastedValue.indexOf('MIKO-') === -1) {
        licensingModify.$licKey.transition('shake');
        return false;
      }

      return pastedValue.replace(/\s+/g, '');
    }

    return cbOnLicenceKeyBeforePaste;
  }(),

  /**
   * Callback after paste license coupon
   */
  cbOnCouponBeforePaste: function () {
    function cbOnCouponBeforePaste(pastedValue) {
      if (pastedValue.indexOf('MIKOUPD-') === -1) {
        licensingModify.$coupon.transition('shake');
        return false;
      }

      return pastedValue.replace(/\s+/g, '');
    }

    return cbOnCouponBeforePaste;
  }(),

  /**
   * Parses and builds license info presentation
   */
  showLicenseInfo: function () {
    function showLicenseInfo(message) {
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
    }

    return showLicenseInfo;
  }(),

  /**
   * After update license key, get new one, activate coupon
   * @param response
   * @param success
   */
  cbAfterFormProcessing: function () {
    function cbAfterFormProcessing(response, success) {
      if (success === true) {
        window.location.reload();
      } else if (response.messages !== undefined) {
        UserMessage.showMultiString(response.messages);
      } else {
        UserMessage.showError(globalTranslate.lic_GetTrialErrorCheckInternet);
      }

      licensingModify.$dirrtyField.val(Math.random());
      licensingModify.$dirrtyField.trigger('change');
    }

    return cbAfterFormProcessing;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      return settings;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {
      var formData = licensingModify.$formObj.form('get values');
      PbxApi.LicenseProcessUserRequest(formData, licensingModify.cbAfterFormProcessing);
    }

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = licensingModify.$formObj;
      Form.url = "".concat(globalRootUrl, "licensing/save");
      Form.validateRules = licensingModify.validateRules;
      Form.cbBeforeSendForm = licensingModify.cbBeforeSendForm;
      Form.cbAfterSendForm = licensingModify.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  licensingModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZGlycnR5RmllbGQiLCIkZ29Ub0xpY2Vuc2VNYW5hZ2VtZW50QlROIiwiJGVtcHR5TGljZW5zZUtleUluZm8iLCIkZmlsbGVkTGljZW5zZUtleUluZm8iLCIkZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24iLCIkY291cG9uU2VjdGlvbiIsIiRmb3JtRXJyb3JNZXNzYWdlcyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRyZXNldEJ1dHRvbiIsIiRwcm9kdWN0RGV0YWlscyIsIiRsaWNlbnNpbmdNZW51IiwiJGFjY29yZGlvbnMiLCJkZWZhdWx0TGljZW5zZUtleSIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSIsImVtYWlsIiwibGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsIiwiY29udGFjdCIsImxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lIiwibGljS2V5Iiwib3B0aW9uYWwiLCJsaWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHkiLCJjb3Vwb24iLCJkZXBlbmRzIiwibGljX1ZhbGlkYXRlQ291cG9uRW1wdHkiLCJpbml0aWFsaXplIiwiYWNjb3JkaW9uIiwiaGlkZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJ0YWIiLCJoaXN0b3J5VHlwZSIsIm9uIiwiYWRkQ2xhc3MiLCJQYnhBcGkiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiaHRtbCIsInNob3ciLCJMaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJMaWNlbnNlR2V0TGljZW5zZUluZm8iLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJlIiwicHJldmVudERlZmF1bHQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmUiLCJhZnRlciIsImxpY19MaWNlbnNlS2V5VmFsaWQiLCJtZXNzYWdlcyIsImxpY2Vuc2VJbmZvIiwidW5kZWZpbmVkIiwic2hvd0xpY2Vuc2VJbmZvIiwiZmluZCIsImVhY2giLCJpbmRleCIsIm9iaiIsImF0dHIiLCJlbXB0eSIsInJlbW92ZUF0dHIiLCJwYXN0ZWRWYWx1ZSIsImluZGV4T2YiLCJ0cmFuc2l0aW9uIiwicmVwbGFjZSIsIm1lc3NhZ2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwibGljX0V4cGlyZWRBZnRlciIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImxpY19GZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzaG93RXJyb3IiLCJsaWNfR2V0VHJpYWxFcnJvckNoZWNrSW50ZXJuZXQiLCJNYXRoIiwicmFuZG9tIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JtRGF0YSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQUEsQ0FBQyxDQUFDQyxFQUFGLENBQUtDLElBQUwsQ0FBVUMsUUFBVixDQUFtQkMsS0FBbkIsQ0FBeUJDLDJCQUF6QixHQUF1RCxVQUFVQyxLQUFWLEVBQWlCO0FBQ3ZFLFNBQVFOLENBQUMsQ0FBQyxTQUFELENBQUQsQ0FBYU8sR0FBYixHQUFtQkMsTUFBbkIsS0FBOEIsRUFBOUIsSUFBb0NGLEtBQUssQ0FBQ0UsTUFBTixHQUFlLENBQTNEO0FBQ0EsQ0FGRDs7QUFJQSxJQUFNQyxlQUFlLEdBQUc7QUFDdkJDLEVBQUFBLFFBQVEsRUFBRVYsQ0FBQyxDQUFDLHdCQUFELENBRFk7QUFFdkJXLEVBQUFBLFlBQVksRUFBRVgsQ0FBQyxDQUFDLFNBQUQsQ0FGUTtBQUd2QlksRUFBQUEseUJBQXlCLEVBQUNaLENBQUMsQ0FBQyx3QkFBRCxDQUhKO0FBSXZCYSxFQUFBQSxvQkFBb0IsRUFBRWIsQ0FBQyxDQUFDLHlCQUFELENBSkE7QUFLdkJjLEVBQUFBLHFCQUFxQixFQUFFZCxDQUFDLENBQUMsMEJBQUQsQ0FMRDtBQU12QmUsRUFBQUEsd0JBQXdCLEVBQUVmLENBQUMsQ0FBQywwQkFBRCxDQU5KO0FBT3ZCZ0IsRUFBQUEsY0FBYyxFQUFFaEIsQ0FBQyxDQUFDLGdCQUFELENBUE07QUFRdkJpQixFQUFBQSxrQkFBa0IsRUFBRWpCLENBQUMsQ0FBQyxzQkFBRCxDQVJFO0FBU3ZCa0IsRUFB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Q0FBa0IsWUFBTTtBQUN2QnRJLEVBQUFBLGVBQWUsQ0FBQ29DLFVBQWhCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBzZXNzaW9uU3RvcmFnZSAqL1xuXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdHJldHVybiAoJCgnI2xpY0tleScpLnZhbCgpLmxlbmd0aCA9PT0gMjggfHwgdmFsdWUubGVuZ3RoID4gMCk7XG59O1xuXG5jb25zdCBsaWNlbnNpbmdNb2RpZnkgPSB7XG5cdCRmb3JtT2JqOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtJyksXG5cdCRkaXJydHlGaWVsZDogJCgnI2RpcnJ0eScpLFxuXHQkZ29Ub0xpY2Vuc2VNYW5hZ2VtZW50QlROOiQoJyNjaGFuZ2VQYWdlVG9MaWNlbnNpbmcnKSxcblx0JGVtcHR5TGljZW5zZUtleUluZm86ICQoJyNlbXB0eS1saWNlbnNlLWtleS1pbmZvJyksXG5cdCRmaWxsZWRMaWNlbnNlS2V5SW5mbzogJCgnI2ZpbGxlZC1saWNlbnNlLWtleS1pbmZvJyksXG5cdCRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbjogJCgnI2dldE5ld0tleUxpY2Vuc2VTZWN0aW9uJyksXG5cdCRjb3Vwb25TZWN0aW9uOiAkKCcjY291cG9uU2VjdGlvbicpLFxuXHQkZm9ybUVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG5cdCRsaWNLZXk6ICQoJyNsaWNLZXknKSxcblx0JGNvdXBvbjogJCgnI2NvdXBvbicpLFxuXHQkZW1haWw6ICQoJyNlbWFpbCcpLFxuXHQkYWpheE1lc3NhZ2VzOiAkKCcudWkubWVzc2FnZS5hamF4JyksXG5cdCRsaWNlbnNlRGV0YWlsSW5mbzogJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyksXG5cdCRyZXNldEJ1dHRvbjogJCgnI3Jlc2V0LWxpY2Vuc2UnKSxcblx0JHByb2R1Y3REZXRhaWxzOiAkKCcjcHJvZHVjdERldGFpbHMnKSxcblx0JGxpY2Vuc2luZ01lbnU6ICQoJyNsaWNlbnNpbmctbWVudSAuaXRlbScpLFxuXHQkYWNjb3JkaW9uczogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cdGRlZmF1bHRMaWNlbnNlS2V5OiBudWxsLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0Y29tcGFueW5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdjb21wYW55bmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRlbWFpbDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2VtYWlsJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0RW1haWwsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0Y29udGFjdDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2NvbnRhY3QnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGxpY0tleToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2xpY0tleScsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhhY3RMZW5ndGhbMjhdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0Y291cG9uOiB7XG5cdFx0XHRkZXBlbmRzOiAnbGljS2V5Jyxcblx0XHRcdGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ291cG9uRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcblx0XHRcdG9uQmVmb3JlUGFzdGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uQ291cG9uQmVmb3JlUGFzdGUsXG5cdFx0fSk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuXHRcdFx0b25jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG5cdFx0XHRvbmluY29tcGxldGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuXHRcdFx0Y2xlYXJJbmNvbXBsZXRlOiB0cnVlLFxuXHRcdFx0b25CZWZvcmVQYXN0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG5cdFx0fSk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKHtcblx0XHRcdGhpc3RvcnlUeXBlOiAnaGFzaCcsXG5cdFx0fSk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuJHJlc2V0QnV0dG9uLm9uKCdjbGljaycsKCk9Pntcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkobGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkpO1xuXHRcdH0pO1xuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuXG5cdFx0aWYgKGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleS5sZW5ndGggPT09IDI4KSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvXG5cdFx0XHRcdC5odG1sKGAke2xpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleX0gPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT5gKVxuXHRcdFx0XHQuc2hvdygpO1xuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKTtcblx0XHRcdFBieEFwaS5MaWNlbnNlR2V0TGljZW5zZUluZm8obGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uaGlkZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZW1wdHlMaWNlbnNlS2V5SW5mby5zaG93KCk7XG5cdFx0fVxuXG5cdFx0aWYgKGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleSAhPT0gJycpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoJ2NoYW5nZSB0YWInLCAnbWFuYWdlbWVudCcpO1xuXHRcdH1cblxuXHRcdGxpY2Vuc2luZ01vZGlmeS4kZ29Ub0xpY2Vuc2VNYW5hZ2VtZW50QlROLm9uKCdjbGljaycsKGUpPT57XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKCdjaGFuZ2UgdGFiJywgJ21hbmFnZW1lbnQnKTtcblx0XHR9KTtcblxuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgc2VuZCBSZXNldExpY2Vuc2VLZXkgY2FsbGJhY2tcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkFmdGVyUmVzZXRMaWNlbnNlS2V5KHJlc3BvbnNlKXtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblx0XHRpZiAocmVzcG9uc2UhPT1mYWxzZSkgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgc2VuZCBHZXRMaWNlbnNlSW5mbyBjYWxsYmFja1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhyZXNwb25zZSl7XG5cdFx0JCgnLnNwaW5uZXIubG9hZGluZy5pY29uJykucmVtb3ZlKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRhamF4TWVzc2FnZXMucmVtb3ZlKCk7XG5cdFx0aWYgKHJlc3BvbnNlPT09dHJ1ZSl7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ3N1Y2Nlc3MnKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBzdWNjZXNzIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiY2hlY2sgZ3JlZW4gaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VLZXlWYWxpZH08L2Rpdj5gKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdlcnJvcicpLnJlbW92ZUNsYXNzKCdzdWNjZXNzJyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSByZWQgaWNvblwiPjwvaT4gJHtyZXNwb25zZS5tZXNzYWdlc308L2Rpdj5gKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEFmdGVyIHNlbmQgR2V0TGljZW5zZUluZm8gY2FsbGJhY2tcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkFmdGVyR2V0TGljZW5zZUluZm8ocmVzcG9uc2Upe1xuXHRcdGlmIChyZXNwb25zZS5saWNlbnNlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuc2hvd0xpY2Vuc2VJbmZvKHJlc3BvbnNlLmxpY2Vuc2VJbmZvKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIE9uIGNoYW5nZSBsaWNlbnNlIGtleSBpbnB1dCBmaWVsZFxuXHQgKi9cblx0Y2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpIHtcblx0XHRjb25zdCBsaWNLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcblx0XHRpZiAobGljS2V5Lmxlbmd0aCA9PT0gMjgpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdFx0JChvYmopLmF0dHIoJ2hpZGRlbicsICcnKTtcblx0XHRcdH0pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5oaWRlKCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvblNlY3Rpb24uc2hvdygpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtRXJyb3JNZXNzYWdlcy5lbXB0eSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdCQob2JqKS5yZW1vdmVBdHRyKCdoaWRkZW4nKTtcblx0XHRcdH0pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5zaG93KCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvblNlY3Rpb24uaGlkZSgpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIENhbGxiYWNrIGFmdGVyIHBhc3RlIGxpY2Vuc2Uga2V5XG5cdCAqL1xuXHRjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG5cdFx0aWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS08tJykgPT09IC0xKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS50cmFuc2l0aW9uKCdzaGFrZScpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBsaWNlbnNlIGNvdXBvblxuXHQgKi9cblx0Y2JPbkNvdXBvbkJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG5cdFx0aWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS09VUEQtJykgPT09IC0xKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBQYXJzZXMgYW5kIGJ1aWxkcyBsaWNlbnNlIGluZm8gcHJlc2VudGF0aW9uXG5cdCAqL1xuXHRzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuXHRcdGNvbnN0IGxpY2Vuc2VEYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcblx0XHRpZiAobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkKCcja2V5LWNvbXBhbnluYW1lJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb21wYW55bmFtZSk7XG5cdFx0JCgnI2tleS1jb250YWN0JykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb250YWN0KTtcblx0XHQkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG5cdFx0JCgnI2tleS10ZWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLnRlbCk7XG5cdFx0bGV0IHByb2R1Y3RzID0gbGljZW5zZURhdGEucHJvZHVjdDtcblx0XHRpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG5cdFx0XHRwcm9kdWN0cyA9IFtdO1xuXHRcdFx0cHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcblx0XHR9XG5cdFx0JC5lYWNoKHByb2R1Y3RzLCAoa2V5LCBwcm9kdWN0VmFsdWUpID0+IHtcblx0XHRcdGxldCByb3cgPSAnPHRyPjx0ZD4nO1xuXHRcdFx0bGV0IHByb2R1Y3QgPSBwcm9kdWN0VmFsdWU7XG5cdFx0XHRpZiAocHJvZHVjdFsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHByb2R1Y3QgPSBwcm9kdWN0VmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBkYXRlRXhwaXJlZCA9IG5ldyBEYXRlKHByb2R1Y3QuZXhwaXJlZC5yZXBsYWNlKC8oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KS8sICckMS8kMi8kMycpKTtcblx0XHRcdGNvbnN0IGRhdGVOb3cgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0aWYgKGRhdGVOb3cgPiBkYXRlRXhwaXJlZCkge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuXHRcdFx0fSBlbHNlIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID09PSAwICYmIHByb2R1Y3QudHJpYWwgPT09ICcxJykge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPiR7cHJvZHVjdC5uYW1lfWA7XG5cdFx0XHRcdGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdGxldCBleHBpcmVkVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZEFmdGVyO1xuXHRcdFx0XHRcdGV4cGlyZWRUZXh0ID0gZXhwaXJlZFRleHQucmVwbGFjZSgnJWV4cGlyZWQlJywgcHJvZHVjdC5leHBpcmVkKTtcblx0XHRcdFx0XHRyb3cgKz0gYDxicj48c21hbGw+JHtleHBpcmVkVGV4dH08L3NtYWxsPmA7XG5cdFx0XHRcdH1cblx0XHRcdFx0cm93ICs9ICc8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPic7XG5cdFx0XHRcdCQuZWFjaChwcm9kdWN0VmFsdWUuZmVhdHVyZSwgKGluZGV4LCBmZWF0dXJlVmFsdWUpID0+IHtcblx0XHRcdFx0XHRsZXQgZmVhdHVyZUluZm8gPSBnbG9iYWxUcmFuc2xhdGUubGljX0ZlYXR1cmVJbmZvO1xuXHRcdFx0XHRcdGxldCBmZWF0dXJlID0gZmVhdHVyZVZhbHVlO1xuXHRcdFx0XHRcdGlmIChmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0ZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclbmFtZSUnLCBmZWF0dXJlLm5hbWUpO1xuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50JScsIGZlYXR1cmUuY291bnQpO1xuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50ZWFjaCUnLCBmZWF0dXJlLmNvdW50ZWFjaCk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY2FwdHVyZWQlJywgZmVhdHVyZS5jYXB0dXJlZCk7XG5cdFx0XHRcdFx0cm93ICs9IGAke2ZlYXR1cmVJbmZvfTxicj5gO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cm93ICs9ICc8L3NwYW4+Jztcblx0XHRcdH1cblx0XHRcdHJvdyArPSAnPC9kaXY+PC90ZD48L3RyPic7XG5cdFx0XHQkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5hcHBlbmQocm93KTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIHVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICogQHBhcmFtIHN1Y2Nlc3Ncblx0ICovXG5cdGNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyhyZXNwb25zZSwgc3VjY2Vzcykge1xuXHRcdGlmIChzdWNjZXNzPT09dHJ1ZSl7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuXHRcdH1lbHNlIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubGljX0dldFRyaWFsRXJyb3JDaGVja0ludGVybmV0KTtcblx0XHR9XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRkaXJydHlGaWVsZC52YWwoTWF0aC5yYW5kb20oKSk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRkaXJydHlGaWVsZC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdHJldHVybiBzZXR0aW5ncztcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXHRcdGNvbnN0IGZvcm1EYXRhID0gbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRQYnhBcGkuTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdChmb3JtRGF0YSwgbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyk7XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBsaWNlbnNpbmdNb2RpZnkudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBsaWNlbnNpbmdNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGxpY2Vuc2luZ01vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19