"""Database connector using SQLAlchemy for all engines.

Provides a unified interface across every database that SQLAlchemy supports.
The caller only needs to supply a SQLAlchemy connection URL; driver-specific
logic is handled transparently by the dialect layer.

Requires: ``pip install sqlalchemy``
Optional drivers per engine (install only the ones you need):
    - PostgreSQL  : ``pip install psycopg2-binary``
    - MySQL       : ``pip install pymysql``
    - MariaDB     : ``pip install pymysql``  (same driver as MySQL)
    - SQL Server  : ``pip install pyodbc``
    - Oracle      : ``pip install oracledb``
    - IBM Db2     : ``pip install ibm_db_sa``
    - Snowflake   : ``pip install snowflake-sqlalchemy``
    - BigQuery    : ``pip install sqlalchemy-bigquery``
    - Redshift    : ``pip install sqlalchemy-redshift psycopg2-binary``
    - CockroachDB : ``pip install sqlalchemy-cockroachdb psycopg2-binary``
    - DuckDB      : ``pip install duckdb-engine``
    - Teradata    : ``pip install teradatasqlalchemy``
    - SAP HANA    : ``pip install hdbcli sqlalchemy-hana``
    - Apache Hive : ``pip install pyhive``
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote_plus

import pandas as pd
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

# Label -> dialect prefix, required Python package, default port, install hint.
# SQLAlchemy discovers the dialect from the URL prefix; we only need to
# verify the driver package is importable before offering the engine in the UI.
SUPPORTED_ENGINES: Dict[str, Dict[str, Any]] = {
    "SQLite": {
        "prefix": "sqlite",
        "package": None,
        "default_port": None,
        "hint": "Built-in -- no extra install needed",
    },
    "PostgreSQL": {
        "prefix": "postgresql+psycopg2",
        "package": "psycopg2",
        "default_port": 5432,
        "hint": "pip install psycopg2-binary",
    },
    "MySQL": {
        "prefix": "mysql+pymysql",
        "package": "pymysql",
        "default_port": 3306,
        "hint": "pip install pymysql",
    },
    "MariaDB": {
        "prefix": "mariadb+pymysql",
        "package": "pymysql",
        "default_port": 3306,
        "hint": "pip install pymysql",
    },
    "SQL Server": {
        "prefix": "mssql+pyodbc",
        "package": "pyodbc",
        "default_port": 1433,
        "hint": "pip install pyodbc",
    },
    "Oracle": {
        "prefix": "oracle+oracledb",
        "package": "oracledb",
        "default_port": 1521,
        "hint": "pip install oracledb",
    },
    "IBM Db2": {
        "prefix": "db2+ibm_db",
        "package": "ibm_db_sa",
        "default_port": 50000,
        "hint": "pip install ibm_db_sa",
    },
    "Snowflake": {
        "prefix": "snowflake",
        "package": "snowflake.sqlalchemy",
        "default_port": 443,
        "hint": "pip install snowflake-sqlalchemy",
    },
    "BigQuery": {
        "prefix": "bigquery",
        "package": "sqlalchemy_bigquery",
        "default_port": None,
        "hint": "pip install sqlalchemy-bigquery",
    },
    "Redshift": {
        "prefix": "redshift+psycopg2",
        "package": "sqlalchemy_redshift",
        "default_port": 5439,
        "hint": "pip install sqlalchemy-redshift psycopg2-binary",
    },
    "CockroachDB": {
        "prefix": "cockroachdb",
        "package": "sqlalchemy_cockroachdb",
        "default_port": 26257,
        "hint": "pip install sqlalchemy-cockroachdb psycopg2-binary",
    },
    "DuckDB": {
        "prefix": "duckdb",
        "package": "duckdb_engine",
        "default_port": None,
        "hint": "pip install duckdb-engine",
    },
    "Teradata": {
        "prefix": "teradatasql",
        "package": "teradatasqlalchemy",
        "default_port": 1025,
        "hint": "pip install teradatasqlalchemy",
    },
    "SAP HANA": {
        "prefix": "hana",
        "package": "sqlalchemy_hana",
        "default_port": 30015,
        "hint": "pip install hdbcli sqlalchemy-hana",
    },
    "Apache Hive": {
        "prefix": "hive",
        "package": "pyhive",
        "default_port": 10000,
        "hint": "pip install pyhive",
    },
}


def _driver_available(engine_label: str) -> Tuple[bool, str]:
    """Check whether the Python driver for *engine_label* is importable."""
    meta = SUPPORTED_ENGINES.get(engine_label)
    if meta is None:
        return False, "Unknown engine"
    pkg = meta["package"]
    if pkg is None:
        return True, ""
    try:
        __import__(pkg)
        return True, ""
    except ImportError:
        return False, meta["hint"]


def available_engines() -> List[str]:
    """Return engine labels whose drivers are currently importable."""
    return [label for label in SUPPORTED_ENGINES if _driver_available(label)[0]]


_FILE_BASED_ENGINES = {"SQLite", "DuckDB"}
_CLOUD_ENGINES = {"BigQuery"}


def build_url(
    engine_label: str,
    host: str = "",
    port: int = 0,
    database: str = "",
    username: str = "",
    password: str = "",
) -> str:
    """Build a SQLAlchemy connection URL from individual parameters.

    For file-based engines (SQLite, DuckDB) *database* is the file path
    (use ``:memory:`` for in-memory).
    For BigQuery, *database* is the GCP project id.
    For Snowflake, *host* is the account identifier (e.g. ``xy12345.us-east-1``).
    For all standard engines, *host*, *database*, *username* and *password*
    are required; *port* defaults to the engine's standard port.
    """
    meta = SUPPORTED_ENGINES.get(engine_label)
    if meta is None:
        raise ValueError(f"Unsupported engine: {engine_label}")

    prefix = meta["prefix"]

    # File-based engines ---------------------------------------------------
    if engine_label in _FILE_BASED_ENGINES:
        return f"{prefix}:///{database}"

    # BigQuery -- project-based URL, no host/port --------------------------
    if engine_label in _CLOUD_ENGINES:
        return f"{prefix}://{database}" if database else f"{prefix}://"

    # Snowflake -- account identifier goes in place of host ----------------
    if engine_label == "Snowflake":
        account = host  # e.g. xy12345.us-east-1
        url = f"{prefix}://{username}:{quote_plus(password)}@{account}/{database}"
        return url

    # Standard host:port engines -------------------------------------------
    port = port or meta["default_port"]
    safe_password = quote_plus(password) if password else ""
    url = f"{prefix}://{username}:{safe_password}@{host}:{port}/{database}"

    if engine_label == "SQL Server":
        url += "?driver=ODBC+Driver+17+for+SQL+Server"

    return url


def get_engine(url: str, **kwargs: Any) -> Engine:
    """Create (or retrieve from cache) a SQLAlchemy ``Engine``."""
    return create_engine(url, pool_pre_ping=True, **kwargs)


def test_connection(url: str) -> bool:
    """Return True if the URL is reachable."""
    try:
        eng = get_engine(url)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.debug("Connection test failed: %s", exc)
        return False


def list_schemas(url: str) -> List[str]:
    """Return available schema names (empty list for SQLite)."""
    eng = get_engine(url)
    insp = inspect(eng)
    return insp.get_schema_names()


def list_tables(url: str, schema: Optional[str] = None) -> List[str]:
    """Return table names visible under the given schema."""
    eng = get_engine(url)
    insp = inspect(eng)
    return insp.get_table_names(schema=schema)


def list_views(url: str, schema: Optional[str] = None) -> List[str]:
    """Return view names visible under the given schema."""
    eng = get_engine(url)
    insp = inspect(eng)
    return insp.get_view_names(schema=schema)


def get_columns(url: str, table_name: str, schema: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return column metadata for a table (name, type, nullable, default)."""
    eng = get_engine(url)
    insp = inspect(eng)
    return [
        {
            "name": col["name"],
            "type": str(col["type"]),
            "nullable": col.get("nullable", True),
            "default": col.get("default"),
        }
        for col in insp.get_columns(table_name, schema=schema)
    ]


def run_query(url: str, query: str, max_rows: int = 500_000) -> pd.DataFrame:
    """Execute an arbitrary SQL query and return results as a DataFrame."""
    eng = get_engine(url)
    df = pd.read_sql_query(text(query), eng)
    if len(df) > max_rows:
        df = df.head(max_rows)
    return df


def load_table(
    url: str,
    table_name: str,
    schema: Optional[str] = None,
    max_rows: int = 500_000,
) -> pd.DataFrame:
    """Load an entire table into a DataFrame."""
    eng = get_engine(url)
    df = pd.read_sql_table(table_name, eng, schema=schema)
    if len(df) > max_rows:
        df = df.head(max_rows)
    return df
