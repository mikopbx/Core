{{ form(['action' : 'out-off-work-time/save', 'method': 'post', 'role': 'form', 'class': 'ui large form', 'id':'save-outoffwork-form']) }}

{{ form.render('id') }}
{{ form.render('uniqid') }}
{{ form.render('priority') }}

<div class="field max-width-800">
    <label for="description">{{ t._('tf_Description') }}</label>
    {{ form.render('description') }}
</div>
<div class="ui top attached tabular menu" id="out-time-modify-menu">
    <a class="item active" data-tab="general">{{ t._('tf_TabGeneralSettings') }}</a>
    <a class="item" data-tab="rules">{{ t._('tf_TabRoutsRestriction') }}</a>
    {{ partial("PbxExtensionModules/hookVoltBlock",
        ['arrayOfPartials':hookVoltBlock('TabularMenu')]) }}
</div>

<div class="ui bottom attached tab segment active" data-tab="general">
    <div class="ten wide field">
        <div class="ui toggle checkbox">
            {{ form.render('allowRestriction') }}
            <label for="allowRestriction">{{ t._('tf_AllowRestriction') }}</label>
        </div>
    </div>
    <div class="field max-width-300">
        <label>{{ t._('tf_calType') }}</label>
        {{ form.render('calType') }}
        <div class="ui selection dropdown calType-select">
            <i class="dropdown icon"></i>
            <div class="default text">{{ t._('tf_SelectCalendarType') }}</div>
            <div class="menu">
                <div class="item" data-value="timeframe">{{ t._('tf_CAL_TYPE_TIMEFRAME') }}</div>
                {# <div class="item" data-value="ICAL">{{ t._('tf_CAL_TYPE_ICAL') }}</div> #}
                <div class="item" data-value="CALDAV">{{ t._('tf_CAL_TYPE_CALDAV') }}</div>
            </div>
        </div>
    </div>

    <div id="call-type-main-tab">
        <div class="field">
            <label>{{ t._('tf_DateDaysFrom') }}</label>
            <div class="two fields">
                <div class="field calendar-select max-width-250" id="range-days-start">
                    <div class="ui input left icon calendar">
                        <i class="calendar icon"></i>
                        {{ form.render('date_from') }}
                    </div>
                </div>

                <div class="field calendar-select max-width-250" id="range-days-end">
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
                <div class="field max-width-250">
                    {{ form.render('weekday_from') }}
                    <div class="ui selection dropdown weekday-from-select" id="weekday_from-dropdown">
                        <i class="dropdown icon"></i>
                        <div class="default text">{{ t._('tf_SelectWeekdayFrom') }}</div>
                        <div class="menu"></div>
                    </div>
                </div>
                <div class="field max-width-250">
                    {{ form.render('weekday_to') }}
                    <div class="ui selection dropdown weekday-to-select" id="weekday_to-dropdown">
                        <i class="dropdown icon"></i>
                        <div class="default text">{{ t._('tf_SelectWeekdayTo') }}</div>
                        <div class="menu"></div>
                    </div>
                </div>
                <div class="item">
                    <div class="ui large icon button" id="erase-weekdays"><i class="eraser icon"></i></div>
                </div>
            </div>
        </div>
        <div class="field">
            <label>{{ t._('tf_TimePeriodFrom') }}</label>
            <div class="two fields">
                <div class="field time-select max-width-250" id="range-time-start">
                    <div class="ui input left icon calendar">
                        <i class="time icon"></i>
                        {{ form.render('time_from') }}
                    </div>
                </div>
                <div class="field time-select max-width-250" id="range-time-end">
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
    <div id="call-type-calendar-tab">
        <div class="field">
            <label>{{ t._('tf_calUrl') }}
                <i class="small info circle icon field-info-icon" data-field="calUrl"></i>
            </label>
            {{ form.render('calUrl') }}
        </div>
        <div class="two fields">
            <div class="field time-select max-width-250">
                <div class="field">
                    <label>{{ t._('tf_calUser') }}</label>
                    {{ form.render('calUser') }}
                </div>
            </div>
            <div class="field time-select max-width-250">
                <div class="field">
                    <label>{{ t._('tf_calSecret') }}</label>
                    {{ form.render('calSecret') }}
                </div>
            </div>
        </div>

    </div>

    <h3 class="ui dividing header">{{ t._("tf_CallHandlingHeader") }}</h3>
    
    <div class="field max-width-300">
        <label>{{ t._('tf_PeriodAction') }}</label>
        {{ form.render('action') }}
        <div class="ui selection dropdown action-select">
            <i class="dropdown icon"></i>
            <div class="default text">{{ t._('tf_SelectAction') }}</div>
            <div class="menu">
                <div class="item" data-value="playmessage">{{ t._('tf_SelectActionPlayMessage') }}</div>
                <div class="item" data-value="extension">{{ t._('tf_SelectActionRedirectToExtension') }}</div>
            </div>
        </div>
    </div>
    
    <div class="field max-width-800" id="extension-row" style="display:none;">
        <label>{{ t._('tf_SelectExtension') }}</label>
        {{ form.render('extension') }}
    </div>
    
    <div id="audio-message-row" style="display:none;">
        {{ partial("partials/playAddNewSoundWithIcons", ['label': t._('tf_SelectAudioMessage'), 'id':'audio_message_id', 'fieldClass':'field max-width-800', 'fieldId':'']) }}
    </div>
    {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('GeneralTabFields')]) }}
</div>

<div class="ui bottom attached tab segment" data-tab="rules">
    <table class="ui selectable compact table" id="routing-table">
        <thead>
        <tr>
            <th></th>
            <th>{{ t._('ir_TableColumnDetails') }}</th>
            <th class="hide-on-mobile">{{ t._('ir_TableColumnNote') }}</th>
        </tr>
        </thead>
        <tbody>
        {# Table body will be populated by JavaScript #}
        </tbody>
    </table>
    
    {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('RulesTabFields')]) }}
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",
    ['arrayOfPartials':hookVoltBlock('AdditionalTab')]) }}

{{ partial("partials/submitbutton",['indexurl':'out-off-work-time/index/']) }}
{{ close('form') }}