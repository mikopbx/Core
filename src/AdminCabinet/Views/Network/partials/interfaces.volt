<h4 class="ui dividing header">{{ t._("nw_NetworkInterfaces") }}</h4>

<div class="ui top attached tabular menu" id="eth-interfaces-menu">
    {% for eth in eths %}
        {% if eth.id===0 %}
            <a class="item" data-tab="{{ eth.id }}"><i class="icon plus"></i></a>
        {% else %}
            <a class="item {% if loop.first %}active{% endif %}" data-tab="{{ eth.id }}">{{ eth.name }}
                ({{ eth.interface }}{% if eth.vlanid>0 %}.{{ eth.vlanid }}{% endif %})</a>
        {% endif %}
    {% endfor %}

</div>
{% for eth in eths %}
    <div class="ui bottom attached tab segment {% if loop.first %}active{% endif %}" data-tab="{{ eth.id }}">
        {% if eth.id===0 %}
            <div class="field">
                <label for='interface_{{ eth.id }}'>{{ t._('nw_SelectInterface') }}</label>
                <div class="field max-width-400">
                    {{ form.render('interface_'~eth.id) }}
                </div>
            </div>
        {% else %}
            <div class="field max-width-400">
                {{ form.render('interface_'~eth.id) }}
            </div>
        {% endif %}
        <div class="field">
            <label>{{ t._('nw_InterfaceName') }}</label>
            <div class="field max-width-400">
                {{ form.render('name_'~eth.id) }}
            </div>
        </div>
        <div class="field">
            <div class="ui segment">
                <div class="ui toggle checkbox dhcp-checkbox" id="dhcp-{{ eth.id }}-checkbox">
                    {{ form.render('dhcp_'~eth.id) }}
                    <label>{{ t._('nw_UseDHCP') }}</label>
                </div>
            </div>
        </div>
        <input type="hidden" name="notdhcp_{{ eth.id }}" id="not-dhcp-{{ eth.id }}"/>
        <div class="fields" id="ip-address-group-{{ eth.id }}">
            <div class="field">
                <label>{{ t._('nw_IPAddress') }}</label>
                <div class="field max-width-400">
                    {{ form.render('ipaddr_'~eth.id) }}
                </div>
            </div>
            <div class="field">
                <label>{{ t._('nw_NetworkMask') }}</label>
                <div class="field max-width-400">
                    {{ form.render('subnet_'~eth.id) }}
                </div>
            </div>
        </div>

        <div class="field">
            <label>{{ t._('nw_VlanID') }}</label>
            <div class="field max-width-100">
                {{ form.render('vlanid_'~eth.id) }}
            </div>
        </div>
        {% if   in_array(eth.interface, deletableEths) %}
            <a class="ui icon left labeled button delete-interface" data-value="{{ eth.id }}"><i
                        class="icon trash"></i>{{ t._('nw_DeleteCurrentInterface') }}</a>
        {% endif %}
        {% if   eth.id === 0 %}
            <a class="ui icon left labeled button delete-interface-0"><i
                        class="icon trash"></i>{{ t._('nw_DeleteCurrentInterface') }}</a>
        {% endif %}
    </div>
{% endfor %}