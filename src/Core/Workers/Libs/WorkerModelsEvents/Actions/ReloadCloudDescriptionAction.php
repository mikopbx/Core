<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Common\Models\PbxSettings;

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
        $description = PbxSettings::getValueByKey(PbxSettings::PBX_DESCRIPTION);
        $cloudInstanceId = PbxSettings::getValueByKey(PbxSettings::CLOUD_INSTANCE_ID);
        $webAdminPassword = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_PASSWORD);
        $defaultDescription = PbxSettings::DEFAULT_CLOUD_PASSWORD_DESCRIPTION;

        if ($cloudInstanceId === $webAdminPassword && $description !== $defaultDescription) {
            PbxSettings::setValueByKey(PbxSettings::PBX_DESCRIPTION, $defaultDescription);
        } elseif ($description === $defaultDescription) {
            PbxSettings::resetValueToDefault(PbxSettings::PBX_DESCRIPTION);
        }
    }
}
