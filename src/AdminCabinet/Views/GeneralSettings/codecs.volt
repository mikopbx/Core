{% for codec in audioCodecs %}
    {% if loop.first %}
        <h4 class="ui header">{{ t._('gs_AudioCodecs') }}</h4>
        <table class="ui selectable compact unstackable table" id="audio-codecs-table">
        <thead>
        <tr>
            <th class="ui one wide"></th>
            <th>{{ t._('gs_CodecsOrder') }}</th>
        </tr>
        </thead>
        <tbody>
    {% endif %}

    <tr class="codec-row" id="{{ codec['id'] }}" data-value="{{ codec['priority'] }}">
        <td class="dragHandle"><i class="sort grey icon"></i></td>
        <td>
            <div class="ui toggle checkbox codecs">
                <input type="checkbox" name="codec_{{ codec['name'] }}" {% if codec['disabled']==='0' %} checked {% endif %}
                       tabindex="0" class="hidden">
                <label for="codec_{{ codec['name'] }}">{{ codec['description'] }}</label>
            </div>
        </td>
    </tr>

    {% if loop.last %}

        </tbody>
        </table>
    {% endif %}
{% endfor %}

{% for codec in videoCodecs %}
    {% if loop.first %}
        <h4 class="ui header">{{ t._('gs_VideoCodecs') }}</h4>
        <table class="ui selectable compact unstackable table" id="video-codecs-table">
        <thead>
        <tr>
            <th class="ui one wide"></th>
            <th>{{ t._('gs_CodecsOrder') }}</th>
        </tr>
        </thead>
        <tbody>
    {% endif %}

    <tr class="codec-row" id="{{ codec['id'] }}" data-value="{{ codec['priority'] }}">
        <td class="dragHandle"><i class="sort grey icon"></i></td>
        <td>
            <div class="ui toggle checkbox codecs">
                <input type="checkbox" name="codec_{{ codec['name'] }}" {% if codec['disabled']==='0' %} checked {% endif %}
                       tabindex="0" class="hidden">
                <label for="codec_{{ codec['name'] }}" >{{ codec['description'] }}</label>
            </div>
        </td>
    </tr>

    {% if loop.last %}

        </tbody>
        </table>
    {% endif %}
{% endfor %}