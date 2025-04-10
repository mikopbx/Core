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

/* global globalRootUrl, globalWebAdminLanguage, sessionStorage, $, globalTranslate */

/**
 * Advice Worker module.
 * @module adviceWorker
 */
const adviceWorker = {

    /**
     * Time in milliseconds before fetching new advice.
     * @type {number}
     */
    timeOut: 10000,

    /**
     * The id of the timer function for advice worker.
     * @type {number}
     */
    timeOutHandle: 0,

    /**
     * jQuery element for advice container.
     * @type {jQuery}
     */
    $advice: $('#advice'),

    /**.
     * @type {EventSource}
     */
     eventSource: null,

     /**
      * The identifier for the PUB/SUB channel used to subscribe to advice updates.
      * This ensures that the client is listening on the correct channel for relevant events.
      */
     channelId: 'advice-pub',

    /**
     * jQuery element for advice bell button.
     * @type {jQuery}
     */
    $adviceBellButton: $('#show-advice-button'),

    /**
     * Initializes the advice worker.
     */
    initialize() {
        adviceWorker.showPreviousAdvice();
        // Let's initiate the retrieval of new advice.
        adviceWorker.startListenPushNotifications();
        window.addEventListener('ConfigDataChanged', adviceWorker.cbOnDataChanged);
        PbxApi.AdviceGetList(adviceWorker.channelId);
    },

    /**
     * Establishes a connection to the server to start receiving real-time updates on advice.
     * Utilizes the EventSource API to listen for messages on a specified channel.
     */
    startListenPushNotifications() {
        const lastEventIdKey = `${adviceWorker.channelId}-lastEventId`;
        let lastEventId = localStorage.getItem(lastEventIdKey);
        const subPath = lastEventId ? `/pbxcore/api/nchan/sub/${adviceWorker.channelId}?last_event_id=${lastEventId}` : `/pbxcore/api/nchan/sub/${adviceWorker.channelId}`;
        adviceWorker.eventSource = new EventSource(subPath);

        adviceWorker.eventSource.addEventListener('message', e => {
            const response = JSON.parse(e.data);
            console.debug(response);
            adviceWorker.cbAfterResponse(response);
            localStorage.setItem(lastEventIdKey, e.lastEventId);
        });
    },

    /**
     * Event handler for language or data change.
     */
    cbOnDataChanged() {
        sessionStorage.removeItem(`previousAdvice${globalWebAdminLanguage}`);
        sessionStorage.removeItem(`previousAdviceBell${globalWebAdminLanguage}`);
    },

    /**
     * Shows old advice until receiving an update from the station.
     */
    showPreviousAdvice() {
        const previousAdviceBell = sessionStorage.getItem(`previousAdviceBell${globalWebAdminLanguage}`);
        if (previousAdviceBell) {
            adviceWorker.$adviceBellButton.html(previousAdviceBell);
        }
        const previousAdvice = sessionStorage.getItem(`previousAdvice${globalWebAdminLanguage}`);
        if (previousAdvice) {
            adviceWorker.$advice.html(previousAdvice);
            adviceWorker.$adviceBellButton.popup({
                    position: 'bottom left',
                    popup: adviceWorker.$advice,
                    delay: {
                        show: 300,
                        hide: 10000,
                    },
                    on: 'click',
                    movePopup: false,
                });
        }
    },

    /**
     * Callback function after receiving the response.
     * @param {object} response - Response object from the API.
     */
    cbAfterResponse(response) {
        if (response === false) {
            return;
        }
        adviceWorker.$advice.html('');
        if (response.data.advice !== undefined) {
            const advice = response.data.advice;
            let htmlMessages = '';
            let countMessages = 0;
            let iconBellClass = '';
            htmlMessages += `<div class="ui header">${globalTranslate.adv_PopupHeader}</div>`;
            htmlMessages += '<div class="ui relaxed divided list">';

            if (advice.needUpdate !== undefined
                && advice.needUpdate.length > 0) {
                $(window).trigger('SecurityWarning', [advice]);
            }

            if (advice.error !== undefined
                && advice.error.length > 0) {
                $.each(advice.error, (key, value) => {
                    htmlMessages += '<div class="item">';
                    htmlMessages += '<i class="frown outline red icon"></i>';
                    htmlMessages += `${value}`;
                    htmlMessages += '</div>';
                    countMessages += 1;
                });
            }
            if (advice.warning !== undefined
                && advice.warning.length > 0) {
                $.each(advice.warning, (key, value) => {
                    htmlMessages += '<div class="item yellow">';
                    htmlMessages += '<i class="meh outline yellow icon"></i>';
                    htmlMessages += `${value}`;
                    htmlMessages += '</div>';
                    countMessages += 1;
                });
            }
            if (advice.info !== undefined
                && advice.info.length > 0) {
                $.each(advice.info, (key, value) => {
                    htmlMessages += '<div class="item">';
                    htmlMessages += '<i class="smile outline blue icon"></i>';
                    htmlMessages += `${value}`;
                    htmlMessages += '</div>';
                    countMessages += 1;
                });
            }

            if (advice.error !== undefined
                && advice.error.length > 0) {
                iconBellClass = 'red icon bell';
            } else if (advice.warning !== undefined
                && advice.warning.length > 0) {
                iconBellClass = 'yellow icon bell';

            } else if (advice.info !== undefined
                && advice.info.length > 0) {
                iconBellClass = 'blue icon bell';
            }
            htmlMessages += '</div>';
            adviceWorker.$advice.html(htmlMessages);
            sessionStorage.setItem(`previousAdvice${globalWebAdminLanguage}`, htmlMessages);

            if (countMessages > 0) {
                adviceWorker.$adviceBellButton
                    .html(`<i class="${iconBellClass}"></i>${countMessages}`)
                    .popup({
                        position: 'bottom left',
                        popup: adviceWorker.$advice,
                        delay: {
                            show: 300,
                            hide: 10000,
                        },
                        on: 'click',
                        movePopup: false,
                    });
                adviceWorker.$adviceBellButton.find('i')
                    .transition('set looping')
                    .transition('pulse', '1000ms');
            } else {
                adviceWorker.$adviceBellButton
                    .html(`<i class="grey icon bell"></i>`)
            }
            sessionStorage.setItem(`previousAdviceBell${globalWebAdminLanguage}`, adviceWorker.$adviceBellButton.html());
            adviceWorker.timeoutHandle = window.setTimeout(
                adviceWorker.worker,
                adviceWorker.timeOut,
            );
        } else if (response.result === true
            && response.data.advice !== undefined
            && response.data.advice.length === 0) {
            sessionStorage.removeItem(`previousAdvice${globalWebAdminLanguage}`);
            sessionStorage.removeItem(`previousAdviceBell${globalWebAdminLanguage}`);
            adviceWorker.$adviceBellButton
                .html('<i class="grey icon bell outline"></i>');
        }
    },
};

/**
 *  Initialize advice worker on document ready
 */
$(document).ready(() => {
    adviceWorker.initialize();
});
