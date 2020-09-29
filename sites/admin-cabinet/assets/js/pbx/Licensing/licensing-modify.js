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
        history: true,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiIsIiRjb3Vwb25TZWN0aW9uIiwiJGZvcm1FcnJvck1lc3NhZ2VzIiwiJGxpY0tleSIsIiRjb3Vwb24iLCIkZW1haWwiLCIkYWpheE1lc3NhZ2VzIiwiJGxpY2Vuc2VEZXRhaWxJbmZvIiwiJHJlc2V0QnV0dG9uIiwiJHByb2R1Y3REZXRhaWxzIiwiJGxpY2Vuc2luZ01lbnUiLCIkYWNjb3JkaW9ucyIsImRlZmF1bHRMaWNlbnNlS2V5IiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJhY2NvcmRpb24iLCJoaWRlIiwiaW5wdXRtYXNrIiwib25CZWZvcmVQYXN0ZSIsImNiT25Db3Vwb25CZWZvcmVQYXN0ZSIsIm9uY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlIiwib25pbmNvbXBsZXRlIiwiY2xlYXJJbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm9uIiwiYWRkQ2xhc3MiLCJQYnhBcGkiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiY2JBZnRlclJlc2V0TGljZW5zZUtleSIsImluaXRpYWxpemVGb3JtIiwiaHRtbCIsInNob3ciLCJMaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJjYkFmdGVyR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJMaWNlbnNlR2V0TGljZW5zZUluZm8iLCJjYkFmdGVyR2V0TGljZW5zZUluZm8iLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmUiLCJhZnRlciIsImxpY19MaWNlbnNlS2V5VmFsaWQiLCJtZXNzYWdlIiwibGljZW5zZUluZm8iLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiYXR0ciIsImVtcHR5IiwicmVtb3ZlQXR0ciIsInBhc3RlZFZhbHVlIiwiaW5kZXhPZiIsInRyYW5zaXRpb24iLCJyZXBsYWNlIiwibGljZW5zZURhdGEiLCJKU09OIiwicGFyc2UiLCJ1bmRlZmluZWQiLCJ0ZXh0IiwidGVsIiwicHJvZHVjdHMiLCJwcm9kdWN0IiwiQXJyYXkiLCJpc0FycmF5IiwicHVzaCIsImtleSIsInByb2R1Y3RWYWx1ZSIsInJvdyIsImRhdGVFeHBpcmVkIiwiRGF0ZSIsImV4cGlyZWQiLCJkYXRlTm93IiwibmFtZSIsImxpY19FeHBpcmVkIiwidHJpYWwiLCJleHBpcmVkVGV4dCIsImxpY19FeHBpcmVkQWZ0ZXIiLCJmZWF0dXJlIiwiZmVhdHVyZVZhbHVlIiwiZmVhdHVyZUluZm8iLCJsaWNfRmVhdHVyZUluZm8iLCJjb3VudCIsImNvdW50ZWFjaCIsImNhcHR1cmVkIiwiYXBwZW5kIiwiY2JBZnRlckZvcm1Qcm9jZXNzaW5nIiwic3VjY2VzcyIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJjYkJlZm9yZVNlbmRGb3JtIiwicmVzdWx0IiwiZGF0YSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQUEsQ0FBQyxDQUFDQyxFQUFGLENBQUtDLElBQUwsQ0FBVUMsUUFBVixDQUFtQkMsS0FBbkIsQ0FBeUJDLDJCQUF6QixHQUF1RCxVQUFVQyxLQUFWLEVBQWlCO0FBQ3ZFLFNBQVFOLENBQUMsQ0FBQyxTQUFELENBQUQsQ0FBYU8sR0FBYixHQUFtQkMsTUFBbkIsS0FBOEIsRUFBOUIsSUFBb0NGLEtBQUssQ0FBQ0UsTUFBTixHQUFlLENBQTNEO0FBQ0EsQ0FGRDs7QUFJQSxJQUFNQyxlQUFlLEdBQUc7QUFDdkJDLEVBQUFBLFFBQVEsRUFBRVYsQ0FBQyxDQUFDLHdCQUFELENBRFk7QUFFdkJXLEVBQUFBLG9CQUFvQixFQUFFWCxDQUFDLENBQUMseUJBQUQsQ0FGQTtBQUd2QlksRUFBQUEscUJBQXFCLEVBQUVaLENBQUMsQ0FBQywwQkFBRCxDQUhEO0FBSXZCYSxFQUFBQSx3QkFBd0IsRUFBRWIsQ0FBQyxDQUFDLDBCQUFELENBSko7QUFLdkJjLEVBQUFBLGNBQWMsRUFBRWQsQ0FBQyxDQUFDLGdCQUFELENBTE07QUFNdkJlLEVBQUFBLGtCQUFrQixFQUFFZixDQUFDLENBQUMsc0JBQUQsQ0FORTtBQU92QmdCLEVBQUFBLE9BQU8sRUFBRWhCLENBQUMsQ0FBQyxTQUFELENBUGE7QUFRdkJpQixFQUFBQSxPQUFPLEVBQUVqQixDQUFDLENBQUMsU0FBRCxDQVJhO0FBU3ZCa0IsRUFBQUEsTUFBTSxFQUFFbEIsQ0FBQyxDQUFDLFFBQUQsQ0FUYztBQVV2Qm1CLEVBQUFBLGFBQWEsRUFBRW5CLENBQUMsQ0FBQyxrQkFBRCxDQVZPO0FBV3ZCb0IsRUFBQUEsa0JBQWtCLEVBQUVwQixDQUFDLENBQUMsb0JBQUQsQ0FY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QWUsQ0FBQ0MsUUFBaEM7QUFDQTBILE1BQUFBLElBQUksQ0FBQ0MsR0FBTCxhQUFjQyxhQUFkO0FBQ0FGLE1BQUFBLElBQUksQ0FBQzFHLGFBQUwsR0FBcUJqQixlQUFlLENBQUNpQixhQUFyQztBQUNBMEcsTUFBQUEsSUFBSSxDQUFDTCxnQkFBTCxHQUF3QnRILGVBQWUsQ0FBQ3NILGdCQUF4QztBQUNBSyxNQUFBQSxJQUFJLENBQUNELGVBQUwsR0FBdUIxSCxlQUFlLENBQUMwSCxlQUF2QztBQUNBQyxNQUFBQSxJQUFJLENBQUN6RixVQUFMO0FBQ0E7O0FBcFJzQjtBQUFBO0FBQUEsQ0FBeEI7QUF1UkEzQyxDQUFDLENBQUN1SSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCL0gsRUFBQUEsZUFBZSxDQUFDa0MsVUFBaEI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIHNlc3Npb25TdG9yYWdlICovXG5cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHkgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0cmV0dXJuICgkKCcjbGljS2V5JykudmFsKCkubGVuZ3RoID09PSAyOCB8fCB2YWx1ZS5sZW5ndGggPiAwKTtcbn07XG5cbmNvbnN0IGxpY2Vuc2luZ01vZGlmeSA9IHtcblx0JGZvcm1PYmo6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0nKSxcblx0JGVtcHR5TGljZW5zZUtleUluZm86ICQoJyNlbXB0eS1saWNlbnNlLWtleS1pbmZvJyksXG5cdCRmaWxsZWRMaWNlbnNlS2V5SW5mbzogJCgnI2ZpbGxlZC1saWNlbnNlLWtleS1pbmZvJyksXG5cdCRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbjogJCgnI2dldE5ld0tleUxpY2Vuc2VTZWN0aW9uJyksXG5cdCRjb3Vwb25TZWN0aW9uOiAkKCcjY291cG9uU2VjdGlvbicpLFxuXHQkZm9ybUVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG5cdCRsaWNLZXk6ICQoJyNsaWNLZXknKSxcblx0JGNvdXBvbjogJCgnI2NvdXBvbicpLFxuXHQkZW1haWw6ICQoJyNlbWFpbCcpLFxuXHQkYWpheE1lc3NhZ2VzOiAkKCcudWkubWVzc2FnZS5hamF4JyksXG5cdCRsaWNlbnNlRGV0YWlsSW5mbzogJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyksXG5cdCRyZXNldEJ1dHRvbjogJCgnI3Jlc2V0LWxpY2Vuc2UnKSxcblx0JHByb2R1Y3REZXRhaWxzOiAkKCcjcHJvZHVjdERldGFpbHMnKSxcblx0JGxpY2Vuc2luZ01lbnU6ICQoJyNsaWNlbnNpbmctbWVudSAuaXRlbScpLFxuXHQkYWNjb3JkaW9uczogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cdGRlZmF1bHRMaWNlbnNlS2V5OiBudWxsLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0Y29tcGFueW5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdjb21wYW55bmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRlbWFpbDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2VtYWlsJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0RW1haWwsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0Y29udGFjdDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2NvbnRhY3QnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGxpY0tleToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2xpY0tleScsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhhY3RMZW5ndGhbMjhdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0Y291cG9uOiB7XG5cdFx0XHRkZXBlbmRzOiAnbGljS2V5Jyxcblx0XHRcdGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ291cG9uRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcblx0XHRcdG9uQmVmb3JlUGFzdGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uQ291cG9uQmVmb3JlUGFzdGUsXG5cdFx0fSk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuXHRcdFx0b25jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG5cdFx0XHRvbmluY29tcGxldGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuXHRcdFx0Y2xlYXJJbmNvbXBsZXRlOiB0cnVlLFxuXHRcdFx0b25CZWZvcmVQYXN0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG5cdFx0fSk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKHtcblx0XHRcdGhpc3Rvcnk6IHRydWUsXG5cdFx0XHRoaXN0b3J5VHlwZTogJ2hhc2gnLFxuXHRcdH0pO1xuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRyZXNldEJ1dHRvbi5vbignY2xpY2snLCgpPT57XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblx0XHRcdFBieEFwaS5MaWNlbnNlUmVzZXRMaWNlbnNlS2V5KGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyUmVzZXRMaWNlbnNlS2V5KTtcblx0XHR9KTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblxuXHRcdGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkubGVuZ3RoID09PSAyOCkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mb1xuXHRcdFx0XHQuaHRtbChgJHtsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXl9IDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+YClcblx0XHRcdFx0LnNob3coKTtcblx0XHRcdFBieEFwaS5MaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMobGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyk7XG5cdFx0XHRQYnhBcGkuTGljZW5zZUdldExpY2Vuc2VJbmZvKGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyR2V0TGljZW5zZUluZm8pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuXHRcdH1cblxuXHRcdGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgIT09ICcnKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKCdjaGFuZ2UgdGFiJywgJ21hbmFnZW1lbnQnKTtcblx0XHR9XG5cblxuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgc2VuZCBSZXNldExpY2Vuc2VLZXkgY2FsbGJhY2tcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkFmdGVyUmVzZXRMaWNlbnNlS2V5KHJlc3BvbnNlKXtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblx0XHRpZiAocmVzcG9uc2UhPT1mYWxzZSkgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgc2VuZCBHZXRMaWNlbnNlSW5mbyBjYWxsYmFja1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhyZXNwb25zZSl7XG5cdFx0JCgnLnNwaW5uZXIubG9hZGluZy5pY29uJykucmVtb3ZlKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRhamF4TWVzc2FnZXMucmVtb3ZlKCk7XG5cdFx0aWYgKHJlc3BvbnNlPT09dHJ1ZSl7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ3N1Y2Nlc3MnKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBzdWNjZXNzIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiY2hlY2sgZ3JlZW4gaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VLZXlWYWxpZH08L2Rpdj5gKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdlcnJvcicpLnJlbW92ZUNsYXNzKCdzdWNjZXNzJyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSByZWQgaWNvblwiPjwvaT4gJHtyZXNwb25zZS5tZXNzYWdlfTwvZGl2PmApO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogQWZ0ZXIgc2VuZCBHZXRMaWNlbnNlSW5mbyBjYWxsYmFja1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyhyZXNwb25zZSl7XG5cdFx0aWYgKHJlc3BvbnNlLmxpY2Vuc2VJbmZvICE9PSAnbnVsbCcpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS5zaG93TGljZW5zZUluZm8ocmVzcG9uc2UubGljZW5zZUluZm8pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogT24gY2hhbmdlIGxpY2Vuc2Uga2V5IGlucHV0IGZpZWxkXG5cdCAqL1xuXHRjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCkge1xuXHRcdGNvbnN0IGxpY0tleSA9IGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpO1xuXHRcdGlmIChsaWNLZXkubGVuZ3RoID09PSAyOCkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0XHQkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuXHRcdFx0fSk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLmhpZGUoKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uU2VjdGlvbi5zaG93KCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1FcnJvck1lc3NhZ2VzLmVtcHR5KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdFx0JChvYmopLnJlbW92ZUF0dHIoJ2hpZGRlbicpO1xuXHRcdFx0fSk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLnNob3coKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uU2VjdGlvbi5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbGljZW5zZSBrZXlcblx0ICovXG5cdGNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcblx0XHRpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLTy0nKSA9PT0gLTEpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcblx0fSxcblx0LyoqXG5cdCAqIENhbGxiYWNrIGFmdGVyIHBhc3RlIGxpY2Vuc2UgY291cG9uXG5cdCAqL1xuXHRjYk9uQ291cG9uQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcblx0XHRpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLT1VQRC0nKSA9PT0gLTEpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcblx0fSxcblx0LyoqXG5cdCAqIFBhcnNlcyBhbmQgYnVpbGRzIGxpY2Vuc2UgaW5mbyBwcmVzZW50YXRpb25cblx0ICovXG5cdHNob3dMaWNlbnNlSW5mbyhtZXNzYWdlKSB7XG5cdFx0Y29uc3QgbGljZW5zZURhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuXHRcdGlmIChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdCQoJyNrZXktY29tcGFueW5hbWUnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbXBhbnluYW1lKTtcblx0XHQkKCcja2V5LWNvbnRhY3QnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbnRhY3QpO1xuXHRcdCQoJyNrZXktZW1haWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmVtYWlsKTtcblx0XHQkKCcja2V5LXRlbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10udGVsKTtcblx0XHRsZXQgcHJvZHVjdHMgPSBsaWNlbnNlRGF0YS5wcm9kdWN0O1xuXHRcdGlmICghQXJyYXkuaXNBcnJheShwcm9kdWN0cykpIHtcblx0XHRcdHByb2R1Y3RzID0gW107XG5cdFx0XHRwcm9kdWN0cy5wdXNoKGxpY2Vuc2VEYXRhLnByb2R1Y3QpO1xuXHRcdH1cblx0XHQkLmVhY2gocHJvZHVjdHMsIChrZXksIHByb2R1Y3RWYWx1ZSkgPT4ge1xuXHRcdFx0bGV0IHJvdyA9ICc8dHI+PHRkPic7XG5cdFx0XHRsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcblx0XHRcdGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cHJvZHVjdCA9IHByb2R1Y3RWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGRhdGVFeHBpcmVkID0gbmV3IERhdGUocHJvZHVjdC5leHBpcmVkLnJlcGxhY2UoLyhcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pLywgJyQxLyQyLyQzJykpO1xuXHRcdFx0Y29uc3QgZGF0ZU5vdyA9IG5ldyBEYXRlKCk7XG5cdFx0XHRpZiAoZGF0ZU5vdyA+IGRhdGVFeHBpcmVkKSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG5cdFx0XHR9IGVsc2UgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPT09IDAgJiYgcHJvZHVjdC50cmlhbCA9PT0gJzEnKSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+JHtwcm9kdWN0Lm5hbWV9YDtcblx0XHRcdFx0aWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0bGV0IGV4cGlyZWRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkQWZ0ZXI7XG5cdFx0XHRcdFx0ZXhwaXJlZFRleHQgPSBleHBpcmVkVGV4dC5yZXBsYWNlKCclZXhwaXJlZCUnLCBwcm9kdWN0LmV4cGlyZWQpO1xuXHRcdFx0XHRcdHJvdyArPSBgPGJyPjxzbWFsbD4ke2V4cGlyZWRUZXh0fTwvc21hbGw+YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRyb3cgKz0gJzxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+Jztcblx0XHRcdFx0JC5lYWNoKHByb2R1Y3RWYWx1ZS5mZWF0dXJlLCAoaW5kZXgsIGZlYXR1cmVWYWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGxldCBmZWF0dXJlSW5mbyA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRmVhdHVyZUluZm87XG5cdFx0XHRcdFx0bGV0IGZlYXR1cmUgPSBmZWF0dXJlVmFsdWU7XG5cdFx0XHRcdFx0aWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVuYW1lJScsIGZlYXR1cmUubmFtZSk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnQlJywgZmVhdHVyZS5jb3VudCk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnRlYWNoJScsIGZlYXR1cmUuY291bnRlYWNoKTtcblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjYXB0dXJlZCUnLCBmZWF0dXJlLmNhcHR1cmVkKTtcblx0XHRcdFx0XHRyb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyb3cgKz0gJzwvc3Bhbj4nO1xuXHRcdFx0fVxuXHRcdFx0cm93ICs9ICc8L2Rpdj48L3RkPjwvdHI+Jztcblx0XHRcdCQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmFwcGVuZChyb3cpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgdXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKiBAcGFyYW0gc3VjY2Vzc1xuXHQgKi9cblx0Y2JBZnRlckZvcm1Qcm9jZXNzaW5nKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG5cdFx0aWYgKHN1Y2Nlc3M9PT10cnVlKXtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzKVxuXHRcdH1cblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRQYnhBcGkuTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdChyZXN1bHQuZGF0YSwgbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBsaWNlbnNpbmdNb2RpZnkudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBsaWNlbnNpbmdNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGxpY2Vuc2luZ01vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19