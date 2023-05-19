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

use Phalcon\Mvc\Model\Relation;


/**
 * Class IvrMenuActions
 *
 * @package MikoPBX\Common\Models
 */
class IvrMenuActions extends ModelsBase
{

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * ID of the associated IVR menu.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $ivr_menu_id = '';

    /**
     * Digits for the IVR menu action.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $digits = '';

    /**
     * Extension associated with the IVR menu action.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extension = '';


    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_IvrMenuActions');
        parent::initialize();

        // Establish a belongsTo relationship with the Extensions model
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias' => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );

        // Establish a belongsTo relationship with the IvrMenu model
        $this->belongsTo(
            'ivr_menu_id',
            IvrMenu::class,
            'uniqid',
            [
                'alias' => 'IvrMenu',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action' => Relation::NO_ACTION,
                ],
            ]
        );
    }

}