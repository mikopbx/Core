{% if isAllowed('save') %}
    {{ link_to("call-queues/modify", '<i class="add circle icon"></i> '~t._('cq_AddNewQueue'), "class": "ui blue button", 'id':'add-new-button') }}
{% endif %}
    {% for queue in callQueuesList %}
        {% if loop.first %}
            <table class="ui selectable unstackable compact table" id="queues-table">
            <thead>
            <tr>
                <th>{{ t._('cq_Name') }}</th>
                <th class="center aligned">{{ t._('cq_Extension') }}</th>
                <th>{{ t._('cq_StaticAgents') }}</th>
                <th class="hide-on-mobile">{{ t._('cq_Note') }}</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}

        <tr class="queue-row" id="{{ queue['uniqid'] }}">
            <td class="collapsing">{{ queue['name'] }}</td>
            <td class="center aligned">{{ queue['extension'] }}</td>
            <td class="collapsing">
                <small>
                    {% for member in queue['members'] %}
                        {{ member['represent'] }}<br>
                    {% endfor %}
                </small>
            </td>
            <td class="hide-on-mobile">
                {% if not (queue['description'] is empty) %}
                    <div class="ui basic icon button" data-content="{{ queue['description'] }}" data-position="top right"
                         data-variation="wide">
                        <i class="file text  icon"></i>
                    </div>
                {% endif %}
            </td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': queue['uniqid'],
                    'edit' : 'call-queues/modify/',
                    'delete': 'call-queues/delete/'
                ]) }}
        </tr>

        {% if loop.last %}

            </tbody>
            </table>
        {% endif %}
    {% endfor %}
