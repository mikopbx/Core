"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, Form */
var manager = {
  $formObj: $('#save-ami-form'),
  validateRules: {
    username: {
      identifier: 'username',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.am_ValidationAMINameIsEmpty
      }]
    },
    secret: {
      identifier: 'secret',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.am_ValidationAMISecretIsEmpty
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('.network-filter-select').dropdown();
      $('.list .master.checkbox').checkbox({
        // check all children
        onChecked: function () {
          function onChecked() {
            var $childCheckbox = $(this).closest('.checkbox').siblings('.list').find('.checkbox');
            $childCheckbox.checkbox('check');
          }

          return onChecked;
        }(),
        // uncheck all children
        onUnchecked: function () {
          function onUnchecked() {
            var $childCheckbox = $(this).closest('.checkbox').siblings('.list').find('.checkbox');
            $childCheckbox.checkbox('uncheck');
          }

          return onUnchecked;
        }()
      });
      $('.list .child.checkbox').checkbox({
        // Fire on load to set parent value
        fireOnInit: true,
        // Change parent state on each child checkbox change
        onChange: function () {
          function onChange() {
            var $listGroup = $(this).closest('.list');
            var $parentCheckbox = $listGroup.closest('.item').children('.checkbox');
            var $checkbox = $listGroup.find('.checkbox');
            var allChecked = true;
            var allUnchecked = true; // check to see if all other siblings are checked or unchecked

            $checkbox.each(function () {
              if ($(this).checkbox('is checked')) {
                allUnchecked = false;
              } else {
                allChecked = false;
              }
            }); // set parent checkbox state, but dont trigger its onChange callback

            if (allChecked) {
              $parentCheckbox.checkbox('set checked');
            } else if (allUnchecked) {
              $parentCheckbox.checkbox('set unchecked');
            } else {
              $parentCheckbox.checkbox('set indeterminate');
            }
          }

          return onChange;
        }()
      });
      $('.uncheck.button').on('click', function (e) {
        e.preventDefault();
        $('.checkbox').checkbox('uncheck');
      });
      manager.initializeForm();
    }

    return initialize;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = manager.$formObj.form('get values');
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
      Form.$formObj = manager.$formObj;
      Form.url = "".concat(globalRootUrl, "asterisk-managers/save");
      Form.validateRules = manager.validateRules;
      Form.cbBeforeSendForm = manager.cbBeforeSendForm;
      Form.cbAfterSendForm = manager.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  manager.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCJ2YWxpZGF0ZVJ1bGVzIiwidXNlcm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiYW1fVmFsaWRhdGlvbkFNSU5hbWVJc0VtcHR5Iiwic2VjcmV0IiwiYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHkiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIiRjaGlsZENoZWNrYm94IiwiY2xvc2VzdCIsInNpYmxpbmdzIiwiZmluZCIsIm9uVW5jaGVja2VkIiwiZmlyZU9uSW5pdCIsIm9uQ2hhbmdlIiwiJGxpc3RHcm91cCIsIiRwYXJlbnRDaGVja2JveCIsImNoaWxkcmVuIiwiJGNoZWNrYm94IiwiYWxsQ2hlY2tlZCIsImFsbFVuY2hlY2tlZCIsImVhY2giLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImluaXRpYWxpemVGb3JtIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBT0E7QUFFQSxJQUFNQSxPQUFPLEdBQUc7QUFDZkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FESTtBQUVmQyxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsUUFBUSxFQUFFO0FBQ1RDLE1BQUFBLFVBQVUsRUFBRSxVQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFBQUFBLElBQUksRUFBRSxPQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUZ6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LGdCQTFFZTtBQUFBLDhCQTBFRUMsUUExRUYsRUEwRVk7QUFDMUIsVUFBTUMsTUFBTSxHQUFHRCxRQUFmO0FBQ0FDLE1BQUFBLE1BQU0sQ0FBQ0MsSUFBUCxHQUFjdEMsT0FBTyxDQUFDQyxRQUFSLENBQWlCc0MsSUFBakIsQ0FBc0IsWUFBdEIsQ0FBZDtBQUNBLGFBQU9GLE1BQVA7QUFDQTs7QUE5RWM7QUFBQTtBQStFZkcsRUFBQUEsZUEvRWU7QUFBQSwrQkErRUcsQ0FFakI7O0FBakZjO0FBQUE7QUFrRmZOLEVBQUFBLGNBbEZlO0FBQUEsOEJBa0ZFO0FBQ2hCTyxNQUFBQSxJQUFJLENBQUN4QyxRQUFMLEdBQWdCRCxPQUFPLENBQUNDLFFBQXhCO0FBQ0F3QyxNQUFBQSxJQUFJLENBQUNDLEdBQUwsYUFBY0MsYUFBZDtBQUNBRixNQUFBQSxJQUFJLENBQUN0QyxhQUFMLEdBQXFCSCxPQUFPLENBQUNHLGFBQTdCO0FBQ0FzQyxNQUFBQSxJQUFJLENBQUNOLGdCQUFMLEdBQXdCbkMsT0FBTyxDQUFDbUMsZ0JBQWhDO0FBQ0FNLE1BQUFBLElBQUksQ0FBQ0QsZUFBTCxHQUF1QnhDLE9BQU8sQ0FBQ3dDLGVBQS9CO0FBQ0FDLE1BQUFBLElBQUksQ0FBQzVCLFVBQUw7QUFDQTs7QUF6RmM7QUFBQTtBQUFBLENBQWhCO0FBOEZBWCxDQUFDLENBQUMwQyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCN0MsRUFBQUEsT0FBTyxDQUFDYSxVQUFSO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtICovXG5cbmNvbnN0IG1hbmFnZXIgPSB7XG5cdCRmb3JtT2JqOiAkKCcjc2F2ZS1hbWktZm9ybScpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0dXNlcm5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0c2VjcmV0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnc2VjcmV0Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlTZWNyZXRJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJy5uZXR3b3JrLWZpbHRlci1zZWxlY3QnKS5kcm9wZG93bigpO1xuXHRcdCQoJy5saXN0IC5tYXN0ZXIuY2hlY2tib3gnKVxuXHRcdFx0LmNoZWNrYm94KHtcblx0XHRcdFx0Ly8gY2hlY2sgYWxsIGNoaWxkcmVuXG5cdFx0XHRcdG9uQ2hlY2tlZCgpIHtcblx0XHRcdFx0XHRjb25zdFxuXHRcdFx0XHRcdFx0JGNoaWxkQ2hlY2tib3ggPSAkKHRoaXMpLmNsb3Nlc3QoJy5jaGVja2JveCcpLnNpYmxpbmdzKCcubGlzdCcpLmZpbmQoJy5jaGVja2JveCcpO1xuXHRcdFx0XHRcdCRjaGlsZENoZWNrYm94LmNoZWNrYm94KCdjaGVjaycpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQvLyB1bmNoZWNrIGFsbCBjaGlsZHJlblxuXHRcdFx0XHRvblVuY2hlY2tlZCgpIHtcblx0XHRcdFx0XHRjb25zdFxuXHRcdFx0XHRcdFx0JGNoaWxkQ2hlY2tib3ggPSAkKHRoaXMpLmNsb3Nlc3QoJy5jaGVja2JveCcpLnNpYmxpbmdzKCcubGlzdCcpLmZpbmQoJy5jaGVja2JveCcpO1xuXHRcdFx0XHRcdCRjaGlsZENoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblx0XHQkKCcubGlzdCAuY2hpbGQuY2hlY2tib3gnKVxuXHRcdFx0LmNoZWNrYm94KHtcblx0XHRcdFx0Ly8gRmlyZSBvbiBsb2FkIHRvIHNldCBwYXJlbnQgdmFsdWVcblx0XHRcdFx0ZmlyZU9uSW5pdDogdHJ1ZSxcblx0XHRcdFx0Ly8gQ2hhbmdlIHBhcmVudCBzdGF0ZSBvbiBlYWNoIGNoaWxkIGNoZWNrYm94IGNoYW5nZVxuXHRcdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0XHRjb25zdCAkbGlzdEdyb3VwID0gJCh0aGlzKS5jbG9zZXN0KCcubGlzdCcpO1xuXHRcdFx0XHRcdGNvbnN0ICRwYXJlbnRDaGVja2JveCA9ICRsaXN0R3JvdXAuY2xvc2VzdCgnLml0ZW0nKS5jaGlsZHJlbignLmNoZWNrYm94Jyk7XG5cdFx0XHRcdFx0Y29uc3QgJGNoZWNrYm94ID0gJGxpc3RHcm91cC5maW5kKCcuY2hlY2tib3gnKTtcblx0XHRcdFx0XHRsZXQgYWxsQ2hlY2tlZCA9IHRydWU7XG5cdFx0XHRcdFx0bGV0IGFsbFVuY2hlY2tlZCA9IHRydWU7XG5cdFx0XHRcdFx0Ly8gY2hlY2sgdG8gc2VlIGlmIGFsbCBvdGhlciBzaWJsaW5ncyBhcmUgY2hlY2tlZCBvciB1bmNoZWNrZWRcblx0XHRcdFx0XHQkY2hlY2tib3guZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG5cdFx0XHRcdFx0XHRcdGFsbFVuY2hlY2tlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0YWxsQ2hlY2tlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdC8vIHNldCBwYXJlbnQgY2hlY2tib3ggc3RhdGUsIGJ1dCBkb250IHRyaWdnZXIgaXRzIG9uQ2hhbmdlIGNhbGxiYWNrXG5cdFx0XHRcdFx0aWYgKGFsbENoZWNrZWQpIHtcblx0XHRcdFx0XHRcdCRwYXJlbnRDaGVja2JveC5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFsbFVuY2hlY2tlZCkge1xuXHRcdFx0XHRcdFx0JHBhcmVudENoZWNrYm94LmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCRwYXJlbnRDaGVja2JveC5jaGVja2JveCgnc2V0IGluZGV0ZXJtaW5hdGUnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblx0XHQkKCcudW5jaGVjay5idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3VuY2hlY2snKTtcblx0XHR9KTtcblx0XHRtYW5hZ2VyLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gbWFuYWdlci4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFuYWdlci52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG1hbmFnZXIuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG1hbmFnZXIuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxuXG59O1xuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0bWFuYWdlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==