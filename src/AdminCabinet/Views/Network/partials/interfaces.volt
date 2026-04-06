<h4 class="ui dividing header">{{ t._("nw_NetworkInterfaces") }}</h4>

{# Global hostname field - single value for all interfaces #}
<div class="field">
    <label>{{ t._("nw_Hostname") }}</label>
    <div class="field max-width-400">
        <input type="text" id="global-hostname" name="global_hostname" placeholder="mikopbx" />
    </div>
</div>

<div class="ui clearing divider"></div>

{# Network interface tabs - shown for both Docker and regular installations #}
{# In Docker: DHCP locked, IP/subnet/VLAN readonly, DNS editable, no VLAN creation #}
<div class="network-interfaces-tabs">
    {# Tab menu will be created dynamically by JavaScript #}
    <div class="ui top attached tabular menu" id="eth-interfaces-menu">
        {# Tabs will be added here dynamically #}
    </div>

    {# Tab content containers will be created dynamically by JavaScript #}
    <div id="eth-interfaces-content">
        {# Tab segments will be added here dynamically #}
    </div>
</div>