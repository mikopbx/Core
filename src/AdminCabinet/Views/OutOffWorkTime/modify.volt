{{ form('out-off-work-time/save', 'role': 'form', 'class': 'ui large form', 'id':'save-outoffwork-form') }}
{{ form.render('id') }}
<div class="two fields">
    <div class="field">
        <div class="field">
            <label>{{ t._('tf_DateDaysFrom') }}</label>
            <div class="two fields">

                <div class=" field calendar-select" id="range-days-start">
                    <div class="ui input left icon calendar">
                        <i class="calendar icon"></i>
                        {{ form.render('date_from') }}
                    </div>
                </div>

                <div class=" field calendar-select" id="range-days-end">
                    <div class="ui input left icon calendar">
                        <i class="calendar icon"></i>
                        {{ form.render('date_to') }}
                    </div>
                </div>
                <div class="item">
                    <div class="ui large icon button" id="erase-dates"><i class="eraser icon"></i></div>
                </div>
            </div>
        </div>
        <div class="field">
            <label>{{ t._('tf_WeekDaysFrom') }}</label>
            <div class="two fields">
                <div class="field">

                    {{ form.render('weekday_from') }}
                </div>
                <div class="field">
                    {{ form.render('weekday_to') }}
                </div>
                <div class="item">
                    <div class="ui large icon button" id="erase-weekdays"><i class="eraser icon"></i></div>
                </div>
            </div>
        </div>
        <div class="field">

            <label>{{ t._('tf_TimePeriodFrom') }}</label>
            <div class="two fields">

                <div class=" field time-select" id="range-time-start">
                    <div class="ui input left icon calendar">
                        <i class="time icon"></i>
                        {{ form.render('time_from') }}
                    </div>
                </div>

                <div class=" field time-select" id="range-time-end">
                    <div class="ui input left icon calendar">
                        <i class="time icon"></i>
                        {{ form.render('time_to') }}
                    </div>
                </div>
                <div class="item">
                    <div class="ui large icon button" id="erase-timeperiod"><i class="eraser icon"></i></div>
                </div>
            </div>
        </div>
    </div>
</div>
<div class="two fields">
    <div class="field">
        <label>{{ t._('tf_PeriodAction') }}</label>
        {{ form.render('action') }}
    </div>
    <div class="field" id="extension-group">
        <label>{{ t._('tf_SelectExtension') }}</label>
        {{ form.render('extension') }}
    </div>
    <div class="field" id="audio-file-group">
        <label>{{ t._('tf_SelectAudioMessage') }}</label>
        <div class="fields">
            <div class="fourteen wide field">
                {{ form.render('audio_message_id') }}
            </div>
            <div class="one wide field">
                <div class="ui basic icon button large action-playback-button" data-value="audio_message_id"><i
                            class="play icon"></i></div>
            </div>
        </div>
    </div>


</div>
<div class="field">
    <label>{{ t._('tf_Description') }}</label>
    {{ form.render('description') }}
</div>

{{ partial("partials/submitbutton",['indexurl':'out-off-work-time/index/']) }}
</form>