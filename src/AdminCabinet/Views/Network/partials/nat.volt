<h4 class="ui dividing header">{{ t._("nw_NetworkAddressTranslations") }}</h4>

<div class="ui segment">
    <div class="field">
        <div class="ui toggle checkbox" id="usenat-checkbox">
            {{ form.render('usenat') }}
            <label>{{ t._('nw_AllowNatPortForwarding') }}</label>
        </div>
    </div>

    <!-- Standard NAT Configuration Section (controlled by nated-settings-group) -->
    <div class="field nated-settings-group" id="standard-nat-section">
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
                <span id="external-sip-port-standard-wrapper">{{ form.render('externalSIPPort') }}</span>
                <label id="external-sip-port-label">{{ t._('nw_PublicSIPPort', ['SIP_PORT':'...']) }}</label>
            </div>
            <div class="inline field">
                <span id="external-tls-port-standard-wrapper">{{ form.render('externalTLSPort') }}</span>
                <label id="external-tls-port-label">{{ t._('nw_PublicTLSPort', ['TLS_PORT':'...']) }}</label>
            </div>
        </div>

        <div class="ui info message">
            <div class="header">
                <i class="info circle icon"></i>
                {{ t._('nw_NATConfigurationInfo') }}
            </div>
            <div class="ui list">
                <div class="item">
                    <i class="check circle outline icon"></i>
                    <div class="content">{{ t._('nw_NATInfo1') }}</div>
                </div>
                <div class="item">
                    <i class="arrow right icon"></i>
                    <div class="content">{{ t._('nw_NATInfo2') }}</div>
                </div>
            </div>

            <div class="ui horizontal divider">{{ t._('nw_PortForwarding') }}</div>

            <div class="ui relaxed list">
                <div class="item" id="nat-help-sip-ports">
                    <i class="phone icon"></i>
                    <div class="content">
                        <div class="header">SIP</div>
                        <span class="port-values">{{ t._('nw_NATInfo3', ['SIP_PORT':'...','TLS_PORT':'...']) }}</span>
                    </div>
                </div>
                <div class="item" id="nat-help-rtp-ports">
                    <i class="microphone icon"></i>
                    <div class="content">
                        <div class="header">RTP</div>
                        <span class="port-values">{{ t._('nw_NATInfo4',['RTP_PORT_FROM':'...','RTP_PORT_TO':'...']) }}</span>
                    </div>
                </div>
            </div>

            <div class="ui horizontal divider"></div>

            <div class="ui list">
                <div class="item">
                    <i class="lightbulb outline icon"></i>
                    <div class="content">{{ t._('nw_NATInfo5') }}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Dual-Stack Configuration Section (hidden by default, also inside nated-settings-group) -->
    <div class="field nated-settings-group" id="dual-stack-section" style="display:none;">
        <h4 class="ui dividing header">
            <i class="globe icon"></i>
            <div class="content">
                {{ t._('nw_DualStackConfiguration') }}
                <div class="sub header">{{ t._('nw_DualStackModeDescription') }}</div>
            </div>
        </h4>

        <!-- Hostname field (required in dual-stack) -->
        <!-- Note: Uses same #exthostname input which is moved here by JavaScript -->
        <div class="field" id="exthostname-dual-stack-container">
            <label>
                {{ t._('nw_DualStackHostnameRequired') }}
                <span style="color:red">*</span>
            </label>
            <div class="field max-width-500" id="exthostname-dual-stack-input-wrapper">
                <!-- Input will be moved here by JavaScript when dual-stack is active -->
            </div>
        </div>

        <!-- Port forwarding fields (still needed for IPv4 NAT) -->
        <!-- Note: Uses same port inputs which are moved here by JavaScript (like exthostname) -->
        <div class="field">
            <div class="inline field">
                <span id="external-sip-port-dual-stack-wrapper"></span>
                <label id="dual-stack-sip-port-label">{{ t._('nw_PublicSIPPort', ['SIP_PORT':'...']) }}</label>
            </div>
            <div class="inline field">
                <span id="external-tls-port-dual-stack-wrapper"></span>
                <label id="dual-stack-tls-port-label">{{ t._('nw_PublicTLSPort', ['TLS_PORT':'...']) }}</label>
            </div>
        </div>

        <!-- Dual-Stack specific info segments -->
        <div class="ui segments">
            <!-- DNS Configuration Segment -->
            <div class="ui blue segment">
                <h5 class="ui header">
                    <i class="globe icon"></i>
                    <div class="content">
                        {{ t._('nw_DualStackDnsConfiguration') }}
                    </div>
                </h5>
                <p>{{ t._('nw_DualStackDnsConfigurationDescription') }} <code id="hostname-display">mikopbx.company.com</code></p>
                <div class="ui relaxed divided list">
                    <div class="item">
                        <i class="tag icon"></i>
                        <div class="content">
                            <div class="header">A {{ t._('nw_DualStackDnsARecord') }}</div>
                            <div class="description">{{ t._('nw_DualStackDnsARecordDescription') }}</div>
                        </div>
                    </div>
                    <div class="item">
                        <i class="tags icon"></i>
                        <div class="content">
                            <div class="header">AAAA {{ t._('nw_DualStackDnsAAAARecord') }}</div>
                            <div class="description">{{ t._('nw_DualStackDnsAAAARecordDescription') }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- IPv4 NAT Segment -->
            <div class="ui segment">
                <h5 class="ui header">
                    <i class="network wired icon"></i>
                    <div class="content">
                        {{ t._('nw_DualStackIpv4Nat') }}
                    </div>
                </h5>
                <p>{{ t._('nw_DualStackIpv4NatDescription') }}</p>
                <div class="ui relaxed list">
                    <div class="item" id="dual-stack-sip-ports">
                        <i class="phone icon"></i>
                        <div class="content">
                            <div class="header">SIP</div>
                            <span class="port-values">{{ t._('nw_NATInfo3', ['SIP_PORT':'...','TLS_PORT':'...']) }}</span>
                        </div>
                    </div>
                    <div class="item" id="dual-stack-rtp-ports">
                        <i class="microphone icon"></i>
                        <div class="content">
                            <div class="header">RTP</div>
                            <span class="port-values">{{ t._('nw_NATInfo4',['RTP_PORT_FROM':'...','RTP_PORT_TO':'...']) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- IPv6 Info Segment -->
            <div class="ui teal segment">
                <h5 class="ui header">
                    <i class="sitemap icon"></i>
                    <div class="content">
                        {{ t._('nw_DualStackIpv6Info') }}
                    </div>
                </h5>
                <p>{{ t._('nw_DualStackIpv6InfoDescription') }}</p>
            </div>
        </div>
    </div>
</div>