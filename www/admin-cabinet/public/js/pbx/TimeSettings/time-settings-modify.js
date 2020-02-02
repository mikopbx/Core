"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, SemanticLocalization, Form, PbxApi */
var timeSettings = {
  $number: $('#extension'),
  $formObj: $('#time-settings-form'),
  validateRules: {
    CurrentDateTime: {
      depends: 'PBXManualTimeSettings',
      identifier: 'CurrentDateTime',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.cq_ValidateNameEmpty
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('#PBXTimezone').dropdown({
        fullTextSearch: true
      });
      $('#CalendarBlock').calendar({
        firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
        ampm: false,
        text: SemanticLocalization.calendarText
      });
      $('.checkbox').checkbox({
        onChange: function () {
          function onChange() {
            timeSettings.toggleDisabledFieldClass();
          }

          return onChange;
        }()
      });
      timeSettings.initializeForm();
      timeSettings.toggleDisabledFieldClass();
    }

    return initialize;
  }(),
  formattedDate: function () {
    function formattedDate() {
      var date = Date.parse(timeSettings.$formObj.form('get value', 'CurrentDateTime'));
      return date / 1000;
    }

    return formattedDate;
  }(),
  toggleDisabledFieldClass: function () {
    function toggleDisabledFieldClass() {
      if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') === 'on') {
        $('#SetDateTimeBlock').removeClass('disabled');
        $('#SetNtpServerBlock').addClass('disabled');
      } else {
        $('#SetNtpServerBlock').removeClass('disabled');
        $('#SetDateTimeBlock').addClass('disabled');
      }
    }

    return toggleDisabledFieldClass;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = timeSettings.$formObj.form('get values');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {
      PbxApi.UpdateDateTime({
        date: timeSettings.formattedDate()
      });
    }

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = timeSettings.$formObj;
      Form.url = "".concat(globalRootUrl, "time-settings/save");
      Form.validateRules = timeSettings.validateRules;
      Form.cbBeforeSendForm = timeSettings.cbBeforeSendForm;
      Form.cbAfterSendForm = timeSettings.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  timeSettings.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9UaW1lU2V0dGluZ3MvdGltZS1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsidGltZVNldHRpbmdzIiwiJG51bWJlciIsIiQiLCIkZm9ybU9iaiIsInZhbGlkYXRlUnVsZXMiLCJDdXJyZW50RGF0ZVRpbWUiLCJkZXBlbmRzIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImNxX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsImRyb3Bkb3duIiwiZnVsbFRleHRTZWFyY2giLCJjYWxlbmRhciIsImZpcnN0RGF5T2ZXZWVrIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJjYWxlbmRhckZpcnN0RGF5T2ZXZWVrIiwiYW1wbSIsInRleHQiLCJjYWxlbmRhclRleHQiLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwiaW5pdGlhbGl6ZUZvcm0iLCJmb3JtYXR0ZWREYXRlIiwiZGF0ZSIsIkRhdGUiLCJwYXJzZSIsImZvcm0iLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsIlBieEFwaSIsIlVwZGF0ZURhdGVUaW1lIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsWUFBWSxHQUFHO0FBQ3BCQyxFQUFBQSxPQUFPLEVBQUVDLENBQUMsQ0FBQyxZQUFELENBRFU7QUFFcEJDLEVBQUFBLFFBQVEsRUFBRUQsQ0FBQyxDQUFDLHFCQUFELENBRlM7QUFHcEJFLEVBQUFBLGFBQWEsRUFBRTtBQUNkQyxJQUFBQSxlQUFlLEVBQUU7QUFDaEJDLE1BQUFBLE9BQU8sRUFBRSx1QkFETztBQUVoQkMsTUFBQUEsVUFBVSxF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Q0FBQ0gsZUFBTCxHQUF1QnRDLFlBQVksQ0FBQ3NDLGVBQXBDO0FBQ0FHLE1BQUFBLElBQUksQ0FBQzVCLFVBQUw7QUFDQTs7QUE5RG1CO0FBQUE7QUFBQSxDQUFyQjtBQWlFQVgsQ0FBQyxDQUFDMEMsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjdDLEVBQUFBLFlBQVksQ0FBQ2EsVUFBYjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEZvcm0sIFBieEFwaSAqL1xuXG5jb25zdCB0aW1lU2V0dGluZ3MgPSB7XG5cdCRudW1iZXI6ICQoJyNleHRlbnNpb24nKSxcblx0JGZvcm1PYmo6ICQoJyN0aW1lLXNldHRpbmdzLWZvcm0nKSxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdEN1cnJlbnREYXRlVGltZToge1xuXHRcdFx0ZGVwZW5kczogJ1BCWE1hbnVhbFRpbWVTZXR0aW5ncycsXG5cdFx0XHRpZGVudGlmaWVyOiAnQ3VycmVudERhdGVUaW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTmFtZUVtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJyNQQlhUaW1lem9uZScpLmRyb3Bkb3duKHtcblx0XHRcdGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuXHRcdH0pO1xuXG5cdFx0JCgnI0NhbGVuZGFyQmxvY2snKS5jYWxlbmRhcih7XG5cdFx0XHRmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2Vlayxcblx0XHRcdGFtcG06IGZhbHNlLFxuXHRcdFx0dGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuXHRcdH0pO1xuXG5cdFx0JCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuXHRcdFx0b25DaGFuZ2UoKSB7XG5cdFx0XHRcdHRpbWVTZXR0aW5ncy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0dGltZVNldHRpbmdzLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0dGltZVNldHRpbmdzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXHR9LFxuXHRmb3JtYXR0ZWREYXRlKCkge1xuXHRcdGNvbnN0IGRhdGUgPSBEYXRlLnBhcnNlKHRpbWVTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnQ3VycmVudERhdGVUaW1lJykpO1xuXHRcdHJldHVybiBkYXRlIC8gMTAwMDtcblx0fSxcblx0dG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuXHRcdGlmICh0aW1lU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ1BCWE1hbnVhbFRpbWVTZXR0aW5ncycpID09PSAnb24nKSB7XG5cdFx0XHQkKCcjU2V0RGF0ZVRpbWVCbG9jaycpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0JCgnI1NldE50cFNlcnZlckJsb2NrJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoJyNTZXROdHBTZXJ2ZXJCbG9jaycpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0JCgnI1NldERhdGVUaW1lQmxvY2snKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IHRpbWVTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXHRcdFBieEFwaS5VcGRhdGVEYXRlVGltZSh7ZGF0ZTogdGltZVNldHRpbmdzLmZvcm1hdHRlZERhdGUoKX0pO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gdGltZVNldHRpbmdzLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH10aW1lLXNldHRpbmdzL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IHRpbWVTZXR0aW5ncy52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRpbWVTZXR0aW5ncy5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGltZVNldHRpbmdzLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0dGltZVNldHRpbmdzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19