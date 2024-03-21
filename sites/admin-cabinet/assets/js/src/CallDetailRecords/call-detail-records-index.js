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

/* global globalRootUrl, SemanticLocalization, Extensions, moment, globalTranslate, CDRPlayer */

/**
 * callDetailRecords module.
 * @module callDetailRecords
 */
const callDetailRecords = {
    /**
     * The call detail records table element.
     * @type {jQuery}
     */
    $cdrTable: $('#cdr-table'),

    /**
     * The global search input element.
     * @type {jQuery}
     */
    $globalSearch: $('#globalsearch'),

    /**
     * The date range selector element.
     * @type {jQuery}
     */
    $dateRangeSelector: $('#date-range-selector'),

    /**
     * The data table object.
     * @type {Object}
     */
    dataTable: {},

    /**
     * An array of players.
     * @type {Array}
     */
    players: [],

    /**
     * Initializes the call detail records.
     */
    initialize() {
        callDetailRecords.initializeDateRangeSelector();

        callDetailRecords.$globalSearch.on('keyup', (e) => {
            if (e.keyCode === 13
                || e.keyCode === 8
                || callDetailRecords.$globalSearch.val().length === 0) {
                const text = `${callDetailRecords.$dateRangeSelector.val()} ${callDetailRecords.$globalSearch.val()}`;
                callDetailRecords.applyFilter(text);
            }
        });

        callDetailRecords.$cdrTable.dataTable({
            search: {
                search: `${callDetailRecords.$dateRangeSelector.val()} ${callDetailRecords.$globalSearch.val()}`,
            },
            serverSide: true,
            processing: true,
            columnDefs: [
                { defaultContent: "-",  targets: "_all"},
            ],
            ajax: {
                url: `${globalRootUrl}call-detail-records/getNewRecords`,
                type: 'POST',
            },
            paging: true,
            //scrollY: $(window).height() - callDetailRecords.$cdrTable.offset().top-150,
            sDom: 'rtip',
            deferRender: true,
            pageLength: callDetailRecords.calculatePageLength(),

            /**
             * Constructs the CDR row.
             * @param {HTMLElement} row - The row element.
             * @param {Array} data - The row data.
             */
            createdRow(row, data) {
                if (data.DT_RowClass.indexOf("detailed") >= 0) {
                    $('td', row).eq(0).html('<i class="icon caret down"></i>');
                } else {
                    $('td', row).eq(0).html('');
                }
                $('td', row).eq(1).html(data[0]);
                $('td', row).eq(2)
                    .html(data[1])
                    .addClass('need-update');
                $('td', row).eq(3)
                    .html(data[2])
                    .addClass('need-update');

                let duration = data[3];
                if (data.ids !== '') {
                    duration += '<i data-ids="' + data.ids + '" class="file alternate outline icon">';
                }
                $('td', row).eq(4).html(duration).addClass('right aligned');
            },

            /**
             * Draw event - fired once the table has completed a draw.
             */
            drawCallback() {
                Extensions.updatePhonesRepresent('need-update');
            },
            language: SemanticLocalization.dataTableLocalisation,
            ordering: false,
        });
        callDetailRecords.dataTable = callDetailRecords.$cdrTable.DataTable();

        callDetailRecords.dataTable.on('draw', () => {
            callDetailRecords.$globalSearch.closest('div').removeClass('loading');
        });

        callDetailRecords.$cdrTable.on('click', 'tr.negative', (e) => {
            let ids = $(e.target).attr('data-ids');
            if (ids !== undefined && ids !== '') {
                window.location = `${globalRootUrl}system-diagnostic/index/?filename=asterisk/verbose&filter=${ids}`;
            }
        });

        // Add event listener for opening and closing details
        callDetailRecords.$cdrTable.on('click', 'tr.detailed', (e) => {
            let ids = $(e.target).attr('data-ids');
            if (ids !== undefined && ids !== '') {
                window.location = `${globalRootUrl}system-diagnostic/index/?filename=asterisk/verbose&filter=${ids}`;
                return;
            }
            const tr = $(e.target).closest('tr');
            const row = callDetailRecords.dataTable.row(tr);

            if (row.child.isShown()) {
                // This row is already open - close it
                row.child.hide();
                tr.removeClass('shown');
            } else {
                // Open this row
                row.child(callDetailRecords.showRecords(row.data())).show();
                tr.addClass('shown');
                row.child().find('.detail-record-row').each((index, playerRow) => {
                    const id = $(playerRow).attr('id');
                    return new CDRPlayer(id);
                });
                Extensions.updatePhonesRepresent('need-update');
            }
        });
    },

    /**
     * Shows a set of call records when a row is clicked.
     * @param {Array} data - The row data.
     * @returns {string} The HTML representation of the call records.
     */
    showRecords(data) {
        let htmlPlayer = '<table class="ui very basic table cdr-player"><tbody>';
        data[4].forEach((record, i) => {
            if (i > 0) {
                htmlPlayer += '<td><tr></tr></td>';
                htmlPlayer += '<td><tr></tr></td>';
            }
            if (record.recordingfile === undefined
                || record.recordingfile === null
                || record.recordingfile.length === 0) {

                htmlPlayer += `

<tr class="detail-record-row disabled" id="${record.id}">
   	<td class="one wide"></td>
   	<td class="one wide right aligned">
   		<i class="ui icon play"></i>
	   	<audio preload="metadata" id="audio-player-${record.id}" src=""></audio>
	</td>
    <td class="five wide">
    	<div class="ui range cdr-player" data-value="${record.id}"></div>
    </td>
    <td class="one wide"><span class="cdr-duration"></span></td>
    <td class="one wide">
    	<i class="ui icon download" data-value=""></i>
    </td>
    <td class="right aligned"><span class="need-update">${record.src_num}</span></td>
    <td class="one wide center aligned"><i class="icon exchange"></i></td>
   	<td class="left aligned"><span class="need-update">${record.dst_num}</span></td>
</tr>`;
            } else {
                let recordFileName = `Call_record_between_${record.src_num}_and_${record.dst_num}_from_${data[0]}`;
                recordFileName.replace(/[^\w\s!?]/g, '');
                recordFileName = encodeURIComponent(recordFileName);
                const recordFileUri = encodeURIComponent(record.recordingfile);
                htmlPlayer += `

<tr class="detail-record-row" id="${record.id}">
   	<td class="one wide"></td>
   	<td class="one wide right aligned">
   		<i class="ui icon play"></i>
	   	<audio preload="metadata" id="audio-player-${record.id}" src="/pbxcore/api/cdr/v2/playback?view=${recordFileUri}"></audio>
	</td>
    <td class="five wide">
    	<div class="ui range cdr-player" data-value="${record.id}"></div>
    </td>
    <td class="one wide"><span class="cdr-duration"></span></td>
    <td class="one wide">
    	<i class="ui icon download" data-value="/pbxcore/api/cdr/v2/playback?view=${recordFileUri}&download=1&filename=${recordFileName}.mp3"></i>
    </td>
    <td class="right aligned"><span class="need-update">${record.src_num}</span></td>
    <td class="one wide center aligned"><i class="icon exchange"></i></td>
   	<td class="left aligned"><span class="need-update">${record.dst_num}</span></td>
</tr>`;
            }
        });
        htmlPlayer += '</tbody></table>';
        return htmlPlayer;
    },

    calculatePageLength() {
        // Calculate row height
        let rowHeight = callDetailRecords.$cdrTable.find('tbody > tr').first().outerHeight();

        // Calculate window height and available space for table
        const windowHeight = window.innerHeight;
        const headerFooterHeight = 400; // Estimate height for header, footer, and other elements

        // Calculate new page length
        return Math.max(Math.floor((windowHeight - headerFooterHeight) / rowHeight), 5);
    },
    /**
     * Initializes the date range selector.
     */
    initializeDateRangeSelector() {
        const options = {};

        options.ranges = {
            [globalTranslate.cal_Today]: [moment(), moment()],
            [globalTranslate.cal_Yesterday]: [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            [globalTranslate.cal_LastWeek]: [moment().subtract(6, 'days'), moment()],
            [globalTranslate.cal_Last30Days]: [moment().subtract(29, 'days'), moment()],
            [globalTranslate.cal_ThisMonth]: [moment().startOf('month'), moment().endOf('month')],
            [globalTranslate.cal_LastMonth]: [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
        };
        options.alwaysShowCalendars = true;
        options.autoUpdateInput = true;
        options.linkedCalendars = true;
        options.maxDate = moment();
        options.locale = {
            format: 'DD/MM/YYYY',
            separator: ' - ',
            applyLabel: globalTranslate.cal_ApplyBtn,
            cancelLabel: globalTranslate.cal_CancelBtn,
            fromLabel: globalTranslate.cal_from,
            toLabel: globalTranslate.cal_to,
            customRangeLabel: globalTranslate.cal_CustomPeriod,
            daysOfWeek: SemanticLocalization.calendarText.days,
            monthNames: SemanticLocalization.calendarText.months,
            firstDay: 1,
        };
        options.startDate = moment();
        options.endDate = moment();
        callDetailRecords.$dateRangeSelector.daterangepicker(
            options,
            callDetailRecords.cbDateRangeSelectorOnSelect,
        );
    },


    /**
     * Handles the date range selector select event.
     * @param {moment.Moment} start - The start date.
     * @param {moment.Moment} end - The end date.
     * @param {string} label - The label.
     */
    cbDateRangeSelectorOnSelect(start, end, label) {
        const text = `${start.format('DD/MM/YYYY')} ${end.format('DD/MM/YYYY')} ${callDetailRecords.$globalSearch.val()}`;
        callDetailRecords.applyFilter(text);
    },

    /**
     * Applies the filter to the data table.
     * @param {string} text - The filter text.
     */
    applyFilter(text) {
        callDetailRecords.dataTable.search(text).draw();
        callDetailRecords.$globalSearch.closest('div').addClass('loading');
    },
};

/**
 *  Initialize CDR table on document ready
 */
$(document).ready(() => {
    callDetailRecords.initialize();
});
