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
        <!-- External IP and hostname BEGIN-->
        <div class="ui basic segment">
            <div class="ui two column very relaxed stackable grid">
                <div class="column">
                    <div class="field">
                        <label>{{ t._('nw_PublicAddress') }}</label>
                        <div class="inline fields">
                            <div class="field max-width-400">
                                {{ form.render('extipaddr') }}
                            </div>
                            <div class="field">
                                <button class="ui icon black button" id="getmyip">
                                    <i class="ui icon globe"></i>{{ t._('nw_LookUpExternalIp') }}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="field">
                        <div class="ui toggle checkbox">
                            {{ form.render('autoUpdateExternalIp') }}
                            <label>{{ t._('nw_UpdateExternalIPAutomaticallyOnReboot') }}</label>
                        </div>
                    </div>
                </div>
                <div class="middle aligned column">
                    <div class="field">
                        <label>{{ t._('nw_PublicHostName') }}</label>
                        <div class="field max-width-500">
                            {{ form.render('exthostname') }}
                        </div>
                    </div>
                </div>
            </div>
            <div class="ui vertical divider">
                {{ t._('nw_NATInfo6OR') }}
            </div>
        </div>
        <!-- External IP and hostname END-->

        <div class="field">
            <div class="inline field">
                {{ form.render('externalSIPPort') }}
                <label id="external-sip-port-label">{{ t._('nw_PublicSIPPort', ['SIP_PORT':'...']) }}</label>
            </div>
            <div class="inline field">
                {{ form.render('externalTLSPort') }}
                <label id="external-tls-port-label">{{ t._('nw_PublicTLSPort', ['TLS_PORT':'...']) }}</label>
            </div>
        </div>

        <div class="ui info icon message">
            <i class="info icon"></i>
            <div class="content">
                <div class="ui bulleted list">
                    <div class="item">{{ t._('nw_NATInfo1') }} </div>
                    <br>
                    <div class="item">{{ t._('nw_NATInfo2') }} </div>
                    <br>
                    <div class="item" id="nat-help-sip-ports">
                        <b>SIP:</b> <span class="port-values">{{ t._('nw_NATInfo3', ['SIP_PORT':'...','TLS_PORT':'...']) }}</span>
                    </div>
                    <div class="item" id="nat-help-rtp-ports">
                        <b>RTP:</b> <span class="port-values">{{ t._('nw_NATInfo4',['RTP_PORT_FROM':'...','RTP_PORT_TO':'...']) }}</span>
                    </div>
                    <br>
                    <br>
                    <div class="item">{{ t._('nw_NATInfo5') }}</div>
                </div>
            </div>
        </div>
    </div>
</div>