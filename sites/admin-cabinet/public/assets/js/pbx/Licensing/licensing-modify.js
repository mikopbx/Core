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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MaWNlbnNpbmcvbGljZW5zaW5nLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSIsInZhbHVlIiwidmFsIiwibGVuZ3RoIiwibGljZW5zaW5nTW9kaWZ5IiwiJGZvcm1PYmoiLCIkZW1wdHlMaWNlbnNlS2V5SW5mbyIsIiRmaWxsZWRMaWNlbnNlS2V5SW5mbyIsIiRsaWNLZXkiLCIkY291cG9uIiwiJGVtYWlsIiwiJGFqYXhNZXNzYWdlcyIsIiRsaWNlbnNlRGV0YWlsSW5mbyIsIiRyZXNldEJ1dHRvbiIsIiRwcm9kdWN0RGV0YWlscyIsIiRsaWNlbnNpbmdNZW51IiwiJGFjY29yZGlvbnMiLCJkZWZhdWx0TGljZW5zZUtleSIsInZhbGlkYXRlUnVsZXMiLCJjb21wYW55bmFtZSIsImlkZW50aWZpZXIiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibGljX1ZhbGlkYXRlQ29tcGFueU5hbWVFbXB0eSIsImVtYWlsIiwibGljX1ZhbGlkYXRlQ29udGFjdEVtYWlsIiwiY29udGFjdCIsImxpY19WYWxpZGF0ZUNvbnRhY3ROYW1lIiwibGljS2V5Iiwib3B0aW9uYWwiLCJsaWNfVmFsaWRhdGVMaWNlbnNlS2V5RW1wdHkiLCJjb3Vwb24iLCJkZXBlbmRzIiwibGljX1ZhbGlkYXRlQ291cG9uRW1wdHkiLCJpbml0aWFsaXplIiwiYWNjb3JkaW9uIiwiaGlkZSIsImlucHV0bWFzayIsIm9uQmVmb3JlUGFzdGUiLCJjYk9uQ291cG9uQmVmb3JlUGFzdGUiLCJvbmNvbXBsZXRlIiwiY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSIsIm9uaW5jb21wbGV0ZSIsImNsZWFySW5jb21wbGV0ZSIsImNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUiLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiYmVmb3JlU2VuZCIsImFkZENsYXNzIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlbW92ZSIsInN1Y2Nlc3MiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsIm9uRmFpbHVyZSIsImFmdGVyIiwiaW5pdGlhbGl6ZUZvcm0iLCJodG1sIiwic2hvdyIsIm9uIiwic3VjY2Vzc1Rlc3QiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGljX0xpY2Vuc2VLZXlWYWxpZCIsIm1lc3NhZ2UiLCJjYlNob3dMaWNlbnNlSW5mbyIsIm9uRXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwieGhyIiwic3RhdHVzIiwiZmluZCIsImVhY2giLCJpbmRleCIsIm9iaiIsImF0dHIiLCJlbXB0eSIsInJlbW92ZUF0dHIiLCJzaG93TGljZW5zZUluZm8iLCJwYXN0ZWRWYWx1ZSIsImluZGV4T2YiLCJ0cmFuc2l0aW9uIiwicmVwbGFjZSIsImxpY2Vuc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwidGV4dCIsInRlbCIsInByb2R1Y3RzIiwicHJvZHVjdCIsIkFycmF5IiwiaXNBcnJheSIsInB1c2giLCJrZXkiLCJwcm9kdWN0VmFsdWUiLCJyb3ciLCJkYXRlRXhwaXJlZCIsIkRhdGUiLCJleHBpcmVkIiwiZGF0ZU5vdyIsIm5hbWUiLCJsaWNfRXhwaXJlZCIsInRyaWFsIiwiZXhwaXJlZFRleHQiLCJsaWNfRXhwaXJlZEFmdGVyIiwiZmVhdHVyZSIsImZlYXR1cmVWYWx1ZSIsImZlYXR1cmVJbmZvIiwibGljX0ZlYXR1cmVJbmZvIiwiY291bnQiLCJjb3VudGVhY2giLCJjYXB0dXJlZCIsImFwcGVuZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJyZXN1bHQiLCJkYXRhIiwiY2JBZnRlclNlbmRGb3JtIiwic2Vzc2lvblN0b3JhZ2UiLCJjbGVhciIsIkZvcm0iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FB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QSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIHNlc3Npb25TdG9yYWdlICovXG5cblxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRyZXR1cm4gKCQoJyNsaWNLZXknKS52YWwoKS5sZW5ndGggPT09IDI4IHx8IHZhbHVlLmxlbmd0aCA+IDApO1xufTtcblxuY29uc3QgbGljZW5zaW5nTW9kaWZ5ID0ge1xuXHQkZm9ybU9iajogJCgnI2xpY2VuY2luZy1tb2RpZnktZm9ybScpLFxuXHQkZW1wdHlMaWNlbnNlS2V5SW5mbzogJCgnI2VtcHR5LWxpY2Vuc2Uta2V5LWluZm8nKSxcblx0JGZpbGxlZExpY2Vuc2VLZXlJbmZvOiAkKCcjZmlsbGVkLWxpY2Vuc2Uta2V5LWluZm8nKSxcblx0JGxpY0tleTogJCgnI2xpY0tleScpLFxuXHQkY291cG9uOiAkKCcjY291cG9uJyksXG5cdCRlbWFpbDogJCgnI2VtYWlsJyksXG5cdCRhamF4TWVzc2FnZXM6ICQoJy51aS5tZXNzYWdlLmFqYXgnKSxcblx0JGxpY2Vuc2VEZXRhaWxJbmZvOiAkKCcjbGljZW5zZURldGFpbEluZm8nKSxcblx0JHJlc2V0QnV0dG9uOiAkKCcjcmVzZXQtbGljZW5zZScpLFxuXHQkcHJvZHVjdERldGFpbHM6ICQoJyNwcm9kdWN0RGV0YWlscycpLFxuXHQkbGljZW5zaW5nTWVudTogJCgnI2xpY2Vuc2luZy1tZW51IC5pdGVtJyksXG5cdCRhY2NvcmRpb25zOiAkKCcjbGljZW5jaW5nLW1vZGlmeS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblx0ZGVmYXVsdExpY2Vuc2VLZXk6IG51bGwsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRjb21wYW55bmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2NvbXBhbnluYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnY2hlY2tFbXB0eUlmTGljZW5zZUtleUVtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb21wYW55TmFtZUVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGVtYWlsOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZW1haWwnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdjaGVja0VtcHR5SWZMaWNlbnNlS2V5RW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUNvbnRhY3RFbWFpbCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRjb250YWN0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnY29udGFjdCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2NoZWNrRW1wdHlJZkxpY2Vuc2VLZXlFbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubGljX1ZhbGlkYXRlQ29udGFjdE5hbWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0bGljS2V5OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbGljS2V5Jyxcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGFjdExlbmd0aFsyOF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmxpY19WYWxpZGF0ZUxpY2Vuc2VLZXlFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRjb3Vwb246IHtcblx0XHRcdGRlcGVuZHM6ICdsaWNLZXknLFxuXHRcdFx0aWRlbnRpZmllcjogJ2NvdXBvbicsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhhY3RMZW5ndGhbMzFdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5saWNfVmFsaWRhdGVDb3Vwb25FbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb24uaW5wdXRtYXNrKCdNSUtPVVBELSoqKioqLSoqKioqLSoqKioqLSoqKioqJywge1xuXHRcdFx0b25CZWZvcmVQYXN0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25Db3Vwb25CZWZvcmVQYXN0ZSxcblx0XHR9KTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS5pbnB1dG1hc2soJ01JS08tKioqKiotKioqKiotKioqKiotKioqKionLCB7XG5cdFx0XHRvbmNvbXBsZXRlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlJbnB1dENoYW5nZSxcblx0XHRcdG9uaW5jb21wbGV0ZTogbGljZW5zaW5nTW9kaWZ5LmNiT25MaWNlbmNlS2V5SW5wdXRDaGFuZ2UsXG5cdFx0XHRjbGVhckluY29tcGxldGU6IHRydWUsXG5cdFx0XHRvbkJlZm9yZVBhc3RlOiBsaWNlbnNpbmdNb2RpZnkuY2JPbkxpY2VuY2VLZXlCZWZvcmVQYXN0ZSxcblx0XHR9KTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtYWlsLmlucHV0bWFzaygnZW1haWwnKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgPSBsaWNlbnNpbmdNb2RpZnkuJGxpY0tleS52YWwoKTtcblx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKHtcblx0XHRcdGhpc3Rvcnk6IHRydWUsXG5cdFx0XHRoaXN0b3J5VHlwZTogJ2hhc2gnLFxuXHRcdH0pO1xuXHRcdGxpY2Vuc2luZ01vZGlmeS4kcmVzZXRCdXR0b24uYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvcmVzZXRTZXR0aW5nc2AsXG5cdFx0XHRtZXRob2Q6ICdHRVQnLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cdFx0XHRcdHJldHVybiBzZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0JCh0aGlzKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXHRcdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGFqYXhNZXNzYWdlcy5yZW1vdmUoKTtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0JCh0aGlzKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXHRcdFx0XHQkKCdmb3JtJykuYWZ0ZXIocmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdGxpY2Vuc2luZ01vZGlmeS5jYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCk7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cblxuXHRcdGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkubGVuZ3RoID09PSAyOCkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mb1xuXHRcdFx0XHQuaHRtbChgJHtsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXl9IDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+YClcblx0XHRcdFx0LnNob3coKTtcblxuXHRcdFx0Ly8gINCf0YDQvtCy0LXRgNC40Lwg0LTQvtGB0YLRg9C/0L3QvtGB0YLRjCDRhNC40YfQuNC4XG5cdFx0XHQkLmFwaSh7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvZ2V0QmFzZUZlYXR1cmVTdGF0dXMvJHtsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXl9YCxcblx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHRcdCYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWU7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ3N1Y2Nlc3MnKTtcblx0XHRcdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGFqYXhNZXNzYWdlcy5yZW1vdmUoKTtcblx0XHRcdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZpbGxlZExpY2Vuc2VLZXlJbmZvLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgc3VjY2VzcyBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImNoZWNrIGdyZWVuIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxpY19MaWNlbnNlS2V5VmFsaWR9PC9kaXY+YCk7XG5cdFx0XHRcdFx0JCgnLnNwaW5uZXIubG9hZGluZy5pY29uJykucmVtb3ZlKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnZXJyb3InKS5yZW1vdmVDbGFzcygnc3VjY2VzcycpO1xuXHRcdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kYWpheE1lc3NhZ2VzLnJlbW92ZSgpO1xuXHRcdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kZmlsbGVkTGljZW5zZUtleUluZm8uYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj48aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIHJlZCBpY29uXCI+PC9pPiAke3Jlc3BvbnNlLm1lc3NhZ2V9PC9kaXY+YCk7XG5cdFx0XHRcdFx0JCgnLnNwaW5uZXIubG9hZGluZy5pY29uJykucmVtb3ZlKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblxuXG5cdFx0XHQvLyDQn9C+0LvRg9GH0LjQvCDQuNC90YTQvtGA0LzQsNGG0LjQuNGOINC+INC70LjRhtC10L3Qt9C40Lhcblx0XHRcdCQuYXBpKHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9nZXRMaWNlbnNlSW5mby8ke2xpY2Vuc2luZ01vZGlmeS5kZWZhdWx0TGljZW5zZUtleX1gLFxuXHRcdFx0XHRvbjogJ25vdycsXG5cdFx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRcdGxpY2Vuc2luZ01vZGlmeS5jYlNob3dMaWNlbnNlSW5mbyhyZXNwb25zZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXHRcdFx0Ly8gUGJ4QXBpLkNoZWNrTGljZW5zZShsaWNlbnNpbmdNb2RpZnkuY2JDaGVja0xpY2Vuc2VLZXkpO1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRlbXB0eUxpY2Vuc2VLZXlJbmZvLmhpZGUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmaWxsZWRMaWNlbnNlS2V5SW5mby5oaWRlKCk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGVtcHR5TGljZW5zZUtleUluZm8uc2hvdygpO1xuXHRcdH1cblxuXHRcdGlmIChsaWNlbnNpbmdNb2RpZnkuZGVmYXVsdExpY2Vuc2VLZXkgIT09ICcnKSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2luZ01lbnUudGFiKCdjaGFuZ2UgdGFiJywgJ21hbmFnZW1lbnQnKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQv9GA0Lgg0LLQstC+0LTQtSDQutC70Y7Rh9CwXG5cdCAqL1xuXHRjYk9uTGljZW5jZUtleUlucHV0Q2hhbmdlKCkge1xuXHRcdGNvbnN0IGxpY0tleSA9IGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnZhbCgpO1xuXHRcdGlmIChsaWNLZXkubGVuZ3RoID09PSAyOCkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZpbmQoJy5yZWdpbmZvIGlucHV0JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0XHQkKG9iaikuYXR0cignaGlkZGVuJywgJycpO1xuXHRcdFx0fSk7XG5cdFx0XHQkKCcjZ2V0VHJpYWxMaWNlbnNlU2VjdGlvbicpLmhpZGUoKTtcblx0XHRcdCQoJyNjb3Vwb25TZWN0aW9uJykuc2hvdygpO1xuXHRcdFx0JCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKS5lbXB0eSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmouZmluZCgnLnJlZ2luZm8gaW5wdXQnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdCQob2JqKS5yZW1vdmVBdHRyKCdoaWRkZW4nKTtcblx0XHRcdH0pO1xuXHRcdFx0JCgnI2dldFRyaWFsTGljZW5zZVNlY3Rpb24nKS5zaG93KCk7XG5cdFx0XHQkKCcjY291cG9uU2VjdGlvbicpLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LrQsNC30LDRgtGMIEdldExpY2Vuc2VJbmZvXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JTaG93TGljZW5zZUluZm8ocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5tZXNzYWdlICE9PSAnbnVsbCcpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS5zaG93TGljZW5zZUluZm8ocmVzcG9uc2UubWVzc2FnZSk7XG5cdFx0XHRsaWNlbnNpbmdNb2RpZnkuJGxpY2Vuc2VEZXRhaWxJbmZvLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRsaWNlbnNlRGV0YWlsSW5mby5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINCy0YHRgtCw0LLQutC4INC60LvRjtGH0LAg0LjQtyDQsdGD0YTRhNC10YDQsCDQvtCx0LzQtdC90LBcblx0ICovXG5cdGNiT25MaWNlbmNlS2V5QmVmb3JlUGFzdGUocGFzdGVkVmFsdWUpIHtcblx0XHRpZiAocGFzdGVkVmFsdWUuaW5kZXhPZignTUlLTy0nKSA9PT0gLTEpIHtcblx0XHRcdGxpY2Vuc2luZ01vZGlmeS4kbGljS2V5LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBwYXN0ZWRWYWx1ZS5yZXBsYWNlKC9cXHMrL2csICcnKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDQstGB0YLQsNCy0LrQuCDQutGD0L/QvtC90LAg0LjQtyDQsdGD0YTRhNC10YDQsCDQvtCx0LzQtdC90LBcblx0ICovXG5cdGNiT25Db3Vwb25CZWZvcmVQYXN0ZShwYXN0ZWRWYWx1ZSkge1xuXHRcdGlmIChwYXN0ZWRWYWx1ZS5pbmRleE9mKCdNSUtPVVBELScpID09PSAtMSkge1xuXHRcdFx0bGljZW5zaW5nTW9kaWZ5LiRjb3Vwb24udHJhbnNpdGlvbignc2hha2UnKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhc3RlZFZhbHVlLnJlcGxhY2UoL1xccysvZywgJycpO1xuXHR9LFxuXHQvKipcblx0ICog0KHRgtGA0L7QuNGCINC+0YLQvtCx0YDQsNC20LXQvdC40LUg0LjQvdGE0L7RgNC80LDRhtC40Lgg0L4g0LvQuNGG0LXQvdC30LjRgNC+0LLQsNC90LjQuCDQn9CfXG5cdCAqL1xuXHRzaG93TGljZW5zZUluZm8obWVzc2FnZSkge1xuXHRcdGNvbnN0IGxpY2Vuc2VEYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcblx0XHRpZiAobGljZW5zZURhdGFbJ0BhdHRyaWJ1dGVzJ10gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkKCcja2V5LWNvbXBhbnluYW1lJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb21wYW55bmFtZSk7XG5cdFx0JCgnI2tleS1jb250YWN0JykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5jb250YWN0KTtcblx0XHQkKCcja2V5LWVtYWlsJykudGV4dChsaWNlbnNlRGF0YVsnQGF0dHJpYnV0ZXMnXS5lbWFpbCk7XG5cdFx0JCgnI2tleS10ZWwnKS50ZXh0KGxpY2Vuc2VEYXRhWydAYXR0cmlidXRlcyddLnRlbCk7XG5cdFx0bGV0IHByb2R1Y3RzID0gbGljZW5zZURhdGEucHJvZHVjdDtcblx0XHRpZiAoIUFycmF5LmlzQXJyYXkocHJvZHVjdHMpKSB7XG5cdFx0XHRwcm9kdWN0cyA9IFtdO1xuXHRcdFx0cHJvZHVjdHMucHVzaChsaWNlbnNlRGF0YS5wcm9kdWN0KTtcblx0XHR9XG5cdFx0JC5lYWNoKHByb2R1Y3RzLCAoa2V5LCBwcm9kdWN0VmFsdWUpID0+IHtcblx0XHRcdGxldCByb3cgPSAnPHRyPjx0ZD4nO1xuXHRcdFx0bGV0IHByb2R1Y3QgPSBwcm9kdWN0VmFsdWU7XG5cdFx0XHRpZiAocHJvZHVjdFsnQGF0dHJpYnV0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHByb2R1Y3QgPSBwcm9kdWN0VmFsdWVbJ0BhdHRyaWJ1dGVzJ107XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBkYXRlRXhwaXJlZCA9IG5ldyBEYXRlKHByb2R1Y3QuZXhwaXJlZC5yZXBsYWNlKC8oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KS8sICckMS8kMi8kMycpKTtcblx0XHRcdGNvbnN0IGRhdGVOb3cgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0aWYgKGRhdGVOb3cgPiBkYXRlRXhwaXJlZCkge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuXHRcdFx0fSBlbHNlIGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID09PSAwICYmIHByb2R1Y3QudHJpYWwgPT09ICcxJykge1xuXHRcdFx0XHRyb3cgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXNhYmxlZCBzZWdtZW50XCI+JHtwcm9kdWN0Lm5hbWV9PGJyPlxuXHRcdFx0XHQ8c21hbGw+JHtnbG9iYWxUcmFuc2xhdGUubGljX0V4cGlyZWR9PC9zbWFsbD5gO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cm93ICs9IGA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPiR7cHJvZHVjdC5uYW1lfWA7XG5cdFx0XHRcdGlmIChwcm9kdWN0LmV4cGlyZWQubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdGxldCBleHBpcmVkVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5saWNfRXhwaXJlZEFmdGVyO1xuXHRcdFx0XHRcdGV4cGlyZWRUZXh0ID0gZXhwaXJlZFRleHQucmVwbGFjZSgnJWV4cGlyZWQlJywgcHJvZHVjdC5leHBpcmVkKTtcblx0XHRcdFx0XHRyb3cgKz0gYDxicj48c21hbGw+JHtleHBpcmVkVGV4dH08L3NtYWxsPmA7XG5cdFx0XHRcdH1cblx0XHRcdFx0cm93ICs9ICc8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPic7XG5cdFx0XHRcdCQuZWFjaChwcm9kdWN0VmFsdWUuZmVhdHVyZSwgKGluZGV4LCBmZWF0dXJlVmFsdWUpID0+IHtcblx0XHRcdFx0XHRsZXQgZmVhdHVyZUluZm8gPSBnbG9iYWxUcmFuc2xhdGUubGljX0ZlYXR1cmVJbmZvO1xuXHRcdFx0XHRcdGxldCBmZWF0dXJlID0gZmVhdHVyZVZhbHVlO1xuXHRcdFx0XHRcdGlmIChmZWF0dXJlVmFsdWVbJ0BhdHRyaWJ1dGVzJ10gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0ZmVhdHVyZSA9IGZlYXR1cmVWYWx1ZVsnQGF0dHJpYnV0ZXMnXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclbmFtZSUnLCBmZWF0dXJlLm5hbWUpO1xuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50JScsIGZlYXR1cmUuY291bnQpO1xuXHRcdFx0XHRcdGZlYXR1cmVJbmZvID0gZmVhdHVyZUluZm8ucmVwbGFjZSgnJWNvdW50ZWFjaCUnLCBmZWF0dXJlLmNvdW50ZWFjaCk7XG5cdFx0XHRcdFx0ZmVhdHVyZUluZm8gPSBmZWF0dXJlSW5mby5yZXBsYWNlKCclY2FwdHVyZWQlJywgZmVhdHVyZS5jYXB0dXJlZCk7XG5cdFx0XHRcdFx0cm93ICs9IGAke2ZlYXR1cmVJbmZvfTxicj5gO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cm93ICs9ICc8L3NwYW4+Jztcblx0XHRcdH1cblx0XHRcdHJvdyArPSAnPC9kaXY+PC90ZD48L3RyPic7XG5cdFx0XHQkKCcjcHJvZHVjdERldGFpbHMgdGJvZHknKS5hcHBlbmQocm93KTtcblx0XHR9KTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gbGljZW5zaW5nTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0bGljZW5zaW5nTW9kaWZ5LmRlZmF1bHRMaWNlbnNlS2V5ID0gbGljZW5zaW5nTW9kaWZ5LiRsaWNLZXkudmFsKCk7XG5cdFx0c2Vzc2lvblN0b3JhZ2UuY2xlYXIoJ3ByZXZpb3VzTGljZW5zZUNoZWNrUmVzdWx0Jyk7XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBsaWNlbnNpbmdNb2RpZnkuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy91cGRhdGVMaWNlbnNlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBsaWNlbnNpbmdNb2RpZnkudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBsaWNlbnNpbmdNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGxpY2Vuc2luZ01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGxpY2Vuc2luZ01vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19