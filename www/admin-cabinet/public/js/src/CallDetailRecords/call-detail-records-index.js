/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

/* global globalRootUrl, SemanticLocalization, Extensions, moment, globalTranslate */
/**
 * Класс динамически создаваемых проигрываетелй для CDR
 *
 */
class CDRPlayer {
	constructor(id) {
		this.id = id;
		this.html5Audio = document.getElementById(`audio-player-${id}`);
		const $row = $(`#${id}`);
		this.$pButton = $row.find('i.play'); // play button
		this.$dButton = $row.find('i.download'); // download button
		this.$slider = $row.find('div.cdr-player');
		this.$spanDuration = $row.find('span.cdr-duration');
		this.html5Audio.removeEventListener('timeupdate', this.cbOnMetadataLoaded, false);
		this.html5Audio.removeEventListener('loadedmetadata', this.cbTimeUpdate, false);
		this.$pButton.unbind();
		this.$dButton.unbind();


		// play button event listenter
		this.$pButton.on('click', (e) => {
			e.preventDefault();
			this.play();
		});

		// download button event listenter
		this.$dButton.on('click', (e) => {
			e.preventDefault();
			window.location = $(e.target).attr('data-value');
		});

		this.html5Audio.addEventListener('loadedmetadata', this.cbOnMetadataLoaded, false);

		// timeupdate event listener
		this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);

		// no src handler
		this.html5Audio.addEventListener('error', this.cbOnSrcMediaError, false);

		this.$slider.range({
			min: 0,
			max: 100,
			start: 0,
			onChange: this.cbOnSliderChange,
			html5Audio: this.html5Audio,
			cbTimeUpdate: this.cbTimeUpdate,
			spanDuration: this.$spanDuration,
		});
	}

	/**
	 * Обработчик подгрузки метаданных
	 */
	cbOnMetadataLoaded() {
		if (isFinite(this.duration)) {
			const $row = $(this).closest('tr');
			const date = new Date(null);
			date.setSeconds(this.currentTime); // specify value for SECONDS here
			const currentTime = date.toISOString().substr(14, 5);
			date.setSeconds(this.duration); // specify value for SECONDS here
			const duration = date.toISOString().substr(14, 5);
			$row.find('span.cdr-duration').text(`${currentTime}/${duration}`);
		}
	}

	/**
	 * Колбек на сдвиг слайдера проигрывателя
	 * @param newVal
	 * @param meta
	 */
	cbOnSliderChange(newVal, meta) {
		if (meta.triggeredByUser && isFinite(this.html5Audio.duration)) {
			this.html5Audio.removeEventListener('timeupdate', this.cbTimeUpdate, false);
			this.html5Audio.currentTime = (this.html5Audio.duration * newVal) / 100;
			this.html5Audio.addEventListener('timeupdate', this.cbTimeUpdate, false);
		}
		if (isFinite(this.html5Audio.duration)) {
			const date = new Date(null);
			date.setSeconds(this.html5Audio.currentTime); // specify value for SECONDS here
			const currentTime = date.toISOString().substr(14, 5);
			date.setSeconds(this.html5Audio.duration); // specify value for SECONDS here
			const duration = date.toISOString().substr(14, 5);
			this.spanDuration.text(`${currentTime}/${duration}`);
		}
	}

	/**
	 * Колбек на изменение позиции проигрываемого файла из HTML5 аудиотега
	 */
	cbTimeUpdate() {
		if (isFinite(this.duration)) {
			const percent = this.currentTime / this.duration;
			const rangePosition = Math.min(Math.round((percent) * 100), 100);
			const $row = $(this).closest('tr');
			$row.find('div.cdr-player').range('set value', rangePosition);
			if (this.currentTime === this.duration) {
				$row.find('i.pause').removeClass('pause').addClass('play');
			}
		}
	}

	/**
	 * Запуск и остановка воспроизведения аудио файла
	 * по клику на иконку Play
	 */
	play() {
		// start music
		if (this.html5Audio.paused) {
			this.html5Audio.play();
			// remove play, add pause
			this.$pButton.removeClass('play').addClass('pause');
		} else { // pause music
			this.html5Audio.pause();
			// remove pause, add play
			this.$pButton.removeClass('pause').addClass('play');
		}
	}

	/**
	 * Обработка ошибки полученя звукового файла
	 */
	cbOnSrcMediaError() {
		$(this).closest('tr').addClass('disabled');
	}
}

/**
 * Класс страницы с CDR
 */
const callDetailRecords = {
	$cdrTable: $('#cdr-table'),
	$globalSearch: $('#globalsearch'),
	$dateRangeSelector: $('#date-range-selector'),
	dataTable: {},
	players: [],
	initialize() {
		callDetailRecords.initializeDateRangeSelector();

		callDetailRecords.$globalSearch.on('keyup', (e) => {
			if (e.keyCode === 13
				|| e.keyCode === 8
				|| callDetailRecords.$globalSearch.val().length === 0) {
				const text = `${callDetailRecords.$dateRangeSelector.val()} ${callDetailRecords.$globalSearch.val()}`;
				callDetailRecords.applyFilter(text);
			}
		});

		callDetailRecords.$cdrTable.dataTable({
			search: {
				search: `${callDetailRecords.$dateRangeSelector.val()} ${callDetailRecords.$globalSearch.val()}`,
			},
			serverSide: true,
			processing: true,
			ajax: {
				url: `${globalRootUrl}call-detail-records/getNewRecords`,
				type: 'POST',
			},
			paging: true,
			scrollY: $(window).height() - callDetailRecords.$cdrTable.offset().top - 420,
			// stateSave: true,
			sDom: 'rtip',
			deferRender: true,
			pageLength: 17,
			// scrollCollapse: true,
			// scroller: true,
			/**
			 * Конструктор строки CDR
			 * @param row
			 * @param data
			 */
			createdRow(row, data) {
				if (data.DT_RowClass === 'detailed') {
					$('td', row).eq(0).html('<i class="icon caret down"></i>');
				} else {
					$('td', row).eq(0).html('');
				}

				$('td', row).eq(1).html(data[0]);
				$('td', row).eq(2)
					.html(data[1])
					.addClass('need-update');
				$('td', row).eq(3)
					.html(data[2])
					.addClass('need-update');
				$('td', row).eq(4).html(data[3]);
			},
			/**
			 * Draw event - fired once the table has completed a draw.
			 */
			drawCallback() {
				Extensions.UpdatePhonesRepresent('need-update');
			},
			language: SemanticLocalization.dataTableLocalisation,
			ordering: false,
		});
		callDetailRecords.dataTable = callDetailRecords.$cdrTable.DataTable();

		callDetailRecords.dataTable.on('draw', () => {
			callDetailRecords.$globalSearch.closest('div').removeClass('loading');
		});


		// Add event listener for opening and closing details
		callDetailRecords.$cdrTable.on('click', 'tr.detailed', (e) => {
			const tr = $(e.target).closest('tr');
			const row = callDetailRecords.dataTable.row(tr);

			if (row.child.isShown()) {
				// This row is already open - close it
				row.child.hide();
				tr.removeClass('shown');
			} else {
				// Open this row

				row.child(callDetailRecords.showRecords(row.data())).show();

				tr.addClass('shown');
				row.child().find('.detail-record-row').each((index, playerRow) => {
					const id = $(playerRow).attr('id');
					return new CDRPlayer(id);
				});
				Extensions.UpdatePhonesRepresent('need-update');
			}
		});
	},
	/**
	 * Отрисовывает набор с записями разговоров при клике на строку
	 */
	showRecords(data) {
		let htmlPlayer = '<table class="ui very basic table cdr-player"><tbody>';
		data[4].forEach((record, i) => {
			if (i > 0) {
				htmlPlayer += '<td><tr></tr></td>';
				htmlPlayer += '<td><tr></tr></td>';
			}
			if (record.recordingfile === undefined
				|| record.recordingfile === null
				|| record.recordingfile.length === 0) {
				const recordFileName = `Call_record_between_${record.src_num}_and_${record.dst_num}_from_${data[0]}`;
				recordFileName.replace(/[^\w\s!?]/g, '');

				htmlPlayer += `

<tr class="detail-record-row disabled" id="${record.id}">
   	<td class="one wide"></td>
   	<td class="one wide right aligned">
   		<i class="ui icon play"></i>
	   	<audio preload="metadata" id="audio-player-${record.id}" src=""></audio>
	</td>
    <td class="five wide">
    	<div class="ui range cdr-player" data-value="${record.id}"></div>
    </td>
    <td class="one wide"><span class="cdr-duration"></span></td>
    <td class="one wide">
    	<i class="ui icon download" data-value=""></i>
    </td>
    <td class="right aligned"><span class="need-update">${record.src_num}</span></td>
    <td class="one wide center aligned"><i class="icon exchange"></i></td>
   	<td class="left aligned"><span class="need-update">${record.dst_num}</span></td>
</tr>`;
			} else {
				const recordFileName = `Call_record_between_${record.src_num}_and_${record.dst_num}_from_${data[0]}`;
				recordFileName.replace(/[^\w\s!?]/g, '');

				htmlPlayer += `

<tr class="detail-record-row" id="${record.id}">
   	<td class="one wide"></td>
   	<td class="one wide right aligned">
   		<i class="ui icon play"></i>
	   	<audio preload="metadata" id="audio-player-${record.id}" src="/pbxcore/api/cdr/playback?view=${record.recordingfile}"></audio>
	</td>
    <td class="five wide">
    	<div class="ui range cdr-player" data-value="${record.id}"></div>
    </td>
    <td class="one wide"><span class="cdr-duration"></span></td>
    <td class="one wide">
    	<i class="ui icon download" data-value="/pbxcore/api/cdr/playback?view=${record.recordingfile}&download=1&filename=${recordFileName}.mp3"></i>
    </td>
    <td class="right aligned"><span class="need-update">${record.src_num}</span></td>
    <td class="one wide center aligned"><i class="icon exchange"></i></td>
   	<td class="left aligned"><span class="need-update">${record.dst_num}</span></td>
</tr>`;
			}
		});
		htmlPlayer += '</tbody></table>';
		return htmlPlayer;
	},
	/**
	 *
	 */
	initializeDateRangeSelector() {
		const options = {};

		options.ranges = {
			[globalTranslate.сal_Today]: [moment(), moment()],
			[globalTranslate.сal_Yesterday]: [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
			[globalTranslate.сal_LastWeek]: [moment().subtract(6, 'days'), moment()],
			[globalTranslate.сal_Last30Days]: [moment().subtract(29, 'days'), moment()],
			[globalTranslate.сal_ThisMonth]: [moment().startOf('month'), moment().endOf('month')],
			[globalTranslate.сal_LastMonth]: [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
		};
		options.alwaysShowCalendars = true;
		options.autoUpdateInput = true;
		options.linkedCalendars = true;
		options.maxDate = moment();
		options.locale = {
			format: 'DD/MM/YYYY',
			separator: ' - ',
			applyLabel: globalTranslate.сal_ApplyBtn,
			cancelLabel: globalTranslate.сal_CancelBtn,
			fromLabel: globalTranslate.сal_from,
			toLabel: globalTranslate.сal_to,
			customRangeLabel: globalTranslate.сal_CustomPeriod,
			daysOfWeek: SemanticLocalization.calendarText.days,
			monthNames: SemanticLocalization.calendarText.months,
			firstDay: 1,
		};
		options.startDate = moment();
		options.endDate = moment();
		callDetailRecords.$dateRangeSelector.daterangepicker(
			options,
			callDetailRecords.cbDateRangeSelectorOnSelect,
		);
	},
	/**
	 * Обработчик выбора периода
	 * @param start
	 * @param end
	 * @param label
	 */
	cbDateRangeSelectorOnSelect(start, end, label) {
		const text = `${start.format('DD/MM/YYYY')} ${end.format('DD/MM/YYYY')} ${callDetailRecords.$globalSearch.val()}`;
		callDetailRecords.applyFilter(text);
	},
	/**
	 *
	 */
	applyFilter(text) {
		callDetailRecords.dataTable.search(text).draw();
		callDetailRecords.$globalSearch.closest('div').addClass('loading');
	},
};
$(document).ready(() => {
	callDetailRecords.initialize();
});
