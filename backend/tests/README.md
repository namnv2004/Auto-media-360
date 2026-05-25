# Testing Guide 🧪

This directory contains the test suite for the FastAPI template project. The tests are written using pytest and follow best practices for API testing.

## Test Structure 📁

```
tests/
├── conftest.py                  # Shared test fixtures and configurations
├── test_main.py                # Main application tests
└── test_keywords/              # Keywords module tests
    ├── test_domain_crud.py     # Domain CRUD operations tests
    ├── test_keyword_crud.py    # Keyword CRUD operations tests
    ├── test_niche_crud.py      # Niche CRUD operations tests
    └── test_subniche_crud.py   # Subniche CRUD operations tests
```

## Running Tests 🚀

### Basic Test Commands

1. Run all tests:
```bash
pytest
```

2. Run tests with verbose output:
```bash
pytest -v
```

3. Run tests with print statements:
```bash
pytest -s
```

### Test Coverage

1. Generate coverage report:
```bash
pytest --cov=api tests/
```

2. Generate detailed HTML coverage report:
```bash
pytest --cov=api --cov-report=html tests/
```
The HTML report will be available in the `cov_html/` directory.

### Running Specific Tests

1. Run tests from a specific file:
```bash
pytest tests/test_keywords/test_keyword_crud.py
```

2. Run tests matching a pattern:
```bash
pytest -k "keyword"  # Runs all tests with "keyword" in the name
```

3. Run a specific test:
```bash
pytest tests/test_keywords/test_keyword_crud.py::test_create_keyword
```

## Test Configuration ⚙️

The test suite uses the following configuration:

1. Database:
   - Tests use a separate SQLite database (test.db)
   - Each test function gets a fresh database session
   - Database is cleaned up after each test

2. Fixtures:
   - Common fixtures are defined in `conftest.py`
   - Include database session, test client, and test data

3. Environment:
   - Tests use a separate test environment
   - Test configuration is loaded from `pytest.ini`

## Writing Tests 📝

### Test Structure

```python
async def test_create_keyword(client, db_session):
    # Arrange
    keyword_data = {
        "name": "test keyword",
        "description": "test description"
    }
    
    # Act
    response = await client.post("/api/v1/keywords/", json=keyword_data)
    
    # Assert
    assert response.status_code == 201
    assert response.json()["name"] == keyword_data["name"]
```

### Best Practices

1. Follow AAA pattern:
   - Arrange: Set up test data and conditions
   - Act: Execute the code being tested
   - Assert: Verify the results

2. Use meaningful test names:
   - Should describe what is being tested
   - Should indicate expected behavior
   - Example: `test_create_keyword_returns_201_when_valid_data`

3. Use fixtures for common setup:
   - Database sessions
   - Test clients
   - Test data

4. Clean up after tests:
   - Reset database state
   - Clear cached data
   - Remove test files

## Continuous Integration 🔄

Tests are automatically run in the CI pipeline on:
- Every push to main branch
- Every pull request
- Nightly builds

The CI pipeline:
1. Sets up the test environment
2. Installs dependencies
3. Runs all tests
4. Generates coverage report
5. Fails if coverage is below threshold

## Troubleshooting 🔧

Common issues and solutions:

1. Database connection errors:
   - Check if test database exists
   - Verify database URL in test configuration
   - Ensure database migrations are up to date

2. Failed tests:
   - Check test logs for details
   - Verify test data setup
   - Check for database state issues

3. Coverage issues:
   - Ensure all code paths are tested
   - Check for excluded files
   - Verify coverage configuration 