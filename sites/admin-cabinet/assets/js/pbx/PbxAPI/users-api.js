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

/* global PbxApiClient, PbxApi, globalTranslate, $ */

/**
 * UsersAPI - REST API v3 client for users management
 *
 * Provides a clean interface for users operations using the new RESTful API.
 *  
 * @class UsersAPI
 */
var UsersAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/users',
  customMethods: {
    checkAvailability: ':available'
  }
}); // Add method aliases for compatibility and easier use

Object.assign(UsersAPI, {
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

    var $field = $(".ui.input.".concat(cssClassName)).parent();
    var $error = $("#".concat(cssClassName, "-error")); // Use new API approach with callCustomMethod

    this.callCustomMethod('checkAvailability', {
      email: newEmail
    }, function (response) {
      // No verdict without data (network error, 4xx/5xx): drop the verdict left from a previous value
      // and say the check failed instead of reporting the address as free or taken
      if (!response || response.result !== true || !response.data) {
        $field.removeClass('error');
        $error.removeClass('hidden').html(globalTranslate.ex_EmailAvailabilityCheckFailed);
        return;
      }

      var isOwnEmail = userId.length > 0 && response.data['userId'] === userId;

      if (response.data['available'] === true || isOwnEmail) {
        $field.removeClass('error');
        $error.addClass('hidden');
      } else {
        $field.addClass('error');
        var message = "".concat(globalTranslate.ex_ThisEmailAlreadyRegisteredForOtherUser, ":&nbsp");

        if (globalTranslate[response.data['represent']] !== undefined) {
          message = globalTranslate[response.data['represent']];
        } else {
          message += response.data['represent'];
        }

        $error.removeClass('hidden').html(message);
      }
    });
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvdXNlcnMtYXBpLmpzIl0sIm5hbWVzIjpbIlVzZXJzQVBJIiwiUGJ4QXBpQ2xpZW50IiwiZW5kcG9pbnQiLCJjdXN0b21NZXRob2RzIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJPYmplY3QiLCJhc3NpZ24iLCJvbGRFbWFpbCIsIm5ld0VtYWlsIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwibGVuZ3RoIiwiJCIsInBhcmVudCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCIkZmllbGQiLCIkZXJyb3IiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiZW1haWwiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfRW1haWxBdmFpbGFiaWxpdHlDaGVja0ZhaWxlZCIsImlzT3duRW1haWwiLCJtZXNzYWdlIiwiZXhfVGhpc0VtYWlsQWxyZWFkeVJlZ2lzdGVyZWRGb3JPdGhlclVzZXIiLCJ1bmRlZmluZWQiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQzlCQyxFQUFBQSxRQUFRLEVBQUUsdUJBRG9CO0FBRTlCQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsaUJBQWlCLEVBQUU7QUFEUjtBQUZlLENBQWpCLENBQWpCLEMsQ0FPQTs7QUFDQUMsTUFBTSxDQUFDQyxNQUFQLENBQWNOLFFBQWQsRUFBd0I7QUFDcEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsaUJBUm9CLDZCQVFGRyxRQVJFLEVBUVFDLFFBUlIsRUFRdUQ7QUFBQSxRQUFyQ0MsWUFBcUMsdUVBQXRCLE9BQXNCO0FBQUEsUUFBYkMsTUFBYSx1RUFBSixFQUFJOztBQUN2RSxRQUFJSCxRQUFRLEtBQUtDLFFBQWIsSUFBeUJBLFFBQVEsQ0FBQ0csTUFBVCxLQUFvQixDQUFqRCxFQUFvRDtBQUNoREMsTUFBQUEsQ0FBQyxxQkFBY0gsWUFBZCxFQUFELENBQStCSSxNQUEvQixHQUF3Q0MsV0FBeEMsQ0FBb0QsT0FBcEQ7QUFDQUYsTUFBQUEsQ0FBQyxZQUFLSCxZQUFMLFlBQUQsQ0FBNEJNLFFBQTVCLENBQXFDLFFBQXJDO0FBQ0E7QUFDSDs7QUFFRCxRQUFNQyxNQUFNLEdBQUdKLENBQUMscUJBQWNILFlBQWQsRUFBRCxDQUErQkksTUFBL0IsRUFBZjtBQUNBLFFBQU1JLE1BQU0sR0FBR0wsQ0FBQyxZQUFLSCxZQUFMLFlBQWhCLENBUnVFLENBVXZFOztBQUNBLFNBQUtTLGdCQUFMLENBQXNCLG1CQUF0QixFQUEyQztBQUFFQyxNQUFBQSxLQUFLLEVBQUVYO0FBQVQsS0FBM0MsRUFBZ0UsVUFBQ1ksUUFBRCxFQUFjO0FBQzFFO0FBQ0E7QUFDQSxVQUFJLENBQUNBLFFBQUQsSUFBYUEsUUFBUSxDQUFDQyxNQUFULEtBQW9CLElBQWpDLElBQXlDLENBQUNELFFBQVEsQ0FBQ0UsSUFBdkQsRUFBNkQ7QUFDekROLFFBQUFBLE1BQU0sQ0FBQ0YsV0FBUCxDQUFtQixPQUFuQjtBQUNBRyxRQUFBQSxNQUFNLENBQUNILFdBQVAsQ0FBbUIsUUFBbkIsRUFBNkJTLElBQTdCLENBQWtDQyxlQUFlLENBQUNDLCtCQUFsRDtBQUNBO0FBQ0g7O0FBQ0QsVUFBTUMsVUFBVSxHQUFHaEIsTUFBTSxDQUFDQyxNQUFQLEdBQWdCLENBQWhCLElBQXFCUyxRQUFRLENBQUNFLElBQVQsQ0FBYyxRQUFkLE1BQTRCWixNQUFwRTs7QUFDQSxVQUFJVSxRQUFRLENBQUNFLElBQVQsQ0FBYyxXQUFkLE1BQStCLElBQS9CLElBQXVDSSxVQUEzQyxFQUF1RDtBQUNuRFYsUUFBQUEsTUFBTSxDQUFDRixXQUFQLENBQW1CLE9BQW5CO0FBQ0FHLFFBQUFBLE1BQU0sQ0FBQ0YsUUFBUCxDQUFnQixRQUFoQjtBQUNILE9BSEQsTUFHTztBQUNIQyxRQUFBQSxNQUFNLENBQUNELFFBQVAsQ0FBZ0IsT0FBaEI7QUFDQSxZQUFJWSxPQUFPLGFBQU1ILGVBQWUsQ0FBQ0kseUNBQXRCLFdBQVg7O0FBQ0EsWUFBSUosZUFBZSxDQUFDSixRQUFRLENBQUNFLElBQVQsQ0FBYyxXQUFkLENBQUQsQ0FBZixLQUFnRE8sU0FBcEQsRUFBK0Q7QUFDM0RGLFVBQUFBLE9BQU8sR0FBR0gsZUFBZSxDQUFDSixRQUFRLENBQUNFLElBQVQsQ0FBYyxXQUFkLENBQUQsQ0FBekI7QUFDSCxTQUZELE1BRU87QUFDSEssVUFBQUEsT0FBTyxJQUFJUCxRQUFRLENBQUNFLElBQVQsQ0FBYyxXQUFkLENBQVg7QUFDSDs7QUFDREwsUUFBQUEsTUFBTSxDQUFDSCxXQUFQLENBQW1CLFFBQW5CLEVBQTZCUyxJQUE3QixDQUFrQ0ksT0FBbEM7QUFDSDtBQUNKLEtBdEJEO0FBdUJIO0FBMUNtQixDQUF4QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGlDbGllbnQsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCAkICovXG5cbi8qKlxuICogVXNlcnNBUEkgLSBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIHVzZXJzIG1hbmFnZW1lbnRcbiAqXG4gKiBQcm92aWRlcyBhIGNsZWFuIGludGVyZmFjZSBmb3IgdXNlcnMgb3BlcmF0aW9ucyB1c2luZyB0aGUgbmV3IFJFU1RmdWwgQVBJLlxuICogIFxuICogQGNsYXNzIFVzZXJzQVBJXG4gKi9cbmNvbnN0IFVzZXJzQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvdXNlcnMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgY2hlY2tBdmFpbGFiaWxpdHk6ICc6YXZhaWxhYmxlJ1xuICAgIH1cbn0pO1xuXG4vLyBBZGQgbWV0aG9kIGFsaWFzZXMgZm9yIGNvbXBhdGliaWxpdHkgYW5kIGVhc2llciB1c2Vcbk9iamVjdC5hc3NpZ24oVXNlcnNBUEksIHtcbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIG5ldyBlbWFpbCBpcyBhdmFpbGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZEVtYWlsIC0gVGhlIG9yaWdpbmFsIGVtYWlsLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdFbWFpbCAtIFRoZSBuZXcgZW1haWwgdG8gY2hlY2suXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNzc0NsYXNzTmFtZSAtIFRoZSBDU1MgY2xhc3MgbmFtZSBmb3IgdGhlIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVzZXJJZCAtIFRoZSBJRCBvZiB0aGUgdXNlciBhc3NvY2lhdGVkIHdpdGggdGhlIGV4dGVuc2lvbi5cbiAgICAgKi9cbiAgICBjaGVja0F2YWlsYWJpbGl0eShvbGRFbWFpbCwgbmV3RW1haWwsIGNzc0NsYXNzTmFtZSA9ICdlbWFpbCcsIHVzZXJJZCA9ICcnKSB7XG4gICAgICAgIGlmIChvbGRFbWFpbCA9PT0gbmV3RW1haWwgfHwgbmV3RW1haWwubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGZpZWxkID0gJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpO1xuICAgICAgICBjb25zdCAkZXJyb3IgPSAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCk7XG5cbiAgICAgICAgLy8gVXNlIG5ldyBBUEkgYXBwcm9hY2ggd2l0aCBjYWxsQ3VzdG9tTWV0aG9kXG4gICAgICAgIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnY2hlY2tBdmFpbGFiaWxpdHknLCB7IGVtYWlsOiBuZXdFbWFpbCB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIE5vIHZlcmRpY3Qgd2l0aG91dCBkYXRhIChuZXR3b3JrIGVycm9yLCA0eHgvNXh4KTogZHJvcCB0aGUgdmVyZGljdCBsZWZ0IGZyb20gYSBwcmV2aW91cyB2YWx1ZVxuICAgICAgICAgICAgLy8gYW5kIHNheSB0aGUgY2hlY2sgZmFpbGVkIGluc3RlYWQgb2YgcmVwb3J0aW5nIHRoZSBhZGRyZXNzIGFzIGZyZWUgb3IgdGFrZW5cbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgcmVzcG9uc2UucmVzdWx0ICE9PSB0cnVlIHx8ICFyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgJGZpZWxkLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICRlcnJvci5yZW1vdmVDbGFzcygnaGlkZGVuJykuaHRtbChnbG9iYWxUcmFuc2xhdGUuZXhfRW1haWxBdmFpbGFiaWxpdHlDaGVja0ZhaWxlZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaXNPd25FbWFpbCA9IHVzZXJJZC5sZW5ndGggPiAwICYmIHJlc3BvbnNlLmRhdGFbJ3VzZXJJZCddID09PSB1c2VySWQ7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YVsnYXZhaWxhYmxlJ10gPT09IHRydWUgfHwgaXNPd25FbWFpbCkge1xuICAgICAgICAgICAgICAgICRmaWVsZC5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkZXJyb3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZmllbGQuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfVGhpc0VtYWlsQWxyZWFkeVJlZ2lzdGVyZWRGb3JPdGhlclVzZXJ9OiZuYnNwYDtcbiAgICAgICAgICAgICAgICBpZiAoZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGVbcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J11dO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRlcnJvci5yZW1vdmVDbGFzcygnaGlkZGVuJykuaHRtbChtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufSk7Il19