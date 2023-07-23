{{ form('network/save', 'role': 'form', 'class': 'ui form large', 'id':'network-form') }}

<input type="hidden" name="is-docker" value="{{ isDocker }}">

<div class=" field">
    <label for="hostname">{{ t._('nw_Hostname') }}</label>
    <div class="field max-width-400">
        {{ form.render('hostname') }}
    </div>
</div>
<div class="do-not-show-if-docker">
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
</div>
<h4 class="ui dividing header">{{ t._("nw_NetworkAddressTranslations") }}</h4>

<div class="field">
    <label for="internet_interface"> {{ t._('nw_InternetInterface') }}</label>
    <div class="field max-width-400">
        {{ form.render('internet_interface') }}
    </div>
</div>

<div class="field do-not-show-if-docker">
    <label for="gateway">{{ t._('nw_GatewayAddress') }}</label>
    <div class="field max-width-400">
        {{ form.render('gateway') }}
    </div>
</div>

<div class="field do-not-show-if-docker">
    <label>{{ t._('nw_DNSAddresses') }}</label>
    <div class="fields">
        <div class="field max-width-250">
            {{ form.render('primarydns') }}
        </div>
        <div class="field max-width-250">
            {{ form.render('secondarydns') }}
        </div>
    </div>
</div>
<div class="ui segment">
        <div class="field">
            <div class="ui toggle checkbox" id="usenat-checkbox">
                {{ form.render('usenat') }}
                <label>{{ t._('nw_AllowNatPortForwarding') }}</label>
            </div>
        </div>
    <div class="field nated-settings-group">
        <div class="ui info message">
            <div class="header">
                {{ t._('adv_MessagesHeader') }}:
            </div>
            <br>
            <div class="ui bulleted list">
                <div class="item">{{ t._('nw_NATInfoMessage1') }} </div>
                <div class="item">{{ t._('nw_NATInfoMessage2') }} </div>
            </div>
        </div>
        <label>{{ t._('nw_PublicAddress') }}</label>
        <div class="inline fields">
            <div class="field max-width-400">
                {{ form.render('extipaddr') }}
            </div>
            <div class="field">
                <button class="ui icon black button" id="getmyip"><i
                            class="ui icon globe"></i>{{ t._('nw_LookUpExternalIp') }}
                </button>
            </div>
        </div>
    </div>
    <div class="field nated-settings-group">
        <label>{{ t._('nw_PublicHostName') }}</label>
            <div class="field max-width-500">
                {{ form.render('exthostname') }}
            </div>
    </div>
</div>
{{ partial("partials/submitbutton",['indexurl':'']) }}
<div class="ui clearing hidden divider"></div>
{{ end_form() }}
