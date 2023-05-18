/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
		if(pass.length > 5){
			score = 2;
		}
		const variations = {
			digits: /\d/.test(pass),
			lower: /[a-z]/.test(pass),
			upper: /[A-Z]/.test(pass),
			nonWords: /\W/.test(pass),
		};
		for (const check in variations) {
			score += (variations[check] === true) ? 2 : 0;
		}
		return score * 10;
	},
	checkPassStrength(param) {
		const score = PasswordScore.scorePassword(param.pass);
		param.bar.progress({
			percent: Math.min(score, 100),
			showActivity: false,
		});
		param.section.show(); 
		return '';
	},
};

// export default PasswordScore;
