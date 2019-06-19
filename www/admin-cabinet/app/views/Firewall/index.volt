<div class="ui segment">
    <div class="ui toggle checkbox " id="status-toggle">
        <input type="checkbox" name="status" id="status" {% if PBXFirewallEnabled %} checked {% endif %}/>
        <label>{{ t._('fw_Status'~(PBXFirewallEnabled=="1"? 'Enabled':'Disabled')) }}</label>
    </div>
</div>
<div class="ui basic segment" id="firewall-settings">
    {{ link_to("firewall/modify", '<i class="add icon"></i> '~t._('fw_AddNewRule'), "class": "ui blue button",'id':'add-new-button') }}
    {% for rule in rulesTable %}
        {% if loop.first %}
            <table class="ui selectable compact table" id="firewall-table">
            <thead>
            <tr>
                <th>{{ t._('fw_TableColumnDescription') }}</th>
                <th>{{ t._('fw_TableColumnNetwork') }}</th>
                {% for category in rule['category'] %}
                    <th width="5%" class="center aligned">{{ category['name'] }}</th>
                {% endfor %}
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}

        <tr class="rule-row" id="{{ rule['id'] }}">
            <td>{{ rule['description'] }}{% if rule['id'] is empty %} <br> <span class="features">{{ t._('fw_NeedConfigureRule')}}</span>{% endif %}</td>
            <td>{{ rule['network'] }}</td>
            {% for category in rule['category'] %}
                    {% if category['action']=='allow'%}
                        <td class="center aligned">
                            <i class="icon checkmark green" data-value="on"></i></td>
                    {% else %}
                        <td class="center aligned"><i class="icon {{ (PBXFirewallEnabled=="1"? 'close red':'checkmark green') }}" data-value="off"></i></td>
                    {% endif %}
                </td>
            {% endfor %}
            <td class="right aligned collapsing">
                <div class="ui small basic icon buttons">
                {% if rule['id'] is empty %}
                    <form action="{{ url('firewall/modify/') }}" method="post">
                        <input type="hidden" name="permit" value="{{ rule['network']}}" />
                        <input type="hidden" name="description" value="{{ rule['description']}}" />
                        <button class="ui icon basic mini button" type="submit"><i class="icon edit blue"></i></button>
                        {{ link_to("firewall/delete/", '<i class="icon trash red"></i> ', "class": "ui disabled button") }}
                    </form>
                {% else %}
                    {{ link_to("firewall/modify/" ~ rule['id'], '<i class="icon edit blue"></i> ', "class": "ui button") }}
                    {% if rule['permanent'] %}
                        {{ link_to("firewall/delete/" ~ rule['id'], '<i class="icon trash red"></i> ', "class": "ui disabled button") }}
                    {% else %}
                        {{ link_to("firewall/delete/" ~ rule['id'], '<i class="icon trash red"></i> ', "class": "ui button") }}
                    {% endif %}
                {% endif %}
                </div>
            </td>
        </tr>

        {% if loop.last %}

            </tbody>
            </table>
        {% endif %}
    {% endfor %}
</div>