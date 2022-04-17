{{ link_to("outbound-routes/modify", '<i class="add circle icon"></i> '~t._('or_AddNewRule'), "class": "ui blue button") }}

    {% for rule in routingTable %}
        {% if loop.first %}
            <table class="ui selectable compact table" id="routingTable">
            <thead>
            <tr>
                <th></th>
                <th>{{ t._('or_TableColumnName') }}</th>
                <th>{{ t._('or_TableColumnRule') }}</th>
                <th>{{ t._('or_TableColumnProvider') }}</th>
                <th>{{ t._('or_TableColumnNote') }}</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}

        <tr class="rule-row {% if rule['provider'] is NULL %}ui negative{% endif %}" id="{{ rule['id'] }}"
            data-value="{{ rule['priority'] }}">
            <td class="dragHandle"><i class="sort grey icon"></i></td>
            <td class="{% if rule['disabled']==1 %}disabled{% endif %}">{{ rule['rulename'] }}</td>
            <td class="{% if rule['disabled']==1 %}disabled{% endif %}">
                {% if (rule['restnumbers']>0) %}
                    {{ t._('or_RuleDescription',['numberbeginswith':rule['numberbeginswith'],'restnumbers':rule['restnumbers']]) }}
                {% elseif (rule['restnumbers']==0) %}
                    {{ t._('or_RuleDescriptionFullMatch',['numberbeginswith':rule['numberbeginswith']]) }}
                {% elseif (rule['restnumbers']==-1) %}
                    {{ t._('or_RuleDescriptionBeginMatch',['numberbeginswith':rule['numberbeginswith']]) }}
                {% endif %}
            </td>
            <td class="{% if rule['disabled']==1 %}disabled{% endif %}">{{ rule['provider'] }}</td>
            <td class="{% if rule['disabled']==1 %}disabled{% endif %}">
                {% if not (rule['note'] is empty) %}
                    <div class="ui basic icon button" data-content="{{ rule['note'] }}" data-variation="wide"
                         data-position="top right">
                        <i class="file text  icon"></i>
                    </div>
                {% endif %}
            </td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': rule['id'],
                    'edit' : 'outbound-routes/modify/',
                    'delete': 'outbound-routes/delete/'
                ]) }}
        </tr>

        {% if loop.last %}

            </tbody>
            </table>
        {% endif %}
    {% endfor %}
