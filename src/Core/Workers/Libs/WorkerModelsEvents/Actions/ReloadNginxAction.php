<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;
use MikoPBX\Core\System\Configs\NginxConf;

class ReloadNginxAction implements ReloadActionInterface
{
    /**
     * Regenerates Nginx configuration and restarts service.
     * This includes regenerating main HTTP/HTTPS configs with IPv6 listeners
     * when IPv6 is enabled on network interfaces.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $nginxConf = new NginxConf();
        $nginxConf->generateConf();
        $nginxConf->reStart();
    }
}