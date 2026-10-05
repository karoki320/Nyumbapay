#!/usr/bin/env bash
# Runs the SQL test-suite against a throwaway local Postgres database.
set -euo pipefail
cd "$(dirname "$0")"
PSQL=${PSQL:-"psql -h /var/tmp -p 5499 -U postgres"}
$PSQL -qc 'drop database if exists nyumba_test' -c 'create database nyumba_test'
$PSQL -d nyumba_test -q -v ON_ERROR_STOP=1 -f _supabase_stub.sql
$PSQL -d nyumba_test -q -v ON_ERROR_STOP=1 -f ../migrations/20260926000000_init.sql
$PSQL -d nyumba_test -q -v ON_ERROR_STOP=1 -f ../migrations/20261005000000_coowners_admin.sql
$PSQL -d nyumba_test -q -v ON_ERROR_STOP=1 -f money.test.sql
$PSQL -d nyumba_test -q -v ON_ERROR_STOP=1 -f coowners_admin.test.sql
