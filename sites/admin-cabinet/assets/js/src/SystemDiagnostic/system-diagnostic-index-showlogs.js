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
/* global ace, PbxApi, SyslogAPI, updateLogViewWorker, Ace, UserMessage, SVGTimeline */

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
    $fileSelectDropDown: null,

    /**
     * Array of log items.
     * @type {Array}
     */
    logsItems: [],

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
     * Flag to prevent duplicate API calls during initialization
     * @type {boolean}
     */
    isInitializing: true,

    /**
     * Flag indicating if time slider mode is enabled
     * @type {boolean}
     */
    timeSliderEnabled: false,

    /**
     * Current time range for the selected log file
     * @type {object|null}
     */
    currentTimeRange: null,

    /**
     * Flag indicating if auto-update mode is active
     * @type {boolean}
     */
    isAutoUpdateActive: false,

    /**
     * Initializes the system diagnostic logs.
     */
    initialize() {
        const aceHeight = window.innerHeight - 250;

        // Set the minimum height of the log container
        systemDiagnosticLogs.$dimmer.closest('div').css('min-height', `${aceHeight}px`);

        // Create dropdown UI from hidden input (V5.0 pattern)
        systemDiagnosticLogs.createDropdownFromHiddenInput();

        // Initialize the dropdown menu for log files with tree support
        // Initialize Semantic UI dropdown with custom menu generation
        systemDiagnosticLogs.$fileSelectDropDown.dropdown({
                onChange: systemDiagnosticLogs.cbOnChangeFile,
                ignoreCase: true,
                fullTextSearch: true,
                forceSelection: false,
                preserveHTML: true,
                allowCategorySelection: false,
                match: 'text',
                filterRemoteData: false,
                action: 'activate',
                templates: {
                    menu: systemDiagnosticLogs.customDropdownMenu
                }
        });

        // Initialize the ACE editor for log content
        systemDiagnosticLogs.initializeAce();

        // Fetch the list of log files
        SyslogAPI.getLogsList(systemDiagnosticLogs.cbFormatDropdownResults);

        // Initialize log level dropdown - V5.0 pattern with DynamicDropdownBuilder
        systemDiagnosticLogs.initializeLogLevelDropdown();

        // Event listener for quick period buttons
        $(document).on('click', '.period-btn', (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const period = $btn.data('period');

            // Update active state
            $('.period-btn').removeClass('active');
            $btn.addClass('active');

            systemDiagnosticLogs.applyQuickPeriod(period);
        });

        // Event listener for "Now" button
        $(document).on('click', '.now-btn', (e) => {
            e.preventDefault();
            if (systemDiagnosticLogs.currentTimeRange) {
                const end = systemDiagnosticLogs.currentTimeRange.end;
                const oneHour = 3600;
                const start = Math.max(end - oneHour, systemDiagnosticLogs.currentTimeRange.start);
                SVGTimeline.setRange(start, end);
                systemDiagnosticLogs.loadLogByTimeRange(start, end);
                $('.period-btn').removeClass('active');
                $('.period-btn[data-period="3600"]').addClass('active');
            }
        });

        // Event listener for log level filter buttons
        $(document).on('click', '.level-btn', (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const level = $btn.data('level');

            // Update active state
            $('.level-btn').removeClass('active');
            $btn.addClass('active');

            systemDiagnosticLogs.applyLogLevelFilter(level);
        });

        // Event listener for "Show Log" button click (delegated)
        $(document).on('click', '#show-last-log', (e) => {
            e.preventDefault();
            systemDiagnosticLogs.updateLogFromServer();
        });

        // Listen for hash changes to update selected file
        $(window).on('hashchange', () => {
            systemDiagnosticLogs.handleHashChange();
        });

        // Event listener for "Download Log" button click (delegated)
        $(document).on('click', '#download-file', (e) => {
            e.preventDefault();
            const data = systemDiagnosticLogs.$formObj.form('get values');
            SyslogAPI.downloadLogFile(data.filename, true, systemDiagnosticLogs.cbDownloadFile);
        });

        // Event listener for "Auto Refresh" button click (delegated)
        $(document).on('click', '#show-last-log-auto', (e) => {
            e.preventDefault();
            const $button = $('#show-last-log-auto');
            const $reloadIcon = $button.find('.icons i.refresh');
            if ($reloadIcon.hasClass('loading')) {
                $reloadIcon.removeClass('loading');
                systemDiagnosticLogs.isAutoUpdateActive = false;
                updateLogViewWorker.stop();
            } else {
                $reloadIcon.addClass('loading');
                systemDiagnosticLogs.isAutoUpdateActive = true;
                updateLogViewWorker.initialize();
            }
        });

        // Event listener for the "Erase file" button click (delegated)
        $(document).on('click', '#erase-file', (e) => {
            e.preventDefault();
            systemDiagnosticLogs.eraseCurrentFileContent();
        });

        // Event listener for Enter keypress on input fields
        $('input').keyup((event) => {
            if (event.keyCode === 13) {
                systemDiagnosticLogs.updateLogFromServer();
            }
        });

        // Event listener for Fullscreen button click
        $('.fullscreen-toggle-btn').on('click', systemDiagnosticLogs.toggleFullScreen);

        // Listening for the fullscreen change event
        document.addEventListener('fullscreenchange', systemDiagnosticLogs.adjustLogHeight);

        // Initial height calculation
        systemDiagnosticLogs.adjustLogHeight();
    },

    /**
     * Toggles the full-screen mode of the 'system-logs-segment' element.
     * If the element is not in full-screen mode, it requests full-screen mode.
     * If the element is already in full-screen mode, it exits full-screen mode.
     * Logs an error message to the console if there is an issue enabling full-screen mode.
     *
     * @return {void}
     */
    toggleFullScreen() {
        const logContainer = document.getElementById('system-logs-segment');

        if (!document.fullscreenElement) {
            logContainer.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    },

    /**
     * Function to adjust the height of the logs depending on the screen mode.
     */
    adjustLogHeight() {
        setTimeout(() => {
            let aceHeight = window.innerHeight - systemDiagnosticLogs.$logContent.offset().top - 55;
            if (document.fullscreenElement) {
                // If fullscreen mode is active
                aceHeight = window.innerHeight - 80;
            }
            // Recalculate the size of the ACE editor
            $('.log-content-readonly').css('min-height',  `${aceHeight}px`);
            systemDiagnosticLogs.viewer.resize();
        }, 300);
    },
    /**
     * Initialize log level dropdown - V5.0 pattern with HTML icons
     * Static dropdown with colored icons and translations
     */
    initializeLogLevelDropdown() {
        const $hiddenInput = $('#logLevel');

        // Check if dropdown already exists
        if ($('#logLevel-dropdown').length) {
            return;
        }

        // Create dropdown HTML with colored icons
        const $dropdown = $('<div>', {
            id: 'logLevel-dropdown',
            class: 'ui selection dropdown'
        });

        const $text = $('<div>', { class: 'text' }).text(globalTranslate.sd_AllLevels);
        const $icon = $('<i>', { class: 'dropdown icon' });
        const $menu = $('<div>', { class: 'menu' });

        // Build menu items with colored icons
        const items = [
            { value: '', text: globalTranslate.sd_AllLevels, icon: '' },
            { value: 'ERROR', text: globalTranslate.sd_Error, icon: '<i class="exclamation circle red icon"></i>' },
            { value: 'WARNING', text: globalTranslate.sd_Warning, icon: '<i class="exclamation triangle orange icon"></i>' },
            { value: 'NOTICE', text: globalTranslate.sd_Notice, icon: '<i class="info circle blue icon"></i>' },
            { value: 'INFO', text: globalTranslate.sd_Info, icon: '<i class="circle grey icon"></i>' },
            { value: 'DEBUG', text: globalTranslate.sd_Debug, icon: '<i class="bug purple icon"></i>' }
        ];

        items.forEach(item => {
            const $item = $('<div>', {
                class: 'item',
                'data-value': item.value
            }).html(item.icon + item.text);
            $menu.append($item);
        });

        $dropdown.append($text, $icon, $menu);
        $hiddenInput.after($dropdown);

        // Initialize Semantic UI dropdown
        $dropdown.dropdown({
            onChange: (value) => {
                $hiddenInput.val(value).trigger('change');
                systemDiagnosticLogs.updateLogFromServer();
            }
        });
    },

    /**
     * Creates dropdown UI element from hidden input field (V5.0 pattern)
     */
    createDropdownFromHiddenInput() {
        const $hiddenInput = $('#filenames');

        if (!$hiddenInput.length) {
            console.error('Hidden input #filenames not found');
            return;
        }

        const $dropdown = $('<div>', {
            id: 'filenames-dropdown',
            class: 'ui selection dropdown filenames-select fluid'
        });

        $dropdown.append(
            $('<i>', { class: 'dropdown icon' }),
            $('<div>', { class: 'default text' }).text('Select log file'),
            $('<div>', { class: 'menu' })
        );

        $hiddenInput.before($dropdown);
        $hiddenInput.hide();

        systemDiagnosticLogs.$fileSelectDropDown = $dropdown;
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

    },

    /**
     * Builds a hierarchical tree structure from flat file paths
     * @param {Object} files - The files object from API response
     * @param {string} defaultPath - The default selected file path
     * @returns {Array} Tree structure for the dropdown
     */
    buildTreeStructure(files, defaultPath) {
        const tree = {};
        
        // Build the tree structure
        Object.entries(files).forEach(([key, fileData]) => {
            // Use fileData.path as the actual file path
            const filePath = fileData.path || key;
            const parts = filePath.split('/');
            let current = tree;
            
            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    // This is a file
                    current[part] = {
                        type: 'file',
                        path: filePath,
                        size: fileData.size,
                        default: (defaultPath && defaultPath === filePath) || (!defaultPath && fileData.default)
                    };
                } else {
                    // This is a directory
                    if (!current[part]) {
                        current[part] = {
                            type: 'folder',
                            children: {}
                        };
                    }
                    current = current[part].children;
                }
            });
        });
        
        // Convert tree to dropdown items
        return this.treeToDropdownItems(tree, '');
    },
    
    /**
     * Converts tree structure to dropdown items with proper formatting
     * @param {Object} tree - The tree structure
     * @param {string} prefix - Prefix for indentation
     * @returns {Array} Formatted dropdown items
     */
    treeToDropdownItems(tree, prefix) {
        const items = [];
        
        // Sort entries: folders first, then files
        const entries = Object.entries(tree).sort(([aKey, aVal], [bKey, bVal]) => {
            if (aVal.type === 'folder' && bVal.type === 'file') return -1;
            if (aVal.type === 'file' && bVal.type === 'folder') return 1;
            return aKey.localeCompare(bKey);
        });
        
        entries.forEach(([key, value]) => {
            if (value.type === 'folder') {
                // Add folder header
                items.push({
                    name: `${prefix}<i class="folder icon"></i> ${key}`,
                    value: '',
                    disabled: true,
                    type: 'folder'
                });
                
                // Add children with increased indentation
                const childItems = this.treeToDropdownItems(value.children, prefix + '&nbsp;&nbsp;&nbsp;&nbsp;');
                items.push(...childItems);
            } else {
                // Add file item
                items.push({
                    name: `${prefix}<i class="file outline icon"></i> ${key} (${value.size})`,
                    value: value.path,
                    selected: value.default,
                    type: 'file'
                });
            }
        });
        
        return items;
    },
    
    /**
     * Creates custom dropdown menu HTML for log files
     * @param {Object} response - The response containing dropdown menu options
     * @param {Object} fields - The fields in the response to use for the menu options
     * @returns {string} The HTML string for the custom dropdown menu
     */
    customDropdownMenu(response, fields) {
        const values = response[fields.values] || {};
        let html = '';
        
        $.each(values, (index, option) => {
            // For tree structure items
            if (systemDiagnosticLogs.logsItems && systemDiagnosticLogs.logsItems[index]) {
                const item = systemDiagnosticLogs.logsItems[index];
                
                if (item.type === 'folder') {
                    // Folder item - disabled and with folder icon
                    html += `<div class="disabled item" data-value="">${item.name}</div>`;
                } else {
                    // File item with proper value
                    const selected = item.selected ? 'selected active' : '';
                    html += `<div class="item ${selected}" data-value="${option[fields.value]}">${item.name}</div>`;
                }
            } else {
                // Fallback to regular item
                const maybeDisabled = (option[fields.disabled]) ? 'disabled ' : '';
                html += `<div class="${maybeDisabled}item" data-value="${option[fields.value]}">${option[fields.name]}</div>`;
            }
        });
        
        return html;
    },

    /**
     * Handles hash changes to update the selected file
     */
    handleHashChange() {
        // Skip during initialization to prevent duplicate API calls
        if (systemDiagnosticLogs.isInitializing) {
            return;
        }

        const hash = window.location.hash;
        if (hash && hash.startsWith('#file=')) {
            const filePath = decodeURIComponent(hash.substring(6));
            if (filePath && systemDiagnosticLogs.$fileSelectDropDown.dropdown('get value') !== filePath) {
                // Check if the file exists in dropdown items
                const fileExists = systemDiagnosticLogs.logsItems.some(item =>
                    item.type === 'file' && item.value === filePath
                );
                if (fileExists) {
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', filePath);
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', filePath);
                    systemDiagnosticLogs.$formObj.form('set value', 'filename', filePath);
                    systemDiagnosticLogs.updateLogFromServer();
                }
            }
        }
    },

    /**
     * Gets the file path from URL hash if present
     */
    getFileFromHash() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#file=')) {
            return decodeURIComponent(hash.substring(6));
        }
        return '';
    },

    /**
     * Callback function to format the dropdown menu structure based on the response.
     * @param {Object} response - The response data.
     */
    cbFormatDropdownResults(response) {
        // Check if response is valid
        if (!response || !response.result || !response.data || !response.data.files) {
            // Hide dimmer only if not in auto-update mode
            if (!systemDiagnosticLogs.isAutoUpdateActive) {
                systemDiagnosticLogs.$dimmer.removeClass('active');
            }
            return;
        }

        const files = response.data.files;

        // Check for file from hash first
        let defVal = systemDiagnosticLogs.getFileFromHash();

        // If no hash value, check if there is a default value set for the filename input field
        if (!defVal) {
            const fileName = systemDiagnosticLogs.$formObj.form('get value', 'filename');
            if (fileName !== '') {
                defVal = fileName.trim();
            }
        }

        // Build tree structure from files
        systemDiagnosticLogs.logsItems = systemDiagnosticLogs.buildTreeStructure(files, defVal);

        // Create values array for dropdown with all items (including folders)
        const dropdownValues = systemDiagnosticLogs.logsItems.map((item, index) => {
            if (item.type === 'folder') {
                return {
                    name: item.name.replace(/<[^>]*>/g, ''), // Remove HTML tags for search
                    value: '',
                    disabled: true
                };
            } else {
                return {
                    name: item.name.replace(/<[^>]*>/g, ''), // Remove HTML tags for search
                    value: item.value,
                    selected: item.selected
                };
            }
        });
        
        // Update dropdown with values
        systemDiagnosticLogs.$fileSelectDropDown.dropdown('setup menu', {
            values: dropdownValues
        });
        
        // Set the default selected value if any
        const selectedItem = systemDiagnosticLogs.logsItems.find(item => item.selected);
        if (selectedItem) {
            // Use setTimeout to ensure dropdown is fully initialized
            setTimeout(() => {
                // Setting selected value will trigger onChange callback which calls updateLogFromServer()
                systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', selectedItem.value);
                // Force refresh the dropdown to show the selected value
                systemDiagnosticLogs.$fileSelectDropDown.dropdown('refresh');
                // Also set the text to show full path
                systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', selectedItem.value);
                systemDiagnosticLogs.$formObj.form('set value', 'filename', selectedItem.value);
            }, 100);
        } else if (defVal) {
            // If we have a default value but no item was marked as selected,
            // try to find and select it manually
            const itemToSelect = systemDiagnosticLogs.logsItems.find(item =>
                item.type === 'file' && item.value === defVal
            );
            if (itemToSelect) {
                setTimeout(() => {
                    // Setting selected value will trigger onChange callback which calls updateLogFromServer()
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', itemToSelect.value);
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('refresh');
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', itemToSelect.value);
                    systemDiagnosticLogs.$formObj.form('set value', 'filename', itemToSelect.value);
                }, 100);
            } else {
                // Hide the dimmer after loading only if no file is selected
                if (!systemDiagnosticLogs.isAutoUpdateActive) {
                    systemDiagnosticLogs.$dimmer.removeClass('active');
                }
            }
        } else {
            // Hide the dimmer after loading only if no file is selected
            if (!systemDiagnosticLogs.isAutoUpdateActive) {
                systemDiagnosticLogs.$dimmer.removeClass('active');
            }
        }

        // Mark initialization as complete to allow hashchange handler to work
        setTimeout(() => {
            systemDiagnosticLogs.isInitializing = false;
        }, 200);
    },

    /**
     * Callback after changing the log file in the select dropdown.
     * @param {string} value - The selected value.
     */
    cbOnChangeFile(value) {
        if (value.length === 0) {
            return;
        }

        // Set dropdown text to show the full file path
        systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', value);

        systemDiagnosticLogs.$formObj.form('set value', 'filename', value);

        // Update URL hash with the selected file
        window.location.hash = 'file=' + encodeURIComponent(value);

        // Check if time range is available for this file
        systemDiagnosticLogs.checkTimeRangeAvailability(value);
    },

    /**
     * Check if time range is available for the selected log file
     * @param {string} filename - Log file path
     */
    async checkTimeRangeAvailability(filename) {
        // Show dimmer only if not in auto-update mode
        if (!systemDiagnosticLogs.isAutoUpdateActive) {
            systemDiagnosticLogs.$dimmer.addClass('active');
        }

        try {
            // Try to get time range for this file
            SyslogAPI.getLogTimeRange(filename, (response) => {
                if (response && response.result && response.data && response.data.time_range) {
                    // Time range is available - use time-based navigation
                    systemDiagnosticLogs.initializeNavigation(response.data);
                } else {
                    // Time range not available - use line number fallback
                    systemDiagnosticLogs.initializeNavigation(null);
                }
            });
        } catch (error) {
            console.error('Error checking time range:', error);
            // Fallback to line number mode
            systemDiagnosticLogs.initializeNavigation(null);
        }
    },

    /**
     * Initialize universal navigation with time or line number mode
     * @param {object} timeRangeData - Time range data from API (optional)
     */
    initializeNavigation(timeRangeData) {
        if (timeRangeData && timeRangeData.time_range) {
            // Time-based mode
            this.timeSliderEnabled = true;
            this.currentTimeRange = timeRangeData.time_range;

            // Show period buttons for time-based navigation
            $('#period-buttons').show();

            // Set server timezone offset
            if (timeRangeData.server_timezone_offset !== undefined) {
                SVGTimeline.serverTimezoneOffset = timeRangeData.server_timezone_offset;
                console.log('Time mode - Server timezone offset:', timeRangeData.server_timezone_offset, 'seconds');
            }

            // Initialize SVG timeline with time range
            SVGTimeline.initialize('#time-slider-container', this.currentTimeRange);

            // Set callback for time window changes
            SVGTimeline.onRangeChange = (start, end) => {
                systemDiagnosticLogs.loadLogByTimeRange(start, end);
            };

            // Load initial chunk (last hour by default)
            const oneHour = 3600;
            const initialStart = Math.max(this.currentTimeRange.end - oneHour, this.currentTimeRange.start);
            this.loadLogByTimeRange(initialStart, this.currentTimeRange.end);
        } else {
            // Line number fallback mode
            this.timeSliderEnabled = false;
            this.currentTimeRange = null;

            // Hide period buttons in line number mode
            $('#period-buttons').hide();

            // Initialize SVG timeline with line numbers
            // For now, use default range until we get total line count
            const lineRange = { start: 0, end: 10000 };
            SVGTimeline.initialize('#time-slider-container', lineRange, 'lines');

            // Set callback for line range changes
            SVGTimeline.onRangeChange = (start, end) => {
                // Load by line numbers (offset/lines)
                systemDiagnosticLogs.loadLogByLines(Math.floor(start), Math.ceil(end - start));
            };

            // Load initial lines
            this.updateLogFromServer();
        }
    },

    /**
     * Load log by line numbers (for files without timestamps)
     * @param {number} offset - Starting line number
     * @param {number} lines - Number of lines to load
     */
    loadLogByLines(offset, lines) {
        // Show dimmer only if not in auto-update mode
        if (!systemDiagnosticLogs.isAutoUpdateActive) {
            systemDiagnosticLogs.$dimmer.addClass('active');
        }

        const params = {
            filename: this.$formObj.form('get value', 'filename'),
            filter: this.$formObj.form('get value', 'filter') || '',
            logLevel: this.$formObj.form('get value', 'logLevel') || '',
            offset: Math.max(0, offset),
            lines: Math.min(5000, Math.max(100, lines))
        };

        SyslogAPI.getLogFromFile(params, (response) => {
            // Hide dimmer only if not in auto-update mode
            if (!systemDiagnosticLogs.isAutoUpdateActive) {
                systemDiagnosticLogs.$dimmer.removeClass('active');
            }
            if (response && response.result && response.data && 'content' in response.data) {
                // Set content in editor (even if empty)
                this.viewer.setValue(response.data.content || '', -1);

                // Go to the beginning
                this.viewer.gotoLine(1);
                this.viewer.scrollToLine(0, true, true, () => {});
            }
        });
    },

    /**
     * Load log by time range
     * @param {number} startTimestamp - Start timestamp
     * @param {number} endTimestamp - End timestamp
     */
    async loadLogByTimeRange(startTimestamp, endTimestamp) {
        // Show dimmer only if not in auto-update mode
        if (!systemDiagnosticLogs.isAutoUpdateActive) {
            systemDiagnosticLogs.$dimmer.addClass('active');
        }

        const params = {
            filename: this.$formObj.form('get value', 'filename'),
            filter: this.$formObj.form('get value', 'filter') || '',
            logLevel: this.$formObj.form('get value', 'logLevel') || '',
            dateFrom: startTimestamp,
            dateTo: endTimestamp,
            lines: 5000 // Maximum lines to load
        };

        try {
            SyslogAPI.getLogFromFile(params, (response) => {
                if (response && response.result && response.data && 'content' in response.data) {
                    // Set content in editor (even if empty)
                    this.viewer.setValue(response.data.content || '', -1);

                    // Go to the end of the log
                    const row = this.viewer.session.getLength() - 1;
                    const column = this.viewer.session.getLine(row).length;
                    this.viewer.gotoLine(row + 1, column);

                    // Adjust slider to actual loaded time range (silently)
                    if (response.data.actual_range) {
                        const actual = response.data.actual_range;

                        // Update SVGTimeline selected range to match actual loaded data
                        // This updates the slider to show the real time range that was loaded
                        SVGTimeline.updateSelectedRange(actual.start, actual.end);

                        // Log for debugging only
                        if (actual.truncated) {
                            console.log(
                                `Log data limited to ${actual.lines_count} lines. ` +
                                `Showing time range: [${actual.start} - ${actual.end}]`
                            );
                        }
                    }
                }

                // Hide dimmer only if not in auto-update mode
                if (!systemDiagnosticLogs.isAutoUpdateActive) {
                    systemDiagnosticLogs.$dimmer.removeClass('active');
                }
            });
        } catch (error) {
            console.error('Error loading log by time range:', error);
            // Hide dimmer only if not in auto-update mode
            if (!systemDiagnosticLogs.isAutoUpdateActive) {
                systemDiagnosticLogs.$dimmer.removeClass('active');
            }
        }
    },

    /**
     * Apply quick period selection
     * @param {string|number} period - Period identifier or seconds
     */
    applyQuickPeriod(period) {
        if (!this.currentTimeRange) {
            return;
        }

        let start;
        let end = this.currentTimeRange.end;

        if (period === 'today') {
            // Today from 00:00
            const now = new Date(end * 1000);
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            start = Math.floor(todayStart.getTime() / 1000);
        } else {
            // Period in seconds
            const seconds = parseInt(period);
            start = Math.max(end - seconds, this.currentTimeRange.start);
        }

        // Update SVG timeline
        SVGTimeline.setRange(start, end);
        this.loadLogByTimeRange(start, end);
    },

    /**
     * Apply log level filter
     * @param {string} level - Log level (all, error, warning, info, debug)
     */
    applyLogLevelFilter(level) {
        let filterPattern = '';

        // Create regex pattern based on level
        switch (level) {
            case 'error':
                filterPattern = 'ERROR|CRITICAL|FATAL';
                break;
            case 'warning':
                filterPattern = 'WARNING|WARN';
                break;
            case 'info':
                filterPattern = 'INFO';
                break;
            case 'debug':
                filterPattern = 'DEBUG';
                break;
            case 'all':
            default:
                filterPattern = '';
                break;
        }

        // Update filter field
        this.$formObj.form('set value', 'filter', filterPattern);

        // Reload logs with new filter
        this.updateLogFromServer();
    },

    /**
     * Fetches the log file content from the server.
     */
    updateLogFromServer() {
        if (this.timeSliderEnabled) {
            // In time slider mode, reload current window
            if (this.currentTimeRange) {
                // In time slider mode, reload last hour
                const oneHour = 3600;
                const startTimestamp = Math.max(this.currentTimeRange.end - oneHour, this.currentTimeRange.start);
                this.loadLogByTimeRange(
                    startTimestamp,
                    this.currentTimeRange.end
                );
            }
        } else {
            // Line number mode
            const params = systemDiagnosticLogs.$formObj.form('get values');
            params.lines = 5000; // Max lines
            SyslogAPI.getLogFromFile(params, systemDiagnosticLogs.cbUpdateLogText);
        }
    },

    /**
     * Updates the log view.
     * @param {Object} response - The response from API.
     */
    cbUpdateLogText(response) {
        // Hide dimmer only if not in auto-update mode
        if (!systemDiagnosticLogs.isAutoUpdateActive) {
            systemDiagnosticLogs.$dimmer.removeClass('active');
        }

        // Handle v3 API response structure
        if (!response || !response.result) {
            if (response && response.messages) {
                UserMessage.showMultiString(response.messages);
            }
            return;
        }

        const content = response.data?.content || '';
        systemDiagnosticLogs.viewer.getSession().setValue(content);
        const row = systemDiagnosticLogs.viewer.session.getLength() - 1;
        const column = systemDiagnosticLogs.viewer.session.getLine(row).length;
        systemDiagnosticLogs.viewer.gotoLine(row + 1, column);
    },

    /**
     * Callback after clicking the "Download File" button.
     * @param {Object} response - The response data.
     */
    cbDownloadFile(response) {
        // Handle v3 API response structure
        if (response && response.result && response.data) {
            window.location = response.data.filename || response.data;
        } else if (response && response.messages) {
            UserMessage.showMultiString(response.messages);
        }
    },

    /**
     * Callback after clicking the "Erase File" button.
     */
    eraseCurrentFileContent(){
        const fileName = systemDiagnosticLogs.$formObj.form('get value', 'filename');
        if (fileName.length>0){
            SyslogAPI.eraseFile(fileName, systemDiagnosticLogs.cbAfterFileErased)
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