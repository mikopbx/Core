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

/* global globalRootUrl, globalWebAdminLanguage, sessionStorage, $, i18n, AdviceAPI */

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

    /**
     * jQuery element for advice bell button.
     * @type {jQuery}
     */
    $adviceBellButton: $('#show-advice-button'),

    /**
     * Storage key for raw advice data
     * @type {string}
     */
    storageKeyRawAdvice: 'rawAdviceData',

    /**
     * Storage key for bell state
     * @type {string}
     */
    storageKeyBellState: 'adviceBellState',

    /**
     * Initializes the advice worker.
     */
    initialize() {
        adviceWorker.showPreviousAdvice();
        EventBus.subscribe('advice', data => {
            adviceWorker.cbAfterResponse(data);
        });
        EventBus.subscribe('models-changed', data => {
            if (data.model === 'MikoPBX\\Common\\Models\\PbxSettings'
                && (data.recordId === 'WebAdminPassword' || data.recordId === 'SSHPassword')
            ) {
                AdviceAPI.getList(adviceWorker.cbAfterResponse);
            }
        });
        AdviceAPI.getList(adviceWorker.cbAfterResponse);
    },

    /**
     * Translates advice message using the translation key and parameters
     * @param {object} messageData - Message object with template key and params
     * @returns {string} - Translated message
     */
    translateMessage(messageData) {
        return i18n(messageData.messageTpl, messageData.messageParams);
    },

    /**
     * Generate HTML advice content from raw advice data
     * @param {object} adviceData - Raw advice data
     * @returns {object} - Object containing HTML and count of messages
     */
    generateAdviceHtml(adviceData) {
        let htmlMessages = '';
        let countMessages = 0;
        let iconBellClass = '';
        
        htmlMessages += `<div class="ui header">${globalTranslate.adv_PopupHeader}</div>`;
        htmlMessages += '<div class="ui relaxed divided list">';

        if (adviceData.needUpdate !== undefined && adviceData.needUpdate.length > 0) {
            $(window).trigger('SecurityWarning', [adviceData]);
        }

        if (adviceData.error !== undefined && adviceData.error.length > 0) {
            $.each(adviceData.error, (key, value) => {
                htmlMessages += '<div class="item">';
                htmlMessages += '<i class="frown outline red icon"></i>';
                htmlMessages += adviceWorker.translateMessage(value);
                htmlMessages += '</div>';
                countMessages += 1;
            });
        }
        
        if (adviceData.warning !== undefined && adviceData.warning.length > 0) {
            $.each(adviceData.warning, (key, value) => {
                htmlMessages += '<div class="item yellow">';
                htmlMessages += '<i class="meh outline yellow icon"></i>';
                htmlMessages += adviceWorker.translateMessage(value);
                htmlMessages += '</div>';
                countMessages += 1;
            });
        }
        
        if (adviceData.info !== undefined && adviceData.info.length > 0) {
            $.each(adviceData.info, (key, value) => {
                htmlMessages += '<div class="item">';
                htmlMessages += '<i class="smile outline blue icon"></i>';
                htmlMessages += adviceWorker.translateMessage(value);
                htmlMessages += '</div>';
                countMessages += 1;
            });
        }

        htmlMessages += '</div>';

        // Determine bell icon class
        if (adviceData.error !== undefined && adviceData.error.length > 0) {
            iconBellClass = 'red icon bell';
        } else if (adviceData.warning !== undefined && adviceData.warning.length > 0) {
            iconBellClass = 'yellow icon bell';
        } else if (adviceData.info !== undefined && adviceData.info.length > 0) {
            iconBellClass = 'blue icon bell';
        } else {
            iconBellClass = 'grey icon bell outline';
        }

        return {
            html: htmlMessages,
            count: countMessages,
            iconClass: iconBellClass
        };
    },

    /**
     * Shows old advice until receiving an update from the station.
     */
    showPreviousAdvice() {
        // Get raw bell state
        const bellState = sessionStorage.getItem(adviceWorker.storageKeyBellState);
        if (bellState) {
            adviceWorker.$adviceBellButton.html(bellState);
        }

        // Get and process raw advice data
        const rawAdviceData = sessionStorage.getItem(adviceWorker.storageKeyRawAdvice);
        if (rawAdviceData) {
            try {
                const adviceData = JSON.parse(rawAdviceData);
                const adviceResult = adviceWorker.generateAdviceHtml(adviceData);
                
                adviceWorker.$advice.html(adviceResult.html);
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
                
                // If bell has a class that requires animation, restart it
                if (adviceResult.count > 0) {
                    adviceWorker.$adviceBellButton.find('i')
                        .transition('set looping')
                        .transition('pulse', '1000ms');
                }
            } catch (e) {
                console.error('Error parsing cached advice data', e);
                // Clear invalid cache
                sessionStorage.removeItem(adviceWorker.storageKeyRawAdvice);
            }
        }
    },

    /**
     * Callback function after receiving the response.
     * @param {object} response - Response object from the API.
     */
    cbAfterResponse(response) {
        if (response.result === false) {
            return;
        }
        
        adviceWorker.$advice.html('');
        
        if (response.data.advice !== undefined) {
            const adviceData = response.data.advice;
            
            // Store raw advice data for later use
            sessionStorage.setItem(adviceWorker.storageKeyRawAdvice, JSON.stringify(adviceData));
            
            // Generate HTML and update UI
            const adviceResult = adviceWorker.generateAdviceHtml(adviceData);
            
            adviceWorker.$advice.html(adviceResult.html);
            
            if (adviceResult.count > 0) {
                const bellHtml = `<i class="${adviceResult.iconClass}"></i>${adviceResult.count}`;
                adviceWorker.$adviceBellButton
                    .html(bellHtml)
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
                    .html(`<i class="grey icon bell"></i>`);
            }
            
            // Cache the bell state
            sessionStorage.setItem(adviceWorker.storageKeyBellState, adviceWorker.$adviceBellButton.html());
            
            // Set timeout for next update
            adviceWorker.timeoutHandle = window.setTimeout(
                adviceWorker.worker,
                adviceWorker.timeOut,
            );
        } else if (response.result === true
            && response.data.advice !== undefined
            && response.data.advice.length === 0) {
            
            // Clear cache if there are no advice messages
            sessionStorage.removeItem(adviceWorker.storageKeyRawAdvice);
            sessionStorage.removeItem(adviceWorker.storageKeyBellState);
            
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