<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\MikoPBXConfig;

class ReloadCloudDescriptionAction implements ReloadActionInterface
{
    /**
     * Reset default cloud password instructions
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        if (PbxSettings::getValueByKey(PbxSettingsConstants::PBX_DESCRIPTION)==='auth_DefaultCloudPasswordInstructions'){
            $config = new MikoPBXConfig();
            $config->resetGeneralSettings(PbxSettingsConstants::PBX_DESCRIPTION);
        }
    }
}