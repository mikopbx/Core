{{ form('time-settings/save', 'role': 'form', 'class': 'ui large form', 'id':'time-settings-form') }}
<div class="three fields">
    <div class="field">
        <label>{{ t._('ts_TimeZone') }}</label>
        {{ form.render('PBXTimezone') }}
    </div>
</div>
<div class="field">

    <div class="ui toggle checkbox">
        {{ form.render('PBXManualTimeSettings') }}
        <label>{{ t._('ts_ManualAdjustDateTime') }}</label>
    </div>

</div>
<div class="two fields" id="SetDateTimeBlock">
    <div class="field" id="CalendarBlock">
        <label>{{ t._('ts_CurrentSystemTime') }}</label>
        <div class="ui input left icon calendar">
            <i class="calendar icon"></i>
            {{ form.render('ManualDateTime') }}
        </div>
    </div>
</div>
<div class="two fields" id="SetNtpServerBlock">
    <div class="field">
        <label>{{ t._('ts_NTPServer') }}</label>

        {{ form.render('NTPServer') }}

    </div>
</div>
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}
{{ partial("partials/submitbutton",['indexurl':'']) }}
<div class="ui clearing hidden divider"></div>
{{ end_form() }}