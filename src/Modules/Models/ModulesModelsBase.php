<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Modules\Models;

use MikoPBX\Common\Models\ModelsBase;
use MikoPBX\Common\Providers\ConfigProvider;
use Phalcon\Text;
use Phalcon\Url;
use ReflectionClass as ReflectionClassAlias;

/**
 * Base class for module models.
 *
 * @package MikoPBX\Modules\Models
 */
class ModulesModelsBase extends ModelsBase
{
    protected bool $initialized = false;
    protected string $moduleUniqueId;

    /**
     * Class initialization and create DB connection by Class and DB name,
     * it is used in src/Common/Providers/ModulesDBConnectionsProvider.php.
     */
    public function initialize(): void
    {
        // Get child class parameters and define module UniqueID
        $reflector = new ReflectionClassAlias(static::class);
        $partsOfNameSpace = explode('\\', $reflector->getNamespaceName());
        if (count($partsOfNameSpace) === 3 && $partsOfNameSpace[0] === 'Modules') {
            $this->moduleUniqueId = $partsOfNameSpace[1];
            $this->setConnectionService(self::getConnectionServiceName($this->moduleUniqueId));
        }
        parent::initialize();
        $this->initialized = true;
    }

    /**
     * Returns the module name in a human-readable form for error and notification messages.
     *
     * @param bool $needLink Whether to include a link.
     *
     * @return string The module name.
     */
    public function getRepresent(bool $needLink = false): string
    {
        if (!$this->initialized) {
            $this->initialize();
        }

        if ($this->readAttribute('id') === null) {
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
     * Returns the link to the database record in the web interface.
     *
     * @return string The web interface link.
     */
    public function getWebInterfaceLink(): string
    {
        if (!$this->initialized) {
            $this->initialize();
        }
        if (isset($this->moduleUniqueId)) {
            $url = new Url();
            $baseUri = $this->di->getShared(ConfigProvider::SERVICE_NAME)->path('adminApplication.baseUri');
            $unCamelizedModuleId = Text::uncamelize($this->moduleUniqueId, '-');
            $link = $url->get("$unCamelizedModuleId/$unCamelizedModuleId/index", null, null, $baseUri);
        } else {
            $link = '#';
        }

        return $link;
    }

    /**
     * Returns the connection service name.
     *
     * @param string $moduleUniqueId Module UniqueID
     * @return string   The connection service name
     */
    public static function getConnectionServiceName(string $moduleUniqueId): string
    {
        return "{$moduleUniqueId}_module_db";
    }
}