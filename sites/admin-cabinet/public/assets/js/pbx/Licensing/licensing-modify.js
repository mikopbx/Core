"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, Form */
$.fn.form.settings.rules.checkEmptyIfLicenseKeyEmpty = function (value) {
  return $('#licKey').val().length === 28 || value.length > 0;
};

var licensingModify = {
  $formObj: $('#licencing-modify-form'),
  $emptyLicenseKeyInfo: $('#empty-license-key-info'),
  $filledLicenseKeyInfo: $('#filled-license-key-info'),
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
      licensingModify.$resetButton.api({
        url: "".concat(globalRootUrl, "licensing/resetSettings"),
        method: 'GET',
        beforeSend: function () {
          function beforeSend(settings) {
            $(this).addClass('loading disabled');
            return settings;
          }

          return beforeSend;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            $(this).removeClass('loading disabled');
            licensingModify.$ajaxMessages.remove();
            if (response.success) window.location.reload();
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            $(this).removeClass('loading disabled');
            $('form').after(response);
          }

          return onFailure;
        }()
      });
      licensingModify.cbOnLicenceKeyInputChange();
      licensingModify.initializeForm();

      if (licensingModify.defaultLicenseKey.length === 28) {
        licensingModify.$filledLicenseKeyInfo.html("".concat(licensingModify.defaultLicenseKey, " <i class=\"spinner loading icon\"></i>")).show(); //  Проверим доступность фичии

        $.api({
          url: "".concat(globalRootUrl, "licensing/getBaseFeatureStatus/").concat(licensingModify.defaultLicenseKey),
          on: 'now',
          successTest: function () {
            function successTest(response) {
              // test whether a JSON response is valid
              return response !== undefined && Object.keys(response).length > 0 && response.success === true;
            }

            return successTest;
          }(),
          onSuccess: function () {
            function onSuccess() {
              licensingModify.$formObj.removeClass('error').addClass('success');
              licensingModify.$ajaxMessages.remove();
              licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui success message ajax\"><i class=\"check green icon\"></i> ".concat(globalTranslate.lic_LicenseKeyValid, "</div>"));
              $('.spinner.loading.icon').remove();
            }

            return onSuccess;
          }(),
          onFailure: function () {
            function onFailure(response) {
              licensingModify.$formObj.addClass('error').removeClass('success');
              licensingModify.$ajaxMessages.remove();
              licensingModify.$filledLicenseKeyInfo.after("<div class=\"ui error message ajax\"><i class=\"exclamation triangle red icon\"></i> ".concat(response.message, "</div>"));
              $('.spinner.loading.icon').remove();
            }

            return onFailure;
          }()
        }); // Получим информациию о лицензии

        $.api({
          url: "".concat(globalRootUrl, "licensing/getLicenseInfo/").concat(licensingModify.defaultLicenseKey),
          on: 'now',
          onSuccess: function () {
            function onSuccess(response) {
              licensingModify.cbShowLicenseInfo(response);
            }

            return onSuccess;
          }(),
          onError: function () {
            function onError(errorMessage, element, xhr) {
              if (xhr.status === 403) {
                window.location = "".concat(globalRootUrl, "session/index");
              }
            }

            return onError;
          }()
        }); // PbxApi.CheckLicense(licensingModify.cbCheckLicenseKey);

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
   * Обработчик при вводе ключа
   */
  cbOnLicenceKeyInputChange: function () {
    function cbOnLicenceKeyInputChange() {
      var licKey = licensingModify.$licKey.val();

      if (licKey.length === 28) {
        licensingModify.$formObj.find('.reginfo input').each(function (index, obj) {
          $(obj).attr('hidden', '');
        });
        $('#getTrialLicenseSection').hide();
        $('#couponSection').show();
        $('#form-error-messages').empty();
      } else {
        licensingModify.$formObj.find('.reginfo input').each(function (index, obj) {
          $(obj).removeAttr('hidden');
        });
        $('#getTrialLicenseSection').show();
        $('#couponSection').hide();
      }
    }

    return cbOnLicenceKeyInputChange;
  }(),

  /**
   * Показать GetLicenseInfo
   * @param response
   */
  cbShowLicenseInfo: function () {
    function cbShowLicenseInfo(response) {
      if (response !== undefined && response.message !== 'null') {
        licensingModify.showLicenseInfo(response.message);
        licensingModify.$licenseDetailInfo.show();
      } else {
        licensingModify.$licenseDetailInfo.hide();
      }
    }

    return cbShowLicenseInfo;
  }(),

  /**
   * Обработка вставки ключа из буффера обмена
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
   * Обработка вставки купона из буффера обмена
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
   * Строит отображение информации о лицензировании ПП
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
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = licensingModify.$formObj.form('get values');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {
      licensingModify.defaultLicenseKey = licensingModify.$licKey.val();
      sessionStorage.clear('previousLicenseCheckResult');
    }

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = licensingModify.$formObj;
      Form.url = "".concat(globalRootUrl, "licensing/updateLicense");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRyZXNldEJ1dHRvbiIsIiRwcm9kdWN0RGV0YWlscyIsIiRsaWNlbnNpbmdNZW51IiwiJGFjY29yZGlvbnMiLCJkZWZhdWx0TGljZW5zZUtleSIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSIsImVtYWlsIiwibGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsIiwiY29udGFjdCIsImxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lIiwibGljS2V5Iiwib3B0aW9uYWwiLCJsaWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHkiLCJjb3Vwb24iLCJkZXBlbmRzIiwibGljX1ZhbGlkYXRlQ291cG9uRW1wdHkiLCJpbml0aWFsaXplIiwiYWNjb3JkaW9uIiwiaGlkZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiYmVmb3JlU2VuZCIsImFkZENsYXNzIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlbW92ZSIsInN1Y2Nlc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsIm9uRmFpbHVyZSIsImFmdGVyIiwiaW5pdGlhbGl6ZUZvcm0iLCJodG1sIiwic2hvdyIsIm9uIiwic3VjY2Vzc1Rlc3QiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGljX0xpY2Vuc2VLZXlWYWxpZCIsIm1lc3NhZ2UiLCJjYlNob3dMaWNlbnNlSW5mbyIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwieGhyIiwic3RhdHVzIiwiZmluZCIsImVhY2giLCJpbmRleCIsIm9iaiIsImF0dHIiLCJlbXB0eSIsInJlbW92ZUF0dHIiLCJzaG93TGljZW5zZUluZm8iLCJwYXN0ZWRWYWx1ZSIsImluZGV4T2YiLCJ0cmFuc2l0aW9uIiwicmVwbGFjZSIsImxpY2Vuc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwidGV4dCIsInRlbCIsInByb2R1Y3RzIiwicHJvZHVjdCIsIkFycmF5IiwiaXNBcnJheSIsInB1c2giLCJrZXkiLCJwcm9kdWN0VmFsdWUiLCJyb3ciLCJkYXRlRXhwaXJlZCIsIkRhdGUiLCJleHBpcmVkIiwiZGF0ZU5vdyIsIm5hbWUiLCJsaWNfRXhwaXJlZCIsInRyaWFsIiwiZXhwaXJlZFRleHQiLCJsaWNfRXhwaXJlZEFmdGVyIiwiZmVhdHVyZSIsImZlYXR1cmVWYWx1ZSIsImZlYXR1cmVJbmZvIiwibGljX0ZlYXR1cmVJbmZvIiwiY291bnQiLCJjb3VudGVhY2giLCJjYXB0dXJlZCIsImFwcGVuZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJyZXN1bHQiLCJkYXRhIiwiY2JBZnRlclNlbmRGb3JtIiwic2Vzc2lvblN0b3JhZ2UiLCJjbGVhciIsIkZvcm0iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FB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QSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0gKi9cblxuXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdHJldHVybiAoJCgnI2xpY0tleScpLnZhbCgpLmxlbmd0aCA9PT0gMjggfHwgdmFsdWUubGVuZ3RoID4gMCk7XG59O1xuXG5jb25zdCBsaWNlbnNpbmdNb2RpZnkgPSB7XG5cdCRmb3JtT2JqOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtJyksXG5cdCRlbXB0eUxpY2Vuc2VLZXlJbmZvOiAkKCcjZW1wdHktbGljZW5zZS1rZXktaW5mbycpLFxuXHQkZmlsbGVkTGljZW5zZUtleUluZm86ICQoJyNmaWxsZWQtbGljZW5zZS1rZXktaW5mbycpLFxuXHQkbGljS2V5OiAkKCcjbGljS2V5JyksXG5cdCRjb3Vwb246ICQoJyNjb3Vwb24nKSxcblx0JGVtYWlsOiAkKCcjZW1haWwnKSxcblx0JGFqYXhNZXNzYWdlczogJCgnLnVpLm1lc3NhZ2UuYWpheCcpLFxuXHQkbGljZW5zZURldGFpbEluZm86ICQoJyNsaWNlbnNlRGV0YWlsSW5mbycpLFxuXHQkcmVzZXRCdXR0b246ICQoJyNyZXNldC1saWNlbnNlJyksXG5cdCRwcm9kdWN0RGV0YWlsczogJCgnI3Byb2R1Y3REZXRhaWxzJyksXG5cdCRsaWNlbnNpbmdNZW51OiAkKCcjbGljZW5zaW5nLW1lbnUgLml0ZW0nKSxcblx0JGFjY29yZGlvbnM6ICQoJyNsaWNlbmNpbmctbW9kaWZ5LWZvcm0gLnVpLmFjY29yZGlvbicpLFxuXHRkZWZhdWx0TGljZW5zZUtleTogbnVsbCxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdGNvbXBhbnluYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnY29tcGFueW5hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbXBhbnlOYW1lRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZW1haWw6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdlbWFpbCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGNvbnRhY3Q6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdjb250YWN0Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb250YWN0TmFtZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRsaWNLZXk6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdsaWNLZXknLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4YWN0TGVuZ3RoWzI4XScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlTGljZW5zZUtleUVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGNvdXBvbjoge1xuXHRcdFx0ZGVwZW5kczogJ2xpY0tleScsXG5cdFx0XHRpZGVudGlmaWVyOiAnY291cG9uJyxcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGFjdExlbmd0aFszMV0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvdXBvbkVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvbi5pbnB1dG1hc2soJ01JS09VUEQtKioqKiotKioqKiotKioqKiotKioqKionLCB7XG5cdFx0XHRvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkNvdXBvbkJlZm9yZVBhc3RlLFxuXHRcdH0pO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LmlucHV0bWFzaygnTUlLTy0qKioqKi0qKioqKi0qKioqKi0qKioqKicsIHtcblx0XHRcdG9uY29tcGxldGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlLFxuXHRcdFx0b25pbmNvbXBsZXRlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcblx0XHRcdGNsZWFySW5jb21wbGV0ZTogdHJ1ZSxcblx0XHRcdG9uQmVmb3JlUGFzdGU6IGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUJlZm9yZVBhc3RlLFxuXHRcdH0pO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kZW1haWwuaW5wdXRtYXNrKCdlbWFpbCcpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleSA9IGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoe1xuXHRcdFx0aGlzdG9yeTogdHJ1ZSxcblx0XHRcdGhpc3RvcnlUeXBlOiAnaGFzaCcsXG5cdFx0fSk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRyZXNldEJ1dHRvbi5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9yZXNldFNldHRpbmdzYCxcblx0XHRcdG1ldGhvZDogJ0dFVCcsXG5cdFx0XHRiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG5cdFx0XHRcdCQodGhpcykuYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblx0XHRcdFx0cmV0dXJuIHNldHRpbmdzO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHQkKHRoaXMpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kYWpheE1lc3NhZ2VzLnJlbW92ZSgpO1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzcykgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHQkKHRoaXMpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cdFx0XHRcdCQoJ2Zvcm0nKS5hZnRlcihyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0bGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblxuXG5cdFx0aWYgKGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleS5sZW5ndGggPT09IDI4KSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvXG5cdFx0XHRcdC5odG1sKGAke2xpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleX0gPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT5gKVxuXHRcdFx0XHQuc2hvdygpO1xuXG5cdFx0XHQvLyAg0J/RgNC+0LLQtdGA0LjQvCDQtNC+0YHRgtGD0L/QvdC+0YHRgtGMINGE0LjRh9C40Lhcblx0XHRcdCQuYXBpKHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9nZXRCYXNlRmVhdHVyZVN0YXR1cy8ke2xpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleX1gLFxuXHRcdFx0XHRvbjogJ25vdycsXG5cdFx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0Ly8gdGVzdCB3aGV0aGVyIGEgSlNPTiByZXNwb25zZSBpcyB2YWxpZFxuXHRcdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0XHRcdFx0JiYgcmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnZXJyb3InKS5hZGRDbGFzcygnc3VjY2VzcycpO1xuXHRcdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kYWpheE1lc3NhZ2VzLnJlbW92ZSgpO1xuXHRcdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBzdWNjZXNzIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiY2hlY2sgZ3JlZW4gaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGljX0xpY2Vuc2VLZXlWYWxpZH08L2Rpdj5gKTtcblx0XHRcdFx0XHQkKCcuc3Bpbm5lci5sb2FkaW5nLmljb24nKS5yZW1vdmUoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdlcnJvcicpLnJlbW92ZUNsYXNzKCdzdWNjZXNzJyk7XG5cdFx0XHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRhamF4TWVzc2FnZXMucmVtb3ZlKCk7XG5cdFx0XHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPjxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgcmVkIGljb25cIj48L2k+ICR7cmVzcG9uc2UubWVzc2FnZX08L2Rpdj5gKTtcblx0XHRcdFx0XHQkKCcuc3Bpbm5lci5sb2FkaW5nLmljb24nKS5yZW1vdmUoKTtcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXG5cblx0XHRcdC8vINCf0L7Qu9GD0YfQuNC8INC40L3RhNC+0YDQvNCw0YbQuNC40Y4g0L4g0LvQuNGG0LXQvdC30LjQuFxuXHRcdFx0JC5hcGkoe1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL2dldExpY2Vuc2VJbmZvLyR7bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5fWAsXG5cdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0bGljZW5zaW5nTW9kaWZ5LmNiU2hvd0xpY2Vuc2VJbmZvKHJlc3BvbnNlKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdFx0XHQvLyBQYnhBcGkuQ2hlY2tMaWNlbnNlKGxpY2Vuc2luZ01vZGlmeS5jYkNoZWNrTGljZW5zZUtleSk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uaGlkZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZW1wdHlMaWNlbnNlS2V5SW5mby5zaG93KCk7XG5cdFx0fVxuXG5cdFx0aWYgKGxpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleSAhPT0gJycpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zaW5nTWVudS50YWIoJ2NoYW5nZSB0YWInLCAnbWFuYWdlbWVudCcpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC/0YDQuCDQstCy0L7QtNC1INC60LvRjtGH0LBcblx0ICovXG5cdGNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UoKSB7XG5cdFx0Y29uc3QgbGljS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG5cdFx0aWYgKGxpY0tleS5sZW5ndGggPT09IDI4KSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdCQob2JqKS5hdHRyKCdoaWRkZW4nLCAnJyk7XG5cdFx0XHR9KTtcblx0XHRcdCQoJyNnZXRUcmlhbExpY2Vuc2VTZWN0aW9uJykuaGlkZSgpO1xuXHRcdFx0JCgnI2NvdXBvblNlY3Rpb24nKS5zaG93KCk7XG5cdFx0XHQkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLmVtcHR5KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5maW5kKCcucmVnaW5mbyBpbnB1dCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdFx0JChvYmopLnJlbW92ZUF0dHIoJ2hpZGRlbicpO1xuXHRcdFx0fSk7XG5cdFx0XHQkKCcjZ2V0VHJpYWxMaWNlbnNlU2VjdGlvbicpLnNob3coKTtcblx0XHRcdCQoJyNjb3Vwb25TZWN0aW9uJykuaGlkZSgpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCf0L7QutCw0LfQsNGC0YwgR2V0TGljZW5zZUluZm9cblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYlNob3dMaWNlbnNlSW5mbyhyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLm1lc3NhZ2UgIT09ICdudWxsJykge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LnNob3dMaWNlbnNlSW5mbyhyZXNwb25zZS5tZXNzYWdlKTtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljZW5zZURldGFpbEluZm8uc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtC60LAg0LLRgdGC0LDQstC60Lgg0LrQu9GO0YfQsCDQuNC3INCx0YPRhNGE0LXRgNCwINC+0LHQvNC10L3QsFxuXHQgKi9cblx0Y2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuXHRcdGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPLScpID09PSAtMSkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudHJhbnNpdGlvbignc2hha2UnKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINCy0YHRgtCw0LLQutC4INC60YPQv9C+0L3QsCDQuNC3INCx0YPRhNGE0LXRgNCwINC+0LHQvNC10L3QsFxuXHQgKi9cblx0Y2JPbkNvdXBvbkJlZm9yZVBhc3RlKHBhc3RlZFZhbHVlKSB7XG5cdFx0aWYgKHBhc3RlZFZhbHVlLmluZGV4T2YoJ01JS09VUEQtJykgPT09IC0xKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGNvdXBvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gcGFzdGVkVmFsdWUucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQodGC0YDQvtC40YIg0L7RgtC+0LHRgNCw0LbQtdC90LjQtSDQuNC90YTQvtGA0LzQsNGG0LjQuCDQviDQu9C40YbQtdC90LfQuNGA0L7QstCw0L3QuNC4INCf0J9cblx0ICovXG5cdHNob3dMaWNlbnNlSW5mbyhtZXNzYWdlKSB7XG5cdFx0Y29uc3QgbGljZW5zZURhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuXHRcdGlmIChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdCQoJyNrZXktY29tcGFueW5hbWUnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbXBhbnluYW1lKTtcblx0XHQkKCcja2V5LWNvbnRhY3QnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmNvbnRhY3QpO1xuXHRcdCQoJyNrZXktZW1haWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLmVtYWlsKTtcblx0XHQkKCcja2V5LXRlbCcpLnRleHQobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10udGVsKTtcblx0XHRsZXQgcHJvZHVjdHMgPSBsaWNlbnNlRGF0YS5wcm9kdWN0O1xuXHRcdGlmICghQXJyYXkuaXNBcnJheShwcm9kdWN0cykpIHtcblx0XHRcdHByb2R1Y3RzID0gW107XG5cdFx0XHRwcm9kdWN0cy5wdXNoKGxpY2Vuc2VEYXRhLnByb2R1Y3QpO1xuXHRcdH1cblx0XHQkLmVhY2gocHJvZHVjdHMsIChrZXksIHByb2R1Y3RWYWx1ZSkgPT4ge1xuXHRcdFx0bGV0IHJvdyA9ICc8dHI+PHRkPic7XG5cdFx0XHRsZXQgcHJvZHVjdCA9IHByb2R1Y3RWYWx1ZTtcblx0XHRcdGlmIChwcm9kdWN0WydAYXR0cmlidXRlcyddICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cHJvZHVjdCA9IHByb2R1Y3RWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGRhdGVFeHBpcmVkID0gbmV3IERhdGUocHJvZHVjdC5leHBpcmVkLnJlcGxhY2UoLyhcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pLywgJyQxLyQyLyQzJykpO1xuXHRcdFx0Y29uc3QgZGF0ZU5vdyA9IG5ldyBEYXRlKCk7XG5cdFx0XHRpZiAoZGF0ZU5vdyA+IGRhdGVFeHBpcmVkKSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG5cdFx0XHR9IGVsc2UgaWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPT09IDAgJiYgcHJvZHVjdC50cmlhbCA9PT0gJzEnKSB7XG5cdFx0XHRcdHJvdyArPSBgPGRpdiBjbGFzcz1cInVpIGRpc2FibGVkIHNlZ21lbnRcIj4ke3Byb2R1Y3QubmFtZX08YnI+XG5cdFx0XHRcdDxzbWFsbD4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZH08L3NtYWxsPmA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+JHtwcm9kdWN0Lm5hbWV9YDtcblx0XHRcdFx0aWYgKHByb2R1Y3QuZXhwaXJlZC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0bGV0IGV4cGlyZWRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmxpY19FeHBpcmVkQWZ0ZXI7XG5cdFx0XHRcdFx0ZXhwaXJlZFRleHQgPSBleHBpcmVkVGV4dC5yZXBsYWNlKCclZXhwaXJlZCUnLCBwcm9kdWN0LmV4cGlyZWQpO1xuXHRcdFx0XHRcdHJvdyArPSBgPGJyPjxzbWFsbD4ke2V4cGlyZWRUZXh0fTwvc21hbGw+YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRyb3cgKz0gJzxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+Jztcblx0XHRcdFx0JC5lYWNoKHByb2R1Y3RWYWx1ZS5mZWF0dXJlLCAoaW5kZXgsIGZlYXR1cmVWYWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGxldCBmZWF0dXJlSW5mbyA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRmVhdHVyZUluZm87XG5cdFx0XHRcdFx0bGV0IGZlYXR1cmUgPSBmZWF0dXJlVmFsdWU7XG5cdFx0XHRcdFx0aWYgKGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRmZWF0dXJlID0gZmVhdHVyZVZhbHVlWydAYXR0cmlidXRlcyddO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVuYW1lJScsIGZlYXR1cmUubmFtZSk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnQlJywgZmVhdHVyZS5jb3VudCk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY291bnRlYWNoJScsIGZlYXR1cmUuY291bnRlYWNoKTtcblx0XHRcdFx0XHRmZWF0dXJlSW5mbyA9IGZlYXR1cmVJbmZvLnJlcGxhY2UoJyVjYXB0dXJlZCUnLCBmZWF0dXJlLmNhcHR1cmVkKTtcblx0XHRcdFx0XHRyb3cgKz0gYCR7ZmVhdHVyZUluZm99PGJyPmA7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyb3cgKz0gJzwvc3Bhbj4nO1xuXHRcdFx0fVxuXHRcdFx0cm93ICs9ICc8L2Rpdj48L3RkPjwvdHI+Jztcblx0XHRcdCQoJyNwcm9kdWN0RGV0YWlscyB0Ym9keScpLmFwcGVuZChyb3cpO1xuXHRcdH0pO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcblx0XHRzZXNzaW9uU3RvcmFnZS5jbGVhcigncHJldmlvdXNMaWNlbnNlQ2hlY2tSZXN1bHQnKTtcblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL3VwZGF0ZUxpY2Vuc2VgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGxpY2Vuc2luZ01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbGljZW5zaW5nTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0bGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=