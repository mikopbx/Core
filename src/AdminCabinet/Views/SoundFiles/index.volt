<div class="ui top attached tabular menu" id="sound-files-menu">
    <a class="item active" data-tab="custom">{{ t._('sf_CustomSounds') }}</a>
    <a class="item" data-tab="moh">{{ t._('sf_MusicOnHold') }}</a>
</div>
<div class="ui bottom attached tab segment active" data-tab="custom">
    <div class="ui grid">
        <div class="row">
            <div class="eight wide column">
                {% if isAllowed('save') %}
                    {{ link_to("sound-files/modify/custom", '<i class="add circle icon"></i> '~t._('sf_AddNewSoundFile'), "class": " ui blue button ", "id":"add-new-custom-button") }}
                {% endif %}
            </div>
            <div class="right aligned eight wide column">
                <!-- DataTable filter will be moved here by JavaScript -->
            </div>
        </div>
    </div>
    <!-- Content will be loaded dynamically via JavaScript -->
</div>
<div class="ui bottom attached tab segment" data-tab="moh">
    <div class="ui grid">
        <div class="row">
            <div class="eight wide column">
                {% if isAllowed('save') %}
                    {{ link_to("sound-files/modify/moh", '<i class="add circle icon"></i> '~t._('sf_AddNewSoundFile'), "class": " ui blue button ", "id":"add-new-moh-button") }}
                {% endif %}
            </div>
            <div class="right aligned eight wide column">
                <!-- DataTable filter will be moved here by JavaScript -->
            </div>
        </div>
    </div>
    <!-- Content will be loaded dynamically via JavaScript -->
</div>
