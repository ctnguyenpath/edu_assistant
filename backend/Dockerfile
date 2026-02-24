FROM python:3.13

WORKDIR /app

# 1. Install System Dependencies
# ✅ UPDATED: Removed MSSQL drivers (unixodbc, msodbcsql17)
# ✅ ADDED: libpq-dev (Required for PostgreSQL/psycopg2)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# (Removed Microsoft Key/Repo setup block as it is no longer needed)

# 2. Install Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    # Install watchdog for auto-reloading
    pip install watchdog argh

# 3. Copy Code
COPY . .

# 4. Configuration
ENV PYTHONPATH=/app
EXPOSE 8802

# CMD is overridden by docker-compose
CMD ["python", "main_chatbot.py"]