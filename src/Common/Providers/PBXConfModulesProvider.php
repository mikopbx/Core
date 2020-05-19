<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\Common\Providers;

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\Asterisk\Configs\ConferenceConf;
use MikoPBX\Core\Asterisk\Configs\DialplanApplicationConf;
use MikoPBX\Core\Asterisk\Configs\ExternalPhonesConf;
use MikoPBX\Core\Asterisk\Configs\FeaturesConf;
use MikoPBX\Core\Asterisk\Configs\HttpConf;
use MikoPBX\Core\Asterisk\Configs\IAXConf;
use MikoPBX\Core\Asterisk\Configs\IndicationConf;
use MikoPBX\Core\Asterisk\Configs\IVRConf;
use MikoPBX\Core\Asterisk\Configs\ManagerConf;
use MikoPBX\Core\Asterisk\Configs\MikoAjamConf;
use MikoPBX\Core\Asterisk\Configs\ModulesConf;
use MikoPBX\Core\Asterisk\Configs\OtherConf;
use MikoPBX\Core\Asterisk\Configs\ParkConf;
use MikoPBX\Core\Asterisk\Configs\QueueConf;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\System\Util;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Exception;

/**
 * Main database connection is created based in the parameters defined in the configuration file
 */
class PBXConfModulesProvider implements ServiceProviderInterface
{
    /**
     * Register db service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            'pbxConfModules',
            function () {
                $arrObject = [];
                $arr       = [
                    ExternalPhonesConf::class,
                    OtherConf::class,
                    SIPConf::class,
                    IAXConf::class,
                    IVRConf::class,
                    ParkConf::class,
                    ConferenceConf::class,
                    QueueConf::class,
                    DialplanApplicationConf::class,
                    MikoAjamConf::class,
                    FeaturesConf::class,
                    HttpConf::class,
                    IndicationConf::class,
                    ManagerConf::class,
                    ModulesConf::class,
                ];

                // Add system classes
                foreach ($arr as $value) {
                    if (class_exists($value)) {
                        $arrObject[] = new $value();
                    }
                }

                // Add additional modules classes
                $modules = PbxExtensionModules::find('disabled=0');
                foreach ($modules as $value) {
                    $class_name      = str_replace('Module', '', $value->uniqid);
                    $full_class_name = "\\Modules\\{$value->uniqid}\\Lib\\{$class_name}Conf";
                    if (class_exists($full_class_name)) {
                        try {
                            $arrObject[] = new $full_class_name();
                        } catch (Exception $e) {
                            Util::sysLogMsg('INIT_MODULE', "Fail init module '{$value->uniqid}' ." . $e->getMessage());
                        }
                    }
                }

                return $arrObject;
            }
        );
    }
}