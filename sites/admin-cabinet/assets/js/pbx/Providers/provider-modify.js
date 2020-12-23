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

/* global globalRootUrl, globalTranslate, Form */
// custom form validation rule
$.fn.form.settings.rules.username = function (noregister, username) {
  return !(username.length === 0 && noregister !== 'on');
};

var provider = {
  $formObj: $('#save-provider-form'),
  $dirrtyField: $('#dirrty'),
  providerType: $('#providerType').val(),
  $checkBoxes: $('#save-provider-form .checkbox'),
  $accordions: $('#save-provider-form .ui.accordion'),
  $dropDowns: $('#save-provider-form .ui.dropdown'),
  $deleteRowButton: $('#additional-hosts-table .delete-row-button'),
  $qualifyToggle: $('#qualify'),
  $qualifyFreqToggle: $('#qualify-freq'),
  $additionalHostInput: $('#additional-host input'),
  hostInputValidation: /^((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\/(\d|[1-2]\d|3[0-2]))?|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+)$/gm,
  hostRow: '#save-provider-form .host-row',
  validateRules: {
    description: {
      identifier: 'description',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
      }]
    },
    host: {
      identifier: 'host',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
      }]
    },
    username: {
      identifier: 'username',
      rules: [{
        type: 'username[noregister, username]',
        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
      }]
    },
    port: {
      identifier: 'port',
      rules: [{
        type: 'integer[1..65535]',
        prompt: globalTranslate.pr_ValidationProviderPortRange
      }]
    }
  },
  initialize: function () {
    function initialize() {
      provider.$checkBoxes.checkbox();
      provider.$accordions.accordion();
      provider.$dropDowns.dropdown();
      provider.$qualifyToggle.checkbox({
        onChange: function () {
          function onChange() {
            if (provider.$qualifyToggle.checkbox('is checked')) {
              provider.$qualifyFreqToggle.removeClass('disabled');
            } else {
              provider.$qualifyFreqToggle.addClass('disabled');
            }
          }

          return onChange;
        }()
      }); // Add new string to additional-hosts-table table

      provider.$additionalHostInput.keypress(function (e) {
        if (e.which === 13) {
          provider.cbOnCompleteHostAddress();
        }
      }); // Delete host from additional-hosts-table

      provider.$deleteRowButton.on('click', function (e) {
        $(e.target).closest('tr').remove();
        provider.updateHostsTableView();
        provider.$dirrtyField.val(Math.random());
        provider.$dirrtyField.trigger('change');
        e.preventDefault();
        return false;
      });
      provider.initializeForm();
    }

    return initialize;
  }(),

  /**
   * Adds record to hosts table
   */
  cbOnCompleteHostAddress: function () {
    function cbOnCompleteHostAddress() {
      var value = provider.$formObj.form('get value', 'additional-host');

      if (value) {
        var validation = value.match(provider.hostInputValidation);

        if (validation === null || validation.length === 0) {
          provider.$additionalHostInput.transition('shake');
          return;
        }

        if ($(".host-row[data-value=\"".concat(value, "\"]")).length === 0) {
          var $tr = $('.host-row-tpl').last();
          var $clone = $tr.clone(true);
          $clone.removeClass('host-row-tpl').addClass('host-row').show();
          $clone.attr('data-value', value);
          $clone.find('.address').html(value);

          if ($(provider.hostRow).last().length === 0) {
            $tr.after($clone);
          } else {
            $(provider.hostRow).last().after($clone);
          }

          provider.updateHostsTableView();
          provider.$dirrtyField.val(Math.random());
          provider.$dirrtyField.trigger('change');
        }

        provider.$additionalHostInput.val('');
      }
    }

    return cbOnCompleteHostAddress;
  }(),

  /**
   * Shows dummy if we have zero rows
   */
  updateHostsTableView: function () {
    function updateHostsTableView() {
      var dummy = "<tr class=\"dummy\"><td colspan=\"4\" class=\"center aligned\">".concat(globalTranslate.pr_NoAnyAdditionalHosts, "</td></tr>");

      if ($(provider.hostRow).length === 0) {
        $('#additional-hosts-table tbody').append(dummy);
      } else {
        $('#additional-hosts-table tbody .dummy').remove();
      }
    }

    return updateHostsTableView;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = provider.$formObj.form('get values');
      var arrAdditionalHosts = [];
      $(provider.hostRow).each(function (index, obj) {
        if ($(obj).attr('data-value')) {
          arrAdditionalHosts.push({
            address: $(obj).attr('data-value')
          });
        }
      });
      result.data.additionalHosts = JSON.stringify(arrAdditionalHosts);
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
      Form.$formObj = provider.$formObj;

      switch (provider.providerType) {
        case 'SIP':
          Form.url = "".concat(globalRootUrl, "providers/save/sip");
          break;

        case 'IAX':
          Form.url = "".concat(globalRootUrl, "providers/save/iax");
          break;

        default:
          return;
      }

      Form.validateRules = provider.validateRules;
      Form.cbBeforeSendForm = provider.cbBeforeSendForm;
      Form.cbAfterSendForm = provider.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  provider.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIiQiLCJmbiIsImZvcm0iLCJzZXR0aW5ncyIsInJ1bGVzIiwidXNlcm5hbWUiLCJub3JlZ2lzdGVyIiwibGVuZ3RoIiwicHJvdmlkZXIiLCIkZm9ybU9iaiIsIiRkaXJydHlGaWVsZCIsInByb3ZpZGVyVHlwZSIsInZhbCIsIiRjaGVja0JveGVzIiwiJGFjY29yZGlvbnMiLCIkZHJvcERvd25zIiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRxdWFsaWZ5VG9nZ2xlIiwiJHF1YWxpZnlGcmVxVG9nZ2xlIiwiJGFkZGl0aW9uYWxIb3N0SW5wdXQiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwiaG9zdFJvdyIsInZhbGlkYXRlUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJob3N0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHkiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydFJhbmdlIiwiaW5pdGlhbGl6ZSIsImNoZWNrYm94IiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJrZXlwcmVzcyIsImUiLCJ3aGljaCIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwib24iLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJNYXRoIiwicmFuZG9tIiwidHJpZ2dlciIsInByZXZlbnREZWZhdWx0IiwiaW5pdGlhbGl6ZUZvcm0iLCJ2YWx1ZSIsInZhbGlkYXRpb24iLCJtYXRjaCIsInRyYW5zaXRpb24iLCIkdHIiLCJsYXN0IiwiJGNsb25lIiwiY2xvbmUiLCJzaG93IiwiYXR0ciIsImZpbmQiLCJodG1sIiwiYWZ0ZXIiLCJkdW1teSIsInByX05vQW55QWRkaXRpb25hbEhvc3RzIiwiYXBwZW5kIiwiY2JCZWZvcmVTZW5kRm9ybSIsInJlc3VsdCIsImRhdGEiLCJhcnJBZGRpdGlvbmFsSG9zdHMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJwdXNoIiwiYWRkcmVzcyIsImFkZGl0aW9uYWxIb3N0cyIsIkpTT04iLCJzdHJpbmdpZnkiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTtBQUVBO0FBQ0FBLENBQUMsQ0FBQ0MsRUFBRixDQUFLQyxJQUFMLENBQVVDLFFBQVYsQ0FBbUJDLEtBQW5CLENBQXlCQyxRQUF6QixHQUFvQyxVQUFVQyxVQUFWLEVBQXNCRCxRQUF0QixFQUFnQztBQUNuRSxTQUFPLEVBQUVBLFFBQVEsQ0FBQ0UsTUFBVCxLQUFvQixDQUFwQixJQUF5QkQsVUFBVSxLQUFLLElBQTFDLENBQVA7QUFDQSxDQUZEOztBQUlBLElBQU1FLFFBQVEsR0FBRztBQUNoQkMsRUFBQUEsUUFBUSxFQUFFVCxDQUFDLENBQUMscUJBQUQsQ0FESztBQUVoQlUsRUFBQUEsWUFBWSxFQUFFVixDQUFDLENBQUMsU0FBRCxDQUZDO0FBR2hCVyxFQUFBQSxZQUFZLEVBQUVYLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJZLEdBQW5CLEVBSEU7QUFJaEJDLEVBQUFBLFdBQVcsRUFBRWIsQ0FBQyxDQUFDLCtCQUFELENBSkU7QUFLaEJjLEVBQUFBLFdBQVcsRUFBRWQsQ0FBQyxDQUFDLG1DQUFELENBTEU7QUFNaEJlLEVBQUFBLFVBQVUsRUFBRWYsQ0FBQyxDQUFDLGtDQUFELENBTkc7QUFPaEJnQixFQUFBQSxnQkFBZ0IsRUFBRWhCLENBQUMsQ0FBQyw0Q0FBRCxDQVBIO0FBUWhCaUIsRUFBQUEsY0FBYyxFQUFFakIs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QzJFLGVBQWhDO0FBQ0FDLE1BQUFBLElBQUksQ0FBQ2xELFVBQUw7QUFDQTs7QUFqS2U7QUFBQTtBQUFBLENBQWpCO0FBc0tBbEMsQ0FBQyxDQUFDdUYsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmhGLEVBQUFBLFFBQVEsQ0FBQzBCLFVBQVQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0gKi9cblxuLy8gY3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudXNlcm5hbWUgPSBmdW5jdGlvbiAobm9yZWdpc3RlciwgdXNlcm5hbWUpIHtcblx0cmV0dXJuICEodXNlcm5hbWUubGVuZ3RoID09PSAwICYmIG5vcmVnaXN0ZXIgIT09ICdvbicpO1xufTtcblxuY29uc3QgcHJvdmlkZXIgPSB7XG5cdCRmb3JtT2JqOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtJyksXG5cdCRkaXJydHlGaWVsZDogJCgnI2RpcnJ0eScpLFxuXHRwcm92aWRlclR5cGU6ICQoJyNwcm92aWRlclR5cGUnKS52YWwoKSxcblx0JGNoZWNrQm94ZXM6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmNoZWNrYm94JyksXG5cdCRhY2NvcmRpb25zOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC51aS5hY2NvcmRpb24nKSxcblx0JGRyb3BEb3duczogJCgnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuZHJvcGRvd24nKSxcblx0JGRlbGV0ZVJvd0J1dHRvbjogJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmRlbGV0ZS1yb3ctYnV0dG9uJyksXG5cdCRxdWFsaWZ5VG9nZ2xlOiAkKCcjcXVhbGlmeScpLFxuXHQkcXVhbGlmeUZyZXFUb2dnbGU6ICQoJyNxdWFsaWZ5LWZyZXEnKSxcblx0JGFkZGl0aW9uYWxIb3N0SW5wdXQ6ICQoJyNhZGRpdGlvbmFsLWhvc3QgaW5wdXQnKSxcblx0aG9zdElucHV0VmFsaWRhdGlvbjogL14oKChbMC05XXxbMS05XVswLTldfDFbMC05XXsyfXwyWzAtNF1bMC05XXwyNVswLTVdKVxcLil7M30oWzAtOV18WzEtOV1bMC05XXwxWzAtOV17Mn18MlswLTRdWzAtOV18MjVbMC01XSkoXFwvKFxcZHxbMS0yXVxcZHwzWzAtMl0pKT98W2EtekEtWjAtOV1bYS16QS1aMC05LV17MSw2MX1bYS16QS1aMC05XSg/OlxcLlthLXpBLVpdezIsfSkrKSQvZ20sXG5cdGhvc3RSb3c6ICcjc2F2ZS1wcm92aWRlci1mb3JtIC5ob3N0LXJvdycsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRkZXNjcmlwdGlvbjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGhvc3Q6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdob3N0Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHVzZXJuYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICd1c2VybmFtZVtub3JlZ2lzdGVyLCB1c2VybmFtZV0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRwb3J0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAncG9ydCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0UmFuZ2UsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0cHJvdmlkZXIuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcblx0XHRwcm92aWRlci4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcblx0XHRwcm92aWRlci4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cdFx0cHJvdmlkZXIuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goe1xuXHRcdFx0b25DaGFuZ2UoKSB7XG5cdFx0XHRcdGlmIChwcm92aWRlci4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG5cdFx0XHRcdFx0cHJvdmlkZXIuJHF1YWxpZnlGcmVxVG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHByb3ZpZGVyLiRxdWFsaWZ5RnJlcVRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0XHQvLyBBZGQgbmV3IHN0cmluZyB0byBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRhYmxlXG5cdFx0cHJvdmlkZXIuJGFkZGl0aW9uYWxIb3N0SW5wdXQua2V5cHJlc3MoKGUpPT57XG5cdFx0XHRpZiAoZS53aGljaCA9PT0gMTMpIHtcblx0XHRcdFx0cHJvdmlkZXIuY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQvLyBEZWxldGUgaG9zdCBmcm9tIGFkZGl0aW9uYWwtaG9zdHMtdGFibGVcblx0XHRwcm92aWRlci4kZGVsZXRlUm93QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHQkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuXHRcdFx0cHJvdmlkZXIudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcblx0XHRcdHByb3ZpZGVyLiRkaXJydHlGaWVsZC52YWwoTWF0aC5yYW5kb20oKSk7XG5cdFx0XHRwcm92aWRlci4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdFx0cHJvdmlkZXIuaW5pdGlhbGl6ZUZvcm0oKTtcblx0fSxcblx0LyoqXG5cdCAqIEFkZHMgcmVjb3JkIHRvIGhvc3RzIHRhYmxlXG5cdCAqL1xuXHRjYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpe1xuXHRcdGNvbnN0IHZhbHVlID0gcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FkZGl0aW9uYWwtaG9zdCcpO1xuXHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0Y29uc3QgdmFsaWRhdGlvbiA9IHZhbHVlLm1hdGNoKHByb3ZpZGVyLmhvc3RJbnB1dFZhbGlkYXRpb24pO1xuXHRcdFx0aWYgKHZhbGlkYXRpb249PT1udWxsXG5cdFx0XHRcdHx8IHZhbGlkYXRpb24ubGVuZ3RoPT09MCl7XG5cdFx0XHRcdHByb3ZpZGVyLiRhZGRpdGlvbmFsSG9zdElucHV0LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCQoYC5ob3N0LXJvd1tkYXRhLXZhbHVlPVwiJHt2YWx1ZX1cIl1gKS5sZW5ndGg9PT0wKXtcblx0XHRcdFx0Y29uc3QgJHRyID0gJCgnLmhvc3Qtcm93LXRwbCcpLmxhc3QoKTtcblx0XHRcdFx0Y29uc3QgJGNsb25lID0gJHRyLmNsb25lKHRydWUpO1xuXHRcdFx0XHQkY2xvbmVcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2hvc3Qtcm93LXRwbCcpXG5cdFx0XHRcdFx0LmFkZENsYXNzKCdob3N0LXJvdycpXG5cdFx0XHRcdFx0LnNob3coKTtcblx0XHRcdFx0JGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCB2YWx1ZSk7XG5cdFx0XHRcdCRjbG9uZS5maW5kKCcuYWRkcmVzcycpLmh0bWwodmFsdWUpO1xuXHRcdFx0XHRpZiAoJChwcm92aWRlci5ob3N0Um93KS5sYXN0KCkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0JHRyLmFmdGVyKCRjbG9uZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JChwcm92aWRlci5ob3N0Um93KS5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwcm92aWRlci51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuXHRcdFx0XHRwcm92aWRlci4kZGlycnR5RmllbGQudmFsKE1hdGgucmFuZG9tKCkpO1xuXHRcdFx0XHRwcm92aWRlci4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHR9XG5cdFx0XHRwcm92aWRlci4kYWRkaXRpb25hbEhvc3RJbnB1dC52YWwoJycpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIFNob3dzIGR1bW15IGlmIHdlIGhhdmUgemVybyByb3dzXG5cdCAqL1xuXHR1cGRhdGVIb3N0c1RhYmxlVmlldygpIHtcblx0XHRjb25zdCBkdW1teSA9IGA8dHIgY2xhc3M9XCJkdW1teVwiPjx0ZCBjb2xzcGFuPVwiNFwiIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9Ob0FueUFkZGl0aW9uYWxIb3N0c308L3RkPjwvdHI+YDtcblxuXHRcdGlmICgkKHByb3ZpZGVyLmhvc3RSb3cpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0JCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHVtbXkpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0Ym9keSAuZHVtbXknKS5yZW1vdmUoKTtcblx0XHR9XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuXHRcdGNvbnN0IGFyckFkZGl0aW9uYWxIb3N0cyA9IFtdO1xuXHRcdCQocHJvdmlkZXIuaG9zdFJvdykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0aWYgKCQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJykpIHtcblx0XHRcdFx0YXJyQWRkaXRpb25hbEhvc3RzLnB1c2goe1xuXHRcdFx0XHRcdGFkZHJlc3M6ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyksXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHJlc3VsdC5kYXRhLmFkZGl0aW9uYWxIb3N0cyA9IEpTT04uc3RyaW5naWZ5KGFyckFkZGl0aW9uYWxIb3N0cyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBwcm92aWRlci4kZm9ybU9iajtcblx0XHRzd2l0Y2ggKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSkge1xuXHRcdFx0Y2FzZSAnU0lQJzpcblx0XHRcdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9zYXZlL3NpcGA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnSUFYJzpcblx0XHRcdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9zYXZlL2lheGA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBwcm92aWRlci52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHByb3ZpZGVyLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBwcm92aWRlci5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRwcm92aWRlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==