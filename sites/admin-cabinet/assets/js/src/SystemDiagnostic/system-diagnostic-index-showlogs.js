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
/* global ace, PbxApi, updateLogViewWorker, Ace, UserMessage */

/**
 * Represents the system diagnostic logs object.
 *
 * @module systemDiagnosticLogs
 */
const systemDiagnosticLogs = {
    /**
     * jQuery object for the "Show Last Log" button.
     * @type {jQuery}
     */
    $showBtn: $('#show-last-log'),

    /**
     * jQuery object for the "Download File" button.
     * @type {jQuery}
     */
    $downloadBtn: $('#download-file'),

    /**
     * jQuery object for the "Show Last Log (Auto)" button.
     * @type {jQuery}
     */
    $showAutoBtn: $('#show-last-log-auto'),

    /**
     * jQuery object for the "Erase current file content" button.
     * @type {jQuery}
     */
    $eraseBtn: $('#erase-file'),

    /**
     * jQuery object for the log content.
     * @type {jQuery}
     */
    $logContent: $('#log-content-readonly'),

    /**
     * The viewer for displaying the log content.
     * @type {Ace}
     */
    viewer: '',

    /**
     * jQuery object for the file select dropdown.
     * @type {jQuery}
     */
    $fileSelectDropDown: $('#system-diagnostic-form .filenames-select'),

    /**
     * Array of log items.
     * @type {Array}
     */
    logsItems: [],

    /**
     * Default log item.
     * @type {Object}
     */
    defaultLogItem: null,

    /**
     * jQuery object for the dimmer.
     * @type {jQuery}
     */
    $dimmer: $('#get-logs-dimmer'),

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#system-diagnostic-form'),

    /**
     * jQuery object for the filename.
     * @type {jQuery}
     */
    $fileName: $('#system-diagnostic-form .filename'),

    /**
     * Initializes the system diagnostic logs.
     */
    initialize() {
        const aceHeight = window.innerHeight - 250;

        // Set the minimum height of the log container
        systemDiagnosticLogs.$dimmer.closest('div').css('min-height', `${aceHeight}px`);

        // Initialize the dropdown menu for log files
        systemDiagnosticLogs.$fileSelectDropDown.dropdown({
                values: systemDiagnosticLogs.logsItems,
                onChange: systemDiagnosticLogs.cbOnChangeFile,
                ignoreCase: true,
                fullTextSearch: true,
                forceSelection: false,
        });

        // Initialize the ACE editor for log content
        systemDiagnosticLogs.initializeAce();

        // Fetch the list of log files
        PbxApi.SyslogGetLogsList(systemDiagnosticLogs.cbFormatDropdownResults);

        // Event listener for "Show Log" button click
        systemDiagnosticLogs.$showBtn.on('click', (e) => {
            e.preventDefault();
            systemDiagnosticLogs.updateLogFromServer();
        });

        // Event listener for "Download Log" button click
        systemDiagnosticLogs.$downloadBtn.on('click', (e) => {
            e.preventDefault();
            const data = systemDiagnosticLogs.$formObj.form('get values');
            PbxApi.SyslogDownloadLogFile(data.filename, systemDiagnosticLogs.cbDownloadFile);
        });

        // Event listener for "Auto Refresh" button click
        systemDiagnosticLogs.$showAutoBtn.on('click', (e) => {
            e.preventDefault();
            const $reloadIcon = systemDiagnosticLogs.$showAutoBtn.find('i.refresh');
            if ($reloadIcon.hasClass('loading')) {
                $reloadIcon.removeClass('loading');
                updateLogViewWorker.stop();
            } else {
                $reloadIcon.addClass('loading');
                updateLogViewWorker.initialize();
            }
        });

        // Event listener for "Erase file" button click
        systemDiagnosticLogs.$eraseBtn.on('click', (e) => {
            e.preventDefault();
            systemDiagnosticLogs.eraseCurrentFileContent();
        });


        // Event listener for Enter keypress on input fields
        $('input').keyup((event) => {
            if (event.keyCode === 13) {
                systemDiagnosticLogs.updateLogFromServer();
            }
        });
    },

    /**
     * Initializes the ACE editor for log viewing.
     */
    initializeAce() {
        systemDiagnosticLogs.viewer = ace.edit('log-content-readonly');

        // Check if the Julia mode is available
        const julia = ace.require('ace/mode/julia');
        if (julia !== undefined) {
            // Set the mode to Julia if available
            const IniMode = julia.Mode;
            systemDiagnosticLogs.viewer.session.setMode(new IniMode());
        }

        // Set the theme and options for the ACE editor
        systemDiagnosticLogs.viewer.setTheme('ace/theme/monokai');
        systemDiagnosticLogs.viewer.renderer.setShowGutter(false);
        systemDiagnosticLogs.viewer.setOptions({
            showLineNumbers: false,
            showPrintMargin: false,
            readOnly: true,
        });

        // Resize the ACE editor to fit the window height
        $(window).load(function () {
            const aceHeight = window.innerHeight - systemDiagnosticLogs.$logContent.offset().top - 50;
            $('.log-content-readonly').css('min-height', `${aceHeight}px`);
            systemDiagnosticLogs.viewer.resize();
        });
    },

    /**
     * Callback function to format the dropdown menu structure based on the response.
     * @param {Object} response - The response data.
     */
    cbFormatDropdownResults(response) {
        if (response === false) {
            return;
        }
        // Check if there is a default value set for the filename input field
        let defVal = '';
        const fileName = systemDiagnosticLogs.$formObj.form('get value', 'filename');
        if (systemDiagnosticLogs.logsItems.length === 0 && fileName !== '') {
            defVal = fileName.trim();
        }

        systemDiagnosticLogs.logsItems = [];
        const files = response.files;

        // Iterate through each file and create the dropdown menu options
        $.each(files, (index, item) => {

            if (defVal !== '') {
                item.default = (defVal === item.path);
            }
            // Create an option object for each file
            systemDiagnosticLogs.logsItems.push({
                name: `${index} (${item.size})`,
                value: item.path,
                selected: item.default
            });
        });

        // Update the dropdown menu values with the newly formatted options
        systemDiagnosticLogs.$fileSelectDropDown.dropdown('change values', systemDiagnosticLogs.logsItems);
    },

    /**
     * Callback after changing the log file in the select dropdown.
     * @param {string} value - The selected value.
     */
    cbOnChangeFile(value) {
        if (value.length === 0) {
            return;
        }
        systemDiagnosticLogs.$formObj.form('set value', 'filename', value);
        systemDiagnosticLogs.updateLogFromServer();
    },

    /**
     * Fetches the log file content from the server.
     */
    updateLogFromServer() {
        const params = systemDiagnosticLogs.$formObj.form('get values');
        PbxApi.SyslogGetLogFromFile(params, systemDiagnosticLogs.cbUpdateLogText);
    },

    /**
     * Updates the log view.
     * @param {Object} data - The log data.
     */
    cbUpdateLogText(data) {
        systemDiagnosticLogs.viewer.getSession().setValue(data.content);
        const row = systemDiagnosticLogs.viewer.session.getLength() - 1;
        const column = systemDiagnosticLogs.viewer.session.getLine(row).length; // or simply Infinity
        systemDiagnosticLogs.viewer.gotoLine(row + 1, column);
        systemDiagnosticLogs.$dimmer.removeClass('active');
    },

    /**
     * Callback after clicking the "Download File" button.
     * @param {Object} response - The response data.
     */
    cbDownloadFile(response) {
        if (response !== false) {
            window.location = response.filename;
        }
    },

    /**
     * Callback after clicking the "Erase File" button.
     */
    eraseCurrentFileContent(){
        const fileName = systemDiagnosticLogs.$formObj.form('get value', 'filename');
        if (fileName.length>0){
            PbxApi.SyslogEraseFile(fileName, systemDiagnosticLogs.cbAfterFileErased)
        }
    },

    /**
     * Callback after clicking the "Erase File" button and calling REST API command
     * @param {Object} response - The response data.
     */
    cbAfterFileErased(response){
        if (response.result===false && response.messages !== undefined) {
            UserMessage.showMultiString(response.messages);
        } else {
            systemDiagnosticLogs.updateLogFromServer();
        }
    },
};

// When the document is ready, initialize the show system logs tab
$(document).ready(() => {
    systemDiagnosticLogs.initialize();
});