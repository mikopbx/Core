"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, globalTranslate, UserMessage */
var PbxExtensionStatus = /*#__PURE__*/function () {
  function PbxExtensionStatus() {
    _classCallCheck(this, PbxExtensionStatus);
  }

  _createClass(PbxExtensionStatus, [{
    key: "initialize",
    value: function initialize(uniqid) {
      var changeLabel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
      this.$toggle = $(".ui.toggle.checkbox[data-value=\"".concat(uniqid, "\"]"));
      this.$toggleSegment = $('#module-status-toggle-segment');
      this.$allToggles = $(".ui.toggle.checkbox");
      this.$statusIcon = $("tr#".concat(uniqid, " i.status-icon"));
      this.$toggleSegment.show();

      if (changeLabel) {
        this.$label = $(".ui.toggle.checkbox[data-value=\"".concat(uniqid, "\"]")).find('label');
      } else {
        this.$label = false;
      }

      this.uniqid = uniqid;
      this.$disabilityFields = $("tr#".concat(uniqid, " .disability"));
      var cbOnChecked = $.proxy(this.cbOnChecked, this);
      var cbOnUnchecked = $.proxy(this.cbOnUnchecked, this);
      this.$toggle.checkbox({
        onChecked: cbOnChecked,
        onUnchecked: cbOnUnchecked
      });
    }
  }, {
    key: "changeLabelText",
    value: function changeLabelText(newText) {
      if (this.$label) {
        this.$label.text(newText);
      }
    }
  }, {
    key: "cbOnChecked",
    value: function cbOnChecked() {
      this.$statusIcon.addClass('spinner loading icon');
      this.$allToggles.addClass('disabled');
      $('a.button').addClass('disabled');
      this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
      var cbAfterModuleEnable = $.proxy(this.cbAfterModuleEnable, this);
      PbxApi.SystemEnableModule(this.uniqid, cbAfterModuleEnable);
    }
  }, {
    key: "cbOnUnchecked",
    value: function cbOnUnchecked() {
      this.$statusIcon.addClass('spinner loading icon');
      this.$allToggles.addClass('disabled');
      $('a.button').addClass('disabled');
      this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
      var cbAfterModuleDisable = $.proxy(this.cbAfterModuleDisable, this);
      PbxApi.SystemDisableModule(this.uniqid, cbAfterModuleDisable);
    } // Callback function after disabling the module

  }, {
    key: "cbAfterModuleDisable",
    value: function cbAfterModuleDisable(response, success) {
      if (success) {
        // Update UI to show module is disabled
        this.$toggle.checkbox('set unchecked');
        this.$statusIcon.removeClass('spinner loading icon');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled); // Trigger events to indicate module status and config data has changed

        var event = document.createEvent('Event');
        event.initEvent('ModuleStatusChanged', false, true);
        window.dispatchEvent(event);
        event.initEvent('ConfigDataChanged', false, true);
        window.dispatchEvent(event); // Disable input fields and show message for changed objects

        this.$disabilityFields.addClass('disabled');

        if (response.data.changedObjects !== undefined) {
          UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
        } // Refresh the page to reflect changes


        window.location.reload();
      } else {
        this.$toggle.checkbox('set checked');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
        this.$disabilityFields.removeClass('disabled');

        if (response !== undefined && response.messages !== undefined) {
          UserMessage.showMultiString(response.messages, globalTranslate.ext_ModuleChangeStatusError);
        }
      }

      this.$allToggles.removeClass('disabled');
      $('a.button').removeClass('disabled');
      this.$statusIcon.removeClass('spinner loading icon');
    } // Callback function after enabling the module

  }, {
    key: "cbAfterModuleEnable",
    value: function cbAfterModuleEnable(response, success) {
      if (success) {
        // Update UI to show module is enabled
        this.$toggle.checkbox('set checked');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled); // Trigger events to indicate module status and config data has changed

        var event = document.createEvent('Event');
        event.initEvent('ModuleStatusChanged', false, true);
        window.dispatchEvent(event);
        event.initEvent('ConfigDataChanged', false, true);
        window.dispatchEvent(event); // Enable input fields and show message for changed objects

        this.$disabilityFields.removeClass('disabled');

        if (response.data.changedObjects !== undefined) {
          UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
        } // Refresh the page to reflect changes


        window.location.reload();
      } else {
        this.$toggle.checkbox('set unchecked');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
        this.$disabilityFields.addClass('disabled');

        if (response !== undefined && response.messages !== undefined) {
          UserMessage.showMultiString(response.messages, globalTranslate.ext_ModuleChangeStatusError);
        }
      }

      this.$allToggles.removeClass('disabled');
      this.$statusIcon.removeClass('spinner loading icon');
      $('a.button').removeClass('disabled');
    }
  }]);

  return PbxExtensionStatus;
}();

$(document).ready(function () {
  var uniqId = $('#module-status-toggle').attr('data-value');

  if (uniqId) {
    var pageStatus = new PbxExtensionStatus();
    pageStatus.initialize(uniqId, true);
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJHRvZ2dsZVNlZ21lbnQiLCIkYWxsVG9nZ2xlcyIsIiRzdGF0dXNJY29uIiwic2hvdyIsIiRsYWJlbCIsImZpbmQiLCIkZGlzYWJpbGl0eUZpZWxkcyIsImNiT25DaGVja2VkIiwicHJveHkiLCJjYk9uVW5jaGVja2VkIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJvblVuY2hlY2tlZCIsIm5ld1RleHQiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJjaGFuZ2VMYWJlbFRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmciLCJjYkFmdGVyTW9kdWxlRW5hYmxlIiwiUGJ4QXBpIiwiU3lzdGVtRW5hYmxlTW9kdWxlIiwiY2JBZnRlck1vZHVsZURpc2FibGUiLCJTeXN0ZW1EaXNhYmxlTW9kdWxlIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwicmVtb3ZlQ2xhc3MiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJkYXRhIiwiY2hhbmdlZE9iamVjdHMiLCJ1bmRlZmluZWQiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyIsImxvY2F0aW9uIiwicmVsb2FkIiwiZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCIsIm1lc3NhZ2VzIiwiZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yIiwicmVhZHkiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsImluaXRpYWxpemUiXSwibWFwcGluZ3MiOiI7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QUNVLGdDQUFyQztBQUNBLGFBQUtyQixpQkFBTCxDQUF1QlMsUUFBdkIsQ0FBZ0MsVUFBaEM7O0FBQ0EsWUFBSVMsUUFBUSxLQUFLWSxTQUFiLElBQTBCWixRQUFRLENBQUNtQixRQUFULEtBQXNCUCxTQUFwRCxFQUErRDtBQUM5REMsVUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCZCxRQUFRLENBQUNtQixRQUFyQyxFQUErQzFCLGVBQWUsQ0FBQzJCLDJCQUEvRDtBQUNBO0FBQ0Q7O0FBQ0QsV0FBSzNDLFdBQUwsQ0FBaUJ5QixXQUFqQixDQUE2QixVQUE3QjtBQUNBLFdBQUt4QixXQUFMLENBQWlCd0IsV0FBakIsQ0FBNkIsc0JBQTdCO0FBQ0EzQixNQUFBQSxDQUFDLENBQUMsVUFBRCxDQUFELENBQWMyQixXQUFkLENBQTBCLFVBQTFCO0FBQ0E7Ozs7OztBQUdGM0IsQ0FBQyxDQUFDOEIsUUFBRCxDQUFELENBQVlnQixLQUFaLENBQWtCLFlBQU07QUFDdkIsTUFBTUMsTUFBTSxHQUFHL0MsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkJnRCxJQUEzQixDQUFnQyxZQUFoQyxDQUFmOztBQUNBLE1BQUlELE1BQUosRUFBWTtBQUNYLFFBQU1FLFVBQVUsR0FBRyxJQUFJckQsa0JBQUosRUFBbkI7QUFDQXFELElBQUFBLFVBQVUsQ0FBQ0MsVUFBWCxDQUFzQkgsTUFBdEIsRUFBOEIsSUFBOUI7QUFDQTtBQUNELENBTkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlICovXG5jbGFzcyBQYnhFeHRlbnNpb25TdGF0dXMge1xuXHRpbml0aWFsaXplKHVuaXFpZCwgY2hhbmdlTGFiZWwgPSB0cnVlKSB7XG5cdFx0dGhpcy4kdG9nZ2xlID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCk7XG5cdFx0dGhpcy4kdG9nZ2xlU2VnbWVudCA9ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZS1zZWdtZW50Jyk7XG5cdFx0dGhpcy4kYWxsVG9nZ2xlcyA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hgKTtcblx0XHR0aGlzLiRzdGF0dXNJY29uID0gJChgdHIjJHt1bmlxaWR9IGkuc3RhdHVzLWljb25gKTtcblx0XHR0aGlzLiR0b2dnbGVTZWdtZW50LnNob3coKTtcblx0XHRpZiAoY2hhbmdlTGFiZWwpIHtcblx0XHRcdHRoaXMuJGxhYmVsID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCkuZmluZCgnbGFiZWwnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kbGFiZWwgPSBmYWxzZTtcblx0XHR9XG5cdFx0dGhpcy51bmlxaWQgPSB1bmlxaWQ7XG5cdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcyA9ICQoYHRyIyR7dW5pcWlkfSAuZGlzYWJpbGl0eWApO1xuXHRcdGNvbnN0IGNiT25DaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25DaGVja2VkLCB0aGlzKTtcblx0XHRjb25zdCBjYk9uVW5jaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25VbmNoZWNrZWQsIHRoaXMpO1xuXHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCh7XG5cdFx0XHRvbkNoZWNrZWQ6IGNiT25DaGVja2VkLFxuXHRcdFx0b25VbmNoZWNrZWQ6IGNiT25VbmNoZWNrZWQsXG5cdFx0fSk7XG5cdH1cblx0Y2hhbmdlTGFiZWxUZXh0KG5ld1RleHQpIHtcblx0XHRpZiAodGhpcy4kbGFiZWwpIHtcblx0XHRcdHRoaXMuJGxhYmVsLnRleHQobmV3VGV4dCk7XG5cdFx0fVxuXHR9XG5cdGNiT25DaGVja2VkKCkge1xuXHRcdHRoaXMuJHN0YXR1c0ljb24uYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG5cdFx0dGhpcy4kYWxsVG9nZ2xlcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuXHRcdGNvbnN0IGNiQWZ0ZXJNb2R1bGVFbmFibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZUVuYWJsZSwgdGhpcyk7XG5cdFx0UGJ4QXBpLlN5c3RlbUVuYWJsZU1vZHVsZSh0aGlzLnVuaXFpZCwgY2JBZnRlck1vZHVsZUVuYWJsZSk7XG5cdH1cblx0Y2JPblVuY2hlY2tlZCgpIHtcblx0XHR0aGlzLiRzdGF0dXNJY29uLmFkZENsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuXHRcdHRoaXMuJGFsbFRvZ2dsZXMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nKTtcblx0XHRjb25zdCBjYkFmdGVyTW9kdWxlRGlzYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRGlzYWJsZSwgdGhpcyk7XG5cdFx0UGJ4QXBpLlN5c3RlbURpc2FibGVNb2R1bGUodGhpcy51bmlxaWQsIGNiQWZ0ZXJNb2R1bGVEaXNhYmxlKTtcblx0fVxuXHQvLyBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBkaXNhYmxpbmcgdGhlIG1vZHVsZVxuXHRjYkFmdGVyTW9kdWxlRGlzYWJsZShyZXNwb25zZSwgc3VjY2Vzcykge1xuXHRcdGlmIChzdWNjZXNzKSB7XG5cdFx0XHQvLyBVcGRhdGUgVUkgdG8gc2hvdyBtb2R1bGUgaXMgZGlzYWJsZWRcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuXHRcdFx0dGhpcy4kc3RhdHVzSWNvbi5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG5cblx0XHRcdC8vIFRyaWdnZXIgZXZlbnRzIHRvIGluZGljYXRlIG1vZHVsZSBzdGF0dXMgYW5kIGNvbmZpZyBkYXRhIGhhcyBjaGFuZ2VkXG5cdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblxuXHRcdFx0Ly8gRGlzYWJsZSBpbnB1dCBmaWVsZHMgYW5kIHNob3cgbWVzc2FnZSBmb3IgY2hhbmdlZCBvYmplY3RzXG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0aWYgKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMgIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZWRPYmplY3RzKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUmVmcmVzaCB0aGUgcGFnZSB0byByZWZsZWN0IGNoYW5nZXNcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy4kYWxsVG9nZ2xlcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG5cdH1cblxuXHQvLyBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBlbmFibGluZyB0aGUgbW9kdWxlXG5cdGNiQWZ0ZXJNb2R1bGVFbmFibGUocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcblx0XHRpZiAoc3VjY2Vzcykge1xuXHRcdFx0Ly8gVXBkYXRlIFVJIHRvIHNob3cgbW9kdWxlIGlzIGVuYWJsZWRcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblxuXHRcdFx0Ly8gVHJpZ2dlciBldmVudHMgdG8gaW5kaWNhdGUgbW9kdWxlIHN0YXR1cyBhbmQgY29uZmlnIGRhdGEgaGFzIGNoYW5nZWRcblx0XHRcdGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXG5cdFx0XHQvLyBFbmFibGUgaW5wdXQgZmllbGRzIGFuZCBzaG93IG1lc3NhZ2UgZm9yIGNoYW5nZWQgb2JqZWN0c1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGlmIChyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFJlZnJlc2ggdGhlIHBhZ2UgdG8gcmVmbGVjdCBjaGFuZ2VzXG5cdFx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkKTtcblx0XHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMuJGFsbFRvZ2dsZXMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0dGhpcy4kc3RhdHVzSWNvbi5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHR9XG59XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0Y29uc3QgdW5pcUlkID0gJCgnI21vZHVsZS1zdGF0dXMtdG9nZ2xlJykuYXR0cignZGF0YS12YWx1ZScpO1xuXHRpZiAodW5pcUlkKSB7XG5cdFx0Y29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXMoKTtcblx0XHRwYWdlU3RhdHVzLmluaXRpYWxpemUodW5pcUlkLCB0cnVlKTtcblx0fVxufSk7XG4iXX0=