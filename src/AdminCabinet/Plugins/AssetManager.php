<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2021 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\AdminCabinet\Plugins;


use Phalcon\Assets\Manager;

class AssetManager extends Manager
{
    private string $version;

    /**
     * Sets asset versions
     *
     * @param string $version
     */
    public function setVersion(string $version)
    {
        $this->version = $version;
    }

    /**
     * Prints the HTML for CSS assets
     *
     * @param string|null $collectionName
     *
     * @return string
     */
    public function outputCss(string $collectionName = null): string
    {
        if ($collectionName !== null) {
            foreach ($this->collection($collectionName) as $resource) {
                $resource->setVersion($this->version);
            }
        }

        return parent::outputCss($collectionName);
    }

    /**
     * Prints the HTML for JS assets
     *
     * @param string|null $collectionName
     *
     * @return string
     */
    public function outputJs(string $collectionName = null): string
    {
        if ($collectionName !== null) {
            foreach ($this->collection($collectionName) as $resource) {
                $resource->setVersion($this->version);
            }
        }

        return parent::outputJs($collectionName);
    }

}