# Enterprise Data Profiler Pro

Enterprise Data Profiler Pro is a Streamlit-based data quality and profiling application for loading datasets, generating profiling insights, identifying duplicates, evaluating quality, comparing transformed data, and exporting results.

## Features

- Guided multi-tab workflow for data operations
- Data loading and preview
- Rule generation and data profiling
- Duplicate detection and data quality checks
- Dataset comparison and multi-file support
- Export-ready outputs for downstream reporting

## Tech Stack

- Python
- Streamlit
- Pandas / NumPy
- Plotly
- SQLAlchemy and multiple database dialects

## Project Structure

```text
.
├── app.py                 # Streamlit entry point
├── features/              # Feature-specific tab logic
├── ui/                    # Shared UI components
├── auth/                  # Authentication UI and flow
├── state/                 # Session state management
├── models/                # Data models and structures
├── core/, utils/, config/ # Core utilities and configuration
├── data/                  # Local data and generated artifacts
└── requirements.txt       # Python dependencies
```

## Prerequisites

- Python 3.10+ recommended
- `pip` for dependency installation
- Windows, macOS, or Linux

## Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Run the App

### Option 1: Using Python directly

```bash
python -m streamlit run app.py
```

### Option 2: Using batch launcher (Windows)

```bat
run_app.bat
```

The app opens in your browser at the local Streamlit URL shown in the terminal.

## Main Workflow

1. Authenticate in the login screen.
2. Load your dataset in **Load Data**.
3. Use **Rule Generator**, **Data Profiling**, **Find Duplicates**, and **Data Quality**.
4. Validate changes via **Compare** and **Preview**.
5. Export outputs from **Export**.

## Notes

- If startup fails, verify that dependencies from `requirements.txt` are installed.
- The launcher supports both `venv` and `.venv` virtual environment folders.
- Database connectivity depends on installing the correct drivers included in `requirements.txt`.
