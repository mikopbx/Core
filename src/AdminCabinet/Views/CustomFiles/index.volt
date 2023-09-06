{% for record in files %}
    {% if loop.first %}
        <table class="ui selectable compact unstackable table" id="custom-files-table">
        <thead>
        <tr>
            <th>{{ t._('cf_ColumnPath') }}</th>
            <th>{{ t._('cf_ColumnMode') }}</th>
            <th class="hide-on-mobile">{{ t._('cf_ColumnNote') }}</th>
            <th></th>
        </tr>
        </thead>
        <tbody>
    {% endif %}
    <tr class="file-row" id="{{ record.id }}">
        <td>{{ record.filepath }}</td>
        <td class="collapsing">{{ t._('cf_FileActions' ~ record.mode|capitalize) }}</td>
        <td class="hide-on-mobile">
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
                'id': record.id,
                'edit' : 'custom-files/modify/',
                'delete': ''
            ]) }}
    </tr>

    {% if loop.last %}

        </tbody>
        </table>
    {% endif %}
{% endfor %}

