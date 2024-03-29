<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\MikoPBXConfig;

class ReloadCloudDescriptionAction implements ReloadActionInterface
{
    public const DEFAULT_PASSWORD_DESCRIPTION = 'auth_DefaultCloudPasswordInstructions';

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

        if ($cloudInstanceId === $webAdminPassword && $description!==self::DEFAULT_PASSWORD_DESCRIPTION){
            $config = new MikoPBXConfig();
            $config->setGeneralSettings(PbxSettingsConstants::PBX_DESCRIPTION, self::DEFAULT_PASSWORD_DESCRIPTION);
        } elseIf ($description === self::DEFAULT_PASSWORD_DESCRIPTION) {
            $config = new MikoPBXConfig();
            $config->resetGeneralSettings(PbxSettingsConstants::PBX_DESCRIPTION);
        }
    }
}