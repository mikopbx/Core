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

namespace MikoPBX\Common\Models;


/**
 * Class Codecs
 *
 * @package MikoPBX\Common\Models
 */
class Codecs extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Codec name.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * Type of the codec (audio or video).
     * @Column(type="string", nullable=true)
     */
    public ?string $type = 'audio';

    /**
     * Priority of the codec.
     *
     * @Column(type="integer", nullable=true, default="1")
     */
    public ?string $priority = '1';

    /**
     * Indicator if the codec is disabled (0 for enabled, 1 for disabled).
     *
     * @Column(type="string", length=1, nullable=true)
     */
    public ?string $disabled = '0';

    /**
     * Description of the codec.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_Codecs');
        parent::initialize();
    }
}