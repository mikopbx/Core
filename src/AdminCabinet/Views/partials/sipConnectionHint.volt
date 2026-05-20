{#
 # SIP Connection Hint
 #
 # Read-only cheat-sheet showing per-transport SIP client connection parameters
 # (Username, Auth username, Port). Values are recomputed in JavaScript when the
 # extension number changes. Server-rendered defaults are taken from PbxSettings.
 #}
<div class="sip-connection-hint collapsed" id="sip-connection-hint"
     data-auth-prefix="{{ sipConnectionParams['authPrefix'] }}"
     data-sip-port="{{ sipConnectionParams['extSipPort'] }}"
     data-sip-port-internal="{{ sipConnectionParams['sipPort'] }}"
     data-has-ext-sip="{{ sipConnectionParams['hasExtSip'] ? '1' : '0' }}"
     data-tls-port="{{ sipConnectionParams['extTlsPort'] }}"
     data-tls-port-internal="{{ sipConnectionParams['tlsPort'] }}"
     data-has-ext-tls="{{ sipConnectionParams['hasExtTls'] ? '1' : '0' }}"
     data-wss-port="{{ sipConnectionParams['wssPort'] }}"
     data-wss-path="{{ sipConnectionParams['wssPath'] }}">
    <div class="sip-connection-hint-header" id="sip-conn-hint-toggle"
         role="button" tabindex="0"
         aria-expanded="false" aria-controls="sip-conn-hint-body">
        <i class="info circle icon"></i>
        <span class="sip-connection-hint-title">
            {{ t._('ex_SipConnHint_Title') }}
            <i class="dropdown icon sip-connection-hint-chevron"></i>
        </span>
        <div class="ui mini basic icon buttons sip-connection-hint-actions">
            <button type="button" class="ui button" id="sip-conn-hint-copy"
                    data-tooltip="{{ t._('ex_SipConnHint_CopyTooltip') }}" data-position="top right">
                <i class="copy outline icon"></i>
            </button>
        </div>
    </div>
    <div class="sip-connection-hint-body" id="sip-conn-hint-body">
    <table class="ui very basic compact small table sip-connection-hint-table">
        <thead>
            <tr>
                <th>{{ t._('ex_SipConnHint_Transport') }}</th>
                <th>{{ t._('ex_SipConnHint_Username') }}</th>
                <th>{{ t._('ex_SipConnHint_AuthUsername') }}</th>
                <th>{{ t._('ex_SipConnHint_Port') }}</th>
            </tr>
        </thead>
        <tbody>
            <tr data-transport="udp">
                <td><span class="ui small label">UDP / TCP</span></td>
                <td><code class="sip-conn-hint-username"></code></td>
                <td><code class="sip-conn-hint-auth"></code></td>
                <td><code class="sip-conn-hint-port"></code></td>
            </tr>
            <tr data-transport="tls">
                <td><span class="ui small label">TLS</span></td>
                <td><code class="sip-conn-hint-username"></code></td>
                <td><code class="sip-conn-hint-auth"></code></td>
                <td><code class="sip-conn-hint-port"></code></td>
            </tr>
            <tr data-transport="wss">
                <td><span class="ui small label">WSS</span></td>
                <td><code class="sip-conn-hint-username"></code></td>
                <td><code class="sip-conn-hint-auth"></code></td>
                <td><code class="sip-conn-hint-wss"></code></td>
            </tr>
        </tbody>
    </table>
    </div>
</div>
