<!-- Audio codecs container -->
<div id="audio-codecs-container">
    <div class="ui active inverted dimmer" id="audio-codecs-loader">
        <div class="ui text loader">{{ t._('gs_LoadingCodecs') }}</div>
    </div>
    <table class="ui selectable compact unstackable table" id="audio-codecs-table" style="display:none;">
        <thead>
            <tr>
                <th colspan="2">{{ t._('gs_AudioCodecs') }}</th>
            </tr>
        </thead>
        <tbody>
            <!-- Will be populated dynamically -->
        </tbody>
    </table>
</div>

<!-- Video codecs container -->
<div id="video-codecs-container">
    <div class="ui active inverted dimmer" id="video-codecs-loader">
        <div class="ui text loader">{{ t._('gs_LoadingCodecs') }}</div>
    </div>
    <table class="ui selectable compact unstackable table" id="video-codecs-table" style="display:none;">
        <thead>
            <tr>
                <th colspan="2">{{ t._('gs_VideoCodecs') }}</th>
            </tr>
        </thead>
        <tbody>
            <!-- Will be populated dynamically -->
        </tbody>
    </table>
</div>