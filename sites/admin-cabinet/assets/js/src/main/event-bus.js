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
const EventBus = {
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
    initialize() {
        EventBus.startListenPushNotifications();
    },

    /**
     * Establishes a connection to the server to start receiving real-time updates on events.
     * Utilizes the EventSource API to listen for messages on a specified channel.
     */
    startListenPushNotifications() {
        let subPath = `/pbxcore/api/nchan/sub/${EventBus.channelId}`;
    
        // Close existing connection if any
        if (EventBus.socket) {
            EventBus.socket.close();
        }
    
        // Create a WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}${subPath}?msg_id=-1`;
        EventBus.socket = new WebSocket(wsUrl);
    
        // Handle messages
        EventBus.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            EventBus.publish(message.type, message.data);
            // Reset error counter on successful message
            EventBus.forbidden403Count = 0;
        };
    
        // Handle errors
        EventBus.socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
            EventBus.publish('connection-status', false);
        };
    
        // Handle connection break
        EventBus.socket.onclose = (event) => {
            EventBus.publish('connection-status', false);
            
            // Check if this was a 403 Forbidden error
            if (event.code === 1006 || event.code === 1008) {
                // Increment error counter
                EventBus.forbidden403Count++;
                console.warn(`WebSocket authentication error: ${EventBus.forbidden403Count} consecutive 403 errors`);
                
                // If we've had 3 consecutive 403 errors, reload the page
                if (EventBus.forbidden403Count >= 3) {
                    console.warn('Three consecutive 403 errors detected. Reloading page due to possible authentication loss.');
                    window.location.reload();
                    return;
                }
            } else {
                // Reset counter for other types of errors
                EventBus.forbidden403Count = 0;
            }
            
            // Schedule reconnection in 2 seconds
            setTimeout(() => {
                EventBus.startListenPushNotifications();
            }, 2000);
        };
    
        // Handle connection open
        EventBus.socket.onopen = () => {
            EventBus.publish('connection-status', true);
            // Reset error counter on successful connection
            EventBus.forbidden403Count = 0;
        };
    },

    /**
     * Subscribes to an event.
     * @param {string} event - The event to subscribe to.
     * @param {Function} callback - The callback function to be called when the event occurs.
     */
    subscribe(event, callback) {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(callback);
    },

    /**
     * Publishes an event.
     * @param {string} event - The event to publish.
     * @param {Object} data - The data to be published.
     */
    publish(event, data) {
        if (!this.subscribers[event]) return;
        this.subscribers[event].forEach(callback => callback(data));
    },
};


// When the document is ready, initialize the event bus
$(document).ready(() => {
    EventBus.initialize();
});