/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */


$(document).ready(() => {
	$('.popuped').popup();
	$('div[data-content], a[data-content]').popup();
	$('#loader').removeClass('active');
	$('#loader-row').hide();
	$('#content-frame').show();
});
