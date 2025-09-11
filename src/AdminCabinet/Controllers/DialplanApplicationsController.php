<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\DialplanApplicationEditForm;

/**
 * DialplanApplicationsController - Simplified controller following IVR menu pattern
 * 
 * All data loading is handled by JavaScript via REST API.
 * Controller provides only the basic structure for views.
 */
class DialplanApplicationsController extends BaseController
{
    /**
     * Build the list of dialplan applications
     * 
     * Data is loaded by DataTable AJAX - no server-side processing needed
     */
    public function indexAction(): void
    {
        // No data loading needed - DataTable will use AJAX to load data
        // The view only provides the table structure
    }

    /**
     * Edit dialplan application details with copy support
     * 
     * Simplified controller - all data loading is handled by JavaScript via REST API.
     * This only provides the basic form structure and copy mode information.
     *
     * @param string $uniqid The unique identifier of the dialplan application
     */
    public function modifyAction(string $uniqid = ''): void
    {
        // Check for copy mode
        $copyFromId = $this->request->getQuery('copy');
        
        // Create empty form structure - JavaScript will populate everything via REST API
        $emptyApplication = new \stdClass();
        $emptyApplication->id = '';
        $emptyApplication->uniqid = $uniqid ?: '';
        $emptyApplication->extension = '';
        $emptyApplication->name = '';
        $emptyApplication->hint = '';
        $emptyApplication->applicationlogic = '';
        $emptyApplication->type = 'php';
        $emptyApplication->description = '';
        
        // Create form with minimal structure
        $form = new DialplanApplicationEditForm($emptyApplication);
        
        // Pass form and copy mode information to JavaScript
        $this->view->form = $form;
        $this->view->uniqid = $uniqid ?: '';
        $this->view->copyFromId = $copyFromId ?: '';
    }

    /**
     * Save dialplan application
     * 
     * This action is kept for backward compatibility but the actual saving
     * is handled by the REST API through JavaScript (Form.js integration)
     */
    public function saveAction(): void
    {
        // This method is intentionally empty as all save operations
        // are handled through REST API via Form.js integration
        // Redirect to prevent direct access
        $this->response->redirect('dialplan-applications/index');
    }
}
