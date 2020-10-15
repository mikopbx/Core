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
        licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui error message ajax\"><i class=\"exclamation triangle red icon\"></i> ".concat(response.message, "</div>"));
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
      if (response.licenseInfo !== 'null') {
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
      } else {
        UserMessage.showMultiString(response.messages);
        licensingModify.$dirrtyField.val(Math.random());
        licensingModify.$dirrtyField.trigger('change');
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZGlycnR5RmllbGQiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiIsIiRjb3Vwb25TZWN0aW9uIiwiJGZvcm1FcnJvck1lc3NhZ2VzIiwiJGxpY0tleSIsIiRjb3Vwb24iLCIkZW1haWwiLCIkYWpheE1lc3NhZ2VzIiwiJGxpY2Vuc2VEZXRhaWxJbmZvIiwiJHJlc2V0QnV0dG9uIiwiJHByb2R1Y3REZXRhaWxzIiwiJGxpY2Vuc2luZ01lbnUiLCIkYWNjb3JkaW9ucyIsImRlZmF1bHRMaWNlbnNlS2V5IiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJhY2NvcmRpb24iLCJoaWRlIiwiaW5wdXRtYXNrIiwib25CZWZvcmVQYXN0ZSIsImNiT25Db3Vwb25CZWZvcmVQYXN0ZSIsIm9uY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlIiwib25pbmNvbXBsZXRlIiwiY2xlYXJJbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSIsInRhYiIsImhpc3RvcnlUeXBlIiwib24iLCJhZGRDbGFzcyIsIlBieEFwaSIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJjYkFmdGVyUmVzZXRMaWNlbnNlS2V5IiwiaW5pdGlhbGl6ZUZvcm0iLCJodG1sIiwic2hvdyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsImFmdGVyIiwibGljX0xpY2Vuc2VLZXlWYWxpZCIsIm1lc3NhZ2UiLCJsaWNlbnNlSW5mbyIsInNob3dMaWNlbnNlSW5mbyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJhdHRyIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwidHJhbnNpdGlvbiIsInJlcGxhY2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInVuZGVmaW5lZCIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwibGljX0V4cGlyZWRBZnRlciIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImxpY19GZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvcm1EYXRhIiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBQSxDQUFDLENBQUNDLEVBQUYsQ0FBS0MsSUFBTCxDQUFVQyxRQUFWLENBQW1CQyxLQUFuQixDQUF5QkMsMkJBQXpCLEdBQXVELFVBQVVDLEtBQVYsRUFBaUI7QUFDdkUsU0FBUU4sQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhTyxHQUFiLEdBQW1CQyxNQUFuQixLQUE4QixFQUE5QixJQUFvQ0YsS0FBSyxDQUFDRSxNQUFOLEdBQWUsQ0FBM0Q7QUFDQSxDQUZEOztBQUlBLElBQU1DLGVBQWUsR0FBRztBQUN2QkMsRUFBQUEsUUFBUSxFQUFFVixDQUFDLENBQUMsd0JBQUQsQ0FEWTtBQUV2QlcsRUFBQUEsWUFBWSxFQUFFWCxDQUFDLENBQUMsU0FBRCxDQUZRO0FBR3ZCWSxFQUFBQSxvQkFBb0IsRUFBRVosQ0FBQyxDQUFDLHlCQUFELENBSEE7QUFJdkJhLEVBQUFBLHFCQUFxQixFQUFFYixDQUFDLENBQUMsMEJBQUQsQ0FKRDtBQUt2QmMsRUFBQUEsd0JBQXdCLEVBQUVkLENBQUMsQ0FBQywwQkFBRCxDQUxKO0FBTXZCZSxFQUFBQSxjQUFjLEVBQUVmLENBQUMsQ0FBQyxnQkFBRCxDQU5NO0FBT3ZCZ0IsRUFBQUEsa0JBQWtCLEVBQUVoQixDQUFDLENBQUMsc0JBQUQsQ0FQRTtBQVF2QmlCLEVBQUFBLE9BQU8sRUFBRWpCLENBQUMsQ0FBQyxTQUFELENBUmE7QUFTdkJrQixFQUFBQSxPQUFPLEVBQUVsQixDQUFDLENBQUMsU0FBRCxDQVRhO0FBVXZCbUIsRUFBQUEsTUFBTSxFQUFFbkIsQ0FBQyxDQUFDLFFBQUQsQ0FWYztBQVd2Qm9CLEVBQUFBLGFB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QWlDRCxRQUFqQyxFQUEyQzNILGVBQWUsQ0FBQ2lILHFCQUEzRDtBQUNBOztBQTVRc0I7QUFBQTtBQTZRdkI1RCxFQUFBQSxjQTdRdUI7QUFBQSw4QkE2UU47QUFDaEJ3RSxNQUFBQSxJQUFJLENBQUM1SCxRQUFMLEdBQWdCRCxlQUFlLENBQUNDLFFBQWhDO0FBQ0E0SCxNQUFBQSxJQUFJLENBQUNDLEdBQUwsYUFBY0MsYUFBZDtBQUNBRixNQUFBQSxJQUFJLENBQUMzRyxhQUFMLEdBQXFCbEIsZUFBZSxDQUFDa0IsYUFBckM7QUFDQTJHLE1BQUFBLElBQUksQ0FBQ0osZ0JBQUwsR0FBd0J6SCxlQUFlLENBQUN5SCxnQkFBeEM7QUFDQUksTUFBQUEsSUFBSSxDQUFDSCxlQUFMLEdBQXVCMUgsZUFBZSxDQUFDMEgsZUFBdkM7QUFDQUcsTUFBQUEsSUFBSSxDQUFDMUYsVUFBTDtBQUNBOztBQXBSc0I7QUFBQTtBQUFBLENBQXhCO0FBdVJBNUMsQ0FBQyxDQUFDeUksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmpJLEVBQUFBLGVBQWUsQ0FBQ21DLFVBQWhCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBzZXNzaW9uU3RvcmFnZSAqL1xuXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdHJldHVybiAoJCgnI2xpY0tleScpLnZhbCgpLmxlbmd0aCA9PT0gMjggfHwgdmFsdWUubGVuZ3RoID4gMCk7XG59O1xuXG5jb25zdCBsaWNlbnNpbmdNb2RpZnkgPSB7XG5cdCRmb3JtT2JqOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtJyksXG5cdCRkaXJydHlGaWVsZDogJCgnI2RpcnJ0eScpLFxuXHQkZW1wdHlMaWNlbnNlS2V5SW5mbzogJCgnI2VtcHR5LWxpY2Vuc2Uta2V5LWluZm8nKSxcblx0JGZpbGxlZExpY2Vuc2VLZXlJbmZvOiAkKCcjZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8nKSxcblx0JGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uOiAkKCcjZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24nKSxcblx0JGNvdXBvblNlY3Rpb246ICQoJyNjb3Vwb25TZWN0aW9uJyksXG5cdCRmb3JtRXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcblx0JGxpY0tleTogJCgnI2xpY0tleScpLFxuXHQkY291cG9uOiAkKCcjY291cG9uJyksXG5cdCRlbWFpbDogJCgnI2VtYWlsJyksXG5cdCRhamF4TWVzc2FnZXM6ICQoJy51aS5tZXNzYWdlLmFqYXgnKSxcblx0JGxpY2Vuc2VEZXRhaWxJbmZvOiAkKCcjbGljZW5zZURldGFpbEluZm8nKSxcblx0JHJlc2V0QnV0dG9uOiAkKCcjcmVzZXQtbGljZW5zZScpLFxuXHQkcHJvZHVjdERldGFpbHM6ICQoJyNwcm9kdWN0RGV0YWlscycpLFxuXHQkbGljZW5zaW5nTWVudTogJCgnI2xpY2Vuc2luZy1tZW51IC5pdGVtJyksXG5cdCRhY2NvcmRpb25zOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblx0ZGVmYXVsdExpY2Vuc2VLZXk6IG51bGwsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRjb21wYW55bmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2NvbXBhbnluYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGVtYWlsOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZW1haWwnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRjb250YWN0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnY29udGFjdCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdE5hbWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0bGljS2V5OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbGljS2V5Jyxcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGFjdExlbmd0aFsyOF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRjb3Vwb246IHtcblx0XHRcdGRlcGVuZHM6ICdsaWNLZXknLFxuXHRcdFx0aWRlbnRpZmllcjogJ2NvdXBvbicsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhhY3RMZW5ndGhbMzFdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb3Vwb25FbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb24uaW5wdXRtYXNrKCdNSUtPVVBELSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuXHRcdFx0b25CZWZvcmVQYXN0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25Db3Vwb25CZWZvcmVQYXN0ZSxcblx0XHR9KTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS5pbnB1dG1hc2soJ01JS08tKioqKiotKioqKiotKioqKiotKioqKionLCB7XG5cdFx0XHRvbmNvbXBsZXRlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcblx0XHRcdG9uaW5jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG5cdFx0XHRjbGVhckluY29tcGxldGU6IHRydWUsXG5cdFx0XHRvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSxcblx0XHR9KTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtYWlsLmlucHV0bWFzaygnZW1haWwnKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoe1xuXHRcdFx0aGlzdG9yeVR5cGU6ICdoYXNoJyxcblx0XHR9KTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS4kcmVzZXRCdXR0b24ub24oJ2NsaWNrJywoKT0+e1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cdFx0XHRQYnhBcGkuTGljZW5zZVJlc2V0TGljZW5zZUtleShsaWNlbnNpbmdNb2RpZnkuY2JBZnRlclJlc2V0TGljZW5zZUtleSk7XG5cdFx0fSk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpO1xuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cblx0XHRpZiAobGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5Lmxlbmd0aCA9PT0gMjgpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm9cblx0XHRcdFx0Lmh0bWwoYCR7bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5fSA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPmApXG5cdFx0XHRcdC5zaG93KCk7XG5cdFx0XHRQYnhBcGkuTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMpO1xuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyhsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckdldExpY2Vuc2VJbmZvKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZW1wdHlMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uaGlkZSgpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLnNob3coKTtcblx0XHR9XG5cblx0XHRpZiAobGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5ICE9PSAnJykge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNpbmdNZW51LnRhYignY2hhbmdlIHRhYicsICdtYW5hZ2VtZW50Jyk7XG5cdFx0fVxuXG5cblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIHNlbmQgUmVzZXRMaWNlbnNlS2V5IGNhbGxiYWNrXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JBZnRlclJlc2V0TGljZW5zZUtleShyZXNwb25zZSl7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cdFx0aWYgKHJlc3BvbnNlIT09ZmFsc2UpIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIHNlbmQgR2V0TGljZW5zZUluZm8gY2FsbGJhY2tcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMocmVzcG9uc2Upe1xuXHRcdCQoJy5zcGlubmVyLmxvYWRpbmcuaWNvbicpLnJlbW92ZSgpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kYWpheE1lc3NhZ2VzLnJlbW92ZSgpO1xuXHRcdGlmIChyZXNwb25zZT09PXRydWUpe1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdzdWNjZXNzJyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgc3VjY2VzcyBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImNoZWNrIGdyZWVuIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlS2V5VmFsaWR9PC9kaXY+YCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnZXJyb3InKS5yZW1vdmVDbGFzcygnc3VjY2VzcycpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgcmVkIGljb25cIj48L2k+ICR7cmVzcG9uc2UubWVzc2FnZX08L2Rpdj5gKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEFmdGVyIHNlbmQgR2V0TGljZW5zZUluZm8gY2FsbGJhY2tcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkFmdGVyR2V0TGljZW5zZUluZm8ocmVzcG9uc2Upe1xuXHRcdGlmIChyZXNwb25zZS5saWNlbnNlSW5mbyAhPT0gJ251bGwnKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuc2hvd0xpY2Vuc2VJbmZvKHJlc3BvbnNlLmxpY2Vuc2VJbmZvKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIE9uIGNoYW5nZSBsaWNlbnNlIGtleSBpbnB1dCBmaWVsZFxuXHQgKi9cblx0Y2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSgpIHtcblx0XHRjb25zdCBsaWNLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcblx0XHRpZiAobGljS2V5Lmxlbmd0aCA9PT0gMjgpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdFx0JChvYmopLmF0dHIoJ2hpZGRlbicsICcnKTtcblx0XHRcdH0pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5oaWRlKCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvblNlY3Rpb24uc2hvdygpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtRXJyb3JNZXNzYWdlcy5lbXB0eSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdCQob2JqKS5yZW1vdmVBdHRyKCdoaWRkZW4nKTtcblx0XHRcdH0pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbi5zaG93KCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvblNlY3Rpb24uaGlkZSgpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIENhbGxiYWNrIGFmdGVyIHBhc3RlIGxpY2Vuc2Uga2V5XG5cdCAqL1xuXHRjYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG5cdFx0aWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS08tJykgPT09IC0xKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS50cmFuc2l0aW9uKCdzaGFrZScpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBsaWNlbnNlIGNvdXBvblxuXHQgKi9cblx0Y2JPbkNvdXBvbkJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG5cdFx0aWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS09VUEQtJykgPT09IC0xKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBQYXJzZXMgYW5kIGJ1aWxkcyBsaWNlbnNlIGluZm8gcHJlc2VudGF0aW9uXG5cdCAqL1xuXHRzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuXHRcdGNvbnN0IGxpY2Vuc2VEYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcblx0XHRpZiAobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkKCcja2V5LWNvbXBhbnluYW1lJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb21wYW55bmFtZSk7XG5cdFx0JCgnI2tleS1jb250YWN0JykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb250YWN0KTtcblx0XHQkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG5cdFx0JCgnI2tleS10ZWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLnRlbCk7XG5cdFx0bGV0IHByb2R1Y3RzID0gbGljZW5zZURhdGEucHJvZHVjdDtcblx0XHRpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG5cdFx0XHRwcm9kdWN0cyA9IFtdO1xuXHRcdFx0cHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcblx0XHR9XG5cdFx0JC5lYWNoKHByb2R1Y3RzLCAoa2V5LCBwcm9kdWN0VmFsdWUpID0+IHtcblx0XHRcdGxldCByb3cgPSAnPHRyPjx0ZD4nO1xuXHRcdFx0bGV0IHByb2R1Y3QgPSBwcm9kdWN0VmFsdWU7XG5cdFx0XHRpZiAocHJvZHVjdFsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHByb2R1Y3QgPSBwcm9kdWN0VmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBkYXRlRXhwaXJlZCA9IG5ldyBEYXRlKHByb2R1Y3QuZXhwaXJlZC5yZXBsYWNlKC8oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KS8sICckMS8kMi8kMycpKTtcblx0XHRcdGNvbnN0IGRhdGVOb3cgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0aWYgKGRhdGVOb3cgPiBkYXRlRXhwaXJlZCkge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuXHRcdFx0fSBlbHNlIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID09PSAwICYmIHByb2R1Y3QudHJpYWwgPT09ICcxJykge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPiR7cHJvZHVjdC5uYW1lfWA7XG5cdFx0XHRcdGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdGxldCBleHBpcmVkVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZEFmdGVyO1xuXHRcdFx0XHRcdGV4cGlyZWRUZXh0ID0gZXhwaXJlZFRleHQucmVwbGFjZSgnJWV4cGlyZWQlJywgcHJvZHVjdC5leHBpcmVkKTtcblx0XHRcdFx0XHRyb3cgKz0gYDxicj48c21hbGw+JHtleHBpcmVkVGV4dH08L3NtYWxsPmA7XG5cdFx0XHRcdH1cblx0XHRcdFx0cm93ICs9ICc8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPic7XG5cdFx0XHRcdCQuZWFjaChwcm9kdWN0VmFsdWUuZmVhdHVyZSwgKGluZGV4LCBmZWF0dXJlVmFsdWUpID0+IHtcblx0XHRcdFx0XHRsZXQgZmVhdHVyZUluZm8gPSBnbG9iYWxUcmFuc2xhdGUubGljX0ZlYXR1cmVJbmZvO1xuXHRcdFx0XHRcdGxldCBmZWF0dXJlID0gZmVhdHVyZVZhbHVlO1xuXHRcdFx0XHRcdGlmIChmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0ZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclbmFtZSUnLCBmZWF0dXJlLm5hbWUpO1xuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50JScsIGZlYXR1cmUuY291bnQpO1xuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50ZWFjaCUnLCBmZWF0dXJlLmNvdW50ZWFjaCk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY2FwdHVyZWQlJywgZmVhdHVyZS5jYXB0dXJlZCk7XG5cdFx0XHRcdFx0cm93ICs9IGAke2ZlYXR1cmVJbmZvfTxicj5gO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cm93ICs9ICc8L3NwYW4+Jztcblx0XHRcdH1cblx0XHRcdHJvdyArPSAnPC9kaXY+PC90ZD48L3RyPic7XG5cdFx0XHQkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5hcHBlbmQocm93KTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIHVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICogQHBhcmFtIHN1Y2Nlc3Ncblx0ICovXG5cdGNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyhyZXNwb25zZSwgc3VjY2Vzcykge1xuXHRcdGlmIChzdWNjZXNzPT09dHJ1ZSl7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGRpcnJ0eUZpZWxkLnZhbChNYXRoLnJhbmRvbSgpKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0fVxuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0cmV0dXJuIHNldHRpbmdzO1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0Y29uc3QgZm9ybURhdGEgPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdFBieEFwaS5MaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckZvcm1Qcm9jZXNzaW5nKTtcblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGxpY2Vuc2luZ01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0bGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=