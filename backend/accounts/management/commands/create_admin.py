"""Create an administrator for the MandiFresh admin portal (this replaces Django's default admin).

    python manage.py create_admin --email you@example.com --name "Your Name"
"""
from getpass import getpass

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email

from accounts.models import User


class Command(BaseCommand):
    help = "Create an admin account for the custom admin portal."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--name", required=True)
        parser.add_argument("--password", help="Optional. If omitted you will be prompted (recommended).")

    def handle(self, *args, **o):
        email = o["email"].strip().lower()
        try:
            validate_email(email)
        except ValidationError:
            raise CommandError("Enter a valid email address.")
        if User.objects.filter(email__iexact=email).exists():
            raise CommandError("A user with this email already exists.")
        password = o["password"]
        if not password:
            password = getpass("Password: ")
            if password != getpass("Password (again): "):
                raise CommandError("Passwords do not match.")
        try:
            validate_password(password, user=User(email=email, name=o["name"]))
        except ValidationError as exc:
            raise CommandError("; ".join(exc.messages))
        User.objects.create_superuser(email=email, password=password, name=o["name"])
        self.stdout.write(self.style.SUCCESS(f"Admin created: {email}  ->  sign in at /admin/login"))
