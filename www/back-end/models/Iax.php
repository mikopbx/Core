<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;
use Phalcon\Mvc\Model\Relation;

class Iax extends ModelsBase
{
    /**
     * @var integer
     */
    public $id;

    /**
     * @var string
     */
    public $uniqid;

    /**
     * @var string
     */
    public $username;

    /**
     * @var string
     */
    public $secret;

    /**
     * @var string
     */
    public $host;

    /**
     * @var integer
     */
    public $qualify;

    /**
     * @var integer
     */
    public $disabled;

    /**
     * @var integer
     */
    public $noregister;

    /**
     * @var string
     */
    public $manualattributes;
    /**
     * @var string
     */
    public $description;

    public function getSource() :string
    {
        return 'm_Iax';
    }

    public function initialize() :void
    {
	    parent::initialize();
        $this->hasMany(
            'uniqid',
            'Models\IaxCodecs',
            'iaxuid',
            [
                'alias'=>'Codecs',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action'     => Relation::ACTION_CASCADE
                ],
                'params' => array(
                    'order' => 'priority asc'
                )
            ]
        );

        $this->belongsTo(
            'uniqid',
            'Models\Providers',
            'iaxuid',
            [
                'alias'=>'Providers',
                'foreignKey' => [
                    'allowNulls' => false,
                    'action'     => Relation::ACTION_CASCADE,
                ]
            ]
        );
    }

	public function setManualAttributes( $text ) :void
    {
		$this->manualattributes = base64_encode( $text );
	}

	public function getManualAttributes()  :string
    {
		return base64_decode( $this->manualattributes );
	}

    public function validation() :bool
    {

        $validation = new \Phalcon\Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t('mo_ThisUniqidMustBeUniqueForIAXModels')
        ]));
        return $this->validate($validation);


    }

}

