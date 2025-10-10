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
 * SVG Timeline component for log navigation
 * Grafana-style timeline with range selection
 *
 * @module SVGTimeline
 */
const SVGTimeline = {
    /**
     * Container element
     * @type {HTMLElement}
     */
    container: null,

    /**
     * SVG element
     * @type {SVGElement}
     */
    svg: null,

    /**
     * Full available range (entire log file)
     * @type {object}
     */
    fullRange: {
        start: null,
        end: null
    },

    /**
     * Visible range on timeline (controlled by period buttons and zoom)
     * @type {object}
     */
    visibleRange: {
        start: null,
        end: null
    },

    /**
     * Selected range for data loading (always 1/4 of visibleRange, centered)
     * @type {object}
     */
    selectedRange: {
        start: null,
        end: null
    },

    /**
     * Server timezone offset in seconds
     * @type {number}
     */
    serverTimezoneOffset: 0,

    /**
     * Dimensions - compact version
     * @type {object}
     */
    dimensions: {
        width: 0,
        height: 24,
        padding: 8
    },

    /**
     * Dragging state
     * @type {object}
     */
    dragging: {
        active: false,
        handle: null, // 'left', 'right', 'range'
        startX: 0,
        startSelectedStart: 0,
        startSelectedEnd: 0
    },

    /**
     * Initialize timeline (Yandex Cloud LogViewer style)
     * @param {string|HTMLElement} container - Container selector or element
     * @param {object} timeRange - Full time range with start and end timestamps
     */
    initialize(container, timeRange) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!this.container) {
            console.error('Timeline container not found');
            return;
        }

        // Store full range (entire log file)
        this.fullRange.start = timeRange.start;
        this.fullRange.end = timeRange.end;
        this.dimensions.width = this.container.offsetWidth;

        // Determine initial visible range based on total duration
        const totalDuration = timeRange.end - timeRange.start;
        let initialVisibleDuration;

        if (totalDuration > 86400 * 7) {
            // If logs span more than 7 days, show last 24 hours as visible
            initialVisibleDuration = 86400; // 24 hours
        } else if (totalDuration > 86400) {
            // If logs span 1-7 days, show last 12 hours
            initialVisibleDuration = 43200; // 12 hours
        } else if (totalDuration > 3600 * 6) {
            // If logs span 6-24 hours, show last 6 hours
            initialVisibleDuration = 21600; // 6 hours
        } else {
            // For shorter logs, show entire range
            initialVisibleDuration = totalDuration;
        }

        // Set visible range (what user sees on timeline)
        this.visibleRange.end = timeRange.end;
        this.visibleRange.start = Math.max(timeRange.end - initialVisibleDuration, timeRange.start);

        // Calculate selected range as 1/4 of visible range, centered
        this.calculateCenteredSelection();

        // Create SVG structure
        this.createSVG();
        this.render();
        this.attachEvents();

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    },

    /**
     * Calculate centered selection (1/4 of visible range, positioned at center)
     */
    calculateCenteredSelection() {
        const visibleDuration = this.visibleRange.end - this.visibleRange.start;
        const selectedDuration = visibleDuration / 4;
        const visibleCenter = this.visibleRange.start + (visibleDuration / 2);

        this.selectedRange.start = visibleCenter - (selectedDuration / 2);
        this.selectedRange.end = visibleCenter + (selectedDuration / 2);

        // Ensure selected range stays within visible range
        if (this.selectedRange.start < this.visibleRange.start) {
            this.selectedRange.start = this.visibleRange.start;
            this.selectedRange.end = this.visibleRange.start + selectedDuration;
        }
        if (this.selectedRange.end > this.visibleRange.end) {
            this.selectedRange.end = this.visibleRange.end;
            this.selectedRange.start = this.visibleRange.end - selectedDuration;
        }
    },

    /**
     * Calculate adaptive time step based on range duration and available width
     * Ensures labels are not closer than 2cm (~75px at standard DPI)
     *
     * @param {number} duration - Duration in seconds
     * @param {number} availableWidth - Available width in pixels
     * @returns {object} Step configuration {value, label, format}
     */
    calculateAdaptiveStep(duration, availableWidth) {
        // Time steps in seconds with labels (from smallest to largest)
        const steps = [
            { value: 1, label: '1 sec', format: 'HH:MM:SS' },        // 1 second
            { value: 5, label: '5 sec', format: 'HH:MM:SS' },        // 5 seconds
            { value: 10, label: '10 sec', format: 'HH:MM:SS' },      // 10 seconds
            { value: 30, label: '30 sec', format: 'HH:MM:SS' },      // 30 seconds
            { value: 60, label: '1 min', format: 'HH:MM' },          // 1 minute
            { value: 300, label: '5 min', format: 'HH:MM' },         // 5 minutes
            { value: 600, label: '10 min', format: 'HH:MM' },        // 10 minutes
            { value: 1800, label: '30 min', format: 'HH:MM' },       // 30 minutes
            { value: 3600, label: '1 hour', format: 'HH:MM' },       // 1 hour
            { value: 10800, label: '3 hours', format: 'HH:MM' },     // 3 hours
            { value: 21600, label: '6 hours', format: 'HH:MM' },     // 6 hours
            { value: 43200, label: '12 hours', format: 'HH:MM' },    // 12 hours
            { value: 86400, label: '1 day', format: 'MM-DD' },       // 1 day
            { value: 259200, label: '3 days', format: 'MM-DD' },     // 3 days
            { value: 604800, label: '1 week', format: 'MM-DD' },     // 7 days
            { value: 2592000, label: '1 month', format: 'MM-DD' }    // 30 days
        ];

        // Minimum spacing between labels: 2cm ≈ 75px (at 96 DPI)
        // Using 80px to be safe and account for label width
        const minSpacingPx = 80;

        // Calculate maximum number of labels that fit with minimum spacing
        const maxLabels = Math.floor(availableWidth / minSpacingPx);

        // Ensure at least 2 labels, but not more than available space allows
        const targetMinLabels = Math.max(2, Math.min(4, maxLabels));
        const targetMaxLabels = Math.max(targetMinLabels, maxLabels);

        // Find step that produces appropriate number of labels
        for (let i = 0; i < steps.length; i++) {
            const numLabels = Math.floor(duration / steps[i].value);

            // Check if this step produces acceptable number of labels
            if (numLabels >= targetMinLabels && numLabels <= targetMaxLabels) {
                return steps[i];
            }
        }

        // If no perfect match, find closest match
        let bestStep = steps[0];
        let bestDiff = Infinity;

        for (let i = 0; i < steps.length; i++) {
            const numLabels = Math.floor(duration / steps[i].value);

            // For very short durations, prefer step that produces at least 2 labels
            if (duration < steps[0].value * targetMinLabels) {
                if (numLabels >= 2) {
                    return steps[i];
                }
                continue;
            }

            // Calculate difference from ideal range
            let diff;
            if (numLabels < targetMinLabels) {
                diff = (targetMinLabels - numLabels) * 2; // Penalize too few labels more
            } else if (numLabels > targetMaxLabels) {
                diff = numLabels - targetMaxLabels; // Penalize too many labels
            } else {
                diff = 0; // Within acceptable range
            }

            if (diff < bestDiff) {
                bestDiff = diff;
                bestStep = steps[i];
            }
        }

        return bestStep;
    },

    /**
     * Create SVG element
     */
    createSVG() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'timeline-svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', this.dimensions.height);

        this.container.innerHTML = '';
        this.container.appendChild(svg);
        this.svg = svg;
    },

    /**
     * Render timeline
     */
    render() {
        if (!this.svg) return;

        // Clear SVG
        this.svg.innerHTML = '';

        // Update width
        this.dimensions.width = this.container.offsetWidth;

        // Draw ticks and labels first (background layer)
        this.drawTicks();

        // Draw "Now" line (middle layer)
        this.drawNowLine();

        // Draw selection range last (foreground layer)
        this.drawSelection();
    },

    /**
     * Draw timeline ticks and labels
     * Uses VISIBLE range for adaptive scaling (Yandex Cloud style)
     */
    drawTicks() {
        const { width, height, padding } = this.dimensions;
        const availableWidth = width - (padding * 2);

        // Use visible range for both positioning and step calculation
        const visibleDuration = this.visibleRange.end - this.visibleRange.start;

        // Get adaptive step based on VISIBLE duration and available width
        const step = this.calculateAdaptiveStep(visibleDuration, availableWidth);

        // Round visible range to nearest step interval
        const roundedStart = Math.floor(this.visibleRange.start / step.value) * step.value;

        // Store major tick positions for collision detection
        const majorTickPositions = new Set();

        // Draw major ticks at discrete intervals within visible range
        let timestamp = roundedStart;
        while (timestamp <= this.visibleRange.end) {
            if (timestamp >= this.visibleRange.start) {
                // Calculate position relative to VISIBLE range (not full range!)
                const x = padding + ((timestamp - this.visibleRange.start) / visibleDuration) * availableWidth;
                majorTickPositions.add(Math.round(timestamp));

                // Major tick - bottom (compact)
                this.drawTick(x, height - 6, 4, '#767676');

                // Label - centered vertically (compact) with format from step
                this.drawLabel(x, height / 2 + 3, this.formatTime(timestamp, step.format));
            }
            timestamp += step.value;
        }

        // Draw minor ticks between major ones (5 per interval)
        let minorTimestamp = roundedStart;
        const minorStep = step.value / 5;
        while (minorTimestamp <= this.visibleRange.end) {
            if (minorTimestamp >= this.visibleRange.start) {
                // Check if this is not a major tick position
                const roundedMinorTimestamp = Math.round(minorTimestamp);
                if (!majorTickPositions.has(roundedMinorTimestamp)) {
                    // Calculate position relative to VISIBLE range
                    const x = padding + ((minorTimestamp - this.visibleRange.start) / visibleDuration) * availableWidth;
                    // Minor tick - shorter and lighter
                    this.drawTick(x, height - 5, 2, '#d4d4d5');
                }
            }
            minorTimestamp += minorStep;
        }
    },

    /**
     * Draw a single tick
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} height - Tick height
     * @param {string} color - Tick color
     */
    drawTick(x, y, height, color) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', y);
        line.setAttribute('x2', x);
        line.setAttribute('y2', y + height);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '1');
        this.svg.appendChild(line);
    },

    /**
     * Draw time label
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Label text
     */
    drawLabel(x, y, text) {
        // Create white background rectangle for label
        const bbox = this.getTextBBox(text);
        const padding = 3;

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', x - (bbox.width / 2) - padding);
        bg.setAttribute('y', y - bbox.height + 2);
        bg.setAttribute('width', bbox.width + (padding * 2));
        bg.setAttribute('height', bbox.height);
        bg.setAttribute('fill', '#fafafa');
        this.svg.appendChild(bg);

        // Create text label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', 'timeline-label');
        label.textContent = text;
        this.svg.appendChild(label);
    },

    /**
     * Get approximate bounding box for text
     * @param {string} text - Text content
     * @returns {object} Bounding box {width, height}
     */
    getTextBBox(text) {
        // Approximate size based on font size and character count
        const fontSize = 11;
        // Use monospace width for time labels (seconds format is longer)
        const charWidth = text.includes(':') ? 6.5 : 6; // Wider for time formats
        return {
            width: text.length * charWidth,
            height: fontSize + 2
        };
    },

    /**
     * Draw selection range (relative to visible range)
     */
    drawSelection() {
        const visibleDuration = this.visibleRange.end - this.visibleRange.start;
        const { width, padding } = this.dimensions;
        const availableWidth = width - (padding * 2);

        // Calculate position relative to VISIBLE range
        const leftPercent = ((this.selectedRange.start - this.visibleRange.start) / visibleDuration) * 100;
        const rightPercent = ((this.selectedRange.end - this.visibleRange.start) / visibleDuration) * 100;
        const widthPercent = rightPercent - leftPercent;

        const x = padding + (leftPercent / 100) * availableWidth;
        const w = (widthPercent / 100) * availableWidth;

        // Selection background
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', 0);
        rect.setAttribute('width', w);
        rect.setAttribute('height', this.dimensions.height);
        rect.setAttribute('class', 'timeline-selection');
        rect.setAttribute('data-handle', 'range');
        this.svg.appendChild(rect);

        // Left handle
        this.drawHandle(x, 'left');

        // Right handle
        this.drawHandle(x + w, 'right');
    },

    /**
     * Draw selection handle
     * @param {number} x - X position
     * @param {string} position - 'left' or 'right'
     */
    drawHandle(x, position) {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        handle.setAttribute('x', x - 3);
        handle.setAttribute('y', 0);
        handle.setAttribute('width', 6);
        handle.setAttribute('height', this.dimensions.height);
        handle.setAttribute('class', 'timeline-handle');
        handle.setAttribute('data-handle', position);
        this.svg.appendChild(handle);
    },

    /**
     * Draw "Now" line (relative to visible range)
     */
    drawNowLine() {
        const now = Math.floor(Date.now() / 1000);

        // Only draw if "now" is within visible range
        if (now < this.visibleRange.start || now > this.visibleRange.end) return;

        const visibleDuration = this.visibleRange.end - this.visibleRange.start;
        const { width, padding } = this.dimensions;
        const availableWidth = width - (padding * 2);

        // Calculate position relative to VISIBLE range
        const x = padding + ((now - this.visibleRange.start) / visibleDuration) * availableWidth;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', x);
        line.setAttribute('y2', this.dimensions.height);
        line.setAttribute('class', 'timeline-now');
        this.svg.appendChild(line);
    },

    /**
     * Format timestamp to time string (server time)
     * @param {number} timestamp - Unix timestamp in UTC
     * @param {string} format - Format type: 'HH:MM:SS', 'HH:MM', or 'MM-DD'
     * @returns {string} Formatted time/date in server timezone
     */
    formatTime(timestamp, format = 'HH:MM') {
        // Create date from UTC timestamp, then add server offset to get milliseconds
        // serverTimezoneOffset is in seconds, timestamp is in seconds
        const serverTimeMs = (timestamp + this.serverTimezoneOffset) * 1000;
        const date = new Date(serverTimeMs);

        if (format === 'MM-DD') {
            // Format as month-day for long ranges
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            return `${month}-${day}`;
        } else if (format === 'HH:MM:SS') {
            // Format as time with seconds for very short ranges
            const hours = String(date.getUTCHours()).padStart(2, '0');
            const minutes = String(date.getUTCMinutes()).padStart(2, '0');
            const seconds = String(date.getUTCSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        } else {
            // Format as time (HH:MM) for shorter ranges
            const hours = String(date.getUTCHours()).padStart(2, '0');
            const minutes = String(date.getUTCMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        }
    },

    /**
     * Attach mouse events
     */
    attachEvents() {
        this.svg.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
    },

    /**
     * Handle mouse down
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        const target = e.target;
        const handle = target.getAttribute('data-handle');

        if (!handle) return;

        this.dragging.active = true;
        this.dragging.handle = handle;
        this.dragging.startX = e.clientX;
        this.dragging.startSelectedStart = this.selectedRange.start;
        this.dragging.startSelectedEnd = this.selectedRange.end;

        const rect = this.container.getBoundingClientRect();
        this.dragging.containerLeft = rect.left;
        this.dragging.containerWidth = rect.width;

        e.preventDefault();
    },

    /**
     * Handle mouse move (Yandex Cloud LogViewer style)
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (!this.dragging.active) return;

        const deltaX = e.clientX - this.dragging.startX;
        const { padding } = this.dimensions;
        const availableWidth = this.dragging.containerWidth - (padding * 2);
        const visibleDuration = this.visibleRange.end - this.visibleRange.start;

        // Calculate time delta relative to VISIBLE range
        const deltaTime = (deltaX / availableWidth) * visibleDuration;

        if (this.dragging.handle === 'left') {
            // Resizing from left - adjust visible range accordingly
            let newStart = this.dragging.startSelectedStart + deltaTime;
            newStart = Math.max(this.fullRange.start, Math.min(newStart, this.selectedRange.end - 60));
            this.selectedRange.start = newStart;
        } else if (this.dragging.handle === 'right') {
            // Resizing from right - adjust visible range accordingly
            let newEnd = this.dragging.startSelectedEnd + deltaTime;
            newEnd = Math.min(this.fullRange.end, Math.max(newEnd, this.selectedRange.start + 60));
            this.selectedRange.end = newEnd;
        } else if (this.dragging.handle === 'range') {
            // Dragging entire range - move it within visible range
            const rangeWidth = this.selectedRange.end - this.selectedRange.start;
            let newStart = this.dragging.startSelectedStart + deltaTime;
            let newEnd = this.dragging.startSelectedEnd + deltaTime;

            // Keep within full range bounds
            if (newStart < this.fullRange.start) {
                newStart = this.fullRange.start;
                newEnd = newStart + rangeWidth;
            } else if (newEnd > this.fullRange.end) {
                newEnd = this.fullRange.end;
                newStart = newEnd - rangeWidth;
            }

            this.selectedRange.start = newStart;
            this.selectedRange.end = newEnd;
        }

        this.render();
    },

    /**
     * Handle mouse up (Yandex Cloud LogViewer style)
     * After drag: recenter and adjust visible range
     */
    handleMouseUp() {
        if (this.dragging.active) {
            const wasResizing = this.dragging.handle === 'left' || this.dragging.handle === 'right';
            const wasDragging = this.dragging.handle === 'range';

            this.dragging.active = false;
            this.dragging.handle = null;

            if (wasResizing) {
                // User resized selection → adjust visible range to be 4x selection
                // and recenter selection within new visible range
                const selectedDuration = this.selectedRange.end - this.selectedRange.start;
                const newVisibleDuration = selectedDuration * 4;
                const selectedCenter = this.selectedRange.start + (selectedDuration / 2);

                // Calculate new visible range centered on selection
                let newVisibleStart = selectedCenter - (newVisibleDuration / 2);
                let newVisibleEnd = selectedCenter + (newVisibleDuration / 2);

                // Keep within full range bounds
                if (newVisibleStart < this.fullRange.start) {
                    newVisibleStart = this.fullRange.start;
                    newVisibleEnd = Math.min(newVisibleStart + newVisibleDuration, this.fullRange.end);
                }
                if (newVisibleEnd > this.fullRange.end) {
                    newVisibleEnd = this.fullRange.end;
                    newVisibleStart = Math.max(newVisibleEnd - newVisibleDuration, this.fullRange.start);
                }

                this.visibleRange.start = newVisibleStart;
                this.visibleRange.end = newVisibleEnd;

                // Recalculate centered selection (1/4 of new visible range)
                this.calculateCenteredSelection();

                // Deactivate all period buttons
                if (typeof $ !== 'undefined') {
                    $('.period-btn').removeClass('active');
                }

            } else if (wasDragging) {
                // User dragged selection → shift visible range to keep selection centered
                const selectedCenter = this.selectedRange.start + ((this.selectedRange.end - this.selectedRange.start) / 2);
                const visibleDuration = this.visibleRange.end - this.visibleRange.start;

                // Calculate new visible range to keep selection at center
                let newVisibleStart = selectedCenter - (visibleDuration / 2);
                let newVisibleEnd = selectedCenter + (visibleDuration / 2);

                // Keep within full range bounds
                if (newVisibleStart < this.fullRange.start) {
                    newVisibleStart = this.fullRange.start;
                    newVisibleEnd = newVisibleStart + visibleDuration;
                }
                if (newVisibleEnd > this.fullRange.end) {
                    newVisibleEnd = this.fullRange.end;
                    newVisibleStart = newVisibleEnd - visibleDuration;
                }

                this.visibleRange.start = newVisibleStart;
                this.visibleRange.end = newVisibleEnd;

                // Recalculate centered selection
                this.calculateCenteredSelection();
            }

            // Render with new ranges
            this.render();

            // Trigger callback to load data
            if (this.onRangeChange) {
                this.onRangeChange(
                    Math.round(this.selectedRange.start),
                    Math.round(this.selectedRange.end)
                );
            }
        }
    },

    /**
     * Handle window resize
     */
    handleResize() {
        this.render();
    },

    /**
     * Apply period from quick-period-buttons (Yandex Cloud style)
     * Sets visible range and auto-centers selection
     * @param {number} periodSeconds - Period in seconds (e.g., 3600 for 1h)
     */
    applyPeriod(periodSeconds) {
        const period = parseInt(periodSeconds);

        // Set visible range to last N seconds
        this.visibleRange.end = this.fullRange.end;
        this.visibleRange.start = Math.max(this.fullRange.end - period, this.fullRange.start);

        // Auto-center selection (1/4 of visible range)
        this.calculateCenteredSelection();

        // Render
        this.render();

        // Trigger callback to load data
        if (this.onRangeChange) {
            this.onRangeChange(
                Math.round(this.selectedRange.start),
                Math.round(this.selectedRange.end)
            );
        }
    },

    /**
     * Set selected range (deprecated - use applyPeriod instead)
     * @param {number} start - Start timestamp
     * @param {number} end - End timestamp
     */
    setRange(start, end) {
        this.selectedRange.start = start;
        this.selectedRange.end = end;
        this.render();
    },

    /**
     * Update selected range to actual loaded data (without triggering onRangeChange)
     * Used when backend returns different range due to 5000 line limit
     * Synchronously updates both visible range and selected range to maintain 1/4 ratio
     * @param {number} start - Actual start timestamp
     * @param {number} end - Actual end timestamp
     */
    updateSelectedRange(start, end) {
        // Set selected range to actual loaded data
        this.selectedRange.start = start;
        this.selectedRange.end = end;

        // Calculate new visible range as 4x of selected range
        const selectedDuration = end - start;
        const newVisibleDuration = selectedDuration * 4;
        const selectedCenter = start + (selectedDuration / 2);

        // Center visible range around selected range
        let newVisibleStart = selectedCenter - (newVisibleDuration / 2);
        let newVisibleEnd = selectedCenter + (newVisibleDuration / 2);

        // Keep within full range bounds
        if (newVisibleStart < this.fullRange.start) {
            newVisibleStart = this.fullRange.start;
            newVisibleEnd = Math.min(newVisibleStart + newVisibleDuration, this.fullRange.end);
        }
        if (newVisibleEnd > this.fullRange.end) {
            newVisibleEnd = this.fullRange.end;
            newVisibleStart = Math.max(newVisibleEnd - newVisibleDuration, this.fullRange.start);
        }

        // Update visible range
        this.visibleRange.start = newVisibleStart;
        this.visibleRange.end = newVisibleEnd;

        // Recalculate centered selection to ensure 1/4 ratio is maintained
        this.calculateCenteredSelection();

        // Render with new ranges
        this.render();

        // Note: Does NOT trigger onRangeChange callback
    },

    /**
     * Callback when range changes
     * @param {number} start - Start timestamp
     * @param {number} end - End timestamp
     */
    onRangeChange(start, end) {
        // To be overridden
    },

    /**
     * Destroy timeline
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
};
