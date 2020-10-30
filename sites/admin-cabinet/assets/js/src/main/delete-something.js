/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

const DeleteSomething = {
	initialize() {
		$('.two-steps-delete').closest( 'td' ).on('dblclick', (e) => {
			e.preventDefault();
			e.stopImmediatePropagation();
		});
		$('body').on('click', '.two-steps-delete', (e) => {
			e.preventDefault();
			e.stopImmediatePropagation();
			const $button = $(e.target).closest('a');
			const $icon = $button.find('i.trash');
			if ($button.hasClass('disabled')){
				return;
			}
			$button.addClass('disabled');
			setTimeout(() => {
				if ($button.length) {
					$button.removeClass('two-steps-delete').removeClass('disabled');
					$icon.removeClass('trash').addClass('close');
				}
			}, 200);
			setTimeout(() => {
				if ($button.length) {
					$button.addClass('two-steps-delete');
					$icon.removeClass('close').addClass('trash');
				}
			}, 3000);
		});
	},
};

$(document).ready(() => {
	DeleteSomething.initialize();
});
