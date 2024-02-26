<div class="ui modal" id="module-details-template">
    <div class="ui grid">
        {# The first row  #}
        <div class="two column row">
            <div class="left floated column">
                <div class="ui header">
                    <img class="module-logo" src="{# logoUrl #}" alt="{# modulename #}"/>
                    <div class="content">
                        <span class="module-name">{# modulename #}</span>
                        <div class="sub header module-id" >{# moduleUniqueID #}</div>
                    </div>
                </div>
            </div>
            <div class="right floated column">
                <a href="#" class="ui icon basic button download main-install-button"  data-uniqid = "">
                    <i class="icon download blue"></i>
                    <span class="percent"></span>
                    {{ t._('ext_InstallModule') }}
                </a>
                <span class="module-count-installed">{# countOfInstallations #}</span>
            </div>
        </div>

        {# The second row  #}
        <div class="equal width row">
            <div class="column" >{{ t._('ext_ModuleLastRelease') }} <span class="module-latest-release"></span></div>
            <div class="column">{{ t._('ext_ModuleLastRelease') }} <span class="module-publisher"></span></div>
            <div class="column" class="module-commercial">{# commercial #}</div>
            <div class="column" class="module-latest-release-size">{# sizeInfo #}</div>
        </div>

        {# The third row  #}
        <div class="row">
            <div class="column">
                <div class="ui pointing menu module-details-menu">
                    <a class="item active" data-tab="description">{{ t._('ext_ModuleDescriptionTab') }}</a>
                    <a class="item" data-tab="changelog">{{ t._('ext_ModuleChangelogTab') }}</a>
                    {{ partial("PbxExtensionModules/hookVoltBlock",
                        ['arrayOfPartials':hookVoltBlock('TabularMenu')])
                    }}
                </div>
                <div class="ui tab segment" data-tab="description">
                    <div class="module-screenshots"></div>
                    <div class="module-description"></div>
                    {# tabScreenshotsWithSliderAndmoduleDescriptionAndUsefulLinks #}
                </div>

                <div class="ui tab segment module-changelog" data-tab="changelog">
                    {# tabChangeLogs with install button #}
                </div>

                {{ partial("PbxExtensionModules/hookVoltBlock",
                    ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
                }}
            </div>
        </div>
    </div>
</div>