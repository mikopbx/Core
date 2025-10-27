#!/usr/bin/env python3
"""Test suite for System executeBashCommand and executeSqlRequest operations"""
import pytest
from conftest import assert_api_success


class TestSystemBashCommand:
    """Comprehensive tests for executeBashCommand endpoint"""

    def test_01_execute_simple_command(self, api_client):
        """Execute simple bash command (uname -a)"""
        data = {
            'command': 'uname -a'
        }
        response = api_client.post('system:executeBashCommand', data)
        assert_api_success(response, "Failed to execute bash command")

        result_data = response['data']
        assert 'command' in result_data, "Response should contain 'command' field"
        assert 'output' in result_data, "Response should contain 'output' field"
        assert 'exitCode' in result_data, "Response should contain 'exitCode' field"
        assert 'timeout' in result_data, "Response should contain 'timeout' field"

        assert result_data['command'] == 'uname -a', "Command should match request"
        assert result_data['exitCode'] == 0, "Command should execute successfully"
        assert len(result_data['output']) > 0, "Output should not be empty"
        assert result_data['timeout'] == 30, "Default timeout should be 30 seconds"

        print(f"✓ Executed: {data['command']}")
        print(f"  Output: {result_data['output'][:50]}...")
        print(f"  Exit code: {result_data['exitCode']}")

    def test_02_execute_with_custom_timeout(self, api_client):
        """Execute command with custom timeout"""
        data = {
            'command': 'echo "Custom timeout test"',
            'timeout': 60
        }
        response = api_client.post('system:executeBashCommand', data)
        assert_api_success(response, "Failed to execute command with custom timeout")

        result_data = response['data']
        assert result_data['timeout'] == 60, "Timeout should match request"
        assert result_data['exitCode'] == 0, "Command should execute successfully"

        print(f"✓ Executed with custom timeout: {data['timeout']}s")

    def test_03_execute_echo_command(self, api_client):
        """Execute echo command and verify output"""
        test_message = "MikoPBX Test Message"
        data = {
            'command': f'echo "{test_message}"'
        }
        response = api_client.post('system:executeBashCommand', data)
        assert_api_success(response, "Failed to execute echo command")

        result_data = response['data']
        assert test_message in result_data['output'], "Output should contain test message"
        assert result_data['exitCode'] == 0, "Command should execute successfully"

        print(f"✓ Echo test passed: '{test_message}'")

    def test_04_execute_pwd_command(self, api_client):
        """Execute pwd command"""
        data = {
            'command': 'pwd'
        }
        response = api_client.post('system:executeBashCommand', data)
        assert_api_success(response, "Failed to execute pwd command")

        result_data = response['data']
        assert result_data['exitCode'] == 0, "Command should execute successfully"
        assert len(result_data['output']) > 0, "Output should contain current directory"

        print(f"✓ Current directory: {result_data['output']}")

    def test_05_execute_date_command(self, api_client):
        """Execute date command"""
        data = {
            'command': 'date'
        }
        response = api_client.post('system:executeBashCommand', data)
        assert_api_success(response, "Failed to execute date command")

        result_data = response['data']
        assert result_data['exitCode'] == 0, "Command should execute successfully"
        assert len(result_data['output']) > 0, "Output should contain date"

        print(f"✓ System date: {result_data['output']}")

    def test_06_execute_whoami_command(self, api_client):
        """Execute whoami command"""
        data = {
            'command': 'whoami'
        }
        response = api_client.post('system:executeBashCommand', data)
        assert_api_success(response, "Failed to execute whoami command")

        result_data = response['data']
        assert result_data['exitCode'] == 0, "Command should execute successfully"
        assert len(result_data['output']) > 0, "Output should contain username"

        print(f"✓ Current user: {result_data['output']}")

    def test_07_execute_command_with_pipe(self, api_client):
        """Execute command with pipe"""
        data = {
            'command': 'echo "test" | wc -c'
        }
        response = api_client.post('system:executeBashCommand', data)
        assert_api_success(response, "Failed to execute piped command")

        result_data = response['data']
        assert result_data['exitCode'] == 0, "Command should execute successfully"
        assert '5' in result_data['output'], "Output should contain character count"

        print(f"✓ Pipe command executed successfully")

    def test_08_execute_uptime_command(self, api_client):
        """Execute uptime command"""
        data = {
            'command': 'uptime'
        }
        response = api_client.post('system:executeBashCommand', data)
        assert_api_success(response, "Failed to execute uptime command")

        result_data = response['data']
        assert result_data['exitCode'] == 0, "Command should execute successfully"
        assert 'up' in result_data['output'].lower(), "Output should contain uptime info"

        print(f"✓ System uptime: {result_data['output']}")


class TestSystemBashCommandValidation:
    """Validation and error handling tests for executeBashCommand"""

    def test_01_missing_command_parameter(self, api_client):
        """Test error when command parameter is missing"""
        try:
            response = api_client.post('system:executeBashCommand', {})
            assert not response.get('result', False), "Should fail with missing command"
            # Check for Russian error message
            messages = response.get('messages', {})
            assert 'error' in messages, "Should contain error messages"
            print(f"✓ Missing command parameter rejected: {messages['error']}")
        except Exception as e:
            if '400' in str(e) or '422' in str(e):
                print(f"✓ Missing command parameter rejected with HTTP error")
            else:
                raise

    def test_02_empty_command_parameter(self, api_client):
        """Test error when command parameter is empty"""
        try:
            data = {'command': ''}
            response = api_client.post('system:executeBashCommand', data)
            assert not response.get('result', False), "Should fail with empty command"
            messages = response.get('messages', {})
            assert 'error' in messages, "Should contain error messages"
            print(f"✓ Empty command parameter rejected: {messages['error']}")
        except Exception as e:
            if '400' in str(e) or '422' in str(e):
                print(f"✓ Empty command parameter rejected with HTTP error")
            else:
                raise

    def test_03_invalid_timeout_too_low(self, api_client):
        """Test error when timeout is below minimum (1)"""
        try:
            data = {
                'command': 'echo test',
                'timeout': 0
            }
            response = api_client.post('system:executeBashCommand', data)
            assert not response.get('result', False), "Should fail with invalid timeout"
            messages = response.get('messages', {})
            assert 'error' in messages, "Should contain error messages"
            print(f"✓ Invalid timeout (too low) rejected: {messages['error']}")
        except Exception as e:
            if '400' in str(e) or '422' in str(e):
                print(f"✓ Invalid timeout rejected with HTTP error")
            else:
                raise

    def test_04_invalid_timeout_too_high(self, api_client):
        """Test error when timeout exceeds maximum (300)"""
        try:
            data = {
                'command': 'echo test',
                'timeout': 301
            }
            response = api_client.post('system:executeBashCommand', data)
            assert not response.get('result', False), "Should fail with invalid timeout"
            messages = response.get('messages', {})
            assert 'error' in messages, "Should contain error messages"
            print(f"✓ Invalid timeout (too high) rejected: {messages['error']}")
        except Exception as e:
            if '400' in str(e) or '422' in str(e):
                print(f"✓ Invalid timeout rejected with HTTP error")
            else:
                raise

    def test_05_minimum_timeout(self, api_client):
        """Test command with minimum timeout (1 second)"""
        data = {
            'command': 'echo "Minimum timeout"',
            'timeout': 1
        }
        response = api_client.post('system:executeBashCommand', data)
        assert_api_success(response, "Failed with minimum timeout")

        result_data = response['data']
        assert result_data['timeout'] == 1, "Timeout should be 1 second"
        print(f"✓ Minimum timeout (1s) accepted")

    def test_06_maximum_timeout(self, api_client):
        """Test command with maximum timeout (300 seconds)"""
        data = {
            'command': 'echo "Maximum timeout"',
            'timeout': 300
        }
        response = api_client.post('system:executeBashCommand', data)
        assert_api_success(response, "Failed with maximum timeout")

        result_data = response['data']
        assert result_data['timeout'] == 300, "Timeout should be 300 seconds"
        print(f"✓ Maximum timeout (300s) accepted")


class TestSystemSqlRequest:
    """Comprehensive tests for executeSqlRequest endpoint"""

    def test_01_execute_simple_query_main(self, api_client):
        """Execute simple SELECT query on main database"""
        data = {
            'query': 'SELECT COUNT(*) as count FROM m_Extensions',
            'database': 'main'
        }
        response = api_client.post('system:executeSqlRequest', data)
        assert_api_success(response, "Failed to execute SQL query")

        result_data = response['data']
        assert 'query' in result_data, "Response should contain 'query' field"
        assert 'database' in result_data, "Response should contain 'database' field"
        assert 'rows' in result_data, "Response should contain 'rows' field"
        assert 'rowCount' in result_data, "Response should contain 'rowCount' field"
        assert 'affectedRows' in result_data, "Response should contain 'affectedRows' field"

        assert result_data['database'] == 'main', "Database should match request"
        assert isinstance(result_data['rows'], list), "Rows should be a list"
        assert len(result_data['rows']) > 0, "Should return at least one row"
        assert 'count' in result_data['rows'][0], "Result should contain count column"

        count = result_data['rows'][0]['count']
        print(f"✓ Query executed on main database")
        print(f"  Extensions count: {count}")
        print(f"  Rows returned: {result_data['rowCount']}")

    def test_02_execute_query_without_database_param(self, api_client):
        """Execute query without database parameter (should default to 'main')"""
        data = {
            'query': 'SELECT COUNT(*) as count FROM m_PbxSettings'
        }
        response = api_client.post('system:executeSqlRequest', data)
        assert_api_success(response, "Failed to execute query with default database")

        result_data = response['data']
        assert result_data['database'] == 'main', "Should default to 'main' database"
        assert len(result_data['rows']) > 0, "Should return results"

        count = result_data['rows'][0]['count']
        print(f"✓ Query executed with default database (main)")
        print(f"  PbxSettings count: {count}")

    def test_03_execute_query_cdr_database(self, api_client):
        """Execute query on CDR database"""
        data = {
            'query': 'SELECT COUNT(*) as count FROM cdr_general LIMIT 1',
            'database': 'cdr'
        }
        response = api_client.post('system:executeSqlRequest', data)
        assert_api_success(response, "Failed to execute query on CDR database")

        result_data = response['data']
        assert result_data['database'] == 'cdr', "Database should be 'cdr'"
        assert len(result_data['rows']) > 0, "Should return results"

        count = result_data['rows'][0]['count']
        print(f"✓ Query executed on CDR database")
        print(f"  CDR records count: {count}")

    def test_04_execute_select_with_limit(self, api_client):
        """Execute SELECT query with LIMIT"""
        data = {
            'query': 'SELECT key, value FROM m_PbxSettings LIMIT 5',
            'database': 'main'
        }
        response = api_client.post('system:executeSqlRequest', data)
        assert_api_success(response, "Failed to execute SELECT with LIMIT")

        result_data = response['data']
        assert len(result_data['rows']) <= 5, "Should return at most 5 rows"
        assert result_data['rowCount'] <= 5, "Row count should be at most 5"

        print(f"✓ SELECT with LIMIT executed")
        print(f"  Rows returned: {result_data['rowCount']}")
        for row in result_data['rows']:
            print(f"    {row.get('key')}: {row.get('value', '')[:50]}")

    def test_05_execute_select_with_where(self, api_client):
        """Execute SELECT query with WHERE clause"""
        data = {
            'query': "SELECT key, value FROM m_PbxSettings WHERE key = 'PBXVersion' LIMIT 1",
            'database': 'main'
        }
        response = api_client.post('system:executeSqlRequest', data)
        assert_api_success(response, "Failed to execute SELECT with WHERE")

        result_data = response['data']
        if len(result_data['rows']) > 0:
            assert result_data['rows'][0]['key'] == 'PBXVersion', "Should filter by key"
            print(f"✓ SELECT with WHERE executed")
            print(f"  PBXVersion: {result_data['rows'][0]['value']}")
        else:
            print(f"⚠ PBXVersion setting not found (system may be in initial setup)")

    def test_06_execute_table_info_query(self, api_client):
        """Execute PRAGMA query to get table info"""
        data = {
            'query': 'PRAGMA table_info(m_Extensions)',
            'database': 'main'
        }
        response = api_client.post('system:executeSqlRequest', data)
        assert_api_success(response, "Failed to execute PRAGMA query")

        result_data = response['data']
        assert len(result_data['rows']) > 0, "Should return table columns"

        print(f"✓ Table structure query executed")
        print(f"  m_Extensions columns: {result_data['rowCount']}")
        for row in result_data['rows'][:5]:
            print(f"    {row.get('name')} ({row.get('type')})")

    def test_07_execute_count_all_tables(self, api_client):
        """Execute query to count all tables"""
        data = {
            'query': "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'",
            'database': 'main'
        }
        response = api_client.post('system:executeSqlRequest', data)
        assert_api_success(response, "Failed to count tables")

        result_data = response['data']
        table_count = result_data['rows'][0]['count']
        assert table_count > 0, "Should have at least one table"

        print(f"✓ Table count query executed")
        print(f"  Total tables in main database: {table_count}")

    def test_08_execute_select_extensions(self, api_client):
        """Execute query to get extension numbers"""
        data = {
            'query': 'SELECT number, type, callerid FROM m_Extensions LIMIT 5',
            'database': 'main'
        }
        response = api_client.post('system:executeSqlRequest', data)
        assert_api_success(response, "Failed to select extensions")

        result_data = response['data']
        print(f"✓ Extensions query executed")
        print(f"  Found {result_data['rowCount']} extensions:")
        for row in result_data['rows']:
            print(f"    {row.get('number')} ({row.get('type')}): {row.get('callerid', '')}")


class TestSystemSqlRequestValidation:
    """Validation and error handling tests for executeSqlRequest"""

    def test_01_missing_query_parameter(self, api_client):
        """Test error when query parameter is missing"""
        try:
            response = api_client.post('system:executeSqlRequest', {})
            assert not response.get('result', False), "Should fail with missing query"
            messages = response.get('messages', {})
            assert 'error' in messages, "Should contain error messages"
            print(f"✓ Missing query parameter rejected: {messages['error']}")
        except Exception as e:
            if '400' in str(e) or '422' in str(e):
                print(f"✓ Missing query parameter rejected with HTTP error")
            else:
                raise

    def test_02_empty_query_parameter(self, api_client):
        """Test error when query parameter is empty"""
        try:
            data = {'query': ''}
            response = api_client.post('system:executeSqlRequest', data)
            assert not response.get('result', False), "Should fail with empty query"
            messages = response.get('messages', {})
            assert 'error' in messages, "Should contain error messages"
            print(f"✓ Empty query parameter rejected: {messages['error']}")
        except Exception as e:
            if '400' in str(e) or '422' in str(e):
                print(f"✓ Empty query parameter rejected with HTTP error")
            else:
                raise

    def test_03_invalid_database_parameter(self, api_client):
        """Test error when database parameter is invalid"""
        try:
            data = {
                'query': 'SELECT 1',
                'database': 'nonexistent_database'
            }
            response = api_client.post('system:executeSqlRequest', data)
            assert not response.get('result', False), "Should fail with invalid database"
            messages = response.get('messages', {})
            assert 'error' in messages, "Should contain error messages"
            print(f"✓ Invalid database parameter rejected: {messages['error']}")
        except Exception as e:
            if '400' in str(e) or '422' in str(e):
                print(f"✓ Invalid database parameter rejected with HTTP error")
            else:
                raise

    def test_04_invalid_sql_syntax(self, api_client):
        """Test error when SQL syntax is invalid"""
        try:
            data = {
                'query': 'INVALID SQL SYNTAX HERE',
                'database': 'main'
            }
            response = api_client.post('system:executeSqlRequest', data)
            assert not response.get('result', False), "Should fail with invalid SQL"
            messages = response.get('messages', {})
            assert 'error' in messages, "Should contain error messages"
            print(f"✓ Invalid SQL syntax rejected: {messages['error']}")
        except Exception as e:
            if '500' in str(e) or '400' in str(e) or '422' in str(e):
                print(f"✓ Invalid SQL syntax rejected with HTTP error")
            else:
                raise

    def test_05_query_nonexistent_table(self, api_client):
        """Test error when querying non-existent table"""
        try:
            data = {
                'query': 'SELECT * FROM nonexistent_table_12345',
                'database': 'main'
            }
            response = api_client.post('system:executeSqlRequest', data)
            assert not response.get('result', False), "Should fail with non-existent table"
            messages = response.get('messages', {})
            assert 'error' in messages, "Should contain error messages"
            print(f"✓ Non-existent table query rejected: {messages['error']}")
        except Exception as e:
            if '500' in str(e) or '400' in str(e) or '422' in str(e):
                print(f"✓ Non-existent table query rejected with HTTP error")
            else:
                raise

    def test_06_valid_query_returning_empty(self, api_client):
        """Test valid query that returns no rows"""
        data = {
            'query': 'SELECT * FROM m_Extensions WHERE number = "nonexistent999999"',
            'database': 'main'
        }
        response = api_client.post('system:executeSqlRequest', data)
        assert_api_success(response, "Valid query should succeed even with no results")

        result_data = response['data']
        assert result_data['rowCount'] == 0, "Should return 0 rows"
        assert len(result_data['rows']) == 0, "Rows array should be empty"

        print(f"✓ Valid query with empty result set handled correctly")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
