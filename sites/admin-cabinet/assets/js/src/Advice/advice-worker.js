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
        adviceWorker.restartWorker();
        window.addEventListener('ConfigDataChanged', adviceWorker.cbOnDataChanged);
    },

    /**
     * Restarts the advice worker.
     */
    restartWorker() {
        window.clearTimeout(adviceWorker.timeoutHandle);
        adviceWorker.worker();
    },

    /**
     * Event handler for language or data change.
     */
    cbOnDataChanged() {
        sessionStorage.removeItem(`previousAdvice${globalWebAdminLanguage}`);
        sessionStorage.removeItem(`previousAdviceBell${globalWebAdminLanguage}`);
        setTimeout(adviceWorker.restartWorker, 3000);
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
     * Worker function for fetching advice.
     */
    worker() {
        PbxApi.AdviceGetList(adviceWorker.cbAfterResponse);
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
        if (response.advice !== undefined) {
            let htmlMessages = '';
            let countMessages = 0;
            let iconBellClass = '';
            htmlMessages += `<div class="ui header">${globalTranslate.adv_PopupHeader}</div>`;
            htmlMessages += '<div class="ui relaxed divided list">';

            if (response.advice.needUpdate !== undefined
                && response.advice.needUpdate.length > 0) {
                $(window).trigger('SecurityWarning', [response.advice]);
            }

            if (response.advice.error !== undefined
                && response.advice.error.length > 0) {
                $.each(response.advice.error, (key, value) => {
                    htmlMessages += '<div class="item">';
                    htmlMessages += '<i class="frown outline red icon"></i>';
                    htmlMessages += `${value}`;
                    htmlMessages += '</div>';
                    countMessages += 1;
                });
            }
            if (response.advice.warning !== undefined
                && response.advice.warning.length > 0) {
                $.each(response.advice.warning, (key, value) => {
                    htmlMessages += '<div class="item yellow">';
                    htmlMessages += '<i class="meh outline yellow icon"></i>';
                    htmlMessages += `${value}`;
                    htmlMessages += '</div>';
                    countMessages += 1;
                });
            }
            if (response.advice.info !== undefined
                && response.advice.info.length > 0) {
                $.each(response.advice.info, (key, value) => {
                    htmlMessages += '<div class="item">';
                    htmlMessages += '<i class="smile outline blue icon"></i>';
                    htmlMessages += `${value}`;
                    htmlMessages += '</div>';
                    countMessages += 1;
                });
            }

            if (response.advice.error !== undefined
                && response.advice.error.length > 0) {
                iconBellClass = 'red icon bell';
            } else if (response.advice.warning !== undefined
                && response.advice.warning.length > 0) {
                iconBellClass = 'yellow icon bell';

            } else if (response.advice.info !== undefined
                && response.advice.info.length > 0) {
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
        } else if (response.success === true
            && response.advice !== undefined
            && response.advice.length === 0) {
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
