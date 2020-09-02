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
  $dropDowns: $('#save-ami-form .ui.dropdown'),
  $masterCheckBoxes: $('#save-ami-form .list .master.checkbox'),
  $childrenCheckBoxes: $('#save-ami-form .list .child.checkbox'),
  $allCheckBoxes: $('#save-ami-form .list .checkbox'),
  $unCheckButton: $('.uncheck.button'),
  $username: $('#username'),
  originalName: '',
  validateRules: {
    username: {
      identifier: 'username',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.am_ValidationAMINameIsEmpty
      }, {
        type: 'existRule[username-error]',
        prompt: globalTranslate.am_ErrorThisUsernameInNotAvailable
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
      manager.$dropDowns.dropdown();
      manager.$masterCheckBoxes.checkbox({
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
      manager.$childrenCheckBoxes.checkbox({
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
      manager.$unCheckButton.on('click', function (e) {
        e.preventDefault();
        manager.$allCheckBoxes.checkbox('uncheck');
      });
      manager.$username.on('change', function (value) {
        var userId = manager.$formObj.form('get value', 'id');
        var newValue = manager.$formObj.form('get value', 'username');
        manager.checkAvailability(manager.originalName, newValue, 'username', userId);
      });
      manager.initializeForm();
      manager.originalName = manager.$formObj.form('get value', 'username');
    }

    return initialize;
  }(),

  /**
   * Checks if username doesn't exist in database
   * @param oldName
   * @param newName
   * @param cssClassName
   * @param userId
   * @returns {*}
   */
  checkAvailability: function () {
    function checkAvailability(oldName, newName) {
      var cssClassName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'username';
      var userId = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';

      if (oldName === newName) {
        $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
        $("#".concat(cssClassName, "-error")).addClass('hidden');
        return;
      }

      $.api({
        url: "".concat(globalRootUrl, "asterisk-managers/available/{value}"),
        stateContext: ".ui.input.".concat(cssClassName),
        on: 'now',
        beforeSend: function () {
          function beforeSend(settings) {
            var result = settings;
            result.urlData = {
              value: newName
            };
            return result;
          }

          return beforeSend;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            if (response.nameAvailable) {
              $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
              $("#".concat(cssClassName, "-error")).addClass('hidden');
            } else if (userId.length > 0 && response.userId === userId) {
              $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
              $("#".concat(cssClassName, "-error")).addClass('hidden');
            } else {
              $(".ui.input.".concat(cssClassName)).parent().addClass('error');
              $("#".concat(cssClassName, "-error")).removeClass('hidden');
            }
          }

          return onSuccess;
        }()
      });
    }

    return checkAvailability;
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
}; // Check uniqueness Username

$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};

$(document).ready(function () {
  manager.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJG1hc3RlckNoZWNrQm94ZXMiLCIkY2hpbGRyZW5DaGVja0JveGVzIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiR1c2VybmFtZSIsIm9yaWdpbmFsTmFtZSIsInZhbGlkYXRlUnVsZXMiLCJ1c2VybmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHkiLCJhbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlIiwic2VjcmV0IiwiYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHkiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIiRjaGlsZENoZWNrYm94IiwiY2xvc2VzdCIsInNpYmxpbmdzIiwiZmluZCIsIm9uVW5jaGVja2VkIiwiZmlyZU9uSW5pdCIsIm9uQ2hhbmdlIiwiJGxpc3RHcm91cCIsIiRwYXJlbnRDaGVja2JveCIsImNoaWxkcmVuIiwiJGNoZWNrYm94IiwiYWxsQ2hlY2tlZCIsImFsbFVuY2hlY2tlZCIsImVhY2giLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInZhbHVlIiwidXNlcklkIiwiZm9ybSIsIm5ld1ZhbHVlIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJpbml0aWFsaXplRm9ybSIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJuYW1lQXZhaWxhYmxlIiwibGVuZ3RoIiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBT0E7QUFFQSxJQUFNQSxPQUFPLEdBQUc7QUFDZkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FESTtBQUVmQyxFQUFBQSxVQUFVLEVBQUVELENBQUMsQ0FBQyw2QkFBRCxDQUZFO0FBR2ZFLEVBQUFBLGlCQUFpQixFQUFFRixDQUFDLENBQUMsdUNBQUQsQ0FITDtBQUlmRyxFQUFBQSxtQkFBbUIsRUFBRUgsQ0FBQyxDQUFDLHNDQUFELENBSlA7QUFLZkksRUFBQUEsY0FBYyxFQUFFSixDQUFDLENBQUMsZ0NBQUQsQ0FMRjtBQU1mSyxFQUFBQSxjQUFjLEVBQUVMLENBQUMsQ0FBQyxpQkFBRCxDQU5GO0FBT2ZNLEVBQUFBLFNBQVMsRUFBRU4sQ0FBQyxDQUFDLFdBQUQsQ0FQRztBQVFmTyxFQUFBQSxZQUFZLEVBQUMsRUFSRTtBQVNmQyxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsUUFBUSxFQUFFO0FBQ1RDLE1BQUFBLFVBQVUsRUFBRSxVQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFBQUFBLElBQUksRUFBRSxPQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUZ6QixPQURNLEVBS047QUFDQ0gsUUFBQUEsSUFBSSxFQUFFLDJCQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRTtBQUZ6QixPQUxNO0FBRkUsS0FESTtBQWNkQyxJQUFBQSxNQUFNLEVBQUU7QUFDUFAsTUFBQUEsVUFBVSxFQUFFLFFBREw7QUFFUEMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ0MsUUFBQUEsSUFBSSxFQUFFLE9BRFA7QUFFQ0Ms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LGNBMUllO0FBQUEsOEJBMElFO0FBQ2hCc0IsTUFBQUEsSUFBSSxDQUFDcEUsUUFBTCxHQUFnQkQsT0FBTyxDQUFDQyxRQUF4QjtBQUNBb0UsTUFBQUEsSUFBSSxDQUFDZCxHQUFMLGFBQWNDLGFBQWQ7QUFDQWEsTUFBQUEsSUFBSSxDQUFDM0QsYUFBTCxHQUFxQlYsT0FBTyxDQUFDVSxhQUE3QjtBQUNBMkQsTUFBQUEsSUFBSSxDQUFDSCxnQkFBTCxHQUF3QmxFLE9BQU8sQ0FBQ2tFLGdCQUFoQztBQUNBRyxNQUFBQSxJQUFJLENBQUNELGVBQUwsR0FBdUJwRSxPQUFPLENBQUNvRSxlQUEvQjtBQUNBQyxNQUFBQSxJQUFJLENBQUNoRCxVQUFMO0FBQ0E7O0FBakpjO0FBQUE7QUFBQSxDQUFoQixDLENBcUpBOztBQUNBbkIsQ0FBQyxDQUFDb0UsRUFBRixDQUFLMUIsSUFBTCxDQUFVZSxRQUFWLENBQW1COUMsS0FBbkIsQ0FBeUIwRCxTQUF6QixHQUFxQyxVQUFDN0IsS0FBRCxFQUFROEIsU0FBUjtBQUFBLFNBQXNCdEUsQ0FBQyxZQUFLc0UsU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDOztBQUVBdkUsQ0FBQyxDQUFDd0UsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjNFLEVBQUFBLE9BQU8sQ0FBQ3FCLFVBQVI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0gKi9cblxuY29uc3QgbWFuYWdlciA9IHtcblx0JGZvcm1PYmo6ICQoJyNzYXZlLWFtaS1mb3JtJyksXG5cdCRkcm9wRG93bnM6ICQoJyNzYXZlLWFtaS1mb3JtIC51aS5kcm9wZG93bicpLFxuXHQkbWFzdGVyQ2hlY2tCb3hlczogJCgnI3NhdmUtYW1pLWZvcm0gLmxpc3QgLm1hc3Rlci5jaGVja2JveCcpLFxuXHQkY2hpbGRyZW5DaGVja0JveGVzOiAkKCcjc2F2ZS1hbWktZm9ybSAubGlzdCAuY2hpbGQuY2hlY2tib3gnKSxcblx0JGFsbENoZWNrQm94ZXM6ICQoJyNzYXZlLWFtaS1mb3JtIC5saXN0IC5jaGVja2JveCcpLFxuXHQkdW5DaGVja0J1dHRvbjogJCgnLnVuY2hlY2suYnV0dG9uJyksXG5cdCR1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksXG5cdG9yaWdpbmFsTmFtZTonJyxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdHVzZXJuYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSU5hbWVJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4aXN0UnVsZVt1c2VybmFtZS1lcnJvcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0c2VjcmV0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnc2VjcmV0Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlTZWNyZXRJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdG1hbmFnZXIuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXHRcdG1hbmFnZXIuJG1hc3RlckNoZWNrQm94ZXNcblx0XHRcdC5jaGVja2JveCh7XG5cdFx0XHRcdC8vIGNoZWNrIGFsbCBjaGlsZHJlblxuXHRcdFx0XHRvbkNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0Y29uc3Rcblx0XHRcdFx0XHRcdCRjaGlsZENoZWNrYm94ID0gJCh0aGlzKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5zaWJsaW5ncygnLmxpc3QnKS5maW5kKCcuY2hlY2tib3gnKTtcblx0XHRcdFx0XHQkY2hpbGRDaGVja2JveC5jaGVja2JveCgnY2hlY2snKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Ly8gdW5jaGVjayBhbGwgY2hpbGRyZW5cblx0XHRcdFx0b25VbmNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0Y29uc3Rcblx0XHRcdFx0XHRcdCRjaGlsZENoZWNrYm94ID0gJCh0aGlzKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5zaWJsaW5ncygnLmxpc3QnKS5maW5kKCcuY2hlY2tib3gnKTtcblx0XHRcdFx0XHQkY2hpbGRDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdFx0bWFuYWdlci4kY2hpbGRyZW5DaGVja0JveGVzXG5cdFx0XHQuY2hlY2tib3goe1xuXHRcdFx0XHQvLyBGaXJlIG9uIGxvYWQgdG8gc2V0IHBhcmVudCB2YWx1ZVxuXHRcdFx0XHRmaXJlT25Jbml0OiB0cnVlLFxuXHRcdFx0XHQvLyBDaGFuZ2UgcGFyZW50IHN0YXRlIG9uIGVhY2ggY2hpbGQgY2hlY2tib3ggY2hhbmdlXG5cdFx0XHRcdG9uQ2hhbmdlKCkge1xuXHRcdFx0XHRcdGNvbnN0ICRsaXN0R3JvdXAgPSAkKHRoaXMpLmNsb3Nlc3QoJy5saXN0Jyk7XG5cdFx0XHRcdFx0Y29uc3QgJHBhcmVudENoZWNrYm94ID0gJGxpc3RHcm91cC5jbG9zZXN0KCcuaXRlbScpLmNoaWxkcmVuKCcuY2hlY2tib3gnKTtcblx0XHRcdFx0XHRjb25zdCAkY2hlY2tib3ggPSAkbGlzdEdyb3VwLmZpbmQoJy5jaGVja2JveCcpO1xuXHRcdFx0XHRcdGxldCBhbGxDaGVja2VkID0gdHJ1ZTtcblx0XHRcdFx0XHRsZXQgYWxsVW5jaGVja2VkID0gdHJ1ZTtcblx0XHRcdFx0XHQvLyBjaGVjayB0byBzZWUgaWYgYWxsIG90aGVyIHNpYmxpbmdzIGFyZSBjaGVja2VkIG9yIHVuY2hlY2tlZFxuXHRcdFx0XHRcdCRjaGVja2JveC5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGlmICgkKHRoaXMpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcblx0XHRcdFx0XHRcdFx0YWxsVW5jaGVja2VkID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRhbGxDaGVja2VkID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0Ly8gc2V0IHBhcmVudCBjaGVja2JveCBzdGF0ZSwgYnV0IGRvbnQgdHJpZ2dlciBpdHMgb25DaGFuZ2UgY2FsbGJhY2tcblx0XHRcdFx0XHRpZiAoYWxsQ2hlY2tlZCkge1xuXHRcdFx0XHRcdFx0JHBhcmVudENoZWNrYm94LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYWxsVW5jaGVja2VkKSB7XG5cdFx0XHRcdFx0XHQkcGFyZW50Q2hlY2tib3guY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JHBhcmVudENoZWNrYm94LmNoZWNrYm94KCdzZXQgaW5kZXRlcm1pbmF0ZScpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXHRcdG1hbmFnZXIuJHVuQ2hlY2tCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ3VuY2hlY2snKTtcblx0XHR9KTtcblx0XHRtYW5hZ2VyLiR1c2VybmFtZS5vbignY2hhbmdlJywgKHZhbHVlKT0+e1xuXHRcdFx0Y29uc3QgdXNlcklkID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpZCcpO1xuXHRcdFx0Y29uc3QgbmV3VmFsdWUgPSBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ3VzZXJuYW1lJyk7XG5cdFx0XHRtYW5hZ2VyLmNoZWNrQXZhaWxhYmlsaXR5KG1hbmFnZXIub3JpZ2luYWxOYW1lLCBuZXdWYWx1ZSwgJ3VzZXJuYW1lJywgdXNlcklkKTtcblx0XHR9KTtcblx0XHRtYW5hZ2VyLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0bWFuYWdlci5vcmlnaW5hbE5hbWUgPSBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ3VzZXJuYW1lJyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBDaGVja3MgaWYgdXNlcm5hbWUgZG9lc24ndCBleGlzdCBpbiBkYXRhYmFzZVxuXHQgKiBAcGFyYW0gb2xkTmFtZVxuXHQgKiBAcGFyYW0gbmV3TmFtZVxuXHQgKiBAcGFyYW0gY3NzQ2xhc3NOYW1lXG5cdCAqIEBwYXJhbSB1c2VySWRcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRjaGVja0F2YWlsYWJpbGl0eShvbGROYW1lLCBuZXdOYW1lLCBjc3NDbGFzc05hbWUgPSAndXNlcm5hbWUnLCB1c2VySWQgPSAnJykge1xuXHRcdGlmIChvbGROYW1lID09PSBuZXdOYW1lKSB7XG5cdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvYXZhaWxhYmxlL3t2YWx1ZX1gLFxuXHRcdFx0c3RhdGVDb250ZXh0OiBgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdFx0XHRyZXN1bHQudXJsRGF0YSA9IHtcblx0XHRcdFx0XHR2YWx1ZTogbmV3TmFtZSxcblx0XHRcdFx0fTtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLm5hbWVBdmFpbGFibGUpIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiByZXNwb25zZS51c2VySWQgPT09IHVzZXJJZCkge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IG1hbmFnZXIuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IG1hbmFnZXIudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBtYW5hZ2VyLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBtYW5hZ2VyLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcblxufTtcblxuLy8gQ2hlY2sgdW5pcXVlbmVzcyBVc2VybmFtZVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdG1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=