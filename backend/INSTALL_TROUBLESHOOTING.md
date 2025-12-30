# Installation Troubleshooting

## Python 3.13 Compatibility Issues

If you're using Python 3.13 and encountering build errors with `psycopg2-binary` or `pydantic-core`, you have two options:

### Option 1: Use Python 3.11 or 3.12 (Recommended)

Python 3.11 and 3.12 have better package compatibility. Here's how to switch:

```bash
# Check available Python versions
ls /usr/local/bin/python*  # or
which -a python3

# Create virtual environment with specific Python version
python3.11 -m venv venv  # or python3.12
source venv/bin/activate
pip install -r requirements.txt
```

If you don't have Python 3.11/3.12 installed:

**On macOS (using Homebrew):**
```bash
brew install python@3.11
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**On macOS (using pyenv):**
```bash
pyenv install 3.11.9
pyenv local 3.11.9
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Option 2: Use Updated Requirements (Python 3.13)

The requirements.txt has been updated to use `psycopg` (psycopg3) instead of `psycopg2-binary`, which has better Python 3.13 support.

If you still encounter issues, try:

```bash
# Upgrade pip first
pip install --upgrade pip

# Install packages one by one to identify issues
pip install fastapi
pip install uvicorn[standard]
pip install sqlalchemy
pip install "psycopg[binary]"
pip install pydantic
pip install pydantic-settings
pip install python-dotenv
pip install requests
```

### Common Issues

#### Issue: "Failed building wheel for psycopg2-binary"
**Solution:** The requirements now use `psycopg[binary]` (psycopg3) which has better Python 3.13 support.

#### Issue: "Failed building wheel for pydantic-core"
**Solution:** 
1. Upgrade pip: `pip install --upgrade pip`
2. Try installing pydantic separately: `pip install pydantic==2.10.0`
3. If still failing, use Python 3.11 or 3.12

#### Issue: "No module named 'psycopg'"
**Solution:** Make sure you installed `psycopg[binary]` (not `psycopg2-binary`). The import is the same: `import psycopg`, but SQLAlchemy will use it automatically.

### Verify Installation

After installation, verify everything works:

```bash
python -c "import fastapi; import sqlalchemy; import psycopg; print('All imports successful!')"
```

If you see any import errors, the package didn't install correctly.

