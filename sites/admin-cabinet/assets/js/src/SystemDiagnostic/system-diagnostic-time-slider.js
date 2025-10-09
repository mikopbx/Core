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

/**
 * Time slider component for log navigation
 * Provides visual time range selection for log viewing
 * Uses Fomantic UI Slider module
 *
 * @module TimeSlider
 */
const TimeSlider = {
    /**
     * jQuery container for the slider
     * @type {jQuery}
     */
    $container: null,

    /**
     * jQuery slider element
     * @type {jQuery}
     */
    $slider: null,

    /**
     * Time range boundaries (start and end timestamps)
     * @type {object}
     */
    timeRange: null,

    /**
     * Server timezone offset in seconds
     * @type {number}
     */
    serverTimezoneOffset: 0,

    /**
     * Current selected time window
     * @type {object}
     */
    currentWindow: {
        start: null,
        end: null
    },

    /**
     * Debounce timer for slider changes
     * @type {number}
     */
    debounceTimer: null,

    /**
     * Debounce delay in milliseconds
     * @type {number}
     */
    debounceDelay: 500,

    /**
     * Initialize time slider
     * @param {string|jQuery} container - Container selector or jQuery object
     * @param {object} timeRange - Time range with start and end timestamps
     */
    initialize(container, timeRange) {
        this.$container = $(container);
        this.timeRange = timeRange;

        // Create slider HTML structure
        this.createSliderStructure();

        // Initialize Fomantic UI Slider
        this.initializeSlider();

        // Set initial window (last hour by default)
        const oneHour = 3600;
        const initialStart = Math.max(timeRange.end - oneHour, timeRange.start);
        this.setTimeWindow(initialStart, timeRange.end, false);
    },

    /**
     * Create HTML structure for the slider
     */
    createSliderStructure() {
        this.$container.html(`
            <div class="slider-wrapper">
                <div class="ui range slider" id="time-range-slider"></div>
                <div class="slider-tooltips">
                    <div class="slider-tooltip start-tooltip" id="start-tooltip"></div>
                    <div class="slider-tooltip end-tooltip" id="end-tooltip"></div>
                </div>
            </div>
        `);
    },

    /**
     * Initialize Fomantic UI Slider component
     */
    initializeSlider() {
        this.$slider = this.$container.find('#time-range-slider');

        // Initialize Fomantic UI slider without automatic labels
        this.$slider.slider({
            min: this.timeRange.start,
            max: this.timeRange.end,
            start: this.timeRange.start,
            end: this.timeRange.end,
            step: 1,
            onChange: (_, thumbVal, secondThumbVal) => {
                // Called when slider value changes
                this.handleSliderChange(thumbVal, secondThumbVal);
            },
            onMove: (_, thumbVal, secondThumbVal) => {
                // Called while dragging
                this.handleSliderMove(thumbVal, secondThumbVal);
            }
        });

        // Initialize custom tooltips
        this.initializeTooltips();

        // Add custom time labels
        this.addTimeLabels();
    },

    /**
     * Add custom time labels to the slider
     */
    addTimeLabels() {
        const $labelsContainer = $('<div>', {
            class: 'time-labels-container'
        });

        const timeRangeDuration = this.timeRange.end - this.timeRange.start;
        const numberOfLabels = 6; // Fixed number of labels

        // Calculate step for labels
        const labelStep = timeRangeDuration / (numberOfLabels - 1);

        // Create labels
        for (let i = 0; i < numberOfLabels; i++) {
            const timestamp = Math.round(this.timeRange.start + (labelStep * i));
            const position = (i / (numberOfLabels - 1)) * 100; // Position in percentage

            const $label = $('<div>', {
                class: 'time-label-mark',
                css: {
                    left: `${position}%`
                },
                text: this.formatTimestampShort(timestamp)
            });

            $labelsContainer.append($label);
        }

        // Append labels container to slider wrapper
        this.$container.find('.slider-wrapper').append($labelsContainer);
    },

    /**
     * Initialize custom tooltips with formatting
     */
    initializeTooltips() {
        // Update tooltip positions initially
        this.updateTooltipPositions();

        // Update tooltip content
        this.updateTooltipContent(this.timeRange.start, this.timeRange.end);
    },

    /**
     * Update custom tooltip positions based on thumb positions
     */
    updateTooltipPositions() {
        const $startTooltip = $('#start-tooltip');
        const $endTooltip = $('#end-tooltip');
        const $startThumb = this.$slider.find('.thumb:first');
        const $endThumb = this.$slider.find('.thumb:last');

        if ($startThumb.length && $startTooltip.length) {
            const startLeft = $startThumb.position().left;
            $startTooltip.css({
                left: `${startLeft}px`,
                display: 'block'
            });
        }

        if ($endThumb.length && $endTooltip.length) {
            const endLeft = $endThumb.position().left;
            $endTooltip.css({
                left: `${endLeft}px`,
                display: 'block'
            });
        }
    },

    /**
     * Update custom tooltip content with formatted timestamps
     * @param {number} start - Start timestamp
     * @param {number} end - End timestamp
     */
    updateTooltipContent(start, end) {
        const $startTooltip = $('#start-tooltip');
        const $endTooltip = $('#end-tooltip');

        if ($startTooltip.length) {
            $startTooltip.text(this.formatTimestamp(start));
        }

        if ($endTooltip.length) {
            $endTooltip.text(this.formatTimestamp(end));
        }

        // Update positions after content change
        this.updateTooltipPositions();
    },

    /**
     * Handle slider move events (update tooltips in real-time)
     * @param {number} thumbVal - First thumb value (start)
     * @param {number} secondThumbVal - Second thumb value (end)
     */
    handleSliderMove(thumbVal, secondThumbVal) {
        // Update tooltips during slider movement
        const start = parseInt(thumbVal);
        const end = parseInt(secondThumbVal);
        this.updateTooltipContent(start, end);
    },

    /**
     * Handle slider change events (after user stops dragging)
     * @param {number} thumbVal - First thumb value (start)
     * @param {number} secondThumbVal - Second thumb value (end)
     */
    handleSliderChange(thumbVal, secondThumbVal) {
        const start = parseInt(thumbVal);
        const end = parseInt(secondThumbVal);

        // Update tooltips
        this.updateTooltipContent(start, end);

        // Debounce the callback to avoid too many API calls
        this.debouncedWindowChange(start, end);
    },

    /**
     * Set time window programmatically
     * @param {number} start - Start timestamp
     * @param {number} end - End timestamp
     * @param {boolean} triggerCallback - Whether to trigger onChange callback
     */
    setTimeWindow(start, end, triggerCallback = true) {
        this.currentWindow.start = start;
        this.currentWindow.end = end;

        // Update slider position
        if (this.$slider && this.$slider.length) {
            this.$slider.slider('set rangeValue', start, end);
        }

        // Update tooltips
        this.updateTooltipContent(start, end);

        // Trigger callback if requested
        if (triggerCallback && this.onWindowChange) {
            this.onWindowChange(start, end);
        }
    },

    /**
     * Format timestamp to readable date/time string (server time)
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Formatted date/time string (YYYY-MM-DD HH:MM:SS)
     */
    formatTimestamp(timestamp) {
        const date = new Date((timestamp + this.serverTimezoneOffset) * 1000);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    /**
     * Format timestamp to short time string for slider labels (server time)
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Formatted time string (HH:MM or DD HH:MM)
     */
    formatTimestampShort(timestamp) {
        const date = new Date((timestamp + this.serverTimezoneOffset) * 1000);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');

        // Calculate time range duration
        const timeRangeDuration = this.timeRange.end - this.timeRange.start;

        // If range is more than 1 day, show day + time, otherwise just time
        if (timeRangeDuration > 86400) {
            return `${day} ${hours}:${minutes}`;
        } else {
            return `${hours}:${minutes}`;
        }
    },

    /**
     * Debounced window change handler
     * @param {number} start - Start timestamp
     * @param {number} end - End timestamp
     */
    debouncedWindowChange(start, end) {
        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Set new timer
        this.debounceTimer = setTimeout(() => {
            this.currentWindow.start = start;
            this.currentWindow.end = end;

            if (this.onWindowChange) {
                this.onWindowChange(start, end);
            }
        }, this.debounceDelay);
    },

    /**
     * Callback function when time window changes
     * This should be overridden by the parent module
     */
    onWindowChange() {
        // To be overridden by parent module
        // Will receive (start, end) parameters when called
    },

    /**
     * Destroy slider and cleanup
     */
    destroy() {
        if (this.$slider && this.$slider.length) {
            this.$slider.slider('destroy');
            this.$slider = null;
        }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        if (this.$container) {
            this.$container.empty();
        }
    }
};
