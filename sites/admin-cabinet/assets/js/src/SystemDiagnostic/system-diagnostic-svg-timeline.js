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
     * Time range boundaries
     * @type {object}
     */
    timeRange: null,

    /**
     * Server timezone offset in seconds
     * @type {number}
     */
    serverTimezoneOffset: 0,

    /**
     * Current selected range
     * @type {object}
     */
    selectedRange: {
        start: null,
        end: null
    },

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
        startLeft: 0,
        startRight: 0
    },

    /**
     * Initialize timeline
     * @param {string|HTMLElement} container - Container selector or element
     * @param {object} timeRange - Time range with start and end timestamps
     */
    initialize(container, timeRange) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!this.container) {
            console.error('Timeline container not found');
            return;
        }

        this.timeRange = timeRange;
        this.dimensions.width = this.container.offsetWidth;

        // Set initial selection (last hour)
        const oneHour = 3600;
        this.selectedRange.end = timeRange.end;
        this.selectedRange.start = Math.max(timeRange.end - oneHour, timeRange.start);

        // Create SVG structure
        this.createSVG();
        this.render();
        this.attachEvents();

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    },

    /**
     * Calculate adaptive time step based on range duration
     * @param {number} duration - Duration in seconds
     * @returns {object} Step configuration {value, label}
     */
    calculateAdaptiveStep(duration) {
        // Time steps in seconds with labels
        const steps = [
            { value: 300, label: '5 min', format: 'HH:MM' },        // 5 minutes
            { value: 1800, label: '30 min', format: 'HH:MM' },      // 30 minutes
            { value: 3600, label: '1 hour', format: 'HH:MM' },      // 1 hour
            { value: 43200, label: '12 hours', format: 'HH:MM' },   // 0.5 day
            { value: 86400, label: '1 day', format: 'MM-DD' }       // 1 day
        ];

        // Calculate optimal number of labels (between 4 and 16)
        const targetLabels = 8;

        for (let i = 0; i < steps.length; i++) {
            const numLabels = Math.floor(duration / steps[i].value);
            if (numLabels <= targetLabels * 2 && numLabels >= 2) {
                return steps[i];
            }
        }

        // For very short durations, use smallest step
        if (duration < steps[0].value * 2) {
            return steps[0];
        }

        // For very long durations, use largest step
        return steps[steps.length - 1];
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
     */
    drawTicks() {
        const { start, end } = this.timeRange;
        const duration = end - start;
        const { width, height, padding } = this.dimensions;
        const availableWidth = width - (padding * 2);

        console.log('drawTicks:', { start, end, duration, width, availableWidth });

        // Get adaptive step for this time range
        const step = this.calculateAdaptiveStep(duration);
        console.log('Adaptive step:', step);

        // Round start to nearest step interval
        const roundedStart = Math.floor(start / step.value) * step.value;
        console.log('roundedStart:', roundedStart);

        // Draw major ticks at discrete intervals
        let timestamp = roundedStart;
        let tickCount = 0;
        while (timestamp <= end) {
            if (timestamp >= start) {
                const x = padding + ((timestamp - start) / duration) * availableWidth;

                // Major tick - bottom (compact)
                this.drawTick(x, height - 6, 4, '#767676');

                // Label - centered vertically (compact)
                this.drawLabel(x, height / 2 + 3, this.formatTime(timestamp));
                tickCount++;
            }
            timestamp += step.value;
        }
        console.log('Drew', tickCount, 'ticks');

        // Draw minor ticks between major ones (5 per interval)
        timestamp = roundedStart;
        const minorStep = step.value / 5;
        while (timestamp <= end) {
            if (timestamp >= start) {
                const x = padding + ((timestamp - start) / duration) * availableWidth;

                // Only draw if not a major tick position (compact)
                if ((timestamp - roundedStart) % step.value !== 0) {
                    this.drawTick(x, height - 5, 2, '#d4d4d5');
                }
            }
            timestamp += minorStep;
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
        const charWidth = 6; // Average character width for font-size 11px
        return {
            width: text.length * charWidth,
            height: fontSize + 2
        };
    },

    /**
     * Draw selection range
     */
    drawSelection() {
        const { start, end } = this.timeRange;
        const duration = end - start;
        const { width, padding } = this.dimensions;
        const availableWidth = width - (padding * 2);

        const leftPercent = ((this.selectedRange.start - start) / duration) * 100;
        const rightPercent = ((this.selectedRange.end - start) / duration) * 100;
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
     * Draw "Now" line
     */
    drawNowLine() {
        const { start, end } = this.timeRange;
        const now = Math.floor(Date.now() / 1000);

        if (now < start || now > end) return;

        const duration = end - start;
        const { width, padding } = this.dimensions;
        const availableWidth = width - (padding * 2);

        const x = padding + ((now - start) / duration) * availableWidth;

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
     * @returns {string} Formatted time (HH:MM) in server timezone
     */
    formatTime(timestamp) {
        // Create date from UTC timestamp, then add server offset to get milliseconds
        // serverTimezoneOffset is in seconds, timestamp is in seconds
        const serverTimeMs = (timestamp + this.serverTimezoneOffset) * 1000;
        const date = new Date(serverTimeMs);

        // Use getUTCHours/Minutes because we've already adjusted the timestamp
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');

        // Debug for first call
        if (!this._debugLogged) {
            console.log('formatTime debug:', {
                originalTimestamp: timestamp,
                serverOffsetSeconds: this.serverTimezoneOffset,
                serverOffsetHours: this.serverTimezoneOffset / 3600,
                serverTimeMs: serverTimeMs,
                formatted: `${hours}:${minutes}`,
                dateUTC: new Date(timestamp * 1000).toISOString(),
                dateServer: date.toISOString()
            });
            this._debugLogged = true;
        }

        return `${hours}:${minutes}`;
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

        const rect = this.container.getBoundingClientRect();
        this.dragging.containerLeft = rect.left;
        this.dragging.containerWidth = rect.width;

        e.preventDefault();
    },

    /**
     * Handle mouse move
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (!this.dragging.active) return;

        const deltaX = e.clientX - this.dragging.startX;
        const { padding } = this.dimensions;
        const availableWidth = this.dragging.containerWidth - (padding * 2);
        const duration = this.timeRange.end - this.timeRange.start;

        const deltaTime = (deltaX / availableWidth) * duration;

        if (this.dragging.handle === 'left') {
            let newStart = this.selectedRange.start + deltaTime;
            newStart = Math.max(this.timeRange.start, Math.min(newStart, this.selectedRange.end - 60));
            this.selectedRange.start = newStart;
        } else if (this.dragging.handle === 'right') {
            let newEnd = this.selectedRange.end + deltaTime;
            newEnd = Math.min(this.timeRange.end, Math.max(newEnd, this.selectedRange.start + 60));
            this.selectedRange.end = newEnd;
        } else if (this.dragging.handle === 'range') {
            const rangeWidth = this.selectedRange.end - this.selectedRange.start;
            let newStart = this.selectedRange.start + deltaTime;
            let newEnd = this.selectedRange.end + deltaTime;

            if (newStart < this.timeRange.start) {
                newStart = this.timeRange.start;
                newEnd = newStart + rangeWidth;
            } else if (newEnd > this.timeRange.end) {
                newEnd = this.timeRange.end;
                newStart = newEnd - rangeWidth;
            }

            this.selectedRange.start = newStart;
            this.selectedRange.end = newEnd;
        }

        this.dragging.startX = e.clientX;
        this.render();
    },

    /**
     * Handle mouse up
     */
    handleMouseUp() {
        if (this.dragging.active) {
            this.dragging.active = false;
            this.dragging.handle = null;

            // Trigger callback
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
     * Set selected range
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
     * @param {number} start - Actual start timestamp
     * @param {number} end - Actual end timestamp
     */
    updateSelectedRange(start, end) {
        this.selectedRange.start = start;
        this.selectedRange.end = end;
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
