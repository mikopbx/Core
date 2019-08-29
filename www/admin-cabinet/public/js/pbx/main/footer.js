"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */
var footer = {
  /**
   * Подсвечивает текущий элемент меню
   */
  makeMeuActiveElement: function () {
    function makeMeuActiveElement() {
      var current = window.location.href;
      $.each($('#sidebarmenu a'), function (index, value) {
        var $this = $(value); // if the current path is like this link, make it active

        var needle = $this.attr('href').replace('/index', '').replace('/modify', '');

        if (current.indexOf(needle) !== -1) {
          $this.addClass('active');
        }
      });
    }

    return makeMeuActiveElement;
  }()
};
$(document).ready(function () {
  $('.popuped').popup();
  $('div[data-content], a[data-content]').popup();
  $('#loader').removeClass('active');
  $('#loader-row').hide();
  $('#content-frame').show();
  footer.makeMeuActiveElement();
});
//# sourceMappingURL=footer.js.map