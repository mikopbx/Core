{{ form('network/save', 'role': 'form', 'class': 'ui form large', 'id':'network-form') }}
<div class="four fields">
    <div class=" field">
        <label for="hostname">{{ t._('nw_Hostname') }}</label>

        {{ form.render('hostname') }}

    </div>
</div>

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
            <div class="four fields">
                <div class="field">
                    <label>{{ t._('nw_SelectInterface') }}</label>
                    {{ form.render('interface_'~eth.id) }}
                </div>
            </div>
        {% else %}
            {{ form.render('interface_'~eth.id) }}
        {% endif %}
        <div class="four fields">
            <div class="field">
                <label>{{ t._('nw_InterfaceName') }}</label>
                {{ form.render('name_'~eth.id) }}
            </div>
        </div>
        <div class="field">
            <div class="ui toggle checkbox dhcp-checkbox" id="dhcp-{{ eth.id }}-checkbox">
                {{ form.render('dhcp_'~eth.id) }}
                <label>{{ t._('nw_UseDHCP') }}</label>
            </div>
        </div>
        <input type="hidden" name="notdhcp_{{ eth.id }}" id="not-dhcp-{{ eth.id }}"/>
        <div class="four fields" id="ip-address-group-{{ eth.id }}">
            <div class="field">
                <label>{{ t._('nw_IPAddress') }}</label>
                {{ form.render('ipaddr_'~eth.id) }}
            </div>
            <div class="field">
                <label>{{ t._('nw_NetworkMask') }}</label>
                {{ form.render('subnet_'~eth.id) }}
            </div>
        </div>
        <div class="ten fields">
            <div class="field">
                <label>{{ t._('nw_VlanID') }}</label>
                {{ form.render('vlanid_'~eth.id) }}
            </div>
        </div>
        {% if   in_array(eth.interface, deletableEths) %}
            <a class="ui icon button delete-interface" data-value="{{ eth.id }}"><i
                        class="icon trash"></i>{{ t._('nw_DeleteCurrentInterface') }}</a>
        {% endif %}
        {% if   eth.id === 0 %}
            <a class="ui icon button delete-interface-0"><i
                        class="icon trash"></i>{{ t._('nw_DeleteCurrentInterface') }}</a>
        {% endif %}
    </div>
{% endfor %}
<h4 class="ui dividing header">{{ t._("nw_NetworkAddressTranslations") }}</h4>
<div class="two fields">
    <div class="field">
        <label> {{ t._('nw_InternetInterface') }}</label>
        {{ form.render('internet_interface') }}
    </div>
</div>
<div class="four fields">
    <div class="field">
        <label for="gateway">{{ t._('nw_GatewayAddress') }}</label>

        {{ form.render('gateway') }}

    </div>
</div>
<div class="field">
    <label>{{ t._('nw_DNSAddresses') }}</label>
    <div class="four fields">

        <div class="field">
            {{ form.render('primarydns') }}

        </div>
        <div class="field">
            {{ form.render('secondarydns') }}
        </div>

    </div>
</div>
<div class="ui segment">
    <div class="two fields">
        <div class="field">

            <div class="ui toggle checkbox" id="usenat-checkbox">
                {{ form.render('usenat') }}
                <label>{{ t._('nw_AllowNatPortForwarding') }}</label>
            </div>

        </div>
    </div>
    <div class="field nated-settings-group">
        <label>{{ t._('nw_PublicAddress') }}</label>
        <div class="inline fields">
            <div class="six wide field">
                {{ form.render('extipaddr') }}
            </div>
            <div class="ten wide field">
                <button class="ui icon black button" id="getmyip"><i
                            class="ui icon globe"></i>{{ t._('nw_LookUpExternalIp') }}
                </button>
            </div>
        </div>
    </div>
    <div class="field nated-settings-group">
        <label>{{ t._('nw_PublicHostName') }}</label>
        <div class="four fields">
            <div class="field">
                {{ form.render('exthostname') }}
            </div>
        </div>
    </div>
</div>
{{ partial("partials/submitbutton",['indexurl':'']) }}
<div class="ui clearing hidden divider"></div>
</form>
