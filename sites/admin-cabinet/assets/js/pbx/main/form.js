"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate */
var Form = {
  $formObj: '',
  validateRules: {},
  url: '',
  cbBeforeSendForm: '',
  cbAfterSendForm: '',
  $submitButton: $('#submitbutton'),
  $dropdownSubmit: $('#dropdownSubmit'),
  $submitModeInput: $('input[name="submitMode"]'),
  processData: true,
  contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
  keyboardShortcuts: true,
  enableDirrity: true,
  afterSubmitIndexUrl: '',
  afterSubmitModifyUrl: '',
  oldFormValues: [],
  initialize: function () {
    function initialize() {
      if (Form.enableDirrity) Form.initializeDirrity();
      Form.$submitButton.on('click', function (e) {
        e.preventDefault();
        if (Form.$submitButton.hasClass('loading')) return;
        if (Form.$submitButton.hasClass('disabled')) return;
        Form.$formObj.form({
          on: 'blur',
          fields: Form.validateRules,
          onSuccess: function () {
            function onSuccess() {
              Form.submitForm();
            }

            return onSuccess;
          }(),
          onFailure: function () {
            function onFailure() {
              Form.$formObj.removeClass('error').addClass('error');
            }

            return onFailure;
          }()
        });
        Form.$formObj.form('validate form');
      });

      if (Form.$dropdownSubmit.length > 0) {
        Form.$dropdownSubmit.dropdown({
          onChange: function () {
            function onChange(value) {
              var translateKey = "bt_".concat(value);
              Form.$submitModeInput.val(value);
              Form.$submitButton.html("<i class=\"save icon\"></i> ".concat(globalTranslate[translateKey])).click();
            }

            return onChange;
          }()
        });
      }

      Form.$formObj.on('submit', function (e) {
        e.preventDefault();
      });
    }

    return initialize;
  }(),

  /**
   * Инициализация отслеживания изменений формы
   */
  initializeDirrity: function () {
    function initializeDirrity() {
      Form.saveInitialValues();
      Form.setEvents();
      Form.$submitButton.addClass('disabled');
      Form.$dropdownSubmit.addClass('disabled');
    }

    return initializeDirrity;
  }(),

  /**
   * Сохраняет первоначальные значения для проверки на изменения формы
   */
  saveInitialValues: function () {
    function saveInitialValues() {
      Form.oldFormValues = Form.$formObj.form('get values');
    }

    return saveInitialValues;
  }(),

  /**
   * Запускает обработчики изменения объектов формы
   */
  setEvents: function () {
    function setEvents() {
      Form.$formObj.find('input, select').change(function () {
        Form.checkValues();
      });
      Form.$formObj.find('input, textarea').on('keyup keydown blur', function () {
        Form.checkValues();
      });
      Form.$formObj.find('.ui.checkbox').on('click', function () {
        Form.checkValues();
      });
    }

    return setEvents;
  }(),

  /**
   * Сверяет изменения старых и новых значений формы
   */
  checkValues: function () {
    function checkValues() {
      var newFormValues = Form.$formObj.form('get values');

      if (JSON.stringify(Form.oldFormValues) === JSON.stringify(newFormValues)) {
        Form.$submitButton.addClass('disabled');
        Form.$dropdownSubmit.addClass('disabled');
      } else {
        Form.$submitButton.removeClass('disabled');
        Form.$dropdownSubmit.removeClass('disabled');
      }
    }

    return checkValues;
  }(),

  /**
   * Отправка формы на сервер
   */
  submitForm: function () {
    function submitForm() {
      $.api({
        url: Form.url,
        on: 'now',
        method: 'POST',
        processData: Form.processData,
        contentType: Form.contentType,
        keyboardShortcuts: Form.keyboardShortcuts,
        beforeSend: function () {
          function beforeSend(settings) {
            Form.$submitButton.addClass('loading');
            var cbBeforeSendResult = Form.cbBeforeSendForm(settings);

            if (cbBeforeSendResult === false) {
              Form.$submitButton.transition('shake').removeClass('loading');
            } else {
              $.each(cbBeforeSendResult.data, function (index, value) {
                if (index.indexOf('ecret') > -1 || index.indexOf('assword') > -1) return;
                if (typeof value === 'string') cbBeforeSendResult.data[index] = value.trim();
              });
            }

            return cbBeforeSendResult;
          }

          return beforeSend;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            $('.ui.message.ajax').remove();
            $.each(response.message, function (index, value) {
              if (index === 'error') {
                Form.$submitButton.transition('shake').removeClass('loading');
                Form.$formObj.after("<div class=\"ui ".concat(index, " message ajax\">").concat(value, "</div>"));
              }
            });
            var event = document.createEvent('Event');
            event.initEvent('ConfigDataChanged', false, true);
            window.dispatchEvent(event);
            Form.cbAfterSendForm(response);

            if (response.success && response.reload.length > 0 && Form.$submitModeInput.val() === 'SaveSettings') {
              window.location = globalRootUrl + response.reload;
            } else if (response.success && Form.$submitModeInput.val() === 'SaveSettingsAndAddNew') {
              if (Form.afterSubmitModifyUrl.length > 1) {
                window.location = Form.afterSubmitModifyUrl;
              } else {
                var emptyUrl = window.location.href.split('modify');

                if (emptyUrl.length > 1) {
                  window.location = "".concat(emptyUrl[0], "modify/");
                }
              }
            } else if (response.success && Form.$submitModeInput.val() === 'SaveSettingsAndExit') {
              if (Form.afterSubmitIndexUrl.length > 1) {
                window.location = Form.afterSubmitIndexUrl;
              } else {
                var _emptyUrl = window.location.href.split('modify');

                if (_emptyUrl.length > 1) {
                  window.location = "".concat(_emptyUrl[0], "index/");
                }
              }
            } else if (response.success && response.reload.length > 0) {
              window.location = globalRootUrl + response.reload;
            } else if (Form.enableDirrity) {
              Form.initializeDirrity();
            }

            Form.$submitButton.removeClass('loading');
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            Form.$formObj.after(response);
            Form.$submitButton.transition('shake').removeClass('loading');
          }

          return onFailure;
        }()
      });
    }

    return submitForm;
  }()
}; // export default Form;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCIkc3VibWl0QnV0dG9uIiwiJCIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRGlycml0eSIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmb3JtIiwiZmllbGRzIiwib25TdWNjZXNzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJsZW5ndGgiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ0cmFuc2xhdGVLZXkiLCJ2YWwiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2xpY2siLCJzYXZlSW5pdGlhbFZhbHVlcyIsInNldEV2ZW50cyIsImZpbmQiLCJjaGFuZ2UiLCJjaGVja1ZhbHVlcyIsIm5ld0Zvcm1WYWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiYXBpIiwibWV0aG9kIiwiYmVmb3JlU2VuZCIsInNldHRpbmdzIiwiY2JCZWZvcmVTZW5kUmVzdWx0IiwidHJhbnNpdGlvbiIsImVhY2giLCJkYXRhIiwiaW5kZXgiLCJpbmRleE9mIiwidHJpbSIsInJlc3BvbnNlIiwicmVtb3ZlIiwibWVzc2FnZSIsImFmdGVyIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsInN1Y2Nlc3MiLCJyZWxvYWQiLCJsb2Nh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QUFQLEdBQWtCdEUsSUFBSSxDQUFDYyxtQkFBdkI7QUFDQSxlQUZELE1BRU87QUFDTixvQkFBTTBELFNBQVEsR0FBR04sTUFBTSxDQUFDSSxRQUFQLENBQWdCRyxJQUFoQixDQUFxQkMsS0FBckIsQ0FBMkIsUUFBM0IsQ0FBakI7O0FBQ0Esb0JBQUlGLFNBQVEsQ0FBQzFDLE1BQVQsR0FBa0IsQ0FBdEIsRUFBeUI7QUFDeEJvQyxrQkFBQUEsTUFBTSxDQUFDSSxRQUFQLGFBQXFCRSxTQUFRLENBQUMsQ0FBRCxDQUE3QjtBQUNBO0FBQ0Q7QUFDRCxhQVRNLE1BU0EsSUFBSWQsUUFBUSxDQUFDVSxPQUFULElBQ05WLFFBQVEsQ0FBQ1csTUFBVCxDQUFnQnZDLE1BQWhCLEdBQXlCLENBRHZCLEVBQzBCO0FBQ2hDb0MsY0FBQUEsTUFBTSxDQUFDSSxRQUFQLEdBQWtCQyxhQUFhLEdBQUdiLFFBQVEsQ0FBQ1csTUFBM0M7QUFDQSxhQUhNLE1BR0EsSUFBSXJFLElBQUksQ0FBQ2EsYUFBVCxFQUF3QjtBQUM5QmIsY0FBQUEsSUFBSSxDQUFDa0IsaUJBQUw7QUFDQTs7QUFDRGxCLFlBQUFBLElBQUksQ0FBQ00sYUFBTCxDQUFtQnNCLFdBQW5CLENBQStCLFNBQS9CO0FBQ0E7O0FBL0RJO0FBQUE7QUFnRUxELFFBQUFBLFNBaEVLO0FBQUEsNkJBZ0VLK0IsUUFoRUwsRUFnRWU7QUFDbkIxRCxZQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBYzRELEtBQWQsQ0FBb0JILFFBQXBCO0FBQ0ExRCxZQUFBQSxJQUFJLENBQUNNLGFBQUwsQ0FDRThDLFVBREYsQ0FDYSxPQURiLEVBRUV4QixXQUZGLENBRWMsU0FGZDtBQUdBOztBQXJFSTtBQUFBO0FBQUEsT0FBTjtBQXdFQTs7QUF6S1c7QUFBQTtBQUFBLENBQWIsQyxDQTRLQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbmNvbnN0IEZvcm0gPSB7XG5cdCRmb3JtT2JqOiAnJyxcblx0dmFsaWRhdGVSdWxlczoge30sXG5cdHVybDogJycsXG5cdGNiQmVmb3JlU2VuZEZvcm06ICcnLFxuXHRjYkFmdGVyU2VuZEZvcm06ICcnLFxuXHQkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG5cdCRkcm9wZG93blN1Ym1pdDogJCgnI2Ryb3Bkb3duU3VibWl0JyksXG5cdCRzdWJtaXRNb2RlSW5wdXQ6ICQoJ2lucHV0W25hbWU9XCJzdWJtaXRNb2RlXCJdJyksXG5cdHByb2Nlc3NEYXRhOiB0cnVlLFxuXHRjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOCcsXG5cdGtleWJvYXJkU2hvcnRjdXRzOiB0cnVlLFxuXHRlbmFibGVEaXJyaXR5OiB0cnVlLFxuXHRhZnRlclN1Ym1pdEluZGV4VXJsOiAnJyxcblx0YWZ0ZXJTdWJtaXRNb2RpZnlVcmw6ICcnLFxuXHRvbGRGb3JtVmFsdWVzOiBbXSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG5cblx0XHRGb3JtLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSkgcmV0dXJuO1xuXHRcdFx0aWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnZGlzYWJsZWQnKSkgcmV0dXJuO1xuXHRcdFx0Rm9ybS4kZm9ybU9ialxuXHRcdFx0XHQuZm9ybSh7XG5cdFx0XHRcdFx0b246ICdibHVyJyxcblx0XHRcdFx0XHRmaWVsZHM6IEZvcm0udmFsaWRhdGVSdWxlcyxcblx0XHRcdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdFx0XHRGb3JtLnN1Ym1pdEZvcm0oKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0XHRcdEZvcm0uJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSk7XG5cdFx0XHRGb3JtLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcblx0XHR9KTtcblx0XHRpZiAoRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID4gMCkge1xuXHRcdFx0Rm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oe1xuXHRcdFx0XHRvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgdHJhbnNsYXRlS2V5ID0gYGJ0XyR7dmFsdWV9YDtcblx0XHRcdFx0XHRGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKHZhbHVlKTtcblx0XHRcdFx0XHRGb3JtLiRzdWJtaXRCdXR0b25cblx0XHRcdFx0XHRcdC5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XX1gKVxuXHRcdFx0XHRcdFx0LmNsaWNrKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0Rm9ybS4kZm9ybU9iai5vbignc3VibWl0JywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCY0L3QuNGG0LjQsNC70LjQt9Cw0YbQuNGPINC+0YLRgdC70LXQttC40LLQsNC90LjRjyDQuNC30LzQtdC90LXQvdC40Lkg0YTQvtGA0LzRi1xuXHQgKi9cblx0aW5pdGlhbGl6ZURpcnJpdHkoKSB7XG5cdFx0Rm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuXHRcdEZvcm0uc2V0RXZlbnRzKCk7XG5cdFx0Rm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHR9LFxuXHQvKipcblx0ICog0KHQvtGF0YDQsNC90Y/QtdGCINC/0LXRgNCy0L7QvdCw0YfQsNC70YzQvdGL0LUg0LfQvdCw0YfQtdC90LjRjyDQtNC70Y8g0L/RgNC+0LLQtdGA0LrQuCDQvdCwINC40LfQvNC10L3QtdC90LjRjyDRhNC+0YDQvNGLXG5cdCAqL1xuXHRzYXZlSW5pdGlhbFZhbHVlcygpIHtcblx0XHRGb3JtLm9sZEZvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0fSxcblx0LyoqXG5cdCAqINCX0LDQv9GD0YHQutCw0LXRgiDQvtCx0YDQsNCx0L7RgtGH0LjQutC4INC40LfQvNC10L3QtdC90LjRjyDQvtCx0YrQtdC60YLQvtCyINGE0L7RgNC80Ytcblx0ICovXG5cdHNldEV2ZW50cygpIHtcblx0XHRGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5jaGFuZ2UoKCkgPT4ge1xuXHRcdFx0Rm9ybS5jaGVja1ZhbHVlcygpO1xuXHRcdH0pO1xuXHRcdEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXQsIHRleHRhcmVhJykub24oJ2tleXVwIGtleWRvd24gYmx1cicsICgpID0+IHtcblx0XHRcdEZvcm0uY2hlY2tWYWx1ZXMoKTtcblx0XHR9KTtcblx0XHRGb3JtLiRmb3JtT2JqLmZpbmQoJy51aS5jaGVja2JveCcpLm9uKCdjbGljaycsICgpID0+IHtcblx0XHRcdEZvcm0uY2hlY2tWYWx1ZXMoKTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCh0LLQtdGA0Y/QtdGCINC40LfQvNC10L3QtdC90LjRjyDRgdGC0LDRgNGL0YUg0Lgg0L3QvtCy0YvRhSDQt9C90LDRh9C10L3QuNC5INGE0L7RgNC80Ytcblx0ICovXG5cdGNoZWNrVmFsdWVzKCkge1xuXHRcdGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRpZiAoSlNPTi5zdHJpbmdpZnkoRm9ybS5vbGRGb3JtVmFsdWVzKSA9PT0gSlNPTi5zdHJpbmdpZnkobmV3Rm9ybVZhbHVlcykpIHtcblx0XHRcdEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRGb3JtLiRkcm9wZG93blN1Ym1pdC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGC0L/RgNCw0LLQutCwINGE0L7RgNC80Ysg0L3QsCDRgdC10YDQstC10YBcblx0ICovXG5cdHN1Ym1pdEZvcm0oKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBGb3JtLnVybCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0cHJvY2Vzc0RhdGE6IEZvcm0ucHJvY2Vzc0RhdGEsXG5cdFx0XHRjb250ZW50VHlwZTogRm9ybS5jb250ZW50VHlwZSxcblx0XHRcdGtleWJvYXJkU2hvcnRjdXRzOiBGb3JtLmtleWJvYXJkU2hvcnRjdXRzLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHRGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0Y29uc3QgY2JCZWZvcmVTZW5kUmVzdWx0ID0gRm9ybS5jYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKTtcblx0XHRcdFx0aWYgKGNiQmVmb3JlU2VuZFJlc3VsdCA9PT0gZmFsc2UpIHtcblx0XHRcdFx0XHRGb3JtLiRzdWJtaXRCdXR0b25cblx0XHRcdFx0XHRcdC50cmFuc2l0aW9uKCdzaGFrZScpXG5cdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkLmVhY2goY2JCZWZvcmVTZW5kUmVzdWx0LmRhdGEsIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRcdGlmIChpbmRleC5pbmRleE9mKCdlY3JldCcpID4gLTEgfHwgaW5kZXguaW5kZXhPZignYXNzd29yZCcpID4gLTEpIHJldHVybjtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSBjYkJlZm9yZVNlbmRSZXN1bHQuZGF0YVtpbmRleF0gPSB2YWx1ZS50cmltKCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGNiQmVmb3JlU2VuZFJlc3VsdDtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0JCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGlmIChpbmRleCA9PT0gJ2Vycm9yJykge1xuXHRcdFx0XHRcdFx0Rm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0XHRcdEZvcm0uJGZvcm1PYmouYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSAke2luZGV4fSBtZXNzYWdlIGFqYXhcIj4ke3ZhbHVlfTwvZGl2PmApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cdFx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzc1xuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnJlbG9hZC5sZW5ndGggPiAwXG5cdFx0XHRcdFx0JiYgRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbCgpID09PSAnU2F2ZVNldHRpbmdzJykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGdsb2JhbFJvb3RVcmwgKyByZXNwb25zZS5yZWxvYWQ7XG5cdFx0XHRcdH0gZWxzZSBpZiAocmVzcG9uc2Uuc3VjY2VzcyAmJiBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKCkgPT09ICdTYXZlU2V0dGluZ3NBbmRBZGROZXcnKSB7XG5cdFx0XHRcdFx0aWYgKEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwubGVuZ3RoID4gMSl7XG5cdFx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjb25zdCBlbXB0eVVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCdtb2RpZnknKTtcblx0XHRcdFx0XHRcdGlmIChlbXB0eVVybC5sZW5ndGggPiAxKSB7XG5cdFx0XHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2VtcHR5VXJsWzBdfW1vZGlmeS9gO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChyZXNwb25zZS5zdWNjZXNzICYmIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoKSA9PT0gJ1NhdmVTZXR0aW5nc0FuZEV4aXQnKSB7XG5cdFx0XHRcdFx0aWYgKEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybC5sZW5ndGggPiAxKXtcblx0XHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29uc3QgZW1wdHlVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5Jyk7XG5cdFx0XHRcdFx0XHRpZiAoZW1wdHlVcmwubGVuZ3RoID4gMSkge1xuXHRcdFx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtlbXB0eVVybFswXX1pbmRleC9gO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChyZXNwb25zZS5zdWNjZXNzXG5cdFx0XHRcdFx0XHQmJiByZXNwb25zZS5yZWxvYWQubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGdsb2JhbFJvb3RVcmwgKyByZXNwb25zZS5yZWxvYWQ7XG5cdFx0XHRcdH0gZWxzZSBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG5cdFx0XHRcdFx0Rm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRGb3JtLiRmb3JtT2JqLmFmdGVyKHJlc3BvbnNlKTtcblx0XHRcdFx0Rm9ybS4kc3VibWl0QnV0dG9uXG5cdFx0XHRcdFx0LnRyYW5zaXRpb24oJ3NoYWtlJylcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcbn07XG5cbi8vIGV4cG9ydCBkZWZhdWx0IEZvcm07XG4iXX0=