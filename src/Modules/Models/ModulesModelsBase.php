<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Modules\Models;

use MikoPBX\Common\Models\ModelsBase;
use Phalcon\Text;
use Phalcon\Url;
use ReflectionClass as ReflectionClassAlias;

class ModulesModelsBase extends ModelsBase
{
    protected string $moduleUniqueId;

    /**
     * Class initialization and create DB connection by Class and DB name,
     * it uses on src/Common/Providers/ModulesDBConnectionsProvider.php
     */
    public function initialize(): void
    {
        // Get child class parameters and define module UniqueID
        $reflector        = new ReflectionClassAlias(static::class);
        $partsOfNameSpace = explode('\\', $reflector->getNamespaceName());
        if (count($partsOfNameSpace) === 3 && $partsOfNameSpace[0] === 'Modules') {
            $this->moduleUniqueId = $partsOfNameSpace[1];
            $this->setConnectionService("{$this->moduleUniqueId}_module_db");
        }
        parent::initialize();
    }

    /**
     *  Returns module name in human readable form for error and notification messages
     *
     * @param bool $needLink
     *
     * @return string
     */
    public function getRepresent($needLink = false): string
    {
        if (property_exists($this, 'id') && $this->id === null) {
            return $this->t('mo_NewElement');
        }

        if (isset($this->moduleUniqueId)) {
            $name = '<i class="puzzle piece icon"></i> '
                . $this->t('mo_' . $this->moduleUniqueId);
        } else {
            $name = 'Unknown';
        }

        if ($needLink) {
            if (empty($name)) {
                $name = $this->t('repLink');
            }
            $link = $this->getWebInterfaceLink();

            $result = $this->t(
                'rep' . $this->moduleUniqueId,
                [
                    'represent' => "<a href='{$link}'>{$name}</a>",
                ]
            );
        } else {
            $result = $name;
        }

        return $result;
    }

    /**
     * Return link on database record in web interface
     *
     * @return string
     */
    public function getWebInterfaceLink(): string
    {
        if (isset($this->moduleUniqueId)) {
            $url  = new Url();
            $link = $url->get(Text::uncamelize($this->moduleUniqueId, '-'));
        } else {
            $link = '#';
        }

        return $link;
    }

}