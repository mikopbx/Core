<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */
namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\Common\Models\Users;

class UsersController extends BaseController
{

    /**
     * Saves Base64 from database to cache dir, and returns full url
     *
     * @param $item
     *
     * @return string
     */
    public function getUserAvatarUrl(Users $item): string
    {
        if ($item->avatar) {
            $filename = md5($item->avatar);
            $imgFile  = "{$this->config->adminApplication->imgCacheDir}/$filename.jpg";
            if ( ! file_exists($imgFile)) {
                $this->base64ToJpeg($item->avatar, $imgFile);
            }
            $result = "{$this->url->get()}public/assets/img/cache/{$filename}.jpg";
        } else {
            $result = "{$this->url->get()}public/assets/img/unknownPerson.jpg";
        }
    }
}