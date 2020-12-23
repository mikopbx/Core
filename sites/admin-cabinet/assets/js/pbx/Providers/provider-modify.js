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
      var _this = this;

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

      provider.$additionalHostInput.on('input', function () {
        var value = $(_this).val();

        if (value) {
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
   * Shows dummy if we have zero rows
   */
  updateHostsTableView: function () {
    function updateHostsTableView() {
      var dummy = "<tr class=\"dummy\"><td colspan=\"4\" class=\"center aligned\">".concat(globalTranslate.pr_NoAnyAdditionalHosts, "</td></tr>");

      if ($(callQueue.memberRow).length === 0) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIiQiLCJmbiIsImZvcm0iLCJzZXR0aW5ncyIsInJ1bGVzIiwidXNlcm5hbWUiLCJub3JlZ2lzdGVyIiwibGVuZ3RoIiwicHJvdmlkZXIiLCIkZm9ybU9iaiIsIiRkaXJydHlGaWVsZCIsInByb3ZpZGVyVHlwZSIsInZhbCIsIiRjaGVja0JveGVzIiwiJGFjY29yZGlvbnMiLCIkZHJvcERvd25zIiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRxdWFsaWZ5VG9nZ2xlIiwiJHF1YWxpZnlGcmVxVG9nZ2xlIiwiJGFkZGl0aW9uYWxIb3N0SW5wdXQiLCJob3N0Um93IiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsImhvc3QiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0UmFuZ2UiLCJpbml0aWFsaXplIiwiY2hlY2tib3giLCJhY2NvcmRpb24iLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIm9uIiwidmFsdWUiLCIkdHIiLCJsYXN0IiwiJGNsb25lIiwiY2xvbmUiLCJzaG93IiwiYXR0ciIsImZpbmQiLCJodG1sIiwiYWZ0ZXIiLCJ1cGRhdGVIb3N0c1RhYmxlVmlldyIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiZSIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmUiLCJwcmV2ZW50RGVmYXVsdCIsImluaXRpYWxpemVGb3JtIiwiZHVtbXkiLCJwcl9Ob0FueUFkZGl0aW9uYWxIb3N0cyIsImNhbGxRdWV1ZSIsIm1lbWJlclJvdyIsImFwcGVuZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJyZXN1bHQiLCJkYXRhIiwiYXJyQWRkaXRpb25hbEhvc3RzIiwiZWFjaCIsImluZGV4Iiwib2JqIiwicHVzaCIsImFkZHJlc3MiLCJhZGRpdGlvbmFsSG9zdHMiLCJKU09OIiwic3RyaW5naWZ5IiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkE7QUFFQTtBQUNBQSxDQUFDLENBQUNDLEVBQUYsQ0FBS0MsSUFBTCxDQUFVQyxRQUFWLENBQW1CQyxLQUFuQixDQUF5QkMsUUFBekIsR0FBb0MsVUFBVUMsVUFBVixFQUFzQkQsUUFBdEIsRUFBZ0M7QUFDbkUsU0FBTyxFQUFFQSxRQUFRLENBQUNFLE1BQVQsS0FBb0IsQ0FBcEIsSUFBeUJELFVBQVUsS0FBSyxJQUExQyxDQUFQO0FBQ0EsQ0FGRDs7QUFJQSxJQUFNRSxRQUFRLEdBQUc7QUFDaEJDLEVBQUFBLFFBQVEsRUFBRVQsQ0FBQyxDQUFDLHFCQUFELENBREs7QUFFaEJVLEVBQUFBLFlBQVksRUFBRVYsQ0FBQyxDQUFDLFNBQUQsQ0FGQztBQUdoQlcsRUFBQUEsWUFBWSxFQUFFWCxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CWSxHQUFuQixFQUhFO0FBSWhCQyxFQUFBQSxXQUFXLEVBQUViLENBQUMsQ0FBQywrQkFBRCxDQUpFO0FBS2hCYyxFQUFBQSxXQUFXLEVBQUVkLENBQUMsQ0FBQyxtQ0FBRCxDQUxFO0FBTWhCZSxFQUFBQSxVQUFVLEVBQUVmLENBQUMsQ0FBQyxrQ0FBRCxDQU5HO0FBT2hCZ0IsRUFBQUEsZ0JBQWdCLEVBQUVoQixDQUFDLENBQUMsNENBQUQsQ0FQSDtBQVFoQmlCLEVBQUFBLGNBQWMsRUFBRWpCLENBQUMsQ0FBQyxVQUFELENBUkQ7QUFTaEJrQixFQUFBQSxrQkFBa0IsRUFBRWxCLENBQUMsQ0FBQyxlQUFELENBVEw7QUFVaEJtQixF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Q0csWUFBakI7QUFDQyxhQUFLLEtBQUw7QUFDQ29FLFVBQUFBLElBQUksQ0FBQ0MsR0FBTCxhQUFjQyxhQUFkO0FBQ0E7O0FBQ0QsYUFBSyxLQUFMO0FBQ0NGLFVBQUFBLElBQUksQ0FBQ0MsR0FBTCxhQUFjQyxhQUFkO0FBQ0E7O0FBQ0Q7QUFDQztBQVJGOztBQVVBRixNQUFBQSxJQUFJLENBQUMxRCxhQUFMLEdBQXFCYixRQUFRLENBQUNhLGFBQTlCO0FBQ0EwRCxNQUFBQSxJQUFJLENBQUNiLGdCQUFMLEdBQXdCMUQsUUFBUSxDQUFDMEQsZ0JBQWpDO0FBQ0FhLE1BQUFBLElBQUksQ0FBQ0QsZUFBTCxHQUF1QnRFLFFBQVEsQ0FBQ3NFLGVBQWhDO0FBQ0FDLE1BQUFBLElBQUksQ0FBQzlDLFVBQUw7QUFDQTs7QUE5SWU7QUFBQTtBQUFBLENBQWpCO0FBbUpBakMsQ0FBQyxDQUFDa0YsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjNFLEVBQUFBLFFBQVEsQ0FBQ3lCLFVBQVQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0gKi9cblxuLy8gY3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudXNlcm5hbWUgPSBmdW5jdGlvbiAobm9yZWdpc3RlciwgdXNlcm5hbWUpIHtcblx0cmV0dXJuICEodXNlcm5hbWUubGVuZ3RoID09PSAwICYmIG5vcmVnaXN0ZXIgIT09ICdvbicpO1xufTtcblxuY29uc3QgcHJvdmlkZXIgPSB7XG5cdCRmb3JtT2JqOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtJyksXG5cdCRkaXJydHlGaWVsZDogJCgnI2RpcnJ0eScpLFxuXHRwcm92aWRlclR5cGU6ICQoJyNwcm92aWRlclR5cGUnKS52YWwoKSxcblx0JGNoZWNrQm94ZXM6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmNoZWNrYm94JyksXG5cdCRhY2NvcmRpb25zOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC51aS5hY2NvcmRpb24nKSxcblx0JGRyb3BEb3duczogJCgnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuZHJvcGRvd24nKSxcblx0JGRlbGV0ZVJvd0J1dHRvbjogJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmRlbGV0ZS1yb3ctYnV0dG9uJyksXG5cdCRxdWFsaWZ5VG9nZ2xlOiAkKCcjcXVhbGlmeScpLFxuXHQkcXVhbGlmeUZyZXFUb2dnbGU6ICQoJyNxdWFsaWZ5LWZyZXEnKSxcblx0JGFkZGl0aW9uYWxIb3N0SW5wdXQ6ICQoJyNhZGRpdGlvbmFsLWhvc3QgaW5wdXQnKSxcblx0aG9zdFJvdzogJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmhvc3Qtcm93Jyxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdGRlc2NyaXB0aW9uOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0aG9zdDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2hvc3QnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0dXNlcm5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ3VzZXJuYW1lW25vcmVnaXN0ZXIsIHVzZXJuYW1lXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHBvcnQ6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdwb3J0Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRSYW5nZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRwcm92aWRlci4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuXHRcdHByb3ZpZGVyLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuXHRcdHByb3ZpZGVyLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblx0XHRwcm92aWRlci4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCh7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0aWYgKHByb3ZpZGVyLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcblx0XHRcdFx0XHRwcm92aWRlci4kcXVhbGlmeUZyZXFUb2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cHJvdmlkZXIuJHF1YWxpZnlGcmVxVG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdC8vIEFkZCBuZXcgc3RyaW5nIHRvIGFkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGFibGVcblx0XHRwcm92aWRlci4kYWRkaXRpb25hbEhvc3RJbnB1dC5vbignaW5wdXQnLCAoKT0+e1xuXHRcdFx0Y29uc3QgdmFsdWUgPSAkKHRoaXMpLnZhbCgpXG5cdFx0XHRpZiAodmFsdWUpIHtcblx0XHRcdFx0Y29uc3QgJHRyID0gJCgnLmhvc3Qtcm93LXRwbCcpLmxhc3QoKTtcblx0XHRcdFx0Y29uc3QgJGNsb25lID0gJHRyLmNsb25lKHRydWUpO1xuXHRcdFx0XHQkY2xvbmVcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2hvc3Qtcm93LXRwbCcpXG5cdFx0XHRcdFx0LmFkZENsYXNzKCdob3N0LXJvdycpXG5cdFx0XHRcdFx0LnNob3coKTtcblx0XHRcdFx0JGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCB2YWx1ZSk7XG5cdFx0XHRcdCRjbG9uZS5maW5kKCcuYWRkcmVzcycpLmh0bWwodmFsdWUpO1xuXHRcdFx0XHRpZiAoJChwcm92aWRlci5ob3N0Um93KS5sYXN0KCkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0JHRyLmFmdGVyKCRjbG9uZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JChwcm92aWRlci5ob3N0Um93KS5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwcm92aWRlci51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuXHRcdFx0XHRwcm92aWRlci4kZGlycnR5RmllbGQudmFsKE1hdGgucmFuZG9tKCkpO1xuXHRcdFx0XHRwcm92aWRlci4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Ly8gRGVsZXRlIGhvc3QgZnJvbSBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlXG5cdFx0cHJvdmlkZXIuJGRlbGV0ZVJvd0J1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0JChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcblx0XHRcdHByb3ZpZGVyLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG5cdFx0XHRwcm92aWRlci4kZGlycnR5RmllbGQudmFsKE1hdGgucmFuZG9tKCkpO1xuXHRcdFx0cHJvdmlkZXIuJGRpcnJ0eUZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHRcdHByb3ZpZGVyLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBTaG93cyBkdW1teSBpZiB3ZSBoYXZlIHplcm8gcm93c1xuXHQgKi9cblx0dXBkYXRlSG9zdHNUYWJsZVZpZXcoKSB7XG5cdFx0Y29uc3QgZHVtbXkgPSBgPHRyIGNsYXNzPVwiZHVtbXlcIj48dGQgY29sc3Bhbj1cIjRcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtnbG9iYWxUcmFuc2xhdGUucHJfTm9BbnlBZGRpdGlvbmFsSG9zdHN9PC90ZD48L3RyPmA7XG5cblx0XHRpZiAoJChjYWxsUXVldWUubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcblx0XHRcdCQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRib2R5JykuYXBwZW5kKGR1bW15KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHkgLmR1bW15JykucmVtb3ZlKCk7XG5cdFx0fVxuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBwcm92aWRlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cblx0XHRjb25zdCBhcnJBZGRpdGlvbmFsSG9zdHMgPSBbXTtcblx0XHQkKHByb3ZpZGVyLmhvc3RSb3cpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdGlmICgkKG9iaikuYXR0cignZGF0YS12YWx1ZScpKSB7XG5cdFx0XHRcdGFyckFkZGl0aW9uYWxIb3N0cy5wdXNoKHtcblx0XHRcdFx0XHRhZGRyZXNzOiAkKG9iaikuYXR0cignZGF0YS12YWx1ZScpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXN1bHQuZGF0YS5hZGRpdGlvbmFsSG9zdHMgPSBKU09OLnN0cmluZ2lmeShhcnJBZGRpdGlvbmFsSG9zdHMpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gcHJvdmlkZXIuJGZvcm1PYmo7XG5cdFx0c3dpdGNoIChwcm92aWRlci5wcm92aWRlclR5cGUpIHtcblx0XHRcdGNhc2UgJ1NJUCc6XG5cdFx0XHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvc2F2ZS9zaXBgO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0lBWCc6XG5cdFx0XHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvc2F2ZS9pYXhgO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gcHJvdmlkZXIudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBwcm92aWRlci5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gcHJvdmlkZXIuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0cHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=