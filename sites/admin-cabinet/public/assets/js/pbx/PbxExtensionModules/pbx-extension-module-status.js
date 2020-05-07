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
        PbxApi.ModuleEnable(this.uniqid, cbAfterModuleEnable);
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
        PbxApi.ModuleDisable(this.uniqid, cbAfterModuleDisable);
      }

      return cbOnUnchecked;
    }()
  }, {
    key: "cbAfterModuleDisable",
    value: function () {
      function cbAfterModuleDisable(response) {
        if (response.success) {
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

        if (response.message !== undefined) {
          UserMessage.showMultiString(response.message, globalTranslate.ext_ModuleChangeStatusError);
        } else if (response !== undefined) {
          UserMessage.showMultiString(response, globalTranslate.ext_ModuleChangeStatusError);
        }

        this.$toggle.removeClass('disabled');
      }

      return cbAfterModuleDisable;
    }()
  }, {
    key: "cbAfterModuleEnable",
    value: function () {
      function cbAfterModuleEnable(response) {
        if (response.success) {
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

        if (response.message !== undefined) {
          UserMessage.showMultiString(response.message, globalTranslate.ext_ModuleChangeStatusError);
        } else if (response !== undefined) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJGxhYmVsIiwiZmluZCIsIiRkaXNhYmlsaXR5RmllbGRzIiwiY2JPbkNoZWNrZWQiLCJwcm94eSIsImNiT25VbmNoZWNrZWQiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIm9uVW5jaGVja2VkIiwibmV3VGV4dCIsInRleHQiLCJhZGRDbGFzcyIsImNoYW5nZUxhYmVsVGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyIsImNiQWZ0ZXJNb2R1bGVFbmFibGUiLCJQYnhBcGkiLCJNb2R1bGVFbmFibGUiLCJjYkFmdGVyTW9kdWxlRGlzYWJsZSIsIk1vZHVsZURpc2FibGUiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJTeXN0ZW1SZWxvYWRNb2R1bGUiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkIiwicmVtb3ZlQ2xhc3MiLCJtZXNzYWdlIiwidW5kZWZpbmVkIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IiLCJyZWFkeSIsInVuaXFJZCIsImF0dHIiLCJwYWdlU3RhdHVzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7Ozs7OztBQVFBO0lBRU1BLGtCOzs7QUFDTCw4QkFBWUMsTUFBWixFQUF3QztBQUFBLFFBQXBCQyxXQUFvQix1RUFBTixJQUFNOztBQUFBOztBQUN2QyxTQUFLQyxPQUFMLEdBQWVDLENBQUMsNENBQW9D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QUNBOzs7Ozs7Ozs7QUFHRmhDLENBQUMsQ0FBQzBCLFFBQUQsQ0FBRCxDQUFZWSxLQUFaLENBQWtCLFlBQU07QUFDdkIsTUFBTUMsTUFBTSxHQUFHdkMsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkJ3QyxJQUEzQixDQUFnQyxZQUFoQyxDQUFmOztBQUNBLE1BQUlELE1BQUosRUFBWTtBQUNYLFFBQU1FLFVBQVUsR0FBRyxJQUFJN0Msa0JBQUosQ0FBdUIyQyxNQUF2QixFQUErQixJQUEvQixDQUFuQjtBQUNBO0FBQ0QsQ0FMRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlICovXG5cbmNsYXNzIFBieEV4dGVuc2lvblN0YXR1cyB7XG5cdGNvbnN0cnVjdG9yKHVuaXFpZCwgY2hhbmdlTGFiZWwgPSB0cnVlKSB7XG5cdFx0dGhpcy4kdG9nZ2xlID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCk7XG5cdFx0aWYgKGNoYW5nZUxhYmVsKSB7XG5cdFx0XHR0aGlzLiRsYWJlbCA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApLmZpbmQoJ2xhYmVsJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuJGxhYmVsID0gZmFsc2U7XG5cdFx0fVxuXHRcdHRoaXMudW5pcWlkID0gdW5pcWlkO1xuXHRcdHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMgPSAkKGB0ciMke3VuaXFpZH0gLmRpc2FiaWxpdHlgKTtcblx0XHRjb25zdCBjYk9uQ2hlY2tlZCA9ICQucHJveHkodGhpcy5jYk9uQ2hlY2tlZCwgdGhpcyk7XG5cdFx0Y29uc3QgY2JPblVuY2hlY2tlZCA9ICQucHJveHkodGhpcy5jYk9uVW5jaGVja2VkLCB0aGlzKTtcblx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goe1xuXHRcdFx0b25DaGVja2VkOiBjYk9uQ2hlY2tlZCxcblx0XHRcdG9uVW5jaGVja2VkOiBjYk9uVW5jaGVja2VkLFxuXHRcdH0pO1xuXHR9XG5cdGNoYW5nZUxhYmVsVGV4dChuZXdUZXh0KSB7XG5cdFx0aWYgKHRoaXMuJGxhYmVsKSB7XG5cdFx0XHR0aGlzLiRsYWJlbC50ZXh0KG5ld1RleHQpO1xuXHRcdH1cblx0fVxuXHRjYk9uQ2hlY2tlZCgpIHtcblx0XHR0aGlzLiR0b2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG5cdFx0Y29uc3QgY2JBZnRlck1vZHVsZUVuYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRW5hYmxlLCB0aGlzKTtcblx0XHRQYnhBcGkuTW9kdWxlRW5hYmxlKHRoaXMudW5pcWlkLCBjYkFmdGVyTW9kdWxlRW5hYmxlKTtcblx0fVxuXHRjYk9uVW5jaGVja2VkKCkge1xuXHRcdHRoaXMuJHRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nKTtcblx0XHRjb25zdCBjYkFmdGVyTW9kdWxlRGlzYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRGlzYWJsZSwgdGhpcyk7XG5cdFx0UGJ4QXBpLk1vZHVsZURpc2FibGUodGhpcy51bmlxaWQsIGNiQWZ0ZXJNb2R1bGVEaXNhYmxlKTtcblx0fVxuXHRjYkFmdGVyTW9kdWxlRGlzYWJsZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcblx0XHRcdFBieEFwaS5TeXN0ZW1SZWxvYWRNb2R1bGUodGhpcy51bmlxaWQpO1xuXHRcdFx0dGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkKTtcblx0XHRcdGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG5cdFx0XHR0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UubWVzc2FnZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuXHRcdH1cblx0XHR0aGlzLiR0b2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdH1cblx0Y2JBZnRlck1vZHVsZUVuYWJsZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtUmVsb2FkTW9kdWxlKHRoaXMudW5pcWlkKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblx0XHRcdGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cdFx0XHRldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcblx0XHRcdHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG5cdFx0XHR0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UubWVzc2FnZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuXHRcdH1cblx0XHR0aGlzLiR0b2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdH1cbn1cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRjb25zdCB1bmlxSWQgPSAkKCcjbW9kdWxlLXN0YXR1cy10b2dnbGUnKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdGlmICh1bmlxSWQpIHtcblx0XHRjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cyh1bmlxSWQsIHRydWUpO1xuXHR9XG59KTtcbiJdfQ==