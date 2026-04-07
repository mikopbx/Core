"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/* global EventBus, globalTranslate */

/**
 * Universal file upload event handler using EventBus
 * Provides real-time status updates for all file upload operations
 *
 * @module FileUploadEventHandler
 */
var FileUploadEventHandler = {
  /**
   * Active subscriptions map
   * @type {Map<string, object>}
   */
  subscriptions: new Map(),

  /**
   * EventBus subscription status
   * @type {boolean}
   */
  eventBusSubscribed: false,

  /**
   * Subscribe to upload events for a specific upload ID
   *
   * @param {string} uploadId - Unique upload identifier
   * @param {object} callbacks - Event callback handlers
   * @param {function} callbacks.onUploadStarted - Called when upload starts
   * @param {function} callbacks.onChunkUploaded - Called when a chunk is uploaded
   * @param {function} callbacks.onMergeStarted - Called when merge starts
   * @param {function} callbacks.onMergeProgress - Called on merge progress
   * @param {function} callbacks.onMergeComplete - Called when merge completes
   * @param {function} callbacks.onError - Called on error
   * @returns {void}
   */
  subscribe: function subscribe(uploadId, callbacks) {
    var _this = this;

    if (!uploadId) {
      console.error('FileUploadEventHandler: uploadId is required');
      return;
    } // Unsubscribe from previous subscription if exists


    this.unsubscribe(uploadId); // Store subscription info

    this.subscriptions.set(uploadId, {
      uploadId: uploadId,
      callbacks: callbacks,
      handler: function handler(message) {
        return _this.handleEvent(uploadId, message);
      }
    }); // Subscribe to main event-bus channel if not already subscribed

    this.ensureEventBusSubscription(); // Subscribed to file upload events
  },

  /**
   * Ensure subscription to file-upload events
   * @private
   */
  ensureEventBusSubscription: function ensureEventBusSubscription() {
    var _this2 = this;

    if (!this.eventBusSubscribed) {
      EventBus.subscribe('file-upload', function (message) {
        return _this2.handleEventBusMessage(message);
      });
      this.eventBusSubscribed = true; // Subscribed to file-upload events via EventBus
    }
  },

  /**
   * Handle incoming message from file-upload events
   *
   * @param {object} message - Event message from EventBus
   * @private
   */
  handleEventBusMessage: function handleEventBusMessage(message) {
    // Received file-upload event
    // Message structure: { event: 'event-name', data: {...} }
    if (message && message.event && message.data) {
      var eventType = message.event,
          eventData = message.data; // Processing file-upload event
      // Call the original handleEvent method with the event structure

      var eventMessage = _objectSpread({
        type: eventType
      }, eventData); // Find subscription for this uploadId


      if (eventData.uploadId) {
        // Routing event to uploadId
        this.handleEvent(eventData.uploadId, eventMessage);
      } else {// No uploadId in event data
      }
    } else {// Invalid event structure
    }
  },

  /**
   * Handle incoming event from EventBus
   *
   * @param {string} uploadId - Upload identifier
   * @param {object} message - Event message
   * @private
   */
  handleEvent: function handleEvent(uploadId, message) {
    // handleEvent called for uploadId
    var subscription = this.subscriptions.get(uploadId);

    if (!subscription || !subscription.callbacks) {
      // No subscription found for uploadId
      return;
    } // Found subscription, processing event


    var callbacks = subscription.callbacks;

    switch (message.type) {
      case 'upload-started':
        if (callbacks.onUploadStarted) {
          callbacks.onUploadStarted(message);
        }

        break;

      case 'chunk-uploaded':
        if (callbacks.onChunkUploaded) {
          callbacks.onChunkUploaded(message);
        }

        break;

      case 'merge-started':
        if (callbacks.onMergeStarted) {
          callbacks.onMergeStarted(message);
        }

        break;

      case 'merge-progress':
        if (callbacks.onMergeProgress) {
          callbacks.onMergeProgress(message);
        }

        break;

      case 'merge-complete':
        if (callbacks.onMergeComplete) {
          callbacks.onMergeComplete(message);
        } // Auto-unsubscribe on completion


        this.unsubscribe(uploadId);
        break;

      case 'upload-error':
        if (callbacks.onError) {
          callbacks.onError(message);
        } // Auto-unsubscribe on error


        this.unsubscribe(uploadId);
        break;

      default: // Unknown file upload event type

    }
  },

  /**
   * Unsubscribe from upload events
   *
   * @param {string} uploadId - Upload identifier
   * @returns {void}
   */
  unsubscribe: function unsubscribe(uploadId) {
    var subscription = this.subscriptions.get(uploadId);

    if (!subscription) {
      return;
    } // Remove from subscriptions map


    this.subscriptions["delete"](uploadId); // Unsubscribed from file upload events
    // If no more subscriptions, unsubscribe from main event-bus

    if (this.subscriptions.size === 0 && this.eventBusSubscribed) {// Note: We don't actually unsubscribe from event-bus since other parts
      // of the system may be using it. EventBus handles multiple handlers.
    }
  },

  /**
   * Unsubscribe from all active upload channels
   *
   * @returns {void}
   */
  unsubscribeAll: function unsubscribeAll() {
    var _this3 = this;

    var uploadIds = Array.from(this.subscriptions.keys());
    uploadIds.forEach(function (uploadId) {
      _this3.unsubscribe(uploadId);
    });
  },

  /**
   * Get all active upload IDs
   *
   * @returns {string[]} Array of active upload IDs
   */
  getActiveUploads: function getActiveUploads() {
    return Array.from(this.subscriptions.keys());
  },

  /**
   * Check if subscribed to specific upload
   *
   * @param {string} uploadId - Upload identifier
   * @returns {boolean} True if subscribed
   */
  isSubscribed: function isSubscribed(uploadId) {
    return this.subscriptions.has(uploadId);
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2ZpbGUtdXBsb2FkLWV2ZW50LWhhbmRsZXIuanMiXSwibmFtZXMiOlsiRmlsZVVwbG9hZEV2ZW50SGFuZGxlciIsInN1YnNjcmlwdGlvbnMiLCJNYXAiLCJldmVudEJ1c1N1YnNjcmliZWQiLCJzdWJzY3JpYmUiLCJ1cGxvYWRJZCIsImNhbGxiYWNrcyIsImNvbnNvbGUiLCJlcnJvciIsInVuc3Vic2NyaWJlIiwic2V0IiwiaGFuZGxlciIsIm1lc3NhZ2UiLCJoYW5kbGVFdmVudCIsImVuc3VyZUV2ZW50QnVzU3Vic2NyaXB0aW9uIiwiRXZlbnRCdXMiLCJoYW5kbGVFdmVudEJ1c01lc3NhZ2UiLCJldmVudCIsImRhdGEiLCJldmVudFR5cGUiLCJldmVudERhdGEiLCJldmVudE1lc3NhZ2UiLCJ0eXBlIiwic3Vic2NyaXB0aW9uIiwiZ2V0Iiwib25VcGxvYWRTdGFydGVkIiwib25DaHVua1VwbG9hZGVkIiwib25NZXJnZVN0YXJ0ZWQiLCJvbk1lcmdlUHJvZ3Jlc3MiLCJvbk1lcmdlQ29tcGxldGUiLCJvbkVycm9yIiwic2l6ZSIsInVuc3Vic2NyaWJlQWxsIiwidXBsb2FkSWRzIiwiQXJyYXkiLCJmcm9tIiwia2V5cyIsImZvckVhY2giLCJnZXRBY3RpdmVVcGxvYWRzIiwiaXNTdWJzY3JpYmVkIiwiaGFzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHNCQUFzQixHQUFHO0FBQzNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxJQUFJQyxHQUFKLEVBTFk7O0FBTzNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFLEtBWE87O0FBYTNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBMUIyQixxQkEwQmpCQyxRQTFCaUIs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LENBQVcsS0FBS2xDLGFBQUwsQ0FBbUJtQyxJQUFuQixFQUFYLENBQWxCO0FBQ0FILElBQUFBLFNBQVMsQ0FBQ0ksT0FBVixDQUFrQixVQUFBaEMsUUFBUSxFQUFJO0FBQzFCLE1BQUEsTUFBSSxDQUFDSSxXQUFMLENBQWlCSixRQUFqQjtBQUNILEtBRkQ7QUFHSCxHQWhNMEI7O0FBa00zQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lpQyxFQUFBQSxnQkF2TTJCLDhCQXVNUjtBQUNmLFdBQU9KLEtBQUssQ0FBQ0MsSUFBTixDQUFXLEtBQUtsQyxhQUFMLENBQW1CbUMsSUFBbkIsRUFBWCxDQUFQO0FBQ0gsR0F6TTBCOztBQTJNM0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFlBak4yQix3QkFpTmRsQyxRQWpOYyxFQWlOSjtBQUNuQixXQUFPLEtBQUtKLGFBQUwsQ0FBbUJ1QyxHQUFuQixDQUF1Qm5DLFFBQXZCLENBQVA7QUFDSDtBQW5OMEIsQ0FBL0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgRXZlbnRCdXMsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFVuaXZlcnNhbCBmaWxlIHVwbG9hZCBldmVudCBoYW5kbGVyIHVzaW5nIEV2ZW50QnVzXG4gKiBQcm92aWRlcyByZWFsLXRpbWUgc3RhdHVzIHVwZGF0ZXMgZm9yIGFsbCBmaWxlIHVwbG9hZCBvcGVyYXRpb25zXG4gKlxuICogQG1vZHVsZSBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyXG4gKi9cbmNvbnN0IEZpbGVVcGxvYWRFdmVudEhhbmRsZXIgPSB7XG4gICAgLyoqXG4gICAgICogQWN0aXZlIHN1YnNjcmlwdGlvbnMgbWFwXG4gICAgICogQHR5cGUge01hcDxzdHJpbmcsIG9iamVjdD59XG4gICAgICovXG4gICAgc3Vic2NyaXB0aW9uczogbmV3IE1hcCgpLFxuXG4gICAgLyoqXG4gICAgICogRXZlbnRCdXMgc3Vic2NyaXB0aW9uIHN0YXR1c1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGV2ZW50QnVzU3Vic2NyaWJlZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gdXBsb2FkIGV2ZW50cyBmb3IgYSBzcGVjaWZpYyB1cGxvYWQgSURcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1cGxvYWRJZCAtIFVuaXF1ZSB1cGxvYWQgaWRlbnRpZmllclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjYWxsYmFja3MgLSBFdmVudCBjYWxsYmFjayBoYW5kbGVyc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrcy5vblVwbG9hZFN0YXJ0ZWQgLSBDYWxsZWQgd2hlbiB1cGxvYWQgc3RhcnRzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tzLm9uQ2h1bmtVcGxvYWRlZCAtIENhbGxlZCB3aGVuIGEgY2h1bmsgaXMgdXBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja3Mub25NZXJnZVN0YXJ0ZWQgLSBDYWxsZWQgd2hlbiBtZXJnZSBzdGFydHNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja3Mub25NZXJnZVByb2dyZXNzIC0gQ2FsbGVkIG9uIG1lcmdlIHByb2dyZXNzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tzLm9uTWVyZ2VDb21wbGV0ZSAtIENhbGxlZCB3aGVuIG1lcmdlIGNvbXBsZXRlc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrcy5vbkVycm9yIC0gQ2FsbGVkIG9uIGVycm9yXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgc3Vic2NyaWJlKHVwbG9hZElkLCBjYWxsYmFja3MpIHtcbiAgICAgICAgaWYgKCF1cGxvYWRJZCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmlsZVVwbG9hZEV2ZW50SGFuZGxlcjogdXBsb2FkSWQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVuc3Vic2NyaWJlIGZyb20gcHJldmlvdXMgc3Vic2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKHVwbG9hZElkKTtcblxuICAgICAgICAvLyBTdG9yZSBzdWJzY3JpcHRpb24gaW5mb1xuICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbnMuc2V0KHVwbG9hZElkLCB7XG4gICAgICAgICAgICB1cGxvYWRJZCxcbiAgICAgICAgICAgIGNhbGxiYWNrcyxcbiAgICAgICAgICAgIGhhbmRsZXI6IChtZXNzYWdlKSA9PiB0aGlzLmhhbmRsZUV2ZW50KHVwbG9hZElkLCBtZXNzYWdlKVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gbWFpbiBldmVudC1idXMgY2hhbm5lbCBpZiBub3QgYWxyZWFkeSBzdWJzY3JpYmVkXG4gICAgICAgIHRoaXMuZW5zdXJlRXZlbnRCdXNTdWJzY3JpcHRpb24oKTtcblxuICAgICAgICAvLyBTdWJzY3JpYmVkIHRvIGZpbGUgdXBsb2FkIGV2ZW50c1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFbnN1cmUgc3Vic2NyaXB0aW9uIHRvIGZpbGUtdXBsb2FkIGV2ZW50c1xuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZW5zdXJlRXZlbnRCdXNTdWJzY3JpcHRpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy5ldmVudEJ1c1N1YnNjcmliZWQpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnZmlsZS11cGxvYWQnLCAobWVzc2FnZSkgPT4gdGhpcy5oYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkpO1xuICAgICAgICAgICAgdGhpcy5ldmVudEJ1c1N1YnNjcmliZWQgPSB0cnVlO1xuICAgICAgICAgICAgLy8gU3Vic2NyaWJlZCB0byBmaWxlLXVwbG9hZCBldmVudHMgdmlhIEV2ZW50QnVzXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGluY29taW5nIG1lc3NhZ2UgZnJvbSBmaWxlLXVwbG9hZCBldmVudHNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXNzYWdlIC0gRXZlbnQgbWVzc2FnZSBmcm9tIEV2ZW50QnVzXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBoYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICAvLyBSZWNlaXZlZCBmaWxlLXVwbG9hZCBldmVudFxuXG4gICAgICAgIC8vIE1lc3NhZ2Ugc3RydWN0dXJlOiB7IGV2ZW50OiAnZXZlbnQtbmFtZScsIGRhdGE6IHsuLi59IH1cbiAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5ldmVudCAmJiBtZXNzYWdlLmRhdGEpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgZXZlbnQ6IGV2ZW50VHlwZSwgZGF0YTogZXZlbnREYXRhIH0gPSBtZXNzYWdlO1xuXG4gICAgICAgICAgICAvLyBQcm9jZXNzaW5nIGZpbGUtdXBsb2FkIGV2ZW50XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIG9yaWdpbmFsIGhhbmRsZUV2ZW50IG1ldGhvZCB3aXRoIHRoZSBldmVudCBzdHJ1Y3R1cmVcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50TWVzc2FnZSA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBldmVudFR5cGUsXG4gICAgICAgICAgICAgICAgLi4uZXZlbnREYXRhXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBGaW5kIHN1YnNjcmlwdGlvbiBmb3IgdGhpcyB1cGxvYWRJZFxuICAgICAgICAgICAgaWYgKGV2ZW50RGF0YS51cGxvYWRJZCkge1xuICAgICAgICAgICAgICAgIC8vIFJvdXRpbmcgZXZlbnQgdG8gdXBsb2FkSWRcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50KGV2ZW50RGF0YS51cGxvYWRJZCwgZXZlbnRNZXNzYWdlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm8gdXBsb2FkSWQgaW4gZXZlbnQgZGF0YVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSW52YWxpZCBldmVudCBzdHJ1Y3R1cmVcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW5jb21pbmcgZXZlbnQgZnJvbSBFdmVudEJ1c1xuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVwbG9hZElkIC0gVXBsb2FkIGlkZW50aWZpZXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbWVzc2FnZSAtIEV2ZW50IG1lc3NhZ2VcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50KHVwbG9hZElkLCBtZXNzYWdlKSB7XG4gICAgICAgIC8vIGhhbmRsZUV2ZW50IGNhbGxlZCBmb3IgdXBsb2FkSWRcblxuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSB0aGlzLnN1YnNjcmlwdGlvbnMuZ2V0KHVwbG9hZElkKTtcbiAgICAgICAgaWYgKCFzdWJzY3JpcHRpb24gfHwgIXN1YnNjcmlwdGlvbi5jYWxsYmFja3MpIHtcbiAgICAgICAgICAgIC8vIE5vIHN1YnNjcmlwdGlvbiBmb3VuZCBmb3IgdXBsb2FkSWRcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZvdW5kIHN1YnNjcmlwdGlvbiwgcHJvY2Vzc2luZyBldmVudFxuICAgICAgICBjb25zdCB7IGNhbGxiYWNrcyB9ID0gc3Vic2NyaXB0aW9uO1xuXG4gICAgICAgIHN3aXRjaCAobWVzc2FnZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWQtc3RhcnRlZCc6XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrcy5vblVwbG9hZFN0YXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzLm9uVXBsb2FkU3RhcnRlZChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ2NodW5rLXVwbG9hZGVkJzpcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2tzLm9uQ2h1bmtVcGxvYWRlZCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3Mub25DaHVua1VwbG9hZGVkKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnbWVyZ2Utc3RhcnRlZCc6XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrcy5vbk1lcmdlU3RhcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3Mub25NZXJnZVN0YXJ0ZWQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdtZXJnZS1wcm9ncmVzcyc6XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrcy5vbk1lcmdlUHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzLm9uTWVyZ2VQcm9ncmVzcyhtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ21lcmdlLWNvbXBsZXRlJzpcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2tzLm9uTWVyZ2VDb21wbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3Mub25NZXJnZUNvbXBsZXRlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXVuc3Vic2NyaWJlIG9uIGNvbXBsZXRpb25cbiAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKHVwbG9hZElkKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAndXBsb2FkLWVycm9yJzpcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2tzLm9uRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzLm9uRXJyb3IobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEF1dG8tdW5zdWJzY3JpYmUgb24gZXJyb3JcbiAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKHVwbG9hZElkKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBVbmtub3duIGZpbGUgdXBsb2FkIGV2ZW50IHR5cGVcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVbnN1YnNjcmliZSBmcm9tIHVwbG9hZCBldmVudHNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1cGxvYWRJZCAtIFVwbG9hZCBpZGVudGlmaWVyXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgdW5zdWJzY3JpYmUodXBsb2FkSWQpIHtcbiAgICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gdGhpcy5zdWJzY3JpcHRpb25zLmdldCh1cGxvYWRJZCk7XG4gICAgICAgIGlmICghc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW1vdmUgZnJvbSBzdWJzY3JpcHRpb25zIG1hcFxuICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbnMuZGVsZXRlKHVwbG9hZElkKTtcblxuICAgICAgICAvLyBVbnN1YnNjcmliZWQgZnJvbSBmaWxlIHVwbG9hZCBldmVudHNcblxuICAgICAgICAvLyBJZiBubyBtb3JlIHN1YnNjcmlwdGlvbnMsIHVuc3Vic2NyaWJlIGZyb20gbWFpbiBldmVudC1idXNcbiAgICAgICAgaWYgKHRoaXMuc3Vic2NyaXB0aW9ucy5zaXplID09PSAwICYmIHRoaXMuZXZlbnRCdXNTdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICAvLyBOb3RlOiBXZSBkb24ndCBhY3R1YWxseSB1bnN1YnNjcmliZSBmcm9tIGV2ZW50LWJ1cyBzaW5jZSBvdGhlciBwYXJ0c1xuICAgICAgICAgICAgLy8gb2YgdGhlIHN5c3RlbSBtYXkgYmUgdXNpbmcgaXQuIEV2ZW50QnVzIGhhbmRsZXMgbXVsdGlwbGUgaGFuZGxlcnMuXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVW5zdWJzY3JpYmUgZnJvbSBhbGwgYWN0aXZlIHVwbG9hZCBjaGFubmVsc1xuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgdW5zdWJzY3JpYmVBbGwoKSB7XG4gICAgICAgIGNvbnN0IHVwbG9hZElkcyA9IEFycmF5LmZyb20odGhpcy5zdWJzY3JpcHRpb25zLmtleXMoKSk7XG4gICAgICAgIHVwbG9hZElkcy5mb3JFYWNoKHVwbG9hZElkID0+IHtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUodXBsb2FkSWQpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBhY3RpdmUgdXBsb2FkIElEc1xuICAgICAqXG4gICAgICogQHJldHVybnMge3N0cmluZ1tdfSBBcnJheSBvZiBhY3RpdmUgdXBsb2FkIElEc1xuICAgICAqL1xuICAgIGdldEFjdGl2ZVVwbG9hZHMoKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuc3Vic2NyaXB0aW9ucy5rZXlzKCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBzdWJzY3JpYmVkIHRvIHNwZWNpZmljIHVwbG9hZFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVwbG9hZElkIC0gVXBsb2FkIGlkZW50aWZpZXJcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBzdWJzY3JpYmVkXG4gICAgICovXG4gICAgaXNTdWJzY3JpYmVkKHVwbG9hZElkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN1YnNjcmlwdGlvbnMuaGFzKHVwbG9hZElkKTtcbiAgICB9XG59OyJdfQ==