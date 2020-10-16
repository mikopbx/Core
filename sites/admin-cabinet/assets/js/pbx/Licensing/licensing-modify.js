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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZGlycnR5RmllbGQiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbiIsIiRjb3Vwb25TZWN0aW9uIiwiJGZvcm1FcnJvck1lc3NhZ2VzIiwiJGxpY0tleSIsIiRjb3Vwb24iLCIkZW1haWwiLCIkYWpheE1lc3NhZ2VzIiwiJGxpY2Vuc2VEZXRhaWxJbmZvIiwiJHJlc2V0QnV0dG9uIiwiJHByb2R1Y3REZXRhaWxzIiwiJGxpY2Vuc2luZ01lbnUiLCIkYWNjb3JkaW9ucyIsImRlZmF1bHRMaWNlbnNlS2V5IiwidmFsaWRhdGVSdWxlcyIsImNvbXBhbnluYW1lIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJsaWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5IiwiZW1haWwiLCJsaWNfVmFsaWRhdGVDb250YWN0RW1haWwiLCJjb250YWN0IiwibGljX1ZhbGlkYXRlQ29udGFjdE5hbWUiLCJsaWNLZXkiLCJvcHRpb25hbCIsImxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSIsImNvdXBvbiIsImRlcGVuZHMiLCJsaWNfVmFsaWRhdGVDb3Vwb25FbXB0eSIsImluaXRpYWxpemUiLCJhY2NvcmRpb24iLCJoaWRlIiwiaW5wdXRtYXNrIiwib25CZWZvcmVQYXN0ZSIsImNiT25Db3Vwb25CZWZvcmVQYXN0ZSIsIm9uY29tcGxldGUiLCJjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlIiwib25pbmNvbXBsZXRlIiwiY2xlYXJJbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSIsInRhYiIsImhpc3RvcnlUeXBlIiwib24iLCJhZGRDbGFzcyIsIlBieEFwaSIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJjYkFmdGVyUmVzZXRMaWNlbnNlS2V5IiwiaW5pdGlhbGl6ZUZvcm0iLCJodG1sIiwic2hvdyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImNiQWZ0ZXJHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZSIsImFmdGVyIiwibGljX0xpY2Vuc2VLZXlWYWxpZCIsIm1lc3NhZ2VzIiwibGljZW5zZUluZm8iLCJzaG93TGljZW5zZUluZm8iLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwiYXR0ciIsImVtcHR5IiwicmVtb3ZlQXR0ciIsInBhc3RlZFZhbHVlIiwiaW5kZXhPZiIsInRyYW5zaXRpb24iLCJyZXBsYWNlIiwibWVzc2FnZSIsImxpY2Vuc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwidW5kZWZpbmVkIiwidGV4dCIsInRlbCIsInByb2R1Y3RzIiwicHJvZHVjdCIsIkFycmF5IiwiaXNBcnJheSIsInB1c2giLCJrZXkiLCJwcm9kdWN0VmFsdWUiLCJyb3ciLCJkYXRlRXhwaXJlZCIsIkRhdGUiLCJleHBpcmVkIiwiZGF0ZU5vdyIsIm5hbWUiLCJsaWNfRXhwaXJlZCIsInRyaWFsIiwiZXhwaXJlZFRleHQiLCJsaWNfRXhwaXJlZEFmdGVyIiwiZmVhdHVyZSIsImZlYXR1cmVWYWx1ZSIsImZlYXR1cmVJbmZvIiwibGljX0ZlYXR1cmVJbmZvIiwiY291bnQiLCJjb3VudGVhY2giLCJjYXB0dXJlZCIsImFwcGVuZCIsImNiQWZ0ZXJGb3JtUHJvY2Vzc2luZyIsInN1Y2Nlc3MiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvcm1EYXRhIiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBQSxDQUFDLENBQUNDLEVBQUYsQ0FBS0MsSUFBTCxDQUFVQyxRQUFWLENBQW1CQyxLQUFuQixDQUF5QkMsMkJBQXpCLEdBQXVELFVBQVVDLEtBQVYsRUFBaUI7QUFDdkUsU0FBUU4sQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhTyxHQUFiLEdBQW1CQyxNQUFuQixLQUE4QixFQUE5QixJQUFvQ0YsS0FBSyxDQUFDRSxNQUFOLEdBQWUsQ0FBM0Q7QUFDQSxDQUZEOztBQUlBLElBQU1DLGVBQWUsR0FBRztBQUN2QkMsRUFBQUEsUUFBUSxFQUFFVixDQUFDLENBQUMsd0JBQUQsQ0FEWTtBQUV2QlcsRUFBQUEsWUFBWSxFQUFFWCxDQUFDLENBQUMsU0FBRCxDQUZRO0FBR3ZCWSxFQUFBQSxvQkFBb0IsRUFBRVosQ0FBQyxDQUFDLHlCQUFELENBSEE7QUFJdkJhLEVBQUFBLHFCQUFxQixFQUFFYixDQUFDLENBQUMsMEJBQUQsQ0FKRDtBQUt2QmMsRUFBQUEsd0JBQXdCLEVBQUVkLENBQUMsQ0FBQywwQkFBRCxDQUxKO0FBTXZCZSxFQUFBQSxjQUFjLEVBQUVmLENBQUMsQ0FBQyxnQkFBRCxDQU5NO0FBT3ZCZ0IsRUFBQUEsa0JBQWtCLEVBQUVoQixDQUFDLENBQUMsc0JBQUQsQ0FQRTtBQVF2QmlCLEVBQUFBLE9BQU8sRUFBRWpCLENBQUMsQ0FBQyxTQUFELENBUmE7QUFTdkJrQixFQUFBQSxPQUFPLEVBQUVsQixDQUFDLENBQUMsU0FBRCxDQVRhO0FBVXZCbUIsRUFBQUEsTUFBTSxFQUFFbkIsQ0FBQyxDQUFDLFFBQUQsQ0FWYztBQVd2Qm9CLEVBQUFBLGFBQWEsRUFBRXBCLENBQUMsQ0FBQyxrQkFBRCxDQVhPO0FBWXZCcUIsRUFBQUEsa0JBQWtCLEVBQUVyQixDQUFDLENBQUMsb0JBQUQsQ0FaRTtBQWF2QnNCLEVBQUFBLFlBQVksRUFBRXRCLENBQUMsQ0FBQyxnQkFBRCxDQWJRO0FBY3ZCdUIsRUFBQUEsZUFBZSxFQUFFdkIsQ0FBQyxDQUFDLGlCQUFELENBZEs7QUFldkJ3QixFQUFBQSxjQUFjLEVBQUV4QixDQUFDLENBQUMsdUJBQUQsQ0FmTTtBQWdCdkJ5QixFQUFBQSxXQUFXLEVBQUV6QixDQUFDLENBQUMsc0NBQUQsQ0FoQlM7QUFpQnZCMEIsRUFBQUEsaUJBQWlCLEVBQUUsSUFqQkk7QUFrQnZCQyxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1pDLE1BQUFBLFVBQVUsRUFBRSxhQURBO0FBRVp6QixNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDMEIsUUFBQUEsSUFBSSxFQUFFLDZCQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUZ6QixPQURNO0FBRkssS0FEQztBQVVkQyxJQUFBQSxLQUFLLEVBQUU7QUFDTkwsTUFBQUEsVUFBVSxFQUFFLE9BRE47QUFFTnpCLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0MwQixRQUFBQSxJQUFJLEVBQUUsNkJBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRnpCLE9BRE07QUFGRCxLQVZPO0FBbUJkQyxJQUFBQSxPQUFPLEVBQUU7QUFDUlAsTUFBQUEsVUFBVSxFQUFFLFNBREo7QUFFUnpCLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0MwQixRQUFBQSxJQUFJLEVBQUUsNkJBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNLO0FBRnpCLE9BRE07QUFGQyxLQW5CSztBQTRCZEMsSUFBQUEsTUFBTSxFQUFFO0FBQ1BULE1BQUFBLFVBQVUsRUFBRSxRQURMO0FBRVBVLE1BQUFBLFFBQVEsRUFBRSxJQUZIO0FBR1BuQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDMEIsUUFBQUEsSUFBSSxFQUFFLGlCQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDUTtBQUZ6QixPQURNO0FBSEEsS0E1Qk07QUFzQ2RDLElBQUFBLE1BQU0sRUFBRTtBQUNQQyxNQUFBQSxPQUFPLEVBQUUsUUFERjtBQUVQYixNQUFBQSxVQUFVLEVBQUUsUUFGTDtBQUdQVSxNQUFBQSxRQUFRLEVBQUUsSUFISDtBQUlQbkMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQzBCLFFBQUFBLElBQUksRUFBRSxpQkFEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1c7QUFGekIsT0FETTtBQUpBO0FBdENNLEdBbEJRO0FBb0V2QkMsRUFBQUEsVUFwRXVCO0FBQUEsMEJBb0VWO0FBQ1puQyxNQUFBQSxlQUFlLENBQUNnQixXQUFoQixDQUE0Qm9CLFNBQTVCO0FBQ0FwQyxNQUFBQSxlQUFlLENBQUNZLGtCQUFoQixDQUFtQ3lCLElBQW5DO0FBQ0FyQyxNQUFBQSxlQUFlLENBQUNTLE9BQWhCLENBQXdCNkIsU0FBeEIsQ0FBa0MsaUNBQWxDLEVBQXFFO0FBQ3BFQyxRQUFBQSxhQUFhLEVBQUV2QyxlQUFlLENBQUN3QztBQURxQyxPQUFyRTtBQUdBeEMsTUFBQUEsZUFBZSxDQUFDUSxPQUFoQixDQUF3QjhCLFNBQXhCLENBQWtDLDhCQUFsQyxFQUFrRTtBQUNqRUcsUUFBQUEsVUFBVSxFQUFFekMsZUFBZSxDQUFDMEMseUJBRHFDO0FBRWpFQyxRQUFBQSxZQUFZLEVBQUUzQyxlQUFlLENBQUMwQyx5QkFGbUM7QUFHakVFLFFBQUFBLGVBQWUsRUFBRSxJQUhnRDtBQUlqRUwsUUFBQUEsYUFBYSxFQUFFdkMsZUFBZSxDQUFDNkM7QUFKa0MsT0FBbEU7QUFNQTdDLE1BQUFBLGVBQWUsQ0FBQ1UsTUFBaEIsQ0FBdUI0QixTQUF2QixDQUFpQyxPQUFqQztBQUNBdEMsTUFBQUEsZUFBZSxDQUFDaUIsaUJBQWhCLEdBQW9DakIsZUFBZSxDQUFDUSxPQUFoQixDQUF3QlYsR0FBeEIsRUFBcEM7QUFFQUUsTUFBQUEsZUFBZSxDQUFDZSxjQUFoQixDQUErQitCLEdBQS9CLENBQW1DO0FBQ2xDQyxRQUFBQSxXQUFXLEVBQUU7QUFEcUIsT0FBbkM7QUFJQS9DLE1BQUFBLGVBQWUsQ0FBQ2EsWUFBaEIsQ0FBNkJtQyxFQUE3QixDQUFnQyxPQUFoQyxFQUF3QyxZQUFJO0FBQzNDaEQsUUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QmdELFFBQXpCLENBQWtDLGtCQUFsQztBQUNBQyxRQUFBQSxNQUFNLENBQUNDLHNCQUFQLENBQThCbkQsZUFBZSxDQUFDb0Qsc0JBQTlDO0FBQ0EsT0FIRDtBQUtBcEQsTUFBQUEsZUFBZSxDQUFDMEMseUJBQWhCO0FBRUExQyxNQUFBQSxlQUFlLENBQUNxRCxjQUFoQjs7QUFFQSxVQUFJckQsZUFBZSxDQUFDaUIsaUJBQWhCLENBQWtDbEIsTUFBbEMsS0FBNkMsRUFBakQsRUFBcUQ7QUFDcERDLFFBQUFBLGVBQWUsQ0FBQ0kscUJBQWhCLENBQ0VrRCxJQURGLFdBQ1V0RCxlQUFlLENBQUNpQixpQkFEMUIsOENBRUVzQyxJQUZGO0FBR0FMLFFBQUFBLE1BQU0sQ0FBQ00sOEJBQVAsQ0FBc0N4RCxlQUFlLENBQUN5RCw4QkFBdEQ7QUFDQVAsUUFBQUEsTUFBTSxDQUFDUSxxQkFBUCxDQUE2QjFELGVBQWUsQ0FBQzJELHFCQUE3QztBQUNBM0QsUUFBQUEsZUFBZSxDQUFDRyxvQkFBaEIsQ0FBcUNrQyxJQUFyQztBQUNBLE9BUEQsTUFPTztBQUNOckMsUUFBQUEsZUFBZSxDQUFDSSxxQkFBaEIsQ0FBc0NpQyxJQUF0QztBQUNBckMsUUFBQUEsZUFBZSxDQUFDRyxvQkFBaEIsQ0FBcUNvRCxJQUFyQztBQUNBOztBQUVELFVBQUl2RCxlQUFlLENBQUNpQixpQkFBaEIsS0FBc0MsRUFBMUMsRUFBOEM7QUFDN0NqQixRQUFBQSxlQUFlLENBQUNlLGNBQWhCLENBQStCK0IsR0FBL0IsQ0FBbUMsWUFBbkMsRUFBaUQsWUFBakQ7QUFDQTtBQUdEOztBQWpIc0I7QUFBQTs7QUFrSHZCOzs7O0FBSUFNLEVBQUFBLHNCQXRIdUI7QUFBQSxvQ0FzSEFRLFFBdEhBLEVBc0hTO0FBQy9CNUQsTUFBQUEsZUFBZSxDQUFDQyxRQUFoQixDQUF5QjRELFdBQXpCLENBQXFDLGtCQUFyQztBQUNBLFVBQUlELFFBQVEsS0FBRyxLQUFmLEVBQXNCRSxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLE1BQWhCO0FBQ3RCOztBQXpIc0I7QUFBQTs7QUEwSHZCOzs7O0FBSUFQLEVBQUFBLDhCQTlIdUI7QUFBQSw0Q0E4SFFHLFFBOUhSLEVBOEhpQjtBQUN2Q3JFLE1BQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCMEUsTUFBM0I7QUFDQWpFLE1BQUFBLGVBQWUsQ0FBQ1csYUFBaEIsQ0FBOEJzRCxNQUE5Qjs7QUFDQSxVQUFJTCxRQUFRLEtBQUcsSUFBZixFQUFvQjtBQUNuQjVELFFBQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUI0RCxXQUF6QixDQUFxQyxPQUFyQyxFQUE4Q1osUUFBOUMsQ0FBdUQsU0FBdkQ7QUFDQWpELFFBQUFBLGVBQWUsQ0FBQ0kscUJBQWhCLENBQXNDOEQsS0FBdEMscUZBQXFIM0MsZUFBZSxDQUFDNEMsbUJBQXJJO0FBQ0EsT0FIRCxNQUdPO0FBQ05uRSxRQUFBQSxlQUFlLENBQUNDLFFBQWhCLENBQXlCZ0QsUUFBekIsQ0FBa0MsT0FBbEMsRUFBMkNZLFdBQTNDLENBQXVELFNBQXZEO0FBQ0E3RCxRQUFBQSxlQUFlLENBQUNJLHFCQUFoQixDQUFzQzhELEtBQXRDLGdHQUFnSU4sUUFBUSxDQUFDUSxRQUF6STtBQUNBO0FBQ0Q7O0FBeElzQjtBQUFBOztBQTBJdkI7Ozs7QUFJQVQsRUFBQUEscUJBOUl1QjtBQUFBLG1DQThJREMsUUE5SUMsRUE4SVE7QUFDOUIsVUFBSUEsUUFBUSxDQUFDUyxXQUFULEtBQXlCLE1BQTdCLEVBQXFDO0FBQ3BDckUsUUFBQUEsZUFBZSxDQUFDc0UsZUFBaEIsQ0FBZ0NWLFFBQVEsQ0FBQ1MsV0FBekM7QUFDQXJFLFFBQUFBLGVBQWUsQ0FBQ1ksa0JBQWhCLENBQW1DMkMsSUFBbkM7QUFDQSxPQUhELE1BR087QUFDTnZELFFBQUFBLGVBQWUsQ0FBQ1ksa0JBQWhCLENBQW1DeUIsSUFBbkM7QUFDQTtBQUNEOztBQXJKc0I7QUFBQTs7QUF1SnZCOzs7QUFHQUssRUFBQUEseUJBMUp1QjtBQUFBLHlDQTBKSztBQUMzQixVQUFNYixNQUFNLEdBQUc3QixlQUFlLENBQUNRLE9BQWhCLENBQXdCVixHQUF4QixFQUFmOztBQUNBLFVBQUkrQixNQUFNLENBQUM5QixNQUFQLEtBQWtCLEVBQXRCLEVBQTBCO0FBQ3pCQyxRQUFBQSxlQUFlLENBQUNDLFFBQWhCLENBQXlCc0UsSUFBekIsQ0FBOEIsZ0JBQTlCLEVBQWdEQyxJQUFoRCxDQUFxRCxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDcEVuRixVQUFBQSxDQUFDLENBQUNtRixHQUFELENBQUQsQ0FBT0MsSUFBUCxDQUFZLFFBQVosRUFBc0IsRUFBdEI7QUFDQSxTQUZEO0FBR0EzRSxRQUFBQSxlQUFlLENBQUNLLHdCQUFoQixDQUF5Q2dDLElBQXpDO0FBQ0FyQyxRQUFBQSxlQUFlLENBQUNNLGNBQWhCLENBQStCaUQsSUFBL0I7QUFDQXZELFFBQUFBLGVBQWUsQ0FBQ08sa0JBQWhCLENBQW1DcUUsS0FBbkM7QUFDQSxPQVBELE1BT087QUFDTjVFLFFBQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUJzRSxJQUF6QixDQUE4QixnQkFBOUIsRUFBZ0RDLElBQWhELENBQXFELFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUNwRW5GLFVBQUFBLENBQUMsQ0FBQ21GLEdBQUQsQ0FBRCxDQUFPRyxVQUFQLENBQWtCLFFBQWxCO0FBQ0EsU0FGRDtBQUdBN0UsUUFBQUEsZUFBZSxDQUFDSyx3QkFBaEIsQ0FBeUNrRCxJQUF6QztBQUNBdkQsUUFBQUEsZUFBZSxDQUFDTSxjQUFoQixDQUErQitCLElBQS9CO0FBQ0E7QUFDRDs7QUExS3NCO0FBQUE7O0FBMkt2Qjs7O0FBR0FRLEVBQUFBLHlCQTlLdUI7QUFBQSx1Q0E4S0dpQyxXQTlLSCxFQThLZ0I7QUFDdEMsVUFBSUEsV0FBVyxDQUFDQyxPQUFaLENBQW9CLE9BQXBCLE1BQWlDLENBQUMsQ0FBdEMsRUFBeUM7QUFDeEMvRSxRQUFBQSxlQUFlLENBQUNRLE9BQWhCLENBQXdCd0UsVUFBeEIsQ0FBbUMsT0FBbkM7QUFDQSxlQUFPLEtBQVA7QUFDQTs7QUFDRCxhQUFPRixXQUFXLENBQUNHLE9BQVosQ0FBb0IsTUFBcEIsRUFBNEIsRUFBNUIsQ0FBUDtBQUNBOztBQXBMc0I7QUFBQTs7QUFxTHZCOzs7QUFHQXpDLEVBQUFBLHFCQXhMdUI7QUFBQSxtQ0F3TERzQyxXQXhMQyxFQXdMWTtBQUNsQyxVQUFJQSxXQUFXLENBQUNDLE9BQVosQ0FBb0IsVUFBcEIsTUFBb0MsQ0FBQyxDQUF6QyxFQUE0QztBQUMzQy9FLFFBQUFBLGVBQWUsQ0FBQ1MsT0FBaEIsQ0FBd0J1RSxVQUF4QixDQUFtQyxPQUFuQztBQUNBLGVBQU8sS0FBUDtBQUNBOztBQUNELGFBQU9GLFdBQVcsQ0FBQ0csT0FBWixDQUFvQixNQUFwQixFQUE0QixFQUE1QixDQUFQO0FBQ0E7O0FBOUxzQjtBQUFBOztBQStMdkI7OztBQUdBWCxFQUFBQSxlQWxNdUI7QUFBQSw2QkFrTVBZLE9BbE1PLEVBa01FO0FBQ3hCLFVBQU1DLFdBQVcsR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVdILE9BQVgsQ0FBcEI7O0FBQ0EsVUFBSUMsV0FBVyxDQUFDLGFBQUQsQ0FBWCxLQUErQkcsU0FBbkMsRUFBOEM7QUFDN0M7QUFDQTs7QUFDRC9GLE1BQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCZ0csSUFBdEIsQ0FBMkJKLFdBQVcsQ0FBQyxhQUFELENBQVgsQ0FBMkJoRSxXQUF0RDtBQUNBNUIsTUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQmdHLElBQWxCLENBQXVCSixXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCeEQsT0FBbEQ7QUFDQXBDLE1BQUFBLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0JnRyxJQUFoQixDQUFxQkosV0FBVyxDQUFDLGFBQUQsQ0FBWCxDQUEyQjFELEtBQWhEO0FBQ0FsQyxNQUFBQSxDQUFDLENBQUMsVUFBRCxDQUFELENBQWNnRyxJQUFkLENBQW1CSixXQUFXLENBQUMsYUFBRCxDQUFYLENBQTJCSyxHQUE5QztBQUNBLFVBQUlDLFFBQVEsR0FBR04sV0FBVyxDQUFDTyxPQUEzQjs7QUFDQSxVQUFJLENBQUNDLEtBQUssQ0FBQ0MsT0FBTixDQUFjSCxRQUFkLENBQUwsRUFBOEI7QUFDN0JBLFFBQUFBLFFBQVEsR0FBRyxFQUFYO0FBQ0FBLFFBQUFBLFFBQVEsQ0FBQ0ksSUFBVCxDQUFjVixXQUFXLENBQUNPLE9BQTFCO0FBQ0E7O0FBQ0RuRyxNQUFBQSxDQUFDLENBQUNpRixJQUFGLENBQU9pQixRQUFQLEVBQWlCLFVBQUNLLEdBQUQsRUFBTUMsWUFBTixFQUF1QjtBQUN2QyxZQUFJQyxHQUFHLEdBQUcsVUFBVjtBQUNBLFlBQUlOLE9BQU8sR0FBR0ssWUFBZDs7QUFDQSxZQUFJTCxPQUFPLENBQUMsYUFBRCxDQUFQLEtBQTJCSixTQUEvQixFQUEwQztBQUN6Q0ksVUFBQUEsT0FBTyxHQUFHSyxZQUFZLENBQUMsYUFBRCxDQUF0QjtBQUNBOztBQUNELFlBQU1FLFdBQVcsR0FBRyxJQUFJQyxJQUFKLENBQVNSLE9BQU8sQ0FBQ1MsT0FBUixDQUFnQmxCLE9BQWhCLENBQXdCLHlCQUF4QixFQUFtRCxVQUFuRCxDQUFULENBQXBCO0FBQ0EsWUFBTW1CLE9BQU8sR0FBRyxJQUFJRixJQUFKLEVBQWhCOztBQUNBLFlBQUlFLE9BQU8sR0FBR0gsV0FBZCxFQUEyQjtBQUMxQkQsVUFBQUEsR0FBRyxpREFBd0NOLE9BQU8sQ0FBQ1csSUFBaEQsa0NBQ005RSxlQUFlLENBQUMrRSxXQUR0QixhQUFIO0FBRUEsU0FIRCxNQUdPLElBQUlaLE9BQU8sQ0FBQ1MsT0FBUixDQUFnQnBHLE1BQWhCLEtBQTJCLENBQTNCLElBQWdDMkYsT0FBTyxDQUFDYSxLQUFSLEtBQWtCLEdBQXRELEVBQTJEO0FBQ2pFUCxVQUFBQSxHQUFHLGlEQUF3Q04sT0FBTyxDQUFDVyxJQUFoRCxrQ0FDTTlFLGVBQWUsQ0FBQytFLFdBRHRCLGFBQUg7QUFFQSxTQUhNLE1BR0E7QUFDTk4sVUFBQUEsR0FBRyxpREFBd0NOLE9BQU8sQ0FBQ1csSUFBaEQsQ0FBSDs7QUFDQSxjQUFJWCxPQUFPLENBQUNTLE9BQVIsQ0FBZ0JwRyxNQUFoQixHQUF5QixDQUE3QixFQUFnQztBQUMvQixnQkFBSXlHLFdBQVcsR0FBR2pGLGVBQWUsQ0FBQ2tGLGdCQUFsQztBQUNBRCxZQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQ3ZCLE9BQVosQ0FBb0IsV0FBcEIsRUFBaUNTLE9BQU8sQ0FBQ1MsT0FBekMsQ0FBZDtBQUNBSCxZQUFBQSxHQUFHLHlCQUFrQlEsV0FBbEIsYUFBSDtBQUNBOztBQUNEUixVQUFBQSxHQUFHLElBQUksNkJBQVA7QUFDQXpHLFVBQUFBLENBQUMsQ0FBQ2lGLElBQUYsQ0FBT3VCLFlBQVksQ0FBQ1csT0FBcEIsRUFBNkIsVUFBQ2pDLEtBQUQsRUFBUWtDLFlBQVIsRUFBeUI7QUFDckQsZ0JBQUlDLFdBQVcsR0FBR3JGLGVBQWUsQ0FBQ3NGLGVBQWxDO0FBQ0EsZ0JBQUlILE9BQU8sR0FBR0MsWUFBZDs7QUFDQSxnQkFBSUEsWUFBWSxDQUFDLGFBQUQsQ0FBWixLQUFnQ3JCLFNBQXBDLEVBQStDO0FBQzlDb0IsY0FBQUEsT0FBTyxHQUFHQyxZQUFZLENBQUMsYUFBRCxDQUF0QjtBQUNBOztBQUNEQyxZQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQzNCLE9BQVosQ0FBb0IsUUFBcEIsRUFBOEJ5QixPQUFPLENBQUNMLElBQXRDLENBQWQ7QUFDQU8sWUFBQUEsV0FBVyxHQUFHQSxXQUFXLENBQUMzQixPQUFaLENBQW9CLFNBQXBCLEVBQStCeUIsT0FBTyxDQUFDSSxLQUF2QyxDQUFkO0FBQ0FGLFlBQUFBLFdBQVcsR0FBR0EsV0FBVyxDQUFDM0IsT0FBWixDQUFvQixhQUFwQixFQUFtQ3lCLE9BQU8sQ0FBQ0ssU0FBM0MsQ0FBZDtBQUNBSCxZQUFBQSxXQUFXLEdBQUdBLFdBQVcsQ0FBQzNCLE9BQVosQ0FBb0IsWUFBcEIsRUFBa0N5QixPQUFPLENBQUNNLFFBQTFDLENBQWQ7QUFDQWhCLFlBQUFBLEdBQUcsY0FBT1ksV0FBUCxTQUFIO0FBQ0EsV0FYRDtBQVlBWixVQUFBQSxHQUFHLElBQUksU0FBUDtBQUNBOztBQUNEQSxRQUFBQSxHQUFHLElBQUksa0JBQVA7QUFDQXpHLFFBQUFBLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCMEgsTUFBM0IsQ0FBa0NqQixHQUFsQztBQUNBLE9BdENEO0FBdUNBOztBQXZQc0I7QUFBQTs7QUF3UHZCOzs7OztBQUtBa0IsRUFBQUEscUJBN1B1QjtBQUFBLG1DQTZQRHRELFFBN1BDLEVBNlBTdUQsT0E3UFQsRUE2UGtCO0FBQ3hDLFVBQUlBLE9BQU8sS0FBRyxJQUFkLEVBQW1CO0FBQ2xCckQsUUFBQUEsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUFoQjtBQUNBLE9BRkQsTUFFTztBQUNOb0QsUUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCekQsUUFBUSxDQUFDUSxRQUFyQztBQUNBcEUsUUFBQUEsZUFBZSxDQUFDRSxZQUFoQixDQUE2QkosR0FBN0IsQ0FBaUN3SCxJQUFJLENBQUNDLE1BQUwsRUFBakM7QUFDQXZILFFBQUFBLGVBQWUsQ0FBQ0UsWUFBaEIsQ0FBNkJzSCxPQUE3QixDQUFxQyxRQUFyQztBQUNBO0FBQ0Q7O0FBclFzQjtBQUFBO0FBc1F2QkMsRUFBQUEsZ0JBdFF1QjtBQUFBLDhCQXNRTi9ILFFBdFFNLEVBc1FJO0FBQzFCLGFBQU9BLFFBQVA7QUFDQTs7QUF4UXNCO0FBQUE7QUF5UXZCZ0ksRUFBQUEsZUF6UXVCO0FBQUEsK0JBeVFMO0FBQ2pCLFVBQU1DLFFBQVEsR0FBRzNILGVBQWUsQ0FBQ0MsUUFBaEIsQ0FBeUJSLElBQXpCLENBQThCLFlBQTlCLENBQWpCO0FBQ0F5RCxNQUFBQSxNQUFNLENBQUMwRSx5QkFBUCxDQUFpQ0QsUUFBakMsRUFBMkMzSCxlQUFlLENBQUNrSCxxQkFBM0Q7QUFDQTs7QUE1UXNCO0FBQUE7QUE2UXZCN0QsRUFBQUEsY0E3UXVCO0FBQUEsOEJBNlFOO0FBQ2hCd0UsTUFBQUEsSUFBSSxDQUFDNUgsUUFBTCxHQUFnQkQsZUFBZSxDQUFDQyxRQUFoQztBQUNBNEgsTUFBQUEsSUFBSSxDQUFDQyxHQUFMLGFBQWNDLGFBQWQ7QUFDQUYsTUFBQUEsSUFBSSxDQUFDM0csYUFBTCxHQUFxQmxCLGVBQWUsQ0FBQ2tCLGFBQXJDO0FBQ0EyRyxNQUFBQSxJQUFJLENBQUNKLGdCQUFMLEdBQXdCekgsZUFBZSxDQUFDeUgsZ0JBQXhDO0FBQ0FJLE1BQUFBLElBQUksQ0FBQ0gsZUFBTCxHQUF1QjFILGVBQWUsQ0FBQzBILGVBQXZDO0FBQ0FHLE1BQUFBLElBQUksQ0FBQzFGLFVBQUw7QUFDQTs7QUFwUnNCO0FBQUE7QUFBQSxDQUF4QjtBQXVSQTVDLENBQUMsQ0FBQ3lJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJqSSxFQUFBQSxlQUFlLENBQUNtQyxVQUFoQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRyZXR1cm4gKCQoJyNsaWNLZXknKS52YWwoKS5sZW5ndGggPT09IDI4IHx8IHZhbHVlLmxlbmd0aCA+IDApO1xufTtcblxuY29uc3QgbGljZW5zaW5nTW9kaWZ5ID0ge1xuXHQkZm9ybU9iajogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybScpLFxuXHQkZGlycnR5RmllbGQ6ICQoJyNkaXJydHknKSxcblx0JGVtcHR5TGljZW5zZUtleUluZm86ICQoJyNlbXB0eS1saWNlbnNlLWtleS1pbmZvJyksXG5cdCRmaWxsZWRMaWNlbnNlS2V5SW5mbzogJCgnI2ZpbGxlZC1saWNlbnNlLWtleS1pbmZvJyksXG5cdCRnZXROZXdLZXlMaWNlbnNlU2VjdGlvbjogJCgnI2dldE5ld0tleUxpY2Vuc2VTZWN0aW9uJyksXG5cdCRjb3Vwb25TZWN0aW9uOiAkKCcjY291cG9uU2VjdGlvbicpLFxuXHQkZm9ybUVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG5cdCRsaWNLZXk6ICQoJyNsaWNLZXknKSxcblx0JGNvdXBvbjogJCgnI2NvdXBvbicpLFxuXHQkZW1haWw6ICQoJyNlbWFpbCcpLFxuXHQkYWpheE1lc3NhZ2VzOiAkKCcudWkubWVzc2FnZS5hamF4JyksXG5cdCRsaWNlbnNlRGV0YWlsSW5mbzogJCgnI2xpY2Vuc2VEZXRhaWxJbmZvJyksXG5cdCRyZXNldEJ1dHRvbjogJCgnI3Jlc2V0LWxpY2Vuc2UnKSxcblx0JHByb2R1Y3REZXRhaWxzOiAkKCcjcHJvZHVjdERldGFpbHMnKSxcblx0JGxpY2Vuc2luZ01lbnU6ICQoJyNsaWNlbnNpbmctbWVudSAuaXRlbScpLFxuXHQkYWNjb3JkaW9uczogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cdGRlZmF1bHRMaWNlbnNlS2V5OiBudWxsLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0Y29tcGFueW5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdjb21wYW55bmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRlbWFpbDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2VtYWlsJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0RW1haWwsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0Y29udGFjdDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2NvbnRhY3QnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGxpY0tleToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2xpY0tleScsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhhY3RMZW5ndGhbMjhdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0Y291cG9uOiB7XG5cdFx0XHRkZXBlbmRzOiAnbGljS2V5Jyxcblx0XHRcdGlkZW50aWZpZXI6ICdjb3Vwb24nLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4YWN0TGVuZ3RoWzMxXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ291cG9uRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uLmlucHV0bWFzaygnTUlLT1VQRC0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcblx0XHRcdG9uQmVmb3JlUGFzdGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uQ291cG9uQmVmb3JlUGFzdGUsXG5cdFx0fSk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkuaW5wdXRtYXNrKCdNSUtPLSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuXHRcdFx0b25jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG5cdFx0XHRvbmluY29tcGxldGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuXHRcdFx0Y2xlYXJJbmNvbXBsZXRlOiB0cnVlLFxuXHRcdFx0b25CZWZvcmVQYXN0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUsXG5cdFx0fSk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRlbWFpbC5pbnB1dG1hc2soJ2VtYWlsJyk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKHtcblx0XHRcdGhpc3RvcnlUeXBlOiAnaGFzaCcsXG5cdFx0fSk7XG5cblx0XHRsaWNlbnNpbmdNb2RpZnkuJHJlc2V0QnV0dG9uLm9uKCdjbGljaycsKCk9Pntcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkobGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkpO1xuXHRcdH0pO1xuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuXG5cdFx0aWYgKGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleS5sZW5ndGggPT09IDI4KSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvXG5cdFx0XHRcdC5odG1sKGAke2xpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleX0gPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT5gKVxuXHRcdFx0XHQuc2hvdygpO1xuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhsaWNlbnNpbmdNb2RpZnkuY2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKTtcblx0XHRcdFBieEFwaS5MaWNlbnNlR2V0TGljZW5zZUluZm8obGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uaGlkZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZW1wdHlMaWNlbnNlS2V5SW5mby5zaG93KCk7XG5cdFx0fVxuXG5cdFx0aWYgKGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleSAhPT0gJycpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoJ2NoYW5nZSB0YWInLCAnbWFuYWdlbWVudCcpO1xuXHRcdH1cblxuXG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzZW5kIFJlc2V0TGljZW5zZUtleSBjYWxsYmFja1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJSZXNldExpY2Vuc2VLZXkocmVzcG9uc2Upe1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXHRcdGlmIChyZXNwb25zZSE9PWZhbHNlKSB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBzZW5kIEdldExpY2Vuc2VJbmZvIGNhbGxiYWNrXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JBZnRlckdldE1pa29QQlhGZWF0dXJlU3RhdHVzKHJlc3BvbnNlKXtcblx0XHQkKCcuc3Bpbm5lci5sb2FkaW5nLmljb24nKS5yZW1vdmUoKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGFqYXhNZXNzYWdlcy5yZW1vdmUoKTtcblx0XHRpZiAocmVzcG9uc2U9PT10cnVlKXtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnZXJyb3InKS5hZGRDbGFzcygnc3VjY2VzcycpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5hZnRlcihgPGRpdiBjbGFzcz1cInVpIHN1Y2Nlc3MgbWVzc2FnZSBhamF4XCI+PGkgY2xhc3M9XCJjaGVjayBncmVlbiBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5saWNfTGljZW5zZUtleVZhbGlkfTwvZGl2PmApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2Vycm9yJykucmVtb3ZlQ2xhc3MoJ3N1Y2Nlc3MnKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIHJlZCBpY29uXCI+PC9pPiAke3Jlc3BvbnNlLm1lc3NhZ2VzfTwvZGl2PmApO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogQWZ0ZXIgc2VuZCBHZXRMaWNlbnNlSW5mbyBjYWxsYmFja1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJHZXRMaWNlbnNlSW5mbyhyZXNwb25zZSl7XG5cdFx0aWYgKHJlc3BvbnNlLmxpY2Vuc2VJbmZvICE9PSAnbnVsbCcpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS5zaG93TGljZW5zZUluZm8ocmVzcG9uc2UubGljZW5zZUluZm8pO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uaGlkZSgpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogT24gY2hhbmdlIGxpY2Vuc2Uga2V5IGlucHV0IGZpZWxkXG5cdCAqL1xuXHRjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCkge1xuXHRcdGNvbnN0IGxpY0tleSA9IGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpO1xuXHRcdGlmIChsaWNLZXkubGVuZ3RoID09PSAyOCkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0XHQkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuXHRcdFx0fSk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLmhpZGUoKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uU2VjdGlvbi5zaG93KCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1FcnJvck1lc3NhZ2VzLmVtcHR5KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdFx0JChvYmopLnJlbW92ZUF0dHIoJ2hpZGRlbicpO1xuXHRcdFx0fSk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGdldE5ld0tleUxpY2Vuc2VTZWN0aW9uLnNob3coKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uU2VjdGlvbi5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgcGFzdGUgbGljZW5zZSBrZXlcblx0ICovXG5cdGNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcblx0XHRpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLTy0nKSA9PT0gLTEpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcblx0fSxcblx0LyoqXG5cdCAqIENhbGxiYWNrIGFmdGVyIHBhc3RlIGxpY2Vuc2UgY291cG9uXG5cdCAqL1xuXHRjYk9uQ291cG9uQmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcblx0XHRpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLT1VQRC0nKSA9PT0gLTEpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kY291cG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcblx0fSxcblx0LyoqXG5cdCAqIFBhcnNlcyBhbmQgYnVpbGRzIGxpY2Vuc2UgaW5mbyBwcmVzZW50YXRpb25cblx0ICovXG5cdHNob3dMaWNlbnNlSW5mbyhtZXNzYWdlKSB7XG5cdFx0Y29uc3QgbGljZW5zZURhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuXHRcdGlmIChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdCQoJyNrZXktY29tcGFueW5hbWUnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbXBhbnluYW1lKTtcblx0XHQkKCcja2V5LWNvbnRhY3QnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbnRhY3QpO1xuXHRcdCQoJyNrZXktZW1haWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmVtYWlsKTtcblx0XHQkKCcja2V5LXRlbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10udGVsKTtcblx0XHRsZXQgcHJvZHVjdHMgPSBsaWNlbnNlRGF0YS5wcm9kdWN0O1xuXHRcdGlmICghQXJyYXkuaXNBcnJheShwcm9kdWN0cykpIHtcblx0XHRcdHByb2R1Y3RzID0gW107XG5cdFx0XHRwcm9kdWN0cy5wdXNoKGxpY2Vuc2VEYXRhLnByb2R1Y3QpO1xuXHRcdH1cblx0XHQkLmVhY2gocHJvZHVjdHMsIChrZXksIHByb2R1Y3RWYWx1ZSkgPT4ge1xuXHRcdFx0bGV0IHJvdyA9ICc8dHI+PHRkPic7XG5cdFx0XHRsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcblx0XHRcdGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cHJvZHVjdCA9IHByb2R1Y3RWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGRhdGVFeHBpcmVkID0gbmV3IERhdGUocHJvZHVjdC5leHBpcmVkLnJlcGxhY2UoLyhcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pLywgJyQxLyQyLyQzJykpO1xuXHRcdFx0Y29uc3QgZGF0ZU5vdyA9IG5ldyBEYXRlKCk7XG5cdFx0XHRpZiAoZGF0ZU5vdyA+IGRhdGVFeHBpcmVkKSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG5cdFx0XHR9IGVsc2UgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPT09IDAgJiYgcHJvZHVjdC50cmlhbCA9PT0gJzEnKSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+JHtwcm9kdWN0Lm5hbWV9YDtcblx0XHRcdFx0aWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0bGV0IGV4cGlyZWRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkQWZ0ZXI7XG5cdFx0XHRcdFx0ZXhwaXJlZFRleHQgPSBleHBpcmVkVGV4dC5yZXBsYWNlKCclZXhwaXJlZCUnLCBwcm9kdWN0LmV4cGlyZWQpO1xuXHRcdFx0XHRcdHJvdyArPSBgPGJyPjxzbWFsbD4ke2V4cGlyZWRUZXh0fTwvc21hbGw+YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRyb3cgKz0gJzxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+Jztcblx0XHRcdFx0JC5lYWNoKHByb2R1Y3RWYWx1ZS5mZWF0dXJlLCAoaW5kZXgsIGZlYXR1cmVWYWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGxldCBmZWF0dXJlSW5mbyA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRmVhdHVyZUluZm87XG5cdFx0XHRcdFx0bGV0IGZlYXR1cmUgPSBmZWF0dXJlVmFsdWU7XG5cdFx0XHRcdFx0aWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVuYW1lJScsIGZlYXR1cmUubmFtZSk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnQlJywgZmVhdHVyZS5jb3VudCk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnRlYWNoJScsIGZlYXR1cmUuY291bnRlYWNoKTtcblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjYXB0dXJlZCUnLCBmZWF0dXJlLmNhcHR1cmVkKTtcblx0XHRcdFx0XHRyb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyb3cgKz0gJzwvc3Bhbj4nO1xuXHRcdFx0fVxuXHRcdFx0cm93ICs9ICc8L2Rpdj48L3RkPjwvdHI+Jztcblx0XHRcdCQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmFwcGVuZChyb3cpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgdXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKiBAcGFyYW0gc3VjY2Vzc1xuXHQgKi9cblx0Y2JBZnRlckZvcm1Qcm9jZXNzaW5nKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG5cdFx0aWYgKHN1Y2Nlc3M9PT10cnVlKXtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZGlycnR5RmllbGQudmFsKE1hdGgucmFuZG9tKCkpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRkaXJydHlGaWVsZC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHR9XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRyZXR1cm4gc2V0dGluZ3M7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRjb25zdCBmb3JtRGF0YSA9IGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0UGJ4QXBpLkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyRm9ybVByb2Nlc3NpbmcpO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gbGljZW5zaW5nTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbGljZW5zaW5nTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBsaWNlbnNpbmdNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==