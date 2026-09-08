"""
Reusable data quality checks applied before any model training or inference.
Returns a cleaned DataFrame and a quality report dict.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Tuple

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


def check_and_clean(
    df: pd.DataFrame,
    *,
    numeric_cols: list[str] | None = None,
    non_negative_cols: list[str] | None = None,
    date_col: str | None = None,
    remove_duplicates: bool = True,
    outlier_cols: list[str] | None = None,
    outlier_iqr_factor: float = 3.0,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Run data quality checks and return a cleaned DataFrame plus a quality report.

    Checks performed:
    1. Missing values — rows with any null in numeric_cols are dropped
    2. Negative values — rows with negative values in non_negative_cols are removed
    3. Invalid timestamps — rows where date_col cannot be parsed are removed
    4. Duplicate rows — removed if remove_duplicates=True
    5. Outliers — IQR-based removal on outlier_cols

    Returns:
        cleaned_df: DataFrame after all checks
        report: dict with counts of issues found/removed
    """
    report: Dict[str, Any] = {
        "original_rows": len(df),
        "issues": {},
        "rows_removed": 0,
        "data_quality": "GOOD",
    }

    if df.empty:
        report["data_quality"] = "EMPTY"
        return df, report

    cleaned = df.copy()
    removed = 0

    # 1. Invalid timestamps
    if date_col and date_col in cleaned.columns:
        before = len(cleaned)
        cleaned[date_col] = pd.to_datetime(cleaned[date_col], errors="coerce")
        invalid_ts = cleaned[date_col].isna().sum()
        cleaned = cleaned.dropna(subset=[date_col])
        after = len(cleaned)
        n = before - after
        if n:
            report["issues"]["invalid_timestamps"] = n
            removed += n
            logger.warning("Removed %d rows with invalid timestamps in '%s'", n, date_col)

    # 2. Missing values in numeric columns
    if numeric_cols:
        existing = [c for c in numeric_cols if c in cleaned.columns]
        if existing:
            before = len(cleaned)
            cleaned = cleaned.dropna(subset=existing)
            n = before - len(cleaned)
            if n:
                report["issues"]["missing_values"] = n
                removed += n
                logger.warning("Removed %d rows with missing values in %s", n, existing)

    # 3. Negative values
    if non_negative_cols:
        mask = pd.Series([False] * len(cleaned), index=cleaned.index)
        for col in non_negative_cols:
            if col in cleaned.columns:
                col_data = pd.to_numeric(cleaned[col], errors="coerce").fillna(0)
                mask = mask | (col_data < 0)
        n = mask.sum()
        if n:
            report["issues"]["negative_values"] = int(n)
            cleaned = cleaned[~mask]
            removed += n
            logger.warning("Removed %d rows with negative values", n)

    # 4. Duplicate rows
    if remove_duplicates:
        before = len(cleaned)
        cleaned = cleaned.drop_duplicates()
        n = before - len(cleaned)
        if n:
            report["issues"]["duplicates"] = n
            removed += n
            logger.warning("Removed %d duplicate rows", n)

    # 5. IQR-based outlier removal
    if outlier_cols:
        for col in outlier_cols:
            if col not in cleaned.columns:
                continue
            col_data = pd.to_numeric(cleaned[col], errors="coerce")
            q1 = col_data.quantile(0.25)
            q3 = col_data.quantile(0.75)
            iqr = q3 - q1
            if iqr == 0:
                continue
            lower = q1 - outlier_iqr_factor * iqr
            upper = q3 + outlier_iqr_factor * iqr
            outlier_mask = (col_data < lower) | (col_data > upper)
            n = outlier_mask.sum()
            if n:
                report["issues"][f"outliers_{col}"] = int(n)
                cleaned = cleaned[~outlier_mask]
                removed += n
                logger.warning("Removed %d outliers in column '%s'", n, col)

    report["rows_removed"] = removed
    report["clean_rows"] = len(cleaned)

    if len(cleaned) == 0:
        report["data_quality"] = "EMPTY_AFTER_CLEANING"
    elif removed / max(report["original_rows"], 1) > 0.30:
        report["data_quality"] = "DEGRADED"
    elif report["issues"]:
        report["data_quality"] = "ACCEPTABLE"
    else:
        report["data_quality"] = "GOOD"

    return cleaned, report


def min_rows_check(df: pd.DataFrame, min_rows: int, label: str = "dataset") -> str | None:
    """Return an error message if df has too few rows, else None."""
    if len(df) < min_rows:
        return f"Insufficient data in {label}: {len(df)} rows (need at least {min_rows})"
    return None
