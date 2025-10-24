<h4 class="ui dividing header">{{ t._("nw_NetworkInterfaces") }}</h4>

{# For Docker: show current network info as read-only #}
<div class="docker-network-info" style="display:none;">
    <div class="ui info message">
        <div class="ui relaxed list">
            <div class="item">
                <i class="sitemap icon"></i>
                <div class="content">
                    <strong>{{ t._("nw_InterfaceName") }}:</strong> <span id="docker-interface-name"></span>
                </div>
            </div>
            <div class="item">
                <i class="globe icon"></i>
                <div class="content">
                    <strong>{{ t._("nw_IPAddress") }}:</strong> <span id="docker-current-ip"></span>
                </div>
            </div>
            <div class="item">
                <i class="shield icon"></i>
                <div class="content">
                    <strong>{{ t._("nw_NetworkMask") }}:</strong> <span id="docker-current-subnet"></span>
                </div>
            </div>
            <div class="item">
                <i class="door open icon"></i>
                <div class="content">
                    <strong>{{ t._("nw_Gateway") }}:</strong> <span id="docker-current-gateway"></span>
                </div>
            </div>
        </div>
    </div>
</div>

{# For non-Docker: show editable interface tabs #}
<div class="non-docker-network-interfaces do-not-show-if-docker">
    {# Tab menu will be created dynamically by JavaScript #}
    <div class="ui top attached tabular menu" id="eth-interfaces-menu">
        {# Tabs will be added here dynamically #}
    </div>

    {# Tab content containers will be created dynamically by JavaScript #}
    <div id="eth-interfaces-content">
        {# Tab segments will be added here dynamically #}
    </div>
</div>