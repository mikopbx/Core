<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Employees;

/**
 * Class DependencyResolver
 * 
 * Resolves forwarding dependencies between employees to determine
 * the correct order of creation and handle circular references
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class DependencyResolver
{
    private array $graph = [];
    private array $visited = [];
    private array $recursionStack = [];
    private array $cycles = [];
    
    /**
     * Resolve dependencies and return sorted order
     * 
     * @param array $employees Array of employee records
     * @return array Result with creation order and patches for cycles
     */
    public function resolve(array $employees): array
    {
        // Build dependency graph
        $this->buildGraph($employees);
        
        // Detect cycles
        $this->detectCycles();
        
        // Break cycles and get edges to restore later
        $brokenEdges = $this->breakCycles($employees);
        
        // Perform topological sort
        $sortedOrder = $this->topologicalSort();
        
        // Map sorted numbers back to employee records
        $sortedEmployees = $this->mapToEmployees($sortedOrder, $employees);
        
        return [
            'sortedEmployees' => $sortedEmployees,
            'brokenEdges' => $brokenEdges,
            'cycles' => $this->cycles
        ];
    }
    
    /**
     * Build dependency graph from employee records
     * 
     * @param array $employees Employee records
     */
    private function buildGraph(array $employees): void
    {
        $this->graph = [];
        
        // Initialize nodes
        foreach ($employees as $employee) {
            $number = $employee['number'];
            $this->graph[$number] = [
                'dependencies' => [],
                'data' => $employee
            ];
        }
        
        // Add edges for forwarding dependencies
        foreach ($employees as $employee) {
            $number = $employee['number'];
            
            // Check all forwarding fields
            $forwardingFields = [
                'fwd_forwarding',
                'fwd_forwardingonbusy',
                'fwd_forwardingonunavailable'
            ];
            
            foreach ($forwardingFields as $field) {
                if (!empty($employee[$field])) {
                    $targetNumber = $employee[$field];
                    
                    // Only add dependency if target exists in our import set
                    if (isset($this->graph[$targetNumber])) {
                        $this->graph[$number]['dependencies'][] = $targetNumber;
                    }
                }
            }
            
            // Remove duplicate dependencies
            $this->graph[$number]['dependencies'] = array_unique($this->graph[$number]['dependencies']);
        }
    }
    
    /**
     * Detect cycles in the dependency graph
     */
    private function detectCycles(): void
    {
        $this->cycles = [];
        $this->visited = [];
        $this->recursionStack = [];
        
        foreach (array_keys($this->graph) as $node) {
            if (!isset($this->visited[$node])) {
                $this->detectCyclesDFS($node, []);
            }
        }
    }
    
    /**
     * DFS helper for cycle detection
     * 
     * @param string $node Current node
     * @param array $path Current path
     */
    private function detectCyclesDFS(string $node, array $path): void
    {
        $this->visited[$node] = true;
        $this->recursionStack[$node] = true;
        $path[] = $node;
        
        foreach ($this->graph[$node]['dependencies'] as $neighbor) {
            if (!isset($this->visited[$neighbor])) {
                $this->detectCyclesDFS($neighbor, $path);
            } elseif (isset($this->recursionStack[$neighbor])) {
                // Found a cycle
                $cycleStart = array_search($neighbor, $path);
                $cycle = array_slice($path, $cycleStart);
                $cycle[] = $neighbor; // Complete the cycle
                
                // Store cycle if not already found
                $cycleKey = $this->getCycleKey($cycle);
                if (!isset($this->cycles[$cycleKey])) {
                    $this->cycles[$cycleKey] = $cycle;
                }
            }
        }
        
        unset($this->recursionStack[$node]);
    }
    
    /**
     * Get unique key for a cycle
     * 
     * @param array $cycle Cycle nodes
     * @return string Unique cycle key
     */
    private function getCycleKey(array $cycle): string
    {
        // Remove last element (duplicate of first)
        $nodes = array_slice($cycle, 0, -1);
        
        // Find minimum node to normalize cycle representation
        $minIndex = array_search(min($nodes), $nodes);
        
        // Rotate array to start with minimum node
        $normalized = array_merge(
            array_slice($nodes, $minIndex),
            array_slice($nodes, 0, $minIndex)
        );
        
        return implode('->', $normalized);
    }
    
    /**
     * Break cycles by removing edges
     * 
     * @param array $employees Employee records
     * @return array Broken edges to restore later
     */
    private function breakCycles(array &$employees): array
    {
        $brokenEdges = [];
        
        foreach ($this->cycles as $cycle) {
            // Remove the last edge in each cycle
            $lastNode = $cycle[count($cycle) - 2]; // Second to last (before duplicate)
            $firstNode = $cycle[0];
            
            // Find which field contains this dependency
            foreach ($employees as &$employee) {
                if ($employee['number'] === $lastNode) {
                    $forwardingFields = [
                        'fwd_forwarding',
                        'fwd_forwardingonbusy',
                        'fwd_forwardingonunavailable'
                    ];
                    
                    foreach ($forwardingFields as $field) {
                        if ($employee[$field] === $firstNode) {
                            // Store for later restoration
                            $brokenEdges[] = [
                                'number' => $lastNode,
                                'field' => $field,
                                'value' => $firstNode
                            ];
                            
                            // Temporarily remove the dependency
                            $employee[$field] = '';
                            
                            // Update graph
                            $key = array_search($firstNode, $this->graph[$lastNode]['dependencies']);
                            if ($key !== false) {
                                unset($this->graph[$lastNode]['dependencies'][$key]);
                            }
                        }
                    }
                }
            }
        }
        
        return $brokenEdges;
    }
    
    /**
     * Perform topological sort on the graph
     * 
     * @return array Sorted node order
     */
    private function topologicalSort(): array
    {
        $sorted = [];
        $visited = [];
        
        foreach (array_keys($this->graph) as $node) {
            if (!isset($visited[$node])) {
                $this->topologicalSortDFS($node, $visited, $sorted);
            }
        }
        
        return array_reverse($sorted);
    }
    
    /**
     * DFS helper for topological sort
     * 
     * @param string $node Current node
     * @param array $visited Visited nodes
     * @param array $sorted Sorted result
     */
    private function topologicalSortDFS(string $node, array &$visited, array &$sorted): void
    {
        $visited[$node] = true;
        
        foreach ($this->graph[$node]['dependencies'] as $neighbor) {
            if (!isset($visited[$neighbor])) {
                $this->topologicalSortDFS($neighbor, $visited, $sorted);
            }
        }
        
        $sorted[] = $node;
    }
    
    /**
     * Map sorted numbers back to employee records
     * 
     * @param array $sortedNumbers Sorted employee numbers
     * @param array $employees Original employee records
     * @return array Sorted employee records
     */
    private function mapToEmployees(array $sortedNumbers, array $employees): array
    {
        $numberToEmployee = [];
        foreach ($employees as $employee) {
            $numberToEmployee[$employee['number']] = $employee;
        }
        
        $sortedEmployees = [];
        foreach ($sortedNumbers as $number) {
            if (isset($numberToEmployee[$number])) {
                $sortedEmployees[] = $numberToEmployee[$number];
            }
        }
        
        return $sortedEmployees;
    }
    
    /**
     * Get dependency statistics
     * 
     * @return array Statistics about dependencies
     */
    public function getStatistics(): array
    {
        $stats = [
            'totalNodes' => count($this->graph),
            'nodesWithDependencies' => 0,
            'totalEdges' => 0,
            'cyclesFound' => count($this->cycles),
            'maxDependencyDepth' => 0
        ];
        
        foreach ($this->graph as $node => $data) {
            if (!empty($data['dependencies'])) {
                $stats['nodesWithDependencies']++;
                $stats['totalEdges'] += count($data['dependencies']);
            }
        }
        
        // Calculate max dependency depth
        $depths = [];
        foreach (array_keys($this->graph) as $node) {
            $depths[$node] = $this->calculateDepth($node, []);
        }
        $stats['maxDependencyDepth'] = !empty($depths) ? max($depths) : 0;
        
        return $stats;
    }
    
    /**
     * Calculate dependency depth for a node
     * 
     * @param string $node Node to calculate depth for
     * @param array $visited Already visited nodes (to prevent infinite loops)
     * @return int Depth
     */
    private function calculateDepth(string $node, array $visited): int
    {
        if (isset($visited[$node])) {
            return 0; // Cycle detected
        }
        
        $visited[$node] = true;
        
        if (empty($this->graph[$node]['dependencies'])) {
            return 0;
        }
        
        $maxDepth = 0;
        foreach ($this->graph[$node]['dependencies'] as $dep) {
            if (isset($this->graph[$dep])) {
                $depth = $this->calculateDepth($dep, $visited);
                $maxDepth = max($maxDepth, $depth);
            }
        }
        
        return $maxDepth + 1;
    }
}