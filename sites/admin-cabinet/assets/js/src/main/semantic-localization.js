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

/* global globalTranslate */

/**
 * System localisation
 *
 * @module SemanticLocalization
 */
const SemanticLocalization = {
    initialize() {
        $.fn.dropdown.settings.message = {
            addResult: 'Add <b>{term}</b>',
            count: '{count} selected',
            maxSelections: 'Max {maxCount} selections',
            noResults: globalTranslate.loc_NoResult,
            serverError: 'There was an error contacting the server',
        };
    },
    // Calendar settings
    calendarFirstDayOfWeek: 1,
    calendarText: {
        days: [
            globalTranslate.ShortDaySunday,
            globalTranslate.ShortDayMonday,
            globalTranslate.ShortDayTuesday,
            globalTranslate.ShortDayWednesday,
            globalTranslate.ShortDayThursday,
            globalTranslate.ShortDayFriday,
            globalTranslate.ShortDaySaturday,
        ],
        months: [
            globalTranslate.January,
            globalTranslate.February,
            globalTranslate.March,
            globalTranslate.April,
            globalTranslate.May,
            globalTranslate.June,
            globalTranslate.July,
            globalTranslate.August,
            globalTranslate.September,
            globalTranslate.October,
            globalTranslate.November,
            globalTranslate.December,
        ],
        monthsShort: [
            globalTranslate.Jan,
            globalTranslate.Feb,
            globalTranslate.Mar,
            globalTranslate.Apr,
            globalTranslate.May,
            globalTranslate.Jun,
            globalTranslate.Jul,
            globalTranslate.Aug,
            globalTranslate.Sep,
            globalTranslate.Oct,
            globalTranslate.Nov,
            globalTranslate.Dec,
        ],
        today: globalTranslate.Today,
        now: globalTranslate.Now,
        am: 'AM',
        pm: 'PM',
    },
    regExp: {
        dateWords: /[^A-Za-zА-Яа-я]+/g,
        dateNumbers: /[^\d:]+/g,
    },
    /**
     * Translations for dataTables DataTable
     */
    dataTableLocalisation: {
        // search: `_INPUT_<label>${globalTranslate.dt_Search}:</label>`,
        search: '_INPUT_<i class="search icon"></i>',
        searchPlaceholder: globalTranslate.dt_Search,
        info: globalTranslate.dt_Info,
        infoEmpty: globalTranslate.dt_InfoEmpty,
        infoFiltered: '',
        zeroRecords: globalTranslate.dt_TableIsEmpty,
        paginate: {
            first: globalTranslate.dt_First,
            previous: globalTranslate.dt_Previous,
            next: globalTranslate.dt_Next,
            last: globalTranslate.dt_Last,
        },
    },
};

// When the document is ready, initialize the system localisation process
$(document).ready(() => {
    SemanticLocalization.initialize();
});
