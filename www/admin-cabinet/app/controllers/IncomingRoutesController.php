<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

use Models\IncomingRoutingTable,
    Models\Extensions,
    Models\Providers,
    Models\Sip;


class IncomingRoutesController extends BaseController {

	/**
	 * Построение списка входящих маршрутов
	 */
    public function indexAction()
    {
        $parameters = array(
            'conditions'=>'id>1',
            'order'=>'priority'
        );

        $rules = IncomingRoutingTable::find($parameters);
        $routingTable = array();
        foreach ($rules as $rule){
            $provider= $rule->Providers;
            if ($provider){
                $modelType=ucfirst($provider->type);
                $provByType = $provider->$modelType;
            } else{
                $provByType = new SIP();
            }
            $extension = $rule->Extensions;

	        $values = array(
                'id'            =>  $rule->id,
                'rulename'      =>  $rule->rulename,
                'priority'      =>  $rule->priority,
                'number'        =>  $rule->number,
                'timeout'       =>  $rule->timeout,
                'provider'      =>  $rule->Providers?$rule->Providers->getRepresent():'',
                'disabled'      =>  $provByType->disabled,
                'extension'     =>  $rule->extension,
                'callerid'      =>  $extension?$extension->getRepresent():'',
                'note'          =>  $rule->note
            );

	        $routingTable[] = $values;
        }
        //Маршрут по умолчанию
        $defaultRule = IncomingRoutingTable::findFirstById(1);
        if (!$defaultRule) {
            $defaultRule = new IncomingRoutingTable();
            $defaultRule->id = 1;
            $defaultRule->action   = "busy";
            $defaultRule->priority = 9999;
            $defaultRule->rulename = "default action";
        };

        // Список всех используемых эктеншенов
	    $forwardingExtensions[""] = $this->translation->_( "ex_SelectNumber" );
        $parameters               =[
            'conditions'=>'number IN ({ids:array})',
            'bind'=>[
                'ids'=>[
                    $defaultRule->extension,
                ]]
        ];
        $extensions               = Extensions::find($parameters);
        foreach ($extensions as $record){
            $forwardingExtensions[$record->number]=$record?$record->getRepresent():'';
        }

        $form = new DefaultIncomingRouteForm($defaultRule,['extensions'=>$forwardingExtensions]);
        $this->view->form =$form;
        $this->view->routingTable = $routingTable;
		$this->view->submitMode = NULL;
    }


	/**
	 * Карточка редактирования входящего маршрута
	 *
	 * @param null $ruleid Идентификатор правила маршрутизации
	 */
	public function modifyAction($ruleid=null){
		if ( $ruleid == 1 ) {
			return $this->forward( 'incoming-routes/index' );
		} // Первая строка маршрут по умолчанию, ее не трогаем.

        $rule = IncomingRoutingTable::findFirstByid($ruleid);
		if ( ! $rule ) {
			$rule = new IncomingRoutingTable();
		}

        // Список провайдеров
        $providersList = [];
        $providersList['none']=$this->translation->_('ir_AnyProvider');
        $providers = Providers::find();
        foreach ($providers as $provider){
            $modelType=ucfirst($provider->type);
            $provByType= $provider->$modelType;
            $providersList[$provByType->uniqid]=$provByType->getRepresent();
        }

        // Список всех используемых эктеншенов
		$forwardingExtensions[""] = $this->translation->_( "ex_SelectNumber" );
        $parameters               =[
            'conditions'=>'number IN ({ids:array})',
            'bind'=>[
                'ids'=>[
                    $rule->extension,
                ]]
        ];
        $extensions               = Extensions::find($parameters);
        foreach ($extensions as $record){
            $forwardingExtensions[$record->number]=$record?$record->getRepresent():'';
        }
        $form = new IncomingRouteEditForm($rule, ['extensions'=>$forwardingExtensions,'providers'=>$providersList]);
        $this->view->form = $form;
	    $this->view->represent  = $rule->getRepresent();

    }


    /**
	 * Сохранение входящего маршрута
	 */
	public function saveAction()
    {
	    if (!$this->request->isPost()) return;

	    $this->db->begin();

	    $data = $this->request->getPost();

        $rule = IncomingRoutingTable::findFirstByid($data['id']);
        if (!$rule)  $rule = new IncomingRoutingTable();

        foreach ($rule as $name => $value) {
            switch($name) {
                case "provider":
                    if ($data[$name]=="none"){
	                    $rule->$name = null;
                    } else {
	                    $rule->$name = $data[$name];
                    }
                    break;
	            case "priority":
		            if ( empty( $data[ $name ] ) ) {
			            // Найдем строчку с самым высоким приоиртетом, кроме 9999
			            $params      = [
				            'column'     => 'priority',
				            'conditions' => 'priority != 9999',
			            ];
			            $request     = IncomingRoutingTable::maximum( $params );
			            $rule->$name = $request + 1;
		            } else {
			            $rule->$name = $data[ $name ];
		            }

		            break;
                default:
                    if (!array_key_exists($name, $data)) continue;
	                $rule->$name = $data[$name];
            }
        }

	    if ($rule->save() === false) {
		    $errors = $rule->getMessages();
		    $this->flash->warning(implode('<br>', $errors));
		    $this->view->success = false;
		    $this->db->rollback();
		    return;
	    }

	    $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
	    $this->view->success=true;
	    $this->db->commit();

	    // Если это было создание карточки то надо перегрузить страницу с указанием ID
	    if (empty($data['id'])){
		    $this->view->reload = "incoming-routes/modify/{$rule->id}";
	    }

    }

	/**
	 * Удаление входящего маршрута
	 *
	 * @param string $ruleid
	 */
	public function deleteAction(string $ruleid){
        if ($ruleid==1) return $this->forward('incoming-routes/index'); // Первая строка маршрут по умолчанию, ее не трогаем.
        $rule = IncomingRoutingTable::findFirstByid($ruleid);
        if ($rule) $rule->delete();
        return $this->forward('incoming-routes/index');

    }

	/**
	 * Изменение приоритета маршрута
	 *
	 * @param string|NULL $ruleid
	 */
	public function changePriorityAction(string $ruleid=null){
		$this->view->disable();
		$result = false;

		if (!$this->request->isPost()) {
			return;
		}
		if ($ruleid==1) return; // Первая строка маршрут по умолчанию, ее не трогаем.
		$data = $this->request->getPost();
		$rule = IncomingRoutingTable::findFirstById($ruleid);
		if ($rule){
			$rule->priority=intval($data['newPriority']);
			$result=$rule->update();
		}
		echo json_encode($result);
	}
}