/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

const DeleteSomething = {
	initialize() {
		$('body').on('click', '.two-steps-delete', (e) => {
			e.preventDefault();
			e.stopImmediatePropagation();
			const $button = $(e.target).closest('a');
			$button.removeClass('two-steps-delete');
			const $icon = $button.find('i.trash');
			$icon.removeClass('trash').addClass('close');
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
