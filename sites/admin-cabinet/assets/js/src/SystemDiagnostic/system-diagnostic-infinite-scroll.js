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

/* global ace, SyslogAPI */

/**
 * Infinite scroll handler for ACE editor log viewer
 * Automatically loads previous/next log chunks when scrolling to boundaries
 *
 * @module InfiniteScroll
 */
const InfiniteScroll = {
    /**
     * ACE editor instance
     * @type {object}
     */
    aceEditor: null,

    /**
     * Loading state flags
     * @type {object}
     */
    loadingState: {
        top: false,
        bottom: false
    },

    /**
     * View state tracking current window and boundaries
     * @type {object}
     */
    viewState: {
        filename: '',
        filter: '',
        currentWindowStart: null,  // Current visible window start timestamp
        currentWindowEnd: null,    // Current visible window end timestamp
        totalStart: null,          // Total log file start timestamp
        totalEnd: null,            // Total log file end timestamp
        maxLines: 5000,            // Maximum lines in editor buffer
        chunkSize: 500,            // Lines to load per chunk
        currentLinesCount: 0       // Current number of lines in editor
    },

    /**
     * Scroll threshold percentage for triggering load
     * @type {number}
     */
    scrollThreshold: 0.1,

    /**
     * Initialize infinite scroll
     * @param {object} editor - ACE editor instance
     */
    initialize(editor) {
        this.aceEditor = editor;
        this.attachScrollListener();
    },

    /**
     * Attach scroll event listener to ACE editor
     */
    attachScrollListener() {
        if (!this.aceEditor) {
            console.error('ACE editor not initialized');
            return;
        }

        this.aceEditor.getSession().on('changeScrollTop', (scrollTop) => {
            this.handleScroll(scrollTop);
        });
    },

    /**
     * Handle scroll events
     * @param {number} scrollTop - Current scroll position
     */
    handleScroll(scrollTop) {
        const renderer = this.aceEditor.renderer;
        const totalHeight = renderer.layerConfig.maxHeight;
        const visibleHeight = renderer.$size.scrollerHeight;

        // Calculate threshold in pixels
        const threshold = visibleHeight * this.scrollThreshold;

        // Check if scrolled near top
        if (scrollTop < threshold && !this.loadingState.top) {
            this.loadPreviousChunk();
        }

        // Check if scrolled near bottom
        if (scrollTop + visibleHeight > totalHeight - threshold && !this.loadingState.bottom) {
            this.loadNextChunk();
        }
    },

    /**
     * Load previous chunk (scrolling up)
     */
    async loadPreviousChunk() {
        // Check if we reached the beginning
        if (this.viewState.currentWindowStart <= this.viewState.totalStart) {
            return;
        }

        // Check if time-based navigation is enabled
        if (!this.viewState.currentWindowStart || !this.viewState.totalStart) {
            return;
        }

        this.loadingState.top = true;
        this.showTopIndicator();

        try {
            // Calculate time window for previous chunk
            const timeWindow = this.calculatePreviousTimeWindow();

            // Fetch previous chunk
            const response = await this.fetchLogChunk({
                dateFrom: timeWindow.start,
                dateTo: timeWindow.end
            });

            if (response && response.result && response.data && response.data.content) {
                this.prependContent(response.data.content);
                this.viewState.currentWindowStart = timeWindow.start;

                // Trim bottom if exceeded max lines
                this.trimBottomIfNeeded();
            }
        } catch (error) {
            console.error('Error loading previous chunk:', error);
        } finally {
            this.hideTopIndicator();
            this.loadingState.top = false;
        }
    },

    /**
     * Load next chunk (scrolling down)
     */
    async loadNextChunk() {
        // Check if we reached the end
        if (this.viewState.currentWindowEnd >= this.viewState.totalEnd) {
            return;
        }

        // Check if time-based navigation is enabled
        if (!this.viewState.currentWindowEnd || !this.viewState.totalEnd) {
            return;
        }

        this.loadingState.bottom = true;
        this.showBottomIndicator();

        try {
            // Calculate time window for next chunk
            const timeWindow = this.calculateNextTimeWindow();

            // Fetch next chunk
            const response = await this.fetchLogChunk({
                dateFrom: timeWindow.start,
                dateTo: timeWindow.end
            });

            if (response && response.result && response.data && response.data.content) {
                this.appendContent(response.data.content);
                this.viewState.currentWindowEnd = timeWindow.end;

                // Trim top if exceeded max lines
                this.trimTopIfNeeded();
            }
        } catch (error) {
            console.error('Error loading next chunk:', error);
        } finally {
            this.hideBottomIndicator();
            this.loadingState.bottom = false;
        }
    },

    /**
     * Fetch log chunk from server
     * @param {object} params - Additional parameters (dateFrom, dateTo)
     * @returns {Promise} Promise with response data
     */
    fetchLogChunk(params) {
        return new Promise((resolve, reject) => {
            const requestParams = {
                filename: this.viewState.filename,
                filter: this.viewState.filter,
                lines: this.viewState.chunkSize,
                ...params
            };

            SyslogAPI.getLogFromFile(requestParams, (response) => {
                if (response && response.result) {
                    resolve(response);
                } else {
                    reject(new Error('Failed to fetch log chunk'));
                }
            });
        });
    },

    /**
     * Prepend content to the beginning of editor
     * @param {string} content - Content to prepend
     */
    prependContent(content) {
        if (!content || content.trim() === '') {
            return;
        }

        const currentContent = this.aceEditor.getValue();
        const currentRow = this.aceEditor.getCursorPosition().row;
        const addedLines = content.split('\n');
        const addedRowsCount = addedLines.length;

        // Combine content
        const newContent = content + '\n' + currentContent;

        // Update editor value
        this.aceEditor.setValue(newContent, -1);

        // Restore cursor position (adjusted for added lines)
        this.aceEditor.gotoLine(currentRow + addedRowsCount + 1, 0);

        // Update lines count
        this.viewState.currentLinesCount += addedRowsCount;
    },

    /**
     * Append content to the end of editor
     * @param {string} content - Content to append
     */
    appendContent(content) {
        if (!content || content.trim() === '') {
            return;
        }

        const currentContent = this.aceEditor.getValue();
        const currentPosition = this.aceEditor.getCursorPosition();
        const addedLines = content.split('\n');
        const addedRowsCount = addedLines.length;

        // Combine content
        const newContent = currentContent + '\n' + content;

        // Update editor value
        this.aceEditor.setValue(newContent, -1);

        // Restore cursor position
        this.aceEditor.gotoLine(currentPosition.row + 1, currentPosition.column);

        // Update lines count
        this.viewState.currentLinesCount += addedRowsCount;
    },

    /**
     * Trim lines from top if exceeded max lines
     */
    trimTopIfNeeded() {
        if (this.viewState.currentLinesCount <= this.viewState.maxLines) {
            return;
        }

        const linesToRemove = this.viewState.currentLinesCount - this.viewState.maxLines;
        const lines = this.aceEditor.getValue().split('\n');
        const trimmed = lines.slice(linesToRemove).join('\n');

        const currentRow = this.aceEditor.getCursorPosition().row;

        // Update editor
        this.aceEditor.setValue(trimmed, -1);

        // Adjust cursor position
        const newRow = Math.max(1, currentRow - linesToRemove);
        this.aceEditor.gotoLine(newRow, 0);

        // Update lines count
        this.viewState.currentLinesCount = this.viewState.maxLines;
    },

    /**
     * Trim lines from bottom if exceeded max lines
     */
    trimBottomIfNeeded() {
        if (this.viewState.currentLinesCount <= this.viewState.maxLines) {
            return;
        }

        const lines = this.aceEditor.getValue().split('\n');
        const trimmed = lines.slice(0, this.viewState.maxLines).join('\n');

        const currentPosition = this.aceEditor.getCursorPosition();

        // Update editor
        this.aceEditor.setValue(trimmed, -1);

        // Restore cursor position (should be within bounds)
        this.aceEditor.gotoLine(
            Math.min(currentPosition.row + 1, this.viewState.maxLines),
            currentPosition.column
        );

        // Update lines count
        this.viewState.currentLinesCount = this.viewState.maxLines;
    },

    /**
     * Calculate time window for previous chunk
     * @returns {object} Time window with start and end timestamps
     */
    calculatePreviousTimeWindow() {
        // Estimate average time per line
        const currentDuration = this.viewState.currentWindowEnd - this.viewState.currentWindowStart;
        const avgTimePerLine = currentDuration / Math.max(this.viewState.currentLinesCount, 1);

        // Calculate time interval for chunk
        const timeInterval = avgTimePerLine * this.viewState.chunkSize;

        const end = this.viewState.currentWindowStart;
        const start = Math.max(
            this.viewState.currentWindowStart - timeInterval,
            this.viewState.totalStart
        );

        return { start, end };
    },

    /**
     * Calculate time window for next chunk
     * @returns {object} Time window with start and end timestamps
     */
    calculateNextTimeWindow() {
        // Estimate average time per line
        const currentDuration = this.viewState.currentWindowEnd - this.viewState.currentWindowStart;
        const avgTimePerLine = currentDuration / Math.max(this.viewState.currentLinesCount, 1);

        // Calculate time interval for chunk
        const timeInterval = avgTimePerLine * this.viewState.chunkSize;

        const start = this.viewState.currentWindowEnd;
        const end = Math.min(
            this.viewState.currentWindowEnd + timeInterval,
            this.viewState.totalEnd
        );

        return { start, end };
    },

    /**
     * Show top loading indicator
     */
    showTopIndicator() {
        $('.loading-indicator.top').fadeIn(200);
    },

    /**
     * Hide top loading indicator
     */
    hideTopIndicator() {
        $('.loading-indicator.top').fadeOut(200);
    },

    /**
     * Show bottom loading indicator
     */
    showBottomIndicator() {
        $('.loading-indicator.bottom').fadeIn(200);
    },

    /**
     * Hide bottom loading indicator
     */
    hideBottomIndicator() {
        $('.loading-indicator.bottom').fadeOut(200);
    },

    /**
     * Reset infinite scroll state
     */
    reset() {
        this.loadingState.top = false;
        this.loadingState.bottom = false;
        this.viewState.currentWindowStart = null;
        this.viewState.currentWindowEnd = null;
        this.viewState.currentLinesCount = 0;
    }
};
