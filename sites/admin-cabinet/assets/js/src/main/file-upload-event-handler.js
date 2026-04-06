/* global EventBus, globalTranslate */

/**
 * Universal file upload event handler using EventBus
 * Provides real-time status updates for all file upload operations
 *
 * @module FileUploadEventHandler
 */
const FileUploadEventHandler = {
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
    subscribe(uploadId, callbacks) {
        if (!uploadId) {
            console.error('FileUploadEventHandler: uploadId is required');
            return;
        }

        // Unsubscribe from previous subscription if exists
        this.unsubscribe(uploadId);

        // Store subscription info
        this.subscriptions.set(uploadId, {
            uploadId,
            callbacks,
            handler: (message) => this.handleEvent(uploadId, message)
        });

        // Subscribe to main event-bus channel if not already subscribed
        this.ensureEventBusSubscription();

        // Subscribed to file upload events
    },

    /**
     * Ensure subscription to file-upload events
     * @private
     */
    ensureEventBusSubscription() {
        if (!this.eventBusSubscribed) {
            EventBus.subscribe('file-upload', (message) => this.handleEventBusMessage(message));
            this.eventBusSubscribed = true;
            // Subscribed to file-upload events via EventBus
        }
    },

    /**
     * Handle incoming message from file-upload events
     *
     * @param {object} message - Event message from EventBus
     * @private
     */
    handleEventBusMessage(message) {
        // Received file-upload event

        // Message structure: { event: 'event-name', data: {...} }
        if (message && message.event && message.data) {
            const { event: eventType, data: eventData } = message;

            // Processing file-upload event

            // Call the original handleEvent method with the event structure
            const eventMessage = {
                type: eventType,
                ...eventData
            };

            // Find subscription for this uploadId
            if (eventData.uploadId) {
                // Routing event to uploadId
                this.handleEvent(eventData.uploadId, eventMessage);
            } else {
                // No uploadId in event data
            }
        } else {
            // Invalid event structure
        }
    },

    /**
     * Handle incoming event from EventBus
     *
     * @param {string} uploadId - Upload identifier
     * @param {object} message - Event message
     * @private
     */
    handleEvent(uploadId, message) {
        // handleEvent called for uploadId

        const subscription = this.subscriptions.get(uploadId);
        if (!subscription || !subscription.callbacks) {
            // No subscription found for uploadId
            return;
        }

        // Found subscription, processing event
        const { callbacks } = subscription;

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
                }
                // Auto-unsubscribe on completion
                this.unsubscribe(uploadId);
                break;

            case 'upload-error':
                if (callbacks.onError) {
                    callbacks.onError(message);
                }
                // Auto-unsubscribe on error
                this.unsubscribe(uploadId);
                break;

            default:
                // Unknown file upload event type
        }
    },

    /**
     * Unsubscribe from upload events
     *
     * @param {string} uploadId - Upload identifier
     * @returns {void}
     */
    unsubscribe(uploadId) {
        const subscription = this.subscriptions.get(uploadId);
        if (!subscription) {
            return;
        }

        // Remove from subscriptions map
        this.subscriptions.delete(uploadId);

        // Unsubscribed from file upload events

        // If no more subscriptions, unsubscribe from main event-bus
        if (this.subscriptions.size === 0 && this.eventBusSubscribed) {
            // Note: We don't actually unsubscribe from event-bus since other parts
            // of the system may be using it. EventBus handles multiple handlers.
        }
    },

    /**
     * Unsubscribe from all active upload channels
     *
     * @returns {void}
     */
    unsubscribeAll() {
        const uploadIds = Array.from(this.subscriptions.keys());
        uploadIds.forEach(uploadId => {
            this.unsubscribe(uploadId);
        });
    },

    /**
     * Get all active upload IDs
     *
     * @returns {string[]} Array of active upload IDs
     */
    getActiveUploads() {
        return Array.from(this.subscriptions.keys());
    },

    /**
     * Check if subscribed to specific upload
     *
     * @param {string} uploadId - Upload identifier
     * @returns {boolean} True if subscribed
     */
    isSubscribed(uploadId) {
        return this.subscriptions.has(uploadId);
    }
};