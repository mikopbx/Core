"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global globalRootUrl,globalTranslate, Extensions, Form, SemanticLocalization */
$.fn.form.settings.rules.customNotEmptyIfActionRule = function (value, action) {
  if (value.length === 0 && $('#action').val() === action) {
    return false;
  }

  return true;
};

var outOfWorkTimeRecord = {
  $formObj: $('#save-outoffwork-form'),
  $rangeDaysStart: $('#range-days-start'),
  $rangeDaysEnd: $('#range-days-end'),
  $rangeTimeStart: $('#range-time-start'),
  $rangeTimeEnd: $('#range-time-end'),
  $date_from: $('#date_from'),
  $date_to: $('#date_to'),
  $time_to: $('#time_to'),
  validateRules: {
    audio_message_id: {
      identifier: 'audio_message_id',
      rules: [{
        type: 'customNotEmptyIfActionRule[playmessage]',
        prompt: globalTranslate.tf_ValidateAudioMessageEmpty
      }]
    },
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'customNotEmptyIfActionRule[extension]',
        prompt: globalTranslate.tf_ValidateExtensionEmpty
      }]
    },
    timefrom: {
      optional: true,
      identifier: 'time_from',
      rules: [{
        type: 'regExp',
        value: /^(2[0-3]|1?[0-9]):([0-5]?[0-9])$/,
        prompt: globalTranslate.tf_ValidateCheckTimeInterval
      }]
    },
    timeto: {
      identifier: 'time_to',
      optional: true,
      rules: [{
        type: 'regExp',
        value: /^(2[0-3]|1?[0-9]):([0-5]?[0-9])$/,
        prompt: globalTranslate.tf_ValidateCheckTimeInterval
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('.dropdown-default').dropdown();
      outOfWorkTimeRecord.$rangeDaysStart.calendar({
        firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
        text: SemanticLocalization.calendarText,
        endCalendar: outOfWorkTimeRecord.$rangeDaysEnd,
        type: 'date',
        inline: false,
        monthFirst: false,
        regExp: SemanticLocalization.regExp
      });
      outOfWorkTimeRecord.$rangeDaysEnd.calendar({
        firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
        text: SemanticLocalization.calendarText,
        startCalendar: outOfWorkTimeRecord.$rangeDaysStart,
        type: 'date',
        inline: false,
        monthFirst: false,
        regExp: SemanticLocalization.regExp,
        onChange: function () {
          function onChange(newDateTo) {
            var oldDateTo = outOfWorkTimeRecord.$date_to.attr('value');

            if (newDateTo !== null && oldDateTo !== '') {
              oldDateTo = new Date(oldDateTo * 1000);

              if (newDateTo - oldDateTo !== 0) {
                outOfWorkTimeRecord.$date_from.trigger('change');
              }
            }
          }

          return onChange;
        }()
      });
      outOfWorkTimeRecord.$rangeTimeStart.calendar({
        firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
        text: SemanticLocalization.calendarText,
        endCalendar: outOfWorkTimeRecord.$rangeTimeEnd,
        type: 'time',
        inline: false,
        disableMinute: true,
        ampm: false
      });
      outOfWorkTimeRecord.$rangeTimeEnd.calendar({
        firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
        text: SemanticLocalization.calendarText,
        startCalendar: outOfWorkTimeRecord.$rangeTimeStart,
        type: 'time',
        inline: false,
        disableMinute: true,
        ampm: false,
        onChange: function () {
          function onChange(newTimeTo) {
            var oldTimeTo = outOfWorkTimeRecord.$time_to.attr('value');

            if (newTimeTo !== null && oldTimeTo !== '') {
              oldTimeTo = new Date(oldTimeTo * 1000);

              if (newTimeTo - oldTimeTo !== 0) {
                outOfWorkTimeRecord.$time_to.trigger('change');
              }
            }
          }

          return onChange;
        }()
      });
      $('#action').dropdown({
        onChange: function () {
          function onChange() {
            outOfWorkTimeRecord.toggleDisabledFieldClass();
          }

          return onChange;
        }()
      });
      $('#weekday_from').dropdown({
        onChange: function () {
          function onChange() {
            var from = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_from');
            var to = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_to');

            if (from < to || to === -1 || from === -1) {
              outOfWorkTimeRecord.$formObj.form('set value', 'weekday_to', from);
            }
          }

          return onChange;
        }()
      });
      $('#weekday_to').dropdown({
        onChange: function () {
          function onChange() {
            var from = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_from');
            var to = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_to');

            if (to < from || from === -1) {
              outOfWorkTimeRecord.$formObj.form('set value', 'weekday_from', to);
            }
          }

          return onChange;
        }()
      });
      $('#erase-dates').on('click', function (e) {
        outOfWorkTimeRecord.$rangeDaysStart.calendar('clear');
        outOfWorkTimeRecord.$rangeDaysEnd.calendar('clear'); // outOfWorkTimeRecord.$date_from.trigger('change');

        outOfWorkTimeRecord.$formObj.form('set values', {
          date_from: '',
          date_to: ''
        });
        e.preventDefault();
      });
      $('#erase-weekdays').on('click', function (e) {
        outOfWorkTimeRecord.$formObj.form('set values', {
          weekday_from: -1,
          weekday_to: -1
        });
        outOfWorkTimeRecord.$rangeDaysStart.trigger('change');
        e.preventDefault();
      });
      $('#erase-timeperiod').on('click', function (e) {
        outOfWorkTimeRecord.$rangeTimeStart.calendar('clear');
        outOfWorkTimeRecord.$rangeTimeEnd.calendar('clear');
        outOfWorkTimeRecord.$time_to.trigger('change');
        e.preventDefault();
      });
      outOfWorkTimeRecord.initializeForm();
      $('.forwarding-select').dropdown(Extensions.getDropdownSettingsWithoutEmpty());
      Extensions.fixBugDropdownIcon();
      outOfWorkTimeRecord.toggleDisabledFieldClass();
      outOfWorkTimeRecord.changeDateFormat();
    }

    return initialize;
  }(),

  /**
   * Меняет представление даты начала и даты окончания из linuxtime в локальное представление
   */
  changeDateFormat: function () {
    function changeDateFormat() {
      var dateFrom = outOfWorkTimeRecord.$date_from.attr('value');
      var dateTo = outOfWorkTimeRecord.$date_to.attr('value');

      if (dateFrom !== undefined && dateFrom.length > 0) {
        outOfWorkTimeRecord.$rangeDaysStart.calendar('set date', new Date(dateFrom * 1000)); // outOfWorkTimeRecord.$formObj.form('set value', 'date_from', dateFrom);
      }

      if (dateTo !== undefined && dateTo.length > 0) {
        outOfWorkTimeRecord.$rangeDaysEnd.calendar('set date', new Date(dateTo * 1000)); // outOfWorkTimeRecord.$formObj.form('set value', 'date_to', dateTo);
      }
    }

    return changeDateFormat;
  }(),
  toggleDisabledFieldClass: function () {
    function toggleDisabledFieldClass() {
      if (outOfWorkTimeRecord.$formObj.form('get value', 'action') === 'extension') {
        $('#extension-group').show();
        $('#audio-file-group').hide();
        $('#audio_message_id').dropdown('clear');
      } else {
        $('#extension-group').hide();
        $('#audio-file-group').show();
        outOfWorkTimeRecord.$formObj.form('set value', 'extension', -1);
      }
    }

    return toggleDisabledFieldClass;
  }(),

  /**
   * Кастомная проверка полей формы, которые не получается сделать через валидацию
   * @param result
   * @returns {*}
   */
  customValidateForm: function () {
    function customValidateForm(result) {
      // Проверим поля даты
      if (result.data.date_from !== '' && result.data.date_to === '' || result.data.date_to !== '' && result.data.date_from === '') {
        $('.form .error.message').html(globalTranslate.tf_ValidateCheckDateInterval).show();
        Form.$submitButton.transition('shake').removeClass('loading disabled');
        return false;
      } // Проверим поля дней недели


      if (result.data.weekday_from > 0 && result.data.weekday_to === '-1' || result.data.weekday_to > 0 && result.data.weekday_from === '-1') {
        $('.form .error.message').html(globalTranslate.tf_ValidateCheckWeekDayInterval).show();
        Form.$submitButton.transition('shake').removeClass('loading disabled');
        return false;
      } // Проверим поля времени


      if (result.data.time_from.length > 0 && result.data.time_to.length === 0 || result.data.time_to.length > 0 && result.data.time_from.length === 0) {
        $('.form .error.message').html(globalTranslate.tf_ValidateCheckTimeInterval).show();
        Form.$submitButton.transition('shake').removeClass('loading disabled');
        return false;
      } // Проверим поля времени на соблюдение формату


      if (result.data.time_from.length > 0 && result.data.time_to.length === 0 || result.data.time_to.length > 0 && result.data.time_from.length === 0) {
        $('.form .error.message').html(globalTranslate.tf_ValidateCheckTimeInterval).show();
        Form.$submitButton.transition('shake').removeClass('loading disabled');
        return false;
      } // Проверим все поля


      if (result.data.time_from === '' && result.data.time_to === '' && result.data.weekday_from === '-1' && result.data.weekday_to === '-1' && result.data.date_from === '' && result.data.date_to === '') {
        $('.form .error.message').html(globalTranslate.tf_ValidateNoRulesSelected).show();
        Form.$submitButton.transition('shake').removeClass('loading disabled');
        return false;
      }

      return result;
    }

    return customValidateForm;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      $('.form .error.message').html('').hide();
      result.data = outOfWorkTimeRecord.$formObj.form('get values');
      var dateFrom = outOfWorkTimeRecord.$rangeDaysStart.calendar('get date');

      if (dateFrom !== null) {
        dateFrom.setHours(0, 0, 0, 0);
        result.data.date_from = Math.round(dateFrom.getTime() / 1000);
      }

      var dateTo = outOfWorkTimeRecord.$rangeDaysEnd.calendar('get date');

      if (dateTo !== null) {
        dateTo.setHours(23, 59, 59, 0);
        result.data.date_to = Math.round(dateTo.getTime() / 1000);
      }

      return outOfWorkTimeRecord.customValidateForm(result);
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {}

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = outOfWorkTimeRecord.$formObj;
      Form.url = "".concat(globalRootUrl, "out-off-work-time/save");
      Form.validateRules = outOfWorkTimeRecord.validateRules;
      Form.cbBeforeSendForm = outOfWorkTimeRecord.cbBeforeSendForm;
      Form.cbAfterSendForm = outOfWorkTimeRecord.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  outOfWorkTimeRecord.initialize();
});
//# sourceMappingURL=out-of-work-time-modify.js.map