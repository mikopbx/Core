<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2020
 */

namespace MikoPBX\Common\Models;

/**
 * Class CallDetailRecordsBase
 *
 * @package MikoPBX\Common\Models
 */
abstract class CallDetailRecordsBase extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Time call starts
     * @Column(type="string", nullable=true)
     */
    public ?string $start = null;

    /**
     * Time when call ends
     * @Column(type="string", nullable=true)
     */
    public ?string $endtime = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $answer = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $src_chan = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $src_num = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dst_chan = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dst_num = null;

    /**
     * @Primary
     * @Column(type="string", nullable=true)
     */
    public ?string $UNIQUEID = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $linkedid = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $did = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $disposition = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $recordingfile = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $from_account = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $to_account = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dialstatus = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $appname = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $transfer = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $is_app = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $duration = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $billsec = null;

    /**
     * @Column(type="integer", nullable=true)
     */
    public ?string $work_completed = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $src_call_id = null;

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $dst_call_id = null;

    public function getIndexColumn():array {
        return ['UNIQUEID', 'src_chan', 'dst_chan', 'linkedid', 'start', 'src_num', 'dst_num'];
    }

}