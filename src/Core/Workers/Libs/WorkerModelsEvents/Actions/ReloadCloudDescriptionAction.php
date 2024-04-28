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
        $description = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_DESCRIPTION);
        $cloudInstanceId = PbxSettings::getValueByKey(PbxSettingsConstants::CLOUD_INSTANCE_ID);
        $webAdminPassword = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_PASSWORD);
        $defaultDescription = PbxSettingsConstants::DEFAULT_CLOUD_PASSWORD_DESCRIPTION;

        if ($cloudInstanceId === $webAdminPassword && $description!==$defaultDescription){
            $config = new MikoPBXConfig();
            $config->setGeneralSettings(PbxSettingsConstants::PBX_DESCRIPTION, $defaultDescription);
        } elseIf ($description === $defaultDescription) {
            $config = new MikoPBXConfig();
            $config->resetGeneralSettings(PbxSettingsConstants::PBX_DESCRIPTION);
        }
    }
}