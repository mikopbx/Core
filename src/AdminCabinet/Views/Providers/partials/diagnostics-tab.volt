<!-- Provider Status Timeline -->
<div class="ui basic segment" style="padding: 0; margin-bottom: 20px;">
    <h4 class="ui header">
        {{ t._('pr_StatusTimeline') }}
        <div class="sub header">{{ t._('pr_Last24Hours') }}</div>
    </h4>
    
    <div id="provider-timeline-container" style="position: relative; height: 40px; background: #f0f0f0; border-radius: 4px; overflow: hidden; margin: 15px 0;">
        <div id="provider-timeline" style="position: absolute; width: 100%; height: 100%; display: flex;">
            <!-- Timeline will be populated by JavaScript -->
        </div>
        <div class="ui active inverted dimmer" id="timeline-loader">
            <div class="ui text loader">{{ t._('pr_LoadingTimeline') }}</div>
        </div>
    </div>
    
    <div class="ui horizontal list">
        <div class="item">
            <i class="circle icon" style="color: #21ba45;"></i>
            {{ t._('pr_StatusOnline') }}
        </div>
        <div class="item">
            <i class="circle icon" style="color: #fbbd08;"></i>
            {{ t._('pr_StatusWarning') }}
        </div>
        <div class="item">
            <i class="circle icon" style="color: #db2828;"></i>
            {{ t._('pr_StatusOffline') }}
        </div>
        <div class="item">
            <i class="circle icon" style="color: #767676;"></i>
            {{ t._('pr_StatusUnknown') }}
        </div>
    </div>
</div>

<!-- Statistics -->
<div class="ui three statistics" style="margin: 30px 0;">
    <div class="statistic">
        <div class="value" style="color: #21ba45;">
            <span id="provider-rtt-value">--</span>
        </div>
        <div class="label">{{ t._('pr_Latency') }}</div>
    </div>
    <div class="statistic">
        <div class="value">
            <span id="provider-duration-value">--</span>
        </div>
        <div class="label" id="provider-state-label">{{ t._('pr_CurrentState') }}</div>
    </div>
    <div class="statistic">
        <div class="value">
            <span id="provider-availability-value">--</span>
        </div>
        <div class="label">{{ t._('pr_Availability24h') }}</div>
    </div>
</div>

<!-- Actions -->
<div class="ui basic segment" style="padding: 0;">
    <button class="ui primary button" id="check-now-btn">
        <i class="sync icon"></i>
        {{ t._('pr_ForceCheck') }}
    </button>
</div>

<div class="ui divider"></div>

<!-- Export history -->
<div class="ui basic segment" style="padding: 0;">
    <button class="ui labeled icon button" id="export-history-btn">
        <i class="download icon"></i>
        {{ t._('pr_ExportHistory') }}
    </button>
    <span class="ui text" style="margin-left: 10px; color: #999;">
        {{ t._('pr_ExportHistoryHint') }}
    </span>
</div>