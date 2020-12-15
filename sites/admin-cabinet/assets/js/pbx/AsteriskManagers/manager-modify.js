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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJG1hc3RlckNoZWNrQm94ZXMiLCIkY2hpbGRyZW5DaGVja0JveGVzIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiR1c2VybmFtZSIsIm9yaWdpbmFsTmFtZSIsInZhbGlkYXRlUnVsZXMiLCJ1c2VybmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHkiLCJhbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlIiwic2VjcmV0IiwiYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHkiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIiRjaGlsZENoZWNrYm94IiwiY2xvc2VzdCIsInNpYmxpbmdzIiwiZmluZCIsIm9uVW5jaGVja2VkIiwiZmlyZU9uSW5pdCIsIm9uQ2hhbmdlIiwiJGxpc3RHcm91cCIsIiRwYXJlbnRDaGVja2JveCIsImNoaWxkcmVuIiwiJGNoZWNrYm94IiwiYWxsQ2hlY2tlZCIsImFsbFVuY2hlY2tlZCIsImVhY2giLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInZhbHVlIiwidXNlcklkIiwiZm9ybSIsIm5ld1ZhbHVlIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJpbml0aWFsaXplRm9ybSIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJuYW1lQXZhaWxhYmxlIiwibGVuZ3RoIiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTtBQUVBLElBQU1BLE9BQU8sR0FBRztBQUNmQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURJO0FBRWZDLEVBQUFBLFVBQVUsRUFBRUQsQ0FBQyxDQUFDLDZCQUFELENBRkU7QUFHZkUsRUFBQUEsaUJBQWlCLEVBQUVGLENBQUMsQ0FBQyx1Q0FBRCxDQUhMO0FBSWZHLEVBQUFBLG1CQUFtQixFQUFFSCxDQUFDLENBQUMsc0NBQUQsQ0FKUDtBQUtmSSxFQUFBQSxjQUFjLEVBQUVKLENBQUMsQ0FBQyxnQ0FBRCxDQUxGO0FBTWZLLEVBQUFBLGNBQWMsRUFBRUwsQ0FBQyxDQUFDLGlCQUFELENBTkY7QUFPZk0sRUFBQUEsU0FBUyxFQUFFTixDQUFDLENBQUMsV0FBRCxDQVBHO0FBUWZPLEVBQUFBLFlBQVksRUFBQyxFQVJFO0FBU2ZDLEVBQUFBLGFBQWEsRUFBRTtBQUNkQyxJQUFBQSxRQUFRLEVBQUU7QUFDVEMsTUFBQUEsVUFBVSxFQUFFLFVBREg7QUFFVEMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ0MsUUFBQUEsSUFBSSxFQUFFLE9BRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRnpCLE9BRE0sRUFLTjtBQUNDSCxRQUFBQSxJQUFJLEVBQUUsMkJBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNFO0FBRnpCLE9BTE07QUFGRSxLQURJO0FBY2RDLElBQUFBLE1BQU0sRUFBRTtBQUNQUCxNQUFBQSxVQUFVLEVBQUUsUUFETDtBQUVQQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDQyxRQUFBQSxJQUFJLEVBQUUs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MElmckIsRUFBQUEsY0ExSWU7QUFBQSw4QkEwSUU7QUFDaEJzQixNQUFBQSxJQUFJLENBQUNwRSxRQUFMLEdBQWdCRCxPQUFPLENBQUNDLFFBQXhCO0FBQ0FvRSxNQUFBQSxJQUFJLENBQUNkLEdBQUwsYUFBY0MsYUFBZDtBQUNBYSxNQUFBQSxJQUFJLENBQUMzRCxhQUFMLEdBQXFCVixPQUFPLENBQUNVLGFBQTdCO0FBQ0EyRCxNQUFBQSxJQUFJLENBQUNILGdCQUFMLEdBQXdCbEUsT0FBTyxDQUFDa0UsZ0JBQWhDO0FBQ0FHLE1BQUFBLElBQUksQ0FBQ0QsZUFBTCxHQUF1QnBFLE9BQU8sQ0FBQ29FLGVBQS9CO0FBQ0FDLE1BQUFBLElBQUksQ0FBQ2hELFVBQUw7QUFDQTs7QUFqSmM7QUFBQTtBQUFBLENBQWhCLEMsQ0FxSkE7O0FBQ0FuQixDQUFDLENBQUNvRSxFQUFGLENBQUsxQixJQUFMLENBQVVlLFFBQVYsQ0FBbUI5QyxLQUFuQixDQUF5QjBELFNBQXpCLEdBQXFDLFVBQUM3QixLQUFELEVBQVE4QixTQUFSO0FBQUEsU0FBc0J0RSxDQUFDLFlBQUtzRSxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7O0FBRUF2RSxDQUFDLENBQUN3RSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCM0UsRUFBQUEsT0FBTyxDQUFDcUIsVUFBUjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtICovXG5cbmNvbnN0IG1hbmFnZXIgPSB7XG5cdCRmb3JtT2JqOiAkKCcjc2F2ZS1hbWktZm9ybScpLFxuXHQkZHJvcERvd25zOiAkKCcjc2F2ZS1hbWktZm9ybSAudWkuZHJvcGRvd24nKSxcblx0JG1hc3RlckNoZWNrQm94ZXM6ICQoJyNzYXZlLWFtaS1mb3JtIC5saXN0IC5tYXN0ZXIuY2hlY2tib3gnKSxcblx0JGNoaWxkcmVuQ2hlY2tCb3hlczogJCgnI3NhdmUtYW1pLWZvcm0gLmxpc3QgLmNoaWxkLmNoZWNrYm94JyksXG5cdCRhbGxDaGVja0JveGVzOiAkKCcjc2F2ZS1hbWktZm9ybSAubGlzdCAuY2hlY2tib3gnKSxcblx0JHVuQ2hlY2tCdXR0b246ICQoJy51bmNoZWNrLmJ1dHRvbicpLFxuXHQkdXNlcm5hbWU6ICQoJyN1c2VybmFtZScpLFxuXHRvcmlnaW5hbE5hbWU6JycsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHR1c2VybmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGlzdFJ1bGVbdXNlcm5hbWUtZXJyb3JdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHNlY3JldDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3NlY3JldCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRtYW5hZ2VyLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblx0XHRtYW5hZ2VyLiRtYXN0ZXJDaGVja0JveGVzXG5cdFx0XHQuY2hlY2tib3goe1xuXHRcdFx0XHQvLyBjaGVjayBhbGwgY2hpbGRyZW5cblx0XHRcdFx0b25DaGVja2VkKCkge1xuXHRcdFx0XHRcdGNvbnN0XG5cdFx0XHRcdFx0XHQkY2hpbGRDaGVja2JveCA9ICQodGhpcykuY2xvc2VzdCgnLmNoZWNrYm94Jykuc2libGluZ3MoJy5saXN0JykuZmluZCgnLmNoZWNrYm94Jyk7XG5cdFx0XHRcdFx0JGNoaWxkQ2hlY2tib3guY2hlY2tib3goJ2NoZWNrJyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdC8vIHVuY2hlY2sgYWxsIGNoaWxkcmVuXG5cdFx0XHRcdG9uVW5jaGVja2VkKCkge1xuXHRcdFx0XHRcdGNvbnN0XG5cdFx0XHRcdFx0XHQkY2hpbGRDaGVja2JveCA9ICQodGhpcykuY2xvc2VzdCgnLmNoZWNrYm94Jykuc2libGluZ3MoJy5saXN0JykuZmluZCgnLmNoZWNrYm94Jyk7XG5cdFx0XHRcdFx0JGNoaWxkQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXHRcdG1hbmFnZXIuJGNoaWxkcmVuQ2hlY2tCb3hlc1xuXHRcdFx0LmNoZWNrYm94KHtcblx0XHRcdFx0Ly8gRmlyZSBvbiBsb2FkIHRvIHNldCBwYXJlbnQgdmFsdWVcblx0XHRcdFx0ZmlyZU9uSW5pdDogdHJ1ZSxcblx0XHRcdFx0Ly8gQ2hhbmdlIHBhcmVudCBzdGF0ZSBvbiBlYWNoIGNoaWxkIGNoZWNrYm94IGNoYW5nZVxuXHRcdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0XHRjb25zdCAkbGlzdEdyb3VwID0gJCh0aGlzKS5jbG9zZXN0KCcubGlzdCcpO1xuXHRcdFx0XHRcdGNvbnN0ICRwYXJlbnRDaGVja2JveCA9ICRsaXN0R3JvdXAuY2xvc2VzdCgnLml0ZW0nKS5jaGlsZHJlbignLmNoZWNrYm94Jyk7XG5cdFx0XHRcdFx0Y29uc3QgJGNoZWNrYm94ID0gJGxpc3RHcm91cC5maW5kKCcuY2hlY2tib3gnKTtcblx0XHRcdFx0XHRsZXQgYWxsQ2hlY2tlZCA9IHRydWU7XG5cdFx0XHRcdFx0bGV0IGFsbFVuY2hlY2tlZCA9IHRydWU7XG5cdFx0XHRcdFx0Ly8gY2hlY2sgdG8gc2VlIGlmIGFsbCBvdGhlciBzaWJsaW5ncyBhcmUgY2hlY2tlZCBvciB1bmNoZWNrZWRcblx0XHRcdFx0XHQkY2hlY2tib3guZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG5cdFx0XHRcdFx0XHRcdGFsbFVuY2hlY2tlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0YWxsQ2hlY2tlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdC8vIHNldCBwYXJlbnQgY2hlY2tib3ggc3RhdGUsIGJ1dCBkb250IHRyaWdnZXIgaXRzIG9uQ2hhbmdlIGNhbGxiYWNrXG5cdFx0XHRcdFx0aWYgKGFsbENoZWNrZWQpIHtcblx0XHRcdFx0XHRcdCRwYXJlbnRDaGVja2JveC5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFsbFVuY2hlY2tlZCkge1xuXHRcdFx0XHRcdFx0JHBhcmVudENoZWNrYm94LmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCRwYXJlbnRDaGVja2JveC5jaGVja2JveCgnc2V0IGluZGV0ZXJtaW5hdGUnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblx0XHRtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG5cdFx0fSk7XG5cdFx0bWFuYWdlci4kdXNlcm5hbWUub24oJ2NoYW5nZScsICh2YWx1ZSk9Pntcblx0XHRcdGNvbnN0IHVzZXJJZCA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywnaWQnKTtcblx0XHRcdGNvbnN0IG5ld1ZhbHVlID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCd1c2VybmFtZScpO1xuXHRcdFx0bWFuYWdlci5jaGVja0F2YWlsYWJpbGl0eShtYW5hZ2VyLm9yaWdpbmFsTmFtZSwgbmV3VmFsdWUsICd1c2VybmFtZScsIHVzZXJJZCk7XG5cdFx0fSk7XG5cdFx0bWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuXHRcdG1hbmFnZXIub3JpZ2luYWxOYW1lID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCd1c2VybmFtZScpO1xuXHR9LFxuXHQvKipcblx0ICogQ2hlY2tzIGlmIHVzZXJuYW1lIGRvZXNuJ3QgZXhpc3QgaW4gZGF0YWJhc2Vcblx0ICogQHBhcmFtIG9sZE5hbWVcblx0ICogQHBhcmFtIG5ld05hbWVcblx0ICogQHBhcmFtIGNzc0NsYXNzTmFtZVxuXHQgKiBAcGFyYW0gdXNlcklkXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y2hlY2tBdmFpbGFiaWxpdHkob2xkTmFtZSwgbmV3TmFtZSwgY3NzQ2xhc3NOYW1lID0gJ3VzZXJuYW1lJywgdXNlcklkID0gJycpIHtcblx0XHRpZiAob2xkTmFtZSA9PT0gbmV3TmFtZSkge1xuXHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL2F2YWlsYWJsZS97dmFsdWV9YCxcblx0XHRcdHN0YXRlQ29udGV4dDogYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRcdFx0cmVzdWx0LnVybERhdGEgPSB7XG5cdFx0XHRcdFx0dmFsdWU6IG5ld05hbWUsXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5uYW1lQXZhaWxhYmxlKSB7XG5cdFx0XHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAodXNlcklkLmxlbmd0aCA+IDAgJiYgcmVzcG9uc2UudXNlcklkID09PSB1c2VySWQpIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBtYW5hZ2VyLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1hc3Rlcmlzay1tYW5hZ2Vycy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBtYW5hZ2VyLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFuYWdlci5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFuYWdlci5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG5cbn07XG5cbi8vIENoZWNrIHVuaXF1ZW5lc3MgVXNlcm5hbWVcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRtYW5hZ2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19