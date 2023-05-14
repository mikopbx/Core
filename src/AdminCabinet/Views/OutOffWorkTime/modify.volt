{{ form('out-off-work-time/save', 'role': 'form', 'class': 'ui large form', 'id':'save-outoffwork-form') }}
{{ form.render('id') }}
<div class="field">
    <label>{{ t._('tf_Description') }}</label>
    {{ form.render('description') }}
</div>
<div class="ui top attached tabular menu" id="out-time-modify-menu">
    <a class="item active" data-tab="general">{{ t._('ex_GeneralSettings') }}</a>
    <a class="item" data-tab="rules">{{ t._('tf_RoutsRestriction') }}</a>
    {{ partial("PbxExtensionModules/hookVoltBlock",
        ['arrayOfPartials':hookVoltBlock('TabularMenu')])
    }}
</div>

<div class="ui bottom attached tab segment active" data-tab="general">
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
    <div class="ten wide field">
        <div class="ui toggle checkbox">
            {{ form.render('allowRestriction') }}
            <label>{{ t._('tf_AllowRestriction') }}</label>
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
       {{ partial("partials/playAddNewSound", ['label': t._('tf_SelectAudioMessage'), 'id':'audio_message_id', 'fieldClass':'field', 'fieldID':'audio-file-group']) }}
    </div>
    {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('GeneralTabFields')]) }}
</div>

<div class="ui bottom attached tab segment" data-tab="rules">

{% for rule in rules %}
    {% if loop.first %}
        <table class="ui selectable compact table" id="inbound-rules-table">
        <thead>
        <tr>
            <th></th>
            <th>DID</th>
            <th>{{ t._('or_TableColumnProvider') }}</th>
            <th></th>
            <th></th>
        </tr>
        </thead>
        <tbody>
    {% endif %}

    <tr class="rule-row" id="{{ rule['id'] }}">
        <td class="collapsing">
            <div class="ui fitted toggle checkbox" data-did="{{ rule['number'] }}-{{ rule['provider-uniqid'] }}">
                <input type="checkbox" {% if rule['status']!=='disabled' %} checked {% endif %} name="rule-{{ rule['id'] }}" data-value="{{ rule['id'] }}" >
                <label></label>
            </div>
        </td>
        <td class="collapsing">
            {{ rule['number'] }}
        </td>
       <td class="collapsing">
            {{ rule['provider'] }}
        </td>
        <td class="{% if rule['disabled']==1 %}disabled{% endif %}">
            {% if rule['number'] is empty AND rule['provider'] is empty %}
                {{ t._('ir_RuleDescriptionWithoutNumberAndWithoutProvider',
                    [
                        'timeout':rule['timeout'],
                        'callerid':rule['callerid']
                    ]) }}
            {% elseif rule['number'] is empty %}
                {{ t._('ir_RuleDescriptionWithoutNumber',
                    [
                        'timeout':rule['timeout'],
                        'provider':rule['provider'],
                        'callerid':rule['callerid']
                    ]) }}
            {% elseif rule['provider'] is empty %}
                {{ t._('ir_RuleDescriptionWithoutProvider',
                    [
                        'timeout':rule['timeout'],
                        'callerid':rule['callerid'],
                        'number':rule['number']
                    ]) }}
            {% else %}
                {{ t._('ir_RuleDescriptionWithNumberAndWithProvider',
                    [
                        'timeout':rule['timeout'],
                        'provider':rule['provider'],
                        'callerid':rule['callerid'],
                        'number':rule['number']
                    ]) }}
            {% endif %}
        </td>
        <td>
            {{ rule['note'] }}
        </td>
    </tr>
    {% if loop.last %}
        </tbody>
        </table>
    {% endif %}
{% endfor %}
    {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('RulesTabFields')]) }}
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",
    ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
}}

{{ partial("partials/submitbutton",['indexurl':'out-off-work-time/index/']) }}
{{ end_form() }}