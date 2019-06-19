"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2018
 *
 */

/* global globalTranslate */
var SemanticLocalization = {
  initialize: function () {
    function initialize() {
      $.fn.dropdown.settings.message = {
        addResult: 'Add <b>{term}</b>',
        count: '{count} selected',
        maxSelections: 'Max {maxCount} selections',
        noResults: globalTranslate.loc_NoResult,
        serverError: 'There was an error contacting the server'
      };
    }

    return initialize;
  }(),
  // Настройки календаря
  calendarFirstDayOfWeek: 1,
  calendarText: {
    days: [globalTranslate.ShortDaySunday, globalTranslate.ShortDayMonday, globalTranslate.ShortDayTuesday, globalTranslate.ShortDayWednesday, globalTranslate.ShortDayThursday, globalTranslate.ShortDayFriday, globalTranslate.ShortDaySaturday],
    months: [globalTranslate.January, globalTranslate.February, globalTranslate.March, globalTranslate.April, globalTranslate.May, globalTranslate.June, globalTranslate.July, globalTranslate.August, globalTranslate.September, globalTranslate.October, globalTranslate.November, globalTranslate.December],
    monthsShort: [globalTranslate.Jan, globalTranslate.Feb, globalTranslate.Mar, globalTranslate.Apr, globalTranslate.May, globalTranslate.Jun, globalTranslate.Jul, globalTranslate.Aug, globalTranslate.Sep, globalTranslate.Oct, globalTranslate.Nov, globalTranslate.Dec],
    today: globalTranslate.Today,
    now: globalTranslate.Now,
    am: 'AM',
    pm: 'PM'
  },
  regExp: {
    dateWords: /[^A-Za-zА-Яа-я]+/g,
    dateNumbers: /[^\d:]+/g
  },

  /**
   * Перевод фраз для DataTable
   */
  dataTableLocalisation: {
    // search: `_INPUT_<label>${globalTranslate.dt_Search}:</label>`,
    search: '_INPUT_<i class="search icon"></i>',
    searchPlaceholder: globalTranslate.dt_Search,
    info: globalTranslate.dt_Info,
    infoEmpty: globalTranslate.dt_InfoEmpty,
    infoFiltered: globalTranslate.dt_InfoFiltered,
    zeroRecords: globalTranslate.dt_TableIsEmpty,
    paginate: {
      first: globalTranslate.dt_First,
      previous: globalTranslate.dt_Previous,
      next: globalTranslate.dt_Next,
      last: globalTranslate.dt_Last
    }
  }
};
$(document).ready(function () {
  SemanticLocalization.initialize();
});
//# sourceMappingURL=semantic-localization.js.map