"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global PbxApi, globalTranslate, UserMessage */
var PbxExtensionStatus =
/*#__PURE__*/
function () {
  function PbxExtensionStatus() {
    _classCallCheck(this, PbxExtensionStatus);
  }

  _createClass(PbxExtensionStatus, [{
    key: "initialize",
    value: function () {
      function initialize(uniqid) {
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

      return initialize;
    }()
  }, {
    key: "changeLabelText",
    value: function () {
      function changeLabelText(newText) {
        if (this.$label) {
          this.$label.text(newText);
        }
      }

      return changeLabelText;
    }()
  }, {
    key: "cbOnChecked",
    value: function () {
      function cbOnChecked() {
        this.$statusIcon.addClass('spinner loading icon');
        this.$allToggles.addClass('disabled');
        $('a.button').addClass('disabled');
        this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
        var cbAfterModuleEnable = $.proxy(this.cbAfterModuleEnable, this);
        PbxApi.SystemEnableModule(this.uniqid, cbAfterModuleEnable);
      }

      return cbOnChecked;
    }()
  }, {
    key: "cbOnUnchecked",
    value: function () {
      function cbOnUnchecked() {
        this.$statusIcon.addClass('spinner loading icon');
        this.$allToggles.addClass('disabled');
        $('a.button').addClass('disabled');
        this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
        var cbAfterModuleDisable = $.proxy(this.cbAfterModuleDisable, this);
        PbxApi.SystemDisableModule(this.uniqid, cbAfterModuleDisable);
      }

      return cbOnUnchecked;
    }()
  }, {
    key: "cbAfterModuleDisable",
    value: function () {
      function cbAfterModuleDisable(response, success) {
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

      return cbAfterModuleDisable;
    }()
  }, {
    key: "cbAfterModuleEnable",
    value: function () {
      function cbAfterModuleEnable(response, success) {
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

      return cbAfterModuleEnable;
    }()
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJGFsbFRvZ2dsZXMiLCIkc3RhdHVzSWNvbiIsIiRsYWJlbCIsImZpbmQiLCIkZGlzYWJpbGl0eUZpZWxkcyIsImNiT25DaGVja2VkIiwicHJveHkiLCJjYk9uVW5jaGVja2VkIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJvblVuY2hlY2tlZCIsIm5ld1RleHQiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJjaGFuZ2VMYWJlbFRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmciLCJjYkFmdGVyTW9kdWxlRW5hYmxlIiwiUGJ4QXBpIiwiU3lzdGVtRW5hYmxlTW9kdWxlIiwiY2JBZnRlck1vZHVsZURpc2FibGUiLCJTeXN0ZW1EaXNhYmxlTW9kdWxlIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwicmVtb3ZlQ2xhc3MiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJkYXRhIiwiY2hhbmdlZE9iamVjdHMiLCJ1bmRlZmluZWQiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyIsImV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQiLCJtZXNzYWdlcyIsImV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvciIsInJlYWR5IiwidW5pcUlkIiwiYXR0ciIsInBhZ2VTdGF0dXMiLCJpbml0aWFsaXplIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7Ozs7OztBQVFBO0lBQ01BLGtCOzs7Ozs7Ozs7OzBC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a0IsWUFBTTtBQUN2QixNQUFNQyxNQUFNLEdBQUczQyxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQjRDLElBQTNCLENBQWdDLFlBQWhDLENBQWY7O0FBQ0EsTUFBSUQsTUFBSixFQUFZO0FBQ1gsUUFBTUUsVUFBVSxHQUFHLElBQUlqRCxrQkFBSixFQUFuQjtBQUNBaUQsSUFBQUEsVUFBVSxDQUFDQyxVQUFYLENBQXNCSCxNQUF0QixFQUE4QixJQUE5QjtBQUNBO0FBQ0QsQ0FORCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlICovXG5jbGFzcyBQYnhFeHRlbnNpb25TdGF0dXMge1xuXHRpbml0aWFsaXplKHVuaXFpZCwgY2hhbmdlTGFiZWwgPSB0cnVlKSB7XG5cdFx0dGhpcy4kdG9nZ2xlID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCk7XG5cdFx0dGhpcy4kYWxsVG9nZ2xlcyA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hgKTtcblx0XHR0aGlzLiRzdGF0dXNJY29uID0gJChgdHIjJHt1bmlxaWR9IGkuc3RhdHVzLWljb25gKTtcblx0XHRpZiAoY2hhbmdlTGFiZWwpIHtcblx0XHRcdHRoaXMuJGxhYmVsID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCkuZmluZCgnbGFiZWwnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kbGFiZWwgPSBmYWxzZTtcblx0XHR9XG5cdFx0dGhpcy51bmlxaWQgPSB1bmlxaWQ7XG5cdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcyA9ICQoYHRyIyR7dW5pcWlkfSAuZGlzYWJpbGl0eWApO1xuXHRcdGNvbnN0IGNiT25DaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25DaGVja2VkLCB0aGlzKTtcblx0XHRjb25zdCBjYk9uVW5jaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25VbmNoZWNrZWQsIHRoaXMpO1xuXHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCh7XG5cdFx0XHRvbkNoZWNrZWQ6IGNiT25DaGVja2VkLFxuXHRcdFx0b25VbmNoZWNrZWQ6IGNiT25VbmNoZWNrZWQsXG5cdFx0fSk7XG5cdH1cblx0Y2hhbmdlTGFiZWxUZXh0KG5ld1RleHQpIHtcblx0XHRpZiAodGhpcy4kbGFiZWwpIHtcblx0XHRcdHRoaXMuJGxhYmVsLnRleHQobmV3VGV4dCk7XG5cdFx0fVxuXHR9XG5cdGNiT25DaGVja2VkKCkge1xuXHRcdHRoaXMuJHN0YXR1c0ljb24uYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG5cdFx0dGhpcy4kYWxsVG9nZ2xlcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuXHRcdGNvbnN0IGNiQWZ0ZXJNb2R1bGVFbmFibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZUVuYWJsZSwgdGhpcyk7XG5cdFx0UGJ4QXBpLlN5c3RlbUVuYWJsZU1vZHVsZSh0aGlzLnVuaXFpZCwgY2JBZnRlck1vZHVsZUVuYWJsZSk7XG5cdH1cblx0Y2JPblVuY2hlY2tlZCgpIHtcblx0XHR0aGlzLiRzdGF0dXNJY29uLmFkZENsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuXHRcdHRoaXMuJGFsbFRvZ2dsZXMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nKTtcblx0XHRjb25zdCBjYkFmdGVyTW9kdWxlRGlzYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRGlzYWJsZSwgdGhpcyk7XG5cdFx0UGJ4QXBpLlN5c3RlbURpc2FibGVNb2R1bGUodGhpcy51bmlxaWQsIGNiQWZ0ZXJNb2R1bGVEaXNhYmxlKTtcblx0fVxuXHRjYkFmdGVyTW9kdWxlRGlzYWJsZShyZXNwb25zZSwgc3VjY2Vzcykge1xuXHRcdGlmIChzdWNjZXNzKSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcblx0XHRcdHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnTW9kdWxlU3RhdHVzQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0aWYgKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMgIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZWRPYmplY3RzKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuXHRcdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy4kYWxsVG9nZ2xlcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG5cdH1cblx0Y2JBZnRlck1vZHVsZUVuYWJsZShyZXNwb25zZSwgc3VjY2Vzcykge1xuXHRcdGlmIChzdWNjZXNzKSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCk7XG5cdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRpZiAocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cyAhPT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLiRhbGxUb2dnbGVzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG5cdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0fVxufVxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGNvbnN0IHVuaXFJZCA9ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZScpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0aWYgKHVuaXFJZCkge1xuXHRcdGNvbnN0IHBhZ2VTdGF0dXMgPSBuZXcgUGJ4RXh0ZW5zaW9uU3RhdHVzKCk7XG5cdFx0cGFnZVN0YXR1cy5pbml0aWFsaXplKHVuaXFJZCwgdHJ1ZSk7XG5cdH1cbn0pO1xuIl19