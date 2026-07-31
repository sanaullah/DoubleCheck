# SqlJsonMerge Module

A multi-database SQL/JSON merge and insert module for BoxLang/ColdBox. Provides database-agnostic operations for SQL Server, PostgreSQL, Oracle, MySQL, and SQLite.

## Overview

SqlJsonMerge consolidates complex multi-database operations into a reusable, modular system using the **Dialect pattern**. Instead of writing database-specific SQL, you provide data and let the appropriate dialect handle the SQL generation.

### Supported Databases
- **SQLite** - Default, local development
- **SQL Server** - Enterprise, MERGE + OPENJSON
- **PostgreSQL** - Strong JSON support, upsert with ON CONFLICT
- **MySQL** - JSON_TABLE, INSERT...ON DUPLICATE KEY UPDATE
- **Oracle** - MERGE statement support, JSON capabilities

## Module Structure

```
SqlJsonMerge/
├── models/
│   ├── DatabaseDialect.bx (abstract base)
│   ├── SQLiteDialect.bx
│   ├── SQLServerDialect.bx
│   ├── PostgreSQLDialect.bx
│   ├── MySQLDialect.bx
│   ├── OracleDialect.bx
│   ├── DatabaseDialectFactory.bx
│   └── JsonMerge.bx (service)
├── bifs/
│   ├── JsonMerge.bx (global function)
│   ├── JsonInsert.bx (global function)
│   ├── DbInfo.bx (global function)
│   ├── TableInfo.bx (global function)
│   ├── GenerateGUID.bx (global function)
│   └── DbDateTime.bx (global function)
├── tests/
│   ├── unit/ (dialect tests)
│   └── integration/ (real database tests)
├── resources/
│   └── MockDatabaseDialect.bx (for testing)
└── ModuleConfig.bx
```

## Quick Start

### Using Global BIFs (Recommended)

Global functions are automatically available without imports:

```bx
// UPSERT operation
result = jsonMerge(
    data = [
        { id: 1, name: "Alice", email: "alice@example.com" },
        { id: 2, name: "Bob", email: "bob@example.com" }
    ],
    tableName = "users",
    targets = ["id"],
    updateFields = ["name", "email"]
);

// Bulk insert
result = jsonInsert(
    data = [
        { name: "Charlie", email: "charlie@example.com" }
    ],
    tableName = "users"
);

// Get table metadata
info = tableInfo("users");

// Get database-aware datetime
now = dbDateTime();
utcNow = dbDateTime(utc = true);

// Generate database-specific GUID
guid = generateGUID();

// Get database schema info
columns = dbInfo("columns", "users");
```

### Using the Service Directly

```bx
component {
    property name="jsonMerge" inject="JsonMerge@SqlJsonMerge.models";

    function myFunction() {
        var result = jsonMerge.jsonMerge(
            data = myData,
            tableName = "users",
            targets = ["id"]
        );
    }
}
```

## Key Features

### 1. **Dialect Pattern**
Each database has a concrete dialect implementation. The factory automatically detects and instantiates the correct dialect based on your datasource configuration.

### 2. **Multi-Database JSON Operations**
- **JSON Insert** - Bulk inserts using JSON data
- **JSON Merge/Upsert** - INSERT/UPDATE operations with custom key matching

### 3. **Metadata Introspection**
Get column types, nullable status, and table structure across databases.

### 4. **Database Functions**
- GUID generation (database-specific)
- Current datetime retrieval (timezone-aware)
- UTC datetime retrieval

### 5. **Auto-Discovery BIFs**
6 custom BoxLang Built-In Functions that are globally available without imports.

## How Dialects Work

When you call a method like `jsonMerge()`:

1. **Detection**: Factory detects database from datasource config (boxlang.json)
2. **Instantiation**: Creates appropriate dialect (SQLServer, PostgreSQL, etc.)
3. **SQL Generation**: Dialect generates database-specific SQL
4. **Execution**: JsonMerge executes the SQL via queryExecute()

Example flow for UPSERT on different databases:

```
User calls: jsonMerge(data, "users", ["id"])

SQL Server → MERGE statement with WHEN MATCHED/NOT MATCHED
PostgreSQL → INSERT...ON CONFLICT DO UPDATE
MySQL → INSERT...ON DUPLICATE KEY UPDATE
Oracle → MERGE statement
SQLite → INSERT OR REPLACE
```

## Configuration

### BoxLang Configuration (boxlang.json)

```json
{
  "datasources": {
    "doublecheck": {
      "driver": "sqlite",
      "database": "./.db/doublecheck.db"
    },
    "myapp_prod": {
      "driver": "sqlserver",
      "server": "db.example.com",
      "database": "myapp"
    }
  }
}
```

### ColdBox Injection

```bx
component {
    property name="jsonMerge" inject="JsonMerge@SqlJsonMerge.models";
    property name="dialectFactory" inject="DatabaseDialectFactory@SqlJsonMerge.models";
}
```

## API Reference

### Global BIFs

#### `jsonMerge(data, tableName, targets, [updateFields], [datasource])`
- **data** (array): Records to merge
- **tableName** (string): Target table
- **targets** (array): Key columns for matching
- **updateFields** (array, optional): Columns to update (default: all writeable)
- **datasource** (string, optional): Datasource name
- **Returns**: Struct with result, timing, and message

#### `jsonInsert(data, tableName, [datasource])`
- **data** (array): Records to insert
- **tableName** (string): Target table
- **datasource** (string, optional): Datasource name
- **Returns**: Struct with result and timing

#### `dbDateTime([datasource], [utc])`
- **datasource** (string, optional): Datasource name
- **utc** (boolean, optional): Return UTC time (default: false)
- **Returns**: Current database datetime

#### `generateGUID([datasource])`
- **datasource** (string, optional): Datasource name
- **Returns**: String UUID/GUID unique to the database

#### `dbInfo(type, [table], [dbname], [datasource])`
- **type** (string): "tables" or "columns"
- **table** (string): Table name (for columns)
- **dbname** (string): Database name (for tables)
- **datasource** (string, optional): Datasource name
- **Returns**: Query with database information

#### `tableInfo(tableName, [datasource])`
- **tableName** (string): Table to inspect
- **datasource** (string, optional): Datasource name
- **Returns**: Struct with columns, metadata, and helper methods

## Testing

### Running Tests

```bash
box testbox run
```

### Test Files

- `tests/unit/DatabaseDialectFactorySpec.bx` - Factory tests
- `tests/unit/SQLiteDialectSpec.bx` - SQLite dialect tests
- `tests/unit/SQLServerDialectSpec.bx` - SQL Server dialect tests
- (PostgreSQL, MySQL, Oracle specs follow same pattern)
- `tests/integration/DialectIntegrationSpec.bx` - Real database tests

### Mock Dialect for Testing

```bx
var mockDialect = new SqlJsonMerge.resources.MockDatabaseDialect();
// Use in unit tests to verify SQL generation without executing
```

## Implementation Notes

### SQL Generation Strategy

Each dialect implements abstract methods that generate SQL for:
- GUID/UUID generation
- Current datetime retrieval
- JSON parsing and UPSERT
- Temporary table operations
- Metadata queries
- Table name parsing

### Database-Specific Handling

**SQL Server**
- Uses OPENJSON for JSON parsing
- MERGE statement for upserts
- sp_set_session_context for session variables
- tempdb.sys.* for temp tables

**PostgreSQL**
- Uses json_to_recordset for JSON
- INSERT...ON CONFLICT for upserts
- gen_random_uuid for GUIDs
- pg_temp schema for temp tables

**MySQL**
- Uses JSON_TABLE for JSON
- INSERT...ON DUPLICATE KEY UPDATE
- UUID() for GUIDs
- INFORMATION_SCHEMA for metadata

**Oracle**
- Uses json_table for JSON
- MERGE statement for upserts
- SYS_GUID for GUIDs
- ALL_TAB_COLUMNS for metadata

**SQLite**
- Limited JSON support (json_each, json_extract)
- INSERT OR REPLACE for upserts
- randomblob(16) for pseudo-GUIDs
- PRAGMA table_info for metadata

## Troubleshooting

### "Dialect not found" Error
- Check datasource name in boxlang.json
- Verify driver field is set correctly ("sqlite", "sqlserver", "postgresql", etc.)

### SQL Generation Errors
- Ensure column names match exactly (case-sensitive in some databases)
- Verify table exists before operations
- Check column types are supported by the dialect

### Performance Tips
- Use specific update fields to limit UPDATE scope
- Index key columns used in targets
- Consider batch size for large JSON arrays

## Contributing

To add support for a new database:

1. Create a new file: `models/NewDatabaseDialect.bx`
2. Extend `DatabaseDialect` and implement all abstract methods
3. Update `DatabaseDialectFactory` to detect and instantiate your dialect
4. Add unit tests in `tests/unit/NewDatabaseDialectSpec.bx`
5. Add integration tests in `tests/integration/`

## License

Part of the DoubleCheck application.

## Version History

- **1.0.0** (2026-07) - Initial release with support for SQL Server, PostgreSQL, MySQL, Oracle, SQLite
