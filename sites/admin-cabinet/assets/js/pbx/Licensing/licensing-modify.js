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
        UserMessage.showError(response.messages);
      }
    }

    return cbAfterFormProcessing;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = licensingModify.$formObj.form('get values');
      PbxApi.LicenseProcessUserRequest(result.data, licensingModify.cbAfterFormProcessing);
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {}

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiIsIiRjb3Vwb25TZWN0aW9uIiwiJGZvcm1FcnJvck1lc3NhZ2VzIiwiJGxpY0tleSIsIiRjb3Vwb24iLCIkZW1haWwiLCIkYWpheE1lc3NhZ2VzIiwiJGxpY2Vuc2VEZXRhaWxJbmZvIiwiJHJlc2V0QnV0dG9uIiwiJHByb2R1Y3REZXRhaWxzIiwiJGxpY2Vuc2luZ01lbnUiLCIkYWNjb3JkaW9ucyIsImRlZmF1bHRMaWNlbnNlS2V5IiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJhY2NvcmRpb24iLCJoaWRlIiwiaW5wdXRtYXNrIiwib25CZWZvcmVQYXN0ZSIsImNiT25Db3Vwb25CZWZvcmVQYXN0ZSIsIm9uY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlIiwib25pbmNvbXBsZXRlIiwiY2xlYXJJbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSIsInRhYiIsImhpc3RvcnlUeXBlIiwib24iLCJhZGRDbGFzcyIsIlBieEFwaSIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJjYkFmdGVyUmVzZXRMaWNlbnNlS2V5IiwiaW5pdGlhbGl6ZUZvcm0iLCJodG1sIiwic2hvdyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsImFmdGVyIiwibGljX0xpY2Vuc2VLZXlWYWxpZCIsIm1lc3NhZ2UiLCJsaWNlbnNlSW5mbyIsInNob3dMaWNlbnNlSW5mbyIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJhdHRyIiwiZW1wdHkiLCJyZW1vdmVBdHRyIiwicGFzdGVkVmFsdWUiLCJpbmRleE9mIiwidHJhbnNpdGlvbiIsInJlcGxhY2UiLCJsaWNlbnNlRGF0YSIsIkpTT04iLCJwYXJzZSIsInVuZGVmaW5lZCIsInRleHQiLCJ0ZWwiLCJwcm9kdWN0cyIsInByb2R1Y3QiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwia2V5IiwicHJvZHVjdFZhbHVlIiwicm93IiwiZGF0ZUV4cGlyZWQiLCJEYXRlIiwiZXhwaXJlZCIsImRhdGVOb3ciLCJuYW1lIiwibGljX0V4cGlyZWQiLCJ0cmlhbCIsImV4cGlyZWRUZXh0IiwibGljX0V4cGlyZWRBZnRlciIsImZlYXR1cmUiLCJmZWF0dXJlVmFsdWUiLCJmZWF0dXJlSW5mbyIsImxpY19GZWF0dXJlSW5mbyIsImNvdW50IiwiY291bnRlYWNoIiwiY2FwdHVyZWQiLCJhcHBlbmQiLCJjYkFmdGVyRm9ybVByb2Nlc3NpbmciLCJzdWNjZXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJyZXN1bHQiLCJkYXRhIiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBQSxDQUFDLENBQUNDLEVBQUYsQ0FBS0MsSUFBTCxDQUFVQyxRQUFWLENBQW1CQyxLQUFuQixDQUF5QkMsMkJBQXpCLEdBQXVELFVBQVVDLEtBQVYsRUFBaUI7QUFDdkUsU0FBUU4sQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhTyxHQUFiLEdBQW1CQyxNQUFuQixLQUE4QixFQUE5QixJQUFvQ0YsS0FBSyxDQUFDRSxNQUFOLEdBQWUsQ0FBM0Q7QUFDQSxDQUZEOztBQUlBLElBQU1DLGVBQWUsR0FBRztBQUN2QkMsRUFBQUEsUUFBUSxFQUFFVixDQUFDLENBQUMsd0JBQUQsQ0FEWTtBQUV2QlcsRUFBQUEsb0JBQW9CLEVBQUVYLENBQUMsQ0FBQyx5QkFBRCxDQUZBO0FBR3ZCWSxFQUFBQSxxQkFBcUIsRUFBRVosQ0FBQyxDQUFDLDBCQUFELENBSEQ7QUFJdkJhLEVBQUFBLHdCQUF3QixFQUFFYixDQUFDLENBQUMsMEJBQUQsQ0FKSjtBQUt2QmMsRUFBQUEsY0FBYyxFQUFFZCxDQUFDLENBQUMsZ0JBQUQsQ0FMTTtBQU12QmUsRUFBQUEsa0JBQWtCLEVBQUVmLENBQUMsQ0FBQyxzQkFBRCxDQU5FO0FBT3ZCZ0IsRUFBQUEsT0FBTyxFQUFFaEIsQ0FBQyxDQUFDLFNBQUQsQ0FQYTtBQVF2QmlCLEVBQUFBLE9BQU8sRUFBRWpCLENBQUMsQ0FBQyxTQUFELENBUmE7QUFTdkJrQixFQUFBQSxNQUFNLEVBQUVsQixDQUFDLENBQUMsUUFBRCxDQVRjO0FBVXZCbUIsRUFBQUEsYUFBYSxFQUFFbkIsQ0FBQyxDQUFDLGtCQUFELENBVk87QUFXdkJvQixFQUFBQSxrQkFBa0IsRUFBRXBCLENBQUMsQ0FBQyxvQkFBRCxDQVhFO0FBWXZCcUIs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R0FBTCxhQUFjQyxhQUFkO0FBQ0FGLE1BQUFBLElBQUksQ0FBQ3pHLGFBQUwsR0FBcUJqQixlQUFlLENBQUNpQixhQUFyQztBQUNBeUcsTUFBQUEsSUFBSSxDQUFDTCxnQkFBTCxHQUF3QnJILGVBQWUsQ0FBQ3FILGdCQUF4QztBQUNBSyxNQUFBQSxJQUFJLENBQUNELGVBQUwsR0FBdUJ6SCxlQUFlLENBQUN5SCxlQUF2QztBQUNBQyxNQUFBQSxJQUFJLENBQUN4RixVQUFMO0FBQ0E7O0FBblJzQjtBQUFBO0FBQUEsQ0FBeEI7QUFzUkEzQyxDQUFDLENBQUNzSSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCOUgsRUFBQUEsZUFBZSxDQUFDa0MsVUFBaEI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIHNlc3Npb25TdG9yYWdlICovXG5cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0cmV0dXJuICgkKCcjbGljS2V5JykudmFsKCkubGVuZ3RoID09PSAyOCB8fCB2YWx1ZS5sZW5ndGggPiAwKTtcbn07XG5cbmNvbnN0IGxpY2Vuc2luZ01vZGlmeSA9IHtcblx0JGZvcm1PYmo6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0nKSxcblx0JGVtcHR5TGljZW5zZUtleUluZm86ICQoJyNlbXB0eS1saWNlbnNlLWtleS1pbmZvJyksXG5cdCRmaWxsZWRMaWNlbnNlS2V5SW5mbzogJCgnI2ZpbGxlZC1saWNlbnNlLWtleS1pbmZvJyksXG5cdCRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbjogJCgnI2dldE5ld0tleUxpY2Vuc2VTZWN0aW9uJyksXG5cdCRjb3Vwb25TZWN0aW9uOiAkKCcjY291cG9uU2VjdGlvbicpLFxuXHQkZm9ybUVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG5cdCRsaWNLZXk6ICQoJyNsaWNLZXknKSxcblx0JGNvdXBvbjogJCgnI2NvdXBvbicpLFxuXHQkZW1haWw6ICQoJyNlbWFpbCcpLFxuXHQkYWpheE1lc3NhZ2VzOiAkKCcudWkubWVzc2FnZS5hamF4JyksXG5cdCRsaWNlbnNlRGV0YWlsSW5mbzogJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyksXG5cdCRyZXNldEJ1dHRvbjogJCgnI3Jlc2V0LWxpY2Vuc2UnKSxcblx0JHByb2R1Y3REZXRhaWxzOiAkKCcjcHJvZHVjdERldGFpbHMnKSxcblx0JGxpY2Vuc2luZ01lbnU6ICQoJyNsaWNlbnNpbmctbWVudSAuaXRlbScpLFxuXHQkYWNjb3JkaW9uczogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cdGRlZmF1bHRMaWNlbnNlS2V5OiBudWxsLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0Y29tcGFueW5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdjb21wYW55bmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRlbWFpbDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2VtYWlsJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0RW1haWwsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0Y29udGFjdDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2NvbnRhY3QnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGxpY0tleToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2xpY0tleScsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhhY3RMZW5ndGhbMjhdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0Y291cG9uOiB7XG5cdFx0XHRkZXBlbmRzOiAnbGljS2V5Jyxcblx0XHRcdGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ291cG9uRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcblx0XHRcdG9uQmVmb3JlUGFzdGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uQ291cG9uQmVmb3JlUGFzdGUsXG5cdFx0fSk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuXHRcdFx0b25jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG5cdFx0XHRvbmluY29tcGxldGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuXHRcdFx0Y2xlYXJJbmNvbXBsZXRlOiB0cnVlLFxuXHRcdFx0b25CZWZvcmVQYXN0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG5cdFx0fSk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKHtcblx0XHRcdGhpc3RvcnlUeXBlOiAnaGFzaCcsXG5cdFx0fSk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuJHJlc2V0QnV0dG9uLm9uKCdjbGljaycsKCk9Pntcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkobGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkpO1xuXHRcdH0pO1xuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuXG5cdFx0aWYgKGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleS5sZW5ndGggPT09IDI4KSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvXG5cdFx0XHRcdC5odG1sKGAke2xpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleX0gPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT5gKVxuXHRcdFx0XHQuc2hvdygpO1xuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKTtcblx0XHRcdFBieEFwaS5MaWNlbnNlR2V0TGljZW5zZUluZm8obGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uaGlkZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZW1wdHlMaWNlbnNlS2V5SW5mby5zaG93KCk7XG5cdFx0fVxuXG5cdFx0aWYgKGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleSAhPT0gJycpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoJ2NoYW5nZSB0YWInLCAnbWFuYWdlbWVudCcpO1xuXHRcdH1cblxuXG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzZW5kIFJlc2V0TGljZW5zZUtleSBjYWxsYmFja1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkocmVzcG9uc2Upe1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXHRcdGlmIChyZXNwb25zZSE9PWZhbHNlKSB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzZW5kIEdldExpY2Vuc2VJbmZvIGNhbGxiYWNrXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKHJlc3BvbnNlKXtcblx0XHQkKCcuc3Bpbm5lci5sb2FkaW5nLmljb24nKS5yZW1vdmUoKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGFqYXhNZXNzYWdlcy5yZW1vdmUoKTtcblx0XHRpZiAocmVzcG9uc2U9PT10cnVlKXtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnZXJyb3InKS5hZGRDbGFzcygnc3VjY2VzcycpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5hZnRlcihgPGRpdiBjbGFzcz1cInVpIHN1Y2Nlc3MgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJjaGVjayBncmVlbiBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5saWNfTGljZW5zZUtleVZhbGlkfTwvZGl2PmApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2Vycm9yJykucmVtb3ZlQ2xhc3MoJ3N1Y2Nlc3MnKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIHJlZCBpY29uXCI+PC9pPiAke3Jlc3BvbnNlLm1lc3NhZ2V9PC9kaXY+YCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBBZnRlciBzZW5kIEdldExpY2Vuc2VJbmZvIGNhbGxiYWNrXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JBZnRlckdldExpY2Vuc2VJbmZvKHJlc3BvbnNlKXtcblx0XHRpZiAocmVzcG9uc2UubGljZW5zZUluZm8gIT09ICdudWxsJykge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LnNob3dMaWNlbnNlSW5mbyhyZXNwb25zZS5saWNlbnNlSW5mbyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBPbiBjaGFuZ2UgbGljZW5zZSBrZXkgaW5wdXQgZmllbGRcblx0ICovXG5cdGNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKSB7XG5cdFx0Y29uc3QgbGljS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG5cdFx0aWYgKGxpY0tleS5sZW5ndGggPT09IDI4KSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdCQob2JqKS5hdHRyKCdoaWRkZW4nLCAnJyk7XG5cdFx0XHR9KTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uaGlkZSgpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb25TZWN0aW9uLnNob3coKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybUVycm9yTWVzc2FnZXMuZW1wdHkoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0XHQkKG9iaikucmVtb3ZlQXR0cignaGlkZGVuJyk7XG5cdFx0XHR9KTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZ2V0TmV3S2V5TGljZW5zZVNlY3Rpb24uc2hvdygpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb25TZWN0aW9uLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBhZnRlciBwYXN0ZSBsaWNlbnNlIGtleVxuXHQgKi9cblx0Y2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuXHRcdGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudHJhbnNpdGlvbignc2hha2UnKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuXHR9LFxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbGljZW5zZSBjb3Vwb25cblx0ICovXG5cdGNiT25Db3Vwb25CZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuXHRcdGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb24udHJhbnNpdGlvbignc2hha2UnKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuXHR9LFxuXHQvKipcblx0ICogUGFyc2VzIGFuZCBidWlsZHMgbGljZW5zZSBpbmZvIHByZXNlbnRhdGlvblxuXHQgKi9cblx0c2hvd0xpY2Vuc2VJbmZvKG1lc3NhZ2UpIHtcblx0XHRjb25zdCBsaWNlbnNlRGF0YSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG5cdFx0aWYgKGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JCgnI2tleS1jb21wYW55bmFtZScpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29tcGFueW5hbWUpO1xuXHRcdCQoJyNrZXktY29udGFjdCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uY29udGFjdCk7XG5cdFx0JCgnI2tleS1lbWFpbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10uZW1haWwpO1xuXHRcdCQoJyNrZXktdGVsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS50ZWwpO1xuXHRcdGxldCBwcm9kdWN0cyA9IGxpY2Vuc2VEYXRhLnByb2R1Y3Q7XG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KHByb2R1Y3RzKSkge1xuXHRcdFx0cHJvZHVjdHMgPSBbXTtcblx0XHRcdHByb2R1Y3RzLnB1c2gobGljZW5zZURhdGEucHJvZHVjdCk7XG5cdFx0fVxuXHRcdCQuZWFjaChwcm9kdWN0cywgKGtleSwgcHJvZHVjdFZhbHVlKSA9PiB7XG5cdFx0XHRsZXQgcm93ID0gJzx0cj48dGQ+Jztcblx0XHRcdGxldCBwcm9kdWN0ID0gcHJvZHVjdFZhbHVlO1xuXHRcdFx0aWYgKHByb2R1Y3RbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRwcm9kdWN0ID0gcHJvZHVjdFZhbHVlWydAYXR0cmlidXRlcyddO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZGF0ZUV4cGlyZWQgPSBuZXcgRGF0ZShwcm9kdWN0LmV4cGlyZWQucmVwbGFjZSgvKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkvLCAnJDEvJDIvJDMnKSk7XG5cdFx0XHRjb25zdCBkYXRlTm93ID0gbmV3IERhdGUoKTtcblx0XHRcdGlmIChkYXRlTm93ID4gZGF0ZUV4cGlyZWQpIHtcblx0XHRcdFx0cm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcblx0XHRcdH0gZWxzZSBpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA9PT0gMCAmJiBwcm9kdWN0LnRyaWFsID09PSAnMScpIHtcblx0XHRcdFx0cm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGlzYWJsZWQgc2VnbWVudFwiPiR7cHJvZHVjdC5uYW1lfTxicj5cblx0XHRcdFx0PHNtYWxsPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkfTwvc21hbGw+YDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj4ke3Byb2R1Y3QubmFtZX1gO1xuXHRcdFx0XHRpZiAocHJvZHVjdC5leHBpcmVkLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRsZXQgZXhwaXJlZFRleHQgPSBnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWRBZnRlcjtcblx0XHRcdFx0XHRleHBpcmVkVGV4dCA9IGV4cGlyZWRUZXh0LnJlcGxhY2UoJyVleHBpcmVkJScsIHByb2R1Y3QuZXhwaXJlZCk7XG5cdFx0XHRcdFx0cm93ICs9IGA8YnI+PHNtYWxsPiR7ZXhwaXJlZFRleHR9PC9zbWFsbD5gO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJvdyArPSAnPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4nO1xuXHRcdFx0XHQkLmVhY2gocHJvZHVjdFZhbHVlLmZlYXR1cmUsIChpbmRleCwgZmVhdHVyZVZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0bGV0IGZlYXR1cmVJbmZvID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19GZWF0dXJlSW5mbztcblx0XHRcdFx0XHRsZXQgZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZTtcblx0XHRcdFx0XHRpZiAoZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdGZlYXR1cmUgPSBmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJW5hbWUlJywgZmVhdHVyZS5uYW1lKTtcblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudCUnLCBmZWF0dXJlLmNvdW50KTtcblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjb3VudGVhY2glJywgZmVhdHVyZS5jb3VudGVhY2gpO1xuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNhcHR1cmVkJScsIGZlYXR1cmUuY2FwdHVyZWQpO1xuXHRcdFx0XHRcdHJvdyArPSBgJHtmZWF0dXJlSW5mb308YnI+YDtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJvdyArPSAnPC9zcGFuPic7XG5cdFx0XHR9XG5cdFx0XHRyb3cgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuXHRcdFx0JCgnI3Byb2R1Y3REZXRhaWxzIHRib2R5JykuYXBwZW5kKHJvdyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciB1cGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqIEBwYXJhbSBzdWNjZXNzXG5cdCAqL1xuXHRjYkFmdGVyRm9ybVByb2Nlc3NpbmcocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcblx0XHRpZiAoc3VjY2Vzcz09PXRydWUpe1xuXHRcdFx0d2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXMpXG5cdFx0fVxuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdFBieEFwaS5MaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KHJlc3VsdC5kYXRhLCBsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckZvcm1Qcm9jZXNzaW5nKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGxpY2Vuc2luZ01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0bGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=