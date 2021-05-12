/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

// Polyfill for old browsers
if (typeof Number.isFinite !== 'function') {
	Number.isFinite = function isFinite(value) {
		// 1. If Type(number) is not Number, return false.
		if (typeof value !== 'number') {
			return false;
		}
		// 2. If number is NaN, +∞, or −∞, return false.
		if (value !== value || value === Infinity || value === -Infinity) {
			return false;
		}
		// 3. Otherwise, return true.
		return true;
	};
}

$(document).ready(() => {
	$('.popuped').popup();
	$('div[data-content], a[data-content]').popup();
	$('#loader').removeClass('active');
	$('#loader-row').hide();
	$('#content-frame').show();
});
