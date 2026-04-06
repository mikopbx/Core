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

    this.ensureEventBusSubscription();
    console.log("FileUploadEventHandler: Subscribed to file upload events for upload: ".concat(uploadId, ". Total subscriptions:"), this.subscriptions.size);
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
      this.eventBusSubscribed = true;
      console.log('Subscribed to file-upload events via EventBus');
    }
  },

  /**
   * Handle incoming message from file-upload events
   *
   * @param {object} message - Event message from EventBus
   * @private
   */
  handleEventBusMessage: function handleEventBusMessage(message) {
    console.log('FileUploadEventHandler: Received file-upload event:', message); // Message structure: { event: 'event-name', data: {...} }

    if (message && message.event && message.data) {
      var eventType = message.event,
          eventData = message.data;
      console.log("FileUploadEventHandler: Processing file-upload event: ".concat(eventType), eventData); // Call the original handleEvent method with the event structure

      var eventMessage = _objectSpread({
        type: eventType
      }, eventData); // Find subscription for this uploadId


      if (eventData.uploadId) {
        console.log("FileUploadEventHandler: Routing event to uploadId: ".concat(eventData.uploadId));
        this.handleEvent(eventData.uploadId, eventMessage);
      } else {
        console.warn('FileUploadEventHandler: No uploadId in event data:', eventData);
      }
    } else {
      console.warn('FileUploadEventHandler: Invalid event structure:', message);
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
    console.log("FileUploadEventHandler: handleEvent called for uploadId: ".concat(uploadId), message);
    var subscription = this.subscriptions.get(uploadId);

    if (!subscription || !subscription.callbacks) {
      console.warn("FileUploadEventHandler: No subscription found for uploadId: ".concat(uploadId, ". Active subscriptions:"), Array.from(this.subscriptions.keys()));
      return;
    }

    console.log("FileUploadEventHandler: Found subscription for ".concat(uploadId, ", processing event: ").concat(message.type));
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

      default:
        console.warn("Unknown file upload event type: ".concat(message.type));
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


    this.subscriptions["delete"](uploadId);
    console.log("Unsubscribed from file upload events for upload: ".concat(uploadId)); // If no more subscriptions, unsubscribe from main event-bus

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2ZpbGUtdXBsb2FkLWV2ZW50LWhhbmRsZXIuanMiXSwibmFtZXMiOlsiRmlsZVVwbG9hZEV2ZW50SGFuZGxlciIsInN1YnNjcmlwdGlvbnMiLCJNYXAiLCJldmVudEJ1c1N1YnNjcmliZWQiLCJzdWJzY3JpYmUiLCJ1cGxvYWRJZCIsImNhbGxiYWNrcyIsImNvbnNvbGUiLCJlcnJvciIsInVuc3Vic2NyaWJlIiwic2V0IiwiaGFuZGxlciIsIm1lc3NhZ2UiLCJoYW5kbGVFdmVudCIsImVuc3VyZUV2ZW50QnVzU3Vic2NyaXB0aW9uIiwibG9nIiwic2l6ZSIsIkV2ZW50QnVzIiwiaGFuZGxlRXZlbnRCdXNNZXNzYWdlIiwiZXZlbnQiLCJkYXRhIiwiZXZlbnRUeXBlIiwiZXZlbnREYXRhIiwiZXZlbnRNZXNzYWdlIiwidHlwZSIsIndhcm4iLCJzdWJzY3JpcHRpb24iLCJnZXQiLCJBcnJheSIsImZyb20iLCJrZXlzIiwib25VcGxvYWRTdGFydGVkIiwib25DaHVua1VwbG9hZGVkIiwib25NZXJnZVN0YXJ0ZWQiLCJvbk1lcmdlUHJvZ3Jlc3MiLCJvbk1lcmdlQ29tcGxldGUiLCJvbkVycm9yIiwidW5zdWJzY3JpYmVBbGwiLCJ1cGxvYWRJZHMiLCJmb3JFYWNoIiwiZ2V0QWN0aXZlVXBsb2FkcyIsImlzU3Vic2NyaWJlZCIsImhhcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxzQkFBc0IsR0FBRztBQUMzQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsSUFBSUMsR0FBSixFQUxZOztBQU8zQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRSxLQVhPOztBQWEzQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQTFCMkIscUJB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QUFtQjZCLElBQW5CLEVBQVgsQ0FBUDtBQUNILEdBek0wQjs7QUEyTTNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJVyxFQUFBQSxZQWpOMkIsd0JBaU5kcEMsUUFqTmMsRUFpTko7QUFDbkIsV0FBTyxLQUFLSixhQUFMLENBQW1CeUMsR0FBbkIsQ0FBdUJyQyxRQUF2QixDQUFQO0FBQ0g7QUFuTjBCLENBQS9CIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFsIEV2ZW50QnVzLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBVbml2ZXJzYWwgZmlsZSB1cGxvYWQgZXZlbnQgaGFuZGxlciB1c2luZyBFdmVudEJ1c1xuICogUHJvdmlkZXMgcmVhbC10aW1lIHN0YXR1cyB1cGRhdGVzIGZvciBhbGwgZmlsZSB1cGxvYWQgb3BlcmF0aW9uc1xuICpcbiAqIEBtb2R1bGUgRmlsZVVwbG9hZEV2ZW50SGFuZGxlclxuICovXG5jb25zdCBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyID0ge1xuICAgIC8qKlxuICAgICAqIEFjdGl2ZSBzdWJzY3JpcHRpb25zIG1hcFxuICAgICAqIEB0eXBlIHtNYXA8c3RyaW5nLCBvYmplY3Q+fVxuICAgICAqL1xuICAgIHN1YnNjcmlwdGlvbnM6IG5ldyBNYXAoKSxcblxuICAgIC8qKlxuICAgICAqIEV2ZW50QnVzIHN1YnNjcmlwdGlvbiBzdGF0dXNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBldmVudEJ1c1N1YnNjcmliZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIHVwbG9hZCBldmVudHMgZm9yIGEgc3BlY2lmaWMgdXBsb2FkIElEXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXBsb2FkSWQgLSBVbmlxdWUgdXBsb2FkIGlkZW50aWZpZXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY2FsbGJhY2tzIC0gRXZlbnQgY2FsbGJhY2sgaGFuZGxlcnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja3Mub25VcGxvYWRTdGFydGVkIC0gQ2FsbGVkIHdoZW4gdXBsb2FkIHN0YXJ0c1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrcy5vbkNodW5rVXBsb2FkZWQgLSBDYWxsZWQgd2hlbiBhIGNodW5rIGlzIHVwbG9hZGVkXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tzLm9uTWVyZ2VTdGFydGVkIC0gQ2FsbGVkIHdoZW4gbWVyZ2Ugc3RhcnRzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tzLm9uTWVyZ2VQcm9ncmVzcyAtIENhbGxlZCBvbiBtZXJnZSBwcm9ncmVzc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrcy5vbk1lcmdlQ29tcGxldGUgLSBDYWxsZWQgd2hlbiBtZXJnZSBjb21wbGV0ZXNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja3Mub25FcnJvciAtIENhbGxlZCBvbiBlcnJvclxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIHN1YnNjcmliZSh1cGxvYWRJZCwgY2FsbGJhY2tzKSB7XG4gICAgICAgIGlmICghdXBsb2FkSWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZpbGVVcGxvYWRFdmVudEhhbmRsZXI6IHVwbG9hZElkIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVbnN1YnNjcmliZSBmcm9tIHByZXZpb3VzIHN1YnNjcmlwdGlvbiBpZiBleGlzdHNcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZSh1cGxvYWRJZCk7XG5cbiAgICAgICAgLy8gU3RvcmUgc3Vic2NyaXB0aW9uIGluZm9cbiAgICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLnNldCh1cGxvYWRJZCwge1xuICAgICAgICAgICAgdXBsb2FkSWQsXG4gICAgICAgICAgICBjYWxsYmFja3MsXG4gICAgICAgICAgICBoYW5kbGVyOiAobWVzc2FnZSkgPT4gdGhpcy5oYW5kbGVFdmVudCh1cGxvYWRJZCwgbWVzc2FnZSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIG1haW4gZXZlbnQtYnVzIGNoYW5uZWwgaWYgbm90IGFscmVhZHkgc3Vic2NyaWJlZFxuICAgICAgICB0aGlzLmVuc3VyZUV2ZW50QnVzU3Vic2NyaXB0aW9uKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coYEZpbGVVcGxvYWRFdmVudEhhbmRsZXI6IFN1YnNjcmliZWQgdG8gZmlsZSB1cGxvYWQgZXZlbnRzIGZvciB1cGxvYWQ6ICR7dXBsb2FkSWR9LiBUb3RhbCBzdWJzY3JpcHRpb25zOmAsIHRoaXMuc3Vic2NyaXB0aW9ucy5zaXplKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRW5zdXJlIHN1YnNjcmlwdGlvbiB0byBmaWxlLXVwbG9hZCBldmVudHNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGVuc3VyZUV2ZW50QnVzU3Vic2NyaXB0aW9uKCkge1xuICAgICAgICBpZiAoIXRoaXMuZXZlbnRCdXNTdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ2ZpbGUtdXBsb2FkJywgKG1lc3NhZ2UpID0+IHRoaXMuaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpKTtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRCdXNTdWJzY3JpYmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdWJzY3JpYmVkIHRvIGZpbGUtdXBsb2FkIGV2ZW50cyB2aWEgRXZlbnRCdXMnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW5jb21pbmcgbWVzc2FnZSBmcm9tIGZpbGUtdXBsb2FkIGV2ZW50c1xuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG1lc3NhZ2UgLSBFdmVudCBtZXNzYWdlIGZyb20gRXZlbnRCdXNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdGaWxlVXBsb2FkRXZlbnRIYW5kbGVyOiBSZWNlaXZlZCBmaWxlLXVwbG9hZCBldmVudDonLCBtZXNzYWdlKTtcblxuICAgICAgICAvLyBNZXNzYWdlIHN0cnVjdHVyZTogeyBldmVudDogJ2V2ZW50LW5hbWUnLCBkYXRhOiB7Li4ufSB9XG4gICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuZXZlbnQgJiYgbWVzc2FnZS5kYXRhKSB7XG4gICAgICAgICAgICBjb25zdCB7IGV2ZW50OiBldmVudFR5cGUsIGRhdGE6IGV2ZW50RGF0YSB9ID0gbWVzc2FnZTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coYEZpbGVVcGxvYWRFdmVudEhhbmRsZXI6IFByb2Nlc3NpbmcgZmlsZS11cGxvYWQgZXZlbnQ6ICR7ZXZlbnRUeXBlfWAsIGV2ZW50RGF0YSk7XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIG9yaWdpbmFsIGhhbmRsZUV2ZW50IG1ldGhvZCB3aXRoIHRoZSBldmVudCBzdHJ1Y3R1cmVcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50TWVzc2FnZSA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBldmVudFR5cGUsXG4gICAgICAgICAgICAgICAgLi4uZXZlbnREYXRhXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBGaW5kIHN1YnNjcmlwdGlvbiBmb3IgdGhpcyB1cGxvYWRJZFxuICAgICAgICAgICAgaWYgKGV2ZW50RGF0YS51cGxvYWRJZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyOiBSb3V0aW5nIGV2ZW50IHRvIHVwbG9hZElkOiAke2V2ZW50RGF0YS51cGxvYWRJZH1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50KGV2ZW50RGF0YS51cGxvYWRJZCwgZXZlbnRNZXNzYWdlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdGaWxlVXBsb2FkRXZlbnRIYW5kbGVyOiBObyB1cGxvYWRJZCBpbiBldmVudCBkYXRhOicsIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZpbGVVcGxvYWRFdmVudEhhbmRsZXI6IEludmFsaWQgZXZlbnQgc3RydWN0dXJlOicsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbmNvbWluZyBldmVudCBmcm9tIEV2ZW50QnVzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXBsb2FkSWQgLSBVcGxvYWQgaWRlbnRpZmllclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXNzYWdlIC0gRXZlbnQgbWVzc2FnZVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgaGFuZGxlRXZlbnQodXBsb2FkSWQsIG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coYEZpbGVVcGxvYWRFdmVudEhhbmRsZXI6IGhhbmRsZUV2ZW50IGNhbGxlZCBmb3IgdXBsb2FkSWQ6ICR7dXBsb2FkSWR9YCwgbWVzc2FnZSk7XG5cbiAgICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gdGhpcy5zdWJzY3JpcHRpb25zLmdldCh1cGxvYWRJZCk7XG4gICAgICAgIGlmICghc3Vic2NyaXB0aW9uIHx8ICFzdWJzY3JpcHRpb24uY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEZpbGVVcGxvYWRFdmVudEhhbmRsZXI6IE5vIHN1YnNjcmlwdGlvbiBmb3VuZCBmb3IgdXBsb2FkSWQ6ICR7dXBsb2FkSWR9LiBBY3RpdmUgc3Vic2NyaXB0aW9uczpgLCBBcnJheS5mcm9tKHRoaXMuc3Vic2NyaXB0aW9ucy5rZXlzKCkpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKGBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyOiBGb3VuZCBzdWJzY3JpcHRpb24gZm9yICR7dXBsb2FkSWR9LCBwcm9jZXNzaW5nIGV2ZW50OiAke21lc3NhZ2UudHlwZX1gKTtcbiAgICAgICAgY29uc3QgeyBjYWxsYmFja3MgfSA9IHN1YnNjcmlwdGlvbjtcblxuICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAndXBsb2FkLXN0YXJ0ZWQnOlxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFja3Mub25VcGxvYWRTdGFydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrcy5vblVwbG9hZFN0YXJ0ZWQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdjaHVuay11cGxvYWRlZCc6XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrcy5vbkNodW5rVXBsb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzLm9uQ2h1bmtVcGxvYWRlZChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ21lcmdlLXN0YXJ0ZWQnOlxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFja3Mub25NZXJnZVN0YXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzLm9uTWVyZ2VTdGFydGVkKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnbWVyZ2UtcHJvZ3Jlc3MnOlxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFja3Mub25NZXJnZVByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrcy5vbk1lcmdlUHJvZ3Jlc3MobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdtZXJnZS1jb21wbGV0ZSc6XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrcy5vbk1lcmdlQ29tcGxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzLm9uTWVyZ2VDb21wbGV0ZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gQXV0by11bnN1YnNjcmliZSBvbiBjb21wbGV0aW9uXG4gICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSh1cGxvYWRJZCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ3VwbG9hZC1lcnJvcic6XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrcy5vbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrcy5vbkVycm9yKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXVuc3Vic2NyaWJlIG9uIGVycm9yXG4gICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSh1cGxvYWRJZCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBVbmtub3duIGZpbGUgdXBsb2FkIGV2ZW50IHR5cGU6ICR7bWVzc2FnZS50eXBlfWApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVuc3Vic2NyaWJlIGZyb20gdXBsb2FkIGV2ZW50c1xuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVwbG9hZElkIC0gVXBsb2FkIGlkZW50aWZpZXJcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICB1bnN1YnNjcmliZSh1cGxvYWRJZCkge1xuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSB0aGlzLnN1YnNjcmlwdGlvbnMuZ2V0KHVwbG9hZElkKTtcbiAgICAgICAgaWYgKCFzdWJzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbW92ZSBmcm9tIHN1YnNjcmlwdGlvbnMgbWFwXG4gICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5kZWxldGUodXBsb2FkSWQpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGBVbnN1YnNjcmliZWQgZnJvbSBmaWxlIHVwbG9hZCBldmVudHMgZm9yIHVwbG9hZDogJHt1cGxvYWRJZH1gKTtcblxuICAgICAgICAvLyBJZiBubyBtb3JlIHN1YnNjcmlwdGlvbnMsIHVuc3Vic2NyaWJlIGZyb20gbWFpbiBldmVudC1idXNcbiAgICAgICAgaWYgKHRoaXMuc3Vic2NyaXB0aW9ucy5zaXplID09PSAwICYmIHRoaXMuZXZlbnRCdXNTdWJzY3JpYmVkKSB7XG4gICAgICAgICAgICAvLyBOb3RlOiBXZSBkb24ndCBhY3R1YWxseSB1bnN1YnNjcmliZSBmcm9tIGV2ZW50LWJ1cyBzaW5jZSBvdGhlciBwYXJ0c1xuICAgICAgICAgICAgLy8gb2YgdGhlIHN5c3RlbSBtYXkgYmUgdXNpbmcgaXQuIEV2ZW50QnVzIGhhbmRsZXMgbXVsdGlwbGUgaGFuZGxlcnMuXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVW5zdWJzY3JpYmUgZnJvbSBhbGwgYWN0aXZlIHVwbG9hZCBjaGFubmVsc1xuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgdW5zdWJzY3JpYmVBbGwoKSB7XG4gICAgICAgIGNvbnN0IHVwbG9hZElkcyA9IEFycmF5LmZyb20odGhpcy5zdWJzY3JpcHRpb25zLmtleXMoKSk7XG4gICAgICAgIHVwbG9hZElkcy5mb3JFYWNoKHVwbG9hZElkID0+IHtcbiAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUodXBsb2FkSWQpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBhY3RpdmUgdXBsb2FkIElEc1xuICAgICAqXG4gICAgICogQHJldHVybnMge3N0cmluZ1tdfSBBcnJheSBvZiBhY3RpdmUgdXBsb2FkIElEc1xuICAgICAqL1xuICAgIGdldEFjdGl2ZVVwbG9hZHMoKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuc3Vic2NyaXB0aW9ucy5rZXlzKCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBzdWJzY3JpYmVkIHRvIHNwZWNpZmljIHVwbG9hZFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVwbG9hZElkIC0gVXBsb2FkIGlkZW50aWZpZXJcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBzdWJzY3JpYmVkXG4gICAgICovXG4gICAgaXNTdWJzY3JpYmVkKHVwbG9hZElkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN1YnNjcmlwdGlvbnMuaGFzKHVwbG9hZElkKTtcbiAgICB9XG59OyJdfQ==