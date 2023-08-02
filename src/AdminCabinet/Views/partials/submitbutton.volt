<div class="ui error message" id="form-error-messages"></div>

<input type="hidden" name="dirrty" id="dirrty"/>

{% if  indexurl is not empty %}
    {{ link_to(indexurl, "<i class='list icon'></i>"~t._('bt_BackToList'), "class": "ui labeled large icon button", "id":"back-to-list-button") }}
{% endif %}

{% if isAllowed('save') %}
    {% if submitMode is not empty %}
        <input type="hidden" name="submitMode" value="{{ submitMode }}"/>
        <div class="ui positive right floated buttons {{ class }}">
            <div class="ui large left labeled icon button" id="submitbutton">
                <i class="save icon"></i>
                {{ t._('bt_'~submitMode) }}
            </div>
            <div class="ui floating dropdown icon large button" id="dropdownSubmit">
                <i class="dropdown icon"></i>
                <div class="menu">
                    <div class="item" data-value="SaveSettings"><i class="icons"><i
                                    class="save icon"></i></i> {{ t._('bt_SaveSettings') }}</div>
                    <div class="item" data-value="SaveSettingsAndAddNew"><i class="icons"><i class="save icon"></i><i
                                    class="add corner icon"></i></i> {{ t._('bt_SaveSettingsAndAddNew') }}</div>
                    <div class="item" data-value="SaveSettingsAndExit"><i class="icons"><i class="save icon"></i><i
                                    class="list corner icon"></i></i> {{ t._('bt_SaveSettingsAndExit') }}</div>
                </div>
            </div>
        </div>
    {% else %}
        <div class="ui left labeled icon large positive right floated button prevent-word-wrap {{ class }}" id="submitbutton" data-value="save">
            {% if submitBtnText is empty %}
                <i class="save icon"></i>
                {{ t._('bt_SaveSettings') }}
            {% else %}
                <i class="{{ submitBtnIconClass }} icon"></i>
                {{ t._(submitBtnText) }}
            {% endif %}
        </div>
    {% endif %}
{% endif %}

