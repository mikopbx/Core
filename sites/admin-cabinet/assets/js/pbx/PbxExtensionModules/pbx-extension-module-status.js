"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

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
      this.$allToggles = $(".ui.toggle.checkbox");
      this.$statusIcon = $("tr#".concat(uniqid, " i.status-icon"));

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
    }
  }, {
    key: "cbAfterModuleDisable",
    value: function cbAfterModuleDisable(response, success) {
      if (success) {
        this.$toggle.checkbox('set unchecked');
        this.$statusIcon.removeClass('spinner loading icon');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
        var event = document.createEvent('Event');
        event.initEvent('ModuleStatusChanged', false, true);
        window.dispatchEvent(event);
        event.initEvent('ConfigDataChanged', false, true);
        window.dispatchEvent(event);
        this.$disabilityFields.addClass('disabled');

        if (response.data.changedObjects !== undefined) {
          UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
        }

        if (window.pbxExtensionMenuAddition !== undefined) {
          window.pbxExtensionMenuAddition.updateSidebarMenu();
        }
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
    }
  }, {
    key: "cbAfterModuleEnable",
    value: function cbAfterModuleEnable(response, success) {
      if (success) {
        this.$toggle.checkbox('set checked');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
        var event = document.createEvent('Event');
        event.initEvent('ModuleStatusChanged', false, true);
        window.dispatchEvent(event);
        event.initEvent('ConfigDataChanged', false, true);
        window.dispatchEvent(event);
        this.$disabilityFields.removeClass('disabled');

        if (response.data.changedObjects !== undefined) {
          UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
        }

        if (window.pbxExtensionMenuAddition !== undefined) {
          window.pbxExtensionMenuAddition.updateSidebarMenu();
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJGFsbFRvZ2dsZXMiLCIkc3RhdHVzSWNvbiIsIiRsYWJlbCIsImZpbmQiLCIkZGlzYWJpbGl0eUZpZWxkcyIsImNiT25DaGVja2VkIiwicHJveHkiLCJjYk9uVW5jaGVja2VkIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJvblVuY2hlY2tlZCIsIm5ld1RleHQiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJjaGFuZ2VMYWJlbFRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmciLCJjYkFmdGVyTW9kdWxlRW5hYmxlIiwiUGJ4QXBpIiwiU3lzdGVtRW5hYmxlTW9kdWxlIiwiY2JBZnRlck1vZHVsZURpc2FibGUiLCJTeXN0ZW1EaXNhYmxlTW9kdWxlIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwicmVtb3ZlQ2xhc3MiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJkYXRhIiwiY2hhbmdlZE9iamVjdHMiLCJ1bmRlZmluZWQiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyIsInBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbiIsInVwZGF0ZVNpZGViYXJNZW51IiwiZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCIsIm1lc3NhZ2VzIiwiZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yIiwicmVhZHkiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsImluaXRpYWxpemUiXSwibWFwcGluZ3Mi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SVMsUUFBUSxLQUFLWSxTQUFiLElBQTBCWixRQUFRLENBQUNtQixRQUFULEtBQXNCUCxTQUFwRCxFQUErRDtBQUM5REMsVUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCZCxRQUFRLENBQUNtQixRQUFyQyxFQUErQzFCLGVBQWUsQ0FBQzJCLDJCQUEvRDtBQUNBO0FBQ0Q7O0FBQ0QsV0FBSzFDLFdBQUwsQ0FBaUJ3QixXQUFqQixDQUE2QixVQUE3QjtBQUNBLFdBQUt2QixXQUFMLENBQWlCdUIsV0FBakIsQ0FBNkIsc0JBQTdCO0FBQ0F6QixNQUFBQSxDQUFDLENBQUMsVUFBRCxDQUFELENBQWN5QixXQUFkLENBQTBCLFVBQTFCO0FBQ0E7Ozs7OztBQUdGekIsQ0FBQyxDQUFDNEIsUUFBRCxDQUFELENBQVlnQixLQUFaLENBQWtCLFlBQU07QUFDdkIsTUFBTUMsTUFBTSxHQUFHN0MsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkI4QyxJQUEzQixDQUFnQyxZQUFoQyxDQUFmOztBQUNBLE1BQUlELE1BQUosRUFBWTtBQUNYLFFBQU1FLFVBQVUsR0FBRyxJQUFJbkQsa0JBQUosRUFBbkI7QUFDQW1ELElBQUFBLFVBQVUsQ0FBQ0MsVUFBWCxDQUFzQkgsTUFBdEIsRUFBOEIsSUFBOUI7QUFDQTtBQUNELENBTkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSAqL1xuY2xhc3MgUGJ4RXh0ZW5zaW9uU3RhdHVzIHtcblx0aW5pdGlhbGl6ZSh1bmlxaWQsIGNoYW5nZUxhYmVsID0gdHJ1ZSkge1xuXHRcdHRoaXMuJHRvZ2dsZSA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApO1xuXHRcdHRoaXMuJGFsbFRvZ2dsZXMgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94YCk7XG5cdFx0dGhpcy4kc3RhdHVzSWNvbiA9ICQoYHRyIyR7dW5pcWlkfSBpLnN0YXR1cy1pY29uYCk7XG5cdFx0aWYgKGNoYW5nZUxhYmVsKSB7XG5cdFx0XHR0aGlzLiRsYWJlbCA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApLmZpbmQoJ2xhYmVsJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuJGxhYmVsID0gZmFsc2U7XG5cdFx0fVxuXHRcdHRoaXMudW5pcWlkID0gdW5pcWlkO1xuXHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMgPSAkKGB0ciMke3VuaXFpZH0gLmRpc2FiaWxpdHlgKTtcblx0XHRjb25zdCBjYk9uQ2hlY2tlZCA9ICQucHJveHkodGhpcy5jYk9uQ2hlY2tlZCwgdGhpcyk7XG5cdFx0Y29uc3QgY2JPblVuY2hlY2tlZCA9ICQucHJveHkodGhpcy5jYk9uVW5jaGVja2VkLCB0aGlzKTtcblx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goe1xuXHRcdFx0b25DaGVja2VkOiBjYk9uQ2hlY2tlZCxcblx0XHRcdG9uVW5jaGVja2VkOiBjYk9uVW5jaGVja2VkLFxuXHRcdH0pO1xuXHR9XG5cdGNoYW5nZUxhYmVsVGV4dChuZXdUZXh0KSB7XG5cdFx0aWYgKHRoaXMuJGxhYmVsKSB7XG5cdFx0XHR0aGlzLiRsYWJlbC50ZXh0KG5ld1RleHQpO1xuXHRcdH1cblx0fVxuXHRjYk9uQ2hlY2tlZCgpIHtcblx0XHR0aGlzLiRzdGF0dXNJY29uLmFkZENsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuXHRcdHRoaXMuJGFsbFRvZ2dsZXMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nKTtcblx0XHRjb25zdCBjYkFmdGVyTW9kdWxlRW5hYmxlID0gJC5wcm94eSh0aGlzLmNiQWZ0ZXJNb2R1bGVFbmFibGUsIHRoaXMpO1xuXHRcdFBieEFwaS5TeXN0ZW1FbmFibGVNb2R1bGUodGhpcy51bmlxaWQsIGNiQWZ0ZXJNb2R1bGVFbmFibGUpO1xuXHR9XG5cdGNiT25VbmNoZWNrZWQoKSB7XG5cdFx0dGhpcy4kc3RhdHVzSWNvbi5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcblx0XHR0aGlzLiRhbGxUb2dnbGVzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG5cdFx0Y29uc3QgY2JBZnRlck1vZHVsZURpc2FibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZURpc2FibGUsIHRoaXMpO1xuXHRcdFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHRoaXMudW5pcWlkLCBjYkFmdGVyTW9kdWxlRGlzYWJsZSk7XG5cdH1cblx0Y2JBZnRlck1vZHVsZURpc2FibGUocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcblx0XHRpZiAoc3VjY2Vzcykge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0XHR0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkKTtcblx0XHRcdGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGlmIChyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyk7XG5cdFx0XHR9XG5cdFx0XHRpZih3aW5kb3cucGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHR3aW5kb3cucGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLnVwZGF0ZVNpZGViYXJNZW51KCk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblx0XHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMuJGFsbFRvZ2dsZXMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuXHR9XG5cdGNiQWZ0ZXJNb2R1bGVFbmFibGUocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcblx0XHRpZiAoc3VjY2Vzcykge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnTW9kdWxlU3RhdHVzQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0aWYgKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMgIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZWRPYmplY3RzKTtcblx0XHRcdH1cblx0XHRcdGlmKHdpbmRvdy5wYnhFeHRlbnNpb25NZW51QWRkaXRpb24gIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdHdpbmRvdy5wYnhFeHRlbnNpb25NZW51QWRkaXRpb24udXBkYXRlU2lkZWJhck1lbnUoKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy4kYWxsVG9nZ2xlcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuXHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdH1cbn1cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRjb25zdCB1bmlxSWQgPSAkKCcjbW9kdWxlLXN0YXR1cy10b2dnbGUnKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdGlmICh1bmlxSWQpIHtcblx0XHRjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cygpO1xuXHRcdHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIHRydWUpO1xuXHR9XG59KTtcbiJdfQ==