<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2019
 */

// namespace Inc;

require_once 'globals.php';
require_once 'simple_html_dom.php';

class LicenseWorker {

    /**
     * Выполнение запроса к локальному серверу NATS.
     * @param $metod
     * @param $data
     * @return mixed
     */
    private function curl_get($metod, $data){
        $params = http_build_query($data);
        $url = "127.0.0.1:8222/license.api/$metod";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array("Content-type: application/x-www-form-urlencoded") );

        $output = curl_exec($ch);
        curl_close($ch);

        return $output;
    }

    /**
     * Получение инфорамции по лицензиям. Установка значения ключа в NATS.
     * @param $key
     * @return array
     */
    public function getlicenseinfo($key){
        $result   = $this->curl_get('getlicenseinfo', ['key' => $key]);
        $products = $this->get_products($result);
        return $products;

    }

    /**
     * Получение нового регистрационного номера.
     * @param $params
     * @return mixed
     */
    public function gettriallicense($params){

        $data = array(
            'companyname' => $params['companyname'],
            'email' 	  => $params['email'],
            'contact' 	  => $params['contact'],
            'tel' 	  	  => $params['telefone'],
            'inn' 	  	  => $params['inn'],
            'description' => $params['inn'],
        );
        $result = $this->curl_get('gettrial', $data);

        return $result;

    }

    /**
     * Добавление нового триала к ключу.
     * @param $productid
     * @return mixed
     */
    public function addtrial($productid="11"){
        $data = array( 'product' => $productid );
        $result = $this->curl_get('addtrial', $data);
        return $result;
    }

    /**
     * Активация купона
     * @param $coupon
     * @return mixed
     */
    public function activatecoupon($coupon){
        $data = array('coupon' 	  => trim($coupon));
        $result = $this->curl_get('activatecoupon', $data);
        return $result;
    }

    /**
     * Получение информации о продуктах.
     * @param $text
     * @return array|bool
     */
    private function get_products($text){
        $text = str_replace('\n', "\n", $text);
        $text = str_replace('\"', '"', $text);

        $nf_features = array('1', '30', '13', '31', '32', '33', '34');

        $products = array();
        $json_data = json_decode($text, true);
        if(isset($json_data['error'])){
            return false;
        }else{
            $text_xml  = urldecode( $json_data['result'] );
            $res   = str_get_html( trim($text_xml) );
            if($res ){
                foreach($res->find('product feature') as $e){
                    $productid = $e->parent()->id;
                    $featureid = $e->id;

                    $p = &$products[];
                    if(is_array($p) && $p['trial']=='0'){
                        continue;
                    }
                    if($e->parent()->trial=='1'){
                        $p['trial']   = true;
                        $p['expired'] = $e->parent()->expired;
                    }else{
                        $p['trial']   = false;
                        $p['expired'] = '';
                    }
                    $p['product_name']  = $e->parent()->name;
                    $p['feature_name']  = $e->name;
                    $p['productid'] 	= $productid;
                    $p['featureid']  	= $featureid;

                    $id = array_search("$featureid", $nf_features);
                    if($id !== FALSE){
                        unset($nf_features[$id]);
                    }

                }
            }
        }
        $data = array(
            'nf_features' => $nf_features,
            'products' => $products
        );

        return $data;
    }
}