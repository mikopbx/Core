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
  convertToText: function () {
    function convertToText(text) {
      if ((Array.isArray(text) || _typeof(text) === 'object') && Object.keys(text).length > 0 && text.messages !== undefined) {
        return text.messages;
      } else {
        return text;
      }
    }

    return convertToText;
  }(),
  showError: function () {
    function showError(message) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      var text = UserMessage.convertToText(message);
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
    function showWraning(message) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      var text = UserMessage.convertToText(message);
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
    function showInformation(message) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      var text = UserMessage.convertToText(message);
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
    function showMultiString(message) {
      var header = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      var messages = UserMessage.convertToText(message);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3VzZXItbWVzc2FnZS5qcyJdLCJuYW1lcyI6WyJVc2VyTWVzc2FnZSIsIiRhamF4TWVzc2FnZXNEaXYiLCIkIiwiY29udmVydFRvVGV4dCIsInRleHQiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwibWVzc2FnZXMiLCJ1bmRlZmluZWQiLCJzaG93RXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVyIiwiaHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zZ19FcnJvckhlYWRlciIsImFmdGVyIiwic2Nyb2xsVG9NZXNzYWdlcyIsInNob3dXcmFuaW5nIiwibXNnX1dhcm5pbmdIZWFkZXIiLCJzaG93SW5mb3JtYXRpb24iLCJtc2dfaW5mb0hlYWRlciIsInNob3dNdWx0aVN0cmluZyIsInJlbW92ZSIsIm1lc3NhZ2VzQXJyYXkiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsInBvcCIsImVycm9yIiwicHJldmlvdXNNZXNzYWdlIiwibmV3VmFsdWUiLCJqb2luIiwiY29udGVudCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7Ozs7QUFPQTtBQUNBLElBQU1BLFdBQVcsR0FBRztBQUNuQkMsRUFBQUEsZ0JBQWdCLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURBO0FBRW5CQyxFQUFBQSxhQUZtQjtBQUFBLDJCQUVMQyxJQUZLLEVBRUE7QUFDbEIsVUFBSSxDQUFDQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0YsSUFBZCxLQUF1QixRQUFPQSxJQUFQLE1BQWdCLFFBQXhDLEtBQ0FHLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSixJQUFaLEVBQWtCSyxNQUFsQixHQUEyQixDQUQzQixJQUVBTCxJQUFJLENBQUNNLFFBQUwsS0FBa0JDLFNBRnRCLEVBR0U7QUFDRCxlQUFPUCxJQUFJLENBQUNNLFFBQVo7QUFDQSxPQUxELE1BS087QUFDTixlQUFPTixJQUFQO0FB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d0I7QUFDdkJDLFFBQUFBLFNBQVMsRUFBRXJDLFdBQVcsQ0FBQ0MsZ0JBQVosQ0FBNkJxQyxNQUE3QixHQUFzQ0MsR0FBdEMsR0FBMEM7QUFEOUIsT0FBeEIsRUFFRyxJQUZIO0FBR0E7O0FBbEhrQjtBQUFBO0FBQUEsQ0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUgKi9cbmNvbnN0IFVzZXJNZXNzYWdlID0ge1xuXHQkYWpheE1lc3NhZ2VzRGl2OiAkKCcjYWpheC1tZXNzYWdlcycpLFxuXHRjb252ZXJ0VG9UZXh0KHRleHQpe1xuXHRcdGlmICgoQXJyYXkuaXNBcnJheSh0ZXh0KSB8fCB0eXBlb2YgdGV4dCA9PT0gJ29iamVjdCcpXG5cdFx0XHQmJiBPYmplY3Qua2V5cyh0ZXh0KS5sZW5ndGggPiAwXG5cdFx0XHQmJiB0ZXh0Lm1lc3NhZ2VzICE9PSB1bmRlZmluZWRcblx0XHQpIHtcblx0XHRcdHJldHVybiB0ZXh0Lm1lc3NhZ2VzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGV4dDtcblx0XHR9XG5cdH0sXG5cdHNob3dFcnJvcihtZXNzYWdlLCBoZWFkZXIgPSAnJykge1xuXHRcdGNvbnN0IHRleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuXHRcdGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj4nO1xuXHRcdGlmIChoZWFkZXIhPT0nJyl7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG5cdFx0fSBlbHNlIHtcblx0XHRcdGh0bWwgKz1gPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19FcnJvckhlYWRlcn08L2Rpdj5gXG5cdFx0fVxuXHRcdGh0bWwgKz0gYDxwPiR7dGV4dH08L3A+PC9kaXY+YDtcblx0XHRVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGh0bWwpO1xuXHRcdFVzZXJNZXNzYWdlLnNjcm9sbFRvTWVzc2FnZXMoKTtcblx0fSxcblx0c2hvd1dyYW5pbmcobWVzc2FnZSwgaGVhZGVyID0gJycpIHtcblx0XHRjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcblx0XHRsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlIGFqYXhcIj4nO1xuXHRcdGlmIChoZWFkZXIhPT0nJyl7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG5cdFx0fSBlbHNlIHtcblx0XHRcdGh0bWwgKz1gPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19XYXJuaW5nSGVhZGVyfTwvZGl2PmBcblx0XHR9XG5cdFx0aHRtbCArPSBgPHA+JHt0ZXh0fTwvcD48L2Rpdj5gO1xuXHRcdFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG5cdFx0VXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuXHR9LFxuXHRzaG93SW5mb3JtYXRpb24obWVzc2FnZSwgaGVhZGVyID0gJycpIHtcblx0XHRjb25zdCB0ZXh0ID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlKTtcblx0XHRsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlIGFqYXhcIj4nO1xuXHRcdGlmIChoZWFkZXIhPT0nJyl7XG5cdFx0XHRodG1sICs9YDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj5gXG5cdFx0fSBlbHNlIHtcblx0XHRcdGh0bWwgKz1gPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm1zZ19pbmZvSGVhZGVyfTwvZGl2PmBcblx0XHR9XG5cdFx0aHRtbCArPSBgPHA+JHt0ZXh0fTwvcD48L2Rpdj5gO1xuXHRcdFVzZXJNZXNzYWdlLiRhamF4TWVzc2FnZXNEaXYuYWZ0ZXIoaHRtbCk7XG5cdFx0VXNlck1lc3NhZ2Uuc2Nyb2xsVG9NZXNzYWdlcygpO1xuXHR9LFxuXHRzaG93TXVsdGlTdHJpbmcobWVzc2FnZSwgaGVhZGVyID0gJycpIHtcblx0XHRsZXQgbWVzc2FnZXMgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2UpO1xuXHRcdCQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHRpZiAoIW1lc3NhZ2VzKSByZXR1cm47XG5cblx0XHQvLyBSZW1vdmUgZW1wdHkgdmFsdWVzXG5cdFx0bGV0IG1lc3NhZ2VzQXJyYXkgPSBbXTtcblx0XHRpZiAoKEFycmF5LmlzQXJyYXkobWVzc2FnZXMpIHx8IHR5cGVvZiBtZXNzYWdlcyA9PT0gJ29iamVjdCcpXG5cdFx0XHQmJiBPYmplY3Qua2V5cyhtZXNzYWdlcykubGVuZ3RoID4gMCkge1xuXHRcdFx0bWVzc2FnZXNBcnJheSA9IG1lc3NhZ2VzO1xuXHRcdFx0JC5lYWNoKG1lc3NhZ2VzLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG5cdFx0XHRcdGlmICghdmFsdWUpIHtcblx0XHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlc0FycmF5KSl7XG5cdFx0XHRcdFx0XHRtZXNzYWdlc0FycmF5LnBvcChpbmRleCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGRlbGV0ZSBtZXNzYWdlc0FycmF5W2luZGV4XTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlcykgJiYgbWVzc2FnZXMpIHtcblx0XHRcdG1lc3NhZ2VzQXJyYXkgPSB7IGVycm9yOiBtZXNzYWdlcyB9O1xuXHRcdH1cblx0XHRsZXQgcHJldmlvdXNNZXNzYWdlID0gJyc7XG5cdFx0aWYgKG1lc3NhZ2VzQXJyYXkubGVuZ3RoID09PSAxIHx8IE9iamVjdC5rZXlzKG1lc3NhZ2VzQXJyYXkpLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0JC5lYWNoKG1lc3NhZ2VzQXJyYXksIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdFx0aWYgKHByZXZpb3VzTWVzc2FnZSA9PT0gdmFsdWUpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0bGV0IG5ld1ZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KG5ld1ZhbHVlKSkge1xuXHRcdFx0XHRcdG5ld1ZhbHVlID0gbmV3VmFsdWUuam9pbignPGJyPicpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChuZXdWYWx1ZS5sZW5ndGggPiAxMDApIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS4kYWpheE1lc3NhZ2VzRGl2LmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgJHtpbmRleH0gbWVzc2FnZSBhamF4XCI+JHtuZXdWYWx1ZX08L2Rpdj5gKTtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoaW5kZXggPT09ICdlcnJvcicpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IobmV3VmFsdWUsIGhlYWRlcik7XG5cdFx0XHRcdH0gZWxzZSBpZiAoaW5kZXggPT09ICdpbmZvJykge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihuZXdWYWx1ZSwgaGVhZGVyKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93V3JhbmluZyhuZXdWYWx1ZSwgaGVhZGVyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwcmV2aW91c01lc3NhZ2UgPSB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsZXQgY29udGVudCA9ICcnO1xuXHRcdFx0JC5lYWNoKG1lc3NhZ2VzQXJyYXksIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdFx0bGV0IG5ld1ZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdGlmIChwcmV2aW91c01lc3NhZ2UgIT09IHZhbHVlKSB7XG5cdFx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkobmV3VmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRuZXdWYWx1ZSA9IG5ld1ZhbHVlLmpvaW4oJzxicj4nKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y29udGVudCA9IGAke2NvbnRlbnR9PGJyPiR7bmV3VmFsdWV9YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRwcmV2aW91c01lc3NhZ2UgPSB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdFx0VXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0RpdlxuXHRcdFx0XHQuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2UgYWpheFwiPjxkaXYgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj4ke2NvbnRlbnR9PC9kaXY+YCk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zY3JvbGxUb01lc3NhZ2VzKCk7XG5cdFx0fVxuXHR9LFxuXHRzY3JvbGxUb01lc3NhZ2VzKCkge1xuXHRcdCQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHtcblx0XHRcdHNjcm9sbFRvcDogVXNlck1lc3NhZ2UuJGFqYXhNZXNzYWdlc0Rpdi5vZmZzZXQoKS50b3AtNTAsXG5cdFx0fSwgMjAwMCk7XG5cdH0sXG59O1xuIl19