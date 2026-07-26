---
name: database-migrations
description: >
  Use this skill when managing database schema changes in ColdBox/BoxLang using cfmigrations and
  commandbox-migrations. Covers migration file structure, Schema Builder API, seeding, and CLI
  workflows for creating, running, and rolling back migrations safely.
applyTo: "**/*.{bx,cfc,cfm,bxm,json}"
---

# Database Migrations Skill

## When to Use This Skill

Load this skill when:
- Creating or altering schema with versioned migration files
- Writing migration `up()`/`down()` logic with Schema Builder
- Running migrations from CommandBox in local/dev/CI pipelines
- Seeding baseline or test data
- Rolling back schema changes safely

## Installation

```bash
box install commandbox-migrations
```

## Core Configuration

### `config/ColdBox.cfc`

```boxlang
moduleSettings = {
    cfmigrations: {
        manager:             "cfmigrations.models.QBMigrationManager",
        migrationsDirectory: "/resources/database/migrations/",
        seedsDirectory:      "/resources/database/seeds/",
        properties: {
            defaultGrammar: "MySQLGrammar@qb",
            datasource:     "appDB"
        }
    }
}
```

### Optional `.cfmigrations`

```json
{
  "default": {
    "driver": "MySQL",
    "host": "${DB_HOST}",
    "port": "${DB_PORT:3306}",
    "database": "${DB_DATABASE}",
    "username": "${DB_USERNAME}",
    "password": "${DB_PASSWORD}",
    "migrationsTable": "cfmigrations",
    "migrationsDirectory": "resources/database/migrations"
  }
}
```

## CLI Workflow

```bash
# One-time setup
box migrate install

# Create migration
box migrate create create_users_table

# Run / rollback
box migrate up
box migrate down
box migrate reset
box migrate refresh

# Seed and inspect
box migrate seed
box migrate status
```

## Migration Shape

```cfml
component {
    function up( schema, query ) {
        schema.create( "users", ( table ) => {
            table.increments( "id" )
            table.string( "email" ).unique()
            table.string( "password" )
            table.boolean( "isActive" ).default( true )
            table.timestamps()
        } )
    }

    function down( schema, query ) {
        schema.drop( "users" )
    }
}
```

## Common Schema Operations

```boxlang
schema.create( "posts", ( table ) => {
    table.increments( "id" )
    table.unsignedInteger( "userId" )
    table.string( "title" )
    table.longText( "body" ).nullable()
    table.timestamps()

    table.index( "userId" )
    table.foreignKey( "userId" ).references( "id" ).onTable( "users" ).onDelete( "CASCADE" )
} )

schema.alter( "posts", ( table ) => {
    table.addColumn( table.string( "slug" ).unique() )
    table.renameColumn( "body", "content" )
} )
```

## Best Practices

- Use one logical change per migration
- Always implement `down()` and verify rollback locally
- Never edit deployed migrations; add a new migration instead
- Use env vars for credentials and avoid destructive commands in production
- Use `box migrate up` (not reset/refresh) in production deployments
