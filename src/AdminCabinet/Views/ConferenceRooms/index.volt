{% if isAllowed('save') %}
    {{ link_to("conference-rooms/modify", '<i class="add circle icon"></i> '~t._('cr_AddNewConferenceRoom'), "class": "ui blue button") }}
{% endif %}
    {% for record in records %}
        {% if loop.first %}
            <table class="ui selectable compact unstackable table" id="conference-rooms-table">
            <thead>
            <tr>
                <th>{{ t._('cr_ColumnExtension') }}</th>
                <th>{{ t._('cr_ColumnName') }}</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}


        <tr class="record-row" id="{{ record.uniqid }}">
            <td>{{ record.extension }}</td>
            <td>{{ record.name }}</td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': record.uniqid,
                    'edit' : 'conference-rooms/modify/',
                    'delete': 'conference-rooms/delete/'
                ]) }}
        </tr>
        {% if loop.last %}

            </tbody>
            </table>
        {% endif %}
    {% endfor %}

