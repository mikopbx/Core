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
