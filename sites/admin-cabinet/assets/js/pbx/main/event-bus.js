"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalDebugMode, EventSource */

/**
 * The EventBus object is responsible for managing event subscriptions and notifications.
 *
 * @module EventBus
 */
var EventBus = {
  /**
  * EventSource object for the connection check.
  * @type {EventSource}
  */
  socket: null,

  /**
   * The identifier for the PUB/SUB channel used to subscribe to advice updates.
   * This ensures that the client is listening on the correct channel for relevant events.
   */
  channelId: 'event-bus',

  /**
   * The subscribers for the event bus.
   * @type {Object}
   */
  subscribers: {},

  /**
   * Counter for consecutive 403 errors
   * @type {number}
   */
  forbidden403Count: 0,

  /**
   * Initializes the event bus.
   */
  initialize: function initialize() {
    EventBus.startListenPushNotifications();
  },

  /**
   * Establishes a connection to the server to start receiving real-time updates on events.
   * Utilizes the EventSource API to listen for messages on a specified channel.
   */
  startListenPushNotifications: function startListenPushNotifications() {
    var subPath = "/pbxcore/api/nchan/sub/".concat(EventBus.channelId); // Close existing connection if any

    if (EventBus.socket) {
      EventBus.socket.close();
    } // Create a WebSocket connection


    var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    var wsUrl = "".concat(protocol, "//").concat(window.location.host).concat(subPath, "?msg_id=-1");
    EventBus.socket = new WebSocket(wsUrl); // Handle messages

    EventBus.socket.onmessage = function (event) {
      var message = JSON.parse(event.data);
      EventBus.publish(message.type, message.data); // Reset error counter on successful message

      EventBus.forbidden403Count = 0;
    }; // Handle errors


    EventBus.socket.onerror = function (error) {
      console.error('WebSocket Error:', error); // Don't publish connection status if we're already redirecting to login

      if (typeof PbxApiClient !== 'undefined' && PbxApiClient.isRedirectingToLogin) {
        return;
      }

      EventBus.publish('connection-status', false);
    }; // Handle connection break


    EventBus.socket.onclose = function (event) {
      // Don't attempt reconnection if we're already redirecting to login
      if (typeof PbxApiClient !== 'undefined' && PbxApiClient.isRedirectingToLogin) {
        return;
      }

      EventBus.publish('connection-status', false); // Check if this was a 403 Forbidden error

      if (event.code === 1006 || event.code === 1008) {
        // Increment error counter
        EventBus.forbidden403Count++; // If we've had 3 consecutive 403 errors, check if backend is ready before reload

        if (EventBus.forbidden403Count >= 3) {
          // Check if SystemAPI is available
          if (typeof SystemAPI !== 'undefined') {
            var pingTimeout;
            var pingCompleted = false; // Set timeout for ping request (3 seconds)

            pingTimeout = setTimeout(function () {
              if (!pingCompleted) {
                EventBus.forbidden403Count = 2; // Keep counter high to retry ping soon

                pingCompleted = true; // Schedule reconnection after timeout

                setTimeout(function () {
                  EventBus.startListenPushNotifications();
                }, 2000);
              }
            }, 3000);
            SystemAPI.ping(function (response) {
              if (pingCompleted) {
                return; // Timeout already fired
              }

              clearTimeout(pingTimeout);
              pingCompleted = true;

              if (response && response.result === true) {
                window.location.reload();
              } else {
                EventBus.forbidden403Count = 2; // Keep counter high to retry ping soon
                // Schedule reconnection after failed ping

                setTimeout(function () {
                  EventBus.startListenPushNotifications();
                }, 2000);
              }
            });
          } else {
            // If SystemAPI not available, reload as before
            window.location.reload();
          }

          return; // Exit early, reconnection will be triggered by ping callback or timeout
        }
      } else {
        // Reset counter for other types of errors
        EventBus.forbidden403Count = 0;
      } // Schedule reconnection in 2 seconds


      setTimeout(function () {
        EventBus.startListenPushNotifications();
      }, 2000);
    }; // Handle connection open


    EventBus.socket.onopen = function () {
      EventBus.publish('connection-status', true); // Reset error counter on successful connection

      EventBus.forbidden403Count = 0;
    };
  },

  /**
   * Subscribes to an event.
   * @param {string} event - The event to subscribe to.
   * @param {Function} callback - The callback function to be called when the event occurs.
   */
  subscribe: function subscribe(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }

    this.subscribers[event].push(callback);
  },

  /**
   * Unsubscribes from an event.
   * @param {string} event - The event to unsubscribe from.
   * @param {Function} [callback] - The specific callback function to remove. If not provided, all callbacks for the event are removed.
   */
  unsubscribe: function unsubscribe(event, callback) {
    if (!this.subscribers[event]) return;

    if (callback) {
      // Remove specific callback
      var index = this.subscribers[event].indexOf(callback);

      if (index !== -1) {
        this.subscribers[event].splice(index, 1);
      }
    } else {
      // Remove all callbacks for this event
      delete this.subscribers[event];
    }
  },

  /**
   * Publishes an event.
   * @param {string} event - The event to publish.
   * @param {Object} data - The data to be published.
   */
  publish: function publish(event, data) {
    if (!this.subscribers[event]) return;
    this.subscribers[event].forEach(function (callback) {
      return callback(data);
    });
  }
}; // When the document is ready, initialize the event bus

$(document).ready(function () {
  EventBus.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2V2ZW50LWJ1cy5qcyJdLCJuYW1lcyI6WyJFdmVudEJ1cyIsInNvY2tldCIsImNoYW5uZWxJZCIsInN1YnNjcmliZXJzIiwiZm9yYmlkZGVuNDAzQ291bnQiLCJpbml0aWFsaXplIiwic3RhcnRMaXN0ZW5QdXNoTm90aWZpY2F0aW9ucyIsInN1YlBhdGgiLCJjbG9zZSIsInByb3RvY29sIiwid2luZG93IiwibG9jYXRpb24iLCJ3c1VybCIsImhvc3QiLCJXZWJTb2NrZXQiLCJvbm1lc3NhZ2UiLCJldmVudCIsIm1lc3NhZ2UiLCJKU09OIiwicGFyc2UiLCJkYXRhIiwicHVibGlzaCIsInR5cGUiLCJvbmVycm9yIiwiZXJyb3IiLCJjb25zb2xlIiwiUGJ4QXBpQ2xpZW50IiwiaXNSZWRpcmVjdGluZ1RvTG9naW4iLCJvbmNsb3NlIiwiY29kZSIsIlN5c3RlbUFQSSIsInBpbmdUaW1lb3V0IiwicGluZ0NvbXBsZXRlZCIsInNldFRpbWVvdXQiLCJwaW5nIiwicmVzcG9uc2UiLCJjbGVhclRpbWVvdXQiLCJyZXN1bHQiLCJyZWxvYWQiLCJvbm9wZW4iLCJzdWJzY3JpYmUiLCJjYWxsYmFjayIsInB1c2giLCJ1bnN1YnNjcmliZSIsImluZGV4IiwiaW5kZXhPZiIsInNwbGljZSIsImZvckVhY2giLCIkIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxNQUFNLEVBQUUsSUFMSzs7QUFPYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsV0FYRTs7QUFhYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFB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SyxFQXVMRUksSUF2TEYsRUF1TFE7QUFDakIsUUFBSSxDQUFDLEtBQUtqQixXQUFMLENBQWlCYSxLQUFqQixDQUFMLEVBQThCO0FBQzlCLFNBQUtiLFdBQUwsQ0FBaUJhLEtBQWpCLEVBQXdCK0IsT0FBeEIsQ0FBZ0MsVUFBQU4sUUFBUTtBQUFBLGFBQUlBLFFBQVEsQ0FBQ3JCLElBQUQsQ0FBWjtBQUFBLEtBQXhDO0FBQ0g7QUExTFksQ0FBakIsQyxDQThMQTs7QUFDQTRCLENBQUMsQ0FBQ0MsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmxELEVBQUFBLFFBQVEsQ0FBQ0ssVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsRGVidWdNb2RlLCBFdmVudFNvdXJjZSAqL1xuXG4vKipcbiAqIFRoZSBFdmVudEJ1cyBvYmplY3QgaXMgcmVzcG9uc2libGUgZm9yIG1hbmFnaW5nIGV2ZW50IHN1YnNjcmlwdGlvbnMgYW5kIG5vdGlmaWNhdGlvbnMuXG4gKlxuICogQG1vZHVsZSBFdmVudEJ1c1xuICovXG5jb25zdCBFdmVudEJ1cyA9IHtcbiAgICAvKipcbiAgICAqIEV2ZW50U291cmNlIG9iamVjdCBmb3IgdGhlIGNvbm5lY3Rpb24gY2hlY2suXG4gICAgKiBAdHlwZSB7RXZlbnRTb3VyY2V9XG4gICAgKi9cbiAgICBzb2NrZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgaWRlbnRpZmllciBmb3IgdGhlIFBVQi9TVUIgY2hhbm5lbCB1c2VkIHRvIHN1YnNjcmliZSB0byBhZHZpY2UgdXBkYXRlcy5cbiAgICAgKiBUaGlzIGVuc3VyZXMgdGhhdCB0aGUgY2xpZW50IGlzIGxpc3RlbmluZyBvbiB0aGUgY29ycmVjdCBjaGFubmVsIGZvciByZWxldmFudCBldmVudHMuXG4gICAgICovXG4gICAgY2hhbm5lbElkOiAnZXZlbnQtYnVzJyxcblxuICAgIC8qKlxuICAgICAqIFRoZSBzdWJzY3JpYmVycyBmb3IgdGhlIGV2ZW50IGJ1cy5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHN1YnNjcmliZXJzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIENvdW50ZXIgZm9yIGNvbnNlY3V0aXZlIDQwMyBlcnJvcnNcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIGZvcmJpZGRlbjQwM0NvdW50OiAwLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGV2ZW50IGJ1cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBFdmVudEJ1cy5zdGFydExpc3RlblB1c2hOb3RpZmljYXRpb25zKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVzdGFibGlzaGVzIGEgY29ubmVjdGlvbiB0byB0aGUgc2VydmVyIHRvIHN0YXJ0IHJlY2VpdmluZyByZWFsLXRpbWUgdXBkYXRlcyBvbiBldmVudHMuXG4gICAgICogVXRpbGl6ZXMgdGhlIEV2ZW50U291cmNlIEFQSSB0byBsaXN0ZW4gZm9yIG1lc3NhZ2VzIG9uIGEgc3BlY2lmaWVkIGNoYW5uZWwuXG4gICAgICovXG4gICAgc3RhcnRMaXN0ZW5QdXNoTm90aWZpY2F0aW9ucygpIHtcbiAgICAgICAgbGV0IHN1YlBhdGggPSBgL3BieGNvcmUvYXBpL25jaGFuL3N1Yi8ke0V2ZW50QnVzLmNoYW5uZWxJZH1gO1xuICAgIFxuICAgICAgICAvLyBDbG9zZSBleGlzdGluZyBjb25uZWN0aW9uIGlmIGFueVxuICAgICAgICBpZiAoRXZlbnRCdXMuc29ja2V0KSB7XG4gICAgICAgICAgICBFdmVudEJ1cy5zb2NrZXQuY2xvc2UoKTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICAvLyBDcmVhdGUgYSBXZWJTb2NrZXQgY29ubmVjdGlvblxuICAgICAgICBjb25zdCBwcm90b2NvbCA9IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgPyAnd3NzOicgOiAnd3M6JztcbiAgICAgICAgY29uc3Qgd3NVcmwgPSBgJHtwcm90b2NvbH0vLyR7d2luZG93LmxvY2F0aW9uLmhvc3R9JHtzdWJQYXRofT9tc2dfaWQ9LTFgO1xuICAgICAgICBFdmVudEJ1cy5zb2NrZXQgPSBuZXcgV2ViU29ja2V0KHdzVXJsKTtcbiAgICBcbiAgICAgICAgLy8gSGFuZGxlIG1lc3NhZ2VzXG4gICAgICAgIEV2ZW50QnVzLnNvY2tldC5vbm1lc3NhZ2UgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuICAgICAgICAgICAgRXZlbnRCdXMucHVibGlzaChtZXNzYWdlLnR5cGUsIG1lc3NhZ2UuZGF0YSk7XG4gICAgICAgICAgICAvLyBSZXNldCBlcnJvciBjb3VudGVyIG9uIHN1Y2Nlc3NmdWwgbWVzc2FnZVxuICAgICAgICAgICAgRXZlbnRCdXMuZm9yYmlkZGVuNDAzQ291bnQgPSAwO1xuICAgICAgICB9O1xuICAgIFxuICAgICAgICAvLyBIYW5kbGUgZXJyb3JzXG4gICAgICAgIEV2ZW50QnVzLnNvY2tldC5vbmVycm9yID0gKGVycm9yKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXZWJTb2NrZXQgRXJyb3I6JywgZXJyb3IpO1xuXG4gICAgICAgICAgICAvLyBEb24ndCBwdWJsaXNoIGNvbm5lY3Rpb24gc3RhdHVzIGlmIHdlJ3JlIGFscmVhZHkgcmVkaXJlY3RpbmcgdG8gbG9naW5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgUGJ4QXBpQ2xpZW50ICE9PSAndW5kZWZpbmVkJyAmJiBQYnhBcGlDbGllbnQuaXNSZWRpcmVjdGluZ1RvTG9naW4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIEV2ZW50QnVzLnB1Ymxpc2goJ2Nvbm5lY3Rpb24tc3RhdHVzJywgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEhhbmRsZSBjb25uZWN0aW9uIGJyZWFrXG4gICAgICAgIEV2ZW50QnVzLnNvY2tldC5vbmNsb3NlID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAvLyBEb24ndCBhdHRlbXB0IHJlY29ubmVjdGlvbiBpZiB3ZSdyZSBhbHJlYWR5IHJlZGlyZWN0aW5nIHRvIGxvZ2luXG4gICAgICAgICAgICBpZiAodHlwZW9mIFBieEFwaUNsaWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgUGJ4QXBpQ2xpZW50LmlzUmVkaXJlY3RpbmdUb0xvZ2luKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBFdmVudEJ1cy5wdWJsaXNoKCdjb25uZWN0aW9uLXN0YXR1cycsIGZhbHNlKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyB3YXMgYSA0MDMgRm9yYmlkZGVuIGVycm9yXG4gICAgICAgICAgICBpZiAoZXZlbnQuY29kZSA9PT0gMTAwNiB8fCBldmVudC5jb2RlID09PSAxMDA4KSB7XG4gICAgICAgICAgICAgICAgLy8gSW5jcmVtZW50IGVycm9yIGNvdW50ZXJcbiAgICAgICAgICAgICAgICBFdmVudEJ1cy5mb3JiaWRkZW40MDNDb3VudCsrO1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgd2UndmUgaGFkIDMgY29uc2VjdXRpdmUgNDAzIGVycm9ycywgY2hlY2sgaWYgYmFja2VuZCBpcyByZWFkeSBiZWZvcmUgcmVsb2FkXG4gICAgICAgICAgICAgICAgaWYgKEV2ZW50QnVzLmZvcmJpZGRlbjQwM0NvdW50ID49IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgU3lzdGVtQVBJIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIFN5c3RlbUFQSSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwaW5nVGltZW91dDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwaW5nQ29tcGxldGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCB0aW1lb3V0IGZvciBwaW5nIHJlcXVlc3QgKDMgc2Vjb25kcylcbiAgICAgICAgICAgICAgICAgICAgICAgIHBpbmdUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwaW5nQ29tcGxldGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEV2ZW50QnVzLmZvcmJpZGRlbjQwM0NvdW50ID0gMjsgLy8gS2VlcCBjb3VudGVyIGhpZ2ggdG8gcmV0cnkgcGluZyBzb29uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBpbmdDb21wbGV0ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNjaGVkdWxlIHJlY29ubmVjdGlvbiBhZnRlciB0aW1lb3V0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRXZlbnRCdXMuc3RhcnRMaXN0ZW5QdXNoTm90aWZpY2F0aW9ucygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAzMDAwKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgU3lzdGVtQVBJLnBpbmcoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBpbmdDb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBUaW1lb3V0IGFscmVhZHkgZmlyZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHBpbmdUaW1lb3V0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaW5nQ29tcGxldGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEV2ZW50QnVzLmZvcmJpZGRlbjQwM0NvdW50ID0gMjsgLy8gS2VlcCBjb3VudGVyIGhpZ2ggdG8gcmV0cnkgcGluZyBzb29uXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2NoZWR1bGUgcmVjb25uZWN0aW9uIGFmdGVyIGZhaWxlZCBwaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRXZlbnRCdXMuc3RhcnRMaXN0ZW5QdXNoTm90aWZpY2F0aW9ucygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIFN5c3RlbUFQSSBub3QgYXZhaWxhYmxlLCByZWxvYWQgYXMgYmVmb3JlXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBFeGl0IGVhcmx5LCByZWNvbm5lY3Rpb24gd2lsbCBiZSB0cmlnZ2VyZWQgYnkgcGluZyBjYWxsYmFjayBvciB0aW1lb3V0XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZXNldCBjb3VudGVyIGZvciBvdGhlciB0eXBlcyBvZiBlcnJvcnNcbiAgICAgICAgICAgICAgICBFdmVudEJ1cy5mb3JiaWRkZW40MDNDb3VudCA9IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNjaGVkdWxlIHJlY29ubmVjdGlvbiBpbiAyIHNlY29uZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIEV2ZW50QnVzLnN0YXJ0TGlzdGVuUHVzaE5vdGlmaWNhdGlvbnMoKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEhhbmRsZSBjb25uZWN0aW9uIG9wZW5cbiAgICAgICAgRXZlbnRCdXMuc29ja2V0Lm9ub3BlbiA9ICgpID0+IHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnB1Ymxpc2goJ2Nvbm5lY3Rpb24tc3RhdHVzJywgdHJ1ZSk7XG4gICAgICAgICAgICAvLyBSZXNldCBlcnJvciBjb3VudGVyIG9uIHN1Y2Nlc3NmdWwgY29ubmVjdGlvblxuICAgICAgICAgICAgRXZlbnRCdXMuZm9yYmlkZGVuNDAzQ291bnQgPSAwO1xuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmVzIHRvIGFuIGV2ZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudCAtIFRoZSBldmVudCB0byBzdWJzY3JpYmUgdG8uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGV2ZW50IG9jY3Vycy5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmUoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghdGhpcy5zdWJzY3JpYmVyc1tldmVudF0pIHtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaWJlcnNbZXZlbnRdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdWJzY3JpYmVyc1tldmVudF0ucHVzaChjYWxsYmFjayk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVuc3Vic2NyaWJlcyBmcm9tIGFuIGV2ZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudCAtIFRoZSBldmVudCB0byB1bnN1YnNjcmliZSBmcm9tLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gLSBUaGUgc3BlY2lmaWMgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVtb3ZlLiBJZiBub3QgcHJvdmlkZWQsIGFsbCBjYWxsYmFja3MgZm9yIHRoZSBldmVudCBhcmUgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICB1bnN1YnNjcmliZShldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLnN1YnNjcmliZXJzW2V2ZW50XSkgcmV0dXJuO1xuXG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHNwZWNpZmljIGNhbGxiYWNrXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuc3Vic2NyaWJlcnNbZXZlbnRdLmluZGV4T2YoY2FsbGJhY2spO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3Vic2NyaWJlcnNbZXZlbnRdLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBSZW1vdmUgYWxsIGNhbGxiYWNrcyBmb3IgdGhpcyBldmVudFxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuc3Vic2NyaWJlcnNbZXZlbnRdO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFB1Ymxpc2hlcyBhbiBldmVudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnQgLSBUaGUgZXZlbnQgdG8gcHVibGlzaC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIHRvIGJlIHB1Ymxpc2hlZC5cbiAgICAgKi9cbiAgICBwdWJsaXNoKGV2ZW50LCBkYXRhKSB7XG4gICAgICAgIGlmICghdGhpcy5zdWJzY3JpYmVyc1tldmVudF0pIHJldHVybjtcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVyc1tldmVudF0uZm9yRWFjaChjYWxsYmFjayA9PiBjYWxsYmFjayhkYXRhKSk7XG4gICAgfSxcbn07XG5cblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGV2ZW50IGJ1c1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEV2ZW50QnVzLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==