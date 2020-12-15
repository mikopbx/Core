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


const PasswordScore = {
	scorePassword(pass) {
		let score = 0;
		if (!pass) {
			return score;
		}

		// award every unique letter until 5 repetitions
		const letters = {};
		for (let i = 0; i < pass.length; i++) {
			letters[pass[i]] = (letters[pass[i]] || 0) + 1;
			score += 5.0 / letters[pass[i]];
		}

		// bonus points for mixing it up
		const variations = {
			digits: /\d/.test(pass),
			lower: /[a-z]/.test(pass),
			upper: /[A-Z]/.test(pass),
			nonWords: /\W/.test(pass),
		};

		let variationCount = 0;
		for (const check in variations) {
			variationCount += (variations[check] === true) ? 1 : 0;
		}
		score += (variationCount - 1) * 10;

		return parseInt(score, 10);
	},
	checkPassStrength(param) {
		const score = PasswordScore.scorePassword(param.pass);
		param.bar.progress({
			percent: Math.min(score, 100),
			showActivity: false,
		});
		param.section.show();
		// if (score > 80) { return 'strong'; }
		// if (score > 60) { return 'good'; }
		// if (score >= 30) { return 'weak'; }
		return '';
	},

};

// export default PasswordScore;
