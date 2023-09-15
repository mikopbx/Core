 {% for user in amiUsers %}
        {% if loop.first %}
            {% if isAllowed('save') %}
                {{ link_to("asterisk-managers/modify", '<i class="add circle icon"></i> '~t._('am_AddNewUser'), "class": "ui blue button") }}
            {% endif %}
            <table class="ui  very compact unstackable table" id="ami-users-table">
            <thead>
            <tr>
                <th>{{ t._('am_TableColumnName') }}</th>
                <th>{{ t._('am_TableColumnRead') }}</th>
                <th>{{ t._('am_TableColumnWrite') }}</th>
                <th class="hide-on-mobile">{{ t._('am_TableColumnNetworkFilter') }}</th>
                <th class="hide-on-mobile">{{ t._('am_TableColumnDescription') }}</th>

                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}

        <tr class="user-row" id="{{ user['id'] }}">
            <td>{{ user['username'] }}</td>
            <td>
                {% if ( user['call']=='read' OR user['call']=='readwrite' ) %}call{% endif %}
                {% if ( user['originate']=='read' OR user['originate']=='readwrite' ) %}<br>originate{% endif %}
                {% if ( user['cdr']=='read' OR user['cdr']=='readwrite' ) %}<br>cdr{% endif %}
                {% if ( user['user']=='read' OR user['user']=='readwrite' ) %}<br>user{% endif %}
                {% if ( user['agent']=='read' OR user['agent']=='readwrite' ) %}<br>agent{% endif %}
                {% if ( user['dialplan']=='read' OR user['dialplan']=='readwrite' ) %}<br>dialplan{% endif %}
                {% if ( user['reporting']=='read' OR user['reporting']=='readwrite' ) %}<br>reporting{% endif %}
                {% if ( user['dtmf']=='read' OR user['dtmf']=='readwrite' ) %}<br>dtmf{% endif %}
                {% if ( user['log']=='read' OR user['log']=='readwrite' ) %}<br>log{% endif %}
                {% if ( user['config']=='read' OR user['config']=='readwrite' ) %}<br>config{% endif %}
                {% if ( user['system']=='read' OR user['system']=='readwrite' ) %}<br>system{% endif %}
                {% if ( user['command']=='read' OR user['command']=='readwrite' ) %}<br>command{% endif %}
                {% if ( user['verbose']=='read' OR user['verbose']=='readwrite' ) %}<br>verbose{% endif %}
            </td>
            <td>
                {% if ( user['call']=='write' OR user['call']=='readwrite' ) %}call{% endif %}
                {% if ( user['originate']=='write' OR user['originate']=='readwrite' ) %}<br>originate{% endif %}
                {% if ( user['cdr']=='write' OR user['cdr']=='readwrite' ) %}<br>cdr{% endif %}
                {% if ( user['user']=='write' OR user['user']=='readwrite' ) %}<br>user{% endif %}
                {% if ( user['agent']=='write' OR user['agent']=='readwrite' ) %}<br>agent{% endif %}
                {% if ( user['dialplan']=='write' OR user['dialplan']=='readwrite' ) %}<br>dialplan{% endif %}
                {% if ( user['reporting']=='write' OR user['reporting']=='readwrite' ) %}<br>reporting{% endif %}
                {% if ( user['dtmf']=='write' OR user['dtmf']=='readwrite' ) %}<br>dtmf{% endif %}
                {% if ( user['log']=='write' OR user['log']=='readwrite' ) %}<br>log{% endif %}
                {% if ( user['config']=='write' OR user['config']=='readwrite' ) %}<br>config{% endif %}
                {% if ( user['system']=='write' OR user['system']=='readwrite' ) %}<br>system{% endif %}
                {% if ( user['command']=='write' OR user['command']=='readwrite' ) %}<br>command{% endif %}
                {% if ( user['verbose']=='write' OR user['verbose']=='readwrite' ) %}<br>verbose{% endif %}
            </td>
            <td class="hide-on-mobile">
                {% if ( user['networkfilterid']>0 ) %}
                    {{ networkFilters[user['networkfilterid']] }}
                {% endif %}
            </td>
            <td class="hide-on-mobile">
                {% if not (user['description'] is empty) %}
                    <div class="ui basic icon button" data-content="{{ user['description'] }}" data-position="top right"
                         data-variation="wide">
                        <i class="file text  icon"></i>
                    </div>
                {% endif %}
            </td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': user['id'],
                    'edit' : 'asterisk-managers/modify/',
                    'delete': 'asterisk-managers/delete/'
                ]) }}
        </tr>

        {% if loop.last %}

            </tbody>
            </table>
        {% endif %}
    {% endfor %}


{% if amiUsers|length == 0  %}
    <div class="ui placeholder segment">
        <div class="ui icon header">
            <i class="asterisk icon"></i>
            {{ t._('am_NoAnyServersYet') }}
        </div>
        {% if isAllowed('save') %}
            {{ link_to("asterisk-managers/modify", '<i class="add circle icon"></i> '~t._('am_AddNewUser'), "class": "ui blue button") }}
        {% endif %}
    </div>
{% endif %}