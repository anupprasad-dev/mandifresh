"""Delete expired refresh-token records. Run daily (cron / Render cron job)."""
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import RefreshSession


class Command(BaseCommand):
    help = "Remove expired refresh sessions."

    def handle(self, *args, **options):
        deleted, _ = RefreshSession.objects.filter(expires_at__lt=timezone.now()).delete()
        self.stdout.write(f"Removed {deleted} expired refresh sessions.")
