#!/usr/bin/env bash
# Render build script: install deps, collect static files, apply migrations, seed categories.
set -o errexit
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate --noinput
python manage.py seed_demo --categories-only
