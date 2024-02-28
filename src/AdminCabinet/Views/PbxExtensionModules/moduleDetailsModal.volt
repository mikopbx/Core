<div class="ui large scrolling modal" id="module-details-template">
    <i class="close icon"></i>
    <div class="ui basic segment">
        <div class="ui inverted active dimmer">
            <div class="ui text loader">Loading</div>
        </div>
    <div class="ui grid">
        {# The first row  #}
        <div class="middle aligned row">
            <div class="fifteen wide column">
                <div class="ui huge header">
                    <img class="module-logo" src="{# logoUrl #}" alt="{# modulename #}"/>
                    <div class="content">
                        <span class="module-name">{# modulename #}</span>
                        <div class="sub header module-id" >{# moduleUniqueID #}</div>
                    </div>
                </div>
            </div>
            <div class="one wide column">
                <i class="icon download"></i><span class="module-count-installed">{# countOfInstallations #}</span>
            </div>
        </div>

        {# The second row  #}
        <div class="equal width middle aligned row">
            <div class="column" >{{ t._('ext_ModuleLastRelease') }}: <b class="module-latest-release"></b></div>
            <div class="column">{{ t._('ext_ModulePublisher') }}: <b class="module-publisher"></b></div>
            <div class="column module-commercial">{# commercial #}</div>
            <div class="column">
                <a class="ui icon labeled blue button download main-install-button"  data-uniqid = "">
                    <i class="icon download"></i>
                    <span class="percent"></span>
                    <span class="button-text">{{ t._('ext_InstallModuleShort') }}</span>
                    (<span class="module-latest-release-size"></span>)
                </a>
                {# sizeInfo #}
            </div>
        </div>

        {# The third row  #}
        <div class="row">
            <div class="column">
                <div class="ui attached menu module-details-menu">
                    <a class="item active" data-tab="description">{{ t._('ext_ModuleDescriptionTab') }}</a>
                    <a class="item" data-tab="changelog">{{ t._('ext_ModuleChangelogTab') }}</a>
                    {{ partial("PbxExtensionModules/hookVoltBlock",
                        ['arrayOfPartials':hookVoltBlock('TabularMenu')])
                    }}
                </div>
                <div class="ui tab attached active segment" data-tab="description">
                    <div class="module-screenshots"></div>
                    <div class="module-description"></div>
                    {# tabScreenshotsWithSliderAndmoduleDescriptionAndUsefulLinks #}
                </div>

                <div class="ui tab attached segment module-changelog" data-tab="changelog">
                    {# tabChangeLogs with install button #}
                </div>

                {{ partial("PbxExtensionModules/hookVoltBlock",
                    ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
                }}
            </div>
        </div>
    </div>
    </div>
</div>