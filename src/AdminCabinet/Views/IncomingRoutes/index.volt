{{ link_to("incoming-routes/modify", '<i class="add circle icon"></i> '~t._('ir_AddNewRule'), "class": "ui blue button") }}
    {% for rule in routingTable %}
        {% if loop.first %}
            <table class="ui selectable compact table" id="routingTable">
            <thead>
            <tr>
                <th></th>
                <th>{{ t._('ir_TableColumnDetails') }}</th>
                <th>{{ t._('ir_TableColumnNote') }}</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}

        <tr class="rule-row" id="{{ rule['id'] }}" data-value="{{ rule['priority'] }}">
            <td class="dragHandle"><i class="sort grey icon"></i></td>
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
                {% if not (rule['note'] is empty) and rule['note']|length>20 %}
                    <div class="ui basic icon button" data-content="{{ rule['note'] }}" data-variation="wide"
                         data-position="top right">
                        <i class="file text  icon"></i>
                    </div>
                {% else %}
                    {{ rule['note'] }}
                {% endif %}
            </td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': rule['id'],
                    'edit' : 'incoming-routes/modify/',
                    'delete': 'incoming-routes/delete/'
                ]) }}
        </tr>

        {% if loop.last %}

            </tbody>
            </table>
        {% endif %}
    {% endfor %}
<div class="ui hidden divider"></div>
{{ form('incoming-routes/save', 'role': 'form', 'class': 'ui grey segment form', 'id':'default-rule-form') }}
    {% for element in form %}
        {% if element.getName() =='action' %}

        {% elseif element.getName() =='extension' %}

        {% else %}
            {{ element.render() }}
        {% endif %}
    {% endfor %}

<h3 class="ui header">{{ t._("ir_DefaultRoute") }}</h3>
<div class="two fields">
    <div class="inline field">
        <label>{{ t._('ir_ActionSelect') }}</label>
        {{ form.render('action') }}
    </div>

    <div class="inline field" id="extension-group">
        <label>{{ t._('ir_ExtensionSelect') }}</label>
        {{ form.render('extension') }}
    </div>
</div>

{{ partial("partials/submitbutton",['indexurl':'']) }}
<div class="ui clearing hidden divider"></div>
</form>
