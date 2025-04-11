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
    eventSource: null,

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
        const lastEventIdKey = `${EventBus.channelId}-lastEventId`;
        let lastEventId = localStorage.getItem(lastEventIdKey);
        let subPath = `/pbxcore/api/nchan/sub/${EventBus.channelId}`;
        subPath += lastEventId ? `?last_event_id=${lastEventId}` : '';
        EventBus.eventSource = new EventSource(subPath);

        EventBus.eventSource.addEventListener('message', e => {
            const message = JSON.parse(e.data);
            console.debug(message);
            EventBus.publish(message.type, message.data);
            localStorage.setItem(lastEventIdKey, e.lastEventId);
        });

        EventBus.eventSource.addEventListener('error', e => {
            EventBus.publish('connection-status', false);
        });

        EventBus.eventSource.addEventListener('open', e => {
            EventBus.publish('connection-status', true);
        });
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
    if (!globalDebugMode) {
        EventBus.initialize();
    }
});