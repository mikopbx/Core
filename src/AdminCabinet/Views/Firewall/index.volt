
{% if isAllowed('status') %}
    {% set statusClass="" %}
{% else %}
    {% set statusClass="disabled" %}
{% endif %}

{% if isAllowed('modify') %}
    {% set modifyClass="" %}
{% else %}
    {% set modifyClass="disabled" %}
{% endif %}

{% if isAllowed('delete') %}
    {% set deleteClass="" %}
{% else %}
    {% set deleteClass="disabled" %}
{% endif %}

<div class="ui segment">
    <div class="ui toggle checkbox {{ statusClass }}" id="status-toggle">
        <input type="checkbox" name="status" id="status" {% if PBXFirewallEnabled %} checked {% endif %}/>
        <label>{{ t._('fw_Status'~(PBXFirewallEnabled=="1"? 'Enabled':'Disabled')) }}</label>
    </div>
</div>
<div class="ui basic segment" id="firewall-settings">
    {% if isAllowed('modify') %}
        {{ link_to("firewall/modify", '<i class="add icon"></i> '~t._('fw_AddNewRule'), "class": "ui blue button",'id':'add-new-button') }}
    {% endif %}
    {% for rule in rulesTable %}
        {% if loop.first %}
            <table class="ui selectable very basic compact unstackable table" id="firewall-table">
            <thead>
            <tr>
                <th></th>
                {% for category in rule['category'] %}
                    <th width="20px" class="firewall-category">
                        <div><span>{{ category['name'] }}</span></div>
                    </th>
                {% endfor %}
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}

        <tr class="rule-row" id="{{ rule['id'] }}">
            <td>{{ rule['network'] }} - {{ rule['description'] }}{% if rule['id'] is empty %} <br> <span
                        class="features">{{ t._('fw_NeedConfigureRule') }}</span>{% endif %}</td>
            {% for category in rule['category'] %}
                <td class="center aligned marks">
                    <i class="icons">
                        {% if category['action']=='allow' %}
                            <i class="icon checkmark green" data-value="on"></i>
                        {% elseif PBXFirewallEnabled=="1" %}
                            <i class="icon close red" data-value="off"></i>
                            <i class="icon corner close red" style="display: none;"></i>
                        {% elseif PBXFirewallEnabled=="0" %}
                            <i class="icon checkmark green" data-value="off"></i>
                            <i class="icon corner close red "></i>
                        {% endif %}
                    </i>

                </td>
            {% endfor %}
            <td class="right aligned collapsing">
                <div class="ui small basic icon buttons">
                    {% if rule['id'] is empty %}
                        <form action="{{ url('firewall/modify/') }}" method="post">
                            <input type="hidden" name="permit" value="{{ rule['network'] }}"/>
                            <input type="hidden" name="description" value="{{ rule['description'] }}"/>
                            <button class="ui icon basic mini button {{ modifyClass }}" type="submit"><i class="icon edit blue"></i>
                            </button>
                            {{ link_to("firewall/delete/", '<i class="icon trash red"></i> ', "class": "ui disabled button") }}
                        </form>
                    {% else %}

                        {{ link_to("firewall/modify/" ~ rule['id'], '<i class="icon edit blue"></i> ', "class": "ui button edit popuped "~modifyClass, "data-content": t._('bt_ToolTipEdit')) }}
                        {% if rule['permanent'] %}
                            {{ link_to("firewall/delete/" ~ rule['id'], '<i class="icon trash red"></i> ', "class": "ui disabled button") }}
                        {% else %}
                            {{ link_to("firewall/delete/" ~ rule['id'], '<i class="icon trash red"></i> ', "class": "ui button two-steps-delete popuped "~deleteClass,  "data-content":t._('bt_ToolTipDelete')) }}
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