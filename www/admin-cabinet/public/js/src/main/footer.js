/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

const footer = {
	/**
	 * Подсвечивает текущий элемент меню
	 */
	makeMeuActiveElement() {
		const current = window.location.href;
		$.each($('#sidebarmenu a'), (index ,value) => {
			const $this = $(value);
			// if the current path is like this link, make it active
			const needle = $this.attr('href')
				.replace('/index', '')
				.replace('/modify', '');

			if (current.indexOf(needle) !== -1) {
				$this.addClass('active');
			}
		});
	},
};

$(document).ready(() => {
	$('.popuped').popup();
	$('div[data-content], a[data-content]').popup();
	$('#loader').removeClass('active');
	$('#loader-row').hide();
	$('#content-frame').show();
	footer.makeMeuActiveElement();
});

