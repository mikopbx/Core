"use strict";

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

/* global PbxApi, globalTranslate */

/**
 * This module encapsulates a collection of functions related to Users.
 *
 * @module UsersAPI
 */
var UsersAPI = {
  /**
   * Checks if the new email is available.
   * @param {string} oldEmail - The original email.
   * @param {string} newEmail - The new email to check.
   * @param {string} cssClassName - The CSS class name for the input element.
   * @param {string} userId - The ID of the user associated with the extension.
   */
  checkAvailability: function checkAvailability(oldEmail, newEmail) {
    var cssClassName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'email';
    var userId = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';

    if (oldEmail === newEmail || newEmail.length === 0) {
      $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
      $("#".concat(cssClassName, "-error")).addClass('hidden');
      return;
    }

    $.api({
      url: PbxApi.usersAvailable,
      stateContext: ".ui.input.".concat(cssClassName),
      on: 'now',
      urlData: {
        email: newEmail
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (response.data['available'] === true) {
          $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
          $("#".concat(cssClassName, "-error")).addClass('hidden');
        } else if (userId.length > 0 && response.data['userId'] === userId) {
          $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
          $("#".concat(cssClassName, "-error")).addClass('hidden');
        } else {
          $(".ui.input.".concat(cssClassName)).parent().addClass('error');
          var message = "".concat(globalTranslate.ex_ThisEmailAlreadyRegisteredForOtherUser, ":&nbsp");

          if (globalTranslate[response.data['represent']] !== undefined) {
            message = globalTranslate[response.data['represent']];
          } else {
            message += response.data['represent'];
          }

          $("#".concat(cssClassName, "-error")).removeClass('hidden').html(message);
        }
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvdXNlcnNBUEkuanMiXSwibmFtZXMiOlsiVXNlcnNBUEkiLCJjaGVja0F2YWlsYWJpbGl0eSIsIm9sZEVtYWlsIiwibmV3RW1haWwiLCJjc3NDbGFzc05hbWUiLCJ1c2VySWQiLCJsZW5ndGgiLCIkIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsInVybCIsIlBieEFwaSIsInVzZXJzQXZhaWxhYmxlIiwic3RhdGVDb250ZXh0Iiwib24iLCJ1cmxEYXRhIiwiZW1haWwiLCJzdWNjZXNzVGVzdCIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiZGF0YSIsIm1lc3NhZ2UiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9UaGlzRW1haWxBbHJlYWR5UmVnaXN0ZXJlZEZvck90aGVyVXNlciIsInVuZGVmaW5lZCIsImh0bWwiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBUmEsNkJBUUtDLFFBUkwsRUFRZUMsUUFSZixFQVE4RDtBQUFBLFFBQXJDQyxZQUFxQyx1RUFBdEIsT0FBc0I7QUFBQSxRQUFiQyxNQUFhLHVFQUFKLEVBQUk7O0FBQ3ZFLFFBQUlILFFBQVEsS0FBS0MsUUFBYixJQUF5QkEsUUFBUSxDQUFDRyxNQUFULEtBQWtCLENBQS9DLEVBQWtEO0FBQzlDQyxNQUFBQSxDQUFDLHFCQUFjSCxZQUFkLEVBQUQsQ0FBK0JJLE1BQS9CLEdBQXdDQyxXQUF4QyxDQUFvRCxPQUFwRDtBQUNBRixNQUFBQSxDQUFDLFlBQUtILFlBQUwsWUFBRCxDQUE0Qk0sUUFBNUIsQ0FBcUMsUUFBckM7QUFDQTtBQUNIOztBQUNESCxJQUFBQSxDQUFDLENBQUNJLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUVDLE1BQU0sQ0FBQ0MsY0FEVjtBQUVGQyxNQUFBQSxZQUFZLHNCQUFlWCxZQUFmLENBRlY7QUFHRlksTUFBQUEsRUFBRSxFQUFFLEtBSEY7QUFJRkMsTUFBQUEsT0FBTyxFQUFFO0FBQ0xDLFFBQUFBLEtBQUssRUFBRWY7QUFERixPQUpQO0FBT0ZnQixNQUFBQSxXQUFXLEVBQUVOLE1BQU0sQ0FBQ00sV0FQbEI7QUFRRkMsTUFBQUEsU0FSRSxxQkFRUUMsUUFSUixFQVFrQjtBQUNoQixZQUFJQSxRQUFRLENBQUNDLElBQVQsQ0FBYyxXQUFkLE1BQTZCLElBQWpDLEVBQXVDO0FBQ25DZixVQUFBQSxDQUFDLHFCQUFjSCxZQUFkLEVBQUQsQ0FBK0JJLE1BQS9CLEdBQXdDQyxXQUF4QyxDQUFvRCxPQUFwRDtBQUNBRixVQUFBQSxDQUFDLFlBQUtILFlBQUwsWUFBRCxDQUE0Qk0sUUFBNUIsQ0FBcUMsUUFBckM7QUFDSCxTQUhELE1BR08sSUFBSUwsTUFBTSxDQUFDQyxNQUFQLEdBQWdCLENBQWhCLElBQXFCZSxRQUFRLENBQUNDLElBQVQsQ0FBYyxRQUFkLE1BQTRCakIsTUFBckQsRUFBNkQ7QUFDaEVFLFVBQUFBLENBQUMscUJBQWNILFlBQWQsRUFBRCxDQUErQkksTUFBL0IsR0FBd0NDLFdBQXhDLENBQW9ELE9BQXBEO0FBQ0FGLFVBQUFBLENBQUMsWUFBS0gsWUFBTCxZQUFELENBQTRCTSxRQUE1QixDQUFxQyxRQUFyQztBQUNILFNBSE0sTUFHQTtBQUNISCxVQUFBQSxDQUFDLHFCQUFjSCxZQUFkLEVBQUQsQ0FBK0JJLE1BQS9CLEdBQXdDRSxRQUF4QyxDQUFpRCxPQUFqRDtBQUNBLGNBQUlhLE9BQU8sYUFBS0MsZUFBZSxDQUFDQyx5Q0FBckIsV0FBWDs7QUFDQSxjQUFJRCxlQUFlLENBQUNILFFBQVEsQ0FBQ0MsSUFBVCxDQUFjLFdBQWQsQ0FBRCxDQUFmLEtBQThDSSxTQUFsRCxFQUE0RDtBQUN4REgsWUFBQUEsT0FBTyxHQUFHQyxlQUFlLENBQUNILFFBQVEsQ0FBQ0MsSUFBVCxDQUFjLFdBQWQsQ0FBRCxDQUF6QjtBQUNILFdBRkQsTUFFTztBQUNIQyxZQUFBQSxPQUFPLElBQUdGLFFBQVEsQ0FBQ0MsSUFBVCxDQUFjLFdBQWQsQ0FBVjtBQUNIOztBQUNEZixVQUFBQSxDQUFDLFlBQUtILFlBQUwsWUFBRCxDQUE0QkssV0FBNUIsQ0FBd0MsUUFBeEMsRUFBa0RrQixJQUFsRCxDQUF1REosT0FBdkQ7QUFDSDtBQUNKO0FBekJDLEtBQU47QUEyQkg7QUF6Q1ksQ0FBakIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBUaGlzIG1vZHVsZSBlbmNhcHN1bGF0ZXMgYSBjb2xsZWN0aW9uIG9mIGZ1bmN0aW9ucyByZWxhdGVkIHRvIFVzZXJzLlxuICpcbiAqIEBtb2R1bGUgVXNlcnNBUElcbiAqL1xuY29uc3QgVXNlcnNBUEkgPSB7XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSBuZXcgZW1haWwgaXMgYXZhaWxhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGRFbWFpbCAtIFRoZSBvcmlnaW5hbCBlbWFpbC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3RW1haWwgLSBUaGUgbmV3IGVtYWlsIHRvIGNoZWNrLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUgZm9yIHRoZSBpbnB1dCBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VySWQgLSBUaGUgSUQgb2YgdGhlIHVzZXIgYXNzb2NpYXRlZCB3aXRoIHRoZSBleHRlbnNpb24uXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkRW1haWwsIG5ld0VtYWlsLCBjc3NDbGFzc05hbWUgPSAnZW1haWwnLCB1c2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkRW1haWwgPT09IG5ld0VtYWlsIHx8IG5ld0VtYWlsLmxlbmd0aD09PTApIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkudXNlcnNBdmFpbGFibGUsXG4gICAgICAgICAgICBzdGF0ZUNvbnRleHQ6IGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICBlbWFpbDogbmV3RW1haWxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGFbJ2F2YWlsYWJsZSddPT09dHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiByZXNwb25zZS5kYXRhWyd1c2VySWQnXSA9PT0gdXNlcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlID1gJHtnbG9iYWxUcmFuc2xhdGUuZXhfVGhpc0VtYWlsQWxyZWFkeVJlZ2lzdGVyZWRGb3JPdGhlclVzZXJ9OiZuYnNwYDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV0hPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9cmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG59Il19