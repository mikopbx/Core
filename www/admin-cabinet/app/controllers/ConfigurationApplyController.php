<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */


/**
 * ConfigurationApplyController
 *
 * Хранит историю применения изменений конфигурации.
 */
class ConfigurationApplyController extends BaseController {


	/**
	 * Сбрасывает параметры сессии после успешного применения параметров на
	 * стороне PBX
	 *
	 */
	public function resetConfigurationChangedAction( $appliedFunction ) {
		if ( $this->session->has( "configuration-has-changes" ) ) {
			$arrActions                     = $this->session->get( 'configuration-has-changes' );
			$arrActions[ $appliedFunction ] = FALSE;
			$this->session->set( "configuration-has-changes", $arrActions );
		}
		$this->view->success = TRUE;
	}

	/**
	 * Проверка на наличие непераданных в PBX изменений
	 *
	 */
	public function getNewConfigurationChangesAction() {
		$this->view->changed = FALSE;
		if ( $this->session->has( "configuration-has-changes" ) ) {
			$arrActions     = $this->session->get( 'configuration-has-changes' );
			$arrNeedActions = [];
			foreach ( $arrActions as $action => $state ) {
				if ( $state ) {
					$arrNeedActions[] = $action;
				}
			}
			if ( count( $arrNeedActions ) > 0 ) {
				$this->view->changed = TRUE;
				usort( $arrNeedActions,
					[ "ConfigurationApplyController", "sortActionsArray" ] );
				$this->view->actions = json_encode( $arrNeedActions );
			}
		}
		$this->view->success = TRUE;
	}

	/**
	 * Сортировка массива действий
	 * Перезагрузка сети и firewall должна быть всегда последней
	 *
	 * @return bool
	 */
	private function sortActionsArray( $a, $b ) {
		if ( $b == "ReloadFirewall" and $a != 'ReloadNetwork' ) {
			return FALSE;
		}
		if ( $b == 'ReloadNetwork' ) {
			return FALSE;
		}

		return TRUE;
	}
}
