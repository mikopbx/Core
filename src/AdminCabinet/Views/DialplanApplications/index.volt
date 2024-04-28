{% if isAllowed('save') %}
    {{ link_to("dialplan-applications/modify", '<i class="add circle icon"></i> '~t._('da_AddNewDialplanApp'), "class": "ui blue button", "id":"add-new-button") }}
{% endif %}
    {% for record in apps %}
        {% if loop.first %}
            <table class="ui selectable compact unstackable table" id="dialplan-applications-table">
            <thead>
            <tr>
                <th>{{ t._('da_ColumnExtension') }}</th>
                <th>{{ t._('da_ColumnName') }}</th>
                <th >{{ t._('da_ColumnNote') }}</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}
        <tr class="app-row" id="{{ record.uniqid }}">
            <td>{{ record.extension }}</td>
            <td>{% if record.type=='php' %}<i class="php icon"></i> {% endif %}{{ record.name }}</td>
            <td>
                {% if not (record.description is empty) and record.description|length>80 %}
                    <div class="ui basic icon button" data-content="{{ record.description }}" data-variation="wide">
                        <i class="file text icon"></i>
                    </div>
                {% else %}
                    {{ record.description }}
                {% endif %}
            </td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': record.uniqid,
                    'edit' : 'dialplan-applications/modify/',
                    'delete': 'dialplan-applications/delete/'
                ]) }}
        </tr>

        {% if loop.last %}

            </tbody>
            </table>
        {% endif %}
    {% endfor %}

