{% if isAllowed('save') %}
    {{ link_to("incoming-routes/modify", '<i class="add circle icon"></i> '~t._('ir_AddNewRule'), "class": "ui blue button", "id": "add-new-button", "style": "display:none") }}
{% endif %}

{# Table container - hidden by default #}
<div id="routes-table-container" style="display:none">
    <table class="ui selectable compact unstackable table" id="incoming-routes-table">
        <thead>
        <tr>
            <th></th>
            <th>{{ t._('ir_TableColumnDetails') }}</th>
            <th class="hide-on-mobile">{{ t._('ir_TableColumnNote') }}</th>
            <th></th>
        </tr>
        </thead>
        <tbody>
        {# Table body will be filled by DataTables #}
        </tbody>
    </table>
</div>

{# Empty table placeholder - hidden by default #}
<div id="empty-table-placeholder" style="display:none">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'random',
        'title': t._('ir_EmptyTableTitle'),
        'description': t._('ir_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('ir_AddNewRule'),
        'addButtonLink': 'incoming-routes/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/incoming-routes'
    ]) }}
</div>

<div class="ui hidden divider"></div>
{{ form(['action' : 'incoming-routes/save', 'method': 'post', 'role': 'form', 'class': 'ui grey segment form', 'id':'default-rule-form']) }}
    {% for element in form %}
        {% if element.getName() =='action' %}

        {% elseif element.getName() =='audio_message_id' %}

        {% elseif element.getName() =='extension' %}

        {% else %}
            {{ element.render() }}
        {% endif %}
    {% endfor %}

<h3 class="ui header">{{ t._("ir_DefaultRoute") }}</h3>

    <div class="inline field">
        <label>{{ t._('ir_ActionSelect') }}</label>
        <div class="ui selection dropdown" id="action-dropdown">
            {{ form.render('action') }}
            <i class="dropdown icon"></i>
            <div class="text"></div>
            <div class="menu">
                <div class="item" data-value="extension">{{ t._('ir_extension') }}</div>
                <div class="item" data-value="playback">{{ t._('ir_playback') }}</div>
            </div>
        </div>
    </div>


        <div class="inline field max-width-800" id="extension-group">
            <label>{{ t._('ir_ExtensionSelect') }}</label>
            {{ form.render('extension') }}
        </div>
        <div class="inline field max-width-800" id='audio-group' style="display:none;">
            {{ partial("partials/playAddNewSoundWithIcons", ['label': '', 'id':'audio_message_id', 'fieldClass':'', 'fieldId':'']) }}
        </div>

            {{ partial("partials/submitbutton",['indexurl':'']) }}
  
  
<div class="ui clearing hidden divider"></div>

{{ close('form') }}
