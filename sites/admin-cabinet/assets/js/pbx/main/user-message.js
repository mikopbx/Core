"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalTranslate */
var UserMessage = {
  $ajaxMessagesDiv: $('#ajax-messages'),
  showError: function () {
    function showError(text) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      var html = '<div class="ui error message ajax">';

      if (header !== '') {
        html += "<div class=\"header\">".concat(header, "</div>");
      } else {
        html += "<div class=\"header\">".concat(globalTranslate.msg_ErrorHeader, "</div>");
      }

      html += "<p>".concat(text, "</p></div>");
      UserMessage.$ajaxMessagesDiv.after(html);
      UserMessage.scrollToMessages();
    }

    return showError;
  }(),
  showWraning: function () {
    function showWraning(text) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      var html = '<div class="ui warning message ajax">';

      if (header !== '') {
        html += "<div class=\"header\">".concat(header, "</div>");
      } else {
        html += "<div class=\"header\">".concat(globalTranslate.msg_WarningHeader, "</div>");
      }

      html += "<p>".concat(text, "</p></div>");
      UserMessage.$ajaxMessagesDiv.after(html);
      UserMessage.scrollToMessages();
    }

    return showWraning;
  }(),
  showInformation: function () {
    function showInformation(text) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      var html = '<div class="ui info message ajax">';

      if (header !== '') {
        html += "<div class=\"header\">".concat(header, "</div>");
      } else {
        html += "<div class=\"header\">".concat(globalTranslate.msg_infoHeader, "</div>");
      }

      html += "<p>".concat(text, "</p></div>");
      UserMessage.$ajaxMessagesDiv.after(html);
      UserMessage.scrollToMessages();
    }

    return showInformation;
  }(),
  showMultiString: function () {
    function showMultiString(messages) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      $('.ui.message.ajax').remove();
      if (!messages) return; // Remove empty values

      var messagesArray = [];

      if ((Array.isArray(messages) || _typeof(messages) === 'object') && Object.keys(messages).length > 0) {
        messagesArray = messages;
        $.each(messages, function (index, value) {
          if (!value) {
            if (Array.isArray(messagesArray)) {
              messagesArray.pop(index);
            } else {
              delete messagesArray[index];
            }
          }
        });
      } else if (!Array.isArray(messages) && messages) {
        messagesArray = {
          error: messages
        };
      }

      var previousMessage = '';

      if (messagesArray.length === 1 || Object.keys(messagesArray).length === 1) {
        $.each(messagesArray, function (index, value) {
          if (previousMessage === value) {
            return;
          }

          var newValue = value;

          if (Array.isArray(newValue)) {
            newValue = newValue.join('<br>');
          }

          if (newValue.length > 100) {
            UserMessage.$ajaxMessagesDiv.after("<div class=\"ui ".concat(index, " message ajax\">").concat(newValue, "</div>"));
            UserMessage.scrollToMessages();
          } else if (index === 'error') {
            UserMessage.showError(newValue, header);
          } else if (index === 'info') {
            UserMessage.showInformation(newValue, header);
          } else {
            UserMessage.showWraning(newValue, header);
          }

          previousMessage = value;
        });
      } else {
        var content = '';
        $.each(messagesArray, function (index, value) {
          var newValue = value;

          if (previousMessage !== value) {
            if (Array.isArray(newValue)) {
              newValue = newValue.join('<br>');
            }

            content = "".concat(content, "<br>").concat(newValue);
          }

          previousMessage = value;
        });
        UserMessage.$ajaxMessagesDiv.after("<div class=\"ui warning message ajax\"><div class=\"ui header\">".concat(header, "</div>").concat(content, "</div>"));
        UserMessage.scrollToMessages();
      }
    }

    return showMultiString;
  }(),
  scrollToMessages: function () {
    function scrollToMessages() {
      $('html, body').animate({
        scrollTop: UserMessage.$ajaxMessagesDiv.offset().top - 50
      }, 2000);
    }

    return scrollToMessages;
  }()
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwic2hvd0Vycm9yIiwidGV4dCIsImhlYWRlciIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJtc2dfRXJyb3JIZWFkZXIiLCJhZnRlciIsInNjcm9sbFRvTWVzc2FnZXMiLCJzaG93V3JhbmluZyIsIm1zZ19XYXJuaW5nSGVhZGVyIiwic2hvd0luZm9ybWF0aW9uIiwibXNnX2luZm9IZWFkZXIiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInJlbW92ZSIsIm1lc3NhZ2VzQXJyYXkiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJwb3AiLCJlcnJvciIsInByZXZpb3VzTWVzc2FnZSIsIm5ld1ZhbHVlIiwiam9pbiIsImNvbnRlbnQiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7O0FBT0E7QUFDQSxJQUFNQSxXQUFXLEdBQUc7QUFDbkJDLEVBQUFBLGdCQUFnQixFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FEQTtBQUVuQkMsRUFBQUEsU0FGbUI7QUFBQSx1QkFFVEMsSUFGUyxFQUVVO0FBQUEsVUFBYkMsTUFBYSx1RUFBSixFQUFJO0FBQzVCLFVBQUlDLElBQUksR0FBRyxxQ0FBWDs7QUFDQSxVQUFJRCxNQUFNLEtBQUcsRUFBYixFQUFnQjtBQUNmQyxRQUFBQSxJQUFJLG9DQUEwQkQsTUFBMUIsV0FBSjtBQUNBLE9BRkQsTUFFTztBQUNOQyxRQUFBQSxJQUFJLG9DQUEwQkMsZUFBZSxDQUFDQyxlQUExQyxXQUFKO0FBQ0E7O0FBQ0RGLE1BQUFBLElBQUksaUJBQVVGLElBQVYsZUFBSjtBQUNBSixNQUFBQSxXQUFXLENBQUNDLGdCQUFaLENBQTZCUSxLQUE3QixD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ZCxDQUFYO0FBQ0E7O0FBQ0RDLFlBQUFBLE9BQU8sYUFBTUEsT0FBTixpQkFBb0JGLFFBQXBCLENBQVA7QUFDQTs7QUFDREQsVUFBQUEsZUFBZSxHQUFHSCxLQUFsQjtBQUNBLFNBVEQ7QUFVQTFCLFFBQUFBLFdBQVcsQ0FBQ0MsZ0JBQVosQ0FDRVEsS0FERiwyRUFDdUVKLE1BRHZFLG1CQUNzRjJCLE9BRHRGO0FBRUFoQyxRQUFBQSxXQUFXLENBQUNVLGdCQUFaO0FBQ0E7QUFDRDs7QUEvRmtCO0FBQUE7QUFnR25CQSxFQUFBQSxnQkFoR21CO0FBQUEsZ0NBZ0dBO0FBQ2xCUixNQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCK0IsT0FBaEIsQ0FBd0I7QUFDdkJDLFFBQUFBLFNBQVMsRUFBRWxDLFdBQVcsQ0FBQ0MsZ0JBQVosQ0FBNkJrQyxNQUE3QixHQUFzQ0MsR0FBdEMsR0FBMEM7QUFEOUIsT0FBeEIsRUFFRyxJQUZIO0FBR0E7O0FBcEdrQjtBQUFBO0FBQUEsQ0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUgKi9cbmNvbnN0IFVzZXJNZXNzYWdlID0ge1xuXHQkYWpheE1lc3NhZ2VzRGl2OiAkKCcjYWpheC1tZXNzYWdlcycpLFxuXHRzaG93RXJyb3IodGV4dCwgaGVhZGVyID0gJycpIHtcblx0XHRsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+Jztcblx0XHRpZiAoaGVhZGVyIT09Jycpe1xuXHRcdFx0aHRtbCArPWA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5tc2dfRXJyb3JIZWFkZXJ9PC9kaXY+YFxuXHRcdH1cblx0XHRodG1sICs9IGA8cD4ke3RleHR9PC9wPjwvZGl2PmA7XG5cdFx0VXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5hZnRlcihodG1sKTtcblx0XHRVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG5cdH0sXG5cdHNob3dXcmFuaW5nKHRleHQsIGhlYWRlciA9ICcnKSB7XG5cdFx0bGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZSBhamF4XCI+Jztcblx0XHRpZiAoaGVhZGVyIT09Jycpe1xuXHRcdFx0aHRtbCArPWA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5tc2dfV2FybmluZ0hlYWRlcn08L2Rpdj5gXG5cdFx0fVxuXHRcdGh0bWwgKz0gYDxwPiR7dGV4dH08L3A+PC9kaXY+YDtcblx0XHRVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuXHRcdFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcblx0fSxcblx0c2hvd0luZm9ybWF0aW9uKHRleHQsIGhlYWRlciA9ICcnKSB7XG5cdFx0bGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZSBhamF4XCI+Jztcblx0XHRpZiAoaGVhZGVyIT09Jycpe1xuXHRcdFx0aHRtbCArPWA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtoZWFkZXJ9PC9kaXY+YFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5tc2dfaW5mb0hlYWRlcn08L2Rpdj5gXG5cdFx0fVxuXHRcdGh0bWwgKz0gYDxwPiR7dGV4dH08L3A+PC9kaXY+YDtcblx0XHRVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuXHRcdFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcblx0fSxcblx0c2hvd011bHRpU3RyaW5nKG1lc3NhZ2VzLCBoZWFkZXIgPSAnJykge1xuXHRcdCQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHRpZiAoIW1lc3NhZ2VzKSByZXR1cm47XG5cblx0XHQvLyBSZW1vdmUgZW1wdHkgdmFsdWVzXG5cdFx0bGV0IG1lc3NhZ2VzQXJyYXkgPSBbXTtcblx0XHRpZiAoKEFycmF5LmlzQXJyYXkobWVzc2FnZXMpIHx8IHR5cGVvZiBtZXNzYWdlcyA9PT0gJ29iamVjdCcpXG5cdFx0XHQmJiBPYmplY3Qua2V5cyhtZXNzYWdlcykubGVuZ3RoID4gMCkge1xuXHRcdFx0bWVzc2FnZXNBcnJheSA9IG1lc3NhZ2VzO1xuXHRcdFx0JC5lYWNoKG1lc3NhZ2VzLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG5cdFx0XHRcdGlmICghdmFsdWUpIHtcblx0XHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlc0FycmF5KSl7XG5cdFx0XHRcdFx0XHRtZXNzYWdlc0FycmF5LnBvcChpbmRleCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGRlbGV0ZSBtZXNzYWdlc0FycmF5W2luZGV4XTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlcykgJiYgbWVzc2FnZXMpIHtcblx0XHRcdG1lc3NhZ2VzQXJyYXkgPSB7IGVycm9yOiBtZXNzYWdlcyB9O1xuXHRcdH1cblx0XHRsZXQgcHJldmlvdXNNZXNzYWdlID0gJyc7XG5cdFx0aWYgKG1lc3NhZ2VzQXJyYXkubGVuZ3RoID09PSAxIHx8IE9iamVjdC5rZXlzKG1lc3NhZ2VzQXJyYXkpLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0JC5lYWNoKG1lc3NhZ2VzQXJyYXksIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdFx0aWYgKHByZXZpb3VzTWVzc2FnZSA9PT0gdmFsdWUpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0bGV0IG5ld1ZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KG5ld1ZhbHVlKSkge1xuXHRcdFx0XHRcdG5ld1ZhbHVlID0gbmV3VmFsdWUuam9pbignPGJyPicpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChuZXdWYWx1ZS5sZW5ndGggPiAxMDApIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgJHtpbmRleH0gbWVzc2FnZSBhamF4XCI+JHtuZXdWYWx1ZX08L2Rpdj5gKTtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoaW5kZXggPT09ICdlcnJvcicpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IobmV3VmFsdWUsIGhlYWRlcik7XG5cdFx0XHRcdH0gZWxzZSBpZiAoaW5kZXggPT09ICdpbmZvJykge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihuZXdWYWx1ZSwgaGVhZGVyKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93V3JhbmluZyhuZXdWYWx1ZSwgaGVhZGVyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwcmV2aW91c01lc3NhZ2UgPSB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsZXQgY29udGVudCA9ICcnO1xuXHRcdFx0JC5lYWNoKG1lc3NhZ2VzQXJyYXksIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdFx0bGV0IG5ld1ZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdGlmIChwcmV2aW91c01lc3NhZ2UgIT09IHZhbHVlKSB7XG5cdFx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkobmV3VmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRuZXdWYWx1ZSA9IG5ld1ZhbHVlLmpvaW4oJzxicj4nKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y29udGVudCA9IGAke2NvbnRlbnR9PGJyPiR7bmV3VmFsdWV9YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRwcmV2aW91c01lc3NhZ2UgPSB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdFx0VXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0RpdlxuXHRcdFx0XHQuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2UgYWpheFwiPjxkaXYgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj4ke2NvbnRlbnR9PC9kaXY+YCk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG5cdFx0fVxuXHR9LFxuXHRzY3JvbGxUb01lc3NhZ2VzKCkge1xuXHRcdCQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHtcblx0XHRcdHNjcm9sbFRvcDogVXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5vZmZzZXQoKS50b3AtNTAsXG5cdFx0fSwgMjAwMCk7XG5cdH0sXG59O1xuIl19