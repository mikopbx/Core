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
  function PbxExtensionStatus(uniqid) {
    var changeLabel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

    _classCallCheck(this, PbxExtensionStatus);

    this.$toggle = $(".ui.toggle.checkbox[data-value=\"".concat(uniqid, "\"]"));

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

  _createClass(PbxExtensionStatus, [{
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
        this.$toggle.addClass('disabled');
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
        this.$toggle.addClass('disabled');
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
          PbxApi.SystemReloadModule(this.uniqid);
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
          var event = document.createEvent('Event');
          event.initEvent('ModuleStatusChanged', false, true);
          window.dispatchEvent(event);
          this.$disabilityFields.addClass('disabled');
        } else {
          this.$toggle.checkbox('set checked');
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
          this.$disabilityFields.removeClass('disabled');
        }

        if (response.data !== undefined && response.data.messages !== undefined) {
          UserMessage.showMultiString(response.message, globalTranslate.ext_ModuleChangeStatusError);
        } else if (typeof response !== 'undefined') {
          UserMessage.showMultiString(response, globalTranslate.ext_ModuleChangeStatusError);
        }

        this.$toggle.removeClass('disabled');
      }

      return cbAfterModuleDisable;
    }()
  }, {
    key: "cbAfterModuleEnable",
    value: function () {
      function cbAfterModuleEnable(response, success) {
        if (success) {
          this.$toggle.checkbox('set checked');
          PbxApi.SystemReloadModule(this.uniqid);
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
          var event = document.createEvent('Event');
          event.initEvent('ModuleStatusChanged', false, true);
          window.dispatchEvent(event);
          this.$disabilityFields.removeClass('disabled');
        } else {
          this.$toggle.checkbox('set unchecked');
          this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
          this.$disabilityFields.addClass('disabled');
        }

        if (response.data !== undefined && response.data.messages !== undefined) {
          UserMessage.showMultiString(response.data, globalTranslate.ext_ModuleChangeStatusError);
        } else if (typeof response !== 'undefined') {
          UserMessage.showMultiString(response, globalTranslate.ext_ModuleChangeStatusError);
        }

        this.$toggle.removeClass('disabled');
      }

      return cbAfterModuleEnable;
    }()
  }]);

  return PbxExtensionStatus;
}();

$(document).ready(function () {
  var uniqId = $('#module-status-toggle').attr('data-value');

  if (uniqId) {
    var pageStatus = new PbxExtensionStatus(uniqId, true);
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJGxhYmVsIiwiZmluZCIsIiRkaXNhYmlsaXR5RmllbGRzIiwiY2JPbkNoZWNrZWQiLCJwcm94eSIsImNiT25VbmNoZWNrZWQiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIm9uVW5jaGVja2VkIiwibmV3VGV4dCIsInRleHQiLCJhZGRDbGFzcyIsImNoYW5nZUxhYmVsVGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyIsImNiQWZ0ZXJNb2R1bGVFbmFibGUiLCJQYnhBcGkiLCJTeXN0ZW1FbmFibGVNb2R1bGUiLCJjYkFmdGVyTW9kdWxlRGlzYWJsZSIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJTeXN0ZW1SZWxvYWRNb2R1bGUiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkIiwicmVtb3ZlQ2xhc3MiLCJkYXRhIiwidW5kZWZpbmVkIiwibWVzc2FnZXMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2UiLCJleHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IiLCJyZWFkeSIsInVuaXFJZCIsImF0dHIiLCJwYWdlU3RhdHVzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7Ozs7OztBQVFBO0lBRU1BLGtCOzs7QUFDTCw4QkFBWUMsTUFBWixFQUF3QztBQUFBLFFBQXBCQyxXQUFvQix1RUFBTixJQUFNOztBQUFBOztBQUN2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QixXQUF4QixFQUFxQztBQUMzQ2UsVUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCaEIsUUFBNUIsRUFBc0NQLGVBQWUsQ0FBQ3lCLDJCQUF0RDtBQUNBOztBQUNELGFBQUt4QyxPQUFMLENBQWFpQyxXQUFiLENBQXlCLFVBQXpCO0FBQ0E7Ozs7Ozs7OztBQUdGaEMsQ0FBQyxDQUFDMEIsUUFBRCxDQUFELENBQVljLEtBQVosQ0FBa0IsWUFBTTtBQUN2QixNQUFNQyxNQUFNLEdBQUd6QyxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQjBDLElBQTNCLENBQWdDLFlBQWhDLENBQWY7O0FBQ0EsTUFBSUQsTUFBSixFQUFZO0FBQ1gsUUFBTUUsVUFBVSxHQUFHLElBQUkvQyxrQkFBSixDQUF1QjZDLE1BQXZCLEVBQStCLElBQS9CLENBQW5CO0FBQ0E7QUFDRCxDQUxEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UgKi9cblxuY2xhc3MgUGJ4RXh0ZW5zaW9uU3RhdHVzIHtcblx0Y29uc3RydWN0b3IodW5pcWlkLCBjaGFuZ2VMYWJlbCA9IHRydWUpIHtcblx0XHR0aGlzLiR0b2dnbGUgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94W2RhdGEtdmFsdWU9XCIke3VuaXFpZH1cIl1gKTtcblx0XHRpZiAoY2hhbmdlTGFiZWwpIHtcblx0XHRcdHRoaXMuJGxhYmVsID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCkuZmluZCgnbGFiZWwnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kbGFiZWwgPSBmYWxzZTtcblx0XHR9XG5cdFx0dGhpcy51bmlxaWQgPSB1bmlxaWQ7XG5cdFx0dGhpcy4kZGlzYWJpbGl0eUZpZWxkcyA9ICQoYHRyIyR7dW5pcWlkfSAuZGlzYWJpbGl0eWApO1xuXHRcdGNvbnN0IGNiT25DaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25DaGVja2VkLCB0aGlzKTtcblx0XHRjb25zdCBjYk9uVW5jaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25VbmNoZWNrZWQsIHRoaXMpO1xuXHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCh7XG5cdFx0XHRvbkNoZWNrZWQ6IGNiT25DaGVja2VkLFxuXHRcdFx0b25VbmNoZWNrZWQ6IGNiT25VbmNoZWNrZWQsXG5cdFx0fSk7XG5cdH1cblx0Y2hhbmdlTGFiZWxUZXh0KG5ld1RleHQpIHtcblx0XHRpZiAodGhpcy4kbGFiZWwpIHtcblx0XHRcdHRoaXMuJGxhYmVsLnRleHQobmV3VGV4dCk7XG5cdFx0fVxuXHR9XG5cdGNiT25DaGVja2VkKCkge1xuXHRcdHRoaXMuJHRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nKTtcblx0XHRjb25zdCBjYkFmdGVyTW9kdWxlRW5hYmxlID0gJC5wcm94eSh0aGlzLmNiQWZ0ZXJNb2R1bGVFbmFibGUsIHRoaXMpO1xuXHRcdFBieEFwaS5TeXN0ZW1FbmFibGVNb2R1bGUodGhpcy51bmlxaWQsIGNiQWZ0ZXJNb2R1bGVFbmFibGUpO1xuXHR9XG5cdGNiT25VbmNoZWNrZWQoKSB7XG5cdFx0dGhpcy4kdG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuXHRcdGNvbnN0IGNiQWZ0ZXJNb2R1bGVEaXNhYmxlID0gJC5wcm94eSh0aGlzLmNiQWZ0ZXJNb2R1bGVEaXNhYmxlLCB0aGlzKTtcblx0XHRQYnhBcGkuU3lzdGVtRGlzYWJsZU1vZHVsZSh0aGlzLnVuaXFpZCwgY2JBZnRlck1vZHVsZURpc2FibGUpO1xuXHR9XG5cdGNiQWZ0ZXJNb2R1bGVEaXNhYmxlKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG5cdFx0aWYgKHN1Y2Nlc3MpIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVJlbG9hZE1vZHVsZSh0aGlzLnVuaXFpZCk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnTW9kdWxlU3RhdHVzQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblx0XHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZS5kYXRhICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UuZGF0YS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgcmVzcG9uc2UgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuXHRcdH1cblx0XHR0aGlzLiR0b2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdH1cblx0Y2JBZnRlck1vZHVsZUVuYWJsZShyZXNwb25zZSwgc3VjY2Vzcykge1xuXHRcdGlmIChzdWNjZXNzKSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtUmVsb2FkTW9kdWxlKHRoaXMudW5pcWlkKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblx0XHRcdGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UuZGF0YSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLmRhdGEubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLmRhdGEsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuXHRcdH0gZWxzZSBpZiAodHlwZW9mIHJlc3BvbnNlICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yKTtcblx0XHR9XG5cdFx0dGhpcy4kdG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHR9XG59XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0Y29uc3QgdW5pcUlkID0gJCgnI21vZHVsZS1zdGF0dXMtdG9nZ2xlJykuYXR0cignZGF0YS12YWx1ZScpO1xuXHRpZiAodW5pcUlkKSB7XG5cdFx0Y29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXModW5pcUlkLCB0cnVlKTtcblx0fVxufSk7XG4iXX0=