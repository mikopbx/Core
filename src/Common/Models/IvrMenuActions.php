<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
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
     * @Column(type="string", nullable=true)
     */
    public $ivr_menu_id;

    /**
     * @Column(type="string", nullable=true)
     */
    public $digits;

    /**
     * @Column(type="string", nullable=true)
     */
    public $extension;


    public function initialize(): void
    {
        $this->setSource('m_IvrMenuActions');
        parent::initialize();
        $this->belongsTo(
            'extension',
            Extensions::class,
            'number',
            [
                'alias'      => 'Extensions',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
        $this->belongsTo(
            'ivr_menu_id',
            IvrMenu::class,
            'uniqid',
            [
                'alias'      => 'IvrMenu',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::NO_ACTION,
                ],
            ]
        );
    }

}